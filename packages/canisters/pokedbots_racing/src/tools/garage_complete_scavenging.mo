import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Array "mo:base/Array";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";
import ExtIntegration "../ExtIntegration";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_complete_scavenging";
    title = ?"Complete Scavenging Mission";
    description = ?"Complete a scavenging mission and collect rewards. Awards parts to your inventory and potentially world buffs.\n\n**Rewards:**\n• Parts distributed across multiple types (Speed Chips, Power Core Fragments, Thruster Kits, Gyro Modules, Universal Parts)\n• Distribution varies by zone: ScrapHeaps (40% universal), AbandonedSettlements (25% universal), DeadMachineFields (10% universal)\n• Battery and condition consumed based on zone difficulty\n• 15% chance for world buff (expires in 48h)\n• Faction-specific bonuses and specials applied\n\n**Mission durations: ShortExpedition (5h), DeepSalvage (11h), WastelandExpedition (23h)**\n**Can only complete after mission duration has elapsed.**";
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

      // Complete mission
      let garage = ctx.garageManager;
      let now = Time.now();
      let rng = Int.abs(now / 1000); // Simple RNG seed

      switch (garage.completeScavengingMission(tokenIndex, now, rng)) {
        case (#err(e)) {
          return ToolContext.makeError(e, cb);
        };
        case (#ok(result)) {
          // Build event messages
          var eventText = "";
          for (event in result.events.vals()) {
            eventText := eventText # event # ", ";
          };

          // Build world buff description
          let buffText = if (result.worldBuffApplied) {
            switch (result.worldBuff) {
              case (?buff) {
                var statsText = "";
                for ((stat, value) in buff.stats.vals()) {
                  statsText := statsText # "+" # Nat.toText(value) # " " # stat # " ";
                };
                "World buff earned: " # statsText # "(expires in 48h)";
              };
              case (null) { "" };
            };
          } else { "" };

          // Build parts breakdown
          let partsBreakdown = "Speed Chips: " # Nat.toText(result.speedChips) #
          ", Power Cells: " # Nat.toText(result.powerCoreFragments) #
          ", Thruster Kits: " # Nat.toText(result.thrusterKits) #
          ", Gyro Units: " # Nat.toText(result.gyroModules) #
          ", Universal: " # Nat.toText(result.universalParts);

          let response = Json.obj([
            ("token_index", Json.int(tokenIndex)),
            ("parts_found", Json.int(result.partsFound)),
            ("speed_chips", Json.int(result.speedChips)),
            ("power_core_fragments", Json.int(result.powerCoreFragments)),
            ("thruster_kits", Json.int(result.thrusterKits)),
            ("gyro_modules", Json.int(result.gyroModules)),
            ("universal_parts", Json.int(result.universalParts)),
            ("battery_consumed", Json.int(result.batteryConsumed)),
            ("condition_lost", Json.int(result.conditionLost)),
            ("world_buff_applied", Json.bool(result.worldBuffApplied)),
            ("events", Json.str(eventText)),
            ("parts_breakdown", Json.str(partsBreakdown)),
            ("message", Json.str("✅ Mission complete! Found " # Nat.toText(result.partsFound) # " parts: " # partsBreakdown # ". " # buffText)),
          ]);

          ToolContext.makeSuccess(response, cb);
        };
      };
    };
  };
};
