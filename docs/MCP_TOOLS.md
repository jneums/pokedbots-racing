---
title: "MCP Tools Reference"
description: "Complete API reference for all 15 MCP tools"
order: 7
---

# PokedBots Racing - MCP Tools Reference

**Complete API Documentation**

---

## Navigation

📖 <a href="/docs/MARKETPLACE">← Marketplace</a> | 📚 <a href="/docs/TECHNICAL_REFERENCE">Technical Reference →</a>

---

## Overview

All tools require ICRC-2 approval for paid operations. The canister uses `transfer_from` to pull exact amounts needed.

**Canister ID:** `3od6b-qiaaa-aaaai-q37ma-cai`

**Status:** ✅ All 15 tools fully operational on IC mainnet

---

## Garage Tools

### `garage_list_my_pokedbots`

List all PokedBots in your garage.

**Input:** None (auth required)

**Output:** Formatted text showing:
- Total count of bots in garage
- For each bot:
  - Token index, faction icon, faction name
  - Overall rating (or base rating if never raced)
  - Current stats (Speed, Power, Acceleration, Stability)
  - Battery and condition percentages
  - Racing record (races, wins, win rate)
  - Race class bracket (Scavenger/Raider/Elite/SilentKlan)
  - Terrain and distance preferences
  - Thumbnail URL
- Garage account ID

### `garage_get_robot_details`

Get detailed stats for a specific bot.

**Input:**
```json
{"token_index": 4079}
```

**Output:** JSON object with:
- `message`: Faction-specific greeting
- `token_index`: Bot ID
- `race_class`: Current bracket (Scavenger/Raider/Elite/SilentKlan)
- `owner`: Principal text
- `faction`: Faction name
- `stats`: Current + base stats with bonuses
  - `speed`, `power_core`, `acceleration`, `stability`
  - `base_speed`, `base_power_core`, etc.
  - `speed_bonus`, `power_core_bonus`, etc.
- `condition`: Battery, condition, calibration, status message
- `career`: Races, wins, places, shows, scrap earned, reputation
- `overall_rating`: Calculated rating (30-100)
- `can_race`: Boolean eligibility
- `preferred_distance`: ShortSprint/MediumHaul/LongTrek
- `preferred_terrain`: ScrapHeaps/WastelandSand/MetalRoads
- `experience`: Total XP
- `thumbnail`: Image URL
- `image`: Full image URL
- `active_upgrade`: Upgrade status (type, time remaining, or None)

### `garage_initialize_pokedbot`

Register a bot for wasteland racing license (first-time, free).

**Input:**
```json
{"token_index": 108}
```

**Output:** JSON object with:
- `token_index`: Bot ID
- `faction`: Derived faction (UltimateMaster/Wild/Golden/Ultimate/Blackhole/Dead/Master/Bee/Food/Box/Murder/Game/Animal/Industrial)
- `stats`: Base racing stats (speed, power_core, acceleration, stability)
- `battery`: Starting battery (100)
- `condition`: Starting condition (100)
- `calibration`: Starting calibration (80)
- `status`: "Racing license registered!"
- `license_status`: "REGISTERED"
- `faction_message`: Faction-specific lore message

### `garage_recharge_robot`

Restore condition and battery.

**Cost:** 0.1 ICP + 0.0001 ICP fee (total: 0.1001 ICP)
**Cooldown:** 6 hours  
**Effect:** +20 Condition, +10 Battery

**Input:**
```json
{"token_index": 4079}
```

**Output:** JSON object with:
- `token_index`: Bot ID
- `action`: "Recharge"
- `payment`: Amount, fee, total, block_index
- `condition_restored`: Actual amount restored
- `battery_restored`: Actual amount restored
- `new_condition`: Updated condition value
- `new_battery`: Updated battery value
- `next_available_hours`: 6
- `message`: "Power cells recharged. Systems nominal."

### `garage_repair_robot`

Repair damage to improve condition.

**Cost:** 0.05 ICP + 0.0001 ICP fee (total: 0.0501 ICP)
**Cooldown:** 3 hours  
**Effect:** +10 Condition

**Input:**
```json
{"token_index": 4079}
```

**Output:** JSON object with:
- `token_index`: Bot ID
- `action`: "Repair"
- `condition_restored`: 10
- `new_condition`: Updated condition value
- `message`: "Repairs complete"

### `garage_upgrade_robot`

Start a 12-hour V2 upgrade session with RNG mechanics.

**V2 System Features:**
- **Flexible Payment:** Pay with ICP or parts (100 parts = 1 ICP equivalent)
  - ICP: Requires ICRC-2 approval, instant payment
  - Parts: Deducted from inventory (earned via racing/scavenging)
- **Dynamic Costs:** 0.5 + (currentStat/40)² × tier premium (0.7-3.5×)
- **Success Rates:** 85% → 15% (attempts 1-15), then 8% → 1% (brutal soft cap)
- **Pity System:** +5% per consecutive fail (max +25%), persists across upgrades
- **Double Lottery:** 15% → 2% chance for +2 points (disabled after +15)
- **50% Refund on Failure:** Both ICP and parts are refunded at 50% rate

**Duration:** 12 hours  
**Types:** Velocity (+Speed), PowerCore (+Power Core), Thruster (+Acceleration), Gyro (+Stability)

**Input:**
```json
{
  "token_index": 4079,
  "upgrade_type": "Velocity",
  "payment_method": "icp"  // or "parts"
}
```

**Output:** JSON object with:
- `token_index`: Bot ID
- `upgrade_type`: Type name
- `cost_icp`: Dynamic cost based on current stat
- `success_rate`: Base rate + pity bonus
- `double_chance`: Lottery chance for +2 points
- `attempt_number`: Which upgrade attempt this is
- `pity_counter`: Consecutive failures
- `message`: "🔧 Upgrade in progress. Check back in 12 hours."

**Note:** Success/failure determined after 12 hours. Failures grant pity bonus for next attempt.

---

## Marketplace Tools

### `marketplace_browse_pokedbots`

Browse listings with powerful filtering and sorting, or lookup a specific token.

**Input:**
```json
{
  "tokenIndex": 4079,       // Optional: Get details for specific token (no pagination)
  "after": 42,              // Optional: pagination cursor (browse mode)
  "faction": "GodClass",    // Optional: filter by faction
  "minRating": 70,          // Optional: min rating (30-100)
  "maxPrice": 0.5,          // Optional: max price in ICP
  "minWins": 5,             // Optional: min race wins
  "minWinRate": 50,         // Optional: min win % (0-100)
  "sortBy": "rating",       // Optional: price/rating/winRate/wins
  "sortDesc": true          // Optional: sort direction
}
```

**Two Modes:**

1. **Specific Token Lookup** (when `tokenIndex` provided):
   - Returns single listing with full stats
   - Error if token not listed
   - No pagination

2. **Browse Mode** (when `tokenIndex` omitted):
   - Returns 5 listings per page
   - Apply filters and sorting
   - Use `after` for pagination

**Output:** Formatted text showing listings with:
- Token index, price in ICP
- Faction, overall rating (or base if never raced)
- Base stats (SPD/PWR/ACC/STB)
- Win/loss record and win rate (if raced)
- Terrain and distance preferences
- Thumbnail image URL
- Pagination cursor for next page (browse mode)
- Filter/sort info in header

### `marketplace_purchase_pokedbot`

Purchase a bot via ICRC-2.

**Input:**
```json
{"token_index": 4079}
```

**Output:** Formatted text with:
- "✅ Purchase Complete!"
- Token index, price paid in ICP
- Transaction 1 block index (ICRC-2 transfer to garage)
- Transaction 2 block index (legacy transfer to marketplace)
- "🎮 Next: Use garage_list_my_pokedbots to see your bot"

**Process:**
1. NFT locked to your garage account ID
2. ICRC-2 pull from wallet to garage (price + 20k e8s)
3. Legacy transfer from garage to marketplace payment address
4. NFT settled to garage subaccount

### `marketplace_list_pokedbot`

List your bot for sale.

**Input:**
```json
{
  "token_index": 4079,
  "price_icp": 10.5
}
```

**Output:** Formatted text with:
- "✅ Listing Created!"
- Token index, price in ICP
- Status: LISTED
- Warning: "⚠️ You cannot race with this bot while it's listed"

**Requirements:**
- Bot must be initialized for racing
- Bot not already listed
- Minimum price: 0.01 ICP

### `marketplace_unlist_pokedbot`

Remove your listing.

**Input:**
```json
{"token_index": 4079}
```

**Output:** Formatted text with:
- "✅ Listing Removed!"
- Token index
- Status: UNLISTED
- "🏁 Your bot is now available for racing again!"

**Note:** Calls EXT `list()` with `price=null` to remove listing

### `transfer_pokedbot`

Transfer bot to another account.

**Input:**
```json
{
  "token_index": 4079,
  "to_account_id": "abc123..."  // 64-char hex account ID
}
```

**Output:** Formatted text with:
- "✅ Transfer Complete!"
- Token index, from/to account IDs
- Career stats summary (wins, races, upgrade bonuses)
- "📦 Bot removed from your garage"
- "🎯 All stats and upgrades transfer with bot"
- "🔄 New owner can initialize it to start racing"

**Requirements:**
- Bot not listed on marketplace
- Bot not in active race
- Valid 64-character hex account ID

**Note:** This is a garage tool. All career stats and upgrades transfer with the bot.

---

## Racing Tools

### `racing_list_races`

View upcoming races with filters.

**Input:**
```json
{
  "after_race_id": 100,      // Optional: pagination cursor
  "race_class": "Elite",     // Optional: Scavenger/Raider/Elite/SilentKlan
  "terrain": "MetalRoads",   // Optional: ScrapHeaps/WastelandSand/MetalRoads
  "status": "open",          // Optional: open/full/closed
  "has_spots": true,         // Optional: filter by availability
  "min_distance": 10,        // Optional: min distance in km
  "max_distance": 30,        // Optional: max distance in km
  "token_index": 4079,       // Optional: show only races this bot can enter
  "sort_by": "prize_pool"    // Optional: prize_pool/start_time/entry_fee/distance
}
```

**Output:** JSON object with:
- `message`: "🏁 Wasteland Racing Circuit"
- `total_races`: Total matching races
- `showing`: Number in this page
- `has_more`: Boolean for pagination
- `next_cursor`: Race ID for next page (if has_more)
- `races`: Array of race objects, each with:
  - `race_id`, `name`, `class`, `distance_km`, `duration_seconds`
  - `terrain`, `entry_fee_icp`, `prize_pool_icp`, `sponsored_icp`
  - `sponsors`: Array of sponsor objects
  - `entries`, `max_entries`, `spots_left`
  - `status`: "Open for Entry"/"Full"/"Entry Closed"/etc.
  - `starts_in_hours`, `starts_in_minutes`, `entry_deadline_minutes`

**Features:** Returns 5 races per page, extensive filtering, multiple sort options

### `racing_enter_race`

Enter your bot in a race.

**Input:**
```json
{
  "race_id": 123,
  "token_index": 4079
}
```

**Output:** JSON object with:
- `message`: "🏁 **RACE ENTRY CONFIRMED**"
- `race_id`, `race_name`, `race_class`
- `your_position`: Entry position number
- `total_entries`, `max_entries`
- `entry_fee_paid_icp`: Formatted ICP amount
- `current_prize_pool_icp`: Updated prize pool
- `starts_in_hours`, `starts_in_minutes`
- `battery_remaining`: Bot's battery after -10 drain
- `wasteland_message`: "⚡ Your bot heads to the starting line..."

**Requirements:**
- Condition ≥ 70
- Battery ≥ 50
- Meets race class (wins bracket)
- No active upgrade
- Not listed for sale
- ICRC-2 allowance for entry fee

**Effect:** Drains 10 battery per race entry

### `racing_sponsor_race`

Add ICP to race prize pool.

**Input:**
```json
{
  "race_id": 123,
  "amount_icp": 50.0,
  "message": "Good luck!"  // Optional, max 100 chars
}
```

**Output:** JSON object with:
- `message`: "💰 **SPONSORSHIP CONFIRMED**"
- `sponsor_tier`: 🏆 PLATINUM (≥5 ICP) / 🥇 GOLD (≥2 ICP) / 🥈 SILVER (≥0.5 ICP) / 🥉 BRONZE
- `race_id`, `race_name`, `race_class`
- `your_contribution_icp`: Your sponsorship amount
- `new_prize_pool_icp`: Updated total prize pool
- `total_sponsors`: Number of sponsors
- `entries_so_far`, `max_entries`
- `starts_in_hours`
- `wasteland_message`: "🌟 Your generosity echoes across the wasteland..."

**Minimum:** 0.1 ICP  
**Status:** Only Upcoming races can be sponsored

---

## Authentication

All tools require MCP authentication with your Internet Computer principal.

**Setup:**
1. Connect wallet/identity
2. Authenticate with MCP server
3. Tools use your principal automatically

---

## ICRC-2 Approval

For paid operations, approve the canister once:

```bash
# Approve 150 ICP allowance (covers multiple operations)
dfx canister call ryjl3-tyaaa-aaaaa-aaaba-cai icrc2_approve \
  '(record { 
    spender = record { 
      owner = principal "3od6b-qiaaa-aaaai-q37ma-cai" 
    };
    amount = 15000000000 
  })'
```

Then all paid tools work automatically!

---

## Error Handling

Common errors:

- `"Authentication required"` - No auth provided
- `"Payment failed - check ICRC-2 allowance"` - Insufficient approval
- `"Robot not initialized"` - Need to call `garage_initialize_pokedbot` first
- `"Condition too low"` - Bot needs repair/recharge
- `"Robot not owned by caller"` - You don't own this bot

---

## Navigation

📖 [← Marketplace](/docs/MARKETPLACE) | 📚 [Technical Reference →](/docs/TECHNICAL_REFERENCE)

**See also:**
- 📖 [Overview](/docs/OVERVIEW) - System introduction
- 🏗️ [Architecture](/docs/ARCHITECTURE) - Technical design
- 🔧 [Garage System](/docs/GARAGE_SYSTEM) - Bot management
