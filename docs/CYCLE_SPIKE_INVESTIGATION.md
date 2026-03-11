# Cycle Spike Investigation

## Problem Statement
Observed a massive cycle burn spike on **January 21, 2026** (~16 TC burned) and another on **January 24-25**. Normal daily burn is ~0.5-1 TC. Need to identify the source.

## Investigation Timeline

### Phase 1: Timer System Audit ✅
- **Result**: Timer system confirmed healthy
- 5-minute intervals working correctly
- No evidence of runaway loops or rapid firing
- `get_timer_diagnostics` shows normal patterns

### Phase 2: Ruled Out Causes ✅
- **Array.append**: Memory is stable, not growing
- **Queries**: Free on IC, can't cause cycle drain
- **Upgrades**: Would show in logs, doesn't match pattern

### Phase 3: Method Call Tracking Implementation ✅
Implemented comprehensive tracking to identify which methods are being called and by whom.

## Implementation Details

### New Infrastructure Added

**Stable Storage** (`main.mo` ~line 550):
```motoko
type MethodCallEntry = {
  method : Text;
  caller : Principal;
  count : Nat;
  lastCallTimestamp : Int;
};

let stable_method_call_tracking = Map.new<Text, MethodCallEntry>();
var stable_method_tracking_start_time : Int = Time.now();
```

**Tracking Function** (`main.mo` ~line 565):
```motoko
func trackMethodCall(method : Text, caller : Principal) {
  let key = method # ":" # Principal.toText(caller);
  let now = Time.now();
  switch (Map.get(stable_method_call_tracking, Map.thash, key)) {
    case (?existing) {
      ignore Map.put(stable_method_call_tracking, Map.thash, key, {
        method = method;
        caller = caller;
        count = existing.count + 1;
        lastCallTimestamp = now;
      });
    };
    case (null) {
      ignore Map.put(stable_method_call_tracking, Map.thash, key, {
        method = method;
        caller = caller;
        count = 1;
        lastCallTimestamp = now;
      });
    };
  };
};
```

### Query Endpoints Added

**`get_method_call_stats()`** - Returns aggregated stats:
- `byMethod`: Call counts grouped by method name
- `byCaller`: Call counts grouped by principal
- `trackingStartTime`: When tracking began
- `totalUniqueCallers`: Number of unique principals
- `totalCalls`: Sum of all calls

**`clear_method_call_stats()`** - Owner-only function to reset tracking data

### Methods Instrumented

#### Web UI Update Methods (35 methods):
- `web_list_my_bots`
- `web_purchase_smr`, `web_purchase_parts`, `web_purchase_repair_bay_slot`
- `web_initialize_bot`, `web_get_bot_details`, `web_deregister_bot`
- `web_recharge_bot`, `web_repair_bot`, `web_full_maintenance`
- `web_upgrade_bot`, `web_cancel_upgrade`, `web_respec_bot`
- `web_set_starred_bots`, `web_set_racer_bots`, `web_set_scavenger_bots`
- `web_upgrade_repair_bay`, `web_complete_repair_bay_upgrade`
- `web_enter_race`
- `web_start_scavenging`, `web_complete_scavenging`
- `web_batch_complete_scavenging`, `web_batch_start_scavenging`
- `web_batch_recharge_bots`, `web_batch_repair_bots`
- `web_convert_parts`, `web_combine_parts_to_universal`
- `web_betting_place_bet`
- `web_jolt_bot`, `web_repair_battery`, `web_rebuild_battery`
- `web_salvage_battery`, `web_toggle_battery`

#### MCP Tool Handlers (10+ methods):
- `garage_upgrade_robot`, `garage_start_scavenging`, `garage_complete_scavenging`
- `garage_jolt_bot`, `garage_get_robot_details`, `garage_list_my_pokedbots`
- `racing_register_for_event`, `racing_list_races`, `betting_place_bet`
- `marketplace_browse_pokedbots`

**Note**: Query methods were NOT instrumented (they're free and can't drain cycles).

## Current Status

- ✅ Build compiles successfully
- ✅ Deployed to mainnet (based on terminal history)
- ⏳ **Waiting for data collection**

## Known Limitations

**Scaling**: The `get_method_call_stats` endpoint stores entries as `method:principal` composite keys. With 35 methods × N unique callers, storage grows linearly. The query aggregates on every call (O(n) iteration) and returns all entries.

- **For diagnostics**: Fine for hundreds/low thousands of entries
- **At scale** (10k+ entries): May hit response size limits or slow down
- **If needed later**: Can add pagination or limit to top N entries by count

For now, this is acceptable since it's a temporary diagnostic tool. Clear the data periodically with `clear_method_call_stats()` if storage grows too large.

## Next Steps

### 1. Collect Data
After some time (hours/days), query the stats:
```bash
dfx canister call pokedbots_racing get_method_call_stats --ic
```

### 2. Analyze Results
Look for:
- **Single method with extremely high count** → That method is the culprit
- **Single principal with extremely high count** → Potential attacker/bot
- **Many calls from anonymous principal** → Public endpoint abuse
- **Batch methods with high counts** → Could be legitimate but expensive

### 3. Potential Mitigations (based on findings)
- **Rate limiting**: Add per-principal cooldowns
- **Cost sharing**: Require caller to pay cycles
- **Access control**: Require authentication for expensive operations
- **Optimization**: Make the expensive method more efficient

## Files Modified

| File | Changes |
|------|---------|
| `packages/canisters/pokedbots_racing/src/main.mo` | Added tracking infrastructure, `get_method_call_stats()`, `clear_method_call_stats()`, tracking calls in all web_* update methods |
| `packages/canisters/pokedbots_racing/src/tools/ToolContext.mo` | Added `trackMethodCall` field to context type |
| `packages/canisters/pokedbots_racing/src/tools/garage_*.mo` | Added tracking calls |
| `packages/canisters/pokedbots_racing/src/tools/racing_*.mo` | Added tracking calls |
| `packages/canisters/pokedbots_racing/src/tools/betting_*.mo` | Added tracking calls |
| `packages/canisters/pokedbots_racing/src/tools/marketplace_*.mo` | Added tracking calls + Principal import |

## Hypothesis

Most likely culprits for cycle spikes:
1. **External bot/attacker** hammering public endpoints
2. **Batch operations** being called repeatedly
3. **MCP tools** being abused via HTTP interface
4. **Marketplace browse** (if someone is scraping)

The tracking data will reveal which of these (if any) is the cause.
