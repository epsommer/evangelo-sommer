// src/app/clients/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAllServices, getServiceById } from "../../../lib/service-config";
import { clientManager } from "../../../lib/client-config";
import { Client } from "../../../types/client";

export default function NewClientPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedServiceId = searchParams.get("serviceId");

  const [formData, setFormData] = useState<Client>({
    id: "",
    name: "",
    email: "",
    phone: "",
    company: "",
    serviceId: preSelectedServiceId || "portfolio",
    status: "prospect",
    tags: [],
    serviceTypes: [],
    projectType: "",
    budget: undefined,
    timeline: "",
    notes: "",
    createdAt: "",
    updatedAt: "",
    address: {
      street: "",
      city: "",
      state: "",
      zip: "",
    },
    metadata: {},
    contactPreferences: {
      preferredMethod: "email",
      canReceiveEmails: false,
      canReceiveTexts: false,
      autoInvoicing: false,
      autoReceipts: false,
    },
  });

  const [secondaryServices, setSecondaryServices] = useState<string[]>([]);
  const [secondaryServiceTypes, setSecondaryServiceTypes] = useState<Record<string, string[]>>({});
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const services = getAllServices();
  const selectedService = getServiceById(formData.serviceId || "");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Auto-detect contact capabilities when email/phone are added
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      contactPreferences: {
        ...prev.contactPreferences!,
        canReceiveEmails: !!prev.email && prev.email.includes("@"),
        canReceiveTexts: !!prev.phone && prev.phone.length >= 10,
        autoInvoicing: !!prev.email && prev.email.includes("@"),
        autoReceipts: !!prev.email && prev.email.includes("@"),
      },
    }));
  }, [formData.email, formData.phone]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tactical-gold-600"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Only require name and service - everything else is optional
      if (!formData.name.trim() || !formData.serviceId) {
        setError("Please enter at least the client name and select a service");
        return;
      }

      const clientId = clientManager.generateClientId();
      const newClient: Client = {
        ...formData,
        id: clientId,
        name: formData.name.trim(),
        metadata: {
          ...formData.metadata,
          secondaryServices: secondaryServices.length > 0 ? secondaryServices : undefined,
          secondaryServiceTypes: Object.keys(secondaryServiceTypes).length > 0 ? secondaryServiceTypes : undefined,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const savedClient = await clientManager.saveClient(newClient);

      if (!savedClient) {
        setError("Failed to save client. Please try again.");
        return;
      }

      // Redirect to client detail page
      router.push(`/clients/${savedClient.id}?tab=conversations&setup=true`);
    } catch (err) {
      setError("Failed to create client. Please try again.");
      console.error("Error creating client:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof Client,
    value: string | number | string[] | undefined,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddressChange = (
    field: keyof NonNullable<Client["address"]>,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      address: {
        street: "",
        city: "",
        state: "",
        zip: "",
        ...prev.address,
        [field]: value,
      },
    }));
  };

  const handleContactPreferenceChange = (
    field: keyof NonNullable<Client["contactPreferences"]>,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      contactPreferences: {
        preferredMethod: "email",
        canReceiveEmails: false,
        canReceiveTexts: false,
        autoInvoicing: false,
        autoReceipts: false,
        ...prev.contactPreferences,
        [field]: value,
      },
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const toggleServiceType = (serviceType: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceTypes: prev.serviceTypes.includes(serviceType)
        ? prev.serviceTypes.filter((type) => type !== serviceType)
        : [...prev.serviceTypes, serviceType],
    }));
  };

  const addSecondaryService = (serviceId: string) => {
    if (!secondaryServices.includes(serviceId)) {
      setSecondaryServices((prev) => [...prev, serviceId]);
    }
    setShowAddServiceModal(false);
  };

  const removeSecondaryService = (serviceId: string) => {
    setSecondaryServices((prev) => prev.filter((id) => id !== serviceId));
    setSecondaryServiceTypes((prev) => {
      const updated = { ...prev };
      delete updated[serviceId];
      return updated;
    });
  };

  const toggleSecondaryServiceType = (serviceId: string, serviceType: string) => {
    setSecondaryServiceTypes((prev) => {
      const currentTypes = prev[serviceId] || [];
      const updated = {
        ...prev,
        [serviceId]: currentTypes.includes(serviceType)
          ? currentTypes.filter((type) => type !== serviceType)
          : [...currentTypes, serviceType],
      };
      return updated;
    });
  };

  // Helper to check if automation is available
  const canAutomate = formData.email && formData.email.includes("@");

  // Get available secondary services (exclude primary service and remove duplicates)
  const availableSecondaryServices = services.filter(
    (service) => service.id !== formData.serviceId
  );

  return (
    <div className="min-h-screen bg-tactical-grey-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/clients" className="text-tactical-gold hover:text-tactical-brown-dark">
              ← All Clients
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-tactical-grey-800">
                Add New Client
              </h1>
              <p className="text-sm text-tactical-grey-500">
                Add a client with any available information - you can complete
                their profile later
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-tactical-grey-800">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                  placeholder="John Smith"
                />
                <p className="text-xs text-tactical-grey-500 mt-1">
                  Only field that&apo;s required
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                  placeholder="john.smith@example.com (optional)"
                />
                {formData.email && formData.email.includes("@") && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Can receive auto-invoices and receipts
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                  placeholder="(555) 123-4567 (optional)"
                />
                {formData.phone && formData.phone.length >= 10 && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Can receive text notifications
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Company/Organization
                </label>
                <input
                  type="text"
                  value={formData.company || ""}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                  placeholder="Acme Corp (optional)"
                />
              </div>
            </div>
          </div>

          {/* Service & Project Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-tactical-grey-800">
              Service & Project Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Primary Service *
                </label>
                <select
                  required
                  value={formData.serviceId}
                  onChange={(e) => {
                    handleInputChange("serviceId", e.target.value);
                    // Remove from secondary services if selected as primary
                    setSecondaryServices(prev => prev.filter(id => id !== e.target.value));
                  }}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {service.businessType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Client Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    handleInputChange(
                      "status",
                      e.target.value as Client["status"],
                    )
                  }
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                >
                  <option value="prospect">Prospect</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Primary Service Types */}
            {selectedService && selectedService.serviceTypes.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-tactical-grey-600 mb-2">
                  Service Types for {selectedService.name}
                </label>
                <p className="text-xs text-tactical-grey-500 mb-3">
                  Select the specific services this client needs
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-tactical-grey-300 rounded-lg p-3">
                  {selectedService.serviceTypes.map((serviceType) => (
                    <label key={serviceType} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.serviceTypes.includes(serviceType)}
                        onChange={() => toggleServiceType(serviceType)}
                        className="rounded border-tactical-grey-400 text-tactical-gold focus:ring-tactical-gold-500"
                      />
                      <span className="ml-2 text-sm text-tactical-grey-600">
                        {serviceType}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Services */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-tactical-grey-600 mb-2">
                Additional Services (optional)
              </label>
              <p className="text-xs text-tactical-grey-500 mb-3">
                Add other services this client uses or is interested in
              </p>

              {/* Selected Secondary Services */}
              {secondaryServices.length > 0 && (
                <div className="space-y-4 mb-3">
                  {secondaryServices.map((serviceId) => {
                    const service = services.find(s => s.id === serviceId);
                    if (!service) return null;
                    return (
                      <div
                        key={serviceId}
                        className="border border-tactical-gold rounded-lg overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-3 bg-tactical-gold-muted">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-tactical-grey-700">
                              {service.name}
                            </span>
                            <p className="text-xs text-tactical-grey-500">
                              {service.businessType}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSecondaryService(serviceId)}
                            className="ml-3 text-tactical-grey-400 hover:text-red-600 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Service Types for this Additional Service */}
                        {service.serviceTypes.length > 0 && (
                          <div className="p-3 bg-white">
                            <p className="text-xs font-medium text-tactical-grey-600 mb-2">
                              Select service types:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                              {service.serviceTypes.map((serviceType) => (
                                <label key={serviceType} className="flex items-center text-xs">
                                  <input
                                    type="checkbox"
                                    checked={(secondaryServiceTypes[serviceId] || []).includes(serviceType)}
                                    onChange={() => toggleSecondaryServiceType(serviceId, serviceType)}
                                    className="rounded border-tactical-grey-400 text-tactical-gold focus:ring-tactical-gold-500"
                                  />
                                  <span className="ml-2 text-tactical-grey-600">
                                    {serviceType}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Service Button */}
              {availableSecondaryServices.length > secondaryServices.length && (
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(true)}
                  className="flex items-center px-4 py-2 border border-tactical-grey-400 rounded-lg text-tactical-grey-600 hover:bg-tactical-grey-50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add an additional service
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Project Type
                </label>
                <input
                  type="text"
                  value={formData.projectType || ""}
                  onChange={(e) =>
                    handleInputChange("projectType", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                  placeholder="Kitchen renovation, Website redesign, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Budget
                </label>
                <input
                  type="number"
                  value={formData.budget || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "budget",
                      e.target.value ? parseInt(e.target.value) : undefined,
                    )
                  }
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                  placeholder="5000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Timeline
                </label>
                <input
                  type="text"
                  value={formData.timeline || ""}
                  onChange={(e) =>
                    handleInputChange("timeline", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                  placeholder="2-3 weeks, ASAP, etc."
                />
              </div>
            </div>
          </div>

          {/* Contact Preferences & Automation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-tactical-grey-800">
              Contact Preferences & Automation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-2">
                  Preferred Contact Method
                </label>
                <select
                  value={
                    formData.contactPreferences?.preferredMethod || "email"
                  }
                  onChange={(e) =>
                    handleContactPreferenceChange(
                      "preferredMethod",
                      e.target.value,
                    )
                  }
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone Call</option>
                  <option value="text">Text Message</option>
                  <option value="in-person">In Person</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-2">
                  Automation Capabilities
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        formData.contactPreferences?.autoInvoicing || false
                      }
                      onChange={(e) =>
                        handleContactPreferenceChange(
                          "autoInvoicing",
                          e.target.checked,
                        )
                      }
                      disabled={!canAutomate}
                      className="rounded border-tactical-grey-400 text-tactical-gold focus:ring-tactical-gold-500 disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-tactical-grey-600">
                      Auto-send invoices {!canAutomate && "(requires email)"}
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        formData.contactPreferences?.autoReceipts || false
                      }
                      onChange={(e) =>
                        handleContactPreferenceChange(
                          "autoReceipts",
                          e.target.checked,
                        )
                      }
                      disabled={!canAutomate}
                      className="rounded border-tactical-grey-400 text-tactical-gold focus:ring-tactical-gold-500 disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-tactical-grey-600">
                      Auto-send receipts {!canAutomate && "(requires email)"}
                    </span>
                  </label>
                </div>

                {!canAutomate && (
                  <p className="text-xs text-tactical-grey-500 mt-2">
                    Add an email address to enable automation features
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Client Address */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-tactical-grey-800">
              Client Address
            </h2>
            <p className="text-sm text-tactical-grey-500 mb-4">
              Optional - Primary address for service delivery and billing
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address?.street || ""}
                  onChange={(e) =>
                    handleAddressChange("street", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.address?.city || ""}
                  onChange={(e) =>
                    handleAddressChange("city", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                  placeholder="Toronto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  State/Province
                </label>
                <input
                  type="text"
                  value={formData.address?.state || ""}
                  onChange={(e) =>
                    handleAddressChange("state", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                  placeholder="ON"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  ZIP/Postal Code
                </label>
                <input
                  type="text"
                  value={formData.address?.zip || ""}
                  onChange={(e) =>
                    handleAddressChange("zip", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                  placeholder="M5V 3A8"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.address?.country || ""}
                  onChange={(e) =>
                    handleAddressChange("country", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                  placeholder="Canada"
                />
              </div>
            </div>
          </div>

          {/* Tags & Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-tactical-grey-800">
              Additional Information
            </h2>

            {/* Tags */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-tactical-grey-600 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-tactical-gold-muted text-tactical-brown-dark"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-tactical-gold hover:text-tactical-brown-dark"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addTag())
                  }
                  className="flex-1 px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                  placeholder="Add tag (e.g., urgent, referral, repeat-client)"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-tactical-grey-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes || ""}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500 text-tactical-grey-800 bg-white"
                placeholder="Any additional information about this client..."
              />
            </div>
          </div>

          {/* Information Notice */}
          <div className="bg-tactical-gold-muted border border-tactical-grey-300 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-tactical-gold-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-tactical-brown-dark">
                  Flexible Client Creation
                </h3>
                <div className="mt-2 text-sm text-tactical-brown-dark">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Only name and service are required</li>
                    <li>
                      Add email later to enable auto-invoicing and receipts
                    </li>
                    <li>Add phone later to enable text notifications</li>
                    <li>
                      Complete their profile over time as you get more
                      information
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/clients"
              className="px-6 py-3 border border-tactical-grey-400 text-tactical-grey-600 rounded-lg hover:bg-tactical-grey-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark disabled:bg-tactical-grey-400 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Client"}
            </button>
          </div>
        </form>
      </div>

      {/* Add Service Modal */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowAddServiceModal(false)}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 z-10">
              {/* Header */}
              <div className="p-6 border-b border-tactical-grey-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-tactical-grey-800">
                    Select Additional Service
                  </h3>
                  <button
                    onClick={() => setShowAddServiceModal(false)}
                    className="text-tactical-grey-400 hover:text-tactical-grey-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Service List */}
              <div className="p-6 space-y-2 max-h-96 overflow-y-auto">
                {availableSecondaryServices
                  .filter(service => !secondaryServices.includes(service.id))
                  .map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => addSecondaryService(service.id)}
                      className="w-full text-left p-4 border border-tactical-grey-300 rounded-lg hover:bg-tactical-gold-muted hover:border-tactical-gold transition-colors"
                    >
                      <div className="font-medium text-tactical-grey-700">
                        {service.name}
                      </div>
                      <div className="text-sm text-tactical-grey-500 mt-1">
                        {service.businessType}
                      </div>
                      <div className="mt-2 text-xs text-tactical-grey-500">
                        {service.serviceTypes.slice(0, 3).join(', ')}
                        {service.serviceTypes.length > 3 && ` +${service.serviceTypes.length - 3} more`}
                      </div>
                    </button>
                  ))}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-tactical-grey-300 bg-tactical-grey-50">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="w-full px-4 py-2 border border-tactical-grey-400 text-tactical-grey-600 rounded-lg hover:bg-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
