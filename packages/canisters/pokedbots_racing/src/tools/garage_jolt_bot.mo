import Result "mo:base/Result";
import Nat "mo:base/Nat";
import Time "mo:base/Time";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_jolt_bot";
    title = ?"Jolt Bot with Battery";
    description = ?"Instantly charge a bot by discharging a battery. Uses 20 kWh per jolt, delivering 25-45% battery boost (reduced by heat).\n\n**JOLT MECHANICS:**\n• Costs 20 kWh per jolt\n• Base boost: 25-45% battery (random)\n• Heat reduces effectiveness: -15% per stack\n• Battery must be at 100% health to operate\n\n**HEAT SYSTEM:**\n• Each jolt: +1 heat stack (decays 1/hour)\n• 4 stacks: Bot overheats, 1-hour lockout\n• Heat is tracked per bot, not per battery\n\n**BATTERY WEAR:**\n• Each jolt damages battery health (varies by type)\n• Each jolt adds to cycle wear (kWh/capacity)\n• Repair restores health, rebuild resets cycles";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("battery_id", Json.obj([("type", Json.str("number")), ("description", Json.str("The ID of the battery to discharge (from garage_list_batteries)"))])), ("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the bot to charge"))]))])),
      ("required", Json.arr([Json.str("battery_id"), Json.str("token_index")])),
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

      // Parse battery ID
      let batteryId = switch (Result.toOption(Json.getAsNat(_args, "battery_id"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: battery_id", cb);
        };
        case (?id) { id };
      };

      // Parse token index
      let tokenIndex = switch (Result.toOption(Json.getAsNat(_args, "token_index"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: token_index", cb);
        };
        case (?idx) {
          if (idx > 9999) {
            return ToolContext.makeError("Invalid token_index: " # Nat.toText(idx) # ". PokedBots token indices are 0-9999.", cb);
          };
          idx;
        };
      };

      // Verify bot ownership
      let racingStats = switch (ctx.garageManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("This PokedBot is not initialized for racing. Use garage_initialize_pokedbot first.", cb);
        };
        case (?stats) { stats };
      };

      if (racingStats.ownerPrincipal != user) {
        return ToolContext.makeError("You are not the registered owner of this PokedBot.", cb);
      };

      // Check if bot is scavenging
      switch (racingStats.activeMission) {
        case (?_) {
          return ToolContext.makeError("Cannot jolt a bot while it's on a scavenging mission. Complete the mission first.", cb);
        };
        case (null) {};
      };

      let now = Time.now();

      // Perform the jolt
      let result = ctx.garageManager.joltBot(user, batteryId, tokenIndex, now);

      switch (result) {
        case (#ok(joltResult)) {
          // Get updated heat status (for potential future use)
          let _heatStatus = ctx.garageManager.getBotHeatStatus(tokenIndex);

          var statusMessage = joltResult.message;

          let response = Json.obj([
            ("message", Json.str(statusMessage)),
            ("battery", Json.obj([("id", Json.int(batteryId)), ("energy_consumed_kwh", Json.float(joltResult.energyConsumed)), ("new_stored_kwh", Json.float(joltResult.newBatteryCharge)), ("new_health_percent", Json.int(joltResult.newBatteryHealth))])),
            ("bot", Json.obj([("token_index", Json.int(tokenIndex)), ("battery_gained_percent", Json.float(joltResult.energyDelivered)), ("new_battery_level", Json.int(joltResult.newBotBattery)), ("heat_stacks", Json.int(joltResult.newHeatStacks)), ("is_overheated", Json.bool(joltResult.overheated))])),
            (
              "tip",
              Json.str(
                if (joltResult.newBatteryCharge < 20.0) {
                  "Battery has less than 20 kWh remaining. Recharge it or salvage it for parts.";
                } else if (joltResult.newHeatStacks >= 3) {
                  "Bot is running hot! Consider waiting for heat to decay (1 stack per hour).";
                } else {
                  "Battery ready for more jolts. Use garage_list_batteries to see all your batteries.";
                }
              ),
            ),
          ]);

          return ToolContext.makeSuccess(response, cb);
        };
        case (#err(errorMsg)) {
          return ToolContext.makeError(errorMsg, cb);
        };
      };
    };
  };
};
