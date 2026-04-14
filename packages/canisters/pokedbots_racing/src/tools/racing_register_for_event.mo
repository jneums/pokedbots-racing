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
import RacingSimulator "../RacingSimulator";

module {
  let TRANSFER_FEE = 10000 : Nat;

  public func config() : McpTypes.Tool = {
    name = "racing_register_for_event";
    title = ?"Register for Event";
    description = ?"Register your PokedBot for an upcoming racing event. Entry fee is paid upfront via ICRC-2. After registration closes, races will be created automatically with registered participants split into heats.\n\n**EVENT REGISTRATION SYSTEM:**\n• Register for the EVENT, not individual races\n• After registration closes, system creates races from registered bots\n• Bots are split into heats of max 8 players using configured allocation strategy\n• Races are pre-populated with entries - no separate race registration needed\n\n**CANCELLATION POLICY:**\n• Full refund (100%): Cancel before early cancellation deadline\n• Half refund (50%): Cancel before regular cancellation deadline\n• Quarter refund (25%): Cancel before final cancellation deadline\n• No refund (0%): After final cancellation deadline\n\n**ENTRY FEES:**\n• Paid at registration time via ICRC-2 approval\n• Class-based multipliers: Scrap 0.5×, Junker 1×, Raider 1.5×, Elite 2×, SilentKlan 2.5×\n• Refunded if event is cancelled by platform\n\n**BLIND REGISTRATION:**\n• Some events hide participant lists until registration closes\n• Creates more strategic/fair competition";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("event_id", Json.obj([("type", Json.str("number")), ("description", Json.str("The event ID to register for"))])), ("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("Your PokedBot's token index"))])), ("skip_if_registered", Json.obj([("type", Json.str("boolean")), ("description", Json.str("Optional: If true, returns success with registration details when bot is already registered instead of an error. Useful for automation fire-and-forget patterns."))]))])),
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

      // Track this method call
      ctx.trackMethodCall("racing_register_for_event", user);

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

      let skipIfRegistered = switch (Result.toOption(Json.getAsBool(_args, "skip_if_registered"))) {
        case (?b) { b };
        case (null) { false };
      };

      // Get event
      let event = switch (ctx.eventCalendar.getEvent(eventId)) {
        case (null) {
          return ToolContext.makeStructuredError("EVENT_NOT_FOUND", "Event not found", false, [("event_id", Json.int(eventId))], cb);
        };
        case (?e) { e };
      };

      let now = Time.now();

      // Idempotent registration check - if skip_if_registered is true,
      // return success with existing registration details instead of erroring
      if (skipIfRegistered) {
        let existingReg = Array.find<RaceCalendar.EventRegistration>(
          event.registrations,
          func(reg : RaceCalendar.EventRegistration) : Bool {
            reg.tokenIndex == tokenIndex and Principal.equal(reg.owner, user);
          },
        );
        switch (existingReg) {
          case (?reg) {
            let classText = switch (reg.raceClass) {
              case (#Scrap) { "Scrap" };
              case (#Junker) { "Junker" };
              case (#Raider) { "Raider" };
              case (#Elite) { "Elite" };
              case (#SilentKlan) { "Silent Klan" };
            };
            let response = Json.obj([
              ("already_registered", Json.bool(true)),
              ("message", Json.str("✅ Bot #" # Nat.toText(tokenIndex) # " is already registered for event #" # Nat.toText(eventId))),
              ("event_id", Json.int(eventId)),
              ("event_name", Json.str(event.metadata.name)),
              ("token_index", Json.int(tokenIndex)),
              ("race_class", Json.str(classText)),
              ("registered_at", Json.int(reg.registeredAt)),
              ("entry_fee_paid_e8s", Json.int(reg.entryFeePaid)),
            ]);
            return ToolContext.makeSuccess(response, cb);
          };
          case (null) {}; // Not registered, continue with normal flow
        };
      };

      // Get bot stats and verify ownership
      let botStats = switch (ctx.garageManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeStructuredError("NOT_INITIALIZED", "This PokedBot is not initialized for racing. Use garage_initialize_pokedbot first.", false, [("token_index", Json.int(tokenIndex))], cb);
        };
        case (?stats) {
          if (not Principal.equal(stats.ownerPrincipal, user)) {
            return ToolContext.makeStructuredError("NOT_OWNER", "This PokedBot is registered to a different owner.", false, [("token_index", Json.int(tokenIndex))], cb);
          };
          stats;
        };
      };

      // Calculate overall rating using unbuffed stats (base + upgrades only)
      // This ensures race class is determined by permanent stats, not temporary buffs like garage auras
      let overallRating = ctx.garageManager.calculateRatingAt100(botStats);

      // Determine race class from overall rating (bracket system)
      // Rating brackets: Scrap <20, Junker 20-29, Raider 30-39, Elite 40-49, SilentKlan 50+
      let raceClass : RaceCalendar.RaceClass = if (overallRating < 20) {
        #Scrap;
      } else if (overallRating < 30) {
        #Junker;
      } else if (overallRating < 40) {
        #Raider;
      } else if (overallRating < 50) {
        #Elite;
      } else {
        #SilentKlan;
      };

      // Calculate class-based entry fee (shifted up one bracket)
      let classFeeMultiplier : Float = switch (raceClass) {
        case (#Scrap) { 1.0 };
        case (#Junker) { 1.5 };
        case (#Raider) { 2.0 };
        case (#Elite) { 2.5 };
        case (#SilentKlan) { 3.0 };
      };
      let adjustedEntryFee = Int.abs(Float.toInt(Float.fromInt(event.metadata.entryFee) * classFeeMultiplier));

      // Check if bot is already entered in any race within this event BEFORE taking payment
      let eventRaces = event.raceIds;
      for (eventRaceId in eventRaces.vals()) {
        let maybeRace = ctx.raceManager.getRace(eventRaceId);
        switch (maybeRace) {
          case (?race) {
            let tokenIndexText = Nat.toText(tokenIndex);
            let isAlreadyEntered = Array.find<RacingSimulator.RaceEntry>(
              race.entries,
              func(entry : RacingSimulator.RaceEntry) : Bool {
                entry.nftId == tokenIndexText;
              },
            );
            switch (isAlreadyEntered) {
              case (?_) {
                return ToolContext.makeStructuredError("ALREADY_REGISTERED", "This bot is already entered in another race in this event (Race #" # Nat.toText(eventRaceId) # ")", false, [("event_id", Json.int(eventId)), ("race_id", Json.int(eventRaceId)), ("token_index", Json.int(tokenIndex))], cb);
              };
              case (null) {};
            };
          };
          case (null) {};
        };
      };

      // Check if bot is registered for another event with conflicting race times
      switch (ctx.eventCalendar.getConflictingEventForBot(eventId, tokenIndex, event.scheduledTime, event.raceCreationMode)) {
        case (?conflictingEvent) {
          let conflictName = conflictingEvent.metadata.name;
          return ToolContext.makeStructuredError("EVENT_CONFLICT", "This bot is already registered for \"" # conflictName # "\" which has a race at a conflicting time", false, [("event_id", Json.int(eventId)), ("token_index", Json.int(tokenIndex))], cb);
        };
        case (null) {}; // No conflict
      };

      // Process ICRC-2 payment
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
                // Registration failed - refund the payment
                let refundLedger = actor (Principal.toText(ledgerCanisterId)) : actor {
                  icrc1_transfer : shared IcpLedger.TransferArg -> async IcpLedger.Result;
                };

                let refundAmount = if (adjustedEntryFee > TRANSFER_FEE) {
                  adjustedEntryFee - TRANSFER_FEE; // Deduct one transfer fee from refund
                } else {
                  adjustedEntryFee; // Refund full amount even if small
                };

                try {
                  let refundResult = await refundLedger.icrc1_transfer({
                    from_subaccount = null;
                    to = { owner = user; subaccount = null };
                    amount = refundAmount;
                    fee = ?TRANSFER_FEE;
                    memo = null;
                    created_at_time = null;
                  });

                  switch (refundResult) {
                    case (#Ok(_)) {
                      return ToolContext.makeError("Registration failed (refunded " # Nat.toText(refundAmount) # " e8s): " # msg, cb);
                    };
                    case (#Err(refundErr)) {
                      // Critical: Payment taken but refund failed
                      return ToolContext.makeError("Registration failed AND refund failed. Please contact support. Event ID: " # Nat.toText(eventId) # ", Amount: " # Nat.toText(adjustedEntryFee) # " e8s. Error: " # debug_show (refundErr), cb);
                    };
                  };
                } catch (_refundError) {
                  // Critical: Payment taken but refund failed
                  return ToolContext.makeError("Registration failed AND refund failed. Please contact support. Event ID: " # Nat.toText(eventId) # ", Amount: " # Nat.toText(adjustedEntryFee) # " e8s", cb);
                };
              };
              case (#ok(_registration)) {
                // MCP tools do not record dedication points (rewards manual play)

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
                let classRegistrations = switch (
                  Array.find<(RaceCalendar.RaceClass, Nat)>(
                    stats.byClass,
                    func((c, _) : (RaceCalendar.RaceClass, Nat)) : Bool {
                      c == raceClass;
                    },
                  )
                ) {
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
