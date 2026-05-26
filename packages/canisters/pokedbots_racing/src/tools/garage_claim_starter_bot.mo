import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Map "mo:map/Map";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import PokedBotsGarage "../PokedBotsGarage";
import UsernameValidator "../UsernameValidator";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_claim_starter_bot";
    title = ?"Claim Free Starter Bot";
    description = ?"Create a free starter bot to begin racing without an NFT or ICP. Pick your class (Scrap/Junker/Raider/Elite) and faction (Game/Animal/Industrial/Food). One bot per class, four slots total. Full racing capabilities — upgrades, gear, scavenging, paid events, prize money. Delete and recreate to change faction.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([
        ("race_class", Json.obj([
          ("type", Json.str("string")),
          ("enum", Json.arr([Json.str("Scrap"), Json.str("Junker"), Json.str("Raider"), Json.str("Elite")])),
          ("description", Json.str("Which bracket to create a starter bot for. Base stats: Scrap=19, Junker=29, Raider=39, Elite=49 (all four stats equal)."))
        ])),
        ("faction", Json.obj([
          ("type", Json.str("string")),
          ("enum", Json.arr([Json.str("Game"), Json.str("Animal"), Json.str("Industrial"), Json.str("Food")])),
          ("description", Json.str("Faction determines terrain bonuses and play style. Game: +8% WastelandSand. Animal: +3% balanced. Industrial: +5% Power/Stability. Food: +8% condition recovery."))
        ])),
        ("name", Json.obj([
          ("type", Json.str("string")),
          ("description", Json.str("Optional: Custom name for your bot (max 30 characters)."))
        ]))
      ])),
      ("required", Json.arr([Json.str("race_class"), Json.str("faction")])),
    ]);
    outputSchema = null;
  };

  public func handle(ctx : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {
      let user = switch (_auth) {
        case (null) { return ToolContext.makeError("Authentication required", cb) };
        case (?auth) { auth.principal };
      };

      let raceClass = switch (Result.toOption(Json.getAsText(_args, "race_class"))) {
        case (null) { return ToolContext.makeError("Missing required argument: race_class", cb) };
        case (?c) { c };
      };

      let faction = switch (Result.toOption(Json.getAsText(_args, "faction"))) {
        case (null) { return ToolContext.makeError("Missing required argument: faction", cb) };
        case (?f) { f };
      };

      let customName = switch (Result.toOption(Json.getAsText(_args, "name"))) {
        case (null) { null };
        case (?name) {
          switch (UsernameValidator.validateUsername(name)) {
            case (?error) { return ToolContext.makeError(error, cb) };
            case (null) { ?name };
          };
        };
      };

      // Parse class → offset
      let classOffset : Nat = if (raceClass == "Scrap") { 0 }
        else if (raceClass == "Junker") { 1 }
        else if (raceClass == "Raider") { 2 }
        else if (raceClass == "Elite") { 3 }
        else { return ToolContext.makeError("Invalid class. Must be Scrap, Junker, Raider, or Elite.", cb) };

      // Parse faction
      let factionType : PokedBotsGarage.FactionType = if (faction == "Game") { #Game }
        else if (faction == "Animal") { #Animal }
        else if (faction == "Industrial") { #Industrial }
        else if (faction == "Food") { #Food }
        else { return ToolContext.makeError("Invalid faction. Must be Game, Animal, Industrial, or Food.", cb) };

      // Check slot via the starterBotSlots map (passed through context)
      let slots = ctx.getStarterBotSlots(user);

      let existingSlot = switch (classOffset) {
        case (0) { slots.scrap };
        case (1) { slots.junker };
        case (2) { slots.raider };
        case _ { slots.elite };
      };

      switch (existingSlot) {
        case (?existing) {
          return ToolContext.makeError("You already have a " # raceClass # " starter bot (#" # Nat.toText(existing) # "). Use garage_delete_starter_bot to delete it first.", cb);
        };
        case (null) {};
      };

      // Generate synthetic token index
      let tokenIndex = ctx.garageManager.generateStarterTokenIndex(user, classOffset);

      // Check collision
      switch (ctx.garageManager.getStats(tokenIndex)) {
        case (?_) { return ToolContext.makeError("Token index collision. Please try again.", cb) };
        case (null) {};
      };

      // Initialize
      let racingStats = ctx.garageManager.initializeBot(tokenIndex, user, ?factionType, customName);

      // Award starter gear kit (one Uncommon piece per slot)
      ctx.awardStarterGear(user, tokenIndex);

      // Update slots
      ctx.setStarterBotSlot(user, classOffset, ?tokenIndex);

      let baseStat = PokedBotsGarage.starterBotBaseStat(tokenIndex);

      let response = Json.obj([
        ("message", Json.str("🤖 **FREE STARTER BOT CREATED**")),
        ("token_index", Json.int(tokenIndex)),
        ("race_class", Json.str(raceClass)),
        ("faction", Json.str(faction)),
        ("base_stats", Json.str(Nat.toText(baseStat) # "/" # Nat.toText(baseStat) # "/" # Nat.toText(baseStat) # "/" # Nat.toText(baseStat) # " (SPD/PWR/ACC/STB)")),
        ("starting_elo", Json.int(racingStats.eloRating)),
        ("info", Json.str("Your starter bot is ready to race! Enter events, earn ICP prizes, upgrade stats, and collect gear — all for free. Delete and recreate to change faction.")),
      ]);

      ToolContext.makeSuccess(response, cb);
    };
  };
};
