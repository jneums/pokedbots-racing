import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Time "mo:base/Time";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import Racing "../Racing";
import WastelandFlavor "WastelandFlavor";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_get_robot_details";
    title = ?"Get Robot Details";
    description = ?"Get comprehensive details for a specific PokedBot including stats, condition, career, and upgrade status. The bot must be initialized for racing first.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot to view (e.g., 4079)"))]))])),
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

      // Get racing stats
      let racingStats = switch (ctx.racingStatsManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("This PokedBot is not initialized for racing. Use garage_initialize_pokedbot first.", cb);
        };
        case (?stats) { stats };
      };

      // Verify ownership
      if (not Principal.equal(racingStats.ownerPrincipal, user)) {
        return ToolContext.makeError("You do not own this PokedBot.", cb);
      };

      // Calculate overall rating
      let overallRating = ctx.racingStatsManager.calculateOverallRating(racingStats);
      let status = ctx.racingStatsManager.getBotStatus(racingStats);
      let canRace = ctx.racingStatsManager.canRace(racingStats);

      // Get wasteland flavor text
      let factionGreeting = WastelandFlavor.getFactionGreeting(racingStats.faction);
      let statusFlavor = WastelandFlavor.getStatusFlavor(status, racingStats.faction);
      let reputationTier = WastelandFlavor.getReputationTier(racingStats.factionReputation);

      // Helper functions for text conversion
      let factionText = switch (racingStats.faction) {
        case (#BattleBot) { "BattleBot" };
        case (#EntertainmentBot) { "EntertainmentBot" };
        case (#WildBot) { "WildBot" };
        case (#GodClass) { "GodClass" };
        case (#Master) { "Master" };
      };

      let distanceText = switch (racingStats.preferredDistance) {
        case (#ShortSprint) { "ShortSprint (< 10km)" };
        case (#MediumHaul) { "MediumHaul (10-20km)" };
        case (#LongTrek) { "LongTrek (> 20km)" };
      };

      let terrainText = switch (racingStats.preferredTerrain) {
        case (#ScrapHeaps) { "ScrapHeaps" };
        case (#WastelandSand) { "WastelandSand" };
        case (#MetalRoads) { "MetalRoads" };
      };

      // Check for active upgrade
      let now = Time.now();
      let upgradeInfo = switch (ctx.racingStatsManager.getActiveUpgrade(tokenIndex)) {
        case null { null };
        case (?session) {
          if (session.endsAt > now) {
            let timeRemaining = session.endsAt - now;
            let hoursRemaining = timeRemaining / 3_600_000_000_000;
            let minutesRemaining = (timeRemaining % 3_600_000_000_000) / 60_000_000_000;

            let upgradeTypeText = switch (session.upgradeType) {
              case (#Velocity) { "Velocity (Speed)" };
              case (#PowerCore) { "Power Core" };
              case (#Thruster) { "Thruster (Acceleration)" };
              case (#Gyro) { "Gyro (Stability)" };
            };

            ?Json.obj([
              ("type", Json.str(upgradeTypeText)),
              ("time_remaining_hours", Json.int(hoursRemaining)),
              ("time_remaining_minutes", Json.int(minutesRemaining)),
              ("ends_at", Json.int(session.endsAt)),
              ("status", Json.str("In Progress")),
            ]);
          } else {
            null;
          };
        };
      };

      // Get current and base stats
      let currentStats = ctx.racingStatsManager.getCurrentStats(racingStats);
      let baseStats = ctx.racingStatsManager.getBaseStats(tokenIndex);

      // Build JSON response
      let response = Json.obj([
        ("message", Json.str(factionGreeting)),
        ("token_index", Json.int(tokenIndex)),
        ("racing_license", Json.str("REGISTERED")),
        ("owner", Json.str(Principal.toText(user))),
        ("faction", Json.str(factionText)),
        ("stats", Json.obj([("speed", Json.int(currentStats.speed)), ("powerCore", Json.int(currentStats.powerCore)), ("acceleration", Json.int(currentStats.acceleration)), ("stability", Json.int(currentStats.stability)), ("base_speed", Json.int(baseStats.speed)), ("base_powerCore", Json.int(baseStats.powerCore)), ("base_acceleration", Json.int(baseStats.acceleration)), ("base_stability", Json.int(baseStats.stability)), ("speed_bonus", Json.int(racingStats.speedBonus)), ("powerCore_bonus", Json.int(racingStats.powerCoreBonus)), ("acceleration_bonus", Json.int(racingStats.accelerationBonus)), ("stability_bonus", Json.int(racingStats.stabilityBonus))])),
        ("condition", Json.obj([("battery", Json.int(racingStats.battery)), ("condition", Json.int(racingStats.condition)), ("calibration", Json.int(racingStats.calibration)), ("status", Json.str(status)), ("status_message", Json.str(statusFlavor))])),
        ("career", Json.obj([("races_entered", Json.int(racingStats.racesEntered)), ("wins", Json.int(racingStats.wins)), ("places", Json.int(racingStats.places)), ("shows", Json.int(racingStats.shows)), ("total_scrap_earned", Json.int(racingStats.totalScrapEarned)), ("faction_reputation", Json.int(racingStats.factionReputation)), ("reputation_tier", Json.str(reputationTier))])),
        ("overall_rating", Json.int(overallRating)),
        ("can_race", Json.bool(canRace)),
        ("preferred_distance", Json.str(distanceText)),
        ("preferred_terrain", Json.str(terrainText)),
        ("experience", Json.int(racingStats.experience)),
        (
          "active_upgrade",
          switch (upgradeInfo) {
            case null { Json.obj([("status", Json.str("None"))]) };
            case (?info) { info };
          },
        ),
      ]);

      ToolContext.makeSuccess(response, cb);
    };
  };
};
