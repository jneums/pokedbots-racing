const fs = require('fs');

const stats = JSON.parse(fs.readFileSync('./data/precomputed-stats.json', 'utf8')).stats;

// Determine class based on highest base stat
function determineClass(bot) {
  const statMap = {
    stability: bot.stability,
    powerCore: bot.powerCore,
    acceleration: bot.acceleration,
    speed: bot.speed
  };
  
  const highest = Object.entries(statMap).reduce((max, [stat, value]) => 
    value > max.value ? { stat, value } : max, 
    { stat: 'stability', value: 0 }
  );
  
  const classMap = {
    stability: 'Bulwark',
    powerCore: 'Striker',
    acceleration: 'Fixer',
    speed: 'Tactician'
  };
  
  return {
    class: classMap[highest.stat],
    highestStat: highest.stat,
    highestValue: highest.value
  };
}

// Analyze by faction
const factionData = {};
const classData = {
  Bulwark: 0,
  Striker: 0,
  Fixer: 0,
  Tactician: 0
};

for (const bot of stats) {
  const classification = determineClass(bot);
  
  if (!factionData[bot.faction]) {
    factionData[bot.faction] = {
      total: 0,
      classes: {
        Bulwark: 0,
        Striker: 0,
        Fixer: 0,
        Tactician: 0
      }
    };
  }
  
  factionData[bot.faction].total++;
  factionData[bot.faction].classes[classification.class]++;
  classData[classification.class]++;
}

console.log('\n📊 CLASS DISTRIBUTION ANALYSIS (Highest Stat Method)\n');
console.log('=' .repeat(80));

console.log('\n🌍 OVERALL CLASS DISTRIBUTION\n');
const total = stats.length;
for (const [className, count] of Object.entries(classData)) {
  const percent = ((count / total) * 100).toFixed(1);
  console.log(`  ${className.padEnd(12)} ${count.toString().padStart(5)} bots  (${percent}%)`);
}

console.log('\n' + '='.repeat(80));
console.log('\n🏭 PER-FACTION CLASS BREAKDOWN\n');

// Sort factions by rarity (count)
const sortedFactions = Object.keys(factionData).sort((a, b) => 
  factionData[a].total - factionData[b].total
);

for (const faction of sortedFactions) {
  const data = factionData[faction];
  console.log(`\n${faction} (${data.total} total):`);
  console.log('-'.repeat(60));
  
  for (const [className, count] of Object.entries(data.classes)) {
    const percent = ((count / data.total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(percent / 2));
    console.log(`  ${className.padEnd(12)} ${count.toString().padStart(4)} (${percent.padStart(5)}%)  ${bar}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n⚠️  BALANCE CONCERNS\n');

// Check for factions with missing or very low representation
for (const faction of sortedFactions) {
  const data = factionData[faction];
  const issues = [];
  
  for (const [className, count] of Object.entries(data.classes)) {
    const percent = (count / data.total) * 100;
    if (count === 0) {
      issues.push(`NO ${className}s`);
    } else if (percent < 10 && data.total > 100) {
      issues.push(`Low ${className}s (<10%)`);
    }
  }
  
  if (issues.length > 0) {
    console.log(`  ${faction}: ${issues.join(', ')}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n💡 ALTERNATIVE METHODS TO TEST\n');
console.log(`
  Current method: Highest stat determines class
  
  Alternatives to consider:
  1. Lowest stat determines class (inverses the distribution)
  2. Ratio-based (e.g., if stability > 1.2x average → Bulwark)
  3. Weighted scoring (some stats count more toward certain classes)
  4. Stat spread analysis (variance-based classification)
  
  Run this script with different methods to find best balance!
`);

console.log('='.repeat(80) + '\n');
