---
title: "Architecture"
description: "Design decisions and technical implementation"
order: 2
---

# PokedBots Racing - Architecture

**Design Decisions & Technical Implementation**

---

## Navigation

📖 <a href="/docs/OVERVIEW">← Back to Overview</a> | 🏁 <a href="/docs/RACING_SYSTEM">Racing System →</a>

---

## Key Architectural Decisions

### 2.1 Generic Racing Simulator with Collection-Specific Adapters

**Decision**: Split racing logic into collection-agnostic simulator and collection-specific garage modules

**Rationale**:
- **RacingSimulator**: Generic racing engine that works with any NFT collection via `RacingStatsProvider` interface
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
- ✅ `marketplace_browse_pokedbots`: Cached listings with pagination (5-min TTL)
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
| Gas Costs | High upfront (deposit), then free | 0.0001 ICP per operation |
| Funds Custody | Escrowed in canister | Stay in user wallet |
| Best For | High-frequency traders | Occasional players & AI agents |

---

## Core Architecture

### Modular Architecture with Single Canister Deployment

The system uses a modular architecture split across multiple Motoko modules, all deployed in a single canister:

**Core Modules:**
- ✅ **RacingSimulator**: Generic racing engine with `RacingStatsProvider` interface
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

### EXT NFT Marketplace Pattern (COMPLETE)

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

### ICRC-2 Payment System with Subaccount Routing (COMPLETE)

We use ICRC-2 approval-based payments routed through garage subaccounts:

**Implementation (COMPLETE)**:
- **No deposit/withdraw flow** - users keep ICP in their own wallets
- Purchase flow: `icrc2_transfer_from(user → garage)` then `transfer(garage → marketplace)`
- Agent approves racing canister with `icrc2_approve` (150M e8s recommended)
- Garage subaccount acts as intermediary, not custodian (funds flow through)
- **Payment details**: NFT price + 10,000 e8s transfer fee pulled from user
- **EXT compatibility**: Marketplace payment address decoded from hex to blob
- **Two-step settlement**: lock() reserves NFT, settle() completes after payment verified
- ✅ Race entries: `icrc2_transfer_from` for exact entry fee amount (5-50 ICP based on class)
- ✅ Maintenance/upgrades: Direct pulls for repair (5 ICP), recharge (10 ICP), upgrades (20 ICP)
- ✅ Prize winnings: `icrc2_transfer` directly to user's wallet
- ✅ Sponsorships: `icrc2_transfer_from` to pull sponsorship amounts into race prize pools
- **Trade-off**: 0.0001 ICP fee per transaction vs. complexity of virtual balance
- **Benefit**: Simpler UX, no funds locked in canister, better for occasional users and AI agents

---

## Navigation

📖 [← Back to Overview](/docs/OVERVIEW) | 🏁 [Racing System →](/docs/RACING_SYSTEM)

**See also:**
- 🔧 [Garage System](/docs/GARAGE_SYSTEM) - Stats and maintenance
- ⚡ [Upgrade System](/docs/UPGRADE_SYSTEM) - Scrapyard mechanics
- 🛠️ [MCP Tools](/docs/MCP_TOOLS) - API reference
- 📚 [Technical Reference](/docs/TECHNICAL_REFERENCE) - Deep dive
