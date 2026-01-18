import { useMemo } from 'react';
import { Link } from 'react-router-dom';

// 13-day phenomenon cycle
const PHENOMENA = [
  { name: 'Solar Flare', emoji: '☀️', description: 'Power Core digit 7 = +60%, even tokens = +30%', color: 'from-amber-500/20 to-orange-500/20', textColor: 'text-amber-400' },
  { name: 'Rust Storm', emoji: '🌪️', description: 'Stability digit 2/8 = +60%, token%13=2 = +40%', color: 'from-orange-700/20 to-red-800/20', textColor: 'text-orange-400' },
  { name: 'Metal Resonance', emoji: '⚡', description: 'Speed digit 3 = +60%, prime tokens = +45%', color: 'from-blue-400/20 to-cyan-400/20', textColor: 'text-cyan-400' },
  { name: 'Gravity Flux', emoji: '🌀', description: 'Accel digit 4 = +60%, token%4=0 = +35%', color: 'from-purple-500/20 to-violet-500/20', textColor: 'text-purple-400' },
  { name: 'Scrap Tornado', emoji: '🔩', description: 'Wild faction = +70%, token 00-19 suffix = +40%', color: 'from-gray-500/20 to-slate-600/20', textColor: 'text-slate-300' },
  { name: 'Dead Zone', emoji: '💀', description: 'Dead faction = +60%, token has 6/13/66/666 = +45%', color: 'from-gray-800/20 to-zinc-900/20', textColor: 'text-zinc-400' },
  { name: 'Golden Hour', emoji: '✨', description: 'Golden faction = +65%, token%7=0 = +40%', color: 'from-yellow-400/20 to-amber-400/20', textColor: 'text-yellow-400' },
  { name: 'Machine Ghost', emoji: '👻', description: 'Master/Ultimate = +55%, token>5000 = +40%', color: 'from-slate-400/20 to-gray-500/20', textColor: 'text-slate-300' },
  { name: 'Blood Moon', emoji: '🌙', description: 'Murder faction = +50%, token%9=0 = +40%', color: 'from-red-700/20 to-rose-900/20', textColor: 'text-red-400' },
  { name: 'Binary Surge', emoji: '🔢', description: 'Balanced stats (spread≤5) = +70%, spread≤10 = +45%', color: 'from-emerald-500/20 to-green-600/20', textColor: 'text-emerald-400' },
  { name: 'Chaos Pulse', emoji: '💥', description: 'Token%11=0 = +70%, luck stat adds bonus', color: 'from-pink-500/20 to-rose-500/20', textColor: 'text-pink-400' },
  { name: 'Momentum Shift', emoji: '🏃', description: 'Bracket underdogs (avg%10≤2) = +60%, token%12=0 = +40%', color: 'from-indigo-500/20 to-blue-600/20', textColor: 'text-indigo-400' },
  { name: 'Blackhole Singularity', emoji: '🕳️', description: 'Blackhole faction = +60%, token%13=0 = +40%', color: 'from-violet-900/20 to-purple-950/20', textColor: 'text-violet-400' },
] as const;

function getCurrentPhenomenonIndex(): number {
  const now = Date.now();
  const msPerDay = 86400 * 1000;
  return Math.floor(now / msPerDay) % 13;
}

// Helper to check if number is prime
function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

// Calculate daily affinity for a bot (0-100) - matches backend exactly
// baseAvgRating: Optional unbuffed average rating for MomentumShift calculation
export function calculateDailyAffinity(
  tokenIndex: number,
  stats: { speed: number; stability: number; powerCore: number; acceleration: number; luck?: number },
  faction: string,
  baseAvgRating?: number // Optional: raw avg rating without terrain/faction bonuses (for MomentumShift)
): number {
  const phenomenonIndex = getCurrentPhenomenonIndex();
  const phenomenonName = PHENOMENA[phenomenonIndex].name.replace(' ', '');
  let affinity = 0;
  
  switch (phenomenonName) {
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

// Get affinity color based on value
export function getAffinityColor(affinity: number): string {
  if (affinity >= 75) return 'text-green-400';
  if (affinity >= 50) return 'text-yellow-400';
  if (affinity >= 25) return 'text-orange-400';
  return 'text-red-400';
}

export function DailyPhenomenonBanner() {
  const phenomenonIndex = useMemo(() => getCurrentPhenomenonIndex(), []);
  const phenomenon = PHENOMENA[phenomenonIndex];
  
  return (
    <Link 
      to="/guides/14-luck-system" 
      className={`block w-full bg-gradient-to-r ${phenomenon.color} border-b border-primary/20 py-2 px-4 hover:brightness-110 transition-all`}
    >
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm">
        <span className="text-lg">{phenomenon.emoji}</span>
        <span className={`font-semibold ${phenomenon.textColor}`}>
          Today&apos;s Phenomenon: {phenomenon.name}
        </span>
      </div>
    </Link>
  );
}

// Export utility function for use in other components
export function getDailyPhenomenon(): typeof PHENOMENA[number] {
  return PHENOMENA[getCurrentPhenomenonIndex()];
}

export function getPhenomenonByIndex(index: number): typeof PHENOMENA[number] {
  return PHENOMENA[index % 13];
}

export { PHENOMENA };
