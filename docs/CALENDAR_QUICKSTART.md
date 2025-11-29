---
title: "Racing Events"
description: "Scheduled races and competitive events in the wasteland"
order: 5
---

# Racing Events

## Overview

PokedBots Racing features a structured calendar of competitive events. Races are scheduled regularly, allowing you to plan your racing strategy and compete for ICP prizes.

## Event Types

### Weekly League Races

The premier competitive event for serious racers.

- **When**: Every Sunday at 20:00 UTC
- **Entry Fee**: 0.2 ICP
- **Prize Pool**: Entry fees + 1 ICP platform bonus
- **Leaderboard Points**: 2.0x multiplier (double points!)
- **Registration**: Opens Friday, closes 30 minutes before race start
- **Max Entries**: 50 bots
- **Eligible Divisions**: All (Scavenger, Raider, Elite, SilentKlan)

**Why enter?** Higher entry fee means bigger prize pools, and the 2x leaderboard points make this crucial for season rankings.

### Daily Sprint Races

Fast-paced races every 6 hours for quick competition.

- **When**: Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
- **Entry Fee**: 0.05 ICP
- **Prize Pool**: Entry fees only
- **Leaderboard Points**: 1.0x (standard points)
- **Registration**: Closes 15 minutes before race start
- **Max Entries**: 12 bots
- **Eligible Divisions**: Scavenger, Raider, Elite

**Why enter?** Lower risk, frequent opportunities, great for building experience and climbing division ranks.

## How to Participate

### Finding Races

Use the `racing_list_races` MCP tool to browse upcoming events:

```
Tool: racing_list_races
Parameters:
  - status: "Upcoming" (optional - filter by race status)
  - terrain: Filter by terrain type (optional)
  - race_class: Filter by division (optional)
```

The tool returns all scheduled races with:
- Race ID
- Start time
- Entry fee
- Prize pool
- Number of entries
- Registration deadline

### Entering a Race

Once you find a race you want to enter, use the `racing_enter_race` tool:

```
Tool: racing_enter_race
Parameters:
  - race_id: The ID of the race to enter
  - token_index: Your bot's token index
```

**Requirements:**
- Bot must be initialized for racing
- Bot condition ≥ 70
- Bot battery ≥ 50
- Sufficient ICRC-2 allowance for entry fee
- Registration must be before deadline

### Checking Results

After a race completes, prizes are automatically distributed to winners' wallets. Check the leaderboard to see updated rankings and your bot's performance statistics.

## Leaderboard Points

Earn points based on your finishing position in each race:

| Position | Base Points |
|----------|-------------|
| 🥇 1st   | 25          |
| 🥈 2nd   | 18          |
| 🥉 3rd   | 15          |
| 4th      | 12          |
| 5th      | 10          |
| 6th      | 8           |
| 7th-8th  | 6           |
| 9th-10th | 4           |
| Participation | 2      |

**Event Multipliers:**
- 🏆 Weekly League: 2.0x points
- ⚡ Daily Sprints: 1.0x points

**Example:** Finishing 1st in a Weekly League race = 25 × 2.0 = **50 points**!

## Leaderboard Types

### All-Time Leaderboard
Career statistics tracking every race you've ever competed in. This is your permanent racing legacy.

### Season Leaderboard
Resets each season (typically 3 months). Compete for seasonal championships and bragging rights.

### Monthly Leaderboard
Resets every month. Great for consistent racers to showcase their current form.

### Faction Leaderboard
See how your bot ranks among others of the same faction (UltimateMaster, Wild, Golden, Ultimate, Blackhole, Dead, Master, Bee, Food, Box, Murder, Game, Animal, Industrial).

## Your Racing Stats

Each bot tracks:
- **Total Points**: Across all leaderboards
- **Wins**: Number of 1st place finishes
- **Podiums**: Top 3 finishes
- **Win Rate**: Percentage of races won
- **Average Position**: Your typical finish
- **Total Earnings**: ICP won from racing
- **Current Streak**: Consecutive wins (or losses)
- **Rank Trend**: Are you climbing or falling?

## Racing Strategy Tips

### Maximize Your Points

1. **Prioritize Weekly Leagues**: The 2x multiplier makes these crucial for leaderboard climbing
2. **Stay Active**: Even participation points add up over time
3. **Maintain Your Bot**: Keep condition ≥ 70 to enter races
4. **Plan Ahead**: Registration windows close early - don't miss out
5. **Build Streaks**: Consecutive wins boost your reputation

### Division Progression

As you win races, you'll advance through divisions:
- **Scavenger** (0-2 wins): Starting division
- **Raider** (3-5 wins): Intermediate competition
- **Elite** (6-9 wins): Advanced racers
- **SilentKlan** (10+ wins): Top tier, highest stakes

Higher divisions mean tougher competition but better rewards!

### Prize Distribution

Prize pools are divided among top finishers:
- 🥇 1st place: 47.5% of pool
- 🥈 2nd place: 23.75%
- 🥉 3rd place: 14.25%
- 4th place: 9.5%
- Platform fee: 5%

## Coming Soon

- **Monthly Championship Cups**: Tournament brackets for top performers
- **Special Events**: Themed races with unique mechanics and bonus prizes
- **Advanced Statistics**: Detailed performance analytics
- **Faction Championships**: Faction vs faction competitions

Stay tuned for announcements!
