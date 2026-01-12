import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Derives terrain preference from background color and faction
 * Based on NFT metadata background attribute
 * 
 * All colors: black, black stars, blue, bones, brown, dark blue, dark brown, 
 * dark grey, dark planets, dark purple, dark red grey, green, grey, grey blue, 
 * grey planets, light blue, light grey, light purple, master gold, mid blue, 
 * muted purple, muted red, muted yellow, purple, red, teal
 */
export function getTerrainPreference(
  backgroundColor: string | undefined,
  faction: string
): 'ScrapHeaps' | 'WastelandSand' | 'MetalRoads' {
  if (!backgroundColor) {
    // Fallback based on faction if no background
    if (faction === 'Blackhole') return 'MetalRoads';
    if (faction === 'Box') return 'ScrapHeaps';
    if (faction === 'Game') return 'WastelandSand';
    return 'ScrapHeaps';
  }

  const bg = backgroundColor.toLowerCase();

  // MetalRoads: Purple shades, darker blues, teals, space themes (industrial/tech/space aesthetic)
  if (
    bg.includes('purple') ||
    bg.includes('teal') ||
    bg === 'dark blue' ||
    bg === 'grey blue' ||
    bg.includes('planets') ||
    bg === 'black stars' ||
    bg === 'master gold'
  ) {
    return 'MetalRoads';
  }

  // WastelandSand: Warm colors, light/mid blues, reds, bones (desert/sand aesthetic)
  if (
    bg.includes('red') ||
    bg.includes('yellow') ||
    bg === 'bones' ||
    bg === 'light blue' ||
    bg === 'mid blue' ||
    bg === 'blue'
  ) {
    return 'WastelandSand';
  }

  // ScrapHeaps: Greys, browns, blacks, greens (junkyard aesthetic)
  // Includes: black, brown, dark brown, dark grey, green, grey, light grey, dark red grey
  return 'ScrapHeaps';
}

export function getTerrainIcon(terrain: 'ScrapHeaps' | 'WastelandSand' | 'MetalRoads' | any): string {
  // Handle variant object format from backend: { ScrapHeaps: null }
  let terrainStr: string;
  if (typeof terrain === 'object' && terrain !== null) {
    terrainStr = Object.keys(terrain)[0];
  } else {
    terrainStr = terrain;
  }
  
  switch (terrainStr) {
    case 'ScrapHeaps':
      return '🔩';
    case 'WastelandSand':
      return '🏜️';
    case 'MetalRoads':
      return '🛣️';
    default:
      console.warn('Unknown terrain type:', terrainStr);
      return '🏁';
  }
}

export function getTerrainName(terrain: 'ScrapHeaps' | 'WastelandSand' | 'MetalRoads'): string {
  switch (terrain) {
    case 'ScrapHeaps':
      return 'Scrap Heaps';
    case 'WastelandSand':
      return 'Wasteland Sand';
    case 'MetalRoads':
      return 'Metal Roads';
  }
}

export function getFactionTerrainBonus(faction: string, terrain: 'ScrapHeaps' | 'WastelandSand' | 'MetalRoads'): string | null {
  if (faction === 'Blackhole' && terrain === 'MetalRoads') return '+12%';
  if (faction === 'Box' && terrain === 'ScrapHeaps') return '+10%';
  if (faction === 'Game' && terrain === 'WastelandSand') return '+8%';
  return null;
}

export function getFactionSpecialTerrain(faction: string): { terrain: 'ScrapHeaps' | 'WastelandSand' | 'MetalRoads'; bonus: string } | null {
  if (faction === 'Blackhole') return { terrain: 'MetalRoads', bonus: '+12%' };
  if (faction === 'Box') return { terrain: 'ScrapHeaps', bonus: '+10%' };
  if (faction === 'Game') return { terrain: 'WastelandSand', bonus: '+8%' };
  return null;
}

export function getFactionBonus(faction: string): string {
  switch (faction) {
    case 'UltimateMaster':
      return '+15% all stats';
    case 'Wild':
      return '+20% Accel, -10% Stab';
    case 'Golden':
      return '+7% (90%+ condition)';
    case 'Ultimate':
      return '⚔️ +12% Speed/Accel';
    case 'Blackhole':
      return '🌌 +3 spd/accel on world buffs';
    case 'Dead':
      return '💀 +10% Power, +8% Stab';
    case 'Master':
      return '🎯 +12% Speed, +8% Power';
    case 'Bee':
      return '🐝 +10% Accel';
    case 'Food':
      return '🍖 +8% condition recovery';
    case 'Box':
      return '📦 5% triple parts chance';
    case 'Murder':
      return '🔪 +8% Speed/Accel';
    case 'Game':
      return '🎮 +10 parts every 5th';
    case 'Animal':
      return '⚡ +3% all stats';
    case 'Industrial':
      return '💪 +5% Power/Stab';
    default:
      return '+5% base';
  }
}
