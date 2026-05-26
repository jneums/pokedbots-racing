import Map "mo:map/Map";
import { nhash; thash } "mo:map/Map";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Result "mo:base/Result";

module {
  // ==========================================
  // GEAR SYSTEM
  // ==========================================
  // WoW-inspired gear/loot system that replaces direct stat upgrades.
  // Bots equip gear in 6 slots that provide stat bonuses and passive effects.
  // Gear drops from race finishes, with rarity/type determined by event tier and terrain.
  //
  // Slots: Legs, Thruster, Chassis, Gyro, Core, Module
  // Rarity: Common, Uncommon, Rare, Epic, Legendary
  // Categories: Standard (70%), Unique (25%), Named (5%)
  //
  // Item Level (ilvl) increases each season — old gear is never removed,
  // just naturally outpaced by higher-ilvl drops.
  // ==========================================

  // ===== ILVL FROM SEASON =====
  // Derives item level from season ID (YYYYS format).
  // Base season 20261 (2026 Winter) = ilvl 1, each subsequent season +1.
  public func ilvlFromSeason(seasonId : Nat) : Nat {
    let year = seasonId / 10;
    let quarter = seasonId % 10;
    let baseYear = 2026;
    let baseQuarter = 1;
    let elapsed : Int = (year - baseYear) * 4 + (quarter - baseQuarter);
    if (elapsed < 0) { 1 } else { Int.abs(elapsed) + 1 };
  };

  // ===== ENUMS =====

  public type GearSlot = {
    #Legs; // Primary: Speed
    #Thruster; // Primary: Acceleration
    #Chassis; // Primary: Stability
    #Gyro; // Primary: Stability / Acceleration
    #Core; // Primary: PowerCore
    #Module; // Wildcard — any stat
  };

  public type GearRarity = {
    #Common;
    #Uncommon;
    #Rare;
    #Epic;
    #Legendary;
  };

  public type GearCategory = {
    #Standard; // Pure stat budget, no passive
    #Unique; // Lower stats + passive effect
    #Named; // Strong stats + powerful passive (special events only)
  };

  public type TerrainTag = {
    #ScrapHeaps;
    #WastelandSand;
    #MetalRoads;
    #Universal; // Fits any terrain, no bonus
  };

  // ===== PASSIVE EFFECTS =====
  // Passives trigger during race simulation under specific conditions.

  public type PassiveEffect = {
    #SlipstreamBoost : { extraPercent : Float }; // Extra slipstream bonus when drafting
    #ComebackKid : { boostPercent : Float }; // Bonus when in last place
    #FastStarter : { segmentCount : Nat; boostPercent : Float }; // Bonus for first N segments
    #TerrainMastery : { terrain : TerrainTag; boostPercent : Float }; // Bonus on matching terrain
    #SteadyPace : { varianceReduction : Float }; // Reduced performance variance
    #LuckAmplifier : { procChanceBonus : Float }; // Increased luck proc chance
    #Ironclad : { badLuckReduction : Float }; // Reduced bad luck penalty
    #FinalSurge : { segmentCount : Nat; boostPercent : Float }; // Bonus for last N segments
    #RubberBandResist : { resistPercent : Float }; // Resist rubber-band slowdown when leading
    #UphillGrinder : { boostPercent : Float }; // Bonus on uphill (positive angle) segments
    #DownhillDaredevil : { boostPercent : Float }; // Bonus on downhill (negative angle) segments
    #PackRunner : { boostPercent : Float }; // Bonus when within 1s of 2+ other bots
  };

  // ===== CONSUMABLES =====
  // One-shot items equipped before a race. Consumed when trigger fires.

  public type ConsumableTrigger = {
    #OnRaceStart; // Fires at segment 0
    #OnLastPlace; // Fires when bot enters last place
    #OnOvertaken; // Fires when bot is passed by another
    #OnFinalLap; // Fires at start of last lap
    #OnLuckProc; // Fires when a luck proc triggers
    #OnBadLuck; // Fires when a bad luck event happens
    #OnLeadChange; // Fires when bot takes the lead
  };

  public type ConsumableEffect = {
    #NitroBoost : { boostPercent : Float; durationSegments : Nat }; // Raw speed boost
    #ShieldPlating : { badLuckImmunitySegments : Nat }; // Blocks bad luck events
    #OverclockPulse : { statBoost : Nat; durationSegments : Nat }; // Flat bonus to all stats
    #TerrainAdapt : { durationSegments : Nat }; // Nullify terrain penalties
    #LuckSurge : { guaranteedProcType : Text }; // Force a luck proc (Minor/Major)
  };

  public type ConsumableType = {
    consumableId : Text; // e.g., "nitro_basic", "shield_mk2"
    name : Text;
    description : Text;
    rarity : GearRarity;
    trigger : ConsumableTrigger;
    effect : ConsumableEffect;
    ilvl : Nat;
  };

  // ===== GEAR PIECE =====

  public type GearPiece = {
    gearId : Nat; // Globally unique ID
    name : Text; // Display name (e.g., "Rusty Sprinter Legs", "Hand of the Machine God")
    description : Text;
    slot : GearSlot;
    rarity : GearRarity;
    category : GearCategory;
    terrainTag : TerrainTag;
    ilvl : Nat; // Item level — higher = better stat budget
    season : Nat; // Season when this gear was created

    // Stat bonuses (Standard: full budget; Unique: ~60-70% budget; Named: ~90-100% budget)
    speedBonus : Nat;
    powerCoreBonus : Nat;
    accelerationBonus : Nat;
    stabilityBonus : Nat;
    luckBonus : Nat;

    // Optional passive (Unique and Named only)
    passive : ?PassiveEffect;

    // Soulbound: gear is permanently bound to the bot that earned it
    boundToBot : Nat; // tokenIndex of the bot this gear is bound to

    // Metadata
    sourceRaceId : ?Nat; // Which race dropped this (null for crafted/migrated)
    sourceEventType : ?Text; // "daily", "weekly", "monthly", "special"
    craftedFrom : ?[Nat]; // gearIds used in crafting (null if dropped)
    createdAt : Int;
  };

  // ===== BOT LOADOUT =====

  public type BotLoadout = {
    tokenIndex : Nat;
    legs : ?Nat; // gearId or null (empty slot)
    thruster : ?Nat;
    chassis : ?Nat;
    gyro : ?Nat;
    core : ?Nat;
    module_ : ?Nat; // "module" is a Motoko keyword, so we use module_
    consumable1 : ?Nat; // consumableId (consumed after race)
    consumable2 : ?Nat;
    lastModified : Int;
  };

  // ===== PLAYER INVENTORY =====

  public type PlayerGearInventory = {
    gear : [Nat]; // Array of gearIds owned
    consumables : [Nat]; // Array of consumable instance IDs owned
  };

  // ===== CONSUMABLE INSTANCE =====

  public type ConsumableInstance = {
    instanceId : Nat; // Globally unique
    consumableType : ConsumableType;
    owner : Principal;
    createdAt : Int;
  };

  // ===== LOOT TABLE CONFIG =====

  // Drop rates by event tier (ceiling rarity)
  // Daily Sprint: ceiling Rare (85% Common, 13% Uncommon, 2% Rare)
  // Weekly League: ceiling Epic (45% Common, 30% Uncommon, 18% Rare, 7% Epic)
  // Monthly Cup: guaranteed Rare+ (0% miss, 12% Uncommon, 45% Rare, 35% Epic, 8% Legendary)
  // Special Event: Legendary eligible (60% Common, 25% Uncommon, 10% Rare, 4% Epic, 1% Legendary)

  public type EventTier = {
    #Free; // Free races — always Common, always Standard (no passives)
    #Daily;
    #Weekly;
    #Monthly;
    #Special;
  };

  // ===== STAT BUDGET BY RARITY AND ILVL =====
  // Base budget at ilvl 1. Each ilvl adds +1 to total budget.
  // Common: 3, Uncommon: 5, Rare: 8, Epic: 12, Legendary: 16

  public func getStatBudget(rarity : GearRarity, ilvl : Nat) : Nat {
    let base : Nat = switch (rarity) {
      case (#Common) { 3 };
      case (#Uncommon) { 5 };
      case (#Rare) { 8 };
      case (#Epic) { 12 };
      case (#Legendary) { 16 };
    };
    base + (ilvl - 1); // ilvl 1 = base, ilvl 2 = base+1, etc.
  };

  // Category budget multiplier (what fraction of stat budget is used for stats)
  // Standard: 100%, Unique: 65%, Named: 95%
  public func getCategoryStatMultiplier(category : GearCategory) : Float {
    switch (category) {
      case (#Standard) { 1.0 };
      case (#Unique) { 0.65 };
      case (#Named) { 0.95 };
    };
  };

  // ===== GEAR MANAGER =====

  public class GearManager(
    gearMap : Map.Map<Nat, GearPiece>,
    loadoutMap : Map.Map<Nat, BotLoadout>,
    playerInventoryMap : Map.Map<Principal, PlayerGearInventory>,
    consumableMap : Map.Map<Nat, ConsumableInstance>,
    nextGearIdRef : { get : () -> Nat; set : (Nat) -> () },
    nextConsumableIdRef : { get : () -> Nat; set : (Nat) -> () },
  ) {

    // ===== ID GENERATION =====

    func nextGearId() : Nat {
      let id = nextGearIdRef.get();
      nextGearIdRef.set(id + 1);
      id;
    };

    func nextConsumableId() : Nat {
      let id = nextConsumableIdRef.get();
      nextConsumableIdRef.set(id + 1);
      id;
    };

    // ===== GEAR CRUD =====

    public func getGearPiece(gearId : Nat) : ?GearPiece {
      Map.get(gearMap, nhash, gearId);
    };

    public func getLoadout(tokenIndex : Nat) : BotLoadout {
      switch (Map.get(loadoutMap, nhash, tokenIndex)) {
        case (?loadout) { loadout };
        case (null) {
          let empty : BotLoadout = {
            tokenIndex = tokenIndex;
            legs = null;
            thruster = null;
            chassis = null;
            gyro = null;
            core = null;
            module_ = null;
            consumable1 = null;
            consumable2 = null;
            lastModified = Time.now();
          };
          empty;
        };
      };
    };

    public func getPlayerInventory(owner : Principal) : PlayerGearInventory {
      switch (Map.get(playerInventoryMap, Map.phash, owner)) {
        case (?inv) { inv };
        case (null) { { gear = []; consumables = [] } };
      };
    };

    public func setLoadout(tokenIndex : Nat, loadout : BotLoadout) {
      Map.set(loadoutMap, nhash, tokenIndex, loadout);
    };

    // ===== EQUIP / UNEQUIP =====

    /// Equip a gear piece to a bot. Returns #ok or #err with reason.
    public func equipGear(owner : Principal, tokenIndex : Nat, gearId : Nat) : Result.Result<BotLoadout, Text> {
      // Verify gear exists
      let gear = switch (getGearPiece(gearId)) {
        case (?g) { g };
        case (null) { return #err("Gear not found") };
      };

      // Verify ownership
      let inv = getPlayerInventory(owner);
      let owned = Array.find<Nat>(inv.gear, func(id : Nat) : Bool { id == gearId });
      switch (owned) {
        case (null) { return #err("You don't own this gear") };
        case (_) {};
      };

      // Enforce soulbound: gear can only be equipped on the bot that earned it
      if (gear.boundToBot != tokenIndex) {
        return #err("This gear is soulbound to bot #" # Nat.toText(gear.boundToBot) # " and cannot be equipped on bot #" # Nat.toText(tokenIndex));
      };

      // Get current loadout and update the matching slot
      var loadout = getLoadout(tokenIndex);
      loadout := switch (gear.slot) {
        case (#Legs) {
          { loadout with legs = ?gearId; lastModified = Time.now() };
        };
        case (#Thruster) {
          { loadout with thruster = ?gearId; lastModified = Time.now() };
        };
        case (#Chassis) {
          { loadout with chassis = ?gearId; lastModified = Time.now() };
        };
        case (#Gyro) {
          { loadout with gyro = ?gearId; lastModified = Time.now() };
        };
        case (#Core) {
          { loadout with core = ?gearId; lastModified = Time.now() };
        };
        case (#Module) {
          { loadout with module_ = ?gearId; lastModified = Time.now() };
        };
      };

      Map.set(loadoutMap, nhash, tokenIndex, loadout);
      #ok(loadout);
    };

    /// Unequip a slot on a bot. Returns the updated loadout.
    public func unequipSlot(owner : Principal, tokenIndex : Nat, slot : GearSlot) : Result.Result<BotLoadout, Text> {
      var loadout = getLoadout(tokenIndex);
      loadout := switch (slot) {
        case (#Legs) { { loadout with legs = null; lastModified = Time.now() } };
        case (#Thruster) {
          { loadout with thruster = null; lastModified = Time.now() };
        };
        case (#Chassis) {
          { loadout with chassis = null; lastModified = Time.now() };
        };
        case (#Gyro) { { loadout with gyro = null; lastModified = Time.now() } };
        case (#Core) { { loadout with core = null; lastModified = Time.now() } };
        case (#Module) {
          { loadout with module_ = null; lastModified = Time.now() };
        };
      };

      Map.set(loadoutMap, nhash, tokenIndex, loadout);
      #ok(loadout);
    };

    // ===== GEAR STAT TOTALS =====

    /// Calculate total stat bonuses from all equipped gear on a bot.
    public func getGearStatBonuses(tokenIndex : Nat) : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
      luck : Nat;
    } {
      let loadout = getLoadout(tokenIndex);
      var speed : Nat = 0;
      var powerCore : Nat = 0;
      var acceleration : Nat = 0;
      var stability : Nat = 0;
      var luck : Nat = 0;

      let equippedIds = [loadout.legs, loadout.thruster, loadout.chassis, loadout.gyro, loadout.core, loadout.module_];
      for (maybeId in equippedIds.vals()) {
        switch (maybeId) {
          case (?gearId) {
            switch (getGearPiece(gearId)) {
              case (?gear) {
                speed += gear.speedBonus;
                powerCore += gear.powerCoreBonus;
                acceleration += gear.accelerationBonus;
                stability += gear.stabilityBonus;
                luck += gear.luckBonus;
              };
              case (null) {}; // Stale reference — gear was deleted/consumed
            };
          };
          case (null) {};
        };
      };

      { speed; powerCore; acceleration; stability; luck };
    };

    /// Get all passive effects from equipped gear on a bot.
    public func getEquippedPassives(tokenIndex : Nat) : [PassiveEffect] {
      let loadout = getLoadout(tokenIndex);
      let passives = Buffer.Buffer<PassiveEffect>(6);

      let equippedIds = [loadout.legs, loadout.thruster, loadout.chassis, loadout.gyro, loadout.core, loadout.module_];
      for (maybeId in equippedIds.vals()) {
        switch (maybeId) {
          case (?gearId) {
            switch (getGearPiece(gearId)) {
              case (?gear) {
                switch (gear.passive) {
                  case (?p) { passives.add(p) };
                  case (null) {};
                };
              };
              case (null) {};
            };
          };
          case (null) {};
        };
      };

      Buffer.toArray(passives);
    };

    // ===== LOOT GENERATION =====

    /// Generate a gear drop from a race finish.
    /// `seed` provides deterministic randomness (e.g., raceId * 1000 + position * 7 + tokenIndex).
    /// `terrain` determines the terrain tag of the dropped gear.
    /// `eventTier` determines the rarity ceiling.
    /// `season` and `ilvl` determine the power level.
    /// `raceId` tags the gear with the source race (null for crafted/migrated).
    public func generateLootDrop(
      owner : Principal,
      tokenIndex : Nat,
      seed : Nat,
      terrain : TerrainTag,
      eventTier : EventTier,
      season : Nat,
      ilvl : Nat,
      raceId : ?Nat,
    ) : ?GearPiece {
      // Miss chance: some races drop nothing
      // Now guaranteed drops for all tiers (gear is soulbound)
      let missRoll = pseudoRandom(seed, 0); // 0-9999
      let missThreshold = switch (eventTier) {
        case (#Free) { 0 };
        case (#Daily) { 0 };
        case (#Weekly) { 0 };
        case (#Monthly) { 0 };
        case (#Special) { 0 };
      };
      if (missRoll < missThreshold) {
        return null;
      };

      // Step 1: Determine rarity
      let rarity = rollRarity(seed, eventTier);

      // Step 2: Determine category (Standard 70%, Unique 25%, Named 5% — Named only from Special)
      let category = rollCategory(seed / 7, eventTier);

      // Step 3: Determine slot
      let slot = rollSlot(seed / 13);

      // Step 4: Calculate stat budget and distribute
      let totalBudget = getStatBudget(rarity, ilvl);
      let statMultiplier = getCategoryStatMultiplier(category);
      let effectiveBudget = Int.abs(Float.toInt(Float.fromInt(totalBudget) * statMultiplier));

      let stats = distributeStats(seed / 17, slot, terrain, effectiveBudget);

      // Step 5: Roll passive for Unique/Named
      let passive = switch (category) {
        case (#Standard) { null };
        case (#Unique) { ?rollPassive(seed / 23, slot, rarity) };
        case (#Named) { ?rollPassive(seed / 29, slot, rarity) };
      };

      // Step 6: Generate name
      let name = generateGearName(category, rarity, slot, terrain);

      let gearId = nextGearId();
      let gear : GearPiece = {
        gearId = gearId;
        name = name;
        description = "";
        slot = slot;
        rarity = rarity;
        category = category;
        terrainTag = terrain;
        ilvl = ilvl;
        season = season;
        speedBonus = stats.speed;
        powerCoreBonus = stats.powerCore;
        accelerationBonus = stats.acceleration;
        stabilityBonus = stats.stability;
        luckBonus = stats.luck;
        passive = passive;
        boundToBot = tokenIndex;
        sourceRaceId = raceId;
        sourceEventType = null;
        craftedFrom = null;
        createdAt = Time.now();
      };

      // Store the gear
      Map.set(gearMap, nhash, gearId, gear);

      // Add to player inventory
      let inv = getPlayerInventory(owner);
      let newGearList = Array.append(inv.gear, [gearId]);
      Map.set(playerInventoryMap, Map.phash, owner, { inv with gear = newGearList });

      ?gear;
    };

    /// Generate a full set of Uncommon starter gear (one per slot) for a new starter bot.
    /// Returns the array of created gear pieces.
    public func generateStarterKit(
      owner : Principal,
      tokenIndex : Nat,
      seed : Nat,
    ) : [GearPiece] {
      let slots : [GearSlot] = [#Legs, #Thruster, #Chassis, #Gyro, #Core, #Module];
      let terrains : [TerrainTag] = [#WastelandSand, #MetalRoads, #ScrapHeaps, #Universal, #ScrapHeaps, #MetalRoads];
      let buf = Buffer.Buffer<GearPiece>(6);

      var i = 0;
      for (slot in slots.vals()) {
        let terrain = terrains[i];
        let pieceSeed = seed + i * 7919; // Unique seed per slot
        let ilvl = 1;
        let totalBudget = getStatBudget(#Uncommon, ilvl); // 5 stat points
        let stats = distributeStats(pieceSeed / 17, slot, terrain, totalBudget);
        let name = generateGearName(#Standard, #Uncommon, slot, terrain);

        let gearId = nextGearId();
        let gear : GearPiece = {
          gearId = gearId;
          name = name;
          description = "Starter kit gear for new racers.";
          slot = slot;
          rarity = #Uncommon;
          category = #Standard;
          terrainTag = terrain;
          ilvl = ilvl;
          season = 1;
          speedBonus = stats.speed;
          powerCoreBonus = stats.powerCore;
          accelerationBonus = stats.acceleration;
          stabilityBonus = stats.stability;
          luckBonus = stats.luck;
          passive = null;
          boundToBot = tokenIndex;
          sourceRaceId = null;
          sourceEventType = ?"starter_kit";
          craftedFrom = null;
          createdAt = Time.now();
        };

        // Store the gear
        Map.set(gearMap, nhash, gearId, gear);

        // Add to player inventory
        let inv = getPlayerInventory(owner);
        let newGearList = Array.append(inv.gear, [gearId]);
        Map.set(playerInventoryMap, Map.phash, owner, { inv with gear = newGearList });

        buf.add(gear);
        i += 1;
      };

      Buffer.toArray(buf);
    };

    // ===== CRAFTING =====

    /// Combine 3 gear pieces of the same slot into 1 gear of one rarity tier higher.
    /// All 3 must be same slot, same rarity, and bound to the same bot.
    /// The crafted gear inherits the soulbound binding.
    public func craftGear(
      owner : Principal,
      tokenIndex : Nat,
      gearIds : [Nat],
      season : Nat,
      ilvl : Nat,
      seed : Nat,
    ) : Result.Result<GearPiece, Text> {
      if (gearIds.size() != 3) {
        return #err("Exactly 3 gear pieces required");
      };

      // Fetch all three
      let pieces = Buffer.Buffer<GearPiece>(3);
      var idx : Nat = 0;
      for (id in gearIds.vals()) {
        idx += 1;
        switch (getGearPiece(id)) {
          case (?g) { pieces.add(g) };
          case (null) { return #err("Gear " # Nat.toText(idx) # " not found") };
        };
      };
      let g1 = pieces.get(0);

      // Verify ownership
      let inv = getPlayerInventory(owner);
      for (id in gearIds.vals()) {
        let found = Array.find<Nat>(inv.gear, func(gid : Nat) : Bool { gid == id });
        switch (found) {
          case (null) { return #err("You don't own gear #" # Nat.toText(id)) };
          case (_) {};
        };
      };

      // Must be same slot
      for (i in Iter.range(1, 2)) {
        if (not sameSlot(g1.slot, pieces.get(i).slot)) {
          return #err("All three gear pieces must be the same slot");
        };
      };

      // Must be same rarity
      for (i in Iter.range(1, 2)) {
        if (not sameRarity(g1.rarity, pieces.get(i).rarity)) {
          return #err("All three gear pieces must be the same rarity");
        };
      };

      // Must all be bound to the same bot (the target bot)
      for (i in Iter.range(0, 2)) {
        if (pieces.get(i).boundToBot != tokenIndex) {
          return #err("All gear must be bound to bot #" # Nat.toText(tokenIndex) # ", but piece #" # Nat.toText(i + 1) # " is bound to bot #" # Nat.toText(pieces.get(i).boundToBot));
        };
      };

      // Can't craft above Legendary
      let nextRarity = switch (g1.rarity) {
        case (#Common) { #Uncommon };
        case (#Uncommon) { #Rare };
        case (#Rare) { #Epic };
        case (#Epic) { #Legendary };
        case (#Legendary) { return #err("Cannot craft above Legendary") };
      };

      // Check none are equipped
      for (id in gearIds.vals()) {
        if (isGearEquipped(id)) {
          return #err("Gear #" # Nat.toText(id) # " is currently equipped — unequip it first");
        };
      };

      // Remove the 3 source gear pieces from inventory and map
      let idSet = Array.freeze(Array.thaw<Nat>(gearIds));
      let filteredGear = Array.filter<Nat>(
        inv.gear,
        func(gid : Nat) : Bool {
          Option.isNull(Array.find<Nat>(idSet, func(id : Nat) : Bool { id == gid }));
        },
      );
      Map.set(playerInventoryMap, Map.phash, owner, { inv with gear = filteredGear });
      for (id in gearIds.vals()) {
        Map.delete(gearMap, nhash, id);
      };

      // Generate the new crafted gear
      let category = rollCategory(seed, #Weekly); // Crafted gear uses Weekly table (no Named)
      let totalBudget = getStatBudget(nextRarity, ilvl);
      let statMultiplier = getCategoryStatMultiplier(category);
      let effectiveBudget = Int.abs(Float.toInt(Float.fromInt(totalBudget) * statMultiplier));
      let stats = distributeStats(seed / 17, g1.slot, g1.terrainTag, effectiveBudget);

      let passive = switch (category) {
        case (#Standard) { null };
        case (#Unique) { ?rollPassive(seed / 23, g1.slot, nextRarity) };
        case (#Named) { ?rollPassive(seed / 29, g1.slot, nextRarity) };
      };

      let name = generateGearName(category, nextRarity, g1.slot, g1.terrainTag);

      let gearId = nextGearId();
      let newGear : GearPiece = {
        gearId = gearId;
        name = name;
        description = "Crafted from 3 " # rarityToText(g1.rarity) # " pieces";
        slot = g1.slot;
        rarity = nextRarity;
        category = category;
        terrainTag = g1.terrainTag; // Inherits terrain from first material
        ilvl = ilvl;
        season = season;
        speedBonus = stats.speed;
        powerCoreBonus = stats.powerCore;
        accelerationBonus = stats.acceleration;
        stabilityBonus = stats.stability;
        luckBonus = stats.luck;
        passive = passive;
        boundToBot = tokenIndex; // Crafted gear inherits soulbound from source pieces
        sourceRaceId = null;
        sourceEventType = null;
        craftedFrom = ?gearIds;
        createdAt = Time.now();
      };

      Map.set(gearMap, nhash, gearId, newGear);

      // Add to player inventory
      let currentInv = getPlayerInventory(owner);
      Map.set(
        playerInventoryMap,
        Map.phash,
        owner,
        {
          currentInv with gear = Array.append(currentInv.gear, [gearId])
        },
      );

      #ok(newGear);
    };

    // ===== CONSUMABLE MANAGEMENT =====

    public func grantConsumable(owner : Principal, consumableType : ConsumableType) : ConsumableInstance {
      let instanceId = nextConsumableId();
      let instance : ConsumableInstance = {
        instanceId = instanceId;
        consumableType = consumableType;
        owner = owner;
        createdAt = Time.now();
      };
      Map.set(consumableMap, nhash, instanceId, instance);

      let inv = getPlayerInventory(owner);
      Map.set(
        playerInventoryMap,
        Map.phash,
        owner,
        {
          inv with consumables = Array.append(inv.consumables, [instanceId])
        },
      );

      instance;
    };

    public func getConsumableInstance(instanceId : Nat) : ?ConsumableInstance {
      Map.get(consumableMap, nhash, instanceId);
    };

    /// Equip a consumable to a bot's slot (1 or 2).
    public func equipConsumable(owner : Principal, tokenIndex : Nat, instanceId : Nat, slot : Nat) : Result.Result<BotLoadout, Text> {
      if (slot != 1 and slot != 2) {
        return #err("Consumable slot must be 1 or 2");
      };

      // Verify ownership
      let inv = getPlayerInventory(owner);
      let found = Array.find<Nat>(inv.consumables, func(id : Nat) : Bool { id == instanceId });
      switch (found) {
        case (null) { return #err("You don't own this consumable") };
        case (_) {};
      };

      var loadout = getLoadout(tokenIndex);
      loadout := if (slot == 1) {
        { loadout with consumable1 = ?instanceId; lastModified = Time.now() };
      } else {
        { loadout with consumable2 = ?instanceId; lastModified = Time.now() };
      };

      Map.set(loadoutMap, nhash, tokenIndex, loadout);
      #ok(loadout);
    };

    /// Consume (remove) consumables from a bot's loadout after a race.
    /// Returns the consumed instances for processing during the race.
    public func consumeLoadoutConsumables(tokenIndex : Nat) : [ConsumableInstance] {
      let loadout = getLoadout(tokenIndex);
      let consumed = Buffer.Buffer<ConsumableInstance>(2);

      // Gather and clear
      let slots = [loadout.consumable1, loadout.consumable2];
      for (maybeId in slots.vals()) {
        switch (maybeId) {
          case (?instanceId) {
            switch (Map.get(consumableMap, nhash, instanceId)) {
              case (?inst) {
                consumed.add(inst);
                // Remove from consumable map
                Map.delete(consumableMap, nhash, instanceId);
                // Remove from player inventory
                let inv = getPlayerInventory(inst.owner);
                let filtered = Array.filter<Nat>(inv.consumables, func(id : Nat) : Bool { id != instanceId });
                Map.set(playerInventoryMap, Map.phash, inst.owner, { inv with consumables = filtered });
              };
              case (null) {};
            };
          };
          case (null) {};
        };
      };

      // Clear consumable slots on the loadout
      let clearedLoadout = {
        loadout with consumable1 = null;
        consumable2 = null;
        lastModified = Time.now();
      };
      Map.set(loadoutMap, nhash, tokenIndex, clearedLoadout);

      Buffer.toArray(consumed);
    };

    // ===== QUERY HELPERS =====

    /// Get all gear owned by a player, fully resolved.
    public func getPlayerGear(owner : Principal) : [GearPiece] {
      let inv = getPlayerInventory(owner);
      let result = Buffer.Buffer<GearPiece>(inv.gear.size());
      for (gearId in inv.gear.vals()) {
        switch (getGearPiece(gearId)) {
          case (?g) { result.add(g) };
          case (null) {}; // Stale entry
        };
      };
      Buffer.toArray(result);
    };

    /// Get full loadout with resolved gear details for a bot.
    public func getResolvedLoadout(tokenIndex : Nat) : {
      tokenIndex : Nat;
      legs : ?GearPiece;
      thruster : ?GearPiece;
      chassis : ?GearPiece;
      gyro : ?GearPiece;
      core : ?GearPiece;
      module_ : ?GearPiece;
      consumable1 : ?ConsumableInstance;
      consumable2 : ?ConsumableInstance;
    } {
      let loadout = getLoadout(tokenIndex);
      func resolveGear(maybeId : ?Nat) : ?GearPiece {
        switch (maybeId) {
          case (?id) { getGearPiece(id) };
          case (null) { null };
        };
      };
      func resolveConsumable(maybeId : ?Nat) : ?ConsumableInstance {
        switch (maybeId) {
          case (?id) { getConsumableInstance(id) };
          case (null) { null };
        };
      };
      {
        tokenIndex = tokenIndex;
        legs = resolveGear(loadout.legs);
        thruster = resolveGear(loadout.thruster);
        chassis = resolveGear(loadout.chassis);
        gyro = resolveGear(loadout.gyro);
        core = resolveGear(loadout.core);
        module_ = resolveGear(loadout.module_);
        consumable1 = resolveConsumable(loadout.consumable1);
        consumable2 = resolveConsumable(loadout.consumable2);
      };
    };

    /// Get total gear count across all players.
    public func getTotalGearCount() : Nat {
      Map.size(gearMap);
    };

    // ===== INTERNAL HELPERS =====

    func isGearEquipped(gearId : Nat) : Bool {
      for ((_, loadout) in Map.entries(loadoutMap)) {
        let slots = [loadout.legs, loadout.thruster, loadout.chassis, loadout.gyro, loadout.core, loadout.module_];
        for (slot in slots.vals()) {
          switch (slot) {
            case (?equipped) { if (equipped == gearId) { return true } };
            case (null) {};
          };
        };
      };
      false;
    };

    func sameSlot(a : GearSlot, b : GearSlot) : Bool {
      switch (a, b) {
        case (#Legs, #Legs) { true };
        case (#Thruster, #Thruster) { true };
        case (#Chassis, #Chassis) { true };
        case (#Gyro, #Gyro) { true };
        case (#Core, #Core) { true };
        case (#Module, #Module) { true };
        case (_, _) { false };
      };
    };

    func sameRarity(a : GearRarity, b : GearRarity) : Bool {
      switch (a, b) {
        case (#Common, #Common) { true };
        case (#Uncommon, #Uncommon) { true };
        case (#Rare, #Rare) { true };
        case (#Epic, #Epic) { true };
        case (#Legendary, #Legendary) { true };
        case (_, _) { false };
      };
    };

    // ===== RNG HELPERS =====
    // MurmurHash3-style bit mixing for good distribution from deterministic seeds.

    func pseudoRandom(seed : Nat, salt : Nat) : Nat {
      // Combine seed and salt, then apply MurmurHash3 64-bit finalizer
      let s = Nat64.fromNat(seed % 0x10000000000000000);
      let a = Nat64.fromNat(salt % 0x10000000000000000);
      var h : Nat64 = s *% 6364136223846793005 +% a *% 1442695040888963407;
      h := Nat64.bitxor(h, h >> 33);
      h := h *% 0xff51afd7ed558ccd;
      h := Nat64.bitxor(h, h >> 33);
      h := h *% 0xc4ceb9fe1a85ec53;
      h := Nat64.bitxor(h, h >> 33);
      Nat64.toNat(h) % 10000; // Returns 0-9999
    };

    func rollRarity(seed : Nat, eventTier : EventTier) : GearRarity {
      let roll = pseudoRandom(seed, 1); // 0-9999

      switch (eventTier) {
        case (#Free) {
          // Free races: mostly Common with a small Uncommon chance (85% Common, 15% Uncommon)
          if (roll < 8500) { #Common } else { #Uncommon };
        };
        case (#Daily) {
          // Ceiling: Rare (50% Common, 35% Uncommon, 15% Rare)
          if (roll < 5000) { #Common } else if (roll < 8500) { #Uncommon } else {
            #Rare;
          };
        };
        case (#Weekly) {
          // Ceiling: Epic (45% Common, 30% Uncommon, 18% Rare, 7% Epic)
          if (roll < 4500) { #Common } else if (roll < 7500) { #Uncommon } else if (roll < 9300) {
            #Rare;
          } else { #Epic };
        };
        case (#Monthly) {
          // Guaranteed Rare minimum (0% Common, 12% Uncommon, 45% Rare, 35% Epic, 8% Legendary)
          if (roll < 1200) { #Uncommon } else if (roll < 5700) {
            #Rare;
          } else if (roll < 9200) { #Epic } else { #Legendary };
        };
        case (#Special) {
          // Legendary eligible but rare (60% Common, 25% Uncommon, 10% Rare, 4% Epic, 1% Legendary)
          if (roll < 6000) { #Common } else if (roll < 8500) { #Uncommon } else if (roll < 9500) {
            #Rare;
          } else if (roll < 9900) { #Epic } else { #Legendary };
        };
      };
    };

    func rollCategory(seed : Nat, eventTier : EventTier) : GearCategory {
      let roll = pseudoRandom(seed, 2); // 0-9999

      // Named only from Special events
      switch (eventTier) {
        case (#Free) {
          // Free races: always Standard (no passives)
          #Standard;
        };
        case (#Special) {
          // 88% Standard, 10% Unique (+), 2% Named
          if (roll < 8800) { #Standard } else if (roll < 9800) { #Unique } else {
            #Named;
          };
        };
        case (_) {
          // 90% Standard, 10% Unique (+)
          if (roll < 9000) { #Standard } else { #Unique };
        };
      };
    };

    func rollSlot(seed : Nat) : GearSlot {
      let roll = pseudoRandom(seed, 3) % 6;
      if (roll == 0) { #Legs } else if (roll == 1) { #Thruster } else if (roll == 2) {
        #Chassis;
      } else if (roll == 3) { #Gyro } else if (roll == 4) { #Core } else {
        #Module;
      };
    };

    /// Distribute stat points across stats, weighted by slot's primary stat.
    func distributeStats(seed : Nat, slot : GearSlot, terrain : TerrainTag, budget : Nat) : {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
      luck : Nat;
    } {
      if (budget == 0) {
        return {
          speed = 0;
          powerCore = 0;
          acceleration = 0;
          stability = 0;
          luck = 0;
        };
      };

      // Primary stat gets ~50% of budget (determined by slot)
      // Secondary ~50% is terrain-biased:
      //   MetalRoads  -> balanced Stability/PowerCore, Accel ~half
      //   ScrapHeaps  -> Stability dominant
      //   WastelandSand -> PowerCore dominant
      //   Universal   -> even spread

      var speed : Nat = 0;
      var powerCore : Nat = 0;
      var acceleration : Nat = 0;
      var stability : Nat = 0;
      var luck : Nat = 0;

      let primaryAlloc = (budget + 1) / 2; // ~50% rounded up
      let remaining = budget - primaryAlloc;

      // Assign primary stat (no slot has Speed as primary — speed is the strongest stat)
      switch (slot) {
        case (#Legs) { speed := primaryAlloc };
        case (#Thruster) { acceleration := primaryAlloc };
        case (#Chassis) { stability := primaryAlloc };
        case (#Gyro) {
          // Split primary between stability and acceleration
          let half = primaryAlloc / 2;
          stability := half;
          acceleration := primaryAlloc - half;
        };
        case (#Core) { powerCore := primaryAlloc };
        case (#Module) {
          // Module: use seed to pick a random primary (never speed)
          let pick = pseudoRandom(seed, 10) % 4;
          if (pick == 0) { powerCore := primaryAlloc } else if (pick == 1) {
            acceleration := primaryAlloc;
          } else if (pick == 2) { stability := primaryAlloc } else {
            luck := primaryAlloc;
          };
        };
      };

      // Terrain-biased weights for secondary distribution (must sum to 20)
      // [speed, powerCore, acceleration, stability, luck]
      let weights : [Nat] = switch (terrain) {
        case (#MetalRoads) { [2, 6, 3, 6, 3] }; // balanced stab/power, accel ~half
        case (#ScrapHeaps) { [2, 3, 2, 10, 3] }; // stability dominant
        case (#WastelandSand) { [2, 10, 2, 3, 3] }; // powerCore dominant
        case (#Universal) { [4, 4, 4, 4, 4] }; // even
      };
      let totalWeight : Nat = 20;

      // Distribute remaining points using terrain-weighted selection
      var left = remaining;
      var counter : Nat = 0;
      while (left > 0) {
        let roll = pseudoRandom(seed + counter, 11) % totalWeight;
        // Walk cumulative weights to pick stat
        if (roll < weights[0]) { speed += 1 } else if (roll < weights[0] + weights[1]) {
          powerCore += 1;
        } else if (roll < weights[0] + weights[1] + weights[2]) {
          acceleration += 1;
        } else if (roll < weights[0] + weights[1] + weights[2] + weights[3]) {
          stability += 1;
        } else { luck += 1 };
        left -= 1;
        counter += 1;
      };

      { speed; powerCore; acceleration; stability; luck };
    };

    func rollPassive(seed : Nat, slot : GearSlot, rarity : GearRarity) : PassiveEffect {
      // Scale passive power by rarity (values represent percentage points, e.g. 3.0 = 3%)
      let power : Float = switch (rarity) {
        case (#Common) { 1.0 };
        case (#Uncommon) { 2.0 };
        case (#Rare) { 3.0 };
        case (#Epic) { 4.0 };
        case (#Legendary) { 6.0 };
      };

      let roll = pseudoRandom(seed, 4) % 12;
      if (roll == 0) { #SlipstreamBoost { extraPercent = power } } else if (roll == 1) {
        #ComebackKid { boostPercent = power * 2.0 };
      } else if (roll == 2) {
        #FastStarter { segmentCount = 3; boostPercent = power * 1.5 };
      } else if (roll == 3) {
        #TerrainMastery {
          terrain = switch (pseudoRandom(seed, 5) % 3) {
            case (0) { #ScrapHeaps };
            case (1) { #WastelandSand };
            case (_) { #MetalRoads };
          };
          boostPercent = power * 1.5;
        };
      } else if (roll == 4) { #SteadyPace { varianceReduction = power * 10.0 } } else if (roll == 5) {
        #LuckAmplifier { procChanceBonus = power * 1.5 };
      } else if (roll == 6) { #Ironclad { badLuckReduction = power * 2.0 } } else if (roll == 7) {
        #FinalSurge { segmentCount = 3; boostPercent = power * 1.5 };
      } else if (roll == 8) {
        #RubberBandResist { resistPercent = power * 2.0 };
      } else if (roll == 9) { #UphillGrinder { boostPercent = power * 1.5 } } else if (roll == 10) {
        #DownhillDaredevil { boostPercent = power * 1.5 };
      } else { #PackRunner { boostPercent = power * 1.5 } };
    };

    func generateGearName(category : GearCategory, rarity : GearRarity, slot : GearSlot, terrain : TerrainTag) : Text {
      let prefix = switch (rarity) {
        case (#Common) { "Scrap" };
        case (#Uncommon) { "Salvaged" };
        case (#Rare) { "Reinforced" };
        case (#Epic) { "Overclocked" };
        case (#Legendary) { "Mythic" };
      };

      let terrainWord = switch (terrain) {
        case (#ScrapHeaps) { "Junkyard" };
        case (#WastelandSand) { "Wasteland" };
        case (#MetalRoads) { "Roadrunner" };
        case (#Universal) { "Universal" };
      };

      let slotWord = switch (slot) {
        case (#Legs) { "Legs" };
        case (#Thruster) { "Thruster" };
        case (#Chassis) { "Chassis" };
        case (#Gyro) { "Gyro" };
        case (#Core) { "Core" };
        case (#Module) { "Module" };
      };

      let categoryTag = switch (category) {
        case (#Standard) { "" };
        case (#Unique) { " +" };
        case (#Named) { " [Named]" };
      };

      prefix # " " # terrainWord # " " # slotWord # categoryTag;
    };

    // ===== TEXT HELPERS =====

    public func rarityToText(rarity : GearRarity) : Text {
      switch (rarity) {
        case (#Common) { "Common" };
        case (#Uncommon) { "Uncommon" };
        case (#Rare) { "Rare" };
        case (#Epic) { "Epic" };
        case (#Legendary) { "Legendary" };
      };
    };

    public func slotToText(slot : GearSlot) : Text {
      switch (slot) {
        case (#Legs) { "Legs" };
        case (#Thruster) { "Thruster" };
        case (#Chassis) { "Chassis" };
        case (#Gyro) { "Gyro" };
        case (#Core) { "Core" };
        case (#Module) { "Module" };
      };
    };

    public func terrainTagToText(tag : TerrainTag) : Text {
      switch (tag) {
        case (#ScrapHeaps) { "ScrapHeaps" };
        case (#WastelandSand) { "WastelandSand" };
        case (#MetalRoads) { "MetalRoads" };
        case (#Universal) { "Universal" };
      };
    };

    /// Return all equipped gear as (gearId, tokenIndex) pairs
    public func getGearEquipMap() : [(Nat, Nat)] {
      let buf = Buffer.Buffer<(Nat, Nat)>(64);
      for ((tokenIndex, loadout) in Map.entries(loadoutMap)) {
        func addSlot(slot : ?Nat) {
          switch (slot) {
            case (?gearId) { buf.add((gearId, tokenIndex)) };
            case null {};
          };
        };
        addSlot(loadout.legs);
        addSlot(loadout.thruster);
        addSlot(loadout.chassis);
        addSlot(loadout.gyro);
        addSlot(loadout.core);
        addSlot(loadout.module_);
      };
      Buffer.toArray(buf);
    };

    // ===== MIGRATION: WIPE & REGENERATE WITH SOULBOUND =====

    /// Wipe all gear, loadouts, and inventories, then regenerate gear from race history.
    /// Each gear piece is bound to the bot (tokenIndex) that earned it.
    /// Returns (gearsGenerated, racesProcessed) for logging.
    public func wipeAndRegenerateGear(
      races : [{
        raceId : Nat;
        terrain : TerrainTag;
        entryFee : Nat;
        results : ?[{ nftId : Text; owner : Principal; position : Nat }];
        startTime : Int;
        eventTier : ?EventTier;
        isPartOfPaidEvent : Bool;
      }],
      getSeasonFromTime : (Int) -> Nat,
      minStartTime : Int,
    ) : (Nat, Nat) {
      // Step 1: Wipe all existing gear state
      for ((gearId, _) in Map.entries(gearMap)) {
        Map.delete(gearMap, nhash, gearId);
      };
      for ((tokenIndex, _) in Map.entries(loadoutMap)) {
        Map.delete(loadoutMap, nhash, tokenIndex);
      };
      for ((principal, _) in Map.entries(playerInventoryMap)) {
        Map.delete(playerInventoryMap, Map.phash, principal);
      };
      nextGearIdRef.set(1);

      // Step 2: Replay gear generation from race history
      var gearsGenerated : Nat = 0;
      var racesProcessed : Nat = 0;

      for (race in races.vals()) {
        // Skip free races (same logic as handleRaceFinish)
        let isFreeRace = if (race.entryFee == 0) {
          not race.isPartOfPaidEvent;
        } else {
          false;
        };

        if (race.startTime < minStartTime) {
          // Skip — race predates gear system
        } else {
          switch (race.results) {
            case (?results) {
              racesProcessed += 1;

              let eventTier : EventTier = if (isFreeRace) {
                #Free; // Free races drop Common/Standard gear
              } else {
                switch (race.eventTier) {
                  case (?tier) { tier };
                  case (null) { #Daily };
                };
              };

              let season = getSeasonFromTime(race.startTime);
              let ilvl = ilvlFromSeason(season);

              for (result in results.vals()) {
                let tokenIdx = switch (Nat.fromText(result.nftId)) {
                  case (?t) { t };
                  case (null) { 0 }; // Should not happen
                };
                let lootSeed = race.raceId * 10000 + result.position * 137 + tokenIdx;

                let _dropped = generateLootDrop(
                  result.owner,
                  tokenIdx,
                  lootSeed,
                  race.terrain,
                  eventTier,
                  season,
                  ilvl,
                  ?race.raceId,
                );
                switch (_dropped) {
                  case (?_) { gearsGenerated += 1 };
                  case (null) {};
                };
              };
            };
            case (null) {}; // Race not completed yet
          };
        };
      };

      (gearsGenerated, racesProcessed);
    };
  };
};
