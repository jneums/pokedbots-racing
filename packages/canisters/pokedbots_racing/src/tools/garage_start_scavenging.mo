import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Float "mo:base/Float";
import Buffer "mo:base/Buffer";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";
import ExtIntegration "../ExtIntegration";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_start_scavenging";
    title = ?"Start Scavenging Mission";
    description = ?"Deprecated — use garage_start_activity instead (same functionality, better name). Sends a bot to a wasteland zone to scavenge for parts.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot to send scavenging"))])), ("zone", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("ScrapHeaps"), Json.str("AbandonedSettlements"), Json.str("DeadMachineFields"), Json.str("RepairBay"), Json.str("ChargingStation")])), ("description", Json.str("Zone difficulty and rewards. RepairBay restores condition, ChargingStation restores battery (both free)."))])), ("location_type", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("ScrapHeaps"), Json.str("AbandonedSettlements"), Json.str("DeadMachineFields"), Json.str("RepairBay"), Json.str("ChargingStation")])), ("description", Json.str("Alias for 'zone'. Preferred for clarity since this tool also handles RepairBay and ChargingStation."))])), ("duration_minutes", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Duration in minutes for the scavenging mission (e.g., 60, 120, 180). If not specified, bot will scavenge continuously until manually retrieved."))]))])),
      ("required", Json.arr([Json.str("token_index"), Json.str("zone")])),
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

      // Track this method call
      ctx.trackMethodCall("garage_start_scavenging", user);

      // Parse arguments
      let tokenIndex = switch (Result.toOption(Json.getAsNat(_args, "token_index"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: token_index", cb);
        };
        case (?idx) { idx };
      };

      let zoneStr = switch (Result.toOption(Json.getAsText(_args, "zone"))) {
        case (?val) { val };
        case (null) {
          // Check location_type alias
          switch (Result.toOption(Json.getAsText(_args, "location_type"))) {
            case (?val) { val };
            case (null) {
              return ToolContext.makeStructuredError("MISSING_PARAM", "Missing required argument: zone (or location_type)", false, [], cb);
            };
          };
        };
      };

      // Parse zone
      let zone : PokedBotsGarage.ScavengingZone = switch (zoneStr) {
        case ("ScrapHeaps") { #ScrapHeaps };
        case ("AbandonedSettlements") { #AbandonedSettlements };
        case ("DeadMachineFields") { #DeadMachineFields };
        case ("RepairBay") { #RepairBay };
        case ("ChargingStation") { #ChargingStation };
        case (_) {
          return ToolContext.makeStructuredError("INVALID_ZONE", "Invalid zone. Must be ScrapHeaps, AbandonedSettlements, DeadMachineFields, RepairBay, or ChargingStation", false, [], cb);
        };
      };

      // Parse optional duration
      let durationMinutes = Result.toOption(Json.getAsNat(_args, "duration_minutes"));

      // Get bot stats and verify registration
      let garage = ctx.garageManager;
      let botStats = switch (garage.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeStructuredError("NOT_INITIALIZED", "This PokedBot is not registered to your account. Use garage_initialize_pokedbot first to register it.", false, [("token_index", Json.int(tokenIndex))], cb);
        };
        case (?stats) { stats };
      };

      // Verify caller is the registered owner
      if (not Principal.equal(botStats.ownerPrincipal, user)) {
        return ToolContext.makeStructuredError("NOT_OWNER", "You are not the registered owner of this PokedBot. If you recently purchased it, use garage_initialize_pokedbot to register it to your account.", false, [("token_index", Json.int(tokenIndex))], cb);
      };

      // Continue with existing logic
      switch (garage.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("Bot not initialized for racing. Use garage_initialize_pokedbot first.", cb);
        };
        case (?botStats) {
          // Start mission with optional duration (Garage layer handles idempotency)
          let now = Time.now();
          switch (garage.startScavengingMission(tokenIndex, zone, now, durationMinutes)) {
            case (#err(e)) {
              return ToolContext.makeError(e, cb);
            };
            case (#ok(_)) {

              let zoneDesc = switch (zone) {
                case (#ScrapHeaps) { "Scrap Heaps (Safe)" };
                case (#AbandonedSettlements) {
                  "Abandoned Settlements (Moderate)";
                };
                case (#DeadMachineFields) { "Dead Machine Fields (Dangerous)" };
                case (#RepairBay) { "Repair Bay (Maintenance)" };
                case (#ChargingStation) { "Charging Station (Free Charging)" };
              };

              let (modeDesc, modeMsg) = switch (durationMinutes) {
                case (null) {
                  ("Continuous", "Retrieve bot anytime with garage_complete_scavenging.");
                };
                case (?duration) {
                  ("Timed (" # Nat.toText(duration) # " minutes)", "Bot will auto-return after " # Nat.toText(duration) # " minutes.");
                };
              };

              // Build base response fields
              var responseFields = Buffer.Buffer<(Text, Json.Json)>(10);
              responseFields.add(("token_index", Json.int(tokenIndex)));
              responseFields.add(("zone", Json.str(zoneDesc)));
              responseFields.add(("mode", Json.str(modeDesc)));
              responseFields.add(("accumulation_interval", Json.str("15 minutes")));
              responseFields.add(("base_rates", Json.str("5.0 parts (randomized distribution), 2.0 battery, 1.0 condition per 15min")));
              responseFields.add(("stat_bonuses", Json.str("Speed: up to +10% parts | Power Core: up to -20% battery | Stability: up to -25% condition | Accel: up to +60% buff chance")));
              responseFields.add(("world_buff_chance", Json.str("2%-3.2% per check (scales with Acceleration stat)")));

              // Add power grid info for ChargingStation
              var powerGridMsg = "";
              if (zone == #ChargingStation) {
                let powerStatus = garage.getGaragePowerStatus(botStats.ownerPrincipal);
                responseFields.add(("power_grid", Json.obj([("total_capacity_watts", Json.int(powerStatus.totalCapacityWatts)), ("current_draw_watts", Json.int(powerStatus.currentDrawWatts)), ("bots_charging", Json.int(powerStatus.botsCharging)), ("efficiency_percent", Json.int(Int.abs(Float.toInt(powerStatus.efficiency * 100.0)))), ("watts_per_bot", Json.int(powerStatus.wattsPerBot))])));

                if (powerStatus.efficiency < 1.0) {
                  let effPct = Int.abs(Float.toInt(powerStatus.efficiency * 100.0));
                  powerGridMsg := " ⚡ POWER GRID: " # Nat.toText(powerStatus.botsCharging) # " bots sharing " # Nat.toText(powerStatus.totalCapacityWatts) # "W = " # Nat.toText(effPct) # "% charge speed.";
                };
              };

              responseFields.add(("message", Json.str("🔧 Bot sent out to scavenge in " # zoneDesc # ". Rewards accumulate continuously based on time elapsed. " # modeMsg # powerGridMsg # " WARNING: Bot dies at 0 battery OR condition = lose ALL pending rewards!")));

              let response = Json.obj(Buffer.toArray(responseFields));

              ToolContext.makeSuccess(response, cb);
            };
          };
        };
      };
    };
  };
};
