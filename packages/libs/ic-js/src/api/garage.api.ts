// packages/libs/ic-js/src/api/garage.api.ts

import { type Identity, Actor, HttpAgent } from '@icp-sdk/core/agent';
import { getRacingActor, getNFTsActor } from '../actors.js';
import { PokedBotsRacing, PokedBotsNFTs } from '@pokedbots-racing/declarations';
import { Principal } from '@icp-sdk/core/principal';
import { getCanisterId, getHost } from '../config.js';
import { approveICRC2 } from './ledger.api.js';
import { sha224 } from 'js-sha256';

// Re-export types - use inline types to avoid version conflicts
export type UpgradeType = { velocity: null } | { powerCore: null } | { thruster: null } | { gyro: null };
export type PaymentMethod = { icp: null } | { parts: null };

// Accept either Identity or Plug agent (which has call/getPrincipal methods)
type IdentityOrAgent = Identity | any;

// Helper function to detect if this is a Plug agent
// Plug agents are HttpAgent instances with specific structure, not standard Identity objects
function isPlugAgent(identityOrAgent: any): boolean {
  // Plug agents have 'agent' property and are not standard Identity objects
  // Standard Identity objects from AuthClient don't have nested 'agent' property
  return identityOrAgent && 
         typeof identityOrAgent === 'object' && 
         'agent' in identityOrAgent &&
         'getPrincipal' in identityOrAgent &&
         typeof identityOrAgent.getPrincipal === 'function';
}

// Helper to get racing actor from Identity or Plug agent
// For Plug users, we use pre-created actors from login to avoid duplicate requests
async function getActor(identityOrAgent: IdentityOrAgent): Promise<PokedBotsRacing._SERVICE> {
  // Check if this is a Plug user with pre-created actors
  if (isPlugAgent(identityOrAgent) && (identityOrAgent as any)._plugRacingActor) {
    console.log('[getActor] Using pre-created Plug racing actor');
    return (identityOrAgent as any)._plugRacingActor;
  }
  
  // Fallback: standard Identity
  return getRacingActor(identityOrAgent as Identity);
}// Helper to get NFTs actor from Identity or Plug agent
// For Plug users, we use pre-created actors from login to avoid duplicate requests
async function getNFTsActorFromAgent(identityOrAgent: IdentityOrAgent): Promise<PokedBotsNFTs._SERVICE> {
  // Check if this is a Plug user with pre-created actors
  if (isPlugAgent(identityOrAgent) && (identityOrAgent as any)._plugNFTsActor) {
    console.log('[getNFTsActor] Using pre-created Plug NFTs actor');
    return (identityOrAgent as any)._plugNFTsActor;
  }
  
  // Fallback: standard Identity
  return getNFTsActor(identityOrAgent as Identity);
}

// Response types
export interface BotListItem {
  tokenIndex: bigint;
  isInitialized: boolean;
  name: string | undefined;
  currentOwner: string;
  stats: any | undefined;
  currentStats?: {
    speed: bigint;
    powerCore: bigint;
    acceleration: bigint;
    stability: bigint;
  };
  maxStats?: {
    speed: bigint;
    powerCore: bigint;
    acceleration: bigint;
    stability: bigint;
  };
  upgradeCostsV2?: {
    speed: { costE8s: bigint; successRate: number };
    powerCore: { costE8s: bigint; successRate: number };
    acceleration: { costE8s: bigint; successRate: number };
    stability: { costE8s: bigint; successRate: number };
    pityCounter: bigint;
  };
  dedicationBonuses?: {
    speed: bigint;
    powerCore: bigint;
    acceleration: bigint;
    stability: bigint;
  };
  isListed?: boolean;
  listPrice?: number;
  activeUpgrade?: any;
  activeMission?: {
    missionId: bigint;
    tokenIndex: bigint;
    zone: { ScrapHeaps: null } | { AbandonedSettlements: null } | { DeadMachineFields: null } | { RepairBay: null } | { ChargingStation: null };
    startTime: bigint;
    lastAccumulation: bigint;
    durationMinutes: [] | [bigint];
    pendingParts: {
      speedChips: bigint;
      powerCoreFragments: bigint;
      thrusterKits: bigint;
      gyroModules: bigint;
      universalParts: bigint;
    };
    pendingConditionRestored: bigint;
    pendingBatteryRestored: bigint;
  };
  upcomingRaces?: Array<{
    raceId: number;
    name: string;
    startTime: bigint;
    entryDeadline: bigint;
    entryFee: bigint;
    terrain: any;
  }>;
  eligibleRaces?: Array<{
    raceId: number;
    name: string;
    startTime: bigint;
    entryDeadline: bigint;
    entryFee: bigint;
    terrain: any;
  }>;
  worldBuff?: {
    appliedAt: bigint;
    expiresAt: bigint;
    stats: Array<[string, bigint]>;
  };
}

export interface BotDetailsResponse {
  stats: any | null;
  baseStats: {
    speed: bigint;
    powerCore: bigint;
    acceleration: bigint;
    stability: bigint;
  };
  isOwner: boolean;
  isInitialized: boolean;
  currentCondition: [] | [bigint]; // Candid opt type
  currentBattery: [] | [bigint]; // Candid opt type
  activeUpgrade: [] | [any]; // Candid opt type
  upgradeCosts: [] | [{
    Velocity: { icp: bigint; parts: bigint };
    PowerCore: { icp: bigint; parts: bigint };
    Thruster: { icp: bigint; parts: bigint };
    Gyro: { icp: bigint; parts: bigint };
  }]; // Candid opt type
}

export interface DedicationInfo {
  tier: number;
  tierName: string;
  totalDP: number;
  investmentDP: number;
  activityDP: number;
  totalInvestedICP: number;
  nextTierDP: number | null;
  nextTierName: string | null;
  progressPercent: number;
  benefits: {
    speedBonus: number;
    accelerationBonus: number;
    powerCoreBonus: number;
    stabilityBonus: number;
    terrainBonusPercent: number;
    scavengingYieldMult: number;
    upgradeDiscountMult: number;
    rechargeCooldownMult: number;
    repairCooldownMult: number;
  };
}

/**
 * List all PokedBots registered in the garage (QUERY - fast, no inter-canister calls).
 * Returns only bots that have been initialized for racing.
 * @param identity Required identity for authentication
 * @returns Array of registered bot information
 */
export const listMyRegisteredBots = async (identityOrAgent: IdentityOrAgent): Promise<BotListItem[]> => {
  const racingActor = await getActor(identityOrAgent);
  const nftsActor = await getNFTsActorFromAgent(identityOrAgent);
  
  const result = await racingActor.web_list_my_registered_bots();
  
  // Get user's principal to verify ownership
  let userPrincipal: any;
  if (identityOrAgent && typeof identityOrAgent === 'object' && 'getPrincipal' in identityOrAgent) {
    userPrincipal = await identityOrAgent.getPrincipal();
  } else {
    userPrincipal = (identityOrAgent as any).getPrincipal();
  }
  
  // Convert principal to account identifier for EXT canister
  const accountId = principalToAccountIdentifier(userPrincipal);
  
  // Get actual tokens owned by the user from EXT canister
  const tokensResult = await nftsActor.tokens(accountId);
  const ownedTokenIndices = new Set<number>();
  
  if ('ok' in tokensResult && tokensResult.ok) {
    tokensResult.ok.forEach((tokenIndex: number) => {
      ownedTokenIndices.add(Number(tokenIndex));
    });
  }
  
  // Get all marketplace listings to check if any of our bots are listed
  let listingsMap = new Map<number, { price: number }>();
  try {
    const allListings = await nftsActor.listings();
    allListings.forEach(([tokenIndex32, listing, _metadata]: any) => {
      const tokenIndex = Number(tokenIndex32);
      const priceICP = Number(listing.price) / 100_000_000;
      listingsMap.set(tokenIndex, { price: priceICP });
    });
  } catch (err) {
    console.warn('Failed to fetch listings:', err);
  }
  
  // Filter to only include bots that the user actually owns
  return result
    .filter(bot => {
      const tokenIndex = Number(bot.tokenIndex);
      return ownedTokenIndices.has(tokenIndex);
    })
    .map(bot => {
      const tokenIndex = Number(bot.tokenIndex);
      const listingInfo = listingsMap.get(tokenIndex);
      
      // Extract activeMission from stats
      const activeMission = bot.stats.activeMission && bot.stats.activeMission.length > 0 
        ? bot.stats.activeMission[0] 
        : undefined;
      
      return {
        tokenIndex: bot.tokenIndex,
        isInitialized: true, // All registered bots are initialized
        name: bot.name.length > 0 ? bot.name[0] : undefined,
        currentOwner: bot.stats.ownerPrincipal.toText(),
        stats: bot.stats,
        currentStats: bot.currentStats,
        maxStats: bot.maxStats,
        upgradeCostsV2: bot.upgradeCostsV2,
        isListed: !!listingInfo,
        listPrice: listingInfo?.price,
        activeUpgrade: bot.activeUpgrade.length > 0 ? bot.activeUpgrade[0] : undefined,
        activeMission,
        upcomingRaces: bot.upcomingRaces.map(race => ({
          raceId: Number(race.raceId),
          name: race.name,
          startTime: race.startTime,
          entryDeadline: race.entryDeadline,
          entryFee: race.entryFee,
          terrain: race.terrain,
        })).sort((a, b) => Number(a.startTime - b.startTime)),
        eligibleRaces: bot.eligibleRaces.map(race => ({
          raceId: Number(race.raceId),
          name: race.name,
          startTime: race.startTime,
          entryDeadline: race.entryDeadline,
          entryFee: race.entryFee,
          terrain: race.terrain,
        })).sort((a, b) => Number(a.startTime - b.startTime)),
      };
    });
};

/**
 * List all PokedBots owned by the authenticated user (UPDATE - slow, calls EXT canister).
 * Also checks EXT canister for listing status.
 * @param identity Required identity for authentication
 * @returns Array of bot information with optional stats (if initialized)
 */
export const listMyBots = async (identityOrAgent: IdentityOrAgent): Promise<BotListItem[]> => {
  const racingActor = await getActor(identityOrAgent);
  const nftsActor = await getNFTsActorFromAgent(identityOrAgent);
  
  const result = await racingActor.web_list_my_bots();
  
  // Get all marketplace listings to check if any of our bots are listed
  let listingsMap = new Map<number, { price: number }>();
  try {
    const allListings = await nftsActor.listings();
    allListings.forEach(([tokenIndex32, listing, _metadata]: any) => {
      const tokenIndex = Number(tokenIndex32);
      const priceICP = Number(listing.price) / 100_000_000;
      listingsMap.set(tokenIndex, { price: priceICP });
    });
  } catch (err) {
    console.warn('Failed to fetch listings:', err);
  }
  
  // Convert optional arrays to optional values and add listing info
  return result.map(bot => {
    const tokenIndex = Number(bot.tokenIndex);
    const listingInfo = listingsMap.get(tokenIndex);
    
    // Extract activeMission from stats if available
    const stats = bot.stats.length > 0 ? bot.stats[0] : undefined;
    const activeMission = stats && stats.activeMission && stats.activeMission.length > 0 ? stats.activeMission[0] : undefined;
    
    // Debug logging for bot #5972
    if (tokenIndex === 5972) {
      console.log('🔬 listMyBots parsing bot #5972:');
      console.log('  - bot.stats:', bot.stats);
      console.log('  - stats:', stats);
      console.log('  - stats?.activeMission:', stats?.activeMission);
      console.log('  - activeMission extracted:', activeMission);
    }
    
    // Extract currentStats and maxStats from backend response
    const currentStats = bot.currentStats.length > 0 ? bot.currentStats[0] : undefined;
    const maxStats = bot.maxStats.length > 0 ? bot.maxStats[0] : undefined;
    
    // Extract upgradeCostsV2 from backend response
    const upgradeCostsV2 = bot.upgradeCostsV2.length > 0 ? bot.upgradeCostsV2[0] : undefined;
    
    return {
      tokenIndex: bot.tokenIndex,
      isInitialized: bot.isInitialized,
      name: bot.name.length > 0 ? bot.name[0] : undefined,
      currentOwner: bot.currentOwner,
      stats,
      currentStats,
      maxStats,
      upgradeCostsV2,
      isListed: !!listingInfo,
      listPrice: listingInfo?.price,
      activeUpgrade: bot.activeUpgrade.length > 0 ? bot.activeUpgrade[0] : undefined,
      activeMission,
      upcomingRaces: bot.upcomingRaces.map(race => ({
        raceId: Number(race.raceId),
        name: race.name,
        startTime: race.startTime,
        entryDeadline: race.entryDeadline,
        entryFee: race.entryFee,
        terrain: race.terrain,
      })).sort((a, b) => Number(a.startTime - b.startTime)),
      eligibleRaces: bot.eligibleRaces.map(race => ({
        raceId: Number(race.raceId),
        name: race.name,
        startTime: race.startTime,
        entryDeadline: race.entryDeadline,
        entryFee: race.entryFee,
        terrain: race.terrain,
      })).sort((a, b) => Number(a.startTime - b.startTime)),
    };
  });
};

/**
 * Initialize a PokedBot for racing (one-time registration).
 * Requires 0.1 ICP + 0.0001 ICP fee payment via ICRC-2.
 * This function handles the approval automatically.
 * @param tokenIndex The token index of the bot to initialize
 * @param name Optional custom name for the bot
 * @param identity Required identity for authentication
 * @returns Success message or error
 */
export const initializeBot = async (
  tokenIndex: number,
  name: string | undefined,
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_initialize_bot(
    BigInt(tokenIndex),
    name ? [name] : []
  );
  
  if ('ok' in result) {
    return result.ok;
  } else {
    throw new Error(result.err);
  }
};

/**
 * Get detailed information about a specific bot.
 * @param tokenIndex The token index of the bot
 * @param identity Required identity for authentication
 * @returns Detailed bot stats and upgrade costs
 */
export const getBotDetails = async (
  tokenIndex: number,
  identityOrAgent: IdentityOrAgent
): Promise<BotDetailsResponse> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_get_bot_details(BigInt(tokenIndex));
  
  if ('ok' in result) {
    return result.ok as unknown as BotDetailsResponse;
  } else {
    throw new Error(result.err);
  }
};

/**
 * Get dedication info for a specific bot (QUERY - fast).
 * Shows tier, dedication points, benefits, and progress to next tier.
 * @param tokenIndex The token index of the bot
 * @returns Dedication info including tier, DP, and benefits
 */
export const getDedicationInfo = async (
  tokenIndex: number
): Promise<DedicationInfo> => {
  // Use anonymous actor for query call (no auth needed)
  const racingActor = await getRacingActor();
  const result = await racingActor.web_get_dedication_info(BigInt(tokenIndex));
  
  return {
    tier: Number(result.tier),
    tierName: result.tierName,
    totalDP: Number(result.totalDP),
    investmentDP: Number(result.investmentDP),
    activityDP: Number(result.activityDP),
    totalInvestedICP: result.totalInvestedICP,
    nextTierDP: result.nextTierDP.length > 0 ? Number(result.nextTierDP[0]) : null,
    nextTierName: result.nextTierName.length > 0 ? result.nextTierName[0] ?? null : null,
    progressPercent: Number(result.progressPercent),
    benefits: {
      speedBonus: Number(result.benefits.speedBonus),
      accelerationBonus: Number(result.benefits.accelerationBonus),
      powerCoreBonus: Number(result.benefits.powerCoreBonus),
      stabilityBonus: Number(result.benefits.stabilityBonus),
      terrainBonusPercent: Number(result.benefits.terrainBonusPercent),
      scavengingYieldMult: result.benefits.scavengingYieldMult,
      upgradeDiscountMult: result.benefits.upgradeDiscountMult,
      rechargeCooldownMult: result.benefits.rechargeCooldownMult,
      repairCooldownMult: result.benefits.repairCooldownMult,
    },
  };
};

/**
 * Recharge a bot's battery using ICRC-2 payment (0.1 ICP + 0.0001 fee).
 * Automatically handles ICRC-2 approval.
 * @param tokenIndex The token index of the bot
 * @param identity Required identity for authentication
 * @returns Success message or error
 */
export const rechargeBot = async (
  tokenIndex: number,
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_recharge_bot(BigInt(tokenIndex));
  
  if ('ok' in result) {
    return result.ok;
  } else {
    throw new Error(result.err);
  }
};

/**
 * Repair a bot's condition using ICRC-2 payment (0.05 ICP + 0.0001 fee).
 * Automatically handles ICRC-2 approval.
 * @param tokenIndex The token index of the bot
 * @param identity Required identity for authentication
 * @returns Success message or error
 */
export const repairBot = async (
  tokenIndex: number,
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_repair_bot(BigInt(tokenIndex));
  
  if ('ok' in result) {
    return result.ok;
  } else {
    throw new Error(result.err);
  }
};

/**
 * Full maintenance - combines recharge and repair in a single transaction (0.15 ICP + 0.0001 fee).
 * Automatically handles ICRC-2 approval.
 * @param tokenIndex The token index of the bot
 * @param identity Required identity for authentication
 * @returns Success message or error
 */
export const fullMaintenanceBot = async (
  tokenIndex: number,
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_full_maintenance(BigInt(tokenIndex));
  
  if ('ok' in result) {
    return result.ok;
  } else {
    throw new Error(result.err);
  }
};

/**
 * Get user's starred bots (favorites)
 * @param identity Required identity for authentication
 * @returns Array of token indices
 */
export const getStarredBots = async (
  identityOrAgent: IdentityOrAgent
): Promise<number[]> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_get_starred_bots();
  return result.map(n => Number(n));
};

/**
 * Set user's starred bots (favorites) - replaces entire list
 * @param tokenIndices Array of token indices to star
 * @param identity Required identity for authentication
 * @returns Success message or error
 */
export const setStarredBots = async (
  tokenIndices: number[],
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_set_starred_bots(tokenIndices.map(n => BigInt(n)));
  
  if ('ok' in result) {
    return result.ok;
  } else {
    throw new Error(result.err);
  }
};

/**
 * Get user's bots tagged as racers
 * @param identity Required identity for authentication
 * @returns Array of token indices
 */
export const getRacerBots = async (
  identityOrAgent: IdentityOrAgent
): Promise<number[]> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_get_racer_bots();
  return result.map(n => Number(n));
};

/**
 * Set user's bots tagged as racers - replaces entire list
 * @param tokenIndices Array of token indices to tag as racers
 * @param identity Required identity for authentication
 * @returns Success message or error
 */
export const setRacerBots = async (
  tokenIndices: number[],
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_set_racer_bots(tokenIndices.map(n => BigInt(n)));
  
  if ('ok' in result) {
    return result.ok;
  } else {
    throw new Error(result.err);
  }
};

/**
 * Get user's bots tagged as scavengers
 * @param identity Required identity for authentication
 * @returns Array of token indices
 */
export const getScavengerBots = async (
  identityOrAgent: IdentityOrAgent
): Promise<number[]> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_get_scavenger_bots();
  return result.map(n => Number(n));
};

/**
 * Set user's bots tagged as scavengers - replaces entire list
 * @param tokenIndices Array of token indices to tag as scavengers
 * @param identity Required identity for authentication
 * @returns Success message or error
 */
export const setScavengerBots = async (
  tokenIndices: number[],
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_set_scavenger_bots(tokenIndices.map(n => BigInt(n)));
  
  if ('ok' in result) {
    return result.ok;
  } else {
    throw new Error(result.err);
  }
};

/**
 * Batch recharge multiple bots with a single ICRC-2 payment.
 * Cost: 0.1 ICP per bot + 0.0001 ICP fee (total)
 * @param tokenIndices Array of token indices to recharge
 * @param identityOrAgent Required identity for authentication
 * @returns Array of results for each bot (success message or error)
 */
export const batchRechargeBots = async (
  tokenIndices: number[],
  identityOrAgent: IdentityOrAgent
): Promise<Array<{ tokenIndex: number; result: { ok?: string; err?: string } }>> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_batch_recharge_bots(tokenIndices.map(BigInt));
  
  return result.map(item => ({
    tokenIndex: Number(item.tokenIndex),
    result: 'ok' in item.result ? { ok: item.result.ok } : { err: item.result.err }
  }));
};

/**
 * Batch repair multiple bots with a single ICRC-2 payment.
 * Cost: 0.05 ICP per bot + 0.0001 ICP fee (total)
 * @param tokenIndices Array of token indices to repair
 * @param identityOrAgent Required identity for authentication
 * @returns Array of results for each bot (success message or error)
 */
export const batchRepairBots = async (
  tokenIndices: number[],
  identityOrAgent: IdentityOrAgent
): Promise<Array<{ tokenIndex: number; result: { ok?: string; err?: string } }>> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_batch_repair_bots(tokenIndices.map(BigInt));
  
  return result.map(item => ({
    tokenIndex: Number(item.tokenIndex),
    result: 'ok' in item.result ? { ok: item.result.ok } : { err: item.result.err }
  }));
};

/**
 * Batch start scavenging missions for multiple bots to the same zone.
 * No ICP cost - only battery/condition consumption during mission.
 * @param tokenIndices Array of token indices to send scavenging
 * @param zone Scavenging zone name (e.g., 'ScrapHeaps', 'AbandonedSettlements')
 * @param durationMinutes Optional duration in minutes (omit for continuous mission)
 * @param identityOrAgent Required identity for authentication
 * @returns Array of results for each bot (success message or error)
 */
export const batchStartScavenging = async (
  tokenIndices: number[],
  zone: string,
  durationMinutes: number | undefined,
  identityOrAgent: IdentityOrAgent
): Promise<Array<{ tokenIndex: number; result: { ok?: string; err?: string } }>> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_batch_start_scavenging(
    tokenIndices.map(BigInt),
    zone,
    durationMinutes ? [BigInt(durationMinutes)] : []
  );
  
  return result.map(item => ({
    tokenIndex: Number(item.tokenIndex),
    result: 'ok' in item.result ? { ok: item.result.ok } : { err: item.result.err }
  }));
};

/**
 * Batch complete scavenging missions for multiple bots.
 * Retrieves bots and awards accumulated parts/rewards.
 * @param tokenIndices Array of token indices to retrieve from scavenging
 * @param identityOrAgent Required identity for authentication
 * @returns Array of results for each bot (success message with parts collected or error)
 */
export const batchCompleteScavenging = async (
  tokenIndices: number[],
  identityOrAgent: IdentityOrAgent
): Promise<Array<{ tokenIndex: number; result: { ok?: string; err?: string } }>> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_batch_complete_scavenging(tokenIndices.map(BigInt));
  
  return result.map(item => ({
    tokenIndex: Number(item.tokenIndex),
    result: 'ok' in item.result ? { ok: item.result.ok } : { err: item.result.err }
  }));
};

/**
 * Upgrade a bot's stat using ICP or parts payment.
 * For ICP: Automatically handles ICRC-2 approval.
 * For parts: Parts are deducted from inventory.
 * @param tokenIndex The token index of the bot
 * @param upgradeType The type of upgrade (Velocity, PowerCore, Thruster, Gyro)
 * @param paymentMethod Payment method: 'icp' or 'parts'
 * @param identity Required identity for authentication
 * @returns Success message or error
 */
export const upgradeBot = async (
  tokenIndex: number,
  upgradeType: UpgradeType,
  paymentMethod: 'icp' | 'parts',
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const racingActor = await getActor(identityOrAgent);

  if (paymentMethod === 'icp') {
    // Get bot details to know upgrade cost
    const detailsResult = await racingActor.web_get_bot_details(BigInt(tokenIndex));
    if (!detailsResult || !('ok' in detailsResult)) {
      throw new Error('Bot not found');
    }
    const details = detailsResult.ok;
    
    // Get upgrade cost based on type
    let upgradeCost: bigint;
    const upgradeCostsOpt = details.upgradeCosts;
    
    // Handle optional upgradeCosts (Candid opt type returns [] or [value])
    if (!upgradeCostsOpt || (Array.isArray(upgradeCostsOpt) && upgradeCostsOpt.length === 0)) {
      throw new Error('Bot not initialized for racing');
    }
    
    const upgradeCosts = Array.isArray(upgradeCostsOpt) ? upgradeCostsOpt[0] : upgradeCostsOpt;
    
    // Handle the UpgradeType variant structure
    if ('Velocity' in upgradeType) {
      upgradeCost = upgradeCosts.Velocity.icp;
    } else if ('PowerCore' in upgradeType) {
      upgradeCost = upgradeCosts.PowerCore.icp;
    } else if ('Thruster' in upgradeType) {
      upgradeCost = upgradeCosts.Thruster.icp;
    } else if ('Gyro' in upgradeType) {
      upgradeCost = upgradeCosts.Gyro.icp;
    } else {
      throw new Error('Invalid upgrade type');
    }

  }
  const payment: PaymentMethod = paymentMethod === 'icp' ? { icp: null } : { parts: null };
  
  const result = await racingActor.web_upgrade_bot(
    BigInt(tokenIndex),
    upgradeType as any,
    payment
  );
  
  if ('ok' in result) {
    return result.ok;
  } else {
    throw new Error(result.err);
  }
};

/**
 * Cancel an in-progress upgrade and receive a full refund.
 * ICP refunds will be sent to your wallet (minus transfer fee).
 * Parts refunds will be added back to your inventory.
 * @param tokenIndex The token index of the bot with the active upgrade
 * @param identityOrAgent Required identity for authentication
 * @returns Success message or error
 */
export const cancelUpgrade = async (
  tokenIndex: number,
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_cancel_upgrade(BigInt(tokenIndex));
  
  if ('ok' in result) {
    return result.ok;
  } else {
    throw new Error(result.err);
  }
};

/**
 * Strip a bot to reset selected upgrade bonuses and refund parts (with 40% penalty).
 * Cost: 1 ICP (flat rate)
 * This function automatically handles the ICRC-2 approval before stripping.
 * Preserves: Pity counter, non-selected stats
 * Resets: Selected stat bonuses and upgrade counts
 * Refunds: 60% of parts invested in selected stats (40% penalty)
 * @param tokenIndex The token index of the bot to strip
 * @param statsToStrip Array of stat names to reset (e.g., ['speed', 'powerCore']). Empty array strips all stats.
 * @param identityOrAgent Required identity for authentication
 * @returns Success message with refund details or error
 */
export const respecBot = async (
  tokenIndex: number,
  statsToStrip: string[],
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_respec_bot(BigInt(tokenIndex), statsToStrip);
  
  if ('ok' in result) {
    const refund = result.ok;
    const cost = Number(refund.respecCost) / 100_000_000;
    const total = Number(refund.totalRefunded);
    const speed = Number(refund.speedPartsRefunded);
    const power = Number(refund.powerCorePartsRefunded);
    const accel = Number(refund.accelerationPartsRefunded);
    const stab = Number(refund.stabilityPartsRefunded);
    
    const strippedStats = statsToStrip.length === 0 ? 'All stats' : statsToStrip.join(', ');
    return `Bot stripped! Cost: ${cost} ICP. Refunded ${total} parts (${speed} Speed, ${power} Power, ${accel} Accel, ${stab} Stability). Stripped: ${strippedStats}.`;
  } else {
    throw new Error(result.err);
  }
};

/**
 * Enter a race with ICRC-2 payment for entry fee.
 * This function automatically handles the ICRC-2 approval before entering.
 * @param raceId The ID of the race to enter
 * @param tokenIndex The token index of the bot to enter
 * @param identity Required identity for authentication
 * @returns Success message or error
 */
export const enterRace = async (
  raceId: number,
  tokenIndex: number,
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const racingActor = await getActor(identityOrAgent);
  
  const result = await racingActor.web_enter_race(
    BigInt(raceId),
    BigInt(tokenIndex)
  );
  
  if ('ok' in result) {
    return result.ok;
  } else {
    throw new Error(result.err);
  }
};

/**
 * Get user's parts inventory
 * @param identity Required identity for authentication
 * @returns User inventory with parts counts
 */
export const getUserInventory = async (
  identityOrAgent: IdentityOrAgent
): Promise<{
  owner: string;
  speedChips: bigint;
  powerCoreFragments: bigint;
  thrusterKits: bigint;
  gyroModules: bigint;
  universalParts: bigint;
}> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_get_user_inventory();
  return result as any;
};

/**
 * Get collection bonuses (faction synergies) for the authenticated user
 * @param identity Required identity for authentication
 * @returns Collection bonuses including stat boosts, cost reductions, and yield increases
 */
export const getCollectionBonuses = async (
  identityOrAgent: IdentityOrAgent
): Promise<{
  statBonuses: { speed: number; powerCore: number; acceleration: number; stability: number };
  costMultipliers: { repair: number; upgrade: number; rechargeCooldown: number };
  yieldMultipliers: { parts: number; prizes: number };
  drainMultipliers: { scavenging: number };
}> => {
  const racingActor = await getActor(identityOrAgent);
  const result = await racingActor.web_get_collection_bonuses();
  
  // Convert bigints to numbers for easier JS usage
  return {
    statBonuses: {
      speed: Number(result.statBonuses.speed),
      powerCore: Number(result.statBonuses.powerCore),
      acceleration: Number(result.statBonuses.acceleration),
      stability: Number(result.statBonuses.stability)
    },
    costMultipliers: {
      repair: Number(result.costMultipliers.repair),
      upgrade: Number(result.costMultipliers.upgrade),
      rechargeCooldown: Number(result.costMultipliers.rechargeCooldown)
    },
    yieldMultipliers: {
      parts: Number(result.yieldMultipliers.parts),
      prizes: Number(result.yieldMultipliers.prizes)
    },
    drainMultipliers: {
      scavenging: Number(result.drainMultipliers.scavenging)
    }
  };
};

/**
 * Purchase a bot from the marketplace using ICRC-2 payment.
 * User must approve the canister as spender before calling this.
 * @param tokenIndex The token index of the bot to purchase
 * @param identity Required identity for authentication
 * @returns Success message or error
 */
// Re-export from marketplace API (now uses EXT directly)
export { purchaseMarketplaceBot as purchaseBot } from './marketplace.api.js';

/**
 * Helper to approve ICP Ledger canister for ICRC-2 transfers.
 * This must be called before any payment-based operation.
 * @param amount Amount in e8s to approve (use bigint for precision)
 * @param identity Required identity for authentication
 * @returns Approval block index
 */
export const approveIcpSpending = async (
  amount: bigint,
  identityOrAgent: IdentityOrAgent
): Promise<bigint> => {
  // TODO: Implement ICRC-2 approval
  // This will need to call the ICP Ledger canister's icrc2_approve method
  throw new Error('Not implemented - ICRC-2 approval coming soon');
};

/**
 * Start continuous scavenging for a bot (V2).
 * @param tokenIndex The token index of the bot
 * @param zone The zone to scavenge in
 * @param identityOrAgent Required identity for authentication
 * @returns Success message
 */
export const startScavenging = async (
  tokenIndex: number,
  zone: 'ScrapHeaps' | 'AbandonedSettlements' | 'DeadMachineFields' | 'RepairBay' | 'ChargingStation',
  identityOrAgent: IdentityOrAgent,
  durationMinutes?: number,
): Promise<string> => {
  const actor = await getActor(identityOrAgent);
  
  const result = await actor.web_start_scavenging(
    BigInt(tokenIndex),
    zone,
    durationMinutes !== undefined ? [BigInt(durationMinutes)] : []
  );
  
  if ('ok' in result) {
    return result.ok as string;
  } else if ('err' in result) {
    throw new Error(result.err as string);
  }
  throw new Error('Unexpected response from canister');
};

/**
 * Complete a scavenging mission and collect rewards.
 * @param tokenIndex The token index of the bot
 * @param identityOrAgent Required identity for authentication
 * @returns Success message with rewards
 */
export const completeScavenging = async (
  tokenIndex: number,
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const actor = await getActor(identityOrAgent);
  
  const result = await actor.web_complete_scavenging(BigInt(tokenIndex));
  
  if ('ok' in result) {
    return result.ok as string;
  } else if ('err' in result) {
    throw new Error(result.err as string);
  }
  throw new Error('Unexpected response from canister');
};

/**
 * Convert parts from one type to another with 25% conversion cost.
 * @param fromType Part type to convert from (SpeedChip, PowerCoreFragment, ThrusterKit, GyroModule, UniversalPart)
 * @param toType Part type to convert to
 * @param amount Number of parts to convert
 * @param identityOrAgent Required identity for authentication
 * @returns Success message with conversion details
 */
export const convertParts = async (
  fromType: string,
  toType: string,
  amount: number,
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const actor = await getActor(identityOrAgent);
  
  const result = await actor.web_convert_parts(fromType, toType, BigInt(amount));
  
  if ('ok' in result) {
    return result.ok as string;
  } else if ('err' in result) {
    throw new Error(result.err as string);
  }
  throw new Error('Unexpected response from canister');
};

/**
 * API Key Management
 */

export interface ApiKeyMetadata {
  hashed_key: string;
  info: {
    name: string;
    principal: any;
    scopes: string[];
    created: bigint;
  };
}

/**
 * List all API keys owned by the caller.
 * @param identityOrAgent Required identity for authentication
 * @returns Array of API key metadata (without the raw keys)
 */
export const listMyApiKeys = async (
  identityOrAgent: IdentityOrAgent
): Promise<ApiKeyMetadata[]> => {
  const actor = await getActor(identityOrAgent);
  return await actor.list_my_api_keys();
};

/**
 * Create a new API key.
 * @param name Human-readable name for the key
 * @param scopes Array of scope strings (e.g., ['read', 'write'])
 * @param identityOrAgent Required identity for authentication
 * @returns The raw API key (THIS IS THE ONLY TIME IT WILL BE VISIBLE)
 */
export const createApiKey = async (
  name: string,
  scopes: string[],
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const actor = await getActor(identityOrAgent);
  return await actor.create_my_api_key(name, scopes);
};

/**
 * Revoke (delete) an API key.
 * @param keyId The hashed key ID to revoke
 * @param identityOrAgent Required identity for authentication
 */
export const revokeApiKey = async (
  keyId: string,
  identityOrAgent: IdentityOrAgent
): Promise<void> => {
  const actor = await getActor(identityOrAgent);
  await actor.revoke_my_api_key(keyId);
};

/**
 * Convert principal to account identifier (EXT format)
 */
function principalToAccountIdentifier(principal: any, subaccount?: Uint8Array): string {
  // Create padding: [0x0A, 'a', 'c', 'c', 'o', 'u', 'n', 't', '-', 'i', 'd']
  const padding = new Uint8Array([0x0A, 0x61, 0x63, 0x63, 0x6F, 0x75, 0x6E, 0x74, 0x2D, 0x69, 0x64]);
  
  // Handle different principal types
  let principalBytes: Uint8Array;
  if (typeof principal.toUint8Array === 'function') {
    principalBytes = principal.toUint8Array();
  } else if (principal instanceof Uint8Array) {
    principalBytes = principal;
  } else {
    throw new Error('Invalid principal type');
  }
  
  const array = new Uint8Array([
    ...padding,
    ...principalBytes,
    ...(subaccount || new Uint8Array(32)),
  ]);
  const hash = sha224(array);
  const hashBytes = hexToUint8Array(hash);
  const checksum = to32bits(crc32(hashBytes));
  const bytes = new Uint8Array([...checksum, ...hashBytes]);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function to32bits(num: number): Uint8Array {
  const b = new ArrayBuffer(4);
  new DataView(b).setUint32(0, num);
  return new Uint8Array(b);
}

function crc32(buf: Uint8Array): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Interface for unregistered NFT info
export interface UnregisteredNFT {
  tokenIndex: number;
  isRegistered: boolean;
  metadata?: any;
}

/**
 * Get all NFTs owned by the user from their wallet (both registered and unregistered).
 * @param identityOrAgent Required identity for authentication
 * @returns Array of token indices owned by the user
 */
export const getUserWalletNFTs = async (identityOrAgent: IdentityOrAgent): Promise<UnregisteredNFT[]> => {
  const nftsActor = await getNFTsActorFromAgent(identityOrAgent);
  
  // Get user's principal
  let userPrincipal: any;
  if (isPlugAgent(identityOrAgent)) {
    userPrincipal = await identityOrAgent.getPrincipal();
  } else {
    userPrincipal = identityOrAgent.getPrincipal();
  }
  
  // Convert principal to account identifier for EXT standard
  const accountId = principalToAccountIdentifier(userPrincipal);
  
  // Get user's tokens from the NFT canister
  const result = await nftsActor.tokens(accountId);
  
  if ('err' in result) {
    console.error('[getUserWalletNFTs] Error fetching tokens:', result.err);
    throw new Error(`Failed to fetch user tokens: ${JSON.stringify(result.err)}`);
  }
  
  // Handle token indices - result.ok is a Uint32Array or array of numbers
  const tokenIndices = Array.from(result.ok).map((tokenIndex: any) => {
    if (tokenIndex === null || tokenIndex === undefined) {
      console.error('Received null/undefined tokenIndex:', tokenIndex);
      return null;
    }
    // Convert BigInt or number to number
    const value = typeof tokenIndex === 'bigint' ? Number(tokenIndex) : Number(tokenIndex);
    return isNaN(value) ? null : value;
  }).filter((idx: number | null): idx is number => idx !== null);
  
  // Get registered bots to check which ones are already registered
  const racingActor = await getActor(identityOrAgent);
  const registeredBotsResult = await racingActor.web_list_my_registered_bots();
  const registeredTokenIndices = new Set(registeredBotsResult.map((bot: any) => Number(bot.tokenIndex)));
  
  // Return all tokens with their registration status
  const walletNFTs = tokenIndices.map((tokenIndex: number) => ({
    tokenIndex,
    isRegistered: registeredTokenIndices.has(tokenIndex),
  }));
  
  return walletNFTs;
};
