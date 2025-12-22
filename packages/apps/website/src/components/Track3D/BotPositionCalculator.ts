import { Vector3, CatmullRomCurve3 } from 'three';
import { TrackTemplate } from './types';

/**
 * Calculate 3D position of a bot on the track based on race progress
 */
export interface BotPosition {
  position: [number, number, number];
  rotation: [number, number, number];
  segmentIndex: number;
  progress: number; // 0-1 within current segment
}

/**
 * Given track segments and total distance traveled, calculate bot's 3D position
 */
export function calculateBotPosition(
  track: TrackTemplate,
  distanceTraveled: number, // in meters
  trackPositions: Vector3[] // Pre-calculated positions from TrackGeometry
): BotPosition {
  const segments = track.segments;
  
  // Calculate distance per lap (one complete loop of segments)
  const lapDistance = segments.reduce((sum, seg) => sum + seg.length, 0);
  
  // For multi-lap tracks, wrap distance to current lap position
  const normalizedDistance = track.laps > 1 ? distanceTraveled % lapDistance : distanceTraveled;
  
  // Create smooth curve from waypoints
  const curve = new CatmullRomCurve3(trackPositions, track.laps > 1, 'catmullrom', 0.3);
  
  // Get position along the curve based on distance
  // Convert distance to a 0-1 parameter along the curve
  const t = Math.min(1, Math.max(0, normalizedDistance / lapDistance));
  const position = curve.getPointAt(t);
  
  // Get tangent for rotation
  const tangent = curve.getTangentAt(t);
  const angle = Math.atan2(tangent.x, tangent.z);
  
  // Find which segment we're in for segment index
  let cumulativeDistance = 0;
  let segmentIndex = 0;
  let progressInSegment = 0;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentStart = cumulativeDistance;
    const segmentEnd = cumulativeDistance + segment.length;
    
    if (normalizedDistance >= segmentStart && normalizedDistance <= segmentEnd) {
      segmentIndex = i;
      progressInSegment = (normalizedDistance - segmentStart) / segment.length;
      break;
    }
    
    cumulativeDistance += segment.length;
  }
  
  return {
    position: [position.x, position.y, position.z],
    rotation: [0, angle, 0],
    segmentIndex,
    progress: progressInSegment,
  };
}

/**
 * Calculate distance traveled based on race time and segment times
 */
export function calculateDistanceFromTime(
  currentTime: number, // in milliseconds
  segmentTimes: number[], // time to complete each segment in ms
  segments: { length: number }[]
): number {
  let elapsedTime = 0;
  let distance = 0;
  
  for (let i = 0; i < segmentTimes.length; i++) {
    const segmentDuration = segmentTimes[i];
    
    if (currentTime <= elapsedTime + segmentDuration) {
      // Bot is in this segment
      const timeInSegment = currentTime - elapsedTime;
      const progress = timeInSegment / segmentDuration;
      distance += segments[i].length * progress;
      break;
    }
    
    elapsedTime += segmentDuration;
    distance += segments[i].length;
  }
  
  return distance;
}
