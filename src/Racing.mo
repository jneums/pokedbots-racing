import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";
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
    #Master
  };
  
  // ===== TERRAIN & DISTANCE TYPES =====
  
  public type Terrain = {
    #ScrapHeaps;      // Garbage towers
    #WastelandSand;   // Desert
    #MetalRoads      // Ancient highways
  };
  
  public type Distance = {
    #ShortSprint;    // < 10km
    #MediumHaul;     // 10-20km
    #LongTrek       // > 20km
  };
  
  // ===== RACE TYPES =====
  
  public type RaceClass = {
    #Scavenger;       // 0-2 wins
    #Raider;          // 3-5 wins
    #Elite;           // 6-9 wins
    #SilentKlan      // 10+ wins, God Class & Masters only
  };
  
  // ===== POKEDBOT RACING STATS =====
  
  public type PokedBotRacingStats = {
    tokenIndex: Nat;
    ownerPrincipal: Principal;
    
    // Faction
    faction: FactionType;
    
    // Base stats (immutable, from initial generation)
    baseSpeed: Nat;
    basePowerCore: Nat;
    baseAcceleration: Nat;
    baseStability: Nat;
    
    // Current stats (evolve with upgrades)
    speed: Nat;
    powerCore: Nat;
    acceleration: Nat;
    stability: Nat;
    
    // Dynamic stats
    battery: Nat;
    condition: Nat;
    calibration: Nat;
    experience: Nat;
    
    // Preferences (derived from faction + stats)
    preferredDistance: Distance;
    preferredTerrain: Terrain;
    
    // Career stats
    racesEntered: Nat;
    wins: Nat;
    places: Nat;
    shows: Nat;
    totalScrapEarned: Nat;
    factionReputation: Nat;
    
    // Timestamps
    activatedAt: Int;
    lastRecharged: ?Int;
    lastRepaired: ?Int;
    lastDiagnostics: ?Int;
    lastRaced: ?Int;
    upgradeEndsAt: ?Int;
  };
  
  // ===== UPGRADE TYPES =====
  
  public type UpgradeType = {
    #Velocity;      // Speed
    #PowerCore;     // Power Core
    #Thruster;      // Acceleration
    #Gyro          // Stability
  };
  
  public type UpgradeSession = {
    tokenIndex: Nat;
    upgradeType: UpgradeType;
    startedAt: Int;
    endsAt: Int;
  };
  
  // ===== MAINTENANCE TYPES =====
  
  public type MaintenanceCooldowns = {
    lastRecharged: ?Int;
    lastRepaired: ?Int;
    lastDiagnostics: ?Int;
  };
  
  // ===== STAT DERIVATION FUNCTIONS =====
  
  // Generate deterministic stats from token index and faction
  public func deriveStatsFromTokenIndex(tokenIndex: Nat, faction: FactionType) : {
    speed: Nat;
    powerCore: Nat;
    acceleration: Nat;
    stability: Nat;
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
    
    { speed; powerCore; acceleration; stability }
  };
  
  // Apply faction-specific bonuses to stats
  private func applyFactionBonus(baseStat: Nat, faction: FactionType, statType: { #Speed; #PowerCore; #Acceleration; #Stability }) : Nat {
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
  public func derivePreferredDistance(powerCore: Nat, speed: Nat) : Distance {
    if (powerCore > 70 and speed < 60) {
      #LongTrek  // High endurance, moderate speed
    } else if (speed > 70 and powerCore < 60) {
      #ShortSprint  // High speed, lower endurance
    } else {
      #MediumHaul  // Balanced
    }
  };
  
  // Derive preferred terrain from faction
  public func derivePreferredTerrain(faction: FactionType) : Terrain {
    switch (faction) {
      case (#BattleBot) { #ScrapHeaps };  // Built from junk, excel in junk
      case (#EntertainmentBot) { #MetalRoads };  // Prefer smooth surfaces for show
      case (#WildBot) { #WastelandSand };  // Chaotic, unpredictable terrain
      case (#GodClass) { #MetalRoads };  // Superior on quality surfaces
      case (#Master) { #MetalRoads };  // Precision engineering
    }
  };
  
  // Simple hash function for determinism
  private func hashNat(n: Nat) : Nat {
    // Simple multiplicative hash to create deterministic variation
    let a = n * 2654435761; // Large prime
    let b = a % 4294967296; // Keep it reasonable
    let c = (b * 1103515245 + 12345) % 2147483648;
    c
  };
  
  // ===== RACING STATS MANAGER =====
  
  public class RacingStatsManager() {
    // Map.Map to store racing stats by token index - stable across upgrades
    private let stats = Map.new<Nat, PokedBotRacingStats>();
    
    // Active upgrade sessions
    private let activeUpgrades = Map.new<Nat, UpgradeSession>();
    
    // Maintenance cooldowns
    private let maintenanceCooldowns = Map.new<Nat, MaintenanceCooldowns>();
    
    // Initialize racing stats for a PokedBot (first-time setup, free)
    public func initializeBot(
      tokenIndex: Nat,
      owner: Principal,
      faction: FactionType
    ) : PokedBotRacingStats {
      // Generate deterministic stats
      let baseStats = deriveStatsFromTokenIndex(tokenIndex, faction);
      
      let now = Time.now();
      
      let racingStats : PokedBotRacingStats = {
        tokenIndex = tokenIndex;
        ownerPrincipal = owner;
        faction = faction;
        
        // Base stats (immutable)
        baseSpeed = baseStats.speed;
        basePowerCore = baseStats.powerCore;
        baseAcceleration = baseStats.acceleration;
        baseStability = baseStats.stability;
        
        // Current stats (start same as base)
        speed = baseStats.speed;
        powerCore = baseStats.powerCore;
        acceleration = baseStats.acceleration;
        stability = baseStats.stability;
        
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
      };
      
      ignore Map.put(stats, nhash, tokenIndex, racingStats);
      racingStats
    };
    
    // Get racing stats for a bot
    public func getStats(tokenIndex: Nat) : ?PokedBotRacingStats {
      Map.get(stats, nhash, tokenIndex)
    };
    
    // Update racing stats
    public func updateStats(tokenIndex: Nat, newStats: PokedBotRacingStats) {
      ignore Map.put(stats, nhash, tokenIndex, newStats);
    };
    
    // Check if bot is initialized for racing
    public func isInitialized(tokenIndex: Nat) : Bool {
      Option.isSome(Map.get(stats, nhash, tokenIndex))
    };
    
    // Get all bots for an owner
    public func getBotsForOwner(owner: Principal) : [PokedBotRacingStats] {
      let allStats = Map.vals(stats);
      Array.filter<PokedBotRacingStats>(
        Iter.toArray(allStats),
        func(s) { Principal.equal(s.ownerPrincipal, owner) }
      )
    };
    
    // Calculate overall rating
    public func calculateOverallRating(botStats: PokedBotRacingStats) : Nat {
      // Weighted average of current stats
      let total = botStats.speed + botStats.powerCore + botStats.acceleration + botStats.stability;
      total / 4
    };
    
    // Check if bot can race
    public func canRace(botStats: PokedBotRacingStats) : Bool {
      botStats.condition >= 70 and botStats.battery >= 50
    };
    
    // Get bot status message
    public func getBotStatus(botStats: PokedBotRacingStats) : Text {
      if (botStats.condition < 25) {
        "Critical Malfunction"
      } else if (botStats.condition < 50) {
        "Needs Repair"
      } else if (botStats.battery < 30) {
        "Low Battery"
      } else if (botStats.condition >= 70 and botStats.battery >= 50) {
        "Ready"
      } else {
        "Maintenance Required"
      }
    };
  };
};
