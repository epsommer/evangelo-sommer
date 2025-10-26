"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Header from './Header'
import Sidebar from './Sidebar'

interface CRMLayoutProps {
  children: React.ReactNode
}

const CRMLayout: React.FC<CRMLayoutProps> = ({ children }) => {
  const router = useRouter()
  const pathname = usePathname()
  const [conversationCount, setConversationCount] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const getCurrentPage = () => {
    if (pathname === '/dashboard') return 'dashboard'
    if (pathname?.includes('/clients')) return 'clients'
    if (pathname?.includes('/conversations')) return 'conversations'
    if (pathname?.includes('/services-billing')) return 'services-billing'
    if (pathname?.includes('/time-manager')) return 'time-manager'
    if (pathname?.includes('/goals')) return 'goals'
    if (pathname?.includes('/services/woodgreen') || pathname?.includes('/services/landscaping')) return 'woodgreen'
    if (pathname?.includes('/services/whiteknight') || pathname?.includes('/services/snow-removal')) return 'whiteknight'
    if (pathname?.includes('/services/pupawalk') || pathname?.includes('/services/pet-services')) return 'pupawalk'
    if (pathname?.includes('/services/creative')) return 'creative'
    return 'dashboard'
  }

  const currentPage = getCurrentPage()

  // Load conversation count for sidebar from database API
  useEffect(() => {
    const fetchConversationCount = async () => {
      try {
        const response = await fetch('/api/conversations')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setConversationCount(data.data.length)
          } else {
            // Fallback if API structure is different
            const totalCount = data.total || 0
            setConversationCount(totalCount)
          }
        } else {
          console.warn('Failed to fetch conversations for count')
          setConversationCount(0)
        }
      } catch (error) {
        console.error('Error loading conversation count:', error)
        setConversationCount(0)
      }
    }

    fetchConversationCount()
  }, [pathname]) // Refresh when pathname changes

  const handleTabChange = (tab: string) => {
    const routes = {
      'dashboard': '/dashboard',
      'clients': '/clients',
      'conversations': '/conversations',
      'services-billing': '/services-billing',
      'time-manager': '/time-manager',
      'goals': '/goals',
      'woodgreen': '/services/woodgreen',
      'whiteknight': '/services/whiteknight',
      'pupawalk': '/services/pupawalk',
      'creative': '/services/creative'
    } as const
    
    const path = routes[tab as keyof typeof routes] || '/dashboard'
    router.push(path)
  }

  const handleTitleClick = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-hud-background-primary relative">
      <Header />
      <Sidebar 
        activeTab={currentPage}
        setActiveTab={handleTabChange}
        conversationCount={conversationCount}
        onTitleClick={handleTitleClick}
        onCollapseChange={setSidebarCollapsed}
      />
      <main className={`pt-20 bg-hud-background-primary min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} relative z-10`}>
        {children}
      </main>
    </div>
  )
}

export default CRMLayout
