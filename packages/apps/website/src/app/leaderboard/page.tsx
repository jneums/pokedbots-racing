'use client';

import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetMonthlyLeaderboard,
  useGetSeasonLeaderboard,
  useGetAllTimeLeaderboard,
  type LeaderboardEntry,
} from "@/hooks/useLeaderboard";
import { generatetokenIdentifier, generateExtThumbnailLink } from "@pokedbots-racing/ic-js";

function formatICP(amount: bigint): string {
  // ICP has 8 decimals (e8s)
  const icp = Number(amount) / 100_000_000;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(icp) + ' ICP';
}

function formatPrincipal(principal: string): string {
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 6)}...${principal.slice(-4)}`;
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

function LeaderboardTable({ entries, type }: { entries: LeaderboardEntry[], type: 'points' | 'wins' | 'winrate' | 'earnings' }) {
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
                      PokedBot #{entry.tokenIndex.toString()}
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
  const { data: monthlyLeaderboard, isLoading: monthlyLoading } = useGetMonthlyLeaderboard(50);
  const { data: seasonLeaderboard, isLoading: seasonLoading } = useGetSeasonLeaderboard(50);
  const { data: allTimeLeaderboard, isLoading: allTimeLoading } = useGetAllTimeLeaderboard(100);

  // Sort leaderboard by wins
  const winsSortedLeaderboard = allTimeLeaderboard ? [...allTimeLeaderboard].sort((a, b) => {
    const winsA = Number(a.wins);
    const winsB = Number(b.wins);
    if (winsB !== winsA) return winsB - winsA; // Sort by wins descending
    return Number(b.points) - Number(a.points); // Tie-breaker: points
  }) : [];

  // Calculate platform stats from all-time leaderboard
  const totalRacers = allTimeLeaderboard?.length || 0;
  const totalRaces = allTimeLeaderboard?.reduce((sum, entry) => sum + Number(entry.races), 0) || 0;
  const totalWins = allTimeLeaderboard?.reduce((sum, entry) => sum + Number(entry.wins), 0) || 0;
  const totalEarnings = allTimeLeaderboard?.reduce((sum, entry) => sum + Number(entry.totalEarnings), 0) || 0;

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
                <CardDescription>Total Races</CardDescription>
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

          {/* Leaderboard Tabs */}
          <Tabs defaultValue="points" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-8 h-auto sm:h-14 bg-muted p-1.5 rounded-xl gap-1.5 sm:gap-0">
              <TabsTrigger 
                value="points" 
                className="text-sm sm:text-base font-semibold py-3 sm:py-0 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg"
              >
                🏆 Points
              </TabsTrigger>
              <TabsTrigger 
                value="wins"
                className="text-sm sm:text-base font-semibold py-3 sm:py-0 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg"
              >
                🥇 Wins
              </TabsTrigger>
              <TabsTrigger 
                value="season"
                className="text-sm sm:text-base font-semibold py-3 sm:py-0 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg"
              >
                📅 Season
              </TabsTrigger>
              <TabsTrigger 
                value="month"
                className="text-sm sm:text-base font-semibold py-3 sm:py-0 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg"
              >
                📆 Month
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
                    <LeaderboardTable entries={allTimeLeaderboard || []} type="points" />
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
                    <LeaderboardTable entries={winsSortedLeaderboard} type="wins" />
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
                    <LeaderboardTable entries={seasonLeaderboard || []} type="points" />
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
                    <LeaderboardTable entries={monthlyLeaderboard || []} type="points" />
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
