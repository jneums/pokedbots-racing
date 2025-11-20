import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Error "mo:base/Error";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";
import IcpLedger "../IcpLedger";
import TimerTool "mo:timer-tool";
import ExtIntegration "../ExtIntegration";
import WastelandFlavor "WastelandFlavor";

module {
  let UPGRADE_COST = 20000000 : Nat; // 0.2 ICP (reduced for testing)
  let TRANSFER_FEE = 10000 : Nat;
  let UPGRADE_DURATION : Int = 43200000000000; // 12 hours in nanoseconds

  public func config() : McpTypes.Tool = {
    name = "garage_upgrade_robot";
    title = ?"Upgrade Robot";
    description = ?"Start an upgrade session. Types: Velocity (+Speed), PowerCore (+Power Core), Thruster (+Acceleration), Gyro (+Stability). Costs 20 ICP, takes 12 hours.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot"))])), ("upgrade_type", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("Velocity"), Json.str("PowerCore"), Json.str("Thruster"), Json.str("Gyro")])), ("description", Json.str("The type of upgrade"))]))])),
      ("required", Json.arr([Json.str("token_index"), Json.str("upgrade_type")])),
    ]);
    outputSchema = null;
  };

  public func handle(ctx : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {
      let user = switch (_auth) {
        case (null) {
          return ToolContext.makeError("Authentication required", cb);
        };
        case (?auth) { auth.principal };
      };

      let tokenIndex = switch (Result.toOption(Json.getAsNat(_args, "token_index"))) {
        case (null) { return ToolContext.makeError("Missing token_index", cb) };
        case (?idx) { idx };
      };

      let upgradeTypeStr = switch (Result.toOption(Json.getAsText(_args, "upgrade_type"))) {
        case (null) { return ToolContext.makeError("Missing upgrade_type", cb) };
        case (?t) { t };
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

      // Get racing stats
      let racingStats = switch (ctx.garageManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("This PokedBot is not initialized for racing. Use garage_initialize_pokedbot first.", cb);
        };
        case (?stats) { stats };
      };

      if (racingStats.battery < 30 or racingStats.condition < 50) {
        return ToolContext.makeError("Battery must be > 30 and condition > 50", cb);
      };

      let now = Time.now();
      switch (racingStats.upgradeEndsAt) {
        case (?endsAt) {
          if (endsAt > now) {
            return ToolContext.makeError("Upgrade already in progress", cb);
          };
        };
        case (null) {};
      };

      let icpLedger = actor ("ryjl3-tyaaa-aaaaa-aaaba-cai") : actor {
        icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
      };
      let totalCost = UPGRADE_COST + TRANSFER_FEE;

      try {
        let transferResult = await icpLedger.icrc2_transfer_from({
          from = { owner = user; subaccount = null };
          to = { owner = ctx.canisterPrincipal; subaccount = null };
          amount = totalCost;
          fee = ?TRANSFER_FEE;
          memo = null;
          created_at_time = null;
          spender_subaccount = null;
        });

        switch (transferResult) {
          case (#Err(_)) {
            return ToolContext.makeError("Payment failed - check ICRC-2 allowance", cb);
          };
          case (#Ok(blockIndex)) {
            let endsAt = now + UPGRADE_DURATION;

            // Parse upgrade type
            let upgradeType : PokedBotsGarage.UpgradeType = switch (upgradeTypeStr) {
              case "velocity" { #Velocity };
              case "power_core" { #PowerCore };
              case "thruster" { #Thruster };
              case "gyro" { #Gyro };
              case _ { #Velocity }; // default
            };

            // Get flavor text for this upgrade and faction
            let upgradeFlavor = WastelandFlavor.getUpgradeFlavor(upgradeType, racingStats.faction);

            // Track the upgrade session
            ctx.garageManager.startUpgrade(tokenIndex, upgradeType, now, endsAt);

            // Schedule timer to complete the upgrade
            let actionId = ctx.timerTool.setActionSync<system>(
              Int.abs(endsAt),
              {
                actionType = "upgrade_complete";
                params = to_candid (tokenIndex);
              },
            );

            let updatedStats = {
              racingStats with
              battery = Nat.sub(racingStats.battery, 15);
              upgradeEndsAt = ?endsAt;
            };

            ctx.garageManager.updateStats(tokenIndex, updatedStats);

            let expectedGain = switch (racingStats.faction) {
              case (#GodClass) { "1-3 points (20% chance for 2x bonus!)" };
              case (#WildBot) { "Unstable: Could range wildly" };
              case (_) { "1-3 stat points" };
            };

            let response = Json.obj([
              ("token_index", Json.int(tokenIndex)),
              ("upgrade_type", Json.str(upgradeFlavor)),
              ("duration_hours", Json.int(12)),
              ("expected_gain", Json.str(expectedGain)),
              ("message", Json.str("🔧 Upgrade in progress. Your bot is in the garage bay, scavenging wasteland tech. Check back in 12 hours.")),
            ]);

            ToolContext.makeSuccess(response, cb);
          };
        };
      } catch (e) {
        return ToolContext.makeError("Payment failed: " # Error.message(e), cb);
      };
    };
  };
};
