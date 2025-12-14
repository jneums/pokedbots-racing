import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { BotListItem, initializeBot, rechargeBot, repairBot, generatetokenIdentifier, listBotForSale, unlistBot, transferBot, startScavenging, completeScavenging } from '@pokedbots-racing/ic-js';
import { useAuth } from '../hooks/useAuth';
import { useUpgradeBot } from '../hooks/useGarage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface BotCardProps {
  bot: BotListItem;
  onUpdate: () => void;
}

// Format time relative to now (e.g., "in 2h", "in 5m", "in 3d")
function formatRelativeTime(timestampNanos: bigint): string {
  const now = Date.now();
  const targetMs = Number(timestampNanos) / 1_000_000;
  const diffMs = targetMs - now;
  
  if (diffMs < 0) return 'starting soon';
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) return `in ${diffDays}d`;
  if (diffHours > 0) return `in ${diffHours}h`;
  if (diffMinutes > 0) return `in ${diffMinutes}m`;
  return 'starting soon';
}

export function BotCard({ bot, onUpdate }: BotCardProps) {
  const { user } = useAuth();
  const upgradeMutation = useUpgradeBot();
  const [showInitialize, setShowInitialize] = useState(false);
  const [showListForSale, setShowListForSale] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showScavenging, setShowScavenging] = useState(false);
  const [upgradeType, setUpgradeType] = useState<'Velocity' | 'PowerCore' | 'Thruster' | 'Gyro'>('Velocity');
  const [paymentMethod, setPaymentMethod] = useState<'icp' | 'parts'>('icp');
  const [scavengingZone, setScavengingZone] = useState<'ScrapHeaps' | 'AbandonedSettlements' | 'DeadMachineFields'>('ScrapHeaps');
  const [botName, setBotName] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [recharging, setRecharging] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInitialize = async () => {
    if (!user?.agent) return;
    
    setLoading(true);
    setError(null);
    try {
      console.log('Initializing bot', bot.tokenIndex, 'with name:', botName || 'none');
      const result = await initializeBot(Number(bot.tokenIndex), botName || undefined, user.agent as any);
      console.log('Initialization result:', result);
      setShowInitialize(false);
      setBotName(''); // Reset name field
      onUpdate();
      toast.success(result);
    } catch (err) {
      console.error('Initialization error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize bot';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    if (!user?.agent) return;
    
    setRecharging(true);
    setError(null);
    try {
      const result = await rechargeBot(Number(bot.tokenIndex), user.agent as any);
      toast.success(result);
      onUpdate();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to recharge';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setRecharging(false);
    }
  };

  const handleRepair = async () => {
    if (!user?.agent) return;
    
    setRepairing(true);
    setError(null);
    try {
      const result = await repairBot(Number(bot.tokenIndex), user.agent as any);
      toast.success(result);
      onUpdate();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to repair';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setRepairing(false);
    }
  };

  const handleFullMaintenance = async () => {
    if (!user?.agent) return;
    
    setLoading(true);
    setError(null);
    try {
      // Perform both recharge and repair
      const rechargeResult = await rechargeBot(Number(bot.tokenIndex), user.agent as any);
      const repairResult = await repairBot(Number(bot.tokenIndex), user.agent as any);
      toast.success(`🔧 Full maintenance complete!\n${rechargeResult}\n${repairResult}`);
      onUpdate();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to perform maintenance';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleStartScavenging = async () => {
    if (!user?.agent) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await startScavenging(Number(bot.tokenIndex), scavengingZone, user.agent as any);
      setShowScavenging(false);
      onUpdate();
      toast.success(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start scavenging';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteScavenging = async () => {
    if (!user?.agent) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await completeScavenging(Number(bot.tokenIndex), user.agent as any);
      onUpdate();
      toast.success(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to complete scavenging';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
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
    
    const costData = bot.upgradeCostsV2[typeKey];
    const currentCount = getCurrentUpgradeCount(upgradeType);
    const pityCounter = Number(bot.upgradeCostsV2.pityCounter || 0n);
    
    return {
      currentCount,
      icpCost: (Number(costData.costE8s) / 100_000_000).toFixed(2),
      partsCost: Math.round(Number(costData.costE8s) / 1_000_000), // Convert e8s to parts equivalent
      successRate: costData.successRate.toFixed(1) + '%',
      pityBonus: '+' + (pityCounter * 5) + '%',
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

  const getUpgradeTimeRemaining = () => {
    if (!bot.activeUpgrade) return null;
    return formatRelativeTime(bot.activeUpgrade.endsAt);
  };

  const formatWorldBuff = () => {
    if (!stats?.worldBuff || stats.worldBuff.length === 0) return null;
    const buff = stats.worldBuff[0];
    const expiresAt = Number(buff.expiresAt) * 1000; // Convert seconds to milliseconds
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
      // Convert string type to variant type
      const upgradeTypeVariant = { [upgradeType]: null } as any;
      await upgradeMutation.mutateAsync({
        tokenIndex: Number(bot.tokenIndex),
        upgradeType: upgradeTypeVariant,
        paymentMethod,
      });
      setShowUpgrade(false);
      toast.success(`Upgrade started! Will complete in 12 hours.`);
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start upgrade');
    }
  };

  const handleListForSale = async () => {
    if (!user?.agent) return;
    const price = parseFloat(listPrice);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = await listBotForSale(Number(bot.tokenIndex), price, user.agent as any);
      setShowListForSale(false);
      setListPrice('');
      onUpdate();
      toast.success(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list bot');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlist = async () => {
    if (!user?.agent) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await unlistBot(Number(bot.tokenIndex), user.agent as any);
      toast.success(result);
      // Force immediate refetch
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlist bot');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!user?.agent) return;
    if (!transferTo.trim()) {
      setError('Please enter a recipient account ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const result = await transferBot(Number(bot.tokenIndex), transferTo.trim(), user.agent as any);
      setShowTransfer(false);
      setTransferTo('');
      onUpdate();
      toast.success(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer bot');
    } finally {
      setLoading(false);
    }
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
      <>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={imageUrl} alt={`Bot #${bot.tokenIndex}`} />
                <AvatarFallback>#{bot.tokenIndex.toString().slice(-2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex items-center justify-between">
                <span>Bot #{bot.tokenIndex.toString()}</span>
                <Badge variant="secondary">{!bot.isInitialized ? 'Uninitialized' : 'Needs Re-registration'}</Badge>
              </div>
            </CardTitle>
            <CardDescription>
              {!bot.isInitialized 
                ? 'This bot needs to be registered for racing. Costs 0.1 ICP.' 
                : 'Register this transferred bot to your account. Costs 0.1 ICP.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowInitialize(true)} className="w-full">
              Initialize Bot (0.1 ICP)
            </Button>
          </CardContent>
        </Card>

        <Dialog open={showInitialize} onOpenChange={setShowInitialize}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{!bot.isInitialized ? 'Initialize' : 'Register'} Bot #{bot.tokenIndex.toString()}</DialogTitle>
              <DialogDescription>
                Register this bot for wasteland racing. Costs 0.1 ICP + 0.0001 ICP fee.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleInitialize}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Processing Payment...' : 'Initialize (0.1 ICP)'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowInitialize(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const stats = bot.stats!;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Avatar className="h-16 w-16">
            <AvatarImage src={imageUrl} alt={bot.name || `Bot #${bot.tokenIndex}`} />
            <AvatarFallback>#{bot.tokenIndex.toString().slice(-2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xl">{bot.name || `Bot #${bot.tokenIndex.toString()}`}</span>
              <Button
                variant="link"
                size="sm"
                className="text-xs text-primary p-0 h-auto"
                onClick={() => window.location.href = `/bot/${bot.tokenIndex}`}
              >
                View Racing Details →
              </Button>
            </div>
            <Badge variant={getFactionColor(stats.faction)} className="w-fit">
              {getFactionName(stats.faction)}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          ELO: {formatBigInt(stats.eloRating)} | Rating: {bot.currentStats ? Math.floor((Number(bot.currentStats.speed) + Number(bot.currentStats.powerCore) + Number(bot.currentStats.acceleration) + Number(bot.currentStats.stability)) / 4) : '?'}/{bot.maxStats ? Math.floor((Number(bot.maxStats.speed) + Number(bot.maxStats.powerCore) + Number(bot.maxStats.acceleration) + Number(bot.maxStats.stability)) / 4) : '100'} | Rep: {formatBigInt(stats.factionReputation)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

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
        <div className={`p-3 rounded-lg space-y-2 ${
          Number(stats.overcharge) > 0 
            ? 'bg-cyan-500/10 border border-cyan-500/30' 
            : 'bg-muted/50 border border-muted'
        }`}>
          <div className="flex justify-between items-center">
            <span className={`text-sm font-semibold ${
              Number(stats.overcharge) > 0 
                ? 'text-cyan-600 dark:text-cyan-400' 
                : 'text-muted-foreground'
            }`}>
              ⚡ Overcharge
            </span>
            <span className={`text-sm font-bold ${
              Number(stats.overcharge) > 0 
                ? 'text-cyan-600 dark:text-cyan-400' 
                : 'text-muted-foreground'
            }`}>
              {Number(stats.overcharge)}%
            </span>
          </div>
          <div className="w-full bg-cyan-900/20 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
              style={{ width: `${Math.min(Number(stats.overcharge), 75)}%` }}
            />
          </div>
          {Number(stats.overcharge) > 0 ? (
            <div className="text-xs space-y-0.5">
              <p className="text-muted-foreground">Next race boost:</p>
              <div className="flex justify-between">
                <span className="text-green-600">+{(Number(stats.overcharge) * 0.3).toFixed(1)}% Speed/Accel</span>
                <span className="text-red-600">-{(Number(stats.overcharge) * 0.2).toFixed(1)}% Power/Stab</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Recharge at low battery for bonus stats!</p>
          )}
        </div>

        {/* Current/Max Stats (pre-calculated by backend) */}
        {(() => {
          if (!bot.currentStats || !bot.maxStats) {
            // Fallback: show upgrade info when stats aren't available
            const speedUp = Number(stats.speedUpgrades || 0);
            const powerUp = Number(stats.powerCoreUpgrades || 0);
            const accelUp = Number(stats.accelerationUpgrades || 0);
            const stabUp = Number(stats.stabilityUpgrades || 0);
            
            return (
              <div className="space-y-2">
                <p className="text-xs text-center text-muted-foreground">
                  View full stats on detail page →
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between items-center p-2 bg-card/50 border border-primary/20 rounded">
                    <span className="text-muted-foreground">⚡ Speed</span>
                    <span className="font-bold">{speedUp > 0 ? `${speedUp} upgrades` : 'Base'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-card/50 border border-primary/20 rounded">
                    <span className="text-muted-foreground">💪 Power</span>
                    <span className="font-bold">{powerUp > 0 ? `${powerUp} upgrades` : 'Base'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-card/50 border border-primary/20 rounded">
                    <span className="text-muted-foreground">🚀 Accel</span>
                    <span className="font-bold">{accelUp > 0 ? `${accelUp} upgrades` : 'Base'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-card/50 border border-primary/20 rounded">
                    <span className="text-muted-foreground">🎯 Stability</span>
                    <span className="font-bold">{stabUp > 0 ? `${stabUp} upgrades` : 'Base'}</span>
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
          
          const isPenalized = currentSpeed < maxSpeed || currentPower < maxPower || 
                              currentAccel < maxAccel || currentStability < maxStability;
          
          return (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-3">
                <div className="flex flex-col items-center p-3 bg-card/50 border border-primary/20 rounded-lg">
                  <span className="text-2xl mb-1">⚡</span>
                  <span className="text-xs text-muted-foreground">Speed</span>
                  <span className={`text-lg font-bold ${currentSpeed < maxSpeed ? 'text-yellow-500' : ''}`}>
                    {currentSpeed}
                  </span>
                  <span className="text-xs text-muted-foreground">/{maxSpeed}</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-card/50 border border-primary/20 rounded-lg">
                  <span className="text-2xl mb-1">💪</span>
                  <span className="text-xs text-muted-foreground">Power</span>
                  <span className={`text-lg font-bold ${currentPower < maxPower ? 'text-yellow-500' : ''}`}>
                    {currentPower}
                  </span>
                  <span className="text-xs text-muted-foreground">/{maxPower}</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-card/50 border border-primary/20 rounded-lg">
                  <span className="text-2xl mb-1">🚀</span>
                  <span className="text-xs text-muted-foreground">Accel</span>
                  <span className={`text-lg font-bold ${currentAccel < maxAccel ? 'text-yellow-500' : ''}`}>
                    {currentAccel}
                  </span>
                  <span className="text-xs text-muted-foreground">/{maxAccel}</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-card/50 border border-primary/20 rounded-lg">
                  <span className="text-2xl mb-1">🎯</span>
                  <span className="text-xs text-muted-foreground">Stability</span>
                  <span className={`text-lg font-bold ${currentStability < maxStability ? 'text-yellow-500' : ''}`}>
                    {currentStability}
                  </span>
                  <span className="text-xs text-muted-foreground">/{maxStability}</span>
                </div>
              </div>
              {isPenalized && (
                <p className="text-xs text-yellow-500 text-center">⚠️ Stats penalized by low battery/condition</p>
              )}
            </div>
          );
        })()}

        {/* Battery & Condition */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Battery</span>
            <span className={Number(stats.battery) < 30 ? 'text-destructive font-bold' : ''}>
              {formatBigInt(stats.battery)}%
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                Number(stats.battery) < 30 ? 'bg-destructive' : 'bg-blue-500'
              }`}
              style={{ width: `${Number(stats.battery)}%` }}
            />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Condition</span>
            <span className={Number(stats.condition) < 30 ? 'text-destructive font-bold' : ''}>
              {formatBigInt(stats.condition)}%
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                Number(stats.condition) < 30 ? 'bg-destructive' : 'bg-green-500'
              }`}
              style={{ width: `${Number(stats.condition)}%` }}
            />
          </div>
        </div>

        {/* Maintenance Actions */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleRecharge}
              disabled={recharging || Number(stats.battery) >= 90 || !!bot.activeMission}
              size="sm"
              variant="outline"
              title={bot.activeMission ? "Cannot recharge while scavenging" : ""}
            >
              {recharging ? (
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
              disabled={repairing || Number(stats.condition) >= 90 || !!bot.activeMission}
              size="sm"
              variant="outline"
              title={bot.activeMission ? "Cannot repair while scavenging" : ""}
            >
              {repairing ? (
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
          {(Number(stats.battery) < 90 || Number(stats.condition) < 90) && !bot.activeMission && (
            <Button
              onClick={handleFullMaintenance}
              disabled={loading || recharging || repairing}
              size="sm"
              variant="secondary"
              className="w-full"
            >
              {loading ? (
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
        </div>

{(() => {
          const upgradeInfo = getUpgradeInfo();
          const pityCounter = Number(bot.upgradeCostsV2?.pityCounter || 0n);
          
          if (bot.activeUpgrade) {
            // Active upgrade state - show current upgrade status AND next upgrade info
            const timeRemaining = getUpgradeTimeRemaining();
            const isComplete = timeRemaining === 'Ready!';
            const upgradeTypeName = Object.keys(bot.activeUpgrade.upgradeType)[0];
            
            return (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-primary">⚡ Upgrade in Progress</p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-medium">{upgradeTypeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={`font-medium ${isComplete ? 'text-green-600' : ''}`}>
                      {isComplete ? 'Ready!' : timeRemaining}
                    </span>
                  </div>
                  <div className="border-t border-primary/20 my-1 pt-1">
                    <p className="text-muted-foreground mb-1">Next Upgrade:</p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="font-medium text-primary">{upgradeInfo.icpCost} ICP / {upgradeInfo.partsCost} parts</span>
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
                </div>
                {isComplete && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowUpgrade(true)}
                    disabled={loading}
                  >
                    ⚡ Start Next Upgrade
                  </Button>
                )}
              </div>
            );
          } else {
            // No active upgrade - show upgrade info card
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
                  💡 Upgrades take 12 hours. Pay with ICP or parts from scavenging!
                </p>
                <Button
                  onClick={() => setShowUpgrade(true)}
                  disabled={loading}
                  size="sm"
                  className="w-full"
                  variant="default"
                >
                  ⚡ Start Upgrade
                </Button>
              </div>
            );
          }
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
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">🔍 Scavenging Active</p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Zone:</span>
                    <span className="font-medium">{Object.keys(mission.zone)[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time Elapsed:</span>
                    <span className="font-medium">
                      {elapsedHours > 0 ? `${elapsedHours}h ${elapsedMinutes}m` : `${elapsedMinutes}m`}
                    </span>
                  </div>
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
                </div>
                <Button
                  onClick={handleCompleteScavenging}
                  disabled={loading}
                  size="sm"
                  className="w-full"
                  variant="outline"
                >
                  {loading ? 'Retrieving...' : '🏠 Retrieve Bot & Collect Parts'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  💡 Parts accumulate every 15 minutes. Retrieve anytime!
                </p>
              </div>
            );
          } else {
            // Idle state - show send button
            return (
              <div className="p-3 bg-muted/30 border border-muted rounded-lg space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">🔍 Scavenging</p>
                <p className="text-xs text-muted-foreground">
                  Send your bot to scavenge for parts. Parts accumulate every 15 minutes!
                </p>
                <Button
                  onClick={() => setShowScavenging(true)}
                  disabled={loading}
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

        {/* Upcoming Races */}
        {(() => {
          if (bot.upcomingRaces && bot.upcomingRaces.length > 0) {
            // Has races - show race list
            return (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-primary">🏁 Upcoming Races ({bot.upcomingRaces.length})</p>
                {bot.upcomingRaces.map((race) => (
                  <Link
                    key={race.raceId}
                    to="/schedule"
                    className="w-full text-xs text-muted-foreground flex justify-between items-center hover:text-primary transition-colors cursor-pointer"
                  >
                    <span className="truncate max-w-[150px]">{race.name}</span>
                    <span className="text-xs font-medium">
                      {formatRelativeTime(race.startTime)}
                    </span>
                  </Link>
                ))}
                <Button
                  className="w-full"
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.href = '/schedule'}
                >
                  Find More Races
                </Button>
              </div>
            );
          } else {
            // No races - show empty state with CTA
            return (
              <div className="p-3 bg-muted/30 border border-muted rounded-lg space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">🏁 Racing</p>
                <p className="text-xs text-muted-foreground">
                  No upcoming races. Find a race that matches your bot's ELO rating!
                </p>
                <Button
                  className="w-full"
                  size="sm"
                  variant="default"
                  onClick={() => window.location.href = '/schedule'}
                >
                  🏁 Find Race
                </Button>
              </div>
            );
          }
        })()}

        {/* Marketplace Actions */}
        <div className="grid grid-cols-2 gap-2">
          {bot.isListed ? (
            <Button
              onClick={handleUnlist}
              disabled={loading}
              size="sm"
              variant="destructive"
            >
              Cancel Listing
            </Button>
          ) : (
            <Button
              onClick={() => setShowListForSale(true)}
              disabled={loading}
              size="sm"
              variant="secondary"
            >
              List for Sale
            </Button>
          )}
          <Button
            onClick={() => setShowTransfer(true)}
            disabled={loading}
            size="sm"
            variant="secondary"
          >
            Transfer
          </Button>
        </div>
        
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
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleListForSale}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Listing...' : 'List for Sale'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowListForSale(false)}
              disabled={loading}
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
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleTransfer}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Transferring...' : 'Transfer Bot'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTransfer(false)}
              disabled={loading}
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
              Continuous scavenging: parts accumulate every 15 minutes. Retrieve your bot anytime! No ICP cost - only battery consumption.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scavenging-zone">Scavenging Zone</Label>
              <Select value={scavengingZone} onValueChange={(value: any) => setScavengingZone(value)}>
                <SelectTrigger id="scavenging-zone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ScrapHeaps">🏜️ Scrap Heaps (Safe) - 40% Universal, 1.0x costs</SelectItem>
                  <SelectItem value="AbandonedSettlements">🏭 Abandoned Settlements (Moderate) - 25% Universal, 1.2x battery, 1.3x condition</SelectItem>
                  <SelectItem value="DeadMachineFields">⚠️ Dead Machine Fields (High Risk) - 10% Universal, 1.5x battery, 1.8x condition, 2.0x parts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-semibold">Zone Details:</p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accumulation Rate:</span>
                  <span className="font-medium">Every 15 minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parts per Hour:</span>
                  <span className={scavengingZone === 'DeadMachineFields' ? 'text-orange-600 font-semibold' : ''}>
                    ~{scavengingZone === 'ScrapHeaps' ? '8-12' : scavengingZone === 'AbandonedSettlements' ? '11-17' : '16-24'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Battery per Hour:</span>
                  <span className={scavengingZone === 'DeadMachineFields' ? 'text-red-600 font-semibold' : ''}>
                    ~{scavengingZone === 'ScrapHeaps' ? '2' : scavengingZone === 'AbandonedSettlements' ? '2.4' : '3'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Condition per Hour:</span>
                  <span className={scavengingZone === 'DeadMachineFields' ? 'text-red-600 font-semibold' : ''}>
                    ~{scavengingZone === 'ScrapHeaps' ? '0.5' : scavengingZone === 'AbandonedSettlements' ? '0.65' : '0.9'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Universal Parts:</span>
                  <span className="font-medium text-primary">
                    {scavengingZone === 'ScrapHeaps' ? '40%' : scavengingZone === 'AbandonedSettlements' ? '25%' : '10%'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                💡 <strong>Continuous Scavenging:</strong> Parts accumulate automatically every 15 min. Retrieve your bot anytime to collect! Death risk increases with low battery/condition.
              </p>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleStartScavenging}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Sending...' : '🔍 Send Bot Out'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowScavenging(false)}
              disabled={loading}
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
            <div className="space-y-2">
              <Label htmlFor="upgrade-type">Stat to Upgrade</Label>
              <Select value={upgradeType} onValueChange={(value: any) => setUpgradeType(value)}>
                <SelectTrigger id="upgrade-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Velocity">Speed (Current: {formatBigInt(stats.speedUpgrades)} upgrades)</SelectItem>
                  <SelectItem value="PowerCore">Power Core (Current: {formatBigInt(stats.powerCoreUpgrades)} upgrades)</SelectItem>
                  <SelectItem value="Thruster">Acceleration (Current: {formatBigInt(stats.accelerationUpgrades)} upgrades)</SelectItem>
                  <SelectItem value="Gyro">Stability (Current: {formatBigInt(stats.stabilityUpgrades)} upgrades)</SelectItem>
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
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
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
    </Card>
  );
}
