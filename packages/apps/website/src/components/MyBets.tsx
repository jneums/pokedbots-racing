'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';

interface MyBetsProps {
  bets?: any[]; // TODO: Add proper type
  summary?: any; // TODO: Add proper type
}

function formatICP(icp: string): string {
  const num = parseFloat(icp);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(num);
}

function formatPercent(percent: string): string {
  const num = parseFloat(percent);
  return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
}

function getBetStatusBadge(status: string) {
  const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    'Pending': { variant: 'secondary' },
    'Won': { variant: 'default' },
    'Lost': { variant: 'destructive' },
    'Refunded': { variant: 'outline' },
  };
  
  const { variant } = statusMap[status] || { variant: 'outline' };
  return <Badge variant={variant}>{status}</Badge>;
}

function formatDate(timestampNanos: number): string {
  const date = new Date(timestampNanos / 1_000_000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MyBets({ bets = [], summary }: MyBetsProps) {
  const activeBets = bets.filter((b: any) => b.status === 'Pending');
  const completedBets = bets.filter((b: any) => b.status !== 'Pending');

  if (!bets.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Bets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            You haven't placed any bets yet. Check out the upcoming races!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Bets</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{summary.total_bets}</div>
              <div className="text-sm text-muted-foreground">Total Bets</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{formatICP(summary.total_wagered_icp)}</div>
              <div className="text-sm text-muted-foreground">Wagered</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className={`text-2xl font-bold ${parseFloat(summary.net_profit_icp) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatICP(summary.net_profit_icp)}
              </div>
              <div className="text-sm text-muted-foreground">Profit</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className={`text-2xl font-bold ${parseFloat(summary.roi_percent) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercent(summary.roi_percent)}
              </div>
              <div className="text-sm text-muted-foreground">ROI</div>
            </div>
          </div>
        )}

        {/* Bets List */}
        <Tabs defaultValue="active">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Active ({activeBets.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              History ({completedBets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {activeBets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No active bets</p>
            ) : (
              activeBets.map((bet: any) => <BetCard key={bet.bet_id} bet={bet} />)
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {completedBets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No completed bets</p>
            ) : (
              completedBets.map((bet: any) => <BetCard key={bet.bet_id} bet={bet} />)
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function BetCard({ bet }: { bet: any }) {
  const isWon = bet.status === 'Won';
  const roi = bet.payout?.roi_percent;

  return (
    <Link
      to={`/race/${bet.race_id}`}
      className="block p-4 rounded-lg border hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium">
            Race #{bet.race_id} • Bot #{bet.token_index}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate(bet.timestamp)}
          </div>
        </div>
        {getBetStatusBadge(bet.status)}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-muted-foreground">Type:</span> {bet.bet_type}
        </div>
        <div>
          <span className="text-muted-foreground">Amount:</span> {formatICP(bet.amount_icp)} ICP
        </div>
      </div>

      {bet.payout && (
        <div className="mt-2 pt-2 border-t flex items-center justify-between">
          <div className="text-sm">
            <span className="text-muted-foreground">Payout:</span>{' '}
            <span className="font-medium">{formatICP(bet.payout.payout_icp)} ICP</span>
          </div>
          <div className={`text-sm font-medium ${parseFloat(roi) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatPercent(roi)}
          </div>
        </div>
      )}
    </Link>
  );
}
