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
import GarageStartScavenging "tools/garage_start_scavenging";
import GarageCompleteScavenging "tools/garage_complete_scavenging";
import RacingListRaces "tools/racing_list_races";
import RacingEnterRace "tools/racing_enter_race";
import RacingSponsorRace "tools/racing_sponsor_race";
import RacingGetRaceDetails "tools/racing_get_race_details";
import RacingGetBotRaces "tools/racing_get_bot_races";
import HelpGetCompendium "tools/help_get_compendium";

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

// Migration to add stats field to RaceEntry type - COMMENTED OUT AFTER MIGRATION COMPLETE
/*
(
  with migration = func(
    old_state : {
      stable_races : Map.Map<Nat, { raceId : Nat; name : Text; distance : Nat; terrain : RacingSimulator.Terrain; trackId : Nat; trackSeed : Nat; raceClass : RacingSimulator.RaceClass; entryFee : Nat; maxEntries : Nat; minEntries : Nat; startTime : Int; duration : Nat; entryDeadline : Int; createdAt : Int; entries : [{ nftId : Text; owner : Principal; entryFee : Nat; enteredAt : Int }]; status : RacingSimulator.RaceStatus; results : ?[RacingSimulator.RaceResult]; prizePool : Nat; platformTax : Nat; platformBonus : Nat; sponsors : [RacingSimulator.Sponsor] }>;
    };
  ) : {
    stable_races : Map.Map<Nat, RacingSimulator.Race>;
  } {
    // Copy stats from results to entries for live simulation
    let new_races = Map.new<Nat, RacingSimulator.Race>();
    for ((raceId, oldRace) in Map.entries(old_state.stable_races)) {
      // Migrate entries - add stats field, copying from results if available
      let migratedEntries = Array.map<{ nftId : Text; owner : Principal; entryFee : Nat; enteredAt : Int }, RacingSimulator.RaceEntry>(
        oldRace.entries,
        func(oldEntry) : RacingSimulator.RaceEntry {
          // Try to find stats from race results
          let statsFromResults : ?RacingSimulator.RacingStats = switch (oldRace.results) {
            case (?results) {
              // Find matching result by nftId
              let matchingResult = Array.find<RacingSimulator.RaceResult>(
                results,
                func(r) { r.nftId == oldEntry.nftId }
              );
              switch (matchingResult) {
                case (?result) { result.stats };
                case (null) { null };
              };
            };
            case (null) { null };
          };

          {
            nftId = oldEntry.nftId;
            owner = oldEntry.owner;
            entryFee = oldEntry.entryFee;
            enteredAt = oldEntry.enteredAt;
            stats = statsFromResults; // Copy stats from results or null
          };
        },
      );

      let newRace : RacingSimulator.Race = {
        raceId = oldRace.raceId;
        name = oldRace.name;
        distance = oldRace.distance;
        terrain = oldRace.terrain;
        raceClass = oldRace.raceClass;
        entryFee = oldRace.entryFee;
        maxEntries = oldRace.maxEntries;
        minEntries = oldRace.minEntries;
        startTime = oldRace.startTime;
        duration = oldRace.duration;
        entryDeadline = oldRace.entryDeadline;
        createdAt = oldRace.createdAt;
        entries = migratedEntries;
        status = oldRace.status;
        results = oldRace.results;
        prizePool = oldRace.prizePool;
        platformTax = oldRace.platformTax;
        platformBonus = oldRace.platformBonus;
        sponsors = oldRace.sponsors;
        trackId = oldRace.trackId;
        trackSeed = oldRace.trackSeed;
      };
      Map.set(new_races, Map.nhash, raceId, newRace);
    };

    {
      stable_races = new_races;
    };
  };
)
*/
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
      #Junker; // Entry tier: <1400
    };
  };

  /// Check if bot's current ELO matches race class requirements
  func checkEloEligibility(eloRating : Nat, raceClass : RacingSimulator.RaceClass) : Bool {
    switch (raceClass) {
      case (#Junker) { eloRating < 1400 };
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
            case (#Junker) { 1.0 }; // Base fee
            case (#Raider) { 2.0 }; // 2x
            case (#Elite) { 5.0 }; // 5x
            case (#SilentKlan) { 10.0 }; // 10x
          };

          let adjustedEntryFee = Int.abs(Float.toInt(Float.fromInt(event.metadata.entryFee) * classFeeMultiplier));

          // Apply scaled platform bonus to all classes to guarantee top 3 profitability
          let platformBonus : Nat = switch (event.eventType, division) {
            // Daily Sprint bonuses
            case (#DailySprint, #Junker) { 50_000_000 }; // 0.5 ICP
            case (#DailySprint, #Raider) { 60_000_000 }; // 0.6 ICP
            case (#DailySprint, #Elite) { 140_000_000 }; // 1.4 ICP
            // Weekly League bonuses
            case (#WeeklyLeague, #Junker) { 200_000_000 }; // 2.0 ICP
            case (#WeeklyLeague, #Raider) { 200_000_000 }; // 2.0 ICP
            case (#WeeklyLeague, #Elite) { 140_000_000 }; // 1.4 ICP
            case (#WeeklyLeague, #SilentKlan) { 280_000_000 }; // 2.8 ICP
            // Monthly Cup bonuses
            case (#MonthlyCup, #Elite) { 500_000_000 }; // 5.0 ICP
            case (#MonthlyCup, #SilentKlan) { 500_000_000 }; // 5.0 ICP
            // Fallback
            case _ { event.metadata.prizePoolBonus };
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

        if (existingAtTime.size() == 0) {
          ignore eventCalendar.createDailySprintEvent(nextSprint, now);
          Debug.print("Auto-scheduled Daily Sprint for timestamp: " # debug_show (nextSprint));
        } else {
          Debug.print("SKIP: Daily Sprint already exists at timestamp: " # debug_show (nextSprint));
        };

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
            // Allow all registered entries to race regardless of ELO changes
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
                  let participant : RacingSimulator.RacingParticipant = {
                    nftId = entry.nftId;
                    owner = entry.owner;
                    stats = stats;
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
              case (?results) {
                Debug.print("Race simulated at start, " # debug_show (results.size()) # " racers");

                // Store results immediately
                ignore raceManager.setRaceResults(raceId, results);

                // Find slowest finisher to determine actual race duration
                var slowestTime : Float = 0.0;
                for (result in results.vals()) {
                  if (result.finalTime > slowestTime) {
                    slowestTime := result.finalTime;
                  };
                };

                // Convert slowest time to nanoseconds and schedule finish
                let raceDurationNanos = Int.abs(Float.toInt(slowestTime * 1_000_000_000.0));
                let finishTime = race.startTime + raceDurationNanos;

                let finishActionId = tt().setActionSync<system>(
                  Int.abs(finishTime),
                  {
                    actionType = "race_finish";
                    params = to_candid (raceId);
                  },
                );
                Debug.print("Scheduled race_finish action " # debug_show (finishActionId) # " for race " # debug_show (raceId) # " at " # debug_show (finishTime) # " (slowest time: " # Float.toText(slowestTime) # "s)");
              };
              case (null) {
                Debug.print("Error: Failed to simulate race at start");
                // Fallback to estimated duration
                let finishTime = race.startTime + (race.duration * 1_000_000_000);
                let finishActionId = tt().setActionSync<system>(
                  Int.abs(finishTime),
                  {
                    actionType = "race_finish";
                    params = to_candid (raceId);
                  },
                );
                Debug.print("Scheduled race_finish action (fallback) " # debug_show (finishActionId) # " for race " # debug_show (raceId) # " at " # debug_show (finishTime));
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
  func handleRaceFinish<system>(actionId : TT.ActionId, action : TT.Action) : TT.ActionId {
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
                return actionId;
              };
              case _ {};
            };

            // Results were already simulated and stored at race start
            // Just retrieve them and apply consequences (ELO, stats, prizes)
            Debug.print("Applying race results simulated at race start");

            switch (race.results) {
              case (null) {
                Debug.print("Error: No results found for race " # debug_show (raceId) # " - race may not have been properly started");
                return actionId;
              };
              case (?results) {
                if (results.size() == 0) {
                  Debug.print("Error: Empty results array for race " # debug_show (raceId));
                  return actionId;
                };

                Debug.print("Applying race results, " # debug_show (results.size()) # " racers");

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
                  // First upgrade costs 100 parts, achievable in ~7-15 Junker races
                  let baseParts : Nat = switch (race.raceClass) {
                    case (#Junker) { 5 }; // Entry: 2.5-15 parts per race (winner: 15, participation: 2.5)
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
    HelpGetCompendium.config(),
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
    GarageStartScavenging.config(),
    GarageCompleteScavenging.config(),
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
      ("help_get_compendium", HelpGetCompendium.handle(toolContext)),
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
      ("garage_start_scavenging", GarageStartScavenging.handle(toolContext)),
      ("garage_complete_scavenging", GarageCompleteScavenging.handle(toolContext)),
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

  /// Find all races that are not associated with any event
  /// Useful for finding orphaned races created outside the event system
  public query func get_orphaned_races() : async [{
    raceId : Nat;
    name : Text;
    raceClass : RacingSimulator.RaceClass;
    status : RacingSimulator.RaceStatus;
    startTime : Int;
    entries : Nat;
  }] {
    let allRaces = raceManager.getAllRaces();
    let allEvents = eventCalendar.getAllEvents();

    // Build a set of all race IDs that belong to events
    var eventRaceIds : [Nat] = [];
    for (event in allEvents.vals()) {
      eventRaceIds := Array.append(eventRaceIds, event.raceIds);
    };

    // Filter races that are NOT in any event
    let standaloneRaces = Array.filter<RacingSimulator.Race>(
      allRaces,
      func(race) {
        let isInEvent = Array.find<Nat>(eventRaceIds, func(id) { id == race.raceId });
        not Option.isSome(isInEvent);
      },
    );

    // Map to simplified output
    Array.map<RacingSimulator.Race, { raceId : Nat; name : Text; raceClass : RacingSimulator.RaceClass; status : RacingSimulator.RaceStatus; startTime : Int; entries : Nat }>(
      standaloneRaces,
      func(race) {
        {
          raceId = race.raceId;
          name = race.name;
          raceClass = race.raceClass;
          status = race.status;
          startTime = race.startTime;
          entries = race.entries.size();
        };
      },
    );
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

  // --- RACE REPLAY DATA ---

  /// Get race replay data for deterministic frontend replay
  /// Returns track info, race seed, and participants for frontend simulation
  public query func get_race_replay_data(raceId : Nat) : async ?{
    raceId : Nat;
    trackId : Nat;
    trackSeed : Nat;
    track : {
      trackId : Nat;
      name : Text;
      description : Text;
      totalDistance : Nat;
      primaryTerrain : RacingSimulator.Terrain;
      laps : Nat;
      segments : [{
        length : Nat;
        angle : Int;
        terrain : RacingSimulator.Terrain;
        difficulty : Float;
      }];
    };
    participants : [{
      nftId : Text;
      owner : Principal;
      stats : {
        speed : Nat;
        powerCore : Nat;
        acceleration : Nat;
        stability : Nat;
      };
    }];
    results : ?[{
      nftId : Text;
      owner : Principal;
      position : Nat;
      finalTime : Float;
      prizeAmount : Nat;
    }];
  } {
    switch (raceManager.getRace(raceId)) {
      case (?race) {
        // Get track template
        let trackOpt = RacingSimulator.getTrack(race.trackId);
        switch (trackOpt) {
          case (?trackTemplate) {
            // Convert participants
            var participantData : [{
              nftId : Text;
              owner : Principal;
              stats : {
                speed : Nat;
                powerCore : Nat;
                acceleration : Nat;
                stability : Nat;
              };
            }] = [];

            for (entry in race.entries.vals()) {
              switch (garageManager.getRacingStatsWithTerrain(entry.nftId, race.terrain)) {
                case (?stats) {
                  participantData := Array.append(
                    participantData,
                    [{
                      nftId = entry.nftId;
                      owner = entry.owner;
                      stats = {
                        speed = stats.speed;
                        powerCore = stats.powerCore;
                        acceleration = stats.acceleration;
                        stability = stats.stability;
                      };
                    }],
                  );
                };
                case (null) {};
              };
            };

            // Convert results if they exist
            let resultsData = switch (race.results) {
              case (?results) {
                ?Array.map<RacingSimulator.RaceResult, { nftId : Text; owner : Principal; position : Nat; finalTime : Float; prizeAmount : Nat }>(
                  results,
                  func(r) {
                    {
                      nftId = r.nftId;
                      owner = r.owner;
                      position = r.position;
                      finalTime = r.finalTime;
                      prizeAmount = r.prizeAmount;
                    };
                  },
                );
              };
              case (null) { null };
            };

            // Convert track segments
            let segmentData = Array.map<RacingSimulator.TrackSegment, { length : Nat; angle : Int; terrain : RacingSimulator.Terrain; difficulty : Float }>(
              trackTemplate.segments,
              func(seg) {
                {
                  length = seg.length;
                  angle = seg.angle;
                  terrain = seg.terrain;
                  difficulty = seg.difficulty;
                };
              },
            );

            ?{
              raceId = race.raceId;
              trackId = race.trackId;
              trackSeed = race.trackSeed;
              track = {
                trackId = trackTemplate.trackId;
                name = trackTemplate.name;
                description = trackTemplate.description;
                totalDistance = trackTemplate.totalDistance;
                primaryTerrain = trackTemplate.primaryTerrain;
                laps = trackTemplate.laps;
                segments = segmentData;
              };
              participants = participantData;
              results = resultsData;
            };
          };
          case (null) { null };
        };
      };
      case (null) { null };
    };
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

  /// Debug: Test simulate a race with specific bots and track
  /// Returns backend-calculated times for validation
  public query func debug_test_simulation(
    tokenIndexes : [Nat],
    trackId : Nat,
    trackSeed : Nat,
  ) : async ?{
    results : [{
      tokenIndex : Nat;
      finalTime : Float;
    }];
  } {
    // Get track to determine terrain
    let trackOpt = RacingSimulator.getTrack(trackId);
    let terrain = switch (trackOpt) {
      case (?track) { track.primaryTerrain };
      case (null) { #ScrapHeaps }; // Fallback
    };

    // Get stats for all bots at 100% battery/condition with terrain bonuses applied
    // This matches what the frontend simulator uses (stats from get_bot_profile + bonuses)
    let participants = Array.mapFilter<Nat, RacingSimulator.RacingParticipant>(
      tokenIndexes,
      func(tokenIndex : Nat) : ?RacingSimulator.RacingParticipant {
        let nftId = Nat.toText(tokenIndex);
        switch (garageManager.getStatsAt100WithTerrain(nftId, terrain)) {
          case (?stats) {
            ?{
              nftId = nftId;
              owner = Principal.fromText("aaaaa-aa"); // Dummy owner for test
              stats = stats;
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
    let distance = 15000; // 15km in meters
    let duration = raceSimulator.calculateRaceDuration(distance, terrain);

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
      startTime = 0;
      entryDeadline = 0;
      status = #InProgress;
      entries = [];
      results = null;
      createdAt = 0;
      raceClass = #Junker;
      sponsors = [];
    };

    // Simulate the race
    switch (raceSimulator.simulateRaceSegmented(testRace, participants)) {
      case (?results) {
        let formattedResults = Array.map<RacingSimulator.RaceResult, { tokenIndex : Nat; finalTime : Float }>(
          results,
          func(result : RacingSimulator.RaceResult) : {
            tokenIndex : Nat;
            finalTime : Float;
          } {
            let tokenIndex = switch (Nat.fromText(result.nftId)) {
              case (?idx) { idx };
              case null { 0 };
            };
            {
              tokenIndex = tokenIndex;
              finalTime = result.finalTime;
            };
          },
        );
        ?{ results = formattedResults };
      };
      case null { null };
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
  /// Returns detailed results for balance testing
  public query func debug_simulate_race(
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
    analysis : {
      winner : Nat;
      winnerTime : Float;
      lastPlaceTime : Float;
      timeSpread : Float;
      avgTime : Float;
    };
  } {
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
          let participant : RacingSimulator.RacingParticipant = {
            nftId = nftId;
            owner = Principal.fromText("aaaaa-aa"); // Dummy principal for simulation
            stats = statsAt100;
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
      prizePool = 0;
      platformTax = 0;
      platformBonus = 0;
      sponsors = [];
    };

    // Simulate the race
    let simulator = RacingSimulator.RaceSimulator();
    switch (simulator.simulateRaceSegmented(mockRace, participants)) {
      case (?results) {
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
    faction : PokedBotsGarage.FactionType;
    raceClass : RacingSimulator.RaceClass;
    preferredTerrain : RacingSimulator.Terrain;
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
        // Show stats at 100% (no battery/condition penalties visible to others)
        let baseStats = garageManager.getBaseStats(tokenIndex);
        let statsAt100 = {
          speed = baseStats.speed + botStats.speedBonus;
          powerCore = baseStats.powerCore + botStats.powerCoreBonus;
          acceleration = baseStats.acceleration + botStats.accelerationBonus;
          stability = baseStats.stability + botStats.stabilityBonus;
        };
        // Calculate rating based on stats at 100%
        let totalStats = statsAt100.speed + statsAt100.powerCore + statsAt100.acceleration + statsAt100.stability;
        let rating = totalStats / 4;
        let raceClass = getRaceClassFromElo(botStats.eloRating);

        ?{
          tokenIndex = tokenIndex;
          name = botStats.name;
          owner = ?botStats.ownerPrincipal;
          faction = botStats.faction;
          raceClass = raceClass;
          preferredTerrain = botStats.preferredTerrain;
          stats = {
            speed = statsAt100.speed;
            powerCore = statsAt100.powerCore;
            acceleration = statsAt100.acceleration;
            stability = statsAt100.stability;
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

  // Get upcoming events with race summaries
  public query func get_upcoming_events_with_races(daysAhead : Nat) : async [{
    event : RaceCalendar.ScheduledEvent;
    raceSummary : {
      totalRaces : Nat;
      terrains : [RacingSimulator.Terrain];
      distances : [Nat];
      totalParticipants : Nat;
    };
  }] {
    let now = Time.now();
    let events = eventCalendar.getUpcomingEvents(now, daysAhead);

    Array.map<RaceCalendar.ScheduledEvent, { event : RaceCalendar.ScheduledEvent; raceSummary : { totalRaces : Nat; terrains : [RacingSimulator.Terrain]; distances : [Nat]; totalParticipants : Nat } }>(
      events,
      func(event) {
        var terrains : [RacingSimulator.Terrain] = [];
        var distances : [Nat] = [];
        var totalParticipants : Nat = 0;

        for (raceId in event.raceIds.vals()) {
          switch (raceManager.getRace(raceId)) {
            case (?race) {
              terrains := Array.append(terrains, [race.terrain]);
              distances := Array.append(distances, [race.distance]);
              totalParticipants += race.entries.size();
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

  // Admin function to clear race IDs from events so new races can be created
  public shared ({ caller }) func clear_event_race_ids() : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can clear event race IDs";
    };

    let allEvents = eventCalendar.getAllEvents();
    var clearedCount = 0;

    for (event in allEvents.vals()) {
      if (event.raceIds.size() > 0) {
        // Check if any of the race IDs actually exist
        var hasValidRaces = false;
        for (raceId in event.raceIds.vals()) {
          switch (raceManager.getRace(raceId)) {
            case (?_race) { hasValidRaces := true };
            case (null) {};
          };
        };

        // If none of the race IDs are valid, clear them
        if (not hasValidRaces) {
          ignore eventCalendar.clearEventRaces(event.eventId);
          clearedCount += 1;
        };
      };
    };

    "Cleared race IDs from " # Nat.toText(clearedCount) # " events";
  };

  // Admin function to manually trigger race creation
  public shared ({ caller }) func trigger_race_creation() : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can trigger race creation";
    };

    let actionId : TT.ActionId = { id = 0; time = 0 };
    let action : TT.Action = {
      actionType = "race_create";
      params = to_candid (());
      aSync = null;
      retries = 0;
    };

    ignore handleRaceCreation<system>(actionId, action);
    "Race creation handler triggered";
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

  // Delete all events and races created after a specific event ID
  public shared ({ caller }) func delete_events_after(afterEventId : Nat) : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can delete events";
    };

    let allEvents = eventCalendar.getAllEvents();
    var eventIdsToDelete : [Nat] = [];

    // Collect event IDs after the specified ID
    for (event in allEvents.vals()) {
      if (event.eventId > afterEventId) {
        eventIdsToDelete := Array.append(eventIdsToDelete, [event.eventId]);
      };
    };

    // Use existing delete function
    let result = await delete_events_and_races_internal(eventIdsToDelete);
    return "Deleted " # Nat.toText(eventIdsToDelete.size()) # " events after ID " # Nat.toText(afterEventId) # ": " # result;
  };

  // Delete all orphaned races and rollback their results
  public shared ({ caller }) func delete_orphaned_races() : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can delete orphaned races";
    };

    let allRaces = raceManager.getAllRaces();
    let allEvents = eventCalendar.getAllEvents();

    // Build a set of all race IDs that belong to events
    var eventRaceIds : [Nat] = [];
    for (event in allEvents.vals()) {
      eventRaceIds := Array.append(eventRaceIds, event.raceIds);
    };

    // Find and delete orphaned races
    var deletedCount = 0;
    var rolledBackCount = 0;

    for (race in allRaces.vals()) {
      let isInEvent = Array.find<Nat>(eventRaceIds, func(id) { id == race.raceId });
      if (not Option.isSome(isInEvent)) {
        // This is an orphaned race

        // If the race was completed, rollback the results
        if (race.status == #Completed) {
          switch (race.results) {
            case (?results) {
              // Rollback stats for each participant
              for (result in results.vals()) {
                switch (Nat.fromText(result.nftId)) {
                  case (?tokenIndex) {
                    switch (garageManager.getStats(tokenIndex)) {
                      case (?stats) {
                        // Rollback race count
                        let newRacesEntered = if (stats.racesEntered > 0) {
                          stats.racesEntered - 1;
                        } else {
                          0;
                        };

                        // Rollback wins/places/shows
                        var newWins = stats.wins;
                        var newPlaces = stats.places;
                        var newShows = stats.shows;

                        if (result.position == 1 and newWins > 0) {
                          newWins -= 1;
                        } else if (result.position == 2 and newPlaces > 0) {
                          newPlaces -= 1;
                        } else if (result.position == 3 and newShows > 0) {
                          newShows -= 1;
                        };

                        // Rollback earnings
                        let newEarnings = if (stats.totalScrapEarned >= result.prizeAmount) {
                          stats.totalScrapEarned - result.prizeAmount;
                        } else {
                          0;
                        };

                        // Rollback ELO (reverse the change)
                        // Since we don't store the old ELO, we'll just reset to starting ELO if they only have 1 race
                        let newElo = if (newRacesEntered == 0) {
                          1500; // Reset to starting ELO
                        } else {
                          stats.eloRating; // Keep current ELO if they have other races
                        };

                        // Update the stats
                        let updatedStats : PokedBotsGarage.PokedBotRacingStats = {
                          stats with
                          racesEntered = newRacesEntered;
                          wins = newWins;
                          places = newPlaces;
                          shows = newShows;
                          totalScrapEarned = newEarnings;
                          eloRating = newElo;
                        };

                        ignore Map.put(stable_racing_stats, Map.nhash, tokenIndex, updatedStats);
                        rolledBackCount += 1;
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

        // Delete the race
        if (raceManager.deleteRace(race.raceId)) {
          deletedCount += 1;
        };
      };
    };

    "Deleted " # Nat.toText(deletedCount) # " orphaned races and rolled back stats for " # Nat.toText(rolledBackCount) # " participants";
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

                      leaderboardManager.recordRaceResult(
                        tokenIndex,
                        result.owner,
                        position,
                        results.size(),
                        result.prizeAmount,
                        1.0, // pointsMultiplier
                        botStats.faction,
                        race.raceClass,
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

    "Recalculated stats for " # Nat.toText(updatedCount) # " bots and updated leaderboards with " # Nat.toText(leaderboardUpdates) # " entries from " # Nat.toText(validRaceIds.size()) # " valid races";
  };

  // Reset all bot ELOs to 1500
  public shared ({ caller }) func reset_all_elos() : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can reset ELOs";
    };

    var resetCount = 0;
    for ((tokenIndex, stats) in Map.entries(stable_racing_stats)) {
      let updatedStats : PokedBotsGarage.PokedBotRacingStats = {
        stats with
        eloRating = 1500;
      };
      ignore Map.put(stable_racing_stats, Map.nhash, tokenIndex, updatedStats);
      resetCount += 1;
    };

    "Reset ELO to 1500 for " # Nat.toText(resetCount) # " bots";
  };

  // Reattach orphaned races to an event
  public shared ({ caller }) func reattach_races_to_event(eventId : Nat, raceIds : [Nat]) : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can reattach races";
    };

    switch (eventCalendar.addRacesToEvent(eventId, raceIds)) {
      case (?updatedEvent) {
        "Successfully added " # Nat.toText(raceIds.size()) # " races to event #" # Nat.toText(eventId) # ". Event now has " # Nat.toText(updatedEvent.raceIds.size()) # " total races.";
      };
      case (null) {
        "Event #" # Nat.toText(eventId) # " not found";
      };
    };
  };

  // Manually trigger the event creation handler
  public shared ({ caller }) func trigger_event_creation() : async Text {
    if (caller != owner) {
      return "Unauthorized: only owner can trigger event creation";
    };

    let now = Time.now();

    // Call the event scheduling function
    ensureCalendarScheduled<system>(now);

    // Get upcoming events to show what was created
    let upcomingEvents = eventCalendar.getUpcomingEvents(now, 14);

    "Event creation triggered. Total upcoming events: " # Nat.toText(upcomingEvents.size());
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
      #Junker, // raceClass
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
      #Junker,
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
          case (#Junker) { 1.0 };
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

    // Note: Overcharge migration completed - all bots now have overcharge field
    // No longer need to reset overcharge on every upgrade

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
