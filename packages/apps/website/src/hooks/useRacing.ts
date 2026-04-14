import { useQuery, useQueries, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUpcomingEvents,
  getUpcomingEventsWithRaces,
  getAllScheduledEvents,
  getPastEvents,
  getEventDetails,
  getEventWithRaces,
  getEventResults,
  getRaceById,
  getRaceSegments,
  getBotProfile,
  getBotProfilesBatch,
  getBotRaceHistory,
  debugTestSimulation,
  queryRaces,
  registerForEvent,
  unregisterFromEvent,
  createUserEvent,
  cancelUserEvent,
  getMyEvents,
  type ScheduledEvent,
  type Race,
  type BotSegmentTimes,
  type UserEventConfig,
  type EventVisibility,
  type CreateUserEventParams,
} from '@pokedbots-racing/ic-js';
import { useAuth } from './useAuth';

export type { ScheduledEvent, Race, BotSegmentTimes, UserEventConfig, EventVisibility, CreateUserEventParams };

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
 * React Query hook to fetch comprehensive results for a multi-stage event.
 * Includes cumulative standings, faction standings, and race summaries.
 * @param eventId The event ID to fetch results for
 * @param isLive If true, refetch every 30 seconds for live standings updates
 */
export const useGetEventResults = (eventId: number | null, isLive: boolean = false) => {
  return useQuery({
    queryKey: ['eventResults', eventId],
    queryFn: () => {
      if (eventId === null) {
        return null;
      }
      return getEventResults(eventId);
    },
    enabled: eventId !== null && eventId > 0,
    staleTime: isLive ? 10 * 1000 : 5 * 60 * 1000, // 10s for live, 5min for completed
    refetchInterval: isLive ? 30 * 1000 : false, // Refetch every 30s for live events
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
 * React Query hook to fetch per-bot segment times via deterministic replay.
 * Only fetches for completed races (when raceId is provided).
 */
export const useGetRaceSegments = (raceId: number | null) => {
  return useQuery<BotSegmentTimes[]>({
    queryKey: ['raceSegments', raceId],
    queryFn: () => getRaceSegments(raceId!),
    enabled: raceId !== null,
    staleTime: Infinity, // Segment data never changes for completed races
  });
};

/**
 * React Query hook to fetch multiple races by ID using useQueries.
 * This correctly handles arrays of race IDs without violating hooks rules.
 */
export const useGetRacesByIds = (raceIds: number[], hasActiveRaces: boolean = false) => {
  const queries = useQueries({
    queries: raceIds.map(raceId => ({
      queryKey: ['race', raceId],
      queryFn: () => getRaceById(raceId),
      enabled: raceId !== null,
      refetchInterval: hasActiveRaces ? 5000 : 30000,
    })),
  });
  
  const races = queries.map(q => q.data).filter(Boolean) as Race[];
  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);
  
  return { races, isLoading, isError };
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
 * Mutation hook to create a user-created event
 */
export const useCreateUserEvent = () => {
  const queryClient = useQueryClient();
  const { getAgent } = useAuth();
  
  return useMutation({
    mutationFn: async (config: CreateUserEventParams) => {
      const agent = getAgent();
      if (!agent) {
        throw new Error('Not authenticated');
      }
      const result = await createUserEvent(config, agent);
      if ('err' in result) {
        throw new Error(result.err);
      }
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEventsWithRaces'] });
      queryClient.invalidateQueries({ queryKey: ['allScheduledEvents'] });
      queryClient.invalidateQueries({ queryKey: ['myEvents'] });
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

/**
 * Mutation hook to cancel a user-created event
 */
export const useCancelUserEvent = () => {
  const queryClient = useQueryClient();
  const { getAgent } = useAuth();

  return useMutation({
    mutationFn: async ({ eventId }: { eventId: number }) => {
      const agent = getAgent();
      if (!agent) {
        throw new Error('Not authenticated');
      }
      const result = await cancelUserEvent(eventId, agent);
      if ('err' in result) {
        throw new Error(result.err);
      }
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEventsWithRaces'] });
      queryClient.invalidateQueries({ queryKey: ['allScheduledEvents'] });
      queryClient.invalidateQueries({ queryKey: ['myEvents'] });
      queryClient.invalidateQueries({ queryKey: ['eventDetails'] });
    },
  });
};

/**
 * Query hook to fetch events created by the current user
 */
export const useGetMyEvents = () => {
  const { getAgent, isAuthenticated } = useAuth();

  return useQuery<ScheduledEvent[]>({
    queryKey: ['myEvents'],
    queryFn: async () => {
      const agent = getAgent();
      if (!agent) {
        throw new Error('Not authenticated');
      }
      return getMyEvents(agent);
    },
    enabled: isAuthenticated,
  });
};
