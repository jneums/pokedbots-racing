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
  const [missionType, setMissionType] = useState<'ShortExpedition' | 'DeepSalvage' | 'WastelandExpedition'>('ShortExpedition');
  const [scavengingZone, setScavengingZone] = useState<'ScrapHeaps' | 'AbandonedSettlements' | 'DeadMachineFields'>('ScrapHeaps');
  const [botName, setBotName] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [loading, setLoading] = useState(false);
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
    
    setLoading(true);
    setError(null);
    try {
      await rechargeBot(Number(bot.tokenIndex), user.agent as any);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to recharge');
    } finally {
      setLoading(false);
    }
  };

  const handleRepair = async () => {
    if (!user?.agent) return;
    
    setLoading(true);
    setError(null);
    try {
      await repairBot(Number(bot.tokenIndex), user.agent as any);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to repair');
    } finally {
      setLoading(false);
    }
  };

  const handleStartScavenging = async () => {
    if (!user?.agent) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await startScavenging(Number(bot.tokenIndex), missionType, scavengingZone, user.agent as any);
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

  // Calculate upgrade costs based on current upgrade count
  // Costs: 100→200→300→900→2700→8100 parts (100 parts = 1 ICP)
  const getUpgradeCostInParts = (upgradeCount: number): number => {
    if (upgradeCount === 0) return 100;
    if (upgradeCount === 1) return 200;
    if (upgradeCount === 2) return 300;
    if (upgradeCount === 3) return 900;
    if (upgradeCount === 4) return 2700;
    return 8100; // 5+ upgrades
  };

  const getCurrentUpgradeCount = (type: 'Velocity' | 'PowerCore' | 'Thruster' | 'Gyro'): number => {
    if (!bot.isInitialized || !bot.stats) return 0;
    const stats = bot.stats as any;
    switch (type) {
      case 'Velocity': return Number(stats.speedUpgrades || 0n);
      case 'PowerCore': return Number(stats.powerCoreUpgrades || 0n);
      case 'Thruster': return Number(stats.accelerationUpgrades || 0n);
      case 'Gyro': return Number(stats.stabilityUpgrades || 0n);
      default: return 0;
    }
  };

  const getUpgradeInfo = () => {
    const currentCount = getCurrentUpgradeCount(upgradeType);
    const partsCost = getUpgradeCostInParts(currentCount);
    const icpCost = partsCost / 100; // 100 parts = 1 ICP
    return {
      currentCount,
      icpCost: icpCost.toFixed(2),
      partsCost,
    };
  };

  const getUpgradeTimeRemaining = () => {
    if (!stats.activeUpgrade || stats.activeUpgrade.length === 0) return null;
    const upgrade = stats.activeUpgrade[0];
    const endsAt = Number(upgrade.endsAt) / 1_000_000; // Convert nanoseconds to milliseconds
    const now = Date.now();
    const remaining = endsAt - now;
    
    if (remaining <= 0) return 'Completing...';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
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
          <Avatar className="h-12 w-12">
            <AvatarImage src={imageUrl} alt={bot.name || `Bot #${bot.tokenIndex}`} />
            <AvatarFallback>#{bot.tokenIndex.toString().slice(-2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex items-center justify-between">
            <span>{bot.name || `Bot #${bot.tokenIndex.toString()}`}</span>
            <Badge variant={getFactionColor(stats.faction)}>
              {getFactionName(stats.faction)}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          ELO: {formatBigInt(stats.eloRating)} | Rep: {formatBigInt(stats.factionReputation)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Stats - Note: These are base stats. For detailed stats, visit bot details page */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Speed Upgrades</p>
            <p className="font-bold">{formatBigInt(stats.speedUpgrades)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Power Upgrades</p>
            <p className="font-bold">{formatBigInt(stats.powerCoreUpgrades)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Accel Upgrades</p>
            <p className="font-bold">{formatBigInt(stats.accelerationUpgrades)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Stability Upgrades</p>
            <p className="font-bold">{formatBigInt(stats.stabilityUpgrades)}</p>
          </div>
        </div>

        {bot.activeUpgrade ? (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <p className="text-sm font-semibold text-primary">⚡ Upgrade in Progress</p>
            <p className="text-xs text-muted-foreground mt-1">
              {Object.keys(bot.activeUpgrade.upgradeType)[0]} • {getUpgradeTimeRemaining()}
            </p>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => setShowUpgrade(true)}
            disabled={loading}
          >
            ⚡ Upgrade Stats
          </Button>
        )}

        <Button
          variant="link"
          className="w-full text-xs text-primary"
          onClick={() => window.location.href = `/bot/${bot.tokenIndex}`}
        >
          View Full Stats & Details →
        </Button>

        {/* Active Scavenging Mission */}
        {bot.activeMission && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg space-y-2">
            <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">🔍 Scavenging Mission Active</p>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mission:</span>
                <span className="font-medium">{Object.keys(bot.activeMission.missionType)[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zone:</span>
                <span className="font-medium">{Object.keys(bot.activeMission.zone)[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium">
                  {formatRelativeTime(bot.activeMission.endTime)}
                </span>
              </div>
            </div>
            <Button
              onClick={handleCompleteScavenging}
              disabled={loading || Date.now() < Number(bot.activeMission.endTime) / 1_000_000}
              size="sm"
              className="w-full"
              variant="outline"
            >
              {Date.now() < Number(bot.activeMission.endTime) / 1_000_000 ? 'Mission In Progress...' : 'Complete Mission'}
            </Button>
          </div>
        )}

        {/* Upcoming Races */}
        {bot.upcomingRaces && bot.upcomingRaces.length > 0 && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
            <p className="text-sm font-semibold text-primary">🏁 Upcoming Races ({bot.upcomingRaces.length})</p>
            {bot.upcomingRaces.slice(0, 2).map((race) => (
              <Link
                key={race.raceId}
                to="/schedule"
                className="w-full text-xs text-muted-foreground flex justify-between items-center hover:text-primary transition-colors cursor-pointer"
              >
                <span className="truncate max-w-[150px]">{race.name}</span>
                <span className="text-xs">
                  {new Date(Number(race.startTime) / 1_000_000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </Link>
            ))}
            {bot.upcomingRaces.length > 2 && (
              <Link
                to="/schedule"
                className="w-full text-xs text-muted-foreground text-center hover:text-primary transition-colors cursor-pointer block"
              >
                +{bot.upcomingRaces.length - 2} more
              </Link>
            )}
          </div>
        )}

        {/* Condition */}
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
                Number(stats.battery) < 30 ? 'bg-destructive' : 'bg-primary'
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

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={handleRecharge}
            disabled={loading || Number(stats.battery) >= 90}
            size="sm"
            variant="outline"
          >
            Recharge
          </Button>
          <Button
            onClick={handleRepair}
            disabled={loading || Number(stats.condition) >= 90}
            size="sm"
            variant="outline"
          >
            Repair
          </Button>
          <Button
            onClick={() => setShowScavenging(true)}
            disabled={loading || !!bot.activeMission}
            size="sm"
            variant="outline"
          >
            {bot.activeMission ? 'On Mission' : 'Scavenge'}
          </Button>
        </div>

        <Button
          className="w-full"
          size="sm"
          onClick={() => window.location.href = '/schedule'}
        >
          Enter Race
        </Button>

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

        {/* Stats */}
        <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Wins</span>
            <span>{formatBigInt(stats.wins)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Races</span>
            <span>{formatBigInt(stats.racesEntered)}</span>
          </div>
          <div className="flex justify-between">
            <span>Win Rate</span>
            <span>
              {Number(stats.racesEntered) > 0
                ? `${((Number(stats.wins) / Number(stats.racesEntered)) * 100).toFixed(1)}%`
                : 'N/A'}
            </span>
          </div>
        </div>
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
            <DialogTitle>Start Scavenging Mission</DialogTitle>
            <DialogDescription>
              Send your bot to scavenge the wasteland for upgrade parts. No ICP cost - only battery consumption.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mission-type">Mission Duration</Label>
              <Select value={missionType} onValueChange={(value: any) => setMissionType(value)}>
                <SelectTrigger id="mission-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ShortExpedition">⚡ Short Expedition (5h) - 15-35 parts, 10 battery</SelectItem>
                  <SelectItem value="DeepSalvage">🔍 Deep Salvage (11h) - 40-80 parts, 20 battery</SelectItem>
                  <SelectItem value="WastelandExpedition">🏜️ Wasteland Expedition (23h) - 100-200 parts, 40 battery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scavenging-zone">Scavenging Zone</Label>
              <Select value={scavengingZone} onValueChange={(value: any) => setScavengingZone(value)}>
                <SelectTrigger id="scavenging-zone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ScrapHeaps">🏜️ Scrap Heaps (Safe) - 1.0x costs, 40% Universal Parts</SelectItem>
                  <SelectItem value="AbandonedSettlements">🏭 Abandoned Settlements (Moderate) - 1.4x parts, 1.2x costs, 25% Universal</SelectItem>
                  <SelectItem value="DeadMachineFields">⚠️ Dead Machine Fields (High Risk) - 2.0x parts, 1.3x costs, 10% Universal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-semibold">Mission Details:</p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{missionType === 'ShortExpedition' ? '5 hours' : missionType === 'DeepSalvage' ? '11 hours' : '23 hours'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Battery:</span>
                  <span>{missionType === 'ShortExpedition' ? '10' : missionType === 'DeepSalvage' ? '20' : '40'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parts Multiplier:</span>
                  <span className={scavengingZone === 'DeadMachineFields' ? 'text-orange-600 font-semibold' : ''}>{scavengingZone === 'ScrapHeaps' ? '1.0x' : scavengingZone === 'AbandonedSettlements' ? '1.4x' : '2.0x'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost Multiplier:</span>
                  <span className={scavengingZone === 'DeadMachineFields' ? 'text-red-600 font-semibold' : ''}>{scavengingZone === 'ScrapHeaps' ? '1.0x' : scavengingZone === 'AbandonedSettlements' ? '1.2x' : '1.3x'}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                💡 Tip: Riskier zones = more parts but higher battery & condition costs. Universal Parts work for any upgrade!
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
              {loading ? 'Starting...' : 'Start Mission'}
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

            {/* Upgrade Cost Display */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Level:</span>
                <span className="font-bold">{getUpgradeInfo().currentCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost (ICP):</span>
                <span className="font-bold text-primary">{getUpgradeInfo().icpCost} ICP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost (Parts):</span>
                <span className="font-bold text-primary">{getUpgradeInfo().partsCost} parts</span>
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
