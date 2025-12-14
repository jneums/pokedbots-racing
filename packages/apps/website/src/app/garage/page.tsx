import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMyBots, useUserInventory } from '../../hooks/useGarage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { WalletConnect } from '../../components/WalletConnect';
import { BotCard } from '../../components/BotCard';
import { RefreshCw, Battery, Wrench, Clock, Zap, Hammer, Star, GripVertical } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { BotListItem } from '@pokedbots-racing/ic-js';
import { Progress } from '../../components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { generatetokenIdentifier } from '@pokedbots-racing/ic-js';

// Helper to format time remaining
function formatTimeRemaining(timestampNanos: bigint): string {
  const targetNanos = typeof timestampNanos === 'bigint' ? timestampNanos : BigInt(timestampNanos);
  const nowNanos = BigInt(Date.now()) * 1_000_000n;
  const diffNanos = targetNanos - nowNanos;
  
  if (diffNanos < 0n) return 'Ready';
  
  const diffMs = Number(diffNanos / 1_000_000n);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
  if (diffHours > 0) return `${diffHours}h ${diffMinutes % 60}m`;
  if (diffMinutes > 0) return `${diffMinutes}m`;
  return '< 1m';
}

export default function GaragePage() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBotIndex, setSelectedBotIndex] = useState<bigint | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Use React Query hooks
  const { data: bots = [], isLoading: loading, error: botsError } = useMyBots();
  const { data: inventory, isLoading: inventoryLoading, refetch: refetchInventory } = useUserInventory();

  // Load favorites and custom order from localStorage
  useEffect(() => {
    if (user?.principal) {
      const storageKey = `garage_favorites_${user.principal}`;
      const orderKey = `garage_order_${user.principal}`;
      const savedFavorites = localStorage.getItem(storageKey);
      const savedOrder = localStorage.getItem(orderKey);
      
      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      }
      if (savedOrder) {
        setCustomOrder(JSON.parse(savedOrder));
      }
    }
  }, [user?.principal]);

  // Save favorites to localStorage
  const toggleFavorite = (tokenIndex: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(tokenIndex)) {
        newFavorites.delete(tokenIndex);
      } else {
        newFavorites.add(tokenIndex);
      }
      
      if (user?.principal) {
        const storageKey = `garage_favorites_${user.principal}`;
        localStorage.setItem(storageKey, JSON.stringify(Array.from(newFavorites)));
      }
      
      return newFavorites;
    });
  };

  // Sort bots: favorites first, then by custom order, then by token index
  const sortedBots = useMemo(() => {
    const botsArray = [...bots];
    
    // Sort by custom order if exists
    if (customOrder.length > 0) {
      botsArray.sort((a, b) => {
        const aIndex = customOrder.indexOf(a.tokenIndex.toString());
        const bIndex = customOrder.indexOf(b.tokenIndex.toString());
        
        // If both have custom order, sort by that
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        // If only one has custom order, it goes first
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        // Otherwise maintain original order
        return 0;
      });
    }
    
    // Favorites always on top
    return botsArray.sort((a, b) => {
      const aFav = favorites.has(a.tokenIndex.toString());
      const bFav = favorites.has(b.tokenIndex.toString());
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
  }, [bots, favorites, customOrder]);

  // Handle drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newBots = [...sortedBots];
    const [draggedBot] = newBots.splice(draggedIndex, 1);
    newBots.splice(dropIndex, 0, draggedBot);
    
    const newOrder = newBots.map(bot => bot.tokenIndex.toString());
    setCustomOrder(newOrder);
    
    if (user?.principal) {
      const orderKey = `garage_order_${user.principal}`;
      localStorage.setItem(orderKey, JSON.stringify(newOrder));
    }
    
    setDraggedIndex(null);
  };

  // Force immediate refetch of bots by invalidating cache
  const refetchBots = () => {
    queryClient.invalidateQueries({ queryKey: ['my-bots'] });
  };

  const error = botsError ? (botsError instanceof Error ? botsError.message : 'Failed to load bots') : null;

  // Get the selected bot
  const selectedBot = selectedBotIndex !== null 
    ? sortedBots.find(b => b.tokenIndex === selectedBotIndex) 
    : null;

  // Auto-select first bot when loaded
  if (sortedBots.length > 0 && selectedBotIndex === null) {
    setSelectedBotIndex(sortedBots[0].tokenIndex);
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">Wasteland Garage</CardTitle>
            <CardDescription>
              Connect your wallet to view and manage your PokedBots
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Wasteland Garage</h1>
          <p className="text-muted-foreground">
            Manage your racing machines. Repair, recharge, and upgrade your bots.
          </p>
        </div>
        <Button onClick={() => refetchBots()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Parts Inventory - Compact */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Parts Inventory</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchInventory()}
              disabled={inventoryLoading}
            >
              <RefreshCw className={`h-3 w-3 ${inventoryLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="font-semibold">{inventory ? Number(inventory.speedChips) : '—'}</span>
              <span className="text-muted-foreground">SPD</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{inventory ? Number(inventory.powerCoreFragments) : '—'}</span>
              <span className="text-muted-foreground">PWR</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{inventory ? Number(inventory.thrusterKits) : '—'}</span>
              <span className="text-muted-foreground">ACC</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{inventory ? Number(inventory.gyroModules) : '—'}</span>
              <span className="text-muted-foreground">STB</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-primary">{inventory ? Number(inventory.universalParts) : '—'}</span>
              <span className="text-primary">Universal</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && bots.length === 0 ? (
        <div className="flex flex-col lg:flex-row gap-6">
          <Card className="w-full lg:w-[480px] shrink-0 animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="flex-1">
            <Card className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                  <div className="h-4 bg-muted rounded w-4/6"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : bots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-lg mb-4">
              No PokedBots found in your wallet
            </p>
            <p className="text-sm text-muted-foreground">
              Purchase bots from the marketplace to get started racing in the wasteland!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Bot List - Responsive */}
          <Card className="w-full lg:w-[480px] shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Your Bots ({bots.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                className="max-h-[calc(100vh-400px)] overflow-y-auto"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
              >
                {sortedBots.map((bot, index) => {
                  const faction = bot.stats?.faction;
                  const factionName = faction ? Object.keys(faction)[0] : 'Unknown';
                  const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(bot.tokenIndex));
                  const imageUrl = `https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=${tokenId}&type=thumbnail`;
                  const isFavorite = favorites.has(bot.tokenIndex.toString());
                  
                  return (
                    <div
                      key={bot.tokenIndex.toString()}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`flex items-center border-b transition-colors ${
                        selectedBotIndex === bot.tokenIndex
                          ? 'bg-primary/10 border-l-4 border-l-primary'
                          : 'hover:bg-muted/50 border-l-4 border-l-transparent'
                      } ${draggedIndex === index ? 'opacity-50' : ''}`}
                    >
                      <div 
                        draggable="true"
                        onDragStart={(e) => {
                          handleDragStart(index);
                        }}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="px-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex items-center"
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <button
                        onClick={() => setSelectedBotIndex(bot.tokenIndex)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="flex-1 text-left px-2 py-3"
                      >
                        <div className="space-y-2">
                          {/* Header with Avatar and Name */}
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={imageUrl} alt={`Bot #${bot.tokenIndex}`} />
                              <AvatarFallback>#{bot.tokenIndex.toString().slice(-2)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate text-sm text-foreground">
                                #{bot.tokenIndex.toString()} {bot.name || 'Unnamed'}
                              </div>
                              <div className="text-xs text-muted-foreground/60 mb-1">{factionName}</div>
                              
                              {bot.stats && (
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Battery className="h-3 w-3" />
                                    <span className="font-mono">{Number(bot.stats.battery)}%</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Wrench className="h-3 w-3" />
                                    <span className="font-mono">{Number(bot.stats.condition)}%</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        
                        {bot.stats ? (
                          <>
                            
                            {/* Cooldowns and Status */}
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const now = Date.now();
                                const rechargeReady = bot.stats.lastRecharged 
                                  ? Number(bot.stats.lastRecharged) / 1_000_000 + (6 * 60 * 60 * 1000)
                                  : 0;
                                const repairReady = bot.stats.lastRepaired
                                  ? Number(bot.stats.lastRepaired) / 1_000_000 + (3 * 60 * 60 * 1000)
                                  : 0;
                                
                                const rechargeTime = bot.stats.lastRecharged 
                                  ? formatTimeRemaining(BigInt(bot.stats.lastRecharged) + 21_600_000_000_000n)
                                  : null;
                                const repairTime = bot.stats.lastRepaired
                                  ? formatTimeRemaining(BigInt(bot.stats.lastRepaired) + 10_800_000_000_000n)
                                  : null;
                                
                                return (
                                  <>
                                    {rechargeReady > now && rechargeTime && (
                                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                                        <Zap className="h-3 w-3" />
                                        {rechargeTime}
                                      </Badge>
                                    )}
                                    {repairReady > now && repairTime && (
                                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                                        <Hammer className="h-3 w-3" />
                                        {repairTime}
                                      </Badge>
                                    )}
                                    {bot.activeUpgrade && (
                                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {Object.keys(bot.activeUpgrade.upgradeType)[0]} {formatTimeRemaining(bot.activeUpgrade.endsAt)}
                                      </Badge>
                                    )}
                                    {bot.activeMission && (
                                      <Badge 
                                        variant={Number(bot.stats.battery) < 30 || Number(bot.stats.condition) < 30 ? "destructive" : "secondary"} 
                                        className="text-xs"
                                      >
                                        {Number(bot.stats.battery) < 30 || Number(bot.stats.condition) < 30 ? '⚠️ ' : ''}Scavenging
                                      </Badge>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-xs">Not Initialized</Badge>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(bot.tokenIndex.toString());
                      }}
                      className="px-3 text-muted-foreground hover:text-yellow-500 transition-colors"
                      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </button>
                  </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Right Panel - Bot Details */}
          <div className="flex-1 min-w-0">
            {selectedBot ? (
              <BotCard bot={selectedBot} onUpdate={() => refetchBots()} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Select a bot from the list to view details
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
