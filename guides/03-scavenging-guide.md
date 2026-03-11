---
title: Scavenging Guide
description: Earn free upgrade parts through wasteland missions
order: 3
---

# Scavenging - Complete Guide

## What Is It?

Send your bots into the wasteland to gather upgrade parts. **No ICP cost** - only battery and condition consumption. You can register to race while scavenging - your bot will be pulled from the mission when the race starts (with penalties applied).

## 2 Mission Modes

### Continuous Mode (Default - No duration specified)
- Accumulates rewards proportionally to time spent (calculated hourly)
- Retrieve bot anytime from the UI
- Most flexible - run as long as you want
- **WARNING:** Bot dies if battery OR condition reaches 0 → **lose ALL pending rewards!**

### Timed Mode (Specify duration_minutes)
- Set specific duration: 15, 30, or 60 minutes
- Bot auto-returns when time expires with rewards
- Good for planning - set it and forget it
- **WARNING:** If bot dies before timer ends → **lose ALL pending rewards!**

## 5 Zones (Choose Your Strategy)

### Scavenging Zones (Earn Parts + World Buff Chance)

**ScrapHeaps - Safe & Balanced**
- 1.0x parts, 1.0x battery drain, 1.0x condition wear
- **40% Universal Parts**, 60% specialized (15% each type)
- ~15 parts/hour, ~30 battery/hour, ~12 condition/hour
- Best for: New bots, low-risk farming, safest option

**AbandonedSettlements - Moderate Risk/Reward**
- 1.6x parts, 2.0x battery drain, 2.0x condition wear
- **40% Universal Parts**, 60% specialized (15% each type)
- ~24 parts/hour, ~60 battery/hour, ~24 condition/hour
- Best for: More parts than ScrapHeaps, manageable costs

**DeadMachineFields - High Risk/Reward**
- 2.5x parts, 3.5x battery drain, 3.5x condition wear
- **40% Universal Parts**, 60% specialized (15% each type)
- ~37.5 parts/hour, ~105 battery/hour, ~42 condition/hour
- Best for: High stats bots, maximum parts (but highest costs)

### Maintenance Zones (Free Repairs - No Parts)

**RepairBay - Free Condition Restore**
- 0x parts, **NO battery drain**, **RESTORES condition** based on your Repair Bay tier
- Base rate: 12 condition/hour (Tier 1 "Salvage Arm"), upgradeable to 240/hr (Tier 16 "Foundry Core")
- Rate modified by power grid efficiency
- Bypasses repair cooldown and 0.05 ICP cost
- **Completely FREE** - no battery cost!
- Best for: Free repairs, damaged bots under 50% condition, any bot needing condition

**ChargingStation - Free Battery Restore**
- 0x parts, **RESTORES battery** (stepped charging curve - slower at low battery)
- **NO condition penalty** - completely free!
- Bypasses recharge cooldown and 0.1 ICP cost
- **Charging speeds (at 100% grid efficiency):** 1x at <25% → 2x at <50% → 3x at <75% → 4x at 75-100%
- Base rate: ~3 battery/hr before tier multiplier, up to ~12/hr at fastest tier
- Rate scales with power grid efficiency (more bots charging = less power per bot)
- **✅ Safe zone for reviving dead bots!** No battery depletion penalty
- Best for: Patient players, saving ICP, low-priority bots, dead bots

**💡 Pro Tip: Overcharge Strategy**
- Use **scavenging zones** (ScrapHeaps/AbandonedSettlements) to spend battery while farming parts
- Overcharge formula: (100 - battery) × 0.4 × efficiency (capped at 40%)
- Lower battery at recharge = bigger overcharge potential (10% battery → ~36% overcharge avg)
- Efficiency varies by condition + RNG: ~0.4 + condition/200 + randomVariance(±0.25)
- Overcharge bonus: +0.25% Speed/Accel per 1% overcharge (max +10% at 40%)
- Strategy: Drop battery low scavenging, then recharge for big one-time race boost!

## Part Types & Distribution

**5 Part Types:**
- **Universal Parts** - Use for ANY upgrade (most valuable!)
- **Speed Chips** - Speed upgrades only
- **Power Core Fragments** - Power Core upgrades only
- **Thruster Kits** - Acceleration upgrades only
- **Gyro Modules** - Stability upgrades only

**Part Exchange:**
- **Convert** specialized parts to other specialized types at **25% cost**
  - Example: 100 Speed Chips → 75 Thruster Kits
- **Combine** 1 of each specialized type to create Universal Parts
  - Formula: 1 SPD + 1 PWR + 1 ACC + 1 STB = 1 Universal
  - No loss! Just need equal amounts of all 4 types.
- Universal Parts are always better (no conversion loss when using them!)

**Zone Strategy:**
- All zones have the same 40% Universal / 60% Specialized split
- Harder zones = MORE total parts (1.6x → 2.5x) but higher battery/condition costs
- Universal Parts let you upgrade any stat without conversion penalty

## Faction Bonuses (Specialization System)

Each faction has unique scavenging modifiers:

**Faction Scavenging Bonuses:**
- **UltimateMaster:** 1.20× parts, 0.70× battery drain
- **Dead:** 1.40× parts in DeadMachineFields (1.10× elsewhere), 0.50× condition loss
- **Master:** 1.12× parts, 0.75× battery drain
- **Food:** 1.12× parts in ScrapHeaps/Settlements, 0.80× battery drain
- **Ultimate:** 1.15× parts
- **Wild:** 0.60× condition loss
- **Murder:** 1.15× parts in DeadMachineFields, 1.20× condition damage
- **Blackhole:** 1.10× parts, 1.10× condition damage
- **Bee:** 1.08× parts in AbandonedSettlements
- **Industrial:** 1.05× parts, 0.90× battery drain
- **Box:** 1.05× parts

**Completion Bonuses (RNG-based):**
- **Golden:** 15% chance to **double** all parts on mission completion
- **Box:** 5% chance to **triple** all parts on mission completion
- **Master:** Every 10th mission **doubles** parts
- **Game:** Every 5th mission grants **+10 universal parts**

## World Buffs (Bonus Stats)

**How It Works:**
- ~8% chance per hour spent scavenging (scales with time in mission)
- Up to ~12.8% per hour with 100 Acceleration stat (+60% boost)
- Chance capped at 90% maximum
- Grants bonus stat points for your next race (consumed after one race)
- Expires in 48 hours if unused

**Buff Strength (scales with total mission hours):**
- 0-3 hours: +2 Speed
- 4-8 hours: +3 Speed, +2 Acceleration
- 9+ hours: +4 Speed, +3 Acceleration, +2 Power Core
- **Blackhole faction bonus:** +3 to Speed and Acceleration on top of regular buff

**Important:**
- ONLY available in scavenging zones (ScrapHeaps, AbandonedSettlements, DeadMachineFields)
- NOT available in maintenance zones (RepairBay, ChargingStation)
- Earned during accumulation (not on completion to prevent spam)

## Stat Bonuses (Make Stats Matter!)

**Speed:** +10% parts yield at 100 Speed
**Power Core:** Up to -75% battery drain at 100 Power Core (exponential scaling)
**Stability:** Up to -75% condition loss at 100 Stability (exponential scaling)
**Acceleration:** +60% world buff chance at 100 Acceleration

## Pro Tips

- **Start with ScrapHeaps** - Safe way to learn mechanics with lowest battery/condition costs
- **High Power Core = efficiency** - Much less battery drain (exponential benefit)
- **High Stability = durability** - Survive dangerous zones longer
- **Monitor your bot!** - Check condition/battery regularly to avoid death
- **Use RepairBay** - Free alternative to 0.05 ICP repairs (slow but FREE)
- **Use ChargingStation** - Free alternative to 0.1 ICP recharge (~10-15h for full charge from 0%, no condition penalty!)
- **Faction matters** - Dead/Master/Murder = best for Universal Parts
- **Racing while scavenging** - Bot pulled when race starts, partial rewards + penalties applied

## Death Warning ⚠️

If your bot reaches **0 battery OR 0 condition** during scavenging:
- Mission ends immediately
- **ALL pending parts are LOST**
- Bot returns with 0 rewards

**Battery Depletion Penalty:** If battery hits 0 in a non-maintenance zone, your bot takes **10 condition damage per hour** on top of normal condition loss. Maintenance zones (RepairBay/ChargingStation) are exempt.

**Always leave a safety buffer!** Don't push your bot to the limit.
