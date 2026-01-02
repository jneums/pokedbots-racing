import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useMyBots, useUserInventory, useCollectionBonuses, useUserWalletNFTs } from '../../hooks/useGarage';
import { useBackgrounds } from '../../hooks/useBackgrounds';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { WalletConnect } from '../../components/WalletConnect';
import { BotCard } from '../../components/BotCard';
import { PartsConverter } from '../../components/PartsConverter';
import { Battery, Wrench, Clock, Zap, Hammer, Star, GripVertical, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { BotListItem } from '@pokedbots-racing/ic-js';
import { Progress } from '../../components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { generatetokenIdentifier, completeScavenging } from '@pokedbots-racing/ic-js';
import { toast } from 'sonner';

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

// Convert upgrade type to display name
function getUpgradeDisplayName(upgradeType: string): string {
  const nameMap: Record<string, string> = {
    'Velocity': 'Speed',
    'velocity': 'Speed',
    'PowerCore': 'Power',
    'powerCore': 'Power',
    'Thruster': 'Accel',
    'thruster': 'Accel',
    'Gyro': 'Stability',
    'gyro': 'Stability',
  };
  return nameMap[upgradeType] || upgradeType;
}

export default function GaragePage() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBotIndex, setSelectedBotIndex] = useState<bigint | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [recallingAll, setRecallingAll] = useState(false);
  
  // UI state for new features - initialize from localStorage or defaults
  const [collapsedBots, setCollapsedBots] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('garage_collapsed_bots');
    // Default: all bots collapsed
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [collapsedBrackets, setCollapsedBrackets] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('garage_collapsed_brackets');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [groupByBracket, setGroupByBracket] = useState(() => {
    const saved = localStorage.getItem('garage_group_by_bracket');
    // Default: true (grouped by bracket)
    return saved ? JSON.parse(saved) : true;
  });
  
  // Per-bot loading states (keyed by tokenIndex)
  const [botLoadingStates, setBotLoadingStates] = useState<Map<string, boolean>>(new Map());
  const [botRechargingStates, setBotRechargingStates] = useState<Map<string, boolean>>(new Map());
  const [botRepairingStates, setBotRepairingStates] = useState<Map<string, boolean>>(new Map());
  const [botEnteringRacesStates, setBotEnteringRacesStates] = useState<Map<string, boolean>>(new Map());
  
  // Use React Query hooks - isFetching is true during both initial load and refetch
  const { data: bots = [], isLoading, isFetching, error: botsError } = useMyBots();
  const { data: inventory, isLoading: inventoryLoading, refetch: refetchInventory } = useUserInventory();
  const { data: bonuses, isLoading: bonusesLoading } = useCollectionBonuses();
  const { data: walletNFTs = [], isLoading: walletNFTsLoading, error: walletNFTsError } = useUserWalletNFTs();
  const { data: backgroundData } = useBackgrounds();
  
  // Use isFetching for loading state (shows on both initial load and manual refetch)
  const loading = isFetching;

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

  // Set all bots as collapsed by default when they first load (if no saved state)
  useEffect(() => {
    const saved = localStorage.getItem('garage_collapsed_bots');
    if (!saved && bots.length > 0) {
      const allBotIndices = bots.map(bot => bot.tokenIndex.toString());
      setCollapsedBots(new Set(allBotIndices));
      localStorage.setItem('garage_collapsed_bots', JSON.stringify(allBotIndices));
    }
  }, [bots]);

  // Persist UI state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('garage_collapsed_bots', JSON.stringify(Array.from(collapsedBots)));
  }, [collapsedBots]);

  useEffect(() => {
    localStorage.setItem('garage_collapsed_brackets', JSON.stringify(Array.from(collapsedBrackets)));
  }, [collapsedBrackets]);

  useEffect(() => {
    localStorage.setItem('garage_group_by_bracket', JSON.stringify(groupByBracket));
  }, [groupByBracket]);

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

  // Sort bots: favorites first, then by custom order, then registered, then unregistered
  const sortedBots = useMemo(() => {
    console.log('[GaragePage] Starting sortedBots calculation');
    console.log('[GaragePage] Registered bots:', bots.length, bots.map(b => Number(b.tokenIndex)));
    console.log('[GaragePage] Wallet NFTs:', walletNFTs.length, walletNFTs);
    
    // Start with registered bots
    const botsArray = [...bots];
    
    // Add unregistered bots to the end (filter out already registered ones)
    const registeredTokenIndices = new Set(bots.map(b => Number(b.tokenIndex)));
    console.log('[GaragePage] Registered token indices Set:', Array.from(registeredTokenIndices));
    
    const unregisteredBots = walletNFTs
      .filter(nft => {
        const isNotRegistered = !nft.isRegistered;
        const notInRegisteredSet = !registeredTokenIndices.has(nft.tokenIndex);
        console.log(`[GaragePage] Checking NFT ${nft.tokenIndex}: isRegistered=${nft.isRegistered}, inSet=${registeredTokenIndices.has(nft.tokenIndex)}, includeInUnregistered=${isNotRegistered && notInRegisteredSet}`);
        return isNotRegistered && notInRegisteredSet;
      })
      .map(nft => {
        console.log('[GaragePage] Mapping unregistered NFT:', nft.tokenIndex);
        return {
          tokenIndex: BigInt(nft.tokenIndex),
          isInitialized: false,
          name: undefined,
          currentOwner: '',
          stats: undefined,
          currentStats: undefined,
          maxStats: undefined,
          upgradeCostsV2: undefined,
          isListed: false,
          activeUpgrade: undefined,
          activeMission: undefined,
          upcomingRaces: [],
          eligibleRaces: [],
        };
      });
    
    console.log('[GaragePage] Unregistered bots after filtering:', unregisteredBots.length, unregisteredBots.map(b => Number(b.tokenIndex)));
    
    const allBots = [...botsArray, ...unregisteredBots];
    console.log('[GaragePage] All bots combined:', allBots.length, allBots.map(b => ({ tokenIndex: Number(b.tokenIndex), isInitialized: b.isInitialized })));
    
    // Sort by custom order if exists (only for registered bots)
    if (customOrder.length > 0) {
      allBots.sort((a, b) => {
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
    
    // Favorites always on top (only registered bots can be favorited)
    return allBots.sort((a, b) => {
      const aFav = favorites.has(a.tokenIndex.toString());
      const bFav = favorites.has(b.tokenIndex.toString());
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
  }, [bots, walletNFTs, favorites, customOrder]);

  // Handle drag and drop
  const handleDragStart = (index: number) => {
    console.log('[DRAG] Start - dragging index:', index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    console.log('[DRAG] End');
    setDraggedIndex(null);
    setDropTargetIndex(null);
    setDropPosition(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow dropping
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    console.log('[DRAG] Drop on index:', dropIndex, 'draggedIndex:', draggedIndex);
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      console.log('[DRAG] Aborting - no drag or dropped on self');
      setDraggedIndex(null);
      setDropTargetIndex(null);
      setDropPosition(null);
      return;
    }

    // Get mouse position relative to the drop target to determine before/after
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseY = e.clientY;
    const elementMiddle = rect.top + rect.height / 2;
    const dropPosition = mouseY < elementMiddle ? 'before' : 'after';
    
    console.log('[DRAG] Drop position:', dropPosition, 'mouseY:', mouseY, 'middle:', elementMiddle);

    // Calculate insert position BEFORE any array modifications
    let insertIndex = dropIndex;
    if (dropPosition === 'after') {
      insertIndex = dropIndex + 1;
    }
    
    console.log('[DRAG] Insert index (before removal):', insertIndex);

    const newBots = [...sortedBots];
    const [draggedBot] = newBots.splice(draggedIndex, 1);
    console.log('[DRAG] Removed bot from index:', draggedIndex);
    
    // After removal, adjust insert position if it was after the dragged item
    let finalIndex = insertIndex;
    if (insertIndex > draggedIndex) {
      finalIndex = insertIndex - 1;
    }
    
    console.log('[DRAG] Final insert index (after removal adjustment):', finalIndex);
    
    newBots.splice(finalIndex, 0, draggedBot);
    console.log('[DRAG] After insert - array length:', newBots.length);
    console.log('[DRAG] New order:', newBots.map(b => b.tokenIndex.toString()).join(', '));
    
    const newOrder = newBots.map(bot => bot.tokenIndex.toString());
    setCustomOrder(newOrder);
    
    if (user?.principal) {
      const orderKey = `garage_order_${user.principal}`;
      localStorage.setItem(orderKey, JSON.stringify(newOrder));
      console.log('[DRAG] Saved to localStorage');
    }
    
    setDraggedIndex(null);
    setDropTargetIndex(null);
    setDropPosition(null);
  };

  // Force immediate refetch of bots by invalidating cache
  const refetchBots = () => {
    queryClient.invalidateQueries({ queryKey: ['my-bots'] });
    // Also refetch inventory since maintenance affects parts
    queryClient.invalidateQueries({ queryKey: ['user-inventory'] });
  };

  // Recall all scavengers
  const handleRecallAll = async () => {
    if (!user?.agent) return;
    
    const scavengingBots = bots.filter(bot => bot.activeMission);
    if (scavengingBots.length === 0) {
      toast.info('No bots are currently scavenging');
      return;
    }

    setRecallingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const bot of scavengingBots) {
      try {
        await completeScavenging(Number(bot.tokenIndex), user.agent as any);
        successCount++;
      } catch (err) {
        console.error(`Failed to recall bot #${bot.tokenIndex}:`, err);
        errorCount++;
      }
    }

    setRecallingAll(false);
    refetchBots();

    if (errorCount === 0) {
      toast.success(`Successfully recalled ${successCount} bot${successCount > 1 ? 's' : ''}`);
    } else if (successCount > 0) {
      toast.warning(`Recalled ${successCount} bot${successCount > 1 ? 's' : ''}, ${errorCount} failed`);
    } else {
      toast.error(`Failed to recall bots`);
    }
  };

  const error = botsError ? (botsError instanceof Error ? botsError.message : 'Failed to load bots') : null;

  // Helper: Get bracket from bot rating
  const getBotBracket = (bot: BotListItem): string => {
    if (!bot.maxStats) return 'Unregistered';
    const rating = Math.floor((
      Number(bot.maxStats.speed) + Number(bot.maxStats.powerCore) + 
      Number(bot.maxStats.acceleration) + Number(bot.maxStats.stability)
    ) / 4);
    
    return rating >= 50 ? 'SilentKlan' :
           rating >= 40 ? 'Elite' :
           rating >= 30 ? 'Raider' :
           rating >= 20 ? 'Junker' : 'Scrap';
  };

  // Helper: Get next race start time as relative string
  const getNextRaceStartTime = (bot: BotListItem): string | null => {
    if (!bot.upcomingRaces || bot.upcomingRaces.length === 0) return null;
    
    const nextRace = bot.upcomingRaces.reduce((closest, race) => {
      const raceStart = Number(race.startTime) / 1_000_000;
      const closestStart = Number(closest.startTime) / 1_000_000;
      return raceStart < closestStart ? race : closest;
    });
    
    const timeUntil = (Number(nextRace.startTime) / 1_000_000) - Date.now();
    if (timeUntil < 0) return 'Starting now';
    
    const hours = Math.floor(timeUntil / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) return `${Math.floor(hours / 24)}d`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Group bots by bracket
  const groupedBots = useMemo(() => {
    if (!groupByBracket) return null;
    
    const groups: Record<string, BotListItem[]> = {
      'SilentKlan': [], 'Elite': [], 'Raider': [], 'Junker': [], 'Scrap': [], 'Unregistered': []
    };
    
    sortedBots.forEach(bot => {
      const bracket = getBotBracket(bot);
      groups[bracket].push(bot);
    });
    
    return groups;
  }, [sortedBots, groupByBracket]);

  // Get the selected bot
  const selectedBot = selectedBotIndex !== null 
    ? sortedBots.find(b => b.tokenIndex === selectedBotIndex) 
    : null;

  // Initialize selected bot from URL query param (only on mount or when URL/bots change)
  useEffect(() => {
    const botParam = searchParams.get('bot');
    if (botParam && sortedBots.length > 0) {
      const botIndex = BigInt(botParam);
      const botExists = sortedBots.some(b => b.tokenIndex === botIndex);
      if (botExists && selectedBotIndex !== botIndex) {
        setSelectedBotIndex(botIndex);
      } else if (!botExists && sortedBots.length > 0 && selectedBotIndex === null) {
        // Bot from URL doesn't exist, select first bot
        setSelectedBotIndex(sortedBots[0].tokenIndex);
      }
    } else if (!botParam && sortedBots.length > 0 && selectedBotIndex === null) {
      // No URL param, auto-select first bot
      setSelectedBotIndex(sortedBots[0].tokenIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, sortedBots]);

  // Update URL when selected bot changes (user clicks a bot)
  useEffect(() => {
    if (selectedBotIndex !== null) {
      const currentBot = searchParams.get('bot');
      const newBot = selectedBotIndex.toString();
      if (currentBot !== newBot) {
        setSearchParams({ bot: newBot }, { replace: true });
      }
    }
  }, [selectedBotIndex, searchParams, setSearchParams]);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto border-2 border-primary/20 bg-card/80 backdrop-blur">
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
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">Wasteland Garage</h1>
        <p className="text-muted-foreground">
          Manage your racing machines. Repair, recharge, and upgrade your bots.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Parts Inventory */}
        <Card className="border-2 border-primary/20 bg-card/80 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Parts Inventory</CardTitle>
              <PartsConverter 
                inventory={inventory}
                identityOrAgent={user?.agent}
                onConversionComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ['user-inventory'] });
                }}
              />
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

        {/* Collection Bonuses (Faction Synergies) */}
        <Card className="border-2 border-amber-500/20 bg-card/80 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Collection Bonuses
            </CardTitle>
            <CardDescription className="text-xs">Apply to all your bots</CardDescription>
          </CardHeader>
          <CardContent>
            {bonusesLoading ? (
              <p className="text-sm text-muted-foreground">Loading bonuses...</p>
            ) : !bonuses || bots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Collect faction bots for bonuses</p>
            ) : (
              <div className="space-y-2 text-sm">
                {/* Stat Bonuses */}
                {(bonuses.statBonuses.speed !== 0 || bonuses.statBonuses.powerCore !== 0 || 
                  bonuses.statBonuses.acceleration !== 0 || bonuses.statBonuses.stability !== 0) && (
                  <div className="flex flex-wrap gap-2">
                    {bonuses.statBonuses.speed !== 0 && (
                      <Badge variant="secondary" className="text-xs font-semibold">
                        🏎️ +{bonuses.statBonuses.speed} SPD
                      </Badge>
                    )}
                    {bonuses.statBonuses.powerCore !== 0 && (
                      <Badge variant="secondary" className="text-xs font-semibold">
                        ⚡ +{bonuses.statBonuses.powerCore} PWR
                      </Badge>
                    )}
                    {bonuses.statBonuses.acceleration !== 0 && (
                      <Badge variant="secondary" className="text-xs font-semibold">
                        🚀 +{bonuses.statBonuses.acceleration} ACC
                      </Badge>
                    )}
                    {bonuses.statBonuses.stability !== 0 && (
                      <Badge variant="secondary" className="text-xs font-semibold">
                        🎯 +{bonuses.statBonuses.stability} STB
                      </Badge>
                    )}
                  </div>
                )}

                {/* Economic Bonuses */}
                <div className="flex flex-wrap gap-2">
                  {bonuses.costMultipliers.repair < 1 && (
                    <Badge variant="outline" className="text-xs">
                      🔧 -{Math.round((1 - bonuses.costMultipliers.repair) * 100)}% Repairs
                    </Badge>
                  )}
                  {bonuses.costMultipliers.upgrade < 1 && (
                    <Badge variant="outline" className="text-xs">
                      💰 -{Math.round((1 - bonuses.costMultipliers.upgrade) * 100)}% Upgrades
                    </Badge>
                  )}
                  {bonuses.costMultipliers.rechargeCooldown < 1 && (
                    <Badge variant="outline" className="text-xs">
                      ⏱️ -{Math.round((1 - bonuses.costMultipliers.rechargeCooldown) * 100)}% Cooldown
                    </Badge>
                  )}
                  {bonuses.yieldMultipliers.parts > 1 && (
                    <Badge variant="outline" className="text-xs text-green-600">
                      📦 +{Math.round((bonuses.yieldMultipliers.parts - 1) * 100)}% Parts
                    </Badge>
                  )}
                  {bonuses.yieldMultipliers.prizes > 1 && (
                    <Badge variant="outline" className="text-xs text-green-600">
                      🏆 +{Math.round((bonuses.yieldMultipliers.prizes - 1) * 100)}% Prizes
                    </Badge>
                  )}
                  {bonuses.drainMultipliers.scavenging < 1 && (
                    <Badge variant="outline" className="text-xs text-green-600">
                      🛡️ -{Math.round((1 - bonuses.drainMultipliers.scavenging) * 100)}% Drain
                    </Badge>
                  )}
                </div>

                {/* No bonuses message */}
                {bonuses.statBonuses.speed === 0 &&
                 bonuses.statBonuses.powerCore === 0 &&
                 bonuses.statBonuses.acceleration === 0 &&
                 bonuses.statBonuses.stability === 0 &&
                 bonuses.costMultipliers.repair >= 1 &&
                 bonuses.costMultipliers.upgrade >= 1 &&
                 bonuses.costMultipliers.rechargeCooldown >= 1 &&
                 bonuses.yieldMultipliers.parts <= 1 &&
                 bonuses.yieldMultipliers.prizes <= 1 &&
                 bonuses.drainMultipliers.scavenging >= 1 && (
                  <p className="text-xs text-muted-foreground">Collect more faction bots to unlock bonuses</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="mb-6 border-2 border-destructive bg-card/80 backdrop-blur">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && bots.length === 0 ? (
        <div className="flex flex-col lg:flex-row gap-6">
          <Card className="w-full lg:w-[480px] shrink-0 animate-pulse border-2 border-primary/20 bg-card/80 backdrop-blur">
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
      ) : bots.length === 0 && walletNFTs.length === 0 ? (
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
          <Card className="w-full lg:w-[480px] shrink-0 border-2 border-primary/20 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Your Bots ({bots.length})</CardTitle>
                <div className="flex items-center gap-2">
                  {bots.some(bot => bot.activeMission) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRecallAll}
                      disabled={recallingAll}
                    >
                      {recallingAll ? 'Recalling...' : 'Recall All'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGroupByBracket(!groupByBracket)}
                  >
                    {groupByBracket ? 'Ungroup' : 'Group by Bracket'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                className="overflow-y-auto"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
              >
                {groupByBracket && groupedBots ? (
                  // Grouped view by bracket
                  <>
                    {(() => {
                      let globalIndex = 0; // Track global index across all brackets
                      return Object.entries(groupedBots).map(([bracket, botsInBracket]) => {
                        if (botsInBracket.length === 0) return null;
                        const isBracketCollapsed = collapsedBrackets.has(bracket);
                        
                        return (
                          <div key={bracket}>
                            {/* Bracket Header */}
                            <button
                              onClick={() => {
                                setCollapsedBrackets(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(bracket)) {
                                    newSet.delete(bracket);
                                  } else {
                                    newSet.add(bracket);
                                  }
                                  return newSet;
                                });
                              }}
                              className="w-full flex items-center justify-between px-4 py-2 bg-muted/30 hover:bg-muted/50 border-b border-border transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isBracketCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                <span className="font-semibold">{bracket}</span>
                                <Badge variant="secondary" className="text-xs">{botsInBracket.length}</Badge>
                              </div>
                            </button>
                            
                            {/* Bots in Bracket */}
                            {botsInBracket.map((bot) => {
                              const currentIndex = globalIndex++;
                              if (isBracketCollapsed) return null; // Skip rendering but still increment index
                              const isUnregistered = !bot.isInitialized;
                            const faction = bot.stats?.faction;
                            const factionName = faction ? Object.keys(faction)[0] : 'Unknown';
                            const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(bot.tokenIndex));
                            const imageUrl = `https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=${tokenId}&type=thumbnail`;
                            const isFavorite = favorites.has(bot.tokenIndex.toString());
                            const isCollapsed = collapsedBots.has(bot.tokenIndex.toString());
                            
                            // Render unregistered bots differently
                            if (isUnregistered) {
                              const isSelected = selectedBotIndex === bot.tokenIndex;
                              return (
                                <button
                                  key={bot.tokenIndex.toString()}
                                  onClick={() => setSelectedBotIndex(bot.tokenIndex)}
                                  className={`w-full text-left border-b border-dashed border-muted-foreground/20 hover:bg-muted/30 transition-colors ${
                                    isSelected ? 'bg-muted/50 border-l-4 border-l-amber-500' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-4 p-4">
                                    <div className="relative">
                                      <Avatar className="h-16 w-16 border-2 border-dashed border-amber-500/30">
                                        <AvatarImage src={imageUrl} alt={`Bot #${bot.tokenIndex}`} />
                                        <AvatarFallback className="bg-amber-500/10 text-amber-600">
                                          #{bot.tokenIndex.toString().slice(-2)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="absolute -top-1 -right-1 bg-amber-500/20 border border-amber-500/50 rounded-full p-1">
                                        <Plus className="h-3 w-3 text-amber-500" />
                                      </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="font-semibold text-base">
                                          PokedBot #{bot.tokenIndex.toString()}
                                        </p>
                                        <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 bg-amber-500/10">
                                          Unregistered
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        Click to register for racing
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Cost: 0.1 ICP (one-time fee)
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              );
                            }
                            
                            // Render registered bots
                            return (
                              <div
                                key={bot.tokenIndex.toString()}
                                draggable
                                onDragStart={() => handleDragStart(currentIndex)}
                                onDragEnd={handleDragEnd}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, currentIndex)}
                                className={`flex items-center border-b transition-colors cursor-grab active:cursor-grabbing ${
                                  selectedBotIndex === bot.tokenIndex
                                    ? 'bg-primary/10 border-l-4 border-l-primary'
                                    : 'hover:bg-muted/50 border-l-4 border-l-transparent'
                                } ${draggedIndex === currentIndex ? 'opacity-50' : ''} relative`}
                              >
                                <div className="px-2 text-muted-foreground hover:text-foreground flex items-center">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBotIndex(bot.tokenIndex);
                                  }}
                                  onMouseDown={(e) => e.stopPropagation()}
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
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                          <span>{factionName}</span>
                                        </div>
                                        
                                        {!isCollapsed && bot.stats && (
                                          <>
                                            {/* Stats Row */}
                                            <div className="flex items-center gap-2 text-xs mb-1">
                                              <div className="flex items-center gap-0.5">
                                                <span className="text-yellow-500">⚡</span>
                                                <span className="font-mono text-yellow-500">{Number(bot.currentStats?.speed || bot.stats.baseStats.speed)}</span>
                                                <span className="text-muted-foreground/40">/{Number(bot.maxStats?.speed || 24)}</span>
                                              </div>
                                              <div className="flex items-center gap-0.5">
                                                <span className="text-orange-500">💪</span>
                                                <span className="font-mono text-orange-500">{Number(bot.currentStats?.powerCore || bot.stats.baseStats.powerCore)}</span>
                                                <span className="text-muted-foreground/40">/{Number(bot.maxStats?.powerCore || 24)}</span>
                                              </div>
                                              <div className="flex items-center gap-0.5">
                                                <span className="text-blue-500">🚀</span>
                                                <span className="font-mono text-blue-500">{Number(bot.currentStats?.acceleration || bot.stats.baseStats.acceleration)}</span>
                                                <span className="text-muted-foreground/40">/{Number(bot.maxStats?.acceleration || 20)}</span>
                                              </div>
                                              <div className="flex items-center gap-0.5">
                                                <span className="text-red-500">🎯</span>
                                                <span className="font-mono text-red-500">{Number(bot.currentStats?.stability || bot.stats.baseStats.stability)}</span>
                                                <span className="text-muted-foreground/40">/{Number(bot.maxStats?.stability || 23)}</span>
                                              </div>
                                            </div>
                                            {/* Battery and Condition Row */}
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
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  
                                  {!isCollapsed && bot.isInitialized && bot.stats ? (
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
                                              {(() => {
                                                const nextRaceTime = getNextRaceStartTime(bot);
                                                return nextRaceTime && (
                                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                    🏁 {nextRaceTime}
                                                  </Badge>
                                                );
                                              })()}
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
                                                  {getUpgradeDisplayName(Object.keys(bot.activeUpgrade.upgradeType)[0])} {formatTimeRemaining(bot.activeUpgrade.endsAt)}
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
                                  ) : !bot.isInitialized ? (
                                    <Badge variant="outline" className="text-xs">Not Initialized</Badge>
                                  ) : null}
                                </div>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCollapsedBots(prev => {
                                    const newSet = new Set(prev);
                                    const key = bot.tokenIndex.toString();
                                    if (newSet.has(key)) {
                                      newSet.delete(key);
                                    } else {
                                      newSet.add(key);
                                    }
                                    return newSet;
                                  });
                                }}
                                className="px-2 text-muted-foreground hover:text-foreground transition-colors"
                                title={isCollapsed ? 'Expand bot' : 'Collapse bot'}
                              >
                                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                      );
                    });
                    })()}
                  </>
                ) : (
                  // Flat view (original rendering)
                  <>
                {sortedBots.map((bot, index) => {
                  const isUnregistered = !bot.isInitialized;
                  const faction = bot.stats?.faction;
                  const factionName = faction ? Object.keys(faction)[0] : 'Unknown';
                  const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(bot.tokenIndex));
                  const imageUrl = `https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=${tokenId}&type=thumbnail`;
                  const isFavorite = favorites.has(bot.tokenIndex.toString());
                  
                  // Render unregistered bots differently
                  if (isUnregistered) {
                    const isSelected = selectedBotIndex === bot.tokenIndex;
                    return (
                      <button
                        key={bot.tokenIndex.toString()}
                        onClick={() => setSelectedBotIndex(bot.tokenIndex)}
                        className={`w-full text-left border-b border-dashed border-muted-foreground/20 hover:bg-muted/30 transition-colors ${
                          isSelected ? 'bg-muted/50 border-l-4 border-l-amber-500' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4 p-4">
                          <div className="relative">
                            <Avatar className="h-16 w-16 border-2 border-dashed border-amber-500/30">
                              <AvatarImage src={imageUrl} alt={`Bot #${bot.tokenIndex}`} />
                              <AvatarFallback className="bg-amber-500/10 text-amber-600">
                                #{bot.tokenIndex.toString().slice(-2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -top-1 -right-1 bg-amber-500/20 border border-amber-500/50 rounded-full p-1">
                              <Plus className="h-3 w-3 text-amber-500" />
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-base">
                                PokedBot #{bot.tokenIndex.toString()}
                              </p>
                              <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 bg-amber-500/10">
                                Unregistered
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Click to register for racing
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Cost: 0.1 ICP (one-time fee)
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  }
                  
                  // Render registered bots normally
                  const isCollapsed = collapsedBots.has(bot.tokenIndex.toString());
                  
                  return (
                    <div
                      key={bot.tokenIndex.toString()}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`flex items-center border-b transition-colors cursor-grab active:cursor-grabbing ${
                        selectedBotIndex === bot.tokenIndex
                          ? 'bg-primary/10 border-l-4 border-l-primary'
                          : 'hover:bg-muted/50 border-l-4 border-l-transparent'
                      } ${draggedIndex === index ? 'opacity-50' : ''} relative`}
                    >
                      <div className="px-2 text-muted-foreground hover:text-foreground flex items-center">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBotIndex(bot.tokenIndex);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
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
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                <span>{factionName}</span>
                                {bot.stats?.eloRating !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {(() => {
                                        // Calculate overall rating (average of max stats)
                                        const rating = bot.maxStats 
                                          ? Math.floor((
                                              Number(bot.maxStats.speed) + 
                                              Number(bot.maxStats.powerCore) + 
                                              Number(bot.maxStats.acceleration) + 
                                              Number(bot.maxStats.stability)
                                            ) / 4)
                                          : 0;
                                        
                                        // Determine class based on rating (not ELO)
                                        return rating >= 50 ? 'SilentKlan' :
                                               rating >= 40 ? 'Elite' :
                                               rating >= 30 ? 'Raider' :
                                               rating >= 20 ? 'Junker' : 'Scrap';
                                      })()}
                                    </span>
                                  </>
                                )}
                              </div>
                              
                              {!isCollapsed && bot.stats && (
                                <>
                                  {/* Stats Row */}
                                  <div className="flex items-center gap-2 text-xs mb-1">
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-yellow-500">⚡</span>
                                      <span className="font-mono text-yellow-500">{Number(bot.currentStats?.speed || bot.stats.baseStats.speed)}</span>
                                      <span className="text-muted-foreground/40">/{Number(bot.maxStats?.speed || 24)}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-orange-500">💪</span>
                                      <span className="font-mono text-orange-500">{Number(bot.currentStats?.powerCore || bot.stats.baseStats.powerCore)}</span>
                                      <span className="text-muted-foreground/40">/{Number(bot.maxStats?.powerCore || 24)}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-blue-500">🚀</span>
                                      <span className="font-mono text-blue-500">{Number(bot.currentStats?.acceleration || bot.stats.baseStats.acceleration)}</span>
                                      <span className="text-muted-foreground/40">/{Number(bot.maxStats?.acceleration || 20)}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-red-500">🎯</span>
                                      <span className="font-mono text-red-500">{Number(bot.currentStats?.stability || bot.stats.baseStats.stability)}</span>
                                      <span className="text-muted-foreground/40">/{Number(bot.maxStats?.stability || 23)}</span>
                                    </div>
                                  </div>
                                  {/* Battery and Condition Row */}
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
                                </>
                              )}
                            </div>
                          </div>
                        
                        {!isCollapsed && bot.isInitialized && bot.stats ? (
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
                                    {(() => {
                                      const nextRaceTime = getNextRaceStartTime(bot);
                                      return nextRaceTime && (
                                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                                          🏁 {nextRaceTime}
                                        </Badge>
                                      );
                                    })()}
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
                                        {getUpgradeDisplayName(Object.keys(bot.activeUpgrade.upgradeType)[0])} {formatTimeRemaining(bot.activeUpgrade.endsAt)}
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
                        ) : !bot.isInitialized ? (
                          <Badge variant="outline" className="text-xs">Not Initialized</Badge>
                        ) : null}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCollapsedBots(prev => {
                          const newSet = new Set(prev);
                          const key = bot.tokenIndex.toString();
                          if (newSet.has(key)) {
                            newSet.delete(key);
                          } else {
                            newSet.add(key);
                          }
                          return newSet;
                        });
                      }}
                      className="px-2 text-muted-foreground hover:text-foreground transition-colors"
                      title={isCollapsed ? 'Expand bot' : 'Collapse bot'}
                    >
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Panel - Bot Details */}
          <div className="flex-1 min-w-0">
            {selectedBot ? (
              <BotCard 
                bot={selectedBot} 
                onUpdate={() => refetchBots()}
                loading={botLoadingStates.get(selectedBot.tokenIndex.toString()) || false}
                setLoading={(val) => setBotLoadingStates(new Map(botLoadingStates.set(selectedBot.tokenIndex.toString(), val)))}
                recharging={botRechargingStates.get(selectedBot.tokenIndex.toString()) || false}
                setRecharging={(val) => setBotRechargingStates(new Map(botRechargingStates.set(selectedBot.tokenIndex.toString(), val)))}
                repairing={botRepairingStates.get(selectedBot.tokenIndex.toString()) || false}
                setRepairing={(val) => setBotRepairingStates(new Map(botRepairingStates.set(selectedBot.tokenIndex.toString(), val)))}
                enteringRaces={botEnteringRacesStates.get(selectedBot.tokenIndex.toString()) || false}
                setEnteringRaces={(val) => setBotEnteringRacesStates(new Map(botEnteringRacesStates.set(selectedBot.tokenIndex.toString(), val)))}
                rechargeCooldownMultiplier={bonuses?.costMultipliers.rechargeCooldown}
                backgroundColor={backgroundData?.backgrounds[selectedBot.tokenIndex.toString()]}
                inventory={inventory}
              />
            ) : (
              <Card className="border-2 border-primary/20 bg-card/80 backdrop-blur">
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
