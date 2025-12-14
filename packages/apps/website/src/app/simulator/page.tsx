"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shuffle, Play, Loader2 } from "lucide-react";
import { RaceVisualizer } from "@/components/RaceVisualizer";
import { useGetAllTimeLeaderboard } from "@/hooks/useLeaderboard";
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
}

// Apply faction bonuses to stats - matches backend PokedBotsGarage.mo applyTerrainBonus
function applyFactionBonuses(
  stats: { speed: number; powerCore: number; acceleration: number; stability: number },
  faction: string,
  terrain: string,
  preferredTerrain: string,
  condition: number = 100 // Default to 100% for simulator
): { speed: number; powerCore: number; acceleration: number; stability: number } {
  let bonus = 1.0;
  
  // Faction-terrain bonuses (matches backend)
  if (faction === 'Blackhole' && terrain === 'MetalRoads') {
    bonus = 1.12; // +12% on MetalRoads
  } else if (faction === 'Box' && terrain === 'ScrapHeaps') {
    bonus = 1.10; // +10% on ScrapHeaps
  } else if (faction === 'Game' && terrain === 'WastelandSand') {
    bonus = 1.08; // +8% on WastelandSand
  } else if (faction === 'Golden' && condition >= 90) {
    bonus = 1.15; // +15% when condition >= 90%
  }
  
  // Apply faction bonus first
  let boosted = {
    speed: Math.min(100, Math.floor(stats.speed * bonus)),
    powerCore: Math.min(100, Math.floor(stats.powerCore * bonus)),
    acceleration: Math.min(100, Math.floor(stats.acceleration * bonus)),
    stability: Math.min(100, Math.floor(stats.stability * bonus)),
  };
  
  // Apply preferred terrain bonus (+10% if racing on preferred terrain)
  if (preferredTerrain === terrain) {
    return {
      speed: Math.min(100, Math.floor(boosted.speed * 1.10)),
      powerCore: Math.min(100, Math.floor(boosted.powerCore * 1.10)),
      acceleration: Math.min(100, Math.floor(boosted.acceleration * 1.10)),
      stability: Math.min(100, Math.floor(boosted.stability * 1.10)),
    };
  }
  
  return boosted;
}

// Wrapper component to handle backend query
const RaceVisualizerWithBackend = ({ raceData }: { raceData: any }) => {
  const botIndexes = raceData.botOrder?.map((id: string) => parseInt(id)) || [];
  const { data: backendResults, isLoading } = useDebugTestSimulation(
    botIndexes,
    raceData.trackId,
    raceData.trackSeed,
    botIndexes.length > 0
  );

  // Merge backend results with race data
  const resultsWithBackend = raceData.results.map((result: any) => {
    const backendResult = backendResults?.find(
      (br: any) => br.tokenIndex.toString() === result.nftId
    );
    if (backendResult) {
      return { ...result, finalTime: backendResult.finalTime };
    }
    return result;
  });

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
    />
  );
};

const TRACKS: Track[] = [
  {
    trackId: 1,
    name: "Scrap Mountain Circuit",
    terrain: "ScrapHeaps",
    description: "Steep climbs through towering piles of rusted metal and debris"
  },
  {
    trackId: 2,
    name: "Highway of the Dead",
    terrain: "MetalRoads",
    description: "Ancient cracked asphalt highway stretching across the wasteland"
  },
  {
    trackId: 3,
    name: "Wasteland Gauntlet",
    terrain: "WastelandSand",
    description: "Endless dunes of radioactive sand under scorching suns"
  },
  {
    trackId: 4,
    name: "Junkyard Sprint",
    terrain: "ScrapHeaps",
    description: "Tight corners through collapsed machinery and crushed vehicles"
  },
  {
    trackId: 5,
    name: "Metal Mesa Circuit",
    terrain: "MetalRoads",
    description: "Elevated metal platforms with treacherous drops"
  }
];

export default function SimulatorPage() {
  const [selectedTrack, setSelectedTrack] = useState<number>(1);
  const [trackSeed, setTrackSeed] = useState<string>("");
  const [selectedBots, setSelectedBots] = useState<number[]>([]);
  const [availableBots, setAvailableBots] = useState<Bot[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [raceData, setRaceData] = useState<any>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Fetch leaderboard data
  const { data: leaderboardData, isLoading: loading } = useGetAllTimeLeaderboard(50);

  useEffect(() => {
    const loadBotProfiles = async () => {
      if (!leaderboardData || leaderboardData.length === 0) return;
      
      setLoadingProfiles(true);
      try {
        // Fetch profiles for all available bots in parallel
        const topEntries = leaderboardData;
        const profilePromises = topEntries.map(entry => 
          getBotProfile(Number(entry.tokenIndex))
        );
        
        const profiles = await Promise.all(profilePromises);
        
        // Transform profiles to Bot format
        const bots: Bot[] = profiles
          .filter(profile => profile !== null)
          .map((profile: any) => {
            // Extract faction name from variant object (e.g., { Murder: null } -> "Murder")
            const factionName = profile.faction && typeof profile.faction === 'object' 
              ? Object.keys(profile.faction)[0] 
              : 'Unknown';
            
            // Extract preferred terrain from variant object
            const preferredTerrain = profile.preferredTerrain && typeof profile.preferredTerrain === 'object'
              ? Object.keys(profile.preferredTerrain)[0]
              : 'ScrapHeaps';
            
            return {
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
          });
        
        setAvailableBots(bots);
        
        // Auto-select first 3 bots and auto-start simulation
        if (selectedBots.length === 0 && bots.length >= 3) {
          const firstThree = [bots[0].tokenIndex, bots[1].tokenIndex, bots[2].tokenIndex];
          setSelectedBots(firstThree);
          // Auto-start simulation after a brief delay
          setTimeout(() => {
            startSimulation(firstThree, bots);
          }, 100);
        }
      } catch (error) {
        console.error("Failed to load bot profiles:", error);
      } finally {
        setLoadingProfiles(false);
      }
    };

    loadBotProfiles();
  }, [leaderboardData]);

  useEffect(() => {
    randomizeSeed();
  }, []);

  // Auto-run simulation when selections change
  useEffect(() => {
    if (selectedBots.length >= 2 && availableBots.length > 0 && trackSeed) {
      startSimulation();
    }
  }, [selectedBots, selectedTrack, trackSeed, availableBots]);

  const randomizeSeed = () => {
    const seed = Math.floor(Math.random() * 1000000);
    setTrackSeed(seed.toString());
  };

  const handleBotToggle = (tokenIndex: number) => {
    if (selectedBots.includes(tokenIndex)) {
      setSelectedBots(selectedBots.filter(id => id !== tokenIndex));
    } else if (selectedBots.length < 20) {
      setSelectedBots([...selectedBots, tokenIndex]);
    }
  };

  const startSimulation = (botsToRace?: number[], botsArray?: Bot[]) => {
    const racingBots = botsToRace || selectedBots;
    const botsList = botsArray || availableBots;
    
    if (racingBots.length < 2) {
      alert("Please select at least 2 bots to race");
      return;
    }

    setSimulating(true);

    const track = TRACKS.find(t => t.trackId === selectedTrack);
    const participants = racingBots.map(tokenIndex => {
      const bot = botsList.find(b => b.tokenIndex === tokenIndex)!;
      return {
        tokenIndex: bot.tokenIndex,
        name: bot.name || `Bot #${bot.tokenIndex}`,
        speed: bot.speed,
        powerCore: bot.powerCore,
        acceleration: bot.acceleration,
        stability: bot.stability,
        faction: bot.faction,
        preferredTerrain: bot.preferredTerrain,
      };
    });

    // Simple placeholder times - RaceVisualizer will calculate real times using segment-based simulation
    const results = participants
      .map((p, idx) => {
        const terrain = track?.terrain || "ScrapHeaps";
        
        // Pass raw stats - RaceVisualizer will apply faction + preferred terrain bonuses
        const rawStats = { 
          speed: p.speed, 
          powerCore: p.powerCore, 
          acceleration: p.acceleration, 
          stability: p.stability 
        };
        
        // Calculate rating from raw stats
        const rating = Math.round((rawStats.speed + rawStats.powerCore + rawStats.acceleration + rawStats.stability) / 4);
        
        return {
          nftId: p.tokenIndex.toString(),
          finalTime: 0, // Will be calculated by RaceVisualizer
          position: 0, // Will be set after sorting
          rating,
          faction: p.faction,
          preferredTerrain: p.preferredTerrain,
          stats: rawStats,
        };
      })
      .sort((a, b) => a.finalTime - b.finalTime)
      .map((r, idx) => ({ ...r, position: idx + 1 }));

    setRaceData({
      results,
      trackSeed: parseInt(trackSeed) || 0,
      trackId: selectedTrack,
      distance: 15,
      terrain: track?.terrain || "ScrapHeaps",
      botOrder: racingBots.map(tokenIndex => tokenIndex.toString()), // Store original bot order for participant index calculation
    });

    setTimeout(() => setSimulating(false), 500);
  };



  if (loading || loadingProfiles) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">
            {loading ? "Loading leaderboard..." : "Loading bot profiles..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Race Simulator</h1>
        <p className="text-muted-foreground">
          Set up custom races and watch them unfold in real-time with our visualization engine
        </p>
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
            </CardContent>
          </Card>

          {/* Bot Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Participants ({selectedBots.length}/20)</CardTitle>
              <CardDescription>Select bots from the leaderboard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {availableBots.map((bot) => {
                  const isSelected = selectedBots.includes(bot.tokenIndex);
                  return (
                    <div
                      key={bot.tokenIndex}
                      onClick={() => handleBotToggle(bot.tokenIndex)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/10 border-primary"
                          : "bg-card hover:bg-muted border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {bot.name || `Bot #${bot.tokenIndex}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            #{bot.tokenIndex} • {bot.faction} • {bot.eloRating} ELO
                          </div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            <span>SPD:{bot.speed}</span>
                            <span>PWR:{bot.powerCore}</span>
                            <span>ACC:{bot.acceleration}</span>
                            <span>STB:{bot.stability}</span>
                          </div>
                        </div>
                        <div className={`h-5 w-5 rounded border ${
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                        }`}>
                          {isSelected && (
                            <svg className="h-5 w-5 text-primary-foreground" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
