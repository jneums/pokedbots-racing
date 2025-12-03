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
export interface CancellationResult {
  'cancelled' : Array<ActionId>,
  'errors' : Array<[bigint, string]>,
  'notFound' : Array<bigint>,
}
export interface Destination {
  'owner' : Principal,
  'subaccount' : [] | [Subaccount],
}
export interface EventMetadata {
  'pointsMultiplier' : number,
  'minEntries' : bigint,
  'name' : string,
  'description' : string,
  'divisions' : Array<RaceClass>,
  'prizePoolBonus' : bigint,
  'entryFee' : bigint,
  'maxEntries' : bigint,
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
export type HashedApiKey = string;
export type Header = [string, string];
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
  'cancel_actions_by_filter' : ActorMethod<[ActionFilter], CancellationResult>,
  'cancel_actions_by_ids' : ActorMethod<[Array<bigint>], CancellationResult>,
  'cancel_races_by_ids' : ActorMethod<[Array<bigint>], Array<[bigint, string]>>,
  'clear_reconstitution_traces' : ActorMethod<[], undefined>,
  'create_my_api_key' : ActorMethod<[string, Array<string>], string>,
  'debug_check_bot_owner' : ActorMethod<
    [number, Principal],
    {
      'extCanister' : string,
      'tokenIdentifier' : string,
      'garageAccountId' : string,
      'ownerResult' : string,
    }
  >,
  'debug_create_test_race' : ActorMethod<[bigint], string>,
  'debug_preview_stats' : ActorMethod<
    [bigint],
    {
      'hasPrecomputedStats' : boolean,
      'precomputedStats' : [] | [
        {
          'stability' : bigint,
          'speed' : bigint,
          'acceleration' : bigint,
          'powerCore' : bigint,
          'faction' : string,
        }
      ],
      'currentStoredStats' : [] | [
        {
          'accelerationBonus' : bigint,
          'baseAcceleration' : bigint,
          'stabilityBonus' : bigint,
          'stability' : bigint,
          'baseStability' : bigint,
          'speed' : bigint,
          'baseSpeed' : bigint,
          'acceleration' : bigint,
          'powerCore' : bigint,
          'basePowerCore' : bigint,
          'powerCoreBonus' : bigint,
          'faction' : string,
          'speedBonus' : bigint,
        }
      ],
    }
  >,
  'debug_seed_leaderboard' : ActorMethod<[bigint], string>,
  'decode_token_identifier' : ActorMethod<[string], bigint>,
  'delete_events_and_races' : ActorMethod<[Array<bigint>], string>,
  'emergency_clear_all_timers' : ActorMethod<[], bigint>,
  'encode_token_identifier' : ActorMethod<[number], string>,
  'force_finish_race' : ActorMethod<[bigint], string>,
  'force_release_lock' : ActorMethod<[], [] | [Time]>,
  'force_system_timer_cancel' : ActorMethod<[], boolean>,
  'get_actions_by_filter' : ActorMethod<[ActionFilter], Array<ActionDetail>>,
  'get_all_scheduled_events' : ActorMethod<[], Array<ScheduledEvent>>,
  'get_all_token_ids' : ActorMethod<[], Array<bigint>>,
  'get_base_stat' : ActorMethod<
    [bigint],
    [] | [
      {
        'stability' : bigint,
        'speed' : bigint,
        'acceleration' : bigint,
        'powerCore' : bigint,
        'faction' : string,
      }
    ]
  >,
  'get_base_stats_count' : ActorMethod<[], bigint>,
  'get_bot_profile' : ActorMethod<
    [bigint],
    [] | [
      {
        'tokenIndex' : bigint,
        'isInitialized' : boolean,
        'eloRating' : bigint,
        'stats' : {
          'stability' : bigint,
          'speed' : bigint,
          'overallRating' : bigint,
          'acceleration' : bigint,
          'powerCore' : bigint,
        },
        'faction' : FactionType,
        'career' : {
          'wins' : bigint,
          'podiums' : bigint,
          'racesEntered' : bigint,
          'totalEarnings' : bigint,
        },
        'raceClass' : RaceClass,
      }
    ]
  >,
  'get_current_periods' : ActorMethod<
    [],
    { 'seasonId' : bigint, 'monthId' : bigint }
  >,
  'get_event_details' : ActorMethod<[bigint], [] | [ScheduledEvent]>,
  'get_ext_canister' : ActorMethod<[], Principal>,
  'get_garage_account_id' : ActorMethod<[Principal], string>,
  'get_icp_ledger' : ActorMethod<[], [] | [Principal]>,
  'get_latest_reconstitution_trace' : ActorMethod<
    [],
    [] | [ReconstitutionTrace]
  >,
  'get_leaderboard' : ActorMethod<
    [LeaderboardType, bigint],
    Array<LeaderboardEntry>
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
  'get_race_by_id' : ActorMethod<[bigint], [] | [Race]>,
  'get_reconstitution_traces' : ActorMethod<[], Array<ReconstitutionTrace>>,
  'get_timer_diagnostics' : ActorMethod<[], TimerDiagnostics>,
  'get_total_nft_count' : ActorMethod<[], bigint>,
  'get_trait_schema' : ActorMethod<[], TraitSchema>,
  'get_treasury_balance' : ActorMethod<[Principal], bigint>,
  'get_upcoming_events' : ActorMethod<[bigint], Array<ScheduledEvent>>,
  'http_request' : ActorMethod<[HttpRequest], HttpResponse>,
  'http_request_streaming_callback' : ActorMethod<
    [StreamingToken],
    [] | [StreamingCallbackResponse]
  >,
  'http_request_update' : ActorMethod<[HttpRequest], HttpResponse>,
  'icrc120_upgrade_finished' : ActorMethod<[], UpgradeFinishedResult>,
  'initialize_race_timer' : ActorMethod<[], string>,
  'list_my_api_keys' : ActorMethod<[], Array<ApiKeyMetadata>>,
  'process_overdue_timers' : ActorMethod<[], string>,
  'reset_bot_stats' : ActorMethod<[bigint], Result_1>,
  'revoke_my_api_key' : ActorMethod<[string], undefined>,
  'set_ext_canister' : ActorMethod<[Principal], Result_1>,
  'set_icp_ledger' : ActorMethod<[Principal], Result_1>,
  'set_owner' : ActorMethod<[Principal], Result_2>,
  'transformJwksResponse' : ActorMethod<
    [{ 'context' : Uint8Array | number[], 'response' : HttpRequestResult }],
    HttpRequestResult
  >,
  'trigger_race_start' : ActorMethod<[bigint], string>,
  'trigger_stuck_races' : ActorMethod<[], string>,
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
  'upload_nft_stats_batch' : ActorMethod<[Array<[bigint, NFTStats]>], Result_1>,
  'upload_trait_schema' : ActorMethod<[TraitSchema], Result_1>,
  'validate_timer_state' : ActorMethod<[], Array<string>>,
  'withdraw' : ActorMethod<[Principal, bigint, Destination], Result>,
}
export type NFTMetadata = Array<[string, string]>;
export type NFTStats = Array<bigint>;
export interface Race {
  'startTime' : bigint,
  'status' : RaceStatus,
  'duration' : bigint,
  'terrain' : Terrain,
  'platformTax' : bigint,
  'minEntries' : bigint,
  'name' : string,
  'createdAt' : bigint,
  'results' : [] | [Array<RaceResult>],
  'distance' : bigint,
  'platformBonus' : bigint,
  'entries' : Array<RaceEntry>,
  'raceId' : bigint,
  'entryDeadline' : bigint,
  'entryFee' : bigint,
  'maxEntries' : bigint,
  'sponsors' : Array<Sponsor>,
  'raceClass' : RaceClass,
  'prizePool' : bigint,
}
export type RaceClass = { 'Elite' : null } |
  { 'SilentKlan' : null } |
  { 'Scavenger' : null } |
  { 'Raider' : null };
export interface RaceEntry {
  'owner' : Principal,
  'nftId' : string,
  'entryFee' : bigint,
  'enteredAt' : bigint,
}
export interface RaceResult {
  'owner' : Principal,
  'prizeAmount' : bigint,
  'finalTime' : number,
  'nftId' : string,
  'position' : bigint,
}
export type RaceStatus = { 'Cancelled' : null } |
  { 'InProgress' : null } |
  { 'Completed' : null } |
  { 'Upcoming' : null };
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
export type Result_1 = { 'ok' : null } |
  { 'err' : string };
export type Result_2 = { 'ok' : null } |
  { 'err' : TreasuryError };
export interface ScheduledEvent {
  'status' : EventStatus,
  'eventId' : bigint,
  'scheduledTime' : bigint,
  'metadata' : EventMetadata,
  'createdAt' : bigint,
  'raceIds' : Array<bigint>,
  'registrationCloses' : bigint,
  'registrationOpens' : bigint,
  'eventType' : EventType,
}
export interface Sponsor {
  'message' : [] | [string],
  'timestamp' : bigint,
  'sponsor' : Principal,
  'amount' : bigint,
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
export interface _SERVICE extends McpServer {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
