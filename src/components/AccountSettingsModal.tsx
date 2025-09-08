"use client"

import React, { useState } from 'react'
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-dark-grey text-white p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold font-space-grotesk uppercase tracking-wide">
            Account Settings
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gold transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-64 bg-off-white border-r border-light-grey">
            <div className="p-4">
              <div className="space-y-1">
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
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left font-medium text-sm font-space-grotesk uppercase tracking-wide transition-colors ${
                        activeTab === tab.id
                          ? 'bg-gold text-dark-grey'
                          : 'text-medium-grey hover:bg-light-grey hover:text-dark-grey'
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
                <h3 className="text-lg font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                  Profile Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-medium-grey" />
                      <input
                        type="text"
                        value={settings.profile.name}
                        onChange={(e) => updateProfile('name', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                        placeholder="Enter full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-medium-grey" />
                      <input
                        type="email"
                        value={settings.profile.email}
                        onChange={(e) => updateProfile('email', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-medium-grey" />
                      <input
                        type="tel"
                        value={settings.profile.phone}
                        onChange={(e) => updateProfile('phone', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                      Company
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-medium-grey" />
                      <input
                        type="text"
                        value={settings.profile.company}
                        onChange={(e) => updateProfile('company', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                        placeholder="Enter company name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={settings.profile.title}
                      onChange={(e) => updateProfile('title', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                      placeholder="Enter job title"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-medium-grey" />
                      <input
                        type="text"
                        value={settings.profile.location}
                        onChange={(e) => updateProfile('location', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                        placeholder="Enter location"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                  Security & Privacy
                </h3>

                {/* Password Change */}
                <div className="bg-off-white p-4 border border-light-grey">
                  <h4 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide mb-4">
                    Change Password
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                        Current Password
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-medium-grey" />
                        <input
                          type={showPasswords ? "text" : "password"}
                          value={settings.security.currentPassword || ''}
                          onChange={(e) => updateSecurity('currentPassword', e.target.value)}
                          className="w-full pl-10 pr-12 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-medium-grey hover:text-dark-grey"
                        >
                          {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                        New Password
                      </label>
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={settings.security.newPassword || ''}
                        onChange={(e) => updateSecurity('newPassword', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                        placeholder="Enter new password"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                        Confirm New Password
                      </label>
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={settings.security.confirmPassword || ''}
                        onChange={(e) => updateSecurity('confirmPassword', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>

                {/* Security Options */}
                <div className="bg-off-white p-4 border border-light-grey">
                  <h4 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide mb-4">
                    Security Options
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-dark-grey font-space-grotesk">Two-Factor Authentication</div>
                        <div className="text-sm text-medium-grey font-space-grotesk">Add an extra layer of security to your account</div>
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
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-dark-grey font-space-grotesk">Login Notifications</div>
                        <div className="text-sm text-medium-grey font-space-grotesk">Get notified when someone logs into your account</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.security.loginNotifications}
                          onChange={(e) => updateSecurity('loginNotifications', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                  System Preferences
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Appearance */}
                  <div className="bg-off-white p-4 border border-light-grey">
                    <h4 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide mb-4">
                      Appearance
                    </h4>
                    
                    <div>
                      <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-space-grotesk">
                        Theme
                      </label>
                      <select
                        value={settings.preferences.theme}
                        onChange={(e) => updatePreferences('theme', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                      </select>
                    </div>
                  </div>

                  {/* Localization */}
                  <div className="bg-off-white p-4 border border-light-grey">
                    <h4 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide mb-4">
                      Localization
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-space-grotesk">
                          Language
                        </label>
                        <select
                          value={settings.preferences.language}
                          onChange={(e) => updatePreferences('language', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                        >
                          <option value="en">English</option>
                          <option value="fr">Français</option>
                          <option value="es">Español</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-space-grotesk">
                          Timezone
                        </label>
                        <select
                          value={settings.preferences.timezone}
                          onChange={(e) => updatePreferences('timezone', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
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
                <div className="bg-off-white p-4 border border-light-grey">
                  <h4 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide mb-4">
                    Notification Preferences
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-dark-grey font-space-grotesk">Email Notifications</div>
                        <div className="text-sm text-medium-grey font-space-grotesk">Receive notifications via email</div>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-dark-grey font-space-grotesk">Browser Notifications</div>
                        <div className="text-sm text-medium-grey font-space-grotesk">Show browser popup notifications</div>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-dark-grey font-space-grotesk">Mobile Notifications</div>
                        <div className="text-sm text-medium-grey font-space-grotesk">Send push notifications to mobile devices</div>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-off-white border-t border-light-grey p-6 flex items-center justify-between">
          <div className="text-sm text-medium-grey font-space-grotesk">
            Changes will be saved to your profile and applied immediately.
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6 py-2 font-bold uppercase tracking-wide border-medium-grey text-medium-grey hover:bg-medium-grey hover:text-white font-space-grotesk"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-gold text-dark-grey px-6 py-2 font-bold uppercase tracking-wide hover:bg-gold-dark font-space-grotesk"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountSettingsModal