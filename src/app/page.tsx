"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function MaintenancePage() {
  const [isDark, setIsDark] = useState(true);

  // Load theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDark(savedTheme === "dark");
    }
  }, []);

  // Save theme preference
  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark
        ? "bg-gradient-to-br from-gray-900 via-black to-gray-900"
        : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
    } flex items-center justify-center px-4 relative`}>

      {/* Header Controls */}
      <div className="absolute top-6 right-6 flex items-center space-x-4">
        {/* Theme Toggle - Sliding Switch */}
        <button
          onClick={toggleTheme}
          className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-tactical-gold focus:ring-offset-2 ${
            isDark
              ? "bg-gray-700"
              : "bg-yellow-400"
          }`}
          aria-label="Toggle theme"
        >
          {/* Sliding circle */}
          <div
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full transition-transform duration-300 flex items-center justify-center ${
              isDark
                ? "translate-x-7 bg-gray-900"
                : "translate-x-0 bg-white"
            }`}
          >
            {/* Icon inside the sliding circle */}
            {isDark ? (
              <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
              </svg>
            )}
          </div>
        </button>

        {/* Login Link */}
        <Link
          href="/auth/signin"
          className={`px-4 py-2 rounded-lg font-space-grotesk font-medium transition-colors duration-200 ${
            isDark
              ? "bg-tactical-gold text-black hover:bg-gold-dark"
              : "bg-tactical-gold text-black hover:bg-yellow-600"
          }`}
        >
          Login
        </Link>
      </div>

      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="h-24 w-24 bg-tactical-gold flex items-center justify-center">
            <span className="text-4xl font-bold text-black font-space-grotesk">ES</span>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-4">
          <h1 className={`text-4xl md:text-6xl font-bold font-space-grotesk uppercase tracking-wide ${
            isDark ? "!text-gray-50" : "!text-gray-900"
          }`}>
            Under Development
          </h1>
          <p className={`text-lg md:text-xl font-space-grotesk ${
            isDark ? "text-gray-300" : "text-gray-700"
          }`}>
            Evangelo Sommer Portfolio
          </p>
          <p className={`text-base font-space-grotesk ${
            isDark ? "text-gray-400" : "text-gray-600"
          }`}>
            Something immersive is coming soon...
          </p>
        </div>

        {/* Divider */}
        <div className="w-24 h-0.5 bg-tactical-gold mx-auto"></div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h2 className={`text-xl font-bold font-space-grotesk uppercase tracking-wide ${
            isDark ? "!text-gray-50" : "!text-gray-900"
          }`}>
            Get In Touch
          </h2>
          <a
            href="mailto:hi@evangelosommer.com"
            className={`inline-block transition-colors duration-200 font-space-grotesk ${
              isDark
                ? "!text-gray-100 hover:!text-tactical-gold"
                : "!text-yellow-600 hover:!text-yellow-700"
            }`}
          >
            hi@evangelosommer.com
          </a>
        </div>

        {/* Social Media Links */}
        <div className="flex justify-center space-x-6">
          <a
            href="https://linkedin.com/in/evangelosommer"
            target="_blank"
            rel="noopener noreferrer"
            className={`transition-colors duration-200 ${
              isDark
                ? "text-gray-400 hover:text-tactical-gold"
                : "text-gray-600 hover:text-yellow-600"
            }`}
            aria-label="LinkedIn"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          <a
            href="https://github.com/evangelosommer"
            target="_blank"
            rel="noopener noreferrer"
            className={`transition-colors duration-200 ${
              isDark
                ? "text-gray-400 hover:text-tactical-gold"
                : "text-gray-600 hover:text-yellow-600"
            }`}
            aria-label="GitHub"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <a
            href="https://twitter.com/evangelosommer"
            target="_blank"
            rel="noopener noreferrer"
            className={`transition-colors duration-200 ${
              isDark
                ? "text-gray-400 hover:text-tactical-gold"
                : "text-gray-600 hover:text-yellow-600"
            }`}
            aria-label="Twitter"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </div>

        {/* Copyright Notice */}
        <div className={`pt-8 border-t ${
          isDark ? "border-gray-800" : "border-gray-300"
        }`}>
          <p className={`text-sm font-space-grotesk ${
            isDark ? "text-gray-500" : "text-gray-600"
          }`}>
            &copy; {new Date().getFullYear()} Evangelo Sommer. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
