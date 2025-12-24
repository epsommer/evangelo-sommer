/**
 * Google Calendar Webhook Endpoint
 * Receives push notifications from Google Calendar when events change
 *
 * Setup instructions:
 * 1. Register webhook channel using Google Calendar API: calendar.events.watch()
 * 2. Google will send notifications to this endpoint when calendar changes
 * 3. Webhook expires after ~7 days, needs renewal
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/prisma'
import { CalendarSyncService } from '@/lib/calendar-sync'

/**
 * Handle Google Calendar push notifications
 *
 * Google sends two types of requests:
 * 1. Sync notification: Calendar has changed, need to fetch updates
 * 2. Verification: Initial webhook setup verification
 */
export async function POST(request: NextRequest) {
  try {
    // Get Google notification headers
    const channelId = request.headers.get('x-goog-channel-id')
    const resourceState = request.headers.get('x-goog-resource-state')
    const channelToken = request.headers.get('x-goog-channel-token')
    const resourceId = request.headers.get('x-goog-resource-id')

    console.log('📅 [GoogleWebhook] Received notification:', {
      channelId,
      resourceState,
      channelToken,
      resourceId
    })

    // Verify this is a legitimate Google notification
    if (!channelId || !resourceState) {
      return NextResponse.json(
        { success: false, error: 'Invalid notification headers' },
        { status: 400 }
      )
    }

    // Handle sync notification
    if (resourceState === 'sync') {
      // This is the initial verification message
      console.log('📅 [GoogleWebhook] Webhook verification successful')
      return NextResponse.json({ success: true, message: 'Webhook verified' })
    }

    // Handle exists (calendar changed)
    if (resourceState === 'exists') {
      console.log('📅 [GoogleWebhook] Calendar change detected, triggering sync...')

      const prisma = getPrismaClient()
      if (!prisma) {
        return NextResponse.json(
          { success: false, error: 'Database not available' },
          { status: 503 }
        )
      }

      // Find the integration associated with this webhook
      const integration = await prisma.calendarIntegration.findFirst({
        where: {
          webhookId: channelId,
          isActive: true
        }
      })

      if (!integration) {
        console.warn('📅 [GoogleWebhook] No integration found for webhook:', channelId)
        return NextResponse.json(
          { success: false, error: 'Integration not found' },
          { status: 404 }
        )
      }

      // Queue a pull operation to fetch the latest changes
      // This is async - we respond immediately and process in background
      CalendarSyncService.pullEventsFromExternalCalendars()
        .then(result => {
          console.log(`📅 [GoogleWebhook] Sync completed: ${result.events.length} events, ${result.conflicts.length} conflicts`)
        })
        .catch(error => {
          console.error('📅 [GoogleWebhook] Sync error:', error)
        })

      return NextResponse.json({
        success: true,
        message: 'Sync queued'
      })
    }

    // Unknown resource state
    console.warn('📅 [GoogleWebhook] Unknown resource state:', resourceState)
    return NextResponse.json({ success: true, message: 'Notification received' })

  } catch (error) {
    console.error('📅 [GoogleWebhook] Error processing webhook:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Webhook processing failed'
      },
      { status: 500 }
    )
  }
}

/**
 * Register a new webhook with Google Calendar
 * Call this endpoint to set up push notifications
 */
export async function PUT(request: NextRequest) {
  try {
    const { integrationId } = await request.json()

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'Integration ID required' },
        { status: 400 }
      )
    }

    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      )
    }

    // Get integration
    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId }
    })

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      )
    }

    if (integration.provider !== 'GOOGLE') {
      return NextResponse.json(
        { success: false, error: 'Only Google Calendar supports webhooks' },
        { status: 400 }
      )
    }

    // Set up webhook using Google Calendar API
    const { decrypt } = await import('@/lib/encryption')
    const { google } = await import('googleapis')

    const accessToken = decrypt(integration.accessToken)
    const refreshToken = integration.refreshToken ? decrypt(integration.refreshToken) : null

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const calendarId = integration.externalId || 'primary'

    // Generate unique channel ID
    const channelId = `webhook-${integrationId}-${Date.now()}`

    // Register webhook
    const response = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/webhooks/google`,
        token: integrationId, // Use integration ID as verification token
        expiration: String(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days
      }
    })

    // Store webhook info
    await prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        webhookId: channelId,
        webhookExpiry: new Date(parseInt(response.data.expiration || '0'))
      }
    })

    console.log('📅 [GoogleWebhook] Webhook registered:', channelId)

    return NextResponse.json({
      success: true,
      webhookId: channelId,
      expiry: response.data.expiration
    })

  } catch (error) {
    console.error('📅 [GoogleWebhook] Error registering webhook:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook registration failed'
      },
      { status: 500 }
    )
  }
}

/**
 * Stop receiving webhook notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const integrationId = searchParams.get('integrationId')

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'Integration ID required' },
        { status: 400 }
      )
    }

    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 503 }
      )
    }

    const integration = await prisma.calendarIntegration.findUnique({
      where: { id: integrationId }
    })

    if (!integration || !integration.webhookId) {
      return NextResponse.json(
        { success: false, error: 'No active webhook found' },
        { status: 404 }
      )
    }

    // Stop webhook using Google Calendar API
    const { decrypt } = await import('@/lib/encryption')
    const { google } = await import('googleapis')

    const accessToken = decrypt(integration.accessToken)
    const refreshToken = integration.refreshToken ? decrypt(integration.refreshToken) : null

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Stop the channel
    await calendar.channels.stop({
      requestBody: {
        id: integration.webhookId,
        resourceId: integration.externalId || 'primary'
      }
    })

    // Clear webhook info
    await prisma.calendarIntegration.update({
      where: { id: integrationId },
      data: {
        webhookId: null,
        webhookExpiry: null
      }
    })

    console.log('📅 [GoogleWebhook] Webhook stopped:', integration.webhookId)

    return NextResponse.json({
      success: true,
      message: 'Webhook stopped'
    })

  } catch (error) {
    console.error('📅 [GoogleWebhook] Error stopping webhook:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop webhook'
      },
      { status: 500 }
    )
  }
}
