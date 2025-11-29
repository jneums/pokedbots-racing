// packages/apps/website/hooks/useRacing.ts

import { useQuery } from '@tanstack/react-query';
import {
  getUpcomingEvents,
  getAllScheduledEvents,
  getPastEvents,
  getEventDetails,
  getRaceById,
  type ScheduledEvent,
  type Race,
} from '@pokedbots-racing/ic-js';

export type { ScheduledEvent, Race };

/**
 * React Query hook to fetch upcoming race events.
 */
export const useGetUpcomingEvents = (daysAhead?: number) => {
  return useQuery<ScheduledEvent[]>({
    queryKey: ['upcomingEvents', daysAhead],
    queryFn: async () => {
      return getUpcomingEvents(daysAhead);
    },
  });
};

/**
 * React Query hook to fetch all scheduled race events.
 */
export const useGetAllScheduledEvents = () => {
  return useQuery<ScheduledEvent[]>({
    queryKey: ['allScheduledEvents'],
    queryFn: async () => {
      return getAllScheduledEvents();
    },
  });
};

/**
 * React Query hook to fetch past events with pagination.
 */
export const useGetPastEvents = (offset: number, limit: number, enabled: boolean = true) => {
  return useQuery<ScheduledEvent[]>({
    queryKey: ['pastEvents', offset, limit],
    queryFn: async () => {
      console.log('Fetching past events:', { offset, limit });
      return getPastEvents(offset, limit);
    },
    enabled,
  });
};

/**
 * React Query hook to fetch details for a specific event.
 */
export const useGetEventDetails = (eventId: number | null) => {
  return useQuery<ScheduledEvent | null>({
    queryKey: ['eventDetails', eventId],
    queryFn: () => {
      if (eventId === null) {
        return null;
      }
      return getEventDetails(eventId);
    },
    enabled: eventId !== null,
  });
};

/**
 * React Query hook to fetch details for a specific race.
 */
export const useGetRaceById = (raceId: number | null) => {
  return useQuery<Race | null>({
    queryKey: ['race', raceId],
    queryFn: () => {
      if (raceId === null) {
        return null;
      }
      return getRaceById(raceId);
    },
    enabled: raceId !== null,
  });
};
