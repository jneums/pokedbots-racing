---
title: "Implementation Guide"
description: "Phased implementation approach for the racing calendar system"
order: 3
---

# Racing Calendar Implementation Guide

## Quick Start - Minimum Viable Calendar

Rather than implementing everything at once, here's a phased approach to get the calendar system running:

### Phase 1: Weekly League Races (Week 1)
**Goal**: Replace random hourly races with scheduled Weekly League races every Sunday at 20:00 UTC

**Steps**:
1. Add `RaceCalendar.mo` and `Leaderboard.mo` modules
2. Update `main.mo` to:
   - Initialize calendar and leaderboard in stable storage
   - Create Weekly League event schedule
   - Modify race creation handler to check calendar
3. Deploy and test first Sunday race

**Code Changes Needed**:
```motoko
// In main.mo stable storage
stable var stableEvents : [(Nat, ScheduledEvent)] = [];
stable var stableSeasonBoard : [(Nat, LeaderboardEntry)] = [];

// After upgrade
let eventCalendar = RaceCalendar.EventCalendar(
  Map.fromIter(stableEvents.vals(), nhash)
);

let leaderboardManager = Leaderboard.LeaderboardManager(
  Map.new(), // monthly
  Map.new(), // season
  Map.fromIter(stableSeasonBoard.vals(), nhash), // all-time
  Map.new()  // faction
);
```

### Phase 2: Daily Sprints (Week 2)
**Goal**: Add 6-hour sprint races (00:00, 06:00, 12:00, 18:00 UTC)

**Steps**:
1. Schedule Daily Sprint events alongside Weekly League
2. Adjust points multiplier (1.0x for sprints vs 2.0x for league)
3. Monitor participation and adjust entry fees/prize pools

### Phase 3: Leaderboard Display (Week 3)
**Goal**: Expose leaderboard query endpoints and season tracking

**Steps**:
1. Add leaderboard query functions to `main.mo`
2. Record race results in leaderboard after each race
3. Create frontend/CLI tool to display rankings

**Query Functions**:
```motoko
public query func getLeaderboard(lbType: Leaderboard.LeaderboardType, limit: Nat) : async [Leaderboard.LeaderboardEntry] {
  leaderboardManager.getLeaderboard(lbType, ?limit, null)
};

public query func getMyRanking(lbType: Leaderboard.LeaderboardType, tokenIndex: Nat) : async ?Leaderboard.LeaderboardEntry {
  leaderboardManager.getEntryForBot(lbType, tokenIndex)
};
```

### Phase 4: Monthly Championship Cup (Month 2)
**Goal**: Tournament bracket for top performers

**Steps**:
1. Create tournament bracket system
2. Schedule first Saturday monthly cup
3. Implement qualification (top 32/64 from monthly leaderboard)
4. Run bracket matches with timer system

### Phase 5: Special Events (Month 3+)
**Goal**: Themed races with unique mechanics

**Steps**:
1. Create special event templates
2. Add admin function to schedule custom events
3. Implement event-specific race modifiers
4. Announce and promote special events

## Integration with Existing System

### Coexistence Strategy
- Keep current hourly race creation running initially
- Add calendar events in parallel
- Gradually reduce random races as calendar events increase
- Full cutover after 2-4 weeks of successful calendar operation

### Migration Path
```motoko
// Modified handleRaceCreation to check calendar first
func handleRaceCreation<system>(actionId : TT.ActionId, _action : TT.Action) : TT.ActionId {
  let now = Time.now();
  
  // Check if there's a scheduled event happening soon
  let upcomingEvents = eventCalendar.getUpcomingEvents(now, 1); // Next 24h
  
  if (upcomingEvents.size() > 0) {
    // Create races for scheduled events instead of random races
    for (event in upcomingEvents.vals()) {
      if (event.status == #RegistrationOpen and event.raceIds.size() == 0) {
        createRacesForEvent(event);
      };
    };
  } else {
    // Fall back to current random race creation
    // ... existing logic ...
  };
  
  // Continue scheduling next check
  actionId;
};
```

## Testing Plan

### Week 1 Tests
- [ ] Schedule Sunday race 3 days in advance
- [ ] Verify registration opens Friday
- [ ] Verify registration closes 30 min before race
- [ ] Confirm race starts exactly at 20:00 UTC Sunday
- [ ] Validate leaderboard points (2x multiplier)
- [ ] Check prize pool includes platform bonus

### Week 2 Tests
- [ ] Verify Daily Sprints at 00:00, 06:00, 12:00, 18:00 UTC
- [ ] Confirm 15-minute registration window
- [ ] Validate standard points (1x multiplier)
- [ ] Compare participation between sprints and league

### Month 1 Tests
- [ ] Track all race results in leaderboard
- [ ] Verify rankings update correctly
- [ ] Test trend calculations (up/down/stable)
- [ ] Validate monthly leaderboard resets

## Admin Commands

```motoko
// Schedule next Weekly League race
public shared({caller}) func scheduleNextWeeklyLeague() : async ScheduledEvent {
  assert(caller == owner);
  let now = Time.now();
  let nextSunday = RaceCalendar.getNextWeeklyOccurrence(0, 20, 0, now);
  eventCalendar.createWeeklyLeagueEvent(nextSunday, now)
};

// Schedule next 4 Daily Sprints
public shared({caller}) func scheduleDailySprints(count: Nat) : async [ScheduledEvent] {
  assert(caller == owner);
  var events : [ScheduledEvent] = [];
  var now = Time.now();
  
  for (i in Iter.range(0, count - 1)) {
    let nextSprint = RaceCalendar.getNextDailySprintTime(now);
    let event = eventCalendar.createDailySprintEvent(nextSprint, now);
    events := Array.append(events, [event]);
    now := nextSprint + 1; // Move past this event
  };
  
  events
};

// View upcoming calendar
public query func getUpcomingRaces(days: Nat) : async [ScheduledEvent] {
  let now = Time.now();
  eventCalendar.getUpcomingEvents(now, days)
};
```

## Performance Considerations

- **Storage**: Each leaderboard entry ~200 bytes, 10K bots = 2MB
- **Computation**: Leaderboard sorting O(n log n), acceptable for <10K entries
- **Queries**: Leaderboard queries are cached, rebuild only on race completion
- **Timers**: Calendar event checker runs hourly, very lightweight

## Next Steps

1. Review this plan and adjust based on priorities
2. Choose starting phase (recommend Phase 1)
3. Implement stable storage additions to main.mo
4. Deploy and test first Weekly League race
5. Iterate based on user feedback

## Success Metrics

- **Participation**: >50% of active bots in Weekly League
- **Engagement**: >10 Daily Sprint races completed per day
- **Retention**: Top 100 leaderboard racers race weekly
- **Revenue**: Prize pools growing >10% month-over-month
