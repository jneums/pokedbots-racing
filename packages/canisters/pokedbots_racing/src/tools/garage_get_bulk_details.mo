import Result "mo:base/Result";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Buffer "mo:base/Buffer";
import Time "mo:base/Time";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import RaceClassUtils "../RaceClassUtils";
import TimeUtils "../TimeUtils";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_get_bulk_details";
    title = ?"Get Bulk Bot Details";
    description = ?"Get details for up to 20 bots at once: battery, condition, activity, recommended action, race readiness. Only returns bots you own. Pass 'fields' array to limit output.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([
        ("token_indices", Json.obj([
          ("type", Json.str("array")),
          ("items", Json.obj([("type", Json.str("number"))])),
          ("description", Json.str("Array of token indices to check (max 20 per request)")),
        ])),
        ("fields", Json.obj([
          ("type", Json.str("array")),
          ("items", Json.obj([("type", Json.str("string"))])),
          ("description", Json.str("Optional field filter. Available: condition, activity, recommendation, stats, career, rating. If omitted, all fields are returned.")),
        ])),
      ])),
      ("required", Json.arr([Json.str("token_indices")])),
    ]);
    outputSchema = null;
  };

  public func handle(ctx : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {
      // Authentication required
      let user = switch (_auth) {
        case (null) {
          return ToolContext.makeError("Authentication required", cb);
        };
        case (?auth) { auth.principal };
      };

      // Parse token_indices array
      let tokenIndicesRaw = switch (Result.toOption(Json.getAsArray(_args, "token_indices"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: token_indices (array of numbers)", cb);
        };
        case (?arr) { arr };
      };

      // Convert JSON array to Nat array with validation
      var tokenIndices : [Nat] = [];
      for (item in tokenIndicesRaw.vals()) {
        switch (item) {
          case (#number(#int(n))) {
            let idx = Int.abs(n);
            if (idx <= 9999) {
              tokenIndices := Array.append(tokenIndices, [idx]);
            };
          };
          case (#number(#float(n))) {
            let idx = Int.abs(Float.toInt(n));
            if (idx <= 9999) {
              tokenIndices := Array.append(tokenIndices, [idx]);
            };
          };
          case (_) {}; // Skip non-numbers
        };
      };

      // Cap at 20 bots
      if (tokenIndices.size() > 20) {
        return ToolContext.makeError("Maximum 20 token indices per request. Received " # Nat.toText(tokenIndices.size()) # ". Split into multiple calls.", cb);
      };

      if (tokenIndices.size() == 0) {
        return ToolContext.makeError("No valid token indices provided. Indices must be numbers 0-9999.", cb);
      };

      // Parse optional fields filter
      let fieldsFilter : ?[Text] = switch (Result.toOption(Json.getAsArray(_args, "fields"))) {
        case (null) { null };
        case (?arr) {
          var fields : [Text] = [];
          for (item in arr.vals()) {
            switch (item) {
              case (#string(s)) {
                fields := Array.append(fields, [s]);
              };
              case (_) {};
            };
          };
          if (fields.size() > 0) { ?fields } else { null };
        };
      };

      // Helper to check if a field is requested
      func includeField(name : Text) : Bool {
        switch (fieldsFilter) {
          case (null) { true }; // No filter = include all
          case (?fields) {
            for (f in fields.vals()) {
              if (f == name) { return true };
            };
            false;
          };
        };
      };

      let REPAIR_COOLDOWN : Int = 43200000000000; // 12 hours in nanoseconds
      let now = Time.now();

      let botsBuffer = Buffer.Buffer<Json.Json>(tokenIndices.size());
      let errorsBuffer = Buffer.Buffer<Json.Json>(0);

      for (tokenIndex in tokenIndices.vals()) {
        // Get racing stats
        let racingStatsOpt = ctx.garageManager.getStats(tokenIndex);

        switch (racingStatsOpt) {
          case (null) {
            // Bot not initialized
            errorsBuffer.add(Json.obj([
              ("token_index", Json.int(tokenIndex)),
              ("error", Json.str("not_initialized")),
              ("message", Json.str("Bot #" # Nat.toText(tokenIndex) # " has not been initialized for racing.")),
            ]));
          };
          case (?racingStats) {
            // Verify ownership
            if (racingStats.ownerPrincipal != user) {
              errorsBuffer.add(Json.obj([
                ("token_index", Json.int(tokenIndex)),
                ("error", Json.str("not_owner")),
                ("message", Json.str("You do not own Bot #" # Nat.toText(tokenIndex) # ".")),
              ]));
            } else {
            // Project scavenging rewards read-only (NO state mutation)
              let projectedStats = switch (racingStats.activeMission) {
                case (?_mission) {
                  switch (ctx.garageManager.calculateScavengingRewardsReadOnly(tokenIndex, racingStats, now)) {
                    case (#ok(projected)) { projected };
                    case (#err(_)) { racingStats };
                  };
                };
                case (null) { racingStats };
              };

              // Calculate rating and race class
              let overallRating = ctx.garageManager.calculateRatingAt100(racingStats);
              let raceClassVariant = RaceClassUtils.getRaceClassFromRating(overallRating);
              let raceClass = RaceClassUtils.getClassDescription(raceClassVariant);

              // Get current stats (using projected values for accurate battery/condition)
              let currentStats = ctx.garageManager.getCurrentStats(projectedStats);
              let baseStats = ctx.garageManager.getBaseStats(tokenIndex);

              // Maintenance recommendation (use projected battery/condition)
              let repairReady = switch (projectedStats.lastRepaired) {
                case (?lastTime) { now - lastTime >= REPAIR_COOLDOWN };
                case (null) { true };
              };
              let recommendedAction = if (projectedStats.condition < 50 and repairReady) {
                "RepairBay";
              } else if (projectedStats.battery < 30) {
                "ChargingStation";
              } else if (projectedStats.condition < 80 and repairReady) {
                "RepairBay";
              } else if (projectedStats.battery < 80) {
                "ChargingStation";
              } else if (projectedStats.overcharge == 0) {
                "Jolt";
              } else {
                "None";
              };

              // Can race check (use projected values)
              let canRace = projectedStats.battery >= 30 and projectedStats.condition >= 50;

              // Activity status — canonical source of truth (same as garage_list_my_pokedbots
              // and garage_complete_scavenging preconditions)
              let canonical = ctx.garageManager.getCanonicalActivity(tokenIndex);
              let (actType, actZone, actStarted, actCanCollect) : (Text, ?Text, ?Int, ?Bool) = switch (canonical.zoneVariant) {
                case (?_) {
                  (canonical.activityType, canonical.zone, canonical.startedAt, ?canonical.canCollectNow);
                };
                case (null) {
                  if (ctx.isInActiveRace(tokenIndex)) {
                    ("racing", null, null, null);
                  } else {
                    switch (ctx.garageManager.getActiveUpgrade(tokenIndex)) {
                      case (?_upgrade) { ("upgrading", null, null, null) };
                      case (null) { ("idle", null, null, null) };
                    };
                  };
                };
              };

              // Bot name
              let botName = switch (racingStats.name) {
                case (?n) { n };
                case (null) { "Bot #" # Nat.toText(tokenIndex) };
              };

              // Faction text
              let factionText = switch (racingStats.faction) {
                case (#UltimateMaster) { "Ultimate-Master" };
                case (#Wild) { "Wild" };
                case (#Golden) { "Golden" };
                case (#Ultimate) { "Ultimate" };
                case (#Blackhole) { "Blackhole" };
                case (#Dead) { "Dead" };
                case (#Master) { "Master" };
                case (#Bee) { "Bee" };
                case (#Food) { "Food" };
                case (#Box) { "Box" };
                case (#Murder) { "Murder" };
                case (#Game) { "Game" };
                case (#Animal) { "Animal" };
                case (#Industrial) { "Industrial" };
              };

              // Build bot entry - always include core fields
              let fieldsBuffer = Buffer.Buffer<(Text, Json.Json)>(16);
              fieldsBuffer.add(("token_index", Json.int(tokenIndex)));
              fieldsBuffer.add(("name", Json.str(botName)));
              fieldsBuffer.add(("faction", Json.str(factionText)));

              // Condition fields (battery, condition, overcharge) — use projected values
              if (includeField("condition")) {
                fieldsBuffer.add(("battery", Json.int(projectedStats.battery)));
                fieldsBuffer.add(("condition", Json.int(projectedStats.condition)));
                fieldsBuffer.add(("overcharge", Json.int(projectedStats.overcharge)));
              };

              // Activity status
              if (includeField("activity")) {
                fieldsBuffer.add(("activity", Json.obj([
                  ("type", Json.str(actType)),
                  ("zone", switch (actZone) { case (?z) { Json.str(z) }; case (null) { Json.nullable() } }),
                  ("started_at", switch (actStarted) { case (?t) { Json.str(TimeUtils.nanosToUtcString(t)) }; case (null) { Json.nullable() } }),
                  ("can_collect_now", switch (actCanCollect) { case (?b) { Json.bool(b) }; case (null) { Json.nullable() } }),
                ])));
              };

              // Recommendation
              if (includeField("recommendation")) {
                fieldsBuffer.add(("recommended_action", Json.str(recommendedAction)));
                fieldsBuffer.add(("can_race", Json.bool(canRace)));
              };

              // Rating
              if (includeField("rating")) {
                fieldsBuffer.add(("overall_rating", Json.int(overallRating)));
                fieldsBuffer.add(("race_class", Json.str(raceClass)));
              };

              // Stats
              if (includeField("stats")) {
                fieldsBuffer.add(("stats", Json.obj([
                  ("speed", Json.int(currentStats.speed)),
                  ("power_core", Json.int(currentStats.powerCore)),
                  ("acceleration", Json.int(currentStats.acceleration)),
                  ("stability", Json.int(currentStats.stability)),
                  ("base_speed", Json.int(baseStats.speed)),
                  ("base_power_core", Json.int(baseStats.powerCore)),
                  ("base_acceleration", Json.int(baseStats.acceleration)),
                  ("base_stability", Json.int(baseStats.stability)),
                ])));
              };

              // Career
              if (includeField("career")) {
                fieldsBuffer.add(("career", Json.obj([
                  ("races_entered", Json.int(racingStats.racesEntered)),
                  ("wins", Json.int(racingStats.wins)),
                  ("places", Json.int(racingStats.places)),
                  ("shows", Json.int(racingStats.shows)),
                  ("total_scrap_earned", Json.int(racingStats.totalScrapEarned)),
                ])));
              };

              botsBuffer.add(Json.obj(Buffer.toArray(fieldsBuffer)));
            };
          };
        };
      };

      // Build response
      let responseFields = Buffer.Buffer<(Text, Json.Json)>(4);
      responseFields.add(("message", Json.str("🤖 Bulk Bot Details (" # Nat.toText(botsBuffer.size()) # " bots)")));
      responseFields.add(("count", Json.int(botsBuffer.size())));
      responseFields.add(("bots", Json.arr(Buffer.toArray(botsBuffer))));

      if (errorsBuffer.size() > 0) {
        responseFields.add(("errors", Json.arr(Buffer.toArray(errorsBuffer))));
        responseFields.add(("error_count", Json.int(errorsBuffer.size())));
      };

      let response = Json.obj(Buffer.toArray(responseFields));
      ToolContext.makeSuccess(response, cb);
    };
  };
};
