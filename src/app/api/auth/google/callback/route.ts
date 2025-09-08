import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=google_auth_failed&message=${encodeURIComponent(error)}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=missing_code`
      )
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    // Set credentials to get user info
    oauth2Client.setCredentials(tokens)
    
    // Get user's calendar info
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const calendarList = await calendar.calendarList.list()
    
    const primaryCalendar = calendarList.data.items?.find(
      (cal) => cal.primary === true
    )

    if (!primaryCalendar) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=no_primary_calendar`
      )
    }

    // Here you would typically save the integration to your database
    // For now, we'll pass the data as URL parameters
    const integrationData = {
      provider: 'google',
      accountId: primaryCalendar.id,
      calendarId: primaryCalendar.id,
      calendarName: primaryCalendar.summary,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null
    }

    const params = new URLSearchParams({
      success: 'true',
      provider: 'google',
      data: JSON.stringify(integrationData)
    })

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/time-manager?${params.toString()}`
    )
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/time-manager?error=google_callback_failed&message=${encodeURIComponent((error as Error).message)}`
    )
  }
}