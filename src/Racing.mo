import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";
import Char "mo:base/Char";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Hash "mo:base/Hash";
import Blob "mo:base/Blob";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Option "mo:base/Option";
import Map "mo:map/Map";
import { nhash } "mo:map/Map";

module {
  // ===== FACTION TYPES =====

  public type FactionType = {
    #BattleBot;
    #EntertainmentBot;
    #WildBot;
    #GodClass;
    #Master;
  };

  // ===== TERRAIN & DISTANCE TYPES =====

  public type Terrain = {
    #ScrapHeaps; // Garbage towers
    #WastelandSand; // Desert
    #MetalRoads // Ancient highways
  };

  public type Distance = {
    #ShortSprint; // < 10km
    #MediumHaul; // 10-20km
    #LongTrek // > 20km
  };

  // ===== RACE TYPES =====

  public type RaceClass = {
    #Scavenger; // 0-2 wins
    #Raider; // 3-5 wins
    #Elite; // 6-9 wins
    #SilentKlan // 10+ wins, God Class & Masters only
  };

  // ===== POKEDBOT RACING STATS =====

  public type PokedBotRacingStats = {
    tokenIndex : Nat;
    ownerPrincipal : Principal;

    // Faction
    faction : FactionType;

    // Upgrade bonuses (applied to metadata-derived base stats)
    speedBonus : Nat;
    powerCoreBonus : Nat;
    accelerationBonus : Nat;
    stabilityBonus : Nat;

    // Dynamic stats
    battery : Nat;
    condition : Nat;
    calibration : Nat;
    experience : Nat;

    // Preferences (derived from faction + stats)
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
    listedForSale : Bool; // True if currently listed on marketplace
  };

  // ===== RACE TYPES =====

  public type RaceStatus = {
    #Upcoming; // Accepting entries
    #InProgress; // Currently racing (or about to start)
    #Completed; // Finished, prizes distributed
    #Cancelled; // Not enough entries or other issue
  };

  public type RaceEntry = {
    tokenIndex : Nat;
    owner : Principal;
    entryFee : Nat;
    enteredAt : Int;
  };

  public type RaceResult = {
    tokenIndex : Nat;
    owner : Principal;
    position : Nat; // 1st, 2nd, 3rd, etc.
    finalTime : Float; // Race completion time in seconds
    prizeAmount : Nat; // ICP e8s won
  };

  public type Race = {
    raceId : Nat;
    name : Text; // Thematic wasteland name
    distance : Nat; // km
    terrain : Terrain;
    raceClass : RaceClass;
    entryFee : Nat; // ICP e8s
    maxEntries : Nat;
    startTime : Int; // Nanoseconds timestamp
    duration : Nat; // Race duration in seconds
    entryDeadline : Int; // 30 min before start
    createdAt : Int;

    entries : [RaceEntry];
    status : RaceStatus;
    results : ?[RaceResult]; // Only set after completion

    prizePool : Nat; // Total ICP collected
    silentKlanTax : Nat; // 5% taken
  };

  // ===== UPGRADE TYPES =====

  public type UpgradeType = {
    #Velocity; // Speed
    #PowerCore; // Power Core
    #Thruster; // Acceleration
    #Gyro // Stability
  };

  // ===== DECAY SESSION =====

  public type DecaySession = {
    tokenIndex : Nat;
    lastDecayAt : Int;
  };

  public type UpgradeSession = {
    tokenIndex : Nat;
    upgradeType : UpgradeType;
    startedAt : Int;
    endsAt : Int;
  };

  // ===== MAINTENANCE TYPES =====

  public type MaintenanceCooldowns = {
    lastRecharged : ?Int;
    lastRepaired : ?Int;
    lastDiagnostics : ?Int;
  };

  // ===== STAT DERIVATION FUNCTIONS =====

  // Derive stats from NFT metadata traits (actual bot properties from creator)
  public func deriveStatsFromMetadata(metadata : [(Text, Text)], faction : FactionType) : {
    speed : Nat;
    powerCore : Nat;
    acceleration : Nat;
    stability : Nat;
  } {
    // Helper to get trait value
    func getTrait(name : Text) : ?Text {
      let found = Array.find<(Text, Text)>(metadata, func(t) { Text.toLowercase(t.0) == Text.toLowercase(name) });
      switch (found) {
        case (?(_, value)) { ?value };
        case null { null };
      };
    };

    // Base stats derived from Type trait (30-50 range)
    let typeValue = switch (getTrait("type")) {
      case (?"industrial") { 45 };
      case (?"food") { 35 };
      case (?"retro") { 40 };
      case (?"sports") { 42 };
      case _ { 38 }; // default
    };

    // Body trait affects power core (30-50 range)
    let bodyHash = switch (getTrait("body")) {
      case (?body) { hashText(body) % 21 + 30 }; // 30-50
      case null { 40 };
    };

    // Arms trait affects speed (30-50 range)
    let armsHash = switch (getTrait("arms")) {
      case (?arms) { hashText(arms) % 21 + 30 }; // 30-50
      case null { 40 };
    };

    // Legs trait affects acceleration (30-50 range)
    let legsHash = switch (getTrait("legs")) {
      case (?legs) { hashText(legs) % 21 + 30 }; // 30-50
      case null { 40 };
    };

    // Driver Guy affects stability (30-50 range)
    let driverHash = switch (getTrait("driver guy")) {
      case (?driver) { hashText(driver) % 21 + 30 }; // 30-50
      case null { 40 };
    };

    // Wings give bonus to speed
    let wingsBonus = switch (getTrait("wings")) {
      case (?wings) {
        if (Text.contains(wings, #text "triangle") or Text.contains(wings, #text "rocket")) {
          5;
        } else { 0 };
      };
      case null { 0 };
    };

    // Helper to check if a numeric trait value is > 0
    func hasAttribute(name : Text) : Bool {
      switch (getTrait(name)) {
        case (?value) {
          // Parse the number - any value > 0 means the attribute is present
          switch (Nat.fromText(value)) {
            case (?n) { n > 0 };
            case null { false };
          };
        };
        case null { false };
      };
    };

    // Special attribute bonuses (Gold, Rust, Black, Pink, Blue)
    // These are stored as counts (0-6) in the metadata
    let goldBonus = if (hasAttribute("gold")) { 8 } else { 0 }; // +8 to all stats
    let rustPenalty = if (hasAttribute("rust")) { -5 } else { 0 }; // -5 to power/stability
    let blackBonus = if (hasAttribute("black")) { 6 } else { 0 }; // +6 to speed/acceleration
    let pinkBonus = if (hasAttribute("pink")) { 4 } else { 0 }; // +4 to stability
    let blueBonus = if (hasAttribute("blue")) { 5 } else { 0 }; // +5 to power core

    // Calculate base stats from traits
    let baseSpeed = Nat.min(100, armsHash + wingsBonus + goldBonus + blackBonus);
    let basePowerCore = Nat.min(100, Int.abs(bodyHash + goldBonus + blueBonus + rustPenalty));
    let baseAcceleration = Nat.min(100, legsHash + goldBonus + blackBonus);
    let baseStability = Nat.min(100, Int.abs(driverHash + goldBonus + pinkBonus + rustPenalty));

    // Apply faction bonuses
    let speed = applyFactionBonus(baseSpeed, faction, #Speed);
    let powerCore = applyFactionBonus(basePowerCore, faction, #PowerCore);
    let acceleration = applyFactionBonus(baseAcceleration, faction, #Acceleration);
    let stability = applyFactionBonus(baseStability, faction, #Stability);

    { speed; powerCore; acceleration; stability };
  };

  // Derive faction from Type metadata trait
  public func deriveFactionFromMetadata(metadata : [(Text, Text)]) : FactionType {
    // Helper to get trait value
    func getTrait(name : Text) : ?Text {
      let found = Array.find<(Text, Text)>(metadata, func(t) { Text.toLowercase(t.0) == Text.toLowercase(name) });
      switch (found) {
        case (?(_, value)) { ?value };
        case null { null };
      };
    };

    // Map Type trait to faction
    switch (getTrait("type")) {
      // Master tier (ultra rare)
      case (?"Master") { #Master };
      case (?"Ultimate-master") { #Master };
      case (?"Ultimate") { #Master };

      // GodClass tier (rare specials)
      case (?"Golden") { #GodClass };
      case (?"Blackhole") { #GodClass };

      // WildBot tier (wild/animal types)
      case (?"Wild") { #WildBot };
      case (?"Animal") { #WildBot };
      case (?"Bee") { #WildBot };
      case (?"Dead") { #WildBot };

      // EntertainmentBot tier (fun/food/game)
      case (?"Food") { #EntertainmentBot };
      case (?"Game") { #EntertainmentBot };
      case (?"Retro") { #EntertainmentBot };

      // BattleBot tier (combat/industrial - most common)
      case (?"Industrial") { #BattleBot };
      case (?"Box") { #BattleBot };
      case (?"Murder") { #BattleBot };
      case (?"Sports") { #BattleBot };

      // Default fallback
      case _ { #BattleBot };
    };
  };

  // Hash text to number
  private func hashText(text : Text) : Nat {
    var hash : Nat = 0;
    for (char in text.chars()) {
      hash := (hash * 31 + Nat32.toNat(Char.toNat32(char))) % 1000000;
    };
    hash;
  };

  // Generate deterministic stats from token index and faction
  public func deriveStatsFromTokenIndex(tokenIndex : Nat, faction : FactionType) : {
    speed : Nat;
    powerCore : Nat;
    acceleration : Nat;
    stability : Nat;
  } {
    // Create deterministic seed from token index
    let seed = hashNat(tokenIndex);

    // Base stats with ranges 30-100 (no useless robots)
    let baseSeed = seed % 100;
    let baseSpeed = (baseSeed * 70 / 100) + 30;
    let basePowerCore = ((seed / 100) % 100 * 70 / 100) + 30;
    let baseAcceleration = ((seed / 10000) % 100 * 70 / 100) + 30;
    let baseStability = ((seed / 1000000) % 100 * 70 / 100) + 30;

    // Apply faction bonuses
    let speed = applyFactionBonus(baseSpeed, faction, #Speed);
    let powerCore = applyFactionBonus(basePowerCore, faction, #PowerCore);
    let acceleration = applyFactionBonus(baseAcceleration, faction, #Acceleration);
    let stability = applyFactionBonus(baseStability, faction, #Stability);

    { speed; powerCore; acceleration; stability };
  };

  // Apply faction-specific bonuses to stats
  private func applyFactionBonus(baseStat : Nat, faction : FactionType, statType : { #Speed; #PowerCore; #Acceleration; #Stability }) : Nat {
    let bonus : Float = switch (faction, statType) {
      // Battle Bots: +15% Power Core, +10% Stability
      case (#BattleBot, #PowerCore) { 1.15 };
      case (#BattleBot, #Stability) { 1.10 };

      // Entertainment Bots: +15% Speed, +10% Acceleration
      case (#EntertainmentBot, #Speed) { 1.15 };
      case (#EntertainmentBot, #Acceleration) { 1.10 };

      // Wild Bots: +20% Acceleration, -10% Stability (erratic but fast)
      case (#WildBot, #Acceleration) { 1.20 };
      case (#WildBot, #Stability) { 0.90 };

      // God Class: +10% to all stats
      case (#GodClass, _) { 1.10 };

      // Masters: +12% Speed, +12% Stability, +8% Power Core
      case (#Master, #Speed) { 1.12 };
      case (#Master, #Stability) { 1.12 };
      case (#Master, #PowerCore) { 1.08 };

      // No bonus for others
      case (_, _) { 1.0 };
    };

    let result = Float.toInt(Float.fromInt(baseStat) * bonus);
    Nat.min(100, Int.abs(result)); // Cap at 100
  };

  // Derive preferred distance from stats
  public func derivePreferredDistance(powerCore : Nat, speed : Nat) : Distance {
    if (powerCore > 70 and speed < 60) {
      #LongTrek // High endurance, moderate speed
    } else if (speed > 70 and powerCore < 60) {
      #ShortSprint // High speed, lower endurance
    } else {
      #MediumHaul // Balanced
    };
  };

  // Derive preferred terrain from faction
  public func derivePreferredTerrain(faction : FactionType) : Terrain {
    switch (faction) {
      case (#BattleBot) { #ScrapHeaps }; // Built from junk, excel in junk
      case (#EntertainmentBot) { #MetalRoads }; // Prefer smooth surfaces for show
      case (#WildBot) { #WastelandSand }; // Chaotic, unpredictable terrain
      case (#GodClass) { #MetalRoads }; // Superior on quality surfaces
      case (#Master) { #MetalRoads }; // Precision engineering
    };
  };

  // Simple hash function for determinism
  private func hashNat(n : Nat) : Nat {
    // Simple multiplicative hash to create deterministic variation
    let a = n * 2654435761; // Large prime
    let b = a % 4294967296; // Keep it reasonable
    let c = (b * 1103515245 + 12345) % 2147483648;
    c;
  };

  // ===== RACING STATS MANAGER =====

  public class RacingStatsManager(
    initStats : Map.Map<Nat, PokedBotRacingStats>,
    initActiveUpgrades : Map.Map<Nat, UpgradeSession>,
    statsManager : { getNFTMetadata : (Nat) -> ?[(Text, Text)] },
  ) {
    // Map.Map to store racing stats by token index - stable across upgrades
    private let stats = initStats;

    // Active upgrade sessions
    private let _activeUpgrades = initActiveUpgrades;

    // Maintenance cooldowns (future use)
    private let _maintenanceCooldowns = Map.new<Nat, MaintenanceCooldowns>();

    // Get the stats map (for stable storage)
    public func getStatsMap() : Map.Map<Nat, PokedBotRacingStats> {
      stats;
    };

    // Get the active upgrades map (for stable storage)
    public func getActiveUpgradesMap() : Map.Map<Nat, UpgradeSession> {
      _activeUpgrades;
    };

    // Start an upgrade session
    public func startUpgrade(tokenIndex : Nat, upgradeType : UpgradeType, startedAt : Int, endsAt : Int) {
      let session : UpgradeSession = {
        tokenIndex = tokenIndex;
        upgradeType = upgradeType;
        startedAt = startedAt;
        endsAt = endsAt;
      };
      Map.set(_activeUpgrades, nhash, tokenIndex, session);
    };

    // Get active upgrade session
    public func getActiveUpgrade(tokenIndex : Nat) : ?UpgradeSession {
      Map.get(_activeUpgrades, nhash, tokenIndex);
    };

    // Clear completed upgrade
    public func clearUpgrade(tokenIndex : Nat) {
      Map.delete(_activeUpgrades, nhash, tokenIndex);
    };

    // Initialize racing stats for a PokedBot (first-time setup, free)
    public func initializeBot(
      tokenIndex : Nat,
      owner : Principal,
      factionOverride : ?FactionType,
    ) : PokedBotRacingStats {
      // Try to get NFT metadata first
      let metadata = statsManager.getNFTMetadata(tokenIndex);

      // Derive faction from metadata, or use override, or fall back to token index
      let faction = switch (factionOverride) {
        case (?f) { f }; // Use provided faction
        case null {
          // Derive from metadata if available
          switch (metadata) {
            case (?traits) { deriveFactionFromMetadata(traits) };
            case null {
              // Fallback: derive from token index
              let mod = tokenIndex % 100;
              if (mod < 5) { #GodClass } else if (mod < 15) { #Master } else if (mod < 35) {
                #WildBot;
              } else if (mod < 60) { #EntertainmentBot } else { #BattleBot };
            };
          };
        };
      };

      // Generate stats from metadata if available, otherwise use token index
      let baseStats = switch (metadata) {
        case null {
          // Fallback: use token index
          deriveStatsFromTokenIndex(tokenIndex, faction);
        };
        case (?traits) {
          // Use actual NFT traits
          deriveStatsFromMetadata(traits, faction);
        };
      };

      let now = Time.now();

      let racingStats : PokedBotRacingStats = {
        tokenIndex = tokenIndex;
        ownerPrincipal = owner;
        faction = faction;

        // Upgrade bonuses (start at zero)
        speedBonus = 0;
        powerCoreBonus = 0;
        accelerationBonus = 0;
        stabilityBonus = 0;

        // Dynamic stats (start at defaults)
        battery = 100;
        condition = 100;
        calibration = 50;
        experience = 0;

        // Preferences
        preferredDistance = derivePreferredDistance(baseStats.powerCore, baseStats.speed);
        preferredTerrain = derivePreferredTerrain(faction);

        // Career stats (all zero)
        racesEntered = 0;
        wins = 0;
        places = 0;
        shows = 0;
        totalScrapEarned = 0;
        factionReputation = 0;

        // Timestamps
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

    // Get racing stats for a bot
    public func getStats(tokenIndex : Nat) : ?PokedBotRacingStats {
      Map.get(stats, nhash, tokenIndex);
    };

    // Update racing stats
    public func updateStats(tokenIndex : Nat, newStats : PokedBotRacingStats) {
      ignore Map.put(stats, nhash, tokenIndex, newStats);
    };

    // Check if bot is initialized for racing
    public func isInitialized(tokenIndex : Nat) : Bool {
      Option.isSome(Map.get(stats, nhash, tokenIndex));
    };

    // Get all bots for an owner
    public func getBotsForOwner(owner : Principal) : [PokedBotRacingStats] {
      let allStats = Map.vals(stats);
      Array.filter<PokedBotRacingStats>(
        Iter.toArray(allStats),
        func(s) { Principal.equal(s.ownerPrincipal, owner) },
      );
    };

    // Get base stats from metadata (source of truth)
    public func getBaseStats(tokenIndex : Nat) : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    } {
      // Get metadata from statsManager
      let metadata = statsManager.getNFTMetadata(tokenIndex);

      switch (metadata) {
        case (?traits) {
          // Get faction (needed for stat derivation)
          let faction = deriveFactionFromMetadata(traits);
          deriveStatsFromMetadata(traits, faction);
        };
        case null {
          // Fallback to token index derivation
          let mod = tokenIndex % 100;
          let faction = if (mod < 5) { #GodClass } else if (mod < 15) {
            #Master;
          } else if (mod < 35) {
            #WildBot;
          } else if (mod < 60) { #EntertainmentBot } else { #BattleBot };

          deriveStatsFromTokenIndex(tokenIndex, faction);
        };
      };
    };

    // Get current stats (base + upgrades)
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

    // Calculate overall rating
    public func calculateOverallRating(botStats : PokedBotRacingStats) : Nat {
      let current = getCurrentStats(botStats);
      let total = current.speed + current.powerCore + current.acceleration + current.stability;
      total / 4;
    };

    // Check if bot can race
    public func canRace(botStats : PokedBotRacingStats) : Bool {
      botStats.condition >= 70 and botStats.battery >= 50
    };

    // Get bot status message
    public func getBotStatus(botStats : PokedBotRacingStats) : Text {
      if (botStats.condition < 25) {
        "Critical Malfunction";
      } else if (botStats.condition < 50) {
        "Needs Repair";
      } else if (botStats.battery < 30) {
        "Low Battery";
      } else if (botStats.condition >= 70 and botStats.battery >= 50) {
        "Ready";
      } else {
        "Maintenance Required";
      };
    };

    // Apply decay to a bot (called by decay timer)
    public func applyDecay(tokenIndex : Nat, now : Int) : ?PokedBotRacingStats {
      switch (getStats(tokenIndex)) {
        case (?stats) {
          // Skip decay if bot has an active upgrade
          if (Option.isSome(stats.upgradeEndsAt)) {
            return ?stats;
          };

          // Calculate faction-specific decay rate
          let decayMultiplier : Float = switch (stats.faction) {
            case (#WildBot) { 1.2 }; // 20% faster decay
            case (#GodClass) { 0.7 }; // 30% slower decay
            case (_) { 1.0 };
          };

          // Base decay amounts
          let conditionLoss = Nat.min(stats.condition, Int.abs(Float.toInt(5.0 * decayMultiplier)));
          let calibrationLoss = Nat.min(stats.calibration, Int.abs(Float.toInt(3.0 * decayMultiplier)));

          // Check if bot hasn't been recharged in 48 hours (extra condition penalty)
          let extraConditionLoss = switch (stats.lastRecharged) {
            case (?lastTime) {
              let hoursSinceRecharge = (now - lastTime) / 3_600_000_000_000; // Convert ns to hours
              if (hoursSinceRecharge > 48) { 5 } else { 0 };
            };
            case (null) {
              // Never recharged, apply penalty if bot is old
              let hoursSinceActivation = (now - stats.activatedAt) / 3_600_000_000_000;
              if (hoursSinceActivation > 48) { 5 } else { 0 };
            };
          };

          let totalConditionLoss = Nat.min(stats.condition, conditionLoss + extraConditionLoss);

          let updatedStats = {
            stats with
            condition = Nat.sub(stats.condition, totalConditionLoss);
            calibration = Nat.sub(stats.calibration, calibrationLoss);
          };

          updateStats(tokenIndex, updatedStats);
          ?updatedStats;
        };
        case (null) { null };
      };
    };

    // Apply decay to all bots (called by 24-hour timer)
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

    // Get faction-specific upgrade multiplier
    public func getFactionUpgradeMultiplier(faction : FactionType) : Float {
      switch (faction) {
        case (#GodClass) { 1.2 }; // 20% chance for double gains
        case (#WildBot) { 1.0 }; // Wild Bots have variance, not multiplier
        case (_) { 1.0 };
      };
    };

    // Apply faction modifiers to stat gain
    public func applyFactionModifier(
      faction : FactionType,
      baseGain : Nat,
      seed : Nat32,
    ) : Nat {
      switch (faction) {
        case (#GodClass) {
          // 20% chance for double gains
          let roll = seed % 100;
          if (roll < 20) { baseGain * 2 } else { baseGain };
        };
        case (#WildBot) {
          // ±2 variance instead of standard ±1
          let roll = Nat32.toNat(seed % 5); // 0-4
          let variance : Int = roll - 2; // -2 to +2
          let modified = Int.abs(variance + baseGain);
          Nat.max(1, modified); // Minimum 1
        };
        case (_) { baseGain };
      };
    };

    // Increase faction reputation
    public func increaseFactionReputation(
      tokenIndex : Nat,
      amount : Nat,
    ) : ?Nat {
      switch (getStats(tokenIndex)) {
        case (?stats) {
          let newReputation = stats.factionReputation + amount;
          let updatedStats = {
            stats with
            factionReputation = newReputation;
          };
          updateStats(tokenIndex, updatedStats);
          ?newReputation;
        };
        case (null) { null };
      };
    };

    // Get all bots that need decay
    public func getBotsNeedingDecay(lastDecayTime : Int, now : Int) : [Nat] {
      let hoursSinceDecay = (now - lastDecayTime) / 3_600_000_000_000;
      if (hoursSinceDecay < 24) {
        return [];
      };

      // Return all token indices
      let allBots = Map.entries(stats);
      Array.map<(Nat, PokedBotRacingStats), Nat>(
        Iter.toArray(allBots),
        func(entry) { entry.0 },
      );
    };
  };

  // ===== RACE MANAGER =====

  public class RaceManager(
    initRaces : Map.Map<Nat, Race>,
    racingStatsManager : RacingStatsManager,
  ) {
    let races = initRaces;
    var nextRaceId : Nat = Map.size(races);

    // Calculate race duration based on distance and terrain
    func calculateRaceDuration(distance : Nat, terrain : Terrain) : Nat {
      // Base time: 30 seconds per km
      let baseTime = distance * 30;

      // Terrain multiplier
      let terrainMultiplier = switch (terrain) {
        case (#ScrapHeaps) { 1.3 }; // Slower, obstacles
        case (#WastelandSand) { 1.2 }; // Medium, loose terrain
        case (#MetalRoads) { 1.0 }; // Fastest, smooth roads
      };

      // Return duration in seconds (2-10 minutes for typical races)
      Int.abs(Float.toInt(Float.fromInt(baseTime) * terrainMultiplier));
    };

    // Generate thematic wasteland race names
    func generateRaceName(raceId : Nat, terrain : Terrain, raceClass : RaceClass) : Text {
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

    // Create a new race
    public func createRace(
      distance : Nat,
      terrain : Terrain,
      raceClass : RaceClass,
      entryFee : Nat,
      maxEntries : Nat,
      startTime : Int,
    ) : Race {
      let raceId = nextRaceId;
      nextRaceId += 1;

      let now = Time.now();
      let entryDeadline = startTime - (30 * 60 * 1_000_000_000); // 30 min before start
      let duration = calculateRaceDuration(distance, terrain);

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
        silentKlanTax = 0;
      };

      ignore Map.put(races, nhash, raceId, race);
      race;
    };

    // Get a race by ID
    public func getRace(raceId : Nat) : ?Race {
      Map.get(races, nhash, raceId);
    };

    // Get all races
    public func getAllRaces() : [Race] {
      Iter.toArray(Map.vals(races));
    };

    // Get upcoming races
    public func getUpcomingRaces() : [Race] {
      let allRaces = getAllRaces();
      Array.filter<Race>(
        allRaces,
        func(r) {
          switch (r.status) {
            case (#Upcoming) { true };
            case (_) { false };
          };
        },
      );
    };

    // Get races a bot can enter
    public func getAvailableRacesForBot(botStats : PokedBotRacingStats, now : Int) : [Race] {
      let upcoming = getUpcomingRaces();
      Array.filter<Race>(
        upcoming,
        func(r) {
          // Check entry deadline
          if (now >= r.entryDeadline) { return false };

          // Check if race is full
          if (r.entries.size() >= r.maxEntries) { return false };

          // Check if bot already entered
          let alreadyEntered = Array.find<RaceEntry>(
            r.entries,
            func(e) { e.tokenIndex == botStats.tokenIndex },
          );
          if (Option.isSome(alreadyEntered)) { return false };

          // Check class requirements
          let meetsClass = switch (r.raceClass) {
            case (#Scavenger) { botStats.wins <= 2 };
            case (#Raider) { botStats.wins >= 3 and botStats.wins <= 5 };
            case (#Elite) { botStats.wins >= 6 and botStats.wins <= 9 };
            case (#SilentKlan) {
              botStats.wins >= 10 and (
                switch (botStats.faction) {
                  case (#GodClass) { true };
                  case (#Master) { true };
                  case (_) { false };
                }
              );
            };
          };
          if (not meetsClass) { return false };

          // Check bot condition
          if (botStats.condition < 70 or botStats.battery < 50) { return false };

          true;
        },
      );
    };

    // Enter a bot in a race
    public func enterRace(
      raceId : Nat,
      tokenIndex : Nat,
      owner : Principal,
      now : Int,
    ) : ?Race {
      switch (getRace(raceId)) {
        case (?race) {
          // Add entry
          let entry : RaceEntry = {
            tokenIndex = tokenIndex;
            owner = owner;
            entryFee = race.entryFee;
            enteredAt = now;
          };

          let newEntries = Array.append<RaceEntry>(race.entries, [entry]);
          let newPrizePool = race.prizePool + race.entryFee;
          let newTax = (newPrizePool * 5) / 100; // 5% tax

          let updatedRace = {
            race with
            entries = newEntries;
            prizePool = newPrizePool;
            silentKlanTax = newTax;
          };

          ignore Map.put(races, nhash, raceId, updatedRace);
          ?updatedRace;
        };
        case (null) { null };
      };
    };

    // Update race status
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

    // Set race results
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

    // Simulate a race and return results
    public func simulateRace(raceId : Nat) : ?[RaceResult] {
      switch (getRace(raceId)) {
        case (?race) {
          if (race.entries.size() < 2) {
            return null; // Need at least 2 racers
          };

          // Calculate finish times for each racer
          var racerTimes : [(RaceEntry, Float)] = [];

          for (entry in race.entries.vals()) {
            switch (racingStatsManager.getStats(entry.tokenIndex)) {
              case (?botStats) {
                let time = calculateRaceTime(race, botStats, racingStatsManager, raceId);
                racerTimes := Array.append(racerTimes, [(entry, time)]);
              };
              case (null) {
                // Skip bots without stats
              };
            };
          };

          // Sort by time (fastest first)
          let sorted = Array.sort<(RaceEntry, Float)>(
            racerTimes,
            func(a, b) { Float.compare(a.1, b.1) },
          );

          // Calculate prizes
          let netPrizePool = Nat.sub(race.prizePool, race.silentKlanTax);
          var results : [RaceResult] = [];

          for (i in Iter.range(0, sorted.size() - 1)) {
            let (entry, time) = sorted[i];
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
              0; // No prize for 5th+
            };

            let result : RaceResult = {
              tokenIndex = entry.tokenIndex;
              owner = entry.owner;
              position = position;
              finalTime = time;
              prizeAmount = prize;
            };

            results := Array.append(results, [result]);
          };

          ?results;
        };
        case (null) { null };
      };
    };

    // Calculate race time for a bot (deterministic simulation)
    func calculateRaceTime(race : Race, botStats : PokedBotRacingStats, statsManager : RacingStatsManager, seed : Nat) : Float {
      let distance = Float.fromInt(race.distance);

      // Get current stats (base + bonuses)
      let currentStats = statsManager.getCurrentStats(botStats);
      let speed = Float.fromInt(currentStats.speed);
      let powerCore = Float.fromInt(currentStats.powerCore);
      let stability = Float.fromInt(currentStats.stability);

      let battery = Float.fromInt(botStats.battery);
      let condition = Float.fromInt(botStats.condition);

      // Base time calculation
      let baseTime = distance / (speed * 0.8 + 10.0);

      // Power core effect (endurance for long distances)
      let distanceFactor = if (race.distance > 15) {
        powerCore / 100.0;
      } else { 1.0 };

      // Battery and condition penalties
      let batteryFactor = battery / 100.0;
      let conditionFactor = condition / 100.0;

      // Terrain preference
      let terrainFactor = if (botStats.preferredTerrain == race.terrain) {
        1.05;
      } else { 0.95 };

      // Faction bonuses
      let factionBonus = switch (botStats.faction) {
        case (#BattleBot) {
          if (race.terrain == #ScrapHeaps) { 1.08 } else { 1.0 };
        };
        case (#EntertainmentBot) { 1.03 }; // Crowd favorites
        case (#WildBot) {
          // Chaotic variance using seed
          let roll = Nat32.fromNat(seed % 100);
          1.0 + (Float.fromInt(Nat32.toNat(roll)) / 100.0) * 0.15;
        };
        case (#GodClass) { 1.10 }; // Superior
        case (#Master) {
          switch (race.raceClass) {
            case (#Elite) { 1.12 };
            case (#SilentKlan) { 1.12 };
            case (_) { 1.05 };
          };
        };
      };

      // Stability affects variance (lower stability = more variance)
      let varianceSeed = Nat32.fromNat((seed + botStats.tokenIndex) % 1000);
      let variance = (Float.fromInt(Nat32.toNat(varianceSeed)) / 1000.0) * ((100.0 - stability) / 100.0) * 0.15;

      // Final time
      let finalTime = baseTime / (
        distanceFactor * batteryFactor * conditionFactor * terrainFactor * factionBonus
      ) * (1.0 + variance);

      finalTime;
    };
  };
};
