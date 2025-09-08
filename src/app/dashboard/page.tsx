"use client"

import React from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DollarSign, Users, CheckCircle, TrendingUp, Target, Calendar, Clock, Mail, Phone, FileText, Calculator, Receipt, ScrollText } from 'lucide-react'
import CRMLayout from '@/components/CRMLayout'
import DailyPlannerWidget from '@/components/DailyPlannerWidget'
import GoalsWidget from '@/components/GoalsWidget'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getAllServices } from '@/lib/service-config'
import { useGoals } from '@/hooks/useGoals'
import { Client } from '@/types/client'

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
            <div className="w-12 h-12 border-4 border-gold border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-medium-grey font-space-grotesk uppercase tracking-wide">LOADING...</p>
          </div>
        </div>
      </CRMLayout>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  const totalClients = allClients.length
  const activeClients = allClients.filter((c) => c.status === "ACTIVE").length
  const prospects = allClients.filter((c) => c.status === "PROSPECT").length
  const totalRevenue = allClients.reduce((sum, client) => sum + (client.budget || 0), 0)

  const recentClients = allClients
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Dashboard Header */}
        <div className="bg-off-white p-6 border-b-2 border-gold">
          <h1 className="text-3xl font-bold text-dark-grey mb-2 font-space-grotesk uppercase tracking-wide">
            DASHBOARD OVERVIEW
          </h1>
          <p className="text-medium-grey font-space-grotesk uppercase tracking-wider text-sm">
            Welcome back, {session?.user?.email?.split('@')[0]?.toUpperCase()}
          </p>
        </div>

        {/* KPI Cards - BELONGS ON DASHBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="bg-white border-2 border-light-grey">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk">
                  TOTAL REVENUE
                </span>
                <div className="w-6 h-6 bg-gold flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-dark-grey" />
                </div>
              </div>
              <div className="text-3xl font-bold text-dark-grey mb-1 font-space-grotesk">
                ${totalRevenue.toLocaleString()}
              </div>
              <div className="text-xs text-medium-grey uppercase tracking-wider font-space-grotesk">
                PIPELINE VALUE
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-light-grey">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk">
                  ACTIVE CLIENTS
                </span>
                <div className="w-6 h-6 bg-gold flex items-center justify-center">
                  <Users className="h-4 w-4 text-dark-grey" />
                </div>
              </div>
              <div className="text-3xl font-bold text-dark-grey mb-1 font-space-grotesk">
                {activeClients}
              </div>
              <div className="text-xs text-medium-grey uppercase tracking-wider font-space-grotesk">
                OF {totalClients} TOTAL
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-light-grey">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk">
                  PROSPECTS
                </span>
                <div className="w-6 h-6 bg-gold flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-dark-grey" />
                </div>
              </div>
              <div className="text-3xl font-bold text-dark-grey mb-1 font-space-grotesk">
                {prospects}
              </div>
              <div className="text-xs text-medium-grey uppercase tracking-wider font-space-grotesk">
                POTENTIAL CLIENTS
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-light-grey">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk">
                  ACTIVE GOALS
                </span>
                <div className="w-6 h-6 bg-gold flex items-center justify-center">
                  <Target className="h-4 w-4 text-dark-grey" />
                </div>
              </div>
              <div className="text-3xl font-bold text-dark-grey mb-1 font-space-grotesk">
                {getGoalsByStatus('in-progress').length}
              </div>
              <div className="text-xs text-medium-grey uppercase tracking-wider font-space-grotesk">
                OF {statistics.total} TOTAL
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-light-grey">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk">
                  GROWTH RATE
                </span>
                <div className="w-6 h-6 bg-gold flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-dark-grey" />
                </div>
              </div>
              <div className="text-3xl font-bold text-dark-grey mb-1 font-space-grotesk">
                +18.2%
              </div>
              <div className="text-xs text-medium-grey uppercase tracking-wider font-space-grotesk">
                YEAR OVER YEAR
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Daily Planner Widget - BELONGS ON DASHBOARD */}
          <div className="xl:col-span-1">
            <DailyPlannerWidget onViewAll={() => router.push('/time-manager')} />
          </div>
          
          {/* Goals Widget */}
          <div className="xl:col-span-1">
            <GoalsWidget onViewAll={() => router.push('/goals')} />
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 xl:col-span-1">
            <Card className="bg-white border-2 border-light-grey">
              <CardHeader className="bg-off-white border-b border-light-grey p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-dark-grey uppercase tracking-wide font-space-grotesk">
                    RECENT CLIENTS
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-gold font-bold text-sm uppercase tracking-wide hover:text-gold-dark hover:bg-gold-light font-space-grotesk"
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
                    <h4 className="text-lg font-bold text-dark-grey mb-2 font-space-grotesk uppercase">
                      NO CLIENTS YET
                    </h4>
                    <p className="text-medium-grey font-space-grotesk mb-4">
                      Start by adding your first client to begin tracking relationships.
                    </p>
                    <Button 
                      className="bg-gold text-dark-grey px-6 py-2 font-bold uppercase tracking-wide hover:bg-gold-light font-space-grotesk"
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
                          className="flex items-center justify-between p-4 bg-off-white hover:bg-light-grey transition-colors cursor-pointer"
                          onClick={() => router.push(`/clients/${client.id}`)}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gold flex items-center justify-center text-dark-grey font-bold text-sm font-space-grotesk">
                              {client.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-bold text-dark-grey font-space-grotesk">
                                {client.name}
                              </div>
                              <div className="text-xs text-medium-grey uppercase font-space-grotesk">
                                {service?.name || 'Unknown Service'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gold font-space-grotesk">
                              ${(client.budget || 0).toLocaleString()}
                            </div>
                            <div className={`text-xs uppercase font-bold font-space-grotesk ${
                              client.status === 'ACTIVE' ? 'text-green-600' : 'text-medium-grey'
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
        <Card className="bg-white border-2 border-light-grey">
          <CardHeader className="bg-off-white border-b border-light-grey p-6">
            <h3 className="text-lg font-bold text-dark-grey uppercase tracking-wide font-space-grotesk">
              SERVICE LINE PERFORMANCE
            </h3>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map(service => {
                const serviceClients = allClients.filter(c => c.serviceId === service.id)
                const serviceRevenue = serviceClients.reduce((sum, c) => sum + (c.budget || 0), 0)
                const activeServiceClients = serviceClients.filter(c => c.status === 'ACTIVE').length
                
                return (
                  <div key={service.id} className="text-center">
                    <div 
                      className="w-4 h-4 mx-auto mb-3"
                      style={{ backgroundColor: service.brand.primaryColor }}
                    ></div>
                    <h4 className="font-bold text-dark-grey font-space-grotesk uppercase text-sm mb-2">
                      {service.name}
                    </h4>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-gold font-space-grotesk">
                        ${serviceRevenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-medium-grey font-space-grotesk">
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
