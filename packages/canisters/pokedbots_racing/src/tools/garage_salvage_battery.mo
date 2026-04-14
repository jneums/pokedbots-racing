import Result "mo:base/Result";
import Nat "mo:base/Nat";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_salvage_battery";
    title = ?"Salvage Battery for Parts";
    description = ?"Destroy a battery to recover parts. Fixed returns regardless of condition: ScrapCell 50, SalvagePack 150, IndustrialBank 400, PlasmaVault 1000.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("battery_id", Json.obj([("type", Json.str("number")), ("description", Json.str("The ID of the battery to salvage (from garage_list_batteries)"))]))])),
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

      // Perform the salvage
      let result = ctx.garageManager.salvageBattery(user, batteryId);

      switch (result) {
        case (#ok(salvageResult)) {
          let typeText = switch (salvageResult.batteryType) {
            case (#ScrapCell) { "ScrapCell" };
            case (#SalvagePack) { "SalvagePack" };
            case (#IndustrialBank) { "IndustrialBank" };
            case (#PlasmaVault) { "PlasmaVault" };
          };

          let response = Json.obj([
            ("message", Json.str("🔧 Battery salvaged for parts!")),
            ("salvaged_battery", Json.obj([("id", Json.int(batteryId)), ("type", Json.str(typeText))])),
            ("parts_recovered", Json.int(salvageResult.partsReturned)),
            ("tip", Json.str("Parts can be used for upgrades, battery repairs/rebuilds, or converted to other part types.")),
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
