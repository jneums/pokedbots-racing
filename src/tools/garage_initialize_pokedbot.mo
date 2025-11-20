import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat32 "mo:base/Nat32";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Error "mo:base/Error";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";
import ExtIntegration "../ExtIntegration";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_initialize_pokedbot";
    title = ?"Register PokedBot Racing License";
    description = ?"Register your PokedBot for a wasteland racing license (free, one-time). This official registration reveals your bot's faction and racing stats based on its NFT traits. Required before entering any races. Only works with PokedBots you own.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot to register for racing (e.g., 4079)"))]))])),
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
      // Authentication required
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
        case (?idx) { idx };
      };

      let tokenIndexNat32 = Nat32.fromNat(tokenIndex);

      // Check if already registered by this user
      switch (ctx.garageManager.getStats(tokenIndex)) {
        case (?existingStats) {
          // If already initialized by the same user, just return their stats
          if (Principal.equal(existingStats.ownerPrincipal, user)) {
            return ToolContext.makeError("This PokedBot already has a racing license. Use garage_get_robot_details to view its stats.", cb);
          };
          // If owned by someone else, allow re-initialization for the new owner
          // (This handles the transfer case)
        };
        case (null) {
          // Not yet initialized - proceed with initialization
        };
      };

      // Verify ownership via EXT canister before initializing
      let garageSubaccount = ExtIntegration.deriveGarageSubaccount(user);
      let garageAccountId = ExtIntegration.principalToAccountIdentifier(ctx.canisterPrincipal, ?garageSubaccount);

      let ownerResult = try {
        await ctx.extCanister.bearer(ExtIntegration.encodeTokenIdentifier(tokenIndexNat32, ctx.extCanisterId));
      } catch (_) {
        return ToolContext.makeError("Failed to verify ownership", cb);
      };

      switch (ownerResult) {
        case (#err(_)) {
          return ToolContext.makeError("This PokedBot does not exist.", cb);
        };
        case (#ok(currentOwner)) {
          if (currentOwner != garageAccountId) {
            return ToolContext.makeError("You do not own this PokedBot. It must be in your garage to initialize.", cb);
          };
        };
      };

      // Initialize racing stats (faction will be derived from metadata automatically)
      let racingStats = ctx.garageManager.initializeBot(
        tokenIndex,
        user,
        null, // Let it auto-derive faction from metadata
      );

      // Get faction for display
      let faction = racingStats.faction;

      let factionText = switch (faction) {
        case (#BattleBot) { "BattleBot" };
        case (#EntertainmentBot) { "EntertainmentBot" };
        case (#WildBot) { "WildBot" };
        case (#GodClass) { "GodClass" };
        case (#Master) { "Master" };
      };

      let factionMessage = switch (faction) {
        case (#BattleBot) {
          "Racing License Approved: Battle Bot class. Tough construction from video game console parts and junk food toys.";
        };
        case (#EntertainmentBot) {
          "Racing License Approved: Entertainment Bot class. Flashy and charismatic, built from ancient entertainment tech.";
        };
        case (#WildBot) {
          "Racing License Approved: Wild Bot class. Deranged systems from the 2453 solar flare. Unpredictable performance.";
        };
        case (#GodClass) {
          "Racing License Approved: God Class! Superior abilities far beyond standard bots. Delta City's elite.";
        };
        case (#Master) {
          "Racing License Approved: Master class. Mysterious connection to Europa Base 7 colony.";
        };
      };

      // Get current stats (base + bonuses)
      let currentStats = ctx.garageManager.getCurrentStats(racingStats);

      // Build JSON response
      let response = Json.obj([
        ("token_index", Json.int(tokenIndex)),
        ("faction", Json.str(factionText)),
        ("stats", Json.obj([("speed", Json.int(currentStats.speed)), ("power_core", Json.int(currentStats.powerCore)), ("acceleration", Json.int(currentStats.acceleration)), ("stability", Json.int(currentStats.stability))])),
        ("battery", Json.int(racingStats.battery)),
        ("condition", Json.int(racingStats.condition)),
        ("calibration", Json.int(racingStats.calibration)),
        ("status", Json.str("Racing license registered! Ready for wasteland competition.")),
        ("license_status", Json.str("REGISTERED")),
        ("faction_message", Json.str(factionMessage)),
      ]);

      ToolContext.makeSuccess(response, cb);
    };
  };
};
