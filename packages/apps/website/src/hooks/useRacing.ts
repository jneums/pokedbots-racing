import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUpcomingEvents,
  getUpcomingEventsWithRaces,
  getAllScheduledEvents,
  getPastEvents,
  getEventDetails,
  getEventWithRaces,
  getRaceById,
  getBotProfile,
  getBotProfilesBatch,
  getBotRaceHistory,
  debugTestSimulation,
  queryRaces,
  registerForEvent,
  unregisterFromEvent,
  type ScheduledEvent,
  type Race,
} from '@pokedbots-racing/ic-js';
import { useAuth } from './useAuth';

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
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

/**
 * React Query hook to fetch upcoming race events with race summaries.
 */
export const useGetUpcomingEventsWithRaces = (daysAhead?: number) => {
  return useQuery({
    queryKey: ['upcomingEventsWithRaces', daysAhead],
    queryFn: async () => {
      return getUpcomingEventsWithRaces(daysAhead);
    },
    refetchInterval: 30000, // Refetch every 30 seconds
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
export const useGetEventDetails = (eventId: number | null, hasActiveOrImminent: boolean = false) => {
  return useQuery<ScheduledEvent | null>({
    queryKey: ['eventDetails', eventId],
    queryFn: () => {
      if (eventId === null) {
        return null;
      }
      return getEventDetails(eventId);
    },
    enabled: eventId !== null,
    refetchInterval: hasActiveOrImminent ? 5000 : 30000, // 5s when races starting, 30s otherwise
  });
};

/**
 * React Query hook to fetch details for a specific event with full race details.
 */
export const useGetEventWithRaces = (eventId: number | null) => {
  return useQuery({
    queryKey: ['eventWithRaces', eventId],
    queryFn: () => {
      if (eventId === null) {
        return null;
      }
      return getEventWithRaces(eventId);
    },
    enabled: eventId !== null,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

/**
 * React Query hook to fetch details for a specific race.
 */
export const useGetRaceById = (raceId: number | null, isActiveOrImminent: boolean = false) => {
  return useQuery<Race | null>({
    queryKey: ['race', raceId],
    queryFn: () => {
      if (raceId === null) {
        return null;
      }
      return getRaceById(raceId);
    },
    enabled: raceId !== null,
    refetchInterval: isActiveOrImminent ? 5000 : 30000, // 5s when race starting/running, 30s otherwise
  });
};

/**
 * React Query hook to fetch public profile for a specific bot.
 */
export const useGetBotProfile = (tokenIndex: number | null) => {
  return useQuery<any>({
    queryKey: ['botProfile', tokenIndex],
    queryFn: () => {
      if (tokenIndex === null) {
        return null;
      }
      return getBotProfile(tokenIndex);
    },
    enabled: tokenIndex !== null,
  });
};

/**
 * React Query hook to fetch multiple bot profiles in a single query (efficient batch operation).
 * Uses a 1-hour cache since bot profiles don't change frequently.
 */
export const useGetBotProfilesBatch = (tokenIndices: number[]) => {
  return useQuery<any[]>({
    queryKey: ['botProfiles', ...tokenIndices.sort()],
    queryFn: () => {
      if (tokenIndices.length === 0) {
        return [];
      }
      return getBotProfilesBatch(tokenIndices);
    },
    enabled: tokenIndices.length > 0,
    staleTime: 60 * 60 * 1000, // 1 hour cache
    gcTime: 2 * 60 * 60 * 1000, // Keep in cache for 2 hours
  });
};

/**
 * React Query hook to fetch race history for a specific bot.
 */
export const useGetBotRaceHistory = (tokenIndex: number | null, limit: number = 10) => {
  return useInfiniteQuery<{ races: Array<any>, hasMore: boolean, nextRaceId: number | null }>({
    queryKey: ['botRaceHistory', tokenIndex, limit],
    queryFn: ({ pageParam }) => {
      if (tokenIndex === null) {
        return { races: [], hasMore: false, nextRaceId: null };
      }
      return getBotRaceHistory(tokenIndex, limit, pageParam as number | undefined);
    },
    enabled: tokenIndex !== null,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextRaceId : undefined;
    },
  });
};

/**
 * Query hook to test simulation on the backend for validation.
 */
export const useDebugTestSimulation = (
  tokenIndexes: number[],
  trackId: number,
  trackSeed: number,
  distanceKm: number,
  phenomenonIndex: number | undefined,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['debugTestSimulation', tokenIndexes, trackId, trackSeed, distanceKm, phenomenonIndex],
    queryFn: async () => {
      if (tokenIndexes.length === 0) return null;
      return debugTestSimulation(tokenIndexes, trackId, trackSeed, distanceKm, phenomenonIndex);
    },
    enabled: enabled && tokenIndexes.length > 0,
  });
};

/**
 * Query races with advanced filtering and pagination
 */
export const useQueryRaces = (filters: {
  status?: 'Upcoming' | 'InProgress' | 'Completed' | 'Cancelled';
  raceClass?: 'Scrap' | 'Junker' | 'Raider' | 'Elite' | 'SilentKlan';
  terrain?: 'ScrapHeaps' | 'WastelandSand' | 'MetalRoads';
  minEntries?: number;
  maxEntries?: number;
  hasMinimumEntries?: boolean;
  minPrizePool?: number;
  maxPrizePool?: number;
  startTimeFrom?: bigint;
  startTimeTo?: bigint;
  limit?: number;
  afterRaceId?: number;
}, enabled: boolean = true) => {
  // Convert BigInt values to strings for the query key to avoid serialization errors
  const serializableFilters = {
    ...filters,
    startTimeFrom: filters.startTimeFrom?.toString(),
    startTimeTo: filters.startTimeTo?.toString(),
  };
  
  return useQuery({
    queryKey: ['queryRaces', serializableFilters],
    queryFn: async () => {
      console.log('Fetching races with filters:', filters);
      const result = await queryRaces(filters);
      console.log('Query races result:', result);
      return result;
    },
    enabled,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2, // Reduce retries
    staleTime: 10000, // Consider data stale after 10 seconds
  });
};

/**
 * Mutation hook to register a bot for an event
 */
export const useRegisterForEvent = () => {
  const queryClient = useQueryClient();
  const { getAgent } = useAuth();
  
  return useMutation({
    mutationFn: async ({ eventId, tokenIndex }: { eventId: number; tokenIndex: number }) => {
      const agent = getAgent();
      if (!agent) {
        throw new Error('Not authenticated');
      }
      const result = await registerForEvent(eventId, tokenIndex, agent);
      if ('err' in result) {
        throw new Error(result.err);
      }
      return result.ok;
    },
    onSuccess: (_, variables) => {
      // Invalidate event details to refetch registration counts
      queryClient.invalidateQueries({ queryKey: ['eventDetails', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventWithRaces', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEventsWithRaces'] });
    },
  });
};

/**
 * Mutation hook to unregister a bot from an event
 */
export const useUnregisterFromEvent = () => {
  const queryClient = useQueryClient();
  const { getAgent } = useAuth();
  
  return useMutation({
    mutationFn: async ({ eventId, tokenIndex }: { eventId: number; tokenIndex: number }) => {
      const agent = getAgent();
      if (!agent) {
        throw new Error('Not authenticated');
      }
      const result = await unregisterFromEvent(eventId, tokenIndex, agent);
      if ('err' in result) {
        throw new Error(result.err);
      }
      return result.ok;
    },
    onSuccess: (_, variables) => {
      // Invalidate event details to refetch registration counts
      queryClient.invalidateQueries({ queryKey: ['eventDetails', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventWithRaces', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEventsWithRaces'] });
    },
  });
};
