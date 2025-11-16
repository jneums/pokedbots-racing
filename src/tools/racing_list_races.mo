import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Int "mo:base/Int";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import Racing "../Racing";

module {
  public func config() : McpTypes.Tool = {
    name = "racing_list_races";
    title = ?"List Available Races";
    description = ?"View all upcoming wasteland races. Shows race details, entry requirements, and prize pools. Filter by your bot's eligibility or see all races.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Filter to only show races your bot can enter"))])), ("show_all", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Show all races, not just available ones"))]))])),
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
      let tokenIndexOpt = Result.toOption(Json.getAsNat(_args, "token_index"));
      let showAll = Result.toOption(Json.getAsBool(_args, "show_all"));

      // Get races based on filter
      let races = switch (tokenIndexOpt, showAll) {
        case (?tokenIndex, _) {
          // Filter by bot's eligibility when token_index is provided
          switch (ctx.racingStatsManager.getStats(tokenIndex)) {
            case (?botStats) {
              // Verify ownership
              if (not Principal.equal(botStats.ownerPrincipal, user)) {
                return ToolContext.makeError("You do not own this PokedBot", cb);
              };
              ctx.raceManager.getAvailableRacesForBot(botStats, now);
            };
            case (null) {
              return ToolContext.makeError("Bot not initialized for racing", cb);
            };
          };
        };
        case (null, ?true) {
          // Show all upcoming races when show_all is true and no token_index
          ctx.raceManager.getUpcomingRaces();
        };
        case (null, _) {
          // No token_index and show_all is false/null - require token_index
          return ToolContext.makeError("Please provide token_index to see available races for your bot, or set show_all=true to see all races", cb);
        };
      };

      if (races.size() == 0) {
        return ToolContext.makeTextSuccess("🏜️ No races currently available. The wasteland is quiet... for now.", cb);
      };

      // Build race list
      var raceArray : [Json.Json] = [];
      for (race in races.vals()) {
        // Determine actual status based on time and entries
        let statusText = if (race.status == #Cancelled) {
          "Cancelled";
        } else if (race.status == #Completed) {
          "Finished";
        } else if (race.status == #InProgress) {
          "Racing Now";
        } else if (now >= race.entryDeadline) {
          "Entry Closed";
        } else if (race.entries.size() >= race.maxEntries) {
          "Full";
        } else {
          "Open for Entry";
        };

        let classText = switch (race.raceClass) {
          case (#Scavenger) { "Scavenger (0-2 wins)" };
          case (#Raider) { "Raider (3-5 wins)" };
          case (#Elite) { "Elite (6-9 wins)" };
          case (#SilentKlan) {
            "Silent Klan Invitational (10+ wins, GodClass/Master only)";
          };
        };

        let terrainText = switch (race.terrain) {
          case (#ScrapHeaps) { "Scrap Heaps" };
          case (#WastelandSand) { "Wasteland Sand" };
          case (#MetalRoads) { "Metal Roads" };
        };

        let timeUntilStart = race.startTime - now;
        let hoursUntilStart = timeUntilStart / 3_600_000_000_000;
        let minutesUntilStart = (timeUntilStart % 3_600_000_000_000) / 60_000_000_000;

        let timeUntilDeadline = race.entryDeadline - now;
        let minutesUntilDeadline = timeUntilDeadline / 60_000_000_000;

        let spotsLeft = race.maxEntries - race.entries.size();

        let raceJson = Json.obj([
          ("race_id", Json.int(race.raceId)),
          ("name", Json.str(race.name)),
          ("class", Json.str(classText)),
          ("distance_km", Json.int(race.distance)),
          ("duration_seconds", Json.int(race.duration)),
          ("terrain", Json.str(terrainText)),
          ("entry_fee_icp", Json.str(Text.concat("0.", Nat.toText(race.entryFee / 100000)))),
          ("prize_pool_icp", Json.str(Text.concat("0.", Nat.toText(race.prizePool / 100000)))),
          ("entries", Json.int(race.entries.size())),
          ("max_entries", Json.int(race.maxEntries)),
          ("spots_left", Json.int(spotsLeft)),
          ("status", Json.str(statusText)),
          ("starts_in_hours", Json.int(hoursUntilStart)),
          ("starts_in_minutes", Json.int(minutesUntilStart)),
          ("entry_deadline_minutes", Json.int(minutesUntilDeadline)),
        ]);

        raceArray := Array.append(raceArray, [raceJson]);
      };

      let response = Json.obj([
        ("message", Json.str("🏁 Wasteland Racing Circuit")),
        ("races_available", Json.int(races.size())),
        ("races", Json.arr(raceArray)),
      ]);

      ToolContext.makeSuccess(response, cb);
    };
  };
};
