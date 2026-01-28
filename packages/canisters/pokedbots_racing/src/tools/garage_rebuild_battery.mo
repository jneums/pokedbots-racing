import Result "mo:base/Result";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Error "mo:base/Error";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_rebuild_battery";
    title = ?"Rebuild Battery Core";
    description = ?"Rebuild a battery's core to reset cycles, restoring full capacity. This is the only way to restore a degraded battery.\n\n**BATTERY DEGRADATION (realistic curve):**\n• 0-100 cycles: 100% → 90% capacity (barely noticeable)\n• 100-150 cycles: 90% → 70% capacity (starting to notice)\n• 150-200 cycles: 70% → 30% capacity (rapid decline 'knee')\n• 200-250 cycles: 30% → 0% capacity (battery dying)\n• 250+ cycles: DEAD (0% capacity, cannot jolt)\n\n**REBUILD COSTS (choose parts OR ICP):**\n• ScrapCell: 300 parts OR 2 ICP\n• SalvagePack: 900 parts OR 5 ICP\n• IndustrialBank: 2400 parts OR 12 ICP\n• PlasmaVault: 6000 parts OR 25 ICP\n\n**WHAT REBUILD DOES:**\n• Resets cycles to 0 (restores 100% capacity)\n• Battery is EMPTY after rebuild (needs recharge)\n\n**WHEN TO REBUILD:**\n• Capacity drops below acceptable level\n• Battery reaches 250+ cycles (dead)";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("battery_id", Json.obj([("type", Json.str("number")), ("description", Json.str("The ID of the battery to rebuild (from garage_list_batteries)"))])), ("payment_method", Json.obj([("type", Json.str("string")), ("description", Json.str("Payment method: 'parts' (from inventory) or 'icp' (requires ICRC-2 approval)")), ("enum", Json.arr([Json.str("parts"), Json.str("icp")]))]))])),
      ("required", Json.arr([Json.str("battery_id"), Json.str("payment_method")])),
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

      // Parse battery ID
      let batteryId = switch (Result.toOption(Json.getAsNat(_args, "battery_id"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: battery_id", cb);
        };
        case (?id) { id };
      };

      // Parse payment method
      let useIcp = switch (Result.toOption(Json.getAsText(_args, "payment_method"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: payment_method (must be 'parts' or 'icp')", cb);
        };
        case (?method) {
          switch (method) {
            case ("parts") { false };
            case ("icp") { true };
            case (_) {
              return ToolContext.makeError("Invalid payment_method: must be 'parts' or 'icp'", cb);
            };
          };
        };
      };

      // For ICP payment, we need to handle the transfer first
      if (useIcp) {
        // Get battery first to check cost
        let batteryOpt = ctx.garageManager.getBattery(user, batteryId);

        switch (batteryOpt) {
          case (null) {
            return ToolContext.makeError("Battery not found with ID: " # Nat.toText(batteryId), cb);
          };
          case (?battery) {
            let icpCost = PokedBotsGarage.getBatteryRebuildIcpCost(battery.batteryType);
            let transferFee = 10000; // 0.0001 ICP
            let totalCost = icpCost + transferFee;

            // Get ICP Ledger
            let ledgerId = switch (ctx.icpLedgerCanisterId()) {
              case (?id) { id };
              case (null) {
                return ToolContext.makeError("ICP Ledger not configured", cb);
              };
            };

            let icpLedger = actor (Principal.toText(ledgerId)) : actor {
              icrc2_transfer_from : shared {
                from : { owner : Principal; subaccount : ?Blob };
                to : { owner : Principal; subaccount : ?Blob };
                amount : Nat;
                fee : ?Nat;
                memo : ?Blob;
                created_at_time : ?Nat64;
                spender_subaccount : ?Blob;
              } -> async {
                #Ok : Nat;
                #Err : {
                  #BadFee : { expected_fee : Nat };
                  #BadBurn : { min_burn_amount : Nat };
                  #InsufficientFunds : { balance : Nat };
                  #InsufficientAllowance : { allowance : Nat };
                  #TooOld;
                  #CreatedInFuture : { ledger_time : Nat64 };
                  #Duplicate : { duplicate_of : Nat };
                  #TemporarilyUnavailable;
                  #GenericError : { error_code : Nat; message : Text };
                };
              };
            };

            // Attempt ICP transfer
            try {
              let transferResult = await icpLedger.icrc2_transfer_from({
                from = { owner = user; subaccount = null };
                to = { owner = ctx.canisterPrincipal; subaccount = null };
                amount = totalCost;
                fee = ?transferFee;
                memo = null;
                created_at_time = null;
                spender_subaccount = null;
              });

              switch (transferResult) {
                case (#Err(error)) {
                  let errorMsg = switch (error) {
                    case (#InsufficientAllowance(details)) {
                      "Insufficient ICP allowance. Need " # Nat.toText(totalCost) # " e8s but only " # Nat.toText(details.allowance) # " approved.";
                    };
                    case (#InsufficientFunds(details)) {
                      "Insufficient ICP balance. Need " # Nat.toText(totalCost) # " e8s but only have " # Nat.toText(details.balance) # ".";
                    };
                    case (_) {
                      "ICP payment failed. Please check your balance and approval.";
                    };
                  };
                  return ToolContext.makeError(errorMsg, cb);
                };
                case (#Ok(_blockIndex)) {
                  // Payment successful, perform rebuild
                  let rebuildResult = ctx.garageManager.rebuildBatteryCore(user, batteryId, true);

                  switch (rebuildResult) {
                    case (#ok(result)) {
                      let typeText = switch (battery.batteryType) {
                        case (#ScrapCell) { "ScrapCell" };
                        case (#SalvagePack) { "SalvagePack" };
                        case (#IndustrialBank) { "IndustrialBank" };
                        case (#PlasmaVault) { "PlasmaVault" };
                      };

                      let baseCapacity = PokedBotsGarage.getBaseBatteryCapacity(battery.batteryType);

                      let response = Json.obj([
                        ("message", Json.str("⚡ " # result.message)),
                        ("battery", Json.obj([("id", Json.int(batteryId)), ("type", Json.str(typeText)), ("base_capacity_kwh", Json.float(baseCapacity)), ("new_health_percent", Json.int(100)), ("new_cycles_percent", Json.int(0)), ("stored_kwh", Json.int(0))])),
                        ("cost", Json.obj([("icp_spent_e8s", Json.int(icpCost)), ("transfer_fee_e8s", Json.int(transferFee))])),
                        ("tip", Json.str("Battery core rebuilt! It's now empty - recharge before use.")),
                      ]);

                      return ToolContext.makeSuccess(response, cb);
                    };
                    case (#err(errorMsg)) {
                      return ToolContext.makeError("Rebuild failed after payment: " # errorMsg, cb);
                    };
                  };
                };
              };
            } catch (e) {
              return ToolContext.makeError("ICP transfer failed: " # Error.message(e), cb);
            };
          };
        };
      } else {
        // Parts payment - handled directly by garageManager
        let rebuildResult = ctx.garageManager.rebuildBatteryCore(user, batteryId, false);

        switch (rebuildResult) {
          case (#ok(result)) {
            // Get battery info for response
            let batteryOpt = ctx.garageManager.getBattery(user, batteryId);
            let (typeText, baseCapacity) : (Text, Float) = switch (batteryOpt) {
              case (?b) {
                let t = switch (b.batteryType) {
                  case (#ScrapCell) { "ScrapCell" };
                  case (#SalvagePack) { "SalvagePack" };
                  case (#IndustrialBank) { "IndustrialBank" };
                  case (#PlasmaVault) { "PlasmaVault" };
                };
                (t, PokedBotsGarage.getBaseBatteryCapacity(b.batteryType));
              };
              case (null) { ("Unknown", 0.0) };
            };

            let response = Json.obj([
              ("message", Json.str("⚡ " # result.message)),
              ("battery", Json.obj([("id", Json.int(batteryId)), ("type", Json.str(typeText)), ("base_capacity_kwh", Json.float(baseCapacity)), ("new_health_percent", Json.int(100)), ("new_cycles_percent", Json.int(0)), ("stored_kwh", Json.int(0))])),
              ("cost", Json.obj([("payment_method", Json.str("parts"))])),
              ("tip", Json.str("Battery core rebuilt! It's now empty - recharge before use.")),
            ]);

            return ToolContext.makeSuccess(response, cb);
          };
          case (#err(errorMsg)) {
            return ToolContext.makeError(errorMsg, cb);
          };
        };
      };
    };
  };
};
