'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CalendarDays, DollarSign, FileText, Settings, Eye, Edit, Plus, CheckCircle } from "lucide-react"
import ServiceLineDebugger from './ServiceLineDebugger'

interface ServiceLine {
  id: string
  name: string
  slug: string
  description: string
  color: string
  isActive: boolean
}

interface ServiceContract {
  id: string
  serviceLineId: string
  serviceLine?: ServiceLine
  serviceName: string
  serviceCategory: string
  status: string
  period: string
  contractValue: number
  frequency: string
  notes: string
  isActive: boolean
  isPrimary: boolean
  billingDetails?: any
  seasonalInfo?: any
}

interface ServiceRecord {
  id: string
  serviceLineId: string
  serviceLine?: ServiceLine
  serviceDate: string
  serviceType: string
  serviceArea: string
  completionStatus: string
  notes: string
  amount: number
  billingAmount: number
  billingStatus: string
}

interface BillingRecord {
  id: string
  serviceLineId: string
  serviceLine?: ServiceLine
  invoiceNumber: string
  amount: number
  currency: string
  billingPeriod: string
  billingDate: string
  dueDate?: string
  paidDate?: string
  status: string
  description: string
  metadata?: any
}

interface Client {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  status: string
  serviceContracts: ServiceContract[]
  serviceRecords: ServiceRecord[]
  billingRecords: BillingRecord[]
}

interface ClientServicesBillingProps {
  clientId: string
}

const ClientServicesBilling: React.FC<ClientServicesBillingProps> = ({ clientId }) => {
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'billing'>('overview')
  const [selectedServiceLine, setSelectedServiceLine] = useState<string | null>(null)

  useEffect(() => {
    fetchClientData()
  }, [clientId])

  const fetchClientData = async () => {
    try {
      setLoading(true)
      console.log('Fetching client data for clientId:', clientId)
      
      const response = await fetch(`/api/clients/${clientId}/services-billing`)
      console.log('API Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Client data received:', { 
        id: data.id, 
        name: data.name, 
        serviceContracts: data.serviceContracts?.length,
        serviceRecords: data.serviceRecords?.length,
        billingRecords: data.billingRecords?.length
      })
      
      // Debug service line separation
      console.log('🔍 DEBUG: Service Line Analysis')
      console.log('Service Records:', data.serviceRecords)
      
      const recordsByServiceLine = {}
      data.serviceRecords?.forEach(record => {
        const serviceLineId = record.serviceLineId || 'unknown'
        if (!recordsByServiceLine[serviceLineId]) {
          recordsByServiceLine[serviceLineId] = []
        }
        recordsByServiceLine[serviceLineId].push(record)
      })
      
      console.log('Records grouped by service line:', recordsByServiceLine)
      
      Object.keys(recordsByServiceLine).forEach(serviceLineId => {
        const records = recordsByServiceLine[serviceLineId]
        const serviceLine = records[0]?.serviceLine
        console.log(`📦 ${serviceLine?.name || 'Unknown'} (${serviceLineId}):`)
        console.log(`   Records: ${records.length}`)
        console.log(`   Service Types: ${[...new Set(records.map(r => r.serviceType))].join(', ')}`)
        console.log(`   Color: ${serviceLine?.color || 'undefined'}`)
      })
      
      setClient(data)
    } catch (error) {
      console.error('Error fetching client data:', error)
      console.error('ClientId that failed:', clientId)
      setClient(null)
    } finally {
      setLoading(false)
    }
  }

  const getServiceLineColor = (serviceLine?: ServiceLine) => {
    return serviceLine?.color || '#6B7280'
  }

  const getStatusColor = (status: string) => {
    const statusColors = {
      ACTIVE: 'bg-green-100 text-green-800',
      ONGOING: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      OVERDUE: 'bg-red-100 text-red-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (amount: number, currency = 'CAD') => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA')
  }

  const groupByServiceLine = <T extends { serviceLineId?: string; serviceLine?: ServiceLine }>(items: T[], itemType?: string) => {
    const groups = items.reduce((groups, item) => {
      const serviceLineId = item.serviceLineId || 'unknown'
      if (!groups[serviceLineId]) {
        groups[serviceLineId] = []
      }
      groups[serviceLineId].push(item)
      return groups
    }, {} as Record<string, T[]>)
    
    // Debug grouping
    if (itemType) {
      console.log(`🔍 DEBUG: ${itemType} grouped by service line:`)
      Object.keys(groups).forEach(serviceLineId => {
        const items = groups[serviceLineId]
        const serviceLine = items[0]?.serviceLine
        console.log(`  ${serviceLine?.name || 'Unknown'} (${serviceLineId}): ${items.length} ${itemType}`)
      })
    }
    
    return groups
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!client && !loading) {
    return (
      <div className="text-center p-8">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Client Not Found</h2>
          <p className="text-gray-500 mb-4">Unable to load client data for ID: {clientId}</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
            <h3 className="font-medium text-yellow-800 mb-2">Diagnostic Information:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Client ID: <code className="bg-yellow-100 px-1 rounded">{clientId}</code></li>
              <li>• Check browser console for detailed error logs</li>
              <li>• Verify the client exists in the database</li>
              <li>• Ensure the API endpoint is accessible</li>
            </ul>
          </div>
          <button 
            onClick={fetchClientData} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry Loading
          </button>
        </div>
      </div>
    )
  }

  const serviceLineGroups = {
    contracts: groupByServiceLine(client.serviceContracts, 'contracts'),
    records: groupByServiceLine(client.serviceRecords, 'service records'),
    billing: groupByServiceLine(client.billingRecords, 'billing records')
  }

  // Fix service lines deduplication - use Map to properly deduplicate by ID
  const serviceLineMap = new Map<string, ServiceLine>()
  
  // Add service lines from all sources
  client.serviceContracts.forEach(c => {
    if (c.serviceLine) serviceLineMap.set(c.serviceLine.id, c.serviceLine)
  })
  client.serviceRecords.forEach(r => {
    if (r.serviceLine) serviceLineMap.set(r.serviceLine.id, r.serviceLine)
  })
  client.billingRecords.forEach(b => {
    if (b.serviceLine) serviceLineMap.set(b.serviceLine.id, b.serviceLine)
  })
  
  const serviceLines = Array.from(serviceLineMap.values())
  
  // Debug service lines array
  console.log('🔍 DEBUG: Service Lines Array', serviceLines)
  serviceLines.forEach((serviceLine, index) => {
    console.log(`  ${index + 1}. ${serviceLine.name} (${serviceLine.id}) - Color: ${serviceLine.color}`)
  })

  const totalBillingByServiceLine = serviceLines.reduce((totals, serviceLine) => {
    const billingRecords = serviceLineGroups.billing[serviceLine.id] || []
    const total = billingRecords.reduce((sum, record) => sum + record.amount, 0)
    totals[serviceLine.id] = total
    return totals
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Debug Component - Only shown in development */}
      {process.env.NODE_ENV === 'development' && (
        <ServiceLineDebugger client={client} clientId={clientId} />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
          <p className="text-gray-600">{client.email} • {client.phone}</p>
          <Badge className={getStatusColor(client.status)}>{client.status}</Badge>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit Client
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Service
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'services' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Service History
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'billing' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Billing & Invoices
        </button>
      </div>

      {/* Service Line Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedServiceLine(null)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            selectedServiceLine === null 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Service Lines
        </button>
        {serviceLines.map((serviceLine) => (
          <button
            key={serviceLine.id}
            onClick={() => setSelectedServiceLine(serviceLine.id)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedServiceLine === serviceLine.id
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={{
              backgroundColor: selectedServiceLine === serviceLine.id ? serviceLine.color : undefined
            }}
          >
            {serviceLine.name}
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Service Lines Overview */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold">Service Lines Overview</h2>
            {serviceLines
              .filter(serviceLine => !selectedServiceLine || serviceLine.id === selectedServiceLine)
              .map((serviceLine) => {
                const contracts = serviceLineGroups.contracts[serviceLine.id] || []
                const records = serviceLineGroups.records[serviceLine.id] || []
                const billing = serviceLineGroups.billing[serviceLine.id] || []
                const totalBilled = totalBillingByServiceLine[serviceLine.id] || 0

                return (
                  <Card key={serviceLine.id} className="border-l-4" style={{ borderLeftColor: serviceLine.color }}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{serviceLine.name}</CardTitle>
                        <Badge 
                          variant="secondary"
                          style={{ backgroundColor: `${serviceLine.color}20`, color: serviceLine.color }}
                        >
                          {serviceLine.slug}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{serviceLine.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Active Contracts */}
                      {contracts.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Active Contracts</h4>
                          {contracts.map((contract) => (
                            <div key={contract.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">{contract.serviceName}</p>
                                <p className="text-sm text-gray-600">{contract.period} • {contract.frequency}</p>
                                {contract.isPrimary && (
                                  <Badge variant="outline" className="mt-1">Primary Service</Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(contract.contractValue)}</p>
                                <Badge className={getStatusColor(contract.status)}>{contract.status}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recent Services */}
                      {records.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Recent Services</h4>
                          <div className="space-y-2">
                            {records.slice(0, 3).map((record) => (
                              <div key={record.id} className="flex items-center justify-between text-sm">
                                <div>
                                  <span className="font-medium">{record.serviceType.replace('_', ' ')}</span>
                                  <span className="text-gray-600 ml-2">{formatDate(record.serviceDate)}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span>{formatCurrency(record.amount)}</span>
                                  <Badge className={getStatusColor(record.completionStatus)}>
                                    {record.completionStatus}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Billing Summary */}
                      <div className="pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">Total Billed</span>
                          <span className="text-lg font-semibold" style={{ color: serviceLine.color }}>
                            {formatCurrency(totalBilled)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Active Contracts</span>
                  <span className="font-medium">{client.serviceContracts.filter(c => c.isActive).length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Service Records</span>
                  <span className="font-medium">{client.serviceRecords.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Invoiced</span>
                  <span className="font-medium">
                    {formatCurrency(client.billingRecords.reduce((sum, b) => sum + b.amount, 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-gray-600">Service Lines</span>
                  <span className="font-medium">{serviceLines.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Invoice
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Schedule Service
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Service Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Service History</h2>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Service Record
            </Button>
          </div>
          
          {serviceLines
            .filter(serviceLine => !selectedServiceLine || serviceLine.id === selectedServiceLine)
            .map((serviceLine) => {
              const records = serviceLineGroups.records[serviceLine.id] || []
              
              if (records.length === 0) return null
              
              return (
                <Card key={serviceLine.id} className="border-l-4" style={{ borderLeftColor: serviceLine.color }}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{serviceLine.name}</span>
                      <Badge variant="outline">{records.length} services</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {records.map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{record.serviceType.replace('_', ' ')}</span>
                              <Badge className={getStatusColor(record.completionStatus)}>
                                {record.completionStatus}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{record.serviceArea}</p>
                            <p className="text-sm text-gray-600">{formatDate(record.serviceDate)}</p>
                            {record.notes && (
                              <p className="text-sm text-gray-500 italic">{record.notes}</p>
                            )}
                          </div>
                          <div className="text-right space-y-1">
                            <p className="font-medium">{formatCurrency(record.amount)}</p>
                            <Badge className={getStatusColor(record.billingStatus)}>
                              {record.billingStatus}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Billing & Invoices</h2>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>

          {serviceLines
            .filter(serviceLine => !selectedServiceLine || serviceLine.id === selectedServiceLine)
            .map((serviceLine) => {
              const billingRecords = serviceLineGroups.billing[serviceLine.id] || []
              
              if (billingRecords.length === 0) return null
              
              return (
                <Card key={serviceLine.id} className="border-l-4" style={{ borderLeftColor: serviceLine.color }}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{serviceLine.name}</span>
                      <div className="text-right">
                        <Badge variant="outline">{billingRecords.length} invoices</Badge>
                        <p className="text-sm font-normal text-gray-600 mt-1">
                          Total: {formatCurrency(totalBillingByServiceLine[serviceLine.id] || 0)}
                        </p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {billingRecords.map((billing) => (
                        <div key={billing.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{billing.invoiceNumber}</span>
                              <Badge className={getStatusColor(billing.status)}>
                                {billing.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{billing.description}</p>
                            <p className="text-sm text-gray-600">
                              Billed: {formatDate(billing.billingDate)} • Period: {billing.billingPeriod}
                            </p>
                            {billing.paidDate && (
                              <p className="text-sm text-green-600 flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Paid: {formatDate(billing.paidDate)}
                              </p>
                            )}
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-lg font-semibold">{formatCurrency(billing.amount)}</p>
                            <div className="flex space-x-1">
                              <Button size="sm" variant="outline">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="outline">
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default ClientServicesBilling