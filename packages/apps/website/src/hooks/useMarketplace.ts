import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { browseMarketplace, browseAllBots, purchaseBot, type BrowseMarketplaceParams } from '@pokedbots-racing/ic-js';
import { useAuth } from './useAuth';
import { AnonymousIdentity } from '@dfinity/agent';

/**
 * Hook to fetch marketplace listings with React Query caching
 * Works for both authenticated and anonymous users
 */
export function useMarketplace(params: BrowseMarketplaceParams = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['marketplace', params],
    queryFn: async () => {
      // Use authenticated agent if available, otherwise use anonymous identity
      const identityOrAgent = user?.agent || new AnonymousIdentity();
      return browseMarketplace(identityOrAgent as any, params);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - marketplace data changes frequently
  });
}

/**
 * Hook for infinite scrolling marketplace listings
 * Works for both authenticated and anonymous users
 * Can show either listed bots only or all bots in collection
 */
export function useInfiniteMarketplace(params: Omit<BrowseMarketplaceParams, 'after'> & { showAllBots?: boolean } = {}) {
  const { user } = useAuth();
  const { showAllBots, ...marketplaceParams } = params;

  return useInfiniteQuery({
    queryKey: ['marketplace-infinite', showAllBots, marketplaceParams],
    queryFn: async ({ pageParam }) => {
      // Use authenticated agent if available, otherwise use anonymous identity
      const identityOrAgent = user?.agent || new AnonymousIdentity();
      
      // Choose which API to call based on showAllBots flag
      if (showAllBots) {
        return browseAllBots(identityOrAgent as any, {
          ...marketplaceParams,
          after: pageParam,
        });
      } else {
        return browseMarketplace(identityOrAgent as any, {
          ...marketplaceParams,
          after: pageParam,
        });
      }
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.listings.length === 0) {
        return undefined;
      }
      // Return the last token index for pagination
      return lastPage.listings[lastPage.listings.length - 1].tokenIndex;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to purchase a bot from the marketplace
 */
export function usePurchaseBot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tokenIndex, price }: { tokenIndex: number; price: number }) => {
      if (!user?.agent) {
        throw new Error('Must be authenticated to purchase');
      }
      return purchaseBot(user.agent as any, tokenIndex, price);
    },
    onSuccess: () => {
      // Invalidate marketplace listings to remove purchased bot
      queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-infinite'] });
      // Invalidate garage to show new bot
      queryClient.invalidateQueries({ queryKey: ['my-bots'] });
      // Invalidate balance as ICP was spent
      queryClient.invalidateQueries({ queryKey: ['icp-balance'] });
    },
  });
}
