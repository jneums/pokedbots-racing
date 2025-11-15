import Principal "mo:base/Principal";
import Result "mo:base/Result";
import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import Json "mo:json";

import Racing "../Racing";
import ExtIntegration "../ExtIntegration";

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
    /// Racing stats manager for PokedBots
    racingStatsManager : Racing.RacingStatsManager;
    /// EXT canister interface for ownership verification
    extCanister : ExtIntegration.ExtCanisterInterface;
    /// EXT canister ID (needed for encoding token identifiers)
    extCanisterId : Principal;
    /// Get cached marketplace listings
    getMarketplaceListings : () -> async [(Nat32, ExtIntegration.Listing, ExtIntegration.Metadata)];
  };

  /// Helper function to create an error response and invoke callback
  public func makeError(message : Text, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) {
    cb(#ok({ content = [#text({ text = "❌ Error: " # message })]; isError = true; structuredContent = null }));
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
