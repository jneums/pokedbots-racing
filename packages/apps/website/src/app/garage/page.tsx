import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useMyBots, useUserInventory, useCollectionBonuses, useUserWalletNFTs, useRechargeBot, useRepairBot, useBatchRechargeBots, useBatchRepairBots, useBatchCompleteScavenging, useBatchStartScavenging, useStarredBots, useSetStarredBots } from '../../hooks/useGarage';
import { useBackgrounds } from '../../hooks/useBackgrounds';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { WalletConnect } from '../../components/WalletConnect';
import { BotCard } from '../../components/BotCard';
import { PartsConverter } from '../../components/PartsConverter';
import { Battery, Wrench, Clock, Zap, Hammer, Star, GripVertical, Plus, ChevronDown, ChevronRight, Search, CheckSquare, Square, Filter, X, MapPin } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { BotListItem } from '@pokedbots-racing/ic-js';
import { Progress } from '../../components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { generatetokenIdentifier, completeScavenging } from '@pokedbots-racing/ic-js';
import { toast } from 'sonner';
import { getTerrainIcon, getTerrainPreference } from '../../lib/utils';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

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

// Format scavenging zone name
function formatScavengingZone(zone: string): string {
  const zoneMap: Record<string, string> = {
    'ScrapHeaps': 'Scrap Heaps',
    'AbandonedSettlements': 'Settlements',
    'DeadMachineFields': 'Machine Fields',
    'RepairBay': 'Repair Bay',
    'ChargingStation': 'Charging Station',
  };
  return zoneMap[zone] || zone;
}

// Get scavenging time remaining text
function getScavengingTimeRemaining(bot: BotListItem): string | null {
  if (!bot.activeMission || !bot.activeMission.durationMinutes || bot.activeMission.durationMinutes.length === 0) {
    return null;
  }
  
  const duration = Number(bot.activeMission.durationMinutes[0]);
  const startTimeMs = Number(bot.activeMission.startTime) / 1_000_000;
  const endTime = startTimeMs + (duration * 60 * 1000);
  const remaining = Math.max(0, endTime - Date.now());
  const remainingMinutes = Math.floor(remaining / 60000);
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;
  
  if (remaining <= 0) return 'Complete!';
  if (remainingHours > 0) return `${remainingHours}h ${remainingMins}m`;
  return `${remainingMins}m`;
}

export default function GaragePage() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBotIndex, setSelectedBotIndex] = useState<bigint | null>(null);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Filter and selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<string>>(new Set());
  const [classFilter, setClassFilter] = useState<string>('all');
  const [factionFilter, setFactionFilter] = useState<string>('all');
  const [terrainFilter, setTerrainFilter] = useState<string>('all');
  const [batteryRange, setBatteryRange] = useState<[number, number]>([0, 100]);
  const [conditionRange, setConditionRange] = useState<[number, number]>([0, 100]);
  
  // Bulk scavenging state
  const [bulkScavengeZone, setBulkScavengeZone] = useState<string>('ScrapHeaps');
  const [bulkScavengeDuration, setBulkScavengeDuration] = useState<number | undefined>(undefined);
  
  // Bulk action mutations
  const rechargeMutation = useRechargeBot();
  const repairMutation = useRepairBot();
  const batchRechargeMutation = useBatchRechargeBots();
  const batchRepairMutation = useBatchRepairBots();
  const batchRecallMutation = useBatchCompleteScavenging();
  const batchScavengeMutation = useBatchStartScavenging();
  
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
  const [groupBy, setGroupBy] = useState<'none' | 'class' | 'terrain' | 'faction'>(() => {
    const saved = localStorage.getItem('garage_group_by');
    // Default: 'class' (grouped by race class)
    return saved ? JSON.parse(saved) : 'class';
  });
  
  // Per-bot loading states (keyed by tokenIndex) - only tracking entering races now
  const [botEnteringRacesStates, setBotEnteringRacesStates] = useState<Map<string, boolean>>(new Map());
  
  // Use React Query hooks - isFetching is true during both initial load and refetch
  const { data: bots = [], isLoading, isFetching, error: botsError } = useMyBots();
  const { data: inventory, isLoading: inventoryLoading, refetch: refetchInventory } = useUserInventory();
  const { data: bonuses, isLoading: bonusesLoading } = useCollectionBonuses();
  const { data: walletNFTs = [], isLoading: walletNFTsLoading, error: walletNFTsError } = useUserWalletNFTs();
  const { data: backgroundData } = useBackgrounds();
  
  // Starred bots from backend
  const { data: starredBotsArray = [], isLoading: starredBotsLoading } = useStarredBots();
  const setStarredBotsMutation = useSetStarredBots();
  
  // Convert array to Set for easy lookup
  const favorites = useMemo(() => new Set(starredBotsArray.map(String)), [starredBotsArray]);
  
  // Use isFetching for loading state (shows on both initial load and manual refetch)
  const loading = isFetching;

  // Load custom order from localStorage (favorites now come from backend)
  useEffect(() => {
    if (user?.principal) {
      const orderKey = `garage_order_${user.principal}`;
      const savedOrder = localStorage.getItem(orderKey);
      
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
    localStorage.setItem('garage_group_by', JSON.stringify(groupBy));
  }, [groupBy]);

  // Toggle favorite - syncs to backend
  const toggleFavorite = async (tokenIndex: string) => {
    const currentFavorites = Array.from(favorites);
    const newFavorites = favorites.has(tokenIndex)
      ? currentFavorites.filter(id => id !== tokenIndex)
      : [...currentFavorites, tokenIndex];
    
    try {
      await setStarredBotsMutation.mutateAsync(newFavorites.map(Number));
    } catch (err) {
      console.error('Failed to update starred bots:', err);
      toast.error('Failed to update favorites');
    }
  };

  // Sort bots: favorites first, then by custom order, then registered, then unregistered
  const sortedBots = useMemo(() => {
    // Start with registered bots
    const botsArray = [...bots];
    
    // Add unregistered bots to the end (filter out already registered ones)
    const registeredTokenIndices = new Set(bots.map(b => Number(b.tokenIndex)));
    
    const unregisteredBots = walletNFTs
      .filter(nft => {
        const isNotRegistered = !nft.isRegistered;
        const notInRegisteredSet = !registeredTokenIndices.has(nft.tokenIndex);
        return isNotRegistered && notInRegisteredSet;
      })
      .map(nft => {
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
    
    const allBots = [...botsArray, ...unregisteredBots];
    
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

  // Apply filters to sorted bots
  const filteredBots = useMemo(() => {
    let filtered = [...sortedBots];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(bot => {
        const name = bot.name?.toLowerCase() || '';
        const index = bot.tokenIndex.toString();
        return name.includes(searchQuery.toLowerCase()) || index.includes(searchQuery);
      });
    }
    
    // Quick filters
    if (activeQuickFilters.has('lowBattery')) {
      filtered = filtered.filter(bot => 
        bot.stats && Number(bot.stats.battery) < 40
      );
    }
    if (activeQuickFilters.has('lowCondition')) {
      filtered = filtered.filter(bot => 
        bot.stats && Number(bot.stats.condition) < 50
      );
    }
    if (activeQuickFilters.has('fullBattery')) {
      filtered = filtered.filter(bot => 
        bot.stats && Number(bot.stats.battery) === 100
      );
    }
    if (activeQuickFilters.has('fullCondition')) {
      filtered = filtered.filter(bot => 
        bot.stats && Number(bot.stats.condition) === 100
      );
    }
    if (activeQuickFilters.has('readyToRace')) {
      filtered = filtered.filter(bot => 
        bot.isInitialized && 
        bot.stats && 
        Number(bot.stats.battery) >= 20 && 
        Number(bot.stats.condition) >= 20 &&
        !bot.activeMission
      );
    }
    if (activeQuickFilters.has('inRaces')) {
      filtered = filtered.filter(bot => 
        bot.upcomingRaces && bot.upcomingRaces.length > 0
      );
    }
    if (activeQuickFilters.has('inNextRace')) {
      // Find the next event (earliest start time) and get all race IDs from that event
      // Events have multiple races (one per class), so we need to group races by start time
      const racesByStartTime = new Map<string, Set<number>>();
      
      for (const bot of sortedBots) {
        if (bot.upcomingRaces && bot.upcomingRaces.length > 0) {
          for (const race of bot.upcomingRaces) {
            const startTimeKey = race.startTime.toString();
            if (!racesByStartTime.has(startTimeKey)) {
              racesByStartTime.set(startTimeKey, new Set());
            }
            racesByStartTime.get(startTimeKey)!.add(Number(race.raceId));
          }
        }
      }
      
      // Find the earliest start time (next event)
      let earliestStartTime: bigint | null = null;
      let nextEventRaceIds: Set<number> | null = null;
      
      for (const [startTimeKey, raceIds] of racesByStartTime.entries()) {
        const startTime = BigInt(startTimeKey);
        if (earliestStartTime === null || startTime < earliestStartTime) {
          earliestStartTime = startTime;
          nextEventRaceIds = raceIds;
        }
      }
      
      // Filter bots that are in ANY race from the next event
      if (nextEventRaceIds !== null && nextEventRaceIds.size > 0) {
        filtered = filtered.filter(bot => 
          bot.upcomingRaces && bot.upcomingRaces.some(race => 
            nextEventRaceIds!.has(Number(race.raceId))
          )
        );
      } else {
        // If no next event found, show no bots
        filtered = [];
      }
    }
    if (activeQuickFilters.has('scavenging')) {
      filtered = filtered.filter(bot => !!bot.activeMission);
    }
    if (activeQuickFilters.has('needsUpgrade')) {
      filtered = filtered.filter(bot => 
        bot.isInitialized && !bot.activeUpgrade
      );
    }
    
    // Class filter
    if (classFilter !== 'all') {
      filtered = filtered.filter(bot => getBotBracket(bot) === classFilter);
    }
    
    // Faction filter
    if (factionFilter !== 'all') {
      filtered = filtered.filter(bot => {
        if (!bot.stats?.faction) return false;
        const factionKey = Object.keys(bot.stats.faction)[0];
        return factionKey === factionFilter;
      });
    }
    
    // Terrain filter (based on background preference)
    if (terrainFilter !== 'all') {
      filtered = filtered.filter(bot => {
        const bg = backgroundData?.backgrounds[bot.tokenIndex.toString()];
        if (!bg || !bot.stats?.faction) return false;
        const factionKey = Object.keys(bot.stats.faction)[0];
        const terrain = getTerrainPreference(bg, factionKey);
        return terrain === terrainFilter;
      });
    }
    
    // Battery range filter (only if not default)
    if (batteryRange[0] !== 0 || batteryRange[1] !== 100) {
      filtered = filtered.filter(bot => {
        if (!bot.stats) return false;
        const battery = Number(bot.stats.battery);
        return battery >= batteryRange[0] && battery <= batteryRange[1];
      });
    }
    
    // Condition range filter (only if not default)
    if (conditionRange[0] !== 0 || conditionRange[1] !== 100) {
      filtered = filtered.filter(bot => {
        if (!bot.stats) return false;
        const condition = Number(bot.stats.condition);
        return condition >= conditionRange[0] && condition <= conditionRange[1];
      });
    }
    
    return filtered;
  }, [sortedBots, searchQuery, activeQuickFilters, classFilter, factionFilter, terrainFilter, batteryRange, conditionRange, backgroundData]);

  // Selection handlers
  const toggleBotSelection = (tokenIndex: string) => {
    setSelectedBots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tokenIndex)) {
        newSet.delete(tokenIndex);
      } else {
        newSet.add(tokenIndex);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    const visibleIndices = filteredBots.map(bot => bot.tokenIndex.toString());
    setSelectedBots(new Set(visibleIndices));
  };

  const deselectAll = () => {
    setSelectedBots(new Set());
  };

  const toggleQuickFilter = (filter: string) => {
    setActiveQuickFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filter)) {
        newSet.delete(filter);
      } else {
        newSet.add(filter);
      }
      return newSet;
    });
  };

  // Bulk actions
  const handleBulkRecharge = async () => {
    const botsToRecharge = filteredBots.filter(bot => 
      selectedBots.has(bot.tokenIndex.toString()) &&
      bot.isInitialized &&
      bot.stats &&
      Number(bot.stats.battery) < 100
    );
    
    if (botsToRecharge.length === 0) {
      toast.info('No bots selected that need recharging');
      return;
    }

    try {
      const tokenIndices = botsToRecharge.map(bot => Number(bot.tokenIndex));
      const results = await batchRechargeMutation.mutateAsync(tokenIndices);
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      results.forEach(item => {
        if (item.result.ok) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`#${item.tokenIndex}: ${item.result.err}`);
        }
      });
      
      refetchBots();
      
      if (errorCount === 0) {
        toast.success(`Successfully recharged ${successCount} bot${successCount > 1 ? 's' : ''}`);
      } else if (successCount > 0) {
        toast.warning(`Recharged ${successCount} bot${successCount > 1 ? 's' : ''}, ${errorCount} failed`, {
          description: errors.slice(0, 3).join(', ')
        });
      } else {
        toast.error(`Failed to recharge bots`, {
          description: errors.slice(0, 3).join(', ')
        });
      }
    } catch (err: any) {
      console.error('Batch recharge failed:', err);
      toast.error(`Failed to recharge bots: ${err.message || 'Unknown error'}`);
    }
  };

  const handleBulkRepair = async () => {
    const botsToRepair = filteredBots.filter(bot => 
      selectedBots.has(bot.tokenIndex.toString()) &&
      bot.isInitialized &&
      bot.stats &&
      Number(bot.stats.condition) < 100
    );
    
    if (botsToRepair.length === 0) {
      toast.info('No bots selected that need repair');
      return;
    }

    try {
      const tokenIndices = botsToRepair.map(bot => Number(bot.tokenIndex));
      const results = await batchRepairMutation.mutateAsync(tokenIndices);
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      results.forEach(item => {
        if (item.result.ok) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`#${item.tokenIndex}: ${item.result.err}`);
        }
      });
      
      refetchBots();
      
      if (errorCount === 0) {
        toast.success(`Successfully repaired ${successCount} bot${successCount > 1 ? 's' : ''}`);
      } else if (successCount > 0) {
        toast.warning(`Repaired ${successCount} bot${successCount > 1 ? 's' : ''}, ${errorCount} failed`, {
          description: errors.slice(0, 3).join(', ')
        });
      } else {
        toast.error(`Failed to repair bots`, {
          description: errors.slice(0, 3).join(', ')
        });
      }
    } catch (err: any) {
      console.error('Batch repair failed:', err);
      toast.error(`Failed to repair bots: ${err.message || 'Unknown error'}`);
    }
  };

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

  // Recall selected scavengers
  const handleBulkRecall = async () => {
    const botsToRecall = filteredBots.filter(bot => 
      selectedBots.has(bot.tokenIndex.toString()) &&
      bot.activeMission
    );
    
    if (botsToRecall.length === 0) {
      toast.info('No scavenging bots selected');
      return;
    }
    
    try {
      const tokenIndices = botsToRecall.map(bot => Number(bot.tokenIndex));
      const results = await batchRecallMutation.mutateAsync(tokenIndices);
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      results.forEach(item => {
        if (item.result.ok) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`#${item.tokenIndex}: ${item.result.err}`);
        }
      });
      
      refetchBots();
      
      if (errorCount === 0) {
        toast.success(`Successfully recalled ${successCount} bot${successCount > 1 ? 's' : ''}`);
      } else if (successCount > 0) {
        toast.warning(`Recalled ${successCount} bot${successCount > 1 ? 's' : ''}, ${errorCount} failed`, {
          description: errors.slice(0, 3).join(', ')
        });
      } else {
        toast.error(`Failed to recall bots`, {
          description: errors.slice(0, 3).join(', ')
        });
      }
    } catch (err: any) {
      console.error('Batch recall failed:', err);
      toast.error(`Failed to recall bots: ${err.message || 'Unknown error'}`);
    }
  };

  // Bulk send bots to scavenge
  const handleBulkScavenge = async () => {
    const botsToScavenge = filteredBots.filter(bot => 
      selectedBots.has(bot.tokenIndex.toString()) &&
      bot.isInitialized &&
      bot.stats &&
      !bot.activeMission
    );
    
    if (botsToScavenge.length === 0) {
      toast.info('No bots selected that can scavenge');
      return;
    }

    try {
      const tokenIndices = botsToScavenge.map(bot => Number(bot.tokenIndex));
      const results = await batchScavengeMutation.mutateAsync({
        tokenIndices,
        zone: bulkScavengeZone,
        durationMinutes: bulkScavengeDuration
      });
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      results.forEach(item => {
        if (item.result.ok) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`#${item.tokenIndex}: ${item.result.err}`);
        }
      });
      
      refetchBots();
      
      if (errorCount === 0) {
        toast.success(`Successfully sent ${successCount} bot${successCount > 1 ? 's' : ''} to ${formatScavengingZone(bulkScavengeZone)}`);
      } else if (successCount > 0) {
        toast.warning(`Sent ${successCount} bot${successCount > 1 ? 's' : ''} to scavenge, ${errorCount} failed`, {
          description: errors.slice(0, 3).join(', ')
        });
      } else {
        toast.error(`Failed to send bots to scavenge`, {
          description: errors.slice(0, 3).join(', ')
        });
      }
    } catch (err: any) {
      console.error('Batch scavenge failed:', err);
      toast.error(`Failed to send bots to scavenge: ${err.message || 'Unknown error'}`);
    }
  };

  const error = botsError ? (botsError instanceof Error ? botsError.message : 'Failed to load bots') : null;

  // Helper: Get next race info including time and terrain
  const getNextRaceInfo = (bot: BotListItem): { time: string; terrain: any } | null => {
    if (!bot.upcomingRaces || bot.upcomingRaces.length === 0) return null;
    
    const nextRace = bot.upcomingRaces.reduce((closest, race) => {
      const raceStart = Number(race.startTime) / 1_000_000;
      const closestStart = Number(closest.startTime) / 1_000_000;
      return raceStart < closestStart ? race : closest;
    });
    
    const timeUntil = (Number(nextRace.startTime) / 1_000_000) - Date.now();
    let timeStr: string;
    if (timeUntil < 0) {
      timeStr = 'Now';
    } else {
      const hours = Math.floor(timeUntil / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 24) timeStr = `${Math.floor(hours / 24)}d`;
      else if (hours > 0) timeStr = `${hours}h ${minutes}m`;
      else timeStr = `${minutes}m`;
    }
    
    return { time: timeStr, terrain: nextRace.terrain };
  };

  // Helper: Get next race start time as relative string (for backwards compatibility)
  const getNextRaceStartTime = (bot: BotListItem): string | null => {
    const info = getNextRaceInfo(bot);
    return info ? info.time : null;
  };

  // Group bots by selected criteria
  const groupedBots = useMemo(() => {
    if (groupBy === 'none') return null;
    
    const groups: Record<string, BotListItem[]> = {};
    
    if (groupBy === 'class') {
      // Group by race class
      groups['SilentKlan'] = [];
      groups['Elite'] = [];
      groups['Raider'] = [];
      groups['Junker'] = [];
      groups['Scrap'] = [];
      groups['Unregistered'] = [];
      
      filteredBots.forEach(bot => {
        const bracket = getBotBracket(bot);
        groups[bracket].push(bot);
      });
    } else if (groupBy === 'terrain') {
      // Group by terrain bonus (derived from background color)
      groups['ScrapHeaps'] = [];
      groups['WastelandSand'] = [];
      groups['MetalRoads'] = [];
      
      filteredBots.forEach(bot => {
        const bg = backgroundData?.backgrounds[bot.tokenIndex.toString()];
        const factionKey = bot.stats?.faction ? Object.keys(bot.stats.faction)[0] : '';
        const terrain = getTerrainPreference(bg, factionKey);
        groups[terrain].push(bot);
      });
    } else if (groupBy === 'faction') {
      // Group by faction
      filteredBots.forEach(bot => {
        if (bot.stats?.faction) {
          const faction = Object.keys(bot.stats.faction)[0];
          if (!groups[faction]) {
            groups[faction] = [];
          }
          groups[faction].push(bot);
        } else {
          if (!groups['None']) {
            groups['None'] = [];
          }
          groups['None'].push(bot);
        }
      });
    }
    
    return groups;
  }, [filteredBots, groupBy]);

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
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, sortedBots]);

  // Update URL when selected bot changes
  useEffect(() => {
    if (selectedBotIndex !== null) {
      const currentBot = searchParams.get('bot');
      const newBot = selectedBotIndex.toString();
      if (currentBot !== newBot) {
        setSearchParams({ bot: newBot }, { replace: true });
      }
    }
    // Remove searchParams from deps to prevent circular loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBotIndex, setSearchParams]);

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
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Wasteland Garage</h1>
        <p className="text-muted-foreground">
          Manage your racing machines. Repair, recharge, and upgrade your bots.
        </p>
      </div>

      {/* Collection Bonuses - Mobile/Tablet View (< xl screens) */}
      <Card className="xl:hidden border-2 border-amber-500/20 bg-card/80 backdrop-blur mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            Collection Bonuses
          </CardTitle>
          <CardDescription className="text-xs">Apply to all your bots</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {bonusesLoading ? (
            <p className="text-muted-foreground">Loading bonuses...</p>
          ) : !bonuses || bots.length === 0 ? (
            <p className="text-muted-foreground">Collect faction bots for bonuses</p>
          ) : (
            <div className="space-y-3">
              {/* Stat Bonuses */}
              {(bonuses.statBonuses.speed !== 0 || bonuses.statBonuses.powerCore !== 0 || 
                bonuses.statBonuses.acceleration !== 0 || bonuses.statBonuses.stability !== 0) && (
                <div className="flex flex-wrap gap-2">
                  {bonuses.statBonuses.speed !== 0 && (
                    <Badge variant="secondary" className="text-xs">
                      🏎️ +{bonuses.statBonuses.speed} SPD
                    </Badge>
                  )}
                  {bonuses.statBonuses.powerCore !== 0 && (
                    <Badge variant="secondary" className="text-xs">
                      ⚡ +{bonuses.statBonuses.powerCore} PWR
                    </Badge>
                  )}
                  {bonuses.statBonuses.acceleration !== 0 && (
                    <Badge variant="secondary" className="text-xs">
                      🚀 +{bonuses.statBonuses.acceleration} ACC
                    </Badge>
                  )}
                  {bonuses.statBonuses.stability !== 0 && (
                    <Badge variant="secondary" className="text-xs">
                      🎯 +{bonuses.statBonuses.stability} STB
                    </Badge>
                  )}
                </div>
              )}

              {/* Economic Bonuses */}
              <div className="flex flex-wrap gap-2">
                {bonuses.costMultipliers.repair < 1 && (
                  <Badge variant="outline" className="text-xs">
                    🔧 -{Math.round((1 - bonuses.costMultipliers.repair) * 100)}% Repair
                  </Badge>
                )}
                {bonuses.costMultipliers.rechargeCooldown < 1 && (
                  <Badge variant="outline" className="text-xs">
                    🔋 -{Math.round((1 - bonuses.costMultipliers.rechargeCooldown) * 100)}% Recharge Time
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column layout: Main content + Sticky sidebar */}
      <div className="flex gap-6">
        {/* Main Content Column */}
        <div className="flex-1 min-w-0">

      {/* Filter and Selection Toolbar */}
      {bots.length > 0 && (
        <Card className="border-2 border-primary/20 bg-card/80 backdrop-blur mb-6">
          <CardContent className="pt-6">
            {/* Search and Selection Mode */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or token number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button
                variant={selectionMode ? "default" : "outline"}
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) {
                    deselectAll();
                  }
                }}
                className="sm:w-auto w-full"
              >
                {selectionMode ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
                {selectionMode ? 'Exit Selection' : 'Select Mode'}
              </Button>
            </div>

            {/* Quick Filters */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-muted-foreground">Quick Filters:</span>
                <Badge
                  variant={activeQuickFilters.has('lowBattery') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('lowBattery')}
                >
                  🔋 Low Battery (&lt;40%)
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('lowCondition') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('lowCondition')}
                >
                  🔧 Low Condition (&lt;50%)
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('readyToRace') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('readyToRace')}
                >
                  ✅ Ready to Race
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('inRaces') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('inRaces')}
                >
                  🏁 In Races
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('scavenging') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('scavenging')}
                >
                  🔍 Scavenging
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('fullBattery') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('fullBattery')}
                >
                  🔋 100% Battery
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('fullCondition') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('fullCondition')}
                >
                  🔧 100% Condition
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('inNextRace') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('inNextRace')}
                >
                  🏁 In Next Race
                </Badge>
                {activeQuickFilters.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveQuickFilters(new Set())}
                    className="h-6 px-2"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Advanced Filters Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-sm"
              >
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </Button>

              {/* Advanced Filters - Collapsible */}
              {showAdvancedFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  {/* Class Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Class</label>
                    <Select value={classFilter} onValueChange={setClassFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        <SelectItem value="SilentKlan">SilentKlan (50+)</SelectItem>
                        <SelectItem value="Elite">Elite (40-49)</SelectItem>
                        <SelectItem value="Raider">Raider (30-39)</SelectItem>
                        <SelectItem value="Junker">Junker (20-29)</SelectItem>
                        <SelectItem value="Scrap">Scrap (0-19)</SelectItem>
                        <SelectItem value="Unregistered">Unregistered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Terrain Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Terrain Bonus</label>
                    <Select value={terrainFilter} onValueChange={setTerrainFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Terrains</SelectItem>
                        <SelectItem value="ScrapHeaps">Scrap Heaps</SelectItem>
                        <SelectItem value="WastelandSand">Wasteland Sand</SelectItem>
                        <SelectItem value="MetalRoads">Metal Roads</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Advanced Filters */}
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setClassFilter('all');
                        setFactionFilter('all');
                        setTerrainFilter('all');
                        setBatteryRange([0, 100]);
                        setConditionRange([0, 100]);
                      }}
                      className="w-full"
                    >
                      Clear Advanced Filters
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Results Summary */}
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredBots.length} of {bots.length} bots
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Action Toolbar - Sticky when in selection mode */}
      {selectionMode && (
        <div className="sticky top-20 z-40 mb-6">
          <Card className="border-2 border-primary bg-card/95 backdrop-blur shadow-lg">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="secondary" className="text-sm font-bold">
                    {selectedBots.size} bot{selectedBots.size > 1 ? 's' : ''} selected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllVisible}
                  >
                    Select All Visible
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAll}
                  >
                    Deselect All
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={handleBulkRecharge}
                    disabled={batchRechargeMutation.isPending}
                  >
                    <Battery className="h-4 w-4 mr-2" />
                    Recharge Selected
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBulkRepair}
                    disabled={batchRepairMutation.isPending}
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Repair Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkRecall}
                    disabled={batchRecallMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Recall Selected
                  </Button>
                </div>
              </div>
              
              {/* Scavenging Controls */}
              <div className="mt-3 pt-3 border-t flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <span className="text-sm font-medium">Send to Scavenge:</span>
                  <Select value={bulkScavengeZone} onValueChange={setBulkScavengeZone}>
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ScrapHeaps">Scrap Heaps (Safe)</SelectItem>
                      <SelectItem value="AbandonedSettlements">Settlements (Moderate)</SelectItem>
                      <SelectItem value="DeadMachineFields">Machine Fields (Dangerous)</SelectItem>
                      <SelectItem value="RepairBay">Repair Bay</SelectItem>
                      <SelectItem value="ChargingStation">Charging Station</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={bulkScavengeDuration?.toString() || "continuous"} 
                    onValueChange={(v) => setBulkScavengeDuration(v === "continuous" ? undefined : parseInt(v))}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continuous">Continuous</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="180">3 hours</SelectItem>
                      <SelectItem value="360">6 hours</SelectItem>
                      <SelectItem value="720">12 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleBulkScavenge}
                    disabled={batchScavengeMutation.isPending}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Send Selected
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Card className="mb-6 border-2 border-destructive bg-card/80 backdrop-blur">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && bots.length === 0 ? (
        <Card className="w-full border-2 border-primary/20 bg-card/80 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="animate-pulse">
                <div className="h-6 bg-muted rounded w-32"></div>
                <div className="h-4 bg-muted rounded w-48 mt-1"></div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Skeleton for grouped bot brackets */}
            {[1, 2, 3].map((bracketIndex) => (
              <div key={bracketIndex} className="mb-4">
                {/* Bracket header skeleton */}
                <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-primary/20 mb-2 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-5 bg-muted rounded-full w-8"></div>
                  </div>
                  <div className="h-4 w-4 bg-muted rounded"></div>
                </div>
                
                {/* Bot items skeleton */}
                <div className="space-y-2">
                  {[1, 2].map((botIndex) => (
                    <div 
                      key={botIndex}
                      className="flex items-center gap-2 p-3 bg-card/50 rounded-lg border border-primary/10 animate-pulse"
                    >
                      {/* Avatar skeleton */}
                      <div className="h-12 w-12 rounded-full bg-muted shrink-0"></div>
                      
                      <div className="flex-1 space-y-2">
                        {/* Name skeleton */}
                        <div className="h-4 bg-muted rounded w-32"></div>
                        {/* Info skeleton */}
                        <div className="flex gap-2">
                          <div className="h-3 bg-muted rounded w-16"></div>
                          <div className="h-3 bg-muted rounded w-20"></div>
                        </div>
                      </div>
                      
                      {/* Buttons skeleton */}
                      <div className="flex gap-1">
                        <div className="h-8 w-8 bg-muted rounded"></div>
                        <div className="h-8 w-8 bg-muted rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
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
        <div className="flex flex-col gap-6">
          {/* Bot List */}
          <Card className="w-full border-2 border-primary/20 bg-card/80 backdrop-blur">
            {/* Compact Parts Inventory Bar - Hidden on xl+ screens (moved to sidebar) */}
            <div className="xl:hidden px-4 py-3 border-b border-primary/20 bg-card/50">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <span className="font-semibold text-muted-foreground">Parts:</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold">{inventory ? Number(inventory.speedChips) : '—'}</span>
                    <span className="text-xs text-muted-foreground">SPD</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold">{inventory ? Number(inventory.powerCoreFragments) : '—'}</span>
                    <span className="text-xs text-muted-foreground">PWR</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold">{inventory ? Number(inventory.thrusterKits) : '—'}</span>
                    <span className="text-xs text-muted-foreground">ACC</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold">{inventory ? Number(inventory.gyroModules) : '—'}</span>
                    <span className="text-xs text-muted-foreground">STB</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-primary">{inventory ? Number(inventory.universalParts) : '—'}</span>
                    <span className="text-xs text-primary">Universal</span>
                  </div>
                </div>
                <PartsConverter 
                  inventory={inventory}
                  identityOrAgent={user?.agent}
                  onConversionComplete={() => {
                    queryClient.invalidateQueries({ queryKey: ['user-inventory'] });
                  }}
                />
              </div>
            </div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Your Bots ({bots.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden sm:inline">Group by:</span>
                  <Select value={groupBy} onValueChange={(value) => setGroupBy(value as 'none' | 'class' | 'terrain' | 'faction')}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Grouping</SelectItem>
                      <SelectItem value="class">Class</SelectItem>
                      <SelectItem value="terrain">Terrain</SelectItem>
                      <SelectItem value="faction">Faction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
              >
                {groupedBots ? (
                  // Grouped view
                  <>
                    {(() => {
                      let globalIndex = 0; // Track global index across all groups
                      return Object.entries(groupedBots).map(([groupName, botsInGroup]) => {
                        if (botsInGroup.length === 0) return null;
                        const isGroupCollapsed = collapsedBrackets.has(groupName);
                        
                        return (
                          <div key={groupName}>
                            {/* Group Header */}
                            <button
                              onClick={() => {
                                setCollapsedBrackets(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(groupName)) {
                                    newSet.delete(groupName);
                                  } else {
                                    newSet.add(groupName);
                                  }
                                  return newSet;
                                });
                              }}
                              className="w-full flex items-center justify-between px-4 py-2 bg-muted/30 hover:bg-muted/50 border-b border-border transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isGroupCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                <span className="font-semibold">{groupName}</span>
                                <Badge variant="secondary" className="text-xs">{botsInGroup.length}</Badge>
                              </div>
                            </button>
                            
                            {/* Bots in Group */}
                            {botsInGroup.map((bot) => {
                              const currentIndex = globalIndex++;
                              if (isGroupCollapsed) return null; // Skip rendering but still increment index
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
                                  onClick={() => {
                                    setSelectedBotIndex(bot.tokenIndex);
                                    // Open sheet on mobile, dialog on desktop
                                    if (window.innerWidth < 1024) {
                                      setMobileSheetOpen(true);
                                    } else {
                                      setDialogOpen(true);
                                    }
                                  }}
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
                                draggable={!selectionMode}
                                onDragStart={() => !selectionMode && handleDragStart(currentIndex)}
                                onDragEnd={handleDragEnd}
                                onDragOver={handleDragOver}
                                onDrop={(e) => !selectionMode && handleDrop(e, currentIndex)}
                                className={`flex items-center border-b transition-colors ${
                                  !selectionMode ? 'cursor-grab active:cursor-grabbing' : ''
                                } ${
                                  selectedBotIndex === bot.tokenIndex
                                    ? 'bg-primary/10 border-l-4 border-l-primary'
                                    : 'hover:bg-muted/50 border-l-4 border-l-transparent'
                                } ${draggedIndex === currentIndex ? 'opacity-50' : ''} relative`}
                              >
                                {/* Selection Checkbox (when in selection mode) */}
                                {selectionMode && (
                                  <div className="px-3" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={selectedBots.has(bot.tokenIndex.toString())}
                                      onCheckedChange={() => toggleBotSelection(bot.tokenIndex.toString())}
                                    />
                                  </div>
                                )}
                                
                                {/* Drag Handle (when not in selection mode) */}
                                {!selectionMode && (
                                  <div className="px-2 text-muted-foreground hover:text-foreground flex items-center">
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                )}
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBotIndex(bot.tokenIndex);
                                    // Open sheet on mobile, dialog on desktop
                                    if (window.innerWidth < 1024) {
                                      setMobileSheetOpen(true);
                                    } else {
                                      setDialogOpen(true);
                                    }
                                  }}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  className="flex-1 text-left px-2 py-4"
                                >
                                  {/* Mobile/Tablet Layout (< md) */}
                                  <div className="md:hidden space-y-2">
                                    {/* Header with Avatar and Name */}
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <Avatar className="h-12 w-12">
                                          <AvatarImage src={imageUrl} alt={`Bot #${bot.tokenIndex}`} />
                                          <AvatarFallback>#{bot.tokenIndex.toString().slice(-2)}</AvatarFallback>
                                        </Avatar>
                                        {(() => {
                                          const raceInfo = getNextRaceInfo(bot);
                                          return raceInfo && (
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-[9px] font-bold shadow-md border border-primary-foreground/20 flex items-center gap-0.5 whitespace-nowrap leading-none">
                                              {getTerrainIcon(raceInfo.terrain)}{raceInfo.time}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold truncate text-sm text-foreground">
                                          #{bot.tokenIndex.toString()} {bot.name || 'Unnamed'}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 min-w-0">
                                          <span className="truncate">{factionName}</span>
                                          {bot.currentStats && bot.maxStats && (
                                            <>
                                              <span className="flex-shrink-0">|</span>
                                              <span className="font-mono flex-shrink-0">{Math.floor((Number(bot.currentStats.speed) + Number(bot.currentStats.powerCore) + Number(bot.currentStats.acceleration) + Number(bot.currentStats.stability)) / 4)}/{Math.floor((Number(bot.maxStats.speed) + Number(bot.maxStats.powerCore) + Number(bot.maxStats.acceleration) + Number(bot.maxStats.stability)) / 4)}</span>
                                            </>
                                          )}
                                        </div>
                                        
                                        {!isCollapsed && bot.stats && (
                                          <>
                                            {/* Stats Row */}
                                            <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
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
                                  
                                    {!isCollapsed && bot.isInitialized && bot.stats && (
                                      <>      
                                        {/* Cooldowns and Status */}
                                        <div className="flex flex-col gap-1">
                                            {(() => {
                                              const now = Date.now();
                                              const rechargeCooldownMs = 6 * 60 * 60 * 1000 * (bonuses?.costMultipliers.rechargeCooldown ?? 1);
                                              const rechargeReady = bot.stats.lastRecharged 
                                                ? Number(bot.stats.lastRecharged) / 1_000_000 + rechargeCooldownMs
                                                : 0;
                                              const repairReady = bot.stats.lastRepaired
                                                ? Number(bot.stats.lastRepaired) / 1_000_000 + (3 * 60 * 60 * 1000)
                                                : 0;
                                              
                                              const rechargeTime = bot.stats.lastRecharged 
                                                ? formatTimeRemaining(BigInt(bot.stats.lastRecharged) + BigInt(Math.round(rechargeCooldownMs * 1_000_000)))
                                                : null;
                                              const repairTime = bot.stats.lastRepaired
                                                ? formatTimeRemaining(BigInt(bot.stats.lastRepaired) + 10_800_000_000_000n)
                                                : null;
                                              
                                              return (
                                                <>
                                                  {rechargeReady > now && rechargeTime && (
                                                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                      <Zap className="h-3 w-3" />
                                                      Recharge: {rechargeTime}
                                                    </Badge>
                                                  )}
                                                  {repairReady > now && repairTime && (
                                                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                      <Hammer className="h-3 w-3" />
                                                      Repair: {repairTime}
                                                    </Badge>
                                                  )}
                                                  {bot.activeUpgrade && (
                                                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                                      <Clock className="h-3 w-3" />
                                                      {getUpgradeDisplayName(Object.keys(bot.activeUpgrade.upgradeType)[0])} Upgrade: {formatTimeRemaining(bot.activeUpgrade.endsAt)}
                                                    </Badge>
                                                  )}
                                                  {bot.activeMission && (() => {
                                                    const zone = Object.keys(bot.activeMission.zone)[0];
                                                    const timeRemaining = getScavengingTimeRemaining(bot);
                                                    return (
                                                      <Badge 
                                                        variant={Number(bot.stats.battery) < 30 || Number(bot.stats.condition) < 30 ? "destructive" : "secondary"} 
                                                        className="text-xs"
                                                      >
                                                        {Number(bot.stats.battery) < 30 || Number(bot.stats.condition) < 30 ? '⚠️ ' : ''}🔍 {formatScavengingZone(zone)}{timeRemaining ? ` • ${timeRemaining}` : ''}
                                                      </Badge>
                                                    );
                                                  })()}
                                                </>
                                              );
                                            })()}
                                        </div>
                                      </>
                                    )}
                                    {!bot.isInitialized && (
                                      <Badge variant="outline" className="text-xs">Not Initialized</Badge>
                                    )}
                                  </div>

                                  {/* Desktop Layout (>= md) */}
                                  <div className="hidden md:flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                      <Avatar className="h-12 w-12">
                                        <AvatarImage src={imageUrl} alt={`Bot #${bot.tokenIndex}`} />
                                        <AvatarFallback>#{bot.tokenIndex.toString().slice(-2)}</AvatarFallback>
                                      </Avatar>
                                      {(() => {
                                        const raceInfo = getNextRaceInfo(bot);
                                        return raceInfo && (
                                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-[9px] font-bold shadow-md border border-primary-foreground/20 flex items-center gap-0.5 whitespace-nowrap leading-none">
                                            {getTerrainIcon(raceInfo.terrain)}{raceInfo.time}
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* Bot Info Column */}
                                    <div className="w-[240px] flex-shrink-0">
                                      <div className="font-semibold truncate text-sm text-foreground">
                                        #{bot.tokenIndex.toString()} {bot.name || 'Unnamed'}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                                        <span className="truncate">{factionName}</span>
                                        {bot.currentStats && bot.maxStats && (
                                          <>
                                            <span className="flex-shrink-0">|</span>
                                            <span className="font-mono flex-shrink-0">{Math.floor((Number(bot.currentStats.speed) + Number(bot.currentStats.powerCore) + Number(bot.currentStats.acceleration) + Number(bot.currentStats.stability)) / 4)}/{Math.floor((Number(bot.maxStats.speed) + Number(bot.maxStats.powerCore) + Number(bot.maxStats.acceleration) + Number(bot.maxStats.stability)) / 4)}</span>
                                          </>
                                        )}
                                      </div>
                                      {/* Stats Strip */}
                                      {bot.stats && bot.currentStats && bot.maxStats && (
                                        <div className="flex items-center gap-2 text-xs mt-1">
                                          <div className="flex items-center gap-0.5">
                                            <span className="text-yellow-500">⚡</span>
                                            <span className="font-mono text-yellow-500">{Number(bot.currentStats.speed)}</span>
                                            <span className="text-muted-foreground/40">/{Number(bot.maxStats.speed)}</span>
                                          </div>
                                          <div className="flex items-center gap-0.5">
                                            <span className="text-orange-500">💪</span>
                                            <span className="font-mono text-orange-500">{Number(bot.currentStats.powerCore)}</span>
                                            <span className="text-muted-foreground/40">/{Number(bot.maxStats.powerCore)}</span>
                                          </div>
                                          <div className="flex items-center gap-0.5">
                                            <span className="text-blue-500">🚀</span>
                                            <span className="font-mono text-blue-500">{Number(bot.currentStats.acceleration)}</span>
                                            <span className="text-muted-foreground/40">/{Number(bot.maxStats.acceleration)}</span>
                                          </div>
                                          <div className="flex items-center gap-0.5">
                                            <span className="text-red-500">🎯</span>
                                            <span className="font-mono text-red-500">{Number(bot.currentStats.stability)}</span>
                                            <span className="text-muted-foreground/40">/{Number(bot.maxStats.stability)}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Middle Section: Cooldowns/Status + Resource Bars */}
                                    <div className="flex-1 min-w-0 flex items-center gap-6">
                                      {/* Cooldown Chips - Stacked Vertically */}
                                      {bot.isInitialized && bot.stats && (
                                        <div className="flex flex-col gap-1">
                                          {(() => {
                                            const now = Date.now();
                                            const rechargeCooldownMs = 6 * 60 * 60 * 1000 * (bonuses?.costMultipliers.rechargeCooldown ?? 1);
                                            const rechargeReady = bot.stats.lastRecharged 
                                              ? Number(bot.stats.lastRecharged) / 1_000_000 + rechargeCooldownMs
                                              : 0;
                                            const repairReady = bot.stats.lastRepaired
                                              ? Number(bot.stats.lastRepaired) / 1_000_000 + (3 * 60 * 60 * 1000)
                                              : 0;
                                            
                                            const rechargeTime = bot.stats.lastRecharged 
                                              ? formatTimeRemaining(BigInt(bot.stats.lastRecharged) + BigInt(Math.round(rechargeCooldownMs * 1_000_000)))
                                              : null;
                                            const repairTime = bot.stats.lastRepaired
                                              ? formatTimeRemaining(BigInt(bot.stats.lastRepaired) + 10_800_000_000_000n)
                                              : null;
                                            
                                            return (
                                              <>
                                                {rechargeReady > now && rechargeTime && (
                                                  <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                                                    <Zap className="h-3 w-3" />
                                                    {rechargeTime}
                                                  </Badge>
                                                )}
                                                {repairReady > now && repairTime && (
                                                  <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                                                    <Hammer className="h-3 w-3" />
                                                    {repairTime}
                                                  </Badge>
                                                )}
                                                {bot.activeUpgrade && (
                                                  <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit">
                                                    <Clock className="h-3 w-3" />
                                                    {getUpgradeDisplayName(Object.keys(bot.activeUpgrade.upgradeType)[0])}: {formatTimeRemaining(bot.activeUpgrade.endsAt)}
                                                  </Badge>
                                                )}
                                                {bot.activeMission && (() => {
                                                  const zone = Object.keys(bot.activeMission.zone)[0];
                                                  const timeRemaining = getScavengingTimeRemaining(bot);
                                                  return (
                                                    <Badge 
                                                      variant={Number(bot.stats.battery) < 30 || Number(bot.stats.condition) < 30 ? "destructive" : "secondary"} 
                                                      className="text-xs w-fit"
                                                    >
                                                      {Number(bot.stats.battery) < 30 || Number(bot.stats.condition) < 30 ? '⚠️ ' : ''}🔍 {formatScavengingZone(zone)}{timeRemaining ? ` • ${timeRemaining}` : ''}
                                                    </Badge>
                                                  );
                                                })()}
                                              </>
                                            );
                                          })()}
                                        </div>
                                      )}

                                      {/* Mini Resource Bars - Stacked Vertically */}
                                      {bot.isInitialized && bot.stats && (
                                        <div className="flex flex-col gap-1.5 ml-auto flex-shrink-0">
                                          {/* Battery Bar */}
                                          <div className="flex items-center gap-1.5">
                                            <Battery className={`h-3.5 w-3.5 ${Number(bot.stats.battery) < 30 ? 'text-destructive' : 'text-blue-500'}`} />
                                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                              <div
                                                className={`h-full transition-all ${Number(bot.stats.battery) < 30 ? 'bg-destructive' : 'bg-blue-500'}`}
                                                style={{ width: `${Number(bot.stats.battery)}%` }}
                                              />
                                            </div>
                                            <span className="text-xs font-mono w-8 text-right">{Number(bot.stats.battery)}%</span>
                                          </div>

                                          {/* Condition Bar */}
                                          <div className="flex items-center gap-1.5">
                                            <Wrench className={`h-3.5 w-3.5 ${Number(bot.stats.condition) < 30 ? 'text-destructive' : 'text-green-500'}`} />
                                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                              <div
                                                className={`h-full transition-all ${Number(bot.stats.condition) < 30 ? 'bg-destructive' : 'bg-green-500'}`}
                                                style={{ width: `${Number(bot.stats.condition)}%` }}
                                              />
                                            </div>
                                            <span className="text-xs font-mono w-8 text-right">{Number(bot.stats.condition)}%</span>
                                          </div>
                                        </div>
                                      )}

                                      {!bot.isInitialized && (
                                        <Badge variant="outline" className="text-xs">Not Initialized</Badge>
                                      )}
                                    </div>
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
                {filteredBots.map((bot, index) => {
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
                        onClick={() => {
                          setSelectedBotIndex(bot.tokenIndex);
                          // Open sheet on mobile, dialog on desktop
                          if (window.innerWidth < 1024) {
                            setMobileSheetOpen(true);
                          } else {
                            setDialogOpen(true);
                          }
                        }}
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
                      draggable={!selectionMode}
                      onDragStart={() => !selectionMode && handleDragStart(index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={(e) => !selectionMode && handleDrop(e, index)}
                      className={`flex items-center border-b transition-colors ${
                        !selectionMode ? 'cursor-grab active:cursor-grabbing' : ''
                      } ${
                        selectedBotIndex === bot.tokenIndex
                          ? 'bg-primary/10 border-l-4 border-l-primary'
                          : 'hover:bg-muted/50 border-l-4 border-l-transparent'
                      } ${draggedIndex === index ? 'opacity-50' : ''} relative`}
                    >
                      {/* Selection Checkbox (when in selection mode) */}
                      {selectionMode && (
                        <div className="px-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedBots.has(bot.tokenIndex.toString())}
                            onCheckedChange={() => toggleBotSelection(bot.tokenIndex.toString())}
                          />
                        </div>
                      )}
                      
                      {/* Drag Handle (when not in selection mode) */}
                      {!selectionMode && (
                        <div className="px-2 text-muted-foreground hover:text-foreground flex items-center">
                          <GripVertical className="h-4 w-4" />
                        </div>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBotIndex(bot.tokenIndex);
                          // Open sheet on mobile, dialog on desktop
                          if (window.innerWidth < 1024) {
                            setMobileSheetOpen(true);
                          } else {
                            setDialogOpen(true);
                          }
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="flex-1 text-left px-2 py-4"
                      >
                        {/* Mobile/Tablet Layout (< md) */}
                        <div className="md:hidden space-y-2">
                          {/* Header with Avatar and Name */}
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={imageUrl} alt={`Bot #${bot.tokenIndex}`} />
                                <AvatarFallback>#{bot.tokenIndex.toString().slice(-2)}</AvatarFallback>
                              </Avatar>
                              {(() => {
                                const raceInfo = getNextRaceInfo(bot);
                                return raceInfo && (
                                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-[9px] font-bold shadow-md border border-primary-foreground/20 flex items-center gap-0.5 whitespace-nowrap leading-none">
                                    {getTerrainIcon(raceInfo.terrain)}{raceInfo.time}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate text-sm text-foreground">
                                #{bot.tokenIndex.toString()} {bot.name || 'Unnamed'}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 min-w-0">
                                <span className="truncate">{factionName}</span>
                                {bot.stats?.eloRating !== undefined && (
                                  <>
                                    <span className="flex-shrink-0">•</span>
                                    <span className="flex-shrink-0">
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
                                  <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
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
                        
                          {!isCollapsed && bot.isInitialized && bot.stats && (
                            <>
                              {/* Cooldowns and Status */}
                              <div className="flex flex-col gap-1">
                                  {(() => {
                                    const now = Date.now();
                                    const rechargeCooldownMs = 6 * 60 * 60 * 1000 * (bonuses?.costMultipliers.rechargeCooldown ?? 1);
                                    const rechargeReady = bot.stats.lastRecharged 
                                      ? Number(bot.stats.lastRecharged) / 1_000_000 + rechargeCooldownMs
                                      : 0;
                                    const repairReady = bot.stats.lastRepaired
                                      ? Number(bot.stats.lastRepaired) / 1_000_000 + (3 * 60 * 60 * 1000)
                                      : 0;
                                    
                                    const rechargeTime = bot.stats.lastRecharged 
                                      ? formatTimeRemaining(BigInt(bot.stats.lastRecharged) + BigInt(Math.round(rechargeCooldownMs * 1_000_000)))
                                      : null;
                                    const repairTime = bot.stats.lastRepaired
                                      ? formatTimeRemaining(BigInt(bot.stats.lastRepaired) + 10_800_000_000_000n)
                                      : null;
                                    
                                    return (
                                      <>
                                        {rechargeReady > now && rechargeTime && (
                                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                                            <Zap className="h-3 w-3" />
                                            Recharge: {rechargeTime}
                                          </Badge>
                                        )}
                                        {repairReady > now && repairTime && (
                                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                                            <Hammer className="h-3 w-3" />
                                            Repair: {repairTime}
                                          </Badge>
                                        )}
                                        {bot.activeUpgrade && (
                                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {getUpgradeDisplayName(Object.keys(bot.activeUpgrade.upgradeType)[0])} Upgrade: {formatTimeRemaining(bot.activeUpgrade.endsAt)}
                                          </Badge>
                                        )}
                                        {bot.activeMission && (() => {
                                          const zone = Object.keys(bot.activeMission.zone)[0];
                                          const timeRemaining = getScavengingTimeRemaining(bot);
                                          return (
                                            <Badge 
                                              variant={Number(bot.stats.battery) < 30 || Number(bot.stats.condition) < 30 ? "destructive" : "secondary"} 
                                              className="text-xs"
                                            >
                                              {Number(bot.stats.battery) < 30 || Number(bot.stats.condition) < 30 ? '⚠️ ' : ''}🔍 {formatScavengingZone(zone)}{timeRemaining ? ` • ${timeRemaining}` : ''}
                                            </Badge>
                                          );
                                        })()}
                                      </>
                                    );
                                  })()}
                              </div>
                            </>
                          )}
                          {!bot.isInitialized && (
                            <Badge variant="outline" className="text-xs">Not Initialized</Badge>
                          )}
                        </div>

                        {/* Desktop Layout (>= md) */}
                        <div className="hidden md:flex items-center gap-4">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={imageUrl} alt={`Bot #${bot.tokenIndex}`} />
                              <AvatarFallback>#{bot.tokenIndex.toString().slice(-2)}</AvatarFallback>
                            </Avatar>
                            {(() => {
                              const raceInfo = getNextRaceInfo(bot);
                              return raceInfo && (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-[9px] font-bold shadow-md border border-primary-foreground/20 flex items-center gap-0.5 whitespace-nowrap leading-none">
                                  {getTerrainIcon(raceInfo.terrain)}{raceInfo.time}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Bot Info Column */}
                          <div className="w-[180px] flex-shrink-0">
                            <div className="font-semibold truncate text-sm text-foreground">
                              #{bot.tokenIndex.toString()} {bot.name || 'Unnamed'}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                              <span className="truncate">{factionName}</span>
                              {bot.stats?.eloRating !== undefined && (
                                <>
                                  <span className="flex-shrink-0">•</span>
                                  <span className="flex-shrink-0">
                                    {(() => {
                                      const rating = bot.maxStats 
                                        ? Math.floor((
                                            Number(bot.maxStats.speed) + 
                                            Number(bot.maxStats.powerCore) + 
                                            Number(bot.maxStats.acceleration) + 
                                            Number(bot.maxStats.stability)
                                          ) / 4)
                                        : 0;
                                      
                                      return rating >= 50 ? 'SilentKlan' :
                                             rating >= 40 ? 'Elite' :
                                             rating >= 30 ? 'Raider' :
                                             rating >= 20 ? 'Junker' : 'Scrap';
                                    })()}
                                  </span>
                                </>
                              )}
                            </div>
                            {/* Stats Strip */}
                            {bot.stats && bot.currentStats && bot.maxStats && (
                              <div className="flex items-center gap-1.5 text-[10px] mt-0.5 opacity-80">
                                <div className="flex items-center gap-0.5">
                                  <span className="text-yellow-500 text-[11px]">⚡</span>
                                  <span className="font-mono text-yellow-500">{Number(bot.currentStats.speed)}</span>
                                  <span className="text-muted-foreground/40">/{Number(bot.maxStats.speed)}</span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <span className="text-orange-500 text-[11px]">💪</span>
                                  <span className="font-mono text-orange-500">{Number(bot.currentStats.powerCore)}</span>
                                  <span className="text-muted-foreground/40">/{Number(bot.maxStats.powerCore)}</span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <span className="text-blue-500 text-[11px]">🚀</span>
                                  <span className="font-mono text-blue-500">{Number(bot.currentStats.acceleration)}</span>
                                  <span className="text-muted-foreground/40">/{Number(bot.maxStats.acceleration)}</span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <span className="text-red-500 text-[11px]">🎯</span>
                                  <span className="font-mono text-red-500">{Number(bot.currentStats.stability)}</span>
                                  <span className="text-muted-foreground/40">/{Number(bot.maxStats.stability)}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Middle Section: Cooldowns/Status + Resource Bars */}
                          <div className="flex-1 min-w-0 flex items-center gap-6">
                            {/* Cooldown Chips - Stacked Vertically */}
                            {bot.isInitialized && bot.stats && (
                              <div className="flex flex-col gap-1">
                                {(() => {
                                  const now = Date.now();
                                  const rechargeCooldownMs = 6 * 60 * 60 * 1000 * (bonuses?.costMultipliers.rechargeCooldown ?? 1);
                                  const rechargeReady = bot.stats.lastRecharged 
                                    ? Number(bot.stats.lastRecharged) / 1_000_000 + rechargeCooldownMs
                                    : 0;
                                  const repairReady = bot.stats.lastRepaired
                                    ? Number(bot.stats.lastRepaired) / 1_000_000 + (3 * 60 * 60 * 1000)
                                    : 0;
                                  
                                  const rechargeTime = bot.stats.lastRecharged 
                                    ? formatTimeRemaining(BigInt(bot.stats.lastRecharged) + BigInt(Math.round(rechargeCooldownMs * 1_000_000)))
                                    : null;
                                  const repairTime = bot.stats.lastRepaired
                                    ? formatTimeRemaining(BigInt(bot.stats.lastRepaired) + 10_800_000_000_000n)
                                    : null;
                                  
                                  return (
                                    <>
                                      {rechargeReady > now && rechargeTime && (
                                        <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                                          <Zap className="h-3 w-3" />
                                          {rechargeTime}
                                        </Badge>
                                      )}
                                      {repairReady > now && repairTime && (
                                        <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                                          <Hammer className="h-3 w-3" />
                                          {repairTime}
                                        </Badge>
                                      )}
                                      {bot.activeUpgrade && (
                                        <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit">
                                          <Clock className="h-3 w-3" />
                                          {getUpgradeDisplayName(Object.keys(bot.activeUpgrade.upgradeType)[0])}: {formatTimeRemaining(bot.activeUpgrade.endsAt)}
                                        </Badge>
                                      )}
                                      {bot.activeMission && (() => {
                                        const zone = Object.keys(bot.activeMission.zone)[0];
                                        const timeRemaining = getScavengingTimeRemaining(bot);
                                        return (
                                          <Badge 
                                            variant={Number(bot.stats.battery) < 30 || Number(bot.stats.condition) < 30 ? "destructive" : "secondary"} 
                                            className="text-xs w-fit"
                                          >
                                            {Number(bot.stats.battery) < 30 || Number(bot.stats.condition) < 30 ? '⚠️ ' : ''}🔍 {formatScavengingZone(zone)}{timeRemaining ? ` • ${timeRemaining}` : ''}
                                          </Badge>
                                        );
                                      })()}
                                    </>
                                  );
                                })()}
                              </div>
                            )}

                            {/* Mini Resource Bars - Stacked Vertically */}
                            {bot.isInitialized && bot.stats && (
                              <div className="flex flex-col gap-1.5 ml-auto flex-shrink-0">
                                {/* Battery Bar */}
                                <div className="flex items-center gap-1.5">
                                  <Battery className={`h-3.5 w-3.5 ${Number(bot.stats.battery) < 30 ? 'text-destructive' : 'text-blue-500'}`} />
                                  <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all ${Number(bot.stats.battery) < 30 ? 'bg-destructive' : 'bg-blue-500'}`}
                                      style={{ width: `${Number(bot.stats.battery)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono w-8 text-right">{Number(bot.stats.battery)}%</span>
                                </div>

                                {/* Condition Bar */}
                                <div className="flex items-center gap-1.5">
                                  <Wrench className={`h-3.5 w-3.5 ${Number(bot.stats.condition) < 30 ? 'text-destructive' : 'text-green-500'}`} />
                                  <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all ${Number(bot.stats.condition) < 30 ? 'bg-destructive' : 'bg-green-500'}`}
                                      style={{ width: `${Number(bot.stats.condition)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono w-8 text-right">{Number(bot.stats.condition)}%</span>
                                </div>
                              </div>
                            )}

                            {!bot.isInitialized && (
                              <Badge variant="outline" className="text-xs">Not Initialized</Badge>
                            )}
                          </div>
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

          {/* Desktop Dialog - Bot Details */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedBot ? `${selectedBot.name || `Bot #${selectedBot.tokenIndex}`}` : 'Bot Details'}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                {selectedBot ? (
                  <BotCard 
                    key={selectedBot.tokenIndex.toString()}
                    bot={selectedBot} 
                    onUpdate={() => refetchBots()}
                    enteringRaces={botEnteringRacesStates.get(selectedBot.tokenIndex.toString()) || false}
                    setEnteringRaces={(val) => setBotEnteringRacesStates(new Map(botEnteringRacesStates.set(selectedBot.tokenIndex.toString(), val)))}
                    rechargeCooldownMultiplier={bonuses?.costMultipliers.rechargeCooldown}
                    backgroundColor={backgroundData?.backgrounds[selectedBot.tokenIndex.toString()]}
                    inventory={inventory}
                  />
                ) : (
                  <p className="text-muted-foreground text-center py-12">
                    Select a bot from the list to view details
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Mobile Sheet - Bot Details */}
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto lg:hidden">
              <SheetHeader>
                <SheetTitle>
                  {selectedBot ? `${selectedBot.name || `Bot #${selectedBot.tokenIndex}`}` : 'Bot Details'}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                {selectedBot ? (
                  <BotCard 
                    key={selectedBot.tokenIndex.toString()}
                    bot={selectedBot} 
                    onUpdate={() => refetchBots()}
                    enteringRaces={botEnteringRacesStates.get(selectedBot.tokenIndex.toString()) || false}
                    setEnteringRaces={(val) => setBotEnteringRacesStates(new Map(botEnteringRacesStates.set(selectedBot.tokenIndex.toString(), val)))}
                    rechargeCooldownMultiplier={bonuses?.costMultipliers.rechargeCooldown}
                    backgroundColor={backgroundData?.backgrounds[selectedBot.tokenIndex.toString()]}
                    inventory={inventory}
                  />
                ) : (
                  <p className="text-muted-foreground text-center py-12">
                    Select a bot from the list to view details
                  </p>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

        </div>
        {/* End Main Content Column */}

        {/* Sticky Sidebar */}
        <div className="hidden xl:block w-80 flex-shrink-0">
          <div className="sticky top-20">
            <Card className="border-2 border-amber-500/20 bg-card/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Garage Overview
                </CardTitle>
                <CardDescription className="text-xs">Your inventory and collection bonuses</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                {bonusesLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : !bonuses || bots.length === 0 ? (
                  <p className="text-muted-foreground">Collect faction bots for bonuses</p>
                ) : (
                  <>
                    {/* Parts Inventory */}
                    <div className="pb-3 border-b border-border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Parts Inventory</h4>
                        <PartsConverter 
                          inventory={inventory}
                          identityOrAgent={user?.agent}
                          onConversionComplete={() => {
                            queryClient.invalidateQueries({ queryKey: ['user-inventory'] });
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between p-1.5 bg-muted/30 rounded">
                          <span className="text-muted-foreground">SPD</span>
                          <span className="font-bold">{inventory ? Number(inventory.speedChips) : '—'}</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 bg-muted/30 rounded">
                          <span className="text-muted-foreground">PWR</span>
                          <span className="font-bold">{inventory ? Number(inventory.powerCoreFragments) : '—'}</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 bg-muted/30 rounded">
                          <span className="text-muted-foreground">ACC</span>
                          <span className="font-bold">{inventory ? Number(inventory.thrusterKits) : '—'}</span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 bg-muted/30 rounded">
                          <span className="text-muted-foreground">STB</span>
                          <span className="font-bold">{inventory ? Number(inventory.gyroModules) : '—'}</span>
                        </div>
                        <div className="col-span-2 flex items-center justify-between p-1.5 bg-primary/10 border border-primary/30 rounded">
                          <span className="text-primary font-medium">Universal</span>
                          <span className="font-bold text-primary">{inventory ? Number(inventory.universalParts) : '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stat Bonuses */}
                    <div className="pb-3 border-b border-border space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">Stat Bonuses</h4>
                      {(bonuses.statBonuses.speed !== 0 || bonuses.statBonuses.powerCore !== 0 || 
                        bonuses.statBonuses.acceleration !== 0 || bonuses.statBonuses.stability !== 0) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {bonuses.statBonuses.speed !== 0 && (
                            <Badge variant="secondary" className="text-xs">
                              🏎️ +{bonuses.statBonuses.speed} SPD
                            </Badge>
                          )}
                          {bonuses.statBonuses.powerCore !== 0 && (
                            <Badge variant="secondary" className="text-xs">
                              ⚡ +{bonuses.statBonuses.powerCore} PWR
                            </Badge>
                          )}
                          {bonuses.statBonuses.acceleration !== 0 && (
                            <Badge variant="secondary" className="text-xs">
                              🚀 +{bonuses.statBonuses.acceleration} ACC
                            </Badge>
                          )}
                          {bonuses.statBonuses.stability !== 0 && (
                            <Badge variant="secondary" className="text-xs">
                              🎯 +{bonuses.statBonuses.stability} STB
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">None</p>
                      )}
                    </div>

                    {/* Economic Bonuses */}
                    <div className="pb-3 border-b border-border space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">Economic Bonuses</h4>
                      {(bonuses.costMultipliers.repair < 1 || bonuses.costMultipliers.rechargeCooldown < 1 || 
                        bonuses.yieldMultipliers.parts > 1 || bonuses.yieldMultipliers.prizes > 1) ? (
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {bonuses.costMultipliers.repair < 1 && (
                            <Badge variant="outline" className="text-xs">
                              🔧 -{Math.round((1 - bonuses.costMultipliers.repair) * 100)}%
                            </Badge>
                          )}
                          {bonuses.costMultipliers.rechargeCooldown < 1 && (
                            <Badge variant="outline" className="text-xs">
                              🔋 -{Math.round((1 - bonuses.costMultipliers.rechargeCooldown) * 100)}%
                            </Badge>
                          )}
                          {bonuses.yieldMultipliers.parts > 1 && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              📦 +{Math.round((bonuses.yieldMultipliers.parts - 1) * 100)}%
                            </Badge>
                          )}
                          {bonuses.yieldMultipliers.prizes > 1 && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              🏆 +{Math.round((bonuses.yieldMultipliers.prizes - 1) * 100)}%
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">None</p>
                      )}
                    </div>

                    {/* Faction Breakdown */}
                    {(() => {
                      const factionCounts = new Map<string, number>();
                      bots.forEach(bot => {
                        if (bot.stats?.faction) {
                          const factionKey = Object.keys(bot.stats.faction)[0];
                          factionCounts.set(factionKey, (factionCounts.get(factionKey) || 0) + 1);
                        }
                      });

                      const factionInfo: Record<string, { thresholds: number[], emoji: string }> = {
                        'UltimateMaster': { thresholds: [1], emoji: '👑' },
                        'Wild': { thresholds: [2], emoji: '🌪️' },
                        'Golden': { thresholds: [2, 3], emoji: '🌟' },
                        'Ultimate': { thresholds: [2, 4, 6], emoji: '⚡' },
                        'Master': { thresholds: [2, 4, 6], emoji: '🎖️' },
                        'Blackhole': { thresholds: [2, 4, 6], emoji: '🌑' },
                        'Dead': { thresholds: [2, 4, 6], emoji: '💀' },
                        'Bee': { thresholds: [2, 4, 6], emoji: '🐝' },
                        'Murder': { thresholds: [2, 4, 6], emoji: '🗡️' },
                        'Box': { thresholds: [2, 4, 6], emoji: '📦' },
                        'Food': { thresholds: [2, 4, 6], emoji: '🍔' },
                        'Game': { thresholds: [2, 4, 6], emoji: '🎮' },
                        'Industrial': { thresholds: [2, 4, 6], emoji: '🏭' },
                        'Animal': { thresholds: [4, 8, 16], emoji: '🦁' }
                      };

                      // Only show owned factions
                      const ownedFactions = Array.from(factionCounts.entries())
                        .sort((a, b) => b[1] - a[1]); // Sort by count descending

                      return (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                            Factions ({factionCounts.size}/14)
                          </h4>
                          {ownedFactions.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                              {ownedFactions.map(([faction, count]) => {
                                const info = factionInfo[faction];
                                if (!info) return null;
                                const maxThreshold = Math.max(...info.thresholds);
                                const isMaxed = count >= maxThreshold;

                                return (
                                  <Link
                                    key={faction}
                                    to={`/marketplace?faction=${faction}`}
                                    className={`block p-1.5 rounded border text-xs transition-all hover:scale-105 ${
                                      isMaxed 
                                        ? 'bg-amber-500/10 border-amber-500/30' 
                                        : 'bg-muted/30 border-border'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1">
                                        {info.emoji} {faction}
                                      </span>
                                      <span className={`font-bold ${isMaxed ? 'text-amber-500' : ''}`}>{count}</span>
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">None</p>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        {/* End Sidebar */}

      </div>
      {/* End Two-column layout */}
    </div>
  );
}
