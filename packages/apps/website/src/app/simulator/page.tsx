"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shuffle, Play, Loader2, X, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { RaceVisualizer, PhenomenonType, calculateBotSegmentTimes } from "@/components/RaceVisualizer";
import { useDebugTestSimulation } from "@/hooks/useRacing";
import { getBotProfile } from "@pokedbots-racing/ic-js";

interface Bot {
  tokenIndex: number;
  name: string;
  speed: number;
  powerCore: number;
  acceleration: number;
  stability: number;
  faction: string;
  preferredTerrain: string;
  eloRating: number;
}

interface Track {
  trackId: number;
  name: string;
  terrain: string;
  description: string;
  distanceKm: number; // Distance in kilometers
}

// Wrapper component to handle backend query
const RaceVisualizerWithBackend = ({ raceData, overridePhenomenon, phenomenonIndex }: { raceData: any; overridePhenomenon?: PhenomenonType; phenomenonIndex?: number }) => {
  const botIndexes = raceData.botOrder?.map((id: string) => parseInt(id)) || [];
  const hasEditedStats = raceData.hasEditedStats || false; // Check if any stats were edited
  
  // Only query backend if stats haven't been edited
  const { data: backendData, isLoading } = useDebugTestSimulation(
    botIndexes,
    raceData.trackId,
    raceData.trackSeed,
    raceData.distance,
    phenomenonIndex,
    botIndexes.length > 0 && !hasEditedStats // Disable backend query if stats are edited
  );

  // Debug logging
  useEffect(() => {
    if (botIndexes.length > 0) {
      console.log('[Simulator] Requesting backend simulation:', {
        botIndexes,
        trackId: raceData.trackId,
        trackSeed: raceData.trackSeed,
        distance: raceData.distance,
        phenomenonIndex,
        hasEditedStats,
        isLoading,
        hasResults: !!backendData
      });
    }
  }, [botIndexes, raceData.trackId, raceData.trackSeed, raceData.distance, phenomenonIndex, hasEditedStats, isLoading, backendData]);

  useEffect(() => {
    if (backendData) {
      console.log('[Simulator] Backend results received:', backendData);
    }
  }, [backendData]);

  // Extract results and events from backend data
  const backendResults = backendData?.results;
  const backendEvents = backendData?.events;

  // If stats are edited, use local stats; otherwise merge backend results
  const resultsWithBackend = hasEditedStats ? raceData.results : raceData.results.map((result: any) => {
    const backendResult = backendResults?.find(
      (br: any) => br.tokenIndex.toString() === result.nftId
    );
    if (backendResult) {
      return { 
        ...result, 
        finalTime: backendResult.finalTime,
        stats: backendResult.stats, // Use backend stats with all bonuses applied (includes luck)
        bonusesAlreadyApplied: true,
      };
    }
    return result;
  });

  // Get createdAt from backend results (all results have the same createdAt)
  const raceCreatedAt = backendResults?.[0]?.createdAt;

  // Solo race stat impact analysis - log time difference for +1 to each stat
  useEffect(() => {
    // Only run for solo races (1 bot) when we have results
    if (raceData.results.length !== 1) return;
    
    const result = resultsWithBackend[0];
    if (!result?.stats) return;
    
    const stats = result.stats;
    const trackSeed = BigInt(raceData.trackSeed);
    const trackId = raceData.trackId;
    const distance = raceData.distance;
    const terrain = raceData.terrain;
    const nftId = result.nftId;
    const faction = result.faction;
    const preferredTerrain = result.preferredTerrain;
    
    // Calculate baseline time
    const baselineSegments = calculateBotSegmentTimes(
      trackId, trackSeed, 0, stats, null,
      faction, preferredTerrain, terrain,
      nftId, true, distance, raceCreatedAt, overridePhenomenon
    );
    const baselineTime = baselineSegments.length > 0 
      ? baselineSegments[baselineSegments.length - 1].cumulativeTime 
      : 0;
    
    if (baselineTime === 0) return;
    
    const statNames = ['speed', 'powerCore', 'acceleration', 'stability'] as const;
    const impacts: Record<string, { newTime: number; diff: number; pctImprovement: number }> = {};
    
    for (const statName of statNames) {
      const modifiedStats = { ...stats, [statName]: stats[statName] + 1 };
      const modifiedSegments = calculateBotSegmentTimes(
        trackId, trackSeed, 0, modifiedStats, null,
        faction, preferredTerrain, terrain,
        nftId, true, distance, raceCreatedAt, overridePhenomenon
      );
      const modifiedTime = modifiedSegments.length > 0 
        ? modifiedSegments[modifiedSegments.length - 1].cumulativeTime 
        : 0;
      
      const diff = baselineTime - modifiedTime;
      const pctImprovement = (diff / baselineTime) * 100;
      
      impacts[statName] = {
        newTime: modifiedTime,
        diff,
        pctImprovement
      };
    }
    
    console.log('\n=== SOLO RACE STAT IMPACT ANALYSIS ===');
    console.log(`Bot #${nftId} | Track: ${trackId} | Seed: ${raceData.trackSeed} | Distance: ${distance}km`);
    console.log(`Current stats: Speed=${stats.speed}, PowerCore=${stats.powerCore}, Accel=${stats.acceleration}, Stability=${stats.stability}`);
    console.log(`Baseline time: ${baselineTime.toFixed(3)}s`);
    console.log('\nImpact of +1 to each stat:');
    console.log('----------------------------');
    for (const statName of statNames) {
      const impact = impacts[statName];
      const arrow = impact.diff > 0 ? '↓' : impact.diff < 0 ? '↑' : '→';
      console.log(
        `${statName.padEnd(12)} +1: ${impact.newTime.toFixed(3)}s (${arrow} ${Math.abs(impact.diff).toFixed(4)}s, ${impact.pctImprovement.toFixed(3)}% improvement)`
      );
    }
    console.log('====================================\n');
  }, [resultsWithBackend, raceData.trackSeed, raceData.trackId, raceData.distance, raceData.terrain, raceData.results.length, raceCreatedAt, overridePhenomenon]);

  return (
    <RaceVisualizer
      results={resultsWithBackend}
      trackSeed={raceData.trackSeed}
      trackId={raceData.trackId}
      distance={raceData.distance}
      terrain={raceData.terrain}
      botOrder={raceData.botOrder}
      isValidating={isLoading}
      startAtEnd={true}
      bonusesAlreadyApplied={true}
      raceCreatedAt={raceCreatedAt}
      overridePhenomenon={overridePhenomenon}
      events={backendEvents || []}
    />
  );
};

const TRACKS: Track[] = [
  {
    trackId: 1,
    name: "Scrap Mountain Circuit",
    terrain: "ScrapHeaps",
    description: "Steep climbs through towering piles of rusted metal and debris",
    distanceKm: 10 // 10100m = 10.1km
  },
  {
    trackId: 2,
    name: "Highway of the Dead",
    terrain: "MetalRoads",
    description: "Ancient cracked asphalt highway stretching across the wasteland",
    distanceKm: 7 // 6700m = 6.7km
  },
  {
    trackId: 3,
    name: "Wasteland Gauntlet",
    terrain: "WastelandSand",
    description: "Endless dunes of radioactive sand under scorching suns",
    distanceKm: 13 // 13300m = 13.3km
  },
  {
    trackId: 4,
    name: "Junkyard Sprint",
    terrain: "ScrapHeaps",
    description: "Tight corners through collapsed machinery and crushed vehicles",
    distanceKm: 4 // 4050m = 4.05km
  },
  {
    trackId: 5,
    name: "Metal Mesa Circuit",
    terrain: "MetalRoads",
    description: "Elevated metal platforms with treacherous drops",
    distanceKm: 7 // 7400m = 7.4km
  },
  {
    trackId: 6,
    name: "Dune Runner",
    terrain: "WastelandSand",
    description: "Brutal marathon through endless dunes - pure power core test",
    distanceKm: 17 // 16600m = 16.6km
  },
  {
    trackId: 7,
    name: "Rust Belt Rally",
    terrain: "MetalRoads",
    description: "High-speed highway blast - acceleration and top speed critical",
    distanceKm: 9 // 9200m = 9.2km
  },
  {
    trackId: 8,
    name: "Debris Field Dash",
    terrain: "ScrapHeaps",
    description: "Treacherous obstacle course favoring stability masters",
    distanceKm: 7 // 7100m = 7.1km
  },
  {
    trackId: 9,
    name: "Velocity Viaduct",
    terrain: "MetalRoads",
    description: "Lightning-fast elevated highway section - pure acceleration",
    distanceKm: 5 // 4500m = 4.5km
  },
  {
    trackId: 10,
    name: "Sandstorm Circuit",
    terrain: "WastelandSand",
    description: "Circular desert track with varying dune intensities",
    distanceKm: 11 // 10800m = 10.8km
  }
];

// Luck phenomena that affect daily affinity (order matches backend 13-day cycle)
const PHENOMENA = [
  { id: 'current', name: 'Current Day', description: 'Use real-time phenomenon', index: undefined },
  { id: 'SolarFlare', name: '☀️ Solar Flare', description: 'Power Core digit 7 = +60%, even token IDs = +30%', index: 0 },
  { id: 'RustStorm', name: '🌪️ Rust Storm', description: 'Stability digit 2/8 = +60%, digit 4/6 = +40%', index: 1 },
  { id: 'MetalResonance', name: '🔊 Metal Resonance', description: 'Speed digit 3 = +60%, prime tokens = +45%', index: 2 },
  { id: 'GravityFlux', name: '🌀 Gravity Flux', description: 'Accel digit 4 = +60%, digit 0/8 = +40%', index: 3 },
  { id: 'ScrapTornado', name: '🌀 Scrap Tornado', description: 'Wild faction = +70%, token%100<20 = +40%', index: 4 },
  { id: 'DeadZone', name: '💀 Dead Zone', description: 'Dead faction = +60%, token has 6/13/66/666 = +45%', index: 5 },
  { id: 'GoldenHour', name: '✨ Golden Hour', description: 'Golden faction = +65%, token%7 = +40%', index: 6 },
  { id: 'MachineGhost', name: '👻 Machine Ghost', description: 'Master/Ultimate = +55%, token>5000 = +40%', index: 7 },
  { id: 'BloodMoon', name: '🌑 Blood Moon', description: 'Murder faction = +50%, token%9 = +40%', index: 8 },
  { id: 'BinarySurge', name: '⚡ Binary Surge', description: 'Balanced stats (spread≤5) = +70%, spread≤10 = +45%', index: 9 },
  { id: 'ChaosPulse', name: '🎲 Chaos Pulse', description: 'Token%11 = +70%, luck stat gives bonus', index: 10 },
  { id: 'MomentumShift', name: '💨 Momentum Shift', description: 'Bracket underdogs (avg%10≤2) = +60%, token%12 = +40%', index: 11 },
  { id: 'BlackholeSingularity', name: '🕳️ Blackhole Singularity', description: 'Blackhole faction = +60%, token%13 = +40%', index: 12 },
] as const;

// Helper to get phenomenon index from ID
const getPhenomenonIndex = (id: string): number | undefined => {
  const phenomenon = PHENOMENA.find(p => p.id === id);
  return phenomenon?.index;
};

export default function SimulatorPage() {
  const [selectedTrack, setSelectedTrack] = useState<number>(1);
  const [trackSeed, setTrackSeed] = useState<string>("");
  const [selectedPhenomenon, setSelectedPhenomenon] = useState<string>("current");
  const [selectedBots, setSelectedBots] = useState<Bot[]>([]);
  const [editedStats, setEditedStats] = useState<Record<number, Partial<Bot>>>({});
  const [simulating, setSimulating] = useState(false);
  const [raceData, setRaceData] = useState<any>(null);
  const [botInput, setBotInput] = useState<string>("");
  const [loadingBot, setLoadingBot] = useState(false);
  const [botError, setBotError] = useState<string>("");

  useEffect(() => {
    randomizeSeed();
  }, []);

  // Auto-run simulation when selections or stats change
  useEffect(() => {
    if (selectedBots.length >= 2 && trackSeed) {
      startSimulation();
    }
  }, [selectedBots, selectedTrack, trackSeed, editedStats, selectedPhenomenon]);

  const randomizeSeed = () => {
    const seed = Math.floor(Math.random() * 1000000);
    setTrackSeed(seed.toString());
  };

  const addBot = async () => {
    const input = botInput.trim();
    if (!input) return;

    // Check if it's a number (token index) or text (name search)
    const tokenIndex = parseInt(input);
    
    if (isNaN(tokenIndex) || tokenIndex < 0 || tokenIndex > 9999) {
      setBotError("Please enter a valid bot ID (0-9999)");
      return;
    }

    // Check if bot already added
    if (selectedBots.some(b => b.tokenIndex === tokenIndex)) {
      setBotError("Bot already added to race");
      return;
    }

    if (selectedBots.length >= 20) {
      setBotError("Maximum 20 bots per race");
      return;
    }

    setLoadingBot(true);
    setBotError("");

    try {
      const profile = await getBotProfile(tokenIndex);
      
      if (!profile) {
        setBotError(`Bot #${tokenIndex} not found`);
        return;
      }

      // Extract faction name
      let factionName = 'Unknown';
      if (profile.faction) {
        if (Array.isArray(profile.faction) && profile.faction.length > 0) {
          const factionObj = profile.faction[0];
          if (typeof factionObj === 'object' && factionObj !== null) {
            const keys = Object.keys(factionObj);
            factionName = keys[0] || 'Unknown';
          }
        } else if (typeof profile.faction === 'object' && !Array.isArray(profile.faction)) {
          const keys = Object.keys(profile.faction);
          factionName = keys[0] || 'Unknown';
        } else if (typeof profile.faction === 'string') {
          factionName = profile.faction;
        }
      }
      
      // Extract preferred terrain
      let preferredTerrain = 'ScrapHeaps';
      if (profile.preferredTerrain) {
        if (Array.isArray(profile.preferredTerrain) && profile.preferredTerrain.length > 0) {
          const terrainObj = profile.preferredTerrain[0];
          if (typeof terrainObj === 'object' && terrainObj !== null) {
            const keys = Object.keys(terrainObj);
            preferredTerrain = keys[0] || 'ScrapHeaps';
          }
        } else if (typeof profile.preferredTerrain === 'object' && !Array.isArray(profile.preferredTerrain)) {
          const keys = Object.keys(profile.preferredTerrain);
          preferredTerrain = keys[0] || 'ScrapHeaps';
        } else if (typeof profile.preferredTerrain === 'string') {
          preferredTerrain = profile.preferredTerrain;
        }
      }

      const bot: Bot = {
        tokenIndex: Number(profile.tokenIndex),
        name: profile.name || `Bot #${profile.tokenIndex}`,
        speed: Number(profile.stats.speed),
        powerCore: Number(profile.stats.powerCore),
        acceleration: Number(profile.stats.acceleration),
        stability: Number(profile.stats.stability),
        faction: factionName,
        preferredTerrain: preferredTerrain,
        eloRating: Number(profile.career?.eloRating || 1200),
      };

      setSelectedBots([...selectedBots, bot]);
      setBotInput("");
    } catch (error) {
      console.error("Failed to load bot:", error);
      setBotError(`Failed to load bot #${tokenIndex}`);
    } finally {
      setLoadingBot(false);
    }
  };

  const removeBot = (tokenIndex: number) => {
    setSelectedBots(selectedBots.filter(b => b.tokenIndex !== tokenIndex));
  };

  // Get effective stats (edited or original)
  const getEffectiveBot = useCallback((bot: Bot): Bot => {
    const edited = editedStats[bot.tokenIndex];
    if (!edited) return bot;
    return { ...bot, ...edited };
  }, [editedStats]);

  // Update a single stat for a bot
  const updateBotStat = (tokenIndex: number, stat: 'speed' | 'powerCore' | 'acceleration' | 'stability', delta: number) => {
    const bot = selectedBots.find(b => b.tokenIndex === tokenIndex);
    if (!bot) return;

    const currentStats = getEffectiveBot(bot);
    const currentValue = currentStats[stat];
    const newValue = Math.max(0, Math.min(100, currentValue + delta)); // Clamp between 0-100

    setEditedStats(prev => ({
      ...prev,
      [tokenIndex]: {
        ...prev[tokenIndex],
        [stat]: newValue
      }
    }));
  };

  // Reset stats for a bot
  const resetBotStats = (tokenIndex: number) => {
    setEditedStats(prev => {
      const updated = { ...prev };
      delete updated[tokenIndex];
      return updated;
    });
  };

  const startSimulation = useCallback(() => {
    if (selectedBots.length < 1) {
      return;
    }

    setSimulating(true);

    const track = TRACKS.find(t => t.trackId === selectedTrack);
    
    // Use effective stats (edited or original)
    const participants = selectedBots.map(bot => {
      const effectiveBot = getEffectiveBot(bot);
      return {
        tokenIndex: effectiveBot.tokenIndex,
        name: effectiveBot.name || `Bot #${effectiveBot.tokenIndex}`,
        speed: effectiveBot.speed,
        powerCore: effectiveBot.powerCore,
        acceleration: effectiveBot.acceleration,
        stability: effectiveBot.stability,
        faction: effectiveBot.faction,
        preferredTerrain: effectiveBot.preferredTerrain,
      };
    });

    // Simple placeholder times - RaceVisualizer will calculate real times using segment-based simulation
    const results = participants
      .map((p, idx) => {
        const terrain = track?.terrain || "ScrapHeaps";
        
        // Stats from getBotProfile already include faction + terrain bonuses (from backend getStatsAt100WithTerrain)
        const statsWithBonuses = { 
          speed: p.speed, 
          powerCore: p.powerCore, 
          acceleration: p.acceleration, 
          stability: p.stability 
        };
        
        // Calculate rating from stats with bonuses
        const rating = Math.round((statsWithBonuses.speed + statsWithBonuses.powerCore + statsWithBonuses.acceleration + statsWithBonuses.stability) / 4);
        
        return {
          nftId: p.tokenIndex.toString(),
          finalTime: 0, // Will be calculated by RaceVisualizer
          position: 0, // Will be set after sorting
          rating,
          faction: p.faction,
          preferredTerrain: p.preferredTerrain,
          stats: statsWithBonuses,
          bonusesAlreadyApplied: true, // Stats already include faction/terrain bonuses from backend
        };
      })
      .sort((a, b) => a.finalTime - b.finalTime)
      .map((r, idx) => ({ ...r, position: idx + 1 }));

    // Check if any stats have been edited
    const hasEditedStats = Object.keys(editedStats).length > 0;

    setRaceData({
      results,
      trackSeed: parseInt(trackSeed) || 0,
      trackId: selectedTrack,
      distance: track?.distanceKm || 15, // Distance in km for simulator
      terrain: track?.terrain || "ScrapHeaps",
      botOrder: participants.map(p => p.tokenIndex.toString()), // Store original bot order for participant index calculation
      hasEditedStats, // Flag to indicate stats were manually edited
      timestamp: Date.now(), // Force re-render when stats change
    });

    setTimeout(() => setSimulating(false), 500);
  }, [selectedBots, selectedTrack, trackSeed, getEffectiveBot, editedStats]);

  const handleBotInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBot();
    }
  };

  // Auto-run simulation when selections or stats change
  useEffect(() => {
    if (selectedBots.length >= 1 && trackSeed) {
      startSimulation();
    }
  }, [selectedBots, selectedTrack, trackSeed, editedStats, startSimulation]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Race Simulator</h1>
        <p className="text-muted-foreground">
          Set up custom races and watch them unfold in real-time with our visualization engine
        </p>
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            ℹ️ Simulator shows base stats only. Actual races include: garage stat bonuses, battery/condition penalties, overcharge effects, and world buffs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Track Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Track Selection</CardTitle>
              <CardDescription>Choose a track from the wasteland</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Track</Label>
                <Select value={selectedTrack.toString()} onValueChange={(v: string) => setSelectedTrack(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRACKS.map((track) => (
                      <SelectItem key={track.trackId} value={track.trackId.toString()}>
                        {track.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {TRACKS.find(t => t.trackId === selectedTrack) && (
                <div className="p-3 bg-muted rounded-lg space-y-1">
                  <div className="text-sm font-medium">
                    {TRACKS.find(t => t.trackId === selectedTrack)?.terrain}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {TRACKS.find(t => t.trackId === selectedTrack)?.description}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Track Seed</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={trackSeed}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTrackSeed(e.target.value)}
                    placeholder="Enter seed (0-999999)"
                    min="0"
                    max="999999"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={randomizeSeed}
                    title="Randomize seed"
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The seed determines track variation and race randomness
                </p>
              </div>

              <div className="space-y-2">
                <Label>Luck Phenomenon</Label>
                <Select value={selectedPhenomenon} onValueChange={setSelectedPhenomenon}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select phenomenon" />
                  </SelectTrigger>
                  <SelectContent>
                    {PHENOMENA.map((phenomenon) => (
                      <SelectItem key={phenomenon.id} value={phenomenon.id}>
                        {phenomenon.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPhenomenon && selectedPhenomenon !== 'current' && (
                  <p className="text-xs text-muted-foreground">
                    {PHENOMENA.find(p => p.id === selectedPhenomenon)?.description}
                  </p>
                )}
                {selectedPhenomenon === 'current' && (
                  <p className="text-xs text-muted-foreground">
                    Uses the current day&apos;s phenomenon for luck calculations
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bot Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Participants ({selectedBots.length}/20)</CardTitle>
              <CardDescription>Enter bot ID to add to race (0-9999)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input field */}
              <div className="space-y-2">
                <Label>Add Bot by ID</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={botInput}
                    onChange={(e) => setBotInput(e.target.value)}
                    onKeyDown={handleBotInputKeyDown}
                    placeholder="Enter bot ID (0-9999)"
                    disabled={loadingBot || selectedBots.length >= 20}
                  />
                  <Button
                    onClick={addBot}
                    disabled={loadingBot || !botInput.trim() || selectedBots.length >= 20}
                    size="icon"
                  >
                    {loadingBot ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {botError && (
                  <p className="text-xs text-destructive">{botError}</p>
                )}
              </div>

              {/* Selected bots */}
              {selectedBots.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Bots</Label>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {selectedBots.map((bot) => {
                      const effectiveBot = getEffectiveBot(bot);
                      const isEdited = !!editedStats[bot.tokenIndex];
                      
                      return (
                        <div
                          key={bot.tokenIndex}
                          className="p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="font-medium">
                                {bot.name || `Bot #${bot.tokenIndex}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                #{bot.tokenIndex} • {bot.faction}
                              </div>
                              
                              {/* Editable Stats */}
                              <div className="space-y-1.5 pt-1">
                                {/* Speed */}
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground w-8">SPD:</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => updateBotStat(bot.tokenIndex, 'speed', -1)}
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                  <span className={`text-xs font-mono w-6 text-center ${isEdited && effectiveBot.speed !== bot.speed ? 'text-blue-500 font-bold' : 'text-foreground'}`}>
                                    {effectiveBot.speed}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => updateBotStat(bot.tokenIndex, 'speed', 1)}
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </Button>
                                  
                                  {/* Power Core */}
                                  <span className="text-xs text-muted-foreground w-8 ml-1">PWR:</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => updateBotStat(bot.tokenIndex, 'powerCore', -1)}
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                  <span className={`text-xs font-mono w-6 text-center ${isEdited && effectiveBot.powerCore !== bot.powerCore ? 'text-blue-500 font-bold' : 'text-foreground'}`}>
                                    {effectiveBot.powerCore}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => updateBotStat(bot.tokenIndex, 'powerCore', 1)}
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </Button>
                                </div>
                                
                                {/* Acceleration and Stability */}
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground w-8">ACC:</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => updateBotStat(bot.tokenIndex, 'acceleration', -1)}
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                  <span className={`text-xs font-mono w-6 text-center ${isEdited && effectiveBot.acceleration !== bot.acceleration ? 'text-blue-500 font-bold' : 'text-foreground'}`}>
                                    {effectiveBot.acceleration}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => updateBotStat(bot.tokenIndex, 'acceleration', 1)}
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </Button>
                                  
                                  {/* Stability */}
                                  <span className="text-xs text-muted-foreground w-8 ml-1">STB:</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => updateBotStat(bot.tokenIndex, 'stability', -1)}
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                  <span className={`text-xs font-mono w-6 text-center ${isEdited && effectiveBot.stability !== bot.stability ? 'text-blue-500 font-bold' : 'text-foreground'}`}>
                                    {effectiveBot.stability}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => updateBotStat(bot.tokenIndex, 'stability', 1)}
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Reset button if edited */}
                              {isEdited && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs mt-1"
                                  onClick={() => resetBotStats(bot.tokenIndex)}
                                >
                                  Reset Stats
                                </Button>
                              )}
                            </div>
                            
                            {/* Remove button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeBot(bot.tokenIndex)}
                              className="shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Visualizer */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Race Visualization</CardTitle>
              <CardDescription>
                {raceData ? "Watch the race unfold in real-time" : "Configure and start a race to see the visualization"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {raceData ? (
                <RaceVisualizerWithBackend
                  raceData={raceData}
                  overridePhenomenon={selectedPhenomenon === 'current' ? undefined : selectedPhenomenon as PhenomenonType}
                  phenomenonIndex={getPhenomenonIndex(selectedPhenomenon)}
                />
              ) : (
                <div className="flex items-center justify-center h-[500px] bg-muted/20 rounded-lg border-2 border-dashed">
                  <div className="text-center space-y-2">
                    <Play className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">No simulation running</p>
                    <p className="text-sm text-muted-foreground">Select a track and participants to begin</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
