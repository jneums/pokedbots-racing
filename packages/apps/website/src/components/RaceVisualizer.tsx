import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, FastForward, SkipForward, Radio, PlayCircle, Zap, Trophy, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';

// Race event types matching backend
type RaceEventType = 
  | { Overtake: { overtaker: string; overtaken: string } }
  | { LeadChange: { newLeader: string; previousLeader: string } }
  | { LargeGap: { leader: string; gapSeconds: number } }
  | { CloseRacing: { bots: string[]; gapSeconds: number } }
  | { ExceptionalPerformance: { bot: string; performancePct: number } }
  | { PoorPerformance: { bot: string; performancePct: number } }
  | { SegmentComplete: { segmentIndex: bigint; leader: string } };

interface RaceEvent {
  eventType: RaceEventType;
  timestamp: number; // Elapsed race time in seconds
  segmentIndex: bigint;
  description: string;
}

interface RaceResult {
  nftId: string;
  finalTime: number;
  position: number;
  rating?: number;
  faction?: string;
  preferredTerrain?: string;
  stats?: {
    speed: number;
    stability: number;
    powerCore: number;
    acceleration: number;
  };
}

interface RaceVisualizerProps {
  results: RaceResult[];
  trackSeed: bigint;
  trackId: number;
  distance: number;
  terrain: any;
  botOrder?: string[]; // Original order of bot IDs (for participant index calculation)
  isValidating?: boolean; // Whether backend validation is in progress
  raceStartTime?: bigint; // Race start time in nanoseconds (for live mode)
  raceStatus?: any; // Race status (InProgress, Completed, etc.)
  bonusesAlreadyApplied?: boolean; // If true, stats already include terrain/faction bonuses (from backend snapshot)
  startAtEnd?: boolean; // Start visualization at the end (for simulator mode)
  onRaceWatched?: () => void; // Callback when user watches race to completion
  events?: RaceEvent[]; // Race commentary events
}

// Helper to extract terrain from variant object or string
function getTerrainString(terrain: any): 'ScrapHeaps' | 'WastelandSand' | 'MetalRoads' {
  if (typeof terrain === 'string') return terrain as any;
  if (typeof terrain === 'object' && terrain !== null) {
    if ('ScrapHeaps' in terrain) return 'ScrapHeaps';
    if ('WastelandSand' in terrain) return 'WastelandSand';
    if ('MetalRoads' in terrain) return 'MetalRoads';
  }
  return 'ScrapHeaps';
}

interface BotPosition {
  nftId: string;
  distance: number; // Current distance covered in meters
  progress: number; // Percentage of race completed (0-100)
  finalTime: number; // Frontend-calculated time
  backendFinalTime?: number; // Backend time for validation comparison
  position: number;
  currentSegment: number;
  currentSpeed: number; // Current speed in m/s
}

interface TrackSegment {
  length: number;
  terrain: 'ScrapHeaps' | 'WastelandSand' | 'MetalRoads';
  angle: number;
  difficulty: number;
}

interface SegmentTime {
  segmentIndex: number;
  time: number;
  cumulativeTime: number;
  distance: number;
  cumulativeDistance: number;
}

const TRACK_NAMES = [
  "Default Track",
  "Scrap Mountain Circuit",
  "Highway of the Dead",
  "Wasteland Gauntlet",
  "Junkyard Sprint",
  "Metal Mesa Loop",
  "Dune Runner",
  "Rust Belt Rally",
  "Debris Field Dash",
  "Velocity Viaduct",
  "Sandstorm Circuit"
];

// Track definitions matching backend RacingSimulator.mo
const TRACK_TEMPLATES: Record<number, { segments: TrackSegment[]; laps: number }> = {
  0: { // Default/Unknown - add some elevation for visual interest
    segments: [
      { length: 2000, terrain: 'ScrapHeaps', angle: 10, difficulty: 1.0 },
      { length: 1500, terrain: 'WastelandSand', angle: -8, difficulty: 1.3 },
      { length: 2500, terrain: 'MetalRoads', angle: 5, difficulty: 1.5 },
      { length: 2000, terrain: 'WastelandSand', angle: -6, difficulty: 1.2 }
    ],
    laps: 2
  },
  1: { // Scrap Mountain Circuit - Technical climb with many elevation changes
    segments: [
      { length: 500, terrain: 'ScrapHeaps', angle: 5, difficulty: 1.0 },    // Approach
      { length: 400, terrain: 'ScrapHeaps', angle: 12, difficulty: 1.1 },   // Initial climb
      { length: 300, terrain: 'ScrapHeaps', angle: 18, difficulty: 1.15 },  // Steep section
      { length: 350, terrain: 'ScrapHeaps', angle: -8, difficulty: 1.05 },  // Quick descent
      { length: 250, terrain: 'ScrapHeaps', angle: 0, difficulty: 1.2 },    // Technical flat
      { length: 400, terrain: 'ScrapHeaps', angle: 15, difficulty: 1.12 },  // Mid climb
      { length: 300, terrain: 'ScrapHeaps', angle: -5, difficulty: 1.08 },  // Rolling section
      { length: 200, terrain: 'ScrapHeaps', angle: 0, difficulty: 1.15 },   // Tight corner
      { length: 350, terrain: 'ScrapHeaps', angle: 8, difficulty: 1.1 },    // Climb continuation
      { length: 450, terrain: 'ScrapHeaps', angle: 22, difficulty: 1.25 },  // Summit push
      { length: 500, terrain: 'ScrapHeaps', angle: -12, difficulty: 1.0 },  // Fast descent start
      { length: 400, terrain: 'ScrapHeaps', angle: -18, difficulty: 0.95 }, // Steep drop
      { length: 350, terrain: 'ScrapHeaps', angle: -15, difficulty: 1.0 },  // Continued descent
      { length: 300, terrain: 'ScrapHeaps', angle: -7, difficulty: 1.1 },   // Rolling down
      { length: 250, terrain: 'ScrapHeaps', angle: -15, difficulty: 1.05 }  // Final descent (angles sum to 0)
    ],
    laps: 2
  },
  2: { // Highway of the Dead - High-speed circuit with varied terrain
    segments: [
      { length: 800, terrain: 'MetalRoads', angle: 0, difficulty: 0.85 },    // Launch straight
      { length: 700, terrain: 'MetalRoads', angle: 0, difficulty: 0.9 },     // Speed section
      { length: 600, terrain: 'MetalRoads', angle: -3, difficulty: 0.82 },   // Gentle downhill
      { length: 500, terrain: 'MetalRoads', angle: -5, difficulty: 0.8 },    // Faster descent
      { length: 400, terrain: 'ScrapHeaps', angle: 3, difficulty: 1.15 },    // Rough patch climb
      { length: 500, terrain: 'ScrapHeaps', angle: 5, difficulty: 1.2 },     // Technical uphill
      { length: 600, terrain: 'MetalRoads', angle: 0, difficulty: 0.88 },    // Back to speed
      { length: 700, terrain: 'MetalRoads', angle: 0, difficulty: 0.9 },     // Long straight
      { length: 500, terrain: 'MetalRoads', angle: 0, difficulty: 0.92 },    // Technical curves
      { length: 450, terrain: 'MetalRoads', angle: 0, difficulty: 0.95 },    // Tight section
      { length: 550, terrain: 'MetalRoads', angle: 0, difficulty: 0.85 },    // Final straight
      { length: 400, terrain: 'MetalRoads', angle: 0, difficulty: 0.9 }      // Finish (angles sum to 0)
    ],
    laps: 1
  },
  3: { // Wasteland Gauntlet - Endurance test through deep sand
    segments: [
      { length: 1000, terrain: 'WastelandSand', angle: 0, difficulty: 1.1 },  // Deep sand entry
      { length: 800, terrain: 'WastelandSand', angle: 3, difficulty: 1.15 },  // Slight climb
      { length: 700, terrain: 'WastelandSand', angle: 8, difficulty: 1.22 },  // Dune climb
      { length: 900, terrain: 'WastelandSand', angle: 12, difficulty: 1.25 }, // Steep dune
      { length: 600, terrain: 'WastelandSand', angle: -5, difficulty: 1.12 }, // Dune descent
      { length: 800, terrain: 'WastelandSand', angle: 0, difficulty: 1.18 },  // Dune field
      { length: 700, terrain: 'WastelandSand', angle: 0, difficulty: 1.15 },  // Technical sand
      { length: 650, terrain: 'WastelandSand', angle: -4, difficulty: 1.08 }, // Rolling descent
      { length: 750, terrain: 'WastelandSand', angle: -8, difficulty: 1.05 }, // Fast section
      { length: 900, terrain: 'WastelandSand', angle: 0, difficulty: 1.2 },   // Final push
      { length: 800, terrain: 'WastelandSand', angle: 5, difficulty: 1.22 },  // Last climb
      { length: 700, terrain: 'WastelandSand', angle: 8, difficulty: 1.25 },  // Summit
      { length: 600, terrain: 'WastelandSand', angle: -10, difficulty: 1.1 }, // Quick drop
      { length: 500, terrain: 'WastelandSand', angle: -5, difficulty: 1.08 }, // Descent continues
      { length: 900, terrain: 'WastelandSand', angle: 0, difficulty: 1.12 },  // Sand flat
      { length: 700, terrain: 'WastelandSand', angle: 0, difficulty: 1.1 },   // Final stretch
      { length: 600, terrain: 'WastelandSand', angle: -4, difficulty: 1.05 }  // To finish (angles sum to 0)
    ],
    laps: 1
  },
  4: { // Junkyard Sprint - Short aggressive circuit
    segments: [
      { length: 200, terrain: 'ScrapHeaps', angle: 0, difficulty: 1.05 },  // Launch
      { length: 150, terrain: 'ScrapHeaps', angle: 5, difficulty: 1.1 },   // Quick rise
      { length: 180, terrain: 'ScrapHeaps', angle: 8, difficulty: 1.15 },  // Climb
      { length: 160, terrain: 'ScrapHeaps', angle: 12, difficulty: 1.2 },  // Steep bit
      { length: 140, terrain: 'ScrapHeaps', angle: -6, difficulty: 1.12 }, // Drop start
      { length: 170, terrain: 'ScrapHeaps', angle: -10, difficulty: 1.08 },// Fast descent
      { length: 150, terrain: 'ScrapHeaps', angle: -5, difficulty: 1.1 },  // Roll out
      { length: 180, terrain: 'ScrapHeaps', angle: 0, difficulty: 1.15 },  // Technical
      { length: 160, terrain: 'ScrapHeaps', angle: -4, difficulty: 1.05 }  // To finish (angles sum to 0)
    ],
    laps: 3
  },
  5: { // Metal Mesa Loop - Mixed terrain balanced circuit
    segments: [
      { length: 400, terrain: 'MetalRoads', angle: 0, difficulty: 0.92 },     // Fast start
      { length: 350, terrain: 'MetalRoads', angle: 0, difficulty: 0.95 },     // Speed section
      { length: 300, terrain: 'MetalRoads', angle: 3, difficulty: 0.98 },     // Slight climb
      { length: 250, terrain: 'ScrapHeaps', angle: 8, difficulty: 1.12 },     // Junk climb
      { length: 300, terrain: 'ScrapHeaps', angle: 12, difficulty: 1.18 },    // Steep junk
      { length: 250, terrain: 'ScrapHeaps', angle: 15, difficulty: 1.22 },    // Summit push
      { length: 300, terrain: 'MetalRoads', angle: -8, difficulty: 0.88 },    // Fast descent
      { length: 350, terrain: 'MetalRoads', angle: -10, difficulty: 0.85 },   // Speed drop
      { length: 400, terrain: 'WastelandSand', angle: -5, difficulty: 1.08 }, // Sandy descent
      { length: 350, terrain: 'WastelandSand', angle: 0, difficulty: 1.12 },  // Sand flat
      { length: 300, terrain: 'WastelandSand', angle: 0, difficulty: 1.1 },   // Technical sand
      { length: 250, terrain: 'WastelandSand', angle: -15, difficulty: 1.05 } // Final descent (angles sum to 0)
    ],
    laps: 2
  },
  6: { // Dune Runner - Brutal marathon through endless dunes
    segments: [
      { length: 1200, terrain: 'WastelandSand', angle: 5, difficulty: 1.18 },
      { length: 1100, terrain: 'WastelandSand', angle: 8, difficulty: 1.22 },
      { length: 1000, terrain: 'WastelandSand', angle: 12, difficulty: 1.28 },
      { length: 1300, terrain: 'WastelandSand', angle: 15, difficulty: 1.32 },
      { length: 1200, terrain: 'WastelandSand', angle: 10, difficulty: 1.25 },
      { length: 1100, terrain: 'WastelandSand', angle: 0, difficulty: 1.2 },
      { length: 1000, terrain: 'WastelandSand', angle: -8, difficulty: 1.15 },
      { length: 900, terrain: 'WastelandSand', angle: -12, difficulty: 1.1 },
      { length: 1200, terrain: 'WastelandSand', angle: 0, difficulty: 1.22 },
      { length: 1100, terrain: 'WastelandSand', angle: 6, difficulty: 1.25 },
      { length: 1000, terrain: 'WastelandSand', angle: 10, difficulty: 1.28 },
      { length: 900, terrain: 'WastelandSand', angle: 8, difficulty: 1.2 },
      { length: 1300, terrain: 'WastelandSand', angle: 0, difficulty: 1.18 },
      { length: 1200, terrain: 'WastelandSand', angle: -15, difficulty: 1.12 },
      { length: 1000, terrain: 'WastelandSand', angle: -39, difficulty: 1.08 }
    ],
    laps: 1
  },
  7: { // Rust Belt Rally - High-speed highway blast
    segments: [
      { length: 900, terrain: 'MetalRoads', angle: 0, difficulty: 0.82 },
      { length: 850, terrain: 'MetalRoads', angle: -2, difficulty: 0.78 },
      { length: 800, terrain: 'MetalRoads', angle: 0, difficulty: 0.8 },
      { length: 750, terrain: 'MetalRoads', angle: 0, difficulty: 0.85 },
      { length: 700, terrain: 'MetalRoads', angle: -4, difficulty: 0.76 },
      { length: 650, terrain: 'MetalRoads', angle: 0, difficulty: 0.88 },
      { length: 600, terrain: 'MetalRoads', angle: 0, difficulty: 0.9 },
      { length: 550, terrain: 'MetalRoads', angle: 0, difficulty: 0.85 },
      { length: 900, terrain: 'MetalRoads', angle: 0, difficulty: 0.82 },
      { length: 850, terrain: 'MetalRoads', angle: 3, difficulty: 0.8 },
      { length: 800, terrain: 'MetalRoads', angle: 0, difficulty: 0.78 },
      { length: 850, terrain: 'MetalRoads', angle: 3, difficulty: 0.83 }
    ],
    laps: 1
  },
  8: { // Debris Field Dash - Treacherous obstacle course
    segments: [
      { length: 300, terrain: 'ScrapHeaps', angle: 8, difficulty: 1.22 },
      { length: 350, terrain: 'ScrapHeaps', angle: 12, difficulty: 1.28 },
      { length: 280, terrain: 'ScrapHeaps', angle: 18, difficulty: 1.35 },
      { length: 320, terrain: 'ScrapHeaps', angle: -10, difficulty: 1.18 },
      { length: 400, terrain: 'ScrapHeaps', angle: 0, difficulty: 1.25 },
      { length: 350, terrain: 'ScrapHeaps', angle: 15, difficulty: 1.3 },
      { length: 300, terrain: 'ScrapHeaps', angle: 20, difficulty: 1.38 },
      { length: 280, terrain: 'ScrapHeaps', angle: -15, difficulty: 1.2 },
      { length: 320, terrain: 'ScrapHeaps', angle: -8, difficulty: 1.15 },
      { length: 350, terrain: 'ScrapHeaps', angle: 0, difficulty: 1.28 },
      { length: 300, terrain: 'ScrapHeaps', angle: -40, difficulty: 1.25 }
    ],
    laps: 2
  },
  9: { // Velocity Viaduct - Lightning-fast elevated highway
    segments: [
      { length: 300, terrain: 'MetalRoads', angle: 0, difficulty: 0.8 },
      { length: 250, terrain: 'MetalRoads', angle: 0, difficulty: 0.78 },
      { length: 280, terrain: 'MetalRoads', angle: -5, difficulty: 0.75 },
      { length: 220, terrain: 'MetalRoads', angle: -8, difficulty: 0.72 },
      { length: 200, terrain: 'MetalRoads', angle: 5, difficulty: 0.85 },
      { length: 250, terrain: 'MetalRoads', angle: 8, difficulty: 0.82 }
    ],
    laps: 3
  },
  10: { // Sandstorm Circuit - Circular desert track
    segments: [
      { length: 600, terrain: 'WastelandSand', angle: 0, difficulty: 1.15 },
      { length: 550, terrain: 'WastelandSand', angle: 5, difficulty: 1.2 },
      { length: 500, terrain: 'WastelandSand', angle: 10, difficulty: 1.25 },
      { length: 450, terrain: 'WastelandSand', angle: 12, difficulty: 1.28 },
      { length: 500, terrain: 'WastelandSand', angle: 8, difficulty: 1.22 },
      { length: 550, terrain: 'WastelandSand', angle: 0, difficulty: 1.18 },
      { length: 600, terrain: 'WastelandSand', angle: -6, difficulty: 1.12 },
      { length: 550, terrain: 'WastelandSand', angle: -10, difficulty: 1.08 },
      { length: 500, terrain: 'WastelandSand', angle: -8, difficulty: 1.1 },
      { length: 600, terrain: 'WastelandSand', angle: -11, difficulty: 1.15 }
    ],
    laps: 2
  }
};

// Apply faction bonuses to stats - matches backend PokedBotsGarage.mo
function applyFactionBonuses(
  stats: { speed: number; powerCore: number; acceleration: number; stability: number },
  faction: string | undefined,
  terrain: string,
  preferredTerrain: string | undefined,
  condition: number = 100
): { speed: number; powerCore: number; acceleration: number; stability: number } {
  let speed = stats.speed;
  let powerCore = stats.powerCore;
  let acceleration = stats.acceleration;
  let stability = stats.stability;
  
  // Apply faction bonuses (matches backend)
  switch (faction) {
    // Ultra-Rare Factions
    case 'UltimateMaster':
      speed = Math.floor(speed * 1.15);
      powerCore = Math.floor(powerCore * 1.15);
      acceleration = Math.floor(acceleration * 1.15);
      stability = Math.floor(stability * 1.15);
      break;
    case 'Wild':
      acceleration = Math.floor(acceleration * 1.20);
      stability = Math.floor(stability * 0.90);
      break;
    case 'Golden':
      if (condition >= 90) {
        speed = Math.floor(speed * 1.15);
        powerCore = Math.floor(powerCore * 1.15);
        acceleration = Math.floor(acceleration * 1.15);
        stability = Math.floor(stability * 1.15);
      }
      break;
    case 'Ultimate':
      speed = Math.floor(speed * 1.12);
      acceleration = Math.floor(acceleration * 1.12);
      break;
    
    // Super-Rare Factions
    case 'Blackhole':
      if (terrain === 'MetalRoads') {
        speed = Math.floor(speed * 1.12);
        powerCore = Math.floor(powerCore * 1.12);
        acceleration = Math.floor(acceleration * 1.12);
        stability = Math.floor(stability * 1.12);
      }
      break;
    case 'Dead':
      powerCore = Math.floor(powerCore * 1.10);
      stability = Math.floor(stability * 1.08);
      break;
    case 'Master':
      speed = Math.floor(speed * 1.12);
      powerCore = Math.floor(powerCore * 1.08);
      break;
    
    // Rare Factions
    case 'Bee':
      acceleration = Math.floor(acceleration * 1.10);
      break;
    case 'Box':
      if (terrain === 'ScrapHeaps') {
        speed = Math.floor(speed * 1.10);
        powerCore = Math.floor(powerCore * 1.10);
        acceleration = Math.floor(acceleration * 1.10);
        stability = Math.floor(stability * 1.10);
      }
      break;
    case 'Murder':
      speed = Math.floor(speed * 1.08);
      acceleration = Math.floor(acceleration * 1.08);
      break;
    
    // Common Factions
    case 'Game':
      if (terrain === 'WastelandSand') {
        speed = Math.floor(speed * 1.08);
        powerCore = Math.floor(powerCore * 1.08);
        acceleration = Math.floor(acceleration * 1.08);
        stability = Math.floor(stability * 1.08);
      }
      break;
    case 'Animal':
      speed = Math.floor(speed * 1.06);
      powerCore = Math.floor(powerCore * 1.06);
      acceleration = Math.floor(acceleration * 1.06);
      stability = Math.floor(stability * 1.06);
      break;
    case 'Industrial':
      powerCore = Math.floor(powerCore * 1.05);
      stability = Math.floor(stability * 1.05);
      break;
  }
  
  let boosted = {
    speed: Math.min(100, speed),
    powerCore: Math.min(100, powerCore),
    acceleration: Math.min(100, acceleration),
    stability: Math.min(100, stability),
  };
  
  // Apply preferred terrain bonus (+10% if racing on preferred terrain)
  if (preferredTerrain === terrain) {
    return {
      speed: Math.min(100, Math.floor(boosted.speed * 1.10)),
      powerCore: Math.min(100, Math.floor(boosted.powerCore * 1.10)),
      acceleration: Math.min(100, Math.floor(boosted.acceleration * 1.10)),
      stability: Math.min(100, Math.floor(boosted.stability * 1.10)),
    };
  }
  
  return boosted;
}

// Replicate backend segment time calculation
function calculateSegmentTimeEstimate(
  segment: TrackSegment, 
  seed: bigint,
  stats: { speed: number; stability: number; powerCore: number; acceleration: number },
  previousDifficulty: number = 1.0 // Difficulty of previous segment
): number {
  const avgSpeed = stats.speed;
  const avgStability = stats.stability;
  const avgPowerCore = stats.powerCore;
  const avgAccel = stats.acceleration;
  
  const segmentLength = segment.length;
  
  // Base speed calculation - use square root to reduce speed dominance
  const baseSpeed = Math.sqrt(avgSpeed) * 7.5;
  
  // Terrain modifier - MATCH BACKEND EXACTLY
  let terrainMod = 1.0;
  if (segment.terrain === 'ScrapHeaps') {
    terrainMod = 1.0 + ((100 - avgStability) / 150.0); // Stability critical (up to +67%)
  } else if (segment.terrain === 'WastelandSand') {
    terrainMod = 1.0 + ((100 - avgPowerCore) / 200.0); // Endurance critical (up to +50%)
  } else if (segment.terrain === 'MetalRoads') {
    terrainMod = 1.0 + ((100 - avgAccel) / 160.0); // Acceleration helps (up to +62%)
  }
  
  // Angle modifier - match backend segment calculation
  let angleMod = 1.0;
  if (segment.angle > 0) {
    // Uphill - powerCore matters more
    angleMod = 1.0 + (segment.angle * (100.0 - avgPowerCore) / 3000.0);
  }
  // Downhill/flat - no bonus (speed already in base speed)
  
  // Momentum system: acceleration affects speed buildup after difficult sections
  const momentumLoss = previousDifficulty > 1.0 
    ? (previousDifficulty - 1.0) * 0.15 // Up to 15% slower per 1.0 difficulty
    : 0.0;
  
  // Acceleration determines recovery: high accel = faster recovery  
  const accelerationRecovery = avgAccel / 140.0; // 0.0 to 0.71 (71% recovery at 100 accel)
  const momentumMod = 1.0 + (momentumLoss * (1.0 - accelerationRecovery));
  
  // Difficulty from track - scales with stability for technical sections
  const difficultyMod = segment.difficulty > 1.0
    ? segment.difficulty * (1.0 + ((100 - avgStability) / 300.0)) // Technical sections penalize low stability
    : segment.difficulty; // Fast sections don't penalize as much
  
  // Randomness - match backend (±10% per segment)
  const segmentSeed = Number(seed % 1000n);
  const randomMod = 0.90 + (segmentSeed / 5000.0); // 0.90 to 1.10
  
  // Calculate time - match backend formula with momentum
  const effectiveSpeed = baseSpeed / (terrainMod * angleMod * difficultyMod * momentumMod);
  const segmentTime = (segmentLength / effectiveSpeed) * randomMod;
  
  // Apply 10x speed multiplier to match backend
  return Math.max(0.1, segmentTime / 10.0);
}

// Calculate segment-by-segment times for a bot
function calculateBotSegmentTimes(
  trackId: number, 
  trackSeed: bigint, 
  participantIndex: number,
  stats?: { speed: number; stability: number; powerCore: number; acceleration: number },
  actualFinalTime?: number | null,
  faction?: string,
  preferredTerrain?: string,
  terrain?: string,
  nftId?: string,
  bonusesAlreadyApplied?: boolean
): SegmentTime[] {
  const track = TRACK_TEMPLATES[trackId];
  if (!track) return [];
  
  // Require valid stats - if undefined/invalid, return empty to prevent NaN
  if (!stats || typeof stats.speed !== 'number' || isNaN(stats.speed)) {
    console.warn('calculateBotSegmentTimes: Invalid stats for bot', nftId, stats);
    return [];
  }
  
  const rawStats = stats;
  
  // Apply faction + preferred terrain bonuses (only if not already applied by backend)
  const terrainType = terrain || getTerrainString(track.segments[0]?.terrain);
  const botStats = bonusesAlreadyApplied ? rawStats : applyFactionBonuses(rawStats, faction, terrainType, preferredTerrain);
  
  const segmentTimes: SegmentTime[] = [];
  let cumulativeTime = 0;
  let cumulativeDistance = 0;
  let previousDifficulty = 1.0; // Start with neutral difficulty
  
  // Generate all segments (base segments * laps)
  for (let lap = 0; lap < track.laps; lap++) {
    for (let segIdx = 0; segIdx < track.segments.length; segIdx++) {
      const segment = track.segments[segIdx];
      const globalSegmentIdx = lap * track.segments.length + segIdx;
      
      // Use same seed calculation as backend
      // Use trackSeed as bigint for precision
      const seedBase = typeof trackSeed === 'bigint' ? trackSeed : BigInt(trackSeed);
      const seed = seedBase + BigInt(participantIndex * 1000 + globalSegmentIdx);
      
      // Per-segment performance variation (driver errors, debris, wind, etc.)
      // Each bot experiences different micro-conditions on each segment
      const segmentConditionSeed = Number((seed * 31337n + BigInt(participantIndex * 7919) + BigInt(lap * 12345)) % 1000n);
      const segmentPerformance = 0.94 + (segmentConditionSeed / 1666.67); // 0.94 to 1.06 (±6%)
      
      const time = calculateSegmentTimeEstimate(segment, seed, botStats, previousDifficulty) * segmentPerformance;
      
      cumulativeTime += time;
      cumulativeDistance += segment.length;
      
      segmentTimes.push({
        segmentIndex: globalSegmentIdx,
        time,
        cumulativeTime,
        distance: segment.length,
        cumulativeDistance
      });
      
      // Update previous difficulty for next segment
      previousDifficulty = segment.difficulty;
    }
  }
  
  // Don't scale - use the calculated times directly
  // This ensures bot stats actually determine race outcomes
  
  return segmentTimes;
}

// Simulate segment-based progression using actual segment times
function simulateRaceProgression(
  results: RaceResult[],
  trackSeed: bigint,
  trackId: number,
  currentTime: number,
  segmentTimesMap: Map<string, SegmentTime[]>
): BotPosition[] {
  const positions = results.map((result, idx) => {
    const isDNF = result.finalTime !== null && result.finalTime > 100000;
    const isInProgress = result.finalTime === null; // Race not finished yet
    
    if (isDNF) {
      return {
        nftId: result.nftId,
        distance: 0,
        progress: 0,
        finalTime: result.finalTime,
        position: 0, // Will be calculated after sorting
        currentSegment: 0,
        currentSpeed: 0
      };
    }
    
    const segmentTimes = segmentTimesMap.get(result.nftId);
    // Use frontend-calculated time for simulation
    const frontendFinalTime = segmentTimes?.[segmentTimes.length - 1]?.cumulativeTime || 0;
    
    // For in-progress races, simulate as if race just started or use current time
    if (isInProgress) {
      // Simulate progression based on estimated times
      if (!segmentTimes || segmentTimes.length === 0) {
        return {
          nftId: result.nftId,
          distance: 0,
          progress: 0,
          finalTime: frontendFinalTime,
          position: 0,
          currentSegment: 0,
          currentSpeed: 0
        };
      }
      
      // For live races, let them race using the simulation
      // The currentTime will be based on elapsed time since race start
    }
    
    if (currentTime >= frontendFinalTime && !isInProgress) {
      // Race finished - use frontend calculated time
      const totalDistance = segmentTimes?.[segmentTimes.length - 1]?.cumulativeDistance || 0;
      
      return {
        nftId: result.nftId,
        distance: totalDistance,
        progress: 100,
        finalTime: frontendFinalTime, // Frontend-calculated time for visualization
        backendFinalTime: result.finalTime, // Backend time for validation
        position: 0, // Will be calculated after sorting
        currentSegment: segmentTimes?.length || 0,
        currentSpeed: 0
      };
    }
    
    // Find current segment based on time
    if (!segmentTimes || segmentTimes.length === 0) {
      // No stats available - can't simulate this bot
      console.warn('No segment times for bot', result.nftId, '- stats may be missing');
      return {
        nftId: result.nftId,
        distance: 0,
        progress: 0,
        finalTime: 0,
        backendFinalTime: result.finalTime, // Backend time for validation
        position: 0, // Will be calculated after sorting
        currentSegment: 0,
        currentSpeed: 0
      };
    }
    
    // Find which segment we're in based on current time
    let currentSegmentIdx = 0;
    let previousCumulativeTime = 0;
    let previousCumulativeDistance = 0;
    
    for (let i = 0; i < segmentTimes.length; i++) {
      if (currentTime <= segmentTimes[i].cumulativeTime) {
        currentSegmentIdx = i;
        break;
      }
      previousCumulativeTime = segmentTimes[i].cumulativeTime;
      previousCumulativeDistance = segmentTimes[i].cumulativeDistance;
    }
    
    // Interpolate within current segment
    const currentSegment = segmentTimes[currentSegmentIdx];
    const segmentProgress = currentSegment 
      ? (currentTime - previousCumulativeTime) / currentSegment.time
      : 0;
    
    const distanceInSegment = currentSegment ? currentSegment.distance * segmentProgress : 0;
    const totalDistanceCovered = previousCumulativeDistance + distanceInSegment;
    const totalDistance = segmentTimes[segmentTimes.length - 1].cumulativeDistance;
    const progress = (totalDistanceCovered / totalDistance) * 100;
    
    // Calculate current speed (m/s) based on current segment with micro-fluctuations
    let currentSpeed = currentSegment ? currentSegment.distance / currentSegment.time : 0;
    if (currentSpeed > 0) {
      // Add very subtle fluctuation based on position within segment
      // Moderate frequency and small amplitude for realistic variation
      const fluctuation = Math.sin(segmentProgress * Math.PI * 1.5 + currentSegmentIdx) * 0.02; // ±2% variation, 1.5x frequency
      currentSpeed = currentSpeed * (1 + fluctuation);
    }
    
    return {
      nftId: result.nftId,
      distance: totalDistanceCovered,
      progress: Math.max(0, progress),
      finalTime: frontendFinalTime, // Frontend-calculated time for simulation
      backendFinalTime: result.finalTime, // Store backend time for validation
      position: 0, // Will be calculated after sorting
      currentSegment: currentSegmentIdx,
      currentSpeed
    };
  });

  // Sort by progress to determine current positions
  // Sort by who's actually ahead right now
  const sorted = [...positions].sort((a, b) => {
    const aFinished = a.progress >= 99.9; // Close enough to finished
    const bFinished = b.progress >= 99.9;
    
    // If both finished, sort by final time (fastest wins - this is their permanent position)
    if (aFinished && bFinished) {
      return a.finalTime - b.finalTime;
    }
    // If only one finished, check if the unfinished one could still beat them
    if (aFinished && !bFinished) {
      // If currentTime < b.finalTime, b hasn't finished yet but will
      // Compare: has a already finished (currentTime >= a.finalTime) vs b's finalTime
      return a.finalTime - b.finalTime; // Use actual finish times
    }
    if (!aFinished && bFinished) {
      return a.finalTime - b.finalTime; // Use actual finish times
    }
    
    // Neither finished yet - sort by progress (who's ahead right now)
    return b.progress - a.progress;
  });
  
  // Assign live positions based on sort order
  sorted.forEach((bot, idx) => {
    bot.position = idx + 1;
  });

  // Return in original order
  return positions;
}

export function RaceVisualizer({ results, trackSeed, trackId, distance, terrain, botOrder, isValidating = false, raceStartTime, raceStatus, bonusesAlreadyApplied = false, startAtEnd = false, onRaceWatched, events = [] }: RaceVisualizerProps) {
  // Determine if race is currently in progress (live mode)
  // Race is live if status is InProgress
  const isLive = useMemo(() => {
    console.log('[RaceVisualizer] Status check:', {
      raceStatus,
      keys: raceStatus ? Object.keys(raceStatus) : [],
      hasInProgress: raceStatus && 'InProgress' in raceStatus,
      hasCompleted: raceStatus && 'Completed' in raceStatus,
      stringified: JSON.stringify(raceStatus),
    });
    
    // Check if status is InProgress (handle both string keys and object structure)
    if (!raceStatus) return false;
    
    // Check for string key variant
    if ('InProgress' in raceStatus) return true;
    
    // Check if race started within the last 15 minutes (grace period for recently completed races)
    if (raceStartTime) {
      const now = Date.now() * 1_000_000;
      const hasStarted = Number(raceStartTime) <= now;
      const withinGracePeriod = (now - Number(raceStartTime)) < (15 * 60 * 1_000_000_000); // Less than 15 minutes ago
      
      // Show live view if race started and is within 15 minutes, even if completed
      if (hasStarted && withinGracePeriod) {
        return true;
      }
    }
    
    return false;
  }, [raceStatus, raceStartTime, results]);
  
  // Track if user has watched this race (via localStorage)
  const raceKey = `race_watched_${trackSeed.toString()}`;
  const raceTimeKey = `race_time_${trackSeed.toString()}`;
  const hasWatchedBefore = useRef(typeof window !== 'undefined' && localStorage.getItem(raceKey) === 'true');
  
  // Load saved playback position from localStorage
  const savedTime = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    const saved = localStorage.getItem(raceTimeKey);
    return saved ? parseFloat(saved) : 0;
  }, [raceTimeKey]);
  
  // Autoplay if within live window and never watched before
  const shouldAutoplay = isLive && !hasWatchedBefore.current;
  
  const [isPlaying, setIsPlaying] = useState(shouldAutoplay);
  const [currentTime, setCurrentTime] = useState(savedTime); // Resume from saved position
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [liveMode, setLiveMode] = useState(isLive);
  const [animationCompleted, setAnimationCompleted] = useState(false); // Track if animation has finished
  const animationRef = useRef<number | undefined>(undefined);
  const lastFrameTimeRef = useRef<number>(0);
  const hasSetFinalPosition = useRef<boolean>(false);
  
  // Filter events that should be visible based on current time
  const visibleEvents = useMemo(() => {
    return events.filter(event => event.timestamp <= currentTime);
  }, [events, currentTime]);
  
  // Pre-calculate segment times for all bots (memoized)
  const segmentTimesMap = useMemo(() => {
    const map = new Map<string, SegmentTime[]>();
    
    results.forEach((result) => {
      // Use botOrder to find the correct participant index (matches backend)
      const participantIndex = botOrder ? botOrder.indexOf(result.nftId) : results.findIndex(r => r.nftId === result.nftId);
      
      const segmentTimes = calculateBotSegmentTimes(
        trackId, 
        trackSeed, 
        participantIndex, 
        result.stats, 
        result.finalTime,
        result.faction,
        result.preferredTerrain,
        getTerrainString(terrain),
        result.nftId,
        bonusesAlreadyApplied
      );
      map.set(result.nftId, segmentTimes);
    });
    return map;
  }, [results, trackId, trackSeed]);
  
  // Find the slowest finisher based on actual segment-calculated times
  const maxTime = useMemo(() => {
    let slowestTime = 0;
    segmentTimesMap.forEach((segmentTimes) => {
      const finalTime = segmentTimes[segmentTimes.length - 1]?.cumulativeTime || 0;
      if (finalTime > slowestTime) {
        slowestTime = finalTime;
      }
    });
    // Filter out null finalTime values (InProgress races)
    const validFinalTimes = results.filter(r => r.finalTime !== null && r.finalTime < 100000).map(r => r.finalTime);
    return slowestTime > 0 ? slowestTime : (validFinalTimes.length > 0 ? Math.max(...validFinalTimes) : 60);
  }, [segmentTimesMap, results]);
  
  // Calculate actual track distance from segments (more accurate than distance prop)
  const actualTrackDistance = useMemo(() => {
    const track = TRACK_TEMPLATES[trackId];
    if (!track) {
      return distance * 1000;
    }
    const dist = track.segments.reduce((sum, seg) => sum + seg.length, 0) * track.laps;
    return dist;
  }, [trackId, distance]);
  
  // Sort results by botOrder to maintain registration order for stable lanes
  const sortedResults = useMemo(() => {
    if (!botOrder) return results;
    return [...results].sort((a, b) => {
      const indexA = botOrder.indexOf(a.nftId);
      const indexB = botOrder.indexOf(b.nftId);
      return indexA - indexB;
    });
  }, [results, botOrder]);
  
  // Calculate current positions using segment-based simulation (memoized)
  const positions = useMemo(() => 
    simulateRaceProgression(sortedResults, trackSeed, trackId, currentTime, segmentTimesMap),
    [sortedResults, trackSeed, trackId, currentTime, segmentTimesMap]
  );
  
  // Use positions directly - they're already in registration order from sortedResults
  const stablePositions = positions;
  
  // For simulator mode with startAtEnd, set to final position on mount
  useEffect(() => {
    if (startAtEnd && maxTime > 0 && !hasSetFinalPosition.current) {
      setCurrentTime(maxTime);
      hasSetFinalPosition.current = true;
    }
  }, [maxTime, startAtEnd]);
  
  // Reset to end when trackSeed changes in simulator mode
  useEffect(() => {
    if (startAtEnd && maxTime > 0) {
      setCurrentTime(maxTime);
      setIsPlaying(false);
    }
  }, [trackSeed, startAtEnd, maxTime]);
  
  // Update live mode when race status changes
  useEffect(() => {
    const wasLive = liveMode;
    setLiveMode(isLive);
    
    // If transitioning from live to completed, DON'T jump to end
    // Let the animation play out naturally
    if (wasLive && !isLive) {
      // Just stop auto-playing, but don't skip to end
      // User can still watch the animation complete
      console.log('[RaceVisualizer] Race completed, but letting animation finish naturally');
    }
  }, [isLive, maxTime, raceStartTime, raceKey, onRaceWatched]);
  
  // Mark race as watched when user completes watching it
  useEffect(() => {
    if (currentTime >= maxTime && currentTime > 0) {
      setAnimationCompleted(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(raceKey, 'true');
        localStorage.removeItem(raceTimeKey); // Clear saved time when completed
        if (onRaceWatched) onRaceWatched();
      }
    }
  }, [currentTime, maxTime, raceKey, raceTimeKey, onRaceWatched]);
  
  // Save current playback position to localStorage (debounced)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentTime <= 0 || currentTime >= maxTime) return; // Don't save at start or end
    
    const timeoutId = setTimeout(() => {
      localStorage.setItem(raceTimeKey, currentTime.toString());
    }, 500); // Debounce by 500ms
    
    return () => clearTimeout(timeoutId);
  }, [currentTime, maxTime, raceTimeKey]);
  
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastFrameTimeRef.current = 0; // Reset so we start fresh on resume
      return;
    }
    
    let frameCount = 0;
    const targetFPS = 30; // Reduce from 60fps to 30fps for better performance
    const frameInterval = 1000 / targetFPS;
    
    const animate = (timestamp: number) => {
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - lastFrameTimeRef.current;
      
      // Skip frames to maintain target FPS
      if (elapsed < frameInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      lastFrameTimeRef.current = timestamp;
      
      setCurrentTime(prev => {
        const deltaTime = (frameInterval / 1000) * playbackSpeed; // Use fixed frame interval
        const newTime = prev + deltaTime;
        if (newTime >= maxTime) {
          setIsPlaying(false);
          // Trigger callback when race finishes
          if (onRaceWatched) {
            onRaceWatched();
          }
          return maxTime;
        }
        return newTime;
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, maxTime]);
  
  const handlePlayPause = () => {
    if (currentTime >= maxTime) {
      setCurrentTime(0);
      setAnimationCompleted(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(raceTimeKey); // Clear saved time on replay
      }
      lastFrameTimeRef.current = 0;
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setAnimationCompleted(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(raceTimeKey); // Clear saved time on reset
    }
    lastFrameTimeRef.current = 0;
  };
  
  const handleSpeedChange = () => {
    const speeds = [1, 2, 4, 8];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
  };

  const handleSkipToEnd = () => {
    setIsPlaying(false);
    setCurrentTime(maxTime);
    lastFrameTimeRef.current = 0;
  };
  
  const getTerrainIcon = (terrain: any): string => {
    const terrainStr = getTerrainString(terrain);
    if (terrainStr === 'ScrapHeaps') return '🏚️';
    if (terrainStr === 'WastelandSand') return '🏜️';
    if (terrainStr === 'MetalRoads') return '🛣️';
    return '🏁';
  };

  const trackName = TRACK_NAMES[trackId] || TRACK_NAMES[0];
  
  // Calculate validation: compare server times vs local calculated times
  const timeValidation = useMemo(() => {
    const validations = results.map(result => {
      const localBot = positions.find(p => p.nftId === result.nftId);
      // Skip if: DNF, no result yet (null finalTime), or no local bot data
      if (!localBot || result.finalTime === null || result.finalTime > 100000) return null;
      const serverTime = result.finalTime;
      const localTime = localBot.finalTime;
      const diff = Math.abs(serverTime - localTime);
      const percentDiff = (diff / serverTime) * 100;
      return { serverTime, localTime, diff, percentDiff, nftId: result.nftId };
    }).filter(Boolean);
    
    if (validations.length === 0) {
      return { allMatch: true, maxDiff: 0, avgDiff: 0, validations: [] };
    }
    
    const maxDiff = Math.max(...validations.map(v => v!.percentDiff));
    const avgDiff = validations.reduce((sum, v) => sum + v!.percentDiff, 0) / validations.length;
    const allMatch = maxDiff < 1.0; // Within 1% is considered a match
    
    return { allMatch, maxDiff, avgDiff, validations };
  }, [results, positions]);
  
  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-card/90 to-card/50 backdrop-blur">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex flex-wrap items-center gap-2">
            <span className="whitespace-nowrap">🏁 Race Visualizer</span>
            <span className="text-sm font-normal text-muted-foreground whitespace-nowrap">
              {getTerrainIcon(terrain)} {trackName} • {distance}km
            </span>
            {/* Validation indicator */}
            <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${
              isValidating
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                : timeValidation.allMatch 
                ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
            }`} title={`Server vs Local times: ${isValidating ? 'Validating...' : timeValidation.allMatch ? 'Match' : `Max diff: ${timeValidation.maxDiff.toFixed(1)}%`}`}>
              {isValidating ? '⏳ Validating...' : timeValidation.allMatch ? '✓ Verified' : `⚠ ${timeValidation.maxDiff.toFixed(1)}%`}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLive && (
              <Button
                onClick={() => setLiveMode(!liveMode)}
                variant={liveMode ? "default" : "outline"}
                size="sm"
                className="min-w-[4rem]"
                disabled={liveMode && !hasWatchedBefore.current}
                title={liveMode && !hasWatchedBefore.current ? "Watch the race first to enable manual controls" : undefined}
              >
                {liveMode ? '🔴 LIVE' : 'Go Live'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={currentTime === 0 || liveMode}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipToEnd}
              disabled={currentTime >= maxTime || liveMode}
              title="Skip to end"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSpeedChange}
              className="min-w-[4rem]"
              disabled={liveMode}
            >
              <FastForward className="w-4 h-4 mr-1" />
              {playbackSpeed}x
            </Button>
            <Button
              onClick={handlePlayPause}
              className="min-w-[5rem]"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  {currentTime >= maxTime ? 'Replay' : currentTime > 0 ? 'Resume' : 'Start'}
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Time progress slider */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{currentTime.toFixed(1)}s</span>
            <div className="flex items-center gap-2">
              {liveMode && <span className="text-xs text-green-500 font-semibold animate-pulse">● LIVE</span>}
              <span>{maxTime.toFixed(1)}s</span>
            </div>
          </div>
          <Slider
            value={[currentTime]}
            max={maxTime}
            step={0.1}
            onValueChange={(value) => {
              if (!liveMode) {
                setCurrentTime(value[0]);
                lastFrameTimeRef.current = 0;
              }
            }}
            className="cursor-pointer"
            disabled={liveMode}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {/* Clean elevation profile */}
        <div 
          className="relative w-full bg-card rounded-lg p-4 border border-border" 
          style={{ height: `${Math.max(250, 130 + results.length * 24)}px` }}
        >
          {/* Elevation profile SVG */}
          <svg className="w-full h-full absolute inset-0" viewBox="0 0 1000 200" preserveAspectRatio="none">
            {/* Generate elevation path based on track segments */}
            {(() => {
              const track = TRACK_TEMPLATES[trackId];
              if (!track) {
                // Fallback flat line (scaled to 95%)
                return (
                  <>
                    <line x1="0" y1="100" x2="950" y2="100" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
                  </>
                );
              }
              
              // Calculate cumulative distances and elevations
              let cumulativeDistance = 0;
              const rawPoints: { x: number; y: number }[] = [];
              const checkpoints: number[] = []; // Track segment boundaries
              const terrainSegments: Array<{ startX: number; endX: number; terrain: string }> = []; // Track terrain regions
              const lapMarkers: number[] = []; // Track lap start positions
              
              for (let lap = 0; lap < track.laps; lap++) {
                // Reset elevation at the start of each lap
                let currentElevation = 0; // Start at 0, baseline elevation
                
                // Mark the start of each lap (except the first)
                if (lap > 0) {
                  const lapStartX = (cumulativeDistance / actualTrackDistance) * 950;
                  lapMarkers.push(lapStartX);
                  // Add point at lap start
                  rawPoints.push({ x: lapStartX, y: currentElevation });
                }
                
                for (let i = 0; i < track.segments.length; i++) {
                  const segment = track.segments[i];
                  const startDistance = cumulativeDistance;
                  
                  // Add point at segment start (before elevation change)
                  const startX = (startDistance / actualTrackDistance) * 950;
                  if (lap === 0 && i === 0) {
                    // Very first point
                    rawPoints.push({ x: startX, y: currentElevation });
                  }
                  
                  cumulativeDistance += segment.length;
                  
                  // Convert angle to elevation change
                  // Positive angle = uphill = higher elevation
                  currentElevation += segment.angle;
                  
                  // Add point at segment end (after elevation change)
                  const endX = (cumulativeDistance / actualTrackDistance) * 950;
                  rawPoints.push({ x: endX, y: currentElevation });
                  checkpoints.push(endX); // Mark segment boundary
                  terrainSegments.push({ startX, endX, terrain: segment.terrain });
                }
              }
              
              // Convert to SVG coordinates with consistent scale
              // Center vertically and invert Y (SVG Y grows downward)
              const points = rawPoints.map(p => ({
                x: p.x,
                y: 100 - p.y // Center at 100, invert so positive angles go up
              }));
              
              // Create SVG path
              const pathData = points.map((p, i) => 
                i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
              ).join(' ');
              
              return (
                <>
                  {/* Terrain color bands at the bottom */}
                  {terrainSegments.map((seg, i) => {
                    const terrainColor = 
                      seg.terrain === 'ScrapHeaps' ? 'rgb(168, 85, 247)' : // Purple
                      seg.terrain === 'WastelandSand' ? 'rgb(245, 158, 11)' : // Amber
                      seg.terrain === 'MetalRoads' ? 'rgb(71, 85, 105)' : // Slate
                      'rgb(100, 116, 139)'; // Default gray
                    
                    // Get difficulty from original track data
                    const segmentData = track.segments[i % track.segments.length];
                    const difficulty = segmentData.difficulty;
                    
                    // Difficulty affects opacity: 1.0=15%, 1.5=30%
                    const difficultyOpacity = 0.1 + (difficulty - 1.0) * 0.3;
                    
                    return (
                      <rect
                        key={i}
                        x={seg.startX}
                        y="185"
                        width={seg.endX - seg.startX}
                        height="10"
                        fill={terrainColor}
                        opacity={difficultyOpacity}
                      />
                    );
                  })}
                  
                  {/* Center reference line */}
                  <line x1="0" y1="100" x2="950" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.05" className="text-muted-foreground" strokeDasharray="5,5" />
                  
                  {/* Elevation line - subtle background element */}
                  <path
                    d={pathData}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    className="text-muted-foreground"
                    opacity="0.2"
                  />
                  
                  {/* Segment checkpoint markers */}
                  {checkpoints.slice(0, -1).map((x, i) => (
                    <line
                      key={i}
                      x1={x}
                      y1="0"
                      x2={x}
                      y2="200"
                      stroke="currentColor"
                      strokeWidth="1"
                      opacity="0.08"
                      className="text-muted-foreground"
                      strokeDasharray="3,3"
                    />
                  ))}
                  
                  {/* Lap markers - more prominent */}
                  {lapMarkers.map((x, i) => (
                    <g key={`lap-${i}`}>
                      <line
                        x1={x}
                        y1="0"
                        x2={x}
                        y2="200"
                        stroke="currentColor"
                        strokeWidth="2"
                        opacity="0.3"
                        className="text-primary"
                      />
                      <text
                        x={x + 5}
                        y="15"
                        fontSize="10"
                        fill="currentColor"
                        className="text-primary"
                        opacity="0.6"
                      >
                        Lap {i + 2}
                      </text>
                    </g>
                  ))}
                </>
              );
            })()}
          </svg>
          
          {/* Bot avatars positioned on straight line at bottom */}
          <div className="absolute inset-0 pointer-events-none" style={{ padding: '1rem' }}>
            {(() => {
              // Stack bots vertically based on their starting position (signup order)
              const totalBots = stablePositions.length;
              
              return stablePositions.map((bot, laneIndex) => {
                const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(bot.nftId));
                const imageUrl = generateExtThumbnailLink(tokenId);
                const isFinished = bot.progress >= 99.9 || currentTime >= bot.finalTime;
                const isDNF = bot.finalTime > 100000;
                const livePosition = bot.position;
                
                if (isDNF) return null;
                
                // Calculate position on track - cap at 100% so bots stop at finish line
                const xPercent = Math.min(100, bot.progress);
                
                // Spread bots evenly across available vertical height
                const totalBots = results.filter(r => r.finalTime < 100000).length;
                const trackHeight = Math.max(250, 130 + results.length * 24);
                
                // Use 65% of the height for bots, leaving more space at bottom
                const usableHeight = trackHeight * 0.65;
                const topPadding = trackHeight * 0.1;
                
                // Calculate position based on signup order from botOrder, not race position
                const verticalSpacing = totalBots > 1 ? usableHeight / (totalBots - 1) : 0;
                const topPosition = `${topPadding + laneIndex * verticalSpacing}px`;
                
                // Scale progress to stop at 95% of track width (0-100% progress maps to 0-95% position)
                const scaledPercent = xPercent * 0.95;
                const leftPosition = `calc(${scaledPercent}% - 1rem)`;
                
                return (
                  <div
                    key={bot.nftId}
                    className="absolute will-change-transform pointer-events-auto"
                    style={{
                      left: leftPosition,
                      top: topPosition,
                      transition: 'none',
                      zIndex: 100 - (livePosition || 0),
                      flexShrink: 0 // Prevent squishing
                    }}
                    title={`#${livePosition} Bot #${bot.nftId} - ${Math.round(bot.distance)}m / ${Math.round(actualTrackDistance)}m`}
                  >
                    <div className="relative">
                      {/* Position badge */}
                      <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 z-10 ${
                        livePosition === 1 ? 'bg-yellow-500 border-yellow-400 text-black' :
                        livePosition === 2 ? 'bg-gray-300 border-gray-400 text-black' :
                        livePosition === 3 ? 'bg-orange-600 border-orange-500 text-white' :
                        'bg-primary/80 border-primary text-primary-foreground'
                      }`}>
                        {livePosition}
                      </div>
                      
                      {/* Bot avatar */}
                      <div className={`relative ${isFinished ? 'animate-pulse' : ''}`}>
                        <img
                          src={imageUrl}
                          alt={`Bot #${bot.nftId}`}
                          className={`w-8 h-8 rounded-full border-2 ${
                            isFinished 
                              ? 'border-green-500 shadow-lg shadow-green-500/50' 
                              : 'border-primary shadow-lg shadow-primary/50'
                          }`}
                        />
                        {/* Speed indicator badge */}
                        {!isFinished && bot.currentSpeed > 0 && currentTime > 0 && (
                          <div className="absolute left-10 top-1/2 -translate-y-1/2 whitespace-nowrap">
                            <div 
                              className="bg-primary/90 text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg transition-all duration-300"
                              style={{
                                opacity: 0.7 + (bot.currentSpeed / 200) * 0.3, // Higher speed = more visible
                                transform: `scale(${0.95 + (bot.currentSpeed / 200) * 0.1})` // Slight scale with speed
                              }}
                            >
                              {bot.currentSpeed.toFixed(1)}m/s
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          
          {/* Finish line - positioned at 95% to match where bots stop */}
          <div className="absolute top-0 bottom-0 flex items-center opacity-50" style={{ left: '95%' }}>
            <div className="w-1 h-full bg-gradient-to-b from-transparent via-yellow-500 to-transparent" />
            <span className="ml-1 text-xs font-bold text-yellow-600 dark:text-yellow-400 writing-mode-vertical">🏁 FINISH</span>
          </div>
        </div>
        
        {/* Race stats and leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 mt-4">
          {/* Event Feed - Left Column */}
          {events.length > 0 && (
            <div className="bg-card/50 border border-primary/20 rounded-lg p-3 lg:col-span-1 max-h-96 overflow-y-auto">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Radio className="w-4 h-4" />
                Race Commentary
              </h3>
              <div className="space-y-2">
                {visibleEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Race starting...</p>
                ) : (
                  // Show most recent events first
                  [...visibleEvents].reverse().slice(0, 20).map((event, idx) => {
                    const eventKey = Object.keys(event.eventType)[0];
                    const eventData = event.eventType[eventKey as keyof typeof event.eventType] as any;
                    
                    let icon = <Zap className="w-3 h-3" />;
                    let colorClass = "text-muted-foreground";
                    
                    if ('Overtake' in event.eventType) {
                      icon = <Users className="w-3 h-3" />;
                      colorClass = "text-blue-500";
                    } else if ('LeadChange' in event.eventType) {
                      icon = <Trophy className="w-3 h-3" />;
                      colorClass = "text-yellow-500";
                    } else if ('ExceptionalPerformance' in event.eventType) {
                      icon = <TrendingUp className="w-3 h-3" />;
                      colorClass = "text-green-500";
                    } else if ('PoorPerformance' in event.eventType) {
                      icon = <TrendingDown className="w-3 h-3" />;
                      colorClass = "text-red-500";
                    } else if ('LargeGap' in event.eventType) {
                      icon = <FastForward className="w-3 h-3" />;
                      colorClass = "text-purple-500";
                    } else if ('CloseRacing' in event.eventType) {
                      icon = <Users className="w-3 h-3" />;
                      colorClass = "text-orange-500";
                    }
                    
                    return (
                      <div
                        key={`${event.timestamp}-${idx}`}
                        className="flex items-start gap-2 text-xs p-2 rounded bg-card/30 border border-primary/10"
                        style={{
                          animation: idx === 0 ? 'fadeIn 0.3s ease-in' : undefined
                        }}
                      >
                        <div className={`mt-0.5 ${colorClass}`}>{icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {event.timestamp.toFixed(1)}s
                            </span>
                          </div>
                          <p className="text-xs leading-tight">{event.description}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
          
          {/* Live Positions - Right Column(s) */}
          <div className={`bg-card/50 border border-primary/20 rounded-lg p-3 ${events.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <h3 className="text-sm font-semibold mb-2">Live Positions</h3>
            <div className="space-y-1">
              {/* Sort by current race position (live standings) */}
              {[...stablePositions].sort((a, b) => a.position - b.position).map((bot) => {
                const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(bot.nftId));
                const imageUrl = generateExtThumbnailLink(tokenId);
                // Bot is finished when visualization shows they've crossed the line (progress >= 99.9%)
                // OR when currentTime has reached/passed their backend finalTime
                const isFinished = bot.progress >= 99.9 || currentTime >= bot.finalTime;
                const isDNF = bot.finalTime > 100000;
                const livePosition = bot.position;
                const leaderTime = Math.min(...stablePositions.map(b => b.finalTime));
                const timeBehind = bot.finalTime - leaderTime;
                const result = results.find(r => r.nftId === bot.nftId);
                const rating = result?.rating || (result?.stats ? 
                  Math.round((result.stats.speed + result.stats.stability + result.stats.powerCore + result.stats.acceleration) / 4) : null);
                
                return (
                  <div key={bot.nftId} className="flex items-center gap-2 text-xs">
                    <span className={`font-bold w-6 ${
                      livePosition === 1 ? 'text-yellow-500' :
                      livePosition === 2 ? 'text-gray-400' :
                      livePosition === 3 ? 'text-orange-600' :
                      'text-muted-foreground'
                    }`}>
                      {livePosition === 1 && '🥇'}
                      {livePosition === 2 && '🥈'}
                      {livePosition === 3 && '🥉'}
                      {livePosition > 3 && `#${livePosition}`}
                    </span>
                    <img
                      src={imageUrl}
                      alt={`Bot #${bot.nftId}`}
                      className="w-5 h-5 rounded border border-primary/30"
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-mono text-xs">Bot #{bot.nftId}</span>
                      {rating && (
                        <span className="text-[10px] text-muted-foreground">Rating: {rating}</span>
                      )}
                    </div>
                    {!isDNF && !isFinished && (
                      <>
                        <span className="text-muted-foreground">
                          {(bot.distance / 1000).toFixed(2)}km
                        </span>
                        <span className="text-primary font-medium">
                          {bot.currentSpeed.toFixed(1)}m/s
                        </span>
                      </>
                    )}
                    {isFinished && !isDNF && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono">
                          {bot.finalTime.toFixed(2)}s
                        </span>
                        {livePosition > 1 && (
                          <span className="text-red-500 text-[10px]">
                            +{timeBehind.toFixed(2)}s
                          </span>
                        )}
                        <span className="text-green-500 font-bold">✓</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Final results summary - only show after animation completes */}
        {animationCompleted && (
          <div className="mt-6 pt-4 border-t border-primary/20">
            <h3 className="text-sm font-semibold mb-3">Final Results:</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[...stablePositions]
                .filter(r => r.finalTime < 100000)
                .sort((a, b) => a.position - b.position)
                .slice(0, 3)
                .map((result, idx) => {
                const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(result.nftId));
                const imageUrl = generateExtThumbnailLink(tokenId);
                const localTime = result.finalTime;
                
                return (
                  <div key={result.nftId} className="flex flex-col items-center gap-1 p-2 bg-card/50 rounded border border-primary/20">
                    <div className="text-lg">
                      {idx === 0 && '🥇'}
                      {idx === 1 && '🥈'}
                      {idx === 2 && '🥉'}
                    </div>
                    <img
                      src={imageUrl}
                      alt={`Bot #${result.nftId}`}
                      className="w-8 h-8 rounded"
                    />
                    <span className="font-mono">#{result.nftId}</span>
                    <span className="text-muted-foreground">{localTime.toFixed(2)}s</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
