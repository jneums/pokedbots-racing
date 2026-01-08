// packages/apps/website/hooks/useLeaderboard.ts

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  getLeaderboard,
  getMyRanking,
  getMonthlyLeaderboard,
  getSeasonLeaderboard,
  getAllTimeLeaderboard,
  getFactionLeaderboard,
  type LeaderboardEntry,
  type LeaderboardType,
  type LeaderboardResponse,
} from '@pokedbots-racing/ic-js';
import { PokedBotsRacing } from '@pokedbots-racing/declarations';

export type { LeaderboardEntry, LeaderboardType, LeaderboardResponse };
export type FactionType = PokedBotsRacing.FactionType;

const PAGE_SIZE = 25;

/**
 * React Query hook to fetch the monthly leaderboard with infinite scrolling.
 */
export const useGetMonthlyLeaderboard = (bracket?: PokedBotsRacing.RaceClass) => {
  return useInfiniteQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', 'monthly', bracket],
    queryFn: async ({ pageParam = 0 }) => {
      return getMonthlyLeaderboard(PAGE_SIZE, pageParam as number, bracket);
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + page.entries.length, 0);
      return lastPage.hasMore ? loadedCount : undefined;
    },
    initialPageParam: 0,
  });
};

/**
 * React Query hook to fetch the season leaderboard with infinite scrolling.
 */
export const useGetSeasonLeaderboard = (bracket?: PokedBotsRacing.RaceClass) => {
  return useInfiniteQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', 'season', bracket],
    queryFn: async ({ pageParam = 0 }) => {
      return getSeasonLeaderboard(PAGE_SIZE, pageParam as number, bracket);
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + page.entries.length, 0);
      return lastPage.hasMore ? loadedCount : undefined;
    },
    initialPageParam: 0,
  });
};

/**
 * React Query hook to fetch the all-time leaderboard with infinite scrolling.
 */
export const useGetAllTimeLeaderboard = (bracket?: PokedBotsRacing.RaceClass) => {
  return useInfiniteQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', 'alltime', bracket],
    queryFn: async ({ pageParam = 0 }) => {
      return getAllTimeLeaderboard(PAGE_SIZE, pageParam as number, bracket);
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + page.entries.length, 0);
      return lastPage.hasMore ? loadedCount : undefined;
    },
    initialPageParam: 0,
  });
};

/**
 * React Query hook to fetch a faction leaderboard with infinite scrolling.
 */
export const useGetFactionLeaderboard = (faction: FactionType, bracket?: PokedBotsRacing.RaceClass) => {
  return useInfiniteQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', 'faction', faction, bracket],
    queryFn: async ({ pageParam = 0 }) => {
      return getFactionLeaderboard(faction, PAGE_SIZE, pageParam as number, bracket);
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + page.entries.length, 0);
      return lastPage.hasMore ? loadedCount : undefined;
    },
    initialPageParam: 0,
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
