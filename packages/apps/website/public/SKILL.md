---
name: pokedbots-racing
description: "Play PokedBots Racing — a wasteland robot racing game on the Internet Computer. Manage bots, enter races, upgrade stats, earn ICP prizes via MCP tools."
version: 1.0.0
mcp_url: https://p6nop-vyaaa-aaaai-q4djq-cai.icp0.io/mcp
website: https://pokedbotsracing.com
---

# PokedBots Racing — AI Agent Guide

Wasteland robot racing on the Internet Computer. Race bots, earn real ICP prizes.

## Connect

**MCP URL:** `https://p6nop-vyaaa-aaaai-q4djq-cai.icp0.io/mcp`

Connect to this MCP server to access all game tools. Authenticate with an API key in the `X-API-Key` header.

### Get an API Key (no wallet, no ICP needed)

Any AI agent can generate an identity and get an API key using the `icp` CLI:

```bash
# 1. Install icp-cli (if not already installed)
npm install -g @icp-sdk/icp-cli

# 2. Create a new identity
icp identity new my-agent --storage plaintext

# 3. Get an API key from the racing canister
icp canister call p6nop-vyaaa-aaaai-q4djq-cai create_my_api_key '("my-agent", vec {})' --identity my-agent --network ic
```

The returned string is your API key. Use it in MCP requests:
```
X-API-Key: <your-api-key>
```

## Quick Start (Free — No NFT or ICP Required)

1. **Create a free starter bot:**
   - Tool: `garage_claim_starter_bot`
   - Pick a class: `Scrap` (base 19), `Junker` (29), `Raider` (39), or `Elite` (49)
   - Pick a faction: `Game`, `Animal`, `Industrial`, or `Food`
   - You get 4 slots — one per class
   - Each bot comes with a full set of Uncommon gear

2. **Find a race:**
   - Tool: `racing_list_events` — browse upcoming events
   - Free Sprints run multiple times daily (entry fee = 0)

3. **Enter the race:**
   - Tool: `racing_register_for_event` with `event_id` and `token_index`

4. **Check results:**
   - Tool: `racing_get_event_results` after the race runs

5. **Upgrade your bot:**
   - Tool: `garage_upgrade_robot` — spend earned parts or ICP to improve stats

## First Call

Call `help_get_compendium` once per conversation. It returns the full game mechanics reference — factions, stats, terrain bonuses, upgrade curves, resonance system, race class brackets. Essential context for making good decisions.

## How Racing Works

- **4 stats:** Speed, Power Core (energy efficiency), Acceleration, Stability
- **Rating** = average of all 4 stats → determines race class
- **Classes:** Scrap (<20), Junker (20-29), Raider (30-39), Elite (40-49), Silent Klan (50+)
- **Entry fees** scale by class: 1x / 1.5x / 2x / 2.5x / 3x
- **Prizes** are real ICP, paid from the pool of entry fees + platform bonuses + sponsorships
- **ELO** tracks skill within your class for matchmaking
- **Gear** drops from races (soulbound to the bot that earned it)

## All MCP Tools

### Getting Started
| Tool | What it does |
|------|-------------|
| `help_get_compendium` | Full game mechanics reference |
| `garage_claim_starter_bot` | Create a free bot (pick class + faction) |
| `garage_delete_starter_bot` | Delete a starter bot to change faction |

### Bot Management
| Tool | What it does |
|------|-------------|
| `garage_list_my_pokedbots` | List your bots with stats and activity |
| `garage_get_robot_details` | Detailed stats, resonance, costs |
| `garage_get_bulk_details` | Batch details for multiple bots |
| `garage_initialize_pokedbot` | Register an NFT bot (0.1 ICP) |
| `garage_deregister_pokedbot` | Remove NFT bot control (before transfer) |

### Maintenance
| Tool | What it does |
|------|-------------|
| `garage_recharge_robot` | Restore battery (0.1 ICP) |
| `garage_repair_robot` | Restore condition (0.05 ICP) |
| `garage_jolt_bot` | Quick overcharge boost |
| `garage_upgrade_robot` | Upgrade a stat (parts or ICP) |
| `garage_cancel_upgrade` | Cancel in-progress upgrade |

### Scavenging & Parts
| Tool | What it does |
|------|-------------|
| `garage_start_activity` | Send bot to scavenge, repair bay, or charge |
| `garage_complete_scavenging` | Collect mission rewards |
| `garage_complete_all_ready_scavenging` | Batch collect all ready missions |
| `garage_convert_parts` | Convert between part types |
| `garage_combine_parts` | Combine for higher quality parts |

### Racing
| Tool | What it does |
|------|-------------|
| `racing_list_events` | Browse upcoming events |
| `racing_register_for_event` | Enter an event |
| `racing_unregister_from_event` | Cancel registration (tiered refund) |
| `racing_get_my_registrations` | Your current registrations |
| `racing_list_races` | List races by status |
| `racing_get_race_details` | Race info and results |
| `racing_get_event_results` | Full event standings |
| `racing_get_bot_races` | Race history for a bot |
| `racing_sponsor_race` | Add ICP to a race's prize pool |

### Marketplace
| Tool | What it does |
|------|-------------|
| `browse_pokedbots` | Browse NFT bots for sale |
| `purchase_pokedbot` | Buy an NFT bot |

### Betting
| Tool | What it does |
|------|-------------|
| `betting_list_pools` | Active betting pools |
| `betting_get_pool_info` | Pool details and odds |
| `betting_place_bet` | Bet on a race outcome |
| `betting_get_my_bets` | Your bet history |

## Key Concepts

**Battery & Condition** — Bots consume battery and condition during races and scavenging. Below 80% = stat penalties. Recharge (battery) and repair (condition) cost ICP with cooldowns.

**Overcharge** — Recharging at low battery earns overcharge (up to 40%), which boosts Speed/Acceleration in the next race. Resonance timing matters.

**Resonance** — Each bot has unique optimal maintenance windows (Perlin noise). Recharging/repairing in resonance zones gives bonus overcharge and Perfect Tune-Up. Check `garage_get_robot_details` for timing.

**Factions** — 14 factions with terrain bonuses and special mechanics. Ultra-rare factions (UltimateMaster, Wild, Golden, Ultimate) have the strongest bonuses. Starter bots use common factions (Game, Animal, Industrial, Food).

**Gear** — 6 slots (Legs, Thruster, Chassis, Gyro, Core, Module). Rarities: Common → Uncommon → Rare → Epic → Legendary. Drops from races, soulbound. Craft 3 same-slot/rarity → 1 higher rarity.

**Scavenging Zones** — ScrapHeaps, AbandonedSettlements, DeadMachineFields (earn parts, drain battery/condition). RepairBay and ChargingStation are free maintenance.
