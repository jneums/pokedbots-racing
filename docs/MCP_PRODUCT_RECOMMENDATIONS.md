# MCP Server Product Recommendations

**Source:** User feedback from automation-heavy MCP consumer  
**Date:** 2026-04-14  
**Scope:** 38 registered tools across Garage, Racing, Betting, Marketplace domains  

---

## Executive Summary

A power user running daily automation workflows against the MCP server identified
friction points across three themes:

1. **Too many round-trips** — per-bot detail calls, manual filtering, no bulk ops
2. **Semantic mismatch** — `garage_start_scavenging` covers 5 zone types including
   maintenance; error responses are text-only with no machine-parseable codes
3. **Missing automation primitives** — no idempotent registration, no readiness
   filters, no maintenance recommendations

Their top 3 asks: bulk bot details, structured maintenance/activity state,
idempotent registration with clearer status.

---

## Priority Matrix

| #  | Item                                  | Effort | Impact | Category     |
|----|---------------------------------------|--------|--------|--------------|
| 1  | Idempotent event registration         | Low    | High   | Easy Win     |
| 2  | Structured error codes on failures    | Low    | High   | Easy Win     |
| 3  | Daily-readiness filters on list       | Low    | High   | Easy Win     |
| 4  | Maintenance recommendation field      | Low    | Med    | Easy Win     |
| 5  | Better registration filters           | Med    | High   | Medium Lift  |
| 6  | Rename/alias scavenging tool          | Med    | Med    | Medium Lift  |
| 7  | Explicit activity status model        | Med    | High   | Medium Lift  |
| 8  | Bulk bot details endpoint             | High   | High   | Big Win      |
| 9  | Station capacity before dispatch      | Med    | Med    | Medium Lift  |
| 10 | Complete-all-ready-scavenging         | Low    | Low    | Nice-to-have |
| 11 | Event filters (eligible/not-reg)      | Med    | Med    | Nice-to-have |
| 12 | Parameter aliases (backwards-compat)  | Low    | Low    | Nice-to-have |

---

## 1. Easy Wins

### 1a. Idempotent Event Registration

**Tool:** `racing_register_for_event`  
**Current behavior:** Returns error text like "already registered" if bot is in event.  
**Proposed:** Add `skip_if_registered: bool` (default false for backward compat).

When true and bot already registered:
- Return success with `already_registered: true`, `registration_id`, `event_id`,
  `token_index`, `registered_at`
- No payment attempted, no error thrown
- Automation can fire-and-forget without try/catch

**Where to change:** `racing_register_for_event.mo` — add param parsing, add an
early check against `ctx.calendar.getRegistrations(eventId)` before payment flow.

**Effort:** ~30 lines. No new canister methods needed — registration lookup already
exists in the handler's duplicate check.

---

### 1b. Structured Error Codes

**Current behavior:** All tools return text error messages via `makeTextError`.  
**Proposed:** Extend `ToolContext.mo` error helpers to include structured fields:

```
{
  "error": true,
  "error_code": "ALREADY_REGISTERED",
  "error_message": "Bot #4079 is already registered for event #12",
  "retryable": false,
  "context": { "event_id": 12, "token_index": 4079 }
}
```

Start with the most common automation errors:
- `ALREADY_REGISTERED` — racing_register_for_event
- `INSUFFICIENT_BATTERY` — racing_register_for_event, racing_enter_race
- `INSUFFICIENT_CONDITION` — racing_register_for_event, racing_enter_race
- `BOT_BUSY` — garage_start_scavenging (already scavenging/in race)
- `COOLDOWN_ACTIVE` — garage_recharge_robot, garage_repair_robot
- `INSUFFICIENT_ALLOWANCE` — any paid tool
- `NOT_OWNER` — any bot-specific tool
- `EVENT_NOT_OPEN` — racing_register_for_event
- `RACE_FULL` — racing_enter_race

**Where to change:** `ToolContext.mo` — add `makeStructuredError(code, message,
retryable, context)` helper. Then migrate tools one at a time (each tool is
independent).

**Effort:** New helper is ~15 lines. Per-tool migration is ~5 min each. Can be
rolled out incrementally — old text errors still work.

---

### 1c. Daily-Readiness Filters on garage_list_my_pokedbots

**Current behavior:** 6 boolean filters exist (only_starred, only_racers,
only_scavengers, only_scavenging, only_in_races, only_ready). The `only_ready`
filter uses lenient thresholds (battery >= 30%, condition >= 50%).  

**Proposed:** Add numeric threshold filters:

```
{
  "min_battery": 80,          // 0-100
  "min_condition": 90,        // 0-100
  "only_idle": true,          // not scavenging, not in race, not upgrading
  "only_not_registered": true // not registered for any upcoming event
}
```

This removes the need to fetch all bots then apply client-side logic for stricter
readiness checks.

**Where to change:** `garage_list_my_pokedbots.mo` — add 4 params to input
parsing, add filter predicates to the bot loop. The bot data already includes
battery, condition, activeMission, and event registration lookups.

**Effort:** ~40 lines. All data already in scope during the listing loop.

---

### 1d. Maintenance Recommendation Field

**Current behavior:** `garage_list_my_pokedbots` shows battery %, condition %,
and cooldown times. User must manually decide what to do.  

**Proposed:** Add a `recommended_action` field per bot in the listing output:

Logic (evaluated in priority order):
1. `condition < 50` AND repair not on cooldown → `"RepairBay"` or `"Repair"`
2. `battery < 30` → `"ChargingStation"` or `"Recharge"`
3. `condition < 80` AND repair not on cooldown → `"RepairBay"`
4. `battery < 80` → `"ChargingStation"`
5. `overcharge == 0` AND has batteries → `"Jolt"`
6. Otherwise → `"None"`

Also add to `garage_get_robot_details` output.

**Where to change:** Both `garage_list_my_pokedbots.mo` and
`garage_get_robot_details.mo`. Pure display logic — reads existing bot fields,
no new canister state.

**Effort:** ~25 lines per tool. No canister upgrade risk.

---

## 2. Medium Lifts

### 2a. Better Registration Filters (racing_get_my_registrations)

**Current behavior:** Returns all registrations including stale/old completed ones
mixed with current upcoming ones. No filtering. Notably, events whose status was
never transitioned to Completed (stuck at RegistrationOpen) from weeks ago still
appear — making raw results unreliable as sole source of truth for automation.

**Proposed:** Add filters:

```
{
  "only_upcoming": true,          // status is Announced/RegistrationOpen/InProgress AND scheduledTime < 24h in past
  "only_actionable": true,        // best for automation: excludes completed, cancelled, and any event >24h past
  "status": "RegistrationOpen",   // exact status match
  "exclude_stale": true,          // drop ANY event whose scheduledTime is >7 days in the past (regardless of status)
  "event_start_after": 1713052800000000000  // nanosecond timestamp floor
}
```

**Key design decision:** `only_upcoming` and `exclude_stale` now filter on
**time** in addition to status. An event stuck at `#RegistrationOpen` but
scheduled 3 weeks ago is NOT upcoming and IS stale. The `only_actionable`
parameter is the recommended single flag for automation scripts — it combines
the most aggressive filters into one boolean.

**Implementation notes:**
- `racing_get_my_registrations.mo` currently calls a calendar method that returns
  all registrations for the user principal
- Filter logic applies post-fetch against each registration's associated
  ScheduledEvent (eventId → event lookup for status, scheduledTime)
- The ScheduledEvent type already has `status` and `scheduledTime` fields

**Effort:** ~60 lines. Needs event lookups per registration (already available via
`ctx.calendar`).

---

### 2b. Rename/Alias garage_start_scavenging

**Current behavior:** `garage_start_scavenging` handles 5 zone types:
ScrapHeaps, AbandonedSettlements, DeadMachineFields, RepairBay, ChargingStation.
The name implies only scavenging but it's the general "send bot to zone" tool.

**Proposed (two options):**

**Option A — Rename + deprecation alias:**
- New tool: `garage_start_activity` (or `garage_send_to_zone`)
- Keep `garage_start_scavenging` as alias that delegates to same handler
- Mark old name deprecated in description
- Accept `location_type` as alias for `zone` param

**Option B — Keep name, improve description:**
- Update tool description to clarify it handles all zone types
- Add `location_type` as param alias for `zone`
- Less disruption, but the semantic mismatch persists

**Recommendation:** Option A. The tool name is the primary documentation for LLM
consumers. A clear name reduces prompt engineering.

**Where to change:**
- Create `garage_start_activity.mo` (copy of start_scavenging handler)
- In `main.mo` tool registration, register both names pointing to same handler
- Add `location_type` param parsing alongside `zone`

**Effort:** ~1 hour. New file is a thin wrapper. Registration is 1 line.

---

### 2c. Explicit Activity Status Model

**Current behavior:** Bot activity state is spread across multiple fields:
- `activeMission` (scavenging — also covers RepairBay/ChargingStation)
- `active_upgrade` (upgrading)
- Race entry status (in a race)
- `listedForSale` (marketplace)
- Otherwise idle

The user has to infer what a bot is doing from multiple fields. "Scavenging" as
the umbrella term for all zone activity is conceptually muddy.

**Proposed:** Add a top-level `activity` object to bot details and list output:

```
{
  "activity": {
    "type": "charging",        // racing | scavenging | charging | repairing | upgrading | listed | idle
    "zone": "ChargingStation", // only when type is scavenging/charging/repairing
    "started_at": "...",
    "can_collect_now": true,   // for scavenging: has pending rewards
    "collect_available_at": "...",  // next accumulation tick
    "estimated_completion": "...", // for timed missions/upgrades
    "pending_rewards": {       // for scavenging zones
      "total_parts": 45,
      "speed_chips": 12,
      ...
    }
  }
}
```

This replaces the need to check `active_scavenging.status`, `active_upgrade.status`,
and race entry state separately.

**Mapping from current zones to activity types:**
- ScrapHeaps / AbandonedSettlements / DeadMachineFields → `"scavenging"`
- ChargingStation → `"charging"`
- RepairBay → `"repairing"`
- In a race → `"racing"`
- Upgrade in progress → `"upgrading"`
- Listed for sale → `"listed"`
- None of the above → `"idle"`

**Where to change:** `garage_get_robot_details.mo` and `garage_list_my_pokedbots.mo`.
Pure output reshaping — reads the same underlying fields, presents them in a
unified structure.

**Effort:** ~80 lines per tool. No canister state changes. Low risk.

---

### 2d. Station Capacity Before Dispatch

**Current behavior:** ChargingStation capacity (power grid watts, bots already
charging) is only revealed after sending a bot. RepairBay slot availability is
similarly opaque.

**Proposed:** Two options:

**Option A — New tool `garage_get_station_status`:**

```
{
  "power_grid": {
    "total_watts": 500,
    "used_watts": 300,
    "available_watts": 200,
    "smr_modules": [...]
  },
  "charging_station": {
    "bots_charging": 3,
    "watts_per_bot": 100,
    "efficiency": 0.67  // reduced if overloaded
  },
  "repair_bays": {
    "total_slots": 3,
    "occupied": 2,
    "available": 1,
    "bays": [
      { "tier": 5, "bot": 4079, "condition_per_hour": 30 },
      { "tier": 3, "bot": null, "condition_per_hour": 18 },
      ...
    ]
  }
}
```

**Option B — Add fields to `garage_list_my_pokedbots` header:**
Include station status in the existing parts inventory header section.

**Recommendation:** Option A is cleaner. Station status is a garage-level concern,
not a bot-level concern. But Option B is cheaper to implement.

**Where to change:** Power grid data is already computed in `PokedBotsGarage.mo`.
RepairBay data exists in the bay management module. Just needs a tool to surface it.

**Effort:** Option A: new tool file ~100 lines + registration. Option B: ~30 lines
added to existing tool.

---

## 3. Big Wins

### 3a. Bulk Bot Details Endpoint

**User's #1 ask.** Currently `garage_get_robot_details` returns rich data for one
bot at a time. A user with 20+ bots needs 20+ calls for a daily status sweep.

**Current call cost:** Each call does lazy scavenging accumulation + stat
calculations + event lookups + dedication checks. At scale this is both noisy
(lots of round-trips) and expensive (canister cycles per call).

**Proposed:** New tool `garage_get_bulk_details`:

```
Input:
{
  "token_indices": [4079, 108, 3201, ...],  // up to 20 bots
  "fields": ["condition", "activity", "recommendation"]  // optional field filter
}

Output:
{
  "bots": [
    {
      "token_index": 4079,
      "battery": 85,
      "condition": 72,
      "activity": { "type": "idle" },
      "recommended_action": "RepairBay",
      "can_race": true,
      "overall_rating": 67,
      "race_class": "Elite",
      ...
    },
    ...
  ],
  "station_status": { ... }  // bonus: include garage-level info
}
```

**Design decisions:**

1. **Field filtering** — The `fields` param lets consumers request only what they
   need. Full details per bot is expensive; a status sweep usually only needs
   battery/condition/activity/recommendation.

2. **Cap at 20** — Prevents abuse. 20 covers most fleets. Larger fleets can
   batch in pages.

3. **Lazy accumulation** — Must still run scavenging accumulation per bot (affects
   pending rewards). But can batch the reads.

4. **Return JSON, not text** — Unlike `garage_list_my_pokedbots` which returns
   formatted text, bulk details should return structured JSON for automation.

**Where to change:**
- New tool file `garage_get_bulk_details.mo`
- Internally loops over the same logic as `garage_get_robot_details` but
  with reduced output per bot (skip flavor text, image URLs unless requested)
- Register in `main.mo`

**Effort:** ~200 lines for the tool. Mostly adapting existing detail logic into
a loop with field filtering. The per-bot logic already exists — this is
orchestration + output shaping.

**Cycle cost consideration:** Batch call will use more cycles per invocation
than a single-bot call. Consider adding a note in the tool description about
cycle costs for large batches. The savings come from reduced round-trip overhead
(inter-canister call setup, MCP protocol overhead, network latency).

---

## 4. Nice-to-haves & UX Polish

### 4a. Complete All Ready Scavenging

**Proposed:** New tool `garage_complete_all_ready_scavenging`

No input params. Iterates all caller's bots, completes any finished/timed
scavenging missions, returns aggregate results.

```
Output:
{
  "completed": 5,
  "skipped": 3,
  "results": [
    { "token_index": 4079, "parts_collected": 45, "zone": "ScrapHeaps" },
    ...
  ],
  "still_active": [
    { "token_index": 108, "zone": "DeadMachineFields", "hours_remaining": 2.3 }
  ]
}
```

**Effort:** ~80 lines. Loops existing `completeScavengingMissionV2` logic.
Cap at 20 completions per call to bound cycle cost.

---

### 4b. Event Filters (Eligible / Not-Registered)

**Tool:** `racing_list_events`  
**Proposed:** Add filters:

```
{
  "only_eligible_for_token": 4079,      // only events this bot can enter
  "only_not_registered_for_token": 4079 // exclude events bot is already in
}
```

Requires cross-referencing event class restrictions against bot's race class,
and checking registration records.

**Effort:** ~50 lines. Bot class lookup and registration check already exist.

---

### 4c. Parameter Aliases (Backwards Compatibility)

Accept common aliases without breaking existing consumers:

| Tool                     | Current Param | Alias              |
|--------------------------|---------------|--------------------|
| garage_start_scavenging  | zone          | location_type      |
| garage_start_scavenging  | zone          | location           |
| racing_register_for_event| (n/a)         | skip_if_registered |

Implementation: In input parsing, check alias first, fall back to canonical.
One-line change per alias.

**Effort:** ~5 lines per alias. Trivial.

---

### 4d. Enriched Bot Listing Fields

**Tool:** `garage_list_my_pokedbots`  
**Proposed:** Per-bot output should additionally expose:

- `event_registrations`: list of upcoming event IDs the bot is registered for
- `maintenance_zone`: if active, which zone (with friendly type, not "scavenging")
- `meets_thresholds`: when `min_battery`/`min_condition` params are supplied,
  include a boolean `meets_custom_thresholds` per bot (useful even when not
  filtering, just annotating)

These fields are already computed during the listing loop — they just aren't
currently included in the text output.

**Effort:** ~30 lines. Output formatting only.

---

## 5. Implementation Notes

### Suggested Rollout Order

**Phase 1 — Quick wins (1-2 days, no canister state changes):**
1. Structured error codes (1b) — foundational, unblocks automation
2. Idempotent registration (1a) — most requested single behavior
3. Daily-readiness filters (1c) — extends existing param parsing
4. Maintenance recommendation (1d) — pure display logic

**Phase 2 — Activity model + naming (2-3 days):**
5. Explicit activity status model (2c) — output reshaping
6. Rename/alias scavenging tool (2b) — new registration + wrapper
7. Parameter aliases (4c) — trivial follow-on

**Phase 3 — Filtering + capacity (2-3 days):**
8. Better registration filters (2a) — post-fetch filtering
9. Station capacity tool (2d) — new tool surfacing existing data
10. Event filters (4b) — cross-reference existing lookups

**Phase 4 — Bulk operations (3-5 days):**
11. Bulk bot details (3a) — largest item, most architectural
12. Complete-all-ready (4a) — batch operation pattern
13. Enriched listing fields (4d) — follows from activity model

### Backward Compatibility

All changes are additive:
- New params are optional with defaults matching current behavior
- New tools don't affect existing tools
- Error code changes: add structured fields alongside existing text messages
  (consumers checking `isError` boolean continue to work)
- Tool aliases: old names keep working, new names added in parallel

### Canister Upgrade Risk

- **No state migration needed** for any of these changes
- All changes are tool-layer (input parsing / output formatting) or new tools
- The underlying `PokedBotsGarage`, `RaceCalendar`, and `RacingSimulator`
  modules are unchanged
- Safe to deploy incrementally — each item is independent

### Cycle Budget Considerations

- Bulk details (3a) and complete-all (4a) will use more cycles per call
- Add per-tool cycle metering if not already present
- Consider documenting expected cycle cost in tool descriptions
- Cap batch sizes (20 bots) to prevent runaway costs

### Output Format Migration

Currently the tool surface is split:
- **Text output** (makeTextSuccess): garage_list_my_pokedbots, racing_list_events
- **JSON output** (makeSuccess): all other tools

For automation consumers, structured JSON is strongly preferred. Consider a
long-term migration path:
- Add `output_format: "json" | "text"` param to text-output tools
- Default to "text" for backward compat
- New tools should always return JSON

---

## Appendix: Current Tool Inventory (38 tools)

### Garage (18 tools)
- garage_list_my_pokedbots, garage_get_robot_details
- garage_initialize_pokedbot, garage_deregister_pokedbot
- garage_recharge_robot, garage_repair_robot
- garage_upgrade_robot, garage_cancel_upgrade
- garage_start_scavenging, garage_complete_scavenging
- garage_list_batteries, garage_jolt_bot
- garage_repair_battery, garage_rebuild_battery, garage_salvage_battery
- garage_transfer_parts, garage_convert_parts, garage_combine_parts

### Racing (9 tools)
- racing_list_events, racing_list_races
- racing_register_for_event, racing_unregister_from_event
- racing_enter_race (deprecated), racing_sponsor_race
- racing_get_race_details, racing_get_bot_races
- racing_get_my_registrations, racing_get_event_results
- racing_get_bot_names

### Betting (4 tools)
- betting_place_bet, betting_list_pools
- betting_get_pool_info, betting_get_my_bets

### Marketplace (2 tools)
- marketplace_browse_pokedbots, marketplace_purchase_pokedbot

### Utility (1 tool)
- help_get_compendium

### Proposed New Tools (from this doc)
- garage_start_activity (alias for garage_start_scavenging)
- garage_get_station_status
- garage_get_bulk_details
- garage_complete_all_ready_scavenging


