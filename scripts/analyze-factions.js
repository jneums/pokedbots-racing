const fs = require('fs');

const stats = JSON.parse(fs.readFileSync('./data/precomputed-stats.json', 'utf8')).stats;

const factionStats = {};
for (const bot of stats) {
  if (!factionStats[bot.faction]) {
    factionStats[bot.faction] = { 
      count: 0, 
      totalSpeed: 0, 
      totalPower: 0, 
      totalAccel: 0, 
      totalStab: 0, 
      maxOverall: 0 
    };
  }
  const f = factionStats[bot.faction];
  f.count++;
  f.totalSpeed += bot.speed;
  f.totalPower += bot.powerCore;
  f.totalAccel += bot.acceleration;
  f.totalStab += bot.stability;
  const overall = bot.speed + bot.powerCore + bot.acceleration + bot.stability;
  if (overall > f.maxOverall) f.maxOverall = overall;
}

console.log('\n📊 Faction Performance Analysis (Sorted by Rarity)\n');
console.log('Faction              Count   Avg Stat   Max Total');
console.log('─'.repeat(55));

const factions = Object.keys(factionStats).sort((a, b) => factionStats[a].count - factionStats[b].count);

for (const faction of factions) {
  const f = factionStats[faction];
  const avgStat = ((f.totalSpeed + f.totalPower + f.totalAccel + f.totalStab) / (f.count * 4)).toFixed(1);
  console.log(
    faction.padEnd(20) + 
    f.count.toString().padStart(5) + ' ' +
    avgStat.padStart(12) +
    f.maxOverall.toString().padStart(13)
  );
}

console.log('\n');
