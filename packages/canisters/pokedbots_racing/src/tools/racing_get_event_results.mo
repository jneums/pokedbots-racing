import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Map "mo:map/Map";
import Iter "mo:base/Iter";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import RaceCalendar "../RaceCalendar";
import RacingSimulator "../RacingSimulator";
import TimeUtils "../TimeUtils";

module {
  public func config() : McpTypes.Tool = {
    name = "racing_get_event_results";
    title = ?"Get Event Results";
    description = ?"Get event results: cumulative standings, individual race results, and prize distribution. Supports Cumulative, TeamAggregate, and Individual scoring modes.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("event_id", Json.obj([("type", Json.str("number")), ("description", Json.str("The event ID to get results for"))]))])),
      ("required", Json.arr([Json.str("event_id")])),
    ]);
    outputSchema = null;
  };

  public func handle(ctx : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {
      let eventIdOpt = Result.toOption(Json.getAsNat(_args, "event_id"));

      switch (eventIdOpt) {
        case (?eventId) {
          switch (ctx.eventCalendar.getEvent(eventId)) {
            case (?event) {
              let now = Time.now();

              // Determine if this is a multi-stage event
              let isMultiStage = switch (event.metadata.scoringMode) {
                case (#Cumulative) { true };
                case (#TeamAggregate) { true };
                case (#Individual) { false };
                case (#Elimination) { false };
              };

              let scoringModeText = switch (event.metadata.scoringMode) {
                case (#Cumulative) { "Cumulative" };
                case (#TeamAggregate) { "TeamAggregate" };
                case (#Individual) { "Individual" };
                case (#Elimination) { "Elimination" };
              };

              // Calculate total prize pool from registrations
              var totalPrizePool : Nat = event.metadata.prizePoolBonus + event.metadata.eventBonusPrize;
              for (registration in event.registrations.vals()) {
                let classFeeMultiplier : Float = switch (registration.raceClass) {
                  case (#Scrap) { 1.0 };
                  case (#Junker) { 1.5 };
                  case (#Raider) { 2.0 };
                  case (#Elite) { 2.5 };
                  case (#SilentKlan) { 3.0 };
                };
                totalPrizePool += Int.abs(Float.toInt(Float.fromInt(event.metadata.entryFee) * classFeeMultiplier));
              };

              // Apply 5% platform tax
              let platformTax = (totalPrizePool * 5) / 100;
              let netPrizePool = Nat.sub(totalPrizePool, platformTax);

              // Build per-race results and calculate cumulative standings
              var raceResultsArray : [Json.Json] = [];
              var botPoints = Map.new<Nat, Nat>(); // tokenIndex -> total points
              var botOwners = Map.new<Nat, Principal>(); // tokenIndex -> owner
              var botRaceResults = Map.new<Nat, [Json.Json]>(); // tokenIndex -> race result JSONs
              var factionPoints = Map.new<Text, Nat>(); // faction -> total points
              var factionMembers = Map.new<Text, [(Nat, Principal, Nat)]>(); // faction -> (tokenIndex, owner, points)[]

              // Count completed races
              var completedRaces : Nat = 0;
              var totalRaces : Nat = event.raceIds.size();

              for (raceId in event.raceIds.vals()) {
                switch (ctx.raceManager.getRace(raceId)) {
                  case (?race) {
                    let isCompleted = switch (race.status) {
                      case (#Completed) { true };
                      case _ { false };
                    };
                    if (isCompleted) { completedRaces += 1 };

                    let statusText = switch (race.status) {
                      case (#Upcoming) { "Upcoming" };
                      case (#InProgress) { "In Progress" };
                      case (#Completed) { "Completed" };
                      case (#Cancelled) { "Cancelled" };
                    };

                    let terrainText = switch (race.terrain) {
                      case (#ScrapHeaps) { "Scrap Heaps" };
                      case (#WastelandSand) { "Wasteland Sand" };
                      case (#MetalRoads) { "Metal Roads" };
                    };

                    // Build race results
                    var resultsForRace : [Json.Json] = [];
                    switch (race.results) {
                      case (?results) {
                        for (result in results.vals()) {
                          let tokenIdx = switch (Nat.fromText(result.nftId)) {
                            case (?idx) { idx };
                            case (null) { 0 };
                          };

                          // Calculate points for this position (used for cumulative)
                          let positionPoints : Nat = if (result.position == 1) {
                            10;
                          } else if (result.position == 2) {
                            6;
                          } else if (result.position == 3) {
                            4;
                          } else if (result.position == 4) {
                            2;
                          } else { 1 };

                          // Update cumulative points
                          let currentPoints = switch (Map.get(botPoints, Map.nhash, tokenIdx)) {
                            case (?pts) { pts };
                            case (null) { 0 };
                          };
                          ignore Map.put(botPoints, Map.nhash, tokenIdx, currentPoints + positionPoints);
                          ignore Map.put(botOwners, Map.nhash, tokenIdx, result.owner);

                          // Update faction standings
                          switch (ctx.getStats(tokenIdx)) {
                            case (?botStats) {
                              let factionKey = switch (botStats.faction) {
                                // Ultra-Rare
                                case (#UltimateMaster) { "UltimateMaster" };
                                case (#Wild) { "Wild" };
                                case (#Golden) { "Golden" };
                                case (#Ultimate) { "Ultimate" };
                                // Super-Rare
                                case (#Blackhole) { "Blackhole" };
                                case (#Dead) { "Dead" };
                                case (#Master) { "Master" };
                                // Rare
                                case (#Bee) { "Bee" };
                                case (#Food) { "Food" };
                                case (#Box) { "Box" };
                                case (#Murder) { "Murder" };
                                // Common
                                case (#Game) { "Game" };
                                case (#Animal) { "Animal" };
                                case (#Industrial) { "Industrial" };
                              };

                              // Update faction total
                              let currentFactionPoints = switch (Map.get(factionPoints, Map.thash, factionKey)) {
                                case (?pts) { pts };
                                case (null) { 0 };
                              };
                              ignore Map.put(factionPoints, Map.thash, factionKey, currentFactionPoints + positionPoints);

                              // Track faction members
                              let currentMembers = switch (Map.get(factionMembers, Map.thash, factionKey)) {
                                case (?members) { members };
                                case (null) { [] };
                              };
                              var found = false;
                              var updatedMembers : [(Nat, Principal, Nat)] = [];
                              for ((idx, owner, pts) in currentMembers.vals()) {
                                if (idx == tokenIdx) {
                                  updatedMembers := Array.append(updatedMembers, [(idx, owner, pts + positionPoints)]);
                                  found := true;
                                } else {
                                  updatedMembers := Array.append(updatedMembers, [(idx, owner, pts)]);
                                };
                              };
                              if (not found) {
                                updatedMembers := Array.append(updatedMembers, [(tokenIdx, result.owner, positionPoints)]);
                              };
                              ignore Map.put(factionMembers, Map.thash, factionKey, updatedMembers);
                            };
                            case (null) {};
                          };

                          // Track per-bot race results
                          let currentBotResults = switch (Map.get(botRaceResults, Map.nhash, tokenIdx)) {
                            case (?rr) { rr };
                            case (null) { [] };
                          };
                          let raceResultJson = Json.obj([
                            ("race_id", Json.int(raceId)),
                            ("stage_name", Json.str(race.name)),
                            ("position", Json.int(result.position)),
                            ("points", Json.int(positionPoints)),
                            ("final_time_seconds", Json.float(result.finalTime)),
                          ]);
                          ignore Map.put(botRaceResults, Map.nhash, tokenIdx, Array.append(currentBotResults, [raceResultJson]));

                          // Build result JSON for this race
                          let timeInt = Float.toInt(result.finalTime * 1000.0);
                          let resultJson = Json.obj([
                            ("position", Json.int(result.position)),
                            ("nft_id", Json.str(result.nftId)),
                            ("owner", Json.str(Principal.toText(result.owner))),
                            ("final_time_seconds", Json.str(Text.concat(Nat.toText(Int.abs(timeInt) / 1000), "." # Nat.toText((Int.abs(timeInt) % 1000) / 100)))),
                            ("points_earned", Json.int(positionPoints)),
                          ]);
                          resultsForRace := Array.append(resultsForRace, [resultJson]);
                        };
                      };
                      case (null) {};
                    };

                    let raceJson = Json.obj([
                      ("race_id", Json.int(raceId)),
                      ("name", Json.str(race.name)),
                      ("status", Json.str(statusText)),
                      ("terrain", Json.str(terrainText)),
                      ("distance_km", Json.int(race.distance)),
                      ("entries_count", Json.int(race.entries.size())),
                      ("start_time_utc", Json.str(TimeUtils.nanosToUtcString(race.startTime))),
                      ("results", Json.arr(resultsForRace)),
                    ]);
                    raceResultsArray := Array.append(raceResultsArray, [raceJson]);
                  };
                  case (null) {};
                };
              };

              // Build cumulative standings (sorted by points) with tie-splitting
              var cumulativeStandingsArray : [Json.Json] = [];
              if (event.metadata.scoringMode == #Cumulative) {
                let botEntries = Iter.toArray(Map.entries(botPoints));
                let sortedBots = Array.sort<(Nat, Nat)>(
                  botEntries,
                  func(a : (Nat, Nat), b : (Nat, Nat)) : {
                    #less;
                    #greater;
                    #equal;
                  } {
                    if (a.1 > b.1) { #less } else if (a.1 < b.1) { #greater } else {
                      #equal;
                    };
                  },
                );

                // Prize percentages for positions 1-4: 45%, 28%, 18%, 9%
                let prizePercentages : [Nat] = [45, 28, 18, 9];

                // Process with tie-splitting
                var pos : Nat = 0;
                while (pos < sortedBots.size()) {
                  let (currentTokenIdx, currentPoints) = sortedBots[pos];

                  // Find all bots tied at this position
                  var tieGroupSize : Nat = 1;
                  var tieGroupEnd : Nat = pos + 1;
                  while (tieGroupEnd < sortedBots.size()) {
                    let (_, nextPoints) = sortedBots[tieGroupEnd];
                    if (nextPoints == currentPoints) {
                      tieGroupSize += 1;
                      tieGroupEnd += 1;
                    } else {
                      tieGroupEnd := sortedBots.size(); // Exit loop
                    };
                  };

                  // Calculate combined prize percentage for all positions in tie group
                  var combinedPrizePercent : Nat = 0;
                  var posIdx : Nat = pos;
                  while (posIdx < pos + tieGroupSize and posIdx < 4) {
                    combinedPrizePercent += prizePercentages[posIdx];
                    posIdx += 1;
                  };

                  // Each bot in tie group gets equal share
                  let sharedPrizeAmount : Nat = if (tieGroupSize > 0 and combinedPrizePercent > 0) {
                    (netPrizePool * combinedPrizePercent) / (100 * tieGroupSize);
                  } else { 0 };

                  let prizeIcp = Float.fromInt(sharedPrizeAmount) / 100_000_000.0;

                  // Add each bot in the tie group with shared position notation
                  var tieIdx : Nat = pos;
                  while (tieIdx < pos + tieGroupSize) {
                    let (tokenIdx, points) = sortedBots[tieIdx];
                    let owner = switch (Map.get(botOwners, Map.nhash, tokenIdx)) {
                      case (?o) { o };
                      case (null) { Principal.fromText("aaaaa-aa") };
                    };
                    let raceResults = switch (Map.get(botRaceResults, Map.nhash, tokenIdx)) {
                      case (?rr) { rr };
                      case (null) { [] };
                    };

                    // Display position: show "T1" for tie at position 1, etc.
                    let displayPos : Nat = pos + 1;

                    let standingJson = Json.obj([
                      ("position", Json.int(displayPos)),
                      ("tied", Json.bool(tieGroupSize > 1)),
                      ("tie_group_size", Json.int(tieGroupSize)),
                      ("nft_id", Json.str(Nat.toText(tokenIdx))),
                      ("owner", Json.str(Principal.toText(owner))),
                      ("cumulative_points", Json.int(points)),
                      ("prize_amount_icp", Json.float(prizeIcp)),
                      ("race_results", Json.arr(raceResults)),
                    ]);
                    cumulativeStandingsArray := Array.append(cumulativeStandingsArray, [standingJson]);
                    tieIdx += 1;
                  };

                  pos += tieGroupSize;
                };
              };

              // Build faction standings (sorted by points)
              var factionStandingsArray : [Json.Json] = [];
              if (event.metadata.scoringMode == #TeamAggregate) {
                let factionEntries = Iter.toArray(Map.entries(factionPoints));
                let sortedFactions = Array.sort<(Text, Nat)>(
                  factionEntries,
                  func(a : (Text, Nat), b : (Text, Nat)) : {
                    #less;
                    #greater;
                    #equal;
                  } {
                    if (a.1 > b.1) { #less } else if (a.1 < b.1) { #greater } else {
                      #equal;
                    };
                  },
                );

                var pos : Nat = 1;
                for ((faction, points) in sortedFactions.vals()) {
                  let members = switch (Map.get(factionMembers, Map.thash, faction)) {
                    case (?m) { m };
                    case (null) { [] };
                  };

                  // Build members array
                  var membersArray : [Json.Json] = [];
                  for ((tokenIdx, owner, memberPoints) in members.vals()) {
                    let memberJson = Json.obj([
                      ("nft_id", Json.str(Nat.toText(tokenIdx))),
                      ("owner", Json.str(Principal.toText(owner))),
                      ("points", Json.int(memberPoints)),
                    ]);
                    membersArray := Array.append(membersArray, [memberJson]);
                  };

                  // Only winning faction gets prize
                  let prizePerMember : Nat = if (pos == 1 and members.size() > 0) {
                    netPrizePool / members.size();
                  } else { 0 };

                  let prizePerMemberIcp = Float.fromInt(prizePerMember) / 100_000_000.0;

                  let factionJson = Json.obj([
                    ("position", Json.int(pos)),
                    ("faction", Json.str(faction)),
                    ("total_points", Json.int(points)),
                    ("member_count", Json.int(members.size())),
                    ("prize_per_member_icp", Json.float(prizePerMemberIcp)),
                    ("members", Json.arr(membersArray)),
                  ]);
                  factionStandingsArray := Array.append(factionStandingsArray, [factionJson]);
                  pos += 1;
                };
              };

              // Event status
              let statusText = switch (event.status) {
                case (#Announced) { "Announced" };
                case (#RegistrationOpen) { "Registration Open" };
                case (#RegistrationClosed) { "Registration Closed" };
                case (#InProgress) { "In Progress" };
                case (#Completed) { "Completed" };
                case (#Cancelled) { "Cancelled" };
              };

              // Event type
              let eventTypeText = switch (event.eventType) {
                case (#WeeklyLeague) { "Weekly League" };
                case (#DailySprint) { "Daily Sprint" };
                case (#MonthlyCup) { "Monthly Cup" };
                case (#SpecialEvent(name)) { "Special Event: " # name };
              };

              // Format prize pool
              let totalPrizeIcp = Float.fromInt(totalPrizePool) / 100_000_000.0;
              let netPrizeIcp = Float.fromInt(netPrizePool) / 100_000_000.0;
              let platformTaxIcp = Float.fromInt(platformTax) / 100_000_000.0;

              let response = Json.obj([
                ("event_id", Json.int(eventId)),
                ("name", Json.str(event.metadata.name)),
                ("event_type", Json.str(eventTypeText)),
                ("status", Json.str(statusText)),
                ("scoring_mode", Json.str(scoringModeText)),
                ("is_multi_stage", Json.bool(isMultiStage)),
                ("total_registrations", Json.int(event.registrations.size())),
                ("races_completed", Json.int(completedRaces)),
                ("total_races", Json.int(totalRaces)),
                ("total_prize_pool_icp", Json.float(totalPrizeIcp)),
                ("platform_tax_icp", Json.float(platformTaxIcp)),
                ("net_prize_pool_icp", Json.float(netPrizeIcp)),
                ("cumulative_standings", Json.arr(cumulativeStandingsArray)),
                ("faction_standings", Json.arr(factionStandingsArray)),
                ("race_results", Json.arr(raceResultsArray)),
              ]);

              ToolContext.makeSuccess(response, cb);
            };
            case (null) {
              return ToolContext.makeError("Event #" # Nat.toText(eventId) # " not found", cb);
            };
          };
        };
        case (null) {
          return ToolContext.makeError("Invalid event_id. Must be a number.", cb);
        };
      };
    };
  };
};
