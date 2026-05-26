import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useMyBots, useUserInventory, useCollectionBonuses, useGaragePowerStatus, useUserSMRs, useUserWalletNFTs, useRechargeBot, useRepairBot, useBatchRechargeBots, useBatchRepairBots, useBatchCompleteScavenging, useBatchStartScavenging, useStarredBots, useSetStarredBots, useRacerBots, useSetRacerBots, useScavengerBots, useSetScavengerBots, useBatchDedicationInfo, usePurchaseSMR } from '../../hooks/useGarage';
import { useGetUpcomingEventsWithRaces } from '../../hooks/useRacing';
import { useBackgrounds } from '../../hooks/useBackgrounds';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';
import { WalletConnect } from '../../components/WalletConnect';
import { BotCard } from '../../components/BotCard';
import { StarterBotPanel } from '../../components/StarterBotPanel';
import { PartsConverter } from '../../components/PartsConverter';
import { PartsPurchase } from '../../components/PartsPurchase';
import { BatteryPanel } from '../../components/BatteryPanel';
import { RepairBayPanel } from '../../components/RepairBayPanel';
import { Battery, Wrench, Clock, Zap, Hammer, Star, GripVertical, Plus, ChevronDown, ChevronRight, Search, CheckSquare, Square, Filter, X, MapPin, RefreshCw, Flame } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { BotListItem, BatchDedicationInfo } from '@pokedbots-racing/ic-js';
import { Progress } from '../../components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { completeScavenging } from '@pokedbots-racing/ic-js';
import { toast } from 'sonner';
import { getTerrainIcon, getTerrainPreference, getFactionSpecialTerrain } from '../../lib/utils';
import { getBotAvatarUrl } from '../../lib/botAvatar';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { SMRPurchaseDialog, SMR_TIERS, type SMRTier } from '../../components/SMRPurchaseDialog';
import { Radiation } from 'lucide-react';

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
    'ChargingStation': 'Charging',
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

// Component for cooldown badges that includes dedication bonuses
function BotCooldownBadges({ 
  bot, 
  garageCooldownMult, 
  powerStatus,
  dedicationInfo,
  showLabel = true 
}: { 
  bot: BotListItem; 
  garageCooldownMult: number;
  powerStatus: { efficiency: number } | null | undefined;
  dedicationInfo: BatchDedicationInfo | undefined;
  showLabel?: boolean;
}) {
  if (!bot.isInitialized || !bot.stats) return null;
  
  const now = Date.now();
  const dedicationRechargeMult = dedicationInfo?.benefits.rechargeCooldownMult ?? 1.0;
  const dedicationRepairMult = dedicationInfo?.benefits.repairCooldownMult ?? 1.0;
  
  const rechargeCooldownMs = 2 * 60 * 60 * 1000 * garageCooldownMult * dedicationRechargeMult;
  const repairCooldownMs = 1 * 60 * 60 * 1000 * dedicationRepairMult; // Repair base is 1 hour
  
  const rechargeReady = bot.stats.lastRecharged 
    ? Number(bot.stats.lastRecharged) / 1_000_000 + rechargeCooldownMs
    : 0;
  const repairReady = bot.stats.lastRepaired
    ? Number(bot.stats.lastRepaired) / 1_000_000 + repairCooldownMs
    : 0;
  
  const rechargeTime = bot.stats.lastRecharged 
    ? formatTimeRemaining(BigInt(bot.stats.lastRecharged) + BigInt(Math.round(rechargeCooldownMs * 1_000_000)))
    : null;
  const repairTime = bot.stats.lastRepaired
    ? formatTimeRemaining(BigInt(bot.stats.lastRepaired) + BigInt(Math.round(repairCooldownMs * 1_000_000)))
    : null;
  
  return (
    <>
      {rechargeReady > now && rechargeTime && (
        <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
          <Zap className="h-3 w-3" />
          {showLabel && 'Recharge: '}{rechargeTime}
        </Badge>
      )}
      {repairReady > now && repairTime && (
        <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
          <Hammer className="h-3 w-3" />
          {showLabel && 'Repair: '}{repairTime}
        </Badge>
      )}
      {bot.activeUpgrade && (
        <Badge variant="secondary" className={`text-xs flex items-center gap-1 ${showLabel ? '' : 'w-fit'}`}>
          <Clock className="h-3 w-3" />
          {getUpgradeDisplayName(Object.keys(bot.activeUpgrade.upgradeType)[0])}{showLabel ? ' Upgrade: ' : ': '}{formatTimeRemaining(bot.activeUpgrade.endsAt)}
        </Badge>
      )}
      {bot.activeMission && (() => {
        const zone = Object.keys(bot.activeMission.zone)[0];
        const timeRemaining = getScavengingTimeRemaining(bot);
        const isCharging = zone === 'ChargingStation';
        const isThrottled = isCharging && powerStatus && powerStatus.efficiency < 1;
        const isLowStats = Number(bot.stats!.battery) < 30 || Number(bot.stats!.condition) < 30;
        return (
          <Badge 
            variant={isLowStats ? "destructive" : isThrottled ? "outline" : "secondary"} 
            className={`text-xs ${isThrottled ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : ''} ${showLabel ? '' : 'w-fit'}`}
          >
            {isLowStats ? '⚠️ ' : isThrottled ? '⚡ ' : ''}
            {isCharging ? '🔋' : '🔍'} {formatScavengingZone(zone)}
            {isThrottled && ` ${Math.round(powerStatus!.efficiency * 100)}%`}
            {timeRemaining ? ` • ${timeRemaining}` : ''}
          </Badge>
        );
      })()}
    </>
  );
}

export default function GaragePage() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBotIndex, setSelectedBotIndex] = useState<bigint | null>(null);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [smrDialogOpen, setSmrDialogOpen] = useState(false);
  
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
  const [bulkScavengeZone, setBulkScavengeZone] = useState<string>('ChargingStation');
  const [bulkScavengeDuration, setBulkScavengeDuration] = useState<number | undefined>(undefined);
  
  // Confirmation dialog state for bulk actions
  const [showRechargeConfirm, setShowRechargeConfirm] = useState(false);
  const [showRepairConfirm, setShowRepairConfirm] = useState(false);
  const [pendingRechargeCount, setPendingRechargeCount] = useState(0);
  const [pendingRepairCount, setPendingRepairCount] = useState(0);
  
  // Manual refresh state
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  
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
  const [groupBy, setGroupBy] = useState<'none' | 'class' | 'terrain' | 'faction' | 'role'>(() => {
    const saved = localStorage.getItem('garage_group_by');
    // Default: 'class' (grouped by race class)
    return saved ? JSON.parse(saved) : 'class';
  });
  const [orderBy, setOrderBy] = useState<'rating' | 'tokenIndex' | 'winRate' | 'condition' | 'battery'>(() => {
    const saved = localStorage.getItem('garage_order_by');
    // Default: 'rating' (sorted by overall rating)
    return saved ? JSON.parse(saved) : 'rating';
  });
  
  // Per-bot loading states (keyed by tokenIndex)
  const [botEnteringRacesStates, setBotEnteringRacesStates] = useState<Map<string, boolean>>(new Map());
  const [botStarringStates, setBotStarringStates] = useState<Map<string, boolean>>(new Map());
  
  // Use React Query hooks - isFetching is true during both initial load and refetch
  const { data: bots = [], isLoading, isFetching, error: botsError, refetch: refetchBotsList } = useMyBots();
  const { data: inventory, isLoading: inventoryLoading, refetch: refetchInventory } = useUserInventory();
  const { data: bonuses, isLoading: bonusesLoading } = useCollectionBonuses();
  const { data: powerStatus, isLoading: powerStatusLoading } = useGaragePowerStatus();
  const { data: userSMRs } = useUserSMRs();
  const { data: walletNFTs = [], isLoading: walletNFTsLoading, error: walletNFTsError } = useUserWalletNFTs();
  const { data: backgroundData } = useBackgrounds();
  const { data: upcomingEvents = [] } = useGetUpcomingEventsWithRaces(7); // Next 7 days
  
  // SMR purchase mutation
  const purchaseSMRMutation = usePurchaseSMR();
  
  // Batch fetch dedication info for all bots
  const botTokenIndices = useMemo(() => bots.map(b => Number(b.tokenIndex)), [bots]);
  const { data: dedicationInfoMap } = useBatchDedicationInfo(botTokenIndices);
  
  // Starred bots from backend
  const { data: starredBotsArray = [], isLoading: starredBotsLoading } = useStarredBots();
  const setStarredBotsMutation = useSetStarredBots();
  
  // Convert array to Set for easy lookup
  const favorites = useMemo(() => new Set(starredBotsArray.map(String)), [starredBotsArray]);
  
  // Racer and Scavenger bot tags from backend
  const { data: racerBotsArray = [] } = useRacerBots();
  const setRacerBotsMutation = useSetRacerBots();
  const { data: scavengerBotsArray = [] } = useScavengerBots();
  const setScavengerBotsMutation = useSetScavengerBots();
  
  // Convert arrays to Sets for easy lookup
  const racerBots = useMemo(() => new Set(racerBotsArray.map(String)), [racerBotsArray]);
  const scavengerBots = useMemo(() => new Set(scavengerBotsArray.map(String)), [scavengerBotsArray]);
  
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

  useEffect(() => {
    localStorage.setItem('garage_order_by', JSON.stringify(orderBy));
  }, [orderBy]);

  // Toggle favorite - syncs to backend
  const toggleFavorite = async (tokenIndex: string) => {
    // Prevent multiple concurrent requests for the same bot
    if (botStarringStates.get(tokenIndex)) return;
    
    setBotStarringStates(prev => new Map(prev).set(tokenIndex, true));
    
    const currentFavorites = Array.from(favorites);
    const newFavorites = favorites.has(tokenIndex)
      ? currentFavorites.filter(id => id !== tokenIndex)
      : [...currentFavorites, tokenIndex];
    
    try {
      await setStarredBotsMutation.mutateAsync(newFavorites.map(Number));
    } catch (err) {
      console.error('Failed to update starred bots:', err);
      toast.error('Failed to update favorites');
    } finally {
      setBotStarringStates(prev => {
        const newMap = new Map(prev);
        newMap.delete(tokenIndex);
        return newMap;
      });
    }
  };

  // Toggle racer role - syncs to backend
  const toggleRacer = async (tokenIndex: string) => {
    const currentRacers = Array.from(racerBots);
    const newRacers = racerBots.has(tokenIndex)
      ? currentRacers.filter(id => id !== tokenIndex)
      : [...currentRacers, tokenIndex];
    
    try {
      await setRacerBotsMutation.mutateAsync(newRacers.map(Number));
    } catch (err) {
      console.error('Failed to update racer bots:', err);
      toast.error('Failed to update racer tag');
    }
  };

  // Toggle scavenger role - syncs to backend
  const toggleScavenger = async (tokenIndex: string) => {
    const currentScavengers = Array.from(scavengerBots);
    const newScavengers = scavengerBots.has(tokenIndex)
      ? currentScavengers.filter(id => id !== tokenIndex)
      : [...currentScavengers, tokenIndex];
    
    try {
      await setScavengerBotsMutation.mutateAsync(newScavengers.map(Number));
    } catch (err) {
      console.error('Failed to update scavenger bots:', err);
      toast.error('Failed to update scavenger tag');
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
      // Find bots registered for the next upcoming event
      // Events have registrations that include tokenIndex and owner
      if (!user?.principal || !upcomingEvents || upcomingEvents.length === 0) {
        filtered = [];
      } else {
        // Find the next event (earliest scheduledTime that's in the future)
        const nowNanos = BigInt(Date.now()) * 1_000_000n;
        const futureEvents = upcomingEvents.filter(eventData => 
          BigInt(eventData.event.scheduledTime) > nowNanos
        );
        
        if (futureEvents.length === 0) {
          filtered = [];
        } else {
          // Sort by scheduledTime to find the next event
          const nextEvent = futureEvents.reduce((earliest, eventData) => {
            const eventTime = BigInt(eventData.event.scheduledTime);
            const earliestTime = BigInt(earliest.event.scheduledTime);
            return eventTime < earliestTime ? eventData : earliest;
          });
          
          // Get all registered token indices for this event
          const registeredTokens = new Set<number>();
          if (nextEvent.event.registrations) {
            for (const reg of nextEvent.event.registrations) {
              registeredTokens.add(Number(reg.tokenIndex));
            }
          }
          
          // Filter bots that are registered for the next event
          if (registeredTokens.size > 0) {
            filtered = filtered.filter(bot => 
              registeredTokens.has(Number(bot.tokenIndex))
            );
          } else {
            filtered = [];
          }
        }
      }
    }
    if (activeQuickFilters.has('scavenging')) {
      filtered = filtered.filter(bot => {
        if (!bot.activeMission) return false;
        const zone = Object.keys(bot.activeMission.zone)[0];
        // Exclude maintenance zones (RepairBay, ChargingStation)
        return zone !== 'RepairBay' && zone !== 'ChargingStation';
      });
    }
    if (activeQuickFilters.has('repairBay')) {
      filtered = filtered.filter(bot => {
        if (!bot.activeMission) return false;
        const zone = Object.keys(bot.activeMission.zone)[0];
        return zone === 'RepairBay';
      });
    }
    if (activeQuickFilters.has('chargingStation')) {
      filtered = filtered.filter(bot => {
        if (!bot.activeMission) return false;
        const zone = Object.keys(bot.activeMission.zone)[0];
        return zone === 'ChargingStation';
      });
    }
    if (activeQuickFilters.has('favorited')) {
      filtered = filtered.filter(bot => favorites.has(bot.tokenIndex.toString()));
    }
    if (activeQuickFilters.has('racers')) {
      filtered = filtered.filter(bot => racerBots.has(bot.tokenIndex.toString()));
    }
    if (activeQuickFilters.has('scavengers')) {
      filtered = filtered.filter(bot => scavengerBots.has(bot.tokenIndex.toString()));
    }
    if (activeQuickFilters.has('needsBattery')) {
      filtered = filtered.filter(bot => 
        bot.stats && Number(bot.stats.battery) < 100
      );
    }
    if (activeQuickFilters.has('needsCondition')) {
      filtered = filtered.filter(bot => 
        bot.stats && Number(bot.stats.condition) < 100
      );
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
  }, [sortedBots, searchQuery, activeQuickFilters, classFilter, factionFilter, terrainFilter, batteryRange, conditionRange, backgroundData, favorites, upcomingEvents, user]);

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

  // Bulk actions - show confirmation dialog
  const handleBulkRechargeClick = () => {
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
    
    setPendingRechargeCount(botsToRecharge.length);
    setShowRechargeConfirm(true);
  };
  
  const handleBulkRecharge = async () => {
    setShowRechargeConfirm(false);
    
    const botsToRecharge = filteredBots.filter(bot => 
      selectedBots.has(bot.tokenIndex.toString()) &&
      bot.isInitialized &&
      bot.stats &&
      Number(bot.stats.battery) < 100
    );
    
    if (botsToRecharge.length === 0) {
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

  const handleBulkRepairClick = () => {
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
    
    setPendingRepairCount(botsToRepair.length);
    setShowRepairConfirm(true);
  };
  
  const handleBulkRepair = async () => {
    setShowRepairConfirm(false);
    
    const botsToRepair = filteredBots.filter(bot => 
      selectedBots.has(bot.tokenIndex.toString()) &&
      bot.isInitialized &&
      bot.stats &&
      Number(bot.stats.condition) < 100
    );
    
    if (botsToRepair.length === 0) {
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
    queryClient.invalidateQueries({ queryKey: ['my-bots'], refetchType: 'all' });
    // Also refetch inventory since maintenance affects parts
    queryClient.invalidateQueries({ queryKey: ['user-inventory'], refetchType: 'all' });
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

  // Helper: Get next event info for a bot - considers BOTH upcoming races AND event registrations, returns earliest
  const getNextEventInfo = (bot: BotListItem): { time: string; terrain: any; eventName: string } | null => {
    const now = Date.now();
    
    // Helper to format time until
    const formatTimeUntil = (timeUntilMs: number): string => {
      if (timeUntilMs < 0) return 'Now';
      const hours = Math.floor(timeUntilMs / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilMs % (1000 * 60 * 60)) / (1000 * 60));
      if (hours > 24) return `${Math.floor(hours / 24)}d`;
      else if (hours > 0) return `${hours}h ${minutes}m`;
      else return `${minutes}m`;
    };
    
    // Candidate from upcoming races (already created)
    let raceCandidate: { timeMs: number; terrain: any; eventName: string } | null = null;
    if (bot.upcomingRaces && bot.upcomingRaces.length > 0) {
      // Filter to races that are in the future OR started within the last 5 minutes (currently racing)
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      const relevantRaces = bot.upcomingRaces.filter(race => {
        const raceTimeMs = Number(race.startTime) / 1_000_000;
        return raceTimeMs > fiveMinutesAgo; // Include races that started up to 5 min ago
      });
      if (relevantRaces.length > 0) {
        const nextRace = relevantRaces.reduce((closest, race) => {
          return Number(race.startTime) < Number(closest.startTime) ? race : closest;
        });
        const raceTimeMs = Number(nextRace.startTime) / 1_000_000;
        raceCandidate = { timeMs: raceTimeMs, terrain: nextRace.terrain, eventName: nextRace.name };
      }
    }
    
    // Candidate from event registrations (races not yet created)
    let eventCandidate: { timeMs: number; terrain: any; eventName: string } | null = null;
    if (user?.principal && upcomingEvents && upcomingEvents.length > 0) {
      const registeredEvents = upcomingEvents.filter(eventData => 
        eventData.event.registrations?.some((reg: any) => 
          reg.tokenIndex === bot.tokenIndex && 
          reg.owner.toString() === user.principal
        )
      );
      
      if (registeredEvents.length > 0) {
        // Find the event with the earliest FUTURE time
        // Use nextRaceStartTime if available (for multi-stage events), otherwise scheduledTime
        let bestEvent: { eventData: typeof registeredEvents[0]; timeMs: number } | null = null;
        
        for (const eventData of registeredEvents) {
          let eventTimeMs: number;
          
          // Check if there's a nextRaceStartTime from race summary (for multi-stage events)
          const nextRaceStartTime = eventData.raceSummary?.nextRaceStartTime;
          if (nextRaceStartTime && nextRaceStartTime.length > 0) {
            eventTimeMs = Number(nextRaceStartTime[0]) / 1_000_000;
          } else {
            eventTimeMs = Number(eventData.event.scheduledTime) / 1_000_000;
          }
          
          // Include if in the future OR started within the last 5 minutes (currently racing)
          const fiveMinutesAgoForEvents = now - (5 * 60 * 1000);
          if (eventTimeMs > fiveMinutesAgoForEvents) {
            if (!bestEvent || eventTimeMs < bestEvent.timeMs) {
              bestEvent = { eventData, timeMs: eventTimeMs };
            }
          }
        }
        
        if (bestEvent) {
          // Get terrain from race creation mode
          let terrain: any = { ScrapHeaps: null };
          if ('Automatic' in bestEvent.eventData.event.raceCreationMode) {
            const terrains = bestEvent.eventData.event.raceCreationMode.Automatic.terrains;
            if (terrains && terrains.length > 0) terrain = terrains[0];
          } else if ('Manual' in bestEvent.eventData.event.raceCreationMode) {
            const templates = bestEvent.eventData.event.raceCreationMode.Manual.raceTemplates;
            if (templates && templates.length > 0 && templates[0].terrain) terrain = templates[0].terrain;
          }
          
          eventCandidate = { 
            timeMs: bestEvent.timeMs, 
            terrain, 
            eventName: bestEvent.eventData.event.metadata?.name || 'Event' 
          };
        }
      }
    }
    
    // Pick the earliest of the two candidates
    let winner: { timeMs: number; terrain: any; eventName: string } | null = null;
    if (raceCandidate && eventCandidate) {
      winner = raceCandidate.timeMs <= eventCandidate.timeMs ? raceCandidate : eventCandidate;
    } else {
      winner = raceCandidate || eventCandidate;
    }
    
    if (!winner) return null;
    
    return { 
      time: formatTimeUntil(winner.timeMs - now), 
      terrain: winner.terrain, 
      eventName: winner.eventName 
    };
  };

  // Helper: Get next event start time as relative string (for backwards compatibility)
  const getNextEventStartTime = (bot: BotListItem): string | null => {
    const info = getNextEventInfo(bot);
    return info ? info.time : null;
  };

  // Group bots by selected criteria
  const groupedBots = useMemo(() => {
    const groups: Record<string, BotListItem[]> = {};
    
    // Helper function to sort bots based on orderBy
    const sortBots = (bots: BotListItem[]) => {
      return [...bots].sort((a, b) => {
        switch (orderBy) {
          case 'rating': {
            // Calculate base rating from maxStats (base + upgrades, determines race class)
            const aRating = a.maxStats 
              ? (Number(a.maxStats.speed) + Number(a.maxStats.powerCore) + Number(a.maxStats.acceleration) + Number(a.maxStats.stability)) / 4
              : 0;
            const bRating = b.maxStats 
              ? (Number(b.maxStats.speed) + Number(b.maxStats.powerCore) + Number(b.maxStats.acceleration) + Number(b.maxStats.stability)) / 4
              : 0;
            return bRating - aRating;
          }
          case 'tokenIndex':
            return Number(a.tokenIndex) - Number(b.tokenIndex);
          case 'winRate': {
            const aWinRate = (a.stats?.careerWins || 0) / Math.max((a.stats?.careerRaces || 0), 1);
            const bWinRate = (b.stats?.careerWins || 0) / Math.max((b.stats?.careerRaces || 0), 1);
            return bWinRate - aWinRate;
          }
          case 'condition':
            return Number(b.stats?.condition || 0) - Number(a.stats?.condition || 0);
          case 'battery':
            return Number(b.stats?.battery || 0) - Number(a.stats?.battery || 0);
          default:
            return 0;
        }
      });
    };
    
    if (groupBy === 'none') {
      // When groupBy is 'none', create a single group with all bots
      groups['All Bots'] = sortBots(filteredBots);
    } else if (groupBy === 'class') {
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
      
      // Sort bots within each class
      Object.keys(groups).forEach(key => {
        groups[key] = sortBots(groups[key]);
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
      
      // Sort bots within each terrain group
      Object.keys(groups).forEach(key => {
        groups[key] = sortBots(groups[key]);
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
      
      // Sort bots within each faction group
      Object.keys(groups).forEach(key => {
        groups[key] = sortBots(groups[key]);
      });
    } else if (groupBy === 'role') {
      // Group by role tags (Racers, Scavengers, Both, Untagged)
      groups['Both'] = [];
      groups['Racers'] = [];
      groups['Scavengers'] = [];
      groups['Untagged'] = [];
      
      filteredBots.forEach(bot => {
        const tokenKey = bot.tokenIndex.toString();
        const isRacer = racerBots.has(tokenKey);
        const isScavenger = scavengerBots.has(tokenKey);
        
        if (isRacer && isScavenger) {
          groups['Both'].push(bot);
        } else if (isRacer) {
          groups['Racers'].push(bot);
        } else if (isScavenger) {
          groups['Scavengers'].push(bot);
        } else {
          groups['Untagged'].push(bot);
        }
      });
      
      // Sort bots within each role group
      Object.keys(groups).forEach(key => {
        groups[key] = sortBots(groups[key]);
      });
    }
    
    return groups;
  }, [filteredBots, groupBy, orderBy, backgroundData, racerBots, scavengerBots]);

  // Get the selected bot
  const selectedBot = selectedBotIndex !== null 
    ? sortedBots.find(b => b.tokenIndex === selectedBotIndex) 
    : null;

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
                {bonuses.costMultipliers.upgrade < 1 && (
                  <Badge variant="outline" className="text-xs">
                    🎮 -{Math.round((1 - bonuses.costMultipliers.upgrade) * 100)}% Upgrade
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

      {/* Power Grid Status - Always visible on mobile */}
      {powerStatus && (
        <Card className={`xl:hidden border-2 mb-6 ${
          powerStatus.botsCharging > 0 && powerStatus.efficiency < 0.5 
            ? 'border-red-500/40 bg-red-950/20' 
            : powerStatus.botsCharging > 0 && powerStatus.efficiency < 1 
              ? 'border-yellow-500/30 bg-yellow-950/10' 
              : powerStatus.botsCharging > 0
                ? 'border-green-500/30 bg-green-950/10'
                : 'border-primary/20 bg-card/80'
        } backdrop-blur`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className={`h-4 w-4 ${
                powerStatus.botsCharging === 0 ? 'text-muted-foreground'
                : powerStatus.efficiency < 0.5 ? 'text-red-500' 
                : powerStatus.efficiency < 1 ? 'text-yellow-500' 
                : 'text-green-500'
              }`} />
              Garage Power Grid
            </CardTitle>
            <CardDescription className="text-xs">
              {powerStatus.botsCharging === 0 
                ? 'Send bots to Charging Station for free battery'
                : `${powerStatus.botsCharging} bot${powerStatus.botsCharging !== 1 ? 's' : ''} × ${powerStatus.wattsPerBotRequired}W each`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Power usage display */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">
                {powerStatus.currentDrawWatts + powerStatus.effectiveBatteryDrawWatts}W / {powerStatus.totalCapacityWatts}W
              </span>
              <span className={`font-bold ${
                powerStatus.efficiency < 0.5 ? 'text-red-500' 
                : powerStatus.efficiency < 1 ? 'text-yellow-500' 
                : 'text-green-500'
              }`}>
                {Math.round(powerStatus.efficiency * 100)}% efficiency
              </span>
            </div>
            {/* Segmented power bar: bots (green) + repair bays (purple) + batteries (amber) */}
            {(() => {
              const botDraw = powerStatus.botsCharging * powerStatus.wattsPerBotRequired;
              const repairDraw = powerStatus.repairBayDrawWatts || 0;
              const batteryDraw = powerStatus.effectiveBatteryDrawWatts;
              const total = powerStatus.totalCapacityWatts;
              const botPct = total > 0 ? (botDraw / total) * 100 : 0;
              const repairPct = total > 0 ? (repairDraw / total) * 100 : 0;
              const batteryPct = total > 0 ? (batteryDraw / total) * 100 : 0;
              return (
                <div className="relative h-2 w-full bg-secondary rounded-full overflow-hidden">
                  {/* Bot charging segment (green) */}
                  {botDraw > 0 && (
                    <div 
                      className={`absolute left-0 top-0 h-full transition-all ${
                        powerStatus.efficiency < 0.5 ? 'bg-red-500' 
                        : powerStatus.efficiency < 1 ? 'bg-yellow-500' 
                        : 'bg-green-500'
                      }`}
                      style={{ width: `${botPct}%` }}
                    />
                  )}
                  {/* Repair bay segment (purple) */}
                  {repairDraw > 0 && (
                    <div 
                      className="absolute top-0 h-full bg-purple-500 transition-all"
                      style={{ left: `${botPct}%`, width: `${repairPct}%` }}
                    />
                  )}
                  {/* Battery charging segment (amber) */}
                  {batteryDraw > 0 && (
                    <div 
                      className="absolute top-0 h-full bg-amber-500 transition-all"
                      style={{ left: `${botPct + repairPct}%`, width: `${batteryPct}%` }}
                    />
                  )}
                </div>
              );
            })()}
            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              {powerStatus.botsCharging > 0 && (
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-sm ${
                    powerStatus.efficiency < 0.5 ? 'bg-red-500' 
                    : powerStatus.efficiency < 1 ? 'bg-yellow-500' 
                    : 'bg-green-500'
                  }`} />
                  <span>{powerStatus.botsCharging} bot{powerStatus.botsCharging !== 1 ? 's' : ''} ({powerStatus.botsCharging * powerStatus.wattsPerBotRequired}W)</span>
                </div>
              )}
              {(powerStatus.repairBayDrawWatts || 0) > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-purple-500" />
                  <span>{powerStatus.activeRepairBays || 0} repair bay{(powerStatus.activeRepairBays || 0) !== 1 ? 's' : ''} ({powerStatus.repairBayDrawWatts}W)</span>
                </div>
              )}
              {powerStatus.effectiveBatteryDrawWatts > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-amber-500" />
                  <span>{powerStatus.batteriesCharging} batter{powerStatus.batteriesCharging === 1 ? 'y' : 'ies'} ({powerStatus.effectiveBatteryDrawWatts}W{powerStatus.batteryDrawWatts > powerStatus.surplusWatts ? ' reduced' : ''})</span>
                </div>
              )}
              {powerStatus.botsCharging === 0 && (powerStatus.repairBayDrawWatts || 0) === 0 && powerStatus.effectiveBatteryDrawWatts === 0 && (
                <span className="text-muted-foreground/70">No active power draw</span>
              )}
            </div>
            {powerStatus.efficiency < 1 && (
              <p className="text-xs text-yellow-500/80">
                ⚠️ Over capacity! Bot charging slowed to {Math.round(powerStatus.efficiency * 100)}%.
              </p>
            )}
            
            {/* SMR Reactor Indicators - Mobile (compact inline display) */}
            {userSMRs && userSMRs.installedSMRs.length > 0 && (
              <div className="border-t border-border/50 pt-3 space-y-2">
                {userSMRs.installedSMRs.map((smr, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded bg-gradient-to-r from-amber-950/30 to-transparent border-l-2 border-amber-500/50">
                    <div className="relative flex-shrink-0">
                      <img 
                        src={smr.powerOutput >= 1210 ? '/xl_smr_hi.webp' 
                          : smr.powerOutput >= 880 ? '/lg_smr_hi.webp'
                          : smr.powerOutput >= 500 ? '/md_smr_hi.webp'
                          : '/sm_smr_hi.webp'
                        }
                        alt={smr.model}
                        className="w-8 h-8 object-contain drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Radiation className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-medium text-amber-400">{smr.model}</span>
                        <span className="text-[10px] text-amber-300/60">+{smr.powerOutput}W</span>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        smr.lifetimePercent >= 100 ? 'bg-red-500/30 text-red-400'
                        : smr.lifetimePercent >= 90 ? 'bg-red-500/20 text-red-400' 
                        : smr.lifetimePercent >= 70 ? 'bg-orange-500/20 text-orange-400'
                        : smr.lifetimePercent >= 50 ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-green-500/20 text-green-400'
                      }`}>
                        {smr.lifetimePercent >= 100 ? '☠️ DEAD' : `${Math.max(0, 100 - smr.lifetimePercent).toFixed(0)}% life`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* SMR Upgrade Button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
              onClick={() => setSmrDialogOpen(true)}
            >
              <Radiation className="h-4 w-4 mr-2" />
              Upgrade Power Grid
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Battery Storage - Mobile/Tablet View (< xl screens) */}
      <Card className="xl:hidden border-2 border-cyan-500/20 bg-card/80 backdrop-blur mb-6">
        <CardContent className="pt-4">
          <BatteryPanel bots={bots.map(b => ({
            tokenIndex: b.tokenIndex,
            name: b.name,
          }))} />
        </CardContent>
      </Card>

      {/* Repair Bays - Mobile/Tablet View (< xl screens) */}
      <Card className="xl:hidden border-2 border-green-500/20 bg-card/80 backdrop-blur mb-6">
        <CardContent className="pt-4">
          <RepairBayPanel bots={bots} />
        </CardContent>
      </Card>

      {/* SMR Purchase Dialog */}
      <SMRPurchaseDialog
        isOpen={smrDialogOpen}
        onClose={() => setSmrDialogOpen(false)}
        onPurchase={async (tier: SMRTier) => {
          // Map tier ID to backend model ID
          const modelMap: Record<string, string> = {
            'smr-basic': 'WR250',
            'smr-standard': 'WR500',
            'smr-advanced': 'WR880',
            'smr-premium': 'WR1210',
          };
          const modelId = modelMap[tier.id] || tier.id;
          
          const result = await purchaseSMRMutation.mutateAsync(modelId as 'WR250' | 'WR500' | 'WR880' | 'WR1210');
          toast.success(result.message);
        }}
        currentCapacity={powerStatus?.totalCapacityWatts || 500}
      />

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
              <div className="space-y-2">
                <span className="text-sm font-semibold text-muted-foreground block">Quick Filters:</span>
                <div className="flex gap-2 flex-wrap">
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
                  variant={activeQuickFilters.has('favorited') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('favorited')}
                >
                  ⭐ Favorited
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('racers') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('racers')}
                >
                  🏎️ Racers
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('scavengers') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('scavengers')}
                >
                  ⛏️ Scavengers
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
                  variant={activeQuickFilters.has('repairBay') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('repairBay')}
                >
                  🔧 Repair Bay
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('chargingStation') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('chargingStation')}
                >
                  🔋 Charging
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('fullBattery') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('fullBattery')}
                >
                  🔋 100% Battery
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('needsBattery') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('needsBattery')}
                >
                  🔋 Battery &lt;100%
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('fullCondition') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('fullCondition')}
                >
                  🔧 100% Condition
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('needsCondition') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('needsCondition')}
                >
                  🔧 Condition &lt;100%
                </Badge>
                <Badge
                  variant={activeQuickFilters.has('inNextRace') ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleQuickFilter('inNextRace')}
                >
                  🏁 In Next Event
                </Badge>
                </div>
              </div>

              {/* Clear button row */}
              {activeQuickFilters.size > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveQuickFilters(new Set())}
                    className="h-8 px-3"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              )}

              {/* Advanced Filters Toggle */}
              <div className="pt-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="text-sm w-full sm:w-auto"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced Filters
                  <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                </Button>
              </div>

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
            <CardContent className="py-4 space-y-4">
              {/* Header Row - Selection info and selection controls */}
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-sm font-bold px-3 py-1">
                  {selectedBots.size} bot{selectedBots.size !== 1 ? 's' : ''} selected
                </Badge>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllVisible}
                    className="text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAll}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkRechargeClick}
                  disabled={batchRechargeMutation.isPending}
                  className="justify-start"
                >
                  <Battery className="h-4 w-4 mr-2 text-yellow-500" />
                  Recharge
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkRepairClick}
                  disabled={batchRepairMutation.isPending}
                  className="justify-start"
                >
                  <Wrench className="h-4 w-4 mr-2 text-blue-500" />
                  Repair
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkRecall}
                  disabled={batchRecallMutation.isPending}
                  className="justify-start text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-2" />
                  Recall
                </Button>
              </div>
              
              {/* Scavenging Options - Always visible */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <MapPin className="h-4 w-4 text-green-500 shrink-0" />
                <Select value={bulkScavengeZone} onValueChange={setBulkScavengeZone}>
                  <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ChargingStation">⚡ Charging Station</SelectItem>
                    <SelectItem value="RepairBay">🔧 Repair Bay</SelectItem>
                    <SelectItem value="ScrapHeaps">Scrap Heaps (Safe)</SelectItem>
                    <SelectItem value="AbandonedSettlements">Settlements (Moderate)</SelectItem>
                    <SelectItem value="DeadMachineFields">Machine Fields (Dangerous)</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={bulkScavengeDuration?.toString() || "continuous"} 
                  onValueChange={(v) => setBulkScavengeDuration(v === "continuous" ? undefined : parseInt(v))}
                >
                  <SelectTrigger className="h-8 text-xs w-[100px]">
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
                  className="h-8"
                >
                  {batchScavengeMutation.isPending ? 'Sending...' : 'Send'}
                </Button>
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
        <StarterBotPanel />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Starter Bot Panel — always visible for creating free bots */}
          <StarterBotPanel />

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
                <div className="flex gap-2">
                  <PartsPurchase 
                    onPurchaseComplete={() => {
                      queryClient.invalidateQueries({ queryKey: ['user-inventory'] });
                    }}
                  />
                  <PartsConverter 
                    inventory={inventory}
                    identityOrAgent={user?.agent}
                    onConversionComplete={() => {
                      queryClient.invalidateQueries({ queryKey: ['user-inventory'] });
                    }}
                  />
                </div>
              </div>
            </div>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Your Bots ({bots.length})</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={async () => {
                      setIsManualRefreshing(true);
                      try {
                        await Promise.all([
                          refetchBotsList(),
                          refetchInventory(),
                          queryClient.invalidateQueries({ queryKey: ['garage-power-status'] }),
                        ]);
                      } finally {
                        setIsManualRefreshing(false);
                      }
                    }}
                    disabled={isManualRefreshing}
                    title="Refresh bot status"
                  >
                    <RefreshCw className={`h-4 w-4 ${isManualRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden sm:inline">Group by:</span>
                    <Select value={groupBy} onValueChange={(value) => setGroupBy(value as 'none' | 'class' | 'terrain' | 'faction' | 'role')}>
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">All Bots</SelectItem>
                        <SelectItem value="class">Class</SelectItem>
                        <SelectItem value="terrain">Terrain</SelectItem>
                        <SelectItem value="faction">Faction</SelectItem>
                        <SelectItem value="role">Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden sm:inline">Order by:</span>
                    <Select value={orderBy} onValueChange={(value) => setOrderBy(value as 'rating' | 'tokenIndex' | 'winRate' | 'condition' | 'battery')}>
                      <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rating">Rating</SelectItem>
                        <SelectItem value="tokenIndex">Token #</SelectItem>
                        <SelectItem value="winRate">Win Rate</SelectItem>
                        <SelectItem value="condition">Condition</SelectItem>
                        <SelectItem value="battery">Battery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
              >
                {/* Always use grouped view (groupBy='none' shows single 'All Bots' group) */}
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
                            const imageUrl = getBotAvatarUrl(bot);
                            const isFavorite = favorites.has(bot.tokenIndex.toString());
                            const isRacer = racerBots.has(bot.tokenIndex.toString());
                            const isScavenger = scavengerBots.has(bot.tokenIndex.toString());
                            const isCollapsed = collapsedBots.has(bot.tokenIndex.toString());
                            const isStarring = botStarringStates.get(bot.tokenIndex.toString()) || false;
                            
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
                                
                                {/* Drag Handle (when not in selection mode) - Hidden on mobile */}
                                {!selectionMode && (
                                  <div className="hidden lg:flex px-2 text-muted-foreground hover:text-foreground items-center">
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
                                  {/* Mobile/Tablet Layout (< lg) */}
                                  <div className="lg:hidden space-y-2">
                                    {/* Header with Avatar and Name */}
                                    <div className="flex items-center gap-3">
                                      <div className="relative overflow-visible">
                                        {/* Avatar with buff indicators */}
                                        <div className="relative h-12 w-12 overflow-visible">
                                          {/* World Buff circle */}
                                          {bot.stats?.worldBuff && bot.stats.worldBuff.length > 0 && (
                                            <svg className="absolute w-[52px] h-[52px] z-20" style={{ left: '-2px', top: '-2px', filter: 'drop-shadow(0 0 3px rgba(168, 85, 247, 0.6))' }}>
                                              <circle
                                                cx="26"
                                                cy="26"
                                                r="25"
                                                fill="none"
                                                stroke="rgb(168, 85, 247)"
                                                strokeWidth="2"
                                                className="animate-pulse"
                                                style={{ animationDuration: '2s' }}
                                              />
                                            </svg>
                                          )}
                                          
                                          {/* Overcharge/Perfect Tune-Up radial */}
                                          {(() => {
                                            const overcharge = Number(bot.stats?.overcharge || 0);
                                            const maxOvercharge = 40;
                                            const overchargePercent = Math.round((overcharge / maxOvercharge) * 100);
                                            const isPerfectTuneUp = bot.stats?.perfectTuneUp === true;
                                            const hasOvercharge = overcharge > 0 || isPerfectTuneUp;
                                            
                                            return hasOvercharge && (
                                              <>
                                                <svg className="absolute w-[52px] h-[52px] -rotate-90 z-20 pointer-events-none" style={{ overflow: 'visible', left: '-2px', top: '-2px' }}>
                                                  {/* Background ring */}
                                                  <circle
                                                    cx="26"
                                                    cy="26"
                                                    r="25"
                                                    fill="none"
                                                    stroke={isPerfectTuneUp ? "rgba(251, 191, 36, 0.3)" : "rgba(6, 182, 212, 0.3)"}
                                                    strokeWidth="3"
                                                  />
                                                  {/* Progress ring */}
                                                  <circle
                                                    cx="26"
                                                    cy="26"
                                                    r="25"
                                                    fill="none"
                                                    stroke={isPerfectTuneUp ? "url(#goldGradient-mobile-" + bot.tokenIndex + ")" : "rgb(6, 182, 212)"}
                                                    strokeWidth="3"
                                                    strokeDasharray={`${(overchargePercent / 100) * 157.1} 157.1`}
                                                    strokeLinecap="round"
                                                    className={isPerfectTuneUp ? "animate-pulse" : "transition-all duration-1000"}
                                                    style={isPerfectTuneUp ? { animationDuration: '1.5s', filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.8))' } : { filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.6))' }}
                                                  />
                                                  {isPerfectTuneUp && (
                                                    <defs>
                                                      <linearGradient id={`goldGradient-mobile-${bot.tokenIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="rgb(251, 191, 36)" />
                                                        <stop offset="50%" stopColor="rgb(249, 115, 22)" />
                                                        <stop offset="100%" stopColor="rgb(251, 191, 36)" />
                                                      </linearGradient>
                                                    </defs>
                                                  )}
                                                </svg>
                                                {isPerfectTuneUp && (
                                                  <div className="absolute w-[52px] h-[52px] rounded-full animate-pulse z-20 pointer-events-none" style={{ 
                                                    left: '-2px',
                                                    top: '-2px',
                                                    boxShadow: '0 0 15px rgba(251, 191, 36, 0.5)',
                                                    animationDuration: '2s'
                                                  }} />
                                                )}
                                              </>
                                            );
                                          })()}
                                          
                                          <Avatar className="h-12 w-12 relative z-10">
                                            <AvatarImage src={imageUrl} alt={`Bot #${bot.tokenIndex}`} />
                                            <AvatarFallback>#{bot.tokenIndex.toString().slice(-2)}</AvatarFallback>
                                          </Avatar>
                                        </div>
                                        {(() => {
                                          const eventInfo = getNextEventInfo(bot);
                                          return eventInfo && (
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-[9px] font-bold shadow-md border border-primary-foreground/20 flex items-center gap-0.5 whitespace-nowrap leading-none z-20">
                                              {eventInfo.time}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm text-foreground flex items-start gap-1 min-w-0">
                                          <span className="truncate">
                                            <span className="hidden lg:inline">#{bot.tokenIndex.toString()} </span>
                                            {bot.name || 'Unnamed'}
                                          </span>
                                          {(() => {
                                            const bg = backgroundData?.backgrounds[bot.tokenIndex.toString()];
                                            const bgTerrain = getTerrainPreference(bg, factionName);
                                            const factionTerrain = getFactionSpecialTerrain(factionName);
                                            
                                            return (
                                              <span className="flex-shrink-0 text-xs flex items-center gap-0.5 mt-0.5">
                                                {getTerrainIcon(bgTerrain)}
                                                {factionTerrain && factionTerrain.terrain !== bgTerrain && (
                                                  getTerrainIcon(factionTerrain.terrain)
                                                )}
                                              </span>
                                            );
                                          })()}
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
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-1">
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
                                              {/* Heat Indicator */}
                                              {bot.heatStatus && (bot.heatStatus.heatStacks > 0 || bot.heatStatus.isOverheated) && (
                                                <div 
                                                  className="flex items-center gap-0.5 cursor-help"
                                                  title={bot.heatStatus.isOverheated 
                                                    ? `🔥 OVERHEATED! Cannot jolt until cooled down (${bot.heatStatus.minutesUntilCooldown ?? 0}m remaining)`
                                                    : `⚡ Heat: ${bot.heatStatus.heatStacks}/4 stacks (-${bot.heatStatus.heatStacks * 15}% jolt effectiveness). Stacks decay 1 per hour.`
                                                  }
                                                >
                                                  {bot.heatStatus.isOverheated ? (
                                                    <Badge variant="destructive" className="text-xs px-1 py-0">
                                                      <Flame className="w-3 h-3 mr-0.5" />
                                                      {bot.heatStatus.minutesUntilCooldown}m
                                                    </Badge>
                                                  ) : (
                                                    <>
                                                      <Flame className="w-3 h-3 text-orange-500" />
                                                      {Array.from({ length: 4 }).map((_, i) => (
                                                        <div 
                                                          key={i}
                                                          className={`w-1.5 h-1.5 rounded-full ${i < bot.heatStatus!.heatStacks ? 'bg-orange-500' : 'bg-muted/30 border border-muted'}`}
                                                        />
                                                      ))}
                                                    </>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  
                                    {!isCollapsed && bot.isInitialized && bot.stats && (
                                      <>      
                                        {/* Cooldowns and Status */}
                                        <div className="flex flex-wrap gap-1.5">
                                          <BotCooldownBadges 
                                            bot={bot} 
                                            garageCooldownMult={bonuses?.costMultipliers.rechargeCooldown ?? 1} 
                                            powerStatus={powerStatus}
                                            dedicationInfo={dedicationInfoMap?.get(Number(bot.tokenIndex))}
                                            showLabel={true}
                                          />
                                        </div>
                                      </>
                                    )}
                                    {!bot.isInitialized && (
                                      <Badge variant="outline" className="text-xs">Not Initialized</Badge>
                                    )}
                                  </div>

                                  {/* Desktop Layout (>= lg) */}
                                  <div className="hidden lg:flex items-center gap-4">
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0 overflow-visible">
                                      {/* Avatar with buff indicators */}
                                      <div className="relative h-12 w-12 overflow-visible">
                                        {/* World Buff circle */}
                                        {bot.stats?.worldBuff && bot.stats.worldBuff.length > 0 && (
                                          <svg className="absolute w-[52px] h-[52px] z-20" style={{ left: '-2px', top: '-2px', filter: 'drop-shadow(0 0 3px rgba(168, 85, 247, 0.6))' }}>
                                            <circle
                                              cx="26"
                                              cy="26"
                                              r="25"
                                              fill="none"
                                              stroke="rgb(168, 85, 247)"
                                              strokeWidth="2"
                                              className="animate-pulse"
                                              style={{ animationDuration: '2s' }}
                                            />
                                          </svg>
                                        )}
                                        
                                        {/* Overcharge/Perfect Tune-Up radial */}
                                        {(() => {
                                          const overcharge = Number(bot.stats?.overcharge || 0);
                                          const maxOvercharge = 40;
                                          const overchargePercent = Math.round((overcharge / maxOvercharge) * 100);
                                          const isPerfectTuneUp = bot.stats?.perfectTuneUp === true;
                                          const hasOvercharge = overcharge > 0 || isPerfectTuneUp;
                                          
                                          return hasOvercharge && (
                                            <>
                                              <svg className="absolute w-[52px] h-[52px] -rotate-90 z-20 pointer-events-none" style={{ overflow: 'visible', left: '-2px', top: '-2px' }}>
                                                {/* Background ring */}
                                                <circle
                                                  cx="26"
                                                  cy="26"
                                                  r="25"
                                                  fill="none"
                                                  stroke={isPerfectTuneUp ? "rgba(251, 191, 36, 0.3)" : "rgba(6, 182, 212, 0.3)"}
                                                  strokeWidth="3"
                                                />
                                                {/* Progress ring */}
                                                <circle
                                                  cx="26"
                                                  cy="26"
                                                  r="25"
                                                  fill="none"
                                                  stroke={isPerfectTuneUp ? "url(#goldGradient-desktop-" + bot.tokenIndex + ")" : "rgb(6, 182, 212)"}
                                                  strokeWidth="3"
                                                  strokeDasharray={`${(overchargePercent / 100) * 157.1} 157.1`}
                                                  strokeLinecap="round"
                                                  className={isPerfectTuneUp ? "animate-pulse" : "transition-all duration-1000"}
                                                  style={isPerfectTuneUp ? { animationDuration: '1.5s', filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.8))' } : { filter: 'drop-shadow(0 0 3px rgba(6, 182, 212, 0.6))' }}
                                                />
                                                {isPerfectTuneUp && (
                                                  <defs>
                                                    <linearGradient id={`goldGradient-desktop-${bot.tokenIndex}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                                      <stop offset="0%" stopColor="rgb(251, 191, 36)" />
                                                      <stop offset="50%" stopColor="rgb(249, 115, 22)" />
                                                      <stop offset="100%" stopColor="rgb(251, 191, 36)" />
                                                    </linearGradient>
                                                  </defs>
                                                )}
                                              </svg>
                                              {isPerfectTuneUp && (
                                                <div className="absolute w-[52px] h-[52px] rounded-full animate-pulse z-20 pointer-events-none" style={{ 
                                                  left: '-2px',
                                                  top: '-2px',
                                                  boxShadow: '0 0 15px rgba(251, 191, 36, 0.5)',
                                                  animationDuration: '2s'
                                                }} />
                                              )}
                                            </>
                                          );
                                        })()}
                                        
                                        <Avatar className="h-12 w-12 relative z-10">
                                          <AvatarImage src={imageUrl} alt={`Bot #${bot.tokenIndex}`} />
                                          <AvatarFallback>#{bot.tokenIndex.toString().slice(-2)}</AvatarFallback>
                                        </Avatar>
                                      </div>
                                      {(() => {
                                        const eventInfo = getNextEventInfo(bot);
                                        return eventInfo && (
                                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-[9px] font-bold shadow-md border border-primary-foreground/20 flex items-center gap-0.5 whitespace-nowrap leading-none z-20">
                                            {eventInfo.time}
                                          </div>
                                        );
                                      })()}
                                    </div>

                                    {/* Bot Info Column */}
                                    <div className="w-[240px] flex-shrink-0">
                                      <div className="font-semibold truncate text-sm text-foreground flex items-center gap-1">
                                        <span className="truncate">#{bot.tokenIndex.toString()} {bot.name || 'Unnamed'}</span>
                                        {(() => {
                                          const bg = backgroundData?.backgrounds[bot.tokenIndex.toString()];
                                          const bgTerrain = getTerrainPreference(bg, factionName);
                                          const factionTerrain = getFactionSpecialTerrain(factionName);
                                          
                                          return (
                                            <span className="flex-shrink-0 text-xs flex items-center gap-0.5">
                                              {getTerrainIcon(bgTerrain)}
                                              {factionTerrain && factionTerrain.terrain !== bgTerrain && (
                                                getTerrainIcon(factionTerrain.terrain)
                                              )}
                                            </span>
                                          );
                                        })()}
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
                                          <BotCooldownBadges 
                                            bot={bot} 
                                            garageCooldownMult={bonuses?.costMultipliers.rechargeCooldown ?? 1} 
                                            powerStatus={powerStatus}
                                            dedicationInfo={dedicationInfoMap?.get(Number(bot.tokenIndex))}
                                            showLabel={false}
                                          />
                                        </div>
                                      )}

                                      {/* Role Tags - Racer/Scavenger */}
                                      {bot.isInitialized && (
                                        <div className="flex items-center gap-1 ml-auto flex-shrink-0 mr-4">
                                          <ToggleGroup type="multiple" value={[...(isRacer ? ['racer'] : []), ...(isScavenger ? ['scavenger'] : [])]} size="xs" variant="outline">
                                            <ToggleGroupItem
                                              value="racer"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleRacer(bot.tokenIndex.toString());
                                              }}
                                              className={isRacer ? 'data-[state=on]:bg-green-500/20 data-[state=on]:text-green-400 data-[state=on]:border-green-500' : ''}
                                              title={isRacer ? 'Remove racer tag' : 'Tag as racer'}
                                            >
                                              🏎️
                                            </ToggleGroupItem>
                                            <ToggleGroupItem
                                              value="scavenger"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleScavenger(bot.tokenIndex.toString());
                                              }}
                                              className={isScavenger ? 'data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-400 data-[state=on]:border-amber-500' : ''}
                                              title={isScavenger ? 'Remove scavenger tag' : 'Tag as scavenger'}
                                            >
                                              ⛏️
                                            </ToggleGroupItem>
                                          </ToggleGroup>
                                        </div>
                                      )}

                                      {/* Mini Resource Bars - Stacked Vertically */}
                                      {bot.isInitialized && bot.stats && (
                                        <div className="flex flex-col gap-1.5 flex-shrink-0">
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

                                          {/* Heat Indicator */}
                                          {bot.heatStatus && (bot.heatStatus.heatStacks > 0 || bot.heatStatus.isOverheated) && (
                                            <div 
                                              className="flex items-center gap-0.5 cursor-help"
                                              title={bot.heatStatus.isOverheated 
                                                ? `🔥 OVERHEATED! Cannot jolt until cooled down (${bot.heatStatus.minutesUntilCooldown ?? 0}m remaining)`
                                                : `⚡ Heat: ${bot.heatStatus.heatStacks}/4 stacks (-${bot.heatStatus.heatStacks * 15}% jolt effectiveness). Stacks decay 1 per hour.`
                                              }
                                            >
                                              {bot.heatStatus.isOverheated ? (
                                                <Badge variant="destructive" className="text-xs px-1 py-0">
                                                  <Flame className="w-3 h-3 mr-0.5" />
                                                  {bot.heatStatus.minutesUntilCooldown}m
                                                </Badge>
                                              ) : (
                                                <>
                                                  <Flame className="w-3 h-3 text-orange-500" />
                                                  {Array.from({ length: 4 }).map((_, i) => (
                                                    <div 
                                                      key={i}
                                                      className={`w-1.5 h-1.5 rounded-full ${i < bot.heatStatus!.heatStacks ? 'bg-orange-500' : 'bg-muted/30 border border-muted'}`}
                                                    />
                                                  ))}
                                                </>
                                              )}
                                            </div>
                                          )}
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
                                disabled={isStarring}
                                className="px-3 text-muted-foreground hover:text-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={isStarring ? 'Updating...' : (isFavorite ? 'Remove from favorites' : 'Add to favorites')}
                              >
                                {isStarring ? (
                                  <Star className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                )}
                              </button>
                            </div>
                          );
                        })}
                        </div>
                      );
                    });
                  })()}
                </>
              </div>
            </CardContent>
          </Card>
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
                {/* Parts Inventory - Moved above Power Grid */}
                <div className="pb-3 border-b border-border space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Parts Inventory</h4>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
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
                  </div>
                  <div className="flex items-center justify-between p-2 bg-primary/10 border border-primary/30 rounded">
                    <span className="text-primary font-medium text-xs">Universal</span>
                    <span className="font-bold text-primary">{inventory ? Number(inventory.universalParts) : '—'}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <PartsPurchase 
                      onPurchaseComplete={() => {
                        queryClient.invalidateQueries({ queryKey: ['user-inventory'] });
                      }}
                    />
                    <PartsConverter 
                      inventory={inventory}
                      identityOrAgent={user?.agent}
                      onConversionComplete={() => {
                        queryClient.invalidateQueries({ queryKey: ['user-inventory'] });
                      }}
                    />
                  </div>
                </div>

                {/* Power Grid Status - Always visible */}
                {powerStatus && (
                  <div className={`pb-3 border-b space-y-2 ${
                    powerStatus.botsCharging > 0 && powerStatus.efficiency < 0.5 
                      ? 'border-red-500/40' 
                      : powerStatus.botsCharging > 0 && powerStatus.efficiency < 1 
                        ? 'border-yellow-500/30' 
                        : 'border-border'
                  }`}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Zap className={`h-3 w-3 ${
                        powerStatus.botsCharging === 0 ? 'text-muted-foreground'
                        : powerStatus.efficiency < 0.5 ? 'text-red-500' 
                        : powerStatus.efficiency < 1 ? 'text-yellow-500' 
                        : 'text-green-500'
                      }`} />
                      Power Grid
                    </h4>
                    
                    <div className="space-y-2">
                      {/* Watts usage bar */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {powerStatus.currentDrawWatts + powerStatus.effectiveBatteryDrawWatts}W / {powerStatus.totalCapacityWatts}W
                        </span>
                        <span className={`font-bold ${
                          powerStatus.efficiency < 0.5 ? 'text-red-500' 
                          : powerStatus.efficiency < 1 ? 'text-yellow-500' 
                          : 'text-green-500'
                        }`}>
                          {Math.round(powerStatus.efficiency * 100)}% efficiency
                        </span>
                      </div>
                      {/* Segmented power bar: bots (green) + repair bays (purple) + batteries (amber) */}
                      {(() => {
                        const botDraw = powerStatus.botsCharging * powerStatus.wattsPerBotRequired;
                        const repairDraw = powerStatus.repairBayDrawWatts || 0;
                        const batteryDraw = powerStatus.effectiveBatteryDrawWatts;
                        const total = powerStatus.totalCapacityWatts;
                        const botPct = total > 0 ? (botDraw / total) * 100 : 0;
                        const repairPct = total > 0 ? (repairDraw / total) * 100 : 0;
                        const batteryPct = total > 0 ? (batteryDraw / total) * 100 : 0;
                        return (
                          <div className="relative h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            {/* Bot charging segment (green) */}
                            {botDraw > 0 && (
                              <div 
                                className={`absolute left-0 top-0 h-full transition-all ${
                                  powerStatus.efficiency < 0.5 ? 'bg-red-500' 
                                  : powerStatus.efficiency < 1 ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                                }`}
                                style={{ width: `${botPct}%` }}
                              />
                            )}
                            {/* Repair bay segment (purple) */}
                            {repairDraw > 0 && (
                              <div 
                                className="absolute top-0 h-full bg-purple-500 transition-all"
                                style={{ left: `${botPct}%`, width: `${repairPct}%` }}
                              />
                            )}
                            {/* Battery charging segment (amber) */}
                            {batteryDraw > 0 && (
                              <div 
                                className="absolute top-0 h-full bg-amber-500 transition-all"
                                style={{ left: `${botPct + repairPct}%`, width: `${batteryPct}%` }}
                              />
                            )}
                          </div>
                        );
                      })()}
                      {/* Legend */}
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                        {powerStatus.botsCharging > 0 && (
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-sm ${
                              powerStatus.efficiency < 0.5 ? 'bg-red-500' 
                              : powerStatus.efficiency < 1 ? 'bg-yellow-500' 
                              : 'bg-green-500'
                            }`} />
                            <span>{powerStatus.botsCharging} bot{powerStatus.botsCharging !== 1 ? 's' : ''} ({powerStatus.botsCharging * powerStatus.wattsPerBotRequired}W)</span>
                          </div>
                        )}
                        {(powerStatus.repairBayDrawWatts || 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-sm bg-purple-500" />
                            <span>{powerStatus.activeRepairBays || 0} bay{(powerStatus.activeRepairBays || 0) !== 1 ? 's' : ''} ({powerStatus.repairBayDrawWatts}W)</span>
                          </div>
                        )}
                        {powerStatus.effectiveBatteryDrawWatts > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-sm bg-amber-500" />
                            <span>{powerStatus.batteriesCharging} batt ({powerStatus.effectiveBatteryDrawWatts}W)</span>
                          </div>
                        )}
                        {powerStatus.botsCharging === 0 && (powerStatus.repairBayDrawWatts || 0) === 0 && powerStatus.effectiveBatteryDrawWatts === 0 && (
                          <span className="text-muted-foreground/70">No active draw</span>
                        )}
                      </div>
                      {powerStatus.efficiency < 1 && (
                        <p className="text-[10px] text-yellow-500/80">
                          ⚠️ Over capacity! Charging at {Math.round(powerStatus.efficiency * 100)}%
                        </p>
                      )}
                      
                      {/* SMR Reactor Indicators - Compact inline display */}
                      {userSMRs && userSMRs.installedSMRs.length > 0 && (
                        <div className="pt-2 border-t border-border/50 space-y-1.5">
                          {userSMRs.installedSMRs.map((smr, index) => (
                            <div key={index} className="flex items-center gap-2 p-1.5 rounded bg-gradient-to-r from-amber-950/30 to-transparent border-l-2 border-amber-500/50">
                              <div className="relative flex-shrink-0">
                                <img 
                                  src={smr.powerOutput >= 1210 ? '/xl_smr_hi.webp' 
                                    : smr.powerOutput >= 880 ? '/lg_smr_hi.webp'
                                    : smr.powerOutput >= 500 ? '/md_smr_hi.webp'
                                    : '/sm_smr_hi.webp'
                                  }
                                  alt={smr.model}
                                  className="w-6 h-6 object-contain drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]"
                                />
                              </div>
                              <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1">
                                  <Radiation className="h-2.5 w-2.5 text-amber-500" />
                                  <span className="text-[10px] font-medium text-amber-400">{smr.model}</span>
                                  <span className="text-[9px] text-amber-300/60">+{smr.powerOutput}W</span>
                                </div>
                                <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${
                                  smr.lifetimePercent >= 100 ? 'bg-red-500/30 text-red-400'
                                  : smr.lifetimePercent >= 90 ? 'bg-red-500/20 text-red-400' 
                                  : smr.lifetimePercent >= 70 ? 'bg-orange-500/20 text-orange-400'
                                  : smr.lifetimePercent >= 50 ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-green-500/20 text-green-400'
                                }`}>
                                  {smr.lifetimePercent >= 100 ? '☠️ DEAD' : `${Math.max(0, 100 - smr.lifetimePercent).toFixed(0)}% life`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* SMR Upgrade Button - Desktop sidebar */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 h-7 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                        onClick={() => setSmrDialogOpen(true)}
                      >
                        <Radiation className="h-3 w-3 mr-1" />
                        Upgrade Grid
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Battery Storage - Right after Power Grid */}
                <div className="pb-3 border-b border-border">
                  <BatteryPanel bots={bots.map(b => ({
                    tokenIndex: b.tokenIndex,
                    name: b.name,
                  }))} />
                </div>

                {/* Repair Bays - After Battery Storage */}
                <div className="pb-3 border-b border-border">
                  <RepairBayPanel bots={bots} />
                </div>

                {bonusesLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : !bonuses || bots.length === 0 ? (
                  <p className="text-muted-foreground">Collect faction bots for bonuses</p>
                ) : (
                  <>
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
                      {(bonuses.costMultipliers.repair < 1 || bonuses.costMultipliers.upgrade < 1 || bonuses.costMultipliers.rechargeCooldown < 1 || 
                        bonuses.yieldMultipliers.parts > 1 || bonuses.yieldMultipliers.prizes > 1) ? (
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {bonuses.costMultipliers.repair < 1 && (
                            <Badge variant="outline" className="text-xs">
                              🔧 -{Math.round((1 - bonuses.costMultipliers.repair) * 100)}%
                            </Badge>
                          )}
                          {bonuses.costMultipliers.upgrade < 1 && (
                            <Badge variant="outline" className="text-xs">
                              🎮 -{Math.round((1 - bonuses.costMultipliers.upgrade) * 100)}%
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

      {/* Bulk Recharge Confirmation Dialog */}
      <AlertDialog open={showRechargeConfirm} onOpenChange={setShowRechargeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Recharge</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  You are about to recharge <span className="font-bold text-foreground">{pendingRechargeCount} bot{pendingRechargeCount > 1 ? 's' : ''}</span>.
                </p>
                <p className="text-amber-500 font-medium">
                  This will cost approximately <span className="font-bold">{(pendingRechargeCount * 0.1).toFixed(2)} ICP</span> (0.1 ICP per bot).
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkRecharge}>
              <Battery className="h-4 w-4 mr-2" />
              Recharge {pendingRechargeCount} Bot{pendingRechargeCount > 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Repair Confirmation Dialog */}
      <AlertDialog open={showRepairConfirm} onOpenChange={setShowRepairConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Repair</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  You are about to repair <span className="font-bold text-foreground">{pendingRepairCount} bot{pendingRepairCount > 1 ? 's' : ''}</span>.
                </p>
                <p className="text-amber-500 font-medium">
                  This will cost approximately <span className="font-bold">{(pendingRepairCount * 0.05).toFixed(2)} ICP</span> (0.05 ICP per bot).
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkRepair}>
              <Wrench className="h-4 w-4 mr-2" />
              Repair {pendingRepairCount} Bot{pendingRepairCount > 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
