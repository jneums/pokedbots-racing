import { useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Loader2, X, ChevronDown, ChevronRight, Cog, Swords, FlaskConical, Hammer } from 'lucide-react';
import {
  useBotGearLoadout,
  usePlayerGear,
  useEquipGear,
  useUnequipGear,
  useCraftGear,
  usePlayerConsumables,
  useEquipConsumable,
  useUnequipConsumable,
  useGearEquipMap,
  useRecentGear,
} from '../hooks/useGarage';
import type { GearPieceView } from '../hooks/useGarage';
import type { ConsumableView } from '../hooks/useGarage';
import { getCraftingGearRows } from './gearCrafting';
import { toast } from 'sonner';

const SLOT_ORDER = ['Legs', 'Thruster', 'Chassis', 'Gyro', 'Core', 'Module'] as const;

const SLOT_LABELS: Record<string, string> = {
  Legs: '🦿 Legs',
  Thruster: '🔥 Thruster',
  Chassis: '🛡️ Chassis',
  Gyro: '🌀 Gyro',
  Core: '⚡ Core',
  Module: '🔧 Module',
};

const RARITY_COLORS: Record<string, string> = {
  Common: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  Uncommon: 'bg-green-500/20 text-green-400 border-green-500/30',
  Rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Legendary: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

const RARITY_BORDER: Record<string, string> = {
  Common: 'border-zinc-600/40',
  Uncommon: 'border-green-600/40',
  Rare: 'border-blue-600/40',
  Epic: 'border-purple-600/40',
  Legendary: 'border-amber-500/50',
};

const CATEGORY_BADGE: Record<string, string> = {
  Standard: '',
  Unique: '✦',
  Named: '★',
};

function formatPassive(passive: any): string {
  if (!passive) return '';
  const key = Object.keys(passive)[0];
  const val = passive[key];
  const labels: Record<string, string> = {
    SlipstreamBoost: `+${Number(val?.extraPercent || 0)}% slipstream bonus`,
    ComebackKid: `+${Number(val?.boostPercent || 0)}% when in last place`,
    FastStarter: `+${Number(val?.boostPercent || 0)}% for first ${Number(val?.segmentCount || 0)} segments`,
    TerrainMastery: `+${Number(val?.boostPercent || 0)}% on ${val?.terrain ? Object.keys(val.terrain)[0] : 'matched'} terrain`,
    SteadyPace: `${Number(val?.varianceReduction || 0)}% less variance`,
    LuckAmplifier: `+${Number(val?.procChanceBonus || 0)}% luck proc chance`,
    Ironclad: `${Number(val?.badLuckReduction || 0)}% less bad luck penalty`,
    FinalSurge: `+${Number(val?.boostPercent || 0)}% for last ${Number(val?.segmentCount || 0)} segments`,
    RubberBandResist: `${Number(val?.resistPercent || 0)}% rubber-band resist`,
    UphillGrinder: `+${Number(val?.boostPercent || 0)}% uphill bonus`,
    DownhillDaredevil: `+${Number(val?.boostPercent || 0)}% downhill bonus`,
    PackRunner: `+${Number(val?.boostPercent || 0)}% when in the pack`,
  };
  return labels[key] || key;
}

function statBar(label: string, value: number) {
  if (value === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/70 rounded-full"
          style={{ width: `${Math.min(value * 2, 100)}%` }}
        />
      </div>
      <span className="font-mono text-[11px] w-6 text-right text-primary">+{value}</span>
    </div>
  );
}

function GearSlotCard({
  slotName,
  gear,
  onClickSlot,
  onUnequip,
  isLoading,
  isNew,
}: {
  slotName: string;
  gear: GearPieceView | null;
  onClickSlot: () => void;
  onUnequip: () => void;
  isLoading: boolean;
  isNew?: boolean;
}) {
  const borderClass = gear ? RARITY_BORDER[gear.rarity] || 'border-border' : 'border-dashed border-muted-foreground/30';

  return (
    <div
      className={`relative rounded-lg border ${borderClass} bg-card/50 p-2 cursor-pointer hover:bg-card/80 transition-colors min-h-[72px]`}
      onClick={onClickSlot}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {SLOT_LABELS[slotName] || slotName}
        </span>
        <div className="flex items-center gap-1">
          {isNew && (
            <span className="gear-new-badge text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 rounded px-1 py-0">
              NEW
            </span>
          )}
          {gear && !isLoading && (
          <button
            className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onUnequip();
            }}
            title="Unequip"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : gear ? (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            {CATEGORY_BADGE[gear.category] && (
              <span className="text-xs">{CATEGORY_BADGE[gear.category]}</span>
            )}
            <span className="text-xs font-semibold truncate">{gear.name}</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${RARITY_COLORS[gear.rarity] || ''}`}>
              {gear.rarity}
            </Badge>
            <span className="text-[9px] text-muted-foreground">ilvl {gear.ilvl}</span>
            {gear.terrainTag !== 'Universal' && (
              <span className="text-[9px] text-muted-foreground">🌍{gear.terrainTag}</span>
            )}
          </div>
          <div className="flex gap-1.5 text-[9px] text-primary/80 flex-wrap">
            {gear.speedBonus > 0 && <span>SPD+{gear.speedBonus}</span>}
            {gear.accelerationBonus > 0 && <span>ACC+{gear.accelerationBonus}</span>}
            {gear.powerCoreBonus > 0 && <span>PWR+{gear.powerCoreBonus}</span>}
            {gear.stabilityBonus > 0 && <span>STB+{gear.stabilityBonus}</span>}
            {gear.luckBonus > 0 && <span>LCK+{gear.luckBonus}</span>}
          </div>
          {gear.passive && (
            <div className="text-[9px] text-purple-400 truncate">
              ✦ {formatPassive(gear.passive)}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-1">
          <span className="text-[10px] text-muted-foreground/50 italic">Empty</span>
        </div>
      )}
    </div>
  );
}

function GearPieceDetail({ gear }: { gear: GearPieceView }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {CATEGORY_BADGE[gear.category] && (
          <span className="text-base">{CATEGORY_BADGE[gear.category]}</span>
        )}
        <span className="font-bold">{gear.name}</span>
        <Badge variant="outline" className={`text-xs ${RARITY_COLORS[gear.rarity] || ''}`}>
          {gear.rarity}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{gear.description}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
        <span className="text-muted-foreground">Slot</span>
        <span>{SLOT_LABELS[gear.slot] || gear.slot}</span>
        <span className="text-muted-foreground">Item Level</span>
        <span>{gear.ilvl}</span>
        <span className="text-muted-foreground">Terrain</span>
        <span>{gear.terrainTag}</span>
        <span className="text-muted-foreground">Category</span>
        <span>{gear.category}</span>
      </div>
      <div className="space-y-0.5 pt-1">
        {statBar('SPD', gear.speedBonus)}
        {statBar('ACC', gear.accelerationBonus)}
        {statBar('PWR', gear.powerCoreBonus)}
        {statBar('STB', gear.stabilityBonus)}
        {statBar('LCK', gear.luckBonus)}
      </div>
      {gear.passive && (
        <div className="text-xs border border-purple-500/30 bg-purple-500/10 rounded p-1.5 mt-1">
          <span className="font-semibold text-purple-400">Passive: </span>
          {formatPassive(gear.passive)}
        </div>
      )}
    </div>
  );
}

// ------------- Consumable slot card ---------------

const TRIGGER_LABELS: Record<string, string> = {
  OnRaceStart: '🏁 Race Start',
  OnLastPlace: '😰 Last Place',
  OnFinalLap: '🔔 Final Lap',
  OnLeadChange: '🔄 Lead Change',
  OnOvertaken: '💨 Overtaken',
  OnLuckProc: '🍀 Luck Proc',
  OnBadLuck: '⚡ Bad Luck',
};

function ConsumableSlotCard({
  slotNum,
  consumable,
  onClickSlot,
  onUnequip,
  isLoading,
}: {
  slotNum: number;
  consumable: ConsumableView | null;
  onClickSlot: () => void;
  onUnequip: () => void;
  isLoading: boolean;
}) {
  const borderClass = consumable
    ? RARITY_BORDER[consumable.rarity] || 'border-border'
    : 'border-dashed border-muted-foreground/30';

  return (
    <div
      className={`relative rounded-lg border ${borderClass} bg-card/50 p-2 cursor-pointer hover:bg-card/80 transition-colors min-h-[72px]`}
      onClick={onClickSlot}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          🧪 Consumable {slotNum}
        </span>
        {consumable && !isLoading && (
          <button
            className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onUnequip();
            }}
            title="Unequip"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : consumable ? (
        <div className="space-y-1">
          <span className="text-xs font-semibold truncate block">{consumable.name}</span>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${RARITY_COLORS[consumable.rarity] || ''}`}>
              {consumable.rarity}
            </Badge>
            <span className="text-[9px] text-muted-foreground">
              {TRIGGER_LABELS[consumable.triggerType] || consumable.triggerType}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-1">
          <span className="text-[10px] text-muted-foreground/50 italic">Empty</span>
        </div>
      )}
    </div>
  );
}

// ------------- Crafting sub-panel ---------------

function CraftingPanel({ tokenIndex, playerGear, onCraftSuccess, recentGearIds }: { tokenIndex: number; playerGear: GearPieceView[]; onCraftSuccess: () => void; recentGearIds: Set<string> }) {
  const [selected, setSelected] = useState<GearPieceView[]>([]);
  const craftMutation = useCraftGear();

  const canCraft = selected.length === 3;

  const craftingRows = getCraftingGearRows(playerGear, tokenIndex);

  // Group unequipped gear by slot+rarity for easy selection
  const toggleSelect = (gear: GearPieceView) => {
    setSelected((prev) => {
      const exists = prev.find((g) => g.gearId === gear.gearId);
      if (exists) return prev.filter((g) => g.gearId !== gear.gearId);
      if (prev.length >= 3) return prev;
      // Must match slot and rarity of first selection
      if (prev.length > 0 && (gear.slot !== prev[0].slot || gear.rarity !== prev[0].rarity)) {
        toast.error('Select 3 pieces of the same slot and rarity');
        return prev;
      }
      return [...prev, gear];
    });
  };

  const handleCraft = () => {
    if (!canCraft) return;
    craftMutation.mutate(
      { tokenIndex, gearIds: selected.map(g => g.gearId) },
      {
        onSuccess: (newGear) => {
          toast.success(`Crafted ${newGear.rarity} ${newGear.name}!`);
          setSelected([]);
          onCraftSuccess();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  // Determine filter hint
  const filterSlot = selected.length > 0 ? selected[0].slot : null;
  const filterRarity = selected.length > 0 ? selected[0].rarity : null;

  const filteredRows = craftingRows.filter(({ gear }) => {
    if (filterSlot && gear.slot !== filterSlot) return false;
    if (filterRarity && gear.rarity !== filterRarity) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Select 3 gear pieces of the <span className="font-semibold">same slot and rarity</span> to
        craft a new piece of the next rarity tier.
      </p>

      <div className="max-h-[40vh] overflow-y-auto space-y-1.5">
        {filteredRows.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 py-4 text-center">
            No eligible gear. You need 3 pieces of the same slot and rarity.
          </p>
        ) : (
          filteredRows
            .map(({ gear, isCraftEligible, isRarityEligible, slotRarityCount, rarityCount }) => {
              const isSelected = selected.some((g) => g.gearId === gear.gearId);
              return (
                <div
                  key={gear.gearId.toString()}
                  className={`border rounded-lg p-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : isCraftEligible
                        ? 'border-emerald-400/70 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(52,211,153,0.18)] hover:bg-emerald-500/15'
                        : isRarityEligible
                          ? 'border-amber-400/40 bg-amber-500/5 hover:bg-amber-500/10'
                          : `${RARITY_BORDER[gear.rarity] || 'border-border'} hover:bg-accent/50`
                  }`}
                  onClick={() => toggleSelect(gear)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">{gear.name}</span>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${RARITY_COLORS[gear.rarity] || ''}`}>
                        {gear.rarity}
                      </Badge>
                      {isCraftEligible && (
                        <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 rounded px-1 py-0">
                          CRAFTABLE {slotRarityCount}x
                        </span>
                      )}
                      {!isCraftEligible && isRarityEligible && (
                        <span className="text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-400/25 rounded px-1 py-0">
                          {rarityCount}x {gear.rarity}
                        </span>
                      )}
                      {recentGearIds.has(gear.gearId.toString()) && (
                        <span className="gear-new-badge text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 rounded px-1 py-0">
                          NEW
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{SLOT_LABELS[gear.slot] || gear.slot}</span>
                  </div>
                  <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span>ilvl {gear.ilvl}</span>
                    {gear.speedBonus > 0 && <span>SPD+{gear.speedBonus}</span>}
                    {gear.accelerationBonus > 0 && <span>ACC+{gear.accelerationBonus}</span>}
                    {gear.powerCoreBonus > 0 && <span>PWR+{gear.powerCoreBonus}</span>}
                    {gear.stabilityBonus > 0 && <span>STB+{gear.stabilityBonus}</span>}
                    {gear.luckBonus > 0 && <span>LCK+{gear.luckBonus}</span>}
                  </div>
                </div>
              );
            })
        )}
      </div>

      <Button
        onClick={handleCraft}
        disabled={!canCraft || craftMutation.isPending}
        className="w-full"
        size="sm"
      >
        {craftMutation.isPending ? (
          <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Crafting...</>
        ) : (
          <><Hammer className="h-3 w-3 mr-1" /> Craft ({selected.length}/3)</>
        )}
      </Button>
    </div>
  );
}

interface GearLoadoutPanelProps {
  tokenIndex: number;
}

export function GearLoadoutPanel({ tokenIndex }: GearLoadoutPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<string | null>(null);
  const [inspectGear, setInspectGear] = useState<GearPieceView | null>(null);
  const [craftingOpen, setCraftingOpen] = useState(false);
  const [consumablePickerSlot, setConsumablePickerSlot] = useState<number | null>(null);

  const loadout = useBotGearLoadout(expanded ? tokenIndex : null);
  const playerGear = usePlayerGear();
  const playerConsumables = usePlayerConsumables();
  const gearEquipMap = useGearEquipMap();
  const equipMutation = useEquipGear();
  const unequipMutation = useUnequipGear();
  const equipConsumableMutation = useEquipConsumable();
  const unequipConsumableMutation = useUnequipConsumable();
  const { recentGear, recentGearIds } = useRecentGear();

  const isActionPending =
    equipMutation.isPending ||
    unequipMutation.isPending ||
    equipConsumableMutation.isPending ||
    unequipConsumableMutation.isPending;

  const getSlotGear = (slot: string): GearPieceView | null => {
    if (!loadout.data) return null;
    const key = slot.toLowerCase() as keyof typeof loadout.data;
    const val = loadout.data[key];
    if (val && typeof val === 'object' && 'gearId' in val) return val as GearPieceView;
    return null;
  };

  // Resolve consumable instance IDs from loadout to full ConsumableView objects
  const getSlotConsumable = (slotNum: 1 | 2): ConsumableView | null => {
    if (!loadout.data || !playerConsumables.data) return null;
    const instanceId = slotNum === 1 ? loadout.data.consumable1 : loadout.data.consumable2;
    if (instanceId == null) return null;
    return playerConsumables.data.find((c: ConsumableView) => c.instanceId === instanceId) ?? null;
  };

  // Gear IDs equipped on THIS bot
  const getThisBotsGearIds = (): Set<string> => {
    const ids = new Set<string>();
    for (const s of SLOT_ORDER) {
      const g = getSlotGear(s);
      if (g) ids.add(g.gearId.toString());
    }
    return ids;
  };

  // Map of gearId -> otherBotId for gear equipped on OTHER bots
  const getOtherBotEquipMap = (): Map<string, number> => {
    const map = new Map<string, number>();
    if (gearEquipMap.data) {
      for (const [gearId, botId] of gearEquipMap.data.entries()) {
        if (botId !== tokenIndex) {
          map.set(gearId.toString(), botId);
        }
      }
    }
    return map;
  };

  // Get gear available for a slot (unequipped on any bot, matching slot)
  const getAvailableForSlot = (slot: string): GearPieceView[] => {
    if (!playerGear.data || !loadout.data) return [];
    const thisBotsGearIds = getThisBotsGearIds();
    const otherBotMap = getOtherBotEquipMap();
    return playerGear.data.filter(
      (g: GearPieceView) =>
        g.slot === slot &&
        g.boundToBot === tokenIndex &&
        !thisBotsGearIds.has(g.gearId.toString()) &&
        !otherBotMap.has(g.gearId.toString())
    );
  };

  // Get consumables not currently equipped on this bot
  const getAvailableConsumables = (): ConsumableView[] => {
    if (!playerConsumables.data || !loadout.data) return [];
    const equippedIds = new Set<string>();
    if (loadout.data.consumable1 != null) equippedIds.add(loadout.data.consumable1.toString());
    if (loadout.data.consumable2 != null) equippedIds.add(loadout.data.consumable2.toString());
    return playerConsumables.data.filter((c: ConsumableView) => !equippedIds.has(c.instanceId.toString()));
  };

  const handleEquip = (gearId: bigint) => {
    equipMutation.mutate(
      { tokenIndex, gearId },
      {
        onSuccess: () => {
          toast.success('Gear equipped!');
          setPickerSlot(null);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleUnequip = (slot: string) => {
    unequipMutation.mutate(
      { tokenIndex, slot },
      {
        onSuccess: () => toast.success('Gear unequipped'),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleEquipConsumable = (instanceId: bigint, slot: number) => {
    equipConsumableMutation.mutate(
      { tokenIndex, instanceId, slot },
      {
        onSuccess: () => {
          toast.success('Consumable equipped!');
          setConsumablePickerSlot(null);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleUnequipConsumable = (slot: number) => {
    unequipConsumableMutation.mutate(
      { tokenIndex, slot },
      {
        onSuccess: () => toast.success('Consumable unequipped'),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="bg-muted/30 border border-muted rounded-lg">
      {/* Header - always visible */}
      <button
        className="w-full flex items-center justify-between p-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold text-muted-foreground">Gear Loadout</p>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {loadout.isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : loadout.error ? (
            <p className="text-xs text-destructive py-2">Failed to load gear loadout</p>
          ) : (
            <>
              {/* 6 gear slots */}
              <div className="grid grid-cols-2 gap-2">
                {SLOT_ORDER.map((slot) => (
                  <GearSlotCard
                    key={slot}
                    slotName={slot}
                    gear={getSlotGear(slot)}
                    onClickSlot={() => {
                      const equipped = getSlotGear(slot);
                      if (equipped) {
                        setInspectGear(equipped);
                      } else {
                        setPickerSlot(slot);
                      }
                    }}
                    onUnequip={() => handleUnequip(slot)}
                    isLoading={isActionPending}
                    isNew={(() => {
                      const g = getSlotGear(slot);
                      return g ? recentGearIds.has(g.gearId.toString()) : false;
                    })()}
                  />
                ))}
              </div>

              {/* 2 consumable slots */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {([1, 2] as const).map((slotNum) => (
                  <ConsumableSlotCard
                    key={slotNum}
                    slotNum={slotNum}
                    consumable={getSlotConsumable(slotNum)}
                    onClickSlot={() => {
                      if (!getSlotConsumable(slotNum)) {
                        setConsumablePickerSlot(slotNum);
                      }
                    }}
                    onUnequip={() => handleUnequipConsumable(slotNum)}
                    isLoading={isActionPending}
                  />
                ))}
              </div>

              {/* Action bar: crafting + new gear reveal + inventory count */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setCraftingOpen(true)}
                  >
                    <Hammer className="h-3 w-3 mr-1" /> Craft Gear
                  </Button>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {playerGear.data ? `${playerGear.data.length} gear` : ''}
                  {playerGear.data && playerConsumables.data ? ' · ' : ''}
                  {playerConsumables.data ? `${playerConsumables.data.length} consumables` : ''}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Gear slot picker dialog */}
      <Dialog open={!!pickerSlot} onOpenChange={(open) => !open && setPickerSlot(null)}>
        <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {pickerSlot && (SLOT_LABELS[pickerSlot] || pickerSlot)} — Choose Gear
            </DialogTitle>
            <DialogDescription>
              Select a gear piece to equip in this slot.
            </DialogDescription>
          </DialogHeader>

          {playerGear.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (() => {
            const available = pickerSlot ? getAvailableForSlot(pickerSlot) : [];
            if (available.length === 0) {
              return (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No gear for this slot. Race to earn loot drops!
                </p>
              );
            }

            const renderGearCard = (gear: GearPieceView) => (
              <div
                key={gear.gearId.toString()}
                className={`border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors ${RARITY_BORDER[gear.rarity] || 'border-border'}`}
                onClick={() => handleEquip(gear.gearId)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {CATEGORY_BADGE[gear.category] && (
                      <span className="text-sm">{CATEGORY_BADGE[gear.category]}</span>
                    )}
                    <span className="text-sm font-semibold">{gear.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {recentGearIds.has(gear.gearId.toString()) && (
                      <span className="gear-new-badge text-[9px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 rounded px-1 py-0">
                        NEW
                      </span>
                    )}
                    <Badge variant="outline" className={`text-[10px] ${RARITY_COLORS[gear.rarity] || ''}`}>
                      {gear.rarity}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground mb-1.5">
                  <span>ilvl {gear.ilvl}</span>
                  {gear.terrainTag !== 'Universal' && <span>🌍 {gear.terrainTag}</span>}
                  {gear.passive && <span className="text-purple-400">{formatPassive(gear.passive)}</span>}
                </div>
                <div className="flex gap-2 text-[10px] flex-wrap">
                  {gear.speedBonus > 0 && <span className="text-primary">SPD +{gear.speedBonus}</span>}
                  {gear.accelerationBonus > 0 && <span className="text-primary">ACC +{gear.accelerationBonus}</span>}
                  {gear.powerCoreBonus > 0 && <span className="text-primary">PWR +{gear.powerCoreBonus}</span>}
                  {gear.stabilityBonus > 0 && <span className="text-primary">STB +{gear.stabilityBonus}</span>}
                  {gear.luckBonus > 0 && <span className="text-primary">LCK +{gear.luckBonus}</span>}
                </div>
                {equipMutation.isPending && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Equipping...
                  </div>
                )}
              </div>
            );

            return (
              <div className="space-y-2">
                {available
                  .sort((a, b) => b.ilvl - a.ilvl)
                  .map((gear) => renderGearCard(gear))}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Consumable picker dialog */}
      <Dialog open={consumablePickerSlot !== null} onOpenChange={(open) => !open && setConsumablePickerSlot(null)}>
        <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <FlaskConical className="h-4 w-4 inline mr-1" />
              Consumable Slot {consumablePickerSlot} — Choose Item
            </DialogTitle>
            <DialogDescription>
              Consumables are used once when their trigger fires during a race.
            </DialogDescription>
          </DialogHeader>

          {playerConsumables.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (() => {
            const available = getAvailableConsumables();
            if (available.length === 0) {
              return (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No consumables available. Earn them from race loot drops!
                </p>
              );
            }
            return (
              <div className="space-y-2">
                {available
                  .sort((a, b) => b.ilvl - a.ilvl)
                  .map((con) => (
                    <div
                      key={con.instanceId.toString()}
                      className={`border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors ${RARITY_BORDER[con.rarity] || 'border-border'}`}
                      onClick={() => consumablePickerSlot && handleEquipConsumable(con.instanceId, consumablePickerSlot)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">{con.name}</span>
                        <Badge variant="outline" className={`text-[10px] ${RARITY_COLORS[con.rarity] || ''}`}>
                          {con.rarity}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-1">{con.description}</p>
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span>ilvl {con.ilvl}</span>
                        <span>{TRIGGER_LABELS[con.triggerType] || con.triggerType}</span>
                      </div>
                      {equipConsumableMutation.isPending && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Equipping...
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Gear inspect dialog */}
      <Dialog open={!!inspectGear} onOpenChange={(open) => !open && setInspectGear(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Gear Details</DialogTitle>
            <DialogDescription>
              Click the slot to change or unequip this piece.
            </DialogDescription>
          </DialogHeader>
          {inspectGear && (
            <div className="space-y-3">
              <GearPieceDetail gear={inspectGear} />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setInspectGear(null);
                    setPickerSlot(inspectGear.slot);
                  }}
                >
                  <Cog className="h-3 w-3 mr-1" /> Swap Gear
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    handleUnequip(inspectGear.slot);
                    setInspectGear(null);
                  }}
                  disabled={unequipMutation.isPending}
                >
                  <X className="h-3 w-3 mr-1" /> Unequip
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Crafting dialog */}
      <Dialog open={craftingOpen} onOpenChange={setCraftingOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <Hammer className="h-4 w-4 inline mr-1" /> Gear Crafting
            </DialogTitle>
            <DialogDescription>
              Combine 3 pieces of the same slot and rarity to create a higher-tier piece.
            </DialogDescription>
          </DialogHeader>
          {playerGear.data ? (
            <CraftingPanel
              tokenIndex={tokenIndex}
              playerGear={playerGear.data}
              onCraftSuccess={() => setCraftingOpen(false)}
              recentGearIds={recentGearIds}
            />
          ) : playerGear.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Failed to load gear inventory.
            </p>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
