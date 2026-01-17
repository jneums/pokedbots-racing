import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMyRegisteredBots,
  initializeBot,
  getBotDetails,
  rechargeBot,
  repairBot,
  fullMaintenanceBot,
  getStarredBots,
  setStarredBots,
  getRacerBots,
  setRacerBots,
  getScavengerBots,
  setScavengerBots,
  upgradeBot,
  cancelUpgrade,
  enterRace,
  getUserInventory,
  getCollectionBonuses,
  getGaragePowerStatus,
  listMyApiKeys,
  createApiKey,
  revokeApiKey,
  getUserWalletNFTs,
  listBotForSale,
  unlistBot,
  transferBot,
  startScavenging,
  completeScavenging,
  respecBot,
  batchRechargeBots,
  batchRepairBots,
  batchStartScavenging,
  batchCompleteScavenging,
  getDedicationInfo,
  getBatchDedicationInfo,
  type UpgradeType,
  type PaymentMethod,
  type ApiKeyMetadata,
  type UnregisteredNFT,
  type DedicationInfo,
  type BatchDedicationInfo,
  type GaragePowerStatus,
} from '@pokedbots-racing/ic-js';
import { useAuth } from './useAuth';

/**
 * Hook to fetch user's registered bots (QUERY - fast, no Plug popups)
 * Only returns bots that have been initialized for racing
 */
export function useMyBots() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-bots', user?.principal],
    queryFn: async () => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return listMyRegisteredBots(user.agent);
    },
    enabled: !!user?.agent,
    staleTime: 30 * 1000, // 30 seconds - cache shared across pages
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache when unmounted
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds to keep data fresh
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

/**
 * Hook to fetch detailed bot information
 */
export function useBotDetails(tokenIndex: number | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bot-details', tokenIndex, user?.principal],
    queryFn: async () => {
      if (!user?.agent || tokenIndex === null) {
        throw new Error('Not authenticated or invalid token');
      }
      return getBotDetails(tokenIndex, user.agent);
    },
    enabled: !!user?.agent && tokenIndex !== null,
    staleTime: 10 * 1000, // 10 seconds,
  });
}

/**
 * Hook to fetch dedication info for a bot (no auth required - anonymous query)
 */
export function useDedicationInfo(tokenIndex: number | null) {
  return useQuery({
    queryKey: ['dedication-info', tokenIndex],
    queryFn: async () => {
      if (tokenIndex === null) {
        throw new Error('Invalid token');
      }
      return getDedicationInfo(tokenIndex);
    },
    enabled: tokenIndex !== null,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch batch dedication info for multiple bots (optimized for garage list)
 */
export function useBatchDedicationInfo(tokenIndices: number[]) {
  return useQuery({
    queryKey: ['batch-dedication-info', tokenIndices.sort((a,b) => a-b).join(',')],
    queryFn: async () => {
      if (tokenIndices.length === 0) {
        return new Map<number, BatchDedicationInfo>();
      }
      return getBatchDedicationInfo(tokenIndices);
    },
    enabled: tokenIndices.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to initialize a bot
 */
export function useInitializeBot() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ tokenIndex, name }: { tokenIndex: number; name?: string }) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return initializeBot(tokenIndex, name, user.agent as any);
    },
    onSuccess: () => {
      // Invalidate bot lists to refetch
      queryClient.invalidateQueries({ queryKey: ['my-bots'], refetchType: 'all' });
    },
  });
}

/**
 * Hook to recharge a bot
 */
export function useRechargeBot() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tokenIndex: number) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return rechargeBot(tokenIndex, user.agent);
    },
    onSuccess: (_, tokenIndex) => {
      // Invalidate specific bot details and force refetch
      queryClient.invalidateQueries({ queryKey: ['bot-details', tokenIndex], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['my-bots'], refetchType: 'all' });
    },
  });
}

/**
 * Hook to repair a bot
 */
export function useRepairBot() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tokenIndex: number) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return repairBot(tokenIndex, user.agent);
    },
    onSuccess: (_, tokenIndex) => {
      queryClient.invalidateQueries({ queryKey: ['bot-details', tokenIndex], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['my-bots'], refetchType: 'all' });
    },
  });
}

/**
 * Hook to perform full maintenance (recharge + repair combined)
 */
export function useFullMaintenanceBot() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tokenIndex: number) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return fullMaintenanceBot(tokenIndex, user.agent);
    },
    onSuccess: (_, tokenIndex) => {
      // Force refetch of bot data
      queryClient.invalidateQueries({ queryKey: ['bot-details', tokenIndex], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['my-bots'], refetchType: 'all' });
    },
  });
}

/**
 * Hook to fetch user's starred bots from backend
 */
export function useStarredBots() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['starred-bots', user?.principal],
    queryFn: async () => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return getStarredBots(user.agent);
    },
    enabled: !!user?.agent,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to update user's starred bots on backend
 */
export function useSetStarredBots() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tokenIndices: number[]) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return setStarredBots(tokenIndices, user.agent);
    },
    onMutate: async (newStarredBots) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['starred-bots', user?.principal] });

      // Snapshot previous value
      const previousStarredBots = queryClient.getQueryData(['starred-bots', user?.principal]);

      // Optimistically update to new value
      queryClient.setQueryData(['starred-bots', user?.principal], newStarredBots);

      // Return context with previous value
      return { previousStarredBots };
    },
    onError: (err, newStarredBots, context) => {
      // Rollback on error
      if (context?.previousStarredBots) {
        queryClient.setQueryData(['starred-bots', user?.principal], context.previousStarredBots);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['starred-bots'] });
    },
  });
}

/**
 * Hook to fetch user's bots tagged as racers from backend
 */
export function useRacerBots() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['racer-bots', user?.principal],
    queryFn: async () => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return getRacerBots(user.agent);
    },
    enabled: !!user?.agent,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to update user's bots tagged as racers on backend
 */
export function useSetRacerBots() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tokenIndices: number[]) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return setRacerBots(tokenIndices, user.agent);
    },
    onMutate: async (newRacerBots) => {
      await queryClient.cancelQueries({ queryKey: ['racer-bots', user?.principal] });
      const previousRacerBots = queryClient.getQueryData(['racer-bots', user?.principal]);
      queryClient.setQueryData(['racer-bots', user?.principal], newRacerBots);
      return { previousRacerBots };
    },
    onError: (err, newRacerBots, context) => {
      if (context?.previousRacerBots) {
        queryClient.setQueryData(['racer-bots', user?.principal], context.previousRacerBots);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racer-bots'] });
    },
  });
}

/**
 * Hook to fetch user's bots tagged as scavengers from backend
 */
export function useScavengerBots() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['scavenger-bots', user?.principal],
    queryFn: async () => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return getScavengerBots(user.agent);
    },
    enabled: !!user?.agent,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to update user's bots tagged as scavengers on backend
 */
export function useSetScavengerBots() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tokenIndices: number[]) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return setScavengerBots(tokenIndices, user.agent);
    },
    onMutate: async (newScavengerBots) => {
      await queryClient.cancelQueries({ queryKey: ['scavenger-bots', user?.principal] });
      const previousScavengerBots = queryClient.getQueryData(['scavenger-bots', user?.principal]);
      queryClient.setQueryData(['scavenger-bots', user?.principal], newScavengerBots);
      return { previousScavengerBots };
    },
    onError: (err, newScavengerBots, context) => {
      if (context?.previousScavengerBots) {
        queryClient.setQueryData(['scavenger-bots', user?.principal], context.previousScavengerBots);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scavenger-bots'] });
    },
  });
}

/**
 * Hook to batch recharge multiple bots
 */
export function useBatchRechargeBots() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tokenIndices: number[]) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return batchRechargeBots(tokenIndices, user.agent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bots'], refetchType: 'all' });
    },
  });
}

/**
 * Hook to batch repair multiple bots
 */
export function useBatchRepairBots() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tokenIndices: number[]) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return batchRepairBots(tokenIndices, user.agent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bots'], refetchType: 'all' });
    },
  });
}

/**
 * Hook to batch start scavenging for multiple bots
 */
export function useBatchStartScavenging() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      tokenIndices, 
      zone, 
      durationMinutes 
    }: { 
      tokenIndices: number[]; 
      zone: string; 
      durationMinutes?: number;
    }) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return batchStartScavenging(tokenIndices, zone, durationMinutes, user.agent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bots'], refetchType: 'all' });
    },
  });
}

/**
 * Hook to batch complete scavenging for multiple bots
 */
export function useBatchCompleteScavenging() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tokenIndices: number[]) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return batchCompleteScavenging(tokenIndices, user.agent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bots'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['user-inventory'], refetchType: 'all' });
    },
  });
}

/**
 * Hook to cancel an in-progress upgrade
 */
export function useCancelUpgrade() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tokenIndex: number) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return cancelUpgrade(tokenIndex, user.agent as any);
    },
    onSuccess: (_, tokenIndex) => {
      queryClient.invalidateQueries({ queryKey: ['bot-details', tokenIndex], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['my-bots'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['user-inventory'], refetchType: 'all' });
    },
  });
}

/**
 * Hook to enter a race
 */
export function useEnterRace() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ raceId, tokenIndex }: { raceId: number; tokenIndex: number }) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return enterRace(raceId, tokenIndex, user.agent as any);
    },
    onSuccess: (_, { tokenIndex, raceId }) => {
      // Invalidate bot details and race details
      queryClient.invalidateQueries({ queryKey: ['bot-details', tokenIndex], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['my-bots'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['race', raceId], refetchType: 'all' });
    },
  });
}

/**
 * Hook to upgrade a bot stat
 */
export function useUpgradeBot() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      tokenIndex,
      upgradeType,
      paymentMethod,
    }: {
      tokenIndex: number;
      upgradeType: UpgradeType;
      paymentMethod: 'icp' | 'parts';
    }) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return upgradeBot(tokenIndex, upgradeType, paymentMethod, user.agent as any);
    },
    onSuccess: (_, { tokenIndex }) => {
      // Invalidate bot details, my bots list, and inventory
      queryClient.invalidateQueries({ queryKey: ['bot-details', tokenIndex] });
      queryClient.invalidateQueries({ queryKey: ['my-bots'] });
      queryClient.invalidateQueries({ queryKey: ['user-inventory'] });
    },
  });
}

/**
 * Hook to fetch user's parts inventory
 */
export function useUserInventory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-inventory', user?.principal],
    queryFn: async () => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return getUserInventory(user.agent);
    },
    enabled: !!user?.agent,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch collection bonuses (faction synergies)
 */
export function useCollectionBonuses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['collection-bonuses', user?.principal],
    queryFn: async () => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return getCollectionBonuses(user.agent);
    },
    enabled: !!user?.agent,
    staleTime: 30 * 1000, // 30 seconds - sync with bot list
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch garage power grid status
 * Shows efficiency when multiple bots are in ChargingStation
 */
export function useGaragePowerStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['garage-power-status', user?.principal],
    queryFn: async () => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return getGaragePowerStatus(user.agent);
    },
    enabled: !!user?.agent,
    staleTime: 10 * 1000, // 10 seconds - refresh often when managing charging bots
    gcTime: 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
  });
}

/**
 * Hook to fetch user's API keys
 */
export function useMyApiKeys() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-api-keys', user?.principal],
    queryFn: async () => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return listMyApiKeys(user.agent);
    },
    enabled: !!user?.agent,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new API key
 */
export function useCreateApiKey() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, scopes }: { name: string; scopes: string[] }) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return createApiKey(name, scopes, user.agent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-api-keys'] });
    },
  });
}

/**
 * Hook to revoke an API key
 */
export function useRevokeApiKey() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return revokeApiKey(keyId, user.agent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-api-keys'] });
    },
  });
}

/**
 * Hook to fetch user's wallet NFTs (both registered and unregistered)
 * This shows all NFTs the user owns, including those not yet registered for racing
 */
export function useUserWalletNFTs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-wallet-nfts', user?.principal],
    queryFn: async () => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return getUserWalletNFTs(user.agent);
    },
    enabled: !!user?.agent,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Auto-refetch every minute (less frequent than registered bots)
  });
}

/**
 * Hook to list a bot for sale on the marketplace
 */
export function useListBotForSale() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ tokenIndex, priceICP }: { tokenIndex: number; priceICP: number }) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return listBotForSale(tokenIndex, priceICP, user.agent as any);
    },
    onSuccess: (_, { tokenIndex }) => {
      queryClient.invalidateQueries({ queryKey: ['my-bots'] });
      queryClient.invalidateQueries({ queryKey: ['bot-details', tokenIndex] });
    },
  });
}

/**
 * Hook to unlist a bot from the marketplace
 */
export function useUnlistBot() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tokenIndex: number) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return unlistBot(tokenIndex, user.agent as any);
    },
    onSuccess: (_, tokenIndex) => {
      queryClient.invalidateQueries({ queryKey: ['my-bots'] });
      queryClient.invalidateQueries({ queryKey: ['bot-details', tokenIndex] });
    },
  });
}

/**
 * Hook to transfer a bot to another account
 */
export function useTransferBot() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ tokenIndex, toAccountId }: { tokenIndex: number; toAccountId: string }) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return transferBot(tokenIndex, toAccountId, user.agent as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bots'] });
      queryClient.invalidateQueries({ queryKey: ['user-wallet-nfts'] });
    },
  });
}

/**
 * Hook to start a scavenging mission
 */
export function useStartScavenging() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      tokenIndex, 
      zone, 
      duration 
    }: { 
      tokenIndex: number; 
      zone: 'ScrapHeaps' | 'AbandonedSettlements' | 'DeadMachineFields' | 'RepairBay' | 'ChargingStation';
      duration?: number;
    }) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return startScavenging(tokenIndex, zone, user.agent as any, duration);
    },
    onSuccess: (_, { tokenIndex }) => {
      queryClient.invalidateQueries({ queryKey: ['my-bots'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['bot-details', tokenIndex], refetchType: 'all' });
    },
  });
}

/**
 * Hook to complete a scavenging mission
 */
export function useCompleteScavenging() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tokenIndex: number) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return completeScavenging(tokenIndex, user.agent as any);
    },
    onSuccess: (_, tokenIndex) => {
      queryClient.invalidateQueries({ queryKey: ['my-bots'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['bot-details', tokenIndex], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['user-inventory'], refetchType: 'all' });
    },
  });
}

/**
 * Hook to respec a bot (reset selected stat upgrades)
 */
export function useRespecBot() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ tokenIndex, statsToStrip }: { tokenIndex: number; statsToStrip: string[] }) => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return respecBot(tokenIndex, statsToStrip, user.agent as any);
    },
    onSuccess: (_, { tokenIndex }) => {
      queryClient.invalidateQueries({ queryKey: ['my-bots'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['bot-details', tokenIndex], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['user-inventory'], refetchType: 'all' });
    },
  });
}
