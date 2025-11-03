"use client";

import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import "@/app/neomorphic.css";

export default function SignOutPage() {
  const [isDark, setIsDark] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDark(savedTheme === "dark");
    }
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative"
      style={{
        backgroundColor: isDark ? "#1c1917" : "#EBECF0",
        transition: "background-color 300ms ease-in-out"
      }}
    >
      <div className={`max-w-md w-full space-y-6 sm:space-y-8 text-center ${isDark ? 'dark-mode' : ''}`}>
        {/* Logo with neomorphic border */}
        <div className="flex justify-center">
          <div className={`neomorphic-logo ${isDark ? 'dark-mode' : ''}`} style={{ width: '100px', height: '100px' }}>
            <div className="relative w-14 h-14">
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
        </div>

        {/* Heading */}
        <div className="space-y-3 sm:space-y-4">
          <h1
            className="text-3xl sm:text-4xl font-bold font-space-grotesk uppercase tracking-wide"
            style={{ color: isDark ? '#d1d5db' : '#6C7587' }}
          >
            Sign Out
          </h1>
          <p
            className="text-base sm:text-lg font-space-grotesk"
            style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
          >
            Are you sure you want to sign out?
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={`neomorphic-submit ${isDark ? 'dark-mode' : ''}`}
          >
            {isSigningOut ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-b-2" style={{ borderColor: isDark ? '#d1d5db' : '#6C7587' }}></div>
                <span>Signing Out...</span>
              </div>
            ) : (
              'Yes, Sign Out'
            )}
          </button>

          <Link href="/select">
            <button
              disabled={isSigningOut}
              className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
              style={{ width: '100%', height: '54px' }}
            >
              Cancel
            </button>
          </Link>
        </div>

        {/* Divider */}
        <div
          className="w-16 sm:w-24 h-0.5 mx-auto"
          style={{
            backgroundColor: "#D4AF37",
            opacity: isDark ? 0.6 : 0.8,
          }}
        ></div>

        {/* Footer text */}
        <p
          className="text-xs sm:text-sm font-space-grotesk"
          style={{ color: isDark ? '#6b7280' : '#8992A5' }}
        >
          Thank you for using Evangelo Sommer Portfolio
        </p>
      </div>
    </div>
  );
}
