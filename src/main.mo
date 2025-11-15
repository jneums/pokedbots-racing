import Result "mo:base/Result";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";
import Principal "mo:base/Principal";
import Option "mo:base/Option";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Nat32 "mo:base/Nat32";

import HttpTypes "mo:http-types";
import Map "mo:map/Map";
import IC "mo:ic";

import AuthCleanup "mo:mcp-motoko-sdk/auth/Cleanup";
import AuthState "mo:mcp-motoko-sdk/auth/State";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";

import Mcp "mo:mcp-motoko-sdk/mcp/Mcp";
import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import HttpHandler "mo:mcp-motoko-sdk/mcp/HttpHandler";
import Cleanup "mo:mcp-motoko-sdk/mcp/Cleanup";
import State "mo:mcp-motoko-sdk/mcp/State";
import Payments "mo:mcp-motoko-sdk/mcp/Payments";
import HttpAssets "mo:mcp-motoko-sdk/mcp/HttpAssets";
import Beacon "mo:mcp-motoko-sdk/mcp/Beacon";
import ApiKey "mo:mcp-motoko-sdk/auth/ApiKey";

import SrvTypes "mo:mcp-motoko-sdk/server/Types";

// Import tool modules
import ToolContext "tools/ToolContext";
import GetWeather "tools/get_weather";
import GarageListMyPokedBots "tools/garage_list_my_pokedbots";
import MarketplaceBrowsePokedBots "tools/marketplace_browse_pokedbots";
import MarketplacePurchasePokedBot "tools/marketplace_purchase_pokedbot";

// Import Stats module for NFT metadata
import Stats "Stats";

// Import Racing modules
import Racing "Racing";
import ExtIntegration "ExtIntegration";

shared ({ caller = deployer }) persistent actor class McpServer(
  args : ?{
    owner : ?Principal;
  }
) = self {

  // The canister owner, who can manage treasury funds.
  // Defaults to the deployer if not specified.
  var owner : Principal = Option.get(do ? { args!.owner! }, deployer);

  // State for certified HTTP assets (like /.well-known/...)
  var stable_http_assets : HttpAssets.StableEntries = [];
  transient let http_assets = HttpAssets.init(stable_http_assets);

  // NFT metadata storage
  transient let statsManager = Stats.StatsManager();

  // Resource contents stored in memory for simplicity.
  // In a real application these would probably be uploaded or user generated.
  var resourceContents = [
    ("file:///main.py", "print('Hello from main.py!')"),
    ("file:///README.md", "# MCP Motoko Server"),
  ];

  // The application context that holds our state.
  var appContext : McpTypes.AppContext = State.init(resourceContents);

  // =================================================================================
  // --- AUTHENTICATION & EXT INTEGRATION ---
  // Authentication is enabled to get the user's principal for EXT ownership verification
  // =================================================================================

  // PokedBots EXT Canister ID
  let extCanisterId = Principal.fromText("bzsui-sqaaa-aaaah-qce2a-cai");
  transient let extCanister = ExtIntegration.getExtCanister(extCanisterId);

  // Racing stats manager
  transient let racingStatsManager = Racing.RacingStatsManager();

  // Marketplace listings cache (refreshed periodically)
  type CachedListings = {
    listings: [(Nat32, ExtIntegration.Listing, ExtIntegration.Metadata)];
    timestamp: Int;
  };
  var marketplaceCache : ?CachedListings = null;
  let CACHE_TTL_SECONDS : Int = 300; // 5 minutes

  let issuerUrl = "https://bfggx-7yaaa-aaaai-q32gq-cai.icp0.io";
  let allowanceUrl = "https://prometheusprotocol.org/connections";
  let requiredScopes = ["openid"];

  // Function to transform the response for jwks client
  public query func transformJwksResponse({
    context : Blob;
    response : IC.HttpRequestResult;
  }) : async IC.HttpRequestResult {
    {
      response with headers = []; // not interested in the headers
    };
  };

  // Initialize the auth context with the issuer URL and required scopes.
  let authContext : ?AuthTypes.AuthContext = ?AuthState.init(
    Principal.fromActor(self),
    owner,
    issuerUrl,
    requiredScopes,
    transformJwksResponse,
  );

  // =================================================================================
  // --- OPT-IN: USAGE ANALYTICS (BEACON) ---
  // To enable anonymous usage analytics, uncomment the `beaconContext` initialization.
  // This helps the Prometheus Protocol DAO understand ecosystem growth.
  // =================================================================================

  transient let beaconContext : ?Beacon.BeaconContext = null;

  // --- UNCOMMENT THIS BLOCK TO ENABLE THE BEACON ---
  /*
  let beaconCanisterId = Principal.fromText("m63pw-fqaaa-aaaai-q33pa-cai");
  transient let beaconContext : ?Beacon.BeaconContext = ?Beacon.init(
      beaconCanisterId, // Public beacon canister ID
      ?(15 * 60), // Send a beacon every 15 minutes
  );
  */
  // --- END OF BEACON BLOCK ---

  // --- Timers ---
  Cleanup.startCleanupTimer<system>(appContext);

  // The AuthCleanup timer only needs to run if authentication is enabled.
  switch (authContext) {
    case (?ctx) { AuthCleanup.startCleanupTimer<system>(ctx) };
    case (null) { Debug.print("Authentication is disabled.") };
  };

  // The Beacon timer only needs to run if the beacon is enabled.
  switch (beaconContext) {
    case (?ctx) { Beacon.startTimer<system>(ctx) };
    case (null) { Debug.print("Beacon is disabled.") };
  };

  // --- 1. DEFINE YOUR RESOURCES & TOOLS ---
  transient let resources : [McpTypes.Resource] = [
    {
      uri = "file:///main.py";
      name = "main.py";
      title = ?"Main Python Script";
      description = ?"Contains the main logic of the application.";
      mimeType = ?"text/x-python";
    },
    {
      uri = "file:///README.md";
      name = "README.md";
      title = ?"Project Documentation";
      description = null;
      mimeType = ?"text/markdown";
    },
  ];

  // Function to get marketplace listings with caching
  func getMarketplaceListings() : async [(Nat32, ExtIntegration.Listing, ExtIntegration.Metadata)] {
    let now = Time.now();
    
    switch (marketplaceCache) {
      case (?cache) {
        // Check if cache is still valid
        let age = (now - cache.timestamp) / 1_000_000_000; // Convert to seconds
        if (age < CACHE_TTL_SECONDS) {
          return cache.listings;
        };
      };
      case (null) {};
    };
    
    // Cache expired or doesn't exist, fetch fresh data
    let listings = await extCanister.listings();
    marketplaceCache := ?{
      listings = listings;
      timestamp = now;
    };
    
    return listings;
  };

  // Create the tool context that will be passed to all tools
  transient let toolContext : ToolContext.ToolContext = {
    canisterPrincipal = Principal.fromActor(self);
    owner = owner;
    appContext = appContext;
    racingStatsManager = racingStatsManager;
    extCanister = extCanister;
    extCanisterId = extCanisterId;
    getMarketplaceListings = getMarketplaceListings;
  };

  // Import tool configurations from separate modules
  transient let tools : [McpTypes.Tool] = [
    GetWeather.config(),
    GarageListMyPokedBots.config(),
    MarketplaceBrowsePokedBots.config(),
    MarketplacePurchasePokedBot.config(),
  ];

  // --- 2. CONFIGURE THE SDK ---
  transient let mcpConfig : McpTypes.McpConfig = {
    self = Principal.fromActor(self);
    allowanceUrl = ?allowanceUrl;
    serverInfo = {
      name = "pokedbots-wasteland-racing";
      title = "PokedBots Wasteland Racing";
      version = "0.1.0";
    };
    resources = resources;
    resourceReader = func(uri) {
      Map.get(appContext.resourceContents, Map.thash, uri);
    };
    tools = tools;
    toolImplementations = [
      ("get_weather", GetWeather.handle(toolContext)),
      ("garage_list_my_pokedbots", GarageListMyPokedBots.handler(toolContext)),
      ("browse_pokedbots", MarketplaceBrowsePokedBots.handle(toolContext)),
      ("purchase_pokedbot", MarketplacePurchasePokedBot.handle(toolContext)),
    ];
    beacon = beaconContext;
  };

  // --- 3. CREATE THE SERVER LOGIC ---
  transient let mcpServer = Mcp.createServer(mcpConfig);

  // --- PUBLIC ENTRY POINTS ---

  // Do not remove these public methods below. They are required for the MCP Registry and MCP Orchestrator
  // to manage the canister upgrades and installs, handle payments, and allow owner only methods.

  /// Get the current owner of the canister.
  public query func get_owner() : async Principal { return owner };

  /// Set a new owner for the canister. Only the current owner can call this.
  public shared ({ caller }) func set_owner(new_owner : Principal) : async Result.Result<(), Payments.TreasuryError> {
    if (caller != owner) { return #err(#NotOwner) };
    owner := new_owner;
    return #ok(());
  };

  /// Get the canister's balance of a specific ICRC-1 token.
  public shared func get_treasury_balance(ledger_id : Principal) : async Nat {
    return await Payments.get_treasury_balance(Principal.fromActor(self), ledger_id);
  };

  /// Withdraw tokens from the canister's treasury to a specified destination.
  public shared ({ caller }) func withdraw(
    ledger_id : Principal,
    amount : Nat,
    destination : Payments.Destination,
  ) : async Result.Result<Nat, Payments.TreasuryError> {
    return await Payments.withdraw(
      caller,
      owner,
      ledger_id,
      amount,
      destination,
    );
  };

  // Helper to create the HTTP context for each request.
  private func _create_http_context() : HttpHandler.Context {
    return {
      self = Principal.fromActor(self);
      active_streams = appContext.activeStreams;
      mcp_server = mcpServer;
      streaming_callback = http_request_streaming_callback;
      // This passes the optional auth context to the handler.
      // If it's `null`, the handler will skip all auth checks.
      auth = authContext;
      http_asset_cache = ?http_assets.cache;
      mcp_path = ?"/mcp";
    };
  };

  /// Handle incoming HTTP requests.
  public query func http_request(req : SrvTypes.HttpRequest) : async SrvTypes.HttpResponse {
    let ctx : HttpHandler.Context = _create_http_context();
    // Ask the SDK to handle the request
    switch (HttpHandler.http_request(ctx, req)) {
      case (?mcpResponse) {
        // The SDK handled it, so we return its response.
        return mcpResponse;
      };
      case (null) {
        // The SDK ignored it. Now we can handle our own custom routes.
        if (req.url == "/") {
          // e.g., Serve a frontend asset
          return {
            status_code = 200;
            headers = [("Content-Type", "text/html")];
            body = Text.encodeUtf8("<h1>My Canister Frontend</h1>");
            upgrade = null;
            streaming_strategy = null;
          };
        } else {
          // Return a 404 for any other unhandled routes.
          return {
            status_code = 404;
            headers = [];
            body = Blob.fromArray([]);
            upgrade = null;
            streaming_strategy = null;
          };
        };
      };
    };
  };

  /// Handle incoming HTTP requests that modify state (e.g., POST).
  public shared func http_request_update(req : SrvTypes.HttpRequest) : async SrvTypes.HttpResponse {
    let ctx : HttpHandler.Context = _create_http_context();

    // Ask the SDK to handle the request
    let mcpResponse = await HttpHandler.http_request_update(ctx, req);

    switch (mcpResponse) {
      case (?res) {
        // The SDK handled it.
        return res;
      };
      case (null) {
        // The SDK ignored it. Handle custom update calls here.
        return {
          status_code = 404;
          headers = [];
          body = Blob.fromArray([]);
          upgrade = null;
          streaming_strategy = null;
        };
      };
    };
  };

  /// Handle streaming callbacks for large HTTP responses.
  public query func http_request_streaming_callback(token : HttpTypes.StreamingToken) : async ?HttpTypes.StreamingCallbackResponse {
    let ctx : HttpHandler.Context = _create_http_context();
    return HttpHandler.http_request_streaming_callback(ctx, token);
  };

  // --- NFT METADATA PUBLIC METHODS ---

  /// Upload trait schema (owner only, done once)
  public shared ({ caller }) func upload_trait_schema(
    schemaData : Stats.TraitSchema
  ) : async Result.Result<(), Text> {
    if (caller != owner) {
      return #err("Only the owner can upload schema");
    };
    statsManager.setSchema(schemaData);
    #ok(());
  };

  /// Upload NFT stats in batch (owner only for security)
  /// Stats are stored as raw integer arrays [type_id, body_id, driver_id, ...]
  public shared ({ caller }) func upload_nft_stats_batch(
    batch : [(Nat, Stats.NFTStats)]
  ) : async Result.Result<(), Text> {
    if (caller != owner) {
      return #err("Only the owner can upload stats");
    };
    statsManager.addBatchStats(batch);
    #ok(());
  };

  /// Get raw stats for a specific NFT (returns integer array)
  public query func get_nft_stats(tokenId : Nat) : async ?Stats.NFTStats {
    statsManager.getNFTStats(tokenId);
  };

  /// Get decoded metadata for a specific NFT (public query)
  public query func get_nft_metadata(tokenId : Nat) : async ?Stats.NFTMetadata {
    statsManager.getNFTMetadata(tokenId);
  };

  /// Get metadata by EXT token identifier (public query)
  public query func get_nft_metadata_by_identifier(tokenIdentifier : Text) : async ?Stats.NFTMetadata {
    statsManager.getNFTMetadataByIdentifier(tokenIdentifier);
  };

  /// Get raw stats by EXT token identifier (public query)
  public query func get_nft_stats_by_identifier(tokenIdentifier : Text) : async ?Stats.NFTStats {
    statsManager.getNFTStatsByIdentifier(tokenIdentifier);
  };

  /// Decode EXT token identifier to get token index (public query)
  public query func decode_token_identifier(tokenIdentifier : Text) : async Nat {
    Nat32.toNat(Stats.getTokenIndex(tokenIdentifier));
  };

  /// Encode token index to EXT token identifier (public query)
  public query func encode_token_identifier(tokenIndex : Nat32) : async Text {
    ExtIntegration.encodeTokenIdentifier(tokenIndex, extCanisterId);
  };

  /// Get decoded metadata for multiple NFTs in one call (public query)
  public query func get_nft_metadata_batch(tokenIds : [Nat]) : async [(Nat, ?Stats.NFTMetadata)] {
    statsManager.getBatchMetadata(tokenIds);
  };

  /// Get paginated NFT metadata (decoded, public query)
  public query func get_nft_metadata_page(offset : Nat, limit : Nat) : async [(Nat, Stats.NFTMetadata)] {
    statsManager.getStatsPage(offset, limit);
  };

  /// Get the trait schema (public query)
  public query func get_trait_schema() : async Stats.TraitSchema {
    statsManager.getSchema();
  };

  /// Get total count of NFTs with metadata stored
  public query func get_total_nft_count() : async Nat {
    statsManager.getTotalCount();
  };

  /// Get all token IDs that have metadata
  public query func get_all_token_ids() : async [Nat] {
    statsManager.getAllTokenIds();
  };

  /// Get a specific trait value ID by trait index (for calculations)
  public query func get_nft_trait_value(tokenId : Nat, traitIndex : Nat) : async ?Nat {
    statsManager.getTraitValue(tokenId, traitIndex);
  };

  /// Get a decoded trait value by trait name (for display)
  public query func get_nft_trait(tokenId : Nat, traitName : Text) : async ?Text {
    statsManager.getTraitValueByName(tokenId, traitName);
  };

  // --- CANISTER LIFECYCLE MANAGEMENT ---

  system func preupgrade() {
    stable_http_assets := HttpAssets.preupgrade(http_assets);
  };

  system func postupgrade() {
    HttpAssets.postupgrade(http_assets);
  };

  /**
   * Creates a new API key. This API key is linked to the caller's principal.
   * @param name A human-readable name for the key.
   * @returns The raw, unhashed API key. THIS IS THE ONLY TIME IT WILL BE VISIBLE.
   */
  public shared (msg) func create_my_api_key(name : Text, scopes : [Text]) : async Text {
    switch (authContext) {
      case (null) {
        Debug.trap("Authentication is not enabled on this canister.");
      };
      case (?ctx) {
        return await ApiKey.create_my_api_key(
          ctx,
          msg.caller,
          name,
          scopes,
        );
      };
    };
  };

  /** Revoke (delete) an API key owned by the caller.
   * @param key_id The ID of the key to revoke.
   * @returns True if the key was found and revoked, false otherwise.
   */
  public shared (msg) func revoke_my_api_key(key_id : Text) : async () {
    switch (authContext) {
      case (null) {
        Debug.trap("Authentication is not enabled on this canister.");
      };
      case (?ctx) {
        return ApiKey.revoke_my_api_key(ctx, msg.caller, key_id);
      };
    };
  };

  /** List all API keys owned by the caller.
   * @returns A list of API key metadata (but not the raw keys).
   */
  public query (msg) func list_my_api_keys() : async [AuthTypes.ApiKeyMetadata] {
    switch (authContext) {
      case (null) {
        Debug.trap("Authentication is not enabled on this canister.");
      };
      case (?ctx) {
        return ApiKey.list_my_api_keys(ctx, msg.caller);
      };
    };
  };

  public type UpgradeFinishedResult = {
    #InProgress : Nat;
    #Failed : (Nat, Text);
    #Success : Nat;
  };
  private func natNow() : Nat {
    return Int.abs(Time.now());
  };
  /* Return success after post-install/upgrade operations complete.
   * The Nat value is a timestamp (in nanoseconds) of when the upgrade finished.
   * If the upgrade is still in progress, return #InProgress with a timestamp of when it started.
   * If the upgrade failed, return #Failed with a timestamp and an error message.
   */
  public func icrc120_upgrade_finished() : async UpgradeFinishedResult {
    #Success(natNow());
  };
};
