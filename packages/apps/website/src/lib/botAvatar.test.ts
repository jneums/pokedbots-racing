import { describe, expect, it } from 'vitest';
import { getBotAvatarUrl } from './botAvatar';

describe('getBotAvatarUrl', () => {
  it('uses deterministic DiceBear bottts-neutral SVGs for flagged starter/free bots', () => {
    expect(getBotAvatarUrl({ tokenIndex: 42, isStarterBot: true })).toBe(
      'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=starter-bot-42'
    );
  });

  it('uses DiceBear for free bots identified by the starter token range even when the flag is missing', () => {
    expect(getBotAvatarUrl({ tokenIndex: 101832 })).toBe(
      'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=starter-bot-101832'
    );
  });

  it('keeps NFT thumbnails for paid NFT bots', () => {
    const url = getBotAvatarUrl({ tokenIndex: 42, isStarterBot: false });

    expect(url).toContain('https://bzsui-sqaaa-aaaah-qce2a-cai.raw.icp0.io/');
    expect(url).toContain('tokenid=');
    expect(url).toContain('type=thumbnail');
  });
});
