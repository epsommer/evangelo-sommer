"use client";

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
}

interface ScheduleCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onDayClick?: (date: Date) => void;
  onEventEdit?: (event: any) => void;
  enableEditing?: boolean;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ 
  selectedDate = new Date(), 
  onDateSelect,
  onDayClick,
  onEventEdit,
  enableEditing = false 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([]);
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<any[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledService | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<ScheduledService | null>(null);

  // Load scheduled services from localStorage
  useEffect(() => {
    try {
      const services = JSON.parse(localStorage.getItem('scheduled-services') || '[]');
      setScheduledServices(services);
      console.log('📅 Calendar loaded schedules:', services.length);
    } catch (error) {
      console.error('Error loading scheduled services for calendar:', error);
    }
  }, []);

  // Get days in current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get services for a specific date
  const getServicesForDate = (date: Date) => {
    return scheduledServices.filter(service => {
      const serviceDate = new Date(service.scheduledDate);
      return isSameDay(serviceDate, date);
    });
  };

  // Navigate months
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    onDateSelect?.(new Date());
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
      
      // Update local state
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
        
        // Update local state
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
    
    // Combine local scheduled services and Google Calendar events
    const upcomingServices = scheduledServices
      .filter(service => {
        const serviceDate = new Date(service.scheduledDate);
        return serviceDate >= now && serviceDate <= thirtyDaysFromNow;
      })
      .map(service => ({ ...service, source: 'local' }));

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
        priority: 'medium',
        status: 'scheduled',
        duration: event.duration || 60,
        notes: event.description,
        source: 'google'
      }));

    // Combine and sort by date
    const allEvents = [...upcomingServices, ...upcomingGoogleEvents];
    return allEvents.sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    ).slice(0, 10); // Show only next 10 events
  };

  // Sync with Google Calendar
  const syncWithGoogleCalendar = async () => {
    try {
      console.log('🔄 Syncing with Google Calendar...');
      // Call API to fetch Google Calendar events
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
        // For demo purposes, show a notification
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
      // Get local events to export
      const eventsToExport = scheduledServices.filter(service => 
        !service.googleCalendarId // Only export if not already in Google Calendar
      );

      if (eventsToExport.length === 0) {
        alert('No new events to export to Google Calendar.');
        return;
      }

      // Call API to create events in Google Calendar
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
        
        // Refresh the calendar data
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
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader className="bg-off-white border-b-2 border-gold">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Calendar className="h-6 w-6 text-gold" />
              <h3 className="text-xl font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                Schedule Calendar
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={previousMonth}
                className="px-3 py-1 bg-light-grey hover:bg-medium-grey text-dark-grey font-medium text-sm rounded"
              >
                ←
              </button>
              <span className="px-4 py-1 text-lg font-bold text-dark-grey font-space-grotesk">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                onClick={nextMonth}
                className="px-3 py-1 bg-light-grey hover:bg-medium-grey text-dark-grey font-medium text-sm rounded"
              >
                →
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 bg-gold hover:bg-gold-dark text-dark-grey font-medium text-sm rounded"
              >
                Today
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 bg-light-grey border-r border-b text-center">
                <span className="text-sm font-bold text-dark-grey uppercase tracking-wide font-space-grotesk">
                  {day}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0">
            {monthDays.map(day => {
              const dayServices = getServicesForDate(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              const isSelected = isSameDay(day, selectedDate);

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[140px] p-2 border-r border-b cursor-pointer transition-colors relative group ${
                    !isCurrentMonth 
                      ? 'bg-gray-50 text-gray-400' 
                      : isSelected
                      ? 'bg-gold-light'
                      : isTodayDate
                      ? 'bg-blue-50'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    onDateSelect?.(day)
                    if (isCurrentMonth && onDayClick) {
                      onDayClick(day)
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${
                      isTodayDate ? 'bg-gold text-dark-grey px-2 py-1 rounded font-bold' : ''
                    }`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex items-center space-x-1">
                      {/* Add Event Button - appears on hover */}
                      {isCurrentMonth && onDayClick && (
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-gold hover:bg-gold-light text-dark-grey rounded p-1 text-xs font-bold"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDayClick(day)
                          }}
                          title="Create event"
                        >
                          +
                        </button>
                      )}
                      {dayServices.length > 0 && (
                        <Badge className={`h-5 w-5 p-0 text-xs flex items-center justify-center ${
                          dayServices.length > 5 ? 'bg-red-600 text-white' :
                          dayServices.length > 3 ? 'bg-orange-500 text-white' :
                          dayServices.length > 1 ? 'bg-blue-600 text-white' :
                          'bg-green-600 text-white'
                        }`}>
                          {dayServices.length > 9 ? '9+' : dayServices.length}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Show services for this day - Enhanced density handling */}
                  <div className="space-y-1">
                    {dayServices.slice(0, 3).map((service, index) => {
                      const priorityColor = service.priority === 'high' ? 'bg-red-100 border-red-200 text-red-800' :
                                           service.priority === 'medium' ? 'bg-yellow-100 border-yellow-200 text-yellow-800' :
                                           'bg-green-100 border-green-200 text-green-800';
                      
                      return (
                        <div
                          key={service.id}
                          className={`text-xs p-1 border rounded cursor-pointer hover:shadow-sm transition-all group/event ${priorityColor}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingSchedule(service);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (onEventEdit) {
                              // Convert to UnifiedEvent format for editing
                              const eventData = {
                                id: service.id,
                                type: 'event' as const,
                                title: service.title || service.service,
                                description: service.notes,
                                startDateTime: service.scheduledDate,
                                duration: service.duration || 60,
                                priority: service.priority as any,
                                clientName: service.clientName,
                                notes: service.notes,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                              };
                              onEventEdit(eventData);
                            }
                          }}
                          title={`${service.service} - ${service.clientName} at ${format(new Date(service.scheduledDate), 'HH:mm')}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium truncate flex-1">
                              {service.service.length > 15 ? service.service.substring(0, 15) + '...' : service.service}
                            </div>
                            <div className="flex items-center space-x-1">
                              {/* Quick edit button */}
                              {onEventEdit && (
                                <button
                                  className="opacity-0 group-hover/event:opacity-100 transition-opacity text-blue-600 hover:text-blue-800 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const eventData = {
                                      id: service.id,
                                      type: 'event' as const,
                                      title: service.title || service.service,
                                      description: service.notes,
                                      startDateTime: service.scheduledDate,
                                      duration: service.duration || 60,
                                      priority: service.priority as any,
                                      clientName: service.clientName,
                                      notes: service.notes,
                                      createdAt: new Date().toISOString(),
                                      updatedAt: new Date().toISOString()
                                    };
                                    onEventEdit(eventData);
                                  }}
                                  title="Edit event (or double-click)"
                                >
                                  ✏️
                                </button>
                              )}
                              <div className={`w-2 h-2 rounded-full ${
                                service.status === 'completed' ? 'bg-green-600' :
                                service.status === 'in_progress' ? 'bg-gold' :
                                service.status === 'cancelled' ? 'bg-red-600' :
                                'bg-medium-grey'
                              }`} title={service.status} />
                            </div>
                          </div>
                          <div className="text-xs opacity-75 truncate mt-0.5">
                            {service.clientName.length > 12 ? service.clientName.substring(0, 12) + '...' : service.clientName}
                          </div>
                          <div className="text-xs opacity-60 flex items-center justify-between mt-0.5">
                            <span>{format(new Date(service.scheduledDate), 'HH:mm')}</span>
                            {service.duration && (
                              <span className="text-xs">{service.duration}min</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {dayServices.length > 3 && (
                      <div 
                        className="text-xs text-center py-1 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Show all events for this day in a modal or expanded view
                          console.log('Show all events for', format(day, 'yyyy-MM-dd'));
                        }}
                        title={`View all ${dayServices.length} events`}
                      >
                        <span className="font-medium">+{dayServices.length - 3} more</span>
                        <br />
                        <span className="text-xs opacity-75">click to expand</span>
                      </div>
                    )}
                    
                    {/* Event density indicator */}
                    {dayServices.length > 5 && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" title="High activity day" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader className="bg-off-white border-b border-light-grey">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
              Upcoming Events
            </h4>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => syncWithGoogleCalendar()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium"
                title="Sync with Google Calendar"
              >
                🔄 Sync
              </button>
              <button
                onClick={() => exportToGoogleCalendar()}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded font-medium"
                title="Export to Google Calendar"
              >
                📤 Export
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {getUpcomingEvents().length > 0 ? (
            <div className="space-y-3">
              {getUpcomingEvents().map(event => (
                <div 
                  key={event.id} 
                  className="p-4 border border-light-grey rounded bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setViewingSchedule(event)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h5 className="font-bold text-dark-grey">{event.title || event.service}</h5>
                      <p className="text-sm text-gray-600">
                        {format(new Date(event.scheduledDate), 'EEEE, MMM d')} at {format(new Date(event.scheduledDate), 'h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {event.source === 'google' && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
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
                      {enableEditing && event.source !== 'google' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSchedule(event);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Edit schedule"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSchedule(event.id);
                            }}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Delete schedule"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-medium-grey">
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
                    <p className="mt-2 text-sm text-medium-grey">{event.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📅</div>
              <p className="text-medium-grey">
                No upcoming events
              </p>
              <button
                onClick={() => syncWithGoogleCalendar()}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
              >
                Sync with Google Calendar
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Schedule Modal */}
      {editingSchedule && enableEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Edit Scheduled Service
            </h3>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updatedSchedule = {
                  ...editingSchedule,
                  service: formData.get('service') as string,
                  scheduledDate: formData.get('date') + 'T' + formData.get('time'),
                  notes: formData.get('notes') as string,
                  priority: formData.get('priority') as string,
                  duration: parseInt(formData.get('duration') as string) || 60,
                  recurrence: formData.get('recurrence') as string
                };
                handleUpdateSchedule(updatedSchedule);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type
                </label>
                <input
                  type="text"
                  name="service"
                  defaultValue={editingSchedule.service}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingSchedule.scheduledDate.split('T')[0]}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    name="time"
                    defaultValue={editingSchedule.scheduledDate.split('T')[1]?.substring(0, 5) || '09:00'}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    defaultValue={editingSchedule.priority || 'medium'}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    defaultValue={editingSchedule.duration || 60}
                    min="15"
                    max="480"
                    step="15"
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recurrence
                </label>
                <select
                  name="recurrence"
                  defaultValue={editingSchedule.recurrence || 'NONE'}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="NONE">No Recurrence</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Bi-weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  defaultValue={editingSchedule.notes || ''}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Detail Modal */}
      {viewingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Schedule Details
              </h3>
              <button
                onClick={() => setViewingSchedule(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold text-gray-900 mb-2">{viewingSchedule.service}</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Client: {viewingSchedule.clientName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(viewingSchedule.scheduledDate), 'EEEE, MMMM do, yyyy')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{format(new Date(viewingSchedule.scheduledDate), 'h:mm a')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-4 h-4 text-center">⏱</span>
                    <span>Duration: {viewingSchedule.duration || 60} minutes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-4 h-4 text-center">🔄</span>
                    <span>Recurrence: {viewingSchedule.recurrence || 'None'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-4 h-4 text-center">📋</span>
                    <Badge className={`${
                      viewingSchedule.priority === 'high' ? 'bg-red-100 text-red-800' :
                      viewingSchedule.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {viewingSchedule.priority?.toUpperCase() || 'MEDIUM'} PRIORITY
                    </Badge>
                  </div>
                  {viewingSchedule.notes && (
                    <div className="mt-3 p-3 bg-blue-50 rounded">
                      <div className="font-medium text-blue-900 mb-1">Notes:</div>
                      <div className="text-blue-800">{viewingSchedule.notes}</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setViewingSchedule(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Close
                </button>
                {enableEditing && (
                  <>
                    <button
                      onClick={() => {
                        setEditingSchedule(viewingSchedule);
                        setViewingSchedule(null);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Edit Schedule
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteSchedule(viewingSchedule.id);
                        setViewingSchedule(null);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleCalendar;