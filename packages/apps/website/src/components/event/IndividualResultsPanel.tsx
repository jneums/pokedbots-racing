import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBotAvatarUrl } from '@/lib/botAvatar';
import { useGetBotProfilesBatch } from "@/hooks/useRacing";

interface IndividualResultsPanelProps {
  races: any[];
  event: any;
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

function getRaceClassName(raceClass: any): string {
  if (!raceClass) return 'Unknown';
  if ('Scrap' in raceClass) return 'Scrap';
  if ('Junker' in raceClass) return 'Junker';
  if ('Raider' in raceClass) return 'Raider';
  if ('Elite' in raceClass) return 'Elite';
  if ('SilentKlan' in raceClass) return 'Silent Klan';
  return 'Unknown';
}

function getRaceClassColor(raceClass: any): string {
  if (!raceClass) return 'bg-gray-500';
  if ('Scrap' in raceClass) return 'bg-zinc-600';
  if ('Junker' in raceClass) return 'bg-green-600';
  if ('Raider' in raceClass) return 'bg-blue-600';
  if ('Elite' in raceClass) return 'bg-purple-600';
  if ('SilentKlan' in raceClass) return 'bg-red-600';
  return 'bg-gray-500';
}

function formatRaceTime(timeSeconds: number): string {
  return `${timeSeconds.toFixed(2)}s`;
}

const MEDAL_EMOJIS = ['🥇', '🥈', '🥉'];

export function IndividualResultsPanel({ races, event }: IndividualResultsPanelProps) {
  // Filter to completed races with results
  const completedRaces = useMemo(() => 
    races.filter(r => r && 'Completed' in r.status && r.results?.[0]?.length > 0)
      .sort((a, b) => Number(b.startTime) - Number(a.startTime)), // Most recent first
    [races]
  );

  // Get all unique bot indices from podium results
  const allBotIndices = useMemo(() => {
    const indices = new Set<number>();
    completedRaces.forEach(race => {
      const results = race.results?.[0] || [];
      results.slice(0, 3).forEach((result: any) => {
        indices.add(Number(result.nftId || result.tokenIndex));
      });
    });
    return Array.from(indices);
  }, [completedRaces]);

  const { data: botProfiles = [] } = useGetBotProfilesBatch(allBotIndices);
  const profilesMap = useMemo(() => {
    const map = new Map<number, any>();
    botProfiles.forEach((profile: any) => {
      if (profile && profile.tokenIndex !== undefined) {
        map.set(Number(profile.tokenIndex), profile);
      }
    });
    return map;
  }, [botProfiles]);

  // Calculate total prize pool distributed
  const totalPrizeDistributed = useMemo(() => {
    return completedRaces.reduce((total, race) => {
      const results = race.results?.[0] || [];
      return total + results.reduce((raceTotal: bigint, result: any) => {
        return raceTotal + BigInt(result.prizeAmount || 0);
      }, BigInt(0));
    }, BigInt(0));
  }, [completedRaces]);

  // Group races by class
  const racesByClass = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    completedRaces.forEach(race => {
      const className = getRaceClassName(race.raceClass);
      if (!grouped[className]) grouped[className] = [];
      grouped[className].push(race);
    });
    return grouped;
  }, [completedRaces]);

  if (completedRaces.length === 0) {
    return (
      <Card className="border-2 border-primary/20 bg-card/50">
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">🏁</div>
          <h3 className="text-xl font-semibold mb-2">No Results Yet</h3>
          <p className="text-muted-foreground">Race results will appear here once races are completed</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card className="border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            Race Results
            <Badge variant="default" className="bg-amber-600">
              {completedRaces.length} Race{completedRaces.length !== 1 ? 's' : ''} Complete
            </Badge>
          </CardTitle>
          <CardDescription>
            Total Prizes Distributed: <span className="font-bold text-amber-400">{formatICP(totalPrizeDistributed)}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Results by Class */}
      {Object.entries(racesByClass).map(([className, classRaces]) => (
        <Card key={className} className="border border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge className={getRaceClassColor(classRaces[0]?.raceClass)}>
                {className}
              </Badge>
              <span className="text-muted-foreground text-sm">
                {classRaces.length} race{classRaces.length !== 1 ? 's' : ''}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {classRaces.map(race => {
              const results = race.results?.[0] || [];
              const podium = results.slice(0, 3);
              
              return (
                <Link 
                  key={race.raceId} 
                  to={`/race/${race.raceId}`}
                  className="block"
                >
                  <div className="p-4 rounded-lg border border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer">
                    {/* Race Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span>{getTerrainIcon(race.terrain)}</span>
                        <span className="font-medium">{race.name || `Race #${race.raceId}`}</span>
                        <span className="text-muted-foreground text-sm">• {race.distance}km</span>
                      </div>
                      <Badge variant="outline" className="text-green-500 border-green-500/50">
                        Completed
                      </Badge>
                    </div>
                    
                    {/* Podium */}
                    <div className="flex gap-3 flex-wrap">
                      {podium.map((result: any, idx: number) => {
                        const tokenIndex = Number(result.nftId || result.tokenIndex);
                        const profile = profilesMap.get(tokenIndex);
                        const botName = profile?.name?.[0] || `Bot #${tokenIndex}`;
                        const imageUrl = getBotAvatarUrl({ tokenIndex, isStarterBot: Boolean(profile?.isStarterBot) });
                        
                        return (
                          <div 
                            key={tokenIndex}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[200px] ${
                              idx === 0 ? 'bg-amber-500/10 border border-amber-500/30' :
                              idx === 1 ? 'bg-gray-400/10 border border-gray-400/30' :
                              'bg-orange-700/10 border border-orange-700/30'
                            }`}
                          >
                            <span className="text-lg">{MEDAL_EMOJIS[idx]}</span>
                            <img 
                              src={imageUrl} 
                              alt={botName}
                              className="w-10 h-10 rounded-full"
                              loading="lazy"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">{botName}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatRaceTime(Number(result.finalTime))} • {formatICP(BigInt(result.prizeAmount || 0))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
