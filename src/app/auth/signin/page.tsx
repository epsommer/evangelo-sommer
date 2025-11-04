// src/app/auth/signin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import "@/app/neomorphic.css";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const router = useRouter();

  // Load theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDark(savedTheme === "dark");
    }
  }, []);

  // Save theme preference
  const toggleTheme = () => {
    setIsToggling(true);
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
    setTimeout(() => setIsToggling(false), 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`[Sign-In] Attempting to sign in user: ${email}`);
    setIsLoading(true);
    setError("");
    setResetMessage("");

    try {
      const result = await signIn("admin-login", {
        email: email,
        password: password,
        redirect: false,
      });

      if (result?.error) {
        console.error("NextAuth Sign-in error:", result.error);
        setError("Access denied. Invalid email or password.");
      } else if (result?.ok) {
        const session = await getSession();
        console.log("[Sign-In] Sign-in successful. Session object:", session);
        if (session) {
          router.push("/select");
        } else {
          console.warn("[Sign-In] Sign-in was OK, but getSession() returned nullish.");
          setError("Sign-in failed. Please try again.");
        }
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !email.trim()) {
      setError("Please enter your email address first");
      return;
    }

    console.log(`[Forgot Password] Requesting password reset for email: ${email}`);
    setIsSendingReset(true);
    setError("");
    setResetMessage("");

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        console.log("[Forgot Password] API call successful:", data.message);
        setResetMessage(data.message || "Password reset link has been sent to your email.");
        setShowForgotPassword(false);
      } else {
        console.error("[Forgot Password] API call failed:", data.error);
        setError(data.error || "Failed to send reset email");
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative"
      style={{
        backgroundColor: isDark ? "#1c1917" : "#EBECF0",
        transition: "background-color 300ms ease-in-out"
      }}
    >
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 flex items-center">
        <label className={`neomorphic-toggle ${isDark ? 'dark-mode' : ''}`}>
          <input
            type="checkbox"
            className="neomorphic-toggle__input"
            checked={isDark}
            onChange={toggleTheme}
          />
          <div className="neomorphic-toggle__indicator">
            <svg
              className="w-3.5 h-3.5"
              style={{ color: "#FFA500" }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
            </svg>
            <svg
              className="w-3.5 h-3.5"
              style={{ color: "#8992A5" }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          </div>
        </label>
      </div>

      <div className={`max-w-md w-full space-y-8 ${isDark ? 'dark-mode' : ''}`}>
        <div>
          <div className={`mx-auto neomorphic-logo ${isDark ? 'dark-mode' : ''}`}>
            <div className="relative w-12 h-12">
              <Image
                src="/EvangeloSommer-ES-Monogram.svg"
                alt="ES Monogram"
                fill
                className="object-contain"
                style={{
                  filter: isDark
                    ? "invert(0.7) saturate(2) hue-rotate(-10deg) brightness(1)"
                    : "invert(0.6) saturate(2) hue-rotate(-10deg) brightness(0.95)",
                }}
              />
            </div>
          </div>
          <h2
            className="mt-6 text-center text-2xl font-bold font-space-grotesk uppercase tracking-wide"
            style={{
              color: isDark ? '#d1d5db' : '#6C7587',
              transition: 'color 300ms ease-in-out'
            }}
          >
            Sign In
          </h2>
          <p
            className="mt-2 text-center text-sm font-space-grotesk"
            style={{
              color: isDark ? '#9ca3af' : '#8992A5',
              transition: 'color 300ms ease-in-out'
            }}
          >
            Access your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`neomorphic-input ${isDark ? 'dark-mode' : ''}`}
              placeholder="Email address"
            />
          </div>

          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`neomorphic-input ${isDark ? 'dark-mode' : ''}`}
              placeholder="Password"
              style={{ paddingRight: '60px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wide font-space-grotesk"
              style={{
                color: isDark ? '#9ca3af' : '#8992A5',
                transition: 'color 200ms ease-in-out'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = isDark ? '#d1d5db' : '#6C7587'}
              onMouseLeave={(e) => e.currentTarget.style.color = isDark ? '#9ca3af' : '#8992A5'}
            >
              {showPassword ? "HIDE" : "SHOW"}
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className={`neomorphic-submit ${isDark ? 'dark-mode' : ''}`}
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-b-2" style={{ borderColor: isDark ? '#d1d5db' : '#6C7587' }}></div>
              ) : (
                "Sign In"
              )}
            </button>
          </div>

          {error && (
            <div
              className="mt-4 p-4 rounded-lg"
              style={{
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 226, 226, 1)',
                border: '2px solid #EF4444',
                color: isDark ? '#FCA5A5' : '#991B1B',
                transition: 'all 300ms ease-in-out'
              }}
            >
              <p className="text-sm font-space-grotesk">{error}</p>
            </div>
          )}

          {resetMessage && (
            <div
              className="mt-4 p-4 rounded-lg"
              style={{
                backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(220, 252, 231, 1)',
                border: '2px solid #22C55E',
                color: isDark ? '#86EFAC' : '#166534',
                transition: 'all 300ms ease-in-out'
              }}
            >
              <p className="text-sm font-space-grotesk">{resetMessage}</p>
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isSendingReset || !email.trim()}
              className="text-sm font-space-grotesk uppercase tracking-wide underline disabled:cursor-not-allowed"
              style={{
                color: isSendingReset || !email.trim() ? (isDark ? '#6b7280' : '#9ca3af') : '#D4AF37',
                transition: 'color 200ms ease-in-out'
              }}
            >
              {isSendingReset ? "Sending..." : "Forgot Password?"}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm font-space-grotesk uppercase tracking-wide"
            style={{
              color: '#D4AF37',
              transition: 'color 200ms ease-in-out'
            }}
          >
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
