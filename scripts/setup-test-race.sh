#!/bin/bash

# Script to set up test bots for the next daily sprint race
# Creates 8 bots using dfx identities node-1 through node-8
# Mints them random NFTs, gives them ICP, initializes them, and enters them into a race

set -e

echo "🏁 Setting up test race with 8 bots..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
LEDGER_CANISTER="icp_ledger"
RACING_CANISTER="pokedbots_racing"
POKEDBOTS_CANISTER="pokedbots_nfts"
ICP_AMOUNT="10" # ICP to give each bot
ADMIN_IDENTITY="pp_owner"

# Get canister IDs
RACING_ID=$(dfx canister id $RACING_CANISTER)
LEDGER_ID=$(dfx canister id $LEDGER_CANISTER)
POKEDBOTS_ID=$(dfx canister id $POKEDBOTS_CANISTER)

echo -e "${BLUE}Canister IDs:${NC}"
echo "  Racing: $RACING_ID"
echo "  Ledger: $LEDGER_ID"
echo "  PokedBots: $POKEDBOTS_ID"

# Store original identity to restore later
ORIGINAL_IDENTITY=$(dfx identity whoami)
echo -e "${BLUE}Original identity: $ORIGINAL_IDENTITY${NC}"

# Configure the racing canister (requires owner)
echo -e "${BLUE}Configuring racing canister...${NC}"
dfx identity use $ADMIN_IDENTITY > /dev/null 2>&1
dfx canister call $RACING_CANISTER set_ext_canister "(principal \"$POKEDBOTS_ID\")" > /dev/null 2>&1
dfx canister call $RACING_CANISTER set_icp_ledger "(principal \"$LEDGER_ID\")" > /dev/null 2>&1
echo -e "  ✅ EXT and ICP Ledger configured"
dfx identity use $ORIGINAL_IDENTITY > /dev/null 2>&1

# Arrays to store bot info
declare -a BOT_INDICES
declare -a IDENTITIES

# Function to get garage account ID for an identity
get_garage_account_id() {
    local identity_name=$1
    dfx identity use $identity_name > /dev/null 2>&1
    local principal=$(dfx identity get-principal)
    dfx identity use $ADMIN_IDENTITY > /dev/null 2>&1
    
    # Call the racing canister to get garage account ID
    local garage_id=$(dfx canister call $RACING_CANISTER get_garage_account_id "(principal \"$principal\")" | grep -o '"[^"]*"' | tr -d '"')
    echo "$garage_id"
}

# Function to create API key for an identity
create_api_key() {
    local identity_name=$1
    dfx identity use $identity_name > /dev/null 2>&1
    
    # Create API key
    local api_key=$(dfx canister call $RACING_CANISTER create_my_api_key "(\"${identity_name}-key\", vec {})" | grep -o '"[^"]*"' | tr -d '"')
    echo "$api_key"
}

# Function to call MCP tool via HTTP
call_mcp_tool() {
    local identity=$1
    local api_key=$2
    local tool_name=$3
    local args=$4
    
    # Create JSON-RPC request
    local request=$(cat <<EOF
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "$tool_name",
    "arguments": $args
  },
  "id": "test-$(date +%s)"
}
EOF
)
    
    # Use the raw canister URL for local development
    # This accesses the canister's http_request_update endpoint
    local canister_url="http://localhost:4943/mcp?canisterId=$RACING_ID"
    
    local response=$(curl -s -X POST "$canister_url" \
        -H "Content-Type: application/json" \
        -H "X-Api-Key: $api_key" \
        -d "$request" 2>&1)
    
    echo "$response"
}

echo ""
echo -e "${YELLOW}📦 Step 1: Creating and funding identities...${NC}"

for i in {1..8}; do
    IDENTITY="node-$i"
    IDENTITIES+=("$IDENTITY")
    
    echo -e "${GREEN}Setting up $IDENTITY...${NC}"
    
    # Switch to admin to transfer ICP
    dfx identity use $ADMIN_IDENTITY > /dev/null 2>&1
    
    # Get the principal for this identity
    PRINCIPAL=$(dfx identity get-principal --identity $IDENTITY)
    
    # Transfer ICP to this identity (from default/admin)
    echo "  💰 Transferring $ICP_AMOUNT ICP to $PRINCIPAL..."
    dfx canister call $LEDGER_CANISTER icrc1_transfer "(record { 
        to = record { 
            owner = principal \"$PRINCIPAL\"; 
            subaccount = null 
        }; 
        amount = ${ICP_AMOUNT}00000000; 
        fee = null; 
        memo = null; 
        from_subaccount = null; 
        created_at_time = null 
    })" > /dev/null 2>&1 || echo "    ⚠️  Transfer may have failed (identity might already have funds)"
    
    echo "  ✅ Identity $IDENTITY ready"
done

echo ""
echo -e "${YELLOW}🤖 Step 2: Minting NFTs to garage accounts...${NC}"

dfx identity use $ADMIN_IDENTITY > /dev/null 2>&1

for i in {1..8}; do
    IDENTITY="${IDENTITIES[$i-1]}"
    
    echo -e "${GREEN}Minting NFT for $IDENTITY...${NC}"
    
    # Get garage account ID
    GARAGE_ID=$(get_garage_account_id $IDENTITY)
    echo "  📬 Garage account: $GARAGE_ID"
    
    # Mint NFT directly to garage account
    echo "  🎨 Minting PokedBot NFT..."
    MINT_RESULT=$(dfx canister call $POKEDBOTS_CANISTER ext_mint "(
        vec {
            record {
                \"$GARAGE_ID\";
                variant {
                    nonfungible = record {
                        name = \"TestBot-$i\";
                        asset = \"test-asset-$i\";
                        thumbnail = \"test-thumb-$i\";
                        metadata = null;
                    }
                }
            }
        }
    )")
    
    # Extract token index from result
    TOKEN_INDEX=$(echo "$MINT_RESULT" | grep -oP '\d+' | head -1)
    BOT_INDICES+=("$TOKEN_INDEX")
    
    echo "  ✅ Minted PokedBot #$TOKEN_INDEX"
done

echo ""
echo -e "${YELLOW}🔑 Step 2.5: Creating API keys for all identities...${NC}"

# First, make sure the EXT canister ID is set
echo -e "${BLUE}Setting EXT canister ID on racing canister...${NC}"
dfx identity use $ADMIN_IDENTITY > /dev/null 2>&1
dfx canister call $RACING_CANISTER set_ext_canister "(principal \"$POKEDBOTS_ID\")" || echo "  ⚠️  Failed to set EXT canister (may already be set)"
echo "  ✅ EXT canister configured"

declare -a API_KEYS

for i in {1..8}; do
    IDENTITY="${IDENTITIES[$i-1]}"
    
    echo -e "${GREEN}Creating API key for $IDENTITY...${NC}"
    API_KEY=$(create_api_key $IDENTITY)
    API_KEYS+=("$API_KEY")
    echo "  ✅ API key created"
done

echo ""
echo -e "${YELLOW}⚡ Step 3: Initializing bots for racing...${NC}"

for i in {1..8}; do
    IDENTITY="${IDENTITIES[$i-1]}"
    TOKEN_INDEX="${BOT_INDICES[$i-1]}"
    API_KEY="${API_KEYS[$i-1]}"
    
    echo -e "${GREEN}Initializing bot #$TOKEN_INDEX for $IDENTITY...${NC}"
    
    # Initialize via MCP tool
    INIT_RESULT=$(call_mcp_tool "$IDENTITY" "$API_KEY" "garage_initialize_pokedbot" "{\"token_index\": $TOKEN_INDEX}")
    
    # Debug: show response
    echo "  Response: $(echo "$INIT_RESULT" | head -c 150)..."
    
    if echo "$INIT_RESULT" | grep -q "Racing license\|Success\|faction"; then
        echo "  ✅ Bot #$TOKEN_INDEX initialized"
    else
        echo "  ⚠️  Initialization status unknown"
    fi
done

echo ""
echo -e "${YELLOW}🏁 Step 4: Finding next Daily Sprint race...${NC}"

dfx identity use ${IDENTITIES[0]} > /dev/null 2>&1

# Get list of upcoming races
RACES_JSON=$(dfx canister call $RACING_CANISTER get_upcoming_events "(7)" | grep -A 1000 "race" || echo "")

if [ -z "$RACES_JSON" ]; then
    echo "  ⚠️  No upcoming races found. Run 'dfx canister call $RACING_CANISTER initialize_race_timer' first"
    dfx identity use $ORIGINAL_IDENTITY > /dev/null 2>&1
    exit 1
fi

echo "  📅 Found upcoming events"

# For now, we'll enter the first available Scavenger race
# You can enhance this to find specifically Daily Sprint events

echo ""
echo -e "${YELLOW}💳 Step 5: Entering bots into race...${NC}"

# Get bot details and enter race
for i in {1..8}; do
    IDENTITY="${IDENTITIES[$i-1]}"
    TOKEN_INDEX="${BOT_INDICES[$i-1]}"
    API_KEY="${API_KEYS[$i-1]}"
    
    echo -e "${GREEN}Entering bot #$TOKEN_INDEX ($IDENTITY)...${NC}"
    
    # List races via MCP
    RACES_RESULT=$(call_mcp_tool "$IDENTITY" "$API_KEY" "racing_list_races" "{}")
    
    # Extract race ID (simplified - just get first available race)
    RACE_ID=$(echo "$RACES_RESULT" | grep -oP 'race_id["\s:]+\K\d+' | head -1)
    
    if [ -z "$RACE_ID" ]; then
        echo "  ⚠️  No race ID found"
        continue
    fi
    
    echo "  🎯 Target race ID: $RACE_ID"
    
    # Approve entry fee (assume 0.5 ICP for Daily Sprint)
    echo "  💰 Approving entry fee..."
    dfx identity use $IDENTITY > /dev/null 2>&1
    dfx canister call $LEDGER_CANISTER icrc2_approve "(record {
        spender = record {
            owner = principal \"$RACING_ID\";
            subaccount = null;
        };
        amount = 60000000;
        fee = null;
        memo = null;
        from_subaccount = null;
        created_at_time = null;
        expected_allowance = null;
        expires_at = null;
    })" > /dev/null 2>&1
    
    # Enter the race via MCP
    echo "  🏁 Entering race..."
    ENTRY_RESULT=$(call_mcp_tool "$IDENTITY" "$API_KEY" "racing_enter_race" "{\"race_id\": $RACE_ID, \"token_index\": $TOKEN_INDEX}")
    
    echo "  📋 Entry result: $(echo "$ENTRY_RESULT" | jq -c '.')"
    
    if echo "$ENTRY_RESULT" | grep -q "CONFIRMED\|Success\|successfully"; then
        echo "  ✅ Bot #$TOKEN_INDEX entered race $RACE_ID"
    else
        echo "  ⚠️  Entry may have failed - check response above"
    fi
    
    # Small delay between entries
    sleep 1
done

# Restore original identity
dfx identity use $ORIGINAL_IDENTITY > /dev/null 2>&1

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Summary:"
echo "  • Created 8 test identities (node-1 through node-8)"
echo "  • Minted NFTs: ${BOT_INDICES[@]}"
echo "  • Initialized all bots for racing"
echo "  • Attempted to enter all bots into upcoming race"
echo ""
echo "Next steps:"
echo "  1. Check race status: dfx canister call $RACING_CANISTER get_upcoming_events '(7)'"
echo "  2. Process timers: dfx canister call $RACING_CANISTER process_overdue_timers"
echo "  3. View leaderboard at: http://localhost:3000/leaderboard"
