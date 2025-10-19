"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Mail, Phone, AlertTriangle, Edit, FileText, Calculator, Receipt, ScrollText, MapPin, User, Building } from 'lucide-react'
import CRMLayout from '@/components/CRMLayout'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getServiceById } from '@/lib/service-config'
import { getServiceInfo } from '@/lib/service-constants'
import { MultiServiceManager } from '@/lib/multi-service-utils'
import { Client } from '@/types/client'
import EditClientModal from '@/components/EditClientModal'
import ReceiptModal from '@/components/ReceiptModal'
import InvoiceModal from '@/components/InvoiceModal'
import QuoteModal from '@/components/QuoteModal'
import ClientConversationsSection from '@/components/ClientConversationsSection'

const ClientDetailPage = () => {
  const params = useParams()
  const router = useRouter()
  const { status } = useSession()
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [selectedServiceLine, setSelectedServiceLine] = useState<{id: string, name: string, color: string} | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [billingData, setBillingData] = useState<{totalBilled: number, pendingAmount: number, lastServiceDate: string | null}>({
    totalBilled: 0,
    pendingAmount: 0,
    lastServiceDate: null
  })

  const clientId = params.clientId as string

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    const loadClient = async () => {
      if (!clientId) return
      
      try {
        setIsLoading(true)
        const response = await fetch(`/api/clients/${clientId}`)
        const data = await response.json()

        if (data.success) {
          setClient(data.data)
        } else {
          console.error('Failed to load client:', data.error)
          setClient(null)
        }
      } catch (error) {
        console.error('Error loading client:', error)
        setClient(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadClient()
  }, [clientId])

  const loadTransactions = async () => {
    try {
      const response = await fetch('/api/billing/receipts')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const receiptsData = await response.json()
      const receipts = receiptsData.receipts || receiptsData.data || receiptsData || []
      
      // Filter receipts for this specific client
      const clientReceipts = receipts.filter((receipt: any) => receipt.clientId === clientId)
      setTransactions(clientReceipts)
      
      // Calculate billing data
      const totalBilled = clientReceipts.reduce((sum: number, receipt: any) => sum + (receipt.totalAmount || 0), 0)
      const pendingReceipts = clientReceipts.filter((receipt: any) => receipt.status === 'sent')
      const pendingAmount = pendingReceipts.reduce((sum: number, receipt: any) => sum + (receipt.totalAmount || 0), 0)
      
      // Find last service date
      const sortedReceipts = clientReceipts.sort((a: any, b: any) => 
        new Date(b.serviceDate || b.createdAt).getTime() - new Date(a.serviceDate || a.createdAt).getTime()
      )
      const lastServiceDate = sortedReceipts.length > 0 ? (sortedReceipts[0].serviceDate || sortedReceipts[0].createdAt) : null
      
      setBillingData({
        totalBilled,
        pendingAmount,
        lastServiceDate
      })
    } catch (error) {
      console.error('Error loading transactions:', error)
      setTransactions([])
      setBillingData({ totalBilled: 0, pendingAmount: 0, lastServiceDate: null })
    }
  }

  useEffect(() => {
    if (clientId) {
      loadTransactions()
    }
  }, [clientId])

  const handleClientUpdate = (updatedData: Partial<Client>) => {
    if (client) {
      const updatedClient = { ...client, ...updatedData, updatedAt: new Date().toISOString() }
      setClient(updatedClient)
    }
  }

  const isProfileIncomplete = (client: Client) => {
    return !client.email || !client.phone || !client.address?.street
  }

  const getMissingFields = (client: Client) => {
    const missing = []
    if (!client.email) missing.push('Email')
    if (!client.phone) missing.push('Phone')
    if (!client.address?.street) missing.push('Address')
    return missing
  }

  const getServiceIcon = (serviceId: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      woodgreen: <span className="text-green-600">🌿</span>,
      whiteknight: <span className="text-tactical-gold">❄️</span>,
      pupawalk: <span className="text-purple-600">🐕</span>,
      creative: <span className="text-gold">🎨</span>,
      // Legacy support
      landscaping: <span className="text-green-600">🌿</span>,
      'snow-removal': <span className="text-tactical-gold">❄️</span>,
      'pet-services': <span className="text-purple-600">🐕</span>
    }
    return icons[serviceId] || <span>🔧</span>
  }

  const getServiceName = (serviceId: string) => {
    const serviceInfo = getServiceInfo(serviceId as any)
    return serviceInfo ? serviceInfo.name : serviceId.replace(/[-_]/g, ' ').toUpperCase()
  }

  const getAllClientServices = (client: Client) => {
    return MultiServiceManager.getClientServices(client)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No services yet'
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (status === "loading" || isLoading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-hud-border-accent border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-medium-grey font-space-grotesk uppercase tracking-wide">LOADING CLIENT...</p>
          </div>
        </div>
      </CRMLayout>
    )
  }

  if (!client) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <User className="h-16 w-16 mx-auto mb-4 text-gold opacity-50" />
            <h1 className="text-2xl font-bold text-hud-text-primary mb-2 font-space-grotesk uppercase">
              CLIENT NOT FOUND
            </h1>
            <p className="text-medium-grey font-space-grotesk mb-4">
              The client you're looking for doesn't exist.
            </p>
            <Button 
              className="bg-tactical-gold text-hud-text-primary px-6 py-2 font-bold uppercase tracking-wide hover:bg-tactical-gold-light font-space-grotesk"
              onClick={() => router.push('/clients')}
            >
              BACK TO CLIENTS
            </Button>
          </div>
        </div>
      </CRMLayout>
    )
  }

  const service = getServiceById(client.serviceId)

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Client Header - BELONGS ON CLIENT PAGE */}
        <Card className="bg-white border-2 border-hud-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-tactical-gold flex items-center justify-center text-hud-text-primary font-bold text-xl font-space-grotesk">
                  {client.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-hud-text-primary uppercase tracking-wide font-space-grotesk">
                    {client.name}
                  </h1>
                  <div className="text-medium-grey font-medium font-space-grotesk">
                    {client.company || 'Individual Client'}
                  </div>
                  <div className="flex items-center space-x-4 mt-2">
                    {client.email && (
                      <div className="flex items-center text-sm text-medium-grey font-space-grotesk">
                        <Mail className="h-4 w-4 mr-1" />
                        {client.email}
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center text-sm text-medium-grey font-space-grotesk">
                        <Phone className="h-4 w-4 mr-1" />
                        {client.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={`px-3 py-1 text-xs font-bold uppercase font-space-grotesk ${
                  client.status === 'active' ? 'bg-green-600 text-white' : 'bg-medium-grey text-white'
                }`}>
                  {client.status}
                </Badge>
                <Button 
                  variant="outline"
                  className="px-4 py-2 font-bold uppercase tracking-wide border-hud-border-accent text-gold hover:bg-tactical-gold hover:text-hud-text-primary font-space-grotesk"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  EDIT CLIENT
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Incomplete Profile Warning - BELONGS ON CLIENT PAGE */}
        {isProfileIncomplete(client) && (
          <Card className="bg-tactical-gold-light border-2 border-hud-border-accent">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-gold-dark" />
                <div className="flex-1">
                  <h3 className="font-bold text-hud-text-primary uppercase font-space-grotesk">
                    INCOMPLETE PROFILE
                  </h3>
                  <p className="text-sm text-medium-grey font-space-grotesk">
                    Missing: {getMissingFields(client).join(', ')}
                  </p>
                </div>
                <Button 
                  className="bg-tactical-gold text-hud-text-primary px-4 py-2 font-bold uppercase tracking-wide hover:bg-tactical-gold-dark font-space-grotesk"
                  onClick={() => setShowEditModal(true)}
                >
                  COMPLETE PROFILE
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Client Details - BELONGS ON CLIENT PAGE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border-2 border-hud-border">
            <CardHeader className="bg-hud-background-secondary border-b border-hud-border p-6">
              <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-space-grotesk">
                CONTACT INFORMATION
              </h3>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                    EMAIL
                  </div>
                  <div className="text-hud-text-primary font-space-grotesk">
                    {client.email || 'Not provided'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                    PHONE
                  </div>
                  <div className="text-hud-text-primary font-space-grotesk">
                    {client.phone || 'Not provided'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                    ADDRESS
                  </div>
                  <div className="text-hud-text-primary font-space-grotesk">
                    {client.address?.street || 'Not provided'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                    COMPANY
                  </div>
                  <div className="text-hud-text-primary font-space-grotesk">
                    {client.company || 'Individual'}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-hud-border">
                <div>
                  <div className="text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                    STATUS
                  </div>
                  <Badge className={`px-3 py-1 text-xs font-bold uppercase font-space-grotesk ${
                    client.status === 'active' ? 'bg-green-600 text-white' : 'bg-medium-grey text-white'
                  }`}>
                    {client.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                    BUDGET
                  </div>
                  <div className="text-hud-text-primary font-space-grotesk">
                    {client.budget ? `$${client.budget.toLocaleString()}` : 'Not specified'}
                  </div>
                </div>
              </div>
              
              {client.notes && (
                <div className="mt-6 pt-6 border-t border-hud-border">
                  <div className="text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-space-grotesk">
                    NOTES
                  </div>
                  <p className="text-hud-text-primary font-space-grotesk whitespace-pre-wrap">
                    {client.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-hud-border">
            <CardHeader className="bg-hud-background-secondary border-b border-hud-border p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-space-grotesk">
                  SERVICES & BILLING
                </h3>
                <Button
                  variant="outline" 
                  size="sm"
                  className="text-xs text-gold border-hud-border-accent hover:bg-tactical-gold hover:text-hud-text-primary font-space-grotesk uppercase"
                  onClick={() => {
                    router.push(`/clients/${clientId}/services-billing`)
                  }}
                >
                  View Services & Billing
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {(() => {
                // Group contracts by service line (proper implementation)
                const serviceGroups: { [key: string]: any[] } = {}
                
                if (client.serviceContracts && client.serviceContracts.length > 0) {
                  client.serviceContracts.forEach(contract => {
                    // Use proper service line grouping
                    const serviceLineId = contract.serviceLineId || 'legacy'
                    const serviceLine = contract.serviceLine
                    
                    if (!serviceGroups[serviceLineId]) {
                      serviceGroups[serviceLineId] = {
                        name: serviceLine?.name || (serviceLineId === 'legacy' ? 'Legacy Services' : 'Unknown Service'),
                        color: serviceLine?.color || '#6B7280',
                        contracts: []
                      }
                    }
                    serviceGroups[serviceLineId].contracts.push(contract)
                  })
                }
                
                if (Object.keys(serviceGroups).length === 0) {
                  // If no service contracts but we have transactions, show recent activity
                  if (transactions.length > 0) {
                    return (
                      <div className="space-y-4">
                        <div className="text-center py-4 border-b border-hud-border">
                          <span className="text-medium-grey font-space-grotesk text-sm">No formal service contracts • Showing recent billing activity</span>
                        </div>
                        
                        {/* Recent Activity Summary */}
                        <div className="space-y-3">
                          <div className="text-xs text-medium-grey font-space-grotesk uppercase tracking-wide">
                            Recent Activity
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-medium-grey">Last Service:</span>
                              <span className="text-hud-text-primary">{formatDate(billingData.lastServiceDate)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-medium-grey">Total Billed:</span>
                              <span className="text-hud-text-primary font-medium">{formatCurrency(billingData.totalBilled)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-medium-grey">Pending:</span>
                              <span className="text-gold font-medium">{formatCurrency(billingData.pendingAmount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-medium-grey">Total Receipts:</span>
                              <span className="text-hud-text-primary">{transactions.length}</span>
                            </div>
                          </div>
                        </div>

                        {/* Recent Transactions */}
                        <div className="space-y-3">
                          <div className="text-xs text-medium-grey font-space-grotesk uppercase tracking-wide">
                            Recent Transactions
                          </div>
                          <div className="space-y-2">
                            {transactions.slice(0, 3).map((transaction) => (
                              <div key={transaction.id} className="flex items-center justify-between p-3 bg-hud-background-secondary rounded-lg border border-hud-border">
                                <div>
                                  <div className="text-sm font-medium text-hud-text-primary">{transaction.receiptNumber}</div>
                                  <div className="text-xs text-medium-grey">{formatDate(transaction.serviceDate || transaction.createdAt)}</div>
                                  <div className="text-xs text-medium-grey">{transaction.items?.[0]?.description || 'Service'}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-hud-text-primary">{formatCurrency(transaction.totalAmount)}</div>
                                  <div className={`text-xs px-2 py-1 rounded ${
                                    transaction.status === 'paid' ? 'bg-green-100 text-green-800' :
                                    transaction.status === 'sent' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-tactical-grey-200 text-tactical-grey-700'
                                  }`}>
                                    {transaction.status}
                                  </div>
                                </div>
                              </div>
                            ))}
                            {transactions.length > 3 && (
                              <div className="text-center pt-2">
                                <span className="text-xs text-medium-grey">+{transactions.length - 3} more transactions</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  }
                  
                  // No contracts and no transactions
                  return (
                    <div className="text-center py-6">
                      <span className="text-medium-grey font-space-grotesk">No service contracts or transactions found</span>
                    </div>
                  )
                }
                
                return (
                  <div className="space-y-4">
                    {(!client.email || !client.name) && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <div className="text-xs text-yellow-700 font-space-grotesk">
                            Some document features require complete client information (email, name)
                          </div>
                        </div>
                      </div>
                    )}
                    {Object.entries(serviceGroups).map(([serviceLineId, serviceGroup]) => {
                      const { name: serviceName, color: serviceColor, contracts } = serviceGroup as any
                      return (
                        <div key={serviceLineId} className="border border-hud-border rounded-lg">
                          {/* Service Line Header */}
                          <div 
                            className="border-b p-4"
                            style={{ 
                              backgroundColor: `${serviceColor}20`,
                              borderBottomColor: serviceColor,
                              borderLeftColor: serviceColor,
                              borderLeftWidth: '4px'
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span style={{ color: serviceColor }} className="text-xl">
                                  {serviceLineId === 'whiteknight_snow' ? '❄️' : '🌿'}
                                </span>
                                <h4 className="text-lg font-bold text-hud-text-primary font-space-grotesk uppercase">
                                  {serviceName}
                                </h4>
                              </div>
                              <Badge 
                                className="text-xs font-bold uppercase px-2 py-1"
                                style={{ 
                                  backgroundColor: serviceColor,
                                  color: 'white'
                                }}
                              >
                                {contracts.length} Contract{contracts.length > 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Service Contracts */}
                          <div className="p-4 space-y-3">
                            {contracts.map((contract, index) => {
                              const statusColors = {
                                'ONGOING': 'bg-green-100 text-green-800',
                                'COMPLETED': 'bg-tactical-gold-muted text-tactical-brown-dark',
                                'PAUSED': 'bg-yellow-100 text-yellow-800',
                                'CANCELLED': 'bg-red-100 text-red-800',
                                'SCHEDULED': 'bg-purple-100 text-purple-800'
                              };
                              
                              return (
                                <div key={contract.id} className="border border-hud-border rounded-lg p-3 bg-white">
                                  {/* Contract Info */}
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium text-hud-text-primary font-space-grotesk text-sm">
                                          {contract.serviceCategory}
                                        </span>
                                        {contract.period && (
                                          <span className="text-xs text-medium-grey font-space-grotesk">
                                            ({contract.period})
                                          </span>
                                        )}
                                      </div>
                                      {contract.contractValue && (
                                        <div className="text-xs text-medium-grey font-space-grotesk">
                                          ${contract.contractValue.toLocaleString()}
                                        </div>
                                      )}
                                    </div>
                                    <Badge className={`${statusColors[contract.status]} text-xs font-bold uppercase px-2 py-1`}>
                                      {contract.status}
                                    </Badge>
                                  </div>
                                  
                                  {/* Document Actions */}
                                  <div className="flex items-center justify-between pt-2 border-t border-hud-border">
                                    <div className="text-xs text-medium-grey font-space-grotesk uppercase tracking-wide">
                                      Documents
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 hover:bg-tactical-gold-muted hover:text-tactical-gold"
                                        disabled={!client.email}
                                        onClick={() => {
                                          setSelectedServiceLine({
                                            id: serviceLineId,
                                            name: serviceName,
                                            color: serviceColor
                                          })
                                          setShowInvoiceModal(true)
                                        }}
                                        title="Generate Invoice"
                                      >
                                        <FileText className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 hover:bg-green-50 hover:text-green-600"
                                        onClick={() => {
                                          setSelectedServiceLine({
                                            id: serviceLineId,
                                            name: serviceName,
                                            color: serviceColor
                                          })
                                          setShowQuoteModal(true)
                                        }}
                                        title="Generate Quote"
                                      >
                                        <Calculator className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 hover:bg-purple-50 hover:text-purple-600"
                                        disabled={!client.email}
                                        onClick={() => {
                                          setSelectedServiceLine({
                                            id: serviceLineId,
                                            name: serviceName,
                                            color: serviceColor
                                          })
                                          setShowReceiptModal(true)
                                        }}
                                        title="Generate Receipt"
                                      >
                                        <Receipt className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 hover:bg-tactical-grey-100 hover:text-tactical-grey-500"
                                        title="Statement of Work"
                                      >
                                        <ScrollText className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>


        {/* Client Conversations Section */}
        <ClientConversationsSection clientId={clientId} client={client} />
      </div>

      {/* Modals */}
      <EditClientModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        client={client}
        onSave={handleClientUpdate}
      />

      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false)
          setSelectedServiceLine(null)
        }}
        client={client}
        onReceiptCreated={(receipt) => {
          console.log('Receipt created:', receipt, 'for service line:', selectedServiceLine)
        }}
      />

      <InvoiceModal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false)
          setSelectedServiceLine(null)
        }}
        client={client}
        onInvoiceCreated={(invoice) => {
          console.log('Invoice created:', invoice, 'for service line:', selectedServiceLine)
        }}
      />

      <QuoteModal
        isOpen={showQuoteModal}
        onClose={() => {
          setShowQuoteModal(false)
          setSelectedServiceLine(null)
        }}
        client={client}
        onQuoteCreated={(quote) => {
          console.log('Quote created:', quote, 'for service line:', selectedServiceLine)
        }}
      />
    </CRMLayout>
  )
}

export default ClientDetailPage
