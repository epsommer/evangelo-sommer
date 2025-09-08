import { CalendarEvent, CalendarIntegration } from '@/types/scheduling'

export class CalendarService {
  private integrations: Map<string, CalendarIntegration> = new Map()

  // Add integration
  addIntegration(integration: CalendarIntegration) {
    this.integrations.set(integration.id, integration)
  }

  // Remove integration
  removeIntegration(integrationId: string) {
    this.integrations.delete(integrationId)
  }

  // Get integration
  getIntegration(integrationId: string): CalendarIntegration | undefined {
    return this.integrations.get(integrationId)
  }

  // Get all integrations
  getAllIntegrations(): CalendarIntegration[] {
    return Array.from(this.integrations.values())
  }

  // Initiate OAuth for a provider
  async initiateOAuth(provider: string, state?: string): Promise<{ authUrl: string }> {
    const response = await fetch(`/api/auth/${provider}?${new URLSearchParams({ 
      state: state || '' 
    })}`)
    
    if (!response.ok) {
      throw new Error(`Failed to initiate ${provider} OAuth`)
    }
    
    return response.json()
  }

  // Sync events from external calendar
  async syncEvents(integrationId: string): Promise<CalendarEvent[]> {
    const integration = this.getIntegration(integrationId)
    if (!integration) {
      throw new Error('Integration not found')
    }

    const response = await fetch(`/api/calendar/${integration.provider}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessToken: integration.credentials?.accessToken,
        refreshToken: integration.credentials?.refreshToken,
        calendarId: integration.calendarId,
        databaseId: integration.provider === 'notion' ? integration.calendarId : undefined
      })
    })

    if (!response.ok) {
      const error = await response.json()
      if (error.requiresReauth) {
        throw new Error('REAUTH_REQUIRED')
      }
      throw new Error(`Sync failed: ${error.error}`)
    }

    const data = await response.json()
    return data.events
  }

  // Sync recurring events to external calendar
  async syncRecurringEvents(integrationId: string, events: CalendarEvent[]): Promise<{ successful: CalendarEvent[], failed: CalendarEvent[] }> {
    const successful: CalendarEvent[] = []
    const failed: CalendarEvent[] = []

    for (const event of events) {
      try {
        const syncedEvent = await this.createEvent(integrationId, event)
        successful.push(syncedEvent)
      } catch (error) {
        console.error(`Failed to sync event ${event.id}:`, error)
        failed.push(event)
      }
    }

    return { successful, failed }
  }

  // Create event in external calendar
  async createEvent(integrationId: string, event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent> {
    const integration = this.getIntegration(integrationId)
    if (!integration) {
      throw new Error('Integration not found')
    }

    const response = await fetch(`/api/calendar/${integration.provider}/create-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessToken: integration.credentials?.accessToken,
        refreshToken: integration.credentials?.refreshToken,
        calendarId: integration.calendarId,
        databaseId: integration.provider === 'notion' ? integration.calendarId : undefined,
        event
      })
    })

    if (!response.ok) {
      const error = await response.json()
      if (error.requiresReauth) {
        throw new Error('REAUTH_REQUIRED')
      }
      throw new Error(`Create event failed: ${error.error}`)
    }

    const data = await response.json()
    return data.event
  }

  // Handle OAuth callback data
  handleOAuthCallback(provider: string, data: any): CalendarIntegration {
    const integration: CalendarIntegration = {
      id: `${provider}-${Date.now()}`,
      provider: provider as any,
      accountId: data.accountId,
      calendarId: data.calendarId || data.workspaceId,
      isActive: true,
      syncEnabled: true,
      syncSettings: {
        syncDirection: 'bidirectional',
        autoCreateEvents: true,
        defaultVisibility: 'private'
      },
      credentials: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.addIntegration(integration)
    return integration
  }

  // Get provider display info
  getProviderInfo(provider: string) {
    const providers = {
      google: {
        id: 'google',
        name: 'Google Calendar',
        icon: '📅',
        color: 'bg-blue-500',
        description: 'Sync with Google Calendar for seamless scheduling'
      },
      outlook: {
        id: 'outlook',
        name: 'Microsoft Outlook',
        icon: '📆',
        color: 'bg-indigo-500',
        description: 'Connect with Outlook calendar and email'
      },
      notion: {
        id: 'notion',
        name: 'Notion Calendar',
        icon: '📝',
        color: 'bg-gray-800',
        description: 'Integrate with Notion databases as calendars'
      },
      apple: {
        id: 'apple',
        name: 'Apple Calendar',
        icon: '🍎',
        color: 'bg-gray-800',
        description: 'Integrate with Apple Calendar (iCloud)'
      },
      custom: {
        id: 'custom',
        name: 'Custom Webhook',
        icon: '🔗',
        color: 'bg-green-500',
        description: 'Custom integration via webhooks'
      }
    }

    return providers[provider as keyof typeof providers]
  }

  // Get all available providers
  getAvailableProviders() {
    return [
      this.getProviderInfo('google'),
      this.getProviderInfo('notion'),
      this.getProviderInfo('outlook'),
      this.getProviderInfo('apple'),
      this.getProviderInfo('custom')
    ]
  }
}

// Singleton instance
export const calendarService = new CalendarService()