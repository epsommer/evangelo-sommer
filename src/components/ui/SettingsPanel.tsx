"use client";
import { useState } from "react";

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
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-gray-900 text-white p-8 rounded-xl border border-gray-600 w-96 max-w-90vw">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-400">⚙️ Settings</h2>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-red-400 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Audio Enable/Disable */}
        <div className="mb-6">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={audioEnabled}
              onChange={(e) => setAudioEnabled(e.target.checked)}
              className="w-5 h-5 text-blue-600"
            />
            <span className="text-lg">🔊 Enable Audio</span>
          </label>
        </div>

        {/* Music Volume */}
        <div className="mb-6">
          <label className="block text-sm text-gray-300 mb-2">
            🎵 Music Volume: {musicVolume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={musicVolume}
            onChange={(e) => setMusicVolume(Number(e.target.value))}
            disabled={!audioEnabled}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* SFX Volume */}
        <div className="mb-6">
          <label className="block text-sm text-gray-300 mb-2">
            🔉 Sound Effects Volume: {sfxVolume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={sfxVolume}
            onChange={(e) => setSfxVolume(Number(e.target.value))}
            disabled={!audioEnabled}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Music Track Selection */}
        <div className="mb-6">
          <label className="block text-sm text-gray-300 mb-2">
            🎼 Background Music
          </label>
          <select
            value={musicTrack}
            onChange={(e) => setMusicTrack(e.target.value)}
            disabled={!audioEnabled}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
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
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            💾 Save & Close
          </button>
          <button
            onClick={handleReset}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            🔄 Reset
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-400 text-center">
          Press TAB to open/close • ESC for debug panel
        </div>
      </div>
    </div>
  );
}
