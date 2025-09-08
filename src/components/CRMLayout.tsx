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

  const getCurrentPage = () => {
    if (pathname?.includes('/clients')) return 'clients'
    if (pathname?.includes('/time-manager')) return 'time-manager'
    if (pathname?.includes('/goals')) return 'goals'
    if (pathname?.includes('/conversations')) return 'conversations'
    if (pathname?.includes('/services/woodgreen') || pathname?.includes('/services/landscaping')) return 'woodgreen'
    if (pathname?.includes('/services/whiteknight') || pathname?.includes('/services/snow-removal')) return 'whiteknight'
    if (pathname?.includes('/services/pupawalk') || pathname?.includes('/services/pet-services')) return 'pupawalk'
    if (pathname?.includes('/services/creative')) return 'creative'
    return 'clients'
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
      'clients': '/clients',
      'time-manager': '/time-manager',
      'goals': '/goals',
      'conversations': '/conversations',
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
    <div className="min-h-screen bg-white">
      <Header />
      <div className="flex">
        <Sidebar 
          activeTab={currentPage}
          setActiveTab={handleTabChange}
          conversationCount={conversationCount}
          onTitleClick={handleTitleClick}
        />
        <main className="flex-1 bg-white">
          {children}
        </main>
      </div>
    </div>
  )
}

export default CRMLayout
