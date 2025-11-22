---
title: "Garage System"
description: "Robot stats, maintenance, and faction mechanics"
order: 3
---

# PokedBots Racing - Garage System

**Bot Management & Maintenance**

---

## Navigation

📖 <a href="/docs/ARCHITECTURE">← Architecture</a> | ⚡ <a href="/docs/UPGRADE_SYSTEM">Upgrade System →</a>

---

## Robot Stats System

Each PokedBot has the following core attributes:

### Primary Stats
*Derived from NFT at mint and faction type*

- **Speed** (0-100): Affects base race velocity through the wastelands
- **Power Core** (0-100): Affects performance over race distance (energy efficiency)
- **Acceleration** (0-100): Affects burst speed and position changes
- **Stability** (0-100): Affects consistency on rough terrain (lower variance in performance)

### Derived Stats
*Calculated from primary stats and faction*

- **Overall Rating**: Weighted average of primary stats
- **Distance Preference**: Short Sprint (< 5km), Medium Haul (5-15km), Long Trek (> 15km)
- **Terrain Preference**: Scrap Heaps, Wasteland Sand, Metal Roads
- **Faction Bonus**: Special abilities based on robot faction type

### Dynamic Stats
*Change over time with use*

- **Battery** (0-100): Depletes with races (-10 per race), restored by charging
- **Condition** (0-100): Constantly decays (~5 per day for all bots), restored by maintenance
- **Calibration** (0-100): Improves with upgrades, constantly decays (~3 per day)
- **Experience** (XP): Increases with races, affects stat caps and upgrade potential
- **Runtime** (days since activation): Affects performance (peak efficiency at 100-200 days)

### Career Stats
*Historical tracking*

- Races entered
- Wins / Places / Shows
- Total scrap credits earned
- Best finish times per terrain type
- Faction reputation points

---

## Stat Derivation from NFT

When a PokedBot NFT is initialized for racing, its primary stats are **deterministically generated** from the precomputed stats file:

```motoko
// Pseudo-code for stat generation
let seed = hash(tokenId, mintTimestamp, ownerPrincipal, factionType)

// Base stats with faction modifiers
let baseSeed = seed % 100
let speed = applyFactionBonus(baseSeed * 0.7 + 30, faction, "speed")
let powerCore = applyFactionBonus(((seed / 100) % 100) * 0.7 + 30, faction, "power")
let acceleration = applyFactionBonus(((seed / 10000) % 100) * 0.7 + 30, faction, "accel")
let stability = applyFactionBonus(((seed / 1000000) % 100) * 0.7 + 30, faction, "stability")
```

**Faction Bonuses:**
- **Battle Bots** 🎮: +15% Power Core, +10% Stability
- **Entertainment Bots** 🎭: +15% Speed, +10% Acceleration  
- **Wild Bots** ⚡: +20% Acceleration, -10% Stability (erratic but fast)
- **God Class** 👑: +10% to all stats (rare, expensive to mint)
- **Masters** 🌙: +12% Speed, +12% Stability, +8% Power Core

**This ensures:**
- ✅ Uniqueness per robot
- ✅ Faction-appropriate stat distributions
- ✅ Reasonable stat ranges (no useless robots)
- ✅ Verifiable determinism from on-chain data

---

## Faction Mechanics

### Battle Bots 🎮
*Rugged Wasteland Scavengers*

**Strengths:**
- High Power Core (endurance races)
- High Stability (consistent performance)
- Best on Metal Roads terrain

**Weaknesses:**
- Lower Speed (slower top speed)
- Lower Acceleration (sluggish starts)

**Lore:** Built from old video game consoles and junk food toy parts salvaged from the giant rubbish heaps of former Antarctica. Tough and practical.

### Entertainment Bots 🎭
*Flashy Speed Demons*

**Strengths:**
- High Speed (fastest top speed)
- High Acceleration (explosive starts)
- Best on Wasteland Sand terrain

**Weaknesses:**
- Lower Power Core (tire in long races)
- Lower Stability (inconsistent)

**Lore:** Pieced together from ancient entertainment technology. Charismatic and built for showmanship.

### Wild Bots ⚡
*Unpredictable Chaos*

**Strengths:**
- Very High Acceleration (+20%)
- Unpredictable surges (+10% variance in upgrades)
- Best on Scrap Heaps terrain

**Weaknesses:**
- Very Low Stability (-10%)
- Erratic performance (high variance)

**Lore:** Once normal robots, now deranged after the catastrophic solar flare of 2453 AD. Dangerous and unstable.

### God Class 👑
*Elite Engineered Perfection*

**Strengths:**
- +10% to ALL stats
- 20% reduced upgrade difficulty (easier to reach high stats)
- Best on all terrains

**Weaknesses:**
- Expensive to purchase
- Rare on marketplace

**Lore:** Rulers of much of eastern Earth, possessing abilities far beyond standard bots. Engineered for superiority.

### The Masters 🌙
*Mysterious Off-World Tech*

**Strengths:**
- Balanced bonuses (+12% Speed, +12% Stability, +8% Power Core)
- Well-rounded for all race types
- Best on Metal Roads

**Weaknesses:**
- No major weaknesses
- No extreme specialization

**Lore:** A secretive society with mysterious connections to the off-world Europa Base 7 colony. Advanced alien-influenced technology.

---

## Maintenance & Repair System

Robots require regular maintenance to maintain optimal performance.

### Maintenance Actions
*Cost paid via ICRC-2 transfer*

#### 1. Recharge ⚡
- **Cost:** 0.1 ICP + 0.0001 ICP fee
- **Effect:** Restores +20 Condition, +10 Battery
- **Cooldown:** 6 hours
- **Use:** After several races, before entering new races

#### 2. Basic Repair 🔧
- **Cost:** 0.05 ICP + 0.0001 ICP fee
- **Effect:** Restores +10 Condition
- **Cooldown:** 12 hours
- **Use:** Maintain race readiness between events

### Decay Mechanics

**Automated hourly decay (affects ALL initialized bots):**
- Condition decreases by **~0.21 per hour** (~5 per day)
  - Happens constantly, whether you race or not
  - Drives maintenance economy
- Battery decreases by **-10 per race** (not affected by decay timer)
- Calibration decreases by **~0.125 per hour** (~3 per day)
- **Below 50 Condition:** -10% to all race performance
- **Below 25 Condition:** Cannot enter races (critical malfunction)

**Faction modifiers:**
- Wild Bot: 20% faster decay (chaotic systems)
- God Class: 30% slower decay (superior construction)

⚠️ **Keep your bot healthy!** Decay runs every hour. Regular maintenance prevents performance degradation.

---

## Garage Management

### Garage Subaccount System

Each user has a **personal garage subaccount** that stores their PokedBots:

- **Subaccount ID:** "GARG" + principal bytes (32 bytes total)
- **Ownership:** NFTs stored in garage are owned by your principal
- **Verification:** System checks `bearer(tokenId)` before every operation
- **Trading:** NFTs remain tradeable on EXT marketplaces

**Tools:**
- `garage_list_my_pokedbots` - View all your bots with stats
- `garage_get_robot_details` - Deep dive on specific bot
- `garage_initialize_pokedbot` - Register bot for racing
- `garage_recharge_robot` - Restore condition & battery
- `garage_repair_robot` - Fix damage
- `garage_upgrade_robot` - Start upgrade session

---

## Navigation

📖 [← Architecture](/docs/ARCHITECTURE) | ⚡ [Upgrade System →](/docs/UPGRADE_SYSTEM)

**See also:**
- 🏁 [Racing System](/docs/RACING_SYSTEM) - Enter races, win prizes
- 🛒 [Marketplace](/docs/MARKETPLACE) - Buy and trade bots
- 🛠️ [MCP Tools](/docs/MCP_TOOLS) - Complete API reference
