# Battery Storage System

> **Status:** Design Draft  
> **Version:** 0.1  
> **Last Updated:** January 2026

## Overview

The Battery Storage System allows players to accumulate energy from their garage's power grid (SMRs) and use it on-demand to charge bots via "jolts." This creates a third charging path alongside free grid charging and paid ICP recharges.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GARAGE POWER ECOSYSTEM                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   [SMR Reactors] ──(generate)──> [Power Grid: 500W base]               │
│         │                              │                                │
│         │                              ├──> [Charging Station] ──> Bots │
│         │                              │    (slow, shared, free)        │
│         │                              │                                │
│         └──(surplus)──> [Battery Bank] ──(jolts)──> Bots               │
│                         (stores energy)    (fast, free, builds heat)    │
│                                                                         │
│   [Paid Recharge: 0.1 ICP] ────────────────────────────> Bots          │
│                               (instant, no heat, costs ICP)             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Charging Method Comparison

| Method | Speed | Cost | Heat? | Grid Contention? |
|--------|-------|------|-------|------------------|
| **Free Charging Station** | Slow (hours) | Free | No | Yes - shared 500W |
| **Battery Jolt** | Instant | Free (stored energy) | Yes | No |
| **Paid Recharge** | Instant | 0.1 ICP | No | No |

---

## Battery Types

Four salvaged battery types exist in the wasteland—all discovered through scavenging.

| Type | Capacity | Passive Draw | Max Jolts | Rarity |
|------|----------|--------------|-----------|--------|
| **Scrap Cell** | 50 kWh | 25W | ~2-3 | Common |
| **Salvage Pack** | 150 kWh | 50W | ~6-8 | Uncommon |
| **Industrial Bank** | 400 kWh | 100W | ~18-20 | Rare |
| **Plasma Vault** | 1000 kWh | 200W | ~45-50 | Legendary |

---

## Battery Discovery

All batteries are found while scavenging—**never purchased directly**. Drop rates vary by zone difficulty and battery tier.

### Drop Rates by Zone

| Battery | Scrap Heaps | Abandoned Settlements | Dead Machine Fields |
|---------|-------------|----------------------|---------------------|
| **Scrap Cell** | 2.0% / hr | 1.5% / hr | 1.0% / hr |
| **Salvage Pack** | 0.3% / hr | 1.0% / hr | 1.5% / hr |
| **Industrial Bank** | 0.05% / hr | 0.2% / hr | 0.8% / hr |
| **Plasma Vault** | 0.01% / hr | 0.05% / hr | 0.3% / hr |

**Zone Philosophy:**
- **Scrap Heaps (Safe):** Great for Scrap Cells, slim chance at anything bigger
- **Abandoned Settlements (Moderate):** Balanced drops, decent Salvage Pack odds
- **Dead Machine Fields (Dangerous):** Best odds for Industrial Banks & Plasma Vaults

### Cumulative Expected Hours to Find

| Battery | Scrap Heaps | Abandoned Settlements | Dead Machine Fields |
|---------|-------------|----------------------|---------------------|
| **Scrap Cell** | ~50 hrs | ~67 hrs | ~100 hrs |
| **Salvage Pack** | ~333 hrs | ~100 hrs | ~67 hrs |
| **Industrial Bank** | ~2,000 hrs | ~500 hrs | ~125 hrs |
| **Plasma Vault** | ~10,000 hrs | ~2,000 hrs | ~333 hrs |

### First Battery: Guaranteed Drop

New players get a **guaranteed Scrap Cell** to teach the system:

```
First Battery Discovery:
- Guaranteed after 20 hours cumulative scavenging (any zone)
- OR random drop before that (2% / hr in Scrap Heaps)
- Cycle quality uses CURRENT ZONE's range at discovery time
- Message: "Your bot found something buried in the debris... 
           a corroded power cell! It's damaged, but might be salvageable."
```

> ⚠️ **No zone-hopping exploit:** The guaranteed drop uses cycle ranges from whatever zone triggers it. Scavenging 19 hrs in Scrap Heaps then switching to Dead Machine Fields still gives you Dead Machine Fields' cycle range (10-50), but you had to be IN that zone when the 20hr threshold was crossed.

### Lucky Finds

Even in easy zones, there's always a tiny chance to strike gold:

```
Example: Scavenging Scrap Heaps for 100 hours
- Scrap Cell: ~86% chance to find at least one
- Salvage Pack: ~26% chance to find at least one
- Industrial Bank: ~5% chance (lucky!)
- Plasma Vault: ~1% chance (legendary luck!)
```

The wasteland rewards persistence and risk-taking.

### Discovery Messages

| Battery | Discovery Message |
|---------|-------------------|
| **Scrap Cell** | "Your bot unearthed a corroded power cell from the rubble." |
| **Salvage Pack** | "Buried under scrap metal... a salvageable battery pack!" |
| **Industrial Bank** | "Your bot's sensors detected something big—an industrial battery bank!" |
| **Plasma Vault** | "⚡ INCREDIBLE FIND! A fully intact Plasma Vault lies before you!" |

### All Batteries Found as Wasteland Scrap

Every discovered battery arrives in **Dead** condition (0% health) **with existing wear**:
- Cannot hold charge until repaired to 100%
- **Already has cycles on the core** (it's used wasteland junk!)
- Visual: Dark tubes, cracked casing, corrosion
- Core wear affects repair efficiency immediately

**Discovery Cycles by Zone:**

| Zone | Cycle Range | Why |
|------|-------------|-----|
| **Scrap Heaps** | 60 - 120 cycles | Discarded junk, heavily used before dumping |
| **Abandoned Settlements** | 30 - 80 cycles | Left behind during evacuation |
| **Dead Machine Fields** | 10 - 50 cycles | Preserved inside dead machines |

> 💡 **Finding a 15-cycle Plasma Vault in Dead Machine Fields is a jackpot!**  
> Finding a 100-cycle Scrap Cell in Scrap Heaps? Might be better to salvage it immediately.

**Discovery Quality Tiers:**

| Cycles | Quality | Repair Efficiency | Value |
|--------|---------|-------------------|-------|
| 0-10 | 🌟 Pristine | 100% | Extremely rare, premium value |
| 10-30 | ✨ Good | 80% | Lucky find, worth restoring |
| 30-60 | ⚡ Average | 60% | Typical find, serviceable |
| 60-120 | 🔧 Worn | 40-20% | Consider salvaging |
| 120+ | 💀 Toast | 20% | Salvage fodder |

**Repair to Activate:**
The battery must be **fully repaired to 100% health** before it becomes functional.
Repair efficiency depends on the core's existing wear:

| Battery | Repair Cost | Best Case (4 repairs) | Worn Case (8+ repairs) |
|---------|-------------|----------------------|------------------------|
| **Scrap Cell** | 50 parts | 200 parts | 400+ parts |
| **Salvage Pack** | 150 parts | 600 parts | 1,200+ parts |
| **Industrial Bank** | 400 parts | 1,600 parts | 3,200+ parts |
| **Plasma Vault** | 1,000 parts | 4,000 parts | 8,000+ parts |

**Or pay ICP to skip repairs entirely (REPAIR ONLY, not rebuild):**

| Battery | ICP Shortcut | What It Does |
|---------|--------------|---------------|
| Scrap Cell | 1 ICP | Restores to 100% health (cycles unchanged) |
| Salvage Pack | 2 ICP | Restores to 100% health (cycles unchanged) |
| Industrial Bank | 5 ICP | Restores to 100% health (cycles unchanged) |
| Plasma Vault | 10 ICP | Restores to 100% health (cycles unchanged) |

> ⚠️ **ICP shortcut = repair, NOT rebuild.** If a battery has 100+ cycles, you'll still have poor repair efficiency going forward. Consider a full rebuild instead (see Core Wear section).

> 💡 **A pristine find (10 cycles) repairs efficiently in 4 repairs.**  
> **A toast find (100+ cycles) might need 8-10 repairs—or just salvage it!**

Batteries are a **significant parts sink** for endgame players.

**Activation Threshold:**
Once health reaches **100%**, the battery becomes operational:
- Begins passive charging when grid has ≥100W surplus
- Can deliver jolts at full efficiency
- Tubes glow bright orange

**Below 100%:** Battery is inert—cannot charge, cannot jolt. Must complete repairs first.

```
┌─────────────────────────────────────────────────────────────┐
│                   FIRST BATTERY JOURNEY                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Scavenge Scrap Heaps] ──(discover)──> [Busted Cell 0%]   │
│                                              │              │
│                                    (repair 50 parts ×4)    │
│                                       OR (0.5 ICP)         │
│                                              │              │
│                                              ▼              │
│                                    [Fresh Cell 100%]       │
│                                              │              │
│                                    (grid surplus ≥100W)    │
│                                              │              │
│                                              ▼              │
│                                    [Passive Charging!]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

This teaches the full battery loop: scavenging → repair → charging → jolts.

---

## Battery Health System

Batteries degrade from **use**, not from sitting idle. Each jolt wears the battery slightly.

### Health Tiers

| State | Health % | Charge Efficiency | Jolt Range | Failure Chance | Visual |
|-------|----------|-------------------|------------|----------------|--------|
| **Fresh** | 100-66% | 100% | 25-45% | 0% | Bright orange glow, steady |
| **Worn** | 65-33% | 90% | 20-40% | 5% | Dim orange, occasional flicker |
| **Depleted** | 32-1% | 75% | 15-35% | 15% | Red glow, sparking, unstable |
| **Dead** | 0% | 0% (unusable) | N/A | N/A | Dark tubes, cracked, corroded |

### Operational Threshold

**Batteries only function at 100% health:**
- Below 100%: Cannot charge, cannot jolt, must complete repairs first
- At 100%: Begins charging when grid has surplus ≥ battery's draw rate
- Once operational, efficiency degrades as health drops (see tiers above)
- Falls below 66% (Worn): Still works but reduced efficiency
- Falls below 33% (Depleted): Works poorly, high failure chance
- Reaches 0% (Dead): Stops working entirely, must repair back to 100%

### Health Loss from Jolts

Each jolt damages the battery slightly:

| Battery | Health Loss per Jolt | Jolts Until Dead (from 100%) |
|---------|---------------------|------------------------------|
| Scrap Cell | 2% | ~50 jolts |
| Salvage Pack | 1% | ~100 jolts |
| Industrial Bank | 0.5% | ~200 jolts |
| Plasma Vault | 0.25% | ~400 jolts |

> 💡 **Larger batteries are more durable.** A Plasma Vault can deliver 8x more jolts than a Scrap Cell before needing repair.

---

## Core Wear System (Cycles)

Batteries track **total energy discharged** (kWh jolted out) since last rebuild. Core wear is measured in **cycles** (discharge ÷ capacity). Cycles affect both **repair efficiency** and **maximum capacity**.

> ⚠️ **Only jolts count toward cycles.** Charging does not wear the core—discharge does.

### Cycle Effects

| Cycles | Repair Efficiency | Max Capacity | Example: Plasma Vault |
|--------|-------------------|--------------|----------------------|
| 0 - 10 | 100% (+25% health) | 100% | 1000 kWh max |
| 10 - 30 | 80% (+20% health) | 90% | 900 kWh max |
| 30 - 60 | 60% (+15% health) | 75% | 750 kWh max |
| 60 - 120 | 40% (+10% health) | 50% | 500 kWh max |
| 120+ | 20% (+5% health) | 25% | 250 kWh max |

> 💡 **Cycles permanently reduce max capacity.** A heavily-used battery holds less energy even at 100% health. Only a rebuild resets this.

**Absolute kWh thresholds by battery type:**

| Battery | 10 cycles | 30 cycles | 60 cycles | 120 cycles |
|---------|-----------|-----------|-----------|------------|
| Scrap Cell (50 kWh) | 500 | 1,500 | 3,000 | 6,000 |
| Salvage Pack (150 kWh) | 1,500 | 4,500 | 9,000 | 18,000 |
| Industrial Bank (400 kWh) | 4,000 | 12,000 | 24,000 | 48,000 |
| Plasma Vault (1000 kWh) | 10,000 | 30,000 | 60,000 | 120,000 |

> 💡 **A Plasma Vault at 6,000 kWh throughput = only 6 cycles (pristine!)**  
> **A Scrap Cell at 6,000 kWh throughput = 120 cycles (toast!)**

**What counts as throughput:**
- Every kWh **jolted out** to bots (discharge wears the core)
- Charging does NOT add to throughput
- Adds up over the battery's lifetime

### Core Rebuild

When cycles get too high, you need a **full core rebuild**—an expensive operation that:
1. Restores health to 100%
2. **Resets cycles to 0** (fresh core)
3. **Restores max capacity to 100%**

| Battery | Rebuild (Parts) | Rebuild (ICP) |
|---------|-----------------|---------------|
| Scrap Cell | 300 parts | 2 ICP |
| Salvage Pack | 900 parts | 5 ICP |
| Industrial Bank | 2,400 parts | 12 ICP |
| Plasma Vault | 6,000 parts | 25 ICP |

### Strategic Decisions

```
┌─────────────────────────────────────────────────────────────────┐
│                    CORE WEAR DECISION TREE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Battery health low?                                            │
│       │                                                         │
│       ├── Core wear LOW (<1500 kWh) ──> REPAIR (cheap, +25%)   │
│       │                                                         │
│       ├── Core wear MEDIUM (1500-3000) ──> REPAIR (still ok)   │
│       │                                                         │
│       └── Core wear HIGH (>3000 kWh)                           │
│               │                                                 │
│               ├── Still need battery? ──> REBUILD (expensive)  │
│               │                                                 │
│               └── Don't need it? ──> SALVAGE (recover parts)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Example Scenario:**
```
Plasma Vault with 4,500 kWh throughput, health at 50%

Option A: Repair
- Cost: 1,000 parts
- Result: +10% health (only 40% efficiency)
- Need 5 repairs = 5,000 parts to reach 100%

Option B: Rebuild  
- Cost: 6,000 parts
- Result: 100% health + reset wear to 0
- Better long-term value!

Option C: Salvage
- Return: 1,000 parts
- If you don't want to maintain this battery
```

---

### Maintenance Options

**Repair Costs (scaled by battery size):**

| Battery | Repair (+25%) | Full Restore (Parts) | Full Restore (ICP) |
|---------|---------------|---------------------|--------------------|
| Scrap Cell | 50 parts | 200 parts | 1 ICP |
| Salvage Pack | 150 parts | 600 parts | 2 ICP |
| Industrial Bank | 400 parts | 1,600 parts | 5 ICP |
| Plasma Vault | 1,000 parts | 4,000 parts | 10 ICP |

> ⚠️ **Repair efficiency decreases with core wear!** See table above.

| Action | Effect |
|--------|--------|
| **Salvage for Parts** | Destroy battery, recover parts (see below) |

### Salvage System

Players can choose to **permanently destroy** a battery to recover parts:

| Battery Type | Salvage Return |
|--------------|----------------|
| Scrap Cell | 50 Universal Parts |
| Salvage Pack | 150 Universal Parts |
| Industrial Bank | 400 Universal Parts |
| Plasma Vault | 1,000 Universal Parts |

**Salvage considerations:**
- Works on ANY health level (even Dead batteries)
- Battery is permanently destroyed—cannot be undone
- Returns ~25% of full restore cost (1 repair cycle worth)
- Good option for high-cycle batteries where repairs are inefficient

---

## Secondary Market

Batteries persist forever (never auto-destroyed) but can be traded or salvaged.

### Marketplace Listing Requirements

Listings must display:
- **Cycles:** Current core wear (affects repair efficiency)
- **Health:** Current health percentage
- **Charge:** Current stored kWh
- **Self-Discharge Warning:** Listed batteries continue to self-discharge!

> ⚠️ **Self-discharge continues while listed.** A fully charged battery listed for 30 days loses 30%+ charge. Price competitively!

### Market Categories

| Listing Type | Description | Price Range |
|--------------|-------------|-------------|
| **Charged + Fresh** | Ready to use immediately | Premium (highest) |
| **Empty + Fresh** | 100% health, needs charging | Mid-high |
| **Damaged** | Below 100%, needs repair + charging | Discounted |
| **Dead Core** | 0% health, needs full restoration | Budget (lowest) |

### Example Pricing (Plasma Vault)

```
Charged + Fresh:     ~80 ICP  (instant value, high maintenance)
Empty + Fresh:       ~50 ICP  (needs time to charge)
Damaged (50%):       ~25 ICP  (needs 2,000 parts to restore)
Dead Core (0%):      ~12 ICP  (needs 4,000 parts to restore!)
Salvage value:       ~1,000 parts (~10 ICP equivalent)
```

> 💡 **Market insight:** Dead cores trade cheap because restore cost is steep. Active players buy fresh; patient players restore dead cores.

### Service Economy

Players can offer services:
- **"Send me your dead core + 100 parts, I'll restore it"**
- **"Fully charged Plasma Vaults for rent before events"**
- **"Bulk battery restoration: 10 cores for 1500 parts"**

This creates guild/social economy opportunities.

### Self-Discharge

Batteries slowly lose stored charge when not actively charging:

| State | Self-Discharge Rate |
|-------|---------------------|
| Fresh | 0.5% per day |
| Worn | 1% per day |
| Depleted | 2% per day |

> 💡 **Self-discharge is the only time-based mechanic.** Stored energy slowly leaks. Health and cycles are purely usage-based.

---

## Jolt Mechanics

"Jolts" are rapid energy transfers from battery to bot.

### Jolt Parameters

| Parameter | Value |
|-----------|-------|
| **Energy cost per jolt** | 20 kWh (fixed) |
| **Base jolt output** | 25-45% bot charge (random) |
| **Modified by** | Battery health, bot heat |

### Heat System

Bots build up heat from rapid battery charging, reducing jolt efficiency.

```
┌─────────────────────────────────────────────────────────┐
│                    HEAT STACK SYSTEM                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Stack 0: 100% jolt efficiency (cool)                  │
│  Stack 1: 85% jolt efficiency (warm)                   │
│  Stack 2: 70% jolt efficiency (hot)                    │
│  Stack 3: 50% jolt efficiency (overheating!)           │
│  Stack 4: BLOCKED - Cannot receive jolts (critical)    │
│                                                         │
│  Heat decay: 1 stack per hour ELAPSED since last jolt  │
│  (Calculated as: floor((now - lastJoltTime) / 1 hour)) │
│  Overheat lockout: 2 hours at 4 stacks                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Jolt Efficiency Formula

```
final_jolt = base_roll × battery_health_modifier × heat_modifier

Where:
- base_roll = random(25, 45)
- battery_health_modifier = Fresh: 1.0, Worn: 0.9, Depleted: 0.75
- heat_modifier = 1.0 - (heat_stacks × 0.15)
```

### Jolt Failure

Worn and Depleted batteries have a chance to "fizzle":

```
On failure:
- 20 kWh consumed from battery (wasted)
- 0% delivered to bot
- Heat stack still added
- Message: "The jolt fizzled! Energy lost to resistance."
```

### Example Jolt Sequence

```
Scenario: Bot at 20%, need to race in 30 minutes
Battery: Salvage Pack with 80 kWh stored (Fresh)

Jolt 1: 
  Cost: 20 kWh → Battery now at 60 kWh
  Roll: 38% × 1.0 (fresh) × 1.0 (no heat) = 38%
  Bot: 20% + 38% = 58%
  Heat: 1 stack

Jolt 2:
  Cost: 20 kWh → Battery now at 40 kWh  
  Roll: 32% × 1.0 (fresh) × 0.85 (1 heat) = 27%
  Bot: 58% + 27% = 85%
  Heat: 2 stacks

Jolt 3:
  Cost: 20 kWh → Battery now at 20 kWh
  Roll: 41% × 1.0 (fresh) × 0.70 (2 heat) = 29%
  Bot: 85% + 29% = 100% (capped)
  Heat: 3 stacks

Result: Bot fully charged, 20 kWh remaining, bot has 3 heat stacks
Warning: One more jolt would trigger overheat lockout!
```

---

## Battery Charging

Batteries charge passively from surplus grid power.

### Charge Rate Calculation

```
charge_rate = min(battery_passive_draw, available_grid_surplus)

available_grid_surplus = total_grid_capacity - active_charging_load
```

### Example Scenarios

**Scenario 1: Empty garage**
```
Grid: 500W base
Bots charging: 0 (0W load)
Battery: Industrial Bank (100W draw)
Surplus: 500W - 0W = 500W available
Charge rate: min(100W, 500W) = 100W
Time to fill 400 kWh: 4 hours
```

**Scenario 2: Heavy charging load**
```
Grid: 500W base
Bots charging: 8 bots × 100W = 800W demand (overloaded!)
Battery: Industrial Bank (100W draw)
Surplus: 500W - 800W = -300W (deficit, grid overloaded)
Charge rate: 0W (battery does not charge during deficit)
```

**Scenario 3: Moderate load with SMR**
```
Grid: 500W base + 200W SMR = 700W total
Bots charging: 3 bots × 100W = 300W demand
Battery: Plasma Vault (200W draw)
Surplus: 700W - 300W = 400W available
Charge rate: min(200W, 400W) = 200W
Time to fill 1000 kWh: 5 hours
```

### Fill Time Reference

Time to fully charge each battery type (assuming full surplus available):

| Battery | Capacity | Draw Rate | Fill Time (uncontested) |
|---------|----------|-----------|------------------------|
| Scrap Cell | 50 kWh | 25W | 2 hours |
| Salvage Pack | 150 kWh | 50W | 3 hours |
| Industrial Bank | 400 kWh | 100W | 4 hours |
| Plasma Vault | 1000 kWh | 200W | 5 hours |

---

## Strategic Considerations

### When to Use Each Charging Method

| Situation | Best Method | Reason |
|-----------|-------------|--------|
| Single bot, no rush | Free charging station | No cost, let it idle |
| Race in 30 min, low battery | Battery jolts | Fast, free if stored |
| Multiple bots, big event | Mix of jolts + paid | Jolts for some, ICP to avoid overheat |
| Bot already has 3 heat stacks | Paid recharge (0.1 ICP) | No heat penalty |
| Grid overloaded (many bots) | Battery jolts | Bypass grid contention |
| Overnight idle | Free charging + battery fill | Wake up to full resources |

### Battery Size Strategy

| Player Type | Recommended Setup |
|-------------|-------------------|
| **Casual (1-3 bots)** | 1× Salvage Pack (150 kWh) |
| **Active Racer (5-10 bots)** | 1× Industrial Bank (400 kWh) |
| **Fleet Manager (20+ bots)** | 1× Plasma Vault + 1× Industrial Bank |
| **Competitive Events** | Multiple batteries for burst charging |

---

## UI/UX Concepts

### Battery Panel Display

```
┌─────────────────────────────────────────────┐
│  ⚡ INDUSTRIAL BANK                         │
│  ████████████████░░░░░░░░  320/400 kWh     │
│                                             │
│  Health: [████████░░] FRESH (78%)          │
│  Charging: +100W (2.5 hrs to full)         │
│  Self-discharge: -1%/day                   │
│                                             │
│  [JOLT BOT ▼]  [MAINTAIN]  [DETAILS]       │
└─────────────────────────────────────────────┘
```

### Jolt Confirmation Modal

```
┌─────────────────────────────────────────────┐
│  ⚡ JOLT BOT #4829                          │
│                                             │
│  Current charge: 35%                        │
│  Heat stacks: 1/4 🔥                        │
│                                             │
│  Expected jolt: 22-38% (Worn battery)      │
│  Heat after: 2/4 🔥🔥                       │
│                                             │
│  Cost: 20 kWh from battery                 │
│                                             │
│  ⚠️ Bot will be at ~57-73% after jolt      │
│                                             │
│        [CANCEL]    [⚡ SEND JOLT]           │
└─────────────────────────────────────────────┘
```

### Overheat Warning

```
┌─────────────────────────────────────────────┐
│  🔥 BOT OVERHEATING                         │
│                                             │
│  Bot #4829 has 4 heat stacks!              │
│  Cannot receive battery jolts for 2 hours.  │
│                                             │
│  Alternatives:                              │
│  • Wait 2 hours for cooldown               │
│  • Use free charging station (slow)        │
│  • Pay 0.1 ICP for instant recharge        │
│                                             │
│              [OK]                           │
└─────────────────────────────────────────────┘
```

---

## Technical Implementation Notes

### Data Structures

```motoko
type Battery = {
    id: Nat;
    batteryType: BatteryType; // #ScrapCell, #SalvagePack, #IndustrialBank, #PlasmaVault
    storedKwh: Float;
    healthPercent: Nat; // 0-100
    lastDegradationCheck: Time.Time;
    totalJoltsDelivered: Nat;
    installedAt: Time.Time;
};

type BatteryType = {
    #ScrapCell;      // 50 kWh, 25W
    #SalvagePack;    // 150 kWh, 50W
    #IndustrialBank; // 400 kWh, 100W
    #PlasmaVault;    // 1000 kWh, 200W
};

type BotHeat = {
    tokenIndex: Nat;
    heatStacks: Nat; // 0-4
    lastJoltTime: Time.Time;
    overheatUntil: ?Time.Time;
};
```

### Key Functions

```motoko
// Jolt a bot from battery
jolt_bot(batteryId: Nat, tokenIndex: Nat) : async Result<JoltResult, Text>

// Check battery charge status
get_battery_status(batteryId: Nat) : async BatteryStatus

// Repair battery with parts or ICP
repair_battery(batteryId: Nat, useIcp: Bool) : async Result<(), Text>

// Rebuild battery core (reset cycles)
rebuild_battery(batteryId: Nat, useIcp: Bool) : async Result<(), Text>

// Calculate current grid surplus
get_grid_surplus() : async GridStatus
```

---

## Future Considerations

### Potential Expansions

1. **Battery Trading:** Allow players to sell charged batteries on marketplace
2. **Overcharge Storage:** Batteries could store "overcharge" energy for bonus jolts
3. **Battery Fusion:** Combine two batteries into a larger one (with parts cost)
4. **Emergency Discharge:** Dump entire battery into one bot for massive boost (destroys battery)
5. **Guild Batteries:** Shared batteries for guild members with contribution tracking

### Balance Levers

If batteries are too strong:
- Increase jolt energy cost (25 kWh instead of 20)
- Reduce jolt output range
- Faster degradation

If batteries are too weak:
- Decrease heat buildup
- Higher jolt output range
- Slower degradation

---

## Exploit Prevention

Design decisions made to prevent common exploits:

### 1. Throughput Only Counts Discharge
**Why:** Counting both charge and discharge would make cycles accumulate 2x faster than intuitive. Real battery wear comes from discharge cycles.

**Rule:** Only `joltBot()` calls add to `kwhThroughput`. Charging is "free" from a wear perspective.

### 2. ICP Shortcut = Repair, Not Rebuild
**Why:** If ICP could reset cycles cheaply, it would undermine the parts economy.

**Rule:** ICP shortcut restores health to 100% but does NOT reset cycles. High-cycle batteries still have poor repair efficiency going forward. Full rebuild is a separate, more expensive operation.

### 3. Discovery Cycles Use Current Zone
**Why:** Prevent "zone-hopping" where players scavenge easy zones then switch to good zones right before guaranteed drop.

**Rule:** When a battery drops (random or guaranteed), it uses the cycle range of the zone where the bot is currently scavenging.

### 4. Heat Decay Uses Elapsed Time
**Why:** Hour-boundary timing exploits would let players game cooldowns.

**Rule:** `stacksDecayed = floor((now - lastJoltTime) / 1 hour)`. No gaming clock boundaries.

### 5. Self-Discharge Continues While Listed
**Why:** Pausing discharge while listed would create "list to preserve" exploits.

**Rule:** Batteries lose charge even on marketplace. Creates pricing urgency and market dynamics.

### 6. Salvage Returns Fixed Parts
**Why:** Salvage should be a fallback, not a profit mechanic.

**Rule:** Salvage returns ~1 repair cycle worth of parts regardless of health/cycles. Bad batteries should be salvaged, good batteries should be used.

---

## Summary

The Battery Storage System adds strategic depth to the energy economy by:

1. **Creating an idle accumulation loop** - Batteries charge passively, rewarding check-ins
2. **Providing burst charging** - Jolts allow rapid bot charging before events
3. **Adding resource management** - Balance between charging, degradation, and usage
4. **Rewarding planning** - Savvy players repair at optimal times and manage heat efficiently
5. **Preserving ICP sink** - Paid recharge remains valuable for avoiding heat/urgency

The system integrates cleanly with existing mechanics (grid, SMRs, scavenging) while adding meaningful decisions without overwhelming complexity.
