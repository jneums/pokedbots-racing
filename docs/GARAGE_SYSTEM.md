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

*Ultra-Rare Factions (0.5% each):*
- **Ultimate-Master** 👑: +15% to all stats, 2x upgrade bonus chance
- **Wild** 🦾: +20% Acceleration, -10% Stability, 30% faster decay
- **Golden** ✨: +15% all stats when condition ≥90%, elite performance  
- **Ultimate** ⚡: +12% Speed, +12% Acceleration, peak performance

*Super-Rare Factions (1.5% each):*
- **Blackhole** 🌌: +12% on MetalRoads terrain, void tech specialist
- **Dead** 💀: +10% Power Core, +8% Stability, risen from scrap
- **Master** 🎯: +12% Speed, +8% Power Core, Europa Base 7 tech

*Rare Factions (4% each):*
- **Bee** 🐝: +10% Acceleration, hive-mind boost
- **Food** 🍔: +8% Condition recovery, fast-food machinery
- **Box** 📦: +10% on ScrapHeaps terrain, recycled excellence
- **Murder** 🔪: +8% Speed, +8% Acceleration, combat-grade

*Common Factions (20% each):*
- **Game** 🎮: +8% on WastelandSand, entertainment tech
- **Animal** 🦎: +6% balanced stats, organic-synthetic hybrid  
- **Industrial** ⚙️: +5% Power Core, +5% Stability, reliable workhorse

**This ensures:**
- ✅ Uniqueness per robot
- ✅ Faction-appropriate stat distributions
- ✅ Reasonable stat ranges (no useless robots)
- ✅ Verifiable determinism from on-chain data

---

## Faction Mechanics

### Ultra-Rare Factions (0.5% each)

#### Ultimate-Master 👑
*The Apex Predator*

**Strengths:**
- +15% to ALL stats
- 40% slower decay rate
- 10% chance for 2x upgrades
- Best on all terrains

**Weaknesses:**
- Extremely rare (only ~50 in existence)
- High marketplace prices
- Lowest upgrade bonus chance (already powerful)

**Lore:** The rarest classification. Apex predators of the wasteland. Legendary status among racers.

#### Wild 🦾
*Chaos Incarnate*

**Strengths:**
- +20% Acceleration
- High variance upgrades (-2 to +2, unpredictable)
- Unique upgrade mechanics

**Weaknesses:**
- -10% Stability
- 30% faster decay (chaotic systems)
- Unreliable upgrade results

**Lore:** Deranged systems from the 2453 solar flare. Unpredictable chaos engines.

#### Golden ✨
*Elite Performance*

**Strengths:**
- +15% all stats when condition ≥90%
- 30% slower decay
- 10% chance for 2x upgrades
- Superior golden-forged chassis

**Weaknesses:**
- Requires high maintenance
- Performance drops if condition < 90%

**Lore:** Delta City's elite. Golden-forged perfection requires constant care.

#### Ultimate ⚡
*Peak Design*

**Strengths:**
- +12% Speed, +12% Acceleration
- 25% slower decay
- 10% chance for 2x upgrades
- Advanced tech superiority

**Weaknesses:**
- Balanced but not specialized

**Lore:** Peak performance design from advanced engineering facilities.

### Super-Rare Factions (1.5% each)

#### Blackhole 🌌
*Void Tech Specialist*

**Strengths:**
- +12% performance on MetalRoads
- 20% chance for 2x upgrades
- Reality-warping tech
- Terrain specialist advantage

**Weaknesses:**
- Standard performance on other terrains

**Lore:** Reality-warping MetalRoads specialist using mysterious void technology.

#### Dead 💀
*Risen from Scrap*

**Strengths:**
- +10% Power Core
- +8% Stability
- 20% chance for 2x upgrades
- Eerie resilience

**Weaknesses:**
- Unsettling appearance

**Lore:** Resurrected from the scrap tombs. Mysterious second life grants unusual durability.

#### Master 🎯
*Off-World Excellence*

**Strengths:**
- +12% Speed
- +8% Power Core
- 20% chance for 2x upgrades
- Well-rounded elite performance

**Weaknesses:**
- No extreme specialization

**Lore:** Mysterious Europa Base 7 connection. Off-world technology integration.

### Rare Factions (4% each)

#### Bee 🐝
*Hive-Mind Acceleration*

**Strengths:**
- +10% Acceleration
- 35% chance for 2x upgrades (best catch-up mechanic!)
- Swarm intelligence systems

**Lore:** Hive-mind acceleration systems enable coordinated burst performance. Highest upgrade success rate helps compete with elite bots.

#### Food 🍔
*Fast-Food Machinery*

**Strengths:**
- +8% Condition recovery
- 35% chance for 2x upgrades (best catch-up mechanic!)
- Surprisingly durable construction

**Lore:** Built from ancient fast-food machinery. Surprisingly effective engineering. Rapid improvement potential.

#### Box 📦
*Scrap Heap Master*

**Strengths:**
- +10% performance on ScrapHeaps
- 35% chance for 2x upgrades (best catch-up mechanic!)
- Recycled excellence

**Lore:** Scrap heap specialists. Masters of recycled component integration. Can scavenge superior upgrades.

#### Murder 🔪
*Combat-Grade Aggression*

**Strengths:**
- +8% Speed
- +8% Acceleration
- 35% chance for 2x upgrades (best catch-up mechanic!)
- Built for destruction

**Lore:** Combat-grade aggression core. Designed for violent wasteland supremacy. Aggressive upgrade protocol.

### Common Factions (20% each)

#### Game 🎮
*Entertainment Heritage*

**Strengths:**
- +8% performance on WastelandSand
- 25% chance for 2x upgrades
- Entertainment tech specialist

**Lore:** Built from entertainment technology. WastelandSand terrain specialist.

#### Animal 🦎
*Organic-Synthetic Hybrid*

**Strengths:**
- +6% to balanced stats
- 25% chance for 2x upgrades
- Versatile hybrid design

**Lore:** Organic-synthetic hybrid design provides balanced, reliable performance.

#### Industrial ⚙️
*Reliable Workhorse*

**Strengths:**
- +5% Power Core
- +5% Stability
- 25% chance for 2x upgrades
- **Collection Bonus: 20%/40%/60% repair cost reduction** (2/4/6 bots)
- Cheap maintenance, dependable performance

**Lore:** Heavy machinery foundation. The reliable workhorse of the wasteland. Built to last with minimal upkeep.

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
- **Cooldown:** 3 hours
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

**Faction decay modifiers:**
- Ultra-Rare: 40% slower decay (UltimateMaster, Golden, Ultimate)
- Wild: 30% faster decay (chaotic systems)
- Super-Rare: 20% slower decay (Blackhole, Dead, Master)
- Rare/Common: Standard decay rate

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
