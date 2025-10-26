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
            <div className="w-12 h-12 border-4 border-hud-border-accent border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-hud-text-secondary font-primary uppercase tracking-wide">LOADING...</p>
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
        <div className="bg-hud-background-secondary p-6 border-b-2 border-hud-border-accent">
          <h1 className="text-3xl font-bold text-hud-text-primary mb-2 font-primary uppercase tracking-wide">
            DASHBOARD OVERVIEW
          </h1>
          <p className="text-hud-text-secondary font-primary uppercase tracking-wider text-sm">
            Welcome back, {session?.user?.email?.split('@')[0]?.toUpperCase()}
          </p>
        </div>

        {/* KPI Cards - BELONGS ON DASHBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="bg-hud-background-primary border-2 border-hud-border widget-terminated-corners">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold uppercase text-hud-text-secondary tracking-wider font-primary">
                  TOTAL REVENUE
                </span>
                <div className="w-6 h-6 bg-tactical-gold flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-hud-text-primary" />
                </div>
              </div>
              <div className={`text-3xl font-bold ${revenueColor.class} mb-1 font-primary`} title={revenueColor.description}>
                ${totalRevenue.toLocaleString()}
              </div>
              <div className="text-xs text-hud-text-secondary uppercase tracking-wider font-primary">
                PIPELINE VALUE
              </div>
            </CardContent>
          </Card>

          <Card className="bg-hud-background-primary border-2 border-hud-border widget-terminated-corners">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold uppercase text-hud-text-secondary tracking-wider font-primary">
                  ACTIVE CLIENTS
                </span>
                <div className="w-6 h-6 bg-tactical-gold flex items-center justify-center">
                  <Users className="h-4 w-4 text-hud-text-primary" />
                </div>
              </div>
              <div className={`text-3xl font-bold ${clientsColor.class} mb-1 font-primary`} title={clientsColor.description}>
                {activeClients}
              </div>
              <div className="text-xs text-hud-text-secondary uppercase tracking-wider font-primary">
                OF {totalClients} TOTAL
              </div>
            </CardContent>
          </Card>

          <Card className="bg-hud-background-primary border-2 border-hud-border widget-terminated-corners">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold uppercase text-hud-text-secondary tracking-wider font-primary">
                  PROSPECTS
                </span>
                <div className="w-6 h-6 bg-tactical-gold flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-hud-text-primary" />
                </div>
              </div>
              <div className={`text-3xl font-bold ${prospectsColor.class} mb-1 font-primary`} title={prospectsColor.description}>
                {prospects}
              </div>
              <div className="text-xs text-hud-text-secondary uppercase tracking-wider font-primary">
                POTENTIAL CLIENTS
              </div>
            </CardContent>
          </Card>

          <Card className="bg-hud-background-primary border-2 border-hud-border widget-terminated-corners">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold uppercase text-hud-text-secondary tracking-wider font-primary">
                  ACTIVE GOALS
                </span>
                <div className="w-6 h-6 bg-tactical-gold flex items-center justify-center">
                  <Target className="h-4 w-4 text-hud-text-primary" />
                </div>
              </div>
              <div className={`text-3xl font-bold ${goalsColor.class} mb-1 font-primary`} title={goalsColor.description}>
                {getGoalsByStatus('in-progress').length}
              </div>
              <div className="text-xs text-hud-text-secondary uppercase tracking-wider font-primary">
                OF {statistics.total} TOTAL
              </div>
            </CardContent>
          </Card>

          <Card className="bg-hud-background-primary border-2 border-hud-border widget-terminated-corners">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold uppercase text-hud-text-secondary tracking-wider font-primary">
                  GROWTH RATE
                </span>
                <div className="w-6 h-6 bg-tactical-gold flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-hud-text-primary" />
                </div>
              </div>
              <div className={`text-3xl font-bold ${growthColor.class} mb-1 font-primary`} title={growthColor.description}>
                +18.2%
              </div>
              <div className="text-xs text-hud-text-secondary uppercase tracking-wider font-primary">
                YEAR OVER YEAR
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Daily Planner Widget - BELONGS ON DASHBOARD */}
          <div className="xl:col-span-1">
            <DailyPlannerWidget onViewAll={() => router.push('/time-manager')} />
          </div>
          
          {/* Goals Widget */}
          <div className="xl:col-span-1">
            <GoalsWidget onViewAll={() => router.push('/goals')} />
          </div>

          {/* Services & Billing Widget */}
          <div className="xl:col-span-1">
            <Card className="bg-hud-background-primary border-2 border-hud-border widget-terminated-corners">
              <CardHeader className="bg-hud-background-secondary border-b border-hud-border p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-primary">
                    Services & Billing
                  </h3>
                  <Link href="/services-billing">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-gold font-bold text-sm uppercase tracking-wide hover:text-gold-dark hover:bg-tactical-gold-light font-primary"
                    >
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Overview Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 font-primary">
                        $1,250
                      </div>
                      <div className="text-xs text-hud-text-secondary uppercase tracking-wide font-primary">
                        Total Revenue
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 font-primary">
                        3
                      </div>
                      <div className="text-xs text-hud-text-secondary uppercase tracking-wide font-primary">
                        Pending Invoices
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-hud-text-primary uppercase tracking-wide font-primary">
                      Recent Transactions
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-hud-background-secondary">
                        <div className="flex items-center space-x-2">
                          <Receipt className="w-4 h-4 text-gold" />
                          <div>
                            <div className="text-sm font-primary text-hud-text-primary">REC-001</div>
                            <div className="text-xs text-hud-text-secondary">Evan Sommer</div>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-green-600">$50</div>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 bg-hud-background-secondary">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-tactical-gold" />
                          <div>
                            <div className="text-sm font-primary text-hud-text-primary">INV-001</div>
                            <div className="text-xs text-hud-text-secondary">Evan Sommer</div>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-orange-600">$150</div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <Link href="/services-billing">
                      <Button size="sm" variant="outline" className="w-full justify-start text-xs">
                        <ExternalLink className="w-3 h-3 mr-2" />
                        View Full Billing Page
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" className="w-full justify-start text-xs">
                      <Receipt className="w-3 h-3 mr-2" />
                      Create Receipt
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 xl:col-span-1">
            <Card className="bg-hud-background-primary border-2 border-hud-border widget-terminated-corners">
              <CardHeader className="bg-hud-background-secondary border-b border-hud-border p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-primary">
                    RECENT CLIENTS
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-gold font-bold text-sm uppercase tracking-wide hover:text-gold-dark hover:bg-tactical-gold-light font-primary"
                    onClick={() => router.push('/clients')}
                  >
                    VIEW ALL
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {recentClients.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gold opacity-50" />
                    <h4 className="text-lg font-bold text-hud-text-primary mb-2 font-primary uppercase">
                      NO CLIENTS YET
                    </h4>
                    <p className="text-hud-text-secondary font-primary mb-4">
                      Start by adding your first client to begin tracking relationships.
                    </p>
                    <Button 
                      className="bg-tactical-gold text-hud-text-primary px-6 py-2 font-bold uppercase tracking-wide hover:bg-tactical-gold-light font-primary"
                      onClick={() => router.push('/clients/new')}
                    >
                      ADD FIRST CLIENT
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentClients.map(client => {
                      const service = services.find(s => s.id === client.serviceId)
                      return (
                        <div 
                          key={client.id} 
                          className="flex items-center justify-between p-4 bg-hud-background-secondary hover:bg-light-grey transition-colors cursor-pointer"
                          onClick={() => router.push(`/clients/${client.id}`)}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-tactical-gold flex items-center justify-center text-hud-text-primary font-bold text-sm font-primary">
                              {client.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-bold text-hud-text-primary font-primary">
                                {client.name}
                              </div>
                              <div className="text-xs text-hud-text-secondary uppercase font-primary">
                                {service?.name || 'Unknown Service'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gold font-primary">
                              ${(client.budget || 0).toLocaleString()}
                            </div>
                            <div className={`text-xs uppercase font-bold font-primary ${
                              client.status === 'active' ? 'text-green-600' : 'text-hud-text-secondary'
                            }`}>
                              {client.status.toLowerCase()}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Service Performance */}
        <Card className="bg-hud-background-primary border-2 border-hud-border widget-terminated-corners">
          <CardHeader className="bg-hud-background-secondary border-b border-hud-border p-6">
            <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-primary">
              SERVICE LINE PERFORMANCE
            </h3>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map(service => {
                const serviceClients = allClients.filter(c => c.serviceId === service.id)
                const serviceRevenue = serviceClients.reduce((sum, c) => sum + (c.budget || 0), 0)
                const activeServiceClients = serviceClients.filter(c => c.status === 'active').length
                
                // Data-driven coloring for service performance
                const averageServiceRevenue = totalRevenue / services.length
                const serviceRevenueColor = getDataColor(serviceRevenue, averageServiceRevenue)
                
                return (
                  <div key={service.id} className="text-center">
                    <div 
                      className="w-4 h-4 mx-auto mb-3"
                      style={{ backgroundColor: service.brand.primaryColor }}
                    ></div>
                    <h4 className="font-bold text-hud-text-primary font-primary uppercase text-sm mb-2">
                      {service.name}
                    </h4>
                    <div className="space-y-1">
                      <p className={`text-lg font-bold ${serviceRevenueColor.class} font-primary`} title={serviceRevenueColor.description}>
                        ${serviceRevenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-hud-text-secondary font-primary">
                        {activeServiceClients} active clients
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </CRMLayout>
  )
}

export default Dashboard
