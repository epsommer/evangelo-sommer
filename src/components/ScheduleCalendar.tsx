"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMinutes, parseISO, startOfDay, differenceInDays, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { Calendar, Clock, MapPin, User, MoreVertical, Edit, CheckCircle, Trash2, Repeat } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents';
import DropdownMenu from '@/components/ui/DropdownMenu';
import { DragDropProvider, useDragDrop } from '@/components/DragDropContext';
import DropZone from '@/components/DropZone';
import DragAndDropEvent from '@/components/DragAndDropEvent';
import CalendarEvent from '@/components/calendar/CalendarEvent';
import RescheduleConfirmationModal from '@/components/RescheduleConfirmationModal';
import ResizeConfirmationModal from '@/components/ResizeConfirmationModal';
import DragVisualFeedback from '@/components/DragVisualFeedback';
import { ClientNotificationService } from '@/lib/client-notification-service';
import { UnifiedEvent } from '@/components/EventCreationModal';
import { calculateDragDropTimes } from '@/utils/calendar';
import { VerticalWeekPreview } from '@/hooks/useEventResize';
import { WeeklyInstanceDates, VerticalResizeWeekInfo, calculateContinuousWeekExtension } from '@/utils/calendar/resizeCalculations';

// Safe date formatting utility
const safeFormatDate = (dateValue: string | Date | undefined, formatStr: string, fallback: string = '--:--'): string => {
  try {
    if (!dateValue) return fallback;
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return isNaN(date.getTime()) ? fallback : format(date, formatStr);
  } catch {
    return fallback;
  }
};

// Safe string property accessor
const safeString = (value: any, fallback: string = 'Unknown'): string => {
  return (typeof value === 'string' && value.trim()) ? value : fallback;
};

interface ScheduledService {
  id: string;
  title: string;
  service: string;
  clientName: string;
  scheduledDate: string;
  notes?: string;
  priority: string;
  status: string;
  duration: number;
  googleCalendarId?: string;
  clientId?: string;
  location?: string;
  recurrence?: string;
}

// Placeholder event data interface (matches time-manager page)
interface PlaceholderEventData {
  date: string;
  hour: number;
  minutes?: number;
  duration: number;
  title?: string;
  endDate?: string;
  endHour?: number;
  endMinutes?: number;
  weeklyRecurrenceEnd?: string; // For vertical resize: end date for weekly recurrence
  weeklyRecurrenceCount?: number; // For vertical resize: number of weeks to recur
}

interface ScheduleCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onDayClick?: (date: Date) => void;
  onDayDoubleClick?: (date: Date, hour?: number) => void;
  onEventEdit?: (event: any) => void;
  onEventView?: (event: any) => void;
  onEventDelete?: (eventId: string) => void;
  onEventStatusChange?: (eventId: string, status: string) => void;
  enableEditing?: boolean;
  refreshTrigger?: number;
  placeholderEvent?: PlaceholderEventData | null;
  onPlaceholderChange?: (placeholder: PlaceholderEventData | null) => void;
  // When true, vertical week resize creates a continuous multi-day event instead of recurring weekly events
  // Default is false (creates recurring weekly events)
  useMultiDayForWeekResize?: boolean;
}

/**
 * MonthDragGhostPreview - Shows a dashed ghost preview at the target day cell during drag
 * Spans multiple days for multi-day events
 */
const MonthDragGhostPreview: React.FC<{
  calendarGridRef: React.RefObject<HTMLDivElement | null>;
}> = ({ calendarGridRef }) => {
  const { dragState, dropZoneState } = useDragDrop();

  // Only show when dragging and there's an active drop zone
  if (!dragState.isDragging || !dragState.draggedEvent || !dropZoneState.activeDropZone) {
    return null;
  }

  const { draggedEvent } = dragState;
  const { activeDropZone } = dropZoneState;

  if (!calendarGridRef.current) return null;

  // Calculate the day span from the original event
  let daySpan = 1;
  if (draggedEvent.isMultiDay && draggedEvent.startDateTime && draggedEvent.endDateTime) {
    const originalStart = startOfDay(parseISO(draggedEvent.startDateTime));
    const originalEnd = startOfDay(parseISO(draggedEvent.endDateTime));
    daySpan = Math.max(1, differenceInDays(originalEnd, originalStart) + 1);
  }

  // Find the target (start) day cell
  const targetCell = calendarGridRef.current.querySelector(
    `[data-date="${activeDropZone.date}"]`
  );

  if (!targetCell) return null;

  // Find the week row containing the target cell
  const weekRow = targetCell.closest('[data-week-row]');
  if (!weekRow) return null;

  // Get all day cells in this week row to calculate position and clamp span
  const weekCells = Array.from(weekRow.querySelectorAll('[data-date]'));
  const targetIndex = weekCells.indexOf(targetCell);

  if (targetIndex === -1) return null;

  // Clamp day span to not exceed the week boundary (7 - targetIndex)
  const maxSpanInWeek = 7 - targetIndex;
  const actualDaySpan = Math.min(daySpan, maxSpanInWeek);

  // Get the first and last cell for this span
  const firstCell = weekCells[targetIndex];
  const lastCell = weekCells[targetIndex + actualDaySpan - 1] || weekCells[weekCells.length - 1];

  const gridRect = calendarGridRef.current.getBoundingClientRect();
  const firstCellRect = firstCell.getBoundingClientRect();
  const lastCellRect = lastCell.getBoundingClientRect();

  // Calculate position and width spanning multiple cells
  const left = firstCellRect.left - gridRect.left;
  const top = firstCellRect.top - gridRect.top;
  const width = (lastCellRect.right - firstCellRect.left);

  // Format time for display
  const eventTime = draggedEvent.startDateTime
    ? format(parseISO(draggedEvent.startDateTime), 'h:mm a')
    : '';

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${left + 4}px`,
        top: `${top + 28}px`, // Below the day number
        width: `${width - 8}px`,
        zIndex: 50,
      }}
    >
      <div className="bg-accent/20 border-2 border-accent border-dashed rounded-md p-1.5 flex items-center justify-between gap-2">
        <div className="text-accent font-medium text-xs truncate flex-1">
          {draggedEvent.title}
        </div>
        <div className="text-accent/70 text-[10px] whitespace-nowrap">
          {actualDaySpan > 1 ? `${actualDaySpan} days` : eventTime}
        </div>
      </div>
    </div>
  );
};

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  selectedDate = (() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()) })(),
  onDateSelect,
  onDayClick,
  onDayDoubleClick,
  onEventEdit,
  onEventView,
  onEventDelete,
  onEventStatusChange,
  enableEditing = false,
  refreshTrigger,
  placeholderEvent = null,
  onPlaceholderChange,
  useMultiDayForWeekResize = false
}) => {
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledService | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<ScheduledService | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<any>(null);
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [resizeData, setResizeData] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

  // Multi-day placeholder drag creation state
  const [isDragCreating, setIsDragCreating] = useState(false);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);
  const [dragCurrentDate, setDragCurrentDate] = useState<Date | null>(null);
  const dragStartRef = useRef<{ date: Date; isDoubleClick: boolean } | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const DOUBLE_CLICK_WINDOW = 500; // ms - matches typical browser double-click threshold
  const DEFAULT_HOUR = 9; // Default start hour for month view events

  // Placeholder resize/drag state for interactive manipulation
  const [placeholderInteraction, setPlaceholderInteraction] = useState<{
    type: 'resize' | 'drag';
    handle?: 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    startX: number;
    startY: number;
    initialStart: string;
    initialEnd: string;
    initialWeekRow?: number;
  } | null>(null);

  // Event resize preview state for showing visual feedback during horizontal resize
  const [resizePreview, setResizePreview] = useState<{
    eventId: string;
    previewStart: string;
    previewEnd: string;
    daySpan: number;
    isMultiDay: boolean;
  } | null>(null);

  // Vertical week resize preview for showing duplicate events in target week rows
  const [verticalWeekResizePreview, setVerticalWeekResizePreview] = useState<VerticalWeekPreview | null>(null);

  // Placeholder vertical week resize preview for showing recurring event previews
  const [placeholderVerticalPreview, setPlaceholderVerticalPreview] = useState<{
    startWeekRow: number;
    endWeekRow: number;
    weekRowsSpanned: number;
    initialWeekRow: number; // Track which row started the resize
  } | null>(null);

  // Use unified events hook
  const { events: unifiedEvents, updateEvent, refreshEvents } = useUnifiedEvents({ syncWithLegacy: true, refreshTrigger });

  // Clear placeholder vertical preview when placeholder is dismissed
  useEffect(() => {
    if (!placeholderEvent) {
      setPlaceholderVerticalPreview(null);
    }
  }, [placeholderEvent]);

  // Click outside handler - dismiss placeholder when clicking anywhere except:
  // 1. On the placeholder itself
  // 2. On the sidebar/form area
  useEffect(() => {
    if (!placeholderEvent || !onPlaceholderChange) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is on the placeholder itself (has data-placeholder attribute)
      if (target.closest('[data-placeholder]')) {
        return; // Click is on placeholder, don't dismiss
      }

      // Check if click is inside the sidebar/action area (don't dismiss when interacting with form)
      if (target.closest('[data-sidebar]') || target.closest('[data-action-sidebar]')) {
        return;
      }

      // Click is elsewhere (another day cell, outside calendar, etc.) - dismiss the placeholder
      onPlaceholderChange(null);
    };

    // Use mousedown to catch clicks before they might be prevented
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [placeholderEvent, onPlaceholderChange]);

  // Load scheduled services from localStorage
  useEffect(() => {
    try {
      const services = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
      setScheduledServices(services);
      console.log('📅 Calendar loaded schedules:', services.length);
    } catch (error) {
      console.error('Error loading scheduled services for calendar:', error);
    }
  }, [refreshTrigger]);

  // Get days in current month
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Check if an event is multi-day
  const isEventMultiDay = (event: UnifiedEvent): boolean => {
    if (event.isMultiDay) return true;
    if (!event.endDateTime) return false;
    const startDate = startOfDay(new Date(event.startDateTime));
    const endDate = startOfDay(new Date(event.endDateTime));
    return !isSameDay(startDate, endDate);
  };

  // Check if a date falls within an event's range
  const isDateInEventRange = (date: Date, event: UnifiedEvent): boolean => {
    const eventStart = startOfDay(new Date(event.startDateTime));
    const eventEnd = event.endDateTime
      ? startOfDay(new Date(event.endDateTime))
      : eventStart;
    const checkDate = startOfDay(date);
    return checkDate >= eventStart && checkDate <= eventEnd;
  };

  // Check if a recurring event should appear on a specific date
  const isRecurringEventOnDate = (event: UnifiedEvent, date: Date): boolean => {
    if (!event.isRecurring || !event.recurrence) return false;

    const eventStart = startOfDay(new Date(event.startDateTime));
    const checkDate = startOfDay(date);

    // Event must have started by this date
    if (checkDate < eventStart) return false;

    // Check if within recurrence end date
    if (event.recurrence.endDate) {
      const endDate = startOfDay(new Date(event.recurrence.endDate));
      if (checkDate > endDate) return false;
    }

    // Check recurrence pattern
    const daysDiff = differenceInDays(checkDate, eventStart);
    const frequency = event.recurrence.frequency;
    const interval = event.recurrence.interval || 1;

    switch (frequency) {
      case 'daily':
        return daysDiff % interval === 0;
      case 'weekly':
        // Check if same day of week and within interval
        const weeksDiff = Math.floor(daysDiff / 7);
        return checkDate.getDay() === eventStart.getDay() && weeksDiff % interval === 0;
      case 'monthly':
        // Check if same day of month and within interval
        const monthsDiff = (checkDate.getFullYear() - eventStart.getFullYear()) * 12 +
                          (checkDate.getMonth() - eventStart.getMonth());
        return checkDate.getDate() === eventStart.getDate() && monthsDiff % interval === 0;
      case 'yearly':
        // Check if same month and day
        return checkDate.getMonth() === eventStart.getMonth() &&
               checkDate.getDate() === eventStart.getDate();
      default:
        return false;
    }
  };

  // Get single-day events for a specific date (excludes multi-day events, includes recurring)
  const getSingleDayEventsForDate = (date: Date, weekStart?: Date, weekEnd?: Date) => {
    const servicesForDate = scheduledServices.filter(service => {
      const serviceDate = new Date(service.scheduledDate);
      return isSameDay(serviceDate, date);
    });

    // Get the consecutive recurring groups for this week if provided
    const recurringGroups = weekStart && weekEnd
      ? getConsecutiveRecurringEventGroups(weekStart, weekEnd)
      : new Map();

    const unifiedEventsForDate = unifiedEvents.filter(event => {
      // Exclude multi-day spanning events (they're rendered separately)
      if (isEventMultiDay(event)) return false;

      // Check if this is a recurring event that should appear on this date
      if (event.isRecurring) {
        // Check if this event is part of a merged group (consecutive daily recurring)
        // If so, exclude it from single-day rendering
        if (recurringGroups.has(event.id)) {
          return false;
        }

        // For linked weekly instances (have recurrenceGroupId but no recurrence pattern),
        // check if the event's startDateTime falls on this date
        if (event.recurrenceGroupId && !event.recurrence) {
          const eventDate = new Date(event.startDateTime);
          return isSameDay(eventDate, date);
        }

        return isRecurringEventOnDate(event, date);
      }

      // For non-recurring events, check if it starts on this date
      const eventDate = new Date(event.startDateTime);
      return isSameDay(eventDate, date);
    });

    return [...servicesForDate, ...unifiedEventsForDate];
  };

  // Group consecutive daily recurring events that should be merged visually
  // Returns a map of event IDs to their consecutive date ranges within the week
  const getConsecutiveRecurringEventGroups = (weekStart: Date, weekEnd: Date): Map<string, { start: Date; end: Date; event: UnifiedEvent }> => {
    const groups = new Map<string, { start: Date; end: Date; event: UnifiedEvent }>();

    // Find all daily recurring events that appear in this week
    const dailyRecurringEvents = unifiedEvents.filter(event =>
      event.isRecurring &&
      event.recurrence?.frequency === 'daily' &&
      event.recurrence?.interval === 1 // Only merge events that repeat every day
    );

    dailyRecurringEvents.forEach(event => {
      // Find consecutive days this event appears within the week
      let firstDay: Date | null = null;
      let lastDay: Date | null = null;
      let consecutiveCount = 0;

      // Check each day in the week
      for (let day = new Date(weekStart); day <= weekEnd; day = addDays(day, 1)) {
        if (isRecurringEventOnDate(event, day)) {
          if (!firstDay) {
            firstDay = new Date(day);
          }
          lastDay = new Date(day);
          consecutiveCount++;
        } else if (firstDay && lastDay) {
          // Non-consecutive gap found, break
          break;
        }
      }

      // Only create a group if there are at least 2 consecutive days
      if (firstDay && lastDay && consecutiveCount >= 2) {
        groups.set(event.id, {
          start: firstDay,
          end: lastDay,
          event
        });
      }
    });

    return groups;
  };

  // Get multi-day events for a week row (events that span across days in this week)
  // This now includes both true multi-day events AND merged consecutive recurring events
  const getMultiDayEventsForWeekRow = (weekStart: Date, weekEnd: Date): UnifiedEvent[] => {
    // Get true multi-day events (non-recurring events that span multiple days)
    // Also include linked weekly instances (have recurrenceGroupId but no recurrence pattern)
    const multiDayEvents = unifiedEvents.filter(event => {
      if (!isEventMultiDay(event)) return false;

      // Allow linked weekly instances (have recurrenceGroupId but no recurrence pattern)
      const isLinkedWeeklyInstance = event.isRecurring && event.recurrenceGroupId && !event.recurrence;

      // Exclude true recurring events from multi-day display - they're handled separately
      // But allow linked weekly instances to pass through
      if (event.isRecurring && !isLinkedWeeklyInstance) return false;

      const eventStart = new Date(event.startDateTime);
      const eventEnd = event.endDateTime ? new Date(event.endDateTime) : eventStart;

      // Check if any part of this event overlaps with the week
      return eventStart <= weekEnd && eventEnd >= weekStart;
    });

    // Get consecutive recurring event groups (these will be rendered like multi-day events)
    const recurringGroups = getConsecutiveRecurringEventGroups(weekStart, weekEnd);

    // Convert recurring groups to pseudo-multi-day events for rendering
    // We create synthetic events with adjusted start/end times to represent the merged span
    const mergedRecurringEvents: UnifiedEvent[] = [];
    recurringGroups.forEach(({ start, end, event }) => {
      // Create a synthetic event that represents the merged span
      // This allows us to reuse the multi-day rendering logic
      const syntheticEvent: UnifiedEvent = {
        ...event,
        // Mark as a merged recurring event for special handling
        isMultiDay: true,
        isMergedRecurring: true,
        // Adjust startDateTime to the first day of the consecutive span
        startDateTime: format(start, 'yyyy-MM-dd') + 'T' + format(parseISO(event.startDateTime), 'HH:mm:ss'),
        // Adjust endDateTime to the last day of the consecutive span
        endDateTime: format(end, 'yyyy-MM-dd') + 'T' + format(parseISO(event.endDateTime || event.startDateTime), 'HH:mm:ss')
      };
      mergedRecurringEvents.push(syntheticEvent);
    });

    return [...multiDayEvents, ...mergedRecurringEvents];
  };

  // Calculate multi-day event position within a week row
  // Uses percentage-based positioning since events are absolutely positioned (gridColumn won't work)
  const getMultiDayEventStyle = (event: UnifiedEvent, weekStart: Date, weekEnd: Date): React.CSSProperties => {
    const eventStart = startOfDay(new Date(event.startDateTime));
    const eventEnd = event.endDateTime
      ? startOfDay(new Date(event.endDateTime))
      : eventStart;

    // Clamp to week boundaries
    const displayStart = eventStart < weekStart ? weekStart : eventStart;
    const displayEnd = eventEnd > weekEnd ? weekEnd : eventEnd;

    // Calculate column positions (0-6 for Sun-Sat)
    const startCol = differenceInDays(displayStart, weekStart);
    const endCol = differenceInDays(displayEnd, weekStart);
    const span = endCol - startCol + 1;

    // Use percentage-based positioning for absolute elements
    const colWidthPercent = 100 / 7;
    const leftPercent = startCol * colWidthPercent;
    const widthPercent = span * colWidthPercent;

    return {
      left: `calc(${leftPercent}% + 4px)`,
      width: `calc(${widthPercent}% - 8px)`,
    };
  };

  // Get events for a specific date (including unified events) - for backward compatibility
  const getEventsForDate = (date: Date) => {
    return getSingleDayEventsForDate(date);
  };

  // Drag and drop handlers
  const handleEventDrop = async (event: UnifiedEvent, fromSlot: { date: string; hour: number; minute?: number }, toSlot: { date: string; hour: number; minute?: number }) => {
    console.log('📅 Month view event drop:', { event, fromSlot, toSlot });

    // Check if event has participants - only show confirmation if it does
    const hasParticipants = event.participants && event.participants.length > 0;

    if (hasParticipants) {
      // Show confirmation modal for events with participants
      const rescheduleInfo = {
        event,
        fromSlot,
        toSlot
      };
      setRescheduleData(rescheduleInfo);
      setShowRescheduleModal(true);
    } else {
      // Directly reschedule events without participants
      const rescheduleInfo = {
        event,
        fromSlot,
        toSlot
      };
      await handleRescheduleConfirm(rescheduleInfo, false);
    }
  };

  const handleEventResize = async (event: UnifiedEvent, newStartTime: string, newEndTime: string, isMultiDay?: boolean) => {
    console.log('📅 Month view event resize:', { event, newStartTime, newEndTime, isMultiDay });

    // Determine if the resized event is now multi-day
    const newStart = startOfDay(new Date(newStartTime));
    const newEnd = startOfDay(new Date(newEndTime));
    const isNowMultiDay = isMultiDay ?? !isSameDay(newStart, newEnd);

    // For recurring events in month view, vertical resize should extend the recurrence pattern
    const isRecurringVerticalResize = event.isRecurring && !isNowMultiDay;

    // Check if event has participants - only show confirmation if it does
    const hasParticipants = event.participants && event.participants.length > 0;

    if (hasParticipants || isRecurringVerticalResize) {
      // Show confirmation modal for events with participants or recurring events being extended
      const resizeInfo = {
        event,
        originalStart: event.startDateTime,
        originalEnd: event.endDateTime || addMinutes(parseISO(event.startDateTime), event.duration).toISOString(),
        newStart: newStartTime,
        newEnd: newEndTime,
        handle: 'bottom' as const,
        isMultiDay: isNowMultiDay,
        isRecurringExtension: isRecurringVerticalResize
      };
      setResizeData(resizeInfo);
      setShowResizeModal(true);
    } else {
      // Directly resize events without participants
      try {
        const updates: Record<string, any> = {
          startDateTime: newStartTime,
          endDateTime: newEndTime,
          duration: Math.round((new Date(newEndTime).getTime() - new Date(newStartTime).getTime()) / (1000 * 60)),
          isMultiDay: isNowMultiDay
        };

        await updateEvent(event.id, updates);
        console.log('✅ Event resized directly:', event.title, isNowMultiDay ? '(multi-day)' : '(single-day)');
      } catch (error) {
        console.error('❌ Error resizing event:', error);
      }
    }
  };

  // Handle resize preview updates for visual feedback during horizontal resize
  const handleResizePreview = (event: UnifiedEvent, previewStart: string, previewEnd: string, daySpan: number, isMultiDay: boolean) => {
    setResizePreview({
      eventId: event.id,
      previewStart,
      previewEnd,
      daySpan,
      isMultiDay
    });
  };

  // Handle vertical week resize preview for showing duplicate events in target week rows
  const handleVerticalWeekResizePreview = useCallback((preview: VerticalWeekPreview | null) => {
    setVerticalWeekResizePreview(preview);
  }, []);

  // Handle vertical week resize end - creates recurring weekly events by default
  // or extends as continuous multi-day event if corner handle or useMultiDayForWeekResize is true
  const handleVerticalWeekResize = useCallback(async (
    event: UnifiedEvent,
    weekInfo: VerticalResizeWeekInfo,
    instances: WeeklyInstanceDates[]
  ) => {
    // Clear both previews - resizePreview is also set during vertical resize
    // and handleResizeEnd is not called for vertical week resize (returns early in useEventResize)
    setVerticalWeekResizePreview(null);
    setResizePreview(null);

    if (!weekInfo.isVerticalWeekResize || instances.length <= 1) {
      return; // No vertical resize occurred
    }

    try {
      // Use continuous extension mode if:
      // 1. useMultiDayForWeekResize prop is true, OR
      // 2. User is using a corner handle (which always extends continuously)
      const useContinuousExtension = useMultiDayForWeekResize || weekInfo.isCornerResize;

      if (useContinuousExtension) {
        // MULTI-DAY MODE: Extend as continuous multi-day event spanning weeks
        const extension = calculateContinuousWeekExtension(event, weekInfo, monthStart);

        await updateEvent(event.id, {
          startDateTime: extension.newStartDateTime,
          endDateTime: extension.newEndDateTime,
          isMultiDay: extension.daySpan > 1,
          duration: extension.daySpan * 24 * 60
        });

        console.log(`✅ Extended event "${event.title}" to span ${extension.weekRowsSpanned} weeks (${extension.daySpan} days)`);
      } else {
        // RECURRING MODE (DEFAULT): Create weekly recurring event instances via API
        const response = await fetch('/api/events/weekly-recurrence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceEventId: event.id,
            weeklyInstances: instances.map(inst => ({
              startDateTime: inst.startDateTime,
              endDateTime: inst.endDateTime,
              weekRow: inst.weekRow
            })),
            direction: weekInfo.direction
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to create weekly recurring events:', errorData);
          return;
        }

        // Refresh events to show the new instances
        await refreshEvents();
        console.log(`✅ Created ${instances.length} weekly recurring instances for "${event.title}"`);
      }
    } catch (error) {
      console.error('Error handling vertical week resize:', error);
    }
  }, [monthStart, updateEvent, useMultiDayForWeekResize, refreshEvents]);

  // Clear resize preview when resize ends
  const handleResizeEnd = (event: UnifiedEvent, newStartTime: string, newEndTime: string, isMultiDay?: boolean) => {
    // Always clear both previews first
    setResizePreview(null);
    setVerticalWeekResizePreview(null);

    // Only call resize handler if times actually changed
    const originalStart = event.startDateTime;
    const originalEnd = event.endDateTime || event.startDateTime;

    // Normalize for comparison (remove milliseconds differences)
    const normalizeTime = (t: string) => t.slice(0, 19);
    const timesChanged = normalizeTime(newStartTime) !== normalizeTime(originalStart) ||
                         normalizeTime(newEndTime) !== normalizeTime(originalEnd);

    if (timesChanged) {
      handleEventResize(event, newStartTime, newEndTime);
    }
  };

  const handleRescheduleConfirm = async (data: any, notifyParticipants: boolean) => {
    try {
      console.group('🎯 [ScheduleCalendar] handleRescheduleConfirm');
      console.log('Event:', data.event.title, data.event.id);
      console.log('From slot:', data.fromSlot);
      console.log('To slot:', data.toSlot);

      // Use the new drag calculation utility for accurate time mapping
      const { newStartDateTime, newEndDateTime, duration } = calculateDragDropTimes(
        data.event,
        data.fromSlot,
        data.toSlot
      );

      const newStart = newStartDateTime;
      const newEnd = newEndDateTime;

      const updates = {
        startDateTime: newStart,
        endDateTime: newEnd,
        notes: data.reason ?
          `${data.event.notes || ''}

Rescheduled: ${data.reason}`.trim() :
          data.event.notes
      };

      console.log('Applying updates:', updates);
      await updateEvent(data.event.id, updates);
      console.log('✅ Event rescheduled successfully');
      console.groupEnd();

      // Send notifications if requested
      if (notifyParticipants) {
        try {
          const participants = ClientNotificationService.extractParticipants(data.event);

          if (participants.length > 0) {
            const newEvent = {
              ...data.event,
              startDateTime: newStart,
              endDateTime: newEnd,
              updatedAt: new Date().toISOString()
            };

            const result = await ClientNotificationService.sendRescheduleNotification({
              originalEvent: data.event,
              newEvent,
              participants,
              reason: data.reason
            });

            if (result.success && result.results) {
              console.log(`📧 Reschedule notifications sent to ${result.results.successful} participant(s)`);
            }
          }
        } catch (error) {
          console.error('❌ Error sending reschedule notifications:', error);
        }
      }

      setShowRescheduleModal(false);
      setRescheduleData(null);
    } catch (error) {
      console.error('❌ Error rescheduling event:', error);
      throw error;
    }
  };

  const handleResizeConfirm = async (data: any, notifyParticipants: boolean) => {
    try {
      // Determine if the resized event is multi-day
      const newStart = startOfDay(new Date(data.newStart));
      const newEnd = startOfDay(new Date(data.newEnd));
      const isNowMultiDay = data.isMultiDay ?? !isSameDay(newStart, newEnd);

      const updates: Record<string, any> = {
        startDateTime: data.newStart,
        endDateTime: data.newEnd,
        duration: Math.round((new Date(data.newEnd).getTime() - new Date(data.newStart).getTime()) / (1000 * 60)),
        isMultiDay: isNowMultiDay,
        notes: data.reason ?
          `${data.event.notes || ''}

Duration changed: ${data.reason}`.trim() :
          data.event.notes
      };

      // For recurring events, update the recurrence end date when vertically resized
      if (data.isRecurringExtension && data.event.recurrence) {
        updates.recurrence = {
          ...data.event.recurrence,
          endDate: format(newEnd, 'yyyy-MM-dd')
        };
        console.log('📅 Extending recurring event pattern to:', format(newEnd, 'yyyy-MM-dd'));
      }

      await updateEvent(data.event.id, updates);
      console.log('✅ Event resized:', data.event.title, isNowMultiDay ? '(multi-day)' : data.isRecurringExtension ? '(recurrence extended)' : '(single-day)');

      // Send notifications if requested
      if (notifyParticipants) {
        try {
          const participants = ClientNotificationService.extractParticipants(data.event);

          if (participants.length > 0) {
            const updatedEvent = {
              ...data.event,
              startDateTime: data.newStart,
              endDateTime: data.newEnd,
              updatedAt: new Date().toISOString()
            };

            // TODO: Implement resize notification service
            console.log('📧 Would send resize notifications to:', participants);
          }
        } catch (error) {
          console.error('❌ Error sending resize notifications:', error);
        }
      }

      setShowResizeModal(false);
      setResizeData(null);
    } catch (error) {
      console.error('❌ Error resizing event:', error);
      throw error;
    }
  };

  // Handle editing a scheduled service
  const handleEditSchedule = (schedule: ScheduledService) => {
    setEditingSchedule(schedule);
  };

  // Handle updating a scheduled service
  const handleUpdateSchedule = (updatedSchedule: ScheduledService) => {
    try {
      const allScheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
      const updatedServices = allScheduledServices.map((service: any) =>
        service.id === updatedSchedule.id ? updatedSchedule : service
      );
      localStorage.setItem('scheduled-services', JSON.stringify(updatedServices));

      setScheduledServices(prev => prev.map(service =>
        service.id === updatedSchedule.id ? updatedSchedule : service
      ));

      setEditingSchedule(null);
      console.log('✅ Schedule updated successfully');
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  // Handle deleting a scheduled service
  const handleDeleteSchedule = (scheduleId: string) => {
    if (confirm('Are you sure you want to delete this scheduled service?')) {
      try {
        const allScheduledServices = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
        const updatedServices = allScheduledServices.filter((service: any) => service.id !== scheduleId);
        localStorage.setItem('scheduled-services', JSON.stringify(updatedServices));

        setScheduledServices(prev => prev.filter(service => service.id !== scheduleId));
        console.log('✅ Schedule deleted successfully');
      } catch (error) {
        console.error('Error deleting schedule:', error);
      }
    }
  };

  // Store handlers in refs to avoid stale closures when adding listeners synchronously
  const handleDayMouseMoveRef = useRef<((e: MouseEvent) => void) | undefined>(undefined);
  const handleDayMouseUpRef = useRef<(() => void) | undefined>(undefined);

  // Multi-day placeholder drag creation handlers
  const handleDayMouseDown = useCallback((e: React.MouseEvent, day: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;

    // Don't start day drag if we're in a placeholder resize/drag interaction
    if (placeholderInteraction) return;

    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    console.log('🖱️ Mouse down on day:', format(day, 'yyyy-MM-dd'), 'timeSinceLastClick:', timeSinceLastClick);

    // Check if this is within double-click window (second click of double-click)
    if (timeSinceLastClick < DOUBLE_CLICK_WINDOW) {
      // Start tracking for potential drag
      e.preventDefault();
      dragStartRef.current = { date: day, isDoubleClick: true };
      setDragStartDate(day);
      setDragCurrentDate(day);
      // Clear any previous vertical preview state to prevent it from being applied to new placeholder
      setPlaceholderVerticalPreview(null);
      console.log('🎯 Double-click detected - starting drag tracking for day:', format(day, 'yyyy-MM-dd'));

      // Add listeners IMMEDIATELY (not via useEffect) to catch the mouseup
      // Use the refs to get the latest handler versions
      const moveHandler = (ev: MouseEvent) => handleDayMouseMoveRef.current?.(ev);
      const upHandler = () => {
        handleDayMouseUpRef.current?.();
        // Clean up listeners after mouseup
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
      };
      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
    }

    lastClickTimeRef.current = now;
  }, [placeholderInteraction]);

  const handleDayMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current || !calendarGridRef.current) return;

    // Find which day cell we're over using actual DOM element positions
    const weekRows = calendarGridRef.current.querySelectorAll('[data-week-row]');
    let targetDate: Date | null = null;

    weekRows.forEach((row) => {
      const rowRect = row.getBoundingClientRect();

      // Check if mouse Y is within this row
      if (e.clientY >= rowRect.top && e.clientY <= rowRect.bottom) {
        // Find the day cells grid within this row
        const dayCellsGrid = row.querySelector('.grid-cols-7');
        if (dayCellsGrid) {
          const gridRect = dayCellsGrid.getBoundingClientRect();

          // Calculate column directly from mouse X position relative to grid
          // This is more reliable than checking individual cell bounds
          const relativeX = Math.max(0, e.clientX - gridRect.left);
          const cellWidth = gridRect.width / 7;

          // Use Math.floor but add 0.5 to get the cell the mouse center is closest to
          // Then clamp to valid range 0-6
          let colIndex = Math.floor(relativeX / cellWidth);
          colIndex = Math.max(0, Math.min(6, colIndex));

          const weekStartStr = row.getAttribute('data-week-start');
          if (weekStartStr) {
            // Append T00:00:00 to force local time parsing (without it, JS parses as UTC which shifts the date)
            const weekStart = new Date(weekStartStr + 'T00:00:00');
            targetDate = addDays(weekStart, colIndex);
          }
        }
      }
    });

    if (targetDate && dragStartRef.current.isDoubleClick) {
      // Start drag mode if we've moved to a different day
      if (!isDragCreating && !isSameDay(targetDate, dragStartRef.current.date)) {
        setIsDragCreating(true);
        console.log('📐 Started multi-day drag from:', format(dragStartRef.current.date, 'yyyy-MM-dd'));
      }

      setDragCurrentDate(targetDate);

      // Update placeholder with multi-day span
      if (onPlaceholderChange) {
        const startDate = dragStartRef.current.date;
        const endDate = targetDate as Date; // Type assertion - we know targetDate is not null here

        // Ensure start is before end
        const [actualStart, actualEnd] = startDate.getTime() <= endDate.getTime()
          ? [startDate, endDate]
          : [endDate, startDate];

        const daySpan = differenceInDays(actualEnd, actualStart) + 1;
        // For multi-day placeholders, use 15-minute duration
        // This will create a multi-day spanning event (not recurring)
        const duration = 15; // 15 minutes default

        console.log('📅 Multi-day placeholder update:', {
          start: format(actualStart, 'yyyy-MM-dd'),
          end: format(actualEnd, 'yyyy-MM-dd'),
          daySpan,
          duration
        });

        onPlaceholderChange({
          date: format(actualStart, 'yyyy-MM-dd'),
          hour: DEFAULT_HOUR,
          minutes: 0,
          duration: duration,
          endDate: format(actualEnd, 'yyyy-MM-dd'),
          endHour: DEFAULT_HOUR, // End time hour
          endMinutes: 15 // End time minutes
        });
      }
    }
  }, [isDragCreating, onPlaceholderChange]);

  const handleDayMouseUp = useCallback(() => {
    console.log('🖱️ Mouse up - isDragCreating:', isDragCreating, 'hasDoubleClick:', !!dragStartRef.current?.isDoubleClick);

    if (dragStartRef.current?.isDoubleClick && !isDragCreating) {
      // Single double-click without drag - create single-day placeholder
      const day = dragStartRef.current.date;
      console.log('📌 Creating single-day placeholder for:', format(day, 'yyyy-MM-dd'));
      if (onDayDoubleClick) {
        onDayDoubleClick(day, DEFAULT_HOUR);
      }
    } else if (isDragCreating && dragStartRef.current) {
      // Multi-day drag completed - trigger event creation mode
      // The placeholder has already been set via onPlaceholderChange during drag
      // Now we need to open the event creation form in the sidebar
      const day = dragStartRef.current.date;
      console.log('✅ Multi-day drag completed - opening event creation form');
      if (onDayDoubleClick) {
        onDayDoubleClick(day, DEFAULT_HOUR);
      }
    }

    // Reset drag state
    dragStartRef.current = null;
    setIsDragCreating(false);
  }, [isDragCreating, onDayDoubleClick]);

  // Keep handler refs up to date for the synchronously-added listeners
  useEffect(() => {
    handleDayMouseMoveRef.current = handleDayMouseMove;
    handleDayMouseUpRef.current = handleDayMouseUp;
  }, [handleDayMouseMove, handleDayMouseUp]);

  // Ref to track current placeholder during resize/drag (avoids stale closure issues)
  const placeholderRef = useRef(placeholderEvent);
  useEffect(() => {
    placeholderRef.current = placeholderEvent;
  }, [placeholderEvent]);

  // Placeholder resize/drag handlers
  const handlePlaceholderResizeStart = useCallback((e: React.MouseEvent, handle: 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
    e.preventDefault();
    e.stopPropagation();
    const currentPlaceholder = placeholderRef.current;
    if (!currentPlaceholder?.endDate) {
      return;
    }

    // Find which week row the placeholder is in
    // This is computed BEFORE setting state so it can be used in the closure
    let initialWeekRowValue: number | undefined;
    if (calendarGridRef.current && (handle === 'top' || handle === 'bottom' || handle.includes('top') || handle.includes('bottom'))) {
      const weekRows = calendarGridRef.current.querySelectorAll('[data-week-row]');
      weekRows.forEach((row) => {
        const weekStartStr = row.getAttribute('data-week-start');
        if (weekStartStr) {
          const weekStart = new Date(weekStartStr + 'T00:00:00');
          const weekEnd = addDays(weekStart, 6);
          const placeholderStart = new Date(currentPlaceholder.date + 'T00:00:00');
          if (placeholderStart >= weekStart && placeholderStart <= weekEnd) {
            initialWeekRowValue = parseInt(row.getAttribute('data-week-row') || '0');
          }
        }
      });
    }

    setPlaceholderInteraction({
      type: 'resize',
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialStart: currentPlaceholder.date,
      initialEnd: currentPlaceholder.endDate,
      initialWeekRow: initialWeekRowValue
    });

    // Track vertical preview state in a mutable variable accessible to both handlers
    // This avoids stale React state issues since handleMouseUp can't access updated state
    let verticalPreviewInfo: { startWeekRow: number; endWeekRow: number; weekRowsSpanned: number } | null = null;

    // Add global mouse listeners for resize
    // Note: We use initialWeekRowValue from the closure, NOT placeholderInteraction.initialWeekRow
    // because React state updates are async and won't be available in this closure immediately
    const handleMouseMove = (ev: MouseEvent) => {
      const placeholder = placeholderRef.current;
      if (!calendarGridRef.current || !placeholder?.endDate) return;

      // Find which day cell and week row the mouse is over
      const weekRows = calendarGridRef.current.querySelectorAll('[data-week-row]');
      let foundDate: string | null = null;
      let foundWeekRow: number | null = null;

      weekRows.forEach((row) => {
        const dayCells = row.querySelectorAll('[data-date]');
        dayCells.forEach((cell) => {
          const rect = cell.getBoundingClientRect();
          if (ev.clientX >= rect.left && ev.clientX <= rect.right &&
              ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
            foundDate = cell.getAttribute('data-date');
            foundWeekRow = parseInt(row.getAttribute('data-week-row') || '0');
          }
        });
      });

      if (!foundDate || !onPlaceholderChange) return;

      const targetDate: string = foundDate;
      const endDateStr: string = placeholder.endDate;
      const startDateStr: string = placeholder.date;
      const targetDateObj = new Date(targetDate + 'T00:00:00');

      // Get week boundaries for the ORIGINAL placeholder's week row (not where cursor is now)
      // This constrains horizontal resize to the Sun-Sat boundary of the placeholder's row
      let weekStart: Date | null = null;
      let weekEnd: Date | null = null;
      const constraintWeekRow = initialWeekRowValue !== undefined ? initialWeekRowValue : foundWeekRow;
      weekRows.forEach((row) => {
        if (parseInt(row.getAttribute('data-week-row') || '0') === constraintWeekRow) {
          const weekStartStr = row.getAttribute('data-week-start');
          if (weekStartStr) {
            weekStart = new Date(weekStartStr + 'T00:00:00');
            weekEnd = addDays(weekStart, 6);
          }
        }
      });

      // Horizontal resize handles (left, right, and corners with horizontal component)
      if (handle === 'left' || handle === 'top-left' || handle === 'bottom-left') {
        // Resizing from the left - change start date
        // CONSTRAINT: Don't allow start to extend past the week row boundary (Sunday)
        let constrainedTarget = targetDate;
        // Note: weekStart may be set inside forEach - TypeScript doesn't track this correctly
        const weekStartDate = weekStart as Date | null;
        if (weekStartDate && targetDateObj < weekStartDate) {
          constrainedTarget = format(weekStartDate, 'yyyy-MM-dd');
        }
        // Don't allow start to go past end
        if (constrainedTarget <= endDateStr) {
          onPlaceholderChange({
            ...placeholder,
            date: constrainedTarget
          });
        }
      } else if (handle === 'right' || handle === 'top-right' || handle === 'bottom-right') {
        // Resizing from the right - change end date
        // CONSTRAINT: Don't allow end to extend past the week row boundary (Saturday)
        let constrainedTarget = targetDate;
        // Note: weekEnd may be set inside forEach - TypeScript doesn't track this correctly
        const weekEndDate = weekEnd as Date | null;
        if (weekEndDate && targetDateObj > weekEndDate) {
          constrainedTarget = format(weekEndDate, 'yyyy-MM-dd');
        }
        // Don't allow end to go before start
        if (constrainedTarget >= startDateStr) {
          onPlaceholderChange({
            ...placeholder,
            endDate: constrainedTarget
          });
        }
      }

      // Vertical resize handles (top, bottom) - create recurring weekly events preview
      // Use initialWeekRowValue from closure, NOT state (which would be stale)
      if ((handle === 'top' || handle === 'bottom' || handle.includes('top') || handle.includes('bottom')) &&
          foundWeekRow !== null && initialWeekRowValue !== undefined) {
        let startWeekRow = initialWeekRowValue;
        let endWeekRow = initialWeekRowValue;

        if (handle === 'top' || handle === 'top-left' || handle === 'top-right') {
          startWeekRow = Math.min(foundWeekRow, initialWeekRowValue);
          endWeekRow = initialWeekRowValue;
        } else if (handle === 'bottom' || handle === 'bottom-left' || handle === 'bottom-right') {
          startWeekRow = initialWeekRowValue;
          endWeekRow = Math.max(foundWeekRow, initialWeekRowValue);
        }

        const weekRowsSpanned = endWeekRow - startWeekRow + 1;

        if (weekRowsSpanned > 1) {
          // Store in local mutable variable for mouseUp handler
          verticalPreviewInfo = { startWeekRow, endWeekRow, weekRowsSpanned };
          setPlaceholderVerticalPreview({
            startWeekRow,
            endWeekRow,
            weekRowsSpanned,
            initialWeekRow: initialWeekRowValue
          });
        } else {
          verticalPreviewInfo = null;
          setPlaceholderVerticalPreview(null);
        }
      }
    };

    const handleMouseUp = () => {
      const placeholder = placeholderRef.current;

      // If we have a vertical resize spanning multiple weeks, update for weekly recurrence
      // IMPORTANT: We keep the original date range (e.g., Mon-Wed) and add recurrence info
      // We do NOT extend endDate to span all weeks continuously
      if (verticalPreviewInfo && verticalPreviewInfo.weekRowsSpanned > 1 && placeholder && placeholder.endDate && onPlaceholderChange && calendarGridRef.current) {
        // Find the week start date for the end row to calculate recurrence end
        const weekRows = calendarGridRef.current.querySelectorAll('[data-week-row]');
        let endWeekDate: Date | null = null;

        weekRows.forEach((row) => {
          const rowIndex = parseInt(row.getAttribute('data-week-row') || '0');
          const weekStartStr = row.getAttribute('data-week-start');
          if (weekStartStr && rowIndex === verticalPreviewInfo!.endWeekRow) {
            endWeekDate = new Date(weekStartStr + 'T00:00:00');
          }
        });

        if (endWeekDate) {
          // Get the original day-of-week for the end date to calculate recurrence end
          const originalEndDate = new Date(placeholder.endDate + 'T00:00:00');
          const endDayOfWeek = originalEndDate.getDay();

          // The recurrence should end on the last occurrence's end day
          const recurrenceEndDate = addDays(endWeekDate, endDayOfWeek);

          // Keep the original date range (Mon-Wed stays Mon-Wed)
          // Add weeklyRecurrenceEnd to signal the form to use weekly recurrence
          onPlaceholderChange({
            ...placeholder,
            // Keep original date and endDate (the Mon-Wed span)
            // Add recurrence info for the form
            weeklyRecurrenceEnd: format(recurrenceEndDate, 'yyyy-MM-dd'),
            weeklyRecurrenceCount: verticalPreviewInfo.weekRowsSpanned
          });
        }
      }

      setPlaceholderInteraction(null);
      // Don't clear placeholderVerticalPreview here - let it persist until placeholder is dismissed
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onPlaceholderChange]);

  const handlePlaceholderDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Don't start drag if we're already in a resize interaction
    if (placeholderInteraction?.type === 'resize') return;

    const currentPlaceholder = placeholderRef.current;
    if (!currentPlaceholder?.endDate) return;

    setPlaceholderInteraction({
      type: 'drag',
      startX: e.clientX,
      startY: e.clientY,
      initialStart: currentPlaceholder.date,
      initialEnd: currentPlaceholder.endDate
    });

    // Calculate initial day span
    const startDate = new Date(currentPlaceholder.date + 'T00:00:00');
    const endDate = new Date(currentPlaceholder.endDate + 'T00:00:00');
    const daySpan = differenceInDays(endDate, startDate);

    // Add global mouse listeners for drag
    const handleMouseMove = (ev: MouseEvent) => {
      const placeholder = placeholderRef.current;
      if (!calendarGridRef.current || !placeholder) return;

      // Find which day the mouse is over
      const weekRows = calendarGridRef.current.querySelectorAll('[data-week-row]');
      let targetDate: string | null = null;

      weekRows.forEach((row) => {
        const dayCells = row.querySelectorAll('[data-date]');
        dayCells.forEach((cell) => {
          const rect = cell.getBoundingClientRect();
          if (ev.clientX >= rect.left && ev.clientX <= rect.right &&
              ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
            targetDate = cell.getAttribute('data-date');
          }
        });
      });

      if (targetDate && onPlaceholderChange) {
        // Calculate new end date maintaining the same span
        const newStartDate = new Date(targetDate + 'T00:00:00');
        const newEndDate = addDays(newStartDate, daySpan);
        const newEndDateStr = format(newEndDate, 'yyyy-MM-dd');

        onPlaceholderChange({
          ...placeholder,
          date: targetDate,
          endDate: newEndDateStr
        });
      }
    };

    const handleMouseUp = () => {
      setPlaceholderInteraction(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onPlaceholderChange, placeholderInteraction]);

  // Calculate multi-day placeholder style for week row
  // Uses percentage-based positioning since placeholder is absolutely positioned (gridColumn won't work)
  const getMultiDayPlaceholderStyle = (weekStart: Date, weekEnd: Date): React.CSSProperties | null => {
    if (!placeholderEvent?.endDate || placeholderEvent.date === placeholderEvent.endDate) {
      console.log('🎯 getMultiDayPlaceholderStyle: returning null - not multi-day', {
        hasEndDate: !!placeholderEvent?.endDate,
        date: placeholderEvent?.date,
        endDate: placeholderEvent?.endDate
      });
      return null; // Not a multi-day placeholder
    }

    const placeholderStart = new Date(placeholderEvent.date + 'T00:00:00');
    const placeholderEnd = new Date(placeholderEvent.endDate + 'T00:00:00');

    // Check if placeholder overlaps with this week
    if (placeholderEnd < weekStart || placeholderStart > weekEnd) {
      return null;
    }

    // Clamp to week boundaries
    const displayStart = placeholderStart < weekStart ? weekStart : placeholderStart;
    const displayEnd = placeholderEnd > weekEnd ? weekEnd : placeholderEnd;

    // Calculate column positions (0-6 for Sun-Sat)
    const startCol = differenceInDays(displayStart, weekStart);
    const endCol = differenceInDays(displayEnd, weekStart);
    const span = endCol - startCol + 1;

    // Use percentage-based positioning for absolute elements
    const colWidthPercent = 100 / 7;
    const leftPercent = startCol * colWidthPercent;
    const widthPercent = span * colWidthPercent;

    console.log('✅ getMultiDayPlaceholderStyle: returning style for multi-day placeholder', {
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      startCol,
      endCol,
      span
    });

    return {
      left: `calc(${leftPercent}% + 4px)`,
      width: `calc(${widthPercent}% - 8px)`,
    };
  };

  // Get placeholder vertical week resize preview for a specific week row
  const getPlaceholderVerticalPreviewForRow = (weekIndex: number): { style: React.CSSProperties } | null => {
    if (!placeholderVerticalPreview || !placeholderEvent?.endDate) {
      return null;
    }

    const { startWeekRow, endWeekRow } = placeholderVerticalPreview;
    console.log('📊 getPlaceholderVerticalPreviewForRow:', { weekIndex, startWeekRow, endWeekRow, placeholderDate: placeholderEvent.date, placeholderEndDate: placeholderEvent.endDate });

    // Check if this week row is within the extended range
    if (weekIndex < startWeekRow || weekIndex > endWeekRow) return null;

    // Use the same day-of-week span as the original placeholder
    const placeholderStart = new Date(placeholderEvent.date + 'T00:00:00');
    const placeholderEnd = new Date(placeholderEvent.endDate + 'T00:00:00');

    const startDayOfWeek = placeholderStart.getDay();
    const endDayOfWeek = placeholderEnd.getDay();

    const daySpan = endDayOfWeek - startDayOfWeek + 1;

    // Use percentage-based positioning
    const colWidthPercent = 100 / 7;
    const leftPercent = startDayOfWeek * colWidthPercent;
    const widthPercent = daySpan * colWidthPercent;

    return {
      style: {
        left: `calc(${leftPercent}% + 4px)`,
        width: `calc(${widthPercent}% - 8px)`,
      }
    };
  };

  // Calculate resize preview style for a week row
  const getResizePreviewStyle = (weekStart: Date, weekEnd: Date): React.CSSProperties | null => {
    if (!resizePreview) {
      return null;
    }

    // Parse preview dates
    const previewStart = new Date(resizePreview.previewStart);
    const previewEnd = new Date(resizePreview.previewEnd);

    // Get date-only versions for comparison
    const previewStartDay = startOfDay(previewStart);
    const previewEndDay = startOfDay(previewEnd);

    // Check if preview overlaps with this week
    if (previewEndDay < weekStart || previewStartDay > weekEnd) {
      return null;
    }

    // Clamp to week boundaries
    const displayStart = previewStartDay < weekStart ? weekStart : previewStartDay;
    const displayEnd = previewEndDay > weekEnd ? weekEnd : previewEndDay;

    // Calculate column positions (0-6 for Sun-Sat)
    const startCol = differenceInDays(displayStart, weekStart);
    const endCol = differenceInDays(displayEnd, weekStart);
    const span = endCol - startCol + 1;

    // Use percentage-based positioning for absolute elements
    const colWidthPercent = 100 / 7;
    const leftPercent = startCol * colWidthPercent;
    const widthPercent = span * colWidthPercent;

    return {
      left: `calc(${leftPercent}% + 4px)`,
      width: `calc(${widthPercent}% - 8px)`,
    };
  };

  // Get vertical week resize preview for a specific week row
  // For weekly recurrence mode (default, edge handles): shows the SAME day span on each week
  // For continuous extension mode (corner handles or useMultiDayForWeekResize): shows portion of event spanning weeks
  const getVerticalWeekResizePreviewForRow = (weekIndex: number): { style: React.CSSProperties; instance: WeeklyInstanceDates; isOriginalRow: boolean } | null => {
    if (!verticalWeekResizePreview) return null;

    const { startWeekRow, endWeekRow, isCornerResize } = verticalWeekResizePreview.weekInfo;

    // Check if this week row is within the extended range
    if (weekIndex < startWeekRow || weekIndex > endWeekRow) return null;

    // Find the instance for this week row
    const instance = verticalWeekResizePreview.instances.find(
      inst => inst.weekRow === weekIndex
    );

    if (!instance) return null;

    // Determine if this is the original event row (where the event already exists)
    const originalEventRow = verticalWeekResizePreview.weekInfo.direction === 'down'
      ? startWeekRow
      : endWeekRow;
    const isOriginalRow = weekIndex === originalEventRow;

    let displayStartDay: number;
    let displayEndDay: number;

    // Use continuous extension mode if:
    // 1. useMultiDayForWeekResize prop is true, OR
    // 2. User is using a corner handle (which always extends continuously)
    const useContinuousExtension = useMultiDayForWeekResize || isCornerResize;

    if (useContinuousExtension) {
      // CONTINUOUS EXTENSION MODE: Calculate how much of the week this event spans
      const instanceStart = new Date(instance.startDateTime);
      const instanceEnd = new Date(instance.endDateTime);

      // Get day of week positions (0=Sun, 6=Sat)
      const startDayOfWeek = instanceStart.getDay();
      const endDayOfWeek = instanceEnd.getDay();

      // For intermediate weeks (not first or last), the event spans the full week
      displayStartDay = startDayOfWeek;
      displayEndDay = endDayOfWeek;

      if (weekIndex > startWeekRow && weekIndex < endWeekRow) {
        // Intermediate week: spans from Sunday to Saturday
        displayStartDay = 0;
        displayEndDay = 6;
      } else if (weekIndex === startWeekRow && weekIndex !== endWeekRow) {
        // First week (but not the only week): spans from start day to Saturday
        displayEndDay = 6;
      } else if (weekIndex === endWeekRow && weekIndex !== startWeekRow) {
        // Last week (but not the only week): spans from Sunday to end day
        displayStartDay = 0;
      }
    } else {
      // WEEKLY RECURRENCE MODE (default): Use the SAME day span from the original event for ALL rows
      // Find the original row's instance to get the consistent day span
      const originalInstance = verticalWeekResizePreview.instances.find(
        inst => inst.weekRow === originalEventRow
      );

      if (originalInstance) {
        const originalStart = new Date(originalInstance.startDateTime);
        const originalEnd = new Date(originalInstance.endDateTime);
        displayStartDay = originalStart.getDay();
        displayEndDay = originalEnd.getDay();
      } else {
        // Fallback to current instance
        const instanceStart = new Date(instance.startDateTime);
        const instanceEnd = new Date(instance.endDateTime);
        displayStartDay = instanceStart.getDay();
        displayEndDay = instanceEnd.getDay();
      }
    }

    const daySpan = displayEndDay - displayStartDay + 1;

    // Use percentage-based positioning
    const colWidthPercent = 100 / 7;
    const leftPercent = displayStartDay * colWidthPercent;
    const widthPercent = daySpan * colWidthPercent;

    return {
      style: {
        left: `calc(${leftPercent}% + 4px)`,
        width: `calc(${widthPercent}% - 8px)`,
      },
      instance,
      isOriginalRow
    };
  };

  // Handler to clear placeholder when drag or resize starts
  const handleClearPlaceholder = useCallback(() => {
    if (onPlaceholderChange) {
      onPlaceholderChange(null);
    }
  }, [onPlaceholderChange]);

  return (
    <DragDropProvider
      onEventDrop={handleEventDrop}
      onEventResize={handleEventResize}
      onDragStart={handleClearPlaceholder}
      onResizeStart={handleClearPlaceholder}
    >
      <div ref={containerRef} className="space-y-6">
        <div className="neo-card">
          <div className="p-0">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center" style={{
                  background: 'var(--neomorphic-bg)',
                  borderRight: '1px solid var(--neomorphic-dark-shadow)',
                  borderBottom: '1px solid var(--neomorphic-dark-shadow)'
                }}>
                  <span className="text-sm font-bold uppercase tracking-wide font-primary" style={{ color: 'var(--neomorphic-text)' }}>
                    {day}
                  </span>
                </div>
              ))}
            </div>

            {/* Render weeks with multi-day event rows */}
            <div ref={calendarGridRef} className="relative">
              {(() => {
                // Group days into weeks
                const weeks: Date[][] = [];
                let currentWeek: Date[] = [];

                // Fill in days from the start of the first week (may include previous month)
                const firstDayOfMonth = monthStart;
                const weekStartOfFirstDay = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 });

                // Get all days from the start of the first week to the end of the last week
                const lastDayOfMonth = monthEnd;
                const weekEndOfLastDay = endOfWeek(lastDayOfMonth, { weekStartsOn: 0 });

                let currentDay = weekStartOfFirstDay;
                while (currentDay <= weekEndOfLastDay) {
                  currentWeek.push(currentDay);
                  if (currentWeek.length === 7) {
                    weeks.push(currentWeek);
                    currentWeek = [];
                  }
                  currentDay = addDays(currentDay, 1);
                }

                return weeks.map((week, weekIndex) => {
                  const weekStart = week[0];
                  const weekEnd = week[6];
                  const multiDayEvents = getMultiDayEventsForWeekRow(weekStart, weekEnd);
                  const multiDayPlaceholderStyle = getMultiDayPlaceholderStyle(weekStart, weekEnd);
                  const resizePreviewStyle = getResizePreviewStyle(weekStart, weekEnd);
                  const verticalWeekPreviewData = getVerticalWeekResizePreviewForRow(weekIndex);
                  const placeholderVerticalPreviewData = getPlaceholderVerticalPreviewForRow(weekIndex);

                  return (
                    <div
                      key={`week-${weekIndex}`}
                      data-week-row={weekIndex}
                      data-week-start={format(weekStart, 'yyyy-MM-dd')}
                      className="relative"
                    >
                      {/* Day cells row */}
                      <div className="grid grid-cols-7 gap-0">
                        {week.map(day => {
                          // Pass week boundaries to exclude merged recurring events from single-day display
                          const dayEvents = getSingleDayEventsForDate(day, weekStart, weekEnd);
                          const isCurrentMonth = isSameMonth(day, selectedDate);
                          const isTodayDate = isToday(day);
                          const isSelected = isSameDay(day, selectedDate);
                          const dayHour = 9; // Default hour for month view (9am)

                          // Determine day cell styles based on state - applied to DropZone wrapper
                          const getDropZoneStyle = (): React.CSSProperties => {
                            const baseStyle: React.CSSProperties = {
                              background: 'var(--neomorphic-bg)',
                              borderTopWidth: '1px',
                              borderTopStyle: 'solid',
                              borderTopColor: 'transparent',
                              borderRightWidth: '1px',
                              borderRightStyle: 'solid',
                              borderRightColor: 'var(--neomorphic-dark-shadow)',
                              borderBottomWidth: '1px',
                              borderBottomStyle: 'solid',
                              borderBottomColor: 'var(--neomorphic-dark-shadow)',
                              borderLeftWidth: '1px',
                              borderLeftStyle: 'solid',
                              borderLeftColor: 'transparent',
                              color: 'var(--neomorphic-text)',
                              transition: 'all 200ms ease-in-out'
                            }

                            if (!isCurrentMonth) {
                              return {
                                ...baseStyle,
                                opacity: 0.5
                              }
                            }

                            if (isSelected) {
                              return {
                                ...baseStyle,
                                boxShadow: 'inset 3px 3px 6px 0px var(--neomorphic-dark-shadow), inset -3px -3px 6px 0px var(--neomorphic-light-shadow)'
                              }
                            }

                            if (isTodayDate) {
                              return {
                                ...baseStyle,
                                borderTopWidth: '2px',
                                borderRightWidth: '2px',
                                borderBottomWidth: '2px',
                                borderLeftWidth: '2px',
                                borderTopColor: 'var(--neomorphic-accent)',
                                borderRightColor: 'var(--neomorphic-accent)',
                                borderBottomColor: 'var(--neomorphic-accent)',
                                borderLeftColor: 'var(--neomorphic-accent)',
                                boxShadow: 'inset 2px 2px 4px 0px var(--neomorphic-dark-shadow), inset -2px -2px 4px 0px var(--neomorphic-light-shadow)'
                              }
                            }

                            return baseStyle
                          }

                          return (
                            <DropZone
                              key={day.toISOString()}
                              date={format(day, 'yyyy-MM-dd')}
                              hour={dayHour}
                              showAlways={true}
                              className="min-h-[120px] cursor-pointer relative group"
                              style={getDropZoneStyle()}
                            >
                            <div
                              data-date={format(day, 'yyyy-MM-dd')}
                              className="h-full p-2"
                              onMouseDown={(e) => handleDayMouseDown(e, day, isCurrentMonth)}
                              onDragStart={(e) => {
                                // Prevent event dragging when creating a new placeholder
                                // This prevents the ghost container from appearing during placeholder creation
                                if (isDragCreating || placeholderInteraction) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }
                              }}
                              onClick={() => {
                                // Skip click handling if we're drag creating
                                if (isDragCreating) return;

                                // Single click - select day
                                onDateSelect?.(day);
                                if (isCurrentMonth && onDayClick) {
                                  onDayClick(day);
                                }
                              }}
                            >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-sm font-medium font-primary"
                        style={isTodayDate ? {
                          background: 'var(--neomorphic-accent)',
                          color: 'var(--neomorphic-bg)',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          boxShadow: '2px 2px 4px 0px var(--neomorphic-dark-shadow)'
                        } : { color: 'var(--neomorphic-text)' }}
                      >
                        {format(day, 'd')}
                      </span>
                      <div className="flex items-center space-x-1">
                        {dayEvents.length > 0 && (
                          <Badge
                            className="h-5 w-5 p-0 text-xs flex items-center justify-center"
                            style={{
                              background: dayEvents.length > 5
                                ? 'hsl(var(--destructive))'
                                : dayEvents.length > 3
                                  ? 'var(--neomorphic-accent)'
                                  : dayEvents.length > 1
                                    ? 'var(--neomorphic-bright)'
                                    : 'hsl(var(--event-low-border))',
                              color: dayEvents.length > 5 || dayEvents.length <= 1
                                ? 'white'
                                : 'var(--neomorphic-bg)',
                              boxShadow: '2px 2px 4px 0px var(--neomorphic-dark-shadow)'
                            }}
                          >
                            {dayEvents.length > 9 ? '9+' : dayEvents.length}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Show services for this day */}
                    <div className="space-y-1 overflow-visible">
                      {dayEvents.slice(0, 3).map((serviceItem) => {
                        const service = serviceItem as any;

                        // Try to find the event in unifiedEvents, or convert legacy service to UnifiedEvent format
                        let eventForRender = unifiedEvents.find(e => e.id === service.id);

                        // If not found in unifiedEvents, convert the legacy service to UnifiedEvent format
                        // This ensures ALL events get CalendarEvent rendering with resize handles
                        if (!eventForRender) {
                          const startDateTime = service.startDateTime || service.scheduledDate;
                          const endDateTime = service.endDateTime || service.scheduledDate;
                          eventForRender = {
                            id: service.id,
                            type: service.type || 'event',
                            title: safeString(service.title || service.service, 'Event'),
                            description: service.description || service.notes || '',
                            startDateTime: startDateTime,
                            endDateTime: endDateTime,
                            duration: service.duration || 60,
                            priority: service.priority || 'medium',
                            clientId: service.clientId,
                            clientName: service.clientName,
                            location: service.location,
                            notes: service.notes,
                            status: service.status || 'scheduled',
                            isAllDay: service.isAllDay || false,
                            isMultiDay: service.isMultiDay || false,
                            isRecurring: service.isRecurring || false,
                            createdAt: service.createdAt || new Date().toISOString(),
                            updatedAt: service.updatedAt || new Date().toISOString()
                          } as UnifiedEvent;
                        }

                        // Always use CalendarEvent for all events to ensure consistent resize handles
                        const eventDate = new Date(eventForRender.startDateTime);
                        const eventHour = eventDate.getHours();

                        // Hide this event if it's currently being resized (we'll show a preview instead)
                        const isBeingResized = resizePreview?.eventId === eventForRender.id;

                        return (
                          <CalendarEvent
                            key={service.id}
                            event={eventForRender}
                            viewMode="month"
                            currentDate={format(day, 'yyyy-MM-dd')}
                            currentHour={eventHour}
                            onClick={(e) => {
                              if (onEventView) {
                                onEventView(e);
                              }
                            }}
                            onResizeEnd={handleResizeEnd}
                            onResizePreview={handleResizePreview}
                            onVerticalWeekResizePreview={handleVerticalWeekResizePreview}
                            onVerticalWeekResize={handleVerticalWeekResize}
                            showResizeHandles={true}
                            isCompact={true}
                            gridContainerRef={calendarGridRef}
                            monthStartDate={monthStart}
                            className={`text-xs p-1 rounded border hover:shadow-sm transition-all ${isBeingResized ? 'opacity-50' : ''}`}
                          />
                        );
                      })}

                      {/* Placeholder event for new event creation (single-day only) */}
                      {placeholderEvent &&
                        format(day, 'yyyy-MM-dd') === placeholderEvent.date &&
                        (!placeholderEvent.endDate || placeholderEvent.date === placeholderEvent.endDate) && (
                        <div
                          className="text-xs rounded cursor-pointer"
                          style={{
                            height: '24px',
                            padding: '2px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            background: 'hsl(var(--accent) / 0.25)',
                            border: '2px dashed hsl(var(--accent))',
                            color: 'hsl(var(--accent-foreground))',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="font-medium truncate flex-1">
                            {placeholderEvent.title || 'New Event'}
                          </span>
                          <span className="opacity-70 ml-1 whitespace-nowrap">
                            {placeholderEvent.hour.toString().padStart(2, '0')}:{(placeholderEvent.minutes || 0).toString().padStart(2, '0')}
                          </span>
                        </div>
                      )}

                      {dayEvents.length > 3 && (
                        <div
                          className="text-xs text-center rounded cursor-pointer transition-colors"
                          style={{
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--neomorphic-bg)',
                            color: 'var(--neomorphic-text)',
                            boxShadow: 'inset 2px 2px 4px 0px var(--neomorphic-dark-shadow), inset -2px -2px 4px 0px var(--neomorphic-light-shadow)'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDayClick) {
                              onDayClick(day);
                            }
                          }}
                          title={`View all ${dayEvents.length} events`}
                        >
                          <span className="font-medium">+{dayEvents.length - 3} more</span>
                        </div>
                      )}

                      {dayEvents.length > 5 && (
                        <div
                          className="absolute top-1 right-1 w-2 h-2 rounded-full"
                          style={{ background: 'hsl(var(--destructive))' }}
                          title="High activity day"
                        />
                      )}
                    </div>
                  </div>
                            </DropZone>
                          );
                        })}
                      </div>

                      {/* Multi-day placeholder overlay - vertically centered on top of day cells */}
                      {/* Interactive: draggable + resizable with all 8 handles (4 edges + 4 corners) */}
                      {/* Note: Uses an invisible extended hitbox to ensure hover detection includes handle areas */}
                      {multiDayPlaceholderStyle && (
                        <div
                          data-placeholder="true"
                          className={`absolute group select-none ${
                            placeholderInteraction?.type === 'drag' ? 'cursor-grabbing' : 'cursor-grab'
                          }`}
                          style={{
                            ...multiDayPlaceholderStyle,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            height: '28px',
                            zIndex: 50,
                          }}
                        >
                          {/* Invisible extended hitbox for hover detection - extends 8px beyond visible bounds */}
                          {/* This ensures handles remain visible when mouse moves toward them */}
                          <div
                            className="absolute inset-0 pointer-events-auto"
                            style={{
                              top: '-8px',
                              bottom: '-8px',
                              left: '-8px',
                              right: '-8px',
                            }}
                            onMouseDown={handlePlaceholderDragStart}
                          />

                          {/* Visual placeholder container */}
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              borderRadius: '4px',
                              background: placeholderInteraction
                                ? 'hsl(var(--accent) / 0.4)'
                                : 'hsl(var(--accent) / 0.25)',
                              border: '2px dashed hsl(var(--accent))',
                              color: 'hsl(var(--accent-foreground))',
                              fontSize: '11px',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: placeholderInteraction
                                ? '0 6px 16px rgba(0,0,0,0.2)'
                                : '0 4px 12px rgba(0,0,0,0.15)',
                              transition: 'background 0.15s, box-shadow 0.15s'
                            }}
                          >
                            {/* Placeholder content */}
                            <span className="truncate px-3">
                              {placeholderEvent?.title || 'New Event'} • {
                                placeholderEvent?.endDate && placeholderEvent.endDate !== placeholderEvent.date
                                  ? `${differenceInDays(new Date(placeholderEvent.endDate + 'T00:00:00'), new Date(placeholderEvent.date + 'T00:00:00')) + 1} days`
                                  : `${Math.ceil((placeholderEvent?.duration || 60) / 60)}h`
                              }
                              {/* Show repeat count alongside original text when vertical preview is active */}
                              {placeholderVerticalPreview && placeholderVerticalPreview.weekRowsSpanned > 1 && (
                                <span className="ml-2 opacity-80">
                                  | Repeat × {placeholderVerticalPreview.weekRowsSpanned}
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Top resize handle */}
                          <div
                            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-accent cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 pointer-events-auto"
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)', zIndex: 1 }}
                            onMouseDown={(e) => handlePlaceholderResizeStart(e, 'top')}
                          />

                          {/* Bottom resize handle */}
                          <div
                            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-accent cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 pointer-events-auto"
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)', zIndex: 1 }}
                            onMouseDown={(e) => handlePlaceholderResizeStart(e, 'bottom')}
                          />

                          {/* Left resize handle */}
                          <div
                            className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 pointer-events-auto"
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)', zIndex: 1 }}
                            onMouseDown={(e) => handlePlaceholderResizeStart(e, 'left')}
                          />

                          {/* Right resize handle */}
                          <div
                            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 pointer-events-auto"
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)', zIndex: 1 }}
                            onMouseDown={(e) => handlePlaceholderResizeStart(e, 'right')}
                          />

                          {/* Top-left corner resize handle */}
                          <div
                            className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full bg-accent cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 pointer-events-auto"
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)', zIndex: 1 }}
                            onMouseDown={(e) => handlePlaceholderResizeStart(e, 'top-left')}
                          />

                          {/* Top-right corner resize handle */}
                          <div
                            className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-accent cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 pointer-events-auto"
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)', zIndex: 1 }}
                            onMouseDown={(e) => handlePlaceholderResizeStart(e, 'top-right')}
                          />

                          {/* Bottom-left corner resize handle */}
                          <div
                            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-full bg-accent cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 pointer-events-auto"
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)', zIndex: 1 }}
                            onMouseDown={(e) => handlePlaceholderResizeStart(e, 'bottom-left')}
                          />

                          {/* Bottom-right corner resize handle */}
                          <div
                            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full bg-accent cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125 pointer-events-auto"
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)', zIndex: 1 }}
                            onMouseDown={(e) => handlePlaceholderResizeStart(e, 'bottom-right')}
                          />
                        </div>
                      )}

                      {/* Multi-day events overlay - using CalendarEvent for drag/resize support */}
                      {multiDayEvents.slice(0, 2).map((event, eventIndex) => {
                        const eventStyle = getMultiDayEventStyle(event, weekStart, weekEnd);
                        const eventStartDate = new Date(event.startDateTime);
                        const eventHour = eventStartDate.getHours();
                        const isBeingResized = resizePreview?.eventId === event.id;
                        const isMergedRecurring = event.isMergedRecurring || false;

                        return (
                          <div
                            key={event.id}
                            className={`absolute group ${isBeingResized ? 'opacity-50' : ''}`}
                            style={{
                              ...eventStyle,
                              top: '50%',
                              transform: `translateY(calc(-50% + ${eventIndex * 32}px))`,
                              height: '28px',
                              zIndex: 40
                            }}
                          >
                            <CalendarEvent
                              event={event}
                              viewMode="month"
                              currentDate={format(weekStart, 'yyyy-MM-dd')}
                              currentHour={eventHour}
                              onClick={(e) => {
                                if (onEventView) {
                                  onEventView(e);
                                }
                              }}
                              onResizeEnd={handleResizeEnd}
                              onResizePreview={handleResizePreview}
                              onVerticalWeekResizePreview={handleVerticalWeekResizePreview}
                              onVerticalWeekResize={handleVerticalWeekResize}
                              showResizeHandles={true}
                              isCompact={true}
                              gridContainerRef={calendarGridRef}
                              monthStartDate={monthStart}
                              className="h-full text-xs"
                            />

                            {/* Weekly repeat handle overlay - only for merged recurring events */}
                            {isMergedRecurring && (
                              <div
                                className="absolute inset-y-0 left-0 right-0 pointer-events-none flex items-center justify-between px-1"
                                style={{ zIndex: 45 }}
                              >
                                {/* Left repeat indicator */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Repeat className="w-3 h-3 text-white drop-shadow-md" strokeWidth={2.5} />
                                  <div className="h-full w-px bg-white/40" style={{ height: '20px' }} />
                                </div>

                                {/* Right repeat indicator */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="h-full w-px bg-white/40" style={{ height: '20px' }} />
                                  <Repeat className="w-3 h-3 text-white drop-shadow-md" strokeWidth={2.5} />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Resize preview overlay - shows during horizontal resize (but not during vertical week resize) */}
                      {resizePreviewStyle && resizePreview && !verticalWeekResizePreview && (
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            ...resizePreviewStyle,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            height: '28px',
                            borderRadius: '4px',
                            background: 'hsl(var(--accent) / 0.4)',
                            border: '2px dashed hsl(var(--accent))',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            zIndex: 60,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: 'hsl(var(--accent-foreground))'
                          }}
                        >
                          <span className="truncate px-2">
                            {resizePreview.daySpan} day{resizePreview.daySpan > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {/* Vertical week resize preview - shows continuous event extension across week rows */}
                      {verticalWeekPreviewData && verticalWeekResizePreview && (
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            ...verticalWeekPreviewData.style,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            height: '28px',
                            borderRadius: '4px',
                            background: verticalWeekPreviewData.isOriginalRow
                              ? 'hsl(var(--accent) / 0.6)'
                              : 'hsl(var(--accent) / 0.4)',
                            border: '2px dashed hsl(var(--accent))',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            zIndex: 60,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: 'hsl(var(--accent-foreground))'
                          }}
                        >
                          <span className="truncate px-2">
                            {(useMultiDayForWeekResize || verticalWeekResizePreview.weekInfo.isCornerResize)
                              ? (verticalWeekPreviewData.isOriginalRow
                                  ? `${verticalWeekResizePreview.weekInfo.weekRowsSpanned} weeks`
                                  : `→ Week ${verticalWeekPreviewData.instance.weekRow - verticalWeekResizePreview.weekInfo.startWeekRow + 1}`)
                              : (verticalWeekPreviewData.isOriginalRow
                                  ? `Repeat × ${verticalWeekResizePreview.weekInfo.weekRowsSpanned}`
                                  : `Week ${verticalWeekPreviewData.instance.weekRow - verticalWeekResizePreview.weekInfo.startWeekRow + 1}`)
                            }
                          </span>
                        </div>
                      )}

                      {/* Placeholder vertical week resize preview - shows recurring event preview on secondary weeks */}
                      {/* Skip the initialWeekRow since original placeholder now shows "Repeat × N" text */}
                      {placeholderVerticalPreviewData && placeholderVerticalPreview && weekIndex !== placeholderVerticalPreview.initialWeekRow && (
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            ...placeholderVerticalPreviewData.style,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            height: '28px',
                            borderRadius: '4px',
                            background: 'hsl(var(--accent) / 0.35)',
                            border: '2px dashed hsl(var(--accent))',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            zIndex: 55,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: 'hsl(var(--accent-foreground))'
                          }}
                        >
                          <span className="truncate px-2">
                            Week {weekIndex - placeholderVerticalPreview.startWeekRow + 1}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}

              {/* Month view drag ghost preview - shows dashed container at target day */}
              <MonthDragGhostPreview calendarGridRef={calendarGridRef} />
            </div>
          </div>
        </div>

        {/* Drag Visual Feedback - floating preview that follows cursor */}
        <DragVisualFeedback containerRef={containerRef as React.RefObject<HTMLElement>} />

        {/* Reschedule Confirmation Modal */}
        <RescheduleConfirmationModal
          isOpen={showRescheduleModal}
          onClose={() => {
            setShowRescheduleModal(false);
            setRescheduleData(null);
          }}
          onConfirm={handleRescheduleConfirm}
          rescheduleData={rescheduleData}
        />

        {/* Resize Confirmation Modal */}
        <ResizeConfirmationModal
          isOpen={showResizeModal}
          onClose={() => {
            setShowResizeModal(false);
            setResizeData(null);
          }}
          onConfirm={handleResizeConfirm}
          resizeData={resizeData}
        />

      </div>
    </DragDropProvider>
  );
};

export default ScheduleCalendar;
