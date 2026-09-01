# PokedBots Brawl: Conversion Design Document

## Executive Summary

This document outlines the conversion of PokedBots Racing into PokedBots Brawl, a dungeon simulation game using WoW-like mechanics. The conversion leverages existing NFT assets, stat derivation systems, and deterministic simulation architecture while introducing RPG combat, party composition, and tactical gameplay.

---

## Table of Contents

1. [Core Concept](#core-concept)
2. [Architecture Overview](#architecture-overview)
3. [Stat System Conversion](#stat-system-conversion)
4. [Class & Role System](#class--role-system)
5. [Faction System](#faction-system)
6. [Combat Simulation Engine](#combat-simulation-engine)
7. [Action Priority List (APL) System](#action-priority-list-apl-system)
8. [Progression Systems](#progression-systems)
9. [Loot & Equipment](#loot--equipment)
10. [Marketplace & Economy](#marketplace--economy)
11. [Technical Implementation](#technical-implementation)
12. [Migration Strategy](#migration-strategy)

---

## 1. Core Concept

### From Racing to Brawling

**Current State (Racing):**
- Linear competition: bots race to finish line
- Stats determine speed/handling
- Bracket system based on average stats (level 19 = under 20 bracket)
- Garage auras provide set bonuses (e.g., +5 stability for 2 Black Hole bots)
- Deterministic simulation using seeds

**New State (Brawl):**
- Multi-dimensional combat: damage mitigation, healing, DPS
- Stats determine combat effectiveness
- Same bracket system (average stats = level)
- Expanded synergy system with faction-based class utilities
- Same deterministic simulation architecture

### Key Design Principles

1. **Preserve NFT Value**: All existing bots remain useful; rarity tiers gain new meaning
2. **Stat Continuity**: Racing stats map directly to combat stats
3. **Deterministic Combat**: Maintain seed-based simulation for provably fair outcomes
4. **Deep Strategy**: Enable theorycrafting through APL (Action Priority Lists)
5. **Economic Sustainability**: Multiple sinks (respecs, consumables) and value creation (script marketplace)

---

## 2. Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     POKEDBOTS BRAWL                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │   NFT LAYER  │      │  GAME STATE  │                   │
│  │              │      │              │                   │
│  │ • Bot DNA    │◄────►│ • Level/XP   │                   │
│  │ • Base Stats │      │ • Allocated  │                   │
│  │ • Parts      │      │   Points     │                   │
│  │ • Faction    │      │ • Equipped   │                   │
│  └──────────────┘      │   Gear       │                   │
│         │              │ • APL Script │                   │
│         │              └──────────────┘                   │
│         │                     │                           │
│         └─────────┬───────────┘                           │
│                   ▼                                       │
│         ┌──────────────────┐                             │
│         │ COMBAT SIMULATOR │                             │
│         │                  │                             │
│         │ • Tick Engine    │                             │
│         │ • APL Resolver   │                             │
│         │ • Threat System  │                             │
│         │ • Damage Calc    │                             │
│         └──────────────────┘                             │
│                   │                                       │
│         ┌─────────┴─────────┐                            │
│         ▼                   ▼                            │
│  ┌─────────────┐     ┌─────────────┐                    │
│  │  PvE MODES  │     │  PvP MODES  │                    │
│  │             │     │             │                    │
│  │ • Dungeons  │     │ • Arena     │                    │
│  │ • Raids     │     │ • Wagers    │                    │
│  │ • Boss Rush │     │ • Ranked    │                    │
│  └─────────────┘     └─────────────┘                    │
│         │                   │                            │
│         └─────────┬─────────┘                            │
│                   ▼                                      │
│         ┌──────────────────┐                            │
│         │  REWARD SYSTEM   │                            │
│         │                  │                            │
│         │ • XP & Levels    │                            │
│         │ • Loot Tables    │                            │
│         │ • Salvage/Scrap  │                            │
│         └──────────────────┘                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Stat System Conversion

### Base Stats Mapping

The four racing stats map directly to combat effectiveness:

| Racing Stat | RPG Translation | Primary Role | Combat Effect |
|------------|----------------|--------------|---------------|
| **Stability** | Fortitude/Armor | Tank | Reduces incoming damage; prevents stuns/knockbacks; generates threat |
| **Power Core** | Strength/Output | DPS | Increases raw damage per hit and potency of heals |
| **Acceleration** | Haste/Reflex | Speedster | Reduces Global Cooldown (GCD); more actions per time window |
| **SPD (Top Speed)** | Potency/Logic | Specialist | Increases critical strike chance; effectiveness of scaling buffs |

### Derived Combat Variables

```typescript
// Threat (Aggro) Calculation
threat = (stability * 1.5) + (damageDealt * 0.5)

// Damage Mitigation
damageTaken = incomingHit * (100 / (100 + stability))

// Action Frequency
actionInterval = 5.0 / (acceleration / 10)

// Critical Strike Chance
critChance = baseCrit + (SPD / 200)

// Effect Potency
effectSize = powerCore * abilityModifier
```

### Stat Allocation

- **Base Stats**: Derived from NFT parts (immutable)
- **Level-Up Points**: 4 points per level (mutable, can be respecced)
- **Respec Tax**: 60% recovery (40% sink for economy)
- **Bracket System**: Same as racing (average of all stats determines level)

---

## 4. Class & Role System

### Class Determination Method: Percentile-Based Within Faction

**Classes are locked at mint using a percentile-based ranking system:**

Each bot is ranked against other bots **within its own faction** for each of the four base stats (before faction bonuses are applied). The bot is assigned to the class corresponding to the stat where it ranks highest (best percentile) within its faction.

| Stat Ranking | Locked Class | Dungeon Role |
|--------------|--------------|--------------|
| Highest Stability Percentile | **Bulwark** | Tank (Aggro & Mitigation) |
| Highest Power Core Percentile | **Striker** | DPS (Raw Damage) |
| Highest Acceleration Percentile | **Fixer** | Healer (Recovery & Speed) |
| Highest SPD Percentile | **Tactician** | Support (Buffs & Debuffs) |

**Example**: A Golden bot with base stats [Speed: 35, PowerCore: 42, Acceleration: 38, Stability: 30] is compared only against the other 26 Golden bots. If its PowerCore ranks in the top 10% of Golden bots (best percentile), it becomes a Golden Striker, even if its absolute PowerCore value is lower than bots from other factions.

### Why Percentile-Based Within Faction?

1. **Guaranteed Coverage**: Every faction has representation in all 4 classes (ensuring all 56 faction-class abilities are usable)
2. **Faction Identity Preserved**: A Golden Striker (avg PowerCore ~40) is naturally stronger than an Industrial Striker (avg PowerCore ~19), creating power tiers
3. **Natural Rarity Gradients**: "Budget" versions of each class exist in common factions, while "premium" versions are in rare factions
4. **Market Dynamics**: Players choose between rare factions with high stats or common factions that are easier to collect
5. **Strategic Depth**: Best-in-slot becomes faction-dependent, not just class-dependent
6. **Trading Incentive**: Want the strongest Striker? You need Golden or Wild. Want affordable Strikers to complete a set? Go Industrial or Animal.

### Distribution Results

Based on analysis of all 10,000 bots using base stats (before faction bonuses):

**Overall Class Distribution:**
- Bulwark: 2,616 bots (26.2%)
- Striker: 2,724 bots (27.2%)
- Fixer: 2,313 bots (23.1%)
- Tactician: 2,347 bots (23.5%)

**Faction Coverage:**
- 13 out of 14 factions have all 4 classes represented
- Most factions show 22-30% per class (natural healthy variance)
- Only Ultimate-master (1 bot) and Wild (5 bots) have gaps due to extremely small populations

**Power Tier Examples (Average Base PowerCore for Strikers by Faction):**
- Golden: 40.6 (Premium Tier)
- Wild: 45.0 (God Tier - only 1 Wild Striker exists)
- Ultimate: 28.7 (High Tier)
- Dead: 24.0 (Mid Tier)
- Industrial: 18.9 (Budget Tier)

This creates natural market segmentation where collectors can pursue different strategies: chase rare high-stat bots or build budget parties from common factions.

---

## 5. Faction System

### Faction Distribution (10,000 supply - 1,500 burned = 8,500 active)

Based on actual NFT data analysis:

| Faction | Population | Rarity Tier | Avg Base Stat | Max Total | Design Theme |
|---------|-----------|-------------|---------------|-----------|--------------|
| Ultimate-master | 1 | God Tier | 69.0 | 276 | Omnipotent, all synergies |
| Wild | 5 | Legendary | 50.5 | 263 | Chaotic, logic manipulation |
| Golden | 27 | Epic | 46.0 | 193 | Divine light, loot/XP bonuses |
| Ultimate | 45 | Epic | 36.5 | 185 | Perfected machines, efficiency |
| Blackhole | 244 | Rare | 32.6 | 181 | Gravitational, void powers |
| Dead | 382 | Rare | 30.5 | 164 | Necromantic, undeath |
| Master | 640 | Uncommon | 26.9 | 159 | Strategic, tactical superiority |
| Bee | 717 | Common | 19.1 | 118 | Swarm, coordination |
| Food | 778 | Common | 19.1 | 114 | Sustain, consumption |
| Box | 798 | Common | 23.1 | 141 | Defensive, containment |
| Murder | 999 | Common | 20.3 | 127 | Aggressive, assassination |
| Game | 1,654 | Common | 19.3 | 126 | Playful, unpredictable |
| Animal | 1,701 | Common | 18.7 | 133 | Primal, instinct-driven |
| Industrial | 2,009 | Common | 19.1 | 132 | Mechanical, reliable |

### Rarity Tier System

**God Tier** (1 bot)
- Ultimate-master: The singularity; functions as all classes and factions simultaneously

**Legendary** (5 bots)
- Wild: Glitched survivors with reality-bending abilities

**Epic** (72 bots)
- Golden: Light-blessed with divine favor
- Ultimate: Peak engineering perfection

**Rare** (626 bots)
- Blackhole: Masters of gravity and void
- Dead: Undead constructs with necromantic powers

**Uncommon** (640 bots)
- Master: Elite tacticians and commanders

**Common** (7,156 bots)
- Bee, Food, Box, Murder, Game, Animal, Industrial: The working class, each with unique themes

### Faction-Based Class Archetypes

Each faction provides unique flavor to the four base classes. All abilities are **party-wide** or **raid-wide** (replacing garage auras):

#### Bulwark (Tank) - All Factions

| Faction | Class Name | Unique Party Utility |
|---------|-----------|---------------------|
| **Ultimate-master** | The Architect | **Omnipresent Shield**: Party gains immunity to one killing blow per encounter |
| **Wild** | Chaos Ward | **Reality Distortion**: 15% chance enemy attacks phase through and miss entire party |
| **Golden** | Radiant Sentinel | **Divine Intervention**: When tank drops below 10% HP, party gains +50% damage for 5s |
| **Ultimate** | Apex Guardian | **Perfect Defense Protocol**: Reduces all party damage by 10% passively |
| **Blackhole** | Singularity Guard | **Gravitational Pull**: Enemies attack 15% slower (space-time dilation) |
| **Dead** | Bone Colossus | **Undying Presence**: Party members below 20% HP take 30% reduced damage |
| **Master** | War Commander | **Tactical Formation**: Party members within 10m of tank gain +10% armor |
| **Bee** | Queen's Guard | **Hive Mind**: Each party member alive increases tank's threat generation by 5% |
| **Food** | The Preserver | **Feast Aura**: Party slowly regenerates 1% HP per 5 seconds |
| **Box** | Vault Keeper | **Sealed Fortress**: First hit on any party member is reduced by 50% |
| **Murder** | Crimson Bulwark | **Blood Shield**: Tank gains 5% of party's total damage dealt as temporary HP |
| **Game** | Play Tank | **Wild Card Defense**: Every 30s, random party member gains 3s immunity |
| **Animal** | Alpha Guardian | **Pack Leader**: Party members with lower HP than tank gain +15% evasion |
| **Industrial** | Blast Furnace | **Heat Shield**: Converts 20% of incoming damage into attack buff for party |

#### Striker (DPS) - All Factions

| Faction | Class Name | Unique Party Utility |
|---------|-----------|---------------------|
| **Ultimate-master** | The Annihilator | **Existential Crisis**: Enemy takes +25% damage from all sources |
| **Wild** | Chaos Engine | **Entropy**: Critical hits apply random debuff (slow/burn/bleed/stun) |
| **Golden** | Holy Avenger | **Smite**: Party crits deal bonus holy damage equal to 20% of the hit |
| **Ultimate** | Perfect Striker | **Weak Point Analysis**: Enemy loses 10 armor after each crit from party |
| **Blackhole** | Void Reaper | **Crushing Singularity**: Execute damage on enemies below 20% HP (+100% damage) |
| **Dead** | Soul Render | **Life Drain**: Party heals for 5% of all damage dealt |
| **Master** | Assassin Prime | **Coordinated Strike**: First attack by any party member each turn is guaranteed crit |
| **Bee** | Swarm Striker | **Overwhelming Numbers**: Each party attack reduces enemy evasion by 1% (stacks) |
| **Food** | Spice Grinder | **Flavor Burst**: Enemies take +10% damage from all elements |
| **Box** | Unboxing Fury | **Surprise Attack**: 20% chance party attacks ignore armor |
| **Murder** | Silent Killer | **Assassinate**: Attacks on targets above 80% HP deal +30% damage |
| **Game** | Jackpot | **Lucky Streak**: Every 5th party attack is automatic critical |
| **Animal** | Feral Predator | **Hunter's Mark**: Party deals +15% damage to wounded targets (<50% HP) |
| **Industrial** | Pneumatic Press | **Crush**: Heavy hits that ignore 30% of enemy armor |

#### Fixer (Healer) - All Factions

| Faction | Class Name | Unique Party Utility |
|---------|-----------|---------------------|
| **Ultimate-master** | The Lifegiver | **Resurrection**: Once per encounter, revive dead party member at 50% HP |
| **Wild** | Glitch Medic | **Reality Patch**: Heals also remove one random debuff from target |
| **Golden** | Divine Healer | **Blessing**: Overhealing grants shields (max 20% of target's HP) |
| **Ultimate** | Nano-Surgeon | **Perfect Repair**: Heals are 15% more effective on all targets |
| **Blackhole** | Event Horizon | **Void Shield**: Absorbs damage and converts to healing when shield breaks |
| **Dead** | Necromancer | **Sacrificial Pact**: Heal costs HP instead of energy, but 50% stronger |
| **Master** | Field Medic | **Triage Protocol**: Automatically heals lowest HP party member each 3s |
| **Bee** | Hive Healer | **Pollination**: Heals spread 30% of their value to adjacent party members |
| **Food** | Sous Chef | **Feast**: AoE heals also restore 10% energy to party |
| **Box** | Preservation Unit | **Stasis Field**: Can freeze ally for 2s, immune but cannot act (emergency save) |
| **Murder** | Blood Doctor | **Transfusion**: Can transfer HP between party members |
| **Game** | Chance Healer | **Double or Nothing**: 50% chance heals are 2x effective or heal for 0 |
| **Animal** | Pack Healer | **Regeneration**: HoT effects are 25% stronger on entire party |
| **Industrial** | Maintenance Drone | **Spot Weld**: Single-target heal also restores 5% of target's highest stat |

#### Tactician (Support) - All Factions

| Faction | Class Name | Unique Party Utility |
|---------|-----------|---------------------|
| **Ultimate-master** | The Overseer | **Omniscience**: Party sees all enemy abilities 5s before cast |
| **Wild** | Chaos Theorist | **Randomize**: Shuffles enemy APL priority order for 10s |
| **Golden** | Oracle | **Divine Guidance**: Party gains +15% crit chance |
| **Ultimate** | Tactical AI | **Optimization**: Party cooldowns reduced by 10% |
| **Blackhole** | Gravity Manipulator | **Time Dilation**: Party acts 10% faster, enemies 10% slower |
| **Dead** | Death's Herald | **Curse of Mortality**: Enemies cannot be healed for 15s (1min cooldown) |
| **Master** | Strategist | **Battle Plan**: Party damage increases 2% every 10 seconds (stacks 10x) |
| **Bee** | Hive Mind | **Coordination**: Party members within 5m of each other deal +10% damage |
| **Food** | Sommelier | **Intoxicate**: Debuffs last 25% longer on enemies |
| **Box** | Lockbox | **Seal**: Can trap one enemy ability, preventing its use for 30s |
| **Murder** | Infiltrator | **Expose Weakness**: Reveals enemy's lowest resistance to party |
| **Game** | Dice Roller | **Gambit**: Party randomly gains 1 of 5 powerful buffs every 20s |
| **Animal** | Pack Alpha | **Howl**: Party attack speed increased by 15% |
| **Industrial** | Engineer | **Overcharge**: Party abilities cost 20% less energy |

### Party Composition Strategy

Each bot in the party provides their unique faction-class ability buff to the entire group. There are no additional stacking bonuses or complexity - the strategy comes from **choosing which 56 abilities to bring**:

**Example 5-Bot Party**:
1. **Blackhole Bulwark** (Tank) → Party: Enemies attack 15% slower
2. **Golden Striker** (DPS) → Party: Crits deal +20% holy damage
3. **Dead Fixer** (Healer) → Party: Heals for 5% of all damage dealt
4. **Master Tactician** (Support) → Party: Damage increases 2% every 10s (stacks 10x)
5. **Industrial Striker** (DPS) → Party: Heavy hits ignore 30% armor

**Total Party Effects**: Slower enemies + crit bonus + life drain + ramping damage + armor penetration

The depth comes from:
- **56 possible abilities** to choose from (14 factions × 4 classes)
- **5 slots** to fill (or more for raids)
- **Boss-specific counters** (e.g., bring Bee Bulwark for multi-target fights, Wild for RNG-heavy bosses)
- **Build variety** within same faction (e.g., all-Blackhole party vs mixed factions)

Players will naturally discover powerful combinations without needing explicit stacking bonuses.

### Ultimate Master (1-of-1) Special

**All Classes**: The Architect

**Unique Mechanic**: **Omnipotent Presence**
- Functions as all four classes simultaneously
- Can use abilities from any class toolkit
- Triggers all faction bonuses regardless of party composition
- Party gains +25% to all effectiveness when present

**Ultimate Ability**: **Rewrite Reality** - Once per encounter, completely negate one boss mechanic or party wipe

### Wild (5 Total) Specials

Each Wild bot has a unique "Reality Glitch" ability:

| Bot ID | Name | Class-Agnostic Ability |
|--------|------|----------------------|
| Wild 01 | Null | **Void Logic**: Enemy abilities have 25% chance to fail completely |
| Wild 02 | Echo | **Mirror**: Copies last enemy buff and applies it to party at 150% |
| Wild 03 | Static | **Scramble**: Redirects 30% of enemy attacks to random targets |
| Wild 04 | Overload | **Flux**: Every 20s, randomly swap one stat between party and enemies |
| Wild 05 | Ghost | **Phase Shift**: Party has 20% chance to completely avoid AoE abilities |

---

## 6. Combat Simulation Engine

### Tick-Based System

```typescript
// Core simulation loop
const TICK_RATE = 100; // milliseconds per tick
const GLOBAL_COOLDOWN = 1.5; // seconds

interface SimulationState {
  tick: number;
  combatants: Map<string, Combatant>;
  threatTable: Map<string, number>;
  activeAuras: Aura[];
  eventLog: CombatEvent[];
  seed: number;
}

// Simulation advances in discrete ticks
function advanceSimulation(state: SimulationState): void {
  state.tick++;
  
  // 1. Process auras (buffs/debuffs)
  processAuras(state);
  
  // 2. Check APL for each combatant
  for (const [id, bot] of state.combatants) {
    if (bot.canAct(state.tick)) {
      const action = resolveAPL(bot, state);
      executeAction(action, state);
    }
  }
  
  // 3. Update threat table
  updateThreat(state);
  
  // 4. Check victory/defeat conditions
  checkEndConditions(state);
}
```

### Combat Event Schema

All combat results are returned as an array of discrete events:

```typescript
type EventType = 
  | "SPELL_DAMAGE" 
  | "SPELL_HEAL" 
  | "AURA_APPLIED" 
  | "AURA_REMOVED" 
  | "UNIT_DIED" 
  | "LOGIC_GLITCH"
  | "PHASE_CHANGE";

interface CombatEvent {
  tick: number;              // Discrete time-step
  type: EventType;           // Category of event
  sourceId: string;          // Actor GUID
  targetId: string;          // Receiver GUID
  abilityId: string;         // Skill/part used
  value: number;             // Amount (damage/healing)
  isCrit: boolean;           // For visual emphasis
  targetResources: {         // State after event
    hp: number;
    energy: number;
  };
  metadata: string;          // Flavor text or black-box descriptions
}
```

### Example Combat Log

```json
[
  {
    "tick": 1,
    "type": "AURA_APPLIED",
    "sourceId": "Bot_BlackHole_001",
    "targetId": "Party",
    "abilityId": "Gravity_Well",
    "value": 0,
    "isCrit": false,
    "targetResources": { "hp": 5000, "energy": 100 },
    "metadata": "Black Hole synergy active: Enemies have 10% miss chance"
  },
  {
    "tick": 15,
    "type": "SPELL_DAMAGE",
    "sourceId": "Bot_SolarFlare_042",
    "targetId": "Boss_Foundry_01",
    "abilityId": "Thermal_Lance",
    "value": 450,
    "isCrit": true,
    "targetResources": { "hp": 8500, "energy": 100 },
    "metadata": "Solar Flare Passive triggered: +50 Heat Damage"
  },
  {
    "tick": 45,
    "type": "LOGIC_GLITCH",
    "sourceId": "Wildbot_03_Static",
    "targetId": "Enemy_Striker_005",
    "abilityId": "Targeting_Jitter",
    "value": 0,
    "isCrit": false,
    "targetResources": { "hp": 3200, "energy": 60 },
    "metadata": "Enemy Striker is confused! Attacks redirected randomly for 5s"
  }
]
```

### Boss Mechanics Example: The Foundry Overseer

**Tier 1 Gatekeeper Boss**

```typescript
interface BossConfig {
  name: "Foundry Overseer";
  hp: 5000;
  armor: 200;
  phases: [
    {
      name: "Phase 1: Cold Shield";
      hpRange: [100, 75];
      mechanics: [
        {
          name: "Hardened Shell";
          type: "passive";
          effect: "90% damage reduction until Heat > 100";
          counterStat: "Logic"; // Smart bots prioritize heat attacks
        }
      ];
    },
    {
      name: "Phase 2: The Melt";
      hpRange: [75, 40];
      mechanics: [
        {
          name: "Venting Steam";
          type: "aura";
          effect: "10 fire damage/tick to entire party";
          counterStat: "Acceleration"; // Healer needs fast reactions
        }
      ];
    },
    {
      name: "Phase 3: Hydraulic Press";
      hpRange: [40, 0];
      mechanics: [
        {
          name: "Crusher Strike";
          type: "active";
          cooldown: 20;
          damage: 500;
          target: "highest_threat";
          counterStat: "Stability"; // Tank must have 50+ or get stunned
        },
        {
          name: "Enrage";
          type: "timer";
          trigger: 300; // 5 minutes
          effect: "Boss explodes, party wipes";
          counterStat: "Power Core"; // DPS check
        }
      ];
    }
  ];
}
```

---

## 7. Action Priority List (APL) System

### Concept

Instead of AI making random decisions, each bot follows a **deterministic priority list** of conditions and actions. This is similar to:
- Final Fantasy XII's Gambit System
- Dragon Age's Tactics
- SimulationCraft for WoW

### APL Structure

```typescript
interface APLLine {
  priority: number;          // Lower = higher priority
  condition: Condition;      // When to trigger
  action: Ability;          // What to do
  target: TargetSelector;   // Who to target
}

interface Condition {
  type: "hp_threshold" | "enemy_casting" | "aura_active" | "always";
  params: Record<string, any>;
}

interface TargetSelector {
  type: "self" | "ally" | "enemy";
  filter: "lowest_hp" | "highest_threat" | "nearest" | "specific";
}
```

### Example APL: Fixer (Healer)

```typescript
const healerAPL: APLLine[] = [
  {
    priority: 1,
    condition: { type: "hp_threshold", params: { target: "ally", threshold: 0.3 } },
    action: { id: "Emergency_Reboot", cost: 40 },
    target: { type: "ally", filter: "lowest_hp" }
  },
  {
    priority: 2,
    condition: { type: "enemy_casting", params: { abilityId: "Mega_Blast" } },
    action: { id: "Barrier_Protocol", cost: 30 },
    target: { type: "ally", filter: "specific", value: "Tank" }
  },
  {
    priority: 3,
    condition: { type: "hp_threshold", params: { target: "ally", threshold: 0.8 } },
    action: { id: "Nanite_Mist", cost: 20 },
    target: { type: "ally", filter: "lowest_hp" }
  },
  {
    priority: 4,
    condition: { type: "always" },
    action: { id: "Energy_Siphon", cost: 0 },
    target: { type: "enemy", filter: "lowest_hp" }
  }
];
```

### Complexity Tiers

APL scripts have **stat requirements** rather than line limits. Players can create scripts of any complexity, but bots need sufficient stats to equip them:

```typescript
interface APLScript {
  id: string;
  name: string;
  lines: APLLine[];
  requirements: {
    minLevel: number;
    minTotalStats: number;  // Sum of all base stats
    minStability?: number;   // Class-specific minimums
    minPowerCore?: number;
    minAcceleration?: number;
    minSPD?: number;
  };
}
```

**Example Requirements**:
- **Basic Script** (4-6 lines): Min level 5, 60 total stats
- **Intermediate Script** (8-10 lines): Min level 15, 90 total stats
- **Advanced Script** (12-15 lines): Min level 30, 120 total stats
- **Elite Script** (20+ lines): Min level 50, 150+ total stats

**Why This Works**:
- Legendary bots (Wild, Ultimate-master) can equip complex scripts early due to high base stats
- Common bots need to level up and allocate points to use advanced strategies
- Creates natural progression: new players start with simple scripts, gradually unlock complexity
- Script creators can target different audiences (beginner-friendly vs. whale-only)

### APL Resolution Logic

```typescript
function resolveAPL(bot: Combatant, state: SimulationState): Action | null {
  const apl = bot.equippedAPL || bot.defaultAPL;
  
  // Iterate through priority list
  for (const line of apl.sort((a, b) => a.priority - b.priority)) {
    if (evaluateCondition(line.condition, bot, state)) {
      const target = selectTarget(line.target, bot, state);
      if (target && bot.hasResource(line.action.cost)) {
        return {
          ability: line.action,
          target: target,
          source: bot
        };
      }
    }
  }
  
  return null; // No valid action this tick
}
```

### PvP Impact: Default AI vs. Optimized AI

**Scenario**: Two players with identical stats, different APL configurations

**Team A (Default AI)**:
```typescript
// Simple "attack nearest" logic
[
  { priority: 1, condition: "always", action: "Attack", target: "nearest_enemy" }
]
```

**Team B (Optimized AI)**:
```typescript
// Focus-fire healer, protect backline
[
  { priority: 1, condition: "enemy_class == 'Fixer'", action: "Attack", target: "enemy_healer" },
  { priority: 2, condition: "ally_hp < 50% AND class == 'Tank'", action: "Taunt", target: "enemy_dps" },
  { priority: 3, condition: "always", action: "Attack", target: "lowest_hp_enemy" }
]
```

**Result**: Team B wins decisively by eliminating healing first.

---

## 8. Progression Systems

### Experience & Leveling

```typescript
interface BotProgression {
  level: number;
  currentXP: number;
  totalXPEarned: number;
  allocatedPoints: {
    stability: number;
    powerCore: number;
    acceleration: number;
    spd: number;
  };
  respecCount: number;
}

// XP sources
const XP_SOURCES = {
  dungeonClear: (level: number) => 100 * level,
  bossKill: (level: number) => 500 * level,
  pvpWin: (level: number) => 300 * level,
  firstClear: (level: number) => 1000 * level,
};

// Bracket-capped XP
function calculateXP(dungeon: Dungeon, bot: Bot): number {
  const levelDiff = bot.level - dungeon.level;
  
  if (levelDiff > 10) return 0; // No XP for over-leveled content
  if (levelDiff > 5) return baseXP * 0.25; // Reduced XP
  
  return baseXP;
}
```

### Leveling Benefits

- **4 Stat Points** per level
- Unlock new ability thresholds (e.g., 50 Stability = Unstoppable)
- Increase bracket eligibility

### Respec System

```typescript
interface RespecCost {
  scrap: number;
  cooldown: number; // hours
}

function respecBot(bot: Bot): RespecResult {
  const totalPointsSpent = Object.values(bot.allocatedPoints)
    .reduce((sum, val) => sum + val, 0);
  
  const refundAmount = Math.floor(totalPointsSpent * 0.6); // 60% return
  const burnAmount = totalPointsSpent - refundAmount;      // 40% sink
  
  return {
    refundedPoints: refundAmount,
    burned: burnAmount,
    cost: {
      scrap: 1000 + (bot.respecCount * 500),
      cooldown: 24
    }
  };
}
```

**Economic Impact**: The 40% tax creates a permanent sink while allowing meta adaptation.

### Rested XP (Daily Login Incentive)

```typescript
interface RestedXP {
  bonusMultiplier: 2.0;
  maxCharges: 3;
  rechargeRate: 1; // per 24 hours idle
}

// If bot hasn't entered dungeon in 24h
if (bot.lastActivity < now - 24h) {
  bot.restedCharges = Math.min(3, bot.restedCharges + 1);
}

// On dungeon clear
if (bot.restedCharges > 0) {
  xpGained *= 2.0;
  bot.restedCharges--;
}
```

---

## 9. Loot & Equipment

### Content-Driven Scarcity Model

Instead of traditional BoE/BoP systems, loot rarity is **hard-capped per encounter**:

```typescript
interface BossLootTable {
  bossId: string;
  guaranteedDrops: {
    scrap: [number, number];  // Min, max range
    xp: number;
  };
  rareDrops: {
    itemId: string;
    maxSupply: number;        // TOTAL copies that will ever drop
    droppedCount: number;     // Current supply
    dropChance: number;       // % per clear
  }[];
}
```

**Example**: The Foundry Overseer (Tier 1 Boss)
```typescript
{
  bossId: "foundry_overseer",
  guaranteedDrops: {
    scrap: [100, 300],
    xp: 500
  },
  rareDrops: [
    {
      itemId: "thermal_heat_sinks",
      maxSupply: 100,           // Only 100 will ever drop
      droppedCount: 47,
      dropChance: 0.10          // 10% per clear
    },
    {
      itemId: "hydraulic_crusher_arm",
      maxSupply: 25,            // Ultra-rare
      droppedCount: 8,
      dropChance: 0.03          // 3% per clear
    }
  ]
}
```

### Two-Tier System

#### A. Permanent Upgrades (Bound to NFT)

These are **immutable improvements** that increase the bot's base value:

| Type | Source | Effect | Tradeable |
|------|--------|--------|-----------|
| Stat Points | Leveling | +4 points/level | Only if whole bot sold |
| Prestige Ranks | First clears | Visual badge + 0.1% stat boost | Only if whole bot sold |
| Title Unlocks | Achievements | Cosmetic + lore | Only if whole bot sold |

#### B. Equippable Gear (Separate NFTs)

These are **modular slots** that can be freely traded:

```typescript
interface EquipmentSlots {
  weapon: EquippableNFT | null;     // +Damage or special attack
  core: EquippableNFT | null;       // Unique trait (e.g., fire trail)
  utility: EquippableNFT | null;    // Resistance or buff
}

interface EquippableNFT {
  id: string;
  name: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  slot: "weapon" | "core" | "utility";
  stats: Partial<Record<StatType, number>>;
  specialAbility?: string;
  serialNumber: number;      // 1 of X
  maxSupply: number;         // Total that can exist
}
```

**Example Equippables**:

| Name | Slot | Stats | Special Ability | Max Supply | Rarity |
|------|------|-------|-----------------|-----------|--------|
| Thermal Heat Sinks | Utility | +20 Fire Resist | Immune to burn DoT | 100 | Rare |
| Hydraulic Crusher Arm | Weapon | +30 Power Core | 15% armor penetration | 25 | Epic |
| Void Core Fragment | Core | +10 SPD | 5% chance to stun on crit | 10 | Legendary |
| Basic Repair Kit | Utility | +5 Stability | +2% HP regen | Unlimited | Common |

### Why This Works

1. **True Scarcity**: No more copies after max supply reached
2. **Evergreen Content**: Old bosses stay relevant (players farm for rare items)
3. **Market Dynamics**: Early adopters who get rare drops can sell for premium
4. **No Artificial Restrictions**: Everything is tradeable; scarcity comes from boss design
5. **Constant Content Flow**: Each new boss = new loot table = new market

### Loot Sources

```typescript
// Boss loot
const foundryOverseerLoot: LootTable = {
  source: "boss_chest",
  rolls: [
    {
      itemType: "scrap",
      dropChance: 1.0,
      quantity: [100, 300]
    },
    {
      itemType: "equipment",
      dropChance: 0.10,
      maxSupply: 100,
      itemId: "thermal_heat_sinks"
    },
    {
      itemType: "equipment",
      dropChance: 0.03,
      maxSupply: 25,
      itemId: "hydraulic_crusher_arm"
    }
  ]
};

// Rare spawn loot (1% chance for special enemy)
const rareSpawnLoot = {
  itemType: "equipment",
  dropChance: 1.0,  // Always drops if rare spawns
  maxSupply: 5,     // Only 5 in entire game
  itemId: "glitched_processor"
};
```

### Player-Created Content Integration

Eventually, players can create:
- **Custom Raid Encounters**: Environment + Boss bots + APL scripts
- **Loot Tables**: Define max supply and drop rates
- **Approval Process**: Community votes on balanced encounters
- **Revenue Share**: Creator gets % of entry fees for their raid

---

## 10. Marketplace & Economy

### Script Marketplace (The "AI Brain" Economy)

Players can create, test, and sell optimized APL scripts as **public or private** strategies:

```typescript
interface APLScriptListing {
  scriptId: string;
  creatorId: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  
  // Stored on-chain in Motoko
  apl: APLLine[];              // The actual script logic
  
  // Performance metrics
  performance: {
    winRate: number;
    averageClearTime: number;
    verifiedClears: number;
    bossesCleared: string[];   // List of boss IDs
  };
  
  // Requirements
  requirements: {
    minLevel: number;
    minTotalStats: number;
    minStability?: number;
    minPowerCore?: number;
    minAcceleration?: number;
    minSPD?: number;
    recommendedClass: ClassName[];
    recommendedFaction: FactionName[];
  };
  
  // Pricing
  pricing: {
    salePrice?: number;        // One-time purchase (ICP or Scrap)
    rentalPrice?: number;      // Per-use fee
    royalty: number;           // % on resale
  };
}
```

### Script Creation Workflow

```
┌─────────────────────────────────────────────┐
│  1. CREATOR TESTS IN SANDBOX                │
│     • Mock boss environments                │
│     • Dummy bots with standard stats        │
│     • Debug timeline to find optimal logic  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  2. VERIFICATION RUN                        │
│     • 10+ successful clears required        │
│     • Win rate calculation                  │
│     • Average clear time recorded           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  3. PUBLISH TO MARKETPLACE                  │
│     • Creator sets: public vs private       │
│     • Set pricing: sale, rental, or both    │
│     • Metadata includes compatibility info  │
│     • Stored as Motoko record on-chain      │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  4. MARKETPLACE LISTING                     │
│     • Buyers can preview demo (if public)   │
│     • Compatibility score shown             │
│     • Ratings/reviews from users            │
│     • Purchase with caller-based auth       │
└─────────────────────────────────────────────┘
```

### Access Control (Motoko-Based)

```motoko
type APLScript = {
  id: Nat;
  creator: Principal;
  apl: [APLLine];
  visibility: { #public; #private };
  owners: [Principal];  // Who can use this script
  pricing: {
    salePrice: ?Nat;
    rentalPrice: ?Nat;
    rentalDuration: ?Nat;  // seconds
  };
};

actor APLMarketplace {
  // Creator uploads script
  public shared(msg) func publishScript(
    apl: [APLLine],
    metadata: ScriptMetadata,
    visibility: { #public; #private },
    pricing: Pricing
  ) : async Result<ScriptId, Text> {
    // Store script with msg.caller as creator
    let scriptId = nextScriptId;
    scripts.put(scriptId, {
      id = scriptId;
      creator = msg.caller;
      apl = apl;
      visibility = visibility;
      owners = [msg.caller];
      pricing = pricing;
    });
    
    #ok(scriptId)
  };
  
  // Purchase script
  public shared(msg) func purchaseScript(scriptId: Nat) : async Result<(), Text> {
    switch (scripts.get(scriptId)) {
      case null { #err("Script not found") };
      case (?script) {
        // Verify payment (integrate with ledger)
        // Add msg.caller to owners list
        let updated = {
          script with
          owners = Array.append(script.owners, [msg.caller])
        };
        scripts.put(scriptId, updated);
        
        // Pay creator (minus platform fee)
        #ok()
      };
    };
  };
  
  // Check if caller can use script
  public query(msg) func canUseScript(scriptId: Nat) : async Bool {
    switch (scripts.get(scriptId)) {
      case null { false };
      case (?script) {
        script.visibility == #public or 
        Array.find(script.owners, func(p: Principal) : Bool { p == msg.caller }) != null
      };
    };
  };
  
  // Get script APL (only if authorized)
  public query(msg) func getScript(scriptId: Nat) : async Result<[APLLine], Text> {
    switch (scripts.get(scriptId)) {
      case null { #err("Script not found") };
      case (?script) {
        let authorized = script.visibility == #public or 
                        Array.find(script.owners, func(p: Principal) : Bool { 
                          p == msg.caller 
                        }) != null;
        
        if (authorized) {
          #ok(script.apl)
        } else {
          #err("Unauthorized")
        };
      };
    };
  };
};
```

### Why Motoko Records Work

1. **Simple Auth**: Caller principal is built-in, no complex vetKeys needed
2. **Transparent for Public**: Public scripts can be viewed by anyone (learning)
3. **Private for Premium**: Private scripts only accessible to purchasers
4. **Reverse Engineering**: Possible but requires buying the script first (revenue!)
5. **Creator Control**: Creators can update pricing, deprecate old versions

### Marketplace Tiers

| Tier | Badge | Requirements | Benefits |
|------|-------|--------------|----------|
| Verified | Bronze | 10+ clears, 50%+ win rate | Listed in marketplace |
| Proven | Silver | 50+ clears, 70%+ win rate | Featured in category |
| Expert | Gold | 200+ clears, 85%+ win rate | Homepage feature |
| Master | Diamond | 500+ clears, 95%+ win rate, top 10 ranked | Exclusive creator channel |

### Economic Flows

```
┌──────────────┐
│   PLAYERS    │
│              │
│ • Run dungeons
│ • Earn XP    │
│ • Get loot   │
└──────┬───────┘
       │
       │ Earn Scrap & Parts
       ▼
┌──────────────┐         ┌──────────────┐
│  MARKETPLACE │◄────────┤   CREATORS   │
│              │         │              │
│ • Bots       │  Sell   │ • APL scripts│
│ • Equipment  │ Scripts │ • Coaching   │
│ • Scripts    │         │ • Custom APL │
└──────┬───────┘         └──────────────┘
       │                        ▲
       │ Buy tools              │
       │                        │ Earn ICP/Scrap
       ▼                        │
┌──────────────┐                │
│  PROGRESSION │────────────────┘
│              │  Need better strategy
│ • Respec     │
│ • Upgrades   │
│ • Meta shifts│
└──────────────┘
```

### Sinks (Deflationary Pressure)

1. **Respec Tax**: 40% of stat points burned
2. **Marketplace Fees**: 2-5% on all trades
3. **Simulation Costs**: Cycle fees on ICP for running dungeons
4. **Script Verification**: Small fee to publish APL to marketplace

### Faucets (Value Creation)

1. **Dungeon Rewards**: Scrap, XP, loot drops (capped by max supply)
2. **Script Sales**: Creator economy generates ICP/Scrap flow
3. **First Clear Bonuses**: Prestige rewards for new content
4. **Leaderboard Rewards**: Weekly/monthly prizes for top performers
5. **Player-Created Content**: Revenue share for approved raid creators

---

## 11. Technical Implementation

### Internet Computer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  POKEDBOTS BRAWL CANISTERS              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────────┐        ┌────────────────┐         │
│  │  NFT CANISTER  │        │  GAME STATE    │         │
│  │                │        │   CANISTER     │         │
│  │ • EXT Standard │◄───────┤                │         │
│  │ • Bot metadata │        │ • Player data  │         │
│  │ • Ownership    │        │ • Progression  │         │
│  └────────────────┘        │ • Equipped APL │         │
│                            └────────┬───────┘         │
│                                     │                  │
│  ┌────────────────┐                 │                  │
│  │  COMBAT ENGINE │◄────────────────┘                  │
│  │   CANISTER     │                                    │
│  │                │                                    │
│  │ • Tick system  │        ┌────────────────┐         │
│  │ • APL resolver │◄───────┤  APL           │         │
│  │ • Deterministic│        │  MARKETPLACE   │         │
│  │   simulation   │        │                │         │
│  └────────┬───────┘        │ • Script store │         │
│           │                │ • Caller auth  │         │
│           │                │ • Public/private│        │
│           ▼                └────────────────┘         │
│  ┌────────────────┐                                    │
│  │  LOOT SYSTEM   │        ┌────────────────┐         │
│  │  CANISTER      │        │  EQUIPMENT     │         │
│  │                │        │  REGISTRY      │         │
│  │ • Drop tables  │◄───────┤                │         │
│  │ • Max supply   │        │ • NFT tracking │         │
│  │ • Rarity caps  │        │ • Marketplace  │         │
│  └────────────────┘        └────────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Canister Responsibilities

#### NFT Canister
- Existing EXT implementation (no changes needed)
- Bot ownership and transfers
- Read-only metadata queries

#### Game State Canister
```motoko
type BotState = {
  tokenIndex: Nat;
  level: Nat;
  xp: Nat;
  allocatedPoints: Stats;
  equippedGear: [?EquipmentId];
  activeAPL: ?APLId;
  respecCount: Nat;
  lastActivity: Time;
};

actor GameState {
  // Progression
  public shared func levelUp(tokenIndex: Nat) : async Result<BotState, Text>;
  public shared func allocatePoints(tokenIndex: Nat, stats: Stats) : async Result<(), Text>;
  public shared func respecBot(tokenIndex: Nat) : async Result<RespecResult, Text>;
  
  // Equipment
  public shared func equipGear(tokenIndex: Nat, slot: Slot, itemId: EquipmentId) : async Result<(), Text>;
  public shared func unequipGear(tokenIndex: Nat, slot: Slot) : async Result<(), Text>;
  
  // APL Management
  public shared func setAPL(tokenIndex: Nat, aplId: ?APLId) : async Result<(), Text>;
  
  // Queries
  public query func getBotState(tokenIndex: Nat) : async ?BotState;
  public query func getPartySnapshot(tokenIndexes: [Nat]) : async [CombatantSnapshot];
};
```

#### Combat Engine Canister
```motoko
type SimConfig = {
  party: [CombatantSnapshot];
  encounter: EncounterId or [CombatantSnapshot]; // Boss or PvP
  seed: Nat;
};

type SimResult = {
  victory: Bool;
  events: [CombatEvent];
  duration: Nat;
  survivors: [TokenIndex];
  rewards: [Loot];
};

actor CombatEngine {
  // Main simulation entry
  public shared func runSimulation(config: SimConfig) : async SimResult;
  
  // Query for instant results (provably fair)
  public query func simulateQuery(config: SimConfig) : async SimResult;
  
  // Boss definitions
  public query func getBossConfig(encounterId: EncounterId) : async BossConfig;
};
```

#### APL Marketplace Canister
```motoko
type APLLine = {
  priority: Nat;
  condition: Condition;
  action: Ability;
  target: TargetSelector;
};

type APLScript = {
  id: Nat;
  creator: Principal;
  name: Text;
  description: Text;
  apl: [APLLine];
  visibility: { #public; #private };
  owners: [Principal];
  requirements: {
    minLevel: Nat;
    minTotalStats: Nat;
    minStability: ?Nat;
    minPowerCore: ?Nat;
    minAcceleration: ?Nat;
    minSPD: ?Nat;
  };
  performance: {
    winRate: Float;
    avgClearTime: Nat;
    verifiedClears: Nat;
  };
  pricing: {
    salePrice: ?Nat;
    rentalPrice: ?Nat;
    rentalDuration: ?Nat;
  };
};

actor APLMarketplace {
  // Publish new script
  public shared(msg) func publishScript(
    apl: [APLLine],
    metadata: ScriptMetadata,
    visibility: { #public; #private },
    pricing: Pricing
  ) : async Result<Nat, Text>;
  
  // Purchase script (caller gets added to owners)
  public shared(msg) func purchaseScript(scriptId: Nat) : async Result<(), Text>;
  
  // Check authorization
  public query(msg) func canUseScript(scriptId: Nat) : async Bool;
  
  // Get script (only if authorized)
  public query(msg) func getScript(scriptId: Nat) : async Result<APLScript, Text>;
  
  // List available scripts
  public query func listScripts(filters: ScriptFilters) : async [ScriptListing];
  
  // Update script performance after clears
  public shared(msg) func updatePerformance(
    scriptId: Nat,
    cleared: Bool,
    clearTime: Nat
  ) : async Result<(), Text>;
};
```

#### Loot System Canister
```motoko
type EquipmentNFT = {
  id: Nat;
  name: Text;
  slot: { #weapon; #core; #utility };
  stats: {
    stability: ?Nat;
    powerCore: ?Nat;
    acceleration: ?Nat;
    spd: ?Nat;
  };
  specialAbility: ?Text;
  serialNumber: Nat;  // 1 of X
  maxSupply: Nat;
  owner: Principal;
};

type LootTable = {
  bossId: Text;
  guaranteedDrops: {
    scrap: (Nat, Nat);
    xp: Nat;
  };
  rareDrops: [{
    itemId: Text;
    maxSupply: Nat;
    droppedCount: Nat;
    dropChance: Float;
  }];
};

actor LootSystem {
  // Roll for loot after boss clear
  public shared(msg) func rollLoot(
    bossId: Text,
    partyMembers: [Principal],
    seed: Nat
  ) : async [Drop];
  
  // Mint equipment NFT (if supply available)
  public shared(msg) func mintEquipment(
    itemId: Text,
    recipient: Principal
  ) : async Result<Nat, Text>;
  
  // Check remaining supply
  public query func getRemainingSupply(itemId: Text) : async ?Nat;
  
  // Get all loot for a boss
  public query func getBossLoot(bossId: Text) : async ?LootTable;
};
```

### Deterministic Simulation (Seed-Based)

```typescript
// Same approach as racing, but for combat
function generateCombatSeed(
  party: CombatantSnapshot[],
  boss: BossConfig,
  timestamp: number
): number {
  const partyHash = hashPartyState(party);
  const bossHash = hashBossConfig(boss);
  
  return sha256(`${partyHash}:${bossHash}:${timestamp}`);
}

// PRNG for variance (critical hits, dodge chances, etc.)
class DeterministicRNG {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    // Xorshift algorithm
    this.seed ^= this.seed << 13;
    this.seed ^= this.seed >> 17;
    this.seed ^= this.seed << 5;
    return (this.seed >>> 0) / 4294967296;
  }
  
  range(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}
```

### Query Call Performance

ICP query calls are incredibly fast (~200-400ms):

```motoko
// Query-only simulation (no state changes)
public query func quickSim(config: SimConfig) : async SimResult {
  // All computation happens in query context
  let rng = PRNG(config.seed);
  let state = initializeState(config.party, config.encounter);
  
  // Run simulation
  while (not isFinished(state)) {
    advanceTick(state, rng);
  };
  
  // Return results instantly
  return {
    victory = state.victory;
    events = state.eventLog;
    duration = state.tick;
    survivors = getSurvivors(state);
    rewards = calculateLoot(state);
  };
};
```

This means players get instant feedback for testing strategies.

---

## 12. Migration Strategy

### Phase 1: Core Engine (Weeks 1-4)

**Goal**: Build the combat simulation engine

- [ ] Implement tick-based combat system
- [ ] Port racing stats to combat stats
- [ ] Create APL resolver logic
- [ ] Build threat/aggro system
- [ ] Develop damage/healing calculations
- [ ] Test with 2-3 simple bosses

**Deliverable**: Working combat engine that can simulate a 5v1 (party vs boss)

### Phase 2: Class & Faction System (Weeks 5-8)

**Goal**: Implement class locking and faction utilities

- [ ] Analyze existing NFT metadata to determine base stats
- [ ] Create class determination logic (highest base stat)
- [ ] Define signature abilities for all 14 factions × 4 classes (56 abilities)
- [ ] Implement party-wide synergy bonuses
- [ ] Create Ultimate Master and Wild specials
- [ ] Test faction balance

**Deliverable**: All bots assigned classes; faction abilities functional

### Phase 3: Progression & APL System (Weeks 9-14)

**Goal**: Build leveling, stat allocation, and script marketplace

- [ ] Implement XP earning and level-up mechanics
- [ ] Create stat allocation system
- [ ] Build respec system with 60/40 split
- [ ] Design APL editor UI
- [ ] Implement APL condition/action logic
- [ ] Create sandbox simulator for testing
- [ ] Build APL Marketplace canister
- [ ] Implement caller-based auth for scripts
- [ ] Add script verification and rating system

**Deliverable**: Players can level bots, allocate points, create/buy APL scripts

### Phase 4: Loot System (Weeks 15-18)

**Goal**: Implement equipment and content-driven scarcity

- [ ] Design equipment slot system
- [ ] Create 20-30 equipment items with max supply caps
- [ ] Build Loot System canister
- [ ] Implement drop table logic with supply tracking
- [ ] Create equipment NFT minting
- [ ] Build equipment marketplace
- [ ] Test economy balance

**Deliverable**: Full loot system with capped supply and trading

### Phase 5: Content Creation (Weeks 19-24)

**Goal**: Populate the game with encounters

- [ ] Design 5 Tier 1 bosses (Level 10-20 bracket)
- [ ] Design 5 Tier 2 bosses (Level 20-40 bracket)
- [ ] Design 3 Tier 3 bosses (Level 40-60 bracket)
- [ ] Define loot tables for each boss
- [ ] Create 15-20 "trash mob" templates for dungeon runs
- [ ] Write flavor text and lore
- [ ] Balance test all encounters
- [ ] Create boss mechanics documentation

**Deliverable**: 13+ unique boss fights with mechanics and loot

### Phase 6: Player-Created Content (Weeks 25-28)

**Goal**: Enable community-driven raid creation

- [ ] Build raid creation UI
- [ ] Allow custom boss APL configuration
- [ ] Community voting/approval system for new raids
- [ ] Revenue share system for creators
- [ ] Moderation tools for exploits
- [ ] Featured content curation

**Deliverable**: Players can design, publish, and monetize raids

### Phase 7: Polish & Launch (Weeks 29-32)

**Goal**: Prepare for public launch

- [ ] Frontend combat log visualizer
- [ ] Mobile-responsive UI
- [ ] Tutorial/onboarding flow
- [ ] Documentation and guides
- [ ] Beta testing with community
- [ ] Bug fixes and balance patches
- [ ] Marketing materials
- [ ] Leaderboards and rankings

**Deliverable**: Public launch of PokedBots Brawl

---

## Migration Checklist: Preserving Existing Assets

### NFT Compatibility

✅ **No changes required to NFT contract**
- Existing metadata fields (parts, faction, rarity) work as-is
- Base stats can be derived from current racing stats
- No need to re-mint or migrate tokens

✅ **Existing garage auras transfer directly**
- Current faction bonuses (e.g., +5 stability) map to combat
- Set-bonus logic already implemented

✅ **Bracket system unchanged**
- Average stats still determine level
- Same level gates (19, 39, 59, etc.)

### Player Data Migration

```typescript
// Existing racing data
interface RacingBot {
  tokenIndex: number;
  stats: {
    speed: number;
    powerCore: number;
    acceleration: number;
    stability: number;
  };
  parts: PartConfig;
  faction: FactionId;
}

// New combat data (additive, not replacement)
interface CombatBot extends RacingBot {
  progression: {
    level: 1;              // Start all bots at level 1
    xp: 0;
    allocatedPoints: {     // New field
      stability: 0,
      powerCore: 0,
      acceleration: 0,
      spd: 0
    };
    respecCount: 0;
  };
  equipment: {             // New field
    weapon: null,
    core: null,
    utility: null
  };
  assignedClass: determineClassPercentile(stats, faction); // Calculated from percentile ranking within faction
}
```

**Class Determination Logic:**
```typescript
// Calculate class based on within-faction percentile ranking
function determineClassPercentile(bot: Bot): Class {
  const faction = bot.faction;
  const factionBots = getAllBotsInFaction(faction);
  
  // Remove faction bonuses to get base stats
  const baseStats = removeFactionBonuses(bot.stats, faction);
  
  // Rank this bot against others in its faction for each stat
  const percentiles = {
    stability: getPercentileRank(baseStats.stability, factionBots, 'stability'),
    powerCore: getPercentileRank(baseStats.powerCore, factionBots, 'powerCore'),
    acceleration: getPercentileRank(baseStats.acceleration, factionBots, 'acceleration'),
    spd: getPercentileRank(baseStats.spd, factionBots, 'spd')
  };
  
  // Assign class based on best (lowest) percentile
  // Lower percentile = higher rank within faction
  const rankings = [
    { stat: 'stability', percentile: percentiles.stability, class: 'Bulwark' },
    { stat: 'powerCore', percentile: percentiles.powerCore, class: 'Striker' },
    { stat: 'acceleration', percentile: percentiles.acceleration, class: 'Fixer' },
    { stat: 'spd', percentile: percentiles.spd, class: 'Tactician' }
  ];
  
  rankings.sort((a, b) => a.percentile - b.percentile);
  return rankings[0].class;
}
```
```

### Dual-Mode Operation (Optional Transition Period)

If desired, both games can run in parallel:

```
┌────────────────────────────────────┐
│       POKEDBOTS PLATFORM           │
├────────────────────────────────────┤
│                                    │
│  ┌──────────────┐  ┌─────────────┐│
│  │   RACING     │  │   BRAWL     ││
│  │              │  │             ││
│  │ • Track sims │  │ • Dungeons  ││
│  │ • Time trials│  │ • PvP Arena ││
│  │ • Leaderboard│  │ • Bosses    ││
│  └──────────────┘  └─────────────┘│
│         │                 │        │
│         └────────┬────────┘        │
│                  ▼                 │
│         ┌─────────────────┐        │
│         │   SAME NFTS     │        │
│         │   SAME STATS    │        │
│         │   SAME GARAGE   │        │
│         └─────────────────┘        │
│                                    │
└────────────────────────────────────┘
```

Benefits:
- Players can choose their preferred mode
- Racing fans aren't forced to switch
- Gradual community transition
- Diversified product offering

---

## Conclusion

PokedBots Brawl represents a natural evolution of the racing platform, leveraging all existing infrastructure while introducing deep strategic gameplay. The key advantages of this conversion are:

1. **Asset Preservation**: All 10,000 existing bots gain new utility without requiring migration
2. **Deterministic Combat**: The proven racing simulation architecture transfers directly
3. **Creator Economy**: APL marketplace creates a new revenue stream for skilled players
4. **Content-Driven Scarcity**: Max supply caps on loot create true rarity without artificial restrictions
5. **Scalable Content**: Boss configs and APL scripts require no visual assets, enabling rapid content creation
6. **Community Content**: Players can eventually create and monetize their own raids
7. **Economic Sustainability**: Multiple sinks (respec, fees) prevent inflation
8. **Faction Depth**: 14 factions × 4 classes = 56 unique ability combinations

The conversion maintains the core DNA of PokedBots (NFT-driven competition, bracket system, faction synergies) while introducing the depth and longevity of an MMO-style progression game.

### Key Design Decisions

1. **Percentile-Based Class Assignment**: Classes determined by within-faction stat rankings, ensuring all 56 faction-class combos exist
2. **No Stat Threshold Abilities**: High stats are their own reward; abilities come from class + faction
3. **Party Bonuses Not Garage Auras**: Bonuses apply during encounters, not globally
4. **Stat-Based Script Requirements**: APL complexity limited by bot power, not arbitrary line counts
5. **Content-Driven Scarcity**: Boss drops have max supply instead of BoE/BoP systems
6. **Motoko Auth for Scripts**: Simple caller-based ownership instead of complex vetKey encryption
7. **PvP Deferred**: Focus on PvE content first, add wagering once game is proven
8. **Player-Created Raids**: Long-term goal to enable community content creation

---

## Next Steps

1. **Prototype the combat engine** with 2-3 simple bosses
2. **Implement percentile-based class assignment** using analyzed faction distributions
3. **Design the first 5 boss encounters** with loot tables
4. **Build APL editor UI** for script creation
5. **Implement content-driven scarcity** in loot system
6. **Test economy balance** with closed beta

---

## Appendices

### A. Complete Faction-Class Matrix

See section 5 for all 56 faction-class combinations (14 factions × 4 classes)

### B. Class Distribution Analysis

**Scripts**: 
- `/scripts/analyze-class-distribution-percentile.js` - Generates percentile-based class assignments
- `/scripts/analyze-class-distribution-raw.js` - Shows distribution using raw base stats

**Output Data**: `/data/class-assignments-percentile.json`

Contains class assignments for all 10,000 bots including:
- Assigned class based on within-faction percentile ranking
- Base stats (before faction bonuses)
- Modified stats (with faction bonuses)
- Percentile rankings for all four stats within the bot's faction
- Reasoning for class assignment (which stat had best percentile)

**Key Distribution Results**:
- Overall: 26.2% Bulwark, 27.2% Striker, 23.1% Fixer, 23.5% Tactician (healthy balance)
- 13 out of 14 factions have all 4 classes represented
- Golden Strikers: Avg base PowerCore 40.6 (Premium tier)
- Industrial Strikers: Avg base PowerCore 18.9 (Budget tier)
- This 2.1x difference creates natural market segmentation and faction identity

### C. Boss Encounter Library

See section 5 for all 56 faction-class combinations (14 factions × 4 classes)

### B. Boss Encounter Library

(To be expanded with full mechanic descriptions and APL scripts)

### C. Equipment Database

(To be populated with full loot tables and max supply tracking)

### D. APL Examples

(To be provided as templates for players)

### E. Balance Testing Methodology

(Framework for ongoing tuning and community feedback)

---

**Document Version**: 2.0  
**Last Updated**: 2024-12-23  
**Status**: Draft - Revised Based on Feedback  
**Changes**:
- Removed stat threshold abilities
- Changed garage auras to party/raid bonuses
- Updated APL complexity to stat-based requirements
- Replaced BoE/BoP with content-driven scarcity (max supply)
- Simplified script marketplace (Motoko records instead of vetKeys)
- Removed PvP/wagering section (deferred)
- Added all 14 faction archetypes with accurate population data
- Added player-created content roadmap
