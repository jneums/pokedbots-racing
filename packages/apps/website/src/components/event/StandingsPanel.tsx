import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBotAvatarUrl } from '@/lib/botAvatar';
import { useGetBotProfilesBatch, useGetEventResults } from "@/hooks/useRacing";

interface StandingsPanelProps {
  eventId: number;
  isInProgress: boolean;
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

function BotNameDisplay({ tokenIndex, profile, compact = false }: { tokenIndex: number; profile?: any; compact?: boolean }) {
  if (profile?.name && profile.name.length > 0 && profile.name[0]) {
    if (compact) {
      return <>{profile.name[0]}</>;
    }
    return <>PokedBot #{tokenIndex} - {profile.name[0]}</>;
  }
  return <>Bot #{tokenIndex}</>;
}

// Get faction icon
const getFactionIcon = (faction: string) => {
  const icons: Record<string, string> = {
    'UltimateMaster': '👑', 'Wild': '🐺', 'Golden': '✨', 'Ultimate': '⚡',
    'Blackhole': '🕳️', 'Dead': '💀', 'Master': '🎓',
    'Bee': '🐝', 'Food': '🍔', 'Box': '📦', 'Murder': '🔪',
    'Game': '🎮', 'Animal': '🐾', 'Industrial': '⚙️',
  };
  return icons[faction] || '🤖';
};

export function StandingsPanel({ eventId, isInProgress }: StandingsPanelProps) {
  const { data: results, isLoading } = useGetEventResults(eventId, isInProgress);
  
  // Get bot indices for profile batch query
  const cumulativeIndices = results?.cumulativeStandings?.map((s: any) => Number(s.tokenIndex)) || [];
  const factionMemberIndices = results?.factionStandings?.flatMap((f: any) => 
    f.members?.map((m: any) => Number(m.tokenIndex)) || []
  ) || [];
  const botIndices = [...new Set([...cumulativeIndices, ...factionMemberIndices])];
  const { data: botProfiles = [] } = useGetBotProfilesBatch(botIndices);

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur">
        <CardContent className="py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
          <p className="text-muted-foreground">Loading standings...</p>
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card className="border-2 border-primary/20 bg-card/50">
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold mb-2">No Standings Yet</h3>
          <p className="text-muted-foreground">Standings will appear once races are completed</p>
        </CardContent>
      </Card>
    );
  }

  const hasCumulativeStandings = results.cumulativeStandings && results.cumulativeStandings.length > 0;
  const hasFactionStandings = results.factionStandings && results.factionStandings.length > 0;

  const getScoringModeDisplay = () => {
    if (!results.scoringMode) return 'Points';
    if ('Cumulative' in results.scoringMode) return 'Cumulative Points';
    if ('TeamAggregate' in results.scoringMode) return 'Faction Wars';
    if ('Elimination' in results.scoringMode) return 'Elimination';
    return 'Points';
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className={`border-2 ${isInProgress ? 'border-orange-500/40' : 'border-amber-500/40'} bg-gradient-to-br from-amber-500/5 to-purple-500/5`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{isInProgress ? '📊' : '🏆'}</span>
            {isInProgress ? 'Current Standings' : 'Final Standings'}
            <Badge variant="default" className={isInProgress ? 'bg-orange-600' : 'bg-amber-600'}>
              {getScoringModeDisplay()}
            </Badge>
            {isInProgress && (
              <Badge variant="outline" className="animate-pulse border-orange-500 text-orange-500">
                Live
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {isInProgress ? 'Projected ' : ''}Prize Pool: <span className="font-bold text-amber-400">{formatICP(results.totalPrizePool)}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Faction Standings */}
      {hasFactionStandings && results.factionStandings && (
        <Card className="border border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              ⚔️ Faction Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...results.factionStandings]
              .sort((a: any, b: any) => Number(b.totalPoints) - Number(a.totalPoints))
              .map((faction: any, idx: number) => (
              <div 
                key={faction.faction}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                  idx === 0 ? 'bg-amber-500/10 border-amber-500/40' 
                    : idx === 1 ? 'bg-gray-400/10 border-gray-400/40'
                    : idx === 2 ? 'bg-orange-700/10 border-orange-700/40'
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
            
            {/* Show winning faction members */}
            {results.scoringMode && 'TeamAggregate' in results.scoringMode && (() => {
              const winningFaction = [...results.factionStandings].sort((a: any, b: any) => Number(b.totalPoints) - Number(a.totalPoints))[0];
              if (!winningFaction?.members) return null;
              return (
                <div className="mt-4 pt-4 border-t border-primary/20">
                  <p className="text-sm font-semibold mb-3 text-amber-400">
                    🎉 Winning Faction Members ({winningFaction.faction})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {winningFaction.members.map((member: any) => {
                      const imageUrl = getBotAvatarUrl({ tokenIndex: Number(member.tokenIndex) });
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
                            <p className="text-xs text-muted-foreground">{Number(member.points)} pts</p>
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
      )}

      {/* Individual Cumulative Standings */}
      {hasCumulativeStandings && results.cumulativeStandings && (
        <Card className="border border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              📊 Individual Standings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.cumulativeStandings.map((standing: any) => {
                const imageUrl = getBotAvatarUrl({ tokenIndex: Number(standing.tokenIndex) });
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
                      position <= 3 ? 'bg-amber-500/10 border-amber-500/30'
                        : hasPrize ? 'bg-green-500/5 border-green-500/20' 
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
                        className={`w-12 h-12 rounded border-2 ${position <= 3 ? 'border-amber-500/40' : 'border-border/40'}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{profile?.name?.[0] || `Bot #${standing.tokenIndex}`}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {standing.raceResults?.slice(0, 4).map((race: any) => (
                            <Badge key={race.raceId.toString()} variant="outline" className="text-xs">
                              {race.stageName || `R${race.raceId}`}: P{Number(race.position)}
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
                        <p className="text-xl font-bold text-primary">{Number(standing.cumulativePoints)} pts</p>
                        {hasPrize && (
                          <p className="text-sm text-green-500 font-semibold">+{formatICP(standing.prizeAmount)}</p>
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

      {/* Race Summary Grid */}
      {results.raceResultsSummary && results.raceResultsSummary.length > 0 && (
        <Card className="border border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🏁 Race Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.raceResultsSummary.map((race: any) => (
                <div key={race.raceId.toString()} className="p-3 bg-card/50 border border-primary/20 rounded-lg overflow-hidden">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="shrink-0">{getTerrainIcon(race.terrain)}</span>
                      <span className="font-semibold text-sm truncate" title={race.stageName || `Race #${race.raceId}`}>
                        {race.stageName || `Race #${race.raceId}`}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{getRaceClassName(race.raceClass)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {Number(race.distance)} km • {getTerrainName(race.terrain)}
                  </p>
                  {race.results && race.results.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-amber-400">🏆</span>
                      <span className="font-semibold">Bot #{race.results[0].tokenIndex.toString()}</span>
                      <span className="text-muted-foreground">({race.results[0].finalTime.toFixed(2)}s)</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
