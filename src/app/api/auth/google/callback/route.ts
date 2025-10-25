import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { verifyOAuthState, validateCSRFToken } from '@/lib/csrf'
import { getToken } from 'next-auth/jwt'

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

    // Verify CSRF protection via state parameter
    if (!state) {
      console.warn('OAuth callback missing state parameter');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=csrf_missing`
      )
    }

    const stateData = verifyOAuthState(state);
    if (!stateData) {
      console.warn('OAuth callback state verification failed');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=csrf_invalid`
      )
    }

    // Get session for CSRF token validation
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    // Validate CSRF token
    const isValidCSRF = validateCSRFToken(stateData.csrf as string, token?.sub);
    if (!isValidCSRF) {
      console.warn('OAuth callback CSRF token validation failed');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/time-manager?error=csrf_validation_failed`
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

    // SECURITY TODO: Store tokens in encrypted database instead of URL parameters
    // Current implementation exposes tokens in browser history and logs
    // Required changes:
    // 1. Create CalendarIntegration table in Prisma schema
    // 2. Encrypt tokens before storing (use @/lib/encryption)
    // 3. Pass only integration ID in URL
    // 4. Frontend fetches integration details via authenticated API
    //
    // For now, passing in URL (INSECURE - FIX BEFORE PRODUCTION)
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
      data: JSON.stringify(integrationData) // SECURITY RISK: Contains sensitive tokens
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