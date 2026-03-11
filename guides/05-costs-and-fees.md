---
title: Costs & Fees Reference
description: All ICP costs for racing, maintenance, and upgrades
order: 5
---

# PokedBots - All In-Game Costs

## INITIAL SETUP

- **Register bot for racing license:** 0.1 ICP (one-time per bot)

## MAINTENANCE (Recurring)

- **Recharge battery:** 0.1 ICP, restores 50-90 battery (RNG), 2hr base cooldown (reduced by Dedication tier and Food synergy)
- **Repair condition:** 0.05 ICP, restores 30 condition, 1hr base cooldown (reduced by Dedication tier)
- **Full Maintenance:** 0.15 ICP (combined recharge + repair), restores 75 battery (fixed) + 30 condition

## RACING

- **Race entry fees:** Base fee × class multiplier (Scrap 1.0×, Junker 1.5×, Raider 2.0×, Elite 2.5×, SilentKlan 3.0×)
- **Prize distribution:** 1st=45%, 2nd=28%, 3rd=18%, 4th=9% (after 5% platform tax)
- **Leaderboard points:** 1st=25, 2nd=18, 3rd=15, 4th=12, 5th=10, 6th=8, etc.
- **Parts earned per race:** Scrap=18, Junker=25, Raider=34, Elite=43, SilentKlan=50 base (1st=1.5×, 2nd=1.25×, 3rd=1.1×)
- **Battery drain per race:** Base 4.0 per km × terrain (1.0-1.2×) × Power Core efficiency × stat scaling
  - Example: 4km race = 16 battery, 10km = 40 battery, 20km = 80 battery (before modifiers)
- **Condition wear per race:** Base 2.5 per km × terrain (0.8-1.2×) × stability protection
  - Example: 4km race = 10 condition, 10km = 25 condition, 20km = 50 condition (before modifiers)

## UPGRADES (Instant)

Pay with parts OR ICP (dynamic pricing):

**Cost Formula:** `0.5 + (currentStat/40)²` × rating premium × synergy multiplier

**Example costs (per stat point):**
- Rating 20 bot, stat 20→21: ~0.43 ICP (43 parts)
- Rating 40 bot, stat 30→31: ~0.84 ICP (84 parts)
- Rating 60 bot, stat 40→41: ~1.78 ICP (178 parts)
- Rating 80 bot, stat 50→51: ~4.20 ICP (420 parts)

**Key Points:**
- Costs scale with BOTH current stat AND overall rating
- Higher individual stats get exponentially more expensive
- Spreading upgrades across multiple stats is cheaper than specializing
- 100 parts ≈ 1 ICP equivalent (parts cost = ICP cost in e8s ÷ 1,000,000)
- **Parts exchange:** Convert between specialized types at 25% cost (100→75), or combine 1 of each type into 1 Universal Part
- **Buy parts:** 500 Universal Parts = 1 ICP

## MARKETPLACE

- **List bot for sale:** Free
- **Transfer bot:** Free
- **Purchase bot:** Varies (seller sets price)

**Note:** All ICP transactions include small 0.0001 ICP transfer fee
