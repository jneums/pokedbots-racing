const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./data/backgrounds.json', 'utf8'));
const colors = Object.values(data.backgrounds);

let metalRoads = 0, wastelandSand = 0, scrapHeaps = 0;

colors.forEach(bg => {
  const lower = bg.toLowerCase();
  
  // MetalRoads: Purple shades, darker blues, teals
  if (lower.includes('purple') || lower.includes('teal') || 
      lower.includes('dark blue') || lower.includes('grey blue')) {
    metalRoads++;
  }
  // WastelandSand: Warm colors, light/mid blues, reds
  else if (lower.includes('red') || lower.includes('yellow') || 
           lower.includes('bones') || lower.includes('light blue') ||
           (lower.includes('blue') && !lower.includes('dark') && !lower.includes('grey'))) {
    wastelandSand++;
  }
  // ScrapHeaps: Everything else
  else {
    scrapHeaps++;
  }
});

const total = metalRoads + wastelandSand + scrapHeaps;
const ideal = total / 3;

console.log('REBALANCED Terrain Distribution:');
console.log(`Metal Roads:    ${metalRoads.toString().padStart(4)} (${(metalRoads/total*100).toFixed(1)}%)`);
console.log(`Wasteland Sand: ${wastelandSand.toString().padStart(4)} (${(wastelandSand/total*100).toFixed(1)}%)`);
console.log(`Scrap Heaps:    ${scrapHeaps.toString().padStart(4)} (${(scrapHeaps/total*100).toFixed(1)}%)`);
console.log(`Total:          ${total}`);
console.log('');
console.log(`Ideal per terrain: ${ideal.toFixed(0)} (33.3%)`);
console.log(`Difference: ${Math.max(metalRoads, wastelandSand, scrapHeaps) - Math.min(metalRoads, wastelandSand, scrapHeaps)} bots between most and least`);
