import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetEventDetails, useGetRaceById, useGetBotProfile } from "@/hooks/useRacing";
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';
import { RaceVisualizer } from '@/components/RaceVisualizer';

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
  });
}

function getTerrainName(terrain: any): string {
  if ('ScrapHeaps' in terrain) return 'Scrap Heaps';
  if ('WastelandSand' in terrain) return 'Wasteland Sand';
  if ('MetalRoads' in terrain) return 'Metal Roads';
  return 'Unknown';
}

function getTerrainIcon(terrain: any): string {
  if ('ScrapHeaps' in terrain) return '🏚️';
  if ('WastelandSand' in terrain) return '🏜️';
  if ('MetalRoads' in terrain) return '🛣️';
  return '🏁';
}

function getTrackName(trackId: number): string {
  const trackNames = [
    "Default Track",
    "Scrap Mountain Circuit",
    "Highway of the Dead",
    "Wasteland Gauntlet",
    "Junkyard Sprint",
    "Metal Mesa Run"
  ];
  return trackNames[trackId] || trackNames[0];
}

function BotName({ tokenIndex }: { tokenIndex: number }) {
  const { data: botProfile } = useGetBotProfile(tokenIndex);
  
  if (botProfile?.name && botProfile.name.length > 0 && botProfile.name[0]) {
    return <>PokedBot #{tokenIndex} - {botProfile.name[0]}</>;
  }
  
  return <>PokedBot #{tokenIndex}</>;
}

function RaceVisualizerWithStats({ results, trackSeed, trackId, distance, terrain, botOrder, raceStartTime, raceStatus }: {
  results: any[];
  trackSeed: bigint;
  trackId: number;
  distance: number;
  terrain: any;
  botOrder?: string[];
  raceStartTime?: bigint;
  raceStatus?: any;
}) {
  // Fetch bot profiles for faction and preferredTerrain (not in stats snapshot)
  const botProfiles = results.map(r => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = useGetBotProfile(Number(r.nftId));
    return data;
  });

  const allLoaded = botProfiles.every(p => p !== undefined);

  if (!allLoaded) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <p className="text-muted-foreground">Loading race visualization...</p>
      </div>
    );
  }

  // Map results with stats from entries and faction/terrain from profiles
  const resultsWithStats = results.map((r: any, idx: number) => {
    // Backend might return stats as optional array [stats] or direct object
    const statsData = r.stats && r.stats.length > 0 && r.stats[0] ? r.stats[0] : r.stats;
    
    const finalStats = statsData ? {
      speed: Number(statsData.speed),
      stability: Number(statsData.stability),
      powerCore: Number(statsData.powerCore),
      acceleration: Number(statsData.acceleration),
    } : undefined;
    
    return {
      nftId: r.nftId,
      finalTime: r.finalTime,
      position: r.position || 0,
      // Don't pass faction/preferredTerrain since bonuses are already applied in stats
      faction: 'Unknown', // Dummy value, won't be used
      preferredTerrain: 'ScrapHeaps', // Dummy value, won't be used
      stats: finalStats,
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
      raceStatus={raceStatus}
      bonusesAlreadyApplied={true}
    />
  );
}


function RaceCard({ raceId }: { raceId: bigint }) {
  const { data: race } = useGetRaceById(Number(raceId));

  if (!race) {
    return (
      <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading race details...</p>
        </CardContent>
      </Card>
    );
  }

  const prizePool = Number(race.prizePool) + Number(race.platformBonus);
  const entryCount = race.entries.length;
  
  // Get class name from race name
  const getClassName = (name: string): string => {
    if (name.includes('Junker')) return 'Junker';
    if (name.includes('Raider')) return 'Raider';
    if (name.includes('Elite')) return 'Elite';
    if (name.includes('SilentKlan') || name.includes('Silent Klan')) return 'SilentKlan';
    return 'Unknown';
  };

  return (
    <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl flex items-center gap-2">
              {getTerrainIcon(race.terrain)} {race.name}
            </CardTitle>
            <CardDescription className="mt-2">
              {(race as any).trackId !== undefined && (
                <>
                  🏁 {getTrackName(Number((race as any).trackId))} • {' '}
                </>
              )}
              {getTerrainName(race.terrain)} • {race.distance.toString()}km • ~{race.duration.toString()}s
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-semibold text-primary">
              {'Upcoming' in race.status && '⏳ Upcoming'}
              {'InProgress' in race.status && '🏁 Racing'}
              {'Completed' in race.status && '✅ Done'}
              {'Cancelled' in race.status && '❌ Cancelled'}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Race Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Entry Fee</p>
            <p className="text-base font-bold text-primary">{formatICP(race.entryFee)}</p>
            <p className="text-xs text-muted-foreground mt-1">{getClassName(race.name)}</p>
          </div>
          <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Prize Pool</p>
            <p className="text-base font-bold text-primary">{formatICP(BigInt(prizePool))}</p>
          </div>
          <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Entries</p>
            <p className="text-base font-bold text-primary">{entryCount}</p>
          </div>
        </div>

        {/* Entries List */}
        {entryCount > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Racers ({entryCount}):</p>
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
              {race.entries.map((entry: any, idx: number) => {
                const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(entry.nftId));
                const imageUrl = generateExtThumbnailLink(tokenId);
                
                return (
                  <Link key={idx} to={`/bot/${entry.nftId}`} className="block hover:bg-card/70 transition-colors rounded">
                    <div className="flex items-center gap-3 p-2 bg-card/50 border border-primary/10 rounded">
                      <img
                        src={imageUrl}
                        alt={`Bot #${entry.nftId}`}
                        className="w-10 h-10 rounded border-2 border-primary/30"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold"><BotName tokenIndex={Number(entry.nftId)} /></p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        #{idx + 1}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Sponsors List */}
        {race.sponsors && race.sponsors.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Sponsors ({race.sponsors.length}):</p>
            <div className="grid grid-cols-1 gap-2">
              {race.sponsors.map((sponsor: any, idx: number) => {
                const sponsorPrincipal = sponsor.sponsor.toString();
                const formatPrincipal = (principal: string): string => {
                  if (principal.length <= 12) return principal;
                  return `${principal.slice(0, 6)}...${principal.slice(-4)}`;
                };
                
                // Calculate sponsor tier based on amount (in e8s)
                const getSponsorTier = (amount: bigint): string => {
                  if (amount >= 500_000_000n) return "🏆 PLATINUM";
                  if (amount >= 200_000_000n) return "🥇 GOLD";
                  if (amount >= 50_000_000n) return "🥈 SILVER";
                  return "🥉 BRONZE";
                };
                
                const tier = getSponsorTier(sponsor.amount);
                
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-card/50 border border-primary/20 rounded-lg">
                    <img
                      src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${sponsorPrincipal}`}
                      alt="Sponsor avatar"
                      className="w-10 h-10 rounded-full border-2 border-primary/30"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold font-mono truncate">{formatPrincipal(sponsorPrincipal)}</p>
                      {sponsor.message && sponsor.message.length > 0 && sponsor.message[0] && (
                        <p className="text-xs text-muted-foreground italic mt-1">&quot;{sponsor.message[0]}&quot;</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-500">+{formatICP(sponsor.amount)}</p>
                      <p className="text-xs text-muted-foreground">{tier}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Race Visualizer - show only when race has entries with stats */}
        {('InProgress' in race.status || 'Completed' in race.status) && 
         (race as any).trackSeed && (race as any).trackSeed !== 0 && !Array.isArray((race as any).trackSeed) && 
         race.entries.length > 1 && 
         race.entries[0]?.stats && (
          <div className="mb-4">
            <RaceVisualizerWithStats
              results={race.results && race.results.length > 0 && race.results[0] ? race.results[0] : race.entries.map((entry: any, idx: number) => ({
                nftId: entry.nftId,
                finalTime: null, // Use null instead of 0 to indicate "no result yet"
                position: idx + 1,
                stats: entry.stats, // Use stats snapshot from entry (set at race start)
              }))}
              trackSeed={BigInt((race as any).trackSeed)}
              trackId={Number((race as any).trackId) || 1}
              distance={Number(race.distance)}
              terrain={race.terrain}
              botOrder={race.entries.map((entry: any) => entry.nftId)}
              raceStartTime={race.startTime}
              raceStatus={race.status}
            />
          </div>
        )}

        {/* Results if completed */}
        {race.results && race.results.length > 0 && race.results[0] && (
          <>            
            <div className="space-y-2">
              <p className="text-sm font-semibold">Results:</p>
              <div className="space-y-2">
                {race.results[0].map((result: any, idx: number) => {
                const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(result.nftId));
                const imageUrl = generateExtThumbnailLink(tokenId);
                const winnerTime = race.results?.[0]?.[0]?.finalTime;
                const isDNF = result.finalTime > 100000; // DNF threshold
                const timeGap = idx > 0 && winnerTime && !isDNF ? (result.finalTime - winnerTime).toFixed(2) : null;
                
                return (
                  <Link key={idx} to={`/bot/${result.nftId}`} className="block hover:bg-card/70 transition-colors rounded-lg">
                    <div className="flex items-center gap-3 p-3 bg-card border-2 border-primary/20 rounded-lg">
                      <div className="text-2xl font-bold w-8">
                        {idx === 0 && '🥇'}
                        {idx === 1 && '🥈'}
                        {idx === 2 && '🥉'}
                        {idx > 2 && `#${idx + 1}`}
                      </div>
                      <img
                        src={imageUrl}
                        alt={`Bot #${result.nftId}`}
                        className="w-12 h-12 rounded border-2 border-primary/40"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold"><BotName tokenIndex={Number(result.nftId)} /></p>
                        <p className="text-sm text-muted-foreground">
                          {result.finalTime !== undefined ? (
                            isDNF ? (
                              <span className="text-red-500 font-bold">DNF</span>
                            ) : (
                              <>
                                {result.finalTime.toFixed(2)}s
                                {timeGap && <span className="text-xs ml-1">(+{timeGap}s)</span>}
                              </>
                            )
                          ) : (
                            `Position ${idx + 1}`
                          )}
                        </p>
                      </div>
                      {result.prizeAmount !== undefined && result.prizeAmount > 0n && (
                        <div className="text-right">
                          <p className="text-sm text-green-500 font-bold">
                            +{formatICP(result.prizeAmount)}
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function EventDetailsClient({ eventId }: { eventId: string }) {
  const navigate = useNavigate();
  const { data: event } = useGetEventDetails(Number(eventId));

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading event details...</p>
      </div>
    );
  }

  // Determine the actual status based on time and completion
  const now = Date.now() * 1_000_000; // Convert to nanoseconds
  const isPast = Number(event.scheduledTime) < now;
  const isCompleted = 'Completed' in event.status;
  const registrationClosed = Number(event.registrationCloses) < now;
  
  const getStatusBadge = () => {
    if ('Cancelled' in event.status) {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (isCompleted || isPast) {
      return <Badge variant="secondary">Completed</Badge>;
    }
    if ('InProgress' in event.status) {
      return <Badge className="bg-orange-500">In Progress</Badge>;
    }
    // Check actual registration time, not just status
    if (registrationClosed || 'RegistrationClosed' in event.status) {
      return <Badge variant="outline">Registration Closed</Badge>;
    }
    if ('RegistrationOpen' in event.status && !registrationClosed) {
      return <Badge className="bg-green-500">Registration Open</Badge>;
    }
    return <Badge>Announced</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/schedule')}
            className="mb-6"
          >
            ← Back to Schedule
          </Button>

          {/* Event Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{event.metadata.name}</h1>
            <p className="text-lg text-muted-foreground mb-4">{event.metadata.description}</p>
            <div className="flex gap-4 items-center text-sm text-muted-foreground">
              <span>🕒 {formatDate(event.scheduledTime)}</span>
              {getStatusBadge()}
            </div>
          </div>

          {/* Event Stats */}
          <Card className="mb-8 border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Start Time</p>
                  <p className="text-base font-bold text-primary">{formatDate(event.scheduledTime)}</p>
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Races</p>
                  <p className="text-xl font-bold text-primary">{event.raceIds.length}</p>
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Points</p>
                  <p className="text-xl font-bold text-primary">{event.metadata.pointsMultiplier}x</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Races */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Races</h2>
            
            {event.raceIds.length === 0 ? (
              <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur">
                <CardContent className="py-12 text-center">
                  <div className="space-y-4">
                    <div className="text-6xl">📅</div>
                    <h3 className="text-xl font-semibold">Races Not Yet Created</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Races for this event will be created automatically one week before the event date. 
                      Check back closer to the event to see the race schedule and register your bots!
                    </p>
                    <div className="pt-4">
                      <p className="text-sm text-muted-foreground">
                        Event starts: <span className="font-semibold text-primary">{formatDate(event.scheduledTime)}</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              event.raceIds.map((raceId: bigint) => (
                <RaceCard key={raceId.toString()} raceId={raceId} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
