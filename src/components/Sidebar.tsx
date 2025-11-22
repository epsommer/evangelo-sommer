"use client"

import React, { useState, useRef, useEffect } from "react"
import { Users, MessageSquare, Clock, Target, Briefcase, ChevronLeft, ChevronRight, Leaf, Snowflake, Dog, Palette, Receipt, LayoutGrid, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

interface SidebarProps {
  activeTab?: string
  setActiveTab?: (tab: string) => void
  conversationCount?: number
  onTitleClick?: () => void
  onCollapseChange?: (collapsed: boolean) => void
  mobileMenuOpen?: boolean
  onMobileMenuClose?: () => void
}

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "clients", label: "Clients", icon: Users },
  { id: "conversations", label: "Conversations", icon: MessageSquare },
  { id: "testimonials", label: "Testimonials", icon: Star },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "time-manager", label: "Time Manager", icon: Clock },
  { id: "goals", label: "Goals", icon: Target },
  { id: "service-lines", label: "Service Lines", icon: Briefcase },
]

const serviceLines = [
  { id: "woodgreen", name: "WOODGREEN LANDSCAPING", color: "service-landscaping", icon: Leaf, path: "/services/woodgreen" },
  { id: "whiteknight", name: "White Knight Snow Removal", color: "service-snow-removal", icon: Snowflake, path: "/services/whiteknight" },
  { id: "pupawalk", name: "PUPAWALK PET SERVICES", color: "service-hair-cutting", icon: Dog, path: "/services/pupawalk" },
  { id: "creative", name: "Creative Development", color: "service-creative-development", icon: Palette, path: "/services/creative" },
]

const Sidebar = ({
  activeTab = "clients",
  setActiveTab,
  conversationCount = 0,
  onTitleClick,
  onCollapseChange,
  mobileMenuOpen = false,
  onMobileMenuClose
}: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showServiceLinesSubmenu, setShowServiceLinesSubmenu] = useState(false)
  const [serviceLinesButtonRef, setServicesLinesButtonRef] = useState<HTMLButtonElement | null>(null)
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 })
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isDark, setIsDark] = useState(false)

  // Track theme changes for ES monogram styling
  useEffect(() => {
    const updateTheme = () => {
      const theme = localStorage.getItem('color-theme') || 'light'
      const willBeDark = theme === 'true-night' || theme === 'mocha'
      setIsDark(willBeDark)
    }

    updateTheme()

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-color-theme') {
          updateTheme()
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-theme'] })
    window.addEventListener('storage', updateTheme)

    return () => {
      observer.disconnect()
      window.removeEventListener('storage', updateTheme)
    }
  }, [])

  const handleTabChange = (tab: string) => {
    setActiveTab?.(tab)
    onMobileMenuClose?.() // Close mobile menu when tab is selected
  }

  return (
    <>
    <aside className={`
      ${isCollapsed ? 'w-16' : 'w-64'}
      neo-sidebar
      fixed
      left-0
      top-0
      h-screen
      transition-all
      duration-300
      z-[60]
      overflow-y-auto
      ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
    `}>
      {/* Header with ES Logo and Toggle */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border overflow-visible">
        {/* ES Logo - Always visible, smaller when collapsed */}
        <div className={`pt-4 pb-2 overflow-visible transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          <button
            onClick={onTitleClick}
            className="group hover:opacity-80 transition-opacity w-full flex justify-center relative z-10"
          >
            <div
              className={`neomorphic-logo ${isDark ? 'dark-mode' : ''} transition-all duration-300`}
              style={{
                width: isCollapsed ? '40px' : '80px',
                height: isCollapsed ? '40px' : '80px',
                borderRadius: isCollapsed ? '10px' : '20px'
              }}
            >
              <div className={`relative transition-all duration-300 ${isCollapsed ? 'w-5 h-5' : 'w-10 h-10'}`}>
                <Image
                  src="/EvangeloSommer-ES-Monogram.svg"
                  alt="ES Monogram"
                  fill
                  className="object-contain"
                  style={{
                    filter: isDark
                      ? "invert(0.7) saturate(2) hue-rotate(-10deg) brightness(1)"
                      : "invert(0.6) saturate(2) hue-rotate(-10deg) brightness(0.95)",
                  }}
                />
              </div>
            </div>
          </button>
        </div>

        {/* Desktop Toggle Button - Centered when collapsed */}
        <div className={`p-2 hidden lg:flex ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            onClick={() => {
              const newState = !isCollapsed
              setIsCollapsed(newState)
              onCollapseChange?.(newState)
            }}
            className="neo-button-sm w-8 h-8 flex items-center justify-center transition-all duration-200"
            style={isCollapsed ? { margin: 0 } : {}}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <nav className={`${isCollapsed ? 'px-2 py-6' : 'p-6'}`}>
        <div className="space-y-1">
          {navigationItems.map(item => {
            const IconComponent = item.icon
            const isServiceLinesItem = item.id === 'service-lines'

            return (
              <button
                key={item.id}
                ref={isServiceLinesItem ? setServicesLinesButtonRef : undefined}
                className={`neo-nav-button w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'space-x-3 px-4'} ${isCollapsed ? 'py-2' : 'py-3'} text-left font-medium text-sm transition-all duration-200 rounded-lg ${
                  activeTab === item.id || (isServiceLinesItem && ['woodgreen', 'whiteknight', 'pupawalk', 'creative'].includes(activeTab))
                    ? 'neo-nav-button-active'
                    : ''
                }`}
                onClick={() => handleTabChange(item.id)}
                onMouseEnter={() => {
                  if (isServiceLinesItem && !isCollapsed) {
                    if (closeTimeoutRef.current) {
                      clearTimeout(closeTimeoutRef.current)
                      closeTimeoutRef.current = null
                    }
                    if (serviceLinesButtonRef) {
                      const rect = serviceLinesButtonRef.getBoundingClientRect()
                      setSubmenuPosition({
                        top: rect.top,
                        left: rect.right + 8
                      })
                    }
                    setShowServiceLinesSubmenu(true)
                  }
                }}
                onMouseLeave={() => {
                  if (isServiceLinesItem) {
                    closeTimeoutRef.current = setTimeout(() => {
                      setShowServiceLinesSubmenu(false)
                    }, 150)
                  }
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <IconComponent className="h-4 w-4" />
                {!isCollapsed && (
                  <>
                    <span>{item.label}</span>
                    {item.id === "conversations" && conversationCount > 0 && (
                      <Badge className="ml-auto flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 py-0 text-xs font-semibold rounded-full bg-[var(--neomorphic-button-bg)] text-[var(--neomorphic-button-text)] hover:opacity-90 transition-opacity">
                        {conversationCount}
                      </Badge>
                    )}
                    {isServiceLinesItem && <ChevronRight className="ml-auto h-4 w-4" />}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </aside>

    {/* Service Lines Submenu */}
    {showServiceLinesSubmenu && !isCollapsed && (
      <div
        className="fixed z-[9999] py-2 neo-container min-w-[240px]"
        style={{
          top: `${submenuPosition.top}px`,
          left: `${submenuPosition.left}px`
        }}
        onMouseEnter={() => {
          if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current)
            closeTimeoutRef.current = null
          }
        }}
        onMouseLeave={() => {
          setShowServiceLinesSubmenu(false)
        }}
      >
        {serviceLines.map(service => {
          const IconComponent = service.icon
          return (
            <button
              key={service.id}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left font-medium text-sm text-foreground transition-all duration-200 hover:neo-inset rounded-lg"
              onClick={() => {
                handleTabChange(service.id)
                setShowServiceLinesSubmenu(false)
              }}
            >
              <div className={`w-3 h-3 rounded-full ${service.color}`}></div>
              <IconComponent className="h-4 w-4" />
              <span>{service.name}</span>
            </button>
          )
        })}
      </div>
    )}
    </>
  )
}

export default Sidebar
