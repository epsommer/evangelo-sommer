// src/middleware.ts
// Authentication and security middleware for protecting API routes
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per 15 minutes
const LOGIN_RATE_LIMIT = 5; // 5 login attempts per 15 minutes

// In-memory rate limit store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Routes that require authentication
const protectedApiRoutes = [
  '/api/clients',
  '/api/conversations',
  '/api/participants',
  '/api/services',
  '/api/billing',
  '/api/follow-ups',
  '/api/time-entries',
  '/api/calendar',
];

// Routes that are public (authentication, health checks, etc.)
const publicRoutes = [
  '/api/auth',
  '/api/health',
];

// Login routes that need stricter rate limiting
const loginRoutes = [
  '/api/auth/signin',
  '/api/auth/callback',
];

// Get client IP address
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIp || 'unknown';
}

// Check and update rate limit
function checkRateLimit(ip: string, pathname: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `${ip}:${pathname}`;
  const limit = loginRoutes.some(route => pathname.startsWith(route))
    ? LOGIN_RATE_LIMIT
    : MAX_REQUESTS_PER_WINDOW;

  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  const record = rateLimitStore.get(key);

  if (!record || record.resetTime < now) {
    // Create new record or reset expired record
    const resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: limit - 1, resetTime };
  }

  if (record.count >= limit) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // Block homepage - redirect to login since it's under development
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Apply rate limiting to all API routes
  const rateLimit = checkRateLimit(ip, pathname);

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': loginRoutes.some(route => pathname.startsWith(route))
            ? LOGIN_RATE_LIMIT.toString()
            : MAX_REQUESTS_PER_WINDOW.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
        },
      }
    );
  }

  // Check if this is a protected API route
  const isProtectedRoute = protectedApiRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Allow public routes
  const isPublicRoute = publicRoutes.some(route =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute || isPublicRoute) {
    // Add rate limit headers even for public routes
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
    return response;
  }

  // Get the token from the request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If no token, return 401 Unauthorized
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized - Authentication required',
        code: 'AUTH_REQUIRED'
      },
      { status: 401 }
    );
  }

  // Verify user has required role (all routes require SUPER_ADMIN for now)
  if (token.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden - Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      },
      { status: 403 }
    );
  }

  // Add user info to headers for API routes to access
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', token.sub as string);
  requestHeaders.set('x-user-email', token.email as string);
  requestHeaders.set('x-user-role', token.role as string);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add rate limit headers to response
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());

  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    '/api/:path*',
    '/((?!auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
