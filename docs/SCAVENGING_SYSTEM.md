# Scavenging System Design

## Overview
A parallel progression path for bots that can't compete in races due to low ELO, poor condition, or lack of competitive stats. Bots venture into the wasteland on timed scavenging missions to gather parts for upgrades.

## Core Concept
**"Not fast enough to race? Send them to scrap."**

Instead of sitting idle, underperforming bots become resource gatherers. They explore dangerous wasteland zones, burning battery and taking damage while collecting salvage parts. This creates a symbiotic ecosystem where:
- Racing bots earn ICP prizes and reputation
- Scavenging bots earn parts for the garage
- Players can run mixed fleets optimized for different roles

---

## Mission Types

### 1. **Short Expedition** (1 hour)
- **Duration:** 1 hour
- **Battery Cost:** 20-35 (based on zone danger)
- **Condition Cost:** 10-20
- **Parts Yield:** 15-35 parts (RNG + bot stats influence)
- **Flavor:** "Quick sweep of nearby sectors"
- **Risk Level:** Low
- **Best For:** Bots between races, maintaining activity

### 2. **Deep Salvage** (12 hours)
- **Duration:** 12 hours
- **Battery Cost:** 35-55
- **Condition Cost:** 20-35
- **Parts Yield:** 40-80 parts (better efficiency)
- **Flavor:** "Navigate deep into the metal graveyards"
- **Risk Level:** Medium
- **Best For:** Dedicated scavenging runs, good battery reserves

### 3. **Wasteland Expedition** (24 hours)
- **Duration:** 24 hours
- **Battery Cost:** 60-85
- **Condition Cost:** 35-60
- **Parts Yield:** 100-200 parts (best efficiency)
- **Flavor:** "Journey to the forbidden zones where the old machines rest"
- **Risk Level:** High
- **Best For:** Maximum efficiency, maximum world buff potential
- **Special:** Chance for rare bonus (extra parts, longer buff duration)

---

## Scavenging Zones

Different wasteland zones with varying risk/reward profiles:

### **Scrap Heaps** (Safe)
- Battery drain: 1.0x (base)
- Condition wear: 1.0x (base)
- Parts yield: 1.0x (base)
- Flavor: "Picked-over junk piles, easy but sparse"

### **Abandoned Settlements** (Moderate)
- Battery drain: 1.2x
- Condition wear: 1.3x
- Parts yield: 1.4x
- Flavor: "Ghost towns with intact tech, guarded by territorial scavengers"

### **Dead Machine Fields** (Dangerous)
- Battery drain: 1.5x
- Condition wear: 1.8x
- Parts yield: 2.0x
- Flavor: "Battlefields of the old wars, rich salvage but unstable terrain"

### **The Void Pits** (Extreme - Blackhole Faction Bonus)
- Battery drain: 2.0x
- Condition wear: 2.5x
- Parts yield: 3.0x
- Flavor: "Where reality frays and the ancient tech still hums with void energy"
- Special: Blackhole bots take -40% condition damage here

---

## Stat Influences on Scavenging

Different stats affect scavenging outcomes:

### **Speed**
- Affects completion time variation (-10% to +0% duration at max speed)
- Fast bots finish slightly early, slow bots take full time
- Flavor: "Speed gets you in and out before trouble arrives"

### **Power Core (Efficiency)**
- Reduces battery drain (same logarithmic formula as racing)
- High power core = more missions per charge
- Flavor: "Efficient bots can venture deeper without running dry"

### **Acceleration**
- Affects escape chance from random events (hazards)
- High acceleration = avoid extra condition damage
- Flavor: "Quick reflexes dodge falling debris and hostile scavengers"

### **Stability**
- **Primary Scavenging Stat** - reduces condition wear
- High stability = less damage taken during mission
- At 100 stability: -30% condition wear
- At 50 stability: baseline
- At 30 stability: +20% condition wear
- Flavor: "Stable bots navigate treacherous terrain without breaking down"

### **Faction Bonuses**
- **Box faction:** +15% parts yield in Scrap Heaps (their natural habitat)
- **Industrial faction:** -20% battery drain (efficient scavengers)
- **Blackhole faction:** -40% condition damage in Void Pits
- **Dead faction:** +10% parts yield everywhere (affinity for broken things)
- **Golden faction:** Cannot scavenge (too pristine for dirty work)

---

## Mission Mechanics

### **Starting a Mission**
```
Tool: garage_start_scavenging
Parameters:
- token_index: Bot to send
- mission_type: "short" | "deep" | "expedition"
- zone: "scrap_heaps" | "settlements" | "machine_fields" | "void_pits"

Validation:
- Bot must have minimum battery (20 for short, 35 for deep, 60 for expedition)
- Bot must not be in another race (can upgrade/sell/repair while scavenging)
- Bot can scavenge at any condition level (even critical)
- No ICP cost - battery consumption is the economic cost

Response:
- mission_id
- expected_completion_time
- estimated_parts_range
- world_buff_chance: "15% chance for Wasteland Resonance (stat buffs)"
- warnings (if low condition/battery)
```

### **During Mission**
- Bot cannot race (locked in mission)
- Bot CAN be upgraded, repaired, recharged, or listed for sale (maintenance continues)
- Status shows: "Scavenging [Zone] - Returns in X hours"
- Mission cannot be cancelled (committed once started)
- Mission ID stored on bot's racing stats
- If sold: new owner receives bot when mission completes with all rewards

### **Completing Mission**
```
Tool: garage_complete_scavenging
Parameters:
- token_index: Bot to retrieve

Auto-executes when mission duration elapsed:
- Deducts battery (based on zone, power core, random variance)
- Deducts condition (based on zone, stability, acceleration for hazards)
- Awards parts (based on mission type, zone multiplier, faction bonus, RNG)
- Rolls for random events (positive/negative/neutral)
- Applies world buff if "Wasteland Resonance" event triggered (15% chance)
- Adds to bot's scavenging career stats
- Returns detailed breakdown of results

Response:
- parts_found: Nat
- battery_consumed: Nat
- condition_lost: Nat
- world_buff_applied: ?{stats: [Text], bonuses: [Nat], expires_in_hours: 48} (only if resonance event)
- events_encountered: [Text] (flavor events - positive/negative/neutral)
- bonus_rewards: ?Text (rare finds)
```

---

## World Buff Mechanics

### **Expiration System**
- World buffs expire **48 hours** after being earned
- Timer starts when scavenging mission completes, not when buff is applied in race
- If bot doesn't race within 48h, buff disappears (wasted)
- Encourages active play - can't indefinitely park buffed bots

### **Consumption vs Expiration**
- **Consumed:** Buff used in a race → removed after race completes
- **Expired:** 48h passed without racing → buff removed automatically
- System checks expiration on every bot stat query (getCurrentStats)

### **Strategic Timing**
Optimal buff usage:
1. Complete 24h scavenging expedition
2. Get lucky with 15% world buff proc
3. Recharge bot to low battery for overcharge (if desired)
4. Enter race within 48h to use both buffs
5. Buff consumed after race, cycle repeats

**Warning Messages:**
- When viewing bot with buff: "World buff expires in X hours"
- At 12h remaining: "⚠️ World buff expires soon! (12h remaining)"
- At 2h remaining: "🚨 World buff expires very soon! (2h remaining)"
- On expiration: "World buff has expired and been removed."

### **Why 48 Hours?**
- Long enough: Players can plan around race schedules
- Short enough: Can't hoard buffed bots indefinitely
- Balances: Competitive advantage vs active engagement
- Creates urgency: "I got a buff, better race soon!"

---

## Random Events & Flavor

During scavenging, bots can encounter hazards that affect outcomes:

### **Positive Events** (20% chance total)
- "Discovered an intact part cache" → +20% parts (10% chance)
- "Found a salvage jackpot" → +50% parts (5% chance - rare!)
- "Efficient route through the debris" → -20% battery used (10% chance)
- "Sturdy terrain, minimal wear" → -30% condition lost (10% chance)
- **"Wasteland Resonance discovered!"** → **World Buff applied** (15% chance)
  - **6h mission:** +1-3 points to one random stat for next race
  - **12h mission:** +2-4 points to two random stats for next race
  - **24h mission:** +3-6 points to three random stats for next race
  - Buff consumed after next race OR expires in 48 hours (whichever comes first)
  - Prevents parking buffed bots - use it or lose it!
  - Flavor: *"Your bot has absorbed the ancient energy of the wastes..."*

### **Negative Events** (30% chance)
- "Unstable ground collapsed" → +30% condition damage (acceleration check to avoid)
- "Lost in the wastes" → +20% battery drain
- "Scavenger gang ambush" → +40% condition damage (speed helps escape)
- "Contaminated zone" → +50% battery drain + 20% condition damage

### **Neutral Flavor** (50% chance)
- "Uneventful scavenging run, salvage collected"
- "Navigated the debris fields methodically"
- "Standard haul from the wasteland"

---

## Career Tracking

Add to `PokedBotRacingStats`:
```motoko
scavengingMissions : Nat;        // Total missions completed
totalPartsScavenged : Nat;       // Lifetime parts found
scavengingReputation : Nat;      // Separate from racing reputation
bestHaul : Nat;                  // Biggest single mission haul
activeMission : ?{               // Current mission if any
  missionId : Nat;
  missionType : ScavengingType;
  zone : ScavengingZone;
  startTime : Int;
  endTime : Int;
};
worldBuff : ?{                   // Active world buff if any
  stats : [(Text, Nat)];         // [("speed", 3), ("acceleration", 2)]
  expiresAt : Int;               // Timestamp when buff expires (48h from creation)
  appliedAt : Int;               // When the buff was earned
};
```

### **Scavenging Reputation Tiers**
- **0-99:** "Trash Picker"
- **100-499:** "Salvage Runner"
- **500-1499:** "Wasteland Scout"
- **1500-3999:** "Master Scavenger"
- **4000+:** "Legend of the Wastes"

Earn 1 reputation per mission completed (regardless of success).

---

## Economic Balance

### **Parts Yield Math**
```
Base parts for mission type:
- Short (6h): 25 parts average (4.2 parts/hour)
- Deep (12h): 60 parts average (5.0 parts/hour)  
- Expedition (24h): 150 parts average (6.25 parts/hour)

Efficiency scaling rewards longer commitment!

Multipliers:
× Zone multiplier (1.0x to 3.0x)
× Faction bonus (1.0x to 1.15x)
× Random variance (0.8x to 1.2x) (softer than before)
× Event bonus (1.0x to 1.5x if lucky)

Example (Expedition in Dead Machine Fields):
150 × 2.0 (zone) × 1.1 (Dead faction) × 1.1 (good RNG) × 1.2 (found cache)
= 150 × 2.0 × 1.1 × 1.1 × 1.2 = 436 parts
```

### **Comparison to Racing**
- **Average race:** Win = 10-30 parts, Place/Show = 5-15 parts, Loss = 0-3 parts
- **Entry fee:** 0.5-2.0 ICP
- **Scavenging cost:** No ICP fee! Only battery (which costs ICP to recharge anyway)

**Balance Goal:** 
- Racing is more lucrative for competitive bots (ICP prizes + parts + instant)
- Scavenging is reliable income for weak bots (guaranteed parts, no competition, chance at buffs)
- Scavenging efficiency peaks with stability-focused builds (creates build diversity)
- World buffs create strategic timing opportunities (24h scavenge → recharge for overcharge → race with potential double buffs)
- 15% world buff chance adds excitement without guaranteeing advantage

---

## Strategic Considerations

### **Fleet Optimization**
Players might build specialized bots:
- **Racing Champions:** High speed/acceleration, maintained at 100% condition for competition
- **Scavenger Drones:** High stability/power core, run constantly on 24h expeditions
- **Hybrid Scouts:** Balanced stats, can race OR scavenge as needed

### **Opportunity Cost**
- Scavenging locks bot for hours → can't race during that time
- If bot could win races → racing is better ROI
- If bot can't compete → scavenging is only way to contribute

### **Synergy with Upgrades**
- Scavenging provides parts for upgrading racing bots
- Upgraded racing bots earn ICP to buy more scavenger bots
- Creates economic flywheel for active players

---

## UI/UX Considerations

### **Bot Status Display**
```
Status: "Scavenging Expedition - Dead Machine Fields"
Returns: "12h 34m" (countdown timer)
Expected Haul: "60-120 parts"
Current Condition: Hidden (locked during mission)
```

### **Mission Selection Interface**
Show comparison table:
```
┌──────────────┬──────────┬────────────┬───────────┬────────────┬────────────────────┐
│ Mission      │ Duration │ Battery    │ Condition │ Parts Yield│ Buff Potential     │
├──────────────┼──────────┼────────────┼───────────┼────────────┼────────────────────┤
│ Short        │ 6h       │ 20-35      │ 10-20     │ 15-35      │ 15%: +1-3pts (1stat)│
│ Deep         │ 12h      │ 35-55      │ 20-35     │ 40-80      │ 15%: +2-4pts (2stats)│
│ Expedition   │ 24h      │ 60-85      │ 35-60     │ 100-200    │ 15%: +3-6pts (3stats)│
└──────────────┴──────────┴────────────┴───────────┴────────────┴────────────────────┘

Your bot (Stability: 72, Power Core: 58):
✓ Reduced condition wear: -15%
✓ Reduced battery drain: -25%
```

### **Completion Notification (with World Buff)**
```
🔧 Scavenging Complete!

PokedBot #4079 has returned from the Dead Machine Fields!

Parts Found: 187 (+40% from cache discovery!)
Battery Used: 68 (-12 from high power core)
Condition Lost: 35 (-15 from high stability)

✨ WASTELAND RESONANCE DISCOVERED! ✨
Your bot has absorbed ancient wasteland energy!

World Buff Applied:
✨ Speed +5 (next race only)
✨ Acceleration +4 (next race only)
✨ Stability +3 (next race only)

⏰ Buff expires in 48 hours if unused!

Events:
• Discovered intact part cache (+40% parts)
• Dodged unstable terrain (acceleration check: PASS)
• ⚡ WASTELAND RESONANCE ⚡ (15% chance - lucky!)

Total Scavenging Missions: 47
Reputation: Master Scavenger (Tier 4)
```

### **Completion Notification (no World Buff)**
```
🔧 Scavenging Complete!

PokedBot #4079 has returned from the Scrap Heaps.

Parts Found: 28
Battery Used: 32
Condition Lost: 18

Events:
• Uneventful scavenging run, salvage collected

Total Scavenging Missions: 48
Reputation: Master Scavenger (Tier 4)
```

---

## Wasteland Lore Integration

### **Flavor Text by Zone**

**Scrap Heaps:**
> "The outer wastes. Mountains of twisted metal and broken dreams. Every scavenger's first hunting ground, picked clean a thousand times over. But there's always something left if you know where to look."

**Abandoned Settlements:**
> "Ghost towns from the before-times. Radiation's mostly gone, but the automated defenses aren't. Quick bots slip in, grab what they can, and get out before the turrets wake up."

**Dead Machine Fields:**
> "Where the titan-wars ended. Colossal war machines lie half-buried in the sand, their fusion cores still hot after centuries. Rich pickings for those brave (or desperate) enough to risk it."

**The Void Pits:**
> "Places where reality broke during the Blackhole Incident. Time doesn't flow right. Machines from futures that never happened lie scattered in impossible configurations. Only the void-touched dare venture here."

### **Scavenger Ranks Flavor**
- **Trash Picker:** "You paw through garbage. It's honest work."
- **Salvage Runner:** "You know the safe routes and the dangerous ones."
- **Wasteland Scout:** "The wastes speak to you. You hear where the good salvage hides."
- **Master Scavenger:** "Legends say you once found a pristine pre-war fusion core."
- **Legend of the Wastes:** "They say you've seen the Deep Void and returned unchanged. They say a lot of things."

---

## Implementation Phases

### **Phase 1: Core System (MVP)**
- All 3 mission types (6h/12h/24h)
- Single zone (Scrap Heaps) with 1.0x multiplier
- Basic stat influences (stability reduces condition loss, power core reduces battery)
- Simple parts calculation with random event system
- 15% chance for world buff event (Wasteland Resonance)
- Two MCP tools: `garage_start_scavenging`, `garage_complete_scavenging`
- World buff tracked on bot (if triggered), consumed after next race or 48h expiration
- Auto-cleanup of expired buffs when checking bot stats

### **Phase 2: Zones & Missions**
- Add all 3 mission types
- Add all 4 zones with multipliers
- Implement faction bonuses
- Random events system

### **Phase 3: Career & Progression**
- Scavenging reputation tracking
- Career stats on bot profile
- Leaderboard for best scavengers
- Achievement system

### **Phase 4: Advanced Features**
- Mission bundles (send multiple bots)
- Zone discovery (unlock harder zones with reputation)
- Rare artifact drops (tradeable NFTs?)
- Scavenger guilds (team missions)

---

## Open Questions

1. **Should scavenging compete with racing for bot time?**
   - YES: Forces strategic choice (race vs scavenge)
   - Creates more interesting fleet management
   
2. **Should there be scavenging-only bots (can't race)?**
   - Interesting design space: bots below certain ELO threshold can only scavenge
   - Creates clear role separation
   
3. **Should parts be fungible or zone-specific?**
   - Fungible: Simpler, all parts are equal
   - Zone-specific: "Void parts" for Blackhole upgrades, etc. (more complex but flavorful)
   
4. **Can damaged bots scavenge?**
   - YES (current design): Even critical bots can scavenge, they just take MORE damage
   - Makes scavenging a "desperation" option for damaged fleets
   
5. **Should there be social features?**
   - Shared scavenging spots (first to complete gets bonus)
   - Cooperative missions (pool bots for big haul)
   - Scavenger market (trade parts directly)

---

## Success Metrics

- **Adoption:** % of bots that have completed at least 1 scavenging mission
- **Fleet Diversity:** % of players running both racers and scavengers
- **Economic Health:** Parts earned via scavenging vs racing (target: 40/60 split)
- **Engagement:** Average scavenging missions per active bot per week
- **Retention:** Do scavenging bots keep players engaged between races?

---

## Final Thoughts

This system transforms "weak" or "damaged" bots from liabilities into assets. Instead of benching a bot with 20% condition and 1200 ELO, send it on a scavenging run. The wasteland doesn't care if you're fast—only if you're tough enough to survive.

It also creates interesting meta-strategy: Do you maintain a pristine racing stable, or run a scrappy operation with battle-worn scavengers funding your champions? Both paths viable, both flavorful, both engaging.

**Core Philosophy:** *Every bot has value. Fast ones race. Tough ones scavenge. Smart players use both.*
