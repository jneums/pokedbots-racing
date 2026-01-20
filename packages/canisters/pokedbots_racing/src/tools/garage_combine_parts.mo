import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Text "mo:base/Text";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_combine_parts";
    title = ?"Combine Parts to Universal";
    description = ?"Combine 1 of each specialized part type to create Universal Parts.\n\n**Combination Formula:**\n1 SPD + 1 PWR + 1 ACC + 1 STB = 1 Universal Part\n\n**Requirements:**\nYou need equal amounts of all 4 specialized part types:\n• Speed Chips (SPD)\n• Power Core Fragments (PWR)\n• Thruster Kits (ACC)\n• Gyro Modules (STB)\n\n**Example:**\nIf you have 100 SPD, 80 PWR, 120 ACC, 90 STB:\n• Maximum you can combine: 80 (limited by PWR)\n• Result: 80 Universal Parts\n• Remaining: 20 SPD, 0 PWR, 40 ACC, 10 STB\n\n**Why Universal Parts?**\nUniversal Parts can be used for ANY upgrade type without conversion penalties!";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("amount", Json.obj([("type", Json.str("number")), ("description", Json.str("Number of Universal Parts to create (uses 1 of each specialized part type per Universal)"))]))])),
      ("required", Json.arr([Json.str("amount")])),
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

      // Parse arguments
      let amount = switch (Result.toOption(Json.getAsNat(_args, "amount"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: amount", cb);
        };
        case (?val) { val };
      };

      // Get current inventory to show before state
      let invBefore = ctx.garageManager.getUserInventory(user);

      // Perform combination
      switch (ctx.garageManager.combinePartsToUniversal(user, amount)) {
        case (#err(msg)) {
          return ToolContext.makeError(msg, cb);
        };
        case (#ok()) {
          // Get updated inventory
          let inv = ctx.garageManager.getUserInventory(user);

          let response = Json.obj([
            ("amount_combined", Json.int(amount)),
            ("parts_used", Json.obj([("speed_chips", Json.int(amount)), ("power_core_fragments", Json.int(amount)), ("thruster_kits", Json.int(amount)), ("gyro_modules", Json.int(amount))])),
            ("universal_received", Json.int(amount)),
            ("updated_inventory", Json.obj([("speed_chips", Json.int(inv.speedChips)), ("power_core_fragments", Json.int(inv.powerCoreFragments)), ("thruster_kits", Json.int(inv.thrusterKits)), ("gyro_modules", Json.int(inv.gyroModules)), ("universal_parts", Json.int(inv.universalParts))])),
            ("message", Json.str("✅ Combined " # Nat.toText(amount) # " of each part type → " # Nat.toText(amount) # " Universal Parts!")),
          ]);

          ToolContext.makeSuccess(response, cb);
        };
      };
    };
  };
};
