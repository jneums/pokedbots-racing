# Battery System Implementation Plan

> **Status:** Implementation Planning  
> **Last Updated:** January 2026

## Current System Analysis

### Relevant Existing Systems

#### 1. Power Grid System
**Location:** `PokedBotsGarage.mo` lines 230-250, 1146-1220

```motoko
public let BASE_POWER_WATTS : Nat = 500;
public let WATTS_PER_BOT : Nat = 100;

public type GaragePowerStatus = {
  totalCapacityWatts : Nat;
  currentDrawWatts : Nat;
  botsCharging : Nat;
  efficiency : Float;
  wattsPerBot : Nat;
};
```

**Key Functions:**
- `countBotsInChargingStation(owner)` - counts bots in ChargingStation zone
- `getGaragePowerEfficiency(owner)` - returns 0.0-1.0 efficiency
- `getGaragePowerStatus(owner)` - full status for UI
- `snapshotChargingStationBots(owner, now, exclude)` - locks in gains before power changes

**Integration Point:** Battery charging should use surplus power (capacity - current draw).

---

#### 2. Scavenging System
**Location:** `PokedBotsGarage.mo` lines 3299-3650

**Accumulation Cycle (every 15 min):**
1. Calculate hours elapsed
2. Apply zone multipliers
3. Apply faction bonuses
4. Roll for parts with variance
5. Roll for world buff (~8% per hour)
6. Update pending parts

**Key Insight:** Battery discovery can piggyback on this accumulation loop with additional drop rolls.

**World Buff Pattern (reusable for battery drops):**
```motoko
let hourlyBuffChance = 8.0 * accelBuffBonus * hoursElapsed;
if (isScavengingZone and buffRoll < hourlyBuffChance) {
  // Award buff
}
```

---

#### 3. User Inventory System
**Location:** `PokedBotsGarage.mo` lines 1835-1950

```motoko
public type UserInventory = {
  owner : Principal;
  speedChips : Nat;
  powerCoreFragments : Nat;
  thrusterKits : Nat;
  gyroModules : Nat;
  universalParts : Nat;
};
```

**Key Functions:**
- `getUserInventory(user)` - get or create inventory
- `addParts(user, partType, amount)` - add parts
- `removeParts(user, partType, amount)` - remove parts (with universal fallback)
- `setUserInventory(user, inventory)` - direct set

**Integration Point:** Need similar pattern for battery storage.

---

#### 4. Stable Storage Pattern
**Location:** `main.mo` lines 200-280

Current pattern:
```motoko
let stable_user_inventories = Map.new<Principal, PokedBotsGarage.UserInventory>();
let stable_bot_dedication = Map.new<Nat, BotDedication.BotDedicationProfile>();
```

**Integration Point:** Add `stable_user_batteries` and `stable_bot_heat`.

---

## Implementation Phases

### Phase 1: Data Structures (Backend)

#### New Types in `PokedBotsGarage.mo`

```motoko
// Battery Types
public type BatteryType = {
  #ScrapCell;      // 50 kWh, 25W draw
  #SalvagePack;    // 150 kWh, 50W draw
  #IndustrialBank; // 400 kWh, 100W draw
  #PlasmaVault;    // 1000 kWh, 200W draw
};

public type BatteryHealth = {
  #Fresh;     // 100-66%
  #Worn;      // 65-33%
  #Depleted;  // 32-1%
  #Dead;      // 0% - non-functional
};

public type Battery = {
  id : Nat;
  batteryType : BatteryType;
  healthPercent : Nat;        // 0-100 (must be 100 to operate, then degrades with use)
  storedKwh : Float;          // Current charge (capped by getCurrentMaxCapacity)
  kwhThroughput : Float;      // Total kWh jolted since last rebuild (for core wear/cycles)
  lastChargeUpdate : Int;     // For passive accumulation + self-discharge
  discoveredAt : Int;         // When found
  totalJoltsDelivered : Nat;  // Lifetime jolt count
};

// NOTE: Heat is tracked on BOTS (BotHeatStatus), not batteries.
// A bot can only receive so many jolts before overheating.

public type BotHeatStatus = {
  heatStacks : Nat;           // 0-4
  lastJoltTime : Int;
  overheatUntil : ?Int;       // If overheated, when can jolt again
};

public type GarageBatteryStorage = {
  owner : Principal;
  batteries : [Battery];
  firstBatteryDiscovered : Bool;  // Has found their first battery
  totalBatteriesFound : Nat;      // Lifetime discovery count
};

// Core wear thresholds (cycles = throughput / capacity)
// Larger batteries last proportionally longer
public let CORE_WEAR_CYCLE_THRESHOLDS : [(Float, Float)] = [
  (0.0, 1.0),    // 0-10 cycles: 100% repair efficiency
  (10.0, 0.8),   // 10-30 cycles: 80% efficiency
  (30.0, 0.6),   // 30-60 cycles: 60% efficiency
  (60.0, 0.4),   // 60-120 cycles: 40% efficiency
  (120.0, 0.2),  // 120+ cycles: 20% efficiency
];
```

#### Core Wear Helper Functions

```motoko
/// Get BASE battery capacity in kWh (before cycle degradation)
public func getBaseBatteryCapacity(batteryType : BatteryType) : Float {
  switch (batteryType) {
    case (#ScrapCell) { 50.0 };
    case (#SalvagePack) { 150.0 };
    case (#IndustrialBank) { 400.0 };
    case (#PlasmaVault) { 1000.0 };
  };
};

/// Calculate cycles from throughput and battery type
public func calculateCycles(kwhThroughput : Float, batteryType : BatteryType) : Float {
  let capacity = getBaseBatteryCapacity(batteryType);
  kwhThroughput / capacity;
};

/// Get max capacity multiplier based on cycles
public func getCapacityMultiplier(kwhThroughput : Float, batteryType : BatteryType) : Float {
  let cycles = calculateCycles(kwhThroughput, batteryType);
  
  if (cycles < 10.0) { return 1.0 };   // 100% capacity
  if (cycles < 30.0) { return 0.9 };   // 90% capacity
  if (cycles < 60.0) { return 0.75 };  // 75% capacity
  if (cycles < 120.0) { return 0.5 };  // 50% capacity
  return 0.25; // 120+ cycles - 25% capacity
};

/// Get CURRENT max capacity (affected by cycles)
public func getCurrentMaxCapacity(battery : Battery) : Float {
  let baseCapacity = getBaseBatteryCapacity(battery.batteryType);
  let multiplier = getCapacityMultiplier(battery.kwhThroughput, battery.batteryType);
  baseCapacity * multiplier;
};

/// Get repair efficiency based on cycles
public func getRepairEfficiency(kwhThroughput : Float, batteryType : BatteryType) : Float {
  let cycles = calculateCycles(kwhThroughput, batteryType);
  
  if (cycles < 10.0) { return 1.0 };   // 100%
  if (cycles < 30.0) { return 0.8 };   // 80%
  if (cycles < 60.0) { return 0.6 };   // 60%
  if (cycles < 120.0) { return 0.4 };  // 40%
  return 0.2; // 120+ cycles - heavily worn
};

/// Calculate effective repair amount based on core wear
public func getEffectiveRepair(baseRepair : Nat, kwhThroughput : Float, batteryType : BatteryType) : Nat {
  let efficiency = getRepairEfficiency(kwhThroughput, batteryType);
  Int.abs(Float.toInt(Float.fromInt(baseRepair) * efficiency));
};

/// Track throughput ONLY when jolting (discharge wears the core, not charging)
/// Do NOT call this when charging - only when jolting!
public func addJoltThroughput(battery : Battery, kwhJolted : Float) : Battery {
  { battery with kwhThroughput = battery.kwhThroughput + Float.abs(kwhJolted) };
};
```

> ⚠️ **Cycles affect BOTH repair efficiency AND max capacity.** A 60-cycle Plasma Vault can only hold 750 kWh.

#### Core Rebuild Costs

```motoko
// Core rebuild costs (parts) - resets throughput to 0 + restores to 100%
public func getRebuildCost(batteryType : BatteryType) : Nat {
  switch (batteryType) {
    case (#ScrapCell) { 300 };
    case (#SalvagePack) { 900 };
    case (#IndustrialBank) { 2400 };
    case (#PlasmaVault) { 6000 };
  };
};

// Core rebuild ICP costs (e8s)
public func getRebuildIcpCost(batteryType : BatteryType) : Nat {
  switch (batteryType) {
    case (#ScrapCell) { 200_000_000 };      // 2 ICP
    case (#SalvagePack) { 500_000_000 };    // 5 ICP
    case (#IndustrialBank) { 1_200_000_000 }; // 12 ICP
    case (#PlasmaVault) { 2_500_000_000 };  // 25 ICP
  };
};

/// Get discovery cycle range by zone (wasteland batteries have existing wear!)
public func getDiscoveryCycleRange(zone : ScavengingZone) : (Float, Float) {
  switch (zone) {
    case (#ScrapHeaps) { (60.0, 120.0) };           // Heavily used junk
    case (#AbandonedSettlements) { (30.0, 80.0) };  // Left behind, moderate wear
    case (#DeadMachineFields) { (10.0, 50.0) };     // Preserved in machines
    case (_) { (60.0, 100.0) };                     // Default fallback
  };
};

/// Generate random cycles for discovered battery based on zone
public func rollDiscoveryCycles(zone : ScavengingZone, seed : Nat) : Float {
  let (minCycles, maxCycles) = getDiscoveryCycleRange(zone);
  let range = maxCycles - minCycles;
  let roll = Float.fromInt(seed % 1000) / 1000.0; // 0.0 - 0.999
  minCycles + (roll * range);
};

/// Convert cycles to kWh throughput for storage
public func cyclesToKwh(cycles : Float, batteryType : BatteryType) : Float {
  cycles * getBaseBatteryCapacity(batteryType);
};
```

#### New Stable Storage in `main.mo`

```motoko
// Battery storage per user
let stable_garage_batteries = Map.new<Principal, GarageBatteryStorage>();

// Bot heat tracking (separate from bot stats to keep clean)
let stable_bot_heat = Map.new<Nat, BotHeatStatus>();

// Battery ID counter
var stable_next_battery_id : Nat = 1;
```

---

### Phase 2: Battery Discovery (Scavenging Integration)

#### Modify `accumulateScavengingRewards` in `PokedBotsGarage.mo`

Add after world buff roll (~line 3565):

```motoko
// Battery discovery roll (only in scavenging zones, not maintenance)
var batteryDiscoveryMessage = "";
if (isScavengingZone) {
  let batteryDropRates = getBatteryDropRates(mission.zone);
  
  // Roll for each battery type (rarest first to avoid wasting rolls)
  let discoveryRoll = Float.fromInt(hashNat(tokenIndex + Int.abs(mission.lastAccumulation) + 100) % 10000) / 100.0; // 0-100 with 2 decimal precision
  
  var discoveredBattery : ?BatteryType = null;
  var cumulativeChance = 0.0;
  
  // Plasma Vault (rarest)
  cumulativeChance += batteryDropRates.plasmaVault * hoursElapsed;
  if (discoveryRoll < cumulativeChance) {
    discoveredBattery := ?#PlasmaVault;
  };
  
  // Industrial Bank
  if (Option.isNull(discoveredBattery)) {
    cumulativeChance += batteryDropRates.industrialBank * hoursElapsed;
    if (discoveryRoll < cumulativeChance) {
      discoveredBattery := ?#IndustrialBank;
    };
  };
  
  // Salvage Pack
  if (Option.isNull(discoveredBattery)) {
    cumulativeChance += batteryDropRates.salvagePack * hoursElapsed;
    if (discoveryRoll < cumulativeChance) {
      discoveredBattery := ?#SalvagePack;
    };
  };
  
  // Scrap Cell
  if (Option.isNull(discoveredBattery)) {
    cumulativeChance += batteryDropRates.scrapCell * hoursElapsed;
    if (discoveryRoll < cumulativeChance) {
      discoveredBattery := ?#ScrapCell;
    };
  };
  
  // Award discovered battery (as Dead core WITH existing cycles)
  switch (discoveredBattery) {
    case (?batteryType) {
      // Roll for discovery quality (cycles already on the core)
      let cycleSeed = hashNat(tokenIndex + Int.abs(now) + 999);
      let discoveryCycles = rollDiscoveryCycles(mission.zone, cycleSeed);
      let discoveryKwh = cyclesToKwh(discoveryCycles, batteryType);
      
      let battery = createWastelandBattery(batteryType, discoveryKwh, now);
      addBatteryToGarage(botStats.ownerPrincipal, battery);
      
      // Quality message based on cycles
      let qualityMsg = if (discoveryCycles < 10.0) { " (Pristine!✨)" }
                       else if (discoveryCycles < 30.0) { " (Good condition)" }
                       else if (discoveryCycles < 60.0) { " (Average wear)" }
                       else if (discoveryCycles < 120.0) { " (Worn)" }
                       else { " (Toast💀)" };
      
      batteryDiscoveryMessage := " ⚡ BATTERY DISCOVERED: " # batteryTypeName(batteryType) # qualityMsg # 
                                 " [" # Float.toText(discoveryCycles) # " cycles]";
    };
    case (null) {};
  };
};
```

#### Battery Creation Helper Functions

```motoko
/// Create a new wasteland battery (found during scavenging - has existing wear)
/// NOTE: healthPercent = 0 means Dead. Must repair to 100% before battery is operational.
public func createWastelandBattery(batteryType : BatteryType, kwhThroughput : Float, now : Int) : Battery {
  {
    id = getNextBatteryId();
    batteryType = batteryType;
    healthPercent = 0;             // Dead - must repair to 100% to activate
    storedKwh = 0.0;               // Empty
    kwhThroughput = kwhThroughput; // Existing wear from wasteland!
    lastChargeUpdate = now;
    discoveredAt = now;
    totalJoltsDelivered = 0;
  };
};

/// Create a fresh battery (from rebuild - 0 cycles, full health)
/// NOTE: Rebuilds preserve the battery ID but reset all wear. This is NOT called for rebuilds.
/// For rebuilds, use rebuildBatteryCore() which modifies the existing battery in place.
public func createFreshBattery(batteryType : BatteryType, now : Int) : Battery {
  {
    id = getNextBatteryId();
    batteryType = batteryType;
    healthPercent = 100;           // Full health - immediately operational
    storedKwh = 0.0;               // Empty (will charge from grid)
    kwhThroughput = 0.0;           // Fresh core - 0 cycles!
    lastChargeUpdate = now;
    discoveredAt = now;
    totalJoltsDelivered = 0;
  };
};

public func getNextBatteryId() : Nat {
  let id = stable_next_battery_id;
  stable_next_battery_id += 1;
  id;
};

/// Get battery passive draw rate in watts
public func getBatteryDrawRate(batteryType : BatteryType) : Nat {
  switch (batteryType) {
    case (#ScrapCell) { 25 };
    case (#SalvagePack) { 50 };
    case (#IndustrialBank) { 100 };
    case (#PlasmaVault) { 200 };
  };
};

/// Get human-readable battery type name
public func batteryTypeName(batteryType : BatteryType) : Text {
  switch (batteryType) {
    case (#ScrapCell) { "Scrap Cell" };
    case (#SalvagePack) { "Salvage Pack" };
    case (#IndustrialBank) { "Industrial Bank" };
    case (#PlasmaVault) { "Plasma Vault" };
  };
};

/// Check if battery is operational (can charge and jolt)
/// Battery must be at 100% health to function. Once operational, it degrades through use.
public func isBatteryOperational(battery : Battery) : Bool {
  battery.healthPercent == 100;
};

/// Check if battery can deliver a jolt (operational + has charge)
public func canJolt(battery : Battery) : Bool {
  isBatteryOperational(battery) and battery.storedKwh >= 20.0;
};
```

#### Drop Rate Function

```motoko
public func getBatteryDropRates(zone : ScavengingZone) : {
  scrapCell : Float;
  salvagePack : Float;
  industrialBank : Float;
  plasmaVault : Float;
} {
  switch (zone) {
    case (#ScrapHeaps) {
      { scrapCell = 2.0; salvagePack = 0.3; industrialBank = 0.05; plasmaVault = 0.01 };
    };
    case (#AbandonedSettlements) {
      { scrapCell = 1.5; salvagePack = 1.0; industrialBank = 0.2; plasmaVault = 0.05 };
    };
    case (#DeadMachineFields) {
      { scrapCell = 1.0; salvagePack = 1.5; industrialBank = 0.8; plasmaVault = 0.3 };
    };
    case (_) {
      // Maintenance zones - no battery drops
      { scrapCell = 0.0; salvagePack = 0.0; industrialBank = 0.0; plasmaVault = 0.0 };
    };
  };
};
```

---

### Phase 3: Battery Charging (Grid Integration)

#### Passive Charging Logic

Batteries charge from **surplus** grid power, not contending with bot charging.

```motoko
/// Calculate surplus power available for battery charging
public func getGridSurplusForBatteries(owner : Principal) : Nat {
  let status = getGaragePowerStatus(owner);
  if (status.currentDrawWatts >= status.totalCapacityWatts) {
    return 0; // No surplus, grid fully loaded or overloaded
  };
  status.totalCapacityWatts - status.currentDrawWatts;
};

/// Update battery charge based on elapsed time and grid surplus
/// Called lazily when querying battery status
/// 
/// CHARGING RULES:
/// - Battery must be at 100% health to charge (operational threshold)
/// - Uses surplus grid power (capacity - current bot draw)
/// - Each battery has a max draw rate (25W-200W depending on type)
/// - Charge is capped by getCurrentMaxCapacity (affected by cycles)
///
/// TODO: Add self-discharge (0.5-2% per day) - defer to v1.1
public func accumulateBatteryCharge(owner : Principal, now : Int) {
  switch (getBatteryStorage(owner)) {
    case (null) { return };
    case (?storage) {
      let surplus = getGridSurplusForBatteries(owner);
      if (surplus == 0) { return }; // No power to charge
      
      let updatedBatteries = Array.map<Battery, Battery>(
        storage.batteries,
        func (battery) {
          // Only operational batteries (100% health) can charge
          if (not isBatteryOperational(battery)) {
            return battery;
          };
          
          let batteryDrawWatts = getBatteryDrawRate(battery.batteryType);
          let effectiveDrawWatts = Nat.min(surplus, batteryDrawWatts);
          
          let hoursElapsed = Float.fromInt(now - battery.lastChargeUpdate) / 3_600_000_000_000.0;
          let kwhGained = Float.fromInt(effectiveDrawWatts) * hoursElapsed / 1000.0;
          
          // Max capacity is affected by cycles!
          let maxCapacity = getCurrentMaxCapacity(battery);
          let newCharge = Float.min(maxCapacity, battery.storedKwh + kwhGained);
          
          { battery with 
            storedKwh = newCharge;
            lastChargeUpdate = now;
          };
        }
      );
      
      setBatteryStorage(owner, { storage with batteries = updatedBatteries });
    };
  };
};
```

---

### Phase 4: Jolt System (Bot Charging)

#### Jolt Mechanics

```motoko
public type JoltResult = {
  success : Bool;
  energyDelivered : Float;  // Percentage of bot battery restored
  energyConsumed : Float;   // kWh used from battery (always 20.0)
  newBotBattery : Nat;      // Bot's new battery level (0-100)
  newBatteryCharge : Float; // Battery's remaining stored kWh
  newBatteryHealth : Nat;   // Battery's new health % (decreases from jolt damage)
  newHeatStacks : Nat;      // Bot's new heat stack count (0-4)
  overheated : Bool;        // True if bot is now in overheat lockout
  message : Text;
};

/// Jolt a bot from a battery - instant charge using stored energy
/// 
/// VALIDATION:
/// 1. Caller owns the battery (in their garage)
/// 2. Caller owns the bot (registered owner)
/// 3. Battery is operational (healthPercent == 100)
/// 4. Battery has sufficient charge (>= 20 kWh)
/// 5. Bot heat < 4 stacks (tracked in BotHeatStatus, not battery)
/// 6. Bot not currently overheated (overheatUntil not passed)
///
/// EFFECTS:
/// - Bot gains 25-45% battery (modified by bot's current heat)
/// - Battery loses 20 kWh stored charge
/// - Battery gains 20 kWh throughput (toward cycles)
/// - Battery loses health (0.25-2% depending on type)
/// - Bot gains 1 heat stack
public func joltBot(
  owner : Principal,
  batteryId : Nat,
  tokenIndex : Nat,
  now : Int
) : Result.Result<JoltResult, Text> {
  // 1. Validate ownership
  // 2. Check battery is operational (healthPercent == 100)
  // 3. Check battery has charge (>= 20 kWh)
  // 4. Check bot heat < 4 stacks (from BotHeatStatus)
  // 5. Check bot not overheated (overheatUntil)
  
  // Calculate jolt
  let baseJoltRange = (25.0, 45.0); // 25-45% bot battery
  let batteryHealthMod = 1.0; // Fresh = 1.0 (only Fresh can jolt)
  let heatMod = 1.0 - (Float.fromInt(heatStacks) * 0.15);
  
  // Roll for jolt amount
  let joltRoll = Float.fromInt(hashNat(tokenIndex + Int.abs(now)) % 21) + 25.0; // 25-45
  let finalJolt = joltRoll * batteryHealthMod * heatMod;
  
  // Apply to bot
  let newBotBattery = Nat.min(100, botStats.battery + Int.abs(Float.toInt(finalJolt)));
  
  // Deduct from battery AND track throughput (only jolts wear the core!)
  let newBatteryCharge = battery.storedKwh - 20.0;
  let batteryAfterJolt = addJoltThroughput(
    { battery with storedKwh = newBatteryCharge },
    20.0  // 20 kWh jolted = adds to cycle count
  );
  
  // Apply health damage from jolt (batteries wear from use!)
  let updatedBattery = applyJoltDamage(batteryAfterJolt);
  
  // Calculate current heat (decay based on elapsed time since last jolt)
  let hoursElapsed = Float.fromInt(now - botHeat.lastJoltTime) / 3_600_000_000_000.0;
  let stacksDecayed = Int.abs(Float.toInt(Float.floor(hoursElapsed)));
  let currentHeat = Int.max(0, botHeat.heatStacks - stacksDecayed);
  
  // Add new heat stack
  let newHeatStacks = currentHeat + 1;
  let overheated = newHeatStacks >= 4;
  
  // If overheated, set lockout (1 hour)
  let newOverheatUntil = if (overheated) { ?(now + 3_600_000_000_000) } else { null };
  
  // Update bot heat status
  let newBotHeat = {
    heatStacks = newHeatStacks;
    lastJoltTime = now;
    overheatUntil = newOverheatUntil;
  };
  setBotHeatStatus(tokenIndex, newBotHeat);
  
  // Update battery in storage
  updateBattery(owner, batteryId, updatedBattery);
  
  // Update bot stats (battery level)
  updateBotBattery(tokenIndex, newBotBattery);
  
  #ok({
    success = true;
    energyDelivered = finalJolt;
    energyConsumed = 20.0;
    newBotBattery = newBotBattery;
    newBatteryCharge = updatedBattery.storedKwh;
    newBatteryHealth = updatedBattery.healthPercent;
    newHeatStacks = newHeatStacks;
    overheated = overheated;
    message = if (overheated) {
      "⚡ Jolt delivered! Bot charged to " # Nat.toText(newBotBattery) # "% ⚠️ OVERHEATED - 1hr cooldown!";
    } else {
      "⚡ Jolt delivered! Bot charged to " # Nat.toText(newBotBattery) # "% (Heat: " # Nat.toText(newHeatStacks) # "/4)";
    };
  });
};

---

### Phase 5: Maintenance & Salvage

#### Cost Constants

```motoko
// Repair costs (parts) - +25% health per repair
public func getRepairCost(batteryType : BatteryType) : Nat {
  switch (batteryType) {
    case (#ScrapCell) { 50 };
    case (#SalvagePack) { 150 };
    case (#IndustrialBank) { 400 };
    case (#PlasmaVault) { 1000 };
  };
};

// Full restore ICP costs (e8s)
public func getFullRestoreIcpCost(batteryType : BatteryType) : Nat {
  switch (batteryType) {
    case (#ScrapCell) { 100_000_000 };      // 1 ICP
    case (#SalvagePack) { 200_000_000 };    // 2 ICP
    case (#IndustrialBank) { 500_000_000 }; // 5 ICP
    case (#PlasmaVault) { 1_000_000_000 };  // 10 ICP
  };
};

// Salvage returns (parts)
public func getSalvageReturn(batteryType : BatteryType) : Nat {
  switch (batteryType) {
    case (#ScrapCell) { 50 };
    case (#SalvagePack) { 150 };
    case (#IndustrialBank) { 400 };
    case (#PlasmaVault) { 1000 };
  };
};
```

#### Repair Battery

```motoko
/// Repair a battery using parts (efficiency affected by core wear cycles)
public func repairBattery(
  owner : Principal,
  batteryId : Nat,
  now : Int
) : Result.Result<{ healthGained : Nat; newHealth : Nat; cycles : Float }, Text> {
  let repairCost = getRepairCost(battery.batteryType);
  
  // Check parts
  if (not removeParts(owner, #UniversalPart, repairCost)) {
    return #err("Insufficient parts. Need " # Nat.toText(repairCost) # " Universal Parts.");
  };
  
  // Calculate effective repair based on CYCLES (not absolute kWh)
  let baseRepair = 25; // Base +25% health
  let cycles = calculateCycles(battery.kwhThroughput, battery.batteryType);
  let effectiveRepair = getEffectiveRepair(baseRepair, battery.kwhThroughput, battery.batteryType);
  
  let newHealth = Nat.min(100, battery.healthPercent + effectiveRepair);
  
  // Update battery
  let updatedBattery = { battery with healthPercent = newHealth };
  updateBattery(owner, batteryId, updatedBattery);
  
  #ok({
    healthGained = effectiveRepair;
    newHealth = newHealth;
    cycles = cycles;
  });
};

/// Full restore with ICP (still affected by core wear!)
public func fullRestoreIcp(
  owner : Principal,
  batteryId : Nat,
  now : Int
) : Result.Result<Text, Text> {
  let icpCost = getFullRestoreIcpCost(battery.batteryType);
  // Check ICRC-2 approval
  // Restore to 100% (but does NOT reset core wear!)
};
```

#### Core Rebuild (Resets Wear)

```motoko
/// Full core rebuild - restores to 100% AND resets throughput counter
/// This is the only way to reset core wear
public func rebuildBatteryCore(
  owner : Principal,
  batteryId : Nat,
  useIcp : Bool,
  now : Int
) : Result.Result<Text, Text> {
  let partsCost = getRebuildCost(battery.batteryType);
  let icpCost = getRebuildIcpCost(battery.batteryType);
  
  if (useIcp) {
    // Check ICRC-2 approval for icpCost
  } else {
    // Check partsCost Universal Parts
    if (not removeParts(owner, #UniversalPart, partsCost)) {
      return #err("Insufficient parts. Need " # Nat.toText(partsCost) # " Universal Parts.");
    };
  };
  
  // Full rebuild: 100% health + reset wear + restore max capacity
  let rebuiltBattery = {
    battery with
    healthPercent = 100;
    kwhThroughput = 0.0;  // RESET core wear (cycles back to 0)!
    storedKwh = 0.0;      // Empty after rebuild (charge will fill it)
  };
  
  updateBattery(owner, batteryId, rebuiltBattery);
  
  #ok("Core rebuilt! Health: 100%, Cycles: 0, Max capacity restored to 100%");
};
```

#### Health Loss Per Jolt

```motoko
/// Get health damage per jolt (larger batteries are more durable)
public func getHealthLossPerJolt(batteryType : BatteryType) : Nat {
  switch (batteryType) {
    case (#ScrapCell) { 2 };       // ~50 jolts to dead
    case (#SalvagePack) { 1 };     // ~100 jolts to dead
    case (#IndustrialBank) { 1 };  // ~100 jolts (but 0.5% would need Float)
    case (#PlasmaVault) { 1 };     // ~100 jolts (0.25% would need Float)
  };
};

// Alternative with Float for more granularity:
public func getHealthLossPerJoltFloat(batteryType : BatteryType) : Float {
  switch (batteryType) {
    case (#ScrapCell) { 2.0 };      // ~50 jolts to dead
    case (#SalvagePack) { 1.0 };    // ~100 jolts to dead
    case (#IndustrialBank) { 0.5 }; // ~200 jolts to dead
    case (#PlasmaVault) { 0.25 };   // ~400 jolts to dead
  };
};

/// Apply health damage after a jolt
public func applyJoltDamage(battery : Battery) : Battery {
  let damage = getHealthLossPerJoltFloat(battery.batteryType);
  let newHealth = if (Float.fromInt(battery.healthPercent) > damage) {
    Int.abs(Float.toInt(Float.fromInt(battery.healthPercent) - damage));
  } else { 0 };
  
  { battery with healthPercent = newHealth };
};
```

> 💡 **No time-based degradation.** Batteries only lose health when jolted. An idle battery stays at the same health forever.

#### Salvage Battery

```motoko
/// Salvage a battery for parts (destroys it)
public func salvageBattery(
  owner : Principal,
  batteryId : Nat
) : Result.Result<{ partsReturned : Nat }, Text> {
  let partsReturn = getSalvageReturn(battery.batteryType);
  
  // Remove battery from storage
  // Add parts to inventory
  
  #ok({ partsReturned = partsReturn });
};
```

---

### Phase 6: MCP Tools

#### New Tools to Create

| Tool | Purpose |
|------|---------|
| `garage_list_batteries` | List all batteries in garage with status |
| `garage_battery_status` | Detailed status of specific battery |
| `garage_jolt_bot` | Jolt a bot from battery |
| `garage_repair_battery` | Repair battery with parts/ICP |
| `garage_salvage_battery` | Destroy battery for parts |

#### Example Tool: `garage_jolt_bot`

```motoko
// garage_jolt_bot.mo
module {
  public func config() : McpTypes.Tool = {
    name = "garage_jolt_bot";
    title = ?"Jolt Bot from Battery";
    description = ?"Instantly charge a bot using stored battery energy. Costs 20 kWh, delivers 25-45% bot charge (modified by heat). Adds 1 heat stack.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([
        ("battery_id", Json.obj([
          ("type", Json.str("number")),
          ("description", Json.str("The ID of the battery to use"))
        ])),
        ("token_index", Json.obj([
          ("type", Json.str("number")),
          ("description", Json.str("The token index of the bot to charge"))
        ]))
      ])),
      ("required", Json.arr([Json.str("battery_id"), Json.str("token_index")]))
    ]);
  };
  
  // ... implementation
};
```

---

### Phase 7: Web API & UI

#### New Endpoints in `main.mo`

```motoko
// Query: Get battery storage for caller
public shared query ({ caller }) func web_get_batteries() : async GarageBatteryStorage;

// Query: Get bot heat status
public shared query ({ caller }) func web_get_bot_heat(tokenIndex : Nat) : async BotHeatStatus;

// Update: Jolt bot from battery
public shared ({ caller }) func web_jolt_bot(batteryId : Nat, tokenIndex : Nat) : async Result.Result<JoltResult, Text>;

// Update: Repair battery
public shared ({ caller }) func web_repair_battery(batteryId : Nat, useIcp : Bool) : async Result.Result<Text, Text>;

// Update: Salvage battery
public shared ({ caller }) func web_salvage_battery(batteryId : Nat) : async Result.Result<{ partsReturned : Nat }, Text>;
```

#### UI Components (Website)

1. **Battery Panel** in Garage page
   - List of batteries with charge bars
   - Health indicator (Fresh/Worn/Depleted/Dead)
   - Charge/Jolt buttons

2. **Jolt Modal**
   - Select battery
   - Select bot
   - Show expected jolt range
   - Show heat warning

3. **Discovery Toast**
   - "⚡ BATTERY CORE DISCOVERED!"
   - Show battery type and condition

---

## File Changes Summary

| File | Changes |
|------|---------|
| `PokedBotsGarage.mo` | Add types, battery storage, jolt logic, discovery in scavenging |
| `main.mo` | Add stable storage, web endpoints |
| `garage_list_batteries.mo` | New MCP tool |
| `garage_jolt_bot.mo` | New MCP tool |
| `garage_repair_battery.mo` | New MCP tool |
| `garage_salvage_battery.mo` | New MCP tool |
| `garage.api.ts` | Add TypeScript API functions |
| `garage/page.tsx` | Add battery UI components |

---

## Testing Checklist

- [ ] Battery discovery drops in scavenging zones
- [ ] Drop rates match design (zone-based)
- [ ] First battery guaranteed after 20 hours
- [ ] Dead batteries cannot charge/jolt
- [ ] Repair increments health correctly
- [ ] Full repair with ICP works
- [ ] Salvage returns correct parts
- [ ] Passive charging uses grid surplus
- [ ] Charging stops when grid overloaded
- [ ] Jolt delivers correct energy (25-45%)
- [ ] Heat stacks accumulate correctly
- [ ] Heat decays over time (1 stack/hour)
- [ ] Overheat lockout at 4 stacks
- [ ] UI displays all battery states

---

## Migration Notes

- **No migration needed** - new feature with new stable storage
- Existing users start with empty battery storage
- First battery discovery triggered by scavenging
- Backwards compatible with current scavenging system
