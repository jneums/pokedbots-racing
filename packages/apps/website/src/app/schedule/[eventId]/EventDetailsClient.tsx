import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetEventDetails, useGetRaceById, useGetBotProfilesBatch, useRegisterForEvent, useUnregisterFromEvent } from "@/hooks/useRacing";
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
function BotNameDisplay({ tokenIndex, profile }: { tokenIndex: number; profile?: any }) {
  if (profile?.name && profile.name.length > 0 && profile.name[0]) {
    return <>PokedBot #{tokenIndex} - {profile.name[0]}</>;
  }
  
  return <>PokedBot #{tokenIndex}</>;
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

// Helper to calculate bracket-scaled entry fee
function calculateBracketEntryFee(baseEntryFee: bigint, raceClass: any): bigint {
  const base = Number(baseEntryFee);
  let multiplier = 1.0;
  
  if ('Scrap' in raceClass) multiplier = 0.5;
  else if ('Junker' in raceClass) multiplier = 1.0;
  else if ('Raider' in raceClass) multiplier = 1.5;
  else if ('Elite' in raceClass) multiplier = 2.0;
  else if ('SilentKlan' in raceClass) multiplier = 2.5;
  
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
  
  // Handle unregistration
  const handleUnregister = async (tokenIndex: number) => {
    setWithdrawingBotId(tokenIndex);
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
                
                return (
                  <div key={reg.tokenIndex.toString()} className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <img
                      src={imageUrl}
                      alt={`Bot #${reg.tokenIndex}`}
                      className="w-10 h-10 rounded border-2 border-green-500/40"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Bot #{reg.tokenIndex.toString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {getRaceClassName(reg.raceClass)} Division
                      </p>
                    </div>
                    {registrationOpen && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUnregister(Number(reg.tokenIndex))}
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
      </CardContent>
    </Card>
  );
}

function RaceVisualizerWithStats({ results, trackSeed, trackId, distance, terrain, botOrder, raceStartTime, raceStatus, events, startAtEnd, disableAutoplay }: {
  results: any[];
  trackSeed: bigint;
  trackId: number;
  distance: number;
  terrain: any;
  botOrder?: string[];
  raceStartTime?: bigint;
  raceStatus?: any;
  events?: any[];
  startAtEnd?: boolean;
  disableAutoplay?: boolean;
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
      events={events}
      startAtEnd={startAtEnd}
      disableAutoplay={disableAutoplay}
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

  const prizePool = Number(race.prizePool) + Number(race.platformBonus);
  const entryCount = race.entries.length;

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
              {'Upcoming' in race.status && '⏳ Upcoming'}
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
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <p className="text-sm text-destructive">Race is full ({Number(race.maxEntries)} entries)</p>
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
              raceStatus={race.status}
              events={(race as any).events || []}
              disableAutoplay={!isFirstRace}
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

        {/* Betting Interface */}
        <div className="mt-4">
          <BettingInterface 
            raceId={Number(raceId)} 
            entryDeadline={race?.entryDeadline}
            raceStatus={race?.status}
          />
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
