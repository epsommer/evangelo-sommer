"use client"

import React, { useState } from "react"
import { Users, MessageSquare, Clock, Target, Briefcase, ChevronLeft, ChevronRight, Leaf, Snowflake, Dog, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SidebarProps {
  activeTab?: string
  setActiveTab?: (tab: string) => void
  conversationCount?: number
  onTitleClick?: () => void
}

const navigationItems = [
  { id: "clients", label: "Clients", icon: Users },
  { id: "time-manager", label: "Time Manager", icon: Clock },
  { id: "goals", label: "Goals", icon: Target },
  { id: "conversations", label: "Conversations", icon: MessageSquare },
]

const serviceLines = [
  { id: "woodgreen", name: "WOODGREEN LANDSCAPING", color: "service-landscaping", icon: Leaf, path: "/services/woodgreen" },
  { id: "whiteknight", name: "White Knight Snow Removal", color: "service-snow-removal", icon: Snowflake, path: "/services/whiteknight" },
  { id: "pupawalk", name: "PUPAWALK PET SERVICES", color: "service-hair-cutting", icon: Dog, path: "/services/pupawalk" },
  { id: "creative", name: "Creative Development", color: "service-creative-development", icon: Palette, path: "/services/creative" },
]

const Sidebar = ({ activeTab = "clients", setActiveTab, conversationCount = 0, onTitleClick }: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-off-white border-r-2 border-light-grey h-[calc(100vh-4rem)] transition-all duration-300 relative`}>
      {/* Toggle Button - Better positioned to avoid overlap */}
      <div className="relative">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute z-20 w-8 h-8 bg-gold hover:bg-gold-dark flex items-center justify-center text-dark-grey transition-all duration-200 shadow-sm ${
            isCollapsed 
              ? 'right-2 top-2' /* When collapsed: inside the sidebar */
              : '-right-4 top-4' /* When expanded: outside the sidebar */
          }`}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      
      
      {/* Add top padding when collapsed to avoid overlap */}
      <nav className={`${isCollapsed ? 'pt-12 px-2 pb-2' : 'p-6'}`}>
        <div className={`space-y-1 ${isCollapsed ? 'mt-2' : ''}`}>
          {navigationItems.map(item => {
            const IconComponent = item.icon
            return (
              <button
                key={item.id}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'space-x-3 px-4'} ${isCollapsed ? 'py-2' : 'py-3'} text-left font-medium uppercase tracking-wide text-sm font-space-grotesk transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'bg-gold text-dark-grey font-semibold' 
                    : 'text-medium-grey hover:bg-light-grey hover:text-dark-grey'
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
            <h3 className="text-xs uppercase tracking-wider font-bold text-medium-grey mb-4 font-space-grotesk">
              SERVICE LINES
            </h3>
          )}
          {isCollapsed && (
            <div className="w-full h-px bg-light-grey mb-4"></div>
          )}
          <div className="space-y-1">
            {serviceLines.map(service => {
              const IconComponent = service.icon
              return (
                <button
                  key={service.id}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'space-x-3 px-4'} ${isCollapsed ? 'py-2' : 'py-3'} text-left font-medium uppercase tracking-wide text-sm font-space-grotesk transition-all duration-200 text-medium-grey hover:bg-light-grey hover:text-dark-grey`}
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
      </nav>
    </aside>
  )
}

export default Sidebar
