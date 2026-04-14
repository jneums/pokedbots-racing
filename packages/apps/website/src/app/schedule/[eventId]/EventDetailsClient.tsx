import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetEventDetails, useGetRaceById, useGetBotProfilesBatch, useRegisterForEvent, useUnregisterFromEvent, useGetEventResults } from "@/hooks/useRacing";
import { useMyBots, useEnterRace } from "@/hooks/useGarage";
import { useAuth } from "@/hooks/useAuth";
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';
import { RaceVisualizer } from '@/components/RaceVisualizer';
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
    timeZoneName: 'short',
  });
}

function formatTimeUntil(timestampNs: number): string {
  const now = Date.now() * 1_000_000;
  const diffMs = (timestampNs - now) / 1_000_000;
  
  if (diffMs <= 0) {
    return 'Starting soon...';
  }
  
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `in ${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `in ${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `in ${minutes}m`;
  } else {
    return 'Starting soon...';
  }
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
    "Sandstorm Circuit",
    "Desert Sprint"
  ];
  return trackNames[trackId] || trackNames[0];
}


// Simple display component that doesn't use hooks
function BotNameDisplay({ tokenIndex, profile, compact = false }: { tokenIndex: number; profile?: any; compact?: boolean }) {
  if (profile?.name && profile.name.length > 0 && profile.name[0]) {
    if (compact) {
      return <>{profile.name[0]}</>;
    }
    return <>PokedBot #{tokenIndex} - {profile.name[0]}</>;
  }
  
  return <>Bot #{tokenIndex}</>;
}

// Helper to get readable class name from variant
function getRaceClassName(raceClass: any): string {
  if (!raceClass) return 'Unknown';
  if ('Scrap' in raceClass) return 'Scrap';
  if ('Junker' in raceClass) return 'Junker';
  if ('Raider' in raceClass) return 'Raider';
  if ('Elite' in raceClass) return 'Elite';
  if ('SilentKlan' in raceClass) return 'Silent Klan';
  return 'Unknown';
}

// Helper to get class rating range
function getClassRatingRange(raceClass: any): string {
  if (!raceClass) return '';
  if ('Scrap' in raceClass) return '0-19';
  if ('Junker' in raceClass) return '20-29';
  if ('Raider' in raceClass) return '30-39';
  if ('Elite' in raceClass) return '40-49';
  if ('SilentKlan' in raceClass) return '50+';
  return '';
}

// Helper to calculate bracket-scaled entry fee (shifted up one bracket)
function calculateBracketEntryFee(baseEntryFee: bigint, raceClass: any): bigint {
  const base = Number(baseEntryFee);
  let multiplier = 1.0;
  
  if ('Scrap' in raceClass) multiplier = 1.0;
  else if ('Junker' in raceClass) multiplier = 1.5;
  else if ('Raider' in raceClass) multiplier = 2.0;
  else if ('Elite' in raceClass) multiplier = 2.5;
  else if ('SilentKlan' in raceClass) multiplier = 3.0;
  
  return BigInt(Math.floor(base * multiplier));
}

// Check if a bot is eligible for a specific class based on rating
function isBotEligibleForClass(bot: any, raceClass: any): boolean {
  if (!bot.maxStats) return false;
  const rating = Math.floor(
    (Number(bot.maxStats.speed) + Number(bot.maxStats.powerCore) + 
     Number(bot.maxStats.acceleration) + Number(bot.maxStats.stability)) / 4
  );
  
  if ('Scrap' in raceClass) return rating < 20;
  if ('Junker' in raceClass) return rating >= 20 && rating < 30;
  if ('Raider' in raceClass) return rating >= 30 && rating < 40;
  if ('Elite' in raceClass) return rating >= 40 && rating < 50;
  if ('SilentKlan' in raceClass) return rating >= 50;
  return false;
}

// Event Standings component for multi-stage events (in-progress or completed)
function EventStandings({ eventId, isInProgress = false }: { eventId: number; isInProgress?: boolean }) {
  const { data: results, isLoading } = useGetEventResults(eventId, isInProgress);
  
  // Get bot indices from standings for profile batch query
  // Include both cumulative standings and faction member standings
  const cumulativeIndices = results?.cumulativeStandings?.map((s: any) => Number(s.tokenIndex)) || [];
  const factionMemberIndices = results?.factionStandings?.flatMap((f: any) => 
    f.members?.map((m: any) => Number(m.tokenIndex)) || []
  ) || [];
  const botIndices = [...new Set([...cumulativeIndices, ...factionMemberIndices])];
  const { data: botProfiles = [] } = useGetBotProfilesBatch(botIndices);
  
  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur mb-8">
        <CardContent className="py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
          <p className="text-muted-foreground">Loading event standings...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!results) return null;
  
  const hasCumulativeStandings = results.cumulativeStandings && results.cumulativeStandings.length > 0;
  const hasFactionStandings = results.factionStandings && results.factionStandings.length > 0;
  
  if (!hasCumulativeStandings && !hasFactionStandings) return null;

  // Get faction icon
  const getFactionIcon = (faction: string) => {
    const icons: Record<string, string> = {
      // Ultra-Rare
      'UltimateMaster': '👑',
      'Wild': '🐺',
      'Golden': '✨',
      'Ultimate': '⚡',
      // Super-Rare
      'Blackhole': '🕳️',
      'Dead': '💀',
      'Master': '🎓',
      // Rare
      'Bee': '🐝',
      'Food': '🍔',
      'Box': '📦',
      'Murder': '🔪',
      // Common
      'Game': '🎮',
      'Animal': '🐾',
      'Industrial': '⚙️',
    };
    return icons[faction] || '🤖';
  };
  
  // Get scoring mode display
  const getScoringModeDisplay = () => {
    if (!results.scoringMode) return 'Points';
    if ('Cumulative' in results.scoringMode) return 'Cumulative Points';
    if ('TeamAggregate' in results.scoringMode) return 'Faction Wars';
    if ('Elimination' in results.scoringMode) return 'Elimination';
    return 'Points';
  };

  return (
    <Card className={`border-2 ${isInProgress ? 'border-orange-500/40 bg-gradient-to-br from-orange-500/5 to-yellow-500/5' : 'border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-purple-500/5'} backdrop-blur mb-8`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">{isInProgress ? '📊' : '🏆'}</span>
          {isInProgress ? 'Current Standings' : 'Final Standings'}
          <Badge variant="default" className={`${isInProgress ? 'bg-orange-600' : 'bg-amber-600'} ml-2`}>
            {getScoringModeDisplay()}
          </Badge>
          {isInProgress && (
            <Badge variant="outline" className="ml-2 animate-pulse border-orange-500 text-orange-500">
              Live
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isInProgress ? 'Projected ' : ''}Prize Pool: <span className={`font-bold ${isInProgress ? 'text-orange-400' : 'text-amber-400'}`}>{formatICP(results.totalPrizePool)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Faction Standings (for TeamAggregate mode) */}
        {hasFactionStandings && results.factionStandings && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              ⚔️ Faction Results
            </h3>
            <div className="space-y-3">
              {[...results.factionStandings]
                .sort((a: any, b: any) => Number(b.totalPoints) - Number(a.totalPoints))
                .map((faction: any, idx: number) => (
                <div 
                  key={faction.faction}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                    idx === 0 
                      ? 'bg-amber-500/10 border-amber-500/40' 
                      : idx === 1 
                        ? 'bg-gray-400/10 border-gray-400/40'
                        : idx === 2
                          ? 'bg-orange-700/10 border-orange-700/40'
                          : 'bg-card/50 border-border/40'
                  }`}
                >
                  <div className="text-3xl font-bold w-12 text-center">
                    {idx === 0 && '🥇'}
                    {idx === 1 && '🥈'}
                    {idx === 2 && '🥉'}
                    {idx > 2 && `#${idx + 1}`}
                  </div>
                  <div className="text-3xl">{getFactionIcon(faction.faction)}</div>
                  <div className="flex-1">
                    <p className="text-lg font-bold">{faction.faction}</p>
                    <p className="text-sm text-muted-foreground">
                      {Number(faction.memberCount)} participant{Number(faction.memberCount) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{Number(faction.totalPoints)} pts</p>
                    {faction.prizePerMember > 0n && (
                      <p className="text-sm text-green-500 font-semibold">+{formatICP(BigInt(faction.prizePerMember) * BigInt(faction.memberCount))}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Show winning faction's members if TeamAggregate */}
            {results.scoringMode && 'TeamAggregate' in results.scoringMode && results.factionStandings && results.factionStandings[0]?.members && (() => {
              const winningFaction = [...results.factionStandings].sort((a: any, b: any) => Number(b.totalPoints) - Number(a.totalPoints))[0];
              return (
              <div className="mt-4 pt-4 border-t border-primary/20">
                <p className="text-sm font-semibold mb-3 text-amber-400">
                  🎉 Winning Faction Members ({winningFaction.faction})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {winningFaction.members.map((member: any) => {
                    const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(member.tokenIndex));
                    const imageUrl = generateExtThumbnailLink(tokenId);
                    const profile = botProfiles.find((p: any) => p && Number(p.tokenIndex) === Number(member.tokenIndex));
                    
                    return (
                      <Link 
                        key={member.tokenIndex.toString()} 
                        to={`/bot/${member.tokenIndex}`}
                        className="flex items-center gap-2 p-2 bg-card/50 rounded border border-amber-500/20 hover:border-amber-500/50 transition-colors"
                      >
                        <img src={imageUrl} alt="" className="w-8 h-8 rounded border border-amber-500/30" />
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-xs font-semibold truncate">
                            <BotNameDisplay tokenIndex={Number(member.tokenIndex)} profile={profile} compact />
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Number(member.points)} pts
                          </p>
                        </div>
                        {winningFaction.prizePerMember > 0n && (
                          <p className="text-xs text-green-500 font-semibold shrink-0">
                            +{formatICP(winningFaction.prizePerMember)}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
              );
            })()}
          </div>
        )}
        
        {/* Individual Cumulative Standings */}
        {hasCumulativeStandings && results.cumulativeStandings && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              📊 Individual Standings
            </h3>
            <div className="space-y-2">
              {results.cumulativeStandings.map((standing: any) => {
                const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(standing.tokenIndex));
                const imageUrl = generateExtThumbnailLink(tokenId);
                const profile = botProfiles.find((p: any) => p && Number(p.tokenIndex) === Number(standing.tokenIndex));
                const position = Number(standing.position);
                const hasPrize = standing.prizeAmount > 0n;
                const isTied = standing.tied === true;
                
                return (
                  <Link 
                    key={standing.tokenIndex.toString()} 
                    to={`/bot/${standing.tokenIndex}`}
                    className="block hover:bg-card/70 transition-colors rounded-lg"
                  >
                    <div className={`flex items-center gap-3 p-3 border-2 rounded-lg ${
                      position <= 3
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : hasPrize 
                          ? 'bg-green-500/5 border-green-500/20' 
                          : 'bg-card/50 border-border/40'
                    }`}>
                      <div className="text-2xl font-bold w-10 text-center" title={isTied ? `Tied for position ${position}` : undefined}>
                        {position === 1 && '🥇'}
                        {position === 2 && '🥈'}
                        {position === 3 && '🥉'}
                        {position > 3 && `#${position}`}
                        {isTied && <span className="text-xs text-amber-400 block">TIE</span>}
                      </div>
                      <img
                        src={imageUrl}
                        alt={`Bot #${standing.tokenIndex}`}
                        className={`w-12 h-12 rounded border-2 ${
                          position <= 3 ? 'border-amber-500/40' : 'border-border/40'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">
                          {profile?.name?.[0] || `Bot #${standing.tokenIndex}`}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {standing.raceResults?.slice(0, 4).map((race: any) => (
                            <Badge 
                              key={race.raceId.toString()} 
                              variant="outline" 
                              className="text-xs"
                            >
                              {race.stageName || `Race ${race.raceId}`}: P{Number(race.position)} ({Number(race.points)}pts)
                            </Badge>
                          ))}
                          {standing.raceResults?.length > 4 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              +{standing.raceResults.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-primary">
                          {Number(standing.cumulativePoints)} pts
                        </p>
                        {hasPrize && (
                          <p className="text-sm text-green-500 font-semibold">
                            +{formatICP(standing.prizeAmount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Race Summary */}
        {results.raceResultsSummary && results.raceResultsSummary.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🏁 Race Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.raceResultsSummary.map((race: any) => (
                <div 
                  key={race.raceId.toString()}
                  className="p-3 bg-card/50 border border-primary/20 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{getTerrainIcon(race.terrain)}</span>
                      <span className="font-semibold text-sm">
                        {race.stageName || `Race #${race.raceId}`}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getRaceClassName(race.raceClass)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {Number(race.distance)} km • {getTerrainName(race.terrain)}
                  </p>
                  {race.results && race.results.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-amber-400">🏆</span>
                      <span className="font-semibold">
                        Bot #{race.results[0].tokenIndex.toString()}
                      </span>
                      <span className="text-muted-foreground">
                        ({race.results[0].finalTime.toFixed(2)}s)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Event Registration Section component
function EventRegistrationSection({ event }: { event: any }) {
  const { user } = useAuth();
  const { data: myBots, isLoading: botsLoading } = useMyBots();
  const registerMutation = useRegisterForEvent();
  const unregisterMutation = useUnregisterFromEvent();
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [selectedBotIndex, setSelectedBotIndex] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [withdrawingBotId, setWithdrawingBotId] = useState<number | null>(null);
  
  // Get user's registered bot indices for profile lookup
  const userRegisteredIndices = event.registrations?.filter(
    (reg: any) => reg.owner.toString() === user?.principal
  ).map((r: any) => Number(r.tokenIndex)) || [];
  const { data: botProfiles = [] } = useGetBotProfilesBatch(userRegisteredIndices);
  const [withdrawConfirmBot, setWithdrawConfirmBot] = useState<{ tokenIndex: number; raceClass: any } | null>(null);
  
  const now = Date.now() * 1_000_000; // nanoseconds
  const registrationOpen = Number(event.registrationOpens) < now && Number(event.registrationCloses) > now;
  const registrationClosed = Number(event.registrationCloses) < now;
  
  // Get registration counts by class
  const registrationCounts = event.registrationCounts?.byClass || [];
  const totalRegistrations = event.registrationCounts?.total || 0;
  const maxPerClass = Number(event.maxRegistrationsPerClass) || 10;
  
  // Get user's current registrations
  const userRegistrations = event.registrations?.filter(
    (reg: any) => reg.owner.toString() === user?.principal
  ) || [];
  
  // Get eligible bots for each class (not already registered)
  const userRegisteredBotIds = userRegistrations.map((r: any) => Number(r.tokenIndex));
  const initializedBots = myBots?.filter(b => b.isInitialized && !userRegisteredBotIds.includes(Number(b.tokenIndex))) || [];
  
  // Handle registration
  const handleRegister = async () => {
    if (!selectedBotIndex || !selectedClass) {
      toast.error('Please select a bot and class');
      return;
    }
    
    try {
      await registerMutation.mutateAsync({
        eventId: Number(event.eventId),
        tokenIndex: Number(selectedBotIndex),
      });
      toast.success(`Bot #${selectedBotIndex} registered for ${event.metadata.name}!`);
      setShowRegisterDialog(false);
      setSelectedBotIndex('');
      setSelectedClass('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to register');
    }
  };
  
  // Calculate refund percentage based on cancellation deadlines
  const getRefundInfo = (tokenIndex: number, raceClass: any): { percentage: number; refundAmount: bigint; penalty: number; entryFee: bigint } => {
    const nowNs = BigInt(Date.now() * 1_000_000); // Convert to nanoseconds
    const entryFee = calculateBracketEntryFee(BigInt(event.metadata?.entryFee || 0), raceClass);
    
    if (nowNs <= BigInt(event.cancellationDeadlines?.fullRefund || 0)) {
      return { percentage: 100, refundAmount: entryFee, penalty: 0, entryFee };
    } else if (nowNs <= BigInt(event.cancellationDeadlines?.halfRefund || 0)) {
      return { percentage: 50, refundAmount: entryFee / 2n, penalty: 50, entryFee };
    } else if (nowNs <= BigInt(event.cancellationDeadlines?.quarterRefund || 0)) {
      return { percentage: 25, refundAmount: entryFee / 4n, penalty: 75, entryFee };
    } else {
      return { percentage: 0, refundAmount: 0n, penalty: 100, entryFee };
    }
  };

  // Handle unregistration
  const handleUnregister = async (tokenIndex: number) => {
    setWithdrawingBotId(tokenIndex);
    setWithdrawConfirmBot(null);
    try {
      const result = await unregisterMutation.mutateAsync({
        eventId: Number(event.eventId),
        tokenIndex,
      });
      toast.success(`Bot #${tokenIndex} unregistered. Refund: ${(Number(result.refundAmount) / 100_000_000).toFixed(4)} ICP`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unregister');
    } finally {
      setWithdrawingBotId(null);
    }
  };
  
  // Get eligible bots for selected class
  const eligibleBots = selectedClass && event.metadata.divisions
    ? initializedBots.filter(bot => {
        const classVariant = event.metadata.divisions.find((d: any) => Object.keys(d)[0] === selectedClass);
        return classVariant && isBotEligibleForClass(bot, classVariant);
      })
    : [];
  
  return (
    <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📝 Event Registration
        </CardTitle>
        <CardDescription>
          Register your bots now - races will be created when registration closes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Entry Requirements (show if restricted) */}
        {event.visibility && 'Restricted' in event.visibility && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔒</span>
              <p className="text-sm font-semibold text-amber-500">Entry Requirements</p>
            </div>
            <div className="space-y-2 text-sm">
              {event.visibility.Restricted.minElo?.[0] && (
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground">Minimum ELO:</span>
                  <span className="font-bold text-amber-400">{event.visibility.Restricted.minElo[0]}</span>
                </p>
              )}
              {event.visibility.Restricted.maxElo?.[0] && (
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground">Maximum ELO:</span>
                  <span className="font-bold text-amber-400">{event.visibility.Restricted.maxElo[0]}</span>
                </p>
              )}
              {event.visibility.Restricted.requiredFaction?.[0] && (
                <p className="flex items-center gap-2">
                  <span className="text-muted-foreground">Required Faction:</span>
                  <span className="font-bold text-amber-400">{event.visibility.Restricted.requiredFaction[0]}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Registration Timeline */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Registration Opens</p>
            <p className="text-sm font-semibold text-primary">{formatDate(event.registrationOpens)}</p>
          </div>
          <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Registration Closes</p>
            <p className="text-sm font-semibold text-primary">{formatDate(event.registrationCloses)}</p>
          </div>
        </div>
        
        {/* Minimum Participants Warning */}
        {Number(totalRegistrations) < Number(event.metadata.minEntries) && !registrationClosed && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <p className="text-sm font-medium text-amber-500">
                {Number(event.metadata.minEntries) - Number(totalRegistrations)} more participant{Number(event.metadata.minEntries) - Number(totalRegistrations) !== 1 ? 's' : ''} needed (minimum {Number(event.metadata.minEntries)} required for event to proceed)
              </p>
            </div>
          </div>
        )}
        
        {/* Registration Slots by Division */}
        <div>
          <p className="text-sm font-semibold mb-3">Registration Slots</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {event.metadata.divisions?.map((division: any) => {
              const className = Object.keys(division)[0];
              const count = registrationCounts.find((c: any) => Object.keys(c[0])[0] === className)?.[1] || 0;
              const isFull = Number(count) >= maxPerClass;
              
              return (
                <div 
                  key={className}
                  className={`text-center p-3 border rounded-lg ${
                    isFull 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : 'bg-card/50 border-primary/20'
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-1">{getRaceClassName(division)}</p>
                  <p className={`text-lg font-bold ${isFull ? 'text-red-500' : 'text-primary'}`}>
                    {Number(count)}/{maxPerClass}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rating {getClassRatingRange(division)}
                  </p>
                  {isFull && (
                    <Badge variant="destructive" className="mt-1 text-xs">FULL</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Entry Fee Info - Show bracket-scaled fees */}
        <div className="bg-card/50 border border-primary/20 rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold">Entry Fees (by Division)</p>
                <p className="text-xs text-muted-foreground">Refundable if you unregister early</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {event.metadata.divisions?.map((division: any, idx: number) => {
                const divisionName = getRaceClassName(division);
                const scaledFee = calculateBracketEntryFee(BigInt(event.metadata.entryFee), division);
                return (
                  <div key={idx} className="flex flex-col items-center p-2 bg-card/80 border border-primary/20 rounded">
                    <p className="text-xs text-muted-foreground mb-1">{divisionName}</p>
                    <p className="text-sm font-bold text-primary">{formatICP(scaledFee)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Scoring Mode & Event Bonus (only for non-Individual scoring) */}
        {event.metadata.scoringMode && !('Individual' in event.metadata.scoringMode) && (
          <div className="bg-gradient-to-r from-purple-500/10 to-amber-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="default" className="bg-purple-600">
                {'TeamAggregate' in event.metadata.scoringMode ? '🏆 Faction Wars' : 
                 'Cumulative' in event.metadata.scoringMode ? '📊 Cumulative Points' :
                 'Elimination' in event.metadata.scoringMode ? '⚔️ Elimination' : '🏁 Special'}
              </Badge>
              <span className="text-sm font-semibold">
                {'TeamAggregate' in event.metadata.scoringMode ? 'Aggregate Faction Scoring' : 
                 'Cumulative' in event.metadata.scoringMode ? 'Points Across All Stages' :
                 'Elimination' in event.metadata.scoringMode ? 'Elimination Format' : 'Special Event'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {'TeamAggregate' in event.metadata.scoringMode 
                ? 'Points from all races are aggregated by faction. The faction with the most combined points wins the event bonus!' 
                : 'Cumulative' in event.metadata.scoringMode
                ? 'Your points from all stages are added together. The bot with the highest cumulative score wins the event bonus!'
                : 'Special scoring rules apply to this event.'}
            </p>
            {event.metadata.eventBonusPrize && Number(event.metadata.eventBonusPrize) > 0 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-500/20">
                <span className="text-sm font-semibold text-amber-400">🎁 Event Bonus Prize</span>
                <span className="text-lg font-bold text-amber-400">{formatICP(BigInt(event.metadata.eventBonusPrize))}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Race Configuration Info */}
        <div className="bg-card/50 border border-primary/20 rounded-lg p-4">
          <p className="text-sm font-semibold mb-3">Race Configuration</p>
          {'Automatic' in event.raceCreationMode ? (() => {
            const racesPerClass = event.raceCreationMode.Automatic.racesPerClass?.[0] 
              ? Number(event.raceCreationMode.Automatic.racesPerClass[0])
              : null;
            const isMultiStage = racesPerClass && racesPerClass > 1;
            const divisionCount = event.metadata.divisions?.length || 1;
            const totalRaces = racesPerClass ? racesPerClass * divisionCount : null;
            
            return (
              <div className="space-y-4">
                {/* Multi-stage indicator */}
                {isMultiStage && (
                  <div className="flex items-center gap-2 pb-3 border-b border-primary/10">
                    <Badge variant="default" className="bg-purple-600">
                      🏆 Multi-Stage Event
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {racesPerClass} races per division ({totalRaces} total races)
                    </span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Terrains */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Terrains</p>
                    <div className="flex flex-wrap gap-1">
                      {event.raceCreationMode.Automatic.terrains.map((terrain: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {getTerrainIcon(terrain)} {getTerrainName(terrain)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {/* Distance Range */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Distance Range</p>
                    <p className="text-sm font-medium">
                      {Number(event.raceCreationMode.Automatic.distanceRange.min)} - {Number(event.raceCreationMode.Automatic.distanceRange.max)} km
                    </p>
                  </div>
                  {/* Format */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Format</p>
                    <p className="text-sm font-medium">
                      {isMultiStage 
                        ? `${racesPerClass} stages per division`
                        : 'Single race per division'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">Scheduled Races ({event.raceCreationMode.Manual.raceTemplates.length})</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {event.raceCreationMode.Manual.raceTemplates.slice(0, 6).map((template: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-card/30 p-2 rounded">
                    <span>{getTerrainIcon(template.terrain)}</span>
                    <span className="font-medium">{getRaceClassName(template.raceClass)}</span>
                    <span className="text-muted-foreground">{Number(template.distance)}km</span>
                    {template.stageName?.[0] && (
                      <Badge variant="outline" className="text-xs">{template.stageName[0]}</Badge>
                    )}
                  </div>
                ))}
                {event.raceCreationMode.Manual.raceTemplates.length > 6 && (
                  <p className="text-xs text-muted-foreground">
                    +{event.raceCreationMode.Manual.raceTemplates.length - 6} more races...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* User's Registrations */}
        {userRegistrations.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Your Registrations ({userRegistrations.length})</p>
            <div className="space-y-2">
              {userRegistrations.map((reg: any) => {
                const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(reg.tokenIndex));
                const imageUrl = generateExtThumbnailLink(tokenId);
                const profile = botProfiles.find((p: any) => p && Number(p.tokenIndex) === Number(reg.tokenIndex));
                
                return (
                  <div key={reg.tokenIndex.toString()} className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <img
                      src={imageUrl}
                      alt={`Bot #${reg.tokenIndex}`}
                      className="w-10 h-10 rounded border-2 border-green-500/40"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold"><BotNameDisplay tokenIndex={Number(reg.tokenIndex)} profile={profile} /></p>
                      <p className="text-xs text-muted-foreground">
                        {getRaceClassName(reg.raceClass)} Division
                      </p>
                    </div>
                    {registrationOpen && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setWithdrawConfirmBot({ tokenIndex: Number(reg.tokenIndex), raceClass: reg.raceClass })}
                        disabled={withdrawingBotId !== null}
                      >
                        {withdrawingBotId === Number(reg.tokenIndex) ? 'Withdrawing...' : 'Withdraw'}
                      </Button>
                    )}
                    {registrationClosed && (
                      <Badge variant="outline" className="text-green-500">Confirmed</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Registration Button */}
        {registrationOpen && user && (
          <>
            {botsLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
                <p className="text-sm text-muted-foreground">Loading your bots...</p>
              </div>
            ) : initializedBots.length > 0 ? (
              <Button 
                className="w-full" 
                onClick={() => setShowRegisterDialog(true)}
                disabled={registerMutation.isPending}
              >
                📝 Register for Event
              </Button>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-sm text-yellow-600">
                  {myBots?.length === 0 
                    ? "You don't have any bots. Visit the marketplace to get one!"
                    : userRegisteredBotIds.length > 0
                      ? "All your bots are already registered for this event."
                      : "You don't have any initialized bots. Visit your garage to initialize a bot!"}
                </p>
              </div>
            )}
          </>
        )}
        
        {!registrationOpen && !registrationClosed && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
            <p className="text-sm text-blue-400">
              ⏳ Registration opens {formatDate(event.registrationOpens)}
            </p>
          </div>
        )}
        
        {registrationClosed && (
          <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">
              Registration has closed. {totalRegistrations > 0 ? 'Races will be created shortly!' : 'No registrations received.'}
            </p>
          </div>
        )}
        
        {!user && registrationOpen && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-sm text-yellow-600">Sign in to register for this event</p>
          </div>
        )}

        {/* Register Dialog */}
        <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register for {event.metadata.name}</DialogTitle>
              <DialogDescription>
                Select a division and bot to register. Entry fees vary by division (based on bot rating).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Class Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Select Division</label>
                <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedBotIndex(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a division..." />
                  </SelectTrigger>
                  <SelectContent>
                    {event.metadata.divisions?.map((division: any) => {
                      const className = Object.keys(division)[0];
                      const count = registrationCounts.find((c: any) => Object.keys(c[0])[0] === className)?.[1] || 0;
                      const isFull = Number(count) >= maxPerClass;
                      const scaledFee = calculateBracketEntryFee(BigInt(event.metadata.entryFee), division);
                      
                      return (
                        <SelectItem 
                          key={className} 
                          value={className}
                          disabled={isFull}
                        >
                          <div className="flex items-center gap-2">
                            <span>{getRaceClassName(division)}</span>
                            <span className="text-xs text-muted-foreground">
                              (Rating {getClassRatingRange(division)})
                            </span>
                            <span className="text-xs text-primary font-medium">
                              {formatICP(scaledFee)}
                            </span>
                            <span className={`text-xs ${isFull ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {Number(count)}/{maxPerClass}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedClass && (
                  <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-sm">
                    <span className="text-muted-foreground">Entry fee for {getRaceClassName({ [selectedClass]: null })}: </span>
                    <span className="font-bold text-primary">
                      {formatICP(calculateBracketEntryFee(BigInt(event.metadata.entryFee), { [selectedClass]: null }))}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Bot Selection */}
              {selectedClass && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Bot</label>
                  {eligibleBots.length > 0 ? (
                    <Select value={selectedBotIndex} onValueChange={setSelectedBotIndex}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a bot..." />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleBots.map((bot) => {
                          const rating = bot.maxStats ? Math.floor(
                            (Number(bot.maxStats.speed) + Number(bot.maxStats.powerCore) + 
                             Number(bot.maxStats.acceleration) + Number(bot.maxStats.stability)) / 4
                          ) : 0;
                          
                          return (
                            <SelectItem key={bot.tokenIndex.toString()} value={bot.tokenIndex.toString()}>
                              <div className="flex items-center gap-2">
                                <span>Bot #{bot.tokenIndex.toString()}</span>
                                {bot.name && <span className="text-muted-foreground">- {bot.name}</span>}
                                <span className="text-xs text-muted-foreground">(Rating: {rating})</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <p className="text-sm text-yellow-600">
                        No eligible bots for {getRaceClassName({ [selectedClass]: null })} division.
                        Rating requirement: {getClassRatingRange({ [selectedClass]: null })}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    setShowRegisterDialog(false);
                    setSelectedBotIndex('');
                    setSelectedClass('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleRegister}
                  disabled={!selectedBotIndex || !selectedClass || registerMutation.isPending}
                >
                  {registerMutation.isPending ? 'Registering...' : 'Confirm Registration'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Withdrawal Confirmation Dialog */}
        <AlertDialog open={!!withdrawConfirmBot} onOpenChange={(open) => !open && setWithdrawConfirmBot(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Withdraw from Event?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    You are about to withdraw Bot #{withdrawConfirmBot?.tokenIndex} from <span className="font-semibold">{event.metadata?.name || `Event #${event.eventId}`}</span>.
                  </p>
                  
                  {withdrawConfirmBot && (() => {
                    const refundInfo = getRefundInfo(withdrawConfirmBot.tokenIndex, withdrawConfirmBot.raceClass);
                    
                    return (
                      <div className={`p-3 rounded-lg ${
                        refundInfo.percentage === 100 ? 'bg-green-500/10 border border-green-500/30' :
                        refundInfo.percentage === 50 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                        refundInfo.percentage === 25 ? 'bg-orange-500/10 border border-orange-500/30' :
                        'bg-red-500/10 border border-red-500/30'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Refund Rate:</span>
                          <span className={`font-bold ${
                            refundInfo.percentage === 100 ? 'text-green-500' :
                            refundInfo.percentage === 50 ? 'text-yellow-500' :
                            refundInfo.percentage === 25 ? 'text-orange-500' :
                            'text-red-500'
                          }`}>{refundInfo.percentage}%</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Entry Fee Paid:</span>
                          <span className="text-sm">{formatICP(refundInfo.entryFee)}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">You Will Receive:</span>
                          <span className="text-sm font-semibold text-green-400">{formatICP(refundInfo.refundAmount)}</span>
                        </div>
                        {refundInfo.penalty > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Penalty ({refundInfo.penalty}%):</span>
                            <span className="text-sm text-red-400">-{formatICP(refundInfo.entryFee - refundInfo.refundAmount)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Cancellation penalties increase as the event approaches. Early cancellations get full refunds.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Registration</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (withdrawConfirmBot) {
                    handleUnregister(withdrawConfirmBot.tokenIndex);
                  }
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                Withdraw
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

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
  // Fetch bot profiles in a single batch query
  const botIndices = results.map(r => Number(r.nftId));
  const { data: botProfiles = [] } = useGetBotProfilesBatch(botIndices);

  const allLoaded = botProfiles.length === botIndices.length;

  if (!allLoaded) {
    return (
      <div className="w-full h-48 flex items-center justify-center">
        <p className="text-muted-foreground">Loading race visualization...</p>
      </div>
    );
  }

  // Helper to extract faction string from Candid variant (handles optional array wrapper)
  const getFactionString = (faction: any): string => {
    if (!faction) return 'Unknown';
    // Handle Candid optional: [] for None, [value] for Some(value)
    const unwrapped = Array.isArray(faction) && faction.length > 0 ? faction[0] : faction;
    if (!unwrapped) return 'Unknown';
    if (typeof unwrapped === 'string') return unwrapped;
    const keys = Object.keys(unwrapped);
    return keys.length > 0 ? keys[0] : 'Unknown';
  };

  // Helper to extract terrain string from Candid variant (handles optional array wrapper)
  const getTerrainString = (terrain: any): string => {
    if (!terrain) return 'ScrapHeaps';
    // Handle Candid optional: [] for None, [value] for Some(value)
    const unwrapped = Array.isArray(terrain) && terrain.length > 0 ? terrain[0] : terrain;
    if (!unwrapped) return 'ScrapHeaps';
    if (typeof unwrapped === 'string') return unwrapped;
    const keys = Object.keys(unwrapped);
    return keys.length > 0 ? keys[0] : 'ScrapHeaps';
  };

  // Map results with stats from entries and faction/terrain from profiles
  const resultsWithStats = results.map((r: any, idx: number) => {
    // Backend might return stats as optional array [stats] or direct object
    const statsData = r.stats && r.stats.length > 0 && r.stats[0] ? r.stats[0] : r.stats;
    const nftId = Number(r.nftId);
    
    // Get faction and preferredTerrain from bot profile for daily affinity calculation
    const profile = botProfiles.find((p: any) => p && Number(p.tokenIndex) === nftId);
    
    // DEBUG: Log faction for bot 4247
    if (nftId === 4247) {
      console.log('=== BOT 4247 FACTION DEBUG ===');
      console.log('profile:', profile);
      console.log('profile?.faction:', profile?.faction);
      console.log('getFactionString result:', getFactionString(profile?.faction));
    }
    
    const finalStats = statsData ? {
      speed: Number(statsData.speed),
      stability: Number(statsData.stability),
      powerCore: Number(statsData.powerCore),
      acceleration: Number(statsData.acceleration),
      luck: Number(statsData.luck ?? 10), // Default luck of 10 if not present
      overcharge: Number(statsData.overcharge ?? 0),
      perfectTuneUp: statsData.perfectTuneUp === true,
      // Include baseAvgRating for MomentumShift phenomenon calculation
      // This is the unbuffed average rating that was snapshotted at race start
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
      dnf: r.dnf === true, // Did Not Finish flag from backend
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


function RaceCard({ raceId, isFirstRace }: { raceId: bigint; isFirstRace: boolean }) {
  const { user } = useAuth();
  const { data: myBots, isLoading: botsLoading } = useMyBots();
  const enterRaceMutation = useEnterRace();
  const [showEnterDialog, setShowEnterDialog] = useState(false);
  const [selectedBotIndex, setSelectedBotIndex] = useState<string>('');
  
  // Calculate if we need aggressive polling
  const { data: race } = useGetRaceById(Number(raceId));
  
  // Fetch bot profiles in batch for all race entries and results
  const entryIndices = race?.entries ? race.entries.map((e: any) => Number(e.nftId)) : [];
  const resultIndices = race?.results && race.results.length > 0 && race.results[0] 
    ? race.results[0].map((r: any) => Number(r.nftId)) 
    : [];
  const allBotIndices = [...new Set([...entryIndices, ...resultIndices])]; // Deduplicate
  const { data: botProfiles = [] } = useGetBotProfilesBatch(allBotIndices);
  
  const now = Date.now() * 1_000_000;
  const isUpcoming = race && 'Upcoming' in race.status;
  const isInProgress = race && 'InProgress' in race.status;
  const raceStartTime = race ? Number(race.startTime) : 0;
  const isImminentStart = isUpcoming && raceStartTime < now;
  const isActiveOrImminent = !!(isInProgress || isImminentStart);
  

  if (!race) {
    return (
      <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading race details...</p>
        </CardContent>
      </Card>
    );
  }

  const entryCount = race.entries.length;
  // Calculate estimated prize pool: (entry fee × current entries) + platform bonus
  const estimatedPrizePool = (Number(race.entryFee) * entryCount) + Number(race.platformBonus);

  // Check if user is authenticated
  const isAuthenticated = !!user;
  
  const isFull = race.entries.length >= Number(race.maxEntries);
  const entryDeadlinePassed = Number(race.entryDeadline) / 1_000_000 < Date.now();
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
              {'Upcoming' in race.status && (
                <>
                  ⏳ Upcoming
                  <span className="block text-xs text-muted-foreground font-normal">
                    {formatTimeUntil(Number(race.startTime))}
                  </span>
                </>
              )}
              {'InProgress' in race.status && '🏁 Racing'}
              {'Completed' in race.status && '✅ Done'}
              {'Cancelled' in race.status && '❌ Cancelled'}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Race Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Entry Fee</p>
            <p className="text-base font-bold text-primary">{formatICP(race.entryFee)}</p>
            <p className="text-xs text-muted-foreground mt-1">{raceClass}</p>
          </div>
          <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Prize Pool</p>
            <p className="text-base font-bold text-primary">{formatICP(BigInt(estimatedPrizePool))}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Est. {entryCount} × {formatICP(race.entryFee)}</p>
          </div>
          <div className="text-center p-3 bg-card/50 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Entries</p>
            <p className="text-base font-bold text-primary">{entryCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Participants</p>
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
        
        {entryDeadlinePassed && isUpcoming && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <p className="text-sm text-destructive">Entry deadline has passed</p>
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
                        <p className="text-sm font-semibold"><BotNameDisplay tokenIndex={typeof tokenIndex === 'number' ? tokenIndex : 0} profile={botProfiles.find(p => p && Number(p.tokenIndex) === (typeof tokenIndex === 'number' ? tokenIndex : 0))} /></p>
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
              raceCreatedAt={race.createdAt}
              raceStatus={race.status}
              events={(race as any).events || []}
              disableAutoplay={!isFirstRace}
              raceId={Number(raceId)}
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
                        <p className="font-semibold"><BotNameDisplay tokenIndex={Number(result.nftId)} profile={botProfiles.find(p => p && Number(p.tokenIndex) === Number(result.nftId))} /></p>
                        <p className="text-xs text-muted-foreground">
                          {result.finalTime.toFixed(2)}s
                        </p>
                      </div>
                      <div className="text-right space-y-0.5">
                        {hasPrize && (
                          <p className="text-sm text-green-500 font-bold">
                            +{formatICP(result.prizeAmount)}
                          </p>
                        )}
                        {result.partsEarned && result.partsEarned > 0 && (
                          <p className="text-xs text-cyan-500 font-semibold">
                            +{result.partsEarned} {result.partType}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
                })}
              </div>
            </div>
            </>
          );
        })()}
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
  
  // Determine if completed or in progress early to conditionally fetch results
  const isCompleted = event && 'Completed' in event.status;
  const isInProgress = !!(event && 'InProgress' in event.status);
  const shouldFetchResults = isCompleted || isInProgress;
  const { data: eventResults } = useGetEventResults(shouldFetchResults ? Number(eventId) : 0, isInProgress);

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
  const registrationClosed = Number(event.registrationCloses) < now;
  
  // Check if this is a multi-stage event (has non-Individual scoring or multiple races per class)
  const isMultiStage = eventResults?.isMultiStage || 
    (event.metadata.scoringMode && !('Individual' in event.metadata.scoringMode)) ||
    ('Automatic' in event.raceCreationMode && 
     event.raceCreationMode.Automatic.racesPerClass?.[0] && 
     Number(event.raceCreationMode.Automatic.racesPerClass[0]) > 1);
  
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
              {(() => {
                const et = event.eventType;
                const isFree = Number(event.metadata.entryFee) === 0;
                if (isFree) return null;
                const tier = 'DailySprint' in et ? { label: 'Daily Loot', color: 'text-gray-400', detail: '40% miss · Common focus' }
                  : 'WeeklyLeague' in et ? { label: 'Weekly Loot', color: 'text-blue-400', detail: '15% miss · Rare+' }
                  : 'MonthlyCup' in et ? { label: 'Monthly Loot', color: 'text-purple-400', detail: 'Guaranteed drop · Rare+ minimum' }
                  : 'SpecialEvent' in et ? { label: 'Special Loot', color: 'text-amber-400', detail: '15% miss · Legendary eligible' }
                  : null;
                if (!tier) return null;
                return (
                  <span className={tier.color} title={tier.detail}>
                    🎁 {tier.label}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Event Stats */}
          <Card className="mb-8 border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Start Time</p>
                  <p className="text-base font-bold text-primary">{formatDate(event.scheduledTime)}</p>
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Races</p>
                  <p className="text-xl font-bold text-primary">{event.raceIds.length}</p>
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Registered</p>
                  <p className="text-xl font-bold text-primary">
                    {Number(event.registrationCounts?.total || 0)}
                  </p>
                </div>
                <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Points</p>
                  <p className="text-xl font-bold text-primary">{event.metadata.pointsMultiplier}x</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Standings for in-progress or completed multi-stage events */}
          {(isCompleted || isInProgress) && isMultiStage && (
            <EventStandings eventId={Number(eventId)} isInProgress={isInProgress} />
          )}

          {/* Registration Section for events without races yet */}
          {event.raceIds.length === 0 && (
            <EventRegistrationSection event={event} />
          )}

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
                      {'Automatic' in event.raceCreationMode 
                        ? "Races will be created automatically when registration closes. Register above to participate!"
                        : "Races for this event will be created automatically one week before the event date. Check back closer to the event to see the race schedule and register your bots!"}
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
              event.raceIds.map((raceId: bigint, idx: number) => (
                <RaceCard 
                  key={raceId.toString()} 
                  raceId={raceId}
                  isFirstRace={idx === 0}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
