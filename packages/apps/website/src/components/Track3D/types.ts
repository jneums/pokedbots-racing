// Track3D types
export type Terrain = 'ScrapHeaps' | 'WastelandSand' | 'MetalRoads';

export interface TrackSegment {
  length: number; // meters
  angle: number; // -45 to 45 degrees
  terrain: Terrain;
  difficulty: number; // 0.8-1.2 multiplier
}

export interface TrackTemplate {
  trackId: number;
  name: string;
  description: string;
  totalDistance: number; // meters
  primaryTerrain: Terrain;
  laps: number;
  segments: TrackSegment[];
}

export interface BotPosition {
  nftId: string;
  position: [number, number, number]; // x, y, z
  rotation: [number, number, number]; // euler angles
  color: string;
  faction: string;
  label: string;
  currentTime: number;
}

export type CameraMode = 'orbit' | 'follow' | 'cinematic' | 'overview';
