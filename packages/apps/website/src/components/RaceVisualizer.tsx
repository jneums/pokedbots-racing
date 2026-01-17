import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, FastForward, SkipForward, Radio, PlayCircle, Zap, Trophy, TrendingUp, TrendingDown, Users, AlertTriangle, Sparkles } from 'lucide-react';
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';
import {  useGetBotProfilesBatch } from '@/hooks/useRacing';


// Component to fetch all bot names at once using batch endpoint
function BotNamesFetcher({ botIds, children }: { botIds: string[]; children: (botNames: Map<string, string>) => React.ReactNode }) {
  const botIndices = useMemo(() => botIds.map(id => Number(id)), [botIds]);
  const { data: botProfiles = [] } = useGetBotProfilesBatch(botIndices);

  const botNames = useMemo(() => {
    const names = new Map<string, string>();
    botIds.forEach((id) => {
      // Match profile by tokenIndex, not array index
      const profile = botProfiles.find(p => Number(p.tokenIndex) === Number(id));
      if (profile?.name && profile.name.length > 0 && profile.name[0]) {
        names.set(id, profile.name[0]);
      } else {
        names.set(id, `Bot #${id}`);
      }
    });
    return names;
  }, [botIds, botProfiles]);

  return children(botNames);
}

// Replace bot references in event descriptions with actual names
const EventDescription = ({ event, botNames }: { event: RaceEvent; botNames: Map<string, string> }) => {
  // Replace bot references in description
  let description = event.description;
  botNames.forEach((name, id) => {
    description = description.replace(new RegExp(`Bot ${id}\\b`, 'g'), name);
  });

  return <>{description}</>;
};

// Race event types matching backend
type RaceEventType = 
  | { Overtake: { overtaker: string; overtaken: string } }
  | { LeadChange: { newLeader: string; previousLeader: string } }
  | { LargeGap: { leader: string; gapSeconds: number } }
  | { CloseRacing: { bots: string[]; gapSeconds: number } }
  | { ExceptionalPerformance: { bot: string; performancePct: number } }
  | { PoorPerformance: { bot: string; performancePct: number } }
  | { SegmentComplete: { segmentIndex: bigint; leader: string } }
  | { LuckProc: { bot: string; procType: string; boost: number } }
  | { BadLuck: { bot: string; incidentType: string; penalty: number } };

// ===== LUCK SYSTEM =====
// 13-day phenomenon cycle matching backend RacingSimulator.mo

export type PhenomenonType = 
  | 'SolarFlare' | 'RustStorm' | 'MetalResonance' | 'GravityFlux'
  | 'ScrapTornado' | 'DeadZone' | 'GoldenHour' | 'MachineGhost'
  | 'BloodMoon' | 'BinarySurge' | 'ChaosPulse' | 'MomentumShift' | 'BlackholeSingularity';

type LuckProcType = 
  | { type: 'Minor'; boost: number; description: string }
  | { type: 'Major'; boost: number; description: string }
  | { type: 'Legendary'; boost: number; description: string };

interface ActiveLuckBuff {
  procType: LuckProcType;
  appliedAtSegment: number;
  remainingDuration: number;
}

// Check if a number is prime (for Metal Resonance phenomenon)
function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

// Phenomenon display info (matches DailyPhenomenonBanner)
const PHENOMENA_DISPLAY: Record<PhenomenonType, { name: string; emoji: string; color: string }> = {
  SolarFlare: { name: 'Solar Flare', emoji: '☀️', color: 'text-amber-400' },
  RustStorm: { name: 'Rust Storm', emoji: '🌪️', color: 'text-orange-400' },
  MetalResonance: { name: 'Metal Resonance', emoji: '⚡', color: 'text-cyan-400' },
  GravityFlux: { name: 'Gravity Flux', emoji: '🌀', color: 'text-purple-400' },
  ScrapTornado: { name: 'Scrap Tornado', emoji: '🔩', color: 'text-slate-300' },
  DeadZone: { name: 'Dead Zone', emoji: '💀', color: 'text-zinc-400' },
  GoldenHour: { name: 'Golden Hour', emoji: '✨', color: 'text-yellow-400' },
  MachineGhost: { name: 'Machine Ghost', emoji: '👻', color: 'text-slate-300' },
  BloodMoon: { name: 'Blood Moon', emoji: '🌙', color: 'text-red-400' },
  BinarySurge: { name: 'Binary Surge', emoji: '🔢', color: 'text-emerald-400' },
  ChaosPulse: { name: 'Chaos Pulse', emoji: '💥', color: 'text-pink-400' },
  MomentumShift: { name: 'Momentum Shift', emoji: '🏃', color: 'text-indigo-400' },
  BlackholeSingularity: { name: 'Blackhole Singularity', emoji: '🕳️', color: 'text-violet-400' },
};

// Get current phenomenon based on timestamp (13-day cycle)
function getCurrentPhenomenon(timestamp: bigint): PhenomenonType {
  const nanosPerDay = BigInt(86400_000_000_000);
  const dayIndex = Number((timestamp / nanosPerDay) % 13n);
  
  const phenomena: PhenomenonType[] = [
    'SolarFlare', 'RustStorm', 'MetalResonance', 'GravityFlux',
    'ScrapTornado', 'DeadZone', 'GoldenHour', 'MachineGhost',
    'BloodMoon', 'BinarySurge', 'ChaosPulse', 'MomentumShift', 'BlackholeSingularity'
  ];
  
  return phenomena[dayIndex];
}

// Calculate daily affinity for a bot (0-100) - matches backend exactly
// baseAvgRating: Optional unbuffed average rating for MomentumShift calculation
function calculateDailyAffinity(
  tokenIndex: number,
  stats: { speed: number; stability: number; powerCore: number; acceleration: number; luck?: number },
  faction: string,
  timestamp: bigint,
  overridePhenomenon?: PhenomenonType,
  baseAvgRating?: number // Optional: raw avg rating without terrain/faction bonuses (for MomentumShift)
): number {
  const phenomenon = overridePhenomenon ?? getCurrentPhenomenon(timestamp);
  let affinity = 0;
  
  switch (phenomenon) {
    case 'SolarFlare': {
      const digit = stats.powerCore % 10;
      if (digit === 7) affinity += 60;
      else if (digit === 3 || digit === 9) affinity += 40;
      else if (digit === 0 || digit === 5) affinity += 25;
      if (tokenIndex % 2 === 0) affinity += 30;
      break;
    }
    case 'RustStorm': {
      const digit = stats.stability % 10;
      if (digit === 2 || digit === 8) affinity += 60;
      else if (digit === 4 || digit === 6) affinity += 40;
      else if (digit === 0) affinity += 25;
      if (tokenIndex % 13 === 2) affinity += 40;
      break;
    }
    case 'MetalResonance': {
      const digit = stats.speed % 10;
      if (digit === 3) affinity += 60;
      else if (digit === 1 || digit === 7) affinity += 40;
      else if (digit === 9) affinity += 25;
      if (isPrime(tokenIndex)) affinity += 45;
      break;
    }
    case 'GravityFlux': {
      const digit = stats.acceleration % 10;
      if (digit === 4) affinity += 60;
      else if (digit === 0 || digit === 8) affinity += 40;
      else if (digit === 2 || digit === 6) affinity += 25;
      if (tokenIndex % 4 === 0) affinity += 35;
      break;
    }
    case 'ScrapTornado': {
      if (faction === 'Wild') affinity += 70;
      if (tokenIndex % 100 < 20) affinity += 40;
      break;
    }
    case 'DeadZone': {
      if (faction === 'Dead') affinity += 60;
      const tokenText = tokenIndex.toString();
      if (tokenText.includes('666') || tokenText.includes('66') || 
          tokenText.includes('13') || tokenText.includes('6')) {
        affinity += 45;
      }
      break;
    }
    case 'GoldenHour': {
      if (faction === 'Golden') affinity += 65;
      if (tokenIndex % 7 === 0) affinity += 40;
      break;
    }
    case 'MachineGhost': {
      if (faction === 'Ultimate' || faction === 'UltimateMaster' || faction === 'Master') {
        affinity += 55;
      }
      if (tokenIndex > 5000) affinity += 40;
      break;
    }
    case 'BloodMoon': {
      if (faction === 'Murder') affinity += 50;
      if (tokenIndex % 9 === 0) affinity += 40;
      break;
    }
    case 'BinarySurge': {
      const maxStat = Math.max(stats.speed, stats.powerCore, stats.acceleration, stats.stability);
      const minStat = Math.min(stats.speed, stats.powerCore, stats.acceleration, stats.stability);
      const spread = maxStat - minStat;
      if (spread <= 5) affinity += 70;
      else if (spread <= 10) affinity += 45;
      else if (spread <= 15) affinity += 25;
      break;
    }
    case 'ChaosPulse': {
      if (tokenIndex % 11 === 0) affinity += 70;
      const luck = stats.luck || 10;
      if (luck > 10) {
        affinity += Math.min(30, (luck - 10) * 2);
      }
      break;
    }
    case 'MomentumShift': {
      // Use base (unbuffed) average rating if provided to prevent terrain-buffed bots
      // from exceeding their bracket threshold and incorrectly receiving underdog bonus
      const avgRating = baseAvgRating ?? Math.floor((stats.speed + stats.powerCore + stats.acceleration + stats.stability) / 4);
      const bracketPosition = avgRating % 10;
      if (bracketPosition <= 2) affinity += 60;
      else if (bracketPosition <= 4) affinity += 45;
      else if (bracketPosition <= 6) affinity += 25;
      if (tokenIndex % 12 === 0) affinity += 40;
      break;
    }
    case 'BlackholeSingularity': {
      if (faction === 'Blackhole') affinity += 60;
      if (tokenIndex % 13 === 0) affinity += 40;
      break;
    }
  }
  
  return Math.min(affinity, 100);
}

// Check if luck proc triggers (returns null if no proc)
function checkLuckProc(
  luck: number,
  dailyAffinity: number,
  position: number,
  totalRacers: number,
  segmentSeed: number
): LuckProcType | null {
  // POSITION-GATED: Only underdogs can proc luck
  // Leaders don't need luck - they're already winning
  // This creates comeback potential without rewarding the already-ahead
  
  // Calculate position threshold: bottom half of field can proc
  const halfField = totalRacers <= 2 ? 1 : Math.floor(totalRacers / 2);
  
  // If in top half (leading), no luck procs
  if (position <= halfField) {
    return null;
  }
  
  // UNDERDOG SCALING: How far back determines proc chance
  // Position 4/6 (barely behind): low chance
  // Position 6/6 (dead last): highest chance
  const positionsBehind = position - halfField; // 1 to halfField
  const underdogFactor = positionsBehind / halfField;
  
  // FLAT BASELINE: Everyone gets the same base chance (10%)
  // Position is the ONLY multiplier - luck stat is ignored
  // This creates pure Mario Kart style rubber banding
  const baseLuckChance = 0.10; // 10% flat for everyone
  
  // Underdog multiplier: 1x at barely behind, up to 2.5x at dead last
  const underdogMultiplier = 1.0 + (underdogFactor * 1.5);
  
  // Daily affinity bonus (up to +5%) - small flavor bonus
  const affNorm = dailyAffinity / 100.0;
  const affinityBonus = affNorm * 0.05;
  
  // Total luck chance (capped at 30%)
  const totalLuckChance = Math.min(0.30, (baseLuckChance * underdogMultiplier) + affinityBonus);
  
  // Roll using segment seed
  const roll = (segmentSeed % 1000) / 1000.0;
  
  if (roll >= totalLuckChance) return null;
  
  // POSITION-BASED PROC TYPE: Worse position = better tier chance
  // Dead last gets best odds, barely-behind gets worst
  const underdogRatio = positionsBehind / halfField; // 0.0 to 1.0
  const tierRoll = segmentSeed % 100;
  
  // Position-based probability:
  // Dead last (ratio=1.0): 15% Legendary, 40% Major, 45% Minor
  // Barely behind (ratio~0.2): 3% Legendary, 20% Major, 77% Minor
  // 
  // Luck stat gives small bonus to tier (up to +5% Legendary, +10% Major)
  const luckBonus = luck / 100.0;
  
  const legendaryChance = Math.floor(3.0 + underdogRatio * 12.0 + luckBonus * 5.0); // 3-20%
  const majorChance = Math.floor(20.0 + underdogRatio * 20.0 + luckBonus * 10.0); // 20-50%
  
  if (tierRoll < legendaryChance) {
    const descriptions = [
      "FLOW STATE ACTIVATED! Bot transcends physics!",
      "LEGENDARY SHORTCUT! Bot warps through space!",
      "COSMIC BLESSING! Bot channels wasteland energy!",
      "UNSTOPPABLE! Bot enters god mode!"
    ];
    return { type: 'Legendary', boost: 1.20, description: descriptions[segmentSeed % 4] };
  }
  else if (tierRoll < legendaryChance + majorChance) {
    const descriptions = [
      "Discovers hidden shortcut!",
      "Catches massive tailwind!",
      "Perfect line through debris!",
      "Engine surge! Extra power!"
    ];
    return { type: 'Major', boost: 1.12, description: descriptions[segmentSeed % 4] };
  }
  else {
    const descriptions = [
      "Lucky dodge saves time!",
      "Catches tailwind!",
      "Smooth patch ahead!",
      "Debris clears perfectly!"
    ];
    return { type: 'Minor', boost: 1.06, description: descriptions[segmentSeed % 4] };
  }
}

// Get luck proc duration
function getLuckProcDuration(procType: LuckProcType): number {
  switch (procType.type) {
    case 'Minor': return 1;
    case 'Major': return 3;
    case 'Legendary': return 5;
  }
}

// ===== BAD LUCK INCIDENT SYSTEM =====
// Lower luck bots have higher chance of bad incidents

interface BadLuckIncident {
  penalty: number; // Time multiplier (>1.0 = slower)
  duration: number; // Segments affected
  description: string;
}

function checkBadLuckIncident(
  luck: number,
  segmentSeed: number,
): BadLuckIncident | null {
  // Diminishing returns formula - luck keeps helping but with decreasing benefit
  // Formula: 6% / (1 + (luck - 10) / 30)
  // Luck 10: 6%, Luck 25: 4%, Luck 40: 3%, Luck 70: 2%, Luck 100: 1.5%
  const luckAboveMin = Math.max(0, luck - 10);
  const luckFactor = 0.06 / (1 + luckAboveMin / 30);

  // Random roll
  const roll = (segmentSeed % 1000) / 1000.0;

  if (roll >= luckFactor) {
    return null; // No incident
  }

  // Determine incident severity based on how unlucky
  const severityRoll = segmentSeed % 100;

  if (severityRoll < 60) {
    // Minor incident (60%): Inverse of Minor luck proc (1.15 boost = 0.87 time)
    // We use 1.20 penalty to make it noticeable (~17% slower)
    const descriptions = [
      "Bot hit debris - loses momentum!",
      "Minor collision slows things down!",
      "Hits a rough patch!",
    ];
    return {
      penalty: 1.20, // +20% time (was 1.10)
      duration: 1,
      description: descriptions[segmentSeed % 3],
    };
  } else if (severityRoll < 90) {
    // Medium incident (30%): Inverse of Major luck proc (1.25 boost = 0.80 time)
    // We use 1.35 penalty (~26% slower)
    const descriptions = [
      "Engine sputter - needs to recover!",
      "Systems glitch causes slowdown!",
      "Coolant leak detected!",
    ];
    return {
      penalty: 1.35, // +35% time (was 1.15)
      duration: 1,
      description: descriptions[segmentSeed % 3],
    };
  } else {
    // Severe incident (10%): Inverse of Legendary luck proc (1.40 boost = 0.71 time)
    // We use 1.50 penalty (~33% slower)
    const descriptions = [
      "Navigation error - off the line!",
      "Major malfunction - scrambling to recover!",
      "Critical systems failure!",
    ];
    return {
      penalty: 1.50, // +50% time (was 1.20)
      duration: 1,
      description: descriptions[segmentSeed % 3],
    };
  }
}

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
    luck?: number; // Luck stat for luck system
    overcharge?: number; // Overcharge level (0-40) snapshotted at race entry
    perfectTuneUp?: boolean; // Whether bot had perfect tune-up at race entry
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
  raceCreatedAt?: bigint; // Race creation timestamp (for daily phenomenon calculation)
  raceStatus?: any; // Race status (InProgress, Completed, etc.)
  bonusesAlreadyApplied?: boolean; // If true, stats already include terrain/faction bonuses (from backend snapshot)
  startAtEnd?: boolean; // Start visualization at the end (for simulator mode)
  onRaceWatched?: () => void; // Callback when user watches race to completion
  events?: RaceEvent[]; // Race commentary events
  disableAutoplay?: boolean; // Disable autoplay even for live races
  overridePhenomenon?: PhenomenonType; // Override the daily phenomenon (for simulator mode)
  raceId?: number; // Race ID for debugging purposes
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
  "Sandstorm Circuit",
  "Desert Sprint",
  "Wasteland Odyssey",
  "Iron Crucible",
  "Endless Expanse",
  "Survival Gauntlet"
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
  },
  11: { // Desert Sprint - Quick dash across packed sand flats
    segments: [
      { length: 350, terrain: 'WastelandSand', angle: 0, difficulty: 1.1 },
      { length: 300, terrain: 'WastelandSand', angle: 4, difficulty: 1.15 },
      { length: 250, terrain: 'WastelandSand', angle: 8, difficulty: 1.2 },
      { length: 280, terrain: 'WastelandSand', angle: -6, difficulty: 1.12 },
      { length: 320, terrain: 'WastelandSand', angle: 0, difficulty: 1.18 },
      { length: 300, terrain: 'WastelandSand', angle: -5, difficulty: 1.08 },
      { length: 300, terrain: 'WastelandSand', angle: -1, difficulty: 1.15 }
    ],
    laps: 3
  },
  12: { // Wasteland Odyssey - Epic journey across varied terrain (22.6km)
    segments: [
      // Sand section (8km)
      { length: 1400, terrain: 'WastelandSand', angle: 3, difficulty: 1.18 },
      { length: 1200, terrain: 'WastelandSand', angle: 8, difficulty: 1.25 },
      { length: 1300, terrain: 'WastelandSand', angle: 12, difficulty: 1.28 },
      { length: 1100, terrain: 'WastelandSand', angle: 5, difficulty: 1.22 },
      { length: 1000, terrain: 'WastelandSand', angle: 0, difficulty: 1.2 },
      { length: 1200, terrain: 'WastelandSand', angle: -8, difficulty: 1.15 },
      { length: 1000, terrain: 'WastelandSand', angle: -4, difficulty: 1.12 },
      // Metal highway section (7km)
      { length: 1500, terrain: 'MetalRoads', angle: 0, difficulty: 0.85 },
      { length: 1400, terrain: 'MetalRoads', angle: 0, difficulty: 0.82 },
      { length: 1200, terrain: 'MetalRoads', angle: -5, difficulty: 0.78 },
      { length: 1300, terrain: 'MetalRoads', angle: 0, difficulty: 0.88 },
      { length: 1600, terrain: 'MetalRoads', angle: 0, difficulty: 0.9 },
      // Scrap mountain finale (7.4km)
      { length: 900, terrain: 'ScrapHeaps', angle: 8, difficulty: 1.15 },
      { length: 800, terrain: 'ScrapHeaps', angle: 15, difficulty: 1.25 },
      { length: 1000, terrain: 'ScrapHeaps', angle: 22, difficulty: 1.32 },
      { length: 900, terrain: 'ScrapHeaps', angle: 18, difficulty: 1.28 },
      { length: 1100, terrain: 'ScrapHeaps', angle: -12, difficulty: 1.12 },
      { length: 1200, terrain: 'ScrapHeaps', angle: -18, difficulty: 1.05 },
      { length: 1500, terrain: 'ScrapHeaps', angle: -10, difficulty: 1.08 }
    ],
    laps: 1
  },
  13: { // Iron Crucible - Brutal metal-to-scrap transition (28.8km, 2 laps)
    segments: [
      // Fast highway opening (4.5km)
      { length: 1200, terrain: 'MetalRoads', angle: 0, difficulty: 0.82 },
      { length: 1100, terrain: 'MetalRoads', angle: -4, difficulty: 0.78 },
      { length: 1000, terrain: 'MetalRoads', angle: 0, difficulty: 0.85 },
      { length: 1200, terrain: 'MetalRoads', angle: 0, difficulty: 0.88 },
      // Technical scrap transition (5.1km)
      { length: 800, terrain: 'ScrapHeaps', angle: 5, difficulty: 1.12 },
      { length: 900, terrain: 'ScrapHeaps', angle: 12, difficulty: 1.22 },
      { length: 700, terrain: 'ScrapHeaps', angle: 18, difficulty: 1.3 },
      { length: 1000, terrain: 'ScrapHeaps', angle: 15, difficulty: 1.25 },
      { length: 800, terrain: 'ScrapHeaps', angle: 8, difficulty: 1.18 },
      { length: 900, terrain: 'ScrapHeaps', angle: 0, difficulty: 1.2 },
      // Mixed technical section (4.8km)
      { length: 600, terrain: 'MetalRoads', angle: 0, difficulty: 0.92 },
      { length: 700, terrain: 'ScrapHeaps', angle: 8, difficulty: 1.15 },
      { length: 800, terrain: 'ScrapHeaps', angle: 12, difficulty: 1.22 },
      { length: 900, terrain: 'MetalRoads', angle: -10, difficulty: 0.88 },
      { length: 1000, terrain: 'MetalRoads', angle: -27, difficulty: 0.85 },
      { length: 800, terrain: 'ScrapHeaps', angle: -37, difficulty: 1.28 }
    ],
    laps: 2
  },
  14: { // Endless Expanse - Ultimate power core test (50.5km)
    segments: [
      // Opening dune climb (10km)
      { length: 1800, terrain: 'WastelandSand', angle: 8, difficulty: 1.22 },
      { length: 1600, terrain: 'WastelandSand', angle: 12, difficulty: 1.28 },
      { length: 1700, terrain: 'WastelandSand', angle: 15, difficulty: 1.32 },
      { length: 1500, terrain: 'WastelandSand', angle: 18, difficulty: 1.35 },
      { length: 1400, terrain: 'WastelandSand', angle: 10, difficulty: 1.25 },
      { length: 2000, terrain: 'WastelandSand', angle: 5, difficulty: 1.2 },
      // Mid-expanse rolling (15km)
      { length: 2000, terrain: 'WastelandSand', angle: 0, difficulty: 1.18 },
      { length: 1800, terrain: 'WastelandSand', angle: 6, difficulty: 1.22 },
      { length: 1600, terrain: 'WastelandSand', angle: -4, difficulty: 1.15 },
      { length: 1700, terrain: 'WastelandSand', angle: 0, difficulty: 1.2 },
      { length: 1900, terrain: 'WastelandSand', angle: 8, difficulty: 1.25 },
      { length: 2000, terrain: 'WastelandSand', angle: 10, difficulty: 1.28 },
      { length: 1800, terrain: 'WastelandSand', angle: 4, difficulty: 1.18 },
      { length: 1700, terrain: 'WastelandSand', angle: -6, difficulty: 1.12 },
      // Deep desert crucible (14km)
      { length: 2200, terrain: 'WastelandSand', angle: 12, difficulty: 1.3 },
      { length: 2000, terrain: 'WastelandSand', angle: 15, difficulty: 1.32 },
      { length: 1800, terrain: 'WastelandSand', angle: 8, difficulty: 1.25 },
      { length: 1900, terrain: 'WastelandSand', angle: 0, difficulty: 1.22 },
      { length: 2100, terrain: 'WastelandSand', angle: 5, difficulty: 1.2 },
      { length: 2000, terrain: 'WastelandSand', angle: 10, difficulty: 1.28 },
      { length: 2000, terrain: 'WastelandSand', angle: -8, difficulty: 1.15 },
      // Final descent (12km)
      { length: 1900, terrain: 'WastelandSand', angle: -12, difficulty: 1.1 },
      { length: 1800, terrain: 'WastelandSand', angle: -15, difficulty: 1.08 },
      { length: 2000, terrain: 'WastelandSand', angle: -10, difficulty: 1.12 },
      { length: 1700, terrain: 'WastelandSand', angle: -6, difficulty: 1.15 },
      { length: 1600, terrain: 'WastelandSand', angle: 0, difficulty: 1.18 },
      { length: 2000, terrain: 'WastelandSand', angle: -8, difficulty: 1.1 },
      { length: 1000, terrain: 'WastelandSand', angle: -20, difficulty: 1.05 }
    ],
    laps: 1
  },
  15: { // Survival Gauntlet - The ultimate test (59km)
    segments: [
      // Scrap mountain approach (12km)
      { length: 1500, terrain: 'ScrapHeaps', angle: 8, difficulty: 1.15 },
      { length: 1400, terrain: 'ScrapHeaps', angle: 15, difficulty: 1.25 },
      { length: 1600, terrain: 'ScrapHeaps', angle: 20, difficulty: 1.32 },
      { length: 1300, terrain: 'ScrapHeaps', angle: 18, difficulty: 1.28 },
      { length: 1200, terrain: 'ScrapHeaps', angle: 12, difficulty: 1.22 },
      { length: 1500, terrain: 'ScrapHeaps', angle: -10, difficulty: 1.12 },
      { length: 1400, terrain: 'ScrapHeaps', angle: -15, difficulty: 1.08 },
      { length: 1600, terrain: 'ScrapHeaps', angle: -8, difficulty: 1.15 },
      { length: 1500, terrain: 'ScrapHeaps', angle: 0, difficulty: 1.2 },
      // Highway speed section (16km)
      { length: 2000, terrain: 'MetalRoads', angle: 0, difficulty: 0.82 },
      { length: 1900, terrain: 'MetalRoads', angle: -5, difficulty: 0.78 },
      { length: 1800, terrain: 'MetalRoads', angle: 0, difficulty: 0.85 },
      { length: 2100, terrain: 'MetalRoads', angle: 0, difficulty: 0.88 },
      { length: 2000, terrain: 'MetalRoads', angle: -3, difficulty: 0.8 },
      { length: 1900, terrain: 'MetalRoads', angle: 0, difficulty: 0.9 },
      { length: 2200, terrain: 'MetalRoads', angle: 0, difficulty: 0.85 },
      { length: 2100, terrain: 'MetalRoads', angle: 0, difficulty: 0.88 },
      // Desert endurance gauntlet (20km)
      { length: 2200, terrain: 'WastelandSand', angle: 8, difficulty: 1.22 },
      { length: 2000, terrain: 'WastelandSand', angle: 12, difficulty: 1.28 },
      { length: 1900, terrain: 'WastelandSand', angle: 15, difficulty: 1.32 },
      { length: 2100, terrain: 'WastelandSand', angle: 10, difficulty: 1.25 },
      { length: 2000, terrain: 'WastelandSand', angle: 5, difficulty: 1.2 },
      { length: 1800, terrain: 'WastelandSand', angle: 0, difficulty: 1.18 },
      { length: 2000, terrain: 'WastelandSand', angle: -6, difficulty: 1.12 },
      { length: 1900, terrain: 'WastelandSand', angle: -10, difficulty: 1.08 },
      { length: 2100, terrain: 'WastelandSand', angle: 8, difficulty: 1.22 },
      { length: 2000, terrain: 'WastelandSand', angle: 0, difficulty: 1.15 },
      // Final mixed technical (10km)
      { length: 1200, terrain: 'MetalRoads', angle: 0, difficulty: 0.92 },
      { length: 1100, terrain: 'ScrapHeaps', angle: 8, difficulty: 1.18 },
      { length: 1300, terrain: 'ScrapHeaps', angle: 15, difficulty: 1.28 },
      { length: 1200, terrain: 'WastelandSand', angle: 10, difficulty: 1.22 },
      { length: 1100, terrain: 'MetalRoads', angle: -8, difficulty: 0.88 },
      { length: 1400, terrain: 'WastelandSand', angle: 0, difficulty: 1.15 },
      { length: 1200, terrain: 'ScrapHeaps', angle: -12, difficulty: 1.1 },
      { length: 1500, terrain: 'MetalRoads', angle: -6, difficulty: 0.85 }
    ],
    laps: 1
  }
};

// Apply faction bonuses to stats - matches backend PokedBotsGarage.mo
// CRITICAL: Backend uses Int.abs(Float.toInt(...)) which TRUNCATES (floor for positive numbers)
// Must use Math.floor() to match backend exactly
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
    case 'Food':
      // Food faction has no racing bonuses (condition recovery only)
      break;
  }
  
  let boosted = {
    speed: Math.min(100, Math.max(1, speed)),
    powerCore: Math.min(100, Math.max(1, powerCore)),
    acceleration: Math.min(100, Math.max(1, acceleration)),
    stability: Math.min(100, Math.max(1, stability)),
  };
  
  // Apply preferred terrain bonus (+5% if racing on preferred terrain)
  if (preferredTerrain === terrain) {
    return {
      speed: Math.min(100, Math.max(1, Math.floor(boosted.speed * 1.05))),
      powerCore: Math.min(100, Math.max(1, Math.floor(boosted.powerCore * 1.05))),
      acceleration: Math.min(100, Math.max(1, Math.floor(boosted.acceleration * 1.05))),
      stability: Math.min(100, Math.max(1, Math.floor(boosted.stability * 1.05))),
    };
  }
  
  return boosted;
}

// Replicate backend segment time calculation - matches RacingSimulator.mo
function calculateSegmentTimeEstimate(
  segment: TrackSegment, 
  seed: bigint,
  stats: { speed: number; stability: number; powerCore: number; acceleration: number },
  previousDifficulty: number = 1.0, // Difficulty of previous segment
  raceDistance: number = 10 // Total race distance for distance-based scaling (in km)
): number {
  const speed = stats.speed;
  const powerCore = stats.powerCore;
  const stability = stats.stability;
  const acceleration = stats.acceleration;

  const DEBUG = segment.length === 500 && previousDifficulty === 1.0; // Debug first segment only

  // === PART 1: UNIVERSAL STAT COMPONENTS (70% always active) ===
  
  // Speed: 70% universal base, 30% conditional bonus
  const speedUniversal = Math.sqrt(speed) * 4.0; // Reduced from 5.25 to balance with other stats
  let speedBonus = 0.0;
  if (segment.angle === 0 && segment.terrain === 'MetalRoads') {
    speedBonus = Math.sqrt(speed) * 1.7; // +30% bonus on ideal conditions (reduced from 2.25)
  } else if (segment.angle < 0) {
    speedBonus = Math.sqrt(speed) * 0.85; // +15% bonus on downhills (reduced from 1.125)
  }
  
  // === PART 2: STAT SYNERGIES ===
  
  // Speed + Acceleration synergy (high speed needs good accel to maintain)
  const speedAccelRatio = (speed + acceleration) / 200.0; // 0.30 to 1.0
  const speedSynergyMod = 0.85 + (speedAccelRatio * 0.15); // 0.85x to 1.0x
  const synergisticSpeed = (speedUniversal + speedBonus) * speedSynergyMod;
  
  // Power + Stability synergy (endurance needs stability)
  const powerStabilityRatio = (powerCore + stability) / 200.0; // 0.30 to 1.0
  const powerSynergyMod = 0.82 + (powerStabilityRatio * 0.18); // 0.82x to 1.0x
  
  // === PART 3: UNIVERSAL PENALTIES (all stats matter everywhere) ===
  
  // Power Core: Universal endurance (28% penalty range)
  const powerUniversal = 1.0 + ((100.0 - powerCore) / 350.0);
  const accelUniversal = 1.0 + ((100.0 - acceleration) / 350.0);
  
  // Stability: Universal consistency (28% penalty range)
  const stabilityUniversal = 1.0 + ((100.0 - stability) / 350.0);
  
  // === PART 4: SITUATIONAL MODIFIERS ===
  
  // Power: Additional penalty in demanding conditions
  let powerSituational = 1.0;
  if (segment.terrain === 'WastelandSand') {
    powerSituational = 1.0 + ((100.0 - powerCore) / 200.0); // +50% penalty on sand
  } else if (segment.angle > 5) {
    const steepness = segment.angle / 20.0;
    powerSituational = 1.0 + ((100.0 - powerCore) / 250.0) * steepness; // Scaled uphill penalty
  } else if (segment.angle > 0) {
    powerSituational = 1.0 + ((100.0 - powerCore) / 400.0); // Small uphill penalty
  }
  
  // Acceleration: Bonus on roads, momentum recovery
  let accelSituational = 1.0;
  if (segment.terrain === 'MetalRoads') {
    accelSituational = 1.0 + ((100.0 - acceleration) / 200.0); // +50% penalty on roads
  }
  
  const momentumLoss = previousDifficulty > 1.0 
    ? (previousDifficulty - 1.0) * 0.20 // Increased from 0.15
    : 0.0;
  const accelerationRecovery = acceleration / 140.0;
  const momentumMod = 1.0 + (momentumLoss * (1.0 - accelerationRecovery));
  
  // Stability: Technical sections and difficulty
  let stabilitySituational = 1.0;
  if (segment.terrain === 'ScrapHeaps') {
    stabilitySituational = 1.0 + ((100.0 - stability) / 150.0); // +47% penalty on heaps
  }
  
  const difficultyMod = segment.difficulty > 1.0
    ? segment.difficulty * (1.0 + ((100.0 - stability) / 300.0) * (segment.difficulty - 1.0))
    : segment.difficulty;
  
  // === PART 5: DISTANCE-BASED STAT SCALING ===
  
  // Short sprints (<10km) - Acceleration & Speed matter more
  let sprintFactor = 1.0;
  if (raceDistance < 10) {
    const accelWeight = 1.0 + ((acceleration - 50.0) / 200.0); // 0.75x to 1.25x
    const speedWeight = 1.0 - ((speed - 50.0) / 400.0); // 1.125x to 0.875x
    sprintFactor = accelWeight / speedWeight; // High accel gets bonus, high speed gets slight penalty
  }
  
  // Long treks (>20km) - Power & Stability matter more  
  let trekFactor = 1.0;
  if (raceDistance > 20) {
    const powerWeight = 0.80 + ((powerCore - 50.0) / 200.0); // 0.55x to 1.05x
    const stabilityWeight = 0.85 + ((stability - 50.0) / 250.0); // 0.65x to 1.05x
    trekFactor = (powerWeight + stabilityWeight) / 2.0; // Average of both
  }
  
  // === PART 6: COMBINE ALL MODIFIERS ===
  
  // Apply synergy to power effectiveness
  const totalPowerMod = (powerUniversal * powerSituational) / powerSynergyMod;
  const totalAccelMod = accelUniversal * accelSituational * momentumMod;
  const totalStabilityMod = stabilityUniversal * stabilitySituational;
  
  // Apply distance-based scaling
  const distanceAdjustedSpeed = synergisticSpeed / (sprintFactor * trekFactor);
  
  // Randomness for this segment (±20% per segment)
  // NOTE: This is the FIRST random variation (randomMod) - there's also segmentPerformance
  // applied separately in the race loop. Backend applies both.
  const segmentSeed = Number(seed % 1000n);
  const randomMod = 0.80 + (segmentSeed / 2500.0); // 0.80 to 1.20
  
  // Calculate segment time
  const segmentLength = segment.length;
  const effectiveSpeed = distanceAdjustedSpeed / (totalPowerMod * totalAccelMod * totalStabilityMod * difficultyMod);
  const segmentTime = (segmentLength / effectiveSpeed) * randomMod;
  
  // 10x speed multiplier to reduce race times for better UX
  const finalTime = Math.max(0.1, segmentTime / 10.0);

  
  return finalTime;
}

// Calculate segment-by-segment times for a bot
function calculateBotSegmentTimes(
  trackId: number, 
  trackSeed: bigint, 
  participantIndex: number,
  stats?: { speed: number; stability: number; powerCore: number; acceleration: number; luck?: number },
  actualFinalTime?: number | null,
  faction?: string,
  preferredTerrain?: string,
  terrain?: string,
  nftId?: string,
  bonusesAlreadyApplied?: boolean,
  raceDistance?: number, // Race distance in km
  raceCreatedAt?: bigint, // Race creation timestamp for daily phenomenon
  overridePhenomenon?: PhenomenonType // Override the daily phenomenon
): SegmentTime[] {
  // Require valid stats - if undefined/invalid, return empty to prevent NaN
  if (!stats || typeof stats.speed !== 'number' || isNaN(stats.speed)) {
    console.warn('calculateBotSegmentTimes: Invalid stats for bot', nftId, stats);
    return [];
  }
  
  const track = TRACK_TEMPLATES[trackId];
  if (!track) {
    console.warn(`No track template for ID ${trackId}`);
    return [];
  }
  
  const rawStats = stats;
  
  // Apply faction + preferred terrain bonuses (only if not already applied by backend)
  const terrainType = terrain || getTerrainString(track.segments[0]?.terrain);
  const botStats = bonusesAlreadyApplied ? rawStats : applyFactionBonuses(rawStats, faction, terrainType, preferredTerrain);

  
  // Calculate distance from track segments (matches backend track.totalDistance)
  const segmentDistance = (track.segments.reduce((sum, seg) => sum + seg.length, 0) * track.laps) / 1000;
  
  // Distance is always in km
  const distanceForCalc = segmentDistance;
  
  // Get luck stat and calculate daily affinity for luck system
  const tokenIndex = nftId ? parseInt(nftId) || 0 : 0;
  const luck = stats.luck ?? 10; // Default luck if not provided
  const timestamp = raceCreatedAt ?? BigInt(Date.now() * 1_000_000);
  const dailyAffinity = calculateDailyAffinity(tokenIndex, stats, faction || '', timestamp, overridePhenomenon);

  const segmentTimes: SegmentTime[] = [];
  let cumulativeTime = 0;
  let cumulativeDistance = 0;
  let previousDifficulty = 1.0; // Start with neutral difficulty
  
  // Luck buff tracking
  let activeLuckBuff: ActiveLuckBuff | null = null;
  let currentPosition = participantIndex + 1; // Approximate - start at initial position
  const totalRacers = 8; // Approximate for luck calculation
  
  // Generate all segments (base segments * laps)
  for (let lap = 0; lap < track.laps; lap++) {
    for (let segIdx = 0; segIdx < track.segments.length; segIdx++) {
      const segment = track.segments[segIdx];
      const globalSegmentIdx = lap * track.segments.length + segIdx;
      
      // Use same seed calculation as backend
      // Backend: segmentSeed = race.trackSeed + (i * 1000) + segmentIdx
      // Backend: segmentConditionSeed = ((segmentSeed * 31337 + i * 7919 + lap * 12345) % 1000)
      const seedBase = typeof trackSeed === 'bigint' ? trackSeed : BigInt(trackSeed);
      const segmentSeed = seedBase + BigInt(participantIndex * 1000 + globalSegmentIdx);
      
      // Per-segment performance variation - modified by STABILITY and LUCK
      // CRITICAL: Must match backend exactly
      const segmentConditionSeed = Number((segmentSeed * 31337n + BigInt(participantIndex * 7919) + BigInt(lap * 12345)) % 1000n);
      
      // Stability reduces variance: 10 stability = ±25%, 50 stability = ±15%, 100 stability = ±5%
      const stability = botStats?.stability ?? 50;
      const stabilityFactor = stability / 100.0;
      const varianceRange = 0.25 - (stabilityFactor * 0.20); // 0.25 down to 0.05 at max stability
      
      // Luck shifts center point: 10 luck = 1.03 (3% slower), 50 luck = 1.0, 100 luck = 0.94 (6% faster)
      const luckAboveMin = Math.max(0, luck - 10) / 90.0; // 0.0 to 1.0
      const centerPoint = 1.03 - (luckAboveMin * 0.09); // 1.03 down to 0.94 at max luck
      
      // Calculate segment performance: centerPoint ± varianceRange
      const rawRoll = segmentConditionSeed / 500.0 - 1.0; // -1.0 to +1.0
      let segmentPerformance = centerPoint + (rawRoll * varianceRange);
      
      // RUBBER BAND: Leaders can't get exceptional performance
      // If in 1st place and rolled better than 0.95 (fast), cap at 0.98 (slightly fast)
      // This prevents runaway leaders while still allowing decent performance
      if (currentPosition === 1 && segmentPerformance < 0.95) {
        segmentPerformance = 0.98;
      }
      
      // === LUCK SYSTEM ===
      let luckBoost = 1.0;
      
      // Check for active buff first
      if (activeLuckBuff) {
        // Apply active buff (convert speed boost to time reduction)
        luckBoost = 1.0 / activeLuckBuff.procType.boost;
        
        // Decrement duration
        if (activeLuckBuff.remainingDuration > 1) {
          activeLuckBuff = {
            procType: activeLuckBuff.procType,
            appliedAtSegment: activeLuckBuff.appliedAtSegment,
            remainingDuration: activeLuckBuff.remainingDuration - 1
          };
        } else {
          activeLuckBuff = null;
        }
      } else {
        // No active buff - check for new proc using separate seed
        const luckSeed = Number((segmentSeed * 7331n + BigInt(participantIndex * 9973) + BigInt(lap * 54321)) % 10000n);
        const luckCheck = checkLuckProc(luck, dailyAffinity, currentPosition, totalRacers, luckSeed);
        
        if (luckCheck) {
          // New luck proc!
          luckBoost = 1.0 / luckCheck.boost;
          const duration = getLuckProcDuration(luckCheck);
          
          if (duration > 1) {
            activeLuckBuff = {
              procType: luckCheck,
              appliedAtSegment: globalSegmentIdx,
              remainingDuration: duration - 1
            };
          }
        } else {
          // No luck proc - check for bad luck incident (only if no positive buff)
          const badLuckSeed = Number((segmentSeed * 8887n + BigInt(participantIndex * 3331) + BigInt(lap * 77777)) % 10000n);
          const badLuckCheck = checkBadLuckIncident(luck, badLuckSeed);
          
          if (badLuckCheck) {
            // Bad luck incident! Apply penalty
            luckBoost = badLuckCheck.penalty;
          }
        }
      }
      
      const time = calculateSegmentTimeEstimate(segment, segmentSeed, botStats, previousDifficulty, distanceForCalc) * segmentPerformance * luckBoost;
      
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
    
    // Calculate current speed (m/s) based on current segment
    const currentSpeed = currentSegment ? currentSegment.distance / currentSegment.time : 0;
    
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
      return a.finalTime - b.finalTime;
    }
    if (!aFinished && bFinished) {
      return a.finalTime - b.finalTime;
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

export function RaceVisualizer({ results, trackSeed, trackId, distance, terrain, botOrder, isValidating = false, raceStartTime, raceCreatedAt, raceStatus, bonusesAlreadyApplied = false, startAtEnd = false, onRaceWatched, events = [], disableAutoplay = false, overridePhenomenon, raceId }: RaceVisualizerProps) {
  // Determine if race is currently in progress (live mode)
  // Race is live if status is InProgress
  const isLive = useMemo(() => {

    
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
  
  // Autoplay if within live window and never watched before (unless disabled)
  const shouldAutoplay = isLive && !hasWatchedBefore.current && !disableAutoplay;
  
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

  // Sort and slice events for display (memoized to prevent re-sorting on every render)
  const sortedEvents = useMemo(() => {
    return [...visibleEvents]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }, [visibleEvents]);
  
  // Memoize bot IDs for name fetching
  const botIds = useMemo(() => results.map(r => r.nftId), [results]);
  
  // Pre-calculate segment times for all bots WITH SLIPSTREAM (memoized)
  // Must simulate segment-by-segment for all bots simultaneously to match backend
  const segmentTimesMap = useMemo(() => {
    const map = new Map<string, SegmentTime[]>();
    
    // Get track info
    const track = TRACK_TEMPLATES[trackId] || { segments: [], laps: 1 };
    if (track.segments.length === 0) {
      // No track data, fall back to simple calculation
      results.forEach((result) => {
        const participantIndex = botOrder ? botOrder.indexOf(result.nftId) : results.findIndex(r => r.nftId === result.nftId);
        const segmentTimes = calculateBotSegmentTimes(
          trackId, trackSeed, participantIndex, result.stats, result.finalTime,
          result.faction, result.preferredTerrain, getTerrainString(terrain),
          result.nftId, bonusesAlreadyApplied, distance, raceCreatedAt, overridePhenomenon
        );
        map.set(result.nftId, segmentTimes);
      });
      return map;
    }
    
    // Initialize racer progress for all bots
    interface RacerProgress {
      nftId: string;
      participantIndex: number;
      stats: any;
      faction?: string;
      preferredTerrain?: string;
      cumulativeTime: number;
      previousDifficulty: number;
      segments: SegmentTime[];
      // Luck system
      activeLuckBuff: ActiveLuckBuff | null;
      dailyAffinity: number;
      currentPosition: number;
    }
    
    // Calculate race timestamp for daily phenomenon
    const timestamp = raceCreatedAt ?? BigInt(Date.now() * 1_000_000);
    
    const racerProgress: RacerProgress[] = results.map((result, idx) => {
      const tokenIndex = parseInt(result.nftId) || 0;
      const luck = result.stats?.luck ?? 10;
      return {
        nftId: result.nftId,
        participantIndex: botOrder ? botOrder.indexOf(result.nftId) : results.findIndex(r => r.nftId === result.nftId),
        stats: result.stats,
        faction: result.faction,
        preferredTerrain: result.preferredTerrain,
        cumulativeTime: 0,
        previousDifficulty: 1.0,
        segments: [],
        // Luck system
        activeLuckBuff: null,
        dailyAffinity: calculateDailyAffinity(tokenIndex, result.stats || { speed: 10, powerCore: 10, acceleration: 10, stability: 10 }, result.faction || '', timestamp, overridePhenomenon),
        currentPosition: 0, // Will be set after sorting
      };
    }).sort((a, b) => a.participantIndex - b.participantIndex); // CRITICAL: Sort by participantIndex to match backend order
    
    // Set initial positions AFTER sorting (all start equal, so position = participantIndex + 1)
    racerProgress.forEach((r, idx) => {
      r.currentPosition = idx + 1;
    });
    
    // DEBUG: Log all bots' affinities for race 724
    if (raceId === 724) {
      console.log('=== RACE 724 BOT AFFINITIES ===');
      racerProgress.forEach((r, idx) => {
        console.log(`Bot ${r.nftId} (idx ${idx}, partIdx ${r.participantIndex}): luck=${r.stats?.luck ?? 10}, dailyAffinity=${r.dailyAffinity}`);
      });
    }
    
    const terrainType = getTerrainString(terrain);
    const segmentDistance = (track.segments.reduce((sum, seg) => sum + seg.length, 0) * track.laps) / 1000;
    // Distance is always in km (both from backend races and simulator)
    const distanceForCalc = (distance && distance > 0) ? distance : segmentDistance;
    
    // Simulate segment by segment for all bots
    for (let lap = 0; lap < track.laps; lap++) {
      for (let segIdx = 0; segIdx < track.segments.length; segIdx++) {
        const segment = track.segments[segIdx];
        const globalSegmentIdx = lap * track.segments.length + segIdx;
        
        // Calculate times for all bots in this segment (process in order like backend)
        for (let i = 0; i < racerProgress.length; i++) {
          const racer = racerProgress[i];
          
          // Apply faction bonuses if needed
          const rawStats = racer.stats;
          const botStats = bonusesAlreadyApplied ? rawStats : applyFactionBonuses(
            rawStats, racer.faction, terrainType, racer.preferredTerrain
          );
          
          if (!botStats) continue;
          
          // Calculate seed
          const seedBase = typeof trackSeed === 'bigint' ? trackSeed : BigInt(trackSeed);
          const segmentSeed = seedBase + BigInt(racer.participantIndex * 1000 + globalSegmentIdx);
          
          // Calculate base segment time
          let segmentTime = calculateSegmentTimeEstimate(
            segment, segmentSeed, botStats, racer.previousDifficulty, distanceForCalc
          );
          
          // Check for slipstream BEFORE applying performance variation
          // This happens BEFORE updating cumulative time (uses time at START of this segment)
          let slipstreamBonus = 1.0;
          const currentTime = racer.cumulativeTime;
          
          for (let j = 0; j < racerProgress.length; j++) {
            if (i !== j) {
              const otherRacer = racerProgress[j];
              const timeDiff = currentTime - otherRacer.cumulativeTime;
              
              // In slipstream if 0.5-2.5 seconds behind
              // Note: otherRacer.cumulativeTime is already updated if j < i (processed earlier this segment)
              if (timeDiff > 0.5 && timeDiff < 2.5) {
                slipstreamBonus = 0.95;
                break;
              }
            }
          }
          
          // Apply segment performance variation - modified by STABILITY and LUCK
          const segmentConditionSeed = Number((segmentSeed * 31337n + BigInt(racer.participantIndex * 7919) + BigInt(lap * 12345)) % 1000n);
          
          // Stability reduces variance: 10 stability = ±25%, 50 stability = ±15%, 100 stability = ±5%
          const stability = racer.stats?.stability ?? 50;
          const stabilityFactor = stability / 100.0;
          const varianceRange = 0.25 - (stabilityFactor * 0.20); // 0.25 down to 0.05 at max stability
          
          // Luck shifts center point: 10 luck = 1.03 (3% slower), 50 luck = 1.0, 100 luck = 0.94 (6% faster)
          const segLuck = racer.stats?.luck ?? 10;
          const luckAboveMin = Math.max(0, segLuck - 10) / 90.0; // 0.0 to 1.0
          const centerPoint = 1.03 - (luckAboveMin * 0.09); // 1.03 down to 0.94 at max luck
          
          // Calculate segment performance: centerPoint ± varianceRange
          const rawRoll = segmentConditionSeed / 500.0 - 1.0; // -1.0 to +1.0
          let segmentPerformance = centerPoint + (rawRoll * varianceRange);
          
          // RUBBER BAND: Leaders can't get exceptional performance
          // If in 1st place and rolled better than 0.95 (fast), cap at 0.98 (slightly fast)
          if (racer.currentPosition === 1 && segmentPerformance < 0.95) {
            segmentPerformance = 0.98;
          }
          
          // DEBUG: Log seed calculation for first segment (only for race 724)
          if (raceId === 724 && globalSegmentIdx === 0 && i === 0) {
            console.log('=== FRONTEND SEED DEBUG (Race 724, Bot 0, Seg 0) ===');
            console.log('trackSeed:', trackSeed.toString());
            console.log('participantIndex:', racer.participantIndex);
            console.log('i (loop index):', i);
            console.log('globalSegmentIdx:', globalSegmentIdx);
            console.log('lap:', lap);
            console.log('segmentSeed:', segmentSeed.toString());
            console.log('segmentConditionSeed:', segmentConditionSeed);
            console.log('segmentPerformance:', segmentPerformance);
            console.log('stats:', racer.stats);
            console.log('dailyAffinity:', racer.dailyAffinity);
            console.log('luck:', racer.stats?.luck ?? 10);
            // Also log what randomMod would be (inside calculateSegmentTimeEstimate)
            const innerSeed = Number(segmentSeed % 1000n);
            const randomMod = 0.80 + (innerSeed / 2500.0);
            console.log('innerSeed (for randomMod):', innerSeed);
            console.log('randomMod (inside function):', randomMod);
            console.log('baseSegmentTime (from function):', segmentTime);
          }
          
          // === LUCK SYSTEM ===
          let luckBoost = 1.0;
          const luck = racer.stats?.luck ?? 10;
          
          // Check for active buff first
          if (racer.activeLuckBuff) {
            // Apply active buff (convert speed boost to time reduction)
            luckBoost = 1.0 / racer.activeLuckBuff.procType.boost;
            
            // Decrement duration
            if (racer.activeLuckBuff.remainingDuration > 1) {
              racer.activeLuckBuff = {
                procType: racer.activeLuckBuff.procType,
                appliedAtSegment: racer.activeLuckBuff.appliedAtSegment,
                remainingDuration: racer.activeLuckBuff.remainingDuration - 1
              };
            } else {
              racer.activeLuckBuff = null;
            }
          } else {
            // No active buff - check for new proc using separate seed (matches backend)
            const luckSeed = Number((segmentSeed * 7331n + BigInt(racer.participantIndex * 9973) + BigInt(lap * 54321)) % 10000n);
            const luckCheck = checkLuckProc(luck, racer.dailyAffinity, racer.currentPosition, racerProgress.length, luckSeed);
            
            // DEBUG: Log luck check for ALL bots in ALL races
            console.log(`LUCK CHECK: Bot ${racer.nftId} seg ${globalSegmentIdx} | pos ${racer.currentPosition}/${racerProgress.length} | aff ${racer.dailyAffinity} | seed ${luckSeed} | result: ${luckCheck ? luckCheck.type : 'none'}`);
            
            if (luckCheck) {
              // New luck proc!
              luckBoost = 1.0 / luckCheck.boost;
              const duration = getLuckProcDuration(luckCheck);
              
              if (duration > 1) {
                racer.activeLuckBuff = {
                  procType: luckCheck,
                  appliedAtSegment: globalSegmentIdx,
                  remainingDuration: duration - 1
                };
              }
            } else {
              // No luck proc - check for bad luck incident
              // RUBBER BAND: Bad luck ONLY affects leaders (top half of field)
              const halfField = racerProgress.length <= 2 ? 1 : Math.floor(racerProgress.length / 2);
              
              if (racer.currentPosition <= halfField) {
                // Leader is vulnerable to bad luck
                const badLuckSeed = Number((segmentSeed * 8887n + BigInt(racer.participantIndex * 3331) + BigInt(lap * 77777)) % 10000n);
                const badLuckCheck = checkBadLuckIncident(luck, badLuckSeed);
                
                if (badLuckCheck) {
                  // Bad luck incident! Apply penalty
                  luckBoost = badLuckCheck.penalty;
                }
              }
              // Underdogs (bottom half) are protected from bad luck
            }
          }
          
          segmentTime = segmentTime * segmentPerformance * slipstreamBonus * luckBoost;
          
          // Debug logging for first 3 segments (only for race 724)
          if (raceId === 724 && globalSegmentIdx < 3) {
            console.log(`=== FRONTEND SEGMENT ${globalSegmentIdx} BOT ${i} (${racer.nftId}) ===`);
            console.log(`participantIndex: ${racer.participantIndex}`);
            console.log(`Stats:`, botStats);
            console.log(`segmentSeed: ${segmentSeed.toString()}`);
            console.log(`segmentConditionSeed: ${segmentConditionSeed}`);
            console.log(`segmentPerformance: ${segmentPerformance}`);
            console.log(`slipstreamBonus: ${slipstreamBonus}`);
            console.log(`luckBoost: ${luckBoost}`);
            console.log(`baseSegmentTime (before perf/slipstream/luck): ${(segmentTime / (segmentPerformance * slipstreamBonus * luckBoost)).toFixed(4)}`);
            console.log(`segmentTime (final): ${segmentTime.toFixed(4)}`);
            console.log(`cumulativeTime: ${(racer.cumulativeTime + segmentTime).toFixed(4)}`);
          }
          
          // Update cumulative time IMMEDIATELY (so next bot sees updated time)
          racer.cumulativeTime += segmentTime;
          racer.previousDifficulty = segment.difficulty;
          
          racer.segments.push({
            segmentIndex: globalSegmentIdx,
            time: segmentTime,
            cumulativeTime: racer.cumulativeTime,
            distance: segment.length,
            cumulativeDistance: racer.segments.reduce((sum, s) => sum + s.distance, 0) + segment.length
          });
        }
        
        // Update positions after all bots finish this segment (for luck underdog calculation)
        const sortedByTime = [...racerProgress].sort((a, b) => a.cumulativeTime - b.cumulativeTime);
        sortedByTime.forEach((racer, idx) => {
          racer.currentPosition = idx + 1;
        });
      }
    }
    
    // Store results
    racerProgress.forEach((racer) => {
      map.set(racer.nftId, racer.segments);
    });
    
    return map;
  }, [results, trackId, trackSeed, bonusesAlreadyApplied, botOrder, terrain, distance, raceCreatedAt, overridePhenomenon]);
  
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
  // Returns distance in meters for position calculations
  const actualTrackDistance = useMemo(() => {
    const track = TRACK_TEMPLATES[trackId];
    if (!track) {
      return distance * 1000; // Distance is in km, convert to meters
    }
    const dist = track.segments.reduce((sum, seg) => sum + seg.length, 0) * track.laps;
    return dist; // Already in meters from segment lengths
  }, [trackId, distance]);
  
  // Sort results by botOrder to maintain registration order for stable lanes
  const sortedResults = useMemo(() => {
    if (!botOrder) return results;
    return [...results].sort((a, b) => {
      const indexA = botOrder.indexOf(a.nftId);
      const indexB = botOrder.indexOf(b.nftId);
      // Handle case where nftId isn't in botOrder (shouldn't happen but be defensive)
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [results, botOrder]);
  
  // Calculate current positions using segment-based simulation
  // Don't memoize since currentTime changes every frame - memoization adds overhead without benefit
  const positions = simulateRaceProgression(sortedResults, trackSeed, trackId, currentTime, segmentTimesMap);
  
  // Use positions directly - they're already in registration order from sortedResults
  const stablePositions = positions;
  
  // Sort positions for leaderboard (don't memoize - positions change every frame)
  const sortedPositions = [...stablePositions].sort((a, b) => a.position - b.position);
  
  // Calculate leader time (don't memoize - changes every frame)
  const leaderTime = Math.min(...stablePositions.map(b => b.finalTime));
  
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
    if (terrainStr === 'ScrapHeaps') return '🔩';
    if (terrainStr === 'WastelandSand') return '🏜️';
    if (terrainStr === 'MetalRoads') return '🛣️';
    return '🏁';
  };

  const trackName = TRACK_NAMES[trackId] || TRACK_NAMES[0];
  
  // Calculate validation: compare server times vs local calculated times
  const timeValidation = useMemo(() => {
    const validations = results.map(result => {
      const localBot = positions.find(p => p.nftId === result.nftId);
      // Skip if: DNF, no result yet (null finalTime), zero finalTime (not calculated yet), or no local bot data
      if (!localBot || result.finalTime === null || result.finalTime === 0 || result.finalTime > 100000) return null;
      const serverTime = result.finalTime;
      const localTime = localBot.finalTime;
      const diff = Math.abs(serverTime - localTime);
      const percentDiff = (diff / serverTime) * 100;
      
      // Debug: log the comparison (only for race 712)
      if (raceId === 712) {
        console.log(`=== TIME VALIDATION for ${result.nftId} ===`);
        console.log(`Server time: ${serverTime}`);
        console.log(`Local time: ${localTime}`);
        console.log(`Diff: ${diff} (${percentDiff.toFixed(2)}%)`);
      }
      
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
            {/* Active Phenomenon */}
            {(() => {
              const phenomenon = overridePhenomenon ?? getCurrentPhenomenon(raceCreatedAt ?? BigInt(Date.now() * 1_000_000));
              const display = PHENOMENA_DISPLAY[phenomenon];
              return (
                <span 
                  className={`text-xs px-2 py-0.5 rounded-full border border-current/30 whitespace-nowrap ${display.color}`}
                  title={`Daily Phenomenon: ${display.name} - affects luck procs for bots with matching affinities`}
                >
                  {display.emoji} {display.name}
                </span>
              );
            })()}
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
                
                // Get bot's stats for overcharge/perfectTuneUp indicator
                const result = results.find(r => r.nftId === bot.nftId);
                const overcharge = result?.stats?.overcharge ?? 0;
                const isPerfectTuneUp = result?.stats?.perfectTuneUp === true;
                const hasOvercharge = overcharge > 0 || isPerfectTuneUp;
                const maxOvercharge = 40;
                const overchargePercent = Math.round((overcharge / maxOvercharge) * 100);
                
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
                    title={`#${livePosition} - ${Math.round(bot.distance)}m / ${Math.round(actualTrackDistance)}m`}
                  >
                    <div className="relative">
                      {/* Position badge */}
                      <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2 z-20 ${
                        livePosition === 1 ? 'bg-yellow-500 border-yellow-400 text-black' :
                        livePosition === 2 ? 'bg-gray-300 border-gray-400 text-black' :
                        livePosition === 3 ? 'bg-orange-600 border-orange-500 text-white' :
                        'bg-primary/80 border-primary text-primary-foreground'
                      }`}>
                        {livePosition}
                      </div>
                      
                      {/* Bot avatar with overcharge/perfect tune-up indicator */}
                      <div className={`relative ${isFinished ? 'animate-pulse' : ''}`}>
                        {/* Overcharge/Perfect Tune-Up radial progress ring */}
                        {hasOvercharge && (
                          <svg 
                            className="absolute w-[36px] h-[36px] -rotate-90 z-10 pointer-events-none" 
                            style={{ left: '-2px', top: '-2px' }}
                          >
                            {/* Background ring */}
                            <circle
                              cx="18"
                              cy="18"
                              r="17"
                              fill="none"
                              stroke={isPerfectTuneUp ? "rgba(249, 115, 22, 0.3)" : "rgba(6, 182, 212, 0.3)"}
                              strokeWidth="2"
                            />
                            {/* Progress ring */}
                            <circle
                              cx="18"
                              cy="18"
                              r="17"
                              fill="none"
                              stroke={isPerfectTuneUp ? "rgb(249, 115, 22)" : "rgb(6, 182, 212)"}
                              strokeWidth="2"
                              strokeDasharray={`${(overchargePercent / 100) * 106.8} 106.8`}
                              strokeLinecap="round"
                              className={isPerfectTuneUp ? "animate-pulse" : ""}
                              style={{ 
                                filter: isPerfectTuneUp 
                                  ? 'drop-shadow(0 0 4px rgba(249, 115, 22, 0.8))' 
                                  : 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.6))',
                                ...(isPerfectTuneUp ? { animationDuration: '1.5s' } : {})
                              }}
                            />
                          </svg>
                        )}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-4">
          {/* Live Positions - Left Column */}
          <div className={`bg-card/50 border border-primary/20 rounded-lg p-3 ${events.length > 0 ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Live Positions
            </h3>
            <BotNamesFetcher botIds={botIds}>
              {(botNames) => (
            <div className="space-y-1.5">
              {/* Sort by current race position (live standings) */}
              {sortedPositions.map((bot) => {
                const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(bot.nftId));
                const imageUrl = generateExtThumbnailLink(tokenId);
                const isFinished = bot.progress >= 99.9 || currentTime >= bot.finalTime;
                const isDNF = bot.finalTime > 100000;
                const livePosition = bot.position;
                const timeBehind = bot.finalTime - leaderTime;
                const result = results.find(r => r.nftId === bot.nftId);
                const rating = result?.rating || (result?.stats ? 
                  Math.round((result.stats.speed + result.stats.stability + result.stats.powerCore + result.stats.acceleration) / 4) : null);
                const botName = botNames.get(bot.nftId) || `Bot #${bot.nftId}`;
                
                // Get overcharge/perfectTuneUp for indicator
                const overcharge = result?.stats?.overcharge ?? 0;
                const isPerfectTuneUp = result?.stats?.perfectTuneUp === true;
                const hasOvercharge = overcharge > 0 || isPerfectTuneUp;
                const maxOvercharge = 40;
                const overchargePercent = Math.round((overcharge / maxOvercharge) * 100);
                
                // Calculate effective luck (base luck + daily affinity) / 2
                const tokenIndex = parseInt(bot.nftId) || 0;
                const baseLuck = result?.stats?.luck ?? 10;
                const timestamp = raceCreatedAt ?? BigInt(Date.now() * 1_000_000);
                const dailyAffinity = result?.stats ? calculateDailyAffinity(
                  tokenIndex,
                  result.stats,
                  result.faction || '',
                  timestamp,
                  overridePhenomenon
                ) : 0;
                const effectiveLuck = Math.round((baseLuck + dailyAffinity) / 2);
                
                return (
                  <div 
                    key={bot.nftId} 
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                      livePosition === 1 ? 'bg-yellow-500/10 border-yellow-500/30' :
                      livePosition === 2 ? 'bg-gray-500/10 border-gray-500/30' :
                      livePosition === 3 ? 'bg-orange-600/10 border-orange-600/30' :
                      'bg-card/30 border-primary/10 hover:border-primary/20'
                    }`}
                  >
                    <span className={`font-bold w-7 text-center ${
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
                    <div className="relative w-8 h-8 flex-shrink-0">
                      {/* Overcharge/Perfect Tune-Up square ring indicator */}
                      {hasOvercharge && (
                        <svg 
                          className="absolute w-[36px] h-[36px] z-10 pointer-events-none" 
                          style={{ left: '-2px', top: '-2px' }}
                        >
                          {/* Background ring - rounded rectangle */}
                          <rect
                            x="1"
                            y="1"
                            width="34"
                            height="34"
                            rx="4"
                            ry="4"
                            fill="none"
                            stroke={isPerfectTuneUp ? "rgba(249, 115, 22, 0.3)" : "rgba(6, 182, 212, 0.3)"}
                            strokeWidth="2"
                          />
                          {/* Progress ring - animated border */}
                          <rect
                            x="1"
                            y="1"
                            width="34"
                            height="34"
                            rx="4"
                            ry="4"
                            fill="none"
                            stroke={isPerfectTuneUp ? "rgb(249, 115, 22)" : "rgb(6, 182, 212)"}
                            strokeWidth="2"
                            strokeDasharray={`${(overchargePercent / 100) * 136} 136`}
                            strokeLinecap="round"
                            className={isPerfectTuneUp ? "animate-pulse" : ""}
                            style={{ 
                              filter: isPerfectTuneUp 
                                ? 'drop-shadow(0 0 3px rgba(249, 115, 22, 0.8))' 
                                : 'drop-shadow(0 0 2px rgba(6, 182, 212, 0.6))',
                              ...(isPerfectTuneUp ? { animationDuration: '1.5s' } : {})
                            }}
                          />
                        </svg>
                      )}
                      <img
                        src={imageUrl}
                        alt={botName}
                        className={`w-8 h-8 rounded border shadow-sm ${
                          hasOvercharge
                            ? isPerfectTuneUp 
                              ? 'border-orange-500/50'
                              : 'border-cyan-400/50'
                            : 'border-primary/40'
                        }`}
                      />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-mono text-xs font-semibold">{botName}</span>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {rating && <span>⭐ {rating}</span>}
                      </div>
                    </div>
                    {!isDNF && !isFinished && (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {(bot.distance / 1000).toFixed(2)}km
                        </span>
                        <span className="text-primary font-bold text-xs">
                          {bot.currentSpeed.toFixed(1)}m/s
                        </span>
                      </div>
                    )}
                    {isFinished && !isDNF && (
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground font-mono text-xs font-semibold">
                            {bot.finalTime.toFixed(2)}s
                          </span>
                          <span className="text-green-500 font-bold">✓</span>
                        </div>
                        {livePosition > 1 && (
                          <span className="text-red-500 text-[10px] font-mono">
                            +{timeBehind.toFixed(2)}s
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
              )}
            </BotNamesFetcher>
          </div>
          
          {/* Event Feed - Right Column */}
          {events.length > 0 && (
            <div className="bg-card/50 border border-primary/20 rounded-lg p-3 lg:col-span-1 max-h-[500px] overflow-y-auto">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Radio className="w-4 h-4" />
                Race Commentary
              </h3>
              <BotNamesFetcher botIds={botIds}>
                {(botNames) => (
                  <div className="space-y-2">
                    {visibleEvents.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Race starting...</p>
                    ) : (
                      sortedEvents.map((event, idx) => {
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
                    } else if ('LuckProc' in event.eventType) {
                      icon = <Sparkles className="w-3 h-3" />;
                      colorClass = "text-cyan-400";
                    } else if ('BadLuck' in event.eventType) {
                      icon = <AlertTriangle className="w-3 h-3" />;
                      colorClass = "text-red-400";
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
                          <p className="text-xs leading-tight">
                            <EventDescription event={event} botNames={botNames} />
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                  </div>
                )}
              </BotNamesFetcher>
            </div>
          )}
        </div>
        
        {/* Final results summary - only show after animation completes */}
        {animationCompleted && (
          <div className="mt-6 pt-4 border-t border-primary/20">
            <h3 className="text-sm font-semibold mb-3">Final Results:</h3>
            <BotNamesFetcher botIds={botIds}>
              {(botNames) => (
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[...stablePositions]
                .filter(r => r.finalTime < 100000)
                .sort((a, b) => a.position - b.position)
                .slice(0, 3)
                .map((result, idx) => {
                const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(result.nftId));
                const imageUrl = generateExtThumbnailLink(tokenId);
                const localTime = result.finalTime;
                const botName = botNames.get(result.nftId) || `Bot #${result.nftId}`;
                
                return (
                  <div key={result.nftId} className="flex flex-col items-center gap-1 p-2 bg-card/50 rounded border border-primary/20">
                    <div className="text-lg">
                      {idx === 0 && '🥇'}
                      {idx === 1 && '🥈'}
                      {idx === 2 && '🥉'}
                    </div>
                    <img
                      src={imageUrl}
                      alt={botName}
                      className="w-8 h-8 rounded"
                    />
                    <span className="font-mono text-xs font-semibold">{botName}</span>
                    <span className="text-muted-foreground">{localTime.toFixed(2)}s</span>
                  </div>
                );
              })}
            </div>
              )}
            </BotNamesFetcher>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
