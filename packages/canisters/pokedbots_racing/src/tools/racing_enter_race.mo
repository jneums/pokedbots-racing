import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
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
import PokedBotsGarage "../PokedBotsGarage";
import IcpLedger "../IcpLedger";
import ExtIntegration "../ExtIntegration";
import RacingSimulator "../RacingSimulator";

module {
  let TRANSFER_FEE = 10000 : Nat;

  public func config() : McpTypes.Tool = {
    name = "racing_enter_race";
    title = ?"Enter Race";
    description = ?"Enter your PokedBot in a wasteland race. Pays entry fee via ICRC-2. Bot must meet race class requirements based on overall rating (bracket system). ELO represents skill within bracket. Bots can race while upgrading or scavenging.\n\n**ENTRY FEES:**\n• Entry fees are paid via ICRC-2 approval when you register\n• If a race is cancelled due to insufficient entries, your entry fee will be automatically refunded\n• Refunds are processed shortly after the race is cancelled\n\n**SCAVENGING BOTS:** You can register for races while your bot is on a scavenging mission. When the race starts, your bot will be pulled from the mission with penalties:\n• Partial parts awarded based on progress (with 50% early withdrawal penalty)\n• Condition damage scales with mission type and progress (minimum 50% of full penalty)\n• Penalties applied at race start time, not at registration\n• WARNING: Starting long missions just to pull out early is NOT profitable due to harsh penalties\n\n**RACE COSTS (Applied after completion):**\n• Battery Drain: Base 10-20 (distance) × terrain (1.0-1.2×) × Power Core efficiency × condition penalty\n• Condition Wear: Base 3-7 (distance) × terrain (1.0-1.5×)\n  - All racers pay the same wear cost regardless of finishing position\n\n**WARNING:** Low battery/condition severely reduces stats and can cause DNF (no prize). Check bot condition before entering.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("race_id", Json.obj([("type", Json.str("number")), ("description", Json.str("The race ID to enter"))])), ("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("Your PokedBot's token index"))]))])),
      ("required", Json.arr([Json.str("race_id"), Json.str("token_index")])),
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
      let raceId = switch (Result.toOption(Json.getAsNat(_args, "race_id"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: race_id", cb);
        };
        case (?id) { id };
      };

      let tokenIndex = switch (Result.toOption(Json.getAsNat(_args, "token_index"))) {
        case (null) {
          return ToolContext.makeError("Missing required argument: token_index", cb);
        };
        case (?idx) { idx };
      };

      // Get race
      let race = switch (ctx.raceManager.getRace(raceId)) {
        case (null) {
          return ToolContext.makeError("Race not found", cb);
        };
        case (?r) { r };
      };

      let now = Time.now();

      // Check if registration is open for this race's event
      switch (ctx.checkRegistrationWindow(raceId, now)) {
        case (#err(msg)) {
          return ToolContext.makeError(msg, cb);
        };
        case (#ok()) {};
      };

      // Get bot stats and verify registered owner
      var botStats = switch (ctx.garageManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("This PokedBot is not initialized for racing. Use garage_initialize_pokedbot first to register it.", cb);
        };
        case (?stats) {
          // Verify caller is the registered owner
          if (not Principal.equal(stats.ownerPrincipal, user)) {
            return ToolContext.makeError("This PokedBot is registered to a different owner. Please use garage_initialize_pokedbot to register it to your account.", cb);
          };

          // If bot has active scavenging mission, lazily accumulate rewards to get current condition/battery
          switch (stats.activeMission) {
            case (?_mission) {
              // Accumulate rewards on-demand before checking race eligibility
              ignore ctx.garageManager.accumulateScavengingRewards(tokenIndex, now);
              // Re-fetch stats after accumulation
              switch (ctx.garageManager.getStats(tokenIndex)) {
                case (?updatedStats) { updatedStats };
                case (null) { stats }; // Shouldn't happen, but fallback to original
              };
            };
            case (null) { stats };
          };
        };
      };

      // Allow race entry even if bot is scavenging - they'll be pulled when race starts
      // No need to check or pull from scavenging here

      // Check if race is accepting entries
      switch (race.status) {
        case (#Upcoming) {};
        case (#InProgress) {
          return ToolContext.makeError("Race has already started", cb);
        };
        case (#Completed) {
          return ToolContext.makeError("Race has finished", cb);
        };
        case (#Cancelled) {
          return ToolContext.makeError("Race was cancelled", cb);
        };
      };

      // Check entry deadline
      if (now >= race.entryDeadline) {
        return ToolContext.makeError("Entry deadline has passed", cb);
      };

      // Convert tokenIndex to nftId text
      let nftId = Nat.toText(tokenIndex);

      // Check if race is full
      if (race.entries.size() >= race.maxEntries) {
        return ToolContext.makeError("Race is full", cb);
      };

      // Check if bot is already entered in any race within this event
      switch (ctx.checkBotInEvent(raceId, nftId)) {
        case (#err(msg)) {
          return ToolContext.makeError(msg, cb);
        };
        case (#ok()) {};
      };

      // Check class requirements (rating-based)
      let rating = ctx.garageManager.calculateRatingAt100(botStats);
      let meetsClass = switch (race.raceClass) {
        case (#Scrap) { rating < 20 };
        case (#Junker) {
          rating >= 20 and rating < 30
        };
        case (#Raider) {
          rating >= 30 and rating < 40
        };
        case (#Elite) {
          rating >= 40 and rating < 50
        };
        case (#SilentKlan) {
          rating >= 50;
        };
      };

      if (not meetsClass) {
        return ToolContext.makeError("Bot does not meet race class requirements", cb);
      };

      // Process payment using ICRC-2 transfer_from
      let ledgerCanisterId = switch (ctx.icpLedgerCanisterId()) {
        case (?id) { id };
        case (null) {
          return ToolContext.makeError("ICP Ledger not configured", cb);
        };
      };
      let icpLedger = actor (Principal.toText(ledgerCanisterId)) : actor {
        icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
      };

      try {
        let transferResult = await icpLedger.icrc2_transfer_from({
          from = { owner = user; subaccount = null };
          to = { owner = ctx.canisterPrincipal; subaccount = null };
          amount = race.entryFee;
          fee = null;
          memo = null;
          created_at_time = null;
          spender_subaccount = null;
        });

        switch (transferResult) {
          case (#Err(error)) {
            let errorMsg = switch (error) {
              case (#InsufficientAllowance { allowance }) {
                "Insufficient ICRC-2 allowance. Approved: " # Nat.toText(allowance) # " e8s, needed: " # Nat.toText(race.entryFee + TRANSFER_FEE) # " e8s";
              };
              case (#InsufficientFunds { balance }) {
                "Insufficient ICP balance: " # Nat.toText(balance) # " e8s";
              };
              case (_) { "Payment failed" };
            };
            return ToolContext.makeError(errorMsg, cb);
          };
          case (#Ok(_blockIndex)) {
            // Payment successful, enter the race
            switch (ctx.raceManager.enterRace(raceId, nftId, user, now)) {
              case (?updatedRace) {
                // Record dedication points for race entry fee (ICP investment)
                ctx.dedicationManager.recordRaceEntry(tokenIndex, race.entryFee, now);

                // Update last raced time (battery drain happens after race completes)
                let updatedStats = {
                  botStats with
                  lastRaced = ?now;
                };
                ctx.garageManager.updateStats(tokenIndex, updatedStats);

                let classText = switch (race.raceClass) {
                  case (#Scrap) { "Scrap" };
                  case (#Junker) { "Junker" };
                  case (#Raider) { "Raider" };
                  case (#Elite) { "Elite" };
                  case (#SilentKlan) { "Silent Klan Invitational" };
                };

                let timeUntilStart = race.startTime - now;
                let hoursUntilStart = timeUntilStart / 3_600_000_000_000;
                let minutesUntilStart = (timeUntilStart % 3_600_000_000_000) / 60_000_000_000;

                // Build wasteland message - check if bot is on a scavenging mission
                let wastelandMsg = switch (botStats.activeMission) {
                  case (?mission) {
                    "⚡ Race entry confirmed! Your bot will be pulled from their scavenging mission when the race starts (with penalties based on progress).";
                  };
                  case (null) {
                    "⚡ Your bot heads to the starting line. The wasteland awaits...";
                  };
                };

                let response = Json.obj([
                  ("message", Json.str("🏁 **RACE ENTRY CONFIRMED**")),
                  ("race_id", Json.int(raceId)),
                  ("race_name", Json.str(race.name)),
                  ("race_class", Json.str(classText)),
                  ("your_position", Json.int(updatedRace.entries.size())),
                  ("total_entries", Json.int(updatedRace.entries.size())),
                  ("max_entries", Json.int(race.maxEntries)),
                  ("entry_fee_paid_icp", Json.str(Text.concat("0.", Nat.toText(race.entryFee / 100000)))),
                  ("current_prize_pool_icp", Json.str(Text.concat("0.", Nat.toText((updatedRace.prizePool + updatedRace.platformBonus) / 100000)))),
                  ("starts_in_hours", Json.int(hoursUntilStart)),
                  ("starts_in_minutes", Json.int(minutesUntilStart)),
                  ("battery_remaining", Json.int(botStats.battery)),
                  ("wasteland_message", Json.str(wastelandMsg)),
                ]);

                ToolContext.makeSuccess(response, cb);
              };
              case (null) {
                return ToolContext.makeError("Failed to enter race - bot may already be entered, race may be full, or entry deadline has passed", cb);
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
