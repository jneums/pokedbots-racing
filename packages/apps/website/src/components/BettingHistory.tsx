import { useGetMyBets } from '../hooks/useBetting';
import { useGetBotProfile } from '../hooks/useRacing';
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, TrendingDown, Clock } from 'lucide-react';

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
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      <Avatar className="h-6 w-6">
        <AvatarImage src={imageUrl} alt={name} />
        <AvatarFallback className="text-xs">#{tokenIndex.toString().slice(-2)}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">{name}</span>
    </div>
  );
}

export function BettingHistory() {
  const { data: bettingData, isLoading, error } = useGetMyBets();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Betting History</CardTitle>
          <CardDescription>Your recent predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            Loading betting history...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error('Betting history error:', error);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Betting History</CardTitle>
          <CardDescription>Your recent predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-red-500">Error loading betting history</p>
            <p className="text-sm mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bettingData || bettingData.count === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Betting History</CardTitle>
          <CardDescription>Your recent predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No bets placed yet</p>
            <p className="text-sm mt-2">Place your first bet on an upcoming race!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter for won bets
  const wonBets = bettingData.bets.filter(bet => bet.status === 'Won');
  const recentBets = bettingData.bets.slice(0, 10); // Show last 10 bets

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Betting History</CardTitle>
            <CardDescription>Your recent predictions</CardDescription>
          </div>
          <Link 
            to="/betting" 
            className="text-sm text-primary hover:underline"
          >
            View All →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 pb-4 border-b">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{bettingData.summary.total_bets}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-500">{wonBets.length}</div>
              <div className="text-xs text-muted-foreground">Won</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${
                parseFloat(bettingData.summary.net_profit_icp) >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {parseFloat(bettingData.summary.net_profit_icp) >= 0 ? '+' : ''}
                {parseFloat(bettingData.summary.net_profit_icp).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">ICP Profit</div>
            </div>
          </div>

          {/* Won Bets Section */}
          {wonBets.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-500">
                <Trophy className="h-4 w-4" />
                Winning Bets ({wonBets.length})
              </div>
              {wonBets.slice(0, 5).map((bet) => (
                <Link
                  key={Number(bet.bet_id)}
                  to={`/race/${Number(bet.race_id)}`}
                  className="block p-3 bg-green-500/10 rounded-lg border border-green-500/20 hover:border-green-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <BotNameWithAvatar tokenIndex={Number(bet.token_index)} />
                        <Badge variant="outline" className="text-xs">
                          {bet.bet_type}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Race #{Number(bet.race_id)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-bold text-green-500">
                        <TrendingUp className="h-3 w-3" />
                        +{bet.payout?.[0]?.payout_icp || '0.00'} ICP
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {bet.payout?.[0]?.roi_percent || '0%'} ROI
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Recent Bets Section */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-muted-foreground">
              Recent Bets
            </div>
            {recentBets.map((bet) => (
              <Link
                key={Number(bet.bet_id)}
                to={`/race/${Number(bet.race_id)}`}
                className={`block p-3 rounded-lg border transition-colors ${
                  bet.status === 'Won'
                    ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
                    : bet.status === 'Lost'
                    ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                    : 'bg-muted/50 border-border hover:border-primary/40'
                }`}
              >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
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
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span>Race #{Number(bet.race_id)} • {bet.amount_icp} ICP</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(bet.timestamp)}
                      </span>
                    </div>
                  </div>
                  {(bet.status === 'Won' || bet.status === 'Lost') && (
                    <div className="text-right">
                      <div className={`flex items-center gap-1 text-sm font-bold ${
                        bet.status === 'Won' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {bet.status === 'Won' ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {bet.status === 'Won' 
                          ? `+${bet.payout?.[0]?.payout_icp || '0.00'} ICP`
                          : `-${bet.amount_icp} ICP`
                        }
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
