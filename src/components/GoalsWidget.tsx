"use client"

import React from 'react'
import { Target, TrendingUp, Clock, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useGoals } from '@/hooks/useGoals'
import { format } from 'date-fns'

interface GoalsWidgetProps {
  onViewAll?: () => void
}

const GoalsWidget: React.FC<GoalsWidgetProps> = ({ onViewAll }) => {
  const {
    goals,
    statistics,
    isLoading,
    getOverdueGoals,
    getUpcomingDeadlines,
    getGoalsByStatus
  } = useGoals()

  if (isLoading) {
    return (
      <Card className="bg-white border-2 border-light-grey">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-gold border-t-transparent animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-medium-grey font-space-grotesk uppercase tracking-wide">Loading...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const activeGoals = getGoalsByStatus('in-progress')
  const overdue = getOverdueGoals()
  const upcoming = getUpcomingDeadlines(7)
  
  // Get top 3 active goals by priority
  const topGoals = activeGoals
    .sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    .slice(0, 3)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600'
      case 'high': return 'text-orange-500'
      case 'medium': return 'text-gold'
      case 'low': return 'text-medium-grey'
      default: return 'text-medium-grey'
    }
  }

  return (
    <Card className="bg-white border-2 border-light-grey">
      <CardHeader className="bg-off-white border-b border-light-grey p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Target className="h-5 w-5 text-gold" />
            <h3 className="text-lg font-bold text-dark-grey uppercase tracking-wide font-space-grotesk">
              GOALS
            </h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-gold font-bold text-sm uppercase tracking-wide hover:text-gold-dark hover:bg-gold-light"
            onClick={onViewAll}
          >
            VIEW ALL
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 font-space-grotesk">
              {statistics.byStatus.completed || 0}
            </div>
            <div className="text-xs uppercase text-medium-grey font-space-grotesk tracking-wide">
              COMPLETED
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 font-space-grotesk">
              {activeGoals.length}
            </div>
            <div className="text-xs uppercase text-medium-grey font-space-grotesk tracking-wide">
              ACTIVE
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold font-space-grotesk ${overdue.length > 0 ? 'text-red-600' : 'text-medium-grey'}`}>
              {overdue.length}
            </div>
            <div className="text-xs uppercase text-medium-grey font-space-grotesk tracking-wide">
              OVERDUE
            </div>
          </div>
        </div>
        
        {/* Progress Overview */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium text-medium-grey mb-2 font-space-grotesk">
            <span className="uppercase tracking-wide">OVERALL PROGRESS</span>
            <span>{Math.round(statistics.averageProgress)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${statistics.averageProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Active Goals */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-medium-grey uppercase tracking-wider mb-3 font-space-grotesk">
            ACTIVE GOALS
          </h4>
          
          {topGoals.length === 0 ? (
            <div className="text-center py-6">
              <Target className="h-8 w-8 mx-auto mb-2 text-gold opacity-50" />
              <p className="text-sm text-medium-grey font-space-grotesk mb-2">
                No active goals
              </p>
              <Button 
                size="sm"
                className="bg-gold text-dark-grey px-4 py-1 font-bold uppercase tracking-wide hover:bg-gold-light font-space-grotesk text-xs"
                onClick={onViewAll}
              >
                CREATE GOAL
              </Button>
            </div>
          ) : (
            topGoals.map(goal => (
              <div key={goal.id} className="p-3 bg-off-white hover:bg-light-grey transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-dark-grey font-space-grotesk text-sm truncate">
                      {goal.title}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-medium-grey font-space-grotesk mt-1">
                      <Clock className="h-3 w-3" />
                      <span>Due {format(new Date(goal.endDate), 'MMM d')}</span>
                      <span className={`uppercase font-bold ${getPriorityColor(goal.priority)}`}>
                        {goal.priority}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gold font-space-grotesk">
                    {goal.progress}%
                  </div>
                </div>
                <Progress value={goal.progress} className="h-1" />
              </div>
            ))
          )}
        </div>

        {/* Upcoming Deadlines Alert */}
        {upcoming.length > 0 && (
          <div className="mt-6 pt-4 border-t border-light-grey">
            <div className="flex items-center space-x-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-dark-grey font-space-grotesk">
                {upcoming.length} deadline{upcoming.length > 1 ? 's' : ''} this week
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default GoalsWidget