"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import "@/app/neomorphic.css";

export default function MaintenancePage() {
  const [isDark, setIsDark] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

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

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative"
      style={{
        backgroundColor: isDark ? "#1c1917" : "#EBECF0",
        transition: "background-color 300ms ease-in-out"
      }}
    >
      {/* Header Controls - Responsive */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3 sm:gap-4 z-10">
        {/* Theme Toggle - Neomorphic Sliding Switch */}
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

        {/* Login Link - Neomorphic Button - Responsive */}
        <Link
          href="/auth/signin"
          className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
          style={{
            padding: '0 20px',
            height: '44px',
            fontSize: '14px'
          }}
        >
          Login
        </Link>
      </div>

      <div className="max-w-2xl w-full text-center space-y-6 sm:space-y-8">
        {/* Logo - Neomorphic ES Monogram with border */}
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

        {/* Heading - Responsive */}
        <div className="space-y-3 sm:space-y-4">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-space-grotesk uppercase tracking-wide px-2"
            style={{ color: isDark ? "#d1d5db" : "#6C7587" }}
          >
            Under Development
          </h1>
          <p
            className="text-base sm:text-lg md:text-xl font-space-grotesk px-2"
            style={{ color: isDark ? "#9ca3af" : "#6C7587" }}
          >
            Evangelo Sommer Portfolio
          </p>
          <p
            className="text-sm sm:text-base font-space-grotesk px-2"
            style={{ color: isDark ? "#6b7280" : "#8992A5" }}
          >
            Something immersive is coming soon...
          </p>
        </div>

        {/* Divider */}
        <div
          className="w-16 sm:w-24 h-0.5 mx-auto"
          style={{
            backgroundColor: "#D4AF37",
            opacity: isDark ? 0.6 : 0.8,
          }}
        ></div>

        {/* Contact Information - Responsive */}
        <div className="space-y-3 sm:space-y-4">
          <h2
            className="text-lg sm:text-xl font-bold font-space-grotesk uppercase tracking-wide px-2"
            style={{ color: isDark ? "#d1d5db" : "#6C7587" }}
          >
            Get In Touch
          </h2>
          <a
            href="mailto:hi@evangelosommer.com"
            className="inline-block transition-colors duration-200 font-space-grotesk text-sm sm:text-base px-2 break-all"
            style={{ color: isDark ? "#9ca3af" : "#6C7587" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = isDark ? "#d1d5db" : "#484f60")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = isDark ? "#9ca3af" : "#6C7587")
            }
          >
            hi@evangelosommer.com
          </a>
        </div>

        {/* Social Media Links - Responsive */}
        <div className="flex justify-center gap-4 sm:gap-6">
          <a
            href="https://linkedin.com/in/evangelosommer"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-200 p-2 touch-manipulation"
            style={{ color: isDark ? "#6b7280" : "#8992A5" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = isDark ? "#9ca3af" : "#6C7587")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = isDark ? "#6b7280" : "#8992A5")
            }
            aria-label="LinkedIn"
          >
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
          <a
            href="https://github.com/epsommer"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-200 p-2 touch-manipulation"
            style={{ color: isDark ? "#6b7280" : "#8992A5" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = isDark ? "#9ca3af" : "#6C7587")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = isDark ? "#6b7280" : "#8992A5")
            }
            aria-label="GitHub"
          >
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
          <a
            href="https://twitter.com/evangelosommer"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors duration-200 p-2 touch-manipulation"
            style={{ color: isDark ? "#6b7280" : "#8992A5" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = isDark ? "#9ca3af" : "#6C7587")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = isDark ? "#6b7280" : "#8992A5")
            }
            aria-label="Twitter"
          >
            <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>

        {/* Copyright Notice - Responsive */}
        <div
          className="pt-6 sm:pt-8 border-t px-4"
          style={{ borderColor: isDark ? "#374151" : "#d1d5db" }}
        >
          <p
            className="text-xs sm:text-sm font-space-grotesk"
            style={{ color: isDark ? "#4b5563" : "#8992A5" }}
          >
            &copy; {new Date().getFullYear()} Evangelo Sommer. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
