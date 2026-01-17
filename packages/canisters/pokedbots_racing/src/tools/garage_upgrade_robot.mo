import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Error "mo:base/Error";
import Debug "mo:base/Debug";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";
import IcpLedger "../IcpLedger";
import WastelandFlavor "WastelandFlavor";

module {
  let PART_PRICE_E8S = 1_000_000 : Nat; // 0.01 ICP per part (100 parts = 1 ICP)
  let TRANSFER_FEE = 10000 : Nat;

  public func config() : McpTypes.Tool = {
    name = "garage_upgrade_robot";
    title = ?"Upgrade Robot";
    description = ?"Instantly upgrade your PokedBot with RNG mechanics. Types: Velocity (+Speed), PowerCore (+Power Core), Thruster (+Acceleration), Gyro (+Stability).\n\n**V2 MECHANICS:**\n• Dynamic ICP costs: 0.5 + (stat/40)² × tier premium (0.7-3.5×)\n• Success rates PER STAT: 85% (first upgrade) smoothly decreasing to 1% (at 15 upgrades), then stays at 1%\n• Each stat tracked independently: Speed, Power Core, Acceleration, and Stability each get their own success rate curve\n• Pity system: +5% per consecutive fail (max +25%), persists across deploys\n• Double lottery: 15% → 2% chance for +2 points (disabled after +15 successful upgrades per stat)\n• 50% refund on failure (ICP or parts returned based on payment method)\n• Pay with ICP or parts (100 parts = 1 ICP)\n\nUse garage_get_robot_details to see exact costs/rates. For full V2 mechanics, use help_get_compendium tool.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot"))])), ("upgrade_type", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("Velocity"), Json.str("PowerCore"), Json.str("Thruster"), Json.str("Gyro"), Json.str("Luck")])), ("description", Json.str("The type of upgrade. Luck uses Universal Parts only."))])), ("payment_method", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("parts"), Json.str("icp")])), ("description", Json.str("Payment method: parts (from inventory) or icp (ICRC-2 approval required)"))]))])),
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

      // Get racing stats and verify registration
      let racingStats = switch (ctx.garageManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("This PokedBot is not registered to your account. Use garage_initialize_pokedbot first to register it.", cb);
        };
        case (?stats) { stats };
      };

      // Verify caller is the registered owner
      if (not Principal.equal(racingStats.ownerPrincipal, user)) {
        return ToolContext.makeError("You are not the registered owner of this PokedBot. If you recently purchased it, use garage_initialize_pokedbot to register it to your account.", cb);
      };

      // Get time for dedication tracking
      let now = Time.now();

      // Parse upgrade type
      let upgradeType : PokedBotsGarage.UpgradeType = switch (upgradeTypeStr) {
        case "Velocity" { #Velocity };
        case "PowerCore" { #PowerCore };
        case "Thruster" { #Thruster };
        case "Gyro" { #Gyro };
        case "Luck" { #Luck };
        // Fallback for lowercase
        case "velocity" { #Velocity };
        case "power_core" { #PowerCore };
        case "thruster" { #Thruster };
        case "gyro" { #Gyro };
        case "luck" { #Luck };
        case _ { #Velocity }; // default
      };

      // Get current stats for cost calculation (V2)
      let currentStats = ctx.garageManager.getCurrentStats(racingStats);
      let overallRating = ctx.garageManager.calculateOverallRating(racingStats);

      // Get base stat and current stat value for this upgrade type
      let (baseStat, currentStatValue) = switch (upgradeType) {
        case (#Velocity) {
          (currentStats.speed - racingStats.speedBonus, currentStats.speed);
        };
        case (#PowerCore) {
          (currentStats.powerCore - racingStats.powerCoreBonus, currentStats.powerCore);
        };
        case (#Thruster) {
          (currentStats.acceleration - racingStats.accelerationBonus, currentStats.acceleration);
        };
        case (#Gyro) {
          (currentStats.stability - racingStats.stabilityBonus, currentStats.stability);
        };
        case (#Luck) {
          (racingStats.luckBase, racingStats.luckBase + racingStats.luckBonus);
        };
      };

      // Calculate cost using V2 formula with Game faction synergy
      let synergies = ctx.garageManager.calculateFactionSynergies(user);

      // Apply Bot Dedication tier upgrade discount (0-15% discount)
      // upgradeDiscountMult is already a multiplier (0.85 = 15% discount, 1.0 = no discount)
      let tierBenefits = ctx.dedicationManager.getBenefitsForBot(tokenIndex);
      let finalSynergyMultiplier = synergies.costMultipliers.upgradeCost * tierBenefits.upgradeDiscountMult;

      let costE8s = ctx.garageManager.calculateUpgradeCostV2(baseStat, currentStatValue, overallRating, finalSynergyMultiplier);
      let totalCost = costE8s + TRANSFER_FEE;

      // Determine part type (for parts payment option)
      let partType : PokedBotsGarage.PartType = switch (upgradeType) {
        case (#Velocity) { #SpeedChip };
        case (#PowerCore) { #PowerCoreFragment };
        case (#Thruster) { #ThrusterKit };
        case (#Gyro) { #GyroModule };
        case (#Luck) { #UniversalPart };
      };

      // Handle payment
      var partsUsed : Nat = 0;
      if (paymentMethod == "parts") {
        // Legacy parts system: 100 parts = 1 ICP
        let partsNeeded = (costE8s / PART_PRICE_E8S) + 1; // Round up
        if (not ctx.garageManager.removeParts(user, partType, partsNeeded)) {
          return ToolContext.makeError("Insufficient parts. Needed: " # Nat.toText(partsNeeded) # " " # debug_show (partType) # " (Universal Parts can substitute). Race on appropriate terrain or go scavenging to earn them!", cb);
        };
        partsUsed := partsNeeded;
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
              return ToolContext.makeError("Payment failed - check ICRC-2 allowance. Cost: " # Nat.toText(totalCost) # " e8s (" # Float.format(#fix 2, Float.fromInt(totalCost) / 100_000_000.0) # " ICP)", cb);
            };
            case (#Ok(_)) {
              // Record dedication points for ICP investment (only for ICP payments, not parts)
              ctx.dedicationManager.recordUpgrade(tokenIndex, costE8s, now);
            };
          };
        } catch (e) {
          return ToolContext.makeError("Payment failed: " # Error.message(e), cb);
        };
      };

      // Execute RNG immediately (instant upgrades)
      // Get flavor text for this upgrade and faction
      let upgradeFlavor = WastelandFlavor.getUpgradeFlavor(upgradeType, racingStats.faction);

      // Calculate attempt number and success rate with pity
      let attemptNumber = currentStatValue - baseStat;
      let pityCounter = ctx.garageManager.getPityCounter(tokenIndex);
      let successRate = ctx.garageManager.calculateSuccessRate(attemptNumber, pityCounter);

      // Generate RNG seed with proper hashing to avoid modulo bias
      let timeNanos = Int.abs(now);
      let entropy = ctx.garageManager.getNextEntropy();
      let seedInput = tokenIndex + timeNanos + (entropy * 7919); // Mix entropy strongly
      let hashedSeed = ctx.garageManager.hashForRNG(seedInput);
      let seed = Nat32.fromNat(hashedSeed % 4_294_967_296);

      // Roll for success
      let roll = Nat32.toNat(seed % 100);
      let success = Float.fromInt(roll) < successRate;

      Debug.print("Instant upgrade roll: " # debug_show (roll) # " vs success rate: " # debug_show (successRate) # " = " # debug_show (success));

      // Calculate double point chance for display
      let doubleChance = Float.max(2.0, 15.0 - (Float.fromInt(attemptNumber) * 0.87));
      let costIcp = Float.fromInt(costE8s) / 100_000_000.0;
      let pityText = if (pityCounter > 0) {
        " (+" # Nat.toText(pityCounter * 5) # "% pity bonus!)";
      } else { "" };

      if (success) {
        // Success! Check for double points
        let doubleRoll = Nat32.toNat((seed / 100) % 100);
        let isDouble = Float.fromInt(doubleRoll) < Float.max(2.0, doubleChance);
        let pointsAwarded = if (isDouble) { 2 } else { 1 };

        Debug.print("SUCCESS! Points awarded: " # debug_show (pointsAwarded) # (if (isDouble) { " 🎰 DOUBLE!" } else { "" }));

        // Apply the stat boost
        let updatedStats = switch (upgradeType) {
          case (#Velocity) {
            {
              racingStats with
              speedBonus = racingStats.speedBonus + pointsAwarded;
              speedUpgrades = racingStats.speedUpgrades + 1;
              experience = racingStats.experience + 5;
              factionReputation = racingStats.factionReputation + 2;
              upgradeEndsAt = null;
              listedForSale = false;
            };
          };
          case (#PowerCore) {
            {
              racingStats with
              powerCoreBonus = racingStats.powerCoreBonus + pointsAwarded;
              powerCoreUpgrades = racingStats.powerCoreUpgrades + 1;
              experience = racingStats.experience + 5;
              factionReputation = racingStats.factionReputation + 2;
              upgradeEndsAt = null;
              listedForSale = false;
            };
          };
          case (#Thruster) {
            {
              racingStats with
              accelerationBonus = racingStats.accelerationBonus + pointsAwarded;
              accelerationUpgrades = racingStats.accelerationUpgrades + 1;
              experience = racingStats.experience + 5;
              factionReputation = racingStats.factionReputation + 2;
              upgradeEndsAt = null;
              listedForSale = false;
            };
          };
          case (#Gyro) {
            {
              racingStats with
              stabilityBonus = racingStats.stabilityBonus + pointsAwarded;
              stabilityUpgrades = racingStats.stabilityUpgrades + 1;
              experience = racingStats.experience + 10;
              factionReputation = racingStats.factionReputation + 3;
              upgradeEndsAt = null;
              listedForSale = false;
            };
          };
          case (#Luck) {
            {
              racingStats with
              luckBonus = racingStats.luckBonus + pointsAwarded;
              luckUpgrades = racingStats.luckUpgrades + 1;
              experience = racingStats.experience + 5;
              factionReputation = racingStats.factionReputation + 2;
              upgradeEndsAt = null;
              listedForSale = false;
            };
          };
        };

        ctx.garageManager.updateStats(tokenIndex, updatedStats);
        // Reset pity counter on success
        ctx.garageManager.setPityCounter(tokenIndex, 0);

        let successMessage = if (isDouble) {
          "🎰 DOUBLE WIN! Your " # upgradeFlavor # " upgrade succeeded with +2 stat points! (Roll: " # Nat.toText(roll) # " < " # Float.format(#fix 1, successRate) # "%" # pityText # ")";
        } else {
          "✅ SUCCESS! Your " # upgradeFlavor # " upgrade succeeded with +1 stat point! (Roll: " # Nat.toText(roll) # " < " # Float.format(#fix 1, successRate) # "%" # pityText # ")";
        };

        let response = Json.obj([
          ("success", Json.bool(true)),
          ("token_index", Json.int(tokenIndex)),
          ("upgrade_type", Json.str(upgradeFlavor)),
          ("points_awarded", Json.int(pointsAwarded)),
          ("is_double", Json.bool(isDouble)),
          ("roll", Json.int(roll)),
          ("success_rate", Json.str(Float.format(#fix 1, successRate) # "%" # pityText)),
          ("cost_icp", Json.str(Float.format(#fix 2, costIcp))),
          ("message", Json.str(successMessage)),
        ]);

        ToolContext.makeSuccess(response, cb);
      } else {
        // Failure! Refund 50% and increment pity counter
        let newPityCounter = pityCounter + 1;

        // Update stats without stat increase
        let updatedStats = {
          racingStats with
          upgradeEndsAt = null;
          listedForSale = false;
        };
        ctx.garageManager.updateStats(tokenIndex, updatedStats);

        // Store pity counter for next attempt (max +25% = 5 fails)
        ctx.garageManager.setPityCounter(tokenIndex, Nat.min(newPityCounter, 5));

        // Handle refund based on payment method
        var refundMessage = "";
        if (paymentMethod == "icp") {
          // Refund 50% of ICP cost via scheduled action
          let refundAmount = costE8s / 2;
          Debug.print("FAILED! Scheduling refund of " # debug_show (refundAmount) # " e8s (50% ICP), pity: " # debug_show (newPityCounter));

          if (refundAmount > 0) {
            // Schedule refund via timer action (reuse prize distribution)
            let refundActionId = ctx.timerTool.setActionASync<system>(
              Int.abs(now + 1_000_000_000), // 1 second delay
              {
                actionType = "prize_distribution";
                params = to_candid ({
                  raceId = 0; // Not a race prize, use 0
                  owner = user;
                  amount = refundAmount;
                });
              },
              60_000_000_000, // 60 second timeout
            );
            Debug.print("Scheduled ICP refund " # debug_show (refundActionId));
            refundMessage := Float.format(#fix 4, Float.fromInt(refundAmount) / 100_000_000.0) # " ICP";
          };
        } else {
          // Refund 50% of parts cost immediately
          let partsToRefund = partsUsed / 2;
          Debug.print("FAILED! Refunding " # debug_show (partsToRefund) # " parts (50%), pity: " # debug_show (newPityCounter));

          if (partsToRefund > 0) {
            ctx.garageManager.refundParts(user, partType, partsToRefund);
            refundMessage := Nat.toText(partsToRefund) # " " # debug_show (partType);
          };
        };

        let pityBonus = Nat.min(newPityCounter, 5) * 5;
        let failMessage = "❌ FAILED! Your " # upgradeFlavor # " upgrade failed. (Roll: " # Nat.toText(roll) # " >= " # Float.format(#fix 1, successRate) # "%" # pityText # "). Refunded 50%: " # refundMessage # ". Pity bonus now +" # Nat.toText(pityBonus) # "% for next attempt!";

        let response = Json.obj([
          ("success", Json.bool(false)),
          ("token_index", Json.int(tokenIndex)),
          ("upgrade_type", Json.str(upgradeFlavor)),
          ("roll", Json.int(roll)),
          ("success_rate", Json.str(Float.format(#fix 1, successRate) # "%" # pityText)),
          ("refund", Json.str(refundMessage)),
          ("pity_bonus", Json.str("+" # Nat.toText(pityBonus) # "%")),
          ("cost_icp", Json.str(Float.format(#fix 2, costIcp))),
          ("message", Json.str(failMessage)),
        ]);

        ToolContext.makeSuccess(response, cb);
      };
    };
  };
};
