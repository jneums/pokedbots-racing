import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  useGetMonthlyLeaderboard,
  useGetSeasonLeaderboard,
  useGetAllTimeLeaderboard,
  type LeaderboardEntry,
} from "@/hooks/useLeaderboard";
import {  useGetBotProfilesBatch } from "@/hooks/useRacing";
import { generatetokenIdentifier, generateExtThumbnailLink, getPlatformStats } from "@pokedbots-racing/ic-js";
import { PokedBotsRacing } from '@pokedbots-racing/declarations';
import { useQuery } from '@tanstack/react-query';

type BracketType = 'All' | 'SilentKlan' | 'Elite' | 'Raider' | 'Junker' | 'Scrap';
type RaceClass = PokedBotsRacing.RaceClass;

function bracketToRaceClass(bracket: BracketType): RaceClass | undefined {
  if (bracket === 'All') return undefined;
  return { [bracket]: null } as RaceClass;
}

function formatICP(amount: bigint): string {
  // ICP has 8 decimals (e8s)
  const icp = Number(amount) / 100_000_000;
  if (icp >= 1000) {
    return (icp / 1000).toFixed(1) + 'k ICP';
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(icp) + ' ICP';
}

function BotNameDisplay({ tokenIndex, botProfile }: { tokenIndex: number; botProfile: any }) {
  if (botProfile?.name && botProfile.name.length > 0 && botProfile.name[0]) {
    return <>PokedBot #{tokenIndex} - {botProfile.name[0]}</>;
  }
  
  return <>PokedBot #{tokenIndex}</>;
}


function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function getTrendIcon(trend: LeaderboardEntry['trend']): string {
  if ('Up' in trend) return '📈';
  if ('Down' in trend) return '📉';
  if ('New' in trend) return '🆕';
  return '➡️';
}

function getTrendText(trend: LeaderboardEntry['trend']): string {
  if ('Up' in trend) return `+${trend.Up}`;
  if ('Down' in trend) return `-${trend.Down}`;
  if ('New' in trend) return 'New';
  return 'Same';
}

function LeaderboardTable({ entries, type, botProfiles }: { entries: LeaderboardEntry[], type: 'points' | 'wins' | 'winrate' | 'earnings', botProfiles?: any[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No racers yet.</p>
        <p className="text-sm mt-2">Be the first to enter a race!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const botProfile = botProfiles?.find(p => Number(p.tokenIndex) === Number(entry.tokenIndex));
        return (
          <Card key={entry.rank.toString()} className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-4 sm:gap-6">
                {/* Rank - Desktop only */}
                <div className="hidden sm:flex flex-shrink-0">
                  {entry.rank <= 3n ? (
                    <span className="text-4xl">
                      {entry.rank === 1n ? '🥇' : entry.rank === 2n ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">
                      #{entry.rank.toString()}
                    </span>
                  )}
                </div>

                {/* Bot with NFT Image */}
                <Link to={`/bot/${entry.tokenIndex.toString()}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                  <div className="relative flex-shrink-0">
                    <img
                      src={(() => {
                        const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(entry.tokenIndex));
                        return generateExtThumbnailLink(tokenId);
                      })()}
                      alt={`PokedBot #${entry.tokenIndex}`}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-4 border-primary/40 shadow-lg object-cover bg-background"
                      onError={(e) => {
                        // Fallback to placeholder on error
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=PB${entry.tokenIndex.toString()}&background=random&size=128`;
                      }}
                    />
                    {/* Rank Badge - Mobile only */}
                    <div className="absolute -top-1 -right-1 flex items-center justify-center sm:hidden">
                      {entry.rank <= 3n ? (
                        <span className="text-2xl drop-shadow-lg">
                          {entry.rank === 1n ? '🥇' : entry.rank === 2n ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <div className="bg-primary/90 text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-background shadow-lg">
                          {entry.rank.toString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm sm:text-base">
                      <BotNameDisplay tokenIndex={Number(entry.tokenIndex)} botProfile={botProfile} />
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{entry.races.toString()} races</span>
                      <span className="text-xs">•</span>
                      <span className="flex items-center gap-1">
                        {getTrendIcon(entry.trend)}
                        <span>{getTrendText(entry.trend)}</span>
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Stats Section */}
                <div className="flex items-center gap-6 sm:gap-10 ml-auto mr-2 sm:mr-4">
                  {/* Main Stat */}
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold text-primary">
                      {type === 'points' && entry.points.toString()}
                      {type === 'wins' && entry.wins.toString()}
                      {type === 'winrate' && formatPercentage(entry.winRate)}
                      {type === 'earnings' && formatICP(entry.totalEarnings)}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {type === 'points' && 'Points'}
                      {type === 'wins' && 'Wins'}
                      {type === 'winrate' && 'Win Rate'}
                      {type === 'earnings' && 'Earned'}
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="text-right space-y-1 hidden sm:block min-w-[120px]">
                    <div className="text-sm sm:text-base">
                      <span className="text-green-500">{entry.wins.toString()}W</span>
                      {' / '}
                      <span className="text-yellow-500">{entry.podiums.toString()}🏆</span>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {entry.currentStreak > 0n ? (
                        <span className="text-green-500">🔥 {entry.currentStreak.toString()} streak</span>
                      ) : entry.currentStreak < 0n ? (
                        <span className="text-red-500">❄️ {(-Number(entry.currentStreak)).toString()} cold</span>
                      ) : (
                        <span>Avg: P{entry.avgPosition.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function LeaderboardPage() {
  const [selectedBracket, setSelectedBracket] = useState<BracketType>('All');
  
  // Remember the last selected tab
  const [selectedTab, setSelectedTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('leaderboard-tab') || 'month';
    }
    return 'month';
  });
  
  // Persist tab selection to localStorage
  useEffect(() => {
    localStorage.setItem('leaderboard-tab', selectedTab);
  }, [selectedTab]);
  
  const bracket = bracketToRaceClass(selectedBracket);
  
  const { 
    data: monthlyData, 
    isLoading: monthlyLoading, 
    fetchNextPage: fetchNextMonthly,
    hasNextPage: hasNextMonthly,
    isFetchingNextPage: isFetchingNextMonthly,
  } = useGetMonthlyLeaderboard(bracket);
  
  const { 
    data: seasonData, 
    isLoading: seasonLoading,
    fetchNextPage: fetchNextSeason,
    hasNextPage: hasNextSeason,
    isFetchingNextPage: isFetchingNextSeason,
  } = useGetSeasonLeaderboard(bracket);
  
  const { 
    data: allTimeData, 
    isLoading: allTimeLoading,
    fetchNextPage: fetchNextAllTime,
    hasNextPage: hasNextAllTime,
    isFetchingNextPage: isFetchingNextAllTime,
  } = useGetAllTimeLeaderboard(bracket);
  
  // Get platform-wide statistics
  const { data: platformStats, isLoading: statsLoading } = useQuery({
    queryKey: ['platformStats'],
    queryFn: () => getPlatformStats(),
  });

  // Flatten paginated data into single arrays
  const monthlyLeaderboard = monthlyData?.pages.flatMap(page => page.entries) ?? [];
  const seasonLeaderboard = seasonData?.pages.flatMap(page => page.entries) ?? [];
  const allTimeLeaderboard = allTimeData?.pages.flatMap(page => page.entries) ?? [];

  // Sort leaderboard by wins
  const winsSortedLeaderboard = [...allTimeLeaderboard].sort((a, b) => {
    const winsA = Number(a.wins);
    const winsB = Number(b.wins);
    if (winsB !== winsA) return winsB - winsA; // Sort by wins descending
    return Number(b.points) - Number(a.points); // Tie-breaker: points
  });

  // Batch fetch all bot profiles for current visible entries
  const allVisibleIndices = [
    ...monthlyLeaderboard.map(e => Number(e.tokenIndex)),
    ...seasonLeaderboard.map(e => Number(e.tokenIndex)),
    ...allTimeLeaderboard.map(e => Number(e.tokenIndex)),
  ];
  const uniqueIndices = Array.from(new Set(allVisibleIndices));
  const { data: botProfiles } = useGetBotProfilesBatch(uniqueIndices);

  // Use platform-wide statistics
  const totalRacers = platformStats?.totalRacers ?? 0;
  const totalRaces = platformStats?.totalRaces ?? 0;
  const totalWins = platformStats?.totalWins ?? 0;
  const totalEarnings = platformStats?.totalEarnings ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">🏁 Wasteland Racing Leaderboard</h1>
            <p className="text-xl text-muted-foreground">
              Top PokedBots competing in the wasteland races
            </p>
          </div>

          {/* Platform Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur text-center">
              <CardHeader className="pb-3">
                <CardTitle className="text-3xl font-bold text-primary">
                  {totalRacers}
                </CardTitle>
                <CardDescription>Total Racers</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur text-center">
              <CardHeader className="pb-3">
                <CardTitle className="text-3xl font-bold text-primary">
                  {totalRaces}
                </CardTitle>
                <CardDescription>Race Entries</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur text-center">
              <CardHeader className="pb-3">
                <CardTitle className="text-3xl font-bold text-primary">
                  {totalWins}
                </CardTitle>
                <CardDescription>Total Wins</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur text-center">
              <CardHeader className="pb-3">
                <CardTitle className="text-3xl font-bold text-primary">
                  {formatICP(BigInt(totalEarnings))}
                </CardTitle>
                <CardDescription>Total Prize Money</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Bracket Filter Chips */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Filter by Bracket</h3>
            <div className="flex flex-wrap gap-2">
              {(['All', 'SilentKlan', 'Elite', 'Raider', 'Junker', 'Scrap'] as BracketType[]).map((bracket) => (
                <Button
                  key={bracket}
                  variant={selectedBracket === bracket ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedBracket(bracket)}
                  className="font-semibold"
                >
                  {bracket === 'All' ? '🌐 All Brackets' : 
                   bracket === 'SilentKlan' ? '👑 SilentKlan (50+)' :
                   bracket === 'Elite' ? '⭐ Elite (40-49)' :
                   bracket === 'Raider' ? '🔥 Raider (30-39)' :
                   bracket === 'Junker' ? '⚙️ Junker (20-29)' : '🔧 Scrap (0-19)'}
                </Button>
              ))}
            </div>
          </div>

          {/* Leaderboard Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-8 h-auto sm:h-14 bg-muted p-1.5 rounded-xl gap-1.5 sm:gap-0">
              <TabsTrigger 
                value="month"
                className="text-sm sm:text-base font-semibold py-3 sm:py-0 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg"
              >
                📆 Month
              </TabsTrigger>
              <TabsTrigger 
                value="season"
                className="text-sm sm:text-base font-semibold py-3 sm:py-0 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg"
              >
                📅 Season
              </TabsTrigger>
              <TabsTrigger 
                value="points" 
                className="text-sm sm:text-base font-semibold py-3 sm:py-0 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg"
              >
                🏆 All-Time
              </TabsTrigger>
              <TabsTrigger 
                value="wins"
                className="text-sm sm:text-base font-semibold py-3 sm:py-0 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg"
              >
                🥇 Wins
              </TabsTrigger>
            </TabsList>

            <TabsContent value="points">
              <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>All-Time Champions</CardTitle>
                  <CardDescription>
                    Racers ranked by total championship points earned
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allTimeLoading ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Loading...</p>
                    </div>
                  ) : (
                    <>
                      <LeaderboardTable entries={allTimeLeaderboard} type="points" botProfiles={botProfiles} />
                      {hasNextAllTime && (
                        <div className="text-center mt-6">
                          <Button 
                            onClick={() => fetchNextAllTime()} 
                            disabled={isFetchingNextAllTime}
                            variant="outline"
                            size="lg"
                          >
                            {isFetchingNextAllTime ? 'Loading...' : 'Load More'}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wins">
              <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>Most Victories</CardTitle>
                  <CardDescription>
                    Racers ranked by total race wins
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allTimeLoading ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Loading...</p>
                    </div>
                  ) : (
                    <>
                      <LeaderboardTable entries={winsSortedLeaderboard} type="wins" botProfiles={botProfiles} />
                      {hasNextAllTime && (
                        <div className="text-center mt-6">
                          <Button 
                            onClick={() => fetchNextAllTime()} 
                            disabled={isFetchingNextAllTime}
                            variant="outline"
                            size="lg"
                          >
                            {isFetchingNextAllTime ? 'Loading...' : 'Load More'}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="season">
              <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>Current Season Rankings</CardTitle>
                  <CardDescription>
                    Top racers in the current wasteland season
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {seasonLoading ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Loading...</p>
                    </div>
                  ) : (
                    <>
                      <LeaderboardTable entries={seasonLeaderboard} type="points" botProfiles={botProfiles} />
                      {hasNextSeason && (
                        <div className="text-center mt-6">
                          <Button 
                            onClick={() => fetchNextSeason()} 
                            disabled={isFetchingNextSeason}
                            variant="outline"
                            size="lg"
                          >
                            {isFetchingNextSeason ? 'Loading...' : 'Load More'}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="month">
              <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>This Month's Leaders</CardTitle>
                  <CardDescription>
                    Top racers in the current month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyLoading ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Loading...</p>
                    </div>
                  ) : (
                    <>
                      <LeaderboardTable entries={monthlyLeaderboard} type="points" botProfiles={botProfiles} />
                      {hasNextMonthly && (
                        <div className="text-center mt-6">
                          <Button 
                            onClick={() => fetchNextMonthly()} 
                            disabled={isFetchingNextMonthly}
                            variant="outline"
                            size="lg"
                          >
                            {isFetchingNextMonthly ? 'Loading...' : 'Load More'}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
