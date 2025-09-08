"use client"

import React, { useState, useEffect } from 'react'
import { X, Settings, Bell, Eye, Globe, Clock, Save, Palette, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (preferences: SystemPreferences) => void
}

export interface SystemPreferences {
  display: {
    theme: 'light' | 'dark' | 'auto'
    compactMode: boolean
    showSidebar: boolean
    defaultView: 'grid' | 'list' | 'table'
  }
  notifications: {
    enableAll: boolean
    clientUpdates: boolean
    scheduleReminders: boolean
    systemAlerts: boolean
    soundEnabled: boolean
    quietHours: {
      enabled: boolean
      start: string
      end: string
    }
  }
  workflow: {
    autoSave: boolean
    confirmDeletions: boolean
    defaultClientStatus: 'prospect' | 'active'
    showAdvancedFeatures: boolean
    keyboardShortcuts: boolean
  }
  performance: {
    animationsEnabled: boolean
    cacheData: boolean
    preloadNextPage: boolean
    backgroundSync: boolean
  }
}

const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'display' | 'notifications' | 'workflow' | 'performance'>('display')
  const [preferences, setPreferences] = useState<SystemPreferences>({
    display: {
      theme: 'auto',
      compactMode: false,
      showSidebar: true,
      defaultView: 'grid'
    },
    notifications: {
      enableAll: true,
      clientUpdates: true,
      scheduleReminders: true,
      systemAlerts: true,
      soundEnabled: false,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    },
    workflow: {
      autoSave: true,
      confirmDeletions: true,
      defaultClientStatus: 'prospect',
      showAdvancedFeatures: false,
      keyboardShortcuts: true
    },
    performance: {
      animationsEnabled: true,
      cacheData: true,
      preloadNextPage: false,
      backgroundSync: true
    }
  })

  useEffect(() => {
    // Load saved preferences from localStorage
    try {
      const saved = localStorage.getItem('system-preferences')
      if (saved) {
        const savedPrefs = JSON.parse(saved)
        setPreferences(prev => ({ ...prev, ...savedPrefs }))
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }, [isOpen])

  const handleSave = () => {
    // Save to localStorage
    try {
      localStorage.setItem('system-preferences', JSON.stringify(preferences))
      onSave(preferences)
      onClose()
      
      // Apply theme immediately
      if (preferences.display.theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else if (preferences.display.theme === 'light') {
        document.documentElement.classList.remove('dark')
      } else {
        // Auto theme - check system preference
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.classList.toggle('dark', isDark)
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
  }

  const updateDisplay = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      display: { ...prev.display, [key]: value }
    }))
  }

  const updateNotifications = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }))
  }

  const updateWorkflow = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      workflow: { ...prev.workflow, [key]: value }
    }))
  }

  const updatePerformance = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      performance: { ...prev.performance, [key]: value }
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-dark-grey text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6" />
            <h2 className="text-xl font-bold font-space-grotesk uppercase tracking-wide">
              System Preferences
            </h2>
          </div>
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
                  { id: 'display', label: 'Display & Theme', icon: Palette },
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'workflow', label: 'Workflow', icon: Settings },
                  { id: 'performance', label: 'Performance', icon: Monitor }
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
            {activeTab === 'display' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                  Display & Theme
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-off-white p-4 border border-light-grey">
                    <h4 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide mb-4">
                      Appearance
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-space-grotesk">
                          Theme
                        </label>
                        <select
                          value={preferences.display.theme}
                          onChange={(e) => updateDisplay('theme', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                        >
                          <option value="light">Light Theme</option>
                          <option value="dark">Dark Theme</option>
                          <option value="auto">Auto (System)</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-dark-grey font-space-grotesk">Compact Mode</div>
                          <div className="text-sm text-medium-grey font-space-grotesk">Reduce spacing for more content</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.display.compactMode}
                            onChange={(e) => updateDisplay('compactMode', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-off-white p-4 border border-light-grey">
                    <h4 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide mb-4">
                      Layout
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-space-grotesk">
                          Default View
                        </label>
                        <select
                          value={preferences.display.defaultView}
                          onChange={(e) => updateDisplay('defaultView', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                        >
                          <option value="grid">Grid View</option>
                          <option value="list">List View</option>
                          <option value="table">Table View</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-dark-grey font-space-grotesk">Show Sidebar</div>
                          <div className="text-sm text-medium-grey font-space-grotesk">Always show navigation sidebar</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.display.showSidebar}
                            onChange={(e) => updateDisplay('showSidebar', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                  Notification Settings
                </h3>

                <div className="bg-off-white p-4 border border-light-grey">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                      Master Control
                    </h4>
                    <div className="flex items-center space-x-2">
                      <Badge className={preferences.notifications.enableAll ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                        {preferences.notifications.enableAll ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.notifications.enableAll}
                          onChange={(e) => updateNotifications('enableAll', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                      </label>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { key: 'clientUpdates', label: 'Client Updates', desc: 'When clients are added, updated, or status changes' },
                      { key: 'scheduleReminders', label: 'Schedule Reminders', desc: 'Upcoming appointments and service schedules' },
                      { key: 'systemAlerts', label: 'System Alerts', desc: 'Important system notifications and errors' },
                      { key: 'soundEnabled', label: 'Sound Notifications', desc: 'Play sound for incoming notifications' }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-dark-grey font-space-grotesk">{item.label}</div>
                          <div className="text-sm text-medium-grey font-space-grotesk">{item.desc}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.notifications[item.key as keyof typeof preferences.notifications] as boolean}
                            onChange={(e) => updateNotifications(item.key, e.target.checked)}
                            disabled={!preferences.notifications.enableAll}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold peer-disabled:opacity-50"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quiet Hours */}
                <div className="bg-off-white p-4 border border-light-grey">
                  <h4 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide mb-4">
                    Quiet Hours
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-dark-grey font-space-grotesk">Enable Quiet Hours</div>
                        <div className="text-sm text-medium-grey font-space-grotesk">Disable notifications during specified hours</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.notifications.quietHours.enabled}
                          onChange={(e) => updateNotifications('quietHours', {
                            ...preferences.notifications.quietHours,
                            enabled: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                      </label>
                    </div>

                    {preferences.notifications.quietHours.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={preferences.notifications.quietHours.start}
                            onChange={(e) => updateNotifications('quietHours', {
                              ...preferences.notifications.quietHours,
                              start: e.target.value
                            })}
                            className="w-full px-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-space-grotesk">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={preferences.notifications.quietHours.end}
                            onChange={(e) => updateNotifications('quietHours', {
                              ...preferences.notifications.quietHours,
                              end: e.target.value
                            })}
                            className="w-full px-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'workflow' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                  Workflow Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-off-white p-4 border border-light-grey">
                    <h4 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide mb-4">
                      General Workflow
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-dark-grey font-space-grotesk">Auto-Save</div>
                          <div className="text-sm text-medium-grey font-space-grotesk">Automatically save changes</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.workflow.autoSave}
                            onChange={(e) => updateWorkflow('autoSave', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-dark-grey font-space-grotesk">Confirm Deletions</div>
                          <div className="text-sm text-medium-grey font-space-grotesk">Show confirmation before deleting</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.workflow.confirmDeletions}
                            onChange={(e) => updateWorkflow('confirmDeletions', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-dark-grey font-space-grotesk">Keyboard Shortcuts</div>
                          <div className="text-sm text-medium-grey font-space-grotesk">Enable keyboard shortcuts</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.workflow.keyboardShortcuts}
                            onChange={(e) => updateWorkflow('keyboardShortcuts', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-off-white p-4 border border-light-grey">
                    <h4 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide mb-4">
                      Defaults
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-space-grotesk">
                          Default Client Status
                        </label>
                        <select
                          value={preferences.workflow.defaultClientStatus}
                          onChange={(e) => updateWorkflow('defaultClientStatus', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-light-grey bg-white text-dark-grey font-space-grotesk"
                        >
                          <option value="prospect">Prospect</option>
                          <option value="active">Active</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-dark-grey font-space-grotesk">Advanced Features</div>
                          <div className="text-sm text-medium-grey font-space-grotesk">Show advanced functionality</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.workflow.showAdvancedFeatures}
                            onChange={(e) => updateWorkflow('showAdvancedFeatures', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                  Performance Settings
                </h3>

                <div className="bg-off-white p-4 border border-light-grey">
                  <h4 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide mb-4">
                    Performance Options
                  </h4>
                  
                  <div className="space-y-4">
                    {[
                      { key: 'animationsEnabled', label: 'Animations', desc: 'Enable smooth transitions and animations' },
                      { key: 'cacheData', label: 'Cache Data', desc: 'Cache frequently accessed data for faster loading' },
                      { key: 'preloadNextPage', label: 'Preload Pages', desc: 'Preload next pages in background (uses more data)' },
                      { key: 'backgroundSync', label: 'Background Sync', desc: 'Sync data in background for real-time updates' }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-dark-grey font-space-grotesk">{item.label}</div>
                          <div className="text-sm text-medium-grey font-space-grotesk">{item.desc}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.performance[item.key as keyof typeof preferences.performance] as boolean}
                            onChange={(e) => updatePerformance(item.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-light-grey p-4 border border-medium-grey">
                  <div className="text-sm text-medium-grey font-space-grotesk">
                    <strong>Performance Tips:</strong><br/>
                    • Disable animations on slower devices for better performance<br/>
                    • Enable caching for faster load times<br/>
                    • Disable preloading to save data usage<br/>
                    • Background sync keeps data up-to-date automatically
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-off-white border-t border-light-grey p-6 flex items-center justify-between">
          <div className="text-sm text-medium-grey font-space-grotesk">
            Preferences are saved locally and will persist across sessions.
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
              Save Preferences
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PreferencesModal