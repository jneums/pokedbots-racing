import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import _Hash "mo:base/Hash";
import Buffer "mo:base/Buffer";
import _Char "mo:base/Char";
import Map "mo:map/Map";
import { nhash } "mo:map/Map";

/// RacingSimulator - Collection-Agnostic Racing Engine
/// This module provides generic racing functionality that can work with any NFT collection.
/// Collections provide stats via the RacingStatsProvider interface.
module {

  // ===== FACTION TYPES (for affinity calculations) =====

  public type FactionType = {
    #UltimateMaster;
    #Wild;
    #Golden;
    #Ultimate;
    #Blackhole;
    #Dead;
    #Master;
    #Bee;
    #Food;
    #Box;
    #Murder;
    #Game;
    #Animal;
    #Industrial;
  };

  // ===== GENERIC RACING TYPES =====

  /// Core racing statistics - the only data needed to simulate a race
  public type RacingStats = {
    speed : Nat; // Base: 10-68, max with upgrades: 100+
    powerCore : Nat; // Base: 6-74, max with upgrades: 100+ (endurance)
    acceleration : Nat; // Base: 11-73, max with upgrades: 100+
    stability : Nat; // Base: 6-69, max with upgrades: 100+
    luck : Nat; // Base: 10-50 (derived from tokenIndex % 100 / 2), max with upgrades: 100+
    // Maintenance buffs (snapshotted at race start for visualization)
    overcharge : Nat; // 0-40, consumed in race for stat boost
    perfectTuneUp : Bool; // True if repaired at resonance, removes overcharge penalties
  };

  // ===== DAILY PHENOMENA SYSTEM =====

  public type DailyPhenomenon = {
    #SolarFlare; // Day 0 - Power Core modulo pattern
    #RustStorm; // Day 1 - Stability modulo pattern
    #MetalResonance; // Day 2 - Speed modulo, prime tokens
    #GravityFlux; // Day 3 - Acceleration modulo
    #ScrapTornado; // Day 4 - Wild faction + token % 100 < 20
    #DeadZone; // Day 5 - Dead faction + token contains 6/13
    #GoldenHour; // Day 6 - Golden faction + token % 7 == 0
    #MachineGhost; // Day 7 - Ultimate/Master + token > 5000
    #BloodMoon; // Day 8 - Murder faction + token % 9 == 0
    #BinarySurge; // Day 9 - Balanced stats (spread <= 10)
    #ChaosPulse; // Day 10 - Token % 11 == 0 + luck stat bonus
    #MomentumShift; // Day 11 - Bracket-relative underdogs (avg % 10)
    #BlackholeSingularity; // Day 12 - Blackhole faction + token % 13 == 0
  };

  public type DailyPhenomenonInfo = {
    phenomenon : DailyPhenomenon;
    name : Text;
    description : Text;
    emoji : Text;
    dayInCycle : Nat;
  };

  // ===== LUCK PROC TYPES =====

  public type LuckProcType = {
    #Minor : { boost : Float; description : Text }; // +15%, 1 segment
    #Major : { boost : Float; description : Text }; // +25%, 3 segments
    #Legendary : { boost : Float; description : Text }; // +40%, 5 segments
  };

  public type ActiveLuckBuff = {
    procType : LuckProcType;
    appliedAtSegment : Nat;
    remainingDuration : Nat;
  };

  /// A participant in a race - collection-agnostic
  public type RacingParticipant = {
    nftId : Text; // Generic NFT identifier
    tokenIndex : Nat; // Token index for luck/affinity calculations
    owner : Principal;
    stats : RacingStats;
    faction : FactionType; // Faction for daily affinity
    baseAvgRating : ?Nat; // Optional: raw avg rating without terrain/faction bonuses (for MomentumShift)
  };

  // ===== TERRAIN & DISTANCE TYPES =====

  public type Terrain = {
    #ScrapHeaps;
    #WastelandSand;
    #MetalRoads;
  };

  public type Distance = {
    #ShortSprint; // < 10km
    #MediumHaul; // 10-20km
    #LongTrek; // > 20km
  };

  // ===== TRACK & SEGMENT TYPES =====

  /// A segment of a track
  public type TrackSegment = {
    length : Nat; // meters
    angle : Int; // -45 to 45 degrees (negative = downhill, positive = uphill)
    terrain : Terrain; // Terrain type for this segment
    difficulty : Float; // 0.8-1.2 multiplier for this segment
  };

  /// A track template that can be instantiated with variance
  public type TrackTemplate = {
    trackId : Nat;
    name : Text;
    description : Text;
    totalDistance : Nat; // meters
    primaryTerrain : Terrain;
    laps : Nat; // 1 for point-to-point, 2+ for circuits
    segments : [TrackSegment]; // One lap's worth of segments
  };

  // ===== RACE TYPES =====

  public type RaceClass = {
    #Scrap; // <1200 ELO
    #Junker; // 1200-1399 ELO
    #Raider; // 1400-1599 ELO
    #Elite; // 1600-1799 ELO
    #SilentKlan; // 1800+ ELO
  };

  public type RaceStatus = {
    #Upcoming;
    #InProgress;
    #Completed;
    #Cancelled;
  };

  public type RaceEntry = {
    nftId : Text;
    owner : Principal;
    entryFee : Nat;
    enteredAt : Int;
    stats : ?RacingStats; // Stats snapshot at race start (includes buffs/penalties)
  };

  public type RaceResult = {
    nftId : Text;
    owner : Principal;
    position : Nat;
    finalTime : Float;
    prizeAmount : Nat;
    partsEarned : Nat; // Parts awarded based on position
    partType : Text; // Type of part ("SpeedChip", "PowerCoreFragment", etc.)
    stats : ?RacingStats; // Stats used in the race (for accurate replay)
  };

  /// Race event types for announcer commentary and recaps
  public type RaceEventType = {
    #Overtake : { overtaker : Text; overtaken : Text }; // Bot X passes Bot Y
    #LeadChange : { newLeader : Text; previousLeader : Text }; // New race leader
    #LargeGap : { leader : Text; gapSeconds : Float }; // Leader pulls away significantly
    #CloseRacing : { bots : [Text]; gapSeconds : Float }; // Tight battle between bots
    #ExceptionalPerformance : { bot : Text; performancePct : Float }; // Lucky segment (>103%)
    #PoorPerformance : { bot : Text; performancePct : Float }; // Unlucky segment (<97%)
    #SegmentComplete : { segmentIndex : Nat; leader : Text }; // Segment milestone
    #LuckProc : { bot : Text; procType : Text; boost : Float }; // Luck proc triggered (Minor/Major/Legendary)
    #BadLuck : { bot : Text; incidentType : Text; penalty : Float }; // Bad luck incident (low luck bots)
  };

  public type RaceEvent = {
    eventType : RaceEventType;
    timestamp : Float; // Elapsed race time in seconds
    segmentIndex : Nat; // Which segment this occurred in
    description : Text; // Human-readable description
  };

  public type Sponsor = {
    sponsor : Principal;
    amount : Nat;
    message : ?Text;
    timestamp : Int;
  };

  public type Race = {
    raceId : Nat;
    name : Text;
    distance : Nat; // km
    terrain : Terrain;
    trackId : Nat; // Which track template to use
    trackSeed : Nat; // Seed for deterministic variance
    raceClass : RaceClass;
    entryFee : Nat; // ICP e8s
    maxEntries : Nat;
    minEntries : Nat; // Minimum entries to run
    startTime : Int;
    duration : Nat; // seconds
    entryDeadline : Int;
    createdAt : Int;
    entries : [RaceEntry];
    status : RaceStatus;
    results : ?[RaceResult];
    events : [RaceEvent]; // Race commentary events
    prizePool : Nat;
    platformTax : Nat; // 5% taken
    platformBonus : Nat; // Platform bonus for Junker/Raider classes
    sponsors : [Sponsor];
  };

  // ===== RACING STATS PROVIDER INTERFACE =====

  /// Interface that collections must implement to participate in racing
  public type RacingStatsProvider = {
    /// Get current racing stats for an NFT
    getRacingStats : (nftId : Text) -> ?RacingStats;

    /// Check if NFT can race (condition, battery, etc.)
    canRace : (nftId : Text) -> Bool;

    /// Update post-race (optional - for collections that track career stats)
    recordRaceResult : (nftId : Text, position : Nat, racers : Nat, prize : Nat) -> ();

    /// Deduct racing costs (battery drain and condition wear based on race difficulty)
    applyRaceCosts : (nftId : Text, distance : Nat, terrain : Terrain, position : Nat) -> ();
  };

  // ===== TRACK LIBRARY =====

  /// Get track template by ID
  public func getTrack(trackId : Nat) : ?TrackTemplate {
    switch (trackId) {
      case (1) { ?SCRAP_MOUNTAIN_CIRCUIT };
      case (2) { ?HIGHWAY_OF_THE_DEAD };
      case (3) { ?WASTELAND_GAUNTLET };
      case (4) { ?JUNKYARD_SPRINT };
      case (5) { ?METAL_MESA_LOOP };
      case (6) { ?DUNE_RUNNER };
      case (7) { ?RUST_BELT_RALLY };
      case (8) { ?DEBRIS_FIELD_DASH };
      case (9) { ?VELOCITY_VIADUCT };
      case (10) { ?SANDSTORM_CIRCUIT };
      case (11) { ?DESERT_SPRINT };
      case (12) { ?WASTELAND_ODYSSEY };
      case (13) { ?IRON_CRUCIBLE };
      case (14) { ?ENDLESS_EXPANSE };
      case (15) { ?SURVIVAL_GAUNTLET };
      case (_) { null };
    };
  };

  /// Track 1: Scrap Mountain Circuit (ScrapHeaps, technical)
  private let SCRAP_MOUNTAIN_CIRCUIT : TrackTemplate = {
    trackId = 1;
    name = "Scrap Mountain Circuit";
    description = "Technical climb through unstable debris";
    totalDistance = 10600; // 15 segments × 2 laps
    primaryTerrain = #ScrapHeaps;
    laps = 2;
    segments = [
      { length = 500; angle = 5; terrain = #ScrapHeaps; difficulty = 1.0 }, // Approach
      { length = 400; angle = 12; terrain = #ScrapHeaps; difficulty = 1.1 }, // Initial climb
      { length = 300; angle = 18; terrain = #ScrapHeaps; difficulty = 1.15 }, // Steep section
      { length = 350; angle = -8; terrain = #ScrapHeaps; difficulty = 1.05 }, // Quick descent
      { length = 250; angle = 0; terrain = #ScrapHeaps; difficulty = 1.2 }, // Technical flat
      { length = 400; angle = 15; terrain = #ScrapHeaps; difficulty = 1.12 }, // Mid climb
      { length = 300; angle = -5; terrain = #ScrapHeaps; difficulty = 1.08 }, // Rolling section
      { length = 200; angle = 0; terrain = #ScrapHeaps; difficulty = 1.15 }, // Tight corner
      { length = 350; angle = 8; terrain = #ScrapHeaps; difficulty = 1.1 }, // Climb continuation
      { length = 450; angle = 22; terrain = #ScrapHeaps; difficulty = 1.25 }, // Summit push
      { length = 500; angle = -12; terrain = #ScrapHeaps; difficulty = 1.0 }, // Fast descent start
      { length = 400; angle = -18; terrain = #ScrapHeaps; difficulty = 0.95 }, // Steep drop
      { length = 350; angle = -15; terrain = #ScrapHeaps; difficulty = 1.0 }, // Continued descent
      { length = 300; angle = -7; terrain = #ScrapHeaps; difficulty = 1.1 }, // Rolling down
      { length = 250; angle = -15; terrain = #ScrapHeaps; difficulty = 1.05 } // Final descent
    ];
  };

  /// Track 2: Highway of the Dead (MetalRoads, speed)
  private let HIGHWAY_OF_THE_DEAD : TrackTemplate = {
    trackId = 2;
    name = "Highway of the Dead";
    description = "Rusted highways with occasional debris obstacles";
    totalDistance = 6700;
    primaryTerrain = #MetalRoads;
    laps = 1;
    segments = [
      { length = 800; angle = 0; terrain = #MetalRoads; difficulty = 0.85 },
      { length = 700; angle = 0; terrain = #MetalRoads; difficulty = 0.9 },
      { length = 600; angle = -3; terrain = #MetalRoads; difficulty = 0.82 },
      { length = 500; angle = -5; terrain = #MetalRoads; difficulty = 0.8 },
      { length = 400; angle = 3; terrain = #ScrapHeaps; difficulty = 1.15 },
      { length = 500; angle = 5; terrain = #ScrapHeaps; difficulty = 1.2 },
      { length = 600; angle = 0; terrain = #MetalRoads; difficulty = 0.88 },
      { length = 700; angle = 0; terrain = #MetalRoads; difficulty = 0.9 },
      { length = 500; angle = 0; terrain = #MetalRoads; difficulty = 0.92 },
      { length = 450; angle = 0; terrain = #MetalRoads; difficulty = 0.95 },
      { length = 550; angle = 0; terrain = #MetalRoads; difficulty = 0.85 },
      { length = 400; angle = 0; terrain = #MetalRoads; difficulty = 0.9 },
    ];
  };

  /// Track 3: Wasteland Gauntlet (WastelandSand, endurance)
  private let WASTELAND_GAUNTLET : TrackTemplate = {
    trackId = 3;
    name = "Wasteland Gauntlet";
    description = "Endurance test through deep sand";
    totalDistance = 12600;
    primaryTerrain = #WastelandSand;
    laps = 1;
    segments = [
      { length = 1000; angle = 0; terrain = #WastelandSand; difficulty = 1.1 },
      { length = 800; angle = 3; terrain = #WastelandSand; difficulty = 1.15 },
      { length = 700; angle = 8; terrain = #WastelandSand; difficulty = 1.22 },
      { length = 900; angle = 12; terrain = #WastelandSand; difficulty = 1.25 },
      { length = 600; angle = -5; terrain = #WastelandSand; difficulty = 1.12 },
      { length = 800; angle = 0; terrain = #WastelandSand; difficulty = 1.18 },
      { length = 700; angle = 0; terrain = #WastelandSand; difficulty = 1.15 },
      { length = 650; angle = -4; terrain = #WastelandSand; difficulty = 1.08 },
      { length = 750; angle = -8; terrain = #WastelandSand; difficulty = 1.05 },
      { length = 900; angle = 0; terrain = #WastelandSand; difficulty = 1.2 },
      { length = 800; angle = 5; terrain = #WastelandSand; difficulty = 1.22 },
      { length = 700; angle = 8; terrain = #WastelandSand; difficulty = 1.25 },
      { length = 600; angle = -10; terrain = #WastelandSand; difficulty = 1.1 },
      { length = 500; angle = -5; terrain = #WastelandSand; difficulty = 1.08 },
      { length = 900; angle = 0; terrain = #WastelandSand; difficulty = 1.12 },
      { length = 700; angle = 0; terrain = #WastelandSand; difficulty = 1.1 },
      { length = 600; angle = -4; terrain = #WastelandSand; difficulty = 1.05 },
    ];
  };

  /// Track 4: Junkyard Sprint (ScrapHeaps, short/aggressive)
  private let JUNKYARD_SPRINT : TrackTemplate = {
    trackId = 4;
    name = "Junkyard Sprint";
    description = "Short aggressive circuit";
    totalDistance = 4470;
    primaryTerrain = #ScrapHeaps;
    laps = 3;
    segments = [
      { length = 200; angle = 0; terrain = #ScrapHeaps; difficulty = 1.05 },
      { length = 150; angle = 5; terrain = #ScrapHeaps; difficulty = 1.1 },
      { length = 180; angle = 8; terrain = #ScrapHeaps; difficulty = 1.15 },
      { length = 160; angle = 12; terrain = #ScrapHeaps; difficulty = 1.2 },
      { length = 140; angle = -6; terrain = #ScrapHeaps; difficulty = 1.12 },
      { length = 170; angle = -10; terrain = #ScrapHeaps; difficulty = 1.08 },
      { length = 150; angle = -5; terrain = #ScrapHeaps; difficulty = 1.1 },
      { length = 180; angle = 0; terrain = #ScrapHeaps; difficulty = 1.15 },
      { length = 160; angle = -4; terrain = #ScrapHeaps; difficulty = 1.05 },
    ];
  };

  /// Track 5: Metal Mesa Loop (MetalRoads, balanced)
  private let METAL_MESA_LOOP : TrackTemplate = {
    trackId = 5;
    name = "Metal Mesa Loop";
    description = "Mixed terrain balanced circuit";
    totalDistance = 7600;
    primaryTerrain = #MetalRoads;
    laps = 2;
    segments = [
      { length = 400; angle = 0; terrain = #MetalRoads; difficulty = 0.92 },
      { length = 350; angle = 0; terrain = #MetalRoads; difficulty = 0.95 },
      { length = 300; angle = 3; terrain = #MetalRoads; difficulty = 0.98 },
      { length = 250; angle = 8; terrain = #ScrapHeaps; difficulty = 1.12 },
      { length = 300; angle = 12; terrain = #ScrapHeaps; difficulty = 1.18 },
      { length = 250; angle = 15; terrain = #ScrapHeaps; difficulty = 1.22 },
      { length = 300; angle = -8; terrain = #MetalRoads; difficulty = 0.88 },
      { length = 350; angle = -10; terrain = #MetalRoads; difficulty = 0.85 },
      { length = 400; angle = -5; terrain = #WastelandSand; difficulty = 1.08 },
      { length = 350; angle = 0; terrain = #WastelandSand; difficulty = 1.12 },
      { length = 300; angle = 0; terrain = #WastelandSand; difficulty = 1.1 },
      { length = 250; angle = -15; terrain = #WastelandSand; difficulty = 1.05 },
    ];
  };

  /// Track 6: Dune Runner (WastelandSand, pure endurance)
  private let DUNE_RUNNER : TrackTemplate = {
    trackId = 6;
    name = "Dune Runner";
    description = "Brutal marathon through endless dunes - pure power core test";
    totalDistance = 16500;
    primaryTerrain = #WastelandSand;
    laps = 1;
    segments = [
      { length = 1200; angle = 5; terrain = #WastelandSand; difficulty = 1.18 },
      { length = 1100; angle = 8; terrain = #WastelandSand; difficulty = 1.22 },
      { length = 1000; angle = 12; terrain = #WastelandSand; difficulty = 1.28 },
      { length = 1300; angle = 15; terrain = #WastelandSand; difficulty = 1.32 },
      { length = 1200; angle = 10; terrain = #WastelandSand; difficulty = 1.25 },
      { length = 1100; angle = 0; terrain = #WastelandSand; difficulty = 1.2 },
      { length = 1000; angle = -8; terrain = #WastelandSand; difficulty = 1.15 },
      { length = 900; angle = -12; terrain = #WastelandSand; difficulty = 1.1 },
      { length = 1200; angle = 0; terrain = #WastelandSand; difficulty = 1.22 },
      { length = 1100; angle = 6; terrain = #WastelandSand; difficulty = 1.25 },
      { length = 1000; angle = 10; terrain = #WastelandSand; difficulty = 1.28 },
      { length = 900; angle = 8; terrain = #WastelandSand; difficulty = 1.2 },
      { length = 1300; angle = 0; terrain = #WastelandSand; difficulty = 1.18 },
      {
        length = 1200;
        angle = -15;
        terrain = #WastelandSand;
        difficulty = 1.12;
      },
      {
        length = 1000;
        angle = -39;
        terrain = #WastelandSand;
        difficulty = 1.08;
      },
    ];
  };

  /// Track 7: Rust Belt Rally (MetalRoads, ultra-speed)
  private let RUST_BELT_RALLY : TrackTemplate = {
    trackId = 7;
    name = "Rust Belt Rally";
    description = "High-speed highway blast - acceleration and top speed critical";
    totalDistance = 9200;
    primaryTerrain = #MetalRoads;
    laps = 1;
    segments = [
      { length = 900; angle = 0; terrain = #MetalRoads; difficulty = 0.82 },
      { length = 850; angle = -2; terrain = #MetalRoads; difficulty = 0.78 },
      { length = 800; angle = 0; terrain = #MetalRoads; difficulty = 0.8 },
      { length = 750; angle = 0; terrain = #MetalRoads; difficulty = 0.85 },
      { length = 700; angle = -4; terrain = #MetalRoads; difficulty = 0.76 },
      { length = 650; angle = 0; terrain = #MetalRoads; difficulty = 0.88 },
      { length = 600; angle = 0; terrain = #MetalRoads; difficulty = 0.9 },
      { length = 550; angle = 0; terrain = #MetalRoads; difficulty = 0.85 },
      { length = 900; angle = 0; terrain = #MetalRoads; difficulty = 0.82 },
      { length = 850; angle = 3; terrain = #MetalRoads; difficulty = 0.8 },
      { length = 800; angle = 0; terrain = #MetalRoads; difficulty = 0.78 },
      { length = 850; angle = 3; terrain = #MetalRoads; difficulty = 0.83 },
    ];
  };

  /// Track 8: Debris Field Dash (ScrapHeaps, stability specialist)
  private let DEBRIS_FIELD_DASH : TrackTemplate = {
    trackId = 8;
    name = "Debris Field Dash";
    description = "Treacherous obstacle course favoring stability masters";
    totalDistance = 7100;
    primaryTerrain = #ScrapHeaps;
    laps = 2;
    segments = [
      { length = 300; angle = 8; terrain = #ScrapHeaps; difficulty = 1.22 },
      { length = 350; angle = 12; terrain = #ScrapHeaps; difficulty = 1.28 },
      { length = 280; angle = 18; terrain = #ScrapHeaps; difficulty = 1.35 },
      { length = 320; angle = -10; terrain = #ScrapHeaps; difficulty = 1.18 },
      { length = 400; angle = 0; terrain = #ScrapHeaps; difficulty = 1.25 },
      { length = 350; angle = 15; terrain = #ScrapHeaps; difficulty = 1.3 },
      { length = 300; angle = 20; terrain = #ScrapHeaps; difficulty = 1.38 },
      { length = 280; angle = -15; terrain = #ScrapHeaps; difficulty = 1.2 },
      { length = 320; angle = -8; terrain = #ScrapHeaps; difficulty = 1.15 },
      { length = 350; angle = 0; terrain = #ScrapHeaps; difficulty = 1.28 },
      { length = 300; angle = -40; terrain = #ScrapHeaps; difficulty = 1.25 },
    ];
  };

  /// Track 9: Velocity Viaduct (MetalRoads, short speed burst)
  private let VELOCITY_VIADUCT : TrackTemplate = {
    trackId = 9;
    name = "Velocity Viaduct";
    description = "Lightning-fast elevated highway section - pure acceleration";
    totalDistance = 4500;
    primaryTerrain = #MetalRoads;
    laps = 3;
    segments = [
      { length = 300; angle = 0; terrain = #MetalRoads; difficulty = 0.8 },
      { length = 250; angle = 0; terrain = #MetalRoads; difficulty = 0.78 },
      { length = 280; angle = -5; terrain = #MetalRoads; difficulty = 0.75 },
      { length = 220; angle = -8; terrain = #MetalRoads; difficulty = 0.72 },
      { length = 200; angle = 5; terrain = #MetalRoads; difficulty = 0.85 },
      { length = 250; angle = 8; terrain = #MetalRoads; difficulty = 0.82 },
    ];
  };

  /// Track 10: Sandstorm Circuit (WastelandSand, medium endurance)
  private let SANDSTORM_CIRCUIT : TrackTemplate = {
    trackId = 10;
    name = "Sandstorm Circuit";
    description = "Circular desert track with varying dune intensities";
    totalDistance = 10800;
    primaryTerrain = #WastelandSand;
    laps = 2;
    segments = [
      { length = 600; angle = 0; terrain = #WastelandSand; difficulty = 1.15 },
      { length = 550; angle = 5; terrain = #WastelandSand; difficulty = 1.2 },
      { length = 500; angle = 10; terrain = #WastelandSand; difficulty = 1.25 },
      { length = 450; angle = 12; terrain = #WastelandSand; difficulty = 1.28 },
      { length = 500; angle = 8; terrain = #WastelandSand; difficulty = 1.22 },
      { length = 550; angle = 0; terrain = #WastelandSand; difficulty = 1.18 },
      { length = 600; angle = -6; terrain = #WastelandSand; difficulty = 1.12 },
      { length = 550; angle = -10; terrain = #WastelandSand; difficulty = 1.08 },
      { length = 500; angle = -8; terrain = #WastelandSand; difficulty = 1.1 },
      { length = 600; angle = -11; terrain = #WastelandSand; difficulty = 1.15 },
    ];
  };

  /// Track 11: Desert Sprint (WastelandSand, short/quick)
  private let DESERT_SPRINT : TrackTemplate = {
    trackId = 11;
    name = "Desert Sprint";
    description = "Quick dash across packed sand flats - short and fast";
    totalDistance = 6300;
    primaryTerrain = #WastelandSand;
    laps = 3;
    segments = [
      { length = 350; angle = 0; terrain = #WastelandSand; difficulty = 1.1 },
      { length = 300; angle = 4; terrain = #WastelandSand; difficulty = 1.15 },
      { length = 250; angle = 8; terrain = #WastelandSand; difficulty = 1.2 },
      { length = 280; angle = -6; terrain = #WastelandSand; difficulty = 1.12 },
      { length = 320; angle = 0; terrain = #WastelandSand; difficulty = 1.18 },
      { length = 300; angle = -5; terrain = #WastelandSand; difficulty = 1.08 },
      { length = 300; angle = -1; terrain = #WastelandSand; difficulty = 1.15 },
    ];
  };

  /// Track 12: Wasteland Odyssey (Mixed, long endurance challenge - 22.4km)
  private let WASTELAND_ODYSSEY : TrackTemplate = {
    trackId = 12;
    name = "Wasteland Odyssey";
    description = "Epic journey across varied terrain - true test of balanced builds";
    totalDistance = 22600;
    primaryTerrain = #WastelandSand;
    laps = 1;
    segments = [
      // Sand section (8km)
      { length = 1400; angle = 3; terrain = #WastelandSand; difficulty = 1.18 },
      { length = 1200; angle = 8; terrain = #WastelandSand; difficulty = 1.25 },
      { length = 1300; angle = 12; terrain = #WastelandSand; difficulty = 1.28 },
      { length = 1100; angle = 5; terrain = #WastelandSand; difficulty = 1.22 },
      { length = 1000; angle = 0; terrain = #WastelandSand; difficulty = 1.2 },
      { length = 1200; angle = -8; terrain = #WastelandSand; difficulty = 1.15 },
      { length = 1000; angle = -4; terrain = #WastelandSand; difficulty = 1.12 },
      // Metal highway section (7km)
      { length = 1500; angle = 0; terrain = #MetalRoads; difficulty = 0.85 },
      { length = 1400; angle = 0; terrain = #MetalRoads; difficulty = 0.82 },
      { length = 1200; angle = -5; terrain = #MetalRoads; difficulty = 0.78 },
      { length = 1300; angle = 0; terrain = #MetalRoads; difficulty = 0.88 },
      { length = 1600; angle = 0; terrain = #MetalRoads; difficulty = 0.9 },
      // Scrap mountain finale (7.4km)
      { length = 900; angle = 8; terrain = #ScrapHeaps; difficulty = 1.15 },
      { length = 800; angle = 15; terrain = #ScrapHeaps; difficulty = 1.25 },
      { length = 1000; angle = 22; terrain = #ScrapHeaps; difficulty = 1.32 },
      { length = 900; angle = 18; terrain = #ScrapHeaps; difficulty = 1.28 },
      { length = 1100; angle = -12; terrain = #ScrapHeaps; difficulty = 1.12 },
      { length = 1200; angle = -18; terrain = #ScrapHeaps; difficulty = 1.05 },
      { length = 1500; angle = -10; terrain = #ScrapHeaps; difficulty = 1.08 },
    ];
  };

  /// Track 13: Iron Crucible (MetalRoads/ScrapHeaps mixed, technical endurance - 28.8km)
  private let IRON_CRUCIBLE : TrackTemplate = {
    trackId = 13;
    name = "Iron Crucible";
    description = "Brutal metal-to-scrap transition course demanding versatility";
    totalDistance = 28800;
    primaryTerrain = #MetalRoads;
    laps = 2;
    segments = [
      // Fast highway opening (4.5km)
      { length = 1200; angle = 0; terrain = #MetalRoads; difficulty = 0.82 },
      { length = 1100; angle = -4; terrain = #MetalRoads; difficulty = 0.78 },
      { length = 1000; angle = 0; terrain = #MetalRoads; difficulty = 0.85 },
      { length = 1200; angle = 0; terrain = #MetalRoads; difficulty = 0.88 },
      // Technical scrap transition (5.1km)
      { length = 800; angle = 5; terrain = #ScrapHeaps; difficulty = 1.12 },
      { length = 900; angle = 12; terrain = #ScrapHeaps; difficulty = 1.22 },
      { length = 700; angle = 18; terrain = #ScrapHeaps; difficulty = 1.3 },
      { length = 1000; angle = 15; terrain = #ScrapHeaps; difficulty = 1.25 },
      { length = 800; angle = 8; terrain = #ScrapHeaps; difficulty = 1.18 },
      { length = 900; angle = 0; terrain = #ScrapHeaps; difficulty = 1.2 },
      // Mixed technical section (4.8km)
      { length = 600; angle = 0; terrain = #MetalRoads; difficulty = 0.92 },
      { length = 700; angle = 8; terrain = #ScrapHeaps; difficulty = 1.15 },
      { length = 800; angle = 12; terrain = #ScrapHeaps; difficulty = 1.22 },
      { length = 900; angle = -10; terrain = #MetalRoads; difficulty = 0.88 },
      { length = 1000; angle = -27; terrain = #MetalRoads; difficulty = 0.85 },
      { length = 800; angle = -37; terrain = #ScrapHeaps; difficulty = 1.28 },
    ];
  };

  /// Track 14: Endless Expanse (WastelandSand ultra-marathon - 51km)
  private let ENDLESS_EXPANSE : TrackTemplate = {
    trackId = 14;
    name = "Endless Expanse";
    description = "Ultimate power core test - 51km of unforgiving desert dunes";
    totalDistance = 50500;
    primaryTerrain = #WastelandSand;
    laps = 1;
    segments = [
      // Opening dune climb (10km)
      { length = 1800; angle = 8; terrain = #WastelandSand; difficulty = 1.22 },
      { length = 1600; angle = 12; terrain = #WastelandSand; difficulty = 1.28 },
      { length = 1700; angle = 15; terrain = #WastelandSand; difficulty = 1.32 },
      { length = 1500; angle = 18; terrain = #WastelandSand; difficulty = 1.35 },
      { length = 1400; angle = 10; terrain = #WastelandSand; difficulty = 1.25 },
      { length = 2000; angle = 5; terrain = #WastelandSand; difficulty = 1.2 },
      // Mid-expanse rolling (15km)
      { length = 2000; angle = 0; terrain = #WastelandSand; difficulty = 1.18 },
      { length = 1800; angle = 6; terrain = #WastelandSand; difficulty = 1.22 },
      { length = 1600; angle = -4; terrain = #WastelandSand; difficulty = 1.15 },
      { length = 1700; angle = 0; terrain = #WastelandSand; difficulty = 1.2 },
      { length = 1900; angle = 8; terrain = #WastelandSand; difficulty = 1.25 },
      { length = 2000; angle = 10; terrain = #WastelandSand; difficulty = 1.28 },
      { length = 1800; angle = 4; terrain = #WastelandSand; difficulty = 1.18 },
      { length = 1700; angle = -6; terrain = #WastelandSand; difficulty = 1.12 },
      // Deep desert crucible (14km)
      { length = 2200; angle = 12; terrain = #WastelandSand; difficulty = 1.3 },
      { length = 2000; angle = 15; terrain = #WastelandSand; difficulty = 1.32 },
      { length = 1800; angle = 8; terrain = #WastelandSand; difficulty = 1.25 },
      { length = 1900; angle = 0; terrain = #WastelandSand; difficulty = 1.22 },
      { length = 2100; angle = 5; terrain = #WastelandSand; difficulty = 1.2 },
      { length = 2000; angle = 10; terrain = #WastelandSand; difficulty = 1.28 },
      { length = 2000; angle = -8; terrain = #WastelandSand; difficulty = 1.15 },
      // Final descent (12km)
      { length = 1900; angle = -12; terrain = #WastelandSand; difficulty = 1.1 },
      {
        length = 1800;
        angle = -15;
        terrain = #WastelandSand;
        difficulty = 1.08;
      },
      {
        length = 2000;
        angle = -10;
        terrain = #WastelandSand;
        difficulty = 1.12;
      },
      { length = 1700; angle = -6; terrain = #WastelandSand; difficulty = 1.15 },
      { length = 1600; angle = 0; terrain = #WastelandSand; difficulty = 1.18 },
      { length = 2000; angle = -8; terrain = #WastelandSand; difficulty = 1.1 },
      {
        length = 1000;
        angle = -20;
        terrain = #WastelandSand;
        difficulty = 1.05;
      },
    ];
  };

  /// Track 15: Survival Gauntlet (Mixed ultra-endurance - 58km)
  private let SURVIVAL_GAUNTLET : TrackTemplate = {
    trackId = 15;
    name = "Survival Gauntlet";
    description = "The ultimate test - 59km through every terrain type";
    totalDistance = 59000;
    primaryTerrain = #ScrapHeaps;
    laps = 1;
    segments = [
      // Scrap mountain approach (12km)
      { length = 1500; angle = 8; terrain = #ScrapHeaps; difficulty = 1.15 },
      { length = 1400; angle = 15; terrain = #ScrapHeaps; difficulty = 1.25 },
      { length = 1600; angle = 20; terrain = #ScrapHeaps; difficulty = 1.32 },
      { length = 1300; angle = 18; terrain = #ScrapHeaps; difficulty = 1.28 },
      { length = 1200; angle = 12; terrain = #ScrapHeaps; difficulty = 1.22 },
      { length = 1500; angle = -10; terrain = #ScrapHeaps; difficulty = 1.12 },
      { length = 1400; angle = -15; terrain = #ScrapHeaps; difficulty = 1.08 },
      { length = 1600; angle = -8; terrain = #ScrapHeaps; difficulty = 1.15 },
      { length = 1500; angle = 0; terrain = #ScrapHeaps; difficulty = 1.2 },
      // Highway speed section (16km)
      { length = 2000; angle = 0; terrain = #MetalRoads; difficulty = 0.82 },
      { length = 1900; angle = -5; terrain = #MetalRoads; difficulty = 0.78 },
      { length = 1800; angle = 0; terrain = #MetalRoads; difficulty = 0.85 },
      { length = 2100; angle = 0; terrain = #MetalRoads; difficulty = 0.88 },
      { length = 2000; angle = -3; terrain = #MetalRoads; difficulty = 0.8 },
      { length = 1900; angle = 0; terrain = #MetalRoads; difficulty = 0.9 },
      { length = 2200; angle = 0; terrain = #MetalRoads; difficulty = 0.85 },
      { length = 2100; angle = 0; terrain = #MetalRoads; difficulty = 0.88 },
      // Desert endurance gauntlet (20km)
      { length = 2200; angle = 8; terrain = #WastelandSand; difficulty = 1.22 },
      { length = 2000; angle = 12; terrain = #WastelandSand; difficulty = 1.28 },
      { length = 1900; angle = 15; terrain = #WastelandSand; difficulty = 1.32 },
      { length = 2100; angle = 10; terrain = #WastelandSand; difficulty = 1.25 },
      { length = 2000; angle = 5; terrain = #WastelandSand; difficulty = 1.2 },
      { length = 1800; angle = 0; terrain = #WastelandSand; difficulty = 1.18 },
      { length = 2000; angle = -6; terrain = #WastelandSand; difficulty = 1.12 },
      {
        length = 1900;
        angle = -10;
        terrain = #WastelandSand;
        difficulty = 1.08;
      },
      { length = 2100; angle = 8; terrain = #WastelandSand; difficulty = 1.22 },
      { length = 2000; angle = 0; terrain = #WastelandSand; difficulty = 1.15 },
      // Final mixed technical (10km)
      { length = 1200; angle = 0; terrain = #MetalRoads; difficulty = 0.92 },
      { length = 1100; angle = 8; terrain = #ScrapHeaps; difficulty = 1.18 },
      { length = 1300; angle = 15; terrain = #ScrapHeaps; difficulty = 1.28 },
      { length = 1200; angle = 10; terrain = #WastelandSand; difficulty = 1.22 },
      { length = 1100; angle = -8; terrain = #MetalRoads; difficulty = 0.88 },
      { length = 1400; angle = 0; terrain = #WastelandSand; difficulty = 1.15 },
      { length = 1200; angle = -12; terrain = #ScrapHeaps; difficulty = 1.1 },
      { length = 1500; angle = -6; terrain = #MetalRoads; difficulty = 0.85 },
    ];
  };

  // ===== DAILY PHENOMENA HELPERS =====

  /// Check if a number is prime (for Metal Resonance day)
  public func isPrime(n : Nat) : Bool {
    if (n < 2) { return false };
    if (n == 2) { return true };
    if (n % 2 == 0) { return false };

    var i = 3;
    while (i * i <= n) {
      if (n % i == 0) { return false };
      i += 2;
    };
    true;
  };

  /// Get current day's phenomenon (13-day cycle)
  public func getCurrentPhenomenon(timestamp : Int) : DailyPhenomenonInfo {
    let secondsSinceEpoch = timestamp / 1_000_000_000; // Convert nanoseconds
    let daysSinceEpoch = secondsSinceEpoch / 86400; // Seconds per day
    let dayInCycle = Int.abs(daysSinceEpoch % 13);

    getPhenomenonInfo(dayInCycle);
  };

  /// Get phenomenon info by day number (0-12)
  public func getPhenomenonInfo(day : Nat) : DailyPhenomenonInfo {
    switch (day % 13) {
      case (0) {
        {
          phenomenon = #SolarFlare;
          name = "Solar Flare";
          description = "Electromagnetic chaos energizes power cores";
          emoji = "☀️";
          dayInCycle = 0;
        };
      };
      case (1) {
        {
          phenomenon = #RustStorm;
          name = "Rust Storm";
          description = "Debris field favors stable navigation";
          emoji = "🌪️";
          dayInCycle = 1;
        };
      };
      case (2) {
        {
          phenomenon = #MetalResonance;
          name = "Metal Resonance";
          description = "Ancient roads sing with speed";
          emoji = "🎸";
          dayInCycle = 2;
        };
      };
      case (3) {
        {
          phenomenon = #GravityFlux;
          name = "Gravity Flux";
          description = "Acceleration bursts from warped space";
          emoji = "🌊";
          dayInCycle = 3;
        };
      };
      case (4) {
        {
          phenomenon = #ScrapTornado;
          name = "Scrap Tornado";
          description = "Chaos favors the lucky and wild";
          emoji = "🌀";
          dayInCycle = 4;
        };
      };
      case (5) {
        {
          phenomenon = #DeadZone;
          name = "Dead Zone";
          description = "Stillness empowers the Dead faction";
          emoji = "💀";
          dayInCycle = 5;
        };
      };
      case (6) {
        {
          phenomenon = #GoldenHour;
          name = "Golden Hour";
          description = "Wasteland shimmers, luck shines bright";
          emoji = "✨";
          dayInCycle = 6;
        };
      };
      case (7) {
        {
          phenomenon = #MachineGhost;
          name = "Machine Ghost";
          description = "Ancient spirits guide machines";
          emoji = "👻";
          dayInCycle = 7;
        };
      };
      case (8) {
        {
          phenomenon = #BloodMoon;
          name = "Blood Moon";
          description = "Murder and aggression reign";
          emoji = "🔴";
          dayInCycle = 8;
        };
      };
      case (9) {
        {
          phenomenon = #BinarySurge;
          name = "Binary Surge";
          description = "Digital perfection favors balance";
          emoji = "💻";
          dayInCycle = 9;
        };
      };
      case (10) {
        {
          phenomenon = #ChaosPulse;
          name = "Chaos Pulse";
          description = "Pure randomness, pure luck";
          emoji = "⚡";
          dayInCycle = 10;
        };
      };
      case (11) {
        {
          phenomenon = #MomentumShift;
          name = "Momentum Shift";
          description = "Underdogs rise today";
          emoji = "🔄";
          dayInCycle = 11;
        };
      };
      case (12) {
        {
          phenomenon = #BlackholeSingularity;
          name = "Blackhole Singularity";
          description = "Gravity warps reality";
          emoji = "🌌";
          dayInCycle = 12;
        };
      };
      case (_) {
        // Should never happen, but default to Solar Flare
        {
          phenomenon = #SolarFlare;
          name = "Solar Flare";
          description = "Electromagnetic chaos energizes power cores";
          emoji = "☀️";
          dayInCycle = 0;
        };
      };
    };
  };

  /// Derive base luck from token index (10-50 range)
  public func deriveBaseLuck(tokenIndex : Nat) : Nat {
    // Token-based component: cyclical pattern from index
    let indexLuck = (tokenIndex % 100) / 2; // 0-49 base range

    // Ensure minimum of 10, maximum of 50 for base luck
    Nat.max(10, Nat.min(50, indexLuck + 10));
  };

  /// Calculate bot's affinity to current day's phenomenon (0-100)
  /// Higher affinity = higher chance of luck procs
  /// baseAvgRating: Optional unbuffed average rating for MomentumShift calculation
  ///                (prevents terrain/faction buffed bots from appearing as underdogs)
  public func calculateDailyAffinity(
    tokenIndex : Nat,
    stats : RacingStats,
    faction : FactionType,
    timestamp : Int,
    baseAvgRating : ?Nat, // Optional: raw average rating without terrain/faction bonuses
  ) : Nat {
    let phenomenon = getCurrentPhenomenon(timestamp);
    var affinity : Nat = 0;

    switch (phenomenon.phenomenon) {
      case (#SolarFlare) {
        // Power Core MODULO pattern (works for ALL race classes)
        let digit = stats.powerCore % 10;
        if (digit == 7) { affinity += 60 } // Lucky 7s - jackpot!
        else if (digit == 3 or digit == 9) { affinity += 40 } // Odd energy
        else if (digit == 0 or digit == 5) { affinity += 25 }; // Round numbers
        if (tokenIndex % 2 == 0) { affinity += 30 }; // Even bonus (50% of bots)
      };

      case (#RustStorm) {
        // Stability MODULO pattern
        let digit = stats.stability % 10;
        if (digit == 2 or digit == 8) { affinity += 60 } // Balanced energy
        else if (digit == 4 or digit == 6) { affinity += 40 } // Even energy
        else if (digit == 0) { affinity += 25 }; // Grounded
        if (tokenIndex % 13 == 2) { affinity += 40 }; // 7.7% of bots
      };

      case (#MetalResonance) {
        // Speed MODULO pattern
        let digit = stats.speed % 10;
        if (digit == 3) { affinity += 60 } // Resonant frequency!
        else if (digit == 1 or digit == 7) { affinity += 40 } // Harmonic
        else if (digit == 9) { affinity += 25 }; // Near-resonant
        if (isPrime(tokenIndex)) { affinity += 45 }; // ~12% are primes
      };

      case (#GravityFlux) {
        // Acceleration MODULO pattern
        let digit = stats.acceleration % 10;
        if (digit == 4) { affinity += 60 } // Flux frequency!
        else if (digit == 0 or digit == 8) { affinity += 40 } // Even lift
        else if (digit == 2 or digit == 6) { affinity += 25 }; // Partial flux
        if (tokenIndex % 4 == 0) { affinity += 35 }; // 25% of bots
      };

      case (#ScrapTornado) {
        // Wild faction (5 bots = 0.05%), token % 100 < 20
        if (faction == #Wild) { affinity += 70 }; // RARE, huge bonus
        if (tokenIndex % 100 < 20) { affinity += 40 }; // 20% of bots, reaches threshold alone
      };

      case (#DeadZone) {
        // Dead faction (382 bots = 3.82%), token contains 6 pattern
        if (faction == #Dead) { affinity += 60 };
        let tokenText = Nat.toText(tokenIndex);
        // Expanded: contains 6, 13, 66, or 666 (covers ~37% of tokens)
        if (
          Text.contains(tokenText, #text "666") or
          Text.contains(tokenText, #text "66") or
          Text.contains(tokenText, #text "13") or
          Text.contains(tokenText, #text "6")
        ) {
          affinity += 45; // Reaches threshold alone
        };
      };

      case (#GoldenHour) {
        // Golden faction (27 bots = 0.27%), token % 7 == 0
        if (faction == #Golden) { affinity += 65 }; // Very rare
        if (tokenIndex % 7 == 0) { affinity += 40 }; // 14.3% of bots, reaches threshold alone
      };

      case (#MachineGhost) {
        // Ultimate/Master/Ultimate-master (686 bots = 6.86%), token > 5000
        if (faction == #Ultimate or faction == #UltimateMaster or faction == #Master) {
          affinity += 55;
        };
        if (tokenIndex > 5000) { affinity += 40 }; // 50% of bots, reaches threshold alone
      };

      case (#BloodMoon) {
        // Murder faction (999 bots = 9.99%), token % 9 == 0
        if (faction == #Murder) { affinity += 50 };
        if (tokenIndex % 9 == 0) { affinity += 40 }; // 11.1% of bots, reaches threshold alone
      };

      case (#BinarySurge) {
        // Balanced stats (all within range of each other)
        let maxStat = Nat.max(
          Nat.max(stats.speed, stats.powerCore),
          Nat.max(stats.acceleration, stats.stability),
        );
        let minStat = Nat.min(
          Nat.min(stats.speed, stats.powerCore),
          Nat.min(stats.acceleration, stats.stability),
        );
        // Calculate spread using Int to avoid trap warning
        let spread = Int.abs(maxStat - minStat);
        if (spread <= 5) {
          affinity += 70; // Very balanced, rare
        } else if (spread <= 10) {
          affinity += 45; // Fairly balanced
        } else if (spread <= 15) {
          affinity += 25; // Somewhat balanced
        };
      };

      case (#ChaosPulse) {
        // Pure token-based luck, no faction bias
        if (tokenIndex % 11 == 0) { affinity += 70 }; // 9.1% of bots, big bonus
        // Additional affinity from luck stat
        if (stats.luck > 10) {
          affinity += Nat.min(30, (stats.luck - 10) * 2);
        };
      };

      case (#MomentumShift) {
        // BRACKET-RELATIVE underdog: uses avg % 10 to find underdogs WITHIN each bracket
        // IMPORTANT: Use base (unbuffed) average rating to prevent terrain-buffed bots
        // from exceeding their bracket threshold and incorrectly receiving underdog bonus
        let avgRating = switch (baseAvgRating) {
          case (?base) { base }; // Use provided base rating (without terrain/faction bonuses)
          case (null) {
            (stats.speed + stats.powerCore + stats.acceleration + stats.stability) / 4;
          }; // Fallback to buffed stats
        };
        let bracketPosition = avgRating % 10; // 0-9 within any bracket

        if (bracketPosition <= 2) {
          affinity += 60; // Bottom 30% of bracket
        } else if (bracketPosition <= 4) {
          affinity += 45; // Lower half of bracket
        } else if (bracketPosition <= 6) {
          affinity += 25; // Middle of bracket
        };
        // Top of bracket (7-9) gets no bonus - they're the favorites!
        if (tokenIndex % 12 == 0) { affinity += 40 }; // 8.3% of bots, reaches threshold alone
      };

      case (#BlackholeSingularity) {
        // Blackhole faction (244 bots = 2.44%), token % 13 == 0
        if (faction == #Blackhole) { affinity += 60 };
        if (tokenIndex % 13 == 0) { affinity += 40 }; // 7.7% of bots
      };
    };

    // Cap at 100
    Nat.min(affinity, 100);
  };

  /// Check if luck proc triggers this segment
  public func checkLuckProc(
    luck : Nat,
    dailyAffinity : Nat,
    position : Nat, // Current position (1-indexed)
    totalRacers : Nat,
    segmentSeed : Nat,
  ) : ?LuckProcType {
    // POSITION-GATED: Only underdogs can proc luck
    // Leaders don't need luck - they're already winning
    // This creates comeback potential without rewarding the already-ahead

    // Calculate position threshold: bottom half of field can proc
    let halfField = if (totalRacers <= 2) { 1 } else { totalRacers / 2 };

    // If in top half (leading), no luck procs
    if (position <= halfField) {
      return null;
    };

    // UNDERDOG SCALING: How far back determines proc chance
    // Position 4/6 (barely behind): low chance
    // Position 6/6 (dead last): highest chance
    let positionsBehind = position - halfField; // 1 to halfField
    let underdogFactor = Float.fromInt(positionsBehind) / Float.fromInt(halfField);

    // FLAT BASELINE: Everyone gets the same base chance (10%)
    // Position is the ONLY multiplier - luck stat is ignored
    // This creates pure Mario Kart style rubber banding
    let baseLuckChance = 0.10; // 10% flat for everyone

    // Underdog multiplier: 1x at barely behind, up to 2.5x at dead last
    let underdogMultiplier = 1.0 + (underdogFactor * 1.5);

    // Daily affinity bonus (up to +5%) - small flavor bonus
    let affNorm = Float.fromInt(dailyAffinity) / 100.0;
    let affinityBonus = affNorm * 0.05;

    // Total luck chance (capped at 30%)
    let totalLuckChance = Float.min(0.30, (baseLuckChance * underdogMultiplier) + affinityBonus);

    // Roll the dice using segment seed
    let roll = Float.fromInt(segmentSeed % 1000) / 1000.0; // 0.0 to 1.0

    if (roll < totalLuckChance) {
      ?determineLuckProc(luck, dailyAffinity, position, totalRacers, segmentSeed);
    } else { null };
  };

  /// Determine which type of luck proc occurred
  /// POSITION-BASED: Worse position = better tier chance
  /// This rewards true underdogs with better procs
  private func determineLuckProc(
    luck : Nat,
    affinity : Nat,
    position : Nat,
    totalRacers : Nat,
    seed : Nat,
  ) : LuckProcType {
    // Position-based tier calculation
    // Dead last gets best odds, barely-behind gets worst
    let halfField = if (totalRacers <= 2) { 1 } else { totalRacers / 2 };
    let positionsBehind = if (position > halfField) { position - halfField } else {
      1;
    };
    let underdogRatio = Float.fromInt(positionsBehind) / Float.fromInt(halfField); // 0.0 to 1.0

    let tierRoll = seed % 100;

    // Position-based probability:
    // Dead last (ratio=1.0): 15% Legendary, 40% Major, 45% Minor
    // Barely behind (ratio~0.2): 3% Legendary, 20% Major, 77% Minor
    //
    // Luck stat gives small bonus to tier (up to +5% Legendary, +10% Major)
    let luckBonus = Float.fromInt(luck) / 100.0; // 0.0 to 1.0

    let legendaryChance = Int.abs(Float.toInt((3.0 + underdogRatio * 12.0 + luckBonus * 5.0))); // 3-20%
    let majorChance = Int.abs(Float.toInt((20.0 + underdogRatio * 20.0 + luckBonus * 10.0))); // 20-50%

    if (tierRoll < legendaryChance) {
      let descIndex = seed % 4;
      let desc = switch (descIndex) {
        case (0) { "FLOW STATE ACTIVATED! Bot transcends physics!" };
        case (1) { "LEGENDARY SHORTCUT! Bot warps through space!" };
        case (2) { "COSMIC BLESSING! Bot channels wasteland energy!" };
        case (_) { "UNSTOPPABLE! Bot enters god mode!" };
      };

      #Legendary({
        boost = 1.20; // +20% speed this segment (catchup, not slingshot)
        description = desc;
      });
    } else if (tierRoll < legendaryChance + majorChance) {
      let descIndex = seed % 4;
      let desc = switch (descIndex) {
        case (0) { "Discovers hidden shortcut!" };
        case (1) { "Catches massive tailwind!" };
        case (2) { "Perfect line through debris!" };
        case (_) { "Engine surge! Extra power!" };
      };

      #Major({
        boost = 1.12; // +12% speed (catchup, not slingshot)
        description = desc;
      });
    } else {
      let descIndex = seed % 4;
      let desc = switch (descIndex) {
        case (0) { "Lucky dodge saves time!" };
        case (1) { "Catches tailwind!" };
        case (2) { "Smooth patch ahead!" };
        case (_) { "Debris clears perfectly!" };
      };

      #Minor({
        boost = 1.06; // +6% speed (catchup, not slingshot)
        description = desc;
      });
    };
  };

  // ===== BAD LUCK INCIDENT SYSTEM =====
  // Lower luck bots have higher chance of bad incidents

  public type BadLuckIncident = {
    penalty : Float; // Time multiplier (>1.0 = slower)
    duration : Nat; // Segments affected
    description : Text;
  };

  /// Check if a bad luck incident occurs (returns penalty if triggered)
  /// Lower luck = higher chance; opposite of good luck procs
  public func checkBadLuckIncident(
    luck : Nat,
    segmentSeed : Nat,
  ) : ?BadLuckIncident {
    // Diminishing returns formula - luck keeps helping but with decreasing benefit
    // Formula: 6% / (1 + (luck - 10) / 30)
    // Luck 10: 6%, Luck 25: 4%, Luck 40: 3%, Luck 70: 2%, Luck 100: 1.5%
    let luckAboveMin = if (luck > 10) { Float.fromInt(luck - 10) } else { 0.0 };
    let luckFactor = 0.06 / (1.0 + luckAboveMin / 30.0);

    // Random roll
    let roll = Float.fromInt(segmentSeed % 1000) / 1000.0;

    if (roll >= luckFactor) {
      return null; // No incident
    };

    // Determine incident severity based on how unlucky
    let severityRoll = segmentSeed % 100;

    if (severityRoll < 60) {
      // Minor incident (60%): Inverse of Minor luck proc (1.15 boost = 0.87 time)
      // We use 1.20 penalty to make it noticeable (~17% slower)
      let descriptions = [
        "Bot hit debris - loses momentum!",
        "Minor collision slows things down!",
        "Hits a rough patch!",
      ];
      ?{
        penalty = 1.20; // +20% time (was 1.10)
        duration = 1;
        description = descriptions[segmentSeed % 3];
      };
    } else if (severityRoll < 90) {
      // Medium incident (30%): Inverse of Major luck proc (1.25 boost = 0.80 time)
      // We use 1.35 penalty (~26% slower)
      let descriptions = [
        "Engine sputter - needs to recover!",
        "Systems glitch causes slowdown!",
        "Coolant leak detected!",
      ];
      ?{
        penalty = 1.35; // +35% time (was 1.15)
        duration = 1;
        description = descriptions[segmentSeed % 3];
      };
    } else {
      // Severe incident (10%): Inverse of Legendary luck proc (1.40 boost = 0.71 time)
      // We use 1.50 penalty (~33% slower)
      let descriptions = [
        "Navigation error - off the line!",
        "Major malfunction - scrambling to recover!",
        "Critical systems failure!",
      ];
      ?{
        penalty = 1.50; // +50% time (was 1.20)
        duration = 1;
        description = descriptions[segmentSeed % 3];
      };
    };
  };

  // ===== RACE SIMULATION ENGINE =====

  public class RaceSimulator() {

    /// Calculate race duration based on distance and terrain
    public func calculateRaceDuration(distance : Nat, terrain : Terrain) : Nat {
      let baseTime = distance * 30; // 30 seconds per km

      let terrainMultiplier = switch (terrain) {
        case (#ScrapHeaps) { 1.3 };
        case (#WastelandSand) { 1.2 };
        case (#MetalRoads) { 1.0 };
      };

      // Apply 10x speed multiplier to match actual race simulation
      let uncompressedDuration = Float.fromInt(baseTime) * terrainMultiplier;
      Int.abs(Float.toInt(uncompressedDuration / 10.0));
    };

    /// Calculate time for a single segment
    private func calculateSegmentTime(
      segment : TrackSegment,
      stats : RacingStats,
      seed : Nat,
      previousDifficulty : Float, // Difficulty of previous segment (1.0 for first segment)
      raceDistance : Nat, // Total race distance for distance-based scaling
    ) : Float {
      let speed = Float.fromInt(stats.speed);
      let powerCore = Float.fromInt(stats.powerCore);
      let stability = Float.fromInt(stats.stability);
      let acceleration = Float.fromInt(stats.acceleration);

      // === PART 1: UNIVERSAL STAT COMPONENTS (70% always active) ===

      // Speed: 70% universal base, 30% conditional bonus
      let speedUniversal = Float.sqrt(speed) * 4.0; // Reduced from 5.25 to balance with other stats
      let speedBonus = if (segment.angle == 0 and segment.terrain == #MetalRoads) {
        Float.sqrt(speed) * 1.7; // +30% bonus on ideal conditions (reduced from 2.25)
      } else if (segment.angle < 0) {
        Float.sqrt(speed) * 0.85; // +15% bonus on downhills (reduced from 1.125)
      } else { 0.0 };

      // === PART 2: STAT SYNERGIES ===

      // Speed + Acceleration synergy (high speed needs good accel to maintain)
      let speedAccelRatio = (speed + acceleration) / 200.0; // 0.30 to 1.0
      let speedSynergyMod = 0.85 + (speedAccelRatio * 0.15); // 0.85x to 1.0x (reduced from 0.80-1.0)
      let synergisticSpeed = (speedUniversal + speedBonus) * speedSynergyMod;

      // Power + Stability synergy (endurance needs stability)
      let powerStabilityRatio = (powerCore + stability) / 200.0; // 0.30 to 1.0
      let powerSynergyMod = 0.82 + (powerStabilityRatio * 0.18); // 0.82x to 1.0x (buffed from 0.85-1.0)

      // === PART 3: UNIVERSAL PENALTIES (all stats matter everywhere) ===

      // Power Core: Universal endurance (28% penalty range, buffed from 25%)
      let powerUniversal = 1.0 + ((100.0 - powerCore) / 350.0);

      // Acceleration: Universal responsiveness (28% penalty range)
      let accelUniversal = 1.0 + ((100.0 - acceleration) / 350.0);

      // Stability: Universal consistency (28% penalty range, buffed from 25%)
      let stabilityUniversal = 1.0 + ((100.0 - stability) / 350.0);

      // === PART 4: SITUATIONAL MODIFIERS ===

      // Power: Additional penalty in demanding conditions
      let powerSituational = if (segment.terrain == #WastelandSand) {
        1.0 + ((100.0 - powerCore) / 200.0); // +50% penalty on sand
      } else if (segment.angle > 5) {
        let steepness = Float.fromInt(segment.angle) / 20.0;
        1.0 + ((100.0 - powerCore) / 250.0) * steepness; // Scaled uphill penalty
      } else if (segment.angle > 0) {
        1.0 + ((100.0 - powerCore) / 400.0); // Small uphill penalty
      } else {
        1.0;
      };

      // Acceleration: Bonus on roads, momentum recovery
      let accelSituational = switch (segment.terrain) {
        case (#MetalRoads) {
          1.0 + ((100.0 - acceleration) / 200.0); // +50% penalty on roads (reduced from 62%)
        };
        case _ { 1.0 };
      };

      let momentumLoss = if (previousDifficulty > 1.0) {
        (previousDifficulty - 1.0) * 0.20; // Increased from 0.15
      } else { 0.0 };
      let accelerationRecovery = acceleration / 140.0;
      let momentumMod = 1.0 + (momentumLoss * (1.0 - accelerationRecovery));

      // Stability: Technical sections and difficulty
      let stabilitySituational = if (segment.terrain == #ScrapHeaps) {
        1.0 + ((100.0 - stability) / 150.0); // +47% penalty on heaps
      } else {
        1.0;
      };

      let difficultyMod = if (segment.difficulty > 1.0) {
        let techLevel = segment.difficulty - 1.0;
        let stabilityFactor = 1.0 + ((100.0 - stability) / 300.0) * techLevel;
        segment.difficulty * stabilityFactor;
      } else {
        segment.difficulty;
      };

      // === PART 5: DISTANCE-BASED STAT SCALING ===

      let raceDistanceFloat = Float.fromInt(raceDistance);

      // Short sprints (<10km) - Acceleration & Speed matter more
      let sprintFactor : Float = if (raceDistance < 10) {
        let accelWeight = 1.0 + ((acceleration - 50.0) / 200.0); // 0.75x to 1.25x
        let speedWeight = 1.0 - ((speed - 50.0) / 400.0); // 1.125x to 0.875x
        accelWeight / speedWeight; // High accel gets bonus, high speed gets slight penalty
      } else { 1.0 };

      // Long treks (>20km) - Power & Stability matter more
      let trekFactor : Float = if (raceDistance > 20) {
        let powerWeight = 0.80 + ((powerCore - 50.0) / 200.0); // 0.55x to 1.05x
        let stabilityWeight = 0.85 + ((stability - 50.0) / 250.0); // 0.65x to 1.05x
        (powerWeight + stabilityWeight) / 2.0; // Average of both
      } else { 1.0 };

      // === PART 6: COMBINE ALL MODIFIERS ===

      // Apply synergy to power effectiveness
      let totalPowerMod = (powerUniversal * powerSituational) / powerSynergyMod;
      let totalAccelMod = accelUniversal * accelSituational * momentumMod;
      let totalStabilityMod = stabilityUniversal * stabilitySituational;

      // Apply distance-based scaling
      let distanceAdjustedSpeed = synergisticSpeed / (sprintFactor * trekFactor);

      // Randomness for this segment (±20% per segment)
      let segmentSeed = seed % 1000;
      let randomMod = 0.80 + (Float.fromInt(segmentSeed) / 2500.0); // 0.80 to 1.20

      // Calculate segment time
      let segmentLength = Float.fromInt(segment.length);
      let effectiveSpeed = distanceAdjustedSpeed / (totalPowerMod * totalAccelMod * totalStabilityMod * difficultyMod);
      let segmentTime = (segmentLength / effectiveSpeed) * randomMod;

      // Debug logging for first segment
      if (previousDifficulty == 1.0) {
        Debug.print("=== BACKEND SEGMENT 0 CALCULATION ===");
        Debug.print("Race Distance (km): " # Nat.toText(raceDistance));
        Debug.print("Segment length: " # Int.toText(segment.length) # ", terrain: " # debug_show (segment.terrain) # ", angle: " # Int.toText(segment.angle) # ", difficulty: " # Float.toText(segment.difficulty));
        Debug.print("Stats: speed=" # Float.toText(speed) # ", powerCore=" # Float.toText(powerCore) # ", accel=" # Float.toText(acceleration) # ", stability=" # Float.toText(stability));
        Debug.print("Speed Components: universal=" # Float.toText(speedUniversal) # ", bonus=" # Float.toText(speedBonus) # ", synergistic=" # Float.toText(synergisticSpeed));
        Debug.print("Distance Scaling: sprint=" # Float.toText(sprintFactor) # ", trek=" # Float.toText(trekFactor));
        Debug.print("Modifiers: power=" # Float.toText(totalPowerMod) # ", accel=" # Float.toText(totalAccelMod) # ", stability=" # Float.toText(totalStabilityMod) # ", difficulty=" # Float.toText(difficultyMod));
        Debug.print("Results: distanceAdjustedSpeed=" # Float.toText(distanceAdjustedSpeed) # ", effectiveSpeed=" # Float.toText(effectiveSpeed) # ", randomMod=" # Float.toText(randomMod));
        Debug.print("segmentTime=" # Float.toText(segmentTime) # ", finalTime=" # Float.toText(segmentTime / 10.0));
      };

      // 10x speed multiplier to reduce race times for better UX
      Float.max(0.1, segmentTime / 10.0);
    };

    /// Simulate race segment-by-segment and return only final times
    /// Frontend can use this same logic with trackSeed to replay deterministically
    public func simulateRaceSegmented(
      race : Race,
      participants : [RacingParticipant],
    ) : ?([RaceResult], [RaceEvent]) {
      if (participants.size() < 2) {
        return null;
      };

      // Get track template
      let trackOpt = getTrack(race.trackId);
      let track = switch (trackOpt) {
        case (?t) { t };
        case (null) {
          // Track not found - this shouldn't happen with proper race creation
          Debug.print("ERROR: Track " # debug_show (race.trackId) # " not found");
          return null;
        };
      };

      // Build full segment list (segments × laps)
      var allSegments : [TrackSegment] = [];
      for (_ in Iter.range(0, track.laps - 1)) {
        allSegments := Array.append(allSegments, track.segments);
      };

      // Track cumulative times for each participant across segments
      type RacerProgress = {
        participant : RacingParticipant;
        var cumulativeTime : Float;
        var previousDifficulty : Float;
        var poorPerformanceThisSegment : ?(Float, Nat, Nat); // (performancePct, streak, seed)
        var activeLuckBuff : ?ActiveLuckBuff; // Active luck buff (if any)
        var currentPosition : Nat; // Current position in race (1-indexed)
        dailyAffinity : Nat; // Pre-calculated at race start
      };

      var racerProgress : [RacerProgress] = [];
      var initialPosition : Nat = 1;
      for (participant in participants.vals()) {
        // Calculate daily affinity at race start (deterministic based on race timestamp)
        // Pass base avg rating for MomentumShift to prevent buffed bots appearing as underdogs
        let affinity = calculateDailyAffinity(
          participant.tokenIndex,
          participant.stats,
          participant.faction,
          race.createdAt,
          participant.baseAvgRating, // Use unbuffed stats for MomentumShift calculation
        );

        let newRacer : RacerProgress = {
          participant = participant;
          var cumulativeTime = 0.0;
          var previousDifficulty = 1.0;
          var poorPerformanceThisSegment = null;
          var activeLuckBuff = null;
          var currentPosition = initialPosition;
          dailyAffinity = affinity;
        };
        racerProgress := Array.append(
          racerProgress,
          [newRacer],
        );
        initialPosition += 1;
      };

      // Track race events
      var events : [RaceEvent] = [];
      var previousLeader : ?Text = null;

      // Track performance streaks for commentary flavor
      var poorPerformanceStreaks = HashMap.HashMap<Text, Nat>(10, Text.equal, Text.hash);
      var goodPerformanceStreaks = HashMap.HashMap<Text, Nat>(10, Text.equal, Text.hash);

      // Track gap trends for progressive commentary
      var previousGap : Float = 0.0;
      var consecutiveLargeGaps : Nat = 0;
      var previousCloseGap : Float = 0.0;
      var lastCloseRacingSegment : Nat = 0; // Cooldown for close racing messages
      var hasUsedIntenseBattle : Bool = false; // Track if we've used "intense battle" already

      // Track finishers for podium announcements
      var finisherCount : Nat = 0;
      var announcedFinishers = HashMap.HashMap<Text, Bool>(10, Text.equal, Text.hash);

      // Add race start announcement
      events := Array.append(
        events,
        [{
          eventType = #SegmentComplete {
            segmentIndex = 0;
            leader = "none";
          };
          timestamp = 0.0;
          segmentIndex = 0;
          description = "Race start! " # Nat.toText(participants.size()) # " bots charge off the line!";
        }],
      );

      // Store segment 0 debug data for logging at the end
      var segment0DebugData : Text = "";
      var segment1DebugData : Text = "";
      var segment2DebugData : Text = "";

      // Simulate segment by segment
      for (segmentIdx in Iter.range(0, allSegments.size() - 1)) {
        let segment = allSegments[segmentIdx];

        // Calculate segment times for all participants
        for (i in Iter.range(0, racerProgress.size() - 1)) {
          let racer = racerProgress[i];
          let segmentSeed = race.trackSeed + (i * 1000) + segmentIdx;

          // Debug: print i and segmentIdx values
          if (segmentIdx < 2) {
            Debug.print("LOOP_VALUES: i=" # Nat.toText(i) # " segmentIdx=" # Nat.toText(segmentIdx));
          };

          // Calculate base segment time
          // race.distance is in meters, but calculateSegmentTime expects the value as-is
          let baseSegmentTime = calculateSegmentTime(
            segment,
            racer.participant.stats,
            segmentSeed,
            racer.previousDifficulty,
            race.distance,
          );

          // === SLIPSTREAM MECHANIC ===
          // Bots close behind another bot get a speed advantage
          var slipstreamBonus : Float = 1.0; // Multiplier on time (lower = faster)

          // Check if this bot is within slipstream range of bot ahead (within 2 seconds at this point)
          let currentTime = racer.cumulativeTime;
          for (j in Iter.range(0, racerProgress.size() - 1)) {
            if (i != j) {
              let otherRacer = racerProgress[j];
              let timeDiff = currentTime - otherRacer.cumulativeTime;

              // In slipstream if 0.5-2.5 seconds behind (too close = no benefit, too far = no effect)
              if (timeDiff > 0.5 and timeDiff < 2.5) {
                // 5% speed boost when in slipstream (reduces time by 5%)
                slipstreamBonus := 0.95;
              };
            };
          };

          // Per-segment performance variation
          // Modified by stats to make them actually matter:
          // - STABILITY reduces variance (high stability = more consistent)
          // - LUCK shifts the center favorably (high luck = better average rolls)
          let lap = segmentIdx / track.segments.size();
          let segmentConditionSeed = ((segmentSeed * 31337 + i * 7919 + lap * 12345) % 1000);

          // Stability reduces variance: 10 stability = ±25%, 50 stability = ±15%, 100 stability = ±5%
          let stabilityFactor = Float.fromInt(racer.participant.stats.stability) / 100.0; // 0.0 to 1.0
          let varianceRange = 0.25 - (stabilityFactor * 0.20); // 0.25 down to 0.05 at max stability

          // Luck shifts center point: 10 luck = 1.03 (3% slower), 50 luck = 1.0, 100 luck = 0.94 (6% faster)
          // Using 10 as baseline since that's minimum luck
          let luckAboveMin = Float.fromInt(if (racer.participant.stats.luck > 10) { racer.participant.stats.luck - 10 } else { 0 }) / 90.0; // 0.0 to 1.0
          let centerPoint = 1.03 - (luckAboveMin * 0.09); // 1.03 down to 0.94 at max luck

          // Calculate segment performance: centerPoint ± varianceRange
          let rawRoll = Float.fromInt(segmentConditionSeed) / 500.0 - 1.0; // -1.0 to +1.0
          var segmentPerformance = centerPoint + (rawRoll * varianceRange);

          // RUBBER BAND: Leaders can't get exceptional performance
          // If in 1st place and rolled better than 0.95 (fast), cap at 0.98 (slightly fast)
          // This prevents runaway leaders while still allowing decent performance
          if (racer.currentPosition == 1 and segmentPerformance < 0.95) {
            segmentPerformance := 0.98;
          };

          // === LUCK SYSTEM ===
          // Luck boost reduces time (faster = lower time multiplier)
          var luckBoost : Float = 1.0;

          // Check for active buff first
          switch (racer.activeLuckBuff) {
            case (?buff) {
              // Apply active buff
              let boost = switch (buff.procType) {
                case (#Minor(proc)) { proc.boost };
                case (#Major(proc)) { proc.boost };
                case (#Legendary(proc)) { proc.boost };
              };
              // Convert speed boost to time reduction (1.15x speed = 1/1.15 = 0.87x time)
              luckBoost := 1.0 / boost;

              // Decrement duration
              if (buff.remainingDuration > 1) {
                racer.activeLuckBuff := ?{
                  procType = buff.procType;
                  appliedAtSegment = buff.appliedAtSegment;
                  remainingDuration = buff.remainingDuration - 1;
                };
              } else {
                racer.activeLuckBuff := null; // Buff expired
              };
            };
            case (null) {
              // No active buff - check for new proc using separate seed to avoid correlation
              let luckSeed = (segmentSeed * 7331 + i * 9973 + lap * 54321) % 10000;
              let luckCheck = checkLuckProc(
                racer.participant.stats.luck,
                racer.dailyAffinity,
                racer.currentPosition,
                participants.size(),
                luckSeed,
              );

              switch (luckCheck) {
                case (?procType) {
                  // New luck proc triggered!
                  let (boost, duration, description) = switch (procType) {
                    case (#Minor(p)) { (p.boost, 1, p.description) };
                    case (#Major(p)) { (p.boost, 3, p.description) };
                    case (#Legendary(p)) { (p.boost, 5, p.description) };
                  };

                  // Apply immediately
                  luckBoost := 1.0 / boost;

                  // Store buff if duration > 1
                  if (duration > 1) {
                    racer.activeLuckBuff := ?{
                      procType = procType;
                      appliedAtSegment = segmentIdx;
                      remainingDuration = duration - 1; // -1 because we're applying now
                    };
                  };

                  // Add luck proc event
                  let procTypeName = switch (procType) {
                    case (#Minor(_)) { "Minor" };
                    case (#Major(_)) { "Major" };
                    case (#Legendary(_)) { "Legendary" };
                  };

                  events := Array.append(
                    events,
                    [{
                      eventType = #LuckProc {
                        bot = racer.participant.nftId;
                        procType = procTypeName;
                        boost = boost;
                      };
                      timestamp = racer.cumulativeTime;
                      segmentIndex = segmentIdx;
                      description = "🍀 Bot " # racer.participant.nftId # ": " # description;
                    }],
                  );
                };
                case (null) {
                  // No luck proc - check for bad luck incident
                  // RUBBER BAND: Bad luck ONLY affects leaders (top half of field)
                  // This is the opposite of good luck procs which only help underdogs
                  let halfField = if (participants.size() <= 2) { 1 } else {
                    participants.size() / 2;
                  };

                  if (racer.currentPosition <= halfField) {
                    // Leader is vulnerable to bad luck
                    let badLuckSeed = (segmentSeed * 8887 + i * 3331 + lap * 77777) % 10000;
                    let badLuckCheck = checkBadLuckIncident(
                      racer.participant.stats.luck,
                      badLuckSeed,
                    );

                    switch (badLuckCheck) {
                      case (?incident) {
                        // Bad luck incident! Apply penalty
                        luckBoost := incident.penalty;

                        // Determine incident type for event
                        let incidentType = if (incident.penalty <= 1.10) {
                          "Minor";
                        } else if (incident.penalty <= 1.15) {
                          "Medium";
                        } else {
                          "Severe";
                        };

                        events := Array.append(
                          events,
                          [{
                            eventType = #BadLuck {
                              bot = racer.participant.nftId;
                              incidentType = incidentType;
                              penalty = incident.penalty;
                            };
                            timestamp = racer.cumulativeTime;
                            segmentIndex = segmentIdx;
                            description = "💥 Bot " # racer.participant.nftId # ": " # incident.description;
                          }],
                        );
                      };
                      case (null) {};
                    };
                  };
                  // Underdogs (bottom half) are protected from bad luck
                };
              };
            };
          };

          let segmentTime = baseSegmentTime * segmentPerformance * slipstreamBonus * luckBoost;

          // Store first 3 segments data for all bots
          if (segmentIdx == 0) {
            segment0DebugData := segment0DebugData # "BOT" # Nat.toText(i) # ":seed=" # Nat.toText(segmentConditionSeed) # ",perf=" # Float.toText(segmentPerformance) # ",slip=" # Float.toText(slipstreamBonus) # ",base=" # Float.toText(baseSegmentTime) # " | ";
          };
          if (segmentIdx == 1) {
            segment1DebugData := segment1DebugData # "BOT" # Nat.toText(i) # ":seed=" # Nat.toText(segmentConditionSeed) # ",perf=" # Float.toText(segmentPerformance) # ",slip=" # Float.toText(slipstreamBonus) # ",base=" # Float.toText(baseSegmentTime) # " | ";
          };
          if (segmentIdx == 2) {
            segment2DebugData := segment2DebugData # "BOT" # Nat.toText(i) # ":seed=" # Nat.toText(segmentConditionSeed) # ",perf=" # Float.toText(segmentPerformance) # ",slip=" # Float.toText(slipstreamBonus) # ",base=" # Float.toText(baseSegmentTime) # " | ";
          };

          racer.cumulativeTime += segmentTime;
          racer.previousDifficulty := segment.difficulty;

          // Check for exceptional/poor performance
          // segmentPerformance is a TIME MULTIPLIER: <1.0 = faster (good), >1.0 = slower (bad)
          // Range is 0.80 to 1.20, so thresholds are set to capture ~20% on each end
          if (segmentPerformance < 0.88) {
            // Faster than expected (good performance) - report if >12% faster
            let performancePct = (1.0 - segmentPerformance) * 100.0;

            // Track streak for this bot
            let currentStreak = switch (goodPerformanceStreaks.get(racer.participant.nftId)) {
              case null { 0 };
              case (?count) { count };
            };
            let newStreak = currentStreak + 1;
            goodPerformanceStreaks.put(racer.participant.nftId, newStreak);

            // Generate message based on streak
            let message = if (newStreak == 1) {
              "Bot " # racer.participant.nftId # " nails the perfect line!";
            } else if (newStreak == 2) {
              "Bot " # racer.participant.nftId # " finds the line again!";
            } else if (newStreak == 3) {
              "Bot " # racer.participant.nftId # " is on fire!";
            } else {
              "Bot " # racer.participant.nftId # " is absolutely flying!";
            };

            events := Array.append(
              events,
              [{
                eventType = #ExceptionalPerformance {
                  bot = racer.participant.nftId;
                  performancePct = performancePct;
                };
                timestamp = racer.cumulativeTime;
                segmentIndex = segmentIdx;
                description = message;
              }],
            );
            // Reset poor performance streak on good performance
            poorPerformanceStreaks.put(racer.participant.nftId, 0);
          } else if (segmentPerformance > 1.12) {
            // Slower than expected (poor performance) - report if >12% slower
            let performancePct = (segmentPerformance - 1.0) * 100.0;

            // Track streak for this bot
            let currentStreak = switch (poorPerformanceStreaks.get(racer.participant.nftId)) {
              case null { 0 };
              case (?count) { count };
            };
            let newStreak = currentStreak + 1;
            poorPerformanceStreaks.put(racer.participant.nftId, newStreak);

            // Store poor performance data to generate messages after standings calculated
            racer.poorPerformanceThisSegment := ?(performancePct, newStreak, segmentConditionSeed);

            // Reset good performance streak on poor performance
            goodPerformanceStreaks.put(racer.participant.nftId, 0);
          };
        };

        // Sort by cumulative time to determine current positions
        let currentStandings = Array.sort<RacerProgress>(
          racerProgress,
          func(a, b) { Float.compare(a.cumulativeTime, b.cumulativeTime) },
        );

        // Update current positions for all racers (for luck underdog calculation)
        for (standingIdx in currentStandings.keys()) {
          currentStandings[standingIdx].currentPosition := standingIdx + 1;
        };

        // Generate position-aware poor performance messages
        for (standingIdx in currentStandings.keys()) {
          let racer = currentStandings[standingIdx];
          switch (racer.poorPerformanceThisSegment) {
            case (?(performancePct, newStreak, seed)) {
              // Cap at 3 occurrences to avoid spam
              if (newStreak <= 3) {
                let isLeader = standingIdx == 0;
                let isTop3 = standingIdx < 3;

                let message = if (newStreak == 1) {
                  // First struggle - describe the mistake, not position change
                  let messageVariant = seed % 6;
                  if (messageVariant == 0) {
                    "Bot " # racer.participant.nftId # " takes that turn wide!";
                  } else if (messageVariant == 1) {
                    "Bot " # racer.participant.nftId # " clips the barrier!";
                  } else if (messageVariant == 2) {
                    "Bot " # racer.participant.nftId # " misses the apex!";
                  } else if (messageVariant == 3) {
                    "Bot " # racer.participant.nftId # " slides through the corner!";
                  } else if (messageVariant == 4) {
                    "Bot " # racer.participant.nftId # " loses traction!";
                  } else {
                    "Bot " # racer.participant.nftId # " runs wide through debris!";
                  };
                } else if (newStreak == 2) {
                  let messageVariant = seed % 4;
                  if (messageVariant == 0) {
                    "Bot " # racer.participant.nftId # " struggles again!";
                  } else if (messageVariant == 1) {
                    "Bot " # racer.participant.nftId # " another bobble!";
                  } else if (messageVariant == 2) {
                    "Bot " # racer.participant.nftId # " can't find the racing line!";
                  } else {
                    "Bot " # racer.participant.nftId # " loses more ground!";
                  };
                } else {
                  "Bot " # racer.participant.nftId # " still fighting through rough terrain!";
                };

                events := Array.append(
                  events,
                  [{
                    eventType = #PoorPerformance {
                      bot = racer.participant.nftId;
                      performancePct = performancePct;
                    };
                    timestamp = racer.cumulativeTime;
                    segmentIndex = segmentIdx;
                    description = message;
                  }],
                );
              };

              // Clear the flag
              racer.poorPerformanceThisSegment := null;
            };
            case null {};
          };
        };

        // Detect lead changes
        let currentLeader = currentStandings[0].participant.nftId;
        switch (previousLeader) {
          case (?prevLeader) {
            if (currentLeader != prevLeader) {
              events := Array.append(
                events,
                [{
                  eventType = #LeadChange {
                    newLeader = currentLeader;
                    previousLeader = prevLeader;
                  };
                  timestamp = currentStandings[0].cumulativeTime;
                  segmentIndex = segmentIdx;
                  description = "Bot " # currentLeader # " takes the lead from Bot " # prevLeader # "!";
                }],
              );
            };
          };
          case (null) {
            // First segment leader
            events := Array.append(
              events,
              [{
                eventType = #LeadChange {
                  newLeader = currentLeader;
                  previousLeader = "none";
                };
                timestamp = currentStandings[0].cumulativeTime;
                segmentIndex = segmentIdx;
                description = "Bot " # currentLeader # " takes the early lead!";
              }],
            );
          };
        };
        previousLeader := ?currentLeader;

        // Check for large gaps (>10 seconds ahead of 2nd place)
        if (currentStandings.size() >= 2) {
          let gap = currentStandings[1].cumulativeTime - currentStandings[0].cumulativeTime;
          if (gap > 10.0 and segmentIdx % 5 == 0) {
            // Track if gap is growing or shrinking
            let gapGrowing = gap > previousGap;
            let roundedGap = Float.fromInt(Int.abs(Float.toInt(gap * 10.0))) / 10.0;

            // Progressive commentary based on streak
            consecutiveLargeGaps += 1;
            let message = if (consecutiveLargeGaps == 1) {
              "Bot " # currentLeader # " has pulled " # Float.toText(roundedGap) # " seconds ahead!";
            } else if (consecutiveLargeGaps == 2 and gapGrowing) {
              "Bot " # currentLeader # " is still in the lead and the gap is growing!";
            } else if (consecutiveLargeGaps >= 3 and gapGrowing) {
              "Bot " # currentLeader # " is so far ahead, this race might be over!";
            } else if (not gapGrowing and gap > 10.0) {
              "Bot " # currentStandings[1].participant.nftId # " is gaining on the leader!";
            } else {
              "Bot " # currentLeader # " maintains a " # Float.toText(roundedGap) # " second lead!";
            };

            events := Array.append(
              events,
              [{
                eventType = #LargeGap {
                  leader = currentLeader;
                  gapSeconds = gap;
                };
                timestamp = currentStandings[0].cumulativeTime;
                segmentIndex = segmentIdx;
                description = message;
              }],
            );
            previousGap := gap;
          } else if (gap <= 10.0) {
            // Reset streak if gap closes
            consecutiveLargeGaps := 0;
          };

          // Check for close racing (within 3 seconds) - report when gap changes
          // Skip first 3 segments to avoid false positives at race start
          if (gap < 3.0 and segmentIdx >= 3) {
            // Check if gap changed significantly (lower threshold for more updates)
            let gapChanged = previousCloseGap == 0.0 or Float.abs(gap - previousCloseGap) > 0.1;
            let gapShrinking = previousCloseGap > 0.0 and gap < previousCloseGap;
            let cooldownPassed = segmentIdx >= lastCloseRacingSegment and (segmentIdx - lastCloseRacingSegment) >= 2;

            // Create event if: cooldown passed OR gap is shrinking (always report exciting moments!)
            if (gapChanged and (cooldownPassed or gapShrinking)) {
              // Round gap to 1 decimal place for cleaner display
              let roundedGap = Float.fromInt(Int.abs(Float.toInt(gap * 10.0))) / 10.0;
              // Format as string with 1 decimal place
              let gapText = if (roundedGap < 0.1) {
                "0.1";
              } else if (roundedGap >= 10.0) {
                Nat.toText(Int.abs(Float.toInt(roundedGap)));
              } else {
                // Convert to string: multiply by 10, convert to int, then format as X.Y
                let tenths = Int.abs(Float.toInt(roundedGap * 10.0));
                let wholes = tenths / 10;
                let decimals = tenths % 10;
                Nat.toText(wholes) # "." # Nat.toText(decimals);
              };

              // Progressive commentary based on whether gap is shrinking
              let gapShrinking = previousCloseGap > 0.0 and gap < previousCloseGap;
              let gapGrowing = previousCloseGap > 0.0 and gap > previousCloseGap;

              let message = if (gapShrinking and gap < 0.5) {
                "Bot " # currentStandings[1].participant.nftId # " is right on the heels of Bot " # currentStandings[0].participant.nftId # "!";
              } else if (gapShrinking) {
                "Bot " # currentStandings[1].participant.nftId # " closing in! Gap down to " # gapText # "s!";
              } else if (previousCloseGap == 0.0 and not hasUsedIntenseBattle) {
                hasUsedIntenseBattle := true;
                "Intense battle! Bot " # currentStandings[0].participant.nftId # " and Bot " # currentStandings[1].participant.nftId # " separated by just " # gapText # "s!";
              } else if (gapGrowing) {
                "Bot " # currentStandings[0].participant.nftId # " pulling away, gap now " # gapText # "s";
              } else {
                // Close racing but no significant change
                "Still tight racing at " # gapText # "s apart";
              };

              events := Array.append(
                events,
                [{
                  eventType = #CloseRacing {
                    bots = [currentStandings[0].participant.nftId, currentStandings[1].participant.nftId];
                    gapSeconds = gap;
                  };
                  timestamp = currentStandings[0].cumulativeTime;
                  segmentIndex = segmentIdx;
                  description = message;
                }],
              );
              lastCloseRacingSegment := segmentIdx; // Update cooldown
            };
            // Always update gap tracker when close, regardless of whether we created event
            previousCloseGap := gap;
          } else {
            // Reset when gap opens up
            previousCloseGap := 0.0;
          };
        };

        // Lap completion events (end of lap only, no intermediate segments)
        if ((segmentIdx + 1) % track.segments.size() == 0) {
          let lap = ((segmentIdx + 1) / track.segments.size());
          let isFinalLap = lap == track.laps;

          if (isFinalLap) {
            // Announce each finisher as they complete (top 3 only)
            for (racer in currentStandings.vals()) {
              let alreadyAnnounced = switch (announcedFinishers.get(racer.participant.nftId)) {
                case (?_) { true };
                case null { false };
              };

              if (not alreadyAnnounced and finisherCount < 3) {
                finisherCount += 1;
                announcedFinishers.put(racer.participant.nftId, true);

                let message = if (finisherCount == 1) {
                  "Bot " # racer.participant.nftId # " wins the race!";
                } else if (finisherCount == 2) {
                  "Bot " # racer.participant.nftId # " takes second place!";
                } else {
                  "Bot " # racer.participant.nftId # " rounds out the podium in third!";
                };

                events := Array.append(
                  events,
                  [{
                    eventType = #SegmentComplete {
                      segmentIndex = segmentIdx;
                      leader = racer.participant.nftId;
                    };
                    timestamp = racer.cumulativeTime;
                    segmentIndex = segmentIdx;
                    description = message;
                  }],
                );
              };
            };
          } else {
            // Non-final lap completion
            events := Array.append(
              events,
              [{
                eventType = #SegmentComplete {
                  segmentIndex = segmentIdx;
                  leader = currentLeader;
                };
                timestamp = currentStandings[0].cumulativeTime;
                segmentIndex = segmentIdx;
                description = "Lap " # Nat.toText(lap) # " complete! Bot " # currentLeader # " leads!";
              }],
            );
          };
        };

        // Stop most commentary after top 3 finish (but continue to end for filtering)
        if (finisherCount >= 3) {
          // Set flag to skip generating more events
          // We'll still continue the loop to finish the race simulation
        };
      };

      // Final sort by total time
      let finalStandings = Array.sort<RacerProgress>(
        racerProgress,
        func(a, b) { Float.compare(a.cumulativeTime, b.cumulativeTime) },
      );

      // Calculate prizes
      var totalSponsorships : Nat = 0;
      for (sponsor in race.sponsors.vals()) {
        totalSponsorships += sponsor.amount;
      };
      let totalPool = race.prizePool + race.platformBonus + totalSponsorships;
      let netPrizePool = Nat.sub(totalPool, race.platformTax);
      var results : [RaceResult] = [];

      for (i in Iter.range(0, finalStandings.size() - 1)) {
        let racer = finalStandings[i];
        let position = i + 1;

        let prize = if (position == 1) {
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

        // Calculate parts earned (same logic as in handleRaceFinish)
        let partType : Text = switch (race.terrain) {
          case (#MetalRoads) { "SpeedChip" };
          case (#ScrapHeaps) { "PowerCoreFragment" };
          case (#WastelandSand) {
            if (race.raceId % 2 == 0) { "ThrusterKit" } else { "GyroModule" };
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
        let positionMultiplier : Float = if (position == 1) {
          1.5; // Winner: 1.5x
        } else if (position == 2) {
          1.25; // Second: 1.25x
        } else if (position == 3) {
          1.1; // Third: 1.1x
        } else {
          1.0; // Everyone else: 1x (participation)
        };

        let partsEarned = Int.abs(Float.toInt(Float.fromInt(baseParts) * positionMultiplier));

        results := Array.append(
          results,
          [{
            nftId = racer.participant.nftId;
            owner = racer.participant.owner;
            position = position;
            finalTime = racer.cumulativeTime;
            prizeAmount = prize;
            partsEarned = partsEarned;
            partType = partType;
            stats = ?racer.participant.stats;
          }],
        );
      };

      // Filter events to keep only highest priority per segment
      // Priority: 1=Podium, 2=Lead Change, 3=Lap Complete, 4=Exceptional/LuckProc, 5=Close Racing, 6=Large Gap, 7=Poor Performance
      func getEventPriority(event : RaceEvent) : Nat {
        switch (event.eventType) {
          case (#SegmentComplete(_)) {
            // Check if it's a podium finish
            if (
              Text.contains(event.description, #text "wins the race") or
              Text.contains(event.description, #text "second place") or
              Text.contains(event.description, #text "podium in third")
            ) {
              return 1; // Podium - highest priority
            };
            return 3; // Lap completion
          };
          case (#LeadChange(_)) { 2 }; // Lead changes
          case (#ExceptionalPerformance(_)) { 4 }; // Good performance
          case (#LuckProc(_)) { 4 }; // Luck procs - same as exceptional
          case (#BadLuck(_)) { 4 }; // Bad luck incidents - same priority as luck procs
          case (#CloseRacing(_)) { 5 }; // Close racing
          case (#LargeGap(_)) { 6 }; // Large gaps
          case (#PoorPerformance(_)) { 7 }; // Poor performance - lowest priority
          case (#Overtake(_)) { 2 }; // Same as lead change
        };
      };

      // Sort events by timestamp first
      let sortedEvents = Array.sort<RaceEvent>(
        events,
        func(a, b) {
          if (a.timestamp < b.timestamp) { #less } else if (a.timestamp > b.timestamp) {
            #greater;
          } else { #equal };
        },
      );

      // Filter: keep only highest priority event per 1-second bucket
      var filteredEvents = Buffer.Buffer<RaceEvent>(sortedEvents.size());
      var lastBucket : Int = -1;
      var lastPriority : Nat = 999;

      for (event in sortedEvents.vals()) {
        // Bucket by 1-second intervals
        let bucket = Int.abs(Float.toInt(event.timestamp));
        let priority = getEventPriority(event);

        if (bucket > lastBucket) {
          // New time bucket
          filteredEvents.add(event);
          lastBucket := bucket;
          lastPriority := priority;
        } else if (priority < lastPriority) {
          // Same bucket, but higher priority - replace the last event
          let lastIndex = filteredEvents.size() - 1;
          ignore filteredEvents.remove(lastIndex);
          filteredEvents.add(event);
          lastPriority := priority;
        };
        // Otherwise skip (same bucket, lower or equal priority)
      };

      // Print segment 0 debug data at the very end
      Debug.print("=== SEGMENT 0 DEBUG DATA ===");
      Debug.print(segment0DebugData);
      Debug.print("=== SEGMENT 1 DEBUG DATA ===");
      Debug.print(segment1DebugData);
      Debug.print("=== SEGMENT 2 DEBUG DATA ===");
      Debug.print(segment2DebugData);

      ?(results, Buffer.toArray(filteredEvents));
    };
  };

  // ===== RACE MANAGER =====

  public class RaceManager(initRaces : Map.Map<Nat, Race>) {
    private let races = initRaces;
    // FIXED: Use max key + 1 instead of size to prevent ID reuse after deletions
    private var nextRaceId : Nat = do {
      var maxId : Nat = 0;
      for (raceId in Map.keys(races)) {
        if (raceId >= maxId) { maxId := raceId + 1 };
      };
      maxId;
    };

    /// Generate race name
    private func generateRaceName(raceId : Nat, terrain : Terrain, raceClass : RaceClass) : Text {
      let terrainNames = switch (terrain) {
        case (#ScrapHeaps) {
          ["Garbage Tower Gauntlet", "Junkyard Sprint", "Scrap Pile Circuit", "Rust Mountain Rally"];
        };
        case (#WastelandSand) {
          ["Desert Death Run", "Sand Storm Circuit", "Wasteland Fury", "Dune Racer Challenge"];
        };
        case (#MetalRoads) {
          ["Highway of the Dead", "Ancient Asphalt Race", "Metal Road Mayhem", "Old World Sprint"];
        };
      };

      let classPrefix = switch (raceClass) {
        case (#Scrap) { "Scrap" };
        case (#Junker) { "Junker" };
        case (#Raider) { "Raider" };
        case (#Elite) { "Elite" };
        case (#SilentKlan) { "Silent Klan Invitational" };
      };

      let nameIndex = raceId % 4;
      let baseName = terrainNames[nameIndex];
      classPrefix # " " # baseName # " #" # Nat.toText(raceId);
    };

    /// Create a new race
    public func createRace(
      distance : Nat,
      terrain : Terrain,
      raceClass : RaceClass,
      entryFee : Nat,
      maxEntries : Nat,
      minEntries : Nat,
      startTime : Int,
      platformBonus : Nat,
      entryDeadline : Int,
    ) : Race {
      let raceId = nextRaceId;
      nextRaceId += 1;

      let now = Time.now();

      // Select track based on terrain and distance hint
      let trackId = selectTrackForRace(terrain, distance, raceId);

      // Get the actual track to use its real totalDistance
      let actualDistance = switch (getTrack(trackId)) {
        case (?track) {
          // Convert meters to km (rounded)
          (track.totalDistance + 500) / 1000; // +500 for rounding
        };
        case (null) {
          distance; // Fallback to passed distance if track not found
        };
      };

      let sim = RaceSimulator();
      let duration = sim.calculateRaceDuration(actualDistance, terrain);

      // trackSeed will be generated at race finish using IC random beacon
      // This prevents pre-simulation of race outcomes
      let trackSeed = 0;

      let race : Race = {
        raceId = raceId;
        name = generateRaceName(raceId, terrain, raceClass);
        distance = actualDistance; // Use track's actual distance
        terrain = terrain;
        trackId = trackId;
        trackSeed = trackSeed;
        raceClass = raceClass;
        entryFee = entryFee;
        maxEntries = maxEntries;
        minEntries = minEntries;
        startTime = startTime;
        duration = duration;
        entryDeadline = entryDeadline;
        createdAt = now;
        entries = [];
        status = #Upcoming;
        results = null;
        events = []; // Race commentary events
        prizePool = 0;
        platformTax = 0;
        platformBonus = platformBonus;
        sponsors = [];
      };

      ignore Map.put(races, nhash, raceId, race);
      race;
    };

    /// Select appropriate track based on terrain and distance
    private func selectTrackForRace(terrain : Terrain, distance : Nat, raceId : Nat) : Nat {
      // Define tracks by terrain and distance ranges
      // Short tracks (< 8km): suitable for Daily Sprints (5-10km)
      // Medium tracks (8-20km): suitable for Weekly Leagues (15-25km)
      // Long tracks (20-35km): suitable for longer events
      // Ultra tracks (45km+): for ultra marathons

      let (shortTracks, mediumTracks, longTracks, ultraTracks) = switch (terrain) {
        case (#ScrapHeaps) {
          (
            [4, 8], // Junkyard Sprint (4.05km), Debris Field Dash (7.1km)
            [1], // Scrap Mountain Circuit (10.1km)
            [13], // Iron Crucible (28.8km) - ScrapHeaps/MetalRoads mixed
            [15], // Survival Gauntlet (59km) - all terrains, ScrapHeaps primary
          );
        };
        case (#MetalRoads) {
          (
            [2, 7, 9], // Highway (6.7km), Rust Belt Rally (9.2km), Velocity Viaduct (4.5km)
            [5], // Metal Mesa Loop (7.4km)
            [13], // Iron Crucible (28.8km) - MetalRoads primary
            [15], // Survival Gauntlet (59km) - mixed
          );
        };
        case (#WastelandSand) {
          (
            [11], // Desert Sprint (6.3km)
            [10, 3, 6], // Sandstorm Circuit (10.8km), Wasteland Gauntlet (13.3km), Dune Runner (16.6km)
            [12], // Wasteland Odyssey (22.6km)
            [14], // Endless Expanse (50.5km)
          );
        };
      };

      // Select appropriate track pool based on distance
      let candidateTracks = if (distance <= 10) {
        // Short distance races (5-10km) - use short tracks
        shortTracks;
      } else if (distance <= 20) {
        // Medium distance races (11-20km) - prefer medium, fallback to short
        if (mediumTracks.size() > 0) {
          mediumTracks;
        } else {
          shortTracks;
        };
      } else if (distance <= 40) {
        // Long distance races (21-40km) - prefer long, fallback to medium
        if (longTracks.size() > 0) {
          longTracks;
        } else if (mediumTracks.size() > 0) {
          mediumTracks;
        } else {
          shortTracks;
        };
      } else {
        // Ultra marathon races (40km+) - use ultra tracks
        if (ultraTracks.size() > 0) {
          ultraTracks;
        } else if (longTracks.size() > 0) {
          longTracks;
        } else if (mediumTracks.size() > 0) {
          mediumTracks;
        } else {
          shortTracks;
        };
      };

      // If no candidates found, fall back to default track for terrain
      if (candidateTracks.size() == 0) {
        return switch (terrain) {
          case (#ScrapHeaps) { 1 };
          case (#MetalRoads) { 2 };
          case (#WastelandSand) { 3 };
        };
      };

      // Select from matching tracks using raceId for variety
      let index = raceId % candidateTracks.size();
      candidateTracks[index];
    };

    /// Set trackSeed for a race (called at race finish with random beacon)
    public func setTrackSeed(raceId : Nat, seed : Nat) : ?Race {
      switch (Map.get(races, nhash, raceId)) {
        case (?race) {
          let updatedRace = {
            raceId = race.raceId;
            name = race.name;
            distance = race.distance;
            terrain = race.terrain;
            trackId = race.trackId;
            trackSeed = seed;
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
            events = race.events;
            prizePool = race.prizePool;
            platformTax = race.platformTax;
            platformBonus = race.platformBonus;
            sponsors = race.sponsors;
          };
          ignore Map.put(races, nhash, raceId, updatedRace);
          ?updatedRace;
        };
        case (null) { null };
      };
    };

    /// Get race by ID
    public func getRace(raceId : Nat) : ?Race {
      Map.get(races, nhash, raceId);
    };

    /// Get all races
    public func getAllRaces() : [Race] {
      Iter.toArray(Map.vals(races));
    };

    /// Get upcoming races
    public func getUpcomingRaces() : [Race] {
      let allRaces = getAllRaces();
      Array.filter<Race>(
        allRaces,
        func(r) { r.status == #Upcoming },
      );
    };

    /// Enter a racer in a race
    public func enterRace(
      raceId : Nat,
      nftId : Text,
      owner : Principal,
      now : Int,
    ) : ?Race {
      switch (getRace(raceId)) {
        case (?race) {
          // Check if this bot is already entered in this race
          let alreadyEntered = Array.find<RaceEntry>(
            race.entries,
            func(e : RaceEntry) : Bool { e.nftId == nftId },
          );

          switch (alreadyEntered) {
            case (?_) {
              // Bot is already entered, return null to indicate failure
              return null;
            };
            case (null) {
              // Bot not entered yet, proceed with entry
              let entry : RaceEntry = {
                nftId = nftId;
                owner = owner;
                entryFee = race.entryFee;
                enteredAt = now;
                stats = null; // Stats snapshot added at race start
              };

              let newEntries = Array.append<RaceEntry>(race.entries, [entry]);
              let newPrizePool = race.prizePool + race.entryFee;
              let newTax = (newPrizePool * 5) / 100;

              let updatedRace = {
                race with
                entries = newEntries;
                prizePool = newPrizePool;
                platformTax = newTax;
              };

              ignore Map.put(races, nhash, raceId, updatedRace);
              ?updatedRace;
            };
          };
        };
        case (null) { null };
      };
    };

    /// Add entry to race without payment (for pre-registered event participants)
    /// Entry fee was already paid at event registration time
    public func addEntryWithoutPayment(
      raceId : Nat,
      tokenIndex : Nat,
      owner : Principal,
    ) : ?Race {
      let nftId = Nat.toText(tokenIndex);
      let now = Time.now();

      switch (getRace(raceId)) {
        case (?race) {
          // Check if this bot is already entered in this race
          let alreadyEntered = Array.find<RaceEntry>(
            race.entries,
            func(e : RaceEntry) : Bool { e.nftId == nftId },
          );

          switch (alreadyEntered) {
            case (?_) {
              // Bot is already entered, return null to indicate failure
              return null;
            };
            case (null) {
              // Bot not entered yet, add entry WITHOUT modifying prize pool
              // Prize pool will be calculated at race start by updateRaceEntries()
              let entry : RaceEntry = {
                nftId = nftId;
                owner = owner;
                entryFee = race.entryFee;
                enteredAt = now;
                stats = null; // Stats snapshot added at race start
              };

              let newEntries = Array.append<RaceEntry>(race.entries, [entry]);

              let updatedRace = {
                race with
                entries = newEntries;
                // Prize pool NOT modified - will be calculated at race start
              };

              ignore Map.put(races, nhash, raceId, updatedRace);
              ?updatedRace;
            };
          };
        };
        case (null) { null };
      };
    };

    /// Add sponsor to race
    public func addSponsor(
      raceId : Nat,
      sponsor : Principal,
      amount : Nat,
      message : ?Text,
    ) : ?Race {
      switch (getRace(raceId)) {
        case (?race) {
          if (race.status != #Upcoming) {
            return null;
          };

          let sponsorEntry : Sponsor = {
            sponsor = sponsor;
            amount = amount;
            message = message;
            timestamp = Time.now();
          };

          let newSponsors = Array.append<Sponsor>(race.sponsors, [sponsorEntry]);
          let newPrizePool = race.prizePool + amount;
          let newTax = (newPrizePool * 5) / 100;

          let updatedRace = {
            race with
            sponsors = newSponsors;
            prizePool = newPrizePool;
            platformTax = newTax;
          };

          ignore Map.put(races, nhash, raceId, updatedRace);
          ?updatedRace;
        };
        case (null) { null };
      };
    };

    /// Update race status
    public func updateRaceStatus(raceId : Nat, newStatus : RaceStatus) : ?Race {
      switch (getRace(raceId)) {
        case (?race) {
          let updatedRace = {
            race with
            status = newStatus;
          };
          ignore Map.put(races, nhash, raceId, updatedRace);
          ?updatedRace;
        };
        case (null) { null };
      };
    };

    /// Update race name (used for multi-stage events to include stage name)
    public func updateRaceName(raceId : Nat, newName : Text) : ?Race {
      switch (getRace(raceId)) {
        case (?race) {
          let updatedRace = {
            race with
            name = newName;
          };
          ignore Map.put(races, nhash, raceId, updatedRace);
          ?updatedRace;
        };
        case (null) { null };
      };
    };

    /// Delete a race from storage (for cleanup of orphaned races)
    public func deleteRace(raceId : Nat) : Bool {
      switch (Map.remove(races, nhash, raceId)) {
        case (?_race) { true };
        case (null) { false };
      };
    };

    /// Update race entries (used for removing ineligible entries at race start)
    public func updateRaceEntries(raceId : Nat, newEntries : [RaceEntry]) : ?Race {
      switch (getRace(raceId)) {
        case (?race) {
          // Recalculate prize pool based on remaining entries
          var newPrizePool : Nat = 0;
          for (entry in newEntries.vals()) {
            newPrizePool += entry.entryFee;
          };

          let newTax = (newPrizePool * 5) / 100;

          let updatedRace = {
            race with
            entries = newEntries;
            prizePool = newPrizePool;
            platformTax = newTax;
          };
          ignore Map.put(races, nhash, raceId, updatedRace);
          ?updatedRace;
        };
        case (null) { null };
      };
    };

    /// Set race results
    public func setRaceResults(raceId : Nat, results : [RaceResult], events : [RaceEvent]) : ?Race {
      switch (getRace(raceId)) {
        case (?race) {
          let updatedRace = {
            race with
            results = ?results;
            events = events;
            // Don't change status here - race is still InProgress until handleRaceFinish
          };
          ignore Map.put(races, nhash, raceId, updatedRace);
          ?updatedRace;
        };
        case (null) { null };
      };
    };

    /// Update race duration to actual time (after simulation)
    public func updateRaceDuration(raceId : Nat, actualDuration : Nat) : ?Race {
      switch (getRace(raceId)) {
        case (?race) {
          let updatedRace = {
            race with
            duration = actualDuration;
          };
          ignore Map.put(races, nhash, raceId, updatedRace);
          ?updatedRace;
        };
        case (null) { null };
      };
    };

    /// Update race start time (for chained races that start later than scheduled)
    public func updateRaceStartTime(raceId : Nat, newStartTime : Int) : ?Race {
      switch (getRace(raceId)) {
        case (?race) {
          let updatedRace = {
            race with
            startTime = newStartTime;
          };
          ignore Map.put(races, nhash, raceId, updatedRace);
          ?updatedRace;
        };
        case (null) { null };
      };
    };

    /// Get races map for stable storage
    public func getRacesMap() : Map.Map<Nat, Race> {
      races;
    };
  };
};
