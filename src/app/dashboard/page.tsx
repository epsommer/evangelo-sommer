"use client"

import React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DollarSign, Users, CheckCircle, TrendingUp, Target, Calendar, Clock, Mail, Phone, FileText, Calculator, Receipt, ScrollText, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import CRMLayout from '@/components/CRMLayout'
import DailyPlannerWidget from '@/components/DailyPlannerWidget'
import GoalsWidget from '@/components/GoalsWidget'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAllServices } from '@/lib/service-config'
import { useGoals } from '@/hooks/useGoals'
import { Client } from '@/types/client'
import { getDataColor, getGrowthColor, getCompletionColor, getSimulatedHistoricalData } from '@/lib/data-colors'

const Dashboard = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [allClients, setAllClients] = useState<Client[]>([])
  const services = getAllServices()
  const { statistics, getGoalsByStatus } = useGoals()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients?limit=100')
        if (response.ok) {
          const data = await response.json()
          console.log('📥 Dashboard fetched clients:', data)
          
          // Handle the API response structure
          if (data.success && Array.isArray(data.data)) {
            setAllClients(data.data)
          } else if (Array.isArray(data)) {
            setAllClients(data)
          } else {
            console.error('Unexpected clients data format:', data)
            setAllClients([])
          }
        } else {
          console.error('Failed to fetch clients for dashboard')
          setAllClients([])
        }
      } catch (error) {
        console.error('Error fetching clients:', error)
        setAllClients([])
      }
    }

    fetchClients()
  }, [])

  if (status === "loading") {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-foreground/20 border-t-transparent animate-spin mx-auto mb-4 rounded-full"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </CRMLayout>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  const totalClients = allClients.length
  const activeClients = allClients.filter((c) => c.status === "active").length
  const prospects = allClients.filter((c) => c.status === "prospect").length
  const totalRevenue = allClients.reduce((sum, client) => sum + (client.budget || 0), 0)

  const recentClients = allClients
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  // Get historical data for comparison (in production, this would come from your database)
  const historicalData = getSimulatedHistoricalData()

  // Calculate data-driven colors based on performance
  const revenueColor = getDataColor(totalRevenue, historicalData.previousMonthRevenue)
  const clientsColor = getDataColor(totalClients, historicalData.previousMonthClients)
  const prospectsColor = getDataColor(prospects, historicalData.previousMonthProspects)
  const goalsColor = getCompletionColor(getGoalsByStatus('in-progress').length, statistics.total)
  const growthColor = getGrowthColor(18.2) // 18.2% growth rate

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Dashboard Header */}
        <div className="neo-card p-6 mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground text-sm">
            Welcome back, {session?.user?.email?.split('@')[0]}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="neo-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-muted-foreground">
                Total Revenue
              </span>
              <div className="neo-button-circle w-8 h-8 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className={`text-3xl font-bold ${revenueColor.class} mb-1`} title={revenueColor.description}>
              ${totalRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Pipeline Value
            </div>
          </div>

          <div className="neo-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-muted-foreground">
                Active Clients
              </span>
              <div className="neo-button-circle w-8 h-8 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className={`text-3xl font-bold ${clientsColor.class} mb-1`} title={clientsColor.description}>
              {activeClients}
            </div>
            <div className="text-xs text-muted-foreground">
              of {totalClients} total
            </div>
          </div>

          <div className="neo-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-muted-foreground">
                Prospects
              </span>
              <div className="neo-button-circle w-8 h-8 flex items-center justify-center">
                <CheckCircle className="h-4 w-4" />
              </div>
            </div>
            <div className={`text-3xl font-bold ${prospectsColor.class} mb-1`} title={prospectsColor.description}>
              {prospects}
            </div>
            <div className="text-xs text-muted-foreground">
              Potential Clients
            </div>
          </div>

          <div className="neo-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-muted-foreground">
                Active Goals
              </span>
              <div className="neo-button-circle w-8 h-8 flex items-center justify-center">
                <Target className="h-4 w-4" />
              </div>
            </div>
            <div className={`text-3xl font-bold ${goalsColor.class} mb-1`} title={goalsColor.description}>
              {getGoalsByStatus('in-progress').length}
            </div>
            <div className="text-xs text-muted-foreground">
              of {statistics.total} total
            </div>
          </div>

          <div className="neo-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-muted-foreground">
                Growth Rate
              </span>
              <div className="neo-button-circle w-8 h-8 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className={`text-3xl font-bold ${growthColor.class} mb-1`} title={growthColor.description}>
              +18.2%
            </div>
            <div className="text-xs text-muted-foreground">
              Year Over Year
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {/* Daily Planner Widget - BELONGS ON DASHBOARD */}
          <div className="xl:col-span-1 flex">
            <DailyPlannerWidget onViewAll={() => router.push('/time-manager')} />
          </div>

          {/* Goals Widget */}
          <div className="xl:col-span-1 flex">
            <GoalsWidget onViewAll={() => router.push('/goals')} />
          </div>

          {/* Services & Billing Widget */}
          <div className="xl:col-span-1 flex">
            <div className="neo-card flex flex-col w-full">
              <div className="p-6 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">
                    Services & Billing
                  </h3>
                  <Link href="/services-billing">
                    <button className="neo-button text-xs px-3 py-1">
                      View All
                    </button>
                  </Link>
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <div className="space-y-4">
                  {/* Overview Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center neo-card p-3">
                      <div className="text-2xl font-bold text-green-600">
                        $1,250
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Total Revenue
                      </div>
                    </div>
                    <div className="text-center neo-card p-3">
                      <div className="text-2xl font-bold text-orange-600">
                        3
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Pending Invoices
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      Recent Transactions
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 neo-card">
                        <div className="flex items-center space-x-2">
                          <Receipt className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm text-foreground">REC-001</div>
                            <div className="text-xs text-muted-foreground">Evan Sommer</div>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-green-600">$50</div>
                      </div>

                      <div className="flex items-center justify-between p-3 neo-card">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm text-foreground">INV-001</div>
                            <div className="text-xs text-muted-foreground">Evan Sommer</div>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-orange-600">$150</div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <Link href="/services-billing">
                      <button className="neo-button w-full text-xs py-2 flex items-center justify-start">
                        <ExternalLink className="w-3 h-3 mr-2" />
                        View Full Billing Page
                      </button>
                    </Link>
                    <button className="neo-button w-full text-xs py-2 flex items-center justify-start">
                      <Receipt className="w-3 h-3 mr-2" />
                      Create Receipt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 xl:col-span-1 flex">
            <div className="neo-card flex flex-col w-full">
              <div className="p-6 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">
                    Recent Clients
                  </h3>
                  <button
                    className="neo-button text-xs px-3 py-1"
                    onClick={() => router.push('/clients')}
                  >
                    View All
                  </button>
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                {recentClients.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h4 className="text-lg font-bold text-foreground mb-2">
                      No Clients Yet
                    </h4>
                    <p className="text-muted-foreground mb-4">
                      Start by adding your first client to begin tracking relationships.
                    </p>
                    <button
                      className="neo-button px-6 py-2"
                      onClick={() => router.push('/clients/new')}
                    >
                      Add First Client
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentClients.map(client => {
                      const service = services.find(s => s.id === client.serviceId)
                      return (
                        <div
                          key={client.id}
                          className="neo-card p-4 cursor-pointer transition-all hover:shadow-lg"
                          onClick={() => router.push(`/clients/${client.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="neo-button-circle w-10 h-10 flex items-center justify-center font-bold text-sm">
                                {client.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <div className="font-bold text-foreground">
                                  {client.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {service?.name || 'Unknown Service'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-foreground">
                                ${(client.budget || 0).toLocaleString()}
                              </div>
                              <div className={`text-xs font-semibold ${
                                client.status === 'active' ? 'text-green-600' : 'text-muted-foreground'
                              }`}>
                                {client.status}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Service Performance */}
        <div className="neo-card">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-bold text-foreground">
              Service Line Performance
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map(service => {
                const serviceClients = allClients.filter(c => c.serviceId === service.id)
                const serviceRevenue = serviceClients.reduce((sum, c) => sum + (c.budget || 0), 0)
                const activeServiceClients = serviceClients.filter(c => c.status === 'active').length

                // Data-driven coloring for service performance
                const averageServiceRevenue = totalRevenue / services.length
                const serviceRevenueColor = getDataColor(serviceRevenue, averageServiceRevenue)

                return (
                  <div key={service.id} className="text-center neo-card p-4">
                    <div
                      className="w-4 h-4 mx-auto mb-3 rounded-full"
                      style={{ backgroundColor: service.brand.primaryColor }}
                    ></div>
                    <h4 className="font-bold text-foreground text-sm mb-2">
                      {service.name}
                    </h4>
                    <div className="space-y-1">
                      <p className={`text-lg font-bold ${serviceRevenueColor.class}`} title={serviceRevenueColor.description}>
                        ${serviceRevenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activeServiceClients} active clients
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </CRMLayout>
  )
}

export default Dashboard
