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
import Result "mo:base/Result";
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
    name : ?Text; // Optional custom name for the bot

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
    overcharge : Nat; // Overcharge (0-75%), earned by recharging at low battery, consumed in next race for stat boost

    // Preferences
    preferredDistance : Distance;
    preferredTerrain : Terrain;

    // Career stats
    racesEntered : Nat;
    wins : Nat;
    places : Nat;
    shows : Nat;
    totalScrapEarned : Nat; // Total ICP earnings from races (legacy naming)
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

    // Scavenging stats
    scavengingMissions : Nat; // Total missions completed
    totalPartsScavenged : Nat; // Lifetime parts found
    scavengingReputation : Nat; // Separate progression from racing
    bestHaul : Nat; // Biggest single mission haul
    activeMission : ?ScavengingMission; // Current mission if any
    worldBuff : ?WorldBuff; // Active world buff if any
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

  // Scavenging System Types
  public type ScavengingMissionType = {
    #ShortExpedition; // 1 hour
    #DeepSalvage; // 12 hours
    #WastelandExpedition; // 24 hours
  };

  public type ScavengingZone = {
    #ScrapHeaps; // 1.0x multipliers (safe)
    #AbandonedSettlements; // 1.2x battery, 1.3x condition, 1.4x parts
    #DeadMachineFields; // 1.5x battery, 1.8x condition, 2.0x parts
  };

  public type ScavengingMission = {
    missionId : Nat;
    tokenIndex : Nat;
    missionType : ScavengingMissionType;
    zone : ScavengingZone;
    startTime : Int;
    endTime : Int;
  };

  public type WorldBuff = {
    stats : [(Text, Nat)]; // e.g., [("speed", 3), ("acceleration", 2)]
    appliedAt : Int; // When buff was earned
    expiresAt : Int; // 48 hours from appliedAt
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

    // Mission ID counter for scavenging
    private var nextMissionId : Nat = 0;

    public func getNextMissionId() : Nat {
      let id = nextMissionId;
      nextMissionId += 1;
      id;
    };

    // ===== RACING STATS PROVIDER IMPLEMENTATION =====

    /// Apply faction terrain bonuses for racing
    private func applyTerrainBonus(stats : { speed : Nat; powerCore : Nat; acceleration : Nat; stability : Nat }, faction : FactionType, terrain : Terrain, condition : Nat) : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    } {
      var speed = stats.speed;
      var powerCore = stats.powerCore;
      var acceleration = stats.acceleration;
      var stability = stats.stability;

      // Apply faction bonuses
      switch (faction) {
        // Ultra-Rare Factions
        case (#UltimateMaster) {
          speed := Int.abs(Float.toInt(Float.fromInt(speed) * 1.15));
          powerCore := Int.abs(Float.toInt(Float.fromInt(powerCore) * 1.15));
          acceleration := Int.abs(Float.toInt(Float.fromInt(acceleration) * 1.15));
          stability := Int.abs(Float.toInt(Float.fromInt(stability) * 1.15));
        };
        case (#Wild) {
          acceleration := Int.abs(Float.toInt(Float.fromInt(acceleration) * 1.20));
          stability := Int.abs(Float.toInt(Float.fromInt(stability) * 0.90));
        };
        case (#Golden) {
          if (condition >= 90) {
            speed := Int.abs(Float.toInt(Float.fromInt(speed) * 1.15));
            powerCore := Int.abs(Float.toInt(Float.fromInt(powerCore) * 1.15));
            acceleration := Int.abs(Float.toInt(Float.fromInt(acceleration) * 1.15));
            stability := Int.abs(Float.toInt(Float.fromInt(stability) * 1.15));
          };
        };
        case (#Ultimate) {
          speed := Int.abs(Float.toInt(Float.fromInt(speed) * 1.12));
          acceleration := Int.abs(Float.toInt(Float.fromInt(acceleration) * 1.12));
        };

        // Super-Rare Factions
        case (#Blackhole) {
          if (terrain == #MetalRoads) {
            speed := Int.abs(Float.toInt(Float.fromInt(speed) * 1.12));
            powerCore := Int.abs(Float.toInt(Float.fromInt(powerCore) * 1.12));
            acceleration := Int.abs(Float.toInt(Float.fromInt(acceleration) * 1.12));
            stability := Int.abs(Float.toInt(Float.fromInt(stability) * 1.12));
          };
        };
        case (#Dead) {
          powerCore := Int.abs(Float.toInt(Float.fromInt(powerCore) * 1.10));
          stability := Int.abs(Float.toInt(Float.fromInt(stability) * 1.08));
        };
        case (#Master) {
          speed := Int.abs(Float.toInt(Float.fromInt(speed) * 1.12));
          powerCore := Int.abs(Float.toInt(Float.fromInt(powerCore) * 1.08));
        };

        // Rare Factions
        case (#Bee) {
          acceleration := Int.abs(Float.toInt(Float.fromInt(acceleration) * 1.10));
        };
        case (#Box) {
          if (terrain == #ScrapHeaps) {
            speed := Int.abs(Float.toInt(Float.fromInt(speed) * 1.10));
            powerCore := Int.abs(Float.toInt(Float.fromInt(powerCore) * 1.10));
            acceleration := Int.abs(Float.toInt(Float.fromInt(acceleration) * 1.10));
            stability := Int.abs(Float.toInt(Float.fromInt(stability) * 1.10));
          };
        };
        case (#Murder) {
          speed := Int.abs(Float.toInt(Float.fromInt(speed) * 1.08));
          acceleration := Int.abs(Float.toInt(Float.fromInt(acceleration) * 1.08));
        };

        // Common Factions
        case (#Game) {
          if (terrain == #WastelandSand) {
            speed := Int.abs(Float.toInt(Float.fromInt(speed) * 1.08));
            powerCore := Int.abs(Float.toInt(Float.fromInt(powerCore) * 1.08));
            acceleration := Int.abs(Float.toInt(Float.fromInt(acceleration) * 1.08));
            stability := Int.abs(Float.toInt(Float.fromInt(stability) * 1.08));
          };
        };
        case (#Animal) {
          speed := Int.abs(Float.toInt(Float.fromInt(speed) * 1.06));
          powerCore := Int.abs(Float.toInt(Float.fromInt(powerCore) * 1.06));
          acceleration := Int.abs(Float.toInt(Float.fromInt(acceleration) * 1.06));
          stability := Int.abs(Float.toInt(Float.fromInt(stability) * 1.06));
        };
        case (#Industrial) {
          powerCore := Int.abs(Float.toInt(Float.fromInt(powerCore) * 1.05));
          stability := Int.abs(Float.toInt(Float.fromInt(stability) * 1.05));
        };

        // Food faction has no racing bonuses (condition recovery only)
        case (#Food) {};
      };

      {
        speed = Nat.min(100, speed);
        powerCore = Nat.min(100, powerCore);
        acceleration = Nat.min(100, acceleration);
        stability = Nat.min(100, stability);
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
              // Note: Bot might have been pulled from scavenging when entering race
              // No special handling needed here - proceed with normal stat calculation

              let current = getCurrentStats(botStats);
              let boosted = applyTerrainBonus(current, botStats.faction, terrain, botStats.condition);

              // Apply preferred terrain bonus (+10% if racing on preferred terrain)
              let finalStats = if (botStats.preferredTerrain == terrain) {
                {
                  speed = Nat.max(1, Int.abs(Float.toInt(Float.fromInt(boosted.speed) * 1.10)));
                  powerCore = Nat.max(1, Int.abs(Float.toInt(Float.fromInt(boosted.powerCore) * 1.10)));
                  acceleration = Nat.max(1, Int.abs(Float.toInt(Float.fromInt(boosted.acceleration) * 1.10)));
                  stability = Nat.max(1, Int.abs(Float.toInt(Float.fromInt(boosted.stability) * 1.10)));
                };
              } else {
                boosted;
              };

              ?{
                speed = finalStats.speed;
                powerCore = finalStats.powerCore;
                acceleration = finalStats.acceleration;
                stability = finalStats.stability;
              };
            };
            case (null) { null };
          };
        };
        case (null) { null };
      };
    };

    /// Get racing stats at 100% battery/condition with terrain bonuses (for simulator)
    /// This matches what the frontend sees via get_bot_profile
    public func getStatsAt100WithTerrain(nftId : Text, terrain : Terrain) : ?RacingSimulator.RacingStats {
      let tokenIndex = Nat.fromText(nftId);
      switch (tokenIndex) {
        case (?idx) {
          switch (Map.get(stats, nhash, idx)) {
            case (?botStats) {
              // Get base stats + bonuses (no battery/condition penalties)
              let baseStats = getBaseStats(idx);
              let statsAt100 = {
                speed = baseStats.speed + botStats.speedBonus;
                powerCore = baseStats.powerCore + botStats.powerCoreBonus;
                acceleration = baseStats.acceleration + botStats.accelerationBonus;
                stability = baseStats.stability + botStats.stabilityBonus;
              };

              // Apply faction terrain bonuses (condition=100 for Golden faction bonus)
              let boosted = applyTerrainBonus(statsAt100, botStats.faction, terrain, 100);

              // Apply preferred terrain bonus (+10% if racing on preferred terrain)
              let finalStats = if (botStats.preferredTerrain == terrain) {
                {
                  speed = Nat.max(1, Int.abs(Float.toInt(Float.fromInt(boosted.speed) * 1.10)));
                  powerCore = Nat.max(1, Int.abs(Float.toInt(Float.fromInt(boosted.powerCore) * 1.10)));
                  acceleration = Nat.max(1, Int.abs(Float.toInt(Float.fromInt(boosted.acceleration) * 1.10)));
                  stability = Nat.max(1, Int.abs(Float.toInt(Float.fromInt(boosted.stability) * 1.10)));
                };
              } else {
                boosted;
              };

              ?{
                speed = finalStats.speed;
                powerCore = finalStats.powerCore;
                acceleration = finalStats.acceleration;
                stability = finalStats.stability;
              };
            };
            case (null) { null };
          };
        };
        case (null) { null };
      };
    };

    /// Check if bot can race (always true if initialized)
    public func canRace(nftId : Text) : Bool {
      let tokenIndex = Nat.fromText(nftId);
      switch (tokenIndex) {
        case (?idx) {
          switch (Map.get(stats, nhash, idx)) {
            case (?botStats) { true };
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
                totalScrapEarned = botStats.totalScrapEarned + prize; // Tracks total ICP earnings
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
    // Combined function to update both ELO and race stats in a single operation
    // This prevents the race condition where sequential updates overwrite each other
    public func applyRaceEloChanges(results : [(Text, Nat)]) : [(Nat, Int)] {
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

      // Return the ELO changes for logging/debugging
      eloChanges;
    };

    // Update race stats (wins/places/shows/earnings) while preserving ELO
    // This version reads CURRENT stats (including ELO update) and only modifies race stats
    public func recordRaceResultWithElo(
      nftId : Text,
      position : Nat,
      fieldSize : Nat,
      earnings : Nat,
    ) {
      switch (Nat.fromText(nftId)) {
        case (?tokenIndex) {
          // Get CURRENT stats (which includes ELO update from applyRaceEloChanges)
          switch (Map.get(stats, nhash, tokenIndex)) {
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
                totalScrapEarned = botStats.totalScrapEarned + earnings;
                experience = botStats.experience + (if (position <= 3) { 10 } else { 5 });
                factionReputation = botStats.factionReputation + (if (position == 1) { 5 } else if (position <= 3) { 2 } else { 1 });
                lastRaced = ?Time.now();
              };
              updateStats(tokenIndex, updatedStats);
            };
            case (null) {};
          };
        };
        case (null) {};
      };
    };

    /// Apply race costs (battery drain and condition wear)
    /// Costs scale with distance, terrain difficulty, and finishing position
    /// Battery drain is inversely proportional to power core level (higher power core = more efficient = less drain)
    public func applyRaceCosts(nftId : Text, distance : Nat, terrain : RacingSimulator.Terrain, position : Nat) {
      let tokenIndex = Nat.fromText(nftId);
      switch (tokenIndex) {
        case (?idx) {
          switch (Map.get(stats, nhash, idx)) {
            case (?botStats) {
              // Get current power core stat (base + bonuses)
              let currentStats = getCurrentStats(botStats);
              let powerCore = currentStats.powerCore;

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

              // Power Core efficiency: Higher power core reduces battery drain (logarithmic curve)
              // Uses log curve so benefits diminish at higher levels
              // At powerCore 1 (min): ~100% drain (1.0x multiplier)
              // At powerCore 20 (avg beginner): ~70% drain (0.70x multiplier)
              // At powerCore 40 (solid): ~52% drain (0.52x multiplier)
              // At powerCore 80 (god mode): ~35% drain (0.35x multiplier)
              // At powerCore 100 (max): ~30% drain (0.30x multiplier) - 3.3x more races per battery
              // Formula: multiplier = 1.0 - (0.70 * log(powerCore) / log(100))
              let normalizedPowerCore = Float.max(1.0, Float.fromInt(powerCore));
              let logEffect = Float.min(0.70, 0.70 * (Float.log(normalizedPowerCore) / Float.log(100.0)));
              let efficiencyMultiplier = 1.0 - logEffect;

              // Condition penalty: Poor condition reduces power core efficiency
              // At 100 condition: no penalty (1.0x)
              // At 50 condition: +25% drain (1.25x)
              // At 0 condition: +50% drain (1.5x)
              // Formula: penalty = 1.0 + ((100 - condition) / 200)
              let conditionPenalty = 1.0 + (Float.fromInt(100 - botStats.condition) / 200.0);

              let totalBatteryDrain = Float.toInt(Float.fromInt(baseBatteryDrain) * terrainBatteryMod * efficiencyMultiplier * conditionPenalty);
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

              // CONSUME overcharge and world buff after race
              let updatedStats = {
                botStats with
                battery = Nat.sub(botStats.battery, finalBatteryDrain);
                condition = Nat.sub(botStats.condition, finalConditionWear);
                overcharge = 0; // Overcharge consumed after race
                worldBuff = null; // World buff consumed after race
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
      customName : ?Text,
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

      // Calculate overall rating from base stats: (speed + powerCore + acceleration + stability) / 4
      let totalStats = baseStats.speed + baseStats.powerCore + baseStats.acceleration + baseStats.stability;
      let averageRating = totalStats / 4;

      // Map rating to starting ELO:
      // 60+ rating = SilentKlan tier (1800 ELO)
      // 40-59 rating = Elite tier (1600 ELO)
      // 20-39 rating = Raider tier (1400 ELO)
      // <20 rating = Junker tier (1200 ELO)
      let startingElo = if (averageRating >= 60) {
        1800; // SilentKlan tier
      } else if (averageRating >= 40) {
        1600; // Elite tier
      } else if (averageRating >= 20) {
        1400; // Raider tier
      } else {
        1200; // Junker tier
      };

      let now = Time.now();

      let racingStats : PokedBotRacingStats = {
        tokenIndex = tokenIndex;
        ownerPrincipal = owner;
        faction = faction;
        name = customName;
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
        overcharge = 0;
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
        eloRating = startingElo; // Start based on bot quality (1200-1800)
        activatedAt = now;
        lastDecayed = now; // Initialize decay tracking
        lastRecharged = null;
        lastRepaired = null;
        lastDiagnostics = null;
        lastRaced = null;
        upgradeEndsAt = null;
        listedForSale = false;

        // Scavenging stats (initialized to defaults)
        scavengingMissions = 0;
        totalPartsScavenged = 0;
        scavengingReputation = 0;
        bestHaul = 0;
        activeMission = null;
        worldBuff = null;
      };

      ignore Map.put(stats, nhash, tokenIndex, racingStats);
      racingStats;
    };

    /// Get stats for a bot (checks and expires world buffs automatically)
    public func getStats(tokenIndex : Nat) : ?PokedBotRacingStats {
      switch (Map.get(stats, nhash, tokenIndex)) {
        case (null) { null };
        case (?botStats) {
          // Check if world buff has expired
          switch (botStats.worldBuff) {
            case (?buff) {
              let now = Time.now();
              if (now >= buff.expiresAt) {
                // Buff has expired, remove it
                let updatedStats = {
                  botStats with
                  worldBuff = null;
                };
                updateStats(tokenIndex, updatedStats);
                return ?updatedStats;
              };
            };
            case (null) {};
          };
          ?botStats;
        };
      };
    };

    /// Update stats
    public func updateStats(tokenIndex : Nat, newStats : PokedBotRacingStats) {
      ignore Map.put(stats, nhash, tokenIndex, newStats);
    };

    /// Update bot name
    public func updateBotName(tokenIndex : Nat, newName : ?Text) : ?PokedBotRacingStats {
      switch (getStats(tokenIndex)) {
        case (null) { null };
        case (?botStats) {
          let updatedStats = { botStats with name = newName };
          updateStats(tokenIndex, updatedStats);
          ?updatedStats;
        };
      };
    };

    /// Update bot owner (for transfers)
    public func updateBotOwner(tokenIndex : Nat, newOwner : Principal) : ?PokedBotRacingStats {
      switch (getStats(tokenIndex)) {
        case (null) { null };
        case (?botStats) {
          let updatedStats = { botStats with ownerPrincipal = newOwner };
          updateStats(tokenIndex, updatedStats);
          ?updatedStats;
        };
      };
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
      // Battery penalties - softer at high levels, harsh when critical
      // 80-100% battery = no penalty (1.0x)
      // 50% battery = -15% stats (0.85x) - still competitive
      // 25% battery = -40% stats (0.60x) - noticeably slow
      // 10% battery = -70% stats (0.30x) - desperate
      // 0% battery = -90% stats (0.10x) - "resurrection sickness"
      let batteryPenalty = if (botStats.battery >= 80) {
        1.0;
      } else if (botStats.battery >= 50) {
        // Linear scale from 0.85 to 1.0 between 50-80 battery (light penalty)
        0.85 + ((Float.fromInt(botStats.battery) - 50.0) / 30.0) * 0.15;
      } else if (botStats.battery >= 25) {
        // Linear scale from 0.60 to 0.85 between 25-50 battery (moderate penalty)
        0.60 + ((Float.fromInt(botStats.battery) - 25.0) / 25.0) * 0.25;
      } else if (botStats.battery >= 10) {
        // Linear scale from 0.30 to 0.60 between 10-25 battery (heavy penalty)
        0.30 + ((Float.fromInt(botStats.battery) - 10.0) / 15.0) * 0.30;
      } else {
        // Critical: 0-10% battery = 0.10 to 0.30 multiplier (resurrection sickness)
        0.10 + (Float.fromInt(botStats.battery) / 10.0) * 0.20;
      };

      // Apply condition penalty to powerCore and stability (mechanical wear stats)
      // HARSH PENALTIES - Damaged bots perform poorly!
      // 100% condition = no penalty (1.0x)
      // 70% condition = -20% stats (0.80x)
      // 50% condition = -40% stats (0.60x)
      // 25% condition = -70% stats (0.30x)
      // 0% condition = -90% stats (0.10x) - critical damage
      let conditionPenalty = if (botStats.condition >= 90) {
        1.0;
      } else if (botStats.condition >= 70) {
        // Linear scale from 0.80 to 1.0 between 70-90 condition
        0.80 + ((Float.fromInt(botStats.condition) - 70.0) / 20.0) * 0.20;
      } else if (botStats.condition >= 50) {
        // Linear scale from 0.60 to 0.80 between 50-70 condition
        0.60 + ((Float.fromInt(botStats.condition) - 50.0) / 20.0) * 0.20;
      } else if (botStats.condition >= 25) {
        // Linear scale from 0.30 to 0.60 between 25-50 condition
        0.30 + ((Float.fromInt(botStats.condition) - 25.0) / 25.0) * 0.30;
      } else {
        // Critical: 0-25% condition = 0.10 to 0.30 multiplier (falling apart)
        0.10 + (Float.fromInt(botStats.condition) / 25.0) * 0.20;
      };

      // OVERCHARGE BONUSES (consumed in next race)
      // Speed: +0.3% per 1% overcharge (max +22.5% at 75% overcharge)
      // Acceleration: +0.3% per 1% overcharge (max +22.5% at 75% overcharge)
      // Stability: -0.2% per 1% overcharge (max -15% at 75% overcharge)
      // PowerCore: -0.2% per 1% overcharge (max -15% at 75% overcharge)
      let overchargeBonus = Float.fromInt(botStats.overcharge) / 100.0; // 0.0 to 0.75
      let speedOvercharge = 1.0 + (overchargeBonus * 0.3); // 1.0 to 1.225
      let accelOvercharge = 1.0 + (overchargeBonus * 0.3); // 1.0 to 1.225
      let stabilityOvercharge = 1.0 - (overchargeBonus * 0.2); // 1.0 to 0.85
      let powerCoreOvercharge = 1.0 - (overchargeBonus * 0.2); // 1.0 to 0.85

      // WORLD BUFF BONUSES (from scavenging missions, expires in 48h)
      // Apply flat stat bonuses from world buffs
      var speedBuff : Nat = 0;
      var powerCoreBuff : Nat = 0;
      var accelerationBuff : Nat = 0;
      var stabilityBuff : Nat = 0;

      switch (botStats.worldBuff) {
        case (?buff) {
          // Apply each stat buff
          for ((stat, value) in buff.stats.vals()) {
            switch (stat) {
              case ("speed") { speedBuff := value };
              case ("powerCore") { powerCoreBuff := value };
              case ("acceleration") { accelerationBuff := value };
              case ("stability") { stabilityBuff := value };
              case (_) {}; // Ignore unknown stats
            };
          };
        };
        case (null) {}; // No buff active
      };

      // Apply penalties to appropriate stats, then add world buffs
      let speedWithPenalty = Float.toInt(Float.fromInt(base.speed + botStats.speedBonus) * batteryPenalty * speedOvercharge) + speedBuff;
      let accelerationWithPenalty = Float.toInt(Float.fromInt(base.acceleration + botStats.accelerationBonus) * batteryPenalty * accelOvercharge) + accelerationBuff;
      let powerCoreWithPenalty = Float.toInt(Float.fromInt(base.powerCore + botStats.powerCoreBonus) * conditionPenalty * powerCoreOvercharge) + powerCoreBuff;
      let stabilityWithPenalty = Float.toInt(Float.fromInt(base.stability + botStats.stabilityBonus) * conditionPenalty * stabilityOvercharge) + stabilityBuff;

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

    // ===== BATTERY RECHARGE SYSTEM =====

    /// Apply hourly battery recharge
    public func applyRecharge(tokenIndex : Nat, now : Int) : ?PokedBotRacingStats {
      switch (getStats(tokenIndex)) {
        case (?botStats) {
          if (Option.isSome(botStats.upgradeEndsAt)) {
            return ?botStats;
          };

          let rechargeMultiplier : Float = switch (botStats.faction) {
            // Ultra-rare: faster recharge
            case (#UltimateMaster) { 1.4 };
            case (#Golden) { 1.3 };
            case (#Ultimate) { 1.25 };
            case (#Wild) { 0.7 }; // Wild bots recharge slower
            // Super-rare: moderate recharge boost
            case (#Blackhole or #Dead or #Master) { 1.15 };
            // Rare: slight recharge boost
            case (#Bee or #Food or #Box or #Murder) { 1.05 };
            // Common: standard recharge
            case (_) { 1.0 };
          };

          // Calculate hours elapsed since last decay
          let hoursSinceLastDecay = Int.abs((now - botStats.lastDecayed) / 3_600_000_000_000);

          // Battery recharges naturally over time: +0.3 per hour (instead of decaying)
          // This means ~33 hours to recover 10 battery (one race worth)
          // Condition stays the same (only degrades during actual racing)
          let totalBatteryRecharge = Float.toInt(Float.fromInt(hoursSinceLastDecay) * 0.3 * rechargeMultiplier);

          // Cap battery at 100
          let newBattery = Nat.min(100, botStats.battery + Int.abs(totalBatteryRecharge));

          let updatedStats = {
            botStats with
            battery = newBattery;
            lastDecayed = now;
          };

          updateStats(tokenIndex, updatedStats);
          ?updatedStats;
        };
        case (null) { null };
      };
    };

    /// Apply battery recharge to all bots
    public func applyRechargeToAll(now : Int) : Nat {
      let allBots = Map.entries(stats);
      var decayedCount : Nat = 0;

      for ((tokenIndex, _) in allBots) {
        switch (applyRecharge(tokenIndex, now)) {
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
    /// Universal Parts can substitute for any specific part type
    public func removeParts(user : Principal, partType : PartType, amount : Nat) : Bool {
      let inv = getUserInventory(user);
      let currentAmount = switch (partType) {
        case (#SpeedChip) { inv.speedChips };
        case (#PowerCoreFragment) { inv.powerCoreFragments };
        case (#ThrusterKit) { inv.thrusterKits };
        case (#GyroModule) { inv.gyroModules };
        case (#UniversalPart) { inv.universalParts };
      };

      // Try to use specific part type first
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
            { inv with gyroModules = Nat.sub(inv.gyroModules, amount) };
          };
          case (#UniversalPart) {
            { inv with universalParts = Nat.sub(inv.universalParts, amount) };
          };
        };
        ignore Map.put(userInventories, phash, user, updatedInv);
        return true;
      };

      // If specific part is insufficient, try combining with Universal Parts
      if (partType != #UniversalPart) {
        let deficit = amount - currentAmount; // How many we're short

        if (inv.universalParts >= deficit) {
          // Use all specific parts + universal parts to make up the difference
          let updatedInv = switch (partType) {
            case (#SpeedChip) {
              {
                inv with
                speedChips = 0; // Use all specific parts
                universalParts = inv.universalParts - deficit; // Fill gap with universal
              };
            };
            case (#PowerCoreFragment) {
              {
                inv with
                powerCoreFragments = 0;
                universalParts = inv.universalParts - deficit;
              };
            };
            case (#ThrusterKit) {
              {
                inv with
                thrusterKits = 0;
                universalParts = inv.universalParts - deficit;
              };
            };
            case (#GyroModule) {
              {
                inv with
                gyroModules = 0;
                universalParts = inv.universalParts - deficit;
              };
            };
            case (#UniversalPart) {
              inv; // Should never reach here
            };
          };
          ignore Map.put(userInventories, phash, user, updatedInv);
          return true;
        };
      };

      false; // Insufficient parts even with universal substitution
    };

    /// Calculate upgrade cost based on current upgrade count
    /// Original scrap progression: 100 -> 200 -> 300 -> 900 -> 2700 -> 8100 parts (at 100 parts = 1 ICP)
    /// ICP equivalent: 1.0 -> 2.0 -> 3.0 -> 9.0 -> 27.0 -> 81.0 ICP
    public func calculateUpgradeCost(currentUpgradeCount : Nat) : Nat {
      if (currentUpgradeCount == 0) { 100 } else if (currentUpgradeCount == 1) {
        200;
      } else if (currentUpgradeCount == 2) { 300 } else if (currentUpgradeCount == 3) {
        900;
      } else if (currentUpgradeCount == 4) { 2700 } else { 8100 };
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

    // ===== SCAVENGING SYSTEM =====

    /// Get mission duration in nanoseconds
    private func getMissionDuration(missionType : ScavengingMissionType) : Int {
      switch (missionType) {
        case (#ShortExpedition) { 1 * 3600 * 1_000_000_000 }; // 1 hour
        case (#DeepSalvage) { 12 * 3600 * 1_000_000_000 }; // 12 hours
        case (#WastelandExpedition) { 24 * 3600 * 1_000_000_000 }; // 24 hours
      };
    };

    /// Get base parts yield for mission type
    private func getBaseParts(missionType : ScavengingMissionType) : {
      min : Nat;
      max : Nat;
    } {
      switch (missionType) {
        case (#ShortExpedition) { { min = 15; max = 35 } };
        case (#DeepSalvage) { { min = 40; max = 80 } };
        case (#WastelandExpedition) { { min = 100; max = 200 } };
      };
    };

    /// Get base battery cost for mission type
    private func getBaseBatteryCost(missionType : ScavengingMissionType) : Nat {
      switch (missionType) {
        case (#ShortExpedition) { 10 };
        case (#DeepSalvage) { 20 };
        case (#WastelandExpedition) { 40 };
      };
    };

    /// Get zone multipliers
    private func getZoneMultipliers(zone : ScavengingZone) : {
      battery : Float;
      condition : Float;
      parts : Float;
    } {
      switch (zone) {
        case (#ScrapHeaps) { { battery = 1.0; condition = 1.0; parts = 1.0 } };
        case (#AbandonedSettlements) {
          { battery = 1.1; condition = 1.15; parts = 1.4 };
        };
        case (#DeadMachineFields) {
          { battery = 1.2; condition = 1.3; parts = 2.0 };
        };
      };
    };

    /// Get faction bonuses for scavenging (from SCAVENGING_FACTION_BONUSES.md)
    private func getFactionScavengingBonus(faction : FactionType, zone : ScavengingZone) : {
      partsMultiplier : Float;
      batteryMultiplier : Float;
      conditionMultiplier : Float;
    } {
      switch (faction) {
        // Ultra-rare factions
        case (#UltimateMaster) {
          {
            partsMultiplier = 1.20;
            batteryMultiplier = 0.70;
            conditionMultiplier = 1.0;
          };
        };
        case (#Golden) {
          {
            partsMultiplier = 1.0;
            batteryMultiplier = 1.0;
            conditionMultiplier = 1.0;
          };
        }; // Has RNG double instead
        case (#Ultimate) {
          {
            partsMultiplier = 1.15;
            batteryMultiplier = 1.0;
            conditionMultiplier = 1.0;
          };
        }; // Has time reduction special
        case (#Wild) {
          // 1.25x in WastelandSand, but no WastelandSand scavenging zones yet, so 1.0x everywhere
          {
            partsMultiplier = 1.0;
            batteryMultiplier = 1.0;
            conditionMultiplier = 0.60;
          };
        };

        // Super-rare factions
        case (#Blackhole) {
          {
            partsMultiplier = 1.10;
            batteryMultiplier = 1.0;
            conditionMultiplier = 1.1;
          };
        }; // Penalty: +10% condition damage
        case (#Dead) {
          let partsMult = if (zone == #DeadMachineFields) { 1.40 } else { 1.10 };
          {
            partsMultiplier = partsMult;
            batteryMultiplier = 1.0;
            conditionMultiplier = 0.50;
          }; // -50% condition damage
        };
        case (#Master) {
          {
            partsMultiplier = 1.12;
            batteryMultiplier = 0.75;
            conditionMultiplier = 1.0;
          };
        };

        // Rare factions
        case (#Bee) {
          let partsMult = if (zone == #AbandonedSettlements) { 1.08 } else {
            1.0;
          };
          {
            partsMultiplier = partsMult;
            batteryMultiplier = 1.0;
            conditionMultiplier = 1.0;
          };
        };
        case (#Food) {
          let partsMult = if (zone == #ScrapHeaps or zone == #AbandonedSettlements) {
            1.12;
          } else { 1.0 };
          {
            partsMultiplier = partsMult;
            batteryMultiplier = 0.80;
            conditionMultiplier = 1.0;
          };
        };
        case (#Box) {
          {
            partsMultiplier = 1.05;
            batteryMultiplier = 1.0;
            conditionMultiplier = 1.0;
          };
        }; // Has RNG triple
        case (#Murder) {
          let partsMult = if (zone == #DeadMachineFields) { 1.15 } else { 1.0 };
          {
            partsMultiplier = partsMult;
            batteryMultiplier = 1.0;
            conditionMultiplier = 1.2;
          }; // +20% condition damage
        };

        // Common factions
        case (#Game) {
          {
            partsMultiplier = 1.0;
            batteryMultiplier = 1.0;
            conditionMultiplier = 1.0;
          };
        }; // Has milestone bonus
        case (#Animal) {
          // WastelandSand bonus not applicable yet, will add when zones expand
          {
            partsMultiplier = 1.0;
            batteryMultiplier = 1.0;
            conditionMultiplier = 1.0;
          };
        };
        case (#Industrial) {
          {
            partsMultiplier = 1.05;
            batteryMultiplier = 0.90;
            conditionMultiplier = 1.0;
          };
        };
      };
    };

    /// Start a scavenging mission
    public func startScavengingMission(
      tokenIndex : Nat,
      missionType : ScavengingMissionType,
      zone : ScavengingZone,
      now : Int,
    ) : Result.Result<ScavengingMission, Text> {
      switch (getStats(tokenIndex)) {
        case (null) { #err("Bot not initialized for racing") };
        case (?botStats) {
          // Check if bot is already on a mission
          switch (botStats.activeMission) {
            case (?_) { return #err("Bot is already on a scavenging mission") };
            case (null) {};
          };

          // Check battery requirement
          let baseBattery = getBaseBatteryCost(missionType);
          if (botStats.battery < baseBattery) {
            return #err("Insufficient battery. Need " # Nat.toText(baseBattery) # ", have " # Nat.toText(botStats.battery));
          };

          // Create mission
          let missionId = getNextMissionId();
          let duration = getMissionDuration(missionType);
          let endTime = now + duration;

          let mission : ScavengingMission = {
            missionId = missionId;
            tokenIndex = tokenIndex;
            missionType = missionType;
            zone = zone;
            startTime = now;
            endTime = endTime;
          };

          // Update bot stats with active mission
          let updatedStats = {
            botStats with
            activeMission = ?mission;
          };
          updateStats(tokenIndex, updatedStats);

          #ok(mission);
        };
      };
    };

    /// Pull bot from active scavenging mission (used when entering races)
    /// Returns penalties applied: reduced parts yield and condition damage
    public func pullFromScavenging(
      tokenIndex : Nat,
      now : Int,
      rng : Nat,
    ) : Result.Result<{ penalties : Text }, Text> {
      switch (getStats(tokenIndex)) {
        case (null) { #err("Bot not found") };
        case (?botStats) {
          switch (botStats.activeMission) {
            case (null) { #err("Bot is not on a scavenging mission") };
            case (?mission) {
              // Calculate progress percentage (0-100)
              let totalDuration = mission.endTime - mission.startTime;
              let elapsed = now - mission.startTime;
              let progress = if (totalDuration > 0) {
                Int.abs(Float.toInt((Float.fromInt(elapsed) / Float.fromInt(totalDuration)) * 100.0));
              } else { 0 };

              // Calculate partial rewards based on progress
              let basePartsData = getBaseParts(mission.missionType);
              let avgBaseParts = (basePartsData.min + basePartsData.max) / 2;
              let zoneMultipliers = getZoneMultipliers(mission.zone);
              let factionBonus = getFactionScavengingBonus(botStats.faction, mission.zone);

              // Parts scaled by progress (50% progress = 50% parts)
              let progressMultiplier = Float.fromInt(progress) / 100.0;
              let partsFloat = Float.fromInt(avgBaseParts) * zoneMultipliers.parts * factionBonus.partsMultiplier * progressMultiplier;
              let partsFound = Int.abs(Float.toInt(partsFloat));

              // Early withdrawal penalty: lose 50% of potential parts (harsh penalty to prevent exploitation)
              let earlyWithdrawalPenalty = 0.50;
              let finalParts = Int.abs(Float.toInt(Float.fromInt(partsFound) * earlyWithdrawalPenalty));

              // Condition damage from rushed withdrawal
              // Base damage scales with mission type, then reduced by progress
              // This prevents exploiting long missions for short durations
              let fullMissionConditionLoss = switch (mission.missionType) {
                case (#ShortExpedition) { 10 }; // Reduced penalty for abandoning mission
                case (#DeepSalvage) { 18 }; // Reduced penalty for abandoning mission
                case (#WastelandExpedition) { 28 }; // Reduced penalty for abandoning mission
              };
              // Minimum 50% of full penalty even at 0% progress (prevents gaming system)
              let progressConditionMultiplier = 0.5 + (progressMultiplier * 0.5); // 50-100% of full penalty
              let conditionFloat = Float.fromInt(fullMissionConditionLoss) * progressConditionMultiplier * zoneMultipliers.condition * factionBonus.conditionMultiplier;
              let conditionLost = Int.abs(Float.toInt(conditionFloat));

              // Apply condition damage
              let newCondition : Nat = if (botStats.condition > conditionLost) {
                botStats.condition - conditionLost;
              } else {
                0;
              };

              // Update bot stats: clear mission, reduce condition, award partial parts
              let updatedStats = {
                botStats with
                activeMission = null;
                condition = newCondition;
                totalPartsScavenged = botStats.totalPartsScavenged + finalParts;
              };
              updateStats(tokenIndex, updatedStats);

              // Award partial parts to owner's inventory
              let owner = botStats.ownerPrincipal;
              // For early withdrawal, give all parts as UniversalParts for simplicity
              if (finalParts > 0) {
                addParts(owner, #UniversalPart, finalParts);
              };

              let penaltyText = "⚠️ Pulled from mission early! Progress: " # Nat.toText(progress) # "%. Partial parts awarded: " # Nat.toText(finalParts) # " (50% penalty). Condition damage: -" # Nat.toText(conditionLost) # "%.";

              #ok({ penalties = penaltyText });
            };
          };
        };
      };
    };

    /// Complete a scavenging mission and award parts
    public func completeScavengingMission(
      tokenIndex : Nat,
      now : Int,
      rng : Nat, // For randomness
    ) : Result.Result<{ partsFound : Nat; speedChips : Nat; powerCoreFragments : Nat; thrusterKits : Nat; gyroModules : Nat; universalParts : Nat; batteryConsumed : Nat; conditionLost : Nat; worldBuffApplied : Bool; worldBuff : ?WorldBuff; events : [Text] }, Text> {
      switch (getStats(tokenIndex)) {
        case (null) { #err("Bot not found") };
        case (?botStats) {
          // Check if bot has an active mission
          switch (botStats.activeMission) {
            case (null) { return #err("Bot is not on a scavenging mission") };
            case (?mission) {
              // Check if mission is complete
              if (now < mission.endTime) {
                let remainingNanos = mission.endTime - now;
                let remainingMinutes = remainingNanos / (60 * 1_000_000_000);
                return #err("Mission not complete yet. " # Nat.toText(Int.abs(remainingMinutes)) # " minutes remaining");
              };

              // Calculate rewards and costs
              let baseParts = getBaseParts(mission.missionType);
              let baseBattery = getBaseBatteryCost(mission.missionType);
              let zoneMultipliers = getZoneMultipliers(mission.zone);
              let factionBonus = getFactionScavengingBonus(botStats.faction, mission.zone);

              // Get current stats for scavenging bonuses
              let currentStats = getCurrentStats(botStats);

              // STAT BONUSES FOR SCAVENGING:
              // 1. Power Core reduces battery cost (energy efficiency)
              let powerCoreBonus = if (currentStats.powerCore >= 80) {
                0.80; // -20% battery cost
              } else if (currentStats.powerCore >= 50) {
                0.90; // -10% battery cost
              } else {
                1.0; // Normal cost
              };

              // 2. Condition affects variance (better maintained = more consistent)
              let conditionVariance = if (botStats.condition >= 80) {
                (90, 110); // Tight variance: 90-110% (±10%)
              } else if (botStats.condition >= 50) {
                (80, 120); // Normal variance: 80-120% (±20%)
              } else {
                (70, 130); // Wide variance: 70-130% (±30%, risky)
              };

              // 3. Stability reduces condition loss in dangerous zones
              let stabilityBonus = if (mission.zone == #DeadMachineFields and currentStats.stability >= 70) {
                0.75; // -25% condition loss in dangerous zones
              } else {
                1.0; // Normal condition loss
              };

              // RNG for parts yield (adjusted variance based on condition)
              let rngSeed = rng + tokenIndex + Int.abs(now);
              let varianceRange = conditionVariance.1 - conditionVariance.0;
              let rngVariance = Float.fromInt((rngSeed % varianceRange) + conditionVariance.0) / 100.0;

              // Calculate parts found
              let basePartsAvg = (baseParts.min + baseParts.max) / 2;
              let partsBeforeRNG = Float.fromInt(basePartsAvg) * zoneMultipliers.parts * factionBonus.partsMultiplier;
              var partsFound = Int.abs(Float.toInt(partsBeforeRNG * rngVariance));

              // Check for faction-specific RNG bonuses
              var events : [Text] = [];
              var worldBuffApplied = false;
              var worldBuff : ?WorldBuff = null;

              // Golden faction: 15% chance to double parts
              if (botStats.faction == #Golden) {
                let doubleProc = (rngSeed % 100) < 15;
                if (doubleProc) {
                  partsFound := partsFound * 2;
                  events := Array.append(events, ["Lucky streak! Parts yield doubled (Golden faction)"]);
                };
              };

              // Box faction: 5% chance to triple parts
              if (botStats.faction == #Box) {
                let tripleProc = (rngSeed % 100) < 5;
                if (tripleProc) {
                  partsFound := partsFound * 3;
                  events := Array.append(events, ["Jackpot! Found a treasure cache (Box faction)"]);
                };
              };

              // World buff chance (15%)
              let buffProc = ((rngSeed * 7) % 100) < 15;
              if (buffProc) {
                let buffStats = switch (mission.missionType) {
                  case (#ShortExpedition) { [("speed", 2 : Nat)] }; // +2 speed
                  case (#DeepSalvage) {
                    [("speed", 3 : Nat), ("acceleration", 2 : Nat)];
                  }; // +3 speed, +2 accel
                  case (#WastelandExpedition) {
                    [("speed", 4 : Nat), ("acceleration", 3 : Nat), ("powerCore", 2 : Nat)];
                  }; // +4/+3/+2
                };

                let buff : WorldBuff = {
                  stats = buffStats;
                  appliedAt = now;
                  expiresAt = now + (48 * 3600); // 48 hours
                };

                // Blackhole converts world buff to racing stats instead
                if (botStats.faction == #Blackhole) {
                  let blackholeBuff : WorldBuff = {
                    stats = [("speed", 3 : Nat), ("acceleration", 3 : Nat)];
                    appliedAt = now;
                    expiresAt = now + (48 * 3600);
                  };
                  worldBuff := ?blackholeBuff;
                  events := Array.append(events, ["Void resonance detected! Racing stats boosted (+3 Speed, +3 Accel for next race)"]);
                } else {
                  worldBuff := ?buff;
                  events := Array.append(events, ["Wasteland resonance discovered! Stat buffs applied for next race"]);
                };
                worldBuffApplied := true;
              };

              // Master faction: Every 10th mission doubles parts
              if (botStats.faction == #Master) {
                let nextMissionCount = botStats.scavengingMissions + 1;
                if (nextMissionCount % 10 == 0) {
                  partsFound := partsFound * 2;
                  events := Array.append(events, ["Mastery bonus! Parts doubled (10th mission)"]);
                };
              };

              // Game faction: Every 5th mission +10 parts
              if (botStats.faction == #Game) {
                let nextMissionCount = botStats.scavengingMissions + 1;
                if (nextMissionCount % 5 == 0) {
                  partsFound += 10;
                  events := Array.append(events, ["Achievement unlocked! +10 bonus parts (5th mission)"]);
                };
              };

              // Calculate battery consumed (with Power Core efficiency bonus)
              let batteryFloat = Float.fromInt(baseBattery) * zoneMultipliers.battery * factionBonus.batteryMultiplier * powerCoreBonus;
              let batteryRequested = Int.abs(Float.toInt(batteryFloat));

              // Calculate condition lost (with Stability bonus in dangerous zones)
              let baseConditionLoss = switch (mission.missionType) {
                case (#ShortExpedition) { 15 };
                case (#DeepSalvage) { 25 };
                case (#WastelandExpedition) { 40 };
              };
              let conditionFloat = Float.fromInt(baseConditionLoss) * zoneMultipliers.condition * factionBonus.conditionMultiplier * stabilityBonus;
              let conditionRequested = Int.abs(Float.toInt(conditionFloat));

              // Update bot stats (use saturating subtraction and track actual consumed)
              var actualBatteryConsumed = batteryRequested;
              let newBattery : Nat = if (botStats.battery > batteryRequested) {
                botStats.battery - batteryRequested;
              } else {
                actualBatteryConsumed := botStats.battery; // Only consumed what was available
                0;
              };

              var actualConditionLost = conditionRequested;
              let newCondition : Nat = if (botStats.condition > conditionRequested) {
                botStats.condition - conditionRequested;
              } else {
                actualConditionLost := botStats.condition; // Only lost what was available
                0;
              };

              // Scale rewards if battery/condition ran out (failure penalty)
              var partsScaling = 1.0;
              if (actualBatteryConsumed < batteryRequested) {
                // Ran out of battery - scale parts based on how much battery was available
                partsScaling := Float.fromInt(actualBatteryConsumed) / Float.fromInt(batteryRequested);
                events := Array.append(events, ["⚠️ Battery depleted mid-mission! Parts yield reduced to " # Nat.toText(Int.abs(Float.toInt(partsScaling * 100.0))) # "%"]);
              };

              // Apply scaling to parts
              partsFound := Int.abs(Float.toInt(Float.fromInt(partsFound) * partsScaling));

              let newBestHaul = if (partsFound > botStats.bestHaul) {
                partsFound;
              } else { botStats.bestHaul };

              let updatedStats = {
                botStats with
                battery = newBattery;
                condition = newCondition;
                scavengingMissions = botStats.scavengingMissions + 1;
                totalPartsScavenged = botStats.totalPartsScavenged + partsFound;
                scavengingReputation = botStats.scavengingReputation + 1; // +1 per mission
                bestHaul = newBestHaul;
                activeMission = null; // Clear mission
                worldBuff = worldBuff; // Apply new buff if earned
              };
              updateStats(tokenIndex, updatedStats);

              // Award parts to player's inventory
              let owner = botStats.ownerPrincipal;

              // Distribute parts dynamically based on mission type and zone
              // Calculate distribution percentages
              let partDistribution : [(PartType, Float)] = switch (mission.zone) {
                case (#ScrapHeaps) {
                  // Balanced parts, good for universal
                  [(#UniversalPart, 0.4), (#SpeedChip, 0.15), (#PowerCoreFragment, 0.15), (#ThrusterKit, 0.15), (#GyroModule, 0.15)];
                };
                case (#AbandonedSettlements) {
                  // More specialized parts, less universal
                  [(#UniversalPart, 0.25), (#SpeedChip, 0.20), (#PowerCoreFragment, 0.20), (#ThrusterKit, 0.20), (#GyroModule, 0.15)];
                };
                case (#DeadMachineFields) {
                  // Mostly specialized parts, rare universal
                  [(#UniversalPart, 0.10), (#SpeedChip, 0.25), (#PowerCoreFragment, 0.25), (#ThrusterKit, 0.20), (#GyroModule, 0.20)];
                };
              };

              // Calculate parts per type
              var speedChipsFound = 0;
              var powerCoreFragmentsFound = 0;
              var thrusterKitsFound = 0;
              var gyroModulesFound = 0;
              var universalPartsFound = 0;

              for ((partType, percentage) in partDistribution.vals()) {
                let amount = Int.abs(Float.toInt(Float.fromInt(partsFound) * percentage));
                switch (partType) {
                  case (#SpeedChip) { speedChipsFound := amount };
                  case (#PowerCoreFragment) {
                    powerCoreFragmentsFound := amount;
                  };
                  case (#ThrusterKit) { thrusterKitsFound := amount };
                  case (#GyroModule) { gyroModulesFound := amount };
                  case (#UniversalPart) { universalPartsFound := amount };
                };
              };

              // Ensure at least 1 of something if total > 0
              if (partsFound > 0 and speedChipsFound + powerCoreFragmentsFound + thrusterKitsFound + gyroModulesFound + universalPartsFound == 0) {
                universalPartsFound := partsFound; // Fallback to all universal
              };

              switch (Map.get(userInventories, phash, owner)) {
                case (null) {
                  // Create new inventory
                  let newInventory : UserInventory = {
                    owner = owner;
                    speedChips = speedChipsFound;
                    powerCoreFragments = powerCoreFragmentsFound;
                    thrusterKits = thrusterKitsFound;
                    gyroModules = gyroModulesFound;
                    universalParts = universalPartsFound;
                  };
                  ignore Map.put(userInventories, phash, owner, newInventory);
                };
                case (?inv) {
                  let updatedInv = {
                    owner = inv.owner;
                    speedChips = inv.speedChips + speedChipsFound;
                    powerCoreFragments = inv.powerCoreFragments + powerCoreFragmentsFound;
                    thrusterKits = inv.thrusterKits + thrusterKitsFound;
                    gyroModules = inv.gyroModules + gyroModulesFound;
                    universalParts = inv.universalParts + universalPartsFound;
                  };
                  ignore Map.put(userInventories, phash, owner, updatedInv);
                };
              };

              #ok({
                partsFound = partsFound;
                speedChips = speedChipsFound;
                powerCoreFragments = powerCoreFragmentsFound;
                thrusterKits = thrusterKitsFound;
                gyroModules = gyroModulesFound;
                universalParts = universalPartsFound;
                batteryConsumed = actualBatteryConsumed;
                conditionLost = actualConditionLost;
                worldBuffApplied = worldBuffApplied;
                worldBuff = worldBuff;
                events = events;
              });
            };
          };
        };
      };
    };

    /// Check and expire world buffs that are older than 48 hours
    public func checkAndExpireWorldBuff(tokenIndex : Nat, now : Int) : Bool {
      switch (getStats(tokenIndex)) {
        case (null) { false };
        case (?botStats) {
          switch (botStats.worldBuff) {
            case (null) { false };
            case (?buff) {
              if (now >= buff.expiresAt) {
                // Buff has expired, remove it
                let updatedStats = {
                  botStats with
                  worldBuff = null;
                };
                updateStats(tokenIndex, updatedStats);
                true; // Buff was expired
              } else {
                false; // Buff still valid
              };
            };
          };
        };
      };
    };

    /// Consume world buff after a race
    public func consumeWorldBuff(tokenIndex : Nat) {
      switch (getStats(tokenIndex)) {
        case (null) {};
        case (?botStats) {
          let updatedStats = {
            botStats with
            worldBuff = null;
          };
          updateStats(tokenIndex, updatedStats);
        };
      };
    };
  };
};
