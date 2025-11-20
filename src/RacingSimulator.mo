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
    startTime : Int;
    duration : Nat; // seconds
    entryDeadline : Int;
    createdAt : Int;
    entries : [RaceEntry];
    status : RaceStatus;
    results : ?[RaceResult];
    prizePool : Nat;
    platformTax : Nat; // 5% taken
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
    
    /// Deduct racing costs (battery drain, etc.)
    applyRaceCosts : (nftId : Text) -> ();
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
      
      // Terrain modifier
      let terrainMod = switch (race.terrain) {
        case (#ScrapHeaps) {
          1.0 + ((100.0 - stability) / 200.0); // Stability matters most
        };
        case (#WastelandSand) {
          1.0 + ((100.0 - powerCore) / 300.0); // Endurance matters
        };
        case (#MetalRoads) {
          1.0 + ((100.0 - acceleration) / 400.0); // Quick acceleration helps
        };
      };
      
      // Distance modifier
      let distanceMod = if (race.distance < 10) {
        // Short sprint: acceleration + speed
        1.0 - ((acceleration + speed - 60.0) / 500.0);
      } else if (race.distance > 20) {
        // Long trek: powerCore + stability
        1.0 - ((powerCore + stability - 60.0) / 500.0);
      } else {
        // Medium: balanced
        1.0 - ((speed + powerCore + acceleration + stability - 160.0) / 1000.0);
      };
      
      // Randomness (deterministic based on seed)
      let randomMod = 0.95 + (Float.fromInt(seed % 100) / 1000.0); // ±5%
      
      // Final time
      let finalTime = baseTime * terrainMod * distanceMod * randomMod;
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
      
      // Calculate times
      var racerTimes : [(RacingParticipant, Float)] = [];
      
      for (i in Iter.range(0, participants.size() - 1)) {
        let participant = participants[i];
        let seed = race.raceId * 1000 + i;
        let time = calculateRaceTime(race, participant, seed);
        racerTimes := Array.append(racerTimes, [(participant, time)]);
      };
      
      // Sort by time
      let sorted = Array.sort<(RacingParticipant, Float)>(
        racerTimes,
        func(a, b) { Float.compare(a.1, b.1) },
      );
      
      // Calculate prizes
      let netPrizePool = Nat.sub(race.prizePool, race.platformTax);
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
      startTime : Int,
      simulator : RaceSimulator,
    ) : Race {
      let raceId = nextRaceId;
      nextRaceId += 1;
      
      let now = Time.now();
      let entryDeadline = startTime - (30 * 60 * 1_000_000_000);
      let duration = simulator.calculateRaceDuration(distance, terrain);
      
      let race : Race = {
        raceId = raceId;
        name = generateRaceName(raceId, terrain, raceClass);
        distance = distance;
        terrain = terrain;
        raceClass = raceClass;
        entryFee = entryFee;
        maxEntries = maxEntries;
        startTime = startTime;
        duration = duration;
        entryDeadline = entryDeadline;
        createdAt = now;
        entries = [];
        status = #Upcoming;
        results = null;
        prizePool = 0;
        platformTax = 0;
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
