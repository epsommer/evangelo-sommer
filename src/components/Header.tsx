"use client"

import React, { useState, useEffect } from "react"
import { Search, Calendar, Clock, User, Settings, LogOut, Command, Activity, Menu, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import AccountSettingsModal, { AccountSettings } from "@/components/AccountSettingsModal"
import PreferencesModal, { SystemPreferences } from "@/components/PreferencesModal"
import UserStatusIndicator from "@/components/UserStatusIndicator"

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
}

const Header = ({ onMobileMenuToggle }: HeaderProps) => {
  const router = useRouter();
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([]);
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
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
      // Clear any local data if needed
      const keysToKeep = ['system-preferences']; // Keep preferences across sessions
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
    <header className={`fixed top-0 left-0 right-0 z-50 neo-container flex items-center justify-between px-4 md:px-8 transition-all duration-300 ${isScrolled ? 'h-14' : 'h-20'}`}>
      <div className="flex items-center space-x-2 md:space-x-8 relative">
        {/* Mobile Menu Button */}
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden neo-button-sm p-2 transition-colors"
          aria-label="Toggle mobile menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className={`flex items-center space-x-2 md:space-x-3 tracking-wide transition-all duration-300 group bg-transparent border-none ${isScrolled ? 'text-base md:text-lg' : 'text-lg md:text-2xl'}`}
        >
          <Heart className={`text-pink-500 dark:text-pink-400 group-hover:scale-110 transition-all duration-300 ${isScrolled ? 'w-5 h-5 md:w-6 md:h-6' : 'w-6 h-6 md:w-8 md:h-8'}`} />
          <div className="hidden sm:block">
            <div className="text-2xl md:text-3xl font-bold text-foreground tk-lores-9-wide">B.E.C.K.Y.</div>
          </div>
        </button>

        <div className={`neo-badge px-3 py-1 transition-all duration-300 hidden md:flex ${isScrolled ? 'scale-75' : 'scale-100'}`}>
          <Activity className={`text-foreground/70 transition-all duration-300 mr-2 ${isScrolled ? 'w-3 h-3' : 'w-4 h-4'}`} />
          <div>
            <div className={`text-foreground/60 transition-all duration-300 ${isScrolled ? 'text-[0.625rem]' : 'text-xs'}`}>CRM v2.1</div>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2 md:space-x-6 relative z-10">
        <button className="neo-button hidden md:flex items-center px-4 py-2">
          <Search className="h-4 w-4 mr-2" />
          <span className="text-sm">Search</span>
        </button>

        {/* Schedule Dropdown */}
        <div className="relative hidden md:block">
          <button
            className="neo-button flex items-center px-4 py-2 relative"
            onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            <span className="hidden lg:inline text-sm">Schedule</span>
            {scheduledServices.length > 0 && (
              <div className="ml-2 neo-badge-accent px-2 py-0.5 text-xs rounded-full">
                {scheduledServices.length}
              </div>
            )}
          </button>

          {showScheduleDropdown && (
            <div className="neo-dropdown absolute right-0 top-full mt-2 w-96 z-50 overflow-hidden rounded-xl">
              <div className="p-4 bg-background border-b border-border">
                <h3 className="text-sm font-semibold text-foreground mb-0">
                  Upcoming Schedule
                </h3>
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
                      <div className="text-muted-foreground text-sm">
                        No scheduled services
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {scheduledServices.length > 0 && (
                <div className="p-4 bg-background border-t border-border">
                  <button
                    onClick={() => {
                      router.push('/time-manager');
                      setShowScheduleDropdown(false);
                    }}
                    className="neo-button w-full text-xs py-2 flex items-center justify-center"
                  >
                    View All
                    <Command className="w-3 h-3 ml-2" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 md:space-x-4 relative">
          <div className="text-right hidden md:block">
            <div className="text-muted-foreground text-xs">User</div>
            <div className="text-foreground text-sm font-medium">
              E.SOMMER
            </div>
          </div>

          <button
            className="neo-button-circle w-10 h-10 md:w-12 md:h-12 font-bold text-sm md:text-base relative"
            data-dropdown-trigger
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
            }}
          >
            <span className="relative z-10">ES</span>
            <UserStatusIndicator showMenu={true} />
          </button>
          
          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <div
              className="neo-dropdown absolute right-0 top-full mt-2 w-72 z-50 rounded-xl overflow-hidden"
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
    </header>
  )
}

export default Header
