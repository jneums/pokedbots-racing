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
import Hash "mo:base/Hash";
import Buffer "mo:base/Buffer";
import Map "mo:map/Map";
import { nhash } "mo:map/Map";

/// RacingSimulator - Collection-Agnostic Racing Engine
/// This module provides generic racing functionality that can work with any NFT collection.
/// Collections provide stats via the RacingStatsProvider interface.
module {
  // ===== GENERIC RACING TYPES =====

  /// Core racing statistics - the only data needed to simulate a race
  public type RacingStats = {
    speed : Nat; // Base: 10-68, max with upgrades: 100+
    powerCore : Nat; // Base: 6-74, max with upgrades: 100+ (endurance)
    acceleration : Nat; // Base: 11-73, max with upgrades: 100+
    stability : Nat; // Base: 6-69, max with upgrades: 100+
  };

  /// A participant in a race - collection-agnostic
  public type RacingParticipant = {
    nftId : Text; // Generic NFT identifier
    owner : Principal;
    stats : RacingStats;
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
      case (_) { null };
    };
  };

  /// Track 1: Scrap Mountain Circuit (ScrapHeaps, technical)
  private let SCRAP_MOUNTAIN_CIRCUIT : TrackTemplate = {
    trackId = 1;
    name = "Scrap Mountain Circuit";
    description = "Technical climb through unstable debris";
    totalDistance = 10100; // 15 segments × 2 laps
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
    totalDistance = 13300;
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
    totalDistance = 4050;
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
    totalDistance = 7400;
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
    totalDistance = 16600;
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
      let speedSynergyMod = 0.80 + (speedAccelRatio * 0.20); // 0.80x to 1.0x
      let synergisticSpeed = (speedUniversal + speedBonus) * speedSynergyMod;

      // Power + Stability synergy (endurance needs stability)
      let powerStabilityRatio = (powerCore + stability) / 200.0; // 0.30 to 1.0
      let powerSynergyMod = 0.85 + (powerStabilityRatio * 0.15); // 0.85x to 1.0x

      // === PART 3: UNIVERSAL PENALTIES (all stats matter everywhere) ===

      // Power Core: Universal endurance (25% penalty range)
      let powerUniversal = 1.0 + ((100.0 - powerCore) / 400.0);

      // Acceleration: Universal responsiveness (20% penalty range)
      let accelUniversal = 1.0 + ((100.0 - acceleration) / 350.0);

      // Stability: Universal consistency (17% penalty range)
      let stabilityUniversal = 1.0 + ((100.0 - stability) / 400.0);

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
          1.0 + ((100.0 - acceleration) / 160.0); // +44% penalty on roads
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
      };

      var racerProgress : [RacerProgress] = [];
      for (participant in participants.vals()) {
        let newRacer : RacerProgress = {
          participant = participant;
          var cumulativeTime = 0.0;
          var previousDifficulty = 1.0;
          var poorPerformanceThisSegment = null;
        };
        racerProgress := Array.append(
          racerProgress,
          [newRacer],
        );
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

          // Calculate base segment time (convert distance from meters to km)
          let baseSegmentTime = calculateSegmentTime(
            segment,
            racer.participant.stats,
            segmentSeed,
            racer.previousDifficulty,
            race.distance / 1000, // Convert meters to km
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

          // Per-segment performance variation (±20% = 0.80 to 1.20)
          let lap = segmentIdx / track.segments.size();
          let segmentConditionSeed = ((segmentSeed * 31337 + i * 7919 + lap * 12345) % 1000);
          let segmentPerformance = 0.80 + (Float.fromInt(segmentConditionSeed) / 2500.0); // 0.80 to 1.20

          let segmentTime = baseSegmentTime * segmentPerformance * slipstreamBonus;

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
          if (segmentPerformance < 0.97) {
            // Faster than expected (good performance) - report if >3% faster
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
          } else if (segmentPerformance > 1.48) {
            // Slower than expected (poor performance) - track for later position-aware messaging
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
                    "Bot " # racer.participant.nftId # " another mistake!";
                  } else if (messageVariant == 2) {
                    "Bot " # racer.participant.nftId # " can't find the line!";
                  } else {
                    "Bot " # racer.participant.nftId # " hits trouble again!";
                  };
                } else {
                  "Just not Bot " # racer.participant.nftId # "'s day at all!";
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

        let baseParts : Nat = switch (race.raceClass) {
          case (#Scrap) { 2 };
          case (#Junker) { 5 };
          case (#Raider) { 12 };
          case (#Elite) { 25 };
          case (#SilentKlan) { 50 };
        };

        let positionMultiplier : Float = if (position == 1) {
          3.0;
        } else if (position == 2) {
          2.0;
        } else if (position == 3) {
          1.5;
        } else {
          1.0; // Everyone else: 1.0x (participation)
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
      // Priority: 1=Podium, 2=Lead Change, 3=Lap Complete, 4=Exceptional, 5=Close Racing, 6=Large Gap, 7=Poor Performance
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
    private var nextRaceId : Nat = Map.size(races);

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
      // Medium tracks (8-14km): suitable for Weekly Leagues (15-25km) - will use multiple laps
      // Long tracks (> 14km): suitable for longer events (20-30km)

      let (shortTracks, mediumTracks, longTracks) = switch (terrain) {
        case (#ScrapHeaps) {
          (
            [4, 8], // Junkyard Sprint (4.05km), Debris Field Dash (7.1km)
            [1], // Scrap Mountain Circuit (10.1km)
            [], // No long tracks yet
          );
        };
        case (#MetalRoads) {
          (
            [2, 7, 9], // Highway (6.7km), Rust Belt Rally (9.2km), Velocity Viaduct (4.5km)
            [5], // Metal Mesa Loop (7.4km)
            [], // No long tracks yet
          );
        };
        case (#WastelandSand) {
          (
            [11], // Desert Sprint (6.3km)
            [10, 3], // Sandstorm Circuit (10.8km), Wasteland Gauntlet (13.3km)
            [6], // Dune Runner (16.6km)
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
      } else {
        // Long distance races (> 20km) - prefer long, fallback to medium, then short
        if (longTracks.size() > 0) {
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

    /// Get races map for stable storage
    public func getRacesMap() : Map.Map<Nat, Race> {
      races;
    };
  };
};
