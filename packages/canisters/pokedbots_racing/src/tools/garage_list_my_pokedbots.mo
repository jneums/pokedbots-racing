import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Time "mo:base/Time";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";

import ToolContext "./ToolContext";
import ExtIntegration "../ExtIntegration";

module {
  let RECHARGE_COOLDOWN : Int = 21600000000000; // 6 hours in nanoseconds
  let REPAIR_COOLDOWN : Int = 43200000000000; // 12 hours in nanoseconds
  public func config() : McpTypes.Tool = {
    name = "garage_list_my_pokedbots";
    title = ?"List My PokedBots";
    description = ?"List all PokedBots in your wallet with detailed stats, full power stats, racing status, scavenging status, and overall ratings";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([])),
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

      // Check user's wallet (non-custodial)
      let walletAccountId = ExtIntegration.principalToAccountIdentifier(userPrincipal, null);
      let tokensResult = await ExtIntegration.getOwnedTokens(ctx.extCanister, walletAccountId);

      let message = switch (tokensResult) {
        case (#err(msg)) {
          "🤖 Empty Garage\n\nNo PokedBots found in your wallet.\n\nWallet ID: " # walletAccountId;
        };
        case (#ok(tokens)) {
          if (tokens.size() == 0) {
            "🤖 Empty Garage\n\nNo PokedBots found in your wallet.\n\nWallet ID: " # walletAccountId;
          } else {
            // Get user inventory
            let inventory = ctx.garageManager.getUserInventory(userPrincipal);
            var msg = "🤖 Your Garage\n\n";

            // Add inventory summary
            msg #= "📦 Parts Inventory (earned from racing):\n";
            msg #= "   🏎️  Speed Chips: " # Nat.toText(inventory.speedChips) # " (from MetalRoads races)\n";
            msg #= "   ⚡ Power Cells: " # Nat.toText(inventory.powerCoreFragments) # " (from ScrapHeaps races)\n";
            msg #= "   🚀 Thruster Kits: " # Nat.toText(inventory.thrusterKits) # " (from WastelandSand races)\n";
            msg #= "   🎯 Gyro Units: " # Nat.toText(inventory.gyroModules) # " (from WastelandSand races)\n";
            msg #= "   ⭐ Universal Parts: " # Nat.toText(inventory.universalParts) # "\n\n";

            msg #= "Found " # Nat32.toText(Nat32.fromNat(tokens.size())) # " PokedBot(s)\n\n";

            for (tokenIndex in tokens.vals()) {
              let tokenId = ExtIntegration.encodeTokenIdentifier(tokenIndex, ctx.extCanisterId);
              let thumbnailUrl = "https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=" # tokenId # "&type=thumbnail";

              // Get racing stats if initialized
              let robotStats = ctx.getStats(Nat32.toNat(tokenIndex));

              msg #= "🏎️ PokedBot #" # Nat32.toText(tokenIndex);

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
                  let baseStats = ctx.garageManager.getBaseStats(Nat32.toNat(tokenIndex));

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
                  msg #= " | 🔧 Condition: " # Nat32.toText(Nat32.fromNat(stats.condition)) # "%\n";

                  // Show scavenging status
                  let now = Time.now();
                  switch (stats.activeMission) {
                    case (?mission) {
                      let missionName = switch (mission.missionType) {
                        case (#ShortExpedition) { "Short Expedition (5h)" };
                        case (#DeepSalvage) { "Deep Salvage (11h)" };
                        case (#WastelandExpedition) {
                          "Wasteland Expedition (23h)";
                        };
                      };
                      let zoneName = switch (mission.zone) {
                        case (#ScrapHeaps) { "ScrapHeaps" };
                        case (#AbandonedSettlements) { "AbandonedSettlements" };
                        case (#DeadMachineFields) { "DeadMachineFields" };
                      };
                      msg #= "   🔍 SCAVENGING: " # missionName # " in " # zoneName;
                      if (now >= mission.endTime) {
                        msg #= " ✅ Ready to collect!";
                      };
                      msg #= "\n";
                    };
                    case (null) {};
                  };

                  // Show service cooldowns
                  msg #= "   ";
                  switch (stats.lastRecharged) {
                    case (?lastTime) {
                      if (now - lastTime >= RECHARGE_COOLDOWN) {
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

                  // Show race class bracket (ELO-based)
                  let raceClassText = if (stats.eloRating >= 1800) {
                    "💀 SilentKlan (1800+ ELO)";
                  } else if (stats.eloRating >= 1600) {
                    "🥇 Elite (1600-1799 ELO)";
                  } else if (stats.eloRating >= 1400) {
                    "🥈 Raider (1400-1599 ELO)";
                  } else {
                    "🥉 Junker (<1400 ELO)";
                  };
                  msg #= "   🏆 Class: " # raceClassText # " | ELO: " # Nat.toText(stats.eloRating) # "\n";

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
                  // Not initialized for racing yet - show base stats from garageManager
                  let baseStats = ctx.garageManager.getBaseStats(Nat32.toNat(tokenIndex));

                  let totalStats = baseStats.speed + baseStats.powerCore + baseStats.acceleration + baseStats.stability;
                  let rating = totalStats / 4;

                  msg #= "   ⚡ Base: " # Nat32.toText(Nat32.fromNat(rating)) # "/100 | ⚠️ Not initialized\n";

                  msg #= "   📊 Potential Stats: SPD " # Nat32.toText(Nat32.fromNat(baseStats.speed));
                  msg #= " | PWR " # Nat32.toText(Nat32.fromNat(baseStats.powerCore));
                  msg #= " | ACC " # Nat32.toText(Nat32.fromNat(baseStats.acceleration));
                  msg #= " | STB " # Nat32.toText(Nat32.fromNat(baseStats.stability)) # "\n";
                  msg #= "   💡 Initialize this bot to start racing!\n";
                };
              };

              msg #= "   🖼️  Thumbnail: " # thumbnailUrl # "\n\n";
            };

            msg #= "Wallet ID: " # walletAccountId # "\n\n";
            msg #= "💡 Use garage_get_robot_details for full bot info\n";
            msg #= "💡 Use marketplace_browse_pokedbots to compare with available bots";
            msg;
          };
        };
      };

      ToolContext.makeTextSuccess(message, cb);
    };
  };
};
