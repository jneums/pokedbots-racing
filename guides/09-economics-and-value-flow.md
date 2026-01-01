---
title: Economics & Value Flow
description: Complete transparency on where your ICP goes and how the platform sustains itself
order: 9
---

# Economics & Value Flow

## OVERVIEW

PokedBots Racing is designed as a **player-first economy** where all ICP flowing into the system is redistributed back to players through prizes, rewards, and ecosystem growth. The platform operates transparently with no profit extraction.

## CORE PRINCIPLE: ZERO PLATFORM PROFIT

**Every ICP that enters the system goes back to players.** There are no hidden fees, no profit margins, and no money leaving the ecosystem. This document explains exactly where your ICP goes.

## 1. RACE ENTRY FEES → PRIZE POOLS

**Entry Fee Structure:**
- Scrap: 0.1 ICP
- Junker: 0.2 ICP  
- Raider: 0.3 ICP
- Elite: 0.4 ICP
- SilentKlan: 0.5 ICP

**Where it goes:**
- **100% → Prize Pool** - Your entry fee goes directly into the race's prize pool
- **Platform Bonus Added** - Fixed amount added per race (see below)

**Example (Junker Daily Sprint with 8 entries):**
```
Entry fees collected:    8 × 0.2 = 1.6 ICP
Platform bonus added:           0.4 ICP (fixed)
Total prize pool:               2.0 ICP
```

Players put in 1.6 ICP, winners receive 2.0 ICP. The platform **adds** 0.4 ICP, it doesn't take anything.

## 2. PLATFORM BONUS → PRIZE POOLS

**Fixed platform contributions per race:**

**Daily Sprint:**
- Scrap: 0.20 ICP
- Junker: 0.40 ICP
- Raider: 0.60 ICP
- Elite: 0.80 ICP
- SilentKlan: 1.00 ICP

**Weekly League:**
- Scrap: 0.80 ICP
- Junker: 1.60 ICP
- Raider: 2.40 ICP
- Elite: 3.20 ICP
- SilentKlan: 4.80 ICP

**Monthly Cup:**
- Elite: 8.0 ICP
- SilentKlan: 12.0 ICP

**Source of platform bonuses:**
1. **Maintenance fees** - Recharge (0.1 ICP) and Repair (0.05 ICP) costs
2. **Upgrade fees** - When players choose ICP upgrades instead of free parts
3. **Developer contribution** - ~100 ICP monthly (temporary bootstrap)
4. **Betting rake** - 8% of betting pools reinvested into racing prizes

**Sustainability model:**
The platform treasury is funded by player activity (maintenance, upgrades, betting) and grows as the ecosystem expands. Developer contributions are temporary - as entry fee volume increases, the system becomes fully self-sustaining without external funding.

**Note on marketplace:** The built-in NFT marketplace uses the EXT standard. Any marketplace transaction fees go to the original NFT creator, not the platform.

## 3. BETTING SYSTEM → PARI-MUTUEL POOLS

**How pari-mutuel betting works:**
- All bets on a race go into shared pools (Win/Place/Show)
- Winners split the pool proportionally to their bet size
- No "house" betting against you - you're competing with other bettors

**Rake structure (10% total):**
- **8% → Future racing prize pools** - Funds platform bonuses for upcoming races
- **2% → Platform operations** - Covers canister cycles, infrastructure costs

**Example (100 ICP total betting pool):**
```
Total bets:              100 ICP
Rake (10%):               10 ICP
  ├─ Racing (8%):          8 ICP → Added to future race prizes
  └─ Operations (2%):      2 ICP → Canister cycles, infrastructure
Winners share:            90 ICP (distributed among winning bets)
```

**Key point:** The 8% racing rake is **reinvested into prize pools**, creating a virtuous cycle where betting activity increases racing rewards for everyone.

## 4. MAINTENANCE COSTS → PLATFORM TREASURY

**Maintenance fees:**
- **Recharge**: 0.1 ICP (restores battery + potential overcharge bonus)
- **Repair**: 0.05 ICP (restores condition)
- **Purpose**: Maintain competitive balance and bot value
- **Allocation**: Goes to platform treasury to fund race prize pool bonuses
- **Volume**: Active bots typically recharge 1-2x daily + repair 2-3x daily (~0.25-0.35 ICP/day per bot)

These fees serve dual purposes:
1. **Game balance** - Prevent bot oversaturation and maintain competitive racing
2. **Prize pool funding** - Help sustain platform bonuses without developer subsidy

## 5. NFT MARKETPLACE

**Built-in marketplace using EXT standard:**
- Buy and sell PokedBots directly on the platform
- Transaction fees (per EXT standard) go to the **original NFT creator**, not the platform
- Platform facilitates trades but doesn't extract marketplace fees
- This ensures fair compensation for NFT creators while keeping trading accessible

## MONEY FLOW DIAGRAM

```
INCOMING ICP
├─ Race Entry Fees (100%)
│  └─→ Race Prize Pools (100%)
│
├─ Maintenance Fees
│  ├─ Recharge: 0.1 ICP
│  ├─ Repair: 0.05 ICP
│  └─→ Platform Treasury → Race Bonuses
│
├─ Upgrade Fees (optional ICP upgrades)
│  └─→ Platform Treasury → Race Bonuses
│
├─ Developer Contribution (~100 ICP/month)
│  └─→ Platform Treasury → Race Bonuses
│
├─ Platform Bonus (from treasury)
│  └─→ Race Prize Pools (fixed per race)
│
└─ Betting Pools (90% to winners)
   └─ Rake (10%)
      ├─→ Racing prize bonuses (8%)
      └─→ Canister operations (2%)

OUTGOING ICP
├─ Race Prize Pools → Winners (100%)
├─ Betting Payouts → Winners (90% of pools)
└─ Infrastructure → Canister cycles, hosting (2% of betting)

MARKETPLACE (EXT Standard)
└─ NFT sale fees → Original NFT creator (not platform)
```

## SELF-SUSTAINING CYCLE

The system is designed to become fully self-sustaining without developer funding:

1. **Player activity** (maintenance, upgrades) → platform treasury
2. **Betting activity** generates 8% rake → platform treasury
3. **Platform treasury** funds race bonuses
4. **Bigger prize pools** attract more racers
5. **More racing** drives more maintenance/upgrade fees and betting
6. **Increased volume** eliminates need for developer contributions
7. **Cycle becomes self-perpetuating**

The 2% operations rake (from betting only) covers infrastructure costs (canister cycles, storage, compute), keeping the platform running indefinitely.

**Growth path to sustainability:**
- **Current**: Developer adds ~100 ICP/month + player fees fund bonuses
- **Target**: Player fees + betting rake fully fund bonuses at scale
- **Timeline**: As player count grows, entry fee volume increases, reducing developer contribution to zero

## UPGRADE SYSTEM ECONOMICS

**Upgrade costs** are paid in ICP or parts:
- **ICP upgrades**: Goes to platform treasury to fund race bonuses
- **Parts upgrades**: Free (earned through scavenging) - costs nothing

Most players use free parts from scavenging. ICP upgrades are optional for players who want instant upgrades without grinding parts.

**ICP upgrade allocation:**
- Funds platform treasury
- Helps sustain race prize pool bonuses
- Reduces need for developer contributions

## SCAVENGING SYSTEM → FREE VALUE

**Scavenging is pure value creation:**
- Costs nothing (just time)
- Generates upgrade parts
- Parts = ICP savings (100 parts ≈ 1 ICP upgrade value)

Players can earn ~2-5 ICP worth of parts per bot per week through scavenging, creating a F2P path to competitive upgrades.

## TRANSPARENCY COMMITMENTS

1. **On-chain verification**: All transactions are visible on ICP ledger
2. **Open-source code**: Backend logic is auditable
3. **Public metrics**: Platform treasury balance visible to all
4. **No hidden fees**: Every fee disclosed in this document

You can verify every transaction:
- Race prize pool distributions
- Betting payouts
- Platform bonus contributions
- Treasury movements

**View all canister transactions:** [https://www.icexplorer.io/address/details/p6nop-vyaaa-aaaai-q4djq-cai](https://www.icexplorer.io/address/details/p6nop-vyaaa-aaaai-q4djq-cai)

## FAQ

### "Where does the initial platform treasury come from?"
Funded by the developers at launch (~100 ICP/month ongoing) plus all player activity fees (maintenance, upgrades, betting rake). As the platform grows, player-generated fees will fully sustain prize bonuses without developer contributions.

**Revenue estimate (at 20 active racing bots):**
- Maintenance: ~20 bots × 0.25 ICP/day = 5 ICP/day = 150 ICP/month
- Developer contribution: 100 ICP/month
- **Total available for bonuses: ~250 ICP/month**

As bot count grows, maintenance fees scale linearly while developer contribution reduces to zero.

### "What about marketplace fees?"
The built-in marketplace uses the EXT NFT standard. Transaction fees go to the original NFT creator (as per EXT standard), not to the platform. This ensures creators are fairly compensated while the platform remains fee-free for trading.

### "What if betting rake exceeds platform bonus costs?"
Excess rake accumulates in the treasury for:
1. Larger platform bonuses (e.g., special event prizes)
2. Feature development (new tracks, game modes)
3. Marketing/growth (brings more players → bigger pools)
4. Buffer for lower-activity periods

### "Is the 2% operations fee permanent?"
Yes, it covers ongoing infrastructure costs (canister cycles, storage, compute). Without it, the platform would require external funding or player subscriptions.

### "Can you prove the platform isn't profiting?"
Yes - all canister transactions are on-chain and auditable. You can verify:
- Treasury balance
- All ICP transfers in/out
- Prize pool distributions
- Betting payouts

**View all transactions:** [https://www.icexplorer.io/address/details/p6nop-vyaaa-aaaai-q4djq-cai](https://www.icexplorer.io/address/details/p6nop-vyaaa-aaaai-q4djq-cai)

### "What happens if the platform becomes profitable?"
Any excess treasury beyond operational reserves (e.g., 1000 ICP buffer) will be distributed through:
1. Increased platform bonuses
2. Special tournament prizes
3. Community development grants

The goal is **ecosystem growth**, not profit extraction.

## BOTTOM LINE

**PokedBots Racing is not a business extracting profit from players.**

It's a **player-owned economy** where:
- Your entry fees become prize pools
- Platform bonuses are added (not subtracted)
- Betting rake is reinvested in prizes
- All value flows back to players

The 2% operations fee (from betting only) covers infrastructure. Everything else goes to winners, either immediately through prizes or reinvested through platform bonuses.

**Your ICP stays in the ecosystem. The platform adds value, it doesn't extract it.**
