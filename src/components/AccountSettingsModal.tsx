"use client"

import React, { useState, useEffect } from 'react'
import { X, User, Mail, Phone, MapPin, Building, Key, Shield, Save, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (settings: AccountSettings) => void
}

export interface AccountSettings {
  profile: {
    name: string
    email: string
    phone?: string
    company?: string
    title?: string
    location?: string
  }
  security: {
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
    twoFactorEnabled: boolean
    loginNotifications: boolean
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
    notifications: {
      email: boolean
      browser: boolean
      mobile: boolean
    }
  }
}

const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile')
  const [showPasswords, setShowPasswords] = useState(false)
  const [settings, setSettings] = useState<AccountSettings>({
    profile: {
      name: 'Evangelo Sommer',
      email: 'admin@evangelosommer.com',
      phone: '+1 (647) 327-8401',
      company: 'MSC Systems',
      title: 'System Administrator',
      location: 'Toronto, ON'
    },
    security: {
      twoFactorEnabled: false,
      loginNotifications: true
    },
    preferences: {
      theme: 'system',
      language: 'en',
      timezone: 'America/Toronto',
      notifications: {
        email: true,
        browser: true,
        mobile: false
      }
    }
  })

  const handleSave = () => {
    onSave(settings)
    onClose()
  }

  const updateProfile = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      profile: { ...prev.profile, [key]: value }
    }))
  }

  const updateSecurity = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      security: { ...prev.security, [key]: value }
    }))
  }

  const updatePreferences = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      preferences: { ...prev.preferences, [key]: value }
    }))
  }

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="neo-container w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="neo-container-inner p-6 flex items-center justify-between border-b border-border">
          <div className="flex items-center space-x-3">
            <User className="h-6 w-6 text-foreground" />
            <h2 className="text-xl font-bold font-primary uppercase tracking-wide text-foreground">
              Account Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="neo-button-circle w-10 h-10 flex items-center justify-center transition-all duration-300 hover:scale-110"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-64 bg-background border-r border-border">
            <div className="p-4">
              <div className="space-y-2">
                {[
                  { id: 'profile', label: 'Profile Information', icon: User },
                  { id: 'security', label: 'Security & Privacy', icon: Shield },
                  { id: 'preferences', label: 'Preferences', icon: Building }
                ].map(tab => {
                  const IconComponent = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left font-medium text-sm font-primary uppercase tracking-wide transition-all duration-300 rounded-xl ${
                        activeTab === tab.id
                          ? 'neo-button-active text-foreground'
                          : 'neo-button text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-foreground font-primary uppercase tracking-wide">
                  Profile Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/50" />
                      <input
                        type="text"
                        value={settings.profile.name}
                        onChange={(e) => updateProfile('name', e.target.value)}
                        className="neomorphic-input w-full pl-10 pr-4"
                        placeholder="Enter full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/50" />
                      <input
                        type="email"
                        value={settings.profile.email}
                        onChange={(e) => updateProfile('email', e.target.value)}
                        className="neomorphic-input w-full pl-10 pr-4"
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/50" />
                      <input
                        type="tel"
                        value={settings.profile.phone}
                        onChange={(e) => updateProfile('phone', e.target.value)}
                        className="neomorphic-input w-full pl-10 pr-4"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                      Company
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/50" />
                      <input
                        type="text"
                        value={settings.profile.company}
                        onChange={(e) => updateProfile('company', e.target.value)}
                        className="neomorphic-input w-full pl-10 pr-4"
                        placeholder="Enter company name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={settings.profile.title}
                      onChange={(e) => updateProfile('title', e.target.value)}
                      className="neomorphic-input w-full"
                      placeholder="Enter job title"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/50" />
                      <input
                        type="text"
                        value={settings.profile.location}
                        onChange={(e) => updateProfile('location', e.target.value)}
                        className="neomorphic-input w-full pl-10 pr-4"
                        placeholder="Enter location"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-hud-text-primary font-primary uppercase tracking-wide">
                  Security & Privacy
                </h3>

                {/* Password Change */}
                <div className="neo-container p-4">
                  <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                    Change Password
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                        Current Password
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/50" />
                        <input
                          type={showPasswords ? "text" : "password"}
                          value={settings.security.currentPassword || ''}
                          onChange={(e) => updateSecurity('currentPassword', e.target.value)}
                          className="neomorphic-input w-full pl-10 pr-12"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-medium-grey hover:text-hud-text-primary"
                        >
                          {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                        New Password
                      </label>
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={settings.security.newPassword || ''}
                        onChange={(e) => updateSecurity('newPassword', e.target.value)}
                        className="neomorphic-input w-full"
                        placeholder="Enter new password"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                        Confirm New Password
                      </label>
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={settings.security.confirmPassword || ''}
                        onChange={(e) => updateSecurity('confirmPassword', e.target.value)}
                        className="neomorphic-input w-full"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>

                {/* Security Options */}
                <div className="neo-container p-4">
                  <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                    Security Options
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-hud-text-primary font-primary">Two-Factor Authentication</div>
                        <div className="text-sm text-medium-grey font-primary">Add an extra layer of security to your account</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={settings.security.twoFactorEnabled ? 'bg-green-600 text-white' : 'bg-medium-grey text-white'}>
                          {settings.security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.security.twoFactorEnabled}
                            onChange={(e) => updateSecurity('twoFactorEnabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-hud-text-primary font-primary">Login Notifications</div>
                        <div className="text-sm text-medium-grey font-primary">Get notified when someone logs into your account</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.security.loginNotifications}
                          onChange={(e) => updateSecurity('loginNotifications', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-hud-text-primary font-primary uppercase tracking-wide">
                  System Preferences
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Appearance */}
                  <div className="neo-container p-4">
                    <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                      Appearance
                    </h4>
                    
                    <div>
                      <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-primary">
                        Theme
                      </label>
                      <select
                        value={settings.preferences.theme}
                        onChange={(e) => updatePreferences('theme', e.target.value)}
                        className="neomorphic-input w-full"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark (Mocha)</option>
                        <option value="overkast">Overkast</option>
                        <option value="true-night">True Night</option>
                        <option value="system">System</option>
                      </select>
                    </div>
                  </div>

                  {/* Localization */}
                  <div className="neo-container p-4">
                    <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                      Localization
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-primary">
                          Language
                        </label>
                        <select
                          value={settings.preferences.language}
                          onChange={(e) => updatePreferences('language', e.target.value)}
                          className="neomorphic-input w-full"
                        >
                          <option value="en">English</option>
                          <option value="fr">Français</option>
                          <option value="es">Español</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-primary">
                          Timezone
                        </label>
                        <select
                          value={settings.preferences.timezone}
                          onChange={(e) => updatePreferences('timezone', e.target.value)}
                          className="neomorphic-input w-full"
                        >
                          <option value="America/Toronto">Eastern Time</option>
                          <option value="America/New_York">Eastern Time (US)</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div className="neo-container p-4">
                  <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                    Notification Preferences
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-hud-text-primary font-primary">Email Notifications</div>
                        <div className="text-sm text-medium-grey font-primary">Receive notifications via email</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.preferences.notifications.email}
                          onChange={(e) => updatePreferences('notifications', {
                            ...settings.preferences.notifications,
                            email: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-hud-text-primary font-primary">Browser Notifications</div>
                        <div className="text-sm text-medium-grey font-primary">Show browser popup notifications</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.preferences.notifications.browser}
                          onChange={(e) => updatePreferences('notifications', {
                            ...settings.preferences.notifications,
                            browser: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-hud-text-primary font-primary">Mobile Notifications</div>
                        <div className="text-sm text-medium-grey font-primary">Send push notifications to mobile devices</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.preferences.notifications.mobile}
                          onChange={(e) => updatePreferences('notifications', {
                            ...settings.preferences.notifications,
                            mobile: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="neo-container-inner border-t border-border p-6 flex items-center justify-between">
          <div className="text-sm text-foreground/60 font-primary">
            Changes will be saved to your profile and applied immediately.
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="neo-button px-6 py-2 font-bold uppercase tracking-wide font-primary transition-all duration-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="neo-button-active px-6 py-2 font-bold uppercase tracking-wide font-primary transition-all duration-300 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountSettingsModal