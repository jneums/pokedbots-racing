import * as THREE from 'three';
import { TrackSegment, TrackTemplate } from './types';
import { createTerrainMaterial } from './TerrainMaterials';

/**
 * Generate 3D track mesh from segments
 * @param track Track template with segments
 * @returns Array of meshes (one per terrain type for efficiency)
 */
export function generateTrackMesh(track: TrackTemplate): THREE.Group {
  const trackGroup = new THREE.Group();
  
  const TRACK_WIDTH = 40; // Wider track for better visibility
  const SCALE = 0.1; // 1 unit = 10 meters for reasonable viewport
  
  // For multi-lap tracks, we only render one lap and it should loop
  // The segments already represent one complete lap
  const segments = track.segments;
  
  // Track progress along path
  let currentPos = new THREE.Vector3(0, 0, 0);
  let currentDirection = new THREE.Vector3(0, 0, 1); // Start facing forward
  
  // Calculate total track path first to determine loop closure
  const positions: THREE.Vector3[] = [currentPos.clone()];
  const directions: THREE.Vector3[] = [currentDirection.clone()];
  
  // For circuits, calculate turn distribution to ensure 360° total
  let turnAngles: number[] = [];
  if (track.laps > 1) {
    const totalRotationNeeded = Math.PI * 2;
    
    // Calculate difficulty weights for each segment with exaggerated differences
    const difficultyWeights = segments.map(seg => {
      // Exaggerate difficulty differences: square the difficulty to make high values stand out more
      // This makes 1.25 -> 1.56, 1.0 -> 1.0, 0.95 -> 0.90
      const exaggerated = Math.pow(seg.difficulty, 2);
      return exaggerated;
    });
    
    const totalWeight = difficultyWeights.reduce((sum, w) => sum + w, 0);
    
    // Distribute the 360° across segments proportional to their difficulty
    turnAngles = difficultyWeights.map(weight => 
      (weight / totalWeight) * totalRotationNeeded
    );
  }
  
  segments.forEach((segment, index) => {
    const segmentLength = segment.length * SCALE;
    const angleRad = (segment.angle * Math.PI) / 180;
    const horizontalLength = segmentLength * Math.cos(angleRad);
    const verticalChange = segmentLength * Math.sin(angleRad);
    
    // For circuits (laps > 1), use pre-calculated turn angles
    if (track.laps > 1) {
      currentDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), turnAngles[index]);
    } else {
      // Point-to-point: add some variation for visual interest
      if (index % 3 === 0 && index > 0) {
        const rotationAngle = (Math.sin(index * 0.5) * 0.1);
        currentDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);
      }
    }
    
    currentPos = currentPos.clone().add(currentDirection.clone().multiplyScalar(horizontalLength));
    currentPos.y += verticalChange;
    
    positions.push(currentPos.clone());
    directions.push(currentDirection.clone());
  });
  
  // For circuit tracks, close the loop by adjusting positions
  if (track.laps > 1 && positions.length > 1) {
    // Calculate the gap between end and start
    const endPos = positions[positions.length - 1];
    const startPos = positions[0];
    const gap = new THREE.Vector3().subVectors(startPos, endPos);
    
    // Distribute the gap correction across all segments proportionally
    // This preserves the relative shape while ensuring closure
    for (let i = 1; i < positions.length; i++) {
      const progress = i / (positions.length - 1);
      // Apply a smooth correction that gradually closes the gap
      const correction = gap.clone().multiplyScalar(progress);
      positions[i].add(correction);
    }
    
    // Ensure perfect closure - last position must equal first for proper tangent calculation
    positions[positions.length - 1].copy(startPos);
  }
  
  // Create smooth curves between positions using Catmull-Rom spline
  const curve = new THREE.CatmullRomCurve3(positions, track.laps > 1, 'catmullrom', 0.3);
  const curvePoints = curve.getPoints(segments.length * 8); // 8 points per segment for smoothness
  
  // Map curve points back to segments with terrain info
  const pointsPerSegment = Math.floor(curvePoints.length / segments.length);
  
  // Group smooth segments by terrain for efficient rendering
  const segmentsByTerrain: Map<string, Array<{
    start: THREE.Vector3;
    end: THREE.Vector3;
    width: number;
  }>> = new Map();
  
  segments.forEach((segment, segIdx) => {
    const terrainKey = segment.terrain;
    if (!segmentsByTerrain.has(terrainKey)) {
      segmentsByTerrain.set(terrainKey, []);
    }
    
    // Get smooth points for this segment
    const startIdx = segIdx * pointsPerSegment;
    const endIdx = segIdx === segments.length - 1 ? curvePoints.length - 1 : (segIdx + 1) * pointsPerSegment;
    
    // Create mini-segments between smooth points
    for (let i = startIdx; i < endIdx; i++) {
      segmentsByTerrain.get(terrainKey)!.push({
        start: curvePoints[i],
        end: curvePoints[i + 1] || curvePoints[0],
        width: TRACK_WIDTH * SCALE,
      });
    }
  });
  
  // Create meshes for each terrain type
  segmentsByTerrain.forEach((segments, terrain) => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    
    let vertexOffset = 0;
    
    segments.forEach((seg) => {
      // Calculate perpendicular direction for track width
      const forward = new THREE.Vector3()
        .subVectors(seg.end, seg.start)
        .normalize();
      const right = new THREE.Vector3()
        .crossVectors(forward, new THREE.Vector3(0, 1, 0))
        .normalize()
        .multiplyScalar(seg.width / 2);
      
      // Create quad for this segment
      const v1 = seg.start.clone().sub(right); // Bottom left
      const v2 = seg.start.clone().add(right); // Bottom right
      const v3 = seg.end.clone().add(right);   // Top right
      const v4 = seg.end.clone().sub(right);   // Top left
      
      // Add vertices
      vertices.push(v1.x, v1.y, v1.z);
      vertices.push(v2.x, v2.y, v2.z);
      vertices.push(v3.x, v3.y, v3.z);
      vertices.push(v4.x, v4.y, v4.z);
      
      // Add normals (pointing up)
      for (let i = 0; i < 4; i++) {
        normals.push(0, 1, 0);
      }
      
      // Add indices for two triangles
      indices.push(
        vertexOffset, vertexOffset + 1, vertexOffset + 2,
        vertexOffset, vertexOffset + 2, vertexOffset + 3
      );
      
      vertexOffset += 4;
    });
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    const material = createTerrainMaterial(terrain as any);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    trackGroup.add(mesh);
  });
  
  return trackGroup;
}

/**
 * Get position on track at a given distance along the path
 * Used for bot positioning
 */
export function getPositionAtDistance(
  track: TrackTemplate,
  distance: number
): { position: THREE.Vector3; direction: THREE.Vector3 } {
  const SCALE = 0.1;
  
  // Build full segment list
  const allSegments: TrackSegment[] = [];
  for (let lap = 0; lap < track.laps; lap++) {
    allSegments.push(...track.segments);
  }
  
  let currentPos = new THREE.Vector3(0, 0, 0);
  let currentDirection = new THREE.Vector3(0, 0, 1);
  let distanceAccumulated = 0;
  
  for (let index = 0; index < allSegments.length; index++) {
    const segment = allSegments[index];
    const segmentLength = segment.length;
    
    if (distanceAccumulated + segmentLength >= distance) {
      // Target is within this segment
      const segmentProgress = (distance - distanceAccumulated) / segmentLength;
      
      const segmentLengthScaled = segmentLength * SCALE;
      const angleRad = (segment.angle * Math.PI) / 180;
      const horizontalLength = segmentLengthScaled * Math.cos(angleRad);
      const verticalChange = segmentLengthScaled * Math.sin(angleRad);
      
      const endPos = currentPos.clone().add(
        currentDirection.clone().multiplyScalar(horizontalLength)
      );
      endPos.y += verticalChange;
      
      // Interpolate position
      const position = currentPos.clone().lerp(endPos, segmentProgress);
      
      return { position, direction: currentDirection.clone() };
    }
    
    // Move to next segment
    distanceAccumulated += segmentLength;
    
    const segmentLengthScaled = segment.length * SCALE;
    const angleRad = (segment.angle * Math.PI) / 180;
    const horizontalLength = segmentLengthScaled * Math.cos(angleRad);
    const verticalChange = segmentLengthScaled * Math.sin(angleRad);
    
    currentPos.add(currentDirection.clone().multiplyScalar(horizontalLength));
    currentPos.y += verticalChange;
    
    if (index % 3 === 0 && index > 0) {
      const rotationAngle = Math.sin(index * 0.5) * 0.1;
      currentDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationAngle);
    }
  }
  
  // If distance exceeds track, return finish line
  return { position: currentPos, direction: currentDirection };
}
