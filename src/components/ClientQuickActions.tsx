"use client"

import React from 'react'
import { MessageSquare, Calendar, Phone, Mail, FileText } from 'lucide-react'
import { Client } from '@/types/client'

interface ClientQuickActionsProps {
  client: Client
  onMessageClient: () => void
  onScheduleService: () => void
  onPhoneCall?: () => void
  onEmail?: () => void
}

const ClientQuickActions: React.FC<ClientQuickActionsProps> = ({
  client,
  onMessageClient,
  onScheduleService,
  onPhoneCall,
  onEmail
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

          {/* Schedule Service */}
          <button
            onClick={onScheduleService}
            className="neo-button p-4 flex flex-col items-center justify-center space-y-2 transition-transform hover:scale-[1.05]"
            title="Schedule appointment or service"
          >
            <Calendar className="h-6 w-6 text-foreground" />
            <span className="text-xs font-bold uppercase tracking-wide font-primary text-foreground">
              Schedule
            </span>
          </button>

          {/* Phone Call */}
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              onClick={(e) => {
                if (onPhoneCall) {
                  e.preventDefault()
                  onPhoneCall()
                }
              }}
              className="neo-button p-4 flex flex-col items-center justify-center space-y-2 transition-transform hover:scale-[1.05]"
              title={`Call ${client.phone}`}
            >
              <Phone className="h-6 w-6 text-foreground" />
              <span className="text-xs font-bold uppercase tracking-wide font-primary text-foreground">
                Call
              </span>
            </a>
          )}

          {/* Email */}
          {client.email && (
            <a
              href={`mailto:${client.email}`}
              onClick={(e) => {
                if (onEmail) {
                  e.preventDefault()
                  onEmail()
                }
              }}
              className="neo-button p-4 flex flex-col items-center justify-center space-y-2 transition-transform hover:scale-[1.05]"
              title={`Email ${client.email}`}
            >
              <Mail className="h-6 w-6 text-foreground" />
              <span className="text-xs font-bold uppercase tracking-wide font-primary text-foreground">
                Email
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClientQuickActions
