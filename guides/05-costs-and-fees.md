---
title: Costs & Fees Reference
description: All ICP costs for racing, maintenance, and upgrades
order: 5
---

# PokedBots - All In-Game Costs

## INITIAL SETUP

- **Register bot for racing license:** 0.1 ICP (one-time per bot)

## MAINTENANCE (Recurring)

- **Recharge battery:** 0.1 ICP, restores 50-90 battery (RNG), 6hr cooldown
- **Repair condition:** 0.05 ICP, restores 25 condition, 3hr cooldown

## RACING

- **Race entry fees:** 0.1-2.4 ICP (varies by class and event type)
- **Battery drain per race:** Base 2.5 per km × terrain (1.0-1.2×) × Power Core efficiency × stat scaling
  - Example: 4km race = 10 battery, 10km = 25 battery, 20km = 50 battery (before modifiers)
- **Condition wear per race:** Base 1.2 per km × terrain (1.0-1.5×) × stat scaling
  - Example: 4km race = 5 condition, 10km = 12 condition, 20km = 24 condition (before modifiers)

## UPGRADES (12hr sessions)

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
- 100 parts = 1 ICP equivalent

## MARKETPLACE

- **List bot for sale:** Free
- **Transfer bot:** Free
- **Purchase bot:** Varies (seller sets price)

**Note:** All ICP transactions include small 0.0001 ICP transfer fee
