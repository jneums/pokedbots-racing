import RacingSimulator "RacingSimulator";

module {
  /// Centralized race class bracket definitions and utilities
  /// 
  /// RACE CLASS BRACKETS (by overall rating):
  /// - Scrap: 0-19
  /// - Junker: 20-29
  /// - Raider: 30-39
  /// - Elite: 40-49
  /// - SilentKlan: 50+
  ///
  /// Use these functions throughout the codebase to ensure consistency

  /// Determine race class from overall rating
  public func getRaceClassFromRating(overallRating : Nat) : RacingSimulator.RaceClass {
    if (overallRating >= 50) {
      #SilentKlan; // Top tier: 50+ (highly upgraded)
    } else if (overallRating >= 40) {
      #Elite; // High tier: 40-49
    } else if (overallRating >= 30) {
      #Raider; // Mid tier: 30-39
    } else if (overallRating >= 20) {
      #Junker; // Low tier: 20-29
    } else {
      #Scrap; // Bottom tier: 0-19
    };
  };

  /// Check if a rating is eligible for a specific race class
  public func isEligibleForClass(overallRating : Nat, raceClass : RacingSimulator.RaceClass) : Bool {
    switch (raceClass) {
      case (#Scrap) { overallRating < 20 };
      case (#Junker) { overallRating >= 20 and overallRating < 30 };
      case (#Raider) { overallRating >= 30 and overallRating < 40 };
      case (#Elite) { overallRating >= 40 and overallRating < 50 };
      case (#SilentKlan) { overallRating >= 50 };
    };
  };

  /// Get human-readable class name with rating range
  public func getClassDescription(raceClass : RacingSimulator.RaceClass) : Text {
    switch (raceClass) {
      case (#Scrap) { "Scrap (0-19 rating)" };
      case (#Junker) { "Junker (20-29 rating)" };
      case (#Raider) { "Raider (30-39 rating)" };
      case (#Elite) { "Elite (40-49 rating)" };
      case (#SilentKlan) { "Silent Klan Invitational (50+ rating)" };
    };
  };
};
