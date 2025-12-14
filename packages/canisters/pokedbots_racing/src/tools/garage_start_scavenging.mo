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
    description = ?"Send your PokedBot out into the wasteland to scavenge for parts. No ICP cost - only battery consumption.\n\n**CONTINUOUS SCAVENGING:**\n• Send bot out to scavenge (no fixed durations)\n• Accumulates rewards every 15 minutes automatically\n• Retrieve bot and collect rewards on demand with garage_complete_scavenging\n• Bot dies at 0 battery OR 0 condition → loses ALL pending rewards\n\n**Accumulation Rates (per 15 minutes):**\n• Base: 1.5 parts, 1.0 battery, 0.75 condition\n• Rates affected by zone multipliers and faction bonuses\n\n**Zones (ask user to choose):**\n• ScrapHeaps: Safe (1.0x parts, 1.0x costs) → 40% Universal Parts, 60% specialized\n• AbandonedSettlements: Moderate (1.4x parts, 1.2x battery, 1.3x condition) → 25% Universal, 75% specialized\n• DeadMachineFields: Dangerous (2.0x parts, 1.5x battery, 1.8x condition) → 10% Universal, 90% specialized\n\n**Part Types Explained:**\n• **Universal Parts** = Wildcard, use for ANY upgrade (Speed/PowerCore/Accel/Stability)\n• **Specialized Parts** = Locked to specific upgrade (Speed Chips only for Speed, Power Core Fragments only for Power Core, etc.)\n\n**Strategy:** Safe zones give more flexible Universal Parts. Dangerous zones give 2x total parts but mostly locked to specific upgrades.\n\n**World Buff:**\n• 3.75% chance per 15-minute check\n• Strength scales with hours elapsed (2-4 stat points)\n• Buffs expire in 48 hours if not used\n\n**If user doesn't specify zone, ASK them which zone they prefer before calling this tool!**";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot to send scavenging"))])), ("zone", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("ScrapHeaps"), Json.str("AbandonedSettlements"), Json.str("DeadMachineFields")])), ("description", Json.str("Zone difficulty and rewards"))]))])),
      ("required", Json.arr([Json.str("token_index"), Json.str("zone")])),
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

      let zoneStr = switch (Result.toOption(Json.getAsText(_args, "zone"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: zone", cb);
        };
        case (?val) { val };
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

      // Verify ownership via EXT (source of truth) - check user's wallet
      let walletAccountId = ExtIntegration.principalToAccountIdentifier(user, null);
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
          if (currentOwner != walletAccountId) {
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

          // Start continuous mission
          let now = Time.now();
          switch (garage.startScavengingMission(tokenIndex, zone, now)) {
            case (#err(e)) {
              return ToolContext.makeError(e, cb);
            };
            case (#ok(_)) {
              // Schedule first accumulation in 15 minutes
              let next15Min = now + (15 * 60 * 1_000_000_000);
              ignore ctx.timerTool.setActionSync<system>(
                Int.abs(next15Min),
                {
                  actionType = "scavenge_accumulate";
                  params = to_candid (tokenIndex);
                },
              );

              let zoneDesc = switch (zone) {
                case (#ScrapHeaps) { "Scrap Heaps (Safe)" };
                case (#AbandonedSettlements) {
                  "Abandoned Settlements (Moderate)";
                };
                case (#DeadMachineFields) { "Dead Machine Fields (Dangerous)" };
              };

              let response = Json.obj([
                ("token_index", Json.int(tokenIndex)),
                ("zone", Json.str(zoneDesc)),
                ("accumulation_interval", Json.str("15 minutes")),
                ("base_rates", Json.str("1.5 parts, 1.0 battery, 0.75 condition per 15min")),
                ("world_buff_chance", Json.str("3.75% per check (scales with time)")),
                ("message", Json.str("🔧 Bot sent out to scavenge in " # zoneDesc # ". Rewards accumulate every 15 minutes. Retrieve bot anytime with garage_complete_scavenging. WARNING: Bot dies at 0 battery OR condition = lose ALL pending rewards!")),
              ]);

              ToolContext.makeSuccess(response, cb);
            };
          };
        };
      };
    };
  };
};
