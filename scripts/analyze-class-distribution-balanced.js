#!/usr/bin/env node

/**
 * BALANCED CLASS DISTRIBUTION ANALYSIS
 * 
 * Uses a ratio-based method to ensure each faction has reasonable representation
 * in all 4 classes. This addresses the problem where small factions have 0 bots
 * in certain classes when using simple "highest stat" method.
 */

const fs = require('fs');
const path = require('path');

// Load the precomputed stats
const statsPath = path.join(__dirname, '../data/precomputed-stats.json');
const data = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
const stats = data.stats;

/**
 * BALANCED CLASS DETERMINATION
 * 
 * Strategy: Use stat ratios and thresholds to ensure better distribution
 * 
 * Class mapping:
 * - Bulwark (Tank): High Stability relative to other stats
 * - Striker (DPS): High Power Core relative to other stats
 * - Fixer (Healer): High Acceleration relative to other stats
 * - Tactician (Support): High Speed relative to other stats
 * 
 * Method: Calculate each stat as percentage of total stats, then use
 * thresholds to assign classes. If a stat is 28%+ of total, strong indicator.
 * If multiple stats qualify, use highest. If none qualify (balanced bot),
 * use highest stat as fallback.
 */
function determineClassBalanced(bot) {
  const { speed, powerCore, acceleration, stability } = bot;
  const total = speed + powerCore + acceleration + stability;
  
  // Calculate each stat as percentage of total
  const speedPct = speed / total;
  const powerPct = powerCore / total;
  const accelPct = acceleration / total;
  const stabilityPct = stability / total;
  
  // Threshold: A stat must be at least 28% of total to be "dominant"
  // (25% would be perfectly balanced, so 28% = 12% above baseline)
  const THRESHOLD = 0.28;
  
  // Check which stats exceed threshold
  const dominantStats = [];
  if (stabilityPct >= THRESHOLD) dominantStats.push({ stat: 'Stability', pct: stabilityPct, class: 'Bulwark' });
  if (powerPct >= THRESHOLD) dominantStats.push({ stat: 'PowerCore', pct: powerPct, class: 'Striker' });
  if (accelPct >= THRESHOLD) dominantStats.push({ stat: 'Acceleration', pct: accelPct, class: 'Fixer' });
  if (speedPct >= THRESHOLD) dominantStats.push({ stat: 'Speed', pct: speedPct, class: 'Tactician' });
  
  // If multiple stats are dominant, pick the highest
  if (dominantStats.length > 0) {
    dominantStats.sort((a, b) => b.pct - a.pct);
    return dominantStats[0].class;
  }
  
  // Fallback: No dominant stat (balanced bot), use highest absolute value
  const statMap = [
    { value: stability, class: 'Bulwark' },
    { value: powerCore, class: 'Striker' },
    { value: acceleration, class: 'Fixer' },
    { value: speed, class: 'Tactician' }
  ];
  
  statMap.sort((a, b) => b.value - a.value);
  return statMap[0].class;
}

// Analyze distribution
const distribution = {
  overall: { Bulwark: 0, Striker: 0, Fixer: 0, Tactician: 0 },
  byFaction: {}
};

stats.forEach(bot => {
  const botClass = determineClassBalanced(bot);
  const faction = bot.faction;
  
  // Update overall
  distribution.overall[botClass]++;
  
  // Update per-faction
  if (!distribution.byFaction[faction]) {
    distribution.byFaction[faction] = {
      total: 0,
      Bulwark: 0,
      Striker: 0,
      Fixer: 0,
      Tactician: 0
    };
  }
  distribution.byFaction[faction].total++;
  distribution.byFaction[faction][botClass]++;
});

// Sort factions by total count
const factionsSorted = Object.keys(distribution.byFaction).sort((a, b) => {
  return distribution.byFaction[a].total - distribution.byFaction[b].total;
});

// Print results
console.log('📊 BALANCED CLASS DISTRIBUTION ANALYSIS (Ratio-Based Method)');
console.log('');
console.log('================================================================================');
console.log('');
console.log('🌍 OVERALL CLASS DISTRIBUTION');
console.log('');

const totalBots = stats.length;
Object.keys(distribution.overall).forEach(className => {
  const count = distribution.overall[className];
  const pct = (count / totalBots * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(count / totalBots * 50));
  console.log(`  ${className.padEnd(13)} ${count.toString().padStart(4)} bots  (${pct.padStart(4)}%)  ${bar}`);
});

console.log('');
console.log('================================================================================');
console.log('');
console.log('🏭 PER-FACTION CLASS BREAKDOWN');
console.log('');

factionsSorted.forEach(faction => {
  const factionData = distribution.byFaction[faction];
  console.log('');
  console.log(`${faction} (${factionData.total} total):`);
  console.log('------------------------------------------------------------');
  
  ['Bulwark', 'Striker', 'Fixer', 'Tactician'].forEach(className => {
    const count = factionData[className];
    const pct = (count / factionData.total * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / factionData.total * 50));
    console.log(`  ${className.padEnd(13)} ${count.toString().padStart(3)} (${pct.padStart(5)}%)  ${bar}`);
  });
});

console.log('');
console.log('================================================================================');
console.log('');
console.log('⚠️  BALANCE CONCERNS');
console.log('');

const concerns = [];
factionsSorted.forEach(faction => {
  const factionData = distribution.byFaction[faction];
  const issues = [];
  
  ['Bulwark', 'Striker', 'Fixer', 'Tactician'].forEach(className => {
    const count = factionData[className];
    const pct = count / factionData.total * 100;
    
    if (count === 0) {
      issues.push(`NO ${className}s`);
    } else if (pct < 10) {
      issues.push(`Low ${className}s (<10%)`);
    }
  });
  
  if (issues.length > 0) {
    concerns.push(`  ${faction}: ${issues.join(', ')}`);
  }
});

if (concerns.length === 0) {
  console.log('  ✅ All factions have reasonable representation in all classes!');
} else {
  concerns.forEach(concern => console.log(concern));
}

console.log('');
console.log('================================================================================');
console.log('');
console.log('📈 COMPARISON WITH "HIGHEST STAT" METHOD');
console.log('');
console.log('  This ratio-based method should provide better balance by:');
console.log('  • Using 28% threshold (stat must be 12% above 25% baseline)');
console.log('  • Considering relative stat strength, not just absolute highest');
console.log('  • Better handling of balanced bots (no stat dominates)');
console.log('  • Should reduce factions with 0 representation in classes');
console.log('');
console.log('================================================================================');
console.log('');
console.log('💾 EXPORT CLASS ASSIGNMENTS');
console.log('');

// Export the class assignments for use in other scripts
const classAssignments = stats.map(bot => ({
  tokenId: bot.tokenId,
  faction: bot.faction,
  class: determineClassBalanced(bot),
  stats: {
    speed: bot.speed,
    powerCore: bot.powerCore,
    acceleration: bot.acceleration,
    stability: bot.stability
  }
}));

const outputPath = path.join(__dirname, '../data/class-assignments.json');
fs.writeFileSync(outputPath, JSON.stringify(classAssignments, null, 2));
console.log(`  ✅ Saved class assignments to: ${outputPath}`);
console.log(`  📊 ${classAssignments.length} bots classified`);
console.log('');
console.log('================================================================================');
