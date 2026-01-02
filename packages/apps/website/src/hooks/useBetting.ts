import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  bettingGetPoolInfo,
  bettingGetMyBets,
  bettingGetMyBetsPaginated,
  bettingPlaceBet,
  bettingListPools,
  type BetType,
} from '@pokedbots-racing/ic-js';
import { useAuth } from './useAuth';

// Hook to get betting pool info for a race
export function useGetBettingPool(raceId: number | undefined, isOpen: boolean = false) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['betting-pool', raceId],
    queryFn: async () => {
      if (!raceId) {
        throw new Error('Race ID required');
      }
      // Pass user agent if authenticated, otherwise undefined (will use anonymous)
      return bettingGetPoolInfo(user?.agent, raceId);
    },
    enabled: !!raceId,
    staleTime: isOpen ? 3 * 1000 : 30 * 1000, // 3s when open, 30s otherwise
    refetchInterval: isOpen ? 3 * 1000 : 30 * 1000, // Aggressive refetch only when betting is open
  });
}

// Hook to get user's bets
export function useGetMyBets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-bets', user?.principal],
    queryFn: async () => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return bettingGetMyBets(user.agent, 50);
    },
    enabled: !!user?.agent,
    staleTime: 15 * 1000, // 15 seconds - reasonable default
    refetchInterval: 15 * 1000,
  });
}

// Hook to get user's bets with infinite scroll pagination
export function useGetMyBetsInfinite(pageSize: number = 10) {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['my-bets-infinite', user?.principal, pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return bettingGetMyBetsPaginated(user.agent, pageSize, pageParam);
    },
    getNextPageParam: (lastPage, allPages) => {
      // If there are more bets, return the next offset
      if (lastPage.hasMore) {
        return allPages.length * pageSize;
      }
      return undefined;
    },
    enabled: !!user?.agent,
    staleTime: 30 * 1000, // 30 seconds
    initialPageParam: 0,
  });
}

// Hook to place a bet
export function usePlaceBet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      race_id: number;
      token_index: number;
      bet_type: BetType;
      amount_icp: number;
    }) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return bettingPlaceBet(
        user.agent,
        params.race_id,
        params.token_index,
        params.bet_type,
        params.amount_icp
      );
    },
    onSuccess: async (_, variables) => {
      // Immediately refetch to show the bet in UI
      await queryClient.refetchQueries({ 
        queryKey: ['betting-pool', variables.race_id],
        type: 'active'
      });
      // Invalidate my bets queries
      queryClient.invalidateQueries({ queryKey: ['my-bets'] });
      queryClient.invalidateQueries({ queryKey: ['my-bets-infinite'] });
    },
  });
}

// Hook to list betting pools
export function useListBettingPools(statusFilter?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['betting-pools', statusFilter],
    queryFn: async () => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return bettingListPools(user.agent, 20, statusFilter);
    },
    enabled: !!user?.agent,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}
