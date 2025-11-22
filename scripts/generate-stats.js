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

// Helper to check if trait contains text (case-insensitive)
function contains(trait, text) {
  if (!trait) return false;
  return trait.toLowerCase().includes(text.toLowerCase());
}

// Hash text to number (ported from Motoko)
function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) % 1000000;
  }
  return hash;
}

// ===== SPEED CATEGORIZATION FUNCTIONS =====
// Exact port from Racing.mo lines 283-487

// Legs contribution to speed (40% weight) - Locomotion is primary speed factor
function categorizeLegsForSpeed(legs) {
  if (!legs) return 45; // Default
  
  const lower = legs.toLowerCase();
  
  // Legendary (75-80): Only 1-of-1s
  if (contains(lower, 'master gold') || contains(lower, 'power stalks') || 
      contains(lower, '8 bit power') || contains(lower, 'cactus gold')) {
    return 75 + (hashText(legs) % 6);
  }
  // Golden boost: Common Golden legs for speed
  else if (contains(lower, 'gold') && (contains(lower, 'spiky') || contains(lower, 'power') || 
           contains(lower, 'bendy') || contains(lower, 'mini'))) {
    return 69 + (hashText(legs) % 4);
  }
  // High (65-70): Ultimate terminator only (127 bots is rare enough)
  else if (contains(lower, 'ultimate terminator')) {
    return 67 + (hashText(legs) % 4);
  }
  // Medium-high (54-58): Other ultimate variants, super legs
  else if (contains(lower, 'ultimate') || contains(lower, 'super')) {
    return 55 + (hashText(legs) % 4);
  }
  // Medium (48-54): Power, strong, chunky, industrial, rockets
  else if (contains(lower, 'power') || contains(lower, 'strong') || 
           contains(lower, 'chunky') || contains(lower, 'spiky') || 
           contains(lower, 'spike') || contains(lower, 'industrial') || 
           contains(lower, 'rocket')) {
    return 50 + (hashText(legs) % 5);
  }
  // Medium-low (42-48): Midi, bendy, cables, bird claw, flat, bone, balloon
  else if (contains(lower, 'midi') || contains(lower, 'bendy') || 
           contains(lower, 'cable') || contains(lower, 'bird claw') || 
           contains(lower, 'frog') || contains(lower, '8 bit') || 
           contains(lower, 'flat') || contains(lower, 'bone') || 
           contains(lower, 'big') || contains(lower, 'cactus') || 
           contains(lower, 'mech') || contains(lower, 'chocolate') || 
           contains(lower, 'balloon')) {
    return 44 + (hashText(legs) % 5);
  }
  // Low (35-42): Small, burnt, rust, inflatable, slender, mini
  else {
    return 37 + (hashText(legs) % 6);
  }
}

// Wings contribution to speed (30% weight) - Jets and engines provide thrust
function categorizeWingsForSpeed(wings) {
  if (!wings) return 35; // No wings = low speed
  
  const lower = wings.toLowerCase();
  
  // Legendary: Only 1-of-1s
  if (contains(lower, 'master gold') || contains(lower, 'golden triple') || 
      contains(lower, 'black double angel') || contains(lower, 'wings: none')) {
    return 75 + (hashText(wings) % 6);
  }
  // Golden boost: Common Golden wings for speed (triangle up gold, angel wings gold)
  else if (contains(lower, 'gold') && (contains(lower, 'triangle up') || contains(lower, 'angel wings') || 
           contains(lower, 'ear muff'))) {
    return 68 + (hashText(wings) % 4);
  }
  // High (65-70): Terminator variants only
  else if (contains(lower, 'terminator')) {
    return 67 + (hashText(wings) % 4);
  }
  // Medium-high (55-58): Massive engines, rockets, jets, engine wings
  else if (contains(lower, 'massive engine') || contains(lower, 'rocket') || 
           contains(lower, 'jet') || contains(lower, 'engine wings')) {
    return 56 + (hashText(wings) % 3);
  }
  // Medium (48-54): Power cells, triangle up, butterfly double, large angel wings
  else if (contains(lower, 'power cell') || contains(lower, 'triangle up') || 
           contains(lower, 'butterfly double') || contains(lower, 'wings double') || 
           (contains(lower, 'large') && contains(lower, 'angel'))) {
    return 50 + (hashText(wings) % 5);
  }
  // Medium-low (42-48): Angel wings, butterfly, standard wings
  else if (contains(lower, 'angel wings') || contains(lower, 'angel') || 
           contains(lower, 'butterfly') || contains(lower, 'bear') || 
           contains(lower, 'antenna') || contains(lower, 'jointed') || 
           contains(lower, 'ear muff')) {
    return 44 + (hashText(wings) % 5);
  }
  // Low (36-42): Decorative, small wings, bird, bee, bone
  else if (contains(lower, '8 bit') || contains(lower, 'horn') || 
           contains(lower, 'decal') || contains(lower, 'connector') || 
           contains(lower, 'chain saw') || contains(lower, 'game face') || 
           contains(lower, 'bird') || contains(lower, 'bee') || 
           contains(lower, 'bone') || contains(lower, 'antler') || 
           contains(lower, 'geo wing') || contains(lower, 'headphone') || 
           contains(lower, 'game motoko') || contains(lower, 'rainbow') || 
           contains(lower, 'wire')) {
    return 38 + (hashText(wings) % 5);
  }
  // Very low (30-36): Blank, inflatable, waffer
  else if (contains(lower, 'blank') || contains(lower, 'none') || 
           contains(lower, 'inflatable') || contains(lower, 'inflateable') || 
           contains(lower, 'infaltable') || contains(lower, 'lolly pop') || 
           contains(lower, 'straw') || contains(lower, 'waffer')) {
    return 32 + (hashText(wings) % 5);
  } 
  else {
    return 40 + (hashText(wings) % 5);
  }
}

// Body contribution to speed (20% weight, INVERSE) - Heavy bodies are slower
function categorizeBodyForSpeed(body) {
  if (!body) return 50;
  
  const lower = body.toLowerCase();
  
  // Light/Fast (60-75): Eggs, bubbles, balloons, small food
  if (contains(lower, 'egg') || contains(lower, 'bubble') || 
      contains(lower, 'balloon') || contains(lower, 'glass') || 
      contains(lower, 'gummy') || contains(lower, 'bee') || 
      contains(lower, 'bird') || contains(lower, 'donut') || 
      contains(lower, 'smarties')) {
    return 65 + (hashText(body) % 11);
  }
  // Medium (45-60): Game systems, animals, standard bodies
  else if (contains(lower, 'game boy') || contains(lower, 'n 64') || 
           contains(lower, 'ipod') || contains(lower, '8 bit') || 
           contains(lower, 'frog') || contains(lower, 'rabbit') || 
           contains(lower, 'round head') || contains(lower, 'pig') || 
           contains(lower, 'cat') || contains(lower, 'pizza') || 
           contains(lower, 'cheese') || contains(lower, 'waffle')) {
    return 50 + (hashText(body) % 11);
  }
  // Heavy/Slow (30-45): Mega, large, tower, beast
  else if (contains(lower, 'mega') || contains(lower, 'large') || 
           contains(lower, 'tower') || contains(lower, 'beast') || 
           contains(lower, 'massive')) {
    return 35 + (hashText(body) % 11);
  } 
  else {
    return 45 + (hashText(body) % 11);
  }
}

// Arms contribution to speed (10% weight) - Minor thrust/propulsion
function categorizeArmsForSpeed(arms) {
  if (!arms) return 45;
  
  const lower = arms.toLowerCase();
  
  // Legendary (75-80): Only 1-of-1s
  if (contains(lower, 'master gold') || contains(lower, 'golden king') || 
      contains(lower, 'black king') || contains(lower, '8 bit lazers')) {
    return 75 + (hashText(arms) % 6);
  }
  // High (60-70): Ultimate variants, murder arms gold
  else if (contains(lower, 'ultimate') || contains(lower, 'murder arms gold')) {
    return 65 + (hashText(arms) % 6);
  }
  // Medium-high (52-58): Rainbow, rockets with gold/special, power arms rainbow/gold
  else if (contains(lower, 'rainbow') || 
           (contains(lower, 'rocket') && contains(lower, 'gold')) || 
           (contains(lower, 'power arms') && (contains(lower, 'rainbow') || contains(lower, 'gold')))) {
    return 54 + (hashText(arms) % 5);
  }
  // Medium (46-54): Rockets, jets, lasers, power arms, chainsaws, claws
  else if (contains(lower, 'rocket') || contains(lower, 'jet') || 
           contains(lower, 'lazer') || contains(lower, 'power arms') || 
           contains(lower, 'chainsaw') || contains(lower, 'circular saw') || 
           contains(lower, 'power lift') || contains(lower, 'claw') || 
           contains(lower, 'snipper') || contains(lower, 'gripper')) {
    return 49 + (hashText(arms) % 6);
  }
  // Medium-low (40-48): Connectors, cables, long arms, mech parts
  else if (contains(lower, '8 bit') || contains(lower, 'connector') || 
           contains(lower, 'cable') || contains(lower, 'wire') || 
           contains(lower, 'long arms') || contains(lower, 'mechanic') || 
           contains(lower, 'large arms') || contains(lower, 'shoulder') || 
           contains(lower, 'controller') || contains(lower, 'murder hands') || 
           contains(lower, 'mech') || contains(lower, 'long beny') || 
           contains(lower, 'golden spikes')) {
    return 43 + (hashText(arms) % 6);
  }
  // Low (35-42): Hands up, mixed hands, large hands down
  else if (contains(lower, 'hands up') || contains(lower, 'double arms') || 
           contains(lower, 'hands down large') || contains(lower, 'large hands')) {
    return 38 + (hashText(arms) % 5);
  }
  // Very low (32-37): Small hands down, 3 fingers, bone
  else if (contains(lower, 'hands down small') || contains(lower, 'small hands') || 
           contains(lower, '3 finger') || contains(lower, 'bone')) {
    return 34 + (hashText(arms) % 4);
  }
  // Minimal (30-34): Standard hands down (DEFAULT for basic arms)
  else {
    return 31 + (hashText(arms) % 4);
  }
}

// ===== POWER CORE CATEGORIZATION FUNCTIONS =====
// Exact port from Racing.mo lines 489-651
// (continuing in next file due to length...)

// Body contribution to power (50% weight) - Main chassis houses power core
function categorizeBodyForPower(body) {
  if (!body) return 50;
  
  const lower = body.toLowerCase();
  
  // Legendary (75-80): Only 1-of-1s
  if (contains(lower, '8 bit master') || contains(lower, 'double driver') || 
      contains(lower, 'gold pets') || contains(lower, 'golden king') || 
      contains(lower, 'master gold')) {
    return 75 + (hashText(body) % 6);
  }
  // Golden boost: Common Golden body traits (spiky gold, gold eyes, gold 8 bit, gold mega)
  else if (contains(lower, 'gold eyes') || contains(lower, 'spiky gold') || 
           contains(lower, 'gold 8 bit') || contains(lower, 'gold mega')) {
    return 68 + (hashText(body) % 5);
  }
  // High (60-63): Ultimate variants (reduced from 67-70 to compress ultra-rares)
  else if (contains(lower, 'ultimate')) {
    return 60 + (hashText(body) % 4);
  }
  // Medium-High (55-58): Large, mega (non-controller), beast, tower, super
  else if ((contains(lower, 'large') && !contains(lower, 'controller')) || 
           (contains(lower, 'mega') && !contains(lower, 'controller')) || 
           contains(lower, 'beast') || contains(lower, 'tower') || contains(lower, 'super')) {
    return 55 + (hashText(body) % 4);
  }
  // Medium (49-54): Controllers, battle/command boxes
  else if (contains(lower, 'controller') || contains(lower, 'battle box') || contains(lower, 'command box')) {
    return 49 + (hashText(body) % 6);
  }
  // Medium-Low (43-48): Eggs, frogs, bee body, industrial materials
  else if (contains(lower, 'egg') || contains(lower, 'frog') || contains(lower, 'bee body') || 
           contains(lower, 'iron') || contains(lower, 'copper') || contains(lower, 'game boy')) {
    return 43 + (hashText(body) % 6);
  }
  // Low (37-42): Balloon, rabbit, standard heads
  else if (contains(lower, 'balloon') || contains(lower, 'rabbit') || 
           contains(lower, 'head') || contains(lower, 'round') || contains(lower, 'bee pink')) {
    return 37 + (hashText(body) % 6);
  }
  // Very Low (31-36): Small, mini, tiny
  else {
    return 31 + (hashText(body) % 6);
  }
}

// Arms contribution to power (25% weight) - Power arms draw significant energy
function categorizeArmsForPower(arms) {
  if (!arms) return 45;
  
  const lower = arms.toLowerCase();
  
  // Legendary (75-80): Only 1-of-1s
  if (contains(lower, 'master gold') || contains(lower, 'golden king') || 
      contains(lower, 'black king') || contains(lower, '8 bit lazers')) {
    return 75 + (hashText(arms) % 6);
  }
  // Golden boost: Common Golden arms (power arms rainbow lazers gold, rocket up gold, snippers gold)
  else if (contains(lower, 'power arms rainbow lazers gold') || 
           contains(lower, 'rocket up gold') || contains(lower, 'snippers gold')) {
    return 70 + (hashText(arms) % 4);
  }
  // High (60-63): Ultimate, murder arms gold (reduced from 67-70)
  else if (contains(lower, 'ultimate') || contains(lower, 'murder arms gold')) {
    return 60 + (hashText(arms) % 4);
  }
  // Medium-High (52-55): Power arms, rainbow lazers (reduced from 55-58)
  else if (contains(lower, 'power arms') || contains(lower, 'rainbow lazer')) {
    return 52 + (hashText(arms) % 4);
  }
  // Medium (49-54): Rockets, claws, massive, lazers (non-rainbow)
  else if ((contains(lower, 'rocket') || contains(lower, 'claw') || 
            contains(lower, 'massive') || contains(lower, 'lazer')) && 
           !contains(lower, 'rainbow')) {
    return 49 + (hashText(arms) % 6);
  }
  // Medium-Low (43-48): Connectors, cables, mech, 8 bit
  else if (contains(lower, 'connector') || contains(lower, 'cable') || 
           contains(lower, 'mech') || contains(lower, '8 bit')) {
    return 43 + (hashText(arms) % 6);
  }
  // Low (37-42): Hands up variants, large hands
  else if (contains(lower, 'hands up') || contains(lower, 'large hand')) {
    return 37 + (hashText(arms) % 6);
  }
  // Very Low (31-36): Basic hands down, small
  else {
    return 31 + (hashText(arms) % 6);
  }
}

// Legs contribution to power (15% weight)
function categorizeLegsForPower(legs) {
  if (!legs) return 45;
  
  const lower = legs.toLowerCase();
  
  // Legendary (75-80): Only 1-of-1s
  if (contains(lower, 'master gold') || contains(lower, 'golden twin') || 
      contains(lower, 'tri eye gold') || contains(lower, 'gamers')) {
    return 75 + (hashText(legs) % 6);
  }
  // Golden boost: Common Golden legs (mini gold, spiky gold, bendy gold, cable gold, power gold)
  else if ((contains(lower, 'gold') && (contains(lower, 'mini') || contains(lower, 'spiky') || 
           contains(lower, 'bendy') || contains(lower, 'cable') || contains(lower, 'power'))) && 
           !contains(lower, 'master')) {
    return 69 + (hashText(legs) % 4);
  }
  // High (60-63): Ultimate variants (reduced from 67-70)
  else if (contains(lower, 'ultimate')) {
    return 60 + (hashText(legs) % 4);
  }
  // Medium-High (55-58): Strong, chunky, super
  else if (contains(lower, 'strong') || contains(lower, 'chunky') || contains(lower, 'super')) {
    return 55 + (hashText(legs) % 4);
  }
  // Medium (49-54): Industrial, rockets, cables, bendy
  else if (contains(lower, 'industrial') || contains(lower, 'rocket') || 
           contains(lower, 'cable') || contains(lower, 'bendy')) {
    return 49 + (hashText(legs) % 6);
  }
  // Medium-Low (43-48): Midi, balloon, 8 bit
  else if (contains(lower, 'midi') || contains(lower, 'balloon') || contains(lower, '8 bit')) {
    return 43 + (hashText(legs) % 6);
  }
  // Low (37-42): Small, burnt, mini
  else {
    return 37 + (hashText(legs) % 6);
  }
}

// Wings contribution to power (10% weight)
function categorizeWingsForPower(wings) {
  if (!wings) return 40;
  
  const lower = wings.toLowerCase();
  
  // Legendary (75-80): Only 1-of-1s
  if (contains(lower, 'master gold') || contains(lower, 'golden triple') || 
      contains(lower, 'black double angel')) {
    return 75 + (hashText(wings) % 6);
  }
  // Golden boost: Common Golden wings (angel wings gold, bear ears gold, ear muffs gold, triangle up gold)
  else if (contains(lower, 'gold') && (contains(lower, 'angel wings') || contains(lower, 'bear ears') || 
           contains(lower, 'ear muff') || contains(lower, 'triangle up'))) {
    return 69 + (hashText(wings) % 4);
  }
  // High (67-70): Massive engines, power cells
  else if (contains(lower, 'massive engine') || contains(lower, 'power cell')) {
    return 67 + (hashText(wings) % 4);
  }
  // Medium-High (55-58): Rockets, jets, ultimates
  else if (contains(lower, 'rocket') || contains(lower, 'jet') || 
           contains(lower, 'ultimate') || contains(lower, 'engine wing')) {
    return 55 + (hashText(wings) % 4);
  }
  // Medium (49-54): Terminator, triangle up, double wings
  else if (contains(lower, 'terminator') || contains(lower, 'triangle up') || contains(lower, 'double')) {
    return 49 + (hashText(wings) % 6);
  }
  // Medium-Low (43-48): Angels, butterfly, antennas
  else if (contains(lower, 'angel') || contains(lower, 'butterfly') || 
           contains(lower, 'antenna') || contains(lower, 'bear')) {
    return 43 + (hashText(wings) % 6);
  }
  // Low (37-42): 8 bit, decorative
  else if (contains(lower, '8 bit') || contains(lower, 'bird') || 
           contains(lower, 'bee') || contains(lower, 'bone')) {
    return 37 + (hashText(wings) % 6);
  }
  // Very Low (31-36): Blank, inflatable
  else {
    return 31 + (hashText(wings) % 6);
  }
}

// ===== ACCELERATION CATEGORIZATION FUNCTIONS =====

// Legs contribution to acceleration (50% weight) - Quick response and agility
function categorizeLegsForAccel(legs) {
  if (!legs) return 45;
  
  const lower = legs.toLowerCase();
  
  // Legendary (75-80): Only 1-of-1s
  if (contains(lower, 'master gold') || contains(lower, '4 power stalks') || 
      contains(lower, '8 bit power') || contains(lower, 'cactus gold')) {
    return 75 + (hashText(legs) % 6);
  }
  // High (67-70): Ultimate, super fast
  else if (contains(lower, 'ultimate') || contains(lower, 'super fast')) {
    return 67 + (hashText(legs) % 4);
  }
  // Medium-High (55-58): Super legs, spiky, bird claw, frog
  else if (contains(lower, 'super leg') || contains(lower, 'spiky') || 
           contains(lower, 'bird claw') || contains(lower, 'frog')) {
    return 55 + (hashText(legs) % 4);
  }
  // Medium (49-54): Bendy, midi, cables - agile movement
  else if (contains(lower, 'bendy') || contains(lower, 'midi') || contains(lower, 'cable')) {
    return 49 + (hashText(legs) % 6);
  }
  // Medium-Low (43-48): Power, 8 bit, rockets
  else if (contains(lower, 'power') || contains(lower, '8 bit') || contains(lower, 'rocket')) {
    return 43 + (hashText(legs) % 6);
  }
  // Low (37-42): Chunky, large, heavy legs (slow acceleration)
  else if (contains(lower, 'chunky') || contains(lower, 'large') || 
           contains(lower, 'burnt') || contains(lower, 'rust')) {
    return 37 + (hashText(legs) % 6);
  }
  // Very Low (31-36): Small, balloon, inflatable
  else {
    return 31 + (hashText(legs) % 6);
  }
}

// Arms contribution to acceleration (20% weight)
function categorizeArmsForAccel(arms) {
  if (!arms) return 45;
  
  const lower = arms.toLowerCase();
  
  // Legendary (75-80): Only 1-of-1s
  if (contains(lower, 'master gold') || contains(lower, 'golden king') || 
      contains(lower, 'black king') || contains(lower, '8 bit lazers')) {
    return 75 + (hashText(arms) % 6);
  }
  // Golden boost: Power arms rainbow lazers gold, rocket up gold, snippers gold
  else if (contains(lower, 'power arms rainbow lazers gold') || 
           contains(lower, 'rocket up gold') || contains(lower, 'snippers gold')) {
    return 70 + (hashText(arms) % 4);
  }
  // High (67-70): Ultimate, murder arms gold
  else if (contains(lower, 'ultimate') || contains(lower, 'murder arms gold')) {
    return 67 + (hashText(arms) % 4);
  }
  // Medium-High (55-58): Rainbow lazers, power jets - quick thrust
  else if (contains(lower, 'rainbow lazer') || contains(lower, 'power jet')) {
    return 55 + (hashText(arms) % 4);
  }
  // Medium (49-54): Rockets, lazers, chainsaws
  else if ((contains(lower, 'rocket') || contains(lower, 'lazer') || contains(lower, 'chainsaw')) && 
           !contains(lower, 'rainbow')) {
    return 49 + (hashText(arms) % 6);
  }
  // Medium-Low (43-48): Claws, power arms, connectors
  else if (contains(lower, 'claw') || contains(lower, 'power arms') || 
           contains(lower, 'connector') || contains(lower, '8 bit')) {
    return 43 + (hashText(arms) % 6);
  }
  // Low (37-42): Hands up variants
  else if (contains(lower, 'hands up') || contains(lower, 'large hand')) {
    return 37 + (hashText(arms) % 6);
  }
  // Very Low (31-36): Basic hands
  else {
    return 31 + (hashText(arms) % 6);
  }
}

// Wings contribution to acceleration (20% weight)
function categorizeWingsForAccel(wings) {
  if (!wings) return 40;
  
  const lower = wings.toLowerCase();
  
  // Legendary (75-80): Only 1-of-1s
  if (contains(lower, 'master gold') || contains(lower, 'golden triple') || 
      contains(lower, 'black double angel')) {
    return 75 + (hashText(wings) % 6);
  }
  // High (67-70): Massive engines, power cells - highest thrust
  else if (contains(lower, 'massive engine') || contains(lower, 'power cell')) {
    return 67 + (hashText(wings) % 4);
  }
  // Medium-High (55-58): Rockets, jets, triangle up - quick acceleration
  else if (contains(lower, 'rocket') || contains(lower, 'jet') || contains(lower, 'triangle up')) {
    return 55 + (hashText(wings) % 4);
  }
  // Medium (49-54): Ultimates, terminators, double wings
  else if (contains(lower, 'ultimate') || contains(lower, 'terminator') || contains(lower, 'double')) {
    return 49 + (hashText(wings) % 6);
  }
  // Medium-Low (43-48): Butterfly, angels, antennas - moderate flap acceleration
  else if (contains(lower, 'butterfly') || contains(lower, 'angel') || 
           contains(lower, 'antenna') || contains(lower, 'bear')) {
    return 43 + (hashText(wings) % 6);
  }
  // Low (37-42): 8 bit, bird, decorative
  else if (contains(lower, '8 bit') || contains(lower, 'bird') || 
           contains(lower, 'bee') || contains(lower, 'bone')) {
    return 37 + (hashText(wings) % 6);
  }
  // Very Low (31-36): Blank, inflatable - no thrust
  else {
    return 31 + (hashText(wings) % 6);
  }
}

// Body contribution to acceleration (10% weight, INVERSE) - Lighter = faster accel
function categorizeBodyForAccel(body) {
  if (!body) return 50;
  
  const lower = body.toLowerCase();
  
  // Legendary (75-80): Only 1-of-1s (but inverse - light bodies score high)
  if (contains(lower, '8 bit master') || contains(lower, 'double driver') || 
      contains(lower, 'gold pets') || contains(lower, 'golden king') || 
      contains(lower, 'master gold')) {
    return 75 + (hashText(body) % 6);
  }
  // High (67-70): Eggs, balloons - very light for quick acceleration
  else if (contains(lower, 'egg') || contains(lower, 'balloon') || contains(lower, 'bubble')) {
    return 67 + (hashText(body) % 4);
  }
  // Medium-High (55-58): Small, mini, game boy - light bodies
  else if (contains(lower, 'small') || contains(lower, 'mini') || contains(lower, 'game boy')) {
    return 55 + (hashText(body) % 4);
  }
  // Medium (49-54): Frogs, bee bodies, rabbits - moderate weight
  else if (contains(lower, 'frog') || contains(lower, 'bee body') || 
           contains(lower, 'rabbit') || contains(lower, 'head')) {
    return 49 + (hashText(body) % 6);
  }
  // Medium-Low (43-48): Controllers, boxes - medium weight slows acceleration
  else if (contains(lower, 'controller') || contains(lower, 'battle box') || 
           contains(lower, 'command box')) {
    return 43 + (hashText(body) % 6);
  }
  // Low (37-42): Large, mega (non-controller), beast - heavy
  else if ((contains(lower, 'large') && !contains(lower, 'controller')) || 
           (contains(lower, 'mega') && !contains(lower, 'controller')) || 
           contains(lower, 'beast') || contains(lower, 'tower')) {
    return 37 + (hashText(body) % 6);
  }
  // Very Low (31-36): Ultimate, super - heaviest bodies slow acceleration
  else if (contains(lower, 'ultimate') || contains(lower, 'super')) {
    return 31 + (hashText(body) % 6);
  }
  // Default Medium (45-50)
  else {
    return 45 + (hashText(body) % 6);
  }
}

// ===== STABILITY CATEGORIZATION FUNCTIONS =====

// Driver contribution to stability (40% weight) - Skill is primary factor
function categorizeDriverForStability(driver) {
  if (!driver) return 45;
  
  const lower = driver.toLowerCase();
  
  // Legendary (75-80): Only 1-of-1s
  if (contains(lower, 'master gold') || contains(lower, 'golden twin') || 
      contains(lower, 'tri eye gold') || contains(lower, 'gamers')) {
    return 75 + (hashText(driver) % 6);
  }
  // Golden boost: Common Golden drivers (gold snes, gold tounge, gold circuits, gold colour)
  else if (contains(lower, 'gold') && (contains(lower, 'snes') || contains(lower, 'tounge') || 
           contains(lower, 'circuit') || contains(lower, 'colour'))) {
    return 69 + (hashText(driver) % 4);
  }
  // High (67-70): Ultimate, helmets, visors - best focus
  else if (contains(lower, 'ultimate') || contains(lower, 'helmet') || contains(lower, 'visor')) {
    return 67 + (hashText(driver) % 4);
  }
  // Medium-High (55-58): Metal goggles, diamond eyes - professional gear
  else if (contains(lower, 'metal goggles') || contains(lower, 'diamond eyes')) {
    return 55 + (hashText(driver) % 4);
  }
  // Medium (49-54): Headphones, game boy, pixels - gaming focus
  else if (contains(lower, 'headphones') || contains(lower, 'game boy') || 
           contains(lower, 'pixel') || contains(lower, 'snes') || contains(lower, 'gamer')) {
    return 49 + (hashText(driver) % 6);
  }
  // Medium-Low (43-48): Standard colors, hair, tounge, rabbits
  else if (contains(lower, 'blue') || contains(lower, 'green') || 
           contains(lower, 'yellow') || contains(lower, 'purple') || 
           contains(lower, 'tounge') || contains(lower, 'rabbit') || 
           contains(lower, 'hair') || contains(lower, 'red') || contains(lower, 'gold')) {
    return 43 + (hashText(driver) % 6);
  }
  // Low (37-42): Eyes closed, dead eyes, big eyes - impaired vision
  else if (contains(lower, 'eyes closed') || contains(lower, 'dead eyes') || 
           contains(lower, 'big eyes') || contains(lower, 'glitch')) {
    return 37 + (hashText(driver) % 6);
  }
  // Very Low (31-36): Remaining
  else {
    return 31 + (hashText(driver) % 6);
  }
}

// Body contribution to stability (30% weight) - Wide/low = stable
function categorizeBodyForStability(body) {
  if (!body) return 50;
  
  const lower = body.toLowerCase();
  
  // Legendary (75-80): Only 1-of-1s
  if (contains(lower, '8 bit master') || contains(lower, 'double driver') || 
      contains(lower, 'gold pets') || contains(lower, 'golden king') || 
      contains(lower, 'master gold')) {
    return 75 + (hashText(body) % 6);
  }
  // High (67-70): Ultimate - most stable design
  else if (contains(lower, 'ultimate')) {
    return 67 + (hashText(body) % 4);
  }
  // Medium-High (55-58): Battle/command boxes, mega controllers - wide stable bases
  else if (contains(lower, 'battle box') || contains(lower, 'command box') || 
           contains(lower, 'mega controller') || contains(lower, 'beast')) {
    return 55 + (hashText(body) % 4);
  }
  // Medium (49-54): Controllers, eggs, round - moderate stability
  else if (contains(lower, 'controller') || contains(lower, 'egg') || 
           contains(lower, 'round') || contains(lower, 'iron')) {
    return 49 + (hashText(body) % 6);
  }
  // Medium-Low (43-48): Frogs, rabbits, bee bodies - decent balance
  else if (contains(lower, 'frog') || contains(lower, 'rabbit') || 
           contains(lower, 'bee body') || contains(lower, 'game boy')) {
    return 43 + (hashText(body) % 6);
  }
  // Low (37-42): Balloon, bubble, tower - wobbly/unstable
  else if (contains(lower, 'balloon') || contains(lower, 'bubble') || 
           contains(lower, 'tower') || contains(lower, 'spiky egg')) {
    return 37 + (hashText(body) % 6);
  }
  // Very Low (31-36): Small, mini - unstable
  else {
    return 31 + (hashText(body) % 6);
  }
}

// Legs contribution to stability (20% weight) - Strong stance
function categorizeLegsForStability(legs) {
  if (!legs) return 45;
  
  const lower = legs.toLowerCase();
  
  // Legendary (75-80): Only 1-of-1s
  if (contains(lower, 'master gold') || contains(lower, '4 power stalks') || 
      contains(lower, '8 bit power') || contains(lower, 'cactus gold')) {
    return 75 + (hashText(legs) % 6);
  }
  // High (67-70): Ultimate - best stability
  else if (contains(lower, 'ultimate')) {
    return 67 + (hashText(legs) % 4);
  }
  // Medium-High (55-58): Strong, chunky, industrial - stable stance
  else if (contains(lower, 'strong') || contains(lower, 'chunky') || 
           contains(lower, 'industrial') || contains(lower, 'bird claw')) {
    return 55 + (hashText(legs) % 4);
  }
  // Medium (49-54): Power, super, rockets - decent stability
  else if (contains(lower, 'power') || contains(lower, 'super') || contains(lower, 'rocket')) {
    return 49 + (hashText(legs) % 6);
  }
  // Medium-Low (43-48): Midi, cables, bendy, 8 bit - moderate stability
  else if (contains(lower, 'midi') || contains(lower, 'cable') || 
           contains(lower, 'bendy') || contains(lower, '8 bit')) {
    return 43 + (hashText(legs) % 6);
  }
  // Low (37-42): Small, balloon, burnt - unstable
  else if (contains(lower, 'small') || contains(lower, 'balloon') || 
           contains(lower, 'burnt') || contains(lower, 'inflatable')) {
    return 37 + (hashText(legs) % 6);
  }
  // Very Low (31-36): Remaining unstable types
  else {
    return 31 + (hashText(legs) % 6);
  }
}

// Arms contribution to stability (10% weight) - Balance assistance
function categorizeArmsForStability(arms) {
  if (!arms) return 45;
  
  const lower = arms.toLowerCase();
  
  // Legendary (75-80): Only 1-of-1s
  if (contains(lower, 'master gold') || contains(lower, 'golden king') || 
      contains(lower, 'black king') || contains(lower, '8 bit lazers')) {
    return 75 + (hashText(arms) % 6);
  }
  // High (67-70): Ultimate, murder arms gold
  else if (contains(lower, 'ultimate') || contains(lower, 'murder arms gold')) {
    return 67 + (hashText(arms) % 4);
  }
  // Medium-High (55-58): Power arms, grippers, claws - balance assistance
  else if (contains(lower, 'power arms') || contains(lower, 'gripper') || 
           contains(lower, 'claw') || contains(lower, 'strong')) {
    return 55 + (hashText(arms) % 4);
  }
  // Medium (49-54): Connectors, cables, rockets - moderate balance help
  else if (contains(lower, 'connector') || contains(lower, 'cable') || 
           contains(lower, 'rocket') || contains(lower, 'mech')) {
    return 49 + (hashText(arms) % 6);
  }
  // Medium-Low (43-48): 8 bit, hands up - some stability
  else if (contains(lower, '8 bit') || contains(lower, 'hands up') || contains(lower, 'large hand')) {
    return 43 + (hashText(arms) % 6);
  }
  // Low (37-42): Hands down variants
  else if (contains(lower, 'hands down')) {
    return 37 + (hashText(arms) % 6);
  }
  // Very Low (31-36): Basic arms - minimal balance help
  else {
    return 31 + (hashText(arms) % 6);
  }
}

// Derive faction from Type trait (returns actual Type value)
function deriveFaction(traits) {
  // Convert trait array to map
  const traitMap = {};
  for (const [traitId, valueId] of traits) {
    traitMap[traitId] = getTraitValue(traitId, valueId);
  }
  
  // Find the type trait (ID 0)
  const typeValue = traitMap[0];
  
  if (!typeValue) return 'Industrial'; // Default to most common
  
  // Return the actual Type value
  return typeValue;
}

// Apply faction bonuses based on Type rarity and thematic fit
// 25% reduction from original values to leave room for upgrades
// Rarity tiers: Ultra-Rare (1-45), Super-Rare (244-640), Rare (717-999), Common (1654-2009)
function applyFactionBonus(baseStat, faction, statType) {
  let bonus = 0;
  
  switch (faction) {
    // ===== ULTRA-RARE TIER (1-45 bots) - Elite tier, their own league =====
    case 'Ultimate-master': // 1 bot - THE ULTIMATE
      bonus = 6;
      break;
      
    case 'Golden': // 27 bots - Premium engineering (already has gold trait bonuses)
      if (statType === 'powerCore') bonus = 5;
      else if (statType === 'stability') bonus = 4;
      else bonus = 3;
      break;
      
    case 'Wild': // 5 bots - Unpredictable chaos
      if (statType === 'acceleration') bonus = 8;
      else if (statType === 'speed') bonus = 7;
      else bonus = 5;
      break;
      
    case 'Ultimate': // 45 bots - Combat excellence
      if (statType === 'speed') bonus = 5;
      else if (statType === 'powerCore') bonus = 5;
      else bonus = 3;
      break;
    
    // ===== SUPER-RARE TIER (244-640 bots) - Major bonuses =====
    case 'Blackhole': // 244 bots - Gravity-defying power
      if (statType === 'powerCore') bonus = 18;
      else if (statType === 'acceleration') bonus = 16;
      else bonus = 13;
      break;
      
    case 'Dead': // 382 bots - Undead resilience
      if (statType === 'stability') bonus = 13;
      else if (statType === 'powerCore') bonus = 12;
      else bonus = 9;
      break;
      
    case 'Master': // 640 bots - Skilled operators
      if (statType === 'speed') bonus = 14;
      else if (statType === 'stability') bonus = 14;
      else bonus = 11;
      break;
    
    // ===== RARE TIER (717-999 bots) - Solid bonuses =====
    case 'Bee': // 717 bots - Agile flyers
      if (statType === 'acceleration') bonus = 10;
      else if (statType === 'speed') bonus = 8;
      else bonus = 6;
      break;
      
    case 'Food': // 778 bots - Energy-rich cores
      if (statType === 'powerCore') bonus = 11;
      else if (statType === 'acceleration') bonus = 10;
      else bonus = 8;
      break;
      
    case 'Box': // 798 bots - Stable platforms
      if (statType === 'stability') bonus = 7;
      else if (statType === 'powerCore') bonus = 5;
      else bonus = 3;
      break;
      
    case 'Murder': // 999 bots - Aggressive power
      if (statType === 'speed') bonus = 8;
      else if (statType === 'powerCore') bonus = 8;
      else bonus = 5;
      break;
    
    // ===== COMMON TIER (1654-2009 bots) - Balanced bonuses =====
    case 'Game': // 1654 bots - Precision controls
      if (statType === 'acceleration') bonus = 3;
      else if (statType === 'stability') bonus = 3;
      else bonus = 1;
      break;
      
    case 'Animal': // 1701 bots - Natural agility
      if (statType === 'acceleration') bonus = 3;
      else if (statType === 'speed') bonus = 2;
      else bonus = 1;
      break;
      
    case 'Industrial': // 2009 bots - Workhorse reliability
      if (statType === 'powerCore') bonus = 0;
      else if (statType === 'stability') bonus = 0;
      else bonus = 0;
      break;
    
    // Fallback
    default:
      bonus = 2;
      break;
  }
  
  return Math.min(100, baseStat + bonus);
}

// Main derivation function (using 0-70 stat range instead of 30-100)
function deriveStats(traits, faction) {
  // Convert trait array [[traitId, valueId], ...] to a map
  const traitMap = {};
  for (const [traitId, valueId] of traits) {
    traitMap[traitId] = getTraitValue(traitId, valueId);
  }
  
  // Extract trait values by ID
  const body = traitMap[1] || null;       // Body
  const driver = traitMap[2] || null;     // Driver
  const arms = traitMap[3] || null;       // Arms
  const legs = traitMap[4] || null;       // Legs
  const wings = traitMap[5] || null;      // Wings
  
  // Check for special attribute bonuses (gold, rust, black, pink, blue)
  // These are trait IDs 7, 8, 9, 10, 11 with numeric values > 0
  const hasGold = traitMap[7] && traitMap[7] !== '0';
  const hasRust = traitMap[8] && traitMap[8] !== '0';
  const hasBlack = traitMap[9] && traitMap[9] !== '0';
  const hasPink = traitMap[10] && traitMap[10] !== '0';
  const hasBlue = traitMap[11] && traitMap[11] !== '0';
  
  const goldBonus = hasGold ? 8 : 0;       // +8 to all stats
  const rustPenalty = hasRust ? -5 : 0;     // -5 to power/stability
  const blackBonus = hasBlack ? 6 : 0;      // +6 to speed/acceleration
  const pinkBonus = hasPink ? 4 : 0;        // +4 to stability
  const blueBonus = hasBlue ? 5 : 0;        // +5 to power core
  
  // STAT RANGE: 0-70 base (reduced from 30-100 for upgrade headroom)
  // Categorization functions return 30-80, so we subtract 30 to get 0-50 range
  const COMPRESSION_OFFSET = 30;
  
  // Speed = Legs (40%) + Wings (30%) + Body (20%) + Arms (10%)
  const rawSpeed = 
    (categorizeLegsForSpeed(legs) - COMPRESSION_OFFSET) * 0.4 +
    (categorizeWingsForSpeed(wings) - COMPRESSION_OFFSET) * 0.3 +
    (categorizeBodyForSpeed(body) - COMPRESSION_OFFSET) * 0.2 +
    (categorizeArmsForSpeed(arms) - COMPRESSION_OFFSET) * 0.1;
  const baseSpeed = Math.min(70, Math.max(0, Math.floor(rawSpeed) + goldBonus + blackBonus));
  
  // Power = Body (50%) + Arms (25%) + Legs (15%) + Wings (10%)
  const rawPower = 
    (categorizeBodyForPower(body) - COMPRESSION_OFFSET) * 0.5 +
    (categorizeArmsForPower(arms) - COMPRESSION_OFFSET) * 0.25 +
    (categorizeLegsForPower(legs) - COMPRESSION_OFFSET) * 0.15 +
    (categorizeWingsForPower(wings) - COMPRESSION_OFFSET) * 0.1;
  const basePowerCore = Math.min(70, Math.max(0, Math.floor(rawPower) + goldBonus + blueBonus + rustPenalty));
  
  // Acceleration = Legs (50%) + Arms (20%) + Wings (20%) + Body (10%)
  const rawAccel = 
    (categorizeLegsForAccel(legs) - COMPRESSION_OFFSET) * 0.5 +
    (categorizeArmsForAccel(arms) - COMPRESSION_OFFSET) * 0.2 +
    (categorizeWingsForAccel(wings) - COMPRESSION_OFFSET) * 0.2 +
    (categorizeBodyForAccel(body) - COMPRESSION_OFFSET) * 0.1;
  const baseAcceleration = Math.min(70, Math.max(0, Math.floor(rawAccel) + goldBonus + blackBonus));
  
  // Stability = Driver (40%) + Body (30%) + Legs (20%) + Arms (10%)
  const rawStability = 
    (categorizeDriverForStability(driver) - COMPRESSION_OFFSET) * 0.4 +
    (categorizeBodyForStability(body) - COMPRESSION_OFFSET) * 0.3 +
    (categorizeLegsForStability(legs) - COMPRESSION_OFFSET) * 0.2 +
    (categorizeArmsForStability(arms) - COMPRESSION_OFFSET) * 0.1;
  const baseStability = Math.min(70, Math.max(0, Math.floor(rawStability) + goldBonus + pinkBonus + rustPenalty));
  
  // Apply faction bonuses
  const speed = applyFactionBonus(baseSpeed, faction, 'speed');
  const powerCore = applyFactionBonus(basePowerCore, faction, 'powerCore');
  const acceleration = applyFactionBonus(baseAcceleration, faction, 'acceleration');
  const stability = applyFactionBonus(baseStability, faction, 'stability');
  
  return { speed, powerCore, acceleration, stability, faction };
}

// Process all NFTs
const output = {
  stats: []
};

console.log(`Generating pre-computed stats for ${bots.length} NFTs...`);

for (const [botId, traits] of bots) {
  const tokenId = typeof botId === 'bigint' ? Number(botId) : botId;
  
  const faction = deriveFaction(traits);
  const stats = deriveStats(traits, faction);
  
  output.stats.push({
    tokenId,
    ...stats
  });
  
  if (tokenId % 1000 === 0) {
    console.log(`Processed ${tokenId} NFTs...`);
  }
}

// Write output
const outputPath = path.join(__dirname, '../data/precomputed-stats.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`\nGeneration complete!`);
console.log(`Output written to: ${outputPath}`);
console.log(`Total NFTs processed: ${bots.length}`);
console.log(`File size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
