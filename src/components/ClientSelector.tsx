"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { User, Plus, Search, Check, X, Mail, Phone, MapPin } from 'lucide-react'

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  company?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

interface ClientSelectorProps {
  selectedClientId?: string
  selectedClientName?: string
  onClientSelect: (client: Client | null, isNonClient: boolean) => void
  onCreateClient?: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Client>
  placeholder?: string
  required?: boolean
  allowNonClient?: boolean
  className?: string
}

const ClientSelector: React.FC<ClientSelectorProps> = ({
  selectedClientId,
  selectedClientName,
  onClientSelect,
  onCreateClient,
  placeholder = "Search for a client or enter name",
  required = false,
  allowNonClient = true,
  className = ""
}) => {
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState(selectedClientName || '')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isNonClient, setIsNonClient] = useState(false)
  const [loading, setLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load clients from API and localStorage
  useEffect(() => {
    const loadClients = async () => {
      try {
        try {
          const response = await fetch('/api/clients?limit=100')
          if (response.ok) {
            const apiData = await response.json()
            if (apiData.success && apiData.data) {
              const apiClients = apiData.data.map((client: any) => ({
                id: client.id,
                name: client.name || 'Unnamed Client',
                email: client.email,
                phone: client.phone,
                address: client.address,
                company: client.company,
                notes: client.notes,
                createdAt: client.createdAt,
                updatedAt: client.updatedAt
              }))
              setClients(apiClients)
              localStorage.setItem('clients', JSON.stringify(apiClients))
              return
            }
          }
        } catch (apiError) {
          console.warn('API not available, falling back to localStorage:', apiError)
        }

        const storedClients = JSON.parse(localStorage.getItem('clients') || '[]')
        const formattedClients = storedClients.map((client: any) => ({
          id: client.id,
          name: client.name || 'Unnamed Client',
          email: client.email,
          phone: client.phone,
          address: client.address,
          company: client.company,
          notes: client.notes,
          createdAt: client.createdAt,
          updatedAt: client.updatedAt
        }))
        setClients(formattedClients)
      } catch (error) {
        console.error('Error loading clients:', error)
        setClients([])
      }
    }

    loadClients()
  }, [])

  useEffect(() => {
    if (selectedClientName) {
      setSearchQuery(selectedClientName)
    }
  }, [selectedClientName])

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients.slice(0, 10)

    const query = searchQuery.toLowerCase()
    return clients.filter(client =>
      client.name.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.company?.toLowerCase().includes(query)
    ).slice(0, 10)
  }, [clients, searchQuery])

  const exactMatch = useMemo(() => {
    return clients.find(client =>
      client.name.toLowerCase() === searchQuery.toLowerCase()
    )
  }, [clients, searchQuery])

  const handleInputFocus = () => {
    setIsDropdownOpen(true)
  }

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsDropdownOpen(false)
    }, 200)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setIsDropdownOpen(true)
    setIsNonClient(false)

    if (!value.trim()) {
      onClientSelect(null, false)
    }
  }

  const handleClientSelect = (client: Client) => {
    setSearchQuery(client.name)
    setIsDropdownOpen(false)
    setIsNonClient(false)
    onClientSelect(client, false)
  }

  const handleNonClientSelect = () => {
    if (!searchQuery.trim()) return

    setIsDropdownOpen(false)
    setIsNonClient(true)

    const nonClientData: Client = {
      id: `non-client-${Date.now()}`,
      name: searchQuery.trim()
    }

    onClientSelect(nonClientData, true)
  }

  const handleCreateClient = () => {
    setShowCreateModal(true)
    setIsDropdownOpen(false)
  }

  const handleCreateNewClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!onCreateClient) {
      const newClient: Client = {
        ...clientData,
        id: `client-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      try {
        const updatedClients = [...clients, newClient]
        setClients(updatedClients)
        localStorage.setItem('clients', JSON.stringify(updatedClients))

        setSearchQuery(newClient.name)
        onClientSelect(newClient, false)
        setShowCreateModal(false)

        return newClient
      } catch (error) {
        console.error('Error saving client:', error)
        throw error
      }
    } else {
      try {
        setLoading(true)
        const newClient = await onCreateClient(clientData)

        setClients(prev => [...prev, newClient])
        setSearchQuery(newClient.name)
        onClientSelect(newClient, false)
        setShowCreateModal(false)

        return newClient
      } catch (error) {
        console.error('Error creating client:', error)
        throw error
      } finally {
        setLoading(false)
      }
    }
  }

  const handleClear = () => {
    setSearchQuery('')
    setIsNonClient(false)
    onClientSelect(null, false)
    inputRef.current?.focus()
  }

  return (
    <div className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <User className="h-4 w-4 text-[var(--neomorphic-text)] opacity-50" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          required={required}
          className="neo-input w-full pl-10 pr-10 p-3 rounded-lg font-primary text-[var(--neomorphic-text)]"
        />

        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-[var(--neomorphic-text)] opacity-50 hover:opacity-100 transition-opacity" />
          </button>
        )}

        {isNonClient && (
          <div className="absolute inset-y-0 right-8 pr-2 flex items-center">
            <span className="neo-badge px-2 py-0.5 text-xs font-primary text-amber-600 bg-amber-500/20 rounded">Non-Client</span>
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 neo-card rounded-xl shadow-lg max-h-80 overflow-y-auto"
        >
          {/* Existing Clients */}
          {filteredClients.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-[var(--neomorphic-text)] opacity-60 uppercase tracking-wide font-primary">
                Existing Clients
              </div>
              {filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className="w-full px-4 py-3 text-left hover:bg-[var(--neomorphic-bg)] transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-[var(--neomorphic-text)] font-primary">
                        {client.name}
                      </div>
                      {(client.email || client.company) && (
                        <div className="text-sm text-[var(--neomorphic-text)] opacity-60 font-primary mt-1">
                          {client.company && <span className="mr-3">{client.company}</span>}
                          {client.email && (
                            <span className="flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {client.email}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedClientId === client.id && (
                      <Check className="w-4 h-4 text-[var(--neomorphic-accent)]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          {searchQuery.trim() && (
            <div className="border-t border-[var(--neomorphic-dark-shadow)] py-2">
              {/* Non-Client Option */}
              {allowNonClient && !exactMatch && (
                <button
                  onClick={handleNonClientSelect}
                  className="w-full px-4 py-3 text-left hover:bg-[var(--neomorphic-bg)] transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 neo-button rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-[var(--neomorphic-text)]" />
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--neomorphic-text)] font-primary">
                      Use as non-client: "{searchQuery.trim()}"
                    </div>
                    <div className="text-sm text-[var(--neomorphic-text)] opacity-60 font-primary">
                      This won't be saved as a permanent client
                    </div>
                  </div>
                </button>
              )}

              {/* Create New Client */}
              {!exactMatch && (
                <button
                  onClick={handleCreateClient}
                  className="w-full px-4 py-3 text-left hover:bg-[var(--neomorphic-bg)] transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 neo-button-active rounded-full flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--neomorphic-text)] font-primary">
                      Create new client: "{searchQuery.trim()}"
                    </div>
                    <div className="text-sm text-[var(--neomorphic-text)] opacity-60 font-primary">
                      Save this as a permanent client with contact details
                    </div>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* No Results */}
          {filteredClients.length === 0 && !searchQuery.trim() && (
            <div className="px-4 py-8 text-center text-[var(--neomorphic-text)] opacity-60 font-primary">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div className="font-semibold">No clients yet</div>
              <div className="text-sm">Start typing to create your first client</div>
            </div>
          )}
        </div>
      )}

      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateNewClient}
        initialName={searchQuery.trim()}
        loading={loading}
      />
    </div>
  )
}

// Create Client Modal Component
interface CreateClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Client>
  initialName?: string
  loading?: boolean
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: initialName,
    email: '',
    phone: '',
    address: '',
    company: '',
    notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setFormData(prev => ({ ...prev, name: initialName }))
  }, [initialName])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required'
    }

    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    try {
      setIsSaving(true)
      await onSave({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        company: formData.company.trim() || undefined,
        notes: formData.notes.trim() || undefined
      })

      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        company: '',
        notes: ''
      })
      setErrors({})
    } catch (error) {
      console.error('Error saving client:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      onClose()
      setErrors({})
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="neo-card relative w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--neomorphic-dark-shadow)]">
          <div className="flex items-center gap-3">
            <div className="neo-button-active p-2 rounded-lg">
              <Plus className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
              Create New Client
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="neo-button-sm p-2 rounded-full"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-[var(--neomorphic-text)]" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-160px)] p-6 space-y-6">
          {/* Basic Information */}
          <div className="neo-inset rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
              Basic Information
            </h3>

            {/* Name */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                Client Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`neo-input w-full p-3 rounded-lg font-primary text-[var(--neomorphic-text)] ${
                  errors.name ? 'ring-2 ring-red-500' : ''
                }`}
                placeholder="Enter client's full name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm font-primary">{errors.name}</p>
              )}
            </div>

            {/* Company */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                Company (Optional)
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className="neo-input w-full p-3 rounded-lg font-primary text-[var(--neomorphic-text)]"
                placeholder="Company or organization name"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="neo-inset rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
              Contact Information
            </h3>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                <Mail className="inline w-4 h-4 mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`neo-input w-full p-3 rounded-lg font-primary text-[var(--neomorphic-text)] ${
                  errors.email ? 'ring-2 ring-red-500' : ''
                }`}
                placeholder="client@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm font-primary">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                <Phone className="inline w-4 h-4 mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="neo-input w-full p-3 rounded-lg font-primary text-[var(--neomorphic-text)]"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                <MapPin className="inline w-4 h-4 mr-2" />
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="neo-input w-full p-3 rounded-lg font-primary text-[var(--neomorphic-text)] resize-none"
                rows={3}
                placeholder="Street address, city, state, zip code"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="neo-inset rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
              Notes
            </h3>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide">
                Additional Information
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="neo-input w-full p-3 rounded-lg font-primary text-[var(--neomorphic-text)] resize-none"
                rows={4}
                placeholder="Any additional notes about this client..."
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--neomorphic-dark-shadow)]">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="neo-button px-6 py-2 text-sm font-primary uppercase tracking-wide"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !formData.name.trim()}
            className="neo-button-active px-6 py-2 text-sm font-primary uppercase tracking-wide font-semibold disabled:opacity-50"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Create Client
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ClientSelector
