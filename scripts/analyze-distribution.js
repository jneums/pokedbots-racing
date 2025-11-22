const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./data/precomputed-stats.json', 'utf8'));

// Group by faction
const factionStats = {};
data.stats.forEach(bot => {
  if (!factionStats[bot.faction]) {
    factionStats[bot.faction] = {
      count: 0,
      speeds: [],
      powerCores: [],
      accelerations: [],
      stabilities: [],
      totals: []
    };
  }
  const f = factionStats[bot.faction];
  f.count++;
  f.speeds.push(bot.speed);
  f.powerCores.push(bot.powerCore);
  f.accelerations.push(bot.acceleration);
  f.stabilities.push(bot.stability);
  f.totals.push(bot.speed + bot.powerCore + bot.acceleration + bot.stability);
});

// Calculate percentiles
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// Sort by count (rarity)
const factions = Object.entries(factionStats).sort((a, b) => a[1].count - b[1].count);

console.log('📊 DETAILED FACTION ANALYSIS\n');
console.log('Faction            Count    Avg   Min   P25   P50   P75   Max   Range  Upgrade Room');
console.log('─'.repeat(85));

factions.forEach(([faction, stats]) => {
  const totals = stats.totals;
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const p25 = percentile(totals, 25);
  const p50 = percentile(totals, 50);
  const p75 = percentile(totals, 75);
  const range = max - min;
  const upgradeRoom = 400 - max; // Room before hitting cap
  
  console.log(
    faction.padEnd(18) +
    String(stats.count).padStart(5) +
    String(avg.toFixed(1)).padStart(7) +
    String(min).padStart(6) +
    String(Math.round(p25)).padStart(6) +
    String(Math.round(p50)).padStart(6) +
    String(Math.round(p75)).padStart(6) +
    String(max).padStart(6) +
    String(range).padStart(7) +
    String(upgradeRoom).padStart(8)
  );
});

console.log('\n📈 STAT DISTRIBUTION BY FACTION (Per-Stat Averages)\n');
console.log('Faction            Speed  Power  Accel  Stabil  Balance Score');
console.log('─'.repeat(65));

factions.forEach(([faction, stats]) => {
  const avgSpeed = stats.speeds.reduce((a, b) => a + b, 0) / stats.speeds.length;
  const avgPower = stats.powerCores.reduce((a, b) => a + b, 0) / stats.powerCores.length;
  const avgAccel = stats.accelerations.reduce((a, b) => a + b, 0) / stats.accelerations.length;
  const avgStabil = stats.stabilities.reduce((a, b) => a + b, 0) / stats.stabilities.length;
  
  // Balance score: how evenly distributed are the stats? (lower = more balanced)
  const allStats = [avgSpeed, avgPower, avgAccel, avgStabil];
  const mean = allStats.reduce((a, b) => a + b, 0) / allStats.length;
  const variance = allStats.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allStats.length;
  const balanceScore = Math.sqrt(variance);
  
  console.log(
    faction.padEnd(18) +
    String(avgSpeed.toFixed(1)).padStart(6) +
    String(avgPower.toFixed(1)).padStart(7) +
    String(avgAccel.toFixed(1)).padStart(7) +
    String(avgStabil.toFixed(1)).padStart(8) +
    String(balanceScore.toFixed(1)).padStart(10)
  );
});

console.log('\n💎 RARITY TIER SUMMARY\n');
console.log('Ultra-Rare (1-45 bots):');
const ultraRare = factions.filter(([_, s]) => s.count <= 45);
ultraRare.forEach(([f, s]) => {
  const avg = s.totals.reduce((a, b) => a + b, 0) / s.totals.length;
  console.log('  ' + f.padEnd(18) + '(' + String(s.count).padStart(2) + ' bots) avg ' + avg.toFixed(1));
});

console.log('\nSuper-Rare (244-640 bots):');
const superRare = factions.filter(([_, s]) => s.count >= 244 && s.count <= 640);
superRare.forEach(([f, s]) => {
  const avg = s.totals.reduce((a, b) => a + b, 0) / s.totals.length;
  console.log('  ' + f.padEnd(18) + '(' + String(s.count).padStart(3) + ' bots) avg ' + avg.toFixed(1));
});

console.log('\nRare (717-999 bots):');
const rare = factions.filter(([_, s]) => s.count >= 717 && s.count <= 999);
rare.forEach(([f, s]) => {
  const avg = s.totals.reduce((a, b) => a + b, 0) / s.totals.length;
  console.log('  ' + f.padEnd(18) + '(' + String(s.count).padStart(3) + ' bots) avg ' + avg.toFixed(1));
});

console.log('\nCommon (1654-2009 bots):');
const common = factions.filter(([_, s]) => s.count >= 1654);
common.forEach(([f, s]) => {
  const avg = s.totals.reduce((a, b) => a + b, 0) / s.totals.length;
  console.log('  ' + f.padEnd(18) + '(' + String(s.count).padStart(4) + ' bots) avg ' + avg.toFixed(1));
});

console.log('\n🎯 KEY OBSERVATIONS\n');
console.log('Stat Range: 0-70 per stat (0-280 total)');
console.log('Current Max Total: ' + Math.max(...data.stats.map(b => b.speed + b.powerCore + b.acceleration + b.stability)));
console.log('Upgrade Headroom: ' + (400 - Math.max(...data.stats.map(b => b.speed + b.powerCore + b.acceleration + b.stability))) + ' points before hitting 400 cap');
console.log('\nPower Curve:');
console.log('  Ultra-Rare avg: ' + (ultraRare.reduce((sum, [_, s]) => sum + s.totals.reduce((a, b) => a + b, 0) / s.totals.length, 0) / ultraRare.length).toFixed(1));
console.log('  Super-Rare avg: ' + (superRare.reduce((sum, [_, s]) => sum + s.totals.reduce((a, b) => a + b, 0) / s.totals.length, 0) / superRare.length).toFixed(1));
console.log('  Rare avg:       ' + (rare.reduce((sum, [_, s]) => sum + s.totals.reduce((a, b) => a + b, 0) / s.totals.length, 0) / rare.length).toFixed(1));
console.log('  Common avg:     ' + (common.reduce((sum, [_, s]) => sum + s.totals.reduce((a, b) => a + b, 0) / s.totals.length, 0) / common.length).toFixed(1));

console.log('\n📊 COMPETITIVE BALANCE:\n');
const avgTotal = data.stats.reduce((sum, b) => sum + b.speed + b.powerCore + b.acceleration + b.stability, 0) / data.stats.length;
const commonAvg = common.reduce((sum, [_, s]) => sum + s.totals.reduce((a, b) => a + b, 0) / s.totals.length, 0) / common.length;
const ultraRareAvg = ultraRare.reduce((sum, [_, s]) => sum + s.totals.reduce((a, b) => a + b, 0) / s.totals.length, 0) / ultraRare.length;
const powerGap = ultraRareAvg / commonAvg;

console.log('Collection Average: ' + avgTotal.toFixed(1));
console.log('Ultra-Rare / Common Ratio: ' + powerGap.toFixed(2) + 'x');
console.log('Common bots are ' + ((commonAvg / ultraRareAvg) * 100).toFixed(1) + '% as strong as ultra-rares');
console.log('\nInterpretation:');
if (powerGap < 1.5) console.log('  ✓ Very balanced - common bots competitive');
else if (powerGap < 2.0) console.log('  ✓ Balanced - rarity matters but commons viable');
else if (powerGap < 2.5) console.log('  ⚠ Moderate gap - ultra-rares have clear advantage');
else console.log('  ⚠ Large gap - ultra-rares dominate');
