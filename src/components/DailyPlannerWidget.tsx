"use client"

import React from 'react'
import { format } from 'date-fns'
import { Calendar, Clock, ArrowRight, CheckCircle, Circle, AlertCircle, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DailyTask } from '@/types/daily-planner'
import { useGoals } from '@/hooks/useGoals'
import { 
  mockTasks, 
  calculatePlannerStats, 
  getTasksForDate, 
  getUpcomingTasks,
  formatTime,
  getPriorityColorClass
} from '@/lib/daily-planner'

interface DailyPlannerWidgetProps {
  onViewAll?: () => void
}

const DailyPlannerWidget: React.FC<DailyPlannerWidgetProps> = ({ onViewAll }) => {
  const today = new Date()
  const todaysTasks = getTasksForDate(mockTasks, today)
  const stats = calculatePlannerStats(todaysTasks)
  const upcomingTasks = getUpcomingTasks(todaysTasks, 3)
  
  // Get goals data
  const { getUpcomingDeadlines, goals } = useGoals()
  const upcomingGoalDeadlines = getUpcomingDeadlines(1) // Due today or overdue
  const goalsDueToday = upcomingGoalDeadlines.filter(item => {
    const dueDate = new Date('endDate' in item ? item.endDate : item.dueDate)
    return format(dueDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  })

  return (
    <Card className="bg-white border-2 border-light-grey">
      <CardHeader className="bg-off-white border-b border-light-grey p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-gold" />
            <h3 className="text-lg font-bold text-dark-grey uppercase tracking-wide font-space-grotesk">
              TODAY'S PLAN
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
        
        <div className="text-xs text-medium-grey font-space-grotesk uppercase tracking-wider mt-1">
          {format(today, 'EEEE, MMMM do')}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Progress Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gold font-space-grotesk">
              {stats.completedTasks}
            </div>
            <div className="text-xs uppercase text-medium-grey font-space-grotesk tracking-wide">
              DONE
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-dark-grey font-space-grotesk">
              {stats.pendingTasks + stats.inProgressTasks}
            </div>
            <div className="text-xs uppercase text-medium-grey font-space-grotesk tracking-wide">
              PENDING
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-medium-grey font-space-grotesk">
              {stats.totalTasks}
            </div>
            <div className="text-xs uppercase text-medium-grey font-space-grotesk tracking-wide">
              TOTAL
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium text-medium-grey mb-2 font-space-grotesk">
            <span className="uppercase tracking-wide">PROGRESS</span>
            <span>{Math.round(stats.completionRate)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${stats.completionRate}%` }}
            ></div>
          </div>
        </div>
        
        {/* Upcoming Tasks */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-medium-grey uppercase tracking-wider mb-3 font-space-grotesk">
            UP NEXT
          </h4>
          
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gold opacity-50" />
              <p className="text-sm text-medium-grey font-space-grotesk">
                All tasks completed for today!
              </p>
            </div>
          ) : (
            upcomingTasks.map(task => (
              <UpcomingTaskItem key={task.id} task={task} />
            ))
          )}
        </div>
        
        {/* Goals Due Today */}
        {goalsDueToday.length > 0 && (
          <div className="mt-6 pt-4 border-t border-light-grey">
            <div className="flex items-center space-x-2 mb-3">
              <Target className="h-4 w-4 text-gold" />
              <h4 className="text-sm font-bold text-medium-grey uppercase tracking-wider font-space-grotesk">
                GOALS DUE TODAY
              </h4>
            </div>
            <div className="space-y-2">
              {goalsDueToday.slice(0, 2).map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-gold bg-opacity-10 rounded">
                  <div className="flex items-center space-x-2">
                    <Target className="h-3 w-3 text-gold" />
                    <span className="text-sm font-medium text-dark-grey font-space-grotesk truncate">
                      {item.title}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs text-gold border-gold">
                    {'type' in item && item.type === 'milestone' ? 'Milestone' : 'Goal'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-6 pt-4 border-t border-light-grey">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-dark-grey font-space-grotesk">
                {Math.round(stats.totalPlannedHours * 10) / 10}h
              </div>
              <div className="text-xs uppercase text-medium-grey font-space-grotesk tracking-wide">
                PLANNED
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-gold font-space-grotesk">
                {stats.inProgressTasks}
              </div>
              <div className="text-xs uppercase text-medium-grey font-space-grotesk tracking-wide">
                IN PROGRESS
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface UpcomingTaskItemProps {
  task: DailyTask
}

const UpcomingTaskItem: React.FC<UpcomingTaskItemProps> = ({ task }) => {
  const getStatusIcon = (status: DailyTask['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-gold" />
      default:
        return <Circle className="h-4 w-4 text-medium-grey" />
    }
  }

  const getPriorityIndicator = (priority: DailyTask['priority']) => {
    const colors = {
      low: 'bg-light-grey',
      medium: 'bg-gold',
      high: 'bg-dark-grey',
      urgent: 'bg-red-600'
    }
    return colors[priority]
  }

  return (
    <div className="flex items-center justify-between p-3 bg-off-white hover:bg-light-grey transition-colors">
      <div className="flex items-center space-x-3 flex-1">
        {getStatusIcon(task.status)}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-dark-grey font-space-grotesk text-sm truncate">
            {task.title}
          </div>
          <div className="flex items-center space-x-2 text-xs text-medium-grey font-space-grotesk mt-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(task.startTime)}</span>
            {task.location && (
              <>
                <span>•</span>
                <span className="truncate">{task.location}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 ml-3">
        {task.serviceType && (
          <Badge 
            variant="outline" 
            className="text-xs px-2 py-0 font-space-grotesk"
          >
            {task.serviceType.replace('_', ' ').toUpperCase()}
          </Badge>
        )}
        <div className={`w-3 h-3 ${getPriorityIndicator(task.priority)}`}></div>
      </div>
    </div>
  )
}

export default DailyPlannerWidget
