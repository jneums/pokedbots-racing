# Luck System Design - "Your Underdog's Day is Coming"

## Overview

A luck system that adds excitement and unpredictability to races without removing skill-based outcomes. Think WoW's critical hit system: luck INCREASES your ceiling, not just adds variance.

## Core Design Principles

1. **Stats Still Matter**: Better bots still win most of the time
2. **Increased Range, Not Just Variance**: Luck allows breakthrough performances, not just random swings
3. **Underdog Energy**: Lower-rated bots get more luck potential (but still can't dominate higher tiers)
4. **Daily Cosmic Events**: Each day has a wasteland phenomenon that benefits certain bots
5. **Watchability**: Make races exciting to watch with mid-race incidents

---

## 1. Luck as a Fifth Stat

### Implementation

**Luck Stat (0-100)**:
- Derived from token index (birthdate affinity)
- Can be upgraded like other stats (instant, ICP/parts cost)
- Formula: `baseLuck = (tokenIndex % 100) + traitInfluences`

**Trait Influences on Luck**:
```motoko
// Wings/Jet Pack trait: lucky charms, totems, amulets, trinkets (+15-20)
// Body trait: lucky symbols, patterns, gold plating (+10-15)
// Arms trait: dice, cards, coins (+5-10)
// Driver Guy trait: gamblers, risk-takers, wild pilots (+10-15)
// Base range: 10-50 (to match actual stat distributions)
```

**Note**: Faction bonuses are handled through existing faction mechanics, not separate luck bonuses.

---

## 2. Daily Cosmic Events (Wasteland Astrology)

### 13 Daily Phenomena (Cycle every 13 days)

Each day, a different wasteland phenomenon provides benefits to bots with matching **affinities**.

| Day | Phenomenon | Description | Favors Bots With |
|-----|-----------|-------------|------------------|
| **1** | **Solar Flare** | Electromagnetic chaos energizes power cores | Power % 10 == 7/3/9, Even token indices |
| **2** | **Rust Storm** | Debris field favors stable navigation | Stability % 10 == 2/8/4/6, token % 13 == 2 |
| **3** | **Metal Resonance** | Ancient roads sing with speed | Speed % 10 == 3/1/7, Prime number tokens |
| **4** | **Gravity Flux** | Acceleration bursts from warped space | Accel % 10 == 4/0/8, token % 4 == 0 |
| **5** | **Scrap Tornado** | Chaos favors the wild and lucky | Wild faction (5 bots), token % 100 < 20 |
| **6** | **Dead Zone** | Stillness empowers the Dead | Dead faction (382 bots), token contains 6/66/13 |
| **7** | **Golden Hour** | Fortune favors the golden | Golden faction (27 bots), token % 7 == 0 |
| **8** | **Machine Ghost** | Ancient spirits guide elites | Ultimate/Master/Ultimate-master (686 bots), token > 5000 |
| **9** | **Blood Moon** | Aggression reigns in darkness | Murder faction (999 bots), token % 9 == 0 |
| **10** | **Binary Surge** | Digital perfection favors balance | Balanced stats (all 4 within 5 of each other) |
| **11** | **Chaos Pulse** | Pure randomness rewards all | Everyone equal, pure token-based (token % 11 == 0) |
| **12** | **Underdog Rising** | The weak inherit the wasteland | BRACKET underdogs (avg%10 ≤ 4), token % 12 == 0 |
| **13** | **Singularity** | Gravity warps reality | Blackhole faction (244 bots), token % 13 == 0 |

### Affinity Calculation

```motoko
// Each bot gets an "affinity score" for the current day (0-100)
// Uses MODULO on stats so ALL race classes can benefit equally!
func calculateDailyAffinity(
  bot: PokedBotRacingStats,
  dayOfYear: Nat,
  baseStats: RacingStats
) : Nat {
  let phenomenon = dayOfYear % 13;
  var affinity : Nat = 0;
  
  switch (phenomenon) {
    case (0) { // Solar Flare - Power Core pattern
      let digit = baseStats.powerCore % 10;
      if (digit == 7) { affinity += 60 }        // Lucky 7
      else if (digit == 3 or digit == 9) { affinity += 40 }  // Odd energy
      else if (digit == 0 or digit == 5) { affinity += 25 }; // Round numbers
      if (bot.tokenIndex % 2 == 0) { affinity += 30 }; // Even token bonus
    };
    case (1) { // Rust Storm - Stability pattern
      let digit = baseStats.stability % 10;
      if (digit == 2 or digit == 8) { affinity += 60 }  // Balanced
      else if (digit == 4 or digit == 6) { affinity += 40 }  // Even
      else if (digit == 0) { affinity += 25 }; // Grounded
      if (bot.tokenIndex % 13 == 2) { affinity += 40 };
    };
    case (2) { // Metal Resonance - Speed pattern
      let digit = baseStats.speed % 10;
      if (digit == 3) { affinity += 60 }  // Resonant frequency
      else if (digit == 1 or digit == 7) { affinity += 40 }  // Harmonic
      else if (digit == 9) { affinity += 25 }; // Near-resonant
      if (isPrime(bot.tokenIndex)) { affinity += 45 }; // Prime is rare
    };
    case (3) { // Gravity Flux - Acceleration pattern
      let digit = baseStats.acceleration % 10;
      if (digit == 4) { affinity += 60 }  // Flux frequency
      else if (digit == 0 or digit == 8) { affinity += 40 }  // Even lift
      else if (digit == 2 or digit == 6) { affinity += 25 }; // Partial flux
      if (bot.tokenIndex % 4 == 0) { affinity += 35 };
    };
    // ... etc for remaining 9 phenomena (faction/token based)
  };
  
  // Cap at 100
  Nat.min(affinity, 100);
};
```

### Daily Event Effects

When a bot has high affinity (60+) on their matching day:
- **+10% performance boost** on matching stat
- **+15% luck proc chance** (see below)
- **Cosmic commentary**: "Bot #4829 seems blessed by the Chaos Pulse today!"

---

## 3. Luck Proc System (Critical Hits)

### How Luck Works in Races

**Per-Segment Luck Checks**:
```motoko
// Each segment, bot has a chance to proc a "lucky moment"
func checkLuckProc(
  luck: Nat,
  segmentPerformance: Float, // Current 0.80-1.20
  dailyAffinity: Nat,
  position: Nat, // Current position in race
  totalRacers: Nat
) : ?LuckProc {
  let baseLuckChance = Float.fromInt(luck) / 500.0; // 0% at 0 luck, 20% at 100 luck
  
  // Underdog bonus: lower positions get more luck chance
  let positionMultiplier = if (position > totalRacers / 2) {
    1.0 + (Float.fromInt(position - totalRacers / 2) / Float.fromInt(totalRacers)) * 0.5;
  } else { 1.0 }; // Up to +50% for dead last
  
  // Daily affinity bonus
  let affinityBonus = Float.fromInt(dailyAffinity) / 500.0; // 0-20% bonus
  
  let totalLuckChance = baseLuckChance * positionMultiplier + affinityBonus;
  
  // Roll the dice
  let roll = randomFloat(seed);
  
  if (roll < totalLuckChance) {
    ?determineLuckProc(luck, dailyAffinity, segmentPerformance);
  } else { null };
};
```

### Types of Luck Procs

**Tier 1 - Minor Fortune (60% of procs)**:
- **+15% segment speed** - "Bot catches a tailwind!"
- **+10% next segment** - "Bot finds smooth patch!"
- **Dodge debris** - "Lucky dodge saves time!"

**Tier 2 - Major Breakthrough (30% of procs)**:
- **+25% segment speed** - "Bot discovers a shortcut!"
- **+15% for 3 segments** - "Bot catches second wind!"
- **Slipstream immunity** - "Bot finds clean air!"

**Tier 3 - Legendary Moment (10% of procs)**:
- **+40% segment speed** - "INCREDIBLE! Bot phases through debris!"
- **+20% for 5 segments** - "Bot enters FLOW STATE!"
- **Pass 2 positions instantly** - "Bot warps past opponents!"

```motoko
func determineLuckProc(luck: Nat, affinity: Nat, currentPerf: Float) : LuckProc {
  let luckTier = (luck + affinity) / 2; // 0-100
  let tierRoll = randomNat(100);
  
  if (tierRoll < 10 and luckTier > 70) {
    // Legendary (10%, needs high luck)
    #Legendary { 
      boost = 1.40; // +40% this segment
      duration = 5;
      description = "FLOW STATE ACTIVATED!";
    };
  } else if (tierRoll < 40 and luckTier > 50) {
    // Major (30%, needs decent luck)
    #Major {
      boost = 1.25;
      duration = 3;
      description = "Caught a massive tailwind!";
    };
  } else {
    // Minor (60%, anyone can get)
    #Minor {
      boost = 1.15;
      duration = 1;
      description = "Lucky dodge!";
    };
  };
};
```

---

## 4. Race Incidents & Commentary

### Random Mid-Race Events

**Good Incidents** (Triggered by luck procs):
- "Bot #4829 discovered a hidden shortcut through the scrap piles!"
- "Bot #1337 catches a solar flare boost - LOOK AT THAT ACCELERATION!"
- "Bot #6969 enters the flow state - this is legendary!"

**Bad Incidents** (Lower luck = higher chance):
- "Bot #2000 hit debris - loses momentum!" (-10% for 2 segments)
- "Bot #5555 engine sputter - needs to recover!" (-15% for 1 segment)
- "Bot #9999 navigation error - off the line!" (-20% this segment)

**Neutral Drama**:
- "Intense battle for 3rd between #4829 and #1337!"
- "Leader pulling away... or is that #6969 closing the gap?!"
- "THIS IS ANYONE'S RACE!"

### Commentary System Enhancement

```motoko
// Add luck-based events to existing race events
type RaceEventType = {
  // Existing events
  #Overtake : { ... };
  #LeadChange : { ... };
  
  // New luck events
  #LuckProc : { 
    bot: Text; 
    procType: LuckProcType; // Minor/Major/Legendary
    description: Text;
  };
  #BadLuck : {
    bot: Text;
    incident: Text;
    penalty: Float;
  };
  #CosmicBlessing : {
    bot: Text;
    phenomenon: Text;
    affinityScore: Nat;
  };
};
```

---

## 5. Implementation Phases

### Phase 1: Core Luck Stat (Week 1)
- [x] Add `luck: Nat` to `RacingStats`
- [ ] Derive base luck from token index + traits
- [ ] Add luck to upgrade system (same mechanics as other stats)
- [ ] Display luck stat in garage/marketplace

### Phase 2: Daily Phenomena (Week 2)
- [ ] Implement 13-day cycle system
- [ ] Add `calculateDailyAffinity()` function
- [ ] Create daily event banner on website ("Today: Solar Flare ☀️")
- [ ] Show each bot's affinity score for current day

### Phase 3: Luck Proc System (Week 3)
- [ ] Implement per-segment luck checks in `RacingSimulator.mo`
- [ ] Add luck proc types (Minor/Major/Legendary)
- [ ] Integrate luck boosts into segment time calculation
- [ ] Track luck events for race commentary

### Phase 4: Race Incidents (Week 4)
- [ ] Add bad luck incidents (lower luck = higher chance)
- [ ] Enhance commentary system with luck narratives
- [ ] Add luck-based race events to results
- [ ] Frontend: Animate luck procs in race visualizer

### Phase 5: Balance & Polish (Week 5)
- [ ] Tune luck proc chances (don't want too many)
- [ ] Ensure underdogs can't dominate higher tiers
- [ ] Add luck-based achievements/badges
- [ ] Collect data on luck impact (should be ~10-15% of race outcomes)

---

## 6. Balance Guidelines

### Success Criteria
- **Top tier bot vs low tier bot**: Top tier should still win 85-90% (currently ~90%)
- **Equal tier bots**: Luck should decide ~25-30% of outcomes
- **Underdog victories**: Should happen ~5-10% more often with luck system
- **Daily affinity**: Should make ~5% difference in win rate on your day

### Stat Context (Actual Distribution)
- **Most bots (54%)**: 10-19 average stats (Scrap class)
- **Upper tier (39%)**: 20-29 average stats (Junker class)
- **Elite (6.5%)**: 30-39 average stats (Raider class)
- **Top tier (0.6%)**: 40-49 average stats (Elite class)
- **Legendary (0.1%)**: 50+ average stats (SilentKlan)

### Why Modulo for Stat Affinity?
Using `stat % 10` instead of minimum thresholds ensures:
- A **Scrap bot** with Power Core 7 gets +60 affinity on Solar Flare (7 % 10 == 7)
- An **Elite bot** with Power Core 47 ALSO gets +60 affinity (47 % 10 == 7)
- Every race class has ~10% of bots with the "jackpot digit"
- No class is excluded from stat-based phenomena

### Luck Effectiveness by Stat Level
```
Luck 10-20: Rare procs (5% per segment), minor only
Luck 21-35: Moderate procs (10% per segment), major possible
Luck 36-50: Frequent procs (15% per segment), legendary possible
Luck 51+: Very frequent (20% per segment), legendary more common (via upgrades)
```

### Underdog Multiplier
```
Position 1-3: 1.0x luck chance (no bonus)
Position 4-6: 1.2x luck chance
Position 7-9: 1.4x luck chance
Position 10-12: 1.5x luck chance (max)
```

This ensures last place has ~30% MORE luck procs than leaders, but doesn't guarantee victory.

---

## 7. User-Facing Features

### Garage Display
```
📊 Stats (Current/Max):
   SPD: 85/100 | PWR: 72/100 | ACC: 90/100 | STB: 65/100
   🍀 LUCK: 78/100 (Wild faction + High Wings trait)

🌟 Daily Affinity:
   Today: Chaos Pulse (Day 11)
   Your Affinity: 85/100 ⭐ STRONG MATCH
   Bonus: +15% luck proc chance, +10% acceleration
```

### Race Entry Screen
```
⚠️ Today's Phenomenon: SOLAR FLARE ☀️
   Best for: High Power Core, Even token numbers
   
Bot #4829's Affinity: 92/100 ⭐⭐⭐ COSMIC ALIGNMENT!
Predicted boost: +10% Power Core, +15% luck
```

### Race Results Commentary
```
🎰 Lucky Moments:
   Segment 3: Bot #4829 discovers shortcut! (+25% speed)
   Segment 7: Bot #4829 catches FLOW STATE! (+20% for 5 segments)
   Segment 12: Bot #1337 hits debris (-15% speed)

🌟 Cosmic Blessing:
   Bot #4829 was blessed by today's Chaos Pulse!
   Daily Affinity: 92/100 - Lucky devil! 🍀
```

### Leaderboard Stats
```
Top Lucky Bots This Week:
1. Bot #4829 - 23 Major Procs, 3 Legendary
2. Bot #6969 - 19 Major Procs, 2 Legendary
3. Bot #1337 - 18 Major Procs, 1 Legendary

Most Blessed by Cosmos:
1. Bot #4829 - 5 cosmic alignment days hit
2. Bot #7777 - 4 cosmic alignment days
```

---

## 8. Technical Implementation Details

### Data Structure Changes

```motoko
// Add to RacingStats
public type RacingStats = {
  speed : Nat;
  powerCore : Nat;
  acceleration : Nat;
  stability : Nat;
  luck : Nat; // NEW
};

// Add to PokedBotRacingStats
type PokedBotRacingStats = {
  // ... existing fields
  
  // Luck system
  luckBonus : Nat;
  luckUpgrades : Nat;
  
  // Stats tracking
  totalLuckProcs : Nat;
  legendaryProcs : Nat;
  cosmicAlignmentDays : Nat;
};

// New types
public type DailyPhenomenon = {
  #SolarFlare;
  #RustStorm;
  #MetalResonance;
  #GravityFlux;
  #ScrapTornado;
  #DeadZone;
  #GoldenHour;
  #MachineGhost;
  #BloodMoon;
  #BinarySurge;
  #ChaosPulse;
  #MomentumShift;
  #BlackholeSingularity;
};

public type LuckProcType = {
  #Minor : { boost: Float; duration: Nat };
  #Major : { boost: Float; duration: Nat };
  #Legendary : { boost: Float; duration: Nat };
};

public type LuckEvent = {
  bot : Text;
  segmentIndex : Nat;
  procType : LuckProcType;
  dailyAffinity : Nat;
};
```

### Simulator Integration

```motoko
// In calculateSegmentTime():

// After calculating base segment time and slipstream...

// Check for luck proc
let dailyAffinity = calculateDailyAffinity(
  racer.participant.stats,
  race.createdAt,
  currentPosition,
);

let luckCheck = checkLuckProc(
  racer.participant.stats.luck,
  segmentPerformance,
  dailyAffinity,
  currentPosition,
  participants.size(),
  segmentSeed,
);

let luckBoost = switch (luckCheck) {
  case (?#Minor(proc)) { 
    // Track event for commentary
    events := Array.append(events, [createLuckEvent(racer, proc)]);
    proc.boost;
  };
  case (?#Major(proc)) { 
    events := Array.append(events, [createLuckEvent(racer, proc)]);
    proc.boost;
  };
  case (?#Legendary(proc)) { 
    events := Array.append(events, [createLuckEvent(racer, proc)]);
    proc.boost;
  };
  case (null) { 1.0 };
};

// Apply luck boost to segment time
let segmentTime = baseSegmentTime * segmentPerformance * slipstreamBonus / luckBoost;
```

---

## 9. Marketing Copy

### Feature Announcement

> **"Your underdog's day is coming."**
>
> We're adding Luck to the wasteland. 
> 
> 🍀 **Luck Stat** - A new visible stat that controls breakthrough moments. High luck = legendary comebacks.
> 
> 🌟 **Daily Cosmic Events** - Every day, the wasteland shifts. 13 phenomena cycle through, blessing different bots. Today might be YOUR bot's day.
> 
> ⚡ **Race Incidents** - Random events mid-race: shortcuts discovered, debris dodged, flow states caught. Results you'll actually want to watch unfold.
> 
> 🔥 **Underdog Energy** - Lower-rated bots get spicier luck chances. They won't always win, but they'll make it interesting.
> 
> **The promise:** Stats still matter. Preparation still pays. But sometimes? Sometimes the wasteland just hits different and Bot #4829 comes out of nowhere to steal the podium.
> 
> *"I knew he had it in him."*

---

## 10. FAQ

**Q: Won't this make racing too random?**
A: No. Luck procs happen ~10-15% of the time for average bots, and even legendary procs only give +40% for one segment. A bot that's 30 rating points below still loses 85%+ of the time.

**Q: Can I upgrade my luck stat?**
A: Yes! Same mechanics as other stats - instant results, ICP or parts cost, progressive difficulty.

**Q: What if I miss my cosmic alignment day?**
A: Phenomena cycle every 13 days, so you'll get another shot soon. Plus, you have affinity with multiple phenomena based on your stats/traits.

**Q: Will this make top-tier bots less valuable?**
A: No. They'll still dominate their tier. Luck just makes individual races more exciting and gives underdogs hope.

**Q: How do I know what today's phenomenon is?**
A: Big banner on the racing page, plus your garage shows your affinity score for the current day.

---

## Summary

The luck system adds a fifth dimension to racing strategy while preserving the skill-based outcomes that make PokedBots competitive. By combining a **luck stat**, **daily cosmic phenomena**, and **mid-race incidents**, we create memorable moments where underdogs can shine without breaking the fundamental balance.

**Bot #4829's moment is coming. Will yours be next?** 🍀
