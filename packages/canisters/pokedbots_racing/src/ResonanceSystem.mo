import Float "mo:base/Float";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";

import Random "mo:noise/Random";
import Noise "mo:noise/Noise";
import NoiseTypes "mo:noise/Types";

/// ResonanceSystem - Per-Bot Perlin Noise Fields for Optimal Maintenance Points
///
/// This system generates unique, slowly-drifting "resonance windows" for each bot,
/// determining optimal recharge and repair points. This prevents batch optimization
/// exploits where players could trivially apply the same strategy to all bots.
///
/// MECHANICS:
/// - Each bot has a unique noise field seeded by their token index
/// - Optimal points drift over time (weekly cycle with daily micro-variations)
/// - Players who actively manage their bots are rewarded for finding resonance windows
/// - Casuals can still play - they just won't always hit perfect bonuses
///
/// RESONANCE WINDOWS:
/// - Peak zone (±3%): Full bonus (100% of overcharge/tuneup effect)
/// - Good zone (±10%): Partial bonus (60% of effect)
/// - Neutral zone: Standard behavior (no bonus, no penalty)
///
/// TIME DRIFT:
/// - Primary cycle: ~7 days (slow drift of optimal points)
/// - Secondary cycle: ~1 day (micro-variations for engagement)
/// - Noise is smooth and continuous (no jarring jumps)
module {

  // ===== CONSTANTS =====

  // Time constants (in nanoseconds) - computed values
  let NS_PER_SECOND : Int = 1_000_000_000;
  let NS_PER_MINUTE : Int = 60_000_000_000; // 60 * 1_000_000_000
  let NS_PER_HOUR : Int = 3_600_000_000_000; // 60 * 60_000_000_000
  let NS_PER_DAY : Int = 86_400_000_000_000; // 24 * 3_600_000_000_000
  let NS_PER_WEEK : Int = 604_800_000_000_000; // 7 * 86_400_000_000_000

  // Drift periods
  let PRIMARY_DRIFT_PERIOD : Int = 604_800_000_000_000; // NS_PER_WEEK
  let SECONDARY_DRIFT_PERIOD : Int = 86_400_000_000_000; // NS_PER_DAY

  // Noise scaling factors (affects how "zoomed in" the noise is)
  let TOKEN_SCALE : Float = 0.073; // Spread bots across noise space (prime-ish number for better distribution)
  let PRIMARY_TIME_SCALE : Float = 0.1; // How fast primary drift moves
  let SECONDARY_TIME_SCALE : Float = 0.3; // How fast secondary variations move

  // Resonance window thresholds
  // Peak is hard to find (~10% coverage), Good is easy for casuals (~50-60% coverage)
  // Recharge thresholds (70% range: 0-70)
  let RECHARGE_PEAK_THRESHOLD : Float = 0.035; // ±3.5% for peak bonus (~10% coverage)
  let RECHARGE_GOOD_THRESHOLD : Float = 0.20; // ±20% for partial bonus (~57% coverage)
  // Repair thresholds (40% range: 60-100)
  let REPAIR_PEAK_THRESHOLD : Float = 0.02; // ±2% for peak bonus (~10% coverage)
  let REPAIR_GOOD_THRESHOLD : Float = 0.12; // ±12% for partial bonus (~60% coverage)

  // Bonus multipliers
  let PEAK_BONUS_MULT : Float = 1.0; // 100% of max bonus in peak zone
  let GOOD_BONUS_MULT : Float = 0.6; // 60% of max bonus in good zone
  let WEAK_BONUS_MULT : Float = 0.3; // 30% of max bonus in weak zone (fallback)
  let NEUTRAL_BONUS_MULT : Float = 0.0; // No bonus outside resonance

  // Weak zone fallback for repair (fixed at 70% ±2% condition)
  // This gives players a consolation prize if they miss their optimal window
  let REPAIR_WEAK_CENTER : Float = 70.0; // 70% condition
  let REPAIR_WEAK_THRESHOLD : Float = 0.02; // ±2% (68-72% condition)

  // Optimal point ranges (noise maps to these ranges)
  // Battery recharge: 0-70% (encourages recharging at lower battery for overcharge)
  let RECHARGE_MIN_OPTIMAL : Float = 0.0; // 0%
  let RECHARGE_MAX_OPTIMAL : Float = 70.0; // 70%
  let RECHARGE_OPTIMAL_RANGE : Float = 70.0; // RECHARGE_MAX_OPTIMAL - RECHARGE_MIN_OPTIMAL

  // Condition repair: 60-100% (top 40% - perfect tuneup requires higher condition)
  let REPAIR_MIN_OPTIMAL : Float = 60.0; // 60%
  let REPAIR_MAX_OPTIMAL : Float = 100.0; // 100%
  let REPAIR_OPTIMAL_RANGE : Float = 40.0; // REPAIR_MAX_OPTIMAL - REPAIR_MIN_OPTIMAL

  // ===== TYPES =====

  /// Type of maintenance action
  public type MaintenanceType = {
    #Recharge; // Battery recharge (for overcharge bonus)
    #Repair; // Condition repair (for perfect tuneup bonus)
  };

  /// Resonance calculation result
  public type ResonanceResult = {
    /// The optimal point for this action (0-100%)
    optimalPoint : Nat;
    /// The current state value being evaluated (0-100%)
    currentValue : Nat;
    /// How close to optimal (0.0 = perfect, 1.0 = maximally far)
    distance : Float;
    /// Whether in peak resonance zone
    inPeakZone : Bool;
    /// Whether in good resonance zone
    inGoodZone : Bool;
    /// Whether in weak resonance zone (fallback for repair at 70%)
    inWeakZone : Bool;
    /// Bonus multiplier to apply (0.0, 0.3, 0.6, or 1.0)
    bonusMultiplier : Float;
    /// Human-readable resonance status
    resonanceStatus : Text;
    /// Time until next significant drift (approximate hours)
    hoursUntilDrift : Nat;
  };

  /// Detailed resonance info for UI display
  public type ResonanceInfo = {
    /// Optimal recharge point (battery %)
    rechargeOptimal : Nat;
    /// Optimal repair point (condition %)
    repairOptimal : Nat;
    /// Current resonance phase (0-100, for visualization)
    phaseIndicator : Nat;
    /// Resonance "stability" (how much it will change soon)
    stability : Text; // "Stable", "Shifting", "Volatile"
    /// Next significant change (approximate)
    nextShiftHours : Nat;
  };

  // ===== HELPER FUNCTIONS =====

  /// Initialize Perlin noise generator with a seed
  func initNoiseGenerator(seed : Nat64) : NoiseTypes.PerlinNoise {
    let xoroshiro = Random.xSetSeed(seed);
    Noise.xPerlinInit(xoroshiro);
  };

  /// Sample 2D Perlin noise (returns value in [-1, 1])
  func sampleNoise2D(perlin : NoiseTypes.PerlinNoise, x : Float, y : Float) : Float {
    Noise.samplePerlinNoise(perlin, x, y, 0.0, 0.0, 0.0);
  };

  /// Map noise value from [-1, 1] to optimal point range based on maintenance type
  func noiseToOptimalPoint(noiseValue : Float, maintenanceType : MaintenanceType) : Float {
    let normalized = (noiseValue + 1.0) / 2.0; // Map to [0, 1]
    switch (maintenanceType) {
      case (#Recharge) {
        RECHARGE_MIN_OPTIMAL + (normalized * RECHARGE_OPTIMAL_RANGE);
      };
      case (#Repair) {
        REPAIR_MIN_OPTIMAL + (normalized * REPAIR_OPTIMAL_RANGE);
      };
    };
  };

  /// Calculate time phase for noise sampling
  func calculateTimePhase(now : Int, period : Int) : Float {
    let phase = Float.fromInt(now % period) / Float.fromInt(period);
    phase * 2.0 * 3.14159265358979; // Convert to radians for smoother cycling
  };

  // ===== CORE RESONANCE CALCULATION =====

  /// Calculate the optimal maintenance point for a specific bot and action type
  /// This is the core function that generates the per-bot resonance field
  public func calculateOptimalPoint(
    tokenIndex : Nat,
    maintenanceType : MaintenanceType,
    now : Int,
  ) : Nat {
    // Create seed from token index (each bot has unique noise field)
    // Use different seeds for recharge vs repair so they have independent optima
    let typeSeed : Nat64 = switch (maintenanceType) {
      case (#Recharge) { 0 };
      case (#Repair) { 1000000 };
    };
    let seed : Nat64 = Nat64.fromNat(tokenIndex) + typeSeed + 42; // Magic number for variety

    let perlin = initNoiseGenerator(seed);

    // Calculate time-based coordinates for noise sampling
    // Primary drift: slow weekly cycle
    let primaryPhase = Float.fromInt(now / (NS_PER_HOUR * 6)) * PRIMARY_TIME_SCALE; // Update every 6 hours

    // Secondary drift: faster daily micro-variations
    let secondaryPhase = Float.fromInt(now / NS_PER_HOUR) * SECONDARY_TIME_SCALE; // Update hourly

    // Bot identity dimension (spread bots across noise space)
    let botX = Float.fromInt(tokenIndex) * TOKEN_SCALE;

    // Sample primary noise (slow drift)
    let primaryNoise = sampleNoise2D(perlin, botX, primaryPhase);

    // Sample secondary noise (micro-variations) at different frequency
    let secondaryNoise = sampleNoise2D(perlin, botX * 1.7, secondaryPhase) * 0.15; // 15% influence

    // Combine noises
    let combinedNoise = primaryNoise * 0.85 + secondaryNoise;

    // Clamp to valid range
    let clampedNoise = Float.max(-1.0, Float.min(1.0, combinedNoise));

    // Convert to optimal point percentage (range depends on maintenance type)
    let optimalFloat = noiseToOptimalPoint(clampedNoise, maintenanceType);

    Int.abs(Float.toInt(optimalFloat));
  };

  /// Calculate resonance bonus for a maintenance action
  public func calculateResonance(
    tokenIndex : Nat,
    maintenanceType : MaintenanceType,
    currentValue : Nat, // Current battery or condition %
    now : Int,
  ) : ResonanceResult {
    let optimalPoint = calculateOptimalPoint(tokenIndex, maintenanceType, now);

    // Calculate distance from optimal (as percentage points)
    let currentFloat = Float.fromInt(currentValue);
    let optimalFloat = Float.fromInt(optimalPoint);
    let distance = Float.abs(currentFloat - optimalFloat) / 100.0; // Normalize to 0-1

    // Get thresholds based on maintenance type
    let (peakThreshold, goodThreshold) = switch (maintenanceType) {
      case (#Recharge) { (RECHARGE_PEAK_THRESHOLD, RECHARGE_GOOD_THRESHOLD) };
      case (#Repair) { (REPAIR_PEAK_THRESHOLD, REPAIR_GOOD_THRESHOLD) };
    };

    // Determine resonance zone and bonus
    let (inPeakZone, inGoodZone, inWeakZone, bonusMultiplier, status) = if (distance <= peakThreshold) {
      (true, true, false, PEAK_BONUS_MULT, "⚡ PEAK RESONANCE - Maximum bonus!");
    } else if (distance <= goodThreshold) {
      (false, true, false, GOOD_BONUS_MULT, "✨ Good resonance - Partial bonus");
    } else {
      // Check for weak zone fallback (only for repair, at 70% ±2%)
      switch (maintenanceType) {
        case (#Repair) {
          let distanceFromWeak = Float.abs(currentFloat - REPAIR_WEAK_CENTER) / 100.0;
          if (distanceFromWeak <= REPAIR_WEAK_THRESHOLD) {
            (false, false, true, WEAK_BONUS_MULT, "🔧 Weak resonance - Minor bonus (70% fallback)");
          } else {
            (false, false, false, NEUTRAL_BONUS_MULT, "Standard - No resonance bonus");
          };
        };
        case (#Recharge) {
          (false, false, false, NEUTRAL_BONUS_MULT, "Standard - No resonance bonus");
        };
      };
    };

    // Calculate approximate hours until next significant drift
    let hoursSinceEpoch = Int.abs(now / NS_PER_HOUR);
    let hoursUntilNextShift = 6 - (hoursSinceEpoch % 6); // 6-hour update cycle

    {
      optimalPoint = optimalPoint;
      currentValue = currentValue;
      distance = distance;
      inPeakZone = inPeakZone;
      inGoodZone = inGoodZone;
      inWeakZone = inWeakZone;
      bonusMultiplier = bonusMultiplier;
      resonanceStatus = status;
      hoursUntilDrift = hoursUntilNextShift;
    };
  };

  /// Get comprehensive resonance info for a bot (for UI display)
  public func getResonanceInfo(tokenIndex : Nat, now : Int) : ResonanceInfo {
    let rechargeOptimal = calculateOptimalPoint(tokenIndex, #Recharge, now);
    let repairOptimal = calculateOptimalPoint(tokenIndex, #Repair, now);

    // Calculate phase indicator (how far into current drift cycle)
    let hoursSinceEpoch = Int.abs(now / NS_PER_HOUR);
    let cycleProgress = (hoursSinceEpoch % 168) * 100 / 168; // 168 hours = 1 week

    // Determine stability based on position in cycle
    let hoursUntilMajorShift = 6 - (hoursSinceEpoch % 6);
    let stability = if (hoursUntilMajorShift <= 1) {
      "Volatile";
    } else if (hoursUntilMajorShift <= 3) {
      "Shifting";
    } else {
      "Stable";
    };

    {
      rechargeOptimal = rechargeOptimal;
      repairOptimal = repairOptimal;
      phaseIndicator = cycleProgress;
      stability = stability;
      nextShiftHours = hoursUntilMajorShift;
    };
  };

  // ===== OVERCHARGE RESONANCE =====

  /// Calculate overcharge bonus with resonance modifier
  /// This replaces the old hardcoded "recharge at 0% = max overcharge" logic
  public func calculateOverchargeWithResonance(
    tokenIndex : Nat,
    currentBattery : Nat,
    currentCondition : Nat,
    randomVariance : Float, // Existing RNG variance
    now : Int,
  ) : (Nat, ResonanceResult) {
    let resonance = calculateResonance(tokenIndex, #Recharge, currentBattery, now);

    // Base overcharge calculation (same as before)
    let batteryDeficit = if (currentBattery >= 100) { 0 } else {
      100 - currentBattery;
    };
    let baseOvercharge = Float.fromInt(batteryDeficit) * 0.4;

    // Condition affects efficiency
    let conditionBonus = Float.fromInt(currentCondition) / 200.0;
    let efficiency = 0.4 + conditionBonus + randomVariance;
    let rawOvercharge = baseOvercharge * efficiency;

    // Apply resonance modifier
    // At peak resonance: full overcharge potential
    // At good resonance: 60% of potential bonus above baseline
    // Outside resonance: baseline only (reduced max)
    let resonanceModifier = if (resonance.inPeakZone) {
      1.0; // Full potential
    } else if (resonance.inGoodZone) {
      0.8 + (resonance.bonusMultiplier * 0.2); // 80-92% potential
    } else {
      0.6; // Baseline reduced (60% max potential)
    };

    let finalOvercharge = rawOvercharge * resonanceModifier;
    let cappedOvercharge = Nat.min(40, Int.abs(Float.toInt(finalOvercharge))); // Cap at 40%

    (cappedOvercharge, resonance);
  };

  // ===== PERFECT TUNE-UP RESONANCE =====

  /// Calculate if a repair action achieves Perfect Tune-Up with resonance
  /// This replaces the old hardcoded "repair to exactly 100%" logic
  public func calculatePerfectTuneupWithResonance(
    tokenIndex : Nat,
    currentCondition : Nat,
    repairAmount : Nat, // How much condition will be restored
    hasOvercharge : Bool,
    now : Int,
  ) : (Bool, ResonanceResult) {
    let resonance = calculateResonance(tokenIndex, #Repair, currentCondition, now);

    // Calculate what condition will be after repair
    let resultingCondition = Nat.min(100, currentCondition + repairAmount);

    // Perfect Tune-Up requires:
    // 1. Bot has active overcharge
    // 2. Repair is within resonance window (peak, good, or weak)
    let achievesPerfectTuneup = hasOvercharge and (resonance.inPeakZone or resonance.inGoodZone or resonance.inWeakZone);

    // Bonus quality depends on resonance zone
    // Peak: Full penalty removal
    // Good: Partial penalty removal
    // Weak: Minor penalty removal (70% fallback)
    (achievesPerfectTuneup, resonance);
  };

  /// Calculate the quality of a Perfect Tune-Up (affects how much penalty is removed)
  /// Returns a multiplier for penalty reduction (1.0 = full removal, 0.3 = minor removal)
  public func getPerfectTuneupQuality(resonance : ResonanceResult) : Float {
    if (resonance.inPeakZone) {
      1.0; // Full penalty removal
    } else if (resonance.inGoodZone) {
      0.7; // 70% penalty removal (30% penalties remain)
    } else if (resonance.inWeakZone) {
      0.3; // 30% penalty removal (70% penalties remain) - 70% fallback
    } else {
      0.0; // No Perfect Tune-Up outside resonance
    };
  };

  // ===== HELPER FOR DISPLAY =====

  /// Get a human-readable description of the current resonance state
  public func getResonanceDescription(tokenIndex : Nat, now : Int) : Text {
    let info = getResonanceInfo(tokenIndex, now);

    "🔮 **Bot #" # Nat.toText(tokenIndex) # " Resonance Field**\n" #
    "• Optimal Recharge: " # Nat.toText(info.rechargeOptimal) # "% battery\n" #
    "• Optimal Repair: " # Nat.toText(info.repairOptimal) # "% condition\n" #
    "• Field Stability: " # info.stability # "\n" #
    "• Next shift in ~" # Nat.toText(info.nextShiftHours) # " hours\n\n" #
    "💡 *Recharge/repair near optimal points for bonus effects!*";
  };

  /// Get the resonance window display for a specific action type
  public func getResonanceWindowDisplay(
    tokenIndex : Nat,
    maintenanceType : MaintenanceType,
    currentValue : Nat,
    now : Int,
  ) : Text {
    let resonance = calculateResonance(tokenIndex, maintenanceType, currentValue, now);

    let actionName = switch (maintenanceType) {
      case (#Recharge) { "Recharge" };
      case (#Repair) { "Repair" };
    };

    let currentLabel = switch (maintenanceType) {
      case (#Recharge) { "Battery" };
      case (#Repair) { "Condition" };
    };

    let (peakThreshold, goodThreshold) = switch (maintenanceType) {
      case (#Recharge) { (RECHARGE_PEAK_THRESHOLD, RECHARGE_GOOD_THRESHOLD) };
      case (#Repair) { (REPAIR_PEAK_THRESHOLD, REPAIR_GOOD_THRESHOLD) };
    };

    "**" # actionName # " Resonance**\n" #
    "• Current " # currentLabel # ": " # Nat.toText(currentValue) # "%\n" #
    "• Optimal Point: " # Nat.toText(resonance.optimalPoint) # "%\n" #
    "• Peak Zone: " # Nat.toText(Int.abs(Float.toInt(Float.fromInt(resonance.optimalPoint) - peakThreshold * 100.0))) # "-" #
    Nat.toText(Int.abs(Float.toInt(Float.fromInt(resonance.optimalPoint) + peakThreshold * 100.0))) # "%\n" #
    "• Good Zone: " # Nat.toText(Int.abs(Float.toInt(Float.fromInt(resonance.optimalPoint) - goodThreshold * 100.0))) # "-" #
    Nat.toText(Int.abs(Float.toInt(Float.fromInt(resonance.optimalPoint) + goodThreshold * 100.0))) # "%\n" #
    "• Status: " # resonance.resonanceStatus;
  };
};
