import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetEventDetails, useGetRacesByIds, useGetBotProfilesBatch, useRegisterForEvent, useUnregisterFromEvent, useGetEventResults } from "@/hooks/useRacing";
import { useMyBots } from "@/hooks/useGarage";
import { useAuth } from "@/hooks/useAuth";
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';
import { toast } from 'sonner';

import { EventHeroHeader, LiveRacesPanel, StandingsPanel, SchedulePanel, StickyLiveBanner, IndividualResultsPanel } from '@/components/event';

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

function getRaceClassName(raceClass: any): string {
  if (!raceClass) return 'Unknown';
  if ('Scrap' in raceClass) return 'Scrap';
  if ('Junker' in raceClass) return 'Junker';
  if ('Raider' in raceClass) return 'Raider';
  if ('Elite' in raceClass) return 'Elite';
  if ('SilentKlan' in raceClass) return 'Silent Klan';
  return 'Unknown';
}

function getClassRatingRange(raceClass: any): string {
  if (!raceClass) return '';
  if ('Scrap' in raceClass) return '0-19';
  if ('Junker' in raceClass) return '20-29';
  if ('Raider' in raceClass) return '30-39';
  if ('Elite' in raceClass) return '40-49';
  if ('SilentKlan' in raceClass) return '50+';
  return '';
}

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

function BotNameDisplay({ tokenIndex, profile, compact = false }: { tokenIndex: number; profile?: any; compact?: boolean }) {
  if (profile?.name && profile.name.length > 0 && profile.name[0]) {
    if (compact) return <>{profile.name[0]}</>;
    return <>PokedBot #{tokenIndex} - {profile.name[0]}</>;
  }
  return <>Bot #{tokenIndex}</>;
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

// ============================================================================
// REGISTRATION PANEL COMPONENT
// ============================================================================

function RegistrationPanel({ event }: { event: any }) {
  const { user } = useAuth();
  const { data: myBots, isLoading: botsLoading } = useMyBots();
  const registerMutation = useRegisterForEvent();
  const unregisterMutation = useUnregisterFromEvent();
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [selectedBotIndex, setSelectedBotIndex] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [withdrawingBotId, setWithdrawingBotId] = useState<number | null>(null);
  
  const userRegisteredIndices = event.registrations?.filter(
    (reg: any) => reg.owner.toString() === user?.principal
  ).map((r: any) => Number(r.tokenIndex)) || [];
  const { data: botProfiles = [] } = useGetBotProfilesBatch(userRegisteredIndices);
  const [withdrawConfirmBot, setWithdrawConfirmBot] = useState<{ tokenIndex: number; raceClass: any } | null>(null);
  
  const now = Date.now() * 1_000_000;
  const registrationOpen = Number(event.registrationOpens) < now && Number(event.registrationCloses) > now;
  const registrationClosed = Number(event.registrationCloses) < now;
  
  const registrationCounts = event.registrationCounts?.byClass || [];
  const totalRegistrations = event.registrationCounts?.total || 0;
  const maxPerClass = Number(event.maxRegistrationsPerClass) || 10;
  
  const userRegistrations = event.registrations?.filter(
    (reg: any) => reg.owner.toString() === user?.principal
  ) || [];
  
  const userRegisteredBotIds = userRegistrations.map((r: any) => Number(r.tokenIndex));
  const initializedBots = myBots?.filter(b => b.isInitialized && !userRegisteredBotIds.includes(Number(b.tokenIndex))) || [];
  
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
  
  const getRefundInfo = (tokenIndex: number, raceClass: any): { percentage: number; refundAmount: bigint; penalty: number; entryFee: bigint } => {
    const nowNs = BigInt(Date.now() * 1_000_000);
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
  
  const eligibleBots = selectedClass && event.metadata.divisions
    ? initializedBots.filter(bot => {
        const classVariant = event.metadata.divisions.find((d: any) => Object.keys(d)[0] === selectedClass);
        return classVariant && isBotEligibleForClass(bot, classVariant);
      })
    : [];
  
  return (
    <div className="space-y-6">
      {/* Entry Requirements (show if restricted) */}
      {event.visibility && 'Restricted' in event.visibility && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔒</span>
              <p className="text-sm font-semibold text-amber-500">Entry Requirements</p>
            </div>
            <div className="space-y-2 text-sm">
              {event.visibility.Restricted.minElo?.[0] && (
                <p>Minimum ELO: <span className="font-bold text-amber-400">{event.visibility.Restricted.minElo[0]}</span></p>
              )}
              {event.visibility.Restricted.maxElo?.[0] && (
                <p>Maximum ELO: <span className="font-bold text-amber-400">{event.visibility.Restricted.maxElo[0]}</span></p>
              )}
              {event.visibility.Restricted.requiredFaction?.[0] && (
                <p>Required Faction: <span className="font-bold text-amber-400">{event.visibility.Restricted.requiredFaction[0]}</span></p>
              )}
              {event.visibility.Restricted.allowedBots?.[0] && event.visibility.Restricted.allowedBots[0].length > 0 && (
                <div>
                  <p className="mb-1">Whitelisted Bots:</p>
                  <div className="flex flex-wrap gap-1">
                    {event.visibility.Restricted.allowedBots[0].map((botId: bigint, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-primary/10 border-primary/30">
                        #{Number(botId)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registration Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📅 Registration Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Opens</p>
              <p className="text-sm font-semibold">{formatDate(event.registrationOpens)}</p>
            </div>
            <div className="text-center p-4 bg-card/50 border border-primary/20 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Closes</p>
              <p className="text-sm font-semibold">{formatDate(event.registrationCloses)}</p>
            </div>
          </div>
          
          {/* Minimum Participants Warning */}
          {Number(totalRegistrations) < Number(event.metadata.minEntries) && !registrationClosed && (
            <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-sm text-amber-500">
                ⚠️ {Number(event.metadata.minEntries) - Number(totalRegistrations)} more needed (min {Number(event.metadata.minEntries)})
              </p>
            </div>
          )}
        </CardContent>
      </Card>
        
      {/* Registration Slots by Division */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🎯 Division Slots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {event.metadata.divisions?.map((division: any) => {
              const className = Object.keys(division)[0];
              const count = registrationCounts.find((c: any) => Object.keys(c[0])[0] === className)?.[1] || 0;
              const isFull = Number(count) >= maxPerClass;
              const scaledFee = calculateBracketEntryFee(BigInt(event.metadata.entryFee), division);
              return (
                <div key={className} className={`text-center p-3 border rounded-lg ${isFull ? 'bg-red-500/10 border-red-500/30' : 'bg-card/50 border-primary/20'}`}>
                  <p className="text-sm font-semibold mb-1">{getRaceClassName(division)}</p>
                  <p className={`text-lg font-bold ${isFull ? 'text-red-500' : 'text-primary'}`}>{Number(count)}/{maxPerClass}</p>
                  <p className="text-xs text-muted-foreground">Rating {getClassRatingRange(division)}</p>
                  <p className="text-xs text-amber-400 mt-1">{formatICP(scaledFee)}</p>
                  {isFull && <Badge variant="destructive" className="mt-1 text-xs">FULL</Badge>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Scoring Mode Info */}
      {event.metadata.scoringMode && !('Individual' in event.metadata.scoringMode) && (
        <Card className="bg-gradient-to-r from-purple-500/10 to-amber-500/10 border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="default" className="bg-purple-600">
                {'TeamAggregate' in event.metadata.scoringMode ? '🏆 Faction Wars' : 
                 'Cumulative' in event.metadata.scoringMode ? '📊 Cumulative Points' : '🏁 Special'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {'TeamAggregate' in event.metadata.scoringMode 
                ? 'Points aggregated by faction. Winning faction splits the bonus!' 
                : 'Your points from all stages add up. Highest score wins!'}
            </p>
            {event.metadata.eventBonusPrize && Number(event.metadata.eventBonusPrize) > 0 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-purple-500/20">
                <span className="text-sm font-semibold text-amber-400">🎁 Event Bonus</span>
                <span className="text-lg font-bold text-amber-400">{formatICP(BigInt(event.metadata.eventBonusPrize))}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Race Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">⚙️ Race Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {'Automatic' in event.raceCreationMode ? (() => {
            const racesPerClass = event.raceCreationMode.Automatic.racesPerClass?.[0] 
              ? Number(event.raceCreationMode.Automatic.racesPerClass[0]) : null;
            const isMultiStage = racesPerClass && racesPerClass > 1;
            const divisionCount = event.metadata.divisions?.length || 1;
            const totalRaces = racesPerClass ? racesPerClass * divisionCount : null;
            return (
              <div className="space-y-4">
                {isMultiStage && (
                  <div className="flex items-center gap-2 pb-3 border-b border-primary/10">
                    <Badge variant="default" className="bg-purple-600">🏆 Multi-Stage</Badge>
                    <span className="text-sm text-muted-foreground">{racesPerClass} races/division ({totalRaces} total)</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Distance</p>
                    <p className="text-sm font-medium">
                      {Number(event.raceCreationMode.Automatic.distanceRange.min)} - {Number(event.raceCreationMode.Automatic.distanceRange.max)} km
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Format</p>
                    <p className="text-sm font-medium">{isMultiStage ? 'Multi-stage' : 'Single race'}/division</p>
                  </div>
                </div>
              </div>
            );
          })() : (() => {
            const templates = event.raceCreationMode.Manual.raceTemplates;
            // Group templates by stage name or race class
            const uniqueTerrains = [...new Set(templates.map((t: any) => JSON.stringify(t.terrain)))].map(t => JSON.parse(t as string));
            const distances = templates.map((t: any) => Number(t.distance));
            const minDist = Math.min(...distances);
            const maxDist = Math.max(...distances);
            const uniqueClasses = [...new Set(templates.map((t: any) => {
              const classKey = Object.keys(t.raceClass)[0];
              return classKey;
            }))] as string[];
            const stageNames = templates.map((t: any) => t.stageName?.[0]).filter(Boolean) as string[];
            const uniqueStages = [...new Set(stageNames)] as string[];
            
            return (
              <div className="space-y-4">
                {templates.length > 1 && (
                  <div className="flex items-center gap-2 pb-3 border-b border-primary/10">
                    <Badge variant="default" className="bg-purple-600">🏆 Multi-Stage</Badge>
                    <span className="text-sm text-muted-foreground">{templates.length} races configured</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Terrains</p>
                    <div className="flex flex-wrap gap-1">
                      {uniqueTerrains.map((terrain: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {getTerrainIcon(terrain)} {getTerrainName(terrain)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Distance</p>
                    <p className="text-sm font-medium">
                      {minDist === maxDist ? `${minDist} km` : `${minDist} - ${maxDist} km`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Classes</p>
                    <div className="flex flex-wrap gap-1">
                      {uniqueClasses.map((cls: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{cls}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                {uniqueStages.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Stages</p>
                    <div className="flex flex-wrap gap-1">
                      {uniqueStages.map((stage: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{stage}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>
      
      {/* User's Registrations */}
      {userRegistrations.length > 0 && (
        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="text-lg text-green-500">✓ Your Registrations ({userRegistrations.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {userRegistrations.map((reg: any) => {
              const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(reg.tokenIndex));
              const imageUrl = generateExtThumbnailLink(tokenId);
              const profile = botProfiles.find((p: any) => p && Number(p.tokenIndex) === Number(reg.tokenIndex));
              return (
                <div key={reg.tokenIndex.toString()} className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <img src={imageUrl} alt={`Bot #${reg.tokenIndex}`} className="w-10 h-10 rounded border-2 border-green-500/40" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold"><BotNameDisplay tokenIndex={Number(reg.tokenIndex)} profile={profile} /></p>
                    <p className="text-xs text-muted-foreground">{getRaceClassName(reg.raceClass)} Division</p>
                  </div>
                  {registrationOpen && (
                    <Button variant="outline" size="sm" onClick={() => setWithdrawConfirmBot({ tokenIndex: Number(reg.tokenIndex), raceClass: reg.raceClass })} disabled={withdrawingBotId !== null}>
                      {withdrawingBotId === Number(reg.tokenIndex) ? 'Withdrawing...' : 'Withdraw'}
                    </Button>
                  )}
                  {registrationClosed && <Badge variant="outline" className="text-green-500">Confirmed</Badge>}
                </div>
              );
            })}
          </CardContent>
        </Card>
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
            <Button className="w-full" size="lg" onClick={() => setShowRegisterDialog(true)} disabled={registerMutation.isPending}>
              📝 Register for Event
            </Button>
          ) : (
            <Card className="border-yellow-500/30 bg-yellow-500/10">
              <CardContent className="py-4">
                <p className="text-sm text-yellow-600">
                  {myBots?.length === 0 ? "No bots. Visit marketplace!" : userRegisteredBotIds.length > 0 ? "All bots registered." : "No initialized bots."}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
      
      {!registrationOpen && !registrationClosed && (
        <Card className="border-blue-500/30 bg-blue-500/10">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-blue-400">⏳ Registration opens {formatDate(event.registrationOpens)}</p>
          </CardContent>
        </Card>
      )}
      
      {registrationClosed && (
        <Card className="border-gray-500/30 bg-gray-500/10">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              {event.raceIds?.length > 0 
                ? `Registration closed. ${event.raceIds.length} race${event.raceIds.length > 1 ? 's' : ''} scheduled.`
                : totalRegistrations > 0 
                  ? 'Registration closed. Races will be created shortly!' 
                  : 'Registration closed. No registrations.'}
            </p>
          </CardContent>
        </Card>
      )}
      
      {!user && registrationOpen && (
        <Card className="border-yellow-500/30 bg-yellow-500/10">
          <CardContent className="py-4">
            <p className="text-sm text-yellow-600">Sign in to register</p>
          </CardContent>
        </Card>
      )}

      {/* Register Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register for {event.metadata.name}</DialogTitle>
            <DialogDescription>Select a division and bot. Entry fees vary by division.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Division</label>
              <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedBotIndex(''); }}>
                <SelectTrigger><SelectValue placeholder="Choose a division..." /></SelectTrigger>
                <SelectContent>
                  {event.metadata.divisions?.map((division: any) => {
                    const className = Object.keys(division)[0];
                    const count = registrationCounts.find((c: any) => Object.keys(c[0])[0] === className)?.[1] || 0;
                    const isFull = Number(count) >= maxPerClass;
                    const scaledFee = calculateBracketEntryFee(BigInt(event.metadata.entryFee), division);
                    return (
                      <SelectItem key={className} value={className} disabled={isFull}>
                        <div className="flex items-center gap-2">
                          <span>{getRaceClassName(division)}</span>
                          <span className="text-xs text-muted-foreground">(Rating {getClassRatingRange(division)})</span>
                          <span className="text-xs text-primary font-medium">{formatICP(scaledFee)}</span>
                          <span className={`text-xs ${isFull ? 'text-red-500' : 'text-muted-foreground'}`}>{Number(count)}/{maxPerClass}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedClass && (
                <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-sm">
                  Entry fee: <span className="font-bold text-primary">{formatICP(calculateBracketEntryFee(BigInt(event.metadata.entryFee), { [selectedClass]: null }))}</span>
                </div>
              )}
            </div>
            {selectedClass && (
              <div>
                <label className="text-sm font-medium mb-2 block">Select Bot</label>
                {eligibleBots.length > 0 ? (
                  <Select value={selectedBotIndex} onValueChange={setSelectedBotIndex}>
                    <SelectTrigger><SelectValue placeholder="Choose a bot..." /></SelectTrigger>
                    <SelectContent>
                      {eligibleBots.map((bot) => {
                        const rating = bot.maxStats ? Math.floor((Number(bot.maxStats.speed) + Number(bot.maxStats.powerCore) + Number(bot.maxStats.acceleration) + Number(bot.maxStats.stability)) / 4) : 0;
                        return (
                          <SelectItem key={bot.tokenIndex.toString()} value={bot.tokenIndex.toString()}>
                            Bot #{bot.tokenIndex.toString()} {bot.name && `- ${bot.name}`} (Rating: {rating})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-sm text-yellow-600">No eligible bots for {getRaceClassName({ [selectedClass]: null })} (Rating {getClassRatingRange({ [selectedClass]: null })})</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={() => { setShowRegisterDialog(false); setSelectedBotIndex(''); setSelectedClass(''); }}>Cancel</Button>
              <Button className="flex-1" onClick={handleRegister} disabled={!selectedBotIndex || !selectedClass || registerMutation.isPending}>
                {registerMutation.isPending ? 'Registering...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Confirmation */}
      <AlertDialog open={!!withdrawConfirmBot} onOpenChange={(open) => !open && setWithdrawConfirmBot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw from Event?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Withdraw Bot #{withdrawConfirmBot?.tokenIndex} from {event.metadata?.name}?</p>
                {withdrawConfirmBot && (() => {
                  const refundInfo = getRefundInfo(withdrawConfirmBot.tokenIndex, withdrawConfirmBot.raceClass);
                  return (
                    <div className={`p-3 rounded-lg ${refundInfo.percentage === 100 ? 'bg-green-500/10 border border-green-500/30' : refundInfo.percentage === 50 ? 'bg-yellow-500/10 border border-yellow-500/30' : refundInfo.percentage === 25 ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                      <div className="flex justify-between mb-2">
                        <span>Refund Rate:</span>
                        <span className={`font-bold ${refundInfo.percentage === 100 ? 'text-green-500' : refundInfo.percentage === 50 ? 'text-yellow-500' : refundInfo.percentage === 25 ? 'text-orange-500' : 'text-red-500'}`}>{refundInfo.percentage}%</span>
                      </div>
                      <div className="flex justify-between"><span>You'll receive:</span><span className="text-green-400">{formatICP(refundInfo.refundAmount)}</span></div>
                    </div>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Registration</AlertDialogCancel>
            <AlertDialogAction onClick={() => withdrawConfirmBot && handleUnregister(withdrawConfirmBot.tokenIndex)} className="bg-destructive hover:bg-destructive/90">Withdraw</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EventDetailsClient({ eventId }: { eventId: string }) {
  const navigate = useNavigate();
  
  // Determine if we need aggressive polling based on race status
  const [hasActiveRaces, setHasActiveRaces] = useState(false);
  
  const { data: event, isLoading: eventLoading } = useGetEventDetails(Number(eventId), hasActiveRaces);
  
  // Track if user has scrolled away from live section
  const [showStickyBanner, setShowStickyBanner] = useState(false);
  const liveTabRef = useRef<HTMLDivElement>(null);
  
  // Determine statuses
  const isCompleted = event && 'Completed' in event.status;
  const isInProgress = !!(event && 'InProgress' in event.status);
  const hasRaces = event && event.raceIds && event.raceIds.length > 0;
  // Fetch results if event is in progress, completed, OR has races (some may be completed)
  const shouldFetchResults = isCompleted || isInProgress || hasRaces;
  const { data: eventResults } = useGetEventResults(shouldFetchResults ? Number(eventId) : 0, isInProgress);

  // Fetch all race details using the batch hook
  const raceIds = useMemo(() => 
    (event?.raceIds || []).map((raceId: bigint) => Number(raceId)), 
    [event?.raceIds]
  );
  const { races, isLoading: racesLoading } = useGetRacesByIds(raceIds, hasActiveRaces);
  
  // Calculate live/imminent races
  const now = Date.now() * 1_000_000;
  const liveRaces = useMemo(() => races.filter(r => r && 'InProgress' in r.status), [races]);
  const imminentRaces = useMemo(() => races.filter(r => 
    r && 'Upcoming' in r.status && Number(r.startTime) < now + 15 * 60 * 1_000_000_000
  ), [races, now]);
  
  const hasLiveRaces = liveRaces.length > 0;
  const hasImminentRaces = imminentRaces.length > 0;
  
  // Update polling based on live status
  useEffect(() => {
    setHasActiveRaces(hasLiveRaces || hasImminentRaces);
  }, [hasLiveRaces, hasImminentRaces]);

  // Check if this is a multi-stage event
  const isMultiStage = eventResults?.isMultiStage || 
    (event?.metadata.scoringMode && !('Individual' in event.metadata.scoringMode)) ||
    (event && 'Automatic' in event.raceCreationMode && 
     event.raceCreationMode.Automatic.racesPerClass?.[0] && 
     Number(event.raceCreationMode.Automatic.racesPerClass[0]) > 1) ||
    (event && 'Manual' in event.raceCreationMode && 
     event.raceCreationMode.Manual.raceTemplates?.length > 1);
  
  // Check if any races have completed (for UI logic after data loads)
  const hasCompletedRaces = useMemo(() => 
    races.some(r => r && 'Completed' in r.status), 
    [races]
  );
  
  // Determine default tab based on event status
  const getDefaultTab = (): string => {
    if (isCompleted) return 'standings';
    if (isInProgress) return 'schedule';
    // For upcoming events (not started), default to details tab
    return 'details';
  };
  
  const [activeTab, setActiveTab] = useState<string>(() => getDefaultTab());
  
  // Auto-switch to live tab when races go live
  useEffect(() => {
    if (hasLiveRaces && activeTab !== 'live') {
      setActiveTab('live');
    }
  }, [hasLiveRaces]);
  
  // Handle scroll for sticky banner
  useEffect(() => {
    if (!hasLiveRaces) {
      setShowStickyBanner(false);
      return;
    }
    
    const handleScroll = () => {
      if (activeTab !== 'live') {
        setShowStickyBanner(true);
      } else {
        setShowStickyBanner(false);
      }
    };
    
    handleScroll();
  }, [activeTab, hasLiveRaces]);

  if (eventLoading || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  const registrationOpen = Number(event.registrationOpens) < now && Number(event.registrationCloses) > now;

  // Collect bot profiles for the whole page
  const botProfilesMap = new Map<number, any>();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate('/schedule')} className="mb-4">
            ← Back to Schedule
          </Button>

          {/* Hero Header */}
          <EventHeroHeader
            event={event}
            hasLiveRaces={hasLiveRaces}
            hasImminentRaces={hasImminentRaces}
            liveRaceCount={liveRaces.length}
            onWatchLive={() => setActiveTab('live')}
            onRegister={() => setActiveTab('details')}
            onViewStandings={() => setActiveTab('standings')}
          />

          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="live" className="relative">
                {hasLiveRaces && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
                🔴 Live {(hasLiveRaces || hasImminentRaces) && `(${liveRaces.length + imminentRaces.length})`}
              </TabsTrigger>
              <TabsTrigger value="standings">📊 Standings</TabsTrigger>
              <TabsTrigger value="schedule">📅 Schedule</TabsTrigger>
              <TabsTrigger value="details">
                ℹ️ Details
                {registrationOpen && (
                  <span className="ml-1 w-2 h-2 bg-green-500 rounded-full inline-block" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Live Tab */}
            <TabsContent value="live" ref={liveTabRef}>
              <LiveRacesPanel 
                races={races} 
                event={event}
                botProfiles={botProfilesMap}
              />
            </TabsContent>

            {/* Standings Tab */}
            <TabsContent value="standings">
              {(isInProgress || isCompleted || hasCompletedRaces) && isMultiStage ? (
                <StandingsPanel eventId={Number(eventId)} isInProgress={isInProgress || (!isCompleted && hasCompletedRaces)} />
              ) : hasCompletedRaces ? (
                <IndividualResultsPanel races={races} event={event} />
              ) : (
                <Card className="border-2 border-primary/20 bg-card/50">
                  <CardContent className="py-12 text-center">
                    <div className="text-6xl mb-4">🏁</div>
                    <h3 className="text-xl font-semibold mb-2">No Results Yet</h3>
                    <p className="text-muted-foreground">
                      Race results will appear here once races are completed.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule">
              {racesLoading ? (
                <Card className="border-2 border-primary/20 bg-card/50">
                  <CardContent className="py-12 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                    <p className="text-muted-foreground">Loading races...</p>
                  </CardContent>
                </Card>
              ) : (
                <SchedulePanel 
                  races={races} 
                  event={event}
                  onRaceSelect={(raceId) => {
                    // Could navigate to race detail or expand inline
                    console.log('Selected race:', raceId);
                  }}
                />
              )}
            </TabsContent>

            {/* Details/Registration Tab */}
            <TabsContent value="details">
              <RegistrationPanel event={event} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sticky Live Banner */}
      <StickyLiveBanner
        raceName={liveRaces[0]?.name || 'Race'}
        raceCount={liveRaces.length}
        isVisible={showStickyBanner && hasLiveRaces}
        onWatchClick={() => setActiveTab('live')}
      />
    </div>
  );
}
