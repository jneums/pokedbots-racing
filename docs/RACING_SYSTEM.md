---
title: "Racing System"
description: "Races, simulation engine, prizes, and leaderboards"
order: 5
---

# PokedBots Racing - Racing System

**Compete in the Wastelands**

---

## Navigation

📖 <a href="/docs/UPGRADE_SYSTEM">← Upgrade System</a> | 🛒 <a href="/docs/MARKETPLACE">Marketplace →</a>

---

## Race Structure

Races are scheduled events through the dangerous wastelands surrounding Delta City.

### Race Properties

- **Distance**: 5km, 10km, 15km, 20km, 30km (through wasteland terrain)
- **Terrain**: Scrap Heaps, Wasteland Sand, Metal Roads (ancient highways)
- **Class**: 
  - Scavenger Class (0-2 wins)
  - Raider Class (3-5 wins)
  - Elite Class (6+ wins)
  - Silent Klan Invitational (10+ wins)
- **Entry Fee**: Class-based scaling:
  - Scavenger: 0.05-0.5 ICP (1x base)
  - Raider: 0.1-1 ICP (2x base)
  - Elite: 0.25-2.5 ICP (5x base)
  - SilentKlan: 0.5-5 ICP (10x base)
- **Prize Pool**: Sum of all entry fees (minus 5% Silent Klan tax)
- **Max Entries**: 8-12 robots
- **Start Time**: Scheduled timestamp
- **Entry Deadline**: 30 minutes before start
- **Race Route**: Departs from Delta City train station into the garbage towers

---

## Race Entry Requirements

To enter a race, your bot must meet:

- ✅ Robot Condition ≥ 70
- ✅ Robot Battery ≥ 50
- ✅ Sufficient ICRC-2 allowance for entry fee + 0.0001 ICP transfer fee
- ✅ Robot meets class requirements (win count)
- ✅ Race not full
- ✅ Before entry deadline
- ✅ Robot not in another race at same time
- ✅ Faction restrictions met (for certain races)

**Special Races:**
- **Silent Klan Invitational**: Only UltimateMaster, Golden, Ultimate, Blackhole, Dead, and Master factions (top-tier bots)
- **Faction Championships**: Restricted to specific factions

---

## Prize Distribution

**Parimutuel-style with Silent Klan tax:**

- **Silent Klan Tax**: 5% (goes to canister treasury)
- **1st Place**: 47.5% of prize pool
- **2nd Place**: 23.75% of prize pool
- **3rd Place**: 14.25% of prize pool
- **4th Place**: 9.5% of prize pool
- **5th+ Place**: 0%

**Example:**
```
10 robots enter @ 50 ICP each = 500 ICP total
Silent Klan tax: 25 ICP
Prize pool: 475 ICP

1st: 237.5 ICP
2nd: 118.75 ICP
3rd: 71.25 ICP
4th: 47.5 ICP
5th-10th: 0 ICP
```

---

## Race Simulation Engine

Races are simulated **deterministically** using multiple performance factors.

### Simulation Logic

```motoko
// Simplified simulation logic
for each robot in race:
  // Calculate performance factors
  baseTime = raceDistance / (robot.speed * 0.8 + 10)
  
  // Apply power core effect (better power = less slowdown on long distances)
  distanceFactor = if (raceDistance > robot.preferredDistance) 
    then (robot.powerCore / 100.0) 
    else 1.0
  
  // Apply battery/condition penalties
  batteryFactor = robot.battery / 100.0
  conditionFactor = robot.condition / 100.0
  
  // Apply terrain preference
  terrainFactor = if (race.terrain == robot.preferredTerrain) 
    then 1.05 
    else 0.95
  
  // Apply faction special abilities (14 Type-based bonuses)
  factionBonus = match robot.faction:
    // ULTRA-RARE FACTIONS (1-45 bots)
    Ultimate-master => 1.12  // Supreme in all conditions
    Wild => 1.0 + random() * 0.20  // Chaotic variance (-10% to +10%)
    Golden => if (condition >= 90) then 1.15 else 1.05  // Pristine bonus
    Ultimate => 1.10  // Consistent excellence
    
    // SUPER-RARE FACTIONS (244-640 bots)
    Blackhole => if (terrain == MetalRoads) then 1.12 else 1.03  // Highway specialists
    Dead => if (distance >= 20km) then 1.10 else 1.02  // Endurance machines
    Master => if (raceClass == Elite || raceClass == SilentKlan) then 1.14 else 1.04  // Elite dominance
    
    // RARE FACTIONS (717-999 bots)
    Bee => if (stability >= 60) then 1.08 else 1.02  // Precision flyers
    Food => if (battery >= 80) then 1.09 else 1.03  // Energy efficient
    Box => if (terrain == ScrapHeaps) then 1.10 else 1.02  // Garbage crushers
    Murder => 1.06  // Reliable aggression
    
    // COMMON FACTIONS (1654-2009 bots)
    Game => if (terrain == WastelandSand) then 1.05 else 1.0  // Sand specialists
    Animal => 1.02  // Natural adaptability
    Industrial => 1.0  // No special bonus
  
  // Random variance based on stability (lower stability = higher variance)
  variance = random() * (100 - robot.stability) / 100.0 * 0.15
  
  // Weather hazards in wasteland (solar flares, dust storms)
  hazardFactor = if (randomSolarFlare()) then 0.9 else 1.0
  
  // Final time calculation
  finalTime = baseTime / (distanceFactor * batteryFactor * conditionFactor * 
                          terrainFactor * factionBonus * hazardFactor) 
              * (1.0 + variance)

// Sort by finalTime, assign positions, distribute prizes
```

### Simulation Features

- ✅ Uses race ID + start time + block hash as random seed
- ✅ **Deterministic** (same inputs = same outputs)
- ✅ Considers all robot stats, faction bonuses, and conditions
- ✅ Creates realistic variance with wasteland hazards
- ✅ Rewards well-maintained robots
- ✅ Wild Bots can have spectacular wins or catastrophic failures

---

## Faction Racing Bonuses

Each of the 14 Type-based factions has unique racing advantages:

### Ultra-Rare Factions (1-45 bots)

**Ultimate-master** (1 bot) 👑
- **+12% performance** in all conditions
- Supreme racing machine

**Wild** (5 bots) ⚡
- **-10% to +10% random variance**
- Can dominate or crash spectacularly
- High risk, high reward

**Golden** (27 bots) ✨
- **+15% performance** when condition ≥ 90
- **+5% performance** otherwise
- Pristine maintenance rewarded

**Ultimate** (45 bots) 🌟
- **+10% performance** in all conditions
- Consistent excellence

### Super-Rare Factions (244-640 bots)

**Blackhole** (244 bots) 🌀
- **+12% performance** on Metal Roads
- **+3% performance** on other terrains
- Highway speed specialists

**Dead** (382 bots) 💀
- **+10% performance** on 20km+ races
- **+2% performance** on shorter races
- Endurance machines

**Master** (640 bots) 🎭
- **+14% performance** in Elite/SilentKlan races
- **+4% performance** in other classes
- Excel under elite pressure

### Rare Factions (717-999 bots)

**Bee** (717 bots) 🐝
- **+8% performance** when stability ≥ 60
- **+2% performance** otherwise
- Precision flying rewarded

**Food** (778 bots) 🍔
- **+9% performance** when battery ≥ 80
- **+3% performance** otherwise
- Energy efficiency specialists

**Box** (798 bots) 📦
- **+10% performance** on Scrap Heaps
- **+2% performance** on other terrains
- Garbage tower crushers

**Murder** (999 bots) 🔪
- **+6% performance** in all conditions
- Reliable aggressive racers

### Common Factions (1654-2009 bots)

**Game** (1654 bots) 🎮
- **+5% performance** on Wasteland Sand
- **+0% performance** on other terrains
- Desert survival specialists

**Animal** (1701 bots) 🦎
- **+2% performance** in all conditions
- Natural wasteland adaptation

**Industrial** (2009 bots) ⚙️
- **+0% bonus**
- Raw stats, no special abilities

---

## Race Calendar

### Daily Sprint Challenge
**Schedule:** Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
- **Distance:** 5-10km (varies: 5km, 7km, or 10km)
- **Terrain:** ScrapHeaps, WastelandSand, or MetalRoads
- **Classes:** Scavenger, Raider, Elite
- **Entry Fee:** 
  - Scavenger: 0.05 ICP
  - Raider: 0.1 ICP  
  - Elite: 0.25 ICP
- **Max Entries:** 12
- **Platform Bonus:** +0.5 ICP (Scavenger/Raider only)
- **Points:** 1x standard

### Weekly League Championship
**Schedule:** Every Sunday at 18:00 UTC
- **Distance:** 10-20km (varies: 10km, 15km, or 20km)
- **Terrain:** ScrapHeaps, WastelandSand, or MetalRoads
- **Classes:** Scavenger, Raider, Elite, SilentKlan
- **Entry Fee:**
  - Scavenger: 0.2 ICP
  - Raider: 0.4 ICP
  - Elite: 1.0 ICP
  - SilentKlan: 2.0 ICP
- **Max Entries:** 50
- **Platform Bonus:** +2 ICP (Scavenger/Raider only)
- **Points:** 2x multiplier

### Monthly Championship Cup
**Schedule:** First Saturday of each month at 18:00 UTC
- **Distance:** 15-30km (varies: 15km, 20km, 25km, or 30km)
- **Terrain:** ScrapHeaps, WastelandSand, or MetalRoads
- **Classes:** Elite, SilentKlan only
- **Entry Fee:**
  - Elite: 2.5 ICP (0.5 base × 5x)
  - SilentKlan: 5.0 ICP (0.5 base × 10x)
- **Max Entries:** 64
- **Platform Bonus:** +5 ICP (all classes)
- **Points:** 3x multiplier

### Special Events
**Schedule:** Announced in advance (72 hours)
- **Distance:** 10-30km (full variety)
- **Terrain:** All terrains
- **Classes:** Varies by event
- **Entry Fee:** Custom per event
- **Max Entries:** Varies
- **Themes:** Faction Championships, Holiday events, Community tournaments

---

## Sponsorship System

Boost prize pools by sponsoring races!

### How to Sponsor

Use the `racing_sponsor_race` tool:

```json
{
  "race_id": 123,
  "amount_icp": 50.0,
  "message": "Good luck racers! -PokedBot Fan"
}
```

**Benefits:**
- ✅ Your sponsorship displayed on race page
- ✅ Optional message (max 100 chars)
- ✅ Support the racing community
- ✅ Winners know who contributed

**Minimum:** 0.1 ICP per sponsorship

---

## Leaderboards

### Time-Based Rankings

**Monthly Leaderboard (YYYYMM format)**
- Points earned during calendar month
- Resets at start of each month
- Tracks current month's best performers

**Seasonal Leaderboard (3-month periods)**
- Winter (Jan-Mar), Spring (Apr-Jun), Summer (Jul-Sep), Fall (Oct-Dec)
- Accumulates points across full season
- Major achievements tracked quarterly

**All-Time Leaderboard**
- Permanent career rankings
- Never resets
- Historical performance record

### Division Rankings

Leaderboards filtered by race class:
- **Scavenger Class** (0-2 wins)
- **Raider Class** (3-9 wins)
- **Elite Class** (10+ wins)
- **SilentKlan** (10+ wins, invitation only)

### Faction Rankings

Top performers for each faction:
- **Ultra-Rare:** UltimateMaster, Wild, Golden, Ultimate
- **Super-Rare:** Blackhole, Dead, Master
- **Rare:** Bee, Food, Box, Murder
- **Common:** Game, Animal, Industrial

### Leaderboard Stats Tracked

**Per-Bot Metrics:**
- Points (position-based: 1st=25pts, 2nd=18pts, 3rd=15pts, etc.)
- Win count & win rate percentage
- Podium finishes (Top 3)
- Average finish position
- Total races entered
- Total earnings (ICP e8s)
- Best finish achieved
- Current streak (consecutive wins/losses)
- Rank & trend (↑ Up, ↓ Down, = Stable, ★ New)
- Last race timestamp

**Career Stats:**
- Races entered
- Wins / Places (2nd) / Shows (3rd)
- Total ICP earned
- Faction reputation points
- Experience points
- Upgrade progression

### Points System

**Base Points by Position:**
- 1st Place: 25 points
- 2nd Place: 18 points
- 3rd Place: 15 points
- 4th Place: 12 points
- 5th Place: 10 points
- 6th Place: 8 points
- 7th-8th: 6 points
- 9th-10th: 4 points
- 11th+: 2 points (participation)

**Multipliers:**
- Daily Sprint: 1x
- Weekly League: 2x
- Monthly Cup: 3x
- Special Events: Varies

---

## Racing Tools

### `racing_list_races`

View upcoming wasteland races with filters:

```json
{
  "after_race_id": 100,
  "race_class": "Elite",
  "terrain": "MetalRoads",
  "has_spots": true,
  "token_index": 4079
}
```

Returns 5 races per page with full details.

### `racing_enter_race`

Enter your bot in a race:

```json
{
  "race_id": 123,
  "token_index": 4079
}
```

Pays entry fee via ICRC-2, bot enters race.

### `racing_sponsor_race`

Add ICP to race prize pool:

```json
{
  "race_id": 123,
  "amount_icp": 50.0,
  "message": "Go racers!"
}
```

---

## Post-Race Effects

After each race:

- **Battery**: -10 per race
- **Condition**: -5 per race (wear and tear)
- **Experience**: +10 XP
- **Win Count**: +1 if you placed 1st-4th
- **Career Stats**: Updated with placement and earnings

⚠️ **Remember to maintain your bot!** Low condition/battery hurts performance.

---

## Navigation

📖 [← Upgrade System](/docs/UPGRADE_SYSTEM) | 🛒 [Marketplace →](/docs/MARKETPLACE)

**See also:**
- 🔧 [Garage System](/docs/GARAGE_SYSTEM) - Maintain your bot
- ⚡ [Upgrade System](/docs/UPGRADE_SYSTEM) - Improve stats
- 🛠️ [MCP Tools](/docs/MCP_TOOLS) - Complete API reference
