import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Wrench, Plus, ChevronUp, Clock, Zap, ChevronDown, ChevronRight, Loader2, CheckCircle, Bot, Send, LogOut } from 'lucide-react';
import { 
  useUserRepairBays, 
  useRepairBayTiers,
  useRepairBayUpgradeCost, 
  usePurchaseRepairBaySlot, 
  useUpgradeRepairBay, 
  useCompleteRepairBayUpgrade,
  useUserInventory,
  useStartScavenging,
  useCompleteScavenging
} from '../hooks/useGarage';
import type { RepairBayInfo, RepairBayUpgradeCost, UserRepairBayStorage, RepairBayTierConfig, BotListItem } from '@pokedbots-racing/ic-js';
import { getBotAvatarUrl } from '../lib/botAvatar';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface RepairBayPanelProps {
  bots?: BotListItem[];
}

// Tier styles for visual distinction
const TIER_STYLES: Record<number, { color: string; bgColor: string; borderColor: string }> = {
  1: { color: 'text-gray-400', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/30' },
  2: { color: 'text-gray-400', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/30' },
  3: { color: 'text-gray-400', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/30' },
  4: { color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  5: { color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  6: { color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  7: { color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  8: { color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  9: { color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  10: { color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  11: { color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  12: { color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  13: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  14: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  15: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  16: { color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
};

function getTierStyle(tier: number) {
  return TIER_STYLES[tier] || TIER_STYLES[1];
}

// Map tier to image filename
const TIER_IMAGES: Record<number, string> = {
  1: 'salvage-arm.png',
  2: 'scrap-crane.png',
  3: 'junk-lifter.png',
  4: 'parts-handler.png',
  5: 'torch-station.png',
  6: 'welding-bench.png',
  7: 'fusion-welder.png',
  8: 'plasma-cutter.png',
  9: 'gantry-rig.png',
  10: 'tech-station.png',
  11: 'diagnostic-bay.png',
  12: 'cyber-workshop.png',
  13: 'factory-arm.png',
  14: 'assembly-line.png',
  15: 'forge-station.png',
  16: 'foundry-core.png',
};

function getTierImage(tier: number): string {
  return `/bays/${TIER_IMAGES[tier] || TIER_IMAGES[1]}`;
}

// Format build time for display
function formatBuildTime(seconds: bigint): string {
  const totalSeconds = Number(seconds);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return '< 1m';
}

// Format remaining time for countdown
function formatTimeRemaining(completionTime: bigint): string {
  const nowMs = Date.now();
  const completionMs = Number(completionTime) / 1_000_000;
  const remainingMs = completionMs - nowMs;
  
  if (remainingMs <= 0) return 'Ready!';
  
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// Check if upgrade is complete
function isUpgradeComplete(completionTime: bigint): boolean {
  const nowMs = Date.now();
  const completionMs = Number(completionTime) / 1_000_000;
  return nowMs >= completionMs;
}

// Format parts with commas
function formatParts(parts: number): string {
  return parts.toLocaleString();
}

// Individual bay card component
function RepairBayCard({ 
  bay, 
  tiers,
  onUpgrade, 
  onCompleteUpgrade,
  onSendBot,
  onPullBot,
  isUpgrading,
  isCompleting,
  isPulling,
  userParts,
  hasBots,
  occupyingBot,
}: {
  bay: RepairBayInfo;
  tiers: RepairBayTierConfig[];
  onUpgrade: (bayId: number) => void;
  onCompleteUpgrade: (bayId: number) => void;
  onSendBot: (bayId: number) => void;
  onPullBot: (tokenIndex: number) => void;
  isUpgrading: boolean;
  isCompleting: boolean;
  isPulling: boolean;
  userParts: number;
  hasBots: boolean;
  occupyingBot: { name: string; imageUrl: string; condition: number; tokenIndex: number } | null;
}) {
  const style = getTierStyle(bay.tier);
  const isMaxTier = bay.tier >= 16;
  const hasUpgradeInProgress = !!bay.upgradeInProgress;
  const upgradeReady = hasUpgradeInProgress && isUpgradeComplete(bay.upgradeInProgress!.completionTime);
  const isOccupied = bay.currentBotToken !== null;
  
  // Get next tier info
  const nextTier = tiers.find(t => t.tier === bay.tier + 1);
  const canAffordUpgrade = nextTier ? userParts >= nextTier.partsCost : false;
  
  // Calculate upgrade progress percentage
  const upgradeProgress = hasUpgradeInProgress ? (() => {
    const startMs = Number(bay.upgradeInProgress!.startTime) / 1_000_000;
    const endMs = Number(bay.upgradeInProgress!.completionTime) / 1_000_000;
    const nowMs = Date.now();
    const totalDuration = endMs - startMs;
    const elapsed = nowMs - startMs;
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  })() : 0;

  // Countdown timer state
  const [timeRemaining, setTimeRemaining] = useState(
    hasUpgradeInProgress ? formatTimeRemaining(bay.upgradeInProgress!.completionTime) : ''
  );

  useEffect(() => {
    if (!hasUpgradeInProgress) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(bay.upgradeInProgress!.completionTime));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [hasUpgradeInProgress, bay.upgradeInProgress]);

  return (
    <div className={`p-2.5 rounded-lg border ${style.borderColor} ${style.bgColor}`}>
      {/* Header: Bay ID and Tier */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          {/* Bay image with glow effect */}
          <img 
            src={getTierImage(bay.tier)} 
            alt={bay.tierName}
            className={`w-14 h-14 rounded object-cover ${isOccupied ? 'bay-glow-active' : 'bay-glow-idle'}`}
          />
          <div className="flex flex-col">
            <span className={`font-semibold text-sm ${style.color}`}>Bay {bay.bayId}</span>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Wrench className="w-2.5 h-2.5" />
                <span>{bay.repairRatePerHour}/hr</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                <span>{bay.powerDrawWatts}W</span>
              </div>
            </div>
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${style.color} ${style.borderColor}`}>
          T{bay.tier} {bay.tierName}
        </Badge>
      </div>
      
      {/* Occupied Bot Display */}
      {isOccupied && occupyingBot && (
        <div className="mb-2 p-2 rounded bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={occupyingBot.imageUrl} alt={occupyingBot.name} />
              <AvatarFallback className="text-[10px]">🔧</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-green-400 truncate">{occupyingBot.name}</div>
              <div className="text-[10px] text-muted-foreground">Repairing... {occupyingBot.condition}%</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-red-400"
              onClick={() => onPullBot(occupyingBot.tokenIndex)}
              disabled={isPulling}
              title="Pull bot from repair bay"
            >
              {isPulling ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <LogOut className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>
      )}
      
      {/* Upgrade in Progress */}
      {hasUpgradeInProgress && (
        <div className="mb-2 p-1.5 rounded bg-background/50">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">
              Upgrading to T{bay.upgradeInProgress!.targetTier}
            </span>
            <span className={upgradeReady ? 'text-green-400 font-bold' : 'text-muted-foreground'}>
              {timeRemaining}
            </span>
          </div>
          <Progress value={upgradeProgress} className="h-1" />
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-1.5">
        {upgradeReady ? (
          <Button
            size="sm"
            className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-500"
            disabled={isCompleting}
            onClick={() => onCompleteUpgrade(bay.bayId)}
          >
            {isCompleting ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <CheckCircle className="w-3 h-3 mr-1" />
            )}
            Complete
          </Button>
        ) : hasUpgradeInProgress ? (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-xs"
            disabled
          >
            <Clock className="w-3 h-3 mr-1" />
            Building...
          </Button>
        ) : isMaxTier ? (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-xs text-amber-400"
            disabled
          >
            Max Tier
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-xs"
            disabled={isUpgrading || !canAffordUpgrade || isOccupied}
            onClick={() => onUpgrade(bay.bayId)}
          >
            {isUpgrading ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <ChevronUp className="w-3 h-3 mr-1" />
            )}
            Upgrade
          </Button>
        )}
        
        {/* Send Bot Button - hidden when occupied or upgrading */}
        {!hasUpgradeInProgress && !isOccupied && (
          <Button
            size="sm"
            variant="secondary"
            className="h-7 px-2 flex-shrink-0"
            onClick={() => onSendBot(bay.bayId)}
            disabled={!hasBots}
            title={hasBots ? "Send bot to repair" : "No bots available"}
          >
            <Send className="w-3 h-3 mr-1" />
            Send
          </Button>
        )}
      </div>
    </div>
  );
}

export function RepairBayPanel({ bots = [] }: RepairBayPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showBotSelectDialog, setShowBotSelectDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeTargetBay, setUpgradeTargetBay] = useState<RepairBayInfo | null>(null);
  const [selectedBayId, setSelectedBayId] = useState<number | null>(null);
  const [upgradingBayId, setUpgradingBayId] = useState<number | null>(null);
  const [completingBayId, setCompletingBayId] = useState<number | null>(null);
  const [sendingBotIndex, setSendingBotIndex] = useState<number | null>(null);
  const [pullingBotIndex, setPullingBotIndex] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  
  // Fetch data
  const { data: baysData, isLoading: baysLoading, refetch: refetchBays } = useUserRepairBays();
  const { data: tiers, isLoading: tiersLoading } = useRepairBayTiers();
  const { data: inventory } = useUserInventory();
  
  // Mutations
  const purchaseSlot = usePurchaseRepairBaySlot();
  const upgradeBay = useUpgradeRepairBay();
  const completeUpgrade = useCompleteRepairBayUpgrade();
  const startScavenging = useStartScavenging();
  const completeScavenging = useCompleteScavenging();
  
  // Create a map of all bots (including those on missions) for displaying occupied bays
  const allBotsMap = useMemo(() => {
    const map = new Map<number, { name: string; imageUrl: string; condition: number; tokenIndex: number }>();
    for (const bot of bots) {
      const tokenIndex = Number(bot.tokenIndex);
      const imageUrl = getBotAvatarUrl(bot);
      map.set(tokenIndex, {
        name: bot.name || `Bot #${tokenIndex}`,
        condition: bot.stats?.condition !== undefined ? Number(bot.stats.condition) : 100,
        imageUrl,
        tokenIndex,
      });
    }
    return map;
  }, [bots]);
  
  // Get bots sorted by condition (lowest first), excluding bots already on missions
  const availableBots = useMemo(() => {
    return bots
      .filter(bot => !bot.activeMission) // Only bots not on missions
      .map(bot => {
        const tokenIndex = Number(bot.tokenIndex);
        const imageUrl = getBotAvatarUrl(bot);
        return {
          tokenIndex,
          name: bot.name || `Bot #${tokenIndex}`,
          condition: bot.stats?.condition !== undefined 
            ? Number(bot.stats.condition) 
            : 100,
          imageUrl,
        };
      })
      .sort((a, b) => a.condition - b.condition); // Lowest condition first
  }, [bots]);
  
  const userParts = Number(inventory?.universalParts ?? 0);
  
  // Handle purchase new slot
  const handlePurchaseSlot = async () => {
    try {
      const result = await purchaseSlot.mutateAsync();
      toast.success(`Purchased Bay ${result.bayId}!`);
      setShowPurchaseDialog(false);
      refetchBays();
      queryClient.invalidateQueries({ queryKey: ['userInventory'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to purchase bay slot');
    }
  };
  
  // Handle opening upgrade dialog
  const handleOpenUpgradeDialog = (bayId: number) => {
    const bay = bays.find(b => b.bayId === bayId);
    if (bay) {
      setUpgradeTargetBay(bay);
      setShowUpgradeDialog(true);
    }
  };
  
  // Handle upgrade bay
  const handleUpgradeBay = async (bayId: number) => {
    setShowUpgradeDialog(false);
    setUpgradingBayId(bayId);
    try {
      const result = await upgradeBay.mutateAsync(bayId);
      toast.success(`Started upgrade to ${result.newTierName}!`);
      refetchBays();
      queryClient.invalidateQueries({ queryKey: ['userInventory'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to start upgrade');
    } finally {
      setUpgradingBayId(null);
      setUpgradeTargetBay(null);
    }
  };
  
  // Handle complete upgrade
  const handleCompleteUpgrade = async (bayId: number) => {
    setCompletingBayId(bayId);
    try {
      const result = await completeUpgrade.mutateAsync(bayId);
      toast.success(`Upgraded to ${result.newTierName}! (${result.newRepairRate}/hr)`);
      refetchBays();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete upgrade');
    } finally {
      setCompletingBayId(null);
    }
  };
  
  // Handle opening bot select dialog
  const handleOpenBotSelect = (bayId: number) => {
    setSelectedBayId(bayId);
    setShowBotSelectDialog(true);
  };
  
  // Handle sending a bot to repair bay
  const handleSendBot = async (tokenIndex: number) => {
    setSendingBotIndex(tokenIndex);
    try {
      await startScavenging.mutateAsync({
        tokenIndex,
        zone: 'RepairBay',
      });
      const botName = availableBots.find(b => b.tokenIndex === tokenIndex)?.name || `Bot #${tokenIndex}`;
      toast.success(`${botName} sent to Repair Bay!`);
      setShowBotSelectDialog(false);
      setSelectedBayId(null);
      queryClient.invalidateQueries({ queryKey: ['my-bots'] });
      refetchBays();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send bot to repair bay');
    } finally {
      setSendingBotIndex(null);
    }
  };
  
  // Handle pulling a bot from repair bay
  const handlePullBot = async (tokenIndex: number) => {
    setPullingBotIndex(tokenIndex);
    try {
      await completeScavenging.mutateAsync(tokenIndex);
      const botName = allBotsMap.get(tokenIndex)?.name || `Bot #${tokenIndex}`;
      toast.success(`${botName} pulled from repair bay!`);
      queryClient.invalidateQueries({ queryKey: ['my-bots'] });
      queryClient.invalidateQueries({ queryKey: ['user-repair-bays'] });
      refetchBays();
    } catch (err: any) {
      toast.error(err.message || 'Failed to pull bot from repair bay');
    } finally {
      setPullingBotIndex(null);
    }
  };
  
  if (baysLoading || tiersLoading) {
    return (
      <div className="py-2">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading repair bays...
        </div>
      </div>
    );
  }
  
  // If no bays data yet, show initial state
  if (!baysData) {
    return (
      <div className="py-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1 mb-2">
          <Wrench className="h-3 w-3" />
          Repair Bays
        </h4>
        <p className="text-xs text-muted-foreground">
          Purchase repair bays to boost your repair rate when sending bots to Repair Bay zone.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 h-7 text-xs"
          onClick={() => setShowPurchaseDialog(true)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Get First Bay (5,000 parts)
        </Button>
      </div>
    );
  }
  
  const { bays, totalBays, maxBays, nextSlotCost, fallbackRepairRate, totalPartsInvested } = baysData;
  const canBuyMoreSlots = totalBays < maxBays && nextSlotCost;
  const canAffordSlot = nextSlotCost ? userParts >= nextSlotCost.parts : false;
  
  // Calculate total repair rate from all bays
  const totalRepairRate = bays.reduce((sum, bay) => sum + bay.repairRatePerHour, 0);
  
  return (
    <div className="py-2">
      {/* Header with toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left hover:bg-muted/50 rounded p-1 -m-1"
      >
        <div className="flex items-center gap-1">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <Wrench className="h-3 w-3 text-muted-foreground" />
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">
            Repair Bays ({totalBays}/{maxBays})
          </h4>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {totalRepairRate > 0 ? `${totalRepairRate}/hr` : `${fallbackRepairRate}/hr`}
        </span>
      </button>
      
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {/* Bay Cards */}
          {bays.length > 0 ? (
            <div className="space-y-2">
              {bays.map((bay) => (
                <RepairBayCard
                  key={bay.bayId}
                  bay={bay}
                  tiers={tiers || []}
                  onUpgrade={handleOpenUpgradeDialog}
                  onCompleteUpgrade={handleCompleteUpgrade}
                  onSendBot={handleOpenBotSelect}
                  onPullBot={handlePullBot}
                  isUpgrading={upgradingBayId === bay.bayId}
                  isCompleting={completingBayId === bay.bayId}
                  isPulling={bay.currentBotToken !== null && pullingBotIndex === bay.currentBotToken}
                  userParts={userParts}
                  hasBots={availableBots.length > 0}
                  occupyingBot={bay.currentBotToken !== null ? allBotsMap.get(bay.currentBotToken) || null : null}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No repair bays yet. Purchase one to boost repair rate!
            </p>
          )}
          
          {/* Purchase New Slot Button */}
          {canBuyMoreSlots && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-xs"
              onClick={() => setShowPurchaseDialog(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Bay ({formatParts(nextSlotCost!.parts)} parts{nextSlotCost!.icpE8s > 0n ? ` + ${Number(nextSlotCost!.icpE8s) / 100_000_000} ICP` : ''})
            </Button>
          )}
          
          {/* Summary Stats */}
          {totalPartsInvested > 0 && (
            <div className="text-[10px] text-muted-foreground/70 pt-1 border-t border-border/50">
              Total invested: {formatParts(totalPartsInvested)} parts
            </div>
          )}
        </div>
      )}
      
      {/* Purchase Slot Dialog */}
      <AlertDialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purchase Repair Bay Slot</AlertDialogTitle>
            <AlertDialogDescription>
              {nextSlotCost ? (
                <>
                  Purchase Bay {totalBays + 1} for <strong>{formatParts(nextSlotCost.parts)} parts</strong>
                  {nextSlotCost.icpE8s > 0n && <> + <strong>{Number(nextSlotCost.icpE8s) / 100_000_000} ICP</strong></>}?
                  <br /><br />
                  New bays start at Tier 1 (Salvage Station) with {tiers?.[0]?.repairRatePerHour ?? 5}/hr repair rate.
                  Upgrade through 16 tiers to reach maximum efficiency!
                  {!canAffordSlot && (
                    <span className="block mt-2 text-red-400">
                      You need {formatParts(Number(nextSlotCost.parts) - userParts)} more parts.
                    </span>
                  )}
                </>
              ) : (
                'No more slots available.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurchaseSlot}
              disabled={purchaseSlot.isPending || !canAffordSlot}
            >
              {purchaseSlot.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Purchasing...
                </>
              ) : (
                'Purchase'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Bot Select Dialog */}
      <Dialog open={showBotSelectDialog} onOpenChange={setShowBotSelectDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Send Bot to Repair Bay
            </DialogTitle>
            <DialogDescription>
              Select a bot to send. Bots are sorted by condition (lowest first).
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-y-auto space-y-1 py-2">
            {availableBots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No bots available. All your bots may be on missions.
              </p>
            ) : (
              availableBots.map((bot) => (
                <button
                  key={bot.tokenIndex}
                  onClick={() => handleSendBot(bot.tokenIndex)}
                  disabled={sendingBotIndex !== null}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={bot.imageUrl} alt={bot.name} />
                      <AvatarFallback className="text-[10px]">#{bot.tokenIndex.toString().slice(-2)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{bot.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={bot.condition < 30 ? 'destructive' : bot.condition < 60 ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {bot.condition}%
                    </Badge>
                    {sendingBotIndex === bot.tokenIndex ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Upgrade Bay Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-sm">
          {upgradeTargetBay && (() => {
            const nextTier = tiers?.find(t => t.tier === upgradeTargetBay.tier + 1);
            const canAfford = nextTier ? userParts >= nextTier.partsCost : false;
            const icpCost = nextTier ? Number(nextTier.icpCostE8s) / 100_000_000 : 0;
            
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ChevronUp className="w-5 h-5" />
                    Upgrade Bay {upgradeTargetBay.bayId}
                  </DialogTitle>
                  <DialogDescription>
                    Upgrade from T{upgradeTargetBay.tier} to T{upgradeTargetBay.tier + 1}
                  </DialogDescription>
                </DialogHeader>
                
                {nextTier && (
                  <div className="space-y-4 py-2">
                    {/* Next tier image */}
                    <div className="flex justify-center">
                      <div className="relative">
                        <img 
                          src={getTierImage(nextTier.tier)} 
                          alt={nextTier.name}
                          className="w-32 h-32 rounded-lg object-cover border-2 border-primary/50 shadow-lg"
                        />
                        <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground">
                          T{nextTier.tier}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Next tier name */}
                    <div className="text-center">
                      <h3 className="font-bold text-lg">{nextTier.name}</h3>
                    </div>
                    
                    {/* Stats comparison */}
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Repair Rate</div>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-sm text-muted-foreground">{upgradeTargetBay.repairRatePerHour}</span>
                          <span className="text-primary">→</span>
                          <span className="text-sm font-bold text-green-400">{nextTier.repairRatePerHour}/hr</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Power Draw</div>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-sm text-muted-foreground">{upgradeTargetBay.powerDrawWatts}W</span>
                          <span className="text-primary">→</span>
                          <span className="text-sm font-bold text-amber-400">{nextTier.powerDrawWatts}W</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Cost */}
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="text-xs text-muted-foreground mb-2 text-center">Upgrade Cost</div>
                      <div className="flex justify-center gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary">{formatParts(nextTier.partsCost)}</div>
                          <div className="text-xs text-muted-foreground">Parts</div>
                        </div>
                        {icpCost > 0 && (
                          <>
                            <div className="text-muted-foreground self-center">+</div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-amber-400">{icpCost}</div>
                              <div className="text-xs text-muted-foreground">ICP</div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground text-center mt-2">
                        Build time: {formatBuildTime(nextTier.buildTimeSeconds)}
                      </div>
                    </div>
                    
                    {/* Affordability warning */}
                    {!canAfford && (
                      <div className="text-sm text-red-400 text-center">
                        You need {formatParts(nextTier.partsCost - userParts)} more parts
                      </div>
                    )}
                  </div>
                )}
                
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleUpgradeBay(upgradeTargetBay.bayId)}
                    disabled={!canAfford || upgradeBay.isPending}
                    className="bg-green-600 hover:bg-green-500"
                  >
                    {upgradeBay.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Upgrading...
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Upgrade
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
