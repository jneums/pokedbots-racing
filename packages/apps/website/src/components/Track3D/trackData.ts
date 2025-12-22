import { TrackTemplate, TrackSegment, Terrain } from './types';

// Map backend terrain types to frontend types
function mapTerrain(backendTerrain: any): Terrain {
  if (typeof backendTerrain === 'object' && backendTerrain !== null) {
    if ('ScrapHeaps' in backendTerrain) return 'ScrapHeaps';
    if ('WastelandSand' in backendTerrain) return 'WastelandSand';
    if ('MetalRoads' in backendTerrain) return 'MetalRoads';
  }
  return 'MetalRoads'; // Default fallback
}

/**
 * Convert backend track data to Track3D format
 * Backend returns track info from candid types
 */
export function convertBackendTrackToTemplate(backendTrack: any): TrackTemplate {
  const segments: TrackSegment[] = backendTrack.segments.map((seg: any) => ({
    length: Number(seg.length),
    angle: Number(seg.angle),
    terrain: mapTerrain(seg.terrain),
    difficulty: Number(seg.difficulty),
  }));

  return {
    trackId: Number(backendTrack.trackId),
    name: backendTrack.name,
    description: backendTrack.description,
    totalDistance: Number(backendTrack.totalDistance),
    primaryTerrain: mapTerrain(backendTrack.primaryTerrain),
    laps: Number(backendTrack.laps),
    segments,
  };
}

/**
 * Hardcoded track templates matching backend RacingSimulator.mo
 * Use these when backend track data isn't available
 */
export const TRACK_TEMPLATES: Record<number, TrackTemplate> = {
  1: {
    trackId: 1,
    name: 'Scrap Mountain Circuit',
    description: 'Technical climb through unstable debris',
    totalDistance: 10100,
    primaryTerrain: 'ScrapHeaps',
    laps: 2,
    segments: [
      { length: 500, angle: 5, terrain: 'ScrapHeaps', difficulty: 1.0 },
      { length: 400, angle: 12, terrain: 'ScrapHeaps', difficulty: 1.1 },
      { length: 300, angle: 18, terrain: 'ScrapHeaps', difficulty: 1.15 },
      { length: 350, angle: -8, terrain: 'ScrapHeaps', difficulty: 1.05 },
      { length: 250, angle: 0, terrain: 'ScrapHeaps', difficulty: 1.2 },
      { length: 400, angle: 15, terrain: 'ScrapHeaps', difficulty: 1.12 },
      { length: 300, angle: -5, terrain: 'ScrapHeaps', difficulty: 1.08 },
      { length: 200, angle: 0, terrain: 'ScrapHeaps', difficulty: 1.15 },
      { length: 350, angle: 8, terrain: 'ScrapHeaps', difficulty: 1.1 },
      { length: 450, angle: 22, terrain: 'ScrapHeaps', difficulty: 1.25 },
      { length: 500, angle: -12, terrain: 'ScrapHeaps', difficulty: 1.0 },
      { length: 400, angle: -18, terrain: 'ScrapHeaps', difficulty: 0.95 },
      { length: 350, angle: -15, terrain: 'ScrapHeaps', difficulty: 1.0 },
      { length: 300, angle: -7, terrain: 'ScrapHeaps', difficulty: 1.1 },
      { length: 250, angle: -15, terrain: 'ScrapHeaps', difficulty: 1.05 },
    ],
  },
  2: {
    trackId: 2,
    name: 'Highway of the Dead',
    description: 'Rusted highways with occasional debris obstacles',
    totalDistance: 6700,
    primaryTerrain: 'MetalRoads',
    laps: 1,
    segments: [
      { length: 800, angle: 0, terrain: 'MetalRoads', difficulty: 0.85 },
      { length: 700, angle: 0, terrain: 'MetalRoads', difficulty: 0.9 },
      { length: 600, angle: -3, terrain: 'MetalRoads', difficulty: 0.82 },
      { length: 500, angle: -5, terrain: 'MetalRoads', difficulty: 0.8 },
      { length: 400, angle: 3, terrain: 'ScrapHeaps', difficulty: 1.15 },
      { length: 500, angle: 5, terrain: 'ScrapHeaps', difficulty: 1.2 },
      { length: 600, angle: 0, terrain: 'MetalRoads', difficulty: 0.88 },
      { length: 700, angle: 0, terrain: 'MetalRoads', difficulty: 0.9 },
      { length: 500, angle: 0, terrain: 'MetalRoads', difficulty: 0.92 },
      { length: 450, angle: 0, terrain: 'MetalRoads', difficulty: 0.95 },
      { length: 550, angle: 0, terrain: 'MetalRoads', difficulty: 0.85 },
      { length: 400, angle: 0, terrain: 'MetalRoads', difficulty: 0.9 },
    ],
  },
  3: {
    trackId: 3,
    name: 'Wasteland Gauntlet',
    description: 'Endurance test through deep sand',
    totalDistance: 13300,
    primaryTerrain: 'WastelandSand',
    laps: 1,
    segments: [
      { length: 1000, angle: 0, terrain: 'WastelandSand', difficulty: 1.1 },
      { length: 800, angle: 3, terrain: 'WastelandSand', difficulty: 1.15 },
      { length: 700, angle: 8, terrain: 'WastelandSand', difficulty: 1.22 },
      { length: 900, angle: 12, terrain: 'WastelandSand', difficulty: 1.25 },
      { length: 600, angle: -5, terrain: 'WastelandSand', difficulty: 1.12 },
      { length: 800, angle: 0, terrain: 'WastelandSand', difficulty: 1.18 },
      { length: 700, angle: 0, terrain: 'WastelandSand', difficulty: 1.15 },
      { length: 650, angle: -4, terrain: 'WastelandSand', difficulty: 1.08 },
      { length: 750, angle: -8, terrain: 'WastelandSand', difficulty: 1.05 },
      { length: 900, angle: 0, terrain: 'WastelandSand', difficulty: 1.2 },
      { length: 800, angle: 5, terrain: 'WastelandSand', difficulty: 1.22 },
      { length: 700, angle: 8, terrain: 'WastelandSand', difficulty: 1.25 },
      { length: 600, angle: -10, terrain: 'WastelandSand', difficulty: 1.1 },
      { length: 500, angle: -5, terrain: 'WastelandSand', difficulty: 1.08 },
      { length: 900, angle: 0, terrain: 'WastelandSand', difficulty: 1.12 },
      { length: 700, angle: 0, terrain: 'WastelandSand', difficulty: 1.1 },
      { length: 600, angle: -4, terrain: 'WastelandSand', difficulty: 1.05 },
    ],
  },
  4: {
    trackId: 4,
    name: 'Junkyard Sprint',
    description: 'Short aggressive circuit',
    totalDistance: 4050,
    primaryTerrain: 'ScrapHeaps',
    laps: 3,
    segments: [
      { length: 200, angle: 0, terrain: 'ScrapHeaps', difficulty: 1.05 },
      { length: 150, angle: 5, terrain: 'ScrapHeaps', difficulty: 1.1 },
      { length: 180, angle: 8, terrain: 'ScrapHeaps', difficulty: 1.15 },
      { length: 160, angle: 12, terrain: 'ScrapHeaps', difficulty: 1.2 },
      { length: 140, angle: -6, terrain: 'ScrapHeaps', difficulty: 1.12 },
      { length: 170, angle: -10, terrain: 'ScrapHeaps', difficulty: 1.08 },
      { length: 150, angle: -5, terrain: 'ScrapHeaps', difficulty: 1.1 },
      { length: 180, angle: 0, terrain: 'ScrapHeaps', difficulty: 1.15 },
      { length: 160, angle: -4, terrain: 'ScrapHeaps', difficulty: 1.05 },
    ],
  },
  5: {
    trackId: 5,
    name: 'Metal Mesa Loop',
    description: 'Mixed terrain balanced circuit',
    totalDistance: 7400,
    primaryTerrain: 'MetalRoads',
    laps: 2,
    segments: [
      { length: 400, angle: 0, terrain: 'MetalRoads', difficulty: 0.92 },
      { length: 350, angle: 0, terrain: 'MetalRoads', difficulty: 0.95 },
      { length: 300, angle: 3, terrain: 'MetalRoads', difficulty: 0.98 },
      { length: 250, angle: 8, terrain: 'ScrapHeaps', difficulty: 1.12 },
      { length: 300, angle: 12, terrain: 'ScrapHeaps', difficulty: 1.18 },
      { length: 250, angle: 15, terrain: 'ScrapHeaps', difficulty: 1.22 },
      { length: 300, angle: -8, terrain: 'MetalRoads', difficulty: 0.88 },
      { length: 350, angle: -10, terrain: 'MetalRoads', difficulty: 0.85 },
      { length: 400, angle: -5, terrain: 'WastelandSand', difficulty: 1.08 },
      { length: 350, angle: 0, terrain: 'WastelandSand', difficulty: 1.12 },
      { length: 300, angle: 0, terrain: 'WastelandSand', difficulty: 1.1 },
      { length: 250, angle: -15, terrain: 'WastelandSand', difficulty: 1.05 },
    ],
  },
};

/**
 * Get track template by ID
 */
export function getTrackTemplate(trackId: number): TrackTemplate | null {
  return TRACK_TEMPLATES[trackId] || null;
}
