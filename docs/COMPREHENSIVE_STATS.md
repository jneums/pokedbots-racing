---
title: "Bot Stats Explained"
description: "Understanding your PokedBot's racing statistics and performance"
order: 4
---

# Understanding Bot Stats

## The Four Core Stats

Every PokedBot has four primary stats that determine its racing performance:

### 🏎️ Speed (0-100)
**What it does**: Determines your bot's top speed on straightaways

**Influenced by:**
- **Legs** (40%): Primary locomotion - rocket legs, power legs, super legs
- **Wings** (30%): Jets, rockets, engines for thrust
- **Body** (20%): Lighter bodies = faster (heavy builds slow you down)
- **Arms** (10%): Rocket arms add thrust

**Best for**: Short sprints and final stretches

### ⚡ Power Core (0-100)
**What it does**: Determines endurance and performance over longer distances

**Influenced by:**
- **Body** (50%): Larger chassis = bigger power capacity
- **Arms** (25%): Power arms and weapons draw significant energy
- **Legs** (15%): Power legs need consistent energy
- **Wings** (10%): Engines consume power

**Best for**: Long-distance races (15km+)

### 🏃 Acceleration (0-100)
**What it does**: How quickly your bot reaches top speed from a standstill

**Influenced by:**
- **Legs** (50%): Quick response, agility, burst speed
- **Arms** (20%): Initial thrust and push-off power
- **Wings** (20%): Jets for quick bursts
- **Body** (10%, inverse): Heavy bodies accelerate slower

**Best for**: Tight races with lots of position changes

### 🎯 Stability (0-100)
**What it does**: Consistency on rough terrain and resistance to hazards

**Influenced by:**
- **Driver Guy** (50%): Pilot skill and control
- **Body** (25%): Lower center of gravity = more stable
- **Legs** (15%): Strong legs handle bumps better
- **Wings** (10%): Large wings help balance

**Best for**: Scrap Heap terrain, avoiding crashes

## Faction System (Type-Based)

Your bot's Type determines its faction and provides unique stat bonuses. There are 14 distinct factions based on rarity:

### 💎 Ultra-Rare Tier (1-45 bots)
The elite tier - incredibly rare and powerful:

- **Ultimate-master** (1 bot): +6 to all stats - THE ULTIMATE bot
- **Wild** (5 bots): +8 Acceleration, +7 Speed, +5 others - Unpredictable chaos
- **Golden** (27 bots): +5 Power Core, +4 Stability, +3 others - Premium engineering (also has gold trait bonuses!)
- **Ultimate** (45 bots): +5 Speed/Power Core, +3 others - Combat excellence

### ⭐ Super-Rare Tier (244-640 bots)
Powerful bots with significant advantages:

- **Blackhole** (244 bots): +18 Power Core, +16 Acceleration, +13 others - Gravity-defying power
- **Dead** (382 bots): +13 Stability, +12 Power Core, +9 others - Undead resilience  
- **Master** (640 bots): +14 Speed/Stability, +11 others - Skilled operators

### 🔷 Rare Tier (717-999 bots)
Solid performers with meaningful bonuses:

- **Bee** (717 bots): +10 Acceleration, +8 Speed, +6 others - Agile flyers
- **Food** (778 bots): +11 Power Core, +10 Acceleration, +8 others - Energy-rich cores
- **Box** (798 bots): +7 Stability, +5 Power Core, +3 others - Stable platforms
- **Murder** (999 bots): +8 Speed/Power Core, +5 others - Aggressive power

### 📦 Common Tier (1654-2009 bots)
Entry-level bots - most accessible:

- **Game** (1654 bots): +3 Acceleration/Stability, +1 others - Precision controls
- **Animal** (1701 bots): +3 Acceleration, +2 Speed, +1 others - Natural agility
- **Industrial** (2009 bots): +0 to all stats - Pure base stats, most common

**Balance Philosophy:**
- Base stats: 0-70 per stat (0-280 total)
- Faction bonuses add 0-18 points per stat
- Maximum per stat: 100 (hard cap)
- Maximum total after upgrades: 400
- ~140 points of upgrade headroom for progression

**Competitive Balance:**
- Ultra-Rares win ~85-90% vs Super-Rare (elite but not invincible)
- Super-Rares win ~65-75% vs Rare (clear advantage)
- Rares win ~70-75% vs Common (meaningful progression)
- Overall ~20-25% upset rate keeps racing exciting!

## Rarity Attributes

Special visual attributes provide additional stat bonuses on top of faction bonuses:

- **GOLD**: Significant boost to golden traits (gold eyes, spiky gold, gold arms, etc.)
  - Golden body traits: +8-12 points to Power Core contribution
  - Golden arms: +10-14 points to Acceleration/Speed contribution  
  - Golden legs: +9-13 points to Speed/Acceleration contribution
  - Golden wings: +9-13 points to Speed contribution
  - Golden driver: +9-13 points to Stability contribution
- **BLACK**: Moderate boost to all stats
- **BLUE**: Small boost to all stats
- **PINK**: Minor boost to all stats
- **RUST**: Slight penalty to stats (battle-worn aesthetic)

**Why Golden Bots Punch Above Their Weight:**
Golden (27 bots) is rarer than Ultimate (45 bots), but Golden bots often have weaker base trait combinations. To compensate, individual golden traits (gold eyes, spiky gold, etc.) receive significant boosts in the stat calculation, making Golden bots competitive despite fewer in existence.

## Overall Rating

Your bot's Overall Rating is calculated as:
```
(Speed + Power Core + Acceleration + Stability) / 4
```

**Rating ranges:**
- 150-200: Ultra-Rare tier (top 1% - truly elite)
- 110-130: Super-Rare tier (top 15% - very competitive)
- 90-110: Rare tier (middle 30% - solid performers)
- 75-90: Common tier (bottom 55% - entry level)
- Below 75: Weak rolls or damaged bots needing upgrades

**Power Distribution:**
- Ultra-Rare average: ~175 overall (their own league)
- Super-Rare average: ~120 overall (clear advantage over Rare)
- Rare average: ~100 overall (competitive with upgrades)
- Common average: ~85 overall (baseline, lots of upgrade potential)

## How Stats Affect Racing

### Short Sprints (5-10km)
- **Most Important**: Speed, Acceleration
- **Less Important**: Power Core
- **Key Traits**: Rocket legs, jet wings, light body

### Medium Races (10-20km)
- **Balanced** importance across all stats
- **Key Factor**: Avoiding crashes (Stability)

### Long Treks (20-30km)
- **Most Important**: Power Core, Stability
- **Less Important**: Acceleration
- **Key Traits**: Large body, strong legs, experienced driver

### Terrain Effects

**Scrap Heaps** (garbage towers):
- Stability most important
- Many obstacles and hazards

**Wasteland Sand** (desert):
- Speed and Power Core important  
- Medium difficulty terrain

**Metal Roads** (ancient highways):
- Pure speed race
- Fastest bots excel here

## Improving Your Stats

### Permanent Upgrades
Use the upgrade system to permanently boost stats:
- **Velocity Module**: +1-3 Speed (10-60 ICP progressive cost, 12 hours)
- **PowerCore Enhancement**: +1-3 Power Core (10-60 ICP progressive cost, 12 hours)
- **Thruster Calibration**: +1-3 Acceleration (10-60 ICP progressive cost, 12 hours)
- **Gyro Stabilization**: +1-3 Stability (10-60 ICP progressive cost, 12 hours)

**Progressive Costs (per stat):**
- 1st upgrade: 3 parts × 3.33 ICP = **10 ICP**
- 2nd upgrade: 5 parts × 3.33 ICP = **17 ICP**
- 3rd upgrade: 8 parts × 3.33 ICP = **27 ICP**
- 4th upgrade: 12 parts × 3.33 ICP = **40 ICP**
- 5th upgrade: 18 parts × 3.33 ICP = **60 ICP**

**Diminishing Returns:**
- Each successive upgrade to the same stat grants smaller gains
- First upgrades: +1 to +3 points
- Later upgrades: +0 to +1 points (heavily diminished)
- **Strategy**: Spread early upgrades across multiple stats for best value

Upgrades are permanent and stack over time!

### Temporary Boosts
- **High Condition**: Bots with condition ≥ 90 perform at peak
- **Full Battery**: Battery ≥ 80 ensures no power loss mid-race
- **Terrain Match**: Racing on your preferred terrain gives slight edge

## Finding the Right Bot

### For Speed Demons
Look for: Rocket legs, jet wings, light body (eggs, bubbles)
**Best Factions**: Wild, Ultimate, Bee

### For Endurance Racers
Look for: Large body, power cores, strong legs
**Best Factions**: Blackhole, Golden, Food

### For All-Rounders
Look for: Balanced traits, GOLD attribute
**Best Factions**: Ultimate-master, Dead, Master

### Best Value Picks
- Common bots with GOLD traits (cheap but gold boosts make them competitive)
- Box bots with high stability (undervalued, great for Scrap Heap races)
- Food bots (solid Rare tier, good power/accel balance)
- Any bot with 100+ overall rating under 15 ICP

### Investment Strategy
- Ultra-Rares: Expensive but dominant (85%+ win rate vs lower tiers)
- Super-Rares: Best value - strong performance, reasonable prices
- Rares: Budget competitive - can upset Super-Rares ~25% of the time with good rolls
- Commons: Entry level - upgrade potential makes them viable long-term

## Pro Tips

1. **Check the full build** - One great trait doesn't make a champion
2. **Rarity matters** - Ultra-Rare faction bonuses are substantial
3. **Golden traits are special** - Individual gold parts get significant boosts
4. **Upgrade strategically** - Focus on complementing your bot's faction strengths
5. **Match to race type** - Speed bot for sprints, Power bot for treks
6. **Condition is key** - A well-maintained Common bot can beat a neglected Rare
7. **Upsets happen** - ~20-25% upset rate means underdogs can win
8. **Type matters more than you think** - 14 distinct faction identities create diverse strategies

**Wings keywords (20% weight):**
- HIGH (55-70): `rocket`, `massive engines`, `power cells sparks`, `triangle up` (quick)
- MEDIUM (40-55): `butterfly`, `angel wings`, `8 bit`, `bear ears`
- LOW (30-45): `blank`, `decal`, `burnt`, `lolly pops`, `straws`

**Body keywords (10% weight, INVERSE):**
- LIGHT/AGILE (60-75): `egg`, `bubble`, `balloon`, `mini`, `small`
- MEDIUM (45-60): `game boy`, `ipod`, `bee body`, `frog`
- HEAVY/SLOW (30-45): `mega controller`, `tower`, `beast`, `massive`

---

### 🎯 STABILITY = Driver Guy (40%) + Body (30%) + Legs (20%) + Arms (10%)

**Why:**
- **Driver Guy (40%)** - Skill! Goggles, helmets, focused eyes vs dead eyes
- **Body (30%)** - Low center of gravity, wide stance = stable
- **Legs (20%)** - Strong/wide stance vs wobbly legs
- **Arms (10%)** - Balance assistance

**Driver Guy keywords (40% weight):**
- HIGH (60-80): `metal goggles`, `helmet`, `visor`, `ultimate`, `master gold`, `focused`, `diamond eyes`
- MEDIUM-HIGH (50-65): `headphones`, `game boy`, `pixels`, `snes guy`, `gamers`
- MEDIUM (40-55): `blue`, `green`, `yellow`, `purple`, `tounge`, `rabbit`
- LOW (30-45): `dead eyes`, `eyes closed`, `big eyes` (unfocused), `N64 glitch`

**Body keywords (30% weight):**
- HIGH (60-75): `battle box`, `command box`, `mega controller` (wide/stable), `beast`, `iron`
- MEDIUM (45-60): `egg`, `round head`, `frog`, `rabbit`
- LOW (30-45): `balloon`, `bubble`, `tall tower`, `spiky egg` (wobbly), `one tooth` (unbalanced)

**Legs keywords (20% weight):**
- HIGH (55-70): `strong`, `power`, `chunky`, `industrial`, `ultimate`, `bird claw` (grip)
- MEDIUM (40-55): `midi`, `8 bit`, `cables`, `bendy`
- LOW (30-45): `small`, `balloon`, `inflatable`, `burnt`, `slender stalks` (unstable)

**Arms keywords (10% weight):**
- HIGH (50-65): `power arms`, `strong`, `grippers`, `claws` (grip)
- MEDIUM (40-55): `8 bit`, `connector`, `hands up` (balanced)
- LOW (30-45): `hands down`, `lazers off`, `burnt`, `bone`

---

## Implementation Strategy

For each stat, calculate a **weighted average** of contributions:

```motoko
// Example for Speed
let legsSpeed = categorizeLegs(legs) * 0.40;  // 40% weight
let wingsSpeed = categorizeWings(wings) * 0.30; // 30% weight
let bodySpeed = categorizeBodyForSpeed(body) * 0.20; // 20% weight (inverse for weight)
let armsSpeed = categorizeArms(arms) * 0.10;  // 10% weight

let rawSpeed = legsSpeed + wingsSpeed + bodySpeed + armsSpeed;
let finalSpeed = Nat.min(100, Nat.max(20, Int.abs(Float.toInt(rawSpeed))));
```

Each categorize function returns a value in a specific range (e.g., 30-75) based on keywords.

---

## Benefits

✅ **Physically realistic** - Stats derived from multiple relevant traits
✅ **Maintains variety** - Each component adds variation
✅ **Thematic consistency** - "rocket legs + massive engines + light egg body" = VERY FAST
✅ **Strategic depth** - Bots excel in different ways based on trait combinations
✅ **Covers edge cases** - Even rare combinations make sense
✅ **Similar to real racing** - Formula 1 cars are fast due to engine + aerodynamics + weight + tires

---

## Example Bot Comparison

### Bot A: Speed Demon
- Legs: `midi super fast mixed` → 70 * 0.40 = 28
- Wings: `massive engines black` → 70 * 0.30 = 21
- Body: `bubble egg gold` (light) → 70 * 0.20 = 14
- Arms: `rocket up rings` → 70 * 0.10 = 7
- **Total Speed: ~70** 🚀

### Bot B: Tank
- Legs: `small burnt` → 35 * 0.40 = 14
- Wings: `blank` → 30 * 0.30 = 9
- Body: `mega controller mixed` (heavy) → 35 * 0.20 = 7
- Arms: `hands down large mixed` → 35 * 0.10 = 3.5
- **Total Speed: ~33** 🐌

This creates meaningful differentiation based on the actual visual traits!
