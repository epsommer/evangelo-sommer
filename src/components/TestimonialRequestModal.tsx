"use client"

import React, { useState, useEffect } from 'react'
import { X, Send, AlertCircle, CheckCircle, Search } from 'lucide-react'

interface Client {
  id: string
  name: string
  email?: string
  company?: string
  serviceContracts?: any[]
}

interface TestimonialRequestModalProps {
  isOpen: boolean
  onClose: () => void
  client?: Client | null
  clients?: Client[]
  onRequestSent: () => void
}

const TestimonialRequestModal: React.FC<TestimonialRequestModalProps> = ({
  isOpen,
  onClose,
  client: propClient,
  clients = [],
  onRequestSent,
}) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(propClient || null)
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [formLink, setFormLink] = useState('')

  // Generate template message based on service
  const getTemplateMessage = (service: string): string => {
    const templates: { [key: string]: string } = {
      'woodgreen': `Thank you for choosing Woodgreen Landscaping! We'd greatly appreciate your feedback on our landscaping services. Your testimonial helps us continue to provide exceptional service to our valued clients.`,
      'whiteknight': `Thank you for trusting White Knight Snow Service! We hope our snow removal services exceeded your expectations. Your feedback helps us maintain the highest standards of service.`,
      'lawn_care': `Thank you for trusting us with your lawn care needs! We'd love to hear about your experience with our service. Your feedback helps us continue to deliver exceptional results.`,
      'landscaping': `Thank you for choosing our landscaping services! We'd appreciate hearing about your experience. Your testimonial helps us serve our clients better.`,
      'snow_removal': `Thank you for choosing our snow removal service! We hope we kept your property safe and accessible throughout the winter. We'd love to hear your feedback.`,
      'maintenance': `Thank you for choosing our maintenance services! We'd appreciate your feedback on how we're keeping your property in top condition.`,
      'tree_trimming': `Thank you for trusting us with your tree care! We'd love to hear about your experience with our tree trimming services.`,
      'lawn_mowing': `Thank you for choosing our lawn mowing service! We'd appreciate hearing about your experience with our regular lawn care.`,
      'hedge_trimming': `Thank you for choosing our hedge trimming service! We'd love to hear how we did keeping your hedges looking great.`,
      'weeding': `Thank you for choosing our weeding service! We'd appreciate your feedback on our garden maintenance work.`,
      'gardening': `Thank you for choosing our gardening and planting services! We'd love to hear about your experience with our horticultural expertise.`,
      'mulching': `Thank you for choosing our mulching service! We'd appreciate hearing about your experience with our landscape enhancement work.`,
      'gutter_cleaning': `Thank you for choosing our gutter cleaning service! We'd love to hear about your experience with our maintenance work.`,
      'leaf_removal': `Thank you for choosing our leaf removal service! We'd appreciate your feedback on our seasonal cleanup work.`,
      'snow_plowing': `Thank you for choosing our snow plowing service! We'd love to hear how we did keeping your property clear and safe.`,
      'salting': `Thank you for choosing our premium salting service! We'd appreciate your feedback on our ice management and safety services.`,
      'ice_management': `Thank you for choosing our ice management service! We'd love to hear about your experience with our winter safety solutions.`,
    }
    return templates[service] || `Thank you for choosing our services! We'd greatly appreciate your feedback. Your testimonial helps us continue to provide exceptional service to our valued clients.`
  }

  const insertTemplateMessage = () => {
    if (serviceId || serviceName) {
      const template = getTemplateMessage(serviceId)
      setMessage(template)
    }
  }

  // Predefined services list
  const predefinedServices = [
    { id: 'woodgreen', name: 'Woodgreen Landscaping' },
    { id: 'whiteknight', name: 'White Knight Snow Service' },
    { id: 'lawn_care', name: 'Lawn Care' },
    { id: 'landscaping', name: 'Landscaping' },
    { id: 'snow_removal', name: 'Snow Removal' },
    { id: 'maintenance', name: 'Maintenance' },
    { id: 'tree_trimming', name: 'Tree Trimming' },
    { id: 'lawn_mowing', name: 'Lawn Mowing' },
    { id: 'hedge_trimming', name: 'Hedge Trimming' },
    { id: 'weeding', name: 'Weeding' },
    { id: 'gardening', name: 'Gardening & Planting' },
    { id: 'mulching', name: 'Mulching' },
    { id: 'gutter_cleaning', name: 'Gutter Cleaning' },
    { id: 'leaf_removal', name: 'Leaf Removal' },
    { id: 'snow_plowing', name: 'Snow Plowing' },
    { id: 'salting', name: 'Premium Salting' },
    { id: 'ice_management', name: 'Ice Management' },
  ]

  useEffect(() => {
    if (propClient) {
      setSelectedClient(propClient)
    }
  }, [propClient])

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!selectedClient) {
      setError('Please select a client')
      return
    }

    if (!selectedClient.email) {
      setError('Selected client does not have an email address')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/testimonials/send-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient.id,
          serviceId,
          serviceName,
          message,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(true)
        setFormLink(`${window.location.origin}${data.formLink}`)
        onRequestSent()

        // Reset form after 3 seconds
        setTimeout(() => {
          handleClose()
        }, 3000)
      } else {
        setError(data.error || 'Failed to send testimonial request')
      }
    } catch (err) {
      setError('An error occurred while sending the request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedClient(propClient || null)
      setClientSearchQuery('')
      setServiceId('')
      setServiceName('')
      setMessage('')
      setError('')
      setSuccess(false)
      setFormLink('')
      onClose()
    }
  }

  const copyFormLink = () => {
    if (formLink) {
      navigator.clipboard.writeText(formLink)
    }
  }

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === 'custom') {
      setServiceId('')
      setServiceName('')
    } else if (value) {
      const service = predefinedServices.find(s => s.id === value)
      if (service) {
        setServiceId(service.id)
        setServiceName(service.name)
      }
    } else {
      setServiceId('')
      setServiceName('')
    }
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    c.company?.toLowerCase().includes(clientSearchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-[100] px-2 sm:p-4 pt-16 sm:pt-4 overflow-y-auto">
      <div className="neo-container max-w-2xl w-full max-h-[calc(100vh-4rem)] sm:max-h-[90vh] overflow-y-auto my-auto">
        {/* Header */}
        <div className="neo-inset border-b border-foreground/10 p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-xl font-bold text-foreground uppercase tracking-wide font-primary">
              Request Testimonial
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="neo-button-circle h-8 w-8 p-0 transition-transform hover:scale-[1.1]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="neo-card p-6 mb-6">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
                <h3 className="text-lg font-bold text-foreground mb-2 font-primary">
                  Request Sent Successfully!
                </h3>
                <p className="text-muted-foreground font-primary">
                  A testimonial request has been created for {selectedClient?.name}.
                </p>
              </div>
              {formLink && (
                <div className="neo-card p-5">
                  <p className="text-xs text-muted-foreground font-primary mb-3 uppercase tracking-wide">
                    Share this link with your client:
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={formLink}
                      readOnly
                      className="neo-input flex-1 text-sm"
                    />
                    <button
                      onClick={copyFormLink}
                      className="neo-button px-3 py-2 uppercase text-xs"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Client Selection - Only show if client not provided via props */}
              {!propClient && clients.length > 0 && (
                <div className="neo-card p-4">
                  <label className="block text-sm font-bold text-foreground mb-3 font-primary uppercase tracking-wide">
                    Select Client *
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      placeholder="Search clients..."
                      className="neo-input w-full pl-10"
                    />
                  </div>
                  <div className="neo-inset rounded-lg max-h-48 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground font-primary">
                        No clients found
                      </div>
                    ) : (
                      <div className="divide-y divide-foreground/10">
                        {filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => setSelectedClient(client)}
                            className={`w-full p-3 text-left transition-colors hover:bg-foreground/5 ${
                              selectedClient?.id === client.id ? 'bg-foreground/10' : ''
                            }`}
                          >
                            <div className="font-bold text-foreground font-primary text-sm">
                              {client.name}
                            </div>
                            <div className="text-xs text-muted-foreground font-primary">
                              {client.email || 'No email'}
                              {client.company && ` • ${client.company}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Selected Client Info */}
              {selectedClient && (
                <div className="neo-card p-5">
                  <div className="neo-inset p-4 rounded-lg">
                    <div className="text-xs text-muted-foreground font-primary uppercase tracking-wide mb-2">
                      {propClient ? 'Client' : 'Selected Client'}
                    </div>
                  <div className="font-bold text-foreground font-primary">{selectedClient.name}</div>
                  <div className="text-sm text-muted-foreground font-primary">
                    {selectedClient.email || 'No email address'}
                  </div>
                  {selectedClient.company && (
                    <div className="text-xs text-muted-foreground font-primary mt-1">
                      {selectedClient.company}
                    </div>
                  )}
                    {!propClient && (
                      <button
                        type="button"
                        onClick={() => setSelectedClient(null)}
                        className="text-xs text-red-600 hover:text-red-700 mt-2 font-primary"
                      >
                        Change Client
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Service Selection with Dropdown + Custom */}
              <div className="neo-card p-5">
                <label className="block text-sm font-bold text-foreground mb-3 font-primary uppercase tracking-wide">
                  Service (Optional)
                </label>
                <select
                  value={serviceId || 'custom'}
                  onChange={handleServiceChange}
                  className="neo-input w-full mb-2"
                >
                  <option value="">Select a service...</option>
                  {predefinedServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                  <option value="custom">Custom Service...</option>
                </select>

                {/* Custom Service Input */}
                {(!serviceId || !predefinedServices.find(s => s.id === serviceId)) && (
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => {
                      setServiceName(e.target.value)
                      setServiceId('')
                    }}
                    placeholder="Enter custom service name..."
                    className="neo-input w-full"
                  />
                )}

                {/* Show Client's Service Contracts if available */}
                {selectedClient?.serviceContracts && selectedClient.serviceContracts.length > 0 && (
                  <div className="neo-inset p-3 rounded-lg mt-3">
                    <div className="text-xs text-muted-foreground font-primary uppercase tracking-wide mb-2">
                      Client's Services
                    </div>
                    <div className="space-y-1">
                      {selectedClient.serviceContracts.slice(0, 3).map((contract: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setServiceId(contract.serviceId || '')
                            setServiceName(contract.serviceName || contract.serviceCategory || '')
                          }}
                          className="text-xs text-foreground hover:text-tactical-gold transition-colors font-primary"
                        >
                          • {contract.serviceName || contract.serviceCategory}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Message */}
              <div className="neo-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-foreground font-primary uppercase tracking-wide">
                    Personal Message (Optional)
                  </label>
                  {(serviceId || serviceName) && (
                    <button
                      type="button"
                      onClick={insertTemplateMessage}
                      className="neo-button-sm px-3 py-1 text-xs uppercase tracking-wide transition-transform hover:scale-[1.02]"
                      title="Insert template message for selected service"
                    >
                      Use Template
                    </button>
                  )}
                </div>

                {/* Show template preview if service selected and message is empty */}
                {(serviceId || serviceName) && !message && (
                  <div className="neo-inset p-3 rounded-lg mb-3">
                    <div className="text-xs text-muted-foreground font-primary uppercase tracking-wide mb-2 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Template Preview
                    </div>
                    <p className="text-xs text-foreground font-primary italic">
                      {getTemplateMessage(serviceId)}
                    </p>
                  </div>
                )}

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal message to your testimonial request..."
                  rows={4}
                  className="neo-input w-full resize-none"
                />
                  <p className="text-xs text-muted-foreground font-primary mt-1">
                    This message will be included in the testimonial request
                  </p>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="neo-card p-4 border-l-4 border-red-500">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <p className="text-sm text-red-600 font-primary">{error}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="neo-card p-4">
                  <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="neo-button px-4 py-2 uppercase tracking-wide transition-transform hover:scale-[1.02]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedClient || !selectedClient.email}
                  className="neo-button px-4 py-2 uppercase tracking-wide transition-transform hover:scale-[1.02] flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-foreground/20 border-t-transparent animate-spin rounded-full"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send Request</span>
                    </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default TestimonialRequestModal
