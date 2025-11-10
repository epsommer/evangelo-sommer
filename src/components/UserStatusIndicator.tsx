"use client";

import { useState, useEffect } from "react";
import { Circle } from "lucide-react";

export type UserStatus = "online" | "inactive" | "dnd" | "invisible";

interface UserStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

const statusConfigs: Record<UserStatus, UserStatusConfig> = {
  online: {
    label: "Online",
    color: "bg-green-500",
    bgColor: "bg-green-500/10",
    description: "Available and active"
  },
  inactive: {
    label: "Inactive",
    color: "bg-amber-500",
    bgColor: "bg-amber-500/10",
    description: "Away from keyboard"
  },
  dnd: {
    label: "Do Not Disturb",
    color: "bg-red-500",
    bgColor: "bg-red-500/10",
    description: "Focused, please don't interrupt"
  },
  invisible: {
    label: "Invisible",
    color: "bg-gray-400",
    bgColor: "bg-gray-400/10",
    description: "Appear offline to others"
  }
};

interface UserStatusIndicatorProps {
  size?: "sm" | "md" | "lg";
  showMenu?: boolean;
  className?: string;
}

export default function UserStatusIndicator({
  size = "md",
  showMenu = false,
  className = ""
}: UserStatusIndicatorProps) {
  const [status, setStatus] = useState<UserStatus>("online");
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Load status from localStorage
  useEffect(() => {
    const savedStatus = localStorage.getItem("user-status") as UserStatus;
    if (savedStatus && statusConfigs[savedStatus]) {
      setStatus(savedStatus);
    }
  }, []);

  // Save status to localStorage
  const handleStatusChange = (newStatus: UserStatus) => {
    setStatus(newStatus);
    localStorage.setItem("user-status", newStatus);
    setShowStatusMenu(false);
  };

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  const currentConfig = statusConfigs[status];

  if (!showMenu) {
    // Just the indicator dot
    return (
      <div
        className={`absolute -top-1 -right-1 ${sizeClasses[size]} ${currentConfig.color} rounded-full border-2 border-background ${className}`}
        title={currentConfig.label}
      />
    );
  }

  // Indicator with clickable menu
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowStatusMenu(!showStatusMenu);
        }}
        className={`absolute -top-1 -right-1 ${sizeClasses[size]} ${currentConfig.color} rounded-full border-2 border-background cursor-pointer hover:scale-110 transition-transform ${className}`}
        title={`${currentConfig.label} - Click to change`}
      />

      {showStatusMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowStatusMenu(false)}
          />

          {/* Status Menu */}
          <div className="absolute right-0 top-full mt-2 z-50 w-64 neo-container rounded-xl overflow-hidden">
            <div className="p-3 border-b border-border">
              <h4 className="font-primary text-xs uppercase tracking-wide text-foreground">
                Set Status
              </h4>
            </div>

            <div className="p-2 space-y-1">
              {(Object.keys(statusConfigs) as UserStatus[]).map((statusKey) => {
                const config = statusConfigs[statusKey];
                return (
                  <button
                    key={statusKey}
                    onClick={() => handleStatusChange(statusKey)}
                    className={`w-full neo-button px-3 py-2 flex items-center gap-3 text-left transition-all ${
                      status === statusKey ? config.bgColor : ""
                    }`}
                  >
                    <Circle
                      className={`w-3 h-3 ${config.color} fill-current`}
                    />
                    <div className="flex-1">
                      <div className="font-primary text-sm text-foreground">
                        {config.label}
                      </div>
                      <div className="font-body text-xs text-muted-foreground">
                        {config.description}
                      </div>
                    </div>
                    {status === statusKey && (
                      <div className="text-accent text-xs">✓</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Hook to get current user status
export function useUserStatus() {
  const [status, setStatus] = useState<UserStatus>("online");

  useEffect(() => {
    const savedStatus = localStorage.getItem("user-status") as UserStatus;
    if (savedStatus && statusConfigs[savedStatus]) {
      setStatus(savedStatus);
    }

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user-status" && e.newValue) {
        setStatus(e.newValue as UserStatus);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return status;
}
