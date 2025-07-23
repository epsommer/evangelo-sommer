"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Box, Plane, Text } from "@react-three/drei";
import { Mesh } from "three";

export default function GalleryScene() {
  const boxRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (boxRef.current) {
      boxRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    // @ts-expect-error Three.js JSX elements not in type definitions
    <group>
      {/* Floor */}
      <Plane args={[50, 50]} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        {/* @ts-expect-error Three.js JSX elements not in type definitions */}
        <meshStandardMaterial color="#222" />
      </Plane>

      {/* Test Box */}
      <Box ref={boxRef} position={[0, 1, 0]} args={[1, 1, 1]}>
        {/* @ts-expect-error Three.js JSX elements not in type definitions */}
        <meshStandardMaterial color="hotpink" />
      </Box>

      {/* Welcome Text */}
      <Text
        position={[0, 3, -2]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Welcome to the Gallery
      </Text>

      {/* Walls */}
      <Plane args={[20, 10]} position={[0, 5, -10]}>
        {/* @ts-expect-error Three.js JSX elements not in type definitions */}
        <meshStandardMaterial color="#333" />
      </Plane>

      <Plane args={[20, 10]} position={[-10, 5, 0]} rotation-y={Math.PI / 2}>
        {/* @ts-expect-error Three.js JSX elements not in type definitions */}
        <meshStandardMaterial color="#333" />
      </Plane>

      <Plane args={[20, 10]} position={[10, 5, 0]} rotation-y={-Math.PI / 2}>
        {/* @ts-expect-error Three.js JSX elements not in type definitions */}
        <meshStandardMaterial color="#333" />
      </Plane>
      {/* @ts-expect-error Three.js JSX elements not in type definitions */}
    </group>
  );
}
