"use client"

import React, { useState } from "react"
import { Users, MessageSquare, Clock, Target, Briefcase, ChevronLeft, ChevronRight, Leaf, Snowflake, Dog, Palette, Home, Receipt, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SidebarProps {
  activeTab?: string
  setActiveTab?: (tab: string) => void
  conversationCount?: number
  onTitleClick?: () => void
  onCollapseChange?: (collapsed: boolean) => void
  mobileMenuOpen?: boolean
  onMobileMenuClose?: () => void
  isScrolled?: boolean
}

const navigationItems = [
  { id: "home", label: "HOME", icon: Home },
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "clients", label: "Clients", icon: Users },
  { id: "conversations", label: "Conversations", icon: MessageSquare },
  { id: "services-billing", label: "Services & Billing", icon: Receipt },
  { id: "time-manager", label: "Time Manager", icon: Clock },
  { id: "goals", label: "Goals", icon: Target },
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
  onMobileMenuClose,
  isScrolled = false
}: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleTabChange = (tab: string) => {
    setActiveTab?.(tab)
    onMobileMenuClose?.() // Close mobile menu when tab is selected
  }

  return (
    <aside className={`
      ${isCollapsed ? 'w-16' : 'w-64'}
      neo-sidebar
      fixed
      left-0
      bottom-0
      transition-all
      duration-300
      z-40
      overflow-y-auto
      ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
      ${isScrolled ? 'top-14' : 'top-20'}
    `}>
      {/* Toggle Button - At top of sidebar - Desktop only */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border p-2 hidden lg:flex justify-end">
        <button
          onClick={() => {
            const newState = !isCollapsed
            setIsCollapsed(newState)
            onCollapseChange?.(newState)
          }}
          className="neo-button-sm w-8 h-8 flex items-center justify-center transition-all duration-200"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className={`${isCollapsed ? 'px-2 py-6' : 'p-6'}`}>
        <div className="space-y-1">
          {navigationItems.map(item => {
            const IconComponent = item.icon
            return (
              <button
                key={item.id}
                className={`neo-nav-button w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'space-x-3 px-4'} ${isCollapsed ? 'py-2' : 'py-3'} text-left font-medium text-sm transition-all duration-200 rounded-lg ${
                  activeTab === item.id
                    ? 'neo-nav-button-active'
                    : ''
                }`}
                onClick={() => handleTabChange(item.id)}
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
                  </>
                )}
              </button>
            )
          })}
        </div>
        
        {/* Service Lines Section */}
        <div className={isCollapsed ? 'mt-4' : 'mt-8'}>
          {!isCollapsed && (
            <h3 className="text-xs font-semibold text-muted-foreground mb-4">
              Service Lines
            </h3>
          )}
          {isCollapsed && (
            <div className="w-full h-px bg-border mb-4"></div>
          )}
          <div className="space-y-1">
            {serviceLines.map(service => {
              const IconComponent = service.icon
              return (
                <button
                  key={service.id}
                  className={`neo-nav-button w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'space-x-3 px-4'} ${isCollapsed ? 'py-2' : 'py-3'} text-left font-medium text-sm transition-all duration-200 rounded-lg`}
                  onClick={() => handleTabChange(service.id)}
                  title={isCollapsed ? service.name : undefined}
                >
                  <div className={`w-3 h-3 ${service.color} ${isCollapsed ? 'mx-auto' : ''}`}></div>
                  {!isCollapsed && (
                    <>
                      <IconComponent className="h-4 w-4" />
                      <span>{service.name}</span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar
