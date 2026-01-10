# Proposal: Event-Based Registration System

## Executive Summary

This proposal outlines a significant architectural change to the PokedBots Racing system, shifting from **race-based registration** to **event-based registration**. This change enables more sophisticated event formats including multi-stage races, better matchmaking, and improved player experience.

---

## Current System Analysis

### How It Works Now

1. **Event Creation** - Events are created on a schedule (Weekly League, Daily Sprint, Monthly Cup)
2. **Race Creation** - A timer periodically checks for events that need races and creates them:
   - One race per division (Scrap, Junker, Raider, Elite, SilentKlan)
   - Races created ~7 days before event for major events, immediately for daily sprints
   - All races share the event's scheduled time
3. **Player Registration** - Players browse races and sign up for individual races:
   - Players pick specific races by division and terrain
   - Entry happens through `racing_enter_race` tool
   - Each race has maxEntries (typically 8-12 bots)
4. **Race Execution** - Races run sequentially:
   - First race starts at event scheduled time
   - Subsequent races chain after previous race completes (with commercial break)
   - All races within an event share registration windows

### Data Structures (Current)

```motoko
// Event - Container for races
type ScheduledEvent = {
  eventId: Nat;
  eventType: EventType;  // WeeklyLeague, DailySprint, MonthlyCup, SpecialEvent
  scheduledTime: Int;     // When first race starts
  registrationOpens: Int;
  registrationCloses: Int;
  status: EventStatus;    // Announced, RegistrationOpen, RegistrationClosed, InProgress, Completed
  metadata: EventMetadata;
  raceIds: [Nat];        // List of races in this event
  createdAt: Int;
};

// Race - Individual competition
type Race = {
  raceId: Nat;
  name: Text;
  distance: Nat;
  terrain: Terrain;
  raceClass: RaceClass;  // Division/bracket
  entryFee: Nat;
  maxEntries: Nat;
  minEntries: Nat;
  startTime: Int;
  entryDeadline: Int;
  entries: [RaceEntry];  // Players who signed up
  status: RaceStatus;
  // ... other fields
};

type RaceEntry = {
  nftId: Text;
  owner: Principal;
  entryFee: Nat;
  enteredAt: Int;
  stats: ?RacingStats;
};
```

### Current Flow

```
Event Created → Races Generated → Players Register for Races → Races Execute
     ↓                ↓                       ↓                       ↓
 WeeklyLeague    5 races created      Bot #4079 enters         First race runs
 scheduled       (one per class)      Junker MetalRoads       Next race chains
```

### Limitations

1. **No Matchmaking** - Races can have mismatched skill levels, first-come-first-served
2. **Fixed Race Splits** - Cannot dynamically create heats based on registration count
3. **Limited Formats** - Cannot easily support:
   - Multi-stage races (elimination brackets, series)
   - Team events
   - Seeded tournaments
   - Qualification rounds
4. **Poor UX** - Players must:
   - Check back after races are created
   - Pick from multiple races
   - Hope their preferred race doesn't fill up
5. **Race Splitting Complexity** - No automatic overflow handling when races fill

---

## Proposed System

### New Architecture

**Players register for EVENTS, not RACES.**

When the race creation timer runs, it:
1. Reads event registrations
2. Groups players by division/class
3. Splits into multiple races if needed (8+ players per race)
4. Creates balanced races with proper matchmaking
5. Assigns players to specific races

### Key Changes

#### 1. Event Registration

```motoko
// New: Event registration tracking
type EventRegistration = {
  eventId: Nat;
  tokenIndex: Nat;
  owner: Principal;
  raceClass: RaceClass;  // Player's division
  registeredAt: Int;
  entryFeePaid: Nat;  // Amount paid at registration
};

// Events now track registrations
type ScheduledEvent = {
  // ... existing fields ...
  registrations: [EventRegistration];  // Who signed up (HIDDEN until registration closes)
  registrationCounts: { // Public stats
    total: Nat;
    byClass: [(RaceClass, Nat)];
  };
  raceIds: [Nat];  // Generated races (populated later)
  
  // Race Configuration (Choose one mode)
  raceCreationMode: RaceCreationMode;
  
  maxRegistrationsPerClass: Nat;  // Registration cap
  cancellationDeadlines: {
    fullRefund: Int;    // >48h before close
    halfRefund: Int;    // 24-48h before close
    quarterRefund: Int; // <24h before close
  };
  
  // USER-CREATED EVENTS SUPPORT
  creator: ?Principal;  // null for platform events, Principal for user-created
  creatorName: ?Text;   // Display name for user-created events
  creationFee: Nat;     // Fee paid to create event (0 for platform events)
  
  // EVENT VISIBILITY & ACCESS CONTROL
  visibility: EventVisibility;
  invitedParticipants: ?[Principal];  // For private events
  
  // SPONSORSHIPS
  sponsorships: [Sponsorship];  // Community prize pool contributions
};

// Event Visibility Modes
type EventVisibility = {
  #Public;           // Anyone can register
  #Private;          // Only invited players
  #Restricted: {     // Conditional restrictions
    minElo: ?Nat;
    maxElo: ?Nat;
    requiredFaction: ?Faction;
    requiredAchievement: ?Text;
    allowedBots: ?[Nat];  // Specific token indices
    allowedPlayers: ?[Principal];
  };
};

// Sponsorship tracking
type Sponsorship = {
  sponsor: Principal;
  sponsorName: ?Text;
  amount: Nat;  // ICP e8s
  message: ?Text;  // Optional sponsor message (max 100 chars)
  timestamp: Int;
};

// Race Creation Modes
type RaceCreationMode = {
  // Mode 1: Automatic - System creates races based on registrations
  #Automatic: {
    terrains: [Terrain];  // Pool of terrains to use
    distanceRange: {      // Random distance per race
      min: Nat;           // e.g., 10km
      max: Nat;           // e.g., 30km
    };
    racesPerClass: ?Nat;  // Optional: Force specific number of races per class
    heatAllocation: HeatAllocationStrategy;  // How to split players
  };
  
  // Mode 2: Manual - Event creator pre-defines exact race schedule
  #Manual: {
    raceTemplates: [RaceTemplate];  // Exact races to create
    heatAllocation: HeatAllocationStrategy;  // How to split players
  };
};

// Heat Allocation Strategies
type HeatAllocationStrategy = {
  // Snake Draft: Balanced distribution (1,4,5,8,9... | 2,3,6,7,10...)
  // Best for: Fair competition, balanced heats
  #SnakeDraft;
  
  // Skill Tiered: Group by ELO ranges
  // Heat 1: Top ELO players, Heat 2: Mid ELO, Heat 3: Lower ELO
  // Best for: Watching elite competition, giving newer players fair races
  #SkillTiered;
  
  // Random: Pure random distribution
  // Best for: Unpredictability, fun chaos
  #Random;
  
  // Top vs Bottom: Segregate by skill extremes
  // Heat 1: Highest ELO players, Heat 2: Lowest ELO players
  // Best for: Showcasing elite talent, giving beginners their own races
  #TopBottom;
};

type RaceTemplate = {
  stageName: ?Text;      // Optional: "Qualifying", "Semi-Finals", "Finals"
  raceClass: RaceClass;  // Which division
  terrain: Terrain;      // Specific terrain
  distance: Nat;         // Exact distance in km
  trackId: ?Nat;         // Optional: Specific track (for consistency)
  startOffset: Int;      // Nanoseconds after event scheduledTime (for multi-day/staged)
};
```

#### 2. Race Generation Algorithm

```motoko
// When timer runs, process registrations:
func createRacesFromRegistrations(event: ScheduledEvent) {
  // NOW REVEALED: Registration list is visible once closed
  let registrations = event.registrations;
  
  switch (event.raceCreationMode) {
    // MODE 1: AUTOMATIC - System creates races based on registrations
    case (#Automatic(config)) {
      // Group by race class
      let classBots = groupByClass(registrations);
      
      for ((class, bots) in classBots.vals()) {
        if (bots.size() < event.metadata.minEntries) {
          refundClassRegistrations(event.eventId, class);
          continue;
        };
        
        // Split into heats of 8 players
        let heats = splitIntoHeats(bots, maxSize = 8);
        
        // Create races with configured parameters
        for ((i, heat) in heats.vals()) {
          let terrain = config.terrains[i % config.terrains.size()];
          let distance = randomInRange(config.distanceRange.min, config.distanceRange.max);
          
          let race = createRace(
            class = class,
            terrain = terrain,
            distance = distance,
            startTime = event.scheduledTime,
            entries = heat.players
          );
          
          event.raceIds.append(race.raceId);
        };
      };
    };
    
    // MODE 2: MANUAL - Pre-defined race schedule
    case (#Manual(config)) {
      // Create exactly the races specified by event creator
      for (template in config.raceTemplates.vals()) {
        // Get registrations for this race's class
        let classBots = filter(registrations, _.raceClass == template.raceClass);
        
        if (classBots.size() < event.metadata.minEntries) {
          // Skip this race, not enough players
          Debug.print("Skipping " # template.stageName # " - insufficient players");
          continue;
        };
        
        // Split if needed (if template expects multiple heats)
        let heats = splitIntoHeats(classBots, maxSize = 8);
        
        // Create race(s) with EXACT specifications
        for (heat in heats.vals()) {
          let race = createRace(
            class = template.raceClass,
            terrain = template.terrain,
            distance = template.distance,
            trackId = template.trackId,
            startTime = event.scheduledTime + template.startOffset,
            entries = heat.players
          );
          
          event.raceIds.append(race.raceId);
        };
      };
    };
  };
}
```

#### 3. Player Flow

**Old Flow:**
```
Browse Events → Wait for Races → Browse Races → Enter Specific Race
```

**New Flow:**
```
Browse Events → Register for Event → Races Created → Assigned to Race
```

### Benefits

✅ **Better Matchmaking** - Group similar skill levels, ELO-based seeding
✅ **Automatic Splitting** - 100 players sign up? Create 13 races automatically
✅ **Multi-Stage Support** - Top finishers advance to finals
✅ **Simpler UX** - One registration, automatic assignment
✅ **Flexible Formats** - Enables new event types
✅ **Fair Competition** - Balanced heats, seeded brackets

---

## Implementation Plan

### Phase 0: Foundation (Optional - Can be built in parallel)

**User-Created Events & Sponsorship:**

1. **User event limits and safeguards**
   ```motoko
   stable var stable_user_event_limits = {
     maxActiveEventsPerUser: 3;
     creationFee: 50_000_000;  // 0.5 ICP (spam prevention)
     minPrizeContribution: 100_000_000;  // 1 ICP minimum
     minAdvanceTime: 86_400_000_000_000;  // 24 hours
     maxAdvanceTime: 2_592_000_000_000_000;  // 30 days
   };
   ```

2. **Sponsorship handling**
   - Minimum sponsorship: 0.1 ICP
   - Sponsorships added to event prize pool
   - If event cancels, sponsors NOT refunded (goes to platform)
   - Sponsors displayed publicly on event page

3. **Private event management**
   - Invite-only events for guilds, friends, streamers
   - Restricted events with ELO/faction/achievement requirements
   - Validation during registration

4. **Economic model**
   - Creation fee: 0.5 ICP (non-refundable, spam prevention)
   - User events: 5% rake (vs 2% platform events)
   - Platform bonus: 0-50% of official events (based on quality)

**See [docs/USER_EVENTS_AND_SPONSORSHIP.md](USER_EVENTS_AND_SPONSORSHIP.md) for complete specification.**

### Phase 1: Core Registration System

**Backend Changes:**

1. **Add EventRegistration type and storage**
   ```motoko
   stable var stable_event_registrations = Map.new<Nat, [EventRegistration]>();
   ```

2. **New registration functions**
   ```motoko
   public shared func register_for_event(eventId: Nat, tokenIndex: Nat) : async Result<Text, Text>;
   public shared func unregister_from_event(eventId: Nat, tokenIndex: Nat) : async Result<Text, Text>;
   public query func get_event_registrations(eventId: Nat) : async [EventRegistration];
   ```

3. **User event creation functions**
   ```motoko
   public shared func create_user_event(config: UserEventConfig) : async Result<Nat, Text>;
   public shared func cancel_user_event(eventId: Nat) : async Result<(), Text>;
   public shared func add_event_invites(eventId: Nat, principals: [Principal]) : async Result<(), Text>;
   public shared func remove_event_invite(eventId: Nat, principal: Principal) : async Result<(), Text>;
   ```

4. **Event sponsorship functions**
   ```motoko
   public shared func sponsor_event(eventId: Nat, amount: Nat, message: ?Text) : async Result<(), Text>;
   public query func get_event_sponsorships(eventId: Nat) : async ?[Sponsorship];
   ```

5. **Registration validation for access control**
   ```motoko
   func canRegisterForEvent(event: ScheduledEvent, caller: Principal, tokenIndex: Nat) : Bool {
     switch (event.visibility) {
       case (#Public) { true };
       case (#Private) {
         switch (event.invitedParticipants) {
           case (null) { false };
           case (?invited) { Array.find(invited, func (p: Principal) : Bool { p == caller }) != null };
         };
       };
       case (#Restricted(rules)) {
         // Check ELO, faction, achievements, bot/player allowlists
         validateRestrictions(rules, caller, tokenIndex)
       };
     };
   };
   ```

6. **Update race creation logic in `handleRaceCreation`**
   - Check event.registrations instead of creating empty races
   - Group by class and split into heats
   - Pre-populate race entries

4. **Add matchmaking/seeding logic**
   - Sort by ELO within class
   - Balance heats to distribute skill
   - Respect terrain preferences where possible

**Frontend Changes:**

1. **Event detail page** - Show registration button instead of race list
2. **Registration modal** - Simple one-click registration
3. **My Registrations** - Show upcoming events bot is registered for
4. **Race assignment notification** - Alert when races are created
5. **"Create Event" button** - New event creation wizard for users
6. **"Sponsor Event" button** - Add ICP to any event's prize pool
7. **Event creator dashboard** - Manage user-created events and invites
8. **Sponsorship display** - Show sponsor list on event pages (ranked by contribution)
9. **Private event invites** - Notifications for invited-only events

**Migration Strategy:**

- Keep old race registration system functional
- Add new event registration in parallel
- Flag events as `registrationMode: "event" | "race"`
- Platform events marked with `creator = null`
- User-created events marked with `creator = ?Principal`
- Gradually migrate event types
- Launch user event creation after core system stabilizes

### Phase 2: Enhanced Features

1. **Multi-Stage Events**
   ```motoko
   type StageConfig = {
     stageNumber: Nat;
     format: StageFormat;  // Elimination, Points, Qualification
     advancementRule: Text;  // "Top 3", "Top 50%", "Points threshold"
   };
   
   type EventMetadata = {
     // ... existing fields ...
     stages: ?[StageConfig];  // Multi-stage configuration
   };
   ```

2. **Bracket/Tournament Support**
   - Single elimination
   - Double elimination  
   - Swiss system
   - Round robin

3. **Team Events**
   ```motoko
   type TeamRegistration = {
     teamName: Text;
     members: [Nat];  // Token indices
     captain: Principal;
   };
   ```

4. **ELO-Based Seeding**
   - Seed brackets by skill
   - Create balanced heats
   - Protect top seeds

### Phase 3: Advanced Event Types

**Example: Weekend Tournament Series**

```motoko
// Saturday: 3 qualifying races (multi-heat)
// Sunday: Finals with top 8 from Saturday
let tournamentEvent = {
  eventType: #SpecialEvent("Weekend Warrior Tournament");
  stages: [
    { stage: 1, format: #Qualification, advancement: "Top 8 advance" },
    { stage: 2, format: #SingleElimination, advancement: "Winner takes all" }
  ];
  // ...
};
```

**Example: "Ultimate Endurance Cup" (Multi-Day Manual)**

```motoko
// Friday: Desert Stage (30km sand)
// Saturday: Mountain Stage (35km scrap)
// Sunday: Highway Stage (40km metal roads)
let enduranceCup = {
  eventType: #SpecialEvent("Ultimate Endurance Cup");
  scheduledTime: friday8pm;
  registrationCloses: friday6pm;
  raceCreationMode: #Manual({
    raceTemplates: [
      { stageName: ?"Desert Stage"; raceClass: #Elite; terrain: #WastelandSand;
        distance: 30; trackId: ?50; startOffset: 0 },
      { stageName: ?"Mountain Stage"; raceClass: #Elite; terrain: #ScrapHeaps;
        distance: 35; trackId: ?51; startOffset: 86_400_000_000_000 }, // +24h
      { stageName: ?"Highway Stage"; raceClass: #Elite; terrain: #MetalRoads;
        distance: 40; trackId: ?52; startOffset: 172_800_000_000_000 } // +48h
    ]
  });
  // Registered players automatically entered into ALL three races
};
```

**Example: "Faction Wars" (Automatic Mode)**

```motoko
// Blackhole vs Ultimate - Best faction average wins
let factionEvent = {
  eventType: #SpecialEvent("Faction Wars: Blackhole vs Ultimate");
  raceCreationMode: #Automatic({
    terrains: [#MetalRoads, #WastelandSand, #ScrapHeaps],
    distanceRange: { min: 15; max: 25 },
    racesPerClass: null
  });
  // Filter registrations by faction during registration
  // Create balanced races, aggregate faction scores
};
```

---

## Technical Considerations

### Race Splitting Logic

**When creating races from registrations:**

```motoko
func splitIntoHeats(
  players: [Registration], 
  maxPerHeat: Nat,
  strategy: HeatAllocationStrategy
) : [[Registration]] {
  let heats = Buffer.Buffer<[Registration]>(0);
  let heatCount = (players.size() + maxPerHeat - 1) / maxPerHeat;
  
  switch (strategy) {
    // SNAKE DRAFT: Balanced distribution
    case (#SnakeDraft) {
      let sorted = Array.sort(players, compareByElo);
      // Heat 1: players 0, 3, 4, 7, 8...
      // Heat 2: players 1, 2, 5, 6, 9...
      // Creates balanced heats with mixed skill levels
      
      for (i in range(0, heatCount - 1)) {
        let heat = Buffer.Buffer<Registration>(0);
        var idx = i;
        var forward = true;
        while (idx < sorted.size()) {
          heat.add(sorted[idx]);
          if (forward) {
            idx += heatCount;
            if (idx >= sorted.size()) {
              forward := false;
              idx := i + heatCount - 1;
            };
          } else {
            idx -= heatCount;
          };
        };
        heats.add(Buffer.toArray(heat));
      };
    };
    
    // SKILL TIERED: Group by ELO ranges
    case (#SkillTiered) {
      let sorted = Array.sort(players, compareByElo);
      // Heat 1: Top 8 ELO
      // Heat 2: Next 8 ELO
      // Heat 3: Next 8 ELO...
      // Elite players compete together, newer players together
      
      var idx = 0;
      while (idx < sorted.size()) {
        let heatSize = Nat.min(maxPerHeat, sorted.size() - idx);
        let heat = Array.tabulate<Registration>(heatSize, func(i) {
          sorted[idx + i]
        });
        heats.add(heat);
        idx += heatSize;
      };
    };
    
    // RANDOM: Shuffle and distribute
    case (#Random) {
      let shuffled = shuffle(players);
      var idx = 0;
      while (idx < shuffled.size()) {
        let heatSize = Nat.min(maxPerHeat, shuffled.size() - idx);
        let heat = Array.tabulate<Registration>(heatSize, func(i) {
          shuffled[idx + i]
        });
        heats.add(heat);
        idx += heatSize;
      };
    };
    
    // TOP vs BOTTOM: Skill extremes separated
    case (#TopBottom) {
      let sorted = Array.sort(players, compareByElo);
      let midpoint = sorted.size() / 2;
      
      // First half: Top ELO players
      var idx = 0;
      while (idx < midpoint) {
        let heatSize = Nat.min(maxPerHeat, midpoint - idx);
        let heat = Array.tabulate<Registration>(heatSize, func(i) {
          sorted[idx + i]
        });
        heats.add(heat);
        idx += heatSize;
      };
      
      // Second half: Lower ELO players
      idx := midpoint;
      while (idx < sorted.size()) {
        let heatSize = Nat.min(maxPerHeat, sorted.size() - idx);
        let heat = Array.tabulate<Registration>(heatSize, func(i) {
          sorted[idx + i]
        });
        heats.add(heat);
        idx += heatSize;
      };
    };
  };
  
  Buffer.toArray(heats);
};
```

### Registration Windows

Events maintain registration windows:
- **registrationOpens** - When players can sign up
- **registrationCloses** - When registration locks
- **racesCreatedAt** - When system generates races (shortly after close)
- **scheduledTime** - When first race starts

### Backwards Compatibility

**Option 1: Parallel Systems**
- Keep race registration for legacy events
- Add event registration for new events
- Migrate event types gradually

**Option 2: Clean Break**
- Deploy new system
- Convert all future events to event registration
- Deprecate race registration

**Recommendation:** Option 1 for safer migration

### Data Migration

No migration needed - this is additive:
1. Add new EventRegistration storage
2. Add new registration functions
3. Update race creation logic to check for registrations first
4. Old events continue using race creation → manual registration
5. New events use registration → automatic race creation

---

## User Experience Improvements

### Before (Current)

**Player Journey:**
1. Browse schedule, see "Weekly League - Sunday 8pm"
2. Wait for races to be created (7 days before)
3. Come back, browse 5 separate races
4. Pick "Junker - MetalRoads" race
5. Hope it's not full
6. Enter race, pay fee
7. Wait for race to run

**Pain Points:**
- Must check back after races created
- May not get preferred terrain
- Race might fill up
- Multiple steps

### After (Proposed)

**Player Journey:**
1. Browse schedule, see "Weekly League - Sunday 8pm - MetalRoads"
2. See stats: "23/50 Junker registered" (total only, not names)
3. Click "Register Bot #4079" → Pay entry fee up front
4. Confirm registration: "Registered! Full refund available until Friday 8pm"
5. Wait (cannot see who else registered - blind registration)
6. Friday 8pm: Registration closes, participant list revealed
7. 1 hour later: Races created, assigned to "Junker Heat 2 of 3"
8. Get in-app notification: "Your race starts in 30 minutes!"
9. Race runs automatically

**Benefits:**
- One-click registration with clear refund schedule
- Guaranteed spot (if under max)
- Blind registration prevents competition dodging
- Terrain known in advance (no guessing)
- Clearer communication with penalties disclosed

---

## New Event Formats Enabled

### 1. Multi-Stage Series

**"Wasteland Grand Prix" - 3-race series**

```
Stage 1: Qualifying Races (Sunday 8pm)
- All registered players race
- Top 50% advance based on combined time

Stage 2: Semi-Finals (Sunday 9pm)  
- Qualifiers race again
- Top 16 advance

Stage 3: Finals (Sunday 10pm)
- Final 16 compete for championship
- Winner takes grand prize
```

Implementation:
```motoko
metadata: {
  stages: [
    { stage: 1, format: #QualifyingRaces, advancement: "Top 50% by time" },
    { stage: 2, format: #Standard, advancement: "Top 16 advance" },
    { stage: 3, format: #Championship, advancement: "Winner takes all" }
  ]
}
```

### 2. Elimination Tournament

**"Monthly Championship Bracket"**

```
Round 1: 64 players → 32 advance
Round 2: 32 players → 16 advance  
Round 3: 16 players → 8 advance
Semi-Finals: 8 players → 4 advance
Finals: 4 players → Winner
```

### 3. Team Events

**"Faction Wars"**

```
Teams: 8 factions, 5 players each
Format: Best combined time wins
Prizes: Distributed to team members
```

### 4. Endurance Series

**"24-Hour Marathon"**

```
Register once, compete in multiple races
Best 5 finishes count toward ranking
Most points wins after 24 hours
```

---

## API Changes

### New Endpoints

```motoko
// Event registration - Pay entry fee up front
public shared func register_for_event(
  eventId: Nat,
  tokenIndex: Nat
) : async Result<Text, Text>;
// Note: No terrain preference - terrain fixed by event

public shared func unregister_from_event(
  eventId: Nat,
  tokenIndex: Nat
) : async Result<{
  refundAmount: Nat;
  penaltyAmount: Nat;
  message: Text;
}, Text>;

// Query registrations - BLIND until registration closes
public query func get_event_registrations(
  eventId: Nat
) : async Result<[EventRegistration], Text>;
// Returns #err("Registration still open") if before registrationCloses
// Returns full list after registrationCloses

// Query public stats - Always visible
public query func get_event_registration_stats(
  eventId: Nat
) : async {
  total: Nat;
  byClass: [(RaceClass, Nat)];
  maxPerClass: Nat;
  registrationCloses: Int;
  isOpen: Bool;
};

// Check my registrations
public query func get_my_event_registrations() : async [{
  event: ScheduledEvent;
  registration: EventRegistration;
  assignedRaceId: ?Nat;
  canUnregister: Bool;
  refundAmount: Nat; // If unregistered now
}];

// View assigned races (after races created)
public query func get_event_race_assignments(
  eventId: Nat
) : async Result<[{
  raceId: Nat;
  raceClass: RaceClass;
  terrain: Terrain;
  participants: [EventRegistration];
}], Text>;
```

### Modified Endpoints

```motoko
// Updated to show registration status (BLIND)
public query func get_event_details(
  eventId: Nat
) : async ?{
  event: ScheduledEvent;
  registrationStats: {
    total: Nat;
    byClass: [(RaceClass, Nat)];
    maxPerClass: Nat;
    isRegistered: Bool;  // For calling principal only
    myRegistration: ?EventRegistration; // Only show YOUR registration
  };
  races: ?[RaceDetails];  // Null until created
  participants: ?[EventRegistration]; // Null until registration closes
};
```

### MCP Tools

```typescript
// New tool: Register for event (pays entry fee)
racing_register_for_event({
  event_id: 123,
  token_index: 4079
})
// Returns: Success message with refund schedule

// New tool: Unregister from event
racing_unregister_from_event({
  event_id: 123,
  token_index: 4079
})
// Returns: Refund amount and penalty breakdown

// New tool: View my registrations
racing_get_my_registrations()
// Returns: List of events bot is registered for
// Shows: Assigned race (if created), refund amount if unregistered now

// New tool: View event registration stats (public)
racing_get_event_stats({
  event_id: 123
})
// Returns: Total count, class breakdown (NOT individual participants)

// Modified tool: racing_list_races
// Now shows both:
// - Empty races (old system)
// - Pre-assigned races (new system)
```

---

## Rollout Timeline

### Week 1-2: Core Implementation
- [ ] Add EventRegistration data structures with blind registration support
- [ ] Implement registration function (pay up front via ICRC-2)
- [ ] Implement unregistration function with penalty tiers
- [ ] Update race creation logic to read registrations
- [ ] Add basic splitting algorithm (8 players per race, strict class separation)
- [ ] Add terrain specification to event metadata
- [ ] Implement registration count tracking (public) vs participant list (private until close)

### Week 3-4: Testing & Refinement
- [ ] Test with Daily Sprint events (low stakes)
- [ ] Refine matchmaking algorithm
- [ ] Add ELO-based seeding
- [ ] Improve terrain selection logic

### Week 5-6: Frontend Updates
- [ ] Update event detail pages with blind registration UI
- [ ] Show only counts and your registration status (not other participants)
- [ ] Add registration button with refund schedule display
- [ ] Add unregister button with penalty calculator
- [ ] Build "My Registrations" page with in-app alerts
- [ ] Show terrain in event listings
- [ ] Add countdown to registration close
- [ ] Reveal participant list when registration closes

### Week 7-8: Migration
- [ ] Enable for Weekly League events
- [ ] Monitor and adjust
- [ ] Collect user feedback
- [ ] Deprecate old race registration for major events

### Week 9+: Advanced Features
- [ ] Multi-stage events
- [ ] Tournament brackets
- [ ] Team events
- [ ] Special formats

---

## Edge Cases & Considerations

### What if not enough players register?

**Solution 1:** Cancel event, refund entry fees
```motoko
if (registrations.size() < event.metadata.minEntries) {
  cancelEvent(eventId);
  refundAllRegistrations(eventId);
}
```

**Solution 2:** Merge classes
```motoko
if (junkerBots.size() < 8 && raiderBots.size() < 8) {
  // Create mixed-class race
  createRace(junkerBots + raiderBots, class: #Mixed);
}
```

**Solution 3:** Postpone
```motoko
if (registrations.size() < minEntries && timeUntilEvent > 24hours) {
  // Wait for more registrations
  extendRegistrationDeadline(eventId, +6hours);
}
```

### What if too many players register?

**Solution:** Automatic overflow handling
```motoko
// 73 Junker players register
// Create 10 races:
// - 9 races with 8 players
// - 1 race with 9 players
// OR
// - 10 races with 7-8 players (more balanced)
```

### Terrain Assignment

**Fixed at Event Creation:**
- Event creator specifies terrain(s) when creating the event
- No player input or voting (prevents gaming)
- Races distributed across specified terrains

**Examples:**
```motoko
// "Sand Cup" - Single terrain event
event.terrains = [#WastelandSand];
// All races use WastelandSand

// "Mixed Championship" - Multi-terrain event  
event.terrains = [#ScrapHeaps, #MetalRoads, #WastelandSand];
// Races rotate: Race 1 = ScrapHeaps, Race 2 = MetalRoads, Race 3 = Sand, Race 4 = ScrapHeaps...

// "Highway Sprint Series"
event.terrains = [#MetalRoads];
// All races on highwaysIndex);
  
  // After registration closes: No refund
  if (now > event.registrationCloses) {
    return #err("Registration closed - no refunds available");
  };
  
  // Calculate refund based on timing
  let refundAmount = if (now < event.cancellationDeadlines.fullRefund) {
    registration.entryFeePaid; // >48h: Full refund
  } else if (now < event.cancellationDeadlines.halfRefund) {
    registration.entryFeePaid / 2; // 24-48h: 50% refund
  } else if (now < event.cancellationDeadlines.quarterRefund) {
    registration.entryFeePaid / 4; // <24h: 25% refund
  } else {
    0; // After last deadline: No refund
  };
  
  let penalty = registration.entryFeePaid - refundAmount;
  
  // Remove registration
  removeRegistration(eventId, tokenIndex);
  
  // Refund player
  if (refundAmount > 0) {
    await transferICP(registration.owner, refundAmount);
  };
  
  // Add penalty to event prize pool
  if (penalty > 0) {
    addToPrizePool(eventId, penalty);
  };
  
  // Track cancellation for repeat offender detection
  trackCancellation(registration.owner, eventId, penalty);
  
  return #ok("Unregistered - refunded " # formatICP(refundAmount)
  // Allow unregister up to 1 hour before registration closes
  if (now > event.registrationCloses - HOUR) {
    return #err("Too late to unregister");
  };
  
  // Remove registration, refund entry fee
  removeRegistration(eventId, tokenIndex);
  refundEntryFee(owner, entryFee);
  
  return #ok("Unregistered successfully");
}
```

### How to handle disconnects/absences?

**If player's bot is unavailable at race start:**
- Remove from race
- Reduce prize pool by their entry fee
- Refund their entry fee
- Send notification

**Prevention:**
- Check bot availability at registration close time
- Send reminders before races
- Show upcoming races on garage page

### Race assignment transparency

**Before Registration Closes (Blind Period):**
- Total registrations by class (numbers only)
- Your own registration status
- Event terrain(s)
- Refund schedule

**After Registration Closes:**
- Full participant list revealed
- Can see who registered in each class

**After Races Created:**
- Which heat you're in (Heat 1 of 3)
- Who you're racing against (full roster)
- Your estimated start time
- Race details (terrain, distance)
- Opponent bot stats and profiles

---

## Success Metrics

### Measure improvements:

1. **Registration Rate**
   - % of event views that convert to registrations
   - Target: 30%+ increase

2. **Player Satisfaction**
   - Survey: "Event registration is easier than race registration"
   - Target: 80%+ agreement

3. **Race Fill Rate**
   - % of races with optimal player count (8)
   - Target: 90%+ (vs current ~60%)

4. **Multi-Stage Engagement**
   - % of players who complete all stages
   - Target: 70%+ completion rate

5. **Platform Activity**
   - More races per event (due to better splitting)
   - More unique players participating
   - Higher retention week-over-week

---

## Risks & Mitigation

### Risk 1: Players don't understand new system

**Mitigation:**
- Clear UI messaging
- Tutorial/guide
- Both systems run in parallel initially
- Gradual migration

### Risk 2: Registration fills too quickly

**Mitigation:**
- Set appropriate `maxRegistrationsPerClass` at event creation
- First-come-first-served up to limit
- Consider priority queue for high-ELO players in premium events
- Overflow events (create second event if first fills)
- Display fill rate prominently (e.g., "47/50 Junker spots remaining")

### Risk 3: Race splitting produces unfair matchups

**Mitigation:**
- ELO-based seeding
- Snake draft distribution
- Balanced heat creation
- Community feedback and tuning

### Risk 4: Technical complexity

**Mitigation:**
- Phased rollout
- Extensive testing with Daily Sprints
- Rollback plan
- Monitoring and alerts

---

## Design Decisions (Finalized)

### 1. Entry Fee Timing ✅
**Decision: Pay at registration (up front)**
- Players pay entry fee when registering for event
- Simplifies accounting and prevents no-shows
- Entry fee held in event pool until races complete
- Refunds only if event cancelled or early unregistration (with penalty)

### 2. Event Creation Modes ✅
**Decision: Event creators can choose between automatic or manual race creation**

**Mode 1: Automatic (System-Generated)**
- Event creator specifies parameters:
  - Terrain pool (e.g., [Sand, Metal, Scrap])
  - Distance range (e.g., 10-25km)
  - Optional: Force specific number of races per class
- System creates races based on registrations
- Splits players into balanced heats automatically
- Good for: Standard events, flexible scheduling

**Mode 2: Manual (Pre-Defined)**
- Event creator specifies EXACT race schedule:
  - Each race's terrain, distance, track
  - Start time offset (for multi-day/multi-stage)
  - Which class each race is for
- System assigns registered players to pre-defined races
- Splits into multiple heats if too many players for one race
- Good for: Championships, tournaments, special events with specific formats

**Examples:**
```motoko
// Automatic: "Weekend Sprint Series" - Balanced heats
raceCreationMode: #Automatic({
  terrains: [#WastelandSand, #MetalRoads, #ScrapHeaps],
  distanceRange: { min: 10; max: 25 },
  racesPerClass: null,  // Create as many as needed
  heatAllocation: #SnakeDraft  // Balanced competition
})

// Automatic: "Elite Showcase" - Top players compete separately
raceCreationMode: #Automatic({
  terrains: [#MetalRoads],
  distanceRange: { min: 20; max: 30 },
  racesPerClass: null,
  heatAllocation: #SkillTiered  // Top ELO in first heats
})

// Manual: "Three-Stage Championship" - Snake draft for fair multi-stage
raceCreationMode: #Manual({
  raceTemplates: [
    { stageName: ?"Qualifying Round"; raceClass: #Elite; terrain: #MetalRoads; 
      distance: 15; trackId: ?42; startOffset: 0 },
    { stageName: ?"Semi-Finals"; raceClass: #Elite; terrain: #ScrapHeaps; 
      distance: 20; trackId: ?43; startOffset: 3_600_000_000_000 },  // +1 hour
    { stageName: ?"Finals"; raceClass: #Elite; terrain: #WastelandSand; 
      distance: 30; trackId: ?44; startOffset: 7_200_000_000_000 }   // +2 hours
  ],
  heatAllocation: #SnakeDraft  // Fair distribution across stages
})

// Manual: "Top vs Bottom Challenge" - Skill segregation
raceCreationMode: #Manual({
  raceTemplates: [
    { stageName: ?"Elite Division"; raceClass: #Elite; terrain: #MetalRoads;
      distance: 30; trackId: ?50; startOffset: 0 },
    { stageName: ?"Rising Stars"; raceClass: #Elite; terrain: #MetalRoads;
      distance: 30; trackId: ?50; startOffset: 0 }  // Same time, different heats
  ],
  heatAllocation: #TopBottom  // Top ELO vs Bottom ELO separated
})
```

- No player voting on terrain (prevents gaming/dodging)
- Event details visible to players before registration

### 3. Class Mixing ✅
**Decision: Strict class separation for now**
- No mixed-class races initially
- Each division (Scrap, Junker, Raider, Elite, SilentKlan) races separately
- If insufficient players in a class, cancel that class's races (not the entire event)
- Future: Add proper handicap system for mixed-class races

### 4. Registration Limits ✅
**Decision: Set on event creation**
- Event metadata includes `maxRegistrations` per class
- Example: Weekly League allows 50 Junker registrations, 50 Raider, etc.
- Prevents runaway scaling issues
- First-come-first-served up to limit
- Consider: Priority queue for high-ELO players in premium events

### 5. Cancellation Policy ✅
**Decision: Increasing penalty to disincentivize leaving**
- **Early cancellation (>48h before registration closes):** Full refund
- **Late cancellation (24-48h before closes):** 50% refund, 50% penalty
- **Very late cancellation (<24h before closes):** 25% refund, 75% penalty
- **After registration closes:** No refund, full penalty
- Penalty funds added to event prize pool
- Repeat offenders tracked for future restrictions

### 6. Notification System ✅
**Decision: In-app alerts initially**
- Notifications shown in garage and dashboard
- Alert when races are created and you're assigned
- Reminder 1 hour before race starts
- Results notification after race completes
- Future: Add email/push notifications via settings

### 7. Blind Registration (NEW) ✅
**Decision: Hide participant list until registration closes**
- Players cannot see who else registered for event
- Prevents:
  - Dodging strong competitors
  - Sniping weak competition
  - Strategic registration/unregistration
- Registration count visible (e.g., "47/100 registered")
- Class breakdown visible (e.g., "12 Junker, 8 Raider, 5 Elite")
- Full participant list revealed when registration closes
- Race assignments visible when races created

---

## Conclusion

**The event-based registration system represents a fundamental improvement to PokedBots Racing:**

✅ **Better Player Experience** - One-click registration, automatic assignment
✅ **Smarter Matchmaking** - Balanced heats, skill-based seeding  
✅ **More Event Variety** - Multi-stage, tournaments, team events
✅ **Operational Efficiency** - Automatic race splitting, optimal fill rates
✅ **Future-Proof** - Foundation for advanced competitive formats

**Recommendation:** Proceed with phased implementation, starting with Daily Sprint events as low-risk testing ground, then expand to Weekly League and beyond.

---

## Next Steps

1. **Review & Approve** - Stakeholder sign-off on proposal
2. **Detailed Design** - Create technical specification
3. **Prototype** - Build core registration system
4. **Test** - Deploy to test environment, run trials
5. **Pilot** - Enable for Daily Sprints on production
6. **Full Rollout** - Migrate all event types
7. **User Events Phase** - Enable user event creation and sponsorship
8. **Private Events** - Add invite-only and restricted event support
9. **Iterate** - Add advanced features based on feedback

## Related Documents

- [USER_EVENTS_AND_SPONSORSHIP.md](USER_EVENTS_AND_SPONSORSHIP.md) - Complete specification for user-created events
- [EVENT_CATALOG.md](EVENT_CATALOG.md) - Technical event configurations and examples
- [EVENT_CATALOG_PLAYER_GUIDE.md](EVENT_CATALOG_PLAYER_GUIDE.md) - Player-facing event descriptions
- [../guides/12-events-and-tournaments.md](../guides/12-events-and-tournaments.md) - Player guide for events

---

**Document Version:** 1.0  
**Date:** January 10, 2026  
**Author:** PokedBots Racing Development Team
