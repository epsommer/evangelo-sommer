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
}

const navigationItems = [
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

const Sidebar = ({ activeTab = "clients", setActiveTab, conversationCount = 0, onTitleClick, onCollapseChange }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-hud-background-secondary border-r-2 border-hud-border fixed left-0 top-20 bottom-0 transition-all duration-300 sidebar z-40 overflow-y-auto`}>
      
      
      <nav className={`${isCollapsed ? 'px-2 py-6' : 'p-6'}`}>
        <div className="space-y-1">
          {navigationItems.map(item => {
            const IconComponent = item.icon
            return (
              <button
                key={item.id}
                className={`nav-button w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'space-x-3 px-4'} ${isCollapsed ? 'py-2' : 'py-3'} text-left font-medium uppercase tracking-wide text-sm font-primary transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'text-tactical-gold font-semibold border-l-4 border-tactical-gold' 
                    : 'text-tactical-grey-600 hover:bg-tactical-grey-100 hover:text-tactical-grey-800'
                }`}
                onClick={() => setActiveTab?.(item.id)}
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
            <h3 className="text-xs uppercase tracking-wider font-bold text-tactical-grey-600 mb-4 font-primary">
              SERVICE LINES
            </h3>
          )}
          {isCollapsed && (
            <div className="w-full h-px bg-tactical-grey-300 mb-4"></div>
          )}
          <div className="space-y-1">
            {serviceLines.map(service => {
              const IconComponent = service.icon
              return (
                <button
                  key={service.id}
                  className={`nav-button w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'space-x-3 px-4'} ${isCollapsed ? 'py-2' : 'py-3'} text-left font-medium uppercase tracking-wide text-sm font-primary transition-all duration-200 text-tactical-grey-600 hover:bg-tactical-grey-100 hover:text-tactical-grey-800`}
                  onClick={() => setActiveTab?.(service.id)}
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
        
        {/* Toggle Button - At bottom of sidebar */}
        <div className="mt-6 pt-4 border-t border-tactical-grey-300 flex justify-center">
          <button
            onClick={() => {
              const newState = !isCollapsed
              setIsCollapsed(newState)
              onCollapseChange?.(newState)
            }}
            className="w-6 h-6 flex items-center justify-center text-tactical-grey-600 hover:text-tactical-gold transition-all duration-200 font-hud-ui"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar
