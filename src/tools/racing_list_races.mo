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
    description = ?"View upcoming wasteland races. Returns 5 races per page. Filter by class, terrain, status, distance, or bot eligibility. Use after_race_id for pagination.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([
        ("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Your bot's token index. When provided, only shows races this bot is eligible to enter."))])), 
        ("after_race_id", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Race ID to start after. Returns the next 5 races after this ID."))])),
        ("race_class", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("Scavenger"), Json.str("Raider"), Json.str("Elite"), Json.str("SilentKlan")])), ("description", Json.str("Optional: Filter by race class"))])),
        ("terrain", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("ScrapHeaps"), Json.str("WastelandSand"), Json.str("MetalRoads")])), ("description", Json.str("Optional: Filter by terrain type"))])),
        ("status", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("open"), Json.str("full"), Json.str("closed")])), ("description", Json.str("Optional: Filter by entry status - open (accepting entries), full (max entries reached), closed (past deadline)"))])),
        ("min_distance", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Minimum race distance in km"))])),
        ("max_distance", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Maximum race distance in km"))])),
        ("has_spots", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Only show races with available spots (true) or full races (false)"))])),
        ("sort_by", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("prize_pool"), Json.str("start_time"), Json.str("entry_fee"), Json.str("distance")])), ("description", Json.str("Optional: Sort races by prize_pool (highest first), start_time (soonest first), entry_fee (lowest first), or distance (shortest first). Default: start_time"))])),
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
      let tokenIndexOpt = Result.toOption(Json.getAsNat(_args, "token_index"));
      let afterRaceIdOpt = Result.toOption(Json.getAsNat(_args, "after_race_id"));
      
      // Parse filter parameters
      let raceClassFilter = Result.toOption(Json.getAsText(_args, "race_class"));
      let terrainFilter = Result.toOption(Json.getAsText(_args, "terrain"));
      let statusFilter = Result.toOption(Json.getAsText(_args, "status"));
      let minDistanceOpt = Result.toOption(Json.getAsNat(_args, "min_distance"));
      let maxDistanceOpt = Result.toOption(Json.getAsNat(_args, "max_distance"));
      let hasSpotsOpt = Result.toOption(Json.getAsBool(_args, "has_spots"));
      let sortByOpt = Result.toOption(Json.getAsText(_args, "sort_by"));

      let pageSize = 5;

      // Get races based on token_index filter
      let allRaces = switch (tokenIndexOpt) {
        case (?tokenIndex) {
          // Filter by bot's eligibility when token_index is provided
          switch (ctx.racingStatsManager.getStats(tokenIndex)) {
            case (?botStats) {
              // Check ownership - if transferred, show all races instead of bot-specific
              if (not Principal.equal(botStats.ownerPrincipal, user)) {
                // Bot was transferred - show all races instead
                ctx.raceManager.getUpcomingRaces();
              } else {
                ctx.raceManager.getAvailableRacesForBot(botStats, now);
              };
            };
            case (null) {
              return ToolContext.makeError("Bot not initialized for racing", cb);
            };
          };
        };
        case (null) {
          // Default: show all upcoming races when no token_index provided
          ctx.raceManager.getUpcomingRaces();
        };
      };

      if (allRaces.size() == 0) {
        return ToolContext.makeTextSuccess("🏜️ No races currently available. The wasteland is quiet... for now.", cb);
      };

      // Apply additional filters
      var filteredRaces = allRaces;
      
      // Filter by race class
      filteredRaces := switch (raceClassFilter) {
        case (?className) {
          Array.filter<Racing.Race>(filteredRaces, func(r) {
            let classMatch = switch (r.raceClass, className) {
              case (#Scavenger, "Scavenger") { true };
              case (#Raider, "Raider") { true };
              case (#Elite, "Elite") { true };
              case (#SilentKlan, "SilentKlan") { true };
              case _ { false };
            };
            classMatch;
          });
        };
        case (null) { filteredRaces };
      };
      
      // Filter by terrain
      filteredRaces := switch (terrainFilter) {
        case (?terrainType) {
          Array.filter<Racing.Race>(filteredRaces, func(r) {
            let terrainMatch = switch (r.terrain, terrainType) {
              case (#ScrapHeaps, "ScrapHeaps") { true };
              case (#WastelandSand, "WastelandSand") { true };
              case (#MetalRoads, "MetalRoads") { true };
              case _ { false };
            };
            terrainMatch;
          });
        };
        case (null) { filteredRaces };
      };
      
      // Filter by status
      filteredRaces := switch (statusFilter) {
        case (?status) {
          Array.filter<Racing.Race>(filteredRaces, func(r) {
            let isOpen = r.status == #Upcoming and now < r.entryDeadline and r.entries.size() < r.maxEntries;
            let isFull = r.status == #Upcoming and r.entries.size() >= r.maxEntries;
            let isClosed = r.status == #Upcoming and now >= r.entryDeadline;
            
            switch (status) {
              case ("open") { isOpen };
              case ("full") { isFull };
              case ("closed") { isClosed };
              case _ { true };
            };
          });
        };
        case (null) { filteredRaces };
      };
      
      // Filter by distance range
      filteredRaces := switch (minDistanceOpt) {
        case (?minDist) {
          Array.filter<Racing.Race>(filteredRaces, func(r) { r.distance >= minDist });
        };
        case (null) { filteredRaces };
      };
      
      filteredRaces := switch (maxDistanceOpt) {
        case (?maxDist) {
          Array.filter<Racing.Race>(filteredRaces, func(r) { r.distance <= maxDist });
        };
        case (null) { filteredRaces };
      };
      
      // Filter by spots available
      filteredRaces := switch (hasSpotsOpt) {
        case (?hasSpots) {
          Array.filter<Racing.Race>(filteredRaces, func(r) {
            let spotsAvailable = r.entries.size() < r.maxEntries;
            if (hasSpots) { spotsAvailable } else { not spotsAvailable };
          });
        };
        case (null) { filteredRaces };
      };
      
      if (filteredRaces.size() == 0) {
        return ToolContext.makeTextSuccess("🏜️ No races match your filters. Try adjusting your search criteria.", cb);
      };

      // Apply sorting
      let sortedRaces = switch (sortByOpt) {
        case (?"prize_pool") {
          Array.sort<Racing.Race>(filteredRaces, func(a, b) {
            if (a.prizePool > b.prizePool) { #less }
            else if (a.prizePool < b.prizePool) { #greater }
            else { #equal };
          });
        };
        case (?"entry_fee") {
          Array.sort<Racing.Race>(filteredRaces, func(a, b) {
            if (a.entryFee < b.entryFee) { #less }
            else if (a.entryFee > b.entryFee) { #greater }
            else { #equal };
          });
        };
        case (?"distance") {
          Array.sort<Racing.Race>(filteredRaces, func(a, b) {
            if (a.distance < b.distance) { #less }
            else if (a.distance > b.distance) { #greater }
            else { #equal };
          });
        };
        case (?"start_time") {
          Array.sort<Racing.Race>(filteredRaces, func(a, b) {
            if (a.startTime < b.startTime) { #less }
            else if (a.startTime > b.startTime) { #greater }
            else { #equal };
          });
        };
        case (_) {
          // Default: sort by start time (soonest first)
          Array.sort<Racing.Race>(filteredRaces, func(a, b) {
            if (a.startTime < b.startTime) { #less }
            else if (a.startTime > b.startTime) { #greater }
            else { #equal };
          });
        };
      };

      // Apply cursor-based pagination
      var startIdx = 0;
      switch (afterRaceIdOpt) {
        case (?afterRaceId) {
          // Find the position after the cursor race
          label finding for (i in sortedRaces.keys()) {
            if (sortedRaces[i].raceId == afterRaceId) {
              startIdx := i + 1;
              break finding;
            };
          };
        };
        case (null) {};
      };

      let totalRaces = sortedRaces.size();
      let endIdx = Nat.min(startIdx + pageSize, totalRaces);

      var races : [Racing.Race] = [];
      if (startIdx < totalRaces) {
        races := Array.subArray(sortedRaces, startIdx, endIdx - startIdx);
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

        // Build sponsors info
        var sponsorsArray : [Json.Json] = [];
        var totalSponsored : Nat = 0;
        for (sponsor in race.sponsors.vals()) {
          totalSponsored += sponsor.amount;

          let msgValue = switch (sponsor.message) {
            case (?msg) { Json.str(msg) };
            case (null) { Json.str("") };
          };

          let sponsorJson = Json.obj([
            ("sponsor", Json.str(Principal.toText(sponsor.sponsor))),
            ("amount_icp", Json.str(Text.concat(Nat.toText(sponsor.amount / 100_000_000), "." # Nat.toText((sponsor.amount % 100_000_000) / 1_000_000)))),
            ("message", msgValue),
          ]);
          sponsorsArray := Array.append(sponsorsArray, [sponsorJson]);
        };

        let raceJson = Json.obj([
          ("race_id", Json.int(race.raceId)),
          ("name", Json.str(race.name)),
          ("class", Json.str(classText)),
          ("distance_km", Json.int(race.distance)),
          ("duration_seconds", Json.int(race.duration)),
          ("terrain", Json.str(terrainText)),
          ("entry_fee_icp", Json.str(Text.concat("0.", Nat.toText(race.entryFee / 100000)))),
          ("prize_pool_icp", Json.str(Text.concat("0.", Nat.toText(race.prizePool / 100000)))),
          ("sponsored_icp", Json.str(Text.concat(Nat.toText(totalSponsored / 100_000_000), "." # Nat.toText((totalSponsored % 100_000_000) / 1_000_000)))),
          ("sponsors", Json.arr(sponsorsArray)),
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
        ("total_races", Json.int(totalRaces)),
        ("showing", Json.int(races.size())),
        ("has_more", Json.bool(endIdx < totalRaces)),
        (
          "next_cursor",
          if (endIdx < totalRaces and races.size() > 0) {
            Json.int(races[races.size() - 1].raceId);
          } else {
            Json.nullable();
          },
        ),
        ("races", Json.arr(raceArray)),
      ]);

      ToolContext.makeSuccess(response, cb);
    };
  };
};
