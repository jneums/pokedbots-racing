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
