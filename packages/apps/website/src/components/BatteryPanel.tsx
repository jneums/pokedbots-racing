import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Battery, Zap, Wrench, RotateCcw, Trash2, ChevronDown, ChevronRight, AlertCircle, Flame, Power, Loader2 } from 'lucide-react';
import { useBatteries, useBotHeat, useJoltBot, useRepairBattery, useRebuildBattery, useSalvageBattery, useToggleBattery, useBatteryInfo } from '../hooks/useGarage';
import type { BatteryInfo, BotHeatStatus } from '../hooks/useGarage';
import { toast } from 'sonner';

interface BatteryPanelProps {
  bots: Array<{
    tokenIndex: bigint;
    name?: string;
  }>;
}

// Battery type to image size mapping
const BATTERY_IMAGE_SIZE: Record<string, string> = {
  'ScrapCell': 'sm',
  'SalvagePack': 'md',
  'IndustrialBank': 'lg',
  'PlasmaVault': 'xl',
};

// Charge percentage to image state mapping (based on stored energy level)
function getChargeState(chargePercent: number): string {
  if (chargePercent <= 0) return 'dead';
  if (chargePercent <= 32) return 'low';
  if (chargePercent <= 65) return 'mid';
  return 'hi';
}

// Health percentage to glow color - DEPRECATED, use getGlowStyleFromCapacity instead
// Kept for backwards compatibility
function getGlowStyle(healthPercent: number): { glowColor: string; glowIntensity: string } {
  return getGlowStyleFromCapacity(healthPercent); // Just forward to new function
}

// Get battery image path (based on charge level, not health)
function getBatteryImagePath(batteryType: string, chargePercent: number): string {
  const size = BATTERY_IMAGE_SIZE[batteryType] || 'sm';
  const state = getChargeState(chargePercent);
  return `/batteries/${size}_bat_${state}.webp`;
}

// Battery type colors for text/badges
const BATTERY_STYLES: Record<string, { color: string; bgColor: string }> = {
  'ScrapCell': { color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
  'SalvagePack': { color: 'text-green-400', bgColor: 'bg-green-500/20' },
  'IndustrialBank': { color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'PlasmaVault': { color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
};

// Calculate capacity percentage from cycles (matches backend realistic curve)
// - 0-100 cycles: Plateau phase (100% → 90%)
// - 100-150 cycles: Early decline (90% → 70%)
// - 150-200 cycles: "Knee" region (70% → 30%)
// - 200-250 cycles: End of life (30% → 0%)
function getCapacityFromCycles(cycles: number): number {
  if (cycles < 100) {
    return Math.round((1.0 - (cycles * 0.001)) * 100);
  } else if (cycles < 150) {
    return Math.round((0.9 - ((cycles - 100) * 0.004)) * 100);
  } else if (cycles < 200) {
    return Math.round((0.7 - ((cycles - 150) * 0.008)) * 100);
  } else {
    const remaining = 0.3 - ((cycles - 200) * 0.006);
    return Math.max(0, Math.round(remaining * 100));
  }
}

// Get glow style based on capacity (instead of old health system)
function getGlowStyleFromCapacity(capacityPercent: number): { glowColor: string; glowIntensity: string } {
  if (capacityPercent <= 0) return { glowColor: '', glowIntensity: '' }; // Dead - no glow
  if (capacityPercent <= 30) return { glowColor: 'rgba(239, 68, 68, 0.8)', glowIntensity: '0 0 12px' }; // Red glow - critical
  if (capacityPercent <= 70) return { glowColor: 'rgba(251, 146, 60, 0.7)', glowIntensity: '0 0 10px' }; // Orange glow - worn
  return { glowColor: 'rgba(249, 115, 22, 0.9)', glowIntensity: '0 0 14px' }; // Bright orange - fresh
}

function BatteryCard({ battery, onJolt, onRepair, onRebuild, onSalvage, onToggle, bots, isJolting, togglingBatteryId }: {
  battery: BatteryInfo;
  onJolt: (batteryId: bigint, tokenIndex: number) => void;
  onRepair: (batteryId: bigint) => void;
  onRebuild: (batteryId: bigint, useIcp: boolean) => void;
  onSalvage: (batteryId: bigint) => void;
  onToggle: (batteryId: bigint) => void;
  bots: BatteryPanelProps['bots'];
  isJolting: boolean;
  togglingBatteryId: bigint | null;
}) {
  const [showJoltDialog, setShowJoltDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [selectedBot, setSelectedBot] = useState<number | null>(null);
  
  const style = BATTERY_STYLES[battery.batteryType] || BATTERY_STYLES['ScrapCell'];
  const chargePercent = battery.maxCapacityKwh > 0 
    ? Math.round((battery.storedKwh / battery.maxCapacityKwh) * 100) 
    : 0;
  // Calculate capacity from cycles (new system - replaces healthPercent)
  const cycles = Math.round(battery.cyclesPercent); // Note: cyclesPercent is actually raw cycle count
  const capacityPercent = getCapacityFromCycles(cycles);
  
  // Get battery image based on charge level, glow based on capacity
  // Show dead icon if battery is not operational (capacity = 0%)
  const imagePath = getBatteryImagePath(battery.batteryType, battery.isOperational ? chargePercent : 0);
  const { glowColor, glowIntensity } = getGlowStyleFromCapacity(capacityPercent);
  
  // Check if this specific battery is being toggled
  const isToggling = togglingBatteryId === battery.id;
  
  // All bots are eligible for jolting - the backend will handle actual eligibility
  const eligibleBots = bots;

  return (
    <div className={`p-2.5 rounded-lg border ${style.bgColor} ${!battery.isOperational ? 'opacity-60' : ''}`}>
      {/* Header Row: Image, Info, Toggle */}
      <div className="flex items-center gap-2.5 mb-2">
        {/* Battery Image with Glow */}
        <div className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center">
          <img 
            src={imagePath} 
            alt={battery.batteryType}
            className="w-9 h-9 object-contain"
            style={{
              filter: capacityPercent > 0 
                ? `drop-shadow(${glowIntensity} ${glowColor}) drop-shadow(0 0 8px ${glowColor})` 
                : 'brightness(0.5)',
            }}
          />
        </div>
        
        {/* Title & Serial */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold text-sm ${style.color} truncate`}>{battery.batteryType}</span>
            {!battery.isOperational && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">Dead</Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">SN-{String(battery.id).padStart(6, '0')}</span>
        </div>
        
        {/* Power Toggle */}
        <div className="flex items-center gap-1">
          {isToggling ? (
            <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
          ) : (
            <Power className={`w-3 h-3 ${battery.isEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
          )}
          <Switch
            checked={battery.isEnabled}
            onCheckedChange={() => onToggle(battery.id)}
            disabled={isToggling || !battery.isOperational}
            className="scale-75"
          />
        </div>
      </div>
      
      {/* Charge Bar - inline */}
      <div className="flex items-center gap-2 mb-2">
        <Progress value={chargePercent} className="h-1.5 flex-1" />
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{battery.storedKwh.toFixed(1)}/{battery.maxCapacityKwh.toFixed(0)} kWh</span>
      </div>
      
      {/* Stats Row: Capacity, Cycles, Jolts inline */}
      <div className="flex items-center gap-3 text-[10px] mb-2">
        <div className={`flex items-center gap-1 ${capacityPercent < 30 ? 'text-red-400' : capacityPercent < 70 ? 'text-orange-400' : 'text-muted-foreground'}`}>
          <span>Cap</span>
          <span className="font-bold">{capacityPercent}%</span>
        </div>
        <div className={`flex items-center gap-1 ${cycles > 200 ? 'text-red-400' : cycles > 150 ? 'text-orange-400' : 'text-muted-foreground'}`}>
          <span>Cyc</span>
          <span className="font-bold">{cycles}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Zap className="w-2.5 h-2.5" />
          <span className="font-bold">{Number(battery.totalJoltsDelivered)}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground ml-auto">
          <span>{battery.kwhThroughput.toFixed(1)} kWh</span>
        </div>
      </div>
      
      {/* Actions - smaller */}
      <div className="flex gap-1.5">
        <Button 
          size="sm" 
          className="flex-1 h-7 text-xs"
          disabled={!battery.isOperational || battery.storedKwh < 1.5 || eligibleBots.length === 0 || isJolting}
          onClick={() => setShowJoltDialog(true)}
        >
          <Zap className="w-3 h-3 mr-1" />
          Jolt
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className="h-7 w-7 p-0"
          onClick={() => setShowMaintenanceDialog(true)}
        >
          <Wrench className="w-3 h-3" />
        </Button>
      </div>
      
      {/* Jolt Dialog */}
      <Dialog open={showJoltDialog} onOpenChange={setShowJoltDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jolt a Bot</DialogTitle>
            <DialogDescription>
              Select a bot to receive energy from this battery.
              Uses 1.5 kWh for 20-30% battery boost.
              ({Math.floor(battery.storedKwh / 1.5)} jolts available)
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select onValueChange={(v) => setSelectedBot(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a bot..." />
              </SelectTrigger>
              <SelectContent>
                {eligibleBots.map(bot => (
                  <SelectItem key={String(bot.tokenIndex)} value={String(bot.tokenIndex)}>
                    {bot.name || `Bot #${bot.tokenIndex}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {eligibleBots.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                You don't have any bots registered.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoltDialog(false)}>
              Cancel
            </Button>
            <Button 
              disabled={selectedBot === null || isJolting}
              onClick={() => {
                if (selectedBot !== null) {
                  onJolt(battery.id, selectedBot);
                  setShowJoltDialog(false);
                  setSelectedBot(null);
                }
              }}
            >
              {isJolting ? 'Jolting...' : 'Jolt Bot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Maintenance Dialog */}
      <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Battery Maintenance</DialogTitle>
            <DialogDescription>
              Repair, rebuild, or salvage this {battery.batteryType}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Battery Status */}
            <div className="p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Battery className="w-4 h-4" />
                  <span className="font-medium">Battery Status</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Cycles: <span className={`font-medium ${cycles > 200 ? 'text-red-400' : cycles > 150 ? 'text-orange-400' : ''}`}>{cycles}</span></p>
                <p>Capacity: <span className={`font-medium ${capacityPercent < 30 ? 'text-red-400' : capacityPercent < 70 ? 'text-orange-400' : ''}`}>{capacityPercent}%</span></p>
                <p className="text-xs text-muted-foreground/70 mt-2">
                  Capacity decreases as cycles increase. At 250+ cycles, capacity reaches 0%.
                </p>
              </div>
            </div>
            
            {/* Rebuild Option */}
            <div className="p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  <span className="font-medium">Rebuild Core</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Reset cycles to 0, restoring 100% capacity. Current: {cycles} cycles → {capacityPercent}% capacity
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                ⚠️ Battery will be EMPTY after rebuild
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="secondary"
                  disabled={cycles < 10}
                  onClick={() => {
                    onRebuild(battery.id, false);
                    setShowMaintenanceDialog(false);
                  }}
                >
                  {battery.batteryType === 'ScrapCell' && '300 Parts'}
                  {battery.batteryType === 'SalvagePack' && '900 Parts'}
                  {battery.batteryType === 'IndustrialBank' && '2,400 Parts'}
                  {battery.batteryType === 'PlasmaVault' && '6,000 Parts'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  disabled={cycles < 10}
                  onClick={() => {
                    onRebuild(battery.id, true);
                    setShowMaintenanceDialog(false);
                  }}
                >
                  {battery.batteryType === 'ScrapCell' && '2 ICP'}
                  {battery.batteryType === 'SalvagePack' && '5 ICP'}
                  {battery.batteryType === 'IndustrialBank' && '12 ICP'}
                  {battery.batteryType === 'PlasmaVault' && '25 ICP'}
                </Button>
              </div>
            </div>
            
            {/* Salvage Option */}
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-destructive" />
                  <span className="font-medium text-destructive">Salvage Battery</span>
                </div>
                <Badge variant="destructive">Permanent</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Destroy the battery to recover some Universal Parts. This cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    Salvage
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Salvage Battery?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently destroy your {battery.batteryType} and return some Universal Parts.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        onSalvage(battery.id);
                        setShowMaintenanceDialog(false);
                      }}
                    >
                      Salvage
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function BatteryPanel({ bots }: BatteryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [togglingBatteryId, setTogglingBatteryId] = useState<bigint | null>(null);
  
  const { data: batteriesData, isLoading, refetch } = useBatteries();
  const { data: batteryTypeInfo } = useBatteryInfo();
  const joltMutation = useJoltBot();
  const repairMutation = useRepairBattery();
  const rebuildMutation = useRebuildBattery();
  const salvageMutation = useSalvageBattery();
  const toggleMutation = useToggleBattery();
  
  const handleJolt = async (batteryId: bigint, tokenIndex: number) => {
    try {
      const result = await joltMutation.mutateAsync({ batteryId, tokenIndex });
      toast.success(result.message);
    } catch (err: any) {
      toast.error(err.message || 'Failed to jolt bot');
    }
  };
  
  const handleRepair = async (batteryId: bigint) => {
    try {
      const result = await repairMutation.mutateAsync(batteryId);
      toast.success(`Repaired battery! Health now: ${Number(result.newHealth)}%`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to repair battery');
    }
  };
  
  const handleRebuild = async (batteryId: bigint, useIcp: boolean) => {
    try {
      await rebuildMutation.mutateAsync({ batteryId, useIcp });
      toast.success('Battery core rebuilt successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to rebuild battery');
    }
  };
  
  const handleSalvage = async (batteryId: bigint) => {
    try {
      const result = await salvageMutation.mutateAsync(batteryId);
      toast.success(`Salvaged ${result.batteryType}! Got ${result.partsReturned} Universal Parts`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to salvage battery');
    }
  };
  
  const handleToggle = async (batteryId: bigint) => {
    try {
      setTogglingBatteryId(batteryId);
      const result = await toggleMutation.mutateAsync(batteryId);
      toast.success(result.message);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle battery');
    } finally {
      setTogglingBatteryId(null);
    }
  };
  
  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Battery className="w-6 h-6 mx-auto mb-2 animate-pulse" />
        Loading batteries...
      </div>
    );
  }
  
  const batteries = batteriesData?.batteries || [];
  const summary = batteriesData?.summary;
  
  return (
    <div className="py-2">
      {/* Header */}
      <button 
        className="flex items-center justify-between w-full text-left hover:bg-muted/50 rounded p-1 -m-1"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <Battery className="w-3 h-3 text-muted-foreground" />
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">
            Battery Storage
          </h4>
        </div>
        <Badge variant="secondary" className="text-[10px] h-4">
          {batteries.length}
        </Badge>
      </button>
      
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Summary Stats */}
          {summary && batteries.length > 0 && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-1.5 bg-muted/30 rounded">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{Number(summary.totalBatteries)}</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-muted/30 rounded">
                <span className="text-muted-foreground">Working</span>
                <span className="font-bold text-green-400">{Number(summary.operationalBatteries)}</span>
              </div>
              <div className="col-span-2 flex items-center justify-between p-1.5 bg-primary/10 border border-primary/30 rounded">
                <span className="text-primary font-medium">Stored Energy</span>
                <span className="font-bold text-primary">
                  {summary.totalStoredKwh.toFixed(1)} / {summary.totalCapacityKwh.toFixed(1)} kWh
                </span>
              </div>
            </div>
          )}
          
          {/* Battery List */}
          {batteries.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground border border-dashed rounded-lg">
              <div className="w-16 h-16 mx-auto mb-2 opacity-40">
                <img 
                  src="/batteries/md_bat_dead.webp" 
                  alt="No batteries"
                  className="w-full h-full object-contain grayscale"
                />
              </div>
              <p className="text-sm">No batteries yet</p>
              <p className="text-xs mt-1">Find batteries while scavenging!</p>
              
              {/* First battery progress */}
              {summary && !summary.firstBatteryDiscovered && (
                <div className="mt-3 pt-3 border-t border-dashed">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">First battery guaranteed:</span>
                    <span className="font-medium text-primary">
                      {Math.min(summary.cumulativeScavengingHours, 20).toFixed(1)} / 20 hrs
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.min((summary.cumulativeScavengingHours / 20) * 100, 100)}%` }}
                    />
                  </div>
                  {summary.cumulativeScavengingHours < 20 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      ~{(20 - summary.cumulativeScavengingHours).toFixed(1)} more hours of scavenging
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {batteries.map(battery => (
                <BatteryCard
                  key={String(battery.id)}
                  battery={battery}
                  onJolt={handleJolt}
                  onRepair={handleRepair}
                  onRebuild={handleRebuild}
                  onSalvage={handleSalvage}
                  onToggle={handleToggle}
                  bots={bots}
                  isJolting={joltMutation.isPending}
                  togglingBatteryId={togglingBatteryId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Heat indicator for bot cards - shows overheat stacks from rapid jolting
export function BotHeatIndicator({ tokenIndex }: { tokenIndex: number }) {
  const { data: heat, isLoading } = useBotHeat(tokenIndex);
  
  if (isLoading || !heat) return null;
  
  const stacks = Number(heat.heatStacks);
  if (stacks === 0 && !heat.isOverheated) return null;

  // Generate tooltip text based on current state
  const getTooltipText = () => {
    if (heat.isOverheated) {
      const mins = heat.minutesUntilCooldown ? Number(heat.minutesUntilCooldown) : 0;
      return `🔥 OVERHEATED! Cannot jolt until cooled down (${mins}m remaining). Heat builds from rapid jolting - wait between jolts to avoid this.`;
    }
    const penalty = stacks * 15;
    return `⚡ Heat: ${stacks}/4 stacks (-${penalty}% jolt effectiveness). Stacks decay 1 per hour. At 4 stacks, the bot overheats and can't be jolted.`;
  };
  
  return (
    <div className="flex items-center gap-1" title={getTooltipText()}>
      {heat.isOverheated ? (
        <Badge variant="destructive" className="text-xs cursor-help">
          <Flame className="w-3 h-3 mr-1" />
          Overheated
          {heat.minutesUntilCooldown && (
            <span className="ml-1">({Number(heat.minutesUntilCooldown)}m)</span>
          )}
        </Badge>
      ) : (
        <div className="flex items-center gap-0.5 cursor-help">
          <Flame className="w-3 h-3 text-orange-500" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div 
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < stacks 
                  ? 'bg-orange-500' 
                  : 'bg-muted/30 border border-muted'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
