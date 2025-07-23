import { useEffect, useState, useRef } from "react";

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
      className="fixed top-4 right-4 z-50 bg-black bg-opacity-90 text-white p-4 rounded-lg shadow-lg font-mono text-sm"
      style={{ zIndex: 200, minWidth: "300px" }}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">🛠️ Debug Panel</h3>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        {/* Performance Stats */}
        <div className="border-b border-gray-700 pb-2">
          <p className="text-green-400">FPS: {fps}</p>
          <p className="text-yellow-400">
            Frame Time: {frameTime.toFixed(2)}ms
          </p>
        </div>

        {/* Camera Info */}
        <div className="border-b border-gray-700 pb-2">
          <p className="text-blue-400 font-semibold">Camera Position:</p>
          <p>X: {camera.position.x.toFixed(2)}</p>
          <p>Y: {camera.position.y.toFixed(2)}</p>
          <p>Z: {camera.position.z.toFixed(2)}</p>
        </div>

        <div className="border-b border-gray-700 pb-2">
          <p className="text-purple-400 font-semibold">Camera Rotation:</p>
          <p>X: {((camera.rotation.x * 180) / Math.PI).toFixed(1)}°</p>
          <p>Y: {((camera.rotation.y * 180) / Math.PI).toFixed(1)}°</p>
          <p>Z: {((camera.rotation.z * 180) / Math.PI).toFixed(1)}°</p>
        </div>

        {/* Movement Controls */}
        <div className="space-y-3">
          <div>
            <label className="text-gray-300 text-xs">
              Move Speed: {moveSpeed.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={moveSpeed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="w-full mt-1"
            />
          </div>

          <div>
            <label className="text-gray-300 text-xs">
              Jump Height: {jumpHeight.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={jumpHeight}
              onChange={(e) => onJumpHeightChange(parseFloat(e.target.value))}
              className="w-full mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
