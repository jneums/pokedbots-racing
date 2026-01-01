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
export const useGetLeaderboard = (lbType: LeaderboardType, limit?: number, bracket?: PokedBotsRacing.RaceClass) => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', lbType, limit, bracket],
    queryFn: async () => {
      return getLeaderboard(lbType, limit, bracket);
    },
  });
};

/**
 * React Query hook to fetch the monthly leaderboard.
 */
export const useGetMonthlyLeaderboard = (limit?: number, bracket?: PokedBotsRacing.RaceClass) => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', 'monthly', limit, bracket],
    queryFn: async () => {
      return getMonthlyLeaderboard(limit, bracket);
    },
  });
};

/**
 * React Query hook to fetch the season leaderboard.
 */
export const useGetSeasonLeaderboard = (limit?: number, bracket?: PokedBotsRacing.RaceClass) => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', 'season', limit, bracket],
    queryFn: async () => {
      return getSeasonLeaderboard(limit, bracket);
    },
  });
};

/**
 * React Query hook to fetch the all-time leaderboard.
 */
export const useGetAllTimeLeaderboard = (limit?: number, bracket?: PokedBotsRacing.RaceClass) => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', 'alltime', limit, bracket],
    queryFn: async () => {
      return getAllTimeLeaderboard(limit, bracket);
    },
  });
};

/**
 * React Query hook to fetch a faction leaderboard.
 */
export const useGetFactionLeaderboard = (faction: FactionType, limit?: number, bracket?: PokedBotsRacing.RaceClass) => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', 'faction', faction, limit, bracket],
    queryFn: async () => {
      return getFactionLeaderboard(faction, limit, bracket);
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
