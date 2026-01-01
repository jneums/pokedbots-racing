'use client';

import { useGetMyBetsInfinite } from '../../hooks/useBetting';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, TrendingDown, ArrowLeft, Clock, Loader2 } from 'lucide-react';
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';
import { useGetBotProfile } from '../../hooks/useRacing';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { WalletConnect } from '../../components/WalletConnect';

function formatTimestamp(timestamp: number): string {
  const date = new Date(Number(timestamp) / 1000000); // Convert nanoseconds to milliseconds
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function BotNameWithAvatar({ tokenIndex }: { tokenIndex: number }) {
  const { data: botProfile } = useGetBotProfile(tokenIndex);
  const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', tokenIndex);
  const imageUrl = generateExtThumbnailLink(tokenId);
  
  const name = botProfile?.name && botProfile.name.length > 0 && botProfile.name[0]
    ? botProfile.name[0]
    : `Bot #${tokenIndex}`;
  
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={imageUrl} alt={name} />
        <AvatarFallback className="text-xs">#{tokenIndex.toString().slice(-2)}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">{name}</span>
    </div>
  );
}

export default function BettingPage() {
  const { isAuthenticated } = useAuth();
  const { 
    data, 
    isLoading, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage 
  } = useGetMyBetsInfinite(10);

  // Flatten all pages into a single array of bets
  const allBets = data?.pages.flatMap(page => page.bets) || [];
  // Get summary from the first page (summary is the same across all pages)
  const summary = data?.pages[0]?.summary;
  const totalBets = Number(data?.pages[0]?.total || 0);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto border-2 border-primary/20 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-3xl">Betting History</CardTitle>
            <CardDescription>
              Connect your wallet to view your betting history and track your predictions
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <WalletConnect />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
        <Link to="/leaderboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Betting History</h1>
          <p className="text-muted-foreground">Your complete prediction history and statistics</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Loading betting history...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Failed to load betting history. Please try again.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {!isLoading && !error && summary && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Bets</CardDescription>
                <CardTitle className="text-3xl">{summary.total_bets}</CardTitle>
                <div className="text-xs text-muted-foreground mt-1">
                  {summary.wins} W / {summary.losses} L / {summary.pending} Pending
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Win Rate</CardDescription>
                <CardTitle className="text-3xl text-green-500">
                  {summary.win_rate_percent}
                </CardTitle>
                <div className="text-xs text-muted-foreground mt-1">
                  {summary.wins} wins out of {Number(summary.wins) + Number(summary.losses)} settled
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>ROI</CardDescription>
                <CardTitle className={`text-3xl ${
                  parseFloat(summary.roi_percent) >= 0 
                    ? 'text-green-500' 
                    : 'text-red-500'
                }`}>
                  {summary.roi_percent}
                </CardTitle>
                <div className="text-xs text-muted-foreground mt-1">
                  Return on investment
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Net Profit</CardDescription>
                <CardTitle className={`text-3xl ${
                  parseFloat(summary.net_profit_icp.replace(' ICP', '')) >= 0 
                    ? 'text-green-500' 
                    : 'text-red-500'
                }`}>
                  {summary.net_profit_icp}
                </CardTitle>
                <div className="text-xs text-muted-foreground mt-1">
                  Won {summary.total_won_icp} • Wagered {summary.total_wagered_icp}
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* All Bets Section */}
          <Card>
            <CardHeader>
              <CardTitle>All Bets ({totalBets})</CardTitle>
              <CardDescription>Complete betting history</CardDescription>
            </CardHeader>
            <CardContent>
              {allBets.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No bets placed yet.
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {allBets.map((bet) => (
                      <Link
                        key={Number(bet.bet_id)}
                        to={`/race/${Number(bet.race_id)}`}
                        className="block p-4 rounded-lg border hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                              <BotNameWithAvatar tokenIndex={Number(bet.token_index)} />
                              <Badge variant="outline" className="text-xs">
                                {bet.bet_type}
                              </Badge>
                              <Badge
                                variant={
                                  bet.status === 'Won'
                                    ? 'default'
                                    : bet.status === 'Lost'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className="text-xs"
                              >
                                {bet.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Race #{Number(bet.race_id)} • Wagered {bet.amount_icp} ICP
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatTimestamp(Number(bet.timestamp))}
                            </div>
                          </div>
                          {(bet.status === 'Won' || bet.status === 'Lost') && (
                            <div className="text-right space-y-0.5">
                              <div className={`flex items-center gap-1 text-lg font-bold ${
                                bet.status === 'Won' ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {bet.status === 'Won' ? (
                                  <TrendingUp className="h-4 w-4" />
                                ) : (
                                  <TrendingDown className="h-4 w-4" />
                                )}
                                {bet.status === 'Won' 
                                  ? `+${bet.payout?.[0]?.payout_icp || '0.00'} ICP`
                                  : `-${bet.amount_icp} ICP`
                                }
                              </div>
                              <div className={`text-xs ${
                                bet.status === 'Won' ? 'text-green-500/70' : 'text-red-500/70'
                              }`}>
                                {(() => {
                                  const wagered = parseFloat(bet.amount_icp);
                                  const payout = bet.status === 'Won' 
                                    ? parseFloat(bet.payout?.[0]?.payout_icp || '0') 
                                    : 0;
                                  const roi = bet.status === 'Won'
                                    ? ((payout - wagered) / wagered) * 100
                                    : -100;
                                  return `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}% ROI`;
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Load More Button */}
                  {hasNextPage && (
                    <div className="flex justify-center mt-6 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading more...
                          </>
                        ) : (
                          `Load More (${totalBets - allBets.length} remaining)`
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
      </div>
    </div>
  );
}
