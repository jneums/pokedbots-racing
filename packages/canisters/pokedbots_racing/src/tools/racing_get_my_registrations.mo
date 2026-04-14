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
import TimeUtils "../TimeUtils";

module {
  public func config() : McpTypes.Tool = {
    name = "racing_get_my_registrations";
    title = ?"Get My Event Registrations";
    description = ?"Get all your event registrations across all your bots. Shows which bots are registered for which upcoming events, with event details and timing information.\n\n**⚠️ AUTOMATION NOTE:** Use `only_actionable: true` for scripts/automation — it filters out stale entries stuck in open status from long-past events. Without filters, raw results may include historical noise.\n\n**RETURNS:**\n• List of your registered bots per event\n• Event start times and status\n• Race IDs (if races have been created)\n• Time until event starts";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([
        ("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Filter to registrations for a specific bot"))])),
        ("event_id", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Filter to a specific event"))])),
        ("include_completed", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Include completed events (default: false)"))])),
        ("only_upcoming", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Only show events that are genuinely upcoming — status is Announced/RegistrationOpen/InProgress AND scheduledTime is not more than 24h in the past. Filters out stale events stuck in open status. (default: false)"))])),
        ("only_actionable", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Best filter for automation. Only events where action is still possible: upcoming events not yet started, or currently in progress. Excludes completed, cancelled, and any event whose scheduledTime is more than 24h in the past regardless of status. (default: false)"))])),
        ("status", Json.obj([("type", Json.str("string")), ("description", Json.str("Optional: Filter by exact event status. One of: Announced, RegistrationOpen, RegistrationClosed, InProgress, Completed, Cancelled"))])),
        ("exclude_stale", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Exclude events that are stale — completed/cancelled older than 7 days, OR any status but scheduledTime more than 7 days in the past. Catches events stuck in open status from long-past dates. (default: false)"))])),
        ("event_start_after", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Only include events with scheduledTime >= this nanosecond timestamp"))])),
      ])),
    ]);
    outputSchema = null;
  };

  public func handle(ctx : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {
      let user = switch (_auth) {
        case (null) {
          return ToolContext.makeError("Authentication required", cb);
        };
        case (?auth) { auth.principal };
      };

      let now = Time.now();
      let tokenIndexFilter = Result.toOption(Json.getAsNat(_args, "token_index"));
      let eventIdFilter = Result.toOption(Json.getAsNat(_args, "event_id"));
      let includeCompleted = switch (Result.toOption(Json.getAsBool(_args, "include_completed"))) {
        case (?b) { b };
        case (null) { false };
      };
      let onlyUpcoming = switch (Result.toOption(Json.getAsBool(_args, "only_upcoming"))) {
        case (?b) { b };
        case (null) { false };
      };
      let onlyActionable = switch (Result.toOption(Json.getAsBool(_args, "only_actionable"))) {
        case (?b) { b };
        case (null) { false };
      };
      let statusFilter = Result.toOption(Json.getAsText(_args, "status"));
      let excludeStale = switch (Result.toOption(Json.getAsBool(_args, "exclude_stale"))) {
        case (?b) { b };
        case (null) { false };
      };
      let eventStartAfter = Result.toOption(Json.getAsNat(_args, "event_start_after"));

      let sevenDaysNanos : Int = 7 * 24 * 3_600_000_000_000;
      let oneDayNanos : Int = 24 * 3_600_000_000_000;

      // Get all events
      let allEvents = ctx.eventCalendar.getAllEvents();

      // Filter and collect user's registrations
      type RegistrationInfo = {
        eventId : Nat;
        eventName : Text;
        eventStatus : RaceCalendar.EventStatus;
        scheduledTime : Int;
        tokenIndex : Nat;
        raceClass : RaceCalendar.RaceClass;
        registeredAt : Int;
        entryFeePaid : Nat;
        raceIds : [Nat];
      };

      var registrations : [RegistrationInfo] = [];

      for (event in allEvents.vals()) {
        let eventAge : Int = now - event.scheduledTime; // positive = past

        // Skip completed events unless requested
        if (not includeCompleted and (event.status == #Completed or event.status == #Cancelled)) {
          // Skip
        }
        // only_actionable: strictest automation filter — only events where user can still act
        // Excludes: completed, cancelled, and anything whose scheduledTime is >24h in the past
        else if (onlyActionable and (
          event.status == #Completed or event.status == #Cancelled or eventAge > oneDayNanos
        )) {
          // Skip non-actionable
        }
        // only_upcoming: status-based + time check — filters stale open-status events
        else if (onlyUpcoming and not (
          (event.status == #Announced or event.status == #RegistrationOpen or event.status == #InProgress) and eventAge < oneDayNanos
        )) {
          // Skip non-upcoming (wrong status OR scheduled time >24h in past)
        }
        // status: exact status match
        else if (
          switch (statusFilter) {
            case (?s) {
              let eventStatusText = switch (event.status) {
                case (#Announced) { "Announced" };
                case (#RegistrationOpen) { "RegistrationOpen" };
                case (#RegistrationClosed) { "RegistrationClosed" };
                case (#InProgress) { "InProgress" };
                case (#Completed) { "Completed" };
                case (#Cancelled) { "Cancelled" };
              };
              eventStatusText != s;
            };
            case (null) { false };
          }
        ) {
          // Skip status mismatch
        }
        // exclude_stale: drop events that are clearly stale
        // - completed/cancelled older than 7 days
        // - ANY status with scheduledTime more than 7 days in the past (catches stuck-open events)
        else if (excludeStale and eventAge > sevenDaysNanos) {
          // Skip stale
        }
        // event_start_after: nanosecond timestamp floor
        else if (
          switch (eventStartAfter) {
            case (?ts) { event.scheduledTime < ts }; // Nat auto-coerces to Int in comparison
            case (null) { false };
          }
        ) {
          // Skip events before timestamp floor
        } else {
          // Apply event filter if specified
          let eventMatches = switch (eventIdFilter) {
            case (?eid) { event.eventId == eid };
            case (null) { true };
          };

          if (eventMatches) {
            // Find user's registrations in this event
            for (reg in event.registrations.vals()) {
              if (Principal.equal(reg.owner, user)) {
                // Apply token filter if specified
                let tokenMatches = switch (tokenIndexFilter) {
                  case (?tid) { reg.tokenIndex == tid };
                  case (null) { true };
                };

                if (tokenMatches) {
                  let info : RegistrationInfo = {
                    eventId = event.eventId;
                    eventName = event.metadata.name;
                    eventStatus = event.status;
                    scheduledTime = event.scheduledTime;
                    tokenIndex = reg.tokenIndex;
                    raceClass = reg.raceClass;
                    registeredAt = reg.registeredAt;
                    entryFeePaid = reg.entryFeePaid;
                    raceIds = event.raceIds;
                  };
                  registrations := Array.append(registrations, [info]);
                };
              };
            };
          };
        };
      };

      if (registrations.size() == 0) {
        let filterMsg = switch (tokenIndexFilter, eventIdFilter) {
          case (?tid, ?eid) {
            " for bot #" # Nat.toText(tid) # " in event #" # Nat.toText(eid);
          };
          case (?tid, null) { " for bot #" # Nat.toText(tid) };
          case (null, ?eid) { " in event #" # Nat.toText(eid) };
          case (null, null) { "" };
        };
        return ToolContext.makeTextSuccess("📋 No event registrations found" # filterMsg # ".", cb);
      };

      // Sort by scheduled time (soonest first)
      let sortedRegs = Array.sort<RegistrationInfo>(
        registrations,
        func(a, b) {
          if (a.scheduledTime < b.scheduledTime) { #less } else if (a.scheduledTime > b.scheduledTime) {
            #greater;
          } else { #equal };
        },
      );

      // Format output
      var output = "📋 **Your Event Registrations** (" # Nat.toText(sortedRegs.size()) # " total)\n\n";

      for (reg in sortedRegs.vals()) {
        // Format status
        let statusStr = switch (reg.eventStatus) {
          case (#Announced) { "📢 Announced" };
          case (#RegistrationOpen) { "✅ Registration Open" };
          case (#RegistrationClosed) { "🔒 Registration Closed" };
          case (#InProgress) { "🏎️ In Progress" };
          case (#Completed) { "🏆 Completed" };
          case (#Cancelled) { "❌ Cancelled" };
        };

        // Format class
        let classStr = switch (reg.raceClass) {
          case (#Scrap) { "Scrap" };
          case (#Junker) { "Junker" };
          case (#Raider) { "Raider" };
          case (#Elite) { "Elite" };
          case (#SilentKlan) { "SilentKlan" };
        };

        // Calculate time until event
        let diffNanos = reg.scheduledTime - now;
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
          Nat.toText(Int.abs(diffHours / 24)) # "d " # Nat.toText(Int.abs(diffHours % 24)) # "h";
        } else {
          Nat.toText(Int.abs(diffHours)) # "h " # Nat.toText(Int.abs(diffMinutes)) # "m";
        };

        // Format entry fee
        let entryFeeIcp = Float.toText(Float.fromInt(reg.entryFeePaid) / 100_000_000.0);

        output #= "---\n";
        output #= "**Event #" # Nat.toText(reg.eventId) # "**: " # reg.eventName # "\n";
        output #= "🤖 Bot: #" # Nat.toText(reg.tokenIndex) # " | Class: " # classStr # "\n";
        output #= "📊 Status: " # statusStr # "\n";
        output #= "⏰ Starts: " # timeStr # " | " # TimeUtils.nanosToUtcString(reg.scheduledTime) # "\n";
        output #= "💰 Entry Fee Paid: " # entryFeeIcp # " ICP\n";

        // Show race IDs if available
        if (reg.raceIds.size() > 0) {
          let raceIdsStr = Text.join(", #", Array.map<Nat, Text>(reg.raceIds, Nat.toText).vals());
          output #= "🏁 Race IDs: #" # raceIdsStr # "\n";
        } else {
          output #= "🏁 Races: Not yet created (waiting for registration to close)\n";
        };

        output #= "\n";
      };

      return ToolContext.makeTextSuccess(output, cb);
    };
  };
};
