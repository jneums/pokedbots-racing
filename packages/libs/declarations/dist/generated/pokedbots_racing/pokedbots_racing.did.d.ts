import type { Principal } from '@icp-sdk/core/principal';
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';

export interface Action {
  'aSync' : [] | [bigint],
  'actionType' : string,
  'params' : Uint8Array | number[],
  'retries' : bigint,
}
export type ActionDetail = [ActionId, Action];
export type ActionFilter = { 'All' : null } |
  { 'ByActionId' : bigint } |
  { 'ByType' : string } |
  { 'ByTimeRange' : [Time__1, Time__1] } |
  { 'ByRetryCount' : bigint };
export interface ActionId { 'id' : bigint, 'time' : Time__1 }
export interface ApiKeyInfo {
  'created' : Time,
  'principal' : Principal,
  'scopes' : Array<string>,
  'name' : string,
}
export interface ApiKeyMetadata {
  'info' : ApiKeyInfo,
  'hashed_key' : HashedApiKey,
}
export type BetType = { 'Win' : null } |
  { 'Show' : null } |
  { 'Place' : null };
export interface BettingPool {
  'status' : PoolStatus,
  'placePool' : bigint,
  'winBetsByBot' : Array<[bigint, bigint]>,
  'terrain' : string,
  'rakeDistributed' : boolean,
  'placeBetsByBot' : Array<[bigint, bigint]>,
  'subaccount' : Uint8Array | number[],
  'showBetsByBot' : Array<[bigint, bigint]>,
  'results' : [] | [RaceResults],
  'distance' : bigint,
  'payoutsCompleted' : boolean,
  'betIds' : Array<bigint>,
  'raceId' : bigint,
  'showPool' : bigint,
  'entrants' : Array<bigint>,
  'totalPooled' : bigint,
  'bettingOpensAt' : bigint,
  'winPool' : bigint,
  'raceClass' : string,
  'bettingClosesAt' : bigint,
  'failedPayouts' : Array<FailedPayout>,
}
export interface BotLoadout {
  'thruster' : [] | [bigint],
  'tokenIndex' : bigint,
  'consumable1' : [] | [bigint],
  'consumable2' : [] | [bigint],
  'core' : [] | [bigint],
  'gyro' : [] | [bigint],
  'legs' : [] | [bigint],
  'lastModified' : bigint,
  'module' : [] | [bigint],
  'chassis' : [] | [bigint],
}
export interface BotSegmentTimes {
  'segmentTimes' : Array<number>,
  'nftId' : string,
}
export interface CancellationResult {
  'cancelled' : Array<ActionId>,
  'errors' : Array<[bigint, string]>,
  'notFound' : Array<bigint>,
}
export type ConsumableEffect = {
    'NitroBoost' : { 'boostPercent' : number, 'durationSegments' : bigint }
  } |
  { 'TerrainAdapt' : { 'durationSegments' : bigint } } |
  { 'ShieldPlating' : { 'badLuckImmunitySegments' : bigint } } |
  { 'LuckSurge' : { 'guaranteedProcType' : string } } |
  { 'OverclockPulse' : { 'statBoost' : bigint, 'durationSegments' : bigint } };
export interface ConsumableInstance {
  'owner' : Principal,
  'createdAt' : bigint,
  'instanceId' : bigint,
  'consumableType' : ConsumableType,
}
export type ConsumableTrigger = { 'OnLastPlace' : null } |
  { 'OnRaceStart' : null } |
  { 'OnLuckProc' : null } |
  { 'OnFinalLap' : null } |
  { 'OnLeadChange' : null } |
  { 'OnOvertaken' : null } |
  { 'OnBadLuck' : null };
export interface ConsumableType {
  'consumableId' : string,
  'trigger' : ConsumableTrigger,
  'ilvl' : bigint,
  'name' : string,
  'description' : string,
  'effect' : ConsumableEffect,
  'rarity' : GearRarity,
}
export interface Destination {
  'owner' : Principal,
  'subaccount' : [] | [Subaccount],
}
export type Distance = { 'MediumHaul' : null } |
  { 'LongTrek' : null } |
  { 'ShortSprint' : null };
export interface EventMetadata {
  'pointsMultiplier' : number,
  'minEntries' : bigint,
  'name' : string,
  'description' : string,
  'divisions' : Array<RaceClass>,
  'eventBonusPrize' : bigint,
  'prizePoolBonus' : bigint,
  'scoringMode' : ScoringMode,
  'entryFee' : bigint,
  'maxEntries' : bigint,
}
export interface EventRegistration {
  'eventId' : bigint,
  'tokenIndex' : bigint,
  'owner' : Principal,
  'entryFeePaid' : bigint,
  'registeredAt' : bigint,
  'raceClass' : RaceClass,
}
export interface EventStandingEntry {
  'tieGroupSize' : bigint,
  'cumulativePoints' : bigint,
  'tokenIndex' : bigint,
  'owner' : Principal,
  'prizeAmount' : bigint,
  'tied' : boolean,
  'raceResults' : Array<
    {
      'raceId' : bigint,
      'position' : bigint,
      'points' : bigint,
      'stageName' : string,
    }
  >,
  'position' : bigint,
}
export type EventStatus = { 'Announced' : null } |
  { 'RegistrationClosed' : null } |
  { 'Cancelled' : null } |
  { 'InProgress' : null } |
  { 'RegistrationOpen' : null } |
  { 'Completed' : null };
export type EventType = { 'DailySprint' : null } |
  { 'SpecialEvent' : string } |
  { 'WeeklyLeague' : null } |
  { 'MonthlyCup' : null };
export type EventVisibility = { 'Private' : null } |
  { 'Public' : null } |
  {
    'Restricted' : {
      'allowedPlayers' : [] | [Array<Principal>],
      'allowedBots' : [] | [Array<bigint>],
      'minElo' : [] | [bigint],
      'requiredFaction' : [] | [string],
      'requiredAchievement' : [] | [string],
      'maxElo' : [] | [bigint],
    }
  };
export interface FactionStandingEntry {
  'members' : Array<
    { 'tokenIndex' : bigint, 'owner' : Principal, 'points' : bigint }
  >,
  'memberCount' : bigint,
  'faction' : string,
  'prizePerMember' : bigint,
  'totalPoints' : bigint,
  'position' : bigint,
}
export type FactionType = { 'Bee' : null } |
  { 'Box' : null } |
  { 'Dead' : null } |
  { 'Food' : null } |
  { 'Game' : null } |
  { 'Wild' : null } |
  { 'Murder' : null } |
  { 'Golden' : null } |
  { 'Animal' : null } |
  { 'Ultimate' : null } |
  { 'Blackhole' : null } |
  { 'UltimateMaster' : null } |
  { 'Industrial' : null } |
  { 'Master' : null };
export interface FailedPayout {
  'userId' : Principal,
  'attempts' : bigint,
  'error' : string,
  'betId' : bigint,
  'amount' : bigint,
  'lastAttempt' : bigint,
}
export type GearCategory = { 'Named' : null } |
  { 'Unique' : null } |
  { 'Standard' : null };
export interface GearPiece {
  'accelerationBonus' : bigint,
  'stabilityBonus' : bigint,
  'craftedFrom' : [] | [Array<bigint>],
  'ilvl' : bigint,
  'name' : string,
  'luckBonus' : bigint,
  'createdAt' : bigint,
  'slot' : GearSlot,
  'description' : string,
  'season' : bigint,
  'passive' : [] | [PassiveEffect],
  'gearId' : bigint,
  'powerCoreBonus' : bigint,
  'sourceRaceId' : [] | [bigint],
  'category' : GearCategory,
  'boundToBot' : bigint,
  'rarity' : GearRarity,
  'sourceEventType' : [] | [string],
  'terrainTag' : TerrainTag,
  'speedBonus' : bigint,
}
export type GearRarity = { 'Epic' : null } |
  { 'Rare' : null } |
  { 'Uncommon' : null } |
  { 'Legendary' : null } |
  { 'Common' : null };
export type GearSlot = { 'Core' : null } |
  { 'Gyro' : null } |
  { 'Legs' : null } |
  { 'Chassis' : null } |
  { 'Thruster' : null } |
  { 'Module' : null };
export type HashedApiKey = string;
export type Header = [string, string];
export type HeatAllocationStrategy = { 'SkillTiered' : null } |
  { 'TopBottom' : null } |
  { 'SnakeDraft' : null } |
  { 'Random' : null };
export interface HttpHeader { 'value' : string, 'name' : string }
export interface HttpRequest {
  'url' : string,
  'method' : string,
  'body' : Uint8Array | number[],
  'headers' : Array<Header>,
  'certificate_version' : [] | [number],
}
export interface HttpRequestResult {
  'status' : bigint,
  'body' : Uint8Array | number[],
  'headers' : Array<HttpHeader>,
}
export interface HttpResponse {
  'body' : Uint8Array | number[],
  'headers' : Array<Header>,
  'upgrade' : [] | [boolean],
  'streaming_strategy' : [] | [StreamingStrategy],
  'status_code' : number,
}
export interface LeaderboardEntry {
  'trend' : TrendDirection,
  'bestFinish' : bigint,
  'tokenIndex' : bigint,
  'owner' : Principal,
  'rank' : bigint,
  'wins' : bigint,
  'podiums' : bigint,
  'lastRaceTime' : bigint,
  'totalEarnings' : bigint,
  'winRate' : number,
  'races' : bigint,
  'previousRank' : [] | [bigint],
  'currentStreak' : bigint,
  'points' : bigint,
  'avgPosition' : number,
}
export type LeaderboardType = { 'AllTime' : null } |
  { 'Division' : RaceClass } |
  { 'Faction' : FactionType } |
  { 'Monthly' : bigint } |
  { 'Season' : bigint };
export interface McpServer {
  'admin_add_scrap_to_rush_hour' : ActorMethod<[bigint], string>,
  'admin_adjust_leaderboard_points' : ActorMethod<[Array<bigint>], string>,
  'admin_cancel_event_and_refund' : ActorMethod<[bigint], string>,
  'admin_clear_active_mission' : ActorMethod<[bigint], string>,
  'admin_compensate_resimulated_winners' : ActorMethod<[Array<bigint>], string>,
  /**
   * / Admin function to manually create betting pool for an existing race
   * / Useful for testing and recovery when races are created in advance
   */
  'admin_create_betting_pool' : ActorMethod<[bigint], Result_2>,
  'admin_create_event_for_orphaned_races' : ActorMethod<
    [bigint, Array<bigint>],
    string
  >,
  'admin_get_active_mission' : ActorMethod<[bigint], string>,
  /**
   * / Get resonance info for a bot (admin only) - for verifying the resonance system
   */
  'admin_get_resonance' : ActorMethod<[bigint], Result_27>,
  /**
   * / Get detailed stat breakdown for debugging (admin only)
   */
  'admin_get_stat_breakdown' : ActorMethod<[bigint], Result_26>,
  'admin_grant_battery' : ActorMethod<[Principal, string], string>,
  'admin_migrate_gear_soulbound' : ActorMethod<[], Result_2>,
  'admin_purge_bot_gear' : ActorMethod<[bigint, boolean], string>,
  'admin_rebuild_bot_histories' : ActorMethod<[Array<bigint>], string>,
  'admin_remove_battery' : ActorMethod<[Principal, bigint], string>,
  /**
   * / Admin method to remove a bot from a race (for fixing bugs/errors)
   */
  'admin_remove_race_entry' : ActorMethod<[bigint, bigint], Result_2>,
  'admin_reschedule_event' : ActorMethod<
    [bigint, bigint, bigint, bigint],
    string
  >,
  'admin_reset_elos' : ActorMethod<[], string>,
  'admin_resimulate_race' : ActorMethod<[bigint], Result_2>,
  'admin_resimulate_races_batch' : ActorMethod<[Array<bigint>], string>,
  'admin_trigger_scheduler' : ActorMethod<[], string>,
  'admin_update_event_heat_allocation' : ActorMethod<[string, string], string>,
  'admin_update_event_metadata' : ActorMethod<
    [bigint, Array<string>, bigint],
    string
  >,
  'admin_update_event_scoring_mode' : ActorMethod<
    [bigint, string, bigint],
    string
  >,
  'admin_update_event_status' : ActorMethod<[bigint, string], string>,
  'admin_update_prize_amounts' : ActorMethod<[Array<bigint>], string>,
  'admin_update_race_min_entries' : ActorMethod<[bigint, bigint], string>,
  'cancel_actions_by_filter' : ActorMethod<[ActionFilter], CancellationResult>,
  'cancel_actions_by_ids' : ActorMethod<[Array<bigint>], CancellationResult>,
  'cancel_races_by_ids' : ActorMethod<[Array<bigint>], Array<[bigint, string]>>,
  /**
   * / Cancel a user-created event. Only the creator can cancel, and only before registration closes.
   * / Refunds: entry fees to all registrants + prize contribution to creator (creation fee is NOT refunded)
   */
  'cancel_user_event' : ActorMethod<[bigint], Result_25>,
  'cleanup_duplicate_race_create_timers' : ActorMethod<[], string>,
  'clear_event_races' : ActorMethod<[Array<bigint>], string>,
  /**
   * / Clear HTTP update tracking stats (owner only)
   */
  'clear_http_update_stats' : ActorMethod<[], Result_24>,
  /**
   * / Clear method call tracking stats (owner only)
   */
  'clear_method_call_stats' : ActorMethod<[], Result_24>,
  /**
   * / Clear race_create timer diagnostic logs (owner only)
   */
  'clear_race_create_diagnostics' : ActorMethod<[], Result_24>,
  'clear_reconstitution_traces' : ActorMethod<[], undefined>,
  /**
   * / * Creates a new API key. This API key is linked to the caller's principal.
   * /    * @param name A human-readable name for the key.
   * /    * @returns The raw, unhashed API key. THIS IS THE ONLY TIME IT WILL BE VISIBLE.
   */
  'create_my_api_key' : ActorMethod<[string, Array<string>], string>,
  /**
   * / Create a user-created event with custom config and optional bot whitelist
   * / Payment: creation fee (0.5 ICP non-refundable) + prize contribution (escrowed, refundable on cancel)
   * / Requires ICRC-2 approval for total amount (creation fee + prize contribution)
   */
  'create_user_event' : ActorMethod<[UserEventConfig], Result_23>,
  /**
   * / Test/debug: Get all available tracks
   */
  'debug_get_all_tracks' : ActorMethod<
    [],
    Array<
      {
        'segmentCount' : bigint,
        'laps' : bigint,
        'name' : string,
        'description' : string,
        'trackId' : bigint,
        'totalDistance' : bigint,
        'primaryTerrain' : Terrain,
      }
    >
  >,
  'debug_regenerate_race_commentary' : ActorMethod<[bigint], Result_2>,
  /**
   * / Debug: Re-simulate an existing race using its stored data
   * / This helps debug mismatches between frontend and backend simulations
   */
  'debug_resimulate_race' : ActorMethod<
    [bigint],
    [] | [
      {
        'originalResults' : Array<
          {
            'stats' : [] | [RacingStats],
            'finalTime' : number,
            'nftId' : string,
            'position' : bigint,
          }
        >,
        'raceParams' : {
          'terrain' : Terrain,
          'trackSeed' : bigint,
          'createdAt' : bigint,
          'distance' : bigint,
          'trackId' : bigint,
          'participantOrder' : Array<string>,
        },
        'resimulatedResults' : Array<
          { 'finalTime' : number, 'nftId' : string, 'position' : bigint }
        >,
      }
    ]
  >,
  /**
   * / Debug: Get detailed scavenging calculations for a bot
   * / Shows all intermediate values for battery/condition accumulation
   */
  'debug_scavenging_calculation' : ActorMethod<
    [bigint],
    [] | [
      {
        'startTime' : bigint,
        'hasActiveMission' : boolean,
        'newValues' : { 'battery' : bigint, 'condition' : bigint },
        'finalRounded' : {
          'partsGained' : bigint,
          'batteryChange' : bigint,
          'conditionChange' : bigint,
        },
        'zoneMultipliers' : {
          'parts' : number,
          'battery' : number,
          'condition' : number,
        },
        'zone' : [] | [string],
        'chargingCurve' : number,
        'currentTime' : bigint,
        'lastAccumulation' : bigint,
        'statBonuses' : {
          'stabilityBonus' : number,
          'powerCoreBonus' : number,
          'speedBonus' : number,
        },
        'factionBonus' : {
          'batteryMultiplier' : number,
          'partsMultiplier' : number,
          'conditionMultiplier' : number,
        },
        'currentStats' : {
          'stability' : bigint,
          'speed' : bigint,
          'acceleration' : bigint,
          'powerCore' : bigint,
        },
        'battery' : bigint,
        'totalHoursElapsed' : number,
        'durationBonus' : number,
        'calculatedDrain' : {
          'conditionLoss' : number,
          'batteryDrain' : number,
          'partsAccumulation' : number,
        },
        'baseRates' : {
          'parts' : number,
          'battery' : number,
          'condition' : number,
        },
        'condition' : bigint,
        'hoursSinceLastAccumulation' : number,
      }
    ]
  >,
  /**
   * / Test/debug: Simulate a race with specific bots on a specific track
   * / Returns detailed results for balance testing, including race events for replay
   */
  'debug_simulate_race' : ActorMethod<
    [bigint, Array<bigint>, bigint],
    [] | [
      {
        'participants' : Array<
          {
            'tokenIndex' : bigint,
            'stats' : {
              'stability' : bigint,
              'speed' : bigint,
              'acceleration' : bigint,
              'powerCore' : bigint,
            },
          }
        >,
        'track' : {
          'segmentCount' : bigint,
          'laps' : bigint,
          'name' : string,
          'description' : string,
          'trackId' : bigint,
          'totalDistance' : bigint,
        },
        'results' : Array<
          {
            'tokenIndex' : bigint,
            'finalTime' : number,
            'avgSegmentTime' : number,
            'position' : bigint,
          }
        >,
        'events' : Array<
          {
            'description' : string,
            'timestamp' : number,
            'segmentIndex' : bigint,
            'eventType' : string,
          }
        >,
        'analysis' : {
          'lastPlaceTime' : number,
          'winner' : bigint,
          'timeSpread' : number,
          'avgTime' : number,
          'winnerTime' : number,
        },
      }
    ]
  >,
  /**
   * / Debug: Test simulate a race with specific bots and track
   * / Returns backend-calculated times for validation
   */
  'debug_test_simulation' : ActorMethod<
    [Array<bigint>, bigint, bigint, bigint, [] | [bigint]],
    [] | [
      {
        'createdAt' : bigint,
        'results' : Array<
          {
            'tokenIndex' : bigint,
            'stats' : {
              'luck' : bigint,
              'stability' : bigint,
              'speed' : bigint,
              'acceleration' : bigint,
              'powerCore' : bigint,
            },
            'finalTime' : number,
          }
        >,
        'events' : Array<
          {
            'description' : string,
            'timestamp' : number,
            'segmentIndex' : bigint,
            'eventType' : RaceEventType,
          }
        >,
      }
    ]
  >,
  /**
   * / Decode EXT token identifier to get token index (public query)
   */
  'decode_token_identifier' : ActorMethod<[string], bigint>,
  'delete_events_and_races' : ActorMethod<[Array<bigint>], string>,
  'emergency_clear_all_timers' : ActorMethod<[], bigint>,
  /**
   * / Encode token index to EXT token identifier (public query)
   */
  'encode_token_identifier' : ActorMethod<[number], string>,
  /**
   * / Admin method to force event finalization (for recovering stuck events)
   */
  'force_finalize_event' : ActorMethod<[bigint], string>,
  'force_finish_race' : ActorMethod<[bigint], string>,
  'force_release_lock' : ActorMethod<[], [] | [Time]>,
  /**
   * / Manually trigger a race_create timer if none exist (owner only, emergency recovery)
   */
  'force_schedule_race_create' : ActorMethod<[], Result_22>,
  'force_system_timer_cancel' : ActorMethod<[], boolean>,
  'get_actions_by_filter' : ActorMethod<[ActionFilter], Array<ActionDetail>>,
  'get_all_scheduled_events' : ActorMethod<[], Array<ScheduledEvent>>,
  /**
   * / Get all token IDs that have metadata
   */
  'get_all_token_ids' : ActorMethod<[], Array<bigint>>,
  /**
   * / Get total count of pre-computed base stats
   */
  'get_base_stats_count' : ActorMethod<[], bigint>,
  /**
   * / Get public bot profile (stats + career, no sensitive info like battery/condition)
   */
  'get_bot_profile' : ActorMethod<
    [bigint],
    [] | [
      {
        'tokenIndex' : bigint,
        'owner' : [] | [Principal],
        'isInitialized' : boolean,
        'name' : [] | [string],
        'eloRating' : [] | [bigint],
        'stats' : {
          'luck' : bigint,
          'stability' : bigint,
          'speed' : bigint,
          'overallRating' : bigint,
          'acceleration' : bigint,
          'powerCore' : bigint,
        },
        'preferredTerrain' : [] | [Terrain],
        'faction' : [] | [FactionType],
        'career' : {
          'wins' : bigint,
          'podiums' : bigint,
          'racesEntered' : bigint,
          'totalEarnings' : bigint,
        },
        'raceClass' : [] | [RaceClass],
      }
    ]
  >,
  /**
   * / Batch get bot profiles (efficient for loading multiple bots at once)
   */
  'get_bot_profiles_batch' : ActorMethod<
    [Array<bigint>],
    Array<
      {
        'tokenIndex' : bigint,
        'owner' : [] | [Principal],
        'isInitialized' : boolean,
        'name' : [] | [string],
        'eloRating' : [] | [bigint],
        'stats' : {
          'luck' : bigint,
          'stability' : bigint,
          'speed' : bigint,
          'overallRating' : bigint,
          'acceleration' : bigint,
          'powerCore' : bigint,
        },
        'preferredTerrain' : [] | [Terrain],
        'faction' : [] | [FactionType],
        'career' : {
          'wins' : bigint,
          'podiums' : bigint,
          'racesEntered' : bigint,
          'totalEarnings' : bigint,
        },
        'raceClass' : [] | [RaceClass],
      }
    >
  >,
  'get_bot_race_history' : ActorMethod<
    [bigint, bigint, [] | [bigint]],
    {
      'hasMore' : boolean,
      'nextRaceId' : [] | [bigint],
      'races' : Array<
        {
          'eventId' : bigint,
          'raceName' : string,
          'prizeAmount' : bigint,
          'scheduledTime' : bigint,
          'totalRacers' : bigint,
          'finalTime' : [] | [number],
          'leaderboardPoints' : bigint,
          'raceId' : bigint,
          'position' : bigint,
          'eventName' : string,
        }
      >,
    }
  >,
  /**
   * / Get all completed races with their results for analysis
   */
  'get_completed_races' : ActorMethod<
    [bigint],
    Array<
      {
        'terrain' : Terrain,
        'entryCount' : bigint,
        'trackSeed' : bigint,
        'name' : string,
        'results' : [] | [
          Array<{ 'finalTime' : number, 'nftId' : string, 'position' : bigint }>
        ],
        'distance' : bigint,
        'trackId' : bigint,
        'raceId' : bigint,
        'raceClass' : RaceClass,
      }
    >
  >,
  'get_current_periods' : ActorMethod<
    [],
    { 'seasonId' : bigint, 'monthId' : bigint }
  >,
  'get_event_details' : ActorMethod<[bigint], [] | [ScheduledEvent]>,
  'get_event_results' : ActorMethod<
    [bigint],
    [] | [
      {
        'factionStandings' : [] | [Array<FactionStandingEntry>],
        'isMultiStage' : boolean,
        'event' : ScheduledEvent,
        'cumulativeStandings' : [] | [Array<EventStandingEntry>],
        'raceResultsSummary' : Array<
          {
            'status' : RaceStatus,
            'terrain' : Terrain,
            'results' : [] | [
              Array<
                {
                  'tokenIndex' : bigint,
                  'owner' : Principal,
                  'prizeAmount' : bigint,
                  'finalTime' : number,
                  'position' : bigint,
                }
              >
            ],
            'distance' : bigint,
            'raceId' : bigint,
            'raceClass' : RaceClass,
            'stageName' : string,
          }
        >,
        'scoringMode' : ScoringMode,
        'totalPrizePool' : bigint,
      }
    ]
  >,
  'get_event_with_races' : ActorMethod<
    [bigint],
    [] | [
      {
        'event' : ScheduledEvent,
        'races' : Array<
          {
            'terrain' : Terrain,
            'name' : string,
            'distance' : bigint,
            'participantTokens' : Array<bigint>,
            'currentEntries' : bigint,
            'raceId' : bigint,
            'entryFee' : bigint,
            'maxEntries' : bigint,
            'raceClass' : RaceClass,
          }
        >,
      }
    ]
  >,
  /**
   * / Get the currently configured EXT NFT canister ID.
   */
  'get_ext_canister' : ActorMethod<[], Principal>,
  /**
   * / Get HTTP request update tracking stats (tracks ALL update calls including untracked MCP protocol calls)
   */
  'get_http_update_stats' : ActorMethod<
    [],
    {
      'totalUpdateCalls' : bigint,
      'trackingStartTime' : bigint,
      'unparseableRequests' : bigint,
      'byMethod' : Array<{ 'method' : string, 'count' : bigint }>,
    }
  >,
  /**
   * / Get the currently configured ICP ledger canister ID.
   */
  'get_icp_ledger' : ActorMethod<[], [] | [Principal]>,
  'get_latest_reconstitution_trace' : ActorMethod<
    [],
    [] | [ReconstitutionTrace]
  >,
  'get_leaderboard' : ActorMethod<
    [LeaderboardType, bigint, bigint, [] | [RaceClass]],
    {
      'total' : bigint,
      'hasMore' : boolean,
      'entries' : Array<LeaderboardEntry>,
    }
  >,
  /**
   * / Get enriched marketplace listings with racing stats (public query)
   * / Takes a list of token indices to enrich (no inter-canister calls in queries)
   */
  'get_marketplace_bots_enriched' : ActorMethod<
    [Uint32Array | number[]],
    Array<
      {
        'tokenIndex' : number,
        'isInitialized' : boolean,
        'racingStats' : [] | [
          {
            'baseAcceleration' : bigint,
            'places' : bigint,
            'currentStability' : bigint,
            'wins' : bigint,
            'baseStability' : bigint,
            'shows' : bigint,
            'overallRating' : bigint,
            'currentPowerCore' : bigint,
            'baseSpeed' : bigint,
            'baseRating' : bigint,
            'basePowerCore' : bigint,
            'currentRating' : bigint,
            'racesEntered' : bigint,
            'faction' : string,
            'currentSpeed' : bigint,
            'currentAcceleration' : bigint,
            'battery' : bigint,
            'winRate' : number,
            'condition' : bigint,
          }
        ],
        'baseStats' : {
          'stability' : bigint,
          'speed' : bigint,
          'acceleration' : bigint,
          'powerCore' : bigint,
        },
      }
    >
  >,
  /**
   * / Get method call statistics grouped by method and caller
   */
  'get_method_call_stats' : ActorMethod<
    [],
    {
      'totalUniqueCallers' : bigint,
      'trackingStartTime' : bigint,
      'byCaller' : Array<
        { 'totalCalls' : bigint, 'methodCount' : bigint, 'caller' : Principal }
      >,
      'entries' : Array<
        {
          'method' : string,
          'count' : bigint,
          'caller' : Principal,
          'lastCallTimestamp' : bigint,
        }
      >,
      'byMethod' : Array<
        { 'method' : string, 'totalCalls' : bigint, 'uniqueCallers' : bigint }
      >,
      'totalMethods' : bigint,
    }
  >,
  /**
   * / Get events created by the calling user
   */
  'get_my_events' : ActorMethod<[], Array<ScheduledEvent>>,
  'get_my_ranking' : ActorMethod<
    [LeaderboardType, bigint],
    [] | [LeaderboardEntry]
  >,
  /**
   * / Get decoded metadata for a specific NFT (public query)
   */
  'get_nft_metadata' : ActorMethod<[bigint], [] | [NFTMetadata]>,
  /**
   * / Get decoded metadata for multiple NFTs in one call (public query)
   */
  'get_nft_metadata_batch' : ActorMethod<
    [Array<bigint>],
    Array<[bigint, [] | [NFTMetadata]]>
  >,
  /**
   * / Get metadata by EXT token identifier (public query)
   */
  'get_nft_metadata_by_identifier' : ActorMethod<[string], [] | [NFTMetadata]>,
  /**
   * / Get paginated NFT metadata (decoded, public query)
   */
  'get_nft_metadata_page' : ActorMethod<
    [bigint, bigint],
    Array<[bigint, NFTMetadata]>
  >,
  /**
   * / Get raw stats for a specific NFT (returns integer array)
   */
  'get_nft_stats' : ActorMethod<[bigint], [] | [NFTStats]>,
  /**
   * / Get raw stats by EXT token identifier (public query)
   */
  'get_nft_stats_by_identifier' : ActorMethod<[string], [] | [NFTStats]>,
  /**
   * / Get a decoded trait value by trait name (for display)
   */
  'get_nft_trait' : ActorMethod<[bigint, string], [] | [string]>,
  /**
   * / Get a specific trait value ID by trait index (for calculations)
   */
  'get_nft_trait_value' : ActorMethod<[bigint, bigint], [] | [bigint]>,
  /**
   * / Get the current owner of the canister.
   */
  'get_owner' : ActorMethod<[], Principal>,
  'get_past_events' : ActorMethod<[bigint, bigint], Array<ScheduledEvent>>,
  'get_platform_stats' : ActorMethod<
    [],
    {
      'totalWins' : bigint,
      'totalRacers' : bigint,
      'totalEarnings' : bigint,
      'totalRaces' : bigint,
    }
  >,
  'get_race_by_id' : ActorMethod<[bigint], [] | [Race]>,
  /**
   * / Get race_create timer handler diagnostic logs
   */
  'get_race_create_diagnostics' : ActorMethod<
    [],
    {
      'totalCount' : bigint,
      'entries' : Array<
        {
          'existingTimerCount' : bigint,
          'nextTimerTime' : [] | [bigint],
          'scheduledNextTimer' : boolean,
          'message' : string,
          'timestamp' : bigint,
          'actionId' : { 'id' : bigint, 'time' : bigint },
          'handlerType' : string,
        }
      >,
      'currentRaceCreateTimers' : bigint,
    }
  >,
  /**
   * / Get detailed timer state for race_create debugging
   */
  'get_race_create_timer_state' : ActorMethod<
    [],
    {
      'allTimerCount' : bigint,
      'raceStartTimers' : Array<
        { 'id' : bigint, 'time' : bigint, 'actionType' : string }
      >,
      'raceFinishTimers' : Array<
        { 'id' : bigint, 'time' : bigint, 'actionType' : string }
      >,
      'raceCreateTimers' : Array<
        { 'id' : bigint, 'time' : bigint, 'actionType' : string }
      >,
    }
  >,
  'get_race_segments' : ActorMethod<[bigint], Result_21>,
  'get_reconstitution_traces' : ActorMethod<[], Array<ReconstitutionTrace>>,
  'get_timer_diagnostics' : ActorMethod<[], TimerDiagnostics>,
  /**
   * / Get total count of NFTs with metadata stored
   */
  'get_total_nft_count' : ActorMethod<[], bigint>,
  /**
   * / Get the trait schema (public query)
   */
  'get_trait_schema' : ActorMethod<[], TraitSchema>,
  /**
   * / Get the canister's balance of a specific ICRC-1 token.
   */
  'get_treasury_balance' : ActorMethod<[Principal], bigint>,
  'get_upcoming_events' : ActorMethod<[bigint], Array<ScheduledEvent>>,
  'get_upcoming_events_with_races' : ActorMethod<
    [bigint],
    Array<
      {
        'event' : ScheduledEvent,
        'raceSummary' : {
          'completedRaces' : bigint,
          'distances' : Array<bigint>,
          'totalParticipants' : bigint,
          'nextRaceStartTime' : [] | [bigint],
          'pendingRaces' : bigint,
          'totalPrizePool' : bigint,
          'terrains' : Array<Terrain>,
          'totalRaces' : bigint,
        },
      }
    >
  >,
  /**
   * / Handle incoming HTTP requests.
   */
  'http_request' : ActorMethod<[HttpRequest], HttpResponse>,
  /**
   * / Handle streaming callbacks for large HTTP responses.
   */
  'http_request_streaming_callback' : ActorMethod<
    [StreamingToken],
    [] | [StreamingCallbackResponse]
  >,
  /**
   * / Handle incoming HTTP requests that modify state (e.g., POST).
   */
  'http_request_update' : ActorMethod<[HttpRequest], HttpResponse>,
  'icrc120_upgrade_finished' : ActorMethod<[], UpgradeFinishedResult>,
  /**
   * / List all API keys owned by the caller.
   * /    * @returns A list of API key metadata (but not the raw keys).
   */
  'list_my_api_keys' : ActorMethod<[], Array<ApiKeyMetadata>>,
  'query_races' : ActorMethod<
    [
      {
        'afterRaceId' : [] | [bigint],
        'status' : [] | [RaceStatus],
        'participantPrincipal' : [] | [Principal],
        'eligibleForCaller' : [] | [
          { 'caller' : Principal, 'eligibleOnly' : boolean }
        ],
        'minPrizePool' : [] | [bigint],
        'terrain' : [] | [Terrain],
        'minEntries' : [] | [bigint],
        'limit' : bigint,
        'maxPrizePool' : [] | [bigint],
        'startTimeTo' : [] | [bigint],
        'hasMinimumEntries' : [] | [boolean],
        'maxEntries' : [] | [bigint],
        'startTimeFrom' : [] | [bigint],
        'raceClass' : [] | [RaceClass],
        'participantNftId' : [] | [string],
      },
    ],
    {
      'hasMore' : boolean,
      'nextRaceId' : [] | [bigint],
      'races' : Array<Race>,
      'totalMatching' : bigint,
    }
  >,
  'recalculate_bot_stats' : ActorMethod<[], string>,
  /**
   * / Register a bot for an event (with ICRC-2 payment for entry fee)
   */
  'register_for_event' : ActorMethod<[bigint, bigint], Result_2>,
  /**
   * / Revoke (delete) an API key owned by the caller.
   * /    * @param key_id The ID of the key to revoke.
   * /    * @returns True if the key was found and revoked, false otherwise.
   */
  'revoke_my_api_key' : ActorMethod<[string], undefined>,
  /**
   * / Set the EXT NFT canister ID. Only the current owner can call this.
   */
  'set_ext_canister' : ActorMethod<[Principal], Result_18>,
  /**
   * / Set the ICP ledger canister ID. Only the current owner can call this.
   */
  'set_icp_ledger' : ActorMethod<[Principal], Result_18>,
  /**
   * / Set a new owner for the canister. Only the current owner can call this.
   */
  'set_owner' : ActorMethod<[Principal], Result_20>,
  'transformJwksResponse' : ActorMethod<
    [{ 'context' : Uint8Array | number[], 'response' : HttpRequestResult }],
    HttpRequestResult
  >,
  'trigger_race_creation' : ActorMethod<[], string>,
  'trigger_race_finish' : ActorMethod<[bigint], string>,
  'trigger_race_start' : ActorMethod<[bigint], string>,
  /**
   * / Unregister from an event and get a refund based on timing
   */
  'unregister_from_event' : ActorMethod<[bigint, bigint], Result_19>,
  /**
   * / Upload a batch of pre-computed base stats
   */
  'upload_base_stats_batch' : ActorMethod<
    [
      Array<
        [
          bigint,
          {
            'stability' : bigint,
            'speed' : bigint,
            'acceleration' : bigint,
            'powerCore' : bigint,
            'faction' : string,
          },
        ]
      >,
    ],
    undefined
  >,
  /**
   * / Upload NFT stats in batch (owner only for security)
   * / Stats are stored as raw integer arrays [type_id, body_id, driver_id, ...]
   */
  'upload_nft_stats_batch' : ActorMethod<
    [Array<[bigint, NFTStats]>],
    Result_18
  >,
  /**
   * / Upload trait schema (owner only, done once)
   */
  'upload_trait_schema' : ActorMethod<[TraitSchema], Result_18>,
  'validate_timer_state' : ActorMethod<[], Array<string>>,
  /**
   * / Batch complete scavenging missions for multiple bots
   */
  'web_batch_complete_scavenging' : ActorMethod<
    [Array<bigint>],
    Array<{ 'result' : Result_2, 'tokenIndex' : bigint }>
  >,
  /**
   * / Batch recharge multiple bots (0.1 ICP each + fees via ICRC-2)
   */
  'web_batch_recharge_bots' : ActorMethod<
    [Array<bigint>],
    Array<{ 'result' : Result_2, 'tokenIndex' : bigint }>
  >,
  /**
   * / Batch repair multiple bots (0.05 ICP each + fees via ICRC-2)
   */
  'web_batch_repair_bots' : ActorMethod<
    [Array<bigint>],
    Array<{ 'result' : Result_2, 'tokenIndex' : bigint }>
  >,
  /**
   * / Batch start scavenging missions for multiple bots
   */
  'web_batch_start_scavenging' : ActorMethod<
    [Array<bigint>, string, [] | [bigint]],
    Array<{ 'result' : Result_2, 'tokenIndex' : bigint }>
  >,
  /**
   * / Get user's betting history for UI
   */
  'web_betting_get_my_bets' : ActorMethod<
    [bigint],
    {
      'bets' : Array<
        {
          'status' : string,
          'token_index' : bigint,
          'amount_e8s' : bigint,
          'amount_icp' : string,
          'race_id' : bigint,
          'bet_id' : bigint,
          'timestamp' : bigint,
          'bet_type' : string,
          'payout' : [] | [
            {
              'payout_e8s' : bigint,
              'payout_icp' : string,
              'roi_percent' : string,
            }
          ],
        }
      >,
      'count' : bigint,
      'summary' : {
        'pending' : bigint,
        'net_profit_icp' : string,
        'wins' : bigint,
        'losses' : bigint,
        'win_rate_percent' : string,
        'total_bets' : bigint,
        'total_wagered_icp' : string,
        'total_won_icp' : string,
        'roi_percent' : string,
      },
    }
  >,
  'web_betting_get_my_bets_paginated' : ActorMethod<
    [bigint, bigint],
    {
      'total' : bigint,
      'hasMore' : boolean,
      'bets' : Array<
        {
          'status' : string,
          'token_index' : bigint,
          'amount_e8s' : bigint,
          'amount_icp' : string,
          'race_id' : bigint,
          'bet_id' : bigint,
          'timestamp' : bigint,
          'bet_type' : string,
          'payout' : [] | [
            {
              'payout_e8s' : bigint,
              'payout_icp' : string,
              'roi_percent' : string,
            }
          ],
        }
      >,
      'summary' : {
        'pending' : bigint,
        'net_profit_icp' : string,
        'wins' : bigint,
        'losses' : bigint,
        'win_rate_percent' : string,
        'total_bets' : bigint,
        'total_wagered_icp' : string,
        'total_won_icp' : string,
        'roi_percent' : string,
      },
    }
  >,
  /**
   * / Get betting pool info for UI
   */
  'web_betting_get_pool_info' : ActorMethod<[bigint], [] | [BettingPool]>,
  /**
   * / List betting pools for UI
   */
  'web_betting_list_pools' : ActorMethod<
    [[] | [PoolStatus], bigint],
    {
      'pools' : Array<
        {
          'status' : PoolStatus,
          'totalBets' : bigint,
          'raceId' : bigint,
          'totalPooled' : bigint,
          'bettingOpensAt' : bigint,
          'bettingClosesAt' : bigint,
        }
      >,
    }
  >,
  /**
   * / Place a bet for UI
   */
  'web_betting_place_bet' : ActorMethod<
    [bigint, bigint, BetType, bigint],
    Result_17
  >,
  /**
   * / Cancel an in-progress upgrade (DEPRECATED - upgrades are now instant)
   * / Settle a legacy upgrade that was in progress when we switched to instant upgrades
   * / This runs the RNG and completes the upgrade for users who were mid-upgrade
   */
  'web_cancel_upgrade' : ActorMethod<[bigint], Result_2>,
  /**
   * / Claim a free starter bot. One per class (Scrap/Junker/Raider/Elite).
   * / User picks faction from: Game, Animal, Industrial, Food.
   */
  'web_claim_starter_bot' : ActorMethod<
    [string, string, [] | [string]],
    Result_16
  >,
  /**
   * / Combine parts to create Universal parts (1 of each type = 1 Universal)
   */
  'web_combine_parts_to_universal' : ActorMethod<[bigint], Result_2>,
  /**
   * / Complete a repair bay upgrade after build time has passed
   */
  'web_complete_repair_bay_upgrade' : ActorMethod<[bigint], Result_15>,
  /**
   * / Complete a scavenging mission and collect rewards (web method)
   */
  'web_complete_scavenging' : ActorMethod<[bigint], Result_2>,
  /**
   * / Convert parts from one type to another (25% conversion cost)
   */
  'web_convert_parts' : ActorMethod<[string, string, bigint], Result_2>,
  /**
   * / Craft 5 gear pieces of the same slot and rarity into a higher rarity piece
   * / All pieces must be soulbound to the same bot (tokenIndex).
   */
  'web_craft_gear' : ActorMethod<[bigint, Array<bigint>], Result_14>,
  /**
   * / Delete a starter bot to free the slot for a new faction choice.
   */
  'web_delete_starter_bot' : ActorMethod<[string], Result_2>,
  /**
   * / De-register a bot (removes control, preserves stats)
   */
  'web_deregister_bot' : ActorMethod<[bigint], Result_2>,
  /**
   * / Enter a race (with ICRC-2 payment for entry fee)
   */
  'web_enter_race' : ActorMethod<[bigint, bigint], Result_2>,
  /**
   * / Equip a consumable to a bot's loadout (slot 1 or 2)
   */
  'web_equip_consumable' : ActorMethod<[bigint, bigint, bigint], Result_3>,
  /**
   * / Equip a gear piece to a bot
   */
  'web_equip_gear' : ActorMethod<[bigint, bigint], Result_3>,
  /**
   * / Full Maintenance - combines recharge and repair in a single transaction (0.15 ICP + fee via ICRC-2)
   */
  'web_full_maintenance' : ActorMethod<[bigint], Result_2>,
  /**
   * / Get batch dedication info for multiple bots (optimized for garage list)
   */
  'web_get_batch_dedication_info' : ActorMethod<
    [Array<bigint>],
    Array<
      [
        bigint,
        {
          'tierName' : string,
          'totalDP' : bigint,
          'tier' : bigint,
          'benefits' : {
            'accelerationBonus' : bigint,
            'stabilityBonus' : bigint,
            'scavengingYieldMult' : number,
            'repairCooldownMult' : number,
            'rechargeCooldownMult' : number,
            'powerCoreBonus' : bigint,
            'terrainBonusPercent' : bigint,
            'upgradeDiscountMult' : number,
            'speedBonus' : bigint,
          },
        },
      ]
    >
  >,
  /**
   * / Get user's battery storage (batteries + heat status for bots)
   */
  'web_get_batteries' : ActorMethod<
    [],
    {
      'batteries' : Array<
        {
          'id' : bigint,
          'cyclesPercent' : number,
          'totalJoltsDelivered' : bigint,
          'healthPercent' : bigint,
          'isEnabled' : boolean,
          'batteryType' : string,
          'isOperational' : boolean,
          'storedKwh' : number,
          'kwhThroughput' : number,
          'discoveredAt' : bigint,
          'baseCapacityKwh' : number,
          'maxCapacityKwh' : number,
        }
      >,
      'summary' : {
        'operationalBatteries' : bigint,
        'firstBatteryDiscovered' : boolean,
        'cumulativeScavengingHours' : number,
        'totalStoredKwh' : number,
        'totalBatteries' : bigint,
        'totalCapacityKwh' : number,
      },
    }
  >,
  /**
   * / Get battery type info (costs, capacities, etc.)
   */
  'web_get_battery_info' : ActorMethod<
    [],
    {
      'types' : Array<
        {
          'salvageReturnParts' : bigint,
          'rebuildCostIcp' : bigint,
          'name' : string,
          'repairCostParts' : bigint,
          'drawRateWatts' : bigint,
          'rebuildCostParts' : bigint,
          'baseCapacityKwh' : number,
        }
      >,
    }
  >,
  /**
   * / Get detailed stats for a specific bot
   */
  'web_get_bot_details' : ActorMethod<[bigint], Result_13>,
  /**
   * / Get bot details for multiple token indices (query call for performance)
   */
  'web_get_bot_details_batch' : ActorMethod<
    [Array<bigint>],
    Array<
      {
        'baseAcceleration' : bigint,
        'tokenIndex' : bigint,
        'isInitialized' : boolean,
        'wins' : bigint,
        'baseStability' : bigint,
        'imageUrl' : string,
        'overallRating' : bigint,
        'baseSpeed' : bigint,
        'basePowerCore' : bigint,
        'racesEntered' : bigint,
        'faction' : [] | [string],
        'winRate' : number,
      }
    >
  >,
  /**
   * / Get heat status for a specific bot
   */
  'web_get_bot_heat' : ActorMethod<
    [bigint],
    {
      'heatStacks' : bigint,
      'lastJoltTime' : bigint,
      'minutesUntilCooldown' : [] | [bigint],
      'isOverheated' : boolean,
      'overheatUntil' : [] | [bigint],
      'maxHeat' : bigint,
    }
  >,
  /**
   * / Get a bot's equipped loadout with full gear details
   */
  'web_get_bot_loadout' : ActorMethod<
    [bigint],
    {
      'thruster' : [] | [GearPiece],
      'tokenIndex' : bigint,
      'consumable1' : [] | [ConsumableInstance],
      'consumable2' : [] | [ConsumableInstance],
      'core' : [] | [GearPiece],
      'gyro' : [] | [GearPiece],
      'legs' : [] | [GearPiece],
      'module' : [] | [GearPiece],
      'chassis' : [] | [GearPiece],
    }
  >,
  /**
   * / Get faction synergy bonuses for the caller's collection
   */
  'web_get_collection_bonuses' : ActorMethod<
    [],
    {
      'yieldMultipliers' : { 'prizes' : number, 'parts' : number },
      'statBonuses' : {
        'stability' : bigint,
        'speed' : bigint,
        'acceleration' : bigint,
        'powerCore' : bigint,
      },
      'drainMultipliers' : { 'scavenging' : number },
      'costMultipliers' : {
        'repair' : number,
        'upgrade' : number,
        'rechargeCooldown' : number,
      },
    }
  >,
  /**
   * / Get dedication info for a specific bot
   */
  'web_get_dedication_info' : ActorMethod<
    [bigint],
    {
      'tierName' : string,
      'totalDP' : bigint,
      'tier' : bigint,
      'activityDP' : bigint,
      'progressPercent' : bigint,
      'benefits' : {
        'accelerationBonus' : bigint,
        'stabilityBonus' : bigint,
        'scavengingYieldMult' : number,
        'repairCooldownMult' : number,
        'rechargeCooldownMult' : number,
        'powerCoreBonus' : bigint,
        'terrainBonusPercent' : bigint,
        'upgradeDiscountMult' : number,
        'speedBonus' : bigint,
      },
      'investmentDP' : bigint,
      'nextTierDP' : [] | [bigint],
      'nextTierName' : [] | [string],
      'totalInvestedICP' : number,
    }
  >,
  /**
   * / Get garage power grid status for the caller
   * / Shows total capacity, current draw, number of bots charging, and efficiency
   */
  'web_get_garage_power_status' : ActorMethod<
    [],
    {
      'effectiveBatteryDrawWatts' : bigint,
      'efficiency' : number,
      'batteriesCharging' : bigint,
      'wattsPerBotRequired' : bigint,
      'repairBayDrawWatts' : bigint,
      'smrLifetimeUsedKwh' : number,
      'wattsPerBot' : bigint,
      'smrLifetimePercent' : number,
      'activeRepairBays' : bigint,
      'botsCharging' : bigint,
      'currentDrawWatts' : bigint,
      'smrCapacityWatts' : bigint,
      'smrLifetimeTotalKwh' : bigint,
      'basePowerWatts' : bigint,
      'surplusWatts' : bigint,
      'batteryDrawWatts' : bigint,
      'installedSMRCount' : bigint,
      'totalCapacityWatts' : bigint,
    }
  >,
  /**
   * / Get total gear stat bonuses for a bot
   */
  'web_get_gear_bonuses' : ActorMethod<
    [bigint],
    {
      'luck' : bigint,
      'stability' : bigint,
      'speed' : bigint,
      'acceleration' : bigint,
      'powerCore' : bigint,
    }
  >,
  /**
   * / Get which bot each gear piece is equipped on (gearId → tokenIndex)
   */
  'web_get_gear_equip_map' : ActorMethod<[], Array<[bigint, bigint]>>,
  /**
   * / Get a single gear piece by ID
   */
  'web_get_gear_piece' : ActorMethod<[bigint], [] | [GearPiece]>,
  /**
   * / Get all consumables owned by a player
   */
  'web_get_player_consumables' : ActorMethod<
    [Principal],
    Array<ConsumableInstance>
  >,
  /**
   * / Get all gear owned by a player (full details)
   */
  'web_get_player_gear' : ActorMethod<[Principal], Array<GearPiece>>,
  /**
   * / Get user's bots tagged as racers
   */
  'web_get_racer_bots' : ActorMethod<[], Array<bigint>>,
  /**
   * / Get all repair bay tier configurations (for UI display)
   */
  'web_get_repair_bay_tiers' : ActorMethod<
    [],
    Array<
      {
        'repairRatePerHour' : bigint,
        'partsCost' : bigint,
        'icpCostE8s' : bigint,
        'name' : string,
        'tier' : bigint,
        'powerDrawWatts' : bigint,
        'buildTimeSeconds' : bigint,
      }
    >
  >,
  /**
   * / Get upgrade costs for a specific repair bay
   */
  'web_get_repair_bay_upgrade_cost' : ActorMethod<[bigint], Result_12>,
  /**
   * / Get user's bots tagged as scavengers
   */
  'web_get_scavenger_bots' : ActorMethod<[], Array<bigint>>,
  /**
   * / Get user's starred bots
   */
  'web_get_starred_bots' : ActorMethod<[], Array<bigint>>,
  /**
   * / Get starter bot slots for the caller
   */
  'web_get_starter_bot_slots' : ActorMethod<[], StarterBotSlots>,
  /**
   * / Get total gear count (admin/stats)
   */
  'web_get_total_gear_count' : ActorMethod<[], bigint>,
  /**
   * / Get user's parts inventory
   */
  'web_get_user_inventory' : ActorMethod<[], UserInventory>,
  /**
   * / Get user's repair bays with current status
   */
  'web_get_user_repair_bays' : ActorMethod<
    [],
    {
      'nextSlotCost' : [] | [{ 'icpE8s' : bigint, 'parts' : bigint }],
      'bays' : Array<
        {
          'repairStartCondition' : [] | [bigint],
          'tierName' : string,
          'repairRatePerHour' : bigint,
          'tier' : bigint,
          'upgradeInProgress' : [] | [
            {
              'startTime' : bigint,
              'completionTime' : bigint,
              'targetTierName' : string,
              'targetTier' : bigint,
              'remainingSeconds' : bigint,
            }
          ],
          'powerDrawWatts' : bigint,
          'bayId' : bigint,
          'repairStartTime' : [] | [bigint],
          'currentBotToken' : [] | [bigint],
        }
      >,
      'totalBays' : bigint,
      'totalIcpInvested' : bigint,
      'fallbackRepairRate' : bigint,
      'totalPartsInvested' : bigint,
      'maxBays' : bigint,
    }
  >,
  /**
   * / Get user's installed SMRs with individual lifetime tracking
   */
  'web_get_user_smrs' : ActorMethod<
    [],
    {
      'totalPowerOutput' : bigint,
      'installedSMRs' : Array<
        {
          'model' : string,
          'powerOutput' : bigint,
          'lifetimePercent' : number,
          'usedKwh' : number,
          'installedAt' : bigint,
          'lifetimeKwh' : bigint,
        }
      >,
    }
  >,
  /**
   * / Initialize a bot for racing (web equivalent of garage_initialize_pokedbot)
   */
  'web_initialize_bot' : ActorMethod<[bigint, [] | [string]], Result_2>,
  /**
   * / Jolt a bot using a battery
   */
  'web_jolt_bot' : ActorMethod<[bigint, bigint], Result_11>,
  /**
   * / List all PokedBots owned by the caller in their wallet
   */
  'web_list_my_bots' : ActorMethod<
    [],
    Array<
      {
        'heatStatus' : [] | [
          {
            'heatStacks' : bigint,
            'minutesUntilCooldown' : [] | [bigint],
            'isOverheated' : boolean,
          }
        ],
        'activeUpgrade' : [] | [UpgradeSession],
        'maxStats' : [] | [
          {
            'stability' : bigint,
            'speed' : bigint,
            'acceleration' : bigint,
            'powerCore' : bigint,
          }
        ],
        'tokenIndex' : bigint,
        'isInitialized' : boolean,
        'name' : [] | [string],
        'eligibleRaces' : Array<
          {
            'startTime' : bigint,
            'terrain' : Terrain,
            'name' : string,
            'raceId' : bigint,
            'entryDeadline' : bigint,
            'entryFee' : bigint,
          }
        >,
        'currentOwner' : string,
        'stats' : [] | [PokedBotRacingStats],
        'upcomingRaces' : Array<
          {
            'startTime' : bigint,
            'terrain' : Terrain,
            'name' : string,
            'raceId' : bigint,
            'entryDeadline' : bigint,
            'entryFee' : bigint,
          }
        >,
        'dedicationBonuses' : [] | [
          {
            'stability' : bigint,
            'speed' : bigint,
            'acceleration' : bigint,
            'powerCore' : bigint,
          }
        ],
        'currentStats' : [] | [
          {
            'stability' : bigint,
            'speed' : bigint,
            'acceleration' : bigint,
            'powerCore' : bigint,
          }
        ],
        'upgradeCostsV2' : [] | [
          {
            'stability' : { 'successRate' : number, 'costE8s' : bigint },
            'speed' : { 'successRate' : number, 'costE8s' : bigint },
            'acceleration' : { 'successRate' : number, 'costE8s' : bigint },
            'powerCore' : { 'successRate' : number, 'costE8s' : bigint },
            'pityCounter' : bigint,
          }
        ],
      }
    >
  >,
  /**
   * / List all PokedBots registered in the garage by the caller (QUERY - no EXT canister call)
   * / Returns only bots that have been initialized for racing
   * / Frontend should query EXT canister separately to show unregistered bots
   */
  'web_list_my_registered_bots' : ActorMethod<
    [],
    Array<
      {
        'activeUpgrade' : [] | [UpgradeSession],
        'maxStats' : {
          'stability' : bigint,
          'speed' : bigint,
          'acceleration' : bigint,
          'powerCore' : bigint,
        },
        'tokenIndex' : bigint,
        'name' : [] | [string],
        'eligibleRaces' : Array<
          {
            'startTime' : bigint,
            'terrain' : Terrain,
            'name' : string,
            'raceId' : bigint,
            'entryDeadline' : bigint,
            'entryFee' : bigint,
          }
        >,
        'stats' : PokedBotRacingStats,
        'upcomingRaces' : Array<
          {
            'startTime' : bigint,
            'terrain' : Terrain,
            'name' : string,
            'raceId' : bigint,
            'entryDeadline' : bigint,
            'entryFee' : bigint,
          }
        >,
        'dedicationBonuses' : {
          'stability' : bigint,
          'speed' : bigint,
          'acceleration' : bigint,
          'powerCore' : bigint,
        },
        'currentStats' : {
          'stability' : bigint,
          'speed' : bigint,
          'acceleration' : bigint,
          'powerCore' : bigint,
        },
        'isStarterBot' : boolean,
        'eligibilityRating' : bigint,
        'upgradeCostsV2' : {
          'luck' : { 'successRate' : number, 'costE8s' : bigint },
          'stability' : { 'successRate' : number, 'costE8s' : bigint },
          'speed' : { 'successRate' : number, 'costE8s' : bigint },
          'acceleration' : { 'successRate' : number, 'costE8s' : bigint },
          'powerCore' : { 'successRate' : number, 'costE8s' : bigint },
          'pityCounter' : bigint,
        },
      }
    >
  >,
  /**
   * / Purchase Universal Parts with ICP
   * / Cost: 1 ICP for 500 Universal Parts
   */
  'web_purchase_parts' : ActorMethod<[bigint], Result_10>,
  /**
   * / Purchase a new repair bay slot
   * / Uses ICRC-2 transfer_from to pull ICP and deducts parts from inventory
   */
  'web_purchase_repair_bay_slot' : ActorMethod<[], Result_9>,
  /**
   * / Purchase and install an SMR (Small Modular Reactor) to increase garage power capacity
   * / Uses ICRC-2 transfer_from to pull ICP from user
   */
  'web_purchase_smr' : ActorMethod<[string], Result_8>,
  /**
   * / Rebuild battery core with parts or ICP
   */
  'web_rebuild_battery' : ActorMethod<[bigint, boolean], Result_2>,
  /**
   * / Recharge a bot's battery (0.1 ICP + fee via ICRC-2)
   */
  'web_recharge_bot' : ActorMethod<[bigint], Result_2>,
  /**
   * / Repair a battery with parts
   */
  'web_repair_battery' : ActorMethod<[bigint], Result_7>,
  /**
   * / Repair a bot to restore condition (0.05 ICP + fee via ICRC-2)
   */
  'web_repair_bot' : ActorMethod<[bigint], Result_2>,
  /**
   * / Respec a bot - reset selected stat upgrades and refund parts (with penalty)
   * / Cost: FREE
   * / statsToStrip: Array of stat names to reset (["speed", "powerCore", "acceleration", "stability"])
   * / Empty array strips all stats (backward compatible)
   */
  'web_respec_bot' : ActorMethod<[bigint, Array<string>], Result_6>,
  /**
   * / Salvage a battery for parts
   */
  'web_salvage_battery' : ActorMethod<[bigint], Result_5>,
  /**
   * / Set user's bots tagged as racers (replaces entire list)
   */
  'web_set_racer_bots' : ActorMethod<[Array<bigint>], Result_2>,
  /**
   * / Set user's bots tagged as scavengers (replaces entire list)
   */
  'web_set_scavenger_bots' : ActorMethod<[Array<bigint>], Result_2>,
  /**
   * / Set user's starred bots (replaces entire list)
   */
  'web_set_starred_bots' : ActorMethod<[Array<bigint>], Result_2>,
  /**
   * / Start a scavenging mission (web method)
   */
  'web_start_scavenging' : ActorMethod<
    [bigint, string, [] | [bigint]],
    Result_2
  >,
  /**
   * / Toggle battery charging on/off
   */
  'web_toggle_battery' : ActorMethod<[bigint], Result_4>,
  /**
   * / Unequip a consumable from a bot's loadout (slot 1 or 2)
   */
  'web_unequip_consumable' : ActorMethod<[bigint, bigint], Result_3>,
  /**
   * / Unequip a gear slot on a bot
   */
  'web_unequip_gear' : ActorMethod<[bigint, GearSlot], Result_3>,
  /**
   * / Upgrade a bot stat (via ICRC-2 payment or parts)
   */
  'web_upgrade_bot' : ActorMethod<
    [bigint, UpgradeType, { 'icp' : null } | { 'parts' : null }],
    Result_2
  >,
  /**
   * / Start upgrading a repair bay to the next tier
   * / Uses ICRC-2 transfer_from to pull ICP and deducts parts from inventory
   */
  'web_upgrade_repair_bay' : ActorMethod<[bigint], Result_1>,
  /**
   * / Withdraw tokens from the canister's treasury to a specified destination.
   */
  'withdraw' : ActorMethod<[Principal, bigint, Destination], Result>,
}
export type NFTMetadata = Array<[string, string]>;
export type NFTStats = Array<bigint>;
export type PassiveEffect = {
    'RubberBandResist' : { 'resistPercent' : number }
  } |
  { 'SteadyPace' : { 'varianceReduction' : number } } |
  { 'UphillGrinder' : { 'boostPercent' : number } } |
  { 'DownhillDaredevil' : { 'boostPercent' : number } } |
  { 'ComebackKid' : { 'boostPercent' : number } } |
  { 'FinalSurge' : { 'segmentCount' : bigint, 'boostPercent' : number } } |
  { 'FastStarter' : { 'segmentCount' : bigint, 'boostPercent' : number } } |
  { 'Ironclad' : { 'badLuckReduction' : number } } |
  { 'TerrainMastery' : { 'terrain' : TerrainTag, 'boostPercent' : number } } |
  { 'PackRunner' : { 'boostPercent' : number } } |
  { 'SlipstreamBoost' : { 'extraPercent' : number } } |
  { 'LuckAmplifier' : { 'procChanceBonus' : number } };
export interface PokedBotRacingStats {
  'accelerationBonus' : bigint,
  'majorLuckProcs' : bigint,
  'preferredDistance' : Distance,
  'totalPartsScavenged' : bigint,
  'stabilityBonus' : bigint,
  'lastRepaired' : [] | [bigint],
  'totalLuckProcs' : bigint,
  'lastRaced' : [] | [bigint],
  'tokenIndex' : bigint,
  'places' : bigint,
  'activatedAt' : bigint,
  'ownerPrincipal' : Principal,
  'bestHaul' : bigint,
  'name' : [] | [string],
  'luckBonus' : bigint,
  'scavengingReputation' : bigint,
  'lastRecharged' : [] | [bigint],
  'worldBuff' : [] | [WorldBuff],
  'wins' : bigint,
  'eloRating' : bigint,
  'lastMissionRewards' : [] | [
    {
      'powerCoreFragments' : bigint,
      'completedAt' : bigint,
      'universalParts' : bigint,
      'conditionRestored' : bigint,
      'batteryRestored' : bigint,
      'gyroModules' : bigint,
      'zone' : ScavengingZone,
      'speedChips' : bigint,
      'totalParts' : bigint,
      'thrusterKits' : bigint,
      'hoursOut' : bigint,
    }
  ],
  'factionReputation' : bigint,
  'stabilityUpgrades' : bigint,
  'scavengingMissions' : bigint,
  'accelerationUpgrades' : bigint,
  'tuneupQuality' : number,
  'overcharge' : bigint,
  'legendaryLuckProcs' : bigint,
  'luckUpgrades' : bigint,
  'speedUpgrades' : bigint,
  'experience' : bigint,
  'shows' : bigint,
  'luckBase' : bigint,
  'lastDiagnostics' : [] | [bigint],
  'preferredTerrain' : Terrain,
  'lastDecayed' : bigint,
  'listedForSale' : boolean,
  'racesEntered' : bigint,
  'powerCoreBonus' : bigint,
  'faction' : FactionType,
  'battery' : bigint,
  'totalBadLuckIncidents' : bigint,
  'perfectTuneUp' : boolean,
  'respecCount' : bigint,
  'speedBonus' : bigint,
  'totalScrapEarned' : bigint,
  'activeMission' : [] | [ScavengingMission],
  'powerCoreUpgrades' : bigint,
  'cosmicAlignmentDays' : bigint,
  'upgradeEndsAt' : [] | [bigint],
  'condition' : bigint,
}
export type PoolStatus = { 'Open' : null } |
  { 'Closed' : null } |
  { 'Cancelled' : null } |
  { 'Settled' : null } |
  { 'Pending' : null };
export interface Race {
  'startTime' : bigint,
  'status' : RaceStatus,
  'duration' : bigint,
  'terrain' : Terrain,
  'trackSeed' : bigint,
  'platformTax' : bigint,
  'minEntries' : bigint,
  'name' : string,
  'createdAt' : bigint,
  'results' : [] | [Array<RaceResult>],
  'distance' : bigint,
  'platformBonus' : bigint,
  'entries' : Array<RaceEntry>,
  'trackId' : bigint,
  'events' : Array<RaceEvent>,
  'raceId' : bigint,
  'entryDeadline' : bigint,
  'entryFee' : bigint,
  'maxEntries' : bigint,
  'sponsors' : Array<Sponsor>,
  'raceClass' : RaceClass,
  'prizePool' : bigint,
}
export type RaceClass = { 'Elite' : null } |
  { 'Scrap' : null } |
  { 'Junker' : null } |
  { 'SilentKlan' : null } |
  { 'Raider' : null };
export type RaceCreationMode = {
    'Manual' : {
      'raceTemplates' : Array<RaceTemplate>,
      'heatAllocation' : HeatAllocationStrategy,
    }
  } |
  {
    'Automatic' : {
      'racesPerClass' : [] | [bigint],
      'heatAllocation' : HeatAllocationStrategy,
      'distanceRange' : { 'max' : bigint, 'min' : bigint },
      'terrains' : Array<Terrain>,
    }
  };
export interface RaceEntry {
  'owner' : Principal,
  'stats' : [] | [RacingStats],
  'nftId' : string,
  'entryFee' : bigint,
  'enteredAt' : bigint,
}
export interface RaceEvent {
  'description' : string,
  'timestamp' : number,
  'segmentIndex' : bigint,
  'eventType' : RaceEventType,
}
export type RaceEventType = {
    'Overtake' : { 'overtaken' : string, 'overtaker' : string }
  } |
  { 'LeadChange' : { 'newLeader' : string, 'previousLeader' : string } } |
  {
    'ConsumableProc' : {
      'bot' : string,
      'trigger' : string,
      'effect' : string,
      'consumableName' : string,
    }
  } |
  { 'ExceptionalPerformance' : { 'bot' : string, 'performancePct' : number } } |
  {
    'BadLuck' : { 'bot' : string, 'penalty' : number, 'incidentType' : string }
  } |
  { 'CloseRacing' : { 'bots' : Array<string>, 'gapSeconds' : number } } |
  { 'LuckProc' : { 'bot' : string, 'procType' : string, 'boost' : number } } |
  { 'SegmentComplete' : { 'leader' : string, 'segmentIndex' : bigint } } |
  { 'LargeGap' : { 'gapSeconds' : number, 'leader' : string } } |
  { 'PoorPerformance' : { 'bot' : string, 'performancePct' : number } };
export interface RaceResult {
  'dnf' : boolean,
  'owner' : Principal,
  'prizeAmount' : bigint,
  'consumables' : Array<ConsumableInstance>,
  'passives' : Array<PassiveEffect>,
  'partType' : string,
  'partsEarned' : bigint,
  'stats' : [] | [RacingStats],
  'finalTime' : number,
  'nftId' : string,
  'faction' : FactionType,
  'position' : bigint,
}
export interface RaceResults {
  'rankings' : Array<bigint>,
  'fetchedAt' : bigint,
}
export type RaceStatus = { 'Cancelled' : null } |
  { 'InProgress' : null } |
  { 'Completed' : null } |
  { 'Upcoming' : null };
export interface RaceTemplate {
  'terrain' : Terrain,
  'distance' : bigint,
  'trackId' : [] | [bigint],
  'startOffset' : bigint,
  'raceClass' : RaceClass,
  'stageName' : [] | [string],
}
export interface RacingStats {
  'luck' : bigint,
  'stability' : bigint,
  'tuneupQuality' : number,
  'overcharge' : bigint,
  'speed' : bigint,
  'acceleration' : bigint,
  'powerCore' : bigint,
  'perfectTuneUp' : boolean,
  'baseAvgRating' : [] | [bigint],
}
export interface ReconstitutionTrace {
  'errors' : Array<string>,
  'actionsRestored' : bigint,
  'timestamp' : Time__1,
  'migratedTo' : string,
  'migratedFrom' : string,
  'timersRestored' : bigint,
  'validationPassed' : boolean,
}
export type Result = { 'ok' : bigint } |
  { 'err' : TreasuryError };
export type Result_1 = {
    'ok' : {
      'completionTime' : bigint,
      'newTierName' : string,
      'message' : string,
      'bayId' : bigint,
      'newTier' : bigint,
    }
  } |
  { 'err' : string };
export type Result_10 = {
    'ok' : {
      'newTotal' : bigint,
      'cost' : bigint,
      'partsReceived' : bigint,
      'message' : string,
    }
  } |
  { 'err' : string };
export type Result_11 = {
    'ok' : {
      'energyDelivered' : number,
      'newBotBattery' : bigint,
      'newBatteryCharge' : number,
      'message' : string,
      'energyConsumed' : number,
      'overheated' : boolean,
      'newBatteryHealth' : bigint,
      'newHeatStacks' : bigint,
    }
  } |
  { 'err' : string };
export type Result_12 = {
    'ok' : {
      'currentTierName' : string,
      'newRepairRate' : bigint,
      'partsCost' : bigint,
      'icpCostE8s' : bigint,
      'currentTier' : bigint,
      'newPowerDraw' : bigint,
      'nextTierName' : string,
      'nextTier' : bigint,
      'buildTimeSeconds' : bigint,
    }
  } |
  { 'err' : string };
export type Result_13 = {
    'ok' : {
      'activeUpgrade' : [] | [UpgradeSession],
      'isInitialized' : boolean,
      'stats' : [] | [PokedBotRacingStats],
      'baseStats' : {
        'stability' : bigint,
        'speed' : bigint,
        'acceleration' : bigint,
        'powerCore' : bigint,
      },
      'isOwner' : boolean,
      'currentBattery' : [] | [bigint],
      'upgradeCosts' : [] | [
        {
          'Gyro' : { 'icp' : bigint, 'parts' : bigint },
          'PowerCore' : { 'icp' : bigint, 'parts' : bigint },
          'Thruster' : { 'icp' : bigint, 'parts' : bigint },
          'Velocity' : { 'icp' : bigint, 'parts' : bigint },
        }
      ],
      'currentCondition' : [] | [bigint],
    }
  } |
  { 'err' : string };
export type Result_14 = { 'ok' : GearPiece } |
  { 'err' : string };
export type Result_15 = {
    'ok' : {
      'newRepairRate' : bigint,
      'newTierName' : string,
      'message' : string,
      'bayId' : bigint,
      'newTier' : bigint,
    }
  } |
  { 'err' : string };
export type Result_16 = {
    'ok' : { 'tokenIndex' : bigint, 'message' : string }
  } |
  { 'err' : string };
export type Result_17 = {
    'ok' : {
      'currentOdds' : number,
      'potentialPayout' : bigint,
      'betId' : bigint,
    }
  } |
  { 'err' : string };
export type Result_18 = { 'ok' : null } |
  { 'err' : string };
export type Result_19 = {
    'ok' : { 'refundAmount' : bigint, 'penalty' : bigint }
  } |
  { 'err' : string };
export type Result_2 = { 'ok' : string } |
  { 'err' : string };
export type Result_20 = { 'ok' : null } |
  { 'err' : TreasuryError };
export type Result_21 = { 'ok' : Array<BotSegmentTimes> } |
  { 'err' : string };
export type Result_22 = { 'ok' : { 'id' : bigint, 'time' : bigint } } |
  { 'err' : string };
export type Result_23 = { 'ok' : { 'eventId' : bigint, 'message' : string } } |
  { 'err' : string };
export type Result_24 = { 'ok' : bigint } |
  { 'err' : string };
export type Result_25 = {
    'ok' : {
      'refundedRegistrants' : bigint,
      'message' : string,
      'prizeRefunded' : bigint,
    }
  } |
  { 'err' : string };
export type Result_26 = {
    'ok' : {
      'tokenIndex' : bigint,
      'owner' : [] | [Principal],
      'isInitialized' : boolean,
      'stability' : {
        'final' : bigint,
        'base' : bigint,
        'worldBuff' : bigint,
        'upgrades' : bigint,
        'overcharge' : number,
        'conditionEffect' : bigint,
        'dedication' : bigint,
        'overchargeEffect' : bigint,
        'synergy' : bigint,
        'conditionPenalty' : number,
      },
      'speed' : {
        'final' : bigint,
        'batteryEffect' : bigint,
        'base' : bigint,
        'worldBuff' : bigint,
        'upgrades' : bigint,
        'overcharge' : number,
        'dedication' : bigint,
        'overchargeEffect' : bigint,
        'synergy' : bigint,
        'batteryPenalty' : number,
      },
      'acceleration' : {
        'final' : bigint,
        'batteryEffect' : bigint,
        'base' : bigint,
        'worldBuff' : bigint,
        'upgrades' : bigint,
        'overcharge' : number,
        'dedication' : bigint,
        'overchargeEffect' : bigint,
        'synergy' : bigint,
        'batteryPenalty' : number,
      },
      'powerCore' : {
        'final' : bigint,
        'base' : bigint,
        'worldBuff' : bigint,
        'upgrades' : bigint,
        'overcharge' : number,
        'conditionEffect' : bigint,
        'dedication' : bigint,
        'overchargeEffect' : bigint,
        'synergy' : bigint,
        'conditionPenalty' : number,
      },
      'battery' : bigint,
      'perfectTuneUp' : boolean,
      'overchargePercent' : bigint,
      'condition' : bigint,
    }
  } |
  { 'err' : string };
export type Result_27 = {
    'ok' : {
      'repair' : {
        'hoursUntilDrift' : bigint,
        'optimalPoint' : bigint,
        'inPeakZone' : boolean,
        'inGoodZone' : boolean,
        'resonanceStatus' : string,
      },
      'tokenIndex' : bigint,
      'currentTime' : bigint,
      'recharge' : {
        'hoursUntilDrift' : bigint,
        'optimalPoint' : bigint,
        'inPeakZone' : boolean,
        'inGoodZone' : boolean,
        'resonanceStatus' : string,
      },
      'currentBattery' : [] | [bigint],
      'currentCondition' : [] | [bigint],
    }
  } |
  { 'err' : string };
export type Result_3 = { 'ok' : BotLoadout } |
  { 'err' : string };
export type Result_4 = {
    'ok' : { 'isEnabled' : boolean, 'message' : string }
  } |
  { 'err' : string };
export type Result_5 = {
    'ok' : { 'partsReturned' : bigint, 'batteryType' : string }
  } |
  { 'err' : string };
export type Result_6 = {
    'ok' : {
      'stabilityPartsRefunded' : bigint,
      'speedPartsRefunded' : bigint,
      'powerCorePartsRefunded' : bigint,
      'respecCost' : bigint,
      'totalRefunded' : bigint,
      'accelerationPartsRefunded' : bigint,
    }
  } |
  { 'err' : string };
export type Result_7 = {
    'ok' : {
      'cyclesPercent' : number,
      'partsCost' : bigint,
      'healthGained' : bigint,
      'newHealth' : bigint,
    }
  } |
  { 'err' : string };
export type Result_8 = {
    'ok' : {
      'model' : string,
      'newTotalCapacity' : bigint,
      'powerOutput' : bigint,
      'cost' : bigint,
      'message' : string,
    }
  } |
  { 'err' : string };
export type Result_9 = {
    'ok' : { 'totalBays' : bigint, 'message' : string, 'bayId' : bigint }
  } |
  { 'err' : string };
export interface ScavengingMission {
  'pendingConditionRestored' : bigint,
  'startTime' : bigint,
  'tokenIndex' : bigint,
  'zone' : ScavengingZone,
  'pendingParts' : {
    'powerCoreFragments' : bigint,
    'universalParts' : bigint,
    'gyroModules' : bigint,
    'speedChips' : bigint,
    'thrusterKits' : bigint,
  },
  'lastAccumulation' : bigint,
  'durationMinutes' : [] | [bigint],
  'missionId' : bigint,
  'pendingBatteryRestored' : bigint,
}
export type ScavengingZone = { 'ChargingStation' : null } |
  { 'AbandonedSettlements' : null } |
  { 'ScrapHeaps' : null } |
  { 'RepairBay' : null } |
  { 'DeadMachineFields' : null };
export interface ScheduledEvent {
  'status' : EventStatus,
  'eventId' : bigint,
  'creator' : [] | [Principal],
  'raceCreationMode' : RaceCreationMode,
  'scheduledTime' : bigint,
  'metadata' : EventMetadata,
  'createdAt' : bigint,
  'creationFee' : bigint,
  'creatorName' : [] | [string],
  'invitedParticipants' : [] | [Array<Principal>],
  'cancellationDeadlines' : {
    'quarterRefund' : bigint,
    'fullRefund' : bigint,
    'halfRefund' : bigint,
  },
  'maxRegistrationsPerClass' : bigint,
  'raceIds' : Array<bigint>,
  'registrationCounts' : {
    'total' : bigint,
    'byClass' : Array<[RaceClass, bigint]>,
  },
  'sponsorships' : Array<Sponsorship>,
  'registrations' : Array<EventRegistration>,
  'visibility' : EventVisibility,
  'registrationCloses' : bigint,
  'registrationOpens' : bigint,
  'eventType' : EventType,
}
export type ScoringMode = { 'Cumulative' : null } |
  { 'Individual' : null } |
  { 'TeamAggregate' : null } |
  { 'Elimination' : null };
export interface Sponsor {
  'message' : [] | [string],
  'timestamp' : bigint,
  'sponsor' : Principal,
  'amount' : bigint,
}
export interface Sponsorship {
  'message' : [] | [string],
  'timestamp' : bigint,
  'sponsor' : Principal,
  'amount' : bigint,
  'sponsorName' : [] | [string],
}
export interface StarterBotSlots {
  'junker' : [] | [bigint],
  'elite' : [] | [bigint],
  'scrap' : [] | [bigint],
  'raider' : [] | [bigint],
}
export type StreamingCallback = ActorMethod<
  [StreamingToken],
  [] | [StreamingCallbackResponse]
>;
export interface StreamingCallbackResponse {
  'token' : [] | [StreamingToken],
  'body' : Uint8Array | number[],
}
export type StreamingStrategy = {
    'Callback' : { 'token' : StreamingToken, 'callback' : [Principal, string] }
  };
export type StreamingToken = Uint8Array | number[];
export type Subaccount = Uint8Array | number[];
export type Terrain = { 'MetalRoads' : null } |
  { 'WastelandSand' : null } |
  { 'ScrapHeaps' : null };
export type TerrainTag = { 'Universal' : null } |
  { 'MetalRoads' : null } |
  { 'WastelandSand' : null } |
  { 'ScrapHeaps' : null };
export type Time = bigint;
export type Time__1 = bigint;
export interface TimerDiagnostics {
  'pendingActions' : bigint,
  'totalActions' : bigint,
  'overdueActions' : bigint,
  'lockStatus' : [] | [Time__1],
  'currentTime' : Time__1,
  'lastExecutionDelta' : bigint,
  'nextExecutionDelta' : [] | [bigint],
  'systemTimerStatus' : [] | [TimerId],
}
export type TimerId = bigint;
export type Timestamp = bigint;
export interface Trait {
  'id' : bigint,
  'name' : string,
  'values' : Array<TraitValue>,
}
export type TraitSchema = Array<Trait>;
export interface TraitValue { 'id' : bigint, 'name' : string }
export type TransferError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'TemporarilyUnavailable' : null } |
  { 'BadBurn' : { 'min_burn_amount' : bigint } } |
  { 'Duplicate' : { 'duplicate_of' : bigint } } |
  { 'BadFee' : { 'expected_fee' : bigint } } |
  { 'CreatedInFuture' : { 'ledger_time' : Timestamp } } |
  { 'TooOld' : null } |
  { 'InsufficientFunds' : { 'balance' : bigint } };
export type TreasuryError = { 'LedgerTrap' : string } |
  { 'NotOwner' : null } |
  { 'TransferFailed' : TransferError };
export type TrendDirection = { 'Up' : bigint } |
  { 'New' : null } |
  { 'Down' : bigint } |
  { 'Stable' : null };
export type UpgradeFinishedResult = { 'Failed' : [bigint, string] } |
  { 'Success' : bigint } |
  { 'InProgress' : bigint };
export interface UpgradeSession {
  'startedAt' : bigint,
  'paymentMethod' : string,
  'costPaid' : bigint,
  'tokenIndex' : bigint,
  'partsUsed' : bigint,
  'consecutiveFails' : bigint,
  'upgradeType' : UpgradeType,
  'endsAt' : bigint,
}
export type UpgradeType = { 'Gyro' : null } |
  { 'Luck' : null } |
  { 'PowerCore' : null } |
  { 'Thruster' : null } |
  { 'Velocity' : null };
export interface UserEventConfig {
  'prizeContribution' : bigint,
  'raceCreationMode' : RaceCreationMode,
  'scheduledTime' : bigint,
  'minEntries' : bigint,
  'registrationWindowHours' : bigint,
  'name' : string,
  'description' : string,
  'creatorName' : [] | [string],
  'invitedParticipants' : [] | [Array<Principal>],
  'divisions' : Array<RaceClass>,
  'maxRegistrationsPerClass' : bigint,
  'entryFee' : bigint,
  'visibility' : EventVisibility,
}
export interface UserInventory {
  'powerCoreFragments' : bigint,
  'universalParts' : bigint,
  'owner' : Principal,
  'gyroModules' : bigint,
  'speedChips' : bigint,
  'thrusterKits' : bigint,
}
export interface WorldBuff {
  'appliedAt' : bigint,
  'expiresAt' : bigint,
  'stats' : Array<[string, bigint]>,
}
export interface _SERVICE extends McpServer {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
