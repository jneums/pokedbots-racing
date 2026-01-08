import { Identity } from '@icp-sdk/core/agent';
import { PokedBotsRacing } from '@pokedbots-racing/declarations';
export type LeaderboardEntry = PokedBotsRacing.LeaderboardEntry;
export type LeaderboardType = PokedBotsRacing.LeaderboardType;
export interface LeaderboardResponse {
    entries: LeaderboardEntry[];
    total: number;
    hasMore: boolean;
}
export interface PlatformStats {
    totalRacers: number;
    totalRaces: number;
    totalWins: number;
    totalEarnings: number;
}
/**
 * Gets platform-wide statistics from the all-time leaderboard.
 * @param identity Optional identity to use for the actor
 * @returns Platform statistics including total racers, races, wins, and earnings
 */
export declare const getPlatformStats: (identity?: Identity) => Promise<PlatformStats>;
/**
 * Fetches the leaderboard for a specific type (Monthly, Season, AllTime, Faction, or Division) with pagination.
 * @param lbType The type of leaderboard to fetch
 * @param limit Maximum number of entries to return (default: 50)
 * @param offset Starting position for pagination (default: 0)
 * @param bracket Optional race class/bracket filter
 * @param identity Optional identity to use for the actor
 * @returns LeaderboardResponse with entries, total count, and hasMore flag
 */
export declare const getLeaderboard: (lbType: LeaderboardType, limit?: number, offset?: number, bracket?: PokedBotsRacing.RaceClass, identity?: Identity) => Promise<LeaderboardResponse>;
/**
 * Fetches the ranking for a specific bot on a given leaderboard.
 * @param lbType The type of leaderboard to query
 * @param tokenIndex The token index of the bot
 * @param identity Optional identity to use for the actor
 * @returns The LeaderboardEntry for the bot, or null if not found
 */
export declare const getMyRanking: (lbType: LeaderboardType, tokenIndex: number, identity?: Identity) => Promise<LeaderboardEntry | null>;
/**
 * Gets the current season and month IDs from the backend.
 * @param identity Optional identity to use for the actor
 */
export declare const getCurrentPeriods: (identity?: Identity) => Promise<{
    seasonId: bigint;
    monthId: bigint;
}>;
/**
 * Gets the monthly leaderboard (current month).
 * @param limit Maximum number of entries to return
 * @param offset Starting position for pagination
 * @param bracket Optional race class/bracket filter
 * @param identity Optional identity to use for the actor
 */
export declare const getMonthlyLeaderboard: (limit?: number, offset?: number, bracket?: PokedBotsRacing.RaceClass, identity?: Identity) => Promise<LeaderboardResponse>;
/**
 * Gets the season leaderboard (current season).
 * @param limit Maximum number of entries to return
 * @param offset Starting position for pagination
 * @param bracket Optional race class/bracket filter
 * @param identity Optional identity to use for the actor
 */
export declare const getSeasonLeaderboard: (limit?: number, offset?: number, bracket?: PokedBotsRacing.RaceClass, identity?: Identity) => Promise<LeaderboardResponse>;
/**
 * Gets the all-time leaderboard.
 * @param limit Maximum number of entries to return
 * @param offset Starting position for pagination
 * @param bracket Optional race class/bracket filter
 * @param identity Optional identity to use for the actor
 */
export declare const getAllTimeLeaderboard: (limit?: number, offset?: number, bracket?: PokedBotsRacing.RaceClass, identity?: Identity) => Promise<LeaderboardResponse>;
/**
 * Gets the faction leaderboard for a specific faction.
 * @param faction The faction to get the leaderboard for
 * @param limit Maximum number of entries to return
 * @param offset Starting position for pagination
 * @param bracket Optional race class/bracket filter
 * @param identity Optional identity to use for the actor
 */
export declare const getFactionLeaderboard: (faction: PokedBotsRacing.FactionType, limit?: number, offset?: number, bracket?: PokedBotsRacing.RaceClass, identity?: Identity) => Promise<LeaderboardResponse>;
//# sourceMappingURL=leaderboard.api.d.ts.map