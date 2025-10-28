// Shared NextAuth configuration
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "admin-login",
      name: "Admin Login",
      credentials: {
        email: {
          label: "Username/Email",
          type: "email",
          placeholder: "username",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Enter your password",
        },
      },
      async authorize(credentials) {
        console.log("🔐 SECURE AUTH - Login attempt for:", credentials?.email?.substring(0, 3) + '***');

        if (!credentials || !credentials.email) {
          console.log("❌ SECURE AUTH - No credentials provided");
          return null;
        }

        const adminEmail = process.env.ADMIN_EMAIL || "support@evangelosommer.com";
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
        const inputEmail = credentials.email.toLowerCase().trim();
        const expectedEmail = adminEmail.toLowerCase().trim();

        // Verify email first
        if (inputEmail !== expectedEmail) {
          console.log("❌ AUTH - Invalid email");
          return null;
        }

        // Always require password (removed development bypass for security)
        if (!credentials.password) {
          console.log("❌ AUTH - No password provided");
          return null;
        }

        if (!adminPasswordHash) {
          console.log("❌ AUTH ERROR - No ADMIN_PASSWORD_HASH configured");
          console.log("💡 Run: node scripts/hash-password.js to generate a hash");
          return null;
        }

        try {
          // Use bcrypt to verify password
          const isValidPassword = await bcrypt.compare(
            credentials.password,
            adminPasswordHash
          );

          if (isValidPassword) {
            console.log("✅ AUTH - Success");
            return {
              id: "admin-001",
              email: adminEmail,
              name: "System Administrator",
              role: "SUPER_ADMIN"
            };
          } else {
            console.log("❌ AUTH - Invalid password");
            return null;
          }
        } catch (error) {
          console.error("❌ AUTH ERROR - Password verification failed:", error);
          return null;
        }

        // FALLBACK: Default to secure mode
        console.log("❌ AUTH - Unknown environment, defaulting to secure mode");
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: process.env.NODE_ENV === 'production' ? 3600 : 86400, // 1 hour prod, 24 hours dev
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role;
        token.env = process.env.NODE_ENV;
        console.log("🎫 JWT created for:", user.email?.substring(0, 3) + "***", "in", process.env.NODE_ENV);
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as any).role = token.role;
        (session.user as any).env = token.env;
        console.log("🎫 Session created for:", session.user.email?.substring(0, 3) + "***");
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Additional production security check
      if (process.env.NODE_ENV === 'production') {
        console.log("🔐 PRODUCTION SIGN-IN CHECK");

        // Verify we have proper environment variables
        if (!process.env.ADMIN_PASSWORD || !process.env.NEXTAUTH_SECRET) {
          console.log("❌ PRODUCTION ERROR - Missing required environment variables");
          return false;
        }
      }

      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET || (
    process.env.NODE_ENV === 'production'
      ? undefined // Force error in production if no secret
      : "dev-secret-key-123" // Only allow fallback in development
  ),
};
