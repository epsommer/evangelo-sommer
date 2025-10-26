"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, CalendarDays, Clock, Grid3x3, List, Target } from 'lucide-react'
import { useViewManager, TimeManagerView } from '@/contexts/ViewManagerContext'
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns'

interface TimeManagerNavigationProps {
  showTitle?: boolean
}

const VIEW_CONFIGS = {
  day: { label: 'Day', icon: Clock },
  week: { label: 'Week', icon: CalendarDays },
  month: { label: 'Month', icon: Calendar },
  year: { label: 'Year', icon: Grid3x3 },
  agenda: { label: 'Agenda', icon: List },
  objectives: { label: 'Mission Objectives', icon: Target },
} as const

const CALENDAR_VIEWS: TimeManagerView[] = ['day', 'week', 'month', 'year']

const TimeManagerNavigation: React.FC<TimeManagerNavigationProps> = ({ 
  showTitle = true 
}) => {
  const { state, setCurrentView, navigateDate, setSelectedDate } = useViewManager()
  const { currentView, selectedDate } = state
  const [showMiniCalendar, setShowMiniCalendar] = useState(false)
  const [showViewDropdown, setShowViewDropdown] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  const viewDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowMiniCalendar(false)
      }
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setShowViewDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Format date display based on current view
  const getDateDisplay = () => {
    switch (currentView) {
      case 'day':
        return format(selectedDate, 'EEEE, MMMM do')
      case 'week':
        const weekStart = startOfWeek(selectedDate)
        const weekEnd = endOfWeek(selectedDate)
        if (weekStart.getFullYear() === weekEnd.getFullYear()) {
          return `Week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
        } else {
          return `Week of ${format(weekStart, 'MMM d, yyyy')} - ${format(weekEnd, 'MMM d, yyyy')}`
        }
      case 'month':
        return format(selectedDate, 'MMMM yyyy')
      case 'year':
        return format(selectedDate, 'yyyy')
      default:
        return format(selectedDate, 'MMMM yyyy')
    }
  }

  // Generate mini calendar
  const generateMiniCalendar = () => {
    const today = new Date()
    const currentMonth = selectedDate.getMonth()
    const currentYear = selectedDate.getFullYear()
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      days.push(date)
    }

    return days
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setShowMiniCalendar(false)
    // Switch to day view when selecting a specific date
    if (currentView !== 'day') {
      setCurrentView('day')
    }
  }

  const handleTodayClick = () => {
    navigateDate('today')
    setShowMiniCalendar(false)
  }

  const MiniCalendar = () => {
    const days = generateMiniCalendar()
    const today = new Date()
    const currentMonth = selectedDate.getMonth()

    return (
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-hud-background-primary border-2 border-tactical-gold rounded-lg shadow-xl z-50 p-4 w-80">
        {/* Mini calendar header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              const prevMonth = new Date(selectedDate)
              prevMonth.setMonth(prevMonth.getMonth() - 1)
              setSelectedDate(prevMonth)
            }}
            className="p-1 text-tactical-grey-600 hover:text-tactical-gold"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <div className="text-sm font-semibold text-hud-text-primary">
            {format(selectedDate, 'MMMM yyyy')}
          </div>
          
          <button
            onClick={() => {
              const nextMonth = new Date(selectedDate)
              nextMonth.setMonth(nextMonth.getMonth() + 1)
              setSelectedDate(nextMonth)
            }}
            className="p-1 text-tactical-grey-600 hover:text-tactical-gold"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="text-xs text-tactical-grey-600 text-center py-1 font-semibold">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {days.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentMonth
            const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')

            return (
              <button
                key={index}
                onClick={() => handleDateClick(date)}
                className={`
                  text-xs p-1 rounded transition-colors
                  ${!isCurrentMonth ? 'text-tactical-grey-400' : 'text-hud-text-primary'}
                  ${isToday ? 'bg-tactical-gold text-tactical-grey-900 font-semibold' : ''}
                  ${isSelected && !isToday ? 'bg-tactical-gold-light text-tactical-grey-900' : ''}
                  ${isCurrentMonth && !isToday && !isSelected ? 'hover:bg-tactical-grey-200' : ''}
                `}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>

        {/* Today button */}
        <button
          onClick={handleTodayClick}
          className="w-full py-2 px-4 bg-tactical-gold text-tactical-grey-900 rounded font-semibold text-sm hover:bg-tactical-amber transition-colors"
        >
          Go to Today
        </button>
      </div>
    )
  }

  const ViewDropdown = () => (
    <div className="absolute top-full right-0 mt-2 w-48 bg-hud-background-primary border-2 border-tactical-gold rounded-lg shadow-xl z-50 overflow-hidden">
      {Object.entries(VIEW_CONFIGS).map(([viewKey, config]) => {
        const view = viewKey as TimeManagerView
        const Icon = config.icon
        const isActive = currentView === view

        return (
          <button
            key={view}
            onClick={() => {
              setCurrentView(view)
              setShowViewDropdown(false)
            }}
            className={`w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors ${
              isActive
                ? 'bg-tactical-gold text-tactical-grey-900'
                : 'text-hud-text-primary hover:bg-tactical-grey-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="font-medium">{config.label}</span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="bg-hud-background-secondary border-b-2 border-tactical-gold">
      <div className="px-6 py-4">
        {showTitle && (
          <h1 className="text-2xl font-black text-hud-text-primary uppercase tracking-wide font-primary mb-4">
            Time Manager
          </h1>
        )}

        <div className="flex items-center justify-between">
          {/* Left: Navigation Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateDate('previous')}
              className="p-2 text-tactical-grey-600 hover:text-tactical-gold hover:bg-tactical-grey-200 rounded transition-colors border border-transparent hover:border-tactical-gold"
              title="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Date Display with Calendar Popup */}
            <div className="relative" ref={calendarRef}>
              <button
                onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                className="px-4 py-2 text-lg font-semibold text-hud-text-primary hover:text-tactical-gold transition-colors font-primary border-2 border-transparent hover:border-tactical-gold rounded-lg"
              >
                {getDateDisplay()}
              </button>
              {showMiniCalendar && <MiniCalendar />}
            </div>

            <button
              onClick={() => navigateDate('next')}
              className="p-2 text-tactical-grey-600 hover:text-tactical-gold hover:bg-tactical-grey-200 rounded transition-colors border border-transparent hover:border-tactical-gold"
              title="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Right: View Selector */}
          <div className="relative" ref={viewDropdownRef}>
            <Button
              variant="outline"
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              className="border-tactical-gold text-tactical-gold hover:bg-tactical-gold hover:text-tactical-grey-900 px-4 py-2 flex items-center space-x-2"
            >
              {React.createElement(VIEW_CONFIGS[currentView].icon, { className: "h-4 w-4" })}
              <span>{VIEW_CONFIGS[currentView].label}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showViewDropdown ? 'rotate-180' : ''}`} />
            </Button>
            {showViewDropdown && <ViewDropdown />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TimeManagerNavigation