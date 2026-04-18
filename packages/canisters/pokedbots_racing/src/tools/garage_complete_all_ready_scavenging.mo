import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";

module {
  let MAX_COMPLETIONS : Nat = 20;

  func zoneToText(zone : PokedBotsGarage.ScavengingZone) : Text {
    switch (zone) {
      case (#ScrapHeaps) { "ScrapHeaps" };
      case (#AbandonedSettlements) { "AbandonedSettlements" };
      case (#DeadMachineFields) { "DeadMachineFields" };
      case (#RepairBay) { "RepairBay" };
      case (#ChargingStation) { "ChargingStation" };
    };
  };

  public func config() : McpTypes.Tool = {
    name = "garage_complete_all_ready_scavenging";
    title = ?"Complete All Ready Scavenging Missions";
    description = ?"Batch-complete active missions for all your bots. Processes up to 20 completions per call. Returns parts collected per bot and aggregate totals.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([])),
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

      // Get all caller's bots
      let ownerBots = ctx.garageManager.getBotsForOwner(user);

      if (ownerBots.size() == 0) {
        return ToolContext.makeError("You have no registered bots. Use garage_initialize_pokedbot first.", cb);
      };

      let garage = ctx.garageManager;
      let now = Time.now();

      let resultsBuf = Buffer.Buffer<Json.Json>(ownerBots.size());
      let stillActiveBuf = Buffer.Buffer<Json.Json>(ownerBots.size());
      var completedCount : Nat = 0;
      var skippedCount : Nat = 0;
      var errorCount : Nat = 0;
      let errorsBuf = Buffer.Buffer<Json.Json>(4);

      for (bot in ownerBots.vals()) {
        let tokenIndex = bot.tokenIndex;

        // Re-read authoritative state for each bot — the snapshot from
        // getBotsForOwner may be stale after prior iterations mutated state
        // (e.g. snapshotChargingStationBots can modify other bots).
        switch (garage.getStats(tokenIndex)) {
          case (null) {
            // Bot disappeared from stats (shouldn't happen normally)
            skippedCount += 1;
          };
          case (?stats) {
            // Check if bot has an active mission using FRESH state
            switch (stats.activeMission) {
              case (null) {
                // No active mission, skip
                skippedCount += 1;
              };
              case (?mission) {
                // Cap completions per call
                if (completedCount >= MAX_COMPLETIONS) {
                  stillActiveBuf.add(Json.obj([
                    ("token_index", Json.int(tokenIndex)),
                    ("zone", Json.str(zoneToText(mission.zone))),
                    ("reason", Json.str("max_completions_reached")),
                  ]));
                } else {
                  // Try to complete the mission
                  switch (garage.completeScavengingMissionV2(tokenIndex, now)) {
                    case (#err(e)) {
                      errorCount += 1;
                      errorsBuf.add(Json.obj([
                        ("token_index", Json.int(tokenIndex)),
                        ("zone", Json.str(zoneToText(mission.zone))),
                        ("error", Json.str(e)),
                      ]));
                    };
                    case (#ok(result)) {
                      // Record dedication activity DP for scavenging
                      ctx.dedicationManager.recordScavengingCompletion(tokenIndex, result.totalParts, now);

                      completedCount += 1;
                      resultsBuf.add(Json.obj([
                        ("token_index", Json.int(tokenIndex)),
                        ("zone", Json.str(zoneToText(mission.zone))),
                        ("parts_collected", Json.int(result.totalParts)),
                        ("hours_elapsed", Json.int(result.hoursOut)),
                        ("speed_chips", Json.int(result.speedChips)),
                        ("power_core_fragments", Json.int(result.powerCoreFragments)),
                        ("thruster_kits", Json.int(result.thrusterKits)),
                        ("gyro_modules", Json.int(result.gyroModules)),
                        ("universal_parts", Json.int(result.universalParts)),
                      ]));
                    };
                  };
                };
              };
            };
          };
        };
      };

      // Calculate aggregate totals
      var totalParts : Nat = 0;
      var totalSpeedChips : Nat = 0;
      var totalPowerCore : Nat = 0;
      var totalThrusterKits : Nat = 0;
      var totalGyroModules : Nat = 0;
      var totalUniversalParts : Nat = 0;

      let resultsArr = Buffer.toArray(resultsBuf);
      for (r in resultsArr.vals()) {
        switch (Json.getAsNat(r, "parts_collected")) {
          case (#ok(v)) { totalParts += v };
          case (#err(_)) {};
        };
        switch (Json.getAsNat(r, "speed_chips")) {
          case (#ok(v)) { totalSpeedChips += v };
          case (#err(_)) {};
        };
        switch (Json.getAsNat(r, "power_core_fragments")) {
          case (#ok(v)) { totalPowerCore += v };
          case (#err(_)) {};
        };
        switch (Json.getAsNat(r, "thruster_kits")) {
          case (#ok(v)) { totalThrusterKits += v };
          case (#err(_)) {};
        };
        switch (Json.getAsNat(r, "gyro_modules")) {
          case (#ok(v)) { totalGyroModules += v };
          case (#err(_)) {};
        };
        switch (Json.getAsNat(r, "universal_parts")) {
          case (#ok(v)) { totalUniversalParts += v };
          case (#err(_)) {};
        };
      };

      // Build response
      var fields = Buffer.Buffer<(Text, Json.Json)>(12);
      fields.add(("completed", Json.int(completedCount)));
      fields.add(("skipped", Json.int(skippedCount)));
      fields.add(("errors", Json.int(errorCount)));
      fields.add(("total_bots_checked", Json.int(ownerBots.size())));
      fields.add(("total_parts_collected", Json.int(totalParts)));
      fields.add(("total_speed_chips", Json.int(totalSpeedChips)));
      fields.add(("total_power_core_fragments", Json.int(totalPowerCore)));
      fields.add(("total_thruster_kits", Json.int(totalThrusterKits)));
      fields.add(("total_gyro_modules", Json.int(totalGyroModules)));
      fields.add(("total_universal_parts", Json.int(totalUniversalParts)));
      fields.add(("results", Json.arr(resultsArr)));
      fields.add(("still_active", Json.arr(Buffer.toArray(stillActiveBuf))));

      if (errorCount > 0) {
        fields.add(("error_details", Json.arr(Buffer.toArray(errorsBuf))));
      };

      // Summary message
      let msg = "✅ Batch complete: " # Nat.toText(completedCount) # " missions completed, " #
        Nat.toText(skippedCount) # " bots skipped (no mission), " #
        Nat.toText(totalParts) # " total parts collected." #
        (if (errorCount > 0) { " ⚠️ " # Nat.toText(errorCount) # " errors." } else { "" }) #
        (if (stillActiveBuf.size() > 0) { " " # Nat.toText(stillActiveBuf.size()) # " missions deferred (cap reached)." } else { "" });

      fields.add(("message", Json.str(msg)));

      let response = Json.obj(Buffer.toArray(fields));
      ToolContext.makeSuccess(response, cb);
    };
  };
};
