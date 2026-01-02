export const idlFactory = ({ IDL }) => {
  const Result_1 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
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
  const Terrain = IDL.Variant({
    'MetalRoads' : IDL.Null,
    'WastelandSand' : IDL.Null,
    'ScrapHeaps' : IDL.Null,
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
    'Scrap' : IDL.Null,
    'Junker' : IDL.Null,
    'SilentKlan' : IDL.Null,
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
  const ReconstitutionTrace = IDL.Record({
    'errors' : IDL.Vec(IDL.Text),
    'actionsRestored' : IDL.Nat,
    'timestamp' : Time__1,
    'migratedTo' : IDL.Text,
    'migratedFrom' : IDL.Text,
    'timersRestored' : IDL.Nat,
    'validationPassed' : IDL.Bool,
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
  const RacingStats = IDL.Record({
    'stability' : IDL.Nat,
    'speed' : IDL.Nat,
    'acceleration' : IDL.Nat,
    'powerCore' : IDL.Nat,
  });
  const RaceResult = IDL.Record({
    'owner' : IDL.Principal,
    'prizeAmount' : IDL.Nat,
    'stats' : IDL.Opt(RacingStats),
    'finalTime' : IDL.Float64,
    'nftId' : IDL.Text,
    'position' : IDL.Nat,
  });
  const RaceEntry = IDL.Record({
    'owner' : IDL.Principal,
    'stats' : IDL.Opt(RacingStats),
    'nftId' : IDL.Text,
    'entryFee' : IDL.Nat,
    'enteredAt' : IDL.Int,
  });
  const RaceEventType = IDL.Variant({
    'Overtake' : IDL.Record({ 'overtaken' : IDL.Text, 'overtaker' : IDL.Text }),
    'LeadChange' : IDL.Record({
      'newLeader' : IDL.Text,
      'previousLeader' : IDL.Text,
    }),
    'ExceptionalPerformance' : IDL.Record({
      'bot' : IDL.Text,
      'performancePct' : IDL.Float64,
    }),
    'CloseRacing' : IDL.Record({
      'bots' : IDL.Vec(IDL.Text),
      'gapSeconds' : IDL.Float64,
    }),
    'SegmentComplete' : IDL.Record({
      'leader' : IDL.Text,
      'segmentIndex' : IDL.Nat,
    }),
    'LargeGap' : IDL.Record({
      'gapSeconds' : IDL.Float64,
      'leader' : IDL.Text,
    }),
    'PoorPerformance' : IDL.Record({
      'bot' : IDL.Text,
      'performancePct' : IDL.Float64,
    }),
  });
  const RaceEvent = IDL.Record({
    'description' : IDL.Text,
    'timestamp' : IDL.Float64,
    'segmentIndex' : IDL.Nat,
    'eventType' : RaceEventType,
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
    'trackSeed' : IDL.Nat,
    'platformTax' : IDL.Nat,
    'minEntries' : IDL.Nat,
    'name' : IDL.Text,
    'createdAt' : IDL.Int,
    'results' : IDL.Opt(IDL.Vec(RaceResult)),
    'distance' : IDL.Nat,
    'platformBonus' : IDL.Nat,
    'entries' : IDL.Vec(RaceEntry),
    'trackId' : IDL.Nat,
    'events' : IDL.Vec(RaceEvent),
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
  const Result_5 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
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
  const Result_6 = IDL.Variant({ 'ok' : IDL.Null, 'err' : TreasuryError });
  const HttpHeader = IDL.Record({ 'value' : IDL.Text, 'name' : IDL.Text });
  const HttpRequestResult = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(HttpHeader),
  });
  const PoolStatus = IDL.Variant({
    'Open' : IDL.Null,
    'Closed' : IDL.Null,
    'Cancelled' : IDL.Null,
    'Settled' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const RaceResults = IDL.Record({
    'rankings' : IDL.Vec(IDL.Nat),
    'fetchedAt' : IDL.Int,
  });
  const FailedPayout = IDL.Record({
    'userId' : IDL.Principal,
    'attempts' : IDL.Nat,
    'error' : IDL.Text,
    'betId' : IDL.Nat,
    'amount' : IDL.Nat,
    'lastAttempt' : IDL.Int,
  });
  const BettingPool = IDL.Record({
    'status' : PoolStatus,
    'placePool' : IDL.Nat,
    'winBetsByBot' : IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Nat)),
    'terrain' : IDL.Text,
    'rakeDistributed' : IDL.Bool,
    'placeBetsByBot' : IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Nat)),
    'subaccount' : IDL.Vec(IDL.Nat8),
    'showBetsByBot' : IDL.Vec(IDL.Tuple(IDL.Nat, IDL.Nat)),
    'results' : IDL.Opt(RaceResults),
    'distance' : IDL.Nat,
    'payoutsCompleted' : IDL.Bool,
    'betIds' : IDL.Vec(IDL.Nat),
    'raceId' : IDL.Nat,
    'showPool' : IDL.Nat,
    'entrants' : IDL.Vec(IDL.Nat),
    'totalPooled' : IDL.Nat,
    'bettingOpensAt' : IDL.Int,
    'winPool' : IDL.Nat,
    'raceClass' : IDL.Text,
    'bettingClosesAt' : IDL.Int,
    'failedPayouts' : IDL.Vec(FailedPayout),
  });
  const BetType = IDL.Variant({
    'Win' : IDL.Null,
    'Show' : IDL.Null,
    'Place' : IDL.Null,
  });
  const Result_4 = IDL.Variant({
    'ok' : IDL.Record({
      'currentOdds' : IDL.Float64,
      'potentialPayout' : IDL.Nat,
      'betId' : IDL.Nat,
    }),
    'err' : IDL.Text,
  });
  const UpgradeType = IDL.Variant({
    'Gyro' : IDL.Null,
    'PowerCore' : IDL.Null,
    'Thruster' : IDL.Null,
    'Velocity' : IDL.Null,
  });
  const UpgradeSession = IDL.Record({
    'startedAt' : IDL.Int,
    'paymentMethod' : IDL.Text,
    'costPaid' : IDL.Nat,
    'tokenIndex' : IDL.Nat,
    'partsUsed' : IDL.Nat,
    'consecutiveFails' : IDL.Nat,
    'upgradeType' : UpgradeType,
    'endsAt' : IDL.Int,
  });
  const Distance = IDL.Variant({
    'MediumHaul' : IDL.Null,
    'LongTrek' : IDL.Null,
    'ShortSprint' : IDL.Null,
  });
  const WorldBuff = IDL.Record({
    'appliedAt' : IDL.Int,
    'expiresAt' : IDL.Int,
    'stats' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat)),
  });
  const ScavengingZone = IDL.Variant({
    'ChargingStation' : IDL.Null,
    'AbandonedSettlements' : IDL.Null,
    'ScrapHeaps' : IDL.Null,
    'RepairBay' : IDL.Null,
    'DeadMachineFields' : IDL.Null,
  });
  const ScavengingMission = IDL.Record({
    'pendingConditionRestored' : IDL.Nat,
    'startTime' : IDL.Int,
    'tokenIndex' : IDL.Nat,
    'zone' : ScavengingZone,
    'pendingParts' : IDL.Record({
      'powerCoreFragments' : IDL.Nat,
      'universalParts' : IDL.Nat,
      'gyroModules' : IDL.Nat,
      'speedChips' : IDL.Nat,
      'thrusterKits' : IDL.Nat,
    }),
    'lastAccumulation' : IDL.Int,
    'durationMinutes' : IDL.Opt(IDL.Nat),
    'missionId' : IDL.Nat,
    'pendingBatteryRestored' : IDL.Nat,
  });
  const PokedBotRacingStats = IDL.Record({
    'accelerationBonus' : IDL.Nat,
    'preferredDistance' : Distance,
    'totalPartsScavenged' : IDL.Nat,
    'stabilityBonus' : IDL.Nat,
    'lastRepaired' : IDL.Opt(IDL.Int),
    'lastRaced' : IDL.Opt(IDL.Int),
    'tokenIndex' : IDL.Nat,
    'places' : IDL.Nat,
    'activatedAt' : IDL.Int,
    'ownerPrincipal' : IDL.Principal,
    'bestHaul' : IDL.Nat,
    'name' : IDL.Opt(IDL.Text),
    'scavengingReputation' : IDL.Nat,
    'lastRecharged' : IDL.Opt(IDL.Int),
    'worldBuff' : IDL.Opt(WorldBuff),
    'wins' : IDL.Nat,
    'eloRating' : IDL.Nat,
    'lastMissionRewards' : IDL.Opt(
      IDL.Record({
        'powerCoreFragments' : IDL.Nat,
        'completedAt' : IDL.Int,
        'universalParts' : IDL.Nat,
        'gyroModules' : IDL.Nat,
        'zone' : ScavengingZone,
        'speedChips' : IDL.Nat,
        'totalParts' : IDL.Nat,
        'thrusterKits' : IDL.Nat,
        'hoursOut' : IDL.Nat,
      })
    ),
    'factionReputation' : IDL.Nat,
    'stabilityUpgrades' : IDL.Nat,
    'scavengingMissions' : IDL.Nat,
    'accelerationUpgrades' : IDL.Nat,
    'overcharge' : IDL.Nat,
    'speedUpgrades' : IDL.Nat,
    'experience' : IDL.Nat,
    'shows' : IDL.Nat,
    'lastDiagnostics' : IDL.Opt(IDL.Int),
    'preferredTerrain' : Terrain,
    'lastDecayed' : IDL.Int,
    'listedForSale' : IDL.Bool,
    'racesEntered' : IDL.Nat,
    'powerCoreBonus' : IDL.Nat,
    'faction' : FactionType,
    'battery' : IDL.Nat,
    'respecCount' : IDL.Nat,
    'speedBonus' : IDL.Nat,
    'totalScrapEarned' : IDL.Nat,
    'activeMission' : IDL.Opt(ScavengingMission),
    'powerCoreUpgrades' : IDL.Nat,
    'upgradeEndsAt' : IDL.Opt(IDL.Int),
    'condition' : IDL.Nat,
  });
  const Result_3 = IDL.Variant({
    'ok' : IDL.Record({
      'activeUpgrade' : IDL.Opt(UpgradeSession),
      'isInitialized' : IDL.Bool,
      'stats' : IDL.Opt(PokedBotRacingStats),
      'baseStats' : IDL.Record({
        'stability' : IDL.Nat,
        'speed' : IDL.Nat,
        'acceleration' : IDL.Nat,
        'powerCore' : IDL.Nat,
      }),
      'isOwner' : IDL.Bool,
      'currentBattery' : IDL.Opt(IDL.Nat),
      'upgradeCosts' : IDL.Opt(
        IDL.Record({
          'Gyro' : IDL.Record({ 'icp' : IDL.Nat, 'parts' : IDL.Nat }),
          'PowerCore' : IDL.Record({ 'icp' : IDL.Nat, 'parts' : IDL.Nat }),
          'Thruster' : IDL.Record({ 'icp' : IDL.Nat, 'parts' : IDL.Nat }),
          'Velocity' : IDL.Record({ 'icp' : IDL.Nat, 'parts' : IDL.Nat }),
        })
      ),
      'currentCondition' : IDL.Opt(IDL.Nat),
    }),
    'err' : IDL.Text,
  });
  const UserInventory = IDL.Record({
    'powerCoreFragments' : IDL.Nat,
    'universalParts' : IDL.Nat,
    'owner' : IDL.Principal,
    'gyroModules' : IDL.Nat,
    'speedChips' : IDL.Nat,
    'thrusterKits' : IDL.Nat,
  });
  const Result_2 = IDL.Variant({
    'ok' : IDL.Record({
      'stabilityPartsRefunded' : IDL.Nat,
      'speedPartsRefunded' : IDL.Nat,
      'powerCorePartsRefunded' : IDL.Nat,
      'respecCost' : IDL.Nat,
      'totalRefunded' : IDL.Nat,
      'accelerationPartsRefunded' : IDL.Nat,
    }),
    'err' : IDL.Text,
  });
  const Subaccount = IDL.Vec(IDL.Nat8);
  const Destination = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(Subaccount),
  });
  const Result = IDL.Variant({ 'ok' : IDL.Nat, 'err' : TreasuryError });
  const McpServer = IDL.Service({
    'admin_clear_active_mission' : IDL.Func([IDL.Nat], [IDL.Text], []),
    'admin_create_betting_pool' : IDL.Func([IDL.Nat], [Result_1], []),
    'admin_get_active_mission' : IDL.Func([IDL.Nat], [IDL.Text], ['query']),
    'admin_remove_race_entry' : IDL.Func([IDL.Nat, IDL.Nat], [Result_1], []),
    'admin_update_race_min_entries' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Text],
        [],
      ),
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
    'cleanup_duplicate_race_create_timers' : IDL.Func([], [IDL.Text], []),
    'cleanup_duplicate_recharge_timers' : IDL.Func([], [IDL.Text], []),
    'clear_reconstitution_traces' : IDL.Func([], [], []),
    'create_my_api_key' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Text)],
        [IDL.Text],
        [],
      ),
    'debug_get_all_tracks' : IDL.Func(
        [],
        [
          IDL.Vec(
            IDL.Record({
              'segmentCount' : IDL.Nat,
              'laps' : IDL.Nat,
              'name' : IDL.Text,
              'description' : IDL.Text,
              'trackId' : IDL.Nat,
              'totalDistance' : IDL.Nat,
              'primaryTerrain' : Terrain,
            })
          ),
        ],
        ['query'],
      ),
    'debug_simulate_race' : IDL.Func(
        [IDL.Nat, IDL.Vec(IDL.Nat), IDL.Nat],
        [
          IDL.Opt(
            IDL.Record({
              'participants' : IDL.Vec(
                IDL.Record({
                  'tokenIndex' : IDL.Nat,
                  'stats' : IDL.Record({
                    'stability' : IDL.Nat,
                    'speed' : IDL.Nat,
                    'acceleration' : IDL.Nat,
                    'powerCore' : IDL.Nat,
                  }),
                })
              ),
              'track' : IDL.Record({
                'segmentCount' : IDL.Nat,
                'laps' : IDL.Nat,
                'name' : IDL.Text,
                'description' : IDL.Text,
                'trackId' : IDL.Nat,
                'totalDistance' : IDL.Nat,
              }),
              'results' : IDL.Vec(
                IDL.Record({
                  'tokenIndex' : IDL.Nat,
                  'finalTime' : IDL.Float64,
                  'avgSegmentTime' : IDL.Float64,
                  'position' : IDL.Nat,
                })
              ),
              'analysis' : IDL.Record({
                'lastPlaceTime' : IDL.Float64,
                'winner' : IDL.Nat,
                'timeSpread' : IDL.Float64,
                'avgTime' : IDL.Float64,
                'winnerTime' : IDL.Float64,
              }),
            })
          ),
        ],
        ['query'],
      ),
    'debug_test_simulation' : IDL.Func(
        [IDL.Vec(IDL.Nat), IDL.Nat, IDL.Nat],
        [
          IDL.Opt(
            IDL.Record({
              'results' : IDL.Vec(
                IDL.Record({
                  'tokenIndex' : IDL.Nat,
                  'finalTime' : IDL.Float64,
                })
              ),
            })
          ),
        ],
        ['query'],
      ),
    'decode_token_identifier' : IDL.Func([IDL.Text], [IDL.Nat], ['query']),
    'delete_events_and_races' : IDL.Func([IDL.Vec(IDL.Nat)], [IDL.Text], []),
    'emergency_clear_all_timers' : IDL.Func([], [IDL.Nat], []),
    'encode_token_identifier' : IDL.Func([IDL.Nat32], [IDL.Text], ['query']),
    'force_finish_race' : IDL.Func([IDL.Nat], [IDL.Text], []),
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
    'get_base_stats_count' : IDL.Func([], [IDL.Nat], ['query']),
    'get_bot_profile' : IDL.Func(
        [IDL.Nat],
        [
          IDL.Opt(
            IDL.Record({
              'tokenIndex' : IDL.Nat,
              'owner' : IDL.Opt(IDL.Principal),
              'isInitialized' : IDL.Bool,
              'name' : IDL.Opt(IDL.Text),
              'eloRating' : IDL.Opt(IDL.Nat),
              'stats' : IDL.Record({
                'stability' : IDL.Nat,
                'speed' : IDL.Nat,
                'overallRating' : IDL.Nat,
                'acceleration' : IDL.Nat,
                'powerCore' : IDL.Nat,
              }),
              'preferredTerrain' : IDL.Opt(Terrain),
              'faction' : IDL.Opt(FactionType),
              'career' : IDL.Record({
                'wins' : IDL.Nat,
                'podiums' : IDL.Nat,
                'racesEntered' : IDL.Nat,
                'totalEarnings' : IDL.Nat,
              }),
              'raceClass' : IDL.Opt(RaceClass),
            })
          ),
        ],
        ['query'],
      ),
    'get_bot_race_history' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Opt(IDL.Nat)],
        [
          IDL.Record({
            'hasMore' : IDL.Bool,
            'nextRaceId' : IDL.Opt(IDL.Nat),
            'races' : IDL.Vec(
              IDL.Record({
                'eventId' : IDL.Nat,
                'raceName' : IDL.Text,
                'prizeAmount' : IDL.Nat,
                'scheduledTime' : IDL.Int,
                'totalRacers' : IDL.Nat,
                'finalTime' : IDL.Opt(IDL.Float64),
                'raceId' : IDL.Nat,
                'position' : IDL.Nat,
                'eventName' : IDL.Text,
              })
            ),
          }),
        ],
        ['query'],
      ),
    'get_completed_races' : IDL.Func(
        [IDL.Nat],
        [
          IDL.Vec(
            IDL.Record({
              'terrain' : Terrain,
              'entryCount' : IDL.Nat,
              'trackSeed' : IDL.Nat,
              'name' : IDL.Text,
              'results' : IDL.Opt(
                IDL.Vec(
                  IDL.Record({
                    'finalTime' : IDL.Float64,
                    'nftId' : IDL.Text,
                    'position' : IDL.Nat,
                  })
                )
              ),
              'distance' : IDL.Nat,
              'trackId' : IDL.Nat,
              'raceId' : IDL.Nat,
              'raceClass' : RaceClass,
            })
          ),
        ],
        ['query'],
      ),
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
    'get_event_with_races' : IDL.Func(
        [IDL.Nat],
        [
          IDL.Opt(
            IDL.Record({
              'event' : ScheduledEvent,
              'races' : IDL.Vec(
                IDL.Record({
                  'terrain' : Terrain,
                  'name' : IDL.Text,
                  'distance' : IDL.Nat,
                  'participantTokens' : IDL.Vec(IDL.Nat),
                  'currentEntries' : IDL.Nat,
                  'raceId' : IDL.Nat,
                  'entryFee' : IDL.Nat,
                  'maxEntries' : IDL.Nat,
                  'raceClass' : RaceClass,
                })
              ),
            })
          ),
        ],
        ['query'],
      ),
    'get_ext_canister' : IDL.Func([], [IDL.Principal], ['query']),
    'get_icp_ledger' : IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'get_latest_reconstitution_trace' : IDL.Func(
        [],
        [IDL.Opt(ReconstitutionTrace)],
        ['query'],
      ),
    'get_leaderboard' : IDL.Func(
        [LeaderboardType, IDL.Nat, IDL.Opt(RaceClass)],
        [IDL.Vec(LeaderboardEntry)],
        ['query'],
      ),
    'get_marketplace_bots_enriched' : IDL.Func(
        [IDL.Vec(IDL.Nat32)],
        [
          IDL.Vec(
            IDL.Record({
              'tokenIndex' : IDL.Nat32,
              'isInitialized' : IDL.Bool,
              'racingStats' : IDL.Opt(
                IDL.Record({
                  'baseAcceleration' : IDL.Nat,
                  'places' : IDL.Nat,
                  'currentStability' : IDL.Nat,
                  'wins' : IDL.Nat,
                  'baseStability' : IDL.Nat,
                  'shows' : IDL.Nat,
                  'overallRating' : IDL.Nat,
                  'currentPowerCore' : IDL.Nat,
                  'baseSpeed' : IDL.Nat,
                  'baseRating' : IDL.Nat,
                  'basePowerCore' : IDL.Nat,
                  'currentRating' : IDL.Nat,
                  'racesEntered' : IDL.Nat,
                  'faction' : IDL.Text,
                  'currentSpeed' : IDL.Nat,
                  'currentAcceleration' : IDL.Nat,
                  'battery' : IDL.Nat,
                  'winRate' : IDL.Float64,
                  'condition' : IDL.Nat,
                })
              ),
              'baseStats' : IDL.Record({
                'stability' : IDL.Nat,
                'speed' : IDL.Nat,
                'acceleration' : IDL.Nat,
                'powerCore' : IDL.Nat,
              }),
            })
          ),
        ],
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
    'get_upcoming_events_with_races' : IDL.Func(
        [IDL.Nat],
        [
          IDL.Vec(
            IDL.Record({
              'event' : ScheduledEvent,
              'raceSummary' : IDL.Record({
                'distances' : IDL.Vec(IDL.Nat),
                'totalParticipants' : IDL.Nat,
                'terrains' : IDL.Vec(Terrain),
                'totalRaces' : IDL.Nat,
              }),
            })
          ),
        ],
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
    'list_my_api_keys' : IDL.Func([], [IDL.Vec(ApiKeyMetadata)], ['query']),
    'query_races' : IDL.Func(
        [
          IDL.Record({
            'afterRaceId' : IDL.Opt(IDL.Nat),
            'status' : IDL.Opt(RaceStatus),
            'participantPrincipal' : IDL.Opt(IDL.Principal),
            'eligibleForCaller' : IDL.Opt(
              IDL.Record({
                'caller' : IDL.Principal,
                'eligibleOnly' : IDL.Bool,
              })
            ),
            'minPrizePool' : IDL.Opt(IDL.Nat),
            'terrain' : IDL.Opt(Terrain),
            'minEntries' : IDL.Opt(IDL.Nat),
            'limit' : IDL.Nat,
            'maxPrizePool' : IDL.Opt(IDL.Nat),
            'startTimeTo' : IDL.Opt(IDL.Int),
            'hasMinimumEntries' : IDL.Opt(IDL.Bool),
            'maxEntries' : IDL.Opt(IDL.Nat),
            'startTimeFrom' : IDL.Opt(IDL.Int),
            'raceClass' : IDL.Opt(RaceClass),
            'participantNftId' : IDL.Opt(IDL.Text),
          }),
        ],
        [
          IDL.Record({
            'hasMore' : IDL.Bool,
            'nextRaceId' : IDL.Opt(IDL.Nat),
            'races' : IDL.Vec(Race),
            'totalMatching' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'recalculate_bot_stats' : IDL.Func([], [IDL.Text], []),
    'revoke_my_api_key' : IDL.Func([IDL.Text], [], []),
    'set_ext_canister' : IDL.Func([IDL.Principal], [Result_5], []),
    'set_icp_ledger' : IDL.Func([IDL.Principal], [Result_5], []),
    'set_owner' : IDL.Func([IDL.Principal], [Result_6], []),
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
    'trigger_race_finish' : IDL.Func([IDL.Nat], [IDL.Text], []),
    'trigger_race_start' : IDL.Func([IDL.Nat], [IDL.Text], []),
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
        [Result_5],
        [],
      ),
    'upload_trait_schema' : IDL.Func([TraitSchema], [Result_5], []),
    'validate_timer_state' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'web_betting_get_my_bets' : IDL.Func(
        [IDL.Nat],
        [
          IDL.Record({
            'bets' : IDL.Vec(
              IDL.Record({
                'status' : IDL.Text,
                'token_index' : IDL.Nat,
                'amount_e8s' : IDL.Nat,
                'amount_icp' : IDL.Text,
                'race_id' : IDL.Nat,
                'bet_id' : IDL.Nat,
                'timestamp' : IDL.Int,
                'bet_type' : IDL.Text,
                'payout' : IDL.Opt(
                  IDL.Record({
                    'payout_e8s' : IDL.Nat,
                    'payout_icp' : IDL.Text,
                    'roi_percent' : IDL.Text,
                  })
                ),
              })
            ),
            'count' : IDL.Nat,
            'summary' : IDL.Record({
              'pending' : IDL.Nat,
              'net_profit_icp' : IDL.Text,
              'wins' : IDL.Nat,
              'losses' : IDL.Nat,
              'win_rate_percent' : IDL.Text,
              'total_bets' : IDL.Nat,
              'total_wagered_icp' : IDL.Text,
              'total_won_icp' : IDL.Text,
              'roi_percent' : IDL.Text,
            }),
          }),
        ],
        ['query'],
      ),
    'web_betting_get_my_bets_paginated' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [
          IDL.Record({
            'total' : IDL.Nat,
            'hasMore' : IDL.Bool,
            'bets' : IDL.Vec(
              IDL.Record({
                'status' : IDL.Text,
                'token_index' : IDL.Nat,
                'amount_e8s' : IDL.Nat,
                'amount_icp' : IDL.Text,
                'race_id' : IDL.Nat,
                'bet_id' : IDL.Nat,
                'timestamp' : IDL.Int,
                'bet_type' : IDL.Text,
                'payout' : IDL.Opt(
                  IDL.Record({
                    'payout_e8s' : IDL.Nat,
                    'payout_icp' : IDL.Text,
                    'roi_percent' : IDL.Text,
                  })
                ),
              })
            ),
            'summary' : IDL.Record({
              'pending' : IDL.Nat,
              'net_profit_icp' : IDL.Text,
              'wins' : IDL.Nat,
              'losses' : IDL.Nat,
              'win_rate_percent' : IDL.Text,
              'total_bets' : IDL.Nat,
              'total_wagered_icp' : IDL.Text,
              'total_won_icp' : IDL.Text,
              'roi_percent' : IDL.Text,
            }),
          }),
        ],
        ['query'],
      ),
    'web_betting_get_pool_info' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(BettingPool)],
        ['query'],
      ),
    'web_betting_list_pools' : IDL.Func(
        [IDL.Opt(PoolStatus), IDL.Nat],
        [
          IDL.Record({
            'pools' : IDL.Vec(
              IDL.Record({
                'status' : PoolStatus,
                'totalBets' : IDL.Nat,
                'raceId' : IDL.Nat,
                'totalPooled' : IDL.Nat,
                'bettingOpensAt' : IDL.Int,
                'bettingClosesAt' : IDL.Int,
              })
            ),
          }),
        ],
        ['query'],
      ),
    'web_betting_place_bet' : IDL.Func(
        [IDL.Nat, IDL.Nat, BetType, IDL.Nat],
        [Result_4],
        [],
      ),
    'web_cancel_upgrade' : IDL.Func([IDL.Nat], [Result_1], []),
    'web_complete_scavenging' : IDL.Func([IDL.Nat], [Result_1], []),
    'web_convert_parts' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Nat],
        [Result_1],
        [],
      ),
    'web_enter_race' : IDL.Func([IDL.Nat, IDL.Nat], [Result_1], []),
    'web_get_bot_details' : IDL.Func([IDL.Nat], [Result_3], []),
    'web_get_bot_details_batch' : IDL.Func(
        [IDL.Vec(IDL.Nat)],
        [
          IDL.Vec(
            IDL.Record({
              'baseAcceleration' : IDL.Nat,
              'tokenIndex' : IDL.Nat,
              'isInitialized' : IDL.Bool,
              'wins' : IDL.Nat,
              'baseStability' : IDL.Nat,
              'imageUrl' : IDL.Text,
              'overallRating' : IDL.Nat,
              'baseSpeed' : IDL.Nat,
              'basePowerCore' : IDL.Nat,
              'racesEntered' : IDL.Nat,
              'faction' : IDL.Opt(IDL.Text),
              'winRate' : IDL.Float64,
            })
          ),
        ],
        ['query'],
      ),
    'web_get_collection_bonuses' : IDL.Func(
        [],
        [
          IDL.Record({
            'yieldMultipliers' : IDL.Record({
              'prizes' : IDL.Float64,
              'parts' : IDL.Float64,
            }),
            'statBonuses' : IDL.Record({
              'stability' : IDL.Int,
              'speed' : IDL.Int,
              'acceleration' : IDL.Int,
              'powerCore' : IDL.Int,
            }),
            'drainMultipliers' : IDL.Record({ 'scavenging' : IDL.Float64 }),
            'costMultipliers' : IDL.Record({
              'repair' : IDL.Float64,
              'upgrade' : IDL.Float64,
              'rechargeCooldown' : IDL.Float64,
            }),
          }),
        ],
        ['query'],
      ),
    'web_get_user_inventory' : IDL.Func([], [UserInventory], ['query']),
    'web_initialize_bot' : IDL.Func(
        [IDL.Nat, IDL.Opt(IDL.Text)],
        [Result_1],
        [],
      ),
    'web_list_my_bots' : IDL.Func(
        [],
        [
          IDL.Vec(
            IDL.Record({
              'activeUpgrade' : IDL.Opt(UpgradeSession),
              'maxStats' : IDL.Opt(
                IDL.Record({
                  'stability' : IDL.Nat,
                  'speed' : IDL.Nat,
                  'acceleration' : IDL.Nat,
                  'powerCore' : IDL.Nat,
                })
              ),
              'tokenIndex' : IDL.Nat,
              'isInitialized' : IDL.Bool,
              'name' : IDL.Opt(IDL.Text),
              'eligibleRaces' : IDL.Vec(
                IDL.Record({
                  'startTime' : IDL.Int,
                  'terrain' : Terrain,
                  'name' : IDL.Text,
                  'raceId' : IDL.Nat,
                  'entryDeadline' : IDL.Int,
                  'entryFee' : IDL.Nat,
                })
              ),
              'currentOwner' : IDL.Text,
              'stats' : IDL.Opt(PokedBotRacingStats),
              'upcomingRaces' : IDL.Vec(
                IDL.Record({
                  'startTime' : IDL.Int,
                  'terrain' : Terrain,
                  'name' : IDL.Text,
                  'raceId' : IDL.Nat,
                  'entryDeadline' : IDL.Int,
                  'entryFee' : IDL.Nat,
                })
              ),
              'currentStats' : IDL.Opt(
                IDL.Record({
                  'stability' : IDL.Nat,
                  'speed' : IDL.Nat,
                  'acceleration' : IDL.Nat,
                  'powerCore' : IDL.Nat,
                })
              ),
              'upgradeCostsV2' : IDL.Opt(
                IDL.Record({
                  'stability' : IDL.Record({
                    'successRate' : IDL.Float64,
                    'costE8s' : IDL.Nat,
                  }),
                  'speed' : IDL.Record({
                    'successRate' : IDL.Float64,
                    'costE8s' : IDL.Nat,
                  }),
                  'acceleration' : IDL.Record({
                    'successRate' : IDL.Float64,
                    'costE8s' : IDL.Nat,
                  }),
                  'powerCore' : IDL.Record({
                    'successRate' : IDL.Float64,
                    'costE8s' : IDL.Nat,
                  }),
                  'pityCounter' : IDL.Nat,
                })
              ),
            })
          ),
        ],
        [],
      ),
    'web_list_my_registered_bots' : IDL.Func(
        [],
        [
          IDL.Vec(
            IDL.Record({
              'activeUpgrade' : IDL.Opt(UpgradeSession),
              'maxStats' : IDL.Record({
                'stability' : IDL.Nat,
                'speed' : IDL.Nat,
                'acceleration' : IDL.Nat,
                'powerCore' : IDL.Nat,
              }),
              'tokenIndex' : IDL.Nat,
              'name' : IDL.Opt(IDL.Text),
              'eligibleRaces' : IDL.Vec(
                IDL.Record({
                  'startTime' : IDL.Int,
                  'terrain' : Terrain,
                  'name' : IDL.Text,
                  'raceId' : IDL.Nat,
                  'entryDeadline' : IDL.Int,
                  'entryFee' : IDL.Nat,
                })
              ),
              'stats' : PokedBotRacingStats,
              'upcomingRaces' : IDL.Vec(
                IDL.Record({
                  'startTime' : IDL.Int,
                  'terrain' : Terrain,
                  'name' : IDL.Text,
                  'raceId' : IDL.Nat,
                  'entryDeadline' : IDL.Int,
                  'entryFee' : IDL.Nat,
                })
              ),
              'currentStats' : IDL.Record({
                'stability' : IDL.Nat,
                'speed' : IDL.Nat,
                'acceleration' : IDL.Nat,
                'powerCore' : IDL.Nat,
              }),
              'upgradeCostsV2' : IDL.Record({
                'stability' : IDL.Record({
                  'successRate' : IDL.Float64,
                  'costE8s' : IDL.Nat,
                }),
                'speed' : IDL.Record({
                  'successRate' : IDL.Float64,
                  'costE8s' : IDL.Nat,
                }),
                'acceleration' : IDL.Record({
                  'successRate' : IDL.Float64,
                  'costE8s' : IDL.Nat,
                }),
                'powerCore' : IDL.Record({
                  'successRate' : IDL.Float64,
                  'costE8s' : IDL.Nat,
                }),
                'pityCounter' : IDL.Nat,
              }),
            })
          ),
        ],
        ['query'],
      ),
    'web_recharge_bot' : IDL.Func([IDL.Nat], [Result_1], []),
    'web_repair_bot' : IDL.Func([IDL.Nat], [Result_1], []),
    'web_respec_bot' : IDL.Func([IDL.Nat], [Result_2], []),
    'web_start_scavenging' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Opt(IDL.Nat)],
        [Result_1],
        [],
      ),
    'web_upgrade_bot' : IDL.Func(
        [
          IDL.Nat,
          UpgradeType,
          IDL.Variant({ 'icp' : IDL.Null, 'parts' : IDL.Null }),
        ],
        [Result_1],
        [],
      ),
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
