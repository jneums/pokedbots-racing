import { type Identity } from '@icp-sdk/core/agent';
import { PokedBotsRacing } from '@pokedbots-racing/declarations';
export type ScheduledEvent = PokedBotsRacing.ScheduledEvent;
export type EventStatus = PokedBotsRacing.EventStatus;
export type Race = PokedBotsRacing.Race;
export type BotSegmentTimes = PokedBotsRacing.BotSegmentTimes;
export type UserEventConfig = PokedBotsRacing.UserEventConfig;
export type EventVisibility = PokedBotsRacing.EventVisibility;
type IdentityOrAgent = Identity | any;
/**
 * Fetches upcoming scheduled race events.
 * @param daysAhead Number of days ahead to look for events
 * @param identity Optional identity to use for the actor
 * @returns An array of ScheduledEvent objects
 */
export declare const getUpcomingEvents: (daysAhead?: number, identity?: Identity) => Promise<ScheduledEvent[]>;
/**
 * Fetches all scheduled race events.
 * @param identity Optional identity to use for the actor
 * @returns An array of all ScheduledEvent objects
 */
export declare const getAllScheduledEvents: (identity?: Identity) => Promise<ScheduledEvent[]>;
/**
 * Fetches past events with pagination.
 * @param offset Starting index for pagination
 * @param limit Number of events to return (page size)
 * @param identity Optional identity to use for the actor
 * @returns An array of past ScheduledEvent objects
 */
export declare const getPastEvents: (offset: number, limit: number, identity?: Identity) => Promise<ScheduledEvent[]>;
/**
 * Fetches details for a specific event by ID.
 * @param eventId The ID of the event to fetch
 * @param identity Optional identity to use for the actor
 * @returns The ScheduledEvent if found, null otherwise
 */
export declare const getEventDetails: (eventId: number, identity?: Identity) => Promise<ScheduledEvent | null>;
/**
 * Fetches details for a specific race by ID.
 * @param raceId The ID of the race to fetch
 * @param identity Optional identity to use for the actor
 * @returns The Race if found, null otherwise
 */
export declare const getRaceById: (raceId: number, identity?: Identity) => Promise<Race | null>;
/**
 * Fetches per-bot segment times via deterministic replay of a completed race.
 * @param raceId The ID of the race to replay
 * @param identity Optional identity to use for the actor
 * @returns Array of BotSegmentTimes (nftId + cumulative segment times)
 */
export declare const getRaceSegments: (raceId: number, identity?: Identity) => Promise<BotSegmentTimes[]>;
/**
 * Fetches public profile details for a specific PokedBot.
 * @param tokenIndex The token index of the bot
 * @param identity Optional identity to use for the actor
 * @returns The bot profile if found, null otherwise
 */
export declare const getBotProfile: (tokenIndex: number, identity?: Identity) => Promise<any>;
/**
 * Fetches multiple bot profiles in a single query (efficient batch operation)
 * @param tokenIndices Array of token indices to fetch profiles for
 * @param identity Optional identity to use for the actor
 * @returns An array of bot profiles
 */
export declare const getBotProfilesBatch: (tokenIndices: number[], identity?: Identity) => Promise<any[]>;
/**
 * Fetches upcoming scheduled race events with race summaries.
 * @param daysAhead Number of days ahead to look for events
 * @param identity Optional identity to use for the actor
 * @returns An array of events with race summaries
 */
export declare const getUpcomingEventsWithRaces: (daysAhead?: number, identity?: Identity) => Promise<Array<{
    event: ScheduledEvent;
    raceSummary: {
        totalRaces: bigint;
        terrains: Array<PokedBotsRacing.Terrain>;
        distances: Array<bigint>;
        totalParticipants: bigint;
        totalPrizePool: bigint;
        nextRaceStartTime: [] | [bigint];
        completedRaces: bigint;
        pendingRaces: bigint;
    };
}>>;
/**
 * Fetches details for a specific event with full race details.
 * @param eventId The ID of the event to fetch
 * @param identity Optional identity to use for the actor
 * @returns The event with race details if found, null otherwise
 */
export declare const getEventWithRaces: (eventId: number, identity?: Identity) => Promise<{
    event: ScheduledEvent;
    races: Array<{
        raceId: bigint;
        name: string;
        distance: bigint;
        terrain: PokedBotsRacing.Terrain;
        raceClass: PokedBotsRacing.RaceClass;
        entryFee: bigint;
        currentEntries: bigint;
        maxEntries: bigint;
        participantTokens: Array<bigint>;
    }>;
} | null>;
/**
 * Fetches comprehensive results for a multi-stage event including standings.
 * @param eventId The ID of the event to fetch results for
 * @param identity Optional identity to use for the actor
 * @returns Event results with standings, or null if not found
 */
export declare const getEventResults: (eventId: number, identity?: Identity) => Promise<{
    event: ScheduledEvent;
    isMultiStage: boolean;
    scoringMode: any;
    totalPrizePool: bigint;
    cumulativeStandings: any[] | null;
    factionStandings: any[] | null;
    raceResultsSummary: any[];
} | null>;
/**
 * Fetches race history for a specific bot with cursor-based pagination.
 * @param tokenIndex The token index of the bot
 * @param limit Maximum number of races to return
 * @param afterRaceId Optional cursor - race ID to start after for pagination
 * @param identity Optional identity to use for the actor
 * @returns Race history with pagination info
 */
export declare const getBotRaceHistory: (tokenIndex: number, limit?: number, afterRaceId?: number, identity?: Identity) => Promise<{
    races: Array<any>;
    hasMore: boolean;
    nextRaceId: number | null;
}>;
/**
 * Debug function to test race simulation on the backend for validation.
 * @param tokenIndexes Array of bot token indexes to simulate
 * @param trackId The track ID to use
 * @param trackSeed The seed for randomness
 * @param phenomenonIndex Optional phenomenon index (0-12) to override daily phenomenon
 * @param identity Optional identity to use for the actor
 * @returns Simulation results with final times and events
 */
export declare const debugTestSimulation: (tokenIndexes: number[], trackId: number, trackSeed: number, distanceKm: number, phenomenonIndex?: number, identity?: Identity) => Promise<{
    results: {
        tokenIndex: number;
        finalTime: number;
        stats: {
            speed: number;
            powerCore: number;
            acceleration: number;
            stability: number;
            luck: number;
        };
        createdAt: bigint;
    }[];
    events: {
        eventType: any;
        timestamp: number;
        segmentIndex: bigint;
        description: string;
    }[];
} | null>;
/**
 * Query races with advanced filtering and pagination
 * @param filters Object containing filter criteria
 * @param identity Optional identity to use for the actor
 * @returns Filtered races with pagination info
 */
export declare const queryRaces: (filters: {
    status?: "Upcoming" | "InProgress" | "Completed" | "Cancelled";
    raceClass?: "Scrap" | "Junker" | "Raider" | "Elite" | "SilentKlan";
    terrain?: "ScrapHeaps" | "WastelandSand" | "MetalRoads";
    minEntries?: number;
    maxEntries?: number;
    hasMinimumEntries?: boolean;
    minPrizePool?: number;
    maxPrizePool?: number;
    startTimeFrom?: bigint;
    startTimeTo?: bigint;
    limit?: number;
    afterRaceId?: number;
}, identity?: Identity) => Promise<{
    races: Race[];
    hasMore: boolean;
    nextRaceId: bigint | null;
    totalMatching: bigint;
}>;
/**
 * Register a bot for an event
 * @param eventId The event ID to register for
 * @param tokenIndex The bot's token index
 * @param identity Identity to use for the call
 * @returns Success message or error
 */
export declare const registerForEvent: (eventId: number, tokenIndex: number, identity: Identity) => Promise<{
    ok: string;
} | {
    err: string;
}>;
/**
 * Unregister a bot from an event
 * @param eventId The event ID to unregister from
 * @param tokenIndex The bot's token index
 * @param identity Identity to use for the call
 * @returns Refund info or error
 */
export declare const unregisterFromEvent: (eventId: number, tokenIndex: number, identity: Identity) => Promise<{
    ok: {
        refundAmount: bigint;
        penalty: bigint;
    };
} | {
    err: string;
}>;
/**
 * JS-friendly params for creating a user event.
 * All bigint fields from the backend UserEventConfig accept number here and are converted internally.
 */
export interface CreateUserEventParams {
    prizeContribution: number;
    raceCreationMode: PokedBotsRacing.RaceCreationMode;
    scheduledTime: number;
    minEntries: number;
    registrationWindowHours: number;
    name: string;
    description: string;
    creatorName?: string;
    invitedParticipants?: Array<import('@icp-sdk/core/principal').Principal>;
    divisions: Array<PokedBotsRacing.RaceClass>;
    maxRegistrationsPerClass: number;
    entryFee: number;
    visibility: PokedBotsRacing.EventVisibility;
}
/**
 * Create a user-created event with custom config.
 * Requires ICRC-2 approval for creation fee + prize contribution before calling.
 * @param config JS-friendly event configuration
 * @param identity Identity to use for the call (authenticated)
 * @returns The created event ID and message, or an error
 */
export declare const createUserEvent: (config: CreateUserEventParams, identity: IdentityOrAgent) => Promise<{
    ok: {
        eventId: bigint;
        message: string;
    };
} | {
    err: string;
}>;
/**
 * Cancel a user-created event. Only the creator can cancel, and only before registration closes.
 * Refunds entry fees to registrants and prize contribution to creator (creation fee is NOT refunded).
 * @param eventId The ID of the event to cancel
 * @param identity Identity to use for the call (authenticated)
 * @returns Refund info or error
 */
export declare const cancelUserEvent: (eventId: number, identity: IdentityOrAgent) => Promise<{
    ok: {
        refundedRegistrants: bigint;
        message: string;
        prizeRefunded: bigint;
    };
} | {
    err: string;
}>;
/**
 * Get events created by the calling user.
 * @param identity Identity to use for the call (authenticated)
 * @returns Array of ScheduledEvent objects created by the caller
 */
export declare const getMyEvents: (identity: IdentityOrAgent) => Promise<ScheduledEvent[]>;
export {};
//# sourceMappingURL=racing.api.d.ts.map