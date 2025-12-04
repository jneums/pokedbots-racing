import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";
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

  // ===== RACE TYPES =====

  public type RaceClass = {
    #Scavenger; // 0-2 wins
    #Raider; // 3-5 wins
    #Elite; // 6-9 wins
    #SilentKlan; // 10+ wins
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
  };

  public type RaceResult = {
    nftId : Text;
    owner : Principal;
    position : Nat;
    finalTime : Float;
    prizeAmount : Nat;
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
    platformBonus : Nat; // Platform bonus for Scavenger/Raider classes
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

    /// Simulate a race and return results
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

      // Calculate times
      var racerTimes : [(RacingParticipant, Float)] = [];

      for (i in Iter.range(0, participants.size() - 1)) {
        let participant = participants[i];
        let seed = combinedSeed * 1000 + i;
        let time = calculateRaceTime(race, participant, seed);
        racerTimes := Array.append(racerTimes, [(participant, time)]);
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

      for (i in Iter.range(0, sorted.size() - 1)) {
        let (participant, time) = sorted[i];
        let position = i + 1;

        let prize = if (position == 1) {
          (netPrizePool * 475) / 1000; // 47.5%
        } else if (position == 2) {
          (netPrizePool * 2375) / 10000; // 23.75%
        } else if (position == 3) {
          (netPrizePool * 1425) / 10000; // 14.25%
        } else if (position == 4) {
          (netPrizePool * 95) / 1000; // 9.5%
        } else {
          0;
        };

        let result : RaceResult = {
          nftId = participant.nftId;
          owner = participant.owner;
          position = position;
          finalTime = time;
          prizeAmount = prize;
        };

        results := Array.append(results, [result]);
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
        case (#Scavenger) { "Scavenger" };
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
      let sim = RaceSimulator();
      let duration = sim.calculateRaceDuration(distance, terrain);

      let race : Race = {
        raceId = raceId;
        name = generateRaceName(raceId, terrain, raceClass);
        distance = distance;
        terrain = terrain;
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
          let entry : RaceEntry = {
            nftId = nftId;
            owner = owner;
            entryFee = race.entryFee;
            enteredAt = now;
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
            status = #Completed;
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
