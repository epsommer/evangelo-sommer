"use client";

import { useState, useEffect } from 'react';
import { X, Edit, Mail, Download, Check, AlertCircle, Clock, Send, CheckCircle, XCircle } from 'lucide-react';
import { Receipt, ReceiptItem } from '../types/billing';
import { Client } from '../types/client';
import { Button } from './ui/button';

interface ReceiptDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt;
  client: Client;
  onUpdate?: (receipt: Receipt) => void;
  onEmailSent?: (receipt: Receipt) => void;
}

export default function ReceiptDetailsModal({
  isOpen,
  onClose,
  receipt,
  client,
  onUpdate,
  onEmailSent
}: ReceiptDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReceipt, setEditedReceipt] = useState<Receipt>(receipt);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEditedReceipt(receipt);
  }, [receipt]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/billing/receipts/${receipt.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedReceipt),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          onUpdate?.(result.data);
          setIsEditing(false);
          setEmailStatus('Receipt updated successfully');
          setTimeout(() => setEmailStatus(null), 3000);
        }
      } else {
        throw new Error('Failed to update receipt');
      }
    } catch (error) {
      console.error('Error updating receipt:', error);
      setEmailStatus('Failed to update receipt');
      setTimeout(() => setEmailStatus(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      setIsSendingEmail(true);
      setEmailStatus('Sending receipt via email...');

      const response = await fetch(`/api/billing/receipts/${receipt.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientEmail: client.email,
          clientName: client.name,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setEmailStatus('Receipt sent successfully!');
        onEmailSent?.(result.data);
        setTimeout(() => setEmailStatus(null), 5000);
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailStatus('Failed to send receipt via email');
      setTimeout(() => setEmailStatus(null), 5000);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getStatusBadge = (status: string, emailStatus?: string) => {
    if (emailStatus === 'delivered') {
      return (
        <span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-800 border-2 border-green-200 font-primary uppercase tracking-wide flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Delivered
        </span>
      );
    }
    
    if (emailStatus === 'sent') {
      return (
        <span className="px-2 py-1 text-xs font-bold bg-tactical-gold-muted text-tactical-brown-dark border-2 border-tactical-gold font-primary uppercase tracking-wide flex items-center">
          <Send className="w-3 h-3 mr-1" />
          Sent
        </span>
      );
    }
    
    if (emailStatus === 'pending' || status === 'pending') {
      return (
        <span className="px-2 py-1 text-xs font-bold bg-orange-100 text-orange-800 border-2 border-orange-200 font-primary uppercase tracking-wide flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    }

    if (emailStatus === 'failed') {
      return (
        <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-800 border-2 border-red-200 font-primary uppercase tracking-wide flex items-center">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </span>
      );
    }

    const statusColors = {
      draft: 'bg-tactical-grey-200 text-tactical-grey-700 border-tactical-grey-300',
      issued: 'bg-tactical-gold-muted text-tactical-brown-dark border-tactical-gold',
      sent: 'bg-green-100 text-green-800 border-green-200',
    };

    return (
      <span className={`px-2 py-1 text-xs font-bold border-2 font-primary uppercase tracking-wide ${statusColors[status as keyof typeof statusColors] || statusColors.draft}`}>
        {status}
      </span>
    );
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-hud-border max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b-2 border-hud-border bg-hud-background-secondary sticky top-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-hud-text-primary font-primary uppercase tracking-wide">
                {isEditing ? 'Edit Receipt' : 'Receipt Details'}
              </h2>
              <div className="flex items-center space-x-3 mt-2">
                <span className="text-sm text-medium-grey font-primary">
                  {receipt.receiptNumber}
                </span>
                {getStatusBadge(receipt.status, receipt.emailStatus)}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-medium-grey hover:text-hud-text-primary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Status Message */}
          {emailStatus && (
            <div className={`mt-4 p-3 border-2 ${
              emailStatus.includes('successfully') || emailStatus.includes('sent successfully')
                ? 'bg-green-50 border-green-200 text-green-800'
                : emailStatus.includes('Failed') || emailStatus.includes('failed')
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-tactical-gold-muted border-tactical-gold text-tactical-brown-dark'
            }`}>
              <div className="flex items-center">
                {emailStatus.includes('successfully') ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : emailStatus.includes('Failed') ? (
                  <XCircle className="w-4 h-4 mr-2" />
                ) : (
                  <Clock className="w-4 h-4 mr-2" />
                )}
                <span className="text-sm font-primary">{emailStatus}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 mt-4">
            {!isEditing ? (
              <>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Receipt
                </Button>
                <Button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !client.email}
                  size="sm"
                  className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isSendingEmail ? 'Sending...' : 'Send via Email'}
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedReceipt(receipt);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Client Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm mb-3">
                Bill To
              </h3>
              <div className="space-y-1">
                <div className="font-bold text-hud-text-primary">{client.name}</div>
                <div className="text-sm text-medium-grey">{client.email}</div>
                <div className="text-sm text-medium-grey">{client.phone}</div>
                {client.address && (
                  <div className="text-sm text-medium-grey">
                    {client.address.street}<br />
                    {client.address.city}, {client.address.province} {client.address.postalCode}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm mb-3">
                Receipt Information
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-medium-grey">Receipt Number:</span>
                  <span className="text-sm font-bold text-hud-text-primary">{receipt.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-medium-grey">Service Date:</span>
                  <span className="text-sm text-hud-text-primary">{formatDate(receipt.serviceDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-medium-grey">Payment Date:</span>
                  <span className="text-sm text-hud-text-primary">{formatDate(receipt.paymentDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-medium-grey">Payment Method:</span>
                  <span className="text-sm text-hud-text-primary capitalize">{receipt.paymentMethod}</span>
                </div>
                {receipt.emailSentAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-medium-grey">Email Sent:</span>
                    <span className="text-sm text-hud-text-primary">{formatDate(receipt.emailSentAt)}</span>
                  </div>
                )}
                {receipt.emailDeliveredAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-medium-grey">Email Delivered:</span>
                    <span className="text-sm text-hud-text-primary">{formatDate(receipt.emailDeliveredAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-8">
            <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm mb-3">
              Services Provided
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-hud-border">
                <thead className="bg-hud-background-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left font-primary font-bold uppercase text-hud-text-primary text-xs">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left font-primary font-bold uppercase text-hud-text-primary text-xs">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left font-primary font-bold uppercase text-hud-text-primary text-xs">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-left font-primary font-bold uppercase text-hud-text-primary text-xs">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item, index) => (
                    <tr key={item.id} className="border-b border-hud-border">
                      <td className="px-4 py-3 text-sm text-hud-text-primary">
                        {item.description}
                        <div className="text-xs text-medium-grey capitalize">
                          {item.serviceType.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-hud-text-primary">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-hud-text-primary">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-hud-text-primary">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80">
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-hud-border">
                  <span className="text-sm text-medium-grey">Subtotal:</span>
                  <span className="text-sm text-hud-text-primary">{formatCurrency(receipt.subtotal)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-hud-border">
                  <span className="text-sm text-medium-grey">Tax:</span>
                  <span className="text-sm text-hud-text-primary">{formatCurrency(receipt.taxAmount)}</span>
                </div>
                <div className="flex justify-between py-3 border-t-2 border-dark-grey">
                  <span className="font-bold text-lg text-hud-text-primary font-primary uppercase">Total:</span>
                  <span className="font-bold text-lg text-hud-text-primary font-primary">{formatCurrency(receipt.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {receipt.notes && (
            <div className="mt-8">
              <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm mb-3">
                Notes
              </h3>
              <div className="p-4 bg-hud-background-secondary border border-hud-border">
                <p className="text-sm text-hud-text-primary">{receipt.notes}</p>
              </div>
            </div>
          )}

          {/* Email Error */}
          {receipt.emailError && (
            <div className="mt-6 p-4 bg-red-50 border-2 border-red-200">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-sm font-bold text-red-800">Email Error:</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{receipt.emailError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}