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
    name = "garage_delete_starter_bot";
    title = ?"Delete Starter Bot";
    description = ?"Delete a starter bot to free the slot. Allows creating a new starter bot with a different faction in the same class. All stats, upgrades, and career history are permanently lost.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([
        ("race_class", Json.obj([
          ("type", Json.str("string")),
          ("enum", Json.arr([Json.str("Scrap"), Json.str("Junker"), Json.str("Raider"), Json.str("Elite")])),
          ("description", Json.str("Which class slot to delete the starter bot from."))
        ]))
      ])),
      ("required", Json.arr([Json.str("race_class")])),
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
        case (null) { return ToolContext.makeError("Authentication required", cb) };
        case (?auth) { auth.principal };
      };

      let raceClass = switch (Result.toOption(Json.getAsText(_args, "race_class"))) {
        case (null) { return ToolContext.makeError("Missing required argument: race_class", cb) };
        case (?c) { c };
      };

      let classOffset : Nat = if (raceClass == "Scrap") { 0 }
        else if (raceClass == "Junker") { 1 }
        else if (raceClass == "Raider") { 2 }
        else if (raceClass == "Elite") { 3 }
        else { return ToolContext.makeError("Invalid class. Must be Scrap, Junker, Raider, or Elite.", cb) };

      let slots = ctx.getStarterBotSlots(user);

      let slotTokenIndex = switch (classOffset) {
        case (0) { slots.scrap };
        case (1) { slots.junker };
        case (2) { slots.raider };
        case _ { slots.elite };
      };

      switch (slotTokenIndex) {
        case (null) {
          return ToolContext.makeError("You don't have a " # raceClass # " starter bot.", cb);
        };
        case (?tokenIndex) {
          // Check if bot is busy
          switch (ctx.garageManager.getStats(tokenIndex)) {
            case (?botStats) {
              switch (botStats.activeMission) {
                case (?_) { return ToolContext.makeError("Cannot delete — bot is on a scavenging mission. Complete it first.", cb) };
                case (null) {};
              };
            };
            case (null) {};
          };

          // Delete
          ignore ctx.garageManager.deleteStarterBot(tokenIndex);
          // Purge gear + dedication so a recreated bot at the same token index starts fresh
          ctx.purgeBotGear(user, tokenIndex);
          ignore ctx.dedicationManager.deleteProfile(tokenIndex);
          ctx.setStarterBotSlot(user, classOffset, null);

          ToolContext.makeTextSuccess(
            "🗑️ Starter bot #" # Nat.toText(tokenIndex) # " deleted. " # raceClass # " slot is now free — use garage_claim_starter_bot to create a new one with a different faction.",
            cb,
          );
        };
      };
    };
  };
};
