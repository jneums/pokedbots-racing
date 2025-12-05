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
import RacingGetRaceDetails "tools/racing_get_race_details";
import RacingGetBotRaces "tools/racing_get_bot_races";

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
import TT "mo:timer-tool";
import Star "mo:star/star";

// // Migration to add name field to PokedBotRacingStats
// (
//   with migration = func(
//     old_state : {
//       stable_racing_stats : Map.Map<Nat, { tokenIndex : Nat; ownerPrincipal : Principal; faction : PokedBotsGarage.FactionType; speedBonus : Nat; powerCoreBonus : Nat; accelerationBonus : Nat; stabilityBonus : Nat; speedUpgrades : Nat; powerCoreUpgrades : Nat; accelerationUpgrades : Nat; stabilityUpgrades : Nat; battery : Nat; condition : Nat; experience : Nat; preferredDistance : PokedBotsGarage.Distance; preferredTerrain : PokedBotsGarage.Terrain; racesEntered : Nat; wins : Nat; places : Nat; shows : Nat; totalScrapEarned : Nat; factionReputation : Nat; eloRating : Nat; activatedAt : Int; lastDecayed : Int; lastRecharged : ?Int; lastRepaired : ?Int; lastDiagnostics : ?Int; lastRaced : ?Int; upgradeEndsAt : ?Int; listedForSale : Bool }>;
//     }
//   ) : {
//     stable_racing_stats : Map.Map<Nat, PokedBotsGarage.PokedBotRacingStats>;
//   } {
//     // Add name field (null) to all existing bots
//     let new_stats = Map.new<Nat, PokedBotsGarage.PokedBotRacingStats>();

//     for ((tokenIndex, oldStats) in Map.entries(old_state.stable_racing_stats)) {
//       let newStats : PokedBotsGarage.PokedBotRacingStats = {
//         tokenIndex = oldStats.tokenIndex;
//         ownerPrincipal = oldStats.ownerPrincipal;
//         faction = oldStats.faction;
//         name = null; // Add name field, initially null
//         speedBonus = oldStats.speedBonus;
//         powerCoreBonus = oldStats.powerCoreBonus;
//         accelerationBonus = oldStats.accelerationBonus;
//         stabilityBonus = oldStats.stabilityBonus;
//         speedUpgrades = oldStats.speedUpgrades;
//         powerCoreUpgrades = oldStats.powerCoreUpgrades;
//         accelerationUpgrades = oldStats.accelerationUpgrades;
//         stabilityUpgrades = oldStats.stabilityUpgrades;
//         battery = oldStats.battery;
//         condition = oldStats.condition;
//         experience = oldStats.experience;
//         preferredDistance = oldStats.preferredDistance;
//         preferredTerrain = oldStats.preferredTerrain;
//         racesEntered = oldStats.racesEntered;
//         wins = oldStats.wins;
//         places = oldStats.places;
//         shows = oldStats.shows;
//         totalScrapEarned = oldStats.totalScrapEarned;
//         factionReputation = oldStats.factionReputation;
//         eloRating = oldStats.eloRating;
//         activatedAt = oldStats.activatedAt;
//         lastDecayed = oldStats.lastDecayed;
//         lastRecharged = oldStats.lastRecharged;
//         lastRepaired = oldStats.lastRepaired;
//         lastDiagnostics = oldStats.lastDiagnostics;
//         lastRaced = oldStats.lastRaced;
//         upgradeEndsAt = oldStats.upgradeEndsAt;
//         listedForSale = oldStats.listedForSale;
//       };

//       Map.set(new_stats, Map.nhash, tokenIndex, newStats);
//     };

//     {
//       stable_racing_stats = new_stats;
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

  // Stable state for races (generic racing)
  let stable_races = Map.new<Nat, RacingSimulator.Race>();

  // Stable state for calendar events
  let stable_events = Map.new<Nat, RaceCalendar.ScheduledEvent>();

  // Stable state for leaderboards
  let stable_monthly_boards = Map.new<Nat, Map.Map<Nat, Leaderboard.LeaderboardEntry>>();
  let stable_season_boards = Map.new<Nat, Map.Map<Nat, Leaderboard.LeaderboardEntry>>();
  let stable_alltime_board = Map.new<Nat, Leaderboard.LeaderboardEntry>();
  let stable_faction_boards = Map.new<Text, Map.Map<Nat, Leaderboard.LeaderboardEntry>>();

  // Stable state for battery recharge tracking
  var stable_last_recharge_time : Int = 0;

  // Stable state for prize payment tracking (prevents duplicate payments)
  // Key: "raceId:owner:amount" - ensures each prize is only paid once
  let stable_paid_prizes = Map.new<Text, Int>(); // Maps prize key to timestamp when paid

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
  // Can be overridden via init args for testing, defaults to production
  var extCanisterId = Option.get(
    do ? { args!.extCanisterId! },
    Principal.fromText("bzsui-sqaaa-aaaah-qce2a-cai"),
  );
  transient let extCanister = ExtIntegration.getExtCanister(extCanisterId);

  // ICP Ledger Canister ID (optional, can be set dynamically)
  var icpLedgerCanisterId : ?Principal = null;

  // PokedBots Garage Manager (collection-specific logic)
  transient let garageManager = PokedBotsGarage.PokedBotsGarageManager(
    stable_racing_stats,
    stable_active_upgrades,
    stable_user_inventories,
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
        switch (Map.get(stable_base_stats, Map.nhash, tokenId)) {
          case (?stats) {
            let factionType : PokedBotsGarage.FactionType = switch (stats.faction) {
              case (#UltimateMaster) { #UltimateMaster };
              case (#Wild) { #Wild };
              case (#Golden) { #Golden };
              case (#Ultimate) { #Ultimate };
              case (#Blackhole) { #Blackhole };
              case (#Dead) { #Dead };
              case (#Master) { #Master };
              case (#Bee) { #Bee };
              case (#Food) { #Food };
              case (#Box) { #Box };
              case (#Murder) { #Murder };
              case (#Game) { #Game };
              case (#Animal) { #Animal };
              case (#Industrial) { #Industrial };
            };
            ?{
              speed = stats.speed;
              powerCore = stats.powerCore;
              acceleration = stats.acceleration;
              stability = stats.stability;
              faction = factionType;
            };
          };
          case (null) { null };
        };
      };
    },
  );

  // Racing Simulator (generic racing engine)
  transient let raceSimulator = RacingSimulator.RaceSimulator();

  // Race Manager (uses generic racing logic)
  transient let raceManager = RacingSimulator.RaceManager(stable_races);

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

  /// Get race class based on ELO rating
  func getRaceClassFromElo(eloRating : Nat) : RacingSimulator.RaceClass {
    if (eloRating >= 1800) {
      #SilentKlan; // Top tier: 1800+
    } else if (eloRating >= 1600) {
      #Elite; // High tier: 1600-1799
    } else if (eloRating >= 1400) {
      #Raider; // Mid tier: 1400-1599
    } else {
      #Scavenger; // Entry tier: <1400
    };
  };

  /// Check if bot's current ELO matches race class requirements
  func checkEloEligibility(eloRating : Nat, raceClass : RacingSimulator.RaceClass) : Bool {
    switch (raceClass) {
      case (#Scavenger) { eloRating < 1400 };
      case (#Raider) { eloRating >= 1400 and eloRating < 1600 };
      case (#Elite) { eloRating >= 1600 and eloRating < 1800 };
      case (#SilentKlan) { eloRating >= 1800 };
    };
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
        switch (garageManager.getActiveUpgrade(tokenIndex)) {
          case (?session) {
            Debug.print("Found active upgrade session: " # debug_show (session.upgradeType));

            // Get current stats
            switch (garageManager.getStats(tokenIndex)) {
              case (?stats) {
                // Get current stats for difficulty calculation
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
                };

                // Base gain based on upgrade count (diminishing returns)
                let maxBaseGain = if (upgradeCount == 0) { 3 } else if (upgradeCount <= 2) {
                  2;
                } else { 1 };

                // Random roll 1 to maxBaseGain
                // Use modulo to prevent Nat32 overflow
                let timeNanos = Int.abs(Time.now());
                let seedValue = (tokenIndex + timeNanos) % 4_294_967_296; // Keep within Nat32 range
                let seed = Nat32.fromNat(seedValue);
                let roll = (Nat32.toNat(seed) % maxBaseGain) + 1;

                // Difficulty modifier based on current stat value
                let difficultyMultiplier : Float = if (currentStatValue < 60) {
                  1.0;
                } else if (currentStatValue < 70) { 0.8 } else if (currentStatValue < 80) {
                  0.6;
                } else if (currentStatValue < 90) { 0.4 } else { 0.2 };

                // Apply difficulty
                let difficultyAdjustedGain = Float.toInt(Float.fromInt(roll) * difficultyMultiplier);

                // Ensure at least 1 gain for early upgrades, allow 0 for later ones
                let baseIncrease : Nat = if (upgradeCount < 3) {
                  Nat.max(1, Int.abs(difficultyAdjustedGain));
                } else { Int.abs(difficultyAdjustedGain) };

                // Apply faction modifiers to the increase
                let increase = garageManager.applyFactionModifier(
                  stats.faction,
                  baseIncrease,
                  seed,
                );

                Debug.print("Applying +" # debug_show (increase) # " to stat (faction: " # debug_show (stats.faction) # ")");

                // Apply the stat boost by increasing the bonus and incrementing upgrade count
                let updatedStats = switch (session.upgradeType) {
                  case (#Velocity) {
                    {
                      stats with
                      speedBonus = stats.speedBonus + increase;
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
                      powerCoreBonus = stats.powerCoreBonus + increase;
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
                      accelerationBonus = stats.accelerationBonus + increase;
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
                      stabilityBonus = stats.stabilityBonus + increase;
                      stabilityUpgrades = stats.stabilityUpgrades + 1;
                      experience = stats.experience + 10;
                      factionReputation = stats.factionReputation + 3;
                      upgradeEndsAt = null;
                      listedForSale = false;
                    };
                  };
                };

                garageManager.updateStats(tokenIndex, updatedStats);
                garageManager.clearUpgrade(tokenIndex);

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

  // Handle hourly battery recharge (self-rescheduling timer)
  func handleHourlyRecharge<system>(_actionId : TT.ActionId, _action : TT.Action) : TT.ActionId {
    Debug.print("Hourly battery recharge handler triggered");

    let now = Time.now();
    let botsRecharged = garageManager.applyRechargeToAll(now);
    stable_last_recharge_time := now;

    Debug.print("Applied battery recharge to " # debug_show (botsRecharged) # " bots");

    // Schedule next recharge in 1 hour
    let nextRechargeTime = now + (60 * 60 * 1_000_000_000); // 1 hour in nanoseconds
    let nextActionId = tt().setActionSync<system>(
      Int.abs(nextRechargeTime),
      {
        actionType = "hourly_recharge";
        params = to_candid (());
      },
    );
    Debug.print("Scheduled next recharge for " # debug_show (nextRechargeTime));

    nextActionId;
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
          // Use event ID and race count for better seed variation
          let seed = Nat32.fromNat(Int.abs((event.scheduledTime + event.eventId * 7919 + createdRaceIds.size() * 1000000) % 1000000));

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

              // Better terrain distribution using different modulo
              let terr = switch (Nat32.toNat(seed % 3)) {
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

          // Apply class-based entry fee multiplier
          let classFeeMultiplier : Float = switch (division) {
            case (#Scavenger) { 1.0 }; // Base fee
            case (#Raider) { 2.0 }; // 2x
            case (#Elite) { 5.0 }; // 5x
            case (#SilentKlan) { 10.0 }; // 10x
          };

          let adjustedEntryFee = Int.abs(Float.toInt(Float.fromInt(event.metadata.entryFee) * classFeeMultiplier));

          // Apply platform bonus only to Scavenger/Raider (Elite/SilentKlan are self-sustaining)
          let platformBonus : Nat = switch (division) {
            case (#Scavenger) { event.metadata.prizePoolBonus };
            case (#Raider) { event.metadata.prizePoolBonus };
            case (#Elite) { 0 };
            case (#SilentKlan) { 0 };
          };

          let race = raceManager.createRace(
            distance,
            terrain,
            division,
            adjustedEntryFee,
            event.metadata.maxEntries,
            event.metadata.minEntries,
            event.scheduledTime,
            platformBonus,
            event.registrationCloses,
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
    let nextActionId = tt().setActionSync<system>(
      Int.abs(nextCreationTime),
      {
        actionType = "race_create";
        params = to_candid (());
      },
    );

    nextActionId;
  };

  // Ensure calendar has events scheduled (Weekly League + Daily Sprints)
  func ensureCalendarScheduled<system>(now : Int) {
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
        ignore eventCalendar.createWeeklyLeagueEvent(nextSunday, now);
        Debug.print("Auto-scheduled Weekly League for timestamp: " # debug_show (nextSunday));
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
      // Start from the last existing sprint time, or now if none exist
      var scheduleTime = if (sprintsIn48h.size() > 0) {
        // Sort by scheduledTime to find the latest
        let sorted = Array.sort<RaceCalendar.ScheduledEvent>(
          sprintsIn48h,
          func(a, b) { Int.compare(a.scheduledTime, b.scheduledTime) },
        );
        sorted[sorted.size() - 1].scheduledTime + 1_000_000_000; // Start after the last one
      } else {
        now;
      };

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
            // Not paid yet, proceed with payment
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
              // Record that this prize has been paid
              ignore Map.put(stable_paid_prizes, Map.thash, prizeKey, Time.now());
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

  // Handle race start - marks race as in progress
  func handleRaceStart<system>(actionId : TT.ActionId, action : TT.Action) : TT.ActionId {
    Debug.print("Race start handler triggered");

    let raceIdOpt : ?Nat = from_candid (action.params);

    switch (raceIdOpt) {
      case (?raceId) {
        Debug.print("Starting race " # debug_show (raceId));

        switch (raceManager.getRace(raceId)) {
          case (?race) {
            // Validate all entries still meet race class requirements
            var validEntries : [RacingSimulator.RaceEntry] = [];
            var refundedCount : Nat = 0;

            for (entry in race.entries.vals()) {
              // Convert nftId back to tokenIndex to check stats
              switch (Nat.fromText(entry.nftId)) {
                case (?tokenIndex) {
                  switch (garageManager.getStats(tokenIndex)) {
                    case (?botStats) {
                      // Check if bot's current ELO still matches race class
                      if (checkEloEligibility(botStats.eloRating, race.raceClass)) {
                        // Bot is still eligible, keep the entry
                        validEntries := Array.append(validEntries, [entry]);
                      } else {
                        // Bot no longer eligible (ELO changed), refund entry fee
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
                        refundedCount += 1;
                        Debug.print("Removed ineligible entry (ELO changed): NFT #" # entry.nftId # " - scheduled refund " # debug_show (refundActionId));
                      };
                    };
                    case (null) {
                      // No stats found, remove entry and refund
                      let refundActionId = tt().setActionASync<system>(
                        Int.abs(Time.now() + 1_000_000_000),
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
                      refundedCount += 1;
                      Debug.print("Removed entry (no stats): NFT #" # entry.nftId # " - scheduled refund " # debug_show (refundActionId));
                    };
                  };
                };
                case (null) {
                  // Invalid nftId format, remove entry and refund
                  let refundActionId = tt().setActionASync<system>(
                    Int.abs(Time.now() + 1_000_000_000),
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
                  refundedCount += 1;
                  Debug.print("Removed entry (invalid ID): " # entry.nftId # " - scheduled refund " # debug_show (refundActionId));
                };
              };
            };

            // Update race with valid entries only
            if (refundedCount > 0) {
              ignore raceManager.updateRaceEntries(raceId, validEntries);
              Debug.print("Removed " # debug_show (refundedCount) # " ineligible entries, " # debug_show (validEntries.size()) # " valid entries remaining");
            };

            // Check if race has enough valid entries
            if (validEntries.size() < race.minEntries) {
              Debug.print("Race cancelled - not enough valid entries (" # debug_show (validEntries.size()) # " < " # debug_show (race.minEntries) # "), issuing refunds");
              ignore raceManager.updateRaceStatus(raceId, #Cancelled);

              // Refund remaining valid entries
              for (entry in validEntries.vals()) {
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

              return actionId;
            };

            // Mark as in progress
            ignore raceManager.updateRaceStatus(raceId, #InProgress);
            Debug.print("Race in progress: " # race.name # " with " # debug_show (validEntries.size()) # " entries");

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
            // Convert race entries to RacingParticipants
            var participants : [RacingSimulator.RacingParticipant] = [];

            for (entry in race.entries.vals()) {
              // Get bot stats from garage manager WITH terrain bonuses
              switch (garageManager.getRacingStatsWithTerrain(entry.nftId, race.terrain)) {
                case (?stats) {
                  let participant : RacingSimulator.RacingParticipant = {
                    nftId = entry.nftId;
                    owner = entry.owner;
                    stats = stats;
                  };
                  participants := Array.append(participants, [participant]);
                };
                case (null) {
                  Debug.print("Warning: No stats found for NFT " # entry.nftId);
                };
              };
            };

            // Simulate the race using generic simulator
            switch (raceSimulator.simulateRace(race, participants)) {
              case (?results) {
                Debug.print("Race simulated, " # debug_show (results.size()) # " racers");

                // Update race with results
                ignore raceManager.setRaceResults(raceId, results);

                // Apply ELO rating changes for all race participants
                let eloResults = Array.map<RacingSimulator.RaceResult, (Text, Nat)>(
                  results,
                  func(r : RacingSimulator.RaceResult) : (Text, Nat) {
                    (r.nftId, r.position);
                  },
                );
                garageManager.applyRaceEloChanges(eloResults);

                // Update bot stats using garage manager
                for (result in results.vals()) {
                  // Record race result in garage
                  garageManager.recordRaceResult(
                    result.nftId,
                    result.position,
                    results.size(),
                    result.prizeAmount,
                  );

                  // Award parts based on race terrain and position
                  // Terrain determines which part drops:
                  // - MetalRoads: SpeedChips (speed is key on roads)
                  // - ScrapHeaps: PowerCells (power to push through debris)
                  // - WastelandSand: ThrusterKits/GyroModules alternating (accel/stability in sand)

                  let partType : PokedBotsGarage.PartType = switch (race.terrain) {
                    case (#MetalRoads) { #SpeedChip };
                    case (#ScrapHeaps) { #PowerCoreFragment };
                    case (#WastelandSand) {
                      // Alternate between Thruster and Gyro based on race ID
                      if (raceId % 2 == 0) { #ThrusterKit } else { #GyroModule };
                    };
                  };

                  // Base parts awarded by race class (matches original scrap system: 1 scrap = 1 part)
                  // First upgrade costs 100 parts, achievable in ~7-15 Scavenger races
                  let baseParts : Nat = switch (race.raceClass) {
                    case (#Scavenger) { 5 }; // Entry: 2.5-15 parts per race (winner: 15, participation: 2.5)
                    case (#Raider) { 12 }; // Mid: 6-36 parts per race (winner: 36)
                    case (#Elite) { 25 }; // High: 12.5-75 parts per race (winner: 75)
                    case (#SilentKlan) { 50 }; // Top: 25-150 parts per race (winner: 150)
                  };

                  // Position multiplier (winner gets most, last place gets least)
                  let positionMultiplier : Float = if (result.position == 1) {
                    3.0; // Winner: 3x
                  } else if (result.position == 2) {
                    2.0; // Second: 2x
                  } else if (result.position == 3) {
                    1.5; // Third: 1.5x
                  } else if (result.position <= 5) {
                    1.0; // Top 5: 1x
                  } else {
                    0.5; // Everyone else: 0.5x (participation)
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

                  // Apply race costs (battery drain and condition wear based on race)
                  garageManager.applyRaceCosts(result.nftId, race.distance, race.terrain, result.position);

                  // Update leaderboard (convert nftId back to tokenIndex)
                  switch (Nat.fromText(result.nftId)) {
                    case (?tokenIndex) {
                      switch (garageManager.getStats(tokenIndex)) {
                        case (?botStats) {
                          let now = Time.now();
                          leaderboardManager.updateCurrentPeriods(now);

                          // Convert faction type for leaderboard
                          let leaderboardFaction : PokedBotsGarage.FactionType = botStats.faction;

                          // Convert race class
                          let leaderboardClass : RacingSimulator.RaceClass = race.raceClass;

                          leaderboardManager.recordRaceResult(
                            tokenIndex,
                            result.owner,
                            result.position,
                            results.size(),
                            result.prizeAmount,
                            1.0,
                            leaderboardFaction,
                            leaderboardClass,
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
  tt().registerExecutionListenerSync(?"hourly_recharge", handleHourlyRecharge);
  tt().registerExecutionListenerSync(?"race_create", handleRaceCreation);
  tt().registerExecutionListenerSync(?"race_start", handleRaceStart);
  tt().registerExecutionListenerSync(?"race_finish", handleRaceFinish);
  tt().registerExecutionListenerAsync(?"prize_distribution", handlePrizeDistribution);

  // Create the tool context that will be passed to all tools
  transient let toolContext : ToolContext.ToolContext = {
    canisterPrincipal = Principal.fromActor(self);
    owner = owner;
    appContext = appContext;
    garageManager = garageManager;
    raceManager = raceManager;
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
    RacingGetRaceDetails.config(),
    RacingGetBotRaces.config(),
  ];

  // --- 2. CONFIGURE THE SDK ---
  transient let mcpConfig : McpTypes.McpConfig = {
    self = Principal.fromActor(self);
    allowanceUrl = ?allowanceUrl;
    serverInfo = {
      name = "pokedbots-wasteland-racing";
      title = "PokedBots Wasteland Racing";
      version = "0.2.2";
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
      ("racing_get_race_details", RacingGetRaceDetails.handle(toolContext)),
      ("racing_get_bot_races", RacingGetBotRaces.handle(toolContext)),
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

  /// Get the garage account ID for a given user principal
  /// This is useful for testing and external tools that need to know where to send NFTs
  public query func get_garage_account_id(userPrincipal : Principal) : async Text {
    ExtIntegration.getGarageAccountId(Principal.fromActor(self), userPrincipal);
  };

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

  /// Debug method to check ownership verification
  public shared func debug_check_bot_owner(tokenIndex : Nat32, userPrincipal : Principal) : async {
    garageAccountId : Text;
    tokenIdentifier : Text;
    ownerResult : Text;
    extCanister : Text;
  } {
    let garageSubaccount = ExtIntegration.deriveGarageSubaccount(userPrincipal);
    let garageAccountId = ExtIntegration.principalToAccountIdentifier(Principal.fromActor(self), ?garageSubaccount);
    let tokenId = ExtIntegration.encodeTokenIdentifier(tokenIndex, extCanisterId);

    let ownerResult = try {
      let result = await extCanister.bearer(tokenId);
      switch (result) {
        case (#ok(owner)) { "Owner: " # owner };
        case (#err(e)) { "Error: " # debug_show (e) };
      };
    } catch (e) {
      "Exception: " # Error.message(e);
    };

    return {
      garageAccountId = garageAccountId;
      tokenIdentifier = tokenId;
      ownerResult = ownerResult;
      extCanister = Principal.toText(extCanisterId);
    };
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
  // DEBUG: Get stored stats (using garage manager)
  public query func debug_preview_stats(tokenIndex : Nat) : async {
    hasPrecomputedStats : Bool;
    precomputedStats : ?{
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
      faction : Text;
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
    // Get precomputed stats
    let precomputed = switch (Map.get(stable_base_stats, Map.nhash, tokenIndex)) {
      case (?stats) {
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
          speed = stats.speed;
          powerCore = stats.powerCore;
          acceleration = stats.acceleration;
          stability = stats.stability;
          faction = factionText;
        };
      };
      case null { null };
    };

    // Get currently stored stats if bot is initialized
    let storedStats = switch (garageManager.getStats(tokenIndex)) {
      case (?stored) {
        let storedFaction = switch (stored.faction) {
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

        // Get current stats (base + bonuses)
        let current = garageManager.getCurrentStats(stored);
        let base = garageManager.getBaseStats(tokenIndex);

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
      hasPrecomputedStats = Option.isSome(precomputed);
      precomputedStats = precomputed;
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

  /// Get public bot profile (stats + career, no sensitive info like battery/condition)
  public query func get_bot_profile(tokenIndex : Nat) : async ?{
    tokenIndex : Nat;
    name : ?Text;
    owner : ?Principal;
    faction : PokedBotsGarage.FactionType;
    raceClass : RacingSimulator.RaceClass;
    stats : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
      overallRating : Nat;
    };
    career : {
      racesEntered : Nat;
      wins : Nat;
      podiums : Nat;
      totalEarnings : Nat;
    };
    eloRating : Nat;
    isInitialized : Bool;
  } {
    switch (garageManager.getStats(tokenIndex)) {
      case (?botStats) {
        let current = garageManager.getCurrentStats(botStats);
        let rating = garageManager.calculateOverallRating(botStats);
        let raceClass = getRaceClassFromElo(botStats.eloRating);

        ?{
          tokenIndex = tokenIndex;
          name = botStats.name;
          owner = ?botStats.ownerPrincipal;
          faction = botStats.faction;
          raceClass = raceClass;
          stats = {
            speed = current.speed;
            powerCore = current.powerCore;
            acceleration = current.acceleration;
            stability = current.stability;
            overallRating = rating;
          };
          career = {
            racesEntered = botStats.racesEntered;
            wins = botStats.wins;
            podiums = Nat.add(botStats.wins, Nat.add(botStats.places, botStats.shows));
            totalEarnings = botStats.totalScrapEarned;
          };
          eloRating = botStats.eloRating;
          isInitialized = true;
        };
      };
      case (null) { null };
    };
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

  // Manual trigger to initialize race creation timer
  public shared ({ caller }) func initialize_race_timer() : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can initialize race timer";
    };

    initializeRaceCreationTimer<system>();
    let existingTimers = tt().getActionsByFilter(#ByType("race_create"));
    "Race creation timer initialized. Active timers: " # debug_show (existingTimers.size());
  };

  // ===== CALENDAR & EVENT MANAGEMENT =====
  // All event scheduling and race creation is handled automatically by the timer system
  // via ensureCalendarScheduled() and handleRaceCreation()

  // ===== ADMIN FUNCTIONS =====

  /// Reset a bot's racing stats (owner only) - allows re-initialization with correct faction
  /// This is useful after faction system changes or data migrations
  public shared ({ caller }) func reset_bot_stats(tokenIndex : Nat) : async Result.Result<(), Text> {
    if (caller != owner) {
      return #err("Only the owner can reset bot stats");
    };

    // Remove the bot from racing stats
    switch (garageManager.getStats(tokenIndex)) {
      case (?stats) {
        ignore Map.remove(stable_racing_stats, Map.nhash, tokenIndex);
        #ok(());
      };
      case (null) {
        #err("Bot not initialized");
      };
    };
  };

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

  // Get race details by race ID
  public query func get_race_by_id(raceId : Nat) : async ?RacingSimulator.Race {
    raceManager.getRace(raceId);
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
    }] = [];

    let nftId = Nat.toText(tokenIndex);

    // Iterate through races in reverse (newest first)
    let racesArray = Array.reverse(allRaces);

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
      var foundMore = false;
      label checkMoreLoop for (race in racesArray.vals()) {
        if (foundMore) { break checkMoreLoop };

        // Skip until we pass the last race we included
        switch (lastRaceId) {
          case (?lid) {
            if (race.raceId != lid) { continue checkMoreLoop };
            foundMore := true;
            continue checkMoreLoop;
          };
          case null { continue checkMoreLoop };
        };

        // Check if there's another race with this bot
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
  };

  // Manually force-finish a stuck race
  public shared ({ caller }) func force_finish_race(raceId : Nat) : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can force-finish races";
    };

    // Trigger the race finish handler directly
    let dummyActionId : TT.ActionId = { id = 0; time = Int.abs(Time.now()) };
    let _resultActionId = handleRaceFinish<system>(
      dummyActionId,
      {
        actionType = "race_finish";
        params = to_candid (raceId);
        retries = 0;
        aSync = null;
      },
    );

    "Force-finished race " # Nat.toText(raceId);
  };

  // Delete events and their associated races (cleanup duplicates)
  public shared ({ caller }) func delete_events_and_races(eventIds : [Nat]) : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can delete events";
    };

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

    "Deleted " # Nat.toText(deletedEvents) # " events, cancelled " # Nat.toText(deletedRaces) # " races, and cancelled " # Nat.toText(cancelledTimers) # " timers";
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

  // Admin function to find and trigger all stuck races (past start time but still Upcoming)
  public shared ({ caller }) func trigger_stuck_races() : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can trigger stuck races";
    };

    let now = Time.now();
    var triggeredCount = 0;
    var cancelledCount = 0;

    // Check all races
    for (raceId in Iter.range(0, 1000)) {
      // Check first 1000 races
      switch (raceManager.getRace(raceId)) {
        case (?race) {
          if (race.status == #Upcoming and race.startTime < now) {
            // Race should have started but didn't
            let actionId : TT.ActionId = { id = 0; time = 0 };
            let action : TT.Action = {
              actionType = "race_start";
              params = to_candid (raceId);
              aSync = null;
              retries = 0;
            };

            ignore handleRaceStart<system>(actionId, action);
            triggeredCount += 1;

            // Check if it was cancelled (no entries)
            switch (raceManager.getRace(raceId)) {
              case (?updatedRace) {
                if (updatedRace.status == #Cancelled) {
                  cancelledCount += 1;
                };
              };
              case (null) {};
            };
          };
        };
        case (null) {};
      };
    };

    "Triggered " # Nat.toText(triggeredCount) # " stuck races (" # Nat.toText(cancelledCount) # " cancelled due to insufficient entries)";
  };

  // Debug function to create a test race starting soon
  public shared ({ caller }) func debug_create_test_race(startInMinutes : Nat) : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can create test race";
    };

    let now = Time.now();
    let startTime = now + (startInMinutes * 60 * 1_000_000_000);
    let entryDeadline = startTime - (60 * 1_000_000_000); // 1 minute before start

    let race = raceManager.createRace(
      5, // distance
      #ScrapHeaps, // terrain
      #Scavenger, // raceClass
      5_000_000, // entryFee
      12, // maxEntries
      2, // minEntries
      startTime,
      50_000_000, // platformBonus
      entryDeadline,
    );

    // Schedule race start timer
    let raceStartActionId = tt().setActionSync<system>(
      Int.abs(startTime),
      {
        actionType = "race_start";
        params = to_candid (race.raceId);
      },
    );

    "Created test race #" # Nat.toText(race.raceId) # " starting at " # Int.toText(startTime) # " (timer action " # Nat.toText(raceStartActionId.id) # ")";
  };

  // Seed leaderboard with test data (debug only)
  public shared ({ caller }) func debug_seed_leaderboard(count : Nat) : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can seed leaderboard";
    };

    let now = Time.now();
    leaderboardManager.updateCurrentPeriods(now);

    // Generate sample entries for different bots
    let factions : [PokedBotsGarage.FactionType] = [
      #UltimateMaster,
      #Wild,
      #Golden,
      #Ultimate,
      #Blackhole,
      #Dead,
      #Master,
      #Bee,
      #Food,
      #Box,
      #Murder,
      #Game,
      #Animal,
      #Industrial,
    ];

    let divisions : [RacingSimulator.RaceClass] = [
      #Scavenger,
      #Raider,
      #Elite,
      #SilentKlan,
    ];

    var entriesCreated = 0;

    for (i in Iter.range(0, count - 1)) {
      let tokenIndex = i;
      let faction = factions[i % factions.size()];
      let division = divisions[i % divisions.size()];

      // Create some sample principal for testing
      let ownerPrincipal = Principal.fromText("aaaaa-aa");

      // Simulate multiple races with varying results
      let numRaces = (i % 10) + 5; // 5-15 races per bot

      for (raceNum in Iter.range(0, numRaces - 1)) {
        let position = ((i + raceNum) % 10) + 1; // Vary positions 1-10
        let totalRacers = 10;
        let earnings = if (position == 1) { 500_000 } else if (position == 2) {
          300_000;
        } else if (position == 3) { 200_000 } else { 0 };

        // Division-based multiplier
        let multiplier = switch (division) {
          case (#Scavenger) { 1.0 };
          case (#Raider) { 1.5 };
          case (#Elite) { 2.0 };
          case (#SilentKlan) { 3.0 };
        };

        leaderboardManager.recordRaceResult(
          tokenIndex,
          ownerPrincipal,
          position,
          totalRacers,
          earnings,
          multiplier,
          faction,
          division,
          now - (raceNum * 3600_000_000_000), // Space races out by hours
        );

        entriesCreated += 1;
      };
    };

    "Seeded leaderboard with " # Nat.toText(count) # " bots across " # Nat.toText(entriesCreated) # " race results";
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
  };

  // Initialize the hourly battery recharge timer (called on postupgrade or first install)
  func initializeRechargeTimer<system>() {
    // Check if we already have a recharge timer scheduled
    let existingActions = tt().getActionsByFilter(#ByType("hourly_recharge"));
    if (existingActions.size() == 0) {
      // No recharge timer exists, schedule the first one
      let now = Time.now();
      let firstRechargeTime = if (stable_last_recharge_time == 0) {
        // First install, schedule recharge in 1 hour
        Int.abs(now + (60 * 60 * 1_000_000_000));
      } else {
        // After upgrade, schedule based on last recharge
        let timeSinceLastRecharge = now - stable_last_recharge_time;
        let hourInNs = 60 * 60 * 1_000_000_000;
        if (timeSinceLastRecharge >= hourInNs) {
          // Overdue, schedule immediately
          Int.abs(now + 60_000_000_000); // 1 minute from now
        } else {
          // Schedule at next 1-hour mark
          Int.abs(stable_last_recharge_time + hourInNs);
        };
      };

      ignore tt().setActionSync<system>(
        firstRechargeTime,
        {
          actionType = "hourly_recharge";
          params = to_candid (());
        },
      );

      Debug.print("Recharge timer already exists, skipping initialization");
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

  initializeRechargeTimer<system>();
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
};
