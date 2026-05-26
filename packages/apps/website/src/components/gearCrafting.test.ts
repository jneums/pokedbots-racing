import { describe, expect, it } from 'vitest';
import { getCraftingGearRows } from './gearCrafting';
import type { GearPieceView } from '../hooks/useGarage';

function gear(overrides: Partial<GearPieceView> & Pick<GearPieceView, 'gearId' | 'slot' | 'rarity' | 'ilvl'>): GearPieceView {
  return {
    name: `Gear ${overrides.gearId.toString()}`,
    description: '',
    category: 'Standard',
    season: 1,
    terrainTag: 'Universal',
    speedBonus: 0,
    accelerationBonus: 0,
    powerCoreBonus: 0,
    stabilityBonus: 0,
    luckBonus: 0,
    passive: null,
    craftedFrom: null,
    sourceRaceId: null,
    sourceEventType: null,
    createdAt: 0n,
    boundToBot: 7,
    ...overrides,
  };
}

describe('getCraftingGearRows', () => {
  it('sorts bound gear by gear slot order, then rarity inside each slot', () => {
    const rows = getCraftingGearRows([
      gear({ gearId: 1n, slot: 'Module', rarity: 'Rare', ilvl: 4 }),
      gear({ gearId: 2n, slot: 'Legs', rarity: 'Rare', ilvl: 1 }),
      gear({ gearId: 3n, slot: 'Thruster', rarity: 'Common', ilvl: 9 }),
      gear({ gearId: 4n, slot: 'Legs', rarity: 'Common', ilvl: 3 }),
      gear({ gearId: 5n, slot: 'Legs', rarity: 'Uncommon', ilvl: 2 }),
      gear({ gearId: 6n, slot: 'Core', rarity: 'Uncommon', ilvl: 5 }),
    ], 7);

    expect(rows.map((row) => row.gear.gearId)).toEqual([4n, 5n, 2n, 3n, 6n, 1n]);
  });

  it('marks only exact same-slot and same-rarity groups as craft eligible, without broad rarity-count hints', () => {
    const rows = getCraftingGearRows([
      gear({ gearId: 10n, slot: 'Legs', rarity: 'Common', ilvl: 1 }),
      gear({ gearId: 11n, slot: 'Legs', rarity: 'Common', ilvl: 2 }),
      gear({ gearId: 12n, slot: 'Legs', rarity: 'Common', ilvl: 3 }),
      gear({ gearId: 13n, slot: 'Core', rarity: 'Common', ilvl: 4 }),
      gear({ gearId: 14n, slot: 'Gyro', rarity: 'Rare', ilvl: 5, boundToBot: 9 }),
    ], 7);

    expect(rows.filter((row) => row.isCraftEligible).map((row) => row.gear.gearId)).toEqual([12n, 11n, 10n]);
    expect(rows.find((row) => row.gear.gearId === 13n)?.isCraftEligible).toBe(false);
    expect(rows.find((row) => row.gear.gearId === 13n)).not.toHaveProperty('isRarityEligible');
    expect(rows.find((row) => row.gear.gearId === 13n)).not.toHaveProperty('rarityCount');
    expect(rows.some((row) => row.gear.gearId === 14n)).toBe(false);
  });
});
