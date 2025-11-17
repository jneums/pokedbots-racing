import Result "mo:base/Result";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";
import Principal "mo:base/Principal";
import Option "mo:base/Option";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Float "mo:base/Float";
import Error "mo:base/Error";

import HttpTypes "mo:http-types";
import Map "mo:map/Map";
import IC "mo:ic";
import ClassPlus "mo:class-plus";

import AuthCleanup "mo:mcp-motoko-sdk/auth/Cleanup";
import AuthState "mo:mcp-motoko-sdk/auth/State";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";

import Mcp "mo:mcp-motoko-sdk/mcp/Mcp";
import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import HttpHandler "mo:mcp-motoko-sdk/mcp/HttpHandler";
import Cleanup "mo:mcp-motoko-sdk/mcp/Cleanup";
import State "mo:mcp-motoko-sdk/mcp/State";
import Payments "mo:mcp-motoko-sdk/mcp/Payments";
import HttpAssets "mo:mcp-motoko-sdk/mcp/HttpAssets";
import Beacon "mo:mcp-motoko-sdk/mcp/Beacon";
import ApiKey "mo:mcp-motoko-sdk/auth/ApiKey";

import SrvTypes "mo:mcp-motoko-sdk/server/Types";

// Import tool modules
import ToolContext "tools/ToolContext";
import GarageListMyPokedBots "tools/garage_list_my_pokedbots";
import MarketplaceBrowsePokedBots "tools/marketplace_browse_pokedbots";
import MarketplacePurchasePokedBot "tools/marketplace_purchase_pokedbot";
import MarketplaceListPokedBot "tools/marketplace_list_pokedbot";
import MarketplaceUnlistPokedBot "tools/marketplace_unlist_pokedbot";
import GarageTransferPokedBot "tools/garage_transfer_pokedbot";
import GarageInitializePokedBot "tools/garage_initialize_pokedbot";
import GarageGetRobotDetails "tools/garage_get_robot_details";
import GarageRechargeRobot "tools/garage_recharge_robot";
import GarageRepairRobot "tools/garage_repair_robot";
import GarageUpgradeRobot "tools/garage_upgrade_robot";
import RacingListRaces "tools/racing_list_races";
import RacingEnterRace "tools/racing_enter_race";
import RacingSponsorRace "tools/racing_sponsor_race";

// Import Stats module for NFT metadata
import Stats "Stats";

// Import Racing modules
import Racing "Racing";
import RaceCalendar "RaceCalendar";
import Leaderboard "Leaderboard";
import ExtIntegration "ExtIntegration";
import IcpLedger "IcpLedger";
import TT "mo:timer-tool";
import Star "mo:star/star";

shared ({ caller = deployer }) persistent actor class McpServer(
  args : ?{
    owner : ?Principal;
  }
) = self {

  // The canister owner, who can manage treasury funds.
  // Defaults to the deployer if not specified.
  var owner : Principal = Option.get(do ? { args!.owner! }, deployer);
  let thisPrincipal = Principal.fromActor(self);

  // State for certified HTTP assets (like /.well-known/...)
  var stable_http_assets : HttpAssets.StableEntries = [];
  transient let http_assets = HttpAssets.init(stable_http_assets);

  // Stable state for NFT metadata
  let stable_nft_stats = Map.new<Nat, Stats.NFTStats>();
  var stable_trait_schema : Stats.TraitSchema = [];

  // Stable state for pre-computed base stats (speed, power, accel, stability, faction)
  let stable_base_stats = Map.new<Nat, { speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat; faction : Racing.FactionType }>();

  // Stable state for racing stats
  var stable_racing_stats = Map.new<Nat, Racing.PokedBotRacingStats>();
  let stable_active_upgrades = Map.new<Nat, Racing.UpgradeSession>();

  // Stable state for races
  let stable_races = Map.new<Nat, Racing.Race>();

  // Stable state for calendar events
  let stable_events = Map.new<Nat, RaceCalendar.ScheduledEvent>();

  // Stable state for leaderboards
  let stable_monthly_boards = Map.new<Nat, Map.Map<Nat, Leaderboard.LeaderboardEntry>>();
  let stable_season_boards = Map.new<Nat, Map.Map<Nat, Leaderboard.LeaderboardEntry>>();
  let stable_alltime_board = Map.new<Nat, Leaderboard.LeaderboardEntry>();
  let stable_faction_boards = Map.new<Text, Map.Map<Nat, Leaderboard.LeaderboardEntry>>();

  // Deprecated: Season/Month IDs are now calculated from Time.now()
  // Kept for stable variable compatibility during upgrades
  var stable_current_season_id : Nat = 1;
  var stable_current_month_id : Nat = 202411;

  // Stable state for decay tracking
  var stable_last_decay_time : Int = 0;

  // Stable state for timer tool
  var stable_timer_state = TT.initialState();

  // Constants
  let TRANSFER_FEE : Nat = 10_000; // 0.0001 ICP
  let PRIZE_DISTRIBUTION_TIMEOUT : Nat = 60_000_000_000; // 60 seconds timeout for prize transfers

  // NFT metadata storage
  transient let statsManager = Stats.StatsManager(stable_nft_stats, stable_trait_schema);

  transient let initManager = ClassPlus.ClassPlusInitializationManager(owner, thisPrincipal, true);

  // --- TT Setup ---
  private func reportTTExecution(execInfo : TT.ExecutionReport) : Bool {
    Debug.print("CANISTER: TimerTool Execution: " # debug_show (execInfo));
    false;
  };

  private func reportTTError(errInfo : TT.ErrorReport) : ?Nat {
    Debug.print("CANISTER: TimerTool Error: " # debug_show (errInfo));
    null;
  };

  var tt_migration_state : TT.State = TT.Migration.migration.initialState;
  transient let tt = TT.Init<system>({
    manager = initManager;
    initialState = tt_migration_state;
    args = null;
    pullEnvironment = ?(
      func() : TT.Environment {
        {
          advanced = null;
          reportExecution = ?reportTTExecution;
          reportError = ?reportTTError;
          syncUnsafe = null;
          reportBatch = null;
        };
      }
    );
    onInitialize = ?(
      func(newClass : TT.TimerTool) : async* () {
        Debug.print("Initializing TimerTool");
        newClass.initialize<system>();
      }
    );
    onStorageChange = func(state : TT.State) { tt_migration_state := state };
  });

  // Resource contents stored in memory for simplicity.
  // In a real application these would probably be uploaded or user generated.
  var resourceContents = [
    ("file:///main.py", "print('Hello from main.py!')"),
    ("file:///README.md", "# MCP Motoko Server"),
  ];

  // The application context that holds our state.
  var appContext : McpTypes.AppContext = State.init(resourceContents);

  // =================================================================================
  // --- AUTHENTICATION & EXT INTEGRATION ---
  // Authentication is enabled to get the user's principal for EXT ownership verification
  // =================================================================================

  // PokedBots EXT Canister ID
  let extCanisterId = Principal.fromText("bzsui-sqaaa-aaaah-qce2a-cai");
  transient let extCanister = ExtIntegration.getExtCanister(extCanisterId);

  // Racing stats manager (pass statsManager for metadata access)
  transient let racingStatsManager = Racing.RacingStatsManager(
    stable_racing_stats,
    stable_active_upgrades,
    {
      getNFTMetadata = func(tokenId : Nat) : ?[(Text, Text)] {
        statsManager.getNFTMetadata(tokenId);
      };
      getPrecomputedStats = func(tokenId : Nat) : ?{
        speed : Nat;
        powerCore : Nat;
        acceleration : Nat;
        stability : Nat;
        faction : Racing.FactionType;
      } {
        Map.get(stable_base_stats, Map.nhash, tokenId);
      };
    },
  );

  // Race manager
  transient let raceManager = Racing.RaceManager(
    stable_races,
    racingStatsManager,
  );

  // Event calendar manager
  transient let eventCalendar = RaceCalendar.EventCalendar(stable_events);

  // Leaderboard manager
  transient let leaderboardManager = Leaderboard.LeaderboardManager(
    stable_monthly_boards,
    stable_season_boards,
    stable_alltime_board,
    stable_faction_boards,
  );

  // Marketplace listings cache removed to save memory
  // Fetch listings on-demand instead of caching
  let CACHE_TTL_SECONDS : Int = 300; // 5 minutes (unused, kept for compatibility)

  let issuerUrl = "https://bfggx-7yaaa-aaaai-q32gq-cai.icp0.io";
  let allowanceUrl = "https://prometheusprotocol.org/connections";
  let requiredScopes = ["openid"];

  // Function to transform the response for jwks client
  public query func transformJwksResponse({
    context : Blob;
    response : IC.HttpRequestResult;
  }) : async IC.HttpRequestResult {
    {
      response with headers = []; // not interested in the headers
    };
  };

  // Initialize the auth context with the issuer URL and required scopes.
  let authContext : ?AuthTypes.AuthContext = ?AuthState.init(
    Principal.fromActor(self),
    owner,
    issuerUrl,
    requiredScopes,
    transformJwksResponse,
  );

  // =================================================================================
  // --- OPT-IN: USAGE ANALYTICS (BEACON) ---
  // To enable anonymous usage analytics, uncomment the `beaconContext` initialization.
  // This helps the Prometheus Protocol DAO understand ecosystem growth.
  // =================================================================================

  transient let beaconContext : ?Beacon.BeaconContext = null;

  // --- UNCOMMENT THIS BLOCK TO ENABLE THE BEACON ---
  /*
  let beaconCanisterId = Principal.fromText("m63pw-fqaaa-aaaai-q33pa-cai");
  transient let beaconContext : ?Beacon.BeaconContext = ?Beacon.init(
      beaconCanisterId, // Public beacon canister ID
      ?(15 * 60), // Send a beacon every 15 minutes
  );
  */
  // --- END OF BEACON BLOCK ---

  // --- Timers ---
  Cleanup.startCleanupTimer<system>(appContext);

  // The AuthCleanup timer only needs to run if authentication is enabled.
  switch (authContext) {
    case (?ctx) { AuthCleanup.startCleanupTimer<system>(ctx) };
    case (null) { Debug.print("Authentication is disabled.") };
  };

  // The Beacon timer only needs to run if the beacon is enabled.
  switch (beaconContext) {
    case (?ctx) { Beacon.startTimer<system>(ctx) };
    case (null) { Debug.print("Beacon is disabled.") };
  };

  // --- 1. DEFINE YOUR RESOURCES & TOOLS ---
  transient let resources : [McpTypes.Resource] = [
    {
      uri = "file:///main.py";
      name = "main.py";
      title = ?"Main Python Script";
      description = ?"Contains the main logic of the application.";
      mimeType = ?"text/x-python";
    },
    {
      uri = "file:///README.md";
      name = "README.md";
      title = ?"Project Documentation";
      description = null;
      mimeType = ?"text/markdown";
    },
  ];

  // Function to get marketplace listings with caching
  func getMarketplaceListings() : async [(Nat32, ExtIntegration.Listing, ExtIntegration.Metadata)] {
    // Fetch fresh data every time - no caching to save memory
    // The EXT canister call is fast enough for our use case
    await extCanister.listings();
  };

  // Handle completed upgrades
  func handleUpgradeCompletion<system>(actionId : TT.ActionId, action : TT.Action) : TT.ActionId {
    Debug.print("Upgrade completion handler triggered");

    // Decode the token index from params
    let tokenIndexOpt : ?Nat = from_candid (action.params);

    switch (tokenIndexOpt) {
      case (?tokenIndex) {
        Debug.print("Processing upgrade completion for token " # debug_show (tokenIndex));

        // Get the active upgrade session
        switch (racingStatsManager.getActiveUpgrade(tokenIndex)) {
          case (?session) {
            Debug.print("Found active upgrade session: " # debug_show (session.upgradeType));

            // Get current stats
            switch (racingStatsManager.getStats(tokenIndex)) {
              case (?stats) {
                // Generate random stat increase (1-3 for most, 1-2 for stability)
                let seed = Nat32.fromNat(tokenIndex + Int.abs(Time.now()));
                let baseIncrease = switch (session.upgradeType) {
                  case (#Gyro) { 1 + (Nat32.toNat(seed % 2)) }; // 1-2 for stability
                  case (_) { 1 + (Nat32.toNat(seed % 3)) }; // 1-3 for others
                };

                // Apply faction modifiers to the increase
                let increase = racingStatsManager.applyFactionModifier(
                  stats.faction,
                  baseIncrease,
                  seed,
                );

                Debug.print("Applying +" # debug_show (increase) # " to stat (faction: " # debug_show (stats.faction) # ")");

                // Apply the stat boost by increasing the bonus
                let updatedStats = switch (session.upgradeType) {
                  case (#Velocity) {
                    {
                      stats with
                      speedBonus = stats.speedBonus + increase;
                      experience = stats.experience + 5;
                      factionReputation = stats.factionReputation + 2; // Small reputation gain
                      upgradeEndsAt = null;
                      listedForSale = false;
                    };
                  };
                  case (#PowerCore) {
                    {
                      stats with
                      powerCoreBonus = stats.powerCoreBonus + increase;
                      experience = stats.experience + 5;
                      factionReputation = stats.factionReputation + 2;
                      upgradeEndsAt = null;
                      listedForSale = false;
                    };
                  };
                  case (#Thruster) {
                    {
                      stats with
                      accelerationBonus = stats.accelerationBonus + increase;
                      experience = stats.experience + 5;
                      factionReputation = stats.factionReputation + 2;
                      upgradeEndsAt = null;
                      listedForSale = false;
                    };
                  };
                  case (#Gyro) {
                    {
                      stats with
                      stabilityBonus = stats.stabilityBonus + increase;
                      experience = stats.experience + 10;
                      factionReputation = stats.factionReputation + 3; // Gyro worth more rep
                      upgradeEndsAt = null;
                      listedForSale = false;
                    };
                  };
                };

                racingStatsManager.updateStats(tokenIndex, updatedStats);
                racingStatsManager.clearUpgrade(tokenIndex);

                Debug.print("Upgrade completed successfully");
              };
              case null {
                Debug.print("Warning: No stats found for token " # debug_show (tokenIndex));
              };
            };
          };
          case null {
            Debug.print("Warning: No active upgrade found for token " # debug_show (tokenIndex));
          };
        };
      };
      case null {
        Debug.print("Error: Could not decode token index from action params");
      };
    };

    actionId;
  };

  // Handle hourly decay (self-rescheduling timer)
  func handleDailyDecay<system>(actionId : TT.ActionId, action : TT.Action) : TT.ActionId {
    Debug.print("Hourly decay handler triggered");

    let now = Time.now();
    let botsDecayed = racingStatsManager.applyDecayToAll(now);
    stable_last_decay_time := now;

    Debug.print("Applied decay to " # debug_show (botsDecayed) # " bots");

    // Schedule next decay in 1 hour
    let nextDecayTime = now + (60 * 60 * 1_000_000_000); // 1 hour in nanoseconds
    ignore tt().setActionSync<system>(
      Int.abs(nextDecayTime),
      {
        actionType = "daily_decay";
        params = to_candid (());
      },
    );
    Debug.print("Scheduled next decay for " # debug_show (nextDecayTime));

    actionId;
  };

  // Handle automatic race creation (recurring timer)
  func handleRaceCreation<system>(actionId : TT.ActionId, _action : TT.Action) : TT.ActionId {
    Debug.print("Race creation handler triggered");

    let now = Time.now();

    // First, ensure we have upcoming calendar events scheduled
    ensureCalendarScheduled<system>(now);

    // Get events that need races created (within next 7 days, no races yet)
    let upcomingEvents = eventCalendar.getUpcomingEvents(now, 7);

    for (event in upcomingEvents.vals()) {
      // Create races for events that don't have them yet
      if (event.raceIds.size() == 0) {
        var createdRaceIds : [Nat] = [];

        // Create races based on event divisions
        for (division in event.metadata.divisions.vals()) {
          let seed = Nat32.fromNat(Int.abs((event.scheduledTime + createdRaceIds.size() * 1000000) % 1000000));

          // Distance and terrain based on event type
          let (distance, terrain) = switch (event.eventType) {
            case (#WeeklyLeague) {
              // League races: longer distances (15-30km) with varied terrain
              let leagueDistances = [15, 20, 25, 30];
              let dist = leagueDistances[Nat32.toNat(seed % 4)];

              let terr = switch (Nat32.toNat((seed / 4) % 3)) {
                case (0) { #WastelandSand }; // Favor endurance
                case (1) { #MetalRoads }; // High speed
                case (_) { #ScrapHeaps }; // Technical
              };
              (dist, terr);
            };
            case (#MonthlyCup) {
              // Cup races: epic distances (25-40km) with challenging terrain
              let cupDistances = [25, 30, 35, 40];
              let dist = cupDistances[Nat32.toNat(seed % 4)];

              let terr = switch (Nat32.toNat((seed / 4) % 3)) {
                case (0) { #WastelandSand };
                case (1) { #MetalRoads };
                case (_) { #ScrapHeaps };
              };
              (dist, terr);
            };
            case (#DailySprint) {
              // Sprint races: short distances (5-10km) with varied terrain
              let sprintDistances = [5, 7, 10];
              let dist = sprintDistances[Nat32.toNat(seed % 3)];

              let terr = switch (Nat32.toNat((seed / 3) % 3)) {
                case (0) { #ScrapHeaps };
                case (1) { #WastelandSand };
                case (_) { #MetalRoads };
              };
              (dist, terr);
            };
            case (#SpecialEvent(_)) {
              // Special events: full variety
              let distances = [10, 15, 20, 25, 30];
              let dist = distances[Nat32.toNat(seed % 5)];

              let terr = switch (Nat32.toNat((seed / 5) % 3)) {
                case (0) { #ScrapHeaps };
                case (1) { #WastelandSand };
                case (_) { #MetalRoads };
              };
              (dist, terr);
            };
          };

          let race = raceManager.createRace(
            distance,
            terrain,
            division,
            event.metadata.entryFee,
            event.metadata.maxEntries,
            event.scheduledTime,
          );

          createdRaceIds := Array.append(createdRaceIds, [race.raceId]);

          Debug.print("Created race " # Nat.toText(race.raceId) # " for " # event.metadata.name # ": " # race.name);

          // Schedule race start
          ignore tt().setActionSync<system>(
            Int.abs(event.scheduledTime),
            {
              actionType = "race_start";
              params = to_candid (race.raceId);
            },
          );
        };

        // Update event with race IDs
        ignore eventCalendar.addRacesToEvent(event.eventId, createdRaceIds);
      };
    };

    // Schedule next race creation check in 1 hour
    let nextCreationTime = now + (60 * 60 * 1_000_000_000);
    ignore tt().setActionSync<system>(
      Int.abs(nextCreationTime),
      {
        actionType = "race_create";
        params = to_candid (());
      },
    );

    actionId;
  };

  // Ensure calendar has events scheduled (Weekly League + Daily Sprints)
  func ensureCalendarScheduled<system>(now : Int) {
    let WEEK_NS : Int = 7 * 24 * 60 * 60 * 1_000_000_000;
    let upcomingEvents = eventCalendar.getUpcomingEvents(now, 14); // Next 2 weeks

    // Check for Weekly League races in next 2 weeks
    let weeklyLeagues = Array.filter<RaceCalendar.ScheduledEvent>(
      upcomingEvents,
      func(e) {
        switch (e.eventType) {
          case (#WeeklyLeague) { true };
          case (_) { false };
        };
      },
    );

    // Schedule next 2 Weekly Leagues if less than 2 scheduled
    if (weeklyLeagues.size() < 2) {
      var scheduleTime = now;
      for (i in Iter.range(0, 1 - weeklyLeagues.size())) {
        let nextSunday = RaceCalendar.getNextWeeklyOccurrence(0, 20, 0, scheduleTime);
        ignore eventCalendar.createWeeklyLeagueEvent(nextSunday, now);
        Debug.print("Auto-scheduled Weekly League for timestamp: " # debug_show (nextSunday));
        scheduleTime := nextSunday + 1_000_000_000; // Move past this event
      };
    };

    // Check for Daily Sprints in next 48 hours
    let HOURS_48_NS : Int = 48 * 60 * 60 * 1_000_000_000;
    let sprintsIn48h = Array.filter<RaceCalendar.ScheduledEvent>(
      eventCalendar.getUpcomingEvents(now, 2), // Next 2 days
      func(e) {
        switch (e.eventType) {
          case (#DailySprint) { true };
          case (_) { false };
        };
      },
    );

    // Schedule Daily Sprints to ensure at least 8 in next 48 hours (one every 6 hours)
    if (sprintsIn48h.size() < 8) {
      var scheduleTime = now;
      for (i in Iter.range(0, 7 - sprintsIn48h.size())) {
        let nextSprint = RaceCalendar.getNextDailySprintTime(scheduleTime);
        ignore eventCalendar.createDailySprintEvent(nextSprint, now);
        Debug.print("Auto-scheduled Daily Sprint for timestamp: " # debug_show (nextSprint));
        scheduleTime := nextSprint + 1_000_000_000;
      };
    };
  };

  // Handle prize distribution asynchronously
  func handlePrizeDistribution<system>(actionId : TT.ActionId, action : TT.Action) : async* Star.Star<TT.ActionId, TT.Error> {
    Debug.print("Prize distribution handler triggered");

    // Decode prize info: (raceId, owner, amount)
    type PrizeInfo = (Nat, Principal, Nat);
    let prizeInfoOpt : ?PrizeInfo = from_candid (action.params);

    switch (prizeInfoOpt) {
      case (?(raceId, owner, amount)) {
        Debug.print("Distributing " # debug_show (amount) # " to " # Principal.toText(owner) # " for race " # debug_show (raceId));

        let ledger = actor ("ryjl3-tyaaa-aaaaa-aaaba-cai") : actor {
          icrc1_transfer : shared IcpLedger.TransferArg -> async IcpLedger.Result;
        };

        try {
          let transferResult = await ledger.icrc1_transfer({
            from_subaccount = null;
            to = { owner = owner; subaccount = null };
            amount = amount;
            fee = ?TRANSFER_FEE;
            memo = null;
            created_at_time = null;
          });

          switch (transferResult) {
            case (#Ok(blockIndex)) {
              Debug.print("Prize sent successfully, block: " # debug_show (blockIndex));
            };
            case (#Err(err)) {
              Debug.print("Prize transfer failed: " # debug_show (err));
            };
          };
        } catch (e) {
          Debug.print("Prize transfer caught error");
        };
      };
      case (null) {
        Debug.print("Could not decode prize info");
      };
    };

    #trappable(actionId);
  };

  // Handle race start - marks race as in progress
  func handleRaceStart<system>(actionId : TT.ActionId, action : TT.Action) : TT.ActionId {
    Debug.print("Race start handler triggered");

    let raceIdOpt : ?Nat = from_candid (action.params);

    switch (raceIdOpt) {
      case (?raceId) {
        Debug.print("Starting race " # debug_show (raceId));

        switch (raceManager.getRace(raceId)) {
          case (?race) {
            // Check if race has enough entries
            if (race.entries.size() < 2) {
              Debug.print("Race cancelled - not enough entries, issuing refunds");
              ignore raceManager.updateRaceStatus(raceId, #Cancelled);

              // Refund all entry fees
              for (entry in race.entries.vals()) {
                let refundActionId = tt().setActionASync<system>(
                  Int.abs(Time.now() + 1_000_000_000), // 1 second delay
                  {
                    actionType = "prize_distribution";
                    params = to_candid ((raceId, entry.owner, entry.entryFee));
                  },
                  PRIZE_DISTRIBUTION_TIMEOUT,
                );
                Debug.print("Scheduled refund " # debug_show (refundActionId) # " of " # debug_show (entry.entryFee) # " to " # Principal.toText(entry.owner));
              };

              // Refund all sponsors
              for (sponsor in race.sponsors.vals()) {
                let sponsorRefundActionId = tt().setActionASync<system>(
                  Int.abs(Time.now() + 1_000_000_000), // 1 second delay
                  {
                    actionType = "prize_distribution";
                    params = to_candid ((raceId, sponsor.sponsor, sponsor.amount));
                  },
                  PRIZE_DISTRIBUTION_TIMEOUT,
                );
                Debug.print("Scheduled sponsor refund " # debug_show (sponsorRefundActionId) # " of " # debug_show (sponsor.amount) # " to " # Principal.toText(sponsor.sponsor));
              };

              return actionId;
            };

            // Mark as in progress
            ignore raceManager.updateRaceStatus(raceId, #InProgress);
            Debug.print("Race in progress: " # race.name # " with " # debug_show (race.entries.size()) # " entries");

            // Schedule race finish for after duration
            let finishTime = race.startTime + (race.duration * 1_000_000_000);
            ignore tt().setActionSync<system>(
              Int.abs(finishTime),
              {
                actionType = "race_finish";
                params = to_candid (raceId);
              },
            );
          };
          case (null) {
            Debug.print("Race not found: " # debug_show (raceId));
          };
        };
      };
      case (null) {
        Debug.print("Could not decode race ID");
      };
    };

    actionId;
  };

  // Handle race finish - simulate and distribute prizes
  func handleRaceFinish<system>(actionId : TT.ActionId, action : TT.Action) : TT.ActionId {
    Debug.print("Race finish handler triggered");

    // Decode race ID
    let raceIdOpt : ?Nat = from_candid (action.params);

    switch (raceIdOpt) {
      case (?raceId) {
        Debug.print("Finishing race " # debug_show (raceId));

        switch (raceManager.getRace(raceId)) {
          case (?race) {
            // Simulate the race
            switch (raceManager.simulateRace(raceId)) {
              case (?results) {
                Debug.print("Race simulated, " # debug_show (results.size()) # " racers");

                // Update race with results
                ignore raceManager.setRaceResults(raceId, results);

                // Update bot stats (synchronously)
                for (result in results.vals()) {
                  switch (racingStatsManager.getStats(result.tokenIndex)) {
                    case (?stats) {
                      let updatedStats = {
                        stats with
                        racesEntered = stats.racesEntered + 1;
                        wins = if (result.position == 1) {
                          stats.wins + 1;
                        } else { stats.wins };
                        places = if (result.position == 2) { stats.places + 1 } else {
                          stats.places;
                        };
                        shows = if (result.position == 3) { stats.shows + 1 } else {
                          stats.shows;
                        };
                        totalScrapEarned = stats.totalScrapEarned + result.prizeAmount;
                        experience = stats.experience + (if (result.position == 1) { 20 } else if (result.position <= 3) { 10 } else { 5 });
                        factionReputation = stats.factionReputation + (if (result.position == 1) { 10 } else if (result.position <= 3) { 5 } else { 2 });
                      };
                      racingStatsManager.updateStats(result.tokenIndex, updatedStats);

                      // Update leaderboard periods based on current time
                      let now = Time.now();
                      leaderboardManager.updateCurrentPeriods(now);

                      // Record result in leaderboard (default 1.0x multiplier for now)
                      leaderboardManager.recordRaceResult(
                        result.tokenIndex,
                        result.owner,
                        result.position,
                        results.size(),
                        result.prizeAmount,
                        1.0, // TODO: Get multiplier from event metadata
                        stats.faction,
                        race.raceClass,
                        now,
                      );
                    };
                    case (null) {};
                  };

                  // Schedule async prize distribution if there's a prize
                  if (result.prizeAmount > 0) {
                    let prizeActionId = tt().setActionASync<system>(
                      Int.abs(Time.now() + 5_000_000_000), // 5 seconds delay
                      {
                        actionType = "prize_distribution";
                        params = to_candid ((raceId, result.owner, result.prizeAmount));
                      },
                      PRIZE_DISTRIBUTION_TIMEOUT,
                    );
                    Debug.print("Scheduled prize distribution " # debug_show (prizeActionId) # " for " # Principal.toText(result.owner));
                  };
                };

                ignore raceManager.updateRaceStatus(raceId, #Completed);
                Debug.print("Race completed successfully - " # debug_show (results.size()) # " participants updated");
              };
              case (null) {
                Debug.print("Race simulation failed");
                ignore raceManager.updateRaceStatus(raceId, #Cancelled);
              };
            };
          };
          case (null) {
            Debug.print("Race not found: " # debug_show (raceId));
          };
        };
      };
      case (null) {
        Debug.print("Could not decode race ID");
      };
    };

    actionId;
  };

  tt().registerExecutionListenerSync(?"upgrade_complete", handleUpgradeCompletion);
  tt().registerExecutionListenerSync(?"daily_decay", handleDailyDecay);
  tt().registerExecutionListenerSync(?"race_create", handleRaceCreation);
  tt().registerExecutionListenerSync(?"race_start", handleRaceStart);
  tt().registerExecutionListenerSync(?"race_finish", handleRaceFinish);
  tt().registerExecutionListenerAsync(?"prize_distribution", handlePrizeDistribution);

  // Create the tool context that will be passed to all tools
  transient let toolContext : ToolContext.ToolContext = {
    canisterPrincipal = Principal.fromActor(self);
    owner = owner;
    appContext = appContext;
    racingStatsManager = racingStatsManager;
    raceManager = raceManager;
    extCanister = extCanister;
    extCanisterId = extCanisterId;
    getMarketplaceListings = getMarketplaceListings;
    timerTool = tt();
    getNFTMetadata = statsManager.getNFTMetadata;
    getStats = racingStatsManager.getStats;
    getCurrentStats = racingStatsManager.getCurrentStats;
    isInActiveRace = raceManager.isInActiveRace;
    addSponsor = raceManager.addSponsor;
  };

  // Import tool configurations from separate modules
  transient let tools : [McpTypes.Tool] = [
    GarageListMyPokedBots.config(),
    MarketplaceBrowsePokedBots.config(),
    MarketplacePurchasePokedBot.config(),
    MarketplaceListPokedBot.config(),
    MarketplaceUnlistPokedBot.config(),
    GarageTransferPokedBot.config(),
    GarageInitializePokedBot.config(),
    GarageGetRobotDetails.config(),
    GarageRechargeRobot.config(),
    GarageRepairRobot.config(),
    GarageUpgradeRobot.config(),
    RacingListRaces.config(),
    RacingEnterRace.config(),
    RacingSponsorRace.config(),
  ];

  // --- 2. CONFIGURE THE SDK ---
  transient let mcpConfig : McpTypes.McpConfig = {
    self = Principal.fromActor(self);
    allowanceUrl = ?allowanceUrl;
    serverInfo = {
      name = "pokedbots-wasteland-racing";
      title = "PokedBots Wasteland Racing";
      version = "0.1.0";
    };
    resources = resources;
    resourceReader = func(uri) {
      Map.get(appContext.resourceContents, Map.thash, uri);
    };
    tools = tools;
    toolImplementations = [
      ("garage_list_my_pokedbots", GarageListMyPokedBots.handler(toolContext)),
      ("browse_pokedbots", MarketplaceBrowsePokedBots.handle(toolContext)),
      ("purchase_pokedbot", MarketplacePurchasePokedBot.handle(toolContext)),
      ("list_pokedbot", MarketplaceListPokedBot.handle(toolContext)),
      ("unlist_pokedbot", MarketplaceUnlistPokedBot.handle(toolContext)),
      ("transfer_pokedbot", GarageTransferPokedBot.handle(toolContext)),
      ("garage_initialize_pokedbot", GarageInitializePokedBot.handle(toolContext)),
      ("garage_get_robot_details", GarageGetRobotDetails.handle(toolContext)),
      ("garage_recharge_robot", GarageRechargeRobot.handle(toolContext)),
      ("garage_repair_robot", GarageRepairRobot.handle(toolContext)),
      ("garage_upgrade_robot", GarageUpgradeRobot.handle(toolContext)),
      ("racing_list_races", RacingListRaces.handle(toolContext)),
      ("racing_enter_race", RacingEnterRace.handle(toolContext)),
      ("racing_sponsor_race", RacingSponsorRace.handle(toolContext)),
    ];
    beacon = beaconContext;
  };

  // --- 3. CREATE THE SERVER LOGIC ---
  transient let mcpServer = Mcp.createServer(mcpConfig);

  // --- PUBLIC ENTRY POINTS ---

  // Do not remove these public methods below. They are required for the MCP Registry and MCP Orchestrator
  // to manage the canister upgrades and installs, handle payments, and allow owner only methods.

  /// Get the current owner of the canister.
  public query func get_owner() : async Principal { return owner };

  /// Set a new owner for the canister. Only the current owner can call this.
  public shared ({ caller }) func set_owner(new_owner : Principal) : async Result.Result<(), Payments.TreasuryError> {
    if (caller != owner) { return #err(#NotOwner) };
    owner := new_owner;
    return #ok(());
  };

  /// Get the canister's balance of a specific ICRC-1 token.
  public shared func get_treasury_balance(ledger_id : Principal) : async Nat {
    return await Payments.get_treasury_balance(Principal.fromActor(self), ledger_id);
  };

  /// Withdraw tokens from the canister's treasury to a specified destination.
  public shared ({ caller }) func withdraw(
    ledger_id : Principal,
    amount : Nat,
    destination : Payments.Destination,
  ) : async Result.Result<Nat, Payments.TreasuryError> {
    return await Payments.withdraw(
      caller,
      owner,
      ledger_id,
      amount,
      destination,
    );
  };

  // Helper to create the HTTP context for each request.
  private func _create_http_context() : HttpHandler.Context {
    return {
      self = Principal.fromActor(self);
      active_streams = appContext.activeStreams;
      mcp_server = mcpServer;
      streaming_callback = http_request_streaming_callback;
      // This passes the optional auth context to the handler.
      // If it's `null`, the handler will skip all auth checks.
      auth = authContext;
      http_asset_cache = ?http_assets.cache;
      mcp_path = ?"/mcp";
    };
  };

  /// Handle incoming HTTP requests.
  public query func http_request(req : SrvTypes.HttpRequest) : async SrvTypes.HttpResponse {
    let ctx : HttpHandler.Context = _create_http_context();
    // Ask the SDK to handle the request
    switch (HttpHandler.http_request(ctx, req)) {
      case (?mcpResponse) {
        // The SDK handled it, so we return its response.
        return mcpResponse;
      };
      case (null) {
        // The SDK ignored it. Now we can handle our own custom routes.
        if (req.url == "/") {
          // e.g., Serve a frontend asset
          return {
            status_code = 200;
            headers = [("Content-Type", "text/html")];
            body = Text.encodeUtf8("<h1>My Canister Frontend</h1>");
            upgrade = null;
            streaming_strategy = null;
          };
        } else {
          // Return a 404 for any other unhandled routes.
          return {
            status_code = 404;
            headers = [];
            body = Blob.fromArray([]);
            upgrade = null;
            streaming_strategy = null;
          };
        };
      };
    };
  };

  /// Handle incoming HTTP requests that modify state (e.g., POST).
  public shared func http_request_update(req : SrvTypes.HttpRequest) : async SrvTypes.HttpResponse {
    let ctx : HttpHandler.Context = _create_http_context();

    // Ask the SDK to handle the request
    let mcpResponse = await HttpHandler.http_request_update(ctx, req);

    switch (mcpResponse) {
      case (?res) {
        // The SDK handled it.
        return res;
      };
      case (null) {
        // The SDK ignored it. Handle custom update calls here.
        return {
          status_code = 404;
          headers = [];
          body = Blob.fromArray([]);
          upgrade = null;
          streaming_strategy = null;
        };
      };
    };
  };

  /// Handle streaming callbacks for large HTTP responses.
  public query func http_request_streaming_callback(token : HttpTypes.StreamingToken) : async ?HttpTypes.StreamingCallbackResponse {
    let ctx : HttpHandler.Context = _create_http_context();
    return HttpHandler.http_request_streaming_callback(ctx, token);
  };

  // --- NFT METADATA PUBLIC METHODS ---

  /// Upload trait schema (owner only, done once)
  public shared ({ caller }) func upload_trait_schema(
    schemaData : Stats.TraitSchema
  ) : async Result.Result<(), Text> {
    if (caller != owner) {
      return #err("Only the owner can upload schema");
    };
    statsManager.setSchema(schemaData);
    #ok(());
  };

  /// Upload NFT stats in batch (owner only for security)
  /// Stats are stored as raw integer arrays [type_id, body_id, driver_id, ...]
  public shared ({ caller }) func upload_nft_stats_batch(
    batch : [(Nat, Stats.NFTStats)]
  ) : async Result.Result<(), Text> {
    if (caller != owner) {
      return #err("Only the owner can upload stats");
    };
    statsManager.addBatchStats(batch);
    #ok(());
  };

  /// Get raw stats for a specific NFT (returns integer array)
  public query func get_nft_stats(tokenId : Nat) : async ?Stats.NFTStats {
    statsManager.getNFTStats(tokenId);
  };

  /// Get decoded metadata for a specific NFT (public query)
  public query func get_nft_metadata(tokenId : Nat) : async ?Stats.NFTMetadata {
    statsManager.getNFTMetadata(tokenId);
  };

  /// Get metadata by EXT token identifier (public query)
  public query func get_nft_metadata_by_identifier(tokenIdentifier : Text) : async ?Stats.NFTMetadata {
    statsManager.getNFTMetadataByIdentifier(tokenIdentifier);
  };

  /// Get raw stats by EXT token identifier (public query)
  public query func get_nft_stats_by_identifier(tokenIdentifier : Text) : async ?Stats.NFTStats {
    statsManager.getNFTStatsByIdentifier(tokenIdentifier);
  };

  /// Decode EXT token identifier to get token index (public query)
  public query func decode_token_identifier(tokenIdentifier : Text) : async Nat {
    Nat32.toNat(Stats.getTokenIndex(tokenIdentifier));
  };

  /// Encode token index to EXT token identifier (public query)
  public query func encode_token_identifier(tokenIndex : Nat32) : async Text {
    ExtIntegration.encodeTokenIdentifier(tokenIndex, extCanisterId);
  };

  /// Get decoded metadata for multiple NFTs in one call (public query)
  public query func get_nft_metadata_batch(tokenIds : [Nat]) : async [(Nat, ?Stats.NFTMetadata)] {
    statsManager.getBatchMetadata(tokenIds);
  };

  /// Get paginated NFT metadata (decoded, public query)
  public query func get_nft_metadata_page(offset : Nat, limit : Nat) : async [(Nat, Stats.NFTMetadata)] {
    statsManager.getStatsPage(offset, limit);
  };

  /// Get the trait schema (public query)
  public query func get_trait_schema() : async Stats.TraitSchema {
    statsManager.getSchema();
  };

  // --- DEBUG METHODS ---

  /// Debug: Preview what stats would be derived for a token index
  /// Shows both metadata-based and fallback stats for comparison
  // Test stat derivation with error handling
  public query func test_derive_stats(tokenIndex : Nat) : async {
    #ok : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
      faction : Text;
    };
    #err : Text;
  } {
    try {
      let metadata = statsManager.getNFTMetadata(tokenIndex);

      let faction = switch (metadata) {
        case (?traits) { Racing.deriveFactionFromMetadata(traits) };
        case null {
          return #err("No metadata found for token " # Nat.toText(tokenIndex));
        };
      };

      let stats = switch (metadata) {
        case (?traits) { Racing.deriveStatsFromMetadata(traits, faction) };
        case null { return #err("No metadata for stats derivation") };
      };

      let factionText = switch (faction) {
        case (#BattleBot) { "BattleBot" };
        case (#EntertainmentBot) { "EntertainmentBot" };
        case (#WildBot) { "WildBot" };
        case (#GodClass) { "GodClass" };
        case (#Master) { "Master" };
      };

      #ok({
        speed = stats.speed;
        powerCore = stats.powerCore;
        acceleration = stats.acceleration;
        stability = stats.stability;
        faction = factionText;
      });
    } catch (e) {
      #err("Error deriving stats: " # Error.message(e));
    };
  };

  public query func debug_preview_stats(tokenIndex : Nat) : async {
    hasMetadata : Bool;
    metadata : ?Stats.NFTMetadata;
    derivedFaction : Text;
    statsFromMetadata : ?{
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    };
    statsFromTokenIndex : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    };
    currentStoredStats : ?{
      faction : Text;
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
      baseSpeed : Nat;
      basePowerCore : Nat;
      baseAcceleration : Nat;
      baseStability : Nat;
      speedBonus : Nat;
      powerCoreBonus : Nat;
      accelerationBonus : Nat;
      stabilityBonus : Nat;
    };
  } {
    let metadata = statsManager.getNFTMetadata(tokenIndex);

    // Derive faction
    let faction = switch (metadata) {
      case (?traits) { Racing.deriveFactionFromMetadata(traits) };
      case null {
        let mod = tokenIndex % 100;
        if (mod < 5) { #GodClass } else if (mod < 15) { #Master } else if (mod < 35) {
          #WildBot;
        } else if (mod < 60) { #EntertainmentBot } else { #BattleBot };
      };
    };

    let factionText = switch (faction) {
      case (#BattleBot) { "BattleBot" };
      case (#EntertainmentBot) { "EntertainmentBot" };
      case (#WildBot) { "WildBot" };
      case (#GodClass) { "GodClass" };
      case (#Master) { "Master" };
    };

    // Get metadata-based stats if available
    let metadataStats = switch (metadata) {
      case (?traits) {
        let stats = Racing.deriveStatsFromMetadata(traits, faction);
        ?{
          speed = stats.speed;
          powerCore = stats.powerCore;
          acceleration = stats.acceleration;
          stability = stats.stability;
        };
      };
      case null { null };
    };

    // Get fallback token-index based stats
    let tokenStats = Racing.deriveStatsFromTokenIndex(tokenIndex, faction);

    // Get currently stored stats if bot is initialized
    let storedStats = switch (racingStatsManager.getStats(tokenIndex)) {
      case (?stored) {
        let storedFaction = switch (stored.faction) {
          case (#BattleBot) { "BattleBot" };
          case (#EntertainmentBot) { "EntertainmentBot" };
          case (#WildBot) { "WildBot" };
          case (#GodClass) { "GodClass" };
          case (#Master) { "Master" };
        };

        // Get current stats (base + bonuses)
        let current = racingStatsManager.getCurrentStats(stored);
        let base = racingStatsManager.getBaseStats(tokenIndex);

        ?{
          faction = storedFaction;
          speed = current.speed;
          powerCore = current.powerCore;
          acceleration = current.acceleration;
          stability = current.stability;
          baseSpeed = base.speed;
          basePowerCore = base.powerCore;
          baseAcceleration = base.acceleration;
          baseStability = base.stability;
          speedBonus = stored.speedBonus;
          powerCoreBonus = stored.powerCoreBonus;
          accelerationBonus = stored.accelerationBonus;
          stabilityBonus = stored.stabilityBonus;
        };
      };
      case null { null };
    };

    {
      hasMetadata = Option.isSome(metadata);
      metadata = metadata;
      derivedFaction = factionText;
      statsFromMetadata = metadataStats;
      statsFromTokenIndex = {
        speed = tokenStats.speed;
        powerCore = tokenStats.powerCore;
        acceleration = tokenStats.acceleration;
        stability = tokenStats.stability;
      };
      currentStoredStats = storedStats;
    };
  };

  /// Get total count of NFTs with metadata stored
  public query func get_total_nft_count() : async Nat {
    statsManager.getTotalCount();
  };

  /// Get all token IDs that have metadata
  public query func get_all_token_ids() : async [Nat] {
    statsManager.getAllTokenIds();
  };

  /// Get a specific trait value ID by trait index (for calculations)
  public query func get_nft_trait_value(tokenId : Nat, traitIndex : Nat) : async ?Nat {
    statsManager.getTraitValue(tokenId, traitIndex);
  };

  /// Get a decoded trait value by trait name (for display)
  public query func get_nft_trait(tokenId : Nat, traitName : Text) : async ?Text {
    statsManager.getTraitValueByName(tokenId, traitName);
  };

  // ===== PRE-COMPUTED BASE STATS UPLOAD =====

  /// Upload a batch of pre-computed base stats
  public shared (msg) func upload_base_stats_batch(
    batch : [(Nat, { speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat; faction : Text })]
  ) : async () {
    if (msg.caller != owner) {
      Debug.trap("Only the owner can upload base stats");
    };

    for ((tokenId, stats) in batch.vals()) {
      // Convert faction text to FactionType
      let factionType : Racing.FactionType = switch (stats.faction) {
        case ("BattleBot") { #BattleBot };
        case ("EntertainmentBot") { #EntertainmentBot };
        case ("WildBot") { #WildBot };
        case ("GodClass") { #GodClass };
        case ("Master") { #Master };
        case (_) { #BattleBot }; // Default
      };

      ignore Map.put(
        stable_base_stats,
        Map.nhash,
        tokenId,
        {
          speed = stats.speed;
          powerCore = stats.powerCore;
          acceleration = stats.acceleration;
          stability = stats.stability;
          faction = factionType;
        },
      );
    };
  };

  /// Get total count of pre-computed base stats
  public query func get_base_stats_count() : async Nat {
    Map.size(stable_base_stats);
  };

  /// Get a specific pre-computed base stat
  public query func get_base_stat(tokenId : Nat) : async ?{
    speed : Nat;
    powerCore : Nat;
    acceleration : Nat;
    stability : Nat;
    faction : Text;
  } {
    switch (Map.get(stable_base_stats, Map.nhash, tokenId)) {
      case (null) { null };
      case (?stats) {
        let factionText = switch (stats.faction) {
          case (#BattleBot) { "BattleBot" };
          case (#EntertainmentBot) { "EntertainmentBot" };
          case (#WildBot) { "WildBot" };
          case (#GodClass) { "GodClass" };
          case (#Master) { "Master" };
        };
        ?{
          speed = stats.speed;
          powerCore = stats.powerCore;
          acceleration = stats.acceleration;
          stability = stats.stability;
          faction = factionText;
        };
      };
    };
  };

  // Tracing functions
  public query func get_reconstitution_traces() : async [TT.ReconstitutionTrace] {
    tt().getReconstitutionTraces();
  };

  public query func get_latest_reconstitution_trace() : async ?TT.ReconstitutionTrace {
    tt().getLatestReconstitutionTrace();
  };

  public shared func clear_reconstitution_traces() : async () {
    tt().clearReconstitutionTraces();
  };

  public query func validate_timer_state() : async [Text] {
    tt().validateTimerState();
  };

  public query func get_timer_diagnostics() : async TT.TimerDiagnostics {
    tt().getTimerDiagnostics();
  };

  // Cancellation functions
  public shared func cancel_actions_by_filter(filter : TT.ActionFilter) : async TT.CancellationResult {
    tt().cancelActionsByFilter(filter);
  };

  public shared func cancel_actions_by_ids(ids : [Nat]) : async TT.CancellationResult {
    tt().cancelActionsByIds(ids);
  };

  public query func get_actions_by_filter(filter : TT.ActionFilter) : async [TT.ActionDetail] {
    tt().getActionsByFilter(filter);
  };

  public shared func emergency_clear_all_timers() : async Nat {
    tt().emergencyClearAllTimers();
  };

  public shared func force_system_timer_cancel() : async Bool {
    tt().forceSystemTimerCancel();
  };

  public shared func force_release_lock() : async ?Time.Time {
    tt().forceReleaseLock();
  };

  // Manual trigger to process overdue timer actions
  public shared func process_overdue_timers() : async Text {
    let diagnostics = tt().getTimerDiagnostics();
    let message = "Overdue actions: " # debug_show (diagnostics.overdueActions) #
    "\nProcessing timer tick...";
    Debug.print(message);

    // Force timer-tool to check and process overdue actions
    // This is a workaround for IC system timer not firing after upgrades
    ignore tt().getActionsByFilter(#All);

    message;
  };

  // ===== CALENDAR & EVENT MANAGEMENT =====
  // All event scheduling and race creation is handled automatically by the timer system
  // via ensureCalendarScheduled() and handleRaceCreation()

  // ===== LEADERBOARD QUERY FUNCTIONS =====

  // Get leaderboard by type
  public query func get_leaderboard(
    lbType : Leaderboard.LeaderboardType,
    limit : Nat,
  ) : async [Leaderboard.LeaderboardEntry] {
    leaderboardManager.getLeaderboard(lbType, ?limit, null);
  };

  // Get leaderboard entry for a specific bot
  public query func get_my_ranking(
    lbType : Leaderboard.LeaderboardType,
    tokenIndex : Nat,
  ) : async ?Leaderboard.LeaderboardEntry {
    leaderboardManager.getEntryForBot(lbType, tokenIndex);
  };

  // Get upcoming scheduled events
  public query func get_upcoming_events(daysAhead : Nat) : async [RaceCalendar.ScheduledEvent] {
    let now = Time.now();
    eventCalendar.getUpcomingEvents(now, daysAhead);
  };

  // Get all events
  public query func get_all_scheduled_events() : async [RaceCalendar.ScheduledEvent] {
    eventCalendar.getAllEvents();
  };

  // Get event details by ID
  public query func get_event_details(eventId : Nat) : async ?RaceCalendar.ScheduledEvent {
    eventCalendar.getEvent(eventId);
  };

  // ===== DEBUG/ADMIN FUNCTIONS =====

  // Manually cancel specific races by ID
  public shared ({ caller }) func cancel_races_by_ids(raceIds : [Nat]) : async [(Nat, Text)] {
    if (caller != owner) {
      Debug.trap("Only owner can cancel races");
    };

    var cancelledRaces : [(Nat, Text)] = [];

    for (raceId in raceIds.vals()) {
      switch (raceManager.getRace(raceId)) {
        case (?race) {
          if (race.status == #Upcoming) {
            ignore raceManager.updateRaceStatus(raceId, #Cancelled);
            cancelledRaces := Array.append(cancelledRaces, [(raceId, race.name)]);
          };
        };
        case (null) { /* Race doesn't exist */ };
      };
    };

    cancelledRaces;
  }; // --- CANISTER LIFECYCLE MANAGEMENT ---

  system func preupgrade() {
    stable_http_assets := HttpAssets.preupgrade(http_assets);

    // Save the trait schema from statsManager to stable storage before upgrade
    stable_trait_schema := statsManager.getSchemaValue();
  };
  system func postupgrade() {
    HttpAssets.postupgrade(http_assets);

    // Update leaderboard periods based on current time
    let now = Time.now();
    leaderboardManager.updateCurrentPeriods(now);

    initializeDecayTimer<system>();
    initializeRaceCreationTimer<system>();
  };

  // Initialize the decay timer (called on postupgrade or first install)
  func initializeDecayTimer<system>() {
    // Check if we already have a decay timer scheduled
    let existingActions = tt().getActionsByFilter(#ByType("daily_decay"));
    if (existingActions.size() == 0) {
      // No decay timer exists, schedule the first one
      let now = Time.now();
      let firstDecayTime = if (stable_last_decay_time == 0) {
        // First install, schedule decay in 1 hour
        Int.abs(now + (60 * 60 * 1_000_000_000));
      } else {
        // After upgrade, schedule based on last decay
        let timeSinceLastDecay = now - stable_last_decay_time;
        let hourInNs = 60 * 60 * 1_000_000_000;
        if (timeSinceLastDecay >= hourInNs) {
          // Overdue, schedule immediately
          Int.abs(now + 60_000_000_000); // 1 minute from now
        } else {
          // Schedule at next 1-hour mark
          Int.abs(stable_last_decay_time + hourInNs);
        };
      };

      ignore tt().setActionSync<system>(
        firstDecayTime,
        {
          actionType = "daily_decay";
          params = to_candid (());
        },
      );

      Debug.print("Decay timer already exists, skipping initialization");
    };
  };

  // Initialize race creation timer (called on postupgrade or first install)
  func initializeRaceCreationTimer<system>() {
    // Check if race creation timer already exists
    let existingTimers = tt().getActionsByFilter(#ByType("race_create"));

    if (existingTimers.size() == 0) {
      // No race creation timer, create the first one
      let now = Time.now();
      let firstRaceTime = now + (5 * 60 * 1_000_000_000); // First race in 5 minutes

      ignore tt().setActionSync<system>(
        Int.abs(firstRaceTime),
        {
          actionType = "race_create";
          params = to_candid (());
        },
      );
      Debug.print("Initialized race creation timer for " # debug_show (firstRaceTime));
    } else {
      Debug.print("Race creation timer already exists, skipping initialization");
    };
  };

  /**
   * Creates a new API key. This API key is linked to the caller's principal.
   * @param name A human-readable name for the key.
   * @returns The raw, unhashed API key. THIS IS THE ONLY TIME IT WILL BE VISIBLE.
   */
  public shared (msg) func create_my_api_key(name : Text, scopes : [Text]) : async Text {
    switch (authContext) {
      case (null) {
        Debug.trap("Authentication is not enabled on this canister.");
      };
      case (?ctx) {
        return await ApiKey.create_my_api_key(
          ctx,
          msg.caller,
          name,
          scopes,
        );
      };
    };
  };

  /** Revoke (delete) an API key owned by the caller.
   * @param key_id The ID of the key to revoke.
   * @returns True if the key was found and revoked, false otherwise.
   */
  public shared (msg) func revoke_my_api_key(key_id : Text) : async () {
    switch (authContext) {
      case (null) {
        Debug.trap("Authentication is not enabled on this canister.");
      };
      case (?ctx) {
        return ApiKey.revoke_my_api_key(ctx, msg.caller, key_id);
      };
    };
  };

  /** List all API keys owned by the caller.
   * @returns A list of API key metadata (but not the raw keys).
   */
  public query (msg) func list_my_api_keys() : async [AuthTypes.ApiKeyMetadata] {
    switch (authContext) {
      case (null) {
        Debug.trap("Authentication is not enabled on this canister.");
      };
      case (?ctx) {
        return ApiKey.list_my_api_keys(ctx, msg.caller);
      };
    };
  };

  public type UpgradeFinishedResult = {
    #InProgress : Nat;
    #Failed : (Nat, Text);
    #Success : Nat;
  };
  private func natNow() : Nat {
    return Int.abs(Time.now());
  };
  /* Return success after post-install/upgrade operations complete.
   * The Nat value is a timestamp (in nanoseconds) of when the upgrade finished.
   * If the upgrade is still in progress, return #InProgress with a timestamp of when it started.
   * If the upgrade failed, return #Failed with a timestamp and an error message.
   */
  public func icrc120_upgrade_finished() : async UpgradeFinishedResult {
    #Success(natNow());
  };
};
