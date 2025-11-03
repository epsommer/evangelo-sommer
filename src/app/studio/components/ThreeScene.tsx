"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { useStudioStore } from "../hooks/useStudioStore";

interface ThreeSceneProps {
  isDark: boolean;
}

function Scene() {
  const objects = useStudioStore((state) => state.objects);
  const selectedObject = useStudioStore((state) => state.selectedObject);
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
      {objects.map((obj) => {
        const isSelected = selectedObject === obj.id;

        switch (obj.type) {
          case 'cube':
            return (
              <group key={obj.id}>
                <mesh
                  position={obj.position}
                  rotation={obj.rotation}
                  scale={obj.scale}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(obj.id);
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = 'pointer';
                  }}
                  onPointerOut={() => {
                    document.body.style.cursor = 'default';
                  }}
                >
                  <boxGeometry args={[1, 1, 1]} />
                  <meshStandardMaterial
                    color={obj.color || '#D4AF37'}
                    emissive={isSelected ? '#D4AF37' : '#000000'}
                    emissiveIntensity={isSelected ? 0.3 : 0}
                  />
                </mesh>
                {isSelected && (
                  <mesh position={obj.position} rotation={obj.rotation} scale={obj.scale}>
                    <boxGeometry args={[1.05, 1.05, 1.05]} />
                    <meshBasicMaterial color="#D4AF37" wireframe />
                  </mesh>
                )}
              </group>
            );
          case 'sphere':
            return (
              <group key={obj.id}>
                <mesh
                  position={obj.position}
                  rotation={obj.rotation}
                  scale={obj.scale}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(obj.id);
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = 'pointer';
                  }}
                  onPointerOut={() => {
                    document.body.style.cursor = 'default';
                  }}
                >
                  <sphereGeometry args={[0.5, 32, 32]} />
                  <meshStandardMaterial
                    color={obj.color || '#D4AF37'}
                    emissive={isSelected ? '#D4AF37' : '#000000'}
                    emissiveIntensity={isSelected ? 0.3 : 0}
                  />
                </mesh>
                {isSelected && (
                  <mesh position={obj.position} rotation={obj.rotation} scale={obj.scale}>
                    <sphereGeometry args={[0.53, 32, 32]} />
                    <meshBasicMaterial color="#D4AF37" wireframe />
                  </mesh>
                )}
              </group>
            );
          case 'cylinder':
            return (
              <group key={obj.id}>
                <mesh
                  position={obj.position}
                  rotation={obj.rotation}
                  scale={obj.scale}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(obj.id);
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = 'pointer';
                  }}
                  onPointerOut={() => {
                    document.body.style.cursor = 'default';
                  }}
                >
                  <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
                  <meshStandardMaterial
                    color={obj.color || '#D4AF37'}
                    emissive={isSelected ? '#D4AF37' : '#000000'}
                    emissiveIntensity={isSelected ? 0.3 : 0}
                  />
                </mesh>
                {isSelected && (
                  <mesh position={obj.position} rotation={obj.rotation} scale={obj.scale}>
                    <cylinderGeometry args={[0.53, 0.53, 1.05, 32]} />
                    <meshBasicMaterial color="#D4AF37" wireframe />
                  </mesh>
                )}
              </group>
            );
          default:
            return null;
        }
      })}
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
