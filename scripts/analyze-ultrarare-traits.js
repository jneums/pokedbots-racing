const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./data/stats.json', 'utf8'));
const [schema, bots] = data;

// Build trait maps
const traitValues = new Map();
for (const [id, name, values] of schema) {
  const valueMap = new Map();
  for (const [valueId, valueName] of values) {
    valueMap.set(valueId, valueName);
  }
  traitValues.set(id, valueMap);
}

// Find ultra-rare bots and analyze their traits
const ultraRareTypes = ['Ultimate-master', 'Wild', 'Golden', 'Ultimate'];
const traitsByType = {};

for (const [botId, traits] of bots) {
  const traitMap = {};
  for (const [traitId, valueId] of traits) {
    const valueMap = traitValues.get(traitId);
    traitMap[traitId] = valueMap ? valueMap.get(valueId) : '';
  }
  
  const type = traitMap[0];
  if (ultraRareTypes.includes(type)) {
    if (!traitsByType[type]) {
      traitsByType[type] = {
        body: {}, driver: {}, arms: {}, legs: {}, wings: {}
      };
    }
    if (traitMap[1]) traitsByType[type].body[traitMap[1]] = (traitsByType[type].body[traitMap[1]] || 0) + 1;
    if (traitMap[2]) traitsByType[type].driver[traitMap[2]] = (traitsByType[type].driver[traitMap[2]] || 0) + 1;
    if (traitMap[3]) traitsByType[type].arms[traitMap[3]] = (traitsByType[type].arms[traitMap[3]] || 0) + 1;
    if (traitMap[4]) traitsByType[type].legs[traitMap[4]] = (traitsByType[type].legs[traitMap[4]] || 0) + 1;
    if (traitMap[5]) traitsByType[type].wings[traitMap[5]] = (traitsByType[type].wings[traitMap[5]] || 0) + 1;
  }
}

for (const type of ultraRareTypes) {
  if (!traitsByType[type]) continue;
  console.log('\n=== ' + type + ' ===');
  console.log('Body:', Object.entries(traitsByType[type].body).sort((a,b) => b[1] - a[1]).slice(0,3).map(e => e[0] + '(' + e[1] + ')').join(', '));
  console.log('Driver:', Object.entries(traitsByType[type].driver).sort((a,b) => b[1] - a[1]).slice(0,3).map(e => e[0] + '(' + e[1] + ')').join(', '));
  console.log('Arms:', Object.entries(traitsByType[type].arms).sort((a,b) => b[1] - a[1]).slice(0,3).map(e => e[0] + '(' + e[1] + ')').join(', '));
  console.log('Legs:', Object.entries(traitsByType[type].legs).sort((a,b) => b[1] - a[1]).slice(0,3).map(e => e[0] + '(' + e[1] + ')').join(', '));
  console.log('Wings:', Object.entries(traitsByType[type].wings).sort((a,b) => b[1] - a[1]).slice(0,3).map(e => e[0] + '(' + e[1] + ')').join(', '));
}

console.log('\n=== TARGET TIER GAPS ===');
console.log('Current:');
console.log('  Ultra-Rare avg: 175.3');
console.log('  Super-Rare avg: 103.2 (gap: -72)');
console.log('  Rare avg: 93.8 (gap: -9.4)');  
console.log('  Common avg: 92.0 (gap: -1.8)');
console.log('\nTarget (10-20 point gaps):');
console.log('  Common: 92.0 (baseline)');
console.log('  Rare: 105-110 (+13-18 from Common)');
console.log('  Super-Rare: 118-125 (+13-15 from Rare)');
console.log('  Ultra-Rare: 133-145 (+15-20 from Super-Rare)');
