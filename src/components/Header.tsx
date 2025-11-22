"use client"

import React, { useState, useEffect } from "react"
import { Search, Calendar, Clock, User, Settings, LogOut, Command, Menu, Heart, X, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import AccountSettingsModal, { AccountSettings } from "@/components/AccountSettingsModal"
import PreferencesModal, { SystemPreferences } from "@/components/PreferencesModal"
import UserStatusIndicator, { StatusSelector } from "@/components/UserStatusIndicator"
import Image from "next/image"

const CURRENT_VERSION = "v1.2.0"

const deployments = [
  { id: "production", name: "Production", url: "https://evangelosommer.com", status: "active" },
  { id: "staging", name: "Staging", url: "https://staging.evangelosommer.com", status: "active" },
  { id: "development", name: "Development", url: "http://localhost:3001", status: "active" },
]

interface ScheduledService {
  id: string;
  title: string;
  service: string;
  clientName: string;
  scheduledDate: string;
  priority: string;
  status: string;
}

interface HeaderProps {
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
  sidebarCollapsed?: boolean;
}

const Header = ({ onMobileMenuToggle, mobileMenuOpen = false, sidebarCollapsed = false }: HeaderProps) => {
  const router = useRouter();
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([]);
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [customStatus, setCustomStatus] = useState<string>("No status set");
  const [showDeployments, setShowDeployments] = useState(false);
  const [showWordmarkTooltip, setShowWordmarkTooltip] = useState(false);
  const [showVersionTooltip, setShowVersionTooltip] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Track theme changes for ES monogram styling
  useEffect(() => {
    const updateTheme = () => {
      const theme = localStorage.getItem('color-theme') || 'light';
      const willBeDark = theme === 'true-night' || theme === 'mocha';
      setIsDark(willBeDark);
    };

    updateTheme();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-color-theme') {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-theme'] });
    window.addEventListener('storage', updateTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', updateTheme);
    };
  }, []);
  
  // Click outside to close dropdown handler
  useEffect(() => {
    if (showProfileDropdown || showScheduleDropdown) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const clickedInDropdown = target.closest('.modal-tactical') || target.closest('[data-dropdown-trigger]');
        
        if (!clickedInDropdown) {
          setShowScheduleDropdown(false);
          setShowProfileDropdown(false);
        }
      };
      
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showProfileDropdown, showScheduleDropdown]);
  
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Scroll tracking for compact mode
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 100); // Compact after scrolling 100px
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load custom status from localStorage
  useEffect(() => {
    const savedStatus = localStorage.getItem("user-custom-status");
    if (savedStatus) {
      setCustomStatus(savedStatus);
    }
  }, []);


  useEffect(() => {
    try {
      const services = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
      // Get upcoming services (next 7 days)
      const upcoming = services
        .filter((service: ScheduledService) => {
          const serviceDate = new Date(service.scheduledDate);
          const now = new Date();
          const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          return serviceDate >= now && serviceDate <= nextWeek;
        })
        .sort((a: ScheduledService, b: ScheduledService) => 
          new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
        )
        .slice(0, 5);
      setScheduledServices(upcoming);
    } catch (error) {
      console.error('Error loading scheduled services for header:', error);
    }
  }, []);

  const handleAccountSettings = () => {
    console.log('🔧 Account settings clicked - handler called');
    setShowProfileDropdown(false);
    setShowAccountSettings(true);
  };

  const handlePreferences = () => {
    console.log('⚙️ Preferences clicked - handler called');
    setShowProfileDropdown(false);
    setShowPreferences(true);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setShowProfileDropdown(false);

    try {
      // Define admin-only themes
      const adminOnlyThemes = ['mocha', 'overkast', 'gilded-meadow'];
      const currentTheme = localStorage.getItem('color-theme');

      // Reset admin themes to default before sign out
      if (currentTheme && adminOnlyThemes.includes(currentTheme)) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const defaultTheme = prefersDark ? 'true-night' : 'light';

        // Apply the default theme
        localStorage.setItem('color-theme', defaultTheme);
        document.documentElement.classList.remove('mocha-mode', 'overkast-mode', 'gilded-meadow-mode', 'true-night-mode');

        if (defaultTheme === 'true-night') {
          document.documentElement.classList.add('true-night-mode');
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }

        document.documentElement.setAttribute('data-color-theme', defaultTheme);
      }

      // Clear any local data if needed
      const keysToKeep = ['system-preferences', 'color-theme']; // Keep preferences and theme across sessions
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Sign out using NextAuth
      await signOut({
        callbackUrl: '/auth/signin',
        redirect: true
      });
    } catch (error) {
      console.error('Error signing out:', error);
      // Fallback: redirect manually if NextAuth fails
      router.push('/auth/signin');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleAccountSettingsSave = (settings: AccountSettings) => {
    // Save account settings to localStorage or API
    try {
      localStorage.setItem('account-settings', JSON.stringify(settings));
      console.log('Account settings saved:', settings);
    } catch (error) {
      console.error('Error saving account settings:', error);
    }
  };

  const handlePreferencesSave = (preferences: SystemPreferences) => {
    // Apply preferences immediately
    try {
      // Theme application is handled in the PreferencesModal
      console.log('System preferences saved:', preferences);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  return (
    <>
    <header className={`fixed top-0 left-0 right-0 z-50 neo-container flex items-center justify-between px-2 sm:px-4 md:px-8 transition-all duration-300 overflow-visible ${isScrolled ? 'h-12 sm:h-14' : 'h-14 sm:h-20'} ${mobileMenuOpen ? 'lg:opacity-100' : ''} ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
      {/* Grey overlay when sidebar is open on mobile */}
      {mobileMenuOpen && (
        <div className="absolute inset-0 bg-black/30 lg:hidden pointer-events-none transition-opacity duration-200"></div>
      )}
      <div className={`flex items-center space-x-1 sm:space-x-2 md:space-x-8 relative z-[60] transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-30 lg:opacity-100' : 'opacity-100'}`}>
        {/* ES Monogram - Mobile Only */}
        <button
          onClick={() => router.push('/select')}
          className="lg:hidden flex items-center hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className={`neomorphic-logo ${isDark ? 'dark-mode' : ''}`} style={{ width: '32px', height: '32px' }}>
            <div className="relative w-4 h-4">
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

        {/* B.E.C.K.Y. Wordmark - Mobile and Desktop */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <Heart className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 text-pink-500 dark:text-pink-400 flex-shrink-0" />
          <div className="tk-lores-9-wide text-xs sm:text-sm lg:text-lg font-bold text-foreground tracking-wide">
            B.E.C.K.Y.
          </div>
        </button>

        {/* Version - Desktop Only */}
        <button
          className="relative hidden lg:block"
          onClick={() => setShowDeployments(!showDeployments)}
          onMouseEnter={() => setShowVersionTooltip(true)}
          onMouseLeave={() => setShowVersionTooltip(false)}
        >
          <div className="text-[10px] text-muted-foreground cursor-help">
            {CURRENT_VERSION}
          </div>
        </button>
      </div>
      <div className={`flex items-center space-x-1 sm:space-x-2 md:space-x-6 relative z-10 transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-30 lg:opacity-100' : 'opacity-100'}`}>
        <button
          className="neo-button flex items-center px-1.5 sm:px-2 md:px-4 py-1.5 sm:py-2 group"
          onClick={() => {
            // TODO: Implement CommandPalette toggle
            console.log('Command Palette triggered')
          }}
        >
          <Command className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
          <span className="hidden sm:inline text-xs sm:text-sm">Commands</span>
          <kbd className="ml-0.5 sm:ml-1 md:ml-2 inline-flex h-4 sm:h-5 select-none items-center gap-0.5 sm:gap-1 rounded border bg-muted px-1 sm:px-1.5 font-mono text-[9px] sm:text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs hidden lg:inline">⌘</span>K
          </kbd>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative hidden md:block">
          <button
            className="neo-button flex items-center px-4 py-2 relative"
            onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
          >
            <Bell className="h-4 w-4 mr-2" />
            <span className="hidden lg:inline text-sm">Notifications</span>
            {scheduledServices.length > 0 && (
              <div className="ml-2 neo-badge-accent px-2 py-0.5 text-xs rounded-full">
                {scheduledServices.length}
              </div>
            )}
          </button>

          {showScheduleDropdown && (
            <div className="neo-dropdown absolute right-0 top-full mt-2 w-96 z-[60] rounded-xl">
              <div className="p-4 bg-background border-b border-border">
                <h3 className="text-sm font-semibold text-foreground mb-0">
                  Notifications
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Events, reminders, drafts & more
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto bg-background">
                {scheduledServices.length > 0 ? (
                  scheduledServices.map(service => (
                    <div key={service.id} className="neo-card m-2 p-3 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-foreground text-sm font-medium">
                          {service.service}
                        </span>
                        <div className={`px-2 py-1 text-xs rounded-full ${
                          service.priority === 'high' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                          service.priority === 'medium' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                          'bg-green-500/20 text-green-600 dark:text-green-400'
                        }`}>
                          {service.priority.charAt(0).toUpperCase() + service.priority.slice(1)}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2 mb-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {format(new Date(service.scheduledDate), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                        <div className="text-xs">
                          Client: {service.clientName}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <div className="text-center p-4">
                      <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <div className="text-muted-foreground text-sm">
                        No notifications
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        You're all caught up!
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {scheduledServices.length > 0 && (
                <div className="p-4 bg-background border-t border-border">
                  <button
                    onClick={() => {
                      // TODO: Navigate to notifications page
                      setShowScheduleDropdown(false);
                    }}
                    className="neo-button w-full text-xs py-2 flex items-center justify-center"
                  >
                    View All Notifications
                    <Bell className="w-3 h-3 ml-2" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 relative">
          <div className="text-right hidden md:block">
            <div className="text-muted-foreground text-xs">User</div>
            <div className="text-foreground text-sm font-medium">
              E.SOMMER
            </div>
          </div>

          <div className="relative group/avatar">
            <button
              className="neo-button-circle w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 font-bold text-xs sm:text-sm md:text-base relative"
              data-dropdown-trigger
              onClick={() => {
                setShowProfileDropdown(!showProfileDropdown);
              }}
            >
              <span className="relative z-10">ES</span>
              <UserStatusIndicator />
            </button>

            {/* User status tooltip on hover */}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 pointer-events-none z-[9999] px-3 py-1.5 text-xs shadow-lg whitespace-nowrap rounded-lg border"
              style={{
                backgroundColor: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                borderColor: 'hsl(var(--border))'
              }}
            >
              <div className="font-medium">E.SOMMER</div>
              <div className="opacity-70 text-[10px] mt-0.5">
                {customStatus}
              </div>
            </div>
          </div>

          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <div
              className="neo-dropdown absolute right-0 top-full mt-2 w-72 z-[60] rounded-xl"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="p-4 bg-background border-b border-border">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Account Menu
                </h3>
                <div className="text-xs text-muted-foreground">
                  Evangelo Sommer
                </div>
              </div>
              <div className="p-2 space-y-1 bg-background">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAccountSettings();
                  }}
                  className="neo-button-menu w-full flex items-center space-x-3 p-3 rounded-lg"
                >
                  <User className="h-4 w-4" />
                  <span className="font-medium">Account Settings</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreferences();
                  }}
                  className="neo-button-menu w-full flex items-center space-x-3 p-3 rounded-lg"
                >
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">System Preferences</span>
                </button>

                <div className="h-px bg-border my-2"></div>

                {/* Status with Side Dropdown */}
                <StatusSelector />

                <div className="h-px bg-border my-2"></div>

                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="neo-button-menu w-full flex items-center space-x-3 p-3 rounded-lg text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="font-medium">
                    {isSigningOut ? 'Logging out...' : 'Sign Out'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Button - Positioned Outside to Avoid Opacity Overlay */}
      <button
        onClick={onMobileMenuToggle}
        className={`lg:hidden neo-button-sm p-1.5 sm:p-2 transition-all duration-200 relative z-[70] ${
          mobileMenuOpen
            ? 'ring-2 ring-pink-500 dark:ring-pink-400 shadow-lg'
            : ''
        }`}
        aria-label={mobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
      >
        {mobileMenuOpen ? (
          <X className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
        ) : (
          <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
        )}
      </button>

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        onSave={handleAccountSettingsSave}
      />

      {/* Preferences Modal */}
      <PreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        onSave={handlePreferencesSave}
      />

      {/* Deployments Dropdown */}
      {showDeployments && (
        <div className="fixed top-20 left-4 md:left-8 z-[60] neo-container rounded-lg p-2 text-xs min-w-[240px]">
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
      )}
    </header>

    {/* Tooltips rendered outside header to avoid overflow clipping */}
    {showWordmarkTooltip && (
      <div
        className="fixed z-[9999] px-3 py-1.5 text-xs shadow-lg whitespace-nowrap rounded-lg border pointer-events-none"
        style={{
          left: '120px',
          top: '70px',
          backgroundColor: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          borderColor: 'hsl(var(--border))'
        }}
      >
        Business Engagement & Client Knowledge Yield
      </div>
    )}

    {showVersionTooltip && (
      <div
        className="fixed z-[9999] px-3 py-2 text-xs shadow-lg min-w-[240px] rounded-lg border pointer-events-none"
        style={{
          left: '200px',
          top: '70px',
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
    </>
  )
}

export default Header
