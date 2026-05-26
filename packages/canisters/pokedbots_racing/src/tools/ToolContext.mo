import Principal "mo:base/Principal";
import Result "mo:base/Result";
import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import Json "mo:json";

import PokedBotsGarage "../PokedBotsGarage";
import RacingSimulator "../RacingSimulator";
import ExtIntegration "../ExtIntegration";
import BettingManager "../BettingManager";
import RaceCalendar "../RaceCalendar";
import BotDedication "../BotDedication";
import TimerTool "mo:timer-tool";

module ToolContext {

  /// Context shared between tools and the main canister
  /// This contains all the state and configuration that tools need to access
  public type ToolContext = {
    /// The principal of the canister
    canisterPrincipal : Principal;
    /// The owner of the canister
    owner : Principal;
    /// The application context from the MCP SDK
    appContext : McpTypes.AppContext;
    /// Garage manager for PokedBots (collection-specific logic)
    garageManager : PokedBotsGarage.PokedBotsGarageManager;
    /// Race manager (generic racing simulator)
    raceManager : RacingSimulator.RaceManager;
    /// Betting manager (integrated betting system)
    bettingManager : BettingManager.BettingManager;
    /// Event calendar for event-based registration
    eventCalendar : RaceCalendar.EventCalendar;
    /// Bot dedication manager (per-bot investment/activity tracking for tier benefits)
    dedicationManager : BotDedication.DedicationManager;
    /// EXT canister interface for ownership verification
    extCanister : ExtIntegration.ExtCanisterInterface;
    /// EXT canister ID (needed for encoding token identifiers)
    extCanisterId : Principal;
    /// ICP Ledger canister ID (for payments)
    icpLedgerCanisterId : () -> ?Principal;
    /// Get cached marketplace listings
    getMarketplaceListings : () -> async [(Nat32, ExtIntegration.Listing, ExtIntegration.Metadata)];
    /// Timer tool for scheduling actions
    timerTool : TimerTool.TimerTool;
    /// Get NFT metadata for faction/stats derivation
    getNFTMetadata : (Nat) -> ?[(Text, Text)];
    /// Get robot racing stats (initialized bots only)
    getStats : (Nat) -> ?PokedBotsGarage.PokedBotRacingStats;
    /// Get current stats (base + bonuses) for an initialized bot
    getCurrentStats : (PokedBotsGarage.PokedBotRacingStats) -> {
      speed : Nat;
      powerCore : Nat;
      acceleration : Nat;
      stability : Nat;
    };
    /// Check if a bot is in any active race
    isInActiveRace : (Nat) -> Bool;
    /// Add a sponsor to a race
    addSponsor : (raceId : Nat, sponsor : Principal, amount : Nat, message : ?Text) -> ?RacingSimulator.Race;
    /// Check if registration is open for a race's event
    checkRegistrationWindow : (raceId : Nat, now : Int) -> Result.Result<(), Text>;
    /// Check if a bot is already entered in any race within the same event
    checkBotInEvent : (raceId : Nat, nftId : Text) -> Result.Result<(), Text>;
    /// Get user's starred bots (favorites)
    getUserStarredBots : (Principal) -> [Nat];
    /// Get user's bots tagged as racers
    getUserRacerBots : (Principal) -> [Nat];
    /// Get user's bots tagged as scavengers
    getUserScavengerBots : (Principal) -> [Nat];
    /// Track method call for diagnostics (method name, caller principal)
    trackMethodCall : (Text, Principal) -> ();
    /// Get starter bot slots for a user
    getStarterBotSlots : (Principal) -> PokedBotsGarage.StarterBotSlots;
    /// Set a starter bot slot (classOffset: 0=Scrap,1=Junker,2=Raider,3=Elite)
    setStarterBotSlot : (Principal, Nat, ?Nat) -> ();
    /// Award starter gear kit (6 Uncommon pieces, one per slot) to a starter bot
    awardStarterGear : (Principal, Nat) -> ();
  };

  /// Helper function to create an error response and invoke callback
  public func makeError(message : Text, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) {
    cb(#ok({ content = [#text({ text = "❌ Error: " # message })]; isError = true; structuredContent = null }));
  };

  /// Helper function to create a structured error response with machine-parseable fields
  /// Used for automation-friendly error handling (error_code, retryable, context)
  public func makeStructuredError(
    code : Text,
    message : Text,
    retryable : Bool,
    context : [(Text, Json.Json)],
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) {
    let structured = Json.obj([
      ("error", Json.bool(true)),
      ("error_code", Json.str(code)),
      ("error_message", Json.str(message)),
      ("retryable", Json.bool(retryable)),
      ("context", Json.obj(context)),
    ]);
    cb(#ok({ content = [#text({ text = "❌ Error: " # message })]; isError = true; structuredContent = ?structured }));
  };

  /// Helper function to create a success response with structured JSON and invoke callback
  public func makeSuccess(structured : Json.Json, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) {
    cb(#ok({ content = [#text({ text = Json.stringify(structured, null) })]; isError = false; structuredContent = ?structured }));
  };

  /// Helper function to create a success response with plain text and invoke callback
  public func makeTextSuccess(text : Text, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) {
    cb(#ok({ content = [#text({ text = text })]; isError = false; structuredContent = null }));
  };
};
