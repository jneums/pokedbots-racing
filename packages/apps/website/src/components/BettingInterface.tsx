'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePlaceBet, useGetBettingPool } from '@/hooks/useBetting';
import { useGetBotProfile } from '@/hooks/useRacing';
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';
import { Link } from 'react-router-dom';
import type { BetType } from '@pokedbots-racing/ic-js';

interface BettingInterfaceProps {
  raceId: number;
}

function formatICP(e8s: number | string): string {
  const num = typeof e8s === 'string' ? parseFloat(e8s) : e8s;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(num);
}

function formatOdds(odds: string): string {
  if (odds === '-') return '-';
  const oddsNum = parseFloat(odds);
  if (oddsNum === 0 || isNaN(oddsNum)) return '-';
  return `${oddsNum.toFixed(2)}x`;
}

function getStatusBadge(status: any) {
  // Handle Motoko variant format: {Settled: null}, {Open: null}, etc.
  let statusString = '';
  if (typeof status === 'string') {
    statusString = status;
  } else if (typeof status === 'object' && status !== null) {
    // Extract the key from the object
    statusString = Object.keys(status)[0] || '';
  }
  
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    'Open': { label: '🎰 Betting Open', variant: 'default' },
    'Closed': { label: 'Betting Closed', variant: 'secondary' },
    'Settled': { label: 'Race Completed', variant: 'outline' },
    'Pending': { label: 'Betting Opens Soon', variant: 'secondary' },
  };
  
  const { label, variant } = statusMap[statusString] || { label: statusString, variant: 'outline' };
  return <Badge variant={variant}>{label}</Badge>;
}

function BotName({ tokenIndex }: { tokenIndex: number }) {
  const { data: botProfile } = useGetBotProfile(tokenIndex);
  
  if (botProfile?.name && botProfile.name.length > 0 && botProfile.name[0]) {
    return <>{botProfile.name[0]}</>;
  }
  
  return <>Bot #{tokenIndex}</>;
}

export function BettingInterface({ raceId }: BettingInterfaceProps) {
  const { isAuthenticated } = useAuth();
  const { data: poolInfoRaw, isLoading, error } = useGetBettingPool(raceId);
  const { mutate: placeBet, isPending: isPlacingBet } = usePlaceBet();
  const [selectedBot, setSelectedBot] = useState<number | null>(null);
  const [betType, setBetType] = useState<BetType>('Win');
  const [pendingBets, setPendingBets] = useState<Set<number>>(new Set());

  // Backend returns array or object, normalize it
  const poolInfo = Array.isArray(poolInfoRaw) ? poolInfoRaw[0] : poolInfoRaw;

  // Extract status string from Motoko variant format
  const getStatusString = (status: any): string => {
    if (typeof status === 'string') return status;
    if (typeof status === 'object' && status !== null) {
      return Object.keys(status)[0] || '';
    }
    return '';
  };

  const statusString = poolInfo ? getStatusString(poolInfo.status) : '';
  const isOpen = statusString === 'Open';
  // Convert bigint e8s to ICP string
  const totalPool = poolInfo?.totalPooled ? formatICP(Number(poolInfo.totalPooled) / 100_000_000) : '0.00';
  const entrantsCount = poolInfo?.entrants?.length || 0;

  // Calculate odds for each entrant from raw bet data
  const calculateOdds = (betsByBot: [bigint, bigint][], totalPool: bigint): number => {
    if (!betsByBot || betsByBot.length === 0 || totalPool === 0n) return 0;
    const totalBets = betsByBot.reduce((sum, [_, amount]) => sum + amount, 0n);
    if (totalBets === 0n) return 0;
    return Number(totalPool) / Number(totalBets);
  };

  // Create entrants with calculated odds
  const entrantsWithOdds = poolInfo?.entrants?.map((tokenIndex: bigint) => {
    const winBet = poolInfo.winBetsByBot.find(([idx]: [bigint, bigint]) => idx === tokenIndex);
    const placeBet = poolInfo.placeBetsByBot.find(([idx]: [bigint, bigint]) => idx === tokenIndex);
    const showBet = poolInfo.showBetsByBot.find(([idx]: [bigint, bigint]) => idx === tokenIndex);

    const winAmount = winBet ? winBet[1] : 0n;
    const placeAmount = placeBet ? placeBet[1] : 0n;
    const showAmount = showBet ? showBet[1] : 0n;

    const netWinPool = poolInfo.winPool * 9n / 10n; // After 10% rake
    const netPlacePool = poolInfo.placePool * 9n / 10n;
    const netShowPool = poolInfo.showPool * 9n / 10n;

    // Calculate odds or show dash if no bets
    const winOdds = winAmount > 0n ? (Number(netWinPool) / Number(winAmount)).toFixed(2) : '-';
    const placeOdds = placeAmount > 0n ? (Number(netPlacePool) / Number(placeAmount)).toFixed(2) : '-';
    const showOdds = showAmount > 0n ? (Number(netShowPool) / Number(showAmount)).toFixed(2) : '-';

    return {
      token_index: Number(tokenIndex),
      win_odds: winOdds,
      place_odds: placeOdds,
      show_odds: showOdds,
      win_pool_icp: formatICP(Number(winAmount) / 100_000_000),
      place_pool_icp: formatICP(Number(placeAmount) / 100_000_000),
      show_pool_icp: formatICP(Number(showAmount) / 100_000_000),
    };
  }) || [];
  const betsCount = poolInfo?.betIds?.length || 0;

  const handlePlaceBet = (betAmount: number) => {
    if (!selectedBot) {
      toast.error('Please select a bot to bet on');
      return;
    }

    if (isNaN(betAmount) || betAmount < 0.1 || betAmount > 100) {
      toast.error('Bet amount must be between 0.1 and 100 ICP');
      return;
    }

    // Track pending bet for visual feedback
    setPendingBets(prev => new Set(prev).add(betAmount));

    // Fire and forget - don't await result for quick spam betting
    placeBet(
      {
        race_id: raceId,
        token_index: selectedBot,
        bet_type: betType,
        amount_icp: betAmount,
      },
      {
        onSuccess: (result) => {
          toast.success(result.message);
          setPendingBets(prev => {
            const next = new Set(prev);
            next.delete(betAmount);
            return next;
          });
        },
        onError: (error: any) => {
          toast.error(error.message || 'Failed to place bet');
          setPendingBets(prev => {
            const next = new Set(prev);
            next.delete(betAmount);
            return next;
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading betting info...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Betting</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Error loading betting pool: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!poolInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Betting</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No betting pool available for this race.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Race Betting</CardTitle>
          {getStatusBadge(poolInfo.status)}
        </div>
        <div className="text-sm text-muted-foreground">
          {poolInfo.time_info}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pool Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalPool} ICP</div>
            <div className="text-sm text-muted-foreground">Total Pool</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{poolInfo.betIds?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Bets Placed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{entrantsCount}</div>
            <div className="text-sm text-muted-foreground">Entrants</div>
          </div>
        </div>

        {!isOpen && statusString !== 'Settled' && (
          <div className="text-center py-4 text-muted-foreground">
            {statusString === 'Pending' && 'Betting will open when registration closes'}
            {statusString === 'Closed' && 'Race is in progress'}
          </div>
        )}

        {/* Show odds for Open or Settled races */}
        {(isOpen || statusString === 'Settled') && entrantsWithOdds.length > 0 && (
          <>
            {/* Bet Type Tabs */}
            <Tabs value={betType} onValueChange={(v) => setBetType(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="Win">Win (1st)</TabsTrigger>
                <TabsTrigger value="Place">Place (Top 3)</TabsTrigger>
                <TabsTrigger value="Show">Show (Top 5)</TabsTrigger>
              </TabsList>

              <TabsContent value="Win" className="space-y-4">
                <EntrantsList
                  entrants={entrantsWithOdds || []}
                  selectedBot={selectedBot}
                  onSelect={setSelectedBot}
                  oddsType="win"
                />
              </TabsContent>

              <TabsContent value="Place" className="space-y-4">
                <EntrantsList
                  entrants={entrantsWithOdds || []}
                  selectedBot={selectedBot}
                  onSelect={setSelectedBot}
                  oddsType="place"
                />
              </TabsContent>

              <TabsContent value="Show" className="space-y-4">
                <EntrantsList
                  entrants={entrantsWithOdds || []}
                  selectedBot={selectedBot}
                  onSelect={setSelectedBot}
                  oddsType="show"
                />
              </TabsContent>
            </Tabs>

            {/* Only show bet buttons if race is Open */}
            {isOpen && (
              <>
                {/* Quick Bet Buttons */}
                <div className="space-y-4">
                  <label className="text-sm font-medium">Bet Amount (ICP)</label>
                  <div className="flex gap-3 flex-wrap">
                    {[0.1, 0.5, 1, 2, 5].map((amt) => (
                      <Button
                        key={amt}
                        type="button"
                        variant={pendingBets.has(amt) ? "default" : "outline"}
                        size="lg"
                        onClick={() => handlePlaceBet(amt)}
                        disabled={!selectedBot || !isAuthenticated || pendingBets.has(amt)}
                        className="flex-1 min-w-[80px]"
                      >
                        {pendingBets.has(amt) ? (
                          <>
                            <span className="animate-pulse">⏳</span> {amt} ICP
                          </>
                        ) : (
                          <>{amt} ICP</>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                {!isAuthenticated && (
                  <Button className="w-full" asChild>
                    <Link to="/wallet">Connect Wallet to Bet</Link>
                  </Button>
                )}

                {selectedBot && isAuthenticated && (
                  <div className="text-sm text-center text-muted-foreground">
                    Selected: Bot #{selectedBot} • {betType}
                  </div>
                )}
              </>
            )}

            {/* Show message for settled races */}
            {statusString === 'Settled' && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Race completed - Final odds shown above
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface EntrantsListProps {
  entrants: any[];
  selectedBot: number | null;
  onSelect: (bot: number) => void;
  oddsType: 'win' | 'place' | 'show';
  readonly?: boolean;
}

function EntrantsList({ entrants, selectedBot, onSelect, oddsType, readonly = false }: EntrantsListProps) {
  const oddsKey = `${oddsType}_odds`;
  const poolKey = `${oddsType}_pool_icp`;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium mb-2">{readonly ? 'Final Odds:' : 'Select a bot to bet on:'}</div>
      {entrants?.map((entrant: any) => {
        const odds = entrant[oddsKey];
        const pool = entrant[poolKey];
        const isSelected = selectedBot === entrant.token_index;

        return (
          <button
            key={entrant.token_index}
            onClick={() => !readonly && onSelect(entrant.token_index)}
            disabled={readonly}
            className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
              readonly
                ? 'border-border cursor-default'
                : isSelected
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img
                  src={generateExtThumbnailLink(generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', entrant.token_index))}
                  alt={`Bot #${entrant.token_index}`}
                  className="w-12 h-12 rounded border-2 border-primary/30 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    <BotName tokenIndex={entrant.token_index} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {pool !== '0.00' ? `${pool} ICP wagered` : 'No bets yet'}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-bold">{formatOdds(odds)}</div>
                <div className="text-xs text-muted-foreground">payout</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
