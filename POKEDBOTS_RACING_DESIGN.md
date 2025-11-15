# PokedBots Racing Simulation MCP Server - Design Document

**Version:** 2.0  
**Date:** November 15, 2025  
**Status:** Phase 1 Complete - Marketplace Integration Live

---

## 1. Executive Summary

This document specifies the design of an on-chain robot racing simulation system built as an MCP (Model Context Protocol) server on the Internet Computer. Set 500 years in the future in the eastern wastelands surrounding Delta City, the system allows users to browse, purchase, and manage a garage of NFT robots from the existing PokedBots marketplace.

**Phase 1 (COMPLETE):** Marketplace integration with ICRC-2 approval-based purchasing, EXT NFT ownership verification, and subaccount-based garage management. Users can browse 1,252+ PokedBots listings, purchase them using ICP via two-step payment routing, and view their owned collection with image URLs.

**Future Phases:** Racing mechanics, robot maintenance/upgrades, and wasteland competition. Stats will be derived deterministically from NFT metadata when racing is implemented, creating a play-and-earn gaming experience accessible to AI agents.

**Current Deployment:** Canister `3od6b-qiaaa-aaaai-q37ma-cai` on IC mainnet

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

### 2.1 Marketplace Integration vs. Mint-First Approach
**Decision**: Integrate with existing PokedBots marketplace for purchasing, then add racing later

**Rationale**:
- Users can browse and purchase PokedBots in-game without leaving MCP interface
- Leverages existing NFT marketplace liquidity (1,252+ listings)
- No wallet-switching friction - pay with ICP directly via ICRC-2
- Garage system manages purchased NFTs with subaccount architecture
- Future racing stats will be stored separately and won't pollute NFT metadata

**Implementation (Phase 1 - COMPLETE)**:
- `marketplace_browse_pokedbots`: Cached listing with pagination (5-min TTL)
- `marketplace_purchase_pokedbot`: ICRC-2 approval-based purchase with two-step payment routing
- `garage_list_my_pokedbots`: View owned NFTs with image URLs
- Subaccount-based garage: Each user gets unique "GARG" + principal bytes subaccount
- EXT AccountIdentifier encoding: CRC32 + SHA224 hash for compatibility
- Payment flow: User → Garage Subaccount → Marketplace (via lock/settle)

**Future Implementation (Phase 2+)**:
- Racing stats initialized on first race entry (deterministic from token index)
- Ownership verified before every operation via `bearer()` calls

### 2.2 ICRC-2 Approval-Based Payments with Subaccount Routing
**Decision**: Use ICRC-2 `transfer_from` with subaccount-based payment routing

**Rationale**:
- **Simpler UX**: No deposit/withdraw friction - users keep funds in their wallet
- **Better for AI agents**: One-time approval, then canister handles payments automatically
- **Non-custodial**: Funds flow through garage subaccount but never locked
- **Trade-off**: 0.0001 ICP fee per operation vs. gasless after deposit

**Implementation (Phase 1 - COMPLETE)**:
- User approves racing canister with `icrc2_approve` (150M e8s covers multiple purchases)
- Purchase flow uses two-step payment:
  1. `icrc2_transfer_from(user → garage_subaccount, amount + fee)`
  2. `transfer(garage_subaccount → marketplace, amount)` using hex-decoded payment address
- Garage subaccount format: "GARG" + principal bytes (32 bytes total)
- EXT AccountIdentifier: CRC32 + SHA224 hash, hex-encoded for marketplace
- Marketplace settlement: `lock()` reserves NFT, `settle()` completes transfer after payment

**Future Implementation (Phase 2+)**:
- Race entries pull exact cost via `icrc2_transfer_from`
- Prizes sent back directly via `icrc2_transfer`
- Subaccounts used for pending prize escrow

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

### 3.1 Single Canister Design
Following the proven pattern from the Final Score prediction market, the entire system is contained in a single canister, currently implementing:

**Phase 1 (COMPLETE):**
- **EXT NFT marketplace integration** (browse, purchase, ownership verification)
- **ICRC-2 payment integration** (approval-based transfers via subaccounts)
- **Garage management** (subaccount-based NFT ownership)
- **Marketplace caching** (5-minute TTL, pagination)
- **Image URL display** (raw.icp0.io integration)

**Future Phases:**
- Racing stats storage (separate from NFT metadata)
- Maintenance and upgrade mechanics
- Race simulation engine
- Race entry fees and prize distribution

### 3.2 EXT NFT Marketplace Pattern (Phase 1 Implementation)
- **Robots are purchased from the existing PokedBots marketplace** via in-game tools
- Racing canister integrates with marketplace canister (`bzsui-sqaaa-aaaah-qce2a-cai`)
- Each user has a garage subaccount ("GARG" + principal bytes) that receives purchased NFTs
- Marketplace browsing: Cached listings (5-min TTL), sorted by price, cursor-based pagination
- Purchase flow: ICRC-2 approval → lock() → two-step payment → settle()
- Ownership verification: `bearer(tokenId)` checks current owner
- NFTs remain tradeable in EXT ecosystem - racing canister never locks transfers

**Future Implementation (Phase 2+)**:
- Racing stats initialization: Deterministically seeded from EXT token index on first race
- Stats storage: Upgrades, battery, condition, race history in racing canister
- Ownership sync: Stats transfer when NFT ownership changes
- Faction derivation: From EXT metadata or token index ranges

### 3.3 ICRC-2 Payment System with Subaccount Routing (Phase 1 Implementation)
We use ICRC-2 approval-based payments routed through garage subaccounts:

**Current Implementation:**
- **No deposit/withdraw flow** - users keep ICP in their own wallets
- Purchase flow: `icrc2_transfer_from(user → garage)` then `transfer(garage → marketplace)`
- Agent approves racing canister with `icrc2_approve` (150M e8s recommended)
- Garage subaccount acts as intermediary, not custodian (funds flow through)
- **Payment details**: NFT price + 10,000 e8s transfer fee pulled from user
- **EXT compatibility**: Marketplace payment address decoded from hex to blob
- **Two-step settlement**: lock() reserves NFT, settle() completes after payment verified

**Future Implementation (Phase 2+)**:
- Race entries: `icrc2_transfer_from` for exact entry fee amount
- Maintenance/upgrades: Direct pulls for repair/upgrade costs
- Prize winnings: `icrc2_transfer` directly to user's wallet
- **Trade-off**: 0.0001 ICP fee per transaction vs. complexity of virtual balance
- **Benefit**: Simpler UX, no funds locked in canister, better for occasional users

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

### 3.4 Upgrade System

Upgrading improves robot stats over time by installing scavenged parts from the wastelands:

#### **Upgrade Types** (cost paid via ICRC-2 transfer + time)
1. **Velocity Module** (Cost: 20 credits + 0.01 fee, Duration: 12 hours)
   - +1-3 Speed (max 100)
   - -15 Battery
   - +5 XP
   - Parts source: Ancient vehicle components
   - Payment: Direct ICRC-2 transfer_from to canister

2. **Power Core Enhancement** (Cost: 20 credits + 0.01 fee, Duration: 12 hours)
   - +1-3 Power Core (max 100)
   - -15 Battery
   - +5 XP
   - Parts source: Solar panel arrays from old earth tech
   - Payment: Direct ICRC-2 transfer_from to canister

3. **Thruster Calibration** (Cost: 20 credits + 0.01 fee, Duration: 12 hours)
   - +1-3 Acceleration (max 100)
   - -15 Battery
   - +5 XP
   - Parts source: Rocket parts from abandoned space program sites
   - Payment: Direct ICRC-2 transfer_from to canister

4. **Gyro Stabilization** (Cost: 25 credits + 0.01 fee, Duration: 24 hours)
   - +1-2 Stability (max 100)
   - -10 Battery
   - +10 XP
   - Parts source: Ancient robotics labs in Delta City
   - Payment: Direct ICRC-2 transfer_from to canister

#### **Upgrade Constraints**
- Robot must have Battery > 30
- Robot must have Condition > 50
- Only one upgrade active per robot at a time
- Upgrade effectiveness scales with Calibration level
- Stat gains are probabilistic (better base stats = harder to improve)
- God Class robots: +20% chance for double stat gains
- Wild Bots: Upgrades more unstable (±2 variance instead of ±1)

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

**Phase 1 (COMPLETE):** Marketplace browsing, purchasing, and garage management tools are fully functional on IC mainnet.

**Future Phases:** Robot management, maintenance, upgrades, and racing tools will be implemented in subsequent phases.

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

#### **Tool: `garage_initialize_pokedbot`** ⏳ FUTURE ⏳ FUTURE
Initialize a PokedBot for racing (first-time setup, free). Will be implemented in Phase 2.

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
- Generates deterministic stats from token index
- Applies faction bonuses
- Stores racing stats in racing canister
- No payment required

---

#### **Tool: `garage_list_my_robots`** ⏳ FUTURE
List all PokedBots with active racing stats (convenience method). Will be implemented in Phase 2.

**Input:**
```json
{
  "include_stats": true,
  "faction_filter": "BattleBot",
  "sort_by": "overall_rating"
}
```

**Output:**
```json
{
  "robots": [
    {
      "token_index": 42,
      "faction": "BattleBot",
      "runtime_days": 45,
      "battery": 85,
      "condition": 95,
      "calibration": 72,
      "overall_rating": 76,
      "races_won": 3,
      "total_scrap_earned": "500000",
      "status": "Ready",
      "can_race": true
    }
  ],
  "total_count": 1
}
```

---

#### **Tool: `garage_get_robot_details`** ⏳ FUTURE
Get comprehensive details for a specific PokedBot. Will be implemented in Phase 2.

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
  "owner": "aaaaa-aa",
  "name": "Scrap-Runner-7",
  "faction": "BattleBot",
  "chassis": "Rusted Steel",
  "accents": "Combat Scarring",
  
  "stats": {
    "speed": 67,           // Current (improved from base)
    "powerCore": 80,
    "acceleration": 70,
    "stability": 84,
    "base_speed": 65,      // Original stats at activation
    "base_powerCore": 78
  },
  
  "condition": {
    "battery": 85,
    "condition": 95,
    "calibration": 72,
    "status": "Ready"
  },
  
  "career": {
    "races_entered": 12,
    "wins": 3,
    "places": 2,
    "shows": 4,
    "total_scrap_earned": "500000",
    "faction_reputation": 150
  },
  
  "next_maintenance_available": {
    "recharge": "2025-11-15T10:00:00Z",
    "repair": "2025-11-16T08:00:00Z",
    "diagnostics": null
  },
  
  "upgrade": {
    "active": true,
    "type": "Velocity Module",
    "ends_at": "2025-11-15T20:00:00Z",
    "parts_source": "Ancient vehicle components"
  }
}
```

---

### 5.3 Maintenance & Upgrade Tools (Phase 2+ - FUTURE)

**Note:** All paid maintenance/upgrade operations pull funds directly from user's wallet via ICRC-2 `transfer_from`. User must maintain sufficient ICRC-2 allowance.

#### **Tool: `garage_recharge_robot`**
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

#### **Tool: `garage_upgrade_robot`**
Start an upgrade session for a robot.

**Input:**
```json
{
  "token_id": "42",
  "upgrade_type": "Velocity"  // Velocity, PowerCore, Thruster, Gyro
}
```

**Output:**
```json
{
  "token_id": "42",
  "upgrade_type": "Velocity Module",
  "payment": {
    "amount": "20",
    "fee": "0.01",
    "total": "20.01"
  },
  "duration_hours": 12,
  "completes_at": "2025-11-16T02:00:00Z",
  "expected_gain": "1-3 Speed points",
  "parts_source": "Installing ancient vehicle components..."
}
```

---

#### **Tool: `garage_complete_upgrade`**
Manually complete a finished upgrade session (also auto-completes when querying robot).

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
  "upgrade_completed": "Velocity Module",
  "stat_gains": {
    "speed": 2
  },
  "new_stats": {
    "speed": 67
  },
  "xp_gained": 5,
  "message": "Velocity module installed. Performance enhanced."
}
```

---

### 5.4 Wasteland Race Tools (Phase 2+ - FUTURE)

**Note:** Race entries pull funds directly from user's wallet via ICRC-2 `transfer_from`. Prize winnings are sent directly back to user's wallet via ICRC-2 `transfer`.

#### **Tool: `garage_list_races`**
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

#### **Tool: `garage_enter_race`**
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

---

### 5.5 Secondary Marketplace Tools (Phase 3+ - FUTURE)

**Note:** Marketplace transactions will use ICRC-2 `transfer_from` for purchases, with seller receiving funds directly.

#### **Tool: `garage_list_robots_for_sale`**
List PokedBots available for purchase from other players in Delta City marketplace.

#### **Tool: `garage_buy_robot`**
Purchase a robot from another player's listing. Payment via ICRC-2 `transfer_from`.

#### **Tool: `garage_sell_robot`**
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
4. `get_weather` - Example tool (for testing)

### **Phase 2: Robot Stats & Management (PLANNED)**
- Implement racing stats initialization (deterministic from token index)
- Create PokedBot data structures with faction types
- Write faction-based stat derivation algorithm
- Build maintenance system (recharge, repair, diagnostics) with ICRC-2 payments
- Build upgrade system (4 types with faction modifiers)
- Add decay mechanics (faction-specific rates)
- Implement faction reputation tracking
- Create wasteland lore flavor text system

### **Phase 3: Wasteland Racing Engine (PLANNED)**
- Design race simulation algorithm with faction bonuses
- Implement race creation timer (with thematic naming)
- Build race entry system (ICRC-2 transfer_from for fees)
- Create race simulation timer (with hazard events)
- Implement prize distribution (ICRC-2 transfer to winners)
- Add Silent Klan tax collection and treasury management
- Add race commentary/flavor text
- Set up subaccount architecture for race pools

### **Phase 4: MCP Tools Expansion (PLANNED)**
- Expose robot management tools (initialize, details, stats)
- Add maintenance tools (recharge, repair, diagnostics, upgrades)
- Add racing tools (list races, enter, claim results)
- Write tool schemas with wasteland-themed descriptions
- Add ICRC-2 allowance checking and error handling
- Implement authentication for all new tools
- Add faction-specific response messages

### **Phase 5: Testing & Polish (PLANNED)**
- Integration testing with racing mechanics
- Test allowance edge cases (insufficient, expired, etc.)
- Balance tuning (faction advantages, costs, stat gains, race variance)
- Documentation updates with racing mechanics
- Create ICRC-2 approval guide for AI agents
- Create sample agent workflows for full game loop

---

## 12. Success Metrics

### Phase 1: Marketplace Integration (COMPLETE) ✅

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
13. ✅ Comprehensive documentation created

### Phase 2+: Racing Mechanics (FUTURE)

1. ⏳ Users can initialize PokedBots for racing (deterministic stats)
2. ⏳ Users can view detailed robot stats with faction bonuses
3. ⏳ Users can recharge, repair, and upgrade robots via ICRC-2 payments
4. ⏳ Automated wasteland races are created every 30-60 minutes
5. ⏳ Users can enter robots in races with ICRC-2 fee payment
6. ⏳ Races simulate deterministically with faction bonuses
7. ⏳ Prize winnings are sent directly to user wallets via ICRC-2 transfer
8. ⏳ Robot stats evolve correctly through upgrades and racing
9. ⏳ Faction reputation increases with race performance
10. ⏳ Silent Klan 5% tax is properly collected in treasury subaccount
11. ⏳ Treasury covers all outgoing transfer fees for prizes
12. ⏳ System handles 100+ concurrent robots without performance issues
13. ⏳ Faction-specific mechanics work correctly (Wild Bot variance, God Class bonuses, etc.)
14. ⏳ No virtual balance exploits or stuck funds scenarios
15. ⏳ Lore and flavor text enhance the experience without being intrusive

---

## 13. Technical Dependencies

### 13.1 Motoko Packages (mops.toml)
**Current Implementation (Phase 1):**
```toml
[dependencies]
base = "0.11.1"
base16 = "1.0.0"  # For hex decoding marketplace payment addresses
account-identifier = "1.0.2"  # For EXT AccountIdentifier encoding
icrc2-types = "1.1.0"  # For ICRC-2 transfer types
array = "0.2.1"
iterators = "0.1.1"
stable-hash-map = "0.2.0"
```

**Future Additions (Phase 2+):**
```toml
json = "1.4.0"
map = "9.0.1"
http-types = "1.0.1"
mcp-motoko-sdk = "2.0.2"
datetime = "1.1.0"
certified-cache = "0.3.0"
sha2 = "0.1.6"  # For stat derivation hashing
```

### 13.2 External Canisters

**PokedBots EXT NFT & Marketplace Canister** (Primary Integration)
- **Canister ID:** `bzsui-sqaaa-aaaah-qce2a-cai`
- **Standard:** EXT (Entrepot extensible token standard)
- **Purpose:** Marketplace listings, NFT purchases, ownership verification
- **Phase 1 Methods Used:**
  - `listings() -> [(TokenIndex, Listing, Metadata)]` - Get all marketplace listings (1,252+)
  - `lock(TokenIndex, Nat64, AccountIdentifier) -> Result_9` - Reserve NFT for purchase
  - `settle(TokenIdentifier) -> Result_8` - Complete NFT transfer after payment
  - `tokens(AccountIdentifier) -> Result_1` - Get user's owned token indices
  - `bearer(TokenIdentifier) -> Result_5` - Get owner of specific token
- **Integration Pattern:** Purchase-enabled wrapper (racing canister facilitates buying, not selling)

**ICP Ledger Canister** (Payment Integration)
- **Canister ID:** `ryjl3-tyaaa-aaaaa-aaaba-cai`
- **Token:** ICP (used for PokedBot purchases)
- **Phase 1 Methods Used:**
  - `icrc2_approve` - User approves racing canister for spending
  - `icrc2_transfer_from` - Racing canister pulls ICP from user to garage subaccount
  - `transfer` - Racing canister sends ICP from garage to marketplace payment address
  - `icrc2_allowance` - Check remaining approved amount (for error handling)
- **Future Methods (Phase 2+):**
  - `icrc2_transfer` - Send prize winnings to users

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

This design provides a comprehensive blueprint for a PokedBots wasteland racing simulation MCP server.

### Current Status (Phase 1 Complete) ✅

**Deployed System:**
- **Canister:** `3od6b-qiaaa-aaaai-q37ma-cai` on IC mainnet
- **Functionality:** Marketplace browsing, purchasing, and garage management
- **Integration:** PokedBots EXT marketplace (`bzsui-sqaaa-aaaah-qce2a-cai`)
- **Payment:** ICRC-2 approval-based with ICP Ledger (`ryjl3-tyaaa-aaaaa-aaaba-cai`)
- **Architecture:** Subaccount-based garage system ("GARG" + principal bytes)
- **Tools:** 4 MCP tools (browse, purchase, garage list, weather example)

**Key Achievements:**
- ✅ Successfully integrated with existing NFT marketplace (1,252+ listings)
- ✅ Implemented efficient caching and pagination for marketplace browsing
- ✅ Built robust ICRC-2 approval-based purchase flow with two-step payment routing
- ✅ Proper EXT AccountIdentifier encoding for marketplace compatibility
- ✅ Tested with real purchase (PokedBot #4079 for 6.00 ICP)
- ✅ Comprehensive documentation for phase transition

### Future Vision (Phase 2+) ⏳

The complete system will:
- **Use NFTs as evolving game assets** with faction-based mechanics and deterministic stat generation
- **Provide engaging gameplay** through maintenance, upgrades, faction bonuses, and strategic racing
- **Operate entirely on-chain** with deterministic simulations and transparent outcomes
- **Offer an agent-first interface** via MCP tools with rich thematic flavor
- **Create a sustainable token economy** with the Silent Klan tax system covering operational costs
- **Immerse players** in the rich lore of post-apocalyptic Delta City and the eastern wastelands

### Thematic Strengths
The PokedBots universe provides:
- **Rich Faction System**: 5 distinct robot types with unique personalities, bonuses, and lore
- **Environmental Storytelling**: Races through garbage towers, wasteland sand, and ancient highways
- **Power Dynamics**: Silent Klan control, God Class superiority, Master faction mysteries
- **Post-Apocalyptic Atmosphere**: Solar flares, deranged Wild Bots, scavenged technology
- **Emergent Narrative**: Europa Base 7 connections hint at larger story for future expansions

### Technical Advantages
The system is designed to be:
- **Extensible**: Easy to add robot breeding/fusion, story missions, faction quests, equipment systems
- **Fair**: Deterministic outcomes prevent manipulation while faction bonuses create strategic depth
- **Engaging**: Depth in stat management, faction optimization, and race strategy
- **Accessible**: Agent-operable via MCP, no complex UI required for MVP
- **Scalable**: Single canister architecture proven by Final Score, ready for multi-canister expansion
- **Simple**: Direct ICRC-2 transfers eliminate virtual balance complexity and withdrawal friction
- **Transparent**: All payments visible on ICRC ledger, no hidden balance state
- **User-friendly**: No deposit step required, users keep full custody of funds until spent

### ICRC-2 Workflow for AI Agents
```motoko
// 1. Agent approves canister to spend tokens
icrc2_approve({
  spender: canister_principal,
  amount: 10000,  // Enough for several actions
  expires_at: null
})

// 2. Agent calls MCP tool (e.g., mint robot)
garage_mint_robot({
  name: "Scrap-Runner-7",
  faction: "BattleBot"
})

// 3. Canister pulls funds via transfer_from
// 4. Robot NFT is minted and transferred to agent
// 5. Agent receives confirmation with payment details

// Agent can check/refresh approval as needed
icrc2_allowance({
  account: { owner: agent_principal },
  spender: { owner: canister_principal }
})
```

### Next Steps

**Phase 1 (COMPLETE):** ✅ Marketplace integration deployed and tested

**Phase 2 (NEXT):**
1. Design racing stats initialization system (deterministic from token index)
2. Implement faction-based stat derivation algorithm
3. Build robot management tools (initialize, details, stats query)
4. Add maintenance system (recharge, repair, diagnostics)
5. Implement upgrade system (4 types with faction modifiers)
6. Create wasteland lore flavor text system

**Phase 3 (RACING):**
1. Design race simulation algorithm with faction bonuses
2. Implement automated race scheduling and execution
3. Build race entry and prize distribution systems
4. Add Silent Klan tax collection and treasury management
5. Integration testing with full game loop

**Current Deployment:** `3od6b-qiaaa-aaaai-q37ma-cai` on IC mainnet

**Documentation:** See `docs/marketplace-integration.md` for Phase 1 technical details

**The marketplace is open. Delta City's robot traders await. The wastelands will come next.**
