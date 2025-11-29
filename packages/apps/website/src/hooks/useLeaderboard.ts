// packages/apps/website/hooks/useLeaderboard.ts

import { useQuery } from '@tanstack/react-query';
import {
  getLeaderboard,
  getMyRanking,
  getMonthlyLeaderboard,
  getSeasonLeaderboard,
  getAllTimeLeaderboard,
  getFactionLeaderboard,
  type LeaderboardEntry,
  type LeaderboardType,
} from '@pokedbots-racing/ic-js';
import { PokedBotsRacing } from '@pokedbots-racing/declarations';

export type { LeaderboardEntry, LeaderboardType };
export type FactionType = PokedBotsRacing.FactionType;

/**
 * React Query hook to fetch a specific leaderboard.
 */
export const useGetLeaderboard = (lbType: LeaderboardType, limit?: number) => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', lbType, limit],
    queryFn: async () => {
      return getLeaderboard(lbType, limit);
    },
  });
};

/**
 * React Query hook to fetch the monthly leaderboard.
 */
export const useGetMonthlyLeaderboard = (limit?: number) => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', 'monthly', limit],
    queryFn: async () => {
      return getMonthlyLeaderboard(limit);
    },
  });
};

/**
 * React Query hook to fetch the season leaderboard.
 */
export const useGetSeasonLeaderboard = (limit?: number) => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', 'season', limit],
    queryFn: async () => {
      return getSeasonLeaderboard(limit);
    },
  });
};

/**
 * React Query hook to fetch the all-time leaderboard.
 */
export const useGetAllTimeLeaderboard = (limit?: number) => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', 'alltime', limit],
    queryFn: async () => {
      return getAllTimeLeaderboard(limit);
    },
  });
};

/**
 * React Query hook to fetch a faction leaderboard.
 */
export const useGetFactionLeaderboard = (faction: FactionType, limit?: number) => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', 'faction', faction, limit],
    queryFn: async () => {
      return getFactionLeaderboard(faction, limit);
    },
  });
};

/**
 * React Query hook to fetch the ranking for a specific bot.
 */
export const useGetMyRanking = (lbType: LeaderboardType, tokenIndex: number | null) => {
  return useQuery<LeaderboardEntry | null>({
    queryKey: ['myRanking', lbType, tokenIndex],
    queryFn: () => {
      if (tokenIndex === null) {
        return null;
      }
      return getMyRanking(lbType, tokenIndex);
    },
    enabled: tokenIndex !== null,
  });
};
