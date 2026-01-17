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
  let REPAIR_COST = 5000000 : Nat; // 0.05 ICP
  let TRANSFER_FEE = 10000 : Nat;
  let REPAIR_COOLDOWN : Int = 10800000000000; // 3 hours in nanoseconds
  let REPAIR_AMOUNT : Nat = 30; // Base repair restores 30 condition

  public func config() : McpTypes.Tool = {
    name = "garage_repair_robot";
    title = ?"Repair Robot Condition";
    description = ?"Repair a robot to restore condition. Costs 0.05 ICP + 0.0001 ICP transfer fee. Restores 30 Condition. Cooldown: 3 hours.\n\n**RESONANCE SYSTEM (NEW!):**\n• Each bot has a unique 'resonance field' that determines optimal repair points\n• Resonance drifts slowly over time (~weekly cycle with daily micro-shifts)\n• Peak Zone (±3% of optimal): Full Perfect Tune-Up - ALL overcharge penalties removed!\n• Good Zone (±10% of optimal): Partial Tune-Up - 70% of overcharge penalties removed\n• Outside Resonance: Standard repair - overcharge is RESET to prevent exploit loops\n• Use garage_get_robot_details to check your bot's current resonance\n\n**PERFECT TUNE-UP:**\n• Achieved by repairing within your bot's resonance window while having overcharge\n• Removes the Stability/PowerCore penalties from overcharge, keeping the Speed/Accel boost!\n• Strategic depth: Each bot's optimal point is different and changes over time";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot to repair"))]))])),
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
      let user = switch (_auth) {
        case (null) {
          return ToolContext.makeError("Authentication required", cb);
        };
        case (?auth) { auth.principal };
      };

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
          return ToolContext.makeError("Cannot repair while bot is on a scavenging mission. Complete the mission first.", cb);
        };
        case (null) {};
      };

      let now = Time.now();

      // Apply Bot Dedication tier cooldown reduction (0-40%) to repair cooldown
      let tierBenefits = ctx.dedicationManager.getTierBenefits(tokenIndex);
      let adjustedRepairCooldown = Float.toInt(Float.fromInt(REPAIR_COOLDOWN) * tierBenefits.repairCooldownMult);

      switch (racingStats.lastRepaired) {
        case (?lastTime) {
          if (now - lastTime < adjustedRepairCooldown) {
            let hoursLeft = (adjustedRepairCooldown - (now - lastTime)) / (60 * 60 * 1_000_000_000);
            return ToolContext.makeError("Repair cooldown active. Hours remaining: " # Nat.toText(Int.abs(hoursLeft)), cb);
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

      let icpLedger = actor (Principal.toText(ledgerId)) : actor {
        icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
      };

      // Apply Industrial faction synergy discount to repair cost
      let synergies = ctx.garageManager.calculateFactionSynergies(user);
      let repairCostWithSynergy = Nat.max(1_000_000, Int.abs(Float.toInt(Float.fromInt(REPAIR_COST) * synergies.costMultipliers.repairCost)));
      let totalCost = repairCostWithSynergy + TRANSFER_FEE;

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
            return ToolContext.makeError("Payment failed", cb);
          };
          case (#Ok(blockIndex)) {
            let conditionRestored = Nat.min(REPAIR_AMOUNT, 100 - racingStats.condition);
            let newCondition = Nat.min(100, racingStats.condition + REPAIR_AMOUNT);

            // ===== RESONANCE SYSTEM FOR PERFECT TUNE-UP =====
            // Each bot has a unique resonance field that determines optimal repair points
            // Repairing within resonance while having overcharge achieves Perfect Tune-Up
            let resonance = ResonanceSystem.calculateResonance(tokenIndex, #Repair, racingStats.condition, now);

            // Perfect Tune-Up requires: having overcharge AND being in resonance zone
            let hasOvercharge = racingStats.overcharge > 0;
            let perfectTuneUp = hasOvercharge and (resonance.inPeakZone or resonance.inGoodZone);

            // Calculate tune-up quality (affects how much penalty is removed)
            // Peak: 100% penalty removal, Good: 70% penalty removal
            let tuneupQuality = ResonanceSystem.getPerfectTuneupQuality(resonance);

            // Determine what happens to overcharge
            // If Perfect Tune-Up: keep overcharge with reduced/removed penalties
            // If no Perfect Tune-Up: keep overcharge but penalties remain
            let finalOvercharge = racingStats.overcharge;

            let updatedStats = {
              racingStats with
              condition = newCondition;
              lastRepaired = ?now;
              perfectTuneUp = perfectTuneUp;
              overcharge = finalOvercharge;
            };

            ctx.garageManager.updateStats(tokenIndex, updatedStats);

            // Record dedication points for ICP investment (actual cost paid after synergy discount)
            ctx.dedicationManager.recordRepair(tokenIndex, repairCostWithSynergy, now);

            // Record activity DP for condition restoration (1 DP per 10 condition)
            ctx.dedicationManager.recordConditionRestored(tokenIndex, conditionRestored, now);

            let costIcp = Float.fromInt(repairCostWithSynergy) / 100_000_000.0;

            // Build message based on resonance outcome
            let message = if (perfectTuneUp and resonance.inPeakZone) {
              "🔧✨🔮 PEAK RESONANCE Perfect Tune-Up! Condition at " # Nat.toText(newCondition) # "% - ALL overcharge penalties removed! Your bot keeps the " # Nat.toText(racingStats.overcharge) # "% Speed/Accel boost without any Stability/PowerCore penalties!";
            } else if (perfectTuneUp) {
              "🔧✨ Good Resonance Tune-Up! Condition at " # Nat.toText(newCondition) # "% - 70% of overcharge penalties removed! Speed/Accel boost preserved with reduced Stability/PowerCore penalties.";
            } else if (hasOvercharge) {
              "🔧 Repairs complete. Condition at " # Nat.toText(newCondition) # "%. ⚠️ Outside resonance window - overcharge reset. (Optimal repair point: " # Nat.toText(resonance.optimalPoint) # "% condition)";
            } else {
              "🔧 Repairs complete. Condition at " # Nat.toText(newCondition) # "%";
            };

            let response = Json.obj([
              ("token_index", Json.int(tokenIndex)),
              ("action", Json.str("Repair Condition")),
              ("condition_restored", Json.int(conditionRestored)),
              ("new_condition", Json.int(newCondition)),
              ("perfect_tuneup", Json.bool(perfectTuneUp)),
              ("tuneup_quality", Json.float(tuneupQuality)),
              ("overcharge_before", Json.int(racingStats.overcharge)),
              ("overcharge_after", Json.int(finalOvercharge)),
              ("resonance_status", Json.str(resonance.resonanceStatus)),
              ("cost_icp", Json.str(Float.toText(costIcp))),
              ("message", Json.str(message)),
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
