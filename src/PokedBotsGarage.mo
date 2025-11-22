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
import Map "mo:map/Map";
import { nhash; phash } "mo:map/Map";
import RacingSimulator "./RacingSimulator";

/// PokedBotsGarage - Collection-Specific Racing Logic
/// Handles PokedBots NFT stats, factions, upgrades, and marketplace integration
module {
  // ===== POKEDBOTS-SPECIFIC TYPES =====

  public type FactionType = {
    #BattleBot;
    #EntertainmentBot;
    #WildBot;
    #GodClass;
    #Master;
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
    calibration : Nat;
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

    // Timestamps
    activatedAt : Int;
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

    /// Get racing stats for the generic racing simulator
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

    /// Apply race costs (battery drain)
    public func applyRaceCosts(nftId : Text) {
      let tokenIndex = Nat.fromText(nftId);
      switch (tokenIndex) {
        case (?idx) {
          switch (Map.get(stats, nhash, idx)) {
            case (?botStats) {
              let updatedStats = {
                botStats with
                battery = Nat.sub(botStats.battery, 10);
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
              // Fallback: simple distribution based on tokenIndex
              let mod = tokenIndex % 100;
              if (mod < 5) { #GodClass } else if (mod < 15) { #Master } else if (mod < 35) {
                #WildBot;
              } else if (mod < 60) { #EntertainmentBot } else { #BattleBot };
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
        calibration = 50;
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
        activatedAt = now;
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
      {
        speed = Nat.min(100, base.speed + botStats.speedBonus);
        powerCore = Nat.min(100, base.powerCore + botStats.powerCoreBonus);
        acceleration = Nat.min(100, base.acceleration + botStats.accelerationBonus);
        stability = Nat.min(100, base.stability + botStats.stabilityBonus);
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
      switch (faction) {
        case (#GodClass) {
          let roll = seed % 100;
          if (roll < 20) { baseGain * 2 } else { baseGain };
        };
        case (#WildBot) {
          let roll = Nat32.toNat(seed % 5);
          let variance : Int = roll - 2;
          let modified = Int.abs(variance + baseGain);
          Nat.max(1, modified);
        };
        case (_) { baseGain };
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
            case (#WildBot) { 1.2 };
            case (#GodClass) { 0.7 };
            case (_) { 1.0 };
          };

          let conditionLoss = Nat.min(botStats.condition, Int.abs(Float.toInt(0.21 * decayMultiplier)));
          let calibrationLoss = Nat.min(botStats.calibration, Int.abs(Float.toInt(0.125 * decayMultiplier)));

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
            calibration = Nat.sub(botStats.calibration, calibrationLoss);
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
