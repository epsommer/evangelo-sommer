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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Scroll tracking for compact mode
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 100); // Compact after scrolling 100px
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [])

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
      'home': '/select',
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

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  // Close mobile menu when pathname changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--neomorphic-bg)' }}>
      <Header onMobileMenuToggle={toggleMobileMenu} />

      {/* Backdrop overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      <Sidebar
        activeTab={currentPage}
        setActiveTab={handleTabChange}
        conversationCount={conversationCount}
        onTitleClick={handleTitleClick}
        onCollapseChange={setSidebarCollapsed}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuClose={closeMobileMenu}
      />
      <main className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'} relative z-10 ${isScrolled ? 'pt-14' : 'pt-20'}`} style={{ backgroundColor: 'var(--neomorphic-bg)' }}>
        {children}
      </main>
    </div>
  )
}

export default CRMLayout
