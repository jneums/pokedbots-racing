import { type Identity } from '@icp-sdk/core/agent';
import { PokedBotsRacing, PokedBotsNFTs, Ledger } from '@pokedbots-racing/declarations';
/**
 * Gets an actor for the PokedBots Racing canister
 * @param identity Optional identity to use for the actor
 * @returns An actor instance for the PokedBots Racing canister
 */
export declare const getRacingActor: (identity?: Identity) => Promise<PokedBotsRacing._SERVICE>;
/**
 * Gets an actor for the PokedBots NFTs canister
 * @param identity Optional identity to use for the actor
 * @returns An actor instance for the PokedBots NFTs canister
 */
export declare const getNFTsActor: (identity?: Identity) => Promise<PokedBotsNFTs._SERVICE>;
/**
 * Gets an actor for the ICP Ledger canister
 * @param identity Optional identity to use for the actor
 * @returns An actor instance for the ICP Ledger canister
 */
export declare const getLedgerActor: (identity?: Identity) => Promise<Ledger._SERVICE>;
