// packages/libs/ic-js/src/api/racing.api.ts
import { getRacingActor } from '../actors.js';
import { PokedBotsRacing } from '@pokedbots-racing/declarations';
import { getCanisterId } from '../config.js';
// Helper function to detect if this is a Plug agent
// Plug agents are HttpAgent instances with specific structure, not standard Identity objects
function isPlugAgent(identityOrAgent) {
    // Plug agents have 'agent' property and are not standard Identity objects
    // Standard Identity objects from AuthClient don't have nested 'agent' property
    return identityOrAgent &&
        typeof identityOrAgent === 'object' &&
        'agent' in identityOrAgent &&
        'getPrincipal' in identityOrAgent &&
        typeof identityOrAgent.getPrincipal === 'function';
}
// Helper to get racing actor from Identity or Plug agent
async function getActor(identityOrAgent) {
    // Check if it's a Plug agent - use window.ic.plug.createActor
    if (isPlugAgent(identityOrAgent) && typeof globalThis !== 'undefined' && globalThis.window?.ic?.plug?.createActor) {
        const canisterId = getCanisterId('POKEDBOTS_RACING');
        return await globalThis.window.ic.plug.createActor({
            canisterId,
            interfaceFactory: PokedBotsRacing.idlFactory,
        });
    }
    // It's a standard Identity - use our standard actor creation
    return getRacingActor(identityOrAgent);
}
/**
 * Fetches upcoming scheduled race events.
 * @param daysAhead Number of days ahead to look for events
 * @param identity Optional identity to use for the actor
 * @returns An array of ScheduledEvent objects
 */
export const getUpcomingEvents = async (daysAhead = 7, identity) => {
    const racingActor = await getActor(identity);
    const result = await racingActor.get_upcoming_events(BigInt(daysAhead));
    return result;
};
/**
 * Fetches all scheduled race events.
 * @param identity Optional identity to use for the actor
 * @returns An array of all ScheduledEvent objects
 */
export const getAllScheduledEvents = async (identity) => {
    const racingActor = await getActor(identity);
    const result = await racingActor.get_all_scheduled_events();
    return result;
};
/**
 * Fetches past events with pagination.
 * @param offset Starting index for pagination
 * @param limit Number of events to return (page size)
 * @param identity Optional identity to use for the actor
 * @returns An array of past ScheduledEvent objects
 */
export const getPastEvents = async (offset, limit, identity) => {
    const racingActor = await getActor(identity);
    const result = await racingActor.get_past_events(BigInt(offset), BigInt(limit));
    return result;
};
/**
 * Fetches details for a specific event by ID.
 * @param eventId The ID of the event to fetch
 * @param identity Optional identity to use for the actor
 * @returns The ScheduledEvent if found, null otherwise
 */
export const getEventDetails = async (eventId, identity) => {
    const racingActor = await getActor(identity);
    const result = await racingActor.get_event_details(BigInt(eventId));
    return result.length > 0 ? (result[0] ?? null) : null;
};
/**
 * Fetches details for a specific race by ID.
 * @param raceId The ID of the race to fetch
 * @param identity Optional identity to use for the actor
 * @returns The Race if found, null otherwise
 */
export const getRaceById = async (raceId, identity) => {
    const racingActor = await getActor(identity);
    const result = await racingActor.get_race_by_id(BigInt(raceId));
    return result.length > 0 ? (result[0] ?? null) : null;
};
/**
 * Fetches public profile details for a specific PokedBot.
 * @param tokenIndex The token index of the bot
 * @param identity Optional identity to use for the actor
 * @returns The bot profile if found, null otherwise
 */
export const getBotProfile = async (tokenIndex, identity) => {
    const racingActor = await getActor(identity);
    const result = await racingActor.get_bot_profile(BigInt(tokenIndex));
    return result.length > 0 ? (result[0] ?? null) : null;
};
/**
 * Fetches upcoming scheduled race events with race summaries.
 * @param daysAhead Number of days ahead to look for events
 * @param identity Optional identity to use for the actor
 * @returns An array of events with race summaries
 */
export const getUpcomingEventsWithRaces = async (daysAhead = 7, identity) => {
    const racingActor = await getActor(identity);
    const result = await racingActor.get_upcoming_events_with_races(BigInt(daysAhead));
    return result;
};
/**
 * Fetches details for a specific event with full race details.
 * @param eventId The ID of the event to fetch
 * @param identity Optional identity to use for the actor
 * @returns The event with race details if found, null otherwise
 */
export const getEventWithRaces = async (eventId, identity) => {
    const racingActor = await getActor(identity);
    const result = await racingActor.get_event_with_races(BigInt(eventId));
    return result.length > 0 ? (result[0] ?? null) : null;
};
/**
 * Fetches race history for a specific bot with cursor-based pagination.
 * @param tokenIndex The token index of the bot
 * @param limit Maximum number of races to return
 * @param afterRaceId Optional cursor - race ID to start after for pagination
 * @param identity Optional identity to use for the actor
 * @returns Race history with pagination info
 */
export const getBotRaceHistory = async (tokenIndex, limit = 10, afterRaceId, identity) => {
    const racingActor = await getActor(identity);
    const result = await racingActor.get_bot_race_history(BigInt(tokenIndex), BigInt(limit), afterRaceId !== undefined ? [BigInt(afterRaceId)] : []);
    return {
        races: result.races,
        hasMore: result.hasMore,
        nextRaceId: result.nextRaceId.length > 0 ? Number(result.nextRaceId[0]) : null
    };
};
/**
 * Debug function to test race simulation on the backend for validation.
 * @param tokenIndexes Array of bot token indexes to simulate
 * @param trackId The track ID to use
 * @param trackSeed The seed for randomness
 * @param identity Optional identity to use for the actor
 * @returns Simulation results with final times
 */
export const debugTestSimulation = async (tokenIndexes, trackId, trackSeed, identity) => {
    const racingActor = await getActor(identity);
    const result = await racingActor.debug_test_simulation(tokenIndexes.map(BigInt), BigInt(trackId), BigInt(trackSeed));
    if (result.length === 0 || !result[0]) {
        return null;
    }
    const data = result[0];
    return data.results.map((r) => ({
        tokenIndex: Number(r.tokenIndex),
        finalTime: Number(r.finalTime),
    }));
};
