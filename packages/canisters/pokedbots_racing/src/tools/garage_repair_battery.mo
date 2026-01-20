import Result "mo:base/Result";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Int "mo:base/Int";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_repair_battery";
    title = ?"Repair Battery";
    description = ?"Repair a battery to restore health (not charge). Each repair restores 25% health, reduced by cycles. Does NOT restore stored kWh - recharge separately.\n\n**REPAIR COSTS (parts):**\n• ScrapCell: 50 parts\n• SalvagePack: 150 parts\n• IndustrialBank: 400 parts\n• PlasmaVault: 1000 parts\n\n**IMPORTANT:**\n• Repairs restore HEALTH, not charge\n• Health affects jolt damage resistance\n• Battery must be <100% health to repair\n• Effective repair decreases as cycles increase";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("battery_id", Json.obj([("type", Json.str("number")), ("description", Json.str("The ID of the battery to repair (from garage_list_batteries)"))]))])),
      ("required", Json.arr([Json.str("battery_id")])),
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

      // Perform the repair
      let result = ctx.garageManager.repairBattery(user, batteryId);

      switch (result) {
        case (#ok(repairResult)) {
          let cyclePercent = Int.abs(Float.toInt(repairResult.cycles * 100.0));

          let response = Json.obj([
            ("message", Json.str("🔧 Battery repaired! +" # Nat.toText(repairResult.healthGained) # "% health.")),
            ("battery", Json.obj([("id", Json.int(batteryId)), ("health_gained", Json.int(repairResult.healthGained)), ("new_health_percent", Json.int(repairResult.newHealth)), ("cycles_percent", Json.int(cyclePercent))])),
            ("cost", Json.obj([("parts_spent", Json.int(repairResult.partsCost))])),
            (
              "tip",
              Json.str(
                if (repairResult.newHealth < 100) {
                  "Battery still needs " # Nat.toText(100 - repairResult.newHealth) # "% more repair to reach full health.";
                } else if (cyclePercent > 75) {
                  "Battery has high cycles (" # Nat.toText(cyclePercent) # "%). Consider using garage_rebuild_battery to reset cycles.";
                } else {
                  "Battery health restored! Use garage_jolt_bot to discharge it into a bot.";
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
