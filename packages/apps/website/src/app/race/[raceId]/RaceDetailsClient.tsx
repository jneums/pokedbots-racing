'use client';

import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetRaceById, useGetBotProfile } from "@/hooks/useRacing";
import { useMyBots, useEnterRace } from "@/hooks/useGarage";
import { useAuth } from "@/hooks/useAuth";
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';
import { RaceVisualizer } from '@/components/RaceVisualizer';
import { RacePlayback } from '@/components/Track3D';
import { getTrackTemplate } from '@/components/Track3D/trackData';
import { toast } from 'sonner';
import { BettingInterface } from '@/components/BettingInterface';

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

function getTerrainName(terrain: any): string {
  if ('ScrapHeaps' in terrain) return 'Scrap Heaps';
  if ('WastelandSand' in terrain) return 'Wasteland Sand';
  if ('MetalRoads' in terrain) return 'Metal Roads';
  return 'Unknown';
}

function getTerrainIcon(terrain: any): string {
  if ('ScrapHeaps' in terrain) return '🔩';
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
    "Metal Mesa Loop",
    "Dune Runner",
    "Rust Belt Rally",
    "Debris Field Dash",
    "Velocity Viaduct",
    "Sandstorm Circuit"
  ];
  return trackNames[trackId] || trackNames[0];
}

function BotName({ tokenIndex }: { tokenIndex: number }) {
  const { data: botProfile } = useGetBotProfile(tokenIndex);
  
  if (botProfile?.name && botProfile.name.length > 0 && botProfile.name[0]) {
    return <>{botProfile.name[0]}</>;
  }
  
  return <>Bot #{tokenIndex}</>;
}

function RacePlayback3DWrapper({ race }: { race: any }) {
  // Fetch all bot profiles
  const botProfiles = race.entries.map((entry: any) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = useGetBotProfile(Number(entry.nftId));
    return data;
  });

  const allLoaded = botProfiles.every((p: any) => p !== undefined);

  const trackId = Number((race as any).trackId) || 1;
  const track = getTrackTemplate(trackId);
  
  if (!track) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Track data not available
      </div>
    );
  }

  if (!allLoaded) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <p className="text-muted-foreground">Loading 3D visualization...</p>
      </div>
    );
  }
  
  // Check if race is completed with results
  if ('Completed' in race.status && race.results && race.results.length > 0 && race.results[0]) {
    const finalResults = race.results[0];
    
    // Prepare race results for playback
    const raceResults = finalResults.map((result: any) => {
      const statsData = result.stats && result.stats.length > 0 && result.stats[0] ? result.stats[0] : result.stats;
      
      const finalStats = statsData ? {
        speed: Number(statsData.speed),
        stability: Number(statsData.stability),
        powerCore: Number(statsData.powerCore),
        acceleration: Number(statsData.acceleration),
      } : undefined;
      
      return {
        nftId: Number(result.nftId),
        finalTime: Number(result.finalTime),
        segmentTimes: result.segmentTimes ? result.segmentTimes.map((t: any) => Number(t)) : [],
        position: result.position || 0,
        stats: finalStats,
        faction: result.faction,
        preferredTerrain: result.preferredTerrain,
      };
    });
    
    // Create bot colors and labels
    const botColors: Record<number, string> = {};
    const botLabels: Record<number, string> = {};
    
    race.entries.forEach((entry: any) => {
      const nftId = Number(entry.nftId);
      botColors[nftId] = `hsl(${(nftId * 137.5) % 360}, 70%, 50%)`;
      // Use bot profile name if available
      const profile = botProfiles.find((p: any) => p && Number(p.tokenIndex) === nftId);
      botLabels[nftId] = (profile?.name?.[0] && profile.name[0].length > 0) 
        ? profile.name[0] 
        : `Bot #${nftId}`;
    });
    
    return (
      <RacePlayback
        track={track}
        results={raceResults}
        botColors={botColors}
        botLabels={botLabels}
      />
    );
  }
  
  // Race not completed yet, show message
  return (
    <div className="text-center p-8 space-y-4">
      <p className="text-muted-foreground">
        3D race playback will be available once the race is completed
      </p>
      <p className="text-sm text-muted-foreground">
        Track: {track.name}
      </p>
    </div>
  );
}

function RaceVisualizerWithStats({ results, trackSeed, trackId, distance, terrain, botOrder, raceStartTime, raceStatus, onRaceWatched, events }: {
  results: any[];
  trackSeed: bigint;
  trackId: number;
  distance: number;
  terrain: any;
  botOrder?: string[];
  raceStartTime?: bigint;
  raceStatus?: any;
  onRaceWatched?: () => void;
  events?: any[];
}) {
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

  const resultsWithStats = results.map((r: any) => {
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
      faction: 'Unknown',
      preferredTerrain: 'ScrapHeaps',
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
      onRaceWatched={onRaceWatched}
      events={events}
    />
  );
}

export function RaceDetailsClient({ raceId }: { raceId: string }) {
  const navigate = useNavigate();
  const { data: race } = useGetRaceById(Number(raceId));
  const { user } = useAuth();
  const { data: myBots, isLoading: botsLoading } = useMyBots();
  const enterRaceMutation = useEnterRace();
  const [showEnterDialog, setShowEnterDialog] = useState(false);
  const [selectedBotIndex, setSelectedBotIndex] = useState<string>('');
  const [hasWatchedRace, setHasWatchedRace] = useState(false);

  if (!race) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading race details...</p>
      </div>
    );
  }

  const prizePool = Number(race.prizePool) + Number(race.platformBonus);
  const entryCount = race.entries.length;
  const isAuthenticated = !!user;
  const isUpcoming = 'Upcoming' in race.status;
  const isFull = race.entries.length >= Number(race.maxEntries);
  const now = Date.now();
  const entryDeadlinePassed = Number(race.entryDeadline) / 1_000_000 < now;
  const canEnter = isAuthenticated && isUpcoming && !isFull && !entryDeadlinePassed;

  // Check if race is in "live view" period (within 15 minutes of start time)
  const isInLiveViewPeriod = race.startTime && (
    (now * 1_000_000) - Number(race.startTime) < (15 * 60 * 1_000_000_000)
  ) && ('InProgress' in race.status || 'Completed' in race.status);

  // Show results only if: not in live view period OR user has watched the race
  const canShowResults = !isInLiveViewPeriod || hasWatchedRace;

  const userEnteredBots = race.entries
    .filter((entry: any) => entry.owner.toString() === user?.principal)
    .map((entry: any) => Number(entry.nftId));
  
  const handleEnterRace = async () => {
    if (!selectedBotIndex) {
      toast.error('Please select a bot');
      return;
    }
    
    try {
      await enterRaceMutation.mutateAsync({
        raceId: Number(raceId),
        tokenIndex: Number(selectedBotIndex),
      });
      toast.success(`Bot #${selectedBotIndex} entered the race!`);
      setShowEnterDialog(false);
      setSelectedBotIndex('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enter race');
    }
  };

  const getClassName = (race: any): string => {
    if (race.raceClass) {
      const classKey = Object.keys(race.raceClass)[0];
      return classKey || 'Unknown';
    }
    if (race.name.includes('Scrap')) return 'Scrap';
    if (race.name.includes('Junker') || race.name.includes('Scavenger')) return 'Junker';
    if (race.name.includes('Raider')) return 'Raider';
    if (race.name.includes('Elite')) return 'Elite';
    if (race.name.includes('SilentKlan') || race.name.includes('Silent Klan')) return 'SilentKlan';
    return 'Unknown';
  };

  const raceClass = getClassName(race);

  const isBotEligible = (bot: any): boolean => {
    if (!bot.maxStats) return false;
    // Calculate overall rating (average of max stats)
    const rating = Math.floor((Number(bot.maxStats.speed) + Number(bot.maxStats.powerCore) + Number(bot.maxStats.acceleration) + Number(bot.maxStats.stability)) / 4);
    
    switch (raceClass) {
      case 'Scrap': return rating < 20;
      case 'Junker': return rating >= 20 && rating < 30;
      case 'Raider': return rating >= 30 && rating < 40;
      case 'Elite': return rating >= 40 && rating < 50;
      case 'SilentKlan': return rating >= 50;
      default: return false;
    }
  };

  const initializeBotsNotEntered = myBots?.filter(
    bot => bot.isInitialized && !userEnteredBots.includes(Number(bot.tokenIndex))
  ) || [];

  const eligibleBots = initializeBotsNotEntered.filter(isBotEligible);
  const ineligibleBots = initializeBotsNotEntered.filter(bot => !isBotEligible(bot));
  const availableBots = [...eligibleBots, ...ineligibleBots];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/schedule')}
            className="mb-6"
          >
            ← Back to Schedule
          </Button>

          <Card className="border-2 border-primary/20 bg-card/80 backdrop-blur">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-3xl flex items-center gap-2 mb-2">
                    {getTerrainIcon(race.terrain)} {race.name}
                  </CardTitle>
                  <div className="text-muted-foreground space-y-1">
                    {(race as any).trackId !== undefined && (
                      <p>🏁 {getTrackName(Number((race as any).trackId))}</p>
                    )}
                    <p>{getTerrainName(race.terrain)} • {race.distance.toString()}km • ~{race.duration.toString()}s</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-2">Status</p>
                  <div>
                    {'Upcoming' in race.status && <Badge className="bg-green-500/90">⏳ Upcoming</Badge>}
                    {'InProgress' in race.status && <Badge className="bg-orange-500/90">🏁 Racing</Badge>}
                    {'Completed' in race.status && <Badge className="bg-gray-600/90">✅ Done</Badge>}
                    {'Cancelled' in race.status && <Badge className="bg-red-500/90">❌ Cancelled</Badge>}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Class</p>
                  <p className="text-lg font-bold text-primary">{raceClass}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatICP(race.entryFee)}</p>
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Prize Pool</p>
                  <p className="text-lg font-bold text-primary">{formatICP(BigInt(prizePool))}</p>
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Entries</p>
                  <p className="text-lg font-bold text-primary">{entryCount}/{Number(race.maxEntries)}</p>
                </div>
              </div>

              {userEnteredBots.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-green-600 font-semibold">
                      ✓ You have {userEnteredBots.length} bot{userEnteredBots.length !== 1 ? 's' : ''} entered in this race
                    </p>
                    {!botsLoading && (eligibleBots.length > 0 || userEnteredBots.length > 0) && (
                      <Badge className="bg-blue-500/90 text-white">
                        {userEnteredBots.length} out of {userEnteredBots.length + eligibleBots.length} eligible bots
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {isAuthenticated && isUpcoming && botsLoading && (
                <div className="flex items-center justify-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
                  <p className="text-sm text-muted-foreground">Loading your bots...</p>
                </div>
              )}
              
              {canEnter && !botsLoading && eligibleBots.length > 0 && (
                <Button 
                  className="w-full" 
                  onClick={() => setShowEnterDialog(true)}
                  disabled={enterRaceMutation.isPending}
                >
                  🏁 Enter Race
                </Button>
              )}
              
              {!isAuthenticated && isUpcoming && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-sm text-yellow-600">Sign in to enter this race</p>
                </div>
              )}
              
              {isAuthenticated && isUpcoming && !botsLoading && eligibleBots.length === 0 && ineligibleBots.length > 0 && userEnteredBots.length === 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-sm text-yellow-600">
                    You have bots but none are eligible for this {raceClass} class race.
                  </p>
                </div>
              )}
              
              {isAuthenticated && isUpcoming && !botsLoading && availableBots.length === 0 && userEnteredBots.length === 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-sm text-yellow-600">You don't have any available bots. Visit your garage to initialize a bot!</p>
                </div>
              )}
              
              {isFull && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-sm text-red-500">Race is full ({Number(race.maxEntries)} entries)</p>
                </div>
              )}
              
              {entryDeadlinePassed && isUpcoming && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-sm text-red-500">Entry deadline has passed</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Betting Interface */}
          <BettingInterface raceId={Number(raceId)} />

          {/* Race Entries Section */}
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              {'Upcoming' in race.status && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Racers ({entryCount}/{Number(race.maxEntries)}):</p>
                  {entryCount === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-card/30 border-2 border-dashed border-primary/20 rounded-lg">
                      <div className="text-6xl mb-4">🏁</div>
                      <p className="text-lg font-semibold text-muted-foreground mb-2">No Racers Yet</p>
                      <p className="text-sm text-muted-foreground text-center">
                        Be the first to enter this race!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                    {race.entries.map((entry: any, idx: number) => {
                      const isExtIdentifier = entry.nftId.length > 10;
                      const tokenId = isExtIdentifier ? entry.nftId : generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(entry.nftId));
                      const imageUrl = generateExtThumbnailLink(tokenId);
                      const tokenIndex = isExtIdentifier ? entry.nftId : Number(entry.nftId);
                      
                      return (
                        <Link key={idx} to={`/bot/${tokenIndex}`} className="block hover:bg-card/70 transition-colors rounded-lg">
                          <div className="flex items-center gap-3 p-3 bg-card/50 border border-primary/10 rounded-lg">
                            <img
                              src={imageUrl}
                              alt={`Bot #${tokenIndex}`}
                              className="w-12 h-12 rounded border-2 border-primary/30"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold"><BotName tokenIndex={typeof tokenIndex === 'number' ? tokenIndex : 0} /></p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              #{idx + 1}
                            </Badge>
                          </div>
                        </Link>
                      );
                    })}
                    </div>
                  )}
                </div>
              )}

              {race.sponsors && race.sponsors.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Sponsors ({race.sponsors.length}):</p>
                  <div className="grid grid-cols-1 gap-2">
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

              {('InProgress' in race.status || 'Completed' in race.status) && 
               (race as any).trackSeed && (race as any).trackSeed !== 0 && !Array.isArray((race as any).trackSeed) && 
               race.entries.length > 1 && 
               race.entries[0]?.stats && (
                <div className="mb-4">
                  <Tabs defaultValue="2d" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="2d">2D Race View</TabsTrigger>
                      <TabsTrigger value="3d">3D Track View</TabsTrigger>
                    </TabsList>
                    <TabsContent value="2d">
                      <RaceVisualizerWithStats
                        results={race.results && race.results.length > 0 && race.results[0] ? race.results[0] : race.entries.map((entry: any, idx: number) => ({
                          nftId: entry.nftId,
                          finalTime: null,
                          position: idx + 1,
                          stats: entry.stats,
                        }))}
                        trackSeed={BigInt((race as any).trackSeed)}
                        trackId={Number((race as any).trackId) || 1}
                        distance={Number(race.distance)}
                        terrain={race.terrain}
                        botOrder={race.entries.map((entry: any) => entry.nftId)}
                        raceStartTime={race.startTime}
                        raceStatus={race.status}
                        onRaceWatched={() => setHasWatchedRace(true)}
                        events={(race as any).events || []}
                      />
                    </TabsContent>
                    <TabsContent value="3d">
                      <RacePlayback3DWrapper race={race} />
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {canShowResults && race.results && race.results.length > 0 && race.results[0] && 'Completed' in race.status && (() => {
                const finalResults = race.results[0];
                const allFinishers = finalResults.filter((result: any) => result.finalTime && result.finalTime < 100000);
                return allFinishers.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-lg font-semibold">🏁 Race Results:</p>
                    <div className="space-y-2">
                      {allFinishers.map((result: any, idx: number) => {
                        const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(result.nftId));
                        const imageUrl = generateExtThumbnailLink(tokenId);
                        const position = finalResults.findIndex((r: any) => r.nftId === result.nftId) + 1;
                        const hasPrize = result.prizeAmount && result.prizeAmount > 0n;
                      
                        return (
                          <Link key={idx} to={`/bot/${result.nftId}`} className="block hover:bg-card/70 transition-colors rounded-lg">
                            <div className={`flex items-center gap-4 p-4 border-2 rounded-lg ${
                              hasPrize 
                                ? 'bg-green-500/5 border-green-500/20' 
                                : 'bg-card/50 border-border/40'
                            }`}>
                              <div className="text-3xl font-bold w-12 text-center">
                                {position === 1 && '🥇'}
                                {position === 2 && '🥈'}
                                {position === 3 && '🥉'}
                                {position > 3 && `#${position}`}
                              </div>
                              <img
                                src={imageUrl}
                                alt={`Bot #${result.nftId}`}
                                className={`w-14 h-14 rounded border-2 ${
                                  hasPrize ? 'border-green-500/40' : 'border-border/40'
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-lg"><BotName tokenIndex={Number(result.nftId)} /></p>
                                <p className="text-sm text-muted-foreground">
                                  Time: {result.finalTime.toFixed(2)}s
                                </p>
                              </div>
                              {hasPrize && (
                                <div className="text-right">
                                  <p className="text-lg text-green-500 font-bold">
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
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showEnterDialog} onOpenChange={setShowEnterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Race - {raceClass} Class</DialogTitle>
            <DialogDescription>
              Select a bot to enter in {race.name}. Entry fee: {formatICP(race.entryFee)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Bot</label>
              <Select value={selectedBotIndex} onValueChange={setSelectedBotIndex}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a bot..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleBots.map((bot) => (
                    <SelectItem key={bot.tokenIndex.toString()} value={bot.tokenIndex.toString()}>
                      <div className="flex items-center gap-2">
                        <span>Bot #{bot.tokenIndex.toString()}</span>
                        {bot.name && <span className="text-muted-foreground">- {bot.name}</span>}
                        {bot.stats && (
                          <span className="text-xs text-muted-foreground">
                            (ELO: {Number(bot.stats.eloRating)})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                  {ineligibleBots.map((bot) => (
                    <SelectItem 
                      key={bot.tokenIndex.toString()} 
                      value={bot.tokenIndex.toString()}
                      disabled
                    >
                      <div className="flex items-center gap-2 opacity-50">
                        <span>Bot #{bot.tokenIndex.toString()}</span>
                        {bot.name && <span className="text-muted-foreground">- {bot.name}</span>}
                        {bot.stats && (
                          <span className="text-xs text-red-500">
                            (ELO: {Number(bot.stats.eloRating)} - Not eligible)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {eligibleBots.length === 0 && ineligibleBots.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-sm text-yellow-600">
                  None of your bots meet the rating requirement for this {raceClass} class race.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => {
                  setShowEnterDialog(false);
                  setSelectedBotIndex('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleEnterRace}
                disabled={!selectedBotIndex || enterRaceMutation.isPending}
              >
                {enterRaceMutation.isPending ? 'Entering...' : 'Confirm Entry'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
