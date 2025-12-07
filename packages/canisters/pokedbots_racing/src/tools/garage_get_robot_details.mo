import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Time "mo:base/Time";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";
import WastelandFlavor "WastelandFlavor";
import ExtIntegration "../ExtIntegration";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_get_robot_details";
    title = ?"Get Robot Details";
    description = ?"Get comprehensive details for a specific PokedBot including stats, condition, career, and upgrade status. The bot must be initialized for racing first.\n\n**OWNERSHIP:**\n• If you own the bot: Full details including condition, battery, upgrade costs, active upgrades, scrap earned, and ability to race.\n• If you don't own the bot: Public racing profile with current stats, career record (wins/places/shows/races/ELO/reputation), faction, preferences, and overall rating.\n\nResponse includes 'upgrade_costs' field with the parts and ICP cost for the next upgrade of each stat type (speed, power_core, acceleration, stability) - only for owned bots.\n\n**BATTERY MECHANICS (aka 'Energy' in flavor text):**\n• Battery is consumed during races (10-20 base drain × terrain × efficiency × condition penalty).\n• **Power Core stat = Energy Efficiency**: Higher Power Core reduces battery drain logarithmically. At powerCore=20: 70% drain. At powerCore=40: 52% drain. At powerCore=100: 30% drain (3.3x more races per battery).\n• **BATTERY PENALTIES (Linear sliding scale, affects Speed/Acceleration):**\n  - 80-100% battery: No penalty (1.0x multiplier)\n  - 50-80% battery: Linear from -0% to -25% (0.75x-1.0x)\n  - 25-50% battery: Linear from -25% to -50% (0.50x-0.75x) ← 29% battery = ~46% reduction!\n  - 10-25% battery: Linear from -50% to -75% (0.25x-0.50x)\n  - 0-10% battery: Linear from -75% to -90% (0.10x-0.25x) - resurrection sickness\n• Recharge costs 0.1 ICP and restores 75 battery (6hr cooldown).\n\n**OVERCHARGE MECHANIC:**\n• Base: (100 - battery) × 0.75 × [0.5 + condition/200 + random(-0.2, +0.2)]\n• High condition = reliable overcharge. Low condition = RNG wildcard!\n• Consumed in next race for one-time boost: +0.3% Speed/Accel per 1%, -0.2% Stability/PowerCore per 1%\n• Max boost at 75% overcharge: +22.5% Speed/Accel, -15% Stability/PowerCore\n• Strategic: Low battery + high condition = consistent big boost. Low condition = gambling!\n\n**TERRAIN BONUSES:**\n• **Preferred Terrain Bonus**: +5% all stats when racing on the bot's preferred terrain (derived from background color).\n• **Faction Terrain Bonuses** (stack with preferred terrain):\n  - Blackhole: +12% on MetalRoads. 'Void Energy' = battery with superior highway efficiency.\n  - Golden: +15% all stats when condition ≥90% (pristine maintenance required).\n  - Box: +10% on ScrapHeaps. Game: +8% on WastelandSand.\n• Ultra-rare factions (UltimateMaster/Wild/Golden/Ultimate): 2x upgrade bonus chance, -25% to -40% decay rates.\n• Super-rare factions (Blackhole/Dead/Master): 20% upgrade bonus chance, -15% decay.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot to view (e.g., 4079)"))]))])),
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
        case (?idx) {
          if (idx > 9999) {
            return ToolContext.makeError("Invalid token_index: " # Nat.toText(idx) # ". PokedBots token indices are 0-9999.", cb);
          };
          idx;
        };
      };

      // Verify ownership via EXT (source of truth)
      let garageSubaccount = ExtIntegration.deriveGarageSubaccount(user);
      let garageAccountId = ExtIntegration.principalToAccountIdentifier(ctx.canisterPrincipal, ?garageSubaccount);
      let ownerResult = try {
        await ctx.extCanister.bearer(ExtIntegration.encodeTokenIdentifier(Nat32.fromNat(tokenIndex), ctx.extCanisterId));
      } catch (_) {
        return ToolContext.makeError("Failed to verify ownership", cb);
      };
      let isOwner = switch (ownerResult) {
        case (#err(_)) {
          return ToolContext.makeError("This PokedBot does not exist.", cb);
        };
        case (#ok(currentOwner)) {
          currentOwner == garageAccountId;
        };
      };

      // Get racing stats
      let racingStats = switch (ctx.garageManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("This PokedBot is not initialized for racing. Use garage_initialize_pokedbot first.", cb);
        };
        case (?stats) { stats };
      };

      // Calculate overall rating
      let overallRating = ctx.garageManager.calculateOverallRating(racingStats);
      let status = ctx.garageManager.getBotStatus(racingStats);
      let canRace = ctx.garageManager.canRace(Nat.toText(tokenIndex));

      // Determine race class bracket (ELO-based)
      let raceClass = if (racingStats.eloRating >= 1800) {
        "SilentKlan (1800+ ELO)";
      } else if (racingStats.eloRating >= 1600) {
        "Elite (1600-1799 ELO)";
      } else if (racingStats.eloRating >= 1400) {
        "Raider (1400-1599 ELO)";
      } else {
        "Scavenger (<1400 ELO)";
      };

      // Get wasteland flavor text
      let factionGreeting = WastelandFlavor.getFactionGreeting(racingStats.faction);
      let statusFlavor = WastelandFlavor.getStatusFlavor(status, racingStats.faction);
      let reputationTier = WastelandFlavor.getReputationTier(racingStats.factionReputation);

      // Helper functions for text conversion
      let factionText = switch (racingStats.faction) {
        // Ultra-Rare
        case (#UltimateMaster) { "Ultimate-Master" };
        case (#Wild) { "Wild" };
        case (#Golden) { "Golden" };
        case (#Ultimate) { "Ultimate" };
        // Super-Rare
        case (#Blackhole) { "Blackhole" };
        case (#Dead) { "Dead" };
        case (#Master) { "Master" };
        // Rare
        case (#Bee) { "Bee" };
        case (#Food) { "Food" };
        case (#Box) { "Box" };
        case (#Murder) { "Murder" };
        // Common
        case (#Game) { "Game" };
        case (#Animal) { "Animal" };
        case (#Industrial) { "Industrial" };
      };

      let distanceText = switch (racingStats.preferredDistance) {
        case (#ShortSprint) { "ShortSprint (< 10km)" };
        case (#MediumHaul) { "MediumHaul (10-20km)" };
        case (#LongTrek) { "LongTrek (> 20km)" };
      };

      let terrainText = switch (racingStats.preferredTerrain) {
        case (#ScrapHeaps) { "ScrapHeaps" };
        case (#WastelandSand) { "WastelandSand" };
        case (#MetalRoads) { "MetalRoads" };
      };

      // Generate terrain bonus explanation
      let terrainBonusNote = "PREFERRED TERRAIN: +5% all stats when racing on " # terrainText # ". This stacks with faction bonuses!";

      // Generate upgrade mechanics explanation
      let factionBonusDescription = switch (racingStats.faction) {
        case (#UltimateMaster or #Golden or #Ultimate) {
          "10% chance to double gain (ultra-rare)";
        };
        case (#Wild) { "±2 variance instead of doubling (high variance)" };
        case (#Blackhole or #Dead or #Master) {
          "20% chance to double gain (super-rare)";
        };
        case (#Bee or #Food or #Box or #Murder) {
          "35% chance to double gain (rare, catch-up mechanic)";
        };
        case (_) { "25% chance to double gain (common)" };
      };

      let upgradeMechanicsNote = "UPGRADE MECHANICS: Base gain = 1-3 points (1st upgrade: 1-3, 2nd-3rd: 1-2, 4th+: 1). Difficulty scaling: stats <60 get full bonus, 60-70 (×0.8), 70-80 (×0.6), 80-90 (×0.4), 90+ (×0.2). " # factionText # " faction bonus: " # factionBonusDescription # ". First 3 upgrades guaranteed ≥1 point, later upgrades can give 0.";

      // Check for active upgrade
      let now = Time.now();
      let upgradeInfo = switch (ctx.garageManager.getActiveUpgrade(tokenIndex)) {
        case null { null };
        case (?session) {
          if (session.endsAt > now) {
            let timeRemaining = session.endsAt - now;
            let hoursRemaining = timeRemaining / 3_600_000_000_000;
            let minutesRemaining = (timeRemaining % 3_600_000_000_000) / 60_000_000_000;

            let upgradeTypeText = switch (session.upgradeType) {
              case (#Velocity) { "Velocity (Speed)" };
              case (#PowerCore) { "Power Core" };
              case (#Thruster) { "Thruster (Acceleration)" };
              case (#Gyro) { "Gyro (Stability)" };
            };

            ?Json.obj([
              ("type", Json.str(upgradeTypeText)),
              ("time_remaining_hours", Json.int(hoursRemaining)),
              ("time_remaining_minutes", Json.int(minutesRemaining)),
              ("ends_at", Json.int(session.endsAt)),
              ("status", Json.str("In Progress")),
            ]);
          } else {
            null;
          };
        };
      };

      // Get current and base stats
      let currentStats = ctx.garageManager.getCurrentStats(racingStats);
      let baseStats = ctx.garageManager.getBaseStats(tokenIndex);

      // Calculate next upgrade costs for each stat (in parts and ICP)
      let PART_PRICE_E8S = 1_000_000 : Nat; // 0.01 ICP per part (100 parts = 1 ICP)
      let speedUpgradeCost = ctx.garageManager.calculateUpgradeCost(racingStats.speedUpgrades);
      let powerCoreUpgradeCost = ctx.garageManager.calculateUpgradeCost(racingStats.powerCoreUpgrades);
      let accelerationUpgradeCost = ctx.garageManager.calculateUpgradeCost(racingStats.accelerationUpgrades);
      let stabilityUpgradeCost = ctx.garageManager.calculateUpgradeCost(racingStats.stabilityUpgrades);

      let speedUpgradeICP = (speedUpgradeCost * PART_PRICE_E8S) / 100_000_000;
      let powerCoreUpgradeICP = (powerCoreUpgradeCost * PART_PRICE_E8S) / 100_000_000;
      let accelerationUpgradeICP = (accelerationUpgradeCost * PART_PRICE_E8S) / 100_000_000;
      let stabilityUpgradeICP = (stabilityUpgradeCost * PART_PRICE_E8S) / 100_000_000;

      // Generate image URLs
      let tokenId = ExtIntegration.encodeTokenIdentifier(Nat32.fromNat(tokenIndex), ctx.extCanisterId);
      let thumbnailUrl = "https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=" # tokenId # "&type=thumbnail";
      let fullImageUrl = "https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=" # tokenId;

      // Build JSON response - different fields based on ownership
      let response = if (isOwner) {
        // Full details for owned bots
        Json.obj([
          ("message", Json.str(factionGreeting)),
          ("token_index", Json.int(tokenIndex)),
          ("name", switch (racingStats.name) { case (?n) { Json.str(n) }; case (null) { Json.nullable() } }),
          ("race_class", Json.str(raceClass)),
          ("owner", Json.str(Principal.toText(user))),
          ("is_owner", Json.bool(true)),
          ("faction", Json.str(factionText)),
          ("stats", Json.obj([("speed", Json.int(currentStats.speed)), ("power_core", Json.int(currentStats.powerCore)), ("acceleration", Json.int(currentStats.acceleration)), ("stability", Json.int(currentStats.stability)), ("base_speed", Json.int(baseStats.speed)), ("base_power_core", Json.int(baseStats.powerCore)), ("base_acceleration", Json.int(baseStats.acceleration)), ("base_stability", Json.int(baseStats.stability)), ("speed_bonus", Json.int(racingStats.speedBonus)), ("power_core_bonus", Json.int(racingStats.powerCoreBonus)), ("acceleration_bonus", Json.int(racingStats.accelerationBonus)), ("stability_bonus", Json.int(racingStats.stabilityBonus)), ("speed_upgrades", Json.int(racingStats.speedUpgrades)), ("power_core_upgrades", Json.int(racingStats.powerCoreUpgrades)), ("acceleration_upgrades", Json.int(racingStats.accelerationUpgrades)), ("stability_upgrades", Json.int(racingStats.stabilityUpgrades))])),
          ("upgrade_costs", Json.obj([("speed_parts", Json.int(speedUpgradeCost)), ("speed_icp", Json.int(speedUpgradeICP)), ("power_core_parts", Json.int(powerCoreUpgradeCost)), ("power_core_icp", Json.int(powerCoreUpgradeICP)), ("acceleration_parts", Json.int(accelerationUpgradeCost)), ("acceleration_icp", Json.int(accelerationUpgradeICP)), ("stability_parts", Json.int(stabilityUpgradeCost)), ("stability_icp", Json.int(stabilityUpgradeICP))])),
          ("upgrade_mechanics", Json.str(upgradeMechanicsNote)),
          ("condition", Json.obj([("battery", Json.int(racingStats.battery)), ("overcharge", Json.int(racingStats.overcharge)), ("condition", Json.int(racingStats.condition)), ("status", Json.str(status)), ("status_message", Json.str(statusFlavor))])),
          ("career", Json.obj([("races_entered", Json.int(racingStats.racesEntered)), ("wins", Json.int(racingStats.wins)), ("places", Json.int(racingStats.places)), ("shows", Json.int(racingStats.shows)), ("total_scrap_earned", Json.int(racingStats.totalScrapEarned)), ("faction_reputation", Json.int(racingStats.factionReputation)), ("reputation_tier", Json.str(reputationTier))])),
          ("overall_rating", Json.int(overallRating)),
          ("can_race", Json.bool(canRace)),
          ("preferred_distance", Json.str(distanceText)),
          ("preferred_terrain", Json.str(terrainText)),
          ("terrain_bonus_note", Json.str(terrainBonusNote)),
          ("experience", Json.int(racingStats.experience)),
          ("thumbnail", Json.str(thumbnailUrl)),
          ("image", Json.str(fullImageUrl)),
          (
            "active_upgrade",
            switch (upgradeInfo) {
              case null { Json.obj([("status", Json.str("None"))]) };
              case (?info) { info };
            },
          ),
        ]);
      } else {
        // Public details only for bots not owned by caller
        Json.obj([
          ("message", Json.str("Public racing profile for PokedBot #" # Nat.toText(tokenIndex))),
          ("token_index", Json.int(tokenIndex)),
          ("name", switch (racingStats.name) { case (?n) { Json.str(n) }; case (null) { Json.nullable() } }),
          ("race_class", Json.str(raceClass)),
          ("is_owner", Json.bool(false)),
          ("faction", Json.str(factionText)),
          ("stats", Json.obj([("speed", Json.int(currentStats.speed)), ("power_core", Json.int(currentStats.powerCore)), ("acceleration", Json.int(currentStats.acceleration)), ("stability", Json.int(currentStats.stability))])),
          ("career", Json.obj([("races_entered", Json.int(racingStats.racesEntered)), ("wins", Json.int(racingStats.wins)), ("places", Json.int(racingStats.places)), ("shows", Json.int(racingStats.shows)), ("faction_reputation", Json.int(racingStats.factionReputation)), ("reputation_tier", Json.str(reputationTier)), ("elo_rating", Json.int(racingStats.eloRating))])),
          ("overall_rating", Json.int(overallRating)),
          ("preferred_distance", Json.str(distanceText)),
          ("preferred_terrain", Json.str(terrainText)),
          ("thumbnail", Json.str(thumbnailUrl)),
          ("image", Json.str(fullImageUrl)),
        ]);
      };

      ToolContext.makeSuccess(response, cb);
    };
  };
};
