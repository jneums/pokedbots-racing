# Racing Calendar - Quick Reference

## Phase 1 Implementation Complete! ✅

Successfully deployed the racing calendar and leaderboard system. The canister now supports:

### Scheduled Events

#### 1. Weekly League Race
- **When**: Every Sunday at 20:00 UTC
- **Entry Fee**: 0.2 ICP (20,000,000 e8s)
- **Prize Pool Bonus**: +1 ICP from platform
- **Points Multiplier**: 2.0x (double leaderboard points)
- **Registration**: Opens Friday, closes 30 min before race
- **Max Entries**: 50 (multiple heats if needed)
- **Divisions**: All (Scavenger, Raider, Elite, SilentKlan)

#### 2. Daily Sprint Races
- **When**: Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
- **Entry Fee**: 0.05 ICP (5,000,000 e8s)
- **Prize Pool Bonus**: None
- **Points Multiplier**: 1.0x (standard points)
- **Registration**: Closes 15 min before race
- **Max Entries**: 12
- **Divisions**: Scavenger, Raider, Elite

### Current Schedule (Nov 16-17, 2025)

```
Event ID 1: Daily Sprint - Nov 16, 18:00 UTC
Event ID 0: Weekly League - Nov 17, 20:00 UTC (TOMORROW!)
Event ID 2: Daily Sprint - Nov 17, 00:00 UTC
Event ID 3: Daily Sprint - Nov 17, 06:00 UTC
Event ID 4: Daily Sprint - Nov 17, 12:00 UTC
```

## Admin Commands

### Schedule Events
```bash
# Schedule next Weekly League race (Sunday 20:00 UTC)
dfx canister call --network ic my_mcp_server scheduleNextWeeklyLeague '()'

# Schedule next 4 Daily Sprints (every 6 hours)
dfx canister call --network ic my_mcp_server scheduleDailySprints '(4:nat)'
```

### View Calendar
```bash
# Get upcoming events (next 7 days)
dfx canister call --network ic my_mcp_server getUpcomingEvents '(7:nat)'

# Get all scheduled events
dfx canister call --network ic my_mcp_server getAllScheduledEvents '()'

# Get specific event details
dfx canister call --network ic my_mcp_server getEventDetails '(0:nat)'
```

### Leaderboard Queries
```bash
# Get all-time leaderboard (top 100)
dfx canister call --network ic my_mcp_server getLeaderboard '(variant { AllTime }, 100:nat)'

# Get current season leaderboard (Season 1, top 50)
dfx canister call --network ic my_mcp_server getLeaderboard '(variant { Season = 1:nat }, 50:nat)'

# Get current month leaderboard (November 2024 = 202411)
dfx canister call --network ic my_mcp_server getLeaderboard '(variant { Monthly = 202411:nat }, 50:nat)'

# Get faction leaderboard (e.g., BattleBot)
dfx canister call --network ic my_mcp_server getLeaderboard '(variant { Faction = variant { BattleBot } }, 50:nat)'

# Get my ranking for a specific bot
dfx canister call --network ic my_mcp_server getMyRanking '(variant { AllTime }, 42:nat)'
```

### Season Management
```bash
# Set current season (admin only)
dfx canister call --network ic my_mcp_server setCurrentSeason '(2:nat)'

# Set current month (admin only)
dfx canister call --network ic my_mcp_server setCurrentMonth '(202412:nat)'

# Start new season (resets season leaderboard)
dfx canister call --network ic my_mcp_server startNewSeason '(2:nat)'

# Reset monthly leaderboard (at start of new month)
dfx canister call --network ic my_mcp_server resetMonthlyLeaderboard '(202412:nat)'
```

## Leaderboard Point System

Points awarded by finishing position:

| Position | Base Points |
|----------|-------------|
| 1st      | 25          |
| 2nd      | 18          |
| 3rd      | 15          |
| 4th      | 12          |
| 5th      | 10          |
| 6th      | 8           |
| 7th-8th  | 6           |
| 9th-10th | 4           |
| Participation | 2      |

**Points are multiplied by the event's pointsMultiplier:**
- Weekly League: 2.0x (double points)
- Daily Sprints: 1.0x (standard points)
- Future Monthly Cup: 3.0x (triple points)

## Leaderboard Entry Details

Each leaderboard entry includes:
- **tokenIndex**: Bot ID
- **owner**: Owner principal
- **points**: Total points earned
- **wins**: Number of 1st place finishes
- **podiums**: Number of top-3 finishes
- **races**: Total races completed
- **winRate**: Percentage of races won
- **avgPosition**: Average finishing position
- **totalEarnings**: Total ICP won (in e8s)
- **bestFinish**: Best position ever achieved
- **currentStreak**: Win/loss streak (positive for wins, negative for losses)
- **rank**: Current ranking position
- **trend**: Rank change (Up, Down, Stable, New)

## Next Steps

1. **Week 1**: Monitor first Weekly League race (Sunday 20:00 UTC)
2. **Week 2**: Analyze participation and adjust entry fees if needed
3. **Week 3**: Continue scheduling weekly/daily races automatically
4. **Month 2**: Implement Monthly Championship Cup for top performers
5. **Month 3+**: Add Special Events with unique themes

## Integration Notes

- Leaderboard automatically updates after each race completion
- Points are recorded across all leaderboard types (Monthly, Season, All-Time, Faction)
- Calendar events are stored in stable storage (survives upgrades)
- Admin can schedule events weeks/months in advance

## Development Roadmap

### Completed ✅
- [x] RaceCalendar module with event scheduling
- [x] Leaderboard module with points system
- [x] Weekly League race scheduling
- [x] Daily Sprint race scheduling
- [x] Leaderboard query endpoints
- [x] Season/month management

### Next Features (Phase 2+)
- [ ] Automatic race creation from scheduled events
- [ ] Monthly Championship Cup (tournament brackets)
- [ ] Special themed events
- [ ] Season championship system
- [ ] Advanced statistics and analytics
- [ ] Notification system for upcoming events
- [ ] Prize pool tracking per event

## Technical Details

### Event Types
- `WeeklyLeague`: Major competitive Sunday races
- `DailySprint`: Quick 6-hour interval races
- `MonthlyCup`: Tournament for top performers (coming soon)
- `SpecialEvent`: Themed races with unique mechanics (coming soon)

### Leaderboard Types
- `AllTime`: Career statistics
- `Season(seasonId)`: Current season (default: Season 1)
- `Monthly(monthId)`: Current month (format: YYYYMM, e.g., 202411)
- `Faction(factionType)`: By bot faction
- `Division(raceClass)`: By skill tier (filtered view)

### Storage
All calendar events and leaderboard data are stored in stable variables that persist across canister upgrades.

## Support

For questions or issues:
1. Check canister logs: `dfx canister logs my_mcp_server --ic`
2. Verify timer status: `dfx canister call --network ic my_mcp_server get_timer_diagnostics '()'`
3. Review upcoming events: `dfx canister call --network ic my_mcp_server getUpcomingEvents '(7:nat)'`
