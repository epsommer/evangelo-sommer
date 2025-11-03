"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, TransformControls } from "@react-three/drei";
import { useStudioStore, SceneObject as SceneObjectType } from "../hooks/useStudioStore";
import * as THREE from "three";

interface ThreeSceneProps {
  isDark: boolean;
}

interface SceneObjectProps {
  obj: SceneObjectType;
  isSelected: boolean;
  transformMode: 'select' | 'translate' | 'rotate' | 'scale';
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SceneObjectType>) => void;
}

function SceneObject({ obj, isSelected, transformMode, onSelect, onUpdate }: SceneObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const handleTransform = () => {
    if (meshRef.current && isSelected) {
      const newPosition: [number, number, number] = [
        meshRef.current.position.x,
        meshRef.current.position.y,
        meshRef.current.position.z
      ];
      const newRotation: [number, number, number] = [
        meshRef.current.rotation.x,
        meshRef.current.rotation.y,
        meshRef.current.rotation.z
      ];
      const newScale: [number, number, number] = [
        meshRef.current.scale.x,
        meshRef.current.scale.y,
        meshRef.current.scale.z
      ];

      onUpdate(obj.id, {
        position: newPosition,
        rotation: newRotation,
        scale: newScale
      });
    }
  };

  let geometry;
  switch (obj.type) {
    case 'cube':
      geometry = <boxGeometry args={[1, 1, 1]} />;
      break;
    case 'sphere':
      geometry = <sphereGeometry args={[0.5, 32, 32]} />;
      break;
    case 'cylinder':
      geometry = <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      break;
    default:
      return null;
  }

  return (
    <group>
      <mesh
        ref={meshRef}
        position={obj.position}
        rotation={obj.rotation}
        scale={obj.scale}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(obj.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!isSelected) {
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          if (!isSelected) {
            document.body.style.cursor = 'default';
          }
        }}
      >
        {geometry}
        <meshStandardMaterial
          color={obj.color || '#D4AF37'}
          emissive={isSelected ? '#D4AF37' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      {isSelected && meshRef.current && transformMode !== 'select' && (
        <TransformControls
          object={meshRef.current}
          mode={transformMode}
          onObjectChange={handleTransform}
        />
      )}
    </group>
  );
}

function Scene() {
  const objects = useStudioStore((state) => state.objects);
  const selectedObject = useStudioStore((state) => state.selectedObject);
  const transformMode = useStudioStore((state) => state.transformMode);
  const updateObject = useStudioStore((state) => state.updateObject);
  const setSelected = (id: string) => useStudioStore.setState({ selectedObject: id });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />

      {/* Grid Helper */}
      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6C7587"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#D4AF37"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
      />

      {/* Render Objects */}
      {objects.map((obj) => (
        <SceneObject
          key={obj.id}
          obj={obj}
          isSelected={selectedObject === obj.id}
          transformMode={transformMode}
          onSelect={setSelected}
          onUpdate={updateObject}
        />
      ))}
    </>
  );
}

export default function ThreeScene({ isDark }: ThreeSceneProps) {
  const handleCanvasClick = () => {
    // Deselect when clicking on empty canvas
    useStudioStore.setState({ selectedObject: null });
  };

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        style={{
          background: isDark ? '#1c1917' : '#EBECF0',
        }}
        onClick={handleCanvasClick}
      >
        <Scene />

        {/* Camera Controls */}
        <OrbitControls makeDefault />

        {/* Gizmo Helper */}
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={['#EF4444', '#22C55E', '#3B82F6']}
            labelColor="white"
          />
        </GizmoHelper>
      </Canvas>

      {/* Canvas Overlay Info */}
      <div className="absolute bottom-4 left-4 text-xs font-space-grotesk" style={{ color: isDark ? '#9ca3af' : '#6C7587' }}>
        <p>Left Click + Drag: Rotate | Right Click + Drag: Pan | Scroll: Zoom | Click Object: Select</p>
      </div>
    </div>
  );
}
