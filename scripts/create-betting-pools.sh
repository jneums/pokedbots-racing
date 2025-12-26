#!/bin/bash

# Script to manually create betting pools for specific races
# Usage: ./scripts/create-betting-pools.sh

RACES=(270 271 272 273 274)

echo "Creating betting pools for races: ${RACES[@]}"
echo ""

for RACE_ID in "${RACES[@]}"; do
  echo "Creating pool for race $RACE_ID..."
  dfx canister call pokedbots_racing admin_create_betting_pool "($RACE_ID)" --ic
  echo ""
done

echo "Done!"
