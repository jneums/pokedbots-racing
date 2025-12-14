import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMyBots,
  initializeBot,
  getBotDetails,
  rechargeBot,
  repairBot,
  upgradeBot,
  enterRace,
  getUserInventory,
  listMyApiKeys,
  createApiKey,
  revokeApiKey,
  type UpgradeType,
  type PaymentMethod,
  type ApiKeyMetadata,
} from '@pokedbots-racing/ic-js';
import { useAuth } from './useAuth';

/**
 * Hook to fetch user's bots
 */
export function useMyBots() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-bots', user?.principal],
    queryFn: async () => {
      if (!user?.agent) {
        throw new Error('Not authenticated');
      }
      return listMyBots(user.agent);
    },
    enabled: !!user?.agent,
    staleTime: 30 * 1000, // 30 seconds - cache shared across pages
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache when unmounted
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
      return getBotDetails(user.agent as any, tokenIndex);
    },
    enabled: !!user?.agent && tokenIndex !== null,
    staleTime: 10 * 1000, // 10 seconds
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
      queryClient.invalidateQueries({ queryKey: ['my-bots'] });
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
      return rechargeBot(user.agent as any, tokenIndex);
    },
    onSuccess: (_, tokenIndex) => {
      // Invalidate specific bot details
      queryClient.invalidateQueries({ queryKey: ['bot-details', tokenIndex] });
      queryClient.invalidateQueries({ queryKey: ['my-bots'] });
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
      return repairBot(user.agent as any, tokenIndex);
    },
    onSuccess: (_, tokenIndex) => {
      queryClient.invalidateQueries({ queryKey: ['bot-details', tokenIndex] });
      queryClient.invalidateQueries({ queryKey: ['my-bots'] });
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
      queryClient.invalidateQueries({ queryKey: ['bot-details', tokenIndex] });
      queryClient.invalidateQueries({ queryKey: ['my-bots'] });
      queryClient.invalidateQueries({ queryKey: ['race', raceId] });
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
