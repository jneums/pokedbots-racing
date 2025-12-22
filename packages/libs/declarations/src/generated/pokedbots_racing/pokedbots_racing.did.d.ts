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
export type Distance = { 'MediumHaul' : null } |
  { 'LongTrek' : null } |
  { 'ShortSprint' : null };
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
  'cleanup_duplicate_race_create_timers' : ActorMethod<[], string>,
  'cleanup_duplicate_recharge_timers' : ActorMethod<[], string>,
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
    [Array<bigint>, bigint, bigint],
    [] | [
      { 'results' : Array<{ 'tokenIndex' : bigint, 'finalTime' : number }> }
    ]
  >,
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
  'get_base_stats_count' : ActorMethod<[], bigint>,
  'get_bot_profile' : ActorMethod<
    [bigint],
    [] | [
      {
        'tokenIndex' : bigint,
        'owner' : [] | [Principal],
        'isInitialized' : boolean,
        'name' : [] | [string],
        'eloRating' : bigint,
        'stats' : {
          'stability' : bigint,
          'speed' : bigint,
          'overallRating' : bigint,
          'acceleration' : bigint,
          'powerCore' : bigint,
        },
        'preferredTerrain' : Terrain,
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
  'get_upcoming_events_with_races' : ActorMethod<
    [bigint],
    Array<
      {
        'event' : ScheduledEvent,
        'raceSummary' : {
          'distances' : Array<bigint>,
          'totalParticipants' : bigint,
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
  'revoke_my_api_key' : ActorMethod<[string], undefined>,
  'set_ext_canister' : ActorMethod<[Principal], Result_3>,
  'set_icp_ledger' : ActorMethod<[Principal], Result_3>,
  'set_owner' : ActorMethod<[Principal], Result_4>,
  'transformJwksResponse' : ActorMethod<
    [{ 'context' : Uint8Array | number[], 'response' : HttpRequestResult }],
    HttpRequestResult
  >,
  'trigger_race_finish' : ActorMethod<[bigint], string>,
  'trigger_race_start' : ActorMethod<[bigint], string>,
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
  'upload_nft_stats_batch' : ActorMethod<[Array<[bigint, NFTStats]>], Result_3>,
  'upload_trait_schema' : ActorMethod<[TraitSchema], Result_3>,
  'validate_timer_state' : ActorMethod<[], Array<string>>,
  'web_browse_marketplace' : ActorMethod<
    [
      [] | [bigint],
      [] | [bigint],
      [] | [number],
      [] | [string],
      [] | [string],
      [] | [boolean],
      [] | [bigint],
    ],
    {
      'hasMore' : boolean,
      'listings' : Array<
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
          'price' : number,
          'winRate' : number,
        }
      >,
    }
  >,
  'web_cancel_upgrade' : ActorMethod<[bigint], Result_1>,
  'web_complete_scavenging' : ActorMethod<[bigint], Result_1>,
  'web_enter_race' : ActorMethod<[bigint, bigint], Result_1>,
  'web_get_bot_details' : ActorMethod<[bigint], Result_2>,
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
        'currentStats' : {
          'stability' : bigint,
          'speed' : bigint,
          'acceleration' : bigint,
          'powerCore' : bigint,
        },
        'upgradeCostsV2' : {
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
  'preferredDistance' : Distance,
  'totalPartsScavenged' : bigint,
  'stabilityBonus' : bigint,
  'lastRepaired' : [] | [bigint],
  'lastRaced' : [] | [bigint],
  'tokenIndex' : bigint,
  'places' : bigint,
  'activatedAt' : bigint,
  'ownerPrincipal' : Principal,
  'bestHaul' : bigint,
  'name' : [] | [string],
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
  'speedUpgrades' : bigint,
  'experience' : bigint,
  'shows' : bigint,
  'lastDiagnostics' : [] | [bigint],
  'preferredTerrain' : Terrain,
  'lastDecayed' : bigint,
  'listedForSale' : boolean,
  'racesEntered' : bigint,
  'powerCoreBonus' : bigint,
  'faction' : FactionType,
  'battery' : bigint,
  'speedBonus' : bigint,
  'totalScrapEarned' : bigint,
  'activeMission' : [] | [ScavengingMission],
  'powerCoreUpgrades' : bigint,
  'upgradeEndsAt' : [] | [bigint],
  'condition' : bigint,
}
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
export interface RaceEntry {
  'owner' : Principal,
  'stats' : [] | [RacingStats],
  'nftId' : string,
  'entryFee' : bigint,
  'enteredAt' : bigint,
}
export interface RaceResult {
  'owner' : Principal,
  'prizeAmount' : bigint,
  'stats' : [] | [RacingStats],
  'finalTime' : number,
  'nftId' : string,
  'position' : bigint,
}
export type RaceStatus = { 'Cancelled' : null } |
  { 'InProgress' : null } |
  { 'Completed' : null } |
  { 'Upcoming' : null };
export interface RacingStats {
  'stability' : bigint,
  'speed' : bigint,
  'acceleration' : bigint,
  'powerCore' : bigint,
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
export type Result_2 = {
    'ok' : {
      'activeUpgrade' : [] | [UpgradeSession],
      'stats' : PokedBotRacingStats,
      'baseStats' : {
        'stability' : bigint,
        'speed' : bigint,
        'acceleration' : bigint,
        'powerCore' : bigint,
      },
      'isOwner' : boolean,
      'currentBattery' : bigint,
      'upgradeCosts' : {
        'Gyro' : { 'icp' : bigint, 'parts' : bigint },
        'PowerCore' : { 'icp' : bigint, 'parts' : bigint },
        'Thruster' : { 'icp' : bigint, 'parts' : bigint },
        'Velocity' : { 'icp' : bigint, 'parts' : bigint },
      },
      'currentCondition' : bigint,
    }
  } |
  { 'err' : string };
export type Result_3 = { 'ok' : null } |
  { 'err' : string };
export type Result_4 = { 'ok' : null } |
  { 'err' : TreasuryError };
export interface ScavengingMission {
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
}
export type ScavengingZone = { 'AbandonedSettlements' : null } |
  { 'ScrapHeaps' : null } |
  { 'DeadMachineFields' : null };
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
