import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Time "mo:base/Time";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";
import ExtIntegration "../ExtIntegration";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_start_scavenging";
    title = ?"Start Scavenging Mission";
    description = ?"Send your PokedBot on a wasteland scavenging mission to gather parts. No ICP cost - only battery consumption.\n\n**REQUIRED: User must choose BOTH mission duration AND zone!**\n\n**Mission Types (ask user to choose):**\n• ShortExpedition (5h): 15-35 parts, costs 10 battery\n• DeepSalvage (11h): 40-80 parts, costs 20 battery  \n• WastelandExpedition (23h): 100-200 parts, costs 40 battery\n\n**Zones (ask user to choose):**\n• ScrapHeaps: Safe zone (1.0x multipliers, 40% universal parts)\n• AbandonedSettlements: Moderate risk (1.4x parts, 1.1x battery, 1.15x condition, 25% universal parts)\n• DeadMachineFields: High danger (2.0x parts, 1.2x battery, 1.3x condition, 10% universal parts)\n\n**Tip:** Higher risk zones give more specialized parts (Speed Chips, Power Core Fragments, etc.) but less Universal Parts.\n\n**15% chance for World Buff:**\n• 5h: +2 to one stat for next race\n• 11h: +3 speed, +2 accel for next race\n• 23h: +4 speed, +3 accel, +2 power for next race\n• Buffs expire in 48 hours if not used\n\n**If user doesn't specify zone, ASK them which zone they prefer before calling this tool!**";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot to send scavenging"))])), ("mission_type", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("ShortExpedition"), Json.str("DeepSalvage"), Json.str("WastelandExpedition")])), ("description", Json.str("Mission duration: ShortExpedition (6h), DeepSalvage (12h), WastelandExpedition (24h)"))])), ("zone", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("ScrapHeaps"), Json.str("AbandonedSettlements"), Json.str("DeadMachineFields")])), ("description", Json.str("Zone difficulty and rewards"))]))])),
      ("required", Json.arr([Json.str("token_index"), Json.str("mission_type"), Json.str("zone")])),
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

      // Parse arguments
      let tokenIndex = switch (Result.toOption(Json.getAsNat(_args, "token_index"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: token_index", cb);
        };
        case (?idx) { idx };
      };

      let missionTypeStr = switch (Result.toOption(Json.getAsText(_args, "mission_type"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: mission_type", cb);
        };
        case (?val) { val };
      };

      let zoneStr = switch (Result.toOption(Json.getAsText(_args, "zone"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: zone", cb);
        };
        case (?val) { val };
      };

      // Parse mission type
      let missionType : PokedBotsGarage.ScavengingMissionType = switch (missionTypeStr) {
        case ("ShortExpedition") { #ShortExpedition };
        case ("DeepSalvage") { #DeepSalvage };
        case ("WastelandExpedition") { #WastelandExpedition };
        case (_) {
          return ToolContext.makeError("Invalid mission_type. Must be ShortExpedition, DeepSalvage, or WastelandExpedition", cb);
        };
      };

      // Parse zone
      let zone : PokedBotsGarage.ScavengingZone = switch (zoneStr) {
        case ("ScrapHeaps") { #ScrapHeaps };
        case ("AbandonedSettlements") { #AbandonedSettlements };
        case ("DeadMachineFields") { #DeadMachineFields };
        case (_) {
          return ToolContext.makeError("Invalid zone. Must be ScrapHeaps, AbandonedSettlements, or DeadMachineFields", cb);
        };
      };

      // Verify ownership via EXT (source of truth)
      let garageSubaccount = ExtIntegration.deriveGarageSubaccount(user);
      let garageAccountId = ExtIntegration.principalToAccountIdentifier(ctx.canisterPrincipal, ?garageSubaccount);
      let ownerResult = try {
        await ctx.extCanister.bearer(ExtIntegration.encodeTokenIdentifier(Nat32.fromNat(tokenIndex), ctx.extCanisterId));
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

      // Get bot stats
      let garage = ctx.garageManager;
      switch (garage.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("Bot not initialized for racing. Use garage_initialize_pokedbot first.", cb);
        };
        case (?botStats) {
          // Check if already on a mission
          switch (botStats.activeMission) {
            case (?_) {
              return ToolContext.makeError("Bot is already on a scavenging mission", cb);
            };
            case (null) {};
          };

          // Start mission
          let now = Time.now();
          switch (garage.startScavengingMission(tokenIndex, missionType, zone, now)) {
            case (#err(e)) {
              return ToolContext.makeError(e, cb);
            };
            case (#ok(mission)) {
              let durationHours = switch (missionType) {
                case (#ShortExpedition) { "6" };
                case (#DeepSalvage) { "12" };
                case (#WastelandExpedition) { "24" };
              };

              let zoneDesc = switch (zone) {
                case (#ScrapHeaps) { "Scrap Heaps (Safe)" };
                case (#AbandonedSettlements) {
                  "Abandoned Settlements (Moderate)";
                };
                case (#DeadMachineFields) { "Dead Machine Fields (Dangerous)" };
              };

              let completionTime = Int.abs((mission.endTime - now) / 1_000_000_000 / 60); // minutes

              let response = Json.obj([
                ("token_index", Json.int(tokenIndex)),
                ("mission_id", Json.int(mission.missionId)),
                ("mission_type", Json.str(missionTypeStr)),
                ("zone", Json.str(zoneDesc)),
                ("duration_hours", Json.str(durationHours)),
                ("completes_in_minutes", Json.int(completionTime)),
                ("world_buff_chance", Json.str("15%")),
                ("message", Json.str("🔧 Scavenging mission started. Bot locked in mission for " # durationHours # " hours. Use garage_complete_scavenging to collect rewards when ready.")),
              ]);

              ToolContext.makeSuccess(response, cb);
            };
          };
        };
      };
    };
  };
};
