import Result "mo:base/Result";
import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Json "mo:json";
import ToolContext "ToolContext";
import GarageStartScavenging "garage_start_scavenging";

module {
  public func config() : McpTypes.Tool = {
    name = "garage_start_activity";
    title = ?"Send Bot to Zone";
    description = ?"Send your PokedBot to a zone for an activity. This is the universal \"dispatch\" tool covering scavenging zones (ScrapHeaps, AbandonedSettlements, DeadMachineFields), maintenance (RepairBay), and power (ChargingStation).\n\nThis is the preferred name for garage_start_scavenging (which remains as a backwards-compatible alias).\n\nSee garage_start_scavenging for full zone details and accumulation rates.";
    payment = null;
    inputSchema = Json.obj([
      ("type", Json.str("object")),
      ("properties", Json.obj([
        ("token_index", Json.obj([("type", Json.str("number")), ("description", Json.str("Your PokedBot's token index"))])),
        ("zone", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("ScrapHeaps"), Json.str("AbandonedSettlements"), Json.str("DeadMachineFields"), Json.str("RepairBay"), Json.str("ChargingStation")])), ("description", Json.str("The zone to send your bot to"))])),
        ("location_type", Json.obj([("type", Json.str("string")), ("enum", Json.arr([Json.str("ScrapHeaps"), Json.str("AbandonedSettlements"), Json.str("DeadMachineFields"), Json.str("RepairBay"), Json.str("ChargingStation")])), ("description", Json.str("Alias for 'zone'. Use whichever you prefer."))])),
        ("duration_minutes", Json.obj([("type", Json.str("number")), ("description", Json.str("Optional: Duration in minutes. If not specified, bot will scavenge continuously until manually retrieved."))]))
      ])),
      ("required", Json.arr([Json.str("token_index"), Json.str("zone")])),
    ]);
    outputSchema = null;
  };

  /// Delegates to the same handler as garage_start_scavenging
  public func handle(ctx : ToolContext.ToolContext) : (
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) -> async () {
    GarageStartScavenging.handle(ctx);
  };
};
