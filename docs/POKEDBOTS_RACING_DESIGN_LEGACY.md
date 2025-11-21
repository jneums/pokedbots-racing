---
title: "System Architecture (Legacy)"
description: "⚠️ DEPRECATED: See new split documentation instead"
order: 99
---

# ⚠️ LEGACY DOCUMENT - NO LONGER MAINTAINED

**This document has been split into focused sections. Please use the new documentation:**

- 📖 [Overview](./OVERVIEW.md) - Start here!
- 🏗️ [Architecture](./ARCHITECTURE.md) - Design decisions
- 🔧 [Garage System](./GARAGE_SYSTEM.md) - Bot management
- ⚡ [Upgrade System](./UPGRADE_SYSTEM.md) - Scrapyard & parts
- 🏁 [Racing System](./RACING_SYSTEM.md) - Races & prizes
- 🛒 [Marketplace](./MARKETPLACE.md) - Buy & trade
- 🛠️ [MCP Tools](./MCP_TOOLS.md) - API reference
- 📚 [Technical Reference](./TECHNICAL_REFERENCE.md) - Deep dive

---

# PokedBots Racing - System Architecture (LEGACY)

**Version:** 3.0  
**Date:** November 20, 2025  
**Status:** Fully Operational - Racing System Live

---

## Overview

This document provides a comprehensive technical overview of the PokedBots Racing system - an on-chain racing simulation built as an MCP (Model Context Protocol) server on the Internet Computer.

**What You Can Do:**
- Browse and purchase PokedBots from the integrated marketplace
- Initialize bots for wasteland racing
- Upgrade bot stats (Velocity, PowerCore, Thruster, Gyro)
- Maintain bots (recharge, repair)
- Compete in scheduled races (Daily Sprints, Weekly Leagues)
- Earn ICP prizes and climb leaderboards
- Sponsor races to boost prize pools

**Technical Highlights:**
- Collection-agnostic racing engine via RacingStatsProvider interface
- PokedBots-specific logic cleanly separated for stats, factions, and upgrades
- Automated race scheduling with calendar system
- Real-time leaderboard rankings and statistics
- Full MCP tool suite for AI agent integration (15 tools)

**Deployment:** Canister `3od6b-qiaaa-aaaai-q37ma-cai` on IC mainnet

### The World of PokedBots

**Year 2525 AD** - Humans have long abandoned Earth, leaving only robots to inhabit the ruins. In the eastern wastelands, centered around the mysterious Delta City, various factions of robots have developed distinct identities based on relics from Earth's past:

- **Battle Bots**: Tough and built for hard work, constructed from old video game consoles and junk food toy parts salvaged from the giant rubbish heaps of former Antarctica
- **Entertainment Bots**: Flashy and charismatic, pieced together from ancient entertainment technology
- **Wild Bots**: Once normal robots, now deranged after the catastrophic solar flare of 2453 AD
- **God Class**: Rulers of much of eastern Earth, possessing abilities far beyond standard bots
- **The Masters**: A secretive society with mysterious connections to the off-world Europa Base 7 colony

Delta City, controlled by the powerful and enigmatic Silent Klan, serves as the hub where sentient robots and mindless helper droids coexist. Giant trains traverse the sun-scorched wastelands, connecting the city to the garbage towers where lower-class bots scavenge ancient human technology to survive and thrive.

---

## 2. Key Architectural Decisions

### 2.1 Generic Racing Simulator with Collection-Specific Adapters
**Decision**: Split racing logic into collection-agnostic simulator and collection-specific garage modules

**Rationale**:
- **RacingSimulator**: Generic racing engine that works with any NFT collection via RacingStatsProvider interface
- **PokedBotsGarage**: PokedBots-specific logic (factions, upgrades, stat derivation)
- Enables future expansion to other NFT collections without duplicating race simulation logic
- Clear separation of concerns: racing mechanics vs. collection-specific features
- Stats stored separately from NFT metadata - upgrades don't pollute on-chain NFT data
- Each collection can have unique mechanics (factions, special abilities) while sharing core racing

### 2.2 Marketplace Integration
**Decision**: Integrate with existing PokedBots marketplace for purchasing

**Rationale**:
- Users can browse and purchase PokedBots in-game without leaving MCP interface
- Leverages existing NFT marketplace liquidity (1,252+ listings)
- No wallet-switching friction - pay with ICP directly via ICRC-2
- Garage system manages purchased NFTs with subaccount architecture
- Racing stats stored separately in racing canister, not in NFT metadata

**Implementation (COMPLETE)**:
- ✅ `marketplace_browse_pokedbots`: Cached listing with pagination (5-min TTL)
- ✅ `marketplace_purchase_pokedbot`: ICRC-2 approval-based purchase with two-step payment flow
- ✅ EXT AccountIdentifier encoding (CRC32 + SHA224)
- ✅ Base16 hex decoding for marketplace payment addresses
- ✅ Garage subaccount system ("GARG" + principal bytes)
- ✅ Garage list tool with image URL display
- ✅ Racing stats initialization (deterministic from token index via precomputed-stats.json)
- ✅ Ownership verified before every operation via `bearer()` calls
- ✅ Full upgrade system (Velocity, PowerCore, Thruster, Gyro)
- ✅ Maintenance system (recharge, repair)
- ✅ Race entry and prize distribution
- ✅ Sponsorship system for augmenting prize pools

### 2.3 ICRC-2 Approval-Based Payments with Subaccount Routing
**Decision**: Use ICRC-2 `transfer_from` with subaccount-based payment routing

**Rationale**:
- **Simpler UX**: No deposit/withdraw friction - users keep funds in their wallet
- **Better for AI agents**: One-time approval, then canister handles payments automatically
- **Non-custodial**: Funds flow through garage subaccount but never locked
- **Trade-off**: 0.0001 ICP fee per operation vs. gasless after deposit

**Implementation (COMPLETE)**:
- User approves racing canister with `icrc2_approve` (150M e8s covers multiple operations)
- Purchase flow uses two-step payment:
  1. `icrc2_transfer_from(user → garage_subaccount, amount + fee)`
  2. `transfer(garage_subaccount → marketplace, amount)` using hex-decoded payment address
- Garage subaccount format: "GARG" + principal bytes (32 bytes total)
- EXT AccountIdentifier: CRC32 + SHA224 hash, hex-encoded for marketplace
- Marketplace settlement: `lock()` reserves NFT, `settle()` completes transfer after payment
- ✅ Race entries: Exact cost pulled via `icrc2_transfer_from` for entry fees
- ✅ Upgrades & Maintenance: Direct pulls for repair (5 ICP), recharge (10 ICP), upgrades (20 ICP)
- ✅ Prizes: Sent back directly to users via `icrc2_transfer`
- ✅ Sponsorships: Pulled via `icrc2_transfer_from` and added to prize pools

**Comparison to Final Score**:
| Aspect | Final Score | PokedBots Racing |
|--------|------------|------------------|
| Payments | Virtual balance ledger | Direct ICRC-2 transfers |
| User Experience | Deposit → Play → Withdraw | Approve → Play |
| Gas Costs | High upfront (deposit), then free | 0.01 per operation |
| Funds Custody | Escrowed in canister | Stay in user wallet |
| Best For | High-frequency traders | Occasional players & AI agents |

---

## 3. Core Architecture

### 3.1 Modular Architecture with Single Canister Deployment
The system uses a modular architecture split across multiple Motoko modules, all deployed in a single canister:

**Core Modules:**
- ✅ **RacingSimulator**: Generic racing engine with RacingStatsProvider interface
- ✅ **PokedBotsGarage**: PokedBots-specific stats, factions, upgrades, maintenance
- ✅ **RaceCalendar**: Automated race scheduling (daily/weekly/monthly)
- ✅ **Leaderboard**: Rankings, achievements, career statistics
- ✅ **ExtIntegration**: EXT NFT marketplace integration (browse, purchase, ownership)
- ✅ **IcpLedger**: ICRC-2 payment integration (approval-based transfers)
- ✅ **Stats**: Precomputed base stats for all 10,000 PokedBots

**Implemented Features:**
- ✅ EXT NFT marketplace integration (browse, purchase, ownership verification)
- ✅ ICRC-2 payment integration (approval-based transfers via subaccounts)
- ✅ Garage management (subaccount-based NFT ownership)
- ✅ Marketplace caching (5-minute TTL, pagination)
- ✅ Image URL display (raw.icp0.io integration)
- ✅ Racing stats storage (separate from NFT metadata)
- ✅ Maintenance and upgrade mechanics (recharge, repair, 4 upgrade types)
- ✅ Race simulation engine with faction bonuses and terrain effects
- ✅ Race entry fees and prize distribution
- ✅ Sponsorship system for augmenting prize pools

### 3.2 EXT NFT Marketplace Pattern (COMPLETE)
- **Robots are purchased from the existing PokedBots marketplace** via in-game tools
- Racing canister integrates with marketplace canister (`bzsui-sqaaa-aaaah-qce2a-cai`)
- Each user has a garage subaccount ("GARG" + principal bytes) that receives purchased NFTs
- Marketplace browsing: Cached listings (5-min TTL), sorted by price, cursor-based pagination
- Purchase flow: ICRC-2 approval → lock() → two-step payment → settle()
- Ownership verification: `bearer(tokenId)` checks current owner
- NFTs remain tradeable in EXT ecosystem - racing canister never locks transfers

**Racing Stats Implementation (COMPLETE)**:
- ✅ Racing stats initialization: Uses precomputed-stats.json (deterministically generated from token index)
- ✅ Stats storage: Upgrades, battery, condition, race history in racing canister
- ✅ Ownership sync: Stats linked to current NFT owner, verified before operations
- ✅ Faction derivation: From precomputed stats based on token index ranges

### 3.3 ICRC-2 Payment System with Subaccount Routing (COMPLETE)
We use ICRC-2 approval-based payments routed through garage subaccounts:

**Implementation (COMPLETE)**:
- **No deposit/withdraw flow** - users keep ICP in their own wallets
- Purchase flow: `icrc2_transfer_from(user → garage)` then `transfer(garage → marketplace)`
- Agent approves racing canister with `icrc2_approve` (150M e8s recommended)
- Garage subaccount acts as intermediary, not custodian (funds flow through)
- **Payment details**: NFT price + 10,000 e8s transfer fee pulled from user
- **EXT compatibility**: Marketplace payment address decoded from hex to blob
- **Two-step settlement**: lock() reserves NFT, settle() completes after payment verified
- ✅ Race entries: `icrc2_transfer_from` for exact entry fee amount (50-500 ICP based on class)
- ✅ Maintenance/upgrades: Direct pulls for repair (5 ICP), recharge (10 ICP), upgrades (20 ICP)
- ✅ Prize winnings: `icrc2_transfer` directly to user's wallet
- ✅ Sponsorships: `icrc2_transfer_from` to pull sponsorship amounts into race prize pools
- **Trade-off**: 0.0001 ICP fee per transaction vs. complexity of virtual balance
- **Benefit**: Simpler UX, no funds locked in canister, better for occasional users and AI agents

---

## 3. Core Game Mechanics

### 3.1 Robot Stats System

Each PokedBot has the following core attributes:

#### **Primary Stats** (derived from NFT at mint and faction type)
- **Speed** (0-100): Affects base race velocity through the wastelands
- **Power Core** (0-100): Affects performance over race distance (energy efficiency)
- **Acceleration** (0-100): Affects burst speed and position changes
- **Stability** (0-100): Affects consistency on rough terrain (lower variance in performance)

#### **Derived Stats** (calculated from primary stats and faction)
- **Overall Rating**: Weighted average of primary stats
- **Distance Preference**: Short Sprint (< 5km), Medium Haul (5-15km), Long Trek (> 15km)
- **Terrain Preference**: Scrap Heaps, Wasteland Sand, Metal Roads
- **Faction Bonus**: Special abilities based on robot faction type

#### **Dynamic Stats** (change over time)
- **Battery** (0-100): Depletes with races, restored by charging
- **Condition** (0-100): Depletes with neglect, restored by maintenance
- **Calibration** (0-100): Improves with upgrades, decays without maintenance
- **Experience** (XP): Increases with races, affects stat caps and upgrade potential
- **Runtime** (in days since activation): Affects performance (peak efficiency at 100-200 days)

#### **Career Stats** (historical tracking)
- Races entered
- Wins / Places / Shows
- Total scrap credits earned
- Best finish times per terrain type
- Faction reputation points

### 3.2 Stat Derivation from NFT

When a PokedBot NFT is minted, its primary stats are deterministically generated using:

```motoko
// Pseudo-code for stat generation
let seed = hash(tokenId, mintTimestamp, ownerPrincipal, factionType)

// Base stats with faction modifiers
let baseSeed = seed % 100
let speed = applyFactionBonus(baseSeed * 0.7 + 30, faction, "speed")
let powerCore = applyFactionBonus(((seed / 100) % 100) * 0.7 + 30, faction, "power")
let acceleration = applyFactionBonus(((seed / 10000) % 100) * 0.7 + 30, faction, "accel")
let stability = applyFactionBonus(((seed / 1000000) % 100) * 0.7 + 30, faction, "stability")

// Faction bonuses:
// Battle Bots: +15% Power Core, +10% Stability
// Entertainment Bots: +15% Speed, +10% Acceleration  
// Wild Bots: +20% Acceleration, -10% Stability (erratic but fast)
// God Class: +10% to all stats (rare, expensive to mint)
// Masters: +12% Speed, +12% Stability, +8% Power Core
```

This ensures:
- Uniqueness per robot
- Faction-appropriate stat distributions
- Reasonable stat ranges (no useless robots)
- Verifiable determinism from on-chain data

### 3.3 Maintenance & Repair System

Robots require regular maintenance to maintain optimal performance:

#### **Maintenance Actions** (cost paid via ICRC-2 transfer)
1. **Recharge** (Cost: 10 credits + 0.01 fee)
   - Restores 20 Condition
   - Restores 10 Battery
   - Cooldown: 6 hours
   - Payment: Direct ICRC-2 transfer_from to canister

2. **Basic Repair** (Cost: 5 credits + 0.01 fee)
   - Restores 10 Condition
   - Improves race readiness
   - Cooldown: 12 hours
   - Payment: Direct ICRC-2 transfer_from to canister

3. **Advanced Diagnostics** (Cost: 50 credits + 0.01 fee)
   - Restores 50 Condition
   - Clears system errors and glitches
   - Cooldown: 7 days
   - Payment: Direct ICRC-2 transfer_from to canister

4. **Idle Mode** (Free)
   - Restores 30 Battery over 24 hours
   - Reduces Calibration by 5
   - Can be cancelled
   - No payment required

#### **Decay Mechanics**
If a robot is not maintained:
- Condition decreases by 5 per day
- Battery decreases by 10 per race
- Calibration decreases by 3 per day without upgrades
- Below 50 Condition: -10% to all race performance
- Below 25 Condition: Cannot enter races (critical malfunction)

### 3.4 Unified Upgrade System

Upgrading improves robot stats over time through a **unified crafting system** that accepts both **ICP payments** and **scrap parts** as upgrade materials.

#### **How Upgrades Work**

Every upgrade requires **materials** which can be obtained through:
1. **Direct Purchase**: Pay 20 ICP to get instant upgrade materials
2. **Scrap NFTs**: Browse any EXT collection, purchase NFTs, scrap them for parts
3. **Hybrid**: Combine scrap parts + ICP for partial discounts

**Material Types:**
- **Speed Chip** → Velocity upgrades
- **Power Core Fragment** → Power Core upgrades  
- **Thruster Kit** → Thruster upgrades
- **Gyro Module** → Gyro upgrades
- **Universal Part** → Any upgrade type

#### **Obtaining Materials**

**Method 1: Direct ICP Purchase** (Current Implementation)
```
20 ICP → 3 Specific Parts (e.g., 3 Speed Chips)
20 ICP → 5 Universal Parts
```
- Instant delivery via ICRC-2 transfer_from
- No waiting, materials added to inventory immediately

**Method 2: EXT Scrapyard System** (Planned)

The scrapyard functions as a **universal EXT NFT buyer** - browse any EXT collection's marketplace, purchase NFTs, and scrap them for parts.

**Scrapyard Architecture:**
1. **Multi-Collection Browser**: `scrapyard_browse_collection(canister_id)` 
   - Works like `marketplace_browse_pokedbots` but for ANY EXT canister
   - Returns listings with metadata, price, rarity data
   - Cached per collection (5-min TTL)

2. **Smart Valuation System**: Prevents self-dealing exploits
   - **Purchase Price**: What you actually paid for the NFT
   - **Rarity Index**: Preloaded rarity scores for popular collections (1-100 scale)
   - **Floor Price Oracle**: Collection floor price from trusted sources
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

**Rarity Registry** (On-Chain Data):
```motoko
// Preloaded rarity data for popular collections
stable var collectionRegistry: Map<Principal, CollectionData> = Map.new();

type CollectionData = {
  name: Text;  // "ICPunks", "Motoko Day Drop", etc.
  totalSupply: Nat;
  floorPrice: Nat;  // In e8s, updated periodically
  rarityScores: Map<TokenIndex, Nat>;  // 1-100 scale per token
  partAffinity: ?PartType;  // Collection theme → preferred part type
};
```

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

**Scrapyard MCP Tools:**

1. **`scrapyard_browse_collection`** (Planned)
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

2. **`scrapyard_purchase_and_scrap`** (Planned)
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

3. **`scrapyard_view_parts_inventory`** (Planned)
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

**Collection Registry Management:**

Admin tools to maintain collection data:
- `scrapyard_add_collection(canister_id, name, rarity_data, part_affinity)`
- `scrapyard_update_rarity_scores(canister_id, rarity_data)`
- Manual curation ensures quality and prevents spam collections

**Floor Price**: Calculated in real-time from live marketplace listings - no oracle needed! When browsing a collection, we already have all the current prices.

**Anti-Gaming Measures:**

1. **Purchase Price Cap**: Max 50% of purchase price counts
2. **Rarity Floor Cross-Check**: Can't exceed rarity-adjusted floor
3. **Hard Cap**: 100 ICP maximum scrap value per NFT
4. **Transparency**: All valuation inputs logged on-chain
5. **Minimum Threshold**: NFTs worth <0.5 ICP get 0 parts
6. **Known Collections Only**: Unknown collections get base rate (1 universal part per 20 ICP purchase)

**Advantages Over Simple Burn:**
- ✅ Leverages existing EXT marketplace infrastructure
- ✅ No need to build separate scrap listings - use real market data
- ✅ Purchase price creates objective value anchor
- ✅ Rarity scores add fairness for rare vs. common NFTs
- ✅ Multi-collection support out of the box
- ✅ Creates real deflationary pressure (NFTs locked in scrapyard)
- ✅ Marketing: "Your dead NFTs have value in PokedBots Racing!"

**Method 3: Hybrid Discounts** (Planned)
```
1 Speed Chip + 10 ICP → Velocity Upgrade (50% discount)
2 Speed Chips + 5 ICP → Velocity Upgrade (75% discount)
1 Universal Part → 5 ICP discount on any upgrade
```

#### **Crafting Upgrades**

Once you have materials, craft upgrades using **progressive cost scaling** - each successive upgrade to the same stat costs more:

**Progressive Cost Curve:**
```
Upgrade #1:  3 specific parts → +1-3 to stat
Upgrade #2:  5 specific parts → +1-2 to stat
Upgrade #3:  8 specific parts → +1-2 to stat
Upgrade #4: 12 specific parts → +0-1 to stat
Upgrade #5: 18 specific parts → +0-1 to stat
Upgrade #6: 25 specific parts → +0-1 to stat (diminishing returns)
Upgrade #7+: Exponentially expensive, minimal gains
```

**Universal Parts Conversion:**
- Universal parts can substitute at 1.5x rate
- Example: Upgrade #2 needs 5 specific OR 8 universal parts
- Hybrid allowed: 3 specific + 3 universal = enough for upgrade #2

**Per-Stat Tracking:**
Each robot tracks upgrade count per stat independently:
```motoko
type UpgradeHistory = {
  velocityUpgrades: Nat;     // Times speed upgraded
  powerCoreUpgrades: Nat;    // Times power upgraded
  thrusterUpgrades: Nat;     // Times accel upgraded
  gyroUpgrades: Nat;         // Times stability upgraded
};
```

**Practical Stat Caps:**

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
Upgrade 1: 3 Speed Chips  → 63 Speed (cost: ~20 ICP equivalent)
Upgrade 2: 5 Speed Chips  → 65 Speed (cost: ~35 ICP equivalent)  
Upgrade 3: 8 Speed Chips  → 67 Speed (cost: ~55 ICP equivalent)
Upgrade 4: 12 Speed Chips → 68 Speed (cost: ~80 ICP equivalent)
Upgrade 5: 18 Speed Chips → 69 Speed (cost: ~120 ICP equivalent)

Total to reach 69: 46 Speed Chips (~310 ICP equivalent)
Next upgrade would cost 25 parts for maybe +1...
```

**Why This Works:**
- ✅ First few upgrades are affordable (3-8 parts)
- ✅ Dedicated players can reach competitive levels (5-6 upgrades)
- ✅ Whales can push further but at massive cost (10+ upgrades)
- ✅ Impossible to reach 100 without spending thousands of ICP
- ✅ Creates natural stat distribution curve
- ✅ Preserves value of naturally high-stat bots
- ✅ Makes faction bonuses more valuable (free stats!)

**Alternative Path: Prestige Upgrades**
```
10 Universal Parts → Prestige Upgrade
  - Bypasses normal cost curve
  - Flat +3-5 to chosen stat (doesn't count toward upgrade history)
  - Limited to 1 prestige upgrade per stat per bot
  - Cannot exceed stat cap (100)
```

**Upgrade Process:**
1. **Check Requirements**: 
   - Bot has Battery ≥ 30, Condition ≥ 50
   - User has enough parts (based on stat's upgrade count)
   - Stat not already at cap (100)

2. **Consume Materials**: Parts deducted from inventory

3. **Installation Time**: 12 hours (upgrade in progress)

4. **Completion**: 
   - Stat gain applied (probabilistic, weighted by current stat)
   - Battery depleted (-15)
   - XP awarded (+5)
   - Upgrade counter incremented for that stat

**Stat Gain Probability:**

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

**Example Upgrade Journey:**

*Bot #4247 (WildBot, 65 SPD starting)*
```
Upgrade 1: 3 chips  → 68 SPD (+3, lucky!)
Upgrade 2: 5 chips  → 70 SPD (+2)
Upgrade 3: 8 chips  → 72 SPD (+2)
Upgrade 4: 12 chips → 72 SPD (+0, unlucky at high stat)
Upgrade 5: 18 chips → 73 SPD (+1)
Upgrade 6: 25 chips → 74 SPD (+1)

Total: 71 chips consumed for +9 speed
Cost: ~470 ICP equivalent (or a lot of scrapping!)
```

**Universal Parts Alternative:**
```
5 Universal → Any upgrade (ignores cost curve, always 5 parts)
  - Good for first 1-2 upgrades (same/better than specific)
  - Worse than specific parts for later upgrades
  - Flexibility premium
```

#### **Material Inventory System** (Planned)

Each user has a parts inventory:
```motoko
type UserInventory = {
  speedChips: Nat;
  powerCores: Nat;
  thrusterKits: Nat;
  gyroModules: Nat;
  universalParts: Nat;
  
  // Stats tracking
  totalScrapValue: Nat;  // Lifetime ICP equivalent scrapped
  nftsScrappped: Nat;
  collectionsScrapped: Map<Principal, Nat>;  // Count per collection
};
```

**Inventory Management:**
- View current parts via `scrapyard_view_parts_inventory`
- Parts persist across robots (shared pool)
- Parts can be traded between users (future: parts marketplace)
- Parts never expire

#### **Economic Balance**

**Direct ICP Path:**
- 20 ICP → 5 universal parts → 1 upgrade
- Simple, instant, predictable
- Baseline: 20 ICP per upgrade

**Scrap Path:**
- Find undervalued NFTs on EXT marketplaces
- Purchase for 5-15 ICP → Scrap for 1-3 universal parts
- 4-7 cheap NFTs → enough parts for 1 upgrade
- Requires market research, hunting, strategy
- Potential 30-50% savings for skilled scrappers

**Hybrid Path:**
- Mix scrap parts with ICP for flexible budgeting
- Example: 3 universal parts + 10 ICP = upgrade (50% discount)

**Value Proposition:**
- **Convenience buyers**: Pay 20 ICP, skip the hunt
- **Value hunters**: Find deals across IC NFT ecosystem, save ICP
- **Collection holders**: Scrapped NFTs from your favorite collections have themed bonuses
- **Dead project owners**: Your NFTs have utility again

**Economic Flywheel:**
1. Demand for cheap NFTs increases (scrappers hunting)
2. Floor prices of dead projects stabilize/rise slightly
3. More ICP flows into various NFT ecosystems
4. PokedBots Racing becomes hub for cross-collection activity
5. More users discover PokedBots while browsing scrapyard

#### **Benefits of Unified System**

**For Players:**
- ✅ Multiple paths to upgrades (ICP, scrap, hybrid)
- ✅ Inventory management adds strategic depth
- ✅ Can stockpile parts for future use
- ✅ Treasure hunt gameplay (find undervalued NFTs)
- ✅ Collection affinity rewards loyalty to favorite projects

**For Ecosystem:**
- ✅ Creates utility for dead/inactive NFT projects
- ✅ Cross-collection marketing opportunities
- ✅ Deflationary for participating collections
- ✅ ICP flows to multiple NFT marketplaces
- ✅ PokedBots becomes discovery hub for IC NFT ecosystem
- ✅ Wasteland lore: "Scavenging salvage from the old world"

**For Collections:**
- ✅ Dead projects get second life
- ✅ Holders can exit with dignity (get value, not dump)
- ✅ Floor price support from scrap demand
- ✅ Marketing exposure via scrapyard browser

#### **Future Enhancements**

**Parts Marketplace** (Planned)
- Trade parts between players
- Price discovery for different part types
- Creates secondary economy
- Tools: `parts_list_for_sale`, `parts_purchase`, `parts_cancel_listing`

**Prize NFT Rewards** (Planned)
- Top racers can win scrapped NFTs as bonus prizes
- "Salvage Rights" - race winners get first pick from scrapyard
- Special rare NFT prizes for tournament champions
- Creates excitement beyond just ICP prizes

**Achievements & Leaderboards** (Planned)
- "Wasteland Recycler" badges for scrap volume
- "Master Scrapper" for highest value scrapped
- "Collection Completionist" for scrapping all from one collection
- Faction-specific scrap bonuses

#### **Upgrade Constraints** (All Methods)
- Robot must have Battery ≥ 30
- Robot must have Condition ≥ 50  
- Only one upgrade session active per robot (12-hour cooldown while upgrade processes)
- Upgrades consume 15 battery per session
- Stat gains use progressive cost curve (3→5→8→12→18→25 parts for successive upgrades to same stat)
- **God Class bonus**: Difficulty multipliers reduced by 20% (easier to upgrade high stats)
- **Wild Bot trait**: +10% random variance on stat gains (±1-2 instead of fixed)

### 3.5 Wasteland Race System

#### **Race Structure**
Races are scheduled events through the dangerous wastelands surrounding Delta City:

**Race Properties:**
- **Distance**: 5km, 10km, 15km, 20km, 30km (through wasteland terrain)
- **Terrain**: Scrap Heaps, Wasteland Sand, Metal Roads (ancient highways)
- **Class**: Scavenger Class (0-2 wins), Raider Class (3-5 wins), Elite Class (6+ wins), Silent Klan Invitational (10+ wins)
- **Entry Fee**: 50-500 scrap credits based on class
- **Prize Pool**: Sum of all entry fees (minus 5% Silent Klan tax)
- **Max Entries**: 8-12 robots
- **Start Time**: Scheduled timestamp
- **Entry Deadline**: 30 minutes before start
- **Race Route**: Departs from Delta City train station into the garbage towers

#### **Race Entry Requirements**
- Robot Condition ≥ 70
- Robot Battery ≥ 50
- Sufficient ICRC-2 allowance for entry fee + 0.01 transfer fee
- Robot meets class requirements
- Race not full
- Before entry deadline
- Robot not in another race at same time
- Faction restrictions for certain races (e.g., Silent Klan Invitational only for God Class & Masters)

#### **Prize Distribution** (Parimutuel-style with Silent Klan tax)
- Silent Klan Tax: 5% (goes to canister treasury)
- 1st Place: 47.5% of prize pool
- 2nd Place: 23.75% of prize pool
- 3rd Place: 14.25% of prize pool
- 4th Place: 9.5% of prize pool
- 5th+ Place: 0%

### 3.6 Race Simulation Engine

Races are simulated deterministically using:

```motoko
// Simplified simulation logic
for each robot in race:
  // Calculate performance factors
  baseTime = raceDistance / (robot.speed * 0.8 + 10)
  
  // Apply power core effect (better power = less slowdown on long distances)
  distanceFactor = if (raceDistance > robot.preferredDistance) 
    then (robot.powerCore / 100.0) 
    else 1.0
  
  // Apply battery/condition penalties
  batteryFactor = robot.battery / 100.0
  conditionFactor = robot.condition / 100.0
  
  // Apply terrain preference
  terrainFactor = if (race.terrain == robot.preferredTerrain) 
    then 1.05 
    else 0.95
  
  // Apply faction special abilities
  factionBonus = match robot.faction:
    Battle Bot => if (terrain == ScrapHeaps) then 1.08 else 1.0  // Tough in garbage
    Entertainment Bot => 1.03  // Always slight edge (crowd favorites)
    Wild Bot => 1.0 + random() * 0.15  // Extremely unpredictable
    God Class => 1.10  // Superior in all conditions
    Masters => if (race.class == Elite) then 1.12 else 1.05  // Excel in high-stakes
  
  // Random variance based on stability (lower stability = higher variance)
  variance = random() * (100 - robot.stability) / 100.0 * 0.15
  
  // Weather hazards in wasteland (solar flares, dust storms)
  hazardFactor = if (randomSolarFlare()) then 0.9 else 1.0
  
  // Final time calculation
  finalTime = baseTime / (distanceFactor * batteryFactor * conditionFactor * 
                          terrainFactor * factionBonus * hazardFactor) 
              * (1.0 + variance)

// Sort by finalTime, assign positions, distribute prizes
```

The simulation:
- Uses the race's unique ID + start time + block hash as random seed
- Is deterministic (same inputs = same outputs)
- Considers all robot stats, faction bonuses, and conditions
- Creates realistic variance with wasteland hazards
- Rewards well-maintained robots
- Wild Bots can have spectacular wins or catastrophic failures

---

## 4. NFT Implementation

### 4.1 EXT Standard - Existing PokedBots Collection

**The racing canister wraps the existing PokedBots EXT NFT canister.** It does NOT mint new NFTs.

EXT Canister Integration:
- **Canister ID**: (to be specified - existing PokedBots deployment)
- **Standard**: EXT (not ICRC-7)
- **Ownership Verification**: `tokens(AccountIdentifier)` returns owned token indices
- **Metadata Access**: `metadata(TokenIdentifier)` returns NFT metadata
- **Transfer Detection**: Racing canister checks ownership before each race/operation

Racing Stats (stored separately in racing canister):

```motoko
// Racing Stats (stored in racing canister, not in EXT NFT)
type PokedBotRacingStats = {
  tokenIndex: TokenIndex;        // EXT token index (links to NFT)
  ownerPrincipal: Principal;     // Cached from EXT canister, verified before operations
  
  // Faction (derived from token index or EXT metadata)
  faction: FactionType;          // BattleBot, EntertainmentBot, WildBot, GodClass, Master
  
  // Base stats (from deterministic generation at mint)
  baseSpeed: Nat;
  basePowerCore: Nat;
  baseAcceleration: Nat;
  baseStability: Nat;
  
  // Dynamic stats (evolve over time with upgrades)
  speed: Nat;
  powerCore: Nat;
  acceleration: Nat;
  stability: Nat;
  
  battery: Nat;
  condition: Nat;
  calibration: Nat;
  experience: Nat;
  
  // Preferences (derived from faction + stats)
  preferredDistance: Distance;   // Short, Medium, Long
  preferredTerrain: Terrain;     // ScrapHeaps, WastelandSand, MetalRoads
  
  // Career stats
  racesEntered: Nat;
  wins: Nat;
  places: Nat;
  shows: Nat;
  totalScrapEarned: Nat;
  factionReputation: Nat;        // Reputation with faction, affects special race access
  
  // Timestamps
  activatedAt: Int;              // When the bot was first activated (minted)
  lastRecharged: ?Int;
  lastRepaired: ?Int;
  lastDiagnostics: ?Int;
  lastRaced: ?Int;
  upgradeEndsAt: ?Int;
}

// Faction types
type FactionType = {
  #BattleBot;
  #EntertainmentBot;
  #WildBot;
  #GodClass;
  #Master;
};

// Terrain types in the wastelands
type Terrain = {
  #ScrapHeaps;      // Garbage towers from old earth
  #WastelandSand;   // Sun-scorched desert
  #MetalRoads;      // Ancient highways
};

// Distance preferences
type Distance = {
  #ShortSprint;     // < 10km
  #MediumHaul;      // 10-20km
  #LongTrek;        // > 20km
};
```

### 4.2 NFT Operations

**No Minting - Using Existing PokedBots:**
- Users must already own PokedBots from the EXT canister
- Racing canister calls `tokens(user_account)` to get list of owned token indices
- On first use of a PokedBot for racing, stats are initialized deterministically:
  - Base stats seeded from token index (hash of index)
  - Faction derived from token index range or EXT metadata
  - Initial battery: 100, condition: 100, calibration: 50
- No cost to initialize - just proves ownership

**Transfer Handling:**
- When PokedBot is transferred in EXT canister, racing stats remain in racing canister
- Before any operation, racing canister verifies current owner via `tokens()` or `bearer()`
- If ownership changed:
  - Racing stats transfer to new owner automatically
  - Old owner loses access to that bot's racing stats
  - Prevents using racing stats after selling NFT
- Ongoing races: Bots in active races are "locked" - require race completion before transfer

**No Burning:**
- Racing canister doesn't control NFT burning
- If NFT burned in EXT canister, racing stats become inaccessible (orphaned)
- Consider: Admin function to clean up orphaned stats

---

## 5. MCP Tool Specifications

**Payment Model:** All paid operations require the user to have approved the canister via ICRC-2 `approve` with sufficient allowance. Each operation will call `transfer_from` to pull the exact amount needed. No virtual balance to manage.

**Status (COMPLETE):** All 15 MCP tools are fully functional on IC mainnet:
- ✅ Marketplace: browse, purchase, list, unlist, transfer
- ✅ Garage: initialize bots, get details, view owned bots
- ✅ Maintenance: recharge, repair, upgrades
- ✅ Racing: list races, enter races, sponsor races

### 5.1 Robot Management Tools

#### **Tool: `garage_list_my_pokedbots`** ✅ IMPLEMENTED
List all PokedBots you own in your garage subaccount.

**Input:** None (uses authenticated principal)

**Output:**
```json
{
  "owned_pokedbots": [
    {
      "index": 4079,
      "token_id": "bzsui-sqaaa-aaaah-qce2a-cai-4079",
      "image_url": "https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=bzsui-sqaaa-aaaah-qce2a-cai-4079"
    }
  ],
  "total_owned": 1
}
```

**Behavior:**
- Derives garage subaccount from caller's principal ("GARG" + principal bytes)
- Calls EXT canister `tokens(garage_account)` to get owned token indices
- Encodes token IDs using EXT format
- Returns list with image URLs for viewing on raw.icp0.io

**Current Status:** Fully functional on IC mainnet. Racing stats will be added in Phase 2.

---

### 5.2 Marketplace Tools (Phase 1 - COMPLETE)

#### **Tool: `marketplace_browse_pokedbots`** ✅ IMPLEMENTED
Browse PokedBots marketplace listings with pagination and caching.

**Input:**
```json
{
  "after": 42  // Optional: cursor for pagination (token index)
}
```

**Output:**
```json
{
  "listings": [
    {
      "token_index": 4079,
      "price": 600000000,
      "price_icp": "6.00",
      "seller": "abc123..."
    },
    // ... 4 more listings
  ],
  "next_cursor": 4567,
  "has_more": true,
  "cached_at": "2025-11-15T10:30:00Z"
}
```

**Behavior:**
- Returns 5 listings per page, sorted by price (lowest first)
- Uses 5-minute cache to prevent repeated fetches of 1,252 listings
- Cursor-based pagination using token index as "after" parameter
- Prices displayed in both e8s and human-readable ICP format

---

#### **Tool: `marketplace_purchase_pokedbot`** ✅ IMPLEMENTED
Purchase a PokedBot from the marketplace using ICRC-2 approval-based payment.

**Input:**
```json
{
  "token_index": 4079
}
```

**Output:**
```json
{
  "success": true,
  "token_index": 4079,
  "price_paid": "6.00 ICP",
  "transaction_1": "Block #30762469",
  "transaction_2": "Block #30762471",
  "message": "PokedBot #4079 is now in your garage!"
}
```

**Behavior:**
- Verifies user has approved sufficient ICRC-2 allowance (price + 10,000 e8s fee)
- Two-step payment flow:
  1. `icrc2_transfer_from(user → garage_subaccount, price + fee)` - Pull ICP from user
  2. `transfer(garage_subaccount → marketplace, price)` - Send to marketplace payment address
- Marketplace settlement:
  1. `lock(token_index, price, buyer=garage_account_id)` - Reserve NFT
  2. Payment sent to hex-decoded marketplace address
  3. `settle(token_index)` - Complete transfer to garage subaccount
- Critical: Buyer address in lock() must be garage AccountIdentifier (not seller's)
- Uses Base16.decode() for hex payment address, account-identifier package for encoding

---

#### **Tool: `garage_initialize_pokedbot`** ✅ IMPLEMENTED
Initialize a PokedBot for racing (first-time setup, free).

**Input:**
```json
{
  "token_index": 108
}
```

**Output:**
```json
{
  "token_index": 108,
  "faction": "WildBot",
  "stats": {
    "speed": 72,
    "powerCore": 65,
    "acceleration": 88,
    "stability": 54
  },
  "battery": 100,
  "condition": 100,
  "calibration": 50,
  "status": "Initialized for wasteland racing!",
  "faction_message": "Wild Bot detected. Unstable systems from 2453 solar flare."
}
```

**Behavior:**
- Verifies user owns this PokedBot via EXT canister
- Loads precomputed stats from data/precomputed-stats.json (deterministic from token index)
- Applies faction bonuses
- Stores racing stats in racing canister
- No payment required

---

#### **Tool: `garage_get_robot_details`** ✅ IMPLEMENTED
Get comprehensive details for a specific PokedBot.



**Input:**
```json
{
  "token_index": 4079
}
```

**Output:**
```json
{
  "token_index": 4079,
  "owner": "aaaaa-aa",
  "faction": "BattleBot",
  "initialized": true,
  
  "stats": {
    "speed": 67,
    "powerCore": 80,
    "acceleration": 70,
    "stability": 84,
    "overall_rating": 75
  },
  
  "condition": {
    "battery": 100,
    "condition": 100,
    "status": "Ready"
  },
  
  "career": {
    "races_entered": 0,
    "wins": 0,
    "places": 0,
    "shows": 0
  },
  
  "upgrade_status": {
    "active": false
  }
}
```

---

### 5.3 Maintenance & Upgrade Tools (COMPLETE)

**Note:** All paid maintenance/upgrade operations pull funds directly from user's wallet via ICRC-2 `transfer_from`. User must maintain sufficient ICRC-2 allowance.

#### **Tool: `garage_recharge_robot`** ✅ IMPLEMENTED
Recharge a robot to restore condition and battery.

**Input:**
```json
{
  "token_id": "42"
}
```

**Output:**
```json
{
  "token_id": "42",
  "action": "Recharge",
  "payment": {
    "amount": "10",
    "fee": "0.01",
    "total": "10.01"
  },
  "condition_restored": 20,
  "battery_restored": 10,
  "new_condition": 100,
  "new_battery": 95,
  "next_available": "2025-11-15T16:00:00Z",
  "message": "Power cells recharged. Systems nominal."
}
```
}
```

**Output:**
```json
{
  "token_id": "42",
  "action": "Feed",
  "cost": "10",
  "health_restored": 20,
  "energy_restored": 10,
  "new_health": 100,
  "new_energy": 95,
  "next_available": "2025-11-15T16:00:00Z",
  "new_balance": "3490000"
}
```

---

#### **Tool: `garage_upgrade_robot`** ✅ IMPLEMENTED
Start an upgrade session for a robot.

**Input:**
```json
{
  "token_index": 4079,
  "upgrade_type": "Velocity"  // Velocity, PowerCore, Thruster, Gyro
}
```

**Output:**
```json
{
  "success": true,
  "token_index": 4079,
  "upgrade_type": "Velocity",
  "payment": "20 ICP + 0.0001 ICP fee",
  "duration": "12 hours",
  "completes_at": "2025-11-16T02:00:00Z",
  "expected_gain": "+1-3 Speed",
  "message": "Installing velocity module..."
}
```

---

### 5.4 Racing Tools (COMPLETE)

**Note:** Race entries pull funds directly from user's wallet via ICRC-2 `transfer_from`. Prize winnings are sent directly back to user's wallet via ICRC-2 `transfer`.

#### **Tool: `racing_list_races`** ✅ IMPLEMENTED
List available and upcoming wasteland races departing from Delta City.

**Input:**
```json
{
  "status": ["Open", "Upcoming", "InProgress", "Completed"],
  "class": "Raider",        // Optional filter: Scavenger, Raider, Elite, SilentKlan
  "terrain": "ScrapHeaps",  // Optional filter: ScrapHeaps, WastelandSand, MetalRoads
  "faction_only": "BattleBot",  // Optional: races restricted to faction
  "min_distance": 10,       // Optional (in km)
  "max_distance": 20,       // Optional (in km)
  "limit": 20,
  "offset": 0
}
```

**Output:**
```json
{
  "races": [
    {
      "race_id": "race_123",
      "name": "Scrap Heap Sprint",
      "distance": 15,
      "terrain": "ScrapHeaps",
      "class": "Raider",
      "entry_fee": "150",
      "prize_pool": "1140",  // After Silent Klan tax
      "silent_klan_tax": "60",
      "entries": 6,
      "max_entries": 12,
      "route_description": "Through the garbage towers of former Antarctica",
      "start_time": "2025-11-16T14:00:00Z",
      "entry_deadline": "2025-11-16T13:30:00Z",
      "faction_restricted": false,
      "status": "Open"
    }
  ],
  "total_count": 15,
  "returned_count": 1
}
```
}
```

---

#### **Tool: `racing_enter_race`** ✅ IMPLEMENTED
Enter a robot in a wasteland race.

**Input:**
```json
{
  "race_id": "race_123",
  "token_id": "42"
}
```

**Output:**
```json
{
  "race_id": "race_123",
  "token_id": "42",
  "robot_name": "Scrap-Runner-7",
  "payment": {
    "entry_fee": "150",
    "transfer_fee": "0.01",
    "total": "150.01"
  },
  "position_in_field": 7,
  "total_entries": 7,
  "race_starts_at": "2025-11-16T14:00:00Z",
  "departure_location": "Delta City Train Station - Platform 7",
  "status": "Entry confirmed - Bot loaded onto wasteland train"
}
```

**Validations:**
- Robot Condition ≥ 70
- Robot Battery ≥ 50
- Sufficient ICRC-2 allowance for entry fee + 0.01
- Race not full
- Before entry deadline
- Robot not in another race at same time
- Faction requirements met (if restricted race)

---

#### **Tool: `garage_claim_race_results`**
Claim results from a completed race. Prize winnings are automatically sent to user's wallet.

**Input:**
```json
{
  "race_id": "race_123"
}
```

**Output:**
```json
{
  "race_id": "race_123",
  "token_id": "42",
  "robot_name": "Scrap-Runner-7",
  "finish_position": 2,
  "finish_time": "54.234",  // In minutes
  "prize_won": "285",  // 23.75% of 1200 prize pool
  "prize_transfer": {
    "amount": "285",
    "sent_to": "user_principal",
    "transfer_fee": "0.01"  // Paid by canister from Silent Klan treasury
  },
  "faction_reputation_gained": 15,
  "robot_stats_updated": {
    "battery": 40,      // Depleted from race
    "experience": 105,  // Gained XP
    "wins": 0,
    "places": 1,        // Incremented
    "faction_reputation": 165,
    "total_earnings": "785"  // Lifetime cumulative
  },
  "race_commentary": "Strong performance through the scrap heaps!"
}
```

---

#### **Tool: `garage_get_race_results`**
Get detailed results of a completed wasteland race.

**Input:**
```json
{
  "race_id": "race_123"
}
```

**Output:**
```json
{
  "race_id": "race_123",
  "name": "Scrap Heap Sprint",
  "distance": 15,
  "terrain": "ScrapHeaps",
  "route": "Delta City → Garbage Towers → Former Antarctica Site 7",
  "completed_at": "2025-11-16T14:52:15Z",
  "weather_conditions": "Solar flare at 23min mark (-10% all speeds)",
  "results": [
    {
      "position": 1,
      "token_id": "18",
      "robot_name": "Volt-Striker",
      "faction": "GodClass",
      "owner": "bbbbb-bb",
      "finish_time": "52.123",  // minutes
      "prize": "541.5"  // 47.5% of 1140
    },
    {
      "position": 2,
      "token_id": "42",
      "robot_name": "Scrap-Runner-7",
      "faction": "BattleBot",
      "owner": "aaaaa-aa",
      "finish_time": "54.234",
      "prize": "270.75"  // 23.75% of 1140
    }
  ],
  "total_prize_pool": "1140",
  "silent_klan_tax_collected": "60"
}
```

#### **Tool: `racing_sponsor_race`** ✅ IMPLEMENTED
Sponsor a race to add funds to the prize pool.

**Input:**
```json
{
  "race_id": 123,
  "amount_icp": 10.5,
  "message": "Go BattleBots!"
}
```

**Output:**
```json
{
  "success": true,
  "race_id": 123,
  "amount": "10.5 ICP",
  "new_prize_pool": "125.5 ICP",
  "message": "Sponsorship added to race prize pool!"
}
```

---

### 5.5 Secondary Marketplace Tools (COMPLETE)

#### **Tool: `marketplace_list_pokedbot`** ✅ IMPLEMENTED
List a robot for sale in Delta City marketplace.

---

## 6. Automated Processes

### 6.1 Wasteland Race Scheduler Timer
- **Frequency:** Every 30-60 minutes
- **Function:** Create new wasteland races departing from Delta City
- **Logic:**
  - Creates 3-5 races at various times in the next 6-12 hours
  - Randomizes distance, terrain, class
  - Assigns thematic names based on route and terrain
  - Sets entry fees and max entries based on class
  - Occasional faction-restricted races (Silent Klan Invitational, etc.)
  - Applies Silent Klan 5% tax to all prize pools

### 6.2 Race Simulation Timer
- **Frequency:** Every 5 minutes
- **Function:** Run races that have passed their start time
- **Logic:**
  - Find all races with `status = Open` and `start_time < now`
  - Run deterministic simulation for each race
  - Apply faction bonuses and wasteland hazards
  - Update race status to `Completed`
  - Credit winners' balances (after Silent Klan tax)
  - Update robot stats (deplete battery, add XP, increment faction reputation)
  - Record detailed results with race commentary

### 6.3 Robot Decay Timer
- **Frequency:** Every 24 hours
- **Function:** Apply decay to neglected robots
- **Logic:**
  - For all robots not in upgrades/racing:
    - Decrease Condition by 5
    - Decrease Calibration by 3
    - If last recharged > 48 hours ago: Extra -5 Condition
  - Wild Bots: Decay 20% faster (chaotic systems)
  - God Class: Decay 30% slower (superior construction)

### 6.4 Upgrade Completion Monitor
- **Frequency:** Every 1 hour
- **Function:** Auto-complete finished upgrade sessions
- **Logic:**
  - Find all robots with `upgradeEndsAt < now`
  - Apply stat gains (with faction modifiers)
  - Clear upgrade status
  - Add experience points
  - Log completion event

---

## 7. Data Structures

### 7.1 Stable Variables

```motoko
// NFT storage
stable var pokedBotNFTs: Map<Nat, PokedBotNFT> = Map.new();
stable var nextTokenId: Nat = 0;

// Race management
stable var wastelandRaces: Map<Text, WastelandRace> = Map.new();
stable var raceEntries: Map<Text, [RaceEntry]> = Map.new();
stable var nextRaceId: Nat = 0;

// Upgrade sessions
stable var activeUpgrades: Map<Nat, UpgradeSession> = Map.new();

// Maintenance cooldowns
stable var maintenanceCooldowns: Map<Nat, MaintenanceCooldowns> = Map.new();

// Faction reputation tracking (per user)
stable var factionReputation: Map<Principal, Map<FactionType, Nat>> = Map.new();

// Robot career stats and lifetime earnings (tracked for leaderboards)
stable var robotEarnings: Map<Nat, Nat> = Map.new();

// Subaccounts for fund segregation
// - Race pool subaccount: holds entry fees until race completes
// - Silent Klan treasury: accumulates 5% tax + covers prize transfer fees
```

### 7.2 Key Type Definitions

```motoko
type PokedBotNFT = {
  tokenId: Nat;
  owner: Principal;
  name: Text;
  faction: FactionType;
  chassis: Text;
  accents: Text;
  
  // Stats
  baseSpeed: Nat;
  basePowerCore: Nat;
  baseAcceleration: Nat;
  baseStability: Nat;
  
  speed: Nat;
  powerCore: Nat;
  acceleration: Nat;
  stability: Nat;
  
  battery: Nat;
  condition: Nat;
  calibration: Nat;
  experience: Nat;
  
  preferredDistance: Distance;
  preferredTerrain: Terrain;
  
  // Career
  racesEntered: Nat;
  wins: Nat;
  places: Nat;
  shows: Nat;
  totalScrapEarned: Nat;
  factionReputation: Nat;
  
  // Timestamps
  activatedAt: Int;
  lastRecharged: ?Int;
  lastRepaired: ?Int;
  lastDiagnostics: ?Int;
  lastRaced: ?Int;
};

type WastelandRace = {
  raceId: Text;
  name: Text;
  distance: Nat;  // in km
  terrain: Terrain;
  route: Text;
  class: RaceClass;
  entryFee: Nat;
  prizePool: Nat;  // After Silent Klan tax
  silentKlanTax: Nat;
  maxEntries: Nat;
  startTime: Int;
  entryDeadline: Int;
  factionRestricted: ?FactionType;
  status: RaceStatus;
};

type RaceEntry = {
  tokenId: Nat;
  owner: Principal;
  faction: FactionType;
  enteredAt: Int;
};

type RaceStatus = {
  #Open;
  #InProgress;
  #Completed: {
    results: [RaceResult];
    completedAt: Int;
    weatherConditions: Text;
  };
  #Cancelled;
};

type RaceResult = {
  position: Nat;
  tokenId: Nat;
  robotName: Text;
  faction: FactionType;
  finishTime: Float;  // in minutes
  prize: Nat;
  factionRepGained: Nat;
};

type UpgradeSession = {
  tokenId: Nat;
  upgradeType: UpgradeType;
  startedAt: Int;
  endsAt: Int;
};

type UpgradeType = {
  #Velocity;      // Speed
  #PowerCore;     // Power Core
  #Thruster;      // Acceleration
  #Gyro;          // Stability
};

type Terrain = {
  #ScrapHeaps;      // Garbage towers
  #WastelandSand;   // Desert
  #MetalRoads;      // Ancient highways
};

type Distance = {
  #ShortSprint;    // < 10km
  #MediumHaul;     // 10-20km
  #LongTrek;       // > 20km
};

type RaceClass = {
  #Scavenger;       // 0-2 wins
  #Raider;          // 3-5 wins
  #Elite;           // 6-9 wins
  #SilentKlan;      // 10+ wins, God Class & Masters only
};

type FactionType = {
  #BattleBot;
  #EntertainmentBot;
  #WildBot;
  #GodClass;
  #Master;
};

type MaintenanceCooldowns = {
  lastRecharged: ?Int;
  lastRepaired: ?Int;
  lastDiagnostics: ?Int;
};
```

---

## 8. Token Economics - Scrap Credit System

### 8.1 Credit Flows

**Credit Sinks (money out of circulation):**
- Robot minting: 800-5000 credits (faction-dependent)
  - BattleBot/EntertainmentBot: 1000 credits
  - WildBot: 800 credits (cheap, unstable)
  - Master: 3500 credits
  - God Class: 5000 credits (rare, premium)
- Race entry fees: 50-500 credits (→ prize pool after tax)
- Maintenance actions: 5-50 credits (→ burned, represents spare parts scavenged)
- Upgrades: 20-25 credits (→ burned, represents installation labor)
- Silent Klan tax: 5% of all race entry fees (→ canister treasury)

**Credit Sources (money into circulation):**
- Race prizes: 95% of entry fees distributed to winners
- Initial deposits from users
- Robot salvage (burning): 100-500 credits depending on faction

### 8.2 Prize Pool Math

For an 8-robot race with 150 credit entry fee:
- Total entries: 1200 credits
- Silent Klan tax (5%): 60 credits
- Remaining prize pool: 1140 credits
- 1st place: 541.5 credits (47.5%)
- 2nd place: 270.75 credits (23.75%)
- 3rd place: 162.45 credits (14.25%)
- 4th place: 108.3 credits (9.5%)
- Total distributed: 1082.5 credits + 60 tax = 1142.5 credits

**Note:** Silent Klan 5% tax goes to canister treasury (owner-controlled). Represents the price of operating in Delta City territory.

---

## 9. Security Considerations

### 9.1 Randomness
- Use deterministic pseudo-randomness based on race ID + start time + block hash
- Ensures races can be simulated consistently
- Prevents manipulation (seed unknown until race time)

### 9.2 Authorization
- All robot operations require NFT ownership verification
- ICRC-2 `transfer_from` requires explicit user approval
- Only robot owner can upgrade, race, or maintain their robots
- Canister cannot pull more funds than approved amount

### 9.3 Economic Safeguards
- ICRC-2 allowance checks prevent unauthorized transfers
- Race entry validates robot condition before accepting payment
- Prize distribution is automatic and deterministic
- Silent Klan treasury prevents insolvency (covers transfer fees)
- No virtual balance exploits (no balance to manipulate)

### 9.4 Data Integrity
- All state changes are atomic
- Failed ICRC-2 transfers revert state
- Stable storage ensures persistence across upgrades
- Subaccounts segregate operational funds

### 9.5 ICRC-2 Transfer Security
- Always check allowance before attempting `transfer_from`
- Handle insufficient allowance gracefully with clear error messages
- Verify transfer success before updating state
- Use subaccounts to prevent fund mixing
- Silent Klan treasury acts as buffer for operational costs

---

## 10. MVP Scope & Exclusions

### ✅ **In Scope for MVP**
- Single token support (USDC or ICP as "Scrap Credits")
- **Direct ICRC-2 transfer architecture** (no virtual accounts)
- Basic ICRC-7 NFT implementation (PokedBots collection)
- 5 faction types with unique stat distributions
- 4 primary stats + 3 dynamic stats
- 4 maintenance actions (with ICRC-2 payment)
- 4 upgrade types (with ICRC-2 payment)
- Automated wasteland race scheduling & simulation
- 4 race classes (Scavenger, Raider, Elite, Silent Klan)
- 3 terrain types (Scrap Heaps, Wasteland Sand, Metal Roads)
- Faction-specific bonuses and characteristics
- Silent Klan 5% tax system with treasury subaccount
- Faction reputation tracking
- Direct prize payouts to user wallets
- MCP tool server interface
- Wasteland lore and thematic flavor text

### ❌ **Out of Scope (Future Enhancements)**
- Robot breeding/fusion (combining two robots to create hybrid)
- Multi-token support
- Advanced environmental effects (radiation storms, EMP pulses)
- PvP betting on races
- Robot equipment/modifications (weapons, armor plating)
- Garage upgrades (better tools, faster repairs)
- Leaderboards and faction rankings
- Robot marketplace (peer-to-peer trading in Delta City)
- Story missions and faction quests
- Mobile/web UI (agent-first for now)
- Social features (faction alliances, robot gangs)
- Connection to Europa Base 7 (Master faction lore)
- Wild Bot derangement progression system

---

## 11. Development Phases

### **Phase 1: Marketplace Integration (COMPLETE) ✅**
- ✅ Set up canister structure on IC mainnet (`3od6b-qiaaa-aaaai-q37ma-cai`)
- ✅ Implement ICRC-2 approval-based payment system with subaccount routing
- ✅ Build marketplace browse tool with caching (5-min TTL) and pagination
- ✅ Build marketplace purchase tool with two-step payment flow
- ✅ Implement EXT AccountIdentifier encoding (CRC32 + SHA224)
- ✅ Add Base16 hex decoding for marketplace payment addresses
- ✅ Create garage subaccount system ("GARG" + principal bytes)
- ✅ Build garage list tool with image URL display
- ✅ Test successful purchase (PokedBot #4079 for 6.00 ICP)
- ✅ Comprehensive documentation in docs/marketplace-integration.md

**Deployed Tools:**
1. `marketplace_browse_pokedbots` - Browse 1,252+ listings with pagination
2. `marketplace_purchase_pokedbot` - Purchase with ICRC-2 approval
3. `garage_list_my_pokedbots` - View owned NFTs with images
4. `marketplace_list_pokedbot` - List bots for sale
5. `marketplace_unlist_pokedbot` - Remove listings
6. `garage_transfer_pokedbot` - Transfer bots to other users

### **Phase 2: Generic Racing Architecture (COMPLETE) ✅**
- ✅ Design RacingSimulator module with RacingStatsProvider interface
- ✅ Implement PokedBotsGarage module for collection-specific logic
- ✅ Generate precomputed-stats.json for all 10,000 PokedBots (deterministic from token index)
- ✅ Implement racing stats initialization (from precomputed stats)
- ✅ Create PokedBot data structures with faction types and bonuses
- ✅ Build maintenance system (recharge, repair) with ICRC-2 payments
- ✅ Build upgrade system (Velocity, PowerCore, Thruster, Gyro)
- ✅ Implement faction reputation tracking
- ✅ Create wasteland lore flavor text system

**Deployed Tools:**
7. `garage_initialize_pokedbot` - Register bot for racing (free)
8. `garage_get_robot_details` - View detailed bot stats
9. `garage_recharge_robot` - Restore battery/condition (10 ICP)
10. `garage_repair_robot` - Restore condition (5 ICP)
11. `garage_upgrade_robot` - Start upgrade session (20 ICP)

### **Phase 3: Racing Engine (COMPLETE) ✅**
- ✅ Implement race simulation algorithm with faction bonuses
- ✅ Build RaceCalendar module with automated scheduling
- ✅ Create race creation system (daily sprints, weekly leagues, monthly tournaments)
- ✅ Build race entry system (ICRC-2 transfer_from for fees)
- ✅ Implement race simulation with terrain effects and hazards
- ✅ Add prize distribution (ICRC-2 transfer to winners)
- ✅ Implement platform tax collection (5%)
- ✅ Add race commentary/flavor text
- ✅ Build sponsorship system for augmenting prize pools

**Deployed Tools:**
12. `racing_list_races` - Browse upcoming races with filters
13. `racing_enter_race` - Enter bot in race
14. `racing_sponsor_race` - Add to prize pools

### **Phase 4: Leaderboard & Polish (COMPLETE) ✅**
- ✅ Implement Leaderboard module with rankings
- ✅ Add achievement tracking
- ✅ Integration testing with full racing mechanics
- ✅ Balance tuning (faction advantages, costs, stat gains)
- ✅ Documentation updates with complete system architecture
- ✅ Create comprehensive guides for users and AI agents

**Current Status:** All 15 MCP tools deployed and functional on IC mainnet canister `3od6b-qiaaa-aaaai-q37ma-cai`

---

## 12. Success Metrics

### All Phases Complete ✅

**Marketplace Integration:**
1. ✅ Users can approve canister for ICRC-2 spending (150M e8s recommended)
2. ✅ Users can browse PokedBots marketplace (1,252+ listings)
3. ✅ Pagination works correctly (5 listings per page, cursor-based)
4. ✅ Marketplace cache prevents repeated fetches (5-minute TTL)
5. ✅ Users can purchase PokedBots via ICRC-2 approval-based payment
6. ✅ Two-step payment flow works (user → garage → marketplace)
7. ✅ EXT AccountIdentifier encoding is correct (CRC32 + SHA224)
8. ✅ Marketplace payment addresses decode properly (Base16)
9. ✅ NFTs transfer to garage subaccount after purchase
10. ✅ Users can view owned PokedBots in garage with image URLs
11. ✅ All MCP tools handle ICRC-2 allowance errors gracefully
12. ✅ Real purchase test successful (PokedBot #4079 for 6.00 ICP)
13. ✅ Users can list and unlist bots on marketplace
14. ✅ Users can transfer bots to other accounts

**Racing System:**
1. ✅ Users can initialize PokedBots for racing (deterministic stats from precomputed data)
2. ✅ Users can view detailed robot stats with faction bonuses
3. ✅ Users can recharge and repair robots via ICRC-2 payments
4. ✅ Users can upgrade robots (Velocity, PowerCore, Thruster, Gyro) via ICRC-2 payments
5. ✅ Automated races are created on daily/weekly/monthly schedules
6. ✅ Users can enter robots in races with ICRC-2 fee payment
7. ✅ Races simulate deterministically with faction bonuses and terrain effects
8. ✅ Prize winnings are distributed correctly via ICRC-2 transfer
9. ✅ Robot stats evolve correctly through upgrades and racing
10. ✅ Faction reputation increases with race performance
11. ✅ Platform 5% tax is properly collected
12. ✅ Sponsorship system allows adding to prize pools
13. ✅ System handles 100+ concurrent robots without performance issues
14. ✅ Faction-specific mechanics work correctly (faction bonuses, stat distributions)
15. ✅ No stuck funds scenarios (all flows tested)
16. ✅ Lore and flavor text enhance the experience
17. ✅ Comprehensive documentation and guides available

---

## 13. Technical Dependencies

### 13.1 Motoko Packages (mops.toml)
**Current Implementation (All Phases Complete):**
```toml
[dependencies]
base = "0.11.1"
base16 = "1.0.0"
account-identifier = "1.0.2"
icrc2-types = "1.1.0"
array = "0.2.1"
iterators = "0.1.1"
stable-hash-map = "0.2.0"
json = "1.4.0"
map = "9.0.1"
http-types = "1.0.1"
mcp-motoko-sdk = "2.0.2"
datetime = "1.1.0"
certified-cache = "0.3.0"
timer-tool = "0.3.0"
star = "0.3.3"
sha2 = "0.1.6"
ic = "1.0.1"
class-plus = "1.0.0"
```

### 13.2 External Canisters

**PokedBots EXT NFT & Marketplace Canister**
- **Canister ID:** `bzsui-sqaaa-aaaah-qce2a-cai`
- **Standard:** EXT (Entrepot extensible token standard)
- **Purpose:** Marketplace listings, NFT purchases, ownership verification
- **Methods Used:**
  - `listings() -> [(TokenIndex, Listing, Metadata)]` - Get all marketplace listings (1,252+)
  - `lock(TokenIndex, Nat64, AccountIdentifier) -> Result_9` - Reserve NFT for purchase
  - `settle(TokenIdentifier) -> Result_8` - Complete NFT transfer after payment
  - `tokens(AccountIdentifier) -> Result_1` - Get user's owned token indices
  - `bearer(TokenIdentifier) -> Result_5` - Get owner of specific token
- **Integration Pattern:** Full marketplace integration (buy, sell, list, unlist, transfer)

**ICP Ledger Canister**
- **Canister ID:** `ryjl3-tyaaa-aaaaa-aaaba-cai`
- **Token:** ICP (used for all payments)
- **Methods Used:**
  - `icrc2_approve` - User approves racing canister for spending
  - `icrc2_transfer_from` - Racing canister pulls ICP from user
  - `icrc2_transfer` - Racing canister sends prizes to users
  - `transfer` - Legacy transfer for marketplace payments
  - `icrc2_allowance` - Check remaining approved amount

**No Oracle Dependencies**
- Self-contained race simulation
- Deterministic based on on-chain data

---

## 14. Open Questions & Design Decisions Needed

1. **Token Choice:** Should we use ICP or USDC for "Scrap Credits"?
   - **Recommendation:** ICP for easier testing and thematic fit (post-apocalyptic economy), migrate to USDC for production if needed

2. **Robot Naming:** Should names be unique? Validated?
   - **Recommendation:** No uniqueness constraint (multiple "Scrap-Runners" can exist), max 32 chars, alphanumeric + hyphens

3. **Race Frequency:** 30-60 minute intervals appropriate?
   - **Recommendation:** Start with 1 hour, tune based on activity. Wasteland is dangerous—trains don't depart constantly

4. **Stat Caps:** Should stats have hard caps or soft caps?
   - **Recommendation:** Hard cap at 100, diminishing returns above 80. Even God Class can't exceed physical limits

5. **NFT Metadata Standard:** Store all stats on-chain or just base stats?
   - **Recommendation:** All stats on-chain for queryability and transparency. Upgrades are permanent modifications

6. **Transfer Restrictions:** Should robots in active races be non-transferable?
   - **Recommendation:** Yes, freeze transfers during races. Can't sell a bot mid-race through wasteland

7. **Faction Balance:** How strong should God Class advantage be?
   - **Recommendation:** 10% bonus justified by 5x mint cost. Still beatable by well-maintained lower-tier bots

8. **Wild Bot Mechanics:** How unpredictable should they be?
   - **Recommendation:** ±15% variance creates exciting "high risk/high reward" gameplay without being unfair

9. **Silent Klan Tax:** Should tax rate be adjustable or fixed?
   - **Recommendation:** Fixed at 5% for MVP. Future: governance or owner-adjustable

10. **Faction-Restricted Races:** How often should Silent Klan Invitational occur?
    - **Recommendation:** 1-2 per day, high stakes. Maintains exclusivity and prestige

---

## 15. Conclusion

This design document provides a comprehensive specification for the PokedBots Racing simulation MCP server.

### Current Status (All Phases Complete) ✅

**Deployed System:**
- **Canister:** `3od6b-qiaaa-aaaai-q37ma-cai` on IC mainnet
- **Website:** `32qki-jaaaa-aaaai-q4a7a-cai` (https://32qki-jaaaa-aaaai-q4a7a-cai.icp0.io)
- **Architecture:** Modular design with RacingSimulator and PokedBotsGarage modules
- **Tools:** 15 MCP tools for marketplace, garage management, and racing
- **Integration:** PokedBots EXT marketplace (`bzsui-sqaaa-aaaah-qce2a-cai`)
- **Payment:** ICRC-2 approval-based with ICP Ledger (`ryjl3-tyaaa-aaaaa-aaaba-cai`)

**Key Features:**
- ✅ Marketplace integration (browse, purchase, list, unlist, transfer)
- ✅ Racing stats system with faction bonuses (BattleBot, EntertainmentBot, WildBot, Master, GodClass)
- ✅ Upgrade system (Velocity, PowerCore, Thruster, Gyro)
- ✅ Maintenance system (recharge, repair)
- ✅ Race calendar with automated scheduling (daily/weekly/monthly)
- ✅ Race simulation with terrain effects and faction bonuses
- ✅ Prize distribution via ICRC-2
- ✅ Sponsorship system for augmenting prize pools
- ✅ Leaderboard and achievement tracking
- ✅ Comprehensive documentation and user guides

**Technical Achievements:**
- ✅ Generic racing architecture via RacingStatsProvider interface
- ✅ Collection-specific logic cleanly separated in PokedBotsGarage module
- ✅ Efficient caching and pagination for marketplace browsing
- ✅ Robust ICRC-2 approval-based payment flow
- ✅ Precomputed base stats for all 10,000 PokedBots
- ✅ Deterministic race simulation
- ✅ Platform tax collection (5% of race entry fees)
- ✅ Complete MCP tool suite for AI agent integration

### System Strengths

**Technical:**
- **Modular Architecture**: RacingSimulator can work with any NFT collection
- **Fair Gameplay**: Deterministic outcomes prevent manipulation
- **Transparent Economics**: All payments visible on ICRC ledger
- **Scalable**: Single canister architecture ready for expansion
- **User-Friendly**: No deposit/withdrawal friction, direct ICRC-2 payments

**Gameplay:**
- **Strategic Depth**: Faction bonuses, terrain preferences, upgrade paths
- **Engaging Mechanics**: Maintenance, upgrades, scheduled races
- **Balanced Factions**: Each faction has unique advantages
- **Rich Lore**: Wasteland theme with Delta City, Silent Klan, faction backstories

**Accessibility:**
- **Agent-First**: Full MCP tool suite for AI agent integration
- **No Wallet Switching**: Purchase and race without leaving MCP interface
- **Simple Payments**: One-time ICRC-2 approval, canister handles rest
- **Comprehensive Guides**: Documentation for users and developers

### The PokedBots Racing Experience

Users can now:
1. **Browse & Purchase**: Find PokedBots on the marketplace and buy with ICP
2. **Initialize for Racing**: Register bots for wasteland racing (free)
3. **Upgrade & Maintain**: Improve stats and keep bots in racing condition
4. **Compete & Win**: Enter scheduled races and earn ICP prizes
5. **Track Progress**: View leaderboards and career statistics

All accessible through AI agents via the Model Context Protocol, creating a seamless on-chain gaming experience.

**The wasteland awaits. Delta City's racing circuit is open for business.**
