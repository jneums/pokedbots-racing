import { useQuery } from '@tanstack/react-query';

type PrecomputedStats = {
  stats: Array<{
    tokenId: number;
    speed: number;
    powerCore: number;
    acceleration: number;
    stability: number;
    faction: string;
  }>;
};

/**
 * Hook to fetch precomputed base stats from JSON
 * These are the original base stats before any upgrades
 */
export function usePrecomputedStats() {
  return useQuery({
    queryKey: ['precomputed-stats'],
    queryFn: async () => {
      const response = await fetch('/precomputed-stats.json');
      return response.json() as Promise<PrecomputedStats>;
    },
    staleTime: Infinity, // Never refetch - base stats don't change
  });
}

/**
 * Hook to get base stats for a specific bot
 */
export function useBotBaseStats(tokenIndex: number) {
  const { data: precomputedData } = usePrecomputedStats();
  
  if (!precomputedData) return null;
  
  const botStats = precomputedData.stats.find(s => s.tokenId === tokenIndex);
  return botStats || null;
}
