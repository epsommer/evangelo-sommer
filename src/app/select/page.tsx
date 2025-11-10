"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import "@/app/neomorphic.css";
import { Palette, Box, Users, Edit, Eye, Grid3x3, List, Settings, User, LogOut } from "lucide-react";
import { SlidingThemeToggle } from "@/components/SlidingThemeToggle";
import UserStatusIndicator, { StatusSelector } from "@/components/UserStatusIndicator";

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
  const [projectsViewMode, setProjectsViewMode] = useState<'grid' | 'list'>('grid');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load theme preference
  useEffect(() => {
    const updateTheme = () => {
      const theme = localStorage.getItem('color-theme') || 'light';
      const willBeDark = theme === 'true-night' || theme === 'mocha';
      setIsDark(willBeDark);
    };

    updateTheme();

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

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background text-foreground transition-colors duration-300">
        <div className="text-center relative z-10">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: "#D4AF37", borderRadius: "50%" }}></div>
          <p className="font-space-grotesk uppercase tracking-wide text-sm sm:text-base text-muted-foreground">
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
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative bg-background text-foreground transition-colors duration-300">
      {/* Grainy texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          opacity: isDark ? 0.2 : 0.5,
          background: '#000000',
          mixBlendMode: 'multiply',
          filter: 'url(#noiseFilter)',
        }}
      />

      {/* SVG Filter for grain texture */}
      <svg className="absolute w-0 h-0">
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.6"
            stitchTiles="stitch"
          />
        </filter>
      </svg>

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 flex items-center gap-3">
        {/* Theme Toggle */}
        <SlidingThemeToggle dayNightOnly={false} />

        {/* User Avatar with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''} w-11 h-11 font-bold text-sm relative flex items-center justify-center`}
            style={{
              borderRadius: '50%',
              fontFamily: 'var(--font-space-grotesk)',
              letterSpacing: '0.05em',
            }}
          >
            <span className="relative z-10">ES</span>
            <UserStatusIndicator />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[55]"
                onClick={() => setIsDropdownOpen(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 top-full mt-2 z-[60] w-72 rounded-xl">
                <div className={`neo-card p-0`}>
                  {/* Header */}
                  <div className="p-4 border-b border-border/30">
                    <h3 className="font-primary text-sm uppercase tracking-wide text-foreground mb-1">
                      Account Menu
                    </h3>
                    <div className="font-body text-xs text-muted-foreground">
                      {session?.user?.email || 'User'}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="p-2 space-y-1">
                    {/* Account Settings */}
                    <button
                      onClick={() => {
                        router.push('/account');
                        setIsDropdownOpen(false);
                      }}
                      className="w-full neo-button px-4 py-3 flex items-center gap-3 text-left font-primary text-sm uppercase tracking-wide"
                    >
                      <Settings size={18} />
                      <span>Account Settings</span>
                    </button>

                    {/* Profile */}
                    <button
                      onClick={() => setIsDropdownOpen(false)}
                      className="w-full neo-button px-4 py-3 flex items-center gap-3 text-left font-primary text-sm uppercase tracking-wide"
                    >
                      <User size={18} />
                      <span>Profile</span>
                    </button>

                    {/* Divider */}
                    <div className="h-px bg-border/30 my-2" />

                    {/* Status with Side Dropdown */}
                    <StatusSelector />

                    {/* Divider */}
                    <div className="h-px bg-border/30 my-2" />

                    {/* Sign Out */}
                    <button
                      onClick={() => {
                        router.push('/auth/signout');
                        setIsDropdownOpen(false);
                      }}
                      className="w-full neo-button px-4 py-3 flex items-center gap-3 text-left font-primary text-sm uppercase tracking-wide text-red-600"
                    >
                      <LogOut size={18} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-6xl w-full space-y-8 sm:space-y-12 relative z-10">
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
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-space-grotesk uppercase tracking-wide mb-2 text-foreground">
              Welcome, {session?.user?.email?.split("@")[0]}
            </h1>
            <p className="text-base sm:text-lg md:text-xl font-space-grotesk text-muted-foreground">
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
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <div className="flex flex-col flex-1">
                  {/* Icon */}
                  <div className="flex justify-center mb-3 sm:mb-4">
                    <div
                      className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{
                        backgroundColor: selection.id === 'crm'
                          ? 'transparent'
                          : isDark
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
                  <h3 className={`text-lg sm:text-xl font-bold uppercase tracking-wide px-2 mb-3 sm:mb-4 text-foreground ${selection.id === 'crm' ? 'tk-lores-9-wide' : 'font-space-grotesk'}`}>
                    {selection.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-sm font-space-grotesk px-2 flex-1 text-muted-foreground">
                    {selection.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className="flex justify-center pt-3 sm:pt-4">
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
            <div className="flex items-center justify-between mb-4 sm:mb-6 px-4">
              <h2 className="text-xl sm:text-2xl font-bold font-space-grotesk uppercase text-foreground">
                Your Studio Scenes
              </h2>

              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setProjectsViewMode('grid')}
                  className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
                  style={{
                    height: '36px',
                    width: '36px',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: projectsViewMode === 'grid'
                      ? (isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.15)')
                      : undefined,
                  }}
                  title="Grid View"
                >
                  <Grid3x3
                    className="w-4 h-4"
                    style={{ color: projectsViewMode === 'grid' ? '#D4AF37' : 'var(--neomorphic-text)' }}
                  />
                </button>
                <button
                  onClick={() => setProjectsViewMode('list')}
                  className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
                  style={{
                    height: '36px',
                    width: '36px',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: projectsViewMode === 'list'
                      ? (isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.15)')
                      : undefined,
                  }}
                  title="List View"
                >
                  <List
                    className="w-4 h-4"
                    style={{ color: projectsViewMode === 'list' ? '#D4AF37' : 'var(--neomorphic-text)' }}
                  />
                </button>
              </div>
            </div>

            {/* Grid View */}
            {projectsViewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {studioProjects.map((project) => (
                <div
                  key={project.id}
                  className={`neomorphic-card ${isDark ? "dark-mode" : ""}`}
                  style={{
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    cursor: "default",
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
                  <h3 className="text-base sm:text-lg font-bold font-space-grotesk mb-2 text-foreground">
                    {project.name}
                  </h3>

                  {/* Description */}
                  {project.description && (
                    <p className="text-xs sm:text-sm font-space-grotesk mb-2 sm:mb-3 line-clamp-2 text-muted-foreground">
                      {project.description}
                    </p>
                  )}

                  {/* Last updated */}
                  <p className="text-xs font-space-grotesk mb-3 sm:mb-4 flex-1 text-muted-foreground/70">
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
            )}

            {/* List View - Compact for mobile */}
            {projectsViewMode === 'list' && (
              <div className="space-y-3">
                {studioProjects.map((project) => (
                  <div
                    key={project.id}
                    className={`neomorphic-card ${isDark ? "dark-mode" : ""}`}
                    style={{
                      padding: '1rem',
                      cursor: "default",
                    }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      {/* Thumbnail - smaller in list view */}
                      <div
                        className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center cursor-pointer touch-manipulation"
                        style={{
                          backgroundColor: isDark ? "#2e2b29" : "#d1d9e6",
                          borderRadius: "8px",
                        }}
                        onClick={() => handleExploreProject(project.id)}
                      >
                        <Box className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: "#D4AF37" }} />
                      </div>

                      {/* Project details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold font-space-grotesk truncate text-foreground">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-xs sm:text-sm font-space-grotesk line-clamp-1 mt-0.5 text-muted-foreground">
                            {project.description}
                          </p>
                        )}
                        <p className="text-xs font-space-grotesk mt-1 text-muted-foreground/70">
                          Updated {new Date(project.updatedAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Action buttons - compact */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditProject(project.id)}
                          className={`neomorphic-button ${isDark ? "dark-mode" : ""} touch-manipulation`}
                          style={{
                            height: "36px",
                            width: "36px",
                            padding: "0",
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-foreground" />
                        </button>
                        <button
                          onClick={() => handleExploreProject(project.id)}
                          className={`neomorphic-button ${isDark ? "dark-mode" : ""} touch-manipulation`}
                          style={{
                            height: "36px",
                            width: "36px",
                            padding: "0",
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Explore"
                        >
                          <Eye className="w-4 h-4 text-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading state - Responsive */}
        {loadingProjects && (
          <div className="mt-8 sm:mt-12 text-center">
            <div className="inline-block w-7 h-7 sm:w-8 sm:h-8 border-4 border-t-transparent animate-spin mx-auto" style={{ borderColor: "#D4AF37", borderRadius: "50%" }}></div>
            <p className="mt-3 sm:mt-4 font-space-grotesk text-sm sm:text-base text-muted-foreground">
              Loading scenes...
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
