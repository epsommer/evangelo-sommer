"use client";

import React from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { WeekdaySelection } from '@/types/multiday-selection';
import { GripHorizontal } from 'lucide-react';

interface WeekdayPlaceholderProps {
  selection: WeekdaySelection;
  calendarGridRef: React.RefObject<HTMLDivElement>;
  monthStart: Date;
  onResizeStart?: (handle: 'top' | 'bottom', e: React.MouseEvent) => void;
  showResizeHandles?: boolean;
}

/**
 * WeekdayPlaceholder - Shows dashed placeholder for multi-day/multi-week recurring events
 *
 * This component renders a visual placeholder that spans across selected weekdays
 * and multiple weeks. It includes resize handles for extending the selection vertically.
 */
const WeekdayPlaceholder: React.FC<WeekdayPlaceholderProps> = ({
  selection,
  calendarGridRef,
  monthStart,
  onResizeStart,
  showResizeHandles = true,
}) => {
  if (!calendarGridRef.current) return null;

  const weekSpan = selection.endWeekIndex - selection.startWeekIndex + 1;

  // Get all week rows in the calendar
  const weekRows = Array.from(
    calendarGridRef.current.querySelectorAll('[data-week-row]')
  );

  // Filter to only the weeks in our selection
  const selectedWeekRows = weekRows.slice(
    selection.startWeekIndex,
    selection.endWeekIndex + 1
  );

  if (selectedWeekRows.length === 0) return null;

  // Format weekdays for display (e.g., "Mon, Wed, Fri")
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const selectedWeekdayNames = selection.weekdays
    .map(day => weekdayNames[day])
    .join(', ');

  // Calculate time display
  const startHour = parseInt(selection.startTime.split(':')[0]);
  const startMinute = parseInt(selection.startTime.split(':')[1]);
  const endMinute = startMinute + selection.duration;
  const endHour = startHour + Math.floor(endMinute / 60);
  const finalMinute = endMinute % 60;

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const timeDisplay = `${formatTime(startHour, startMinute)} - ${formatTime(endHour, finalMinute)}`;

  return (
    <>
      {selectedWeekRows.map((weekRow, weekIndex) => {
        const weekRowElement = weekRow as HTMLElement;
        const weekRowRect = weekRowElement.getBoundingClientRect();
        const gridRect = calendarGridRef.current!.getBoundingClientRect();

        // Find the day cells grid within this row
        const dayCellsGrid = weekRow.querySelector('.grid-cols-7');
        if (!dayCellsGrid) return null;

        const dayCells = Array.from(dayCellsGrid.querySelectorAll('[data-date]'));

        // Get week start date from data attribute
        const weekStartStr = weekRowElement.getAttribute('data-week-start');
        if (!weekStartStr) return null;

        const weekStartDate = new Date(weekStartStr + 'T00:00:00');

        // For each weekday in selection, render a placeholder cell
        return selection.weekdays.map(weekday => {
          const targetDate = addDays(weekStartDate, weekday);

          // Find the corresponding cell
          const targetCell = dayCells.find(cell => {
            const cellDate = cell.getAttribute('data-date');
            if (!cellDate) return false;
            const cellDateObj = new Date(cellDate + 'T00:00:00');
            return isSameDay(cellDateObj, targetDate);
          });

          if (!targetCell) return null;

          const cellRect = targetCell.getBoundingClientRect();

          // Calculate position relative to grid
          const left = cellRect.left - gridRect.left;
          const top = weekRowRect.top - gridRect.top;
          const width = cellRect.width;
          const height = weekRowRect.height;

          const isFirstWeek = weekIndex === 0;
          const isLastWeek = weekIndex === selectedWeekRows.length - 1;

          return (
            <div
              key={`${weekIndex}-${weekday}`}
              className="absolute pointer-events-none"
              style={{
                left: `${left + 4}px`,
                top: `${top + 28}px`, // Below day number
                width: `${width - 8}px`,
                height: `${height - 36}px`,
                zIndex: 50,
              }}
            >
              {/* Main placeholder box */}
              <div className="relative h-full bg-accent/20 border-2 border-accent border-dashed rounded-md p-2">
                {/* Content - only show in first cell of first week */}
                {isFirstWeek && weekday === selection.weekdays[0] && (
                  <div className="text-accent font-medium text-xs space-y-1">
                    <div className="font-semibold">Recurring Event</div>
                    <div className="text-accent/80">{selectedWeekdayNames}</div>
                    <div className="text-accent/70 text-[10px]">{timeDisplay}</div>
                    <div className="text-accent/70 text-[10px]">
                      {weekSpan} week{weekSpan > 1 ? 's' : ''}
                    </div>
                  </div>
                )}

                {/* Resize handles */}
                {showResizeHandles && onResizeStart && (
                  <>
                    {/* Top handle - only on first week */}
                    {isFirstWeek && weekday === selection.weekdays[0] && (
                      <div
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-3 bg-accent rounded-full cursor-ns-resize pointer-events-auto hover:bg-accent/80 transition-colors flex items-center justify-center"
                        onMouseDown={(e) => onResizeStart('top', e)}
                        title="Drag to extend to previous weeks"
                      >
                        <GripHorizontal className="w-3 h-3 text-white" />
                      </div>
                    )}

                    {/* Bottom handle - only on last week */}
                    {isLastWeek && weekday === selection.weekdays[selection.weekdays.length - 1] && (
                      <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-3 bg-accent rounded-full cursor-ns-resize pointer-events-auto hover:bg-accent/80 transition-colors flex items-center justify-center"
                        onMouseDown={(e) => onResizeStart('bottom', e)}
                        title="Drag to extend to next weeks"
                      >
                        <GripHorizontal className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        });
      })}
    </>
  );
};

export default WeekdayPlaceholder;
