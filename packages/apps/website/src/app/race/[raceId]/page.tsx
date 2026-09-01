import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetRaceById, useGetBotProfilesBatch } from "@/hooks/useRacing";
import { useAuth } from '@/hooks/useAuth';
import { useNewGearFromRace } from '@/hooks/useGarage';
import { RaceVisualizer } from '@/components/RaceVisualizer';
import { BettingInterface } from '@/components/BettingInterface';
import { NewGearReveal } from '@/components/NewGearReveal';
import { getBotAvatarUrl } from '@/lib/botAvatar';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatICP(amount: bigint): string {
  const icp = Number(amount) / 100_000_000;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(icp) + ' ICP';
}

function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatTimeUntil(timestampNs: number): string {
  const now = Date.now() * 1_000_000;
  const diffMs = (timestampNs - now) / 1_000_000;
  
  if (diffMs <= 0) return 'Starting...';
  
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return 'Starting...';
}

function formatRaceTime(timeSeconds: number): string {
  return `${timeSeconds.toFixed(2)}s`;
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

function getRaceStatus(race: any): { status: string; color: string; icon: string } {
  if ('Upcoming' in race.status) {
    return { status: 'Upcoming', color: 'text-blue-500', icon: '⏳' };
  }
  if ('InProgress' in race.status) {
    return { status: 'In Progress', color: 'text-red-500', icon: '🏁' };
  }
  if ('Completed' in race.status) {
    return { status: 'Completed', color: 'text-green-500', icon: '✅' };
  }
  if ('Cancelled' in race.status) {
    return { status: 'Cancelled', color: 'text-gray-500', icon: '❌' };
  }
  return { status: 'Unknown', color: 'text-muted-foreground', icon: '❓' };
}

function getPositionBadge(position: number): string {
  if (position === 1) return '🥇';
  if (position === 2) return '🥈';
  if (position === 3) return '🥉';
  return `#${position}`;
}

function BotNameDisplay({ tokenIndex, profile, compact = false }: { tokenIndex: number; profile?: any; compact?: boolean }) {
  if (profile?.name && profile.name.length > 0 && profile.name[0]) {
    if (compact) return <>{profile.name[0]}</>;
    return <>PokedBot #{tokenIndex} - {profile.name[0]}</>;
  }
  return <>Bot #{tokenIndex}</>;
}

// ============================================================================
// RACE VISUALIZER WITH STATS
// ============================================================================

function RaceVisualizerWithStats({ results, trackSeed, trackId, distance, terrain, botOrder, raceStartTime, raceCreatedAt, raceStatus, events, startAtEnd, disableAutoplay, raceId }: {
  results: any[];
  trackSeed: bigint;
  trackId: number;
  distance: number;
  terrain: any;
  botOrder?: string[];
  raceStartTime?: bigint;
  raceCreatedAt?: bigint;
  raceStatus?: any;
  events?: any[];
  startAtEnd?: boolean;
  disableAutoplay?: boolean;
  raceId?: number;
}) {
  const botIndices = results.map(r => Number(r.nftId));
  const { data: botProfiles = [] } = useGetBotProfilesBatch(botIndices);
  const allLoaded = botProfiles.length === botIndices.length;

  if (!allLoaded) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
        <p className="text-muted-foreground">Loading race visualization...</p>
      </div>
    );
  }

  const getFactionString = (faction: any): string => {
    if (!faction) return 'Unknown';
    const unwrapped = Array.isArray(faction) && faction.length > 0 ? faction[0] : faction;
    if (!unwrapped) return 'Unknown';
    if (typeof unwrapped === 'string') return unwrapped;
    const keys = Object.keys(unwrapped);
    return keys.length > 0 ? keys[0] : 'Unknown';
  };

  const getTerrainString = (terrain: any): string => {
    if (!terrain) return 'ScrapHeaps';
    const unwrapped = Array.isArray(terrain) && terrain.length > 0 ? terrain[0] : terrain;
    if (!unwrapped) return 'ScrapHeaps';
    if (typeof unwrapped === 'string') return unwrapped;
    const keys = Object.keys(unwrapped);
    return keys.length > 0 ? keys[0] : 'ScrapHeaps';
  };

  const resultsWithStats = results.map((r: any) => {
    const statsData = r.stats && r.stats.length > 0 && r.stats[0] ? r.stats[0] : r.stats;
    const nftId = Number(r.nftId);
    const profile = botProfiles.find((p: any) => p && Number(p.tokenIndex) === nftId);
    
    const finalStats = statsData ? {
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
    } : undefined;
    
    return {
      nftId: r.nftId,
      finalTime: r.finalTime,
      position: r.position || 0,
      faction: getFactionString(profile?.faction),
      preferredTerrain: getTerrainString(profile?.preferredTerrain),
      stats: finalStats,
      dnf: r.dnf === true,
    };
  });

  return (
    <RaceVisualizer
      results={resultsWithStats}
      trackSeed={trackSeed}
      trackId={trackId}
      distance={distance}
      terrain={terrain}
      botOrder={botOrder}
      raceStartTime={raceStartTime}
      raceCreatedAt={raceCreatedAt}
      raceStatus={raceStatus}
      bonusesAlreadyApplied={true}
      events={events}
      startAtEnd={startAtEnd}
      disableAutoplay={disableAutoplay}
      raceId={raceId}
    />
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function RaceDetailsPage() {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showGearReveal, setShowGearReveal] = useState(false);
  
  const { data: race, isLoading, error } = useGetRaceById(
    raceId ? Number(raceId) : null, 
    true // Enable frequent polling for active races
  );

  // Fetch gear dropped from this race (only when logged in + completed)
  const newGear = useNewGearFromRace(raceId ? Number(raceId) : null);
  
  // Collect all bot indices for profile fetching
  const entryIndices = race?.entries?.map((e: any) => Number(e.nftId)) || [];
  const resultIndices = race?.results?.[0]?.map((r: any) => Number(r.nftId)) || [];
  const allBotIndices = [...new Set([...entryIndices, ...resultIndices])];
  const { data: botProfiles = [] } = useGetBotProfilesBatch(allBotIndices);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading race...</p>
        </div>
      </div>
    );
  }

  if (error || !race) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            ← Back
          </Button>
          <Card className="border-2 border-destructive/30 bg-card/50">
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">🏁</div>
              <h3 className="text-xl font-semibold mb-2 text-destructive">Race Not Found</h3>
              <p className="text-muted-foreground">
                The race you're looking for doesn't exist or may have been cancelled.
              </p>
              <Button onClick={() => navigate('/schedule')} className="mt-4">
                View All Events
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const raceStatusInfo = getRaceStatus(race);
  const isUpcoming = 'Upcoming' in race.status;
  const isInProgress = 'InProgress' in race.status;
  const isCompleted = 'Completed' in race.status;
  const entryCount = race.entries?.length || 0;
  const estimatedPrizePool = (Number(race.entryFee) * entryCount) + Number(race.platformBonus || 0);
  
  // Check if race can show visualizer
  const canShowVisualizer = (isInProgress || isCompleted) && 
    race.trackSeed && race.trackSeed !== BigInt(0) &&
    race.entries?.length > 1 && race.entries[0]?.stats;

  // Get results (for completed races) or use entries (for in-progress)
  const raceResults = race.results?.[0] || race.entries?.map((entry: any, idx: number) => ({
    nftId: entry.nftId,
    finalTime: null,
    position: idx + 1,
    stats: entry.stats,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            ← Back
          </Button>

          {/* Race Header */}
          <Card className="border-2 border-primary/30 bg-card/50 mb-6">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{getTerrainIcon(race.terrain)}</span>
                    <CardTitle className="text-2xl md:text-3xl">{race.name}</CardTitle>
                    {isInProgress && (
                      <Badge className="bg-red-500 animate-pulse">LIVE</Badge>
                    )}
                  </div>
                  <CardDescription className="text-base">
                    {getTerrainName(race.terrain)} • {race.distance?.toString()}km • ~{race.duration?.toString()}s
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-semibold ${raceStatusInfo.color}`}>
                    {raceStatusInfo.icon} {raceStatusInfo.status}
                  </div>
                  {isUpcoming && (
                    <div className="text-sm text-muted-foreground">
                      Starts {formatTimeUntil(Number(race.startTime))}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDate(race.startTime)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Race Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Class</p>
                  <p className="text-lg font-bold text-primary">{getRaceClassName(race.raceClass)}</p>
                </div>
                <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Entry Fee</p>
                  <p className="text-lg font-bold text-primary">{formatICP(race.entryFee)}</p>
                </div>
                <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Prize Pool</p>
                  <p className="text-lg font-bold text-amber-400">{formatICP(BigInt(estimatedPrizePool))}</p>
                </div>
                <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Racers</p>
                  <p className="text-lg font-bold text-primary">{entryCount}</p>
                </div>
              </div>

              {/* Event Link - races may be part of an event */}
              {(race as any).eventId?.[0] && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Part of event:</span>
                  <Link 
                    to={`/schedule/${(race as any).eventId[0]}`}
                    className="text-primary hover:underline"
                  >
                    View Event →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Race Visualizer - Main Feature (no wrapper card - visualizer has its own styling) */}
          {canShowVisualizer ? (
            <div className="mb-6">
              <RaceVisualizerWithStats
                results={raceResults}
                trackSeed={BigInt(race.trackSeed)}
                trackId={Number(race.trackId) || 1}
                distance={Number(race.distance)}
                terrain={race.terrain}
                botOrder={race.entries?.map((entry: any) => entry.nftId)}
                raceStartTime={race.startTime}
                raceCreatedAt={race.createdAt}
                raceStatus={race.status}
                events={race.events || []}
                disableAutoplay={false}
                raceId={Number(raceId)}
              />
            </div>
          ) : isUpcoming ? (
            /* Upcoming Race - Waiting State */
            <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-purple-500/5 mb-6">
              <CardContent className="py-12 text-center">
                <div className="text-7xl mb-4">⏳</div>
                <h3 className="text-2xl font-bold mb-2">Race Starting Soon</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  The wasteland awaits! This race begins in <span className="text-primary font-semibold">{formatTimeUntil(Number(race.startTime))}</span>.
                </p>
                <div className="flex flex-col items-center gap-3">
                  <div className="text-sm text-muted-foreground">
                    {entryCount} racer{entryCount !== 1 ? 's' : ''} registered
                  </div>
                  {entryCount < 2 && (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                      Needs at least 2 racers to start
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : isInProgress && !race.trackSeed ? (
            /* In Progress but no track data yet */
            <Card className="border-2 border-red-500/30 bg-gradient-to-br from-red-500/5 to-orange-500/5 mb-6 animate-pulse">
              <CardContent className="py-12 text-center">
                <div className="text-7xl mb-4">🏁</div>
                <h3 className="text-2xl font-bold mb-2">Race In Progress!</h3>
                <p className="text-muted-foreground mb-4">
                  Bots are racing through the wasteland. Results loading...
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">Waiting for race data...</span>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Betting Interface - for upcoming races */}
          {isUpcoming && (
            <div className="mb-6">
              <BettingInterface
                raceId={Number(raceId)}
                entryDeadline={race?.entryDeadline}
                raceStatus={race?.status}
              />
            </div>
          )}

          {/* Entrants List - for upcoming races */}
          {isUpcoming && race.entries?.length > 0 && (
            <Card className="border border-primary/20 bg-card/50 mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  🤖 Registered Racers
                  <Badge variant="outline">{race.entries.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {race.entries.map((entry: any, idx: number) => {
                    const tokenIndex = Number(entry.nftId);
                    const imageUrl = getBotAvatarUrl({ tokenIndex });
                    const profile = botProfiles.find((p: any) => p && Number(p.tokenIndex) === tokenIndex);
                    
                    return (
                      <Link 
                        key={idx} 
                        to={`/bot/${tokenIndex}`} 
                        className="block hover:bg-card/70 transition-colors rounded-lg"
                      >
                        <div className="flex items-center gap-3 p-3 border border-primary/10 rounded-lg hover:border-primary/30">
                          <img
                            src={imageUrl}
                            alt={`Bot #${tokenIndex}`}
                            className="w-10 h-10 rounded border-2 border-primary/30"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">
                              <BotNameDisplay tokenIndex={tokenIndex} profile={profile} compact />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Bot #{tokenIndex}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Race Results - for completed races */}
          {isCompleted && race.results?.[0] && (
            <Card className="border border-primary/20 bg-card/50 mb-6">
              <CardHeader>
                <CardTitle className="text-lg">🏆 Race Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {race.results[0].map((result: any, idx: number) => {
                    const tokenIndex = Number(result.nftId);
                    const imageUrl = getBotAvatarUrl({ tokenIndex });
                    const profile = botProfiles.find((p: any) => p && Number(p.tokenIndex) === tokenIndex);
                    const isDnf = result.dnf === true || result.finalTime > 99999;
                    const hasPrize = result.prizeAmount > 0n;
                    const hasParts = result.partsEarned > 0;
                    const position = idx + 1;
                    
                    return (
                      <Link 
                        key={idx} 
                        to={`/bot/${tokenIndex}`} 
                        className="block hover:bg-card/70 transition-colors rounded-lg"
                      >
                        <div className={`flex items-center gap-3 p-3 border-2 rounded-lg ${
                          position <= 3 
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : hasPrize 
                              ? 'bg-green-500/5 border-green-500/20' 
                              : 'bg-card/50 border-border/40'
                        }`}>
                          <div className="text-2xl w-10 text-center shrink-0">
                            {getPositionBadge(position)}
                          </div>
                          <img
                            src={imageUrl}
                            alt={`Bot #${tokenIndex}`}
                            className={`w-12 h-12 rounded border-2 ${position <= 3 ? 'border-amber-500/40' : 'border-border/40'}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">
                              <BotNameDisplay tokenIndex={tokenIndex} profile={profile} compact />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Bot #{tokenIndex}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {isDnf ? (
                              <Badge variant="destructive">DNF</Badge>
                            ) : (
                              <>
                                <p className="font-mono font-semibold text-primary">
                                  {formatRaceTime(Number(result.finalTime))}
                                </p>
                                {idx > 0 && race.results?.[0]?.[0]?.finalTime && (
                                  <p className="text-xs text-muted-foreground">
                                    +{(Number(result.finalTime) - Number(race.results![0]![0].finalTime)).toFixed(2)}s
                                  </p>
                                )}
                                {hasPrize && (
                                  <p className="text-sm text-green-500 font-semibold">+{formatICP(BigInt(result.prizeAmount))}</p>
                                )}
                                {hasParts && (
                                  <p className="text-xs text-amber-400">+{Number(result.partsEarned)} {result.partType || 'parts'}</p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* New Gear Loot Drops Banner */}
          {isCompleted && user && newGear.length > 0 && (
            <>
              <Card className="border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 mb-6 overflow-hidden">
                <CardContent className="py-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">🎁</div>
                      <div>
                        <h3 className="text-lg font-bold text-amber-300">
                          New Gear Dropped!
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          You earned {newGear.length} gear piece{newGear.length !== 1 ? 's' : ''} from this race
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowGearReveal(true)}
                      size="lg"
                      className="bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-bold shadow-lg"
                    >
                      🎴 Open Loot Drops
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <NewGearReveal
                gear={newGear}
                open={showGearReveal}
                onOpenChange={setShowGearReveal}
              />
            </>
          )}

          {/* Sponsors Section - only if race has sponsors */}
          {race.sponsors?.length > 0 && (
            <Card className="border border-primary/20 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">💎 Race Sponsors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {race.sponsors.map((sponsor: any, idx: number) => {
                    const sponsorPrincipal = sponsor.sponsor.toString();
                    const formatPrincipal = (principal: string): string => {
                      if (principal.length <= 12) return principal;
                      return `${principal.slice(0, 6)}...${principal.slice(-4)}`;
                    };
                    
                    const getSponsorTier = (amount: bigint): string => {
                      if (amount >= 500_000_000n) return "🏆 PLATINUM";
                      if (amount >= 200_000_000n) return "🥇 GOLD";
                      if (amount >= 50_000_000n) return "🥈 SILVER";
                      return "🥉 BRONZE";
                    };
                    
                    return (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-card/50 border border-primary/20 rounded-lg">
                        <img
                          src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${sponsorPrincipal}`}
                          alt="Sponsor avatar"
                          className="w-10 h-10 rounded-full border-2 border-primary/30"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold font-mono truncate">{formatPrincipal(sponsorPrincipal)}</p>
                          {sponsor.message?.[0] && (
                            <p className="text-xs text-muted-foreground italic mt-1">"{sponsor.message[0]}"</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-green-500">+{formatICP(sponsor.amount)}</p>
                          <p className="text-xs text-muted-foreground">{getSponsorTier(sponsor.amount)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
