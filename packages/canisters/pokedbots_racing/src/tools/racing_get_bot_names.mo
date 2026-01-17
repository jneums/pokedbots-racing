import Result "mo:base/Result";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Array "mo:base/Array";
import Iter "mo:base/Iter";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import WastelandFlavor "WastelandFlavor";

module {
  public func config() : McpTypes.Tool = {
    name = "racing_get_bot_names";
    title = ?"Get Bot Names";
    description = ?"Lookup bot names for multiple token indices. Returns the custom name (if set) or a formatted display name for each bot. Perfect for enriching race results, leaderboards, or news articles with recognizable bot identities instead of raw token numbers.\n\n**NO AUTHENTICATION REQUIRED** - Bot names are public information.\n\n**INPUT:** Array of token indices (max 50 per request)\n\n**OUTPUT:** Array of bot identity objects with:\n- `token_index`: The bot's token ID\n- `name`: Custom name if set, otherwise 'Bot #XXXX'\n- `display_name`: Always formatted as 'Name (Bot #XXXX)' for clarity\n- `faction`: Bot's faction if initialized\n- `faction_icon`: Emoji icon for the faction\n\n**USAGE TIPS:**\n- Use this before writing race recaps to replace token numbers with names\n- Batch multiple lookups into a single request for efficiency\n- Display names include both custom name and token ID for context";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_indices", Json.obj([("type", Json.str("array")), ("items", Json.obj([("type", Json.str("number"))])), ("description", Json.str("Array of token indices to lookup (max 50 per request)"))]))])),
      ("required", Json.arr([Json.str("token_indices")])),
    ]);
    outputSchema = null;
  };

  public func handle(ctx : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {
      // Parse token_indices array - no authentication required
      let tokenIndicesRaw = switch (Result.toOption(Json.getAsArray(_args, "token_indices"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: token_indices (array of numbers)", cb);
        };
        case (?arr) { arr };
      };

      // Convert JSON array to Nat array with validation
      var tokenIndices : [Nat] = [];
      for (item in tokenIndicesRaw.vals()) {
        switch (item) {
          case (#Number(n)) {
            let idx = Int.abs(Float.toInt(n));
            if (idx <= 9999) {
              tokenIndices := Array.append(tokenIndices, [idx]);
            };
          };
          case (_) {}; // Skip non-numbers
        };
      };

      // Limit to 50 bots per request
      if (tokenIndices.size() > 50) {
        return ToolContext.makeError("Maximum 50 token indices per request. Received " # Nat.toText(tokenIndices.size()) # ".", cb);
      };

      if (tokenIndices.size() == 0) {
        return ToolContext.makeError("No valid token indices provided. Indices must be numbers 0-9999.", cb);
      };

      // Build response array
      var botsArray : [Json.Json] = [];

      for (tokenIndex in tokenIndices.vals()) {
        // Get racing stats (may be null if not initialized)
        let racingStatsOpt = ctx.garageManager.getStats(tokenIndex);

        let (name, factionOpt, factionIcon) = switch (racingStatsOpt) {
          case (?stats) {
            let customName = switch (stats.name) {
              case (?n) { n };
              case (null) { "Bot #" # Nat.toText(tokenIndex) };
            };
            let icon = WastelandFlavor.factionEmoji(stats.faction);
            (customName, ?stats.faction, icon);
          };
          case (null) {
            // Bot not initialized - just use token number
            ("Bot #" # Nat.toText(tokenIndex), null, "🤖");
          };
        };

        // Build display name: "CustomName (Bot #1234)" or just "Bot #1234"
        let displayName = switch (racingStatsOpt) {
          case (?stats) {
            switch (stats.name) {
              case (?customName) {
                customName # " (Bot #" # Nat.toText(tokenIndex) # ")";
              };
              case (null) { "Bot #" # Nat.toText(tokenIndex) };
            };
          };
          case (null) { "Bot #" # Nat.toText(tokenIndex) };
        };

        // Faction text
        let factionText = switch (factionOpt) {
          case (?faction) { WastelandFlavor.factionName(faction) };
          case (null) { "Unknown" };
        };

        let botJson = Json.obj([
          ("token_index", Json.int(tokenIndex)),
          ("name", Json.str(name)),
          ("display_name", Json.str(displayName)),
          ("faction", Json.str(factionText)),
          ("faction_icon", Json.str(factionIcon)),
        ]);
        botsArray := Array.append(botsArray, [botJson]);
      };

      let response = Json.obj([
        ("message", Json.str("🤖 Bot Identity Lookup")),
        ("count", Json.int(botsArray.size())),
        ("bots", Json.arr(botsArray)),
      ]);

      ToolContext.makeSuccess(response, cb);
    };
  };
};
