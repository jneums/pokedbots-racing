#!/usr/bin/env node

/**
 * Test upgrade catch-up mechanics
 * Simulates upgrading bots from different factions to see how the catch-up system works
 */

const fs = require('fs');
const path = require('path');

// Load precomputed stats
const statsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/precomputed-stats.json'), 'utf8'));

// Faction upgrade probabilities (from PokedBotsGarage.mo)
const UPGRADE_PROBABILITIES = {
  // Ultra-rare
  'Ultimate-master': 0.10,
  'Golden': 0.10,
  'Ultimate': 0.10,
  'Wild': 'variance', // Special case: -2 to +2 variance
  
  // Super-rare
  'Blackhole': 0.20,
  'Dead': 0.20,
  'Master': 0.20,
  
  // Rare (CATCH-UP MECHANIC)
  'Bee': 0.35,
  'Food': 0.35,
  'Box': 0.35,
  'Murder': 0.35,
  
  // Common
  'Game': 0.25,
  'Animal': 0.25,
  'Industrial': 0.25,
};

// Simple hash function for better randomness
function hash(n) {
  n = (n ^ (n >>> 16)) * 0x85ebca6b;
  n = (n ^ (n >>> 13)) * 0xc2b2ae35;
  return (n ^ (n >>> 16)) >>> 0;
}

// Simulate a single upgrade
function simulateUpgrade(baseGain, faction, seed) {
  const roll = hash(seed) % 100;
  const prob = UPGRADE_PROBABILITIES[faction];
  
  if (faction === 'Wild') {
    // High variance: -2 to +2
    const varianceRoll = hash(seed * 2) % 5;
    const variance = varianceRoll - 2;
    return Math.max(1, baseGain + variance);
  }
  
  if (roll < prob * 100) {
    return baseGain * 2; // 2x bonus!
  }
  
  return baseGain;
}

// Simulate multiple upgrades for a bot
function simulateUpgrades(bot, numUpgrades, baseGainPerUpgrade = 3) {
  let totalSpeedGain = 0;
  let totalPowerGain = 0;
  let totalAccelGain = 0;
  let totalStabGain = 0;
  let bonusCount = 0;
  
  for (let i = 0; i < numUpgrades; i++) {
    const seed = (bot.tokenId * 1000 + i);
    
    const speedGain = simulateUpgrade(baseGainPerUpgrade, bot.faction, seed + 0);
    const powerGain = simulateUpgrade(baseGainPerUpgrade, bot.faction, seed + 1);
    const accelGain = simulateUpgrade(baseGainPerUpgrade, bot.faction, seed + 2);
    const stabGain = simulateUpgrade(baseGainPerUpgrade, bot.faction, seed + 3);
    
    if (speedGain > baseGainPerUpgrade) bonusCount++;
    if (powerGain > baseGainPerUpgrade) bonusCount++;
    if (accelGain > baseGainPerUpgrade) bonusCount++;
    if (stabGain > baseGainPerUpgrade) bonusCount++;
    
    totalSpeedGain += speedGain;
    totalPowerGain += powerGain;
    totalAccelGain += accelGain;
    totalStabGain += stabGain;
  }
  
  return {
    speed: Math.min(100, bot.speed + totalSpeedGain),
    powerCore: Math.min(100, bot.powerCore + totalPowerGain),
    acceleration: Math.min(100, bot.acceleration + totalAccelGain),
    stability: Math.min(100, bot.stability + totalStabGain),
    totalGain: totalSpeedGain + totalPowerGain + totalAccelGain + totalStabGain,
    bonusCount,
    bonusRate: bonusCount / (numUpgrades * 4),
  };
}

// Get sample bots from each faction tier
function getSampleBots() {
  const samples = {
    'Ultra-rare': [],
    'Super-rare': [],
    'Rare': [],
    'Common': [],
  };
  
  for (const bot of statsData.stats) {
    let tier;
    if (['Ultimate-master', 'Golden', 'Ultimate', 'Wild'].includes(bot.faction)) {
      tier = 'Ultra-rare';
    } else if (['Blackhole', 'Dead', 'Master'].includes(bot.faction)) {
      tier = 'Super-rare';
    } else if (['Bee', 'Food', 'Box', 'Murder'].includes(bot.faction)) {
      tier = 'Rare';
    } else {
      tier = 'Common';
    }
    
    if (samples[tier].length < 5) {
      samples[tier].push(bot);
    }
    
    // Stop when we have enough samples
    if (Object.values(samples).every(arr => arr.length >= 5)) {
      break;
    }
  }
  
  return samples;
}

// Calculate average rating
function getAverageRating(bot) {
  return Math.floor((bot.speed + bot.powerCore + bot.acceleration + bot.stability) / 4);
}

// Main simulation
console.log('=== Upgrade Catch-Up Mechanics Simulation ===\n');
console.log('Testing how upgrade bonuses help lower-tier factions catch up\n');

const samples = getSampleBots();
const NUM_UPGRADES = 10; // Simulate 10 rounds of upgrades
const BASE_GAIN = 3; // Each upgrade gives +3 base (or +6 with 2x bonus)

console.log(`Simulating ${NUM_UPGRADES} upgrade rounds (base +${BASE_GAIN} per stat per round)\n`);
console.log('═══════════════════════════════════════════════════════════════\n');

const results = {};

for (const [tier, bots] of Object.entries(samples)) {
  console.log(`\n📊 ${tier} Tier:`);
  console.log('─────────────────────────────────────────────────────────────');
  
  const tierResults = [];
  
  for (const bot of bots) {
    const initialRating = getAverageRating(bot);
    const upgraded = simulateUpgrades(bot, NUM_UPGRADES, BASE_GAIN);
    const finalRating = getAverageRating(upgraded);
    const ratingGain = finalRating - initialRating;
    
    console.log(`\n${bot.faction} (#${bot.tokenId})`);
    console.log(`  Initial: ${initialRating}/100 (SPD:${bot.speed} PWR:${bot.powerCore} ACC:${bot.acceleration} STB:${bot.stability})`);
    console.log(`  Final:   ${finalRating}/100 (SPD:${upgraded.speed} PWR:${upgraded.powerCore} ACC:${upgraded.acceleration} STB:${upgraded.stability})`);
    console.log(`  Gain:    +${ratingGain} rating (+${upgraded.totalGain} total stats)`);
    console.log(`  Bonus:   ${(upgraded.bonusRate * 100).toFixed(1)}% of upgrades got 2x (${upgraded.bonusCount}/${NUM_UPGRADES * 4})`);
    
    tierResults.push({
      faction: bot.faction,
      initialRating,
      finalRating,
      ratingGain,
      totalGain: upgraded.totalGain,
      bonusRate: upgraded.bonusRate,
    });
  }
  
  // Calculate tier averages
  const avgInitial = tierResults.reduce((sum, r) => sum + r.initialRating, 0) / tierResults.length;
  const avgFinal = tierResults.reduce((sum, r) => sum + r.finalRating, 0) / tierResults.length;
  const avgGain = tierResults.reduce((sum, r) => sum + r.ratingGain, 0) / tierResults.length;
  const avgBonusRate = tierResults.reduce((sum, r) => sum + r.bonusRate, 0) / tierResults.length;
  
  console.log(`\n  📈 ${tier} Average:`);
  console.log(`     ${avgInitial.toFixed(1)} → ${avgFinal.toFixed(1)} (+${avgGain.toFixed(1)} rating)`);
  console.log(`     ${(avgBonusRate * 100).toFixed(1)}% bonus rate`);
  
  results[tier] = {
    avgInitial,
    avgFinal,
    avgGain,
    avgBonusRate,
  };
}

// Summary comparison
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('📊 SUMMARY: Cross-Tier Comparison');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Tier          | Initial | Final  | Gain  | Bonus Rate | Status');
console.log('------------- | ------- | ------ | ----- | ---------- | --------');

for (const [tier, data] of Object.entries(results)) {
  const bonusRate = (data.avgBonusRate * 100).toFixed(1);
  const status = tier === 'Rare' ? '🎯 CATCH-UP' : tier === 'Ultra-rare' ? '👑 ELITE' : '';
  console.log(
    `${tier.padEnd(13)} | ${data.avgInitial.toFixed(1).padStart(7)} | ${data.avgFinal.toFixed(1).padStart(6)} | +${data.avgGain.toFixed(1).padStart(4)} | ${bonusRate.padStart(9)}% | ${status}`
  );
}

// Calculate gap reduction
const initialGap = results['Ultra-rare'].avgInitial - results['Rare'].avgInitial;
const finalGap = results['Ultra-rare'].avgFinal - results['Rare'].avgFinal;
const gapReduction = initialGap - finalGap;
const gapReductionPercent = (gapReduction / initialGap) * 100;

console.log('\n');
console.log('🎯 CATCH-UP EFFECTIVENESS:');
console.log(`   Initial gap (Ultra-rare vs Rare): ${initialGap.toFixed(1)} rating`);
console.log(`   Final gap after ${NUM_UPGRADES} upgrades:  ${finalGap.toFixed(1)} rating`);
console.log(`   Gap reduced by: ${gapReduction.toFixed(1)} rating (${gapReductionPercent.toFixed(1)}%)`);

if (gapReductionPercent > 20) {
  console.log(`   ✅ Strong catch-up! Rare bots closed the gap significantly.`);
} else if (gapReductionPercent > 10) {
  console.log(`   ✅ Moderate catch-up. Rare bots are catching up.`);
} else {
  console.log(`   ⚠️  Weak catch-up. Gap remains mostly unchanged.`);
}

console.log('\n═══════════════════════════════════════════════════════════════\n');
