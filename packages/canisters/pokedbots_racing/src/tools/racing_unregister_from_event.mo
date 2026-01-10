import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Error "mo:base/Error";
import Blob "mo:base/Blob";
import Nat64 "mo:base/Nat64";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import IcpLedger "../IcpLedger";

module {
  let TRANSFER_FEE = 10000 : Nat;

  public func config() : McpTypes.Tool = {
    name = "racing_unregister_from_event";
    title = ?"Unregister from Event";
    description = ?"Cancel your event registration and receive a refund based on how early you cancel.\n\n**CANCELLATION POLICY:**\n• Full refund (100%): Cancel before early cancellation deadline\n• Half refund (50%): Cancel before regular cancellation deadline\n• Quarter refund (25%): Cancel before final cancellation deadline\n• No refund (0%): After final cancellation deadline or after registration closes\n\n**REFUND PROCESS:**\n• Refunds are sent back to your bot's garage subaccount\n• Transfer fee (0.0001 ICP) is deducted from refund\n• Cancellation after registration closes is not allowed";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([
        ("event_id", Json.obj([
          ("type", Json.str("number")),
          ("description", Json.str("The event ID to unregister from")),
        ])),
        ("token_index", Json.obj([
          ("type", Json.str("number")),
          ("description", Json.str("Your PokedBot's token index")),
        ])),
      ])),
      ("required", Json.arr([Json.str("event_id"), Json.str("token_index")])),
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

      // Parse arguments
      let eventId = switch (Result.toOption(Json.getAsNat(_args, "event_id"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: event_id", cb);
        };
        case (?id) { id };
      };

      let tokenIndex = switch (Result.toOption(Json.getAsNat(_args, "token_index"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: token_index", cb);
        };
        case (?idx) { idx };
      };

      // Verify ownership
      let botStats = switch (ctx.garageManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("Bot not found", cb);
        };
        case (?stats) {
          if (not Principal.equal(stats.ownerPrincipal, user)) {
            return ToolContext.makeError("You don't own this bot", cb);
          };
          stats;
        };
      };

      let now = Time.now();

      // Unregister from event (this calculates the refund amount)
      switch (ctx.eventCalendar.unregisterFromEvent(eventId, tokenIndex, user, now)) {
        case (#err(msg)) {
          return ToolContext.makeError("Unregistration failed: " # msg, cb);
        };
        case (#ok(refundAmount)) {
          // Process refund if amount > 0
          if (refundAmount > 0) {
            // Get ICP Ledger actor
            let ledgerCanisterId = switch (ctx.icpLedgerCanisterId()) {
              case (null) {
                return ToolContext.makeError("ICP Ledger not configured", cb);
              };
              case (?id) { id };
            };

            let icpLedger = actor (Principal.toText(ledgerCanisterId)) : actor {
              icrc1_transfer : shared IcpLedger.TransferArg -> async IcpLedger.Result_3;
            };

            try {
              // Refund to user's default subaccount
              let userAccount = { owner = user; subaccount = null };

              // Calculate net refund after transfer fee
              let netRefund = if (refundAmount > TRANSFER_FEE) {
                refundAmount - TRANSFER_FEE;
              } else {
                0; // Refund too small to cover transfer fee
              };

              if (netRefund == 0) {
                let response = Json.obj([
                  ("message", Json.str("✅ **UNREGISTRATION SUCCESSFUL**")),
                  ("event_id", Json.int(eventId)),
                  ("refund_amount_icp", Json.str("0.00")),
                  ("info", Json.str("Refund too small to cover transfer fee")),
                ]);
                return ToolContext.makeSuccess(response, cb);
              };

              // Transfer refund from treasury (default subaccount) to user
              let transferArgs = {
                from_subaccount = null; // Treasury uses default subaccount
                to = userAccount;
                amount = netRefund;
                fee = ?TRANSFER_FEE;
                memo = ?Blob.fromArray([]);
                created_at_time = ?Nat64.fromNat(Int.abs(now));
              };

              let transferResult = await icpLedger.icrc1_transfer(transferArgs);

              switch (transferResult) {
                case (#Err(error)) {
                  // Refund failed - should not happen but log it
                  return ToolContext.makeError("Unregistration succeeded but refund failed: " # debug_show (error), cb);
                };
                case (#Ok(_blockIndex)) {
                  // Success!
                  let refundIcp = Text.concat("0.", Nat.toText(refundAmount / 100000));
                  let netRefundIcp = Text.concat("0.", Nat.toText(netRefund / 100000));

                  let response = Json.obj([
                    ("message", Json.str("✅ **UNREGISTRATION SUCCESSFUL**")),
                    ("event_id", Json.int(eventId)),
                    ("refund_amount_icp", Json.str(refundIcp)),
                    ("net_refund_icp", Json.str(netRefundIcp # " (after 0.0001 ICP transfer fee)")),
                    ("info", Json.str("Refund sent to your account")),
                  ]);

                  ToolContext.makeSuccess(response, cb);
                };
              };
            } catch (e) {
              return ToolContext.makeError("Unregistration succeeded but refund failed: " # Error.message(e), cb);
            };
          } else {
            // No refund (cancelled too late)
            let response = Json.obj([
              ("message", Json.str("✅ **UNREGISTRATION SUCCESSFUL**")),
              ("event_id", Json.int(eventId)),
              ("refund_amount_icp", Json.str("0.00")),
              ("info", Json.str("No refund - cancellation deadline has passed")),
            ]);

            ToolContext.makeSuccess(response, cb);
          };
        };
      };
    };
  };
};
