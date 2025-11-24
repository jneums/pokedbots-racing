export const idlFactory = ({ IDL }) => {
  const Time__1 = IDL.Nat;
  const ActionFilter = IDL.Variant({
    'All' : IDL.Null,
    'ByActionId' : IDL.Nat,
    'ByType' : IDL.Text,
    'ByTimeRange' : IDL.Tuple(Time__1, Time__1),
    'ByRetryCount' : IDL.Nat,
  });
  const ActionId = IDL.Record({ 'id' : IDL.Nat, 'time' : Time__1 });
  const CancellationResult = IDL.Record({
    'cancelled' : IDL.Vec(ActionId),
    'errors' : IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Text)),
    'notFound' : IDL.Vec(IDL.Nat),
  });
  const Time = IDL.Int;
  const Action = IDL.Record({
    'aSync' : IDL.Opt(IDL.Nat),
    'actionType' : IDL.Text,
    'params' : IDL.Vec(IDL.Nat8),
    'retries' : IDL.Nat,
  });
  const ActionDetail = IDL.Tuple(ActionId, Action);
  const EventStatus = IDL.Variant({
    'Announced' : IDL.Null,
    'RegistrationClosed' : IDL.Null,
    'Cancelled' : IDL.Null,
    'InProgress' : IDL.Null,
    'RegistrationOpen' : IDL.Null,
    'Completed' : IDL.Null,
  });
  const RaceClass = IDL.Variant({
    'Elite' : IDL.Null,
    'SilentKlan' : IDL.Null,
    'Scavenger' : IDL.Null,
    'Raider' : IDL.Null,
  });
  const EventMetadata = IDL.Record({
    'pointsMultiplier' : IDL.Float64,
    'minEntries' : IDL.Nat,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'divisions' : IDL.Vec(RaceClass),
    'prizePoolBonus' : IDL.Nat,
    'entryFee' : IDL.Nat,
    'maxEntries' : IDL.Nat,
  });
  const EventType = IDL.Variant({
    'DailySprint' : IDL.Null,
    'SpecialEvent' : IDL.Text,
    'WeeklyLeague' : IDL.Null,
    'MonthlyCup' : IDL.Null,
  });
  const ScheduledEvent = IDL.Record({
    'status' : EventStatus,
    'eventId' : IDL.Nat,
    'scheduledTime' : IDL.Int,
    'metadata' : EventMetadata,
    'createdAt' : IDL.Int,
    'raceIds' : IDL.Vec(IDL.Nat),
    'registrationCloses' : IDL.Int,
    'registrationOpens' : IDL.Int,
    'eventType' : EventType,
  });
  const ReconstitutionTrace = IDL.Record({
    'errors' : IDL.Vec(IDL.Text),
    'actionsRestored' : IDL.Nat,
    'timestamp' : Time__1,
    'migratedTo' : IDL.Text,
    'migratedFrom' : IDL.Text,
    'timersRestored' : IDL.Nat,
    'validationPassed' : IDL.Bool,
  });
  const FactionType = IDL.Variant({
    'Bee' : IDL.Null,
    'Box' : IDL.Null,
    'Dead' : IDL.Null,
    'Food' : IDL.Null,
    'Game' : IDL.Null,
    'Wild' : IDL.Null,
    'Murder' : IDL.Null,
    'Golden' : IDL.Null,
    'Animal' : IDL.Null,
    'Ultimate' : IDL.Null,
    'Blackhole' : IDL.Null,
    'UltimateMaster' : IDL.Null,
    'Industrial' : IDL.Null,
    'Master' : IDL.Null,
  });
  const LeaderboardType = IDL.Variant({
    'AllTime' : IDL.Null,
    'Division' : RaceClass,
    'Faction' : FactionType,
    'Monthly' : IDL.Nat,
    'Season' : IDL.Nat,
  });
  const TrendDirection = IDL.Variant({
    'Up' : IDL.Nat,
    'New' : IDL.Null,
    'Down' : IDL.Nat,
    'Stable' : IDL.Null,
  });
  const LeaderboardEntry = IDL.Record({
    'trend' : TrendDirection,
    'bestFinish' : IDL.Nat,
    'tokenIndex' : IDL.Nat,
    'owner' : IDL.Principal,
    'rank' : IDL.Nat,
    'wins' : IDL.Nat,
    'podiums' : IDL.Nat,
    'lastRaceTime' : IDL.Int,
    'totalEarnings' : IDL.Nat,
    'winRate' : IDL.Float64,
    'races' : IDL.Nat,
    'previousRank' : IDL.Opt(IDL.Nat),
    'currentStreak' : IDL.Int,
    'points' : IDL.Nat,
    'avgPosition' : IDL.Float64,
  });
  const NFTMetadata = IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text));
  const NFTStats = IDL.Vec(IDL.Nat);
  const RaceStatus = IDL.Variant({
    'Cancelled' : IDL.Null,
    'InProgress' : IDL.Null,
    'Completed' : IDL.Null,
    'Upcoming' : IDL.Null,
  });
  const Terrain = IDL.Variant({
    'MetalRoads' : IDL.Null,
    'WastelandSand' : IDL.Null,
    'ScrapHeaps' : IDL.Null,
  });
  const RaceResult = IDL.Record({
    'owner' : IDL.Principal,
    'prizeAmount' : IDL.Nat,
    'finalTime' : IDL.Float64,
    'nftId' : IDL.Text,
    'position' : IDL.Nat,
  });
  const RaceEntry = IDL.Record({
    'owner' : IDL.Principal,
    'nftId' : IDL.Text,
    'entryFee' : IDL.Nat,
    'enteredAt' : IDL.Int,
  });
  const Sponsor = IDL.Record({
    'message' : IDL.Opt(IDL.Text),
    'timestamp' : IDL.Int,
    'sponsor' : IDL.Principal,
    'amount' : IDL.Nat,
  });
  const Race = IDL.Record({
    'startTime' : IDL.Int,
    'status' : RaceStatus,
    'duration' : IDL.Nat,
    'terrain' : Terrain,
    'platformTax' : IDL.Nat,
    'name' : IDL.Text,
    'createdAt' : IDL.Int,
    'results' : IDL.Opt(IDL.Vec(RaceResult)),
    'distance' : IDL.Nat,
    'platformBonus' : IDL.Nat,
    'entries' : IDL.Vec(RaceEntry),
    'raceId' : IDL.Nat,
    'entryDeadline' : IDL.Int,
    'entryFee' : IDL.Nat,
    'maxEntries' : IDL.Nat,
    'sponsors' : IDL.Vec(Sponsor),
    'raceClass' : RaceClass,
    'prizePool' : IDL.Nat,
  });
  const TimerId = IDL.Nat;
  const TimerDiagnostics = IDL.Record({
    'pendingActions' : IDL.Nat,
    'totalActions' : IDL.Nat,
    'overdueActions' : IDL.Nat,
    'lockStatus' : IDL.Opt(Time__1),
    'currentTime' : Time__1,
    'lastExecutionDelta' : IDL.Int,
    'nextExecutionDelta' : IDL.Opt(IDL.Int),
    'systemTimerStatus' : IDL.Opt(TimerId),
  });
  const TraitValue = IDL.Record({ 'id' : IDL.Nat, 'name' : IDL.Text });
  const Trait = IDL.Record({
    'id' : IDL.Nat,
    'name' : IDL.Text,
    'values' : IDL.Vec(TraitValue),
  });
  const TraitSchema = IDL.Vec(Trait);
  const Header = IDL.Tuple(IDL.Text, IDL.Text);
  const HttpRequest = IDL.Record({
    'url' : IDL.Text,
    'method' : IDL.Text,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(Header),
    'certificate_version' : IDL.Opt(IDL.Nat16),
  });
  const StreamingToken = IDL.Vec(IDL.Nat8);
  const StreamingCallbackResponse = IDL.Record({
    'token' : IDL.Opt(StreamingToken),
    'body' : IDL.Vec(IDL.Nat8),
  });
  const StreamingCallback = IDL.Func(
      [StreamingToken],
      [IDL.Opt(StreamingCallbackResponse)],
      ['query'],
    );
  const StreamingStrategy = IDL.Variant({
    'Callback' : IDL.Record({
      'token' : StreamingToken,
      'callback' : StreamingCallback,
    }),
  });
  const HttpResponse = IDL.Record({
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(Header),
    'upgrade' : IDL.Opt(IDL.Bool),
    'streaming_strategy' : IDL.Opt(StreamingStrategy),
    'status_code' : IDL.Nat16,
  });
  const UpgradeFinishedResult = IDL.Variant({
    'Failed' : IDL.Tuple(IDL.Nat, IDL.Text),
    'Success' : IDL.Nat,
    'InProgress' : IDL.Nat,
  });
  const ApiKeyInfo = IDL.Record({
    'created' : Time,
    'principal' : IDL.Principal,
    'scopes' : IDL.Vec(IDL.Text),
    'name' : IDL.Text,
  });
  const HashedApiKey = IDL.Text;
  const ApiKeyMetadata = IDL.Record({
    'info' : ApiKeyInfo,
    'hashed_key' : HashedApiKey,
  });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const Timestamp = IDL.Nat64;
  const TransferError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TemporarilyUnavailable' : IDL.Null,
    'BadBurn' : IDL.Record({ 'min_burn_amount' : IDL.Nat }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat }),
    'BadFee' : IDL.Record({ 'expected_fee' : IDL.Nat }),
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : Timestamp }),
    'TooOld' : IDL.Null,
    'InsufficientFunds' : IDL.Record({ 'balance' : IDL.Nat }),
  });
  const TreasuryError = IDL.Variant({
    'LedgerTrap' : IDL.Text,
    'NotOwner' : IDL.Null,
    'TransferFailed' : TransferError,
  });
  const Result_2 = IDL.Variant({ 'ok' : IDL.Null, 'err' : TreasuryError });
  const HttpHeader = IDL.Record({ 'value' : IDL.Text, 'name' : IDL.Text });
  const HttpRequestResult = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(HttpHeader),
  });
  const Subaccount = IDL.Vec(IDL.Nat8);
  const Destination = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(Subaccount),
  });
  const Result = IDL.Variant({ 'ok' : IDL.Nat, 'err' : TreasuryError });
  const McpServer = IDL.Service({
    'cancel_actions_by_filter' : IDL.Func(
        [ActionFilter],
        [CancellationResult],
        [],
      ),
    'cancel_actions_by_ids' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [CancellationResult],
        [],
      ),
    'cancel_races_by_ids' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Text))],
        [],
      ),
    'clear_reconstitution_traces' : IDL.Func([], [], []),
    'create_my_api_key' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Text)],
        [IDL.Text],
        [],
      ),
    'debug_check_bot_owner' : IDL.Func(
        [IDL.Nat32, IDL.Principal],
        [
          IDL.Record({
            'extCanister' : IDL.Text,
            'tokenIdentifier' : IDL.Text,
            'garageAccountId' : IDL.Text,
            'ownerResult' : IDL.Text,
          }),
        ],
        [],
      ),
    'debug_preview_stats' : IDL.Func(
        [IDL.Nat],
        [
          IDL.Record({
            'hasPrecomputedStats' : IDL.Bool,
            'precomputedStats' : IDL.Opt(
              IDL.Record({
                'stability' : IDL.Nat,
                'speed' : IDL.Nat,
                'acceleration' : IDL.Nat,
                'powerCore' : IDL.Nat,
                'faction' : IDL.Text,
              })
            ),
            'currentStoredStats' : IDL.Opt(
              IDL.Record({
                'accelerationBonus' : IDL.Nat,
                'baseAcceleration' : IDL.Nat,
                'stabilityBonus' : IDL.Nat,
                'stability' : IDL.Nat,
                'baseStability' : IDL.Nat,
                'speed' : IDL.Nat,
                'baseSpeed' : IDL.Nat,
                'acceleration' : IDL.Nat,
                'powerCore' : IDL.Nat,
                'basePowerCore' : IDL.Nat,
                'powerCoreBonus' : IDL.Nat,
                'faction' : IDL.Text,
                'speedBonus' : IDL.Nat,
              })
            ),
          }),
        ],
        ['query'],
      ),
    'debug_seed_leaderboard' : IDL.Func([IDL.Nat], [IDL.Text], []),
    'decode_token_identifier' : IDL.Func([IDL.Text], [IDL.Nat], ['query']),
    'emergency_clear_all_timers' : IDL.Func([], [IDL.Nat], []),
    'encode_token_identifier' : IDL.Func([IDL.Nat32], [IDL.Text], ['query']),
    'force_release_lock' : IDL.Func([], [IDL.Opt(Time)], []),
    'force_system_timer_cancel' : IDL.Func([], [IDL.Bool], []),
    'get_actions_by_filter' : IDL.Func(
        [ActionFilter],
        [IDL.Vec(ActionDetail)],
        ['query'],
      ),
    'get_all_scheduled_events' : IDL.Func(
        [],
        [IDL.Vec(ScheduledEvent)],
        ['query'],
      ),
    'get_all_token_ids' : IDL.Func([], [IDL.Vec(IDL.Nat)], ['query']),
    'get_base_stat' : IDL.Func(
        [IDL.Nat],
        [
          IDL.Opt(
            IDL.Record({
              'stability' : IDL.Nat,
              'speed' : IDL.Nat,
              'acceleration' : IDL.Nat,
              'powerCore' : IDL.Nat,
              'faction' : IDL.Text,
            })
          ),
        ],
        ['query'],
      ),
    'get_base_stats_count' : IDL.Func([], [IDL.Nat], ['query']),
    'get_current_periods' : IDL.Func(
        [],
        [IDL.Record({ 'seasonId' : IDL.Nat, 'monthId' : IDL.Nat })],
        ['query'],
      ),
    'get_event_details' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(ScheduledEvent)],
        ['query'],
      ),
    'get_ext_canister' : IDL.Func([], [IDL.Principal], ['query']),
    'get_garage_account_id' : IDL.Func([IDL.Principal], [IDL.Text], ['query']),
    'get_icp_ledger' : IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'get_latest_reconstitution_trace' : IDL.Func(
        [],
        [IDL.Opt(ReconstitutionTrace)],
        ['query'],
      ),
    'get_leaderboard' : IDL.Func(
        [LeaderboardType, IDL.Nat],
        [IDL.Vec(LeaderboardEntry)],
        ['query'],
      ),
    'get_my_ranking' : IDL.Func(
        [LeaderboardType, IDL.Nat],
        [IDL.Opt(LeaderboardEntry)],
        ['query'],
      ),
    'get_nft_metadata' : IDL.Func([IDL.Nat], [IDL.Opt(NFTMetadata)], ['query']),
    'get_nft_metadata_batch' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Opt(NFTMetadata)))],
        ['query'],
      ),
    'get_nft_metadata_by_identifier' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(NFTMetadata)],
        ['query'],
      ),
    'get_nft_metadata_page' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(IDL.Tuple(IDL.Nat, NFTMetadata))],
        ['query'],
      ),
    'get_nft_stats' : IDL.Func([IDL.Nat], [IDL.Opt(NFTStats)], ['query']),
    'get_nft_stats_by_identifier' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(NFTStats)],
        ['query'],
      ),
    'get_nft_trait' : IDL.Func(
        [IDL.Nat, IDL.Text],
        [IDL.Opt(IDL.Text)],
        ['query'],
      ),
    'get_nft_trait_value' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Opt(IDL.Nat)],
        ['query'],
      ),
    'get_owner' : IDL.Func([], [IDL.Principal], ['query']),
    'get_past_events' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(ScheduledEvent)],
        ['query'],
      ),
    'get_race_by_id' : IDL.Func([IDL.Nat], [IDL.Opt(Race)], ['query']),
    'get_reconstitution_traces' : IDL.Func(
        [],
        [IDL.Vec(ReconstitutionTrace)],
        ['query'],
      ),
    'get_timer_diagnostics' : IDL.Func([], [TimerDiagnostics], ['query']),
    'get_total_nft_count' : IDL.Func([], [IDL.Nat], ['query']),
    'get_trait_schema' : IDL.Func([], [TraitSchema], ['query']),
    'get_treasury_balance' : IDL.Func([IDL.Principal], [IDL.Nat], []),
    'get_upcoming_events' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(ScheduledEvent)],
        ['query'],
      ),
    'http_request' : IDL.Func([HttpRequest], [HttpResponse], ['query']),
    'http_request_streaming_callback' : IDL.Func(
        [StreamingToken],
        [IDL.Opt(StreamingCallbackResponse)],
        ['query'],
      ),
    'http_request_update' : IDL.Func([HttpRequest], [HttpResponse], []),
    'icrc120_upgrade_finished' : IDL.Func([], [UpgradeFinishedResult], []),
    'initialize_race_timer' : IDL.Func([], [IDL.Text], []),
    'list_my_api_keys' : IDL.Func([], [IDL.Vec(ApiKeyMetadata)], ['query']),
    'process_overdue_timers' : IDL.Func([], [IDL.Text], []),
    'reset_bot_stats' : IDL.Func([IDL.Nat], [Result_1], []),
    'revoke_my_api_key' : IDL.Func([IDL.Text], [], []),
    'set_ext_canister' : IDL.Func([IDL.Principal], [Result_1], []),
    'set_icp_ledger' : IDL.Func([IDL.Principal], [Result_1], []),
    'set_owner' : IDL.Func([IDL.Principal], [Result_2], []),
    'transformJwksResponse' : IDL.Func(
        [
          IDL.Record({
            'context' : IDL.Vec(IDL.Nat8),
            'response' : HttpRequestResult,
          }),
        ],
        [HttpRequestResult],
        ['query'],
      ),
    'upload_base_stats_batch' : IDL.Func(
        [
          IDL.Vec(
            IDL.Tuple(
              IDL.Nat,
              IDL.Record({
                'stability' : IDL.Nat,
                'speed' : IDL.Nat,
                'acceleration' : IDL.Nat,
                'powerCore' : IDL.Nat,
                'faction' : IDL.Text,
              }),
            )
          ),
        ],
        [],
        [],
      ),
    'upload_nft_stats_batch' : IDL.Func(
        [IDL.Vec(IDL.Tuple(IDL.Nat, NFTStats))],
        [Result_1],
        [],
      ),
    'upload_trait_schema' : IDL.Func([TraitSchema], [Result_1], []),
    'validate_timer_state' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'withdraw' : IDL.Func([IDL.Principal, IDL.Nat, Destination], [Result], []),
  });
  return McpServer;
};
export const init = ({ IDL }) => {
  return [
    IDL.Opt(
      IDL.Record({
        'owner' : IDL.Opt(IDL.Principal),
        'extCanisterId' : IDL.Opt(IDL.Principal),
      })
    ),
  ];
};
