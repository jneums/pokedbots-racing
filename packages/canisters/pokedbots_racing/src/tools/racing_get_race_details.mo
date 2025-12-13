import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Iter "mo:base/Iter";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import RacingSimulator "../RacingSimulator";

module {
  public func config() : McpTypes.Tool = {
    name = "racing_get_race_details";
    title = ?"Get Race Details";
    description = ?"Get detailed information about a specific race including all entries, participants, current status, and results (if completed).\n\n**TIMESTAMP FORMAT:** All timestamps (start_time, entry_deadline, created_at, entered_at, timestamp) are in nanoseconds since Unix epoch (UTC). Convert to readable dates: divide by 1_000_000 for milliseconds, then convert to user's timezone. Current date: December 7, 2025.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("race_id", Json.obj([("type", Json.str("number")), ("description", Json.str("The race ID to get details for"))]))])),
      ("required", Json.arr([Json.str("race_id")])),
    ]);
    outputSchema = null;
  };

  public func handle(ctx : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {
      let raceIdOpt = Result.toOption(Json.getAsNat(_args, "race_id"));

      switch (raceIdOpt) {
        case (?raceId) {
          // Get race details
          switch (ctx.raceManager.getRace(raceId)) {
            case (?race) {
              let now = Time.now();

              // Build entries array
              var entriesArray : [Json.Json] = [];
              for (entry in race.entries.vals()) {
                let entryJson = Json.obj([
                  ("nft_id", Json.str(entry.nftId)),
                  ("owner", Json.str(Principal.toText(entry.owner))),
                  ("entry_fee_icp", Json.str(Text.concat(Nat.toText(entry.entryFee / 100_000_000), "." # Nat.toText((entry.entryFee % 100_000_000) / 1_000_000)))),
                  ("entered_at", Json.int(entry.enteredAt)),
                ]);
                entriesArray := Array.append(entriesArray, [entryJson]);
              };

              // Build sponsors array
              var sponsorsArray : [Json.Json] = [];
              for (sponsor in race.sponsors.vals()) {
                let msgValue = switch (sponsor.message) {
                  case (?msg) { Json.str(msg) };
                  case (null) { Json.str("") };
                };
                let sponsorJson = Json.obj([
                  ("sponsor", Json.str(Principal.toText(sponsor.sponsor))),
                  ("amount_icp", Json.str(Text.concat(Nat.toText(sponsor.amount / 100_000_000), "." # Nat.toText((sponsor.amount % 100_000_000) / 1_000_000)))),
                  ("message", msgValue),
                  ("timestamp", Json.int(sponsor.timestamp)),
                ]);
                sponsorsArray := Array.append(sponsorsArray, [sponsorJson]);
              };

              // Build results array if available
              var resultsArray : [Json.Json] = [];
              switch (race.results) {
                case (?results) {
                  for (result in results.vals()) {
                    let timeInt = Float.toInt(result.finalTime * 1000.0);
                    let prizeDecimal = (result.prizeAmount % 100_000_000) / 1_000_000;
                    let prizeDecimalStr = if (prizeDecimal < 10) {
                      "0" # Nat.toText(prizeDecimal);
                    } else { Nat.toText(prizeDecimal) };
                    let resultJson = Json.obj([
                      ("position", Json.int(result.position)),
                      ("nft_id", Json.str(result.nftId)),
                      ("owner", Json.str(Principal.toText(result.owner))),
                      ("final_time_seconds", Json.str(Text.concat(Nat.toText(Int.abs(timeInt) / 1000), "." # Nat.toText((Int.abs(timeInt) % 1000) / 100)))),
                      ("prize_amount_icp", Json.str(Text.concat(Nat.toText(result.prizeAmount / 100_000_000), "." # prizeDecimalStr))),
                    ]);
                    resultsArray := Array.append(resultsArray, [resultJson]);
                  };
                };
                case (null) {};
              };

              let statusText = switch (race.status) {
                case (#Upcoming) { "Upcoming" };
                case (#InProgress) { "In Progress" };
                case (#Completed) { "Completed" };
                case (#Cancelled) { "Cancelled" };
              };

              let classText = switch (race.raceClass) {
                case (#Scrap) { "Scrap (<1200 ELO)" };
                case (#Junker) { "Junker (1200-1399 ELO)" };
                case (#Raider) { "Raider (1400-1599 ELO)" };
                case (#Elite) { "Elite (1600-1799 ELO)" };
                case (#SilentKlan) { "Silent Klan Invitational (1800+ ELO)" };
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

              let entryFeeDecimal = (race.entryFee % 100_000_000) / 1_000_000;
              let entryFeeDecimalStr = if (entryFeeDecimal < 10) {
                "0" # Nat.toText(entryFeeDecimal);
              } else { Nat.toText(entryFeeDecimal) };

              // Total prize pool includes entry fees, sponsorships, and platform bonus
              let totalPrizePool = race.prizePool + race.platformBonus;
              let prizePoolDecimal = (totalPrizePool % 100_000_000) / 1_000_000;
              let prizePoolDecimalStr = if (prizePoolDecimal < 10) {
                "0" # Nat.toText(prizePoolDecimal);
              } else { Nat.toText(prizePoolDecimal) };

              let response = Json.obj([
                ("race_id", Json.int(race.raceId)),
                ("name", Json.str(race.name)),
                ("status", Json.str(statusText)),
                ("class", Json.str(classText)),
                ("distance_km", Json.int(race.distance)),
                ("terrain", Json.str(terrainText)),
                ("duration_seconds", Json.int(race.duration)),
                ("entry_fee_icp", Json.str(Text.concat(Nat.toText(race.entryFee / 100_000_000), "." # entryFeeDecimalStr))),
                ("prize_pool_icp", Json.str(Text.concat(Nat.toText(totalPrizePool / 100_000_000), "." # prizePoolDecimalStr))),
                ("platform_bonus_icp", Json.str(Text.concat(Nat.toText(race.platformBonus / 100_000_000), "." # Nat.toText((race.platformBonus % 100_000_000) / 1_000_000)))),
                ("min_entries", Json.int(race.minEntries)),
                ("max_entries", Json.int(race.maxEntries)),
                ("current_entries", Json.int(race.entries.size())),
                ("spots_left", Json.int(race.maxEntries - race.entries.size())),
                ("start_time", Json.int(race.startTime)),
                ("entry_deadline", Json.int(race.entryDeadline)),
                ("starts_in_hours", Json.int(hoursUntilStart)),
                ("starts_in_minutes", Json.int(minutesUntilStart)),
                ("entry_deadline_minutes", Json.int(minutesUntilDeadline)),
                ("created_at", Json.int(race.createdAt)),
                ("entries", Json.arr(entriesArray)),
                ("sponsors", Json.arr(sponsorsArray)),
                ("results", Json.arr(resultsArray)),
              ]);

              ToolContext.makeSuccess(response, cb);
            };
            case (null) {
              return ToolContext.makeError("Race #" # Nat.toText(raceId) # " not found", cb);
            };
          };
        };
        case (null) {
          return ToolContext.makeError("Invalid race_id. Must be a number.", cb);
        };
      };
    };
  };
};
