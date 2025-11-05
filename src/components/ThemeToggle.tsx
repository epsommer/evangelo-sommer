'use client';

import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark', 'dark-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark', 'dark-mode');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark', 'dark-mode');
    } else {
      document.documentElement.classList.remove('dark', 'dark-mode');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="neo-button relative flex items-center gap-2 px-4 py-2 text-sm transition-all duration-300 hover:scale-105"
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      <div className="relative flex items-center gap-2 text-foreground">
        {isDarkMode ? (
          <>
            <Moon className="w-4 h-4" />
            <span className="font-medium text-xs tracking-wide">NIGHT OPS</span>
          </>
        ) : (
          <>
            <Sun className="w-4 h-4" />
            <span className="font-medium text-xs tracking-wide">DAYLIGHT OPS</span>
          </>
        )}
      </div>
    </button>
  );
}

// Enhanced theme toggle with tactical interface elements
export function TacticalThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark', 'dark-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark', 'dark-mode');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark', 'dark-mode');
    } else {
      document.documentElement.classList.remove('dark', 'dark-mode');
    }
  };

  return (
    <div className="neo-container relative p-6 max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-medium text-foreground/70 tracking-wider uppercase">
          Display Mode
        </div>
        <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 animate-pulse"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => {
            if (isDarkMode) toggleTheme();
          }}
          className={`
            neo-button text-xs py-4 px-4 relative overflow-hidden transition-all duration-300
            ${!isDarkMode ? 'neo-button-active' : ''}
          `}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Sun className="w-5 h-5 mx-auto mb-2 text-foreground" />
          <div className="font-medium text-xs tracking-wide text-foreground">DAYLIGHT OPS</div>
        </button>

        <button
          onClick={() => {
            if (!isDarkMode) toggleTheme();
          }}
          className={`
            neo-button text-xs py-4 px-4 relative overflow-hidden transition-all duration-300
            ${isDarkMode ? 'neo-button-active' : ''}
          `}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Moon className="w-5 h-5 mx-auto mb-2 text-foreground" />
          <div className="font-medium text-xs tracking-wide text-foreground">NIGHT OPS</div>
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 text-foreground/60">
        <span className="text-xs font-medium tracking-wider uppercase">Status:</span>
        <span className="text-xs font-medium text-foreground">
          {isDarkMode ? 'Night Ops Engaged' : 'Daylight Ops Active'}
        </span>
      </div>
    </div>
  );
}

// Default export for backward compatibility
export default ThemeToggle;