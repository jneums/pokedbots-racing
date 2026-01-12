import Map "mo:map/Map";
import { nhash } "mo:map/Map";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Array "mo:base/Array";

module {
  // ==========================================
  // BOT DEDICATION SYSTEM
  // ==========================================
  // Tracks per-bot investment (ICP spent) and activity (races, scavenging)
  // Awards Dedication Points (DP) that unlock tier benefits
  //
  // Investment: 1 ICP = 100 DP
  // Activity: Racing and scavenging earn DP over time
  //
  // Tiers unlock stat bonuses, cooldown reductions, and yield boosts
  // These bonuses help invested players compete with botted accounts
  // ==========================================

  // Tier thresholds in Dedication Points
  // Tier 0: 0 DP (Rookie)
  // Tier 1: 700 DP (Dedicated) - ~7 ICP or ~2 weeks active play
  // Tier 2: 2,700 DP (Veteran) - ~27 ICP or ~2 months active play
  // Tier 3: 8,000 DP (Champion) - ~80 ICP or ~7 months active play
  // Tier 4: 20,000 DP (Elite) - ~200 ICP or ~1.5 years active play
  // Tier 5: 60,000 DP (Legend) - ~600 ICP or ~4 years active play
  public let TIER_THRESHOLDS : [Nat] = [0, 700, 2700, 8000, 20000, 60000];

  public let TIER_NAMES : [Text] = ["Rookie", "Dedicated", "Veteran", "Champion", "Elite", "Legend"];

  // DP conversion rates
  public let DP_PER_ICP_E8S : Nat = 1; // 1 DP per 1,000,000 e8s (0.01 ICP) = 100 DP per ICP
  public let DP_PER_RACE : Nat = 5;
  public let DP_WIN_BONUS : Nat = 15;
  public let DP_PODIUM_BONUS : Nat = 8;
  public let DP_PER_SCAVENGING_RUN : Nat = 3;
  public let DP_PER_10_PARTS : Nat = 1;
  public let DP_PER_25_BATTERY : Nat = 1;
  public let DP_PER_10_CONDITION : Nat = 1;

  // Per-bot dedication profile
  public type BotDedicationProfile = {
    tokenIndex : Nat;

    // Total dedication points (investment + activity)
    totalDP : Nat;

    // Investment tracking (ICP spent)
    investmentDP : Nat;
    totalInvestedE8s : Nat;
    investmentBreakdown : {
      recharges : Nat; // e8s spent on recharges
      repairs : Nat; // e8s spent on repairs
      upgrades : Nat; // e8s spent on upgrades (ICP only, not parts)
      raceEntries : Nat; // e8s spent on race entries
      eventFees : Nat; // e8s spent on event registrations
    };

    // Activity tracking
    activityDP : Nat;
    activityStats : {
      racesCompleted : Nat;
      wins : Nat;
      podiums : Nat;
      scavengingRuns : Nat;
      partsCollected : Nat;
      batteryRestored : Nat;
      conditionRestored : Nat;
    };

    // Timestamps
    createdAt : Int;
    lastUpdated : Int;
  };

  // Tier benefits structure
  public type TierBenefits = {
    // Stat bonuses (applied to getCurrentStats, NOT rating calculation)
    speedBonus : Nat;
    accelerationBonus : Nat;
    powerCoreBonus : Nat;
    stabilityBonus : Nat;

    // Terrain bonus multiplier (1.0 = no bonus, 1.05 = +5%)
    terrainBonusPercent : Nat; // +1% per tier

    // Cooldown reductions (1.0 = full cooldown, 0.5 = half cooldown)
    rechargeCooldownMult : Float;
    repairCooldownMult : Float;

    // Yield bonuses
    scavengingYieldMult : Float;

    // Upgrade discount
    upgradeDiscountMult : Float;
  };

  // Manager class for bot dedication system
  public class DedicationManager(dedicationMap : Map.Map<Nat, BotDedicationProfile>) {

    // ===== TIER CALCULATION =====

    public func calculateTier(totalDP : Nat) : Nat {
      if (totalDP >= 60000) { 5 } else if (totalDP >= 20000) { 4 } else if (totalDP >= 8000) {
        3;
      } else if (totalDP >= 2700) { 2 } else if (totalDP >= 700) { 1 } else {
        0;
      };
    };

    public func getTierName(tier : Nat) : Text {
      if (tier >= TIER_NAMES.size()) { "Unknown" } else { TIER_NAMES[tier] };
    };

    public func getNextTierThreshold(currentDP : Nat) : ?Nat {
      let currentTier = calculateTier(currentDP);
      if (currentTier >= 5) { null } else { ?TIER_THRESHOLDS[currentTier + 1] };
    };

    // ===== TIER BENEFITS =====

    public func getTierBenefits(tier : Nat) : TierBenefits {
      switch (tier) {
        case (0) {
          // Rookie - no bonuses
          {
            speedBonus = 0;
            accelerationBonus = 0;
            powerCoreBonus = 0;
            stabilityBonus = 0;
            terrainBonusPercent = 0;
            rechargeCooldownMult = 1.0;
            repairCooldownMult = 1.0;
            scavengingYieldMult = 1.0;
            upgradeDiscountMult = 1.0;
          };
        };
        case (1) {
          // Dedicated: +1 Speed, +1% terrain, +10% scav, -10% recharge CD
          {
            speedBonus = 1;
            accelerationBonus = 0;
            powerCoreBonus = 0;
            stabilityBonus = 0;
            terrainBonusPercent = 1;
            rechargeCooldownMult = 0.90;
            repairCooldownMult = 1.0;
            scavengingYieldMult = 1.10;
            upgradeDiscountMult = 1.0;
          };
        };
        case (2) {
          // Veteran: +1 Speed, +1 Accel, +2% terrain, +15% scav, -20% recharge, -10% repair
          {
            speedBonus = 1;
            accelerationBonus = 1;
            powerCoreBonus = 0;
            stabilityBonus = 0;
            terrainBonusPercent = 2;
            rechargeCooldownMult = 0.80;
            repairCooldownMult = 0.90;
            scavengingYieldMult = 1.15;
            upgradeDiscountMult = 1.0;
          };
        };
        case (3) {
          // Champion: +2 Speed, +1 Accel, +1 Power, +3% terrain, +20% scav, -30% recharge, -20% repair, -5% upgrade
          {
            speedBonus = 2;
            accelerationBonus = 1;
            powerCoreBonus = 1;
            stabilityBonus = 0;
            terrainBonusPercent = 3;
            rechargeCooldownMult = 0.70;
            repairCooldownMult = 0.80;
            scavengingYieldMult = 1.20;
            upgradeDiscountMult = 0.95;
          };
        };
        case (4) {
          // Elite: +2 Speed, +2 Accel, +1 Power, +1 Stability, +4% terrain, +25% scav, -40% recharge, -30% repair, -10% upgrade
          {
            speedBonus = 2;
            accelerationBonus = 2;
            powerCoreBonus = 1;
            stabilityBonus = 1;
            terrainBonusPercent = 4;
            rechargeCooldownMult = 0.60;
            repairCooldownMult = 0.70;
            scavengingYieldMult = 1.25;
            upgradeDiscountMult = 0.90;
          };
        };
        case (5) {
          // Legend: +3 ALL stats, +5% terrain, +30% scav, -50% recharge, -40% repair, -15% upgrade
          {
            speedBonus = 3;
            accelerationBonus = 3;
            powerCoreBonus = 3;
            stabilityBonus = 3;
            terrainBonusPercent = 5;
            rechargeCooldownMult = 0.50;
            repairCooldownMult = 0.60;
            scavengingYieldMult = 1.30;
            upgradeDiscountMult = 0.85;
          };
        };
        case (_) {
          // Fallback to Legend for any higher tier
          getTierBenefits(5);
        };
      };
    };

    // ===== PROFILE MANAGEMENT =====

    public func getProfile(tokenIndex : Nat) : ?BotDedicationProfile {
      Map.get(dedicationMap, nhash, tokenIndex);
    };

    public func getOrCreateProfile(tokenIndex : Nat, now : Int) : BotDedicationProfile {
      switch (Map.get(dedicationMap, nhash, tokenIndex)) {
        case (?profile) { profile };
        case (null) {
          let newProfile : BotDedicationProfile = {
            tokenIndex = tokenIndex;
            totalDP = 0;
            investmentDP = 0;
            totalInvestedE8s = 0;
            investmentBreakdown = {
              recharges = 0;
              repairs = 0;
              upgrades = 0;
              raceEntries = 0;
              eventFees = 0;
            };
            activityDP = 0;
            activityStats = {
              racesCompleted = 0;
              wins = 0;
              podiums = 0;
              scavengingRuns = 0;
              partsCollected = 0;
              batteryRestored = 0;
              conditionRestored = 0;
            };
            createdAt = now;
            lastUpdated = now;
          };
          Map.set(dedicationMap, nhash, tokenIndex, newProfile);
          newProfile;
        };
      };
    };

    private func updateProfile(profile : BotDedicationProfile) {
      Map.set(dedicationMap, nhash, profile.tokenIndex, profile);
    };

    // ===== INVESTMENT DP (ICP Spending) =====

    // Record ICP spent on recharge
    public func recordRecharge(tokenIndex : Nat, amountE8s : Nat, now : Int) {
      let profile = getOrCreateProfile(tokenIndex, now);
      let dpEarned = amountE8s / 1_000_000; // 1 DP per 0.01 ICP

      let updatedProfile = {
        profile with
        totalDP = profile.totalDP + dpEarned;
        investmentDP = profile.investmentDP + dpEarned;
        totalInvestedE8s = profile.totalInvestedE8s + amountE8s;
        investmentBreakdown = {
          profile.investmentBreakdown with
          recharges = profile.investmentBreakdown.recharges + amountE8s;
        };
        lastUpdated = now;
      };
      updateProfile(updatedProfile);
    };

    // Record ICP spent on repair
    public func recordRepair(tokenIndex : Nat, amountE8s : Nat, now : Int) {
      let profile = getOrCreateProfile(tokenIndex, now);
      let dpEarned = amountE8s / 1_000_000;

      let updatedProfile = {
        profile with
        totalDP = profile.totalDP + dpEarned;
        investmentDP = profile.investmentDP + dpEarned;
        totalInvestedE8s = profile.totalInvestedE8s + amountE8s;
        investmentBreakdown = {
          profile.investmentBreakdown with
          repairs = profile.investmentBreakdown.repairs + amountE8s;
        };
        lastUpdated = now;
      };
      updateProfile(updatedProfile);
    };

    // Record ICP spent on upgrade (NOT parts)
    public func recordUpgrade(tokenIndex : Nat, amountE8s : Nat, now : Int) {
      let profile = getOrCreateProfile(tokenIndex, now);
      let dpEarned = amountE8s / 1_000_000;

      let updatedProfile = {
        profile with
        totalDP = profile.totalDP + dpEarned;
        investmentDP = profile.investmentDP + dpEarned;
        totalInvestedE8s = profile.totalInvestedE8s + amountE8s;
        investmentBreakdown = {
          profile.investmentBreakdown with
          upgrades = profile.investmentBreakdown.upgrades + amountE8s;
        };
        lastUpdated = now;
      };
      updateProfile(updatedProfile);
    };

    // Record ICP spent on race entry
    public func recordRaceEntry(tokenIndex : Nat, amountE8s : Nat, now : Int) {
      let profile = getOrCreateProfile(tokenIndex, now);
      let dpEarned = amountE8s / 1_000_000;

      let updatedProfile = {
        profile with
        totalDP = profile.totalDP + dpEarned;
        investmentDP = profile.investmentDP + dpEarned;
        totalInvestedE8s = profile.totalInvestedE8s + amountE8s;
        investmentBreakdown = {
          profile.investmentBreakdown with
          raceEntries = profile.investmentBreakdown.raceEntries + amountE8s;
        };
        lastUpdated = now;
      };
      updateProfile(updatedProfile);
    };

    // Record ICP spent on event registration
    public func recordEventRegistration(tokenIndex : Nat, amountE8s : Nat, now : Int) {
      let profile = getOrCreateProfile(tokenIndex, now);
      let dpEarned = amountE8s / 1_000_000;

      let updatedProfile = {
        profile with
        totalDP = profile.totalDP + dpEarned;
        investmentDP = profile.investmentDP + dpEarned;
        totalInvestedE8s = profile.totalInvestedE8s + amountE8s;
        investmentBreakdown = {
          profile.investmentBreakdown with
          eventFees = profile.investmentBreakdown.eventFees + amountE8s;
        };
        lastUpdated = now;
      };
      updateProfile(updatedProfile);
    };

    // ===== ACTIVITY DP =====

    // Record race completion
    public func recordRaceCompletion(tokenIndex : Nat, position : Nat, now : Int) {
      let profile = getOrCreateProfile(tokenIndex, now);

      // Base DP for completing race
      var dpEarned = DP_PER_RACE;
      var newWins = profile.activityStats.wins;
      var newPodiums = profile.activityStats.podiums;

      // Bonus for placement
      if (position == 1) {
        dpEarned += DP_WIN_BONUS;
        newWins += 1;
      } else if (position == 2 or position == 3) {
        dpEarned += DP_PODIUM_BONUS;
        newPodiums += 1;
      };

      let updatedProfile = {
        profile with
        totalDP = profile.totalDP + dpEarned;
        activityDP = profile.activityDP + dpEarned;
        activityStats = {
          profile.activityStats with
          racesCompleted = profile.activityStats.racesCompleted + 1;
          wins = newWins;
          podiums = newPodiums;
        };
        lastUpdated = now;
      };
      updateProfile(updatedProfile);
    };

    // Record scavenging completion
    public func recordScavengingCompletion(tokenIndex : Nat, partsCollected : Nat, now : Int) {
      let profile = getOrCreateProfile(tokenIndex, now);

      // Base DP for completing run + bonus for parts
      let partsBonus = partsCollected / 10; // 1 DP per 10 parts
      let dpEarned = DP_PER_SCAVENGING_RUN + partsBonus;

      let updatedProfile = {
        profile with
        totalDP = profile.totalDP + dpEarned;
        activityDP = profile.activityDP + dpEarned;
        activityStats = {
          profile.activityStats with
          scavengingRuns = profile.activityStats.scavengingRuns + 1;
          partsCollected = profile.activityStats.partsCollected + partsCollected;
        };
        lastUpdated = now;
      };
      updateProfile(updatedProfile);
    };

    // Record battery restoration (from free charging station or paid recharge)
    public func recordBatteryRestored(tokenIndex : Nat, amount : Nat, now : Int) {
      let profile = getOrCreateProfile(tokenIndex, now);

      // Calculate DP: 1 DP per 25 battery restored
      let dpEarned = amount / 25;

      if (dpEarned > 0) {
        let updatedProfile = {
          profile with
          totalDP = profile.totalDP + dpEarned;
          activityDP = profile.activityDP + dpEarned;
          activityStats = {
            profile.activityStats with
            batteryRestored = profile.activityStats.batteryRestored + amount;
          };
          lastUpdated = now;
        };
        updateProfile(updatedProfile);
      };
    };

    // Record condition restoration (from free repair bay or paid repair)
    public func recordConditionRestored(tokenIndex : Nat, amount : Nat, now : Int) {
      let profile = getOrCreateProfile(tokenIndex, now);

      // Calculate DP: 1 DP per 10 condition restored
      let dpEarned = amount / 10;

      if (dpEarned > 0) {
        let updatedProfile = {
          profile with
          totalDP = profile.totalDP + dpEarned;
          activityDP = profile.activityDP + dpEarned;
          activityStats = {
            profile.activityStats with
            conditionRestored = profile.activityStats.conditionRestored + amount;
          };
          lastUpdated = now;
        };
        updateProfile(updatedProfile);
      };
    };

    // ===== QUERY HELPERS =====

    public func getTierForBot(tokenIndex : Nat) : Nat {
      switch (getProfile(tokenIndex)) {
        case (?profile) { calculateTier(profile.totalDP) };
        case (null) { 0 };
      };
    };

    public func getBenefitsForBot(tokenIndex : Nat) : TierBenefits {
      getTierBenefits(getTierForBot(tokenIndex));
    };

    // Get summary for UI display
    public func getDedicationSummary(tokenIndex : Nat) : {
      tier : Nat;
      tierName : Text;
      totalDP : Nat;
      investmentDP : Nat;
      activityDP : Nat;
      totalInvestedICP : Float;
      nextTierDP : ?Nat;
      nextTierName : ?Text;
      progressPercent : Nat;
      benefits : TierBenefits;
    } {
      switch (getProfile(tokenIndex)) {
        case (?profile) {
          let tier = calculateTier(profile.totalDP);
          let nextThreshold = getNextTierThreshold(profile.totalDP);
          let currentThreshold = TIER_THRESHOLDS[tier];

          let progress = switch (nextThreshold) {
            case (?next) {
              let range = next - currentThreshold;
              let progress = profile.totalDP - currentThreshold;
              if (range > 0) { (progress * 100) / range } else { 100 };
            };
            case (null) { 100 }; // Max tier
          };

          let nextName = if (tier < 5) { ?getTierName(tier + 1) } else { null };

          {
            tier = tier;
            tierName = getTierName(tier);
            totalDP = profile.totalDP;
            investmentDP = profile.investmentDP;
            activityDP = profile.activityDP;
            totalInvestedICP = Float.fromInt(profile.totalInvestedE8s) / 100_000_000.0;
            nextTierDP = nextThreshold;
            nextTierName = nextName;
            progressPercent = progress;
            benefits = getTierBenefits(tier);
          };
        };
        case (null) {
          {
            tier = 0;
            tierName = "Rookie";
            totalDP = 0;
            investmentDP = 0;
            activityDP = 0;
            totalInvestedICP = 0.0;
            nextTierDP = ?700;
            nextTierName = ?"Dedicated";
            progressPercent = 0;
            benefits = getTierBenefits(0);
          };
        };
      };
    };

    // Get all profiles (for admin/debug)
    public func getAllProfiles() : [(Nat, BotDedicationProfile)] {
      let buffer = Buffer.Buffer<(Nat, BotDedicationProfile)>(Map.size(dedicationMap));
      for ((tokenIndex, profile) in Map.entries(dedicationMap)) {
        buffer.add((tokenIndex, profile));
      };
      Buffer.toArray(buffer);
    };

    // Get profile count
    public func getProfileCount() : Nat {
      Map.size(dedicationMap);
    };
  };
};
