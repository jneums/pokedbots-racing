import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Error "mo:base/Error";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";
import IcpLedger "../IcpLedger";
import ExtIntegration "../ExtIntegration";

module {
  // Recharge cost: 0.1 ICP + 0.0001 ICP fee (reduced for testing)
  let RECHARGE_COST = 10000000 : Nat; // 0.1 ICP in e8s
  let TRANSFER_FEE = 10000 : Nat; // 0.0001 ICP in e8s
  let RECHARGE_COOLDOWN : Int = 21600000000000; // 6 hours in nanoseconds

  public func config() : McpTypes.Tool = {
    name = "garage_recharge_robot";
    title = ?"Recharge Robot Battery";
    description = ?"Recharge robot battery. Costs 0.1 ICP + 0.0001 fee. Restores 75 battery. Does NOT restore condition (use garage_repair_robot). 6hr cooldown. Requires ICRC-2 approval.\n\n**OVERCHARGE MECHANIC:**\n• Base overcharge: (100 - battery) × 0.4, max 40%\n• Efficiency affected by CONDITION + RNG: 0.5 + (condition/200) + random(-0.2, +0.2)\n  - 100% condition: 80-120% efficiency (reliable)\n  - 50% condition: 55-95% efficiency (risky)\n  - 0% condition: 30-70% efficiency (wildcard)\n• Examples at 100% condition:\n  - 10% battery → 28-43% overcharge (avg 36%, capped at 40%)\n  - 50% battery → 16-24% overcharge (avg 20%)\n• Overcharge consumed in next race for one-time stat boost:\n  - Speed: +0.15% per 1% overcharge (max +6% at 40%)\n  - Acceleration: +0.15% per 1% overcharge (max +6% at 40%)\n  - Stability: -0.1% per 1% overcharge (max -4% at 40%)\n  - Power Core: -0.1% per 1% overcharge (max -4% at 40%)\n• ⚠️ REPAIR RESETS OVERCHARGE: Repairing clears overcharge to prevent exploit cycles\n• Strategic: Low battery + high condition = reliable boost";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot to recharge"))]))])),
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

      // Check if bot is currently scavenging
      switch (racingStats.activeMission) {
        case (?mission) {
          return ToolContext.makeError("Cannot recharge while bot is on a scavenging mission. Complete the mission first.", cb);
        };
        case (null) {};
      };

      // Check cooldown with Food faction synergy (reduces cooldown by 15-45%)
      let synergies = ctx.garageManager.calculateFactionSynergies(user);
      let adjustedCooldown = Float.toInt(Float.fromInt(RECHARGE_COOLDOWN) * synergies.costMultipliers.rechargeCooldown);

      let now = Time.now();
      switch (racingStats.lastRecharged) {
        case (?lastTime) {
          let timeSince = now - lastTime;
          if (timeSince < adjustedCooldown) {
            let hoursLeft = (adjustedCooldown - timeSince) / (60 * 60 * 1_000_000_000);
            return ToolContext.makeError("Recharge cooldown active. Hours remaining: " # Nat.toText(Int.abs(hoursLeft)), cb);
          };
        };
        case (null) {};
      };

      // Get ICP Ledger canister ID from context
      let ledgerId = switch (ctx.icpLedgerCanisterId()) {
        case (?id) { id };
        case (null) {
          return ToolContext.makeError("ICP Ledger not configured", cb);
        };
      };

      // Pull payment via ICRC-2
      let icpLedger = actor (Principal.toText(ledgerId)) : actor {
        icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
      };
      let totalCost = RECHARGE_COST + TRANSFER_FEE;

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
          case (#Err(error)) {
            let errorMsg = switch (error) {
              case (#InsufficientFunds { balance }) {
                "Insufficient funds. Balance: " # Nat.toText(balance) # " e8s, Required: " # Nat.toText(totalCost) # " e8s";
              };
              case (#InsufficientAllowance { allowance }) {
                "Insufficient ICRC-2 allowance. Current: " # Nat.toText(allowance) # " e8s, Required: " # Nat.toText(totalCost) # " e8s. Please approve the canister first.";
              };
              case (#BadFee { expected_fee }) {
                "Bad fee. Expected: " # Nat.toText(expected_fee) # " e8s";
              };
              case _ { "Transfer failed" };
            };
            return ToolContext.makeError(errorMsg, cb);
          };
          case (#Ok(blockIndex)) {
            // Payment successful, calculate battery and overcharge
            let totalRecharge = 75;
            let currentBattery = racingStats.battery;
            let currentCondition = racingStats.condition;
            let maxBattery = 100;

            // Battery increases by 75 (capped at 100)
            let newBattery = Nat.min(maxBattery, currentBattery + totalRecharge);

            // Overcharge based on how LOW battery was before recharge
            // Lower battery = bigger overcharge potential (risk/reward mechanic)
            // Base formula: (100 - currentBattery) * 0.4, max 40%
            let batteryDeficit = if (currentBattery >= 100) { 0 } else {
              100 - currentBattery;
            };
            let baseOvercharge = Float.fromInt(batteryDeficit) * 0.4;

            // Condition affects efficiency with randomness
            // efficiency = 0.5 + (condition / 200) + random(-0.2, +0.2)
            // At 100% condition: 0.5 + 0.5 + random = 0.8-1.2 (avg 1.0)
            // At 50% condition: 0.5 + 0.25 + random = 0.55-0.95 (avg 0.75)
            // At 0% condition: 0.5 + 0 + random = 0.3-0.7 (avg 0.5)
            let conditionBonus = Float.fromInt(currentCondition) / 200.0;

            // Generate pseudo-random variance based on timestamp and token index
            let seed = Int.abs(now) + tokenIndex;
            let randomHash = seed % 1000; // 0-999
            let randomVariance = (Float.fromInt(randomHash) / 1000.0) * 0.4 - 0.2; // -0.2 to +0.2

            let efficiency = 0.5 + conditionBonus + randomVariance;
            let finalOvercharge = baseOvercharge * efficiency;
            let newOvercharge = Nat.min(40, Int.abs(Float.toInt(finalOvercharge)));

            let batteryRestored = if (newBattery >= currentBattery) {
              newBattery - currentBattery;
            } else { 0 };
            let overchargeAdded = if (newOvercharge >= racingStats.overcharge) {
              newOvercharge - racingStats.overcharge;
            } else { 0 };

            let updatedStats = {
              racingStats with
              battery = newBattery;
              overcharge = newOvercharge;
              lastRecharged = ?now;
            };

            ctx.garageManager.updateStats(tokenIndex, updatedStats);

            let overchargeMsg = if (overchargeAdded > 0) {
              let speedBoost = Int.abs(Float.toInt(Float.fromInt(overchargeAdded) * 0.15));
              let stabilityPenalty = Int.abs(Float.toInt(Float.fromInt(overchargeAdded) * 0.1));
              " ⚡ OVERCHARGE: +" # Nat.toText(overchargeAdded) # "% (+" # Nat.toText(speedBoost) # "% Speed/Accel, -" # Nat.toText(stabilityPenalty) # "% Stability/PowerCore for next race)";
            } else {
              "";
            };

            let response = Json.obj([
              ("token_index", Json.int(tokenIndex)),
              ("action", Json.str("Recharge Battery")),
              ("payment", Json.obj([("amount", Json.str("0.1 ICP")), ("fee", Json.str("0.0001 ICP")), ("total", Json.str("0.1001 ICP")), ("block_index", Json.int(blockIndex))])),
              ("battery_restored", Json.int(batteryRestored)),
              ("new_battery", Json.int(updatedStats.battery)),
              ("overcharge_added", Json.int(overchargeAdded)),
              ("new_overcharge", Json.int(updatedStats.overcharge)),
              ("cost_icp", Json.str("0.1")),
              ("next_available_hours", Json.int(6)),
              ("message", Json.str("⚡ Power cells recharged. Battery at " # Nat.toText(updatedStats.battery) # "%" # overchargeMsg)),
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
