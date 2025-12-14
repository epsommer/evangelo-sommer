"use client"

import { useState, useCallback, useRef } from 'react'
import { UnifiedEvent } from '@/components/EventCreationModal'
import { toast } from '@/lib/toast'

export interface EventUpdateData {
  id: string
  startDateTime?: string
  endDateTime?: string
  title?: string
  description?: string
  location?: string
  notes?: string
  [key: string]: any
}

export interface MutationState {
  isLoading: boolean
  error: string | null
  optimisticEvent: UnifiedEvent | null
}

export interface UseEventMutationOptions {
  onSuccess?: (event: UnifiedEvent) => void
  onError?: (error: Error, originalEvent: UnifiedEvent) => void
  showToasts?: boolean
}

export interface UseEventMutationResult {
  updateEvent: (eventId: string, updates: Partial<UnifiedEvent>) => Promise<UnifiedEvent | null>
  state: MutationState
  rollback: () => void
}

/**
 * useEventMutation Hook
 *
 * Manages event updates with optimistic updates and rollback capability.
 * Integrates with the database and external calendar sync.
 *
 * Features:
 * - Optimistic UI updates
 * - Automatic rollback on error
 * - Toast notifications
 * - Loading states
 * - Error handling
 *
 * @param options - Configuration options
 * @returns Mutation functions and state
 */
export function useEventMutation(options: UseEventMutationOptions = {}): UseEventMutationResult {
  const { onSuccess, onError, showToasts = true } = options

  const [state, setState] = useState<MutationState>({
    isLoading: false,
    error: null,
    optimisticEvent: null
  })

  // Store original event for rollback
  const originalEventRef = useRef<UnifiedEvent | null>(null)
  const rollbackCallbackRef = useRef<(() => void) | null>(null)

  /**
   * Update event with optimistic updates
   */
  const updateEvent = useCallback(async (
    eventId: string,
    updates: Partial<UnifiedEvent>
  ): Promise<UnifiedEvent | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Store original event for potential rollback
      // This would typically come from your event store/context
      // For now, we'll create a minimal representation
      const originalEvent: UnifiedEvent = {
        id: eventId,
        ...updates as any // In real implementation, fetch current event
      }
      originalEventRef.current = originalEvent

      // Optimistic update - apply changes immediately to UI
      const optimisticEvent: UnifiedEvent = {
        ...originalEvent,
        ...updates,
        updatedAt: new Date().toISOString()
      }

      setState(prev => ({
        ...prev,
        optimisticEvent
      }))

      // Make API call
      console.log('🔄 useEventMutation - Updating event:', eventId)
      console.log('🔄 useEventMutation - Updates:', updates)

      const response = await fetch(`/api/events?id=${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Update failed' }))
        throw new Error(errorData.error || `Update failed with status ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Update failed')
      }

      const updatedEvent = result.event

      // Success
      setState({
        isLoading: false,
        error: null,
        optimisticEvent: null
      })

      if (showToasts) {
        // Show success message
        let successMessage = 'Event updated successfully'

        if (result.database?.persisted) {
          successMessage += ' and saved to database'
        }

        const syncedProviders = result.externalSync
          ?.filter((s: any) => s.success)
          ?.map((s: any) => s.provider) || []

        if (syncedProviders.length > 0) {
          successMessage += ` (synced to ${syncedProviders.join(', ')})`
        }

        toast.success(successMessage, 2000)
      }

      onSuccess?.(updatedEvent)
      return updatedEvent

    } catch (error) {
      console.error('❌ useEventMutation - Update failed:', error)

      const errorMessage = error instanceof Error ? error.message : 'Failed to update event'

      // Rollback optimistic update
      setState({
        isLoading: false,
        error: errorMessage,
        optimisticEvent: null
      })

      if (showToasts) {
        const toastId = toast.error(
          errorMessage,
          5000,
          {
            label: 'Retry',
            onClick: () => {
              // Retry the update
              updateEvent(eventId, updates)
            }
          }
        )
      }

      if (originalEventRef.current) {
        onError?.(error as Error, originalEventRef.current)
      }

      return null
    }
  }, [onSuccess, onError, showToasts])

  /**
   * Manual rollback function
   */
  const rollback = useCallback(() => {
    if (originalEventRef.current) {
      setState({
        isLoading: false,
        error: null,
        optimisticEvent: null
      })

      if (rollbackCallbackRef.current) {
        rollbackCallbackRef.current()
      }

      if (showToasts) {
        toast.info('Changes reverted', 2000)
      }
    }
  }, [showToasts])

  return {
    updateEvent,
    state,
    rollback
  }
}
