# Race Create Timer Diagnostics

## Problem Statement

The `race_create` timer occasionally disappears, causing the automatic race creation system to stop working. This document outlines the diagnostic infrastructure and automatic retry mechanism to handle these issues.

## Automatic Retry System (Added Jan 2026)

Failed timer actions are now **automatically retried** based on action type:

| Action Type | Max Retries | Delay Between Retries |
|-------------|-------------|-----------------------|
| `race_create` | 5 | 30 seconds |
| `race_start` | 5 | 30 seconds |
| `race_finish` | 3 | 30 seconds |
| `betting_pool_create` | 3 | 30 seconds |
| `prize_distribution` | 3 | 30 seconds |
| `bet_settlement` | 3 | 30 seconds |

When an action traps, the `reportTTError` callback checks the retry count and reschedules if under the limit. The diagnostic log will show:
- `willRetry=true/false` - Whether the action will be retried
- `retries=X/Y` - Current retry count vs maximum

## Diagnostic Infrastructure

### Data Collection

A stable diagnostic log captures key events in the timer lifecycle:

```motoko
type TimerDiagnosticEntry = {
  timestamp : Int;
  handlerType : Text;       // Event type (see below)
  actionId : { id : Nat; time : Nat };
  message : Text;
  existingTimerCount : Nat; // How many race_create timers exist
  scheduledNextTimer : Bool;
  nextTimerTime : ?Nat;
};
```

**Event Types Logged:**

| handlerType | Description |
|-------------|-------------|
| `race_create_ENTRY` | Handler started executing |
| `race_create_EXIT` | Handler finished, shows if next timer was scheduled |
| `TT_EXECUTION` | TimerTool reports execution completed |
| `TT_ERROR` | TimerTool reports an error occurred (includes retry info) |
| `MANUAL_FORCE_SCHEDULE` | Admin manually created a timer |

### Diagnostic Endpoints

#### `get_race_create_diagnostics`
Returns the diagnostic log entries (up to 500 most recent).

```bash
dfx canister call pokedbots_racing get_race_create_diagnostics --ic
```

**Response includes:**
- `entries` - Array of diagnostic log entries
- `totalCount` - Number of entries in the log
- `currentRaceCreateTimers` - How many race_create timers exist right now

#### `get_race_create_timer_state`
Returns current state of all timers.

```bash
dfx canister call pokedbots_racing get_race_create_timer_state --ic
```

**Response includes:**
- `raceCreateTimers` - List of scheduled race_create timers
- `raceStartTimers` - List of scheduled race_start timers
- `raceFinishTimers` - List of scheduled race_finish timers
- `allTimerCount` - Total count

#### `clear_race_create_diagnostics` (owner only)
Clears the diagnostic log.

```bash
dfx canister call pokedbots_racing clear_race_create_diagnostics --ic
```

#### `force_schedule_race_create` (owner only)
Emergency recovery: creates a race_create timer if none exist.

```bash
dfx canister call pokedbots_racing force_schedule_race_create --ic
```

#### `trigger_race_start` (owner only)
Force-start a specific race that missed its timer.

```bash
dfx canister call pokedbots_racing trigger_race_start '(RACE_ID)' --ic
```

#### `trigger_race_finish` (owner only)
Force-finish a specific race that missed its timer.

```bash
dfx canister call pokedbots_racing trigger_race_finish '(RACE_ID)' --ic
```

#### `trigger_race_creation` (owner only)
Manually trigger the race creation handler.

```bash
dfx canister call pokedbots_racing trigger_race_creation --ic
```

## Normal Timer Flow

1. `race_create` timer fires
2. `race_create_ENTRY` logged with `existingTimerCount = 1`
3. Handler processes events, creates races as needed
4. Handler schedules next timer (5 minutes later)
5. `race_create_EXIT` logged with `scheduledNextTimer = true`
6. `TT_EXECUTION` logged confirming completion

## Investigating a Dropped Timer

### Step 1: Check Current State
```bash
dfx canister call pokedbots_racing get_race_create_timer_state --ic
```

If `raceCreateTimers` is empty, the timer has been dropped (and retries exhausted).

### Step 2: Review Diagnostic Logs
```bash
dfx canister call pokedbots_racing get_race_create_diagnostics --ic
```

Look for:
- **`TT_ERROR` entries** - Check `retries=X/Y` and `willRetry` status
- **Last `race_create_EXIT`** - Did it set `scheduledNextTimer = true`?
- **Missing `TT_EXECUTION`** after an `EXIT` - Timer may have crashed
- **`existingTimerCount = 0`** at `ENTRY` - Timer wasn't rescheduled by previous run

### Step 3: Recovery
If automatic retries are exhausted:
```bash
dfx canister call pokedbots_racing force_schedule_race_create --ic
```

For individual races that missed their timers:
```bash
# Force start a specific race
dfx canister call pokedbots_racing trigger_race_start '(RACE_ID)' --ic

# Force finish a specific race
dfx canister call pokedbots_racing trigger_race_finish '(RACE_ID)' --ic
```

## Potential Failure Modes

### 1. Handler Traps Before Scheduling Next Timer
**Symptoms:** `race_create_ENTRY` logged but no `race_create_EXIT`, followed by `TT_ERROR`
**Cause:** Exception/trap in handler before reaching scheduling code
**Recovery:** Automatic retry will attempt to re-run the action up to 5 times

### 2. Resource Exhaustion / Concurrent Traps
**Symptoms:** Multiple `TT_ERROR` entries for different action types at similar timestamps
**Cause:** Canister hit resource limits (memory, cycles, instruction count)
**Example:** Jan 2026 incident - `betting_pool_create`, `prize_distribution`, and `race_create` all trapped within seconds

### 3. `alreadyScheduled` Logic False Positive
**Symptoms:** `race_create_EXIT` with `scheduledNextTimer = false` and message "SKIPPED scheduling"
**Cause:** Duplicate detection incorrectly thinks a timer exists

### 4. Timer Cancelled Externally
**Symptoms:** Timer ID appears in log but disappears from active timers
**Cause:** Something called `cancelActionsByIds` or `cancelActionsByFilter`

### 5. Upgrade Interference
**Symptoms:** Timer disappears after canister upgrade
**Cause:** Timer state not properly persisted or restored

### 6. All Retries Exhausted
**Symptoms:** `TT_ERROR` with `retries=5/5` and `willRetry=false`
**Cause:** Action failed 5 consecutive times
**Recovery:** Manual intervention with `force_schedule_race_create`

## Monitoring Checklist

When investigating:

- [ ] How many `race_create_EXIT` entries show `scheduledNextTimer = false`?
- [ ] Are there any `TT_ERROR` entries? Check retry counts.
- [ ] Did retries succeed or all exhaust?
- [ ] What was the last successful timer execution?
- [ ] Did a canister upgrade occur around the time of disappearance?
- [ ] Are there gaps in the timestamps (should be ~5 minutes apart)?
- [ ] Were there concurrent errors across multiple action types (resource exhaustion)?

## Related Files

- [main.mo](../packages/canisters/pokedbots_racing/src/main.mo) - Diagnostic implementation
- Timer handler: `handleRaceCreation`
- Error handler with retries: `reportTTError`
- Diagnostic storage: `stable_timer_diagnostics`
- Retry constants: `MAX_RETRIES_CRITICAL`, `MAX_RETRIES_IMPORTANT`, `RETRY_DELAY_NS`
