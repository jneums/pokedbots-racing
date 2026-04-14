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
import ResonanceSystem "../ResonanceSystem";

module {
  // Recharge cost: 0.1 ICP + 0.0001 ICP fee (reduced for testing)
  let RECHARGE_COST = 10000000 : Nat; // 0.1 ICP in e8s
  let TRANSFER_FEE = 10000 : Nat; // 0.0001 ICP in e8s
  let RECHARGE_COOLDOWN : Int = 7200000000000; // 2 hours in nanoseconds

  public func config() : McpTypes.Tool = {
    name = "garage_recharge_robot";
    title = ?"Recharge Robot Battery";
    description = ?"Recharge bot battery (0.1 ICP). Restores 50-90 battery (RNG). 2hr cooldown. Does NOT restore condition. Generates overcharge based on resonance field. Requires ICRC-2 approval. Use help_get_compendium for resonance/overcharge mechanics.";
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

      // Get racing stats and verify ownership via registration
      let racingStats = switch (ctx.garageManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("This PokedBot is not initialized for racing. Use garage_initialize_pokedbot first.", cb);
        };
        case (?stats) { stats };
      };

      // Verify caller is registered owner
      if (racingStats.ownerPrincipal != user) {
        return ToolContext.makeError("You are not the registered owner of this PokedBot.", cb);
      };

      // Check if bot is currently scavenging
      switch (racingStats.activeMission) {
        case (?mission) {
          return ToolContext.makeError("Cannot recharge while bot is on a scavenging mission. Complete the mission first.", cb);
        };
        case (null) {};
      };

      // Check cooldown with Food faction synergy (reduces cooldown by 15-45%)
      // Also apply Bot Dedication tier cooldown reduction (0-50%)
      let synergies = ctx.garageManager.calculateFactionSynergies(user);
      let tierBenefits = ctx.dedicationManager.getBenefitsForBot(tokenIndex);
      let adjustedCooldown = Float.toInt(Float.fromInt(RECHARGE_COOLDOWN) * synergies.costMultipliers.rechargeCooldown * tierBenefits.rechargeCooldownMult);

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
            let currentBattery = racingStats.battery;
            let currentCondition = racingStats.condition;
            let maxBattery = 100;

            // Generate pseudo-random values based on timestamp, token index, and entropy
            // CRITICAL FIX: Use entropy counter to ensure unique seeds even when Time.now() is identical
            let entropy = ctx.garageManager.getNextEntropy();
            let seed = Int.abs(now) + tokenIndex + (entropy * 7919);
            let randomHash1 = seed % 1000; // 0-999
            let randomHash2 = (seed * 7919) % 1000; // Different seed for battery RNG

            // BATTERY RECHARGE: 50-90 range (base 70 ± 20)
            // This makes waiting for 0% battery risky - you might only get +50!
            let batteryRNG = (Float.fromInt(randomHash2) / 1000.0) * 40.0 - 20.0; // -20 to +20
            let totalRecharge = Int.abs(Float.toInt(70.0 + batteryRNG)); // 50-90
            let newBattery = Nat.min(maxBattery, currentBattery + totalRecharge);

            // ===== RESONANCE SYSTEM FOR OVERCHARGE =====
            // Each bot has a unique resonance field that determines optimal recharge points
            // Recharging near the optimal point gives maximum overcharge bonus
            let resonance = ResonanceSystem.calculateResonance(tokenIndex, #Recharge, currentBattery, now);

            // Overcharge based on how LOW battery was before recharge
            // Lower battery = bigger overcharge potential (risk/reward mechanic)
            // Base formula: (100 - currentBattery) * 0.4, theoretical max 40%
            let batteryDeficit = if (currentBattery >= 100) { 0 } else {
              100 - currentBattery;
            };
            let baseOvercharge = Float.fromInt(batteryDeficit) * 0.4;

            // Condition affects efficiency with some randomness
            let conditionBonus = Float.fromInt(currentCondition) / 200.0;
            let randomVariance = (Float.fromInt(randomHash1) / 1000.0) * 0.5 - 0.25; // -0.25 to +0.25 (reduced from ±0.35)
            let efficiency = 0.5 + conditionBonus + randomVariance; // Base 0.5 (up from 0.4)

            // Apply resonance modifier to overcharge
            // Peak resonance: full potential (100%)
            // Good resonance: 80% of potential
            // Outside resonance: 60% of potential (baseline)
            let resonanceModifier = if (resonance.inPeakZone) {
              1.0;
            } else if (resonance.inGoodZone) {
              0.8;
            } else {
              0.6;
            };

            let finalOvercharge = baseOvercharge * efficiency * resonanceModifier;
            // MCP cap at 25% overcharge (max +5% stat boost) - UI gets 40% cap (max +8%)
            let newOvercharge = Nat.min(25, Int.abs(Float.toInt(finalOvercharge)));

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

            // Record dedication points for ICP investment (1 ICP = 100 DP)
            // Recharge costs 0.1 ICP = 10,000,000 e8s = 10 DP
            ctx.dedicationManager.recordRecharge(tokenIndex, RECHARGE_COST, now);

            // Record activity DP for battery restoration (1 DP per 25 battery)
            ctx.dedicationManager.recordBatteryRestored(tokenIndex, batteryRestored, now);

            // Build resonance message - don't reveal optimal point
            let resonanceMsg = if (resonance.inPeakZone) {
              " 🔮 PEAK RESONANCE! Maximum overcharge achieved!";
            } else if (resonance.inGoodZone) {
              " ✨ Good resonance - solid overcharge bonus";
            } else {
              "";
            };

            let overchargeMsg = if (overchargeAdded > 0) {
              let speedBoost = Int.abs(Float.toInt(Float.fromInt(overchargeAdded) * 0.25));
              let stabilityPenalty = Int.abs(Float.toInt(Float.fromInt(overchargeAdded) * 0.133));
              " ⚡ OVERCHARGE: +" # Nat.toText(overchargeAdded) # "% (+" # Nat.toText(speedBoost) # "% Speed/Accel, -" # Nat.toText(stabilityPenalty) # "% Stability/PowerCore for next race)" # resonanceMsg;
            } else {
              resonanceMsg;
            };

            let response = Json.obj([
              ("token_index", Json.int(tokenIndex)),
              ("action", Json.str("Recharge Battery")),
              ("payment", Json.obj([("amount", Json.str("0.1 ICP")), ("fee", Json.str("0.0001 ICP")), ("total", Json.str("0.1001 ICP")), ("block_index", Json.int(blockIndex))])),
              ("battery_restored", Json.int(batteryRestored)),
              ("new_battery", Json.int(updatedStats.battery)),
              ("overcharge_added", Json.int(overchargeAdded)),
              ("new_overcharge", Json.int(updatedStats.overcharge)),
              ("resonance_status", Json.str(resonance.resonanceStatus)),
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
