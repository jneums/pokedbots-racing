import { Identity } from '@icp-sdk/core/agent';
import { PokedBotsRacing } from '@pokedbots-racing/declarations';
export type LeaderboardEntry = PokedBotsRacing.LeaderboardEntry;
export type LeaderboardType = PokedBotsRacing.LeaderboardType;
/**
 * Fetches the leaderboard for a specific type (Monthly, Season, AllTime, Faction, or Division).
 * @param lbType The type of leaderboard to fetch
 * @param limit Maximum number of entries to return
 * @param identity Optional identity to use for the actor
 * @returns An array of LeaderboardEntry objects, sorted by rank
 */
export declare const getLeaderboard: (lbType: LeaderboardType, limit?: number, identity?: Identity) => Promise<LeaderboardEntry[]>;
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
 * @param identity Optional identity to use for the actor
 */
export declare const getMonthlyLeaderboard: (limit?: number, identity?: Identity) => Promise<LeaderboardEntry[]>;
/**
 * Gets the season leaderboard (current season).
 * @param limit Maximum number of entries to return
 * @param identity Optional identity to use for the actor
 */
export declare const getSeasonLeaderboard: (limit?: number, identity?: Identity) => Promise<LeaderboardEntry[]>;
/**
 * Gets the all-time leaderboard.
 * @param limit Maximum number of entries to return
 * @param identity Optional identity to use for the actor
 */
export declare const getAllTimeLeaderboard: (limit?: number, identity?: Identity) => Promise<LeaderboardEntry[]>;
/**
 * Gets the faction leaderboard for a specific faction.
 * @param faction The faction to get the leaderboard for
 * @param limit Maximum number of entries to return
 * @param identity Optional identity to use for the actor
 */
export declare const getFactionLeaderboard: (faction: PokedBotsRacing.FactionType, limit?: number, identity?: Identity) => Promise<LeaderboardEntry[]>;
//# sourceMappingURL=leaderboard.api.d.ts.map