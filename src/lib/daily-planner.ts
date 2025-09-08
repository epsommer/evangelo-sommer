// Daily Planner Utilities - Sharp Modern ServicePro CRM

import { DailyTask, DailyPlan, PlannerStats, TimeSlot, TaskFormData } from '@/types/daily-planner';
import { format, startOfDay, endOfDay, isWithinInterval, addHours, differenceInMinutes } from 'date-fns';

// Mock data for development
export const mockTasks: DailyTask[] = [
  {
    id: '1',
    title: 'Lawn Maintenance - Johnson Residence',
    description: 'Weekly lawn mowing and edge trimming',
    startTime: new Date(2024, 0, 15, 9, 0),
    endTime: new Date(2024, 0, 15, 11, 0),
    priority: 'medium',
    status: 'pending',
    clientId: 'client-1',
    serviceType: 'landscaping',
    location: '123 Oak Street',
    estimatedDuration: 120,
    notes: 'Check sprinkler system',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Dog Walking - Bella & Max',
    description: 'Daily walk for two golden retrievers',
    startTime: new Date(2024, 0, 15, 14, 0),
    endTime: new Date(2024, 0, 15, 15, 30),
    priority: 'high',
    status: 'completed',
    clientId: 'client-2',
    serviceType: 'pet_services',
    location: 'Riverside Park',
    estimatedDuration: 90,
    actualDuration: 85,
    notes: 'Dogs love the river trail',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    title: 'Snow Removal - Commercial Plaza',
    description: 'Clear parking lot and walkways',
    startTime: new Date(2024, 0, 15, 6, 0),
    endTime: new Date(2024, 0, 15, 8, 0),
    priority: 'urgent',
    status: 'in_progress',
    clientId: 'client-3',
    serviceType: 'snow_removal',
    location: 'Downtown Plaza',
    estimatedDuration: 120,
    notes: 'Priority: main entrance first',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    title: 'Website Design Review',
    description: 'Client feedback session for new website',
    startTime: new Date(2024, 0, 15, 16, 0),
    endTime: new Date(2024, 0, 15, 17, 0),
    priority: 'medium',
    status: 'pending',
    clientId: 'client-4',
    serviceType: 'creative_development',
    location: 'Video Call',
    estimatedDuration: 60,
    notes: 'Prepare mockups for review',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Generate time slots for the day (7 AM to 7 PM)
export const generateTimeSlots = (tasks: DailyTask[]): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  
  for (let hour = 7; hour <= 19; hour++) {
    const displayTime = hour.toString().padStart(2, '0') + ':00';
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    
    // Find tasks that start in this hour
    const hourTasks = tasks.filter(task => {
      const taskHour = task.startTime.getHours();
      return taskHour === hour;
    });
    
    slots.push({
      hour,
      displayTime,
      period,
      tasks: hourTasks,
    });
  }
  
  return slots;
};

// Calculate planner statistics
export const calculatePlannerStats = (tasks: DailyTask[]): PlannerStats => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  
  const totalPlannedMinutes = tasks.reduce((sum, task) => sum + task.estimatedDuration, 0);
  const totalActualMinutes = tasks.reduce((sum, task) => sum + (task.actualDuration || 0), 0);
  
  const totalPlannedHours = totalPlannedMinutes / 60;
  const totalActualHours = totalActualMinutes / 60;
  
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const averageTaskDuration = totalTasks > 0 ? totalPlannedMinutes / totalTasks : 0;
  
  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    inProgressTasks,
    totalPlannedHours,
    totalActualHours,
    completionRate,
    averageTaskDuration,
  };
};

// Get tasks for a specific date
export const getTasksForDate = (tasks: DailyTask[], date: Date): DailyTask[] => {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  
  return tasks.filter(task => 
    isWithinInterval(task.startTime, { start: dayStart, end: dayEnd })
  );
};

// Create a new task
export const createTask = (formData: TaskFormData): DailyTask => {
  const startTime = new Date(formData.startTime);
  const endTime = new Date(formData.endTime);
  const estimatedDuration = differenceInMinutes(endTime, startTime);
  
  return {
    id: generateTaskId(),
    title: formData.title,
    description: formData.description,
    startTime,
    endTime,
    priority: formData.priority,
    status: 'pending',
    clientId: formData.clientId,
    serviceType: formData.serviceType,
    location: formData.location,
    estimatedDuration,
    notes: formData.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

// Update task status
export const updateTaskStatus = (
  tasks: DailyTask[], 
  taskId: string, 
  status: DailyTask['status']
): DailyTask[] => {
  return tasks.map(task => 
    task.id === taskId 
      ? { ...task, status, updatedAt: new Date() }
      : task
  );
};

// Update task
export const updateTask = (
  tasks: DailyTask[], 
  taskId: string, 
  updates: Partial<DailyTask>
): DailyTask[] => {
  return tasks.map(task => 
    task.id === taskId 
      ? { ...task, ...updates, updatedAt: new Date() }
      : task
  );
};

// Delete task
export const deleteTask = (tasks: DailyTask[], taskId: string): DailyTask[] => {
  return tasks.filter(task => task.id !== taskId);
};

// Generate unique task ID
const generateTaskId = (): string => {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Format time for display
export const formatTime = (date: Date): string => {
  return format(date, 'HH:mm');
};

// Format duration
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}m`;
  }
};

// Get priority color class
export const getPriorityColorClass = (priority: DailyTask['priority']): string => {
  const colorMap = {
    low: 'priority-low',
    medium: 'priority-medium',
    high: 'priority-high',
    urgent: 'priority-urgent',
  };
  return colorMap[priority];
};

// Get status color class
export const getStatusColorClass = (status: DailyTask['status']): string => {
  const colorMap = {
    pending: 'status-pending',
    in_progress: 'status-in-progress',
    completed: 'status-completed',
    cancelled: 'status-cancelled',
  };
  return colorMap[status];
};

// Get service type color class
export const getServiceTypeColorClass = (serviceType?: DailyTask['serviceType']): string => {
  if (!serviceType) return '';
  
  const colorMap = {
    landscaping: 'service-landscaping',
    snow_removal: 'service-snow-removal',
    pet_services: 'service-pet-services',
    creative_development: 'service-creative-development',
  };
  return colorMap[serviceType] || '';
};

// Sort tasks by start time
export const sortTasksByTime = (tasks: DailyTask[]): DailyTask[] => {
  return [...tasks].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
};

// Get upcoming tasks (next 3 tasks that are not completed)
export const getUpcomingTasks = (tasks: DailyTask[], limit: number = 3): DailyTask[] => {
  const now = new Date();
  return tasks
    .filter(task => task.status !== 'completed' && task.startTime >= now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, limit);
};

// Check for task conflicts (overlapping times)
export const checkTaskConflicts = (tasks: DailyTask[], newTask: Omit<DailyTask, 'id' | 'createdAt' | 'updatedAt'>): DailyTask[] => {
  return tasks.filter(task => {
    const taskStart = task.startTime.getTime();
    const taskEnd = task.endTime.getTime();
    const newStart = newTask.startTime.getTime();
    const newEnd = newTask.endTime.getTime();
    
    // Check if times overlap
    return (newStart < taskEnd && newEnd > taskStart);
  });
};

// Validate task form data
export const validateTaskForm = (formData: TaskFormData): string[] => {
  const errors: string[] = [];
  
  if (!formData.title.trim()) {
    errors.push('Task title is required');
  }
  
  if (!formData.startTime) {
    errors.push('Start time is required');
  }
  
  if (!formData.endTime) {
    errors.push('End time is required');
  }
  
  if (formData.startTime && formData.endTime) {
    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);
    
    if (end <= start) {
      errors.push('End time must be after start time');
    }
  }
  
  if (formData.estimatedDuration <= 0) {
    errors.push('Estimated duration must be greater than 0');
  }
  
  return errors;
};
