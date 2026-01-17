import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

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
export interface CancellationResult {
  'cancelled' : Array<ActionId>,
  'errors' : Array<[bigint, string]>,
  'notFound' : Array<bigint>,
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
  'cumulativePoints' : bigint,
  'tokenIndex' : bigint,
  'owner' : Principal,
  'prizeAmount' : bigint,
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
  'admin_adjust_leaderboard_points' : ActorMethod<[Array<bigint>], string>,
  'admin_clear_active_mission' : ActorMethod<[bigint], string>,
  'admin_compensate_resimulated_winners' : ActorMethod<[Array<bigint>], string>,
  'admin_create_betting_pool' : ActorMethod<[bigint], Result_1>,
  'admin_create_event_for_orphaned_races' : ActorMethod<
    [bigint, Array<bigint>],
    string
  >,
  'admin_get_active_mission' : ActorMethod<[bigint], string>,
  'admin_get_resonance' : ActorMethod<[bigint], Result_11>,
  'admin_get_stat_breakdown' : ActorMethod<[bigint], Result_10>,
  'admin_rebuild_bot_histories' : ActorMethod<[Array<bigint>], string>,
  'admin_remove_race_entry' : ActorMethod<[bigint, bigint], Result_1>,
  'admin_resimulate_race' : ActorMethod<[bigint], Result_1>,
  'admin_resimulate_races_batch' : ActorMethod<[Array<bigint>], string>,
  'admin_update_event_heat_allocation' : ActorMethod<[string, string], string>,
  'admin_update_prize_amounts' : ActorMethod<[Array<bigint>], string>,
  'admin_update_race_min_entries' : ActorMethod<[bigint, bigint], string>,
  'cancel_actions_by_filter' : ActorMethod<[ActionFilter], CancellationResult>,
  'cancel_actions_by_ids' : ActorMethod<[Array<bigint>], CancellationResult>,
  'cancel_races_by_ids' : ActorMethod<[Array<bigint>], Array<[bigint, string]>>,
  'cleanup_duplicate_race_create_timers' : ActorMethod<[], string>,
  'clear_event_races' : ActorMethod<[Array<bigint>], string>,
  'clear_race_create_diagnostics' : ActorMethod<[], Result_9>,
  'clear_reconstitution_traces' : ActorMethod<[], undefined>,
  'create_my_api_key' : ActorMethod<[string, Array<string>], string>,
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
  'debug_regenerate_race_commentary' : ActorMethod<[bigint], Result_1>,
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
  'decode_token_identifier' : ActorMethod<[string], bigint>,
  'delete_events_and_races' : ActorMethod<[Array<bigint>], string>,
  'emergency_clear_all_timers' : ActorMethod<[], bigint>,
  'encode_token_identifier' : ActorMethod<[number], string>,
  'force_finish_race' : ActorMethod<[bigint], string>,
  'force_release_lock' : ActorMethod<[], [] | [Time]>,
  'force_schedule_race_create' : ActorMethod<[], Result_8>,
  'force_system_timer_cancel' : ActorMethod<[], boolean>,
  'get_actions_by_filter' : ActorMethod<[ActionFilter], Array<ActionDetail>>,
  'get_all_scheduled_events' : ActorMethod<[], Array<ScheduledEvent>>,
  'get_all_token_ids' : ActorMethod<[], Array<bigint>>,
  'get_base_stats_count' : ActorMethod<[], bigint>,
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
  'get_ext_canister' : ActorMethod<[], Principal>,
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
  'get_my_ranking' : ActorMethod<
    [LeaderboardType, bigint],
    [] | [LeaderboardEntry]
  >,
  'get_nft_metadata' : ActorMethod<[bigint], [] | [NFTMetadata]>,
  'get_nft_metadata_batch' : ActorMethod<
    [Array<bigint>],
    Array<[bigint, [] | [NFTMetadata]]>
  >,
  'get_nft_metadata_by_identifier' : ActorMethod<[string], [] | [NFTMetadata]>,
  'get_nft_metadata_page' : ActorMethod<
    [bigint, bigint],
    Array<[bigint, NFTMetadata]>
  >,
  'get_nft_stats' : ActorMethod<[bigint], [] | [NFTStats]>,
  'get_nft_stats_by_identifier' : ActorMethod<[string], [] | [NFTStats]>,
  'get_nft_trait' : ActorMethod<[bigint, string], [] | [string]>,
  'get_nft_trait_value' : ActorMethod<[bigint, bigint], [] | [bigint]>,
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
  'get_reconstitution_traces' : ActorMethod<[], Array<ReconstitutionTrace>>,
  'get_timer_diagnostics' : ActorMethod<[], TimerDiagnostics>,
  'get_total_nft_count' : ActorMethod<[], bigint>,
  'get_trait_schema' : ActorMethod<[], TraitSchema>,
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
  'http_request' : ActorMethod<[HttpRequest], HttpResponse>,
  'http_request_streaming_callback' : ActorMethod<
    [StreamingToken],
    [] | [StreamingCallbackResponse]
  >,
  'http_request_update' : ActorMethod<[HttpRequest], HttpResponse>,
  'icrc120_upgrade_finished' : ActorMethod<[], UpgradeFinishedResult>,
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
  'register_for_event' : ActorMethod<[bigint, bigint], Result_1>,
  'revoke_my_api_key' : ActorMethod<[string], undefined>,
  'set_ext_canister' : ActorMethod<[Principal], Result_5>,
  'set_icp_ledger' : ActorMethod<[Principal], Result_5>,
  'set_owner' : ActorMethod<[Principal], Result_7>,
  'transformJwksResponse' : ActorMethod<
    [{ 'context' : Uint8Array | number[], 'response' : HttpRequestResult }],
    HttpRequestResult
  >,
  'trigger_race_creation' : ActorMethod<[], string>,
  'trigger_race_finish' : ActorMethod<[bigint], string>,
  'trigger_race_start' : ActorMethod<[bigint], string>,
  'unregister_from_event' : ActorMethod<[bigint, bigint], Result_6>,
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
  'upload_nft_stats_batch' : ActorMethod<[Array<[bigint, NFTStats]>], Result_5>,
  'upload_trait_schema' : ActorMethod<[TraitSchema], Result_5>,
  'validate_timer_state' : ActorMethod<[], Array<string>>,
  'web_batch_complete_scavenging' : ActorMethod<
    [Array<bigint>],
    Array<{ 'result' : Result_1, 'tokenIndex' : bigint }>
  >,
  'web_batch_recharge_bots' : ActorMethod<
    [Array<bigint>],
    Array<{ 'result' : Result_1, 'tokenIndex' : bigint }>
  >,
  'web_batch_repair_bots' : ActorMethod<
    [Array<bigint>],
    Array<{ 'result' : Result_1, 'tokenIndex' : bigint }>
  >,
  'web_batch_start_scavenging' : ActorMethod<
    [Array<bigint>, string, [] | [bigint]],
    Array<{ 'result' : Result_1, 'tokenIndex' : bigint }>
  >,
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
  'web_betting_get_pool_info' : ActorMethod<[bigint], [] | [BettingPool]>,
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
  'web_betting_place_bet' : ActorMethod<
    [bigint, bigint, BetType, bigint],
    Result_4
  >,
  'web_cancel_upgrade' : ActorMethod<[bigint], Result_1>,
  'web_complete_scavenging' : ActorMethod<[bigint], Result_1>,
  'web_convert_parts' : ActorMethod<[string, string, bigint], Result_1>,
  'web_deregister_bot' : ActorMethod<[bigint], Result_1>,
  'web_enter_race' : ActorMethod<[bigint, bigint], Result_1>,
  'web_full_maintenance' : ActorMethod<[bigint], Result_1>,
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
  'web_get_bot_details' : ActorMethod<[bigint], Result_3>,
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
  'web_get_garage_power_status' : ActorMethod<
    [],
    {
      'efficiency' : number,
      'wattsPerBotRequired' : bigint,
      'wattsPerBot' : bigint,
      'botsCharging' : bigint,
      'currentDrawWatts' : bigint,
      'basePowerWatts' : bigint,
      'totalCapacityWatts' : bigint,
    }
  >,
  'web_get_racer_bots' : ActorMethod<[], Array<bigint>>,
  'web_get_scavenger_bots' : ActorMethod<[], Array<bigint>>,
  'web_get_starred_bots' : ActorMethod<[], Array<bigint>>,
  'web_get_user_inventory' : ActorMethod<[], UserInventory>,
  'web_initialize_bot' : ActorMethod<[bigint, [] | [string]], Result_1>,
  'web_list_my_bots' : ActorMethod<
    [],
    Array<
      {
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
  'web_recharge_bot' : ActorMethod<[bigint], Result_1>,
  'web_repair_bot' : ActorMethod<[bigint], Result_1>,
  'web_respec_bot' : ActorMethod<[bigint, Array<string>], Result_2>,
  'web_set_racer_bots' : ActorMethod<[Array<bigint>], Result_1>,
  'web_set_scavenger_bots' : ActorMethod<[Array<bigint>], Result_1>,
  'web_set_starred_bots' : ActorMethod<[Array<bigint>], Result_1>,
  'web_start_scavenging' : ActorMethod<
    [bigint, string, [] | [bigint]],
    Result_1
  >,
  'web_upgrade_bot' : ActorMethod<
    [bigint, UpgradeType, { 'icp' : null } | { 'parts' : null }],
    Result_1
  >,
  'withdraw' : ActorMethod<[Principal, bigint, Destination], Result>,
}
export type NFTMetadata = Array<[string, string]>;
export type NFTStats = Array<bigint>;
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
  'owner' : Principal,
  'prizeAmount' : bigint,
  'partType' : string,
  'partsEarned' : bigint,
  'stats' : [] | [RacingStats],
  'finalTime' : number,
  'nftId' : string,
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
  'overcharge' : bigint,
  'speed' : bigint,
  'acceleration' : bigint,
  'powerCore' : bigint,
  'perfectTuneUp' : boolean,
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
export type Result_1 = { 'ok' : string } |
  { 'err' : string };
export type Result_10 = {
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
export type Result_11 = {
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
export type Result_2 = {
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
export type Result_3 = {
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
export type Result_4 = {
    'ok' : {
      'currentOdds' : number,
      'potentialPayout' : bigint,
      'betId' : bigint,
    }
  } |
  { 'err' : string };
export type Result_5 = { 'ok' : null } |
  { 'err' : string };
export type Result_6 = {
    'ok' : { 'refundAmount' : bigint, 'penalty' : bigint }
  } |
  { 'err' : string };
export type Result_7 = { 'ok' : null } |
  { 'err' : TreasuryError };
export type Result_8 = { 'ok' : { 'id' : bigint, 'time' : bigint } } |
  { 'err' : string };
export type Result_9 = { 'ok' : bigint } |
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
export type StreamingCallback = ActorMethod<
  [StreamingToken],
  [] | [StreamingCallbackResponse]
>;
export interface StreamingCallbackResponse {
  'token' : [] | [StreamingToken],
  'body' : Uint8Array | number[],
}
export type StreamingStrategy = {
    'Callback' : { 'token' : StreamingToken, 'callback' : StreamingCallback }
  };
export type StreamingToken = Uint8Array | number[];
export type Subaccount = Uint8Array | number[];
export type Terrain = { 'MetalRoads' : null } |
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
