---
title: Power Grid & Batteries
description: Master your garage's power grid, SMR reactors, and salvaged batteries
order: 15
---

# Power Grid & Battery Systems

## Overview

Your garage runs on a power grid that fuels the ChargingStation for free battery recharges. You can expand capacity with **SMR reactors** (purchased with ICP), and store energy in **salvaged batteries** found while scavenging for instant "jolts" to your bots.

**The Power Hierarchy:**
1. **Power Grid** → Powers the ChargingStation (slow, free recharges)
2. **SMR Reactors** → Permanent grid upgrades (purchased with ICP)
3. **Salvaged Batteries** → Instant jolts (found while scavenging)

---

## Power Grid Basics

### Default Capacity
- **Base:** 500W (every garage)
- **Per Bot:** 100W draw when in ChargingStation

### How Efficiency Works
```
Efficiency = Grid Capacity / (Bots × 100W)
```

| Bots Charging | Draw | Efficiency (500W Grid) |
|---------------|------|------------------------|
| 1-5 | 100-500W | 100% (full speed) |
| 7 | 700W | 71% |
| 10 | 1000W | 50% |
| 20 | 2000W | 25% |

**Key Point:** More bots = slower charging for ALL bots. If you have 10 bots on a 500W grid, each charges at half speed (~20-30 hours from 0% instead of ~10-15).

### Charging Times (Approximate)
ChargingStation uses a stepped charging curve:
- **0-25% battery:** ~5 battery/hour (slowest - punishes letting bots die)
- **25-50% battery:** ~10 battery/hour
- **50-75% battery:** ~15 battery/hour
- **75-100% battery:** ~20 battery/hour (fastest - rewards maintenance)

**From 0% to 100%:** ~10-15 hours at 100% efficiency

---

## SMR Reactors (Grid Upgrades)

SMRs (Small Modular Reactors) permanently increase your grid capacity. Buy them to charge more bots simultaneously without slowdown.

### Available Models

| Model | Capacity | Price | Lifetime | Features |
|-------|----------|-------|----------|----------|
| **WR-250** "Scrapyard Special" | +250W | 5 ICP | ~20 MWh | Entry-level, salvaged core |
| **WR-500** "Rust Belt Reactor" | +500W | 8 ICP | ~80 MWh | Auto-regulating coolant |
| **WR-880** "Deadzone Dynamo" | +880W | 12 ICP | ~160 MWh | Triple-redundant cooling |
| **WR-1210** "Flux Capacitor Elite" | +1.21 GW! | 15 ICP | ~300 MWh | Pre-war military tech ⭐ Best value |

### Calculating Your Needs

| Your Fleet | Minimum Grid for 100% | Recommended Setup |
|------------|----------------------|-------------------|
| 1-5 bots | 500W (base) | Base grid is fine |
| 6-10 bots | 1000W | WR-500 (+500W) |
| 11-15 bots | 1500W | WR-500 + WR-500 or WR-880 |
| 16-25 bots | 2500W | WR-1210 + WR-500 |
| 25+ bots | 3000W+ | Multiple SMRs |

### SMR Lifetime


Each SMR has a lifetime measured in MWh (megawatt-hours). The reactor depletes as it delivers power to charging bots. The lifetime is based on total energy delivered—not time.

- **1 MWh = 1,000 kWh**
- **Each full bot charge from the grid = 10 kWh** (from 0% to 100% battery)

**Lifetime Formula (Grid Charging):**
```
Total full grid charges = Lifetime MWh × 1,000 / 10
```

For WR-250: `20 MWh × 1,000 / 10 = 2,000 full grid charges`

**At max output (250W, 24/7), the WR-250 SMR will last about 3.3 days. WR-1210 will last about 50 days.**
If you use less than max output, the SMR will last longer.

**UI Indicator:** Your SMR shows "XX% life" remaining. At 100%, it's brand new.

---

## Salvaged Batteries (Instant Jolts)

Batteries are **found while scavenging** - never purchased directly. They store grid power passively and can "jolt" your bots for instant battery restoration.

### Battery Types

| Type | Capacity | Draw Rate | Jolts to Dead | Repair Cost | Rebuild Cost |
|------|----------|-----------|---------------|-------------|--------------|
| **Scrap Cell** | 50 kWh | 25W | ~50 | 50 parts | 300 parts / 2 ICP |
| **Salvage Pack** | 150 kWh | 50W | ~100 | 150 parts | 900 parts / 5 ICP |
| **Industrial Bank** | 400 kWh | 100W | ~200 | 400 parts | 2,400 parts / 12 ICP |
| **Plasma Vault** | 1000 kWh | 200W | ~400 | 1,000 parts | 6,000 parts / 25 ICP |

### Battery Discovery

Batteries are **rare finds** while scavenging:

| Zone | Scrap Cell | Salvage Pack | Industrial Bank | Plasma Vault |
|------|------------|--------------|-----------------|--------------|
| ScrapHeaps | 0.1%/hr | 0.01%/hr | 0.001%/hr | 0.0001%/hr |
| AbandonedSettlements | 0.08%/hr | 0.03%/hr | 0.005%/hr | 0.0005%/hr |
| DeadMachineFields | 0.05%/hr | 0.05%/hr | 0.015%/hr | 0.002%/hr |

**Guaranteed First Battery:** After 20 cumulative hours of scavenging, you're guaranteed to find your first battery!

**Discovery Condition:** Found batteries are DEAD (0% health) with existing cycle wear based on zone:
- ScrapHeaps: 60-120 cycles (heavily used junk)
- AbandonedSettlements: 30-80 cycles (moderate wear)
- DeadMachineFields: 10-50 cycles (best preserved)

### How Jolts Work

**The Jolt:**
- Costs **20 kWh** from the battery
- Restores **25-45%** bot battery (random roll)
- **Heat penalty:** -15% effectiveness per heat stack

**Heat System (on Bots):**
- Each jolt adds +1 heat stack to the BOT
- Heat decays at 1 stack per hour
- At 4 heat stacks → **OVERHEATED** (1 hour lockout)
- Heat reduces jolt effectiveness: `final = base × (1 - stacks × 0.15)`

| Heat Stacks | Jolt Effectiveness | Status |
|-------------|-------------------|--------|
| 0 | 100% (25-45% battery) | Cool |
| 1 | 85% (21-38% battery) | Warm |
| 2 | 70% (18-32% battery) | Hot |
| 3 | 55% (14-25% battery) | Very Hot |
| 4+ | BLOCKED | Overheated! |

**Strategy:** Space out jolts for max effectiveness, or jolt rapidly when desperate (accepting reduced returns).

### Battery Health & Cycles

**Health (0-100%):**
- Battery must be at **100% health to operate**
- Each jolt damages health (Scrap Cell loses ~2%, Plasma Vault loses ~0.25%)
- At 0% health → Dead, cannot charge or jolt

**Cycles (Core Wear):**
- Cycles = Total kWh throughput / Battery capacity
- Higher cycles = reduced max capacity AND repair efficiency

| Cycles | Max Capacity | Repair Efficiency |
|--------|--------------|-------------------|
| 0-9 | 100% | 100% (+25% per repair) |
| 10-29 | 90% | 80% (+20% per repair) |
| 30-59 | 75% | 60% (+15% per repair) |
| 60-119 | 50% | 40% (+10% per repair) |
| 120+ | 25% | 20% (+5% per repair) |

### Battery Maintenance

**Repair (Universal Parts):**
- Restores +25% health (modified by cycle wear)
- Does NOT reset cycles
- Cost: 50-1000 parts depending on battery type

**Rebuild (Parts or ICP):**
- Resets cycles to 0
- Restores to 100% health
- Battery is **EMPTY** after rebuild
- Cost: 300-6000 parts OR 2-25 ICP

**Salvage (Destroy):**
- Permanently destroys battery
- Returns Universal Parts (same as repair cost)

### Battery Charging

Batteries charge passively from **surplus grid power** (capacity minus bot draw):

```
Surplus = Grid Capacity - (Bots × 100W)
```

Each battery draws power up to its rate (25-200W). If surplus < total battery draw, power is shared.

**Example:** 750W grid, 3 bots charging (300W draw), 2 Salvage Packs (100W total draw)
- Surplus: 750 - 300 = 450W
- Battery draw: 100W
- Effective: 100W (fully supplied)

---

## Optimal Setup Strategies

### Early Game (1-5 bots)
- **Grid:** Base 500W is sufficient
- **Strategy:** Use ChargingStation freely, don't buy SMRs yet
- **Batteries:** Scavenge to find your first battery

### Mid Game (5-15 bots)
- **Grid:** Buy WR-500 (+500W) for 8 ICP
- **Total:** 1000W = 10 bots at full speed
- **Strategy:** Keep half your fleet racing, half in ChargingStation rotation

### Late Game (15+ bots)
- **Grid:** WR-880 or WR-1210 depending on fleet size
- **Total:** 1380-1710W+ 
- **Strategy:** Max-efficiency charging, multiple batteries for emergency jolts

### Battery Strategy

1. **Save high-tier batteries** - Industrial Banks and Plasma Vaults are precious
2. **Use Scrap Cells freely** - They're common and cheap to maintain
3. **Rebuild before 120 cycles** - Beyond this, batteries are inefficient
4. **Jolt spacing** - Wait for heat to decay for max effectiveness (or spam when desperate)

---

## Quick Reference

### Power Costs
| Item | Cost |
|------|------|
| WR-250 SMR | 5 ICP |
| WR-500 SMR | 8 ICP |
| WR-880 SMR | 12 ICP |
| WR-1210 SMR | 18 ICP |
| Scrap Cell Repair | 50 Universal Parts |
| Salvage Pack Repair | 150 Universal Parts |
| Industrial Bank Repair | 400 Universal Parts |
| Plasma Vault Repair | 1000 Universal Parts |

### Key Formulas
```
Grid Efficiency = min(1.0, Capacity / (Bots × 100W))
Jolt Amount = (25-45) × (1 - HeatStacks × 0.15)
Battery Max Capacity = Base × CycleMultiplier
```

### Pro Tips
- **ChargingStation is FREE** - Always cheaper than 0.1 ICP recharge if you can wait
- **SMRs last forever** - Don't stress about lifetime, it's measured in decades
- **Batteries are bonus** - Found while scavenging, never required
- **Heat decays hourly** - Plan jolts around your racing schedule
- **Keep batteries at 100% health** - They can't operate otherwise
- **Rebuild before high cycles** - 60+ cycles means diminishing returns
