import { useState, useEffect, useCallback } from 'react';
import { Faction, Class } from '@/lib/combat-engine';
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-brawl/ic-js';

interface BotStats {
  tokenId: number;
  faction: Faction;
  class: Class;
  modifiedStats: {
    speed: number;
    powerCore: number;
    acceleration: number;
    stability: number;
  };
}

export function useRandomBots(count: number = 3) {
  const [bots, setBots] = useState<BotStats[]>([]);
  const [allBots, setAllBots] = useState<BotStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBots() {
      try {
        const response = await fetch('/class-assignments-raw.json');
        if (!response.ok) throw new Error('Failed to load bot stats');
        
        const data: BotStats[] = await response.json();
        setAllBots(data);
        
        // Get random bots
        const selected = getRandomBots(data, count);
        setBots(selected);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    loadBots();
  }, []);

  const refresh = useCallback(() => {
    if (allBots.length > 0) {
      const selected = getRandomBots(allBots, count);
      setBots(selected);
    }
  }, [allBots, count]);

  return { bots, loading, error, refresh };
}

// Get random bots by picking random indices from 0-9999
function getRandomBots(data: BotStats[], count: number): BotStats[] {
  const result: BotStats[] = [];
  const maxIndex = Math.min(data.length, 10000);
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * maxIndex);
    result.push(data[randomIndex]);
  }
  
  return result;
}

// Helper to get EXT thumbnail URL for a bot
export function getBotThumbnailUrl(tokenIndex: number): string {
  // PokedBots NFT canister ID (production)
  const canisterId = 'bzsui-sqaaa-aaaah-qce2a-cai';
  // Convert tokenIndex to EXT tokenIdentifier
  const tokenId = generatetokenIdentifier(canisterId, tokenIndex);
  // Use the existing helper function
  return generateExtThumbnailLink(tokenId);
}
