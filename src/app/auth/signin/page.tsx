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
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();

  // Load theme preference from localStorage
  useEffect(() => {
    const updateTheme = () => {
      const theme = localStorage.getItem('color-theme') || 'light';
      setIsDark(theme === 'mocha' || theme === 'true-night');
      document.documentElement.setAttribute('data-color-theme', theme);
    };

    // Initial theme setup
    updateTheme();

    // Observe changes to the 'data-color-theme' attribute on the html element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-color-theme') {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-theme'] });

    window.addEventListener('storage', updateTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', updateTheme);
    };
  }, []);

  // Save theme preference
  const toggleTheme = () => {
    const currentTheme = localStorage.getItem('color-theme') || 'light';
    const newTheme = (currentTheme === 'light' || currentTheme === 'overkast') ? 'true-night' : 'light';

    // Update the data-color-theme attribute on the html element
    document.documentElement.setAttribute('data-color-theme', newTheme);
    localStorage.setItem('color-theme', newTheme);

    // This event will be picked up by the useEffect listener to update the state
    window.dispatchEvent(new Event('storage'));
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
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative bg-background text-foreground transition-colors duration-300"
    >
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 flex items-center">
        <button
          onClick={toggleTheme}
          className={`neomorphic-toggle ${isDark ? 'dark-mode' : ''}`}
          style={{
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          <div
            className="neomorphic-toggle__indicator"
            style={{
              transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {isDark ? (
              <svg
                className="w-3.5 h-3.5"
                style={{
                  color: "#8992A5",
                  transition: 'all 300ms ease-in-out'
                }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            ) : (
              <svg
                className="w-3.5 h-3.5"
                style={{
                  color: "#FFA500",
                  transition: 'all 300ms ease-in-out'
                }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
              </svg>
            )}
          </div>
        </button>
      </div>

      <div className={`max-w-md w-full space-y-8 ${isDark ? 'dark-mode' : ''}`}>
        <div>
          <div className={`mx-auto neomorphic-logo ${isDark ? 'dark-mode' : ''}`}>
            <div className="relative w-12 h-12">
              <Image src="/EvangeloSommer-ES-Monogram.svg" alt="ES Monogram" fill className="object-contain neomorphic-logo-image" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold font-display uppercase tracking-wide text-foreground transition-colors duration-300">
            Sign In
          </h2>
          <p className="mt-2 text-center text-sm font-body text-muted-foreground transition-colors duration-300">
            Access your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} suppressHydrationWarning>
          <div suppressHydrationWarning>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`neomorphic-input ${isDark ? 'dark-mode' : ''}`}
              placeholder="Email address"
              suppressHydrationWarning
            />
          </div>

          <div className="relative" suppressHydrationWarning>
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
              suppressHydrationWarning
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wide font-primary text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {showPassword ? "HIDE" : "SHOW"}
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className={`neomorphic-submit ${isDark ? 'dark-mode' : ''}`}
            >{isLoading ? (<div className="animate-spin h-4 w-4 border-b-2 border-neomorphic-text-primary"></div>) : (
                "Sign In"
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-lg bg-destructive/10 border-2 border-destructive text-destructive transition-all duration-300">
              <p className="text-sm font-body">{error}</p>
            </div>
          )}

          {resetMessage && (
            <div className="mt-4 p-4 rounded-lg bg-green-500/10 border-2 border-green-500 text-green-700 dark:text-green-400 transition-all duration-300">
              <p className="text-sm font-body">{resetMessage}</p>
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isSendingReset || !email.trim()}
              className="text-sm font-primary uppercase tracking-wide underline disabled:cursor-not-allowed text-primary hover:text-foreground transition-colors duration-200"
            >
              {isSendingReset ? "Sending..." : "Forgot Password?"}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm font-primary uppercase tracking-wide text-primary hover:text-foreground transition-colors duration-200"
          >
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
