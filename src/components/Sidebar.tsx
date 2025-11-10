"use client"

import React, { useState, useRef } from "react"
import { Users, MessageSquare, Clock, Target, Briefcase, ChevronLeft, ChevronRight, Leaf, Snowflake, Dog, Palette, Home, Receipt, LayoutGrid, Heart, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const CURRENT_VERSION = "v1.2.0"

const deployments = [
  { id: "production", name: "Production", url: "https://evangelosommer.com", status: "active" },
  { id: "staging", name: "Staging", url: "https://staging.evangelosommer.com", status: "active" },
  { id: "development", name: "Development", url: "http://localhost:3001", status: "active" },
]

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
  { id: "home", label: "HOME", icon: Home },
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "clients", label: "Clients", icon: Users },
  { id: "conversations", label: "Conversations", icon: MessageSquare },
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
  const [showDeployments, setShowDeployments] = useState(false)
  const [showWordmarkTooltip, setShowWordmarkTooltip] = useState(false)
  const [showVersionTooltip, setShowVersionTooltip] = useState(false)
  const [showServiceLinesSubmenu, setShowServiceLinesSubmenu] = useState(false)
  const [serviceLinesButtonRef, setServicesLinesButtonRef] = useState<HTMLButtonElement | null>(null)
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 })
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
      bottom-0
      transition-all
      duration-300
      z-[60]
      overflow-y-auto
      ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
    `}>
      {/* Header with B.E.C.K.Y. Wordmark and Toggle */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border overflow-visible">
        {/* B.E.C.K.Y. Wordmark - Show differently based on collapsed state */}
        <div className="px-4 pt-4 pb-2 overflow-visible">
          {isCollapsed ? (
            /* Heart icon only when collapsed */
            <div className="flex justify-center">
              <button
                onClick={() => setIsCollapsed(false)}
                className="w-10 h-10 flex items-center justify-center"
                title="Business Engagement & Client Knowledge Yield"
              >
                <Heart className="h-6 w-6 text-pink-500 dark:text-pink-400" />
              </button>
            </div>
          ) : (
            /* Full wordmark when expanded */
            <div className="relative overflow-visible">
              <button
                onClick={onTitleClick}
                onMouseEnter={() => setShowWordmarkTooltip(true)}
                onMouseLeave={() => setShowWordmarkTooltip(false)}
                className="group w-full text-left"
              >
                <div className="flex items-center space-x-2">
                  <Heart className="h-6 w-6 text-pink-500 dark:text-pink-400 flex-shrink-0" />
                  <div className="tk-lores-9-wide text-2xl font-bold text-foreground tracking-wide max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                    B.E.C.K.Y.
                  </div>
                </div>
              </button>

              {/* Version with deployment info tooltip */}
              <button
                className="relative ml-8 mt-1"
                onClick={() => setShowDeployments(!showDeployments)}
                onMouseEnter={() => setShowVersionTooltip(true)}
                onMouseLeave={() => setShowVersionTooltip(false)}
              >
                <div className="text-[10px] text-muted-foreground cursor-help">
                  {CURRENT_VERSION}
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Deployments Dropdown */}
        {showDeployments && !isCollapsed && (
          <div className="px-4 pb-2">
            <div className="neo-container rounded-lg p-2 text-xs">
              <div className="font-semibold text-foreground mb-2">Deployments</div>
              {deployments.map((deployment) => (
                <a
                  key={deployment.id}
                  href={deployment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2 rounded hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{deployment.name}</span>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  </div>
                  <div className="text-muted-foreground text-[10px] mt-0.5 truncate">{deployment.url}</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Toggle Button - Centered when collapsed */}
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
                      <Badge className="ml-auto h-5 w-5 p-0 text-xs bg-red-600 text-white">
                        {conversationCount}
                      </Badge>
                    )}
                    {isServiceLinesItem && <ChevronDown className="ml-auto h-4 w-4" />}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </aside>

    {/* Tooltips rendered outside sidebar to avoid overflow clipping */}
    {showWordmarkTooltip && !isCollapsed && (
      <div
        className="fixed z-[9999] px-3 py-1.5 text-xs shadow-lg whitespace-nowrap rounded-lg border pointer-events-none"
        style={{
          left: '280px',
          top: '50px',
          backgroundColor: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          borderColor: 'hsl(var(--border))'
        }}
      >
        Business Engagement & Client Knowledge Yield
      </div>
    )}

    {showVersionTooltip && !isCollapsed && (
      <div
        className="fixed z-[9999] px-3 py-2 text-xs shadow-lg min-w-[240px] rounded-lg border pointer-events-none"
        style={{
          left: '280px',
          top: '80px',
          backgroundColor: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          borderColor: 'hsl(var(--border))'
        }}
      >
        <div className="font-semibold mb-2">Version History</div>
        {deployments.map((deployment) => (
          <div key={deployment.id} className="mb-1.5 last:mb-0">
            <div className="flex items-center justify-between">
              <span className="font-medium">{deployment.name}</span>
              <span className="text-[10px] opacity-70">{CURRENT_VERSION}</span>
            </div>
            <div className="text-[10px] opacity-70 truncate">{deployment.url}</div>
          </div>
        ))}
      </div>
    )}

    {/* Service Lines Submenu */}
    {showServiceLinesSubmenu && !isCollapsed && (
      <div
        className="fixed z-[9999] py-2 shadow-lg min-w-[240px] rounded-lg border"
        style={{
          top: `${submenuPosition.top}px`,
          left: `${submenuPosition.left}px`,
          backgroundColor: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          borderColor: 'hsl(var(--border))'
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
              className="w-full flex items-center space-x-3 px-4 py-3 text-left font-medium text-sm transition-all duration-200 hover:bg-muted"
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
