import { Actor, HttpAgent, type Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import {
  PokedBotsRacing,
} from '@pokedbots-racing/declarations';
import { getCanisterId, getHost } from './config.js';

/**
 * A generic function to create an actor for any canister.
 * @param idlFactoryFn The IDL factory for the canister
 * @param canisterId The canister ID to connect to
 * @param identity Optional identity to use for the actor
 * @returns An actor instance for the specified canister
 */
const createActor = <T>(
  idlFactoryFn: any,
  canisterId: string,
  identity?: Identity,
): T => {
  const host = getHost();
  const isLocal =
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.includes('host.docker.internal');

  // In v3, use HttpAgent.createSync with shouldFetchRootKey for local development
  // This will fetch the root key before the first request is made
  const agent = HttpAgent.createSync({
    host,
    identity,
    shouldFetchRootKey: isLocal,
  });

  return Actor.createActor<T>(idlFactoryFn, {
    agent,
    canisterId,
  });
};

/**
 * Gets an actor for the PokedBots Racing canister
 * @param identity Optional identity to use for the actor
 * @returns An actor instance for the PokedBots Racing canister
 */
export const getRacingActor = (identity?: Identity) => {
  return createActor<PokedBotsRacing._SERVICE>(
    PokedBotsRacing.idlFactory,
    getCanisterId('POKEDBOTS_RACING'),
    identity,
  );
};
