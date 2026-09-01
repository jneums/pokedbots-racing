#!/usr/bin/env node

/**
 * RAW CLASS DISTRIBUTION ANALYSIS
 * 
 * Uses BASE stats BEFORE faction bonuses to determine class distribution.
 * This should show the true distribution of class archetypes across the
 * NFT collection without the artificial skew from faction bonuses.
 */

const fs = require('fs');
const path = require('path');

// Load the precomputed stats
const statsPath = path.join(__dirname, '../data/precomputed-stats.json');
const data = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
const stats = data.stats;

// Load the metadata to get faction info
const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/stats.json'), 'utf8'));
const [traitSchema, bots] = rawData;

// Build trait value lookup maps
const traitNames = new Map();
const traitValues = new Map();

for (const [traitId, traitName, values] of traitSchema) {
  traitNames.set(traitId, traitName);
  const valueMap = new Map();
  for (const [valueId, valueName] of values) {
    valueMap.set(valueId, valueName);
  }
  traitValues.set(traitId, valueMap);
}

// Helper to get trait value name from trait ID and value ID
function getTraitValue(traitId, valueId) {
  const valueMap = traitValues.get(traitId);
  if (!valueMap) return '';
  return valueMap.get(valueId) || '';
}

// Get faction for a bot
function getFaction(bot) {
  // Trait ID 1 is Type (faction)
  return getTraitValue(1, bot[1]);
}

/**
 * FACTION BONUS REMOVAL
 * 
 * Reverse engineer the faction bonuses to get back to base stats.
 * This is the INVERSE of the applyFactionBonus function in generate-stats.js
 */
function removeFactionBonus(stat, faction, statType) {
  let bonus = 0;
  
  switch (faction) {
    // ===== ULTRA-RARE TIER (1-45 bots) =====
    case 'Ultimate-master': // 1 bot
      bonus = 25;
      break;
      
    case 'Golden': // 27 bots
      if (statType === 'powerCore') bonus = 18;
      else if (statType === 'stability') bonus = 16;
      else bonus = 14;
      break;
      
    case 'Wild': // 5 bots
      if (statType === 'acceleration') bonus = 24;
      else if (statType === 'speed') bonus = 22;
      else bonus = 18;
      break;
      
    case 'Ultimate': // 45 bots
      if (statType === 'speed') bonus = 12;
      else if (statType === 'powerCore') bonus = 12;
      else bonus = 8;
      break;
    
    // ===== SUPER-RARE TIER (244-640 bots) =====
    case 'Blackhole': // 244 bots
      if (statType === 'powerCore') bonus = 18;
      else if (statType === 'acceleration') bonus = 16;
      else bonus = 13;
      break;
      
    case 'Dead': // 382 bots
      if (statType === 'stability') bonus = 10;
      else if (statType === 'powerCore') bonus = 9;
      else bonus = 7;
      break;
      
    case 'Master': // 640 bots
      if (statType === 'speed') bonus = 11;
      else if (statType === 'stability') bonus = 11;
      else bonus = 8;
      break;
    
    // ===== RARE TIER (717-999 bots) =====
    case 'Bee': // 717 bots
      if (statType === 'acceleration') bonus = 3;
      else if (statType === 'speed') bonus = 2;
      else bonus = 1;
      break;
      
    case 'Food': // 778 bots
      if (statType === 'powerCore') bonus = 3;
      else if (statType === 'acceleration') bonus = 2;
      else bonus = 1;
      break;
      
    case 'Box': // 798 bots
      if (statType === 'stability') bonus = 2;
      else if (statType === 'powerCore') bonus = 1;
      else bonus = 1;
      break;
      
    case 'Murder': // 999 bots
      if (statType === 'powerCore') bonus = 3;
      else if (statType === 'speed') bonus = 2;
      else bonus = 1;
      break;
    
    // ===== COMMON TIER (1654-2009 bots) =====
    case 'Game': // 1654 bots
      if (statType === 'acceleration') bonus = 2;
      else if (statType === 'stability') bonus = 1;
      else bonus = 1;
      break;
      
    case 'Animal': // 1701 bots
      if (statType === 'stability') bonus = 2;
      else if (statType === 'speed') bonus = 1;
      else bonus = 1;
      break;
      
    case 'Industrial': // 2009 bots
      if (statType === 'stability') bonus = 2;
      else if (statType === 'acceleration') bonus = 1;
      else bonus = 1;
      break;
  }
  
  return stat - bonus;
}

/**
 * CLASS DETERMINATION (using base stats)
 * 
 * Uses highest base stat (before faction bonuses) to determine class:
 * - Bulwark (Tank): Highest Stability
 * - Striker (DPS): Highest Power Core
 * - Fixer (Healer): Highest Acceleration
 * - Tactician (Support): Highest Speed
 */
function determineClass(baseSpeed, basePowerCore, baseAcceleration, baseStability) {
  const statMap = [
    { value: baseStability, class: 'Bulwark' },
    { value: basePowerCore, class: 'Striker' },
    { value: baseAcceleration, class: 'Fixer' },
    { value: baseSpeed, class: 'Tactician' }
  ];
  
  statMap.sort((a, b) => b.value - a.value);
  return statMap[0].class;
}

// Analyze distribution
const distribution = {
  overall: { Bulwark: 0, Striker: 0, Fixer: 0, Tactician: 0 },
  byFaction: {}
};

stats.forEach((bot, idx) => {
  const faction = bot.faction;
  
  // Remove faction bonuses to get base stats
  const baseSpeed = removeFactionBonus(bot.speed, faction, 'speed');
  const basePowerCore = removeFactionBonus(bot.powerCore, faction, 'powerCore');
  const baseAcceleration = removeFactionBonus(bot.acceleration, faction, 'acceleration');
  const baseStability = removeFactionBonus(bot.stability, faction, 'stability');
  
  // Determine class from base stats
  const botClass = determineClass(baseSpeed, basePowerCore, baseAcceleration, baseStability);
  
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
console.log('📊 RAW CLASS DISTRIBUTION ANALYSIS (Base Stats Before Faction Bonuses)');
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
console.log('📈 KEY INSIGHT');
console.log('');
console.log('  By using BASE stats (before faction bonuses), we see the true class');
console.log('  distribution based on the NFT\'s inherent stat profile from its parts.');
console.log('  Faction bonuses artificially pushed rare factions toward specific classes.');
console.log('');
console.log('  This method ensures class is determined by the bot\'s physical build,');
console.log('  not by its faction membership.');
console.log('');
console.log('================================================================================');
console.log('');
console.log('💾 EXPORT RAW CLASS ASSIGNMENTS');
console.log('');

// Export the class assignments based on raw stats
const classAssignments = stats.map(bot => {
  const faction = bot.faction;
  const baseSpeed = removeFactionBonus(bot.speed, faction, 'speed');
  const basePowerCore = removeFactionBonus(bot.powerCore, faction, 'powerCore');
  const baseAcceleration = removeFactionBonus(bot.acceleration, faction, 'acceleration');
  const baseStability = removeFactionBonus(bot.stability, faction, 'stability');
  
  return {
    tokenId: bot.tokenId,
    faction: faction,
    class: determineClass(baseSpeed, basePowerCore, baseAcceleration, baseStability),
    baseStats: {
      speed: baseSpeed,
      powerCore: basePowerCore,
      acceleration: baseAcceleration,
      stability: baseStability
    },
    modifiedStats: {
      speed: bot.speed,
      powerCore: bot.powerCore,
      acceleration: bot.acceleration,
      stability: bot.stability
    }
  };
});

const outputPath = path.join(__dirname, '../data/class-assignments-raw.json');
fs.writeFileSync(outputPath, JSON.stringify(classAssignments, null, 2));
console.log(`  ✅ Saved raw class assignments to: ${outputPath}`);
console.log(`  📊 ${classAssignments.length} bots classified using base stats`);
console.log('');
console.log('================================================================================');
