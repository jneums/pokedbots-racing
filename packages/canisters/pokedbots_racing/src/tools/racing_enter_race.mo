import Result "mo:base/Result";

import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";

module {
  public func config() : McpTypes.Tool = {
    name = "racing_enter_race";
    title = ?"Enter Race (DEPRECATED)";
    description = ?"⚠️ DEPRECATED: This tool has been replaced by the new Event Registration System. Please use `racing_list_events` to find upcoming events and `racing_register_for_event` to register your bot for an event. The event system automatically creates races from registered participants.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([("race_id", Json.obj([("type", Json.str("number")), ("description", Json.str("The race ID to enter"))])), ("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("Your PokedBot's token index"))]))])),
      ("required", Json.arr([Json.str("race_id"), Json.str("token_index")])),
    ]);
    outputSchema = null;
  };

  public func handle(_ctx : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    func(_args : McpTypes.JsonValue, _auth : ?AuthTypes.AuthInfo, cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) : async () {
      // Return deprecation message - tool is no longer functional
      return ToolContext.makeTextSuccess(
        "⚠️ **DEPRECATED TOOL**\n\n" #
        "The `racing_enter_race` tool has been replaced by the new **Event Registration System**.\n\n" #
        "**How to enter races now:**\n" #
        "1. Use `racing_list_events` to browse upcoming racing events\n" #
        "2. Use `racing_register_for_event` with `event_id` and `token_index` to register your bot\n" #
        "3. After registration closes, races are automatically created from registered participants\n" #
        "4. Your bot will be automatically entered into the appropriate heat/race\n\n" #
        "**Benefits of the new system:**\n" #
        "• Fair heat allocation (bots are split into balanced races)\n" #
        "• Flexible cancellation with tiered refunds\n" #
        "• Event-based prize pools and leaderboards\n" #
        "• Better matchmaking within your class\n\n" #
        "Use `racing_list_events` to get started!",
        cb,
      );
    };
  };
};
