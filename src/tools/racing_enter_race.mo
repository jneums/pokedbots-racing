import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
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

module {
  let TRANSFER_FEE = 10000 : Nat;

  public func config() : McpTypes.Tool = {
    name = "racing_enter_race";
    title = ?"Enter Race";
    description = ?"Enter your PokedBot in a wasteland race. Pays entry fee via ICRC-2. Bot must meet race requirements (condition ≥70, battery ≥50, correct class). Battery drains by 10 per race.";
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

      // Get bot stats
      let botStats = switch (ctx.racingStatsManager.getStats(tokenIndex)) {
        case (null) {
          return ToolContext.makeError("Bot not initialized for racing. Use garage_initialize_pokedbot first.", cb);
        };
        case (?stats) { stats };
      };

      // Verify ownership
      if (not Principal.equal(botStats.ownerPrincipal, user)) {
        return ToolContext.makeError("You do not own this PokedBot", cb);
      };

      let now = Time.now();

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

      // Check if race is full
      if (race.entries.size() >= race.maxEntries) {
        return ToolContext.makeError("Race is full", cb);
      };

      // Check if already entered
      for (entry in race.entries.vals()) {
        if (entry.tokenIndex == tokenIndex) {
          return ToolContext.makeError("Bot already entered in this race", cb);
        };
      };

      // Check if bot has upgrade in progress
      switch (botStats.upgradeEndsAt) {
        case (?endsAt) {
          if (now < endsAt) {
            return ToolContext.makeError("Bot is currently being upgraded. Wait for upgrade to complete before racing.", cb);
          };
        };
        case (null) {};
      };

      // Check if bot is listed for sale
      if (botStats.listedForSale) {
        return ToolContext.makeError("Bot is listed for sale on the marketplace. Unlist it before racing.", cb);
      };

      // Check bot condition
      if (botStats.condition < 70) {
        return ToolContext.makeError("Bot condition too low (need ≥70). Use garage_repair_robot first.", cb);
      };

      if (botStats.battery < 50) {
        return ToolContext.makeError("Bot battery too low (need ≥50). Use garage_recharge_robot first.", cb);
      };

      // Check class requirements
      let meetsClass = switch (race.raceClass) {
        case (#Scavenger) { botStats.wins <= 2 };
        case (#Raider) { botStats.wins >= 3 and botStats.wins <= 5 };
        case (#Elite) { botStats.wins >= 6 and botStats.wins <= 9 };
        case (#SilentKlan) {
          botStats.wins >= 10 and (
            switch (botStats.faction) {
              case (#GodClass) { true };
              case (#Master) { true };
              case (_) { false };
            }
          );
        };
      };

      if (not meetsClass) {
        return ToolContext.makeError("Bot does not meet race class requirements", cb);
      };

      // Process payment using ICRC-2 transfer_from
      let icpLedger = actor ("ryjl3-tyaaa-aaaaa-aaaba-cai") : actor {
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
            switch (ctx.raceManager.enterRace(raceId, tokenIndex, user, now)) {
              case (?updatedRace) {
                // Drain battery
                let updatedStats = {
                  botStats with
                  battery = Nat.sub(botStats.battery, 10);
                  lastRaced = ?now;
                };
                ctx.racingStatsManager.updateStats(tokenIndex, updatedStats);

                let classText = switch (race.raceClass) {
                  case (#Scavenger) { "Scavenger" };
                  case (#Raider) { "Raider" };
                  case (#Elite) { "Elite" };
                  case (#SilentKlan) { "Silent Klan Invitational" };
                };

                let timeUntilStart = race.startTime - now;
                let hoursUntilStart = timeUntilStart / 3_600_000_000_000;
                let minutesUntilStart = (timeUntilStart % 3_600_000_000_000) / 60_000_000_000;

                let response = Json.obj([
                  ("message", Json.str("🏁 **RACE ENTRY CONFIRMED**")),
                  ("race_id", Json.int(raceId)),
                  ("race_name", Json.str(race.name)),
                  ("race_class", Json.str(classText)),
                  ("your_position", Json.int(updatedRace.entries.size())),
                  ("total_entries", Json.int(updatedRace.entries.size())),
                  ("max_entries", Json.int(race.maxEntries)),
                  ("entry_fee_paid_icp", Json.str(Text.concat("0.", Nat.toText(race.entryFee / 100000)))),
                  ("current_prize_pool_icp", Json.str(Text.concat("0.", Nat.toText(updatedRace.prizePool / 100000)))),
                  ("starts_in_hours", Json.int(hoursUntilStart)),
                  ("starts_in_minutes", Json.int(minutesUntilStart)),
                  ("battery_remaining", Json.int(updatedStats.battery)),
                  ("wasteland_message", Json.str("⚡ Your bot heads to the starting line. The wasteland awaits...")),
                ]);

                ToolContext.makeSuccess(response, cb);
              };
              case (null) {
                return ToolContext.makeError("Failed to enter race", cb);
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
