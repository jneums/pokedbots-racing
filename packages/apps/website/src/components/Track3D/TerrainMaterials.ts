import * as THREE from 'three';
import { Terrain } from './types';

/**
 * Terrain-specific materials for track rendering
 */
export function createTerrainMaterial(terrain: Terrain): THREE.MeshStandardMaterial {
  switch (terrain) {
    case 'ScrapHeaps':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xa0522d), // Brighter rust brown
        roughness: 0.85,
        metalness: 0.4,
        emissive: new THREE.Color(0x4a2515),
        emissiveIntensity: 0.2,
      });
    
    case 'WastelandSand':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xe8c090), // Brighter sandy tan
        roughness: 0.75,
        metalness: 0.0,
        emissive: new THREE.Color(0xa08060),
        emissiveIntensity: 0.15,
      });
    
    case 'MetalRoads':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x606060), // Lighter grey for better visibility
        roughness: 0.5,
        metalness: 0.8,
        emissive: new THREE.Color(0x303030),
        emissiveIntensity: 0.25,
      });
  }
}

/**
 * Create ground plane material
 */
export function createGroundMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x3d2f1f), // Dark wasteland brown
    roughness: 0.95,
    metalness: 0.0,
  });
}

/**
 * Get fog color based on primary terrain
 */
export function getFogColor(terrain: Terrain): THREE.Color {
  switch (terrain) {
    case 'ScrapHeaps':
      return new THREE.Color(0x5a3d2f); // Rusty haze
    case 'WastelandSand':
      return new THREE.Color(0xc9a36c); // Sandy haze
    case 'MetalRoads':
      return new THREE.Color(0x3d3d3d); // Grey haze
  }
}
