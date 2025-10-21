// Shared NextAuth configuration
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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

        const adminEmail = process.env.ADMIN_EMAIL || "admin@evangelosommer.com";
        const adminPassword = process.env.ADMIN_PASSWORD;
        const inputEmail = credentials.email.toLowerCase().trim();
        const expectedEmail = adminEmail.toLowerCase().trim();

        // PRODUCTION SAFETY: Require password in production
        if (process.env.NODE_ENV === 'production') {
          console.log("🔐 PRODUCTION MODE - Password required");

          if (!adminPassword) {
            console.log("❌ PRODUCTION ERROR - No ADMIN_PASSWORD configured");
            return null;
          }

          if (!credentials.password) {
            console.log("❌ PRODUCTION ERROR - No password provided");
            return null;
          }

          if (inputEmail === expectedEmail && credentials.password === adminPassword) {
            console.log("✅ PRODUCTION AUTH - Success");
            return {
              id: "admin-001",
              email: adminEmail,
              name: "System Administrator",
              role: "SUPER_ADMIN"
            };
          } else {
            console.log("❌ PRODUCTION AUTH - Invalid credentials");
            return null;
          }
        }

        // DEVELOPMENT MODE: Email-only for convenience (but still secure)
        if (process.env.NODE_ENV === 'development') {
          console.log("🔧 DEVELOPMENT MODE - Email-only auth enabled");

          if (inputEmail === expectedEmail) {
            console.log("✅ DEVELOPMENT AUTH - Success");
            return {
              id: "admin-001",
              email: adminEmail,
              name: "System Administrator (DEV)",
              role: "SUPER_ADMIN"
            };
          } else {
            console.log("❌ DEVELOPMENT AUTH - Wrong email");
            return null;
          }
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
