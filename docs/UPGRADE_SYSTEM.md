---
title: "Upgrade System"
description: "Scrapyard, parts economy, and progressive upgrades"
order: 4
---

# PokedBots Racing - Upgrade System

**Turn Scrap into Power**

---

## Navigation

📖 <a href="/docs/GARAGE_SYSTEM">← Garage System</a> | 🏁 <a href="/docs/RACING_SYSTEM">Racing System →</a>

---

## How Upgrades Work

Upgrading improves robot stats over time through a **progressive cost system** where each successive upgrade to the same stat becomes more expensive.

**Current System:**
- Pay ICP directly or use parts from scavenging/racing
- V2 RNG-based system with success rates and pity mechanic
- Costs scale based on current stat value and bot rating
- **Instant upgrades** - immediate RNG roll and result

**Future Enhancement (Planned):**
- Scrapyard system to reduce costs by scrapping NFTs for parts
- Potential 30-50% savings for skilled scrappers

---

## Material Types

- **Speed Chip** → Velocity upgrades (Speed stat)
- **Power Core Fragment** → Power Core upgrades
- **Thruster Kit** → Thruster upgrades (Acceleration stat)
- **Gyro Module** → Gyro upgrades (Stability stat)
- **Universal Part** → Any upgrade type (flexible)

---

## Obtaining Materials

### Method 1: Direct ICP Purchase
*Current Implementation*

```
3.33 ICP → 1 Part (any upgrade type)
```

- ✅ Instant purchase when initiating upgrade
- ✅ No inventory management needed
- ✅ Simple and predictable
- ✅ Progressive costs: 10 ICP → 17 ICP → 27 ICP → 40 ICP → 60 ICP per upgrade

### Method 2: EXT Scrapyard System
*Planned Feature*

The scrapyard functions as a **universal EXT NFT buyer** - browse any EXT collection's marketplace, purchase NFTs, and scrap them for parts.

**Scrapyard Architecture:**

1. **Multi-Collection Browser**: `scrapyard_browse_collection(canister_id)` 
   - Works like `marketplace_browse_pokedbots` but for ANY EXT canister
   - Returns listings with metadata, price, rarity data
   - Cached per collection (5-min TTL)

2. **Smart Valuation System**: Prevents self-dealing exploits
   - **Purchase Price**: What you actually paid for the NFT
   - **Rarity Index**: Preloaded rarity scores for popular collections (1-100 scale)
   - **Floor Price**: Calculated in real-time from live marketplace listings
   - **Anti-Gaming Formula**: 
     ```
     scrap_value = min(
       purchase_price * 0.5,  // Max 50% of purchase price
       (rarity_index / 20) * floor_price,  // Rarity-adjusted floor
       100 ICP  // Hard cap to prevent exploits
     )
     ```
   - Takes minimum of all three to prevent manipulation

3. **Scrap Purchase Flow**: `scrapyard_purchase_and_scrap(canister_id, token_index)`
   - Same ICRC-2 approval-based purchase as PokedBots marketplace
   - NFT transferred to scrapyard subaccount (locked forever)
   - Purchase price recorded on-chain for valuation
   - Parts credited based on smart valuation
   - Transaction logged with all valuation inputs for transparency

**Part Conversion Examples:**
```
// High-value rare NFT
ICPunk #1234 (rarity 95, floor 100 ICP, purchase 120 ICP)
→ scrap_value = min(60, 475, 100) = 60 ICP worth
→ 60 ICP / 4 = 15 Universal Parts

// Mid-tier NFT
MotokoDayDrop #567 (rarity 50, floor 5 ICP, purchase 6 ICP)  
→ scrap_value = min(3, 12.5, 100) = 3 ICP worth
→ 3 ICP / 4 = ~1 Universal Part (rounded up)

// Self-dealing attempt (BLOCKED)
Unknown NFT (rarity 10, floor 0.1 ICP, purchase 1000 ICP from alt account)
→ scrap_value = min(500, 0.5, 100) = 0.5 ICP worth  
→ 0.5 ICP / 4 = 0 parts (minimum threshold)
```

**Collection Affinity** (Optional Enhancement):
Some collections have thematic bonuses:
```
ICPunks → +20% Gyro Modules (stability/reliability theme)
Motoko Bots → +20% Power Cores (motoko = power theme)  
IC Drip → +20% Speed Chips (fashion = fast theme)
Default → Universal Parts (no affinity)
```

### Method 3: Hybrid Discounts
*Planned Feature*

```
1 Speed Chip + 10 ICP → Velocity Upgrade (50% discount)
2 Speed Chips + 5 ICP → Velocity Upgrade (75% discount)
1 Universal Part → 5 ICP discount on any upgrade
```

---

## Scrapyard MCP Tools

### 1. `scrapyard_browse_collection` (Planned)

Browse any EXT collection's marketplace listings:

```json
Input: {
  "canister_id": "oeee4-qaaaa-aaaak-qaaeq-cai",
  "after": 42
}
Output: {
  "collection_name": "ICPunks",
  "listings": [
    {
      "token_index": 1234,
      "price": "100.00 ICP",
      "rarity_score": 95,
      "estimated_parts": "~15 Universal Parts",
      "scrap_value": "~60 ICP equivalent",
      "seller": "abc123..."
    }
  ]
}
```

### 2. `scrapyard_purchase_and_scrap` (Planned)

Purchase an NFT from any EXT collection and scrap it for parts:

```json
Input: {
  "canister_id": "oeee4-qaaaa-aaaak-qaaeq-cai",
  "token_index": 1234
}
Output: {
  "success": true,
  "token_index": 1234,
  "collection": "ICPunks",
  "purchase_price": "100.00 ICP",
  "rarity_score": 95,
  "floor_price": "100.00 ICP (calculated from live listings)",
  "scrap_value": "60.00 ICP",
  "parts_received": [
    "15 Universal Parts"
  ],
  "message": "ICPunk #1234 scrapped for parts",
  "wasteland_lore": "Salvaged premium circuits from old-world punk tech"
}
```

### 3. `scrapyard_view_parts_inventory` (Planned)

View your current parts inventory:

```json
Output: {
  "speedChips": 5,
  "powerCores": 3,
  "thrusterKits": 8,
  "gyroModules": 2,
  "universalParts": 24,
  "total_scrap_value": "347 ICP equivalent",
  "nfts_scrapped": 12
}
```

---

## Anti-Gaming Measures

The scrapyard uses multiple safeguards to prevent exploits:

1. **Purchase Price Cap**: Max 50% of purchase price counts
2. **Rarity Floor Cross-Check**: Can't exceed rarity-adjusted floor
3. **Hard Cap**: 100 ICP maximum scrap value per NFT
4. **Transparency**: All valuation inputs logged on-chain
5. **Minimum Threshold**: NFTs worth <0.5 ICP get 0 parts
6. **Known Collections Only**: Unknown collections get base rate (1 universal part per 20 ICP purchase)
7. **Floor Price Calculation**: Real-time from live marketplace listings (no oracle needed)

---

## Progressive Cost Curve

Each successive upgrade to the same stat costs more:

```
Upgrade #1:  3 parts × 3.33 ICP = 10 ICP  → +1-3 to stat
Upgrade #2:  5 parts × 3.33 ICP = 17 ICP  → +1-2 to stat
Upgrade #3:  8 parts × 3.33 ICP = 27 ICP  → +1-2 to stat
Upgrade #4: 12 parts × 3.33 ICP = 40 ICP  → +0-1 to stat
Upgrade #5: 18 parts × 3.33 ICP = 60 ICP  → +0-1 to stat
Upgrade #6: 25 parts × 3.33 ICP = 83 ICP  → +0-1 to stat (diminishing returns)
Upgrade #7+: Exponentially expensive, minimal gains
```

**Why Progressive Costs:**
- First upgrade affordable (10 ICP) for all players
- Competitive players can reach 3-4 upgrades (54-94 ICP total)
- Whales can push to 5-6 upgrades (154-237 ICP total per stat)
- Creates natural stat distribution without hard caps

---

## Practical Stat Caps

Due to cost scaling and diminishing returns, realistic maximum gains:

```
Starting stat: 50
After 3 upgrades: ~55-58 (+5-8 total)
After 6 upgrades: ~60-65 (+10-15 total)
After 10 upgrades: ~65-70 (+15-20 total, if you're insanely wealthy)

Theoretical max: 100
Practical max: ~75-80 (cost becomes prohibitive)
```

**Cost Examples:**

*Speed Upgrades for a 60 Speed Bot:*
```
Upgrade 1: 3 parts × 3.33 = 10 ICP  → 63 Speed (+3)
Upgrade 2: 5 parts × 3.33 = 17 ICP  → 65 Speed (+2)  
Upgrade 3: 8 parts × 3.33 = 27 ICP  → 67 Speed (+2)
Upgrade 4: 12 parts × 3.33 = 40 ICP → 68 Speed (+1)
Upgrade 5: 18 parts × 3.33 = 60 ICP → 69 Speed (+1)

Total to reach 69 Speed: 154 ICP (5 upgrades)
Next upgrade would cost 83 ICP (25 parts) for maybe +0-1...
```

**Why This Works:**
- ✅ First upgrade affordable (10 ICP) for all players
- ✅ Budget racers can get 2-3 upgrades (27-54 ICP total)
- ✅ Competitive players reach 4-5 upgrades (94-154 ICP per stat)
- ✅ Whales can push to 6+ but costs skyrocket (237+ ICP per stat)
- ✅ Natural stat caps emerge from economic pressure
- ✅ Preserves value of naturally high-stat bots
- ✅ Makes faction bonuses more valuable (free permanent stats!)

---

## Upgrade Process

1. **Check Requirements**: 
   - Bot has Battery ≥ 30, Condition ≥ 50
   - User has enough parts (based on stat's upgrade count)
   - Stat not already at cap (100)

2. **Consume Materials**: Parts deducted from inventory

3. **Instant Results**: RNG determines success/failure immediately

4. **Completion**: 
   - Stat gain applied (probabilistic, weighted by current stat)
   - Battery depleted (-15)
   - XP awarded (+5)
   - Upgrade counter incremented for that stat

---

## Stat Gain Probability

Higher stats are harder to improve (diminishing returns):

```motoko
// Pseudocode for stat gain
let currentStat = robot.speed;
let upgradeCount = robot.upgradeHistory.velocityUpgrades;

let baseGain = match upgradeCount {
  0 => 3;  // First upgrade: +1 to +3
  1 => 2;  // Second: +1 to +2
  2 => 2;  // Third: +1 to +2
  _ => 1;  // Fourth+: +0 to +1
};

// Difficulty modifier based on current stat
let difficulty = if (currentStat < 60) { 1.0 }
                else if (currentStat < 70) { 0.8 }
                else if (currentStat < 80) { 0.6 }
                else if (currentStat < 90) { 0.4 }
                else { 0.2 };  // 90+ is very hard

let actualGain = floor(random(0, baseGain) * difficulty);
let newStat = min(currentStat + actualGain, 100);
```

**Faction Bonuses:**
- **UltimateMaster** 👑: Difficulty multipliers reduced by 40% (easier to upgrade high stats)
- **Wild Bot** ⚡: +10% random variance on stat gains (±1-2 instead of fixed)

---

## Upgrade Constraints

- Upgrades complete instantly with RNG-based success
- Stat gains use progressive cost curve (3→5→8→12→18→25 parts for successive upgrades to same stat)
- Upgrades can be started at any battery/condition level

---

## Economic Balance

**Current System (Direct Purchase):**
- 3.33 ICP per part, purchased automatically when upgrade initiated
- Progressive costs: 10 → 17 → 27 → 40 → 60 ICP
- Simple, instant, predictable
- No inventory management needed

**Future Scrapyard Path (Planned):**
- Find undervalued NFTs on EXT marketplaces
- Scrap NFTs for parts to reduce upgrade costs
- Potential 30-50% savings for skilled scrappers
- Adds treasure hunt gameplay layer

---

## Benefits of Current System

**For Players:**
- ✅ Simple direct purchase (no inventory management)
- ✅ Progressive costs create natural upgrade paths
- ✅ First upgrade affordable for all players (10 ICP)
- ✅ Diminishing returns prevent power creep
- ✅ Strategic choices (spread upgrades vs focus one stat)

**For Platform:**
- ✅ Revenue stream for platform sustainability
- ✅ Deflationary pressure on ICP (upgrade burns)
- ✅ Economic incentive to maintain bots (must have battery/condition)
- ✅ Natural stat distribution (not everyone at 100)
- ✅ Preserves value of naturally high-stat bots

**For Collections:**
- ✅ Dead projects get second life
- ✅ Holders can exit with dignity (get value, not dump)
- ✅ Floor price support from scrap demand
- ✅ Marketing exposure via scrapyard browser

---

## Future Enhancements

**Parts Marketplace** (Planned)
- Trade parts between players
- Price discovery for different part types
- Creates secondary economy

**Prize NFT Rewards** (Planned)
- Top racers can win scrapped NFTs as bonus prizes
- "Salvage Rights" - race winners get first pick from scrapyard
- Special rare NFT prizes for tournament champions

**Achievements & Leaderboards** (Planned)
- "Wasteland Recycler" badges for scrap volume
- "Master Scrapper" for highest value scrapped
- "Collection Completionist" for scrapping all from one collection

---

## Navigation

📖 [← Garage System](/docs/GARAGE_SYSTEM) | 🏁 [Racing System →](/docs/RACING_SYSTEM)

**See also:**
- 🛒 [Marketplace](/docs/MARKETPLACE) - Browse PokedBots
- 🛠️ [MCP Tools](/docs/MCP_TOOLS) - Complete API reference
- 🏗️ [Architecture](/docs/ARCHITECTURE) - Technical design
