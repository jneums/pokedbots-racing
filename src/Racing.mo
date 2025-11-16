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

  public type Sponsor = {
    sponsor : Principal;
    amount : Nat; // ICP e8s contributed
    message : ?Text; // Optional sponsor message
    timestamp : Int; // When they sponsored
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

    prizePool : Nat; // Total ICP collected (entry fees + sponsorships)
    silentKlanTax : Nat; // 5% taken
    sponsors : [Sponsor]; // Race sponsors
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

    // Helper to check if a numeric trait value is > 0
    func hasAttribute(name : Text) : Bool {
      switch (getTrait(name)) {
        case (?value) {
          switch (Nat.fromText(value)) {
            case (?n) { n > 0 };
            case null { false };
          };
        };
        case null { false };
      };
    };

    // Get trait values
    let body = getTrait("body");
    let arms = getTrait("arms");
    let legs = getTrait("legs");
    let wings = getTrait("wings");
    let driver = getTrait("driver guy");

    // Special attribute bonuses (Gold, Rust, Black, Pink, Blue)
    let goldBonus = if (hasAttribute("gold")) { 8 } else { 0 }; // +8 to all stats
    let rustPenalty = if (hasAttribute("rust")) { -5 } else { 0 }; // -5 to power/stability
    let blackBonus = if (hasAttribute("black")) { 6 } else { 0 }; // +6 to speed/acceleration
    let pinkBonus = if (hasAttribute("pink")) { 4 } else { 0 }; // +4 to stability
    let blueBonus = if (hasAttribute("blue")) { 5 } else { 0 }; // +5 to power core

    // Calculate composite stats using multi-trait formulas
    // Speed = Legs (40%) + Wings (30%) + Body (20% inverse) + Arms (10%)
    let legsSpeedScore = categorizeLegsForSpeed(legs);
    let wingsSpeedScore = categorizeWingsForSpeed(wings);
    let bodySpeedScore = categorizeBodyForSpeed(body); // Lighter = faster
    let armsSpeedScore = categorizeArmsForSpeed(arms);

    let rawSpeed = Float.fromInt(legsSpeedScore) * 0.40 + Float.fromInt(wingsSpeedScore) * 0.30 + Float.fromInt(bodySpeedScore) * 0.20 + Float.fromInt(armsSpeedScore) * 0.10;
    let baseSpeed = Nat.min(100, Int.abs(Float.toInt(rawSpeed)) + goldBonus + blackBonus);

    // Power Core = Body (50%) + Arms (25%) + Legs (15%) + Wings (10%)
    let bodyPowerScore = categorizeBodyForPower(body);
    let armsPowerScore = categorizeArmsForPower(arms);
    let legsPowerScore = categorizeLegsForPower(legs);
    let wingsPowerScore = categorizeWingsForPower(wings);

    let rawPower = Float.fromInt(bodyPowerScore) * 0.50 + Float.fromInt(armsPowerScore) * 0.25 + Float.fromInt(legsPowerScore) * 0.15 + Float.fromInt(wingsPowerScore) * 0.10;
    let basePowerCore = Nat.min(100, Int.abs(Float.toInt(rawPower) + goldBonus + blueBonus + rustPenalty));

    // Acceleration = Legs (50%) + Arms (20%) + Wings (20%) + Body (10% inverse)
    let legsAccelScore = categorizeLegsForAccel(legs);
    let armsAccelScore = categorizeArmsForAccel(arms);
    let wingsAccelScore = categorizeWingsForAccel(wings);
    let bodyAccelScore = categorizeBodyForAccel(body); // Lighter = faster acceleration

    let rawAccel = Float.fromInt(legsAccelScore) * 0.50 + Float.fromInt(armsAccelScore) * 0.20 + Float.fromInt(wingsAccelScore) * 0.20 + Float.fromInt(bodyAccelScore) * 0.10;
    let baseAcceleration = Nat.min(100, Int.abs(Float.toInt(rawAccel)) + goldBonus + blackBonus);

    // Stability = Driver (40%) + Body (30%) + Legs (20%) + Arms (10%)
    let driverStabilityScore = categorizeDriverForStability(driver);
    let bodyStabilityScore = categorizeBodyForStability(body);
    let legsStabilityScore = categorizeLegsForStability(legs);
    let armsStabilityScore = categorizeArmsForStability(arms);

    let rawStability = Float.fromInt(driverStabilityScore) * 0.40 + Float.fromInt(bodyStabilityScore) * 0.30 + Float.fromInt(legsStabilityScore) * 0.20 + Float.fromInt(armsStabilityScore) * 0.10;
    let baseStability = Nat.min(100, Int.abs(Float.toInt(rawStability) + goldBonus + pinkBonus + rustPenalty));

    // Apply faction bonuses
    let speed = applyFactionBonus(baseSpeed, faction, #Speed);
    let powerCore = applyFactionBonus(basePowerCore, faction, #PowerCore);
    let acceleration = applyFactionBonus(baseAcceleration, faction, #Acceleration);
    let stability = applyFactionBonus(baseStability, faction, #Stability);

    { speed; powerCore; acceleration; stability };
  };

  // ===== SPEED CATEGORIZATION FUNCTIONS =====

  // Legs contribution to speed (40% weight) - Locomotion is primary speed factor
  private func categorizeLegsForSpeed(legs : ?Text) : Nat {
    switch (legs) {
      case (?l) {
        let lower = Text.toLowercase(l);
        // Legendary (70-80)
        if (Text.contains(lower, #text "master gold") or Text.contains(lower, #text "ultimate terminator")) {
          75 + (hashText(l) % 6);
        }
        // High speed (60-75): Rockets, super legs, power walkers
        else if (
          Text.contains(lower, #text "rocket") or
          Text.contains(lower, #text "super") or
          Text.contains(lower, #text "ultimate") or
          Text.contains(lower, #text "power walker")
        ) {
          65 + (hashText(l) % 11);
        }
        // Medium-high (50-65): Power, strong, chunky
        else if (
          Text.contains(lower, #text "power") or
          Text.contains(lower, #text "strong") or
          Text.contains(lower, #text "chunky") or
          Text.contains(lower, #text "spiky")
        ) {
          55 + (hashText(l) % 11);
        }
        // Medium (40-55): Midi, bendy, cables, bird claw, flat, bone
        else if (
          Text.contains(lower, #text "midi") or
          Text.contains(lower, #text "bendy") or
          Text.contains(lower, #text "cable") or
          Text.contains(lower, #text "bird claw") or
          Text.contains(lower, #text "frog") or
          Text.contains(lower, #text "8 bit") or
          Text.contains(lower, #text "flat") or
          Text.contains(lower, #text "bone") or
          Text.contains(lower, #text "big") or
          Text.contains(lower, #text "cactus") or
          Text.contains(lower, #text "mech") or
          Text.contains(lower, #text "chocolate")
        ) {
          45 + (hashText(l) % 11);
        }
        // Low (30-50): Small, burnt, rust, inflatable, slender
        else {
          35 + (hashText(l) % 16);
        };
      };
      case null { 45 }; // Default
    };
  };

  // Wings contribution to speed (30% weight) - Jets and engines provide thrust
  private func categorizeWingsForSpeed(wings : ?Text) : Nat {
    switch (wings) {
      case (?w) {
        let lower = Text.toLowercase(w);
        // Legendary
        if (Text.contains(lower, #text "master gold") or Text.contains(lower, #text "ultimate")) {
          75 + (hashText(w) % 6);
        }
        // High speed (60-75): Massive engines, rockets, triangle fins
        else if (
          Text.contains(lower, #text "massive engine") or
          Text.contains(lower, #text "rocket") or
          Text.contains(lower, #text "jet") or
          Text.contains(lower, #text "triangle up")
        ) {
          65 + (hashText(w) % 11);
        }
        // Medium-high (50-65): Power cells, large wings
        else if (
          Text.contains(lower, #text "power cell") or
          Text.contains(lower, #text "butterfly double") or
          Text.contains(lower, #text "angel wings")
        ) {
          55 + (hashText(w) % 11);
        }
        // Medium (40-55): Standard wings, 8-bit, antenna, large wings
        else if (
          Text.contains(lower, #text "8 bit") or
          Text.contains(lower, #text "bear") or
          Text.contains(lower, #text "horn") or
          Text.contains(lower, #text "decal") or
          Text.contains(lower, #text "antenna") or
          Text.contains(lower, #text "jointed") or
          Text.contains(lower, #text "large") or
          Text.contains(lower, #text "ear muff") or
          Text.contains(lower, #text "connector") or
          Text.contains(lower, #text "chain saw") or
          Text.contains(lower, #text "game face")
        ) {
          45 + (hashText(w) % 11);
        }
        // Low (30-45): Blank, burnt, decorative, inflatable
        else if (
          Text.contains(lower, #text "blank") or
          Text.contains(lower, #text "none") or
          Text.contains(lower, #text "inflatable") or
          Text.contains(lower, #text "lolly pop") or
          Text.contains(lower, #text "straw")
        ) {
          32 + (hashText(w) % 9);
        } else {
          40 + (hashText(w) % 11);
        };
      };
      case null { 35 }; // No wings = low speed
    };
  };

  // Body contribution to speed (20% weight, INVERSE) - Heavy bodies are slower
  private func categorizeBodyForSpeed(body : ?Text) : Nat {
    switch (body) {
      case (?b) {
        let lower = Text.toLowercase(b);
        // Light/Fast (60-75): Eggs, bubbles, balloons, small food
        if (
          Text.contains(lower, #text "egg") or
          Text.contains(lower, #text "bubble") or
          Text.contains(lower, #text "balloon") or
          Text.contains(lower, #text "glass") or
          Text.contains(lower, #text "gummy") or
          Text.contains(lower, #text "bee") or
          Text.contains(lower, #text "bird") or
          Text.contains(lower, #text "donut") or
          Text.contains(lower, #text "smarties")
        ) {
          65 + (hashText(b) % 11);
        }
        // Medium (45-60): Game systems, animals, standard bodies
        else if (
          Text.contains(lower, #text "game boy") or
          Text.contains(lower, #text "n 64") or
          Text.contains(lower, #text "ipod") or
          Text.contains(lower, #text "8 bit") or
          Text.contains(lower, #text "frog") or
          Text.contains(lower, #text "rabbit") or
          Text.contains(lower, #text "round head") or
          Text.contains(lower, #text "pig") or
          Text.contains(lower, #text "cat") or
          Text.contains(lower, #text "pizza") or
          Text.contains(lower, #text "cheese") or
          Text.contains(lower, #text "waffle")
        ) {
          50 + (hashText(b) % 11);
        }
        // Heavy/Slow (30-45): Mega, large, tower, beast
        else if (
          Text.contains(lower, #text "mega") or
          Text.contains(lower, #text "large") or
          Text.contains(lower, #text "tower") or
          Text.contains(lower, #text "beast") or
          Text.contains(lower, #text "massive")
        ) {
          35 + (hashText(b) % 11);
        } else {
          45 + (hashText(b) % 11);
        };
      };
      case null { 50 };
    };
  };

  // Arms contribution to speed (10% weight) - Minor thrust/propulsion
  private func categorizeArmsForSpeed(arms : ?Text) : Nat {
    switch (arms) {
      case (?a) {
        let lower = Text.toLowercase(a);
        // Legendary
        if (Text.contains(lower, #text "master gold") or Text.contains(lower, #text "golden king") or Text.contains(lower, #text "murder arms gold")) {
          75 + (hashText(a) % 6);
        }
        // High (60-75): Rockets, jets, lasers
        else if (
          Text.contains(lower, #text "rocket") or
          Text.contains(lower, #text "jet") or
          Text.contains(lower, #text "lazer") or
          Text.contains(lower, #text "rainbow")
        ) {
          65 + (hashText(a) % 11);
        }
        // Medium-high (50-65): Power arms, tech, weapons, long arms
        else if (
          Text.contains(lower, #text "power arms") or
          Text.contains(lower, #text "8 bit") or
          Text.contains(lower, #text "connector") or
          Text.contains(lower, #text "cable") or
          Text.contains(lower, #text "wire") or
          Text.contains(lower, #text "chainsaw") or
          Text.contains(lower, #text "claw") or
          Text.contains(lower, #text "snipper") or
          Text.contains(lower, #text "gripper") or
          Text.contains(lower, #text "long arms") or
          Text.contains(lower, #text "power lift") or
          Text.contains(lower, #text "mechanic")
        ) {
          50 + (hashText(a) % 11);
        }
        // Medium (40-50): Hands up, mixed hands
        else if (Text.contains(lower, #text "hands up") or Text.contains(lower, #text "double arms")) {
          45 + (hashText(a) % 6);
        }
        // Low (30-45): Hands down, fingers, bone
        else {
          35 + (hashText(a) % 11);
        };
      };
      case null { 45 };
    };
  };

  // ===== POWER CORE CATEGORIZATION FUNCTIONS =====

  // Body contribution to power (50% weight) - Main chassis houses power core
  private func categorizeBodyForPower(body : ?Text) : Nat {
    switch (body) {
      case (?b) {
        let lower = Text.toLowercase(b);
        // High power (60-80): Large, mega, ultimate, master
        if (
          Text.contains(lower, #text "mega") or
          Text.contains(lower, #text "large") or
          Text.contains(lower, #text "ultimate") or
          Text.contains(lower, #text "master") or
          Text.contains(lower, #text "super") or
          Text.contains(lower, #text "tower") or
          Text.contains(lower, #text "beast") or
          Text.contains(lower, #text "golden")
        ) {
          65 + (hashText(b) % 16);
        }
        // Medium-high (50-65): Controllers, boxes, industrial
        else if (
          Text.contains(lower, #text "controller") or
          Text.contains(lower, #text "battle box") or
          Text.contains(lower, #text "command box") or
          Text.contains(lower, #text "iron") or
          Text.contains(lower, #text "copper")
        ) {
          55 + (hashText(b) % 11);
        }
        // Medium (40-55): Standard bodies
        else if (
          Text.contains(lower, #text "egg") or
          Text.contains(lower, #text "game boy") or
          Text.contains(lower, #text "frog") or
          Text.contains(lower, #text "bee body")
        ) {
          45 + (hashText(b) % 11);
        }
        // Low (30-45): Small, mini, bubble
        else {
          35 + (hashText(b) % 11);
        };
      };
      case null { 50 };
    };
  };

  // Arms contribution to power (25% weight) - Power arms draw significant energy
  private func categorizeArmsForPower(arms : ?Text) : Nat {
    switch (arms) {
      case (?a) {
        let lower = Text.toLowercase(a);
        // High power (60-75): Power arms, ultimate, massive
        if (
          Text.contains(lower, #text "power arms") or
          Text.contains(lower, #text "ultimate") or
          Text.contains(lower, #text "master") or
          Text.contains(lower, #text "massive") or
          Text.contains(lower, #text "rainbow lazer") or
          Text.contains(lower, #text "double arms")
        ) {
          65 + (hashText(a) % 11);
        }
        // Medium (45-60): Rockets, tech arms
        else if (
          Text.contains(lower, #text "rocket") or
          Text.contains(lower, #text "8 bit") or
          Text.contains(lower, #text "connector") or
          Text.contains(lower, #text "cable") or
          Text.contains(lower, #text "lazer")
        ) {
          50 + (hashText(a) % 11);
        }
        // Low (30-45): Basic hands
        else {
          35 + (hashText(a) % 11);
        };
      };
      case null { 45 };
    };
  };

  // Legs contribution to power (15% weight)
  private func categorizeLegsForPower(legs : ?Text) : Nat {
    switch (legs) {
      case (?l) {
        let lower = Text.toLowercase(l);
        // High (55-70): Power, strong, chunky
        if (
          Text.contains(lower, #text "power") or
          Text.contains(lower, #text "strong") or
          Text.contains(lower, #text "chunky") or
          Text.contains(lower, #text "ultimate") or
          Text.contains(lower, #text "super")
        ) {
          60 + (hashText(l) % 11);
        }
        // Medium (40-55)
        else if (
          Text.contains(lower, #text "midi") or
          Text.contains(lower, #text "8 bit") or
          Text.contains(lower, #text "cable")
        ) {
          45 + (hashText(l) % 11);
        }
        // Low (30-45)
        else {
          35 + (hashText(l) % 11);
        };
      };
      case null { 45 };
    };
  };

  // Wings contribution to power (10% weight)
  private func categorizeWingsForPower(wings : ?Text) : Nat {
    switch (wings) {
      case (?w) {
        let lower = Text.toLowercase(w);
        // High (55-70): Massive engines, power cells
        if (
          Text.contains(lower, #text "massive engine") or
          Text.contains(lower, #text "power cell") or
          Text.contains(lower, #text "ultimate") or
          Text.contains(lower, #text "golden")
        ) {
          60 + (hashText(w) % 11);
        }
        // Medium (40-55)
        else if (
          Text.contains(lower, #text "rocket") or
          Text.contains(lower, #text "8 bit") or
          Text.contains(lower, #text "angel")
        ) {
          45 + (hashText(w) % 11);
        }
        // Low (30-45)
        else {
          35 + (hashText(w) % 11);
        };
      };
      case null { 40 };
    };
  };

  // ===== ACCELERATION CATEGORIZATION FUNCTIONS =====

  // Legs contribution to acceleration (50% weight) - Quick response and agility
  private func categorizeLegsForAccel(legs : ?Text) : Nat {
    switch (legs) {
      case (?l) {
        let lower = Text.toLowercase(l);
        // High accel (60-80): Super fast, spiky, spring-like
        if (
          Text.contains(lower, #text "super fast") or
          Text.contains(lower, #text "super leg") or
          Text.contains(lower, #text "spiky") or
          Text.contains(lower, #text "bird claw") or
          Text.contains(lower, #text "frog") or
          Text.contains(lower, #text "ultimate")
        ) {
          65 + (hashText(l) % 16);
        }
        // Medium (45-60): Bendy, midi, agile
        else if (
          Text.contains(lower, #text "bendy") or
          Text.contains(lower, #text "midi") or
          Text.contains(lower, #text "cable") or
          Text.contains(lower, #text "power") or
          Text.contains(lower, #text "8 bit")
        ) {
          50 + (hashText(l) % 11);
        }
        // Low (30-45): Chunky, large, heavy
        else if (
          Text.contains(lower, #text "chunky") or
          Text.contains(lower, #text "large") or
          Text.contains(lower, #text "burnt") or
          Text.contains(lower, #text "rust") or
          Text.contains(lower, #text "inflatable")
        ) {
          35 + (hashText(l) % 11);
        } else {
          45 + (hashText(l) % 11);
        };
      };
      case null { 45 };
    };
  };

  // Arms contribution to acceleration (20% weight)
  private func categorizeArmsForAccel(arms : ?Text) : Nat {
    switch (arms) {
      case (?a) {
        let lower = Text.toLowercase(a);
        // High (55-70): Lasers, rockets, quick thrust
        if (
          Text.contains(lower, #text "lazer") or
          Text.contains(lower, #text "rainbow") or
          Text.contains(lower, #text "rocket up") or
          Text.contains(lower, #text "power jet") or
          Text.contains(lower, #text "chainsaw")
        ) {
          60 + (hashText(a) % 11);
        }
        // Medium (40-55)
        else if (
          Text.contains(lower, #text "claw") or
          Text.contains(lower, #text "power arms") or
          Text.contains(lower, #text "8 bit")
        ) {
          45 + (hashText(a) % 11);
        }
        // Low (30-45)
        else {
          35 + (hashText(a) % 11);
        };
      };
      case null { 45 };
    };
  };

  // Wings contribution to acceleration (20% weight)
  private func categorizeWingsForAccel(wings : ?Text) : Nat {
    switch (wings) {
      case (?w) {
        let lower = Text.toLowercase(w);
        // High (55-70): Rockets, engines, quick thrust
        if (
          Text.contains(lower, #text "rocket") or
          Text.contains(lower, #text "massive engine") or
          Text.contains(lower, #text "power cell") or
          Text.contains(lower, #text "triangle up")
        ) {
          60 + (hashText(w) % 11);
        }
        // Medium (40-55)
        else if (
          Text.contains(lower, #text "butterfly") or
          Text.contains(lower, #text "angel") or
          Text.contains(lower, #text "8 bit")
        ) {
          45 + (hashText(w) % 11);
        }
        // Low (30-45)
        else {
          35 + (hashText(w) % 11);
        };
      };
      case null { 40 };
    };
  };

  // Body contribution to acceleration (10% weight, INVERSE) - Lighter = faster accel
  private func categorizeBodyForAccel(body : ?Text) : Nat {
    switch (body) {
      case (?b) {
        let lower = Text.toLowercase(b);
        // Light/agile (60-75)
        if (
          Text.contains(lower, #text "egg") or
          Text.contains(lower, #text "bubble") or
          Text.contains(lower, #text "balloon") or
          Text.contains(lower, #text "mini") or
          Text.contains(lower, #text "small")
        ) {
          65 + (hashText(b) % 11);
        }
        // Medium (45-60)
        else if (
          Text.contains(lower, #text "game boy") or
          Text.contains(lower, #text "ipod") or
          Text.contains(lower, #text "frog")
        ) {
          50 + (hashText(b) % 11);
        }
        // Heavy (30-45)
        else if (
          Text.contains(lower, #text "mega") or
          Text.contains(lower, #text "tower") or
          Text.contains(lower, #text "beast") or
          Text.contains(lower, #text "massive")
        ) {
          35 + (hashText(b) % 11);
        } else {
          45 + (hashText(b) % 11);
        };
      };
      case null { 50 };
    };
  };

  // ===== STABILITY CATEGORIZATION FUNCTIONS =====

  // Driver contribution to stability (40% weight) - Skill is primary factor
  private func categorizeDriverForStability(driver : ?Text) : Nat {
    switch (driver) {
      case (?d) {
        let lower = Text.toLowercase(d);
        // High stability (60-80): Professional gear, focused
        if (
          Text.contains(lower, #text "metal goggles") or
          Text.contains(lower, #text "helmet") or
          Text.contains(lower, #text "visor") or
          Text.contains(lower, #text "ultimate") or
          Text.contains(lower, #text "master") or
          Text.contains(lower, #text "diamond eyes")
        ) {
          65 + (hashText(d) % 16);
        }
        // Medium-high (50-65): Gaming focus
        else if (
          Text.contains(lower, #text "headphones") or
          Text.contains(lower, #text "game boy") or
          Text.contains(lower, #text "pixel") or
          Text.contains(lower, #text "snes") or
          Text.contains(lower, #text "gamer")
        ) {
          55 + (hashText(d) % 11);
        }
        // Medium (40-55): Standard drivers, colored, hair styles
        else if (
          Text.contains(lower, #text "blue") or
          Text.contains(lower, #text "green") or
          Text.contains(lower, #text "yellow") or
          Text.contains(lower, #text "purple") or
          Text.contains(lower, #text "tounge") or
          Text.contains(lower, #text "rabbit") or
          Text.contains(lower, #text "hair") or
          Text.contains(lower, #text "metal open") or
          Text.contains(lower, #text "red") or
          Text.contains(lower, #text "calculator") or
          Text.contains(lower, #text "gold colour") or
          Text.contains(lower, #text "circuits") or
          Text.contains(lower, #text "tri eye") or
          Text.contains(lower, #text "twin")
        ) {
          45 + (hashText(d) % 11);
        }
        // Low (30-45): Impaired, distracted
        else if (
          Text.contains(lower, #text "dead eyes") or
          Text.contains(lower, #text "eyes closed") or
          Text.contains(lower, #text "big eyes") or
          Text.contains(lower, #text "glitch")
        ) {
          35 + (hashText(d) % 11);
        } else {
          45 + (hashText(d) % 11);
        };
      };
      case null { 45 };
    };
  };

  // Body contribution to stability (30% weight) - Wide/low = stable
  private func categorizeBodyForStability(body : ?Text) : Nat {
    switch (body) {
      case (?b) {
        let lower = Text.toLowercase(b);
        // High stability (60-75): Wide, boxy, stable bases
        if (
          Text.contains(lower, #text "battle box") or
          Text.contains(lower, #text "command box") or
          Text.contains(lower, #text "mega controller") or
          Text.contains(lower, #text "beast") or
          Text.contains(lower, #text "iron") or
          Text.contains(lower, #text "ultimate")
        ) {
          65 + (hashText(b) % 11);
        }
        // Medium (45-60)
        else if (
          Text.contains(lower, #text "egg") or
          Text.contains(lower, #text "round") or
          Text.contains(lower, #text "frog") or
          Text.contains(lower, #text "rabbit")
        ) {
          50 + (hashText(b) % 11);
        }
        // Low (30-45): Wobbly, tall, unbalanced
        else if (
          Text.contains(lower, #text "balloon") or
          Text.contains(lower, #text "bubble") or
          Text.contains(lower, #text "tower") or
          Text.contains(lower, #text "spiky egg") or
          Text.contains(lower, #text "one tooth")
        ) {
          35 + (hashText(b) % 11);
        } else {
          45 + (hashText(b) % 11);
        };
      };
      case null { 50 };
    };
  };

  // Legs contribution to stability (20% weight) - Strong stance
  private func categorizeLegsForStability(legs : ?Text) : Nat {
    switch (legs) {
      case (?l) {
        let lower = Text.toLowercase(l);
        // High (55-70): Strong, stable stance
        if (
          Text.contains(lower, #text "strong") or
          Text.contains(lower, #text "power") or
          Text.contains(lower, #text "chunky") or
          Text.contains(lower, #text "industrial") or
          Text.contains(lower, #text "bird claw") or
          Text.contains(lower, #text "ultimate")
        ) {
          60 + (hashText(l) % 11);
        }
        // Medium (40-55)
        else if (
          Text.contains(lower, #text "midi") or
          Text.contains(lower, #text "8 bit") or
          Text.contains(lower, #text "cable") or
          Text.contains(lower, #text "bendy")
        ) {
          45 + (hashText(l) % 11);
        }
        // Low (30-45): Unstable
        else if (
          Text.contains(lower, #text "small") or
          Text.contains(lower, #text "balloon") or
          Text.contains(lower, #text "inflatable") or
          Text.contains(lower, #text "burnt") or
          Text.contains(lower, #text "slender")
        ) {
          35 + (hashText(l) % 11);
        } else {
          45 + (hashText(l) % 11);
        };
      };
      case null { 45 };
    };
  };

  // Arms contribution to stability (10% weight) - Balance assistance
  private func categorizeArmsForStability(arms : ?Text) : Nat {
    switch (arms) {
      case (?a) {
        let lower = Text.toLowercase(a);
        // High (50-65): Grippers, stabilizers
        if (
          Text.contains(lower, #text "power arms") or
          Text.contains(lower, #text "gripper") or
          Text.contains(lower, #text "claw") or
          Text.contains(lower, #text "strong")
        ) {
          55 + (hashText(a) % 11);
        }
        // Medium (40-55)
        else if (
          Text.contains(lower, #text "8 bit") or
          Text.contains(lower, #text "connector") or
          Text.contains(lower, #text "hands up")
        ) {
          45 + (hashText(a) % 11);
        }
        // Low (30-45)
        else {
          35 + (hashText(a) % 11);
        };
      };
      case null { 45 };
    };
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

  // Derive preferred distance from stats (lowered thresholds for more variety)
  public func derivePreferredDistance(powerCore : Nat, speed : Nat) : Distance {
    if (powerCore > 55 and speed < 50) {
      #LongTrek // High endurance, moderate speed
    } else if (speed > 55 and powerCore < 50) {
      #ShortSprint // High speed, lower endurance
    } else {
      #MediumHaul // Balanced
    };
  };

  // Derive preferred terrain from NFT metadata (Background trait)
  public func derivePreferredTerrain(metadata : [(Text, Text)]) : Terrain {
    // Look for Background trait to determine terrain preference
    let background = Array.find<(Text, Text)>(
      metadata,
      func(trait) { Text.toLowercase(trait.0) == "background" },
    );

    switch (background) {
      case (?(_, value)) {
        let bg = Text.toLowercase(value);

        // Map background colors to terrain types based on actual PokedBots backgrounds
        // All 26 values: grey, purple, mid blue, blue, light purple, dark purple, dark brown,
        // light blue, dark grey, dark blue, teal, grey blue, light grey, muted purple,
        // black stars, bones, brown, dark red grey, dark planets, grey planets, red,
        // black, muted yellow, muted red, green, master gold

        // Warm/sandy/earthy colors → WastelandSand (desert)
        if (
          Text.contains(bg, #text "brown") or
          Text.contains(bg, #text "red") or
          Text.contains(bg, #text "yellow") or
          Text.contains(bg, #text "bones")
        ) {
          #WastelandSand;
        };
        // Cool/tech/metallic colors → MetalRoads (highways/cities)
        else if (
          Text.contains(bg, #text "blue") or
          Text.contains(bg, #text "purple") or
          Text.contains(bg, #text "grey") or
          Text.contains(bg, #text "gray") or
          Text.contains(bg, #text "teal")
        ) {
          #MetalRoads;
        };
        // Dark/space/natural colors → ScrapHeaps (junkyards)
        else if (
          Text.contains(bg, #text "black") or
          Text.contains(bg, #text "green") or
          Text.contains(bg, #text "planet") or
          Text.contains(bg, #text "stars") or
          Text.contains(bg, #text "gold")
        ) {
          #ScrapHeaps;
        };
        // Fallback (shouldn't happen with 26 known values)
        else {
          let hash = hashText(bg);
          let choice = hash % 3;
          if (choice == 0) { #ScrapHeaps } else if (choice == 1) { #MetalRoads } else {
            #WastelandSand;
          };
        };
      };
      case null {
        // Fallback: hash all metadata keys for deterministic variety
        var combinedHash : Nat = 0;
        for ((key, value) in metadata.vals()) {
          combinedHash := (combinedHash + hashText(key) + hashText(value)) % 1000000;
        };
        let choice = combinedHash % 3;
        if (choice == 0) { #ScrapHeaps } else if (choice == 1) { #MetalRoads } else {
          #WastelandSand;
        };
      };
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
        preferredTerrain = switch (metadata) {
          case (?traits) { derivePreferredTerrain(traits) };
          case null {
            // Fallback: derive from token index hash
            let hash = hashNat(tokenIndex);
            let choice = hash % 3;
            if (choice == 0) { #ScrapHeaps } else if (choice == 1) {
              #MetalRoads;
            } else { #WastelandSand };
          };
        };

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

          // Base decay amounts (adjusted for hourly decay - 1/24th of daily amounts)
          let conditionLoss = Nat.min(stats.condition, Int.abs(Float.toInt(0.21 * decayMultiplier))); // ~5 per day
          let calibrationLoss = Nat.min(stats.calibration, Int.abs(Float.toInt(0.125 * decayMultiplier))); // ~3 per day

          // Check if bot hasn't been recharged in 48 hours (extra condition penalty - 1 point per hour when overdue)
          let extraConditionLoss = switch (stats.lastRecharged) {
            case (?lastTime) {
              let hoursSinceRecharge = (now - lastTime) / 3_600_000_000_000; // Convert ns to hours
              if (hoursSinceRecharge > 48) { 1 } else { 0 }; // 1 per hour = 24 per day when overdue
            };
            case (null) {
              // Never recharged, apply penalty if bot is old
              let hoursSinceActivation = (now - stats.activatedAt) / 3_600_000_000_000;
              if (hoursSinceActivation > 48) { 1 } else { 0 };
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

    // Apply decay to all bots (called by hourly timer)
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
        sponsors = [];
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

    // Check if a bot is in any active race (Upcoming or InProgress)
    public func isInActiveRace(tokenIndex : Nat) : Bool {
      let allRaces = getAllRaces();
      let activeRace = Array.find<Race>(
        allRaces,
        func(r) {
          // Only check races that are active (Upcoming or InProgress)
          let isActive = switch (r.status) {
            case (#Upcoming) { true };
            case (#InProgress) { true };
            case (_) { false };
          };

          if (not isActive) { return false };

          // Check if bot is in this race's entries
          let hasEntry = Array.find<RaceEntry>(
            r.entries,
            func(e) { e.tokenIndex == tokenIndex },
          );

          Option.isSome(hasEntry);
        },
      );

      Option.isSome(activeRace);
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

    // Add a sponsor to a race
    public func addSponsor(raceId : Nat, sponsor : Principal, amount : Nat, message : ?Text) : ?Race {
      switch (getRace(raceId)) {
        case (?race) {
          // Only allow sponsoring Upcoming races
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
          let newTax = (newPrizePool * 5) / 100; // Recalculate 5% tax

          let updatedRace = {
            race with
            sponsors = newSponsors;
            prizePool = newPrizePool;
            silentKlanTax = newTax;
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
