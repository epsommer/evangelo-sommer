"use client";

import React, { useState, useEffect, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMinutes, parseISO } from 'date-fns';
import { Calendar, Clock, MapPin, User, MoreVertical, Edit, CheckCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUnifiedEvents } from '@/hooks/useUnifiedEvents';
import DropdownMenu from '@/components/ui/DropdownMenu';
import { DragDropProvider } from '@/components/DragDropContext';
import DragAndDropEvent from '@/components/DragAndDropEvent';
import CalendarEvent from '@/components/calendar/CalendarEvent';
import RescheduleConfirmationModal from '@/components/RescheduleConfirmationModal';
import ResizeConfirmationModal from '@/components/ResizeConfirmationModal';
import DragVisualFeedback from '@/components/DragVisualFeedback';
import { ClientNotificationService } from '@/lib/client-notification-service';
import { UnifiedEvent } from '@/components/EventCreationModal';

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

interface ScheduleCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onDayClick?: (date: Date) => void;
  onEventEdit?: (event: any) => void;
  onEventView?: (event: any) => void;
  onEventDelete?: (eventId: string) => void;
  onEventStatusChange?: (eventId: string, status: string) => void;
  enableEditing?: boolean;
  refreshTrigger?: number;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  selectedDate = (() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()) })(),
  onDateSelect,
  onDayClick,
  onEventEdit,
  onEventView,
  onEventDelete,
  onEventStatusChange,
  enableEditing = false,
  refreshTrigger
}) => {
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([]);
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<any[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledService | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<ScheduledService | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<any>(null);
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [resizeData, setResizeData] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use unified events hook
  const { events: unifiedEvents, updateEvent } = useUnifiedEvents({ syncWithLegacy: true, refreshTrigger });

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

  // Get events for a specific date (including unified events)
  const getEventsForDate = (date: Date) => {
    const servicesForDate = scheduledServices.filter(service => {
      const serviceDate = new Date(service.scheduledDate);
      return isSameDay(serviceDate, date);
    });

    const unifiedEventsForDate = unifiedEvents.filter(event => {
      const eventDate = new Date(event.startDateTime);
      return isSameDay(eventDate, date);
    });

    return [...servicesForDate, ...unifiedEventsForDate];
  };

  // Drag and drop handlers
  const handleEventDrop = async (event: UnifiedEvent, fromSlot: { date: string; hour: number }, toSlot: { date: string; hour: number }) => {
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

  const handleEventResize = async (event: UnifiedEvent, newStartTime: string, newEndTime: string) => {
    console.log('📅 Month view event resize:', { event, newStartTime, newEndTime });
    const resizeInfo = {
      event,
      originalStart: event.startDateTime,
      originalEnd: event.endDateTime || addMinutes(parseISO(event.startDateTime), event.duration).toISOString(),
      newStart: newStartTime,
      newEnd: newEndTime,
      handle: 'bottom' as const
    };
    setResizeData(resizeInfo);
    setShowResizeModal(true);
  };

  const handleRescheduleConfirm = async (data: any, notifyParticipants: boolean) => {
    try {
      // Calculate new start and end times
      const newDate = new Date(data.toSlot.date + 'T00:00:00');
      newDate.setHours(data.toSlot.hour);

      const originalStart = new Date(data.event.startDateTime);
      const originalDuration = data.event.duration;

      // Preserve the minutes from original time
      newDate.setMinutes(originalStart.getMinutes());

      const newStart = newDate.toISOString().slice(0, 19);
      const newEnd = new Date(newDate.getTime() + originalDuration * 60000).toISOString().slice(0, 19);

      const updates = {
        startDateTime: newStart,
        endDateTime: newEnd,
        notes: data.reason ?
          `${data.event.notes || ''}

Rescheduled: ${data.reason}`.trim() :
          data.event.notes
      };

      await updateEvent(data.event.id, updates);
      console.log('✅ Event rescheduled:', data.event.title);

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
      const updates = {
        startDateTime: data.newStart,
        endDateTime: data.newEnd,
        duration: Math.round((new Date(data.newEnd).getTime() - new Date(data.newStart).getTime()) / (1000 * 60)),
        notes: data.reason ?
          `${data.event.notes || ''}

Duration changed: ${data.reason}`.trim() :
          data.event.notes
      };

      await updateEvent(data.event.id, updates);
      console.log('✅ Event resized:', data.event.title);

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

  // Get upcoming events (next 30 days)
  const getUpcomingEvents = () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingServices = scheduledServices
      .filter(service => {
        const serviceDate = new Date(service.scheduledDate);
        return serviceDate >= now && serviceDate <= thirtyDaysFromNow;
      })
      .map(service => ({ ...service, startDateTime: service.scheduledDate, source: 'local' }));

    const upcomingGoogleEvents = googleCalendarEvents
      .filter(event => {
        const eventDate = new Date(event.start?.dateTime || event.start?.date);
        return eventDate >= now && eventDate <= thirtyDaysFromNow;
      })
      .map(event => ({
        id: event.id,
        title: event.summary,
        service: event.summary,
        clientName: event.description || 'Google Calendar Event',
        scheduledDate: event.start?.dateTime || event.start?.date,
        startDateTime: event.start?.dateTime || event.start?.date,
        priority: 'medium',
        status: 'scheduled',
        duration: event.duration || 60,
        notes: event.description,
        source: 'google'
      }));

    const upcomingUnifiedEvents = unifiedEvents
      .filter(event => {
        const eventDate = new Date(event.startDateTime);
        return eventDate >= now && eventDate <= thirtyDaysFromNow;
      })
      .map(event => ({
        ...event,
        scheduledDate: event.startDateTime,
        source: 'database'
      }));

    const allEvents = [...upcomingServices, ...upcomingGoogleEvents, ...upcomingUnifiedEvents];
    const uniqueEvents = allEvents.filter((event, index, array) =>
      array.findIndex(e => e.id === event.id) === index
    );

    return uniqueEvents.sort((a, b) => {
      try {
        const dateA = new Date(a.startDateTime || a.scheduledDate);
        const dateB = new Date(b.startDateTime || b.scheduledDate);
        const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
        return timeA - timeB;
      } catch {
        return 0;
      }
    }).slice(0, 10);
  };

  // Sync with Google Calendar
  const syncWithGoogleCalendar = async () => {
    try {
      console.log('🔄 Syncing with Google Calendar...');
      const response = await fetch('/api/calendar/sync', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const events = await response.json();
        setGoogleCalendarEvents(events);
        console.log('✅ Google Calendar sync completed:', events.length, 'events');
      } else {
        console.error('❌ Failed to sync with Google Calendar');
        alert('Google Calendar sync is not yet configured. Please set up OAuth credentials.');
      }
    } catch (error) {
      console.error('Error syncing with Google Calendar:', error);
      alert('Error syncing with Google Calendar. Please try again later.');
    }
  };

  // Export to Google Calendar
  const exportToGoogleCalendar = async () => {
    try {
      console.log('📤 Exporting to Google Calendar...');
      const eventsToExport = scheduledServices.filter(service =>
        !service.googleCalendarId
      );

      if (eventsToExport.length === 0) {
        alert('No new events to export to Google Calendar.');
        return;
      }

      const response = await fetch('/api/calendar/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToExport }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Export to Google Calendar completed:', result.exported, 'events');
        alert(`Successfully exported ${result.exported} events to Google Calendar!`);
        await syncWithGoogleCalendar();
      } else {
        console.error('❌ Failed to export to Google Calendar');
        alert('Google Calendar export is not yet configured. Please set up OAuth credentials.');
      }
    } catch (error) {
      console.error('Error exporting to Google Calendar:', error);
      alert('Error exporting to Google Calendar. Please try again later.');
    }
  };

  return (
    <DragDropProvider onEventDrop={handleEventDrop} onEventResize={handleEventResize}>
      <div ref={containerRef} className="space-y-6">
        <div className="neo-card">
          <div className="p-0">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0 border-b border-border">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 bg-card border-r border-b border-border text-center">
                  <span className="text-sm font-bold text-foreground uppercase tracking-wide font-primary">
                    {day}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0">
              {monthDays.map(day => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, selectedDate);
                const isTodayDate = isToday(day);
                const isSelected = isSameDay(day, selectedDate);
                const dayHour = 9; // Default hour for month view (9am)

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[140px] p-2 border-r border-b border-border cursor-pointer transition-colors relative group ${
                      !isCurrentMonth
                        ? 'bg-background text-muted'
                        : isSelected
                        ? 'bg-accent/20'
                        : isTodayDate
                        ? 'bg-accent/10 border-2 border-accent'
                        : 'bg-card hover:bg-card/80'
                    }`}
                    onClick={() => {
                      onDateSelect?.(day)
                      if (isCurrentMonth && onDayClick) {
                        onDayClick(day)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium font-primary ${
                        isTodayDate ? 'bg-accent text-accent-foreground px-2 py-1 rounded font-bold' : ''
                      }`}>
                        {format(day, 'd')}
                      </span>
                      <div className="flex items-center space-x-1">
                        {/* Add Event Button - appears on hover */}
                        {isCurrentMonth && onDayClick && (
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity neo-button-active text-xs p-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDayClick(day)
                            }}
                            title="Create event"
                          >
                            +
                          </button>
                        )}
                        {dayEvents.length > 0 && (
                          <Badge className={`h-5 w-5 p-0 text-xs flex items-center justify-center ${
                            dayEvents.length > 5 ? 'bg-red-600 text-white' :
                            dayEvents.length > 3 ? 'bg-orange-500 text-white' :
                            dayEvents.length > 1 ? 'bg-accent text-accent-foreground' :
                            'bg-green-600 text-white'
                          }`}>
                            {dayEvents.length > 9 ? '9+' : dayEvents.length}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Show services for this day */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((serviceItem) => {
                        const service = serviceItem as any;
                        const unifiedEvent = unifiedEvents.find(e => e.id === service.id);

                        if (unifiedEvent) {
                          // Use CalendarEvent (Framer Motion) for unified events
                          const eventDate = new Date(unifiedEvent.startDateTime);
                          const eventHour = eventDate.getHours();

                          return (
                            <CalendarEvent
                              key={service.id}
                              event={unifiedEvent}
                              viewMode="month"
                              currentDate={format(day, 'yyyy-MM-dd')}
                              currentHour={eventHour}
                              onClick={(e) => {
                                if (onEventView) {
                                  onEventView(e);
                                }
                              }}
                              showResizeHandles={false}
                              isCompact={true}
                              className="text-xs p-1 rounded border hover:shadow-sm transition-all"
                            />
                          );
                        } else {
                          // Legacy event rendering
                          const servicePriority = safeString(service.priority, 'medium');
                          const priorityColor = servicePriority === 'high' ? 'bg-red-100 border-red-200 text-red-800' :
                                               servicePriority === 'medium' ? 'bg-yellow-100 border-yellow-200 text-yellow-800' :
                                               'bg-green-100 border-green-200 text-green-800';

                          return (
                            <div
                              key={service.id}
                              className={`text-xs p-1 border rounded cursor-pointer hover:shadow-sm transition-all group/event ${priorityColor}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onEventView) {
                                  const startDateTime = service.startDateTime || service.scheduledDate;
                                  const endDateTime = service.endDateTime || service.scheduledDate;
                                  const eventData = {
                                    id: service.id,
                                    type: service.type || 'event' as const,
                                    title: safeString(service.title || service.service, 'Event'),
                                    description: service.description || service.notes,
                                    startDateTime: startDateTime,
                                    endDateTime: endDateTime,
                                    duration: service.duration || 60,
                                    priority: service.priority || 'medium',
                                    clientId: service.clientId,
                                    clientName: service.clientName,
                                    location: service.location,
                                    notes: service.notes,
                                    status: service.status
                                  };
                                  onEventView(eventData);
                                } else if ('service' in service && 'clientName' in service) {
                                  setViewingSchedule(service as ScheduledService);
                                }
                              }}
                              title={`${safeString(service.title || service.service, 'Event')} - ${safeString(service.clientName, 'Client')} at ${safeFormatDate(service.startDateTime || service.scheduledDate, 'HH:mm')}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium truncate flex-1">
                                  {(() => {
                                    const eventName = safeString(service.title || service.service, 'Event');
                                    return eventName.length > 15 ? eventName.substring(0, 15) + '...' : eventName;
                                  })()}
                                </div>
                                <div className="flex items-center space-x-1">
                                  <div className={`w-2 h-2 rounded-full ${
                                    safeString(service.status, 'scheduled') === 'completed' ? 'bg-green-600' :
                                    safeString(service.status, 'scheduled') === 'in_progress' ? 'bg-accent' :
                                    safeString(service.status, 'scheduled') === 'cancelled' ? 'bg-red-600' :
                                    'bg-muted'
                                  }`} title={safeString(service.status, 'scheduled')} />
                                </div>
                              </div>
                              <div className="text-xs opacity-75 truncate mt-0.5">
                                {(() => {
                                  const clientName = safeString(service.clientName, 'Client');
                                  return clientName.length > 12 ? clientName.substring(0, 12) + '...' : clientName;
                                })()}
                              </div>
                              <div className="text-xs opacity-60 flex items-center justify-between mt-0.5">
                                <span>{safeFormatDate(service.startDateTime || service.scheduledDate, 'HH:mm')}</span>
                                {service.duration && (
                                  <span className="text-xs">{service.duration}min</span>
                                )}
                              </div>
                            </div>
                          );
                        }
                      })}

                      {dayEvents.length > 3 && (
                        <div
                          className="text-xs text-center py-1 bg-muted rounded cursor-pointer hover:bg-muted/80 transition-colors"
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
                        <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" title="High activity day" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drag Visual Feedback */}
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

        {/* Upcoming Events - keeping existing implementation */}
        <div className="neo-card">
          <div className="bg-card border-b border-border p-6">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-foreground font-primary uppercase tracking-wide">
                Upcoming Events
              </h4>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => syncWithGoogleCalendar()}
                  className="neo-button px-3 py-1 text-sm font-medium font-primary uppercase tracking-wide"
                  title="Sync with Google Calendar"
                >
                  🔄 SYNC
                </button>
                <button
                  onClick={() => exportToGoogleCalendar()}
                  className="neo-button-active px-3 py-1 text-sm font-medium font-primary uppercase tracking-wide"
                  title="Export to Google Calendar"
                >
                  📤 EXPORT
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            {getUpcomingEvents().length > 0 ? (
              <div className="space-y-3">
                {getUpcomingEvents().map(event => (
                  <div
                    key={event.id}
                    className="p-4 border border-border rounded neo-card cursor-pointer hover:bg-card/80 transition-colors"
                    onClick={() => {
                      if (onEventView) {
                        const startDateTime = event.startDateTime || event.scheduledDate;
                        const endDateTime = (event as any).endDateTime || event.scheduledDate;
                        const eventData = {
                          id: event.id,
                          type: (event as any).type || 'event' as const,
                          title: safeString(event.title || event.service, 'Event'),
                          description: (event as any).description || event.notes,
                          startDateTime: startDateTime,
                          endDateTime: endDateTime,
                          duration: event.duration || 60,
                          priority: event.priority || 'medium',
                          clientId: (event as any).clientId,
                          clientName: event.clientName,
                          location: (event as any).location,
                          notes: event.notes,
                          status: event.status
                        };
                        onEventView(eventData);
                      } else if ('service' in event && event.service) {
                        setViewingSchedule(event as ScheduledService);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h5 className="font-bold text-foreground font-primary">{event.title || event.service}</h5>
                        <p className="text-sm text-muted-foreground font-primary">
                          {safeFormatDate(event.startDateTime || event.scheduledDate, 'EEEE, MMM d')} at {safeFormatDate(event.startDateTime || event.scheduledDate, 'h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {event.source === 'google' && (
                          <span className="text-xs bg-accent/30 text-foreground px-2 py-1 rounded">
                            Google
                          </span>
                        )}
                        <Badge className={`${
                          event.priority === 'high' ? 'bg-red-100 text-red-800' :
                          event.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {event.priority?.toUpperCase() || 'MEDIUM'}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground font-primary">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{event.duration || 60} minutes</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{event.clientName || 'No client'}</span>
                      </div>
                    </div>
                    {event.notes && (
                      <p className="mt-2 text-sm text-muted-foreground font-primary">{event.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-muted-foreground font-primary uppercase tracking-wide">
                  NO UPCOMING EVENTS
                </p>
                <button
                  onClick={() => syncWithGoogleCalendar()}
                  className="mt-3 neo-button-active px-4 py-2 text-sm font-primary uppercase tracking-wide"
                >
                  SYNC WITH GOOGLE CALENDAR
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DragDropProvider>
  );
};

export default ScheduleCalendar;
