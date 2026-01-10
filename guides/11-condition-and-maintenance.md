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
**5.0 condition per km** × Terrain Modifier × Stability Protection

### Example Damage (10km Race)
- **Base damage:** 50 condition
- **Low stability (20):** 50 × 0.85 = 42 condition
- **High stability (80):** 50 × 0.74 = 37 condition  
- **Max stability (100):** 50 × 0.70 = 35 condition

### Terrain Modifiers
- **Easy terrain (0.8×):** Reduces damage by 20%
- **Normal terrain (1.0×):** Standard damage
- **Harsh terrain (1.2×):** Increases damage by 20%

### Worst/Best Case (17km Race)
- **Worst case:** 17km × 5.0 × 1.2 (harsh) × 0.85 (low stability) = **87 condition**
- **Best case:** 17km × 5.0 × 0.8 (easy) × 0.70 (max stability) = **48 condition**

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
- **Cost:** 0.05 ICP + transfer fee
- **Restoration:** 30 condition
- **Cooldown:** 3 hours

### The Deficit Math
- 10km race costs: ~35-50 condition (depending on stability/terrain)
- Repair restores: 30 condition
- **Net deficit:** -5 to -20 condition per race cycle

**Result:** You'll slowly bleed condition racing continuously, even with regular repairs.

## CONDITION PERFORMANCE PENALTIES

Low condition reduces your bot's effectiveness:

- **100% condition:** Full stats
- **50% condition:** -25% stats (0.75× multiplier)
- **0% condition:** -90% stats (0.10× multiplier) - CRITICAL

**Also increases battery drain:**
- 100 condition: No penalty
- 50 condition: +25% battery drain
- 0 condition: +50% battery drain

## STRATEGIC REST PERIODS

### When to Skip Races
1. **Condition below 70%** - Stats penalties hurt competitiveness
2. **Back-to-back 17km Elite races** - Too much damage even with repair
3. **Low-value races** - Not worth the condition wear if prize is small

### Recovery Options
1. **ScavengingBay** - Slow free repair while earning parts
2. **RepairBay** - Faster free repair but no parts (best for urgent recovery)
3. **Paid repair** - Instant but only restores 30, use strategically

## SCAVENGING CONDITION DAMAGE

### Base Rate
**22 condition per hour** × Zone Modifier × Faction Bonuses × Stability Protection

### Zone Modifiers
- **SafeZone:** 1.0× (base 22/hr)
- **Moderate zones:** 1.3-1.5× (29-33/hr)
- **Dangerous zones:** 2.0-3.0× (44-66/hr)

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
3. Do overnight SafeZone scavenging for slow natural recovery
4. Only pay for repair when critical races require full stats

### Power Racing (Whale Strategy)
1. Race everything
2. Paid repair after every race
3. Accept -20 condition deficit per cycle
4. Rotate multiple bots to avoid condition bottleneck
5. Use RepairBay during work/sleep to recover deficit

## CONDITION VS BATTERY

Both resources drain, but manage differently:

| Resource | Racing Drain | Scavenging Drain | Free Recovery | Paid Recovery |
|----------|--------------|------------------|---------------|---------------|
| **Battery** | 10-25/race | 4-20/hr | ChargingStation (very slow) | 0.1 ICP (50-90 restore) |
| **Condition** | 35-90/race | 22-66/hr | RepairBay/ScavengingBay (moderate) | 0.05 ICP (30 restore) |

**Battery** is the immediate constraint (races require 50+ battery).  
**Condition** is the long-term durability constraint (slowly bleeds down).

## PERFECT TUNE-UP BONUS

If repair brings bot to exactly 100% condition while overcharge is active:
- **Bonus:** Keep overcharge speed boost WITHOUT stability/power penalties
- **Requirements:** condition + 30 must equal exactly 100, overcharge > 0%
- **Strategy:** Time repairs to hit 70% condition after recharge for max efficiency

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
✅ **Free zones work** - RepairBay/ScavengingBay are viable alternatives to paid repair  
✅ **Deficit is intentional** - Forces strategic decisions about when to race vs rest  
✅ **Rotate smartly** - Multiple bots prevent condition bottleneck

❌ **Don't ignore condition** - Sub-70% bots perform significantly worse  
❌ **Don't spam races** - Eventual decay will catch up, plan ahead  
❌ **Don't waste repairs** - 30 condition restoration won't keep up with heavy racing
