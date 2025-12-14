'use client'

/**
 * SyncStatusIndicator Component
 * Displays real-time sync status for calendar integrations
 * Shows: synced ✓, syncing ↻, error ⚠
 */

import React, { useState, useEffect } from 'react'
import { RefreshCw, Check, AlertTriangle, Cloud, X } from 'lucide-react'

export interface SyncStatus {
  provider: string
  status: 'idle' | 'syncing' | 'synced' | 'error'
  lastSyncAt?: Date
  error?: string
}

interface SyncStatusIndicatorProps {
  integrations: SyncStatus[]
  onManualSync?: () => void
  compact?: boolean
  className?: string
}

export function SyncStatusIndicator({
  integrations,
  onManualSync,
  compact = false,
  className = ''
}: SyncStatusIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Overall sync status
  const overallStatus = React.useMemo(() => {
    if (integrations.some(i => i.status === 'syncing')) return 'syncing'
    if (integrations.some(i => i.status === 'error')) return 'error'
    if (integrations.some(i => i.status === 'synced')) return 'synced'
    return 'idle'
  }, [integrations])

  // Get status icon and color
  const getStatusIcon = (status: SyncStatus['status']) => {
    switch (status) {
      case 'syncing':
        return <RefreshCw className="w-4 h-4 animate-spin" />
      case 'synced':
        return <Check className="w-4 h-4" />
      case 'error':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Cloud className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: SyncStatus['status']) => {
    switch (status) {
      case 'syncing':
        return 'text-blue-500'
      case 'synced':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never'

    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (compact) {
    return (
      <div
        className={`relative inline-flex items-center gap-2 ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          onClick={onManualSync}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${getStatusColor(overallStatus)} hover:bg-gray-100 dark:hover:bg-gray-800`}
          title="Calendar sync status"
        >
          {getStatusIcon(overallStatus)}
          <span className="text-xs font-medium">
            {integrations.length}
          </span>
        </button>

        {/* Hover tooltip */}
        {isHovered && (
          <div className="absolute top-full left-0 mt-2 z-50 w-64 p-3 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-sm font-semibold">Calendar Sync</span>
                <button
                  onClick={onManualSync}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sync now
                </button>
              </div>

              {integrations.map((integration, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={getStatusColor(integration.status)}>
                      {getStatusIcon(integration.status)}
                    </span>
                    <span className="font-medium">{integration.provider}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatLastSync(integration.lastSyncAt)}
                  </span>
                </div>
              ))}

              {integrations.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  No integrations connected
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full view
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Calendar Sync Status</h3>
        <button
          onClick={onManualSync}
          disabled={overallStatus === 'syncing'}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${overallStatus === 'syncing' ? 'animate-spin' : ''}`} />
          Sync Now
        </button>
      </div>

      <div className="space-y-3">
        {integrations.map((integration, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="flex items-center gap-3">
              <span className={getStatusColor(integration.status)}>
                {getStatusIcon(integration.status)}
              </span>
              <div>
                <p className="font-medium">{integration.provider}</p>
                <p className="text-xs text-gray-500">
                  Last sync: {formatLastSync(integration.lastSyncAt)}
                </p>
              </div>
            </div>

            {integration.error && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 max-w-xs truncate">
                  {integration.error}
                </span>
              </div>
            )}

            {integration.status === 'synced' && (
              <span className="text-xs text-green-600 font-medium">
                Up to date
              </span>
            )}

            {integration.status === 'syncing' && (
              <span className="text-xs text-blue-600 font-medium">
                Syncing...
              </span>
            )}
          </div>
        ))}

        {integrations.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Cloud className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No calendar integrations connected</p>
            <p className="text-xs mt-1">Connect Google Calendar or Notion to enable sync</p>
          </div>
        )}
      </div>

      {integrations.some(i => i.status === 'error') && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-200">
                Sync Errors Detected
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Some calendar integrations failed to sync. Check your connection and try again.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SyncStatusIndicator
