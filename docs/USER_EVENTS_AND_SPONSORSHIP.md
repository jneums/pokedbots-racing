# User-Created Events & Sponsorship System

## Overview

This document outlines the requirements and implementation for allowing users to create custom events, sponsor existing events, and create private invite-only competitions.

---

## Feature Set

### 1. User-Created Events
Users can create custom racing events with their own parameters.

### 2. Event Sponsorship
Users can add ICP to any event's prize pool.

### 3. Private/Invite-Only Events
Event creators can restrict registration to specific players or bots.

---

## Technical Requirements

### Data Structure Changes

```motoko
// Extended ScheduledEvent
type ScheduledEvent = {
  // ... existing fields ...
  creator: ?Principal;  // null for platform events, Principal for user events
  creatorName: ?Text;   // Display name for user-created events
  visibility: EventVisibility;
  invitedParticipants: ?[Principal];  // For private events
  sponsorships: [Sponsorship];
  creationFee: Nat;  // Fee paid to create event
};

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

type Sponsorship = {
  sponsor: Principal;
  sponsorName: ?Text;
  amount: Nat;  // ICP e8s
  message: ?Text;  // Optional sponsor message
  timestamp: Int;
};

type UserEventLimits = {
  maxActiveEvents: Nat;  // Prevent spam
  minCreationFee: Nat;   // Cost to create event
  minPrizePool: Nat;     // Minimum user contribution
  maxAdvanceTime: Int;   // Cannot schedule too far in future
  minAdvanceTime: Int;   // Must give players time to register
};
```

---

## 1. USER-CREATED EVENTS

### What Users Can Configure

**Basic Settings:**
- Event name and description
- Scheduled time (within limits)
- Registration window (open/close times)
- Visibility (Public/Private/Restricted)

**Race Configuration:**
Choose between Automatic or Manual mode:

**Automatic Mode:**
- Terrain types (select 1-3)
- Distance range (min/max km)
- Entry fee per bot
- Maximum registrations per class
- Minimum entries to run
- Heat allocation strategy (Snake/SkillTiered/Random/TopBottom)

**Manual Mode:**
- Define exact race schedule (times, terrains, distances)
- Specify track IDs (if available)
- Set stage names
- Control advancement rules (for tournaments)

**Prize Pool:**
- Minimum contribution from creator (e.g., 1 ICP)
- Optional platform bonus (smaller than official events)
- Open to sponsorships from others

### Creation Flow

```
1. User navigates to "Create Event"
2. Fills out event form
3. Pays creation fee (e.g., 0.5 ICP non-refundable)
4. Pays minimum prize contribution (e.g., 1+ ICP refundable if event cancels)
5. System validates:
   - User doesn't have too many active events
   - Timing is valid (not too soon, not too far)
   - Prize pool meets minimum
   - Parameters are valid
6. Event created with #RegistrationOpen status
7. Event appears in public/private event listings
```

### API Functions

```motoko
// Create custom event
public shared(msg) func createUserEvent(
  config: UserEventConfig
) : async Result<Nat, Text> {
  // Verify caller isn't spamming
  let userEvents = getUserActiveEvents(msg.caller);
  if (userEvents.size() >= MAX_USER_EVENTS) {
    return #err("Maximum active events reached");
  };
  
  // Validate timing
  let now = Time.now();
  if (config.scheduledTime < now + MIN_ADVANCE_TIME) {
    return #err("Event must be scheduled further in advance");
  };
  if (config.scheduledTime > now + MAX_ADVANCE_TIME) {
    return #err("Event cannot be scheduled more than 30 days ahead");
  };
  
  // Validate prize pool
  if (config.prizeContribution < MIN_PRIZE_POOL) {
    return #err("Minimum prize pool is 1 ICP");
  };
  
  // Charge creation fee (non-refundable, spam prevention)
  let creationFee = await chargeCreationFee(msg.caller);
  if (not creationFee) {
    return #err("Failed to charge creation fee");
  };
  
  // Hold prize contribution in escrow
  let escrowResult = await escrowPrizeContribution(msg.caller, config.prizeContribution);
  switch (escrowResult) {
    case (#err(e)) { return #err("Failed to escrow prize pool: " # e); };
    case (#ok(_)) {};
  };
  
  // Create event
  let eventId = nextEventId;
  nextEventId += 1;
  
  let event: ScheduledEvent = {
    eventId;
    eventType = #SpecialEvent(config.name);
    scheduledTime = config.scheduledTime;
    registrationOpens = config.registrationOpens;
    registrationCloses = config.registrationCloses;
    status = #RegistrationOpen;
    metadata = {
      name = config.name;
      description = config.description;
      entryFee = config.entryFee;
      maxEntries = config.maxEntries;
      minEntries = config.minEntries;
      prizePoolBonus = config.prizeContribution;
      pointsMultiplier = 1.0;  // User events get standard points
      divisions = config.divisions;
    };
    raceIds = [];
    createdAt = now;
    creator = ?msg.caller;
    creatorName = ?config.creatorName;
    visibility = config.visibility;
    invitedParticipants = config.invitedParticipants;
    sponsorships = [];
    creationFee = CREATION_FEE;
    raceCreationMode = config.raceCreationMode;
    heatAllocation = config.heatAllocation;
  };
  
  Map.set(events, nhash, eventId, event);
  
  #ok(eventId)
};

// Cancel user event (before registration closes)
public shared(msg) func cancelUserEvent(eventId: Nat) : async Result<(), Text> {
  let event = Map.get(events, nhash, eventId);
  switch (event) {
    case (null) { return #err("Event not found"); };
    case (?evt) {
      // Verify ownership
      switch (evt.creator) {
        case (null) { return #err("Cannot cancel platform events"); };
        case (?creator) {
          if (creator != msg.caller) {
            return #err("Not event creator");
          };
        };
      };
      
      // Can only cancel before registration closes
      if (Time.now() > evt.registrationCloses) {
        return #err("Cannot cancel after registration closes");
      };
      
      // Refund all participants
      for (reg in evt.registrations.vals()) {
        await refundRegistration(reg.principal, reg.tokenIndex, evt.metadata.entryFee);
      };
      
      // Refund creator's prize contribution (not creation fee)
      await refundPrizeContribution(creator, evt.metadata.prizePoolBonus);
      
      // Refund sponsors
      for (sponsor in evt.sponsorships.vals()) {
        await refundSponsorship(sponsor.sponsor, sponsor.amount);
      };
      
      // Mark cancelled
      let updated = { evt with status = #Cancelled };
      Map.set(events, nhash, eventId, updated);
      
      #ok(())
    };
  };
};
```

### Limits & Safeguards

**Creation Limits:**
- Max 3 active events per user
- Creation fee: 0.5 ICP (non-refundable, spam prevention)
- Minimum prize contribution: 1 ICP
- Must schedule 24-48 hours in advance
- Cannot schedule more than 30 days ahead

**Validation:**
- Entry fees must be reasonable (0.1-5.0 ICP)
- Max entries per class: 100
- Min entries: 2 (at least one race)
- Registration window: At least 12 hours
- Race parameters must be valid (distances, terrains)

**Platform Bonus:**
- User events get smaller platform bonuses (0-50% of official events)
- Based on event quality, creator reputation, expected turnout

---

## 2. EVENT SPONSORSHIP

### How It Works

Any user can add ICP to any event's prize pool (platform or user-created). Sponsorships are publicly visible and sponsors get recognition.

### Use Cases

- **Promote Your Bot:** Sponsor an event your bot is in
- **Community Building:** Support faction events
- **Marketing:** Businesses sponsor for visibility
- **Charity:** Community fundraising events

### API Functions

```motoko
public shared(msg) func sponsorEvent(
  eventId: Nat,
  amount: Nat,  // ICP e8s
  message: ?Text  // Optional sponsor message (max 100 chars)
) : async Result<(), Text> {
  let event = Map.get(events, nhash, eventId);
  switch (event) {
    case (null) { return #err("Event not found"); };
    case (?evt) {
      // Can only sponsor upcoming events
      if (evt.status != #RegistrationOpen and evt.status != #Announced) {
        return #err("Can only sponsor upcoming events");
      };
      
      // Minimum sponsorship
      if (amount < MIN_SPONSORSHIP) {
        return #err("Minimum sponsorship is 0.1 ICP");
      };
      
      // Validate message length
      switch (message) {
        case (?msg) {
          if (msg.size() > 100) {
            return #err("Sponsor message too long (max 100 chars)");
          };
        };
        case (null) {};
      };
      
      // Transfer ICP to event escrow
      let transferResult = await escrowSponsorship(msg.caller, amount);
      switch (transferResult) {
        case (#err(e)) { return #err("Transfer failed: " # e); };
        case (#ok(_)) {};
      };
      
      // Add sponsorship
      let sponsorship: Sponsorship = {
        sponsor = msg.caller;
        sponsorName = await getUserDisplayName(msg.caller);
        amount;
        message;
        timestamp = Time.now();
      };
      
      let updated = {
        evt with
        sponsorships = Array.append(evt.sponsorships, [sponsorship]);
        metadata = {
          evt.metadata with
          prizePoolBonus = evt.metadata.prizePoolBonus + amount;
        };
      };
      
      Map.set(events, nhash, eventId, updated);
      
      #ok(())
    };
  };
};

// Get event sponsorships (for display)
public query func getEventSponsorships(eventId: Nat) : async ?[Sponsorship] {
  let event = Map.get(events, nhash, eventId);
  switch (event) {
    case (null) { null };
    case (?evt) { ?evt.sponsorships };
  };
};
```

### Sponsorship Display

**In Event Listing:**
```
Weekly League Championship
Prize Pool: 15.7 ICP (8 ICP base + 7.7 ICP sponsors)
Sponsored by: Alice (2 ICP), Bob's Garage (3 ICP), +3 more
```

**On Event Page:**
```
SPONSORS (Total: 7.7 ICP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🥇 Bob's Garage - 3.0 ICP
   "May the fastest bot win!"

🥈 Alice - 2.0 ICP
   "Go Blackhole faction!"

🥉 ChampionBot #4829 - 1.5 ICP

   DeadFaction Crew - 0.7 ICP
   Anonymous - 0.5 ICP
```

### Limits

- Minimum sponsorship: 0.1 ICP
- Maximum message length: 100 characters
- Sponsorships are non-refundable (even if event cancels, goes to platform)
- Display up to top 10 sponsors, show "+X more" for others

---

## 3. PRIVATE & INVITE-ONLY EVENTS

### Visibility Modes

**Public** - Default, anyone can register

**Private** - Only invited participants can register
```motoko
{
  visibility = #Private;
  invitedParticipants = ?[
    principal("aaaaa-aa..."),
    principal("bbbbb-bb..."),
  ];
}
```

**Restricted** - Conditional requirements
```motoko
{
  visibility = #Restricted({
    minElo = ?1500;  // Must have 1500+ ELO
    maxElo = null;
    requiredFaction = ?#Blackhole;  // Faction-only event
    requiredAchievement = ?"EventWinner";  // Previous winners only
    allowedBots = ?[4829, 1234, 5678];  // Specific bots only
    allowedPlayers = null;
  });
}
```

### Use Cases

**Private Events:**
- Friend tournaments
- Guild competitions
- Streamer community races
- Developer testing
- Grudge matches (specific rivals)

**Restricted Events:**
- Elite-only tournaments (min ELO)
- Faction wars (faction restriction)
- Beginner events (max ELO)
- Champions defense (achievement requirement)
- Showcase matches (specific bot list)

### Registration Validation

```motoko
// Check if user can register for event
func canRegisterForEvent(
  event: ScheduledEvent,
  caller: Principal,
  tokenIndex: Nat
) : Bool {
  switch (event.visibility) {
    case (#Public) { true };
    
    case (#Private) {
      switch (event.invitedParticipants) {
        case (null) { false };
        case (?invited) {
          // Check if caller is invited
          Array.find(invited, func (p: Principal) : Bool { p == caller }) != null
        };
      };
    };
    
    case (#Restricted(rules)) {
      // Check ELO requirements
      let botElo = getBotElo(tokenIndex);
      switch (rules.minElo) {
        case (?min) { if (botElo < min) return false; };
        case (null) {};
      };
      switch (rules.maxElo) {
        case (?max) { if (botElo > max) return false; };
        case (null) {};
      };
      
      // Check faction
      switch (rules.requiredFaction) {
        case (?faction) {
          let botFaction = getBotFaction(tokenIndex);
          if (botFaction != faction) return false;
        };
        case (null) {};
      };
      
      // Check achievements
      switch (rules.requiredAchievement) {
        case (?achievement) {
          if (not hasAchievement(caller, achievement)) return false;
        };
        case (null) {};
      };
      
      // Check allowed bots
      switch (rules.allowedBots) {
        case (?bots) {
          if (Array.find(bots, func (b: Nat) : Bool { b == tokenIndex }) == null) {
            return false;
          };
        };
        case (null) {};
      };
      
      // Check allowed players
      switch (rules.allowedPlayers) {
        case (?players) {
          if (Array.find(players, func (p: Principal) : Bool { p == caller }) == null) {
            return false;
          };
        };
        case (null) {};
      };
      
      true
    };
  };
};
```

### Private Event Management

```motoko
// Add invitees to private event
public shared(msg) func addEventInvites(
  eventId: Nat,
  principals: [Principal]
) : async Result<(), Text> {
  let event = Map.get(events, nhash, eventId);
  switch (event) {
    case (null) { return #err("Event not found"); };
    case (?evt) {
      // Verify creator
      switch (evt.creator) {
        case (null) { return #err("Cannot modify platform events"); };
        case (?creator) {
          if (creator != msg.caller) {
            return #err("Not event creator");
          };
        };
      };
      
      // Must be private event
      if (evt.visibility != #Private) {
        return #err("Event is not private");
      };
      
      // Add invites
      let currentInvites = switch (evt.invitedParticipants) {
        case (null) { [] };
        case (?inv) { inv };
      };
      
      let updated = {
        evt with
        invitedParticipants = ?Array.append(currentInvites, principals);
      };
      
      Map.set(events, nhash, eventId, updated);
      #ok(())
    };
  };
};

// Remove invitee
public shared(msg) func removeEventInvite(
  eventId: Nat,
  principal: Principal
) : async Result<(), Text> {
  // Similar logic, filter out principal
  // ...
};
```

---

## Frontend Changes

### Event Creation UI

**New "Create Event" Button**
- Prominent in event listings
- Opens event creation wizard

**Creation Wizard Steps:**

1. **Basic Info**
   - Event name
   - Description
   - Visibility (Public/Private/Restricted)

2. **Schedule**
   - Event date/time
   - Registration window
   - Timezone helper

3. **Race Configuration**
   - Choose Automatic or Manual mode
   - Configure parameters or race schedule
   - Preview generated races

4. **Entry & Prizes**
   - Set entry fee per bot
   - Add your prize contribution
   - Max registrations
   - Heat allocation strategy

5. **Restrictions** (if applicable)
   - Add invite list (for private)
   - Set requirements (for restricted)

6. **Review & Pay**
   - Summary of configuration
   - Creation fee: 0.5 ICP
   - Prize contribution: X ICP
   - Confirm and create

### Event Sponsorship UI

**On Any Event Page:**
- "Sponsor This Event" button
- Opens modal:
  - Amount input (minimum 0.1 ICP)
  - Optional message (100 chars)
  - Shows current sponsors
  - Confirm and pay

**Sponsor Recognition:**
- Listed on event page (ranked by amount)
- Shown in race results
- Visible in event history

### Private Event Management

**For Event Creators:**
- "Manage Invites" button
- Add/remove principals
- View who's registered
- Cancel event

**For Invited Users:**
- "Invited Events" section
- Notification of invitation
- Easy registration

---

## Economic Considerations

### Revenue Streams

**Creation Fees:**
- 0.5 ICP per event (non-refundable)
- Spam prevention
- Platform revenue

**Platform Take:**
- User events: 5% rake (vs 2% for platform events)
- Higher rake compensates for lack of platform bonus
- Still profitable for organizers

**Sponsorships:**
- If sponsored event cancels, sponsorships go to platform
- Encourages quality events
- Additional revenue stream

### Cost Analysis

**For Event Creators:**
- Creation fee: 0.5 ICP (cost)
- Prize contribution: 1+ ICP (escrowed, returned if cancelled before deadline)
- Expected return: Prize pool goes to winners, creator gets recognition

**For Participants:**
- Same entry fees as normal events
- Better matchmaking (private/restricted)
- More variety

**For Platform:**
- Creation fees: Revenue
- Higher rake: Revenue
- More events: More activity = more participants = more volume

### Incentives

**Why Create Events?**
- Community building (guilds, factions)
- Custom competition formats
- Testing grounds (try new formats)
- Prestige (host successful events)
- Private competitions with friends

**Why Sponsor?**
- Marketing/visibility
- Support community
- Promote your bots
- Attract participants to your event

---

## Implementation Phases

### Phase 1: Basic User Events (2-3 weeks)
- Add creator field to events
- Implement createUserEvent function
- Add creation fee payment
- Basic validation
- Event listing shows creator
- Simple Automatic mode only

### Phase 2: Sponsorship (1 week)
- Add sponsorship data structure
- Implement sponsorEvent function
- Display sponsors on event pages
- Sponsorship leaderboards

### Phase 3: Private Events (1-2 weeks)
- Add visibility modes
- Implement invite system
- Registration validation
- Event management UI

### Phase 4: Advanced Restrictions (1 week)
- ELO requirements
- Faction restrictions
- Achievement requirements
- Bot/player allowlists

### Phase 5: Polish & Features (1-2 weeks)
- Event templates (quick creation)
- Event cloning (recreate previous)
- Creator dashboard
- Analytics for organizers
- Rating/review system

---

## Edge Cases & Safeguards

### Event Doesn't Fill
- Minimum entries not met
- Event cancelled automatically
- All participants refunded
- Creator's prize contribution refunded
- Sponsors NOT refunded (goes to platform)

### Creator Abandonment
- If creator account is locked/deleted
- Event continues normally
- Cannot be cancelled
- Functions as platform event

### Spam Prevention
- Creation fee (0.5 ICP)
- Max active events per user (3)
- Minimum prize contribution (1 ICP)
- Cooldown between creations (24h)

### Abuse Prevention
- Private events with no invites: Auto-cancel
- Restricted events with impossible requirements: Validation fails
- Excessive event cancellations: Creator reputation penalty
- Suspicious sponsorship patterns: Manual review

### Invalid Configurations
- Invalid race parameters: Creation fails with error
- Dates in the past: Rejected
- Registration window too short: Minimum 12 hours required
- Entry fees too high/low: Must be 0.1-5.0 ICP

---

## Success Metrics

- Number of user-created events per week
- Average registrations per user event vs platform events
- Total sponsorship volume
- Private event adoption rate
- Creator retention (users creating multiple events)
- Event completion rate (not cancelled)
- Participant satisfaction with user events

---

## MCP Tools Integration

### New Tools

```typescript
// Create custom event
racing_create_event({
  name: "Friday Night Showdown",
  description: "Elite racers only!",
  scheduledTime: timestamp,
  entryFee: 50_000_000, // 0.5 ICP
  prizeContribution: 100_000_000, // 1 ICP
  visibility: "Public",
  raceCreationMode: "Automatic",
  // ... other params
})

// Sponsor event
racing_sponsor_event({
  eventId: 42,
  amount: 50_000_000, // 0.5 ICP
  message: "Go Blackhole faction!"
})

// Create private event
racing_create_private_event({
  name: "Guild Championship",
  invitedPlayers: [principal1, principal2, ...],
  // ... other params
})

// Manage invites
racing_add_event_invites({
  eventId: 42,
  principals: [principal1, principal2]
})
```

---

## Summary

### What It Enables

✅ **User-Created Events** - Custom competitions with flexible parameters  
✅ **Event Sponsorship** - Community-funded prize pools  
✅ **Private Events** - Friend tournaments and guild competitions  
✅ **Restricted Events** - Conditional requirements (ELO, faction, achievements)  
✅ **Community Building** - More player engagement and ownership  
✅ **Revenue Streams** - Creation fees, higher rake, sponsorships  

### Implementation Effort

- **Phase 1 (Basic):** 2-3 weeks
- **Phase 2 (Sponsorship):** 1 week  
- **Phase 3 (Private):** 1-2 weeks
- **Phase 4 (Restrictions):** 1 week
- **Phase 5 (Polish):** 1-2 weeks

**Total: 6-9 weeks for full implementation**

### Key Benefits

- **More Content:** Players create events = more racing opportunities
- **Better Matchmaking:** Private/restricted events = fairer competition
- **Community Engagement:** Sponsorship = player investment
- **Revenue:** Creation fees + higher rake + sponsorship penalties
- **Flexibility:** Supports unlimited event formats and use cases
