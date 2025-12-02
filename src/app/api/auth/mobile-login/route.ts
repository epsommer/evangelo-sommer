/**
 * Mobile Login API Endpoint
 *
 * Provides JWT authentication for Becky Mobile app
 * Separate from NextAuth browser-based sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// JWT secret - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRY = '7d'; // 7 days

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  error?: string;
  message?: string;
}

/**
 * POST /api/auth/mobile-login
 *
 * Authenticate user and return JWT token
 *
 * @body email - User email
 * @body password - User password
 * @returns JWT token and user info
 */
export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse>> {
  try {
    const prisma = getPrismaClient();

    if (!prisma) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection not available',
        },
        { status: 503 }
      );
    }

    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and password are required',
        },
        { status: 400 }
      );
    }

    // Find user in database
    // Note: Adjust this query based on your actual User model
    const user = await prisma.participant.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        // Add password field if you have it in your schema
        // password: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials',
        },
        { status: 401 }
      );
    }

    // TODO: Verify password with bcrypt
    // This assumes you have a password field in your Participant model
    // If you're using NextAuth only, you might need to adapt this
    //
    // const isValidPassword = await bcrypt.compare(password, user.password);
    // if (!isValidPassword) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: 'Invalid credentials',
    //     },
    //     { status: 401 }
    //   );
    // }

    // For now, we'll create a placeholder password check
    // REPLACE THIS with actual password verification
    const DEMO_PASSWORD = process.env.DEMO_MOBILE_PASSWORD || 'demo123';
    if (password !== DEMO_PASSWORD) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid credentials',
        },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRY,
      }
    );

    // Log successful login
    console.log(`[Mobile Login] User ${user.email} logged in successfully`);

    // Return success response
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email || '',
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[Mobile Login] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/mobile-login
 *
 * Verify JWT token
 *
 * @header Authorization - Bearer token
 * @returns User info if token is valid
 */
export async function GET(request: NextRequest): Promise<NextResponse<AuthResponse>> {
  try {
    const prisma = getPrismaClient();

    if (!prisma) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection not available',
        },
        { status: 503 }
      );
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No token provided',
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };

    // Fetch user from database
    const user = await prisma.participant.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email || '',
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid token',
        },
        { status: 401 }
      );
    }

    console.error('[Mobile Login Verify] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
