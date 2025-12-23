# PokedBots Racing: Betting System Specification

## Overview

Pari-mutuel betting system for PokedBots races, allowing users to bet ICP on race outcomes with automatic payout distribution. Based on horse racing betting models with Win, Place, and Show bet types.

## Architecture

### Core Principles

1. **Integrated System** - Betting logic integrated into racing canister for seamless UX
2. **Single Approval** - Users approve racing canister once for both entry fees and betting
3. **Subaccount-Based Pools** - Each race has a dedicated ICP subaccount for transparent, auditable fund management
4. **ICRC-2 Integration** - Users approve and transfer ICP directly (no virtual accounts)
5. **Pari-mutuel Model** - Pool-based betting with proportional payouts to winners
6. **Automatic Payouts** - Winners receive funds automatically on settlement (no manual claim)
7. **1-Hour Betting Window** - Betting opens when registration closes, closes when race starts
8. **Synchronized Lifecycle** - Betting pools lifecycle tied directly to race status

### Technology Stack

- **Canister**: Integrated into pokedbots_racing canister (p6nop-vyaaa-aaaai-q4djq-cai)
- **Currency**: ICP (ryjl3-tyaaa-aaaab-qaa6a-cai)
- **Payment Method**: ICRC-2 approval + transfer_from (same approval as race entry fees)
- **Payout Method**: ICRC-1 transfer
- **Base Code**: Adapted from Final Score pari-mutuel betting canister
- **State Access**: Direct access to race state (no inter-canister calls needed)

## Data Structures

### BettingPool

```motoko
type PoolStatus = {
    #Pending;    // Race exists but registration not closed yet
    #Open;       // Betting window active (registration closed, race not started)
    #Closed;     // Race started, no more bets accepted
    #Settled;    // Race completed, payouts distributed
    #Cancelled;  // Race cancelled (refund all bets)
};

type BettingPool = {
    raceId: Nat;
    subaccount: Blob;           // Derived from raceId for dedicated pool funds
    status: PoolStatus;
    
    // Race context (cached from racing canister)
    entrants: [Nat];            // Bot token indices in race
    raceClass: Text;            // "Scavenger", "Raider", etc.
    distance: Nat;              // Race distance in km
    terrain: Text;              // Terrain type
    
    // Pool balances (verified against subaccount balance)
    winPool: Nat;               // Total ICP bet on Win
    placePool: Nat;             // Total ICP bet on Place (top 3)
    showPool: Nat;              // Total ICP bet on Show (top 5)
    totalPooled: Nat;           // Sum of all pools
    
    // Pool breakdown by bot
    winBetsByBot: [(Nat, Nat)]; // (tokenIndex, total ICP bet on this bot to win)
    placeBetsByBot: [(Nat, Nat)];
    showBetsByBot: [(Nat, Nat)];
    
    // Bets placed
    bets: [Bet];
    
    // Timing
    bettingOpensAt: Int;        // Unix timestamp (when registration closed)
    bettingClosesAt: Int;       // Unix timestamp (when race starts)
    
    // Settlement
    results: ?RaceResults;
    payoutsCompleted: Bool;
    failedPayouts: [FailedPayout];
};

type Bet = {
    betId: Nat;
    userId: Principal;
    tokenIndex: Nat;            // Bot being bet on
    betType: BetType;
    amount: Nat;                // ICP (e8s)
    timestamp: Int;
    potentialPayout: ?Nat;      // Calculated after settlement
    paid: Bool;
};

type BetType = {
    #Win;   // Bot finishes 1st
    #Place; // Bot finishes top 3
    #Show;  // Bot finishes top 5
};

type RaceResults = {
    rankings: [Nat];            // Token indices in finish order
    fetchedAt: Int;
};

type FailedPayout = {
    betId: Nat;
    userId: Principal;
    amount: Nat;
    error: Text;
    attempts: Nat;
};
```

### User Stats

```motoko
type UserStats = {
    totalBets: Nat;
    totalWagered: Nat;          // Total ICP bet (e8s)
    totalWon: Nat;              // Total ICP won (e8s)
    netProfit: Int;             // totalWon - totalWagered
    winRate: Float;             // Percentage of winning bets
    bestROI: Float;             // Best return on investment for single bet
    currentStreak: Int;         // Positive = winning streak, negative = losing streak
    longestWinStreak: Nat;
    
    // Breakdown by bet type
    winBets: BetTypeStats;
    placeBets: BetTypeStats;
    showBets: BetTypeStats;
};

type BetTypeStats = {
    count: Nat;
    wagered: Nat;
    won: Nat;
    winRate: Float;
};
```

## Subaccount Architecture

### Subaccount Derivation

Each betting pool gets a unique 32-byte subaccount derived from the race ID:

```motoko
func getPoolSubaccount(raceId: Nat): Blob {
    let raceIdBytes = Nat32.toNat8(Nat32.fromNat(raceId % (2**32)));
    let padding = Array.init<Nat8>(32, 0);
    padding[0] := raceIdBytes;
    // Additional bytes can encode pool type, version, etc.
    Blob.fromArray(Array.freeze(padding))
};
```

### Fund Flow with Subaccounts

**Bet Placement:**
1. User calls `betting_place_bet(raceId, tokenIndex, betType, amount)`
2. User must have pre-approved betting canister via ICRC-2: `icrc2_approve`
3. Canister calculates pool subaccount from raceId
4. Canister calls `icrc2_transfer_from`:
   - `from`: { owner = user, subaccount = null }
   - `to`: { owner = betting_canister, subaccount = ?poolSubaccount }
   - `amount`: bet amount
5. On success, bet recorded in pool.bets array
6. Pool balance updated (and can be verified against subaccount)

**Settlement & Payouts:**
1. Timer fetches race results from racing canister
2. Calculate payout amounts for each winning bet
3. For each winner:
   - Call `icrc1_transfer`:
     - `from_subaccount`: ?poolSubaccount
     - `to`: { owner = winner, subaccount = null }
     - `amount`: payout amount
4. Transfer rake from pool subaccount:
   - 8% to racing canister (added to prize pool)
   - 2% to platform treasury
5. Any dust remains in pool subaccount (could accumulate for jackpots)

**Benefits:**
- **Transparency**: Anyone can verify pool balance via ICP ledger queries
- **Isolation**: Each race's funds are physically separated
- **Auditability**: All transfers to/from pool subaccounts are on-chain
- **Safety**: Bug in one pool can't drain another pool's funds
- **Simplicity**: No master balance to track, pool balance = subaccount balance

## Payout Calculations

### Win Pool (1st Place Only)

```
Winners = All bets on bot that finished 1st
Losers = All other Win bets

Total Win Pool = Sum of all Win bets
Rake = Total Win Pool × 0.10
Net Pool = Total Win Pool - Rake

If no winners (bot with Win bets didn't win):
  Refund all bets proportionally after rake

If winners exist:
  For each winning bet:
    Payout = (Bet Amount / Total Winning Bets) × Net Pool
```

### Place Pool (Top 3)

```
Winners = All bets on bots that finished 1st, 2nd, or 3rd
Losers = All other Place bets

Total Place Pool = Sum of all Place bets
Rake = Total Place Pool × 0.10
Net Pool = Total Place Pool - Rake

If no winners (all Place bets on bots outside top 3):
  Refund all bets proportionally after rake

If winners exist:
  For each winning bet:
    Payout = (Bet Amount / Total Winning Bets) × Net Pool
```

### Show Pool (Top 5)

```
Winners = All bets on bots that finished 1st, 2nd, 3rd, 4th, or 5th
Losers = All other Show bets

Total Show Pool = Sum of all Show bets
Rake = Total Show Pool × 0.10
Net Pool = Total Show Pool - Rake

If no winners (all Show bets on bots outside top 5):
  Refund all bets proportionally after rake

If winners exist:
  For each winning bet:
    Payout = (Bet Amount / Total Winning Bets) × Net Pool
```

### Example Calculation

**Race Setup:**
- 8 bots enter race
- Bot #1234 finishes 1st
- Bot #5678 finishes 2nd
- Bot #9012 finishes 3rd

**Win Pool:**
- 5 ICP on bot #1234 (3 ICP from Alice, 2 ICP from Bob)
- 3 ICP on bot #5678
- 2 ICP on bot #9012
- Total: 10 ICP
- Rake: 1 ICP (10%)
- Net: 9 ICP
- Winners: Alice and Bob
- Alice payout: (3/5) × 9 = 5.4 ICP
- Bob payout: (2/5) × 9 = 3.6 ICP

**Place Pool:**
- 4 ICP on bot #1234
- 6 ICP on bot #5678
- 3 ICP on bot #9012
- 2 ICP on bot #3456 (finished 6th)
- Total: 15 ICP
- Rake: 1.5 ICP (10%)
- Net: 13.5 ICP
- Winning bets: 13 ICP (top 3 finishers)
- Payouts distributed proportionally: (bet amount / 13) × 13.5

## Race Lifecycle Integration

### Integrated Timer (6 Hours)
Betting pool lifecycle integrated into existing race execution timer.

### Timer Logic

```motoko
func executeRacesAndSettleBets() : async () {
    let currentTime = Time.now();
    
    // 1. Check for races with closed registration → Create betting pools
    for (race in scheduledRaces.vals()) {
        if (race.registrationDeadline < currentTime and not poolExists(race.id)) {
            createBettingPool(race);
        }
    };
    
    // 2. Execute races (existing logic) → Automatically close betting
    for (race in startableRaces.vals()) {
        // Betting automatically closes when race starts
        let results = await executeRace(race.id);
        
        // 3. Settle bets immediately after race completion
        await settleBettingPool(race.id, results);
    };
    
    // 4. Retry failed payouts
    await retryFailedPayouts();
};
```

### Direct State Access Benefits

Since betting is integrated, we have direct access to:
- `scheduledRaces` - No API call needed
- `raceResults` - Immediate access after race execution
- `prizePool` - Can add rake directly
- `registrationDeadline` - Know exactly when to open betting
- `raceStartTime` - Know exactly when to close betting

### Pool Lifecycle

```
Pending → Open → Closed → Settled
   ↓        ↓        ↓        ↓
Created  Betting  Race     Payouts
when reg  active  started  complete
closes
```

## MCP Tools

### betting_place_bet
Place a bet on a bot in an upcoming race.

**Parameters:**
- `race_id`: Nat - The race to bet on
- `token_index`: Nat - The bot to bet on
- `bet_type`: "Win" | "Place" | "Show"
- `amount_icp`: Float - Amount to bet (e.g., 1.5 for 1.5 ICP)

**Requirements:**
- Pool must be in Open status
- Bot must be entered in the race
- Amount must be between 1 and 100 ICP
- User must have approved betting canister via ICRC-2
- User can bet max 100 ICP total per race (across all bet types)

**Returns:**
- `bet_id`: Nat
- `pool_subaccount`: Text - Subaccount holding this pool's funds
- `current_odds`: Estimated payout multiplier based on current pool

### betting_list_pools
List betting pools for upcoming, active, or completed races.

**Parameters:**
- `status_filter`: "Open" | "Closed" | "Settled" | null
- `race_class_filter`: "Scavenger" | "Raider" | "Elite" | "SilentKlan" | null
- `after_race_id`: Nat | null - For pagination
- `limit`: Nat - Default 10, max 50

**Returns:** Array of:
- `race_id`: Nat
- `subaccount`: Text
- `status`: PoolStatus
- `entrants`: Array of bot indices
- `total_pooled`: Nat (ICP e8s)
- `betting_closes_at`: Int (timestamp)
- `current_odds`: Array of { tokenIndex, winOdds, placeOdds, showOdds }

### betting_get_pool_info
Get detailed information about a specific betting pool.

**Parameters:**
- `race_id`: Nat

**Returns:**
- All BettingPool fields
- Live odds for each bot (Win/Place/Show)
- Pool subaccount address
- Number of unique bettors
- Largest single bet
- Distribution chart data

### betting_get_my_bets
Get user's betting history.

**Parameters:**
- `status_filter`: "Active" | "Settled" | null
- `limit`: Nat - Default 20

**Returns:** Array of:
- `bet_id`: Nat
- `race_id`: Nat
- `token_index`: Nat
- `bet_type`: BetType
- `amount`: Nat (ICP e8s)
- `timestamp`: Int
- `status`: "Pending" | "Won" | "Lost" | "Refunded"
- `payout`: Nat | null (if won)
- `roi`: Float | null (return on investment %)

### betting_get_stats
Get user's betting statistics.

**Returns:** UserStats object with all performance metrics

### betting_get_leaderboard
Get top bettors by various metrics.

**Parameters:**
- `sort_by`: "profit" | "roi" | "volume" | "win_rate" - Default "profit"
- `time_range`: "all_time" | "30d" | "7d" - Default "all_time"
- `limit`: Nat - Default 10, max 100

**Returns:** Array of:
- `rank`: Nat
- `user_id`: Principal (anonymized for privacy)
- `metric_value`: Float
- `total_bets`: Nat
- `win_rate`: Float

### admin_retry_failed_payouts
Admin tool to retry failed payout transfers.

**Parameters:**
- `pool_id`: Nat | null - Retry specific pool or all failed payouts

**Returns:**
- `retried`: Nat - Number of payouts retried
- `succeeded`: Nat
- `still_failed`: Nat

### admin_force_settle_race
Admin tool to manually trigger settlement for a completed race.

**Parameters:**
- `race_id`: Nat

**Returns:**
- `settled`: Bool
- `payouts_issued`: Nat
- `total_paid_out`: Nat (ICP e8s)

## Rake Distribution

### Breakdown
- **Total Rake**: 10% of all bet pools
- **Racing Prize Pool**: 8% - Added to the race's prize pool before distribution to winners
### Implementation

```motoko
func distributeRake(pool: BettingPool, totalRake: Nat) : async () {
    let racingShare = totalRake * 8 / 10;  // 80% of rake
    let platformShare = totalRake * 2 / 10; // 20% of rake
    
    // Add racing share directly to race prize pool (same canister, just accounting)
    // This is simpler since we're integrated - just update the race's prize pool amount
    switch (races.get(pool.raceId)) {
        case (?race) {
            let updatedRace = {
                race with
                prizePool = race.prizePool + racingShare;
            };
            races.put(pool.raceId, updatedRace);
        };
        case null { /* Race not found - should not happen */ };
    };
    
    // Transfer platform share from pool subaccount to treasury
    let platformResult = await icpLedger.icrc1_transfer({
        from_subaccount = ?pool.subaccount;
        to = {
            owner = platformTreasury;
            subaccount = null;
        };
        amount = platformShare;
        fee = ?10_000; // 0.0001 ICP
        memo = null;
        created_at_time = ?Nat64.fromNat(Int.abs(Time.now()));
    });
};
``` });
};
```

## Betting Limits

### Per-Bet Limits
- **Minimum**: 1 ICP per bet
- **Maximum**: 100 ICP per bet

### Per-User-Per-Race Limits
- **Maximum Total**: 100 ICP across all bet types in a single race
- Example: Can place 50 ICP Win + 30 ICP Place + 20 ICP Show = 100 ICP total

### Pool Limits
- No maximum pool size (scales with participation)
- Minimum 2 entrants required for pool creation (racing system requirement)

## UI Components

### Race List with Betting Status
Show betting availability on race listings:
- "Betting Opens in 2h" (registration still open)
- "🎰 Betting Open - Closes in 45m" (active betting window)
- "Betting Closed - Race in Progress" (race started)
- "Race Completed - View Results" (settled)

### Betting Interface (Race Detail Page)
When pool is Open:
- List all entrants with current odds
- Bet type selector (Win/Place/Show tabs)
- Amount slider/input (1-100 ICP)
- Total pool size visualization
- "Place Bet" button (checks ICRC-2 approval)
- Warning: "Betting closes in X minutes"

### Pool Odds Display
```
Bot #1234 "SpeedDemon"
├─ Win:   3.2x (5 ICP bet)
├─ Place: 1.8x (12 ICP bet)
└─ Show:  1.3x (18 ICP bet)
```

### My Bets Tab
- Active bets (Open/Closed pools)
- Historical bets with results
- Win/loss indicators
- Payout amounts
- ROI percentages

### Betting Stats Dashboard
- Total wagered / won / profit
- Win rate by bet type
- Best performing bots
- Streaks
- ROI chart over time

### Leaderboard Page
- Top bettors by profit
- Top bettors by ROI
- Top bettors by volume
- Time range selector (7d/30d/all-time)

## Implementation Phases

### Phase 1: Core Structure & Types (Day 1-2)
- [ ] Create `BettingManager.mo` module in racing canister
- [ ] Add betting types to `Types.mo` (BettingPool, Bet, BetType, etc.)
- [ ] Implement subaccount derivation utilities
- [ ] Add betting state to stable storage (pools, userStats, bets)
- [ ] Initialize BettingManager in main.mo

### Phase 2: Betting Tools (Day 2-3)
- [ ] Create `tools/betting_place_bet.mo` with ICRC-2 integration
- [ ] Create `tools/betting_list_pools.mo`
- [ ] Create `tools/betting_get_pool_info.mo`
- [ ] Create `tools/betting_get_my_bets.mo`
- [ ] Create `tools/betting_get_stats.mo`
- [ ] Create `tools/betting_get_leaderboard.mo`
- [ ] Register all tools in main.mo MCP handler

### Phase 3: Pool Lifecycle Integration (Day 3-4)
- [ ] Add pool creation logic to existing timer (when registration closes)
- [ ] Add pool closing logic to race start
- [ ] Integrate bet settlement into race completion flow
- [ ] Update executeRaces() to handle betting lifecycle

### Phase 4: Payout Logic (Day 4-5)
- [ ] Implement Win pool payout calculations in BettingManager
- [ ] Implement Place pool payout calculations
- [ ] Implement Show pool payout calculations
- [ ] Implement automatic ICRC-1 transfers to winners
- [ ] Implement rake distribution (internal accounting + treasury transfer)
- [ ] Add failed payout tracking and retry mechanism

### Phase 5: Admin & Stats (Day 5-6)
- [ ] Create `tools/betting_admin_retry_failed_payouts.mo`
- [ ] Create `tools/betting_admin_force_settle_race.mo`
- [ ] Implement user stats aggregation in BettingManager
- [ ] Implement leaderboard query functions
- [ ] Add platform metrics tracking

### Phase 6: UI Implementation (Day 6-8)
- [ ] Add betting interface to race detail page
- [ ] Implement live odds calculation and display
- [ ] Add ICRC-2 approval flow (reuse racing approval)
- [ ] Create "My Bets" tab on garage/profile page
- [ ] Create betting stats dashboard
- [ ] Create leaderboard page
- [ ] Add pool visualization charts

### Phase 7: Testing & Deployment (Day 8-10)
- [ ] Unit tests for payout calculations
- [ ] Test pool lifecycle integration with races
- [ ] Test timer reliability for settlement
- [ ] Test failed payout retry mechanism
- [ ] Verify subaccount balance accuracy
- [ ] Local dfx testing
- [ ] Mainnet deployment
- [ ] Monitor first settled bets

## Security Considerations

### ICRC-2 Approval Safety
- Check approval amount before transfer_from
- Handle approval expiry gracefully
- Clear user messaging about approval requirements

### Payout Integrity
- Verify race results from trusted racing canister
- Implement payout calculation unit tests
- Track failed payouts for manual review
- Audit trail for all transfers

### Subaccount Security
- Subaccounts derived deterministically from race ID
- Only betting canister can spend from pool subaccounts
- Verify subaccount balance matches internal accounting
- Emergency pause mechanism for suspected issues

### DoS Protection
- Rate limit bet placement (max 10 bets per user per minute)
- Enforce per-user-per-race limits (100 ICP max)
- Timer batches settlements (not per-bet)

### Admin Controls
- Only authorized controllers can retry payouts
- Only authorized controllers can force settlement
- Emergency pool freeze capability
- Audit logs for all admin actions

## Future Enhancements

### Phase 8: Advanced Features
- **Exotic Bets**: Exacta (1st & 2nd), Trifecta (1st, 2nd, & 3rd), Superfecta (top 4)
- **Combo Bets**: Bet on multiple bots in one transaction
- **Live Odds Updates**: WebSocket updates during betting window
- **Bet Notifications**: Alert users when their bets win
- **Bet Sharing**: Share bet slips with friends
- **Jackpot Pool**: Accumulate dust from all pools for special races
- **Referral Bonuses**: Reward users who bring in new bettors
- **NFT Badges**: Award badges for betting milestones
- **Betting Challenges**: Weekly/monthly challenges with prizes

### Phase 9: Analytics
- **Pool Health Metrics**: Track liquidity, participation, odds accuracy
- **Bot Performance**: Which bots are most bet on vs most winning
- **Bettor Behavior**: Identify sharp bettors, casual bettors, patterns
- **ROI Analysis**: Calculate expected vs actual returns
- **Predictive Models**: Train models on betting + racing data

### Phase 10: Governance
- **DAO-Controlled Rake**: Let token holders vote on rake percentage
- **Treasury Management**: Community decides how platform rake is spent
- **Feature Voting**: Prioritize new bet types and features
- **Emergency Actions**: Multi-sig for sensitive operations

## Economic Impact

### Platform Revenue (2% rake)
If daily betting volume reaches:
- 1,000 ICP/day → 20 ICP/day platform revenue → 7,300 ICP/year
- 10,000 ICP/day → 200 ICP/day platform revenue → 73,000 ICP/year

### Racing Ecosystem Boost (8% rake)
8% of betting volume returns to race prize pools:
- 1,000 ICP/day betting → 80 ICP/day added to prizes → +20-30% prize pool increase
- 10,000 ICP/day betting → 800 ICP/day added to prizes → +200% prize pool increase
- Creates positive flywheel: Bigger prizes → More racers → More races → More betting → Bigger prizes

### User Engagement
- Additional reason to participate (betting alongside racing)
- Social aspect (compete on leaderboards)
- Lower barrier to entry (1 ICP bet vs buying bot)
- Spectator monetization (watch races with stakes)

## Success Metrics

### Launch Goals (Month 1)
- 100+ unique bettors
- 1,000+ ICP total volume
- 50%+ of races have active betting pools
- <1% failed payout rate

### Growth Goals (Month 3)
- 500+ unique bettors
- 10,000+ ICP total volume
- 80%+ of races have active betting pools
- Platform sustainability (revenue covers costs)

### Maturity Goals (Month 6)
- 2,000+ unique bettors
- 100,000+ ICP total volume
- Betting increases race prize pools by 50%+
- Self-sustaining economy
- Expansion to exotic bet types

## Technical Reference

### Subaccount Address Format
- Length: 32 bytes
- Encoding: Blob (raw bytes)
- Derivation: Race ID encoded in first 4 bytes, rest padded with zeros
- Human-readable: Hex string for display in UI

### ICP Transfer Fees
- ICRC-1 transfer: 10,000 e8s (0.0001 ICP)
- ICRC-2 transfer_from: 10,000 e8s (0.0001 ICP)
- Bet placement: User pays transfer fee
- Payouts: Deducted from payout amount

### Inter-Canister Calls
```motoko
### Module Structure
```motoko
// BettingManager.mo - Core betting logic module
module {
    public class BettingManager() {
        public func createPool(race: Race) : BettingPool { ... };
        public func placeBet(pool: BettingPool, bet: Bet) : Result<(), Text> { ... };
        public func calculateOdds(pool: BettingPool) : [(Nat, Odds)] { ... };
        public func settleBets(pool: BettingPool, results: RaceResults) : async () { ... };
        public func calculatePayouts(pool: BettingPool, results: RaceResults) : [(Principal, Nat)] { ... };
    };
};
```

### Stable Storage (Added to main.mo)
```motoko
// Existing racing state
stable var races: [(Nat, Race)] = [];
stable var robots: [(Nat, Robot)] = [];
// ... existing state ...
## Why Integrated Architecture?

### Single User Approval
The primary benefit of integration is **users only need to approve the racing canister once** for all platform features:
- Race entry fees (existing)
- Betting on races (new)
- Future features (scavenging rewards, tournaments, etc.)

This is a massive UX improvement over requiring separate approvals for each canister.

### Direct State Access
Betting logic has immediate access to:
- Race schedules and status
- Race results after execution
- Prize pools for rake distribution
- Entrant lists for pool creation

No inter-canister calls means lower latency and simpler code.

### Atomic Operations
Race execution and bet settlement happen in the same timer execution:
1. Execute race → Get results
2. Settle betting pool → Calculate payouts
3. Distribute rake → Add to prize pool
4. Pay out winners → Transfer ICP

All in one atomic flow, no coordination complexity.

### Code Organization
Despite integration, code remains modular:
```
packages/canisters/pokedbots_racing/src/
├── main.mo (orchestrates racing + betting)
├── PokedBotsGarage.mo (existing garage logic)
├── RacingSimulator.mo (existing race simulation)
├── BettingManager.mo (new - all betting logic)
├── Types.mo (shared types for racing + betting)
└── tools/
    ├── garage_*.mo (existing garage tools)
    ├── racing_*.mo (existing racing tools)
    └── betting_*.mo (new - betting tools)
```

## Conclusion

This integrated betting system transforms PokedBots Racing from a pure racing platform into a comprehensive racing + betting ecosystem. The subaccount-based architecture provides transparency and security, while the pari-mutuel model ensures fair payouts and sustainable economics. The 8% rake reinvestment creates a positive flywheel that benefits both racers and bettors, driving long-term growth and engagement.

Integration into the racing canister provides superior UX (single approval) while maintaining clean code organization through modular design.
stable var userBettingStats: [(Principal, UserStats)] = [];
stable var nextBetId: Nat = 0;
stable var platformTreasury: Principal = Principal.fromText("aaaaa-aa"); // Update on init
```Conclusion

This betting system transforms PokedBots Racing from a pure racing platform into a comprehensive racing + betting ecosystem. The subaccount-based architecture provides transparency and security, while the pari-mutuel model ensures fair payouts and sustainable economics. The 8% rake reinvestment creates a positive flywheel that benefits both racers and bettors, driving long-term growth and engagement.
