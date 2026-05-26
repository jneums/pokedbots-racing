import type { GearPieceView } from '../hooks/useGarage';

export const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] as const;

const RARITY_RANK = new Map<string, number>(RARITY_ORDER.map((rarity, index) => [rarity, index]));

export interface CraftingGearRow {
  gear: GearPieceView;
  rarityCount: number;
  slotRarityCount: number;
  isRarityEligible: boolean;
  isCraftEligible: boolean;
}

function rarityRank(rarity: string): number {
  return RARITY_RANK.get(rarity) ?? RARITY_ORDER.length;
}

function groupKey(gear: GearPieceView): string {
  return `${gear.slot}::${gear.rarity}`;
}

export function getCraftingGearRows(playerGear: GearPieceView[], tokenIndex: number): CraftingGearRow[] {
  const boundGear = playerGear.filter((gear) => gear.boundToBot === tokenIndex);
  const rarityCounts = new Map<string, number>();
  const slotRarityCounts = new Map<string, number>();

  for (const gear of boundGear) {
    rarityCounts.set(gear.rarity, (rarityCounts.get(gear.rarity) ?? 0) + 1);
    const key = groupKey(gear);
    slotRarityCounts.set(key, (slotRarityCounts.get(key) ?? 0) + 1);
  }

  return boundGear
    .map((gear) => {
      const rarityCount = rarityCounts.get(gear.rarity) ?? 0;
      const slotRarityCount = slotRarityCounts.get(groupKey(gear)) ?? 0;
      return {
        gear,
        rarityCount,
        slotRarityCount,
        isRarityEligible: rarityCount >= 3,
        isCraftEligible: slotRarityCount >= 3,
      };
    })
    .sort((a, b) => {
      const slotDiff = a.gear.slot.localeCompare(b.gear.slot);
      if (slotDiff !== 0) return slotDiff;

      const rarityDiff = rarityRank(a.gear.rarity) - rarityRank(b.gear.rarity);
      if (rarityDiff !== 0) return rarityDiff;

      const craftableDiff = Number(b.isCraftEligible) - Number(a.isCraftEligible);
      if (craftableDiff !== 0) return craftableDiff;

      return b.gear.ilvl - a.gear.ilvl;
    });
}
