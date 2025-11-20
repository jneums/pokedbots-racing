---
title: "Racing Calendar Design"
description: "Structured racing season system with multiple event types, leaderboards, and championship tournaments"
order: 2
---

# Racing Calendar System Design

## Overview
Transform the current ad-hoc race creation into a structured racing season with multiple event types, leaderboards, and championship tournaments.

## Event Types

### 1. Weekly League Race
- **Schedule**: Every Sunday at 20:00 UTC
- **Purpose**: Main competitive event for leaderboard points
- **Format**:
  - All skill tiers participate in separate divisions
  - Large prize pool (entry fees pooled + platform bonus)
  - Double leaderboard points
  - Multiple heats if >12 entries per division
- **Entry**: Open registration Friday-Sunday 19:30 UTC
- **Prize Distribution**: 
  - 1st: 40%
  - 2nd: 25%
  - 3rd: 15%
  - 4th-6th: 5% each
  - 7th-10th: 1.25% each

### 2. Daily Sprints
- **Schedule**: Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
- **Purpose**: Quick races for XP and minor rewards
- **Format**:
  - Fast races (5-10km)
  - Lower entry fees
  - Quick turnaround (entries close 15 min before)
  - XP bonuses for participation
- **Prize Distribution**: Standard 47.5%/23.75%/14.25%/9.5%

### 3. Monthly Championship Cup
- **Schedule**: 1st Saturday of each month at 20:00 UTC
- **Purpose**: Elite tournament for top performers
- **Format**:
  - Qualification: Top 32 or 64 on monthly leaderboard
  - Single or double elimination bracket
  - Seeded by league performance
  - Best of 3 races per match
- **Prizes**:
  - Winner: Special NFT or unique PokedBot
  - Top 3: Major ICP prizes
  - Participants: Exclusive badges/titles

### 4. Special Events
- **Schedule**: Announced 48+ hours in advance
- **Purpose**: Themed races with unique mechanics
- **Examples**:
  - "Wasteland Storm" - randomized weather effects
  - "Scrap Rally" - all terrain stages
  - "Faction Wars" - team-based competition
  - "Survival Sprint" - last bot standing
- **Format**: Varies by event theme
- **Prizes**: Unique rewards and special NFTs

## Season Structure

### League Season (10-20 races)
- **Duration**: ~2.5-5 months (weekly races)
- **Points System**:
  - 1st place: 25 points
  - 2nd place: 18 points
  - 3rd place: 15 points
  - 4th place: 12 points
  - 5th place: 10 points
  - 6th place: 8 points
  - 7th-8th: 6 points
  - 9th-10th: 4 points
  - Participation: 2 points
- **Divisions**: Scavenger, Raider, Elite, SilentKlan
- **Qualification**: Top 8 per division advance to Championship Cup

### End of Season Championship Cup
- **Format**: Double elimination bracket
- **Seeding**: Based on league points
- **Rounds**:
  - Round of 32 (or 64)
  - Round of 16
  - Quarterfinals
  - Semifinals
  - Finals
- **Special Rules**:
  - Best of 3 races per match
  - Varied terrain/distance per race
  - Loser's bracket for second chances

## Leaderboard System

### Monthly Leaderboard
- Points from all races in calendar month
- Determines Monthly Cup qualification
- Resets 1st of each month
- Top 32/64 qualify for Monthly Cup

### Season Leaderboard
- Points from designated league races only
- Separate leaderboard per division
- Top 8 per division qualify for Championship
- Carries over until season end

### All-Time Leaderboard
- Career statistics and total points
- Win rate, earnings, reputation
- Hall of Fame status

### Faction Leaderboard
- Aggregate faction performance
- Team-based competitions
- Faction bonuses and perks

## Implementation Plan

### Phase 1: Calendar & Scheduling
1. Create `RaceCalendar.mo` module
2. Define event types and schedules
3. Implement cron-like scheduling system
4. Add event announcement system

### Phase 2: Leaderboard System
1. Create `Leaderboard.mo` module
2. Implement points calculation
3. Add ranking algorithms
4. Create leaderboard query endpoints

### Phase 3: Championship System
1. Create `Tournament.mo` module
2. Implement bracket generation
3. Add match scheduling
4. Handle multi-race matches

### Phase 4: Special Events
1. Create event template system
2. Add themed race mechanics
3. Implement announcement/notification
4. Special prize distribution

## Data Structures

### Event Schedule
```motoko
type EventType = {
  #WeeklyLeague;
  #DailySprint;
  #MonthlyCup;
  #SpecialEvent;
};

type ScheduledEvent = {
  eventId: Nat;
  eventType: EventType;
  scheduledTime: Int; // UTC timestamp
  division: ?RaceClass; // null for multi-division
  status: EventStatus;
  registrationOpens: Int;
  registrationCloses: Int;
  metadata: EventMetadata;
};

type EventStatus = {
  #Announced;
  #RegistrationOpen;
  #RegistrationClosed;
  #InProgress;
  #Completed;
  #Cancelled;
};
```

### Leaderboard Entry
```motoko
type LeaderboardEntry = {
  tokenIndex: Nat;
  owner: Principal;
  points: Nat;
  wins: Nat;
  races: Nat;
  winRate: Float;
  avgPosition: Float;
  totalEarnings: Nat;
  rank: Nat;
  trend: {#Up; #Down; #Stable};
};

type LeaderboardType = {
  #Monthly;
  #Season;
  #AllTime;
  #Faction: FactionType;
};
```

### Championship Bracket
```motoko
type BracketMatch = {
  matchId: Nat;
  round: Nat;
  seed1: Nat; // tokenIndex
  seed2: Nat;
  races: [Nat]; // Best of 3 race IDs
  winner: ?Nat;
  nextMatch: ?Nat; // Next match ID if won
  loserMatch: ?Nat; // Loser bracket match ID
};

type Championship = {
  championshipId: Nat;
  seasonId: Nat;
  qualified: [Nat]; // Sorted by seeding
  bracket: [BracketMatch];
  status: ChampionshipStatus;
  prizes: ChampionshipPrizes;
};
```

## Calendar Publishing

### Public Endpoints
- `getUpcomingEvents(days: Nat)` - Next N days of events
- `getSeasonSchedule()` - Full season calendar
- `getEventDetails(eventId: Nat)` - Specific event info
- `getLeaderboard(type: LeaderboardType, limit: Nat)` - Rankings

### Frontend Display
- Interactive calendar view
- Countdown timers
- Registration status
- Prize pool tracking
- Live leaderboards

## Migration Path

1. **Week 1**: Deploy calendar system alongside current races
2. **Week 2**: First Weekly League race (test run)
3. **Week 3**: Add Daily Sprints
4. **Week 4**: Launch first full season
5. **Month 2**: First Monthly Championship Cup
6. **Month 3**: First Special Event
7. **Month 4-5**: Complete first season
8. **Month 6**: Championship Cup tournament

## Notes
- Maintain backward compatibility during transition
- Gradual rollout to test systems
- Community feedback on schedules/formats
- Adjust prize pools based on participation
- Consider time zone fairness for global players
