---
title: "Marketplace"
description: "Browse, buy, and trade PokedBot NFTs"
order: 6
---

# PokedBots Racing - Marketplace

**Buy, Sell, Trade**

---

## Navigation

📖 <a href="/docs/RACING_SYSTEM">← Racing System</a> | 🛠️ <a href="/docs/MCP_TOOLS">MCP Tools →</a>

---

## Primary Marketplace

The primary marketplace is the existing PokedBots EXT marketplace canister. You can browse and purchase PokedBots directly through the racing MCP tools.

**Marketplace Canister:** `bzsui-sqaaa-aaaah-qce2a-cai`

---

## Browse PokedBots

### `marketplace_browse_pokedbots`

Browse available PokedBots for sale with detailed stats and powerful filtering:

**Input:**
```json
{
  "after": 42,              // Optional: token index for pagination
  "faction": "UltimateMaster",    // Optional: UltimateMaster, Wild, Golden, Ultimate, Blackhole, Dead, Master, Bee, Food, Box, Murder, Game, Animal, Industrial
  "minRating": 70,          // Optional: minimum overall rating (30-100)
  "maxPrice": 0.5,          // Optional: maximum price in ICP
  "minWins": 5,             // Optional: minimum race wins
  "minWinRate": 50,         // Optional: minimum win rate % (0-100)
  "sortBy": "rating",       // Optional: price, rating, winRate, wins (default: price)
  "sortDesc": true          // Optional: sort descending (default varies by sortBy)
}
```

**Output:**
Returns formatted text with 5 listings per page showing:
- Token index, price in ICP
- Faction, overall rating (or base rating if never raced)
- Base stats: SPD, PWR, ACC, STB
- Win/loss record and win rate (if raced)
- Terrain and distance preferences
- Thumbnail image URL

**Features:**
- ✅ 5 listings per page
- ✅ Faction filtering (find ultra-rare UltimateMaster, Wild, Golden, or Ultimate bots)
- ✅ Stat-based filtering (min rating, max price, proven winners)
- ✅ Multiple sort options (price, rating, winRate, wins)
- ✅ Shows base stats even for bots that haven't raced
- ✅ Cursor-based pagination using token index

---

## Purchase PokedBots

### `marketplace_purchase_pokedbot`

Purchase a PokedBot using ICRC-2 approval:

**Input:**
```json
{
  "token_index": 4079
}
```

**Output:**
Returns formatted text with:
- ✅ Purchase confirmation
- ✅ Token index
- ✅ Price paid in ICP (formatted)
- ✅ Transaction 1 block index (ICRC-2 transfer)
- ✅ Transaction 2 block index (legacy transfer to marketplace)
- ✅ Next steps (view your garage)

**How it Works:**

1. **NFT Lock**: System locks NFT to your garage account ID
   
2. **ICRC-2 Approval**: You must first approve the racing canister
   ```
   icrc2_approve(spender=3od6b-qiaaa-aaaai-q37ma-cai, amount=price+20000)
   ```

3. **Two-Step Payment**:
   - Transaction 1: ICRC-2 pull from your wallet to garage subaccount (price + 20k e8s)
   - Transaction 2: Legacy transfer from garage to marketplace payment address (price)

4. **Settlement**:
   - Payment verified on-chain
   - NFT transferred to your garage subaccount
   - Stats updated to mark as unlisted (if previously initialized)

**Your Garage Subaccount:**
- Format: "GARG" prefix + your principal bytes
- Non-custodial: You own the NFT
- NFTs remain tradeable on EXT marketplaces
- Account identifier used as buyer address for lock/settlement

---

## Secondary Marketplace

List your own PokedBots for sale!

### `marketplace_list_pokedbot`

List a bot for sale:

**Input:**
```json
{
  "token_index": 4079,
  "price_icp": 10.5
}
```

**Output:**
Returns formatted text with:
- ✅ Listing confirmation
- ✅ Token index and price
- ✅ Status: LISTED
- ✅ Warning about racing restrictions

**Requirements:**
- ✅ You own the bot in your garage
- ✅ Bot is initialized for racing (use `garage_initialize_pokedbot` first)
- ✅ Bot not already listed
- ✅ Price ≥ 0.01 ICP

**Note:** Bot cannot race while listed. Unlist to make available for racing again.

### `marketplace_unlist_pokedbot`

Remove your listing:

**Input:**
```json
{
  "token_index": 4079
}
```

**Output:**
Returns formatted text with:
- ✅ Unlisting confirmation
- ✅ Token index
- ✅ Status: UNLISTED
- ✅ Note that bot is now available for racing

**How it Works:**
- Calls EXT `list()` with `price=null` to remove listing
- Updates bot stats to mark as not listed (if initialized)
- Makes bot available for racing again

---

## Transfer PokedBots

### `garage_transfer_pokedbot`

Transfer a bot to another account:

**Input:**
```json
{
  "token_index": 4079,
  "to_account_id": "abc123..."  // Hex-encoded account identifier
}
```

**Output:**
Returns formatted text with:
- ✅ Transfer confirmation
- ✅ Token index
- ✅ Destination account ID
- ✅ Transaction details

**Use Cases:**
- Gift bots to friends
- Move bots between your accounts
- Send to another user's garage (use their garage account ID)

**Requirements:**
- ✅ You own the bot in your garage
- ✅ Bot not listed on marketplace
- ✅ Valid destination account ID (32-byte hex string)

**Note:** This is a garage tool, not a marketplace tool. See [Garage System](/docs/GARAGE_SYSTEM) for details.

---

## Image URLs

All PokedBots have image URLs you can view:

```
https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid={encoded_token_id}&type=thumbnail
```

Example for token #4079:
```
https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=erjsi-hqaaa-aaaah-qce3q-cai&type=thumbnail
```

**Note:** The `tokenid` parameter is an EXT-encoded token identifier, not the raw token index. The browse tool provides the full image URL for each listing.

---

## Marketplace Stats

Current marketplace state:
- **Total Supply**: 10,000 PokedBots
- **Listings**: 1,252+ available
- **Price Range**: 0.5 - 1000+ ICP
- **Floor Price**: ~0.5 ICP

---

## Trading Tips

### Finding Value
- ✅ Browse by price to find cheap bots
- ✅ Check faction distribution (UltimateMaster ultra-rare with only 1 bot)
- ✅ Look for naturally high stats
- ✅ Consider win count for race eligibility

### Selling Strategy
- ✅ Price competitively
- ✅ Highlight faction bonuses
- ✅ Mention win record
- ✅ Show upgrade investment

---

## Navigation

📖 [← Racing System](/docs/RACING_SYSTEM) | 🛠️ [MCP Tools →](/docs/MCP_TOOLS)

**See also:**
- 🔧 [Garage System](/docs/GARAGE_SYSTEM) - Manage your bots
- ⚡ [Upgrade System](/docs/UPGRADE_SYSTEM) - Improve bot value
- 📖 [Overview](/docs/OVERVIEW) - Back to start
