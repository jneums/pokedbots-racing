# PokedBots Wasteland Racing - Marketplace Integration

## Overview

A complete NFT marketplace integration for the PokedBots Wasteland Racing game, allowing players to browse and purchase PokedBots directly in-game using ICRC-2 approval-based ICP payments.

## Features Implemented

### 1. Marketplace Browse Tool

**File**: `src/tools/marketplace_browse_pokedbots.mo`

**Capabilities**:
- Fetches all 1,252 PokedBot listings from the EXT marketplace
- 5-minute server-side caching to prevent repeated fetches
- Cursor-based pagination (5 listings per page)
- Sorted by price (lowest first)
- Returns token index, price in ICP, and "after" parameter for next page

**Usage**:
```
Tool: browse_pokedbots
Parameters: 
  - after (optional): token index to continue from
```

### 2. Marketplace Purchase Tool

**File**: `src/tools/marketplace_purchase_pokedbot.mo`

**Capabilities**:
- ICRC-2 approval-based payment flow (no manual transfers needed)
- Two-step payment process:
  1. User → Garage subaccount (via `icrc2_transfer_from`)
  2. Garage → Marketplace payment address (via legacy `transfer`)
- Automatic NFT settlement to garage after payment
- Comprehensive error handling for insufficient funds, allowance issues, etc.

**Payment Flow**:
1. User approves racing canister: `icrc2_approve(10 ICP)`
2. Tool calls `lock()` on marketplace with garage as buyer address
3. Tool executes `transfer_from()` to pull ICP from user to garage
4. Tool executes legacy `transfer()` from garage to marketplace payment address
5. Tool calls `settle()` to complete NFT transfer to garage

**Usage**:
```
Tool: purchase_pokedbot
Parameters:
  - token_index: The token index of the PokedBot to purchase
```

### 3. Garage System

**File**: `src/tools/garage_list_my_pokedbots.mo`

**Capabilities**:
- Subaccount-based garage for each user (derived from principal)
- Lists all PokedBots owned by the user's garage
- Displays token ID and image URLs for each bot
- Uses proper EXT AccountIdentifier encoding

**Garage Subaccount Format**:
```
[4 bytes: "GARG"] + [28 bytes: user principal] = 32 bytes total
```

**Usage**:
```
Tool: garage_list_my_pokedbots
Parameters: none
```

## Technical Architecture

### Authentication & Identity

- **Authentication**: OIDC via Prometheus Protocol (`https://bfggx-7yaaa-aaaai-q32gq-cai.icp0.io`)
- **User Principal**: Used to derive unique garage subaccount
- **Garage Derivation**: `GARG` tag + user principal bytes (padded to 32 bytes)

### Payment Flow Details

1. **Approval**: User approves racing canister to spend ICP
   ```motoko
   icrc2_approve(amount: 1_000_000_000) // 10 ICP
   ```

2. **Transfer from User**: Canister pulls funds from user to garage
   ```motoko
   icrc2_transfer_from(
     from: user_principal,
     to: garage_subaccount,
     amount: listing_price + 10_000  // Include transfer fee
   )
   ```

3. **Transfer to Marketplace**: Garage sends to marketplace payment address
   ```motoko
   transfer(
     from_subaccount: garage_subaccount,
     to: marketplace_payment_address,
     amount: listing_price
   )
   ```

4. **Settlement**: Marketplace transfers NFT to buyer's garage
   ```motoko
   settle(token_identifier)
   ```

### NFT Ownership

- **Standard**: EXT (Entrepot) NFT standard
- **PokedBots Canister**: `bzsui-sqaaa-aaaah-qce2a-cai`
- **Racing Canister**: `3od6b-qiaaa-aaaai-q37ma-cai`
- **Account Format**: AccountIdentifier = CRC32 + SHA224 hash (32 bytes, hex-encoded)

### Caching Strategy

**Marketplace Listings Cache**:
- TTL: 5 minutes (300 seconds)
- Storage: In-memory on canister
- Refresh: Automatic on cache expiry
- Benefit: Prevents fetching 1,252 listings repeatedly

## Critical Implementation Details

### Account Identifier Encoding

The EXT standard uses a specific AccountIdentifier format:

```motoko
// Compute account identifier
let hash_input = "\x0A" + "account-id" + principal_bytes + subaccount_bytes
let sha224_hash = SHA224(hash_input)
let crc32_checksum = CRC32(sha224_hash)
let account_id = crc32_checksum + sha224_hash  // 32 bytes total
let account_id_hex = Base16.encode(account_id)  // Hex string
```

### Payment Address Decoding

Marketplace returns payment addresses as hex strings that must be decoded:

```motoko
let paymentAddressBlob = Base16.decode(paymentAddress)
```

### Buyer Address in lock()

Critical fix: Pass **garage account ID** (not seller's account) to `lock()`:

```motoko
let garageAccountId = principalToAccountIdentifier(
  canister_principal,
  garage_subaccount
)

lock(token_id, price, garageAccountId, garage_subaccount)
```

## Packages & Dependencies

### Added Packages (via mops)

- `account-identifier@1.0.2` - Proper EXT account encoding
- `base16@1.0.0` - Hex encoding/decoding
- `icrc2-types@1.1.0` - ICRC-2 standard types
- `IcpLedger.mo` - Generated ICP ledger bindings

### Key Imports

```motoko
import AccountId "mo:account-identifier";
import Base16 "mo:base16/Base16";
import ICRC2 "mo:icrc2-types";
```

## Fixes Applied

### 1. Account Identifier Encoding
**Issue**: Using simplified text representation instead of proper EXT format  
**Fix**: Implemented CRC32 + SHA224 encoding via `account-identifier` package

### 2. Hex Decoding
**Issue**: `blob_of_principal: invalid principal` error  
**Fix**: Decode hex payment address using `Base16.decode()`

### 3. Buyer Address
**Issue**: NFT sent to wrong address (seller instead of buyer)  
**Fix**: Pass garage AccountIdentifier to `lock()` as buyer address

### 4. Payment Amount
**Issue**: "Insufficient funds sent" settlement error  
**Fix**: Include transfer fee: `listing_price + 10_000 e8s`

### 5. Subaccount Derivation
**Issue**: Arithmetic overflow in garage subaccount calculation  
**Fix**: Use proper byte array operations, avoid Nat32 multiplication

## Current State

### Deployment

- **Network**: IC Mainnet
- **Canister ID**: `3od6b-qiaaa-aaaai-q37ma-cai`
- **Status**: ✅ Fully Functional

### Test Results

**Successful Purchase**:
- Token: PokedBot #4079
- Price: 6.00 ICP
- Transaction 1 (approval): Block #30762469
- Transaction 2 (payment): Block #30762471
- Result: NFT in garage, verified ownership

### Verified Functionality

✅ Browse marketplace (1,252 listings, cached, paginated, sorted)  
✅ Purchase NFTs (complete approval-based payment flow)  
✅ Garage management (list owned bots with images)  
✅ Authentication (OIDC integration)  
✅ Image URLs (display PokedBot images)

## Image URLs

Each PokedBot has an image URL in the format:
```
https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid={token_identifier}
```

Token identifiers are encoded using the EXT standard format.

## API Reference

### Public Canister Methods

```motoko
// Encode token index to EXT token identifier
encode_token_identifier(tokenIndex: Nat32) : async Text

// Decode EXT token identifier to token index
decode_token_identifier(tokenIdentifier: Text) : async Nat
```

### Tool Implementations

All tools follow the MCP Motoko SDK v2.0.2 curried function pattern:

```motoko
public func handle(context: ToolContext) : (
  _args: JsonValue,
  _auth: ?AuthInfo,
  cb: (Result<CallToolResult, HandlerError>) -> ()
) -> async ()
```

## Next Phase Possibilities

With the marketplace foundation complete, the following features could be added:

1. **Racing Mechanics**
   - Race initialization and execution
   - Bot stats integration
   - Win/loss tracking

2. **Bot Management**
   - Display bot attributes and stats
   - Upgrade system
   - Maintenance and repairs

3. **Leaderboards**
   - Race history
   - Rankings by wins
   - Seasonal competitions

4. **Advanced Features**
   - Bot breeding
   - Trading between players
   - Tournaments and events
   - Rewards and achievements

## Troubleshooting

### Common Issues

**"Insufficient allowance" error**:
- Solution: Call `icrc2_approve()` before purchasing

**"Listing is locked" error**:
- Cause: Another purchase in progress or previous failed attempt
- Solution: Wait for lock to expire (typically a few minutes)

**Empty garage after purchase**:
- Check: Verify transaction succeeded
- Check: Confirm NFT ownership using `bearer()` call
- Check: Ensure correct garage account ID derivation

### Debug Logging

Purchase tool includes debug logging:
```motoko
Debug.print("[PURCHASE] Tool called");
Debug.print("[PURCHASE] Auth principal: " # Principal.toText(auth.principal));
Debug.print("[PURCHASE] Token index: " # Nat32.toText(tokenIndex));
```

View logs:
```bash
dfx canister --network ic logs 3od6b-qiaaa-aaaai-q37ma-cai
```

## References

- **EXT Standard**: https://github.com/Toniq-Labs/extendable-token
- **ICRC-2**: https://github.com/dfinity/ICRC-1/blob/main/standards/ICRC-2/README.md
- **MCP Motoko SDK**: https://github.com/Prometheus-Protocol/mcp-motoko-sdk
- **PokedBots**: https://bzsui-sqaaa-aaaah-qce2a-cai.ic0.app/

## License

This project is part of the PokedBots Wasteland Racing game.
