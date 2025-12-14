// packages/libs/ic-js/src/api/garage.api.ts

import { type Identity, Actor } from '@icp-sdk/core/agent';
import { getRacingActor, getNFTsActor } from '../actors.js';
import { PokedBotsRacing, PokedBotsNFTs } from '@pokedbots-racing/declarations';
import { getCanisterId } from '../config.js';
import { approveICRC2 } from './ledger.api.js';

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
async function getActor(identityOrAgent: IdentityOrAgent): Promise<PokedBotsRacing._SERVICE> {
  // Check if it's a Plug agent - use window.ic.plug.createActor
  if (isPlugAgent(identityOrAgent) && typeof globalThis !== 'undefined' && (globalThis as any).window?.ic?.plug?.createActor) {
    const canisterId = getCanisterId('POKEDBOTS_RACING');
    return await (globalThis as any).window.ic.plug.createActor({
      canisterId,
      interfaceFactory: PokedBotsRacing.idlFactory,
    });
  }
  
  // It's a standard Identity - use our standard actor creation
  return getRacingActor(identityOrAgent as Identity);
}

// Helper to get NFTs actor from Identity or Plug agent
async function getNFTsActorFromAgent(identityOrAgent: IdentityOrAgent): Promise<PokedBotsNFTs._SERVICE> {
  // Check if it's a Plug agent - use window.ic.plug.createActor
  if (isPlugAgent(identityOrAgent) && typeof globalThis !== 'undefined' && (globalThis as any).window?.ic?.plug?.createActor) {
    const canisterId = getCanisterId('POKEDBOTS_NFTS');
    return await (globalThis as any).window.ic.plug.createActor({
      canisterId,
      interfaceFactory: PokedBotsNFTs.idlFactory,
    });
  }
  
  // It's a standard Identity - use our standard actor creation
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
  isListed?: boolean;
  listPrice?: number;
  activeUpgrade?: any;
  activeMission?: {
    missionId: bigint;
    tokenIndex: bigint;
    zone: { ScrapHeaps: null } | { AbandonedSettlements: null } | { DeadMachineFields: null };
    startTime: bigint;
    lastAccumulation: bigint;
    pendingParts: {
      speedChips: bigint;
      powerCoreFragments: bigint;
      thrusterKits: bigint;
      gyroModules: bigint;
      universalParts: bigint;
    };
  };
  upcomingRaces?: Array<{
    raceId: number;
    name: string;
    startTime: bigint;
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
  stats: any;
  upgradeCosts: {
    speed: { icp: bigint; parts: bigint };
    powerCore: { icp: bigint; parts: bigint };
    acceleration: { icp: bigint; parts: bigint };
    stability: { icp: bigint; parts: bigint };
  };
}

/**
 * List all PokedBots owned by the authenticated user.
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
    allListings.forEach(([tokenIndex32, listing, _metadata]) => {
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
        entryFee: race.entryFee,
        terrain: race.terrain,
      })),
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
    const upgradeCosts = details.upgradeCosts;
    
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
  zone: 'ScrapHeaps' | 'AbandonedSettlements' | 'DeadMachineFields',
  identityOrAgent: IdentityOrAgent
): Promise<string> => {
  const actor = await getActor(identityOrAgent);
  
  const result = await actor.web_start_scavenging(
    BigInt(tokenIndex),
    zone
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
