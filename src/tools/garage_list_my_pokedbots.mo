import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Nat32 "mo:base/Nat32";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";

import ToolContext "./ToolContext";
import ExtIntegration "../ExtIntegration";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_list_my_pokedbots";
    title = ?"List My PokedBots";
    description = ?"List all PokedBots in your garage subaccount";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([])),
    ]);
    outputSchema = null;
  };

  public func handler(ctx : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {
      let userPrincipal = switch (_auth) {
        case (?auth) { auth.principal };
        case (null) {
          return ToolContext.makeError("Authentication required", cb);
        };
      };

      let garageSubaccount = ExtIntegration.deriveGarageSubaccount(userPrincipal);
      let garageAccountId = ExtIntegration.principalToAccountIdentifier(ctx.canisterPrincipal, ?garageSubaccount);
      let tokensResult = await ExtIntegration.getOwnedTokens(ctx.extCanister, garageAccountId);

      let message = switch (tokensResult) {
        case (#err(msg)) {
          "🤖 Empty Garage\n\nNo PokedBots found.\n\nGarage ID: " # garageAccountId;
        };
        case (#ok(tokens)) {
          if (tokens.size() == 0) {
            "🤖 Empty Garage\n\nNo PokedBots found.\n\nGarage ID: " # garageAccountId;
          } else {
            var msg = "🤖 Your Garage\n\n" #
            "Found " # Nat32.toText(Nat32.fromNat(tokens.size())) # " PokedBot(s)\n\n";

            for (tokenIndex in tokens.vals()) {
              let tokenId = ExtIntegration.encodeTokenIdentifier(tokenIndex, ctx.extCanisterId);
              let imageUrl = "https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/?tokenid=" # tokenId;
              msg #= "🏎️ PokedBot #" # Nat32.toText(tokenIndex) # "\n";
              msg #= "   Token ID: " # tokenId # "\n";
              msg #= "   Image: " # imageUrl # "\n\n";
            };

            msg #= "Garage ID: " # garageAccountId;
            msg;
          };
        };
      };

      ToolContext.makeTextSuccess(message, cb);
    };
  };
};
