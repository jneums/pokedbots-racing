---
title: Luck System Guide
description: Understanding luck as a catchup mechanic and daily phenomena in races
order: 14
---

# Luck System - Complete Guide

## OVERVIEW

Luck in PokedBots Racing is a **catchup mechanic** that creates exciting breakthrough moments during races. All bots have the same base luck stat of **10**, ensuring fair competition while allowing for dramatic comebacks.

**Core Principles:**
- All bots have equal luck (10) - no advantages from token index
- Stats still matter - better bots still win most races
- Underdogs get extra luck chances (comeback mechanic)
- Daily cosmic events favor different bots each day based on faction, stats, and token patterns

## HOW LUCK WORKS IN RACES

Luck creates breakthrough moments during races through two mechanics:

### 1. Luck Procs (Breakthrough Moments)

During races, bots trailing behind get bonus chances to trigger luck procs - speed boosts that help them catch up.

**Base Chance:** 10% per segment for all bots

**Underdog Bonus:** Bots in lower positions get significantly higher proc chances:

| Position | Proc Chance |
|----------|-------------|
| Leading (top half) | No luck procs |
| Trailing (bottom half) | 10% + position bonus |
| Last place | Up to 30% chance |

This ensures luck primarily helps bots that are behind, creating exciting comeback opportunities without randomly deciding races.

### 2. Daily Affinity Bonus

Your bot's affinity to the current day's phenomenon adds bonus luck chance (up to +16% at cosmic alignment).

## LUCK PROCS (BREAKTHROUGH MOMENTS)

When a luck proc triggers, your bot gets a speed boost that **scales with Acceleration**:

### How Acceleration Affects Procs

Your bot's Acceleration stat determines how powerful luck procs are:

| Acceleration | Scaling Factor | Example Minor Proc |
|--------------|----------------|-------------------|
| 0 | 0.75x | +3% speed |
| 50 | 1.0x | +4% speed |
| 100 | 1.25x | +5% speed |

Higher acceleration = bigger boost when luck triggers! The scaling uses diminishing returns above 50 acceleration (sqrt curve).

### Proc Types

| Type | Speed Boost | Duration | Chance |
|------|-------------|----------|--------|
| **Minor** | +3-5% | 1 segment | ~70% of procs |
| **Major** | +6-10% | 3 segments | ~25% of procs |
| **Legendary** | +10.5-17.5% | 5 segments | ~5% of procs |

*Boost ranges show minimum (0 accel) to maximum (100 accel)*

### Proc Descriptions

**Minor Procs:**
- "Lucky dodge saves time!"
- "Catches tailwind!"
- "Smooth patch ahead!"

**Major Procs:**
- "Discovers hidden shortcut!"
- "Catches massive tailwind!"
- "Perfect line through debris!"

**Legendary Procs:**
- "FLOW STATE ACTIVATED! Bot transcends physics!"
- "LEGENDARY SHORTCUT! Bot warps through space!"
- "COSMIC BLESSING! Bot channels wasteland energy!"

## DAILY PHENOMENA (WASTELAND ASTROLOGY)

Each day features a different cosmic phenomenon that gives affinity bonuses to bots with matching characteristics. Higher affinity = higher luck proc chance. The cycle repeats every 13 days.

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
| 10 | **Chaos Pulse** | ⚡ | Token % 11 = 0 |
| 11 | **Momentum Shift** | 🔄 | Bracket underdogs (avg % 10 ≤ 4) |
| 12 | **Singularity** | 🌌 | Blackhole faction, token % 13 = 0 |

### Affinity Tiers

| Affinity | Stars | Luck Bonus |
|----------|-------|------------|
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
*"Chaos favors the wild"*

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
*"Pure randomness rules"*

**Token Bonus:**
- Token % 11 = 0 → +70 (9.1% of bots)

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

## BALANCE & WIN RATES

The luck system adds excitement without breaking competitive balance:

| Matchup | Expected Win Rate |
|---------|------------------|
| Top tier vs Low tier | **85-90%** (top still dominates) |
| Equal tier bots | Luck can influence **25-30%** |
| Underdog comebacks | ~5-10% more likely with luck |
| Daily affinity impact | ~5% win rate difference |

**Key Balance Points:**
- Luck only helps bots that are trailing
- Leading bots don't get luck procs
- All bots have equal base luck (10)
- Daily affinity provides variety, not permanent advantage

## STRATEGY TIPS

### When to Race

1. **Check Today's Phenomenon** - Your bot may have high affinity!
2. **Multiple Strong Days** - Race more aggressively when aligned
3. **Underdog Days** - Day 11 (Momentum Shift) benefits bracket underdogs

### Understanding Your Affinity

To find your bot's affinities:
- Check the last digit of each stat for stat-based phenomena
- Calculate token patterns (% 7, % 11, % 13, etc.)
- Know your faction's special day

### Race Watching

Look for luck events in race commentary:
- 🍀 indicates a luck proc (Minor/Major/Legendary)
- Track which trailing bots are making comebacks!

## SUMMARY

The luck system creates memorable comeback moments:
- **Equal for all** - Every bot has the same base luck (10)
- **Catchup mechanic** - Only helps bots that are trailing
- **Daily variety** - Different bots shine on different days through affinity
- **Stats still matter** - Better bots still win most of the time
- **Exciting races** - Trailing bots always have a chance at a comeback

*"Every bot's moment is coming. Will today be yours?"* 🍀
