// packages/libs/ic-js/src/api/racing.api.ts

import { Identity } from '@icp-sdk/core/agent';
import { getRacingActor } from '../actors.js';
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
export const getUpcomingEvents = async (
  daysAhead: number = 7,
  identity?: Identity
): Promise<ScheduledEvent[]> => {
  const racingActor = getRacingActor(identity);
  const result = await racingActor.get_upcoming_events(BigInt(daysAhead));
  return result;
};

/**
 * Fetches all scheduled race events.
 * @param identity Optional identity to use for the actor
 * @returns An array of all ScheduledEvent objects
 */
export const getAllScheduledEvents = async (
  identity?: Identity
): Promise<ScheduledEvent[]> => {
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
export const getPastEvents = async (
  offset: number,
  limit: number,
  identity?: Identity
): Promise<ScheduledEvent[]> => {
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
export const getEventDetails = async (
  eventId: number,
  identity?: Identity
): Promise<ScheduledEvent | null> => {
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
export const getRaceById = async (
  raceId: number,
  identity?: Identity
): Promise<Race | null> => {
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
export const getBotProfile = async (
  tokenIndex: number,
  identity?: Identity
): Promise<any> => {
  const racingActor = getRacingActor(identity);
  const result = await racingActor.get_bot_profile(BigInt(tokenIndex));
  return result.length > 0 ? (result[0] ?? null) : null;
};

/**
 * Fetches upcoming scheduled race events with race summaries.
 * @param daysAhead Number of days ahead to look for events
 * @param identity Optional identity to use for the actor
 * @returns An array of events with race summaries
 */
export const getUpcomingEventsWithRaces = async (
  daysAhead: number = 7,
  identity?: Identity
): Promise<Array<{
  event: ScheduledEvent;
  raceSummary: {
    totalRaces: bigint;
    terrains: Array<PokedBotsRacing.Terrain>;
    distances: Array<bigint>;
    totalParticipants: bigint;
  };
}>> => {
  const racingActor = getRacingActor(identity);
  const result = await racingActor.get_upcoming_events_with_races(BigInt(daysAhead));
  return result;
};

/**
 * Fetches details for a specific event with full race details.
 * @param eventId The ID of the event to fetch
 * @param identity Optional identity to use for the actor
 * @returns The event with race details if found, null otherwise
 */
export const getEventWithRaces = async (
  eventId: number,
  identity?: Identity
): Promise<{
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
} | null> => {
  const racingActor = getRacingActor(identity);
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
export const getBotRaceHistory = async (
  tokenIndex: number,
  limit: number = 10,
  afterRaceId?: number,
  identity?: Identity
): Promise<{ races: Array<any>, hasMore: boolean, nextRaceId: number | null }> => {
  const racingActor = getRacingActor(identity);
  const result = await racingActor.get_bot_race_history(
    BigInt(tokenIndex), 
    BigInt(limit),
    afterRaceId !== undefined ? [BigInt(afterRaceId)] : []
  );
  
  return {
    races: result.races,
    hasMore: result.hasMore,
    nextRaceId: result.nextRaceId.length > 0 ? Number(result.nextRaceId[0]) : null
  };
};
