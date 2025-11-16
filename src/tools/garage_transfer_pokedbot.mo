import Principal "mo:base/Principal";
import Nat32 "mo:base/Nat32";
import Nat "mo:base/Nat";
import Result "mo:base/Result";
import Blob "mo:base/Blob";
import Text "mo:base/Text";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";

import ToolContext "./ToolContext";
import ExtIntegration "../ExtIntegration";

module {
  public func config() : McpTypes.Tool = {
    name = "transfer_pokedbot";
    title = ?"Transfer PokedBot";
    description = ?"Transfer a PokedBot from your garage to another account ID (hex string). Useful for gifting bots or moving them between accounts. Bot must not be listed on marketplace.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot to transfer (0-9999)"))])), ("to_account_id", Json.obj([("type", Json.str("string")), ("description", Json.str("The destination account identifier (hex string). To send to another user's garage, use their garage account ID."))]))])),
      ("required", Json.arr([Json.str("token_index"), Json.str("to_account_id")])),
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

      // Parse to_account_id
      let toAccountId = switch (Result.toOption(Json.getAsText(_args, "to_account_id"))) {
        case (?t) { t };
        case (null) {
          return ToolContext.makeError("Missing or invalid to_account_id parameter", cb);
        };
      };

      // Validate account ID format (should be 64-character hex string)
      if (Text.size(toAccountId) != 64) {
        return ToolContext.makeError("Invalid account ID format. Must be a 64-character hex string.", cb);
      };

      // Check if bot is initialized for racing
      let botStats = switch (context.racingStatsManager.getStats(Nat32.toNat(tokenIndex))) {
        case (null) {
          return ToolContext.makeError("Bot not initialized for racing. Use garage_initialize_pokedbot first.", cb);
        };
        case (?stats) { stats };
      };

      // Check if bot is listed for sale
      if (botStats.listedForSale) {
        return ToolContext.makeError("Cannot transfer: Bot is currently listed on marketplace. Unlist it first using unlist_pokedbot.", cb);
      };

      // Check if bot is in an active race
      if (context.isInActiveRace(Nat32.toNat(tokenIndex))) {
        return ToolContext.makeError("Cannot transfer: Bot is currently entered in an active race. Wait for the race to complete.", cb);
      };

      // Derive garage subaccount for the sender (where the NFT is stored)
      let fromGarageSubaccount = ExtIntegration.deriveGarageSubaccount(userPrincipal);

      // Verify ownership
      let tokenIdentifier = ExtIntegration.encodeTokenIdentifier(
        tokenIndex,
        context.extCanisterId,
      );

      let bearer = try {
        await context.extCanister.bearer(tokenIdentifier);
      } catch (_) {
        return ToolContext.makeError("Failed to verify ownership", cb);
      };

      switch (bearer) {
        case (#err(err)) {
          return ToolContext.makeError("Token not found: " # debug_show (err), cb);
        };
        case (#ok(accountId)) {
          // Check if user owns this token in their garage
          let garageAccountId = ExtIntegration.principalToAccountIdentifier(
            context.canisterPrincipal,
            ?fromGarageSubaccount,
          );
          if (accountId != garageAccountId) {
            return ToolContext.makeError("You don't own this PokedBot in your garage", cb);
          };

          // Prevent transferring to same account
          if (accountId == toAccountId) {
            return ToolContext.makeError("Cannot transfer to the same account. Bot is already there.", cb);
          };
        };
      };

      // Execute transfer to the specified account ID
      // Note: EXT validates that owner == spender, where spender = msg.caller + subaccount
      let fromAccountId = ExtIntegration.principalToAccountIdentifier(
        context.canisterPrincipal,
        ?fromGarageSubaccount,
      );
      
      let transferResult = try {
        await context.extCanister.transfer({
          from = #address(fromAccountId);
          to = #address(toAccountId);
          token = tokenIdentifier;
          amount = 1;
          memo = Blob.fromArray([]);
          notify = false;
          subaccount = ?fromGarageSubaccount;
        });
      } catch (_) {
        return ToolContext.makeError("Transfer failed", cb);
      };

      switch (transferResult) {
        case (#err(err)) {
          let errorMsg = switch (err) {
            case (#Unauthorized(aid)) { "Unauthorized: " # aid };
            case (#InsufficientBalance) { "Insufficient balance" };
            case (#Rejected) { "Transfer rejected" };
            case (#InvalidToken(tid)) { "Invalid token: " # tid };
            case (#CannotNotify(aid)) { "Cannot notify: " # aid };
            case (#Other(msg)) { "Transfer failed: " # msg };
          };
          return ToolContext.makeError(errorMsg, cb);
        };
        case (#ok(_)) {
          // Success - the bot and all its stats have been transferred
          // Stats remain intact (wins, upgrades, experience, etc.) as they're valuable assets
          // Only update the owner to a placeholder - new owner will be set when they initialize
          let transferredStats = {
            botStats with
            ownerPrincipal = Principal.fromText("aaaaa-aa"); // Placeholder until new owner initializes
            listedForSale = false; // Clear listing status
          };

          context.racingStatsManager.updateStats(Nat32.toNat(tokenIndex), transferredStats);

          // Build response with bot stats info
          let statsInfo = "Career Stats: " #
          Nat.toText(botStats.wins) # " wins, " #
          Nat.toText(botStats.racesEntered) # " races\n" #
          "Upgrades: SPD+" # Nat.toText(botStats.speedBonus) #
          " PWR+" # Nat.toText(botStats.powerCoreBonus) #
          " ACC+" # Nat.toText(botStats.accelerationBonus) #
          " STB+" # Nat.toText(botStats.stabilityBonus);

          let message = "✅ Transfer Complete!\n\n" #
          "PokedBot #" # Nat32.toText(tokenIndex) # " transferred successfully!\n\n" #
          "From: Your garage\n" #
          "To: " # toAccountId # "\n\n" #
          statsInfo # "\n\n" #
          "📦 The bot has been removed from your garage\n" #
          "🎯 All career stats and upgrades transfer with the bot\n" #
          "🔄 New owner can initialize it to start racing";

          ToolContext.makeTextSuccess(message, cb);
        };
      };
    };
  };
};
