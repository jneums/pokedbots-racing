# Stat Rebalancing & Simulation Update

## Overview

The racing simulation has been completely rebalanced to make **all four stats meaningful**. Previously, Speed was approximately 10x more valuable than other stats, making it the only stat worth upgrading. The new system ensures every stat contributes significantly to race performance.

## What Changed

### Old System Problems
- **Speed dominated everything**: ~10x more impact than other stats
- Power Core, Acceleration, and Stability were mostly situational
- Optimal strategy was "max Speed, ignore everything else"
- Stat diversity had minimal impact on race outcomes

### New System Benefits
- **All stats matter universally**: Every stat affects every segment
- **Balanced upgrade value**: Each stat provides meaningful improvements
- **Situational bonuses**: Stats shine in specific conditions but always help
- **Distance scaling**: Different stats matter more for sprints vs treks
- **Strategic depth**: Multiple viable upgrade paths

## The New 6-Part Stat Formula

### Part 1: Universal Stat Components (70% always active)
Every stat now has a **base effectiveness** that applies to all segments:

- **Speed**: 70% base speed benefit (30% bonus on flats/downhills)
- **Power Core**: 25% time penalty range for low endurance (applies everywhere)
- **Acceleration**: 20% time penalty range for poor responsiveness (applies everywhere)
- **Stability**: 17% time penalty range for inconsistency (applies everywhere)

**What this means**: Even without ideal conditions, all your stats help you every segment.

### Part 2: Stat Synergies
Stats work better together:

- **Speed + Acceleration**: High speed needs good accel to maintain it (up to 20% synergy bonus)
- **Power + Stability**: Endurance requires stability to be effective (up to 15% synergy bonus)

**Upgrade Strategy**: Balanced builds benefit from synergy multipliers.

### Part 3: Universal Penalties
Low stats hurt you everywhere, not just in specific situations:

- **Low Power Core**: Always causes fatigue penalties (worse in demanding terrain)
- **Low Acceleration**: Always causes responsiveness penalties (worse on roads)
- **Low Stability**: Always causes consistency penalties (worse on technical sections)

**What this means**: You can't dump a stat and ignore it anymore. A 30 Stability bot will struggle everywhere, not just in ScrapHeaps.

### Part 4: Situational Modifiers
Stats get **additional** bonuses/penalties in ideal/poor conditions:

**Power Core**:
- Normal segments: 25% penalty range
- WastelandSand: +50% penalty range (75% total)
- Steep uphills: Scaled penalty based on angle

**Acceleration**:
- Normal segments: 20% penalty range  
- MetalRoads: +44% penalty range (64% total)
- Momentum recovery: Helps after difficult segments

**Stability**:
- Normal segments: 17% penalty range
- ScrapHeaps: +47% penalty range (64% total)
- Technical sections: Scales with difficulty rating

**Speed**:
- Always provides 70% base value
- Flat MetalRoads: +30% bonus
- Downhills: +15% bonus

### Part 5: Distance-Based Scaling

**Short Sprints (<10km)**:
- Acceleration becomes more valuable (0.75x to 1.25x)
- Speed slightly less valuable (1.125x to 0.875x)
- Quick burst performance matters more than endurance

**Long Treks (>20km)**:
- Power Core becomes more valuable (0.55x to 1.05x)
- Stability becomes more valuable (0.65x to 1.05x)
- Endurance and consistency matter more than raw speed

**Standard Races (10-20km)**:
- No distance scaling applied
- All stats valued equally

### Part 6: Combined Multipliers
All modifiers stack together to determine your final segment time:
```
effectiveSpeed = baseSpeed / (power × accel × stability × difficulty × distanceScaling)
segmentTime = (segmentLength / effectiveSpeed) × randomVariation
```

## What This Means for Upgrading

### Old Meta (OUTDATED)
- ✗ Max Speed → Win races
- ✗ Other stats barely mattered
- ✗ One optimal path for everyone

### New Meta
✓ **Multiple viable strategies:**

**1. Balanced Bruiser**
- Upgrade all stats evenly
- Benefits from synergy bonuses
- No major weaknesses
- Performs well in all conditions

**2. Speed Demon**
- Focus Speed + Acceleration (synergy!)
- Struggles on long treks without Power
- Dominates short sprints and flat tracks
- High risk, high reward

**3. Endurance Tank**
- Focus Power Core + Stability (synergy!)
- Excels in long treks (>20km)
- Handles difficult terrain better
- Consistent, reliable performance

**4. Specialist**
- Max one situational stat (e.g., Stability for ScrapHeaps)
- Universal base + situational dominance
- Performs well everywhere, excels in one condition

### Upgrade Priority Examples

**For Scavenger Class (Short Races)**:
1. Acceleration (sprint scaling + responsiveness)
2. Speed (raw performance)
3. Stability (consistency)
4. Power Core (less critical in short races)

**For Elite Class (Long Races)**:
1. Power Core (trek scaling + endurance)
2. Stability (trek scaling + consistency)
3. Speed (still important)
4. Acceleration (less critical in treks)

**For ScrapHeaps Specialist**:
1. Stability (47% extra value in ScrapHeaps)
2. Power Core (difficult terrain demands endurance)
3. Acceleration (momentum recovery)
4. Speed (situational on this terrain)

**For MetalRoads Specialist**:
1. Speed (30% bonus on flat roads)
2. Acceleration (44% extra value on roads)
3. Power Core (maintain speed)
4. Stability (roads are smooth)

## Technical Details

### Segment Performance Variation
- Each segment has ±6% random variation
- Based on deterministic seed (same seed = same result)
- Simulates micro-conditions: debris, wind, grip, etc.

### Faction Bonuses
- Applied at race entry time by backend
- Stats shown in races already include faction bonuses
- Frontend simulator applies them when using raw stats

### Bug Fixes in This Update
1. **segmentPerformance divisor**: Fixed from 1666.67 to 8325.0 (was causing ±60% swings instead of ±6%)
2. **Distance unit conversion**: Fixed backend passing meters instead of km to scaling logic (was applying extreme trek penalties)
3. **Simulation consistency**: Frontend and backend now use identical formulas

## Migration & Testing

### Existing Races
- Old races simulated with old formula remain valid
- New races use the new balanced simulation
- Times will be faster and more consistent

### Your Bots
- No stat changes required - your bots are unchanged
- Upgrade strategies should now consider all stats
- Previous Speed-only builds will still work but aren't optimal anymore

### Simulator
- Updated to match backend calculation exactly
- Use it to test different stat distributions
- Compare times to understand stat value

## Summary

**Before**: Speed = 90% of performance, other stats = 10%  
**After**: Speed = ~40%, Power = ~25%, Accel = ~20%, Stability = ~15%

All stats now contribute meaningfully. Upgrade strategically based on:
- Race distance (sprint vs trek)
- Terrain preference (what tracks you race on)
- Race class (Scavenger vs Elite)
- Build archetype (balanced vs specialist)

The racing meta is now deep and strategic. There's no longer one "correct" way to upgrade - experiment and find what works for your racing style!
