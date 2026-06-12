import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetBotProfilesBatch } from "@/hooks/useRacing";
import { RaceVisualizer } from '@/components/RaceVisualizer';

interface LiveRacesPanelProps {
  races: any[];
  event: any;
  botProfiles: Map<number, any>;
}

function formatTimeUntil(timestampNs: number): string {
  const now = Date.now() * 1_000_000;
  const diffMs = (timestampNs - now) / 1_000_000;
  
  if (diffMs <= 0) {
    return 'Starting soon...';
  }
  
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `in ${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `in ${minutes}m`;
  } else {
    return 'Starting soon...';
  }
}

function formatICP(amount: bigint): string {
  const icp = Number(amount) / 100_000_000;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(icp) + ' ICP';
}

function getTerrainIcon(terrain: any): string {
  if ('ScrapHeaps' in terrain) return '🔩';
  if ('WastelandSand' in terrain) return '🏜️';
  if ('MetalRoads' in terrain) return '🛣️';
  return '🏁';
}

function getTerrainName(terrain: any): string {
  if ('ScrapHeaps' in terrain) return 'Scrap Heaps';
  if ('WastelandSand' in terrain) return 'Wasteland Sand';
  if ('MetalRoads' in terrain) return 'Metal Roads';
  return 'Unknown';
}

function getRaceClassName(raceClass: any): string {
  if (!raceClass) return 'Unknown';
  if ('Scrap' in raceClass) return 'Scrap';
  if ('Junker' in raceClass) return 'Junker';
  if ('Raider' in raceClass) return 'Raider';
  if ('Elite' in raceClass) return 'Elite';
  if ('SilentKlan' in raceClass) return 'Silent Klan';
  return 'Unknown';
}

// Helper to extract faction string from Candid variant
const getFactionString = (faction: any): string => {
  if (!faction) return 'Unknown';
  const unwrapped = Array.isArray(faction) && faction.length > 0 ? faction[0] : faction;
  if (!unwrapped) return 'Unknown';
  if (typeof unwrapped === 'string') return unwrapped;
  const keys = Object.keys(unwrapped);
  return keys.length > 0 ? keys[0] : 'Unknown';
};

// Helper to extract terrain string from Candid variant
const getTerrainString = (terrain: any): string => {
  if (!terrain) return 'ScrapHeaps';
  const unwrapped = Array.isArray(terrain) && terrain.length > 0 ? terrain[0] : terrain;
  if (!unwrapped) return 'ScrapHeaps';
  if (typeof unwrapped === 'string') return unwrapped;
  const keys = Object.keys(unwrapped);
  return keys.length > 0 ? keys[0] : 'ScrapHeaps';
};

function LiveRaceCard({ race, isExpanded, botProfiles }: { race: any; isExpanded: boolean; botProfiles: any[] }) {
  const isLive = race && 'InProgress' in race.status;
  const isCompleted = race && 'Completed' in race.status;
  const isImminent = race && 'Upcoming' in race.status && Number(race.startTime) < Date.now() * 1_000_000 + 15 * 60 * 1_000_000_000;
  
  // Track if we've ever shown the visualizer - once shown, always show
  // This prevents the visualizer from disappearing mid-animation
  const hasShownVisualizerRef = useRef(false);
  
  // Buffer for live sync - matches RaceVisualizer
  const LIVE_START_BUFFER_SECONDS = 45;
  const LIVE_END_BUFFER_SECONDS = 60;
  
  // Countdown timer state for smooth animation
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  
  // Check if we're in the buffer period (race started but visualization hasn't begun)
  const raceStartNs = Number(race.startTime);
  const bufferedStartTime = raceStartNs + (LIVE_START_BUFFER_SECONDS * 1_000_000_000);
  
  // Update countdown every second when in buffer period
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now() * 1_000_000;
      const remaining = Math.ceil((bufferedStartTime - now) / 1_000_000_000);
      setCountdownSeconds(Math.max(0, remaining));
    };
    
    // Initial update
    updateCountdown();
    
    // Set up interval for smooth countdown
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [bufferedStartTime]);
  
  const now = Date.now() * 1_000_000;
  const isInBufferPeriod = isLive && now < bufferedStartTime;
  // Use the state-based countdown for smooth updates
  const bufferSecondsRemaining = countdownSeconds;
  
  // Check if race is still watchable (within end buffer after completion)
  // Use a generous 10 minute window to ensure animation can finish
  const maxRaceDuration = 10 * 60 * 1_000_000_000; // 10 minutes - generous to allow animation to finish
  const endBufferNs = LIVE_END_BUFFER_SECONDS * 1_000_000_000;
  const isStillWatchable = isCompleted && (now - raceStartNs) < (maxRaceDuration + endBufferNs);
  
  const entryCount = race.entries.length;
  const estimatedPrizePool = (Number(race.entryFee) * entryCount) + Number(race.platformBonus || 0);

  // Map results with stats
  const resultsWithStats = (race.results?.[0] || race.entries).map((r: any) => {
    const statsData = r.stats?.[0] || r.stats;
    const nftId = Number(r.nftId);
    const profile = botProfiles.find((p: any) => p && Number(p.tokenIndex) === nftId);
    
    return {
      nftId: r.nftId,
      finalTime: r.finalTime || null,
      position: r.position || 0,
      faction: getFactionString(profile?.faction),
      preferredTerrain: getTerrainString(profile?.preferredTerrain),
      stats: statsData ? {
        speed: Number(statsData.speed),
        stability: Number(statsData.stability),
        powerCore: Number(statsData.powerCore),
        acceleration: Number(statsData.acceleration),
        luck: Number(statsData.luck ?? 10),
        overcharge: Number(statsData.overcharge ?? 0),
        perfectTuneUp: statsData.perfectTuneUp === true,
        baseAvgRating: statsData.baseAvgRating ? Number(
          Array.isArray(statsData.baseAvgRating) && statsData.baseAvgRating.length > 0 
            ? statsData.baseAvgRating[0] 
            : statsData.baseAvgRating
        ) : undefined,
      } : undefined,
      dnf: r.dnf === true,
    };
  });
  
  // Determine if we have enough data to show the visualizer
  const hasTrackData = race.trackSeed && race.trackSeed !== 0 && !(Array.isArray(race.trackSeed) && race.trackSeed.length === 0);
  const hasEnoughEntries = race.entries.length >= 1; // Changed from > 1 to >= 1
  const hasStats = race.entries[0]?.stats;
  const canShowVisualizer = hasTrackData && hasEnoughEntries && hasStats;
  
  // Once we've shown the visualizer, remember it
  if (canShowVisualizer && !hasShownVisualizerRef.current) {
    hasShownVisualizerRef.current = true;
  }
  
  // Show visualizer if we can OR if we've shown it before (prevents disappearing)
  const shouldShowVisualizer = canShowVisualizer || hasShownVisualizerRef.current;

  if (isExpanded) {
    return (
      <Card className={`border-2 ${isLive ? 'border-red-500/50 bg-gradient-to-br from-red-500/5 to-orange-500/5' : 'border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-yellow-500/5'}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              {(isLive || isStillWatchable) && <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
              {getTerrainIcon(race.terrain)} {race.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={(isLive || isStillWatchable) ? "destructive" : "outline"} className={(isLive || isStillWatchable) ? "animate-pulse" : ""}>
                {isInBufferPeriod ? `🏁 Starting in ${bufferSecondsRemaining}s` : (isLive || isStillWatchable) ? '🔴 LIVE' : `⏳ ${formatTimeUntil(Number(race.startTime))}`}
              </Badge>
              <Badge variant="secondary">{getRaceClassName(race.raceClass)}</Badge>
            </div>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
            <span>{getTerrainName(race.terrain)}</span>
            <span>{race.distance.toString()}km</span>
            <span>{entryCount} racers</span>
            <span className="text-amber-400">{formatICP(BigInt(estimatedPrizePool))} prize</span>
          </div>
        </CardHeader>
        <CardContent>
          {isInBufferPeriod ? (
            /* Countdown while waiting for all clients to sync */
            <div className="py-12 text-center">
              <div className="text-7xl mb-4 animate-pulse">🏁</div>
              <h3 className="text-2xl font-bold mb-2">Race Starting Soon!</h3>
              <p className="text-muted-foreground mb-4">
                Syncing all viewers...
              </p>
              <div className="text-4xl font-mono font-bold text-primary animate-pulse">
                {bufferSecondsRemaining}s
              </div>
            </div>
          ) : !race.trackSeed || race.trackSeed === 0 || (Array.isArray(race.trackSeed) && race.trackSeed.length === 0) ? (
            /* Waiting for track data */
            <div className="py-12 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Loading Race Data...</h3>
              <p className="text-muted-foreground">
                Waiting for race simulation to begin
              </p>
            </div>
          ) : race.entries.length > 1 && race.entries[0]?.stats ? (
            <RaceVisualizer
              results={resultsWithStats}
              trackSeed={BigInt(race.trackSeed)}
              trackId={Number(race.trackId) || 1}
              distance={Number(race.distance)}
              terrain={race.terrain}
              botOrder={race.entries.map((entry: any) => entry.nftId)}
              raceStartTime={race.startTime}
              raceCreatedAt={race.createdAt}
              raceStatus={race.status}
              bonusesAlreadyApplied={true}
              events={race.events || []}
              raceId={Number(race.raceId)}
            />
          ) : (
            /* Not enough data to show visualizer */
            <div className="py-8 text-center text-muted-foreground">
              <p>Waiting for race data...</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Compact card for secondary live races
  return (
    <Card className={`border ${(isLive || isStillWatchable) ? 'border-red-500/30 bg-red-500/5' : 'border-orange-500/20 bg-orange-500/5'} hover:border-primary/50 transition-colors cursor-pointer`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(isLive || isStillWatchable) && <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
            <span className="font-semibold">{getTerrainIcon(race.terrain)} {race.name}</span>
            <Badge variant="outline" className="text-xs">{getRaceClassName(race.raceClass)}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{entryCount} racers</span>
            <Badge variant={(isLive || isStillWatchable) ? "destructive" : "secondary"} className="text-xs">
              {isInBufferPeriod ? `${bufferSecondsRemaining}s` : (isLive || isStillWatchable) ? 'LIVE' : formatTimeUntil(Number(race.startTime))}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact clickable race card for switching between races
function CompactRaceCard({ race, isSelected, onClick, botProfiles }: { 
  race: any; 
  isSelected: boolean;
  onClick: () => void;
  botProfiles: any[];
}) {
  const isLive = race && 'InProgress' in race.status;
  const isCompleted = race && 'Completed' in race.status;
  
  // Buffer for live sync
  const LIVE_START_BUFFER_SECONDS = 45;
  const LIVE_END_BUFFER_SECONDS = 60;
  const maxRaceDuration = 5 * 60 * 1_000_000_000;
  const endBufferNs = LIVE_END_BUFFER_SECONDS * 1_000_000_000;
  const raceStartNs = Number(race.startTime);
  const bufferedStartTime = raceStartNs + (LIVE_START_BUFFER_SECONDS * 1_000_000_000);
  
  // Countdown timer state for smooth animation
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  
  // Update countdown every second when in buffer period
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now() * 1_000_000;
      const remaining = Math.ceil((bufferedStartTime - now) / 1_000_000_000);
      setCountdownSeconds(Math.max(0, remaining));
    };
    
    // Initial update
    updateCountdown();
    
    // Only set up interval if we might be in buffer period (to avoid unnecessary timers)
    const now = Date.now() * 1_000_000;
    const couldBeInBuffer = isLive && now < bufferedStartTime;
    
    if (couldBeInBuffer) {
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [bufferedStartTime, isLive]);
  
  const now = Date.now() * 1_000_000;
  const isInBufferPeriod = isLive && now < bufferedStartTime;
  const bufferSecondsRemaining = countdownSeconds;
  const isStillWatchable = isCompleted && (now - raceStartNs) < (maxRaceDuration + endBufferNs);
  const isImminent = race && 'Upcoming' in race.status;
  
  const entryCount = race.entries?.length || 0;
  const className = getRaceClassName(race.raceClass);

  // Status badge content
  const getStatusContent = () => {
    if (isInBufferPeriod) return { text: `${bufferSecondsRemaining}s`, variant: 'secondary' as const };
    if (isLive || isStillWatchable) return { text: '● LIVE', variant: 'destructive' as const };
    return { text: formatTimeUntil(Number(race.startTime)), variant: 'secondary' as const };
  };
  const status = getStatusContent();

  return (
    <div 
      className={`relative rounded-lg border-2 cursor-pointer transition-all p-3 ${
        isSelected 
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20' 
          : (isLive || isStillWatchable) 
            ? 'border-red-500/40 bg-gradient-to-br from-red-500/10 to-orange-500/5 hover:border-red-500/60' 
            : 'border-muted/40 bg-card/50 hover:border-muted/60 hover:bg-card/80'
      }`}
      onClick={onClick}
    >
      {/* Top row: Status badge */}
      <div className="flex items-center justify-between mb-2">
        <Badge 
          variant={status.variant}
          className={`text-xs font-semibold ${(isLive || isStillWatchable) ? 'animate-pulse' : ''}`}
        >
          {status.text}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {className}
        </Badge>
      </div>
      
      {/* Race name */}
      <div className="font-semibold text-sm mb-1 truncate">
        {getTerrainIcon(race.terrain)} {race.name}
      </div>
      
      {/* Bottom row: Details */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{getTerrainName(race.terrain)}</span>
        <span>•</span>
        <span>{entryCount} racer{entryCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

// Compact row for the post-live completed races list
function CompletedRaceRow({ race, botProfiles }: { race: any; botProfiles: any[] }) {
  const entryCount = race.entries?.length || 0;
  const estimatedPrizePool = (Number(race.entryFee) * entryCount) + Number(race.platformBonus || 0);
  
  // Get winner info
  const winner = race.results?.[0]?.[0];
  const winnerProfile = winner ? botProfiles.find((p: any) => p && Number(p.tokenIndex) === Number(winner.nftId)) : null;
  const winnerName = winnerProfile?.name?.[0] || (winner ? `Bot #${winner.nftId}` : null);
  
  return (
    <Link
      to={`/race/${race.raceId}`}
      className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/30 hover:bg-card/60 hover:border-primary/50 transition-all"
    >
      {/* Status */}
      <div className="w-10 shrink-0 text-center">
        <span className="text-green-500 text-sm">✓</span>
      </div>
      
      {/* Race Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{getTerrainIcon(race.terrain)} {race.name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{race.distance?.toString()}km</span>
          <span>•</span>
          <span>{entryCount} racers</span>
          {winnerName && (
            <>
              <span>•</span>
              <span className="text-amber-400">🏆 {winnerName}</span>
            </>
          )}
        </div>
      </div>

      {/* Division Badge */}
      <Badge variant="outline" className="text-xs shrink-0">
        {getRaceClassName(race.raceClass)}
      </Badge>

      {/* Prize */}
      <div className="text-right shrink-0">
        <span className="text-sm font-medium text-amber-400">{formatICP(BigInt(estimatedPrizePool))}</span>
      </div>
    </Link>
  );
}

export function LiveRacesPanel({ races, event, botProfiles }: LiveRacesPanelProps) {
  const now = Date.now() * 1_000_000;
  
  // Categorize all races
  const liveRaces = races.filter(r => 'InProgress' in r.status);
  
  // Recently completed races that are still watchable (animation may still be running)
  const recentlyCompletedRaces = races.filter(r => {
    if (!('Completed' in r.status)) return false;
    const raceStartNs = Number(r.startTime);
    // Keep showing for 15 minutes after start to allow animation to complete
    return (now - raceStartNs) < (15 * 60 * 1_000_000_000);
  });
  
  const imminentRaces = races.filter(r => 
    'Upcoming' in r.status && 
    Number(r.startTime) < now + 15 * 60 * 1_000_000_000
  ).sort((a, b) => Number(a.startTime) - Number(b.startTime));

  // All completed races (for post-live list)
  const completedRaces = races.filter(r => 'Completed' in r.status)
    .sort((a, b) => Number(b.startTime) - Number(a.startTime)); // newest first
  
  // "Active" races = ones that should show in the live viewer (live + still-watchable + imminent)
  const activeRaces = [...liveRaces, ...recentlyCompletedRaces, ...imminentRaces];
  // Deduplicate (a recently completed race could appear in both lists)
  const activeRaceIds = new Set<string>();
  const deduplicatedActiveRaces = activeRaces.filter(r => {
    const id = r.raceId?.toString();
    if (activeRaceIds.has(id)) return false;
    activeRaceIds.add(id);
    return true;
  });
  
  const isLivePeriod = liveRaces.length > 0 || imminentRaces.length > 0 || recentlyCompletedRaces.length > 0;
  
  // Track which race is currently selected for viewing
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(
    deduplicatedActiveRaces[0]?.raceId?.toString() || null
  );
  
  // CRITICAL: Store the currently viewed race in a ref so it persists even when
  // the race status changes and it gets filtered out of the active list
  const currentlyViewingRaceRef = useRef<any>(null);
  
  // Find the selected race - check active races first, then ALL races as fallback
  let selectedRaceFromList = deduplicatedActiveRaces.find(r => r.raceId?.toString() === selectedRaceId);
  if (!selectedRaceFromList && selectedRaceId) {
    selectedRaceFromList = races.find(r => r.raceId?.toString() === selectedRaceId);
  }
  
  // Update the ref when we have a valid race
  if (selectedRaceFromList) {
    currentlyViewingRaceRef.current = selectedRaceFromList;
  }
  
  // Use the ref as fallback - prevents the race from disappearing mid-animation
  const selectedRace = selectedRaceFromList || currentlyViewingRaceRef.current || deduplicatedActiveRaces[0];
  
  // Build the display list: include the currently selected race even if it aged out of activeRaces
  const displayRaces = [...deduplicatedActiveRaces];
  if (selectedRace && !deduplicatedActiveRaces.some(r => r.raceId?.toString() === selectedRace.raceId?.toString())) {
    displayRaces.unshift(selectedRace);
  }
  
  // Get all bot indices for batch profile fetch (from display races + completed races for the list)
  const racesForProfiles = isLivePeriod ? displayRaces : completedRaces;
  const allBotIndices = [...new Set(racesForProfiles.flatMap(race => [
    ...race.entries.map((e: any) => Number(e.nftId)),
    ...(race.results?.[0]?.map((r: any) => Number(r.nftId)) || [])
  ]))];
  const { data: profiles = [] } = useGetBotProfilesBatch(allBotIndices);

  // ── Post-live state: all races completed, none imminent ──
  if (!isLivePeriod && completedRaces.length > 0) {
    return (
      <div className="space-y-4">
        <Card className="border-2 border-primary/20 bg-card/50">
          <CardContent className="py-8 text-center">
            <div className="text-5xl mb-3">🏁</div>
            <h3 className="text-xl font-semibold mb-1">Racing Complete</h3>
            <p className="text-muted-foreground text-sm">
              All races have finished. Click any race to watch the replay.
            </p>
          </CardContent>
        </Card>
        
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span>Race Replays</span>
            <Badge variant="outline" className="text-xs">{completedRaces.length} races</Badge>
          </h3>
          <div className="space-y-2">
            {completedRaces.map(race => (
              <CompletedRaceRow 
                key={race.raceId.toString()} 
                race={race}
                botProfiles={profiles}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── No races at all ──
  if (displayRaces.length === 0 && !selectedRace && completedRaces.length === 0) {
    return (
      <Card className="border-2 border-primary/20 bg-card/50">
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">🏁</div>
          <h3 className="text-xl font-semibold mb-2">No Live Races</h3>
          <p className="text-muted-foreground">Check the Schedule tab to see upcoming races</p>
        </CardContent>
      </Card>
    );
  }

  // ── Live period: show race selector + visualizer ──
  return (
    <div className="space-y-4">
      {/* Race selector - show all races as clickable cards when multiple */}
      {displayRaces.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span>Select Race to Watch</span>
            <Badge variant="outline" className="text-xs">{displayRaces.length} races</Badge>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {displayRaces.map(race => (
              <CompactRaceCard 
                key={race.raceId.toString()} 
                race={race}
                isSelected={race.raceId?.toString() === selectedRace?.raceId?.toString()}
                onClick={() => setSelectedRaceId(race.raceId?.toString())}
                botProfiles={profiles}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Featured/Selected race (expanded with visualizer) */}
      {selectedRace && (
        <LiveRaceCard 
          race={selectedRace} 
          isExpanded={true}
          botProfiles={profiles}
        />
      )}
    </div>
  );
}
