// src/app/clients/new/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAllServices, getServiceById } from "../../../lib/service-config";
import { clientManager } from "../../../lib/client-config";
import { Client } from "../../../types/client";
import CRMLayout from "../../../components/CRMLayout";

function NewClientPageContent() {
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
      country: "",
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

  // Household/Account management
  const [createHousehold, setCreateHousehold] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [householdType, setHouseholdType] = useState<'PERSONAL' | 'FAMILY' | 'BUSINESS' | 'ORGANIZATION'>('PERSONAL');
  const [isPrimaryContact, setIsPrimaryContact] = useState(true);
  const [relationshipRole, setRelationshipRole] = useState("Primary Client");

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

  // Auto-generate household name from client name
  useEffect(() => {
    if (createHousehold && formData.name && !householdName) {
      const lastName = formData.name.split(' ').pop() || formData.name;
      setHouseholdName(`${lastName} Household`);
    }
  }, [formData.name, createHousehold, householdName]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
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
        setIsLoading(false);
        return;
      }

      // Validate household fields if household creation is enabled
      if (createHousehold && !householdName.trim()) {
        setError("Please enter a household name");
        setIsLoading(false);
        return;
      }

      const clientId = clientManager.generateClientId();

      // Prepare client data
      const clientData: any = {
        ...formData,
        id: clientId,
        name: formData.name.trim(),
        metadata: {
          ...formData.metadata,
          ...(secondaryServices.length > 0 && { secondaryServices }),
          ...(Object.keys(secondaryServiceTypes).length > 0 && { secondaryServiceTypes }),
        },
      };

      // Add household data if enabled
      if (createHousehold) {
        clientData.household = {
          name: householdName.trim(),
          accountType: householdType,
          address: formData.address,
          isPrimaryContact: isPrimaryContact,
          relationshipRole: relationshipRole,
        };
      }

      // Call API to create client (and household if specified)
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || "Failed to create client. Please try again.");
        setIsLoading(false);
        return;
      }

      // Redirect to client detail page using the ID from the API response
      const createdClientId = result.data?.id || clientId;
      router.push(`/clients/${createdClientId}?tab=conversations&setup=true`);
    } catch (err) {
      setError("Failed to create client. Please try again.");
      console.error("Error creating client:", err);
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
    <CRMLayout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Page Header */}
        <div className="neo-card p-6 mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/clients" className="neo-button p-2 text-accent hover:text-accent/80 font-primary uppercase tracking-wide text-sm">
              ← All Clients
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground font-primary uppercase tracking-wide">
                Add New Client
              </h1>
              <p className="text-sm text-muted-foreground font-primary mt-1">
                Add a client with any available information - you can complete
                their profile later
              </p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="neo-card p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground font-primary uppercase tracking-wide">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1 font-primary uppercase tracking-wide">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                  placeholder="John Smith"
                />
                <p className="text-xs text-muted-foreground mt-1 font-primary">
                  Only field that's required
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1 font-primary uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                  placeholder="john.smith@example.com (optional)"
                />
                {formData.email && formData.email.includes("@") && (
                  <p className="text-xs text-green-600 mt-1 font-primary">
                    ✓ Can receive auto-invoices and receipts
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1 font-primary uppercase tracking-wide">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                  placeholder="(555) 123-4567 (optional)"
                />
                {formData.phone && formData.phone.length >= 10 && (
                  <p className="text-xs text-green-600 mt-1 font-primary">
                    ✓ Can receive text notifications
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1 font-primary uppercase tracking-wide">
                  Company/Organization
                </label>
                <input
                  type="text"
                  value={formData.company || ""}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                  placeholder="Acme Corp (optional)"
                />
              </div>
            </div>
          </div>

          {/* Household/Account Section */}
          <div className="neo-card p-6">
            <div className="flex items-start space-x-3 mb-4">
              <input
                type="checkbox"
                id="createHousehold"
                checked={createHousehold}
                onChange={(e) => setCreateHousehold(e.target.checked)}
                className="mt-1 rounded border-border text-accent focus:ring-accent cursor-pointer"
              />
              <div className="flex-1">
                <label htmlFor="createHousehold" className="block text-lg font-bold text-foreground font-primary uppercase tracking-wide cursor-pointer">
                  Create/Add to Household Account
                </label>
                <p className="text-xs text-muted-foreground font-primary mt-1">
                  Enable this to group related clients (e.g., family members, business partners) under a shared household account
                </p>
              </div>
            </div>

            {createHousehold && (
              <div className="neo-container p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1 font-primary uppercase tracking-wide">
                      Household Name *
                    </label>
                    <input
                      type="text"
                      value={householdName}
                      onChange={(e) => setHouseholdName(e.target.value)}
                      className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                      placeholder="e.g., Smith Household"
                      required={createHousehold}
                    />
                    <p className="text-xs text-muted-foreground font-primary mt-1">
                      Auto-generated from client's last name. You can customize it.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1 font-primary uppercase tracking-wide">
                      Account Type *
                    </label>
                    <select
                      value={householdType}
                      onChange={(e) => setHouseholdType(e.target.value as 'PERSONAL' | 'FAMILY' | 'BUSINESS' | 'ORGANIZATION')}
                      className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                      required={createHousehold}
                    >
                      <option value="PERSONAL">Personal</option>
                      <option value="FAMILY">Family</option>
                      <option value="BUSINESS">Business</option>
                      <option value="ORGANIZATION">Organization</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1 font-primary uppercase tracking-wide">
                      Relationship Role *
                    </label>
                    <select
                      value={relationshipRole}
                      onChange={(e) => setRelationshipRole(e.target.value)}
                      className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                      required={createHousehold}
                    >
                      <option value="Primary Client">Primary Client</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Partner">Partner</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Family Member">Family Member</option>
                      <option value="Business Partner">Business Partner</option>
                      <option value="Employee">Employee</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3 pt-6">
                    <input
                      type="checkbox"
                      id="isPrimaryContact"
                      checked={isPrimaryContact}
                      onChange={(e) => setIsPrimaryContact(e.target.checked)}
                      className="rounded border-border text-accent focus:ring-accent cursor-pointer"
                    />
                    <div>
                      <label htmlFor="isPrimaryContact" className="block text-sm font-medium text-foreground font-primary uppercase tracking-wide cursor-pointer">
                        Primary Contact
                      </label>
                      <p className="text-xs text-muted-foreground font-primary">
                        Main point of contact for this household
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-foreground font-primary">
                      After creating this client, you can add more household members by creating additional clients and linking them to the same household.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Service & Project Details */}
          <div className="neo-card p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground font-primary uppercase tracking-wide">
              Service & Project Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1 font-primary uppercase tracking-wide">
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
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {service.businessType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1 font-primary uppercase tracking-wide">
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
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
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
                <label className="block text-sm font-medium text-muted-foreground mb-2 font-primary uppercase tracking-wide">
                  Service Types for {selectedService.name}
                </label>
                <p className="text-xs text-muted-foreground mb-3 font-primary">
                  Select the specific services this client needs
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto neo-container p-4">
                  {selectedService.serviceTypes.map((serviceType) => (
                    <label key={serviceType} className="flex items-center font-primary cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.serviceTypes.includes(serviceType)}
                        onChange={() => toggleServiceType(serviceType)}
                        className="rounded border-border text-accent focus:ring-accent cursor-pointer"
                      />
                      <span className="ml-2 text-sm text-foreground group-hover:text-accent transition-colors">
                        {serviceType}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Services */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-2">
                Additional Services (optional)
              </label>
              <p className="text-xs text-muted-foreground font-primary mb-3">
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
                        className="neo-card overflow-hidden border-l-4 border-l-accent"
                      >
                        <div className="flex items-center justify-between p-4 bg-accent/5">
                          <div className="flex-1">
                            <span className="text-sm font-bold text-foreground font-primary uppercase tracking-wide">
                              {service.name}
                            </span>
                            <p className="text-xs text-muted-foreground font-primary mt-1">
                              {service.businessType}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSecondaryService(serviceId)}
                            className="ml-3 text-muted-foreground hover:text-red-600 font-primary transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Service Types for this Additional Service */}
                        {service.serviceTypes.length > 0 && (
                          <div className="p-3 bg-card">
                            <p className="text-xs font-medium text-muted-foreground font-primary uppercase tracking-wide mb-2">
                              Select service types:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                              {service.serviceTypes.map((serviceType) => (
                                <label key={serviceType} className="flex items-center text-xs cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={(secondaryServiceTypes[serviceId] || []).includes(serviceType)}
                                    onChange={() => toggleSecondaryServiceType(serviceId, serviceType)}
                                    className="rounded border-border text-accent focus:ring-accent cursor-pointer"
                                  />
                                  <span className="ml-2 text-foreground font-primary group-hover:text-accent transition-colors">
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
                  className="neo-button flex items-center px-4 py-2 font-primary uppercase tracking-wide text-sm"
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
                <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-1">
                  Project Type
                </label>
                <input
                  type="text"
                  value={formData.projectType || ""}
                  onChange={(e) =>
                    handleInputChange("projectType", e.target.value)
                  }
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                  placeholder="Kitchen renovation, Website redesign, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-1">
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
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                  placeholder="5000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-1">
                  Timeline
                </label>
                <input
                  type="text"
                  value={formData.timeline || ""}
                  onChange={(e) =>
                    handleInputChange("timeline", e.target.value)
                  }
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                  placeholder="2-3 weeks, ASAP, etc."
                />
              </div>
            </div>
          </div>

          {/* Contact Preferences & Automation */}
          <div className="neo-card p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground font-primary uppercase tracking-wide">
              Contact Preferences & Automation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-2">
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
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone Call</option>
                  <option value="text">Text Message</option>
                  <option value="in-person">In Person</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-2">
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
                      className="rounded border-border text-accent focus:ring-accent disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-foreground font-primary">
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
                      className="rounded border-border text-accent focus:ring-accent disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-foreground font-primary">
                      Auto-send receipts {!canAutomate && "(requires email)"}
                    </span>
                  </label>
                </div>

                {!canAutomate && (
                  <p className="text-xs text-muted-foreground font-primary mt-2">
                    Add an email address to enable automation features
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Client Address */}
          <div className="neo-card p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground font-primary uppercase tracking-wide">
              Client Address
            </h2>
            <p className="text-sm text-muted-foreground font-primary mb-4">
              Optional - Primary address for service delivery and billing
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address?.street || ""}
                  onChange={(e) =>
                    handleAddressChange("street", e.target.value)
                  }
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.address?.city || ""}
                  onChange={(e) =>
                    handleAddressChange("city", e.target.value)
                  }
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                  placeholder="Toronto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-1">
                  State/Province
                </label>
                <input
                  type="text"
                  value={formData.address?.state || ""}
                  onChange={(e) =>
                    handleAddressChange("state", e.target.value)
                  }
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                  placeholder="ON"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-1">
                  ZIP/Postal Code
                </label>
                <input
                  type="text"
                  value={formData.address?.zip || ""}
                  onChange={(e) =>
                    handleAddressChange("zip", e.target.value)
                  }
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                  placeholder="M5V 3A8"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.address?.country || ""}
                  onChange={(e) =>
                    handleAddressChange("country", e.target.value)
                  }
                  className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                  placeholder="Canada"
                />
              </div>
            </div>
          </div>

          {/* Tags & Notes */}
          <div className="neo-card p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground font-primary uppercase tracking-wide">
              Additional Information
            </h2>

            {/* Tags */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-2">
                Tags
              </label>
              <p className="text-xs text-muted-foreground font-primary mb-3">
                Add tags to categorize and organize this client (e.g., urgent, referral, repeat-client)
              </p>
              {formData.tags.length > 0 && (
                <div className="neo-container p-3 mb-3">
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-accent/20 text-accent font-primary border border-accent/30 hover:bg-accent/30 transition-colors"
                      >
                        {tag.toUpperCase()}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-accent hover:text-accent-foreground hover:bg-accent rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                          title="Remove tag"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addTag())
                  }
                  className="neomorphic-input flex-1 px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                  placeholder="Type a tag and press Enter or click Add"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="neo-button-active px-4 py-2 font-primary uppercase tracking-wide text-sm"
                >
                  Add Tag
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground font-primary uppercase tracking-wide mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes || ""}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={4}
                className="neomorphic-input w-full px-3 py-2 focus:ring-2 focus:ring-accent font-primary"
                placeholder="Any additional information about this client..."
              />
            </div>
          </div>

          {/* Information Notice */}
          <div className="neo-card bg-accent/10 border-accent rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-accent"
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
                <h3 className="text-sm font-medium text-foreground font-primary">
                  Flexible Client Creation
                </h3>
                <div className="mt-2 text-sm text-foreground font-primary">
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
              className="neo-button px-6 py-3 font-primary uppercase tracking-wide"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 neo-button-active font-primary uppercase tracking-wide disabled:bg-muted disabled:cursor-not-allowed"
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
            <div className="relative neo-card max-w-md w-full mx-4 z-10">
              {/* Header */}
              <div className="p-6 border-b border-border bg-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-foreground font-primary uppercase tracking-wide">
                    Select Additional Service
                  </h3>
                  <button
                    onClick={() => setShowAddServiceModal(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
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
                      className="neo-button w-full text-left p-4 hover:bg-accent/10 hover:border-accent transition-colors"
                    >
                      <div className="font-medium text-foreground font-primary">
                        {service.name}
                      </div>
                      <div className="text-sm text-muted-foreground font-primary mt-1">
                        {service.businessType}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground font-primary">
                        {service.serviceTypes.slice(0, 3).join(', ')}
                        {service.serviceTypes.length > 3 && ` +${service.serviceTypes.length - 3} more`}
                      </div>
                    </button>
                  ))}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border bg-card">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="neo-button w-full px-4 py-2 font-primary uppercase tracking-wide"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CRMLayout>
  );
}

export default function NewClientPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    }>
      <NewClientPageContent />
    </Suspense>
  );
}
