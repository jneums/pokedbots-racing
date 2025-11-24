import { type Identity } from '@icp-sdk/core/agent';
import { PokedBotsRacing } from '@pokedbots-racing/declarations';
/**
 * Gets an actor for the PokedBots Racing canister
 * @param identity Optional identity to use for the actor
 * @returns An actor instance for the PokedBots Racing canister
 */
export declare const getRacingActor: (identity?: Identity) => PokedBotsRacing._SERVICE;
