import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";
import Char "mo:base/Char";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Map "mo:map/Map";
import { nhash; phash } "mo:map/Map";
import RacingSimulator "./RacingSimulator";
import ELO "./ELO";

/// PokedBotsGarage - Collection-Specific Racing Logic
/// Handles PokedBots NFT stats, factions, upgrades, and marketplace integration
module {
  // ===== POKEDBOTS-SPECIFIC TYPES =====

  public type FactionType = {
    // Ultra-Rare (1-45 bots)
    #UltimateMaster; // 1 bot
    #Wild; // 5 bots
    #Golden; // 27 bots
    #Ultimate; // 45 bots

    // Super-Rare (244-640 bots)
    #Blackhole; // 244 bots
    #Dead; // 382 bots
    #Master; // 640 bots

    // Rare (717-999 bots)
    #Bee; // 717 bots
    #Food; // 778 bots
    #Box; // 798 bots
    #Murder; // 999 bots

    // Common (1654-2009 bots)
    #Game; // 1654 bots
    #Animal; // 1701 bots
    #Industrial; // 2009 bots
  };

  public type Distance = {
    #ShortSprint;
    #MediumHaul;
    #LongTrek;
  };

  public type Terrain = RacingSimulator.Terrain;

  public type PokedBotRacingStats = {
    tokenIndex : Nat;
    ownerPrincipal : Principal;
    faction : FactionType;

    // Upgrade bonuses
    speedBonus : Nat;
    powerCoreBonus : Nat;
    accelerationBonus : Nat;
    stabilityBonus : Nat;

    // Upgrade counts (for progressive costs)
    speedUpgrades : Nat;
    powerCoreUpgrades : Nat;
    accelerationUpgrades : Nat;
    stabilityUpgrades : Nat;

    // Dynamic stats
    battery : Nat;
    condition : Nat;
    experience : Nat;

    // Preferences
    preferredDistance : Distance;
    preferredTerrain : Terrain;

    // Career stats
    racesEntered : Nat;
    wins : Nat;
    places : Nat;
    shows : Nat;
    totalScrapEarned : Nat;
    factionReputation : Nat;
    eloRating : Nat; // ELO rating for skill-based matchmaking (default 1500)

    // Timestamps
    activatedAt : Int;
    lastDecayed : Int;
    lastRecharged : ?Int;
    lastRepaired : ?Int;
    lastDiagnostics : ?Int;
    lastRaced : ?Int;
    upgradeEndsAt : ?Int;
    listedForSale : Bool;
  };

  public type UpgradeType = {
    #Velocity;
    #PowerCore;
    #Thruster;
    #Gyro;
  };

  public type UpgradeSession = {
    tokenIndex : Nat;
    upgradeType : UpgradeType;
    startedAt : Int;
    endsAt : Int;
  };

  public type PartType = {
    #SpeedChip;
    #PowerCoreFragment;
    #ThrusterKit;
    #GyroModule;
    #UniversalPart;
  };

  public type UserInventory = {
    owner : Principal;
    speedChips : Nat;
    powerCoreFragments : Nat;
    thrusterKits : Nat;
    gyroModules : Nat;
    universalParts : Nat;
  };

  // Import stat derivation functions from Racing module (we'll keep these here)
  // These will be extracted and cleaned up

  /// Hash text to number for deterministic randomness
  private func _hashText(text : Text) : Nat {
    var hash : Nat = 0;
    for (char in text.chars()) {
      hash := (hash * 31 + Nat32.toNat(Char.toNat32(char))) % 1000000;
    };
    hash;
  };

  /// Hash nat for deterministic randomness
  private func hashNat(n : Nat) : Nat {
    let a = n * 2654435761;
    let b = a % 4294967296;
    let c = (b * 1103515245 + 12345) % 2147483648;
    c;
  };

  // ===== POKEDBOTS GARAGE MANAGER =====

  public class PokedBotsGarageManager(
    initStats : Map.Map<Nat, PokedBotRacingStats>,
    initActiveUpgrades : Map.Map<Nat, UpgradeSession>,
    initUserInventories : Map.Map<Principal, UserInventory>,
    statsProvider : {
      getNFTMetadata : (Nat) -> ?[(Text, Text)];
      getPrecomputedStats : (Nat) -> ?{
        speed : Nat;
        powerCore : Nat;
        acceleration : Nat;
        stability : Nat;
        faction : FactionType;
      };
    },
  ) {
    private let stats = initStats;
    private let activeUpgrades = initActiveUpgrades;
    private let userInventories = initUserInventories;

    // ===== RACING STATS PROVIDER IMPLEMENTATION =====

    /// Apply faction terrain bonuses for racing
    private func applyTerrainBonus(stats : { speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat }, faction : FactionType, terrain : Terrain, condition : Nat) : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    } {
      let bonus : Float = switch (faction, terrain) {
        // Blackhole: +12% on MetalRoads
        case (#Blackhole, #MetalRoads) { 1.12 };
        // Box: +10% on ScrapHeaps
        case (#Box, #ScrapHeaps) { 1.10 };
        // Game: +8% on WastelandSand
        case (#Game, #WastelandSand) { 1.08 };
        // Golden: +15% when condition >= 90
        case (#Golden, _) {
          if (condition >= 90) { 1.15 } else { 1.0 };
        };
        // All others: no terrain bonus
        case (_) { 1.0 };
      };

      if (bonus == 1.0) {
        return stats;
      };

      // Apply bonus to all stats
      {
        speed = Nat.min(100, Int.abs(Float.toInt(Float.fromInt(stats.speed) * bonus)));
        powerCore = Nat.min(100, Int.abs(Float.toInt(Float.fromInt(stats.powerCore) * bonus)));
        acceleration = Nat.min(100, Int.abs(Float.toInt(Float.fromInt(stats.acceleration) * bonus)));
        stability = Nat.min(100, Int.abs(Float.toInt(Float.fromInt(stats.stability) * bonus)));
      };
    };

    /// Get racing stats for the generic racing simulator (without terrain bonuses)
    public func getRacingStats(nftId : Text) : ?RacingSimulator.RacingStats {
      let tokenIndex = Nat.fromText(nftId);
      switch (tokenIndex) {
        case (?idx) {
          switch (Map.get(stats, nhash, idx)) {
            case (?botStats) {
              let current = getCurrentStats(botStats);
              ?{
                speed = current.speed;
                powerCore = current.powerCore;
                acceleration = current.acceleration;
                stability = current.stability;
              };
            };
            case (null) { null };
          };
        };
        case (null) { null };
      };
    };

    /// Get racing stats WITH terrain bonuses applied
    public func getRacingStatsWithTerrain(nftId : Text, terrain : Terrain) : ?RacingSimulator.RacingStats {
      let tokenIndex = Nat.fromText(nftId);
      switch (tokenIndex) {
        case (?idx) {
          switch (Map.get(stats, nhash, idx)) {
            case (?botStats) {
              let current = getCurrentStats(botStats);
              let boosted = applyTerrainBonus(current, botStats.faction, terrain, botStats.condition);
              ?{
                speed = boosted.speed;
                powerCore = boosted.powerCore;
                acceleration = boosted.acceleration;
                stability = boosted.stability;
              };
            };
            case (null) { null };
          };
        };
        case (null) { null };
      };
    };

    /// Check if bot can race
    public func canRace(nftId : Text) : Bool {
      let tokenIndex = Nat.fromText(nftId);
      switch (tokenIndex) {
        case (?idx) {
          switch (Map.get(stats, nhash, idx)) {
            case (?botStats) {
              botStats.condition >= 70 and botStats.battery >= 50 and Option.isNull(botStats.upgradeEndsAt) and not botStats.listedForSale;
            };
            case (null) { false };
          };
        };
        case (null) { false };
      };
    };

    /// Record race result (update career stats)
    public func recordRaceResult(nftId : Text, position : Nat, _racers : Nat, prize : Nat) {
      let tokenIndex = Nat.fromText(nftId);
      switch (tokenIndex) {
        case (?idx) {
          switch (Map.get(stats, nhash, idx)) {
            case (?botStats) {
              let updatedStats = {
                botStats with
                racesEntered = botStats.racesEntered + 1;
                wins = if (position == 1) { botStats.wins + 1 } else {
                  botStats.wins;
                };
                places = if (position == 2) { botStats.places + 1 } else {
                  botStats.places;
                };
                shows = if (position == 3) { botStats.shows + 1 } else {
                  botStats.shows;
                };
                totalScrapEarned = botStats.totalScrapEarned + prize;
                experience = botStats.experience + (if (position == 1) { 20 } else if (position <= 3) { 10 } else { 5 });
                factionReputation = botStats.factionReputation + (if (position == 1) { 10 } else if (position <= 3) { 5 } else { 2 });
                lastRaced = ?Time.now();
              };
              updateStats(idx, updatedStats);
            };
            case (null) {};
          };
        };
        case (null) {};
      };
    };

    /// Calculate and apply ELO changes for all race participants
    /// Should be called once with all race results before individual recordRaceResult calls
    public func applyRaceEloChanges(results : [(Text, Nat)]) {
      // results: [(nftId, position)]

      // Convert to format needed for ELO calculation: (tokenIndex, currentElo, racesEntered, position)
      let eloInputs = Array.mapFilter<(Text, Nat), (Nat, Nat, Nat, Nat)>(
        results,
        func((nftId, position) : (Text, Nat)) : ?(Nat, Nat, Nat, Nat) {
          switch (Nat.fromText(nftId)) {
            case (?tokenIndex) {
              switch (Map.get(stats, nhash, tokenIndex)) {
                case (?botStats) {
                  ?(tokenIndex, botStats.eloRating, botStats.racesEntered, position);
                };
                case (null) { null };
              };
            };
            case (null) { null };
          };
        },
      );

      // Calculate ELO changes for all participants
      let eloChanges = ELO.calculateMultiBotEloChanges(eloInputs);

      // Apply ELO changes to each bot
      for ((tokenIndex, eloChange) in eloChanges.vals()) {
        switch (Map.get(stats, nhash, tokenIndex)) {
          case (?botStats) {
            let newElo = ELO.applyEloChange(botStats.eloRating, eloChange);
            let updatedStats = {
              botStats with
              eloRating = newElo;
            };
            updateStats(tokenIndex, updatedStats);
          };
          case (null) {};
        };
      };
    };

    /// Apply race costs (battery drain and condition wear)
    /// Costs scale with distance, terrain difficulty, and finishing position
    public func applyRaceCosts(nftId : Text, distance : Nat, terrain : RacingSimulator.Terrain, position : Nat) {
      let tokenIndex = Nat.fromText(nftId);
      switch (tokenIndex) {
        case (?idx) {
          switch (Map.get(stats, nhash, idx)) {
            case (?botStats) {
              // Battery drain scales with distance
              // Base: 10 for short (5km), 15 for medium (15km), 20 for long (25km+)
              let baseBatteryDrain = if (distance < 10) { 10 } else if (distance < 20) {
                15;
              } else { 20 };

              // Terrain modifier for battery
              let terrainBatteryMod = switch (terrain) {
                case (#ScrapHeaps) { 1.2 }; // Rough terrain = +20% drain
                case (#WastelandSand) { 1.1 }; // Sandy = +10% drain
                case (#MetalRoads) { 1.0 }; // Smooth roads = normal
              };

              let totalBatteryDrain = Float.toInt(Float.fromInt(baseBatteryDrain) * terrainBatteryMod);
              let finalBatteryDrain = Nat.min(botStats.battery, Int.abs(totalBatteryDrain));

              // Condition wear scales with distance and finishing position
              // Winners take less damage (better racing line), losers take more
              let baseConditionWear = if (distance < 10) { 3 } else if (distance < 20) {
                5;
              } else { 7 };

              // Position penalty (1st = 0.8x, 2nd = 1.0x, 3rd = 1.2x, 4th+ = 1.4x)
              let positionMod = if (position == 1) { 0.8 } else if (position == 2) {
                1.0;
              } else if (position == 3) { 1.2 } else { 1.4 };

              // Terrain modifier for condition
              let terrainConditionMod = switch (terrain) {
                case (#ScrapHeaps) { 1.5 }; // Very rough = +50% wear
                case (#WastelandSand) { 1.2 }; // Moderate = +20% wear
                case (#MetalRoads) { 1.0 }; // Smooth = normal
              };

              let totalConditionWear = Float.toInt(Float.fromInt(baseConditionWear) * positionMod * terrainConditionMod);
              let finalConditionWear = Nat.min(botStats.condition, Int.abs(totalConditionWear));

              let updatedStats = {
                botStats with
                battery = Nat.sub(botStats.battery, finalBatteryDrain);
                condition = Nat.sub(botStats.condition, finalConditionWear);
              };
              updateStats(idx, updatedStats);
            };
            case (null) {};
          };
        };
        case (null) {};
      };
    };

    // ===== GARAGE-SPECIFIC FUNCTIONS =====

    /// Initialize a new PokedBot for racing
    public func initializeBot(
      tokenIndex : Nat,
      owner : Principal,
      factionOverride : ?FactionType,
    ) : PokedBotRacingStats {
      let metadata = statsProvider.getNFTMetadata(tokenIndex);

      // Get faction from precomputed stats or use override
      let faction = switch (factionOverride) {
        case (?f) { f };
        case (null) {
          switch (statsProvider.getPrecomputedStats(tokenIndex)) {
            case (?precomputed) { precomputed.faction };
            case (null) {
              // Fallback: distribute across all 14 factions
              let mod = tokenIndex % 100;
              if (mod < 1) { #UltimateMaster } else if (mod < 2) { #Wild } else if (mod < 5) {
                #Golden;
              } else if (mod < 10) { #Ultimate } else if (mod < 15) {
                #Blackhole;
              } else if (mod < 20) { #Dead } else if (mod < 30) { #Master } else if (mod < 38) {
                #Bee;
              } else if (mod < 46) { #Food } else if (mod < 54) { #Box } else if (mod < 64) {
                #Murder;
              } else if (mod < 78) { #Game } else if (mod < 92) { #Animal } else {
                #Industrial;
              };
            };
          };
        };
      };

      // Get base stats
      let baseStats = getBaseStats(tokenIndex);

      let now = Time.now();

      let racingStats : PokedBotRacingStats = {
        tokenIndex = tokenIndex;
        ownerPrincipal = owner;
        faction = faction;
        speedBonus = 0;
        powerCoreBonus = 0;
        accelerationBonus = 0;
        stabilityBonus = 0;
        speedUpgrades = 0;
        powerCoreUpgrades = 0;
        accelerationUpgrades = 0;
        stabilityUpgrades = 0;
        battery = 100;
        condition = 100;
        experience = 0;
        preferredDistance = derivePreferredDistance(baseStats.powerCore, baseStats.speed);
        preferredTerrain = switch (metadata) {
          case (?traits) { derivePreferredTerrain(traits) };
          case (null) {
            let hash = hashNat(tokenIndex);
            let choice = hash % 3;
            if (choice == 0) { #ScrapHeaps } else if (choice == 1) {
              #MetalRoads;
            } else { #WastelandSand };
          };
        };
        racesEntered = 0;
        wins = 0;
        places = 0;
        shows = 0;
        totalScrapEarned = 0;
        factionReputation = 0;
        eloRating = 1500; // Start all bots at 1500 ELO
        activatedAt = now;
        lastDecayed = now; // Initialize decay tracking
        lastRecharged = null;
        lastRepaired = null;
        lastDiagnostics = null;
        lastRaced = null;
        upgradeEndsAt = null;
        listedForSale = false;
      };

      ignore Map.put(stats, nhash, tokenIndex, racingStats);
      racingStats;
    };

    /// Get stats for a bot
    public func getStats(tokenIndex : Nat) : ?PokedBotRacingStats {
      Map.get(stats, nhash, tokenIndex);
    };

    /// Update stats
    public func updateStats(tokenIndex : Nat, newStats : PokedBotRacingStats) {
      ignore Map.put(stats, nhash, tokenIndex, newStats);
    };

    /// Check if initialized
    public func isInitialized(tokenIndex : Nat) : Bool {
      Option.isSome(Map.get(stats, nhash, tokenIndex));
    };

    /// Get all bots for owner
    public func getBotsForOwner(owner : Principal) : [PokedBotRacingStats] {
      let allStats = Map.vals(stats);
      Array.filter<PokedBotRacingStats>(
        Iter.toArray(allStats),
        func(s) { Principal.equal(s.ownerPrincipal, owner) },
      );
    };

    /// Get base stats from precomputed or metadata
    public func getBaseStats(tokenIndex : Nat) : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    } {
      switch (statsProvider.getPrecomputedStats(tokenIndex)) {
        case (?precomputed) {
          {
            speed = precomputed.speed;
            powerCore = precomputed.powerCore;
            acceleration = precomputed.acceleration;
            stability = precomputed.stability;
          };
        };
        case (null) {
          // Fallback: simple hash-based stats (precomputed should always exist in production)
          let seed = hashNat(tokenIndex);
          let baseSeed = seed % 100;
          {
            speed = (baseSeed * 70 / 100) + 30;
            powerCore = ((seed / 100) % 100 * 70 / 100) + 30;
            acceleration = ((seed / 10000) % 100 * 70 / 100) + 30;
            stability = ((seed / 1000000) % 100 * 70 / 100) + 30;
          };
        };
      };
    };

    /// Get current stats (base + bonuses)
    public func getCurrentStats(botStats : PokedBotRacingStats) : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    } {
      let base = getBaseStats(botStats.tokenIndex);

      // Apply battery penalty to speed and acceleration (energy-dependent stats)
      // 100% battery = no penalty, 50% battery = -15% stats, 0% battery = -30% stats
      let batteryPenalty = if (botStats.battery >= 80) {
        1.0;
      } else if (botStats.battery >= 50) {
        // Linear scale from 1.0 to 0.85 between 80-50 battery
        1.0 - ((80.0 - Float.fromInt(botStats.battery)) / 30.0) * 0.15;
      } else {
        // Linear scale from 0.85 to 0.70 between 50-0 battery
        0.85 - (Float.fromInt(50 - botStats.battery) / 50.0) * 0.15;
      };

      // Apply condition penalty to powerCore and stability (mechanical wear stats)
      // 100% condition = no penalty, 70% condition = -10% stats, 25% condition = -30% stats
      let conditionPenalty = if (botStats.condition >= 90) {
        1.0;
      } else if (botStats.condition >= 70) {
        // Linear scale from 1.0 to 0.90 between 90-70 condition
        1.0 - ((90.0 - Float.fromInt(botStats.condition)) / 20.0) * 0.10;
      } else if (botStats.condition >= 25) {
        // Linear scale from 0.90 to 0.70 between 70-25 condition
        0.90 - ((70.0 - Float.fromInt(botStats.condition)) / 45.0) * 0.20;
      } else {
        // Critical condition: 25% or below = 30% penalty
        0.70;
      };

      // Apply penalties to appropriate stats
      let speedWithPenalty = Float.toInt(Float.fromInt(base.speed + botStats.speedBonus) * batteryPenalty);
      let accelerationWithPenalty = Float.toInt(Float.fromInt(base.acceleration + botStats.accelerationBonus) * batteryPenalty);
      let powerCoreWithPenalty = Float.toInt(Float.fromInt(base.powerCore + botStats.powerCoreBonus) * conditionPenalty);
      let stabilityWithPenalty = Float.toInt(Float.fromInt(base.stability + botStats.stabilityBonus) * conditionPenalty);

      {
        speed = Nat.min(100, Int.abs(speedWithPenalty));
        powerCore = Nat.min(100, Int.abs(powerCoreWithPenalty));
        acceleration = Nat.min(100, Int.abs(accelerationWithPenalty));
        stability = Nat.min(100, Int.abs(stabilityWithPenalty));
      };
    };

    /// Calculate overall rating
    public func calculateOverallRating(botStats : PokedBotRacingStats) : Nat {
      let current = getCurrentStats(botStats);
      (current.speed + current.powerCore + current.acceleration + current.stability) / 4;
    };

    /// Get bot status
    public func getBotStatus(botStats : PokedBotRacingStats) : Text {
      if (botStats.condition < 25) { "Critical Malfunction" } else if (botStats.condition < 50) {
        "Needs Repair";
      } else if (botStats.battery < 30) { "Low Battery" } else if (botStats.condition >= 70 and botStats.battery >= 50) {
        "Ready";
      } else { "Maintenance Required" };
    };

    // ===== UPGRADE SYSTEM =====

    /// Start upgrade session
    public func startUpgrade(tokenIndex : Nat, upgradeType : UpgradeType, startedAt : Int, endsAt : Int) {
      let session : UpgradeSession = {
        tokenIndex = tokenIndex;
        upgradeType = upgradeType;
        startedAt = startedAt;
        endsAt = endsAt;
      };
      Map.set(activeUpgrades, nhash, tokenIndex, session);
    };

    /// Get active upgrade
    public func getActiveUpgrade(tokenIndex : Nat) : ?UpgradeSession {
      Map.get(activeUpgrades, nhash, tokenIndex);
    };

    /// Clear upgrade
    public func clearUpgrade(tokenIndex : Nat) {
      Map.delete(activeUpgrades, nhash, tokenIndex);
    };

    /// Apply faction modifier to upgrade gains
    public func applyFactionModifier(faction : FactionType, baseGain : Nat, seed : Nat32) : Nat {
      let roll = seed % 100;

      switch (faction) {
        // Ultra-rare factions: 10% chance (already powerful)
        case (#UltimateMaster or #Golden or #Ultimate) {
          if (roll < 10) { baseGain * 2 } else { baseGain };
        };
        case (#Wild) {
          // High variance: -2 to +2
          let varianceRoll = Nat32.toNat(seed % 5);
          let variance : Int = varianceRoll - 2;
          let modified = Int.abs(variance + baseGain);
          Nat.max(1, modified);
        };
        // Super-rare factions: 20% chance
        case (#Blackhole or #Dead or #Master) {
          if (roll < 20) { baseGain * 2 } else { baseGain };
        };
        // Rare factions: 35% chance (catch-up mechanic)
        case (#Bee or #Food or #Box or #Murder) {
          if (roll < 35) { baseGain * 2 } else { baseGain };
        };
        // Common factions: 25% chance
        case (_) {
          if (roll < 25) { baseGain * 2 } else { baseGain };
        };
      };
    };

    // ===== DECAY SYSTEM =====

    /// Apply hourly decay
    public func applyDecay(tokenIndex : Nat, now : Int) : ?PokedBotRacingStats {
      switch (getStats(tokenIndex)) {
        case (?botStats) {
          if (Option.isSome(botStats.upgradeEndsAt)) {
            return ?botStats;
          };

          let decayMultiplier : Float = switch (botStats.faction) {
            // Ultra-rare: slower decay
            case (#UltimateMaster) { 0.6 };
            case (#Golden) { 0.7 };
            case (#Ultimate) { 0.75 };
            case (#Wild) { 1.3 }; // Wild bots decay faster
            // Super-rare: moderate decay reduction
            case (#Blackhole or #Dead or #Master) { 0.85 };
            // Rare: slight decay reduction
            case (#Bee or #Food or #Box or #Murder) { 0.95 };
            // Common: standard decay
            case (_) { 1.0 };
          };

          // Calculate hours elapsed since last decay
          let hoursSinceLastDecay = Int.abs((now - botStats.lastDecayed) / 3_600_000_000_000);

          // Apply cumulative decay: 0.21 per hour for condition, 0.15 per hour for battery
          let totalConditionDecay = Float.toInt(Float.fromInt(hoursSinceLastDecay) * 0.21 * decayMultiplier);
          let totalBatteryDecay = Float.toInt(Float.fromInt(hoursSinceLastDecay) * 0.15 * decayMultiplier);

          let conditionLoss = Nat.min(botStats.condition, Int.abs(totalConditionDecay));
          let batteryLoss = Nat.min(botStats.battery, Int.abs(totalBatteryDecay));

          let extraConditionLoss = switch (botStats.lastRecharged) {
            case (?lastTime) {
              let hoursSinceRecharge = (now - lastTime) / 3_600_000_000_000;
              if (hoursSinceRecharge > 48) { 1 } else { 0 };
            };
            case (null) {
              let hoursSinceActivation = (now - botStats.activatedAt) / 3_600_000_000_000;
              if (hoursSinceActivation > 48) { 1 } else { 0 };
            };
          };

          let totalConditionLoss = Nat.min(botStats.condition, conditionLoss + extraConditionLoss);

          let updatedStats = {
            botStats with
            condition = Nat.sub(botStats.condition, totalConditionLoss);
            battery = Nat.sub(botStats.battery, batteryLoss);
            lastDecayed = now;
          };

          updateStats(tokenIndex, updatedStats);
          ?updatedStats;
        };
        case (null) { null };
      };
    };

    /// Apply decay to all bots
    public func applyDecayToAll(now : Int) : Nat {
      let allBots = Map.entries(stats);
      var decayedCount : Nat = 0;

      for ((tokenIndex, _) in allBots) {
        switch (applyDecay(tokenIndex, now)) {
          case (?_) { decayedCount += 1 };
          case (null) {};
        };
      };

      decayedCount;
    };

    // ===== HELPER FUNCTIONS =====
    // Note: Stats are loaded from precomputed data via statsProvider.getPrecomputedStats()
    // These fallback functions are only used if precomputed data is missing (should never happen in production)

    private func derivePreferredDistance(powerCore : Nat, speed : Nat) : Distance {
      if (powerCore > 55 and speed < 50) { #LongTrek } else if (speed > 55 and powerCore < 50) {
        #ShortSprint;
      } else { #MediumHaul };
    };

    private func derivePreferredTerrain(metadata : [(Text, Text)]) : Terrain {
      let background = Array.find<(Text, Text)>(
        metadata,
        func(trait) { Text.toLowercase(trait.0) == "background" },
      );

      switch (background) {
        case (?(_, value)) {
          let bg = Text.toLowercase(value);
          if (
            Text.contains(bg, #text "brown") or Text.contains(bg, #text "red") or
            Text.contains(bg, #text "yellow") or Text.contains(bg, #text "bones")
          ) {
            #WastelandSand;
          } else if (
            Text.contains(bg, #text "blue") or Text.contains(bg, #text "purple") or
            Text.contains(bg, #text "grey") or Text.contains(bg, #text "gray") or
            Text.contains(bg, #text "teal")
          ) {
            #MetalRoads;
          } else {
            #ScrapHeaps;
          };
        };
        case (null) {
          let hash = hashNat(0);
          let choice = hash % 3;
          if (choice == 0) { #ScrapHeaps } else if (choice == 1) { #MetalRoads } else {
            #WastelandSand;
          };
        };
      };
    };

    // ===== INVENTORY SYSTEM =====

    /// Get user inventory (or create default if missing)
    public func getUserInventory(user : Principal) : UserInventory {
      switch (Map.get(userInventories, phash, user)) {
        case (?inv) { inv };
        case (null) {
          let newInv : UserInventory = {
            owner = user;
            speedChips = 0;
            powerCoreFragments = 0;
            thrusterKits = 0;
            gyroModules = 0;
            universalParts = 0;
          };
          ignore Map.put(userInventories, phash, user, newInv);
          newInv;
        };
      };
    };

    /// Add parts to user inventory
    public func addParts(user : Principal, partType : PartType, amount : Nat) {
      let inv = getUserInventory(user);
      let updatedInv = switch (partType) {
        case (#SpeedChip) { { inv with speedChips = inv.speedChips + amount } };
        case (#PowerCoreFragment) {
          { inv with powerCoreFragments = inv.powerCoreFragments + amount };
        };
        case (#ThrusterKit) {
          { inv with thrusterKits = inv.thrusterKits + amount };
        };
        case (#GyroModule) {
          { inv with gyroModules = inv.gyroModules + amount };
        };
        case (#UniversalPart) {
          { inv with universalParts = inv.universalParts + amount };
        };
      };
      ignore Map.put(userInventories, phash, user, updatedInv);
    };

    /// Remove parts from user inventory (returns false if insufficient)
    public func removeParts(user : Principal, partType : PartType, amount : Nat) : Bool {
      let inv = getUserInventory(user);
      let currentAmount = switch (partType) {
        case (#SpeedChip) { inv.speedChips };
        case (#PowerCoreFragment) { inv.powerCoreFragments };
        case (#ThrusterKit) { inv.thrusterKits };
        case (#GyroModule) { inv.gyroModules };
        case (#UniversalPart) { inv.universalParts };
      };

      if (currentAmount >= amount) {
        let updatedInv = switch (partType) {
          case (#SpeedChip) {
            { inv with speedChips = inv.speedChips - amount };
          };
          case (#PowerCoreFragment) {
            { inv with powerCoreFragments = inv.powerCoreFragments - amount };
          };
          case (#ThrusterKit) {
            { inv with thrusterKits = inv.thrusterKits - amount };
          };
          case (#GyroModule) {
            { inv with gyroModules = inv.gyroModules - amount };
          };
          case (#UniversalPart) {
            { inv with universalParts = inv.universalParts - amount };
          };
        };
        ignore Map.put(userInventories, phash, user, updatedInv);
        true;
      } else {
        false;
      };
    };

    /// Calculate upgrade cost based on current upgrade count
    /// Progressive cost: 3 -> 5 -> 8 -> 12 -> 18 -> 25
    public func calculateUpgradeCost(currentUpgradeCount : Nat) : Nat {
      if (currentUpgradeCount == 0) { 3 } else if (currentUpgradeCount == 1) {
        5;
      } else if (currentUpgradeCount == 2) { 8 } else if (currentUpgradeCount == 3) {
        12;
      } else if (currentUpgradeCount == 4) { 18 } else { 25 };
    };

    // ===== STABLE STORAGE =====

    public func getStatsMap() : Map.Map<Nat, PokedBotRacingStats> {
      stats;
    };

    public func getActiveUpgradesMap() : Map.Map<Nat, UpgradeSession> {
      activeUpgrades;
    };

    public func getUserInventoriesMap() : Map.Map<Principal, UserInventory> {
      userInventories;
    };

    /// Get upgrade count for a specific stat
    public func getUpgradeCount(tokenIndex : Nat, upgradeType : UpgradeType) : Nat {
      switch (getStats(tokenIndex)) {
        case (?stats) {
          switch (upgradeType) {
            case (#Velocity) { stats.speedUpgrades };
            case (#PowerCore) { stats.powerCoreUpgrades };
            case (#Thruster) { stats.accelerationUpgrades };
            case (#Gyro) { stats.stabilityUpgrades };
          };
        };
        case (null) { 0 };
      };
    };
  };
};
