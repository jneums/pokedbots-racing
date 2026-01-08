export interface Article {
  slug: string;
  title: string;
  description: string;
  author: string;
  date: string;
  content: string;
}

export const articles: Article[] = [
  {
    slug: 'welcome-to-pokedbots-racing',
    title: 'Welcome to PokedBots Racing',
    description: 'An introduction to the wasteland racing platform where your robots compete for glory and ICP.',
    author: 'PokedBots Team',
    date: '2026-01-08',
    content: `# Welcome to PokedBots Racing

We're excited to introduce PokedBots Racing - a unique racing platform built on the Internet Computer where your robot NFTs compete in thrilling wasteland races.

## What is PokedBots Racing?

PokedBots Racing is a competitive racing game where each PokedBot is a unique NFT with its own stats, faction, and personality. Race your bots, place bets, and earn ICP rewards.

## Key Features

### Racing System
- **Multiple Classes**: From Scavenger to Elite races, each with different prize pools
- **Dynamic Terrain**: Scrap Heaps, Wasteland Sand, and Metal Roads each favor different bot types
- **Real Competition**: Race against other players' bots in scheduled events

### Bot Management
- **Upgrade System**: Improve your bot's Speed, Power Core, Acceleration, and Stability
- **Maintenance**: Keep your bots charged and repaired for optimal performance
- **Scavenging**: Send bots into the wasteland to gather parts for upgrades

### Betting & Rewards
- **Place Bets**: Bet ICP on your favorite bots across Win, Place, and Show positions
- **Prize Pools**: Winners earn from race prize pools funded by entry fees and bets
- **Leaderboards**: Compete for top rankings and bragging rights

## Getting Started

1. **Get a Bot**: Purchase a PokedBot from the marketplace
2. **Maintain Your Bot**: Keep it charged and repaired
3. **Enter Races**: Join scheduled races that match your bot's class
4. **Place Bets**: Back your favorites in upcoming races
5. **Earn Rewards**: Win races and successful bets earn ICP

## The Wasteland Awaits

Whether you're a collector, racer, or trader, PokedBots Racing offers something for everyone. Build your garage, upgrade your bots, and prove you have what it takes to dominate the wasteland.

See you on the track!
`,
  },
  {
    slug: 'understanding-bot-stats',
    title: 'Understanding Bot Stats and Performance',
    description: 'A deep dive into how bot statistics affect race performance and how to build winning machines.',
    author: 'Race Analyst',
    date: '2026-01-07',
    content: `# Understanding Bot Stats and Performance

Knowing how your bot's stats translate to track performance is key to racing success. Let's break down each stat and how it impacts races.

## The Four Core Stats

### Speed
Speed determines your bot's maximum velocity on straightaways. Higher speed means:
- Faster lap times on courses with long straights
- Better performance on Metal Roads terrain
- Increased advantage in high-class races

**Typical Range**: 50-150

### Power Core
Power Core affects acceleration out of turns and overall energy management. Benefits include:
- Quicker recovery after corners
- Better performance on technical tracks
- Improved handling of terrain transitions

**Typical Range**: 40-120

### Acceleration
Pure acceleration determines how quickly you reach top speed. Key for:
- Race starts and positioning
- Recovery from obstacles
- Short-distance races

**Typical Range**: 45-130

### Stability
Stability helps maintain speed through corners and rough terrain. Critical for:
- Cornering without losing speed
- Scrap Heaps and rough terrain performance
- Consistency across different track types

**Typical Range**: 35-110

## Faction Bonuses

Each faction provides unique bonuses:
- **Scrappers**: Bonus to terrain adaptability
- **Velocitrons**: Speed and acceleration boost
- **Black Hole Division**: Well-rounded improvements
- **Silent Klan**: Stealth advantages in positioning

## Building Your Bot

Consider these strategies:

### Speed Specialist
- Max out Speed and Acceleration
- Best for Metal Roads races
- Excels in high-class competition

### Technical Expert  
- Focus on Stability and Power Core
- Dominates Scrap Heaps terrain
- Consistent across track types

### Balanced Build
- Even distribution of stats
- Versatile across all race types
- Safe choice for new racers

## Upgrade Strategy

Start by identifying your bot's natural strengths based on its base stats and faction. Then:

1. Amplify strengths for specialized performance
2. Or shore up weaknesses for versatility
3. Consider your typical race schedule

Remember: the upgrade system has increasing costs and decreasing success rates, so plan carefully!
`,
  },
];
