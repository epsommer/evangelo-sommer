"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Toolbar from "./components/Toolbar";
import PropertiesPanel from "./components/PropertiesPanel";
import { useStudioStore } from "./hooks/useStudioStore";
import "@/app/neomorphic.css";

// Dynamically import ThreeScene with SSR disabled (Three.js doesn't work on server)
const ThreeScene = dynamic(() => import("./components/ThreeScene"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin h-8 w-8 border-b-2" style={{ borderColor: '#D4AF37' }}></div>
    </div>
  ),
});

export default function StudioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const transformMode = useStudioStore((state) => state.transformMode);
  const setTransformMode = useStudioStore((state) => state.setTransformMode);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDark(savedTheme === "dark");
    }
  }, []);

  // Protect route - redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Save theme preference
  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  if (status === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: isDark ? "#1c1917" : "#EBECF0",
          transition: "background-color 300ms ease-in-out"
        }}
      >
        <div className="animate-spin h-8 w-8 border-b-2" style={{ borderColor: '#D4AF37' }}></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div
      className={`min-h-screen ${isDark ? 'dark-mode' : ''}`}
      style={{
        backgroundColor: isDark ? "#1c1917" : "#EBECF0",
        transition: "background-color 300ms ease-in-out"
      }}
    >
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1
            className="text-2xl font-bold font-space-grotesk uppercase"
            style={{
              color: isDark ? '#d1d5db' : '#6C7587',
              transition: 'color 300ms ease-in-out'
            }}
          >
            3D Studio
          </h1>
        </div>

        {/* Transform Mode Selector */}
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-space-grotesk mr-2"
            style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
          >
            Mode:
          </span>
          {['select', 'translate', 'rotate', 'scale'].map((mode) => (
            <button
              key={mode}
              onClick={() => setTransformMode(mode as 'select' | 'translate' | 'rotate' | 'scale')}
              className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
              style={{
                height: '36px',
                padding: '0 16px',
                fontSize: '12px',
                textTransform: 'capitalize',
                backgroundColor: transformMode === mode
                  ? (isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.15)')
                  : undefined,
                color: transformMode === mode
                  ? '#D4AF37'
                  : (isDark ? '#d1d5db' : '#6C7587'),
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
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

          <button
            onClick={() => router.push("/dashboard")}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
            style={{ height: '40px', padding: '0 20px', fontSize: '14px' }}
          >
            Exit Studio
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-screen pt-20">
        {/* Left Toolbar */}
        <aside className="w-16 p-2">
          <Toolbar isDark={isDark} />
        </aside>

        {/* 3D Canvas */}
        <main className="flex-1">
          <ThreeScene isDark={isDark} />
        </main>

        {/* Right Properties Panel */}
        <aside className="w-80 p-4">
          <PropertiesPanel isDark={isDark} />
        </aside>
      </div>
    </div>
  );
}
