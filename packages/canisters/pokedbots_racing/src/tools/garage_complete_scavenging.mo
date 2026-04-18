import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Time "mo:base/Time";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_complete_scavenging";
    title = ?"Complete Scavenging Mission";
    description = ?"Retrieve a bot from its current activity and collect accumulated rewards. Can be called anytime — rewards accumulate based on time elapsed.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot to retrieve from scavenging"))]))])),
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
          return ToolContext.makeStructuredError(
            "AUTH_REQUIRED", "Authentication required", false,
            [], cb,
          );
        };
        case (?auth) { auth.principal };
      };

      // Parse arguments
      let tokenIndex = switch (Result.toOption(Json.getAsNat(_args, "token_index"))) {
        case (null) {
          return ToolContext.makeStructuredError(
            "MISSING_PARAM", "Missing required argument: token_index", false,
            [], cb,
          );
        };
        case (?idx) { idx };
      };

      // Get bot stats and verify registration
      let racingStats = switch (ctx.garageManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeStructuredError(
            "BOT_NOT_REGISTERED",
            "This PokedBot is not registered to your account. Use garage_initialize_pokedbot first to register it.",
            false,
            [("token_index", Json.int(tokenIndex))],
            cb,
          );
        };
        case (?stats) { stats };
      };

      // Verify caller is the registered owner
      if (not Principal.equal(racingStats.ownerPrincipal, user)) {
        return ToolContext.makeStructuredError(
          "NOT_OWNER",
          "You are not the registered owner of this PokedBot. If you recently purchased it, use garage_initialize_pokedbot to register it to your account.",
          false,
          [("token_index", Json.int(tokenIndex))],
          cb,
        );
      };

      // Complete mission (forces final accumulation)
      let garage = ctx.garageManager;
      let now = Time.now();

      switch (garage.completeScavengingMissionV2(tokenIndex, now)) {
        case (#err(e)) {
          // Determine the error code and whether the bot is simply idle
          // (idempotent: if already idle, treat as a no-op success for automation)
          let isIdleError = Text.contains(e, #text "idle") or Text.contains(e, #text "No active mission");
          let isDead = Text.contains(e, #text "died") or Text.contains(e, #text "Bot died");
          let missionCleared = Text.contains(e, #text "Mission was cleared");

          if (isIdleError) {
            // Idempotent: bot is already idle — automation can treat this as success
            let response = Json.obj([
              ("token_index", Json.int(tokenIndex)),
              ("already_idle", Json.bool(true)),
              ("total_parts", Json.int(0)),
              ("message", Json.str("Bot #" # Nat.toText(tokenIndex) # " is already idle — no mission to complete.")),
              ("current_activity_type", Json.str("idle")),
            ]);
            ToolContext.makeSuccess(response, cb);
          } else {
            // Real error — provide structured code
            let code = if (isDead) { "BOT_DIED" }
              else if (missionCleared) { "MISSION_CLEARED" }
              else { "COMPLETION_FAILED" };
            let retryable = missionCleared; // transient if mission was cleared mid-operation

            // Include current canonical activity for debugging
            let canonical = garage.getCanonicalActivity(tokenIndex);
            return ToolContext.makeStructuredError(
              code, e, retryable,
              [
                ("token_index", Json.int(tokenIndex)),
                ("current_activity_type", Json.str(canonical.activityType)),
                ("can_collect_now", Json.bool(canonical.canCollectNow)),
              ],
              cb,
            );
          };
        };
        case (#ok(result)) {
          // Record dedication activity DP for scavenging
          // 3 DP base + 1 DP per 10 parts collected
          ctx.dedicationManager.recordScavengingCompletion(tokenIndex, result.totalParts, now);

          // Build parts breakdown
          let partsBreakdown = "Speed Chips: " # Nat.toText(result.speedChips) #
          ", Power Cells: " # Nat.toText(result.powerCoreFragments) #
          ", Thruster Kits: " # Nat.toText(result.thrusterKits) #
          ", Gyro Units: " # Nat.toText(result.gyroModules) #
          ", Universal: " # Nat.toText(result.universalParts);

          // Format hours elapsed
          let hoursElapsed = result.hoursOut;
          let hoursText = if (hoursElapsed < 1) {
            "< 1 hour";
          } else {
            Nat.toText(hoursElapsed) # " hours";
          };

          let response = Json.obj([
            ("token_index", Json.int(tokenIndex)),
            ("already_idle", Json.bool(false)),
            ("hours_elapsed", Json.int(result.hoursOut)),
            ("total_parts", Json.int(result.totalParts)),
            ("speed_chips", Json.int(result.speedChips)),
            ("power_core_fragments", Json.int(result.powerCoreFragments)),
            ("thruster_kits", Json.int(result.thrusterKits)),
            ("gyro_modules", Json.int(result.gyroModules)),
            ("universal_parts", Json.int(result.universalParts)),
            ("parts_breakdown", Json.str(partsBreakdown)),
            ("message", Json.str("✅ Bot retrieved! Time out: " # hoursText # ". Collected " # Nat.toText(result.totalParts) # " parts: " # partsBreakdown)),
          ]);

          ToolContext.makeSuccess(response, cb);
        };
      };
    };
  };
};
