// packages/libs/ic-js/src/api/leaderboard.api.ts
import { getRacingActor } from '../actors.js';
/**
 * Fetches the leaderboard for a specific type (Monthly, Season, AllTime, Faction, or Division).
 * @param lbType The type of leaderboard to fetch
 * @param limit Maximum number of entries to return
 * @param identity Optional identity to use for the actor
 * @returns An array of LeaderboardEntry objects, sorted by rank
 */
export const getLeaderboard = async (lbType, limit = 100, identity) => {
    const racingActor = await getRacingActor(identity);
    const result = await racingActor.get_leaderboard(lbType, BigInt(limit));
    return result;
};
/**
 * Fetches the ranking for a specific bot on a given leaderboard.
 * @param lbType The type of leaderboard to query
 * @param tokenIndex The token index of the bot
 * @param identity Optional identity to use for the actor
 * @returns The LeaderboardEntry for the bot, or null if not found
 */
export const getMyRanking = async (lbType, tokenIndex, identity) => {
    const racingActor = await getRacingActor(identity);
    const result = await racingActor.get_my_ranking(lbType, BigInt(tokenIndex));
    return result.length > 0 ? (result[0] ?? null) : null;
};
/**
 * Gets the current season and month IDs from the backend.
 * @param identity Optional identity to use for the actor
 */
export const getCurrentPeriods = async (identity) => {
    const racingActor = await getRacingActor(identity);
    return await racingActor.get_current_periods();
};
/**
 * Gets the monthly leaderboard (current month).
 * @param limit Maximum number of entries to return
 * @param identity Optional identity to use for the actor
 */
export const getMonthlyLeaderboard = async (limit = 50, identity) => {
    const { monthId } = await getCurrentPeriods(identity);
    return getLeaderboard({ Monthly: monthId }, limit, identity);
};
/**
 * Gets the season leaderboard (current season).
 * @param limit Maximum number of entries to return
 * @param identity Optional identity to use for the actor
 */
export const getSeasonLeaderboard = async (limit = 50, identity) => {
    const { seasonId } = await getCurrentPeriods(identity);
    return getLeaderboard({ Season: seasonId }, limit, identity);
};
/**
 * Gets the all-time leaderboard.
 * @param limit Maximum number of entries to return
 * @param identity Optional identity to use for the actor
 */
export const getAllTimeLeaderboard = async (limit = 100, identity) => {
    return getLeaderboard({ AllTime: null }, limit, identity);
};
/**
 * Gets the faction leaderboard for a specific faction.
 * @param faction The faction to get the leaderboard for
 * @param limit Maximum number of entries to return
 * @param identity Optional identity to use for the actor
 */
export const getFactionLeaderboard = async (faction, limit = 50, identity) => {
    return getLeaderboard({ Faction: faction }, limit, identity);
};
