---
title: Luck System Guide
description: Understanding luck, daily phenomena, and breakthrough moments in races
order: 14
---

# Luck System - Complete Guide

## OVERVIEW

Luck is the 5th stat in PokedBots Racing. It creates exciting breakthrough moments during races without breaking fundamental balance. Think of it like critical hits in an RPG - high luck increases your *ceiling*, not just adds randomness.

**Core Principles:**
- Stats still matter - better bots still win most races
- Luck enables breakthrough performances, not random swings
- Underdogs get extra luck chances (comeback mechanic)
- Daily cosmic events favor different bots each day

## THE LUCK STAT

### How Luck is Determined

**Base Luck:** Derived from your bot's token index:
```
baseLuck = (tokenIndex % 100) / 2 + 10
Range: 10-60 (before upgrades)
```

**Upgrade Luck:** Like other stats, luck can be upgraded to 100+ using Universal Parts.

### What Luck Does

Luck affects racing in three ways:

1. **Reduces Segment Variance** - High luck shifts your performance center favorably
   - 10 luck: Center at 103% time (3% slower average)
   - 50 luck: Center at 100% time (neutral)
   - 100 luck: Center at 94% time (6% faster average)

2. **Triggers Luck Procs** - Breakthrough moments during races
   - Base chance: luck / 250 (6% at 14 luck, 24% at 60 luck)
   - No floor - low luck bots rarely proc, high luck bots proc often
   - Underdog bonus: +50% chance if in bottom half of racers
   - Daily affinity adds up to +40% more
   - Capped at 60% per segment

3. **Reduces Bad Luck Incidents** - Fewer mishaps with higher luck
   - Formula: 6% / (1 + (luck - 10) / 30)
   - 10 luck: 6% incident chance per segment
   - 40 luck: 3% incident chance
   - 100 luck: 1.5% incident chance

## LUCK PROCS (CRITICAL HITS)

During races, each segment has a chance to trigger a luck proc - a breakthrough moment that boosts your speed.

### Proc Types

| Type | Boost | Duration | Effect |
|------|-------|----------|--------|
| **Minor** | +15% speed | 1 segment | Small burst |
| **Major** | +25% speed | 3 segments | Significant advantage |
| **Legendary** | +40% speed | 5 segments | Race-changing moment |

### Proc Type Distribution (Spectrum)

Higher luckTier shifts your probability toward better procs - but even low luck bots can occasionally hit a Legendary!

| LuckTier | Legendary | Major | Minor |
|----------|-----------|-------|-------|
| 20 | 5% | 16% | 79% |
| 40 | 9% | 23% | 68% |
| 60 | 13% | 30% | 57% |
| 80 | 17% | 36% | 47% |

**Formula:**
- Legendary: 1% + luckTier/5
- Major: 10% + luckTier/3
- Minor: remainder

### Proc Descriptions

**Minor Procs:**
- "Lucky dodge saves time!"
- "Catches tailwind!"
- "Smooth patch ahead!"
- "Debris clears perfectly!"

**Major Procs:**
- "Discovers hidden shortcut!"
- "Catches massive tailwind!"
- "Perfect line through debris!"
- "Engine surge! Extra power!"

**Legendary Procs:**
- "FLOW STATE ACTIVATED! Bot transcends physics!"
- "LEGENDARY SHORTCUT! Bot warps through space!"
- "COSMIC BLESSING! Bot channels wasteland energy!"
- "UNSTOPPABLE! Bot enters god mode!"

### Underdog Bonus

Bots in lower positions get bonus luck chances:

| Position | Luck Multiplier |
|----------|----------------|
| 1st-3rd | 1.0x (no bonus) |
| 4th-6th | 1.2x |
| 7th-9th | 1.4x |
| 10th-12th | 1.5x |

This gives trailing bots a better chance at comebacks without guaranteeing victory.

### Expected Procs Per Race

How often will your bot proc in a typical 10-segment race?

| Luck | Affinity | Proc Chance | Expected Procs |
|------|----------|-------------|----------------|
| 14 | 0 | ~6% | 0-1 procs |
| 14 | 40 | ~22% | 2 procs |
| 40 | 0 | ~16% | 1-2 procs |
| 40 | 40 | ~32% | 3 procs |
| 60 | 0 | ~24% | 2-3 procs |
| 60 | 60 | ~48% | 4-5 procs |
| 80 | 80 | ~60% (cap) | 6 procs |

**Key takeaways:**
- Low luck bots (14) barely proc without affinity - maybe 0-1 per race
- High luck bots (60+) proc 2-3x more often AND get better proc types
- Affinity is the great equalizer - a low luck bot on a good day can compete

## BAD LUCK INCIDENTS

Low-luck bots have a higher chance of mishaps:

| Severity | Time Penalty | % of Incidents |
|----------|-------------|----------------|
| **Minor** | +20% time | 60% |
| **Medium** | +35% time | 30% |
| **Severe** | +50% time | 10% |

**Incident Examples:**
- "Bot hit debris - loses momentum!"
- "Engine sputter - needs to recover!"
- "Navigation error - off the line!"

**Protection:** Higher luck dramatically reduces incident chance. At 100 luck, incidents are rare (1.5%).

## DAILY PHENOMENA (WASTELAND ASTROLOGY)

Each day features a different cosmic phenomenon that gives bonuses to bots with matching "affinities." The cycle repeats every 13 days.

### The 13-Day Cycle

| Day | Phenomenon | Emoji | Who Benefits |
|-----|-----------|-------|--------------|
| 0 | **Solar Flare** | ☀️ | Power Core % 10 = 7/3/9, Even tokens |
| 1 | **Rust Storm** | 🌪️ | Stability % 10 = 2/8, token % 13 = 2 |
| 2 | **Metal Resonance** | 🎸 | Speed % 10 = 3/1/7, Prime tokens |
| 3 | **Gravity Flux** | 🌊 | Accel % 10 = 4/0/8, token % 4 = 0 |
| 4 | **Scrap Tornado** | 🌀 | Wild faction, token % 100 < 20 |
| 5 | **Dead Zone** | 💀 | Dead faction, token contains 6/13/66 |
| 6 | **Golden Hour** | ✨ | Golden faction, token % 7 = 0 |
| 7 | **Machine Ghost** | 👻 | Master/Ultimate factions, token > 5000 |
| 8 | **Blood Moon** | 🔴 | Murder faction, token % 9 = 0 |
| 9 | **Binary Surge** | 💻 | Balanced stats (spread ≤ 10) |
| 10 | **Chaos Pulse** | ⚡ | Token % 11 = 0, high luck stat |
| 11 | **Momentum Shift** | 🔄 | Bracket underdogs (avg % 10 ≤ 4) |
| 12 | **Singularity** | 🌌 | Blackhole faction, token % 13 = 0 |

### Understanding Affinity

Each bot gets an affinity score (0-100) for the current day based on:

**Stat Patterns (modulo):**
- The last digit of your stat matters, not the magnitude
- A Scrap bot with Power 17 and an Elite bot with Power 47 BOTH get +60 on Solar Flare (digit = 7)

**Token Patterns:**
- Your token index (e.g., #4829) is checked against various patterns
- Prime numbers, divisibility, digit patterns

**Faction Bonuses:**
- Your faction gets a big bonus on their special day
- Rare factions get bigger bonuses (Wild +70, Golden +65, Dead +60)

### Affinity Tiers

| Affinity | Stars | Bonus |
|----------|-------|-------|
| 0-39 | - | No bonus |
| 40-59 | ⭐ | +8% luck proc chance |
| 60-79 | ⭐⭐ | +12% luck proc chance |
| 80-100 | ⭐⭐⭐ | +16% luck proc chance (COSMIC ALIGNMENT!) |

### Daily Phenomenon Details

#### Day 0: Solar Flare ☀️
*"Electromagnetic chaos energizes power cores"*

**Stat Bonus:**
- Power Core % 10 = 7 → +60 (jackpot!)
- Power Core % 10 = 3 or 9 → +40
- Power Core % 10 = 0 or 5 → +25

**Token Bonus:**
- Even token index → +30 (50% of bots)

#### Day 1: Rust Storm 🌪️
*"Debris field favors stable navigation"*

**Stat Bonus:**
- Stability % 10 = 2 or 8 → +60
- Stability % 10 = 4 or 6 → +40
- Stability % 10 = 0 → +25

**Token Bonus:**
- Token % 13 = 2 → +40 (7.7% of bots)

#### Day 2: Metal Resonance 🎸
*"Ancient roads sing with speed"*

**Stat Bonus:**
- Speed % 10 = 3 → +60
- Speed % 10 = 1 or 7 → +40
- Speed % 10 = 9 → +25

**Token Bonus:**
- Prime number token → +45 (~12% of bots)

#### Day 3: Gravity Flux 🌊
*"Acceleration bursts from warped space"*

**Stat Bonus:**
- Acceleration % 10 = 4 → +60
- Acceleration % 10 = 0 or 8 → +40
- Acceleration % 10 = 2 or 6 → +25

**Token Bonus:**
- Token % 4 = 0 → +35 (25% of bots)

#### Day 4: Scrap Tornado 🌀
*"Chaos favors the lucky and wild"*

**Faction Bonus:**
- Wild faction → +70 (only 5 bots!)

**Token Bonus:**
- Token % 100 < 20 → +40 (20% of bots)

#### Day 5: Dead Zone 💀
*"Stillness empowers the Dead faction"*

**Faction Bonus:**
- Dead faction → +60 (3.82% of bots)

**Token Bonus:**
- Token contains "6", "13", or "66" → +45 (~37% of bots)

#### Day 6: Golden Hour ✨
*"Wasteland shimmers, luck shines bright"*

**Faction Bonus:**
- Golden faction → +65 (only 27 bots!)

**Token Bonus:**
- Token % 7 = 0 → +40 (14.3% of bots)

#### Day 7: Machine Ghost 👻
*"Ancient spirits guide machines"*

**Faction Bonus:**
- Master, Ultimate, or UltimateMaster faction → +55 (6.86% of bots)

**Token Bonus:**
- Token > 5000 → +40 (50% of bots)

#### Day 8: Blood Moon 🔴
*"Murder and aggression reign"*

**Faction Bonus:**
- Murder faction → +50 (9.99% of bots)

**Token Bonus:**
- Token % 9 = 0 → +40 (11.1% of bots)

#### Day 9: Binary Surge 💻
*"Digital perfection favors balance"*

**Stat Balance Bonus:**
- All 4 stats within 5 of each other → +70 (rare!)
- All 4 stats within 10 of each other → +45
- All 4 stats within 15 of each other → +25

*No token or faction bonus - pure stat balance day*

#### Day 10: Chaos Pulse ⚡
*"Pure randomness, pure luck"*

**Token Bonus:**
- Token % 11 = 0 → +70 (9.1% of bots)

**Luck Stat Bonus:**
- Additional affinity from luck: (luck - 10) × 2 (up to +30)

#### Day 11: Momentum Shift 🔄
*"Underdogs rise today"*

**Bracket-Relative Underdog Bonus:**
- Uses your **unbuffed** average rating % 10
- avg % 10 ≤ 2 → +60 (bottom 30% of bracket)
- avg % 10 ≤ 4 → +45 (lower half of bracket)
- avg % 10 ≤ 6 → +25 (middle of bracket)
- avg % 10 > 6 → No bonus (you're the favorite!)

**Token Bonus:**
- Token % 12 = 0 → +40 (8.3% of bots)

*Note: This day helps underdogs WITHIN their race class, not absolute underdogs.*

#### Day 12: Blackhole Singularity 🌌
*"Gravity warps reality"*

**Faction Bonus:**
- Blackhole faction → +60 (2.44% of bots)

**Token Bonus:**
- Token % 13 = 0 → +40 (7.7% of bots)

## EXAMPLE BOT AFFINITIES

### Typical Common Bot (#4829, Industrial)
**Stats:** Speed 18, Power 17, Accel 19, Stability 21

| Day | Phenomenon | Affinity | Why |
|-----|-----------|----------|-----|
| 0 | Solar Flare | **60** ⭐⭐ | Power 17 % 10 = **7** (jackpot!) |
| 6 | Golden Hour | **40** ⭐ | Token 4829 % 7 = 0! |
| 9 | Binary Surge | **70** ⭐⭐ | Stats spread only 4 points |
| 10 | Chaos Pulse | **70** ⭐⭐ | Token 4829 % 11 = 0! |

**Good days: 4 out of 13** - Even common bots have multiple strong days!

### Elite Rare Bot (#1337, Dead)
**Stats:** Speed 28, Power 32, Accel 31, Stability 29

| Day | Phenomenon | Affinity | Why |
|-----|-----------|----------|-----|
| 2 | Metal Resonance | **85** ⭐⭐⭐ | Prime #1337! |
| 5 | Dead Zone | **100** ⭐⭐⭐ | Dead faction + "13" in token! |
| 9 | Binary Surge | **70** ⭐⭐ | Stats spread only 4 |
| 11 | Momentum Shift | **60** ⭐⭐ | Avg 30, digit = 0 (bottom!) |

**Cosmic days: 2, Strong days: 2** - Rare faction provides extra opportunities!

### Underdog (#6666, Game)
**Stats:** Speed 12, Power 11, Accel 14, Stability 13

| Day | Phenomenon | Affinity | Why |
|-----|-----------|----------|-----|
| 5 | Dead Zone | **90** ⭐⭐⭐ | Token contains "666"! |
| 7 | Machine Ghost | **40** ⭐ | Token > 5000! |
| 9 | Binary Surge | **70** ⭐⭐ | Stats spread only 3 |
| 11 | Momentum Shift | **60** ⭐⭐ | Avg 12, digit = 2 (bottom!) |

**Even weak bots get lucky days!** The system ensures everyone has a chance.

## UPGRADING LUCK

Luck can be upgraded just like other stats:

**Cost:** Uses **Universal Parts** only (luck isn't tied to a specific part type)

**Duration:** 12 hours (same as other stats)

**Success Rate:** Same curve as other stats:
- First upgrades: 85% success
- 10th upgrade: ~29% success
- 15+ upgrades: 1% success (soft cap)

**Why Upgrade Luck?**
- Shift your performance center from 103% to 94% (9% improvement!)
- Increase proc chance from 2% to 20% per segment
- Reduce bad incident chance from 6% to 1.5%
- Extra affinity bonus on Chaos Pulse day

## BALANCE & WIN RATES

The luck system is designed to add excitement without breaking competitive balance:

| Matchup | Expected Win Rate |
|---------|------------------|
| Top tier vs Low tier | **85-90%** (top still dominates) |
| Equal tier bots | Luck decides **25-30%** |
| Underdog victories | ~5-10% more often with luck |
| Daily affinity impact | ~5% win rate difference |

**Key Balance Points:**
- Average bot: 10-15% luck proc rate per segment
- High luck bot: 15-20% proc rate per segment
- Cosmic alignment: +16% bonus on top
- Legendary procs: <1% of all segments

## STRATEGY TIPS

### When to Race

1. **Check Today's Phenomenon** - Your bot may have high affinity!
2. **Multiple Strong Days** - Race more aggressively when aligned
3. **Underdog Days** - Day 11 (Momentum Shift) benefits bracket underdogs

### Building Your Bot

1. **Balanced Stats** - Binary Surge day rewards balanced builds
2. **Luck Upgrades** - Consider investing in luck for consistent benefits
3. **Know Your Token** - Check which days favor your token index

### Understanding Your Affinity

To find your bot's affinities:
- Check the last digit of each stat for stat-based phenomena
- Calculate token patterns (% 7, % 11, % 13, etc.)
- Know your faction's special day

### Race Watching

Look for luck events in race commentary:
- 🍀 indicates a luck proc (Minor/Major/Legendary)
- 💥 indicates a bad luck incident
- Track which bots are getting hot hands!

## SUMMARY

The luck system creates memorable moments:
- **Your underdog's day is coming** - Daily phenomena cycle through, blessing different bots
- **Stats still matter** - Better bots still win most of the time
- **Exciting comebacks** - Trailing bots get extra luck chances
- **Upgradeable advantage** - Invest in luck for consistent benefits

*"Bot #4829's moment is coming. Will yours be next?"* 🍀
