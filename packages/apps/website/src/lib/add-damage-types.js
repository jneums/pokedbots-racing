const fs = require('fs');

// Read the file
let content = fs.readFileSync('combat-engine.ts', 'utf8');

// Pattern: Find all basicAttack definitions and add damageType based on class
// Bulwark and Striker (melee) = physical
// Fixer and Tactician (ranged) = magical

// For Bulwark and Striker - add damageType: 'physical' after description
content = content.replace(
  /(id: '\w+_(bulwark|striker)_basic',[\s\S]*?description: 'Basic (?:melee|ranged)',)(\s*resourceCost:)/gi,
  (match, p1, p2, p3) => {
    // Check if damageType already exists
    if (match.includes('damageType:')) return match;
    return `${p1} damageType: 'physical',${p3}`;
  }
);

// For Fixer and Tactician - add damageType: 'magical' after description
content = content.replace(
  /(id: '\w+_(fixer|tactician)_basic',[\s\S]*?description: 'Basic ranged',)(\s*resourceCost:)/gi,
  (match, p1, p2, p3) => {
    // Check if damageType already exists
    if (match.includes('damageType:')) return match;
    return `${p1} damageType: 'magical',${p3}`;
  }
);

// Write back
fs.writeFileSync('combat-engine.ts', content);
console.log('Added damageType to all basic attacks based on class!');
