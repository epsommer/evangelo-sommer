"use client"

import React, { useState, useEffect } from "react"
import { Search, Calendar, Clock, User, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import AccountSettingsModal, { AccountSettings } from "@/components/AccountSettingsModal"
import PreferencesModal, { SystemPreferences } from "@/components/PreferencesModal"

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
  const [isSigningOut, setIsSigningOut] = useState(false);

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
    setShowProfileDropdown(false);
    setShowAccountSettings(true);
  };

  const handlePreferences = () => {
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
    <header className="bg-dark-grey text-white h-16 flex items-center justify-between px-6 border-b-2 border-gold">
      <div className="flex items-center space-x-6">
        <button 
          onClick={() => router.push('/dashboard')}
          className="text-2xl font-bold tracking-wide font-space-grotesk hover:text-gold transition-colors duration-200"
        >
          COMMAND CENTER
        </button>
        <div className="h-6 w-px bg-gold"></div>
        <span className="text-sm font-medium text-gold uppercase tracking-wider font-space-grotesk">
          MSCRMS
        </span>
      </div>
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" className="text-white border-white hover:bg-white hover:text-dark-grey">
          <Search className="h-4 w-4 mr-2" />
          SEARCH
        </Button>

        {/* Schedule Dropdown */}
        <div className="relative">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-white border-white hover:bg-white hover:text-dark-grey"
            onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
          >
            <Calendar className="h-4 w-4 mr-2" />
            SCHEDULE
            {scheduledServices.length > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 text-xs bg-blue-600 text-white">
                {scheduledServices.length}
              </Badge>
            )}
          </Button>

          {showScheduleDropdown && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-4 bg-off-white border-b border-gray-200 rounded-t-lg">
                <h3 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide text-sm">
                  Upcoming Schedules
                </h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {scheduledServices.length > 0 ? (
                  scheduledServices.map(service => (
                    <div key={service.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-dark-grey text-sm">
                          {service.service}
                        </span>
                        <Badge className={`text-xs ${
                          service.priority === 'high' ? 'bg-red-100 text-red-800' :
                          service.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {service.priority}
                        </Badge>
                      </div>
                      <div className="text-sm text-medium-grey">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(service.scheduledDate), 'MMM d, h:mm a')}</span>
                        </div>
                        <div className="mt-1">Client: {service.clientName}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-medium-grey">
                    No upcoming schedules
                  </div>
                )}
              </div>
              {scheduledServices.length > 0 && (
                <div className="p-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                  <a 
                    href="/time-manager" 
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    onClick={() => setShowScheduleDropdown(false)}
                  >
                    View all schedules →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 relative">
          <span className="text-sm font-medium text-white font-space-grotesk uppercase tracking-wide">
            Evangelo Sommer
          </span>
          <button 
            className="w-10 h-10 bg-gold flex items-center justify-center text-dark-grey font-bold font-space-grotesk hover:bg-gold-dark transition-colors duration-200"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            ES
          </button>
          
          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <div className="absolute right-0 top-12 w-56 bg-white border border-gray-200 shadow-lg z-50">
              <div className="p-4 bg-off-white border-b border-gray-200">
                <h3 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide text-sm">
                  Profile Settings
                </h3>
              </div>
              <div className="p-2">
                <button 
                  onClick={handleAccountSettings}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-dark-grey text-sm font-space-grotesk flex items-center space-x-2"
                >
                  <User className="h-4 w-4" />
                  <span>Account Settings</span>
                </button>
                <button 
                  onClick={handlePreferences}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-dark-grey text-sm font-space-grotesk flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Preferences</span>
                </button>
                <hr className="my-2" />
                <button 
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 text-sm font-space-grotesk flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showScheduleDropdown || showProfileDropdown) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowScheduleDropdown(false);
            setShowProfileDropdown(false);
          }}
        />
      )}

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
