// src/app/goals/page.tsx
// Goals management page integrated with the time manager

"use client"

import React, { Suspense } from 'react'
import CRMLayout from '@/components/CRMLayout'
import GoalDashboard from '@/components/goals/GoalDashboard'

const GoalsPageContent = () => {
  return (
    <CRMLayout>
      <div className="space-y-6">
        <GoalDashboard />
      </div>
    </CRMLayout>
  )
}

const GoalsPage = () => {
  return (
    <Suspense fallback={
      <CRMLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-hud-border-accent border-t-transparent mx-auto mb-4"></div>
            <p className="text-medium-grey font-space-grotesk uppercase tracking-wide">Loading Goals...</p>
          </div>
        </div>
      </CRMLayout>
    }>
      <GoalsPageContent />
    </Suspense>
  )
}

export default GoalsPage