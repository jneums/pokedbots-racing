import { Actor, HttpAgent, type Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import {
  PokedBotsRacing,
  PokedBotsNFTs,
  Ledger,
} from '@pokedbots-racing/declarations';
import { getCanisterId, getHost } from './config.js';

/**
 * A generic function to create an actor for any canister.
 * @param idlFactoryFn The IDL factory for the canister
 * @param canisterId The canister ID to connect to
 * @param identity Optional identity to use for the actor
 * @returns An actor instance for the specified canister
 */
const createActor = async <T>(
  idlFactoryFn: any,
  canisterId: string,
  identity?: Identity,
): Promise<T> => {
  console.log('[createActor] Starting for canister:', canisterId);
  const host = getHost();
  const isLocal =
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.includes('host.docker.internal');

  console.log('[createActor] Creating HttpAgent, host:', host, 'isLocal:', isLocal);
  
  const agent = await HttpAgent.create({
    host,
    identity,
    shouldFetchRootKey: isLocal,
  });
  console.log('[createActor] HttpAgent created successfully');

  console.log('[createActor] Creating actor...');
  const actor = Actor.createActor<T>(idlFactoryFn, {
    agent,
    canisterId,
  });
  console.log('[createActor] Actor created successfully');
  
  return actor;
};

/**
 * Gets an actor for the PokedBots Racing canister
 * @param identity Optional identity to use for the actor
 * @returns An actor instance for the PokedBots Racing canister
 */
export const getRacingActor = async (identity?: Identity) => {
  return createActor<PokedBotsRacing._SERVICE>(
    PokedBotsRacing.idlFactory,
    getCanisterId('POKEDBOTS_RACING'),
    identity,
  );
};

/**
 * Gets an actor for the PokedBots NFTs canister
 * @param identity Optional identity to use for the actor
 * @returns An actor instance for the PokedBots NFTs canister
 */
export const getNFTsActor = async (identity?: Identity) => {
  return createActor<PokedBotsNFTs._SERVICE>(
    PokedBotsNFTs.idlFactory,
    getCanisterId('POKEDBOTS_NFTS'),
    identity,
  );
};

/**
 * Gets an actor for the ICP Ledger canister
 * @param identity Optional identity to use for the actor
 * @returns An actor instance for the ICP Ledger canister
 */
export const getLedgerActor = async (identity?: Identity) => {
  return createActor<Ledger._SERVICE>(
    Ledger.idlFactory,
    getCanisterId('ICP_LEDGER'),
    identity,
  );
};
