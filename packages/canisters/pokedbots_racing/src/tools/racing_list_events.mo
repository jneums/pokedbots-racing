import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Int "mo:base/Int";
import Float "mo:base/Float";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import RaceCalendar "../RaceCalendar";
import RaceClassUtils "../RaceClassUtils";
import TimeUtils "../TimeUtils";

module {
  public func config() : McpTypes.Tool = {
    name = "racing_list_events";
    title = ?"List Racing Events";
    description = ?"View racing events. Returns 5 events per page. Filter by event type, status, class eligibility, or bot-specific filters. Use after_event_id for pagination.\n\n**TIMESTAMP FORMAT:** All timestamps are in UTC ISO 8601 format (e.g., '2024-12-17T20:00:00Z').\n\n**STATUS OPTIONS:** announced (scheduled, not open), registration_open (accepting entries), registration_closed (closed but not started), in_progress (currently running), completed (finished), cancelled\n\n**BOT FILTERS:** Use only_eligible_for_token to show only events a specific bot can enter based on its race class. Use only_not_registered_for_token to hide events a bot is already registered for.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("after_event_id", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Event ID to start after. Returns the next 5 events after this ID."))])), ("event_type", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("WeeklyLeague"), Json.str("DailySprint"), Json.str("MonthlyCup"), Json.str("SpecialEvent")])), ("description", Json.str("Optional: Filter by event type"))])), ("status", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("announced"), Json.str("registration_open"), Json.str("registration_closed"), Json.str("in_progress"), Json.str("completed"), Json.str("cancelled")])), ("description", Json.str("Optional: Filter by status - announced (not open yet), registration_open (accepting entries), registration_closed, in_progress, completed, cancelled"))])), ("race_class", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("Scrap"), Json.str("Junker"), Json.str("Raider"), Json.str("Elite"), Json.str("SilentKlan")])), ("description", Json.str("Optional: Filter by race class eligibility"))])), ("days_ahead", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Number of days ahead to look for events (default: 30). Set to 0 to include all events."))])), ("include_past", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Include past/completed events (default: false). When true, shows all events including completed ones."))])), ("sort_by", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("scheduled_time"), Json.str("entry_fee"), Json.str("prize_pool"), Json.str("registrations")])), ("description", Json.str("Optional: Sort by scheduled_time (soonest first, default), entry_fee (lowest first), prize_pool (highest first), or registrations (most first)"))])), ("only_eligible_for_token", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Token index of a bot. Only show events whose divisions include this bot's race class (computed from the bot's rating at 100% condition)."))])), ("only_not_registered_for_token", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Token index of a bot. Exclude events this bot is already registered for."))]))])),
    ]);
    outputSchema = null;
  };

  public func handle(ctx : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {
      let _user = switch (_auth) {
        case (null) {
          return ToolContext.makeError("Authentication required", cb);
        };
        case (?auth) { auth.principal };
      };

      let now = Time.now();
      let afterEventIdOpt = Result.toOption(Json.getAsNat(_args, "after_event_id"));

      // Parse filter parameters
      let eventTypeFilter = Result.toOption(Json.getAsText(_args, "event_type"));
      let statusFilter = Result.toOption(Json.getAsText(_args, "status"));
      let raceClassFilter = Result.toOption(Json.getAsText(_args, "race_class"));
      let daysAheadOpt = Result.toOption(Json.getAsNat(_args, "days_ahead"));
      let includePastOpt = Result.toOption(Json.getAsBool(_args, "include_past"));
      let sortByOpt = Result.toOption(Json.getAsText(_args, "sort_by"));
      let onlyEligibleForTokenOpt = Result.toOption(Json.getAsNat(_args, "only_eligible_for_token"));
      let onlyNotRegisteredForTokenOpt = Result.toOption(Json.getAsNat(_args, "only_not_registered_for_token"));

      let pageSize = 5;
      let daysAhead = switch (daysAheadOpt) {
        case (?d) { d };
        case (null) { 30 };
      };
      let includePast = switch (includePastOpt) {
        case (?p) { p };
        case (null) { false };
      };

      // Get events based on includePast filter
      var allEvents = if (includePast or statusFilter == ?"completed" or statusFilter == ?"cancelled") {
        ctx.eventCalendar.getAllEvents();
      } else if (daysAhead == 0) {
        ctx.eventCalendar.getAllEvents();
      } else {
        ctx.eventCalendar.getUpcomingEvents(now, daysAhead);
      };

      if (allEvents.size() == 0) {
        return ToolContext.makeTextSuccess("🏜️ No events currently available. The wasteland is quiet... for now.", cb);
      };

      // Apply filters
      var filteredEvents = allEvents;

      // Filter by event type
      filteredEvents := switch (eventTypeFilter) {
        case (?eventType) {
          Array.filter<RaceCalendar.ScheduledEvent>(
            filteredEvents,
            func(e) {
              switch (e.eventType, eventType) {
                case (#WeeklyLeague, "WeeklyLeague") { true };
                case (#DailySprint, "DailySprint") { true };
                case (#MonthlyCup, "MonthlyCup") { true };
                case (#SpecialEvent(_), "SpecialEvent") { true };
                case _ { false };
              };
            },
          );
        };
        case (null) { filteredEvents };
      };

      // Filter by status
      filteredEvents := switch (statusFilter) {
        case (?status) {
          Array.filter<RaceCalendar.ScheduledEvent>(
            filteredEvents,
            func(e) {
              switch (e.status, status) {
                case (#Announced, "announced") { true };
                case (#RegistrationOpen, "registration_open") { true };
                case (#RegistrationClosed, "registration_closed") { true };
                case (#InProgress, "in_progress") { true };
                case (#Completed, "completed") { true };
                case (#Cancelled, "cancelled") { true };
                case _ { false };
              };
            },
          );
        };
        case (null) { filteredEvents };
      };

      // Filter by race class eligibility
      filteredEvents := switch (raceClassFilter) {
        case (?className) {
          let targetClass : RaceCalendar.RaceClass = switch (className) {
            case ("Scrap") { #Scrap };
            case ("Junker") { #Junker };
            case ("Raider") { #Raider };
            case ("Elite") { #Elite };
            case ("SilentKlan") { #SilentKlan };
            case _ { #Scrap }; // Default
          };
          Array.filter<RaceCalendar.ScheduledEvent>(
            filteredEvents,
            func(e) {
              Array.find<RaceCalendar.RaceClass>(
                e.metadata.divisions,
                func(c) { c == targetClass },
              ) != null;
            },
          );
        };
        case (null) { filteredEvents };
      };

      // Filter by bot eligibility (only events this bot's race class can enter)
      filteredEvents := switch (onlyEligibleForTokenOpt) {
        case (?tokenIndex) {
          switch (ctx.getStats(tokenIndex)) {
            case (?stats) {
              let baseStats = ctx.garageManager.getBaseStats(tokenIndex);
              let statsAt100 = {
                speed = baseStats.speed + stats.speedBonus;
                powerCore = baseStats.powerCore + stats.powerCoreBonus;
                acceleration = baseStats.acceleration + stats.accelerationBonus;
                stability = baseStats.stability + stats.stabilityBonus;
              };
              let totalRatingAt100 = (statsAt100.speed + statsAt100.powerCore + statsAt100.acceleration + statsAt100.stability) / 4;
              let botRaceClass = RaceClassUtils.getRaceClassFromRating(totalRatingAt100);
              Array.filter<RaceCalendar.ScheduledEvent>(
                filteredEvents,
                func(e) {
                  Array.find<RaceCalendar.RaceClass>(
                    e.metadata.divisions,
                    func(c) { c == botRaceClass },
                  ) != null;
                },
              );
            };
            case (null) {
              // Bot not found/not initialized - return no events
              [];
            };
          };
        };
        case (null) { filteredEvents };
      };

      // Filter out events the bot is already registered for
      filteredEvents := switch (onlyNotRegisteredForTokenOpt) {
        case (?tokenIndex) {
          Array.filter<RaceCalendar.ScheduledEvent>(
            filteredEvents,
            func(e) {
              Array.find<RaceCalendar.EventRegistration>(
                e.registrations,
                func(r) { r.tokenIndex == tokenIndex },
              ) == null; // Keep events where bot is NOT registered
            },
          );
        };
        case (null) { filteredEvents };
      };

      if (filteredEvents.size() == 0) {
        return ToolContext.makeTextSuccess("🏜️ No events match your filters. Try adjusting your search criteria.", cb);
      };

      // Apply sorting
      let sortedEvents = switch (sortByOpt) {
        case (?"prize_pool") {
          Array.sort<RaceCalendar.ScheduledEvent>(
            filteredEvents,
            func(a, b) {
              let totalA = a.metadata.prizePoolBonus + a.metadata.eventBonusPrize;
              let totalB = b.metadata.prizePoolBonus + b.metadata.eventBonusPrize;
              if (totalA > totalB) { #less } else if (totalA < totalB) {
                #greater;
              } else { #equal };
            },
          );
        };
        case (?"entry_fee") {
          Array.sort<RaceCalendar.ScheduledEvent>(
            filteredEvents,
            func(a, b) {
              if (a.metadata.entryFee < b.metadata.entryFee) { #less } else if (a.metadata.entryFee > b.metadata.entryFee) {
                #greater;
              } else { #equal };
            },
          );
        };
        case (?"registrations") {
          Array.sort<RaceCalendar.ScheduledEvent>(
            filteredEvents,
            func(a, b) {
              if (a.registrationCounts.total > b.registrationCounts.total) {
                #less;
              } else if (a.registrationCounts.total < b.registrationCounts.total) {
                #greater;
              } else { #equal };
            },
          );
        };
        case (_) {
          // Default: sort by scheduled time (soonest first)
          Array.sort<RaceCalendar.ScheduledEvent>(
            filteredEvents,
            func(a, b) {
              if (a.scheduledTime < b.scheduledTime) { #less } else if (a.scheduledTime > b.scheduledTime) {
                #greater;
              } else { #equal };
            },
          );
        };
      };

      // Apply cursor-based pagination
      var startIdx = 0;
      switch (afterEventIdOpt) {
        case (?afterEventId) {
          label finding for (i in sortedEvents.keys()) {
            if (sortedEvents[i].eventId == afterEventId) {
              startIdx := i + 1;
              break finding;
            };
          };
        };
        case (null) {};
      };

      // Get page of events
      let endIdx = Nat.min(startIdx + pageSize, sortedEvents.size());
      if (startIdx >= sortedEvents.size()) {
        return ToolContext.makeTextSuccess("🏜️ No more events to show.", cb);
      };

      let pageEvents = Array.tabulate<RaceCalendar.ScheduledEvent>(
        endIdx - startIdx,
        func(i) { sortedEvents[startIdx + i] },
      );

      // Format output
      var output = "🏁 **Racing Events** (" # Nat.toText(sortedEvents.size()) # " total)\n\n";

      for (event in pageEvents.vals()) {
        // Format event type
        let eventTypeStr = switch (event.eventType) {
          case (#WeeklyLeague) { "Weekly League" };
          case (#DailySprint) { "Daily Sprint" };
          case (#MonthlyCup) { "Monthly Cup" };
          case (#SpecialEvent(theme)) { "Special: " # theme };
        };

        // Format status
        let statusStr = switch (event.status) {
          case (#Announced) { "📢 Announced" };
          case (#RegistrationOpen) { "✅ Registration Open" };
          case (#RegistrationClosed) { "🔒 Registration Closed" };
          case (#InProgress) { "🏎️ In Progress" };
          case (#Completed) { "🏆 Completed" };
          case (#Cancelled) { "❌ Cancelled" };
        };

        // Format divisions
        let divisionsArr = Array.map<RaceCalendar.RaceClass, Text>(
          event.metadata.divisions,
          func(c) {
            switch (c) {
              case (#Scrap) { "Scrap" };
              case (#Junker) { "Junker" };
              case (#Raider) { "Raider" };
              case (#Elite) { "Elite" };
              case (#SilentKlan) { "SilentKlan" };
            };
          },
        );
        let divisionsStr = Text.join(", ", divisionsArr.vals());

        // Calculate time until event
        let diffNanos = event.scheduledTime - now;
        let diffHours = diffNanos / 3_600_000_000_000;
        let diffMinutes = (diffNanos % 3_600_000_000_000) / 60_000_000_000;

        let timeStr = if (diffNanos < 0) {
          let pastHours = Int.abs(diffHours);
          if (pastHours > 24) {
            Nat.toText(Int.abs(pastHours / 24)) # " days ago";
          } else {
            Nat.toText(Int.abs(pastHours)) # "h " # Nat.toText(Int.abs(diffMinutes)) # "m ago";
          };
        } else if (diffHours > 24) {
          Nat.toText(Int.abs(diffHours / 24)) # " days";
        } else {
          Nat.toText(Int.abs(diffHours)) # "h " # Nat.toText(Int.abs(diffMinutes)) # "m";
        };

        // Format entry fee
        let entryFeeIcp = Float.toText(Float.fromInt(event.metadata.entryFee) / 100_000_000.0);

        // Format prize pool
        let prizePoolIcp = Float.toText(Float.fromInt(event.metadata.prizePoolBonus + event.metadata.eventBonusPrize) / 100_000_000.0);

        // Registration deadline
        let regDeadlineNanos = event.registrationCloses - now;
        let regDeadlineHours = regDeadlineNanos / 3_600_000_000_000;
        let regDeadlineStr = if (regDeadlineNanos < 0) {
          "Closed";
        } else if (regDeadlineHours > 24) {
          "in " # Nat.toText(Int.abs(regDeadlineHours / 24)) # " days";
        } else {
          "in " # Nat.toText(Int.abs(regDeadlineHours)) # "h";
        };

        output #= "---\n";
        output #= "**Event #" # Nat.toText(event.eventId) # "**: " # event.metadata.name # "\n";
        output #= "📋 Type: " # eventTypeStr # " | " # statusStr # "\n";
        output #= "🏆 Divisions: " # divisionsStr # "\n";
        output #= "💰 Entry: " # entryFeeIcp # " ICP | Prize Pool: " # prizePoolIcp # " ICP\n";
        output #= "👥 Registered: " # Nat.toText(event.registrationCounts.total) # "/" # Nat.toText(event.metadata.maxEntries);
        output #= " (min: " # Nat.toText(event.metadata.minEntries) # ")\n";
        output #= "⏰ Starts: " # timeStr # " | Registration: " # regDeadlineStr # "\n";
        output #= "📅 Start: " # TimeUtils.nanosToUtcString(event.scheduledTime) # "\n";

        // Show associated races if any
        if (event.raceIds.size() > 0) {
          let raceIdsStr = Text.join(", ", Array.map<Nat, Text>(event.raceIds, Nat.toText).vals());
          output #= "🏁 Races: #" # raceIdsStr # "\n";
        };

        output #= "\n";
      };

      // Add pagination hint
      if (endIdx < sortedEvents.size()) {
        let lastEvent = pageEvents[pageEvents.size() - 1];
        output #= "---\n";
        output #= "📖 More events available. Use `after_event_id: " # Nat.toText(lastEvent.eventId) # "` to see next page.\n";
      };

      return ToolContext.makeTextSuccess(output, cb);
    };
  };
};
