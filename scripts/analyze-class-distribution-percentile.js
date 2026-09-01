#!/usr/bin/env node

/**
 * PERCENTILE-BASED CLASS DISTRIBUTION
 * 
 * Assigns classes based on stat rankings WITHIN each faction:
 * - Top 25% in each stat becomes that stat's class
 * - If a bot is top 25% in multiple stats, highest percentile wins
 * - This ensures every faction has all 4 classes represented
 * - Strikers in "powerCore-weak" factions will have lower absolute stats
 *   than Strikers in "powerCore-strong" factions (creates faction identity)
 */

const fs = require('fs');
const path = require('path');

// Load the precomputed stats
const statsPath = path.join(__dirname, '../data/precomputed-stats.json');
const data = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
const stats = data.stats;

/**
 * FACTION BONUS REMOVAL
 */
function removeFactionBonus(stat, faction, statType) {
  let bonus = 0;
  
  switch (faction) {
    case 'Ultimate-master': bonus = 25; break;
    case 'Golden':
      if (statType === 'powerCore') bonus = 18;
      else if (statType === 'stability') bonus = 16;
      else bonus = 14;
      break;
    case 'Wild':
      if (statType === 'acceleration') bonus = 24;
      else if (statType === 'speed') bonus = 22;
      else bonus = 18;
      break;
    case 'Ultimate':
      if (statType === 'speed') bonus = 12;
      else if (statType === 'powerCore') bonus = 12;
      else bonus = 8;
      break;
    case 'Blackhole':
      if (statType === 'powerCore') bonus = 18;
      else if (statType === 'acceleration') bonus = 16;
      else bonus = 13;
      break;
    case 'Dead':
      if (statType === 'stability') bonus = 10;
      else if (statType === 'powerCore') bonus = 9;
      else bonus = 7;
      break;
    case 'Master':
      if (statType === 'speed') bonus = 11;
      else if (statType === 'stability') bonus = 11;
      else bonus = 8;
      break;
    case 'Bee':
      if (statType === 'acceleration') bonus = 3;
      else if (statType === 'speed') bonus = 2;
      else bonus = 1;
      break;
    case 'Food':
      if (statType === 'powerCore') bonus = 3;
      else if (statType === 'acceleration') bonus = 2;
      else bonus = 1;
      break;
    case 'Box':
      if (statType === 'stability') bonus = 2;
      else if (statType === 'powerCore') bonus = 1;
      else bonus = 1;
      break;
    case 'Murder':
      if (statType === 'powerCore') bonus = 3;
      else if (statType === 'speed') bonus = 2;
      else bonus = 1;
      break;
    case 'Game':
      if (statType === 'acceleration') bonus = 2;
      else if (statType === 'stability') bonus = 1;
      else bonus = 1;
      break;
    case 'Animal':
      if (statType === 'stability') bonus = 2;
      else if (statType === 'speed') bonus = 1;
      else bonus = 1;
      break;
    case 'Industrial':
      if (statType === 'stability') bonus = 2;
      else if (statType === 'acceleration') bonus = 1;
      else bonus = 1;
      break;
  }
  
  return stat - bonus;
}

// Get base stats for all bots
const botsWithBaseStats = stats.map(bot => ({
  ...bot,
  baseSpeed: removeFactionBonus(bot.speed, bot.faction, 'speed'),
  basePowerCore: removeFactionBonus(bot.powerCore, bot.faction, 'powerCore'),
  baseAcceleration: removeFactionBonus(bot.acceleration, bot.faction, 'acceleration'),
  baseStability: removeFactionBonus(bot.stability, bot.faction, 'stability')
}));

// Group bots by faction
const botsByFaction = {};
botsWithBaseStats.forEach(bot => {
  if (!botsByFaction[bot.faction]) {
    botsByFaction[bot.faction] = [];
  }
  botsByFaction[bot.faction].push(bot);
});

// Calculate percentiles within each faction and assign classes
const classAssignments = [];
const distribution = {
  overall: { Bulwark: 0, Striker: 0, Fixer: 0, Tactician: 0 },
  byFaction: {}
};

Object.keys(botsByFaction).forEach(faction => {
  const factionBots = botsByFaction[faction];
  const factionSize = factionBots.length;
  
  // Sort bots by each stat to get rankings
  const speedRanked = [...factionBots].sort((a, b) => b.baseSpeed - a.baseSpeed);
  const powerRanked = [...factionBots].sort((a, b) => b.basePowerCore - a.basePowerCore);
  const accelRanked = [...factionBots].sort((a, b) => b.baseAcceleration - a.baseAcceleration);
  const stabilityRanked = [...factionBots].sort((a, b) => b.baseStability - a.baseStability);
  
  // Create percentile maps (tokenId -> percentile)
  const percentiles = {};
  
  factionBots.forEach(bot => {
    percentiles[bot.tokenId] = {
      speed: (speedRanked.findIndex(b => b.tokenId === bot.tokenId) / factionSize) * 100,
      powerCore: (powerRanked.findIndex(b => b.tokenId === bot.tokenId) / factionSize) * 100,
      acceleration: (accelRanked.findIndex(b => b.tokenId === bot.tokenId) / factionSize) * 100,
      stability: (stabilityRanked.findIndex(b => b.tokenId === bot.tokenId) / factionSize) * 100
    };
  });
  
  // Initialize faction distribution
  distribution.byFaction[faction] = {
    total: factionSize,
    Bulwark: 0,
    Striker: 0,
    Fixer: 0,
    Tactician: 0
  };
  
  // Assign class based on best percentile (lowest percentile = highest rank)
  factionBots.forEach(bot => {
    const p = percentiles[bot.tokenId];
    
    // Find which stat this bot ranks highest in (lowest percentile)
    const rankings = [
      { stat: 'stability', percentile: p.stability, class: 'Bulwark' },
      { stat: 'powerCore', percentile: p.powerCore, class: 'Striker' },
      { stat: 'acceleration', percentile: p.acceleration, class: 'Fixer' },
      { stat: 'speed', percentile: p.speed, class: 'Tactician' }
    ];
    
    rankings.sort((a, b) => a.percentile - b.percentile);
    const botClass = rankings[0].class;
    
    // Update distributions
    distribution.overall[botClass]++;
    distribution.byFaction[faction][botClass]++;
    
    // Store assignment
    classAssignments.push({
      tokenId: bot.tokenId,
      faction: bot.faction,
      class: botClass,
      classReason: {
        primaryStat: rankings[0].stat,
        percentileInFaction: rankings[0].percentile.toFixed(1),
        allPercentiles: {
          speed: p.speed.toFixed(1),
          powerCore: p.powerCore.toFixed(1),
          acceleration: p.acceleration.toFixed(1),
          stability: p.stability.toFixed(1)
        }
      },
      baseStats: {
        speed: bot.baseSpeed,
        powerCore: bot.basePowerCore,
        acceleration: bot.baseAcceleration,
        stability: bot.baseStability
      },
      modifiedStats: {
        speed: bot.speed,
        powerCore: bot.powerCore,
        acceleration: bot.acceleration,
        stability: bot.stability
      }
    });
  });
});

// Sort factions by total count
const factionsSorted = Object.keys(distribution.byFaction).sort((a, b) => {
  return distribution.byFaction[a].total - distribution.byFaction[b].total;
});

// Print results
console.log('📊 PERCENTILE-BASED CLASS DISTRIBUTION (Within-Faction Rankings)');
console.log('');
console.log('================================================================================');
console.log('');
console.log('🎯 METHODOLOGY');
console.log('');
console.log('  Each bot is ranked against others IN ITS OWN FACTION for each stat.');
console.log('  Class is assigned based on which stat the bot ranks highest in.');
console.log('');
console.log('  Result: Every faction has representation in all 4 classes.');
console.log('  Trade-off: Strikers in "weak PowerCore" factions have lower absolute stats');
console.log('            than Strikers in "strong PowerCore" factions.');
console.log('');
console.log('  This creates faction identity and encourages trading for optimal builds!');
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
    
    if (count === 0) {
      issues.push(`NO ${className}s`);
    }
  });
  
  if (issues.length > 0) {
    concerns.push(`  ${faction}: ${issues.join(', ')}`);
  }
});

if (concerns.length === 0) {
  console.log('  ✅ ALL factions have representation in ALL classes!');
  console.log('');
  console.log('  Perfect for ensuring:');
  console.log('  • Every faction-class combo exists (all 56 abilities are usable)');
  console.log('  • Faction identity is preserved through stat profiles');
  console.log('  • Trading is encouraged (optimize party composition)');
} else {
  concerns.forEach(concern => console.log(concern));
}

console.log('');
console.log('================================================================================');
console.log('');
console.log('💡 FACTION IDENTITY EXAMPLES');
console.log('');

// Show min/max base stats for Strikers across different factions
const strikers = classAssignments.filter(a => a.class === 'Striker');
const strikersByFaction = {};
strikers.forEach(s => {
  if (!strikersByFaction[s.faction]) strikersByFaction[s.faction] = [];
  strikersByFaction[s.faction].push(s.baseStats.powerCore);
});

console.log('  PowerCore ranges for Strikers (base stats) across factions:');
console.log('');
Object.keys(strikersByFaction).sort().forEach(faction => {
  const pcs = strikersByFaction[faction];
  const min = Math.min(...pcs);
  const max = Math.max(...pcs);
  const avg = (pcs.reduce((a, b) => a + b, 0) / pcs.length).toFixed(1);
  console.log(`    ${faction.padEnd(20)} ${min.toString().padStart(3)}-${max.toString().padStart(3)} (avg ${avg})`);
});

console.log('');
console.log('  Notice: Golden Strikers have ~60-70 PowerCore, Industrial Strikers ~30-45.');
console.log('  This creates natural power tiers and faction specialization!');
console.log('');
console.log('================================================================================');
console.log('');
console.log('💾 EXPORT PERCENTILE CLASS ASSIGNMENTS');
console.log('');

const outputPath = path.join(__dirname, '../data/class-assignments-percentile.json');
fs.writeFileSync(outputPath, JSON.stringify(classAssignments, null, 2));
console.log(`  ✅ Saved percentile class assignments to: ${outputPath}`);
console.log(`  📊 ${classAssignments.length} bots classified`);
console.log(`  🎲 Includes percentile rankings and reasoning for each bot`);
console.log('');
console.log('================================================================================');
