# Competitive Scavenging: Territory Wars Proposal

## Executive Summary

After thoroughly investigating the current scavenging system, I've identified several pathways to transform it into a more competitive, strategy-game-like experience. The existing infrastructure already provides strong foundations for competition:

- **Faction system** with 14 distinct factions (natural team divisions)
- **Zone system** with 3 scavenging zones (potential territories)
- **Parts economy** (resources worth competing over)
- **Stat-based efficiency** (strategic tradeoffs)

This document outlines how to evolve scavenging from passive resource gathering into an active competitive territory control game.

---

## Current System Analysis

### What We Have Now
```
┌─────────────────────────────────────────────────────────────┐
│ CURRENT SCAVENGING MODEL                                     │
├─────────────────────────────────────────────────────────────┤
│ • Solo activity (no player-vs-player interaction)           │
│ • Time-based rewards (more time = more parts)               │
│ • Zone selection affects risk/reward                        │
│ • Faction bonuses give different advantages                 │
│ • No resource scarcity (unlimited parts available)          │
│ • No competition for zones                                  │
└─────────────────────────────────────────────────────────────┘
```

### Data Infrastructure Available
- `ScavengingZone` enum: ScrapHeaps, AbandonedSettlements, DeadMachineFields
- `FactionType` enum: 14 factions with rarity tiers
- `activeMission` tracking per bot
- Zone multipliers (parts, battery, condition)
- Faction-specific bonuses per zone
- User inventory (parts storage)
- Career tracking (missions completed, total parts)

---

## Proposal: Wasteland Territory Wars

### Core Concept
Transform the 3 scavenging zones into **contestable territories** that factions compete to control. Control provides resource bonuses, but requires active presence and defense.

### Key Design Principles
1. **Faction-based teams**: Natural groupings already exist
2. **Asynchronous competition**: Players don't need to be online simultaneously
3. **Meaningful but not punishing**: Losers still get baseline rewards
4. **Strategic depth**: Multiple ways to contribute and compete
5. **Leverage existing mechanics**: Build on what's already coded

---

## Detailed Mechanics

### 1. Zone Control System

#### Zone State
```motoko
public type ZoneControlState = {
  zone : ScavengingZone;
  controllingFaction : ?FactionType;      // Null = contested/neutral
  controlPoints : Map<FactionType, Nat>;  // Faction -> influence points
  contestedSince : ?Int;                   // When control became contested
  lastControlChange : Int;                 // When faction last took over
  
  // Resource pool (regenerates, depletes with activity)
  currentResourcePool : Nat;               // Depletable per-cycle
  maxResourcePool : Nat;                   // Resets each cycle
  poolDepletionRate : Float;               // How fast pool shrinks with activity
  
  // Active presence
  botsInZone : Map<FactionType, [Nat]>;   // Faction -> token indices
  factionPowerInZone : Map<FactionType, Float>;  // Combined bot power
};
```

#### Control Mechanics
- **Presence = Influence**: Each bot scavenging in a zone generates influence for their faction
- **Power = Stats**: Bot effectiveness determined by stats (Stability especially)
- **Time = Commitment**: Longer scavenging = more influence generation
- **Thresholds**: Need >50% of total zone influence to claim control

### 2. Resource Scarcity (Competitive Element)

#### Depleting Resource Pools
Instead of infinite parts, each zone has a **resource pool** that depletes:

```
Zone Resource Cycle (24 hours):
┌─────────────────────────────────────────────────────────────┐
│ Cycle Start: Zone pool = 10,000 parts (ScrapHeaps)          │
│                        = 8,000 parts  (Settlements)          │
│                        = 5,000 parts  (DeadMachineFields)   │
├─────────────────────────────────────────────────────────────┤
│ During Cycle:                                                │
│ • Each scavenging bot claims share of remaining pool        │
│ • Controlling faction gets +25% share bonus                  │
│ • Pool depletes as parts are extracted                       │
│ • When pool < 20%, yields drop significantly                 │
│ • Early arrivers get more, latecomers get scraps            │
├─────────────────────────────────────────────────────────────┤
│ Cycle Reset: Pool regenerates, control points decay 20%     │
└─────────────────────────────────────────────────────────────┘
```

#### Why This Creates Competition
- **First mover advantage**: Get your bots in early for bigger shares
- **Faction coordination**: Multiple bots = faster pool depletion = deny rivals
- **Strategic timing**: Balance early entry vs. waiting for depleted zones to reset
- **Defense incentive**: Control bonus makes holding zones valuable

### 3. Faction Wars Framework

#### Territory Bonuses (for controlling faction)
```
Zone Control Rewards:
┌────────────────────────┬─────────────────────────────────────┐
│ ScrapHeaps             │ +25% parts, +5% world buff chance   │
│ AbandonedSettlements   │ +30% parts, -10% battery drain      │
│ DeadMachineFields      │ +40% parts, exclusive rare drops    │
└────────────────────────┴─────────────────────────────────────┘
```

#### Control Thresholds
```
Influence Distribution Example:
Dead faction:     4,200 points (42%) ← CONTROLLING
Blackhole:        2,800 points (28%)
Industrial:       1,500 points (15%)
Others:           1,500 points (15%)
─────────────────────────────────────
Total:           10,000 points

Dead controls because >40% AND >1.5x second place
If no faction meets threshold → zone is CONTESTED (no bonus)
```

#### Contested Zone Rules
- No faction bonuses apply
- Resource pool depletes 50% faster (chaos and inefficiency)
- Creates incentive to establish clear control

### 4. New Zone Mechanics

#### Zone Hazards (PvP-lite)
Controlling faction can "fortify" zones with defenses:

```motoko
public type ZoneHazard = {
  #Turrets;       // -10% condition to rival faction bots
  #JammingField;  // -15% parts yield for rivals
  #Minefield;     // 5% chance per hour: -20 condition event
  #DrainField;    // +10% battery consumption for rivals
};
```

- Hazards cost control points to deploy
- Create asymmetric advantages
- Rival factions can counter with specific bot stats

#### Zone Events (Timed Competitions)
```
RESOURCE SURGE EVENT (random, 2-4 hour windows)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 Dead Machine Fields is SURGING!

• Zone pool temporarily TRIPLED
• World buff chance doubled
• Rare battery drop rates +100%

⚠️ Control is RESET - all factions start equal!
⚠️ Surge ends in 3h 42m

This creates sprint competitions for control of temporarily
valuable zones.
```

### 5. Faction Leaderboards & Rewards

#### Weekly Territory Wars Results
```
WASTELAND DOMINANCE - Week 47
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

#1 🏆 Dead Faction
   Zones controlled: 2.4 average
   Total influence: 847,293
   Parts extracted: 124,892
   ➜ Reward: +15% parts bonus ALL zones next week

#2 🥈 Industrial Faction  
   Zones controlled: 1.8 average
   Total influence: 612,847
   Parts extracted: 98,234
   ➜ Reward: +10% parts bonus next week

#3 🥉 Blackhole Faction
   Zones controlled: 1.2 average
   Total influence: 489,221
   Parts extracted: 76,432
   ➜ Reward: +5% parts bonus next week

WEEKLY PRIZE POOL: 50 ICP
#1: 25 ICP split among faction members
#2: 15 ICP split among faction members  
#3: 10 ICP split among faction members
```

### 6. Individual Competition Within Factions

#### Faction Contribution Tracking
```motoko
public type FactionContributor = {
  principal : Principal;
  tokenIndices : [Nat];  // Bots contributing
  influenceGenerated : Nat;
  partsExtracted : Nat;
  hoursScavenged : Float;
  hazardsTriggered : Nat;  // Times your bots hit enemy hazards (badge of honor)
};
```

#### Faction MVP System
- Top contributors earn special titles
- "Warlord of the Wastes" - most influence generated
- "Resource Baron" - most parts extracted
- "Frontline Fighter" - most hours in contested zones

---

## Implementation Approach

### Phase 1: Resource Pools (Minimal Change)
**Effort: Low | Impact: Medium**

Add depletable resource pools to zones:
- Zone pool regenerates daily
- Parts yields scale with remaining pool
- Creates natural first-mover competition
- NO faction control yet, just scarcity

```motoko
// Add to existing zone tracking
var zoneResourcePools : Map<ScavengingZone, Nat> = Map.new();

// Modify parts calculation
func calculatePartsYield(baseYield: Nat, zone: ScavengingZone) : Nat {
  let poolRemaining = Map.get(zoneResourcePools, zone);
  let depletionFactor = Float.min(1.0, poolRemaining / maxPool * 1.5);
  return Nat.max(1, Int.abs(Float.toInt(baseYield * depletionFactor)));
};
```

### Phase 2: Zone Influence Tracking
**Effort: Medium | Impact: High**

Track which factions have bots in each zone:
- Count active bots per faction per zone
- Calculate influence based on time + stats
- Display zone "ownership" percentages
- No rewards yet, just visibility

### Phase 3: Control Rewards
**Effort: Medium | Impact: High**

Add bonuses for controlling factions:
- +25% parts for controlling faction in zone
- Weekly tallying of control hours
- Faction leaderboard

### Phase 4: Hazards & Events
**Effort: High | Impact: Very High**

Full territory wars with:
- Deployable hazards
- Surge events
- Prize pools

---

## Alternative Lighter Approaches

If full territory control is too complex, here are simpler competitive options:

### Option A: Scavenging Races
```
DAILY SCAVENGING RACE
"Who can extract the most from Dead Machine Fields today?"

• 24-hour competition window
• Track parts extracted per faction
• Winning faction gets +20% bonus next day
• Individual top 10 get cosmetic titles
```

### Option B: Zone Rush Events
```
ZONE RUSH - Starts in 2 hours!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
First 50 bots to complete a scavenging mission in
AbandonedSettlements earn DOUBLE parts!

Registered: 127 bots
Your bots in queue: Bot #4829, Bot #3211
```

### Option C: Faction Quotas
```
WEEKLY FACTION CHALLENGE
━━━━━━━━━━━━━━━━━━━━━━━━━
Can Dead faction collectively extract 100,000 parts?

Progress: ████████░░ 78,234 / 100,000

Reward if met: All Dead bots get +1 Stability permanently
Days remaining: 3
```

---

## Economic Considerations

### Current Balance
- Scavenging: ~10-25 parts/hour depending on zone
- Racing: Variable ICP, requires entry fees
- Parts → Upgrades → Better racing performance

### With Competition
- Winning factions: 30-40 parts/hour equivalent
- Losing factions: 8-15 parts/hour (still viable)
- Creates ~2-3x variance based on competition

### Why This Works
1. **Losers still progress** - baseline rewards ensure no one is locked out
2. **Winners accelerate** - meaningful advantage without domination
3. **Faction balance** - rarer factions naturally coordinate better (fewer players)
4. **Dynamic meta** - dominant strategies shift as players adapt

---

## Technical Feasibility Assessment

### What's Already Built ✅
- Zone system with multipliers
- Faction tracking per bot
- Mission start/complete flow
- Parts inventory system
- Time-based accumulation

### What Needs Building 🔨
- Zone state tracking (pools, control)
- Cross-bot aggregation per zone
- Faction influence calculations
- Control threshold logic
- Leaderboard queries

### Data Migration ⚠️
- Existing missions would be grandfathered
- New pool system activates on next cycle
- No breaking changes to current players

### Performance Considerations
- Zone state queries: O(1) with proper indexing
- Influence updates: Can be batched every 15 min (already doing accumulation)
- Leaderboards: Calculated async, cached

---

## Conclusion

The current scavenging system has excellent foundations for competitive expansion. The most impactful change with lowest effort is **resource scarcity via depletable pools**. This single change creates natural competition without complex faction control mechanics.

For full "territory wars" strategy gameplay, the phased approach allows iterative development while keeping the game playable at each stage.

**Recommended First Step**: Implement Phase 1 (Resource Pools) and gauge player reaction before committing to full territory control.

---

## Open Questions for Discussion

1. **Should small factions get handicaps?** (e.g., UltimateMaster's 1 bot vs Industrial's 2009)
2. **How to handle inactive factions?** (No players = free territory?)
3. **Cross-faction alliances?** (Allow temporary cooperation?)
4. **Solo player experience?** (Still fun if you're the only one in your faction online?)
5. **Reset frequency?** (Daily? Weekly? Seasonal?)
