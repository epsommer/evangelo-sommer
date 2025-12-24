/**
 * Notion API Helper Functions
 * Utilities for working with Notion API - property extraction, mapping, and conversion
 */

import { Client } from '@notionhq/client'
import type { UnifiedEvent } from '@/components/EventCreationModal'

export interface NotionDatabaseSchema {
  titleProperty: string | null
  dateProperty: string | null
  descriptionProperty: string | null
  properties: Record<string, any>
}

/**
 * Rate limit handler with exponential backoff
 */
export async function notionApiCall<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = 1000
): Promise<T> {
  try {
    return await fn()
  } catch (error: any) {
    // Handle rate limiting (429)
    if (error.code === 'rate_limited' && retries > 0) {
      const retryAfter = error.headers?.['retry-after']
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, 3 - retries)

      console.log(`🔄 [Notion] Rate limited, retrying in ${delay}ms (${retries} retries left)`)
      await sleep(delay)
      return notionApiCall(fn, retries - 1, baseDelay)
    }

    throw error
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Detect database schema - find which properties to use for title, date, description
 */
export async function detectNotionDatabaseSchema(
  notion: Client,
  databaseId: string
): Promise<NotionDatabaseSchema> {
  try {
    const database = await notionApiCall(() =>
      notion.databases.retrieve({ database_id: databaseId })
    ) as any

    const properties = database.properties
    let titleProperty: string | null = null
    let dateProperty: string | null = null
    let descriptionProperty: string | null = null

    // Find title property
    for (const [name, prop] of Object.entries(properties)) {
      if ((prop as any).type === 'title') {
        titleProperty = name
        break
      }
    }

    // Find date property (prefer "Date" or similar names)
    const datePropertyNames = ['Date', 'date', 'Start Date', 'When', 'Time', 'Schedule']
    for (const name of datePropertyNames) {
      if (properties[name] && (properties[name] as any).type === 'date') {
        dateProperty = name
        break
      }
    }

    // If no preferred name, find any date property
    if (!dateProperty) {
      for (const [name, prop] of Object.entries(properties)) {
        if ((prop as any).type === 'date') {
          dateProperty = name
          break
        }
      }
    }

    // Find description/notes property
    const descPropertyNames = ['Description', 'description', 'Notes', 'notes', 'Details', 'Content']
    for (const name of descPropertyNames) {
      if (properties[name] && ['rich_text', 'text'].includes((properties[name] as any).type)) {
        descriptionProperty = name
        break
      }
    }

    return {
      titleProperty,
      dateProperty,
      descriptionProperty,
      properties
    }
  } catch (error) {
    console.error('Failed to detect Notion database schema:', error)
    throw error
  }
}

/**
 * Extract title from Notion page properties
 */
export function extractNotionTitle(properties: any, schema: NotionDatabaseSchema): string {
  if (!schema.titleProperty) {
    return 'Untitled Event'
  }

  const titleProp = properties[schema.titleProperty]
  if (!titleProp || !titleProp.title || titleProp.title.length === 0) {
    return 'Untitled Event'
  }

  return titleProp.title.map((t: any) => t.plain_text).join('')
}

/**
 * Extract date range from Notion page properties
 */
export function extractNotionDateRange(properties: any, schema: NotionDatabaseSchema): {
  start: string
  end: string
  isAllDay: boolean
} {
  const now = new Date().toISOString()

  if (!schema.dateProperty) {
    return { start: now, end: now, isAllDay: false }
  }

  const dateProp = properties[schema.dateProperty]
  if (!dateProp || !dateProp.date) {
    return { start: now, end: now, isAllDay: false }
  }

  const start = dateProp.date.start || now
  const end = dateProp.date.end || start
  const isAllDay = !start.includes('T') // All-day events don't have time component

  return { start, end, isAllDay }
}

/**
 * Extract description from Notion page properties
 */
export function extractNotionDescription(properties: any, schema: NotionDatabaseSchema): string {
  if (!schema.descriptionProperty) {
    return ''
  }

  const descProp = properties[schema.descriptionProperty]
  if (!descProp || !descProp.rich_text) {
    return ''
  }

  return descProp.rich_text.map((t: any) => t.plain_text).join('')
}

/**
 * Convert Notion page to UnifiedEvent
 */
export function convertNotionPageToEvent(
  page: any,
  schema: NotionDatabaseSchema
): UnifiedEvent {
  const properties = page.properties

  const title = extractNotionTitle(properties, schema)
  const { start, end, isAllDay } = extractNotionDateRange(properties, schema)
  const description = extractNotionDescription(properties, schema)

  // Calculate duration
  const startDate = new Date(start)
  const endDate = new Date(end)
  const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))

  return {
    id: `notion-${page.id}`,
    type: 'event',
    title,
    description,
    startDateTime: start,
    endDateTime: end,
    duration: duration > 0 ? duration : 60,
    priority: 'medium',
    location: '',
    isAllDay,
    isMultiDay: false,
    isRecurring: false,
    status: 'scheduled',
    participants: [],
    createdAt: page.created_time,
    updatedAt: page.last_edited_time
  } as UnifiedEvent
}

/**
 * Convert UnifiedEvent to Notion page properties
 */
export function convertEventToNotionProperties(
  event: UnifiedEvent,
  schema: NotionDatabaseSchema
): any {
  const properties: any = {}

  // Set title
  if (schema.titleProperty) {
    properties[schema.titleProperty] = {
      title: [
        {
          type: 'text',
          text: { content: event.title }
        }
      ]
    }
  }

  // Set date
  if (schema.dateProperty) {
    const dateValue: any = {
      start: event.startDateTime
    }

    // Add end date if different from start
    if (event.endDateTime && event.endDateTime !== event.startDateTime) {
      dateValue.end = event.endDateTime
    }

    properties[schema.dateProperty] = {
      date: dateValue
    }
  }

  // Set description
  if (schema.descriptionProperty && event.description) {
    properties[schema.descriptionProperty] = {
      rich_text: [
        {
          type: 'text',
          text: { content: event.description }
        }
      ]
    }
  }

  return properties
}

/**
 * Find or create a calendar database in Notion
 */
export async function findNotionCalendarDatabase(
  notion: Client
): Promise<string | null> {
  try {
    const response = await notionApiCall(() =>
      notion.search({
        filter: {
          property: 'object',
          value: 'database' as any
        },
        page_size: 100
      })
    ) as any

    // Filter for databases with date properties
    const databases = response.results.filter((item: any) => {
      if (item.object !== 'database') return false

      const properties = item.properties || {}
      return Object.values(properties).some((prop: any) =>
        prop.type === 'date'
      )
    })

    if (databases.length === 0) {
      return null
    }

    // Prefer databases with "Calendar" or similar in the name
    const calendarDb = databases.find((db: any) => {
      const title = db.title?.[0]?.plain_text || ''
      return /calendar|schedule|events|tasks/i.test(title)
    })

    return calendarDb?.id || databases[0]?.id || null
  } catch (error) {
    console.error('Failed to find Notion calendar database:', error)
    return null
  }
}
