"use client";
import { useState } from "react";
import "@/app/neomorphic.css";

interface SettingsPanelProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function SettingsPanel({
  isVisible,
  onToggle,
}: SettingsPanelProps) {
  const [musicVolume, setMusicVolume] = useState(75);
  const [sfxVolume, setSfxVolume] = useState(85);
  const [musicTrack, setMusicTrack] = useState("ambient-gallery");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const isDark = true; // Always dark mode for 3D gallery

  const musicTracks = [
    { id: "ambient-gallery", name: "Ambient Gallery" },
    { id: "classical-museum", name: "Classical Museum" },
    { id: "modern-electronic", name: "Modern Electronic" },
    { id: "minimal-piano", name: "Minimal Piano" },
    { id: "nature-sounds", name: "Nature Sounds" },
    { id: "silence", name: "No Music" },
  ];

  const handleSave = () => {
    // Save settings to localStorage
    const settings = {
      musicVolume,
      sfxVolume,
      musicTrack,
      audioEnabled,
    };
    localStorage.setItem("gallery-settings", JSON.stringify(settings));
    console.log("⚙️ Settings saved:", settings);
    onToggle();
  };

  const handleReset = () => {
    setMusicVolume(75);
    setSfxVolume(85);
    setMusicTrack("ambient-gallery");
    setAudioEnabled(true);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onToggle}
    >
      <div
        className="dark-mode"
        style={{
          width: "384px",
          maxWidth: "90vw",
          padding: "2rem",
          backgroundColor: "rgba(28, 25, 23, 0.95)",
          border: "2px solid #D4AF37",
          borderRadius: "12px",
          backdropFilter: "blur(8px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold font-space-grotesk uppercase" style={{ color: "#D4AF37" }}>
            ⚙️ Settings
          </h2>
          <button
            onClick={onToggle}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
            style={{
              height: "36px",
              width: "36px",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Audio Enable/Disable */}
        <div className="mb-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={audioEnabled}
              onChange={(e) => setAudioEnabled(e.target.checked)}
              className="w-5 h-5"
              style={{ accentColor: "#D4AF37" }}
            />
            <span className="text-lg font-space-grotesk" style={{ color: "#d1d5db" }}>
              🔊 Enable Audio
            </span>
          </label>
        </div>

        {/* Music Volume */}
        <div className="mb-6">
          <label className="block text-sm font-space-grotesk uppercase mb-2" style={{ color: "#9ca3af" }}>
            🎵 Music Volume: {musicVolume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={musicVolume}
            onChange={(e) => setMusicVolume(Number(e.target.value))}
            disabled={!audioEnabled}
            className="w-full"
            style={{ accentColor: "#D4AF37" }}
          />
        </div>

        {/* SFX Volume */}
        <div className="mb-6">
          <label className="block text-sm font-space-grotesk uppercase mb-2" style={{ color: "#9ca3af" }}>
            🔉 Sound Effects Volume: {sfxVolume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={sfxVolume}
            onChange={(e) => setSfxVolume(Number(e.target.value))}
            disabled={!audioEnabled}
            className="w-full"
            style={{ accentColor: "#D4AF37" }}
          />
        </div>

        {/* Music Track Selection */}
        <div className="mb-6">
          <label className="block text-sm font-space-grotesk uppercase mb-2" style={{ color: "#9ca3af" }}>
            🎼 Background Music
          </label>
          <select
            value={musicTrack}
            onChange={(e) => setMusicTrack(e.target.value)}
            disabled={!audioEnabled}
            className={`neomorphic-input ${isDark ? 'dark-mode' : ''}`}
            style={{
              width: "100%",
              padding: "0.75rem",
            }}
          >
            {musicTracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleSave}
            className={`neomorphic-submit ${isDark ? 'dark-mode' : ''}`}
            style={{
              flex: 1,
              height: "48px",
              fontSize: "14px",
            }}
          >
            💾 Save & Close
          </button>
          <button
            onClick={handleReset}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
            style={{
              flex: 1,
              height: "48px",
              fontSize: "14px",
            }}
          >
            🔄 Reset
          </button>
        </div>

        <div className="mt-4 text-xs text-center font-space-grotesk" style={{ color: "#6b7280" }}>
          Press TAB to open/close • ESC for debug panel
        </div>
      </div>
    </div>
  );
}
