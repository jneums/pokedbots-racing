import Result "mo:base/Result";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Array "mo:base/Array";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_get_station_status";
    title = ?"Garage Station Status";
    description = ?"View the full power grid, charging station, and repair bay status of your garage.\n\n**POWER GRID:**\nShows total capacity (base + SMR reactors), current draw, surplus, and efficiency.\n\n**CHARGING STATION:**\nShows how many bots are currently charging and the effective watts per bot.\nMore bots charging = lower efficiency (shared power).\n\n**REPAIR BAYS:**\nShows all repair bay slots (up to 5), their tier, current occupant, and power draw.\nHigher tier bays repair faster but draw more power.\n\n**BATTERIES:**\nShows surplus watts available for passive battery charging.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([])),
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

      // Track this method call
      ctx.trackMethodCall("garage_get_station_status", user);

      // Get power status from garage manager
      let powerStatus = ctx.garageManager.getGaragePowerStatus(user);

      // Get SMR storage for reactor details
      let smrStorage = ctx.garageManager.getUserSMRStorage(user);

      // Build SMR reactor list
      let smrJsons = Array.map<PokedBotsGarage.InstalledSMR, McpTypes.JsonValue>(
        smrStorage.installedSMRs,
        func(smr) {
          let modelName = PokedBotsGarage.getSMRModelName(smr.model);
          let lifetimeKwh = PokedBotsGarage.getSMRLifetimeKwh(smr.model);
          let usedKwh = Int.abs(Float.toInt(smr.totalMwhGenerated));
          let remainingKwh = if (usedKwh >= lifetimeKwh) { 0 } else { lifetimeKwh - usedKwh };
          let isAlive = ctx.garageManager.isSMRAlive(smr);

          Json.obj([
            ("model", Json.str(modelName)),
            ("power_output_watts", Json.int(smr.powerOutput)),
            ("lifetime_kwh", Json.int(lifetimeKwh)),
            ("used_kwh", Json.int(usedKwh)),
            ("remaining_kwh", Json.int(remainingKwh)),
            ("is_alive", Json.bool(isAlive)),
          ]);
        },
      );

      // Get repair bay storage
      let repairBayStorage = ctx.garageManager.getUserRepairBayStorage(user);

      // Count bay statuses
      var occupiedBays : Nat = 0;
      var upgradingBays : Nat = 0;
      for (bay in repairBayStorage.bays.vals()) {
        if (bay.currentBotToken != null) { occupiedBays += 1 };
        if (bay.upgradeInProgress != null) { upgradingBays += 1 };
      };

      let totalBays = repairBayStorage.bays.size();
      let availableBays : Nat = if (totalBays >= occupiedBays + upgradingBays) {
        totalBays - occupiedBays - upgradingBays;
      } else { 0 };

      // Build repair bay list
      let bayJsons = Array.map<PokedBotsGarage.RepairBay, McpTypes.JsonValue>(
        repairBayStorage.bays,
        func(bay) {
          let tierConfig = PokedBotsGarage.getRepairBayTierConfig(bay.tier);
          let tierName = switch (tierConfig) {
            case (?config) { config.name };
            case (null) { "Unknown" };
          };
          let repairRate = switch (tierConfig) {
            case (?config) { config.repairRatePerHour };
            case (null) { 0 };
          };
          let bayPowerDraw = PokedBotsGarage.getRepairBayPowerDraw(bay.tier);

          let isOccupied = bay.currentBotToken != null;
          let isUpgrading = bay.upgradeInProgress != null;

          // Build status string
          let status = if (isUpgrading) {
            "upgrading";
          } else if (isOccupied) {
            "repairing";
          } else {
            "available";
          };

          // Bot token (if occupied)
          let botField = switch (bay.currentBotToken) {
            case (?token) { Json.int(token) };
            case (null) { Json.nullable() };
          };

          // Upgrade info (if upgrading)
          let upgradeField = switch (bay.upgradeInProgress) {
            case (?upgrade) {
              Json.obj([
                ("target_tier", Json.int(upgrade.targetTier)),
                ("completion_time", Json.int(Int.abs(upgrade.completionTime))),
              ]);
            };
            case (null) { Json.nullable() };
          };

          Json.obj([
            ("bay_id", Json.int(bay.bayId)),
            ("tier", Json.int(bay.tier)),
            ("tier_name", Json.str(tierName)),
            ("status", Json.str(status)),
            ("current_bot", botField),
            ("repair_rate_per_hour", Json.int(repairRate)),
            ("power_draw_watts", Json.int(bayPowerDraw)),
            ("upgrade_in_progress", upgradeField),
          ]);
        },
      );

      // Calculate available watts
      let availableWatts = if (powerStatus.currentDrawWatts >= powerStatus.totalCapacityWatts) {
        0;
      } else {
        powerStatus.totalCapacityWatts - powerStatus.currentDrawWatts;
      };

      // Build efficiency display
      let efficiencyPercent = Int.abs(Float.toInt(powerStatus.efficiency * 100.0));

      // Build the full response
      let response = Json.obj([
        ("power_grid", Json.obj([
          ("total_watts", Json.int(powerStatus.totalCapacityWatts)),
          ("used_watts", Json.int(powerStatus.currentDrawWatts)),
          ("available_watts", Json.int(availableWatts)),
          ("base_watts", Json.int(PokedBotsGarage.BASE_POWER_WATTS)),
          ("smr_watts", Json.int(powerStatus.totalCapacityWatts - PokedBotsGarage.BASE_POWER_WATTS)),
          ("efficiency_percent", Json.int(efficiencyPercent)),
          ("smr_reactors", Json.arr(smrJsons)),
        ])),
        ("charging_station", Json.obj([
          ("bots_charging", Json.int(powerStatus.botsCharging)),
          ("watts_per_bot", Json.int(powerStatus.wattsPerBot)),
          ("watts_per_bot_full", Json.int(PokedBotsGarage.WATTS_PER_BOT)),
          ("charging_draw_watts", Json.int(powerStatus.botsCharging * PokedBotsGarage.WATTS_PER_BOT)),
        ])),
        ("repair_bays", Json.obj([
          ("total_slots", Json.int(totalBays)),
          ("occupied", Json.int(occupiedBays)),
          ("upgrading", Json.int(upgradingBays)),
          ("available", Json.int(availableBays)),
          ("total_power_draw_watts", Json.int(powerStatus.repairBayDrawWatts)),
          ("bays", Json.arr(bayJsons)),
        ])),
        ("battery_charging", Json.obj([
          ("surplus_watts", Json.int(powerStatus.surplusWatts)),
          ("batteries_charging", Json.int(powerStatus.batteriesCharging)),
          ("battery_draw_watts", Json.int(powerStatus.batteryDrawWatts)),
          ("effective_battery_draw_watts", Json.int(powerStatus.effectiveBatteryDrawWatts)),
        ])),
        ("tip", Json.str(
          if (powerStatus.efficiency < 0.5) {
            "⚠️ Low efficiency! Your grid is overloaded. Consider installing an SMR reactor to boost capacity, or reduce the number of bots charging simultaneously.";
          } else if (availableWatts == 0) {
            "⚡ Grid at full capacity. No surplus power available for batteries. Consider upgrading your power grid with SMR reactors.";
          } else if (powerStatus.botsCharging == 0 and occupiedBays == 0) {
            "💤 Grid is idle. Send bots to the Charging Station or Repair Bay to put your power grid to work!";
          } else {
            "✅ Grid operating normally. Surplus power is available for battery charging.";
          }
        )),
      ]);

      return ToolContext.makeSuccess(response, cb);
    };
  };
};
