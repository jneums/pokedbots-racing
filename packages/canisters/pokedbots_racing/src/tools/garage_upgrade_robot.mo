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
  let PART_PRICE_E8S = 1_000_000 : Nat; // 0.01 ICP per part (100 parts = 1 ICP)
  let TRANSFER_FEE = 10000 : Nat;
  let UPGRADE_DURATION : Int = 43200000000000; // 12 hours in nanoseconds

  public func config() : McpTypes.Tool = {
    name = "garage_upgrade_robot";
    title = ?"Upgrade Robot";
    description = ?"Start a 12-hour upgrade session. Types: Velocity (+Speed), PowerCore (+Power Core), Thruster (+Acceleration), Gyro (+Stability). Pay with specific parts, Universal Parts (can substitute), or ICP. Use garage_get_robot_details to see exact costs.\n\nFor detailed upgrade mechanics (difficulty scaling, faction bonuses), use help_get_compendium tool.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot"))])), ("upgrade_type", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("Velocity"), Json.str("PowerCore"), Json.str("Thruster"), Json.str("Gyro")])), ("description", Json.str("The type of upgrade"))])), ("payment_method", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("parts"), Json.str("icp")])), ("description", Json.str("Payment method: parts (from inventory) or icp (ICRC-2 approval required)"))]))])),
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

      let paymentMethod = switch (Result.toOption(Json.getAsText(_args, "payment_method"))) {
        case (null) { "parts" }; // Default to parts (earned from racing)
        case (?method) { method };
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

      // Get racing stats
      let racingStats = switch (ctx.garageManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("This PokedBot is not initialized for racing. Use garage_initialize_pokedbot first.", cb);
        };
        case (?stats) { stats };
      };

      // Upgrades can be started at any battery/condition level
      let now = Time.now();
      switch (racingStats.upgradeEndsAt) {
        case (?endsAt) {
          if (endsAt > now) {
            return ToolContext.makeError("Upgrade already in progress", cb);
          };
        };
        case (null) {};
      };

      // Parse upgrade type
      let upgradeType : PokedBotsGarage.UpgradeType = switch (upgradeTypeStr) {
        case "Velocity" { #Velocity };
        case "PowerCore" { #PowerCore };
        case "Thruster" { #Thruster };
        case "Gyro" { #Gyro };
        // Fallback for lowercase
        case "velocity" { #Velocity };
        case "power_core" { #PowerCore };
        case "thruster" { #Thruster };
        case "gyro" { #Gyro };
        case _ { #Velocity }; // default
      };

      // Determine cost
      let upgradeCount = ctx.garageManager.getUpgradeCount(tokenIndex, upgradeType);
      let partsNeeded = ctx.garageManager.calculateUpgradeCost(upgradeCount);

      // Determine part type
      let partType : PokedBotsGarage.PartType = switch (upgradeType) {
        case (#Velocity) { #SpeedChip };
        case (#PowerCore) { #PowerCoreFragment };
        case (#Thruster) { #ThrusterKit };
        case (#Gyro) { #GyroModule };
      };

      // Handle payment
      if (paymentMethod == "parts") {
        if (not ctx.garageManager.removeParts(user, partType, partsNeeded)) {
          return ToolContext.makeError("Insufficient parts. Needed: " # Nat.toText(partsNeeded) # " " # debug_show (partType) # " (Universal Parts can substitute). Race on appropriate terrain or go scavenging to earn them!", cb);
        };
      } else {
        // ICP payment
        // Get ICP Ledger canister ID from context
        let ledgerId = switch (ctx.icpLedgerCanisterId()) {
          case (?id) { id };
          case (null) {
            return ToolContext.makeError("ICP Ledger not configured", cb);
          };
        };

        let icpLedger = actor (Principal.toText(ledgerId)) : actor {
          icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
        };
        let totalCost = (partsNeeded * PART_PRICE_E8S) + TRANSFER_FEE;

        try {
          let transferResult = await icpLedger.icrc2_transfer_from({
            from = { owner = user; subaccount = null };
            to = { owner = ctx.canisterPrincipal; subaccount = null };
            amount = totalCost;
            fee = null;
            memo = null;
            created_at_time = null;
            spender_subaccount = null;
          });

          switch (transferResult) {
            case (#Err(_)) {
              return ToolContext.makeError("Payment failed - check ICRC-2 allowance. Cost: " # Nat.toText(totalCost) # " e8s", cb);
            };
            case (#Ok(_)) {};
          };
        } catch (e) {
          return ToolContext.makeError("Payment failed: " # Error.message(e), cb);
        };
      };

      // Start upgrade
      let endsAt = now + UPGRADE_DURATION;

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
        battery = if (racingStats.battery >= 15) {
          racingStats.battery - 15;
        } else { 0 };
        upgradeEndsAt = ?endsAt;
      };

      ctx.garageManager.updateStats(tokenIndex, updatedStats);

      let expectedGain = switch (racingStats.faction) {
        // Ultra-Rare: 10% chance for 2x
        case (#UltimateMaster or #Wild or #Golden or #Ultimate) {
          "1-3 points (10% chance for 2x bonus!)";
        };
        // Super-Rare: 20% chance for 2x
        case (#Blackhole or #Dead or #Master) {
          "1-3 points (20% chance for 2x bonus!)";
        };
        // Rare: 35% chance for 2x (CATCH-UP mechanic)
        case (#Bee or #Food or #Box or #Murder) {
          "1-3 points (35% chance for 2x bonus!)";
        };
        // Common: 25% chance for 2x
        case (#Game or #Animal or #Industrial) {
          "1-3 points (25% chance for 2x bonus!)";
        };
      };

      let response = Json.obj([
        ("token_index", Json.int(tokenIndex)),
        ("upgrade_type", Json.str(upgradeFlavor)),
        ("duration_hours", Json.int(12)),
        ("parts_used", Json.int(partsNeeded)),
        ("expected_gain", Json.str(expectedGain)),
        ("message", Json.str("🔧 Upgrade in progress. Your bot is in the garage bay, scavenging wasteland tech. Check back in 12 hours.")),
      ]);

      ToolContext.makeSuccess(response, cb);
    };
  };
};
