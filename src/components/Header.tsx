"use client"

import React, { useState, useEffect } from "react"
import { Search, Calendar, Clock, User, Settings, LogOut, Shield, Command, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import AccountSettingsModal, { AccountSettings } from "@/components/AccountSettingsModal"
import PreferencesModal, { SystemPreferences } from "@/components/PreferencesModal"
import { ThemeToggle } from "./ThemeToggle"

interface ScheduledService {
  id: string;
  title: string;
  service: string;
  clientName: string;
  scheduledDate: string;
  priority: string;
  status: string;
}

const Header = () => {
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
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white dark:bg-background bg-hud-overlay flex items-center justify-between px-8 border-b-4 border-tactical-gold transition-all duration-300 ${isScrolled ? 'h-14' : 'h-20'}`}>
      {/* Removed distracting tactical frame overlay */}
      
      <div className="flex items-center space-x-8 relative">
        <button 
          onClick={() => router.push('/dashboard')}
          className={`logo-button flex items-center space-x-3 tracking-wide text-tactical-white hover-tactical-glow transition-all duration-300 group bg-transparent border-none ${isScrolled ? 'text-lg' : 'text-2xl'}`}
        >
          <Shield className={`text-tactical-gold group-hover:animate-pulse transition-all duration-300 ${isScrolled ? 'w-6 h-6' : 'w-8 h-8'}`} />
          <div>
            <div className="text-tactical-gold text-lg font-bold tracking-wider" style={{ fontFamily: 'lores-9-wide, sans-serif' }}>TACTICAL</div>
            <div className="text-tactical-white text-sm font-normal tracking-[0.2em] -mt-1" style={{ fontFamily: 'lores-12-narrow, sans-serif' }}>COMMAND CENTER</div>
          </div>
        </button>
        
        <div className="chevron-separator"></div>
        
        <div className={`hud-metric bg-transparent border-none p-0 transition-all duration-300 ${isScrolled ? 'scale-75' : 'scale-100'}`}>
          <Activity className={`text-tactical-amber animate-pulse transition-all duration-300 ${isScrolled ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <div>
            <div className={`text-tactical-amber font-tactical transition-all duration-300 ${isScrolled ? 'text-[0.625rem]' : 'text-xs'}`}>SYSTEM_ID</div>
            <div className={`text-tactical-white font-tactical transition-all duration-300 ${isScrolled ? 'text-xs' : 'text-sm'}`}>MSCRMS_V2.1</div>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-6 relative z-10">
        <ThemeToggle />
        
        <button className="btn-secondary flex items-center px-4 py-2">
          <Search className="h-4 w-4 mr-2" />
          SEARCH
        </button>

        {/* Tactical Schedule Dropdown */}
        <div className="relative">
          <button 
            className="btn-tactical flex items-center px-4 py-2 relative"
            onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            SCHEDULE
            {scheduledServices.length > 0 && (
              <div className="ml-2 bg-tactical-red text-tactical-white px-2 py-1 text-xs font-tactical clip-path-diamond animate-pulse">
                {scheduledServices.length}
              </div>
            )}
            {/* Status indicator */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-tactical-green rounded-full animate-pulse"></div>
          </button>

          {showScheduleDropdown && (
            <div className="modal-tactical absolute right-0 top-full mt-2 w-96 z-50 overflow-hidden">
              <div className="p-4 bg-hud-overlay border-b-2 border-tactical-gold relative">
                <div className="corner-markers">
                  <h3 className="text-heading text-sm mb-0">
                    UPCOMING TACTICAL SCHEDULES
                  </h3>
                </div>
                <div className="status-online mt-2"></div>
              </div>
              <div className="max-h-80 overflow-y-auto bg-hud-background-primary/50 backdrop-blur-sm">
                {scheduledServices.length > 0 ? (
                  scheduledServices.map(service => (
                    <div key={service.id} className="tactical-frame m-2 p-3 hover-schematic transition-all duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-hud-primary font-hud-ui text-sm font-medium">
                          {service.service.toUpperCase()}
                        </span>
                        <div className={`px-2 py-1 text-xs font-tactical ${
                          service.priority === 'high' ? 'bg-tactical-red text-tactical-white' :
                          service.priority === 'medium' ? 'bg-tactical-amber text-tactical-gray-900' :
                          'bg-tactical-green text-tactical-white'
                        } clip-path-angled`}>
                          {service.priority.toUpperCase()}
                        </div>
                      </div>
                      <div className="text-sm text-hud-secondary">
                        <div className="flex items-center space-x-2 mb-1">
                          <Clock className="h-3 w-3 text-tactical-gold" />
                          <span className="font-tactical">
                            {format(new Date(service.scheduledDate), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                        <div className="text-tactical-data text-xs">
                          TARGET: {service.clientName.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <div className="data-terminal text-center p-4">
                      <div className="text-tactical-green font-tactical text-sm">
                        &gt; NO SCHEDULED OPERATIONS<br />
                        &gt; ALL CLEAR FOR DEPLOYMENT
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {scheduledServices.length > 0 && (
                <div className="p-4 bg-hud-overlay border-t-2 border-tactical-gold">
                  <button 
                    onClick={() => {
                      router.push('/time-manager');
                      setShowScheduleDropdown(false);
                    }}
                    className="btn-outline w-full text-xs py-2 flex items-center justify-center"
                  >
                    ACCESS FULL MISSION CONTROL
                    <Command className="w-3 h-3 ml-2" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4 relative">
          <div className="text-right">
            <div className="text-tactical-gold text-xs font-tactical">OPERATOR_ID</div>
            <div className="text-tactical-white text-sm font-hud-ui font-medium">
              E.SOMMER
            </div>
          </div>
          
          <button 
            className="rounded-full w-12 h-12 bg-tactical-gold text-tactical-gray-900 font-bold font-hud-ui hover-tactical-glow transition-all duration-300 relative corner-markers"
            data-dropdown-trigger
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
            }}
          >
            <span className="relative z-10">ES</span>
            <div className="absolute -top-1 -right-1 w-3 h-3">
              <div className="status-online"></div>
            </div>
          </button>
          
          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <div
              className="absolute right-0 top-full mt-2 w-72 z-50 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800"
              onClick={(e) => {
                e.stopPropagation(); // Prevent click from bubbling up to overlay
              }}
            >
              <div
                className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Operator Control Panel
                </h3>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Clearance Level: Alpha
                </div>
              </div>
              <div
                className="p-2 space-y-1 bg-white dark:bg-gray-800"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAccountSettings();
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <User className="h-4 w-4 text-tactical-gold" />
                  <span className="font-medium">Account Settings</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreferences();
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <Settings className="h-4 w-4 text-tactical-gold" />
                  <span className="font-medium">System Preferences</span>
                </button>

                <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>

                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full flex items-center space-x-3 p-3 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Tactical scan line animation */}
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-tactical-gold to-transparent opacity-50 animate-pulse"></div>

      {/* Click outside handled by useEffect document listener now */}

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
