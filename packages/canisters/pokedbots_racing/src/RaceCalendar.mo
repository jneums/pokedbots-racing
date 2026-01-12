import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Buffer "mo:base/Buffer";
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

  // Scoring modes for multi-stage events
  public type ScoringMode = {
    #Individual; // Default: Each race scored independently
    #TeamAggregate; // Faction Wars: Sum points per faction, winning faction gets bonus
    #Cumulative; // Distance Challenge: Sum points across stages for each bot
    #Elimination; // Future: Bottom N eliminated each stage
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
    scoringMode : ScoringMode; // How to aggregate results
    eventBonusPrize : Nat; // Additional prize for event winners (ICP e8s)
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
    #SnakeDraft; // Balanced: 1,4,5,8,9... | 2,3,6,7,10...
    #SkillTiered; // Group by ELO: Top heat, mid heat, low heat
    #Random; // Pure random distribution
    #TopBottom; // Segregate extremes: Heat 1 = highest ELO, Heat 2 = lowest ELO
  };

  // Race template for manual event configuration
  public type RaceTemplate = {
    stageName : ?Text; // Optional: "Qualifying", "Finals", etc.
    raceClass : RaceClass; // Which division
    terrain : Terrain; // Specific terrain
    distance : Nat; // Exact distance in km
    trackId : ?Nat; // Optional: Specific track for consistency
    startOffset : Int; // Nanoseconds after event scheduledTime
  };

  // Race creation modes
  public type RaceCreationMode = {
    // Automatic: System creates races based on registrations
    #Automatic : {
      terrains : [Terrain]; // Pool of terrains to use
      distanceRange : {
        // Random distance per race
        min : Nat;
        max : Nat;
      };
      racesPerClass : ?Nat; // Optional: Force specific number of races
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
    #Public; // Anyone can register
    #Private; // Only invited players
    #Restricted : {
      // Conditional restrictions
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
      fullRefund : Int; // >48h before close
      halfRefund : Int; // 24-48h before close
      quarterRefund : Int; // <24h before close
    };

    // RACE CONFIGURATION
    raceCreationMode : RaceCreationMode;

    // USER-CREATED EVENTS (optional fields)
    creator : ?Principal; // null for platform events
    creatorName : ?Text;
    creationFee : Nat; // 0 for platform events
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

  // Calculate next occurrence of specific week of month
  // weekOfMonth: 1 = first, 2 = second, 3 = third, -1 = last
  public func getNextMonthlyOccurrence(
    targetDayOfWeek : Nat, // 0=Sunday, 1=Monday, etc.
    weekOfMonth : Int, // 1=first, 2=second, 3=third, -1=last
    targetHour : Nat,
    targetMinute : Nat,
    fromTime : Int,
  ) : Int {
    let NANOS_PER_SECOND : Int = 1_000_000_000;
    let SECONDS_PER_DAY : Int = 86400;
    let SECONDS_PER_HOUR : Int = 3600;

    let currentSeconds = fromTime / NANOS_PER_SECOND;

    // Simplified monthly calculation - finds next occurrence of target day
    // For first/second/third week, we scan forward from fromTime
    // For last week (-1), we find last occurrence in month

    var searchTime = currentSeconds;
    let maxSearchDays = 60; // Search up to 2 months ahead

    for (i in Iter.range(1, maxSearchDays)) {
      searchTime += SECONDS_PER_DAY;

      let dayOfWeek = Int.abs(((searchTime / SECONDS_PER_DAY) + 4) % 7);

      if (dayOfWeek == targetDayOfWeek) {
        // Found a matching day of week - check if it's the right week of month
        let dayOfMonth = Int.abs(((searchTime / SECONDS_PER_DAY) % 30) + 1); // Simplified

        let isCorrectWeek = if (weekOfMonth == 1) {
          dayOfMonth >= 1 and dayOfMonth <= 7;
        } else if (weekOfMonth == 2) {
          dayOfMonth >= 8 and dayOfMonth <= 14;
        } else if (weekOfMonth == 3) {
          dayOfMonth >= 15 and dayOfMonth <= 21;
        } else if (weekOfMonth == -1) {
          dayOfMonth >= 22 and dayOfMonth <= 31; // Last week
        } else {
          false;
        };

        if (isCorrectWeek) {
          // Found it! Set to target time
          let secondsIntoDay = Int.abs(searchTime % SECONDS_PER_DAY);
          let targetSeconds = searchTime - secondsIntoDay + (targetHour * SECONDS_PER_HOUR) + (targetMinute * 60);
          return targetSeconds * NANOS_PER_SECOND;
        };
      };
    };

    // Fallback: just return something reasonable
    (currentSeconds + (30 * SECONDS_PER_DAY)) * NANOS_PER_SECOND;
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
      raceCreationMode : RaceCreationMode,
      cancellationDeadlines : {
        fullRefund : Int;
        halfRefund : Int;
        quarterRefund : Int;
      },
      now : Int,
    ) : ScheduledEvent {
      // Always create a new event - duplicate detection was causing race orphaning issues
      // when existing events were reused after being rescheduled
      let eventId = nextEventId;
      nextEventId += 1;

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
        cancellationDeadlines = cancellationDeadlines;

        // RACE CONFIGURATION
        raceCreationMode = raceCreationMode;

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

    // Create a scheduled event with custom visibility/restrictions
    public func scheduleRestrictedEvent(
      eventType : EventType,
      scheduledTime : Int,
      registrationOpens : Int,
      registrationCloses : Int,
      metadata : EventMetadata,
      raceCreationMode : RaceCreationMode,
      cancellationDeadlines : {
        fullRefund : Int;
        halfRefund : Int;
        quarterRefund : Int;
      },
      visibility : EventVisibility,
      now : Int,
    ) : ScheduledEvent {
      let eventId = nextEventId;
      nextEventId += 1;

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
        registrations = [];
        registrationCounts = {
          total = 0;
          byClass = [];
        };
        maxRegistrationsPerClass = metadata.maxEntries;
        cancellationDeadlines = cancellationDeadlines;
        raceCreationMode = raceCreationMode;
        creator = null;
        creatorName = null;
        creationFee = 0;
        visibility = visibility;
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

    // Update heat allocation strategy for an event
    public func updateEventHeatAllocation(eventId : Nat, newStrategy : HeatAllocationStrategy) : ?ScheduledEvent {
      switch (getEvent(eventId)) {
        case (?event) {
          let updatedMode = switch (event.raceCreationMode) {
            case (#Automatic(config)) {
              #Automatic({
                config with
                heatAllocation = newStrategy;
              });
            };
            case (#Manual(config)) {
              #Manual({
                config with
                heatAllocation = newStrategy;
              });
            };
          };
          let updated = {
            event with
            raceCreationMode = updatedMode;
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
        description = "The wasteland's premier weekly competition where seasoned survivors gather to prove their worth. Junker and above divisions welcome - platform subsidies ensure competitive prize pools.";
        entryFee = 80_000_000; // 0.8 ICP base (Junker)
        maxEntries = 50; // Multiple heats if needed
        minEntries = 4;
        prizePoolBonus = 200_000_000; // Platform adds 2 ICP
        pointsMultiplier = 2.0; // Double points
        divisions = [#Junker, #Raider, #Elite, #SilentKlan]; // No Scrap - longer races
        scoringMode = #Individual;
        eventBonusPrize = 0;
      };

      let raceMode : RaceCreationMode = #Automatic({
        terrains = [#ScrapHeaps, #WastelandSand, #MetalRoads];
        distanceRange = { min = 9; max = 17 };
        racesPerClass = null;
        heatAllocation = #SnakeDraft;
      });

      let regOpens = scheduledTime - (48 * 3600 * 1_000_000_000); // Friday
      let regCloses = scheduledTime - (30 * 60 * 1_000_000_000); // 30min before

      scheduleEvent(
        #WeeklyLeague,
        scheduledTime,
        regOpens,
        regCloses,
        metadata,
        raceMode,
        {
          fullRefund = regOpens + (2 * 3600 * 1_000_000_000); // Friday + 2h
          halfRefund = scheduledTime - (24 * 3600 * 1_000_000_000); // Saturday 8pm
          quarterRefund = scheduledTime - (12 * 3600 * 1_000_000_000); // Sunday 8am
        },
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
        scoringMode = #Individual;
        eventBonusPrize = 0;
      };

      let raceMode : RaceCreationMode = #Automatic({
        terrains = [#ScrapHeaps, #WastelandSand, #MetalRoads];
        distanceRange = { min = 5; max = 10 };
        racesPerClass = null;
        heatAllocation = #TopBottom; // Separate high ELO vs low ELO heats
      });

      let regCloses = scheduledTime - (15 * 60 * 1_000_000_000); // 15min before

      scheduleEvent(
        #DailySprint,
        scheduledTime,
        now, // Opens immediately
        regCloses,
        metadata,
        raceMode,
        {
          fullRefund = scheduledTime - (2 * 3600 * 1_000_000_000); // 2h before
          halfRefund = scheduledTime - (1 * 3600 * 1_000_000_000); // 1h before
          quarterRefund = scheduledTime - (30 * 60 * 1_000_000_000); // 30min before
        },
        now,
      );
    };

    // Create Monthly Cup event
    public func createMonthlyCupEvent(scheduledTime : Int, now : Int) : ScheduledEvent {
      let metadata : EventMetadata = {
        name = "Monthly Championship Cup";
        description = "The wasteland's most prestigious tournament - only the strongest survive. Raider class and above compete for glory and massive prize pools in this monthly showdown.";
        entryFee = 200_000_000; // 2.0 ICP base (Elite)
        maxEntries = 64; // Top 64 qualify
        minEntries = 8; // At least 8 for bracket
        prizePoolBonus = 500_000_000; // Platform adds 5 ICP
        pointsMultiplier = 3.0; // Triple points
        divisions = [#Raider, #Elite, #SilentKlan]; // Top tiers only - long elite races
        scoringMode = #Individual;
        eventBonusPrize = 0;
      };

      let raceMode : RaceCreationMode = #Automatic({
        terrains = [#MetalRoads, #WastelandSand];
        distanceRange = { min = 13; max = 17 };
        racesPerClass = null;
        heatAllocation = #SkillTiered;
      });

      let regOpens = scheduledTime - (7 * 86400 * 1_000_000_000); // 1 week before
      let regCloses = scheduledTime - (24 * 3600 * 1_000_000_000); // 24h before

      scheduleEvent(
        #MonthlyCup,
        scheduledTime,
        regOpens,
        regCloses,
        metadata,
        raceMode,
        {
          fullRefund = regOpens + (72 * 3600 * 1_000_000_000); // 3 days after opens
          halfRefund = scheduledTime - (48 * 3600 * 1_000_000_000); // 2 days before
          quarterRefund = regCloses; // At close
        },
        now,
      );
    };

    // Create Special Event (generic)
    public func createSpecialEvent(
      theme : Text,
      scheduledTime : Int,
      customMetadata : EventMetadata,
      customRaceMode : RaceCreationMode,
      now : Int,
    ) : ScheduledEvent {
      let regOpens = scheduledTime - (72 * 3600 * 1_000_000_000); // Opens 72h before
      let regCloses = scheduledTime - (1 * 3600 * 1_000_000_000); // Closes 1h before

      scheduleEvent(
        #SpecialEvent(theme),
        scheduledTime,
        regOpens,
        regCloses,
        customMetadata,
        customRaceMode,
        {
          fullRefund = regOpens + (24 * 3600 * 1_000_000_000); // 1 day after opens
          halfRefund = scheduledTime - (12 * 3600 * 1_000_000_000); // 12h before
          quarterRefund = regCloses; // At close
        },
        now,
      );
    };

    // ===== SPECIALIZED EVENT CREATORS =====

    // Weekend Warrior Tournament (Friday-Sunday progressive)
    public func createWeekendWarriorEvent(scheduledTime : Int, now : Int) : ScheduledEvent {
      // Weekend Warrior is a 3-day multi-stage event:
      // - Friday 8pm: Sprint (15km on Metal Roads)
      // - Saturday 8pm: Endurance (30km on Wasteland Sand)
      // - Sunday 8pm: Championship (25km on Scrap Heaps)
      // Each stage has separate races per class
      let metadata : EventMetadata = {
        name = "Weekend Warrior Tournament";
        description = "Friday to Sunday progression. Survive all three stages for glory!";
        entryFee = 100_000_000; // 1.0 ICP
        maxEntries = 100;
        minEntries = 8;
        prizePoolBonus = 300_000_000; // 3 ICP bonus
        pointsMultiplier = 2.5;
        divisions = [#Scrap, #Junker, #Raider, #Elite];
        scoringMode = #Individual;
        eventBonusPrize = 0;
      };

      // Manual mode with 3 stages × 4 classes = 12 race templates
      let raceMode : RaceCreationMode = #Manual({
        raceTemplates = [
          // === FRIDAY SPRINT (Day 1) ===
          {
            stageName = ?"Friday Sprint";
            raceClass = #Scrap;
            terrain = #MetalRoads;
            distance = 15_000;
            trackId = null;
            startOffset = 0;
          },
          {
            stageName = ?"Friday Sprint";
            raceClass = #Junker;
            terrain = #MetalRoads;
            distance = 15_000;
            trackId = null;
            startOffset = 0;
          },
          {
            stageName = ?"Friday Sprint";
            raceClass = #Raider;
            terrain = #MetalRoads;
            distance = 15_000;
            trackId = null;
            startOffset = 0;
          },
          {
            stageName = ?"Friday Sprint";
            raceClass = #Elite;
            terrain = #MetalRoads;
            distance = 15_000;
            trackId = null;
            startOffset = 0;
          },
          // === SATURDAY ENDURANCE (Day 2: +24h) ===
          {
            stageName = ?"Saturday Endurance";
            raceClass = #Scrap;
            terrain = #WastelandSand;
            distance = 30_000;
            trackId = null;
            startOffset = 86_400_000_000_000;
          },
          {
            stageName = ?"Saturday Endurance";
            raceClass = #Junker;
            terrain = #WastelandSand;
            distance = 30_000;
            trackId = null;
            startOffset = 86_400_000_000_000;
          },
          {
            stageName = ?"Saturday Endurance";
            raceClass = #Raider;
            terrain = #WastelandSand;
            distance = 30_000;
            trackId = null;
            startOffset = 86_400_000_000_000;
          },
          {
            stageName = ?"Saturday Endurance";
            raceClass = #Elite;
            terrain = #WastelandSand;
            distance = 30_000;
            trackId = null;
            startOffset = 86_400_000_000_000;
          },
          // === SUNDAY CHAMPIONSHIP (Day 3: +48h) ===
          {
            stageName = ?"Sunday Championship";
            raceClass = #Scrap;
            terrain = #ScrapHeaps;
            distance = 25_000;
            trackId = null;
            startOffset = 172_800_000_000_000;
          },
          {
            stageName = ?"Sunday Championship";
            raceClass = #Junker;
            terrain = #ScrapHeaps;
            distance = 25_000;
            trackId = null;
            startOffset = 172_800_000_000_000;
          },
          {
            stageName = ?"Sunday Championship";
            raceClass = #Raider;
            terrain = #ScrapHeaps;
            distance = 25_000;
            trackId = null;
            startOffset = 172_800_000_000_000;
          },
          {
            stageName = ?"Sunday Championship";
            raceClass = #Elite;
            terrain = #ScrapHeaps;
            distance = 25_000;
            trackId = null;
            startOffset = 172_800_000_000_000;
          },
        ];
        heatAllocation = #SnakeDraft;
      });

      let regOpens = scheduledTime - (48 * 3600 * 1_000_000_000); // Opens Wednesday
      let regCloses = scheduledTime - (2 * 3600 * 1_000_000_000); // Closes 2h before Friday race

      scheduleEvent(
        #SpecialEvent("Weekend Warrior"),
        scheduledTime,
        regOpens,
        regCloses,
        metadata,
        raceMode,
        {
          fullRefund = regOpens + (24 * 3600 * 1_000_000_000); // Thursday noon
          halfRefund = scheduledTime - (24 * 3600 * 1_000_000_000); // Thursday 8pm
          quarterRefund = regCloses; // At close
        },
        now,
      );
    };

    // Terrain Master Series (Sand/Metal/Scrap specialists)
    public func createTerrainMasterEvent(terrain : Text, scheduledTime : Int, now : Int) : ScheduledEvent {
      let metadata : EventMetadata = {
        name = terrain # " Master Championship";
        description = "Only the best " # terrain # " racers survive. All races on specialized terrain.";
        entryFee = 60_000_000; // 0.6 ICP
        maxEntries = 40;
        minEntries = 8;
        prizePoolBonus = 150_000_000; // 1.5 ICP bonus
        pointsMultiplier = 1.5;
        divisions = [#Scrap, #Junker, #Raider, #Elite];
        scoringMode = #Individual;
        eventBonusPrize = 0;
      };

      // Determine terrain enum from text
      let terrainType : Terrain = if (terrain == "ScrapHeaps") {
        #ScrapHeaps;
      } else if (terrain == "WastelandSand") { #WastelandSand } else {
        #MetalRoads;
      };

      let raceMode : RaceCreationMode = #Automatic({
        terrains = [terrainType]; // Single terrain specialization
        distanceRange = { min = 9; max = 17 };
        racesPerClass = null;
        heatAllocation = #SkillTiered;
      });

      let regOpens = scheduledTime - (48 * 3600 * 1_000_000_000); // Opens Thursday
      let regCloses = scheduledTime - (1 * 3600 * 1_000_000_000); // Closes 1h before

      scheduleEvent(
        #SpecialEvent(terrain # " Master"),
        scheduledTime,
        regOpens,
        regCloses,
        metadata,
        raceMode,
        {
          fullRefund = regOpens + (24 * 3600 * 1_000_000_000); // Friday 2pm
          halfRefund = scheduledTime - (12 * 3600 * 1_000_000_000); // Saturday 2am
          quarterRefund = regCloses; // At close
        },
        now,
      );
    };

    // Elite Showcase (high-skill exhibition)
    public func createEliteShowcaseEvent(scheduledTime : Int, now : Int) : ScheduledEvent {
      let metadata : EventMetadata = {
        name = "Elite Racing Showcase";
        description = "Watch the best racers compete. Top ELO players only (1500+ ELO required).";
        entryFee = 150_000_000; // 1.5 ICP
        maxEntries = 24;
        minEntries = 8;
        prizePoolBonus = 400_000_000; // 4 ICP bonus
        pointsMultiplier = 2.0;
        divisions = [#Elite, #SilentKlan];
        scoringMode = #Individual;
        eventBonusPrize = 0;
      };

      let raceMode : RaceCreationMode = #Automatic({
        terrains = [#MetalRoads]; // High-speed showcase
        distanceRange = { min = 9; max = 17 };
        racesPerClass = null;
        heatAllocation = #SkillTiered;
      });

      let regOpens = scheduledTime - (48 * 3600 * 1_000_000_000); // Opens Friday
      let regCloses = scheduledTime - (1 * 3600 * 1_000_000_000); // Closes 1h before

      // Elite Showcase requires 1500+ ELO to enter
      let visibility : EventVisibility = #Restricted({
        minElo = ?1500;
        maxElo = null;
        requiredFaction = null;
        requiredAchievement = null;
        allowedBots = null;
        allowedPlayers = null;
      });

      scheduleRestrictedEvent(
        #SpecialEvent("Elite Showcase"),
        scheduledTime,
        regOpens,
        regCloses,
        metadata,
        raceMode,
        {
          fullRefund = regOpens + (24 * 3600 * 1_000_000_000); // Saturday 6pm
          halfRefund = scheduledTime - (12 * 3600 * 1_000_000_000); // Sunday 6am
          quarterRefund = regCloses; // At close
        },
        visibility,
        now,
      );
    };

    // Beginner Bootcamp (welcoming for new racers)
    public func createBeginnerBootcampEvent(scheduledTime : Int, now : Int) : ScheduledEvent {
      let metadata : EventMetadata = {
        name = "Wasteland Beginner Bootcamp";
        description = "New to racing? Start here! Low stakes, fair competition.";
        entryFee = 10_000_000; // 0.1 ICP
        maxEntries = 50;
        minEntries = 4;
        prizePoolBonus = 100_000_000; // 1 ICP bonus (very generous)
        pointsMultiplier = 1.0;
        divisions = [#Scrap, #Junker];
        scoringMode = #Individual;
        eventBonusPrize = 0;
      };

      let raceMode : RaceCreationMode = #Automatic({
        terrains = [#ScrapHeaps]; // Easiest terrain for beginners
        distanceRange = { min = 5; max = 10 };
        racesPerClass = null;
        heatAllocation = #TopBottom; // Separate skill levels
      });

      let regOpens = scheduledTime - (48 * 3600 * 1_000_000_000); // Opens Thursday
      let regCloses = scheduledTime - (1 * 3600 * 1_000_000_000); // Closes 1h before

      scheduleEvent(
        #SpecialEvent("Beginner Bootcamp"),
        scheduledTime,
        regOpens,
        regCloses,
        metadata,
        raceMode,
        {
          fullRefund = regOpens + (24 * 3600 * 1_000_000_000); // Friday 10am
          halfRefund = scheduledTime - (12 * 3600 * 1_000_000_000); // Friday 10pm
          quarterRefund = regCloses; // At close
        },
        now,
      );
    };

    // Faction Wars (faction vs faction competition)
    public func createFactionWarsEvent(scheduledTime : Int, now : Int) : ScheduledEvent {
      let metadata : EventMetadata = {
        name = "Faction Wars: Battle for Supremacy";
        description = "Three-stage faction battle! Compete on Scrap, Sand, and Metal. Aggregate scores determine the winning faction. Members of the winning faction split a bonus prize pool.";
        entryFee = 50_000_000; // 0.5 ICP
        maxEntries = 60;
        minEntries = 10;
        prizePoolBonus = 200_000_000; // 2 ICP bonus
        pointsMultiplier = 1.5;
        divisions = [#Junker, #Raider, #Elite];
        scoringMode = #TeamAggregate; // Aggregate points by faction!
        eventBonusPrize = 200_000_000; // 2 ICP split among winning faction members
      };

      // Multi-stage configuration: 3 stages across different terrains
      // Each division races in all 3 stages, points aggregate to faction totals
      let raceMode : RaceCreationMode = #Manual({
        raceTemplates = [
          // Stage 1: Scrap Heaps Battle (all divisions)
          {
            stageName = ?"Stage 1: Scrap Heaps";
            raceClass = #Junker;
            terrain = #ScrapHeaps;
            distance = 12;
            trackId = null;
            startOffset = 0;
          },
          {
            stageName = ?"Stage 1: Scrap Heaps";
            raceClass = #Raider;
            terrain = #ScrapHeaps;
            distance = 12;
            trackId = null;
            startOffset = 0;
          },
          {
            stageName = ?"Stage 1: Scrap Heaps";
            raceClass = #Elite;
            terrain = #ScrapHeaps;
            distance = 12;
            trackId = null;
            startOffset = 0;
          },
          // Stage 2: Wasteland Sand (30 min after stage 1)
          {
            stageName = ?"Stage 2: Desert Storm";
            raceClass = #Junker;
            terrain = #WastelandSand;
            distance = 15;
            trackId = null;
            startOffset = 30 * 60 * 1_000_000_000;
          },
          {
            stageName = ?"Stage 2: Desert Storm";
            raceClass = #Raider;
            terrain = #WastelandSand;
            distance = 15;
            trackId = null;
            startOffset = 30 * 60 * 1_000_000_000;
          },
          {
            stageName = ?"Stage 2: Desert Storm";
            raceClass = #Elite;
            terrain = #WastelandSand;
            distance = 15;
            trackId = null;
            startOffset = 30 * 60 * 1_000_000_000;
          },
          // Stage 3: Metal Roads Finals (60 min after stage 1)
          {
            stageName = ?"Stage 3: Metal Road Finals";
            raceClass = #Junker;
            terrain = #MetalRoads;
            distance = 10;
            trackId = null;
            startOffset = 60 * 60 * 1_000_000_000;
          },
          {
            stageName = ?"Stage 3: Metal Road Finals";
            raceClass = #Raider;
            terrain = #MetalRoads;
            distance = 10;
            trackId = null;
            startOffset = 60 * 60 * 1_000_000_000;
          },
          {
            stageName = ?"Stage 3: Metal Road Finals";
            raceClass = #Elite;
            terrain = #MetalRoads;
            distance = 10;
            trackId = null;
            startOffset = 60 * 60 * 1_000_000_000;
          },
        ];
        heatAllocation = #Random; // Mixed faction matchups
      });

      let regOpens = scheduledTime - (72 * 3600 * 1_000_000_000); // Opens Thursday
      let regCloses = scheduledTime - (1 * 3600 * 1_000_000_000); // Closes 1h before

      scheduleEvent(
        #SpecialEvent("Faction Wars"),
        scheduledTime,
        regOpens,
        regCloses,
        metadata,
        raceMode,
        {
          fullRefund = regOpens + (24 * 3600 * 1_000_000_000); // Friday 4pm
          halfRefund = scheduledTime - (24 * 3600 * 1_000_000_000); // Saturday 4pm
          quarterRefund = regCloses; // At close
        },
        now,
      );
    };

    // Distance Challenge (progressive distance series)
    public func createDistanceChallengeEvent(scheduledTime : Int, now : Int) : ScheduledEvent {
      let metadata : EventMetadata = {
        name = "Ultimate Distance Challenge";
        description = "Three races, increasing distances. Can you survive them all?";
        entryFee = 80_000_000; // 0.8 ICP
        maxEntries = 40;
        minEntries = 8;
        prizePoolBonus = 250_000_000; // 2.5 ICP bonus
        pointsMultiplier = 2.0;
        divisions = [#Raider, #Elite];
        scoringMode = #Cumulative; // Sum points across all stages
        eventBonusPrize = 100_000_000; // 1 ICP bonus for cumulative winner
      };

      // Multi-stage progressive distance configuration: 7km -> 17km -> 29km
      let raceMode : RaceCreationMode = #Manual({
        raceTemplates = [
          // Stage 1: Sprint (7km on Metal Roads - fastest terrain)
          {
            stageName = ?"Stage 1: Sprint";
            raceClass = #Raider;
            terrain = #MetalRoads;
            distance = 7;
            trackId = null;
            startOffset = 0;
          },
          {
            stageName = ?"Stage 1: Sprint";
            raceClass = #Elite;
            terrain = #MetalRoads;
            distance = 7;
            trackId = null;
            startOffset = 0;
          },
          // Stage 2: Endurance (17km on Wasteland Sand - 90 min after stage 1)
          {
            stageName = ?"Stage 2: Endurance";
            raceClass = #Raider;
            terrain = #WastelandSand;
            distance = 17;
            trackId = null;
            startOffset = 90 * 60 * 1_000_000_000; // +90 minutes
          },
          {
            stageName = ?"Stage 2: Endurance";
            raceClass = #Elite;
            terrain = #WastelandSand;
            distance = 17;
            trackId = null;
            startOffset = 90 * 60 * 1_000_000_000; // +90 minutes
          },
          // Stage 3: Ultra Marathon (29km on Mixed Terrain - 3 hours after stage 1, the ultimate test)
          {
            stageName = ?"Stage 3: Ultra Marathon";
            raceClass = #Raider;
            terrain = #MetalRoads;
            distance = 29;
            trackId = null;
            startOffset = 3 * 3600 * 1_000_000_000; // +3 hours
          },
          {
            stageName = ?"Stage 3: Ultra Marathon";
            raceClass = #Elite;
            terrain = #MetalRoads;
            distance = 29;
            trackId = null;
            startOffset = 3 * 3600 * 1_000_000_000; // +3 hours
          },
        ];
        heatAllocation = #SnakeDraft;
      });

      let regOpens = scheduledTime - (48 * 3600 * 1_000_000_000); // Opens Thursday
      let regCloses = scheduledTime - (1 * 3600 * 1_000_000_000); // Closes 1h before

      scheduleEvent(
        #SpecialEvent("Distance Challenge"),
        scheduledTime,
        regOpens,
        regCloses,
        metadata,
        raceMode,
        {
          fullRefund = regOpens + (24 * 3600 * 1_000_000_000); // Friday noon
          halfRefund = scheduledTime - (24 * 3600 * 1_000_000_000); // Friday noon
          quarterRefund = regCloses; // At close
        },
        now,
      );
    };

    // Rush Hour Rumble (quick-fire evening series)
    public func createRushHourEvent(scheduledTime : Int, now : Int) : ScheduledEvent {
      let metadata : EventMetadata = {
        name = "Friday Rush Hour Rumble";
        description = "5 quick races in 2 hours. Maximum chaos!";
        entryFee = 30_000_000; // 0.3 ICP
        maxEntries = 50;
        minEntries = 8;
        prizePoolBonus = 100_000_000; // 1 ICP bonus
        pointsMultiplier = 1.2;
        divisions = [#Junker, #Raider, #Elite];
        scoringMode = #Cumulative; // Sum points across all 5 races
        eventBonusPrize = 50_000_000; // 0.5 ICP bonus for cumulative winner
      };

      // Multi-stage configuration: 5 races in 90 minutes for each division
      let raceMode : RaceCreationMode = #Manual({
        raceTemplates = [
          // Junker Division - 5 races
          {
            stageName = ?"Race 1";
            raceClass = #Junker;
            terrain = #MetalRoads;
            distance = 8;
            trackId = null;
            startOffset = 0;
          },
          {
            stageName = ?"Race 2";
            raceClass = #Junker;
            terrain = #ScrapHeaps;
            distance = 6;
            trackId = null;
            startOffset = 1_200_000_000_000;
          }, // +20min
          {
            stageName = ?"Race 3";
            raceClass = #Junker;
            terrain = #WastelandSand;
            distance = 10;
            trackId = null;
            startOffset = 2_400_000_000_000;
          }, // +40min
          {
            stageName = ?"Race 4";
            raceClass = #Junker;
            terrain = #MetalRoads;
            distance = 12;
            trackId = null;
            startOffset = 3_600_000_000_000;
          }, // +60min
          {
            stageName = ?"Race 5 Finals";
            raceClass = #Junker;
            terrain = #ScrapHeaps;
            distance = 15;
            trackId = null;
            startOffset = 5_400_000_000_000;
          }, // +90min

          // Raider Division - 5 races
          {
            stageName = ?"Race 1";
            raceClass = #Raider;
            terrain = #MetalRoads;
            distance = 10;
            trackId = null;
            startOffset = 0;
          },
          {
            stageName = ?"Race 2";
            raceClass = #Raider;
            terrain = #ScrapHeaps;
            distance = 8;
            trackId = null;
            startOffset = 1_200_000_000_000;
          }, // +20min
          {
            stageName = ?"Race 3";
            raceClass = #Raider;
            terrain = #WastelandSand;
            distance = 12;
            trackId = null;
            startOffset = 2_400_000_000_000;
          }, // +40min
          {
            stageName = ?"Race 4";
            raceClass = #Raider;
            terrain = #MetalRoads;
            distance = 15;
            trackId = null;
            startOffset = 3_600_000_000_000;
          }, // +60min
          {
            stageName = ?"Race 5 Finals";
            raceClass = #Raider;
            terrain = #ScrapHeaps;
            distance = 20;
            trackId = null;
            startOffset = 5_400_000_000_000;
          }, // +90min

          // Elite Division - 5 races
          {
            stageName = ?"Race 1";
            raceClass = #Elite;
            terrain = #MetalRoads;
            distance = 10;
            trackId = null;
            startOffset = 0;
          },
          {
            stageName = ?"Race 2";
            raceClass = #Elite;
            terrain = #ScrapHeaps;
            distance = 8;
            trackId = null;
            startOffset = 1_200_000_000_000;
          }, // +20min
          {
            stageName = ?"Race 3";
            raceClass = #Elite;
            terrain = #WastelandSand;
            distance = 12;
            trackId = null;
            startOffset = 2_400_000_000_000;
          }, // +40min
          {
            stageName = ?"Race 4";
            raceClass = #Elite;
            terrain = #MetalRoads;
            distance = 15;
            trackId = null;
            startOffset = 3_600_000_000_000;
          }, // +60min
          {
            stageName = ?"Race 5 Finals";
            raceClass = #Elite;
            terrain = #ScrapHeaps;
            distance = 20;
            trackId = null;
            startOffset = 5_400_000_000_000;
          }, // +90min
        ];
        heatAllocation = #Random; // Maximum chaos!
      });

      let regOpens = scheduledTime - (7 * 3600 * 1_000_000_000); // Opens at noon same day
      let regCloses = scheduledTime - (15 * 60 * 1_000_000_000); // Closes 15min before

      scheduleEvent(
        #SpecialEvent("Rush Hour"),
        scheduledTime,
        regOpens,
        regCloses,
        metadata,
        raceMode,
        {
          fullRefund = regOpens + (3 * 3600 * 1_000_000_000); // 3pm same day
          halfRefund = scheduledTime - (2 * 3600 * 1_000_000_000); // 5pm
          quarterRefund = regCloses; // At close
        },
        now,
      );
    };

    // Ultra Marathon (extreme endurance)
    public func createUltraMarathonEvent(scheduledTime : Int, now : Int) : ScheduledEvent {
      let metadata : EventMetadata = {
        name = "Wasteland Ultra Marathon";
        description = "One race. All terrains. 50+ km of pure survival.";
        entryFee = 200_000_000; // 2.0 ICP
        maxEntries = 20;
        minEntries = 5;
        prizePoolBonus = 600_000_000; // 6 ICP bonus!
        pointsMultiplier = 3.0;
        divisions = [#Elite, #SilentKlan];
        scoringMode = #Individual;
        eventBonusPrize = 0;
      };

      let raceMode : RaceCreationMode = #Automatic({
        terrains = [#ScrapHeaps, #WastelandSand, #MetalRoads];
        distanceRange = { min = 45; max = 60 }; // Ultra marathon tracks (14-15)
        racesPerClass = null;
        heatAllocation = #SkillTiered;
      });

      let regOpens = scheduledTime - (120 * 3600 * 1_000_000_000); // Opens Monday (5 days)
      let regCloses = scheduledTime - (2 * 3600 * 1_000_000_000); // Closes 2h before

      scheduleEvent(
        #SpecialEvent("Ultra Marathon"),
        scheduledTime,
        regOpens,
        regCloses,
        metadata,
        raceMode,
        {
          fullRefund = regOpens + (48 * 3600 * 1_000_000_000); // Wednesday noon
          halfRefund = scheduledTime - (48 * 3600 * 1_000_000_000); // Thursday noon
          quarterRefund = regCloses; // At close
        },
        now,
      );
    };

    // Midnight Madness (late night chaos)
    public func createMidnightMadnessEvent(scheduledTime : Int, now : Int) : ScheduledEvent {
      let metadata : EventMetadata = {
        name = "Saturday Midnight Madness";
        description = "Late night racing. Anything goes!";
        entryFee = 25_000_000; // 0.25 ICP
        maxEntries = 40;
        minEntries = 4;
        prizePoolBonus = 75_000_000; // 0.75 ICP bonus
        pointsMultiplier = 1.0;
        divisions = [#Scrap, #Junker, #Raider, #Elite, #SilentKlan];
        scoringMode = #Individual;
        eventBonusPrize = 0;
      };

      let raceMode : RaceCreationMode = #Automatic({
        terrains = [#ScrapHeaps, #WastelandSand, #MetalRoads];
        distanceRange = { min = 7; max = 13 };
        racesPerClass = null;
        heatAllocation = #Random; // Chaos!
      });

      let regOpens = scheduledTime - (6 * 3600 * 1_000_000_000); // Opens 6pm same day
      let regCloses = scheduledTime - (30 * 60 * 1_000_000_000); // Closes 30min before

      scheduleEvent(
        #SpecialEvent("Midnight Madness"),
        scheduledTime,
        regOpens,
        regCloses,
        metadata,
        raceMode,
        {
          fullRefund = regOpens + (2 * 3600 * 1_000_000_000); // 8pm
          halfRefund = scheduledTime - (2 * 3600 * 1_000_000_000); // 10pm
          quarterRefund = regCloses; // At close
        },
        now,
      );
    };

    // Champions Cup (winners only, prestige event)
    public func createChampionsCupEvent(scheduledTime : Int, now : Int) : ScheduledEvent {
      let metadata : EventMetadata = {
        name = "Champions Defense Cup";
        description = "Only previous event winners allowed. Defend your title!";
        entryFee = 300_000_000; // 3.0 ICP
        maxEntries = 16;
        minEntries = 8;
        prizePoolBonus = 1_000_000_000; // 10 ICP!
        pointsMultiplier = 5.0;
        divisions = [#Elite, #SilentKlan];
        scoringMode = #Individual;
        eventBonusPrize = 0;
      };

      let raceMode : RaceCreationMode = #Automatic({
        terrains = [#MetalRoads];
        distanceRange = { min = 9; max = 17 };
        racesPerClass = null;
        heatAllocation = #SkillTiered; // Best vs best
      });

      let regOpens = scheduledTime - (7 * 86400 * 1_000_000_000); // Opens 1 week before
      let regCloses = scheduledTime - (24 * 3600 * 1_000_000_000); // Closes 1 day before

      scheduleEvent(
        #SpecialEvent("Champions Cup"),
        scheduledTime,
        regOpens,
        regCloses,
        metadata,
        raceMode,
        {
          fullRefund = regOpens + (72 * 3600 * 1_000_000_000); // 3 days after opens
          halfRefund = scheduledTime - (72 * 3600 * 1_000_000_000); // 3 days before
          quarterRefund = regCloses; // At close
        },
        now,
      );
    };

    // ===== EVENT REGISTRATION FUNCTIONS =====

    // Register a bot for an event
    public func registerForEvent(
      eventId : Nat,
      tokenIndex : Nat,
      owner : Principal,
      raceClass : RaceClass,
      entryFee : Nat,
      now : Int,
    ) : Result.Result<(), Text> {
      switch (getEvent(eventId)) {
        case (null) { #err("Event not found") };
        case (?event) {
          // Check if registration window is valid (use timestamps as source of truth)
          if (now < event.registrationOpens) {
            return #err("Registration has not opened yet");
          };
          if (now >= event.registrationCloses) {
            return #err("Registration has closed");
          };

          // Check event status (secondary check for manually closed events)
          if (event.status == #Cancelled or event.status == #Completed) {
            return #err("This event is no longer accepting registrations");
          };

          // Check if bot is already registered
          let alreadyRegistered = Array.find<EventRegistration>(
            event.registrations,
            func(r) { r.tokenIndex == tokenIndex },
          );
          switch (alreadyRegistered) {
            case (?_) {
              return #err("Bot is already registered for this event");
            };
            case (null) {};
          };

          // Check class capacity
          let classCount = Array.filter<EventRegistration>(
            event.registrations,
            func(r) { r.raceClass == raceClass },
          ).size();

          if (classCount >= event.maxRegistrationsPerClass) {
            return #err("Registration is full for this class");
          };

          // Check visibility/access control
          switch (event.visibility) {
            case (#Public) {}; // Anyone can register
            case (#Private) {
              // Check if owner is invited
              switch (event.invitedParticipants) {
                case (null) {
                  return #err("Event is private but has no invite list");
                };
                case (?invited) {
                  let isInvited = Array.find<Principal>(invited, func(p) { p == owner });
                  switch (isInvited) {
                    case (null) {
                      return #err("You are not invited to this private event");
                    };
                    case (?_) {};
                  };
                };
              };
            };
            case (#Restricted(rules)) {
              // Note: ELO/faction/achievement checks would need to be done by caller
              // before calling this function, as we don't have access to garage data here

              // Check allowed bots
              switch (rules.allowedBots) {
                case (?allowed) {
                  let isAllowed = Array.find<Nat>(allowed, func(i) { i == tokenIndex });
                  switch (isAllowed) {
                    case (null) {
                      return #err("This bot is not allowed in this restricted event");
                    };
                    case (?_) {};
                  };
                };
                case (null) {};
              };

              // Check allowed players
              switch (rules.allowedPlayers) {
                case (?allowed) {
                  let isAllowed = Array.find<Principal>(allowed, func(p) { p == owner });
                  switch (isAllowed) {
                    case (null) {
                      return #err("You are not allowed in this restricted event");
                    };
                    case (?_) {};
                  };
                };
                case (null) {};
              };
            };
          };

          // Create registration
          let registration : EventRegistration = {
            eventId = eventId;
            tokenIndex = tokenIndex;
            owner = owner;
            raceClass = raceClass;
            registeredAt = now;
            entryFeePaid = entryFee;
          };

          // Update event
          let newRegistrations = Array.append(event.registrations, [registration]);

          // Update class counts
          let newByClass = updateClassCount(event.registrationCounts.byClass, raceClass, 1);

          let updatedEvent = {
            event with
            registrations = newRegistrations;
            registrationCounts = {
              total = event.registrationCounts.total + 1;
              byClass = newByClass;
            };
          };

          ignore Map.put(events, nhash, eventId, updatedEvent);
          #ok(());
        };
      };
    };

    // Unregister a bot from an event
    public func unregisterFromEvent(
      eventId : Nat,
      tokenIndex : Nat,
      owner : Principal,
      now : Int,
    ) : Result.Result<Nat, Text> {
      switch (getEvent(eventId)) {
        case (null) { #err("Event not found") };
        case (?event) {
          // Cannot unregister after registration closes
          if (now >= event.registrationCloses) {
            return #err("Cannot unregister after registration closes");
          };

          // Find registration
          let registration = Array.find<EventRegistration>(
            event.registrations,
            func(r) { r.tokenIndex == tokenIndex and r.owner == owner },
          );

          switch (registration) {
            case (null) { #err("Bot is not registered for this event") };
            case (?reg) {
              // Calculate refund based on cancellation deadlines
              let refundAmount = if (now <= event.cancellationDeadlines.fullRefund) {
                reg.entryFeePaid; // 100% refund
              } else if (now <= event.cancellationDeadlines.halfRefund) {
                reg.entryFeePaid / 2; // 50% refund
              } else if (now <= event.cancellationDeadlines.quarterRefund) {
                reg.entryFeePaid / 4; // 25% refund
              } else {
                0; // No refund
              };

              // Remove registration
              let newRegistrations = Array.filter<EventRegistration>(
                event.registrations,
                func(r) { r.tokenIndex != tokenIndex or r.owner != owner },
              );

              // Update class counts
              let newByClass = updateClassCount(event.registrationCounts.byClass, reg.raceClass, -1);

              let updatedEvent = {
                event with
                registrations = newRegistrations;
                registrationCounts = {
                  total = Nat.sub(event.registrationCounts.total, 1);
                  byClass = newByClass;
                };
              };

              ignore Map.put(events, nhash, eventId, updatedEvent);
              #ok(refundAmount);
            };
          };
        };
      };
    };

    // Helper: Update class count in byClass array
    private func updateClassCount(
      byClass : [(RaceClass, Nat)],
      targetClass : RaceClass,
      delta : Int,
    ) : [(RaceClass, Nat)] {
      var found = false;
      let updated = Array.map<(RaceClass, Nat), (RaceClass, Nat)>(
        byClass,
        func(entry) {
          let (raceClass, count) = entry;
          if (raceClass == targetClass) {
            found := true;
            let newCount = if (delta >= 0) {
              count + Int.abs(delta);
            } else {
              Nat.sub(count, Int.abs(delta));
            };
            (raceClass, newCount);
          } else {
            entry;
          };
        },
      );

      if (found) {
        updated;
      } else {
        // Class not in array yet, add it
        Array.append(updated, [(targetClass, Int.abs(delta))]);
      };
    };

    // Get event registrations (hidden until registration closes)
    public func getEventRegistrations(eventId : Nat, now : Int) : ?[EventRegistration] {
      switch (getEvent(eventId)) {
        case (null) { null };
        case (?event) {
          // Only reveal registrations after registration closes
          if (now >= event.registrationCloses) {
            ?event.registrations;
          } else {
            // Return empty array during blind registration period
            ?[];
          };
        };
      };
    };

    // Get public registration stats (always visible)
    public func getEventRegistrationStats(eventId : Nat) : ?{
      total : Nat;
      byClass : [(RaceClass, Nat)];
      maxPerClass : Nat;
    } {
      switch (getEvent(eventId)) {
        case (null) { null };
        case (?event) {
          ?{
            total = event.registrationCounts.total;
            byClass = event.registrationCounts.byClass;
            maxPerClass = event.maxRegistrationsPerClass;
          };
        };
      };
    };

    // Check if a bot is registered for an event
    public func isRegisteredForEvent(eventId : Nat, tokenIndex : Nat) : Bool {
      switch (getEvent(eventId)) {
        case (null) { false };
        case (?event) {
          let reg = Array.find<EventRegistration>(
            event.registrations,
            func(r) { r.tokenIndex == tokenIndex },
          );
          switch (reg) {
            case (null) { false };
            case (?_) { true };
          };
        };
      };
    };

    // ===== HEAT ALLOCATION FUNCTIONS =====

    // Split registrations into heats based on allocation strategy
    public func splitIntoHeats(
      registrations : [EventRegistration],
      maxPerHeat : Nat,
      strategy : HeatAllocationStrategy,
      getElo : (Nat) -> Nat, // Function to get ELO for a bot
    ) : [[EventRegistration]] {
      if (registrations.size() == 0) {
        return [];
      };

      // If under max, return single heat
      if (registrations.size() <= maxPerHeat) {
        return [registrations];
      };

      // Calculate number of heats needed
      let numHeats = (registrations.size() + maxPerHeat - 1) / maxPerHeat;

      switch (strategy) {
        case (#SnakeDraft) {
          // Sort by ELO (highest to lowest)
          let sorted = Array.sort<EventRegistration>(
            registrations,
            func(a, b) {
              Nat.compare(getElo(b.tokenIndex), getElo(a.tokenIndex));
            },
          );

          // Snake draft: 1→4→5→8, 2→3→6→7
          let heats = Buffer.Buffer<Buffer.Buffer<EventRegistration>>(numHeats);
          for (i in Iter.range(0, numHeats - 1)) {
            heats.add(Buffer.Buffer<EventRegistration>(maxPerHeat));
          };

          var heatIndex : Int = 0;
          var direction : Int = 1; // 1 = forward, -1 = backward

          for (reg in sorted.vals()) {
            heats.get(Int.abs(heatIndex)).add(reg);

            // Snake pattern
            heatIndex += direction;
            if (heatIndex >= numHeats) {
              heatIndex := Int.abs(numHeats) - 1;
              direction := -1;
            } else if (heatIndex < 0) {
              heatIndex := 0;
              direction := 1;
            };
          };

          Buffer.toArray(
            Buffer.map<Buffer.Buffer<EventRegistration>, [EventRegistration]>(
              heats,
              func(h) { Buffer.toArray(h) },
            )
          );
        };

        case (#SkillTiered) {
          // Sort by ELO
          let sorted = Array.sort<EventRegistration>(
            registrations,
            func(a, b) {
              Nat.compare(getElo(b.tokenIndex), getElo(a.tokenIndex));
            },
          );

          // Group into skill tiers
          let heats = Buffer.Buffer<Buffer.Buffer<EventRegistration>>(numHeats);
          for (i in Iter.range(0, numHeats - 1)) {
            heats.add(Buffer.Buffer<EventRegistration>(maxPerHeat));
          };

          for (i in Iter.range(0, sorted.size() - 1)) {
            let heatIndex = Nat.min(i / maxPerHeat, numHeats - 1);
            heats.get(heatIndex).add(sorted[i]);
          };

          Buffer.toArray(
            Buffer.map<Buffer.Buffer<EventRegistration>, [EventRegistration]>(
              heats,
              func(h) { Buffer.toArray(h) },
            )
          );
        };

        case (#TopBottom) {
          // Sort by ELO
          let sorted = Array.sort<EventRegistration>(
            registrations,
            func(a, b) {
              Nat.compare(getElo(b.tokenIndex), getElo(a.tokenIndex));
            },
          );

          // Split in half: top ELO in first heat(s), bottom ELO in last heat(s)
          let midPoint = sorted.size() / 2;
          let numTopHeats = (midPoint + maxPerHeat - 1) / maxPerHeat;
          let numBottomHeats = (sorted.size() - midPoint + maxPerHeat - 1) / maxPerHeat;

          let heats = Buffer.Buffer<Buffer.Buffer<EventRegistration>>(numTopHeats + numBottomHeats);

          // Initialize top heats
          for (i in Iter.range(0, numTopHeats - 1)) {
            heats.add(Buffer.Buffer<EventRegistration>(maxPerHeat));
          };

          // Initialize bottom heats
          for (i in Iter.range(0, numBottomHeats - 1)) {
            heats.add(Buffer.Buffer<EventRegistration>(maxPerHeat));
          };

          // Fill top heats
          for (i in Iter.range(0, midPoint - 1)) {
            let heatIndex = i / maxPerHeat;
            heats.get(heatIndex).add(sorted[i]);
          };

          // Fill bottom heats
          for (i in Iter.range(midPoint, sorted.size() - 1)) {
            let heatIndex = numTopHeats + (Nat.sub(i, midPoint) / maxPerHeat);
            heats.get(heatIndex).add(sorted[i]);
          };

          Buffer.toArray(
            Buffer.map<Buffer.Buffer<EventRegistration>, [EventRegistration]>(
              heats,
              func(h) { Buffer.toArray(h) },
            )
          );
        };

        case (#Random) {
          // Simple round-robin distribution
          let heats = Buffer.Buffer<Buffer.Buffer<EventRegistration>>(numHeats);
          for (i in Iter.range(0, numHeats - 1)) {
            heats.add(Buffer.Buffer<EventRegistration>(maxPerHeat));
          };

          for (i in Iter.range(0, registrations.size() - 1)) {
            let heatIndex = i % numHeats;
            heats.get(heatIndex).add(registrations[i]);
          };

          Buffer.toArray(
            Buffer.map<Buffer.Buffer<EventRegistration>, [EventRegistration]>(
              heats,
              func(h) { Buffer.toArray(h) },
            )
          );
        };
      };
    };

    // Get registrations grouped by class
    public func getRegistrationsByClass(eventId : Nat) : [(RaceClass, [EventRegistration])] {
      switch (getEvent(eventId)) {
        case (null) { [] };
        case (?event) {
          // Group by class using a buffer
          let result = Buffer.Buffer<(RaceClass, Buffer.Buffer<EventRegistration>)>(5);

          for (reg in event.registrations.vals()) {
            // Find existing class entry
            var found = false;
            for (i in Iter.range(0, result.size() - 1)) {
              let (raceClass, buffer) = result.get(i);
              if (raceClass == reg.raceClass) {
                buffer.add(reg);
                found := true;
              };
            };

            // Add new class entry if not found
            if (not found) {
              let newBuffer = Buffer.Buffer<EventRegistration>(10);
              newBuffer.add(reg);
              result.add((reg.raceClass, newBuffer));
            };
          };

          // Convert to array
          Buffer.toArray(
            Buffer.map<(RaceClass, Buffer.Buffer<EventRegistration>), (RaceClass, [EventRegistration])>(
              result,
              func(entry) {
                let (raceClass, buffer) = entry;
                (raceClass, Buffer.toArray(buffer));
              },
            )
          );
        };
      };
    };
  };
};
