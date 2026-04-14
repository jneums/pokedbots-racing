import Result "mo:base/Result";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_cancel_upgrade";
    title = ?"Cancel Upgrade (Deprecated)";
    description = ?"Deprecated — upgrades now complete instantly. Use garage_upgrade_robot instead.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("The token index of the PokedBot"))]))])),
      ("required", Json.arr([Json.str("token_index")])),
    ]);
    outputSchema = null;
  };

  public func handle(_ctx : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {
      // Upgrades are now instant, so there's nothing to cancel
      let response = Json.obj([
        ("message", Json.str("⚡ Upgrades now complete instantly! There is nothing to cancel. Use garage_upgrade_robot to upgrade your PokedBot and get immediate results.")),
        ("deprecated", Json.bool(true)),
      ]);

      ToolContext.makeSuccess(response, cb);
    };
  };
};
