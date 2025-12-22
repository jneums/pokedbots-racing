// Test script to verify backend terrain logic matches frontend

const testBackgroundLogic = (backgroundColor) => {
  if (!backgroundColor) {
    return 'ScrapHeaps'; // Default fallback
  }

  const bg = backgroundColor.toLowerCase();

  // MetalRoads: Purple shades, darker blues, teals (industrial/tech aesthetic)
  if (
    bg.includes('purple') ||
    bg.includes('teal') ||
    bg.includes('dark blue') ||
    bg.includes('grey blue')
  ) {
    return 'MetalRoads';
  }
  
  // WastelandSand: Warm colors, light/mid blues, reds (desert/sand aesthetic)
  if (
    bg.includes('red') ||
    bg.includes('yellow') ||
    bg.includes('bones') ||
    bg.includes('light blue') ||
    (bg.includes('blue') && !bg.includes('dark') && !bg.includes('grey'))
  ) {
    return 'WastelandSand';
  }
  
  // ScrapHeaps: Greys, browns, blacks, darks, greens (junkyard aesthetic)
  // Default fallback for anything not matched above
  return 'ScrapHeaps';
};

// Test cases that should match the backend logic
const testCases = [
  { bg: 'purple', expected: 'MetalRoads' },
  { bg: 'light purple', expected: 'MetalRoads' },
  { bg: 'dark purple', expected: 'MetalRoads' },
  { bg: 'teal', expected: 'MetalRoads' },
  { bg: 'dark blue', expected: 'MetalRoads' },
  { bg: 'grey blue', expected: 'MetalRoads' },
  
  { bg: 'blue', expected: 'WastelandSand' },
  { bg: 'mid blue', expected: 'WastelandSand' },
  { bg: 'light blue', expected: 'WastelandSand' },
  { bg: 'red', expected: 'WastelandSand' },
  { bg: 'yellow', expected: 'WastelandSand' },
  { bg: 'bones', expected: 'WastelandSand' },
  { bg: 'brown', expected: 'WastelandSand' }, // NOTE: Not in frontend!
  
  { bg: 'grey', expected: 'ScrapHeaps' },
  { bg: 'dark grey', expected: 'ScrapHeaps' },
  { bg: 'black', expected: 'ScrapHeaps' },
  { bg: 'dark brown', expected: 'ScrapHeaps' },
  { bg: 'green', expected: 'ScrapHeaps' },
];

console.log('Testing terrain logic consistency:\n');

let mismatches = 0;
testCases.forEach(({ bg, expected }) => {
  const result = testBackgroundLogic(bg);
  const match = result === expected ? '✓' : '✗';
  if (result !== expected) {
    mismatches++;
    console.log(`${match} ${bg.padEnd(20)} → Expected: ${expected.padEnd(15)} Got: ${result}`);
  }
});

if (mismatches === 0) {
  console.log('✓ All test cases passed!');
} else {
  console.log(`\n✗ ${mismatches} test case(s) failed`);
}

// Now test with actual data
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./data/backgrounds.json', 'utf8'));
const colors = Object.values(data.backgrounds);

let metalRoads = 0, wastelandSand = 0, scrapHeaps = 0;
colors.forEach(bg => {
  const terrain = testBackgroundLogic(bg);
  if (terrain === 'MetalRoads') metalRoads++;
  else if (terrain === 'WastelandSand') wastelandSand++;
  else scrapHeaps++;
});

console.log('\n\nActual distribution with current logic:');
console.log(`Metal Roads:    ${metalRoads} (${(metalRoads/colors.length*100).toFixed(1)}%)`);
console.log(`Wasteland Sand: ${wastelandSand} (${(wastelandSand/colors.length*100).toFixed(1)}%)`);
console.log(`Scrap Heaps:    ${scrapHeaps} (${(scrapHeaps/colors.length*100).toFixed(1)}%)`);
