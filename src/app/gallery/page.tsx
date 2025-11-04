"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import "@/app/neomorphic.css";

export default function GalleryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

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
          transition: "background-color 300ms ease-in-out",
        }}
      >
        <div
          className="w-12 h-12 border-4 border-t-transparent animate-spin"
          style={{ borderColor: "#D4AF37" }}
        ></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div
      className={`min-h-screen ${isDark ? "dark-mode" : ""}`}
      style={{
        backgroundColor: isDark ? "#1c1917" : "#EBECF0",
        transition: "background-color 300ms ease-in-out",
      }}
    >
      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b-2" style={{
        borderColor: isDark ? "#2e2b29" : "#d1d9e6"
      }}>
        <div className="flex items-center gap-4">
          <div
            className="relative h-12 w-12"
            style={{
              filter: isDark
                ? "invert(0.7) saturate(2) hue-rotate(-10deg) brightness(1)"
                : "invert(0.6) saturate(2) hue-rotate(-10deg) brightness(0.95)",
            }}
          >
            <Image
              src="/EvangeloSommer-ES-Monogram.svg"
              alt="ES Monogram"
              fill
              className="object-contain"
            />
          </div>
          <h1
            className="text-2xl font-bold font-space-grotesk uppercase"
            style={{
              color: isDark ? "#d1d5db" : "#6C7587",
              transition: "color 300ms ease-in-out",
            }}
          >
            Gallery
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <label className={`neomorphic-toggle ${isDark ? "dark-mode" : ""}`}>
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
            onClick={() => router.push("/select")}
            className={`neomorphic-button ${isDark ? "dark-mode" : ""}`}
            style={{ height: "40px", padding: "0 20px", fontSize: "14px" }}
          >
            Back to Selection
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          <div
            className="text-center py-20"
            style={{
              color: isDark ? "#9ca3af" : "#8992A5",
            }}
          >
            <h2
              className="text-3xl font-bold font-space-grotesk uppercase mb-4"
              style={{
                color: isDark ? "#d1d5db" : "#6C7587",
              }}
            >
              Gallery Coming Soon
            </h2>
            <p className="text-lg font-space-grotesk">
              This space will showcase visual works and portfolio pieces.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
