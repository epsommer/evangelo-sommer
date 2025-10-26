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
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle relative flex items-center gap-2 px-3 py-2 text-sm tk-ff-utility-web-pro"
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      <div className="relative flex items-center gap-2">
        {isDarkMode ? (
          <>
            <Moon className="w-4 h-4" />
            <span className="hud-command text-xs">NIGHT OPS</span>
          </>
        ) : (
          <>
            <Sun className="w-4 h-4" />
            <span className="hud-command text-xs">DAYLIGHT OPS</span>
          </>
        )}
      </div>
      
      {/* Tactical HUD indicator */}
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-tactical-gold opacity-75 animate-pulse"></div>
      
      {/* Corner markers */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-tactical-gold opacity-50"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-tactical-gold opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-tactical-gold opacity-50"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-tactical-gold opacity-50"></div>
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
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="tactical-frame relative p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="hud-label text-xs">
          MISSION DISPLAY
        </div>
        <div className="status-operational w-2 h-2 rounded-full bg-tactical-success animate-pulse"></div>
      </div>
      
      <div className="tactical-grid grid-cols-2 gap-4">
        <button
          onClick={() => {
            if (isDarkMode) toggleTheme();
          }}
          className={`
            btn-tactical text-xs py-3 px-4 relative overflow-hidden
            ${!isDarkMode ? 'bg-tactical-gold text-tactical-grey-900' : 'bg-transparent text-hud-text-secondary border-hud-border'}
          `}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Sun className="w-5 h-5 mx-auto mb-1" />
          <div className="hud-command text-xs">DAYLIGHT OPS</div>
          {!isDarkMode && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
          )}
        </button>
        
        <button
          onClick={() => {
            if (!isDarkMode) toggleTheme();
          }}
          className={`
            btn-tactical text-xs py-3 px-4 relative overflow-hidden
            ${isDarkMode ? 'bg-tactical-gold text-tactical-gray-900' : 'bg-transparent text-hud-text-secondary border-hud-border'}
          `}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Moon className="w-5 h-5 mx-auto mb-1" />
          <div className="hud-command text-xs">NIGHT OPS</div>
          {isDarkMode && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
          )}
        </button>
      </div>
      
      <div className="mt-4 flex items-center gap-2">
        <span className="hud-label text-xs">MISSION STATUS:</span>
        <span className="hud-value text-xs status-active">
          {isDarkMode ? 'NIGHT OPS ENGAGED' : 'DAYLIGHT OPS ACTIVE'}
        </span>
      </div>
      
      {/* Schematic overlay when hovered */}
      {isHovered && (
        <div className="schematic-overlay absolute inset-0 pointer-events-none">
          <div className="absolute top-2 right-2 w-16 h-16 border border-tactical-gold opacity-30">
            <div className="absolute inset-1 border border-tactical-gold opacity-50">
              <div className="absolute inset-1 bg-tactical-gold opacity-10"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Default export for backward compatibility
export default ThemeToggle;