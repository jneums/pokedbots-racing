import Principal "mo:base/Principal";
import Racing "Racing";

module {
  // Old racing stats type before adding listedForSale field
  public type OldPokedBotRacingStats = {
    tokenIndex : Nat;
    ownerPrincipal : Principal;
    faction : Racing.FactionType;
    speedBonus : Nat;
    powerCoreBonus : Nat;
    accelerationBonus : Nat;
    stabilityBonus : Nat;
    battery : Nat;
    condition : Nat;
    calibration : Nat;
    experience : Nat;
    preferredDistance : Racing.Distance;
    preferredTerrain : Racing.Terrain;
    racesEntered : Nat;
    wins : Nat;
    places : Nat;
    shows : Nat;
    totalScrapEarned : Nat;
    factionReputation : Nat;
    activatedAt : Int;
    lastRecharged : ?Int;
    lastRepaired : ?Int;
    lastDiagnostics : ?Int;
    lastRaced : ?Int;
    upgradeEndsAt : ?Int;
  };
};
