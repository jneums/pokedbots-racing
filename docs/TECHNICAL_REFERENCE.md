---
title: "Technical Reference"
description: "Data structures, timers, security, and dependencies"
order: 8
---

# PokedBots Racing - Technical Reference

**Deep Technical Documentation**

---

## Navigation

📖 <a href="/docs/MCP_TOOLS">← MCP Tools</a> | 📖 <a href="/docs/OVERVIEW">Back to Overview</a>

---

## Automated Processes

### Race Scheduler Timer
**Status:** Not yet implemented (manual race creation via RaceCalendar)
**Planned Frequency:** Every 1-2 hours

**Planned Logic:**
- Create 2-3 races scheduled 6-24 hours ahead
- Randomize distance (5-50km), terrain, class
- Set entry fees based on class (base × multiplier):
  - Scavenger: 1x base (0.05-0.2 ICP)
  - Raider: 2x base (0.1-0.4 ICP)
  - Elite: 5x base (0.25-1.0 ICP)
  - SilentKlan: 10x base (0.5-2.0 ICP)
- Apply 5% platform tax to prize pool
- Apply platform bonuses (Scavenger/Raider only):
  - Daily Sprints: +0.5 ICP
  - Weekly Leagues: +2 ICP
  - Monthly Cups: +5 ICP (Elite/SilentKlan)
- SilentKlan races restricted to GodClass/Master with 10+ wins

### Race Execution Timer
**Status:** Implemented via timer-tool
**Trigger:** Race startTime reached

**Logic:**
1. Find races with `status=#Upcoming` and `startTime <= now`
2. Change status to `#InProgress`
3. Run deterministic simulation:
   - Calculate race time for each participant
   - Apply terrain bonuses/penalties
   - Add randomness (seed: raceId + startTime)
   - Sort by completion time
4. Distribute prizes:
   - 1st: 50% of prize pool
   - 2nd: 30% of prize pool
   - 3rd: 20% of prize pool
5. Update bot stats:
   - Increment `racesEntered`
   - Increment `wins`/`places`/`shows`
   - Add prize to `totalScrapEarned`
   - Reduce `condition` by 15
6. Change status to `#Completed`

**Note:** Uses IC randomness beacon for deterministic seed generation

### Upgrade Completion Timer
**Status:** Implemented via timer-tool
**Trigger:** Individual upgrade session `endsAt` timestamp

**Logic:**
1. Scheduled when upgrade starts (`endsAt = startedAt + 12 hours`)
2. On completion:
   - Roll stat gain: 1-3 points base
   - Apply faction modifiers:
     - God Class: 20% chance for 2x gain
     - Wild Bot: ±10% variance (can be 0 or higher)
     - Others: Standard gain
   - Add bonus to appropriate stat (speedBonus/powerCoreBonus/etc.)
   - Add 50 XP
   - Clear `upgradeEndsAt` timestamp
   - Remove from `activeUpgrades` map

### Robot Decay System
**Status:** ✅ Implemented
**Frequency:** Every hour (self-rescheduling timer)

**Logic:**
- Runs on ALL initialized bots (not just inactive ones)
- Condition decay: ~0.21 per hour (~5 per day)
- Calibration decay: ~0.125 per hour (~3 per day)
- Faction modifiers:
  - Wild Bot: 20% faster decay (chaotic systems)
  - God Class: 30% slower decay (superior construction)
  - Others: Standard decay rate
- Minimum values: condition 30, calibration 30
- Drives maintenance economy (forces recharge/repair usage)

---

## Data Structures

### Key Types

```motoko
// PokedBots-specific racing stats
type PokedBotRacingStats = {
  tokenIndex: Nat;
  ownerPrincipal: Principal;
  faction: FactionType;  // BattleBot/EntertainmentBot/WildBot/GodClass/Master
  
  // Upgrade bonuses (from scrapyard upgrades)
  speedBonus: Nat;
  powerCoreBonus: Nat;
  accelerationBonus: Nat;
  stabilityBonus: Nat;
  
  // Dynamic stats
  battery: Nat;         // 0-100, drains by 10 per race
  condition: Nat;       // 0-100, affects performance
  calibration: Nat;     // 0-100, initial 80
  experience: Nat;      // XP earned from races/upgrades
  
  // Preferences (derived from metadata)
  preferredDistance: Distance;  // ShortSprint/MediumHaul/LongTrek
  preferredTerrain: Terrain;    // ScrapHeaps/WastelandSand/MetalRoads
  
  // Career stats
  racesEntered: Nat;
  wins: Nat;
  places: Nat;          // 2nd place finishes
  shows: Nat;           // 3rd place finishes
  totalScrapEarned: Nat;
  factionReputation: Nat;
  
  // Timestamps
  activatedAt: Int;
  lastRecharged: ?Int;  // 6-hour cooldown
  lastRepaired: ?Int;   // 12-hour cooldown
  lastDiagnostics: ?Int;
  lastRaced: ?Int;
  upgradeEndsAt: ?Int;  // 12-hour upgrade duration
  listedForSale: Bool;  // Marketplace listing status
};

// Generic racing stats (used by simulator)
type RacingStats = {
  speed: Nat;          // 30-100
  powerCore: Nat;      // 30-100 (endurance)
  acceleration: Nat;   // 30-100
  stability: Nat;      // 30-100
};

type Race = {
  raceId: Nat;
  name: Text;               // e.g., "Wasteland Sprint #42"
  distance: Nat;            // km
  terrain: Terrain;         // ScrapHeaps/WastelandSand/MetalRoads
  raceClass: RaceClass;     // Scavenger/Raider/Elite/SilentKlan
  entryFee: Nat;            // ICP e8s
  maxEntries: Nat;          // Usually 10
  startTime: Int;
  duration: Nat;            // Race duration in seconds
  entryDeadline: Int;       // 30 min before startTime
  createdAt: Int;
  entries: [RaceEntry];     // Participants
  status: RaceStatus;       // Upcoming/InProgress/Completed/Cancelled
  results: ?[RaceResult];   // Post-race results
  prizePool: Nat;           // Total prize (entry fees + sponsors)
  platformTax: Nat;         // 5% tax (was silentKlanTax)
  sponsors: [Sponsor];      // Race sponsors
};

type RaceEntry = {
  nftId: Text;              // Token index as text
  owner: Principal;
  entryFee: Nat;
  enteredAt: Int;
};

type RaceResult = {
  nftId: Text;
  owner: Principal;
  position: Nat;            // 1st, 2nd, 3rd...
  finalTime: Float;         // Race completion time
  prizeAmount: Nat;         // ICP e8s won
};

type Sponsor = {
  sponsor: Principal;
  amount: Nat;              // ICP e8s contributed
  message: ?Text;           // Optional message (max 100 chars)
  timestamp: Int;
};

type UpgradeType = {
  #Velocity;      // +Speed
  #PowerCore;     // +Power Core
  #Thruster;      // +Acceleration
  #Gyro;          // +Stability
};

type UpgradeSession = {
  tokenIndex: Nat;
  upgradeType: UpgradeType;
  startedAt: Int;
  endsAt: Int;              // startedAt + 12 hours
};

// Faction bonuses during upgrades
// God Class: 20% chance for 2x stat gain
// Wild Bot: ±10% variance (unstable)
// Others: Standard 1-3 stat points
```

### Stable Variables

```motoko
// Garage Manager state
stable var stable_garageStats: Map.Map<Nat, PokedBotRacingStats>;
stable var stable_activeUpgrades: Map.Map<Nat, UpgradeSession>;

// Race Manager state
stable var stable_races: Map.Map<Nat, Race>;
stable var stable_nextRaceId: Nat = 1;

// Leaderboard state
stable var stable_leaderboardEntries: [(Principal, LeaderboardEntry)];

// NFT Stats Manager state (base stats from metadata)
stable var stable_nftStats: Map.Map<Nat, NFTStats>;
stable var stable_schema: TraitSchema;

// Marketplace cache
stable var stable_marketplaceCache: ?{
  listings: [(Nat32, ExtIntegration.Listing, ExtIntegration.Metadata)];
  cachedAt: Int;
};
stable var stable_marketplaceCacheTTL: Int = 300_000_000_000;  // 5 minutes
```

---

## Security Considerations

### Randomness
- Uses IC randomness beacon
- Race seed: raceId + startTime + blockHash
- Deterministic for same inputs

### Authorization
- All operations verify NFT ownership
- Calls `bearer(tokenId)` on EXT canister
- Cached principal verified before actions

### Economic Safeguards
- Entry fee scaling by class (1x/2x/5x/10x multiplier)
- Prize pool validation
- Platform 5% tax on all races
- Platform bonuses for beginner classes (Scavenger/Raider)
- ICRC-2 approval amounts checked

### Data Integrity
- Stable variables for persistence
- Ownership checks before mutations
- Race status prevents double-entry
- Upgrade cooldowns enforced

### ICRC-2 Transfer Security
- All transfers use exact amounts
- Fee included in calculations
- Two-step marketplace settlement
- Garage subaccount intermediary

---

## Dependencies

### Motoko Packages (mops.toml)

```toml
[dependencies]
base = "0.11.1"
map = "9.0.1"
http-types = "1.0.3"
ic = "1.0.1"
sha2 = "0.0.2"
json = "1.0.2"
mcp-motoko-sdk = "https://github.com/rvanasa/mcp-motoko-sdk#v0.2.5"
timer-tool = "1.1.0"
icrc2-types = "0.1.0"
base16 = "1.0.0"
class-plus = "0.1.0"
star = "0.3.3"
```

### External Canisters

**ICP Ledger:**
- ID: `ryjl3-tyaaa-aaaaa-aaaba-cai`
- Used for: ICRC-2 transfers, legacy transfers
- Methods:
  - `icrc2_transfer_from`: Pull ICP from user (with approval)
  - `transfer`: Legacy transfer (garage to marketplace)

**PokedBots EXT NFT & Marketplace:**
- ID: `bzsui-sqaaa-aaaah-qce2a-cai`
- Used for: NFT ownership, metadata, marketplace operations
- Methods:
  - `tokens(accountId)`: Get owned token indices
  - `bearer(tokenId)`: Get token owner account ID
  - `metadata(tokenId)`: Get NFT metadata
  - `details(tokenId)`: Get listing details
  - `lock(tokenId, price, buyer, subaccount)`: Lock NFT for purchase
  - `settle(tokenId)`: Complete purchase settlement
  - `list({token, from_subaccount, price})`: List/unlist NFT
  - `transfer(...)`: Transfer NFT between accounts

**Integration Notes:**
- All ownership checks use `bearer()` as source of truth
- Token identifiers are EXT-encoded (canister + index)
- Account identifiers are 32-byte hex strings
- Garage subaccounts use "GARG" prefix + principal bytes

---

## Token Economics

### ICP Flows

**Inflows:**
- Race entry fees (class-based scaling):
  - Scavenger: 0.05-0.2 ICP
  - Raider: 0.1-0.4 ICP
  - Elite: 0.25-1.0 ICP
  - SilentKlan: 0.5-2.0 ICP
- Race sponsorships (min 0.1 ICP)
- Recharge payments (0.1 ICP + 0.0001 fee)
- Repair payments (0.05 ICP + 0.0001 fee)
- Upgrade payments (3.33 ICP per part + 0.0001 fee):
  - First upgrade: 10 ICP (3 parts)
  - Second upgrade: 17 ICP (5 parts)
  - Third upgrade: 27 ICP (8 parts)
- NFT purchases (marketplace price + 0.0002 fee)

**Outflows:**
- Race prizes (after 5% platform tax):
  - 1st place: 47.5% of prize pool
  - 2nd place: 23.75% of prize pool
  - 3rd place: 14.25% of prize pool
  - 4th place: 9.5% of prize pool
- Platform bonuses:
  - Daily Sprints: +0.5 ICP (Scavenger/Raider)
  - Weekly Leagues: +2 ICP (Scavenger/Raider)
  - Monthly Cups: +5 ICP (Elite/SilentKlan)
- Platform tax: 5% of entry fees (held in canister)

---

## Performance Optimizations

### Marketplace Caching
- 5-minute TTL
- Reduces EXT canister calls
- Cursor-based pagination

### Ownership Caching
- Principal cached in racing stats
- Verified before operations
- Reduces EXT bearer() calls

### Batch Processing
- Timers process multiple items
- Race simulations batched
- Decay applied in bulk

---

## Development Phases

### Phase 1: Marketplace Integration ✅
- Browse/purchase PokedBots
- Garage subaccount system
- ICRC-2 payment flow

### Phase 2: Racing Engine ✅
- Race calendar
- Simulation engine
- Prize distribution

### Phase 3: Maintenance & Upgrades ✅
- Recharge/repair tools
- Upgrade system
- Decay mechanics

### Phase 4: Leaderboards & Polish ✅
- Career stats tracking
- Faction rankings
- Sponsorship system

### Future: Scrapyard System 🔨
- Multi-collection browser
- Smart valuation
- Parts economy
- Progressive upgrades

---

## Success Metrics

### User Engagement
- Active racers per week
- Races per bot
- Average session duration

### Economic Activity
- ICP volume in races
- Marketplace purchases
- Upgrade spending

### NFT Utility
- Bots initialized for racing
- Win rate distribution
- Faction popularity

---

## Navigation

📖 [← MCP Tools](/docs/MCP_TOOLS) | 📖 [Back to Overview](/docs/OVERVIEW)

**Complete Documentation:**
- 📖 [Overview](/docs/OVERVIEW) - Start here
- 🏗️ [Architecture](/docs/ARCHITECTURE) - Design decisions
- 🔧 [Garage System](/docs/GARAGE_SYSTEM) - Bot management
- ⚡ [Upgrade System](/docs/UPGRADE_SYSTEM) - Scrapyard & parts
- 🏁 [Racing System](/docs/RACING_SYSTEM) - Races & prizes
- 🛒 [Marketplace](/docs/MARKETPLACE) - Buy & trade
- 🛠️ [MCP Tools](/docs/MCP_TOOLS) - API reference
