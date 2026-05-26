import type { GearPieceView } from '../hooks/useGarage';

export const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] as const;
export const CRAFTING_SLOT_ORDER = ['Legs', 'Thruster', 'Chassis', 'Gyro', 'Core', 'Module'] as const;

const RARITY_RANK = new Map<string, number>(RARITY_ORDER.map((rarity, index) => [rarity, index]));
const SLOT_RANK = new Map<string, number>(CRAFTING_SLOT_ORDER.map((slot, index) => [slot, index]));

export interface CraftingGearRow {
  gear: GearPieceView;
  slotRarityCount: number;
  isCraftEligible: boolean;
}

function rarityRank(rarity: string): number {
  return RARITY_RANK.get(rarity) ?? RARITY_ORDER.length;
}

function slotRank(slot: string): number {
  return SLOT_RANK.get(slot) ?? CRAFTING_SLOT_ORDER.length;
}

function groupKey(gear: GearPieceView): string {
  return `${gear.slot}::${gear.rarity}`;
}

export function getCraftingGearRows(playerGear: GearPieceView[], tokenIndex: number): CraftingGearRow[] {
  const boundGear = playerGear.filter((gear) => gear.boundToBot === tokenIndex);
  const slotRarityCounts = new Map<string, number>();

  for (const gear of boundGear) {
    const key = groupKey(gear);
    slotRarityCounts.set(key, (slotRarityCounts.get(key) ?? 0) + 1);
  }

  return boundGear
    .map((gear) => {
      const slotRarityCount = slotRarityCounts.get(groupKey(gear)) ?? 0;
      return {
        gear,
        slotRarityCount,
        isCraftEligible: slotRarityCount >= 3,
      };
    })
    .sort((a, b) => {
      const slotDiff = slotRank(a.gear.slot) - slotRank(b.gear.slot) || a.gear.slot.localeCompare(b.gear.slot);
      if (slotDiff !== 0) return slotDiff;

      const rarityDiff = rarityRank(a.gear.rarity) - rarityRank(b.gear.rarity);
      if (rarityDiff !== 0) return rarityDiff;

      const craftableDiff = Number(b.isCraftEligible) - Number(a.isCraftEligible);
      if (craftableDiff !== 0) return craftableDiff;

      return b.gear.ilvl - a.gear.ilvl;
    });
}
