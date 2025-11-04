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
  const [showControls, setShowControls] = useState(false);
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
          width: "480px",
          maxWidth: "90vw",
          maxHeight: "80vh",
          overflowY: "auto",
          padding: "2rem",
          backgroundColor: "rgba(28, 25, 23, 0.95)",
          border: "1px solid #9ca3af",
          borderRadius: "16px",
          backdropFilter: "blur(8px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ color: "#D4AF37", fontSize: "1.5rem", fontWeight: "bold", fontFamily: "var(--font-space-grotesk)", textTransform: "uppercase" }}>
            ⏸️ Paused
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

        {/* Controls Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowControls(!showControls)}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''} w-full`}
            style={{
              height: "48px",
              fontSize: "14px",
              backgroundColor: showControls
                ? "rgba(212, 175, 55, 0.2)"
                : undefined,
            }}
          >
            🎮 {showControls ? "Hide" : "Show"} Controls
          </button>

          {showControls && (
            <div
              className="mt-4 p-4 space-y-3"
              style={{
                backgroundColor: "rgba(60, 56, 54, 0.3)",
                borderRadius: "8px",
              }}
            >
              <div>
                <p style={{ color: "#D4AF37", fontSize: "0.875rem", fontWeight: "bold", fontFamily: "var(--font-space-grotesk)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  Movement
                </p>
                <div style={{ color: "#d1d5db", fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <p>• WASD / Arrow Keys: Move</p>
                  <p>• SPACE: Jump</p>
                  <p>• Q / E: Rotate Left/Right</p>
                </div>
              </div>

              <div>
                <p style={{ color: "#D4AF37", fontSize: "0.875rem", fontWeight: "bold", fontFamily: "var(--font-space-grotesk)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  Camera
                </p>
                <div style={{ color: "#d1d5db", fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <p>• Mouse: Look Around</p>
                  <p>• Move cursor to screen edges for rotation</p>
                </div>
              </div>

              <div>
                <p style={{ color: "#D4AF37", fontSize: "0.875rem", fontWeight: "bold", fontFamily: "var(--font-space-grotesk)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  Menu
                </p>
                <div style={{ color: "#d1d5db", fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <p>• TAB: Open/Close Pause Menu</p>
                  <p>• ESC: Debug Panel</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: "1px", backgroundColor: "#3f3f46", marginBottom: "1.5rem" }} />

        {/* Audio Enable/Disable */}
        <div className="mb-6">
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={audioEnabled}
              onChange={(e) => setAudioEnabled(e.target.checked)}
              style={{ accentColor: "#D4AF37", width: "1.25rem", height: "1.25rem" }}
            />
            <span style={{ color: "#d1d5db", fontSize: "1.125rem", fontFamily: "var(--font-space-grotesk)" }}>
              🔊 Enable Audio
            </span>
          </label>
        </div>

        {/* Music Volume */}
        <div className="mb-6">
          <label style={{ color: "#9ca3af", fontSize: "0.875rem", textTransform: "uppercase", display: "block", marginBottom: "0.5rem", fontFamily: "var(--font-space-grotesk)" }}>
            🎵 Music Volume: {musicVolume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={musicVolume}
            onChange={(e) => setMusicVolume(Number(e.target.value))}
            disabled={!audioEnabled}
            style={{ accentColor: "#D4AF37", width: "100%" }}
          />
        </div>

        {/* SFX Volume */}
        <div className="mb-6">
          <label style={{ color: "#9ca3af", fontSize: "0.875rem", textTransform: "uppercase", display: "block", marginBottom: "0.5rem", fontFamily: "var(--font-space-grotesk)" }}>
            🔉 Sound Effects Volume: {sfxVolume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={sfxVolume}
            onChange={(e) => setSfxVolume(Number(e.target.value))}
            disabled={!audioEnabled}
            style={{ accentColor: "#D4AF37", width: "100%" }}
          />
        </div>

        {/* Music Track Selection */}
        <div className="mb-6">
          <label style={{ color: "#9ca3af", fontSize: "0.875rem", textTransform: "uppercase", display: "block", marginBottom: "0.5rem", fontFamily: "var(--font-space-grotesk)" }}>
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
        <div style={{ display: "flex", gap: "0.75rem", flexDirection: "column" }}>
          <button
            onClick={handleSave}
            className={`neomorphic-submit ${isDark ? 'dark-mode' : ''}`}
            style={{
              width: "100%",
              height: "48px",
              fontSize: "14px",
            }}
          >
            💾 Save
          </button>
          <button
            onClick={handleReset}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
            style={{
              width: "100%",
              height: "48px",
              fontSize: "14px",
            }}
          >
            🔄 Reset
          </button>
        </div>

        <div style={{ marginTop: "1rem", fontSize: "0.75rem", textAlign: "center", fontFamily: "var(--font-space-grotesk)", color: "#6b7280" }}>
          Press TAB to resume • ESC for debug panel
        </div>
      </div>
    </div>
  );
}
