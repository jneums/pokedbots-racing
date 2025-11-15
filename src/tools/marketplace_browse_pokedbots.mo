import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Array "mo:base/Array";
import Float "mo:base/Float";
import Nat "mo:base/Nat";
import Order "mo:base/Order";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";

import ToolContext "./ToolContext";
import ExtIntegration "../ExtIntegration";

module {
  public func config() : McpTypes.Tool = {
    name = "browse_pokedbots";
    title = ?"Browse PokedBots Marketplace";
    description = ?"Browse available PokedBots NFTs for sale. Returns listings sorted by price (lowest first). Use 'after' with a token index to continue from that point (5 listings per call).";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("after", Json.obj([("type", Json.str("number")), ("description", Json.str("Show listings after this token index (optional)"))]))])),
    ]);
    outputSchema = null;
  };

  public func handle(context : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {
      // Get 'after' token index if provided
      let afterTokenIndex = switch (Result.toOption(Json.getAsNat(_args, "after"))) {
        case (?idx) { ?Nat32.fromNat(idx) };
        case (null) { null };
      };

      let pageSize = 5;

      // Get cached listings
      let listingsResult = await context.getMarketplaceListings();

      if (listingsResult.size() == 0) {
        return ToolContext.makeTextSuccess("No PokedBots are currently listed for sale on the marketplace.", cb);
      };

      // Sort by price (lowest first)
      let sortedListings = Array.sort<(Nat32, ExtIntegration.Listing, ExtIntegration.Metadata)>(
        listingsResult,
        func(a, b) {
          Nat64.compare(a.1.price, b.1.price);
        },
      );

      // Find start position based on 'after' token
      var startIdx = 0;
      switch (afterTokenIndex) {
        case (?afterToken) {
          // Find the position right after this token
          label findLoop for (i in sortedListings.keys()) {
            if (sortedListings[i].0 == afterToken) {
              startIdx := i + 1;
              break findLoop;
            };
          };
        };
        case (null) { /* start from beginning */ };
      };

      let totalListings = sortedListings.size();
      let endIdx = Nat.min(startIdx + pageSize, totalListings);

      if (startIdx >= totalListings) {
        return ToolContext.makeTextSuccess(
          "No more listings available after token #" # debug_show (afterTokenIndex),
          cb,
        );
      };

      // Get page slice
      let pageListings = Array.tabulate<Text>(
        endIdx - startIdx,
        func(i) {
          let idx = startIdx + i;
          let (tokenIndex, listing, _metadata) = sortedListings[idx];
          let priceIcp = Float.fromInt(Nat64.toNat(listing.price)) / 100_000_000.0;

          "Token #" # Nat32.toText(tokenIndex) # ": " #
          Float.format(#fix 2, priceIcp) # " ICP";
        },
      );

      var message = "📋 PokedBots Marketplace (sorted by price)\n" #
      "Showing " # Nat.toText(endIdx - startIdx) # " listings:\n\n" #
      Text.join("\n", pageListings.vals());

      // Show next cursor if there are more results
      if (endIdx < totalListings) {
        let lastTokenInPage = sortedListings[endIdx - 1].0;
        message #= "\n\n📄 More available. Use: after=" # Nat32.toText(lastTokenInPage);
      } else {
        message #= "\n\n✓ End of listings (total: " # Nat.toText(totalListings) # ")";
      };

      message #= "\n💰 To purchase: use purchase_pokedbot with the token index";

      ToolContext.makeTextSuccess(message, cb);
    };
  };
};
