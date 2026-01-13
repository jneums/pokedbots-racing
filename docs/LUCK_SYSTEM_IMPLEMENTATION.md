# Luck System - Technical Implementation Guide

This document provides step-by-step implementation instructions for the luck system.

## Phase 1: Core Luck Stat

### Step 1.1: Update Type Definitions

**File: `/packages/canisters/pokedbots_racing/src/RacingSimulator.mo`**

```motoko
// Update RacingStats to include luck
public type RacingStats = {
  speed : Nat; // Base: 10-68, max with upgrades: 100+
  powerCore : Nat; // Base: 6-74, max with upgrades: 100+ (endurance)
  acceleration : Nat; // Base: 11-73, max with upgrades: 100+
  stability : Nat; // Base: 6-69, max with upgrades: 100+
  luck : Nat; // NEW: Base: 30-70, max with upgrades: 100+
};
```

### Step 1.2: Add Luck to PokedBotRacingStats

**File: `/packages/canisters/pokedbots_racing/src/PokedBotsGarage.mo`**

```motoko
public type PokedBotRacingStats = {
  // ... existing fields ...
  
  // Upgrade bonuses
  speedBonus : Nat;
  powerCoreBonus : Nat;
  accelerationBonus : Nat;
  stabilityBonus : Nat;
  luckBonus : Nat; // NEW
  
  // Upgrade counts
  speedUpgrades : Nat;
  powerCoreUpgrades : Nat;
  accelerationUpgrades : Nat;
  stabilityUpgrades : Nat;
  luckUpgrades : Nat; // NEW
  
  // Luck tracking
  totalLuckProcs : Nat; // NEW: Total procs across all races
  majorLuckProcs : Nat; // NEW: Major + Legendary procs
  legendaryLuckProcs : Nat; // NEW: Legendary procs only
  cosmicAlignmentDays : Nat; // NEW: Days with 80+ affinity
};
```

### Step 1.3: Derive Base Luck from Token Index + Traits

**File: `/packages/canisters/pokedbots_racing/src/PokedBotsGarage.mo`**

Add to the `deriveBaseStatsFromMetadata` function area:

```motoko
/// Derive base luck from token index and traits
private func deriveBaseLuck(
  tokenIndex : Nat,
  metadata : [(Text, Text)],
  faction : FactionType,
) : Nat {
  // Base luck from token index (cyclical pattern)
  let indexLuck = (tokenIndex % 100); // 0-99 base range
  
  // Trait influences
  var traitBonus : Nat = 0;
  
  for ((traitName, traitValue) in metadata.vals()) {
    let lowerValue = Text.toLowercase(traitValue);
    
    // Wings/Jet Pack - lucky charms, totems, amulets (+15-20)
    if (traitName == "Wings" or traitName == "Jet Pack") {
      if (Text.contains(lowerValue, #text "lucky") or 
          Text.contains(lowerValue, #text "charm") or
          Text.contains(lowerValue, #text "totem") or
          Text.contains(lowerValue, #text "amulet") or
          Text.contains(lowerValue, #text "fortune")) {
        traitBonus += 18;
      } else if (Text.contains(lowerValue, #text "wild") or 
                 Text.contains(lowerValue, #text "chaos")) {
        traitBonus += 15;
      };
    };
    
    // Body - lucky symbols, patterns, gold (+10-15)
    if (traitName == "Body") {
      if (Text.contains(lowerValue, #text "gold") or
          Text.contains(lowerValue, #text "golden")) {
        traitBonus += 15;
      } else if (Text.contains(lowerValue, #text "lucky") or
                 Text.contains(lowerValue, #text "blessed")) {
        traitBonus += 12;
      } else if (Text.contains(lowerValue, #text "shiny") or
                 Text.contains(lowerValue, #text "sparkle")) {
        traitBonus += 10;
      };
    };
    
    // Arms - dice, cards, coins (+5-10)
    if (traitName == "Arms") {
      if (Text.contains(lowerValue, #text "dice") or 
          Text.contains(lowerValue, #text "card") or
          Text.contains(lowerValue, #text "coin")) {
        traitBonus += 10;
      } else if (Text.contains(lowerValue, #text "gambl") or
                 Text.contains(lowerValue, #text "chance")) {
        traitBonus += 8;
      };
    };
    
    // Driver Guy - gamblers, risk-takers (+10-15)
    if (traitName == "Driver Guy") {
      if (Text.contains(lowerValue, #text "gambl") or
          Text.contains(lowerValue, #text "risk") or
          Text.contains(lowerValue, #text "wild") or
          Text.contains(lowerValue, #text "crazy")) {
        traitBonus += 15;
      } else if (Text.contains(lowerValue, #text "daring") or
                 Text.contains(lowerValue, #text "bold")) {
        traitBonus += 12;
      };
    };
  };
  
  // Total base luck (10-50 range before upgrades, matching actual stat distributions)
  let totalLuck = (indexLuck / 2) + traitBonus; // indexLuck/2 gives 0-50 base
  
  // Cap between 10-50 for base stats (matches typical bot stat ranges)
  Nat.max(10, Nat.min(50, totalLuck));
};
```

### Step 1.4: Update Upgrade System

**File: `/packages/canisters/pokedbots_racing/src/PokedBotsGarage.mo`**

Update the `upgrade_robot` function to support luck upgrades:

```motoko
public shared ({ caller }) func upgrade_robot(
  tokenIndex : Nat32,
  upgradeType : UpgradeType, // Add #Luck variant
  usePartsPayment : Bool,
) : async Result.Result<Text, Text> {
  
  // ... existing validation ...
  
  // Handle luck upgrade
  let (upgradeCost, upgradeDescription) = switch (upgradeType) {
    case (#Velocity) { 
      // ... existing velocity logic ...
    };
    case (#PowerCore) { 
      // ... existing powerCore logic ...
    };
    case (#Thruster) { 
      // ... existing thruster logic ...
    };
    case (#Gyro) { 
      // ... existing gyro logic ...
    };
    case (#Luck) { // NEW
      let currentUpgrades = stats.luckUpgrades;
      let baseCost = calculateUpgradeCost(currentUpgrades);
      
      // Apply faction cost modifiers (same as other stats)
      let adjustedCost = applyFactionCostModifier(baseCost, stats.faction);
      
      (adjustedCost, "Luck");
    };
  };
  
  // ... payment logic ...
  
  // Apply upgrade
  let updatedStats = switch (upgradeType) {
    case (#Luck) {
      {
        stats with
        luckBonus = stats.luckBonus + 1;
        luckUpgrades = stats.luckUpgrades + 1;
        upgradeEndsAt = ?(now + UPGRADE_DURATION);
      };
    };
    // ... other cases ...
  };
  
  // ... rest of function ...
};
```

### Step 1.5: Update Type Enum

```motoko
public type UpgradeType = {
  #Velocity;
  #PowerCore;
  #Thruster;
  #Gyro;
  #Luck; // NEW
};
```

---

## Phase 2: Daily Phenomena System

### Step 2.1: Define Phenomenon Types

**File: `/packages/canisters/pokedbots_racing/src/RacingSimulator.mo`**

```motoko
public type DailyPhenomenon = {
  #SolarFlare; // Day 0
  #RustStorm; // Day 1
  #MetalResonance; // Day 2
  #GravityFlux; // Day 3
  #ScrapTornado; // Day 4
  #DeadZone; // Day 5
  #GoldenHour; // Day 6
  #MachineGhost; // Day 7
  #BloodMoon; // Day 8
  #BinarySurge; // Day 9
  #ChaosPulse; // Day 10
  #MomentumShift; // Day 11
  #BlackholeSingularity; // Day 12
};

public type DailyPhenomenonInfo = {
  phenomenon : DailyPhenomenon;
  name : Text;
  description : Text;
  emoji : Text;
};
```

### Step 2.2: Get Current Day's Phenomenon

```motoko
/// Get current day's phenomenon (13-day cycle)
public func getCurrentPhenomenon(timestamp : Int) : DailyPhenomenonInfo {
  let secondsSinceEpoch = timestamp / 1_000_000_000; // Convert nanoseconds
  let daysSinceEpoch = secondsSinceEpoch / 86400; // Seconds per day
  let dayInCycle = Int.abs(daysSinceEpoch % 13);
  
  getPhenomenonInfo(dayInCycle);
};

/// Get phenomenon info by day number (0-12)
private func getPhenomenonInfo(day : Nat) : DailyPhenomenonInfo {
  switch (day % 13) {
    case (0) { 
      { 
        phenomenon = #SolarFlare;
        name = "Solar Flare";
        description = "Electromagnetic chaos energizes power cores";
        emoji = "☀️";
      };
    };
    case (1) {
      {
        phenomenon = #RustStorm;
        name = "Rust Storm";
        description = "Debris field favors stable navigation";
        emoji = "🌪️";
      };
    };
    case (2) {
      {
        phenomenon = #MetalResonance;
        name = "Metal Resonance";
        description = "Ancient roads sing with speed";
        emoji = "🎸";
      };
    };
    case (3) {
      {
        phenomenon = #GravityFlux;
        name = "Gravity Flux";
        description = "Acceleration bursts from warped space";
        emoji = "🌊";
      };
    };
    case (4) {
      {
        phenomenon = #ScrapTornado;
        name = "Scrap Tornado";
        description = "Chaos favors the lucky and wild";
        emoji = "🌀";
      };
    };
    case (5) {
      {
        phenomenon = #DeadZone;
        name = "Dead Zone";
        description = "Stillness empowers the Dead faction";
        emoji = "💀";
      };
    };
    case (6) {
      {
        phenomenon = #GoldenHour;
        name = "Golden Hour";
        description = "Wasteland shimmers, luck shines bright";
        emoji = "✨";
      };
    };
    case (7) {
      {
        phenomenon = #MachineGhost;
        name = "Machine Ghost";
        description = "Ancient spirits guide machines";
        emoji = "👻";
      };
    };
    case (8) {
      {
        phenomenon = #BloodMoon;
        name = "Blood Moon";
        description = "Murder and aggression reign";
        emoji = "🔴";
      };
    };
    case (9) {
      {
        phenomenon = #BinarySurge;
        name = "Binary Surge";
        description = "Digital perfection favors balance";
        emoji = "💻";
      };
    };
    case (10) {
      {
        phenomenon = #ChaosPulse;
        name = "Chaos Pulse";
        description = "Pure randomness, pure luck";
        emoji = "⚡";
      };
    };
    case (11) {
      {
        phenomenon = #MomentumShift;
        name = "Momentum Shift";
        description = "Underdogs rise today";
        emoji = "🔄";
      };
    };
    case (12) {
      {
        phenomenon = #BlackholeSingularity;
        name = "Blackhole Singularity";
        description = "Gravity warps reality";
        emoji = "🌌";
      };
    };
    case (_) {
      // Should never happen, but default to Solar Flare
      {
        phenomenon = #SolarFlare;
        name = "Solar Flare";
        description = "Electromagnetic chaos energizes power cores";
        emoji = "☀️";
      };
    };
  };
};
```

### Step 2.3: Calculate Bot Affinity

```motoko
/// Check if a number is prime (for Metal Resonance)
private func isPrime(n : Nat) : Bool {
  if (n < 2) { return false };
  if (n == 2) { return true };
  if (n % 2 == 0) { return false };
  
  var i = 3;
  while (i * i <= n) {
    if (n % i == 0) { return false };
    i += 2;
  };
  true;
};

/// Calculate bot's affinity to current day's phenomenon (0-100)
public func calculateDailyAffinity(
  tokenIndex : Nat,
  stats : RacingStats,
  faction : FactionType,
  timestamp : Int,
) : Nat {
  let phenomenon = getCurrentPhenomenon(timestamp);
  var affinity : Nat = 0;
  
  switch (phenomenon.phenomenon) {
    case (#SolarFlare) {
      // Power Core MODULO pattern (works for ALL race classes)
      // Lucky digits give bonus regardless of stat magnitude
      let digit = stats.powerCore % 10;
      if (digit == 7) { affinity += 60 }           // Lucky 7s - jackpot!
      else if (digit == 3 or digit == 9) { affinity += 40 }  // Odd energy
      else if (digit == 0 or digit == 5) { affinity += 25 }; // Round numbers
      if (tokenIndex % 2 == 0) { affinity += 30 }; // Even bonus (50% of bots)
    };
    
    case (#RustStorm) {
      // Stability MODULO pattern
      let digit = stats.stability % 10;
      if (digit == 2 or digit == 8) { affinity += 60 }  // Balanced energy
      else if (digit == 4 or digit == 6) { affinity += 40 }  // Even energy
      else if (digit == 0) { affinity += 25 }; // Grounded
      if (tokenIndex % 13 == 2) { affinity += 40 }; // 7.7% of bots
    };
    
    case (#MetalResonance) {
      // Speed MODULO pattern
      let digit = stats.speed % 10;
      if (digit == 3) { affinity += 60 }  // Resonant frequency!
      else if (digit == 1 or digit == 7) { affinity += 40 }  // Harmonic
      else if (digit == 9) { affinity += 25 }; // Near-resonant
      if (isPrime(tokenIndex)) { affinity += 45 }; // ~25% are primes
    };
    
    case (#GravityFlux) {
      // Acceleration MODULO pattern
      let digit = stats.acceleration % 10;
      if (digit == 4) { affinity += 60 }  // Flux frequency!
      else if (digit == 0 or digit == 8) { affinity += 40 }  // Even lift
      else if (digit == 2 or digit == 6) { affinity += 25 }; // Partial flux
      if (tokenIndex % 4 == 0) { affinity += 35 }; // 25% of bots
    };
    
    case (#ScrapTornado) {
      // Wild faction (5 bots = 0.05%), token % 100 < 20
      if (faction == #Wild) { affinity += 70 }; // RARE, huge bonus
      if (tokenIndex % 100 < 20) { affinity += 40 }; // 20% of bots, reaches threshold alone
    };
    
    case (#DeadZone) {
      // Dead faction (382 bots = 3.82%), token contains 6 pattern
      if (faction == #Dead) { affinity += 60 };
      let tokenText = Nat.toText(tokenIndex);
      // Expanded: contains 6, 13, 66, or 666 (covers ~25% of tokens)
      if (Text.contains(tokenText, #text "666") or 
          Text.contains(tokenText, #text "66") or
          Text.contains(tokenText, #text "13") or
          Text.contains(tokenText, #text "6")) { 
        affinity += 45; // Reaches threshold alone
      };
    };
    
    case (#GoldenHour) {
      // Golden faction (27 bots = 0.27%), token % 7 == 0
      if (faction == #Golden) { affinity += 65 }; // Very rare
      if (tokenIndex % 7 == 0) { affinity += 40 }; // 14.3% of bots, reaches threshold alone
    };
    
    case (#MachineGhost) {
      // Ultimate/Master/Ultimate-master (686 bots = 6.86%), token > 5000
      if (faction == #Ultimate or faction == #UltimateMaster or faction == #Master) {
        affinity += 55;
      };
      if (tokenIndex > 5000) { affinity += 40 }; // 50% of bots, reaches threshold alone
    };
    
    case (#BloodMoon) {
      // Murder faction (999 bots = 9.99%), token % 9 == 0
      if (faction == #Murder) { affinity += 50 };
      if (tokenIndex % 9 == 0) { affinity += 40 }; // 11.1% of bots, reaches threshold alone
    };
    
    case (#BinarySurge) {
      // Balanced stats (all within 5 of each other) - fairly rare
      let maxStat = Nat.max(Nat.max(stats.speed, stats.powerCore),
                            Nat.max(stats.acceleration, stats.stability));
      let minStat = Nat.min(Nat.min(stats.speed, stats.powerCore),
                            Nat.min(stats.acceleration, stats.stability));
      if (maxStat - minStat <= 5) {
        affinity += 70; // Very balanced, rare
      } else if (maxStat - minStat <= 10) {
        affinity += 45; // Fairly balanced
      } else if (maxStat - minStat <= 15) {
        affinity += 25; // Somewhat balanced
      };
    };
    
    case (#ChaosPulse) {
      // Pure token-based luck, no faction bias
      // Everyone gets base chance from token pattern
      if (tokenIndex % 11 == 0) { affinity += 70 }; // 9.1% of bots, big bonus
      // Additional affinity from luck stat
      affinity += Nat.max(0, (stats.luck - 10) * 2);
    };
    
    case (#MomentumShift) {
      // BRACKET-RELATIVE underdog: uses avg % 10 to find underdogs WITHIN each bracket
      // In bracket 20-29: avg 20-24 (ends 0-4) = underdog, avg 25-29 (ends 5-9) = favorite
      // This works equally for ALL brackets!
      let avgRating = (stats.speed + stats.powerCore + stats.acceleration + stats.stability) / 4;
      let bracketPosition = avgRating % 10; // 0-9 within any bracket
      
      if (bracketPosition <= 2) {
        affinity += 60; // Bottom 30% of bracket (e.g., 20-22 in Junker)
      } else if (bracketPosition <= 4) {
        affinity += 45; // Lower half of bracket (e.g., 23-24 in Junker)
      } else if (bracketPosition <= 6) {
        affinity += 25; // Middle of bracket
      };
      // Top of bracket (7-9) gets no bonus - they're the favorites!
      if (tokenIndex % 12 == 0) { affinity += 40 }; // 8.3% of bots, reaches threshold alone
    };
    
    case (#BlackholeSingularity) {
      // Blackhole faction (244 bots = 2.44%), token % 13 == 0
      if (faction == #Blackhole) { affinity += 60 };
      if (tokenIndex % 13 == 0) { affinity += 40 }; // 7.7% of bots
    };
  };
  
  // Cap at 100
  Nat.min(affinity, 100);
};
```

---

## Phase 3: Luck Proc System

### Step 3.1: Define Luck Proc Types

```motoko
public type LuckProcType = {
  #Minor : { boost: Float; duration: Nat; description: Text };
  #Major : { boost: Float; duration: Nat; description: Text };
  #Legendary : { boost: Float; duration: Nat; description: Text };
};

public type ActiveLuckBuff = {
  procType : LuckProcType;
  appliedAtSegment : Nat;
  remainingDuration : Nat;
};
```

### Step 3.2: Check for Luck Proc

```motoko
/// Check if luck proc triggers this segment
private func checkLuckProc(
  luck : Nat,
  dailyAffinity : Nat,
  position : Nat, // Current position (1-indexed)
  totalRacers : Nat,
  segmentSeed : Nat,
) : ?LuckProcType {
  // Base luck chance (0-20% based on luck stat)
  let baseLuckChance = Float.fromInt(luck) / 500.0;
  
  // Underdog bonus: lower positions get more luck chance
  let underdogMultiplier = if (position > (totalRacers / 2)) {
    1.0 + (Float.fromInt(position - (totalRacers / 2)) / Float.fromInt(totalRacers)) * 0.5;
  } else { 1.0 }; // Up to +50% for dead last
  
  // Daily affinity bonus (0-20% based on affinity)
  let affinityBonus = Float.fromInt(dailyAffinity) / 500.0;
  
  // Total luck chance
  let totalLuckChance = (baseLuckChance * underdogMultiplier) + affinityBonus;
  
  // Roll the dice using segment seed
  let roll = Float.fromInt(segmentSeed % 1000) / 1000.0; // 0.0 to 1.0
  
  if (roll < totalLuckChance) {
    ?determineLuckProc(luck, dailyAffinity, segmentSeed);
  } else { null };
};

/// Determine which type of luck proc occurred
private func determineLuckProc(
  luck : Nat,
  affinity : Nat,
  seed : Nat,
) : LuckProcType {
  let luckTier = (luck + affinity) / 2; // 0-100 combined score
  let tierRoll = seed % 100;
  
  // Legendary (10% of procs, needs high luck 70+)
  if (tierRoll < 10 and luckTier > 70) {
    let descriptions = [
      "FLOW STATE ACTIVATED! Bot transcends physics!",
      "LEGENDARY SHORTCUT! Bot warps through space!",
      "COSMIC BLESSING! Bot channels wasteland energy!",
      "UNSTOPPABLE! Bot enters god mode!",
    ];
    let desc = descriptions[seed % descriptions.size()];
    
    #Legendary({
      boost = 1.40; // +40% speed this segment
      duration = 5; // Lasts 5 segments
      description = desc;
    });
  }
  // Major (30% of procs, needs decent luck 50+)
  else if (tierRoll < 40 and luckTier > 50) {
    let descriptions = [
      "Discovers hidden shortcut!",
      "Catches massive tailwind!",
      "Perfect line through debris!",
      "Engine surge! Extra power!",
    ];
    let desc = descriptions[seed % descriptions.size()];
    
    #Major({
      boost = 1.25; // +25% speed
      duration = 3; // Lasts 3 segments
      description = desc;
    });
  }
  // Minor (60% of procs, anyone can get)
  else {
    let descriptions = [
      "Lucky dodge saves time!",
      "Catches tailwind!",
      "Smooth patch ahead!",
      "Debris clears perfectly!",
    ];
    let desc = descriptions[seed % descriptions.size()];
    
    #Minor({
      boost = 1.15; // +15% speed
      duration = 1; // This segment only
      description = desc;
    });
  };
};
```

### Step 3.3: Track Active Luck Buffs

In the race simulator, track active buffs per racer:

```motoko
// Add to RacerProgress type
type RacerProgress = {
  participant : RacingParticipant;
  var cumulativeTime : Float;
  var previousDifficulty : Float;
  var currentPosition : Nat;
  var activeLuckBuff : ?ActiveLuckBuff; // NEW
  var totalLuckProcs : Nat; // NEW: Track for stats
  var majorLuckProcs : Nat; // NEW
  var legendaryLuckProcs : Nat; // NEW
};
```

### Step 3.4: Integrate into Race Simulation

In `simulateRaceSegmented`, before segment time calculation:

```motoko
// For each segment...
for (segmentIdx in Iter.range(0, allSegments.size() - 1)) {
  let segment = allSegments[segmentIdx];
  
  // Calculate segment times for all participants
  for (i in Iter.range(0, racerProgress.size() - 1)) {
    let racer = racerProgress[i];
    
    // ... existing segment time calculation ...
    
    // Calculate daily affinity for this bot
    let dailyAffinity = calculateDailyAffinity(
      racer.participant.nftId, // Extract tokenIndex
      racer.participant.stats,
      racer.participant.faction, // Need to add this to RacingParticipant
      race.createdAt,
    );
    
    // Check for new luck proc
    let luckCheck = checkLuckProc(
      racer.participant.stats.luck,
      dailyAffinity,
      racer.currentPosition,
      participants.size(),
      segmentSeed,
    );
    
    // Apply new luck proc or update existing buff
    var luckBoost : Float = 1.0;
    
    switch (racer.activeLuckBuff) {
      case (?buff) {
        // Apply active buff
        switch (buff.procType) {
          case (#Minor(proc)) { luckBoost := proc.boost };
          case (#Major(proc)) { luckBoost := proc.boost };
          case (#Legendary(proc)) { luckBoost := proc.boost };
        };
        
        // Decrement duration
        if (buff.remainingDuration > 1) {
          racer.activeLuckBuff := ?{
            buff with
            remainingDuration = buff.remainingDuration - 1;
          };
        } else {
          racer.activeLuckBuff := null; // Buff expired
        };
      };
      case (null) {
        // No active buff, check for new proc
        switch (luckCheck) {
          case (?procType) {
            // New proc triggered!
            racer.activeLuckBuff := ?{
              procType = procType;
              appliedAtSegment = segmentIdx;
              remainingDuration = switch (procType) {
                case (#Minor(p)) { p.duration };
                case (#Major(p)) { p.duration };
                case (#Legendary(p)) { p.duration };
              };
            };
            
            // Track stats
            racer.totalLuckProcs += 1;
            switch (procType) {
              case (#Major(_)) { racer.majorLuckProcs += 1 };
              case (#Legendary(_)) { 
                racer.majorLuckProcs += 1;
                racer.legendaryLuckProcs += 1;
              };
              case (_) {};
            };
            
            // Add event for commentary
            let eventDesc = switch (procType) {
              case (#Minor(p)) { "✨ " # racer.participant.nftId # ": " # p.description };
              case (#Major(p)) { "🌟 " # racer.participant.nftId # ": " # p.description };
              case (#Legendary(p)) { "⭐⭐⭐ " # racer.participant.nftId # ": " # p.description };
            };
            
            events := Array.append(events, [{
              eventType = #LuckProc {
                bot = racer.participant.nftId;
                procType = switch (procType) {
                  case (#Minor(_)) { "Minor" };
                  case (#Major(_)) { "Major" };
                  case (#Legendary(_)) { "Legendary" };
                };
              };
              timestamp = racer.cumulativeTime;
              segmentIndex = segmentIdx;
              description = eventDesc;
            }]);
            
            // Apply boost
            luckBoost := switch (procType) {
              case (#Minor(p)) { p.boost };
              case (#Major(p)) { p.boost };
              case (#Legendary(p)) { p.boost };
            };
          };
          case (null) {
            // No proc
          };
        };
      };
    };
    
    // Apply luck boost to segment time
    let segmentTime = baseSegmentTime * segmentPerformance * slipstreamBonus / luckBoost;
    
    // ... rest of segment calculation ...
  };
  
  // Update positions after segment
  // ... existing position tracking ...
};
```

---

## Phase 4: Frontend Display

### Step 4.1: Daily Phenomenon Banner

**File: `/packages/apps/website/src/pages/RacingPage.tsx`** (or appropriate component)

```tsx
import { useEffect, useState } from 'react';

function DailyPhenomenonBanner() {
  const [phenomenon, setPhenomenon] = useState<{
    name: string;
    description: string;
    emoji: string;
  } | null>(null);
  
  useEffect(() => {
    // Call canister to get current phenomenon
    async function fetchPhenomenon() {
      const result = await racingCanister.get_current_phenomenon();
      setPhenomenon(result);
    }
    fetchPhenomenon();
  }, []);
  
  if (!phenomenon) return null;
  
  return (
    <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-4 rounded-lg mb-4 border-2 border-yellow-400">
      <div className="flex items-center justify-center gap-3">
        <span className="text-4xl">{phenomenon.emoji}</span>
        <div>
          <h3 className="text-xl font-bold text-yellow-400">
            Today's Cosmic Event: {phenomenon.name}
          </h3>
          <p className="text-gray-300">{phenomenon.description}</p>
        </div>
      </div>
    </div>
  );
}
```

### Step 4.2: Bot Affinity Display

```tsx
function BotAffinityBadge({ 
  tokenIndex, 
  stats, 
  faction 
}: { 
  tokenIndex: number;
  stats: RacingStats;
  faction: string;
}) {
  const [affinity, setAffinity] = useState<number>(0);
  
  useEffect(() => {
    async function calculateAffinity() {
      const result = await racingCanister.calculate_daily_affinity(
        tokenIndex,
        stats,
        faction,
        Date.now() * 1_000_000 // Convert to nanoseconds
      );
      setAffinity(Number(result));
    }
    calculateAffinity();
  }, [tokenIndex, stats, faction]);
  
  const getAffinityColor = (affinity: number) => {
    if (affinity >= 80) return 'text-yellow-400';
    if (affinity >= 60) return 'text-green-400';
    if (affinity >= 40) return 'text-blue-400';
    return 'text-gray-400';
  };
  
  const getAffinityStars = (affinity: number) => {
    if (affinity >= 80) return '⭐⭐⭐';
    if (affinity >= 60) return '⭐⭐';
    if (affinity >= 40) return '⭐';
    return '';
  };
  
  return (
    <div className={`inline-flex items-center gap-2 ${getAffinityColor(affinity)}`}>
      <span className="font-bold">Affinity: {affinity}/100</span>
      <span>{getAffinityStars(affinity)}</span>
      {affinity >= 80 && (
        <span className="text-xs bg-yellow-400 text-black px-2 py-1 rounded">
          COSMIC ALIGNMENT!
        </span>
      )}
    </div>
  );
}
```

### Step 4.3: Luck Proc Animations

```tsx
function RaceVisualizerWithLuck({ events, ...props }: RaceVisualizerProps) {
  const luckEvents = events.filter(e => e.eventType.hasOwnProperty('LuckProc'));
  
  return (
    <div className="relative">
      <RaceVisualizer {...props} />
      
      {/* Luck proc overlays */}
      {luckEvents.map((event, idx) => (
        <LuckProcAnimation
          key={idx}
          event={event}
          timestamp={event.timestamp}
        />
      ))}
    </div>
  );
}

function LuckProcAnimation({ event, timestamp }: { event: RaceEvent; timestamp: number }) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    // Show animation when timestamp reached
    const timer = setTimeout(() => setShow(true), timestamp * 1000);
    return () => clearTimeout(timer);
  }, [timestamp]);
  
  if (!show) return null;
  
  const procType = event.eventType.LuckProc?.procType;
  const isLegendary = procType === 'Legendary';
  const isMajor = procType === 'Major';
  
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
                  ${isLegendary ? 'text-6xl' : isMajor ? 'text-4xl' : 'text-2xl'}`}
    >
      {isLegendary && '⭐⭐⭐'}
      {isMajor && '🌟'}
      {!isLegendary && !isMajor && '✨'}
    </motion.div>
  );
}
```

---

## Testing Plan

### Unit Tests

1. **Luck Derivation**
   - Test luck calculation from token index
   - Test trait bonuses
   - Test faction bonuses
   - Verify 30-70 base range

2. **Daily Phenomena**
   - Test 13-day cycle
   - Test affinity calculations for each phenomenon
   - Test edge cases (prime numbers, special tokens)

3. **Luck Procs**
   - Test proc chance calculations
   - Test underdog multiplier
   - Test tier determination
   - Test buff duration tracking

### Integration Tests

1. **Full Race Simulation**
   - Run 1000 races with luck enabled
   - Verify better bots still win 85%+ vs lower tiers
   - Verify luck procs happen at expected rates
   - Verify no math errors or overflows

2. **Daily Alignment**
   - Test races on each of 13 days
   - Verify aligned bots get bonuses
   - Verify commentary mentions alignment

### Balance Testing

1. **Win Rate Analysis**
   - Top tier vs mid tier: 85-90% (target)
   - Mid tier vs low tier: 70-75% (target)
   - Same tier with luck: 50-60% variance

2. **Luck Impact**
   - Measure % of races decided by luck (target: 10-15%)
   - Measure underdog victory rate increase (target: +5-10%)
   - Measure legendary proc impact (should be dramatic but rare)

---

## Database Migration

### Step 1: Add New Fields to Existing Bots

```motoko
public shared func migrate_add_luck_stats() : async Text {
  // Admin-only function
  
  var count : Nat = 0;
  
  for ((tokenIndex, stats) in racingStats.entries()) {
    // Calculate base luck for existing bot
    let metadata = getNFTMetadata(Nat32.toNat(tokenIndex));
    let baseLuck = deriveBaseLuck(
      Nat32.toNat(tokenIndex),
      metadata,
      stats.faction,
    );
    
    // Update stats with luck fields
    let updatedStats = {
      stats with
      luckBonus = 0;
      luckUpgrades = 0;
      totalLuckProcs = 0;
      majorLuckProcs = 0;
      legendaryLuckProcs = 0;
      cosmicAlignmentDays = 0;
    };
    
    racingStats.put(tokenIndex, updatedStats);
    count += 1;
  };
  
  "Migrated " # Nat.toText(count) # " bots with luck stats";
};
```

---

## Rollout Plan

### Week 1: Backend Infrastructure
- [ ] Add luck stat to types
- [ ] Implement luck derivation
- [ ] Add luck to upgrade system
- [ ] Deploy to testnet

### Week 2: Daily Phenomena
- [ ] Implement 13-day cycle
- [ ] Add affinity calculations
- [ ] Create query endpoints
- [ ] Test all phenomena

### Week 3: Luck Proc System
- [ ] Implement proc checks
- [ ] Add buff tracking
- [ ] Integrate into race simulator
- [ ] Add events/commentary

### Week 4: Frontend
- [ ] Daily phenomenon banner
- [ ] Bot affinity displays
- [ ] Luck stat in garage/marketplace
- [ ] Proc animations in visualizer

### Week 5: Testing & Balance
- [ ] Run 10,000+ simulation races
- [ ] Analyze win rates
- [ ] Tune proc chances
- [ ] Public beta test

### Week 6: Launch
- [ ] Deploy to mainnet
- [ ] Marketing announcement
- [ ] Monitor first week of races
- [ ] Collect user feedback

---

## Success Metrics

**Launch Week Goals**:
- 90%+ of races complete without errors
- Luck proc rate: 10-15% of segments
- Legendary proc rate: <1% of segments
- Top tier win rate vs low tier: 85-90%
- User engagement: +20% race viewership
- Community feedback: Positive sentiment on luck system

**Month 1 Goals**:
- 10,000+ races with luck system
- Balanced win rates across tiers
- Active daily alignment checking
- Community stories: "My bot's cosmic day!"
- No major balance complaints

---

This implementation guide provides the complete technical foundation for the luck system. Each phase builds on the previous one, allowing for iterative testing and refinement.
