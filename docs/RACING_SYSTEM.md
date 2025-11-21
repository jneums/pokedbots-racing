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
- **Entry Fee**: 5-50 ICP based on class
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
- **Silent Klan Invitational**: Only God Class & Masters allowed
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
  
  // Apply faction special abilities
  factionBonus = match robot.faction:
    Battle Bot => if (terrain == ScrapHeaps) then 1.08 else 1.0
    Entertainment Bot => 1.03  // Always slight edge (crowd favorites)
    Wild Bot => 1.0 + random() * 0.15  // Extremely unpredictable
    God Class => 1.10  // Superior in all conditions
    Masters => if (race.class == Elite) then 1.12 else 1.05
  
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

## Faction Bonuses in Races

### Battle Bots 🎮
- **+8% performance** on Scrap Heaps terrain
- Tough and reliable in garbage mountains

### Entertainment Bots 🎭
- **+3% performance** in all races
- Crowd favorites with consistent showmanship

### Wild Bots ⚡
- **+0-15% random variance**
- Can dominate or crash spectacularly
- High risk, high reward

### God Class 👑
- **+10% performance** in all conditions
- Engineered superiority shows

### The Masters 🌙
- **+12% performance** in Elite Class races
- **+5% performance** in all other races
- Excel under pressure

---

## Race Calendar

### Daily Races
- **Scavenger Sprints**: 5km, low entry (50 ICP)
- **Raider Runs**: 10km, medium entry (100 ICP)

### Weekly Events
- **Elite Wasteland Circuit**: 20km, high entry (300 ICP)
- **Faction Championships**: Restricted by faction

### Monthly Specials
- **Silent Klan Invitational**: 30km, God Class & Masters only (500 ICP)
- **Garbage Tower Grand Prix**: 25km, all factions (400 ICP)

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

### Global Rankings
- Top racers by win count
- Top earners by total ICP won
- Win rate percentage leaders

### Faction Rankings
- Best Battle Bots
- Best Entertainment Bots
- Best Wild Bots
- Best God Class
- Best Masters

### Career Stats Tracking
- Races entered
- Wins / Places / Shows
- Total ICP earned
- Best finish times per terrain
- Faction reputation points

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
