import Result "mo:base/Result";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";

module {
  public func config() : McpTypes.Tool = {
    name = "help_get_compendium";
    title = ?"PokedBots Racing Compendium";
    description = ?"Get comprehensive reference information about factions, mechanics, and systems. Call this once at the start of conversations to understand game mechanics.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("section", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("all"), Json.str("factions"), Json.str("battery"), Json.str("terrain"), Json.str("upgrades"), Json.str("scavenging")])), ("description", Json.str("Which section to retrieve (default: all)"))]))])),
      ("required", Json.arr([])),
    ]);
    outputSchema = null;
  };

  public func handle(ctx : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {

      let section = switch (Result.toOption(Json.getAsText(_args, "section"))) {
        case (null) { "all" };
        case (?s) { s };
      };

      let factionInfo = "**FACTION BONUSES:**\n\n**Ultra-Rare Factions:**\n• UltimateMaster: +15% all stats\n• Wild: +20% Accel, -10% Stability, ±2 upgrade variance\n• Golden: +15% all stats when condition ≥90% (pristine maintenance required)\n• Ultimate: +12% Speed/Accel\n• Benefits: 2x upgrade bonus chance, -25% to -40% decay rates\n\n**Super-Rare Factions:**\n• Blackhole: +12% on MetalRoads terrain, converts world buffs to racing stats\n• Dead: +10% PowerCore, +8% Stability\n• Master: +12% Speed, +8% PowerCore, every 10th scavenge mission doubles parts\n• Benefits: 20% upgrade bonus chance, -15% decay\n\n**Rare Factions:**\n• Bee: +10% Acceleration\n• Food: +8% condition recovery\n• Box: +10% on ScrapHeaps terrain, 5% chance to triple scavenging parts\n• Murder: +8% Speed/Accel\n• Benefits: 35% upgrade bonus chance\n\n**Common Factions:**\n• Game: +8% on WastelandSand terrain, +10 parts every 5th scavenge\n• Animal: +6% balanced all stats\n• Industrial: +5% PowerCore/Stability\n• Benefits: 25% upgrade bonus chance";

      let batteryInfo = "**BATTERY MECHANICS (aka 'Energy'):**\n\n**Power Core = Energy Efficiency:**\nHigher Power Core reduces battery drain logarithmically:\n• powerCore=20: 70% drain\n• powerCore=40: 52% drain\n• powerCore=100: 30% drain (3.3x more races per battery)\n\n**BATTERY PENALTIES (affects Speed/Acceleration):**\n• 80-100%: No penalty (1.0x)\n• 50-80%: -0% to -25% (0.75x-1.0x linear)\n• 25-50%: -25% to -50% (0.50x-0.75x) ← 29% = ~46% reduction!\n• 10-25%: -50% to -75% (0.25x-0.50x)\n• 0-10%: -75% to -90% (0.10x-0.25x) resurrection sickness\n\n**Recharge:** 0.1 ICP, restores 75 battery, 6hr cooldown\n\n**OVERCHARGE MECHANIC:**\n• Formula: (100 - battery) × 0.75 × [0.5 + condition/200 + random(-0.2, +0.2)]\n• High condition = reliable. Low condition = RNG wildcard\n• Consumed in next race:\n  - Speed/Accel: +0.3% per 1% overcharge (max +22.5% at 75%)\n  - Stability/PowerCore: -0.2% per 1% overcharge (max -15%)\n• Strategy: Low battery + high condition = consistent big boost";

      let terrainInfo = "**TERRAIN BONUSES:**\n\n**Preferred Terrain:** +5% all stats when racing on bot's preferred terrain (derived from NFT background color)\n\n**Faction Terrain Bonuses (stack with preferred):**\n• Blackhole: +12% on MetalRoads\n• Golden: +15% all stats when condition ≥90%\n• Box: +10% on ScrapHeaps\n• Game: +8% on WastelandSand\n\n**Race Terrain Effects:**\n• ScrapHeaps: 1.0x battery drain, 1.0-1.5x condition wear\n• WastelandSand: 1.1x battery drain, 1.1-1.5x condition wear\n• MetalRoads: 1.2x battery drain, 1.2-1.5x condition wear";

      let upgradeInfo = "**UPGRADE MECHANICS:**\n\n**Base Gain:**\n• 1st upgrade: 1-3 points\n• 2nd-3rd: 1-2 points\n• 4th+: 1 point\n\n**Difficulty Scaling:**\n• <60: Full bonus (1.0x)\n• 60-70: 0.8x\n• 70-80: 0.6x\n• 80-90: 0.4x\n• 90+: 0.2x\n\n**Faction Bonus Chances (to double points):**\n• Ultra-rare: 10%\n• Super-rare (Blackhole/Dead/Master): 20%\n• Rare (Bee/Food/Box/Murder): 35%\n• Common: 25%\n• Wild: ±2 variance instead\n\n**Costs:** Escalating parts or ICP (100→200→300→900→2700→8100 parts)\n\n**Payment:** Specific parts (Speed Chips, Power Core Fragments, Thruster Kits, Gyro Modules) OR Universal Parts can substitute for any type\n\nFirst 3 upgrades guaranteed ≥1 point, later upgrades can give 0.";

      let scavengingInfo = "**SCAVENGING SYSTEM:**\n\n**Mission Types:**\n• ShortExpedition (5h): 15-35 parts, 10 battery\n• DeepSalvage (11h): 40-80 parts, 20 battery\n• WastelandExpedition (23h): 100-200 parts, 40 battery\n\n**Zones & Part Distribution:**\n• ScrapHeaps: Safe (1.0x multipliers, 40% universal parts)\n• AbandonedSettlements: Moderate (1.4x parts, 1.1x battery, 1.15x condition, 25% universal)\n• DeadMachineFields: Dangerous (2.0x parts, 1.2x battery, 1.3x condition, 10% universal)\n\n**Part Types:** Speed Chips, Power Core Fragments, Thruster Kits, Gyro Modules, Universal Parts\n\n**STAT-BASED BONUSES:**\n• Power Core (Energy Efficiency):\n  - 80+: -20% battery cost\n  - 50-79: -10% battery cost\n  - <50: Normal cost\n• Condition (Consistency):\n  - 80+: Tight variance (90-110%, ±10%)\n  - 50-79: Normal variance (80-120%, ±20%)\n  - <50: Wide variance (70-130%, ±30% risky/swingy)\n• Stability (Durability in Dangerous Zones):\n  - 70+ in DeadMachineFields: -25% condition loss\n  - Otherwise: Normal condition loss\n\n**World Buff Chance (15%):**\n• 5h: +2 one stat | 11h: +3 speed, +2 accel | 23h: +4 speed, +3 accel, +2 power\n• Expires in 48h if unused\n\n**Faction Bonuses (Parts Multipliers):**\n• UltimateMaster: 1.20x all zones, -30% battery, 15% double parts, +20 battery return\n• Golden: 15% chance to double parts\n• Ultimate: 1.15x all zones, -15% mission time\n• Wild: 1.25x WastelandSand, 2x world buff potency (50% proc chance), -40% condition loss\n• Blackhole: 1.10x all zones, world buffs grant +1-3 Speed/Accel (not parts), +50% condition damage\n• Dead: 1.40x DeadMachineFields (1.10x others), -50% condition loss\n• Master: 1.12x all zones, -25% battery, every 10th mission doubles parts\n• Bee: 1.08x AbandonedSettlements, +10% on 23h, shared buffs if 2+ Bee bots\n• Food: 1.12x ScrapHeaps/Settlements, -20% battery, +30% world buff strength\n• Box: 1.05x all zones, 5% chance to triple parts\n• Murder: 1.15x DeadMachineFields, +20% condition damage\n• Game: 1.0x base, +10 parts every 5th mission\n• Animal: 1.08x WastelandSand, -15% condition loss on 11h/23h, buffs last 2 races\n• Industrial: 1.05x all zones, -10% battery, reduced variance (90-110% instead of 80-120%)";

      let content = if (section == "all") {
        factionInfo # "\n\n" # batteryInfo # "\n\n" # terrainInfo # "\n\n" # upgradeInfo # "\n\n" # scavengingInfo;
      } else if (section == "factions") {
        factionInfo;
      } else if (section == "battery") {
        batteryInfo;
      } else if (section == "terrain") {
        terrainInfo;
      } else if (section == "upgrades") {
        upgradeInfo;
      } else if (section == "scavenging") {
        scavengingInfo;
      } else {
        "Invalid section";
      };

      let response = Json.obj([
        ("section", Json.str(section)),
        ("content", Json.str(content)),
      ]);

      ToolContext.makeSuccess(response, cb);
    };
  };
};
