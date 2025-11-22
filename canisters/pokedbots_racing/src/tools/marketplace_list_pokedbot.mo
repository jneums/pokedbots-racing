import Principal "mo:base/Principal";
import Nat64 "mo:base/Nat64";
import Nat32 "mo:base/Nat32";
import Result "mo:base/Result";
import Debug "mo:base/Debug";
import Blob "mo:base/Blob";
import Float "mo:base/Float";
import Int "mo:base/Int";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";

import ToolContext "./ToolContext";
import ExtIntegration "../ExtIntegration";

module {
  public func config() : McpTypes.Tool = {
    name = "list_pokedbot";
    title = ?"List PokedBot for Sale";
    description = ?"List your PokedBot for sale on the marketplace. Sets a price in ICP and makes your bot available for others to purchase.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot you want to list for sale (0-9999)"))])), ("price_icp", Json.obj([("type", Json.str("number")), ("description", Json.str("The price in ICP (e.g., 1.5 for 1.5 ICP). Minimum 0.01 ICP."))]))])),
      ("required", Json.arr([Json.str("token_index"), Json.str("price_icp")])),
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

      // Parse price_icp
      let priceIcp = switch (Result.toOption(Json.getAsFloat(_args, "price_icp"))) {
        case (?n) { n };
        case (null) {
          return ToolContext.makeError("Missing or invalid price_icp parameter", cb);
        };
      };

      // Validate price (minimum 0.01 ICP)
      if (priceIcp < 0.01) {
        return ToolContext.makeError("Price must be at least 0.01 ICP", cb);
      };

      // Convert price to e8s (ICP base units: 1 ICP = 100,000,000 e8s)
      let priceE8s = Nat64.fromNat(Int.abs(Float.toInt(Float.nearest(priceIcp * 100_000_000.0))));

      // Check if bot is initialized for racing
      let botStats = switch (context.garageManager.getStats(Nat32.toNat(tokenIndex))) {
        case (null) {
          return ToolContext.makeError("Bot not initialized for racing. Use garage_initialize_pokedbot first.", cb);
        };
        case (?stats) { stats };
      };

      // Check if bot is already listed
      if (botStats.listedForSale) {
        return ToolContext.makeError("Bot is already listed for sale", cb);
      };

      // Check if bot is in an active race
      if (context.isInActiveRace(Nat32.toNat(tokenIndex))) {
        return ToolContext.makeError("Cannot list bot while it's in an active race", cb);
      };

      // Derive garage subaccount for the user (where the NFT is stored)
      let garageSubaccount = ExtIntegration.deriveGarageSubaccount(userPrincipal);

      // Verify ownership
      let tokenIdentifier = ExtIntegration.encodeTokenIdentifier(
        tokenIndex,
        context.extCanisterId,
      );

      let bearer = try {
        await context.extCanister.bearer(tokenIdentifier);
      } catch (e) {
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
            ?garageSubaccount,
          );
          if (accountId != garageAccountId) {
            return ToolContext.makeError("You don't own this PokedBot in your garage", cb);
          };
        };
      };

      // List the token for sale from the garage subaccount
      let listResult = try {
        await context.extCanister.list({
          token = tokenIdentifier;
          from_subaccount = ?Blob.fromArray(garageSubaccount);
          price = ?priceE8s;
        });
      } catch (e) {
        return ToolContext.makeError("Failed to list PokedBot", cb);
      };

      switch (listResult) {
        case (#err(err)) {
          let errorMsg = switch (err) {
            case (#InvalidToken(_)) { "Invalid token" };
            case (#Other(msg)) { "Failed to list: " # msg };
          };
          return ToolContext.makeError(errorMsg, cb);
        };
        case (#ok(_)) {
          // Success - update bot stats to mark as listed
          let updatedStats = {
            botStats with
            listedForSale = true;
          };
          context.garageManager.updateStats(Nat32.toNat(tokenIndex), updatedStats);

          // Build response
          let message = "✅ Listing Created!\n\n" #
          "PokedBot #" # Nat32.toText(tokenIndex) # " is now for sale!\n\n" #
          "Price: " # Float.format(#fix 2, priceIcp) # " ICP\n" #
          "Status: LISTED\n\n" #
          "🛒 Your bot is now available on the marketplace\n" #
          "⚠️ You cannot race with this bot while it's listed";

          ToolContext.makeTextSuccess(message, cb);
        };
      };
    };
  };
};
