"use client";

import { useState, useCallback, useRef } from 'react';
import {
  DragState,
  ResizeHandleState,
  WeekdaySelection,
  VERTICAL_DRAG_THRESHOLD,
  MIN_HORIZONTAL_DRAG,
  DEFAULT_EVENT_DURATION,
  DEFAULT_START_HOUR
} from '@/types/multiday-selection';
import { differenceInDays, startOfDay, addDays, format } from 'date-fns';

export function useMultiDayDrag() {
  const [dragState, setDragState] = useState<DragState>({
    mode: 'idle',
    startDate: null,
    currentDate: null,
    startPosition: null,
    currentPosition: null,
    selection: null,
  });

  const [resizeState, setResizeState] = useState<ResizeHandleState>({
    isResizing: false,
    handle: null,
    initialSelection: null,
    startY: 0,
  });

  const doubleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const DOUBLE_CLICK_WINDOW = 300; // ms

  /**
   * Extract weekdays from a date range, preserving the pattern
   */
  const extractWeekdays = useCallback((startDate: Date, endDate: Date): number[] => {
    const weekdays = new Set<number>();
    let current = startOfDay(startDate);
    const end = startOfDay(endDate);

    while (current <= end) {
      weekdays.add(current.getDay());
      current = addDays(current, 1);
    }

    // Convert to sorted array
    return Array.from(weekdays).sort((a, b) => a - b);
  }, []);

  /**
   * Calculate week index within the month
   */
  const getWeekIndex = useCallback((date: Date, monthStart: Date): number => {
    const daysDiff = differenceInDays(startOfDay(date), startOfDay(monthStart));
    return Math.floor(daysDiff / 7);
  }, []);

  /**
   * Create a weekday selection from date range
   */
  const createSelection = useCallback((
    startDate: Date,
    endDate: Date,
    monthStart: Date
  ): WeekdaySelection => {
    const [start, end] = startDate <= endDate
      ? [startDate, endDate]
      : [endDate, startDate];

    return {
      weekdays: extractWeekdays(start, end),
      startWeekIndex: getWeekIndex(start, monthStart),
      endWeekIndex: getWeekIndex(end, monthStart),
      startDate: start,
      endDate: end,
      startTime: `${DEFAULT_START_HOUR.toString().padStart(2, '0')}:00`,
      duration: DEFAULT_EVENT_DURATION,
    };
  }, [extractWeekdays, getWeekIndex]);

  /**
   * Start drag detection on mouse down
   */
  const handleMouseDown = useCallback((e: React.MouseEvent, date: Date) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    // Check for double-click
    if (timeSinceLastClick < DOUBLE_CLICK_WINDOW) {
      // This is a double-click - start detecting
      e.preventDefault();

      setDragState({
        mode: 'detecting',
        startDate: date,
        currentDate: date,
        startPosition: { x: e.clientX, y: e.clientY },
        currentPosition: { x: e.clientX, y: e.clientY },
        selection: null,
      });

      console.log('🎯 Double-click detected on', format(date, 'yyyy-MM-dd'), '- ready to drag');
    }

    lastClickTimeRef.current = now;
  }, []);

  /**
   * Update drag state on mouse move
   */
  const handleMouseMove = useCallback((e: MouseEvent, currentDate: Date | null, monthStart: Date) => {
    if (dragState.mode === 'idle' || !dragState.startPosition || !dragState.startDate) {
      return;
    }

    const deltaX = Math.abs(e.clientX - dragState.startPosition.x);
    const deltaY = Math.abs(e.clientY - dragState.startPosition.y);

    // Update current position
    const newPosition = { x: e.clientX, y: e.clientY };

    // Check for vertical conversion
    if (deltaY > VERTICAL_DRAG_THRESHOLD && dragState.mode !== 'vertical_convert') {
      setDragState(prev => ({
        ...prev,
        mode: 'vertical_convert',
        currentPosition: newPosition,
      }));
      console.log('↕️ Vertical drag detected - converting to recurring week event mode');
      return;
    }

    // Check for horizontal drag start
    if (deltaX > MIN_HORIZONTAL_DRAG && dragState.mode === 'detecting') {
      setDragState(prev => ({
        ...prev,
        mode: 'horizontal_select',
        currentPosition: newPosition,
      }));
      console.log('↔️ Horizontal drag started');
    }

    // Update current date and selection
    if (currentDate && dragState.mode === 'horizontal_select') {
      const selection = createSelection(dragState.startDate, currentDate, monthStart);

      setDragState(prev => ({
        ...prev,
        currentDate,
        currentPosition: newPosition,
        selection,
      }));
    }
  }, [dragState, createSelection]);

  /**
   * Complete drag on mouse up
   */
  const handleMouseUp = useCallback(() => {
    if (dragState.mode === 'idle' || !dragState.selection) {
      // No valid selection, reset
      setDragState({
        mode: 'idle',
        startDate: null,
        currentDate: null,
        startPosition: null,
        currentPosition: null,
        selection: null,
      });
      return null;
    }

    // Return the selection and keep in 'creating' mode (for resize handles)
    setDragState(prev => ({
      ...prev,
      mode: 'creating',
    }));

    return dragState.selection;
  }, [dragState]);

  /**
   * Start resize operation
   */
  const startResize = useCallback((handle: 'top' | 'bottom', e: React.MouseEvent) => {
    if (!dragState.selection) return;

    e.preventDefault();
    e.stopPropagation();

    setResizeState({
      isResizing: true,
      handle,
      initialSelection: dragState.selection,
      startY: e.clientY,
    });

    console.log(`📏 Started resize from ${handle} handle`);
  }, [dragState.selection]);

  /**
   * Update selection during resize
   */
  const handleResize = useCallback((e: MouseEvent, weekRowHeight: number, monthStart: Date) => {
    if (!resizeState.isResizing || !resizeState.initialSelection || !resizeState.handle) {
      return;
    }

    const deltaY = e.clientY - resizeState.startY;
    const weeksDelta = Math.round(deltaY / weekRowHeight);

    let newSelection = { ...resizeState.initialSelection };

    if (resizeState.handle === 'bottom') {
      // Extend/shrink end date
      const newEndWeekIndex = resizeState.initialSelection.endWeekIndex + weeksDelta;
      const weekSpan = newEndWeekIndex - resizeState.initialSelection.startWeekIndex;
      const newEndDate = addDays(resizeState.initialSelection.startDate, (weekSpan * 7) + 6);

      newSelection = {
        ...resizeState.initialSelection,
        endWeekIndex: newEndWeekIndex,
        endDate: newEndDate,
      };
    } else if (resizeState.handle === 'top') {
      // Extend/shrink start date
      const newStartWeekIndex = resizeState.initialSelection.startWeekIndex + weeksDelta;
      const weekSpan = resizeState.initialSelection.endWeekIndex - newStartWeekIndex;
      const newStartDate = addDays(resizeState.initialSelection.endDate, -(weekSpan * 7) - 6);

      newSelection = {
        ...resizeState.initialSelection,
        startWeekIndex: newStartWeekIndex,
        startDate: newStartDate,
      };
    }

    // Only update if we have a valid week span
    if (newSelection.endWeekIndex >= newSelection.startWeekIndex) {
      setDragState(prev => ({
        ...prev,
        selection: newSelection,
      }));
    }
  }, [resizeState]);

  /**
   * Complete resize operation
   */
  const endResize = useCallback(() => {
    setResizeState({
      isResizing: false,
      handle: null,
      initialSelection: null,
      startY: 0,
    });
    console.log('✅ Resize completed');
  }, []);

  /**
   * Cancel/reset drag state
   */
  const cancelDrag = useCallback(() => {
    setDragState({
      mode: 'idle',
      startDate: null,
      currentDate: null,
      startPosition: null,
      currentPosition: null,
      selection: null,
    });
    setResizeState({
      isResizing: false,
      handle: null,
      initialSelection: null,
      startY: 0,
    });
  }, []);

  /**
   * Complete the selection and transition to event creation
   */
  const completeSelection = useCallback(() => {
    const selection = dragState.selection;
    cancelDrag();
    return selection;
  }, [dragState.selection, cancelDrag]);

  return {
    dragState,
    resizeState,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    startResize,
    handleResize,
    endResize,
    cancelDrag,
    completeSelection,
  };
}
