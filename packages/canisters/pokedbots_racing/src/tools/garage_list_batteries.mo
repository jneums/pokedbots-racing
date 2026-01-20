import Result "mo:base/Result";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Time "mo:base/Time";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_list_batteries";
    title = ?"List Garage Batteries";
    description = ?"View all batteries stored in your garage. Batteries are found while scavenging and can be used to instantly charge bots with the jolt command.\n\n**BATTERY TYPES:**\n• ScrapCell (50 kWh) - Common, found in Scrap Heaps\n• SalvagePack (150 kWh) - Uncommon, found in Abandoned Settlements\n• IndustrialBank (400 kWh) - Rare, found anywhere\n• PlasmaVault (1000 kWh) - Legendary, very rare find\n\n**HEALTH:**\n• 100%: Operational - can deliver jolts\n• <100%: Damaged - must repair before use\n• Jolts damage health, cycling wears the core\n\n**USAGE:** Use garage_jolt_bot to discharge a battery into your bot for instant charging.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("battery_type", Json.obj([("type", Json.str("string")), ("description", Json.str("Optional: Filter by battery type (ScrapCell, SalvagePack, IndustrialBank, PlasmaVault)")), ("enum", Json.arr([Json.str("ScrapCell"), Json.str("SalvagePack"), Json.str("IndustrialBank"), Json.str("PlasmaVault")]))]))])),
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
      // Authentication required
      let user = switch (_auth) {
        case (null) {
          return ToolContext.makeError("Authentication required", cb);
        };
        case (?auth) { auth.principal };
      };

      // Parse optional filter
      let batteryTypeFilter : ?PokedBotsGarage.BatteryType = switch (Result.toOption(Json.getAsText(_args, "battery_type"))) {
        case (null) { null };
        case (?typeText) {
          switch (typeText) {
            case ("ScrapCell") { ?#ScrapCell };
            case ("SalvagePack") { ?#SalvagePack };
            case ("IndustrialBank") { ?#IndustrialBank };
            case ("PlasmaVault") { ?#PlasmaVault };
            case (_) { null };
          };
        };
      };

      // Get battery storage for user
      let storage = ctx.garageManager.getBatteryStorage(user);
      let now = Time.now();
      let surplus = ctx.garageManager.getGridSurplusForBatteries(user);

      // Filter batteries
      var batteries = storage.batteries;

      switch (batteryTypeFilter) {
        case (?filterType) {
          batteries := Array.filter<PokedBotsGarage.Battery>(
            batteries,
            func(b) {
              b.batteryType == filterType;
            },
          );
        };
        case (null) {};
      };

      // Sort by type (best first), then by health (highest first)
      batteries := Array.sort<PokedBotsGarage.Battery>(
        batteries,
        func(a, b) {
          let typeOrderA = switch (a.batteryType) {
            case (#PlasmaVault) { 0 };
            case (#IndustrialBank) { 1 };
            case (#SalvagePack) { 2 };
            case (#ScrapCell) { 3 };
          };
          let typeOrderB = switch (b.batteryType) {
            case (#PlasmaVault) { 0 };
            case (#IndustrialBank) { 1 };
            case (#SalvagePack) { 2 };
            case (#ScrapCell) { 3 };
          };
          if (typeOrderA < typeOrderB) { #less } else if (typeOrderA > typeOrderB) {
            #greater;
          } else {
            // Same type, sort by health (higher = better)
            if (a.healthPercent > b.healthPercent) { #less } else if (a.healthPercent < b.healthPercent) {
              #greater;
            } else { #equal };
          };
        },
      );

      // Build battery list JSON
      let batteryJsons = Array.map<PokedBotsGarage.Battery, McpTypes.JsonValue>(
        batteries,
        func(b) {
          let typeText = switch (b.batteryType) {
            case (#ScrapCell) { "ScrapCell" };
            case (#SalvagePack) { "SalvagePack" };
            case (#IndustrialBank) { "IndustrialBank" };
            case (#PlasmaVault) { "PlasmaVault" };
          };
          let baseCapacity = PokedBotsGarage.getBaseBatteryCapacity(b.batteryType);
          let maxCapacity = PokedBotsGarage.getCurrentBatteryMaxCapacity(b);
          let healthTier = PokedBotsGarage.getBatteryHealthTier(b.healthPercent);
          let healthTierText = switch (healthTier) {
            case (#Fresh) { "Fresh (100%)" };
            case (#Worn) { "Worn (66-99%)" };
            case (#Depleted) { "Depleted (33-65%)" };
            case (#Critical) { "Critical (1-32%)" };
            case (#Dead) { "Dead (0%)" };
          };
          let cycles = PokedBotsGarage.calculateBatteryCycles(b.kwhThroughput, b.batteryType);
          let cyclePercent = Int.abs(Float.toInt(cycles * 100.0));
          let isOperational = b.healthPercent == 100;

          // Project current charge without mutating state
          let projectedCharge = ctx.garageManager.projectBatteryCharge(b, surplus, now);

          Json.obj([
            ("id", Json.int(b.id)),
            ("type", Json.str(typeText)),
            ("base_capacity_kwh", Json.float(baseCapacity)),
            ("max_capacity_kwh", Json.float(maxCapacity)),
            ("stored_kwh", Json.float(projectedCharge)),
            ("health_percent", Json.int(b.healthPercent)),
            ("health_tier", Json.str(healthTierText)),
            ("cycles_percent", Json.int(cyclePercent)),
            ("is_operational", Json.bool(isOperational)),
            ("total_jolts_delivered", Json.int(b.totalJoltsDelivered)),
          ]);
        },
      );

      // Calculate totals
      var totalStored : Float = 0.0;
      var totalBaseCapacity : Float = 0.0;
      var totalEffectiveCapacity : Float = 0.0;
      var operationalCount = 0;
      for (b in batteries.vals()) {
        // Use projected charge for totals
        totalStored += ctx.garageManager.projectBatteryCharge(b, surplus, now);
        totalBaseCapacity += PokedBotsGarage.getBaseBatteryCapacity(b.batteryType);
        totalEffectiveCapacity += PokedBotsGarage.getCurrentBatteryMaxCapacity(b);
        if (b.healthPercent == 100) { operationalCount += 1 };
      };

      // Count by type
      var scrapCellCount = 0;
      var salvagePackCount = 0;
      var industrialBankCount = 0;
      var plasmaVaultCount = 0;
      for (b in batteries.vals()) {
        switch (b.batteryType) {
          case (#ScrapCell) { scrapCellCount += 1 };
          case (#SalvagePack) { salvagePackCount += 1 };
          case (#IndustrialBank) { industrialBankCount += 1 };
          case (#PlasmaVault) { plasmaVaultCount += 1 };
        };
      };

      let response = Json.obj([
        ("total_batteries", Json.int(batteries.size())),
        ("operational_batteries", Json.int(operationalCount)),
        ("total_stored_kwh", Json.float(totalStored)),
        ("total_effective_capacity_kwh", Json.float(totalEffectiveCapacity)),
        ("total_base_capacity_kwh", Json.float(totalBaseCapacity)),
        ("counts_by_type", Json.obj([("ScrapCell", Json.int(scrapCellCount)), ("SalvagePack", Json.int(salvagePackCount)), ("IndustrialBank", Json.int(industrialBankCount)), ("PlasmaVault", Json.int(plasmaVaultCount))])),
        ("batteries", Json.arr(batteryJsons)),
        (
          "tip",
          Json.str(
            if (batteries.size() == 0) {
              "No batteries in storage. Batteries are found while scavenging - send your bots out to find some!";
            } else if (operationalCount == 0) {
              "All batteries need repair! Use garage_repair_battery to restore health to 100%.";
            } else {
              "Use garage_jolt_bot to discharge an operational battery (100% health) into a bot.";
            }
          ),
        ),
      ]);

      return ToolContext.makeSuccess(response, cb);
    };
  };
};
