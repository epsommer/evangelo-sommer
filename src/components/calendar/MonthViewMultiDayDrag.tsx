"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import { useMultiDayDrag } from '@/hooks/useMultiDayDrag';
import WeekdayPlaceholder from './WeekdayPlaceholder';
import { format, startOfMonth } from 'date-fns';

interface MonthViewMultiDayDragProps {
  calendarGridRef: React.RefObject<HTMLDivElement>;
  selectedDate: Date;
  onWeekdaySelectionComplete: (selection: {
    weekdays: number[];
    startDate: Date;
    endDate: Date;
    startTime: string;
    duration: number;
  }) => void;
  onVerticalDragDetected: (selection: {
    weekdays: number[];
    startDate: Date;
    endDate: Date;
  }) => void;
  enabled?: boolean;
}

/**
 * MonthViewMultiDayDrag - Handles multi-day recurring event creation via drag
 *
 * This component provides:
 * 1. Double-click + horizontal drag to select weekdays
 * 2. Resize handles to extend selection across multiple weeks
 * 3. Vertical drag detection to switch to recurring week event mode
 */
const MonthViewMultiDayDrag: React.FC<MonthViewMultiDayDragProps> = ({
  calendarGridRef,
  selectedDate,
  onWeekdaySelectionComplete,
  onVerticalDragDetected,
  enabled = true,
}) => {
  const {
    dragState,
    resizeState,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    startResize,
    handleResize,
    endResize,
    completeSelection,
  } = useMultiDayDrag();

  const monthStart = startOfMonth(selectedDate);

  // Attach global mouse move and mouse up handlers
  useEffect(() => {
    if (!enabled) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!calendarGridRef.current) return;

      // Handle resize
      if (resizeState.isResizing) {
        const weekRows = calendarGridRef.current.querySelectorAll('[data-week-row]');
        const firstRow = weekRows[0] as HTMLElement;
        if (!firstRow) return;

        const weekRowHeight = firstRow.getBoundingClientRect().height;
        handleResize(e, weekRowHeight, monthStart);
        return;
      }

      // Handle drag selection
      if (dragState.mode === 'detecting' || dragState.mode === 'horizontal_select') {
        // Find which day cell the mouse is over
        let currentDate: Date | null = null;

        const weekRows = calendarGridRef.current.querySelectorAll('[data-week-row]');
        weekRows.forEach((row) => {
          const rowRect = row.getBoundingClientRect();

          if (e.clientY >= rowRect.top && e.clientY <= rowRect.bottom) {
            const dayCellsGrid = row.querySelector('.grid-cols-7');
            if (dayCellsGrid) {
              const gridRect = dayCellsGrid.getBoundingClientRect();
              const relativeX = Math.max(0, e.clientX - gridRect.left);
              const cellWidth = gridRect.width / 7;
              let colIndex = Math.floor(relativeX / cellWidth);
              colIndex = Math.max(0, Math.min(6, colIndex));

              const weekStartStr = row.getAttribute('data-week-start');
              if (weekStartStr) {
                const weekStart = new Date(weekStartStr + 'T00:00:00');
                currentDate = new Date(weekStart);
                currentDate.setDate(weekStart.getDate() + colIndex);
              }
            }
          }
        });

        handleMouseMove(e, currentDate, monthStart);
      }
    };

    const onMouseUp = () => {
      if (resizeState.isResizing) {
        endResize();
        return;
      }

      if (dragState.mode === 'vertical_convert' && dragState.selection) {
        // User dragged vertically - switch to recurring week event mode
        console.log('🔄 Switching to recurring week event mode');
        onVerticalDragDetected({
          weekdays: dragState.selection.weekdays,
          startDate: dragState.selection.startDate,
          endDate: dragState.selection.endDate,
        });
        completeSelection();
        return;
      }

      const selection = handleMouseUp();
      if (selection && dragState.mode === 'horizontal_select') {
        // User completed horizontal drag - create recurring weekday events
        console.log('✅ Weekday selection complete:', selection);
        onWeekdaySelectionComplete(selection);
      }
    };

    if (dragState.mode !== 'idle' || resizeState.isResizing) {
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      return () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [
    enabled,
    dragState,
    resizeState,
    calendarGridRef,
    monthStart,
    handleMouseMove,
    handleMouseUp,
    handleResize,
    endResize,
    completeSelection,
    onWeekdaySelectionComplete,
    onVerticalDragDetected,
  ]);

  // Expose handleMouseDown to parent via data attribute or callback
  // For now, we'll use a custom event
  useEffect(() => {
    if (!enabled || !calendarGridRef.current) return;

    const handleDayCellMouseDown = (e: Event) => {
      const customEvent = e as CustomEvent<{ date: Date; mouseEvent: React.MouseEvent }>;
      handleMouseDown(customEvent.detail.mouseEvent, customEvent.detail.date);
    };

    calendarGridRef.current.addEventListener('multiday-mousedown', handleDayCellMouseDown);

    return () => {
      calendarGridRef.current?.removeEventListener('multiday-mousedown', handleDayCellMouseDown);
    };
  }, [enabled, calendarGridRef, handleMouseDown]);

  // Render the weekday placeholder if we have a selection
  if (!enabled || !dragState.selection || dragState.mode === 'idle') {
    return null;
  }

  return (
    <WeekdayPlaceholder
      selection={dragState.selection}
      calendarGridRef={calendarGridRef}
      monthStart={monthStart}
      onResizeStart={startResize}
      showResizeHandles={dragState.mode === 'creating'}
    />
  );
};

export default MonthViewMultiDayDrag;
