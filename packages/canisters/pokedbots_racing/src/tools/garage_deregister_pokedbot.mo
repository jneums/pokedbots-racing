import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Text "mo:base/Text";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_deregister_pokedbot";
    title = ?"De-register PokedBot";
    description = ?"De-register a PokedBot from your racing account. Use this BEFORE transferring a bot to another wallet, or after purchasing a bot to prevent the previous owner from controlling it. This removes your ability to race, upgrade, or manage this bot until you re-register it. All stats and upgrades are preserved - only control is removed.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot to de-register (0-9999)"))]))])),
      ("required", Json.arr([Json.str("token_index")])),
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

      // Get bot stats to verify current registration
      let stats = switch (ctx.garageManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("This PokedBot is not registered. Only registered bots can be de-registered.", cb);
        };
        case (?s) { s };
      };

      // Verify caller is the registered owner
      if (not Principal.equal(stats.ownerPrincipal, user)) {
        return ToolContext.makeError("You are not the registered owner of this PokedBot. Only the registered owner can de-register it.", cb);
      };

      // Check if bot has active upgrade session
      switch (ctx.garageManager.getActiveUpgrade(tokenIndex)) {
        case (?upgrade) {
          return ToolContext.makeError("Cannot de-register while an upgrade is in progress. Cancel the upgrade first using garage_cancel_upgrade.", cb);
        };
        case (null) { /* No upgrade, OK to proceed */ };
      };

      // Check if bot is on scavenging mission
      switch (stats.activeMission) {
        case (?mission) {
          return ToolContext.makeError("Cannot de-register while bot is scavenging. Complete the scavenging mission first using garage_complete_scavenging.", cb);
        };
        case (null) { /* Not scavenging, OK to proceed */ };
      };

      // De-register by removing the bot's stats
      // This preserves all data but removes control
      ctx.garageManager.deregisterBot(tokenIndex);

      let responseText = "✅ **BOT DE-REGISTERED**\n\n" #
      "PokedBot #" # Nat.toText(tokenIndex) # " has been de-registered from your account.\n\n" #
      "**What this means:**\n" #
      "• You can no longer race, upgrade, or manage this bot\n" #
      "• All stats, upgrades, and career history are preserved\n" #
      "• The new owner can register it to take control\n" #
      "• You can re-register if it's still in your wallet\n\n" #
      "**Next steps:**\n" #
      "• If transferring: You can now safely transfer this bot\n" #
      "• If you made a mistake: Re-register using garage_initialize_pokedbot";

      return ToolContext.makeTextSuccess(responseText, cb);
    };
  };
};
