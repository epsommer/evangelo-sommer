"use client"

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { UnifiedEvent } from '@/components/EventCreationModal'

export interface DragState {
  isDragging: boolean
  draggedEvent: UnifiedEvent | null
  dragOffset: { x: number; y: number }
  originalSlot: { date: string; hour: number } | null
}

export interface DropZoneState {
  activeDropZone: { date: string; hour: number } | null
  hoveredDropZone: { date: string; hour: number } | null
}

export interface ResizeState {
  isResizing: boolean
  resizedEvent: UnifiedEvent | null
  resizeHandle: 'top' | 'bottom' | null
}

interface DragDropContextType {
  // States
  dragState: DragState
  dropZoneState: DropZoneState
  resizeState: ResizeState
  
  // Actions
  startDrag: (event: UnifiedEvent, offset: { x: number; y: number }, originalSlot: { date: string; hour: number }) => void
  endDrag: () => void
  setHoveredDropZone: (zone: { date: string; hour: number } | null) => void
  setActiveDropZone: (zone: { date: string; hour: number } | null) => void
  startResize: (event: UnifiedEvent, handle: 'top' | 'bottom') => void
  endResize: () => void
  
  // Callbacks
  onEventDrop?: (event: UnifiedEvent, fromSlot: { date: string; hour: number }, toSlot: { date: string; hour: number }) => void
  onEventResize?: (event: UnifiedEvent, newStartTime: string, newEndTime: string) => void
  
  // Visual feedback
  showDropZones: boolean
  setShowDropZones: (show: boolean) => void
}

const DragDropContext = createContext<DragDropContextType | null>(null)

interface DragDropProviderProps {
  children: React.ReactNode
  onEventDrop?: (event: UnifiedEvent, fromSlot: { date: string; hour: number }, toSlot: { date: string; hour: number }) => void
  onEventResize?: (event: UnifiedEvent, newStartTime: string, newEndTime: string) => void
}

export const DragDropProvider: React.FC<DragDropProviderProps> = ({
  children,
  onEventDrop,
  onEventResize
}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedEvent: null,
    dragOffset: { x: 0, y: 0 },
    originalSlot: null
  })

  const [dropZoneState, setDropZoneState] = useState<DropZoneState>({
    activeDropZone: null,
    hoveredDropZone: null
  })

  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    resizedEvent: null,
    resizeHandle: null
  })

  const [showDropZones, setShowDropZones] = useState(false)

  // Use refs to always have access to the latest state in callbacks
  const dragStateRef = useRef<DragState>(dragState)
  const dropZoneStateRef = useRef<DropZoneState>(dropZoneState)

  // Keep refs in sync with state
  useEffect(() => {
    dragStateRef.current = dragState
  }, [dragState])

  useEffect(() => {
    dropZoneStateRef.current = dropZoneState
  }, [dropZoneState])

  const startDrag = useCallback((
    event: UnifiedEvent,
    offset: { x: number; y: number },
    originalSlot: { date: string; hour: number }
  ) => {
    console.log('🎯 DragDropContext.startDrag called for:', event.title, 'from slot:', originalSlot)
    setDragState({
      isDragging: true,
      draggedEvent: event,
      dragOffset: offset,
      originalSlot
    })
    setShowDropZones(true)
    console.log('🎯 DragDropContext: Drag state updated, showDropZones set to true')
  }, [])

  const endDrag = useCallback(() => {
    // Use refs to get the LATEST state (avoids stale closure issues)
    const currentDragState = dragStateRef.current
    const currentDropZoneState = dropZoneStateRef.current

    console.log('🎯 DragDropContext.endDrag called')
    console.log('🎯 Current dragState (from ref):', currentDragState)
    console.log('🎯 Current dropZoneState (from ref):', currentDropZoneState)

    // If we have an active drop zone, trigger the drop callback
    if (currentDragState.originalSlot && currentDropZoneState.activeDropZone && currentDragState.draggedEvent) {
      const isSameSlot = (
        currentDragState.originalSlot.date === currentDropZoneState.activeDropZone.date &&
        currentDragState.originalSlot.hour === currentDropZoneState.activeDropZone.hour
      )

      console.log('🎯 Drop zone conditions:', {
        hasOriginalSlot: !!currentDragState.originalSlot,
        hasActiveDropZone: !!currentDropZoneState.activeDropZone,
        hasDraggedEvent: !!currentDragState.draggedEvent,
        isSameSlot,
        hasOnEventDrop: !!onEventDrop
      })

      if (!isSameSlot && onEventDrop) {
        console.log('🎯 Calling onEventDrop:', currentDragState.draggedEvent.title, 'from', currentDragState.originalSlot, 'to', currentDropZoneState.activeDropZone)
        onEventDrop(currentDragState.draggedEvent, currentDragState.originalSlot, currentDropZoneState.activeDropZone)
      } else {
        console.log('🎯 Not calling onEventDrop - same slot or no callback')
      }
    } else {
      console.log('🎯 Not calling onEventDrop - missing required data:', {
        hasOriginalSlot: !!currentDragState.originalSlot,
        hasActiveDropZone: !!currentDropZoneState.activeDropZone,
        hasDraggedEvent: !!currentDragState.draggedEvent
      })
    }

    console.log('🎯 Resetting drag state')
    setDragState({
      isDragging: false,
      draggedEvent: null,
      dragOffset: { x: 0, y: 0 },
      originalSlot: null
    })
    setDropZoneState({
      activeDropZone: null,
      hoveredDropZone: null
    })
    setShowDropZones(false)
  }, [onEventDrop])

  const setHoveredDropZone = useCallback((zone: { date: string; hour: number } | null) => {
    setDropZoneState(prev => ({ ...prev, hoveredDropZone: zone }))
  }, [])

  const setActiveDropZone = useCallback((zone: { date: string; hour: number } | null) => {
    console.log('🎯 DragDropContext.setActiveDropZone called with:', zone)
    setDropZoneState(prev => ({ ...prev, activeDropZone: zone }))
  }, [])

  const startResize = useCallback((event: UnifiedEvent, handle: 'top' | 'bottom') => {
    setResizeState({
      isResizing: true,
      resizedEvent: event,
      resizeHandle: handle
    })
  }, [])

  const endResize = useCallback(() => {
    setResizeState({
      isResizing: false,
      resizedEvent: null,
      resizeHandle: null
    })
  }, [])

  const contextValue: DragDropContextType = {
    dragState,
    dropZoneState,
    resizeState,
    startDrag,
    endDrag,
    setHoveredDropZone,
    setActiveDropZone,
    startResize,
    endResize,
    onEventDrop,
    onEventResize,
    showDropZones,
    setShowDropZones
  }

  return (
    <DragDropContext.Provider value={contextValue}>
      {children}
    </DragDropContext.Provider>
  )
}

export const useDragDrop = () => {
  const context = useContext(DragDropContext)
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider')
  }
  return context
}

export default DragDropContext