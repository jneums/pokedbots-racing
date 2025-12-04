// packages/libs/ic-js/src/api/racing.api.ts
import { getRacingActor } from '../actors.js';
/**
 * Fetches upcoming scheduled race events.
 * @param daysAhead Number of days ahead to look for events
 * @param identity Optional identity to use for the actor
 * @returns An array of ScheduledEvent objects
 */
export const getUpcomingEvents = async (daysAhead = 7, identity) => {
    const racingActor = getRacingActor(identity);
    const result = await racingActor.get_upcoming_events(BigInt(daysAhead));
    return result;
};
/**
 * Fetches all scheduled race events.
 * @param identity Optional identity to use for the actor
 * @returns An array of all ScheduledEvent objects
 */
export const getAllScheduledEvents = async (identity) => {
    const racingActor = getRacingActor(identity);
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
    const racingActor = getRacingActor(identity);
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
    const racingActor = getRacingActor(identity);
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
    const racingActor = getRacingActor(identity);
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
    const racingActor = getRacingActor(identity);
    const result = await racingActor.get_bot_profile(BigInt(tokenIndex));
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
    const racingActor = getRacingActor(identity);
    const result = await racingActor.get_bot_race_history(BigInt(tokenIndex), BigInt(limit), afterRaceId !== undefined ? [BigInt(afterRaceId)] : []);
    return {
        races: result.races,
        hasMore: result.hasMore,
        nextRaceId: result.nextRaceId.length > 0 ? Number(result.nextRaceId[0]) : null
    };
};
