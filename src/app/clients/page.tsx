"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Filter, Plus, Users, Mail, Phone, MapPin, DollarSign, Tag, Edit2, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import CRMLayout from '@/components/CRMLayout'
import { getAllServices } from '@/lib/service-config'
import { getServiceInfo } from '@/lib/service-constants'
import { Client } from '@/types/client'
import EditClientModal from '@/components/EditClientModal'

export default function ClientsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterService, setFilterService] = useState<string>('all')
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false)
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingClient, setDeletingClient] = useState<string | null>(null)

  const services = getAllServices()

  const loadClients = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('limit', '100')
      
      if (filterStatus !== 'all') {
        params.set('status', filterStatus)
      }
      
      if (searchQuery) {
        params.set('search', searchQuery)
      }

      const response = await fetch(`/api/clients?${params}`)
      const data = await response.json()

      if (data.success) {
        let allClients = data.data

        if (filterService !== 'all') {
          allClients = allClients.filter(
            (client: Client) => client.serviceId === filterService,
          )
        }

        if (showIncompleteOnly) {
          allClients = allClients.filter(
            (client: Client) => !client.email || !client.phone || !client.address?.street,
          )
        }

        setClients(allClients)
      } else {
        console.error('Failed to load clients:', data.error)
        setClients([])
      }
    } catch (error) {
      console.error('Error loading clients:', error)
      setClients([])
    }
  }, [searchQuery, filterStatus, filterService, showIncompleteOnly])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(new Set(clients.map(c => c.id)))
    } else {
      setSelectedClients(new Set())
    }
  }

  const handleSelectClient = (clientId: string, checked: boolean) => {
    const newSelected = new Set(selectedClients)
    if (checked) {
      newSelected.add(clientId)
    } else {
      newSelected.delete(clientId)
    }
    setSelectedClients(newSelected)
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      return
    }

    setDeletingClient(clientId)
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete client')
      }

      // Remove from local state
      setClients(clients.filter(c => c.id !== clientId))
      setSelectedClients(prev => {
        const newSet = new Set(prev)
        newSet.delete(clientId)
        return newSet
      })
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Failed to delete client. Please try again.')
    } finally {
      setDeletingClient(null)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedClients.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedClients.size} client(s)? This action cannot be undone.`)) {
      return
    }

    const deletePromises = Array.from(selectedClients).map(clientId =>
      fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
    )

    try {
      await Promise.all(deletePromises)
      setClients(clients.filter(c => !selectedClients.has(c.id)))
      setSelectedClients(new Set())
    } catch (error) {
      console.error('Error batch deleting clients:', error)
      alert('Failed to delete some clients. Please try again.')
    }
  }

  const handleBatchSignup = async () => {
    if (selectedClients.size === 0) return

    const serviceId = prompt('Enter service ID to sign up clients for:')
    if (!serviceId) return

    // Navigate to a bulk signup page or implement bulk service assignment
    router.push(`/services/${serviceId}/bulk-signup?clients=${Array.from(selectedClients).join(',')}`)
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
  }

  const handleSaveClient = async (updatedData: Partial<Client>) => {
    // Refresh the client data
    await loadClients()
    setEditingClient(null)
  }

  if (status === 'loading') {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hud-border-accent"></div>
        </div>
      </CRMLayout>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-600 text-white',
      prospect: 'bg-tactical-gold text-hud-text-primary',
      completed: 'bg-purple-600 text-white',
      inactive: 'bg-medium-grey text-white',
    }
    return colors[status as keyof typeof colors] || 'bg-light-grey text-hud-text-secondary'
  }

  const getServiceName = (serviceId: string) => {
    const serviceInfo = getServiceInfo(serviceId as any)
    return serviceInfo ? serviceInfo.name : serviceId
  }

  const getServiceColor = (serviceId: string) => {
    const serviceInfo = getServiceInfo(serviceId as any)
    return serviceInfo ? serviceInfo.color : 'medium-grey'
  }

  const isIncompleteProfile = (client: Client) => {
    return (
      !client.email ||
      !client.phone ||
      (!client.address?.street &&
        ['landscaping', 'snow_removal', 'pet_services'].includes(
          client.serviceId,
        ))
    )
  }

  const canReceiveAutomation = (client: Client) => {
    return (
      client.email &&
      client.email.includes('@') &&
      client.contactPreferences?.autoInvoicing
    )
  }

  const stats = {
    total: clients.length,
    active: clients.filter((c) => c.status === 'active').length,
    withEmail: clients.filter((c) => c.email && c.email.includes('@')).length,
    automationEnabled: clients.filter((c) => canReceiveAutomation(c)).length,
    incomplete: clients.filter((c) => isIncompleteProfile(c)).length,
  }

  return (
    <CRMLayout>
      <div className="p-6">
        {/* Page Header */}
        <div className="bg-hud-background-secondary p-6 border-b-2 border-hud-border-accent mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-hud-text-primary uppercase tracking-wide font-primary mb-2">
                CLIENT MANAGEMENT
              </h1>
              <p className="text-hud-text-secondary font-primary">
                MANAGE YOUR CLIENT RELATIONSHIPS AND COMMUNICATIONS
              </p>
            </div>
            <Button 
              className="bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light font-primary text-sm uppercase tracking-wide"
              onClick={() => router.push('/clients/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              ADD CLIENT
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4 bg-hud-background-primary border-2 border-hud-border">
            <div className="text-2xl font-bold text-hud-text-primary font-primary">
              {stats.total}
            </div>
            <div className="text-sm text-hud-text-secondary font-primary uppercase tracking-wide">
              TOTAL CLIENTS
            </div>
          </Card>
          <Card className="p-4 bg-hud-background-primary border-2 border-hud-border">
            <div className="text-2xl font-bold text-green-600 font-primary">
              {stats.active}
            </div>
            <div className="text-sm text-hud-text-secondary font-primary uppercase tracking-wide">
              ACTIVE
            </div>
          </Card>
          <Card className="p-4 bg-hud-background-primary border-2 border-hud-border">
            <div className="text-2xl font-bold text-gold font-primary">
              {stats.withEmail}
            </div>
            <div className="text-sm text-hud-text-secondary font-primary uppercase tracking-wide">
              WITH EMAIL
            </div>
          </Card>
          <Card className="p-4 bg-hud-background-primary border-2 border-hud-border">
            <div className="text-2xl font-bold text-purple-600 font-primary">
              {stats.automationEnabled}
            </div>
            <div className="text-sm text-hud-text-secondary font-primary uppercase tracking-wide">
              AUTO-ENABLED
            </div>
          </Card>
          <Card className="p-4 bg-hud-background-primary border-2 border-hud-border">
            <div className="text-2xl font-bold text-orange-600 font-primary">
              {stats.incomplete}
            </div>
            <div className="text-sm text-hud-text-secondary font-primary uppercase tracking-wide">
              INCOMPLETE
            </div>
          </Card>
        </div>

        {/* Batch Actions Bar */}
        {selectedClients.size > 0 && (
          <Card className="p-4 mb-6 bg-tactical-gold-muted border-2 border-tactical-gold">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-bold text-hud-text-primary font-primary uppercase tracking-wide">
                  {selectedClients.size} CLIENT(S) SELECTED
                </span>
                <Button
                  onClick={handleBatchDelete}
                  className="bg-red-600 text-white hover:bg-red-700 font-primary text-sm uppercase tracking-wide"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  DELETE SELECTED
                </Button>
                <Button
                  onClick={handleBatchSignup}
                  className="bg-green-600 text-white hover:bg-green-700 font-primary text-sm uppercase tracking-wide"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  SIGN UP FOR SERVICE
                </Button>
              </div>
              <Button
                onClick={() => setSelectedClients(new Set())}
                className="bg-hud-background-secondary text-hud-text-secondary hover:bg-hud-background-primary font-primary text-sm uppercase tracking-wide"
              >
                CLEAR SELECTION
              </Button>
            </div>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="p-6 mb-6 bg-hud-background-primary border-2 border-hud-border">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-hud-text-secondary" />
                <input
                  type="text"
                  placeholder="SEARCH CLIENTS BY NAME, EMAIL, COMPANY, OR PHONE..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-hud-border bg-hud-background-primary text-hud-text-primary placeholder-medium-grey font-primary text-sm uppercase tracking-wide"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border-2 border-hud-border bg-hud-background-primary text-hud-text-primary font-primary text-sm uppercase tracking-wide"
              >
                <option value="all">ALL STATUS</option>
                <option value="active">ACTIVE</option>
                <option value="prospect">PROSPECT</option>
                <option value="completed">COMPLETED</option>
                <option value="inactive">INACTIVE</option>
              </select>
              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="px-4 py-2 border-2 border-hud-border bg-hud-background-primary text-hud-text-primary font-primary text-sm uppercase tracking-wide"
              >
                <option value="all">ALL SERVICES</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showIncompleteOnly}
                  onChange={(e) => setShowIncompleteOnly(e.target.checked)}
                  className="border-2 border-hud-border text-gold focus:ring-gold"
                />
                <span className="ml-2 text-sm text-hud-text-secondary font-primary uppercase tracking-wide">
                  SHOW ONLY CLIENTS WITH INCOMPLETE PROFILES
                </span>
              </label>
              {clients.length > 0 && (
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedClients.size === clients.length && clients.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="border-2 border-hud-border text-gold focus:ring-gold"
                  />
                  <span className="ml-2 text-sm text-hud-text-secondary font-primary uppercase tracking-wide">
                    SELECT ALL
                  </span>
                </label>
              )}
            </div>
          </div>
        </Card>

        {/* Clients Grid */}
        {clients.length === 0 ? (
          <Card className="p-8 text-center bg-hud-background-primary border-2 border-hud-border">
            <Users className="mx-auto h-12 w-12 text-light-grey mb-4" />
            <h3 className="text-lg font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
              NO CLIENTS FOUND
            </h3>
            <p className="text-hud-text-secondary mb-4 font-primary">
              {searchQuery || showIncompleteOnly
                ? 'TRY ADJUSTING YOUR SEARCH TERMS OR FILTERS.'
                : 'GET STARTED BY ADDING YOUR FIRST CLIENT.'}
            </p>
            <Button
              className="bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light font-primary text-sm uppercase tracking-wide"
              onClick={() => router.push('/clients/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              ADD FIRST CLIENT
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <Card
                key={client.id}
                className={`p-6 bg-hud-background-primary border-2 ${selectedClients.has(client.id) ? 'border-tactical-gold' : 'border-hud-border'} hover:bg-hud-background-secondary transition-colors border-l-4 border-l-${getServiceColor(client.serviceId)} relative`}
              >
                {/* Checkbox for selection */}
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedClients.has(client.id)}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleSelectClient(client.id, e.target.checked)
                    }}
                    className="border-2 border-hud-border text-tactical-gold focus:ring-tactical-gold"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <Link
                  href={`/clients/${client.id}`}
                  className="block"
                >
                  <div className="flex items-start justify-between mb-4 pr-8">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-hud-text-primary font-primary">
                        {client.name.toUpperCase()}
                      </h3>
                      {client.company && (
                        <p className="text-sm text-hud-text-secondary font-primary">
                          {client.company.toUpperCase()}
                        </p>
                      )}
                      <p className="text-xs text-hud-text-secondary mt-1 font-primary uppercase tracking-wide">
                        {getServiceName(client.serviceId)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={`${getStatusColor(client.status)} text-xs font-bold uppercase tracking-wide`}>
                        {client.status}
                      </Badge>
                      {isIncompleteProfile(client) && (
                        <Badge className="bg-orange-500 text-white text-xs font-bold uppercase tracking-wide">
                          INCOMPLETE
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {client.email ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-hud-text-secondary" />
                          <p className="text-sm text-hud-text-secondary font-primary">
                            {client.email}
                          </p>
                        </div>
                        {canReceiveAutomation(client) && (
                          <Badge className="bg-green-600 text-white text-xs font-bold">
                            AUTO
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-light-grey" />
                        <p className="text-sm text-light-grey font-primary">
                          NO EMAIL
                        </p>
                      </div>
                    )}

                    {client.phone ? (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-hud-text-secondary" />
                        <p className="text-sm text-hud-text-secondary font-primary">
                          {client.phone}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-light-grey" />
                        <p className="text-sm text-light-grey font-primary">
                          NO PHONE
                        </p>
                      </div>
                    )}

                    {client.budget && (
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-hud-text-secondary" />
                        <p className="text-sm text-hud-text-secondary font-primary">
                          ${client.budget.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {client.address?.city && client.address?.state && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-hud-text-secondary" />
                        <p className="text-sm text-hud-text-secondary font-primary">
                          {client.address.city.toUpperCase()}, {client.address.state.toUpperCase()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Contact Capabilities */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {client.email && client.email.includes('@') && (
                      <Badge className="bg-green-100 text-green-700 text-xs font-bold uppercase">
                        EMAIL ✓
                      </Badge>
                    )}
                    {client.phone && client.phone.length >= 10 && (
                      <Badge className="bg-tactical-gold-muted text-tactical-brown-dark text-xs font-bold uppercase">
                        SMS ✓
                      </Badge>
                    )}
                    {canReceiveAutomation(client) && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs font-bold uppercase">
                        AUTO-INVOICE
                      </Badge>
                    )}
                  </div>

                  {/* Tags */}
                  {client.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {client.tags.slice(0, 3).map((tag, index) => (
                        <Badge
                          key={index}
                          className="bg-light-grey text-hud-text-secondary text-xs font-bold uppercase"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {client.tags.length > 3 && (
                        <Badge className="bg-light-grey text-hud-text-secondary text-xs font-bold uppercase">
                          +{client.tags.length - 3} MORE
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Missing Information Alert */}
                  {isIncompleteProfile(client) && (
                    <div className="mt-3 p-2 bg-orange-50 border-2 border-orange-200 text-xs text-orange-700 font-primary uppercase tracking-wide">
                      MISSING:{' '}
                      {[
                        !client.email && 'EMAIL',
                        !client.phone && 'PHONE',
                        !client.address?.street &&
                          ['landscaping', 'snow_removal', 'pet_services'].includes(
                            client.serviceId,
                          ) &&
                          'ADDRESS',
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  )}

                    <div className="mt-4 text-xs text-hud-text-secondary font-primary uppercase tracking-wide">
                      UPDATED: {new Date(client.updatedAt).toLocaleDateString()}
                    </div>
                  </Link>

                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center space-x-2 pt-4 border-t border-hud-border">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditClient(client)
                      }}
                      className="flex-1 bg-tactical-gold text-hud-text-primary hover:bg-tactical-gold-light font-primary text-xs uppercase tracking-wide"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      EDIT
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClient(client.id)
                      }}
                      disabled={deletingClient === client.id}
                      className="flex-1 bg-red-600 text-white hover:bg-red-700 font-primary text-xs uppercase tracking-wide disabled:opacity-50"
                    >
                      {deletingClient === client.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                      ) : (
                        <>
                          <Trash2 className="h-3 w-3 mr-1" />
                          DELETE
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Client Modal */}
      {editingClient && (
        <EditClientModal
          isOpen={!!editingClient}
          onClose={() => setEditingClient(null)}
          client={editingClient}
          onSave={handleSaveClient}
        />
      )}
    </CRMLayout>
  )
}
