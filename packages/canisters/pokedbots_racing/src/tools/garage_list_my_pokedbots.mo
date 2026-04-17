import Result "mo:base/Result";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Option "mo:base/Option";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";

import ToolContext "./ToolContext";
import PokedBotsGarage "../PokedBotsGarage";
import ExtIntegration "../ExtIntegration";
import RacingSimulator "../RacingSimulator";
import RaceCalendar "../RaceCalendar";
import RaceClassUtils "../RaceClassUtils";
import Principal "mo:base/Principal";

module {
  let RECHARGE_COOLDOWN : Int = 21600000000000; // 6 hours in nanoseconds
  let REPAIR_COOLDOWN : Int = 43200000000000; // 12 hours in nanoseconds
  public func config() : McpTypes.Tool = {
    name = "garage_list_my_pokedbots";
    title = ?"List My PokedBots";
    description = ?"List all your PokedBots with stats, racing status, and activity status. Filter by user tags (starred, racers, scavengers), activity, or race readiness thresholds.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("only_starred", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Only show bots you've marked as favorites"))])), ("only_racers", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Only show bots you've tagged as racers"))])), ("only_scavengers", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Only show bots you've tagged as scavengers"))])), ("only_scavenging", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Only show bots currently on scavenging missions"))])), ("only_in_races", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Only show bots currently entered in races"))])), ("only_ready", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Only show bots ready to race (battery ≥ 30%, condition ≥ 50%, not in active missions)"))])), ("min_battery", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Minimum battery percentage (0-100). Only show bots with battery >= this value."))])), ("min_condition", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Minimum condition percentage (0-100). Only show bots with condition >= this value."))])), ("only_idle", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Only show bots that are idle (not scavenging, not in race, not upgrading)"))])), ("only_not_registered", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: Only show bots not registered for any upcoming event"))]))])),
    ]);
    outputSchema = null;
  };

  public func handler(ctx : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {
      let userPrincipal = switch (_auth) {
        case (?auth) { auth.principal };
        case (null) {
          return ToolContext.makeError("Authentication required", cb);
        };
      };

      // Track this method call
      ctx.trackMethodCall("garage_list_my_pokedbots", userPrincipal);

      // Parse filter parameters
      let onlyStarred = Result.toOption(Json.getAsBool(_args, "only_starred"));
      let onlyRacers = Result.toOption(Json.getAsBool(_args, "only_racers"));
      let onlyScavengers = Result.toOption(Json.getAsBool(_args, "only_scavengers"));
      let onlyScavenging = Result.toOption(Json.getAsBool(_args, "only_scavenging"));
      let onlyInRaces = Result.toOption(Json.getAsBool(_args, "only_in_races"));
      let onlyReady = Result.toOption(Json.getAsBool(_args, "only_ready"));
      let minBattery = Result.toOption(Json.getAsNat(_args, "min_battery"));
      let minCondition = Result.toOption(Json.getAsNat(_args, "min_condition"));
      let onlyIdle = Result.toOption(Json.getAsBool(_args, "only_idle"));
      let onlyNotRegistered = Result.toOption(Json.getAsBool(_args, "only_not_registered"));

      // Get user's preference lists
      let starredBots = ctx.getUserStarredBots(userPrincipal);
      let racerBots = ctx.getUserRacerBots(userPrincipal);
      let scavengerBots = ctx.getUserScavengerBots(userPrincipal);

      // Use local garage data instead of inter-canister call to EXT canister
      let ownerBots = ctx.garageManager.getBotsForOwner(userPrincipal);

      // Get user inventory (always show this)
      let inventory = ctx.garageManager.getUserInventory(userPrincipal);

      let message = if (ownerBots.size() == 0) {
        let walletAccountId = ExtIntegration.principalToAccountIdentifier(userPrincipal, null);
        var result = "🤖 Empty Garage\n\n";
        result #= "📦 Parts Inventory:\n";
        result #= "   🏎️  Speed Chips: " # Nat.toText(inventory.speedChips) # "\n";
        result #= "   ⚡ Power Cells: " # Nat.toText(inventory.powerCoreFragments) # "\n";
        result #= "   🚀 Thruster Kits: " # Nat.toText(inventory.thrusterKits) # "\n";
        result #= "   🎯 Gyro Units: " # Nat.toText(inventory.gyroModules) # "\n";
        result #= "   ⭐ Universal Parts: " # Nat.toText(inventory.universalParts) # "\n\n";
        result #= "✨ Collection Bonuses:\n";
        result #= "   None (collect faction bots for bonuses)\n\n";
        result #= "No initialized PokedBots found. Use garage_initialize_pokedbot to register a bot for racing.\n\nWallet ID: " # walletAccountId;
        result;
      } else {
        var msg = "🤖 Your Garage\n\n";

        // Add inventory summary
        msg #= "📦 Parts Inventory (earned from racing):\n";
        msg #= "   🏎️  Speed Chips: " # Nat.toText(inventory.speedChips) # " (from MetalRoads races)\n";
        msg #= "   ⚡ Power Cells: " # Nat.toText(inventory.powerCoreFragments) # " (from ScrapHeaps races)\n";
        msg #= "   🚀 Thruster Kits: " # Nat.toText(inventory.thrusterKits) # " (from WastelandSand races)\n";
        msg #= "   🎯 Gyro Units: " # Nat.toText(inventory.gyroModules) # " (from WastelandSand races)\n";
        msg #= "   ⭐ Universal Parts: " # Nat.toText(inventory.universalParts) # "\n\n";

        // Calculate and display collection bonuses (faction synergies)
        let synergies = ctx.garageManager.calculateFactionSynergies(userPrincipal);
        msg #= "✨ Collection Bonuses (apply to ALL bots):\n";

        // Stat bonuses
        var hasStatBonuses = false;
        var totalSpeed : Nat = 0;
        var totalPowerCore : Nat = 0;
        var totalAccel : Nat = 0;
        var totalStability : Nat = 0;
        for ((faction, bonusStats) in synergies.statBonuses.vals()) {
          totalSpeed += bonusStats.speed;
          totalPowerCore += bonusStats.powerCore;
          totalAccel += bonusStats.acceleration;
          totalStability += bonusStats.stability;
        };
        if (totalSpeed > 0) {
          msg #= "   🏎️  +" # Nat.toText(totalSpeed) # " Speed\n";
          hasStatBonuses := true;
        };
        if (totalPowerCore > 0) {
          msg #= "   ⚡ +" # Nat.toText(totalPowerCore) # " Power Core\n";
          hasStatBonuses := true;
        };
        if (totalAccel > 0) {
          msg #= "   🚀 +" # Nat.toText(totalAccel) # " Acceleration\n";
          hasStatBonuses := true;
        };
        if (totalStability > 0) {
          msg #= "   🎯 +" # Nat.toText(totalStability) # " Stability\n";
          hasStatBonuses := true;
        };

        // Cost/yield bonuses
        let upgradeDiscount = Float.toInt((1.0 - synergies.costMultipliers.upgradeCost) * 100.0);
        let repairDiscount = Float.toInt((1.0 - synergies.costMultipliers.repairCost) * 100.0);
        let cooldownReduction = Float.toInt((1.0 - synergies.costMultipliers.rechargeCooldown) * 100.0);
        let partsBoost = Float.toInt((synergies.yieldMultipliers.scavengingParts - 1.0) * 100.0);
        let prizeBoost = Float.toInt((synergies.yieldMultipliers.racePrizes - 1.0) * 100.0);
        let drainReduction = Float.toInt((1.0 - synergies.drainMultipliers.scavengingDrain) * 100.0);

        if (upgradeDiscount > 0) {
          msg #= "   💰 -" # Int.toText(upgradeDiscount) # "% Upgrade Costs\n";
          hasStatBonuses := true;
        };
        if (repairDiscount > 0) {
          msg #= "   🔧 -" # Int.toText(repairDiscount) # "% Repair Costs\n";
          hasStatBonuses := true;
        };
        if (cooldownReduction > 0) {
          msg #= "   ⏱️  -" # Int.toText(cooldownReduction) # "% Recharge Cooldown\n";
          hasStatBonuses := true;
        };
        if (partsBoost > 0) {
          msg #= "   📦 +" # Int.toText(partsBoost) # "% Scavenging Parts\n";
          hasStatBonuses := true;
        };
        if (prizeBoost > 0) {
          msg #= "   🏆 +" # Int.toText(prizeBoost) # "% Race Prizes\n";
          hasStatBonuses := true;
        };
        if (drainReduction > 0) {
          msg #= "   🛡️  -" # Int.toText(drainReduction) # "% Scavenging Drain\n";
          hasStatBonuses := true;
        };

        if (not hasStatBonuses) {
          msg #= "   None (collect more faction bots for bonuses)\n";
        };
        msg #= "\n";

        // Use current time for read-only reward projections (NO state mutation)
        let now = Time.now();

        // Apply filters to bot list
        var filteredBots = ownerBots;

        // Filter by user tags
        if (Option.get(onlyStarred, false)) {
          filteredBots := Array.filter(
            filteredBots,
            func(bot : { tokenIndex : Nat }) : Bool {
              Option.isSome(Array.find<Nat>(starredBots, func(n) { n == bot.tokenIndex }));
            },
          );
        };

        if (Option.get(onlyRacers, false)) {
          filteredBots := Array.filter(
            filteredBots,
            func(bot : { tokenIndex : Nat }) : Bool {
              Option.isSome(Array.find<Nat>(racerBots, func(n) { n == bot.tokenIndex }));
            },
          );
        };

        if (Option.get(onlyScavengers, false)) {
          filteredBots := Array.filter(
            filteredBots,
            func(bot : { tokenIndex : Nat }) : Bool {
              Option.isSome(Array.find<Nat>(scavengerBots, func(n) { n == bot.tokenIndex }));
            },
          );
        };

        // Filter by activity status
        if (Option.get(onlyScavenging, false)) {
          filteredBots := Array.filter(
            filteredBots,
            func(bot : { tokenIndex : Nat }) : Bool {
              switch (ctx.garageManager.getStats(bot.tokenIndex)) {
                case (?stats) { Option.isSome(stats.activeMission) };
                case (null) { false };
              };
            },
          );
        };

        if (Option.get(onlyInRaces, false)) {
          filteredBots := Array.filter(
            filteredBots,
            func(bot : { tokenIndex : Nat }) : Bool {
              ctx.isInActiveRace(bot.tokenIndex);
            },
          );
        };

        if (Option.get(onlyReady, false)) {
          filteredBots := Array.filter(
            filteredBots,
            func(bot : { tokenIndex : Nat }) : Bool {
              switch (ctx.garageManager.getStats(bot.tokenIndex)) {
                case (?stats) {
                  let hasBattery = stats.battery >= 30;
                  let hasCondition = stats.condition >= 50;
                  let notScavenging = Option.isNull(stats.activeMission);
                  hasBattery and hasCondition and notScavenging;
                };
                case (null) { false };
              };
            },
          );
        };

        // Filter by minimum battery
        switch (minBattery) {
          case (?threshold) {
            filteredBots := Array.filter(
              filteredBots,
              func(bot : { tokenIndex : Nat }) : Bool {
                switch (ctx.garageManager.getStats(bot.tokenIndex)) {
                  case (?stats) { stats.battery >= threshold };
                  case (null) { false };
                };
              },
            );
          };
          case (null) {};
        };

        // Filter by minimum condition
        switch (minCondition) {
          case (?threshold) {
            filteredBots := Array.filter(
              filteredBots,
              func(bot : { tokenIndex : Nat }) : Bool {
                switch (ctx.garageManager.getStats(bot.tokenIndex)) {
                  case (?stats) { stats.condition >= threshold };
                  case (null) { false };
                };
              },
            );
          };
          case (null) {};
        };

        // Filter by idle status (not scavenging, not in race, not upgrading)
        if (Option.get(onlyIdle, false)) {
          filteredBots := Array.filter(
            filteredBots,
            func(bot : { tokenIndex : Nat }) : Bool {
              switch (ctx.garageManager.getStats(bot.tokenIndex)) {
                case (?stats) {
                  let notScavenging = Option.isNull(stats.activeMission);
                  let notInRace = not ctx.isInActiveRace(bot.tokenIndex);
                  let notUpgrading = Option.isNull(ctx.garageManager.getActiveUpgrade(bot.tokenIndex));
                  notScavenging and notInRace and notUpgrading;
                };
                case (null) { false };
              };
            },
          );
        };

        // Filter by not registered for any upcoming event
        if (Option.get(onlyNotRegistered, false)) {
          let allEvents = ctx.eventCalendar.getAllEvents();
          let now = Time.now();
          filteredBots := Array.filter(
            filteredBots,
            func(bot : { tokenIndex : Nat }) : Bool {
              // Check if bot is registered for any upcoming/open event
              for (event in allEvents.vals()) {
                switch (event.status) {
                  case (#Completed) {};
                  case (#Cancelled) {};
                  case _ {
                    if (event.scheduledTime > now) {
                      for (reg in event.registrations.vals()) {
                        if (reg.tokenIndex == bot.tokenIndex) {
                          return false; // Bot is registered for an upcoming event
                        };
                      };
                    };
                  };
                };
              };
              true; // Not registered for any upcoming event
            },
          );
        };

        msg #= "Found " # Nat.toText(filteredBots.size()) # " PokedBot(s)";
        if (filteredBots.size() != ownerBots.size()) {
          msg #= " (filtered from " # Nat.toText(ownerBots.size()) # " total)";
        };
        msg #= "\n\n";

        // Now display bots with read-only projected stats (no state mutation)
        for (bot in filteredBots.vals()) {
          let tokenIndex32 = Nat32.fromNat(bot.tokenIndex);
          let tokenId = ExtIntegration.encodeTokenIdentifier(tokenIndex32, ctx.extCanisterId);
          let thumbnailUrl = "https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=" # tokenId # "&type=thumbnail";

          // Get stats and project scavenging rewards read-only (no mutation)
          let robotStats : ?PokedBotsGarage.PokedBotRacingStats = switch (ctx.getStats(bot.tokenIndex)) {
            case (?stats) {
              switch (ctx.garageManager.calculateScavengingRewardsReadOnly(bot.tokenIndex, stats, now)) {
                case (#ok(projected)) { ?projected };
                case (#err(_)) { ?stats };
              };
            };
            case (null) { null };
          };

          // Calculate synergies once for this user (for cooldown display)
          let synergies = ctx.garageManager.calculateFactionSynergies(userPrincipal);
          let adjustedRechargeCooldown = Float.toInt(Float.fromInt(RECHARGE_COOLDOWN) * synergies.costMultipliers.rechargeCooldown);

          msg #= "🏎️ PokedBot #" # Nat.toText(bot.tokenIndex);

          // Show custom name if set
          switch (robotStats) {
            case (?stats) {
              switch (stats.name) {
                case (?botName) { msg #= " \"" # botName # "\"" };
                case (null) {};
              };
            };
            case (null) {};
          };
          msg #= "\n";

          // Show stats and rating
          switch (robotStats) {
            case (?stats) {
              // Get current stats (base + bonuses)
              let currentStats = ctx.getCurrentStats(stats);
              let baseStats = ctx.garageManager.getBaseStats(bot.tokenIndex);

              // Calculate stats at 100% condition/battery (no penalties)
              let statsAt100 = {
                speed = baseStats.speed + stats.speedBonus;
                powerCore = baseStats.powerCore + stats.powerCoreBonus;
                acceleration = baseStats.acceleration + stats.accelerationBonus;
                stability = baseStats.stability + stats.stabilityBonus;
              };

              let totalStats = currentStats.speed + currentStats.powerCore + currentStats.acceleration + currentStats.stability;
              let rating = totalStats / 4;
              let totalStatsAt100 = (statsAt100.speed + statsAt100.powerCore + statsAt100.acceleration + statsAt100.stability);
              let totalRatingAt100 = totalStatsAt100 / 4;

              msg #= "   ⚡ Rating (**Always Show User Current and At Full Power**): " # Nat32.toText(Nat32.fromNat(rating)) # "/" # Nat32.toText(Nat32.fromNat(totalRatingAt100)) # "\n";

              // Show faction
              let factionEmoji = switch (stats.faction) {
                // Ultra-Rare
                case (#UltimateMaster) { " | 👑 Ultimate-Master" };
                case (#Wild) { " | 🦾 Wild" };
                case (#Golden) { " | ✨ Golden" };
                case (#Ultimate) { " | ⚡ Ultimate" };
                // Super-Rare
                case (#Blackhole) { " | 🌌 Blackhole" };
                case (#Dead) { " | 💀 Dead" };
                case (#Master) { " | 🎯 Master" };
                // Rare
                case (#Bee) { " | 🐝 Bee" };
                case (#Food) { " | 🍔 Food" };
                case (#Box) { " | 📦 Box" };
                case (#Murder) { " | 🔪 Murder" };
                // Common
                case (#Game) { " | 🎮 Game" };
                case (#Animal) { " | 🦎 Animal" };
                case (#Industrial) { " | ⚙️ Industrial" };
              };
              msg #= factionEmoji # "\n";

              // Show stats with current/max format
              msg #= "   📊 Stats (**Always Show User Current and At Full Power**): SPD " # Nat32.toText(Nat32.fromNat(currentStats.speed)) # "/" # Nat32.toText(Nat32.fromNat(statsAt100.speed));
              msg #= " | PWR " # Nat32.toText(Nat32.fromNat(currentStats.powerCore)) # "/" # Nat32.toText(Nat32.fromNat(statsAt100.powerCore));
              msg #= " | ACC " # Nat32.toText(Nat32.fromNat(currentStats.acceleration)) # "/" # Nat32.toText(Nat32.fromNat(statsAt100.acceleration));
              msg #= " | STB " # Nat32.toText(Nat32.fromNat(currentStats.stability)) # "/" # Nat32.toText(Nat32.fromNat(statsAt100.stability)) # "\n";

              // Show totals
              let totalCurrent = currentStats.speed + currentStats.powerCore + currentStats.acceleration + currentStats.stability;
              let totalAt100 = statsAt100.speed + statsAt100.powerCore + statsAt100.acceleration + statsAt100.stability;
              msg #= "   📈 Total Current: " # Nat32.toText(Nat32.fromNat(totalCurrent));
              msg #= " | Total at 100: " # Nat32.toText(Nat32.fromNat(totalAt100));
              msg #= " (SPD " # Nat32.toText(Nat32.fromNat(statsAt100.speed));
              msg #= " | PWR " # Nat32.toText(Nat32.fromNat(statsAt100.powerCore));
              msg #= " | ACC " # Nat32.toText(Nat32.fromNat(statsAt100.acceleration));
              msg #= " | STB " # Nat32.toText(Nat32.fromNat(statsAt100.stability)) # ")\n";

              // Show condition
              msg #= "   🔋 Battery: " # Nat32.toText(Nat32.fromNat(stats.battery)) # "%";
              msg #= " | 🔧 Condition: " # Nat32.toText(Nat32.fromNat(stats.condition)) # "%";
              // Annotate with meets_thresholds if custom min_battery/min_condition were requested
              switch (minBattery, minCondition) {
                case (?mb, ?mc) {
                  msg #= " ✅ (meets min_battery=" # Nat.toText(mb) # ", min_condition=" # Nat.toText(mc) # ")";
                };
                case (?mb, null) {
                  msg #= " ✅ (meets min_battery=" # Nat.toText(mb) # ")";
                };
                case (null, ?mc) {
                  msg #= " ✅ (meets min_condition=" # Nat.toText(mc) # ")";
                };
                case (null, null) {};
              };
              msg #= "\n";

              // Maintenance recommendation
              let now = Time.now();
              let repairReady = switch (stats.lastRepaired) {
                case (?lastTime) { now - lastTime >= REPAIR_COOLDOWN };
                case (null) { true };
              };
              let recommendedAction = if (stats.condition < 50 and repairReady) {
                "RepairBay";
              } else if (stats.battery < 30) {
                "ChargingStation";
              } else if (stats.condition < 80 and repairReady) {
                "RepairBay";
              } else if (stats.battery < 80) {
                "ChargingStation";
              } else if (stats.overcharge == 0) {
                "Jolt";
              } else {
                "None";
              };
              if (recommendedAction != "None") {
                msg #= "   💡 Recommended: " # recommendedAction # "\n";
              };

              // Canonical activity state — same source of truth as garage_get_bulk_details
              // and the preconditions of garage_complete_scavenging.
              let canonical = ctx.garageManager.getCanonicalActivity(bot.tokenIndex);

              let activityType = switch (canonical.zoneVariant) {
                case (?#ChargingStation) { "charging ⚡" };
                case (?#RepairBay) { "repairing 🔧" };
                case (?#ScrapHeaps) { "scavenging (ScrapHeaps) 🔍" };
                case (?#AbandonedSettlements) { "scavenging (AbandonedSettlements) 🔍" };
                case (?#DeadMachineFields) { "scavenging (DeadMachineFields) 🔍" };
                case (null) {
                  if (ctx.isInActiveRace(bot.tokenIndex)) { "racing 🏁" }
                  else {
                    switch (ctx.garageManager.getActiveUpgrade(bot.tokenIndex)) {
                      case (?_) { "upgrading ⬆️" };
                      case (null) { "idle 💤" };
                    };
                  };
                };
              };
              msg #= "   📋 Activity: " # activityType # "\n";

              // Show activity/mission status (only if canonical state says an activity is active)
              if (canonical.canCollectNow) {
                let zoneName = Option.get(canonical.zone, "unknown");
                let startedAt = Option.get(canonical.startedAt, now);
                let hoursElapsed = (now - startedAt) / (3600 * 1_000_000_000);

                // Zone-appropriate activity label and pending info, from canonical state
                let (activityLabel, pendingInfo) = switch (canonical.zoneVariant) {
                  case (?#ChargingStation) {
                    ("CHARGING", "Battery restored: +" # Nat.toText(canonical.pendingBatteryRestored) # "%");
                  };
                  case (?#RepairBay) {
                    ("REPAIRING", "Condition restored: +" # Nat.toText(canonical.pendingConditionRestored) # "%");
                  };
                  case (_) {
                    ("SCAVENGING", "Pending: " # Nat.toText(canonical.pendingParts) # " parts");
                  };
                };

                msg #= "   🔍 " # activityLabel # ": Active (" # Nat.toText(Int.abs(hoursElapsed)) # "h elapsed) in " # zoneName # " | " # pendingInfo # " ✅ Ready to collect!\n";
              };

              // Show next race/event if bot is entered
              let nftId = Nat.toText(bot.tokenIndex);
              let allRaces = ctx.raceManager.getAllRaces();
              var nextRace : ?RacingSimulator.Race = null;

              label findRace for (race in allRaces.vals()) {
                // Check if bot is entered in this race
                let isEntered = Array.find<RacingSimulator.RaceEntry>(
                  race.entries,
                  func(entry) { entry.nftId == nftId },
                );

                switch (isEntered) {
                  case (?_) {
                    // Found a race with this bot
                    switch (race.status) {
                      case (#Upcoming) {
                        // Only show upcoming races, find the nearest one
                        switch (nextRace) {
                          case (null) { nextRace := ?race };
                          case (?current) {
                            if (race.startTime < current.startTime) {
                              nextRace := ?race;
                            };
                          };
                        };
                      };
                      case (#InProgress) {
                        // In-progress race takes priority
                        nextRace := ?race;
                        break findRace;
                      };
                      case _ {};
                    };
                  };
                  case null {};
                };
              };

              switch (nextRace) {
                case (?race) {
                  let statusText = switch (race.status) {
                    case (#Upcoming) { "🕐 UPCOMING" };
                    case (#InProgress) { "🏁 IN PROGRESS" };
                    case _ { "" };
                  };
                  let timeUntil = race.startTime - now;
                  let hoursUntil = timeUntil / (3600 * 1_000_000_000);
                  let minsUntil = (timeUntil % (3600 * 1_000_000_000)) / (60 * 1_000_000_000);

                  if (race.status == #InProgress) {
                    msg #= "   🏁 RACE: " # statusText # " - Race #" # Nat.toText(race.raceId) # " (" # race.name # ")\n";
                  } else if (hoursUntil > 0) {
                    msg #= "   🏁 NEXT RACE: " # statusText # " in " # Nat.toText(Int.abs(hoursUntil)) # "h " # Nat.toText(Int.abs(minsUntil)) # "m - Race #" # Nat.toText(race.raceId) # " (" # race.name # ")\n";
                  } else if (minsUntil > 0) {
                    msg #= "   🏁 NEXT RACE: " # statusText # " in " # Nat.toText(Int.abs(minsUntil)) # "m - Race #" # Nat.toText(race.raceId) # " (" # race.name # ")\n";
                  } else {
                    msg #= "   🏁 NEXT RACE: " # statusText # " - Race #" # Nat.toText(race.raceId) # " (" # race.name # ")\n";
                  };
                };
                case (null) {
                  // No race found in raceManager — check event calendar for registrations
                  var nextEvent : ?RaceCalendar.ScheduledEvent = null;
                  let allEvents = ctx.eventCalendar.getAllEvents();
                  // Grace period: include events that started up to 1 hour ago (may still be active)
                  let gracePeriod : Int = 3600 * 1_000_000_000;

                  for (event in allEvents.vals()) {
                    // Skip completed/cancelled events
                    switch (event.status) {
                      case (#Completed) {};
                      case (#Cancelled) {};
                      case _ {
                        // Only consider future events, in-progress events, or very recently started ones
                        let isFutureOrActive = event.scheduledTime > now or
                          event.status == #InProgress or
                          (now - event.scheduledTime) < gracePeriod;

                        if (isFutureOrActive) {
                          // Check if this bot is registered
                          let isRegistered = Array.find<RaceCalendar.EventRegistration>(
                            event.registrations,
                            func(reg) { reg.tokenIndex == bot.tokenIndex and Principal.equal(reg.owner, userPrincipal) },
                          );
                          switch (isRegistered) {
                            case (?_) {
                              // Found — pick the nearest upcoming event
                              switch (nextEvent) {
                                case (null) { nextEvent := ?event };
                                case (?current) {
                                  if (event.scheduledTime < current.scheduledTime) {
                                    nextEvent := ?event;
                                  };
                                };
                              };
                            };
                            case (null) {};
                          };
                        };
                      };
                    };
                  };

                  switch (nextEvent) {
                    case (?event) {
                      let eventStatusText = switch (event.status) {
                        case (#Announced) { "📢 Announced" };
                        case (#RegistrationOpen) { "✅ Reg Open" };
                        case (#RegistrationClosed) { "🔒 Reg Closed" };
                        case (#InProgress) { "🏎️ In Progress" };
                        case _ { "" };
                      };
                      let timeUntil = event.scheduledTime - now;
                      let hoursUntil = timeUntil / (3600 * 1_000_000_000);
                      let minsUntil = (timeUntil % (3600 * 1_000_000_000)) / (60 * 1_000_000_000);

                      if (hoursUntil > 24) {
                        let daysUntil = hoursUntil / 24;
                        let remainingHours = hoursUntil % 24;
                        msg #= "   🏁 NEXT EVENT: " # eventStatusText # " in " # Nat.toText(Int.abs(daysUntil)) # "d " # Nat.toText(Int.abs(remainingHours)) # "h - Event #" # Nat.toText(event.eventId) # " (" # event.metadata.name # ")\n";
                      } else if (hoursUntil > 0) {
                        msg #= "   🏁 NEXT EVENT: " # eventStatusText # " in " # Nat.toText(Int.abs(hoursUntil)) # "h " # Nat.toText(Int.abs(minsUntil)) # "m - Event #" # Nat.toText(event.eventId) # " (" # event.metadata.name # ")\n";
                      } else if (minsUntil > 0) {
                        msg #= "   🏁 NEXT EVENT: " # eventStatusText # " in " # Nat.toText(Int.abs(minsUntil)) # "m - Event #" # Nat.toText(event.eventId) # " (" # event.metadata.name # ")\n";
                      } else {
                        msg #= "   🏁 NEXT EVENT: " # eventStatusText # " - Event #" # Nat.toText(event.eventId) # " (" # event.metadata.name # ")\n";
                      };
                    };
                    case (null) {
                      msg #= "   🏁 NEXT RACE: None registered\n";
                    };
                  };
                };
              };

              // Show ALL upcoming event registrations for this bot
              let allEventsForReg = ctx.eventCalendar.getAllEvents();
              var registeredEventIds : [Nat] = [];
              for (evt in allEventsForReg.vals()) {
                switch (evt.status) {
                  case (#Completed) {};
                  case (#Cancelled) {};
                  case _ {
                    if (evt.scheduledTime > now or evt.status == #InProgress) {
                      let isReg = Array.find<RaceCalendar.EventRegistration>(
                        evt.registrations,
                        func(reg) { reg.tokenIndex == bot.tokenIndex and Principal.equal(reg.owner, userPrincipal) },
                      );
                      switch (isReg) {
                        case (?_) {
                          registeredEventIds := Array.append(registeredEventIds, [evt.eventId]);
                        };
                        case (null) {};
                      };
                    };
                  };
                };
              };
              if (registeredEventIds.size() > 0) {
                msg #= "   📅 Registered for: ";
                var first = true;
                for (eid in registeredEventIds.vals()) {
                  if (not first) { msg #= ", " };
                  msg #= "Event #" # Nat.toText(eid);
                  first := false;
                };
                msg #= "\n";
              };

              // Show service cooldowns (using Food faction synergy adjusted cooldown)
              msg #= "   ";
              switch (stats.lastRecharged) {
                case (?lastTime) {
                  if (now - lastTime >= adjustedRechargeCooldown) {
                    msg #= "✅ Recharge: Ready";
                  } else {
                    msg #= "⏳ Recharge: On cooldown";
                  };
                };
                case (null) { msg #= "✅ Recharge: Ready" };
              };
              msg #= " | ";
              switch (stats.lastRepaired) {
                case (?lastTime) {
                  if (now - lastTime >= REPAIR_COOLDOWN) {
                    msg #= "✅ Repair: Ready";
                  } else {
                    msg #= "⏳ Repair: On cooldown";
                  };
                };
                case (null) { msg #= "✅ Repair: Ready" };
              };
              msg #= "\n";

              // Show racing record
              if (stats.racesEntered > 0) {
                msg #= "   🏁 Record: " # Nat32.toText(Nat32.fromNat(stats.racesEntered)) # " races";
                msg #= " | " # Nat32.toText(Nat32.fromNat(stats.wins)) # " wins";
                if (stats.racesEntered > 0) {
                  let winRate = (stats.wins * 100) / stats.racesEntered;
                  msg #= " (" # Nat32.toText(Nat32.fromNat(winRate)) # "% win rate)";
                };
                msg #= "\n";
              } else {
                msg #= "   🏁 Record: No races yet\n";
              };

              // Show race class bracket (rating-based)
              let raceClassVariant = RaceClassUtils.getRaceClassFromRating(totalRatingAt100);
              let raceClassText = switch (raceClassVariant) {
                case (#Scrap) { "🗑️ Scrap (0-19 rating)" };
                case (#Junker) { "🥉 Junker (20-29 rating)" };
                case (#Raider) { "🥈 Raider (30-39 rating)" };
                case (#Elite) { "🥇 Elite (40-49 rating)" };
                case (#SilentKlan) { "💀 SilentKlan (50+ rating)" };
              };
              msg #= "   🏆 Class: " # raceClassText # " | ELO: " # Nat.toText(stats.eloRating) # " (skill)\n";

              // Show terrain preferences based on faction bonuses
              msg #= "   🎯 Prefers: " # (
                switch (stats.faction) {
                  case (#Blackhole) { "MetalRoads" };
                  case (#Box) { "ScrapHeaps" };
                  case (#Game) { "WastelandSand" };
                  case (_) { "All" };
                }
              );

              // Distance preference based on power vs speed
              let distancePref = if (currentStats.powerCore > currentStats.speed) {
                " terrain, LongTrek";
              } else {
                " terrain, MediumHaul";
              };
              msg #= distancePref # "\n";
            };
            case (null) {
              // Should not happen since getBotsForOwner returns initialized bots,
              // but handle gracefully
              msg #= "   ⚠️ Stats unavailable\n";
            };
          };

          msg #= "   🖼️  Thumbnail: " # thumbnailUrl # "\n\n";
        };

        let walletAccountId = ExtIntegration.principalToAccountIdentifier(userPrincipal, null);
        msg #= "Wallet ID: " # walletAccountId # "\n\n";
        msg #= "💡 Use garage_get_robot_details for full bot info\n";
        msg #= "💡 Use marketplace_browse_pokedbots to compare with available bots";
        msg;
      };

      ToolContext.makeTextSuccess(message, cb);
    };
  };
};
