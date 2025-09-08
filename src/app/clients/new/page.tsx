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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      clientManager.saveClient(newClient);

      // Redirect to client detail page
      router.push(`/clients/${clientId}?tab=conversations&setup=true`);
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

  // Helper to check if automation is available
  const canAutomate = formData.email && formData.email.includes("@");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/clients" className="text-blue-600 hover:text-blue-800">
              ← All Clients
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Add New Client
              </h1>
              <p className="text-sm text-gray-600">
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
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Mark Levy"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only field that&apo;s required
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="mark@example.com (optional)"
                />
                {formData.email && formData.email.includes("@") && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Can receive auto-invoices and receipts
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="(555) 123-4567 (optional)"
                />
                {formData.phone && formData.phone.length >= 10 && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Can receive text notifications
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company/Organization
                </label>
                <input
                  type="text"
                  value={formData.company || ""}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Acme Corp (optional)"
                />
              </div>
            </div>
          </div>

          {/* Service & Project Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              Service & Project Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Service *
                </label>
                <select
                  required
                  value={formData.serviceId}
                  onChange={(e) =>
                    handleInputChange("serviceId", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - {service.businessType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="prospect">Prospect</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Service Types */}
            {selectedService && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Types (select any that apply)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedService.serviceTypes.map((serviceType) => (
                    <label key={serviceType} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.serviceTypes.includes(serviceType)}
                        onChange={() => toggleServiceType(serviceType)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {serviceType}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Type
                </label>
                <input
                  type="text"
                  value={formData.projectType || ""}
                  onChange={(e) =>
                    handleInputChange("projectType", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Kitchen renovation, Website redesign, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="5000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeline
                </label>
                <input
                  type="text"
                  value={formData.timeline || ""}
                  onChange={(e) =>
                    handleInputChange("timeline", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="2-3 weeks, ASAP, etc."
                />
              </div>
            </div>
          </div>

          {/* Contact Preferences & Automation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              Contact Preferences & Automation
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone Call</option>
                  <option value="text">Text Message</option>
                  <option value="in-person">In Person</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">
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
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Auto-send receipts {!canAutomate && "(requires email)"}
                    </span>
                  </label>
                </div>

                {!canAutomate && (
                  <p className="text-xs text-gray-500 mt-2">
                    Add an email address to enable automation features
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Address (for service-based businesses) */}
          {selectedService &&
            ["landscaping", "snow-removal", "pet-services"].includes(
              selectedService.id,
            ) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900">
                  Service Address
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Optional - can be added later when scheduling service
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={formData.address?.street || ""}
                      onChange={(e) =>
                        handleAddressChange("street", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      placeholder="123 Main Street (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.address?.city || ""}
                      onChange={(e) =>
                        handleAddressChange("city", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      placeholder="Toronto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State/Province
                    </label>
                    <input
                      type="text"
                      value={formData.address?.state || ""}
                      onChange={(e) =>
                        handleAddressChange("state", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      placeholder="ON"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP/Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.address?.zip || ""}
                      onChange={(e) =>
                        handleAddressChange("zip", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      placeholder="M5V 3A8"
                    />
                  </div>
                </div>
              </div>
            )}

          {/* Tags & Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              Additional Information
            </h2>

            {/* Tags */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Add tag (e.g., urgent, referral, repeat-client)"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes || ""}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                placeholder="Any additional information about this client..."
              />
            </div>
          </div>

          {/* Information Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
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
                <h3 className="text-sm font-medium text-blue-800">
                  Flexible Client Creation
                </h3>
                <div className="mt-2 text-sm text-blue-700">
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
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
