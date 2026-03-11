---
title: Condition Damage & Maintenance
description: Understanding durability mechanics and when to repair
order: 11
---

# Condition Damage & Maintenance Strategy

## THE CONDITION DEFICIT PROBLEM

After recent balance changes, **you cannot maintain 100% condition racing continuously**. Strategic rest and repair timing is essential.

## RACING CONDITION DAMAGE

### Base Formula
**2.5 condition per km** × Terrain Modifier × Stability Protection

### Example Damage (10km Race)
- **Base damage:** 25 condition
- **Low stability (20):** 25 × 0.85 = 21 condition
- **High stability (80):** 25 × 0.74 = 19 condition  
- **Max stability (100):** 25 × 0.70 = 18 condition

### Terrain Modifiers
- **Easy terrain (0.8×):** Reduces damage by 20%
- **Normal terrain (1.0×):** Standard damage
- **Harsh terrain (1.2×):** Increases damage by 20%

### Worst/Best Case (17km Race)
- **Worst case:** 17km × 2.5 × 1.2 (harsh) × 0.85 (low stability) = **43 condition**
- **Best case:** 17km × 2.5 × 0.8 (easy) × 0.70 (max stability) = **24 condition**

## STABILITY'S PROTECTIVE EFFECT

**Higher stability = less condition wear**

Stability uses logarithmic scaling (same formula as Power Core efficiency):
- Stability 1: 100% wear (no protection)
- Stability 20: 85% wear (15% reduction)
- Stability 40: 79% wear (21% reduction)
- Stability 60: 75% wear (25% reduction)
- Stability 80: 74% wear (26% reduction)
- Stability 100: 70% wear (30% max reduction)

**Key insight:** Stability provides meaningful durability, but even maxed bots take substantial damage.

## REPAIR MECHANICS

### Paid Repair
- **Cost:** 0.05 ICP + transfer fee (reduced by Industrial faction synergy, min 0.01 ICP)
- **Restoration:** 30 condition (capped at 100)
- **Cooldown:** 1 hour base (reduced by Dedication tier: T2=0.90×, T3=0.80×, T4=0.70×, T5=0.60×)

### The Deficit Math
- 10km race costs: ~18-25 condition (depending on stability/terrain)
- Repair restores: 30 condition
- **Net result:** Slight surplus per race cycle with repairs

**Result:** You'll slowly bleed condition racing continuously, even with regular repairs.

## CONDITION PERFORMANCE PENALTIES

Low condition reduces your bot's **Power Core & Stability** effectiveness:

| Condition | Multiplier | Stat Reduction |
|-----------|------------|----------------|
| 90-100% | 1.0× | Full stats |
| 70-89% | 0.80-1.0× | Up to -20% |
| 50-69% | 0.60-0.80× | Up to -40% |
| 25-49% | 0.30-0.60× | Up to -70% |
| 0-24% | 0.10-0.30× | Up to -90% (CRITICAL) |

**Also increases battery drain:**
- 100 condition: No penalty
- 50 condition: +25% battery drain
- 0 condition: +50% battery drain

## STRATEGIC REST PERIODS

### When to Skip Races
1. **Condition below 70%** - Penalties start at 70%, getting worse rapidly below 50%
2. **Back-to-back long races** - Too much damage even with repair
3. **Low-value races** - Not worth the condition wear if prize is small

### Recovery Options
1. **RepairBay** - Free repair, rate depends on your bay tier (12-240 condition/hr)
2. **Paid repair** - Instant 30 condition but only restores a fixed amount, use strategically
3. **ScrapHeaps** - Slow scavenging earns parts but condition still drains

## SCAVENGING CONDITION DAMAGE

### Base Rate
**12 condition per hour** × Zone Modifier × Faction Bonuses × Stability Protection

### Zone Modifiers
- **ScrapHeaps:** 1.0× (base 12/hr)
- **AbandonedSettlements:** 2.0× (24/hr)
- **DeadMachineFields:** 3.5× (42/hr)

### Duration Bonus
Longer missions have better efficiency:
- 0-4 hours: 1.0× (no bonus)
- 4-8 hours: 0.91× (-9% condition drain)
- 8-12 hours: 0.83× (-17% condition drain)
- 12+ hours: 0.77× (-23% condition drain)

**Overnight missions are significantly more efficient for condition preservation.**

## OPTIMAL MAINTENANCE STRATEGY

### High-Value Racing Schedule
1. Race when prizes justify the damage
2. Repair after 2-3 races (when condition drops to ~50%)
3. Use RepairBay during long gaps between events
4. Accept some condition loss - you'll recover naturally

### Budget-Conscious Approach
1. Race only highest-value events
2. Maximize free repair zones (RepairBay/ChargingStation)
3. Do overnight ScrapHeaps scavenging for slow natural recovery
4. Only pay for repair when critical races require full stats

### Power Racing (Whale Strategy)
1. Race everything
2. Paid repair after every race
3. Manage battery more frequently than condition
4. Rotate multiple bots to spread battery usage
5. Use RepairBay during work/sleep to recover condition

## CONDITION VS BATTERY

Both resources drain, but **battery drains faster**:

| Resource | Racing Drain | Scavenging Drain | Free Recovery | Paid Recovery |
|----------|--------------|------------------|---------------|---------------|
| **Battery** | 16-80/race | 30-105/hr | ChargingStation (rate varies by grid efficiency) | 0.1 ICP (50-90 restore, 2hr cooldown) |
| **Condition** | 10-50/race | 12-42/hr | RepairBay (12-240/hr based on bay tier) | 0.05 ICP (30 restore, 1hr cooldown) |

**Battery** is the immediate constraint (races require sufficient battery, drains faster).  
**Condition** is the long-term durability constraint (drains slower, easier to maintain).
**RepairBay** is now FREE and FAST - no battery drain, ~24-36 condition restored per hour!

## PERFECT TUNE-UP BONUS

Repair while overcharged AND within your bot's resonance window to achieve Perfect Tune-Up:

- **Bonus:** Keep overcharge Speed/Accel boost WITHOUT the Stability/PowerCore penalties!
- **Requirements:** Have active overcharge AND repair within resonance zone
- **Peak Resonance (±2% of optimal condition):** 100% of penalties removed
- **Good Resonance (±12% of optimal):** 70% of penalties removed
- **Weak Resonance (fallback at ~70% condition):** 30% of penalties removed
- **Outside Resonance:** Overcharge preserved but penalties still apply in next race

**Strategy:** Each bot has unique resonance points that drift over time - experiment to find your bot's sweet spots!

## ROTATION MANAGEMENT

With 5+ bots, stagger maintenance:
1. Bot A races → repair → race → repair (slowly bleeding)
2. Bot B races while Bot A in RepairBay
3. Bot C scavenging for parts
4. Bots D/E recovering in free zones

**Never let all bots drop below 70% simultaneously.**

## KEY TAKEAWAYS

✅ **Stability matters** - Invest in durable bots for long-term sustainability  
✅ **Plan rest periods** - Can't race 24/7 without condition decay  
✅ **Free zones work** - RepairBay/ScrapHeaps are viable alternatives to paid repair  
✅ **Deficit is intentional** - Forces strategic decisions about when to race vs rest  
✅ **Rotate smartly** - Multiple bots prevent condition bottleneck

❌ **Don't ignore condition** - Sub-70% bots perform significantly worse  
❌ **Don't spam races** - Eventual decay will catch up, plan ahead  
❌ **Don't waste repairs** - 30 condition restoration won't keep up with heavy racing
