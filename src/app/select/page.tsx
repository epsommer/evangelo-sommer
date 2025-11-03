"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import "@/app/neomorphic.css";
import { Palette, Box, Users, Edit, Eye } from "lucide-react";

interface StudioProject {
  id: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SelectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [studioProjects, setStudioProjects] = useState<StudioProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

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

  // Fetch studio projects
  useEffect(() => {
    if (status === "authenticated") {
      fetchProjects();
    }
  }, [status]);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/studio/projects");
      if (response.ok) {
        const data = await response.json();
        setStudioProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Error fetching studio projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleEditProject = (projectId: string) => {
    router.push(`/studio?load=${projectId}`);
  };

  const handleExploreProject = (projectId: string) => {
    router.push(`/studio/explore?load=${projectId}`);
  };

  // Save theme preference
  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  if (status === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          backgroundColor: isDark ? "#1c1917" : "#EBECF0",
          transition: "background-color 300ms ease-in-out",
        }}
      >
        <div className="text-center">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "#D4AF37", borderRadius: "50%" }}
          ></div>
          <p
            className="font-space-grotesk uppercase tracking-wide text-sm sm:text-base"
            style={{ color: isDark ? "#9ca3af" : "#8992A5" }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const selections = [
    {
      id: "gallery",
      title: "Gallery",
      description: "Explore visual works and portfolio pieces",
      icon: Palette,
      path: "/gallery",
      color: "#D4AF37",
    },
    {
      id: "studio",
      title: "Studio",
      description: "3D design and creative workspace",
      icon: Box,
      path: "/studio",
      color: "#8B4513",
    },
    {
      id: "crm",
      title: "B.E.C.K.Y. - C.R.M.",
      description: "Business Engagement & Client Knowledge Yield - Customer Relationship Manager",
      icon: Users,
      path: "/dashboard",
      color: "#4A5568",
    },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative"
      style={{
        backgroundColor: isDark ? "#1c1917" : "#EBECF0",
        transition: "background-color 300ms ease-in-out",
      }}
    >
      {/* Theme Toggle - Responsive */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
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
      </div>

      <div className="max-w-6xl w-full space-y-8 sm:space-y-12">
        {/* Header - Responsive */}
        <div className="text-center space-y-4 sm:space-y-6">
          {/* Logo with neomorphic border */}
          <div className="flex justify-center">
            <div className={`neomorphic-logo ${isDark ? 'dark-mode' : ''}`} style={{ width: '90px', height: '90px' }}>
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
          </div>

          <div className="px-4">
            <h1
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-space-grotesk uppercase tracking-wide mb-2"
              style={{ color: isDark ? "#d1d5db" : "#6C7587" }}
            >
              Welcome, {session?.user?.email?.split("@")[0]}
            </h1>
            <p
              className="text-base sm:text-lg md:text-xl font-space-grotesk"
              style={{ color: isDark ? "#9ca3af" : "#8992A5" }}
            >
              Select your workspace
            </p>
          </div>
        </div>

        {/* Selection Cards - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {selections.map((selection) => {
            const Icon = selection.icon;
            return (
              <button
                key={selection.id}
                onClick={() => router.push(selection.path)}
                className={`neomorphic-card ${isDark ? "dark-mode" : ""} group touch-manipulation`}
                style={{
                  padding: "1.5rem",
                  textAlign: "center",
                  transition: "all 300ms ease-in-out",
                }}
              >
                <div className="space-y-3 sm:space-y-4">
                  {/* Icon */}
                  <div className="flex justify-center">
                    <div
                      className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{
                        backgroundColor: isDark
                          ? `${selection.color}20`
                          : `${selection.color}15`,
                        borderRadius: "8px",
                      }}
                    >
                      <Icon
                        className="w-7 h-7 sm:w-8 sm:h-8"
                        style={{ color: selection.color }}
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-lg sm:text-xl font-bold font-space-grotesk uppercase tracking-wide px-2"
                    style={{ color: isDark ? "#d1d5db" : "#6C7587" }}
                  >
                    {selection.title}
                  </h3>

                  {/* Description */}
                  <p
                    className="text-xs sm:text-sm font-space-grotesk px-2"
                    style={{ color: isDark ? "#9ca3af" : "#8992A5" }}
                  >
                    {selection.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className="flex justify-center pt-1 sm:pt-2">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:translate-x-1"
                      style={{ color: selection.color }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Studio Projects Explorer - Responsive */}
        {studioProjects.length > 0 && (
          <div className="mt-8 sm:mt-12">
            <h2
              className="text-xl sm:text-2xl font-bold font-space-grotesk uppercase mb-4 sm:mb-6 text-center px-4"
              style={{ color: isDark ? "#d1d5db" : "#6C7587" }}
            >
              Your Studio Scenes
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {studioProjects.map((project) => (
                <div
                  key={project.id}
                  className={`neomorphic-card ${isDark ? "dark-mode" : ""}`}
                  style={{
                    padding: "1.25rem",
                    transition: "all 300ms ease-in-out",
                  }}
                >
                  {/* Thumbnail placeholder */}
                  <div
                    className="w-full h-28 sm:h-32 mb-3 sm:mb-4 flex items-center justify-center cursor-pointer touch-manipulation"
                    style={{
                      backgroundColor: isDark ? "#2e2b29" : "#d1d9e6",
                      borderRadius: "8px",
                    }}
                    onClick={() => handleExploreProject(project.id)}
                  >
                    <Box className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: "#D4AF37" }} />
                  </div>

                  {/* Project name */}
                  <h3
                    className="text-base sm:text-lg font-bold font-space-grotesk mb-2"
                    style={{ color: isDark ? "#d1d5db" : "#6C7587" }}
                  >
                    {project.name}
                  </h3>

                  {/* Description */}
                  {project.description && (
                    <p
                      className="text-xs sm:text-sm font-space-grotesk mb-2 sm:mb-3 line-clamp-2"
                      style={{ color: isDark ? "#9ca3af" : "#8992A5" }}
                    >
                      {project.description}
                    </p>
                  )}

                  {/* Last updated */}
                  <p
                    className="text-xs font-space-grotesk mb-3 sm:mb-4"
                    style={{ color: isDark ? "#6b7280" : "#8992A5" }}
                  >
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                  </p>

                  {/* Action buttons - Responsive */}
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={() => handleEditProject(project.id)}
                      className={`neomorphic-button ${isDark ? "dark-mode" : ""} flex-1 flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation`}
                      style={{
                        height: "38px",
                        padding: "0 12px",
                        fontSize: "12px",
                      }}
                    >
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleExploreProject(project.id)}
                      className={`neomorphic-button ${isDark ? "dark-mode" : ""} flex-1 flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation`}
                      style={{
                        height: "38px",
                        padding: "0 12px",
                        fontSize: "12px",
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Explore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading state - Responsive */}
        {loadingProjects && (
          <div className="mt-8 sm:mt-12 text-center">
            <div
              className="inline-block w-7 h-7 sm:w-8 sm:h-8 border-4 border-t-transparent animate-spin mx-auto"
              style={{ borderColor: "#D4AF37", borderRadius: "50%" }}
            ></div>
            <p
              className="mt-3 sm:mt-4 font-space-grotesk text-sm sm:text-base"
              style={{ color: isDark ? "#9ca3af" : "#8992A5" }}
            >
              Loading scenes...
            </p>
          </div>
        )}

        {/* Sign Out Link - Responsive */}
        <div className="text-center mt-8 sm:mt-12 pb-4">
          <button
            onClick={() => router.push("/api/auth/signout")}
            className="text-xs sm:text-sm font-space-grotesk uppercase tracking-wide underline touch-manipulation min-h-[44px] inline-flex items-center justify-center"
            style={{
              color: isDark ? "#9ca3af" : "#8992A5",
              transition: "color 200ms ease-in-out",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = isDark ? "#d1d5db" : "#6C7587")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = isDark ? "#9ca3af" : "#8992A5")
            }
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
