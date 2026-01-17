import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { BotListItem, generatetokenIdentifier } from '@pokedbots-racing/ic-js';
import { useAuth } from '../hooks/useAuth';
import { calculateDailyAffinity } from './DailyPhenomenonBanner';
import { 
  useInitializeBot,
  useRechargeBot,
  useRepairBot,
  useFullMaintenanceBot,
  useUpgradeBot,
  useListBotForSale,
  useUnlistBot,
  useTransferBot,
  useStartScavenging,
  useCompleteScavenging,
  useRespecBot,
  useEnterRace,
  useDedicationInfo,
} from '../hooks/useGarage';
import { useGetUpcomingEventsWithRaces, useRegisterForEvent, useUnregisterFromEvent } from '../hooks/useRacing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Battery, Wrench } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Slider } from './ui/slider';
import { getTerrainPreference, getTerrainIcon, getTerrainName, getFactionBonus, getFactionSpecialTerrain } from '../lib/utils';

interface BotCardProps {
  bot: BotListItem;
  onUpdate: () => void;
  enteringRaces: boolean;
  setEnteringRaces: (val: boolean) => void;
  rechargeCooldownMultiplier?: number;
  backgroundColor?: string;
  inventory?: {
    owner: string;
    speedChips: bigint;
    powerCoreFragments: bigint;
    thrusterKits: bigint;
    gyroModules: bigint;
    universalParts: bigint;
  };
}

// Convert upgrade type to display name
function getUpgradeDisplayName(upgradeType: string): string {
  const nameMap: Record<string, string> = {
    'Velocity': 'Speed',
    'velocity': 'Speed',
    'PowerCore': 'Power Core',
    'powerCore': 'Power Core',
    'Thruster': 'Acceleration',
    'thruster': 'Acceleration',
    'Gyro': 'Stability',
    'gyro': 'Stability',
  };
  return nameMap[upgradeType] || upgradeType;
}

// Get dedication tier badge (emoji + color for overlay)
function getDedicationBadge(tier: number): { emoji: string; bgColor: string; borderColor: string } | null {
  if (tier === 0) return null; // No badge for Rookie tier
  switch (tier) {
    case 1: return { emoji: '⭐', bgColor: 'bg-green-500', borderColor: 'border-green-400' };
    case 2: return { emoji: '🌟', bgColor: 'bg-blue-500', borderColor: 'border-blue-400' };
    case 3: return { emoji: '💫', bgColor: 'bg-purple-500', borderColor: 'border-purple-400' };
    case 4: return { emoji: '🏆', bgColor: 'bg-yellow-500', borderColor: 'border-yellow-400' };
    case 5: return { emoji: '👑', bgColor: 'bg-gradient-to-r from-pink-500 to-red-500', borderColor: 'border-pink-400' };
    default: return null;
  }
}

export function BotCard({ bot, onUpdate, enteringRaces, setEnteringRaces, rechargeCooldownMultiplier = 1.0, backgroundColor, inventory }: BotCardProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { user } = useAuth();
  
  // Fetch dedication info for badge display
  const { data: dedicationInfo } = useDedicationInfo(Number(bot.tokenIndex));
  
  // Fetch upcoming events for event registration
  const { data: upcomingEvents } = useGetUpcomingEventsWithRaces(7); // Next 7 days
  
  // Mutation hooks
  const initializeMutation = useInitializeBot();
  const rechargeMutation = useRechargeBot();
  const repairMutation = useRepairBot();
  const fullMaintenanceMutation = useFullMaintenanceBot();
  const upgradeMutation = useUpgradeBot();
  const listForSaleMutation = useListBotForSale();
  const unlistMutation = useUnlistBot();
  const transferMutation = useTransferBot();
  const startScavengingMutation = useStartScavenging();
  const completeScavengingMutation = useCompleteScavenging();
  const respecMutation = useRespecBot();
  const enterRaceMutation = useEnterRace();
  const registerForEventMutation = useRegisterForEvent();
  const unregisterFromEventMutation = useUnregisterFromEvent();

  
  const [showInitialize, setShowInitialize] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showListForSale, setShowListForSale] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showScavenging, setShowScavenging] = useState(false);
  const [showRespec, setShowRespec] = useState(false);
  const [upgradeType, setUpgradeType] = useState<'Velocity' | 'PowerCore' | 'Thruster' | 'Gyro'>('Velocity');
  const [paymentMethod, setPaymentMethod] = useState<'icp' | 'parts'>('parts');
  
  // Upgrade result state for dramatic reveal
  const [upgradeResult, setUpgradeResult] = useState<{
    success: boolean;
    isDouble: boolean;
    message: string;
    statName: string;
    pointsAwarded: number;
    roll: number;
    successRate: string;
    pityBonus: string;
    refund?: string;
  } | null>(null);
  const [showUpgradeResult, setShowUpgradeResult] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  
  const [scavengingZone, setScavengingZone] = useState<'ScrapHeaps' | 'AbandonedSettlements' | 'DeadMachineFields' | 'RepairBay' | 'ChargingStation'>('ScrapHeaps');
  const [scavengingDuration, setScavengingDuration] = useState<number | undefined>(15);
  const [botName, setBotName] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [statsToStrip, setStatsToStrip] = useState<Set<string>>(new Set());
  
  // Event registration state
  const [registeringEventId, setRegisteringEventId] = useState<number | null>(null);
  const [unregisteringEventId, setUnregisteringEventId] = useState<number | null>(null);
  const [withdrawConfirmEvent, setWithdrawConfirmEvent] = useState<any | null>(null);

  const handleInitialize = () => {
    initializeMutation.mutate(
      { tokenIndex: Number(bot.tokenIndex), name: botName || undefined },
      {
        onSuccess: (result) => {
          toast.success(result);
          setShowInitialize(false);
          setBotName('');
          onUpdate();
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Failed to initialize bot');
        },
      }
    );
  };

  const handleRecharge = () => {
    rechargeMutation.mutate(Number(bot.tokenIndex), {
      onSuccess: (result) => {
        toast.success(result);
        onUpdate();
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to recharge');
      },
    });
  };

  const handleRepair = () => {
    repairMutation.mutate(Number(bot.tokenIndex), {
      onSuccess: (result) => {
        toast.success(result);
        onUpdate();
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to repair');
      },
    });
  };

  const handleFullMaintenance = () => {
    fullMaintenanceMutation.mutate(Number(bot.tokenIndex), {
      onSuccess: (result) => {
        toast.success(result);
        onUpdate();
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to perform full maintenance');
      },
    });
  };

  const handleStartScavenging = () => {
    startScavengingMutation.mutate(
      { 
        tokenIndex: Number(bot.tokenIndex), 
        zone: scavengingZone, 
        duration: scavengingDuration 
      },
      {
        onSuccess: (result) => {
          toast.success(result);
          setShowScavenging(false);
          onUpdate();
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Failed to start scavenging');
        },
      }
    );
  };

  const handleCompleteScavenging = () => {
    completeScavengingMutation.mutate(Number(bot.tokenIndex), {
      onSuccess: (result) => {
        toast.success(result);
        onUpdate();
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to complete scavenging');
      },
    });
  };

  const handleRespec = () => {
    // Convert Set to array (empty array = strip all stats)
    const statsArray = Array.from(statsToStrip);
    respecMutation.mutate({ tokenIndex: Number(bot.tokenIndex), statsToStrip: statsArray }, {
      onSuccess: (result) => {
        toast.success(result);
        setShowRespec(false);
        setStatsToStrip(new Set()); // Reset selection
        onUpdate();
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to strip bot');
      },
    });
  };

  // Get V2 upgrade costs and success rates from backend data
  const getUpgradeInfo = () => {
    if (!bot.upgradeCostsV2) {
      // Fallback to old calculation if V2 data not available
      const currentCount = getCurrentUpgradeCount(upgradeType);
      const partsCost = getUpgradeCostInParts(currentCount);
      const icpCost = partsCost / 100;
      return {
        currentCount,
        icpCost: icpCost.toFixed(2),
        partsCost,
        successRate: '85%', // Default for first attempt
        pityBonus: '+0%',
      };
    }

    const typeKey = upgradeType === 'Velocity' ? 'speed' : 
                    upgradeType === 'PowerCore' ? 'powerCore' : 
                    upgradeType === 'Thruster' ? 'acceleration' : 'stability';
    
    const costData = bot.upgradeCostsV2[typeKey as keyof typeof bot.upgradeCostsV2];
    const currentCount = getCurrentUpgradeCount(upgradeType);
    const pityCounter = Number(bot.upgradeCostsV2.pityCounter || 0n);
    
    // Handle luck not being in upgradeCostsV2 yet (pre-deploy compatibility)
    // Pity bonus is capped at 25% (5 fails * 5% = 25%)
    const cappedPityBonus = Math.min(pityCounter * 5, 25);
    
    if (!costData || typeof costData === 'bigint') {
      const partsCost = getUpgradeCostInParts(currentCount);
      const icpCost = partsCost / 100;
      return {
        currentCount,
        icpCost: icpCost.toFixed(2),
        partsCost,
        successRate: '85%',
        pityBonus: '+' + cappedPityBonus + '%',
      };
    }
    
    return {
      currentCount,
      icpCost: (Number(costData.costE8s) / 100_000_000).toFixed(2),
      partsCost: Math.round(Number(costData.costE8s) / 1_000_000), // Convert e8s to parts equivalent
      successRate: costData.successRate.toFixed(1) + '%',
      pityBonus: '+' + cappedPityBonus + '%',
    };
  };

  const getCurrentUpgradeCount = (type: 'Velocity' | 'PowerCore' | 'Thruster' | 'Gyro'): number => {
    if (!bot.isInitialized || !bot.stats) return 0;
    const stats = bot.stats as any;
    switch (type) {
      case 'Velocity': return Number(stats.speedUpgrades || stats.speed_upgrades || 0n);
      case 'PowerCore': return Number(stats.powerCoreUpgrades || stats.power_core_upgrades || 0n);
      case 'Thruster': return Number(stats.accelerationUpgrades || stats.acceleration_upgrades || 0n);
      case 'Gyro': return Number(stats.stabilityUpgrades || stats.stability_upgrades || 0n);
      default: return 0;
    }
  };

  // Legacy V1 cost calculation (fallback only)
  const getUpgradeCostInParts = (upgradeCount: number): number => {
    if (upgradeCount === 0) return 100;
    if (upgradeCount === 1) return 200;
    if (upgradeCount === 2) return 300;
    if (upgradeCount === 3) return 900;
    if (upgradeCount === 4) return 2700;
    return 8100; // 5+ upgrades
  };

  const formatWorldBuff = () => {
    if (!stats?.worldBuff || stats.worldBuff.length === 0) return null;
    const buff = stats.worldBuff[0];
    const expiresAt = Number(buff.expiresAt) / 1_000_000; // Convert nanoseconds to milliseconds
    const now = Date.now();
    const remaining = expiresAt - now;
    
    if (remaining <= 0) return null; // Expired
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    // Format stat bonuses
    const statText = buff.stats.map(([stat, value]: [string, bigint]) => {
      return `+${value} ${stat.charAt(0).toUpperCase() + stat.slice(1)}`;
    }).join(', ');
    
    let timeText = '';
    if (hours > 0) {
      timeText = `${hours}h ${minutes}m remaining`;
    } else {
      timeText = `${minutes}m remaining`;
    }
    
    return { statText, timeText };
  };

  const handleUpgrade = async () => {
    try {
      setIsRolling(true);
      setShowUpgrade(false);
      
      // Convert string type to variant type
      const upgradeTypeVariant = { [upgradeType]: null } as any;
      const result = await upgradeMutation.mutateAsync({
        tokenIndex: Number(bot.tokenIndex),
        upgradeType: upgradeTypeVariant,
        paymentMethod,
      });
      
      // Parse the result message to extract details
      const resultText = result || '';
      const isSuccess = resultText.includes('SUCCESS') || resultText.includes('✅') || resultText.includes('DOUBLE WIN');
      // Only check for double if it's a success - avoid matching "+25%" pity bonus as "+2"
      const isDouble = isSuccess && (resultText.includes('+2 stat') || resultText.includes('DOUBLE WIN'));
      
      // Extract stat name from upgrade type
      const statNames: Record<string, string> = {
        Velocity: 'Speed',
        PowerCore: 'Power Core',
        Thruster: 'Acceleration',
        Gyro: 'Stability',
      };
      const statName = statNames[upgradeType] || upgradeType;
      
      // Extract roll info if available (format: "Roll: 45 < 85%")
      const rollMatch = resultText.match(/Roll:\s*(\d+)\s*[<>]\s*(\d+)%/);
      const roll = rollMatch ? parseInt(rollMatch[1]) : 0;
      const successRate = rollMatch ? `${rollMatch[2]}%` : '';
      
      // Extract pity bonus if mentioned
      const pityMatch = resultText.match(/pity\s*(\+\d+%)/i);
      const pityBonus = pityMatch ? pityMatch[1] : '';
      
      // Extract refund info if failed
      const refundMatch = resultText.match(/(Refunded|refund)[:\s]+([^.]+)/i);
      const refund = refundMatch ? refundMatch[2].trim() : undefined;
      
      setUpgradeResult({
        success: isSuccess,
        isDouble,
        message: resultText,
        statName,
        pointsAwarded: isDouble ? 2 : (isSuccess ? 1 : 0),
        roll,
        successRate,
        pityBonus,
        refund,
      });
      
      // Small delay to build anticipation
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsRolling(false);
      setShowUpgradeResult(true);
      
      onUpdate();
    } catch (err) {
      setIsRolling(false);
      toast.error(err instanceof Error ? err.message : 'Failed to upgrade');
    }
  };

  const handleListForSale = () => {
    const price = parseFloat(listPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    
    listForSaleMutation.mutate(
      { tokenIndex: Number(bot.tokenIndex), priceICP: price },
      {
        onSuccess: (result) => {
          toast.success(result);
          setShowListForSale(false);
          setListPrice('');
          onUpdate();
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Failed to list bot');
        },
      }
    );
  };

  const handleUnlist = () => {
    unlistMutation.mutate(Number(bot.tokenIndex), {
      onSuccess: (result) => {
        toast.success(result);
        onUpdate();
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to unlist bot');
      },
    });
  };

  const handleTransfer = () => {
    if (!transferTo.trim()) {
      toast.error('Please enter a recipient account ID');
      return;
    }
    
    transferMutation.mutate(
      { tokenIndex: Number(bot.tokenIndex), toAccountId: transferTo.trim() },
      {
        onSuccess: (result) => {
          toast.success(result);
          setShowTransfer(false);
          setTransferTo('');
          onUpdate();
        },
        onError: (err: Error) => {
          toast.error(err.message || 'Failed to transfer bot');
        },
      }
    );
  };

  const getFactionName = (faction: any): string => {
    if (!faction) return 'Unknown';
    return Object.keys(faction)[0] || 'Unknown';
  };

  const getFactionColor = (faction: any) => {
    const name = getFactionName(faction);
    switch (name) {
      case 'UltimateMaster':
      case 'Wild':
      case 'Golden':
      case 'Ultimate':
        return 'default'; // Ultra-rare
      case 'Blackhole':
      case 'Dead':
      case 'Master':
        return 'destructive'; // Super-rare
      case 'Bee':
      case 'Food':
      case 'Box':
      case 'Murder':
        return 'outline'; // Rare
      default:
        return 'secondary'; // Common
    }
  };

  const formatBigInt = (value: bigint) => Number(value).toLocaleString();

  const formatRelativeTime = (endTimeNanos: bigint): string => {
    const endTimeMs = Number(endTimeNanos) / 1_000_000;
    const now = Date.now();
    const diffMs = endTimeMs - now;
    
    if (diffMs <= 0) return 'Ready!';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  // Generate proper token identifier for image URL
  const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', Number(bot.tokenIndex));
  const imageUrl = `https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=${tokenId}&type=thumbnail`;

  // Check if bot needs registration: either not initialized OR initialized but owned by someone else
  const needsRegistration = !bot.isInitialized || (bot.stats && bot.stats.ownerPrincipal && user?.principal && bot.stats.ownerPrincipal.toText() !== user.principal);

  if (needsRegistration) {
    return (
      <Card className="border-dashed border-2 border-primary/20 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={imageUrl} alt={`Bot #${bot.tokenIndex}`} />
              <AvatarFallback>#{bot.tokenIndex.toString().slice(-2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-xl">Bot #{bot.tokenIndex.toString()}</span>
              <Badge variant="secondary" className="w-fit">{!bot.isInitialized ? 'Uninitialized' : 'Needs Re-registration'}</Badge>
            </div>
          </CardTitle>
          <CardDescription>
            {!bot.isInitialized 
              ? 'This bot needs to be registered for racing. Registration reveals faction and stats based on NFT traits.' 
              : 'Register this transferred bot to your account. Costs 0.1 ICP.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-name">Bot Name (Optional)</Label>
            <Input
              id="bot-name"
              placeholder="Enter a custom name"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              maxLength={30}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleInitialize}
              disabled={initializeMutation.isPending}
              className="flex-1"
            >
              {initializeMutation.isPending ? 'Processing Payment...' : 'Initialize (0.1 ICP + 0.0001 fee)'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = bot.stats!;
  const dedicationBadge = dedicationInfo ? getDedicationBadge(dedicationInfo.tier) : null;

  // Check for active world buff (full circle when active)
  const hasWorldBuff = stats?.worldBuff && stats.worldBuff.length > 0;
  
  // Check for overcharge/perfect tune-up
  const overcharge = Number(stats.overcharge);
  const maxOvercharge = 40;
  const overchargePercent = Math.round((overcharge / maxOvercharge) * 100);
  const isPerfectTuneUp = stats.perfectTuneUp === true;
  const hasOvercharge = overcharge > 0 || isPerfectTuneUp;

  return (
    <Card className="border-2 border-primary/20 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="relative overflow-visible">
            {/* Avatar with animated borders */}
            <div className="relative h-16 w-16 overflow-visible">
              {/* World Buff full circle border */}
              {hasWorldBuff && (
                <svg className="absolute w-[68px] h-[68px] z-20" style={{ left: '-2px', top: '-2px', filter: 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.6))' }}>
                  <circle
                    cx="34"
                    cy="34"
                    r="33"
                    fill="none"
                    stroke="rgb(168, 85, 247)"
                    strokeWidth="3"
                    className="animate-pulse"
                    style={{ animationDuration: '2s' }}
                  />
                </svg>
              )}
              
              {/* Overcharge/Perfect Tune-Up radial progress border */}
              {hasOvercharge && (
                <>
                  <svg className="absolute w-[68px] h-[68px] -rotate-90 z-20 pointer-events-none" style={{ left: '-2px', top: '-2px' }}>
                    {/* Background ring */}
                    <circle
                      cx="34"
                      cy="34"
                      r="33"
                      fill="none"
                      stroke={isPerfectTuneUp ? "rgba(251, 191, 36, 0.3)" : "rgba(6, 182, 212, 0.3)"}
                      strokeWidth="4"
                    />
                    {/* Progress ring */}
                    <circle
                      cx="34"
                      cy="34"
                      r="33"
                      fill="none"
                      stroke={isPerfectTuneUp ? "url(#goldGradient)" : "rgb(6, 182, 212)"}
                      strokeWidth="4"
                      strokeDasharray={`${(overchargePercent / 100) * 207.3} 207.3`}
                      strokeLinecap="round"
                      className={isPerfectTuneUp ? "animate-pulse" : "transition-all duration-1000"}
                      style={isPerfectTuneUp ? { animationDuration: '1.5s', filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.8))' } : { filter: 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.6))' }}
                    />
                    {isPerfectTuneUp && (
                      <defs>
                        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="rgb(251, 191, 36)" />
                          <stop offset="50%" stopColor="rgb(249, 115, 22)" />
                          <stop offset="100%" stopColor="rgb(251, 191, 36)" />
                        </linearGradient>
                      </defs>
                    )}
                  </svg>
                  {isPerfectTuneUp && (
                    <div className="absolute w-[68px] h-[68px] rounded-full animate-pulse z-20 pointer-events-none" style={{ 
                      left: '-2px',
                      top: '-2px',
                      boxShadow: '0 0 20px rgba(251, 191, 36, 0.5), inset 0 0 20px rgba(251, 191, 36, 0.2)',
                      animationDuration: '2s'
                    }} />
                  )}
                </>
              )}
              
              <Avatar className="h-16 w-16 relative z-10">
                <AvatarImage src={imageUrl} alt={bot.name || `Bot #${bot.tokenIndex}`} />
                <AvatarFallback>#{bot.tokenIndex.toString().slice(-2)}</AvatarFallback>
              </Avatar>
            </div>
            
            {dedicationBadge && (
              <div 
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${dedicationBadge.bgColor} border-2 ${dedicationBadge.borderColor} flex items-center justify-center text-xs shadow-lg z-20`}
                title={`${dedicationInfo?.tierName} - ${dedicationInfo?.totalDP.toLocaleString()} DP`}
              >
                {dedicationBadge.emoji}
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xl">{bot.name || `Bot #${bot.tokenIndex.toString()}`}</span>
              <Link
                to={`/bot/${bot.tokenIndex}`}
                className="text-xs text-primary hover:underline"
              >
                View Racing Details →
              </Link>
            </div>
            <Badge variant={getFactionColor(stats.faction)} className="w-fit">
              {getFactionName(stats.faction)}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription className="space-y-1">
          <div>
            ELO: {formatBigInt(stats.eloRating)} | Rating: {bot.currentStats ? ((Number(bot.currentStats.speed) + Number(bot.currentStats.powerCore) + Number(bot.currentStats.acceleration) + Number(bot.currentStats.stability)) / 4).toFixed(2) : '?'}/{bot.maxStats ? ((Number(bot.maxStats.speed) + Number(bot.maxStats.powerCore) + Number(bot.maxStats.acceleration) + Number(bot.maxStats.stability)) / 4).toFixed(2) : '100'} | Rep: {formatBigInt(stats.factionReputation)}
          </div>
          <div className="flex items-center gap-1 text-xs flex-wrap">
            <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400 px-2 py-0">
              {getTerrainIcon(getTerrainPreference(backgroundColor, getFactionName(stats.faction)))} {getTerrainName(getTerrainPreference(backgroundColor, getFactionName(stats.faction)))} (+5%)
            </Badge>
            {(() => {
              const factionTerrain = getFactionSpecialTerrain(getFactionName(stats.faction));
              return factionTerrain ? (
                <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 px-2 py-0">
                  {getTerrainIcon(factionTerrain.terrain)} {getTerrainName(factionTerrain.terrain)} ({factionTerrain.bonus})
                </Badge>
              ) : null;
            })()}
            <Badge variant="outline" className="border-blue-500/50 text-blue-600 dark:text-blue-400 px-2 py-0">
              ⚡ {getFactionBonus(getFactionName(stats.faction))}
            </Badge>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* World Buff Status */}
        {formatWorldBuff() && (
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-1">
            <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">✨ World Buff Active</p>
            <div className="text-xs space-y-1">
              <p className="font-medium">{formatWorldBuff()!.statText}</p>
              <p className="text-muted-foreground">{formatWorldBuff()!.timeText}</p>
            </div>
          </div>
        )}

        {/* Overcharge Status - Always visible to encourage usage */}
        {(() => {
          const overcharge = Number(stats.overcharge);
          const maxOvercharge = 40; // Max overcharge is 40 (capped in recharge logic)
          const percentOfMax = Math.round((overcharge / maxOvercharge) * 100);
          const perfectTuneUp = stats.perfectTuneUp === true;
          
          return (
            <div className={`p-3 rounded-lg space-y-2 ${
              perfectTuneUp
                ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 shadow-lg'
                : overcharge > 0 
                  ? 'bg-cyan-500/10 border border-cyan-500/30' 
                  : 'bg-muted/50 border border-muted'
            }`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-semibold ${
                  perfectTuneUp
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : overcharge > 0 
                      ? 'text-cyan-600 dark:text-cyan-400' 
                      : 'text-muted-foreground'
                }`}>
                  {perfectTuneUp ? '⚡ PERFECT TUNE-UP! ⚡' : '⚡ Overcharge'}
                </span>
                <span className={`text-sm font-bold ${
                  overcharge > 0 
                    ? 'text-cyan-600 dark:text-cyan-400' 
                    : 'text-muted-foreground'
                }`}>
                  {overcharge > 0 ? `${percentOfMax}%` : '0%'}
                </span>
              </div>
              <div className="w-full bg-cyan-900/20 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    perfectTuneUp 
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  }`}
                  style={{ width: `${percentOfMax}%` }}
                />
              </div>
              {perfectTuneUp ? (
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-yellow-700 dark:text-yellow-400">🎯 Jackpot! Next race boost:</p>
                  <div className="flex justify-between">
                    <span className="text-green-600 font-semibold">+{(overcharge * 0.20).toFixed(1)}% Speed</span>
                    <span className="text-green-600 font-semibold">+{(overcharge * 0.20).toFixed(1)}% Accel</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic">No penalties! Perfect timing on repair.</p>
                </div>
              ) : overcharge > 0 ? (
                <div className="text-xs space-y-0.5">
                  <p className="text-muted-foreground">Next race boost:</p>
                  <div className="flex justify-between">
                    <span className="text-green-600">+{(overcharge * 0.20).toFixed(1)}% Speed/Accel</span>
                    <span className="text-red-600">-{(overcharge * 0.133).toFixed(1)}% Power/Stab</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Recharge at low battery (&lt;30%) for overcharge bonus! Boosts speed/accel but reduces stability/power.</p>
              )}
            </div>
          );
        })()}

        {/* Current/Max Stats (pre-calculated by backend) */}
        {(() => {
          if (!bot.currentStats || !bot.maxStats) {
            // Fallback: show upgrade info when stats aren't available
            const speedUp = Number(stats.speedUpgrades || 0);
            const powerUp = Number(stats.powerCoreUpgrades || 0);
            const accelUp = Number(stats.accelerationUpgrades || 0);
            const stabUp = Number(stats.stabilityUpgrades || 0);
            const luck = Number(stats.luckBase || 0n) + Number(stats.luckBonus || 0n) || Math.floor((Number(bot.tokenIndex) % 100) / 2) + 10;
            
            return (
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  View full stats on detail page →
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between items-center p-2 bg-card/80 border border-primary/20 rounded">
                    <span className="text-muted-foreground">⚡ Speed</span>
                    <span className="font-bold">{speedUp > 0 ? `${speedUp} upgrades` : 'Base'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-card/80 border border-primary/20 rounded">
                    <span className="text-muted-foreground">💪 Power</span>
                    <span className="font-bold">{powerUp > 0 ? `${powerUp} upgrades` : 'Base'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-card/80 border border-primary/20 rounded">
                    <span className="text-muted-foreground">🚀 Accel</span>
                    <span className="font-bold">{accelUp > 0 ? `${accelUp} upgrades` : 'Base'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-card/80 border border-primary/20 rounded">
                    <span className="text-muted-foreground">🎯 Stability</span>
                    <span className="font-bold">{stabUp > 0 ? `${stabUp} upgrades` : 'Base'}</span>
                  </div>
                  <div className="col-span-2 flex justify-between items-center p-2 bg-card/80 border border-primary/20 rounded">
                    <span className="text-muted-foreground">🍀 Luck</span>
                    <span className="font-bold">{luck}</span>
                  </div>
                </div>
              </div>
            );
          }
          
          // Use pre-calculated stats from backend (includes battery/condition penalties)
          const currentSpeed = Number(bot.currentStats.speed);
          const currentPower = Number(bot.currentStats.powerCore);
          const currentAccel = Number(bot.currentStats.acceleration);
          const currentStability = Number(bot.currentStats.stability);
          
          const maxSpeed = Number(bot.maxStats.speed);
          const maxPower = Number(bot.maxStats.powerCore);
          const maxAccel = Number(bot.maxStats.acceleration);
          const maxStability = Number(bot.maxStats.stability);
          
          // Calculate luck from stats (not affected by battery/condition)
          const luck = bot.stats ? Number(bot.stats.luckBase || 0n) + Number(bot.stats.luckBonus || 0n) : Math.floor((Number(bot.tokenIndex) % 100) / 2) + 10;
          
          // Get faction from stats (Candid enum format)
          let factionName = 'Unknown';
          if (bot.stats?.faction) {
            const factionKeys = Object.keys(bot.stats.faction);
            if (factionKeys.length > 0) {
              factionName = factionKeys[0];
            }
          }
          
          // Calculate daily affinity (needed for effective luck)
          const affinity = calculateDailyAffinity(
            Number(bot.tokenIndex),
            { speed: maxSpeed, powerCore: maxPower, acceleration: maxAccel, stability: maxStability, luck },
            factionName
          );
          
          // Effective luck tier = (luck + affinity) / 2, as used in simulator
          const effectiveLuck = Math.floor((luck + affinity) / 2);
          
          // Penalty detection based on battery/condition thresholds (not stat comparisons)
          // Battery < 80 = speed/acceleration penalties
          // Condition < 90 = powerCore/stability penalties
          const battery = bot.stats ? Number(bot.stats.battery) : 100;
          const condition = bot.stats ? Number(bot.stats.condition) : 100;
          const isPenalized = battery < 80 || condition < 90;
          
          return (
            <div className="space-y-2">
              {/* Racing Stats (used for rating) */}
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center p-2 bg-card/80 border border-primary/20 rounded-lg">
                  <span className="text-xl mb-1">⚡</span>
                  <span className="text-xs text-muted-foreground">Speed</span>
                  <span className={`text-base font-bold ${battery < 80 ? 'text-yellow-500' : ''}`}>
                    {currentSpeed}
                  </span>
                  <span className="text-xs text-muted-foreground">/{maxSpeed}</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-card/80 border border-primary/20 rounded-lg">
                  <span className="text-xl mb-1">💪</span>
                  <span className="text-xs text-muted-foreground">Power</span>
                  <span className={`text-base font-bold ${condition < 90 ? 'text-yellow-500' : ''}`}>
                    {currentPower}
                  </span>
                  <span className="text-xs text-muted-foreground">/{maxPower}</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-card/80 border border-primary/20 rounded-lg">
                  <span className="text-xl mb-1">🚀</span>
                  <span className="text-xs text-muted-foreground">Accel</span>
                  <span className={`text-base font-bold ${battery < 80 ? 'text-yellow-500' : ''}`}>
                    {currentAccel}
                  </span>
                  <span className="text-xs text-muted-foreground">/{maxAccel}</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-card/80 border border-primary/20 rounded-lg">
                  <span className="text-xl mb-1">🎯</span>
                  <span className="text-xs text-muted-foreground">Stability</span>
                  <span className={`text-base font-bold ${condition < 90 ? 'text-yellow-500' : ''}`}>
                    {currentStability}
                  </span>
                  <span className="text-xs text-muted-foreground">/{maxStability}</span>
                </div>
              </div>

              {/* Luck Section (separate - not part of rating) */}
              <div className="p-2 rounded-lg border border-green-500/30 bg-gradient-to-r from-green-500/5 to-emerald-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🍀</span>
                    <div>
                      <span className="text-xs font-medium text-green-400">Luck</span>
                      <span className="text-[10px] text-muted-foreground ml-1">(not in rating)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">Base: </span>
                      <span className="font-bold">{luck}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">Effective: </span>
                      <span className={`font-bold ${effectiveLuck > luck ? 'text-green-400' : effectiveLuck < luck ? 'text-orange-400' : ''}`}>
                        {effectiveLuck}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {isPenalized && (
                <p className="text-xs text-yellow-500 text-center">
                  ⚠️ Stats penalized by low {battery < 80 && condition < 90 ? 'battery & condition' : battery < 80 ? 'battery' : 'condition'}
                </p>
              )}
            </div>
          );
        })()}

        {/* Battery & Condition */}
        <div className={`p-3 rounded-lg border space-y-3 ${
          Number(stats.battery) < 30 || Number(stats.condition) < 30
            ? 'bg-destructive/10 border-destructive/30' 
            : 'bg-card/80 border-muted'
        }`}>
          {bot.activeMission && (Number(stats.battery) === 0 || Number(stats.condition) === 0) && (
            <div className="p-2 bg-red-500/20 border border-red-500/50 rounded text-xs text-red-600 dark:text-red-400">
              ⚠️ <strong>BOT DEAD:</strong> Retrieve now to collect remaining rewards before mission fails!
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Battery className={`h-4 w-4 ${Number(stats.battery) < 30 ? 'text-destructive' : 'text-blue-500'}`} />
                <span className="text-sm font-semibold text-muted-foreground">Battery</span>
              </div>
              <span className={`text-sm font-bold ${Number(stats.battery) < 30 ? 'text-destructive' : 'text-blue-500'}`}>
                {formatBigInt(stats.battery)}%
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 relative">
              <div
                className={`h-2 rounded-full transition-all ${
                  Number(stats.battery) < 30 ? 'bg-destructive' : 'bg-blue-500'
                }`}
                style={{ width: `${Number(stats.battery)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className={`h-4 w-4 ${Number(stats.condition) < 30 ? 'text-destructive' : 'text-green-500'}`} />
                <span className="text-sm font-semibold text-muted-foreground">Condition</span>
              </div>
              <span className={`text-sm font-bold ${Number(stats.condition) < 30 ? 'text-destructive' : 'text-green-500'}`}>
                {formatBigInt(stats.condition)}%
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 relative">
              <div
                className={`h-2 rounded-full transition-all ${
                  Number(stats.condition) < 30 ? 'bg-destructive' : 'bg-green-500'
                }`}
                style={{ width: `${Number(stats.condition)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Maintenance Actions */}
        <div className="space-y-2">
          {(() => {
            // Format time remaining for cooldown display
            const formatTimeRemaining = (timestampMs: number): string => {
              const now = Date.now();
              const diffMs = timestampMs - now;
              
              if (diffMs <= 0) return 'Ready';
              
              const diffMinutes = Math.floor(diffMs / (1000 * 60));
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              
              if (diffHours > 0) return `${diffHours}h ${diffMinutes % 60}m`;
              if (diffMinutes > 0) return `${diffMinutes}m`;
              return '< 1m';
            };

            // Check cooldowns
            const now = Date.now();
            // Apply both garage-wide synergy AND bot's individual dedication bonus
            const dedicationRechargeMult = dedicationInfo?.benefits.rechargeCooldownMult ?? 1.0;
            const dedicationRepairMult = dedicationInfo?.benefits.repairCooldownMult ?? 1.0;
            const rechargeCooldownMs = 6 * 60 * 60 * 1000 * rechargeCooldownMultiplier * dedicationRechargeMult; // 6 hours * garage synergy * dedication bonus
            const rechargeReady = stats.lastRecharged 
              ? Number(stats.lastRecharged) / 1_000_000 + rechargeCooldownMs
              : 0;
            const repairCooldownMs = 3 * 60 * 60 * 1000 * dedicationRepairMult; // 3 hours * dedication bonus
            const repairReady = stats.lastRepaired
              ? Number(stats.lastRepaired) / 1_000_000 + repairCooldownMs
              : 0;
            const rechargeCooldown = rechargeReady > now;
            const repairCooldown = repairReady > now;

            return (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleRecharge}
                    disabled={rechargeMutation.isPending || Number(stats.battery) >= 100 || !!bot.activeMission || rechargeCooldown}
                    size="sm"
                    variant="outline"
                    title={
                      bot.activeMission 
                        ? "Cannot recharge while scavenging" 
                        : rechargeCooldown 
                          ? "Recharge on cooldown" 
                          : ""
                    }
                  >
                  {rechargeMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-1">⚡</span>
                      Recharging...
                    </>
                  ) : (
                    '🔋 Recharge'
                  )}
                  </Button>
                  <Button
                    onClick={handleRepair}
              disabled={repairMutation.isPending || Number(stats.condition) >= 100 || !!bot.activeMission || repairCooldown}
              size="sm"
              variant="outline"
              title={
                bot.activeMission 
                  ? "Cannot repair while scavenging" 
                  : repairCooldown 
                    ? "Repair on cooldown" 
                    : ""
              }
                  >
                  {repairMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-1">🔧</span>
                      Repairing...
                    </>
                  ) : (
                    '🔧 Repair'
                  )}
                  </Button>
                </div>
          
                {/* Full Maintenance Button */}
                {!bot.activeMission && (
                  <Button
                    onClick={handleFullMaintenance}
                    disabled={fullMaintenanceMutation.isPending || rechargeCooldown || repairCooldown || (Number(stats.battery) >= 100 && Number(stats.condition) >= 100)}
                    size="sm"
                    variant="secondary"
                    className="w-full"
                  >
                  {fullMaintenanceMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⚙️</span>
                      Full Maintenance...
                    </>
                  ) : (
                    '⚙️ Full Maintenance (0.15 ICP)'
                  )}
                  </Button>
                )}
          
                {/* Helper text when maintenance is disabled */}
                {bot.activeMission && (
                  <p className="text-xs text-muted-foreground text-center">⚠️ Maintenance unavailable while scavenging</p>
                )}
                {(rechargeCooldown || repairCooldown) && (
                  <p className="text-xs text-muted-foreground text-center">
                    ⏳ {rechargeCooldown && `Recharge (${formatTimeRemaining(rechargeReady)})`}{rechargeCooldown && repairCooldown && " & "}{repairCooldown && `Repair (${formatTimeRemaining(repairReady)})`} on cooldown
                  </p>
                )}
              </>
            );
          })()}
        </div>

{(() => {
          const upgradeInfo = getUpgradeInfo();
          const pityCounter = Number(bot.upgradeCostsV2?.pityCounter || 0n);
          
          // Upgrades are now instant - show upgrade info card
          return (
            <div className="p-3 bg-muted/30 border border-muted rounded-lg space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">⚡ Stat Upgrades</p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Cost (ICP):</span>
                  <span className="font-medium text-primary">{upgradeInfo.icpCost} ICP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Cost (Parts):</span>
                  <span className="font-medium text-primary">{upgradeInfo.partsCost} parts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Success Rate:</span>
                  <span className="font-medium text-green-600">{upgradeInfo.successRate}</span>
                </div>
                {pityCounter > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pity Bonus:</span>
                    <span className="font-medium text-blue-600">{upgradeInfo.pityBonus}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                💡 Instant upgrades with RNG. Pay with ICP or parts from scavenging!
              </p>
              <Button
                onClick={() => setShowUpgrade(true)}
                disabled={upgradeMutation.isPending}
                size="sm"
                className="w-full"
                variant="default"
              >
                ⚡ Upgrade Now
              </Button>
            </div>
          );
        })()}

        {/* Scavenging Section - V2 Continuous */}
        {(() => {
          if (bot.activeMission) {
            // Active mission state
            const mission = bot.activeMission;
            const startTimeMs = Number(mission.startTime) / 1_000_000;
            const elapsedHours = Math.floor((Date.now() - startTimeMs) / (1000 * 60 * 60));
            const elapsedMinutes = Math.floor((Date.now() - startTimeMs) / (1000 * 60)) % 60;
            
            // Calculate total pending parts
            const totalPending = Number(mission.pendingParts.speedChips) + 
                                 Number(mission.pendingParts.powerCoreFragments) + 
                                 Number(mission.pendingParts.thrusterKits) + 
                                 Number(mission.pendingParts.gyroModules) + 
                                 Number(mission.pendingParts.universalParts);
            
            return (
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">🔍 Scavenging in Progress</p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zone:</span>
                    <span className="font-medium">{Object.keys(mission.zone)[0]}</span>
                  </div>
                  {mission.durationMinutes && mission.durationMinutes.length > 0 && (() => {
                    const duration = Number(mission.durationMinutes[0]);
                    const endTime = Number(mission.startTime) / 1_000_000 + (duration * 60 * 1000);
                    const remaining = Math.max(0, endTime - Date.now());
                    const remainingMinutes = Math.floor(remaining / 60000);
                    const remainingHours = Math.floor(remainingMinutes / 60);
                    const remainingMins = remainingMinutes % 60;
                    
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium">
                            {duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? (duration % 60) + 'm' : ''}`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time Remaining:</span>
                          <span className="font-medium text-orange-600">
                            {remaining <= 0 ? 'Complete!' : remainingHours > 0 ? `${remainingHours}h ${remainingMins}m` : `${remainingMins}m`}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time Elapsed:</span>
                    <span className="font-medium">
                      {elapsedHours > 0 ? `${elapsedHours}h ${elapsedMinutes}m` : `${elapsedMinutes}m`}
                    </span>
                  </div>
                  {Object.keys(mission.zone)[0] === 'RepairBay' ? (
                    // RepairBay shows condition restored from backend
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Condition Restored:</span>
                      <span className={`font-bold ${Number(mission.pendingConditionRestored) > 0 ? 'text-green-600' : ''}`}>
                        +{Number(mission.pendingConditionRestored)}
                      </span>
                    </div>
                  ) : Object.keys(mission.zone)[0] === 'ChargingStation' ? (
                    // ChargingStation shows battery restored from backend
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Battery Restored:</span>
                      <span className={`font-bold ${Number(mission.pendingBatteryRestored) > 0 ? 'text-cyan-600' : ''}`}>
                        +{Number(mission.pendingBatteryRestored)}
                      </span>
                    </div>
                  ) : (
                    // Other zones show parts
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pending Parts:</span>
                        <span className={`font-bold ${totalPending > 0 ? 'text-orange-600' : ''}` }>
                          {totalPending}
                        </span>
                      </div>
                      {totalPending > 0 && (
                        <div className="text-xs text-muted-foreground pt-1 space-y-0.5">
                          {Number(mission.pendingParts.speedChips) > 0 && <div>⚡ {Number(mission.pendingParts.speedChips)} Speed Chips</div>}
                          {Number(mission.pendingParts.powerCoreFragments) > 0 && <div>💪 {Number(mission.pendingParts.powerCoreFragments)} Power Fragments</div>}
                          {Number(mission.pendingParts.thrusterKits) > 0 && <div>🚀 {Number(mission.pendingParts.thrusterKits)} Thruster Kits</div>}
                          {Number(mission.pendingParts.gyroModules) > 0 && <div>🎯 {Number(mission.pendingParts.gyroModules)} Gyro Modules</div>}
                          {Number(mission.pendingParts.universalParts) > 0 && <div>✨ {Number(mission.pendingParts.universalParts)} Universal</div>}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <Button
                  onClick={handleCompleteScavenging}
                  disabled={completeScavengingMutation.isPending}
                  size="sm"
                  className="w-full"
                  variant="outline"
                >
                  {completeScavengingMutation.isPending ? 'Retrieving...' : Object.keys(mission.zone)[0] === 'RepairBay' ? '🏠 Retrieve Bot' : Object.keys(mission.zone)[0] === 'ChargingStation' ? '🔌 Retrieve Bot' : '🏠 Retrieve Bot & Collect Parts'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {Object.keys(mission.zone)[0] === 'RepairBay' 
                    ? '💡 Condition restores continuously. Retrieve anytime!'
                    : Object.keys(mission.zone)[0] === 'ChargingStation'
                      ? '💡 Battery restores continuously. Retrieve anytime!'
                      : '💡 Parts accumulate continuously. Retrieve anytime!'}
                </p>
              </div>
            );
          } else {
            // Idle state - show send button
            return (
              <div className="p-3 bg-muted/30 border border-muted rounded-lg space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">🔍 Scavenging</p>
                <p className="text-xs text-muted-foreground">
                  Send your bot to scavenge for parts. Parts accumulate continuously over time!
                </p>
                <Button
                  onClick={() => setShowScavenging(true)}
                  disabled={startScavengingMutation.isPending}
                  size="sm"
                  className="w-full"
                  variant="default"
                >
                  🔍 Send Bot Out
                </Button>
              </div>
            );
          }
        })()}

        {/* Last Mission Rewards Summary */}
        {bot.stats?.lastMissionRewards && bot.stats.lastMissionRewards.length > 0 && (() => {
          const reward = bot.stats.lastMissionRewards[0];
          const totalParts = Number(reward.totalParts);
          const completedAt = new Date(Number(reward.completedAt) / 1_000_000);
          const timeAgo = Math.floor((Date.now() - completedAt.getTime()) / (1000 * 60));
          const zoneName = Object.keys(reward.zone)[0];
          
          // Determine what to display based on zone type
          const isRepairBay = zoneName === 'RepairBay';
          const isChargingStation = zoneName === 'ChargingStation';
          
          // Format duration - show minutes if less than 1 hour
          const hoursOut = Number(reward.hoursOut);
          const durationText = hoursOut === 0 ? 
            '<1h' : 
            hoursOut === 1 ? '1h' : `${hoursOut}h`;
          
          return (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">✅ Last Mission Complete</p>
                <span className="text-xs text-muted-foreground">
                  {timeAgo < 60 ? `${timeAgo}m ago` : timeAgo < 1440 ? `${Math.floor(timeAgo / 60)}h ago` : `${Math.floor(timeAgo / 1440)}d ago`}
                </span>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Zone:</span>
                  <span className="font-medium">{zoneName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{durationText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {isRepairBay ? 'Condition Restored:' : isChargingStation ? 'Battery Restored:' : 'Total Collected:'}
                  </span>
                  <span className="font-bold text-green-600">
                    {isRepairBay ? `${Number(reward.conditionRestored || 0)} condition` : 
                     isChargingStation ? `${Number(reward.batteryRestored || 0)} battery` : 
                     `${totalParts} parts`}
                  </span>
                </div>
                {!isRepairBay && !isChargingStation && totalParts > 0 && (
                  <div className="text-xs text-muted-foreground pt-1 space-y-0.5 border-t border-muted/50 mt-2">
                    {Number(reward.speedChips) > 0 && <div>⚡ {Number(reward.speedChips)} Speed Chips</div>}
                    {Number(reward.powerCoreFragments) > 0 && <div>💪 {Number(reward.powerCoreFragments)} Power Fragments</div>}
                    {Number(reward.thrusterKits) > 0 && <div>🚀 {Number(reward.thrusterKits)} Thruster Kits</div>}
                    {Number(reward.gyroModules) > 0 && <div>🎯 {Number(reward.gyroModules)} Gyro Modules</div>}
                    {Number(reward.universalParts) > 0 && <div>✨ {Number(reward.universalParts)} Universal Parts</div>}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Event Registration Section */}
        {(() => {
          // Helper functions for events
          const formatICP = (amount: bigint): string => {
            const icp = Number(amount) / 100_000_000;
            return icp.toFixed(2) + ' ICP';
          };

          const getRaceClassName = (raceClass: any): string => {
            if (!raceClass) return 'Unknown';
            if ('Scrap' in raceClass) return 'Scrap';
            if ('Junker' in raceClass) return 'Junker';
            if ('Raider' in raceClass) return 'Raider';
            if ('Elite' in raceClass) return 'Elite';
            if ('SilentKlan' in raceClass) return 'Silent Klan';
            return 'Unknown';
          };

          const getClassRatingRange = (raceClass: any): string => {
            if (!raceClass) return '';
            if ('Scrap' in raceClass) return '0-19';
            if ('Junker' in raceClass) return '20-29';
            if ('Raider' in raceClass) return '30-39';
            if ('Elite' in raceClass) return '40-49';
            if ('SilentKlan' in raceClass) return '50+';
            return '';
          };

          // Calculate bracket-scaled entry fee (shifted up one bracket)
          const calculateBracketEntryFee = (baseEntryFee: bigint, raceClass: any): bigint => {
            const base = Number(baseEntryFee);
            let multiplier = 1.0;
            
            if ('Scrap' in raceClass) multiplier = 1.0;
            else if ('Junker' in raceClass) multiplier = 1.5;
            else if ('Raider' in raceClass) multiplier = 2.0;
            else if ('Elite' in raceClass) multiplier = 2.5;
            else if ('SilentKlan' in raceClass) multiplier = 3.0;
            
            return BigInt(Math.floor(base * multiplier));
          };

          // Calculate refund percentage based on cancellation deadlines
          const getRefundInfo = (event: any): { percentage: number; refundAmount: bigint; penalty: number } => {
            const nowNs = BigInt(Date.now() * 1_000_000); // Convert to nanoseconds
            const registration = event.registrations?.find((r: any) => Number(r.tokenIndex) === Number(bot.tokenIndex));
            const entryFee = calculateBracketEntryFee(BigInt(event.metadata?.entryFee || 0), registration?.raceClass);
            
            if (nowNs <= event.cancellationDeadlines?.fullRefund) {
              return { percentage: 100, refundAmount: entryFee, penalty: 0 };
            } else if (nowNs <= event.cancellationDeadlines?.halfRefund) {
              return { percentage: 50, refundAmount: entryFee / 2n, penalty: 50 };
            } else if (nowNs <= event.cancellationDeadlines?.quarterRefund) {
              return { percentage: 25, refundAmount: entryFee / 4n, penalty: 75 };
            } else {
              return { percentage: 0, refundAmount: 0n, penalty: 100 };
            }
          };

          const isBotEligibleForClass = (raceClass: any): boolean => {
            if (!bot.maxStats) return false;
            const rating = Math.floor(
              (Number(bot.maxStats.speed) + Number(bot.maxStats.powerCore) + 
               Number(bot.maxStats.acceleration) + Number(bot.maxStats.stability)) / 4
            );
            
            if ('Scrap' in raceClass) return rating < 20;
            if ('Junker' in raceClass) return rating >= 20 && rating < 30;
            if ('Raider' in raceClass) return rating >= 30 && rating < 40;
            if ('Elite' in raceClass) return rating >= 40 && rating < 50;
            if ('SilentKlan' in raceClass) return rating >= 50;
            return false;
          };

          const now = Date.now() * 1_000_000; // Convert to nanoseconds

          // Extract events from the { event, raceSummary } wrapper
          const allEvents = (upcomingEvents || []).map((item: any) => item.event);

          // Filter events where registration is open, races haven't been created yet, and sort by scheduled time
          const eventsWithOpenRegistration = allEvents
            .filter((event: any) => {
              const regOpens = Number(event.registrationOpens);
              const regCloses = Number(event.registrationCloses);
              const hasNoRacesYet = !event.raceIds || event.raceIds.length === 0;
              return regOpens < now && regCloses > now && hasNoRacesYet;
            })
            .sort((a: any, b: any) => Number(a.scheduledTime) - Number(b.scheduledTime));

          // Find events this bot is registered for
          const botRegisteredEvents = eventsWithOpenRegistration.filter((event: any) => {
            const registrations = event.registrations || [];
            return registrations.some((reg: any) => 
              Number(reg.tokenIndex) === Number(bot.tokenIndex)
            );
          });

          // Find events this bot is eligible for but not registered
          const botEligibleEvents = eventsWithOpenRegistration.filter((event: any) => {
            const registrations = event.registrations || [];
            const isRegistered = registrations.some((reg: any) => 
              Number(reg.tokenIndex) === Number(bot.tokenIndex)
            );
            if (isRegistered) return false;
            
            // Check if bot is eligible for any division
            const divisions = event.metadata?.divisions || [];
            return divisions.some((division: any) => isBotEligibleForClass(division));
          });

          const handleRegisterForEvent = async (eventId: number) => {
            if (!user || !bot.maxStats) return;
            
            setRegisteringEventId(eventId);
            
            registerForEventMutation.mutate(
              { eventId, tokenIndex: Number(bot.tokenIndex) },
              {
                onSuccess: () => {
                  toast.success('Successfully registered for event!');
                  setRegisteringEventId(null);
                  onUpdate();
                },
                onError: (error: any) => {
                  toast.error(error.message || 'Failed to register for event');
                  setRegisteringEventId(null);
                },
              }
            );
          };

          const handleUnregisterFromEvent = async (eventId: number) => {
            if (!user) return;
            
            setUnregisteringEventId(eventId);
            
            unregisterFromEventMutation.mutate(
              { eventId, tokenIndex: Number(bot.tokenIndex) },
              {
                onSuccess: (result: any) => {
                  const refundMsg = result?.refundE8s 
                    ? ` Refund: ${(Number(result.refundE8s) / 100_000_000).toFixed(4)} ICP`
                    : '';
                  toast.success(`Withdrawn from event!${refundMsg}`);
                  setUnregisteringEventId(null);
                  onUpdate();
                },
                onError: (error: any) => {
                  toast.error(error.message || 'Failed to withdraw from event');
                  setUnregisteringEventId(null);
                },
              }
            );
          };

          // Don't show section if no events available
          if (eventsWithOpenRegistration.length === 0) {
            return null;
          }

          return (
            <>
            <div className="space-y-2">
              {/* Registered Events */}
              {botRegisteredEvents.length > 0 && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    📅 Registered Events ({botRegisteredEvents.length})
                  </p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {botRegisteredEvents.map((event: any) => {
                      const registration = (event.registrations || []).find(
                        (reg: any) => Number(reg.tokenIndex) === Number(bot.tokenIndex)
                      );
                      
                      return (
                        <div
                          key={event.eventId}
                          className="p-2 rounded bg-green-500/5 flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/schedule/${event.eventId}`}
                              className="text-xs text-foreground hover:text-primary transition-colors block truncate font-medium"
                            >
                              {event.metadata?.name || `Event #${event.eventId}`}
                            </Link>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{getRaceClassName(registration?.raceClass)} Division</span>
                              <span>•</span>
                              <span>{formatICP(calculateBracketEntryFee(BigInt(event.metadata?.entryFee || 0), registration?.raceClass))}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              🏁 Starts {formatRelativeTime(BigInt(event.scheduledTime))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setWithdrawConfirmEvent(event)}
                            disabled={unregisteringEventId === Number(event.eventId)}
                            className="ml-2 text-xs h-7"
                          >
                            {unregisteringEventId === Number(event.eventId) ? '...' : 'Withdraw'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Eligible Events */}
              {botEligibleEvents.length > 0 && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      📅 Available Events ({botEligibleEvents.length})
                    </p>
                    {botEligibleEvents.length > 1 && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={async () => {
                          if (!user || !bot.maxStats) return;
                          
                          let successCount = 0;
                          let failCount = 0;
                          
                          for (const event of botEligibleEvents) {
                            try {
                              setRegisteringEventId(Number(event.eventId));
                              await registerForEventMutation.mutateAsync({
                                eventId: Number(event.eventId),
                                tokenIndex: Number(bot.tokenIndex),
                              });
                              successCount++;
                            } catch (error: any) {
                              console.error(`Failed to register for event ${event.eventId}:`, error);
                              failCount++;
                            }
                          }
                          
                          setRegisteringEventId(null);
                          
                          if (successCount > 0) {
                            toast.success(`Registered for ${successCount} event${successCount > 1 ? 's' : ''}!`);
                            onUpdate();
                          }
                          if (failCount > 0) {
                            toast.error(`Failed to register for ${failCount} event${failCount > 1 ? 's' : ''}`);
                          }
                        }}
                        disabled={registeringEventId !== null}
                        className="text-xs h-7 px-3"
                      >
                        {registeringEventId !== null ? 'Registering...' : 'Register All'}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {botEligibleEvents.map((event: any) => {
                      const divisions = event.metadata?.divisions || [];
                      const eligibleDivisions = divisions.filter((div: any) => isBotEligibleForClass(div));
                      const firstEligible = eligibleDivisions[0];
                      
                      // Get terrain and distance info from race creation mode
                      const raceMode = event.raceCreationMode;
                      const terrains = raceMode?.Automatic?.terrains || raceMode?.Manual?.raceTemplates?.map((t: any) => t.terrain) || [];
                      const uniqueTerrains = [...new Set(terrains.map((t: any) => {
                        if ('ScrapHeaps' in t) return '🔩';
                        if ('WastelandSand' in t) return '🏜️';
                        if ('MetalRoads' in t) return '🛣️';
                        return '🏁';
                      }))];
                      
                      // Get distance info
                      let distanceText = '';
                      if (raceMode?.Automatic?.distanceRange) {
                        const { min, max } = raceMode.Automatic.distanceRange;
                        distanceText = min === max ? `${min}km` : `${min}-${max}km`;
                      } else if (raceMode?.Manual?.raceTemplates?.length > 0) {
                        const distances = raceMode.Manual.raceTemplates.map((t: any) => Number(t.distance));
                        const minDist = Math.min(...distances);
                        const maxDist = Math.max(...distances);
                        distanceText = minDist === maxDist ? `${minDist}km` : `${minDist}-${maxDist}km`;
                      }
                      
                      return (
                        <div
                          key={event.eventId}
                          className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/20"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to={`/schedule/${event.eventId}`}
                              className="text-sm text-foreground hover:text-primary transition-colors font-medium leading-tight"
                            >
                              {event.metadata?.name || `Event #${event.eventId}`}
                            </Link>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleRegisterForEvent(Number(event.eventId))}
                              disabled={registeringEventId === Number(event.eventId)}
                              className="text-xs h-7 px-3 shrink-0"
                            >
                              {registeringEventId === Number(event.eventId) ? '...' : 'Register'}
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                            <span className="text-purple-500 font-medium">{getRaceClassName(firstEligible)}</span>
                            <span className="text-primary font-medium">{formatICP(calculateBracketEntryFee(BigInt(event.metadata?.entryFee || 0), firstEligible))}</span>
                            {uniqueTerrains.length > 0 && (
                              <span>{uniqueTerrains.join('')}</span>
                            )}
                            {distanceText && (
                              <span>{distanceText}</span>
                            )}
                          </div>
                          <div className="text-xs text-amber-500/80 mt-1">
                            Closes: {formatRelativeTime(BigInt(event.registrationCloses))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Withdrawal Confirmation Dialog */}
            <AlertDialog open={!!withdrawConfirmEvent} onOpenChange={(open) => !open && setWithdrawConfirmEvent(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Withdraw from Event?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>
                        You are about to withdraw from <span className="font-semibold">{withdrawConfirmEvent?.metadata?.name || `Event #${withdrawConfirmEvent?.eventId}`}</span>.
                      </p>
                      
                      {withdrawConfirmEvent && (() => {
                        const refundInfo = getRefundInfo(withdrawConfirmEvent);
                        const registration = withdrawConfirmEvent.registrations?.find((r: any) => Number(r.tokenIndex) === Number(bot.tokenIndex));
                        const entryFee = calculateBracketEntryFee(BigInt(withdrawConfirmEvent.metadata?.entryFee || 0), registration?.raceClass);
                        
                        return (
                          <div className={`p-3 rounded-lg ${
                            refundInfo.percentage === 100 ? 'bg-green-500/10 border border-green-500/30' :
                            refundInfo.percentage === 50 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                            refundInfo.percentage === 25 ? 'bg-orange-500/10 border border-orange-500/30' :
                            'bg-red-500/10 border border-red-500/30'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Refund Rate:</span>
                              <span className={`font-bold ${
                                refundInfo.percentage === 100 ? 'text-green-500' :
                                refundInfo.percentage === 50 ? 'text-yellow-500' :
                                refundInfo.percentage === 25 ? 'text-orange-500' :
                                'text-red-500'
                              }`}>{refundInfo.percentage}%</span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">Entry Fee Paid:</span>
                              <span className="text-sm">{formatICP(entryFee)}</span>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-muted-foreground">You Will Receive:</span>
                              <span className="text-sm font-semibold text-green-400">{formatICP(refundInfo.refundAmount)}</span>
                            </div>
                            {refundInfo.penalty > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Penalty ({refundInfo.penalty}%):</span>
                                <span className="text-sm text-red-400">-{formatICP(entryFee - refundInfo.refundAmount)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      
                      <p className="text-xs text-muted-foreground">
                        💡 Cancellation penalties increase as the event approaches. Early cancellations get full refunds.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Registration</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (withdrawConfirmEvent) {
                        handleUnregisterFromEvent(Number(withdrawConfirmEvent.eventId));
                        setWithdrawConfirmEvent(null);
                      }
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Withdraw
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </>
          );
        })()}

        {/* Marketplace Actions */}
        <div className="grid grid-cols-2 gap-2">
          {bot.isListed ? (
            <Button
              onClick={handleUnlist}
              disabled={unlistMutation.isPending}
              size="sm"
              variant="destructive"
            >
              Cancel Listing
            </Button>
          ) : (
            <Button
              onClick={() => setShowListForSale(true)}
              disabled={listForSaleMutation.isPending}
              size="sm"
              variant="secondary"
            >
              List for Sale
            </Button>
          )}
          <Button
            onClick={() => setShowTransfer(true)}
            disabled={transferMutation.isPending}
            size="sm"
            variant="secondary"
          >
            Transfer
          </Button>
        </div>

        {/* Rename Bot Button */}
        <Button
          onClick={() => setShowRename(true)}
          disabled={initializeMutation.isPending}
          size="sm"
          variant="secondary"
          className="w-full"
        >
          ✏️ Rename Bot (0.1 ICP)
        </Button>

        {/* Strip Bot Button - Advanced/Dangerous Action */}
        <Button
          onClick={() => setShowRespec(true)}
          disabled={respecMutation.isPending}
          size="sm"
          variant="destructive"
          className="w-full"
        >
          {respecMutation.isPending ? '🔧 Stripping...' : '🔧 Strip Bot (FREE)'}
        </Button>
        
        {bot.isListed && bot.listPrice && (
          <p className="text-xs text-muted-foreground text-center">
            Currently listed for {bot.listPrice.toFixed(2)} ICP
          </p>
        )}
      </CardContent>

      {/* List for Sale Dialog */}
      <Dialog open={showListForSale} onOpenChange={setShowListForSale}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>List {bot.name || `Bot #${bot.tokenIndex}`} for Sale</DialogTitle>
            <DialogDescription>
              Set a price in ICP to list your bot on the marketplace. You can unlist it anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-price">Price (ICP)</Label>
              <Input
                id="list-price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter price in ICP"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleListForSale}
              disabled={listForSaleMutation.isPending}
              className="flex-1"
            >
              {listForSaleMutation.isPending ? 'Listing...' : 'List for Sale'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowListForSale(false)}
              disabled={listForSaleMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Bot Dialog */}
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {bot.name || `Bot #${bot.tokenIndex}`}</DialogTitle>
            <DialogDescription>
              Give your bot a new name. This is a re-registration that costs 0.1 ICP + 0.0001 ICP fee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-bot-name">New Bot Name</Label>
              <Input
                id="rename-bot-name"
                placeholder="Enter a new name"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground">
                {bot.name ? `Current name: ${bot.name}` : 'Bot currently has no custom name'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                handleInitialize();
                setShowRename(false);
              }}
              disabled={initializeMutation.isPending || !botName.trim()}
              className="flex-1"
            >
              {initializeMutation.isPending ? 'Processing Payment...' : 'Rename (0.1 ICP)'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowRename(false);
                setBotName('');
              }}
              disabled={initializeMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer {bot.name || `Bot #${bot.tokenIndex}`}</DialogTitle>
            <DialogDescription>
              Transfer this bot to another account. Transfers are final and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-to">Recipient Address</Label>
              <Input
                id="transfer-to"
                placeholder="Principal ID or Account ID"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter a principal ID or account identifier
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleTransfer}
              disabled={transferMutation.isPending}
              className="flex-1"
            >
              {transferMutation.isPending ? 'Transferring...' : 'Transfer Bot'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTransfer(false)}
              disabled={transferMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scavenging Dialog */}
      <Dialog open={showScavenging} onOpenChange={setShowScavenging}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Bot Scavenging</DialogTitle>
            <DialogDescription>
              Continuous scavenging: rewards accumulate proportionally to time spent. Retrieve your bot anytime! No ICP cost - only battery consumption.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Mission Duration</Label>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="continuous-mode"
                    checked={scavengingDuration === undefined}
                    onCheckedChange={(checked) => setScavengingDuration(checked ? undefined : 30)}
                  />
                  <label 
                    htmlFor="continuous-mode"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    ♾️ Continuous
                  </label>
                </div>
              </div>
              
              {scavengingDuration !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Duration:</span>
                    <span className="text-sm font-semibold">
                      {scavengingDuration < 60 
                        ? `${scavengingDuration} min` 
                        : scavengingDuration % 60 === 0
                        ? `${scavengingDuration / 60} hr${scavengingDuration > 60 ? 's' : ''}`
                        : `${Math.floor(scavengingDuration / 60)}h ${scavengingDuration % 60}m`}
                    </span>
                  </div>
                  <Slider
                    min={5}
                    max={360}
                    step={5}
                    value={[scavengingDuration]}
                    onValueChange={(value) => setScavengingDuration(value[0])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground -mt-1">
                    <span>5m</span>
                    <span>1h</span>
                    <span>2h</span>
                    <span>3h</span>
                    <span>4h</span>
                    <span>5h</span>
                    <span>6h</span>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {scavengingDuration === undefined 
                  ? 'Bot will scavenge until you manually collect rewards'
                  : `Bot will auto-collect after ${
                      scavengingDuration < 60 
                        ? scavengingDuration + ' min' 
                        : scavengingDuration % 60 === 0
                        ? (scavengingDuration / 60) + ' hr' + (scavengingDuration > 60 ? 's' : '')
                        : `${Math.floor(scavengingDuration / 60)}h ${scavengingDuration % 60}m`
                    }`
                }
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scavenging-zone">Scavenging Zone</Label>
              <Select value={scavengingZone} onValueChange={(value: any) => setScavengingZone(value)}>
                <SelectTrigger id="scavenging-zone" className="w-full">
                  <SelectValue>
                    {scavengingZone === 'ScrapHeaps' && '🏜️ Scrap Heaps'}
                    {scavengingZone === 'AbandonedSettlements' && '🏭 Abandoned Settlements'}
                    {scavengingZone === 'DeadMachineFields' && '⚠️ Dead Machine Fields'}
                    {scavengingZone === 'RepairBay' && '🔧 Repair Bay'}
                    {scavengingZone === 'ChargingStation' && '🔌 Charging'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ScrapHeaps">🏜️ Scrap Heaps (Safe)</SelectItem>
                  <SelectItem value="AbandonedSettlements">🏭 Abandoned Settlements (Moderate)</SelectItem>
                  <SelectItem value="DeadMachineFields">⚠️ Dead Machine Fields (High Risk)</SelectItem>
                  <SelectItem value="RepairBay">🔧 Repair Bay (Maintenance)</SelectItem>
                  <SelectItem value="ChargingStation">🔌 Charging Station (Free Charging)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-semibold">Zone Details:</p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accumulation Rate:</span>
                  <span className="font-medium">Per Hour</span>
                </div>
                {scavengingZone !== 'RepairBay' && scavengingZone !== 'ChargingStation' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parts per Hour:</span>
                      <span className={scavengingZone === 'DeadMachineFields' ? 'text-orange-600 font-semibold' : ''}>
                        ~{scavengingZone === 'ScrapHeaps' ? '10' : scavengingZone === 'AbandonedSettlements' ? '16' : '25'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Battery per Hour:</span>
                      <span className={scavengingZone === 'DeadMachineFields' ? 'text-red-600 font-semibold' : ''}>
                        ~{scavengingZone === 'ScrapHeaps' ? '20' : scavengingZone === 'AbandonedSettlements' ? '40' : '70'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Condition per Hour:</span>
                      <span className={scavengingZone === 'DeadMachineFields' ? 'text-red-600 font-semibold' : ''}>
                        ~{scavengingZone === 'ScrapHeaps' ? '22' : scavengingZone === 'AbandonedSettlements' ? '44' : '77'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Universal Parts:</span>
                      <span className="font-medium text-primary">
                        {scavengingZone === 'ScrapHeaps' ? '40%' : scavengingZone === 'AbandonedSettlements' ? '25%' : '10%'}
                      </span>
                    </div>
                  </>
                ) : scavengingZone === 'RepairBay' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parts per Hour:</span>
                      <span className="font-medium text-muted-foreground">0 (No parts)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Battery per Hour:</span>
                      <span>~40</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Condition per Hour:</span>
                      <span className="font-semibold text-green-600">+12-18 (Restored!)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cooldown:</span>
                      <span className="font-medium text-primary">Bypasses repair cooldown</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parts per Hour:</span>
                      <span className="font-medium text-muted-foreground">0 (No parts)</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Battery per Hour:</span>
                        <span className="font-semibold text-cyan-600">Stepped Charging</span>
                      </div>
                      <div className="text-xs text-muted-foreground pl-4 space-y-0.5">
                        <div className="flex justify-between">
                          <span>0-24% battery:</span>
                          <span className="text-red-500 font-medium">~0.25/hr (1x - SLOW!)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>25-49% battery:</span>
                          <span className="text-orange-500 font-medium">~0.5/hr (2x)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>50-74% battery:</span>
                          <span className="text-yellow-500 font-medium">~0.75/hr (3x)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>75-100% battery:</span>
                          <span className="text-green-500 font-medium">~1/hr (4x - FAST!)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Condition per Hour:</span>
                      <span className="font-medium text-muted-foreground">0 (No change)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="font-medium text-primary">FREE (vs 0.1 ICP instant)</span>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      ⚡ <strong>INVERTED CHARGING:</strong> Faster when high, slower when low! Keep it topped up or pay 0.1 ICP for instant 50-90 battery. 0% → 100% takes ~25 hours.
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                💡 <strong>Continuous Scavenging:</strong> {scavengingZone === 'RepairBay' ? 'Condition restores continuously. Retrieve when ready!' : scavengingZone === 'ChargingStation' ? 'Battery restores continuously. Retrieve anytime!' : 'Parts accumulate continuously. Retrieve anytime to collect!'} <strong>Rates shown are per hour</strong> - your bot's faction and stats provide bonuses.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleStartScavenging}
              disabled={startScavengingMutation.isPending}
              className="flex-1"
            >
              {startScavengingMutation.isPending ? 'Sending...' : '🔍 Send Bot Out'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowScavenging(false)}
              disabled={startScavengingMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade {bot.name || `Bot #${bot.tokenIndex}`}</DialogTitle>
            <DialogDescription>
              Upgrade a stat to improve racing performance. Upgrades take 12 hours to complete.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Max Stats at 100% Condition */}
            {bot.maxStats && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Max Stats (100% Condition)</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">⚡ Speed:</span>
                    <span className="font-medium">{formatBigInt(bot.maxStats.speed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🔋 Power:</span>
                    <span className="font-medium">{formatBigInt(bot.maxStats.powerCore)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🚀 Accel:</span>
                    <span className="font-medium">{formatBigInt(bot.maxStats.acceleration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🎯 Stability:</span>
                    <span className="font-medium">{formatBigInt(bot.maxStats.stability)}</span>
                  </div>
                </div>
              </div>
            )}
            {/* Current Parts Inventory */}
            {inventory && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Your Parts Inventory</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">⚡ Velocity:</span>
                    <span className="font-medium">{formatBigInt(inventory.speedChips)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🔋 Power Core:</span>
                    <span className="font-medium">{formatBigInt(inventory.powerCoreFragments)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🚀 Thruster:</span>
                    <span className="font-medium">{formatBigInt(inventory.thrusterKits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">🎯 Gyro:</span>
                    <span className="font-medium">{formatBigInt(inventory.gyroModules)}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="upgrade-type">Stat to Upgrade</Label>
              <Select value={upgradeType} onValueChange={(value: any) => setUpgradeType(value)}>
                <SelectTrigger id="upgrade-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Velocity">⚡ Speed ({formatBigInt(stats.speedUpgrades)} upgrades)</SelectItem>
                  <SelectItem value="PowerCore">🔋 Power Core ({formatBigInt(stats.powerCoreUpgrades)} upgrades)</SelectItem>
                  <SelectItem value="Thruster">🚀 Acceleration ({formatBigInt(stats.accelerationUpgrades)} upgrades)</SelectItem>
                  <SelectItem value="Gyro">🎯 Stability ({formatBigInt(stats.stabilityUpgrades)} upgrades)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Upgrade Cost Display - V2 System */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Upgrade Attempt:</span>
                <span className="font-bold">#{getUpgradeInfo().currentCount + 1}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost (ICP):</span>
                <span className="font-bold text-primary">{getUpgradeInfo().icpCost} ICP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost (Parts):</span>
                <span className="font-bold text-primary">{getUpgradeInfo().partsCost} parts</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Success Rate:</span>
                <span className="font-bold text-green-600">{getUpgradeInfo().successRate}</span>
              </div>
              {getUpgradeInfo().pityBonus && getUpgradeInfo().pityBonus !== '+0%' && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pity Bonus:</span>
                  <span className="font-bold text-blue-600">{getUpgradeInfo().pityBonus}</span>
                </div>
              )}
              <div className="pt-2 border-t space-y-1">
                <p className="text-xs text-muted-foreground italic">
                  Cost formula: 0.5 + (current_stat/40)² × tier_premium
                </p>
                <p className="text-xs text-muted-foreground">
                  🎰 V2 Gacha System: RNG-based with pity protection
                </p>
                <p className="text-xs text-muted-foreground">
                  💰 50% refund on failure | Double points chance | Faction bonuses
                </p>
              </div>
            </div>

            {/* Bracket Bump Warning */}
            {(() => {
              if (!bot.maxStats) return null;
              const currentRating = (Number(bot.maxStats.speed) + Number(bot.maxStats.powerCore) + 
                Number(bot.maxStats.acceleration) + Number(bot.maxStats.stability)) / 4;
              
              // Class boundaries: 20 (Scrap→Junker), 30 (Junker→Raider), 40 (Raider→Elite), 50 (Elite→SilentKlan)
              const boundaries = [
                { threshold: 20, from: 'Scrap', to: 'Junker' },
                { threshold: 30, from: 'Junker', to: 'Raider' },
                { threshold: 40, from: 'Raider', to: 'Elite' },
                { threshold: 50, from: 'Elite', to: 'Silent Klan' },
              ];
              
              // Find if we're close to any boundary (within 1.0 rating points)
              // A successful upgrade adds +1 to one stat = +0.25 rating, double upgrade = +0.5 rating
              const nearBoundary = boundaries.find(b => currentRating < b.threshold && currentRating >= b.threshold - 1.0);
              
              if (!nearBoundary) return null;
              
              const pointsUntilBump = nearBoundary.threshold - currentRating;
              const willBumpOnNormal = pointsUntilBump <= 0.25;
              const willBumpOnDouble = pointsUntilBump <= 0.5;
              
              return (
                <div className={`p-3 rounded-lg border-2 ${
                  willBumpOnNormal 
                    ? 'bg-red-500/10 border-red-500/50' 
                    : 'bg-yellow-500/10 border-yellow-500/50'
                }`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{willBumpOnNormal ? '🚨' : '⚠️'}</span>
                    <div className="space-y-1">
                      <p className={`text-sm font-semibold ${
                        willBumpOnNormal ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {willBumpOnNormal ? 'BRACKET BUMP IMMINENT!' : 'Near Bracket Boundary'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Current rating: <span className="font-mono font-bold">{currentRating.toFixed(2)}</span> → 
                        {nearBoundary.from} class
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {willBumpOnNormal ? (
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            A successful upgrade WILL bump you to {nearBoundary.to} class!
                          </span>
                        ) : willBumpOnDouble ? (
                          <span className="text-yellow-600 dark:text-yellow-400">
                            A double-point upgrade could bump you to {nearBoundary.to} class.
                          </span>
                        ) : (
                          <span>
                            {pointsUntilBump.toFixed(2)} rating points until {nearBoundary.to} class.
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        Higher classes have tougher competition and higher entry fees.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="icp">💰 Pay with ICP</SelectItem>
                  <SelectItem value="parts">🔧 Pay with Parts</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {paymentMethod === 'icp' 
                  ? 'ICP payment will be processed via ICRC-2 approval'
                  : 'Parts will be deducted from your inventory'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleUpgrade}
              disabled={upgradeMutation.isPending}
              className="flex-1"
            >
              {upgradeMutation.isPending ? 'Starting Upgrade...' : 'Start Upgrade'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowUpgrade(false)}
              disabled={upgradeMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Strip Bot Confirmation Dialog */}
      <AlertDialog open={showRespec} onOpenChange={setShowRespec}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Strip Bot?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                // Check if bot can be stripped
                if (bot.activeMission) {
                  return (
                    <div className="space-y-3">
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">⚠️ Cannot Strip Bot</p>
                        <p className="text-sm text-muted-foreground mt-2">Your bot is currently on a scavenging mission. Retrieve your bot from its mission first before stripping upgrades.</p>
                      </div>
                    </div>
                  );
                }

                if (bot.stats) {
                  const stats = bot.stats as any;
                  const speedUp = Number(stats.speedUpgrades || 0);
                  const powerUp = Number(stats.powerCoreUpgrades || 0);
                  const accelUp = Number(stats.accelerationUpgrades || 0);
                  const stabUp = Number(stats.stabilityUpgrades || 0);
                  const hasUpgrades = speedUp > 0 || powerUp > 0 || accelUp > 0 || stabUp > 0;

                  if (!hasUpgrades) {
                    return (
                      <div className="space-y-3">
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">⚠️ No Upgrades to Strip</p>
                          <p className="text-sm text-muted-foreground mt-2">Your bot has no upgrade bonuses. There's nothing to strip!</p>
                        </div>
                      </div>
                    );
                  }

                  // Bot can be stripped - show confirmation
                  return (
                    <div className="space-y-3">
                      <p>This will <strong>reset selected stat upgrade bonuses to 0</strong> and refund 60% of invested parts (40% penalty).</p>
                      
                      <div className="p-3 bg-muted rounded-lg space-y-3">
                        <p className="text-sm font-semibold">Select stats to strip:</p>
                        
                        <div className="space-y-2">
                          {speedUp > 0 && (
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="strip-speed" 
                                checked={statsToStrip.has('speed')}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(statsToStrip);
                                  if (checked) {
                                    newSet.add('speed');
                                  } else {
                                    newSet.delete('speed');
                                  }
                                  setStatsToStrip(newSet);
                                }}
                              />
                              <label htmlFor="strip-speed" className="text-sm cursor-pointer">
                                ⚡ Speed: +{speedUp} upgrades
                              </label>
                            </div>
                          )}
                          
                          {powerUp > 0 && (
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="strip-power" 
                                checked={statsToStrip.has('powerCore')}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(statsToStrip);
                                  if (checked) {
                                    newSet.add('powerCore');
                                  } else {
                                    newSet.delete('powerCore');
                                  }
                                  setStatsToStrip(newSet);
                                }}
                              />
                              <label htmlFor="strip-power" className="text-sm cursor-pointer">
                                💪 Power Core: +{powerUp} upgrades
                              </label>
                            </div>
                          )}
                          
                          {accelUp > 0 && (
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="strip-accel" 
                                checked={statsToStrip.has('acceleration')}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(statsToStrip);
                                  if (checked) {
                                    newSet.add('acceleration');
                                  } else {
                                    newSet.delete('acceleration');
                                  }
                                  setStatsToStrip(newSet);
                                }}
                              />
                              <label htmlFor="strip-accel" className="text-sm cursor-pointer">
                                🚀 Acceleration: +{accelUp} upgrades
                              </label>
                            </div>
                          )}
                          
                          {stabUp > 0 && (
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="strip-stab" 
                                checked={statsToStrip.has('stability')}
                                onCheckedChange={(checked) => {
                                  const newSet = new Set(statsToStrip);
                                  if (checked) {
                                    newSet.add('stability');
                                  } else {
                                    newSet.delete('stability');
                                  }
                                  setStatsToStrip(newSet);
                                }}
                              />
                              <label htmlFor="strip-stab" className="text-sm cursor-pointer">
                                🎯 Stability: +{stabUp} upgrades
                              </label>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground">
                            {statsToStrip.size === 0 ? 'Select stats above' : `${statsToStrip.size} stat${statsToStrip.size > 1 ? 's' : ''} selected`}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const allStats = new Set<string>();
                              if (speedUp > 0) allStats.add('speed');
                              if (powerUp > 0) allStats.add('powerCore');
                              if (accelUp > 0) allStats.add('acceleration');
                              if (stabUp > 0) allStats.add('stability');
                              setStatsToStrip(allStats);
                            }}
                            className="text-xs h-7"
                          >
                            Select All
                          </Button>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg space-y-1 text-sm">
                        <p className="font-semibold text-green-600 dark:text-green-400">Cost: FREE! 🎉</p>
                      </div>
                      
                      <div className="p-3 bg-muted rounded-lg space-y-1 text-xs">
                        <p className="font-semibold">After Stripping:</p>
                        <p className="text-green-600">✓ Pity counter preserved ({Number(bot.upgradeCostsV2?.pityCounter || 0)})</p>
                        <p className="text-green-600">✓ Refund 60% of parts invested</p>
                        <p className="text-green-600">✓ Non-selected stats keep their bonuses</p>
                        <p className="text-destructive">✗ Selected stat bonuses reset to 0</p>
                      </div>
                      
                      <p className="text-sm font-semibold">This action cannot be undone!</p>
                    </div>
                  );
                }

                return null;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStatsToStrip(new Set())}>Cancel</AlertDialogCancel>
            {(() => {
              const stats = bot.stats as any;
              const hasUpgrades = stats && (
                Number(stats.speedUpgrades || 0) > 0 ||
                Number(stats.powerCoreUpgrades || 0) > 0 ||
                Number(stats.accelerationUpgrades || 0) > 0 ||
                Number(stats.stabilityUpgrades || 0) > 0
              );
              const canStrip = hasUpgrades && !bot.activeMission && statsToStrip.size > 0;

              return (
                <AlertDialogAction
                  onClick={handleRespec}
                  disabled={!canStrip || respecMutation.isPending}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {respecMutation.isPending ? 'Stripping...' : `Strip ${statsToStrip.size > 0 ? statsToStrip.size + ' Stat' + (statsToStrip.size > 1 ? 's' : '') : 'Bot'}`}
                </AlertDialogAction>
              );
            })()}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rolling Animation Dialog */}
      <Dialog open={isRolling} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm border border-yellow-500/30 bg-background">
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">🎲</span>
              </div>
            </div>
            <p className="text-lg font-bold text-yellow-500">ROLLING...</p>
            <p className="text-sm text-muted-foreground">Determining upgrade outcome</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Result Dialog */}
      <Dialog open={showUpgradeResult} onOpenChange={setShowUpgradeResult}>
        <DialogContent className={`max-w-md overflow-hidden ${
          upgradeResult?.success 
            ? upgradeResult.isDouble 
              ? 'border-2 border-yellow-500' 
              : 'border-2 border-green-500'
            : 'border-2 border-red-500/50'
        }`}>
          {/* Animated background for wins */}
          {upgradeResult?.success && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {upgradeResult.isDouble && (
                <>
                  <div className="absolute top-0 left-1/4 text-4xl animate-bounce" style={{animationDelay: '0ms'}}>🎉</div>
                  <div className="absolute top-0 right-1/4 text-4xl animate-bounce" style={{animationDelay: '200ms'}}>🎊</div>
                  <div className="absolute bottom-0 left-1/3 text-3xl animate-bounce" style={{animationDelay: '400ms'}}>⭐</div>
                  <div className="absolute bottom-0 right-1/3 text-3xl animate-bounce" style={{animationDelay: '100ms'}}>✨</div>
                </>
              )}
              <div className={`absolute inset-0 ${
                upgradeResult.isDouble 
                  ? 'bg-gradient-to-br from-yellow-500/10 via-transparent to-yellow-500/10' 
                  : 'bg-gradient-to-br from-green-500/10 via-transparent to-green-500/10'
              }`} />
            </div>
          )}
          
          <DialogHeader className="relative">
            <DialogTitle className="text-center text-2xl">
              {upgradeResult?.success ? (
                upgradeResult.isDouble ? (
                  <span className="text-yellow-400 animate-pulse">🌟 JACKPOT! 🌟</span>
                ) : (
                  <span className="text-green-400">✅ SUCCESS!</span>
                )
              ) : (
                <span className="text-red-400">💔 FAILED</span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-4 relative">
            {/* Main result display */}
            <div className="text-center">
              {upgradeResult?.success ? (
                <div className="space-y-2">
                  <p className="text-lg">
                    Your <span className="font-bold text-yellow-500">{upgradeResult.statName}</span> upgrade succeeded!
                  </p>
                  <div className={`text-5xl font-black ${
                    upgradeResult.isDouble ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    +{upgradeResult.pointsAwarded}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {upgradeResult.isDouble 
                      ? '🎰 You hit the DOUBLE lottery!' 
                      : 'Stat point added!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-lg text-muted-foreground">
                    The <span className="font-bold text-yellow-500">{upgradeResult?.statName}</span> upgrade didn't take...
                  </p>
                  <div className="text-5xl">😢</div>
                  {upgradeResult?.refund && (
                    <p className="text-sm text-orange-400">
                      💰 50% refund: {upgradeResult.refund}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded p-2">
                    💪 Your pity counter increased! Next attempt has better odds.
                  </p>
                </div>
              )}
            </div>
            
            {/* Roll details */}
            {upgradeResult && upgradeResult.roll > 0 && (
              <div className="text-center text-sm text-muted-foreground border-t border-border pt-3 mt-3">
                <span className="font-mono bg-muted px-2 py-1 rounded">
                  🎲 Roll: {upgradeResult.roll} {upgradeResult.success ? '<' : '≥'} {upgradeResult.successRate}
                </span>
                {upgradeResult.pityBonus && (
                  <span className="ml-2 text-green-400">(+pity bonus)</span>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowUpgradeResult(false)} 
              className={`w-full ${
                upgradeResult?.success 
                  ? upgradeResult.isDouble 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-green-600 hover:bg-green-700'
                  : ''
              }`}
              variant={upgradeResult?.success ? 'default' : 'destructive'}
            >
              {upgradeResult?.success 
                ? (upgradeResult.isDouble ? '🎉 Amazing!' : 'Nice!') 
                : 'Try Again...'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
