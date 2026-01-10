import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Map "mo:map/Map";
import { nhash } "mo:map/Map";
import RacingSimulator "./RacingSimulator";

module {
  public type RaceClass = RacingSimulator.RaceClass;
  public type Terrain = RacingSimulator.Terrain;

  // ===== EVENT TYPES =====

  public type EventType = {
    #WeeklyLeague;
    #DailySprint;
    #MonthlyCup;
    #SpecialEvent : Text; // Event theme name
  };

  public type EventStatus = {
    #Announced; // Event scheduled but not open yet
    #RegistrationOpen; // Accepting entries
    #RegistrationClosed; // Full or deadline passed
    #InProgress; // Event running
    #Completed; // Finished
    #Cancelled; // Cancelled
  };

  public type EventMetadata = {
    name : Text;
    description : Text;
    entryFee : Nat; // ICP e8s
    maxEntries : Nat;
    minEntries : Nat; // Minimum to run event
    prizePoolBonus : Nat; // Platform contribution (ICP e8s)
    pointsMultiplier : Float; // For leaderboard
    divisions : [RaceClass]; // Which classes can enter
  };

  // ===== EVENT REGISTRATION TYPES =====

  // Individual player registration for an event
  public type EventRegistration = {
    eventId : Nat;
    tokenIndex : Nat;
    owner : Principal;
    raceClass : RaceClass; // Player's division
    registeredAt : Int;
    entryFeePaid : Nat; // Amount paid at registration
  };

  // Heat allocation strategies for splitting players into races
  public type HeatAllocationStrategy = {
    #SnakeDraft;     // Balanced: 1,4,5,8,9... | 2,3,6,7,10...
    #SkillTiered;    // Group by ELO: Top heat, mid heat, low heat
    #Random;         // Pure random distribution
    #TopBottom;      // Segregate extremes: Heat 1 = highest ELO, Heat 2 = lowest ELO
  };

  // Race template for manual event configuration
  public type RaceTemplate = {
    stageName : ?Text;       // Optional: "Qualifying", "Finals", etc.
    raceClass : RaceClass;   // Which division
    terrain : Terrain;       // Specific terrain
    distance : Nat;          // Exact distance in km
    trackId : ?Nat;          // Optional: Specific track for consistency
    startOffset : Int;       // Nanoseconds after event scheduledTime
  };

  // Race creation modes
  public type RaceCreationMode = {
    // Automatic: System creates races based on registrations
    #Automatic : {
      terrains : [Terrain];  // Pool of terrains to use
      distanceRange : {      // Random distance per race
        min : Nat;
        max : Nat;
      };
      racesPerClass : ?Nat;  // Optional: Force specific number of races
      heatAllocation : HeatAllocationStrategy;
    };
    // Manual: Pre-defined exact race schedule
    #Manual : {
      raceTemplates : [RaceTemplate];
      heatAllocation : HeatAllocationStrategy;
    };
  };

  // Visibility modes for events
  public type EventVisibility = {
    #Public;           // Anyone can register
    #Private;          // Only invited players
    #Restricted : {    // Conditional restrictions
      minElo : ?Nat;
      maxElo : ?Nat;
      requiredFaction : ?Text;
      requiredAchievement : ?Text;
      allowedBots : ?[Nat];
      allowedPlayers : ?[Principal];
    };
  };

  // Sponsorship tracking
  public type Sponsorship = {
    sponsor : Principal;
    sponsorName : ?Text;
    amount : Nat; // ICP e8s
    message : ?Text; // Optional sponsor message
    timestamp : Int;
  };

  // Extended event with registration support
  public type ScheduledEvent = {
    eventId : Nat;
    eventType : EventType;
    scheduledTime : Int; // UTC timestamp when event starts
    registrationOpens : Int;
    registrationCloses : Int;
    status : EventStatus;
    metadata : EventMetadata;
    raceIds : [Nat]; // Associated race IDs
    createdAt : Int;
    
    // EVENT REGISTRATION
    registrations : [EventRegistration]; // Who signed up (hidden until close)
    registrationCounts : {
      total : Nat;
      byClass : [(RaceClass, Nat)];
    };
    maxRegistrationsPerClass : Nat;
    cancellationDeadlines : {
      fullRefund : Int;    // >48h before close
      halfRefund : Int;    // 24-48h before close
      quarterRefund : Int; // <24h before close
    };
    
    // RACE CONFIGURATION
    raceCreationMode : RaceCreationMode;
    
    // USER-CREATED EVENTS (optional fields)
    creator : ?Principal;        // null for platform events
    creatorName : ?Text;
    creationFee : Nat;           // 0 for platform events
    visibility : EventVisibility;
    invitedParticipants : ?[Principal];
    sponsorships : [Sponsorship];
  };

  // ===== SCHEDULE PATTERNS =====

  // Calculate next occurrence of a day/time
  // Sunday = 0, Monday = 1, etc.
  public func getNextWeeklyOccurrence(targetDayOfWeek : Nat, targetHour : Nat, targetMinute : Nat, fromTime : Int) : Int {
    let NANOS_PER_SECOND : Int = 1_000_000_000;
    let SECONDS_PER_DAY : Int = 86400;
    let SECONDS_PER_HOUR : Int = 3600;
    let SECONDS_PER_MINUTE : Int = 60;

    // Convert nanoseconds to seconds since epoch
    let currentSeconds = fromTime / NANOS_PER_SECOND;

    // Current day of week (0 = Thursday Jan 1, 1970, so adjust)
    let daysSinceEpoch = currentSeconds / SECONDS_PER_DAY;
    let currentDayOfWeek = Int.abs((daysSinceEpoch + 4) % 7); // +4 to make Sunday = 0

    // Current time of day
    let secondsToday = Int.abs(currentSeconds % SECONDS_PER_DAY);

    // Calculate target seconds of day
    let targetSecondsOfDay = (targetHour * SECONDS_PER_HOUR) + (targetMinute * SECONDS_PER_MINUTE);

    // Calculate days until target
    var daysUntil : Int = Int.abs(targetDayOfWeek) - currentDayOfWeek;

    // If target day is today but time has passed, or target day is before current day
    if (daysUntil < 0 or (daysUntil == 0 and secondsToday >= targetSecondsOfDay)) {
      daysUntil += 7;
    };

    // Calculate the exact timestamp
    let targetDayStart = currentSeconds - secondsToday + (daysUntil * SECONDS_PER_DAY);
    let targetTime = targetDayStart + targetSecondsOfDay;

    targetTime * NANOS_PER_SECOND;
  };

  // Calculate next 6-hour interval (00:00, 06:00, 12:00, 18:00 UTC)
  public func getNextDailySprintTime(fromTime : Int) : Int {
    let NANOS_PER_SECOND : Int = 1_000_000_000;
    let SECONDS_PER_HOUR : Int = 3600;
    let SPRINT_INTERVAL : Int = 6 * SECONDS_PER_HOUR; // 6 hours

    let currentSeconds = fromTime / NANOS_PER_SECOND;
    let secondsToday = Int.abs(currentSeconds % (24 * SECONDS_PER_HOUR));

    // Find next 6-hour mark
    let currentInterval = secondsToday / SPRINT_INTERVAL;
    let nextInterval = currentInterval + 1;
    let nextIntervalSeconds = nextInterval * SPRINT_INTERVAL;

    let secondsUntilNext = if (nextIntervalSeconds >= 24 * SECONDS_PER_HOUR) {
      // Next day's first sprint
      (24 * SECONDS_PER_HOUR) - secondsToday;
    } else {
      nextIntervalSeconds - secondsToday;
    };

    (currentSeconds + secondsUntilNext) * NANOS_PER_SECOND;
  };

  // Calculate first Saturday of month
  public func getFirstSaturdayOfMonth(year : Nat, month : Nat, hour : Nat, minute : Nat) : Int {
    // This is simplified - in production, use a proper date library
    // For now, we'll estimate based on days since epoch
    let NANOS_PER_SECOND : Int = 1_000_000_000;
    let SECONDS_PER_DAY : Int = 86400;

    // Approximate days since epoch for start of month
    // This is a placeholder - needs proper calendar math
    let daysSinceEpoch = (Nat.sub(year, 1970) * 365) + Nat.sub(month, 1) * 30;
    let firstOfMonthSeconds = daysSinceEpoch * SECONDS_PER_DAY;

    // Find first Saturday (day 6 in our week system where Sunday = 0)
    let firstDayOfWeek = Int.abs((daysSinceEpoch + 4) % 7);
    let daysUntilSaturday = if (firstDayOfWeek <= 6) {
      Nat.sub(6, firstDayOfWeek);
    } else {
      Nat.sub(13, firstDayOfWeek);
    };

    let firstSaturdaySeconds = firstOfMonthSeconds + (daysUntilSaturday * SECONDS_PER_DAY) +
    (hour * 3600) + (minute * 60);

    firstSaturdaySeconds * NANOS_PER_SECOND;
  };

  // ===== EVENT CALENDAR MANAGER =====

  public class EventCalendar(
    initEvents : Map.Map<Nat, ScheduledEvent>
  ) {
    private let events = initEvents;
    private var nextEventId : Nat = Map.size(events);

    // Get events map for stable storage
    public func getEventsMap() : Map.Map<Nat, ScheduledEvent> {
      events;
    };

    // Create a scheduled event
    public func scheduleEvent(
      eventType : EventType,
      scheduledTime : Int,
      registrationOpens : Int,
      registrationCloses : Int,
      metadata : EventMetadata,
      now : Int,
    ) : ScheduledEvent {
      // Always create a new event - duplicate detection was causing race orphaning issues
      // when existing events were reused after being rescheduled
      let eventId = nextEventId;
      nextEventId += 1;

      // Calculate cancellation deadlines
      let fullRefundDeadline = registrationCloses - (48 * 3600 * 1_000_000_000); // 48h before close
      let halfRefundDeadline = registrationCloses - (24 * 3600 * 1_000_000_000); // 24h before close
      let quarterRefundDeadline = registrationCloses - (12 * 3600 * 1_000_000_000); // 12h before close

      // Default race creation mode (Automatic with reasonable defaults)
      let defaultRaceMode : RaceCreationMode = #Automatic({
        terrains = [#ScrapHeaps, #WastelandSand, #MetalRoads];
        distanceRange = { min = 10; max = 30 };
        racesPerClass = null;
        heatAllocation = #SnakeDraft;
      });

      let event : ScheduledEvent = {
        eventId = eventId;
        eventType = eventType;
        scheduledTime = scheduledTime;
        registrationOpens = registrationOpens;
        registrationCloses = registrationCloses;
        status = if (now < registrationOpens) { #Announced } else {
          #RegistrationOpen;
        };
        metadata = metadata;
        raceIds = [];
        createdAt = now;
        
        // EVENT REGISTRATION (defaults for platform events)
        registrations = [];
        registrationCounts = {
          total = 0;
          byClass = [];
        };
        maxRegistrationsPerClass = metadata.maxEntries; // Use metadata maxEntries
        cancellationDeadlines = {
          fullRefund = fullRefundDeadline;
          halfRefund = halfRefundDeadline;
          quarterRefund = quarterRefundDeadline;
        };
        
        // RACE CONFIGURATION
        raceCreationMode = defaultRaceMode;
        
        // USER-CREATED EVENTS (defaults for platform events)
        creator = null; // Platform event
        creatorName = null;
        creationFee = 0;
        visibility = #Public;
        invitedParticipants = null;
        sponsorships = [];
      };

      ignore Map.put(events, nhash, eventId, event);
      event;
    };

    // Get event by ID
    public func getEvent(eventId : Nat) : ?ScheduledEvent {
      Map.get(events, nhash, eventId);
    };

    // Get event by race ID
    public func getEventByRaceId(raceId : Nat) : ?ScheduledEvent {
      for (event in Map.vals(events)) {
        for (rid in event.raceIds.vals()) {
          if (rid == raceId) {
            return ?event;
          };
        };
      };
      null;
    };

    // Get all events
    public func getAllEvents() : [ScheduledEvent] {
      Iter.toArray(Map.vals(events));
    };

    // Get upcoming events (next N days)
    public func getUpcomingEvents(fromTime : Int, daysAhead : Nat) : [ScheduledEvent] {
      let NANOS_PER_DAY : Int = 86400_000_000_000;
      let NANOS_PER_HOUR : Int = 3600_000_000_000;
      let endTime = fromTime + (daysAhead * NANOS_PER_DAY);
      let gracePeriodStart = fromTime - NANOS_PER_HOUR; // Show events from up to 1 hour ago

      let allEvents = getAllEvents();
      let upcoming = Array.filter<ScheduledEvent>(
        allEvents,
        func(e) {
          e.scheduledTime >= gracePeriodStart and e.scheduledTime <= endTime and e.status != #Completed and e.status != #Cancelled
        },
      );

      // Sort by scheduled time
      Array.sort<ScheduledEvent>(
        upcoming,
        func(a, b) { Int.compare(a.scheduledTime, b.scheduledTime) },
      );
    };

    // Get past events (paginated)
    public func getPastEvents(fromTime : Int, offset : Nat, limit : Nat) : [ScheduledEvent] {
      let allEvents = getAllEvents();

      // Filter events that have passed (scheduled time < now) or are completed/cancelled
      var pastEvents = Array.filter<ScheduledEvent>(
        allEvents,
        func(e) {
          e.scheduledTime < fromTime or e.status == #Completed or e.status == #Cancelled;
        },
      );

      // Sort by scheduled time (most recent first)
      pastEvents := Array.sort<ScheduledEvent>(
        pastEvents,
        func(a, b) { Int.compare(b.scheduledTime, a.scheduledTime) },
      );

      // Apply pagination
      let total = pastEvents.size();
      if (offset >= total) {
        return [];
      };

      let endIndex = Nat.min(offset + limit, total);
      Array.tabulate<ScheduledEvent>(
        endIndex - offset,
        func(i) { pastEvents[offset + i] },
      );
    };

    // Get events by type
    public func getEventsByType(eventType : EventType) : [ScheduledEvent] {
      let allEvents = getAllEvents();
      Array.filter<ScheduledEvent>(
        allEvents,
        func(e) {
          switch (eventType, e.eventType) {
            case (#WeeklyLeague, #WeeklyLeague) { true };
            case (#DailySprint, #DailySprint) { true };
            case (#MonthlyCup, #MonthlyCup) { true };
            case (#SpecialEvent(_), #SpecialEvent(_)) { true };
            case (_, _) { false };
          };
        },
      );
    };

    // Get events needing status update
    public func getEventsPendingStatusUpdate(now : Int) : [ScheduledEvent] {
      let allEvents = getAllEvents();
      Array.filter<ScheduledEvent>(
        allEvents,
        func(e) {
          // Check if status needs updating based on time
          switch (e.status) {
            case (#Announced) {
              now >= e.registrationOpens;
            };
            case (#RegistrationOpen) {
              now >= e.registrationCloses;
            };
            case (#RegistrationClosed) {
              now >= e.scheduledTime;
            };
            case (_) { false };
          };
        },
      );
    };

    // Delete event by ID
    public func deleteEvent(eventId : Nat) : Bool {
      switch (Map.remove(events, nhash, eventId)) {
        case (?_) { true };
        case (null) { false };
      };
    };

    // Update event status
    public func updateEventStatus(eventId : Nat, newStatus : EventStatus) : ?ScheduledEvent {
      switch (getEvent(eventId)) {
        case (?event) {
          let updated = {
            event with
            status = newStatus;
          };
          ignore Map.put(events, nhash, eventId, updated);
          ?updated;
        };
        case (null) { null };
      };
    };

    // Add race IDs to event
    public func addRacesToEvent(eventId : Nat, raceIds : [Nat]) : ?ScheduledEvent {
      switch (getEvent(eventId)) {
        case (?event) {
          let updated = {
            event with
            raceIds = Array.append(event.raceIds, raceIds);
          };
          ignore Map.put(events, nhash, eventId, updated);
          ?updated;
        };
        case (null) { null };
      };
    };

    // Atomic: Add races to event ONLY if it has no races yet
    // Returns: Some(updatedEvent) if races were added, None if event already has races or doesn't exist
    public func addRacesToEventIfEmpty(eventId : Nat, raceIds : [Nat]) : ?ScheduledEvent {
      switch (getEvent(eventId)) {
        case (?event) {
          if (event.raceIds.size() > 0) {
            // Event already has races, abort
            null;
          } else {
            // Event has no races, safe to add
            let updated = {
              event with
              raceIds = raceIds; // Use direct assignment since we know it's empty
            };
            ignore Map.put(events, nhash, eventId, updated);
            ?updated;
          };
        };
        case (null) { null };
      };
    };

    // Clear race IDs from an event
    public func clearEventRaces(eventId : Nat) : ?ScheduledEvent {
      switch (getEvent(eventId)) {
        case (?event) {
          let updated = {
            event with
            raceIds = [];
          };
          ignore Map.put(events, nhash, eventId, updated);
          ?updated;
        };
        case (null) { null };
      };
    };

    // Create Weekly League event
    public func createWeeklyLeagueEvent(scheduledTime : Int, now : Int) : ScheduledEvent {
      let metadata : EventMetadata = {
        name = "Weekly League Championship";
        description = "The wasteland's premier weekly competition where survivors from all classes gather to prove their worth. All divisions welcome - platform subsidies ensure even the underdog can walk away with profit.";
        entryFee = 80_000_000; // 0.8 ICP base (Junker)
        maxEntries = 50; // Multiple heats if needed
        minEntries = 4;
        prizePoolBonus = 200_000_000; // Platform adds 2 ICP
        pointsMultiplier = 2.0; // Double points
        divisions = [#Scrap, #Junker, #Raider, #Elite, #SilentKlan]; // All divisions
      };

      scheduleEvent(
        #WeeklyLeague,
        scheduledTime,
        scheduledTime - (48 * 3600 * 1_000_000_000), // Opens Friday (48h before)
        scheduledTime - (60 * 60 * 1_000_000_000), // Closes 1 hour before
        metadata,
        now,
      );
    };

    // Create Daily Sprint event
    public func createDailySprintEvent(scheduledTime : Int, now : Int) : ScheduledEvent {
      let metadata : EventMetadata = {
        name = "Daily Sprint Challenge";
        description = "Fast-paced wasteland action for racers of all skill levels. These daily scrambles keep the circuits hot and the prize pools flowing.";
        entryFee = 20_000_000; // 0.2 ICP base (Junker)
        maxEntries = 12;
        minEntries = 2;
        prizePoolBonus = 50_000_000; // Platform adds 0.5 ICP (Junker base)
        pointsMultiplier = 1.0; // Standard points
        divisions = [#Scrap, #Junker, #Raider, #Elite, #SilentKlan]; // All tiers
      };

      scheduleEvent(
        #DailySprint,
        scheduledTime,
        now, // Opens immediately
        scheduledTime - (60 * 60 * 1_000_000_000), // Closes 1 hour before
        metadata,
        now,
      );
    };

    // Create Monthly Cup event
    public func createMonthlyCupEvent(scheduledTime : Int, now : Int) : ScheduledEvent {
      let metadata : EventMetadata = {
        name = "Monthly Championship Cup";
        description = "The wasteland's most prestigious tournament - only the strongest survive. Elite and Silent Klan racers compete for glory and massive prize pools in this monthly showdown.";
        entryFee = 200_000_000; // 2.0 ICP base (Elite)
        maxEntries = 64; // Top 64 qualify
        minEntries = 16; // At least 16 for bracket
        prizePoolBonus = 500_000_000; // Platform adds 5 ICP
        pointsMultiplier = 3.0; // Triple points
        divisions = [#Elite, #SilentKlan]; // Top tier only
      };

      scheduleEvent(
        #MonthlyCup,
        scheduledTime,
        scheduledTime - (7 * 86400 * 1_000_000_000), // Opens 1 week before
        scheduledTime - (24 * 3600 * 1_000_000_000), // Closes 24h before
        metadata,
        now,
      );
    };

    // Create Special Event
    public func createSpecialEvent(
      theme : Text,
      scheduledTime : Int,
      customMetadata : EventMetadata,
      now : Int,
    ) : ScheduledEvent {
      scheduleEvent(
        #SpecialEvent(theme),
        scheduledTime,
        scheduledTime - (72 * 3600 * 1_000_000_000), // Opens 72h before (advance notice)
        scheduledTime - (1 * 3600 * 1_000_000_000), // Closes 1h before
        customMetadata,
        now,
      );
    };
  };
};
