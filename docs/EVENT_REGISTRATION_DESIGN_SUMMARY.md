# Event Registration System - Design Summary

**Status:** Ready for Implementation  
**Date:** January 10, 2026

## Core Design Decisions

### 1. Payment Model ✅
**Players pay entry fee up front when registering**
- Entry fee charged via ICRC-2 at registration time
- Simplifies accounting and prevents no-shows
- Refunds based on cancellation timing

### 2. Event Creation Modes ✅
**Event creators choose between automatic or manual race creation**

**Mode 1: Automatic (System-Generated)**
- Specify: Terrain pool, distance range, optional race count, heat allocation strategy
- System creates races based on actual registrations
- Splits players using chosen strategy (snake, skill-tiered, random, top-bottom)
- Example: "Weekend Sprint" with [Sand, Metal, Scrap] terrains, 10-25km, skill-tiered heats

**Mode 2: Manual (Pre-Defined Schedule)**
- Specify: EXACT races with terrain, distance, track, start times, heat allocation strategy
- System assigns registered players to pre-defined races using chosen strategy
- Perfect for: Multi-day tournaments, championships, special formats
- Example: "Three-Stage Cup" with specific races on Friday 8pm, Saturday 8pm, Sunday 8pm, snake draft allocation

**Benefits:**
- Automatic: Flexible, adapts to registration count, less planning
- Manual: Full control, multi-day events, consistent tracks, theatrical presentation
- Both prevent player gaming (no voting/preferences)

### 3. Class Separation ✅
**Strict class separation - no mixed-class races initially**
- Scrap, Junker, Raider, Elite, SilentKlan race separately
- If a class has insufficient registrations, cancel that class's races (not entire event)
- Future: Add handicap system for mixed-class races

### 4. Registration Limits ✅
**Per-class registration caps set at event creation**
- `maxRegistrationsPerClass` in event metadata
- First-come-first-served within each class
- Prevents runaway scaling issues
- Example: "50 Junker spots, 30 Elite spots"

### 5. Cancellation Policy ✅
**Increasing penalties to discourage late cancellations**

| Timing | Refund | Penalty | Goes To |
|--------|--------|---------|---------|
| >48h before close | 100% | 0% | - |
| 24-48h before close | 50% | 50% | Prize pool |
| <24h before close | 25% | 75% | Prize pool |
| After close | 0% | 100% | Prize pool |

- Penalties added to event prize pool
- Repeat offenders tracked for future restrictions

### 6. Notifications ✅
**In-app alerts initially**
- Show in garage and dashboard
- Alerts: Registration confirmed, races created, race starting soon, results available
- Future: Email/push notifications via user settings

### 7. Blind Registration ✅
**Participant list hidden until registration closes**

**Prevents:**
- Dodging strong competitors
- Sniping weak competition
- Strategic last-minute unregistration

**Visible During Registration:**
- Total count (e.g., "47 registered")
- Class breakdown (e.g., "12 Junker, 8 Raider, 5 Elite")
- Your own registration status
- Event terrain(s)
- Refund schedule

**Revealed After Registration Closes:**
- Full participant list with bot profiles
- Race assignments (after races created)

---

## System Architecture

### Registration Flow

```
Player → Browse Events → Register (Pay) → Wait (Blind) → Registration Closes
   ↓                                                              ↓
Races Created ← System Reads Registrations ← Participant List Revealed
   ↓
Players Assigned to Races → Races Execute
```

### Data Structures

```motoko
type EventRegistration = {
  eventId: Nat;
  tokenIndex: Nat;
  owner: Principal;
  raceClass: RaceClass;
  registeredAt: Int;
  entryFeePaid: Nat;
};

type ScheduledEvent = {
  // Existing fields...
  registrations: [EventRegistration];  // HIDDEN until close
  registrationCounts: {
    total: Nat;
    byClass: [(RaceClass, Nat)];
  };  // PUBLIC stats
  
  // Race creation configuration
  raceCreationMode: RaceCreationMode;  // Automatic or Manual
  
  maxRegistrationsPerClass: Nat;
  cancellationDeadlines: {
    fullRefund: Int;
    halfRefund: Int;
    quarterRefund: Int;
  };
  raceIds: [Nat];  // Generated after registration closes
};

type RaceCreationMode = {
  #Automatic: {
    terrains: [Terrain];
    distanceRange: { min: Nat; max: Nat };
    racesPerClass: ?Nat;
    heatAllocation: HeatAllocationStrategy;
  };
  #Manual: {
    raceTemplates: [RaceTemplate];
    heatAllocation: HeatAllocationStrategy;
  };
};

type HeatAllocationStrategy = {
  #SnakeDraft;      // Balanced: Mix skill levels evenly
  #SkillTiered;     // Grouped: Top ELO together, lower ELO together
  #Random;          // Chaos: Pure random shuffle
  #TopBottom;       // Segregated: Top vs bottom skill extremes
};

type RaceTemplate = {
  stageName: ?Text;
  raceClass: RaceClass;
  terrain: Terrain;
  distance: Nat;
  trackId: ?Nat;
  startOffset: Int;  // Nanoseconds after event.scheduledTime
};
```

### Race Creation Algorithm

```motoko
func createRacesFromRegistrations(event: ScheduledEvent) {
  switch (event.raceCreationMode) {
    // AUTOMATIC MODE: System decides races
    case (#Automatic(config)) {
      let classBots = groupByClass(event.registrations);
      
      for ((class, bots) in classBots.vals()) {
        if (bots.size() < minEntries) {
          refundClassRegistrations(event.eventId, class);
          continue;
        };
        
        let heats = splitIntoHeats(bots, maxSize = 8);
        
        for ((i, heat) in heats.vals()) {
          let terrain = config.terrains[i % config.terrains.size()];
          let distance = randomInRange(config.distanceRange);
          createRace(class, terrain, distance, heat.players);
        };
      };
    };
    
    // MANUAL MODE: Pre-defined schedule
    case (#Manual(config)) {
      for (template in config.raceTemplates.vals()) {
        let classBots = filter(registrations, _.class == template.raceClass);
        
        if (classBots.size() < minEntries) {
          Debug.print("Skipping " # template.stageName);
          continue;
        };
        
        let heats = splitIntoHeats(classBots, maxSize = 8);
        
        for (heat in heats.vals()) {
          createRace(
            class = template.raceClass,
            terrain = template.terrain,
            distance = template.distance,
            trackId = template.trackId,
            startTime = event.scheduledTime + template.startOffset,
            entries = heat.players
          );
        };
      };
    };
  };
}
```

---

## API Design

### Key Functions

```motoko
// Register for event (pay entry fee)
public shared func register_for_event(
  eventId: Nat,
  tokenIndex: Nat
) : async Result<Text, Text>;

// Unregister (with penalty calculation)
public shared func unregister_from_event(
  eventId: Nat,
  tokenIndex: Nat
) : async Result<{
  refundAmount: Nat;
  penaltyAmount: Nat;
}, Text>;

// Get public stats (always visible)
public query func get_event_registration_stats(
  eventId: Nat
) : async {
  total: Nat;
  byClass: [(RaceClass, Nat)];
  isOpen: Bool;
};

// Get full registrations (returns error if before close)
public query func get_event_registrations(
  eventId: Nat
) : async Result<[EventRegistration], Text>;

// Get my registrations with refund info
public query func get_my_event_registrations() : async [{
  event: ScheduledEvent;
  registration: EventRegistration;
  assignedRaceId: ?Nat;
  refundAmount: Nat;  // If unregistered now
}];
```

---

## User Experience

### Registration Journey

1. **Browse Events**
   - See: "Weekly League - Sunday 8pm - MetalRoads Only"
   - See stats: "23/50 Junker, 15/30 Elite registered"

2. **Register**
   - Click "Register Bot #4079"
   - Pay 0.8 ICP entry fee
   - See refund schedule: "Full refund until Friday 8pm, 50% until Saturday 8pm..."

3. **Blind Period**
   - Cannot see who else registered
   - Can see total counts by class
   - Can unregister (with penalty)

4. **Registration Closes**
   - Full participant list revealed
   - Can see competitor bot profiles
   - Wait for races to be created

5. **Races Created**
   - In-app notification: "Assigned to Junker Heat 2 of 3"
   - See opponents, start time, race details
   - Wait for race to start

6. **Race Execution**
   - Automatic - no further action needed
   - Get results notification after completion

---

## Implementation Phases

### Phase 1: Core System (Weeks 1-4)
- Add EventRegistration storage and data structures
- Implement registration/unregistration with ICRC-2 payments
- Implement penalty tier calculations
- Update race creation to read registrations
- Add class-based splitting (8 per race)
- Implement blind registration (hide participants until close)

### Phase 2: Testing & Refinement (Weeks 5-6)
- Test with Daily Sprint events
- Refine ELO-based heat balancing
- Test cancellation penalty system
- Monitor and adjust

### Phase 3: Frontend (Weeks 7-8)
- Update event pages with blind registration UI
- Add registration/unregistration buttons
- Display refund calculator
- Show only counts (not participants) before close
- Build "My Registrations" page
- Add in-app alerts

### Phase 4: Full Rollout (Weeks 9+)
- Enable for Weekly League
- Migrate all event types
- Monitor and collect feedback
- Add advanced features (multi-stage, tournaments)

---

## Anti-Gaming Measures

### Blind Registration
- Prevents dodging strong competition
- Prevents sniping weak competition
- Prevents coordinated registration attacks

### Fixed Terrains
- No player voting/input on terrain
- Set at event creation
- Prevents gaming terrain selection

### Increasing Cancellation Penalties
- Disincentivizes strategic unregistration
- Late cancellations benefit remaining participants (penalty → prize pool)
- Repeat offenders tracked

### First-Come-First-Served Registration
- No special privileges (initially)
- Simple and transparent
- Future: Consider ELO-based priority for premium events

---

## Edge Cases Handled

### Not enough players in a class?
→ Cancel that class's races, refund those players, keep other classes

### Too many players?
→ Automatic splitting: 73 players = 9 heats of 8 + 1 heat of 9

### Player unregisters after close?
→ No refund, entry fee stays in prize pool

### Bot unavailable at race start?
→ Remove from race, reduce prize pool, refund entry fee

### Event cancelled by admin?
→ Full refunds to all participants

---

## Success Metrics

- **Registration Rate:** Target 30%+ increase vs current race-based system
- **Fill Rate:** Target 90%+ races with 7-8 players
- **Player Satisfaction:** 80%+ positive feedback on registration flow
- **Cancellation Rate:** <10% of registrations cancelled
- **Multi-Stage Completion:** 70%+ of registrants complete all stages (when implemented)

---

## Next Steps

1. ✅ Design finalized and approved
2. Create detailed technical specification
3. Begin Phase 1 implementation
4. Set up test environment for Daily Sprints
5. Build frontend mockups
6. Coordinate with MCP tools team

---

**This design is ready for implementation.**
