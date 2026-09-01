#!/usr/bin/env node
/**
 * Node.js wrapper to run combat simulations
 * Reads party/encounter config from stdin, outputs results to stdout
 */

import { CombatSimulator, generateDefaultAPL } from '../packages/apps/website/src/lib/combat-engine.ts';

// Read config from stdin
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
  let chunk;
  while ((chunk = process.stdin.read()) !== null) {
    input += chunk;
  }
});

process.stdin.on('end', () => {
  try {
    const config = JSON.parse(input);
    const result = runSimulation(config);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`Simulation error: ${error.message}`);
    process.exit(1);
  }
});

function runSimulation(config) {
  const { party, enemy } = config;
  
  // Convert party composition to bot objects
  const partyBots = party.map((bot, index) => ({
    id: `party_${index}`,
    name: `${bot.faction} ${bot.class}`,
    faction: bot.faction,
    class: bot.class,
    level: 50,
    attackType: bot.class === 'Bulwark' || bot.class === 'Striker' ? 'melee' : 'ranged',
    resourceType: bot.class === 'Fixer' || bot.class === 'Tactician' ? 'mana' : 'rage',
    hp: getBaseHp(bot.class),
    maxHp: getBaseHp(bot.class),
    resource: getStartingResource(bot.class),
    maxResource: getMaxResource(bot.class),
    energy: 0,
    cooldowns: {},
    apl: generateDefaultAPL(bot.class, bot.faction),
    stats: bot.stats || getBaseStats(bot.faction, bot.class),  // USE ACTUAL STATS!
    target: null,
    threat: {}
  }));
  
  // Convert enemy composition to bot objects
  const enemyBots = enemy.map((bot, index) => ({
    id: `enemy_${index}`,
    name: `${bot.faction} ${bot.class}`,
    faction: bot.faction,
    class: bot.class,
    level: 50,
    attackType: bot.class === 'Bulwark' || bot.class === 'Striker' ? 'melee' : 'ranged',
    resourceType: bot.class === 'Fixer' || bot.class === 'Tactician' ? 'mana' : 'rage',
    hp: getBaseHp(bot.class),
    maxHp: getBaseHp(bot.class),
    resource: getStartingResource(bot.class),
    maxResource: getMaxResource(bot.class),
    energy: 0,
    cooldowns: {},
    apl: generateDefaultAPL(bot.class, bot.faction),
    stats: bot.stats || getBaseStats(bot.faction, bot.class),  // USE ACTUAL STATS!
    target: null,
    threat: {}
  }));
  
  // Run simulation
  const simulator = new CombatSimulator(partyBots, enemyBots);
  const result = simulator.simulate(1000);
  
  // Extract stats
  const partyStats = result.finalState.party.map(bot => ({
    id: bot.id,
    faction: bot.faction,
    class: bot.class,
    finalHp: bot.hp,
    finalResource: bot.resource,
    died: bot.hp <= 0,
    damageDealt: calculateDamageDealt(bot, result.actions),
    healingDone: calculateHealingDone(bot, result.actions)
  }));
  
  const encounterStats = result.finalState.enemy.map(bot => ({
    id: bot.id,
    faction: bot.faction,
    class: bot.class,
    finalHp: bot.hp,
    died: bot.hp <= 0,
    damageDealt: calculateDamageDealt(bot, result.actions),
    healingDone: calculateHealingDone(bot, result.actions)
  }));
  
  return {
    winningTeam: result.winningTeam,
    totalTicks: result.totalTicks,
    partyStats,
    encounterStats,
    log: result.actions
  };
}

function getBaseHp(className) {
  switch (className) {
    case 'Bulwark': return 1000;
    case 'Fixer': return 600;
    case 'Striker': return 700;
    case 'Tactician': return 650;
    default: return 700;
  }
}

function getStartingResource(className) {
  switch (className) {
    case 'Bulwark': return 50; // rage
    case 'Fixer': return 100; // mana
    case 'Striker': return 50; // rage
    case 'Tactician': return 50; // rage
    default: return 50;
  }
}

function getMaxResource(className) {
  switch (className) {
    case 'Bulwark': return 100;
    case 'Fixer': return 100;
    case 'Striker': return 100;
    case 'Tactician': return 100;
    default: return 100;
  }
}

function getBaseStats(faction, className) {
  // Boosted DPS stats for better balance
  switch (className) {
    case 'Bulwark':
      return { stability: 60, powerCore: 25, acceleration: 25, speed: 15 }; // +5 powerCore
    case 'Fixer':
      return { stability: 20, powerCore: 50, acceleration: 30, speed: 20 };
    case 'Striker':
      return { stability: 25, powerCore: 50, acceleration: 30, speed: 25 }; // +10 powerCore
    case 'Tactician':
      return { stability: 30, powerCore: 45, acceleration: 40, speed: 15 }; // +10 powerCore
    default:
      return { speed: 50, powerCore: 50, acceleration: 50, stability: 50 };
  }
}

function getBossStats(faction, className) {
  // Boss tuning - higher damage output and massive HP
  return { 
    stability: 600,  // 600 * 10 = 6000 HP
    powerCore: 50,   // High damage output
    acceleration: 20, 
    speed: 25        
  };
}

function calculateDamageDealt(bot, actions) {
  return actions
    .filter(action => 
      (action.actionType === 'basic_attack' || action.actionType === 'ability') && 
      action.actorId === bot.id &&
      action.value > 0
    )
    .reduce((sum, action) => sum + action.value, 0);
}

function calculateHealingDone(bot, actions) {
  return actions
    .filter(action => action.actionType === 'heal' && action.actorId === bot.id)
    .reduce((sum, action) => sum + action.value, 0);
}
