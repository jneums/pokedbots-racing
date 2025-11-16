import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Error "mo:base/Error";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import Racing "../Racing";
import IcpLedger "../IcpLedger";
import ExtIntegration "../ExtIntegration";

module {
  // Recharge cost: 0.1 ICP + 0.0001 ICP fee (reduced for testing)
  let RECHARGE_COST = 10000000 : Nat; // 0.1 ICP in e8s
  let TRANSFER_FEE = 10000 : Nat; // 0.0001 ICP in e8s
  let RECHARGE_COOLDOWN : Int = 21600000000000; // 6 hours in nanoseconds

  public func config() : McpTypes.Tool = {
    name = "garage_recharge_robot";
    title = ?"Recharge Robot";
    description = ?"Recharge a robot to restore condition and battery. Costs 10 ICP + 0.0001 ICP transfer fee. Restores 20 Condition and 10 Battery. Cooldown: 6 hours. Requires ICRC-2 approval.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot to recharge"))]))])),
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
        case (?idx) { idx };
      };

      // Verify ownership via EXT (source of truth)
      let garageSubaccount = ExtIntegration.deriveGarageSubaccount(user);
      let garageAccountId = ExtIntegration.principalToAccountIdentifier(ctx.canisterPrincipal, ?garageSubaccount);
      let ownerResult = try {
        await ctx.extCanister.bearer(ExtIntegration.encodeTokenIdentifier(Nat32.fromNat(tokenIndex), ctx.extCanisterId));
      } catch (_) {
        return ToolContext.makeError("Failed to verify ownership", cb);
      };
      switch (ownerResult) {
        case (#err(_)) {
          return ToolContext.makeError("This PokedBot does not exist.", cb);
        };
        case (#ok(currentOwner)) {
          if (currentOwner != garageAccountId) {
            return ToolContext.makeError("You do not own this PokedBot.", cb);
          };
        };
      };

      // Get racing stats
      let racingStats = switch (ctx.racingStatsManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("This PokedBot is not initialized for racing. Use garage_initialize_pokedbot first.", cb);
        };
        case (?stats) { stats };
      };

      // Check cooldown
      let now = Time.now();
      switch (racingStats.lastRecharged) {
        case (?lastTime) {
          let timeSince = now - lastTime;
          if (timeSince < RECHARGE_COOLDOWN) {
            let hoursLeft = (RECHARGE_COOLDOWN - timeSince) / (60 * 60 * 1_000_000_000);
            return ToolContext.makeError("Recharge cooldown active. Hours remaining: " # Nat.toText(Int.abs(hoursLeft)), cb);
          };
        };
        case (null) {};
      };

      // Pull payment via ICRC-2
      let icpLedger = actor ("ryjl3-tyaaa-aaaaa-aaaba-cai") : actor {
        icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
      };
      let totalCost = RECHARGE_COST + TRANSFER_FEE;

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
            let errorMsg = switch (error) {
              case (#InsufficientFunds { balance }) {
                "Insufficient funds. Balance: " # Nat.toText(balance) # " e8s, Required: " # Nat.toText(totalCost) # " e8s";
              };
              case (#InsufficientAllowance { allowance }) {
                "Insufficient ICRC-2 allowance. Current: " # Nat.toText(allowance) # " e8s, Required: " # Nat.toText(totalCost) # " e8s. Please approve the canister first.";
              };
              case (#BadFee { expected_fee }) {
                "Bad fee. Expected: " # Nat.toText(expected_fee) # " e8s";
              };
              case _ { "Transfer failed" };
            };
            return ToolContext.makeError(errorMsg, cb);
          };
          case (#Ok(blockIndex)) {
            // Payment successful, update stats
            let conditionRestored = Nat.min(20, 100 - racingStats.condition);
            let batteryRestored = Nat.min(10, 100 - racingStats.battery);

            let updatedStats = {
              racingStats with
              condition = Nat.min(100, racingStats.condition + 20);
              battery = Nat.min(100, racingStats.battery + 10);
              lastRecharged = ?now;
            };

            ctx.racingStatsManager.updateStats(tokenIndex, updatedStats);

            let response = Json.obj([
              ("token_index", Json.int(tokenIndex)),
              ("action", Json.str("Recharge")),
              ("payment", Json.obj([("amount", Json.str("0.1 ICP")), ("fee", Json.str("0.0001 ICP")), ("total", Json.str("0.1001 ICP")), ("block_index", Json.int(blockIndex))])),
              ("condition_restored", Json.int(conditionRestored)),
              ("battery_restored", Json.int(batteryRestored)),
              ("new_condition", Json.int(updatedStats.condition)),
              ("new_battery", Json.int(updatedStats.battery)),
              ("next_available_hours", Json.int(6)),
              ("message", Json.str("Power cells recharged. Systems nominal.")),
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
