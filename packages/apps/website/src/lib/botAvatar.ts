import { generatetokenIdentifier } from '@pokedbots-racing/ic-js';

const NFT_CANISTER_ID = 'bzsui-sqaaa-aaaah-qce2a-cai';
const STARTER_BOT_AVATAR_BASE_URL = 'https://api.dicebear.com/9.x/bottts-neutral/svg';

export interface BotAvatarInput {
  tokenIndex: number | bigint;
  isStarterBot?: boolean;
}

export function getStarterBotAvatarUrl(tokenIndex: number | bigint): string {
  return `${STARTER_BOT_AVATAR_BASE_URL}?seed=${encodeURIComponent(`starter-bot-${tokenIndex.toString()}`)}`;
}

export function getNftBotAvatarUrl(tokenIndex: number | bigint): string {
  const tokenId = generatetokenIdentifier(NFT_CANISTER_ID, Number(tokenIndex));
  return `https://${NFT_CANISTER_ID}.raw.icp0.io/?tokenid=${tokenId}&type=thumbnail`;
}

export function getBotAvatarUrl(bot: BotAvatarInput): string {
  return bot.isStarterBot ? getStarterBotAvatarUrl(bot.tokenIndex) : getNftBotAvatarUrl(bot.tokenIndex);
}
