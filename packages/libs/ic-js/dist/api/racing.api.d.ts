import { type Identity } from '@icp-sdk/core/agent';
import { PokedBotsRacing } from '@pokedbots-racing/declarations';
export type ScheduledEvent = PokedBotsRacing.ScheduledEvent;
export type EventStatus = PokedBotsRacing.EventStatus;
export type Race = PokedBotsRacing.Race;
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
 * Fetches public profile details for a specific PokedBot.
 * @param tokenIndex The token index of the bot
 * @param identity Optional identity to use for the actor
 * @returns The bot profile if found, null otherwise
 */
export declare const getBotProfile: (tokenIndex: number, identity?: Identity) => Promise<any>;
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
 * @param identity Optional identity to use for the actor
 * @returns Simulation results with final times
 */
export declare const debugTestSimulation: (tokenIndexes: number[], trackId: number, trackSeed: number, identity?: Identity) => Promise<{
    tokenIndex: number;
    finalTime: number;
}[] | null>;
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
