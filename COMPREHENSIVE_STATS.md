# Comprehensive Stat Derivation Design

## Current Problem

Each stat is derived from **only one trait** using a hash function:
- Speed ← Arms only
- Power Core ← Body only
- Acceleration ← Legs only
- Stability ← Driver Guy only

This doesn't make physical sense! A robot's speed depends on its **legs** (locomotion), **wings** (thrust/jets), **body** (weight/aerodynamics), and arms (balance/propulsion).

## Proposed: Multi-Trait Formulas

### 🏎️ SPEED = Legs (40%) + Wings (30%) + Body (20%) + Arms (10%)

**Why:**
- **Legs (40%)** - Primary locomotion! Rockets, super legs, power legs vs small bendy
- **Wings (30%)** - Jets, rockets, engines provide major thrust
- **Body (20%)** - Heavy bodies slow you down, aerodynamic/small bodies are faster
- **Arms (10%)** - Minor: rockets/jets on arms add thrust, heavy arms slow down

**Legs keywords (40% weight):**
- HIGH (60-75): `rocket`, `super`, `midi super fast`, `power walker`, `ultimate`
- MEDIUM-HIGH (50-65): `power`, `strong`, `chunky`, `8 bit power`, `spiky`
- MEDIUM (40-55): `midi`, `bendy`, `cables`, `bird claw`, `frog`, `balloon`
- LOW (30-50): `small`, `burnt`, `rust`, `inflatable`, `cactus`

**Wings keywords (30% weight):**
- HIGH (60-75): `massive engines`, `rocket`, `jet`, `triangle up` (fins = aerodynamic)
- MEDIUM-HIGH (50-65): `power cells`, `butterfly double`, `angel wings` (large)
- MEDIUM (40-55): `8 bit`, `bear ears`, `horns`, `decal`
- LOW (30-45): `inflatable`, `burnt`, `lolly pops`, `straws`, `blank` (none)

**Body keywords (20% weight, INVERSE - heavy = slow):**
- LIGHT/FAST (60-75): `egg`, `bubble`, `balloon`, `glass`, `gummy`
- MEDIUM (45-60): `game boy`, `n 64`, `ipod`, `8 bit`
- HEAVY/SLOW (30-45): `mega controller`, `large controller`, `beast`, `tower`, `massive`

**Arms keywords (10% weight):**
- HIGH (60-75): `rocket`, `jet`, `lazer`, `rainbow`
- MEDIUM (45-60): `power arms`, `8 bit`, `connector`
- LOW (30-45): `hands down`, `3 fingers`, `bone`

---

### ⚡ POWER CORE = Body (50%) + Arms (25%) + Legs (15%) + Wings (10%)

**Why:**
- **Body (50%)** - The main chassis houses the power core! Larger = more power capacity
- **Arms (25%)** - Power arms, heavy weapons draw significant power
- **Legs (15%)** - Power legs, strong legs need energy
- **Wings (10%)** - Engines/jets consume power but less than main systems

**Body keywords (50% weight):**
- HIGH (60-80): `mega`, `large`, `ultimate`, `tower`, `master`, `super`, `golden`, `beast`
- MEDIUM-HIGH (50-65): `controller`, `battle box`, `command box`, `iron`, `copper`
- MEDIUM (40-55): `egg`, `game boy`, `n 64`, `frog`, `bee body`
- LOW (30-45): `small`, `mini`, `bubble`, `glass`, `split`

**Arms keywords (25% weight):**
- HIGH (60-75): `power arms`, `ultimate`, `massive jets`, `rainbow lazers`, `double arms`
- MEDIUM (45-60): `rocket`, `8 bit`, `connector`, `cable`, `lazer`
- LOW (30-45): `hands down`, `small`, `3 fingers`, `bone white`

**Legs keywords (15% weight):**
- HIGH (55-70): `power`, `strong`, `chunky`, `ultimate`, `super legs`
- MEDIUM (40-55): `midi`, `8 bit`, `cables`, `industrial`
- LOW (30-45): `small`, `bendy`, `burnt`, `balloon`

**Wings keywords (10% weight):**
- HIGH (55-70): `massive engines`, `power cells`, `ultimate`, `golden`
- MEDIUM (40-55): `angel wings`, `rocket`, `8 bit`, `butterfly`
- LOW (30-45): `blank`, `decal`, `burnt`, `inflatable`, `lolly pops`

---

### 🏃 ACCELERATION = Legs (50%) + Arms (20%) + Wings (20%) + Body (10% INVERSE)

**Why:**
- **Legs (50%)** - Quick response, agility, burst speed from legs
- **Arms (20%)** - Can push off, provide initial thrust
- **Wings (20%)** - Jets provide quick bursts
- **Body (10% inverse)** - Heavy bodies accelerate slower

**Legs keywords (50% weight):**
- HIGH (60-80): `midi super fast`, `super legs`, `spiky`, `bird claw`, `frog` (spring-like)
- MEDIUM (45-60): `bendy`, `midi`, `cables`, `power`, `8 bit`
- LOW (30-45): `chunky`, `large`, `burnt`, `rust`, `inflatable`

**Arms keywords (20% weight):**
- HIGH (55-70): `lazer`, `rainbow`, `rocket up`, `power jets`, `chainsaw` (torque)
- MEDIUM (40-55): `claws`, `power arms`, `8 bit`, `connector`
- LOW (30-45): `hands down large`, `bone`, `burnt`, `lazers off`

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
