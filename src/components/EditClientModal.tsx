"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Client } from "../types/client";
import { isValidEmail, isValidPhone, formatPhoneNumber, cleanPhoneNumber } from "../lib/client-profile-utils";

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSave: (updatedClient: Partial<Client>) => void;
}

interface EditClientFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: "active" | "prospect" | "inactive" | "completed";
  projectType: string;
  budget: string;
  timeline: string;
  serviceTypes: string[];
  notes: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  contactPreferences: {
    preferredMethod: "email" | "phone" | "text" | "in-person";
    canReceiveEmails: boolean;
    canReceiveTexts: boolean;
    autoInvoicing: boolean;
    autoReceipts: boolean;
  };
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  budget?: string;
  general?: string;
}

const SERVICE_TYPE_OPTIONS = [
  "lawn_care",
  "landscaping", 
  "snow_removal",
  "maintenance",
  "design",
  "installation",
  "cleanup",
  "consultation"
];

export default function EditClientModal({
  isOpen,
  onClose,
  client,
  onSave,
}: EditClientModalProps) {
  const [formData, setFormData] = useState<EditClientFormData>({
    name: "",
    email: "",
    phone: "",
    company: "",
    status: "prospect",
    projectType: "",
    budget: "",
    timeline: "",
    serviceTypes: [],
    notes: "",
    address: {
      street: "",
      city: "",
      state: "",
      zip: "",
    },
    contactPreferences: {
      preferredMethod: "email",
      canReceiveEmails: true,
      canReceiveTexts: false,
      autoInvoicing: false,
      autoReceipts: false,
    },
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState("basic");

  // Initialize form data when modal opens or client changes
  useEffect(() => {
    if (isOpen && client) {
      setFormData({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        company: client.company || "",
        status: client.status || "prospect",
        projectType: client.projectType || "",
        budget: client.budget ? client.budget.toString() : "",
        timeline: client.timeline || "",
        serviceTypes: client.serviceTypes || [],
        notes: client.notes || "",
        address: {
          street: client.address?.street || "",
          city: client.address?.city || "",
          state: client.address?.state || "",
          zip: client.address?.zip || "",
        },
        contactPreferences: {
          preferredMethod: client.contactPreferences?.preferredMethod || "email",
          canReceiveEmails: client.contactPreferences?.canReceiveEmails || true,
          canReceiveTexts: client.contactPreferences?.canReceiveTexts || false,
          autoInvoicing: client.contactPreferences?.autoInvoicing || false,
          autoReceipts: client.contactPreferences?.autoReceipts || false,
        },
      });
      setErrors({});
      setActiveSection("basic");
    }
  }, [isOpen, client]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    // Email validation (if provided)
    if (formData.email.trim() && !isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation (if provided)
    if (formData.phone.trim() && !isValidPhone(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    // Budget validation (if provided)
    if (formData.budget.trim()) {
      const budgetNum = parseFloat(formData.budget.replace(/[,$]/g, ""));
      if (isNaN(budgetNum) || budgetNum < 0) {
        newErrors.budget = "Please enter a valid budget amount";
      }
    }

    // At least one contact method should be provided
    if (!formData.email.trim() && !formData.phone.trim()) {
      newErrors.general = "Please provide at least an email address or phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        const parentObj = prev[parent as keyof EditClientFormData];
        if (typeof parentObj === 'object' && parentObj !== null) {
          return {
            ...prev,
            [parent]: {
              ...parentObj,
              [child]: value
            }
          };
        }
      }
      return { ...prev, [field]: value };
    });

    // Clear related errors
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    handleInputChange("phone", formatted);
  };

  const handleServiceTypeToggle = (serviceType: string) => {
    const currentTypes = formData.serviceTypes;
    const newTypes = currentTypes.includes(serviceType)
      ? currentTypes.filter(type => type !== serviceType)
      : [...currentTypes, serviceType];
    
    handleInputChange("serviceTypes", newTypes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare update data
      const updateData: Partial<Client> = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone ? cleanPhoneNumber(formData.phone) : undefined,
        company: formData.company.trim() || undefined,
        status: formData.status,
        projectType: formData.projectType.trim() || undefined,
        budget: formData.budget ? parseFloat(formData.budget.replace(/[,$]/g, "")) : undefined,
        timeline: formData.timeline.trim() || undefined,
        serviceTypes: formData.serviceTypes,
        notes: formData.notes.trim() || undefined,
        contactPreferences: formData.contactPreferences,
        updatedAt: new Date().toISOString(),
      };

      // Only include address if at least street is provided
      if (formData.address.street.trim()) {
        updateData.address = {
          street: formData.address.street.trim(),
          city: formData.address.city.trim() || undefined,
          state: formData.address.state.trim() || undefined,
          zip: formData.address.zip.trim() || undefined,
        };
      }

      // Call API to update client
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update client");
      }

      // Parse response data
      const responseData = await response.json();

      // Notify parent component of successful update
      onSave(updateData);
      
      // Close modal
      onClose();
    } catch (error) {
      console.error("Error updating client:", error);
      setErrors({
        general: error instanceof Error ? error.message : "Failed to update client"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sections = [
    { key: "basic", name: "Basic Info", icon: "👤" },
    { key: "contact", name: "Contact", icon: "📞" },
    { key: "project", name: "Project", icon: "🏗️" },
    { key: "preferences", name: "Preferences", icon: "⚙️" },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative neo-container max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="neo-inset p-6 border-b border-foreground/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground uppercase tracking-wide font-primary">
                    Edit Client
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 font-primary">
                    {client.name}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="neo-button-circle w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Section Navigation */}
              <div className="flex space-x-2 mt-4">
                {sections.map((section) => (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={`flex items-center space-x-2 px-4 py-2 text-sm font-bold uppercase tracking-wide font-primary transition-transform hover:scale-[1.02] ${
                      activeSection === section.key
                        ? "neo-inset"
                        : "neo-button"
                    }`}
                  >
                    <span>{section.icon}</span>
                    <span>{section.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6">
                {/* Basic Info Section */}
                {activeSection === "basic" && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className={`w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all ${
                          errors.name ? "border-2 border-red-500" : ""
                        }`}
                        placeholder="Client name"
                        disabled={isSubmitting}
                        required
                      />
                      {errors.name && (
                        <p className="text-sm text-red-600 mt-1 font-primary">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                        Company
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => handleInputChange("company", e.target.value)}
                        className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                        placeholder="Company name (optional)"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange("status", e.target.value)}
                        className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all uppercase"
                        disabled={isSubmitting}
                      >
                        <option value="prospect">Prospect</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                        Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange("notes", e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                        placeholder="Additional notes about the client..."
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}

                {/* Contact Section */}
                {activeSection === "contact" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className={`w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all ${
                            errors.email ? "border-2 border-red-500" : ""
                          }`}
                          placeholder="client@example.com"
                          disabled={isSubmitting}
                        />
                        {errors.email && (
                          <p className="text-sm text-red-600 mt-1 font-primary">{errors.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          className={`w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all ${
                            errors.phone ? "border-2 border-red-500" : ""
                          }`}
                          placeholder="(123) 456-7890"
                          disabled={isSubmitting}
                        />
                        {errors.phone && (
                          <p className="text-sm text-red-600 mt-1 font-primary">{errors.phone}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                        Address
                      </label>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={formData.address.street}
                          onChange={(e) => handleInputChange("address.street", e.target.value)}
                          className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                          placeholder="Street address"
                          disabled={isSubmitting}
                        />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={formData.address.city}
                            onChange={(e) => handleInputChange("address.city", e.target.value)}
                            className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                            placeholder="City"
                            disabled={isSubmitting}
                          />
                          <input
                            type="text"
                            value={formData.address.state}
                            onChange={(e) => handleInputChange("address.state", e.target.value)}
                            className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                            placeholder="Province"
                            disabled={isSubmitting}
                          />
                          <input
                            type="text"
                            value={formData.address.zip}
                            onChange={(e) => handleInputChange("address.zip", e.target.value)}
                            className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                            placeholder="Postal Code"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Project Section */}
                {activeSection === "project" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                          Project Type
                        </label>
                        <input
                          type="text"
                          value={formData.projectType}
                          onChange={(e) => handleInputChange("projectType", e.target.value)}
                          className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                          placeholder="e.g., Landscape Design, Snow Removal"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                          Budget
                        </label>
                        <input
                          type="text"
                          value={formData.budget}
                          onChange={(e) => handleInputChange("budget", e.target.value)}
                          className={`w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all ${
                            errors.budget ? "border-2 border-red-500" : ""
                          }`}
                          placeholder="e.g., 5000"
                          disabled={isSubmitting}
                        />
                        {errors.budget && (
                          <p className="text-sm text-red-600 mt-1 font-primary">{errors.budget}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                        Timeline
                      </label>
                      <input
                        type="text"
                        value={formData.timeline}
                        onChange={(e) => handleInputChange("timeline", e.target.value)}
                        className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                        placeholder="e.g., 2-3 weeks, Spring 2024"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-foreground mb-3 uppercase tracking-wide font-primary">
                        Service Types
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {SERVICE_TYPE_OPTIONS.map((serviceType) => (
                          <label
                            key={serviceType}
                            className="flex items-center space-x-2 cursor-pointer neo-inset p-3 transition-all hover:scale-[1.02]"
                          >
                            <input
                              type="checkbox"
                              checked={formData.serviceTypes.includes(serviceType)}
                              onChange={() => handleServiceTypeToggle(serviceType)}
                              className="rounded neo-checkbox"
                              disabled={isSubmitting}
                            />
                            <span className="text-sm text-foreground capitalize font-primary font-medium">
                              {serviceType.replace('_', ' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Section */}
                {activeSection === "preferences" && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                        Preferred Contact Method
                      </label>
                      <select
                        value={formData.contactPreferences.preferredMethod}
                        onChange={(e) => handleInputChange("contactPreferences.preferredMethod", e.target.value)}
                        className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all uppercase"
                        disabled={isSubmitting}
                      >
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="text">Text</option>
                        <option value="in-person">In Person</option>
                      </select>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-foreground uppercase tracking-wide font-primary">Automation Settings</h4>

                      <div className="flex items-center justify-between neo-inset p-4">
                        <div>
                          <label className="text-sm font-bold text-foreground font-primary">
                            Auto-send Invoices
                          </label>
                          <p className="text-xs text-muted-foreground font-primary">
                            Automatically email invoices when generated
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.contactPreferences.autoInvoicing}
                          onChange={(e) => handleInputChange("contactPreferences.autoInvoicing", e.target.checked)}
                          className="rounded neo-checkbox"
                          disabled={isSubmitting || !formData.email.trim()}
                        />
                      </div>

                      <div className="flex items-center justify-between neo-inset p-4">
                        <div>
                          <label className="text-sm font-bold text-foreground font-primary">
                            Auto-send Receipts
                          </label>
                          <p className="text-xs text-muted-foreground font-primary">
                            Automatically email receipts when payment received
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.contactPreferences.autoReceipts}
                          onChange={(e) => handleInputChange("contactPreferences.autoReceipts", e.target.checked)}
                          className="rounded neo-checkbox"
                          disabled={isSubmitting || !formData.email.trim()}
                        />
                      </div>

                      {!formData.email.trim() && (
                        <p className="text-sm text-amber-600 font-primary neo-inset p-3">
                          Add an email address to enable automation features
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* General Error */}
                {errors.general && (
                  <div className="mt-6 neo-inset p-4 border-l-4 border-red-500">
                    <p className="text-sm text-red-700 font-primary font-bold">{errors.general}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center px-6 py-4 border-t border-foreground/10 neo-inset">
                <div className="flex space-x-2">
                  {sections.map((section, index) => (
                    <div
                      key={section.key}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        activeSection === section.key
                          ? "bg-foreground"
                          : index < sections.findIndex(s => s.key === activeSection)
                            ? "bg-green-500"
                            : "bg-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="neo-button px-6 py-2 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-6 py-2 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02] ${
                      isSubmitting
                        ? "neo-inset opacity-50 cursor-not-allowed"
                        : "neo-button"
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
