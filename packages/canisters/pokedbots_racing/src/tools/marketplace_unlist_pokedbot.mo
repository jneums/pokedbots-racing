import Principal "mo:base/Principal";
import Nat32 "mo:base/Nat32";
import Result "mo:base/Result";
import Blob "mo:base/Blob";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";

import ToolContext "./ToolContext";
import ExtIntegration "../ExtIntegration";

module {
  public func config() : McpTypes.Tool = {
    name = "unlist_pokedbot";
    title = ?"Unlist PokedBot from Sale";
    description = ?"Remove your PokedBot from the marketplace. Makes your bot available for racing again.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot you want to unlist (0-9999)"))]))])),
      ("required", Json.arr([Json.str("token_index")])),
    ]);
    outputSchema = null;
  };

  public func handle(context : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {
      // Get authenticated user
      let userPrincipal = switch (_auth) {
        case (?auth) { auth.principal };
        case (null) {
          return ToolContext.makeError("Authentication required. Please sign in first.", cb);
        };
      };

      // Parse token_index
      let tokenIndex = switch (Result.toOption(Json.getAsNat(_args, "token_index"))) {
        case (?n) { Nat32.fromNat(n) };
        case (null) {
          return ToolContext.makeError("Missing or invalid token_index parameter", cb);
        };
      };

      // Verify ownership via EXT (source of truth) - must own the bot to unlist it
      let garageSubaccount = ExtIntegration.deriveGarageSubaccount(userPrincipal);
      let garageAccountId = ExtIntegration.principalToAccountIdentifier(context.canisterPrincipal, ?garageSubaccount);
      let ownerResult = try {
        await context.extCanister.bearer(ExtIntegration.encodeTokenIdentifier(tokenIndex, context.extCanisterId));
      } catch (_) {
        return ToolContext.makeError("Failed to verify ownership", cb);
      };
      switch (ownerResult) {
        case (#err(_)) {
          return ToolContext.makeError("This PokedBot does not exist.", cb);
        };
        case (#ok(currentOwner)) {
          if (currentOwner != garageAccountId) {
            return ToolContext.makeError("You do not own this PokedBot.", cb);
          };
        };
      };

      // Unlist the token (set price to null)
      let tokenIdentifier = ExtIntegration.encodeTokenIdentifier(
        tokenIndex,
        context.extCanisterId,
      );

      let unlistResult = try {
        await context.extCanister.list({
          token = tokenIdentifier;
          from_subaccount = ?Blob.fromArray(garageSubaccount);
          price = null; // Setting price to null unlists the token
        });
      } catch (_e) {
        return ToolContext.makeError("Failed to unlist PokedBot", cb);
      };

      switch (unlistResult) {
        case (#err(err)) {
          let errorMsg = switch (err) {
            case (#InvalidToken(_)) { "Invalid token" };
            case (#Other(msg)) { "Failed to unlist: " # msg };
          };
          return ToolContext.makeError(errorMsg, cb);
        };
        case (#ok(_)) {
          // Success - get bot stats to update listing status
          let botStats = switch (context.garageManager.getStats(Nat32.toNat(tokenIndex))) {
            case (?stats) { stats };
            case (null) {
              // Bot not initialized - that's okay, just confirm unlisting
              let message = "✅ Listing Removed!\n\n" #
              "PokedBot #" # Nat32.toText(tokenIndex) # " is no longer for sale.\n\n" #
              "Status: UNLISTED";
              return ToolContext.makeTextSuccess(message, cb);
            };
          };

          // Update bot stats to mark as not listed
          let updatedStats = {
            botStats with
            listedForSale = false;
          };
          context.garageManager.updateStats(Nat32.toNat(tokenIndex), updatedStats);

          // Build response
          let message = "✅ Listing Removed!\n\n" #
          "PokedBot #" # Nat32.toText(tokenIndex) # " is no longer for sale.\n\n" #
          "Status: UNLISTED\n\n" #
          "🏁 Your bot is now available for racing again!";

          ToolContext.makeTextSuccess(message, cb);
        };
      };
    };
  };
};
