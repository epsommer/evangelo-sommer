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

export const statusConfigs: Record<UserStatus, UserStatusConfig> = {
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
  className?: string;
}

// Visual indicator only - non-clickable
export default function UserStatusIndicator({
  size = "md",
  className = ""
}: UserStatusIndicatorProps) {
  const [status, setStatus] = useState<UserStatus>("online");

  // Load status from localStorage
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

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  const currentConfig = statusConfigs[status];

  return (
    <div
      className={`absolute top-0 right-0 ${sizeClasses[size]} ${currentConfig.color} rounded-full border-2 border-background ${className}`}
      title={currentConfig.label}
    />
  );
}

// Status selector component for use in dropdown menus
interface StatusSelectorProps {
  onStatusChange?: (status: UserStatus) => void;
}

export function StatusSelector({ onStatusChange }: StatusSelectorProps) {
  const [status, setStatus] = useState<UserStatus>("online");

  // Load status from localStorage
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

  const handleStatusChange = (newStatus: UserStatus) => {
    setStatus(newStatus);
    localStorage.setItem("user-status", newStatus);

    // Trigger storage event manually for same-window updates
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'user-status',
      newValue: newStatus,
      oldValue: status
    }));

    onStatusChange?.(newStatus);
  };

  return (
    <div className="space-y-1">
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
