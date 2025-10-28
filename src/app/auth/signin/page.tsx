// src/app/auth/signin/page.tsx
"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setError("Access denied. Invalid email or password.");
      } else if (result?.ok) {
        const session = await getSession();
        if (session) {
          router.push("/dashboard");
        } else {
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
        setResetMessage(data.message || "Password reset link has been sent to your email.");
        setShowForgotPassword(false);
      } else {
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
    <div className="min-h-screen flex items-center justify-center bg-hud-background-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 bg-tactical-gold flex items-center justify-center">
            <span className="text-2xl font-bold text-hud-text-primary font-space-grotesk">ES</span>
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-hud-text-primary font-space-grotesk uppercase tracking-wide">
            COMMAND CENTER | MSCRMS
          </h2>
          <p className="mt-2 text-center text-sm text-medium-grey font-space-grotesk">
            Multi-Service Client Relationship Management
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
              className="relative block w-full px-4 py-3 border-2 border-hud-border text-hud-text-primary font-space-grotesk focus:outline-none focus:border-hud-border-accent transition-colors duration-200 bg-hud-background-secondary"
              placeholder="Enter your username/email"
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
              className="relative block w-full px-4 py-3 pr-12 border-2 border-hud-border text-hud-text-primary font-space-grotesk focus:outline-none focus:border-hud-border-accent transition-colors duration-200 bg-hud-background-secondary"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-medium-grey hover:text-hud-text-primary transition-colors duration-200 font-space-grotesk text-xs uppercase tracking-wide"
            >
              {showPassword ? "HIDE" : "SHOW"}
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="group relative w-full flex justify-center py-3 px-4 border-2 border-transparent text-sm font-bold font-space-grotesk uppercase tracking-wide text-hud-text-primary bg-tactical-gold hover:bg-tactical-gold-dark focus:outline-none transition-colors duration-200 disabled:bg-light-grey disabled:cursor-not-allowed disabled:text-medium-grey"
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-b-2 border-dark-grey"></div>
              ) : (
                "Access System"
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-500 text-red-700">
              <p className="text-sm font-space-grotesk">{error}</p>
            </div>
          )}

          {resetMessage && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-500 text-green-700">
              <p className="text-sm font-space-grotesk">{resetMessage}</p>
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isSendingReset || !email.trim()}
              className="text-sm text-gold hover:text-gold-dark font-space-grotesk uppercase tracking-wide underline disabled:text-medium-grey disabled:cursor-not-allowed"
            >
              {isSendingReset ? "Sending..." : "Forgot Password?"}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-gold hover:text-gold-dark font-space-grotesk uppercase tracking-wide">
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
