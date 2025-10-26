"use client";

import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  BarChart3,
  Lightbulb,
  Calendar,
  Receipt,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Conversation, Client, Message } from '../types/client';
import { BillingSuggestion } from '../types/billing';
import SidebarAnalytics from './SidebarAnalytics';
import SidebarInsights from './SidebarInsights';
import SidebarSchedule from './SidebarSchedule';
import SidebarBilling from './SidebarBilling';

export type SidebarTab = 'analytics' | 'insights' | 'schedule' | 'billing';

interface ContextualSidebarProps {
  conversation: Conversation;
  client: Client;
  className?: string;
  onAutoDetails?: (message: Message, suggestion: BillingSuggestion) => void;
  onStateChange?: (isOpen: boolean, width: number) => void;
}

export default function ContextualSidebar({
  conversation,
  client,
  className = "",
  onAutoDetails,
  onStateChange
}: ContextualSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setActiveTab(null);
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  const tabs = [
    {
      id: 'analytics' as SidebarTab,
      icon: BarChart3,
      label: 'Analytics',
      color: 'text-tactical-gold',
      bgColor: 'bg-tactical-gold-muted',
      count: null
    },
    {
      id: 'insights' as SidebarTab,
      icon: Lightbulb,
      label: 'Insights',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      count: conversation.nextActions?.length || 0
    },
    {
      id: 'schedule' as SidebarTab,
      icon: Calendar,
      label: 'Schedule',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      count: null
    },
    {
      id: 'billing' as SidebarTab,
      icon: Receipt,
      label: 'Billing',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      count: null
    }
  ];

  const handleTabClick = (tabId: SidebarTab) => {
    if (activeTab === tabId) {
      setActiveTab(null);
      setIsExpanded(false);
      onStateChange?.(false, 0);
    } else {
      setActiveTab(tabId);
      setIsExpanded(true);
      const width = isMobile ? 384 : 448; // 96 (w-96) or 112 (w-112) in pixels
      onStateChange?.(true, width);
    }
  };

  const handleClose = () => {
    setActiveTab(null);
    setIsExpanded(false);
    onStateChange?.(false, 0);
  };

  const renderTabContent = () => {
    if (!activeTab) return null;

    switch (activeTab) {
      case 'analytics':
        return (
          <SidebarAnalytics
            conversation={conversation}
            client={client}
          />
        );
      case 'insights':
        return (
          <SidebarInsights
            conversation={conversation}
            client={client}
          />
        );
      case 'schedule':
        return (
          <SidebarSchedule
            conversation={conversation}
            client={client}
          />
        );
      case 'billing':
        return (
          <SidebarBilling
            conversation={conversation}
            client={client}
            onAutoDetails={onAutoDetails}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      ref={sidebarRef}
      className={`
        fixed right-0 top-0 h-full z-40 flex
        ${isMobile ? 'w-full' : 'w-auto'}
        ${className}
      `}
    >
      {/* Primary Navigation Sidebar */}
      <div className={`
        bg-white border-l-2 border-hud-border-accent shadow-lg
        ${isMobile ? 'w-16' : 'w-16'}
        ${isMobile && activeTab ? 'shadow-2xl' : ''}
        transition-all duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Logo/Brand Area */}
        <div className="p-4 border-b border-hud-border">
          <div className="w-8 h-8 bg-tactical-gold flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-hud-text-primary" />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-1 py-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  w-full p-3 mb-2 flex flex-col items-center justify-center
                  group relative transition-all duration-200
                  ${isActive ? 
                    `${tab.bgColor} ${tab.color} border-r-4 border-current` : 
                    'text-medium-grey hover:text-hud-text-primary hover:bg-light-grey'
                  }
                `}
                title={tab.label}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? '' : 'group-hover:scale-110'}`} />
                <span className="text-xs font-primary uppercase tracking-wide">
                  {tab.label.slice(0, 3)}
                </span>
                
                {/* Count Badge */}
                {tab.count !== null && tab.count > 0 && (
                  <div className={`
                    absolute -top-1 -right-1 w-5 h-5 rounded-full
                    flex items-center justify-center text-xs font-bold
                    ${isActive ? 'bg-white text-current' : 'bg-tactical-gold text-hud-text-primary'}
                  `}>
                    {tab.count > 99 ? '99+' : tab.count}
                  </div>
                )}

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-current rounded-r-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Collapse Toggle (Desktop Only) */}
        {!isMobile && (
          <div className="p-2 border-t border-hud-border">
            <button
              onClick={() => {
                if (isExpanded) {
                  // Collapsing - close everything
                  setIsExpanded(false);
                  setActiveTab(null);
                  onStateChange?.(false, 0);
                } else {
                  // Expanding - open with last active tab or default to analytics
                  const tabToOpen = activeTab || 'analytics';
                  setActiveTab(tabToOpen as SidebarTab);
                  setIsExpanded(true);
                  const width = isMobile ? 384 : 448;
                  onStateChange?.(true, width);
                }
              }}
              className="w-full p-2 text-medium-grey hover:text-hud-text-primary hover:bg-light-grey transition-all duration-200"
              title={isExpanded ? 'Collapse Panel' : 'Expand Panel'}
            >
              {isExpanded ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Contextual Content Panel */}
      <div className={`
        bg-white border-l border-hud-border shadow-lg
        transition-all duration-300 ease-in-out overflow-hidden
        ${isExpanded && activeTab ?
          (isMobile ? 'w-96' : 'w-[28rem]') :
          'w-0'
        }
        ${isMobile ? 'shadow-2xl' : ''}
      `}>
        {activeTab && (
          <div className="h-full flex flex-col">
            {/* Panel Header */}
            <div className="p-4 border-b border-hud-border bg-hud-background-secondary flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {(() => {
                  const tab = tabs.find(t => t.id === activeTab);
                  if (!tab) return null;
                  const Icon = tab.icon;
                  return (
                    <>
                      <div className={`p-2 ${tab.bgColor} rounded`}>
                        <Icon className={`w-5 h-5 ${tab.color}`} />
                      </div>
                      <div>
                        <h2 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide">
                          {tab.label}
                        </h2>
                        <p className="text-xs text-medium-grey">
                          {client.name}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
              
              <button
                onClick={handleClose}
                className="p-1 text-medium-grey hover:text-hud-text-primary hover:bg-light-grey rounded transition-colors duration-150"
                title="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto">
              {renderTabContent()}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Overlay */}
      {isMobile && activeTab && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 -z-10"
          onClick={handleClose}
        />
      )}
    </div>
  );
}