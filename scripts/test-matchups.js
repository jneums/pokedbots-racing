const fs = require('fs');

// Load the precomputed stats
const statsData = JSON.parse(fs.readFileSync('./data/precomputed-stats.json', 'utf8'));
const stats = statsData.stats;

// Define rarity tiers
const rarityTiers = {
  'Ultra-Rare': ['Ultimate-master', 'Wild', 'Golden', 'Ultimate'],
  'Super-Rare': ['Blackhole', 'Dead', 'Master'],
  'Rare': ['Bee', 'Food', 'Box', 'Murder'],
  'Common': ['Game', 'Animal', 'Industrial']
};

// Get tier for a faction
function getTier(faction) {
  for (const [tier, factions] of Object.entries(rarityTiers)) {
    if (factions.includes(faction)) return tier;
  }
  return 'Unknown';
}

// Calculate total stats
function getTotalStats(bot) {
  return bot.speed + bot.powerCore + bot.acceleration + bot.stability;
}

// Pick random bots from a tier
function getRandomBotsFromTier(tier, count) {
  const tierFactions = rarityTiers[tier];
  const tierBots = stats.filter(bot => tierFactions.includes(bot.faction));
  const samples = [];
  
  for (let i = 0; i < count; i++) {
    const randomBot = tierBots[Math.floor(Math.random() * tierBots.length)];
    samples.push(randomBot);
  }
  
  return samples;
}

// Compare two bots
function compareBots(bot1, bot2) {
  const total1 = getTotalStats(bot1);
  const total2 = getTotalStats(bot2);
  
  return {
    bot1: {
      tokenId: bot1.tokenId,
      faction: bot1.faction,
      tier: getTier(bot1.faction),
      total: total1,
      stats: `S:${bot1.speed} P:${bot1.powerCore} A:${bot1.acceleration} St:${bot1.stability}`
    },
    bot2: {
      tokenId: bot2.tokenId,
      faction: bot2.faction,
      tier: getTier(bot2.faction),
      total: total2,
      stats: `S:${bot2.speed} P:${bot2.powerCore} A:${bot2.acceleration} St:${bot2.stability}`
    },
    winner: total1 > total2 ? 'bot1' : (total2 > total1 ? 'bot2' : 'tie'),
    margin: Math.abs(total1 - total2),
    upset: (getTier(bot1.faction) !== getTier(bot2.faction)) && 
           ((total1 > total2 && compareTiers(getTier(bot1.faction), getTier(bot2.faction)) > 0) ||
            (total2 > total1 && compareTiers(getTier(bot2.faction), getTier(bot1.faction)) > 0))
  };
}

// Compare tier ranks (lower number = rarer/better)
function compareTiers(tier1, tier2) {
  const tierRank = { 'Ultra-Rare': 1, 'Super-Rare': 2, 'Rare': 3, 'Common': 4 };
  return tierRank[tier1] - tierRank[tier2];
}

console.log('🎮 POKEDBOTS RACING MATCHUP SIMULATOR\n');
console.log('Testing random matchups to verify balance...\n');

// Test 1: Ultra-Rare vs Super-Rare (should mostly favor Ultra-Rare)
console.log('═══════════════════════════════════════════════════════');
console.log('TEST 1: Ultra-Rare vs Super-Rare (50 matchups)');
console.log('Expected: Ultra-Rare wins ~90% of the time');
console.log('═══════════════════════════════════════════════════════\n');

let ultraVsSuper = { ultraWins: 0, superWins: 0, ties: 0, upsets: 0 };
for (let i = 0; i < 50; i++) {
  const ultra = getRandomBotsFromTier('Ultra-Rare', 1)[0];
  const superRare = getRandomBotsFromTier('Super-Rare', 1)[0];
  const result = compareBots(ultra, superRare);
  
  console.log(`Match ${i + 1}:`);
  console.log(`  ${result.bot1.faction} (#${result.bot1.tokenId}): ${result.bot1.total} [${result.bot1.stats}]`);
  console.log(`  ${result.bot2.faction} (#${result.bot2.tokenId}): ${result.bot2.total} [${result.bot2.stats}]`);
  console.log(`  Winner: ${result.winner} (margin: ${result.margin})${result.upset ? ' ⚠️ UPSET!' : ''}\n`);
  
  if (result.winner === 'bot1') ultraVsSuper.ultraWins++;
  else if (result.winner === 'bot2') ultraVsSuper.superWins++;
  else ultraVsSuper.ties++;
  if (result.upset) ultraVsSuper.upsets++;
}

console.log(`Results: Ultra-Rare ${ultraVsSuper.ultraWins} - ${ultraVsSuper.superWins} Super-Rare (${ultraVsSuper.upsets} upsets)\n\n`);

// Test 2: Super-Rare vs Rare (should favor Super-Rare but allow some upsets)
console.log('═══════════════════════════════════════════════════════');
console.log('TEST 2: Super-Rare vs Rare (50 matchups)');
console.log('Expected: Super-Rare wins ~75% of the time');
console.log('═══════════════════════════════════════════════════════\n');

let superVsRare = { superWins: 0, rareWins: 0, ties: 0, upsets: 0 };
for (let i = 0; i < 50; i++) {
  const superRare = getRandomBotsFromTier('Super-Rare', 1)[0];
  const rare = getRandomBotsFromTier('Rare', 1)[0];
  const result = compareBots(superRare, rare);
  
  console.log(`Match ${i + 1}:`);
  console.log(`  ${result.bot1.faction} (#${result.bot1.tokenId}): ${result.bot1.total} [${result.bot1.stats}]`);
  console.log(`  ${result.bot2.faction} (#${result.bot2.tokenId}): ${result.bot2.total} [${result.bot2.stats}]`);
  console.log(`  Winner: ${result.winner} (margin: ${result.margin})${result.upset ? ' ⚠️ UPSET!' : ''}\n`);
  
  if (result.winner === 'bot1') superVsRare.superWins++;
  else if (result.winner === 'bot2') superVsRare.rareWins++;
  else superVsRare.ties++;
  if (result.upset) superVsRare.upsets++;
}

console.log(`Results: Super-Rare ${superVsRare.superWins} - ${superVsRare.rareWins} Rare (${superVsRare.upsets} upsets)\n\n`);

// Test 3: Rare vs Common (should favor Rare but allow upsets)
console.log('═══════════════════════════════════════════════════════');
console.log('TEST 3: Rare vs Common (50 matchups)');
console.log('Expected: Rare wins ~60-70% of the time');
console.log('═══════════════════════════════════════════════════════\n');

let rareVsCommon = { rareWins: 0, commonWins: 0, ties: 0, upsets: 0 };
for (let i = 0; i < 50; i++) {
  const rare = getRandomBotsFromTier('Rare', 1)[0];
  const common = getRandomBotsFromTier('Common', 1)[0];
  const result = compareBots(rare, common);
  
  console.log(`Match ${i + 1}:`);
  console.log(`  ${result.bot1.faction} (#${result.bot1.tokenId}): ${result.bot1.total} [${result.bot1.stats}]`);
  console.log(`  ${result.bot2.faction} (#${result.bot2.tokenId}): ${result.bot2.total} [${result.bot2.stats}]`);
  console.log(`  Winner: ${result.winner} (margin: ${result.margin})${result.upset ? ' ⚠️ UPSET!' : ''}\n`);
  
  if (result.winner === 'bot1') rareVsCommon.rareWins++;
  else if (result.winner === 'bot2') rareVsCommon.commonWins++;
  else rareVsCommon.ties++;
  if (result.upset) rareVsCommon.upsets++;
}

console.log(`Results: Rare ${rareVsCommon.rareWins} - ${rareVsCommon.commonWins} Common (${rareVsCommon.upsets} upsets)\n\n`);

// Test 4: Within-tier matchups (should be competitive)
console.log('═══════════════════════════════════════════════════════');
console.log('TEST 4: Within Rare Tier (10 matchups)');
console.log('Expected: Close matchups, varying winners');
console.log('═══════════════════════════════════════════════════════\n');

let withinRare = { margins: [] };
for (let i = 0; i < 10; i++) {
  const bots = getRandomBotsFromTier('Rare', 2);
  const result = compareBots(bots[0], bots[1]);
  
  console.log(`Match ${i + 1}:`);
  console.log(`  ${result.bot1.faction} (#${result.bot1.tokenId}): ${result.bot1.total} [${result.bot1.stats}]`);
  console.log(`  ${result.bot2.faction} (#${result.bot2.tokenId}): ${result.bot2.total} [${result.bot2.stats}]`);
  console.log(`  Winner: ${result.winner} (margin: ${result.margin})\n`);
  
  withinRare.margins.push(result.margin);
}

const avgMargin = withinRare.margins.reduce((a, b) => a + b, 0) / withinRare.margins.length;
console.log(`Average margin: ${avgMargin.toFixed(1)} points\n\n`);

// Summary
console.log('═══════════════════════════════════════════════════════');
console.log('📊 SUMMARY');
console.log('═══════════════════════════════════════════════════════\n');
console.log(`Ultra-Rare vs Super-Rare: ${ultraVsSuper.ultraWins}-${ultraVsSuper.superWins} (${(ultraVsSuper.ultraWins/50*100).toFixed(0)}% win rate)`);
console.log(`Super-Rare vs Rare:       ${superVsRare.superWins}-${superVsRare.rareWins} (${(superVsRare.superWins/50*100).toFixed(0)}% win rate)`);
console.log(`Rare vs Common:           ${rareVsCommon.rareWins}-${rareVsCommon.commonWins} (${(rareVsCommon.rareWins/50*100).toFixed(0)}% win rate)`);
console.log(`\nTotal upsets: ${ultraVsSuper.upsets + superVsRare.upsets + rareVsCommon.upsets}/150 cross-tier matchups (${((ultraVsSuper.upsets + superVsRare.upsets + rareVsCommon.upsets)/150*100).toFixed(0)}%)`);
console.log(`\n✓ Higher rarity should win most of the time, but upsets should be possible!`);
