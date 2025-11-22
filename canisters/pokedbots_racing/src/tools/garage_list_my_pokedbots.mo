import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";

import ToolContext "./ToolContext";
import ExtIntegration "../ExtIntegration";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_list_my_pokedbots";
    title = ?"List My PokedBots";
    description = ?"List all PokedBots in your garage subaccount with detailed stats, racing status, and overall ratings";
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

      let garageSubaccount = ExtIntegration.deriveGarageSubaccount(userPrincipal);
      let garageAccountId = ExtIntegration.principalToAccountIdentifier(ctx.canisterPrincipal, ?garageSubaccount);
      let tokensResult = await ExtIntegration.getOwnedTokens(ctx.extCanister, garageAccountId);

      let message = switch (tokensResult) {
        case (#err(msg)) {
          "🤖 Empty Garage\n\nNo PokedBots found.\n\nGarage ID: " # garageAccountId;
        };
        case (#ok(tokens)) {
          if (tokens.size() == 0) {
            "🤖 Empty Garage\n\nNo PokedBots found.\n\nGarage ID: " # garageAccountId;
          } else {
            // Get user inventory
            let inventory = ctx.garageManager.getUserInventory(userPrincipal);
            var msg = "🤖 Your Garage\n\n";

            // Add inventory summary
            msg #= "📦 Inventory:\n";
            msg #= "   • Speed Chips: " # Nat.toText(inventory.speedChips) # "\n";
            msg #= "   • Power Cells: " # Nat.toText(inventory.powerCoreFragments) # "\n";
            msg #= "   • Thruster Parts: " # Nat.toText(inventory.thrusterKits) # "\n";
            msg #= "   • Gyro Units: " # Nat.toText(inventory.gyroModules) # "\n";
            msg #= "   • Universal Parts: " # Nat.toText(inventory.universalParts) # "\n\n";

            msg #= "Found " # Nat32.toText(Nat32.fromNat(tokens.size())) # " PokedBot(s)\n\n";

            for (tokenIndex in tokens.vals()) {
              let tokenId = ExtIntegration.encodeTokenIdentifier(tokenIndex, ctx.extCanisterId);
              let thumbnailUrl = "https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=" # tokenId # "&type=thumbnail";

              // Get racing stats if initialized
              let robotStats = ctx.getStats(Nat32.toNat(tokenIndex));

              msg #= "🏎️ PokedBot #" # Nat32.toText(tokenIndex) # "\n";

              // Show stats and rating
              switch (robotStats) {
                case (?stats) {
                  // Get current stats (base + bonuses)
                  let currentStats = ctx.getCurrentStats(stats);
                  let totalStats = currentStats.speed + currentStats.powerCore + currentStats.acceleration + currentStats.stability;
                  let rating = totalStats / 4;

                  msg #= "   ⚡ Rating: " # Nat32.toText(Nat32.fromNat(rating)) # "/100";

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

                  // Show stats
                  msg #= "   📊 Stats: SPD " # Nat32.toText(Nat32.fromNat(currentStats.speed));
                  msg #= " | PWR " # Nat32.toText(Nat32.fromNat(currentStats.powerCore));
                  msg #= " | ACC " # Nat32.toText(Nat32.fromNat(currentStats.acceleration));
                  msg #= " | STB " # Nat32.toText(Nat32.fromNat(currentStats.stability)) # "\n";

                  // Show condition
                  msg #= "   🔋 Battery: " # Nat32.toText(Nat32.fromNat(stats.battery)) # "%";
                  msg #= " | 🔧 Condition: " # Nat32.toText(Nat32.fromNat(stats.condition)) # "%\n";

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

                  // Show race class bracket
                  let raceClassText = if (stats.wins <= 2) {
                    "🥉 Scavenger (0-2 wins)";
                  } else if (stats.wins >= 3 and stats.wins <= 5) {
                    "🥈 Raider (3-5 wins)";
                  } else if (stats.wins >= 6 and stats.wins <= 9) {
                    "🥇 Elite (6-9 wins)";
                  } else {
                    // 10+ wins - check if eligible for SilentKlan (ultra-rare factions)
                    switch (stats.faction) {
                      case (#UltimateMaster or #Wild or #Golden or #Ultimate) {
                        "💀 SilentKlan (10+, Ultra-Rare)";
                      };
                      case (#Blackhole or #Dead or #Master) {
                        "💀 SilentKlan (10+, Super-Rare)";
                      };
                      case (_) {
                        "🏆 Elite+ (10+ wins, not eligible for SilentKlan)";
                      };
                    };
                  };
                  msg #= "   🏆 Class: " # raceClassText # "\n";

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

            msg #= "Garage ID: " # garageAccountId # "\n\n";
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
