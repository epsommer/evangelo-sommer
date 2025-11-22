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
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Conversation, Client, Message } from '../types/client';
import { BillingSuggestion } from '../types/billing';
import SidebarAnalytics from './SidebarAnalytics';
import SidebarInsights from './SidebarInsights';
import SidebarSchedule from './SidebarSchedule';
import SidebarBilling from './SidebarBilling';
import SidebarDraftAI from './SidebarDraftAI';
import MasterTimelineDraftAI from './MasterTimelineDraftAI';

export type SidebarTab = 'analytics' | 'insights' | 'schedule' | 'billing' | 'draft';

interface ContextualSidebarProps {
  conversation: Conversation;
  client: Client;
  conversationId: string;
  selectedMessageId?: string | null;
  onSelectMessage?: (messageId: string | null) => void;
  className?: string;
  onAutoDetails?: (message: Message, suggestion: BillingSuggestion) => void;
  onStateChange?: (isOpen: boolean, width: number) => void;
  // Master timeline specific props
  isMasterTimeline?: boolean;
  allConversations?: Conversation[];
  allMessages?: (Message & { conversationId: string; conversationTitle: string })[];
  selectedMessage?: (Message & { conversationId: string }) | null;
  onRefresh?: () => void;
}

export default function ContextualSidebar({
  conversation,
  client,
  conversationId,
  selectedMessageId,
  onSelectMessage,
  className = "",
  onAutoDetails,
  onStateChange,
  isMasterTimeline = false,
  allConversations = [],
  allMessages = [],
  selectedMessage,
  onRefresh
}: ContextualSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(80); // 20 * 4 = 80px (h-20)
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Track header height based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      // Header is h-20 (80px) initially, h-14 (56px) when scrolled > 100px
      setHeaderHeight(scrollY > 100 ? 56 : 80);
    };

    handleScroll(); // Set initial value
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      id: 'draft' as SidebarTab,
      icon: Sparkles,
      label: 'Draft AI',
      color: 'text-[var(--neomorphic-accent)]',
      bgColor: 'bg-[var(--neomorphic-accent)]/10',
      count: null
    },
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
      case 'draft':
        // Use MasterTimelineDraftAI for master timeline, otherwise use regular SidebarDraftAI
        if (isMasterTimeline) {
          return (
            <MasterTimelineDraftAI
              conversations={allConversations}
              allMessages={allMessages}
              client={client}
              selectedMessage={selectedMessage}
              onMessageSent={() => {
                onRefresh?.();
              }}
            />
          );
        }
        return (
          <SidebarDraftAI
            conversation={conversation}
            client={client}
            conversationId={conversationId}
            selectedMessageId={selectedMessageId}
            onSelectMessage={onSelectMessage}
          />
        );
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
        fixed right-0 z-40 flex transition-all duration-300
        ${isMobile ? 'w-full' : 'w-auto'}
        ${className}
      `}
      style={{
        top: `${headerHeight}px`,
        height: `calc(100vh - ${headerHeight}px)`
      }}
    >
      {/* Primary Navigation Sidebar */}
      <div className={`
        neo-sidebar
        ${isMobile ? 'w-16' : 'w-16'}
        ${isMobile && activeTab ? 'shadow-2xl' : ''}
        transition-all duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Logo/Brand Area */}
        <div className="p-4 border-b border-b-[var(--neomorphic-dark-shadow)]">
          <div className="w-8 h-8 neo-button-circle flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[var(--neomorphic-text)]" />
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
                    'neo-nav-button-active border-r-4 border-[var(--neomorphic-accent)]' :
                    'neo-nav-button'
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
                    ${isActive ? 'neo-badge-accent' : 'neo-badge'}
                  `}>
                    {tab.count > 99 ? '99+' : tab.count}
                  </div>
                )}

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-[var(--neomorphic-accent)] rounded-r-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Collapse Toggle (Desktop Only) */}
        {!isMobile && (
          <div className="p-2 border-t border-t-[var(--neomorphic-dark-shadow)]">
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
              className="neo-button-sm w-full p-2 transition-all duration-200"
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
        neo-container border-l border-l-[var(--neomorphic-dark-shadow)]
        bg-[var(--neomorphic-bg)]
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
            <div className="p-4 border-b border-b-[var(--neomorphic-dark-shadow)] bg-[var(--neomorphic-bg)] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {(() => {
                  const tab = tabs.find(t => t.id === activeTab);
                  if (!tab) return null;
                  const Icon = tab.icon;
                  return (
                    <>
                      <div className="neo-button-circle w-10 h-10 p-2 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[var(--neomorphic-text)]" />
                      </div>
                      <div>
                        <h2 className="font-primary font-bold text-[var(--neomorphic-text)] uppercase tracking-wide">
                          {tab.label}
                        </h2>
                        <p className="text-xs text-[var(--neomorphic-icon)]">
                          {client.name}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              <button
                onClick={handleClose}
                className="neo-button-sm p-2 transition-colors duration-150"
                title="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto bg-[var(--neomorphic-bg)]">
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