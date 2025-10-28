import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find admin user
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail }
    });

    // Always return success to prevent email enumeration
    if (!adminUser) {
      console.log("⚠️  Password reset requested for non-existent email:", normalizedEmail);
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link."
      });
    }

    if (!adminUser.isActive) {
      console.log("⚠️  Password reset requested for inactive account:", normalizedEmail);
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link."
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store token in database
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: adminUser.id,
        expiresAt
      }
    });

    // Send email
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT || 465),
        secure: process.env.EMAIL_SERVER_SECURE === "true",
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER,
        to: adminUser.email,
        subject: "Password Reset Request - Evangelo Sommer CRM",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Password Reset Request</h2>
            <p>You requested a password reset for your admin account.</p>
            <p>Click the link below to reset your password:</p>
            <p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #C9A961; color: #1a1a1a; text-decoration: none; font-weight: bold;">
                Reset Password
              </a>
            </p>
            <p style="color: #666;">Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              This link will expire in 1 hour.<br>
              If you didn't request this, please ignore this email.
            </p>
          </div>
        `,
        text: `
Password Reset Request

You requested a password reset for your admin account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.
If you didn't request this, please ignore this email.
        `
      });

      console.log("✅ Password reset email sent to:", adminUser.email);
    } catch (emailError) {
      console.error("❌ Failed to send password reset email:", emailError);
      return NextResponse.json(
        { error: "Failed to send reset email. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password reset link has been sent to your email."
    });

  } catch (error) {
    console.error("❌ Password reset request error:", error);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
