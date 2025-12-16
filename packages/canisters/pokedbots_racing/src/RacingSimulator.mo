import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Map "mo:map/Map";
import { nhash } "mo:map/Map";

/// RacingSimulator - Collection-Agnostic Racing Engine
/// This module provides generic racing functionality that can work with any NFT collection.
/// Collections provide stats via the RacingStatsProvider interface.
module {
  // ===== GENERIC RACING TYPES =====

  /// Core racing statistics - the only data needed to simulate a race
  public type RacingStats = {
    speed : Nat; // 30-100
    powerCore : Nat; // 30-100 (endurance)
    acceleration : Nat; // 30-100
    stability : Nat; // 30-100
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
    stats : ?RacingStats; // Stats used in the race (for accurate replay)
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

      Int.abs(Float.toInt(Float.fromInt(baseTime) * terrainMultiplier));
    };

    /// Calculate race time for a participant
    public func calculateRaceTime(
      race : Race,
      participant : RacingParticipant,
      seed : Nat,
    ) : Float {
      let distance = Float.fromInt(race.distance);
      let stats = participant.stats;

      // Convert stats to floats
      let speed = Float.fromInt(stats.speed);
      let powerCore = Float.fromInt(stats.powerCore);
      let stability = Float.fromInt(stats.stability);
      let acceleration = Float.fromInt(stats.acceleration);

      // Base time calculation (inverse of speed)
      let baseTime = distance * (100.0 / speed) * 30.0;

      // Terrain modifier - MORE IMPACTFUL (20-50% variation)
      let terrainMod = switch (race.terrain) {
        case (#ScrapHeaps) {
          1.0 + ((100.0 - stability) / 150.0); // Stability matters most (up to +67%)
        };
        case (#WastelandSand) {
          1.0 + ((100.0 - powerCore) / 200.0); // Endurance matters (up to +50%)
        };
        case (#MetalRoads) {
          1.0 + ((100.0 - acceleration) / 250.0); // Quick acceleration helps (up to +40%)
        };
      };

      // Distance modifier - MORE PRONOUNCED STAT INTERACTIONS
      let distanceMod = if (race.distance < 10) {
        // Short sprint: acceleration + speed dominate
        1.0 - ((acceleration + speed - 60.0) / 350.0);
      } else if (race.distance > 20) {
        // Long trek: powerCore + stability critical
        1.0 - ((powerCore + stability - 60.0) / 350.0);
      } else {
        // Medium: all stats matter
        1.0 - ((speed + powerCore + acceleration + stability - 160.0) / 700.0);
      };

      // Better pseudo-random using multiple hash-like operations
      // Mix race ID, participant stats, and position for uniqueness
      let raceSeed = (race.raceId * 31337 + 12345) % 100000;
      let statMix = (stats.speed * 7 + stats.powerCore * 11 + stats.acceleration * 13 + stats.stability * 17) % 10000;
      let mixedSeed = (seed * 2654435761 + raceSeed + statMix) % 1000000;

      // Race-specific chaos factor (±15%) - varies by race
      let raceChaosValue = (mixedSeed / 7) % 1000;
      let raceChaos = 0.85 + (Float.fromInt(raceChaosValue) / 3333.0); // 0.85 to 1.15

      // Per-bot randomness (±20%) - varies by bot AND position
      let botRandomValue = (mixedSeed / 11) % 1000;
      let botRandom = 0.80 + (Float.fromInt(botRandomValue) / 2500.0); // 0.80 to 1.20

      // Position-based variance (±10%) - starting position luck
      let positionValue = (mixedSeed / 13) % 1000;
      let positionBonus = 0.90 + (Float.fromInt(positionValue) / 5000.0); // 0.90 to 1.10

      // Stat interaction bonus (synergy between complementary stats)
      let statSynergy = if (
        (speed > 80 and acceleration > 80) or // Speed demons
        (powerCore > 80 and stability > 80) or // Endurance tanks
        (speed > 75 and powerCore > 75 and acceleration > 75 and stability > 75) // Well-rounded
      ) {
        0.95; // 5% bonus for synergistic builds
      } else if (
        (speed < 40 and powerCore < 40) or // Double weakness
        (acceleration < 40 and stability < 40),
      ) {
        1.08; // 8% penalty for double weaknesses
      } else {
        1.0;
      };

      // Final time with all modifiers
      let finalTime = baseTime * terrainMod * distanceMod * raceChaos * botRandom * positionBonus * statSynergy;
      Float.max(1.0, finalTime);
    };

    /// Calculate time for a single segment
    private func calculateSegmentTime(
      segment : TrackSegment,
      stats : RacingStats,
      seed : Nat,
      previousDifficulty : Float, // Difficulty of previous segment (1.0 for first segment)
    ) : Float {
      let speed = Float.fromInt(stats.speed);
      let powerCore = Float.fromInt(stats.powerCore);
      let stability = Float.fromInt(stats.stability);
      let acceleration = Float.fromInt(stats.acceleration);

      // Base time for segment (length in meters / effective speed)
      let segmentLength = Float.fromInt(segment.length);
      let baseSpeed = Float.sqrt(speed) * 7.5; // Square root to reduce speed dominance

      // Terrain modifier based on segment terrain
      let terrainMod = switch (segment.terrain) {
        case (#ScrapHeaps) {
          1.0 + ((100.0 - stability) / 150.0); // Stability critical - up to 67% penalty
        };
        case (#WastelandSand) {
          1.0 + ((100.0 - powerCore) / 200.0); // Endurance critical - up to 50% penalty
        };
        case (#MetalRoads) {
          1.0 + ((100.0 - acceleration) / 160.0); // Acceleration helps - up to 62% penalty
        };
      };

      // Angle modifier (uphill slows, downhill has no bonus)
      let angleMod = if (segment.angle > 0) {
        // Uphill - powerCore matters more
        1.0 + (Float.fromInt(segment.angle) * (100.0 - powerCore) / 3000.0);
      } else {
        // Downhill/flat - no bonus (speed already in base speed)
        1.0;
      };

      // Momentum system: acceleration affects speed buildup after difficult sections
      // Higher previous difficulty = more momentum lost, acceleration helps recovery
      let momentumLoss = if (previousDifficulty > 1.0) {
        // Lost momentum from technical section, need to rebuild speed
        (previousDifficulty - 1.0) * 0.15; // Up to 15% slower per 1.0 difficulty
      } else {
        0.0;
      };

      // Acceleration determines recovery: high accel = faster recovery
      let accelerationRecovery = acceleration / 140.0; // 0.0 to 0.71 (71% recovery at 100 accel)
      let momentumMod = 1.0 + (momentumLoss * (1.0 - accelerationRecovery));

      // Segment difficulty - scales with stability (low stability = worse on technical sections)
      let difficultyMod = if (segment.difficulty > 1.0) {
        // Technical sections (difficulty > 1.0) penalize low stability
        let stabilityFactor = 1.0 + ((100.0 - stability) / 300.0); // Up to +33% penalty at 0 stability
        segment.difficulty * stabilityFactor;
      } else {
        // Fast/easy sections don't penalize as much
        segment.difficulty;
      };

      // Randomness for this segment (±10% per segment)
      // Use simple modulo - seed varies per segment already via caller
      let segmentSeed = seed % 1000;
      let randomMod = 0.90 + (Float.fromInt(segmentSeed) / 5000.0); // 0.90 to 1.10

      // Calculate segment time with momentum
      let effectiveSpeed = baseSpeed / (terrainMod * angleMod * difficultyMod * momentumMod);
      let segmentTime = (segmentLength / effectiveSpeed) * randomMod;

      // 10x speed multiplier to reduce race times for better UX
      Float.max(0.1, segmentTime / 10.0);
    };

    /// Simulate race segment-by-segment and return only final times
    /// Frontend can use this same logic with trackSeed to replay deterministically
    public func simulateRaceSegmented(
      race : Race,
      participants : [RacingParticipant],
    ) : ?[RaceResult] {
      if (participants.size() < 2) {
        return null;
      };

      // Get track template
      let trackOpt = getTrack(race.trackId);
      let track = switch (trackOpt) {
        case (?t) { t };
        case (null) {
          // Fallback to old simulation if track not found
          return simulateRace(race, participants);
        };
      };

      // Build full segment list (segments × laps)
      var allSegments : [TrackSegment] = [];
      for (_ in Iter.range(0, track.laps - 1)) {
        allSegments := Array.append(allSegments, track.segments);
      };

      // Calculate total time for each participant
      var racerTimes : [(RacingParticipant, Float)] = [];

      for (i in Iter.range(0, participants.size() - 1)) {
        let participant = participants[i];

        // Debug logging for first participant
        if (i == 0) {
          Debug.print("Backend calculation for participant 0:");
          Debug.print("  nftId: " # participant.nftId);
          Debug.print("  speed: " # Nat.toText(participant.stats.speed));
          Debug.print("  powerCore: " # Nat.toText(participant.stats.powerCore));
          Debug.print("  acceleration: " # Nat.toText(participant.stats.acceleration));
          Debug.print("  stability: " # Nat.toText(participant.stats.stability));
          Debug.print("  trackId: " # Nat.toText(race.trackId));
          Debug.print("  trackSeed: " # Nat.toText(race.trackSeed));
          Debug.print("  totalSegments: " # Nat.toText(allSegments.size()));
          Debug.print("  terrain: " # debug_show (race.terrain));
        };

        // Calculate time through all segments (no DNF - bots race with whatever stats they have)
        var totalTime : Float = 0.0;
        var previousDifficulty : Float = 1.0; // Start with neutral difficulty

        for (segmentIdx in Iter.range(0, allSegments.size() - 1)) {
          let segment = allSegments[segmentIdx];
          // Use trackSeed + participant index + segment index for deterministic randomness
          let segmentSeed = race.trackSeed + (i * 1000) + segmentIdx;

          // Calculate base segment time
          let baseSegmentTime = calculateSegmentTime(segment, participant.stats, segmentSeed, previousDifficulty);

          // Per-segment performance variation (driver errors, debris, wind, etc.)
          // Each bot experiences different micro-conditions on each segment
          let lap = segmentIdx / track.segments.size();
          let segmentConditionSeed = ((segmentSeed * 31337 + i * 7919 + lap * 12345) % 1000);
          let segmentPerformance = 0.94 + (Float.fromInt(segmentConditionSeed) / 1666.67); // 0.94 to 1.06 (±6%)

          let segmentTime = baseSegmentTime * segmentPerformance;
          totalTime += segmentTime;

          // Debug first 3 segments for participant 0
          if (i == 0 and segmentIdx < 3) {
            Debug.print("  Segment " # Nat.toText(segmentIdx) # ": baseTime=" # Float.toText(baseSegmentTime) # ", perf=" # Float.toText(segmentPerformance) # ", finalTime=" # Float.toText(segmentTime));
          };

          // Update previous difficulty for next segment
          previousDifficulty := segment.difficulty;
        };

        // Debug logging for first participant
        if (i == 0) {
          Debug.print("Backend final time for participant 0: " # Float.toText(totalTime));
        };

        racerTimes := Array.append(racerTimes, [(participant, totalTime)]);
      };

      // Sort by time
      let sorted = Array.sort<(RacingParticipant, Float)>(
        racerTimes,
        func(a, b) { Float.compare(a.1, b.1) },
      );

      // Calculate prizes
      let totalPool = race.prizePool + race.platformBonus;
      let netPrizePool = Nat.sub(totalPool, race.platformTax);
      var results : [RaceResult] = [];

      // Add finishers with prizes
      // Prize distribution curve: ensures top 3 profit, 4th breaks even
      // Linear progression from 1st (45%) to 4th (9%)
      for (i in Iter.range(0, sorted.size() - 1)) {
        let (participant, time) = sorted[i];
        let position = i + 1;

        let prize = if (position == 1) {
          (netPrizePool * 45) / 100; // 45%
        } else if (position == 2) {
          (netPrizePool * 28) / 100; // 28%
        } else if (position == 3) {
          (netPrizePool * 18) / 100; // 18%
        } else if (position == 4) {
          (netPrizePool * 9) / 100; // 9%
        } else {
          0;
        };

        let result : RaceResult = {
          nftId = participant.nftId;
          owner = participant.owner;
          position = position;
          finalTime = time;
          prizeAmount = prize;
          stats = ?participant.stats; // Store stats used in the race
        };

        results := Array.append(results, [result]);
      };

      ?results;
    };

    /// Simulate a race and return results (OLD METHOD - kept for backward compatibility)
    public func simulateRace(
      race : Race,
      participants : [RacingParticipant],
    ) : ?[RaceResult] {
      if (participants.size() < 2) {
        return null;
      };

      // Use race start time as additional entropy for race-specific variance
      let raceTimeSeed = Int.abs(race.startTime / 1_000_000_000); // Convert to seconds
      let combinedSeed = race.raceId + raceTimeSeed;

      // Calculate times - DNF (Did Not Finish) if stats too low from battery/condition
      var racerTimes : [(RacingParticipant, Float)] = [];
      var dnfParticipants : [RacingParticipant] = [];

      for (i in Iter.range(0, participants.size() - 1)) {
        let participant = participants[i];

        // Check if bot has critical stats failure (below 10 in any stat = DNF)
        // This happens when battery is 0% or condition is 0%
        if (
          participant.stats.speed < 10 or participant.stats.acceleration < 10 or
          participant.stats.powerCore < 10 or participant.stats.stability < 10
        ) {
          dnfParticipants := Array.append(dnfParticipants, [participant]);
        } else {
          let seed = combinedSeed * 1000 + i;
          let time = calculateRaceTime(race, participant, seed);
          racerTimes := Array.append(racerTimes, [(participant, time)]);
        };
      };

      // Sort by time
      let sorted = Array.sort<(RacingParticipant, Float)>(
        racerTimes,
        func(a, b) { Float.compare(a.1, b.1) },
      );

      // Calculate prizes (include platform bonus + entry fees - tax)
      let totalPool = race.prizePool + race.platformBonus;
      let netPrizePool = Nat.sub(totalPool, race.platformTax);
      var results : [RaceResult] = [];

      // Add finishers with prizes
      // Prize distribution curve: ensures top 3 profit, 4th breaks even
      // Linear progression from 1st (45%) to 4th (9%)
      for (i in Iter.range(0, sorted.size() - 1)) {
        let (participant, time) = sorted[i];
        let position = i + 1;

        let prize = if (position == 1) {
          (netPrizePool * 45) / 100; // 45%
        } else if (position == 2) {
          (netPrizePool * 28) / 100; // 28%
        } else if (position == 3) {
          (netPrizePool * 18) / 100; // 18%
        } else if (position == 4) {
          (netPrizePool * 9) / 100; // 9%
        } else {
          0;
        };

        let result : RaceResult = {
          nftId = participant.nftId;
          owner = participant.owner;
          position = position;
          finalTime = time;
          prizeAmount = prize;
          stats = ?participant.stats; // Store stats used in the race
        };

        results := Array.append(results, [result]);
      };

      // Add DNF (Did Not Finish) participants at the end
      // They get no prize and a special DNF marker time (999999.0)
      for (participant in dnfParticipants.vals()) {
        let dnfResult : RaceResult = {
          nftId = participant.nftId;
          owner = participant.owner;
          position = results.size() + 1; // Last place + 1, 2, 3...
          finalTime = 999999.0; // DNF marker
          prizeAmount = 0;
          stats = ?participant.stats; // Store stats even for DNF
        };
        results := Array.append(results, [dnfResult]);
      };

      ?results;
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
        prizePool = 0;
        platformTax = 0;
        platformBonus = platformBonus;
        sponsors = [];
      };

      ignore Map.put(races, nhash, raceId, race);
      race;
    };

    /// Select appropriate track based on terrain and distance
    private func selectTrackForRace(terrain : Terrain, _distance : Nat, raceId : Nat) : Nat {
      // Filter tracks by terrain match
      let terrainMatches = switch (terrain) {
        case (#ScrapHeaps) { [1, 4] }; // Scrap Mountain, Junkyard Sprint
        case (#MetalRoads) { [2, 5] }; // Highway, Metal Mesa
        case (#WastelandSand) { [3] }; // Wasteland Gauntlet
      };

      // Select from matching tracks using raceId for variety
      let index = raceId % terrainMatches.size();
      terrainMatches[index];
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
    public func setRaceResults(raceId : Nat, results : [RaceResult]) : ?Race {
      switch (getRace(raceId)) {
        case (?race) {
          let updatedRace = {
            race with
            results = ?results;
            // Don't change status here - race is still InProgress until handleRaceFinish
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
