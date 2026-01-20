# Repair Bay Infrastructure System

## Design Document v1.0

---

## Overview

The Repair Bay Infrastructure system allows players to own, upgrade, and manage **up to 5 individual repair bays** in their garage. Each bay progresses through **16 tiers** of upgrades, with higher tiers providing faster condition restoration rates.

This system transforms the current flat-rate RepairBay scavenging zone into a personalized, upgradeable infrastructure that rewards long-term investment.

---

## Core Mechanics

### Bay Ownership
- Every garage starts with **1 free Repair Bay at Tier 1**
- Players can purchase **up to 4 additional bays** (5 total max)
- Each bay operates **independently** with its own tier progression
- Each bay can repair **one bot at a time**

### Tier Progression
- Each bay progresses through **Tiers 1-16**
- Higher tiers = faster condition restoration
- Upgrades cost **parts + ICP** (increasing with tier)
- Upgrades have a **build time** (bay unavailable during construction)

---

## Tier Details

| Tier | Name | Repair Rate | Power Draw | Upgrade Cost | Build Time | Cumulative Parts |
|------|------|-------------|------------|--------------|------------|------------------|
| **1** | Salvage Arm | 6 cond/hr | 40W | Free (default) | - | 0 |
| **2** | Scrap Crane | 8 cond/hr | 55W | 500 parts | 1 hr | 500 |
| **3** | Junk Lifter | 10 cond/hr | 70W | 750 parts | 1 hr | 1,250 |
| **4** | Parts Handler | 12 cond/hr | 85W | 1,000 parts | 1 hr | 2,250 |
| **5** | Torch Station | 15 cond/hr | 100W | 1,250 parts + 0.5 ICP | 2 hr | 3,500 |
| **6** | Welding Bench | 18 cond/hr | 115W | 1,500 parts + 1 ICP | 2 hr | 5,000 |
| **7** | Fusion Welder | 22 cond/hr | 130W | 2,000 parts + 2 ICP | 2 hr | 7,000 |
| **8** | Plasma Cutter | 26 cond/hr | 145W | 2,500 parts + 3 ICP | 4 hr | 9,500 |
| **9** | Gantry Rig | 32 cond/hr | 160W | 3,500 parts + 5 ICP | 4 hr | 13,000 |
| **10** | Tech Station | 38 cond/hr | 175W | 5,000 parts + 8 ICP | 4 hr | 18,000 |
| **11** | Diagnostic Bay | 45 cond/hr | 190W | 7,000 parts + 12 ICP | 8 hr | 25,000 |
| **12** | Cyber Workshop | 54 cond/hr | 205W | 9,000 parts + 18 ICP | 8 hr | 34,000 |
| **13** | Factory Arm | 65 cond/hr | 220W | 12,000 parts + 25 ICP | 12 hr | 46,000 |
| **14** | Assembly Line | 78 cond/hr | 235W | 16,000 parts + 35 ICP | 12 hr | 62,000 |
| **15** | Forge Station | 95 cond/hr | 250W | 22,000 parts + 50 ICP | 24 hr | 84,000 |
| **16** | Foundry Core | 120 cond/hr | 265W | 30,000 parts + 65 ICP | 24 hr | 114,000 |

**Power Formula:** 25W base + 15W × tier (Tier 1 = 40W, Tier 16 = 265W)

**Total to max one bay (Tier 1→16):** ~114,000 parts + 224.5 ICP

---

## Additional Bay Costs

| Bay Slot | Purchase Cost | Est. Unlock Time | Notes |
|----------|---------------|------------------|-------|
| Bay 1 | Free | - | Starts at Tier 1 |
| Bay 2 | 1,000 parts + 1 ICP | ~3 days | Starts at Tier 1 |
| Bay 3 | 2,500 parts + 3 ICP | ~8 days | Starts at Tier 1 |
| Bay 4 | 6,000 parts + 8 ICP | ~20 days | Starts at Tier 1 |
| Bay 5 | 15,000 parts + 20 ICP | ~50 days | Starts at Tier 1 |

**Curve:** ~2.5x multiplier per slot
**Total for all 5 slots:** 24,500 parts + 32 ICP

---

## Progression Timeline

At ~300 parts/day from scavenging:

| Milestone | Time | Result |
|-----------|------|--------|
| Tier 4 | ~1 week | 12 cond/hr (double starting rate) |
| Tier 6 | ~2.5 weeks | 18 cond/hr |
| **Tier 8** | **~1 month** | **26 cond/hr (matches old default!)** |
| Tier 10 | ~2 months | 38 cond/hr |
| Tier 12 | ~4 months | 54 cond/hr |
| Tier 14 | ~7 months | 78 cond/hr |
| **Tier 16** | **~1 year** | **120 cond/hr (5x starting rate)** |

---

## Integration Points

### 1. RepairBay Scavenging Zone

**Current Implementation** (`PokedBotsGarage.mo`, line ~3954):
```motoko
baseConditionLoss = 12.0; // condition loss per hour
// RepairBay inverts this to restoration: +24-36 cond/hr
```

**New Behavior:**
- When bot enters `#RepairBay` zone, system checks owner's repair bay infrastructure
- Bot is assigned to an available bay (or highest-tier available bay)
- Restoration rate = bay's tier rate (not flat 24-36)
- If no bays available (all occupied), bot joins a queue OR uses default rate

**Files to Modify:**
- `PokedBotsGarage.mo` - Add infrastructure types, modify `getHourlyRates()` for RepairBay
- `garage_start_scavenging.mo` - Check bay availability, assign bot to bay
- `garage_complete_scavenging.mo` - Release bay when bot retrieved

### 2. Paid Repair Command

**Current Implementation** (`garage_repair_robot.mo`, line 21-23):
```motoko
let REPAIR_COST = 5000000 : Nat; // 0.05 ICP
let REPAIR_COOLDOWN : Int = 10800000000000; // 3 hours
let REPAIR_AMOUNT : Nat = 30; // Base repair restores 30 condition
```

**Options:**
- **Option A (Keep Separate):** Paid repair remains instant, unaffected by bays
- **Option B (Integrate):** Paid repair uses best available bay, faster with higher tiers
- **Recommendation:** Keep separate - paid repair is "emergency" instant fix, bays are passive/free

### 3. Stable Storage

**Current Pattern** (`main.mo`, line 376):
```motoko
let stable_user_smrs = Map.new<Principal, PokedBotsGarage.UserSMRStorage>();
```

**New Storage:**
```motoko
let stable_user_repair_bays = Map.new<Principal, PokedBotsGarage.UserRepairBayStorage>();
```

### 4. PokedBotsGarageManager

**Current** (`PokedBotsGarage.mo`, line 709):
```motoko
public class PokedBotsGarageManager(
  initStats : Map.Map<Nat, PokedBotRacingStats>,
  initActiveUpgrades : Map.Map<Nat, UpgradeSession>,
  initUserInventories : Map.Map<Principal, UserInventory>,
  ...
  initUserSMRs : Map.Map<Principal, UserSMRStorage>,
```

**Add:**
```motoko
  initUserRepairBays : Map.Map<Principal, UserRepairBayStorage>,
```

### 5. Power Grid Integration ⚡

**Repair bays draw power from the garage grid while actively repairing a bot.**

**Power Draw Formula:** `25W base + 15W × tier`

| Tier | Power Draw |
|------|------------|
| 1 | 40W |
| 8 | 145W |
| 16 | 265W |
| 5× Tier 16 bays | 1,325W |

**How It Works:**
- Only **active** bays draw power (bay with bot inside)
- Empty or upgrading bays draw 0W
- Power competes with ChargingStation for grid capacity
- Insufficient power = **reduced repair rate** (proportional to efficiency)

**Power Efficiency Calculation:**
```
totalDemand = chargingBots × 100W + activeRepairBays × bayPowerDraw
efficiency = min(1.0, availablePower / totalDemand)
effectiveRepairRate = baseRepairRate × efficiency
```

**Example Scenario:**
| Resource | Draw |
|----------|------|
| 3 bots in ChargingStation | 300W |
| 2× Tier-10 repair bays active | 350W |
| **Total Demand** | **650W** |
| Base Grid | 500W |
| 1× WR-250 SMR | 250W |
| **Available** | **750W** |
| **Efficiency** | **100%** (surplus 100W → batteries) |

**Without SMR:**
| **Available** | **500W** |
| **Efficiency** | **77%** (repair at 77% speed) |

**Files to Modify:**
- `PokedBotsGarage.mo` - `getGaragePowerStatus()` to include repair bay draw
- Repair rate calculation to factor in power efficiency

### 6. Garage Auras / Faction Synergies

**Potential New Synergies:**
- **Industrial faction aura**: -10% repair bay upgrade costs
- **Food faction aura**: +15% repair bay efficiency
- **Box faction aura**: -20% repair bay build time

**Files:**
- `PokedBotsGarage.mo` - `calculateFactionSynergies()` function

### 6. Dedication System

**Current** (`BotDedication.mo`):
- Records condition restored for DP
- Repair cooldown reduction benefits

**Integration:**
- DP earned for condition restored in repair bays (same as current)
- Dedication cooldown reduction doesn't apply (bays are passive, no cooldown)

---

## Data Model

### New Types (add to `PokedBotsGarage.mo`)

```motoko
/// Repair bay tier (1-16)
public type RepairBayTier = Nat;

/// A single repair bay in the garage
public type RepairBay = {
  bayId : Nat;                    // 1-5 (bay slot number)
  tier : RepairBayTier;           // 1-16
  currentBotToken : ?Nat;         // Bot being repaired (null = empty)
  repairStartTime : ?Int;         // When current repair started
  upgradeInProgress : ?{
    targetTier : RepairBayTier;
    startTime : Int;
    completionTime : Int;
  };
};

/// User's repair bay infrastructure
public type UserRepairBayStorage = {
  owner : Principal;
  bays : [RepairBay];             // 1-5 bays owned
  totalPartsInvested : Nat;       // For stats/tracking
  totalIcpInvested : Nat;         // In e8s
};

/// Repair bay tier configuration
public type RepairBayTierConfig = {
  tier : Nat;
  name : Text;
  repairRatePerHour : Nat;        // Condition restored per hour
  powerDrawWatts : Nat;           // Power draw when active
  partsCost : Nat;                // Parts to upgrade TO this tier
  icpCost : Nat;                  // ICP (in e8s) to upgrade TO this tier
  buildTimeNanos : Int;           // Build time in nanoseconds
};
```

### Power Draw Helper

```motoko
/// Get power draw for a repair bay tier (watts)
/// Formula: 25W base + 15W × tier
public func getRepairBayPowerDraw(tier : Nat) : Nat {
  25 + (15 * tier)
};
```

### Tier Configuration Constant

```motoko
public let REPAIR_BAY_TIERS : [RepairBayTierConfig] = [
  { tier = 1; name = "Salvage Arm"; repairRatePerHour = 6; powerDrawWatts = 40; partsCost = 0; icpCost = 0; buildTimeNanos = 0 },
  { tier = 2; name = "Scrap Crane"; repairRatePerHour = 8; powerDrawWatts = 55; partsCost = 500; icpCost = 0; buildTimeNanos = 3_600_000_000_000 },
  { tier = 3; name = "Junk Lifter"; repairRatePerHour = 10; powerDrawWatts = 70; partsCost = 750; icpCost = 0; buildTimeNanos = 3_600_000_000_000 },
  { tier = 4; name = "Parts Handler"; repairRatePerHour = 12; powerDrawWatts = 85; partsCost = 1000; icpCost = 0; buildTimeNanos = 3_600_000_000_000 },
  { tier = 5; name = "Torch Station"; repairRatePerHour = 15; powerDrawWatts = 100; partsCost = 1250; icpCost = 50_000_000; buildTimeNanos = 7_200_000_000_000 },
  { tier = 6; name = "Welding Bench"; repairRatePerHour = 18; powerDrawWatts = 115; partsCost = 1500; icpCost = 100_000_000; buildTimeNanos = 7_200_000_000_000 },
  { tier = 7; name = "Fusion Welder"; repairRatePerHour = 22; powerDrawWatts = 130; partsCost = 2000; icpCost = 200_000_000; buildTimeNanos = 7_200_000_000_000 },
  { tier = 8; name = "Plasma Cutter"; repairRatePerHour = 26; powerDrawWatts = 145; partsCost = 2500; icpCost = 300_000_000; buildTimeNanos = 14_400_000_000_000 },
  { tier = 9; name = "Gantry Rig"; repairRatePerHour = 32; powerDrawWatts = 160; partsCost = 3500; icpCost = 500_000_000; buildTimeNanos = 14_400_000_000_000 },
  { tier = 10; name = "Tech Station"; repairRatePerHour = 38; powerDrawWatts = 175; partsCost = 5000; icpCost = 800_000_000; buildTimeNanos = 14_400_000_000_000 },
  { tier = 11; name = "Diagnostic Bay"; repairRatePerHour = 45; powerDrawWatts = 190; partsCost = 7000; icpCost = 1_200_000_000; buildTimeNanos = 28_800_000_000_000 },
  { tier = 12; name = "Cyber Workshop"; repairRatePerHour = 54; powerDrawWatts = 205; partsCost = 9000; icpCost = 1_800_000_000; buildTimeNanos = 28_800_000_000_000 },
  { tier = 13; name = "Factory Arm"; repairRatePerHour = 65; powerDrawWatts = 220; partsCost = 12000; icpCost = 2_500_000_000; buildTimeNanos = 43_200_000_000_000 },
  { tier = 14; name = "Assembly Line"; repairRatePerHour = 78; powerDrawWatts = 235; partsCost = 16000; icpCost = 3_500_000_000; buildTimeNanos = 43_200_000_000_000 },
  { tier = 15; name = "Forge Station"; repairRatePerHour = 95; powerDrawWatts = 250; partsCost = 22000; icpCost = 5_000_000_000; buildTimeNanos = 86_400_000_000_000 },
  { tier = 16; name = "Foundry Core"; repairRatePerHour = 120; powerDrawWatts = 265; partsCost = 30000; icpCost = 6_500_000_000; buildTimeNanos = 86_400_000_000_000 },
];

public let REPAIR_BAY_SLOT_COSTS : [(Nat, Nat, Nat)] = [
  // (slot, partsCost, icpCostE8s)
  (1, 0, 0),                    // Free
  (2, 2000, 200_000_000),       // 2 ICP
  (3, 5000, 600_000_000),       // 6 ICP
  (4, 10000, 1_500_000_000),    // 15 ICP
  (5, 20000, 3_500_000_000),    // 35 ICP
];
```

---

## New MCP Tools

### 1. `garage_view_repair_bays`

View all repair bays owned, their tiers, current status, and upgrade options.

```motoko
// Returns:
{
  bays: [{
    bayId: 1,
    tier: 8,
    name: "Plasma Cutter",
    repairRate: 26,
    status: "repairing", // "empty" | "repairing" | "upgrading"
    currentBot: ?1234,
    upgradeProgress: null, // or { targetTier, timeRemaining }
    nextUpgrade: { tier: 9, name: "Gantry Rig", cost: "3,500 parts + 5 ICP", buildTime: "4 hours" }
  }],
  totalCapacity: 3, // bays owned
  botsInRepair: 2,
  availableBays: 1,
  nextBaySlot: { slot: 4, cost: "10,000 parts + 15 ICP" }
}
```

### 2. `garage_purchase_repair_bay`

Buy a new repair bay slot.

```motoko
// Input: none (buys next available slot)
// Validation: has parts + ICP, slot available
// Output: new bay created at Tier 1
```

### 3. `garage_upgrade_repair_bay`

Upgrade a specific bay to the next tier.

```motoko
// Input: bay_id (1-5)
// Validation: has parts + ICP, bay not upgrading, not max tier
// Output: upgrade started, bay unavailable until complete
```

### 4. `garage_assign_repair_bay`

Explicitly assign a bot to a specific bay (optional - auto-assignment is default).

```motoko
// Input: token_index, bay_id (optional)
// If bay_id not specified, assign to best available bay
```

---

## Blockers & Challenges

### 1. Migration Strategy
**Challenge:** Existing users have bots in `#RepairBay` zone with flat-rate repair.

**Solution:**
- On upgrade, initialize all users with 1 free Tier 1 bay
- Existing bots in RepairBay continue at **old rate** until retrieved
- New assignments use infrastructure system

### 2. Bot Assignment Logic
**Challenge:** When bot enters RepairBay, which bay do they use?

**Options:**
- **A) Auto-assign to best available:** Simplest, always optimal
- **B) User chooses bay:** More control, more complexity
- **C) FIFO queue:** If all bays full, bot waits

**Recommendation:** Option A with fallback - use best available bay, if all full, use default (6 cond/hr) rate OR queue.

### 3. Build Time During Repair
**Challenge:** What happens to bot in bay if user starts upgrade?

**Options:**
- **A) Block upgrade:** Can't upgrade bay while bot inside
- **B) Eject bot:** Bot returned to garage (loses pending repair)
- **C) Complete at old rate:** Bot finishes at current tier, then upgrade starts

**Recommendation:** Option A - simplest, prevents confusion.

### 4. Selling Bots in Repair
**Challenge:** What if user sells bot while in repair bay?

**Current behavior:** Bots in scavenging transfer to new owner with mission intact.

**New behavior:** Same - bot transfers with repair assignment, new owner receives repaired bot.

### 5. Universal Parts Usage
**Challenge:** Should bay upgrades use Universal Parts or specific types?

**Recommendation:** Accept **any combination** of parts (like current upgrade system). Simplest implementation.

### 6. Resonance System Interaction
**Current:** Paid repair has resonance for Perfect Tune-Up.

**New:** Repair bays are passive - no resonance interaction (too complex, resonance is for skill expression in paid repair).

---

## Implementation Phases

### Phase 1: Data Model & Storage
1. Add types to `PokedBotsGarage.mo`
2. Add stable storage to `main.mo`
3. Add initialization in `PokedBotsGarageManager`
4. Migration: give all users 1 free Tier 1 bay

### Phase 2: Core Logic
1. Implement bay assignment when entering RepairBay zone
2. Modify condition restoration calculation to use bay tier
3. Implement bay release when completing scavenging
4. Handle upgrade-in-progress status

### Phase 3: MCP Tools
1. `garage_view_repair_bays`
2. `garage_purchase_repair_bay`
3. `garage_upgrade_repair_bay`
4. Update `garage_start_scavenging` to show bay assignment
5. Update `garage_complete_scavenging` to show bay used

### Phase 4: Integration
1. Faction synergies (Industrial, Food, Box bonuses)
2. Dedication system DP tracking
3. Documentation updates

### Phase 5: UI/UX (Website)
1. Repair bay grid view in garage
2. Upgrade confirmation modal
3. Build progress indicator
4. Bot-to-bay assignment display

---

## Economic Analysis

### Parts Sink
- **Single maxed bay:** 114,000 parts (~1 year)
- **All 5 bays maxed:** 607,000 parts (~5.5 years solo)
- Creates sustained demand for scavenging

### ICP Sink
- **Single maxed bay:** 224.5 ICP
- **All 5 bays + slots:** 1,180.5 ICP
- Significant but optional - can progress with parts only through Tier 4

### Balance vs Current System
- **Current:** 24-36 cond/hr flat rate, free
- **New Tier 1:** 6 cond/hr (worse initially!)
- **Break-even:** ~Tier 7-8 (22-26 cond/hr) at ~1 month
- **End-game:** 120 cond/hr (5x better)

This creates a **meaningful progression curve** - new players must invest before matching current system, veterans get significantly better throughput.

---

## Asset Mapping

Based on the provided image (4 rows × 4 columns = 16 assets):

| Row | Col | Tier | Name | Visual Description |
|-----|-----|------|------|-------------------|
| 1 | 1 | 1 | Salvage Arm | Basic robotic arm on platform |
| 1 | 2 | 2 | Scrap Crane | Arm with safety railing |
| 1 | 3 | 3 | Junk Lifter | Arm with small monitor |
| 1 | 4 | 4 | Parts Handler | Full workstation with arm |
| 2 | 1 | 5 | Torch Station | Smoking/welding arm |
| 2 | 2 | 6 | Welding Bench | Heated platform with equipment |
| 2 | 3 | 7 | Fusion Welder | Station with fire extinguisher |
| 2 | 4 | 8 | Plasma Cutter | Industrial heated platform |
| 3 | 1 | 9 | Gantry Rig | Basic overhead gantry |
| 3 | 2 | 10 | Tech Station | Gantry with computer screen |
| 3 | 3 | 11 | Diagnostic Bay | Gantry with tools + screen |
| 3 | 4 | 12 | Cyber Workshop | Full diagnostic gantry |
| 4 | 1 | 13 | Factory Arm | Industrial factory arm |
| 4 | 2 | 14 | Assembly Line | Dual machinery setup |
| 4 | 3 | 15 | Forge Station | Heavy machinery |
| 4 | 4 | 16 | Foundry Core | Glowing furnace/reactor |

---

## Open Questions

1. ~~**Queue System:** If all bays occupied, should bots queue or use fallback rate?~~ **DECIDED: Fallback rate (6 cond/hr) for overflow bots**
2. **Instant Completion:** Pay ICP to skip build time?
3. **Bay Specialization:** Should different bays have different bonuses (e.g., one bay is +10% for Industrial bots)?
4. **Refunds:** Can users "downgrade" or sell bays?
5. **Shared Infrastructure:** Could guilds/alliances share repair infrastructure?

---

## UX Design

### Auto-Assignment System ✅

The UI remains simple - users don't manually assign bots to bays.

**Flow:**
1. User selects bots (or "select all")
2. Clicks "Send to Repair Bay"
3. System auto-assigns bots to best available bays
4. Overflow bots repair at fallback rate (6 cond/hr)

**Assignment Priority:**
1. Sort bots by condition (worst first - they need repair most)
2. Assign to highest-tier available bay first
3. Continue until all bays full
4. Remaining bots use fallback rate

**Example:**
```
User has: 3 bays (Tier 8, Tier 5, Tier 2)
User sends: 5 bots to repair

Result:
- Bot A (15% condition) → Tier 8 bay (26 cond/hr)
- Bot B (32% condition) → Tier 5 bay (15 cond/hr)  
- Bot C (45% condition) → Tier 2 bay (8 cond/hr)
- Bot D (58% condition) → Fallback (6 cond/hr)
- Bot E (71% condition) → Fallback (6 cond/hr)
```

**When bay opens:** Next queued bot (by condition) auto-promotes to the freed bay.

### UI Components

**1. Repair Bay Status Panel (new)**
- Shows all owned bays with tier/status
- Current bot in each bay + time remaining
- Upgrade buttons
- Buy new bay slot button

**2. Bot Cards (minor update)**
- Show repair rate when in RepairBay (e.g., "26 cond/hr" vs "6 cond/hr fallback")
- Indicate which bay (if applicable)

**3. Bulk Action (unchanged)**
- "Send to Repair Bay" works exactly as before
- System handles assignment transparently

---

## Implementation Status

### ✅ Phase 1: Data Model & Storage (Complete)
- [x] Added `RepairBayTierConfig`, `RepairBay`, `UserRepairBayStorage` types
- [x] Added 16-tier configuration with costs and build times
- [x] Added `REPAIR_BAY_SLOT_COSTS` for bay slot purchases
- [x] Added `stable_user_repair_bays` to main.mo
- [x] Updated `GarageManager` constructor to accept repair bay storage
- [x] Added helper functions: `getRepairBayTierConfig()`, `getRepairBayPowerDraw()`, `getRepairBaySlotCost()`, `defaultRepairBayStorage()`

### ✅ Phase 2: Bay Management Functions (Complete)
- [x] `getUserRepairBayStorage()` - Get or create default storage
- [x] `getUserRepairBaysMap()` - For stable storage
- [x] `getRepairBayTotalPowerDraw()` - Calculate total power draw
- [x] `getBotRepairRate()` - Get repair rate for a bot
- [x] `assignBotToRepairBay()` - Auto-assign bot to best available bay
- [x] `releaseBotFromRepairBay()` - Release bot from bay
- [x] `purchaseRepairBaySlot()` - Buy additional bay slot
- [x] `startRepairBayUpgrade()` - Start upgrading a bay
- [x] `completeRepairBayUpgrade()` - Complete upgrade when time passes
- [x] `calculateRepairProgress()` - Calculate condition restored

### ✅ Phase 3: Power Grid Integration (Complete)
- [x] Added `repairBayDrawWatts` and `activeRepairBays` to `GaragePowerStatus` type
- [x] Updated `getGaragePowerStatus()` to include repair bay power draw
- [x] Power priority: Charging bots > Repair bays > Battery charging

### ⏳ Phase 4: Actor Endpoints (Pending)
- [ ] `garage_view_repair_bays` - View bay status
- [ ] `garage_purchase_repair_bay_slot` - Buy new slot
- [ ] `garage_upgrade_repair_bay` - Start/complete upgrade
- [ ] `garage_assign_bot_to_repair_bay` - Manual assignment (optional)

### ⏳ Phase 5: Scavenging Integration (Pending)
- [ ] Update `startScavenging()` to call `assignBotToRepairBay()` for #RepairBay zone
- [ ] Update `completeScavenging()` to call `releaseBotFromRepairBay()`
- [ ] Use `getBotRepairRate()` for condition accumulation

### ⏳ Phase 6: MCP Tools (Pending)
- [ ] Create MCP tool for viewing repair bay status
- [ ] Create MCP tool for purchasing/upgrading bays

---

## Appendix: File Change Summary

| File | Changes |
|------|---------|
| `PokedBotsGarage.mo` | Add types, tier configs, bay management functions |
| `main.mo` | Add stable storage, manager initialization |
| `garage_start_scavenging.mo` | Bay assignment logic |
| `garage_complete_scavenging.mo` | Bay release logic |
| `tools/garage_view_repair_bays.mo` | New tool |
| `tools/garage_purchase_repair_bay.mo` | New tool |
| `tools/garage_upgrade_repair_bay.mo` | New tool |
| `docs/GARAGE_SYSTEM.md` | Documentation |
| `guides/07-garage-management.md` | Player guide |
