# Scavenging Faction Bonuses - Simulation Parameters

## Overview
This document defines the faction-specific bonuses for the scavenging system, ready for simulation and balancing. All bonuses are **multiplicative** with base mechanics defined in SCAVENGING_SYSTEM.md.

---

## Ultra-Rare Factions (78 bots total)

### UltimateMaster (1 bot)
**Parts Multiplier:** 1.20x all zones  
**Battery Drain:** -30% (0.70x consumption), 15% chance to yield double parts  
**Special:** Completes missions 15% faster (5.1h/10.2h/20.4h effective)
**Philosophy:** Perfect efficiency - faster completion with zero downtime

**Simulation Values:**
- 6h mission (4.5h actual): 18-42 parts (base 15-35 × 1.2)
- 12h mission (9h actual): 48-96 parts (base 40-80 × 1.2)
- 24h mission (18h actual): 120-240 parts (base 100-200 × 1.2)
- Parts/hour: 4.0-9.3 (6h), 5.3-10.7 (12h), 6.7-13.3 (24h)
- **Battery: Returns with +20 battery (free recharge worth 0.1 ICP)**

---

### Golden (27 bots)
**Parts Multiplier:** 1.0x (standard)  
**Battery Drain:** Standard  
**Special:** 15% chance parts yield doubles (separate from world buff)  
**Philosophy:** Lucky streaks, quality over quantity

**Simulation Values:**
- Expected value 6h: 17.25-40.25 parts (base + 15% chance × 2)
- Expected value 12h: 46-92 parts
- Expected value 24h: 115-230 parts
- Battery cost: Standard (20/40/80)

---

### Ultimate (45 bots)
**Parts Multiplier:** 1.15x all zones  
**Battery Drain:** Standard  
**Special:** Mission durations -15% (5.1h/10.2h/20.4h effective)  
**Philosophy:** Speed and efficiency, time is parts

**Simulation Values:**
- 6h mission (5.1h actual): 17.25-40.25 parts (base 15-35 × 1.15)
- 12h mission (10.2h actual): 46-92 parts (base 40-80 × 1.15)
- 24h mission (20.4h actual): 115-230 parts (base 100-200 × 1.15)
- Parts/hour rate: 3.38-7.89 (6h), 4.51-9.02 (12h), 5.64-11.27 (24h)

---

### Wild (5 bots)
**Parts Multiplier:** 1.25x in WastelandSand zones (1.0x others)  
**Battery Drain:** Standard  
**Special:** World buffs are 2x potency BUT 50% chance to get no buff at all (high variance)  
**Condition Loss:** -40% (0.60x damage taken)  
**Philosophy:** Chaotic high-risk/high-reward

**Simulation Values:**
- WastelandSand 6h: 18.75-43.75 parts (base × 1.25)
- WastelandSand 12h: 50-100 parts
- WastelandSand 24h: 125-250 parts
- World buff proc: 7.5% chance for double potency (15% × 0.5)
- When triggered: +2-6, +4-8, +6-12 point bonuses (instead of +1-3, +2-4, +3-6)

---

## Super-Rare Factions (1,266 bots total)

### Blackhole (244 bots)
**Parts Multiplier:** 1.10x all zones  
**Battery Drain:** Standard  
**Special:** +10% condition damage on scavenging missions, BUT world buffs grant +1-3 Speed AND +1-3 Accel for next race (instead of parts)
**Philosophy:** Poor scavengers, elite racers - trade durability for performance

**Simulation Values:**
- 6h mission: 16.5-38.5 parts (base 15-35 × 1.1)
- 12h mission: 44-88 parts (base 40-80 × 1.1)
- 24h mission: 110-220 parts (base 100-200 × 1.1)
- Condition damage: 1.1x (slightly higher repair costs)
- World buff bonus: When world buff procs (15% chance), grants +1-3 Speed AND +1-3 Acceleration for next race (instead of bonus parts)

---

### Dead (382 bots)
**Parts Multiplier:** 1.40x in Dead Machine Fields (1.10x all other zones)  
**Battery Drain:** Standard  
**Special:** Condition damage reduced by 50% (0.50x)  
**Philosophy:** Resilient scavengers, thrive in dangerous zones

**Simulation Values:**
- Dead Machine Fields 6h: 21-49 parts (base × 1.4)
- Dead Machine Fields 12h: 56-112 parts
- Dead Machine Fields 24h: 140-280 parts
- Other zones: 16.5-38.5 / 44-88 / 110-220 parts
- Condition loss: Half damage vs other factions

---

### Master (640 bots)
**Parts Multiplier:** 1.12x all zones  
**Battery Drain:** -25% (0.75x consumption)  
**Special:** Every 10th mission awards double parts (career tracking)  
**Philosophy:** Mastery through repetition and efficiency

**Simulation Values:**
- 6h mission: 16.8-39.2 parts (base 15-35 × 1.12)
- 12h mission: 44.8-89.6 parts (base 40-80 × 1.12)
- 24h mission: 112-224 parts (base 100-200 × 1.12)
- Battery cost: 15 (base 20 × 0.75), 30, 60
- 10th mission bonus: 2x parts (33.6-78.4 / 89.6-179.2 / 224-448)

---

## Rare Factions (3,292 bots total)

### Bee (717 bots)
**Parts Multiplier:** 1.08x in Abandoned Settlements (1.0x others)  
**Battery Drain:** Standard  
**Special:** +10% parts on 24h missions, world buffs shared (if 2+ Bee faction bots active, all get buff)  
**Philosophy:** Collective benefit, long-term investment

**Simulation Values:**
- Settlements 6h: 16.2-37.8 parts (base × 1.08)
- Settlements 12h: 43.2-86.4 parts
- Settlements 24h: 118.8-237.6 parts (base × 1.08 × 1.10)
- Shared buff: If player owns 2+ Bee bots and one gets world buff, all active Bee bots receive it

---

### Food (778 bots)
**Parts Multiplier:** 1.12x in Scrap Heaps and Abandoned Settlements (1.0x others)  
**Battery Drain:** -20% (0.80x consumption)  
**Special:** World buffs 30% stronger (+1.3-3.9 instead of +1-3, etc.)  
**Philosophy:** Well-fed bots work better and get stronger buffs

**Simulation Values:**
- Scrap Heaps/Settlements 6h: 16.8-39.2 parts (base × 1.12)
- Scrap Heaps/Settlements 12h: 44.8-89.6 parts
- Scrap Heaps/Settlements 24h: 112-224 parts
- Battery cost: 16 (base 20 × 0.8), 32, 64
- World buffs: +1.3-3.9 (6h), +2.6-5.2 (12h), +3.9-7.8 (24h)

---

### Box (798 bots)
**Parts Multiplier:** 1.05x all zones  
**Battery Drain:** Standard  
**Special:** 5% chance to TRIPLE parts found (jackpot!)  
**Philosophy:** Lucky box, low probability high reward

**Simulation Values:**
- Expected value 6h: 16.5-38.5 parts (base × 1.05 + 5% × 3x)
- Expected value 12h: 44-88 parts
- Expected value 24h: 110-220 parts
- Jackpot proc: 5% chance for 3x multiplier (45-105 / 120-240 / 300-600 parts)

---

### Murder (999 bots)
**Parts Multiplier:** 1.15x in Dead Machine Fields (1.0x others)  
**Battery Drain:** Standard  
**Special:** +20% condition damage (aggressive scavenging, higher risk)  
**Philosophy:** Fast parts, high cost to durability

**Simulation Values:**
- Dead Machine Fields 6h: 17.25-40.25 parts (base × 1.15)
- Dead Machine Fields 12h: 46-92 parts
- Dead Machine Fields 24h: 115-230 parts
- Condition damage: 1.2x (pays more repair costs but gets more parts)

---

## Common Factions (5,364 bots total)

### Game (1,654 bots)
**Parts Multiplier:** 1.0x base  
**Battery Drain:** Standard  
**Special:** Every 5th mission awards +10 bonus parts (achievement system)  
**Philosophy:** Gamification, steady progression rewards

**Simulation Values:**
- 6h mission: 15-35 parts (base)
- 12h mission: 40-80 parts
- 24h mission: 100-200 parts
- 5th mission bonus: +10 parts (25-45 / 50-90 / 110-210)

---

### Animal (1,701 bots)
**Parts Multiplier:** 1.08x in WastelandSand zones (1.0x others)  
**Battery Drain:** Standard  
**Special:** -15% condition loss on 12h/24h missions, world buffs last for 2 races (instead of 1)  
**Philosophy:** Endurance and persistence

**Simulation Values:**
- WastelandSand 6h: 16.2-37.8 parts (base × 1.08)
- WastelandSand 12h: 43.2-86.4 parts
- WastelandSand 24h: 108-216 parts
- Condition loss 12h/24h: 0.85x damage
- World buff duration: 48h OR 2 races (whichever comes first)

---

### Industrial (2,009 bots)
**Parts Multiplier:** 1.05x all zones  
**Battery Drain:** -10% (0.90x consumption)  
**Special:** Reduced variance on parts yield (0.90x-1.10x instead of base range)  
**Philosophy:** Consistent, reliable, industrial efficiency

**Simulation Values:**
- 6h mission: 23.6-27.7 parts (midpoint 25.7 ± 10%)
- 12h mission: 63-77 parts (midpoint 70 ± 10%)
- 24h mission: 157.5-192.5 parts (midpoint 175 ± 10%)
- Battery cost: 18 (base 20 × 0.9), 36, 72
- Philosophy: Most predictable faction for planning

---

## Simulation Framework

### Key Metrics to Track
1. **Parts/Hour Efficiency:** Total parts ÷ mission duration
2. **Parts/Battery Ratio:** Total parts ÷ battery consumed
3. **Expected Value (EV):** Account for RNG bonuses (Golden, Box, Wild)
4. **Long-Term Value:** Track milestone bonuses (Game, Master)
5. **Total Cost:** Parts - (battery cost × ICP price) - (repair cost × condition damage)

### Balance Goals
- **Ultra-rare > Super-rare > Rare > Common** (but not by huge margin)
- **High-risk factions** (Wild, Murder) should have highest ceiling, lowest floor
- **Consistent factions** (Industrial, Master) should have predictable mid-tier value
- **No faction should be >50% better** than another at same tier (prevents must-have meta)
- **Common factions should be 80-90% as efficient** as ultra-rare (accessibility)

### Test Scenarios
1. **100 mission simulation** per faction (track variance)
2. **Battery efficiency comparison** (parts per ICP spent on recharge)
3. **Career progression** (missions 1-10, 11-50, 51-100)
4. **Zone preference optimization** (best faction × zone combinations)
5. **Multi-bot strategies** (Bee collective buff, diversified portfolio)

---

## Implementation Notes

### Phase 1 (MVP)
- Implement **parts multipliers only** (simplest to code)
- Implement **battery drain modifiers**
- Skip special abilities (Golden double, Box triple, Master milestone, etc.)

### Phase 2 (Special Abilities)
- Add **probability-based bonuses** (Golden, Box, Wild)
- Add **career tracking** (Game, Master)
- Add **condition modifiers** (Dead, Murder, Animal)

### Phase 3 (Advanced Features)
- Add **world buff modifications** (Food 30% stronger, Wild 2x, Animal 2 races)
- Add **collective mechanics** (Bee shared buffs)
- Add **duration modifiers** (Ultimate -15% time)

---

## Balance Change Log
*Use this section to track simulation results and balance adjustments*

**Initial values (Dec 6, 2025):**
- All multipliers set to initial estimates
- Awaiting simulation data for balancing
