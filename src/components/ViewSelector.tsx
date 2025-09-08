"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, List, Settings, CalendarDays, Grid3x3, Clock } from 'lucide-react'
import { useViewManager, TimeManagerView } from '@/contexts/ViewManagerContext'
import { format } from 'date-fns'

const VIEW_CONFIGS = {
  day: {
    label: 'Day',
    icon: Clock,
    description: 'Daily timeline view'
  },
  week: {
    label: 'Week',
    icon: CalendarDays,
    description: '7-day week view'
  },
  month: {
    label: 'Month',
    icon: Calendar,
    description: 'Monthly calendar'
  },
  year: {
    label: 'Year',
    icon: Grid3x3,
    description: 'Year overview'
  },
  agenda: {
    label: 'Agenda',
    icon: List,
    description: 'List view'
  },
  integrations: {
    label: 'Integrations',
    icon: Settings,
    description: 'Calendar sync settings'
  }
} as const

interface ViewSelectorProps {
  showTitle?: boolean
  showNavigation?: boolean
  variant?: 'full' | 'compact'
}

const ViewSelector: React.FC<ViewSelectorProps> = ({ 
  showTitle = true, 
  showNavigation = true, 
  variant = 'full' 
}) => {
  const { state, setCurrentView, navigateDate } = useViewManager()
  const { currentView, selectedDate } = state

  const formatDateForView = (date: Date, view: TimeManagerView) => {
    switch (view) {
      case 'day':
      case 'agenda':
        return format(date, 'EEEE, MMMM do, yyyy')
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
      case 'month':
        return format(date, 'MMMM yyyy')
      case 'year':
        return format(date, 'yyyy')
      default:
        return format(date, 'MMMM yyyy')
    }
  }

  const handleViewChange = (view: TimeManagerView) => {
    setCurrentView(view)
  }

  const getContextualButtonLabel = (view: TimeManagerView): string => {
    switch (view) {
      case 'day':
      case 'agenda':
        return 'Today'
      case 'week':
        return 'This Week'
      case 'month':
        return 'This Month'
      case 'year':
        return 'This Year'
      default:
        return 'Today'
    }
  }

  const getQuickNavigationLabels = (view: TimeManagerView): { previous: string; next: string } => {
    switch (view) {
      case 'day':
      case 'agenda':
        return { previous: 'Yesterday', next: 'Tomorrow' }
      case 'week':
        return { previous: 'Last Week', next: 'Next Week' }
      case 'month':
        return { previous: 'Last Month', next: 'Next Month' }
      case 'year':
        return { previous: 'Last Year', next: 'Next Year' }
      default:
        return { previous: 'Previous', next: 'Next' }
    }
  }

  const navigateToCurrentPeriod = () => {
    navigateDate('today')
  }

  if (variant === 'compact') {
    return (
      <div className="flex flex-col space-y-2">
        {/* View selector buttons */}
        <div className="flex items-center space-x-2">
          {Object.entries(VIEW_CONFIGS).slice(0, 4).map(([viewKey, config]) => {
            const view = viewKey as TimeManagerView
            const Icon = config.icon
            const isActive = currentView === view

            return (
              <Button
                key={view}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewChange(view)}
                className={`${
                  isActive 
                    ? 'bg-gold text-dark-grey' 
                    : 'border-gold text-gold hover:bg-gold hover:text-dark-grey'
                }`}
                title={config.description}
              >
                <Icon className="h-3 w-3" />
                <span className="sr-only">{config.label}</span>
              </Button>
            )
          })}
        </div>
        
        {/* Compact navigation */}
        {showNavigation && currentView !== 'integrations' && (
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('previous')}
              className="border-gold text-gold hover:bg-gold hover:text-dark-grey px-2 py-1 text-xs"
              title={getQuickNavigationLabels(currentView).previous}
              aria-label={`Navigate to ${getQuickNavigationLabels(currentView).previous.toLowerCase()}`}
            >
              ←
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={navigateToCurrentPeriod}
              className="border-gold text-gold hover:bg-gold hover:text-dark-grey px-2 py-1 text-xs font-medium"
              title={`Navigate to ${getContextualButtonLabel(currentView).toLowerCase()}`}
              aria-label={`Navigate to ${getContextualButtonLabel(currentView).toLowerCase()}`}
            >
              {getContextualButtonLabel(currentView).replace('This ', '').replace('Today', 'Now')}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('next')}
              className="border-gold text-gold hover:bg-gold hover:text-dark-grey px-2 py-1 text-xs"
              title={getQuickNavigationLabels(currentView).next}
              aria-label={`Navigate to ${getQuickNavigationLabels(currentView).next.toLowerCase()}`}
            >
              →
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-off-white p-4 md:p-6 border-b-2 border-gold">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div className="flex-1">
          {showTitle && (
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-dark-grey font-space-grotesk uppercase tracking-wide">
                Time Manager
              </h1>
              <p className="text-medium-grey font-medium font-space-grotesk uppercase tracking-wider text-sm">
                {formatDateForView(selectedDate, currentView)}
              </p>
            </div>
          )}
          
          {showNavigation && currentView !== 'integrations' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              {/* Quick navigation with contextual labels */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('previous')}
                  className="border-gold text-gold hover:bg-gold hover:text-dark-grey px-3 py-1 text-xs sm:text-sm"
                  title={getQuickNavigationLabels(currentView).previous}
                  aria-label={`Navigate to ${getQuickNavigationLabels(currentView).previous.toLowerCase()}`}
                >
                  <span className="hidden sm:inline">{getQuickNavigationLabels(currentView).previous}</span>
                  <span className="sm:hidden">←</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateToCurrentPeriod}
                  className="border-gold text-gold hover:bg-gold hover:text-dark-grey px-3 py-1 font-medium text-xs sm:text-sm"
                  title={`Navigate to ${getContextualButtonLabel(currentView).toLowerCase()}`}
                  aria-label={`Navigate to ${getContextualButtonLabel(currentView).toLowerCase()}`}
                >
                  {getContextualButtonLabel(currentView)}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('next')}
                  className="border-gold text-gold hover:bg-gold hover:text-dark-grey px-3 py-1 text-xs sm:text-sm"
                  title={getQuickNavigationLabels(currentView).next}
                  aria-label={`Navigate to ${getQuickNavigationLabels(currentView).next.toLowerCase()}`}
                >
                  <span className="hidden sm:inline">{getQuickNavigationLabels(currentView).next}</span>
                  <span className="sm:hidden">→</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Mobile view - show only icons */}
          <div className="flex md:hidden space-x-1">
            {Object.entries(VIEW_CONFIGS).map(([viewKey, config]) => {
              const view = viewKey as TimeManagerView
              const Icon = config.icon
              const isActive = currentView === view

              return (
                <Button
                  key={view}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleViewChange(view)}
                  className={`${
                    isActive 
                      ? 'bg-gold text-dark-grey' 
                      : 'border-gold text-gold hover:bg-gold hover:text-dark-grey'
                  } p-2`}
                  title={config.description}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              )
            })}
          </div>

          {/* Desktop view - show full buttons */}
          <div className="hidden md:flex items-center space-x-2">
            {Object.entries(VIEW_CONFIGS).map(([viewKey, config]) => {
              const view = viewKey as TimeManagerView
              const Icon = config.icon
              const isActive = currentView === view

              return (
                <Button
                  key={view}
                  variant={isActive ? 'default' : 'outline'}
                  onClick={() => handleViewChange(view)}
                  className={`${
                    isActive 
                      ? 'bg-gold text-dark-grey' 
                      : 'border-gold text-gold hover:bg-gold hover:text-dark-grey'
                  } px-4 py-2`}
                  title={config.description}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {config.label}
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewSelector