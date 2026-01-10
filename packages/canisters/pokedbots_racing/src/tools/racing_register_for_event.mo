import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Error "mo:base/Error";
import Blob "mo:base/Blob";
import Nat64 "mo:base/Nat64";
import Array "mo:base/Array";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import RaceCalendar "../RaceCalendar";
import IcpLedger "../IcpLedger";

module {
  let TRANSFER_FEE = 10000 : Nat;

  public func config() : McpTypes.Tool = {
    name = "racing_register_for_event";
    title = ?"Register for Event";
    description = ?"Register your PokedBot for an upcoming racing event. Entry fee is paid upfront via ICRC-2. After registration closes, races will be created automatically with registered participants split into heats.\n\n**EVENT REGISTRATION SYSTEM:**\n• Register for the EVENT, not individual races\n• After registration closes, system creates races from registered bots\n• Bots are split into heats of max 8 players using configured allocation strategy\n• Races are pre-populated with entries - no separate race registration needed\n\n**CANCELLATION POLICY:**\n• Full refund (100%): Cancel before early cancellation deadline\n• Half refund (50%): Cancel before regular cancellation deadline\n• Quarter refund (25%): Cancel before final cancellation deadline\n• No refund (0%): After final cancellation deadline\n\n**ENTRY FEES:**\n• Paid at registration time via ICRC-2 approval\n• Class-based multipliers: Scrap 0.5×, Junker 1×, Raider 1.5×, Elite 2×, SilentKlan 2.5×\n• Refunded if event is cancelled by platform\n\n**BLIND REGISTRATION:**\n• Some events hide participant lists until registration closes\n• Creates more strategic/fair competition";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([
        ("event_id", Json.obj([
          ("type", Json.str("number")),
          ("description", Json.str("The event ID to register for")),
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

      // Get event
      let event = switch (ctx.eventCalendar.getEvent(eventId)) {
        case (null) {
          return ToolContext.makeError("Event not found", cb);
        };
        case (?e) { e };
      };

      let now = Time.now();

      // Get bot stats and verify ownership
      let botStats = switch (ctx.garageManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("This PokedBot is not initialized for racing. Use garage_initialize_pokedbot first.", cb);
        };
        case (?stats) {
          if (not Principal.equal(stats.ownerPrincipal, user)) {
            return ToolContext.makeError("This PokedBot is registered to a different owner.", cb);
          };
          stats;
        };
      };

      // Calculate overall rating
      let currentStats = ctx.garageManager.getCurrentStats(botStats);
      let overallRating = (currentStats.speed + currentStats.powerCore + currentStats.acceleration + currentStats.stability) / 4;

      // Determine race class from overall rating (bracket system)
      let raceClass : RaceCalendar.RaceClass = if (overallRating < 30) {
        #Scrap;
      } else if (overallRating < 50) {
        #Junker;
      } else if (overallRating < 70) {
        #Raider;
      } else if (overallRating < 90) {
        #Elite;
      } else {
        #SilentKlan;
      };

      // Calculate class-based entry fee
      let classFeeMultiplier : Float = switch (raceClass) {
        case (#Scrap) { 0.5 };
        case (#Junker) { 1.0 };
        case (#Raider) { 1.5 };
        case (#Elite) { 2.0 };
        case (#SilentKlan) { 2.5 };
      };
      let adjustedEntryFee = Int.abs(Float.toInt(Float.fromInt(event.metadata.entryFee) * classFeeMultiplier));

      // Process ICRC-2 payment
      let nftId = Nat.toText(tokenIndex);
      // User pays from their default subaccount (not bot-specific garage)
      let userAccount = { owner = user; subaccount = null };

      // Get ICP Ledger actor
      let ledgerCanisterId = switch (ctx.icpLedgerCanisterId()) {
        case (null) {
          return ToolContext.makeError("ICP Ledger not configured", cb);
        };
        case (?id) { id };
      };

      let icpLedger = actor (Principal.toText(ledgerCanisterId)) : actor {
        icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
      };

      try {
        // Transfer payment from user to racing canister treasury (default subaccount)
        let transferFromArgs = {
          spender_subaccount = null;
          from = userAccount;
          to = {
            owner = ctx.canisterPrincipal;
            subaccount = null; // Treasury uses default subaccount
          };
          amount = adjustedEntryFee;
          fee = ?TRANSFER_FEE;
          memo = ?Blob.fromArray([]);
          created_at_time = ?Nat64.fromNat(Int.abs(now));
        };

        let transferResult = await icpLedger.icrc2_transfer_from(transferFromArgs);

        switch (transferResult) {
          case (#Err(error)) {
            let errorMsg = switch (error) {
              case (#InsufficientFunds { balance }) {
                "Insufficient ICP balance: " # Nat.toText(balance) # " e8s";
              };
              case (_) { "Payment failed" };
            };
            return ToolContext.makeError(errorMsg, cb);
          };
          case (#Ok(_blockIndex)) {
            // Payment successful, register for event
            switch (ctx.eventCalendar.registerForEvent(eventId, tokenIndex, user, raceClass, adjustedEntryFee, now)) {
              case (#err(msg)) {
                // Registration failed - need to refund
                // TODO: Implement refund logic
                return ToolContext.makeError("Registration failed: " # msg, cb);
              };
              case (#ok(registration)) {
                let classText = switch (raceClass) {
                  case (#Scrap) { "Scrap" };
                  case (#Junker) { "Junker" };
                  case (#Raider) { "Raider" };
                  case (#Elite) { "Elite" };
                  case (#SilentKlan) { "Silent Klan" };
                };

                let stats = switch (ctx.eventCalendar.getEventRegistrationStats(eventId)) {
                  case (?s) { s };
                  case (null) { 
                    return ToolContext.makeError("Failed to get registration stats", cb);
                  };
                };
                let timeUntilEvent = event.scheduledTime - now;
                let hoursUntilEvent = timeUntilEvent / 3_600_000_000_000;

                // Calculate refund deadlines
                let fullRefundHours = (event.cancellationDeadlines.fullRefund - now) / 3_600_000_000_000;
                let halfRefundHours = (event.cancellationDeadlines.halfRefund - now) / 3_600_000_000_000;
                let quarterRefundHours = (event.cancellationDeadlines.quarterRefund - now) / 3_600_000_000_000;

                // Find registrations for this class
                let classRegistrations = switch (Array.find<(RaceCalendar.RaceClass, Nat)>(
                  stats.byClass,
                  func((c, _) : (RaceCalendar.RaceClass, Nat)) : Bool { c == raceClass }
                )) {
                  case (?(_, count)) { count };
                  case (null) { 0 };
                };

                let response = Json.obj([
                  ("message", Json.str("✅ **EVENT REGISTRATION CONFIRMED**")),
                  ("event_id", Json.int(eventId)),
                  ("event_name", Json.str(event.metadata.name)),
                  ("your_class", Json.str(classText)),
                  ("entry_fee_paid_icp", Json.str(Text.concat("0.", Nat.toText(adjustedEntryFee / 100000)))),
                  ("total_registrations", Json.int(stats.total)),
                  ("registrations_in_your_class", Json.int(classRegistrations)),
                  ("event_starts_in_hours", Json.int(Int.abs(hoursUntilEvent))),
                  ("cancellation_policy", Json.str("100% refund before " # Int.toText(fullRefundHours) # "h, 50% before " # Int.toText(halfRefundHours) # "h, 25% before " # Int.toText(quarterRefundHours) # "h")),
                  ("info", Json.str("Races will be created automatically after registration closes. You'll be placed in a heat with other " # classText # " class bots.")),
                ]);

                ToolContext.makeSuccess(response, cb);
              };
            };
          };
        };
      } catch (e) {
        return ToolContext.makeError("Payment failed: " # Error.message(e), cb);
      };
    };
  };
};
