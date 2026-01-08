---
title: Stats & Bot Builds Guide
description: Understanding stats, racing mechanics, and optimal bot builds
order: 10
---

# Stats & Bot Builds - Complete Guide

## THE 4 CORE STATS

Every bot has 4 stats that determine racing performance:

### Speed
**What it does:** Your bot's top speed on flat, clear terrain

**How it works:**
- 70% Universal: Always active baseline speed (√speed × 5.25)
- 30% Conditional: +30% bonus on ideal conditions (flat MetalRoads), +15% on downhills
- **Synergy with Acceleration:** (Speed + Accel) / 200 = 0.80x to 1.0x effectiveness
  - High Speed + Low Accel = Only 80% of speed is usable
  - High Speed + High Accel = Full 100% speed potential

**Distance Scaling:**
- Short sprints (<10km): Slight penalty for high speed (speed matters less)
- Medium races (10-20km): Neutral
- Long treks (>20km): Neutral

**Best for:** Long straightaways, MetalRoads tracks, downhill sections

### Power Core
**What it does:** Endurance and ability to maintain performance under strain

**How it works:**
- 25% Universal: Always active endurance penalty (low Power = slower times)
- **WastelandSand terrain penalty:** DOUBLES the Power penalty if you have low Power
  - Formula: 1.0 + (100-power)/200
  - Example: 20 Power = 1.4x slower time, 100 Power = no extra penalty
- **Steep uphills (>5° angle):** Additional penalty scales with steepness
- **Small uphills:** Small additional time penalty
- **Synergy with Stability:** (Power + Stability) / 200 = 0.85x to 1.0x effectiveness
  - High endurance needs stability to be fully effective

**Distance Scaling:**
- Short sprints: Neutral
- Long treks (>20km): CRITICAL - 0.55x to 1.05x scaling based on Power
  - Low Power = 55% performance on long races
  - High Power = 105% performance on long races

**Scavenging Bonus:** Up to -75% battery drain at 100 Power Core (exponential scaling)

**Best for:** Long races, WastelandSand terrain, uphill sections, marathon efficiency

### Acceleration
**What it does:** Recovery from difficult sections and responsiveness

**How it works:**
- 20% Universal: Always active responsiveness penalty (1.0 + (100-accel)/350)
- **MetalRoads:** +44% penalty on roads (1.0 + (100-accel)/160)
- **Momentum Recovery:** After difficult segments, Accel helps regain speed
  - Formula: momentumLoss × (1 - accel/140)
  - Low Accel = 20% slower after hard corners
  - High Accel = Quick recovery

**Distance Scaling:**
- Short sprints (<10km): CRITICAL - 0.75x to 1.25x scaling based on Accel
  - Low Accel = 75% performance on sprints
  - High Accel = 125% performance on sprints
- Long treks: Neutral

**Scavenging Bonus:** +60% world buff chance at 100 Acceleration

**Best for:** Short races, MetalRoads tracks, technical courses with difficulty changes

### Stability
**What it does:** Handling in technical sections and consistency

**How it works:**
- 17% Universal: Always active consistency penalty (1.0 + (100-stability)/400)
- **ScrapHeaps:** +47% penalty on heaps (1.0 + (100-stability)/150)
- **High Difficulty Segments:** Scales with difficulty multiplier
  - Formula: difficulty × (1.0 + (100-stability)/300 × techLevel)
  - 1.2 difficulty segment = 20% harder if low Stability

**Distance Scaling:**
- Short sprints: Neutral
- Long treks (>20km): CRITICAL - 0.65x to 1.05x scaling based on Stability
  - Low Stability = 65% performance on long races
  - High Stability = 105% performance on long races

**Scavenging Bonus:** Up to -75% condition loss at 100 Stability (exponential scaling)

**Best for:** ScrapHeaps terrain, technical tracks, high-difficulty segments, long races

## TERRAIN TYPES

### ScrapHeaps
- Rewards high **Stability** (+47% penalty if low)
- Technical terrain with obstacles
- Average race times (~1.3x multiplier)

### WastelandSand  
- Rewards high **Power Core** (+50% penalty if low)
- Endurance-focused terrain
- Slower race times (~1.2x multiplier)

### MetalRoads
- Rewards high **Acceleration** (+44% penalty if low)
- Also rewards **Speed** (flat roads = +30% Speed bonus)
- Fastest race times (1.0x multiplier)
- Ideal conditions for pure speed builds

## DISTANCE CATEGORIES

### Short Sprints (<10km)
- **Acceleration** gets 0.75x to 1.25x scaling (CRITICAL)
- **Speed** gets slight penalty (matters less)
- Fast, explosive races
- Best for: High-Accel builds

### Medium Races (10-20km)
- Balanced stat usage
- No special distance scaling
- Best for: Well-rounded builds

### Long Treks (>20km)
- **Power Core** gets 0.55x to 1.05x scaling (CRITICAL)
- **Stability** gets 0.65x to 1.05x scaling (CRITICAL)
- Endurance marathon races
- Best for: High-Power, High-Stability builds

## STAT SYNERGIES

**Speed ↔ Acceleration:** 
- Speed effectiveness = 0.80x to 1.0x based on (Speed+Accel)/200
- High Speed without Accel = wasted potential

**Power Core ↔ Stability:**
- Effectiveness = 0.85x to 1.0x based on (Power+Stability)/200
- Endurance needs consistency to shine

## RANDOMNESS & VARIANCE

- **Per-Segment RNG:** ±10% time variation per segment
- **Per-Segment Conditions:** ±6% performance variation (driver errors, debris, wind)
- Races are deterministic (same seed = same result) but feel dynamic

## 6 EXAMPLE BOT BUILDS

### 1. MetalRoads Speed Demon
**Stats:** Speed 90 | Power 40 | Accel 80 | Stability 40  
**Rating:** 62.5  
**Best For:** MetalRoads short-medium sprints  
**Why:** Max Speed + high Accel synergy, dominates flat roads with +30% Speed bonus  
**Weaknesses:** Struggles on ScrapHeaps/WastelandSand, poor on long treks  
**Upgrade Path:** Speed → 100, Accel → 90 (maintain synergy)

### 2. Long-Distance Wasteland Survivor  
**Stats:** Speed 50 | Power 95 | Accel 50 | Stability 95  
**Rating:** 72.5  
**Best For:** WastelandSand/ScrapHeaps long treks (>20km)  
**Why:** Maxed endurance stats = 105% performance on long races, -75% scavenging costs  
**Weaknesses:** Slow on short sprints, mediocre on MetalRoads  
**Upgrade Path:** Power → 100, Stability → 100 (maximize distance scaling)

### 3. Sprint Specialist
**Stats:** Speed 70 | Power 40 | Accel 100 | Stability 50  
**Rating:** 65  
**Best For:** Short sprints (<10km) on any terrain  
**Why:** 100 Accel = 125% performance on sprints, quick recovery from corners  
**Weaknesses:** Can't sustain long races, average on technical tracks  
**Upgrade Path:** Accel → 100 first, then Speed (synergy boost)

### 4. ScrapHeaps Technical Racer
**Stats:** Speed 60 | Power 60 | Accel 70 | Stability 90  
**Rating:** 70  
**Best For:** ScrapHeaps technical courses  
**Why:** High Stability negates +47% ScrapHeaps penalty, handles difficulty multipliers  
**Weaknesses:** Not specialized for any other terrain  
**Upgrade Path:** Stability → 100, then balanced Speed/Accel

### 5. Balanced All-Rounder
**Stats:** Speed 70 | Power 70 | Accel 70 | Stability 70  
**Rating:** 70  
**Best For:** Any race type, consistent performance  
**Why:** No major weaknesses, good synergies, adapts to all conditions  
**Weaknesses:** Never dominates, always competitive but rarely wins specialist races  
**Upgrade Path:** Identify which races you enter most, specialize toward that

### 6. Faction-Optimized Scavenger (Balanced Factions)
**Stats:** Speed 60 | Power 80 | Accel 60 | Stability 80  
**Rating:** 70  
**Best For:** Scavenging DeadMachineFields, occasional long races  
**Why:** High Power/Stability = -50%+ battery/condition costs, survives dangerous zones  
**Faction Bonus:** Dead/Master/Murder/Food get +15% Universal Parts while scavenging  
**Upgrade Path:** Power → 90, Stability → 90 (maximize scavenging efficiency)

## EARLY/MID/LATE GAME STRATEGY

### Early Game (Rating 30-50)
- **Focus:** Pick ONE stat to specialize (cheap upgrades, 85% success)
- **Goal:** Find your niche (sprints vs treks, terrain preference)
- **Avoid:** Spreading points too thin (no competitive advantage)
- **Example:** Start with 40/40/40/40 → 70/40/40/40 (Speed specialist)

### Mid Game (Rating 50-70)
- **Focus:** Add secondary stat to create synergy
- **Goal:** 70+ in 2 complementary stats (Speed+Accel or Power+Stability)
- **Avoid:** Upgrading past +10 on single stat (gets expensive/risky)
- **Example:** 70/40/40/40 → 70/40/70/40 (Speed+Accel synergy)

### Late Game (Rating 70-90)
- **Focus:** Push specialized stats to 90-100 (soft cap at +15 per stat)
- **Goal:** Dominate specific race types (short sprints OR long treks)
- **Accept:** 1-15% success rates, high ICP costs (4+ ICP per upgrade)
- **Example:** 70/40/70/40 → 95/40/95/40 (Sprint god)

## COMMON MISTAKES

❌ **High Speed + Low Accel:** Only using 80% of your speed (synergy penalty)  
✅ **Fix:** Always keep Speed and Accel within ~20 points of each other

❌ **Balanced 50/50/50/50:** Jack of all trades, master of none (loses to specialists)  
✅ **Fix:** Pick 2 stats to focus, accept weaknesses in others

❌ **Upgrading past +15 early:** 1% success, 4+ ICP per upgrade (terrible value)  
✅ **Fix:** Stop at +10-12 per stat, spread to other stats instead

❌ **Ignoring terrain:** Racing WastelandSand with low Power Core  
✅ **Fix:** Check race terrain before entering, play to your strengths

❌ **Sprint build in long races:** Low Power/Stability = 55-65% performance on 20km+ races  
✅ **Fix:** Know your bot's optimal race distance category

## QUICK REFERENCE

**MetalRoads → Speed + Accel**  
**WastelandSand → Power Core**  
**ScrapHeaps → Stability**  

**Short Sprints (<10km) → Accel (125% scaling)**  
**Medium Races (10-20km) → Balanced**  
**Long Treks (>20km) → Power + Stability (105% scaling each)**

**Synergies:**
- Speed needs Accel (keep within ~20 points)
- Power needs Stability (keep within ~20 points)

**Upgrade Costs:**
- Rating 20-40 bots: 0.43-0.84 ICP per upgrade
- Rating 40-60 bots: 0.84-1.78 ICP per upgrade  
- Rating 60-80 bots: 1.78-4.20 ICP per upgrade

**Success Rates:**
- 0-5 upgrades per stat: 85-57% (great value)
- 5-10 upgrades: 57-29% (good value)
- 10-15 upgrades: 29-1% (specialist territory)
- 15+ upgrades: 1% (soft cap, very expensive)
