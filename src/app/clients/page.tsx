"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Filter, Plus, Users, Mail, Phone, MapPin, DollarSign, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import CRMLayout from '@/components/CRMLayout'
import { getAllServices } from '@/lib/service-config'
import { getServiceInfo } from '@/lib/service-constants'
import { Client } from '@/types/client'

export default function ClientsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterService, setFilterService] = useState<string>('all')
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false)

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

  if (status === 'loading') {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
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
      prospect: 'bg-gold text-dark-grey',
      completed: 'bg-purple-600 text-white',
      inactive: 'bg-medium-grey text-white',
    }
    return colors[status as keyof typeof colors] || 'bg-light-grey text-medium-grey'
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
        <div className="bg-off-white p-6 border-b-2 border-gold mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-dark-grey uppercase tracking-wide font-space-grotesk mb-2">
                CLIENT MANAGEMENT
              </h1>
              <p className="text-medium-grey font-space-grotesk">
                MANAGE YOUR CLIENT RELATIONSHIPS AND COMMUNICATIONS
              </p>
            </div>
            <Button 
              className="bg-gold text-dark-grey hover:bg-gold-light font-space-grotesk text-sm uppercase tracking-wide"
              onClick={() => router.push('/clients/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              ADD CLIENT
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4 bg-white border-2 border-light-grey">
            <div className="text-2xl font-bold text-dark-grey font-space-grotesk">
              {stats.total}
            </div>
            <div className="text-sm text-medium-grey font-space-grotesk uppercase tracking-wide">
              TOTAL CLIENTS
            </div>
          </Card>
          <Card className="p-4 bg-white border-2 border-light-grey">
            <div className="text-2xl font-bold text-green-600 font-space-grotesk">
              {stats.active}
            </div>
            <div className="text-sm text-medium-grey font-space-grotesk uppercase tracking-wide">
              ACTIVE
            </div>
          </Card>
          <Card className="p-4 bg-white border-2 border-light-grey">
            <div className="text-2xl font-bold text-gold font-space-grotesk">
              {stats.withEmail}
            </div>
            <div className="text-sm text-medium-grey font-space-grotesk uppercase tracking-wide">
              WITH EMAIL
            </div>
          </Card>
          <Card className="p-4 bg-white border-2 border-light-grey">
            <div className="text-2xl font-bold text-purple-600 font-space-grotesk">
              {stats.automationEnabled}
            </div>
            <div className="text-sm text-medium-grey font-space-grotesk uppercase tracking-wide">
              AUTO-ENABLED
            </div>
          </Card>
          <Card className="p-4 bg-white border-2 border-light-grey">
            <div className="text-2xl font-bold text-orange-600 font-space-grotesk">
              {stats.incomplete}
            </div>
            <div className="text-sm text-medium-grey font-space-grotesk uppercase tracking-wide">
              INCOMPLETE
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="p-6 mb-6 bg-white border-2 border-light-grey">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-medium-grey" />
                <input
                  type="text"
                  placeholder="SEARCH CLIENTS BY NAME, EMAIL, COMPANY, OR PHONE..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-light-grey bg-white text-dark-grey placeholder-medium-grey font-space-grotesk text-sm uppercase tracking-wide"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk text-sm uppercase tracking-wide"
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
                className="px-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk text-sm uppercase tracking-wide"
              >
                <option value="all">ALL SERVICES</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showIncompleteOnly}
                  onChange={(e) => setShowIncompleteOnly(e.target.checked)}
                  className="border-2 border-light-grey text-gold focus:ring-gold"
                />
                <span className="ml-2 text-sm text-medium-grey font-space-grotesk uppercase tracking-wide">
                  SHOW ONLY CLIENTS WITH INCOMPLETE PROFILES
                </span>
              </label>
            </div>
          </div>
        </Card>

        {/* Clients Grid */}
        {clients.length === 0 ? (
          <Card className="p-8 text-center bg-white border-2 border-light-grey">
            <Users className="mx-auto h-12 w-12 text-light-grey mb-4" />
            <h3 className="text-lg font-bold text-dark-grey mb-2 font-space-grotesk uppercase tracking-wide">
              NO CLIENTS FOUND
            </h3>
            <p className="text-medium-grey mb-4 font-space-grotesk">
              {searchQuery || showIncompleteOnly
                ? 'TRY ADJUSTING YOUR SEARCH TERMS OR FILTERS.'
                : 'GET STARTED BY ADDING YOUR FIRST CLIENT.'}
            </p>
            <Button
              className="bg-gold text-dark-grey hover:bg-gold-light font-space-grotesk text-sm uppercase tracking-wide"
              onClick={() => router.push('/clients/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              ADD FIRST CLIENT
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="block"
              >
                <Card className={`p-6 bg-white border-2 border-light-grey hover:bg-off-white transition-colors border-l-4 border-l-${getServiceColor(client.serviceId)}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-dark-grey font-space-grotesk">
                        {client.name.toUpperCase()}
                      </h3>
                      {client.company && (
                        <p className="text-sm text-medium-grey font-space-grotesk">
                          {client.company.toUpperCase()}
                        </p>
                      )}
                      <p className="text-xs text-medium-grey mt-1 font-space-grotesk uppercase tracking-wide">
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
                          <Mail className="h-4 w-4 text-medium-grey" />
                          <p className="text-sm text-medium-grey font-space-grotesk">
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
                        <p className="text-sm text-light-grey font-space-grotesk">
                          NO EMAIL
                        </p>
                      </div>
                    )}

                    {client.phone ? (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-medium-grey" />
                        <p className="text-sm text-medium-grey font-space-grotesk">
                          {client.phone}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-light-grey" />
                        <p className="text-sm text-light-grey font-space-grotesk">
                          NO PHONE
                        </p>
                      </div>
                    )}

                    {client.budget && (
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-medium-grey" />
                        <p className="text-sm text-medium-grey font-space-grotesk">
                          ${client.budget.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {client.address?.city && client.address?.state && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-medium-grey" />
                        <p className="text-sm text-medium-grey font-space-grotesk">
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
                      <Badge className="bg-blue-100 text-blue-700 text-xs font-bold uppercase">
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
                          className="bg-light-grey text-medium-grey text-xs font-bold uppercase"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {client.tags.length > 3 && (
                        <Badge className="bg-light-grey text-medium-grey text-xs font-bold uppercase">
                          +{client.tags.length - 3} MORE
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Missing Information Alert */}
                  {isIncompleteProfile(client) && (
                    <div className="mt-3 p-2 bg-orange-50 border-2 border-orange-200 text-xs text-orange-700 font-space-grotesk uppercase tracking-wide">
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

                  <div className="mt-4 text-xs text-medium-grey font-space-grotesk uppercase tracking-wide">
                    UPDATED: {new Date(client.updatedAt).toLocaleDateString()}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CRMLayout>
  )
}
