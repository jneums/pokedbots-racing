import Result "mo:base/Result";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";
import Principal "mo:base/Principal";
import Option "mo:base/Option";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Float "mo:base/Float";
import Error "mo:base/Error";
import Buffer "mo:base/Buffer";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Order "mo:base/Order";

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
import GarageInitializePokedBot "tools/garage_initialize_pokedbot";
import GarageDeregisterPokedBot "tools/garage_deregister_pokedbot";
import GarageGetRobotDetails "tools/garage_get_robot_details";
import GarageRechargeRobot "tools/garage_recharge_robot";
import GarageRepairRobot "tools/garage_repair_robot";
import GarageUpgradeRobot "tools/garage_upgrade_robot";
import GarageCancelUpgrade "tools/garage_cancel_upgrade";
// SECURITY: GarageTransferParts removed - could be exploited by malicious API key holders to steal parts
import GarageStartScavenging "tools/garage_start_scavenging";
import GarageCompleteScavenging "tools/garage_complete_scavenging";
import GarageConvertParts "tools/garage_convert_parts";
import RacingListRaces "tools/racing_list_races";
import RacingListEvents "tools/racing_list_events";
import RacingGetMyRegistrations "tools/racing_get_my_registrations";
import RacingEnterRace "tools/racing_enter_race";
import RacingSponsorRace "tools/racing_sponsor_race";
import RacingGetRaceDetails "tools/racing_get_race_details";
import RacingGetBotRaces "tools/racing_get_bot_races";
import RacingRegisterForEvent "tools/racing_register_for_event";
import RacingUnregisterFromEvent "tools/racing_unregister_from_event";
import RacingGetEventResults "tools/racing_get_event_results";
import HelpGetCompendium "tools/help_get_compendium";
import BettingPlaceBet "tools/betting_place_bet";
import BettingListPools "tools/betting_list_pools";
import BettingGetPoolInfo "tools/betting_get_pool_info";
import BettingGetMyBets "tools/betting_get_my_bets";
import RacingGetBotNames "tools/racing_get_bot_names";

// Import Stats module for NFT metadata
import Stats "Stats";

// Import Racing modules (new architecture)
import RacingSimulator "RacingSimulator";
import PokedBotsGarage "PokedBotsGarage";
// import Racing "Racing"; // REMOVED: No longer needed after migration to new architecture
import RaceCalendar "RaceCalendar";
import Leaderboard "Leaderboard";
import ExtIntegration "ExtIntegration";
import IcpLedger "IcpLedger";
import UsernameValidator "UsernameValidator";
import BettingManager "BettingManager";
import BettingTypes "BettingTypes";
import RaceClassUtils "RaceClassUtils";
import BotDedication "BotDedication";
import ResonanceSystem "ResonanceSystem";
import TT "mo:timer-tool";
import Star "mo:star/star";

// // Migration function to add dnf field to RaceResult
// // This runs on upgrade to add the new DNF (Did Not Finish) tracking field
// (with migration =
//   func(old : {
//     var stable_races : Map.Map<Nat, {
//       raceId : Nat;
//       name : Text;
//       distance : Nat;
//       terrain : RacingSimulator.Terrain;
//       trackId : Nat;
//       trackSeed : Nat;
//       raceClass : RacingSimulator.RaceClass;
//       entryFee : Nat;
//       maxEntries : Nat;
//       minEntries : Nat;
//       startTime : Int;
//       duration : Nat;
//       entryDeadline : Int;
//       createdAt : Int;
//       entries : [RacingSimulator.RaceEntry];
//       status : RacingSimulator.RaceStatus;
//       results : ?[{
//         nftId : Text;
//         owner : Principal;
//         position : Nat;
//         finalTime : Float;
//         prizeAmount : Nat;
//         partsEarned : Nat;
//         partType : Text;
//         stats : ?RacingSimulator.RacingStats;
//         // NOTE: dnf field is missing in old data
//       }];
//       events : [RacingSimulator.RaceEvent];
//       prizePool : Nat;
//       platformTax : Nat;
//       platformBonus : Nat;
//       sponsors : [RacingSimulator.Sponsor];
//     }>;
//   }) : {
//     var stable_races : Map.Map<Nat, RacingSimulator.Race>;
//   } {
//     Debug.print("Migration: Adding dnf field to RaceResult in stored races");

//     // Migrate races - add dnf = false for all existing results
//     let migratedRaces = Map.new<Nat, RacingSimulator.Race>();
//     var raceCount = 0;
//     for ((raceId, oldRace) in Map.entries(old.stable_races)) {
//       // Migrate results to add dnf field
//       let newResults : ?[RacingSimulator.RaceResult] = switch (oldRace.results) {
//         case (?results) {
//           ?Array.map<{
//             nftId : Text;
//             owner : Principal;
//             position : Nat;
//             finalTime : Float;
//             prizeAmount : Nat;
//             partsEarned : Nat;
//             partType : Text;
//             stats : ?RacingSimulator.RacingStats;
//           }, RacingSimulator.RaceResult>(results, func(r) : RacingSimulator.RaceResult {
//             {
//               nftId = r.nftId;
//               owner = r.owner;
//               position = r.position;
//               finalTime = r.finalTime;
//               prizeAmount = r.prizeAmount;
//               partsEarned = r.partsEarned;
//               partType = r.partType;
//               stats = r.stats;
//               dnf = false; // Existing races - all bots finished
//             }
//           });
//         };
//         case (null) { null };
//       };

//       let newRace : RacingSimulator.Race = {
//         raceId = oldRace.raceId;
//         name = oldRace.name;
//         distance = oldRace.distance;
//         terrain = oldRace.terrain;
//         trackId = oldRace.trackId;
//         trackSeed = oldRace.trackSeed;
//         raceClass = oldRace.raceClass;
//         entryFee = oldRace.entryFee;
//         maxEntries = oldRace.maxEntries;
//         minEntries = oldRace.minEntries;
//         startTime = oldRace.startTime;
//         duration = oldRace.duration;
//         entryDeadline = oldRace.entryDeadline;
//         createdAt = oldRace.createdAt;
//         entries = oldRace.entries;
//         status = oldRace.status;
//         results = newResults;
//         events = oldRace.events;
//         prizePool = oldRace.prizePool;
//         platformTax = oldRace.platformTax;
//         platformBonus = oldRace.platformBonus;
//         sponsors = oldRace.sponsors;
//       };
//       ignore Map.put(migratedRaces, Map.nhash, raceId, newRace);
//       raceCount += 1;
//     };
//     Debug.print("Races migrated with dnf field: " # Nat.toText(raceCount));

//     {
//       var stable_races = migratedRaces;
//     };
//   }
// )
shared ({ caller = deployer }) persistent actor class McpServer(
  args : ?{
    owner : ?Principal;
    extCanisterId : ?Principal;
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
  let stable_base_stats = Map.new<Nat, { speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat; faction : PokedBotsGarage.FactionType }>();

  // Stable state for racing stats (PokedBots-specific)
  let stable_racing_stats = Map.new<Nat, PokedBotsGarage.PokedBotRacingStats>();
  let stable_active_upgrades = Map.new<Nat, PokedBotsGarage.UpgradeSession>();
  let stable_user_inventories = Map.new<Principal, PokedBotsGarage.UserInventory>();
  let stable_pity_counters = Map.new<Nat, Nat>(); // Upgrade failure pity system

  // Stable state for races (generic racing)
  let stable_races = Map.new<Nat, RacingSimulator.Race>();

  // Stable state for calendar events
  let stable_events = Map.new<Nat, RaceCalendar.ScheduledEvent>();

  // Stable state for leaderboards
  let stable_monthly_boards = Map.new<Nat, Map.Map<Nat, Leaderboard.LeaderboardEntry>>();
  let stable_season_boards = Map.new<Nat, Map.Map<Nat, Leaderboard.LeaderboardEntry>>();
  let stable_alltime_board = Map.new<Nat, Leaderboard.LeaderboardEntry>();
  let stable_faction_boards = Map.new<Text, Map.Map<Nat, Leaderboard.LeaderboardEntry>>();

  // Stable state for prize payment tracking (prevents duplicate payments)
  // Key: "raceId:owner:amount" - ensures each prize is only paid once
  let stable_paid_prizes = Map.new<Text, Int>(); // Maps prize key to timestamp when paid

  // Stable state for betting system
  let stable_betting_pools = Map.new<Nat, BettingTypes.BettingPool>(); // raceId -> BettingPool
  let stable_betting_bets = Map.new<Nat, BettingTypes.Bet>(); // betId -> Bet
  let stable_betting_user_bets = Map.new<Principal, [Nat]>(); // userId -> [betIds]
  let stable_betting_user_stats = Map.new<Principal, BettingTypes.UserBettingStats>(); // userId -> stats
  var stable_betting_next_bet_id : Nat = 1;
  var stable_platform_treasury : Principal = Principal.fromText("aaaaa-aa"); // Will be set on initialization

  // Stable state for user preferences (starred bots)
  let stable_user_starred_bots = Map.new<Principal, [Nat]>(); // userId -> [tokenIndex]

  // Stable state for user bot roles (racers vs scavengers)
  let stable_user_racer_bots = Map.new<Principal, [Nat]>(); // userId -> [tokenIndex] tagged as racers
  let stable_user_scavenger_bots = Map.new<Principal, [Nat]>(); // userId -> [tokenIndex] tagged as scavengers

  // Stable state for bot dedication system (per-bot investment and activity tracking)
  let stable_bot_dedication = Map.new<Nat, BotDedication.BotDedicationProfile>(); // tokenIndex -> profile

  // --- DIAGNOSTIC DATA COLLECTION ---
  // Stable storage for timer diagnostic logs to debug disappearing race_create timers
  type TimerDiagnosticEntry = {
    timestamp : Int;
    handlerType : Text; // "race_create", "race_start", "race_finish", etc.
    actionId : { id : Nat; time : Nat };
    message : Text;
    existingTimerCount : Nat;
    scheduledNextTimer : Bool;
    nextTimerTime : ?Nat;
  };
  var stable_timer_diagnostics : [TimerDiagnosticEntry] = [];
  let MAX_DIAGNOSTIC_ENTRIES : Nat = 500; // Keep last 500 entries

  // Helper to add diagnostic entry
  func addTimerDiagnostic(entry : TimerDiagnosticEntry) {
    let newEntries = Array.append(stable_timer_diagnostics, [entry]);
    // Trim to max size, keeping newest entries
    if (newEntries.size() > MAX_DIAGNOSTIC_ENTRIES) {
      stable_timer_diagnostics := Array.tabulate<TimerDiagnosticEntry>(
        MAX_DIAGNOSTIC_ENTRIES,
        func(i : Nat) : TimerDiagnosticEntry {
          newEntries[newEntries.size() - MAX_DIAGNOSTIC_ENTRIES + i];
        },
      );
    } else {
      stable_timer_diagnostics := newEntries;
    };
  };

  // Constants
  let TRANSFER_FEE : Nat = 10_000; // 0.0001 ICP
  let PRIZE_DISTRIBUTION_TIMEOUT : Nat = 60_000_000_000; // 60 seconds timeout for prize transfers
  let RACE_BREAK_TIME : Nat = 30_000_000_000; // 30 seconds between chained races (commercial break)

  // NFT metadata storage
  transient let statsManager = Stats.StatsManager(stable_nft_stats, stable_trait_schema);

  transient let initManager = ClassPlus.ClassPlusInitializationManager(owner, thisPrincipal, true);

  // --- TT Setup ---
  private func reportTTExecution(execInfo : TT.ExecutionReport) : Bool {
    Debug.print("CANISTER: TimerTool Execution: " # debug_show (execInfo));
    // Log execution to diagnostics
    let (actionId, action) = execInfo.action;
    addTimerDiagnostic({
      timestamp = Time.now();
      handlerType = "TT_EXECUTION";
      actionId = { id = actionId.id; time = actionId.time };
      message = "Execution report: actionType=" # action.actionType # ", awaited=" # debug_show (execInfo.awaited);
      existingTimerCount = 0;
      scheduledNextTimer = false;
      nextTimerTime = null;
    });
    false;
  };

  // Maximum retries for different action types
  let MAX_RETRIES_CRITICAL = 5; // race_create, race_start - critical for system operation
  let MAX_RETRIES_IMPORTANT = 3; // race_finish, betting_pool_create, prize_distribution, bet_settlement
  let RETRY_DELAY_NS = 30_000_000_000; // 30 seconds between retries

  private func reportTTError(errInfo : TT.ErrorReport) : ?Nat {
    Debug.print("CANISTER: TimerTool Error: " # debug_show (errInfo));
    // Log error to diagnostics
    let (actionId, action) = errInfo.action;

    // Determine max retries based on action type
    let maxRetries = switch (action.actionType) {
      case ("race_create") { MAX_RETRIES_CRITICAL };
      case ("race_start") { MAX_RETRIES_CRITICAL };
      case ("race_finish") { MAX_RETRIES_IMPORTANT };
      case ("betting_pool_create") { MAX_RETRIES_IMPORTANT };
      case ("prize_distribution") { MAX_RETRIES_IMPORTANT };
      case ("bet_settlement") { MAX_RETRIES_IMPORTANT };
      case (_) { 0 }; // Don't retry unknown action types
    };

    // Check if we should retry
    let shouldRetry = action.retries < maxRetries;
    let retryTime = if (shouldRetry) { ?Int.abs(Time.now() + RETRY_DELAY_NS) } else {
      null;
    };

    addTimerDiagnostic({
      timestamp = Time.now();
      handlerType = "TT_ERROR";
      actionId = { id = actionId.id; time = actionId.time };
      message = "Error report: actionType=" # action.actionType #
      ", retries=" # Nat.toText(action.retries) # "/" # Nat.toText(maxRetries) #
      ", willRetry=" # debug_show (shouldRetry) #
      ", error=" # debug_show (errInfo.error);
      existingTimerCount = 0;
      scheduledNextTimer = shouldRetry;
      nextTimerTime = retryTime;
    });

    retryTime;
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
  // Can be overridden via init args for testing, defaults to production
  var extCanisterId = Option.get(
    do ? { args!.extCanisterId! },
    Principal.fromText("bzsui-sqaaa-aaaah-qce2a-cai"),
  );
  transient let extCanister = ExtIntegration.getExtCanister(extCanisterId);

  // ICP Ledger Canister ID (optional, can be set dynamically)
  var icpLedgerCanisterId : ?Principal = null;

  // PokedBots Garage Manager (collection-specific logic)
  // Bot Dedication Manager (per-bot investment and activity tracking for tier benefits)
  // NOTE: Must be instantiated before garageManager since garageManager uses getTierBenefits callback
  transient let dedicationManager = BotDedication.DedicationManager(stable_bot_dedication);

  transient let garageManager = PokedBotsGarage.PokedBotsGarageManager(
    stable_racing_stats,
    stable_active_upgrades,
    stable_user_inventories,
    stable_pity_counters,
    {
      getNFTMetadata = func(tokenId : Nat) : ?[(Text, Text)] {
        statsManager.getNFTMetadata(tokenId);
      };
      getPrecomputedStats = func(tokenId : Nat) : ?{
        speed : Nat;
        powerCore : Nat;
        acceleration : Nat;
        stability : Nat;
        faction : PokedBotsGarage.FactionType;
      } {
        Map.get(stable_base_stats, Map.nhash, tokenId);
      };
      getTierBenefits = func(tokenId : Nat) : BotDedication.TierBenefits {
        dedicationManager.getBenefitsForBot(tokenId);
      };
      getBenefitsForBot = func(tokenIndex : Nat) : BotDedication.TierBenefits {
        dedicationManager.getBenefitsForBot(tokenIndex);
      };
    },
  );

  // Racing Simulator (generic racing engine)
  transient let raceSimulator = RacingSimulator.RaceSimulator();

  // Race Manager (uses generic racing logic)
  transient let raceManager = RacingSimulator.RaceManager(stable_races);

  // Event calendar manager
  transient let eventCalendar = RaceCalendar.EventCalendar(stable_events);

  /// Get race class based on overall rating (average of max stats)
  func getRaceClassFromRating(overallRating : Nat) : RacingSimulator.RaceClass {
    // Delegate to centralized utility to ensure consistency
    RaceClassUtils.getRaceClassFromRating(overallRating);
  };

  /// Calculate overall rating from max stats (for race class determination)
  /// This should be used for determining race eligibility, not current degraded stats
  func calculateMaxRating(botStats : PokedBotsGarage.PokedBotRacingStats) : Nat {
    let baseStats = garageManager.getBaseStats(botStats.tokenIndex);
    let maxSpeed = baseStats.speed + botStats.speedBonus;
    let maxPowerCore = baseStats.powerCore + botStats.powerCoreBonus;
    let maxAcceleration = baseStats.acceleration + botStats.accelerationBonus;
    let maxStability = baseStats.stability + botStats.stabilityBonus;
    (maxSpeed + maxPowerCore + maxAcceleration + maxStability) / 4;
  };

  // Leaderboard manager
  transient let leaderboardManager = Leaderboard.LeaderboardManager(
    stable_monthly_boards,
    stable_season_boards,
    stable_alltime_board,
    stable_faction_boards,
    func(tokenIndex : Nat) : RacingSimulator.RaceClass {
      // Calculate race class from current stats (inlined to avoid forward reference issues)
      switch (garageManager.getStats(tokenIndex)) {
        case (?botStats) {
          let baseStats = garageManager.getBaseStats(botStats.tokenIndex);
          let maxSpeed = baseStats.speed + botStats.speedBonus;
          let maxPowerCore = baseStats.powerCore + botStats.powerCoreBonus;
          let maxAcceleration = baseStats.acceleration + botStats.accelerationBonus;
          let maxStability = baseStats.stability + botStats.stabilityBonus;
          let overallRating = (maxSpeed + maxPowerCore + maxAcceleration + maxStability) / 4;

          // Determine race class based on rating
          if (overallRating >= 50) {
            #SilentKlan;
          } else if (overallRating >= 40) {
            #Elite;
          } else if (overallRating >= 30) {
            #Raider;
          } else if (overallRating >= 20) {
            #Junker;
          } else {
            #Scrap;
          };
        };
        case (null) { #Scrap }; // Default if no stats
      };
    },
  );

  // Betting manager (integrated into racing canister)
  transient let bettingManager = BettingManager.BettingManager(
    stable_betting_pools,
    stable_betting_bets,
    stable_betting_user_bets,
    stable_betting_user_stats,
    stable_betting_next_bet_id,
    stable_platform_treasury,
    Option.get(icpLedgerCanisterId, Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai")) // Default to local ledger, will be set properly
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

  // transient let beaconContext : ?Beacon.BeaconContext = null;

  // --- UNCOMMENT THIS BLOCK TO ENABLE THE BEACON ---
  let beaconCanisterId = Principal.fromText("m63pw-fqaaa-aaaai-q33pa-cai");
  transient let beaconContext : ?Beacon.BeaconContext = ?Beacon.init(
    beaconCanisterId, // Public beacon canister ID
    ?(15 * 60), // Send a beacon every 15 minutes
  );
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

  // Handle completed upgrades with V2 RNG mechanics
  func handleUpgradeCompletion<system>(actionId : TT.ActionId, action : TT.Action) : TT.ActionId {
    Debug.print("Upgrade completion handler triggered (V2)");

    // Decode the token index from params
    let tokenIndexOpt : ?Nat = from_candid (action.params);

    switch (tokenIndexOpt) {
      case (?tokenIndex) {
        Debug.print("Processing upgrade completion for token " # debug_show (tokenIndex));

        // Get the active upgrade session
        switch (garageManager.getActiveUpgrade(tokenIndex)) {
          case (?session) {
            Debug.print("Found active upgrade session: " # debug_show (session.upgradeType));

            // CRITICAL: Verify that the upgrade duration has actually elapsed
            let now = Time.now();
            if (now < session.endsAt) {
              let remainingMs = (session.endsAt - now) / 1_000_000;
              Debug.print("ERROR: Upgrade called too early! Still " # debug_show (remainingMs) # "ms remaining. Ignoring.");
              return actionId; // Don't process - return immediately
            };

            // Get current stats
            switch (garageManager.getStats(tokenIndex)) {
              case (?stats) {
                // Get current stats for calculation
                let currentStats = garageManager.getCurrentStats(stats);

                let (currentStatValue, upgradeCount) = switch (session.upgradeType) {
                  case (#Velocity) { (currentStats.speed, stats.speedUpgrades) };
                  case (#PowerCore) {
                    (currentStats.powerCore, stats.powerCoreUpgrades);
                  };
                  case (#Thruster) {
                    (currentStats.acceleration, stats.accelerationUpgrades);
                  };
                  case (#Gyro) {
                    (currentStats.stability, stats.stabilityUpgrades);
                  };
                  case (#Luck) {
                    // Current luck = luckBase (set at init) + luckBonus (from upgrades)
                    (stats.luckBase + stats.luckBonus, stats.luckUpgrades);
                  };
                };

                // Get base stat for attempt calculation
                let baseStat = switch (session.upgradeType) {
                  case (#Velocity) { currentStats.speed - stats.speedBonus };
                  case (#PowerCore) {
                    currentStats.powerCore - stats.powerCoreBonus;
                  };
                  case (#Thruster) {
                    currentStats.acceleration - stats.accelerationBonus;
                  };
                  case (#Gyro) { currentStats.stability - stats.stabilityBonus };
                  case (#Luck) { stats.luckBase };
                };

                let attemptNumber = currentStatValue - baseStat;

                // Calculate success rate with pity
                let successRate = garageManager.calculateSuccessRate(attemptNumber, session.consecutiveFails);

                // Generate RNG seed with proper hashing to avoid modulo bias
                // Use XOR-based combination for better distribution
                let timeNanos = Int.abs(Time.now());
                let entropy = garageManager.getNextEntropy();
                let combined = garageManager.combineRNG(tokenIndex, timeNanos, entropy);
                let hashedSeed = garageManager.hashForRNG(combined);
                let seed = Nat32.fromNat(hashedSeed % 4_294_967_296);

                // Roll for success
                let roll = Nat32.toNat(seed % 100);
                let success = Float.fromInt(roll) < successRate;

                Debug.print("Upgrade roll: " # debug_show (roll) # " vs success rate: " # debug_show (successRate) # " = " # debug_show (success));

                if (success) {
                  // Success! Check for double points
                  let doubleChance = 15.0 - (Float.fromInt(attemptNumber) * 0.87);
                  let doubleRoll = Nat32.toNat((seed / 100) % 100);
                  let isDouble = Float.fromInt(doubleRoll) < Float.max(2.0, doubleChance);
                  let pointsAwarded = if (isDouble) { 2 } else { 1 };

                  Debug.print("SUCCESS! Points awarded: " # debug_show (pointsAwarded) # (if (isDouble) { " 🎰 DOUBLE!" } else { "" }));

                  // Apply the stat boost
                  let updatedStats = switch (session.upgradeType) {
                    case (#Velocity) {
                      {
                        stats with
                        speedBonus = stats.speedBonus + pointsAwarded;
                        speedUpgrades = stats.speedUpgrades + 1;
                        experience = stats.experience + 5;
                        factionReputation = stats.factionReputation + 2;
                        upgradeEndsAt = null;
                        listedForSale = false;
                      };
                    };
                    case (#PowerCore) {
                      {
                        stats with
                        powerCoreBonus = stats.powerCoreBonus + pointsAwarded;
                        powerCoreUpgrades = stats.powerCoreUpgrades + 1;
                        experience = stats.experience + 5;
                        factionReputation = stats.factionReputation + 2;
                        upgradeEndsAt = null;
                        listedForSale = false;
                      };
                    };
                    case (#Thruster) {
                      {
                        stats with
                        accelerationBonus = stats.accelerationBonus + pointsAwarded;
                        accelerationUpgrades = stats.accelerationUpgrades + 1;
                        experience = stats.experience + 5;
                        factionReputation = stats.factionReputation + 2;
                        upgradeEndsAt = null;
                        listedForSale = false;
                      };
                    };
                    case (#Gyro) {
                      {
                        stats with
                        stabilityBonus = stats.stabilityBonus + pointsAwarded;
                        stabilityUpgrades = stats.stabilityUpgrades + 1;
                        experience = stats.experience + 10;
                        factionReputation = stats.factionReputation + 3;
                        upgradeEndsAt = null;
                        listedForSale = false;
                      };
                    };
                    case (#Luck) {
                      {
                        stats with
                        luckBonus = stats.luckBonus + pointsAwarded;
                        luckUpgrades = stats.luckUpgrades + 1;
                        experience = stats.experience + 5;
                        factionReputation = stats.factionReputation + 2;
                        upgradeEndsAt = null;
                        listedForSale = false;
                      };
                    };
                  };

                  garageManager.updateStats(tokenIndex, updatedStats);
                  garageManager.clearUpgrade(tokenIndex);
                  // Reset pity counter on success
                  garageManager.setPityCounter(tokenIndex, 0);
                } else {
                  // Failure! Refund 50% (ICP or parts) and increment pity counter
                  let newPityCounter = session.consecutiveFails + 1;

                  // Update stats without stat increase but reset upgrade session
                  let updatedStats = {
                    stats with
                    upgradeEndsAt = null;
                    listedForSale = false;
                  };
                  garageManager.updateStats(tokenIndex, updatedStats);

                  // Store pity counter for next attempt
                  garageManager.setPityCounter(tokenIndex, newPityCounter);
                  garageManager.clearUpgrade(tokenIndex);

                  // Refund based on payment method
                  if (session.paymentMethod == "icp") {
                    // Refund 50% of ICP cost
                    let refundAmount = session.costPaid / 2;
                    Debug.print("FAILED! Refunding " # debug_show (refundAmount) # " e8s (50% ICP), pity: " # debug_show (newPityCounter));

                    if (refundAmount > 0) {
                      let refundActionId = tt().setActionASync<system>(
                        Int.abs(Time.now() + 1_000_000_000), // 1 second delay
                        {
                          actionType = "prize_distribution";
                          params = to_candid ({
                            raceId = 0; // Not a race prize, use 0
                            owner = stats.ownerPrincipal;
                            amount = refundAmount;
                          });
                        },
                        PRIZE_DISTRIBUTION_TIMEOUT,
                      );
                      Debug.print("Scheduled ICP refund " # debug_show (refundActionId) # " of " # debug_show (refundAmount) # " e8s to " # Principal.toText(stats.ownerPrincipal));
                    };
                  } else {
                    // Refund 50% of parts cost
                    let partsToRefund = session.partsUsed / 2;
                    Debug.print("FAILED! Refunding " # debug_show (partsToRefund) # " parts (50%), pity: " # debug_show (newPityCounter));

                    if (partsToRefund > 0) {
                      // Determine part type from upgrade type
                      let partType : PokedBotsGarage.PartType = switch (session.upgradeType) {
                        case (#Velocity) { #SpeedChip };
                        case (#PowerCore) { #PowerCoreFragment };
                        case (#Thruster) { #ThrusterKit };
                        case (#Gyro) { #GyroModule };
                        case (#Luck) { #UniversalPart }; // Luck upgrades would use universal parts
                      };
                      garageManager.refundParts(stats.ownerPrincipal, partType, partsToRefund);
                      Debug.print("Refunded " # debug_show (partsToRefund) # " " # debug_show (partType) # " to " # Principal.toText(stats.ownerPrincipal));
                    };
                  };
                };

                Debug.print("Upgrade completion processed");
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

  // Handle automatic race creation (recurring timer)
  func handleRaceCreation<system>(actionId : TT.ActionId, _action : TT.Action) : TT.ActionId {
    Debug.print("Race creation handler triggered");

    let now = Time.now();

    // Log diagnostic at entry
    let existingRaceCreateActionsAtEntry = tt().getActionsByFilter(#ByType("race_create"));
    addTimerDiagnostic({
      timestamp = now;
      handlerType = "race_create_ENTRY";
      actionId = { id = actionId.id; time = actionId.time };
      message = "Handler entry. Existing race_create timers: " # Nat.toText(existingRaceCreateActionsAtEntry.size());
      existingTimerCount = existingRaceCreateActionsAtEntry.size();
      scheduledNextTimer = false;
      nextTimerTime = null;
    });

    // First, ensure we have upcoming calendar events scheduled
    ensureCalendarScheduled<system>(now);

    // Get events that need races created (within next 7 days, no races yet)
    let upcomingEvents = eventCalendar.getUpcomingEvents(now, 7);

    for (event in upcomingEvents.vals()) {
      // Create races for events that don't have them yet
      if (event.raceIds.size() == 0) {
        // NEW SYSTEM: Wait for registration to close before creating races
        // Skip events where registration is still open - races will be created
        // when the timer runs again after registration closes
        if (now < event.registrationCloses) {
          Debug.print("Waiting for registration to close for event " # Nat.toText(event.eventId) # " (closes at " # Int.toText(event.registrationCloses) # ")");
          // Don't process this event yet - will be processed after registration closes
        } else if (event.registrations.size() == 0) {
          // Registration closed but no one registered - skip this event entirely
          Debug.print("Skipping race creation for event " # Nat.toText(event.eventId) # " - registration closed with no participants");
          // No races to create for an event with no registrations
        } else {
          // Registration has closed AND we have registrations - proceed with race creation
          var createdRaceIds : [Nat] = [];
          var raceIndex : Nat = 0;

          // NEW SYSTEM: Event has registrations - create heats from registered bots
          Debug.print("Creating races from " # Nat.toText(event.registrations.size()) # " registrations for event " # Nat.toText(event.eventId));

          // Helper function to get bot rating for skill-based allocation
          let getElo = func(tokenIndex : Nat) : Nat {
            switch (garageManager.getStats(tokenIndex)) {
              case (?stats) { garageManager.calculateOverallRating(stats) };
              case (null) { 50 }; // Default rating for unknown bots
            };
          };

          // Group registrations by race class
          let registrationsByClass = eventCalendar.getRegistrationsByClass(event.eventId);

          // Get heat allocation strategy from event (default to SnakeDraft)
          let heatStrategy = switch (event.raceCreationMode) {
            case (#Automatic(config)) { config.heatAllocation };
            case (#Manual(config)) { config.heatAllocation };
          };

          // Handle race creation based on mode
          switch (event.raceCreationMode) {
            // ============================================================
            // MANUAL MODE: Multi-stage events with predefined templates
            // Each template defines a specific race configuration (stage)
            // All registered bots in the matching class participate in each stage
            // ============================================================
            case (#Manual(manualConfig)) {
              var stageNumber = 0;

              // Pre-calculate how many races (stages) each class will have
              // This is used to split entry fees proportionally across races
              func countRacesForClass(raceClass : RacingSimulator.RaceClass) : Nat {
                var count : Nat = 0;
                for (t in manualConfig.raceTemplates.vals()) {
                  if (t.raceClass == raceClass) {
                    count += 1;
                  };
                };
                count;
              };

              // Check if this is a multi-stage event with aggregate scoring
              // Multi-stage events (Cumulative or TeamAggregate) should NOT have per-race prizes
              // All prizes are distributed at the EVENT level based on cumulative standings
              let isMultiStagePrizing = switch (event.metadata.scoringMode) {
                case (#Cumulative) { true };
                case (#TeamAggregate) { true };
                case (#Individual) { false };
                case (#Elimination) { false };
              };

              if (isMultiStagePrizing) {
                Debug.print("Multi-stage event with " # debug_show (event.metadata.scoringMode) # " scoring - prizes will be distributed at event level, not per-race");
              };

              for (template in manualConfig.raceTemplates.vals()) {
                stageNumber += 1;

                // Find registrations for this template's class
                var classRegistrations : [RaceCalendar.EventRegistration] = [];
                for ((regClass, regs) in registrationsByClass.vals()) {
                  if (regClass == template.raceClass) {
                    classRegistrations := regs;
                  };
                };

                // Skip if not enough registrations for this class
                if (classRegistrations.size() < event.metadata.minEntries) {
                  Debug.print("Skipping stage " # Nat.toText(stageNumber) # " (" # debug_show (template.raceClass) # ") - only " # Nat.toText(classRegistrations.size()) # " registrations");
                } else {
                  // Split into heats
                  let heats = eventCalendar.splitIntoHeats(
                    classRegistrations,
                    8,
                    heatStrategy,
                    getElo,
                  );

                  let stageName = switch (template.stageName) {
                    case (?name) { name };
                    case (null) { "Stage " # Nat.toText(stageNumber) };
                  };

                  Debug.print("Creating " # Nat.toText(heats.size()) # " races for " # stageName # " (" # debug_show (template.raceClass) # ")");

                  var heatNumber = 1;
                  for (heat in heats.vals()) {
                    // Calculate entry fee and platform bonus
                    // For multi-stage events with aggregate scoring, individual races get NO prizes
                    // All prizes are distributed at event completion based on cumulative standings
                    let (adjustedEntryFee, platformBonus) = if (isMultiStagePrizing) {
                      // Multi-stage: No per-race prizes
                      (0 : Nat, 0 : Nat);
                    } else {
                      // Single-stage: Split entry fees and platform bonus across races
                      let classFeeMultiplier : Float = switch (template.raceClass) {
                        case (#Scrap) { 1.0 };
                        case (#Junker) { 1.5 };
                        case (#Raider) { 2.0 };
                        case (#Elite) { 2.5 };
                        case (#SilentKlan) { 3.0 };
                      };

                      let racesForThisClass = countRacesForClass(template.raceClass);
                      let perRaceFee = if (racesForThisClass > 0) {
                        Int.abs(Float.toInt(Float.fromInt(event.metadata.entryFee) * classFeeMultiplier)) / racesForThisClass;
                      } else {
                        0;
                      };

                      // Platform bonus based on event type and class (40% contribution)
                      let basePlatformBonus : Nat = switch (event.eventType, template.raceClass) {
                        case (#DailySprint, #Scrap) { 110_000_000 };
                        case (#DailySprint, #Junker) { 160_000_000 };
                        case (#DailySprint, #Raider) { 210_000_000 };
                        case (#DailySprint, #Elite) { 270_000_000 };
                        case (#DailySprint, #SilentKlan) { 320_000_000 };
                        case (#WeeklyLeague, #Scrap) { 80_000_000 };
                        case (#WeeklyLeague, #Junker) { 160_000_000 };
                        case (#WeeklyLeague, #Raider) { 240_000_000 };
                        case (#WeeklyLeague, #Elite) { 320_000_000 };
                        case (#WeeklyLeague, #SilentKlan) { 480_000_000 };
                        case (#MonthlyCup, #Elite) { 800_000_000 };
                        case (#MonthlyCup, #SilentKlan) { 1_200_000_000 };
                        case _ { event.metadata.prizePoolBonus };
                      };
                      // Split platform bonus across races for this class
                      let splitBonus = if (racesForThisClass > 0) {
                        basePlatformBonus / racesForThisClass;
                      } else {
                        basePlatformBonus;
                      };

                      (perRaceFee, splitBonus);
                    };

                    // Calculate start time for this stage (base + offset)
                    let stageStartTime = event.scheduledTime + template.startOffset;

                    // Create race with template values
                    let race = raceManager.createRace(
                      template.distance,
                      template.terrain,
                      template.raceClass,
                      adjustedEntryFee,
                      heat.size(),
                      heat.size(),
                      stageStartTime,
                      platformBonus,
                      event.registrationCloses,
                    );

                    // Update race name to include stage
                    ignore raceManager.updateRaceName(race.raceId, event.metadata.name # " - " # stageName # (if (heats.size() > 1) { " (Heat " # Nat.toText(heatNumber) # ")" } else { "" }));

                    // Add all heat members
                    for (registration in heat.vals()) {
                      ignore raceManager.addEntryWithoutPayment(race.raceId, registration.tokenIndex, registration.owner);
                    };

                    createdRaceIds := Array.append(createdRaceIds, [race.raceId]);

                    Debug.print("Created stage race " # Nat.toText(race.raceId) # ": " # stageName # " (Heat " # Nat.toText(heatNumber) # ") at offset " # Int.toText(template.startOffset));

                    // Schedule betting pool
                    ignore tt().setActionASync<system>(
                      Int.abs(event.registrationCloses),
                      {
                        actionType = "betting_pool_create";
                        params = to_candid (race.raceId);
                      },
                      3_600_000_000_000,
                    );

                    // Schedule race start:
                    // - For each stage (unique startOffset), only schedule Heat 1
                    // - Heat 2+ within the same stage will CHAIN after Heat 1 finishes
                    //   (handled by handleRaceFinish which triggers next race in event.raceIds)
                    // - Different stages run independently at their scheduled times
                    if (heatNumber == 1) {
                      // First heat of this stage - schedule it at the stage start time
                      ignore tt().setActionASync<system>(
                        Int.abs(stageStartTime),
                        {
                          actionType = "race_start";
                          params = to_candid (race.raceId);
                        },
                        3_600_000_000_000,
                      );
                      Debug.print("Scheduled race start for " # stageName # " Heat 1 at " # Int.toText(stageStartTime));
                    } else {
                      Debug.print("Heat " # Nat.toText(heatNumber) # " of " # stageName # " will chain after Heat " # Nat.toText(heatNumber - 1) # " finishes");
                    };

                    raceIndex += 1;
                    heatNumber += 1;
                  };
                };
              };
            };

            // ============================================================
            // AUTOMATIC MODE: Standard race creation (existing behavior)
            // Creates races based on registrations and random terrain/distance
            // ============================================================
            case (#Automatic(_autoConfig)) {
              // Process each class
              for ((raceClass, classRegistrations) in registrationsByClass.vals()) {
                // Skip classes that don't meet minimum entries requirement
                // This saves resources instead of creating races that will be cancelled
                if (classRegistrations.size() < event.metadata.minEntries) {
                  Debug.print("Skipping " # debug_show (raceClass) # " - only " # Nat.toText(classRegistrations.size()) # " registrations (need " # Nat.toText(event.metadata.minEntries) # "). Refunding entry fees.");

                  // Refund entry fees for registrations in classes that didn't fill
                  for (registration in classRegistrations.vals()) {
                    if (registration.entryFeePaid > 0) {
                      let refundActionId = tt().setActionASync<system>(
                        Int.abs(Time.now() + 1_000_000_000), // 1 second delay
                        {
                          actionType = "prize_distribution";
                          params = to_candid ({
                            raceId = 0 : Nat; // No race exists, use 0
                            owner = registration.owner;
                            amount = registration.entryFeePaid;
                          });
                        },
                        3_600_000_000_000, // 1 hour timeout
                      );
                      Debug.print("Scheduled refund " # debug_show (refundActionId) # " of " # Nat.toText(registration.entryFeePaid) # " e8s to " # Principal.toText(registration.owner) # " (class didn't fill)");
                    };
                  };

                } else {
                  // Split into heats of max 8 players
                  let heats = eventCalendar.splitIntoHeats(
                    classRegistrations,
                    8,
                    heatStrategy,
                    getElo,
                  );

                  Debug.print("Split " # Nat.toText(classRegistrations.size()) # " " # debug_show (raceClass) # " registrations into " # Nat.toText(heats.size()) # " heats");

                  // Create a race for each heat
                  var heatNumber = 1;
                  for (heat in heats.vals()) {
                    // Determine distance and terrain for this heat's race
                    // Use entropy from registration data that isn't known until close:
                    // - Total registration count across all classes
                    // - Sum of token indices (unique per registration set)
                    // - Current nanosecond timestamp (unpredictable execution timing)
                    var tokenIndexSum : Nat = 0;
                    for (reg in event.registrations.vals()) {
                      tokenIndexSum += reg.tokenIndex;
                    };
                    let registrationEntropy = event.registrations.size() * 31337 + tokenIndexSum;
                    let timeEntropy = Int.abs(Time.now()) % 1_000_000_000; // Nanosecond component
                    let seed = Nat32.fromNat(Int.abs((event.scheduledTime + event.eventId * 7919 + createdRaceIds.size() * 1000000 + registrationEntropy + timeEntropy) % 1000000000));

                    let (distance, terrain) = switch (event.raceCreationMode) {
                      case (#Automatic(config)) {
                        // Use configured distance range and terrain options
                        let distMin = config.distanceRange.min;
                        let distMax = config.distanceRange.max;
                        let distRange = distMax - distMin;
                        let dist = if (distRange > 0) {
                          distMin + Nat32.toNat(seed % Nat32.fromNat(distRange + 1));
                        } else {
                          distMin;
                        };

                        // Pick terrain from configured options
                        let terrainCount = config.terrains.size();
                        let terr = if (terrainCount > 0) {
                          config.terrains[Nat32.toNat(seed % Nat32.fromNat(terrainCount))];
                        } else {
                          #ScrapHeaps; // Fallback
                        };

                        (dist, terr);
                      };
                      case (#Manual(templates)) {
                        // Manual mode: use race templates (TODO: implement template selection)
                        // For now, fall back to event type defaults
                        switch (event.eventType) {
                          case (#WeeklyLeague) {
                            let leagueDistances = [15, 20, 25, 30];
                            let dist = leagueDistances[Nat32.toNat(seed % 4)];
                            let terr = switch (Nat32.toNat((seed / 4) % 3)) {
                              case (0) { #WastelandSand };
                              case (1) { #MetalRoads };
                              case (_) { #ScrapHeaps };
                            };
                            (dist, terr);
                          };
                          case (#MonthlyCup) {
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
                            let sprintDistances = [5, 7, 10];
                            let dist = sprintDistances[Nat32.toNat(seed % 3)];
                            let terr = switch (Nat32.toNat(seed % 3)) {
                              case (0) { #ScrapHeaps };
                              case (1) { #WastelandSand };
                              case (_) { #MetalRoads };
                            };
                            (dist, terr);
                          };
                          case (#SpecialEvent(_)) {
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
                      };
                    };

                    // Calculate entry fee for this class (shifted up one bracket)
                    let classFeeMultiplier : Float = switch (raceClass) {
                      case (#Scrap) { 1.0 };
                      case (#Junker) { 1.5 };
                      case (#Raider) { 2.0 };
                      case (#Elite) { 2.5 };
                      case (#SilentKlan) { 3.0 };
                    };
                    let adjustedEntryFee = Int.abs(Float.toInt(Float.fromInt(event.metadata.entryFee) * classFeeMultiplier));

                    // Platform bonus (40% contribution)
                    let platformBonus : Nat = switch (event.eventType, raceClass) {
                      case (#DailySprint, #Scrap) { 110_000_000 };
                      case (#DailySprint, #Junker) { 160_000_000 };
                      case (#DailySprint, #Raider) { 210_000_000 };
                      case (#DailySprint, #Elite) { 270_000_000 };
                      case (#DailySprint, #SilentKlan) { 320_000_000 };
                      case (#WeeklyLeague, #Scrap) { 80_000_000 };
                      case (#WeeklyLeague, #Junker) { 160_000_000 };
                      case (#WeeklyLeague, #Raider) { 240_000_000 };
                      case (#WeeklyLeague, #Elite) { 320_000_000 };
                      case (#WeeklyLeague, #SilentKlan) { 480_000_000 };
                      case (#MonthlyCup, #Elite) { 800_000_000 };
                      case (#MonthlyCup, #SilentKlan) { 1_200_000_000 };
                      case _ { event.metadata.prizePoolBonus };
                    };

                    // Create race with pre-populated entries
                    let race = raceManager.createRace(
                      distance,
                      terrain,
                      raceClass,
                      adjustedEntryFee,
                      heat.size(), // Max entries = heat size
                      heat.size(), // Min entries = heat size (already have all entries)
                      event.scheduledTime,
                      platformBonus,
                      event.registrationCloses,
                    );

                    // Add all heat members to the race (entry fees already paid at event registration)
                    for (registration in heat.vals()) {
                      // Entry was already paid at event registration time
                      ignore raceManager.addEntryWithoutPayment(race.raceId, registration.tokenIndex, registration.owner);
                    };

                    createdRaceIds := Array.append(createdRaceIds, [race.raceId]);

                    Debug.print("Created race " # Nat.toText(race.raceId) # " (Heat " # Nat.toText(heatNumber) # "/" # Nat.toText(heats.size()) # ") for " # event.metadata.name # ": " # race.name # " with " # Nat.toText(heat.size()) # " pre-registered entries");

                    // Schedule betting pool creation
                    let poolActionId = tt().setActionASync<system>(
                      Int.abs(event.registrationCloses),
                      {
                        actionType = "betting_pool_create";
                        params = to_candid (race.raceId);
                      },
                      3_600_000_000_000,
                    );

                    // Only schedule the first race - subsequent races will be chained
                    if (raceIndex == 0) {
                      let startActionId = tt().setActionASync<system>(
                        Int.abs(event.scheduledTime),
                        {
                          actionType = "race_start";
                          params = to_candid (race.raceId);
                        },
                        3_600_000_000_000,
                      );
                      Debug.print("Scheduled FIRST race start for race " # Nat.toText(race.raceId) # " at event time - subsequent races will chain");
                    };

                    raceIndex += 1;
                    heatNumber += 1;
                  };
                }; // Close else block (class met minimum entries)
              }; // Close for ((raceClass, classRegistrations)...)
            }; // Close #Automatic case
          }; // Close switch (event.raceCreationMode)

          // Atomically add races to event - only succeeds if event still has no races
          // This prevents race conditions where multiple timers try to create races for the same event
          switch (eventCalendar.addRacesToEventIfEmpty(event.eventId, createdRaceIds)) {
            case (?_updatedEvent) {
              // Success! We won the race to add races to this event
              Debug.print("Successfully associated " # Nat.toText(createdRaceIds.size()) # " races with event " # Nat.toText(event.eventId));
            };
            case (null) {
              // Either event disappeared OR another timer already added races
              // Clean up our duplicate races
              Debug.print("WARNING: Failed to add races to event " # Nat.toText(event.eventId) # " (another timer beat us or event disappeared). Cleaning up " # Nat.toText(createdRaceIds.size()) # " duplicate races");

              for (raceId in createdRaceIds.vals()) {
                switch (raceManager.getRace(raceId)) {
                  case (?race) {
                    ignore raceManager.updateRaceStatus(raceId, #Cancelled);

                    // Cancel the race_start timer
                    let raceStartTimers = tt().getActionsByFilter(#ByType("race_start"));
                    for ((timerId, timerAction) in raceStartTimers.vals()) {
                      let timerRaceIdOpt : ?Nat = from_candid (timerAction.params);
                      switch (timerRaceIdOpt) {
                        case (?timerRaceId) {
                          if (timerRaceId == raceId) {
                            ignore tt().cancelActionsByIds<system>([timerId.id]);
                          };
                        };
                        case (null) {};
                      };
                    };

                    ignore raceManager.deleteRace(raceId);
                  };
                  case (null) {};
                };
              };
            };
          };
        }; // Close else block (registration closed with participants)
      }; // Close if (event.raceIds.size() == 0)
    }; // Close for event loop

    // Schedule next race creation check in 5 minutes
    // This ensures races are created promptly after registration closes
    // First check if we already have a race_create scheduled for around this time to avoid duplicates
    let nextCreationTime = now + (5 * 60 * 1_000_000_000); // 5 minutes
    let existingRaceCreateActions = tt().getActionsByFilter(#ByType("race_create"));

    // Check if any existing race_create action is scheduled within 30 seconds of our target time
    var alreadyScheduled = false;
    for ((actionId, _action) in existingRaceCreateActions.vals()) {
      let timeDiff = if (actionId.time > Int.abs(nextCreationTime)) {
        actionId.time - Int.abs(nextCreationTime);
      } else {
        Int.abs(nextCreationTime) - actionId.time;
      };

      if (timeDiff < 30_000_000_000) {
        // Within 30 seconds
        alreadyScheduled := true;
      };
    };

    var nextActionId : TT.ActionId = { id = 0; time = 0 };
    if (not alreadyScheduled) {
      nextActionId := tt().setActionSync<system>(
        Int.abs(nextCreationTime),
        {
          actionType = "race_create";
          params = to_candid (());
        },
      );
      // Log successful scheduling
      addTimerDiagnostic({
        timestamp = Time.now();
        handlerType = "race_create_EXIT";
        actionId = { id = nextActionId.id; time = nextActionId.time };
        message = "Scheduled next race_create timer. Next time: " # Nat.toText(Int.abs(nextCreationTime));
        existingTimerCount = existingRaceCreateActions.size();
        scheduledNextTimer = true;
        nextTimerTime = ?Int.abs(nextCreationTime);
      });
    } else {
      // Log that we skipped scheduling due to existing timer
      addTimerDiagnostic({
        timestamp = Time.now();
        handlerType = "race_create_EXIT";
        actionId = { id = actionId.id; time = actionId.time };
        message = "SKIPPED scheduling - already have " # Nat.toText(existingRaceCreateActions.size()) # " race_create timers";
        existingTimerCount = existingRaceCreateActions.size();
        scheduledNextTimer = false;
        nextTimerTime = null;
      });
    };

    nextActionId;
  };

  // Ensure calendar has events scheduled (Weekly League + Daily Sprints)
  func ensureCalendarScheduled<system>(now : Int) {
    let upcomingEvents = eventCalendar.getUpcomingEvents(now, 14); // Next 2 weeks
    // Use longer lookhead for special events that might be scheduled far in advance
    let allUpcomingEvents = eventCalendar.getUpcomingEvents(now, 60); // Next 60 days for special events

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
      // Start from the last existing weekly league, or now if none exist
      var scheduleTime = if (weeklyLeagues.size() > 0) {
        // Sort by scheduledTime to find the latest
        let sorted = Array.sort<RaceCalendar.ScheduledEvent>(
          weeklyLeagues,
          func(a, b) { Int.compare(a.scheduledTime, b.scheduledTime) },
        );
        sorted[sorted.size() - 1].scheduledTime + 1_000_000_000; // Start after the last one
      } else {
        now;
      };

      for (i in Iter.range(0, 1 - weeklyLeagues.size())) {
        let nextSunday = RaceCalendar.getNextWeeklyOccurrence(0, 20, 0, scheduleTime);

        // Check if event already exists at this time (within 30-minute window)
        let existingAtTime = Array.filter<RaceCalendar.ScheduledEvent>(
          upcomingEvents,
          func(e) {
            switch (e.eventType) {
              case (#WeeklyLeague) {
                let timeDiff = Int.abs(e.scheduledTime - nextSunday);
                timeDiff < (30 * 60 * 1_000_000_000); // Within 30 minutes
              };
              case (_) { false };
            };
          },
        );

        if (existingAtTime.size() == 0) {
          ignore eventCalendar.createWeeklyLeagueEvent(nextSunday, now);
          Debug.print("Auto-scheduled Weekly League for timestamp: " # debug_show (nextSunday));
        } else {
          Debug.print("SKIP: Weekly League already exists at timestamp: " # debug_show (nextSunday));
        };

        scheduleTime := nextSunday + 1_000_000_000; // Move past this event
      };
    };

    // Check for Daily Sprints in next 48 hours
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
      // Always start from now to fill gaps in the 48-hour window
      var scheduleTime = now;
      var createdCount : Nat = 0;
      let targetCount : Nat = 8 - sprintsIn48h.size();

      // Limit iterations to prevent infinite loops (48h = 8 slots max)
      var iterations : Nat = 0;
      let maxIterations : Nat = 16; // Safety limit: check up to 16 slots

      label scheduling while (createdCount < targetCount and iterations < maxIterations) {
        iterations += 1;
        let nextSprint = RaceCalendar.getNextDailySprintTime(scheduleTime);

        // Check if event already exists at this time (within 5-minute window)
        let existingAtTime = Array.filter<RaceCalendar.ScheduledEvent>(
          upcomingEvents,
          func(e) {
            switch (e.eventType) {
              case (#DailySprint) {
                let timeDiff = Int.abs(e.scheduledTime - nextSprint);
                timeDiff < (5 * 60 * 1_000_000_000); // Within 5 minutes
              };
              case (_) { false };
            };
          },
        );

        // Check if a special event is scheduled within 2 hours (skip sprint to avoid conflict)
        let specialEventNearby = Array.filter<RaceCalendar.ScheduledEvent>(
          allUpcomingEvents,
          func(e) {
            switch (e.eventType) {
              case (#DailySprint) { false }; // Ignore other sprints
              case (#SpecialEvent(name)) {
                if (name == "Free Sprint") { false } // Ignore free sprints
                else {
                  let timeDiff = Int.abs(e.scheduledTime - nextSprint);
                  timeDiff < (2 * 60 * 60 * 1_000_000_000); // Within 2 hours
                };
              };
              case (_) {
                // Weekly League, Monthly Cup, etc.
                let timeDiff = Int.abs(e.scheduledTime - nextSprint);
                timeDiff < (2 * 60 * 60 * 1_000_000_000); // Within 2 hours
              };
            };
          },
        );

        if (existingAtTime.size() == 0 and specialEventNearby.size() == 0) {
          ignore eventCalendar.createDailySprintEvent(nextSprint, now);
          Debug.print("Auto-scheduled Daily Sprint for timestamp: " # debug_show (nextSprint));
          createdCount += 1;
        } else if (specialEventNearby.size() > 0) {
          Debug.print("SKIP: Daily Sprint skipped due to nearby special event at timestamp: " # debug_show (nextSprint));
        } else {
          Debug.print("SKIP: Daily Sprint already exists at timestamp: " # debug_show (nextSprint));
        };

        scheduleTime := nextSprint + 1_000_000_000;
      };
    };

    // Check for Free Sprints in next 48 hours
    let freeSprintsIn48h = Array.filter<RaceCalendar.ScheduledEvent>(
      eventCalendar.getUpcomingEvents(now, 2), // Next 2 days
      func(e) {
        switch (e.eventType) {
          case (#SpecialEvent(name)) { name == "Free Sprint" };
          case (_) { false };
        };
      },
    );

    // Schedule Free Sprints to ensure at least 8 in next 48 hours (one every 6 hours, offset from Daily Sprints)
    if (freeSprintsIn48h.size() < 8) {
      var scheduleTime = now;
      var createdCount : Nat = 0;
      let targetCount : Nat = 8 - freeSprintsIn48h.size();

      var iterations : Nat = 0;
      let maxIterations : Nat = 16;

      label freeScheduling while (createdCount < targetCount and iterations < maxIterations) {
        iterations += 1;
        let nextFreeSprint = RaceCalendar.getNextFreeSprintTime(scheduleTime);

        // Check if Free Sprint already exists at this time (within 5-minute window)
        let existingAtTime = Array.filter<RaceCalendar.ScheduledEvent>(
          upcomingEvents,
          func(e) {
            switch (e.eventType) {
              case (#SpecialEvent(name)) {
                if (name == "Free Sprint") {
                  let timeDiff = Int.abs(e.scheduledTime - nextFreeSprint);
                  timeDiff < (5 * 60 * 1_000_000_000);
                } else { false };
              };
              case (_) { false };
            };
          },
        );

        // Check if a special event is scheduled within 2 hours (skip free sprint to avoid conflict)
        let specialEventNearby = Array.filter<RaceCalendar.ScheduledEvent>(
          allUpcomingEvents,
          func(e) {
            switch (e.eventType) {
              case (#DailySprint) { false }; // Ignore daily sprints
              case (#SpecialEvent(name)) {
                if (name == "Free Sprint") { false } // Ignore other free sprints
                else {
                  let timeDiff = Int.abs(e.scheduledTime - nextFreeSprint);
                  timeDiff < (2 * 60 * 60 * 1_000_000_000); // Within 2 hours
                };
              };
              case (_) {
                // Weekly League, Monthly Cup, etc.
                let timeDiff = Int.abs(e.scheduledTime - nextFreeSprint);
                timeDiff < (2 * 60 * 60 * 1_000_000_000); // Within 2 hours
              };
            };
          },
        );

        if (existingAtTime.size() == 0 and specialEventNearby.size() == 0) {
          ignore eventCalendar.createFreeSprintEvent(nextFreeSprint, now);
          Debug.print("Auto-scheduled Free Sprint for timestamp: " # debug_show (nextFreeSprint));
          createdCount += 1;
        } else if (specialEventNearby.size() > 0) {
          Debug.print("SKIP: Free Sprint skipped due to nearby special event at timestamp: " # debug_show (nextFreeSprint));
        } else {
          Debug.print("SKIP: Free Sprint already exists at timestamp: " # debug_show (nextFreeSprint));
        };

        scheduleTime := nextFreeSprint + 1_000_000_000;
      };
    };

    // ===== SPECIAL EVENTS SCHEDULING =====

    // Check for Monthly Cup in next month
    let monthlyCups = Array.filter<RaceCalendar.ScheduledEvent>(
      allUpcomingEvents,
      func(e) {
        switch (e.eventType) {
          case (#MonthlyCup) { true };
          case (_) { false };
        };
      },
    );

    // Schedule Monthly Cup (first Saturday of month at 8pm UTC)
    if (monthlyCups.size() == 0) {
      let nextFirstSaturday = RaceCalendar.getNextMonthlyOccurrence(6, 1, 20, 0, now); // Saturday=6, first=1, 8pm
      // Check if event already exists at this time
      let existingAtTime = Array.filter<RaceCalendar.ScheduledEvent>(
        allUpcomingEvents,
        func(e) {
          let timeDiff = Int.abs(e.scheduledTime - nextFirstSaturday);
          timeDiff < (60 * 60 * 1_000_000_000); // Within 1 hour
        },
      );
      if (existingAtTime.size() == 0) {
        ignore eventCalendar.createMonthlyCupEvent(nextFirstSaturday, now);
        Debug.print("Auto-scheduled Monthly Cup for timestamp: " # debug_show (nextFirstSaturday));
      };
    };

    // Check for Weekend Warrior (every Friday 8pm)
    let weekendWarriors = Array.filter<RaceCalendar.ScheduledEvent>(
      allUpcomingEvents,
      func(e) {
        switch (e.eventType) {
          case (#SpecialEvent(name)) { name == "Weekend Warrior" };
          case (_) { false };
        };
      },
    );

    if (weekendWarriors.size() < 2) {
      var scheduleTime = now;
      for (i in Iter.range(0, 1 - weekendWarriors.size())) {
        let nextFriday = RaceCalendar.getNextWeeklyOccurrence(5, 20, 0, scheduleTime); // Friday=5, 8pm
        // Check if event already exists at this time
        let existingAtTime = Array.filter<RaceCalendar.ScheduledEvent>(
          allUpcomingEvents,
          func(e) {
            let timeDiff = Int.abs(e.scheduledTime - nextFriday);
            timeDiff < (60 * 60 * 1_000_000_000); // Within 1 hour
          },
        );
        if (existingAtTime.size() == 0) {
          ignore eventCalendar.createWeekendWarriorEvent(nextFriday, now);
          Debug.print("Auto-scheduled Weekend Warrior for timestamp: " # debug_show (nextFriday));
        };
        scheduleTime := nextFriday + (7 * 86400 * 1_000_000_000); // Next week
      };
    };

    // Terrain Master Series (rotating: Sand Saturday, Metal next Saturday, Scrap next)
    let terrainMasters = Array.filter<RaceCalendar.ScheduledEvent>(
      allUpcomingEvents,
      func(e) {
        switch (e.eventType) {
          case (#SpecialEvent(name)) {
            name == "Sand Master" or name == "Metal Master" or name == "Scrap Master";
          };
          case (_) { false };
        };
      },
    );

    if (terrainMasters.size() < 2) {
      let terrains = ["Sand", "Metal", "Scrap"];
      let weekNum = (now / (7 * 86400 * 1_000_000_000)) % 3; // Rotate every week
      let terrain = terrains[Int.abs(weekNum) % 3];
      let nextSaturday = RaceCalendar.getNextWeeklyOccurrence(6, 14, 0, now); // Saturday=6, 2pm
      // Check if event already exists at this time
      let existingAtTime = Array.filter<RaceCalendar.ScheduledEvent>(
        allUpcomingEvents,
        func(e) {
          let timeDiff = Int.abs(e.scheduledTime - nextSaturday);
          timeDiff < (60 * 60 * 1_000_000_000); // Within 1 hour
        },
      );
      if (existingAtTime.size() == 0) {
        ignore eventCalendar.createTerrainMasterEvent(terrain, nextSaturday, now);
        Debug.print("Auto-scheduled " # terrain # " Master for timestamp: " # debug_show (nextSaturday));
      };
    };

    // Elite Showcase (every Sunday 6pm - 2 hours before Weekly League)
    let eliteShowcases = Array.filter<RaceCalendar.ScheduledEvent>(
      allUpcomingEvents,
      func(e) {
        switch (e.eventType) {
          case (#SpecialEvent(name)) { name == "Elite Showcase" };
          case (_) { false };
        };
      },
    );

    if (eliteShowcases.size() < 2) {
      var scheduleTime = now;
      for (i in Iter.range(0, 1 - eliteShowcases.size())) {
        let nextSunday = RaceCalendar.getNextWeeklyOccurrence(0, 17, 0, scheduleTime); // Sunday=0, 5pm (moved from 6pm to give gap before Weekly League)
        // Check if event already exists at this time
        let existingAtTime = Array.filter<RaceCalendar.ScheduledEvent>(
          allUpcomingEvents,
          func(e) {
            let timeDiff = Int.abs(e.scheduledTime - nextSunday);
            timeDiff < (60 * 60 * 1_000_000_000); // Within 1 hour
          },
        );
        if (existingAtTime.size() == 0) {
          ignore eventCalendar.createEliteShowcaseEvent(nextSunday, now);
          Debug.print("Auto-scheduled Elite Showcase for timestamp: " # debug_show (nextSunday));
        };
        scheduleTime := nextSunday + (7 * 86400 * 1_000_000_000); // Next week
      };
    };

    // Beginner Bootcamp (every Saturday 10am)
    let beginnerBootcamps = Array.filter<RaceCalendar.ScheduledEvent>(
      allUpcomingEvents,
      func(e) {
        switch (e.eventType) {
          case (#SpecialEvent(name)) { name == "Beginner Bootcamp" };
          case (_) { false };
        };
      },
    );

    if (beginnerBootcamps.size() < 2) {
      var scheduleTime = now;
      for (i in Iter.range(0, 1 - beginnerBootcamps.size())) {
        let nextSaturday = RaceCalendar.getNextWeeklyOccurrence(6, 10, 0, scheduleTime); // Saturday=6, 10am
        // Check if event already exists at this time
        let existingAtTime = Array.filter<RaceCalendar.ScheduledEvent>(
          allUpcomingEvents,
          func(e) {
            let timeDiff = Int.abs(e.scheduledTime - nextSaturday);
            timeDiff < (60 * 60 * 1_000_000_000); // Within 1 hour
          },
        );
        if (existingAtTime.size() == 0) {
          ignore eventCalendar.createBeginnerBootcampEvent(nextSaturday, now);
          Debug.print("Auto-scheduled Beginner Bootcamp for timestamp: " # debug_show (nextSaturday));
        };
        scheduleTime := nextSaturday + (7 * 86400 * 1_000_000_000); // Next week
      };
    };

    // Faction Wars (second Sunday of each month at 4pm)
    let factionWars = Array.filter<RaceCalendar.ScheduledEvent>(
      allUpcomingEvents,
      func(e) {
        switch (e.eventType) {
          case (#SpecialEvent(name)) { name == "Faction Wars" };
          case (_) { false };
        };
      },
    );

    if (factionWars.size() == 0) {
      let nextSecondSunday = RaceCalendar.getNextMonthlyOccurrence(0, 2, 16, 0, now); // Sunday=0, second=2, 4pm
      // Check if event already exists at this time
      let existingAtTime = Array.filter<RaceCalendar.ScheduledEvent>(
        allUpcomingEvents,
        func(e) {
          let timeDiff = Int.abs(e.scheduledTime - nextSecondSunday);
          timeDiff < (60 * 60 * 1_000_000_000); // Within 1 hour
        },
      );
      if (existingAtTime.size() == 0) {
        ignore eventCalendar.createFactionWarsEvent(nextSecondSunday, now);
        Debug.print("Auto-scheduled Faction Wars for timestamp: " # debug_show (nextSecondSunday));
      };
    };

    // Distance Challenge (third Saturday of each month at noon)
    let distanceChallenges = Array.filter<RaceCalendar.ScheduledEvent>(
      allUpcomingEvents,
      func(e) {
        switch (e.eventType) {
          case (#SpecialEvent(name)) { name == "Distance Challenge" };
          case (_) { false };
        };
      },
    );

    if (distanceChallenges.size() == 0) {
      let nextThirdSaturday = RaceCalendar.getNextMonthlyOccurrence(6, 3, 11, 0, now); // Saturday=6, third=3, 11am (moved from noon to avoid Daily Sprint conflict)
      // Check if event already exists at this time
      let existingAtTime = Array.filter<RaceCalendar.ScheduledEvent>(
        allUpcomingEvents,
        func(e) {
          let timeDiff = Int.abs(e.scheduledTime - nextThirdSaturday);
          timeDiff < (60 * 60 * 1_000_000_000); // Within 1 hour
        },
      );
      if (existingAtTime.size() == 0) {
        ignore eventCalendar.createDistanceChallengeEvent(nextThirdSaturday, now);
        Debug.print("Auto-scheduled Distance Challenge for timestamp: " # debug_show (nextThirdSaturday));
      };
    };

    // Rush Hour Rumble (every Friday 7pm)
    let rushHours = Array.filter<RaceCalendar.ScheduledEvent>(
      allUpcomingEvents,
      func(e) {
        switch (e.eventType) {
          case (#SpecialEvent(name)) { name == "Rush Hour" };
          case (_) { false };
        };
      },
    );

    if (rushHours.size() < 2) {
      var scheduleTime = now;
      for (i in Iter.range(0, 1 - rushHours.size())) {
        let nextFriday = RaceCalendar.getNextWeeklyOccurrence(5, 17, 0, scheduleTime); // Friday=5, 5pm (moved from 7pm to avoid Weekend Warrior conflict)
        // Check if event already exists at this time
        let existingAtTime = Array.filter<RaceCalendar.ScheduledEvent>(
          allUpcomingEvents,
          func(e) {
            let timeDiff = Int.abs(e.scheduledTime - nextFriday);
            timeDiff < (60 * 60 * 1_000_000_000); // Within 1 hour
          },
        );
        if (existingAtTime.size() == 0) {
          ignore eventCalendar.createRushHourEvent(nextFriday, now);
          Debug.print("Auto-scheduled Rush Hour for timestamp: " # debug_show (nextFriday));
        };
        scheduleTime := nextFriday + (7 * 86400 * 1_000_000_000); // Next week
      };
    };

    // Ultra Marathon (second Saturday of each month at noon)
    let ultraMarathons = Array.filter<RaceCalendar.ScheduledEvent>(
      allUpcomingEvents,
      func(e) {
        switch (e.eventType) {
          case (#SpecialEvent(name)) { name == "Ultra Marathon" };
          case (_) { false };
        };
      },
    );

    if (ultraMarathons.size() == 0) {
      let nextSecondSaturday = RaceCalendar.getNextMonthlyOccurrence(6, 2, 11, 0, now); // Saturday=6, second=2, 11am (moved from noon to avoid Daily Sprint conflict)
      // Check if event already exists at this time
      let existingAtTime = Array.filter<RaceCalendar.ScheduledEvent>(
        allUpcomingEvents,
        func(e) {
          let timeDiff = Int.abs(e.scheduledTime - nextSecondSaturday);
          timeDiff < (60 * 60 * 1_000_000_000); // Within 1 hour
        },
      );
      if (existingAtTime.size() == 0) {
        ignore eventCalendar.createUltraMarathonEvent(nextSecondSaturday, now);
        Debug.print("Auto-scheduled Ultra Marathon for timestamp: " # debug_show (nextSecondSaturday));
      };
    };

    // Midnight Madness (every Saturday midnight)
    let midnightMadnesses = Array.filter<RaceCalendar.ScheduledEvent>(
      allUpcomingEvents,
      func(e) {
        switch (e.eventType) {
          case (#SpecialEvent(name)) { name == "Midnight Madness" };
          case (_) { false };
        };
      },
    );

    if (midnightMadnesses.size() < 2) {
      var scheduleTime = now;
      for (i in Iter.range(0, 1 - midnightMadnesses.size())) {
        let nextSaturday = RaceCalendar.getNextWeeklyOccurrence(6, 24, 0, scheduleTime); // Saturday=6 -> Sunday=0, midnight
        // Check if event already exists at this time
        let existingAtTime = Array.filter<RaceCalendar.ScheduledEvent>(
          allUpcomingEvents,
          func(e) {
            let timeDiff = Int.abs(e.scheduledTime - nextSaturday);
            timeDiff < (60 * 60 * 1_000_000_000); // Within 1 hour
          },
        );
        if (existingAtTime.size() == 0) {
          ignore eventCalendar.createMidnightMadnessEvent(nextSaturday, now);
          Debug.print("Auto-scheduled Midnight Madness for timestamp: " # debug_show (nextSaturday));
        };
        scheduleTime := nextSaturday + (7 * 86400 * 1_000_000_000); // Next week
      };
    };

    // Champions Cup (last Sunday of each month at 8pm)
    let championsCups = Array.filter<RaceCalendar.ScheduledEvent>(
      allUpcomingEvents,
      func(e) {
        switch (e.eventType) {
          case (#SpecialEvent(name)) { name == "Champions Cup" };
          case (_) { false };
        };
      },
    );

    if (championsCups.size() == 0) {
      let nextLastSunday = RaceCalendar.getNextMonthlyOccurrence(0, -1, 22, 0, now); // Sunday=0, last=-1, 10pm (moved from 8pm to avoid Weekly League conflict)
      // Check if event already exists at this time
      let existingAtTime = Array.filter<RaceCalendar.ScheduledEvent>(
        allUpcomingEvents,
        func(e) {
          let timeDiff = Int.abs(e.scheduledTime - nextLastSunday);
          timeDiff < (60 * 60 * 1_000_000_000); // Within 1 hour
        },
      );
      if (existingAtTime.size() == 0) {
        ignore eventCalendar.createChampionsCupEvent(nextLastSunday, now);
        Debug.print("Auto-scheduled Champions Cup for timestamp: " # debug_show (nextLastSunday));
      };
    };
  };

  // Handle prize distribution asynchronously
  func handlePrizeDistribution<system>(actionId : TT.ActionId, action : TT.Action) : async* Star.Star<TT.ActionId, TT.Error> {
    Debug.print("Prize distribution handler triggered");

    // Decode prize info using a record type instead of tuple
    type PrizeInfo = {
      raceId : Nat;
      owner : Principal;
      amount : Nat;
    };
    let prizeInfoOpt : ?PrizeInfo = from_candid (action.params);

    switch (prizeInfoOpt) {
      case (?prizeInfo) {
        // Create unique key for this prize payment
        let prizeKey = Nat.toText(prizeInfo.raceId) # ":" # Principal.toText(prizeInfo.owner) # ":" # Nat.toText(prizeInfo.amount);

        // Check if this prize was already paid
        switch (Map.get(stable_paid_prizes, Map.thash, prizeKey)) {
          case (?paidAt) {
            Debug.print("DUPLICATE PREVENTED: Prize already paid at " # debug_show (paidAt) # " for key: " # prizeKey);
            return #awaited(actionId); // Already paid, mark as complete to prevent retries
          };
          case (null) {
            // Not paid yet, mark as in-progress IMMEDIATELY to prevent race conditions
            ignore Map.put(stable_paid_prizes, Map.thash, prizeKey, Time.now());
          };
        };

        Debug.print("Distributing " # debug_show (prizeInfo.amount) # " to " # Principal.toText(prizeInfo.owner) # " for race " # debug_show (prizeInfo.raceId));

        let ledgerCanisterId = switch (icpLedgerCanisterId) {
          case (?id) { id };
          case (null) {
            Debug.print("ICP Ledger not configured, skipping prize distribution");
            return #trappable(actionId); // Return actionId, not error - will be cleaned up
          };
        };
        let ledger = actor (Principal.toText(ledgerCanisterId)) : actor {
          icrc1_transfer : shared IcpLedger.TransferArg -> async IcpLedger.Result;
        };

        try {
          let transferResult = await ledger.icrc1_transfer({
            from_subaccount = null;
            to = { owner = prizeInfo.owner; subaccount = null };
            amount = prizeInfo.amount;
            fee = ?TRANSFER_FEE;
            memo = null;
            created_at_time = null;
          });

          switch (transferResult) {
            case (#Ok(blockIndex)) {
              Debug.print("Prize sent successfully, block: " # debug_show (blockIndex));
              return #awaited(actionId); // Success - action completed
            };
            case (#Err(err)) {
              Debug.print("Prize transfer failed: " # debug_show (err));
              return #trappable(actionId); // Failed - will be cleaned up
            };
          };
        } catch (e) {
          Debug.print("Prize transfer caught error: " # Error.message(e));
          return #trappable(actionId); // Exception - will be cleaned up
        };
      };
      case (null) {
        Debug.print("Could not decode prize info");
        return #trappable(actionId); // Invalid data - will be cleaned up
      };
    };
  };

  // Handle bet settlement asynchronously
  func handleBetSettlement<system>(actionId : TT.ActionId, action : TT.Action) : async* Star.Star<TT.ActionId, TT.Error> {
    Debug.print("Bet settlement handler triggered");

    type BetSettlementInfo = {
      raceId : Nat;
      rankings : [Nat];
    };
    let settlementInfoOpt : ?BetSettlementInfo = from_candid (action.params);

    switch (settlementInfoOpt) {
      case (?info) {
        Debug.print("Settling bets for race " # debug_show (info.raceId));

        try {
          ignore await bettingManager.settleBets(info.raceId, info.rankings);
          Debug.print("Successfully settled bets for race " # debug_show (info.raceId));
          return #awaited(actionId);
        } catch (e) {
          Debug.print("Bet settlement failed: " # Error.message(e));
          return #trappable(actionId);
        };
      };
      case (null) {
        Debug.print("Could not decode bet settlement info");
        return #trappable(actionId);
      };
    };
  };

  // Handle betting pool creation (when registration closes)
  func handleBettingPoolCreate<system>(actionId : TT.ActionId, action : TT.Action) : TT.ActionId {
    Debug.print("Betting pool creation handler triggered");

    let raceIdOpt : ?Nat = from_candid (action.params);

    switch (raceIdOpt) {
      case (?raceId) {
        Debug.print("Creating betting pool for race " # debug_show (raceId));

        switch (raceManager.getRace(raceId)) {
          case (?race) {
            // Only create pool if race is still upcoming and has entries
            if (race.status == #Upcoming and race.entries.size() > 0) {
              // Check if pool already exists (from manual creation)
              switch (bettingManager.getPool(raceId)) {
                case (?existingPool) {
                  // Pool exists, open it if it's pending
                  if (existingPool.status == #Pending) {
                    ignore bettingManager.openPool(raceId);
                    Debug.print("Opened existing betting pool for race " # debug_show (raceId));
                  };
                };
                case (null) {
                  // Create new pool (will be #Open since we're at registration close time)
                  ignore bettingManager.createPool(race);
                  Debug.print("Created betting pool for race " # debug_show (raceId) # " with " # debug_show (race.entries.size()) # " entrants");
                };
              };
            } else {
              Debug.print("Skipped pool creation - race status: " # debug_show (race.status) # ", entries: " # debug_show (race.entries.size()));
            };
          };
          case (null) {
            Debug.print("Race not found: " # debug_show (raceId));
          };
        };
      };
      case (null) {
        Debug.print("Could not decode race ID for betting pool creation");
      };
    };

    actionId;
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
            // Backwards compatibility: Skip if race is already in progress or completed
            switch (race.status) {
              case (#InProgress) {
                Debug.print("Race " # debug_show (raceId) # " already in progress, skipping duplicate start");
                return actionId;
              };
              case (#Completed) {
                Debug.print("Race " # debug_show (raceId) # " already completed, skipping duplicate start");
                return actionId;
              };
              case (_) {};
            };

            // Allow all registered entries to race regardless of rating changes during upgrade
            // Registrations are only a few days out, so letting bots race in their registered class is fine

            // Check if race has enough entries
            if (race.entries.size() < race.minEntries) {
              Debug.print("Race cancelled - not enough entries (" # debug_show (race.entries.size()) # " < " # debug_show (race.minEntries) # "), issuing refunds");
              ignore raceManager.updateRaceStatus(raceId, #Cancelled);

              // Refund all entries
              for (entry in race.entries.vals()) {
                let refundActionId = tt().setActionASync<system>(
                  Int.abs(Time.now() + 1_000_000_000), // 1 second delay
                  {
                    actionType = "prize_distribution";
                    params = to_candid ({
                      raceId = raceId;
                      owner = entry.owner;
                      amount = entry.entryFee;
                    });
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
                    params = to_candid ({
                      raceId = raceId;
                      owner = sponsor.sponsor;
                      amount = sponsor.amount;
                    });
                  },
                  PRIZE_DISTRIBUTION_TIMEOUT,
                );
                Debug.print("Scheduled sponsor refund " # debug_show (sponsorRefundActionId) # " of " # debug_show (sponsor.amount) # " to " # Principal.toText(sponsor.sponsor));
              };

              // Chain to next race in event if there is one (cancelled races don't break the chain)
              switch (eventCalendar.getEventByRaceId(raceId)) {
                case (?event) {
                  // Find current race index in event
                  let raceIndexOpt = Array.indexOf<Nat>(raceId, event.raceIds, Nat.equal);
                  switch (raceIndexOpt) {
                    case (?currentIndex) {
                      // Check if there's a next race
                      if (currentIndex + 1 < event.raceIds.size()) {
                        let nextRaceId = event.raceIds[currentIndex + 1];

                        // Check if next race already has a start timer scheduled
                        let existingTimers = tt().getActionsByFilter(#ByType("race_start"));
                        var alreadyScheduled = false;
                        for ((timerId, timerAction) in existingTimers.vals()) {
                          let timerRaceIdOpt : ?Nat = from_candid (timerAction.params);
                          switch (timerRaceIdOpt) {
                            case (?timerRaceId) {
                              if (timerRaceId == nextRaceId) {
                                alreadyScheduled := true;
                                Debug.print("Next race " # debug_show (nextRaceId) # " already has scheduled start timer, skipping chain");
                              };
                            };
                            case (null) {};
                          };
                        };

                        // Also check if next race already started or completed
                        switch (raceManager.getRace(nextRaceId)) {
                          case (?nextRace) {
                            switch (nextRace.status) {
                              case (#InProgress) {
                                alreadyScheduled := true;
                                Debug.print("Next race " # debug_show (nextRaceId) # " already in progress, skipping chain");
                              };
                              case (#Completed) {
                                alreadyScheduled := true;
                                Debug.print("Next race " # debug_show (nextRaceId) # " already completed, skipping chain");
                              };
                              case (#Cancelled) {
                                alreadyScheduled := true;
                                Debug.print("Next race " # debug_show (nextRaceId) # " already cancelled, skipping chain");
                              };
                              case (_) {};
                            };
                          };
                          case (null) {};
                        };

                        if (not alreadyScheduled) {
                          Debug.print("Chaining to next race " # debug_show (nextRaceId) # " in event " # debug_show (event.eventId) # " after cancellation");

                          // Schedule next race start after a short delay (no commercial break for cancelled races)
                          let nextRaceStartTime = Time.now() + 5_000_000_000; // 5 seconds
                          let nextRaceActionId = tt().setActionSync<system>(
                            Int.abs(nextRaceStartTime),
                            {
                              actionType = "race_start";
                              params = to_candid (nextRaceId);
                            },
                          );
                          Debug.print("Scheduled next race start " # debug_show (nextRaceActionId) # " at " # debug_show (nextRaceStartTime) # " after cancelled race");
                        };
                      } else {
                        Debug.print("Last race in event was cancelled");
                      };
                    };
                    case (null) {
                      Debug.print("Cancelled race not found in event race list");
                    };
                  };
                };
                case (null) {
                  Debug.print("No event found for cancelled race " # debug_show (raceId));
                };
              };

              return actionId;
            };

            // Generate unpredictable trackSeed using race start execution time
            // This prevents pre-simulation while allowing frontend to simulate in real-time
            // Use full timestamp for maximum entropy and uniqueness
            let executionTime = Time.now();
            let trackSeed = Int.abs(raceId * 7919 + executionTime);

            Debug.print("Generated trackSeed at race start: " # debug_show (trackSeed) # " (executionTime: " # debug_show (executionTime) # ")");

            // Update race with trackSeed so frontend can fetch it for real-time simulation
            switch (raceManager.setTrackSeed(raceId, trackSeed)) {
              case (?_updated) {
                Debug.print("Updated race " # debug_show (raceId) # " with trackSeed " # debug_show (trackSeed));
              };
              case (null) {
                Debug.print("Failed to update race with trackSeed");
              };
            };

            // Close betting pool (betting window ends)
            ignore bettingManager.closePool(raceId);
            Debug.print("Closed betting pool for race " # debug_show (raceId));

            // Update race start time to NOW (for chained races, this differs from the original scheduledTime)
            // This is critical for calculating correct finish times
            ignore raceManager.updateRaceStartTime(raceId, executionTime);
            Debug.print("Updated race " # debug_show (raceId) # " startTime to actual execution time: " # debug_show (executionTime));

            // Mark as in progress
            ignore raceManager.updateRaceStatus(raceId, #InProgress);
            Debug.print("Race in progress: " # race.name # " with " # debug_show (race.entries.size()) # " entries");

            // Snapshot stats for all entries at race start (includes buffs/penalties)
            var entriesWithStats : [RacingSimulator.RaceEntry] = [];
            for (entry in race.entries.vals()) {
              // Parse token index
              let tokenIndexOpt = Nat.fromText(entry.nftId);

              switch (tokenIndexOpt) {
                case (?tokenIndex) {
                  // First, check if bot is on a scavenging mission and pull them out
                  switch (garageManager.getStats(tokenIndex)) {
                    case (?botStats) {
                      switch (botStats.activeMission) {
                        case (?mission) {
                          // Pull bot from scavenging mission with penalties
                          let rng = Int.abs(executionTime % 1000000);
                          switch (garageManager.pullFromScavenging(tokenIndex, executionTime, rng)) {
                            case (#ok(result)) {
                              Debug.print("Pulled bot " # entry.nftId # " from scavenging at race start: " # result.penalties);
                            };
                            case (#err(errMsg)) {
                              Debug.print("Error pulling bot " # entry.nftId # " from scavenging: " # errMsg);
                            };
                          };
                        };
                        case (null) {
                          // Not on mission, proceed normally
                        };
                      };
                    };
                    case (null) {};
                  };

                  // Get bot stats WITH terrain bonuses for this race
                  switch (garageManager.getRacingStatsWithTerrain(entry.nftId, race.terrain)) {
                    case (?stats) {
                      let entryWithStats : RacingSimulator.RaceEntry = {
                        nftId = entry.nftId;
                        owner = entry.owner;
                        entryFee = entry.entryFee;
                        enteredAt = entry.enteredAt;
                        stats = ?stats;
                      };
                      entriesWithStats := Array.append(entriesWithStats, [entryWithStats]);
                    };
                    case (null) {
                      Debug.print("Warning: No stats found for NFT " # entry.nftId # ", keeping entry without stats");
                      entriesWithStats := Array.append(entriesWithStats, [entry]);
                    };
                  };
                };
                case (null) {
                  Debug.print("Warning: Invalid nftId format: " # entry.nftId);
                  entriesWithStats := Array.append(entriesWithStats, [entry]);
                };
              };
            };

            // Update race entries with stats snapshot
            ignore raceManager.updateRaceEntries(raceId, entriesWithStats);
            Debug.print("Snapshotted stats for " # debug_show (entriesWithStats.size()) # " entries at race start");

            // Simulate the race immediately to get actual finish time
            var participants : [RacingSimulator.RacingParticipant] = [];
            for (entry in entriesWithStats.vals()) {
              switch (entry.stats) {
                case (?stats) {
                  // Parse tokenIndex from nftId string and get faction for luck system
                  let tokenIdx = switch (Nat.fromText(entry.nftId)) {
                    case (?idx) { idx };
                    case (null) { 0 };
                  };
                  let (faction, baseAvgRating) : (RacingSimulator.FactionType, ?Nat) = switch (garageManager.getStats(tokenIdx)) {
                    case (?botStats) {
                      // Calculate base avg rating from raw stats (without terrain/faction bonuses)
                      // This is used for MomentumShift to prevent buffed bots appearing as underdogs
                      let baseStats = garageManager.getBaseStats(tokenIdx);
                      let baseAvg = (baseStats.speed + baseStats.powerCore + baseStats.acceleration + baseStats.stability) / 4;
                      (botStats.faction, ?baseAvg);
                    };
                    case (null) { (#Industrial, null) }; // Default faction, no base rating
                  };
                  let participant : RacingSimulator.RacingParticipant = {
                    nftId = entry.nftId;
                    owner = entry.owner;
                    stats = stats;
                    tokenIndex = tokenIdx;
                    faction = faction;
                    baseAvgRating = baseAvgRating;
                  };
                  participants := Array.append(participants, [participant]);
                };
                case (null) {};
              };
            };

            // Get updated race with trackSeed
            let updatedRace = switch (raceManager.getRace(raceId)) {
              case (?r) { r };
              case (null) {
                Debug.print("Error: Race not found after trackSeed update");
                return actionId;
              };
            };

            // Simulate race and store results
            switch (raceSimulator.simulateRaceSegmented(updatedRace, participants)) {
              case (?(results, events)) {
                Debug.print("Race simulated at start, " # debug_show (results.size()) # " racers, " # debug_show (events.size()) # " events");

                // === TIME CAP SYSTEM ===
                // Cap race duration at 3x median time to prevent one slow bot from holding up the race
                // Bots exceeding the cap are marked as DNF (Did Not Finish)

                // Sort times to find median
                let times = Array.map<RacingSimulator.RaceResult, Float>(results, func(r) { r.finalTime });
                let sortedTimes = Array.sort<Float>(times, Float.compare);

                // Calculate median time
                let medianTime : Float = if (sortedTimes.size() == 0) {
                  60.0; // Fallback: 60 seconds
                } else if (sortedTimes.size() % 2 == 0) {
                  // Even number: average of two middle values
                  let mid = sortedTimes.size() / 2;
                  (sortedTimes[mid - 1] + sortedTimes[mid]) / 2.0;
                } else {
                  // Odd number: middle value
                  sortedTimes[sortedTimes.size() / 2];
                };

                // Time cap at 3x median (e.g., if median is 20s, cap is 60s)
                let timeCap = medianTime * 3.0;
                Debug.print("Time cap system: median=" # Float.toText(medianTime) # "s, cap=" # Float.toText(timeCap) # "s");

                // Apply time cap and mark DNF for stragglers
                var cappedResults : [RacingSimulator.RaceResult] = [];
                var dnfCount : Nat = 0;
                for (result in results.vals()) {
                  if (result.finalTime > timeCap) {
                    // Bot exceeded time cap - mark as DNF
                    dnfCount += 1;
                    cappedResults := Array.append(cappedResults, [{ result with
                    finalTime = timeCap; /* Cap the time */
                    dnf = true; prizeAmount = 0; /* DNF bots don't get prizes */
                    partsEarned = result.partsEarned / 2; /* Half parts for DNF (participation) */ }]);
                    Debug.print("DNF: Bot " # result.nftId # " exceeded time cap (original: " # Float.toText(result.finalTime) # "s)");
                  } else {
                    cappedResults := Array.append(cappedResults, [result]);
                  };
                };

                if (dnfCount > 0) {
                  Debug.print("Time cap applied: " # Nat.toText(dnfCount) # " bot(s) marked as DNF");
                };

                // Store results and events (with DNF markers)
                let updatedWithResults = raceManager.setRaceResults(raceId, cappedResults, events);
                Debug.print("Stored results and events in race, updated race: " # debug_show (updatedWithResults));

                // Find slowest finisher (capped) to determine actual race duration
                var slowestTime : Float = 0.0;
                for (result in cappedResults.vals()) {
                  if (result.finalTime > slowestTime) {
                    slowestTime := result.finalTime;
                  };
                };

                // Update race duration to actual slowest time (rounded up)
                let actualDuration = Nat.max(1, Int.abs(Float.toInt(Float.ceil(slowestTime))));
                ignore raceManager.updateRaceDuration(raceId, actualDuration);
                Debug.print("Updated race duration from " # Nat.toText(race.duration) # "s to actual " # Nat.toText(actualDuration) # "s");

                // Convert slowest time to nanoseconds and schedule finish
                // Use executionTime (actual start time) instead of race.startTime (which may be outdated for chained races)
                let raceDurationNanos = Int.abs(Float.toInt(slowestTime * 1_000_000_000.0));
                let finishTime = executionTime + raceDurationNanos;

                let finishActionId = tt().setActionASync<system>(
                  Int.abs(finishTime),
                  {
                    actionType = "race_finish";
                    params = to_candid (raceId);
                  },
                  60_000_000_000,
                );
                Debug.print("Scheduled race_finish action (async) " # debug_show (finishActionId) # " for race " # debug_show (raceId) # " at " # debug_show (finishTime) # " (slowest time: " # Float.toText(slowestTime) # "s)");
              };
              case (null) {
                Debug.print("Error: Failed to simulate race at start");
                // Fallback to estimated duration using actual execution time
                let finishTime = executionTime + (race.duration * 1_000_000_000);
                let finishActionId = tt().setActionASync<system>(
                  Int.abs(finishTime),
                  {
                    actionType = "race_finish";
                    params = to_candid (raceId);
                  },
                  60_000_000_000,
                );
                Debug.print("Scheduled race_finish action (fallback, async) " # debug_show (finishActionId) # " for race " # debug_show (raceId) # " at " # debug_show (finishTime));
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

  // Handle race finish - apply results and distribute prizes
  func handleRaceFinish<system>(actionId : TT.ActionId, action : TT.Action) : async* Star.Star<TT.ActionId, TT.Error> {
    Debug.print("Race finish handler triggered");

    // Decode race ID
    let raceIdOpt : ?Nat = from_candid (action.params);

    switch (raceIdOpt) {
      case (?raceId) {
        Debug.print("Finishing race " # debug_show (raceId));

        switch (raceManager.getRace(raceId)) {
          case (?race) {
            // Guard: Skip if race is already completed to prevent duplicate processing
            switch (race.status) {
              case (#Completed) {
                Debug.print("Race " # debug_show (raceId) # " already completed, skipping duplicate finish");
                return #awaited(actionId);
              };
              case _ {};
            };

            // Mark as completed IMMEDIATELY to prevent duplicate processing
            ignore raceManager.updateRaceStatus(raceId, #Completed);
            Debug.print("Marked race as Completed to prevent duplicate processing");

            // Results were already simulated and stored at race start
            // Just retrieve them and apply consequences (ELO, stats, prizes)
            Debug.print("Applying race results simulated at race start");

            switch (race.results) {
              case (null) {
                Debug.print("Error: No results found for race " # debug_show (raceId) # " - race may not have been properly started");
                return #trappable(actionId);
              };
              case (?results) {
                if (results.size() == 0) {
                  Debug.print("Error: Empty results array for race " # debug_show (raceId));
                  return #trappable(actionId);
                };

                Debug.print("Applying race results, " # debug_show (results.size()) # " racers");

                // Settle betting pool with race results
                let rankings = Array.map<RacingSimulator.RaceResult, Nat>(
                  results,
                  func(r : RacingSimulator.RaceResult) : Nat {
                    // Extract token index from nftId
                    switch (Nat.fromText(r.nftId)) {
                      case (?idx) { idx };
                      case null { 0 }; // Should never happen
                    };
                  },
                );
                // Schedule bet settlement
                type BetSettlementInfo = {
                  raceId : Nat;
                  rankings : [Nat];
                };
                let settlementActionId = tt().setActionSync<system>(
                  Int.abs(Time.now() + 1_000_000_000), // 1 second from now
                  {
                    actionType = "bet_settlement";
                    params = to_candid (
                      {
                        raceId = raceId;
                        rankings = rankings;
                      } : BetSettlementInfo
                    );
                  },
                );
                Debug.print("Scheduled bet_settlement action " # debug_show (settlementActionId) # " for race " # debug_show (raceId));

                // Apply ELO rating changes first
                let eloResults = Array.map<RacingSimulator.RaceResult, (Text, Nat)>(
                  results,
                  func(r : RacingSimulator.RaceResult) : (Text, Nat) {
                    (r.nftId, r.position);
                  },
                );
                let eloChanges = garageManager.applyRaceEloChanges(eloResults);

                // Now update race stats (should preserve ELO from previous update)
                for (result in results.vals()) {
                  // Apply Golden faction synergy bonus to race prizes (8-25% boost)
                  let synergies = garageManager.calculateFactionSynergies(result.owner);
                  let adjustedPrize = Float.toInt(Float.fromInt(result.prizeAmount) * synergies.yieldMultipliers.racePrizes);

                  garageManager.recordRaceResult(
                    result.nftId,
                    result.position,
                    results.size(),
                    Int.abs(adjustedPrize),
                  );

                  // Record dedication activity DP for race completion
                  // 5 DP base + 15 for win + 8 for podium (2nd or 3rd)
                  switch (Nat.fromText(result.nftId)) {
                    case (?tokenIdx) {
                      dedicationManager.recordRaceCompletion(tokenIdx, result.position, Time.now());
                    };
                    case (null) {};
                  };

                  // Award parts based on race terrain and position
                  // Terrain determines which part drops:
                  // - MetalRoads: SpeedChips (speed is key on roads)
                  // - ScrapHeaps: PowerCells (power to push through debris)
                  // - WastelandSand: ThrusterKits/GyroModules alternating (accel/stability in sand)

                  // Check if this race is part of a multi-stage event (Cumulative or TeamAggregate)
                  // If so, skip per-race parts - they'll be awarded at event completion
                  let isMultiStageRace = switch (eventCalendar.getEventByRaceId(raceId)) {
                    case (?parentEvent) {
                      switch (parentEvent.metadata.scoringMode) {
                        case (#Cumulative) { true };
                        case (#TeamAggregate) { true };
                        case (_) { false };
                      };
                    };
                    case (null) { false };
                  };

                  if (not isMultiStageRace) {
                    let partType : PokedBotsGarage.PartType = switch (race.terrain) {
                      case (#MetalRoads) { #SpeedChip };
                      case (#ScrapHeaps) { #PowerCoreFragment };
                      case (#WastelandSand) {
                        // Alternate between Thruster and Gyro based on race ID
                        if (raceId % 2 == 0) { #ThrusterKit } else {
                          #GyroModule;
                        };
                      };
                    };

                    // Base parts awarded by race class (flattened curve: Scrap ~70, SilentKlan ~200)
                    let baseParts : Nat = switch (race.raceClass) {
                      case (#Scrap) { 70 };
                      case (#Junker) { 100 };
                      case (#Raider) { 135 };
                      case (#Elite) { 170 };
                      case (#SilentKlan) { 200 };
                    };

                    // Position multiplier (flattened: winner gets 1.5x, participation gets 1x)
                    let positionMultiplier : Float = if (result.position == 1) {
                      1.5; // Winner: 1.5x
                    } else if (result.position == 2) {
                      1.25; // Second: 1.25x
                    } else if (result.position == 3) {
                      1.1; // Third: 1.1x
                    } else {
                      1.0; // Everyone else: 1x (participation)
                    };

                    let partsEarned = Int.abs(Float.toInt(Float.fromInt(baseParts) * positionMultiplier));
                    garageManager.addParts(result.owner, partType, partsEarned);

                    let partName = switch (partType) {
                      case (#SpeedChip) { "SpeedChips" };
                      case (#PowerCoreFragment) { "PowerCells" };
                      case (#ThrusterKit) { "ThrusterKits" };
                      case (#GyroModule) { "GyroModules" };
                      case (#UniversalPart) { "UniversalParts" };
                    };
                    Debug.print("Awarded " # debug_show (partsEarned) # " " # partName # " to " # Principal.toText(result.owner));
                  } else {
                    Debug.print("Skipping per-race parts for multi-stage event - will award at event completion");
                  };

                  // Apply race costs (battery drain and condition wear based on race)
                  garageManager.applyRaceCosts(result.nftId, race.distance, race.trackId, result.position);

                  // Update leaderboard (convert nftId back to tokenIndex)
                  switch (Nat.fromText(result.nftId)) {
                    case (?tokenIndex) {
                      switch (garageManager.getStats(tokenIndex)) {
                        case (?botStats) {
                          let now = Time.now();
                          leaderboardManager.updateCurrentPeriods(now);

                          // Convert faction type for leaderboard
                          let leaderboardFaction : PokedBotsGarage.FactionType = botStats.faction;

                          // Calculate bot's race class from its max stats
                          let maxRating = calculateMaxRating(botStats);
                          let botRaceClass = getRaceClassFromRating(maxRating);

                          // Apply Golden faction synergy bonus to leaderboard prize tracking
                          let synergies = garageManager.calculateFactionSynergies(result.owner);
                          let adjustedPrize = Float.toInt(Float.fromInt(result.prizeAmount) * synergies.yieldMultipliers.racePrizes);

                          leaderboardManager.recordRaceResult(
                            tokenIndex,
                            result.owner,
                            result.position,
                            results.size(),
                            Int.abs(adjustedPrize),
                            1.0,
                            leaderboardFaction,
                            now,
                          );
                        };
                        case (null) {};
                      };
                    };
                    case (null) {};
                  };

                  // Schedule async prize distribution if there's a prize
                  if (result.prizeAmount > 0) {
                    let prizeActionId = tt().setActionASync<system>(
                      Int.abs(Time.now() + 5_000_000_000), // 5 seconds delay
                      {
                        actionType = "prize_distribution";
                        params = to_candid ({
                          raceId = raceId;
                          owner = result.owner;
                          amount = result.prizeAmount;
                        });
                      },
                      PRIZE_DISTRIBUTION_TIMEOUT,
                    );
                    Debug.print("Scheduled prize distribution " # debug_show (prizeActionId) # " for " # Principal.toText(result.owner));
                  };
                };

                Debug.print("Race completed successfully - " # debug_show (results.size()) # " participants updated");

                // Chain to next race in event if there is one
                switch (eventCalendar.getEventByRaceId(raceId)) {
                  case (?event) {
                    // Find current race index in event
                    let raceIndexOpt = Array.indexOf<Nat>(raceId, event.raceIds, Nat.equal);
                    switch (raceIndexOpt) {
                      case (?currentIndex) {
                        // Check if there's a next race
                        if (currentIndex + 1 < event.raceIds.size()) {
                          let nextRaceId = event.raceIds[currentIndex + 1];

                          // Backwards compatibility: Check if next race already has a start timer scheduled
                          // (from old staggered timing system)
                          let existingTimers = tt().getActionsByFilter(#ByType("race_start"));
                          var alreadyScheduled = false;
                          for ((timerId, timerAction) in existingTimers.vals()) {
                            let timerRaceIdOpt : ?Nat = from_candid (timerAction.params);
                            switch (timerRaceIdOpt) {
                              case (?timerRaceId) {
                                if (timerRaceId == nextRaceId) {
                                  alreadyScheduled := true;
                                  Debug.print("Next race " # debug_show (nextRaceId) # " already has scheduled start timer (backwards compat), skipping chain");
                                };
                              };
                              case (null) {};
                            };
                          };

                          // Also check if next race already started or completed
                          switch (raceManager.getRace(nextRaceId)) {
                            case (?nextRace) {
                              switch (nextRace.status) {
                                case (#InProgress) {
                                  alreadyScheduled := true;
                                  Debug.print("Next race " # debug_show (nextRaceId) # " already in progress, skipping chain");
                                };
                                case (#Completed) {
                                  alreadyScheduled := true;
                                  Debug.print("Next race " # debug_show (nextRaceId) # " already completed, skipping chain");
                                };
                                case (_) {};
                              };
                            };
                            case (null) {};
                          };

                          if (not alreadyScheduled) {
                            Debug.print("Chaining to next race " # debug_show (nextRaceId) # " in event " # debug_show (event.eventId));

                            // Schedule next race start after commercial break
                            let nextRaceStartTime = Time.now() + RACE_BREAK_TIME;
                            let nextRaceActionId = tt().setActionSync<system>(
                              Int.abs(nextRaceStartTime),
                              {
                                actionType = "race_start";
                                params = to_candid (nextRaceId);
                              },
                            );
                            Debug.print("Scheduled next race start " # debug_show (nextRaceActionId) # " at " # debug_show (nextRaceStartTime) # " (+" # debug_show (RACE_BREAK_TIME / 1_000_000_000) # "s)");
                          };
                        } else {
                          Debug.print("Last race in event completed");

                          // Check if this event has aggregate scoring to process
                          switch (event.metadata.scoringMode) {
                            case (#TeamAggregate) {
                              // FACTION WARS: Aggregate points by faction, distribute FULL prize pool to winning faction
                              Debug.print("Processing TeamAggregate scoring for Faction Wars event " # Nat.toText(event.eventId));

                              // Collect all results from all races in the event
                              var factionPoints = Map.new<Text, Nat>();
                              var factionMembers = Map.new<Text, [Principal]>();

                              for (eventRaceId in event.raceIds.vals()) {
                                switch (raceManager.getRace(eventRaceId)) {
                                  case (?eventRace) {
                                    switch (eventRace.results) {
                                      case (?raceResults) {
                                        for (result in raceResults.vals()) {
                                          // Get bot's faction
                                          switch (Nat.fromText(result.nftId)) {
                                            case (?tokenIndex) {
                                              switch (garageManager.getStats(tokenIndex)) {
                                                case (?botStats) {
                                                  // Convert faction to text key
                                                  let factionKey = switch (botStats.faction) {
                                                    case (#Golden) { "Golden" };
                                                    case (#Crimson) {
                                                      "Crimson";
                                                    };
                                                    case (#Azure) { "Azure" };
                                                    case (#Shadow) { "Shadow" };
                                                    case (#Emerald) {
                                                      "Emerald";
                                                    };
                                                    case (#None) { "None" };
                                                  };

                                                  // Award points: 10 for 1st, 6 for 2nd, 4 for 3rd, 2 for 4th, 1 for rest
                                                  let positionPoints : Nat = if (result.position == 1) {
                                                    10;
                                                  } else if (result.position == 2) {
                                                    6;
                                                  } else if (result.position == 3) {
                                                    4;
                                                  } else if (result.position == 4) {
                                                    2;
                                                  } else { 1 };

                                                  // Add points to faction total
                                                  let currentPoints = switch (Map.get(factionPoints, Map.thash, factionKey)) {
                                                    case (?pts) { pts };
                                                    case (null) { 0 };
                                                  };
                                                  ignore Map.put(factionPoints, Map.thash, factionKey, currentPoints + positionPoints);

                                                  // Track faction members for bonus distribution
                                                  let currentMembers = switch (Map.get(factionMembers, Map.thash, factionKey)) {
                                                    case (?members) { members };
                                                    case (null) { [] };
                                                  };
                                                  // Only add if not already in list
                                                  var alreadyMember = false;
                                                  for (m in currentMembers.vals()) {
                                                    if (m == result.owner) {
                                                      alreadyMember := true;
                                                    };
                                                  };
                                                  if (not alreadyMember) {
                                                    ignore Map.put(factionMembers, Map.thash, factionKey, Array.append(currentMembers, [result.owner]));
                                                  };
                                                };
                                                case (null) {};
                                              };
                                            };
                                            case (null) {};
                                          };
                                        };
                                      };
                                      case (null) {};
                                    };
                                  };
                                  case (null) {};
                                };
                              };

                              // Find winning faction
                              var winningFaction = "None";
                              var winningPoints : Nat = 0;
                              Debug.print("=== FACTION WARS STANDINGS ===");
                              for ((faction, points) in Map.entries(factionPoints)) {
                                Debug.print("Faction " # faction # ": " # Nat.toText(points) # " points");
                                if (points > winningPoints) {
                                  winningFaction := faction;
                                  winningPoints := points;
                                };
                              };

                              Debug.print("Winning faction: " # winningFaction # " with " # Nat.toText(winningPoints) # " points");

                              // Calculate total prize pool from entry fees paid by all registrants
                              var totalPrizePool : Nat = event.metadata.prizePoolBonus; // Start with platform bonus
                              for (registration in event.registrations.vals()) {
                                let classFeeMultiplier : Float = switch (registration.raceClass) {
                                  case (#Scrap) { 1.0 };
                                  case (#Junker) { 1.5 };
                                  case (#Raider) { 2.0 };
                                  case (#Elite) { 2.5 };
                                  case (#SilentKlan) { 3.0 };
                                };
                                totalPrizePool += Int.abs(Float.toInt(Float.fromInt(event.metadata.entryFee) * classFeeMultiplier));
                              };

                              // Add event bonus prize
                              totalPrizePool += event.metadata.eventBonusPrize;

                              // Apply 5% platform tax
                              let platformTax = (totalPrizePool * 5) / 100;
                              let netPrizePool = Nat.sub(totalPrizePool, platformTax);

                              Debug.print("TeamAggregate event total prize pool: " # Nat.toText(totalPrizePool) # " (net: " # Nat.toText(netPrizePool) # " after 5% tax)");

                              // Distribute FULL prize pool to winning faction members (split equally)
                              if (netPrizePool > 0 and winningFaction != "None") {
                                switch (Map.get(factionMembers, Map.thash, winningFaction)) {
                                  case (?winners) {
                                    if (winners.size() > 0) {
                                      let prizePerMember = netPrizePool / winners.size();
                                      Debug.print("Distributing " # Nat.toText(prizePerMember) # " ICP e8s to each of " # Nat.toText(winners.size()) # " " # winningFaction # " members");

                                      var memberIndex : Nat = 0;
                                      for (winner in winners.vals()) {
                                        ignore tt().setActionASync<system>(
                                          Int.abs(Time.now() + (10_000_000_000 * (memberIndex + 1))), // Stagger payouts
                                          {
                                            actionType = "prize_distribution";
                                            params = to_candid ({
                                              raceId = 0 : Nat; // Event-level prize
                                              owner = winner;
                                              amount = prizePerMember;
                                            });
                                          },
                                          PRIZE_DISTRIBUTION_TIMEOUT,
                                        );
                                        memberIndex += 1;
                                      };
                                    };
                                  };
                                  case (null) {};
                                };
                              };

                              // Award parts to winning faction members (UniversalParts based on average class)
                              // Base: 150 parts per member (between Raider and Elite)
                              Debug.print("Awarding parts to winning faction members");
                              switch (Map.get(factionMembers, Map.thash, winningFaction)) {
                                case (?winners) {
                                  let partsPerMember : Nat = 150; // Multi-stage event parts reward
                                  for (winner in winners.vals()) {
                                    garageManager.addParts(winner, #UniversalPart, partsPerMember);
                                    Debug.print("Awarded " # Nat.toText(partsPerMember) # " UniversalParts to " # Principal.toText(winner) # " (TeamAggregate winner)");
                                  };
                                };
                                case (null) {};
                              };
                            };

                            case (#Cumulative) {
                              // MULTI-STAGE EVENT: Sum points per bot, distribute FULL prize pool based on cumulative standings
                              Debug.print("Processing Cumulative scoring for event " # Nat.toText(event.eventId));

                              // Collect cumulative points per bot AND track by division
                              var botPoints = Map.new<Text, Nat>();
                              var botOwners = Map.new<Text, Principal>();
                              var botDivisions = Map.new<Text, RacingSimulator.RaceClass>();

                              for (eventRaceId in event.raceIds.vals()) {
                                switch (raceManager.getRace(eventRaceId)) {
                                  case (?eventRace) {
                                    switch (eventRace.results) {
                                      case (?raceResults) {
                                        for (result in raceResults.vals()) {
                                          let positionPoints : Nat = if (result.position == 1) {
                                            10;
                                          } else if (result.position == 2) { 6 } else if (result.position == 3) {
                                            4;
                                          } else if (result.position == 4) { 2 } else {
                                            1;
                                          };

                                          let currentPoints = switch (Map.get(botPoints, Map.thash, result.nftId)) {
                                            case (?pts) { pts };
                                            case (null) { 0 };
                                          };
                                          ignore Map.put(botPoints, Map.thash, result.nftId, currentPoints + positionPoints);
                                          ignore Map.put(botOwners, Map.thash, result.nftId, result.owner);
                                          ignore Map.put(botDivisions, Map.thash, result.nftId, eventRace.raceClass);
                                        };
                                      };
                                      case (null) {};
                                    };
                                  };
                                  case (null) {};
                                };
                              };

                              // Calculate total prize pool from entry fees paid by all registrants
                              // Entry fee calculation: base fee × class multiplier
                              var totalPrizePool : Nat = event.metadata.prizePoolBonus; // Start with platform bonus
                              for (registration in event.registrations.vals()) {
                                let classFeeMultiplier : Float = switch (registration.raceClass) {
                                  case (#Scrap) { 1.0 };
                                  case (#Junker) { 1.5 };
                                  case (#Raider) { 2.0 };
                                  case (#Elite) { 2.5 };
                                  case (#SilentKlan) { 3.0 };
                                };
                                totalPrizePool += Int.abs(Float.toInt(Float.fromInt(event.metadata.entryFee) * classFeeMultiplier));
                              };

                              // Add event bonus prize
                              totalPrizePool += event.metadata.eventBonusPrize;

                              // Apply 5% platform tax
                              let platformTax = (totalPrizePool * 5) / 100;
                              let netPrizePool = Nat.sub(totalPrizePool, platformTax);

                              Debug.print("Cumulative event total prize pool: " # Nat.toText(totalPrizePool) # " (net: " # Nat.toText(netPrizePool) # " after 5% tax)");

                              // Sort bots by cumulative points (descending)
                              let botEntries = Iter.toArray(Map.entries(botPoints));
                              let sortedBots = Array.sort<(Text, Nat)>(
                                botEntries,
                                func(a : (Text, Nat), b : (Text, Nat)) : {
                                  #less;
                                  #greater;
                                  #equal;
                                } {
                                  if (a.1 > b.1) { #less } else if (a.1 < b.1) {
                                    #greater;
                                  } else { #equal };
                                },
                              );

                              // Print final cumulative standings
                              Debug.print("=== CUMULATIVE EVENT STANDINGS ===");
                              var position : Nat = 1;
                              for ((botId, points) in sortedBots.vals()) {
                                Debug.print("#" # Nat.toText(position) # ": Bot " # botId # " - " # Nat.toText(points) # " points");
                                position += 1;
                              };

                              // Distribute prizes based on cumulative standings (same distribution as individual races)
                              // 1st: 45%, 2nd: 28%, 3rd: 18%, 4th: 9%
                              var prizePosition : Nat = 1;
                              for ((botId, points) in sortedBots.vals()) {
                                let prizeAmount : Nat = if (prizePosition == 1) {
                                  (netPrizePool * 45) / 100;
                                } else if (prizePosition == 2) {
                                  (netPrizePool * 28) / 100;
                                } else if (prizePosition == 3) {
                                  (netPrizePool * 18) / 100;
                                } else if (prizePosition == 4) {
                                  (netPrizePool * 9) / 100;
                                } else {
                                  0;
                                };

                                if (prizeAmount > 0) {
                                  switch (Map.get(botOwners, Map.thash, botId)) {
                                    case (?owner) {
                                      Debug.print("Awarding " # Nat.toText(prizeAmount) # " ICP e8s to Bot " # botId # " (position " # Nat.toText(prizePosition) # ", " # Nat.toText(points) # " points)");
                                      ignore tt().setActionASync<system>(
                                        Int.abs(Time.now() + (10_000_000_000 * prizePosition)), // Stagger by 10s each
                                        {
                                          actionType = "prize_distribution";
                                          params = to_candid ({
                                            raceId = 0 : Nat; // Event-level prize
                                            owner = owner;
                                            amount = prizeAmount;
                                          });
                                        },
                                        PRIZE_DISTRIBUTION_TIMEOUT,
                                      );
                                    };
                                    case (null) {};
                                  };
                                };
                                prizePosition += 1;
                              };

                              // Award parts based on cumulative standings (UniversalParts)
                              // Position-based: 1st=225, 2nd=188, 3rd=165, 4th+=150 (roughly matching normal race parts)
                              Debug.print("Awarding parts based on cumulative standings");
                              var partsPosition : Nat = 1;
                              for ((botId, points) in sortedBots.vals()) {
                                let partsEarned : Nat = if (partsPosition == 1) {
                                  225; // ~150 base * 1.5x winner
                                } else if (partsPosition == 2) {
                                  188; // ~150 base * 1.25x
                                } else if (partsPosition == 3) {
                                  165; // ~150 base * 1.1x
                                } else {
                                  150; // base participation
                                };

                                switch (Map.get(botOwners, Map.thash, botId)) {
                                  case (?owner) {
                                    garageManager.addParts(owner, #UniversalPart, partsEarned);
                                    Debug.print("Awarded " # Nat.toText(partsEarned) # " UniversalParts to Bot " # botId # " (position " # Nat.toText(partsPosition) # ")");
                                  };
                                  case (null) {};
                                };
                                partsPosition += 1;
                              };
                            };

                            case (#Individual) {
                              // Standard: No aggregate scoring needed
                              Debug.print("Event uses Individual scoring - no aggregate processing needed");
                            };

                            case (#Elimination) {
                              // Future: Elimination bracket scoring
                              Debug.print("Elimination scoring not yet implemented");
                            };
                          };

                          // Mark event as completed
                          ignore eventCalendar.updateEventStatus(event.eventId, #Completed);
                          Debug.print("Event " # Nat.toText(event.eventId) # " marked as Completed");
                        };
                      };
                      case (null) {
                        Debug.print("Race not found in event race list");
                      };
                    };
                  };
                  case (null) {
                    Debug.print("Event not found for race " # debug_show (raceId));
                  };
                };
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

    return #awaited(actionId);
  };
  tt().registerExecutionListenerSync(?"upgrade_complete", handleUpgradeCompletion);
  tt().registerExecutionListenerSync(?"race_create", handleRaceCreation);
  tt().registerExecutionListenerSync(?"betting_pool_create", handleBettingPoolCreate);
  tt().registerExecutionListenerSync(?"race_start", handleRaceStart);
  tt().registerExecutionListenerAsync(?"race_finish", handleRaceFinish);
  tt().registerExecutionListenerAsync(?"prize_distribution", handlePrizeDistribution);
  tt().registerExecutionListenerAsync(?"bet_settlement", handleBetSettlement);

  // Create the tool context that will be passed to all tools
  transient let toolContext : ToolContext.ToolContext = {
    canisterPrincipal = Principal.fromActor(self);
    owner = owner;
    appContext = appContext;
    garageManager = garageManager;
    raceManager = raceManager;
    bettingManager = bettingManager;
    eventCalendar = eventCalendar;
    dedicationManager = dedicationManager;
    extCanister = extCanister;
    extCanisterId = extCanisterId;
    icpLedgerCanisterId = func() : ?Principal { icpLedgerCanisterId };
    getMarketplaceListings = getMarketplaceListings;
    timerTool = tt();
    getNFTMetadata = statsManager.getNFTMetadata;
    getStats = garageManager.getStats;
    getCurrentStats = garageManager.getCurrentStats;
    isInActiveRace = func(tokenIndex : Nat) : Bool {
      // Check if bot is in any active race
      let allRaces = raceManager.getAllRaces();
      let nftId = Nat.toText(tokenIndex);
      let activeRace = Array.find<RacingSimulator.Race>(
        allRaces,
        func(r) {
          let isActive = switch (r.status) {
            case (#Upcoming) { true };
            case (#InProgress) { true };
            case (_) { false };
          };
          if (not isActive) { return false };
          let hasEntry = Array.find<RacingSimulator.RaceEntry>(
            r.entries,
            func(e) { e.nftId == nftId },
          );
          Option.isSome(hasEntry);
        },
      );
      Option.isSome(activeRace);
    };
    addSponsor = raceManager.addSponsor;
    checkRegistrationWindow = func(raceId : Nat, now : Int) : Result.Result<(), Text> {
      // Check if registration is open for this race's event
      switch (eventCalendar.getEventByRaceId(raceId)) {
        case (?event) {
          if (now < event.registrationOpens) {
            let hoursUntilOpen = (event.registrationOpens - now) / (60 * 60 * 1_000_000_000);
            return #err("Registration has not opened yet. Opens in " # Nat.toText(Int.abs(hoursUntilOpen)) # " hours.");
          };
          if (now > event.registrationCloses) {
            return #err("Registration has closed for this event.");
          };
          #ok();
        };
        case (null) {
          // Race not part of an event - allow entry
          #ok();
        };
      };
    };
    checkBotInEvent = func(raceId : Nat, nftId : Text) : Result.Result<(), Text> {
      switch (eventCalendar.getEventByRaceId(raceId)) {
        case (?event) {
          // Check if bot is in any race within this event
          for (eventRaceId in event.raceIds.vals()) {
            switch (Map.get(stable_races, Map.nhash, eventRaceId)) {
              case (?eventRace) {
                for (entry in eventRace.entries.vals()) {
                  if (entry.nftId == nftId) {
                    return #err("This bot is already entered in another race in this event (Race #" # Nat.toText(eventRaceId) # ")");
                  };
                };
              };
              case (null) {};
            };
          };
          #ok();
        };
        case (null) { #ok() }; // No event, allow entry
      };
    };
    getUserStarredBots = func(principal : Principal) : [Nat] {
      Option.get(Map.get(stable_user_starred_bots, Map.phash, principal), []);
    };
    getUserRacerBots = func(principal : Principal) : [Nat] {
      Option.get(Map.get(stable_user_racer_bots, Map.phash, principal), []);
    };
    getUserScavengerBots = func(principal : Principal) : [Nat] {
      Option.get(Map.get(stable_user_scavenger_bots, Map.phash, principal), []);
    };
  };

  // Import tool configurations from separate modules
  transient let tools : [McpTypes.Tool] = [
    HelpGetCompendium.config(),
    GarageListMyPokedBots.config(),
    MarketplaceBrowsePokedBots.config(),
    MarketplacePurchasePokedBot.config(),
    GarageInitializePokedBot.config(),
    GarageDeregisterPokedBot.config(),
    GarageGetRobotDetails.config(),
    GarageRechargeRobot.config(),
    GarageRepairRobot.config(),
    GarageUpgradeRobot.config(),
    GarageCancelUpgrade.config(),
    // SECURITY: GarageTransferParts removed - could be exploited to steal parts
    GarageStartScavenging.config(),
    GarageCompleteScavenging.config(),
    GarageConvertParts.config(),
    RacingListRaces.config(),
    RacingListEvents.config(),
    RacingGetMyRegistrations.config(),
    RacingEnterRace.config(),
    RacingSponsorRace.config(),
    RacingGetRaceDetails.config(),
    RacingGetBotRaces.config(),
    RacingRegisterForEvent.config(),
    RacingUnregisterFromEvent.config(),
    RacingGetEventResults.config(),
    BettingPlaceBet.config(),
    BettingListPools.config(),
    BettingGetPoolInfo.config(),
    BettingGetMyBets.config(),
    RacingGetBotNames.config(),
  ];

  // --- 2. CONFIGURE THE SDK ---
  transient let mcpConfig : McpTypes.McpConfig = {
    self = Principal.fromActor(self);
    allowanceUrl = ?allowanceUrl;
    serverInfo = {
      name = "pokedbots-wasteland-racing";
      title = "PokedBots Wasteland Racing";
      version = "0.4.3";
    };
    resources = resources;
    resourceReader = func(uri) {
      Map.get(appContext.resourceContents, Map.thash, uri);
    };
    tools = tools;
    toolImplementations = [
      ("help_get_compendium", HelpGetCompendium.handle(toolContext)),
      ("garage_list_my_pokedbots", GarageListMyPokedBots.handler(toolContext)),
      ("browse_pokedbots", MarketplaceBrowsePokedBots.handle(toolContext)),
      ("purchase_pokedbot", MarketplacePurchasePokedBot.handle(toolContext)),
      ("garage_initialize_pokedbot", GarageInitializePokedBot.handle(toolContext)),
      ("garage_deregister_pokedbot", GarageDeregisterPokedBot.handle(toolContext)),
      ("garage_get_robot_details", GarageGetRobotDetails.handle(toolContext)),
      ("garage_recharge_robot", GarageRechargeRobot.handle(toolContext)),
      ("garage_repair_robot", GarageRepairRobot.handle(toolContext)),
      ("garage_upgrade_robot", GarageUpgradeRobot.handle(toolContext)),
      ("garage_cancel_upgrade", GarageCancelUpgrade.handle(toolContext)),
      // SECURITY: garage_transfer_parts removed - could be exploited to steal parts
      ("garage_start_scavenging", GarageStartScavenging.handle(toolContext)),
      ("garage_complete_scavenging", GarageCompleteScavenging.handle(toolContext)),
      ("garage_convert_parts", GarageConvertParts.handle(toolContext)),
      ("racing_list_races", RacingListRaces.handle(toolContext)),
      ("racing_list_events", RacingListEvents.handle(toolContext)),
      ("racing_get_my_registrations", RacingGetMyRegistrations.handle(toolContext)),
      ("racing_enter_race", RacingEnterRace.handle(toolContext)),
      ("racing_sponsor_race", RacingSponsorRace.handle(toolContext)),
      ("racing_get_race_details", RacingGetRaceDetails.handle(toolContext)),
      ("racing_get_bot_races", RacingGetBotRaces.handle(toolContext)),
      ("racing_register_for_event", RacingRegisterForEvent.handle(toolContext)),
      ("racing_unregister_from_event", RacingUnregisterFromEvent.handle(toolContext)),
      ("racing_get_event_results", RacingGetEventResults.handle(toolContext)),
      ("betting_place_bet", BettingPlaceBet.handle(toolContext)),
      ("betting_list_pools", BettingListPools.handle(toolContext)),
      ("betting_get_pool_info", BettingGetPoolInfo.handle(toolContext)),
      ("betting_get_my_bets", BettingGetMyBets.handle(toolContext)),
      ("racing_get_bot_names", RacingGetBotNames.handle(toolContext)),
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

  /// Set the ICP ledger canister ID. Only the current owner can call this.
  public shared ({ caller }) func set_icp_ledger(ledger_id : Principal) : async Result.Result<(), Text> {
    if (caller != owner) {
      return #err("Only the owner can set the ICP ledger canister ID");
    };
    icpLedgerCanisterId := ?ledger_id;
    return #ok(());
  };

  /// Get the currently configured ICP ledger canister ID.
  public query func get_icp_ledger() : async ?Principal {
    return icpLedgerCanisterId;
  };

  /// Set the EXT NFT canister ID. Only the current owner can call this.
  public shared ({ caller }) func set_ext_canister(canister_id : Principal) : async Result.Result<(), Text> {
    if (caller != owner) {
      return #err("Only the owner can set the EXT canister ID");
    };
    extCanisterId := canister_id;
    // Note: extCanister is transient and initialized at deployment
    // It will use the new extCanisterId on next upgrade
    // For immediate effect, canister should be upgraded after calling this
    return #ok(());
  };

  /// Get the currently configured EXT NFT canister ID.
  public query func get_ext_canister() : async Principal {
    return extCanisterId;
  };

  // --- RACE CREATE TIMER DIAGNOSTIC ENDPOINTS ---

  /// Get race_create timer handler diagnostic logs
  public query func get_race_create_diagnostics() : async {
    entries : [{
      timestamp : Int;
      handlerType : Text;
      actionId : { id : Nat; time : Nat };
      message : Text;
      existingTimerCount : Nat;
      scheduledNextTimer : Bool;
      nextTimerTime : ?Nat;
    }];
    totalCount : Nat;
    currentRaceCreateTimers : Nat;
  } {
    // Get current race_create timers for context
    let raceCreateTimers = tt().getActionsByFilter(#ByType("race_create"));

    return {
      entries = stable_timer_diagnostics;
      totalCount = stable_timer_diagnostics.size();
      currentRaceCreateTimers = raceCreateTimers.size();
    };
  };

  /// Clear race_create timer diagnostic logs (owner only)
  public shared ({ caller }) func clear_race_create_diagnostics() : async Result.Result<Nat, Text> {
    if (caller != owner) {
      return #err("Only the owner can clear timer diagnostics");
    };
    let clearedCount = stable_timer_diagnostics.size();
    stable_timer_diagnostics := [];
    return #ok(clearedCount);
  };

  /// Get detailed timer state for race_create debugging
  public query func get_race_create_timer_state() : async {
    raceCreateTimers : [{ id : Nat; time : Nat; actionType : Text }];
    raceStartTimers : [{ id : Nat; time : Nat; actionType : Text }];
    raceFinishTimers : [{ id : Nat; time : Nat; actionType : Text }];
    allTimerCount : Nat;
  } {
    let raceCreate = tt().getActionsByFilter(#ByType("race_create"));
    let raceStart = tt().getActionsByFilter(#ByType("race_start"));
    let raceFinish = tt().getActionsByFilter(#ByType("race_finish"));

    return {
      raceCreateTimers = Array.map<(TT.ActionId, TT.Action), { id : Nat; time : Nat; actionType : Text }>(
        raceCreate,
        func((aid, act)) {
          { id = aid.id; time = aid.time; actionType = act.actionType };
        },
      );
      raceStartTimers = Array.map<(TT.ActionId, TT.Action), { id : Nat; time : Nat; actionType : Text }>(
        raceStart,
        func((aid, act)) {
          { id = aid.id; time = aid.time; actionType = act.actionType };
        },
      );
      raceFinishTimers = Array.map<(TT.ActionId, TT.Action), { id : Nat; time : Nat; actionType : Text }>(
        raceFinish,
        func((aid, act)) {
          { id = aid.id; time = aid.time; actionType = act.actionType };
        },
      );
      allTimerCount = raceCreate.size() + raceStart.size() + raceFinish.size();
    };
  };

  /// Manually trigger a race_create timer if none exist (owner only, emergency recovery)
  public shared ({ caller }) func force_schedule_race_create() : async Result.Result<{ id : Nat; time : Nat }, Text> {
    if (caller != owner) {
      return #err("Only the owner can force schedule timers");
    };

    let existingTimers = tt().getActionsByFilter(#ByType("race_create"));
    if (existingTimers.size() > 0) {
      return #err("Race create timer already exists (" # Nat.toText(existingTimers.size()) # " timers found)");
    };

    let now = Time.now();
    let nextTime = now + (60 * 1_000_000_000); // 1 minute from now
    let newActionId = tt().setActionSync<system>(
      Int.abs(nextTime),
      {
        actionType = "race_create";
        params = to_candid (());
      },
    );

    addTimerDiagnostic({
      timestamp = now;
      handlerType = "MANUAL_FORCE_SCHEDULE";
      actionId = { id = newActionId.id; time = newActionId.time };
      message = "Manually forced race_create timer creation";
      existingTimerCount = 0;
      scheduledNextTimer = true;
      nextTimerTime = ?Int.abs(nextTime);
    });

    return #ok({ id = newActionId.id; time = newActionId.time });
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

  /// Get total count of NFTs with metadata stored
  public query func get_total_nft_count() : async Nat {
    statsManager.getTotalCount();
  };

  /// Get all token IDs that have metadata
  public query func get_all_token_ids() : async [Nat] {
    statsManager.getAllTokenIds();
  };

  /// Get enriched marketplace listings with racing stats (public query)
  /// Takes a list of token indices to enrich (no inter-canister calls in queries)
  public query func get_marketplace_bots_enriched(tokenIndices : [Nat32]) : async [{
    tokenIndex : Nat32;
    isInitialized : Bool;
    racingStats : ?{
      faction : Text;
      currentSpeed : Nat;
      currentPowerCore : Nat;
      currentAcceleration : Nat;
      currentStability : Nat;
      baseSpeed : Nat;
      basePowerCore : Nat;
      baseAcceleration : Nat;
      baseStability : Nat;
      baseRating : Nat;
      currentRating : Nat;
      overallRating : Nat;
      racesEntered : Nat;
      wins : Nat;
      places : Nat;
      shows : Nat;
      winRate : Float;
      battery : Nat;
      condition : Nat;
    };
    baseStats : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    };
  }] {
    Array.map<Nat32, { tokenIndex : Nat32; isInitialized : Bool; racingStats : ?{ faction : Text; currentSpeed : Nat; currentPowerCore : Nat; currentAcceleration : Nat; currentStability : Nat; baseSpeed : Nat; basePowerCore : Nat; baseAcceleration : Nat; baseStability : Nat; baseRating : Nat; currentRating : Nat; overallRating : Nat; racesEntered : Nat; wins : Nat; places : Nat; shows : Nat; winRate : Float; battery : Nat; condition : Nat }; baseStats : { speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat } }>(
      tokenIndices,
      func(tokenIndex : Nat32) {
        let tokenIndexNat = Nat32.toNat(tokenIndex);

        // Get base stats
        let baseStats = garageManager.getBaseStats(tokenIndexNat);

        // Try to get racing stats
        let maybeRacingStats = garageManager.getStats(tokenIndexNat);

        let racingStatsInfo = switch (maybeRacingStats) {
          case (?stats) {
            // Calculate max stats (base + upgrades only, no penalties, no garage auras)
            let maxStats = {
              speed = baseStats.speed + stats.speedBonus;
              powerCore = baseStats.powerCore + stats.powerCoreBonus;
              acceleration = baseStats.acceleration + stats.accelerationBonus;
              stability = baseStats.stability + stats.stabilityBonus;
            };

            // Calculate base rating (from base stats only)
            let baseRating = (baseStats.speed + baseStats.powerCore + baseStats.acceleration + baseStats.stability) / 4;

            // Calculate current rating (from max stats: base + upgrades)
            let currentRating = (maxStats.speed + maxStats.powerCore + maxStats.acceleration + maxStats.stability) / 4;

            let winRate = if (stats.racesEntered > 0) {
              Float.fromInt(stats.wins) / Float.fromInt(stats.racesEntered) * 100.0;
            } else { 0.0 };

            let factionText = switch (stats.faction) {
              case (#UltimateMaster) { "UltimateMaster" };
              case (#Wild) { "Wild" };
              case (#Golden) { "Golden" };
              case (#Ultimate) { "Ultimate" };
              case (#Blackhole) { "Blackhole" };
              case (#Dead) { "Dead" };
              case (#Master) { "Master" };
              case (#Bee) { "Bee" };
              case (#Food) { "Food" };
              case (#Box) { "Box" };
              case (#Murder) { "Murder" };
              case (#Game) { "Game" };
              case (#Animal) { "Animal" };
              case (#Industrial) { "Industrial" };
            };

            ?{
              faction = factionText;
              currentSpeed = maxStats.speed;
              currentPowerCore = maxStats.powerCore;
              currentAcceleration = maxStats.acceleration;
              currentStability = maxStats.stability;
              baseSpeed = baseStats.speed;
              basePowerCore = baseStats.powerCore;
              baseAcceleration = baseStats.acceleration;
              baseStability = baseStats.stability;
              baseRating = baseRating;
              currentRating = currentRating;
              overallRating = currentRating;
              racesEntered = stats.racesEntered;
              wins = stats.wins;
              places = stats.places;
              shows = stats.shows;
              winRate = winRate;
              battery = stats.battery;
              condition = stats.condition;
            };
          };
          case (null) { null };
        };

        {
          tokenIndex = tokenIndex;
          isInitialized = switch (maybeRacingStats) {
            case (?_) { true };
            case (null) { false };
          };
          racingStats = racingStatsInfo;
          baseStats = baseStats;
        };
      },
    );
  };

  /// Debug: Get detailed scavenging calculations for a bot
  /// Shows all intermediate values for battery/condition accumulation
  public query func debug_scavenging_calculation(tokenIndex : Nat) : async ?{
    hasActiveMission : Bool;
    zone : ?Text;
    battery : Nat;
    condition : Nat;
    startTime : Int;
    lastAccumulation : Int;
    currentTime : Int;
    hoursSinceLastAccumulation : Float;
    totalHoursElapsed : Float;
    baseRates : {
      parts : Float;
      battery : Float;
      condition : Float;
    };
    zoneMultipliers : {
      parts : Float;
      battery : Float;
      condition : Float;
    };
    factionBonus : {
      partsMultiplier : Float;
      batteryMultiplier : Float;
      conditionMultiplier : Float;
    };
    currentStats : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    };
    statBonuses : {
      powerCoreBonus : Float;
      stabilityBonus : Float;
      speedBonus : Float;
    };
    chargingCurve : Float;
    durationBonus : Float;
    calculatedDrain : {
      batteryDrain : Float;
      conditionLoss : Float;
      partsAccumulation : Float;
    };
    finalRounded : {
      batteryChange : Int;
      conditionChange : Int;
      partsGained : Nat;
    };
    newValues : {
      battery : Nat;
      condition : Nat;
    };
  } {
    switch (garageManager.getStats(tokenIndex)) {
      case (null) { null };
      case (?stats) {
        switch (stats.activeMission) {
          case (null) {
            ?{
              hasActiveMission = false;
              zone = null;
              battery = stats.battery;
              condition = stats.condition;
              startTime = 0;
              lastAccumulation = 0;
              currentTime = Time.now();
              hoursSinceLastAccumulation = 0.0;
              totalHoursElapsed = 0.0;
              baseRates = { parts = 0.0; battery = 0.0; condition = 0.0 };
              zoneMultipliers = { parts = 0.0; battery = 0.0; condition = 0.0 };
              factionBonus = {
                partsMultiplier = 0.0;
                batteryMultiplier = 0.0;
                conditionMultiplier = 0.0;
              };
              currentStats = {
                speed = 0;
                powerCore = 0;
                acceleration = 0;
                stability = 0;
              };
              statBonuses = {
                powerCoreBonus = 0.0;
                stabilityBonus = 0.0;
                speedBonus = 0.0;
              };
              chargingCurve = 0.0;
              durationBonus = 0.0;
              calculatedDrain = {
                batteryDrain = 0.0;
                conditionLoss = 0.0;
                partsAccumulation = 0.0;
              };
              finalRounded = {
                batteryChange = 0;
                conditionChange = 0;
                partsGained = 0;
              };
              newValues = {
                battery = stats.battery;
                condition = stats.condition;
              };
            };
          };
          case (?mission) {
            let now = Time.now();
            let effectiveNow = switch (mission.durationMinutes) {
              case (null) { now };
              case (?minutes) {
                let durationNanos = minutes * 60 * 1_000_000_000;
                let missionEndTime = mission.startTime + durationNanos;
                if (now > missionEndTime) { missionEndTime } else { now };
              };
            };

            let nanosSince = effectiveNow - mission.lastAccumulation;
            let hoursElapsed = Float.fromInt(nanosSince) / Float.fromInt(3600 * 1_000_000_000);
            let totalHoursElapsed = Float.fromInt((now - mission.startTime) / (3600 * 1_000_000_000));

            let rates = garageManager.getHourlyRates();
            let zoneMultipliers = garageManager.getZoneMultipliers(mission.zone);
            let factionBonus = garageManager.getFactionScavengingBonus(stats.faction, mission.zone);
            let currentStats = garageManager.getCurrentStats(stats);

            let pcScaled = Float.fromInt(currentStats.powerCore) / 100.0;
            let powerCoreBonus = 1.0 - (pcScaled ** 1.5 * 0.75);
            let stabilityBonus = if (mission.zone == #DeadMachineFields) {
              let stabScaled = Float.fromInt(currentStats.stability) / 100.0;
              1.0 - (stabScaled ** 1.5 * 0.75);
            } else { 1.0 };
            let speedBonus = 1.0 + (Float.fromInt(currentStats.speed) / 100.0 * 0.10);

            let durationBonus = garageManager.getDurationBonus(Int.abs(Float.toInt(totalHoursElapsed)));

            let synergies = garageManager.calculateFactionSynergies(stats.ownerPrincipal);

            let partsThisAccumulation = rates.basePartsPerHour * hoursElapsed * zoneMultipliers.parts * factionBonus.partsMultiplier * speedBonus * durationBonus * synergies.yieldMultipliers.scavengingParts;

            // Calculate battery drain using proper tiered charging simulation for ChargingStation
            // NOTE: Don't apply powerCoreBonus or faction batteryMultiplier to restoration!
            // Those bonuses reduce battery DRAIN, not increase charging speed.
            // POWER GRID: Apply garage power efficiency to charging rate
            let batteryDrain = if (mission.zone == #ChargingStation) {
              let baseRestorationRate = Float.abs(rates.baseBatteryDrain * zoneMultipliers.battery / durationBonus * synergies.drainMultipliers.scavengingDrain);
              let powerEfficiency = garageManager.getGaragePowerEfficiency(stats.ownerPrincipal);
              let batteryGained = garageManager.calculateChargingStationBattery(stats.battery, baseRestorationRate, hoursElapsed, powerEfficiency);
              -batteryGained; // Negative = restoration
            } else {
              rates.baseBatteryDrain * hoursElapsed * zoneMultipliers.battery * factionBonus.batteryMultiplier * powerCoreBonus / durationBonus * synergies.drainMultipliers.scavengingDrain;
            };

            // Calculate effective charging curve for display (actual battery gained / base rate battery)
            let chargingCurve = if (mission.zone == #ChargingStation and hoursElapsed > 0.0) {
              let baseRestorationRate = Float.abs(rates.baseBatteryDrain * zoneMultipliers.battery / durationBonus * synergies.drainMultipliers.scavengingDrain);
              let baseRestoration = baseRestorationRate * hoursElapsed; // What we'd get at 1.0x
              let actualRestoration = Float.abs(batteryDrain);
              if (baseRestoration > 0.0) { actualRestoration / baseRestoration } else {
                1.0;
              };
            } else { 1.0 };

            // Faction condition multiplier should only apply to damage, not restoration
            // In RepairBay, the zone multiplier is negative (restoration), so we don't apply faction penalty
            // Same for stabilityBonus - it reduces condition DAMAGE, shouldn't slow restoration
            let isRestorationZone = mission.zone == #RepairBay;
            let factionConditionMult = if (isRestorationZone) {
              1.0; // No faction modifier for restoration
            } else {
              factionBonus.conditionMultiplier; // Apply faction modifier for damage
            };
            let effectiveStabilityBonus = if (isRestorationZone) {
              1.0; // No stability modifier for restoration
            } else {
              stabilityBonus; // Apply stability modifier for damage
            };

            let conditionLoss = rates.baseConditionLoss * hoursElapsed * zoneMultipliers.condition * factionConditionMult * effectiveStabilityBonus / durationBonus * synergies.drainMultipliers.scavengingDrain;

            // Apply variance (same as actual function)
            let batteryVariance = Float.fromInt((PokedBotsGarage.hashNat(tokenIndex + Int.abs(now)) % 41) - 20) / 100.0;
            let conditionVariance = Float.fromInt((PokedBotsGarage.hashNat(tokenIndex + Int.abs(now) + 1) % 41) - 20) / 100.0;

            let batteryDrainWithVariance = batteryDrain * (1.0 + batteryVariance);
            let conditionLossWithVariance = conditionLoss * (1.0 + conditionVariance);

            // Probabilistic rounding
            let batteryFloor = Int.abs(Float.toInt(batteryDrainWithVariance));
            let batteryFraction = batteryDrainWithVariance - Float.fromInt(batteryFloor);
            let batteryRng = Float.fromInt(PokedBotsGarage.hashNat(tokenIndex + Int.abs(now) + 2) % 100) / 100.0;
            let batteryDrainRounded = if (batteryRng < batteryFraction) {
              batteryFloor + 1;
            } else {
              batteryFloor;
            };

            // Update battery (restoration for ChargingStation, drain for others)
            let newBattery = if (batteryDrainWithVariance < 0.0) {
              // Restoration: add battery (capped at 100)
              // FIX: Use float comparison to check if we should reach 100%
              // This prevents variance and rounding from keeping bots stuck at 99%
              let preVarianceBatteryFloat = Float.fromInt(stats.battery) + Float.abs(batteryDrain);
              if (preVarianceBatteryFloat >= 99.5) {
                // Close enough to 100 - just complete the charge
                100;
              } else {
                Nat.min(100, stats.battery + batteryDrainRounded);
              };
            } else {
              if (stats.battery > batteryDrainRounded) {
                stats.battery - batteryDrainRounded;
              } else { 0 };
            };

            let conditionFloor = Int.abs(Float.toInt(conditionLossWithVariance));
            let conditionFraction = Float.abs(conditionLossWithVariance) - Float.fromInt(conditionFloor);
            let conditionRng = Float.fromInt(PokedBotsGarage.hashNat(tokenIndex + Int.abs(now) + 3) % 100) / 100.0;
            let conditionChangeRounded = if (conditionRng < conditionFraction) {
              conditionFloor + 1;
            } else {
              conditionFloor;
            };

            let newCondition = if (conditionLossWithVariance < 0.0) {
              Nat.min(100, stats.condition + conditionChangeRounded);
            } else {
              if (stats.condition > conditionChangeRounded) {
                stats.condition - conditionChangeRounded;
              } else { 0 };
            };

            let partsFloor = Int.abs(Float.toInt(partsThisAccumulation));

            ?{
              hasActiveMission = true;
              zone = ?debug_show (mission.zone);
              battery = stats.battery;
              condition = stats.condition;
              startTime = mission.startTime;
              lastAccumulation = mission.lastAccumulation;
              currentTime = now;
              hoursSinceLastAccumulation = hoursElapsed;
              totalHoursElapsed = totalHoursElapsed;
              baseRates = {
                parts = rates.basePartsPerHour;
                battery = rates.baseBatteryDrain;
                condition = rates.baseConditionLoss;
              };
              zoneMultipliers = {
                parts = zoneMultipliers.parts;
                battery = zoneMultipliers.battery;
                condition = zoneMultipliers.condition;
              };
              factionBonus = {
                partsMultiplier = factionBonus.partsMultiplier;
                batteryMultiplier = factionBonus.batteryMultiplier;
                conditionMultiplier = factionBonus.conditionMultiplier;
              };
              currentStats = {
                speed = currentStats.speed;
                powerCore = currentStats.powerCore;
                acceleration = currentStats.acceleration;
                stability = currentStats.stability;
              };
              statBonuses = {
                powerCoreBonus = powerCoreBonus;
                stabilityBonus = stabilityBonus;
                speedBonus = speedBonus;
              };
              chargingCurve = chargingCurve;
              durationBonus = durationBonus;
              calculatedDrain = {
                batteryDrain = batteryDrainWithVariance;
                conditionLoss = conditionLossWithVariance;
                partsAccumulation = partsThisAccumulation;
              };
              finalRounded = {
                batteryChange = if (batteryDrainWithVariance < 0.0) {
                  batteryDrainRounded;
                } else { -batteryDrainRounded };
                conditionChange = if (conditionLossWithVariance < 0.0) {
                  conditionChangeRounded;
                } else { -conditionChangeRounded };
                partsGained = partsFloor;
              };
              newValues = {
                battery = newBattery;
                condition = newCondition;
              };
            };
          };
        };
      };
    };
  };

  /// Debug: Test simulate a race with specific bots and track
  /// Returns backend-calculated times for validation
  public shared func debug_test_simulation(
    tokenIndexes : [Nat],
    trackId : Nat,
    trackSeed : Nat,
    distanceKm : Nat,
    phenomenonIndex : ?Nat, // Optional: 0-12 to override daily phenomenon (null = use current day)
  ) : async ?{
    results : [{
      tokenIndex : Nat;
      finalTime : Float;
      stats : {
        speed : Nat;
        powerCore : Nat;
        acceleration : Nat;
        stability : Nat;
        luck : Nat;
      };
    }];
    events : [{
      eventType : RacingSimulator.RaceEventType;
      timestamp : Float;
      segmentIndex : Nat;
      description : Text;
    }];
    createdAt : Int; // Timestamp used for luck system daily phenomenon
  } {
    // Get track to determine terrain
    let trackOpt = RacingSimulator.getTrack(trackId);
    let terrain = switch (trackOpt) {
      case (?track) { track.primaryTerrain };
      case (null) { #ScrapHeaps }; // Fallback
    };

    // Get stats for all bots at 100% battery/condition with terrain bonuses applied
    let participants = Array.mapFilter<Nat, RacingSimulator.RacingParticipant>(
      tokenIndexes,
      func(tokenIndex : Nat) : ?RacingSimulator.RacingParticipant {
        let nftId = Nat.toText(tokenIndex);
        switch (garageManager.getStatsAt100WithTerrain(nftId, terrain)) {
          case (?stats) {
            // Get faction and base stats for luck system
            let (faction, baseAvgRating) : (RacingSimulator.FactionType, ?Nat) = switch (garageManager.getStats(tokenIndex)) {
              case (?botStats) {
                // Calculate base avg rating without terrain/faction bonuses (for MomentumShift)
                let baseStats = garageManager.getBaseStats(tokenIndex);
                let baseAvg = (baseStats.speed + baseStats.powerCore + baseStats.acceleration + baseStats.stability) / 4;
                (botStats.faction, ?baseAvg);
              };
              case (null) { (#Industrial, null) }; // Default faction
            };
            ?{
              nftId = nftId;
              owner = Principal.fromText("aaaaa-aa"); // Dummy owner for test
              stats = stats;
              tokenIndex = tokenIndex;
              faction = faction;
              baseAvgRating = baseAvgRating;
            };
          };
          case null { null };
        };
      },
    );

    if (participants.size() == 0) {
      return null;
    };

    // Create a test race
    let distance = distanceKm; // Keep as km (calculateSegmentTime expects km)
    let duration = raceSimulator.calculateRaceDuration(distanceKm, terrain);

    // Calculate timestamp for phenomenon - either use override or current time
    let nanosPerDay : Int = 86_400_000_000_000;
    let raceTimestamp : Int = switch (phenomenonIndex) {
      case (?idx) {
        // Create a timestamp that will result in the desired phenomenon index
        // Phenomenon is calculated as: (timestamp / nanosPerDay) % 13
        // So we set timestamp = idx * nanosPerDay to get that index
        idx * nanosPerDay;
      };
      case null {
        Time.now(); // Use current time
      };
    };

    let testRace : RacingSimulator.Race = {
      raceId = 0;
      name = "Test Simulation";
      trackId = trackId;
      trackSeed = trackSeed;
      distance = distance;
      duration = duration;
      terrain = terrain;
      entryFee = 0;
      prizePool = 0;
      platformBonus = 0;
      platformTax = 0;
      maxEntries = 20;
      minEntries = 2;
      startTime = raceTimestamp;
      entryDeadline = 0;
      status = #InProgress;
      entries = [];
      results = null;
      events = [];
      createdAt = raceTimestamp;
      raceClass = #Junker;
      sponsors = [];
    };

    // Simulate the race
    Debug.print("MAIN_BEFORE_SIMULATE trackId=" # Nat.toText(trackId) # " participants=" # Nat.toText(participants.size()));
    switch (raceSimulator.simulateRaceSegmented(testRace, participants)) {
      case (?(results, events)) {
        let formattedResults = Array.map<RacingSimulator.RaceResult, { tokenIndex : Nat; finalTime : Float; stats : { speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat; luck : Nat } }>(
          results,
          func(result : RacingSimulator.RaceResult) : {
            tokenIndex : Nat;
            finalTime : Float;
            stats : {
              speed : Nat;
              powerCore : Nat;
              acceleration : Nat;
              stability : Nat;
              luck : Nat;
            };
          } {
            let tokenIndex = switch (Nat.fromText(result.nftId)) {
              case (?idx) { idx };
              case null { 0 };
            };
            // Get the stats that were actually used in the simulation (with all bonuses)
            let botStats = switch (Array.find<RacingSimulator.RacingParticipant>(participants, func(p) { p.nftId == result.nftId })) {
              case (?participant) { participant.stats };
              case null {
                {
                  speed = 50;
                  powerCore = 50;
                  acceleration = 50;
                  stability = 50;
                  luck = 10;
                  overcharge = 0;
                  perfectTuneUp = false;
                };
              };
            };
            {
              tokenIndex = tokenIndex;
              finalTime = result.finalTime;
              stats = botStats;
            };
          },
        );
        ?{
          results = formattedResults;
          events = events;
          createdAt = raceTimestamp;
        };
      };
      case null { null };
    };
  };

  /// Debug: Re-simulate an existing race using its stored data
  /// This helps debug mismatches between frontend and backend simulations
  public shared ({ caller }) func debug_resimulate_race(raceId : Nat) : async ?{
    originalResults : [{
      nftId : Text;
      position : Nat;
      finalTime : Float;
      stats : ?RacingSimulator.RacingStats;
    }];
    resimulatedResults : [{
      nftId : Text;
      position : Nat;
      finalTime : Float;
    }];
    raceParams : {
      trackId : Nat;
      trackSeed : Nat;
      distance : Nat;
      terrain : RacingSimulator.Terrain;
      createdAt : Int;
      participantOrder : [Text]; // Entry order for participantIndex calculation
    };
  } {
    // Admin check
    if (caller != owner) {
      Debug.print("debug_resimulate_race: unauthorized caller");
      return null;
    };

    // Get the race
    let race = switch (raceManager.getRace(raceId)) {
      case (?r) { r };
      case null {
        Debug.print("debug_resimulate_race: race not found");
        return null;
      };
    };

    // Check race has results
    let originalResults = switch (race.results) {
      case (?results) { results };
      case null {
        Debug.print("debug_resimulate_race: race has no results");
        return null;
      };
    };

    Debug.print("=== DEBUG RESIMULATE RACE " # Nat.toText(raceId) # " ===");
    Debug.print("Track: " # Nat.toText(race.trackId) # ", Seed: " # Nat.toText(race.trackSeed) # ", Distance: " # Nat.toText(race.distance) # "km");
    Debug.print("Terrain: " # debug_show (race.terrain) # ", CreatedAt: " # Int.toText(race.createdAt));
    Debug.print("Entries: " # Nat.toText(race.entries.size()));

    // Build participants from entries (same order as original race)
    var participants : [RacingSimulator.RacingParticipant] = [];
    var entryOrder : [Text] = [];

    for (entry in race.entries.vals()) {
      entryOrder := Array.append(entryOrder, [entry.nftId]);

      // Use the stats snapshot from entry if available, otherwise from results
      let stats : RacingSimulator.RacingStats = switch (entry.stats) {
        case (?s) { s };
        case null {
          // Fall back to result stats
          switch (Array.find<RacingSimulator.RaceResult>(originalResults, func(r) { r.nftId == entry.nftId })) {
            case (?result) {
              switch (result.stats) {
                case (?s) { s };
                case null {
                  {
                    speed = 50;
                    powerCore = 50;
                    acceleration = 50;
                    stability = 50;
                    luck = 10;
                    overcharge = 0;
                    perfectTuneUp = false;
                  };
                };
              };
            };
            case null {
              {
                speed = 50;
                powerCore = 50;
                acceleration = 50;
                stability = 50;
                luck = 10;
                overcharge = 0;
                perfectTuneUp = false;
              };
            };
          };
        };
      };

      Debug.print("Entry " # entry.nftId # ": speed=" # Nat.toText(stats.speed) # " power=" # Nat.toText(stats.powerCore) # " accel=" # Nat.toText(stats.acceleration) # " stab=" # Nat.toText(stats.stability) # " luck=" # Nat.toText(stats.luck));

      let tokenIdx = switch (Nat.fromText(entry.nftId)) {
        case (?idx) { idx };
        case null { 0 };
      };

      // Get faction and baseAvgRating for luck system
      let (faction, baseAvgRating) : (RacingSimulator.FactionType, ?Nat) = switch (garageManager.getStats(tokenIdx)) {
        case (?botStats) {
          let baseStats = garageManager.getBaseStats(tokenIdx);
          let baseAvg = (baseStats.speed + baseStats.powerCore + baseStats.acceleration + baseStats.stability) / 4;
          (botStats.faction, ?baseAvg);
        };
        case (null) { (#Industrial, null) };
      };

      let participant : RacingSimulator.RacingParticipant = {
        nftId = entry.nftId;
        owner = entry.owner;
        stats = stats;
        tokenIndex = tokenIdx;
        faction = faction;
        baseAvgRating = baseAvgRating;
      };
      participants := Array.append(participants, [participant]);
    };

    Debug.print("Built " # Nat.toText(participants.size()) # " participants from entries");
    Debug.print("Entry order: " # debug_show (entryOrder));

    // Re-simulate the race with the EXACT same parameters
    switch (raceSimulator.simulateRaceSegmented(race, participants)) {
      case (?(newResults, events)) {
        Debug.print("=== RESIMULATION RESULTS ===");

        let formattedOriginal = Array.map<RacingSimulator.RaceResult, { nftId : Text; position : Nat; finalTime : Float; stats : ?RacingSimulator.RacingStats }>(
          originalResults,
          func(r) {
            {
              nftId = r.nftId;
              position = r.position;
              finalTime = r.finalTime;
              stats = r.stats;
            };
          },
        );

        let formattedNew = Array.map<RacingSimulator.RaceResult, { nftId : Text; position : Nat; finalTime : Float }>(
          newResults,
          func(r) {
            { nftId = r.nftId; position = r.position; finalTime = r.finalTime };
          },
        );

        // Compare results
        for (i in Iter.range(0, Nat.min(originalResults.size(), newResults.size()) - 1)) {
          let orig = originalResults[i];
          let new_ = newResults[i];
          let diff = Float.abs(orig.finalTime - new_.finalTime);
          Debug.print("Bot " # orig.nftId # ": Original=" # Float.toText(orig.finalTime) # "s, Resim=" # Float.toText(new_.finalTime) # "s, Diff=" # Float.toText(diff) # "s");
        };

        ?{
          originalResults = formattedOriginal;
          resimulatedResults = formattedNew;
          raceParams = {
            trackId = race.trackId;
            trackSeed = race.trackSeed;
            distance = race.distance;
            terrain = race.terrain;
            createdAt = race.createdAt;
            participantOrder = entryOrder;
          };
        };
      };
      case null {
        Debug.print("Resimulation failed!");
        null;
      };
    };
  };

  // --- RACE HISTORY ---

  /// Get all completed races with their results for analysis
  public query func get_completed_races(limit : Nat) : async [{
    raceId : Nat;
    name : Text;
    terrain : RacingSimulator.Terrain;
    distance : Nat;
    raceClass : RacingSimulator.RaceClass;
    trackId : Nat;
    trackSeed : Nat;
    entryCount : Nat;
    results : ?[{
      position : Nat;
      nftId : Text;
      finalTime : Float;
    }];
  }] {
    let allRaces = raceManager.getAllRaces();

    // Filter only completed races with results
    let completedRaces = Array.filter<RacingSimulator.Race>(
      allRaces,
      func(race) {
        switch (race.status) {
          case (#Completed) { Option.isSome(race.results) };
          case (_) { false };
        };
      },
    );

    // Take only the requested number
    let limited = if (completedRaces.size() > limit) {
      Array.tabulate<RacingSimulator.Race>(limit, func(i) { completedRaces[i] });
    } else {
      completedRaces;
    };

    // Map to output format
    Array.map<RacingSimulator.Race, { raceId : Nat; name : Text; terrain : RacingSimulator.Terrain; distance : Nat; raceClass : RacingSimulator.RaceClass; trackId : Nat; trackSeed : Nat; entryCount : Nat; results : ?[{ position : Nat; nftId : Text; finalTime : Float }] }>(
      limited,
      func(race) {
        let mappedResults = switch (race.results) {
          case (?results) {
            ?Array.map<RacingSimulator.RaceResult, { position : Nat; nftId : Text; finalTime : Float }>(
              results,
              func(r) {
                {
                  position = r.position;
                  nftId = r.nftId;
                  finalTime = r.finalTime;
                };
              },
            );
          };
          case (null) { null };
        };

        {
          raceId = race.raceId;
          name = race.name;
          terrain = race.terrain;
          distance = race.distance;
          raceClass = race.raceClass;
          trackId = race.trackId;
          trackSeed = race.trackSeed;
          entryCount = race.entries.size();
          results = mappedResults;
        };
      },
    );
  };

  // --- SIMULATION TESTING ---

  /// Test/debug: Simulate a race with specific bots on a specific track
  /// Returns detailed results for balance testing, including race events for replay
  public shared func debug_simulate_race(
    trackId : Nat,
    tokenIndices : [Nat],
    seed : Nat,
  ) : async ?{
    track : {
      trackId : Nat;
      name : Text;
      description : Text;
      totalDistance : Nat;
      laps : Nat;
      segmentCount : Nat;
    };
    participants : [{
      tokenIndex : Nat;
      stats : {
        speed : Nat;
        powerCore : Nat;
        acceleration : Nat;
        stability : Nat;
      };
    }];
    results : [{
      tokenIndex : Nat;
      position : Nat;
      finalTime : Float;
      avgSegmentTime : Float;
    }];
    events : [{
      eventType : Text;
      timestamp : Float;
      segmentIndex : Nat;
      description : Text;
    }];
    analysis : {
      winner : Nat;
      winnerTime : Float;
      lastPlaceTime : Float;
      timeSpread : Float;
      avgTime : Float;
    };
  } {
    Debug.print("=== DEBUG_SIMULATE_RACE CALLED ===");
    Debug.print("trackId: " # Nat.toText(trackId));
    Debug.print("seed: " # Nat.toText(seed));
    Debug.print("tokenIndices count: " # Nat.toText(tokenIndices.size()));

    // Get track
    let trackOpt = RacingSimulator.getTrack(trackId);
    let track = switch (trackOpt) {
      case (?t) { t };
      case (null) { return null };
    };

    // Build participants from token indices
    var participants : [RacingSimulator.RacingParticipant] = [];
    var participantData : [{
      tokenIndex : Nat;
      stats : {
        speed : Nat;
        powerCore : Nat;
        acceleration : Nat;
        stability : Nat;
      };
    }] = [];

    for (tokenIndex in tokenIndices.vals()) {
      let nftId = Nat.toText(tokenIndex);
      // Get stats at 100% with terrain bonuses (matches actual race simulation)
      switch (garageManager.getStatsAt100WithTerrain(nftId, track.primaryTerrain)) {
        case (?statsAt100) {
          // Get faction and base stats for luck system
          let (faction, baseAvgRating) : (RacingSimulator.FactionType, ?Nat) = switch (garageManager.getStats(tokenIndex)) {
            case (?botStats) {
              // Calculate base avg rating without terrain/faction bonuses (for MomentumShift)
              let baseStats = garageManager.getBaseStats(tokenIndex);
              let baseAvg = (baseStats.speed + baseStats.powerCore + baseStats.acceleration + baseStats.stability) / 4;
              (botStats.faction, ?baseAvg);
            };
            case (null) { (#Industrial, null) }; // Default faction
          };
          let participant : RacingSimulator.RacingParticipant = {
            nftId = nftId;
            owner = Principal.fromText("aaaaa-aa"); // Dummy principal for simulation
            stats = statsAt100;
            tokenIndex = tokenIndex;
            faction = faction;
            baseAvgRating = baseAvgRating;
          };

          participants := Array.append(participants, [participant]);
          participantData := Array.append(
            participantData,
            [{
              tokenIndex = tokenIndex;
              stats = statsAt100;
            }],
          );
        };
        case (null) {
          // Skip uninitialized bots
        };
      };
    };

    if (participants.size() < 2) {
      return null;
    };

    // Create mock race
    let mockRace : RacingSimulator.Race = {
      raceId = 999999;
      name = "Debug Test Race";
      distance = track.totalDistance / 1000; // Convert meters to km
      terrain = track.primaryTerrain;
      trackId = trackId;
      trackSeed = seed; // Use provided seed for reproducibility testing
      raceClass = #Elite;
      entryFee = 0;
      maxEntries = 20;
      minEntries = 2;
      startTime = Time.now();
      duration = 300;
      entryDeadline = Time.now();
      createdAt = Time.now();
      entries = [];
      status = #InProgress;
      results = null;
      events = [];
      prizePool = 0;
      platformTax = 0;
      platformBonus = 0;
      sponsors = [];
    };

    // Simulate the race
    let simulator = RacingSimulator.RaceSimulator();
    switch (simulator.simulateRaceSegmented(mockRace, participants)) {
      case (?(results, raceEvents)) {
        // Calculate analysis
        var totalTime : Float = 0.0;
        var fastestTime : Float = 999999.0;
        var slowestTime : Float = 0.0;
        var winnerIndex : Nat = 0;

        var resultData : [{
          tokenIndex : Nat;
          position : Nat;
          finalTime : Float;
          avgSegmentTime : Float;
        }] = [];

        let totalSegments = track.segments.size() * track.laps;

        for (result in results.vals()) {
          let tokenIndex = switch (Nat.fromText(result.nftId)) {
            case (?idx) { idx };
            case (null) { 0 };
          };

          if (result.finalTime < 999999.0) {
            // Not DNF
            totalTime += result.finalTime;
            if (result.finalTime < fastestTime) {
              fastestTime := result.finalTime;
              winnerIndex := tokenIndex;
            };
            if (result.finalTime > slowestTime) {
              slowestTime := result.finalTime;
            };
          };

          resultData := Array.append(
            resultData,
            [{
              tokenIndex = tokenIndex;
              position = result.position;
              finalTime = result.finalTime;
              avgSegmentTime = if (totalSegments > 0) {
                result.finalTime / Float.fromInt(totalSegments);
              } else { 0.0 };
            }],
          );
        };

        let avgTime = if (results.size() > 0) {
          totalTime / Float.fromInt(results.size());
        } else { 0.0 };

        // Convert race events to serializable format
        let eventData = Array.map<RacingSimulator.RaceEvent, { eventType : Text; timestamp : Float; segmentIndex : Nat; description : Text }>(
          raceEvents,
          func(event) {
            let eventTypeText = switch (event.eventType) {
              case (#Overtake(_)) { "Overtake" };
              case (#LeadChange(_)) { "LeadChange" };
              case (#LargeGap(_)) { "LargeGap" };
              case (#CloseRacing(_)) { "CloseRacing" };
              case (#ExceptionalPerformance(_)) { "ExceptionalPerformance" };
              case (#PoorPerformance(_)) { "PoorPerformance" };
              case (#SegmentComplete(_)) { "SegmentComplete" };
              case (#LuckProc(_)) { "LuckProc" };
              case (#BadLuck(_)) { "BadLuck" };
            };
            {
              eventType = eventTypeText;
              timestamp = event.timestamp;
              segmentIndex = event.segmentIndex;
              description = event.description;
            };
          },
        );

        ?{
          track = {
            trackId = track.trackId;
            name = track.name;
            description = track.description;
            totalDistance = track.totalDistance;
            laps = track.laps;
            segmentCount = track.segments.size();
          };
          participants = participantData;
          results = resultData;
          events = eventData;
          analysis = {
            winner = winnerIndex;
            winnerTime = fastestTime;
            lastPlaceTime = slowestTime;
            timeSpread = slowestTime - fastestTime;
            avgTime = avgTime;
          };
        };
      };
      case (null) { null };
    };
  };

  /// Test/debug: Get all available tracks
  public query func debug_get_all_tracks() : async [{
    trackId : Nat;
    name : Text;
    description : Text;
    totalDistance : Nat;
    primaryTerrain : RacingSimulator.Terrain;
    laps : Nat;
    segmentCount : Nat;
  }] {
    let trackIds = [1, 2, 3, 4, 5];
    var tracks : [{
      trackId : Nat;
      name : Text;
      description : Text;
      totalDistance : Nat;
      primaryTerrain : RacingSimulator.Terrain;
      laps : Nat;
      segmentCount : Nat;
    }] = [];

    for (id in trackIds.vals()) {
      switch (RacingSimulator.getTrack(id)) {
        case (?track) {
          tracks := Array.append(
            tracks,
            [{
              trackId = track.trackId;
              name = track.name;
              description = track.description;
              totalDistance = track.totalDistance;
              primaryTerrain = track.primaryTerrain;
              laps = track.laps;
              segmentCount = track.segments.size();
            }],
          );
        };
        case (null) {};
      };
    };

    tracks;
  };

  /// Get a specific trait value ID by trait index (for calculations)
  public query func get_nft_trait_value(tokenId : Nat, traitIndex : Nat) : async ?Nat {
    statsManager.getTraitValue(tokenId, traitIndex);
  };

  /// Get a decoded trait value by trait name (for display)
  public query func get_nft_trait(tokenId : Nat, traitName : Text) : async ?Text {
    statsManager.getTraitValueByName(tokenId, traitName);
  };

  /// Get public bot profile (stats + career, no sensitive info like battery/condition)
  public query func get_bot_profile(tokenIndex : Nat) : async ?{
    tokenIndex : Nat;
    name : ?Text;
    owner : ?Principal;
    faction : ?PokedBotsGarage.FactionType;
    raceClass : ?RacingSimulator.RaceClass;
    preferredTerrain : ?RacingSimulator.Terrain;
    stats : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
      luck : Nat;
      overallRating : Nat;
    };
    career : {
      racesEntered : Nat;
      wins : Nat;
      podiums : Nat;
      totalEarnings : Nat;
    };
    eloRating : ?Nat;
    isInitialized : Bool;
  } {
    switch (garageManager.getStats(tokenIndex)) {
      case (?botStats) {
        // Show stats at 100% (no battery/condition penalties visible to others)
        let baseStats = garageManager.getBaseStats(tokenIndex);
        let statsAt100 = {
          speed = baseStats.speed + botStats.speedBonus;
          powerCore = baseStats.powerCore + botStats.powerCoreBonus;
          acceleration = baseStats.acceleration + botStats.accelerationBonus;
          stability = baseStats.stability + botStats.stabilityBonus;
        };
        // Calculate rating based on stats at 100% (luck not included in rating)
        let totalStats = statsAt100.speed + statsAt100.powerCore + statsAt100.acceleration + statsAt100.stability;
        let rating = totalStats / 4;
        let raceClass = getRaceClassFromRating(rating);

        ?{
          tokenIndex = tokenIndex;
          name = botStats.name;
          owner = ?botStats.ownerPrincipal;
          faction = ?botStats.faction;
          raceClass = ?raceClass;
          preferredTerrain = ?botStats.preferredTerrain;
          stats = {
            speed = statsAt100.speed;
            powerCore = statsAt100.powerCore;
            acceleration = statsAt100.acceleration;
            stability = statsAt100.stability;
            luck = botStats.luckBase + botStats.luckBonus;
            overallRating = rating;
          };
          career = {
            racesEntered = botStats.racesEntered;
            wins = botStats.wins;
            podiums = Nat.add(botStats.wins, Nat.add(botStats.places, botStats.shows));
            totalEarnings = botStats.totalScrapEarned;
          };
          eloRating = ?botStats.eloRating;
          isInitialized = true;
        };
      };
      case (null) {
        // Bot not initialized - return base stats only with faction info
        let baseStats = garageManager.getBaseStats(tokenIndex);
        let totalBaseStats = baseStats.speed + baseStats.powerCore + baseStats.acceleration + baseStats.stability;
        let baseRating = totalBaseStats / 4;
        let baseLuck = 10; // Fixed luck for all bots

        // Get faction from precomputed stats
        let precomputedStats = Map.get(stable_base_stats, Map.nhash, tokenIndex);
        let faction = switch (precomputedStats) {
          case (?stats) { ?stats.faction };
          case (null) { null };
        };

        ?{
          tokenIndex = tokenIndex;
          name = null;
          owner = null;
          faction = faction;
          raceClass = null;
          preferredTerrain = null;
          stats = {
            speed = baseStats.speed;
            powerCore = baseStats.powerCore;
            acceleration = baseStats.acceleration;
            stability = baseStats.stability;
            luck = baseLuck;
            overallRating = baseRating;
          };
          career = {
            racesEntered = 0;
            wins = 0;
            podiums = 0;
            totalEarnings = 0;
          };
          eloRating = null;
          isInitialized = false;
        };
      };
    };
  };

  /// Batch get bot profiles (efficient for loading multiple bots at once)
  public query func get_bot_profiles_batch(tokenIndices : [Nat]) : async [{
    tokenIndex : Nat;
    name : ?Text;
    owner : ?Principal;
    faction : ?PokedBotsGarage.FactionType;
    raceClass : ?RacingSimulator.RaceClass;
    preferredTerrain : ?RacingSimulator.Terrain;
    stats : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
      luck : Nat;
      overallRating : Nat;
    };
    career : {
      racesEntered : Nat;
      wins : Nat;
      podiums : Nat;
      totalEarnings : Nat;
    };
    eloRating : ?Nat;
    isInitialized : Bool;
  }] {
    let buffer = Buffer.Buffer<{ tokenIndex : Nat; name : ?Text; owner : ?Principal; faction : ?PokedBotsGarage.FactionType; raceClass : ?RacingSimulator.RaceClass; preferredTerrain : ?RacingSimulator.Terrain; stats : { speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat; luck : Nat; overallRating : Nat }; career : { racesEntered : Nat; wins : Nat; podiums : Nat; totalEarnings : Nat }; eloRating : ?Nat; isInitialized : Bool }>(tokenIndices.size());

    for (tokenIndex in tokenIndices.vals()) {
      switch (garageManager.getStats(tokenIndex)) {
        case (?botStats) {
          // Show stats at 100% (no battery/condition penalties visible to others)
          let baseStats = garageManager.getBaseStats(tokenIndex);
          let statsAt100 = {
            speed = baseStats.speed + botStats.speedBonus;
            powerCore = baseStats.powerCore + botStats.powerCoreBonus;
            acceleration = baseStats.acceleration + botStats.accelerationBonus;
            stability = baseStats.stability + botStats.stabilityBonus;
          };
          // Calculate rating based on stats at 100% (luck not included in rating)
          let totalStats = statsAt100.speed + statsAt100.powerCore + statsAt100.acceleration + statsAt100.stability;
          let rating = totalStats / 4;
          let raceClass = getRaceClassFromRating(rating);

          buffer.add({
            tokenIndex = tokenIndex;
            name = botStats.name;
            owner = ?botStats.ownerPrincipal;
            faction = ?botStats.faction;
            raceClass = ?raceClass;
            preferredTerrain = ?botStats.preferredTerrain;
            stats = {
              speed = statsAt100.speed;
              powerCore = statsAt100.powerCore;
              acceleration = statsAt100.acceleration;
              stability = statsAt100.stability;
              luck = botStats.luckBase + botStats.luckBonus;
              overallRating = rating;
            };
            career = {
              racesEntered = botStats.racesEntered;
              wins = botStats.wins;
              podiums = Nat.add(botStats.wins, Nat.add(botStats.places, botStats.shows));
              totalEarnings = botStats.totalScrapEarned;
            };
            eloRating = ?botStats.eloRating;
            isInitialized = true;
          });
        };
        case (null) {
          // Bot not initialized - return base stats only with faction info
          let baseStats = garageManager.getBaseStats(tokenIndex);
          let totalBaseStats = baseStats.speed + baseStats.powerCore + baseStats.acceleration + baseStats.stability;
          let baseRating = totalBaseStats / 4;
          let baseLuck = 10; // Fixed luck for all bots

          // Get faction from precomputed stats
          let precomputedStats = Map.get(stable_base_stats, Map.nhash, tokenIndex);
          let faction = switch (precomputedStats) {
            case (?stats) { ?stats.faction };
            case (null) { null };
          };

          buffer.add({
            tokenIndex = tokenIndex;
            name = null;
            owner = null;
            faction = faction;
            raceClass = null;
            preferredTerrain = null;
            stats = {
              speed = baseStats.speed;
              powerCore = baseStats.powerCore;
              acceleration = baseStats.acceleration;
              stability = baseStats.stability;
              luck = baseLuck;
              overallRating = baseRating;
            };
            career = {
              racesEntered = 0;
              wins = 0;
              podiums = 0;
              totalEarnings = 0;
            };
            eloRating = null;
            isInitialized = false;
          });
        };
      };
    };

    Buffer.toArray(buffer);
  };

  // ===== ADMIN DEBUG METHODS =====

  /// Get detailed stat breakdown for debugging (admin only)
  public shared query (msg) func admin_get_stat_breakdown(tokenIndex : Nat) : async Result.Result<{ tokenIndex : Nat; owner : ?Principal; isInitialized : Bool; speed : { base : Nat; upgrades : Nat; batteryPenalty : Float; batteryEffect : Int; overcharge : Float; overchargeEffect : Int; synergy : Nat; worldBuff : Nat; dedication : Nat; final : Nat }; powerCore : { base : Nat; upgrades : Nat; conditionPenalty : Float; conditionEffect : Int; overcharge : Float; overchargeEffect : Int; synergy : Nat; worldBuff : Nat; dedication : Nat; final : Nat }; acceleration : { base : Nat; upgrades : Nat; batteryPenalty : Float; batteryEffect : Int; overcharge : Float; overchargeEffect : Int; synergy : Nat; worldBuff : Nat; dedication : Nat; final : Nat }; stability : { base : Nat; upgrades : Nat; conditionPenalty : Float; conditionEffect : Int; overcharge : Float; overchargeEffect : Int; synergy : Nat; worldBuff : Nat; dedication : Nat; final : Nat }; battery : Nat; condition : Nat; overchargePercent : Nat; perfectTuneUp : Bool }, Text> {
    if (msg.caller != owner) {
      return #err("Only the owner can access stat breakdowns");
    };

    let statsOpt = garageManager.getStats(tokenIndex);
    switch (statsOpt) {
      case (null) {
        #err("Bot not initialized for racing");
      };
      case (?stats) {
        let breakdown = garageManager.getStatBreakdown(stats);
        #ok({
          tokenIndex = tokenIndex;
          owner = ?stats.ownerPrincipal;
          isInitialized = true;
          speed = breakdown.speed;
          powerCore = breakdown.powerCore;
          acceleration = breakdown.acceleration;
          stability = breakdown.stability;
          battery = breakdown.battery;
          condition = breakdown.condition;
          overchargePercent = breakdown.overchargePercent;
          perfectTuneUp = breakdown.perfectTuneUp;
        });
      };
    };
  };

  /// Get resonance info for a bot (admin only) - for verifying the resonance system
  public shared query (msg) func admin_get_resonance(tokenIndex : Nat) : async Result.Result<{ tokenIndex : Nat; currentTime : Int; recharge : { optimalPoint : Nat; inPeakZone : Bool; inGoodZone : Bool; resonanceStatus : Text; hoursUntilDrift : Nat }; repair : { optimalPoint : Nat; inPeakZone : Bool; inGoodZone : Bool; resonanceStatus : Text; hoursUntilDrift : Nat }; currentBattery : ?Nat; currentCondition : ?Nat }, Text> {
    if (msg.caller != owner) {
      return #err("Only the owner can access resonance info");
    };

    let now = Time.now();

    // Get current stats if available
    let statsOpt = garageManager.getStats(tokenIndex);
    let (battery, condition) = switch (statsOpt) {
      case (?stats) { (?stats.battery, ?stats.condition) };
      case (null) { (null, null) };
    };

    // Calculate resonance for both recharge and repair
    let rechargeResonance = ResonanceSystem.calculateResonance(
      tokenIndex,
      #Recharge,
      Option.get(battery, 50), // Default to 50% if no stats
      now,
    );

    let repairResonance = ResonanceSystem.calculateResonance(
      tokenIndex,
      #Repair,
      Option.get(condition, 50), // Default to 50% if no stats
      now,
    );

    #ok({
      tokenIndex = tokenIndex;
      currentTime = now;
      recharge = {
        optimalPoint = rechargeResonance.optimalPoint;
        inPeakZone = rechargeResonance.inPeakZone;
        inGoodZone = rechargeResonance.inGoodZone;
        resonanceStatus = rechargeResonance.resonanceStatus;
        hoursUntilDrift = rechargeResonance.hoursUntilDrift;
      };
      repair = {
        optimalPoint = repairResonance.optimalPoint;
        inPeakZone = repairResonance.inPeakZone;
        inGoodZone = repairResonance.inGoodZone;
        resonanceStatus = repairResonance.resonanceStatus;
        hoursUntilDrift = repairResonance.hoursUntilDrift;
      };
      currentBattery = battery;
      currentCondition = condition;
    });
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
      let factionType : PokedBotsGarage.FactionType = switch (stats.faction) {
        case ("UltimateMaster") { #UltimateMaster };
        case ("Ultimate-master") { #UltimateMaster }; // Handle hyphenated variant
        case ("Wild") { #Wild };
        case ("Golden") { #Golden };
        case ("Ultimate") { #Ultimate };
        case ("Blackhole") { #Blackhole };
        case ("Dead") { #Dead };
        case ("Master") { #Master };
        case ("Bee") { #Bee };
        case ("Food") { #Food };
        case ("Box") { #Box };
        case ("Murder") { #Murder };
        case ("Game") { #Game };
        case ("Animal") { #Animal };
        case ("Industrial") { #Industrial };
        case (_) { #Industrial }; // Default to Industrial
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
    tt().cancelActionsByFilter<system>(filter);
  };

  public shared func cancel_actions_by_ids(ids : [Nat]) : async TT.CancellationResult {
    tt().cancelActionsByIds<system>(ids);
  };

  public query func get_actions_by_filter(filter : TT.ActionFilter) : async [TT.ActionDetail] {
    tt().getActionsByFilter(filter);
  };

  public shared func emergency_clear_all_timers() : async Nat {
    tt().emergencyClearAllTimers<system>();
  };

  public shared func force_system_timer_cancel() : async Bool {
    tt().forceSystemTimerCancel();
  };

  public shared func force_release_lock() : async ?Time.Time {
    tt().forceReleaseLock();
  };

  // ===== LEADERBOARD QUERY FUNCTIONS =====

  // Get platform-wide statistics
  public query func get_platform_stats() : async {
    totalRacers : Nat;
    totalRaces : Nat;
    totalWins : Nat;
    totalEarnings : Nat;
  } {
    leaderboardManager.getPlatformStats();
  };

  // Get leaderboard by type with pagination
  public query func get_leaderboard(
    lbType : Leaderboard.LeaderboardType,
    limit : Nat,
    offset : Nat,
    bracket : ?RacingSimulator.RaceClass,
  ) : async {
    entries : [Leaderboard.LeaderboardEntry];
    total : Nat;
    hasMore : Bool;
  } {
    let entries = leaderboardManager.getLeaderboard(lbType, ?limit, ?offset, bracket);
    let total = leaderboardManager.getTotalCount(lbType, bracket);
    let hasMore = offset + limit < total;
    {
      entries = entries;
      total = total;
      hasMore = hasMore;
    };
  };

  // Get leaderboard entry for a specific bot
  public query func get_my_ranking(
    lbType : Leaderboard.LeaderboardType,
    tokenIndex : Nat,
  ) : async ?Leaderboard.LeaderboardEntry {
    leaderboardManager.getEntryForBot(lbType, tokenIndex);
  };

  // Get current season and month IDs
  public query func get_current_periods() : async {
    seasonId : Nat;
    monthId : Nat;
  } {
    {
      seasonId = leaderboardManager.getCurrentSeasonId();
      monthId = leaderboardManager.getCurrentMonthId();
    };
  };

  // Get upcoming scheduled events
  public query func get_upcoming_events(daysAhead : Nat) : async [RaceCalendar.ScheduledEvent] {
    let now = Time.now();
    eventCalendar.getUpcomingEvents(now, daysAhead);
  };

  // Get upcoming events with race summaries
  // Now includes events that have any pending/upcoming races, even if event start time has passed
  public query func get_upcoming_events_with_races(daysAhead : Nat) : async [{
    event : RaceCalendar.ScheduledEvent;
    raceSummary : {
      totalRaces : Nat;
      terrains : [RacingSimulator.Terrain];
      distances : [Nat];
      totalParticipants : Nat;
      totalPrizePool : Nat;
      nextRaceStartTime : ?Int; // When the next race starts (null if all completed)
      completedRaces : Nat;
      pendingRaces : Nat;
    };
  }] {
    let now = Time.now();
    let NANOS_PER_DAY : Int = 86400_000_000_000;
    let endTime = now + (daysAhead * NANOS_PER_DAY);

    // Get all non-cancelled/non-completed events
    let allEvents = eventCalendar.getAllEvents();

    // Filter to events that either:
    // 1. Have scheduledTime within range (traditional upcoming)
    // 2. Have any races that are still pending/upcoming (multi-stage events)
    let relevantEvents = Array.filter<RaceCalendar.ScheduledEvent>(
      allEvents,
      func(e) {
        // Skip cancelled/completed events
        if (e.status == #Completed or e.status == #Cancelled) {
          return false;
        };

        // Traditional check: event is upcoming
        let isTraditionalUpcoming = e.scheduledTime >= now and e.scheduledTime <= endTime;

        // New check: event has any pending/upcoming races (for multi-stage events)
        var hasUpcomingRaces = false;
        for (raceId in e.raceIds.vals()) {
          switch (raceManager.getRace(raceId)) {
            case (?race) {
              // Race is upcoming if it's not completed/cancelled
              switch (race.status) {
                case (#Upcoming) { hasUpcomingRaces := true };
                case (#InProgress) { hasUpcomingRaces := true };
                case _ {};
              };
            };
            case (null) {};
          };
        };

        isTraditionalUpcoming or hasUpcomingRaces;
      },
    );

    // Sort by next race start time or event scheduled time
    let sortedEvents = Array.sort<RaceCalendar.ScheduledEvent>(
      relevantEvents,
      func(a, b) { Int.compare(a.scheduledTime, b.scheduledTime) },
    );

    Array.map<RaceCalendar.ScheduledEvent, { event : RaceCalendar.ScheduledEvent; raceSummary : { totalRaces : Nat; terrains : [RacingSimulator.Terrain]; distances : [Nat]; totalParticipants : Nat; totalPrizePool : Nat; nextRaceStartTime : ?Int; completedRaces : Nat; pendingRaces : Nat } }>(
      sortedEvents,
      func(event) {
        var terrains : [RacingSimulator.Terrain] = [];
        var distances : [Nat] = [];
        var totalParticipants : Nat = 0;
        var totalPrizePool : Nat = 0;
        var nextRaceStartTime : ?Int = null;
        var completedRaces : Nat = 0;
        var pendingRaces : Nat = 0;

        for (raceId in event.raceIds.vals()) {
          switch (raceManager.getRace(raceId)) {
            case (?race) {
              terrains := Array.append(terrains, [race.terrain]);
              distances := Array.append(distances, [race.distance]);
              totalParticipants += race.entries.size();
              // Calculate total pool: entry fees + platform bonus + sponsorships
              var sponsorships : Nat = 0;
              for (sponsor in race.sponsors.vals()) {
                sponsorships += sponsor.amount;
              };
              totalPrizePool += race.prizePool + race.platformBonus + sponsorships;

              // Track race status and find next race start time
              switch (race.status) {
                case (#Completed) { completedRaces += 1 };
                case (#Cancelled) { completedRaces += 1 }; // Count as "done"
                case _ {
                  pendingRaces += 1;
                  // Find earliest upcoming race
                  if (race.startTime > now) {
                    switch (nextRaceStartTime) {
                      case (null) { nextRaceStartTime := ?race.startTime };
                      case (?current) {
                        if (race.startTime < current) {
                          nextRaceStartTime := ?race.startTime;
                        };
                      };
                    };
                  };
                };
              };
            };
            case (null) {};
          };
        };

        {
          event = event;
          raceSummary = {
            totalRaces = event.raceIds.size();
            terrains = terrains;
            distances = distances;
            totalParticipants = totalParticipants;
            totalPrizePool = totalPrizePool;
            nextRaceStartTime = nextRaceStartTime;
            completedRaces = completedRaces;
            pendingRaces = pendingRaces;
          };
        };
      },
    );
  };

  // Get past events (paginated)
  public query func get_past_events(offset : Nat, limit : Nat) : async [RaceCalendar.ScheduledEvent] {
    let now = Time.now();
    eventCalendar.getPastEvents(now, offset, limit);
  };

  // Get all events
  public query func get_all_scheduled_events() : async [RaceCalendar.ScheduledEvent] {
    eventCalendar.getAllEvents();
  };

  // Get event details by ID
  public query func get_event_details(eventId : Nat) : async ?RaceCalendar.ScheduledEvent {
    eventCalendar.getEvent(eventId);
  };

  // Get event with aggregated race details
  public query func get_event_with_races(eventId : Nat) : async ?{
    event : RaceCalendar.ScheduledEvent;
    races : [{
      raceId : Nat;
      name : Text;
      distance : Nat;
      terrain : RacingSimulator.Terrain;
      raceClass : RacingSimulator.RaceClass;
      entryFee : Nat;
      currentEntries : Nat;
      maxEntries : Nat;
      participantTokens : [Nat];
    }];
  } {
    switch (eventCalendar.getEvent(eventId)) {
      case (null) { null };
      case (?event) {
        var raceDetails : [{
          raceId : Nat;
          name : Text;
          distance : Nat;
          terrain : RacingSimulator.Terrain;
          raceClass : RacingSimulator.RaceClass;
          entryFee : Nat;
          currentEntries : Nat;
          maxEntries : Nat;
          participantTokens : [Nat];
        }] = [];

        for (raceId in event.raceIds.vals()) {
          switch (raceManager.getRace(raceId)) {
            case (?race) {
              // Extract token indices from entries
              let tokens = Array.map<RacingSimulator.RaceEntry, Nat>(
                race.entries,
                func(entry) {
                  // Parse token index from nftId (format: "token_123")
                  let parts = Text.split(entry.nftId, #char '_');
                  var tokenIndex : Nat = 0;
                  for (part in parts) {
                    switch (Nat.fromText(part)) {
                      case (?n) { tokenIndex := n };
                      case (null) {};
                    };
                  };
                  tokenIndex;
                },
              );

              raceDetails := Array.append(
                raceDetails,
                [{
                  raceId = race.raceId;
                  name = race.name;
                  distance = race.distance;
                  terrain = race.terrain;
                  raceClass = race.raceClass;
                  entryFee = race.entryFee;
                  currentEntries = race.entries.size();
                  maxEntries = race.maxEntries;
                  participantTokens = tokens;
                }],
              );
            };
            case (null) {};
          };
        };

        ?{
          event = event;
          races = raceDetails;
        };
      };
    };
  };

  // Event result entry for cumulative standings
  public type EventStandingEntry = {
    tokenIndex : Nat;
    owner : Principal;
    cumulativePoints : Nat;
    position : Nat;
    raceResults : [{
      raceId : Nat;
      stageName : Text;
      position : Nat;
      points : Nat;
    }];
    prizeAmount : Nat;
  };

  // Faction standing entry for team aggregate scoring
  public type FactionStandingEntry = {
    faction : Text;
    totalPoints : Nat;
    position : Nat;
    memberCount : Nat;
    members : [{ tokenIndex : Nat; owner : Principal; points : Nat }];
    prizePerMember : Nat;
  };

  // Get event results with cumulative standings for multi-stage events
  public query func get_event_results(eventId : Nat) : async ?{
    event : RaceCalendar.ScheduledEvent;
    scoringMode : RaceCalendar.ScoringMode;
    isMultiStage : Bool;
    totalPrizePool : Nat;
    cumulativeStandings : ?[EventStandingEntry];
    factionStandings : ?[FactionStandingEntry];
    raceResultsSummary : [{
      raceId : Nat;
      stageName : Text;
      raceClass : RaceCalendar.RaceClass;
      terrain : RacingSimulator.Terrain;
      distance : Nat;
      status : RacingSimulator.RaceStatus;
      results : ?[{
        position : Nat;
        tokenIndex : Nat;
        owner : Principal;
        finalTime : Float;
        prizeAmount : Nat;
      }];
    }];
  } {
    switch (eventCalendar.getEvent(eventId)) {
      case (null) { null };
      case (?event) {
        // Check if this is a multi-stage event
        let isMultiStage = switch (event.metadata.scoringMode) {
          case (#Cumulative) { true };
          case (#TeamAggregate) { true };
          case (#Individual) { false };
          case (#Elimination) { false };
        };

        // Calculate total prize pool
        var totalPrizePool : Nat = event.metadata.prizePoolBonus + event.metadata.eventBonusPrize;
        for (registration in event.registrations.vals()) {
          let classFeeMultiplier : Float = switch (registration.raceClass) {
            case (#Scrap) { 1.0 };
            case (#Junker) { 1.5 };
            case (#Raider) { 2.0 };
            case (#Elite) { 2.5 };
            case (#SilentKlan) { 3.0 };
          };
          totalPrizePool += Int.abs(Float.toInt(Float.fromInt(event.metadata.entryFee) * classFeeMultiplier));
        };

        // Apply 5% platform tax for net prize pool calculation
        let platformTax = (totalPrizePool * 5) / 100;
        let netPrizePool = Nat.sub(totalPrizePool, platformTax);

        // Build race results summary
        var raceResultsSummary : [{
          raceId : Nat;
          stageName : Text;
          raceClass : RaceCalendar.RaceClass;
          terrain : RacingSimulator.Terrain;
          distance : Nat;
          status : RacingSimulator.RaceStatus;
          results : ?[{
            position : Nat;
            tokenIndex : Nat;
            owner : Principal;
            finalTime : Float;
            prizeAmount : Nat;
          }];
        }] = [];

        // Maps for cumulative calculations
        var botPoints = Map.new<Nat, Nat>(); // tokenIndex -> total points
        var botOwners = Map.new<Nat, Principal>(); // tokenIndex -> owner
        var botRaceResults = Map.new<Nat, [{ raceId : Nat; stageName : Text; position : Nat; points : Nat }]>(); // tokenIndex -> race results
        var factionPoints = Map.new<Text, Nat>(); // faction -> total points
        var factionMembers = Map.new<Text, [{ tokenIndex : Nat; owner : Principal; points : Nat }]>(); // faction -> members

        for (raceId in event.raceIds.vals()) {
          switch (raceManager.getRace(raceId)) {
            case (?race) {
              // Extract stage name from race name (format: "Event Name - Stage Name (Heat N)")
              let stageName = race.name;

              let raceResultsOpt : ?[{
                position : Nat;
                tokenIndex : Nat;
                owner : Principal;
                finalTime : Float;
                prizeAmount : Nat;
              }] = switch (race.results) {
                case (?results) {
                  ?Array.map<RacingSimulator.RaceResult, { position : Nat; tokenIndex : Nat; owner : Principal; finalTime : Float; prizeAmount : Nat }>(
                    results,
                    func(r) {
                      let tokenIdx = switch (Nat.fromText(r.nftId)) {
                        case (?idx) { idx };
                        case (null) { 0 };
                      };

                      // Calculate points for this position
                      let positionPoints : Nat = if (r.position == 1) {
                        10;
                      } else if (r.position == 2) {
                        6;
                      } else if (r.position == 3) {
                        4;
                      } else if (r.position == 4) {
                        2;
                      } else { 1 };

                      // Update cumulative standings
                      let currentPoints = switch (Map.get(botPoints, Map.nhash, tokenIdx)) {
                        case (?pts) { pts };
                        case (null) { 0 };
                      };
                      ignore Map.put(botPoints, Map.nhash, tokenIdx, currentPoints + positionPoints);
                      ignore Map.put(botOwners, Map.nhash, tokenIdx, r.owner);

                      // Track per-race results for this bot
                      let currentRaceResults = switch (Map.get(botRaceResults, Map.nhash, tokenIdx)) {
                        case (?rr) { rr };
                        case (null) { [] };
                      };
                      ignore Map.put(botRaceResults, Map.nhash, tokenIdx, Array.append(currentRaceResults, [{ raceId = race.raceId; stageName = stageName; position = r.position; points = positionPoints }]));

                      // Update faction standings (for TeamAggregate)
                      switch (garageManager.getStats(tokenIdx)) {
                        case (?botStats) {
                          let factionKey = switch (botStats.faction) {
                            case (#Golden) { "Golden" };
                            case (#Crimson) { "Crimson" };
                            case (#Azure) { "Azure" };
                            case (#Shadow) { "Shadow" };
                            case (#Emerald) { "Emerald" };
                            case (#None) { "None" };
                          };

                          // Add to faction total
                          let currentFactionPoints = switch (Map.get(factionPoints, Map.thash, factionKey)) {
                            case (?pts) { pts };
                            case (null) { 0 };
                          };
                          ignore Map.put(factionPoints, Map.thash, factionKey, currentFactionPoints + positionPoints);

                          // Track faction members (accumulate points per member)
                          let currentMembers = switch (Map.get(factionMembers, Map.thash, factionKey)) {
                            case (?members) { members };
                            case (null) { [] };
                          };

                          // Find if member already tracked, update their points
                          var found = false;
                          var updatedMembers : [{
                            tokenIndex : Nat;
                            owner : Principal;
                            points : Nat;
                          }] = [];
                          for (m in currentMembers.vals()) {
                            if (m.tokenIndex == tokenIdx) {
                              updatedMembers := Array.append(updatedMembers, [{ tokenIndex = tokenIdx; owner = r.owner; points = m.points + positionPoints }]);
                              found := true;
                            } else {
                              updatedMembers := Array.append(updatedMembers, [m]);
                            };
                          };
                          if (not found) {
                            updatedMembers := Array.append(updatedMembers, [{ tokenIndex = tokenIdx; owner = r.owner; points = positionPoints }]);
                          };
                          ignore Map.put(factionMembers, Map.thash, factionKey, updatedMembers);
                        };
                        case (null) {};
                      };

                      {
                        position = r.position;
                        tokenIndex = tokenIdx;
                        owner = r.owner;
                        finalTime = r.finalTime;
                        prizeAmount = r.prizeAmount;
                      };
                    },
                  );
                };
                case (null) { null };
              };

              raceResultsSummary := Array.append(raceResultsSummary, [{ raceId = race.raceId; stageName = stageName; raceClass = race.raceClass; terrain = race.terrain; distance = race.distance; status = race.status; results = raceResultsOpt }]);
            };
            case (null) {};
          };
        };

        // Build cumulative standings (sorted by points descending)
        var cumulativeStandings : ?[EventStandingEntry] = null;
        if (event.metadata.scoringMode == #Cumulative) {
          let botEntries = Iter.toArray(Map.entries(botPoints));
          let sortedBots = Array.sort<(Nat, Nat)>(
            botEntries,
            func(a : (Nat, Nat), b : (Nat, Nat)) : { #less; #greater; #equal } {
              if (a.1 > b.1) { #less } else if (a.1 < b.1) { #greater } else {
                #equal;
              };
            },
          );

          var standings : [EventStandingEntry] = [];
          var pos : Nat = 1;
          for ((tokenIdx, points) in sortedBots.vals()) {
            let owner = switch (Map.get(botOwners, Map.nhash, tokenIdx)) {
              case (?o) { o };
              case (null) { Principal.fromText("aaaaa-aa") };
            };
            let raceResults = switch (Map.get(botRaceResults, Map.nhash, tokenIdx)) {
              case (?rr) { rr };
              case (null) { [] };
            };

            // Calculate prize amount based on position (same distribution as race prizes)
            let prizeAmount : Nat = if (pos == 1) {
              (netPrizePool * 45) / 100;
            } else if (pos == 2) {
              (netPrizePool * 28) / 100;
            } else if (pos == 3) {
              (netPrizePool * 18) / 100;
            } else if (pos == 4) {
              (netPrizePool * 9) / 100;
            } else { 0 };

            standings := Array.append(standings, [{ tokenIndex = tokenIdx; owner = owner; cumulativePoints = points; position = pos; raceResults = raceResults; prizeAmount = prizeAmount }]);
            pos += 1;
          };
          cumulativeStandings := ?standings;
        };

        // Build faction standings (sorted by points descending)
        var factionStandings : ?[FactionStandingEntry] = null;
        if (event.metadata.scoringMode == #TeamAggregate) {
          let factionEntries = Iter.toArray(Map.entries(factionPoints));
          let sortedFactions = Array.sort<(Text, Nat)>(
            factionEntries,
            func(a : (Text, Nat), b : (Text, Nat)) : { #less; #greater; #equal } {
              if (a.1 > b.1) { #less } else if (a.1 < b.1) { #greater } else {
                #equal;
              };
            },
          );

          var standings : [FactionStandingEntry] = [];
          var pos : Nat = 1;
          for ((faction, points) in sortedFactions.vals()) {
            let members = switch (Map.get(factionMembers, Map.thash, faction)) {
              case (?m) { m };
              case (null) { [] };
            };

            // Only winning faction gets prize
            let prizePerMember : Nat = if (pos == 1 and members.size() > 0) {
              netPrizePool / members.size();
            } else { 0 };

            standings := Array.append(standings, [{ faction = faction; totalPoints = points; position = pos; memberCount = members.size(); members = members; prizePerMember = prizePerMember }]);
            pos += 1;
          };
          factionStandings := ?standings;
        };

        ?{
          event = event;
          scoringMode = event.metadata.scoringMode;
          isMultiStage = isMultiStage;
          totalPrizePool = totalPrizePool;
          cumulativeStandings = cumulativeStandings;
          factionStandings = factionStandings;
          raceResultsSummary = raceResultsSummary;
        };
      };
    };
  };

  // Get race details by race ID
  public query func get_race_by_id(raceId : Nat) : async ?RacingSimulator.Race {
    raceManager.getRace(raceId);
  };

  // Debug: Regenerate commentary for a completed race
  public shared ({ caller }) func debug_regenerate_race_commentary(raceId : Nat) : async Result.Result<Text, Text> {
    if (caller != owner) {
      return #err("Unauthorized: Only owner can regenerate commentary");
    };

    let ?race = Map.get(stable_races, Map.nhash, raceId) else {
      return #err("Race not found");
    };

    // Only regenerate for completed races
    switch (race.status) {
      case (#Completed) {};
      case (_) {
        return #err("Can only regenerate commentary for completed races");
      };
    };

    // Verify race has results
    let ?results = race.results else {
      return #err("Race has no results to generate commentary from");
    };

    // Use original entries to maintain deterministic simulation order
    // The simulation is seeded and depends on participant order
    let participants = Array.map<RacingSimulator.RaceEntry, RacingSimulator.RacingParticipant>(
      race.entries,
      func(entry) : RacingSimulator.RacingParticipant {
        // Parse tokenIndex from nftId string and get faction for luck system
        let tokenIdx = switch (Nat.fromText(entry.nftId)) {
          case (?idx) { idx };
          case (null) { 0 };
        };
        let (faction, baseAvgRating) : (RacingSimulator.FactionType, ?Nat) = switch (garageManager.getStats(tokenIdx)) {
          case (?botStats) {
            // Calculate base avg rating without terrain/faction bonuses (for MomentumShift)
            let baseStats = garageManager.getBaseStats(tokenIdx);
            let baseAvg = (baseStats.speed + baseStats.powerCore + baseStats.acceleration + baseStats.stability) / 4;
            (botStats.faction, ?baseAvg);
          };
          case (null) { (#Industrial, null) }; // Default faction
        };
        {
          nftId = entry.nftId;
          owner = entry.owner;
          stats = Option.get(entry.stats, { speed = 100; stability = 100; powerCore = 100; acceleration = 100; luck = 30; overcharge = 0; perfectTuneUp = false });
          tokenIndex = tokenIdx;
          faction = faction;
          baseAvgRating = baseAvgRating;
        };
      },
    );

    // Call simulator with existing race data to regenerate events
    let ?(_, newEvents) = raceSimulator.simulateRaceSegmented(race, participants) else {
      return #err("Failed to regenerate commentary");
    };

    // Update race with new events
    let updatedRace : RacingSimulator.Race = {
      raceId = race.raceId;
      name = race.name;
      distance = race.distance;
      terrain = race.terrain;
      trackId = race.trackId;
      trackSeed = race.trackSeed;
      raceClass = race.raceClass;
      entryFee = race.entryFee;
      maxEntries = race.maxEntries;
      minEntries = race.minEntries;
      startTime = race.startTime;
      duration = race.duration;
      entryDeadline = race.entryDeadline;
      createdAt = race.createdAt;
      entries = race.entries;
      status = race.status;
      results = race.results;
      events = newEvents; // Updated commentary
      prizePool = race.prizePool;
      platformTax = race.platformTax;
      platformBonus = race.platformBonus;
      sponsors = race.sponsors;
    };

    ignore Map.put(stable_races, Map.nhash, raceId, updatedRace);

    #ok("Successfully regenerated commentary for race " # Nat.toText(raceId) # " with " # Nat.toText(newEvents.size()) # " events (was " # Nat.toText(race.events.size()) # ")");
  };

  // Admin: Re-simulate a completed race and update results
  // This is used to fix races that were simulated with bugs (e.g., distance calculation)
  // NOTE: This updates race results for visualization accuracy but does NOT redistribute prizes
  public shared ({ caller }) func admin_resimulate_race(raceId : Nat) : async Result.Result<Text, Text> {
    if (caller != owner) {
      return #err("Unauthorized: Only owner can resimulate races");
    };

    let ?race = Map.get(stable_races, Map.nhash, raceId) else {
      return #err("Race not found");
    };

    // Only resimulate completed races
    switch (race.status) {
      case (#Completed) {};
      case (_) {
        return #err("Can only resimulate completed races");
      };
    };

    // Verify race has existing results
    let ?oldResults = race.results else {
      return #err("Race has no results to compare against");
    };

    // Build participants from entries (same order as original simulation)
    let participants = Array.map<RacingSimulator.RaceEntry, RacingSimulator.RacingParticipant>(
      race.entries,
      func(entry) : RacingSimulator.RacingParticipant {
        // Parse tokenIndex from nftId string and get faction for luck system
        let tokenIdx = switch (Nat.fromText(entry.nftId)) {
          case (?idx) { idx };
          case (null) { 0 };
        };
        let (faction, baseAvgRating) : (RacingSimulator.FactionType, ?Nat) = switch (garageManager.getStats(tokenIdx)) {
          case (?botStats) {
            // Calculate base avg rating without terrain/faction bonuses (for MomentumShift)
            let baseStats = garageManager.getBaseStats(tokenIdx);
            let baseAvg = (baseStats.speed + baseStats.powerCore + baseStats.acceleration + baseStats.stability) / 4;
            (botStats.faction, ?baseAvg);
          };
          case (null) { (#Industrial, null) }; // Default faction
        };
        {
          nftId = entry.nftId;
          owner = entry.owner;
          stats = Option.get(entry.stats, { speed = 100; stability = 100; powerCore = 100; acceleration = 100; luck = 30; overcharge = 0; perfectTuneUp = false });
          tokenIndex = tokenIdx;
          faction = faction;
          baseAvgRating = baseAvgRating;
        };
      },
    );

    // Re-run simulation with existing trackSeed
    let ?(newResults, newEvents) = raceSimulator.simulateRaceSegmented(race, participants) else {
      return #err("Failed to resimulate race");
    };

    // Preserve prize amounts from original results (prizes already distributed)
    let updatedResults = Array.tabulate<RacingSimulator.RaceResult>(
      newResults.size(),
      func(i) : RacingSimulator.RaceResult {
        let newResult = newResults[i];
        // Find matching old result by nftId to preserve prizeAmount
        let oldPrize = switch (Array.find<RacingSimulator.RaceResult>(oldResults, func(r) { r.nftId == newResult.nftId })) {
          case (?old) { old.prizeAmount };
          case null { 0 };
        };
        {
          nftId = newResult.nftId;
          owner = newResult.owner;
          position = newResult.position;
          finalTime = newResult.finalTime;
          prizeAmount = oldPrize; // Keep original prize
          stats = newResult.stats;
          partsEarned = newResult.partsEarned;
          partType = newResult.partType;
          dnf = newResult.dnf;
        };
      },
    );

    // Update race with new simulation results
    let updatedRace : RacingSimulator.Race = {
      raceId = race.raceId;
      name = race.name;
      distance = race.distance;
      terrain = race.terrain;
      trackId = race.trackId;
      trackSeed = race.trackSeed;
      raceClass = race.raceClass;
      entryFee = race.entryFee;
      maxEntries = race.maxEntries;
      minEntries = race.minEntries;
      startTime = race.startTime;
      duration = race.duration;
      entryDeadline = race.entryDeadline;
      createdAt = race.createdAt;
      entries = race.entries;
      status = race.status;
      results = ?updatedResults;
      events = newEvents;
      prizePool = race.prizePool;
      platformTax = race.platformTax;
      platformBonus = race.platformBonus;
      sponsors = race.sponsors;
    };

    ignore Map.put(stable_races, Map.nhash, raceId, updatedRace);

    // Compare old vs new winner
    let oldWinner = oldResults[0].nftId;
    let newWinner = updatedResults[0].nftId;
    let winnerChanged = oldWinner != newWinner;

    #ok(
      "Resimulated race " # Nat.toText(raceId) # ": " #
      Nat.toText(updatedResults.size()) # " results updated, " #
      Nat.toText(newEvents.size()) # " events. " #
      (if (winnerChanged) { "⚠️ Winner changed from #" # oldWinner # " to #" # newWinner # " (prizes unchanged)" } else { "Winner unchanged: #" # newWinner })
    );
  };

  // Admin: Re-simulate multiple races in a batch
  public shared ({ caller }) func admin_resimulate_races_batch(raceIds : [Nat]) : async Text {
    if (caller != owner) {
      return "Unauthorized: Only owner can resimulate races";
    };

    var success = 0;
    var failed = 0;
    var winnerChanges = 0;

    for (raceId in raceIds.vals()) {
      let result = await admin_resimulate_race(raceId);
      switch (result) {
        case (#ok(msg)) {
          success += 1;
          if (Text.contains(msg, #text "Winner changed")) {
            winnerChanges += 1;
          };
        };
        case (#err(_)) {
          failed += 1;
        };
      };
    };

    "Batch resimulation complete: " # Nat.toText(success) # " succeeded, " #
    Nat.toText(failed) # " failed, " # Nat.toText(winnerChanges) # " had winner changes";
  };

  // Admin: Compensate winners who were affected by resimulation changes
  // For races where the corrected winner received less than they should have (because they were in wrong position originally)
  public shared ({ caller }) func admin_compensate_resimulated_winners(raceIds : [Nat]) : async Text {
    if (caller != owner) {
      return "Unauthorized: Only owner can compensate winners";
    };

    let ledgerCanisterId = switch (icpLedgerCanisterId) {
      case (?id) { id };
      case (null) {
        return "Error: ICP Ledger not configured";
      };
    };

    let ledger = actor (Principal.toText(ledgerCanisterId)) : actor {
      icrc1_transfer : shared IcpLedger.TransferArg -> async IcpLedger.Result;
    };

    var totalCompensated : Nat = 0;
    var compensationCount : Nat = 0;
    var details : Text = "";

    for (raceId in raceIds.vals()) {
      switch (Map.get(stable_races, Map.nhash, raceId)) {
        case (null) {
          details #= "Race " # Nat.toText(raceId) # ": Not found\n";
        };
        case (?race) {
          switch (race.results) {
            case (null) {
              details #= "Race " # Nat.toText(raceId) # ": No results\n";
            };
            case (?results) {
              // Calculate net prize pool (same as in RacingSimulator)
              var totalSponsorships : Nat = 0;
              for (sponsor in race.sponsors.vals()) {
                totalSponsorships += sponsor.amount;
              };
              let totalPool = race.prizePool + race.platformBonus + totalSponsorships;
              let netPrizePool = Nat.sub(totalPool, race.platformTax);

              // Calculate what each position SHOULD pay
              let position1Prize = (netPrizePool * 45) / 100;
              let position2Prize = (netPrizePool * 28) / 100;
              let position3Prize = (netPrizePool * 18) / 100;
              let position4Prize = (netPrizePool * 9) / 100;

              // Check each result - if they're in a paying position but received less than they should
              for (result in results.vals()) {
                let shouldReceive = if (result.position == 1) { position1Prize } else if (result.position == 2) {
                  position2Prize;
                } else if (result.position == 3) { position3Prize } else if (result.position == 4) {
                  position4Prize;
                } else { 0 };
                let actuallyReceived = result.prizeAmount;

                if (shouldReceive > actuallyReceived) {
                  let compensation = shouldReceive - actuallyReceived;

                  // Send compensation
                  try {
                    let transferResult = await ledger.icrc1_transfer({
                      from_subaccount = null;
                      to = { owner = result.owner; subaccount = null };
                      amount = compensation;
                      fee = ?TRANSFER_FEE;
                      memo = null;
                      created_at_time = null;
                    });

                    switch (transferResult) {
                      case (#Ok(blockIndex)) {
                        totalCompensated += compensation;
                        compensationCount += 1;
                        let icpAmount = Float.toText(Float.fromInt(compensation) / 100_000_000.0);
                        details #= "Race " # Nat.toText(raceId) # ": Sent " # icpAmount # " ICP to #" # result.nftId # " (pos " # Nat.toText(result.position) # ", block " # Nat.toText(blockIndex) # ")\n";
                      };
                      case (#Err(err)) {
                        details #= "Race " # Nat.toText(raceId) # ": FAILED to send to #" # result.nftId # " - " # debug_show (err) # "\n";
                      };
                    };
                  } catch (e) {
                    details #= "Race " # Nat.toText(raceId) # ": ERROR for #" # result.nftId # " - " # Error.message(e) # "\n";
                  };
                };
              };
            };
          };
        };
      };
    };

    let totalIcp = Float.toText(Float.fromInt(totalCompensated) / 100_000_000.0);
    "Compensation complete: " # Nat.toText(compensationCount) # " payments totaling " # totalIcp # " ICP\n\nDetails:\n" # details;
  };

  // Admin: Update prize amounts in race results to match corrected positions
  // After resimulation and compensation, this updates the stored prize amounts to reflect reality
  public shared ({ caller }) func admin_update_prize_amounts(raceIds : [Nat]) : async Text {
    if (caller != owner) {
      return "Unauthorized: Only owner can update prize amounts";
    };

    var details = "";
    var totalUpdated = 0;

    for (raceId in raceIds.vals()) {
      switch (Map.get(stable_races, Map.nhash, raceId)) {
        case (null) {
          details #= "Race " # Nat.toText(raceId) # ": Not found\n";
        };
        case (?race) {
          switch (race.results) {
            case (null) {
              details #= "Race " # Nat.toText(raceId) # ": No results\n";
            };
            case (?results) {
              // Calculate net prize pool (same as original race)
              var totalSponsorships : Nat = 0;
              for (sponsor in race.sponsors.vals()) {
                totalSponsorships += sponsor.amount;
              };
              let totalPool = race.prizePool + race.platformBonus + totalSponsorships;
              let netPrizePool = Nat.sub(totalPool, race.platformTax);

              // Update each result with correct prize amount based on position
              // Uses same prize distribution as RacingSimulator:
              // 1st: 45%, 2nd: 28%, 3rd: 18%, 4th: 9%, 5th+: 0%
              let updatedResults = Array.tabulate<RacingSimulator.RaceResult>(
                results.size(),
                func(i) : RacingSimulator.RaceResult {
                  let result = results[i];
                  let position = result.position;

                  let correctPrize = if (position == 1) {
                    (netPrizePool * 45) / 100;
                  } else if (position == 2) {
                    (netPrizePool * 28) / 100;
                  } else if (position == 3) {
                    (netPrizePool * 18) / 100;
                  } else if (position == 4) {
                    (netPrizePool * 9) / 100;
                  } else {
                    0;
                  };

                  {
                    position = result.position;
                    nftId = result.nftId;
                    owner = result.owner;
                    finalTime = result.finalTime;
                    prizeAmount = correctPrize; // Updated to match correct position
                    stats = result.stats;
                    partsEarned = result.partsEarned;
                    partType = result.partType;
                    dnf = result.dnf;
                  };
                },
              );

              // Update race with corrected prize amounts
              let updatedRace : RacingSimulator.Race = {
                raceId = race.raceId;
                name = race.name;
                distance = race.distance;
                terrain = race.terrain;
                trackId = race.trackId;
                trackSeed = race.trackSeed;
                raceClass = race.raceClass;
                entryFee = race.entryFee;
                maxEntries = race.maxEntries;
                minEntries = race.minEntries;
                startTime = race.startTime;
                duration = race.duration;
                entryDeadline = race.entryDeadline;
                createdAt = race.createdAt;
                entries = race.entries;
                status = race.status;
                results = ?updatedResults;
                events = race.events;
                prizePool = race.prizePool;
                platformTax = race.platformTax;
                platformBonus = race.platformBonus;
                sponsors = race.sponsors;
              };

              ignore Map.put(stable_races, Map.nhash, raceId, updatedRace);

              details #= "Race " # Nat.toText(raceId) # ": Updated " # Nat.toText(updatedResults.size()) # " prize amounts\n";
              totalUpdated += 1;
            };
          };
        };
      };
    };

    "Updated prize amounts for " # Nat.toText(totalUpdated) # " race(s)\n" # details;
  };

  // Admin: Adjust leaderboard points for resimulated races
  // For each race, compares original results (stored prizeAmounts indicate original positions)
  // with new results (current positions) and adjusts points accordingly
  public shared ({ caller }) func admin_adjust_leaderboard_points(raceIds : [Nat]) : async Text {
    if (caller != owner) {
      return "Unauthorized: Only owner can adjust leaderboard points";
    };

    var details = "";
    var totalAdjustments = 0;

    // Points by position (from Leaderboard.mo)
    let pointsByPosition = func(pos : Nat) : Nat {
      switch (pos) {
        case (1) { 25 };
        case (2) { 18 };
        case (3) { 15 };
        case (4) { 12 };
        case (5) { 10 };
        case (6) { 8 };
        case (7 or 8) { 6 };
        case (9 or 10) { 4 };
        case (_) { 2 };
      };
    };

    for (raceId in raceIds.vals()) {
      switch (raceManager.getRace(raceId)) {
        case (null) {
          details #= "Race " # Nat.toText(raceId) # ": Not found\n";
        };
        case (?race) {
          if (race.status != #Completed) {
            details #= "Race " # Nat.toText(raceId) # ": Not completed\n";
          } else {
            switch (race.results) {
              case (null) {
                details #= "Race " # Nat.toText(raceId) # ": No results\n";
              };
              case (?results) {
                details #= "\nRace " # Nat.toText(raceId) # ":\n";

                // For each bot, check if their new position differs from what their prize suggests
                // Original position can be inferred from prizeAmount
                for (i in Iter.range(0, results.size() - 1)) {
                  let result = results[i];
                  let newPosition = i + 1;

                  switch (Nat.fromText(result.nftId)) {
                    case (null) {};
                    case (?tokenIndex) {
                      switch (garageManager.getStats(tokenIndex)) {
                        case (null) {};
                        case (?botStats) {
                          // Calculate what points they should have for new position
                          let newPoints = pointsByPosition(newPosition);

                          // We need to determine their original position
                          // Since we preserved original prizeAmounts, look at prize distribution
                          // The race's prize pool would tell us positions
                          // But simpler: just give points based on new position and note the change

                          // Get race time for leaderboard period calculation
                          let raceTime = race.startTime;
                          let monthId = Leaderboard.getMonthIdFromTime(raceTime);
                          let seasonId = Leaderboard.getSeasonIdFromTime(raceTime);

                          // We need to figure out original position
                          // Sort all results by prizeAmount descending to get original order
                          let sortedByPrize = Array.sort<RacingSimulator.RaceResult>(
                            results,
                            func(a, b) {
                              if (a.prizeAmount > b.prizeAmount) { #less } else if (a.prizeAmount < b.prizeAmount) {
                                #greater;
                              } else { #equal };
                            },
                          );

                          // Find original position by finding where this bot was in prize-sorted order
                          var originalPosition : Nat = 0;
                          for (j in Iter.range(0, sortedByPrize.size() - 1)) {
                            if (sortedByPrize[j].nftId == result.nftId) {
                              originalPosition := j + 1;
                            };
                          };

                          if (originalPosition > 0 and originalPosition != newPosition) {
                            let originalPoints = pointsByPosition(originalPosition);
                            let pointsDelta : Int = newPoints - originalPoints;

                            if (pointsDelta != 0) {
                              // Adjust monthly leaderboard
                              ignore leaderboardManager.adjustPoints(#Monthly(monthId), tokenIndex, pointsDelta);
                              // Adjust season leaderboard
                              ignore leaderboardManager.adjustPoints(#Season(seasonId), tokenIndex, pointsDelta);
                              // Adjust all-time leaderboard
                              ignore leaderboardManager.adjustPoints(#AllTime, tokenIndex, pointsDelta);
                              // Adjust faction leaderboard
                              ignore leaderboardManager.adjustPoints(#Faction(botStats.faction), tokenIndex, pointsDelta);

                              // Also adjust wins/podiums if crossing thresholds
                              let wasWin = originalPosition == 1;
                              let isWin = newPosition == 1;
                              let wasPodium = originalPosition <= 3;
                              let isPodium = newPosition <= 3;

                              let winsDelta : Int = (if (isWin) { 1 } else { 0 }) - (if (wasWin) { 1 } else { 0 });
                              let podiumsDelta : Int = (if (isPodium) { 1 } else { 0 }) - (if (wasPodium) { 1 } else { 0 });

                              if (winsDelta != 0 or podiumsDelta != 0) {
                                ignore leaderboardManager.adjustStats(#Monthly(monthId), tokenIndex, winsDelta, podiumsDelta, 0);
                                ignore leaderboardManager.adjustStats(#Season(seasonId), tokenIndex, winsDelta, podiumsDelta, 0);
                                ignore leaderboardManager.adjustStats(#AllTime, tokenIndex, winsDelta, podiumsDelta, 0);
                                ignore leaderboardManager.adjustStats(#Faction(botStats.faction), tokenIndex, winsDelta, podiumsDelta, 0);
                              };

                              let sign = if (pointsDelta > 0) { "+" } else {
                                "";
                              };
                              details #= "  #" # Nat.toText(tokenIndex) # ": pos " # Nat.toText(originalPosition) # " → " # Nat.toText(newPosition) # " (" # sign # Int.toText(pointsDelta) # " pts)";
                              if (winsDelta != 0) {
                                details #= " [wins " # (if (winsDelta > 0) { "+1" } else { "-1" }) # "]";
                              };
                              if (podiumsDelta != 0) {
                                details #= " [podiums " # (if (podiumsDelta > 0) { "+1" } else { "-1" }) # "]";
                              };
                              details #= "\n";
                              totalAdjustments += 1;
                            };
                          };
                        };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    "Leaderboard points adjusted: " # Nat.toText(totalAdjustments) # " changes\n" # details;
  };

  // Admin: Rebuild race history for specific bots from corrected race data
  // This fixes bot history after races have been resimulated
  public shared ({ caller }) func admin_rebuild_bot_histories(tokenIndices : [Nat]) : async Text {
    if (caller != owner) {
      return "Unauthorized: Only owner can rebuild bot histories";
    };

    var details = "";
    var totalFixed = 0;

    for (tokenIndex in tokenIndices.vals()) {
      // Get current bot stats to access career data
      switch (garageManager.getStats(tokenIndex)) {
        case (null) {
          details #= "Bot #" # Nat.toText(tokenIndex) # ": Not initialized\n";
        };
        case (?botStats) {
          // Rebuild career stats from all race results
          var newRacesEntered = 0;
          var newWins = 0;
          var newPodiums = 0;
          var newTotalEarnings : Nat = 0;

          let nftId = Nat.toText(tokenIndex);
          let allRaces = raceManager.getAllRaces();

          // Scan all completed races for this bot
          for (race in allRaces.vals()) {
            switch (race.status, race.results) {
              case (#Completed, ?results) {
                // Check if this bot participated
                var botResult : ?RacingSimulator.RaceResult = null;
                for (result in results.vals()) {
                  if (result.nftId == nftId) {
                    botResult := ?result;
                  };
                };

                switch (botResult) {
                  case (?result) {
                    newRacesEntered += 1;
                    if (result.position == 1) { newWins += 1 };
                    if (result.position <= 3) { newPodiums += 1 };
                    newTotalEarnings += result.prizeAmount;
                  };
                  case (null) { /* Bot didn't participate */ };
                };
              };
              case (_, _) { /* Not completed or no results */ };
            };
          };

          // Update bot stats with corrected career data
          let updatedStats : PokedBotsGarage.PokedBotRacingStats = {
            tokenIndex = tokenIndex;
            ownerPrincipal = botStats.ownerPrincipal;
            faction = botStats.faction;
            name = botStats.name;
            luckBase = botStats.luckBase;
            speedBonus = botStats.speedBonus;
            powerCoreBonus = botStats.powerCoreBonus;
            accelerationBonus = botStats.accelerationBonus;
            stabilityBonus = botStats.stabilityBonus;
            luckBonus = botStats.luckBonus;
            speedUpgrades = botStats.speedUpgrades;
            powerCoreUpgrades = botStats.powerCoreUpgrades;
            accelerationUpgrades = botStats.accelerationUpgrades;
            stabilityUpgrades = botStats.stabilityUpgrades;
            luckUpgrades = botStats.luckUpgrades;
            respecCount = botStats.respecCount;
            battery = botStats.battery;
            condition = botStats.condition;
            experience = botStats.experience;
            overcharge = botStats.overcharge;
            perfectTuneUp = botStats.perfectTuneUp;
            preferredDistance = botStats.preferredDistance;
            preferredTerrain = botStats.preferredTerrain;
            racesEntered = newRacesEntered;
            wins = newWins;
            places = newPodiums;
            shows = botStats.shows;
            totalScrapEarned = newTotalEarnings;
            factionReputation = botStats.factionReputation;
            eloRating = botStats.eloRating;

            // Luck tracking stats
            totalLuckProcs = botStats.totalLuckProcs;
            majorLuckProcs = botStats.majorLuckProcs;
            legendaryLuckProcs = botStats.legendaryLuckProcs;
            totalBadLuckIncidents = botStats.totalBadLuckIncidents;
            cosmicAlignmentDays = botStats.cosmicAlignmentDays;

            activatedAt = botStats.activatedAt;
            lastDecayed = botStats.lastDecayed;
            lastRecharged = botStats.lastRecharged;
            lastRepaired = botStats.lastRepaired;
            lastDiagnostics = botStats.lastDiagnostics;
            lastRaced = botStats.lastRaced;
            upgradeEndsAt = botStats.upgradeEndsAt;
            listedForSale = botStats.listedForSale;
            scavengingMissions = botStats.scavengingMissions;
            totalPartsScavenged = botStats.totalPartsScavenged;
            scavengingReputation = botStats.scavengingReputation;
            bestHaul = botStats.bestHaul;
            activeMission = botStats.activeMission;
            worldBuff = botStats.worldBuff;
            lastMissionRewards = botStats.lastMissionRewards;
          };

          garageManager.updateStats(tokenIndex, updatedStats);

          details #= "Bot #" # Nat.toText(tokenIndex) # ": " #
          Nat.toText(newRacesEntered) # " races, " #
          Nat.toText(newWins) # " wins, " #
          Nat.toText(newPodiums) # " podiums, " #
          Nat.toText(newTotalEarnings) # " e8s earned\n";
          totalFixed += 1;
        };
      };
    };

    "Rebuilt race histories for " # Nat.toText(totalFixed) # " bot(s)\n\n" # details;
  };

  // Get race history for a specific bot
  public query func get_bot_race_history(tokenIndex : Nat, limit : Nat, afterRaceId : ?Nat) : async {
    races : [{
      eventId : Nat;
      eventName : Text;
      scheduledTime : Int;
      raceId : Nat;
      raceName : Text;
      position : Nat;
      totalRacers : Nat;
      finalTime : ?Float;
      prizeAmount : Nat;
      leaderboardPoints : Nat;
    }];
    hasMore : Bool;
    nextRaceId : ?Nat;
  } {
    let allRaces = raceManager.getAllRaces();
    var history : [{
      eventId : Nat;
      eventName : Text;
      scheduledTime : Int;
      raceId : Nat;
      raceName : Text;
      position : Nat;
      totalRacers : Nat;
      finalTime : ?Float;
      prizeAmount : Nat;
      leaderboardPoints : Nat;
    }] = [];

    let nftId = Nat.toText(tokenIndex);

    // Sort races by scheduled time (newest first)
    let racesArray = Array.sort<RacingSimulator.Race>(
      allRaces,
      func(a, b) {
        if (a.startTime > b.startTime) { #less } else if (a.startTime < b.startTime) {
          #greater;
        } else { #equal };
      },
    );

    // Skip races until we find the cursor (afterRaceId)
    var skipMode = switch (afterRaceId) {
      case (?_) { true };
      case null { false };
    };

    var lastRaceId : ?Nat = null;

    label raceLoop for (race in racesArray.vals()) {
      // If we're in skip mode, skip until we pass the cursor
      if (skipMode) {
        switch (afterRaceId) {
          case (?targetId) {
            if (race.raceId == targetId) {
              skipMode := false;
            };
          };
          case null {};
        };
        continue raceLoop;
      };

      if (history.size() >= limit) {
        break raceLoop;
      };

      // Only include completed races with results
      switch (race.status) {
        case (#Completed) {
          switch (race.results) {
            case (?results) {
              // Find this bot in the results
              var position : ?Nat = null;
              var finalTime : ?Float = null;
              var prizeAmount : Nat = 0;

              label resultLoop for (i in Iter.range(0, results.size() - 1)) {
                if (results[i].nftId == nftId) {
                  position := ?(i + 1);
                  finalTime := ?results[i].finalTime;
                  prizeAmount := results[i].prizeAmount;
                  break resultLoop;
                };
              };

              // If bot participated, add to history
              switch (position) {
                case (?pos) {
                  // Get event details for this race
                  let eventOpt = eventCalendar.getEventByRaceId(race.raceId);
                  switch (eventOpt) {
                    case (?event) {
                      // Calculate leaderboard points based on position
                      let basePoints = switch (pos) {
                        case (1) { 25 };
                        case (2) { 18 };
                        case (3) { 15 };
                        case (4) { 12 };
                        case (5) { 10 };
                        case (6) { 8 };
                        case (7 or 8) { 6 };
                        case (9 or 10) { 4 };
                        case (_) { 2 }; // Participation points
                      };
                      let leaderboardPoints = basePoints;

                      let newEntry = {
                        eventId = event.eventId;
                        eventName = event.metadata.name;
                        scheduledTime = event.scheduledTime;
                        raceId = race.raceId;
                        raceName = race.name;
                        position = pos;
                        totalRacers = results.size();
                        finalTime = finalTime;
                        prizeAmount = prizeAmount;
                        leaderboardPoints = leaderboardPoints;
                      };
                      history := Array.append(history, [newEntry]);
                      lastRaceId := ?race.raceId;
                    };
                    case null {};
                  };
                };
                case null {};
              };
            };
            case null {};
          };
        };
        case _ {};
      };
    };

    // Check if there are more races by looking ahead one more
    var hasMore = false;
    if (history.size() == limit) {
      var foundLast = false;
      label checkMoreLoop for (race in racesArray.vals()) {
        // Skip until we find the last race we included
        if (not foundLast) {
          switch (lastRaceId) {
            case (?lid) {
              if (race.raceId == lid) {
                foundLast := true;
              };
            };
            case null {};
          };
          continue checkMoreLoop;
        };

        // Now we're past the last race, check if there's another race with this bot
        switch (race.status) {
          case (#Completed) {
            switch (race.results) {
              case (?results) {
                for (result in results.vals()) {
                  if (result.nftId == nftId) {
                    hasMore := true;
                    break checkMoreLoop;
                  };
                };
              };
              case null {};
            };
          };
          case _ {};
        };
      };
    };

    {
      races = history;
      hasMore = hasMore;
      nextRaceId = if (hasMore) { lastRaceId } else { null };
    };
  };

  // Query races with advanced filtering and pagination
  public query func query_races(
    filters : {
      // Status filters
      status : ?RacingSimulator.RaceStatus; // #Upcoming, #InProgress, #Completed, #Cancelled

      // Class and terrain filters
      raceClass : ?RacingSimulator.RaceClass;
      terrain : ?RacingSimulator.Terrain;

      // Entry filters
      minEntries : ?Nat; // Minimum current entries
      maxEntries : ?Nat; // Maximum current entries
      hasMinimumEntries : ?Bool; // Has minimum entries to run (won't be cancelled)

      // Prize pool filters
      minPrizePool : ?Nat; // Minimum total prize pool (including bonuses and sponsors)
      maxPrizePool : ?Nat; // Maximum total prize pool

      // Participant filters
      participantPrincipal : ?Principal; // Races where this principal has bots entered
      participantNftId : ?Text; // Races where this specific NFT is entered

      // Eligibility filters (requires caller principal)
      eligibleForCaller : ?{
        caller : Principal;
        eligibleOnly : Bool; // true = only races caller can enter, false = only races caller cannot enter
      };

      // Time filters
      startTimeFrom : ?Int; // Races starting after this timestamp
      startTimeTo : ?Int; // Races starting before this timestamp

      // Pagination
      limit : Nat; // Max results (1-100)
      afterRaceId : ?Nat; // Continue after this race ID
    }
  ) : async {
    races : [RacingSimulator.Race];
    hasMore : Bool;
    nextRaceId : ?Nat;
    totalMatching : Nat;
  } {
    let allRaces = raceManager.getAllRaces();
    let racesArray = Iter.toArray(allRaces.vals());

    // Determine sort order based on status filter:
    // - Upcoming/InProgress: ascending (soonest first)
    // - Completed/Cancelled: descending (newest first)
    // - No filter: descending (default to showing recent activity)
    let shouldSortAscending = switch (filters.status) {
      case (?#Upcoming) { true };
      case (?#InProgress) { true };
      case (_) { false }; // Completed, Cancelled, or no filter
    };

    let sortedRaces = Array.sort<RacingSimulator.Race>(
      racesArray,
      func(a, b) {
        if (shouldSortAscending) {
          // Ascending: soonest first
          if (a.startTime < b.startTime) { #less } else if (a.startTime > b.startTime) {
            #greater;
          } else { #equal };
        } else {
          // Descending: newest first
          if (a.startTime > b.startTime) { #less } else if (a.startTime < b.startTime) {
            #greater;
          } else { #equal };
        };
      },
    );

    // Validate limit
    let actualLimit = if (filters.limit < 1 or filters.limit > 100) { 20 } else {
      filters.limit;
    };

    var filtered : [RacingSimulator.Race] = [];
    var totalMatching : Nat = 0;
    var skipUntilRaceId : ?Nat = filters.afterRaceId;
    var foundAfterRace = switch (filters.afterRaceId) {
      case (null) { true }; // No pagination, start from beginning
      case (_) { false }; // Need to find the pagination point
    };

    label raceLoop for (race in sortedRaces.vals()) {
      // Handle pagination
      if (not foundAfterRace) {
        if (?race.raceId == filters.afterRaceId) {
          foundAfterRace := true;
        };
        continue raceLoop;
      };

      // Apply filters
      var matches = true;

      // Status filter
      switch (filters.status) {
        case (?status) {
          if (race.status != status) { matches := false };
        };
        case null {};
      };

      if (not matches) { continue raceLoop };

      // Race class filter
      switch (filters.raceClass) {
        case (?raceClass) {
          if (race.raceClass != raceClass) { matches := false };
        };
        case null {};
      };

      if (not matches) { continue raceLoop };

      // Terrain filter
      switch (filters.terrain) {
        case (?terrain) {
          if (race.terrain != terrain) { matches := false };
        };
        case null {};
      };

      if (not matches) { continue raceLoop };

      // Entry count filters
      let currentEntries = race.entries.size();

      switch (filters.minEntries) {
        case (?min) {
          if (currentEntries < min) { matches := false };
        };
        case null {};
      };

      if (not matches) { continue raceLoop };

      switch (filters.maxEntries) {
        case (?max) {
          if (currentEntries > max) { matches := false };
        };
        case null {};
      };

      if (not matches) { continue raceLoop };

      // Has minimum entries filter (won't be cancelled)
      switch (filters.hasMinimumEntries) {
        case (?shouldHaveMin) {
          let hasMin = currentEntries >= race.minEntries;
          if (hasMin != shouldHaveMin) { matches := false };
        };
        case null {};
      };

      if (not matches) { continue raceLoop };

      // Prize pool filters
      let totalPrizePool = race.prizePool + race.platformBonus;

      switch (filters.minPrizePool) {
        case (?min) {
          if (totalPrizePool < min) { matches := false };
        };
        case null {};
      };

      if (not matches) { continue raceLoop };

      switch (filters.maxPrizePool) {
        case (?max) {
          if (totalPrizePool > max) { matches := false };
        };
        case null {};
      };

      if (not matches) { continue raceLoop };

      // Participant filters
      switch (filters.participantPrincipal) {
        case (?principal) {
          var found = false;
          for (entry in race.entries.vals()) {
            if (entry.owner == principal) {
              found := true;
            };
          };
          if (not found) { matches := false };
        };
        case null {};
      };

      if (not matches) { continue raceLoop };

      switch (filters.participantNftId) {
        case (?nftId) {
          var found = false;
          for (entry in race.entries.vals()) {
            if (entry.nftId == nftId) {
              found := true;
            };
          };
          if (not found) { matches := false };
        };
        case null {};
      };

      if (not matches) { continue raceLoop };

      // Eligibility filter (check if caller can participate)
      switch (filters.eligibleForCaller) {
        case (?eligibilityCheck) {
          let caller = eligibilityCheck.caller;
          let eligibleOnly = eligibilityCheck.eligibleOnly;

          // Check if race is open for entries
          let isOpen = race.status == #Upcoming and currentEntries < race.maxEntries and Time.now() < race.entryDeadline;

          if (not isOpen and eligibleOnly) {
            matches := false;
          } else if (isOpen) {
            // Check if caller already has bots in this race
            var alreadyEntered = false;
            for (entry in race.entries.vals()) {
              if (entry.owner == caller) {
                alreadyEntered := true;
              };
            };

            // Get caller's bots to check if they have eligible bots
            let callerBots = garageManager.getBotsForOwner(caller);
            var hasEligibleBot = false;

            for (bot in callerBots.vals()) {
              // Check if bot's rating (max stats) matches race class
              let rating = calculateMaxRating(bot); // Use max stats, not current degraded stats
              let isEligible = RaceClassUtils.isEligibleForClass(rating, race.raceClass);

              // Check if this bot is not already entered
              var botAlreadyEntered = false;
              let nftId = Nat.toText(bot.tokenIndex);
              for (entry in race.entries.vals()) {
                if (entry.nftId == nftId) {
                  botAlreadyEntered := true;
                };
              };

              if (isEligible and not botAlreadyEntered) {
                hasEligibleBot := true;
              };
            };

            let canParticipate = hasEligibleBot;

            // Apply the eligibility filter
            if (eligibleOnly and not canParticipate) {
              matches := false;
            } else if (not eligibleOnly and canParticipate) {
              matches := false;
            };
          };
        };
        case null {};
      };

      if (not matches) { continue raceLoop };

      // Time filters
      switch (filters.startTimeFrom) {
        case (?fromTime) {
          if (race.startTime < fromTime) { matches := false };
        };
        case null {};
      };

      if (not matches) { continue raceLoop };

      switch (filters.startTimeTo) {
        case (?toTime) {
          if (race.startTime > toTime) { matches := false };
        };
        case null {};
      };

      if (not matches) { continue raceLoop };

      // If we reach here, race matches all filters
      totalMatching += 1;

      // Add to results if we haven't reached limit
      if (filtered.size() < actualLimit) {
        filtered := Array.append(filtered, [race]);
      };
    };

    // Check if there are more results
    let hasMore = totalMatching > filtered.size();
    let nextRaceId = if (hasMore and filtered.size() > 0) {
      ?filtered[filtered.size() - 1].raceId;
    } else {
      null;
    };

    {
      races = filtered;
      hasMore = hasMore;
      nextRaceId = nextRaceId;
      totalMatching = totalMatching;
    };
  };

  // ===== DEBUG/ADMIN FUNCTIONS =====

  // Update minimum racer requirement for a specific race
  public shared ({ caller }) func admin_update_race_min_entries(raceId : Nat, minEntries : Nat) : async Text {
    if (caller != owner) {
      Debug.trap("Only owner can update race requirements");
    };

    switch (raceManager.getRace(raceId)) {
      case (?race) {
        switch (race.status) {
          case (#Upcoming) {
            // Update the race directly in the map
            let updatedRace = {
              race with
              minEntries = minEntries;
            };
            Map.set(raceManager.getRacesMap(), Map.nhash, raceId, updatedRace);
            "Successfully updated race " # Nat.toText(raceId) # " minEntries to " # Nat.toText(minEntries);
          };
          case (_) {
            "Error: Can only update minEntries for Upcoming races";
          };
        };
      };
      case (null) {
        "Error: Race not found";
      };
    };
  };

  /// Admin function to manually create betting pool for an existing race
  /// Useful for testing and recovery when races are created in advance
  public shared ({ caller }) func admin_create_betting_pool(raceId : Nat) : async Result.Result<Text, Text> {
    if (caller != owner) {
      return #err("Only owner can manually create betting pools");
    };

    switch (raceManager.getRace(raceId)) {
      case (?race) {
        // Check if registration is closed (entry deadline has passed)
        let now = Time.now();
        if (race.entryDeadline > now) {
          return #err("Cannot create betting pool - registration is still open (closes at " # Int.toText(race.entryDeadline / 1_000_000) # ")");
        };

        // Check if race has entries
        if (race.entries.size() == 0) {
          return #err("Race has no entries yet");
        };

        // Check if pool already exists
        switch (bettingManager.getPool(raceId)) {
          case (?_) {
            return #err("Betting pool already exists for this race");
          };
          case (null) {
            // Create the pool
            let result = bettingManager.createPool(race);
            switch (result) {
              case (#ok(_)) {
                #ok("Successfully created betting pool for race " # Nat.toText(raceId) # " with " # Nat.toText(race.entries.size()) # " entrants");
              };
              case (#err(msg)) {
                #err("Failed to create pool: " # msg);
              };
            };
          };
        };
      };
      case (null) {
        #err("Race not found");
      };
    };
  };

  // Manually cancel specific races by ID (with refunds)
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

            // Refund all entries
            for (entry in race.entries.vals()) {
              let refundActionId = tt().setActionASync<system>(
                Int.abs(Time.now() + 1_000_000_000), // 1 second delay
                {
                  actionType = "prize_distribution";
                  params = to_candid ({
                    raceId = raceId;
                    owner = entry.owner;
                    amount = entry.entryFee;
                  });
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
                  params = to_candid ({
                    raceId = raceId;
                    owner = sponsor.sponsor;
                    amount = sponsor.amount;
                  });
                },
                PRIZE_DISTRIBUTION_TIMEOUT,
              );
              Debug.print("Scheduled sponsor refund " # debug_show (sponsorRefundActionId) # " of " # debug_show (sponsor.amount) # " to " # Principal.toText(sponsor.sponsor));
            };

            cancelledRaces := Array.append(cancelledRaces, [(raceId, race.name)]);
          };
        };
        case (null) { /* Race doesn't exist */ };
      };
    };

    cancelledRaces;
  };

  // Manually force-finish a stuck race
  public shared ({ caller }) func force_finish_race(raceId : Nat) : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can force-finish races";
    };

    // Trigger the race finish handler directly and await completion
    let dummyActionId : TT.ActionId = { id = 0; time = Int.abs(Time.now()) };
    let result = await* handleRaceFinish<system>(
      dummyActionId,
      {
        actionType = "race_finish";
        params = to_candid (raceId);
        retries = 0;
        aSync = null;
      },
    );

    // Check if the handler succeeded
    switch (result) {
      case (#awaited(_)) {
        "Force-finished race " # Nat.toText(raceId) # " successfully";
      };
      case (#trappable(_)) {
        "Force-finish triggered for race " # Nat.toText(raceId) # " but encountered an error";
      };
      case (_) {
        "Force-finish triggered for race " # Nat.toText(raceId) # " with unknown result";
      };
    };
  };

  /// Admin method to remove a bot from a race (for fixing bugs/errors)
  public shared ({ caller }) func admin_remove_race_entry(raceId : Nat, tokenIndex : Nat) : async Result.Result<Text, Text> {
    if (caller != owner) {
      return #err("Unauthorized: only owner can remove race entries");
    };

    let race = switch (Map.get(stable_races, Map.nhash, raceId)) {
      case (?r) { r };
      case (null) { return #err("Race not found") };
    };

    let nftId = Nat.toText(tokenIndex);

    // Filter out the entry to remove
    let newEntries = Array.filter<RacingSimulator.RaceEntry>(
      race.entries,
      func(e : RacingSimulator.RaceEntry) : Bool { e.nftId != nftId },
    );

    if (newEntries.size() == race.entries.size()) {
      return #err("Bot #" # Nat.toText(tokenIndex) # " not found in race #" # Nat.toText(raceId));
    };

    // Refund entry fee to bot owner
    let removedEntry = Array.find<RacingSimulator.RaceEntry>(
      race.entries,
      func(e : RacingSimulator.RaceEntry) : Bool { e.nftId == nftId },
    );

    switch (removedEntry) {
      case (?entry) {
        // Calculate new prize pool (subtract entry fee)
        let newPrizePool = if (race.prizePool >= race.entryFee) {
          race.prizePool - race.entryFee;
        } else {
          0;
        };
        let newTax = (newPrizePool * 5) / 100;

        // Update race with removed entry
        let updatedRace = {
          race with
          entries = newEntries;
          prizePool = newPrizePool;
          platformTax = newTax;
        };

        ignore Map.put(stable_races, Map.nhash, raceId, updatedRace);

        // Issue refund
        let ledgerId = switch (icpLedgerCanisterId) {
          case (?id) { id };
          case (null) {
            return #ok("Bot removed but refund failed: ICP Ledger not configured. Manual refund required for " # Principal.toText(entry.owner));
          };
        };

        let ledger = actor (Principal.toText(ledgerId)) : actor {
          icrc1_transfer : shared IcpLedger.TransferArg -> async IcpLedger.Result;
        };

        try {
          let transferResult = await ledger.icrc1_transfer({
            from_subaccount = null;
            to = { owner = entry.owner; subaccount = null };
            amount = entry.entryFee;
            fee = ?TRANSFER_FEE;
            memo = null;
            created_at_time = null;
          });

          switch (transferResult) {
            case (#Ok(_blockIndex)) {
              #ok("Bot #" # Nat.toText(tokenIndex) # " removed from race #" # Nat.toText(raceId) # " and refunded " # Nat.toText(entry.entryFee) # " e8s");
            };
            case (#Err(err)) {
              #ok("Bot removed but refund failed: " # debug_show (err) # ". Manual refund required for " # Principal.toText(entry.owner));
            };
          };
        } catch (e) {
          #ok("Bot removed but refund failed: " # Error.message(e) # ". Manual refund required for " # Principal.toText(entry.owner));
        };
      };
      case (null) {
        #err("Entry not found");
      };
    };
  };

  // Delete events and their associated races (cleanup duplicates)
  // Internal function to delete events and races
  private func delete_events_and_races_internal(eventIds : [Nat]) : async Text {
    var deletedEvents : Nat = 0;
    var deletedRaces : Nat = 0;
    var cancelledTimers : Nat = 0;

    for (eventId in eventIds.vals()) {
      // Get event to find associated races
      switch (eventCalendar.getEvent(eventId)) {
        case (?event) {
          // Cancel all races associated with this event
          for (raceId in event.raceIds.vals()) {
            switch (raceManager.getRace(raceId)) {
              case (?race) {
                // Cancel the race if it's not completed
                if (race.status == #Upcoming or race.status == #InProgress) {
                  ignore raceManager.updateRaceStatus(raceId, #Cancelled);
                  deletedRaces += 1;

                  // Cancel any pending timers for this race
                  let raceStartActions = tt().getActionsByFilter(#ByType("race_start"));
                  for ((actionId, action) in raceStartActions.vals()) {
                    // Check if this action is for this race
                    let raceIdOpt : ?Nat = from_candid (action.params);
                    switch (raceIdOpt) {
                      case (?rid) {
                        if (rid == raceId) {
                          ignore tt().cancelAction<system>(actionId.id);
                          cancelledTimers += 1;
                        };
                      };
                      case (null) {};
                    };
                  };

                  let raceFinishActions = tt().getActionsByFilter(#ByType("race_finish"));
                  for ((actionId, action) in raceFinishActions.vals()) {
                    let raceIdOpt : ?Nat = from_candid (action.params);
                    switch (raceIdOpt) {
                      case (?rid) {
                        if (rid == raceId) {
                          ignore tt().cancelAction<system>(actionId.id);
                          cancelledTimers += 1;
                        };
                      };
                      case (null) {};
                    };
                  };
                };

                // Delete the race from storage to prevent orphans
                ignore raceManager.deleteRace(raceId);
              };
              case (null) {};
            };
          };

          // Delete the event
          if (eventCalendar.deleteEvent(eventId)) {
            deletedEvents += 1;
          };
        };
        case (null) {};
      };
    };

    "Deleted " # Nat.toText(deletedEvents) # " events, deleted " # Nat.toText(deletedRaces) # " races, and cancelled " # Nat.toText(cancelledTimers) # " timers";
  };

  // Public wrapper for delete_events_and_races
  public shared ({ caller }) func delete_events_and_races(eventIds : [Nat]) : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can delete events";
    };
    return await delete_events_and_races_internal(eventIds);
  };

  // Admin function to clear races from events WITHOUT deleting the events
  // Use this to fix incorrectly created races while keeping events for registration
  public shared ({ caller }) func clear_event_races(eventIds : [Nat]) : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can clear event races";
    };

    var clearedEvents : Nat = 0;
    var deletedRaces : Nat = 0;
    var cancelledTimers : Nat = 0;

    for (eventId in eventIds.vals()) {
      switch (eventCalendar.getEvent(eventId)) {
        case (?event) {
          // Cancel/delete all races associated with this event
          for (raceId in event.raceIds.vals()) {
            switch (raceManager.getRace(raceId)) {
              case (?race) {
                // Cancel the race if it's not completed
                if (race.status == #Upcoming or race.status == #InProgress) {
                  ignore raceManager.updateRaceStatus(raceId, #Cancelled);
                  deletedRaces += 1;

                  // Cancel any pending timers for this race
                  let raceStartActions = tt().getActionsByFilter(#ByType("race_start"));
                  for ((actionId, action) in raceStartActions.vals()) {
                    let raceIdOpt : ?Nat = from_candid (action.params);
                    switch (raceIdOpt) {
                      case (?rid) {
                        if (rid == raceId) {
                          ignore tt().cancelAction<system>(actionId.id);
                          cancelledTimers += 1;
                        };
                      };
                      case (null) {};
                    };
                  };

                  let raceFinishActions = tt().getActionsByFilter(#ByType("race_finish"));
                  for ((actionId, action) in raceFinishActions.vals()) {
                    let raceIdOpt : ?Nat = from_candid (action.params);
                    switch (raceIdOpt) {
                      case (?rid) {
                        if (rid == raceId) {
                          ignore tt().cancelAction<system>(actionId.id);
                          cancelledTimers += 1;
                        };
                      };
                      case (null) {};
                    };
                  };
                };

                // Delete the race from storage
                ignore raceManager.deleteRace(raceId);
              };
              case (null) {};
            };
          };

          // Clear the raceIds from the event but DON'T delete the event
          ignore eventCalendar.clearEventRaces(eventId);
          clearedEvents += 1;
        };
        case (null) {};
      };
    };

    "Cleared races from " # Nat.toText(clearedEvents) # " events, deleted " # Nat.toText(deletedRaces) # " races, and cancelled " # Nat.toText(cancelledTimers) # " timers";
  };

  // Admin function to create a completed event and attach existing orphaned races to it
  // Used to fix race orphaning issues where events were overwritten
  public shared ({ caller }) func admin_create_event_for_orphaned_races(
    scheduledTimeNanos : Int,
    raceIds : [Nat],
  ) : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can create events";
    };

    let now = Time.now();

    // Create a completed Daily Sprint event
    let metadata : RaceCalendar.EventMetadata = {
      name = "Daily Sprint Challenge (Recovered)";
      description = "Recovered event for orphaned races.";
      entryFee = 20_000_000;
      maxEntries = 100;
      minEntries = 2;
      prizePoolBonus = 50_000_000;
      pointsMultiplier = 1.0;
      divisions = [#Scrap, #Junker, #Raider, #Elite];
      scoringMode = #Individual;
      eventBonusPrize = 0;
    };

    let raceMode : RaceCalendar.RaceCreationMode = #Automatic({
      terrains = [#ScrapHeaps, #WastelandSand, #MetalRoads];
      distanceRange = { min = 5; max = 10 };
      racesPerClass = null;
      heatAllocation = #TopBottom;
    });

    let regCloses = scheduledTimeNanos - (15 * 60 * 1_000_000_000);

    let event = eventCalendar.scheduleEvent(
      #DailySprint,
      scheduledTimeNanos,
      scheduledTimeNanos - (24 * 3600 * 1_000_000_000), // Opens 24h before
      regCloses,
      metadata,
      raceMode,
      {
        fullRefund = scheduledTimeNanos - (2 * 3600 * 1_000_000_000);
        halfRefund = scheduledTimeNanos - (1 * 3600 * 1_000_000_000);
        quarterRefund = scheduledTimeNanos - (30 * 60 * 1_000_000_000);
      },
      now,
    );

    // Add the races to this event
    ignore eventCalendar.addRacesToEvent(event.eventId, raceIds);

    // Mark as completed
    ignore eventCalendar.updateEventStatus(event.eventId, #Completed);

    "Created event " # Nat.toText(event.eventId) # " with " # Nat.toText(raceIds.size()) # " races attached and marked as Completed";
  };

  // Admin function to clear a bot's stuck active mission (useful after upgrades that change ScavengingZone type)
  public shared ({ caller }) func admin_clear_active_mission(tokenIndex : Nat) : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can clear missions";
    };

    switch (garageManager.getStats(tokenIndex)) {
      case (null) { "Bot not found" };
      case (?botStats) {
        let updatedStats = {
          botStats with
          activeMission = null;
        };
        garageManager.updateStats(tokenIndex, updatedStats);
        "Cleared active mission for bot #" # Nat.toText(tokenIndex);
      };
    };
  };

  // Admin function to debug/inspect a bot's active mission
  public shared query ({ caller }) func admin_get_active_mission(tokenIndex : Nat) : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can inspect missions";
    };

    switch (garageManager.getStats(tokenIndex)) {
      case (null) { "Bot not found" };
      case (?botStats) {
        switch (botStats.activeMission) {
          case (null) {
            "Bot #" # Nat.toText(tokenIndex) # " has NO active mission";
          };
          case (?mission) {
            let zoneName = switch (mission.zone) {
              case (#ScrapHeaps) { "ScrapHeaps" };
              case (#AbandonedSettlements) { "AbandonedSettlements" };
              case (#DeadMachineFields) { "DeadMachineFields" };
              case (#RepairBay) { "RepairBay" };
              case (#ChargingStation) { "ChargingStation" };
            };
            "Bot #" # Nat.toText(tokenIndex) # " HAS active mission:\n" #
            "  Mission ID: " # Nat.toText(mission.missionId) # "\n" #
            "  Zone: " # zoneName # "\n" #
            "  Start Time: " # Int.toText(mission.startTime) # "\n" #
            "  Last Accumulation: " # Int.toText(mission.lastAccumulation) # "\n" #
            "  Duration: " # (switch (mission.durationMinutes) { case (null) { "Continuous" }; case (?d) { Nat.toText(d) # " minutes" } }) # "\n" #
            "  Pending Parts: " # Nat.toText(mission.pendingParts.speedChips + mission.pendingParts.powerCoreFragments + mission.pendingParts.thrusterKits + mission.pendingParts.gyroModules + mission.pendingParts.universalParts) # "\n" #
            "  Pending Condition Restored: " # Nat.toText(mission.pendingConditionRestored);
          };
        };
      };
    };
  };

  // Admin function to manually trigger race start for races with missing timers
  public shared ({ caller }) func trigger_race_start(raceId : Nat) : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can trigger race start";
    };

    switch (raceManager.getRace(raceId)) {
      case (?race) {
        if (race.status != #Upcoming) {
          return "Race " # Nat.toText(raceId) # " is not in Upcoming status";
        };

        // Manually call the race start handler
        let actionId : TT.ActionId = { id = 0; time = 0 };
        let action : TT.Action = {
          actionType = "race_start";
          params = to_candid (raceId);
          aSync = null;
          retries = 0;
        };

        ignore handleRaceStart<system>(actionId, action);
        "Triggered race start for race " # Nat.toText(raceId);
      };
      case (null) {
        "Race " # Nat.toText(raceId) # " not found";
      };
    };
  };

  // Admin function to manually trigger race creation (for events where registration has closed)
  public shared ({ caller }) func trigger_race_creation() : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can trigger race creation";
    };

    // Manually call the race creation handler
    let actionId : TT.ActionId = { id = 0; time = 0 };
    let action : TT.Action = {
      actionType = "race_create";
      params = to_candid (());
      aSync = null;
      retries = 0;
    };

    ignore handleRaceCreation<system>(actionId, action);
    "Triggered race creation handler. Check events for newly created races.";
  };

  // Admin function to clean up duplicate race_create timers
  public shared ({ caller }) func cleanup_duplicate_race_create_timers() : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can cleanup timers";
    };

    let raceCreateActions = tt().getActionsByFilter(#ByType("race_create"));
    let count = raceCreateActions.size();

    if (count == 0) {
      return "No race_create timers found.";
    };

    // Group actions by timestamp - we want to keep only the first action for each unique timestamp
    // Build a map of timestamp -> list of action IDs
    var timestampMap = HashMap.HashMap<Nat, [TT.ActionId]>(0, Nat.equal, Hash.hash);

    for ((actionId, _action) in raceCreateActions.vals()) {
      let timestamp = actionId.time;
      let existing = switch (timestampMap.get(timestamp)) {
        case (?ids) { ids };
        case (null) { [] };
      };
      timestampMap.put(timestamp, Array.append(existing, [actionId]));
    };

    // For each timestamp, keep the action with the lowest ID (first created), cancel the rest
    var cancelledCount : Nat = 0;
    var uniqueTimestamps : Nat = 0;

    for ((timestamp, actionIds) in timestampMap.entries()) {
      uniqueTimestamps += 1;
      if (actionIds.size() > 1) {
        // Sort by ID and keep the first one
        let sorted = Array.sort(
          actionIds,
          func(a : TT.ActionId, b : TT.ActionId) : Order.Order {
            Nat.compare(a.id, b.id);
          },
        );

        // Cancel all except the first
        for (i in Iter.range(1, sorted.size() - 1)) {
          ignore tt().cancelActionsByIds<system>([sorted[i].id]);
          cancelledCount += 1;
        };
      };
    };

    "Cleaned up " # Nat.toText(cancelledCount) # " duplicate race_create timers across " # Nat.toText(uniqueTimestamps) # " unique timestamps. Kept " # Nat.toText(uniqueTimestamps) # " timers.";
  };

  // Admin function to update heat allocation strategy for events
  public shared ({ caller }) func admin_update_event_heat_allocation(eventType : Text, newStrategy : Text) : async Text {
    if (caller != owner) {
      Debug.trap("Only owner can update event configurations");
    };

    // Parse strategy
    let strategy : RaceCalendar.HeatAllocationStrategy = switch (newStrategy) {
      case ("TopBottom") { #TopBottom };
      case ("SnakeDraft") { #SnakeDraft };
      case ("SkillTiered") { #SkillTiered };
      case ("Random") { #Random };
      case (_) {
        return "Error: Invalid strategy. Must be: TopBottom, SnakeDraft, SkillTiered, or Random";
      };
    };

    // Get all events and filter by type
    let allEvents = eventCalendar.getAllEvents();
    var updatedCount = 0;
    var skippedCount = 0;

    for (event in allEvents.vals()) {
      // Check if event matches the type we want to update
      let shouldUpdate = switch (event.eventType) {
        case (#DailySprint) { eventType == "DailySprint" };
        case (#WeeklyLeague) { eventType == "WeeklyLeague" };
        case (#MonthlyCup) { eventType == "MonthlyCup" };
        case (#SpecialEvent(name)) { eventType == name };
      };

      if (shouldUpdate) {
        // Only update if event hasn't started yet or is in registration
        let now = Time.now();
        if (event.status == #RegistrationOpen or event.status == #Announced or (event.status == #RegistrationClosed and event.raceIds.size() == 0)) {
          switch (eventCalendar.updateEventHeatAllocation(event.eventId, strategy)) {
            case (?_) { updatedCount += 1 };
            case (null) { skippedCount += 1 };
          };
        } else {
          skippedCount += 1;
        };
      };
    };

    "Updated " # Nat.toText(updatedCount) # " " # eventType # " event(s) to use " # newStrategy # " strategy. Skipped " # Nat.toText(skippedCount) # " event(s) (already started or completed).";
  };

  // Admin function to manually trigger race finish for stuck races
  public shared ({ caller }) func trigger_race_finish(raceId : Nat) : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can trigger race finish";
    };

    switch (raceManager.getRace(raceId)) {
      case (?race) {
        if (race.status != #InProgress) {
          return "Race " # Nat.toText(raceId) # " is not in InProgress status (current: " # debug_show (race.status) # ")";
        };

        // Manually call the race finish handler
        let actionId : TT.ActionId = { id = 0; time = 0 };
        let action : TT.Action = {
          actionType = "race_finish";
          params = to_candid (raceId);
          aSync = null;
          retries = 0;
        };

        ignore handleRaceFinish<system>(actionId, action);
        "Triggered race finish for race " # Nat.toText(raceId);
      };
      case (null) {
        "Race " # Nat.toText(raceId) # " not found";
      };
    };
  };

  // Recalculate bot stats from actual race results (fixes stats after orphan cleanup)
  public shared ({ caller }) func recalculate_bot_stats() : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can recalculate stats";
    };

    let allRaces = raceManager.getAllRaces();
    let allEvents = eventCalendar.getAllEvents();
    let now = Time.now();

    // Build a set of valid race IDs (races that belong to events)
    var validRaceIds : [Nat] = [];
    for (event in allEvents.vals()) {
      validRaceIds := Array.append(validRaceIds, event.raceIds);
    };

    // Clear all leaderboards
    leaderboardManager.clearAllLeaderboards();

    // Track stats per bot
    var botStats = Map.new<Nat, { racesEntered : Nat; wins : Nat; places : Nat; shows : Nat; totalEarnings : Nat }>();

    // Go through all completed valid races
    for (race in allRaces.vals()) {
      // Only count races that belong to events
      let isValid = Array.find<Nat>(validRaceIds, func(id) { id == race.raceId });
      if (Option.isSome(isValid) and race.status == #Completed) {
        switch (race.results) {
          case (?results) {
            for (result in results.vals()) {
              switch (Nat.fromText(result.nftId)) {
                case (?tokenIndex) {
                  // Get or create stats for this bot
                  let currentStats = switch (Map.get(botStats, Map.nhash, tokenIndex)) {
                    case (?stats) { stats };
                    case null {
                      {
                        racesEntered = 0;
                        wins = 0;
                        places = 0;
                        shows = 0;
                        totalEarnings = 0;
                      };
                    };
                  };

                  // Update stats
                  let newStats = {
                    racesEntered = currentStats.racesEntered + 1;
                    wins = if (result.position == 1) { currentStats.wins + 1 } else {
                      currentStats.wins;
                    };
                    places = if (result.position == 2) {
                      currentStats.places + 1;
                    } else { currentStats.places };
                    shows = if (result.position == 3) { currentStats.shows + 1 } else {
                      currentStats.shows;
                    };
                    totalEarnings = currentStats.totalEarnings + result.prizeAmount;
                  };

                  ignore Map.put(botStats, Map.nhash, tokenIndex, newStats);
                };
                case null {};
              };
            };
          };
          case null {};
        };
      };
    };

    // Update bot stats in stable storage and rebuild leaderboards
    var updatedCount = 0;

    // If there are no races, zero out all bot stats
    if (Map.size(botStats) == 0) {
      for ((tokenIndex, currentBotStats) in Map.entries(stable_racing_stats)) {
        let updatedBotStats : PokedBotsGarage.PokedBotRacingStats = {
          currentBotStats with
          racesEntered = 0;
          wins = 0;
          places = 0;
          shows = 0;
          totalScrapEarned = 0;
        };
        garageManager.updateStats(tokenIndex, updatedBotStats);
        updatedCount += 1;
      };
    } else {
      // Update bots that have race data
      for ((tokenIndex, calculatedStats) in Map.entries(botStats)) {
        switch (garageManager.getStats(tokenIndex)) {
          case (?currentBotStats) {
            let updatedBotStats : PokedBotsGarage.PokedBotRacingStats = {
              currentBotStats with
              racesEntered = calculatedStats.racesEntered;
              wins = calculatedStats.wins;
              places = calculatedStats.places;
              shows = calculatedStats.shows;
              totalScrapEarned = calculatedStats.totalEarnings;
              // Keep existing ELO and other fields
            };

            garageManager.updateStats(tokenIndex, updatedBotStats);
            updatedCount += 1;
          };
          case null {};
        };
      };
    };

    // Rebuild leaderboards from valid races only
    leaderboardManager.updateCurrentPeriods(now);
    var leaderboardUpdates = 0;

    for (race in allRaces.vals()) {
      let isValid = Array.find<Nat>(validRaceIds, func(id) { id == race.raceId });
      if (Option.isSome(isValid) and race.status == #Completed) {
        switch (race.results) {
          case (?results) {
            for (i in Iter.range(0, results.size() - 1)) {
              let result = results[i];
              switch (Nat.fromText(result.nftId)) {
                case (?tokenIndex) {
                  switch (garageManager.getStats(tokenIndex)) {
                    case (?botStats) {
                      let position = i + 1;

                      // Apply Golden faction synergy bonus to leaderboard prize tracking
                      let synergies = garageManager.calculateFactionSynergies(result.owner);
                      let adjustedPrize = Float.toInt(Float.fromInt(result.prizeAmount) * synergies.yieldMultipliers.racePrizes);

                      leaderboardManager.recordRaceResult(
                        tokenIndex,
                        result.owner,
                        position,
                        results.size(),
                        Int.abs(adjustedPrize),
                        1.0, // pointsMultiplier
                        botStats.faction,
                        race.startTime,
                      );
                      leaderboardUpdates += 1;
                    };
                    case null {};
                  };
                };
                case null {};
              };
            };
          };
          case null {};
        };
      };
    };

    "Recalculated stats for " # Nat.toText(updatedCount) # " bots and recorded " # Nat.toText(leaderboardUpdates) # " leaderboard entries from " # Nat.toText(allRaces.size()) # " races.";
  };

  system func preupgrade() {
    stable_http_assets := HttpAssets.preupgrade(http_assets);

    // Save the trait schema from statsManager to stable storage before upgrade
    stable_trait_schema := statsManager.getSchemaValue();

    // Save betting next bet ID
    stable_betting_next_bet_id := bettingManager.getNextBetId();
  };

  system func postupgrade() {
    HttpAssets.postupgrade(http_assets);

    // Note: Overcharge migration completed - all bots now have overcharge field
    // No longer need to reset overcharge on every upgrade

    // Update leaderboard periods based on current time
    let now = Time.now();
    leaderboardManager.updateCurrentPeriods(now);
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

  initializeRaceCreationTimer<system>();

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

  // ============================================================================
  // WEB API FUNCTIONS - For website gameplay
  // ============================================================================

  /// Get bot details for multiple token indices (query call for performance)
  public query func web_get_bot_details_batch(tokenIndices : [Nat]) : async [{
    tokenIndex : Nat;
    faction : ?Text;
    baseSpeed : Nat;
    basePowerCore : Nat;
    baseAcceleration : Nat;
    baseStability : Nat;
    overallRating : Nat;
    wins : Nat;
    racesEntered : Nat;
    winRate : Float;
    imageUrl : Text;
    isInitialized : Bool;
  }] {
    let extCanisterIdBytes = Principal.toBlob(extCanisterId);

    Array.map<Nat, { tokenIndex : Nat; faction : ?Text; baseSpeed : Nat; basePowerCore : Nat; baseAcceleration : Nat; baseStability : Nat; overallRating : Nat; wins : Nat; racesEntered : Nat; winRate : Float; imageUrl : Text; isInitialized : Bool }>(
      tokenIndices,
      func(tokenIndex) {
        let baseStats = garageManager.getBaseStats(tokenIndex);
        let racingStats = garageManager.getStats(tokenIndex);

        let tokenIndex32 = Nat32.fromNat(tokenIndex);
        let tokenId = ExtIntegration.encodeTokenIdentifier(tokenIndex32, extCanisterId);
        let imageUrl = "https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=" # tokenId # "&type=thumbnail";

        switch (racingStats) {
          case (?stats) {
            let rating = garageManager.calculateOverallRating(stats);
            let winRate = if (stats.racesEntered > 0) {
              Float.fromInt(stats.wins) / Float.fromInt(stats.racesEntered) * 100.0;
            } else { 0.0 };

            let factionText = switch (stats.faction) {
              case (#UltimateMaster) { ?"UltimateMaster" };
              case (#Wild) { ?"Wild" };
              case (#Golden) { ?"Golden" };
              case (#Ultimate) { ?"Ultimate" };
              case (#Blackhole) { ?"Blackhole" };
              case (#Dead) { ?"Dead" };
              case (#Master) { ?"Master" };
              case (#Bee) { ?"Bee" };
              case (#Food) { ?"Food" };
              case (#Box) { ?"Box" };
              case (#Murder) { ?"Murder" };
              case (#Game) { ?"Game" };
              case (#Animal) { ?"Animal" };
              case (#Industrial) { ?"Industrial" };
            };

            {
              tokenIndex;
              faction = factionText;
              baseSpeed = baseStats.speed;
              basePowerCore = baseStats.powerCore;
              baseAcceleration = baseStats.acceleration;
              baseStability = baseStats.stability;
              overallRating = rating;
              wins = stats.wins;
              racesEntered = stats.racesEntered;
              winRate;
              imageUrl;
              isInitialized = true;
            };
          };
          case (null) {
            // Uninitialized bots don't have faction visible yet
            let avgStat = (baseStats.speed + baseStats.powerCore + baseStats.acceleration + baseStats.stability) / 4;
            {
              tokenIndex;
              faction = null; // Faction revealed upon initialization
              baseSpeed = baseStats.speed;
              basePowerCore = baseStats.powerCore;
              baseAcceleration = baseStats.acceleration;
              baseStability = baseStats.stability;
              overallRating = avgStat;
              wins = 0;
              racesEntered = 0;
              winRate = 0.0;
              imageUrl;
              isInitialized = false;
            };
          };
        };
      },
    );
  };

  /// List all PokedBots owned by the caller in their wallet
  public shared ({ caller }) func web_list_my_bots() : async [{
    tokenIndex : Nat;
    name : ?Text;
    stats : ?PokedBotsGarage.PokedBotRacingStats;
    currentStats : ?{
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    };
    maxStats : ?{
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    };
    upgradeCostsV2 : ?{
      speed : { costE8s : Nat; successRate : Float };
      powerCore : { costE8s : Nat; successRate : Float };
      acceleration : { costE8s : Nat; successRate : Float };
      stability : { costE8s : Nat; successRate : Float };
      pityCounter : Nat;
    };
    dedicationBonuses : ?{
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    };
    isInitialized : Bool;
    currentOwner : Text;
    activeUpgrade : ?PokedBotsGarage.UpgradeSession;
    upcomingRaces : [{
      raceId : Nat;
      name : Text;
      startTime : Int;
      entryDeadline : Int;
      entryFee : Nat;
      terrain : RacingSimulator.Terrain;
    }];
    eligibleRaces : [{
      raceId : Nat;
      name : Text;
      startTime : Int;
      entryDeadline : Int;
      entryFee : Nat;
      terrain : RacingSimulator.Terrain;
    }];
  }] {
    let walletAccountId = ExtIntegration.principalToAccountIdentifier(caller, null);
    let tokensResult = await ExtIntegration.getOwnedTokens(extCanister, walletAccountId);

    // Accumulate scavenging rewards for all user's bots before returning data
    // This ensures pendingParts are up-to-date with deterministic calculations
    switch (tokensResult) {
      case (#ok(tokens)) {
        for (tokenIndex32 in tokens.vals()) {
          let tokenIndex = Nat32.toNat(tokenIndex32);
          let _ = garageManager.accumulateScavengingRewards(tokenIndex, Time.now());
        };
      };
      case (#err(_)) {};
    };

    switch (tokensResult) {
      case (#err(_)) { [] };
      case (#ok(tokens)) {
        // Get all upcoming races once
        let allRaces = raceManager.getAllRaces();
        let upcomingRaces = Array.filter<RacingSimulator.Race>(
          allRaces,
          func(race) {
            race.status == #Upcoming;
          },
        );

        let results = Array.mapFilter<Nat32, { tokenIndex : Nat; name : ?Text; stats : ?PokedBotsGarage.PokedBotRacingStats; currentStats : ?{ speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat }; maxStats : ?{ speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat }; upgradeCostsV2 : ?{ speed : { costE8s : Nat; successRate : Float }; powerCore : { costE8s : Nat; successRate : Float }; acceleration : { costE8s : Nat; successRate : Float }; stability : { costE8s : Nat; successRate : Float }; pityCounter : Nat }; dedicationBonuses : ?{ speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat }; isInitialized : Bool; currentOwner : Text; activeUpgrade : ?PokedBotsGarage.UpgradeSession; upcomingRaces : [{ raceId : Nat; name : Text; startTime : Int; entryDeadline : Int; entryFee : Nat; terrain : RacingSimulator.Terrain }]; eligibleRaces : [{ raceId : Nat; name : Text; startTime : Int; entryDeadline : Int; entryFee : Nat; terrain : RacingSimulator.Terrain }] }>(
          tokens,
          func(tokenIndex32) {
            let tokenIndex = Nat32.toNat(tokenIndex32);
            let stats = garageManager.getStats(tokenIndex);
            let isInit = Option.isSome(stats);
            let activeUpgrade = Map.get(stable_active_upgrades, Map.nhash, tokenIndex);

            // Calculate current and max stats
            let (currentStats, maxStats) = switch (stats) {
              case (?botStats) {
                // Get current stats (with battery/condition penalties)
                let current = garageManager.getCurrentStats(botStats);
                // Get max stats (at 100% battery/condition)
                let base = garageManager.getBaseStats(tokenIndex);
                let max = {
                  speed = base.speed + botStats.speedBonus;
                  powerCore = base.powerCore + botStats.powerCoreBonus;
                  acceleration = base.acceleration + botStats.accelerationBonus;
                  stability = base.stability + botStats.stabilityBonus;
                };
                (?current, ?max);
              };
              case (null) { (null, null) };
            };

            // Calculate V2 upgrade costs if bot is initialized
            let upgradeCostsV2 = switch (stats, currentStats, maxStats) {
              case (?botStats, ?current, ?max) {
                let baseStats = garageManager.getBaseStats(tokenIndex);
                let overallRating = (max.speed + max.powerCore + max.acceleration + max.stability) / 4;
                let pityCounter = garageManager.getPityCounter(tokenIndex);
                let synergies = garageManager.calculateFactionSynergies(caller);

                // Calculate costs for each stat (use max stats for consistent pricing)
                let speedCost = garageManager.calculateUpgradeCostV2(baseStats.speed, max.speed, overallRating, synergies.costMultipliers.upgradeCost);
                let powerCoreCost = garageManager.calculateUpgradeCostV2(baseStats.powerCore, max.powerCore, overallRating, synergies.costMultipliers.upgradeCost);
                let accelerationCost = garageManager.calculateUpgradeCostV2(baseStats.acceleration, max.acceleration, overallRating, synergies.costMultipliers.upgradeCost);
                let stabilityCost = garageManager.calculateUpgradeCostV2(baseStats.stability, max.stability, overallRating, synergies.costMultipliers.upgradeCost);

                // Calculate success rates (use upgrade counts, not current stats which have penalties)
                let speedRate = garageManager.calculateSuccessRate(botStats.speedUpgrades, pityCounter);
                let powerCoreRate = garageManager.calculateSuccessRate(botStats.powerCoreUpgrades, pityCounter);
                let accelerationRate = garageManager.calculateSuccessRate(botStats.accelerationUpgrades, pityCounter);
                let stabilityRate = garageManager.calculateSuccessRate(botStats.stabilityUpgrades, pityCounter);

                ?{
                  speed = { costE8s = speedCost; successRate = speedRate };
                  powerCore = {
                    costE8s = powerCoreCost;
                    successRate = powerCoreRate;
                  };
                  acceleration = {
                    costE8s = accelerationCost;
                    successRate = accelerationRate;
                  };
                  stability = {
                    costE8s = stabilityCost;
                    successRate = stabilityRate;
                  };
                  pityCounter = pityCounter;
                };
              };
              case (_, _, _) { null };
            };

            // Find races this bot is entered in and races eligible to enter
            let nftId = Nat.toText(tokenIndex);
            let botEloClass = switch (stats) {
              case (?s) {
                let rating = calculateMaxRating(s); // Use max stats, not current degraded stats
                getRaceClassFromRating(rating);
              };
              case (null) { #Scrap };
            };

            var enteredRaces : [{
              raceId : Nat;
              name : Text;
              startTime : Int;
              entryDeadline : Int;
              entryFee : Nat;
              terrain : RacingSimulator.Terrain;
            }] = [];
            var eligibleRaces : [{
              raceId : Nat;
              name : Text;
              startTime : Int;
              entryDeadline : Int;
              entryFee : Nat;
              terrain : RacingSimulator.Terrain;
            }] = [];

            for (race in upcomingRaces.vals()) {
              let isEntered = Array.find<RacingSimulator.RaceEntry>(
                race.entries,
                func(entry) { entry.nftId == nftId },
              );

              let raceInfo = {
                raceId = race.raceId;
                name = race.name;
                startTime = race.startTime;
                entryDeadline = race.entryDeadline;
                entryFee = race.entryFee;
                terrain = race.terrain;
              };

              switch (isEntered) {
                case (?_) {
                  // Already entered
                  enteredRaces := Array.append(enteredRaces, [raceInfo]);
                };
                case (null) {
                  // Not entered - check if eligible
                  let now = Time.now();
                  let isRegistrationOpen = switch (eventCalendar.getEventByRaceId(race.raceId)) {
                    case (?event) {
                      now >= event.registrationOpens and now <= event.registrationCloses;
                    };
                    case (null) {
                      // Not an event race - check if before entry deadline
                      now < race.entryDeadline;
                    };
                  };

                  if (race.raceClass == botEloClass and race.entries.size() < race.maxEntries and isRegistrationOpen) {
                    eligibleRaces := Array.append(eligibleRaces, [raceInfo]);
                  };
                };
              };
            };

            // Get dedication bonuses for this bot
            let dedicationBonuses = if (isInit) {
              let benefits = dedicationManager.getBenefitsForBot(tokenIndex);
              ?{
                speed = benefits.speedBonus;
                powerCore = benefits.powerCoreBonus;
                acceleration = benefits.accelerationBonus;
                stability = benefits.stabilityBonus;
              };
            } else {
              null;
            };

            ?{
              tokenIndex = tokenIndex;
              name = switch (stats) { case (?s) { s.name }; case null { null } };
              stats = stats;
              currentStats = currentStats;
              maxStats = maxStats;
              upgradeCostsV2 = upgradeCostsV2;
              dedicationBonuses = dedicationBonuses;
              isInitialized = isInit;
              currentOwner = walletAccountId;
              activeUpgrade = activeUpgrade;
              upcomingRaces = enteredRaces;
              eligibleRaces = eligibleRaces;
            };
          },
        );
        results;
      };
    };
  };

  /// List all PokedBots registered in the garage by the caller (QUERY - no EXT canister call)
  /// Returns only bots that have been initialized for racing
  /// Frontend should query EXT canister separately to show unregistered bots
  public shared query ({ caller }) func web_list_my_registered_bots() : async [{
    tokenIndex : Nat;
    name : ?Text;
    stats : PokedBotsGarage.PokedBotRacingStats;
    currentStats : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    };
    maxStats : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    };
    upgradeCostsV2 : {
      speed : { costE8s : Nat; successRate : Float };
      powerCore : { costE8s : Nat; successRate : Float };
      acceleration : { costE8s : Nat; successRate : Float };
      stability : { costE8s : Nat; successRate : Float };
      luck : { costE8s : Nat; successRate : Float };
      pityCounter : Nat;
    };
    dedicationBonuses : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    };
    activeUpgrade : ?PokedBotsGarage.UpgradeSession;
    upcomingRaces : [{
      raceId : Nat;
      name : Text;
      startTime : Int;
      entryDeadline : Int;
      entryFee : Nat;
      terrain : RacingSimulator.Terrain;
    }];
    eligibleRaces : [{
      raceId : Nat;
      name : Text;
      startTime : Int;
      entryDeadline : Int;
      entryFee : Nat;
      terrain : RacingSimulator.Terrain;
    }];
  }] {
    let callerAccountId = ExtIntegration.principalToAccountIdentifier(caller, null);

    // Get all upcoming races once
    let allRaces = raceManager.getAllRaces();
    let upcomingRaces = Array.filter<RacingSimulator.Race>(
      allRaces,
      func(race) {
        race.status == #Upcoming;
      },
    );

    // Iterate through all registered bots and filter by owner
    let registeredBots = Buffer.Buffer<{ tokenIndex : Nat; name : ?Text; stats : PokedBotsGarage.PokedBotRacingStats; currentStats : { speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat }; maxStats : { speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat }; upgradeCostsV2 : { speed : { costE8s : Nat; successRate : Float }; powerCore : { costE8s : Nat; successRate : Float }; acceleration : { costE8s : Nat; successRate : Float }; stability : { costE8s : Nat; successRate : Float }; luck : { costE8s : Nat; successRate : Float }; pityCounter : Nat }; dedicationBonuses : { speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat }; activeUpgrade : ?PokedBotsGarage.UpgradeSession; upcomingRaces : [{ raceId : Nat; name : Text; startTime : Int; entryDeadline : Int; entryFee : Nat; terrain : RacingSimulator.Terrain }]; eligibleRaces : [{ raceId : Nat; name : Text; startTime : Int; entryDeadline : Int; entryFee : Nat; terrain : RacingSimulator.Terrain }] }>(10);

    for ((tokenIndex, botStats) in Map.entries(stable_racing_stats)) {
      // Only include bots owned by the caller (compare principals)
      if (botStats.ownerPrincipal == caller) {
        // Calculate up-to-date scavenging rewards deterministically (read-only, no state change)
        let botStatsWithCurrentRewards = switch (botStats.activeMission) {
          case (null) { botStats };
          case (?mission) {
            // Calculate accumulated rewards since last accumulation
            let now = Time.now();
            let result = garageManager.calculateScavengingRewardsReadOnly(tokenIndex, botStats, now);
            switch (result) {
              case (#ok(updatedStats)) { updatedStats };
              case (#err(_)) { botStats }; // If calculation fails, use original stats
            };
          };
        };

        let baseStats = garageManager.getBaseStats(tokenIndex);
        let currentStats = garageManager.getCurrentStats(botStatsWithCurrentRewards);
        let maxStats = {
          speed = baseStats.speed + botStats.speedBonus;
          powerCore = baseStats.powerCore + botStats.powerCoreBonus;
          acceleration = baseStats.acceleration + botStats.accelerationBonus;
          stability = baseStats.stability + botStats.stabilityBonus;
        };

        let overallRating = (maxStats.speed + maxStats.powerCore + maxStats.acceleration + maxStats.stability) / 4;
        let pityCounter = garageManager.getPityCounter(tokenIndex);

        // Calculate V2 upgrade costs
        let synergies = garageManager.calculateFactionSynergies(caller);
        let speedCost = garageManager.calculateUpgradeCostV2(baseStats.speed, maxStats.speed, overallRating, synergies.costMultipliers.upgradeCost);
        let powerCoreCost = garageManager.calculateUpgradeCostV2(baseStats.powerCore, maxStats.powerCore, overallRating, synergies.costMultipliers.upgradeCost);
        let accelerationCost = garageManager.calculateUpgradeCostV2(baseStats.acceleration, maxStats.acceleration, overallRating, synergies.costMultipliers.upgradeCost);
        let stabilityCost = garageManager.calculateUpgradeCostV2(baseStats.stability, maxStats.stability, overallRating, synergies.costMultipliers.upgradeCost);

        // Calculate luck upgrade cost (uses luckBase as base stat, luckBase + luckBonus as current)
        let luckCost = garageManager.calculateUpgradeCostV2(botStats.luckBase, botStats.luckBase + botStats.luckBonus, overallRating, synergies.costMultipliers.upgradeCost);

        // Calculate success rates
        let speedRate = garageManager.calculateSuccessRate(botStats.speedUpgrades, pityCounter);
        let powerCoreRate = garageManager.calculateSuccessRate(botStats.powerCoreUpgrades, pityCounter);
        let accelerationRate = garageManager.calculateSuccessRate(botStats.accelerationUpgrades, pityCounter);
        let stabilityRate = garageManager.calculateSuccessRate(botStats.stabilityUpgrades, pityCounter);
        let luckRate = garageManager.calculateSuccessRate(botStats.luckUpgrades, pityCounter);

        let activeUpgrade = Map.get(stable_active_upgrades, Map.nhash, tokenIndex);

        // Find races this bot is entered in and races eligible to enter
        let nftId = Nat.toText(tokenIndex);
        let rating = calculateMaxRating(botStatsWithCurrentRewards); // Use max stats, not current degraded stats
        let botEloClass = getRaceClassFromRating(rating);

        var enteredRaces : [{
          raceId : Nat;
          name : Text;
          startTime : Int;
          entryDeadline : Int;
          entryFee : Nat;
          terrain : RacingSimulator.Terrain;
        }] = [];
        var eligibleRaces : [{
          raceId : Nat;
          name : Text;
          startTime : Int;
          entryDeadline : Int;
          entryFee : Nat;
          terrain : RacingSimulator.Terrain;
        }] = [];

        for (race in upcomingRaces.vals()) {
          let isEntered = Array.find<RacingSimulator.RaceEntry>(
            race.entries,
            func(entry) { entry.nftId == nftId },
          );

          let raceInfo = {
            raceId = race.raceId;
            name = race.name;
            startTime = race.startTime;
            entryDeadline = race.entryDeadline;
            entryFee = race.entryFee;
            terrain = race.terrain;
          };

          switch (isEntered) {
            case (?_) {
              // Already entered
              enteredRaces := Array.append(enteredRaces, [raceInfo]);
            };
            case (null) {
              // Not entered - check if eligible
              let now = Time.now();
              let isRegistrationOpen = switch (eventCalendar.getEventByRaceId(race.raceId)) {
                case (?event) {
                  now >= event.registrationOpens and now <= event.registrationCloses;
                };
                case (null) {
                  // Not an event race - check if before entry deadline
                  now < race.entryDeadline;
                };
              };

              if (race.raceClass == botEloClass and race.entries.size() < race.maxEntries and isRegistrationOpen) {
                eligibleRaces := Array.append(eligibleRaces, [raceInfo]);
              };
            };
          };
        };

        registeredBots.add({
          tokenIndex = tokenIndex;
          name = botStatsWithCurrentRewards.name;
          stats = botStatsWithCurrentRewards;
          currentStats = currentStats;
          maxStats = maxStats;
          upgradeCostsV2 = {
            speed = { costE8s = speedCost; successRate = speedRate };
            powerCore = { costE8s = powerCoreCost; successRate = powerCoreRate };
            acceleration = {
              costE8s = accelerationCost;
              successRate = accelerationRate;
            };
            stability = { costE8s = stabilityCost; successRate = stabilityRate };
            luck = { costE8s = luckCost; successRate = luckRate };
            pityCounter = pityCounter;
          };
          dedicationBonuses = {
            speed = dedicationManager.getBenefitsForBot(tokenIndex).speedBonus;
            powerCore = dedicationManager.getBenefitsForBot(tokenIndex).powerCoreBonus;
            acceleration = dedicationManager.getBenefitsForBot(tokenIndex).accelerationBonus;
            stability = dedicationManager.getBenefitsForBot(tokenIndex).stabilityBonus;
          };
          activeUpgrade = activeUpgrade;
          upcomingRaces = enteredRaces;
          eligibleRaces = eligibleRaces;
        });
      };
    };

    Buffer.toArray(registeredBots);
  };

  /// Get user's parts inventory
  public shared query ({ caller }) func web_get_user_inventory() : async PokedBotsGarage.UserInventory {
    garageManager.getUserInventory(caller);
  };

  /// Get garage power grid status for the caller
  /// Shows total capacity, current draw, number of bots charging, and efficiency
  public shared query ({ caller }) func web_get_garage_power_status() : async {
    totalCapacityWatts : Nat;
    currentDrawWatts : Nat;
    botsCharging : Nat;
    efficiency : Float;
    wattsPerBot : Nat;
    // Constants for UI display
    basePowerWatts : Nat;
    wattsPerBotRequired : Nat;
  } {
    let status = garageManager.getGaragePowerStatus(caller);
    {
      totalCapacityWatts = status.totalCapacityWatts;
      currentDrawWatts = status.currentDrawWatts;
      botsCharging = status.botsCharging;
      efficiency = status.efficiency;
      wattsPerBot = status.wattsPerBot;
      basePowerWatts = PokedBotsGarage.BASE_POWER_WATTS;
      wattsPerBotRequired = PokedBotsGarage.WATTS_PER_BOT;
    };
  };

  /// Get faction synergy bonuses for the caller's collection
  public shared query ({ caller }) func web_get_collection_bonuses() : async {
    statBonuses : {
      speed : Int;
      powerCore : Int;
      acceleration : Int;
      stability : Int;
    };
    costMultipliers : {
      repair : Float;
      upgrade : Float;
      rechargeCooldown : Float;
    };
    yieldMultipliers : { parts : Float; prizes : Float };
    drainMultipliers : { scavenging : Float };
  } {
    let synergies = garageManager.calculateFactionSynergies(caller);

    // Use maximum stat bonuses from all factions (non-stacking per stat)
    var totalSpeed : Int = 0;
    var totalPower : Int = 0;
    var totalAccel : Int = 0;
    var totalStab : Int = 0;

    for ((faction, stats) in synergies.statBonuses.vals()) {
      totalSpeed := Int.max(totalSpeed, stats.speed);
      totalPower := Int.max(totalPower, stats.powerCore);
      totalAccel := Int.max(totalAccel, stats.acceleration);
      totalStab := Int.max(totalStab, stats.stability);
    };

    {
      statBonuses = {
        speed = totalSpeed;
        powerCore = totalPower;
        acceleration = totalAccel;
        stability = totalStab;
      };
      costMultipliers = {
        repair = synergies.costMultipliers.repairCost;
        upgrade = synergies.costMultipliers.upgradeCost;
        rechargeCooldown = synergies.costMultipliers.rechargeCooldown;
      };
      yieldMultipliers = {
        parts = synergies.yieldMultipliers.scavengingParts;
        prizes = synergies.yieldMultipliers.racePrizes;
      };
      drainMultipliers = {
        scavenging = synergies.drainMultipliers.scavengingDrain;
      };
    };
  };

  /// Initialize a bot for racing (web equivalent of garage_initialize_pokedbot)
  public shared ({ caller }) func web_initialize_bot(
    tokenIndex : Nat,
    name : ?Text,
  ) : async Result.Result<Text, Text> {
    // Validate name if provided
    switch (name) {
      case (?n) {
        switch (UsernameValidator.validateUsername(n)) {
          case (?error) { return #err(error) };
          case (null) {};
        };
      };
      case (null) {};
    };

    // Verify caller owns the NFT in their wallet
    let walletAccountId = ExtIntegration.principalToAccountIdentifier(caller, null);
    let ownerResult = try {
      await extCanister.bearer(
        ExtIntegration.encodeTokenIdentifier(Nat32.fromNat(tokenIndex), extCanisterId)
      );
    } catch (_) {
      return #err("Failed to verify ownership");
    };

    switch (ownerResult) {
      case (#err(_)) { #err("Bot does not exist") };
      case (#ok(owner)) {
        if (owner != walletAccountId) {
          #err("You do not own this bot - it must be in your wallet");
        } else {
          // Check if already initialized by someone else
          switch (garageManager.getStats(tokenIndex)) {
            case (?existingStats) {
              // Check if owned by caller
              if (existingStats.ownerPrincipal != caller) {
                // Transfer case - still charge 0.1 ICP registration fee
                let REGISTRATION_COST = 10000000 : Nat; // 0.1 ICP in e8s
                let TRANSFER_FEE = 10000 : Nat; // 0.0001 ICP in e8s
                let totalCost = REGISTRATION_COST + TRANSFER_FEE;

                let ledgerId = switch (icpLedgerCanisterId) {
                  case (?id) { id };
                  case (null) {
                    return #err("ICP Ledger not configured");
                  };
                };

                let icpLedger = actor (Principal.toText(ledgerId)) : actor {
                  icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
                };

                let transferResult = try {
                  await icpLedger.icrc2_transfer_from({
                    from = { owner = caller; subaccount = null };
                    to = { owner = thisPrincipal; subaccount = null };
                    amount = totalCost;
                    fee = ?TRANSFER_FEE;
                    memo = null;
                    created_at_time = null;
                    spender_subaccount = null;
                  });
                } catch (e) {
                  return #err("Payment failed: " # Error.message(e) # ". Please approve the canister to spend 0.1001 ICP using icrc2_approve.");
                };

                switch (transferResult) {
                  case (#Err(e)) {
                    let errorMsg = switch (e) {
                      case (#InsufficientFunds({ balance })) {
                        "Insufficient funds. Balance: " # Nat.toText(balance / 100000000) # " ICP";
                      };
                      case (#InsufficientAllowance({ allowance })) {
                        "Insufficient spending allowance. Current: " # Nat.toText(allowance / 100000000) # " ICP. Please go to the Garage page and set a spending allowance first.";
                      };
                      case (#BadFee({ expected_fee })) {
                        "Bad fee. Expected: " # Nat.toText(expected_fee) # " e8s";
                      };
                      case _ { "Transfer failed" };
                    };
                    #err(errorMsg);
                  };
                  case (#Ok(_)) {
                    // Payment successful, update owner
                    ignore garageManager.updateBotOwner(tokenIndex, caller);
                    // Also update name if provided
                    if (Option.isSome(name)) {
                      ignore garageManager.updateBotName(tokenIndex, name);
                    };
                    // Record dedication points for registration
                    dedicationManager.recordEventRegistration(tokenIndex, REGISTRATION_COST, Time.now());
                    let nameMsg = switch (name) {
                      case (?n) { " with name: " # n };
                      case (null) { "" };
                    };
                    #ok("Bot re-registered to your account" # nameMsg # ". 0.1 ICP registration fee paid.");
                  };
                };
              } else {
                // Already owned by caller - allow name update if provided
                switch (name) {
                  case (?newName) {
                    ignore garageManager.updateBotName(tokenIndex, name);
                    #ok("Bot name updated to: " # newName);
                  };
                  case (null) {
                    #ok("Bot already initialized for your account");
                  };
                };
              };
            };
            case (null) {
              // First time initialization - charge 0.1 ICP registration fee
              let REGISTRATION_COST = 10000000 : Nat; // 0.1 ICP in e8s
              let TRANSFER_FEE = 10000 : Nat; // 0.0001 ICP in e8s
              let totalCost = REGISTRATION_COST + TRANSFER_FEE;

              let ledgerId = switch (icpLedgerCanisterId) {
                case (?id) { id };
                case (null) {
                  return #err("ICP Ledger not configured");
                };
              };

              let icpLedger = actor (Principal.toText(ledgerId)) : actor {
                icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
              };

              let transferResult = try {
                await icpLedger.icrc2_transfer_from({
                  from = { owner = caller; subaccount = null };
                  to = { owner = thisPrincipal; subaccount = null };
                  amount = totalCost;
                  fee = ?TRANSFER_FEE;
                  memo = null;
                  created_at_time = null;
                  spender_subaccount = null;
                });
              } catch (e) {
                return #err("Payment failed: " # Error.message(e) # ". Please approve the canister to spend 0.1001 ICP using icrc2_approve.");
              };

              switch (transferResult) {
                case (#Err(e)) {
                  let errorMsg = switch (e) {
                    case (#InsufficientFunds({ balance })) {
                      "Insufficient funds. Balance: " # Nat.toText(balance / 100000000) # " ICP";
                    };
                    case (#InsufficientAllowance({ allowance })) {
                      "Insufficient spending allowance. Current: " # Nat.toText(allowance / 100000000) # " ICP. Please go to the Garage page and set a spending allowance first.";
                    };
                    case (#BadFee({ expected_fee })) {
                      "Bad fee. Expected: " # Nat.toText(expected_fee) # " e8s";
                    };
                    case _ { "Transfer failed" };
                  };
                  #err(errorMsg);
                };
                case (#Ok(_)) {
                  // Payment successful, initialize bot
                  ignore garageManager.initializeBot(tokenIndex, caller, null, name);
                  // Record dedication points for registration
                  dedicationManager.recordEventRegistration(tokenIndex, REGISTRATION_COST, Time.now());
                  #ok("Bot initialized successfully. 0.1 ICP registration fee paid.");
                };
              };
            };
          };
        };
      };
    };
  };

  /// Get detailed stats for a specific bot
  public shared ({ caller }) func web_get_bot_details(
    tokenIndex : Nat
  ) : async Result.Result<{ stats : ?PokedBotsGarage.PokedBotRacingStats; baseStats : { speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat }; isOwner : Bool; isInitialized : Bool; currentCondition : ?Nat; currentBattery : ?Nat; activeUpgrade : ?PokedBotsGarage.UpgradeSession; upgradeCosts : ?{ Velocity : { parts : Nat; icp : Nat }; PowerCore : { parts : Nat; icp : Nat }; Thruster : { parts : Nat; icp : Nat }; Gyro : { parts : Nat; icp : Nat } } }, Text> {
    let baseStats = garageManager.getBaseStats(tokenIndex);

    // Check if bot is initialized
    let statsOpt = garageManager.getStats(tokenIndex);

    switch (statsOpt) {
      case (null) {
        // Bot not initialized - can't determine ownership without EXT call
        // For uninitialized bots, we don't check ownership to avoid expensive inter-canister calls
        let totalBaseStats = baseStats.speed + baseStats.powerCore + baseStats.acceleration + baseStats.stability;

        #ok({
          stats = null;
          baseStats = baseStats;
          isOwner = false;
          isInitialized = false;
          currentCondition = null;
          currentBattery = null;
          activeUpgrade = null;
          upgradeCosts = null;
        });
      };
      case (?stats) {
        // Bot is initialized - check ownership via registration
        let isOwner = stats.ownerPrincipal == caller;

        // Bot is initialized - return full details
        let activeUpgrade = Map.get(stable_active_upgrades, Map.nhash, tokenIndex);

        // Calculate current stats (base + bonuses)
        let currentSpeed = baseStats.speed + stats.speedBonus;
        let currentPowerCore = baseStats.powerCore + stats.powerCoreBonus;
        let currentAcceleration = baseStats.acceleration + stats.accelerationBonus;
        let currentStability = baseStats.stability + stats.stabilityBonus;

        // Calculate overall rating from current stats (max 100)
        let overallRating = (currentSpeed + currentPowerCore + currentAcceleration + currentStability) / 4;

        // Calculate upgrade costs using V2 dynamic formula with Game faction synergy
        let synergies = garageManager.calculateFactionSynergies(caller);
        let velocityCostE8s = garageManager.calculateUpgradeCostV2(
          baseStats.speed,
          currentSpeed,
          overallRating,
          synergies.costMultipliers.upgradeCost,
        );
        let powerCoreCostE8s = garageManager.calculateUpgradeCostV2(
          baseStats.powerCore,
          currentPowerCore,
          overallRating,
          synergies.costMultipliers.upgradeCost,
        );
        let thrusterCostE8s = garageManager.calculateUpgradeCostV2(
          baseStats.acceleration,
          currentAcceleration,
          overallRating,
          synergies.costMultipliers.upgradeCost,
        );
        let gyroCostE8s = garageManager.calculateUpgradeCostV2(
          baseStats.stability,
          currentStability,
          overallRating,
          synergies.costMultipliers.upgradeCost,
        );

        // Convert e8s to parts (divide by 10_000)
        let velocityCost = velocityCostE8s / 10_000;
        let powerCoreCost = powerCoreCostE8s / 10_000;
        let thrusterCost = thrusterCostE8s / 10_000;
        let gyroCost = gyroCostE8s / 10_000;

        #ok({
          stats = ?stats;
          baseStats = baseStats;
          isOwner = isOwner;
          isInitialized = true;
          currentCondition = ?stats.condition;
          currentBattery = ?stats.battery;
          activeUpgrade = activeUpgrade;
          upgradeCosts = ?{
            Velocity = { parts = velocityCost; icp = velocityCostE8s };
            PowerCore = { parts = powerCoreCost; icp = powerCoreCostE8s };
            Thruster = { parts = thrusterCost; icp = thrusterCostE8s };
            Gyro = { parts = gyroCost; icp = gyroCostE8s };
          };
        });
      };
    };
  };

  /// Get dedication info for a specific bot
  public query func web_get_dedication_info(
    tokenIndex : Nat
  ) : async {
    tier : Nat;
    tierName : Text;
    totalDP : Nat;
    investmentDP : Nat;
    activityDP : Nat;
    totalInvestedICP : Float;
    nextTierDP : ?Nat;
    nextTierName : ?Text;
    progressPercent : Nat;
    benefits : {
      speedBonus : Nat;
      accelerationBonus : Nat;
      powerCoreBonus : Nat;
      stabilityBonus : Nat;
      terrainBonusPercent : Nat;
      scavengingYieldMult : Float;
      upgradeDiscountMult : Float;
      rechargeCooldownMult : Float;
      repairCooldownMult : Float;
    };
  } {
    dedicationManager.getDedicationSummary(tokenIndex);
  };

  /// Get batch dedication info for multiple bots (optimized for garage list)
  public query func web_get_batch_dedication_info(
    tokenIndices : [Nat]
  ) : async [(
    Nat,
    {
      tier : Nat;
      tierName : Text;
      totalDP : Nat;
      benefits : {
        speedBonus : Nat;
        accelerationBonus : Nat;
        powerCoreBonus : Nat;
        stabilityBonus : Nat;
        terrainBonusPercent : Nat;
        scavengingYieldMult : Float;
        upgradeDiscountMult : Float;
        rechargeCooldownMult : Float;
        repairCooldownMult : Float;
      };
    },
  )] {
    dedicationManager.getBatchDedicationSummaries(tokenIndices);
  };

  /// De-register a bot (removes control, preserves stats)
  public shared ({ caller }) func web_deregister_bot(
    tokenIndex : Nat
  ) : async Result.Result<Text, Text> {
    // Get bot stats to verify current registration
    let stats = switch (garageManager.getStats(tokenIndex)) {
      case (null) {
        return #err("This PokedBot is not registered. Only registered bots can be de-registered.");
      };
      case (?s) { s };
    };

    // Verify caller is the registered owner
    if (not Principal.equal(stats.ownerPrincipal, caller)) {
      return #err("You are not the registered owner of this PokedBot. Only the registered owner can de-register it.");
    };

    // Check if bot has active upgrade session
    switch (garageManager.getActiveUpgrade(tokenIndex)) {
      case (?upgrade) {
        return #err("Cannot de-register while an upgrade is in progress. Cancel the upgrade first.");
      };
      case (null) { /* No upgrade, OK to proceed */ };
    };

    // Check if bot is on scavenging mission
    switch (stats.activeMission) {
      case (?mission) {
        return #err("Cannot de-register while bot is scavenging. Complete the scavenging mission first.");
      };
      case (null) { /* Not scavenging, OK to proceed */ };
    };

    // De-register by removing the bot's stats
    garageManager.deregisterBot(tokenIndex);

    #ok("Bot #" # Nat.toText(tokenIndex) # " has been de-registered. All stats preserved. New owner can register to take control.");
  };

  /// Recharge a bot's battery (0.1 ICP + fee via ICRC-2)
  public shared ({ caller }) func web_recharge_bot(
    tokenIndex : Nat
  ) : async Result.Result<Text, Text> {
    // Get stats and verify registration
    let stats = switch (garageManager.getStats(tokenIndex)) {
      case (null) {
        return #err("Bot not registered. Use web_initialize_bot first.");
      };
      case (?s) { s };
    };

    // Verify caller is registered owner
    if (not Principal.equal(stats.ownerPrincipal, caller)) {
      return #err("You are not the registered owner. Use web_initialize_bot to register.");
    };

    switch (stats.activeMission) {
      case (?_mission) {
        return #err("Cannot recharge while bot is on a scavenging mission. Retrieve the bot first.");
      };
      case (null) { /* OK to proceed */ };
    };

    // Check cooldown (6 hours, reduced by Food faction synergy 15-45% and Bot Dedication tier 0-50%)
    let BASE_RECHARGE_COOLDOWN : Int = 21600000000000; // 6 hours in nanoseconds
    let synergies = garageManager.calculateFactionSynergies(caller);
    let tierBenefits = dedicationManager.getBenefitsForBot(tokenIndex);
    let RECHARGE_COOLDOWN = Float.toInt(Float.fromInt(BASE_RECHARGE_COOLDOWN) * synergies.costMultipliers.rechargeCooldown * tierBenefits.rechargeCooldownMult);

    let now = Time.now();
    switch (stats.lastRecharged) {
      case (?lastTime) {
        let timeSince = now - lastTime;
        if (timeSince < RECHARGE_COOLDOWN) {
          let hoursLeft = (RECHARGE_COOLDOWN - timeSince) / (60 * 60 * 1_000_000_000);
          let minutesLeft = ((RECHARGE_COOLDOWN - timeSince) % (60 * 60 * 1_000_000_000)) / (60 * 1_000_000_000);
          return #err("Recharge cooldown active. Time remaining: " # Int.toText(hoursLeft) # "h " # Int.toText(minutesLeft) # "m");
        };
      };
      case (null) { /* First recharge, no cooldown */ };
    };

    // Process ICRC-2 payment and recharge
    let RECHARGE_COST : Nat = 10_000_000; // 0.1 ICP

    let ledgerId = switch (icpLedgerCanisterId) {
      case (?id) { id };
      case (null) { return #err("ICP Ledger not configured") };
    };

    let icpLedger = actor (Principal.toText(ledgerId)) : actor {
      icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
    };

    let transferResult = try {
      await icpLedger.icrc2_transfer_from({
        from = { owner = caller; subaccount = null };
        to = { owner = thisPrincipal; subaccount = null };
        amount = RECHARGE_COST + TRANSFER_FEE;
        fee = ?TRANSFER_FEE;
        memo = null;
        created_at_time = null;
        spender_subaccount = null;
      });
    } catch (e) {
      return #err("Payment transfer failed: " # Error.message(e));
    };

    switch (transferResult) {
      case (#Err(e)) {
        let errorMsg = switch (e) {
          case (#InsufficientAllowance({ allowance })) {
            "Insufficient spending allowance. Current: " # Nat.toText(allowance / 100000000) # " ICP. Please go to the Garage page and set a spending allowance first.";
          };
          case _ { "Payment failed: " # debug_show (e) };
        };
        #err(errorMsg);
      };
      case (#Ok(_blockIndex)) {
        // Get fresh stats (already checked for mission above)
        let freshStats = switch (garageManager.getStats(tokenIndex)) {
          case (null) { return #err("Bot not found in garage") };
          case (?s) { s };
        };

        let now = Time.now();
        let currentBattery = freshStats.battery;
        let currentCondition = freshStats.condition;
        let maxBattery = 100;

        // Generate pseudo-random values based on timestamp, token index, and entropy
        // Use XOR-based combination for better distribution
        let entropy = garageManager.getNextEntropy();
        let combined = garageManager.combineRNG(tokenIndex, Int.abs(now), entropy);
        let seed = garageManager.hashForRNG(combined);
        let randomHash1 = seed % 1000; // 0-999
        let randomHash2 = garageManager.hashForRNG(seed * 7919) % 1000; // Different seed for battery RNG

        // BATTERY RECHARGE: 50-90 range (base 70 ± 20)
        let batteryRNG = (Float.fromInt(randomHash2) / 1000.0) * 40.0 - 20.0; // -20 to +20
        let totalRecharge = Int.abs(Float.toInt(70.0 + batteryRNG)); // 50-90
        let newBattery = Nat.min(maxBattery, currentBattery + totalRecharge);

        // ===== RESONANCE SYSTEM FOR OVERCHARGE =====
        // Each bot has a unique resonance field that determines optimal recharge points
        // Recharging near the optimal point gives maximum overcharge bonus
        let resonance = ResonanceSystem.calculateResonance(tokenIndex, #Recharge, currentBattery, now);

        // Overcharge based on how LOW battery was before recharge
        // Lower battery = bigger overcharge potential (risk/reward mechanic)
        // Base formula: (100 - currentBattery) * 0.4, theoretical max 40%
        let batteryDeficit = if (currentBattery >= 100) { 0 } else {
          100 - currentBattery;
        };
        let baseOvercharge = Float.fromInt(batteryDeficit) * 0.4;

        // Condition affects efficiency with some randomness
        let conditionBonus = Float.fromInt(currentCondition) / 200.0;
        let randomVariance = (Float.fromInt(randomHash1) / 1000.0) * 0.5 - 0.25; // -0.25 to +0.25
        let efficiency = 0.5 + conditionBonus + randomVariance;

        // Apply resonance modifier to overcharge
        // Peak resonance: full potential (100%)
        // Good resonance: 80% of potential
        // Outside resonance: 60% of potential (baseline)
        let resonanceModifier = if (resonance.inPeakZone) {
          1.0;
        } else if (resonance.inGoodZone) {
          0.8;
        } else {
          0.6;
        };

        let finalOvercharge = baseOvercharge * efficiency * resonanceModifier;
        let newOvercharge = Nat.min(40, Int.abs(Float.toInt(finalOvercharge)));

        let overchargeAdded = if (newOvercharge >= freshStats.overcharge) {
          newOvercharge - freshStats.overcharge;
        } else { 0 };

        let updatedStats = {
          freshStats with
          battery = newBattery;
          overcharge = newOvercharge;
          lastRecharged = ?now;
        };

        garageManager.updateStats(tokenIndex, updatedStats);

        // Record dedication points for ICP investment and battery restoration
        let batteryRestored = newBattery - currentBattery;
        dedicationManager.recordRecharge(tokenIndex, RECHARGE_COST, now);
        dedicationManager.recordBatteryRestored(tokenIndex, batteryRestored, now);

        // Build resonance message - don't reveal optimal point
        let resonanceMsg = if (resonance.inPeakZone) {
          " 🔮 PEAK RESONANCE! Maximum overcharge achieved!";
        } else if (resonance.inGoodZone) {
          " ✨ Good resonance - solid overcharge bonus";
        } else {
          ""; // Don't reveal optimal point
        };

        let overchargeMsg = if (overchargeAdded > 0) {
          let speedBoost = Int.abs(Float.toInt(Float.fromInt(overchargeAdded) * 0.125));
          let stabilityPenalty = Int.abs(Float.toInt(Float.fromInt(overchargeAdded) * 0.083));
          " ⚡ OVERCHARGE: +" # Nat.toText(overchargeAdded) # "% (+" # Nat.toText(speedBoost) # "% Speed/Accel, -" # Nat.toText(stabilityPenalty) # "% Stability/PowerCore for next race)" # resonanceMsg;
        } else {
          resonanceMsg;
        };

        #ok("⚡ Battery recharged to " # Nat.toText(newBattery) # "%!" # overchargeMsg);
      };
    };
  };

  /// Repair a bot to restore condition (0.05 ICP + fee via ICRC-2)
  public shared ({ caller }) func web_repair_bot(
    tokenIndex : Nat
  ) : async Result.Result<Text, Text> {
    // Get stats and verify registration
    let stats = switch (garageManager.getStats(tokenIndex)) {
      case (null) {
        return #err("Bot not registered. Use web_initialize_bot first.");
      };
      case (?s) { s };
    };

    // Verify caller is registered owner
    if (not Principal.equal(stats.ownerPrincipal, caller)) {
      return #err("You are not the registered owner. Use web_initialize_bot to register.");
    };

    switch (stats.activeMission) {
      case (?_mission) {
        return #err("Cannot repair while bot is on a scavenging mission. Retrieve the bot first.");
      };
      case (null) { /* OK to proceed */ };
    };

    // Check cooldown (3 hours, reduced by Bot Dedication tier 0-40%)
    let BASE_REPAIR_COOLDOWN : Int = 10800000000000; // 3 hours in nanoseconds
    let tierBenefits = dedicationManager.getBenefitsForBot(tokenIndex);
    let REPAIR_COOLDOWN = Float.toInt(Float.fromInt(BASE_REPAIR_COOLDOWN) * tierBenefits.repairCooldownMult);
    let now = Time.now();
    switch (stats.lastRepaired) {
      case (?lastTime) {
        let timeSince = now - lastTime;
        if (timeSince < REPAIR_COOLDOWN) {
          let hoursLeft = (REPAIR_COOLDOWN - timeSince) / (60 * 60 * 1_000_000_000);
          let minutesLeft = ((REPAIR_COOLDOWN - timeSince) % (60 * 60 * 1_000_000_000)) / (60 * 1_000_000_000);
          return #err("Repair cooldown active. Time remaining: " # Int.toText(hoursLeft) # "h " # Int.toText(minutesLeft) # "m");
        };
      };
      case (null) { /* First repair, no cooldown */ };
    };

    // Process ICRC-2 payment and repair
    let BASE_REPAIR_COST : Nat = 5_000_000; // 0.05 ICP

    // Apply Industrial faction synergy discount to repair cost
    let synergies = garageManager.calculateFactionSynergies(caller);
    let REPAIR_COST = Nat.max(1_000_000, Int.abs(Float.toInt(Float.fromInt(BASE_REPAIR_COST) * synergies.costMultipliers.repairCost)));

    let ledgerId = switch (icpLedgerCanisterId) {
      case (?id) { id };
      case (null) { return #err("ICP Ledger not configured") };
    };

    let icpLedger = actor (Principal.toText(ledgerId)) : actor {
      icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
    };

    let transferResult = try {
      await icpLedger.icrc2_transfer_from({
        from = { owner = caller; subaccount = null };
        to = { owner = thisPrincipal; subaccount = null };
        amount = REPAIR_COST + TRANSFER_FEE;
        fee = ?TRANSFER_FEE;
        memo = null;
        created_at_time = null;
        spender_subaccount = null;
      });
    } catch (e) {
      return #err("Payment transfer failed: " # Error.message(e));
    };

    switch (transferResult) {
      case (#Err(e)) {
        let errorMsg = switch (e) {
          case (#InsufficientAllowance({ allowance })) {
            "Insufficient spending allowance. Current: " # Nat.toText(allowance / 100000000) # " ICP. Please go to the Garage page and set a spending allowance first.";
          };
          case _ { "Payment failed: " # debug_show (e) };
        };
        #err(errorMsg);
      };
      case (#Ok(_blockIndex)) {
        // Get fresh stats (already checked for mission above)
        let freshStats = switch (garageManager.getStats(tokenIndex)) {
          case (null) { return #err("Bot not found in garage") };
          case (?s) { s };
        };

        let now = Time.now();
        let newCondition = Nat.min(100, freshStats.condition + 30);

        // ===== RESONANCE SYSTEM FOR PERFECT TUNE-UP =====
        // Each bot has a unique resonance field that determines optimal repair points
        // Repairing within resonance while having overcharge achieves Perfect Tune-Up
        let resonance = ResonanceSystem.calculateResonance(tokenIndex, #Repair, freshStats.condition, now);

        // Perfect Tune-Up requires: having overcharge AND being in resonance zone
        let hasOvercharge = freshStats.overcharge > 0;
        let perfectTuneUp = hasOvercharge and (resonance.inPeakZone or resonance.inGoodZone);

        // Calculate tune-up quality (affects how much penalty is removed)
        // Peak: 100% penalty removal, Good: 70% penalty removal
        let tuneupQuality = ResonanceSystem.getPerfectTuneupQuality(resonance);

        // Keep overcharge regardless of Perfect Tune-Up
        // If Perfect Tune-Up: penalties removed, if not: penalties remain
        let finalOvercharge = freshStats.overcharge;

        let updatedStats = {
          freshStats with
          condition = newCondition;
          perfectTuneUp = perfectTuneUp;
          lastRepaired = ?Time.now();
          overcharge = finalOvercharge;
        };

        garageManager.updateStats(tokenIndex, updatedStats);

        // Record dedication points for ICP investment and condition restoration
        let conditionRestored = newCondition - freshStats.condition;
        dedicationManager.recordRepair(tokenIndex, REPAIR_COST, now);
        dedicationManager.recordConditionRestored(tokenIndex, conditionRestored, now);

        // Build message based on resonance outcome
        if (perfectTuneUp and resonance.inPeakZone) {
          #ok("🔧✨🔮 PEAK RESONANCE Perfect Tune-Up! Condition at " # Nat.toText(newCondition) # "% - ALL overcharge penalties removed! Your bot keeps the " # Nat.toText(freshStats.overcharge) # "% Speed/Accel boost without any Stability/PowerCore penalties!");
        } else if (perfectTuneUp) {
          #ok("🔧✨ Good Resonance Tune-Up! Condition at " # Nat.toText(newCondition) # "% - 70% of overcharge penalties removed! Speed/Accel boost preserved with reduced Stability/PowerCore penalties.");
        } else if (hasOvercharge) {
          #ok("🔧 Repairs complete. Condition at " # Nat.toText(newCondition) # "%. Overcharge (" # Nat.toText(freshStats.overcharge) # "%) preserved with penalties.");
        } else {
          #ok("🔧 Repairs complete. Condition at " # Nat.toText(newCondition) # "%");
        };
      };
    };
  };

  /// Get user's starred bots
  public query ({ caller }) func web_get_starred_bots() : async [Nat] {
    Option.get(Map.get(stable_user_starred_bots, Map.phash, caller), []);
  };

  /// Set user's starred bots (replaces entire list)
  public shared ({ caller }) func web_set_starred_bots(
    starredBots : [Nat]
  ) : async Result.Result<Text, Text> {
    // Validate bot indices (optional - could add ownership check)
    if (starredBots.size() > 100) {
      return #err("Cannot star more than 100 bots");
    };

    ignore Map.put(stable_user_starred_bots, Map.phash, caller, starredBots);
    #ok("Starred bots updated successfully");
  };

  /// Get user's bots tagged as racers
  public query ({ caller }) func web_get_racer_bots() : async [Nat] {
    Option.get(Map.get(stable_user_racer_bots, Map.phash, caller), []);
  };

  /// Set user's bots tagged as racers (replaces entire list)
  public shared ({ caller }) func web_set_racer_bots(
    racerBots : [Nat]
  ) : async Result.Result<Text, Text> {
    if (racerBots.size() > 100) {
      return #err("Cannot tag more than 100 bots as racers");
    };
    ignore Map.put(stable_user_racer_bots, Map.phash, caller, racerBots);
    #ok("Racer bots updated successfully");
  };

  /// Get user's bots tagged as scavengers
  public query ({ caller }) func web_get_scavenger_bots() : async [Nat] {
    Option.get(Map.get(stable_user_scavenger_bots, Map.phash, caller), []);
  };

  /// Set user's bots tagged as scavengers (replaces entire list)
  public shared ({ caller }) func web_set_scavenger_bots(
    scavengerBots : [Nat]
  ) : async Result.Result<Text, Text> {
    if (scavengerBots.size() > 100) {
      return #err("Cannot tag more than 100 bots as scavengers");
    };
    ignore Map.put(stable_user_scavenger_bots, Map.phash, caller, scavengerBots);
    #ok("Scavenger bots updated successfully");
  };

  /// Full Maintenance - combines recharge and repair in a single transaction (0.15 ICP + fee via ICRC-2)
  public shared ({ caller }) func web_full_maintenance(
    tokenIndex : Nat
  ) : async Result.Result<Text, Text> {
    // Get stats and verify registration
    let stats = switch (garageManager.getStats(tokenIndex)) {
      case (null) {
        return #err("Bot not registered. Use web_initialize_bot first.");
      };
      case (?s) { s };
    };

    // Verify caller is registered owner
    if (not Principal.equal(stats.ownerPrincipal, caller)) {
      return #err("You are not the registered owner. Use web_initialize_bot to register.");
    };

    switch (stats.activeMission) {
      case (?_mission) {
        return #err("Cannot perform maintenance while bot is on a scavenging mission. Retrieve the bot first.");
      };
      case (null) { /* OK to proceed */ };
    };

    // Check cooldowns (apply both garage synergy and bot dedication bonuses)
    let BASE_REPAIR_COOLDOWN : Int = 10800000000000; // 3 hours in nanoseconds
    let BASE_RECHARGE_COOLDOWN : Int = 21600000000000; // 6 hours in nanoseconds
    let synergies = garageManager.calculateFactionSynergies(caller);
    let tierBenefits = dedicationManager.getBenefitsForBot(tokenIndex);
    let RECHARGE_COOLDOWN = Float.toInt(Float.fromInt(BASE_RECHARGE_COOLDOWN) * synergies.costMultipliers.rechargeCooldown * tierBenefits.rechargeCooldownMult);
    let REPAIR_COOLDOWN = Float.toInt(Float.fromInt(BASE_REPAIR_COOLDOWN) * tierBenefits.repairCooldownMult);

    let now = Time.now();

    switch (stats.lastRecharged) {
      case (?lastTime) {
        let timeSince = now - lastTime;
        if (timeSince < RECHARGE_COOLDOWN) {
          let hoursLeft = (RECHARGE_COOLDOWN - timeSince) / (60 * 60 * 1_000_000_000);
          let minutesLeft = ((RECHARGE_COOLDOWN - timeSince) % (60 * 60 * 1_000_000_000)) / (60 * 1_000_000_000);
          return #err("Recharge cooldown active. Time remaining: " # Int.toText(hoursLeft) # "h " # Int.toText(minutesLeft) # "m");
        };
      };
      case (null) { /* First recharge, no cooldown */ };
    };

    switch (stats.lastRepaired) {
      case (?lastTime) {
        let timeSince = now - lastTime;
        if (timeSince < REPAIR_COOLDOWN) {
          let hoursLeft = (REPAIR_COOLDOWN - timeSince) / (60 * 60 * 1_000_000_000);
          let minutesLeft = ((REPAIR_COOLDOWN - timeSince) % (60 * 60 * 1_000_000_000)) / (60 * 1_000_000_000);
          return #err("Repair cooldown active. Time remaining: " # Int.toText(hoursLeft) # "h " # Int.toText(minutesLeft) # "m");
        };
      };
      case (null) { /* First repair, no cooldown */ };
    };

    // Process ICRC-2 payment for both operations (0.1 + 0.05 = 0.15 ICP)
    let RECHARGE_COST : Nat = 10_000_000; // 0.1 ICP
    let BASE_REPAIR_COST : Nat = 5_000_000; // 0.05 ICP
    let REPAIR_COST = Nat.max(1_000_000, Int.abs(Float.toInt(Float.fromInt(BASE_REPAIR_COST) * synergies.costMultipliers.repairCost)));
    let TOTAL_COST = RECHARGE_COST + REPAIR_COST;

    let ledgerId = switch (icpLedgerCanisterId) {
      case (?id) { id };
      case (null) { return #err("ICP Ledger not configured") };
    };

    let icpLedger = actor (Principal.toText(ledgerId)) : actor {
      icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
    };

    let transferResult = try {
      await icpLedger.icrc2_transfer_from({
        from = { owner = caller; subaccount = null };
        to = { owner = thisPrincipal; subaccount = null };
        amount = TOTAL_COST + TRANSFER_FEE;
        fee = ?TRANSFER_FEE;
        memo = null;
        created_at_time = null;
        spender_subaccount = null;
      });
    } catch (e) {
      return #err("Payment transfer failed: " # Error.message(e));
    };

    switch (transferResult) {
      case (#Err(e)) {
        let errorMsg = switch (e) {
          case (#InsufficientAllowance({ allowance })) {
            "Insufficient spending allowance. Current: " # Nat.toText(allowance / 100000000) # " ICP. Please go to the Garage page and set a spending allowance first.";
          };
          case _ { "Payment failed: " # debug_show (e) };
        };
        #err(errorMsg);
      };
      case (#Ok(_blockIndex)) {
        // Get fresh stats
        let freshStats = switch (garageManager.getStats(tokenIndex)) {
          case (null) { return #err("Bot not found in garage") };
          case (?s) { s };
        };

        // Apply recharge
        let totalRecharge = 75;
        let currentBattery = freshStats.battery;
        let currentCondition = freshStats.condition;
        let maxBattery = 100;

        let newBattery = Nat.min(maxBattery, currentBattery + totalRecharge);

        // Calculate overcharge
        let batteryDeficit = if (currentBattery >= 100) { 0 } else {
          100 - currentBattery;
        };
        let baseOvercharge = Float.fromInt(batteryDeficit) * 0.4;

        let conditionBonus = Float.fromInt(currentCondition) / 200.0;

        let seed = Int.abs(now) + tokenIndex;
        let randomHash = seed % 1000;
        let randomVariance = (Float.fromInt(randomHash) / 1000.0) * 0.4 - 0.2;

        let efficiency = 0.5 + conditionBonus + randomVariance;
        let finalOvercharge = baseOvercharge * efficiency;
        let newOvercharge = Nat.min(40, Int.abs(Float.toInt(finalOvercharge)));

        let overchargeAdded = if (newOvercharge >= freshStats.overcharge) {
          newOvercharge - freshStats.overcharge;
        } else { 0 };

        // Apply repair
        let newCondition = Nat.min(100, freshStats.condition + 30);

        // Check for Perfect Tune-Up using resonance system
        let hasOvercharge = newOvercharge > 0;
        let resonance = ResonanceSystem.calculateResonance(tokenIndex, #Repair, freshStats.condition, now);
        let perfectTuneUp = hasOvercharge and (resonance.inPeakZone or resonance.inGoodZone);

        // Keep overcharge regardless of Perfect Tune-Up
        // If Perfect Tune-Up: penalties removed, if not: penalties remain
        let finalOverchargeValue = newOvercharge;

        let updatedStats = {
          freshStats with
          battery = newBattery;
          condition = newCondition;
          overcharge = finalOverchargeValue;
          perfectTuneUp = perfectTuneUp;
          lastRecharged = ?now;
          lastRepaired = ?now;
        };

        garageManager.updateStats(tokenIndex, updatedStats);

        // Record dedication points for recharge and repair
        dedicationManager.recordRecharge(tokenIndex, RECHARGE_COST, now);
        dedicationManager.recordBatteryRestored(tokenIndex, newBattery - currentBattery, now);
        dedicationManager.recordRepair(tokenIndex, REPAIR_COST, now);
        dedicationManager.recordConditionRestored(tokenIndex, newCondition - currentCondition, now);

        // Build response message
        var message = "🔧 Full maintenance complete!\n";
        message := message # "⚡ Battery recharged to " # Nat.toText(newBattery) # "%";

        if (overchargeAdded > 0) {
          let speedBoost = Int.abs(Float.toInt(Float.fromInt(overchargeAdded) * 0.125));
          let stabilityPenalty = Int.abs(Float.toInt(Float.fromInt(overchargeAdded) * 0.083));
          message := message # "\n⚡ OVERCHARGE: +" # Nat.toText(overchargeAdded) # "% (+" # Nat.toText(speedBoost) # "% Speed/Accel, -" # Nat.toText(stabilityPenalty) # "% Stability/PowerCore for next race)";
        };

        message := message # "\n🔧 Condition restored to " # Nat.toText(newCondition) # "%";

        if (perfectTuneUp) {
          message := message # "\n⚡ PERFECT TUNE-UP! Speed boost WITHOUT penalties for next race!";
        };

        #ok(message);
      };
    };
  };

  /// Upgrade a bot stat (via ICRC-2 payment or parts)
  public shared ({ caller }) func web_upgrade_bot(
    tokenIndex : Nat,
    upgradeType : PokedBotsGarage.UpgradeType,
    paymentMethod : { #icp; #parts },
  ) : async Result.Result<Text, Text> {
    // Get current stats and verify registration
    let stats = switch (garageManager.getStats(tokenIndex)) {
      case (null) {
        return #err("Bot not registered. Use web_initialize_bot first.");
      };
      case (?s) { s };
    };

    // Verify caller is registered owner
    if (not Principal.equal(stats.ownerPrincipal, caller)) {
      return #err("You are not the registered owner. Use web_initialize_bot to register.");
    };

    let baseStats = garageManager.getBaseStats(tokenIndex);

    // Calculate current stats (base + bonuses)
    let currentSpeed = baseStats.speed + stats.speedBonus;
    let currentPowerCore = baseStats.powerCore + stats.powerCoreBonus;
    let currentAcceleration = baseStats.acceleration + stats.accelerationBonus;
    let currentStability = baseStats.stability + stats.stabilityBonus;
    let currentLuck = stats.luckBase + stats.luckBonus;
    let overallRating = (currentSpeed + currentPowerCore + currentAcceleration + currentStability) / 4;

    // Calculate current stat and base stat for the upgrade type
    let (baseStat, currentStat) = switch (upgradeType) {
      case (#Velocity) { (baseStats.speed, currentSpeed) };
      case (#PowerCore) { (baseStats.powerCore, currentPowerCore) };
      case (#Thruster) { (baseStats.acceleration, currentAcceleration) };
      case (#Gyro) { (baseStats.stability, currentStability) };
      case (#Luck) { (stats.luckBase, currentLuck) };
    };

    // Use V2 dynamic cost calculation with Game faction synergy and Bot Dedication tier discount
    let synergies = garageManager.calculateFactionSynergies(caller);
    let tierBenefits = dedicationManager.getBenefitsForBot(tokenIndex);
    let finalCostMultiplier = synergies.costMultipliers.upgradeCost * tierBenefits.upgradeDiscountMult;
    let icpCost = garageManager.calculateUpgradeCostV2(baseStat, currentStat, overallRating, finalCostMultiplier);
    let partsCost = icpCost / 1_000_000; // Convert e8s to parts (100 parts = 1 ICP, so 1 part = 0.01 ICP = 1_000_000 e8s)

    // Determine part type for parts payment/refund
    let partType : PokedBotsGarage.PartType = switch (upgradeType) {
      case (#Velocity) { #SpeedChip };
      case (#PowerCore) { #PowerCoreFragment };
      case (#Thruster) { #ThrusterKit };
      case (#Gyro) { #GyroModule };
      case (#Luck) { #UniversalPart };
    };

    // Process payment first
    let now = Time.now();
    var partsUsed : Nat = 0;

    switch (paymentMethod) {
      case (#icp) {
        // Process ICP payment via ICRC-2
        let ledgerId = switch (icpLedgerCanisterId) {
          case (?id) { id };
          case (null) { return #err("ICP Ledger not configured") };
        };

        let icpLedger = actor (Principal.toText(ledgerId)) : actor {
          icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
        };

        let transferResult = try {
          await icpLedger.icrc2_transfer_from({
            from = { owner = caller; subaccount = null };
            to = { owner = thisPrincipal; subaccount = null };
            amount = icpCost;
            fee = null;
            memo = null;
            created_at_time = null;
            spender_subaccount = null;
          });
        } catch (e) {
          return #err("Payment transfer failed: " # Error.message(e));
        };

        switch (transferResult) {
          case (#Err(e)) {
            let errorMsg = switch (e) {
              case (#InsufficientAllowance({ allowance })) {
                "Insufficient spending allowance. Current: " # Nat.toText(allowance / 100000000) # " ICP. Please go to the Garage page and set a spending allowance first.";
              };
              case _ { "Payment failed: " # debug_show (e) };
            };
            return #err(errorMsg);
          };
          case (#Ok(_blockIndex)) {
            // Record dedication points for ICP investment (only ICP payments, not parts)
            dedicationManager.recordUpgrade(tokenIndex, icpCost, now);
          };
        };
      };
      case (#parts) {
        // Deduct parts from inventory
        if (not garageManager.removeParts(caller, partType, partsCost)) {
          return #err("Insufficient parts. Needed: " # Nat.toText(partsCost) # " " # debug_show (partType));
        };
        partsUsed := partsCost;
      };
    };

    // Execute RNG immediately (instant upgrades)
    let attemptNumber = currentStat - baseStat;
    let pityCounter = garageManager.getPityCounter(tokenIndex);
    let successRate = garageManager.calculateSuccessRate(attemptNumber, pityCounter);

    // Generate RNG seed with proper hashing
    // Use multiple entropy sources combined with XOR for better mixing
    let timeNanos = Int.abs(now);
    let entropy = garageManager.getNextEntropy();
    // Combine sources with XOR and prime multipliers for better distribution
    let combined = garageManager.combineRNG(tokenIndex, timeNanos, entropy);
    let hashedSeed = garageManager.hashForRNG(combined);
    let seed = Nat32.fromNat(hashedSeed % 4_294_967_296);

    // Roll for success
    let roll = Nat32.toNat(seed % 100);
    let success = Float.fromInt(roll) < successRate;

    let upgradeTypeName = switch (upgradeType) {
      case (#Velocity) { "Speed" };
      case (#PowerCore) { "Power Core" };
      case (#Thruster) { "Acceleration" };
      case (#Gyro) { "Stability" };
      case (#Luck) { "Luck" };
    };

    let pityText = if (pityCounter > 0) {
      " (+" # Nat.toText(pityCounter * 5) # "% pity)";
    } else { "" };

    if (success) {
      // Success! Check for double points
      let doubleChance = Float.max(2.0, 15.0 - (Float.fromInt(attemptNumber) * 0.87));
      let doubleRoll = Nat32.toNat((seed / 100) % 100);
      let isDouble = Float.fromInt(doubleRoll) < doubleChance;
      let pointsAwarded = if (isDouble) { 2 } else { 1 };

      // Apply the stat boost
      let updatedStats = switch (upgradeType) {
        case (#Velocity) {
          {
            stats with speedBonus = stats.speedBonus + pointsAwarded;
            speedUpgrades = stats.speedUpgrades + 1;
            experience = stats.experience + 5;
            factionReputation = stats.factionReputation + 2;
            upgradeEndsAt = null;
            listedForSale = false;
          };
        };
        case (#PowerCore) {
          {
            stats with powerCoreBonus = stats.powerCoreBonus + pointsAwarded;
            powerCoreUpgrades = stats.powerCoreUpgrades + 1;
            experience = stats.experience + 5;
            factionReputation = stats.factionReputation + 2;
            upgradeEndsAt = null;
            listedForSale = false;
          };
        };
        case (#Thruster) {
          {
            stats with accelerationBonus = stats.accelerationBonus + pointsAwarded;
            accelerationUpgrades = stats.accelerationUpgrades + 1;
            experience = stats.experience + 5;
            factionReputation = stats.factionReputation + 2;
            upgradeEndsAt = null;
            listedForSale = false;
          };
        };
        case (#Gyro) {
          {
            stats with stabilityBonus = stats.stabilityBonus + pointsAwarded;
            stabilityUpgrades = stats.stabilityUpgrades + 1;
            experience = stats.experience + 10;
            factionReputation = stats.factionReputation + 3;
            upgradeEndsAt = null;
            listedForSale = false;
          };
        };
        case (#Luck) {
          {
            stats with luckBonus = stats.luckBonus + pointsAwarded;
            luckUpgrades = stats.luckUpgrades + 1;
            experience = stats.experience + 5;
            factionReputation = stats.factionReputation + 2;
            upgradeEndsAt = null;
            listedForSale = false;
          };
        };
      };

      garageManager.updateStats(tokenIndex, updatedStats);
      garageManager.setPityCounter(tokenIndex, 0); // Reset pity on success

      if (isDouble) {
        #ok("🎰 DOUBLE WIN! " # upgradeTypeName # " upgrade succeeded with +2 stat points! (Roll: " # Nat.toText(roll) # " < " # Float.format(#fix 1, successRate) # "%" # pityText # ")");
      } else {
        #ok("✅ SUCCESS! " # upgradeTypeName # " upgrade succeeded with +1 stat point! (Roll: " # Nat.toText(roll) # " < " # Float.format(#fix 1, successRate) # "%" # pityText # ")");
      };
    } else {
      // Failure! Refund 50% and increment pity counter
      let newPityCounter = Nat.min(pityCounter + 1, 5); // Cap at 5 (25% bonus)

      // Update stats without boost
      let updatedStats = {
        stats with upgradeEndsAt = null;
        listedForSale = false;
      };
      garageManager.updateStats(tokenIndex, updatedStats);
      garageManager.setPityCounter(tokenIndex, newPityCounter);

      // Handle 50% refund
      var refundMessage = "";
      switch (paymentMethod) {
        case (#icp) {
          let refundAmount = icpCost / 2;
          if (refundAmount > 0) {
            // Schedule refund via timer action
            ignore tt().setActionASync<system>(
              Int.abs(now + 1_000_000_000), // 1 second delay
              {
                actionType = "prize_distribution";
                params = to_candid ({
                  raceId = 0;
                  owner = caller;
                  amount = refundAmount;
                });
              },
              60_000_000_000,
            );
            refundMessage := Float.format(#fix 4, Float.fromInt(refundAmount) / 100_000_000.0) # " ICP";
          };
        };
        case (#parts) {
          let partsToRefund = partsUsed / 2;
          if (partsToRefund > 0) {
            garageManager.refundParts(caller, partType, partsToRefund);
            refundMessage := Nat.toText(partsToRefund) # " parts";
          };
        };
      };

      let pityBonus = newPityCounter * 5;
      #ok("❌ FAILED! " # upgradeTypeName # " upgrade failed. (Roll: " # Nat.toText(roll) # " >= " # Float.format(#fix 1, successRate) # "%" # pityText # "). Refunded 50%: " # refundMessage # ". Pity bonus now +" # Nat.toText(pityBonus) # "% for next attempt!");
    };
  };

  /// Cancel an in-progress upgrade (DEPRECATED - upgrades are now instant)
  /// Settle a legacy upgrade that was in progress when we switched to instant upgrades
  /// This runs the RNG and completes the upgrade for users who were mid-upgrade
  public shared ({ caller }) func web_cancel_upgrade(
    tokenIndex : Nat
  ) : async Result.Result<Text, Text> {
    // Check if there's an active upgrade to settle
    switch (garageManager.getActiveUpgrade(tokenIndex)) {
      case (null) {
        // No legacy upgrade - return the normal message
        return #ok("⚡ Upgrades now complete instantly! There is nothing to settle. Use web_upgrade_bot to upgrade your PokedBot and get immediate results.");
      };
      case (?session) {
        // Found a legacy upgrade! Settle it now by running the RNG

        // Verify caller is the owner
        let stats = switch (garageManager.getStats(tokenIndex)) {
          case (null) { return #err("Bot not registered") };
          case (?s) { s };
        };

        if (not Principal.equal(stats.ownerPrincipal, caller)) {
          return #err("You are not the registered owner of this bot.");
        };

        // Get current stats for calculation
        let currentStats = garageManager.getCurrentStats(stats);

        let (currentStatValue, _upgradeCount) = switch (session.upgradeType) {
          case (#Velocity) { (currentStats.speed, stats.speedUpgrades) };
          case (#PowerCore) {
            (currentStats.powerCore, stats.powerCoreUpgrades);
          };
          case (#Thruster) {
            (currentStats.acceleration, stats.accelerationUpgrades);
          };
          case (#Gyro) { (currentStats.stability, stats.stabilityUpgrades) };
          case (#Luck) {
            (stats.luckBase + stats.luckBonus, stats.luckUpgrades);
          };
        };

        // Get base stat for attempt calculation
        let baseStat = switch (session.upgradeType) {
          case (#Velocity) { currentStats.speed - stats.speedBonus };
          case (#PowerCore) { currentStats.powerCore - stats.powerCoreBonus };
          case (#Thruster) {
            currentStats.acceleration - stats.accelerationBonus;
          };
          case (#Gyro) { currentStats.stability - stats.stabilityBonus };
          case (#Luck) { stats.luckBase };
        };

        let attemptNumber = currentStatValue - baseStat;

        // Calculate success rate with pity
        let successRate = garageManager.calculateSuccessRate(attemptNumber, session.consecutiveFails);

        // Generate RNG with XOR-based combination
        let timeNanos = Int.abs(Time.now());
        let entropy = garageManager.getNextEntropy();
        let combined = garageManager.combineRNG(tokenIndex, timeNanos, entropy);
        let hashedSeed = garageManager.hashForRNG(combined);
        let seed = Nat32.fromNat(hashedSeed % 4_294_967_296);

        let roll = Nat32.toNat(seed % 100);
        let success = Float.fromInt(roll) < successRate;

        let upgradeTypeName = switch (session.upgradeType) {
          case (#Velocity) { "Speed" };
          case (#PowerCore) { "Power Core" };
          case (#Thruster) { "Acceleration" };
          case (#Gyro) { "Stability" };
          case (#Luck) { "Luck" };
        };

        if (success) {
          // Success! Check for double points
          let doubleChance = 15.0 - (Float.fromInt(attemptNumber) * 0.87);
          let doubleRoll = Nat32.toNat((seed / 100) % 100);
          let isDouble = Float.fromInt(doubleRoll) < Float.max(2.0, doubleChance);
          let pointsAwarded = if (isDouble) { 2 } else { 1 };

          // Apply the stat boost
          let updatedStats = switch (session.upgradeType) {
            case (#Velocity) {
              {
                stats with speedBonus = stats.speedBonus + pointsAwarded;
                speedUpgrades = stats.speedUpgrades + 1;
                upgradeEndsAt = null;
                listedForSale = false;
              };
            };
            case (#PowerCore) {
              {
                stats with powerCoreBonus = stats.powerCoreBonus + pointsAwarded;
                powerCoreUpgrades = stats.powerCoreUpgrades + 1;
                upgradeEndsAt = null;
                listedForSale = false;
              };
            };
            case (#Thruster) {
              {
                stats with accelerationBonus = stats.accelerationBonus + pointsAwarded;
                accelerationUpgrades = stats.accelerationUpgrades + 1;
                upgradeEndsAt = null;
                listedForSale = false;
              };
            };
            case (#Gyro) {
              {
                stats with stabilityBonus = stats.stabilityBonus + pointsAwarded;
                stabilityUpgrades = stats.stabilityUpgrades + 1;
                upgradeEndsAt = null;
                listedForSale = false;
              };
            };
            case (#Luck) {
              {
                stats with luckBonus = stats.luckBonus + pointsAwarded;
                luckUpgrades = stats.luckUpgrades + 1;
                upgradeEndsAt = null;
                listedForSale = false;
              };
            };
          };

          garageManager.updateStats(tokenIndex, updatedStats);
          garageManager.clearUpgrade(tokenIndex);
          garageManager.setPityCounter(tokenIndex, 0);

          let doubleText = if (isDouble) { " 🎰 DOUBLE LOTTERY!" } else { "" };
          return #ok("✅ LEGACY UPGRADE SETTLED - SUCCESS! Your " # upgradeTypeName # " upgrade succeeded with +" # Nat.toText(pointsAwarded) # " stat point!" # doubleText # " (Roll: " # Nat.toText(roll) # " < " # Float.format(#fix 1, successRate) # "%)");
        } else {
          // Failure - refund 50%
          let newPityCounter = session.consecutiveFails + 1;

          let updatedStats = {
            stats with upgradeEndsAt = null;
            listedForSale = false;
          };
          garageManager.updateStats(tokenIndex, updatedStats);
          garageManager.setPityCounter(tokenIndex, newPityCounter);
          garageManager.clearUpgrade(tokenIndex);

          // Refund based on payment method
          let refundMessage = if (session.paymentMethod == "icp") {
            let refundAmount = session.costPaid / 2;
            if (refundAmount > 0) {
              // Schedule ICP refund via timer
              ignore tt().setActionASync<system>(
                Int.abs(Time.now() + 1_000_000_000),
                {
                  actionType = "prize_distribution";
                  params = to_candid ({
                    raceId = 0;
                    owner = stats.ownerPrincipal;
                    amount = refundAmount;
                  });
                },
                PRIZE_DISTRIBUTION_TIMEOUT,
              );
            };
            Nat.toText(refundAmount / 100_000_000) # "." # Nat.toText((refundAmount % 100_000_000) / 10_000_000) # " ICP";
          } else {
            let partsToRefund = session.partsUsed / 2;
            if (partsToRefund > 0) {
              let partType : PokedBotsGarage.PartType = switch (session.upgradeType) {
                case (#Velocity) { #SpeedChip };
                case (#PowerCore) { #PowerCoreFragment };
                case (#Thruster) { #ThrusterKit };
                case (#Gyro) { #GyroModule };
                case (#Luck) { #UniversalPart };
              };
              garageManager.refundParts(stats.ownerPrincipal, partType, partsToRefund);
            };
            Nat.toText(partsToRefund) # " parts";
          };

          let pityBonus = newPityCounter * 5;
          return #ok("❌ LEGACY UPGRADE SETTLED - FAILED. Your " # upgradeTypeName # " upgrade failed. (Roll: " # Nat.toText(roll) # " >= " # Float.format(#fix 1, successRate) # "%). Refunded 50%: " # refundMessage # ". Pity bonus now +" # Nat.toText(pityBonus) # "% for next attempt!");
        };
      };
    };
  };

  /// Respec a bot - reset selected stat upgrades and refund parts (with penalty)
  /// Cost: FREE
  /// statsToStrip: Array of stat names to reset (["speed", "powerCore", "acceleration", "stability"])
  /// Empty array strips all stats (backward compatible)
  public shared ({ caller }) func web_respec_bot(
    tokenIndex : Nat,
    statsToStrip : [Text],
  ) : async Result.Result<{ speedPartsRefunded : Nat; powerCorePartsRefunded : Nat; accelerationPartsRefunded : Nat; stabilityPartsRefunded : Nat; totalRefunded : Nat; respecCost : Nat }, Text> {
    // Get current stats and verify registration
    let stats = switch (garageManager.getStats(tokenIndex)) {
      case (null) {
        return #err("Bot not registered. Use web_initialize_bot first.");
      };
      case (?s) { s };
    };

    // Verify caller is registered owner
    if (not Principal.equal(stats.ownerPrincipal, caller)) {
      return #err("You are not the registered owner. Use web_initialize_bot to register.");
    };

    // Calculate total stat points being stripped
    let totalStatPoints = garageManager.calculateStatsToStrip(tokenIndex, statsToStrip);
    if (totalStatPoints == 0) {
      return #err("No stat points to strip in selected stats");
    };

    // Process respec (FREE - no payment required)
    switch (garageManager.respecBot(tokenIndex, caller, statsToStrip)) {
      case (#err(msg)) { #err(msg) };
      case (#ok(result)) {
        #ok({
          speedPartsRefunded = result.speedPartsRefunded;
          powerCorePartsRefunded = result.powerCorePartsRefunded;
          accelerationPartsRefunded = result.accelerationPartsRefunded;
          stabilityPartsRefunded = result.stabilityPartsRefunded;
          totalRefunded = result.totalRefunded;
          respecCost = 0;
        });
      };
    };
  };

  /// Enter a race (with ICRC-2 payment for entry fee)
  public shared ({ caller }) func web_enter_race(
    raceId : Nat,
    tokenIndex : Nat,
  ) : async Result.Result<Text, Text> {
    // Get bot stats and verify registration (done below)
    // Registration check happens after we get race and bot stats

    // Verify bot is initialized and registered to current owner
    let botStats = switch (garageManager.getStats(tokenIndex)) {
      case (null) {
        return #err("This PokedBot is not initialized for racing. Use garage_initialize_pokedbot first to register it.");
      };
      case (?stats) {
        // Verify caller is the registered owner
        if (not Principal.equal(stats.ownerPrincipal, caller)) {
          return #err("This PokedBot is registered to a different owner. Please use garage_initialize_pokedbot to register it to your account.");
        };
        stats;
      };
    };

    // Get race and verify it exists
    let race = switch (Map.get(stable_races, Map.nhash, raceId)) {
      case (?r) { r };
      case (null) { return #err("Race not found") };
    };

    // Check if bot meets rating requirements for race class
    let rating = garageManager.calculateRatingAt100(botStats);
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
      return #err("Bot does not meet race class requirements (Rating: " # Nat.toText(rating) # ")");
    };

    // Check if registration is open for this race's event
    let now = Time.now();
    switch (eventCalendar.getEventByRaceId(raceId)) {
      case (?event) {
        // Check if registration window is open
        if (now < event.registrationOpens) {
          let hoursUntilOpen = (event.registrationOpens - now) / (60 * 60 * 1_000_000_000);
          return #err("Registration has not opened yet. Opens in " # Nat.toText(Int.abs(hoursUntilOpen)) # " hours.");
        };
        if (now > event.registrationCloses) {
          return #err("Registration has closed for this event.");
        };
      };
      case (null) {
        // Race not part of an event - allow entry (shouldn't happen normally)
      };
    };

    // Check if bot is already entered in any race within this event BEFORE taking payment
    let nftId = Nat.toText(tokenIndex);
    switch (eventCalendar.getEventByRaceId(raceId)) {
      case (?event) {
        // Check if bot is in any race within this event
        for (eventRaceId in event.raceIds.vals()) {
          switch (Map.get(stable_races, Map.nhash, eventRaceId)) {
            case (?eventRace) {
              for (entry in eventRace.entries.vals()) {
                if (entry.nftId == nftId) {
                  return #err("This bot is already entered in another race in this event (Race #" # Nat.toText(eventRaceId) # ")");
                };
              };
            };
            case (null) {};
          };
        };
      };
      case (null) {}; // No event, allow entry
    };

    // Process entry fee via ICRC-2
    let ledgerId = switch (icpLedgerCanisterId) {
      case (?id) { id };
      case (null) { return #err("ICP Ledger not configured") };
    };

    let icpLedger = actor (Principal.toText(ledgerId)) : actor {
      icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
    };

    let transferResult = try {
      await icpLedger.icrc2_transfer_from({
        from = { owner = caller; subaccount = null };
        to = { owner = thisPrincipal; subaccount = null };
        amount = race.entryFee;
        fee = null;
        memo = null;
        created_at_time = null;
        spender_subaccount = null;
      });
    } catch (e) {
      return #err("Payment transfer failed: " # Error.message(e));
    };

    switch (transferResult) {
      case (#Err(err)) {
        #err("Entry fee payment failed: " # debug_show (err));
      };
      case (#Ok(_blockIndex)) {
        // Enter the race
        let now = Time.now();
        let nftId = Nat.toText(tokenIndex); // Store token index as text, not EXT identifier
        switch (raceManager.enterRace(raceId, nftId, caller, now)) {
          case (?_updatedRace) {
            // Record dedication points for race entry fee
            dedicationManager.recordRaceEntry(tokenIndex, race.entryFee, now);
            #ok("Successfully entered race!");
          };
          case (null) {
            #err("Failed to enter race - bot may already be entered, race may be full, or race is closed");
          };
        };
      };
    };
  };

  /// Register a bot for an event (with ICRC-2 payment for entry fee)
  public shared ({ caller }) func register_for_event(
    eventId : Nat,
    tokenIndex : Nat,
  ) : async Result.Result<Text, Text> {
    // Get event
    let event = switch (eventCalendar.getEvent(eventId)) {
      case (null) { return #err("Event not found") };
      case (?e) { e };
    };

    let now = Time.now();

    // Check registration window
    if (now < event.registrationOpens) {
      return #err("Registration has not opened yet");
    };
    if (now > event.registrationCloses) {
      return #err("Registration has closed for this event");
    };

    // Get bot stats and verify ownership
    let botStats = switch (garageManager.getStats(tokenIndex)) {
      case (null) {
        return #err("This PokedBot is not initialized for racing");
      };
      case (?stats) {
        if (not Principal.equal(stats.ownerPrincipal, caller)) {
          return #err("This PokedBot is registered to a different owner");
        };
        stats;
      };
    };

    // Check visibility/access restrictions (ELO, faction, etc.)
    switch (event.visibility) {
      case (#Public) {}; // Anyone can register
      case (#Private) {
        // Private events are handled by RaceCalendar.registerForEvent
      };
      case (#Restricted(rules)) {
        // Check ELO restrictions
        let botElo = botStats.eloRating;
        switch (rules.minElo) {
          case (?minElo) {
            if (botElo < minElo) {
              return #err("Bot ELO (" # Nat.toText(botElo) # ") is below the minimum required (" # Nat.toText(minElo) # ")");
            };
          };
          case (null) {};
        };
        switch (rules.maxElo) {
          case (?maxElo) {
            if (botElo > maxElo) {
              return #err("Bot ELO (" # Nat.toText(botElo) # ") is above the maximum allowed (" # Nat.toText(maxElo) # ")");
            };
          };
          case (null) {};
        };
        // Check faction restriction
        switch (rules.requiredFaction) {
          case (?requiredFaction) {
            let botFaction = switch (botStats.faction) {
              case (#UltimateMaster) { "UltimateMaster" };
              case (#Wild) { "Wild" };
              case (#Golden) { "Golden" };
              case (#Ultimate) { "Ultimate" };
              case (#Blackhole) { "Blackhole" };
              case (#Dead) { "Dead" };
              case (#Master) { "Master" };
              case (#Bee) { "Bee" };
              case (#Food) { "Food" };
              case (#Box) { "Box" };
              case (#Murder) { "Murder" };
              case (#Game) { "Game" };
              case (#Animal) { "Animal" };
              case (#Industrial) { "Industrial" };
            };
            if (botFaction != requiredFaction) {
              return #err("This event requires faction '" # requiredFaction # "' but your bot is '" # botFaction # "'");
            };
          };
          case (null) {};
        };
        // Note: allowedBots and allowedPlayers are checked in RaceCalendar.registerForEvent
      };
    };

    // Calculate overall rating and determine race class
    // Use MAX stats (base + upgrades) NOT current stats (which have battery/condition penalties)
    // This ensures bots are always placed in their proper tier regardless of current condition
    let baseStats = garageManager.getBaseStats(tokenIndex);
    let maxStats = {
      speed = baseStats.speed + botStats.speedBonus;
      powerCore = baseStats.powerCore + botStats.powerCoreBonus;
      acceleration = baseStats.acceleration + botStats.accelerationBonus;
      stability = baseStats.stability + botStats.stabilityBonus;
    };
    let overallRating = (maxStats.speed + maxStats.powerCore + maxStats.acceleration + maxStats.stability) / 4;

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

    // Check if bot's class is allowed in this event
    let classAllowed = Array.find<RaceCalendar.RaceClass>(
      event.metadata.divisions,
      func(c) { c == raceClass },
    );
    switch (classAllowed) {
      case (null) {
        let className = switch (raceClass) {
          case (#Scrap) { "Scrap" };
          case (#Junker) { "Junker" };
          case (#Raider) { "Raider" };
          case (#Elite) { "Elite" };
          case (#SilentKlan) { "Silent Klan" };
        };
        let allowedClasses = Array.map<RaceCalendar.RaceClass, Text>(
          event.metadata.divisions,
          func(c) {
            switch (c) {
              case (#Scrap) { "Scrap" };
              case (#Junker) { "Junker" };
              case (#Raider) { "Raider" };
              case (#Elite) { "Elite" };
              case (#SilentKlan) { "Silent Klan" };
            };
          },
        );
        let allowedClassesStr = Text.join(", ", allowedClasses.vals());
        return #err("This bot's class (" # className # ") is not allowed in this event. Allowed classes: " # allowedClassesStr);
      };
      case (?_) {}; // Class is allowed
    };

    // Check if bot is already entered in any race within this event BEFORE taking payment
    let nftId = Nat.toText(tokenIndex);
    for (eventRaceId in event.raceIds.vals()) {
      switch (Map.get(stable_races, Map.nhash, eventRaceId)) {
        case (?eventRace) {
          for (entry in eventRace.entries.vals()) {
            if (entry.nftId == nftId) {
              return #err("This bot is already entered in another race in this event (Race #" # Nat.toText(eventRaceId) # ")");
            };
          };
        };
        case (null) {};
      };
    };

    // Check if bot is registered for another event with conflicting race times
    switch (eventCalendar.getConflictingEventForBot(eventId, tokenIndex, event.scheduledTime, event.raceCreationMode)) {
      case (?conflictingEvent) {
        let conflictName = conflictingEvent.metadata.name;
        return #err("This bot is already registered for \"" # conflictName # "\" which has a race at a conflicting time");
      };
      case (null) {}; // No conflict
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

    // Process ICRC-2 payment
    let userAccount = { owner = caller; subaccount = null };

    let ledgerId = switch (icpLedgerCanisterId) {
      case (?id) { id };
      case (null) { return #err("ICP Ledger not configured") };
    };

    let icpLedger = actor (Principal.toText(ledgerId)) : actor {
      icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
    };

    try {
      let transferFromArgs = {
        spender_subaccount = null;
        from = userAccount;
        to = {
          owner = Principal.fromActor(self);
          subaccount = null;
        };
        amount = adjustedEntryFee;
        fee = ?10000;
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
            case (#InsufficientAllowance { allowance }) {
              "Insufficient allowance: " # Nat.toText(allowance) # " e8s. Please approve the racing canister first.";
            };
            case (_) { "Payment failed" };
          };
          return #err(errorMsg);
        };
        case (#Ok(_blockIndex)) {
          // Payment successful, register for event
          switch (eventCalendar.registerForEvent(eventId, tokenIndex, caller, raceClass, adjustedEntryFee, now)) {
            case (#err(msg)) {
              // Registration failed - refund the payment
              let refundLedger = actor (Principal.toText(ledgerId)) : actor {
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
                  to = { owner = caller; subaccount = null };
                  amount = refundAmount;
                  fee = ?TRANSFER_FEE;
                  memo = null;
                  created_at_time = null;
                });

                switch (refundResult) {
                  case (#Ok(_)) {
                    return #err("Registration failed (refunded " # Nat.toText(refundAmount) # " e8s): " # msg);
                  };
                  case (#Err(refundErr)) {
                    // Critical: Payment taken but refund failed
                    Debug.print("CRITICAL: Failed to refund " # Nat.toText(refundAmount) # " e8s to " # Principal.toText(caller) # " for event " # Nat.toText(eventId) # ": " # debug_show (refundErr));
                    return #err("Registration failed AND refund failed. Please contact support. Event ID: " # Nat.toText(eventId) # ", Amount: " # Nat.toText(adjustedEntryFee) # " e8s");
                  };
                };
              } catch (refundError) {
                // Critical: Payment taken but refund failed
                Debug.print("CRITICAL: Refund transfer threw error for " # Principal.toText(caller) # " event " # Nat.toText(eventId) # ": " # Error.message(refundError));
                return #err("Registration failed AND refund failed. Please contact support. Event ID: " # Nat.toText(eventId) # ", Amount: " # Nat.toText(adjustedEntryFee) # " e8s");
              };
            };
            case (#ok(_registration)) {
              // Event entry fees do NOT count towards dedication points
              // (only direct investment in upgrades/initialization counts)

              return #ok("Successfully registered for event!");
            };
          };
        };
      };
    } catch (e) {
      return #err("Payment failed: " # Error.message(e));
    };
  };

  /// Unregister from an event and get a refund based on timing
  public shared ({ caller }) func unregister_from_event(
    eventId : Nat,
    tokenIndex : Nat,
  ) : async Result.Result<{ refundAmount : Nat; penalty : Nat }, Text> {
    // Get event
    let event = switch (eventCalendar.getEvent(eventId)) {
      case (null) { return #err("Event not found") };
      case (?e) { e };
    };

    let now = Time.now();

    // Can't unregister after registration closes
    if (now > event.registrationCloses) {
      return #err("Cannot unregister after registration closes");
    };

    // Verify ownership of bot
    let _botStats = switch (garageManager.getStats(tokenIndex)) {
      case (null) { return #err("Bot not found") };
      case (?stats) {
        if (not Principal.equal(stats.ownerPrincipal, caller)) {
          return #err("This PokedBot is registered to a different owner");
        };
        stats;
      };
    };

    // Find registration to get entry fee paid
    let registration = switch (
      Array.find<RaceCalendar.EventRegistration>(
        event.registrations,
        func(r : RaceCalendar.EventRegistration) : Bool {
          r.tokenIndex == tokenIndex and r.owner == caller
        },
      )
    ) {
      case (null) { return #err("Bot is not registered for this event") };
      case (?reg) { reg };
    };

    let entryFeePaid = registration.entryFeePaid;

    // Unregister from event
    switch (eventCalendar.unregisterFromEvent(eventId, tokenIndex, caller, now)) {
      case (#err(msg)) {
        return #err(msg);
      };
      case (#ok(refundAmount)) {
        let penalty = entryFeePaid - refundAmount;

        // Process refund if any
        if (refundAmount > 0) {
          let ledgerId = switch (icpLedgerCanisterId) {
            case (?id) { id };
            case (null) { return #err("ICP Ledger not configured") };
          };

          let icpLedger = actor (Principal.toText(ledgerId)) : actor {
            icrc1_transfer : shared IcpLedger.TransferArg -> async IcpLedger.Result;
          };

          try {
            let transferArgs : IcpLedger.TransferArg = {
              to = { owner = caller; subaccount = null };
              amount = refundAmount;
              fee = null;
              memo = null;
              from_subaccount = null;
              created_at_time = ?Nat64.fromNat(Int.abs(now));
            };

            let _result = await icpLedger.icrc1_transfer(transferArgs);
            // Note: We don't fail the unregistration if refund fails
          } catch (_e) {
            // Refund failed but unregistration succeeded
          };
        };

        return #ok({ refundAmount = refundAmount; penalty = penalty });
      };
    };
  };

  /// Start a scavenging mission (web method)
  public shared ({ caller }) func web_start_scavenging(
    tokenIndex : Nat,
    zone : Text,
    durationMinutes : ?Nat,
  ) : async Result.Result<Text, Text> {
    // Get stats and verify registration
    let stats = switch (garageManager.getStats(tokenIndex)) {
      case (null) {
        return #err("Bot not registered. Use web_initialize_bot first.");
      };
      case (?s) { s };
    };

    // Verify caller is registered owner
    if (not Principal.equal(stats.ownerPrincipal, caller)) {
      return #err("You are not the registered owner. Use web_initialize_bot to register.");
    };

    // Parse zone
    let parsedZone : PokedBotsGarage.ScavengingZone = switch (zone) {
      case ("ScrapHeaps") { #ScrapHeaps };
      case ("AbandonedSettlements") { #AbandonedSettlements };
      case ("DeadMachineFields") { #DeadMachineFields };
      case ("RepairBay") { #RepairBay };
      case ("ChargingStation") { #ChargingStation };
      case (_) {
        return #err("Invalid zone. Must be ScrapHeaps, AbandonedSettlements, DeadMachineFields, RepairBay, or ChargingStation");
      };
    };

    // Start mission
    let now = Time.now();
    switch (garageManager.startScavengingMission(tokenIndex, parsedZone, now, durationMinutes)) {
      case (#ok(_)) {
        let message = switch (durationMinutes) {
          case (?minutes) {
            "Scavenging started for " # Nat.toText(minutes) # " minutes. Retrieve bot anytime with web_complete_scavenging.";
          };
          case (null) {
            "Continuous scavenging started! Retrieve anytime with web_complete_scavenging.";
          };
        };
        #ok(message);
      };
      case (#err(msg)) {
        #err(msg);
      };
    };
  };

  /// Complete a scavenging mission and collect rewards (web method)
  public shared ({ caller }) func web_complete_scavenging(
    tokenIndex : Nat
  ) : async Result.Result<Text, Text> {
    // Get stats and verify registration
    let stats = switch (garageManager.getStats(tokenIndex)) {
      case (null) {
        return #err("Bot not registered. Use web_initialize_bot first.");
      };
      case (?s) { s };
    };

    // Verify caller is registered owner
    if (not Principal.equal(stats.ownerPrincipal, caller)) {
      return #err("You are not the registered owner. Use web_initialize_bot to register.");
    };

    // Complete mission (forces final accumulation)
    let now = Time.now();
    Debug.print("web_complete_scavenging called for bot " # debug_show (tokenIndex));

    switch (garageManager.completeScavengingMissionV2(tokenIndex, now)) {
      case (#ok(result)) {
        Debug.print("web_complete_scavenging SUCCESS for bot " # debug_show (tokenIndex) # ": " # debug_show (result.totalParts) # " parts");

        // Record scavenging completion for dedication points
        dedicationManager.recordScavengingCompletion(tokenIndex, result.totalParts, now);

        // Verify lastMissionRewards was stored
        switch (garageManager.getStats(tokenIndex)) {
          case (?stats) {
            Debug.print("Verified stats for bot " # debug_show (tokenIndex) # ", lastMissionRewards: " # debug_show (stats.lastMissionRewards));
          };
          case (null) {
            Debug.print("WARNING: Could not retrieve stats after completing mission for bot " # debug_show (tokenIndex));
          };
        };

        var message = "Mission complete! Time elapsed: " # Nat.toText(result.hoursOut) # " hours\n";
        message #= "Total parts collected: " # Nat.toText(result.totalParts) # "\n\n";
        message #= "• Speed Chips: " # Nat.toText(result.speedChips) # "\n";
        message #= "• Power Core Fragments: " # Nat.toText(result.powerCoreFragments) # "\n";
        message #= "• Thruster Kits: " # Nat.toText(result.thrusterKits) # "\n";
        message #= "• Gyro Modules: " # Nat.toText(result.gyroModules) # "\n";
        message #= "• Universal Parts: " # Nat.toText(result.universalParts);

        #ok(message);
      };
      case (#err(msg)) {
        #err(msg);
      };
    };
  };

  /// Batch complete scavenging missions for multiple bots
  public shared ({ caller }) func web_batch_complete_scavenging(
    tokenIndices : [Nat]
  ) : async [{ tokenIndex : Nat; result : Result.Result<Text, Text> }] {
    let now = Time.now();
    let results = Buffer.Buffer<{ tokenIndex : Nat; result : Result.Result<Text, Text> }>(tokenIndices.size());

    for (tokenIndex in tokenIndices.vals()) {
      // Verify registration
      let verifyResult : Result.Result<Text, Text> = switch (garageManager.getStats(tokenIndex)) {
        case (null) { #err("Not registered") };
        case (?stats) {
          if (not Principal.equal(stats.ownerPrincipal, caller)) {
            #err("Not owner");
          } else {
            // Complete mission
            switch (garageManager.completeScavengingMissionV2(tokenIndex, now)) {
              case (#ok(result)) {
                // Record scavenging completion for dedication points
                dedicationManager.recordScavengingCompletion(tokenIndex, result.totalParts, now);
                #ok("Collected " # Nat.toText(result.totalParts) # " parts in " # Nat.toText(result.hoursOut) # "h");
              };
              case (#err(msg)) { #err(msg) };
            };
          };
        };
      };
      results.add({ tokenIndex = tokenIndex; result = verifyResult });
    };

    Buffer.toArray(results);
  };

  /// Batch start scavenging missions for multiple bots
  public shared ({ caller }) func web_batch_start_scavenging(
    tokenIndices : [Nat],
    zone : Text,
    durationMinutes : ?Nat,
  ) : async [{ tokenIndex : Nat; result : Result.Result<Text, Text> }] {
    let now = Time.now();
    let results = Buffer.Buffer<{ tokenIndex : Nat; result : Result.Result<Text, Text> }>(tokenIndices.size());

    // Parse zone once
    let parsedZone : PokedBotsGarage.ScavengingZone = switch (zone) {
      case ("ScrapHeaps") { #ScrapHeaps };
      case ("AbandonedSettlements") { #AbandonedSettlements };
      case ("DeadMachineFields") { #DeadMachineFields };
      case ("RepairBay") { #RepairBay };
      case ("ChargingStation") { #ChargingStation };
      case (_) {
        // Invalid zone - fail all
        for (tokenIndex in tokenIndices.vals()) {
          results.add({ tokenIndex = tokenIndex; result = #err("Invalid zone") });
        };
        return Buffer.toArray(results);
      };
    };

    for (tokenIndex in tokenIndices.vals()) {
      // Verify registration
      let verifyResult : Result.Result<Text, Text> = switch (garageManager.getStats(tokenIndex)) {
        case (null) { #err("Not registered") };
        case (?stats) {
          if (not Principal.equal(stats.ownerPrincipal, caller)) {
            #err("Not owner");
          } else {
            // Start mission
            switch (garageManager.startScavengingMission(tokenIndex, parsedZone, now, durationMinutes)) {
              case (#ok(_)) {
                #ok("Started");
              };
              case (#err(msg)) { #err(msg) };
            };
          };
        };
      };
      results.add({ tokenIndex = tokenIndex; result = verifyResult });
    };

    Buffer.toArray(results);
  };

  /// Batch recharge multiple bots (0.1 ICP each + fees via ICRC-2)
  public shared ({ caller }) func web_batch_recharge_bots(
    tokenIndices : [Nat]
  ) : async [{ tokenIndex : Nat; result : Result.Result<Text, Text> }] {
    let now = Time.now();
    let results = Buffer.Buffer<{ tokenIndex : Nat; result : Result.Result<Text, Text> }>(tokenIndices.size());
    let RECHARGE_COST : Nat = 10_000_000; // 0.1 ICP
    let BASE_RECHARGE_COOLDOWN : Int = 21600000000000; // 6 hours
    let synergies = garageManager.calculateFactionSynergies(caller);
    let RECHARGE_COOLDOWN = Float.toInt(Float.fromInt(BASE_RECHARGE_COOLDOWN) * synergies.costMultipliers.rechargeCooldown);

    // Calculate total cost
    let totalCost = (RECHARGE_COST + TRANSFER_FEE) * tokenIndices.size();

    // Process single ICRC-2 payment for all bots
    let ledgerId = switch (icpLedgerCanisterId) {
      case (?id) { id };
      case (null) {
        // Fail all if ledger not configured
        for (tokenIndex in tokenIndices.vals()) {
          results.add({
            tokenIndex = tokenIndex;
            result = #err("Ledger not configured");
          });
        };
        return Buffer.toArray(results);
      };
    };

    let icpLedger = actor (Principal.toText(ledgerId)) : actor {
      icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
    };

    let transferResult = try {
      await icpLedger.icrc2_transfer_from({
        from = { owner = caller; subaccount = null };
        to = { owner = thisPrincipal; subaccount = null };
        amount = totalCost;
        fee = ?TRANSFER_FEE;
        memo = null;
        created_at_time = null;
        spender_subaccount = null;
      });
    } catch (_) {
      // Fail all if payment fails
      for (tokenIndex in tokenIndices.vals()) {
        results.add({ tokenIndex = tokenIndex; result = #err("Payment failed") });
      };
      return Buffer.toArray(results);
    };

    // Check payment result
    switch (transferResult) {
      case (#Err(transferError)) {
        let errorMsg = switch (transferError) {
          case (#InsufficientFunds { balance }) { "Insufficient ICP" };
          case (#InsufficientAllowance { allowance }) {
            "Insufficient allowance";
          };
          case _ { "Payment failed" };
        };
        for (tokenIndex in tokenIndices.vals()) {
          results.add({ tokenIndex = tokenIndex; result = #err(errorMsg) });
        };
        return Buffer.toArray(results);
      };
      case (#Ok(_blockIndex)) {
        // Payment successful - process each bot
        for (tokenIndex in tokenIndices.vals()) {
          let botResult : Result.Result<Text, Text> = switch (garageManager.getStats(tokenIndex)) {
            case (null) { #err("Not registered") };
            case (?stats) {
              if (not Principal.equal(stats.ownerPrincipal, caller)) {
                #err("Not owner");
              } else if (Option.isSome(stats.activeMission)) {
                #err("On mission");
              } else {
                // Check cooldown - apply bot-specific dedication bonus
                let tierBenefits = dedicationManager.getBenefitsForBot(tokenIndex);
                let botRechargeCooldown = Float.toInt(Float.fromInt(RECHARGE_COOLDOWN) * tierBenefits.rechargeCooldownMult);
                let onCooldown = switch (stats.lastRecharged) {
                  case (?lastTime) { (now - lastTime) < botRechargeCooldown };
                  case (null) { false };
                };
                if (onCooldown) {
                  #err("On cooldown");
                } else {
                  // Recharge - manually update stats (matches web_recharge_bot logic)
                  let currentBattery = stats.battery;
                  let currentCondition = stats.condition;

                  // Generate pseudo-random values with XOR-based combination
                  let entropy = garageManager.getNextEntropy();
                  let combined = garageManager.combineRNG(tokenIndex, Int.abs(now), entropy);
                  let seed = garageManager.hashForRNG(combined);
                  let randomHash1 = seed % 1000;
                  let randomHash2 = garageManager.hashForRNG(seed * 7919) % 1000;

                  // BATTERY RECHARGE: 50-90 range (base 70 ± 20)
                  let batteryRNG = (Float.fromInt(randomHash2) / 1000.0) * 40.0 - 20.0;
                  let totalRecharge = Int.abs(Float.toInt(70.0 + batteryRNG));
                  let newBattery = Nat.min(100, currentBattery + totalRecharge);

                  // ===== RESONANCE SYSTEM FOR OVERCHARGE =====
                  let resonance = ResonanceSystem.calculateResonance(tokenIndex, #Recharge, currentBattery, now);

                  let batteryDeficit = if (currentBattery >= 100) { 0 } else {
                    100 - currentBattery;
                  };
                  let baseOvercharge = Float.fromInt(batteryDeficit) * 0.4;

                  // Condition affects efficiency with some randomness
                  let conditionBonus = Float.fromInt(currentCondition) / 200.0;
                  let randomVariance = (Float.fromInt(randomHash1) / 1000.0) * 0.5 - 0.25;
                  let efficiency = 0.5 + conditionBonus + randomVariance;

                  // Apply resonance modifier to overcharge
                  // Peak: 100%, Good: 80%, Outside: 60%
                  let resonanceModifier = if (resonance.inPeakZone) {
                    1.0;
                  } else if (resonance.inGoodZone) {
                    0.8;
                  } else {
                    0.6;
                  };

                  let finalOvercharge = baseOvercharge * efficiency * resonanceModifier;
                  let newOvercharge = Nat.min(40, Int.abs(Float.toInt(finalOvercharge)));

                  let updatedStats = {
                    stats with
                    battery = newBattery;
                    overcharge = newOvercharge;
                    lastRecharged = ?now;
                  };
                  garageManager.updateStats(tokenIndex, updatedStats);
                  // Record dedication points for recharge
                  dedicationManager.recordRecharge(tokenIndex, RECHARGE_COST, now);
                  dedicationManager.recordBatteryRestored(tokenIndex, newBattery - currentBattery, now);
                  #ok("Recharged");
                };
              };
            };
          };
          results.add({ tokenIndex = tokenIndex; result = botResult });
        };
      };
    };

    Buffer.toArray(results);
  };

  /// Batch repair multiple bots (0.05 ICP each + fees via ICRC-2)
  public shared ({ caller }) func web_batch_repair_bots(
    tokenIndices : [Nat]
  ) : async [{ tokenIndex : Nat; result : Result.Result<Text, Text> }] {
    let now = Time.now();
    let results = Buffer.Buffer<{ tokenIndex : Nat; result : Result.Result<Text, Text> }>(tokenIndices.size());
    let BASE_REPAIR_COST : Nat = 5_000_000; // 0.05 ICP
    let REPAIR_COOLDOWN : Int = 10800000000000; // 3 hours

    // Apply Industrial faction synergy
    let synergies = garageManager.calculateFactionSynergies(caller);
    let REPAIR_COST = Nat.max(1_000_000, Int.abs(Float.toInt(Float.fromInt(BASE_REPAIR_COST) * synergies.costMultipliers.repairCost)));

    // Calculate total cost
    let totalCost = (REPAIR_COST + TRANSFER_FEE) * tokenIndices.size();

    // Process single ICRC-2 payment for all bots
    let ledgerId = switch (icpLedgerCanisterId) {
      case (?id) { id };
      case (null) {
        for (tokenIndex in tokenIndices.vals()) {
          results.add({
            tokenIndex = tokenIndex;
            result = #err("Ledger not configured");
          });
        };
        return Buffer.toArray(results);
      };
    };

    let icpLedger = actor (Principal.toText(ledgerId)) : actor {
      icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
    };

    let transferResult = try {
      await icpLedger.icrc2_transfer_from({
        from = { owner = caller; subaccount = null };
        to = { owner = thisPrincipal; subaccount = null };
        amount = totalCost;
        fee = ?TRANSFER_FEE;
        memo = null;
        created_at_time = null;
        spender_subaccount = null;
      });
    } catch (_) {
      for (tokenIndex in tokenIndices.vals()) {
        results.add({ tokenIndex = tokenIndex; result = #err("Payment failed") });
      };
      return Buffer.toArray(results);
    };

    // Check payment result
    switch (transferResult) {
      case (#Err(transferError)) {
        let errorMsg = switch (transferError) {
          case (#InsufficientFunds { balance }) { "Insufficient ICP" };
          case (#InsufficientAllowance { allowance }) {
            "Insufficient allowance";
          };
          case _ { "Payment failed" };
        };
        for (tokenIndex in tokenIndices.vals()) {
          results.add({ tokenIndex = tokenIndex; result = #err(errorMsg) });
        };
        return Buffer.toArray(results);
      };
      case (#Ok(_blockIndex)) {
        // Payment successful - process each bot
        for (tokenIndex in tokenIndices.vals()) {
          let botResult : Result.Result<Text, Text> = switch (garageManager.getStats(tokenIndex)) {
            case (null) { #err("Not registered") };
            case (?stats) {
              if (not Principal.equal(stats.ownerPrincipal, caller)) {
                #err("Not owner");
              } else if (Option.isSome(stats.activeMission)) {
                #err("On mission");
              } else {
                // Check cooldown
                let onCooldown = switch (stats.lastRepaired) {
                  case (?lastTime) { (now - lastTime) < REPAIR_COOLDOWN };
                  case (null) { false };
                };
                if (onCooldown) {
                  #err("On cooldown");
                } else {
                  // Repair - manually update stats
                  let newCondition = Nat.min(100, stats.condition + 30);

                  // Check for Perfect Tune-Up using resonance system
                  let hasOvercharge = stats.overcharge > 0;
                  let resonance = ResonanceSystem.calculateResonance(tokenIndex, #Repair, stats.condition, now);
                  let perfectTuneUp = hasOvercharge and (resonance.inPeakZone or resonance.inGoodZone);

                  // Keep overcharge regardless of Perfect Tune-Up
                  // If Perfect Tune-Up: penalties removed, if not: penalties remain
                  let finalOvercharge = stats.overcharge;

                  let updatedStats = {
                    stats with
                    condition = newCondition;
                    overcharge = finalOvercharge;
                    perfectTuneUp = perfectTuneUp;
                    lastRepaired = ?now;
                  };
                  garageManager.updateStats(tokenIndex, updatedStats);
                  // Record dedication points for repair
                  dedicationManager.recordRepair(tokenIndex, REPAIR_COST, now);
                  dedicationManager.recordConditionRestored(tokenIndex, newCondition - stats.condition, now);
                  #ok(if perfectTuneUp { "Perfect Tune-Up!" } else { "Repaired" });
                };
              };
            };
          };
          results.add({ tokenIndex = tokenIndex; result = botResult });
        };
      };
    };

    Buffer.toArray(results);
  };

  /// Convert parts from one type to another (25% conversion cost)
  public shared ({ caller }) func web_convert_parts(
    fromType : Text,
    toType : Text,
    amount : Nat,
  ) : async Result.Result<Text, Text> {
    // Parse part types
    let fromPartType = switch (fromType) {
      case ("SpeedChip") { #SpeedChip };
      case ("PowerCoreFragment") { #PowerCoreFragment };
      case ("ThrusterKit") { #ThrusterKit };
      case ("GyroModule") { #GyroModule };
      case ("UniversalPart") { #UniversalPart };
      case (_) { return #err("Invalid fromType: " # fromType) };
    };

    let toPartType = switch (toType) {
      case ("SpeedChip") { #SpeedChip };
      case ("PowerCoreFragment") { #PowerCoreFragment };
      case ("ThrusterKit") { #ThrusterKit };
      case ("GyroModule") { #GyroModule };
      case ("UniversalPart") { #UniversalPart };
      case (_) { return #err("Invalid toType: " # toType) };
    };

    // Call garage manager to do conversion
    switch (garageManager.convertParts(caller, fromPartType, toPartType, amount)) {
      case (#err(e)) { #err(e) };
      case (#ok()) {
        let converted = (amount * 3) / 4;
        #ok("✅ Converted " # Nat.toText(amount) # " " # fromType # " → " # Nat.toText(converted) # " " # toType # " (25% cost)");
      };
    };
  };

  // ===========================
  // WEB BETTING FUNCTIONS
  // ===========================

  /// Get betting pool info for UI
  public query func web_betting_get_pool_info(raceId : Nat) : async ?BettingTypes.BettingPool {
    bettingManager.getPool(raceId);
  };

  /// Get user's betting history for UI
  public shared query ({ caller }) func web_betting_get_my_bets(limit : Nat) : async {
    bets : [{
      bet_id : Nat;
      race_id : Nat;
      token_index : Nat;
      bet_type : Text;
      amount_icp : Text;
      amount_e8s : Nat;
      status : Text;
      timestamp : Int;
      payout : ?{
        payout_icp : Text;
        payout_e8s : Nat;
        roi_percent : Text;
      };
    }];
    count : Nat;
    summary : {
      total_bets : Nat;
      wins : Nat;
      losses : Nat;
      pending : Nat;
      total_wagered_icp : Text;
      total_won_icp : Text;
      net_profit_icp : Text;
      roi_percent : Text;
      win_rate_percent : Text;
    };
  } {
    let userBets = bettingManager.getUserBets(caller, limit);

    // Calculate summary (excluding pending bets from ROI/profit calculations)
    var totalWagered : Nat = 0;
    var totalWon : Nat = 0;
    var wins : Nat = 0;
    var losses : Nat = 0;
    var pending : Nat = 0;

    for (bet in userBets.vals()) {
      switch (bet.status) {
        case (#Won) {
          wins += 1;
          totalWagered += bet.amount; // Only count wagered if bet is settled
          switch (bet.potentialPayout) {
            case (?payout) { totalWon += payout };
            case (null) {};
          };
        };
        case (#Lost) {
          losses += 1;
          totalWagered += bet.amount; // Only count wagered if bet is settled
        };
        case (#Pending or #Active) { pending += 1 }; // Don't count pending in totals
        case (#Refunded) {
          totalWagered += bet.amount;
          totalWon += bet.amount;
        };
      };
    };

    let netProfit : Int = totalWon - totalWagered;
    let settledBets = wins + losses; // Only count settled bets for win rate
    let winRate : Float = if (settledBets > 0) {
      Float.fromInt(wins) / Float.fromInt(settledBets) * 100.0;
    } else {
      0.0;
    };
    let roi : Float = if (totalWagered > 0) {
      (Float.fromInt(totalWon) / Float.fromInt(totalWagered) - 1.0) * 100.0;
    } else {
      0.0;
    };

    // Convert bets to web-friendly format
    let webBets = Array.map<BettingTypes.Bet, { bet_id : Nat; race_id : Nat; token_index : Nat; bet_type : Text; amount_icp : Text; amount_e8s : Nat; status : Text; timestamp : Int; payout : ?{ payout_icp : Text; payout_e8s : Nat; roi_percent : Text } }>(
      userBets,
      func(bet) {
        let statusText = switch (bet.status) {
          case (#Pending) "Pending";
          case (#Active) "Active";
          case (#Won) "Won";
          case (#Lost) "Lost";
          case (#Refunded) "Refunded";
        };

        let betTypeText = switch (bet.betType) {
          case (#Win) "Win";
          case (#Place) "Place";
          case (#Show) "Show";
        };

        let amountIcp = Float.fromInt(bet.amount) / 100_000_000.0;

        let payoutInfo = switch (bet.potentialPayout) {
          case (?payout) {
            let payoutIcp = Float.fromInt(payout) / 100_000_000.0;
            let betRoi = if (bet.amount > 0) {
              (Float.fromInt(payout) / Float.fromInt(bet.amount) - 1.0) * 100.0;
            } else {
              0.0;
            };
            ?{
              payout_icp = Float.format(#fix 2, payoutIcp);
              payout_e8s = payout;
              roi_percent = Float.format(#fix 1, betRoi) # "%";
            };
          };
          case (null) { null };
        };

        {
          bet_id = bet.betId;
          race_id = bet.raceId;
          token_index = bet.tokenIndex;
          bet_type = betTypeText;
          amount_icp = Float.format(#fix 2, amountIcp);
          amount_e8s = bet.amount;
          status = statusText;
          timestamp = bet.timestamp;
          payout = payoutInfo;
        };
      },
    );

    {
      bets = webBets;
      count = userBets.size();
      summary = {
        total_bets = userBets.size();
        wins = wins;
        losses = losses;
        pending = pending;
        total_wagered_icp = Float.format(#fix 2, Float.fromInt(totalWagered) / 100_000_000.0);
        total_won_icp = Float.format(#fix 2, Float.fromInt(totalWon) / 100_000_000.0);
        net_profit_icp = Float.format(#fix 2, Float.fromInt(netProfit) / 100_000_000.0);
        roi_percent = Float.format(#fix 1, roi) # "%";
        win_rate_percent = Float.format(#fix 1, winRate) # "%";
      };
    };
  };

  public shared query ({ caller }) func web_betting_get_my_bets_paginated(limit : Nat, offset : Nat) : async {
    bets : [{
      bet_id : Nat;
      race_id : Nat;
      token_index : Nat;
      bet_type : Text;
      amount_icp : Text;
      amount_e8s : Nat;
      status : Text;
      timestamp : Int;
      payout : ?{
        payout_icp : Text;
        payout_e8s : Nat;
        roi_percent : Text;
      };
    }];
    hasMore : Bool;
    total : Nat;
    summary : {
      total_bets : Nat;
      wins : Nat;
      losses : Nat;
      pending : Nat;
      total_wagered_icp : Text;
      total_won_icp : Text;
      net_profit_icp : Text;
      roi_percent : Text;
      win_rate_percent : Text;
    };
  } {
    let paginatedResult = bettingManager.getUserBetsPaginated(caller, limit, offset);
    let userBets = paginatedResult.bets;

    // Calculate summary from ALL user bets for accurate stats
    let allBetIds = Option.get(Map.get(bettingManager.getUserBetsMap(), bettingManager.getPrincipalHash(), caller), []);
    var totalWagered : Nat = 0;
    var totalWon : Nat = 0;
    var wins : Nat = 0;
    var losses : Nat = 0;
    var pending : Nat = 0;

    for (betId in allBetIds.vals()) {
      switch (Map.get(bettingManager.getBetsMap(), bettingManager.getNatHash(), betId)) {
        case (?bet) {
          switch (bet.status) {
            case (#Won) {
              wins += 1;
              totalWagered += bet.amount;
              switch (bet.potentialPayout) {
                case (?payout) { totalWon += payout };
                case (null) {};
              };
            };
            case (#Lost) {
              losses += 1;
              totalWagered += bet.amount;
            };
            case (#Pending or #Active) { pending += 1 };
            case (#Refunded) {
              totalWagered += bet.amount;
              totalWon += bet.amount;
            };
          };
        };
        case (null) {};
      };
    };

    let netProfit : Int = totalWon - totalWagered;
    let settledBets = wins + losses;
    let winRate : Float = if (settledBets > 0) {
      Float.fromInt(wins) / Float.fromInt(settledBets) * 100.0;
    } else {
      0.0;
    };
    let roi : Float = if (totalWagered > 0) {
      (Float.fromInt(totalWon) / Float.fromInt(totalWagered) - 1.0) * 100.0;
    } else {
      0.0;
    };

    // Convert bets to web-friendly format
    let webBets = Array.map<BettingTypes.Bet, { bet_id : Nat; race_id : Nat; token_index : Nat; bet_type : Text; amount_icp : Text; amount_e8s : Nat; status : Text; timestamp : Int; payout : ?{ payout_icp : Text; payout_e8s : Nat; roi_percent : Text } }>(
      userBets,
      func(bet) {
        let statusText = switch (bet.status) {
          case (#Pending) "Pending";
          case (#Active) "Active";
          case (#Won) "Won";
          case (#Lost) "Lost";
          case (#Refunded) "Refunded";
        };

        let betTypeText = switch (bet.betType) {
          case (#Win) "Win";
          case (#Place) "Place";
          case (#Show) "Show";
        };

        let amountIcp = Float.fromInt(bet.amount) / 100_000_000.0;

        let payoutInfo = switch (bet.potentialPayout) {
          case (?payout) {
            let payoutIcp = Float.fromInt(payout) / 100_000_000.0;
            let betRoi = if (bet.amount > 0) {
              (Float.fromInt(payout) / Float.fromInt(bet.amount) - 1.0) * 100.0;
            } else {
              0.0;
            };
            ?{
              payout_icp = Float.format(#fix 2, payoutIcp);
              payout_e8s = payout;
              roi_percent = Float.format(#fix 1, betRoi) # "%";
            };
          };
          case (null) { null };
        };

        {
          bet_id = bet.betId;
          race_id = bet.raceId;
          token_index = bet.tokenIndex;
          bet_type = betTypeText;
          amount_icp = Float.format(#fix 2, amountIcp);
          amount_e8s = bet.amount;
          status = statusText;
          timestamp = bet.timestamp;
          payout = payoutInfo;
        };
      },
    );

    {
      bets = webBets;
      hasMore = paginatedResult.hasMore;
      total = paginatedResult.total;
      summary = {
        total_bets = paginatedResult.total;
        wins = wins;
        losses = losses;
        pending = pending;
        total_wagered_icp = Float.format(#fix 2, Float.fromInt(totalWagered) / 100_000_000.0);
        total_won_icp = Float.format(#fix 2, Float.fromInt(totalWon) / 100_000_000.0);
        net_profit_icp = Float.format(#fix 2, Float.fromInt(netProfit) / 100_000_000.0);
        roi_percent = Float.format(#fix 1, roi) # "%";
        win_rate_percent = Float.format(#fix 1, winRate) # "%";
      };
    };
  };

  /// Place a bet for UI
  public shared ({ caller }) func web_betting_place_bet(
    raceId : Nat,
    tokenIndex : Nat,
    betType : BettingTypes.BetType,
    amountE8s : Nat,
  ) : async Result.Result<{ betId : Nat; currentOdds : Float; potentialPayout : Nat }, Text> {
    // Validate amount
    if (amountE8s < 1_000_000) {
      return #err("Minimum bet is 0.01 ICP");
    };
    if (amountE8s > 10_000_000_000) {
      return #err("Maximum bet is 100 ICP");
    };

    // Get pool
    let pool = switch (bettingManager.getPool(raceId)) {
      case (?p) { p };
      case (null) { return #err("Betting pool not found") };
    };

    // Check status
    if (pool.status != #Open) {
      return #err("Betting is not currently open for this race");
    };

    // Check timing
    let now = Time.now();
    if (now < pool.bettingOpensAt or now >= pool.bettingClosesAt) {
      return #err("Outside betting window");
    };

    // Check bot is in race
    let botInRace = Array.find<Nat>(pool.entrants, func(t) { t == tokenIndex });
    if (botInRace == null) {
      return #err("Bot #" # Nat.toText(tokenIndex) # " is not entered in this race");
    };

    // Check user hasn't exceeded per-race limit (100 ICP)
    let userBetsInRace = bettingManager.getUserBetsForRaceDetailed(caller, raceId);
    var userTotal : Nat = 0;
    for (bet in userBetsInRace.vals()) {
      userTotal += bet.amount;
    };
    if (userTotal + amountE8s > 10_000_000_000) {
      return #err("Maximum 100 ICP total per race");
    };

    // Transfer ICP from user to betting pool subaccount
    let ledgerCanisterId = switch (icpLedgerCanisterId) {
      case (?id) { id };
      case (null) { return #err("ICP Ledger not configured") };
    };

    let ledger = actor (Principal.toText(ledgerCanisterId)) : actor {
      icrc2_transfer_from : shared IcpLedger.TransferFromArgs -> async IcpLedger.Result_3;
    };

    let poolSubaccount = bettingManager.getPoolSubaccount(raceId);

    let transferResult = try {
      await ledger.icrc2_transfer_from({
        from = { owner = caller; subaccount = null };
        to = { owner = thisPrincipal; subaccount = ?poolSubaccount };
        amount = amountE8s;
        fee = null;
        memo = null;
        created_at_time = null;
        spender_subaccount = null;
      });
    } catch (e) {
      return #err("Transfer failed: " # Error.message(e));
    };

    switch (transferResult) {
      case (#Ok(blockIndex)) {
        // Record bet
        let betResult = bettingManager.placeBet(caller, raceId, tokenIndex, betType, amountE8s);
        switch (betResult) {
          case (#ok(betId)) {
            // Calculate current odds
            let odds = bettingManager.calculateOdds(raceId, tokenIndex, betType);
            let potentialPayout = Float.toInt(Float.fromInt(amountE8s) * odds);

            #ok({
              betId = betId;
              currentOdds = odds;
              potentialPayout = Int.abs(potentialPayout);
            });
          };
          case (#err(msg)) {
            // Transfer succeeded but bet recording failed - this shouldn't happen
            // Funds are in pool subaccount, could be refunded manually if needed
            #err("Bet recording failed: " # msg);
          };
        };
      };
      case (#Err(err)) {
        let errMsg = switch (err) {
          case (#BadFee { expected_fee }) {
            "Bad fee, expected: " # Nat.toText(expected_fee);
          };
          case (#InsufficientFunds { balance }) {
            "Insufficient funds, balance: " # Nat.toText(balance);
          };
          case (#InsufficientAllowance { allowance }) {
            "Insufficient allowance: " # Nat.toText(allowance) # ". Please approve the racing canister first.";
          };
          case (#TooOld) { "Transfer too old" };
          case (#CreatedInFuture { ledger_time }) {
            "Transfer created in future";
          };
          case (#Duplicate { duplicate_of }) { "Duplicate transfer" };
          case (#TemporarilyUnavailable) { "Ledger temporarily unavailable" };
          case (#GenericError { error_code; message }) {
            "Error " # Nat.toText(error_code) # ": " # message;
          };
          case _ { "Transfer failed" };
        };
        #err(errMsg);
      };
    };
  };

  /// List betting pools for UI
  public query func web_betting_list_pools(
    statusFilter : ?BettingTypes.PoolStatus,
    limit : Nat,
  ) : async {
    pools : [{
      raceId : Nat;
      status : BettingTypes.PoolStatus;
      totalPooled : Nat;
      totalBets : Nat;
      bettingOpensAt : Int;
      bettingClosesAt : Int;
    }];
  } {
    let allPools = bettingManager.listPools(statusFilter, limit);

    let simplified = Array.map<BettingTypes.BettingPool, { raceId : Nat; status : BettingTypes.PoolStatus; totalPooled : Nat; totalBets : Nat; bettingOpensAt : Int; bettingClosesAt : Int }>(
      allPools,
      func(pool) {
        {
          raceId = pool.raceId;
          status = pool.status;
          totalPooled = pool.winPool + pool.placePool + pool.showPool;
          totalBets = pool.betIds.size();
          bettingOpensAt = pool.bettingOpensAt;
          bettingClosesAt = pool.bettingClosesAt;
        };
      },
    );

    { pools = simplified };
  };
};
