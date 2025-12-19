"use client"

import React from 'react'

interface DragVisualFeedbackProps {
  containerRef?: React.RefObject<HTMLElement>
}

/**
 * DragVisualFeedback - DISABLED
 *
 * This component previously displayed a yellow, rotated "ghost tile" that followed
 * the cursor during event drag operations. It has been disabled to eliminate visual
 * noise and provide a cleaner UX.
 *
 * Visual feedback is now provided exclusively by:
 * - MonthDragGhostPreview: Dashed placeholder in month view at target location
 * - DragGhostPreview: Dashed placeholder in week/day views at target location
 *
 * These dashed placeholders are less distracting and provide clearer indication
 * of where the event will land when dropped.
 *
 * If you need to re-enable the ghost tile, restore the previous implementation
 * from git history and update this component.
 */
const DragVisualFeedback: React.FC<DragVisualFeedbackProps> = () => {
  // Component disabled - dashed placeholder provides cleaner UX
  return null
}

export default DragVisualFeedback