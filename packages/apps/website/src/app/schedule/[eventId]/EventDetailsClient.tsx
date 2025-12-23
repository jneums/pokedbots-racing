import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetEventDetails, useGetRaceById, useGetBotProfile } from "@/hooks/useRacing";
import { useMyBots, useEnterRace } from "@/hooks/useGarage";
import { useAuth } from "@/hooks/useAuth";
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';
import { RaceVisualizer } from '@/components/RaceVisualizer';
import { BettingInterface } from '@/components/BettingInterface';
import { toast } from 'sonner';

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
  const { user } = useAuth();
  const { data: myBots, isLoading: botsLoading } = useMyBots();
  const enterRaceMutation = useEnterRace();
  const [showEnterDialog, setShowEnterDialog] = useState(false);
  const [selectedBotIndex, setSelectedBotIndex] = useState<string>('');

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

  // Check if user is authenticated
  const isAuthenticated = !!user;
  
  // Check if race is open for entry
  const isUpcoming = 'Upcoming' in race.status;
  const isFull = race.entries.length >= Number(race.maxEntries);
  const now = Date.now();
  const entryDeadlinePassed = Number(race.entryDeadline) / 1_000_000 < now;
  const canEnter = isAuthenticated && isUpcoming && !isFull && !entryDeadlinePassed;

  // Check if user already entered
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

  // Get class name from race object - uses actual raceClass field from backend
  const getClassName = (race: any): string => {
    // Use actual raceClass field from backend (comes as variant like { Junker: null })
    if (race.raceClass) {
      const classKey = Object.keys(race.raceClass)[0];
      return classKey || 'Unknown';
    }
    
    // Fallback to name parsing (for backward compatibility)
    if (race.name.includes('Scrap')) return 'Scrap';
    if (race.name.includes('Junker') || race.name.includes('Scavenger')) return 'Junker';
    if (race.name.includes('Raider')) return 'Raider';
    if (race.name.includes('Elite')) return 'Elite';
    if (race.name.includes('SilentKlan') || race.name.includes('Silent Klan')) return 'SilentKlan';
    return 'Unknown';
  };

  const raceClass = getClassName(race);

  // Check if a bot is eligible for this race class based on rating
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

  // Filter bots that are initialized and not already entered
  const initializeBotsNotEntered = myBots?.filter(
    bot => bot.isInitialized && !userEnteredBots.includes(Number(bot.tokenIndex))
  ) || [];

  // Separate eligible and ineligible bots
  const eligibleBots = initializeBotsNotEntered.filter(isBotEligible);
  const ineligibleBots = initializeBotsNotEntered.filter(bot => !isBotEligible(bot));
  const availableBots = [...eligibleBots, ...ineligibleBots]; // Show all, but mark ineligible

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
            <p className="text-xs text-muted-foreground mt-1">{raceClass}</p>
          </div>
          <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Prize Pool</p>
            <p className="text-base font-bold text-primary">{formatICP(BigInt(prizePool))}</p>
          </div>
          <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Entries</p>
            <p className="text-base font-bold text-primary">{entryCount}/{Number(race.maxEntries)}</p>
            <p className="text-xs text-muted-foreground mt-1">Min: {Number(race.minEntries)}</p>
          </div>
        </div>

        {/* Cancellation Risk Warning */}
        {isUpcoming && entryCount < Number(race.minEntries) && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-sm text-yellow-600 font-semibold">
              ⚠️ Race at risk of cancellation
            </p>
            <p className="text-xs text-yellow-600/80 mt-1">
              Needs {Number(race.minEntries) - entryCount} more {Number(race.minEntries) - entryCount === 1 ? 'entry' : 'entries'} to proceed (minimum {Number(race.minEntries)} required)
            </p>
          </div>
        )}

        {/* Enter Race Button */}
        {userEnteredBots.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <p className="text-sm text-green-500 font-semibold">
              ✓ You have {userEnteredBots.length} bot{userEnteredBots.length !== 1 ? 's' : ''} entered in this race
            </p>
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
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-sm text-yellow-600">Sign in to enter this race</p>
          </div>
        )}
        
        {isAuthenticated && isUpcoming && !botsLoading && eligibleBots.length === 0 && ineligibleBots.length > 0 && userEnteredBots.length === 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-sm text-yellow-600">
              You have bots but none are eligible for this {raceClass} class race.
              {raceClass === 'Scrap' && ' (Need rating 0-19)'}
              {raceClass === 'Junker' && ' (Need rating 20-29)'}
              {raceClass === 'Raider' && ' (Need rating 30-39)'}
              {raceClass === 'Elite' && ' (Need rating 40-49)'}
              {raceClass === 'SilentKlan' && ' (Need rating ≥ 50)'}
            </p>
          </div>
        )}
        
        {isAuthenticated && isUpcoming && !botsLoading && availableBots.length === 0 && userEnteredBots.length === 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-sm text-yellow-600">You don't have any available bots. Visit your garage to initialize a bot!</p>
          </div>
        )}
        
        {isFull && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-sm text-red-500">Race is full ({Number(race.maxEntries)} entries)</p>
          </div>
        )}
        
        {entryDeadlinePassed && isUpcoming && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-sm text-red-500">Entry deadline has passed</p>
          </div>
        )}

        {/* Entries List - Only show for upcoming races without visualizer */}
        {entryCount > 0 && 'Upcoming' in race.status && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Racers ({entryCount}):</p>
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
              {race.entries.map((entry: any, idx: number) => {
                // entry.nftId could be either a token index (string number) or EXT token identifier
                // If it's already an EXT token identifier, use it directly; otherwise generate it
                const isExtIdentifier = entry.nftId.length > 10; // EXT identifiers are long
                const tokenId = isExtIdentifier ? entry.nftId : generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(entry.nftId));
                const imageUrl = generateExtThumbnailLink(tokenId);
                
                // Extract token index: if it's a number string, use it; otherwise it's an EXT ID
                const tokenIndex = isExtIdentifier ? entry.nftId : Number(entry.nftId);
                
                return (
                  <Link key={idx} to={`/bot/${tokenIndex}`} className="block hover:bg-card/70 transition-colors rounded">
                    <div className="flex items-center gap-3 p-2 bg-card/50 border border-primary/10 rounded">
                      <img
                        src={imageUrl}
                        alt={`Bot #${tokenIndex}`}
                        className="w-10 h-10 rounded border-2 border-primary/30"
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

        {/* Race Results - All finishers */}
        {race.results && race.results.length > 0 && race.results[0] && 'Completed' in race.status && (() => {
          const finalResults = race.results[0];
          const allFinishers = finalResults.filter((result: any) => result.finalTime && result.finalTime < 100000);
          return allFinishers.length > 0 && (
            <>            
              <div className="space-y-2">
                <p className="text-sm font-semibold">🏁 Race Results:</p>
                <div className="space-y-2">
                  {allFinishers.map((result: any, idx: number) => {
                  const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(result.nftId));
                  const imageUrl = generateExtThumbnailLink(tokenId);
                  const position = finalResults.findIndex((r: any) => r.nftId === result.nftId) + 1;
                  const hasPrize = result.prizeAmount && result.prizeAmount > 0n;
                
                return (
                  <Link key={idx} to={`/bot/${result.nftId}`} className="block hover:bg-card/70 transition-colors rounded-lg">
                    <div className={`flex items-center gap-3 p-3 border-2 rounded-lg ${
                      hasPrize 
                        ? 'bg-green-500/5 border-green-500/20' 
                        : 'bg-card/50 border-border/40'
                    }`}>
                      <div className="text-2xl font-bold w-8">
                        {position === 1 && '🥇'}
                        {position === 2 && '🥈'}
                        {position === 3 && '🥉'}
                        {position > 3 && `#${position}`}
                      </div>
                      <img
                        src={imageUrl}
                        alt={`Bot #${result.nftId}`}
                        className={`w-12 h-12 rounded border-2 ${
                          hasPrize ? 'border-green-500/40' : 'border-border/40'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold"><BotName tokenIndex={Number(result.nftId)} /></p>
                        <p className="text-xs text-muted-foreground">
                          {result.finalTime.toFixed(2)}s
                        </p>
                      </div>
                      {hasPrize && (
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
          );
        })()}

        {/* Betting Interface */}
        <div className="mt-4">
          <BettingInterface raceId={Number(raceId)} />
        </div>
      </CardContent>

      {/* Enter Race Dialog */}
      <Dialog open={showEnterDialog} onOpenChange={setShowEnterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Race - {raceClass} Class</DialogTitle>
            <DialogDescription>
              Select a bot to enter in {race.name}. Entry fee: {formatICP(race.entryFee)}
              <br />
              <span className="text-xs">
                {raceClass === 'Scrap' && 'Rating Requirement: 0-19'}
                {raceClass === 'Junker' && 'Rating Requirement: 20-29'}
                {raceClass === 'Raider' && 'Rating Requirement: 30-39'}
                {raceClass === 'Elite' && 'ELO Requirement: 1600-1799'}
                {raceClass === 'SilentKlan' && 'ELO Requirement: ≥ 1800'}
              </span>
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
                  {eligibleBots.length > 0 && eligibleBots.map((bot) => (
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
                  {ineligibleBots.length > 0 && ineligibleBots.map((bot) => (
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
                            (Rating: {bot.maxStats ? Math.floor((Number(bot.maxStats.speed) + Number(bot.maxStats.powerCore) + Number(bot.maxStats.acceleration) + Number(bot.maxStats.stability)) / 4) : '?'} - Not eligible)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {eligibleBots.length === 0 && availableBots.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No available bots. All your initialized bots are already entered in this race.
              </p>
            )}

            {eligibleBots.length === 0 && ineligibleBots.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-sm text-yellow-600">
                  None of your bots meet the ELO requirement for this {raceClass} class race.
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
