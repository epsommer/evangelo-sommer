"use client"

import React from 'react'
import { MessageSquare, Calendar, Receipt, StickyNote } from 'lucide-react'
import { Client } from '@/types/client'

interface ClientQuickActionsProps {
  client: Client
  onMessageClient: () => void
  onScheduleAppointment: () => void
  onCreateReceipt?: () => void
  onAddNote?: () => void
}

const ClientQuickActions: React.FC<ClientQuickActionsProps> = ({
  client,
  onMessageClient,
  onScheduleAppointment,
  onCreateReceipt,
  onAddNote
}) => {
  return (
    <div className="neo-container transition-transform hover:scale-[1.01]">
      <div className="neo-inset border-b border-foreground/10 p-4">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide font-primary">
          Quick Actions
        </h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Message Client */}
          <button
            onClick={onMessageClient}
            className="neo-button p-4 flex flex-col items-center justify-center space-y-2 transition-transform hover:scale-[1.05]"
            title="Add incoming message from client"
          >
            <MessageSquare className="h-6 w-6 text-foreground" />
            <span className="text-xs font-bold uppercase tracking-wide font-primary text-foreground">
              Message
            </span>
          </button>

          {/* Schedule Appointment */}
          <button
            onClick={onScheduleAppointment}
            className="neo-button p-4 flex flex-col items-center justify-center space-y-2 transition-transform hover:scale-[1.05]"
            title="Schedule appointment"
          >
            <Calendar className="h-6 w-6 text-foreground" />
            <span className="text-xs font-bold uppercase tracking-wide font-primary text-foreground">
              Appointment
            </span>
          </button>

          {/* Create Receipt/Invoice */}
          <button
            onClick={onCreateReceipt}
            className="neo-button p-4 flex flex-col items-center justify-center space-y-2 transition-transform hover:scale-[1.05]"
            title="Create receipt or invoice"
          >
            <Receipt className="h-6 w-6 text-foreground" />
            <span className="text-xs font-bold uppercase tracking-wide font-primary text-foreground">
              Receipt
            </span>
          </button>

          {/* Add Note */}
          <button
            onClick={onAddNote}
            className="neo-button p-4 flex flex-col items-center justify-center space-y-2 transition-transform hover:scale-[1.05]"
            title="Add note or memo"
          >
            <StickyNote className="h-6 w-6 text-foreground" />
            <span className="text-xs font-bold uppercase tracking-wide font-primary text-foreground">
              Note
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ClientQuickActions
