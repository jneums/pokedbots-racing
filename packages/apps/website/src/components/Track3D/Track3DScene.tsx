import React, { useRef, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { TrackTemplate, CameraMode } from './types';
import { generateTrackMesh } from './TrackGeometry';
import { createGroundMaterial, getFogColor } from './TerrainMaterials';
import { BotRenderer } from './BotRenderer';
import { CameraController } from './CameraController';

interface Track3DSceneProps {
  track: TrackTemplate;
  bots?: Array<{
    nftId: number;
    position: [number, number, number];
    rotation: [number, number, number];
    color: string;
    label: string;
    isHighlighted?: boolean;
  }>;
  cameraMode?: CameraMode;
  cameraTarget?: [number, number, number];
  cameraTargetRotation?: [number, number, number];
  cameraZoom?: number;
}

function Track({ track }: { track: TrackTemplate }) {
  const trackRef = useRef<THREE.Group>(null);
  
  // Generate track mesh and return center for ground positioning
  const { trackMesh, center } = React.useMemo(() => {
    const mesh = generateTrackMesh(track);
    
    // Calculate track center from all positions
    const box = new THREE.Box3().setFromObject(mesh);
    const trackCenter = new THREE.Vector3();
    box.getCenter(trackCenter);
    
    return { trackMesh: mesh, center: trackCenter };
  }, [track]);
  
  return <primitive object={trackMesh} ref={trackRef} />;
}

function Ground({ size = 500, center }: { size?: number; center?: THREE.Vector3 }) {
  const groundMaterial = createGroundMaterial();
  const position: [number, number, number] = center ? [center.x, -0.1, center.z] : [0, -0.1, 0];
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={[size, size]} />
      <primitive object={groundMaterial} attach="material" />
    </mesh>
  );
}

function Lighting() {
  return (
    <>
      {/* Ambient light for overall scene brightness */}
      <ambientLight intensity={0.4} />
      
      {/* Main directional light (sun) */}
      <directionalLight
        position={[50, 50, 50]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      
      {/* Fill light from opposite side */}
      <directionalLight
        position={[-30, 20, -30]}
        intensity={0.3}
      />
      
      {/* Subtle rim light */}
      <directionalLight
        position={[0, 10, -50]}
        intensity={0.2}
        color="#ff9955"
      />
    </>
  );
}

export function Track3DScene({ track, bots = [], cameraMode = 'orbit', cameraTarget, cameraTargetRotation, cameraZoom = 1.0 }: Track3DSceneProps) {
  const fogColor = getFogColor(track.primaryTerrain);
  const trackRef = useRef<THREE.Group>(null);
  
  // Calculate track center for ground positioning
  const trackCenter = useMemo(() => {
    const mesh = generateTrackMesh(track);
    const box = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }, [track]);
  
  return (
    <div className="w-full h-[600px] bg-gradient-to-b from-orange-900/20 to-brown-900/40 rounded-lg overflow-hidden">
      <Canvas shadows>
        {/* Fog for depth */}
        <fog attach="fog" args={[fogColor.getHex(), 50, 200]} />
        
        {/* Camera */}
        <PerspectiveCamera
          makeDefault
          position={[40, 30, 40]}
          fov={60}
        />
        
        {/* Camera Controller */}
        <CameraController 
          mode={cameraMode} 
          targetPosition={cameraTarget}
          targetRotation={cameraTargetRotation}
          zoomMultiplier={cameraZoom}
          enabled={true}
        />
        
        {/* Lighting */}
        <Lighting />
        
        {/* Track */}
        <Track track={track} />
        
        {/* Bots */}
        {bots.map((bot, index) => (
          <BotRenderer
            key={bot.nftId}
            nftId={bot.nftId}
            position={bot.position}
            rotation={bot.rotation}
            color={bot.color}
            label={bot.label}
            isHighlighted={bot.isHighlighted}
          />
        ))}
        
        {/* Ground plane */}
        <Ground center={trackCenter} />
        
        {/* Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={20}
          maxDistance={150}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
    </div>
  );
}
