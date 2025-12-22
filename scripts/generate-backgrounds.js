const fs = require('fs');
const path = require('path');

// Load the metadata
const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/stats.json'), 'utf8'));

// Parse the stats.json structure: [schema, bots]
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

// Extract backgrounds for all bots
const backgrounds = {};

for (const bot of bots) {
  const tokenId = bot[0];
  const traits = bot[1];
  
  // Find background trait (trait ID 6)
  let background = '';
  for (const [traitId, valueId] of traits) {
    if (traitId === 6) {
      background = getTraitValue(traitId, valueId);
      break;
    }
  }
  
  backgrounds[tokenId] = background || 'black'; // Default to black if not found
}

// Write to file
const outputPath = path.join(__dirname, '../data/backgrounds.json');
fs.writeFileSync(outputPath, JSON.stringify({ backgrounds }, null, 2));

console.log(`Generated backgrounds for ${Object.keys(backgrounds).length} bots`);
console.log(`Output: ${outputPath}`);
