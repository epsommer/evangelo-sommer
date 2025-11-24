"use client";

import { useState, useEffect } from "react";
import { Receipt, ReceiptItem, CreateReceiptData, DEFAULT_TAX_CONFIG } from "../types/billing";
import { Client } from "../types/client";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onReceiptCreated?: (receipt: Receipt) => void;
}

interface ReceiptFormData {
  items: ReceiptItem[];
  paymentMethod: 'cash' | 'card' | 'e-transfer' | 'check' | 'other';
  paymentDate: string;
  serviceDate: string;
  notes: string;
}

const ServiceTemplates = {
  landscaping: [
    { description: 'Lawn Mowing', unitPrice: 50, serviceType: 'landscaping' as const },
    { description: 'Garden Maintenance', unitPrice: 75, serviceType: 'landscaping' as const },
    { description: 'Tree Trimming', unitPrice: 100, serviceType: 'landscaping' as const },
    { description: 'Seasonal Cleanup', unitPrice: 200, serviceType: 'landscaping' as const }
  ],
  snow_removal: [
    { description: 'Driveway Snow Removal', unitPrice: 40, serviceType: 'snow_removal' as const },
    { description: 'Walkway Clearing', unitPrice: 25, serviceType: 'snow_removal' as const },
    { description: 'Salt Application', unitPrice: 15, serviceType: 'snow_removal' as const }
  ],
  hair_cutting: [
    { description: 'Haircut', unitPrice: 30, serviceType: 'hair_cutting' as const },
    { description: 'Wash & Style', unitPrice: 25, serviceType: 'hair_cutting' as const },
    { description: 'Color Treatment', unitPrice: 80, serviceType: 'hair_cutting' as const }
  ],
  creative_development: [
    { description: 'UI/UX Design', unitPrice: 75, serviceType: 'creative_development' as const },
    { description: 'App Development', unitPrice: 100, serviceType: 'creative_development' as const },
    { description: '3D Graphics/Animation', unitPrice: 85, serviceType: 'creative_development' as const },
    { description: 'Network Administration', unitPrice: 90, serviceType: 'creative_development' as const }
  ]
};

export default function ReceiptModal({ isOpen, onClose, client, onReceiptCreated }: ReceiptModalProps) {
  const [formData, setFormData] = useState<ReceiptFormData>({
    items: [createEmptyLineItem()],
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    serviceDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        items: [createEmptyLineItem()],
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        serviceDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setIsSubmitting(false);
    }
  }, [isOpen]);

  function createEmptyLineItem(): ReceiptItem {
    return {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: '',
      serviceType: 'landscaping',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      taxable: true
    };
  }

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, createEmptyLineItem()]
    }));
  };

  const removeLineItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateLineItem = (index: number, field: keyof ReceiptItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value,
        totalPrice: field === 'quantity' || field === 'unitPrice' 
          ? (field === 'quantity' ? value : newItems[index].quantity) * 
            (field === 'unitPrice' ? value : newItems[index].unitPrice)
          : newItems[index].totalPrice
      };
      return { ...prev, items: newItems };
    });
  };

  const addTemplateItem = (template: { description: string; unitPrice: number; serviceType: any }) => {
    const newItem: ReceiptItem = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: template.description,
      serviceType: template.serviceType,
      quantity: 1,
      unitPrice: template.unitPrice,
      totalPrice: template.unitPrice,
      taxable: true
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setShowTemplates(false);
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const calculateTax = () => {
    const taxableAmount = formData.items
      .filter(item => item.taxable)
      .reduce((sum, item) => sum + item.totalPrice, 0);
    return taxableAmount * DEFAULT_TAX_CONFIG.rate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form
      if (formData.items.some(item => !item.description || item.unitPrice <= 0)) {
        alert('Please fill in all item details with valid prices');
        return;
      }

      const createData: CreateReceiptData = {
        clientId: client.id,
        items: formData.items.map(item => ({
          description: item.description,
          serviceType: item.serviceType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxable: item.taxable
        })),
        paymentMethod: formData.paymentMethod,
        paymentDate: new Date(formData.paymentDate),
        serviceDate: new Date(formData.serviceDate),
        notes: formData.notes || undefined
      };

      const response = await fetch('/api/billing/receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create receipt');
      }

      // Success
      alert(`Receipt ${result.receipt.receiptNumber} created successfully!`);
      
      if (onReceiptCreated) {
        onReceiptCreated(result.receipt);
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating receipt:', error);
      alert(`Failed to create receipt: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getServiceTemplates = () => {
    // Try to match client's service type to templates
    const serviceId = client.serviceId;
    if (serviceId === 'landscaping' || serviceId === 'lawn-care') {
      return ServiceTemplates.landscaping;
    } else if (serviceId === 'snow-removal') {
      return ServiceTemplates.snow_removal;
    } else if (serviceId === 'hair-cutting') {
      return ServiceTemplates.hair_cutting;
    } else if (serviceId === 'creative-development') {
      return ServiceTemplates.creative_development;
    }
    return ServiceTemplates.landscaping; // Default
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-tactical-grey-800">
            Create Receipt - {client.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-tactical-grey-500"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Service Items Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-tactical-grey-800">Services Provided</h3>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  📋 Templates
                </button>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="px-3 py-1 text-sm bg-tactical-gold-muted text-tactical-brown-dark rounded hover:bg-tactical-gold-light"
                >
                  + Add Service
                </button>
              </div>
            </div>

            {/* Service Templates */}
            {showTemplates && (
              <div className="mb-4 p-4 bg-tactical-grey-100 rounded-lg">
                <h4 className="text-sm font-medium text-tactical-grey-600 mb-2">Quick Add Templates:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {getServiceTemplates().map((template, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => addTemplateItem(template)}
                      className="text-left p-2 text-sm bg-white border rounded hover:bg-tactical-gold-muted hover:border-tactical-grey-400"
                    >
                      <div className="font-medium">{template.description}</div>
                      <div className="text-tactical-grey-500">${template.unitPrice}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Line Items */}
            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-3 items-end p-3 bg-tactical-grey-100 rounded-lg">
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-tactical-grey-600 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                      placeholder="Service description"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-tactical-grey-600 mb-1">
                      Service Type
                    </label>
                    <select
                      value={item.serviceType}
                      onChange={(e) => updateLineItem(index, 'serviceType', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                    >
                      <option value="landscaping">Landscaping</option>
                      <option value="snow_removal">Snow Removal</option>
                      <option value="hair_cutting">Hair Cutting</option>
                      <option value="creative_development">Creative Dev</option>
                      <option value="lawn_care">Lawn Care</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="consultation">Consultation</option>
                    </select>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-tactical-grey-600 mb-1">
                      Qty *
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-tactical-grey-600 mb-1">
                      Unit Price *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border border-tactical-grey-400 rounded focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-tactical-grey-600 mb-1">
                      Total
                    </label>
                    <div className="px-2 py-1 text-sm bg-tactical-grey-200 border border-tactical-grey-400 rounded">
                      ${item.totalPrice.toFixed(2)}
                    </div>
                  </div>

                  <div className="col-span-1 flex items-center space-x-1">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={item.taxable}
                        onChange={(e) => updateLineItem(index, 'taxable', e.target.checked)}
                        className="rounded border-tactical-grey-400 text-tactical-gold focus:ring-tactical-gold-500"
                      />
                      <span className="ml-1 text-xs text-tactical-grey-500">Tax</span>
                    </label>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Details */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-tactical-grey-800 mb-4">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Payment Method *
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="e-transfer">E-Transfer</option>
                  <option value="check">Check</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Service Date *
                </label>
                <input
                  type="date"
                  value={formData.serviceDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="mb-6">
            <div className="bg-tactical-grey-100 rounded-lg p-4">
              <h3 className="text-lg font-medium text-tactical-grey-800 mb-3">Receipt Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax ({DEFAULT_TAX_CONFIG.rate > 0 ? `${(DEFAULT_TAX_CONFIG.rate * 100).toFixed(1)}%` : DEFAULT_TAX_CONFIG.name}):</span>
                  <span>{DEFAULT_TAX_CONFIG.rate > 0 ? `$${calculateTax().toFixed(2)}` : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
              placeholder="Additional notes or details..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-tactical-grey-600 bg-tactical-grey-200 rounded-lg hover:bg-tactical-grey-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create & Send Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
