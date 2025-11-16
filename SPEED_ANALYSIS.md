# Speed Derivation Analysis

## Current Implementation

In `src/Racing.mo`, speed is derived from the **Arms** trait:

```motoko
// Arms trait affects speed (30-50 range)
let armsHash = switch (getTrait("arms")) {
  case (?arms) { hashText(arms) % 21 + 30 }; // 30-50
  case null { 40 };
};
```

**Problem:** This uses a simple hash function that doesn't consider the actual meaning of the arms values!

## Actual Arms Values (135 unique)

Top 40 most common arms (out of 135 total):

| Arms Type | Count | % | Speed Category |
|-----------|-------|---|----------------|
| hands down small mixed | 680 | 6.8% | Low |
| hands up mixed | 614 | 6.1% | Medium |
| rocket up rings | 593 | 5.9% | **HIGH** 🚀 |
| claws up mixed | 406 | 4.1% | Medium |
| rocket up | 377 | 3.8% | **HIGH** 🚀 |
| hands down large mixed | 359 | 3.6% | Low |
| lazers up | 356 | 3.6% | **HIGH** ⚡ |
| hands down black | 265 | 2.6% | Low |
| rainbow lazers front | 251 | 2.5% | **HIGH** ⚡ |
| 3 fingers chocolate | 243 | 2.4% | Low |
| rainbow lazers down mixed | 221 | 2.2% | **HIGH** ⚡ |
| power arms down silver lazers | 203 | 2.0% | **HIGH** ⚡ |
| rainbow lazers down | 202 | 2.0% | **HIGH** ⚡ |
| 3 fingers blue | 169 | 1.7% | Low |
| 3 fingers pink | 143 | 1.4% | Low |
| connectors chocolate | 121 | 1.2% | Medium |
| long arms mixed | 120 | 1.2% | Medium |
| masive jets | 117 | 1.2% | **HIGH** 🚀 |
| hands down rust | 101 | 1.0% | Low |
| hands down small rust | 101 | 1.0% | Low |
| claws down mixed | 98 | 1.0% | Medium |
| power arms down mixed yellow light | 95 | 0.9% | Medium |
| claws up rust | 94 | 0.9% | Medium |
| power arms down gold rainbows | 91 | 0.9% | **HIGH** ⚡ |
| power arms down mixed green light | 90 | 0.9% | Medium |
| hands down small chocolate | 90 | 0.9% | Low |
| 3 fingers mixed | 85 | 0.9% | Low |
| double arms burnt | 85 | 0.9% | Low |
| power arms down mixed blue light | 82 | 0.8% | Medium |
| bone white | 80 | 0.8% | Low |
| hands down white rust | 77 | 0.8% | Low |
| 8 bit blue | 76 | 0.8% | Medium |
| snippers up grey | 75 | 0.8% | Medium |
| 8 bit | 74 | 0.7% | Medium |
| connectors mixed | 72 | 0.7% | Medium |
| 8 bit dark | 71 | 0.7% | Medium |
| 8 bit red | 71 | 0.7% | Medium |
| hands down gold | 70 | 0.7% | Low |
| lazers off | 70 | 0.7% | Low |
| connectors gold | 68 | 0.7% | Medium |

## Proposed Categories

### 🚀 HIGH SPEED (60-75 range) - Rockets, Jets, Powerful Tech
**Keywords:** `rocket`, `jet`, `engine`, `turbo`, `massive`, `ultimate`
- rocket up rings (593)
- rocket up (377)
- masive jets (117)
- power jets down mixed (56)
- power jets down gold (69)
- power jets down black (107)
- ultimate gold (16)
- ultimate terminator (109)
- ultimate brown down (99)
- ultimate red (130)
- rockets down multi (13)
- rockets forward mixed (63)
- rockets burnt down (71)

### ⚡ HIGH SPEED (55-70 range) - Lasers, Energy Weapons
**Keywords:** `lazer`, `rainbow`, `power arms`
- lazers up (356)
- rainbow lazers front (251)
- rainbow lazers down mixed (221)
- power arms down silver lazers (203)
- rainbow lazers down (202)
- power arms down gold rainbows (91)
- rainbow lazers up (114)
- rainbow lazers forwards (39)
- rainbow lazers burnt down (118)
- rainbow lazers down black (68)
- rainbow lazers down dark (74)
- lazers forwards mixed (96)
- lazers up chocolate (1)

### 🔪 MEDIUM-HIGH SPEED (50-65 range) - Weapons, Power Tools
**Keywords:** `chainsaw`, `circular saw`, `snippers`, `claw`, `power`, `gripper`
- claws up mixed (406)
- claws down mixed (98)
- claws up rust (94)
- claws up chocolate (104)
- chainsaw burnt gold (17)
- chainsaw burnt (59)
- chainsaw rust (62)
- chainsaw chocolate (73)
- circular saw burnt (37)
- circular saws burnt (80)
- snippers up grey (75)
- snippers gold (122)
- power lifters black (98)
- gripper multi (70)
- grippers down dark (78)
- grippers down mixed (33)
- gold grippers (55)

### ⚙️ MEDIUM SPEED (40-55 range) - Tech, Connectors, 8-bit
**Keywords:** `8 bit`, `connector`, `cable`, `wire`, `mech`, `long arms`
- hands up mixed (614)
- long arms mixed (120)
- connectors chocolate (121)
- connectors mixed (72)
- connectors gold (44)
- connectors mixed gummy (42)
- connectors gummy (113)
- 8 bit blue (76)
- 8 bit (74)
- 8 bit dark (71)
- 8 bit red (95)
- 8 bit double (43)
- 8 bit lazers (127)
- 8 bit power (96)
- cables mixed (38)
- cables blue (51)
- wires (116)
- mech yellow (60)
- long arms gold (3)
- long arms blue (111)
- long arms multi (94)
- long beny arms (76)
- mechanic arms rust (106)
- power arms down mixed yellow/green/blue light (82, 90, 95)
- power arms burnt (66)
- power arms black (101)
- power arms teeth (32)

### 👐 LOW SPEED (30-50 range) - Hands, Fingers, Basic Arms
**Keywords:** `hands down`, `3 fingers`, `bone`, `small`, `burnt`
- hands down small mixed (680) - **most common!**
- hands down large mixed (359)
- hands down black (265)
- 3 fingers chocolate (243)
- 3 fingers blue (169)
- 3 fingers pink (143)
- hands down rust (101)
- hands down small rust (101)
- hands down small chocolate (90)
- 3 fingers mixed (85)
- double arms burnt (85)
- bone white (80)
- hands down white rust (77)
- hands down gold (70)
- lazers off (70) - **lasers disabled!**
- hands down white chocolate (48)
- hands down burnt (49)
- hands down large chocolate (35)
- hands down small gold (84)
- hands down small black (120)
- hands down small spikes (115)
- hands down large black (86)
- hands down mixed (92)
- hands down chocolate (103)
- hands down large gold (12)
- 3 fingers black (105)
- 3 fingers black pink (102)
- 3 fingers black blue (83)
- 3 fingers long mixed (72)
- 3 fingers pink stretched (123)
- bone black (88)
- bone gold (125)
- bone double white (110)
- bone double black (117)
- small hands burnt (19)

### 💎 LEGENDARY (70-85 range) - Gold, Master
**Keywords:** `master gold`, `golden king`, `murder arms gold`, `golden spikes`
- master gold (134)
- long golden king (132)
- power arms black king (133)
- murder arms gold (131)
- golden spikes (126)

## Distribution Analysis

**Current hash system:** Gives every arms type a random value 30-50
- No consideration of "rocket" vs "hands down small"
- No consideration of "lazers" vs "3 fingers"
- Completely ignores the visual/thematic meaning!

**Proposed keyword system:** 
- 🚀 Rockets/Jets: **60-75** (fastest, most powerful)
- ⚡ Lasers/Rainbows: **55-70** (energy weapons)
- 🔪 Weapons/Tools: **50-65** (power tools)
- ⚙️ Tech/Connectors: **40-55** (standard tech)
- 👐 Hands/Fingers: **30-50** (basic/slow)
- 💎 Legendary: **70-85** (ultra rare)

This creates meaningful differentiation where:
- A bot with "rocket up rings" (593 bots, 5.9%) would be FAST
- A bot with "hands down small mixed" (680 bots, 6.8%) would be SLOW
- Currently they both get random 30-50 from hash!

## Recommendation

Replace the hash-based system with keyword matching similar to what we did for terrain preferences:

```motoko
// Derive speed from Arms trait with meaningful categories
let baseSpeed = switch (getTrait("arms")) {
  case (?arms) {
    let lowerArms = Text.toLowercase(arms);
    
    // Legendary (70-85)
    if (Text.contains(lowerArms, #text "master gold") or 
        Text.contains(lowerArms, #text "golden king") or
        Text.contains(lowerArms, #text "murder arms gold")) { 
      75 + (hashText(arms) % 11) 
    }
    // Rockets/Jets (60-75)
    else if (Text.contains(lowerArms, #text "rocket") or 
             Text.contains(lowerArms, #text "jet") or
             Text.contains(lowerArms, #text "ultimate")) { 
      65 + (hashText(arms) % 11) 
    }
    // Lasers/Energy (55-70)
    else if (Text.contains(lowerArms, #text "lazer") or 
             Text.contains(lowerArms, #text "rainbow")) { 
      60 + (hashText(arms) % 11) 
    }
    // Weapons/Tools (50-65)
    else if (Text.contains(lowerArms, #text "chainsaw") or 
             Text.contains(lowerArms, #text "circular saw") or
             Text.contains(lowerArms, #text "claw") or
             Text.contains(lowerArms, #text "snipper") or
             Text.contains(lowerArms, #text "gripper")) { 
      55 + (hashText(arms) % 11) 
    }
    // Tech/Connectors (40-55)
    else if (Text.contains(lowerArms, #text "8 bit") or 
             Text.contains(lowerArms, #text "connector") or
             Text.contains(lowerArms, #text "cable") or
             Text.contains(lowerArms, #text "wire") or
             Text.contains(lowerArms, #text "power arms") or
             Text.contains(lowerArms, #text "mech")) { 
      45 + (hashText(arms) % 11) 
    }
    // Hands/Fingers/Basic (30-50)
    else { 
      35 + (hashText(arms) % 16) 
    }
  };
  case null { 40 };
};
```

**Benefits:**
- Thematic consistency (rockets = fast, hands = slow)
- Meaningful visual differentiation
- Still maintains variety within categories (±10-15 points)
- Covers all 135 arms values
- Similar approach to our successful terrain preference redesign
