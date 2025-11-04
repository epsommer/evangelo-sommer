import { useEffect, useState, useRef } from "react";
import "@/app/neomorphic.css";

interface DebugPanelProps {
  camera: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  };
  isVisible: boolean;
  onToggle: () => void;
  moveSpeed: number;
  jumpHeight: number;
  onSpeedChange: (speed: number) => void;
  onJumpHeightChange: (height: number) => void;
}

export default function DebugPanel({
  camera,
  isVisible,
  onToggle,
  moveSpeed,
  jumpHeight,
  onSpeedChange,
  onJumpHeightChange,
}: DebugPanelProps) {
  const [fps, setFps] = useState(0);
  const [frameTime, setFrameTime] = useState(0);
  const isDark = true; // Always dark mode for 3D gallery

  // Use refs to avoid re-render loops
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const lastFpsUpdateRef = useRef(performance.now());

  useEffect(() => {
    if (!isVisible) return;

    let animationId: number;

    const calculateFPS = () => {
      const now = performance.now();
      const deltaTime = now - lastTimeRef.current;

      // Update frame time
      setFrameTime(deltaTime);

      frameCountRef.current++;

      // Update FPS every second
      if (now - lastFpsUpdateRef.current >= 1000) {
        setFps(
          Math.round(
            (frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current),
          ),
        );
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
      }

      lastTimeRef.current = now;
      animationId = requestAnimationFrame(calculateFPS);
    };

    animationId = requestAnimationFrame(calculateFPS);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isVisible]); // Only depend on isVisible

  if (!isVisible) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 dark-mode font-mono text-sm"
      style={{
        zIndex: 200,
        minWidth: "300px",
        padding: "1.5rem",
        backgroundColor: "rgba(28, 25, 23, 0.95)",
        border: "1px solid #9ca3af",
        borderRadius: "16px",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ color: "#D4AF37", fontSize: "1.125rem", fontWeight: "bold", fontFamily: "var(--font-space-grotesk)", textTransform: "uppercase" }}>
          🛠️ Debug Panel
        </h3>
        <button
          onClick={onToggle}
          className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
          style={{
            height: "32px",
            width: "32px",
            padding: "0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {/* Performance Stats */}
        <div style={{ borderBottom: "1px solid #3f3f46", paddingBottom: "0.5rem" }}>
          <p style={{ color: "#22C55E" }}>FPS: {fps}</p>
          <p style={{ color: "#FBBF24" }}>
            Frame Time: {frameTime.toFixed(2)}ms
          </p>
        </div>

        {/* Camera Info */}
        <div style={{ borderBottom: "1px solid #3f3f46", paddingBottom: "0.5rem" }}>
          <p style={{ color: "#D4AF37", fontWeight: 600 }}>Camera Position:</p>
          <p style={{ color: "#d1d5db" }}>X: {camera.position.x.toFixed(2)}</p>
          <p style={{ color: "#d1d5db" }}>Y: {camera.position.y.toFixed(2)}</p>
          <p style={{ color: "#d1d5db" }}>Z: {camera.position.z.toFixed(2)}</p>
        </div>

        <div style={{ borderBottom: "1px solid #3f3f46", paddingBottom: "0.5rem" }}>
          <p style={{ color: "#A78BFA", fontWeight: 600 }}>Camera Rotation:</p>
          <p style={{ color: "#d1d5db" }}>X: {((camera.rotation.x * 180) / Math.PI).toFixed(1)}°</p>
          <p style={{ color: "#d1d5db" }}>Y: {((camera.rotation.y * 180) / Math.PI).toFixed(1)}°</p>
          <p style={{ color: "#d1d5db" }}>Z: {((camera.rotation.z * 180) / Math.PI).toFixed(1)}°</p>
        </div>

        {/* Movement Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingTop: "0.5rem" }}>
          <div>
            <label style={{ color: "#9ca3af", fontSize: "0.75rem", textTransform: "uppercase", display: "block", fontFamily: "var(--font-space-grotesk)" }}>
              Move Speed: {moveSpeed.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={moveSpeed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              style={{
                accentColor: "#D4AF37",
                width: "100%",
                marginTop: "0.5rem",
              }}
            />
          </div>

          <div>
            <label style={{ color: "#9ca3af", fontSize: "0.75rem", textTransform: "uppercase", display: "block", fontFamily: "var(--font-space-grotesk)" }}>
              Jump Height: {jumpHeight.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={jumpHeight}
              onChange={(e) => onJumpHeightChange(parseFloat(e.target.value))}
              style={{
                accentColor: "#D4AF37",
                width: "100%",
                marginTop: "0.5rem",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
