import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Error "mo:base/Error";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";
import IcpLedger "../IcpLedger";
import ExtIntegration "../ExtIntegration";

module {
  let REPAIR_COST = 5000000 : Nat; // 0.05 ICP (reduced for testing)
  let TRANSFER_FEE = 10000 : Nat;
  let REPAIR_COOLDOWN : Int = 43200000000000; // 12 hours in nanoseconds

  public func config() : McpTypes.Tool = {
    name = "garage_repair_robot";
    title = ?"Repair Robot";
    description = ?"Repair a robot to restore condition. Costs 5 ICP + 0.0001 ICP transfer fee. Restores 10 Condition. Cooldown: 12 hours.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot to repair"))]))])),
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
      let user = switch (_auth) {
        case (null) {
          return ToolContext.makeError("Authentication required", cb);
        };
        case (?auth) { auth.principal };
      };

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
      let racingStats = switch (ctx.garageManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("This PokedBot is not initialized for racing. Use garage_initialize_pokedbot first.", cb);
        };
        case (?stats) { stats };
      };

      let now = Time.now();
      switch (racingStats.lastRepaired) {
        case (?lastTime) {
          if (now - lastTime < REPAIR_COOLDOWN) {
            return ToolContext.makeError("Repair cooldown active", cb);
          };
        };
        case (null) {};
      };

      let icpLedger = actor ("ryjl3-tyaaa-aaaaa-aaaba-cai") : actor {
        icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
      };
      let totalCost = REPAIR_COST + TRANSFER_FEE;

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
            return ToolContext.makeError("Payment failed", cb);
          };
          case (#Ok(blockIndex)) {
            let updatedStats = {
              racingStats with
              condition = Nat.min(100, racingStats.condition + 10);
              lastRepaired = ?now;
            };

            ctx.garageManager.updateStats(tokenIndex, updatedStats);

            let response = Json.obj([
              ("token_index", Json.int(tokenIndex)),
              ("action", Json.str("Repair")),
              ("condition_restored", Json.int(10)),
              ("new_condition", Json.int(updatedStats.condition)),
              ("message", Json.str("Repairs complete")),
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
