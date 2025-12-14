'use client'

/**
 * useCalendarSync Hook
 * Manages calendar sync state and operations
 * Provides real-time sync status and manual sync trigger
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SyncStatus } from '@/components/SyncStatusIndicator'

interface UseCalendarSyncOptions {
  autoSync?: boolean
  syncInterval?: number // milliseconds
  onSyncComplete?: (result: any) => void
  onSyncError?: (error: Error) => void
}

export interface CalendarIntegration {
  id: string
  provider: string
  isActive: boolean
  lastSyncAt?: string
  lastSyncError?: string
}

export function useCalendarSync(options: UseCalendarSyncOptions = {}) {
  const {
    autoSync = true,
    syncInterval = 60000, // 1 minute default
    onSyncComplete,
    onSyncError
  } = options

  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([])
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Fetch active calendar integrations
   */
  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/integrations')
      const data = await response.json()

      if (data.success) {
        setIntegrations(data.data || [])

        // Update sync statuses
        const statuses: SyncStatus[] = (data.data || []).map((integration: CalendarIntegration) => ({
          provider: integration.provider,
          status: 'idle' as const,
          lastSyncAt: integration.lastSyncAt ? new Date(integration.lastSyncAt) : undefined,
          error: integration.lastSyncError
        }))
        setSyncStatuses(statuses)
      }
    } catch (err) {
      console.error('Failed to fetch calendar integrations:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch integrations'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Sync a specific integration
   */
  const syncIntegration = useCallback(async (integrationId: string) => {
    try {
      // Update status to syncing
      setSyncStatuses(prev =>
        prev.map(s =>
          s.provider === integrationId
            ? { ...s, status: 'syncing' as const, error: undefined }
            : s
        )
      )

      const response = await fetch(`/api/calendar/integrations/${integrationId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update status to synced
        setSyncStatuses(prev =>
          prev.map(s =>
            s.provider === integrationId
              ? { ...s, status: 'synced' as const, lastSyncAt: new Date() }
              : s
          )
        )

        return data
      } else {
        throw new Error(data.error || 'Sync failed')
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sync failed')

      // Update status to error
      setSyncStatuses(prev =>
        prev.map(s =>
          s.provider === integrationId
            ? { ...s, status: 'error' as const, error: error.message }
            : s
        )
      )

      throw error
    }
  }, [])

  /**
   * Sync all active integrations
   */
  const syncAll = useCallback(async () => {
    if (isSyncing) {
      console.log('Sync already in progress')
      return
    }

    setIsSyncing(true)
    setError(null)

    // Create abort controller for this sync operation
    abortControllerRef.current = new AbortController()

    try {
      const activeIntegrations = integrations.filter(i => i.isActive)

      if (activeIntegrations.length === 0) {
        console.log('No active integrations to sync')
        return
      }

      console.log(`Syncing ${activeIntegrations.length} integration(s)...`)

      // Sync all integrations in parallel
      const results = await Promise.allSettled(
        activeIntegrations.map(integration =>
          syncIntegration(integration.id)
        )
      )

      // Check for failures
      const failures = results.filter(r => r.status === 'rejected')
      if (failures.length > 0) {
        const firstError = (failures[0] as PromiseRejectedResult).reason
        throw firstError
      }

      setLastSyncAt(new Date())

      if (onSyncComplete) {
        onSyncComplete(results)
      }

      console.log('Sync completed successfully')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sync failed')
      setError(error)

      if (onSyncError) {
        onSyncError(error)
      }

      console.error('Sync error:', error)
    } finally {
      setIsSyncing(false)
      abortControllerRef.current = null
    }
  }, [integrations, isSyncing, syncIntegration, onSyncComplete, onSyncError])

  /**
   * Cancel ongoing sync
   */
  const cancelSync = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsSyncing(false)
    }
  }, [])

  /**
   * Pull events from external calendars
   */
  const pullEvents = useCallback(async (startDate?: Date, endDate?: Date) => {
    try {
      const response = await fetch('/api/calendar/sync/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString()
        })
      })

      const data = await response.json()

      if (data.success) {
        return {
          events: data.events || [],
          conflicts: data.conflicts || []
        }
      } else {
        throw new Error(data.error || 'Pull failed')
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Pull failed')
    }
  }, [])

  /**
   * Process sync queue manually
   */
  const processQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/sync/queue', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        console.log('Queue processed:', data.results)
        return data.results
      } else {
        throw new Error(data.error || 'Queue processing failed')
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Queue processing failed')
    }
  }, [])

  /**
   * Get queue status
   */
  const getQueueStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/sync/queue')
      const data = await response.json()

      if (data.success) {
        return data.stats
      } else {
        throw new Error(data.error || 'Failed to get queue status')
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to get queue status')
    }
  }, [])

  // Fetch integrations on mount
  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  // Set up auto-sync interval
  useEffect(() => {
    if (!autoSync || integrations.length === 0) {
      return
    }

    console.log(`Setting up auto-sync every ${syncInterval}ms`)

    intervalRef.current = setInterval(() => {
      console.log('Auto-sync triggered')
      syncAll()
    }, syncInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoSync, syncInterval, integrations.length, syncAll])

  return {
    // State
    integrations,
    syncStatuses,
    isLoading,
    isSyncing,
    lastSyncAt,
    error,

    // Actions
    syncAll,
    syncIntegration,
    cancelSync,
    pullEvents,
    processQueue,
    getQueueStatus,
    refresh: fetchIntegrations
  }
}
