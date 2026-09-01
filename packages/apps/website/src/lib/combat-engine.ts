/**
 * PokedBots Brawl Combat Simulation Engine (Frontend POC)
 * 
 * Deterministic tick-based combat simulation with APL (Action Priority List) system
 */

export type Class = 'Bulwark' | 'Striker' | 'Fixer' | 'Tactician';
export type Faction = 
  | 'Ultimate-master' | 'Wild' | 'Golden' | 'Ultimate' | 'Blackhole' | 'Dead' | 'Master'
  | 'Bee' | 'Food' | 'Box' | 'Murder' | 'Game' | 'Animal' | 'Industrial';

export type AttackType = 'melee' | 'ranged';
export type ResourceType = 'mana' | 'rage';
export type DamageType = 'physical' | 'magical';
export type AbilityTarget = 'self' | 'enemy' | 'ally' | 'all-enemies' | 'all-allies';

// Core ability types used across factions
export enum AbilityType {
  // Generic
  BASIC_ATTACK = 'basic_attack',
  MAIN_ABILITY = 'main_ability',
  
  // Class core abilities
  TAUNT = 'taunt',
  EXECUTE = 'execute',
  EMERGENCY_HEAL = 'emergency_heal',
  BATTLE_COMMAND = 'battle_command',
  FEINT = 'feint',                // DPS threat reduction
  FADE = 'fade',                  // Healer threat reduction
  
  // Faction special abilities
  OMNIPRESENT_SHIELD = 'omnipresent_shield',        // Ultimate-master Bulwark: Party immunity to one killing blow
  EXISTENTIAL_CRISIS = 'existential_crisis',        // Ultimate-master Striker: Enemy +25% damage taken
  LIFEGIVER = 'lifegiver',                          // Ultimate-master Fixer: Revive dead ally
  OMNISCIENCE = 'omniscience',                      // Ultimate-master Tactician: See enemy abilities 5s early
  
  REALITY_DISTORTION = 'reality_distortion',        // Wild Bulwark: 15% phase through
  CHAOS_ENGINE = 'chaos_engine',                    // Wild Striker: Crits apply random debuff
  REALITY_PATCH = 'reality_patch',                  // Wild Fixer: Heal + remove random debuff
  CHAOS_FORECAST = 'chaos_forecast',                // Wild Tactician: Random buff to random ally
  
  PERFECT_DEFENSE = 'perfect_defense',              // Ultimate Bulwark: Party -10% damage taken
  WEAK_POINT = 'weak_point',                        // Ultimate Striker: Reduce armor on crit
  NANO_SURGEON = 'nano_surgeon',                    // Ultimate Fixer: Heal +15% effective
  OPTIMIZATION = 'optimization',                    // Ultimate Tactician: Party cooldowns -10%
  
  GRAVITATIONAL_PULL = 'gravitational_pull',        // Blackhole Bulwark: Enemies -15% attack speed
  CRUSHING_SINGULARITY = 'crushing_singularity',    // Blackhole Striker: Execute <20% HP
  EVENT_HORIZON = 'event_horizon',                  // Blackhole Fixer: Shield converts to heal
  TIME_DILATION = 'time_dilation',                  // Blackhole Tactician: Party +10% speed
  
  UNDYING_PRESENCE = 'undying_presence',            // Dead Bulwark: Low HP allies -30% damage taken
  LIFE_DRAIN = 'life_drain',                        // Dead Striker: Party heals 5% of damage
  SACRIFICIAL_PACT = 'sacrificial_pact',            // Dead Fixer: Heal costs HP but 50% stronger
  DEATHS_HERALD = 'deaths_herald',                  // Dead Tactician: Enemies can't heal 15s
  
  TACTICAL_FORMATION = 'tactical_formation',        // Master Bulwark: Nearby allies +10% armor
  COORDINATED_STRIKE = 'coordinated_strike',        // Master Striker: First attack guaranteed crit
  TRIAGE_PROTOCOL = 'triage_protocol',              // Master Fixer: Auto-heal lowest HP ally
  BATTLE_PLAN = 'battle_plan',                      // Master Tactician: Damage +2% every 10s (stacks)
  
  HIVE_MIND = 'hive_mind',                          // Bee Bulwark: Each ally +5% threat gen
  OVERWHELMING_NUMBERS = 'overwhelming_numbers',    // Bee Striker: Reduce enemy evasion
  POLLINATION = 'pollination',                      // Bee Fixer: Heal spreads 30% to adjacent
  COORDINATION = 'coordination',                    // Bee Tactician: Nearby allies +10% damage
  
  FEAST_AURA = 'feast_aura',                        // Food Bulwark: Party regen 1% HP/5s
  FLAVOR_BURST = 'flavor_burst',                    // Food Striker: Enemies +10% elemental damage
  FEAST = 'feast',                                  // Food Fixer: AoE heal + restore energy
  INTOXICATE = 'intoxicate',                        // Food Tactician: Debuffs last +25% longer
  
  SEALED_FORTRESS = 'sealed_fortress',              // Box Bulwark: First hit -50% damage
  SURPRISE_ATTACK = 'surprise_attack',              // Box Striker: 20% chance ignore armor
  STASIS_FIELD = 'stasis_field',                    // Box Fixer: Freeze ally for immunity
  LOCKBOX = 'lockbox',                              // Box Tactician: Seal one enemy ability
  
  BLOOD_SHIELD = 'blood_shield',                    // Murder Bulwark: 5% damage grants temp HP
  ASSASSINATE = 'assassinate',                      // Murder Striker: High HP targets +30% damage
  TRANSFUSION = 'transfusion',                      // Murder Fixer: Transfer HP between allies
  EXPOSE_WEAKNESS = 'expose_weakness',              // Murder Tactician: Reveal enemy's lowest resistance
  
  WILD_CARD_DEFENSE = 'wild_card_defense',          // Game Bulwark: Random ally gets 3s immunity
  JACKPOT = 'jackpot',                              // Game Striker: Every 5th attack auto-crits
  DOUBLE_OR_NOTHING = 'double_or_nothing',          // Game Fixer: Random heal 0.5x-2x
  GAMBIT = 'gambit',                                // Game Tactician: Random powerful buff
  
  PACK_LEADER = 'pack_leader',                      // Animal Bulwark: Low HP allies +15% evasion
  HUNTERS_MARK = 'hunters_mark',                    // Animal Striker: Wounded targets +15% damage
  REGENERATION = 'regeneration',                    // Animal Fixer: HoT effects +25% stronger
  HOWL = 'howl',                                    // Animal Tactician: Party attack speed +15%
  
  HEAT_SHIELD = 'heat_shield',                      // Industrial Bulwark: Damage converts to attack buff
  CRUSH = 'crush',                                  // Industrial Striker: Ignore 30% armor
  SPOT_WELD = 'spot_weld',                          // Industrial Fixer: Heal + restore 5% highest stat
  OVERCHARGE = 'overcharge',                        // Industrial Tactician: Abilities cost -20% resource
  
  // Generic healing
  HEAL = 'heal',
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  abilityType?: AbilityType;  // Optional: Special mechanics implementation
  damageType?: DamageType;    // Physical (mitigated by stability) or Magical (mitigated by acceleration)
  resourceCost: number;      // 0 for basic attacks (generators), >0 for main abilities (spenders)
  resourceGeneration: number; // How much resource this generates (for basic attacks)
  damage?: number;            // Base damage (scaled by powerCore)
  healing?: number;           // Base healing (scaled by powerCore)
  targetType: AbilityTarget;
  cooldown?: number;          // In ticks (10 ticks = 1 second)
  castTime?: number;          // Cast time in ticks
  maxRange: number;           // Maximum range
  minRange?: number;          // Minimum range (default 0)
  threatMultiplier?: number; // Threat generation multiplier (default 1.0, Taunt=2.0, basic=0.5)
}

export interface Position {
  x: number;  // 0-4 (5 columns)
  y: number;  // 0-2 (3 rows: front, middle, back)
}

export interface BotStats {
  stability: number;    // Armor/defense
  powerCore: number;    // Damage/healing
  acceleration: number; // Attack speed & movement speed
  speed: number;        // Crit chance & dodge
}

export interface APLRule {
  condition: string;
  abilityId: string;          // References Ability.id (e.g., 'taunt', 'assassinate', 'basic_attack')
}

export interface CombatBot {
  id: string;
  name: string;
  tokenId?: number;  // EXT NFT tokenId for avatar display
  faction: Faction;
  class: Class;
  stats: BotStats;
  level: number;           // Rating/level for WoW-style scaling
  attackType: AttackType;  // melee or ranged
  
  // APL System
  apl: APLRule[];
  
  // Abilities - bot has access to multiple abilities
  abilities: Ability[];       // All abilities this bot can use
  abilityCooldowns: Map<string, number>; // Track last cast tick for each ability
  
  // Deprecated: Keep for backwards compat during transition
  basicAttack: Ability;       
  mainAbility: Ability;       
  
  // Combat state
  hp: number;
  maxHp: number;
  resource: number;           // Mana/Energy (0-100, like TFT)
  maxResource: number;        // Usually 100
  resourceType: ResourceType; // 'mana' for casters/healers, 'rage' for melee/tanks
  energy: number;             // Keep for backwards compat (can remove later)
  maxEnergy: number;
  threat: number;
  
  // Cooldowns (in ticks) - deprecated, use abilityCooldowns instead
  lastBasicAttack: number;    
  lastMainAbility: number;
  lastCastTick: number;        // Last tick this bot cast any spell (for mana regen)
  
  // Positioning
  position: Position;
  targetPosition: Position | null;  // Where they're trying to move
  isMoving: boolean;
  currentTargetId: string | null;  // Persistent target to avoid switching
  
  // Status
  isDead: boolean;
  pendingDeath: boolean;      // Died this tick, will be removed next tick
  buffs: StatusEffect[];
  debuffs: StatusEffect[];
}

export interface StatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  duration: number;
  effect: {
    stat?: keyof BotStats;
    modifier?: number;
    damageOverTime?: number;
    healOverTime?: number;
    damageAmplification?: number;
    damageReduction?: number;
    firstHitReduction?: number;
    damageToAttack?: number;
    evasion?: number;
    shield?: number;
    damageSharing?: number;
    stun?: boolean;
    statBoost?: number;
    allStats?: number;
    cooldownReduction?: number;
    accuracy?: number;
  };
}

export interface CombatAction {
  tick: number;
  sequence: number;          // Order within the tick
  actorId: string;
  actorName: string;
  targetId: string;
  targetName: string;
  actionType: 'attack' | 'heal' | 'buff' | 'taunt' | 'basic_attack' | 'ability' | 'death' | 'move';
  value: number;
  isCrit: boolean;
  description: string;
  // State changes for replay
  newActorHp?: number;
  newActorResource?: number;    // Track resource for replay
  newActorTargetId?: string;    // Track current target for arrows
  newActorThreat?: number;      // Track threat for replay
  newTargetHp?: number;
  newActorPosition?: Position;
  newTargetPosition?: Position;
  actorDied?: boolean;
  targetDied?: boolean;
}

export interface CombatResult {
  winningTeam: 'party' | 'enemy' | 'draw';
  totalTicks: number;
  actions: CombatAction[];
  finalState: {
    party: CombatBot[];
    enemy: CombatBot[];
  };
  initialState: {
    party: CombatBot[];
    enemy: CombatBot[];
  };
}

// Faction-Class passive abilities (simplified for POC)
const FACTION_ABILITIES: Record<Faction, Record<Class, string>> = {
  'Ultimate-master': {
    Bulwark: 'Party immunity to one killing blow',
    Striker: 'Enemies take +25% damage',
    Fixer: 'Can revive dead ally once',
    Tactician: 'Party sees enemy abilities 5s early'
  },
  'Wild': {
    Bulwark: '15% chance attacks phase through',
    Striker: 'Crits apply random debuff',
    Fixer: 'Heals remove random debuff',
    Tactician: 'Shuffles enemy priorities'
  },
  'Golden': {
    Bulwark: 'Low HP grants party +50% damage',
    Striker: 'Crits deal +20% holy damage',
    Fixer: 'Overheals grant shields',
    Tactician: 'Party +15% crit chance'
  },
  'Ultimate': {
    Bulwark: 'Party takes -10% damage',
    Striker: 'Each crit reduces enemy armor',
    Fixer: 'Heals +15% effective',
    Tactician: 'Party cooldowns -10%'
  },
  'Blackhole': {
    Bulwark: 'Enemies attack 15% slower',
    Striker: 'Execute at <20% HP',
    Fixer: 'Damage converts to heal',
    Tactician: 'Party +10% speed'
  },
  'Dead': {
    Bulwark: 'Low HP allies take -30% damage',
    Striker: 'Party heals 5% of damage',
    Fixer: 'Heals cost HP but stronger',
    Tactician: 'Enemies cannot be healed'
  },
  'Master': {
    Bulwark: 'Nearby allies +10% armor',
    Striker: 'First attack each turn crits',
    Fixer: 'Auto-heal lowest HP ally',
    Tactician: 'Damage +2% every 10s'
  },
  'Bee': {
    Bulwark: 'Each ally +5% threat gen',
    Striker: 'Each attack -1% enemy evasion',
    Fixer: 'Heals spread to adjacent',
    Tactician: 'Nearby allies +10% damage'
  },
  'Food': {
    Bulwark: 'Party regenerates 1% HP/5s',
    Striker: 'Enemies +10% elemental damage',
    Fixer: 'AoE heals restore energy',
    Tactician: 'Debuffs last +25% longer'
  },
  'Box': {
    Bulwark: 'First hit -50% damage',
    Striker: '20% chance ignore armor',
    Fixer: 'Freeze ally for immunity',
    Tactician: 'Seal one enemy ability'
  },
  'Murder': {
    Bulwark: 'Damage dealt grants temp HP',
    Striker: 'High HP targets +30% damage',
    Fixer: 'Transfer HP between allies',
    Tactician: 'Reveal enemy weakness'
  },
  'Game': {
    Bulwark: 'Random ally gets 3s immunity',
    Striker: 'Every 5th attack crits',
    Fixer: '50% chance 2x heal or nothing',
    Tactician: 'Random buff every 20s'
  },
  'Animal': {
    Bulwark: 'Lower HP than tank +15% evasion',
    Striker: 'Wounded targets +15% damage',
    Fixer: 'HoT effects +25% stronger',
    Tactician: 'Party attack speed +15%'
  },
  'Industrial': {
    Bulwark: 'Damage converts to attack buff',
    Striker: 'Ignore 30% armor',
    Fixer: 'Heals restore 5% highest stat',
    Tactician: 'Abilities cost -20% energy'
  }
};

// ============================================================================
// ABILITY DEFINITIONS - 56 Unique Faction × Class Abilities
// ============================================================================

/**
 * Standard Taunt ability for all Bulwarks
 * Forces enemies to target the tank and generates massive threat
 */
const TAUNT_ABILITY: Ability = {
  id: 'taunt',
  name: 'Taunt',
  description: 'Force enemies to attack you and generate high threat',
  abilityType: AbilityType.TAUNT,
  resourceCost: 50,
  resourceGeneration: 0,
  damage: 25,
  targetType: 'enemy',
  cooldown: 3,  // 0.3 second cooldown - can use multiple times per fight
  maxRange: 8,   // Long range like WoW (30 yards)
  threatMultiplier: 10.0  // Tanks generate 10x threat to maintain aggro
};

/**
 * Sunder Armor - High threat generation ability for tanks
 * Spammable ability to maintain threat lead over DPS
 */
const SUNDER_ARMOR_ABILITY: Ability = {
  id: 'sunder_armor',
  name: 'Sunder Armor',
  description: 'Strike with massive force, generating high threat',
  resourceCost: 40,
  resourceGeneration: 0,
  damage: 40,  // Decent damage
  damageType: 'physical',
  targetType: 'enemy',
  cooldown: 0,  // No cooldown - spammable for threat
  maxRange: 1,   // Melee range
  threatMultiplier: 8.0  // 8x threat - strong aggro generation
};

const FEINT_ABILITY: Ability = {
  id: 'feint',
  name: 'Feint',
  description: 'Reduce your threat by 50%',
  abilityType: AbilityType.FEINT,
  resourceCost: 30,
  resourceGeneration: 0,
  targetType: 'self',
  cooldown: 3, // 0.3 seconds - usable multiple times
  maxRange: 0
};

const FADE_ABILITY: Ability = {
  id: 'fade',
  name: 'Fade',
  description: 'Reduce your threat by 50%',
  abilityType: AbilityType.FADE,
  resourceCost: 20,
  resourceGeneration: 0,
  targetType: 'self',
  cooldown: 3, // 0.3 seconds - usable multiple times
  maxRange: 0
};

const SECOND_WIND_ABILITY: Ability = {
  id: 'second_wind',
  name: 'Second Wind',
  description: 'Heal yourself for 15% of max HP',
  abilityType: AbilityType.HEAL,
  resourceCost: 60,  // More expensive - harder to spam
  resourceGeneration: 0,
  healing: 105, // Base healing value (will be multiplied by sqrt(powerCore) * 0.1)
  targetType: 'self',
  cooldown: 4, // 0.4 seconds - can use 1-2 times per fight
  maxRange: 0
};

/**
 * Get abilities for a bot based on faction and class
 * Returns an array of all abilities the bot can use
 */
export function getAbilitiesForBot(faction: Faction, botClass: Class): Ability[] {
  const factionAbilities = FACTION_CLASS_ABILITIES[faction]?.[botClass];
  if (!factionAbilities) {
    throw new Error(`No abilities defined for ${faction} ${botClass}`);
  }
  
  const abilities = [factionAbilities.basicAttack, factionAbilities.mainAbility];
  
  // All Bulwarks get Taunt and Sunder Armor as additional abilities
  if (botClass === 'Bulwark') {
    abilities.push(TAUNT_ABILITY);
    abilities.push(SUNDER_ARMOR_ABILITY);
  }
  
  // All Strikers get Feint for threat management
  if (botClass === 'Striker') {
    abilities.push(FEINT_ABILITY);
  }
  
  // All Fixers get Fade for threat management
  if (botClass === 'Fixer') {
    abilities.push(FADE_ABILITY);
  }
  
  // All bots EXCEPT Bulwarks get Second Wind for emergency self-healing
  // (Bulwarks are already too tanky and would dominate with self-healing)
  if (botClass !== 'Bulwark') {
    abilities.push(SECOND_WIND_ABILITY);
  }
  
  return abilities;
}

// Define all 56 unique faction-class ability combinations
const FACTION_CLASS_ABILITIES: Record<Faction, Record<Class, { basicAttack: Ability, mainAbility: Ability }>> = {
  'Ultimate-master': {
    Bulwark: {
      basicAttack: {
        id: 'ultimatemaster_bulwark_basic',
        name: 'Omnipotent Strike',
        description: 'Generate resource with melee attack',
        damageType: 'physical',
        resourceCost: 0,
        resourceGeneration: 15,
        damage: 10,
        targetType: 'enemy',
        maxRange: 1
      },
      mainAbility: {
        id: 'ultimatemaster_bulwark_main',
        name: 'Omnipresent Shield',
        description: 'Party gains immunity to one killing blow',
        abilityType: AbilityType.OMNIPRESENT_SHIELD,
        resourceCost: 100,
        resourceGeneration: 0,
        targetType: 'all-allies',
        cooldown: 6, // 0.6 seconds - powerful once-per-fight ability
        maxRange: 99
      }
    },
    Striker: {
      basicAttack: {
        id: 'ultimatemaster_striker_basic',
        name: 'Reality Slash',
        description: 'Generate resource with melee attack',
        damageType: 'physical',
        resourceCost: 0,
        resourceGeneration: 15,
        damage: 25,
        targetType: 'enemy',
        maxRange: 1
      },
      mainAbility: {
        id: 'ultimatemaster_striker_main',
        name: 'Existential Crisis',
        description: 'Enemy takes +25% damage from all sources',
        abilityType: AbilityType.EXISTENTIAL_CRISIS,
        resourceCost: 150,
        resourceGeneration: 0,
        damage: 25,
        targetType: 'enemy',
        cooldown: 4, // 0.4 seconds - can use 1-2 times
        maxRange: 1
      }
    },
    Fixer: {
      basicAttack: {
        id: 'ultimatemaster_fixer_basic',
        name: 'Energy Bolt',
        description: 'Generate resource with ranged attack',
        damageType: 'magical',
        resourceCost: 0,
        resourceGeneration: 10,
        damage: 10,
        targetType: 'enemy',
        maxRange: 8
      },
      mainAbility: {
        id: 'ultimatemaster_fixer_main',
        name: 'Lifegiver',
        description: 'Revive dead party member at 50% HP',
        abilityType: AbilityType.LIFEGIVER,
        resourceCost: 100,
        resourceGeneration: 0,
        healing: 50, // Special: revive mechanic
        targetType: 'ally',
        cooldown: 6, // 0.6 seconds - powerful once-per-fight ability
        maxRange: 99
      }
    },
    Tactician: {
      basicAttack: {
        id: 'ultimatemaster_tactician_basic',
        name: 'Tactical Shot',
        description: 'Generate resource with ranged attack',
        damageType: 'magical',
        resourceCost: 0,
        resourceGeneration: 10,
        damage: 17,
        targetType: 'enemy',
        maxRange: 6
      },
      mainAbility: {
        id: 'ultimatemaster_tactician_main',
        name: 'Omniscience',
        description: 'Party sees all enemy abilities 5s before cast',
        resourceCost: 80,
        resourceGeneration: 0,
        targetType: 'all-allies',
        cooldown: 5, // 0.5 seconds - strong utility ability
        maxRange: 99
      }
    }
  },
  'Wild': {
    Bulwark: {
      basicAttack: {
        id: 'wild_bulwark_basic',
        name: 'Chaos Bash',
        description: 'Generate resource with melee attack',
        resourceCost: 0,
        resourceGeneration: 15,
        damage: 10,
        targetType: 'enemy',
        maxRange: 1
      },
      mainAbility: {
        id: 'wild_bulwark_main',
        name: 'Reality Distortion',
        description: '15% chance enemy attacks phase through',
        abilityType: AbilityType.REALITY_DISTORTION,
        resourceCost: 80,
        resourceGeneration: 0,
        targetType: 'all-allies',
        cooldown: 4,
        maxRange: 99
      }
    },
    Striker: {
      basicAttack: {
        id: 'wild_striker_basic',
        name: 'Entropy Strike',
        description: 'Generate resource with melee attack',
        resourceCost: 0,
        resourceGeneration: 15,
        damage: 25,
        targetType: 'enemy',
        maxRange: 1
      },
      mainAbility: {
        id: 'wild_striker_main',
        name: 'Chaos Engine',
        description: 'Critical hits apply random debuff',
        abilityType: AbilityType.CHAOS_ENGINE,
        resourceCost: 60,
        resourceGeneration: 0,
        damage: 60,
        targetType: 'enemy',
        cooldown: 4,
        maxRange: 1
      }
    },
    Fixer: {
      basicAttack: {
        id: 'wild_fixer_basic',
        name: 'Glitch Bolt',
        description: 'Generate resource with ranged attack',
        resourceCost: 0,
        resourceGeneration: 10,
        damage: 10,
        targetType: 'enemy',
        maxRange: 8
      },
      mainAbility: {
        id: 'wild_fixer_main',
        name: 'Reality Patch',
        description: 'Heal and remove random debuff',
        abilityType: AbilityType.REALITY_PATCH,
        resourceCost: 100,
        resourceGeneration: 0,
        healing: 50,
        targetType: 'ally',
        cooldown: 5,
        maxRange: 8
      }
    },
    Tactician: {
      basicAttack: {
        id: 'wild_tactician_basic',
        name: 'Static Shot',
        description: 'Generate resource with ranged attack',
        resourceCost: 0,
        resourceGeneration: 10,
        damage: 17,
        targetType: 'enemy',
        maxRange: 6
      },
      mainAbility: {
        id: 'wild_tactician_main',
        name: 'Randomize',
        description: 'Shuffle enemy APL priority for 10s',
        resourceCost: 70,
        resourceGeneration: 0,
        targetType: 'all-enemies',
        cooldown: 4,
        maxRange: 99
      }
    }
  },
  // Simplified faction abilities for all classes (POC - basic versions)
  'Golden': {
    Bulwark: {
      basicAttack: { id: 'golden_bulwark_basic', name: 'Holy Strike', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 10, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'golden_bulwark_main', name: 'Taunt', description: 'Force enemy to attack you', abilityType: AbilityType.TAUNT, resourceCost: 50, resourceGeneration: 0, damage: 10, targetType: 'enemy', cooldown: 3, maxRange: 99 }
    },
    Striker: {
      basicAttack: { id: 'golden_striker_basic', name: 'Smite', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 35, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'golden_striker_main', name: 'Execute', description: '3x damage to targets <50% HP', abilityType: AbilityType.EXECUTE, resourceCost: 15, resourceGeneration: 0, damage: 350, targetType: 'enemy', cooldown: 2, maxRange: 1 }
    },
    Fixer: {
      basicAttack: { id: 'golden_fixer_basic', name: 'Light Bolt', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 10, targetType: 'enemy', maxRange: 8, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'golden_fixer_main', name: 'Emergency Heal', description: 'Massive heal on lowest HP ally', abilityType: AbilityType.EMERGENCY_HEAL, resourceCost: 45, resourceGeneration: 0, healing: 262, targetType: 'ally', cooldown: 5, maxRange: 8 }
    },
    Tactician: {
      basicAttack: { id: 'golden_tactician_basic', name: 'Divine Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 0, damage: 25, targetType: 'enemy', maxRange: 6, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'golden_tactician_main', name: 'Battle Command', description: 'All allies gain +30 resource', abilityType: AbilityType.BATTLE_COMMAND, resourceCost: 60, resourceGeneration: 0, targetType: 'all-allies', cooldown: 3, maxRange: 99 }
    }
  },
  'Ultimate': {
    Bulwark: {
      basicAttack: { id: 'ultimate_bulwark_basic', name: 'Perfect Block', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 10, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'ultimate_bulwark_main', name: 'Perfect Defense', description: 'Party -10% damage', resourceCost: 135, resourceGeneration: 0, targetType: 'all-allies', cooldown: 5, maxRange: 99 }
    },
    Striker: {
      basicAttack: { id: 'ultimate_striker_basic', name: 'Precision Strike', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 25, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'ultimate_striker_main', name: 'Weak Point', description: 'Reduce enemy armor on crit', resourceCost: 70, resourceGeneration: 0, damage: 70, targetType: 'enemy', cooldown: 4, maxRange: 1 }
    },
    Fixer: {
      basicAttack: { id: 'ultimate_fixer_basic', name: 'Nano Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 10, targetType: 'enemy', maxRange: 8, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'ultimate_fixer_main', name: 'Nano-Surgeon', description: 'Heal +15% effective', abilityType: AbilityType.NANO_SURGEON, resourceCost: 10, resourceGeneration: 0, healing: 550, targetType: 'ally', cooldown: 5, maxRange: 8 }
    },
    Tactician: {
      basicAttack: { id: 'ultimate_tactician_basic', name: 'Tactical Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 25, targetType: 'enemy', maxRange: 6, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'ultimate_tactician_main', name: 'Optimization', description: 'Party cooldowns -10%', resourceCost: 60, resourceGeneration: 0, targetType: 'all-allies', cooldown: 3, maxRange: 99 }
    }
  },
  'Blackhole': {
    Bulwark: {
      basicAttack: { id: 'blackhole_bulwark_basic', name: 'Gravity Slam', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 5, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'blackhole_bulwark_main', name: 'Gravitational Pull', description: 'Enemies attack 15% slower', resourceCost: 160, resourceGeneration: 0, targetType: 'all-enemies', cooldown: 6, maxRange: 99 }
    },
    Striker: {
      basicAttack: { id: 'blackhole_striker_basic', name: 'Void Strike', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 12, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'blackhole_striker_main', name: 'Crushing Singularity', description: 'Execute at <20% HP', abilityType: AbilityType.CRUSHING_SINGULARITY, resourceCost: 60, resourceGeneration: 0, damage: 50, targetType: 'enemy', cooldown: 4, maxRange: 1 }
    },
    Fixer: {
      basicAttack: { id: 'blackhole_fixer_basic', name: 'Void Bolt', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 5, targetType: 'enemy', maxRange: 8, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'blackhole_fixer_main', name: 'Event Horizon', description: 'Shield converts to heal', resourceCost: 10, resourceGeneration: 0, healing: 275, targetType: 'ally', cooldown: 5, maxRange: 8 }
    },
    Tactician: {
      basicAttack: { id: 'blackhole_tactician_basic', name: 'Gravity Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 25, targetType: 'enemy', maxRange: 6, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'blackhole_tactician_main', name: 'Time Dilation', description: 'Party +10% speed', abilityType: AbilityType.TIME_DILATION, resourceCost: 55, resourceGeneration: 0, damage: 21, targetType: 'enemy', cooldown: 3, maxRange: 6 }
    }
  },
  'Dead': {
    Bulwark: {
      basicAttack: { id: 'dead_bulwark_basic', name: 'Bone Crush', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 10, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'dead_bulwark_main', name: 'Undying Presence', description: 'Low HP allies -30% damage', abilityType: AbilityType.UNDYING_PRESENCE, resourceCost: 85, resourceGeneration: 0, targetType: 'all-allies', cooldown: 4, maxRange: 99 }
    },
    Striker: {
      basicAttack: { id: 'dead_striker_basic', name: 'Soul Rend', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 25, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'dead_striker_main', name: 'Life Drain', description: 'Party heals 5% of damage', abilityType: AbilityType.LIFE_DRAIN, resourceCost: 75, resourceGeneration: 0, damage: 62, targetType: 'enemy', cooldown: 4, maxRange: 1 }
    },
    Fixer: {
      basicAttack: { id: 'dead_fixer_basic', name: 'Necrotic Bolt', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 10, targetType: 'enemy', maxRange: 8, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'dead_fixer_main', name: 'Sacrificial Pact', description: 'Heal costs HP but 50% stronger', abilityType: AbilityType.SACRIFICIAL_PACT, resourceCost: 12, resourceGeneration: 0, healing: 550, targetType: 'ally', cooldown: 5, maxRange: 8 }
    },
    Tactician: {
      basicAttack: { id: 'dead_tactician_basic', name: 'Death Bolt', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 25, targetType: 'enemy', maxRange: 6, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'dead_tactician_main', name: "Death's Herald", description: 'Enemies cannot heal + damage', resourceCost: 60, resourceGeneration: 0, damage: 50, targetType: 'enemy', cooldown: 4, maxRange: 6 }
    }
  },
  'Master': {
    Bulwark: {
      basicAttack: { id: 'master_bulwark_basic', name: 'Command Strike', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 10, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'master_bulwark_main', name: 'Tactical Formation', description: 'Nearby allies +10% armor', resourceCost: 120, resourceGeneration: 0, targetType: 'all-allies', cooldown: 5, maxRange: 99 }
    },
    Striker: {
      basicAttack: { id: 'master_striker_basic', name: 'Assassinate', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 25, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'master_striker_main', name: 'Coordinated Strike', description: 'First attack guaranteed crit', resourceCost: 65, resourceGeneration: 0, damage: 90, targetType: 'enemy', cooldown: 4, maxRange: 1 }
    },
    Fixer: {
      basicAttack: { id: 'master_fixer_basic', name: 'Medic Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 10, targetType: 'enemy', maxRange: 8, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'master_fixer_main', name: 'Triage Protocol', description: 'Auto-heal lowest HP ally', resourceCost: 12, resourceGeneration: 0, healing: 525, targetType: 'ally', cooldown: 5, maxRange: 8 }
    },
    Tactician: {
      basicAttack: { id: 'master_tactician_basic', name: 'Strategic Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 25, targetType: 'enemy', maxRange: 6, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'master_tactician_main', name: 'Battle Plan', description: 'Damage +2% every 10s (stacks)', resourceCost: 50, resourceGeneration: 0, damage: 30, targetType: 'enemy', cooldown: 3, maxRange: 6 }
    }
  },
  'Bee': {
    Bulwark: {
      basicAttack: { id: 'bee_bulwark_basic', name: 'Swarm Strike', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 10, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'bee_bulwark_main', name: 'Hive Mind', description: 'Each ally +5% threat gen', resourceCost: 75, resourceGeneration: 0, targetType: 'all-allies', cooldown: 4, maxRange: 99 }
    },
    Striker: {
      basicAttack: { id: 'bee_striker_basic', name: 'Sting', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 25, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'bee_striker_main', name: 'Overwhelming Numbers', description: 'Reduce enemy evasion', resourceCost: 110, resourceGeneration: 0, damage: 35, targetType: 'enemy', cooldown: 4, maxRange: 1 }
    },
    Fixer: {
      basicAttack: { id: 'bee_fixer_basic', name: 'Pollen Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 5, targetType: 'enemy', maxRange: 8, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'bee_fixer_main', name: 'Pollination', description: 'Heal spreads 30% to adjacent', abilityType: AbilityType.POLLINATION, resourceCost: 10, resourceGeneration: 0, healing: 300, targetType: 'ally', cooldown: 5, maxRange: 8 }
    },
    Tactician: {
      basicAttack: { id: 'bee_tactician_basic', name: 'Hive Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 25, targetType: 'enemy', maxRange: 6, cooldown: 5, threatMultiplier: 0.5 },
      mainAbility: { id: 'bee_tactician_main', name: 'Coordination', description: 'Nearby allies +10% damage', resourceCost: 55, resourceGeneration: 0, damage: 37, targetType: 'enemy', cooldown: 4, maxRange: 6 }
    }
  },
  'Food': {
    Bulwark: {
      basicAttack: { id: 'food_bulwark_basic', name: 'Preservative Punch', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 10, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'food_bulwark_main', name: 'Feast Aura', description: 'Party regen 1% HP/5s', resourceCost: 110, resourceGeneration: 0, targetType: 'all-allies', cooldown: 5, maxRange: 99 }
    },
    Striker: {
      basicAttack: { id: 'food_striker_basic', name: 'Spice Slash', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 25, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'food_striker_main', name: 'Flavor Burst', description: 'Enemies +10% elemental damage', resourceCost: 65, resourceGeneration: 0, damage: 62, targetType: 'enemy', cooldown: 4, maxRange: 1 }
    },
    Fixer: {
      basicAttack: { id: 'food_fixer_basic', name: 'Seasoning Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 10, targetType: 'enemy', maxRange: 8, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'food_fixer_main', name: 'Feast', description: 'AoE heal + restore energy', abilityType: AbilityType.FEAST, resourceCost: 45, resourceGeneration: 0, healing: 135, targetType: 'all-allies', cooldown: 5, maxRange: 99 }
    },
    Tactician: {
      basicAttack: { id: 'food_tactician_basic', name: 'Culinary Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 25, targetType: 'enemy', maxRange: 6, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'food_tactician_main', name: 'Intoxicate', description: 'Debuffs last +25% longer', resourceCost: 70, resourceGeneration: 0, targetType: 'all-enemies', cooldown: 4, maxRange: 99 }
    }
  },
  'Box': {
    Bulwark: {
      basicAttack: { id: 'box_bulwark_basic', name: 'Vault Slam', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 10, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'box_bulwark_main', name: 'Sealed Fortress', description: 'First hit -50% damage', abilityType: AbilityType.SEALED_FORTRESS, resourceCost: 260, resourceGeneration: 0, targetType: 'all-allies', cooldown: 7, maxRange: 99 }
    },
    Striker: {
      basicAttack: { id: 'box_striker_basic', name: 'Unbox Fury', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 25, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'box_striker_main', name: 'Surprise Attack', description: '20% chance ignore armor', abilityType: AbilityType.SURPRISE_ATTACK, resourceCost: 60, resourceGeneration: 0, damage: 67, targetType: 'enemy', cooldown: 4, maxRange: 1 }
    },
    Fixer: {
      basicAttack: { id: 'box_fixer_basic', name: 'Containment Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 10, targetType: 'enemy', maxRange: 8, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'box_fixer_main', name: 'Stasis Field', description: 'Freeze ally for immunity + heal', abilityType: AbilityType.STASIS_FIELD, resourceCost: 10, resourceGeneration: 0, healing: 450, targetType: 'ally', cooldown: 5, maxRange: 8 }
    },
    Tactician: {
      basicAttack: { id: 'box_tactician_basic', name: 'Lock Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 25, targetType: 'enemy', maxRange: 6, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'box_tactician_main', name: 'Lockbox', description: 'Seal one enemy ability', resourceCost: 50, resourceGeneration: 0, damage: 40, targetType: 'enemy', cooldown: 4, maxRange: 6 }
    }
  },
  'Murder': {
    Bulwark: {
      basicAttack: { id: 'murder_bulwark_basic', name: 'Blood Strike', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 10, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'murder_bulwark_main', name: 'Blood Shield', description: '5% damage grants temp HP', resourceCost: 150, resourceGeneration: 0, targetType: 'self', cooldown: 6, maxRange: 0 }
    },
    Striker: {
      basicAttack: { id: 'murder_striker_basic', name: 'Silent Strike', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 25, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'murder_striker_main', name: 'Assassinate', description: 'High HP targets +30% damage', abilityType: AbilityType.ASSASSINATE, resourceCost: 70, resourceGeneration: 0, damage: 50, targetType: 'enemy', cooldown: 5, maxRange: 1 }
    },
    Fixer: {
      basicAttack: { id: 'murder_fixer_basic', name: 'Blood Bolt', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 10, targetType: 'enemy', maxRange: 8, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'murder_fixer_main', name: 'Transfusion', description: 'Transfer HP between allies', resourceCost: 15, resourceGeneration: 0, healing: 475, targetType: 'ally', cooldown: 5, maxRange: 8 }
    },
    Tactician: {
      basicAttack: { id: 'murder_tactician_basic', name: 'Stealth Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 25, targetType: 'enemy', maxRange: 6, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'murder_tactician_main', name: 'Expose Weakness', description: "Reveal enemy's lowest resistance + damage", resourceCost: 55, resourceGeneration: 0, damage: 40, targetType: 'enemy', cooldown: 3, maxRange: 6 }
    }
  },
  'Game': {
    Bulwark: {
      basicAttack: { id: 'game_bulwark_basic', name: 'Dice Roll', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 10, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'game_bulwark_main', name: 'Wild Card Defense', description: 'Random ally gets 3s immunity', abilityType: AbilityType.WILD_CARD_DEFENSE, resourceCost: 200, resourceGeneration: 0, targetType: 'all-allies', cooldown: 6, maxRange: 99 }
    },
    Striker: {
      basicAttack: { id: 'game_striker_basic', name: 'Lucky Strike', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 25, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'game_striker_main', name: 'Jackpot', description: 'Every 5th attack auto-crits', resourceCost: 65, resourceGeneration: 0, damage: 70, targetType: 'enemy', cooldown: 4, maxRange: 1 }
    },
    Fixer: {
      basicAttack: { id: 'game_fixer_basic', name: 'Chance Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 10, targetType: 'enemy', maxRange: 8, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'game_fixer_main', name: 'Double or Nothing', description: 'Random heal 0.5x-2x', abilityType: AbilityType.DOUBLE_OR_NOTHING, resourceCost: 12, resourceGeneration: 0, healing: 500, targetType: 'ally', cooldown: 5, maxRange: 8 }
    },
    Tactician: {
      basicAttack: { id: 'game_tactician_basic', name: 'Random Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 25, targetType: 'enemy', maxRange: 6, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'game_tactician_main', name: 'Gambit', description: 'Random powerful buff', resourceCost: 45, resourceGeneration: 0, damage: 47, targetType: 'enemy', cooldown: 3, maxRange: 6 }
    }
  },
  'Animal': {
    Bulwark: {
      basicAttack: { id: 'animal_bulwark_basic', name: 'Alpha Strike', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 10, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'animal_bulwark_main', name: 'Pack Leader', description: 'Low HP allies +15% evasion', abilityType: AbilityType.PACK_LEADER, resourceCost: 220, resourceGeneration: 0, targetType: 'all-allies', cooldown: 6, maxRange: 99 }
    },
    Striker: {
      basicAttack: { id: 'animal_striker_basic', name: 'Feral Slash', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 25, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'animal_striker_main', name: "Hunter's Mark", description: 'Wounded targets +15% damage', abilityType: AbilityType.HUNTERS_MARK, resourceCost: 60, resourceGeneration: 0, damage: 65, targetType: 'enemy', cooldown: 4, maxRange: 1 }
    },
    Fixer: {
      basicAttack: { id: 'animal_fixer_basic', name: 'Nature Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 10, targetType: 'enemy', maxRange: 8, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'animal_fixer_main', name: 'Regeneration', description: 'HoT effects +25% stronger', abilityType: AbilityType.REGENERATION, resourceCost: 15, resourceGeneration: 0, healing: 450, targetType: 'ally', cooldown: 5, maxRange: 8 }
    },
    Tactician: {
      basicAttack: { id: 'animal_tactician_basic', name: 'Pack Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 25, targetType: 'enemy', maxRange: 6, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'animal_tactician_main', name: 'Howl', description: 'Party attack speed +15%', abilityType: AbilityType.HOWL, resourceCost: 50, resourceGeneration: 0, damage: 40, targetType: 'enemy', cooldown: 3, maxRange: 6 }
    }
  },
  'Industrial': {
    Bulwark: {
      basicAttack: { id: 'industrial_bulwark_basic', name: 'Hammer Strike', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 10, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'industrial_bulwark_main', name: 'Heat Shield', description: 'Damage converts to attack buff', abilityType: AbilityType.HEAT_SHIELD, resourceCost: 380, resourceGeneration: 0, targetType: 'all-allies', cooldown: 7, maxRange: 99 }
    },
    Striker: {
      basicAttack: { id: 'industrial_striker_basic', name: 'Pneumatic Strike', description: 'Basic melee', damageType: 'physical', resourceCost: 0, resourceGeneration: 15, damage: 25, targetType: 'enemy', maxRange: 1, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'industrial_striker_main', name: 'Crush', description: 'Ignore 30% armor', abilityType: AbilityType.CRUSH, resourceCost: 65, resourceGeneration: 0, damage: 72, targetType: 'enemy', cooldown: 4, maxRange: 1 }
    },
    Fixer: {
      basicAttack: { id: 'industrial_fixer_basic', name: 'Maintenance Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 10, targetType: 'enemy', maxRange: 8, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'industrial_fixer_main', name: 'Spot Weld', description: 'Heal + restore 5% highest stat', abilityType: AbilityType.SPOT_WELD, resourceCost: 15, resourceGeneration: 0, healing: 450, targetType: 'ally', cooldown: 5, maxRange: 8 }
    },
    Tactician: {
      basicAttack: { id: 'industrial_tactician_basic', name: 'Engineer Shot', description: 'Basic ranged', damageType: 'magical', resourceCost: 0, resourceGeneration: 10, damage: 25, targetType: 'enemy', maxRange: 6, cooldown: 3, threatMultiplier: 0.5 },
      mainAbility: { id: 'industrial_tactician_main', name: 'Overcharge', description: 'Abilities cost -20% resource', abilityType: AbilityType.OVERCHARGE, resourceCost: 50, resourceGeneration: 0, damage: 45, targetType: 'enemy', cooldown: 3, maxRange: 6 }
    }
  }
};

export class CombatSimulator {
  private party: CombatBot[] = [];
  private enemy: CombatBot[] = [];
  private originalParty: CombatBot[] = [];
  private originalEnemy: CombatBot[] = [];
  private actions: CombatAction[] = [];
  private currentTick = 0;
  private seed: number;
  private actionSequence = 0;  // Track order of actions within ticks
  private gridWidth = 10;
  private gridHeight = 5;
  
  constructor(party: CombatBot[], enemy: CombatBot[], seed?: number) {
    // Store original arrays for countClassBefore to access during initialization
    this.originalParty = party;
    this.originalEnemy = enemy;
    
    this.party = party.map((bot, idx) => this.initializeCombatBot(bot, 'party', idx, party.length));
    this.enemy = enemy.map((bot, idx) => this.initializeCombatBot(bot, 'enemy', idx, enemy.length));
    this.seed = seed ?? Date.now();
  }
  
  // Formation helpers - create tactical positioning based on team composition
  private getPartyFormation(botClass: Class, index: number, teamSize: number): Position {
    // Party side: columns 0-2 (x=0 back, x=2 front facing enemy)
    // Rows 0-4 (y=2 is center)
    
    if (teamSize === 1) {
      // Solo: center front
      return { x: 2, y: 2 };
    }
    
    if (teamSize === 2) {
      // 2v2: Position based on class
      const classIdx = this.countClassBefore(botClass, index, 'party');
      if (botClass === 'Bulwark') return { x: 2, y: classIdx === 0 ? 1 : 3 }; // Tanks front
      if (botClass === 'Striker') return { x: 1, y: classIdx === 0 ? 1 : 3 }; // DPS mid
      // Fixer/Tactician at back
      const supportIdx = this.countSupportBefore(index, 'party');
      return { x: 0, y: supportIdx === 0 ? 1 : 3 };
    }
    
    if (teamSize === 3) {
      // 3v3: Triangle formation with class positioning
      const classIdx = this.countClassBefore(botClass, index, 'party');
      if (botClass === 'Bulwark') {
        // Bulwarks at front
        if (classIdx === 0) return { x: 2, y: 2 }; // First tank: front center
        if (classIdx === 1) return { x: 2, y: 1 }; // Second tank: front left
        return { x: 2, y: 3 }; // Third tank: front right
      }
      if (botClass === 'Striker') {
        // Strikers at mid
        if (classIdx === 0) return { x: 1, y: 1 }; // First DPS: mid left
        if (classIdx === 1) return { x: 1, y: 3 }; // Second DPS: mid right
        return { x: 1, y: 2 }; // Third DPS: mid center
      }
      // Fixer/Tactician at back - count them together
      const supportIdx = this.countSupportBefore(index, 'party');
      if (supportIdx === 0) return { x: 0, y: 1 }; // First support: back left
      if (supportIdx === 1) return { x: 0, y: 3 }; // Second support: back right
      return { x: 0, y: 2 }; // Third support: back center
    }
    
    if (teamSize === 4) {
      // 4v4: Class-based positioning
      if (botClass === 'Bulwark') return { x: 2, y: 2 }; // Tank front center
      if (botClass === 'Striker') {
        const strikerIdx = this.countClassBefore('Striker', index, 'party');
        return { x: 1, y: strikerIdx === 0 ? 1 : 3 }; // DPS mid sides
      }
      // Fixer/Tactician at back
      const supportIdx = this.countSupportBefore(index, 'party');
      return { x: 0, y: supportIdx === 0 ? 1 : 3 };
    }
    
    if (teamSize === 5) {
      // 5v5: Class-based positioning
      if (botClass === 'Bulwark') return { x: 2, y: 2 }; // Tank front center
      if (botClass === 'Striker') {
        const strikerIdx = this.countClassBefore('Striker', index, 'party');
        return { x: 1, y: strikerIdx === 0 ? 1 : 3 }; // DPS mid sides
      }
      // Fixer/Tactician at back
      const supportIdx = this.countSupportBefore(index, 'party');
      if (supportIdx === 0) return { x: 0, y: 0 }; // Back-left
      if (supportIdx === 1) return { x: 0, y: 2 }; // Back-center
      return { x: 0, y: 4 }; // Back-right
    }
    
    // 6v6+: Larger raid formation with more depth
    if (botClass === 'Bulwark') {
      const bulwarkIdx = this.countClassBefore('Bulwark', index, 'party');
      return { x: 2, y: bulwarkIdx };
    }
    if (botClass === 'Striker') {
      const strikerIdx = this.countClassBefore('Striker', index, 'party');
      return { x: 1, y: strikerIdx };
    }
    // Support at back
    const supportIdx = this.countSupportBefore(index, 'party');
    return { x: 0, y: supportIdx };
  }
  
  private getEnemyFormation(botClass: Class, index: number, teamSize: number): Position {
    // Enemy side: columns 7-9 (x=7 front facing party, x=9 back)
    // Mirror party formation but on opposite side
    
    if (teamSize === 1) {
      // Solo boss: center front
      return { x: 7, y: 2 };
    }
    
    if (teamSize === 2) {
      // 2v2: Position based on class (mirrored)
      const classIdx = this.countClassBefore(botClass, index, 'enemy');
      if (botClass === 'Bulwark') return { x: 7, y: classIdx === 0 ? 1 : 3 }; // Tanks front
      if (botClass === 'Striker') return { x: 8, y: classIdx === 0 ? 1 : 3 }; // DPS mid
      // Fixer/Tactician at back
      const supportIdx = this.countSupportBefore(index, 'enemy');
      return { x: 9, y: supportIdx === 0 ? 1 : 3 };
    }
    
    if (teamSize === 3) {
      // 3v3: Triangle formation with class positioning (mirrored)
      const classIdx = this.countClassBefore(botClass, index, 'enemy');
      if (botClass === 'Bulwark') {
        // Bulwarks at front
        if (classIdx === 0) return { x: 7, y: 2 }; // First tank: front center
        if (classIdx === 1) return { x: 7, y: 1 }; // Second tank: front left
        return { x: 7, y: 3 }; // Third tank: front right
      }
      if (botClass === 'Striker') {
        // Strikers at mid
        if (classIdx === 0) return { x: 8, y: 1 }; // First DPS: mid left
        if (classIdx === 1) return { x: 8, y: 3 }; // Second DPS: mid right
        return { x: 8, y: 2 }; // Third DPS: mid center
      }
      // Fixer/Tactician at back - count them together
      const supportIdx = this.countSupportBefore(index, 'enemy');
      if (supportIdx === 0) return { x: 9, y: 1 }; // First support: back left
      if (supportIdx === 1) return { x: 9, y: 3 }; // Second support: back right
      return { x: 9, y: 2 }; // Third support: back center
    }
    
    if (teamSize === 4) {
      // 4v4: Class-based positioning (mirrored)
      if (botClass === 'Bulwark') return { x: 7, y: 2 }; // Tank front center
      if (botClass === 'Striker') {
        const strikerIdx = this.countClassBefore('Striker', index, 'enemy');
        return { x: 8, y: strikerIdx === 0 ? 1 : 3 }; // DPS mid sides
      }
      // Fixer/Tactician at back
      const supportIdx = this.countSupportBefore(index, 'enemy');
      return { x: 9, y: supportIdx === 0 ? 1 : 3 };
    }
    
    if (teamSize === 5) {
      // 5v5: Class-based positioning (mirrored)
      if (botClass === 'Bulwark') return { x: 7, y: 2 }; // Tank front center
      if (botClass === 'Striker') {
        const strikerIdx = this.countClassBefore('Striker', index, 'enemy');
        return { x: 8, y: strikerIdx === 0 ? 1 : 3 }; // DPS mid sides
      }
      // Fixer/Tactician at back
      const supportIdx = this.countSupportBefore(index, 'enemy');
      if (supportIdx === 0) return { x: 9, y: 0 }; // Back-left
      if (supportIdx === 1) return { x: 9, y: 2 }; // Back-center
      return { x: 9, y: 4 }; // Back-right
    }
    
    // Large raids (6v6+)
    if (botClass === 'Bulwark') {
      const bulwarkIdx = this.countClassBefore('Bulwark', index, 'enemy');
      return { x: 7, y: bulwarkIdx };
    }
    if (botClass === 'Striker') {
      const strikerIdx = this.countClassBefore('Striker', index, 'enemy');
      return { x: 8, y: strikerIdx };
    }
    const supportIdx = this.countSupportBefore(index, 'enemy');
    return { x: 9, y: supportIdx };
  }
  
  // Helper to count how many of same class came before this index
  private countClassBefore(targetClass: Class, currentIndex: number, team: 'party' | 'enemy'): number {
    let count = 0;
    const originalTeam = team === 'party' ? this.originalParty : this.originalEnemy;
    
    // Count how many bots of the same class appear before this index
    for (let i = 0; i < currentIndex; i++) {
      if (originalTeam[i] && originalTeam[i].class === targetClass) {
        count++;
      }
    }
    
    return count;
  }
  
  // Helper to count support classes (Fixer + Tactician) together
  private countSupportBefore(currentIndex: number, team: 'party' | 'enemy'): number {
    let count = 0;
    const originalTeam = team === 'party' ? this.originalParty : this.originalEnemy;
    
    // Count how many support bots (Fixer or Tactician) appear before this index
    for (let i = 0; i < currentIndex; i++) {
      if (originalTeam[i] && (originalTeam[i].class === 'Fixer' || originalTeam[i].class === 'Tactician')) {
        count++;
      }
    }
    
    return count;
  }
  
  private initializeCombatBot(bot: CombatBot, team: 'party' | 'enemy', index: number, teamSize: number): CombatBot {
    // HP scaling: sqrt(stability) × 100 (sublinear to compress rating advantage)
    // 20 stability = sqrt(20) × 100 = 447 HP
    // 40 stability = sqrt(40) × 100 = 632 HP (+41% for 2x stats)
    // 60 stability = sqrt(60) × 100 = 775 HP (+22% from 40)
    const maxHp = Math.sqrt(bot.stats.stability) * 100;
    
    // Initialize with default APL if none provided
    const defaultAPL = bot.apl && bot.apl.length > 0 ? bot.apl : this.getDefaultAPL(bot.class, bot.faction);
    
    // Assign attack type based on class (default pattern)
    const attackType = bot.attackType || this.getDefaultAttackType(bot.class);
    
    // Auto-position: party on left columns (0-4), enemy on right columns (5-9)
    // Use proper tactical formations based on team composition
    let startX: number;
    let startY: number;
    
    if (team === 'party') {
      // Party formation (facing right toward enemy)
      const formation = this.getPartyFormation(bot.class, index, teamSize);
      startX = formation.x;
      startY = formation.y;
      console.log(`[FORMATION] ${team} ${bot.name} (${bot.class}) index=${index} teamSize=${teamSize} -> (${startX},${startY})`);
    } else {
      // Enemy formation (facing left toward party)
      const formation = this.getEnemyFormation(bot.class, index, teamSize);
      startX = formation.x;
      startY = formation.y;
      console.log(`[FORMATION] ${team} ${bot.name} (${bot.class}) index=${index} teamSize=${teamSize} -> (${startX},${startY})`);
    }
    
    // Get faction-specific abilities
    const abilities = getAbilitiesForBot(bot.faction, bot.class);
    
    console.log(`[INIT BOT] ${bot.name} (${bot.class}): resourceType=${bot.resourceType}`);
    
    // Starting resource depends on type: mana starts at 100, rage/energy start at 0
    const startingResource = bot.resourceType === 'mana' ? 100 : 0;
    
    return {
      ...bot,
      attackType,
      apl: defaultAPL,
      abilities,
      abilityCooldowns: new Map(),
      basicAttack: abilities[0], // backwards compat
      mainAbility: abilities[1], // backwards compat
      hp: maxHp,
      maxHp,
      resource: startingResource,  // Mana: 100, Rage/Energy: 0
      maxResource: 100,
      energy: startingResource,    // Keep for backwards compat
      maxEnergy: 100,
      threat: 0,
      lastBasicAttack: -999,    // Initialize to negative so first cast is always allowed
      lastMainAbility: -999,
      position: { x: startX, y: startY },
      targetPosition: null,
      isMoving: false,
      currentTargetId: null,
      isDead: false,
      pendingDeath: false,
      buffs: [],
      debuffs: []
    };
  }
  
  private getDefaultAttackType(botClass: Class): AttackType {
    // Bulwarks and Strikers are melee, Fixers and Tacticians are ranged
    return (botClass === 'Bulwark' || botClass === 'Striker') ? 'melee' : 'ranged';
  }
  
  private getDefaultRow(botClass: Class, index: number): number {
    // Distribute bots across rows based on class preference
    // Bulwarks prefer front, but spread across rows to avoid stacking
    if (botClass === 'Bulwark') return Math.floor(index / 3) % 3; // Rotate through rows
    if (botClass === 'Striker') return 1; // Middle row
    return 2; // Back row for Fixers/Tacticians
  }
  
  private getDistance(pos1: Position, pos2: Position): number {
    // Chebyshev distance - allows diagonal movement
    // Max of horizontal and vertical distance (king's move in chess)
    return Math.max(Math.abs(pos1.x - pos2.x), Math.abs(pos1.y - pos2.y));
  }
  
  private isInRange(attacker: CombatBot, target: CombatBot, maxRange?: number, minRange?: number): boolean {
    const distance = this.getDistance(attacker.position, target.position);
    
    // Use provided ranges if available, otherwise fall back to attack type
    const effectiveMaxRange = maxRange !== undefined ? maxRange : (attacker.attackType === 'ranged' ? 6 : 1);
    const effectiveMinRange = minRange !== undefined ? minRange : 0;
    
    return distance >= effectiveMinRange && distance <= effectiveMaxRange;
  }
  
  private isInActionRange(bot: CombatBot, target: CombatBot, maxRange?: number, minRange?: number): boolean {
    return this.isInRange(bot, target, maxRange, minRange);
  }
  
  private findNearbyUnoccupiedPosition(target: Position, bot: CombatBot): Position {
    // For melee positioning, spread units in a circle around the target
    // Melee positions around target in priority order (adjacent tiles)
    const meleeRing: Position[] = [
      { x: target.x - 1, y: target.y },     // Left
      { x: target.x + 1, y: target.y },     // Right
      { x: target.x, y: target.y - 1 },     // Top
      { x: target.x, y: target.y + 1 },     // Bottom
      { x: target.x - 1, y: target.y - 1 }, // Top-left
      { x: target.x + 1, y: target.y - 1 }, // Top-right
      { x: target.x - 1, y: target.y + 1 }, // Bottom-left
      { x: target.x + 1, y: target.y + 1 }, // Bottom-right
    ];
    
    // Find first valid unoccupied position
    for (const pos of meleeRing) {
      if (pos.x < 0 || pos.x >= this.gridWidth || pos.y < 0 || pos.y >= this.gridHeight) {
        continue;
      }
      
      if (!this.isPositionOccupied(pos, bot)) {
        return pos;
      }
    }
    
    // If all spots taken, return position adjacent to target
    return { x: target.x - 1, y: target.y };
  }
  
  private isPositionOccupied(pos: Position, excludeBot: CombatBot): boolean {
    const allBots = [...this.party, ...this.enemy];
    return allBots.some(b => 
      b.id !== excludeBot.id && 
      !b.isDead && 
      b.position.x === pos.x && 
      b.position.y === pos.y
    );
  }
  
  private moveTowards(bot: CombatBot, target: Position) {
    // Use A* pathfinding to navigate around obstacles
    const path = this.findPath(bot.position, target, bot);
    
    if (path.length > 1) {
      const nextPos = path[1];
      
      // Check if next position is occupied before moving
      if (!this.isPositionOccupied(nextPos, bot)) {
        bot.position.x = nextPos.x;
        bot.position.y = nextPos.y;
      }
      // If blocked, stay in place and will recompute path next turn
      
      // Stop moving if we've reached the target or are adjacent to it
      const distance = this.getDistance(bot.position, target);
      if (distance <= 1) {
        bot.isMoving = false;
        bot.targetPosition = null;
      }
    } else {
      // No path found, stop moving
      bot.isMoving = false;
      bot.targetPosition = null;
    }
  }
  
  /**
   * A* pathfinding algorithm
   * Returns array of positions from start to goal (inclusive)
   */
  private findPath(start: Position, goal: Position, bot: CombatBot): Position[] {
    interface Node {
      pos: Position;
      g: number; // Cost from start
      h: number; // Heuristic to goal
      f: number; // Total cost (g + h)
      parent: Node | null;
    }
    
    const openSet: Node[] = [];
    const closedSet = new Set<string>();
    
    const startNode: Node = {
      pos: start,
      g: 0,
      h: this.getDistance(start, goal),
      f: this.getDistance(start, goal),
      parent: null
    };
    
    openSet.push(startNode);
    
    const posKey = (pos: Position) => `${pos.x},${pos.y}`;
    
    while (openSet.length > 0) {
      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      
      // Reached goal
      if (current.pos.x === goal.x && current.pos.y === goal.y) {
        const path: Position[] = [];
        let node: Node | null = current;
        while (node) {
          path.unshift(node.pos);
          node = node.parent;
        }
        return path;
      }
      
      closedSet.add(posKey(current.pos));
      
      // Check all 8 adjacent cells (includes diagonals for better pathfinding)
      const neighbors = [
        { x: current.pos.x + 1, y: current.pos.y, cost: 1 },     // Right
        { x: current.pos.x - 1, y: current.pos.y, cost: 1 },     // Left
        { x: current.pos.x, y: current.pos.y + 1, cost: 1 },     // Down
        { x: current.pos.x, y: current.pos.y - 1, cost: 1 },     // Up
        { x: current.pos.x + 1, y: current.pos.y + 1, cost: 1.4 }, // Diagonal: Down-Right
        { x: current.pos.x + 1, y: current.pos.y - 1, cost: 1.4 }, // Diagonal: Up-Right
        { x: current.pos.x - 1, y: current.pos.y + 1, cost: 1.4 }, // Diagonal: Down-Left
        { x: current.pos.x - 1, y: current.pos.y - 1, cost: 1.4 }, // Diagonal: Up-Left
      ];
      
      for (const neighbor of neighbors) {
        const neighborPos = { x: neighbor.x, y: neighbor.y };
        
        // Check bounds
        if (neighborPos.x < 0 || neighborPos.x >= this.gridWidth ||
            neighborPos.y < 0 || neighborPos.y >= this.gridHeight) {
          continue;
        }
        
        const key = posKey(neighborPos);
        if (closedSet.has(key)) continue;
        
        // Check if occupied (unless it's the goal)
        if (this.isPositionOccupied(neighborPos, bot) && 
            !(neighborPos.x === goal.x && neighborPos.y === goal.y)) {
          continue;
        }
        
        const g = current.g + neighbor.cost; // Use actual movement cost
        const h = this.getDistance(neighborPos, goal);
        const f = g + h;
        
        // Check if this neighbor is already in open set with better score
        const existingNode = openSet.find(n => n.pos.x === neighborPos.x && n.pos.y === neighborPos.y);
        if (existingNode && existingNode.g <= g) {
          continue;
        }
        
        const neighborNode: Node = {
          pos: neighborPos,
          g,
          h,
          f,
          parent: current
        };
        
        if (existingNode) {
          // Update existing node
          Object.assign(existingNode, neighborNode);
        } else {
          openSet.push(neighborNode);
        }
      }
    }
    
    // No path found, return empty array
    return [];
  }

  private getDefaultAPL(botClass: Class, faction: Faction): APLRule[] {
    // No default APL - bots must have explicit APL rules or they do nothing
    return [];
  }

  // Deterministic random using seed
  private random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  private calculateDamage(attacker: CombatBot, defender: CombatBot): number {
    // Basic attack damage: sqrt(powerCore) × 10 (sublinear to compress rating advantage)
    const baseDamage = Math.sqrt(attacker.stats.powerCore) * 1;
    
    // Armor mitigation matches ability system (K=1000 for very minimal scaling)
    const armorReduction = defender.stats.stability / (defender.stats.stability + 1000);
    const mitigation = 1 - armorReduction;
    
    // WoW-style level difference scaling (scales smoothly with each level)
    const levelDiff = defender.level - attacker.level;
    let damageMultiplier = 1.0;
    let missChance = 0;
    
    if (levelDiff > 0) {
      // Target is higher level: reduced damage and miss chance
      // 2% miss chance per level difference
      missChance = Math.min(0.6, levelDiff * 0.02);
      // 3% damage reduction per level difference, min 20% damage
      damageMultiplier = Math.max(0.2, 1.0 - (levelDiff * 0.03));
    } else if (levelDiff < 0) {
      // Target is lower level: increased damage
      // 3% bonus damage per level difference
      const levelsBelow = Math.abs(levelDiff);
      damageMultiplier = 1.0 + (levelsBelow * 0.03);
    }
    
    // Check for miss
    if (missChance > 0 && this.random() < missChance) {
      return 0; // Miss!
    }
    
    return Math.round(baseDamage * mitigation * damageMultiplier);
  }
  
  private calculateHeal(healer: CombatBot): number {
    // WoW-style healing: 6x powerCore
    const baseHeal = healer.stats.powerCore * 6;
    return Math.round(baseHeal);
  }
  
  private getAttackInterval(bot: CombatBot): number {
    return Math.max(3, 10 - Math.floor(bot.stats.acceleration / 10));
  }
  
  private selectTarget(bot: CombatBot, attackers: CombatBot[], defenders: CombatBot[]): { target: CombatBot; reason: string } | null {
    const aliveDef = defenders.filter(d => !d.isDead && !d.pendingDeath);
    if (aliveDef.length === 0) return null;
    
    // Re-evaluate target every turn based on threat (proper aggro system)
    // Calculate distance-adjusted threat for each target
    // Melee range (distance <= 5) = 100% threat
    // Beyond melee range, threat is reduced: threat * (1.0 - (distance - 5) * 0.1)
    const threatsWithDistance = aliveDef.map(target => {
      const distance = this.getDistance(bot.position, target.position);
      let effectiveThreat = target.threat;
      let reasons: string[] = [];
      
      // Distance-based threat reduction (like WoW)
      if (distance > 5) {
        const reduction = Math.min(0.9, (distance - 5) * 0.1); // Max 90% reduction
        effectiveThreat = target.threat * (1.0 - reduction);
        reasons.push(`distant (-${Math.round(reduction * 100)}%)`);
      } else {
        reasons.push(`close range`);
      }
      
      return { target, effectiveThreat, distance, reasons };
    });
    
    // Sort by effective threat (highest first), then by distance (closest first) as tiebreaker
    threatsWithDistance.sort((a, b) => {
      if (Math.abs(b.effectiveThreat - a.effectiveThreat) < 0.01) {
        // Threat is tied (within 0.01), pick closest enemy
        return a.distance - b.distance;
      }
      return b.effectiveThreat - a.effectiveThreat;
    });
    
    // Always pick highest threat target (deterministic, no RNG)
    const entry = threatsWithDistance[0];
    return { 
      target: entry.target, 
      reason: threatsWithDistance.length === 1 
        ? `only target (${entry.reasons.join(', ')})` 
        : `highest threat (${entry.reasons.join(', ')})`
    };
  }
  
  private selectHealTarget(team: CombatBot[]): { target: CombatBot; reason: string } | null {
    const alive = team.filter(b => !b.isDead && !b.pendingDeath);
    if (alive.length === 0) return null;
    
    const lowestHpBot = alive.reduce((lowest, b) => 
      (b.hp / b.maxHp) < (lowest.hp / lowest.maxHp) ? b : lowest
    );
    
    const hpPercent = Math.round((lowestHpBot.hp / lowestHpBot.maxHp) * 100);
    const reason = lowestHpBot.id === alive[0]?.id && alive.length === 1 
      ? `only ally (${hpPercent}% HP)` 
      : `lowest HP (${hpPercent}%)`;
    
    return { target: lowestHpBot, reason };
  }
  
  private evaluateCondition(rule: APLRule, bot: CombatBot, team: CombatBot[], enemyTeam: CombatBot[]): boolean {
    const condition = rule.condition.toLowerCase().trim();
    
    if (bot.class === 'Striker' && rule.abilityId === 'feint') {
      console.log(`    [evaluateCondition] original: "${rule.condition}", lowercased: "${condition}"`);
    }
    
    if (bot.class === 'Tactician') {
      console.log(`    [evaluateCondition TACTICIAN] original: "${rule.condition}", lowercased: "${condition}"`);
    }
    
    if (condition === 'always') return true;
    
    // Check if bot has enough resource (mana/rage/energy)
    if (condition === 'has_resource') {
      // Look up the ability from the APL rule
      const ability = bot.abilities.find(a => a.id === rule.abilityId);
      if (!ability) return false;
      
      // Only check resource, not cooldown
      return bot.resource >= ability.resourceCost;
    }
    
    // Check if ability is off cooldown
    if (condition === 'off_cooldown') {
      const ability = bot.abilities.find(a => a.id === rule.abilityId);
      if (!ability) {
        if (bot.class === 'Tactician') {
          console.log(`    [off_cooldown] ability NOT FOUND for abilityId: ${rule.abilityId}`);
        }
        return false;
      }
      
      const lastCast = bot.abilityCooldowns.get(ability.id) || -999;
      const cooldownTicks = ability.cooldown || 0;
      const isOffCooldown = (this.currentTick - lastCast) >= cooldownTicks;
      
      if (bot.class === 'Tactician') {
        console.log(`    [off_cooldown] ${ability.name}: lastCast=${lastCast}, current=${this.currentTick}, cooldown=${cooldownTicks}, result=${isOffCooldown}`);
      }
      
      return isOffCooldown;
    }
    
    // Combined: has resource AND off cooldown
    if (condition === 'ready') {
      const ability = bot.abilities.find(a => a.id === rule.abilityId);
      if (!ability) {
        if (bot.class === 'Tactician') {
          console.log(`    [Tactician ready check] ability NOT FOUND for abilityId: ${rule.abilityId}, available:`, bot.abilities.map(a => a.id));
        }
        return false;
      }
      
      // Check both resource and cooldown
      const hasResource = bot.resource >= ability.resourceCost;
      
      const lastCast = bot.abilityCooldowns.get(ability.id) || -999;
      const cooldownTicks = ability.cooldown || 0;
      const offCooldown = (this.currentTick - lastCast) >= cooldownTicks;
      
      if (bot.class === 'Striker' && ability.id === 'feint') {
        console.log(`    [Feint ready check] resource: ${bot.resource}/${ability.resourceCost} (${hasResource}), lastCast: ${lastCast}, cooldown: ${cooldownTicks}, ticksSince: ${this.currentTick - lastCast}, offCooldown: ${offCooldown}`);
      }
      
      if (bot.class === 'Tactician') {
        console.log(`    [Tactician ready check] ability: ${ability.name} (${ability.id}), resource: ${bot.resource}/${ability.resourceCost} (${hasResource}), lastCast: ${lastCast}, cooldown: ${cooldownTicks}, ticksSince: ${this.currentTick - lastCast}, offCooldown: ${offCooldown}, result: ${hasResource && offCooldown}`);
      }
      
      return hasResource && offCooldown;
    }
    
    // Combined conditions (e.g., "ally.hp < 50% AND has_resource")
    // MUST check this BEFORE individual conditions to properly split compound rules
    if (condition.includes('and')) {
      const parts = condition.split(/\s+and\s+/i).map(s => s.trim()); // case-insensitive split
      
      if (bot.class === 'Striker' && rule.abilityId === 'feint') {
        console.log(`    [Compound condition] parts:`, parts);
      }
      
      if (bot.class === 'Tactician') {
        console.log(`    [Compound condition TACTICIAN] parts:`, parts);
      }
      
      return parts.every(part => this.evaluateCondition({ ...rule, condition: part }, bot, team, enemyTeam));
    }
    
    // Resource conditions (TFT-style) - still support hardcoded thresholds
    if (condition.includes('resource >=')) {
      const threshold = parseInt(condition.match(/\d+/)?.[0] || '100');
      return bot.resource >= threshold;
    }
    
    if (condition.includes('resource <')) {
      const threshold = parseInt(condition.match(/\d+/)?.[0] || '50');
      return bot.resource < threshold;
    }
    
    // Resource type-specific conditions (rage/mana/energy)
    if (condition.includes('rage >=')) {
      const threshold = parseInt(condition.match(/\d+/)?.[0] || '100');
      return bot.resource >= threshold;
    }
    
    if (condition.includes('mana >=')) {
      const threshold = parseInt(condition.match(/\d+/)?.[0] || '100');
      return bot.resource >= threshold;
    }
    
    if (condition.includes('rage <')) {
      const threshold = parseInt(condition.match(/\d+/)?.[0] || '50');
      return bot.resource < threshold;
    }
    
    if (condition.includes('mana <')) {
      const threshold = parseInt(condition.match(/\d+/)?.[0] || '50');
      return bot.resource < threshold;
    }
    
    // Tank threat absolute check (e.g., "tank_threat > 20")
    if (condition.includes('tank_threat >') || condition.includes('tank_threat <')) {
      // Find the tank in the team (Bulwark class)
      const tank = team.find(ally => !ally.isDead && ally.class === 'Bulwark');
      if (!tank) return false; // No tank alive
      
      // Parse the threshold value
      const thresholdMatch = condition.match(/tank_threat\s*([><])\s*([\d.]+)/);
      if (!thresholdMatch) return false;
      
      const operator = thresholdMatch[1];
      const threshold = parseFloat(thresholdMatch[2]);
      
      if (operator === '>') {
        return tank.threat > threshold;
      } else {
        return tank.threat < threshold;
      }
    }
    
    // Tank threat comparison to bot's threat (e.g., "tank_threat > threat * 2")
    if (condition.includes('tank_threat > threat')) {
      // Find the tank in the team (Bulwark class)
      const tank = team.find(ally => !ally.isDead && ally.class === 'Bulwark');
      if (!tank) return false; // No tank alive
      
      // Parse the multiplier (e.g., 2 from "threat * 2")
      const multiplierMatch = condition.match(/threat\s*\*\s*([\d.]+)/);
      const multiplier = multiplierMatch ? parseFloat(multiplierMatch[1]) : 1.0;
      
      // Check if tank's threat exceeds bot's threat * multiplier
      return tank.threat > bot.threat * multiplier;
    }
    
    // Threat management (e.g., "threat > tank_threat * 0.8")
    if (condition.includes('threat >')) {
      // Find the tank in the team (Bulwark class)
      const tank = team.find(ally => !ally.isDead && ally.class === 'Bulwark');
      if (!tank) return false; // No tank alive, can't compare threat
      
      // Parse the multiplier (e.g., 0.8 from "tank_threat * 0.8")
      const multiplierMatch = condition.match(/\*\s*([\d.]+)/);
      const multiplier = multiplierMatch ? parseFloat(multiplierMatch[1]) : 1.0;
      
      // Check if bot's threat exceeds tank's threat * multiplier
      return bot.threat > tank.threat * multiplier;
    }
    
    // Ally threat check - compare highest ally threat to this bot's threat
    // E.g., "ally_threat > tank_threat * 0.7" (tanks use to maintain lead)
    // E.g., "ally_threat < tank_threat * 0.5" (DPS use to slow down if pulling too hard)
    if (condition.includes('ally_threat >') || condition.includes('ally_threat <')) {
      // Find highest threat among other allies (excluding self)
      const otherAllies = team.filter(ally => !ally.isDead && ally.id !== bot.id);
      if (otherAllies.length === 0) return false;
      
      const highestAllyThreat = Math.max(...otherAllies.map(ally => ally.threat));
      
      // Parse the multiplier
      const multiplierMatch = condition.match(/\*\s*([\d.]+)/);
      const multiplier = multiplierMatch ? parseFloat(multiplierMatch[1]) : 1.0;
      
      if (bot.class === 'Bulwark') {
        console.log(`    [ally_threat check] Tank threat: ${bot.threat}, highest ally: ${highestAllyThreat}, threshold: ${bot.threat * multiplier}, condition: ${condition}`);
      }
      
      // Check comparison type
      if (condition.includes('ally_threat >')) {
        return highestAllyThreat > bot.threat * multiplier;
      } else {
        return highestAllyThreat < bot.threat * multiplier;
      }
    }
    
    if (condition.includes('self.hp <')) {
      const threshold = parseInt(condition.match(/\d+/)?.[0] || '50');
      return (bot.hp / bot.maxHp) * 100 < threshold;
    }
    
    if (condition.includes('ally.hp <')) {
      const threshold = parseInt(condition.match(/\d+/)?.[0] || '50');
      const healResult = this.selectHealTarget(team);
      return healResult ? (healResult.target.hp / healResult.target.maxHp) * 100 < threshold : false;
    }
    
    if (condition.includes('enemy.hp <')) {
      const threshold = parseInt(condition.match(/\d+/)?.[0] || '20');
      const targetResult = this.selectTarget(bot, team, enemyTeam);
      return targetResult ? (targetResult.target.hp / targetResult.target.maxHp) * 100 < threshold : false;
    }
    
    if (condition.includes('target.type') || condition.includes('enemy.type')) {
      if (condition.includes('healer') || condition.includes('fixer')) {
        return enemyTeam.some(e => !e.isDead && e.class === 'Fixer');
      }
    }
    
    // Check if any enemy is targeting an ally (not me)
    if (condition.includes('enemy_targeting_ally')) {
      return enemyTeam.some(e => !e.isDead && e.currentTargetId && e.currentTargetId !== bot.id);
    }
    
    return false;
  }
  
  /**
   * Handle bot movement (called every tick for moving bots)
   * Returns true if bot moved this turn (and should skip actions)
   */
  private handleMovement(bot: CombatBot): boolean {
    if (!bot.isMoving || !bot.currentTargetId) return false;
    
    // Update target position each tick (target may have moved)
    const target = [...this.party, ...this.enemy].find(b => b.id === bot.currentTargetId && !b.isDead);
    
    if (!target) {
      // Target died, stop moving
      bot.isMoving = false;
      bot.targetPosition = null;
      bot.currentTargetId = null;
      return false;
    }
    
    // Update target position to current location
    bot.targetPosition = { ...target.position };
    
    // Move closer (we already know we're out of range from the caller)
    const oldPos = { ...bot.position };
    this.moveTowards(bot, bot.targetPosition);
    
    // Only record movement if position actually changed
    if (bot.position.x !== oldPos.x || bot.position.y !== oldPos.y) {
      this.actions.push({
        tick: this.currentTick,
        sequence: this.actionSequence++,
        actorId: bot.id,
        actorName: bot.name,
        targetId: bot.id,
        targetName: bot.name,
        actionType: 'move',
        value: 0,
        isCrit: false,
        description: `${bot.name} moves from (${oldPos.x},${oldPos.y}) to (${bot.position.x},${bot.position.y})`,
        newActorHp: bot.hp,
        newActorResource: bot.resource,
        newActorTargetId: bot.currentTargetId || undefined,
        newActorPosition: { ...bot.position }
      });
      return true; // Moved this turn, skip action
    } else {
      // Couldn't move (blocked or can't reach target), retarget
      bot.isMoving = false;
      bot.targetPosition = null;
      bot.currentTargetId = null;
      return false; // Didn't actually move
    }
  }
  
  private performAction(bot: CombatBot, team: CombatBot[], enemyTeam: CombatBot[]) {
    if (bot.isDead || bot.pendingDeath) return;
    
    // APL rules are already in priority order (array index = priority)
    for (let i = 0; i < bot.apl.length; i++) {
      const rule = bot.apl[i];
      const result = this.evaluateCondition(rule, bot, team, enemyTeam);
      
      if (bot.class === 'Striker' || bot.class === 'Bulwark' || bot.class === 'Tactician') {
        console.log(`[T${String(this.currentTick).padStart(3, '0')}] ${bot.name} APL rule #${i+1}: ${rule.condition} -> ${rule.abilityId}`, result ? 'PASSED' : 'FAILED');
      }
      
      if (result) {
        // Look up ability by ID
        const ability = bot.abilities.find(a => a.id === rule.abilityId);
        if (!ability) {
          console.warn(`Ability ${rule.abilityId} not found for ${bot.name}`);
          continue;
        }
        this.castAbility(ability, bot, team, enemyTeam);
        return;
      }
    }
    
    if (bot.class === 'Striker' || bot.class === 'Tactician') {
      console.log(`[T${String(this.currentTick).padStart(3, '0')}] ${bot.name} NO APL RULES PASSED - bot does nothing`);
    }
    // No APL or no matching rules: bot does nothing
  }
  
  /**
   * Handle special ability mechanics based on AbilityType
   */
  private handleAbilityMechanics(
    abilityType: AbilityType,
    caster: CombatBot,
    target: CombatBot | null,
    team: CombatBot[],
    enemyTeam: CombatBot[]
  ) {
    switch (abilityType) {
      // Class core abilities
      case AbilityType.TAUNT:
        // WoW-style Taunt: Set threat to highest threat + 20%, and force target to attack
        if (target && !target.isDead && !target.pendingDeath) {
          // Find highest threat among allies
          const highestThreat = Math.max(...team.map(ally => ally.threat));
          if (highestThreat > caster.threat) {
            caster.threat = highestThreat * 1.2; // Match + 20% bonus
          }
          
          // Force target enemy to attack the caster
          target.currentTargetId = caster.id;
          target.targetPosition = { ...caster.position };
        }
        break;
        
      case AbilityType.EXECUTE:
        // Handled in damage calculation below
        break;
        
      case AbilityType.EMERGENCY_HEAL:
        // Auto-target lowest HP ally if no target specified
        if (!target) {
          const healResult = this.selectHealTarget(team);
          if (healResult) {
            target = healResult.target;
          }
        }
        break;
        
      case AbilityType.BATTLE_COMMAND:
        // Grant resource to all allies
        console.log(`[BATTLE COMMAND] Granting +30 resource to ${team.length} allies`);
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            const oldResource = ally.resource;
            ally.resource = Math.min(ally.maxResource, ally.resource + 30);
            console.log(`  -> ${ally.name}: ${oldResource} -> ${ally.resource} (${ally.resourceType})`);
          }
        }
        
        // Log the Battle Command cast
        this.actions.push({
          tick: this.currentTick,
          sequence: this.actionSequence++,
          actorId: caster.id,
          actorName: caster.name,
          targetId: caster.id,
          targetName: caster.name,
          actionType: 'buff',
          value: 30,
          isCrit: false,
          description: `${caster.name} uses Battle Command (+30 resource to all allies) [${caster.resourceType}: ${Math.round(caster.resource)}]`,
          newActorHp: caster.hp,
          newActorResource: caster.resource,
          newTargetHp: caster.hp,
          newActorPosition: { ...caster.position },
          newTargetPosition: { ...caster.position }
        });
        break;
      
      case AbilityType.FEINT:
        // Reduce threat by 50% (DPS threat management)
        caster.threat = caster.threat * 0.5;
        this.actions.push({
          tick: this.currentTick,
          sequence: this.actionSequence++,
          actorId: caster.id,
          actorName: caster.name,
          targetId: caster.id,
          targetName: caster.name,
          actionType: 'buff',
          value: 0,
          isCrit: false,
          description: `${caster.name} uses Feint (threat reduced by 50%)`,
          newActorHp: caster.hp,
          newTargetHp: caster.hp,
          newActorPosition: { ...caster.position },
          newTargetPosition: { ...caster.position },
          newActorResource: caster.resource,
          newActorThreat: caster.threat
        });
        break;
        
      case AbilityType.FADE:
        // Reduce threat by 50% (Healer threat management)
        caster.threat = caster.threat * 0.5;
        this.actions.push({
          tick: this.currentTick,
          sequence: this.actionSequence++,
          actorId: caster.id,
          actorName: caster.name,
          targetId: caster.id,
          targetName: caster.name,
          actionType: 'buff',
          value: 0,
          isCrit: false,
          description: `${caster.name} uses Fade (threat reduced by 50%)`,
          newActorHp: caster.hp,
          newTargetHp: caster.hp,
          newActorPosition: { ...caster.position },
          newTargetPosition: { ...caster.position },
          targetDied: false
        });
        break;
      
      // Faction special abilities
      case AbilityType.OMNIPRESENT_SHIELD:
        // Grant immunity buff to party
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `immunity_${this.currentTick}`,
              name: 'Omnipresent Shield',
              type: 'buff',
              duration: 600,  // 60 seconds
              effect: {}  // Special: immunity to one killing blow
            });
          }
        }
        break;
        
      case AbilityType.EXISTENTIAL_CRISIS:
        // Apply vulnerability debuff to target
        if (target) {
          target.debuffs.push({
            id: `vulnerability_${this.currentTick}`,
            name: 'Existential Crisis',
            type: 'debuff',
            duration: 100,
            effect: { modifier: 0.25 }  // +25% damage taken
          });
        }
        break;
        
      case AbilityType.LIFEGIVER:
        // Revive a dead ally (find first dead ally)
        const deadAlly = team.find(bot => bot.isDead);
        if (deadAlly) {
          deadAlly.isDead = false;
          deadAlly.pendingDeath = false;
          deadAlly.hp = deadAlly.maxHp * 0.5;  // Revive at 50% HP
        }
        break;
        
      case AbilityType.TIME_DILATION:
        // Grant speed buff to party
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `speed_${this.currentTick}`,
              name: 'Time Dilation',
              type: 'buff',
              duration: 100,
              effect: { stat: 'speed', modifier: 0.1 }  // +10% speed
            });
          }
        }
        break;
        
      case AbilityType.LIFE_DRAIN:
        // Grant lifesteal buff to party
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `lifesteal_${this.currentTick}`,
              name: 'Life Drain',
              type: 'buff',
              duration: 55,
              effect: { modifier: 0.05 }  // Heal 5% of damage dealt
            });
          }
        }
        break;
        
      case AbilityType.POLLINATION:
        // Heal spreads to adjacent allies (handled in heal logic)
        break;
        
      case AbilityType.FEAST:
        // AoE heal all allies
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            const healing = (180 / 100) * caster.stats.powerCore;
            const actualHealing = Math.min(healing, ally.maxHp - ally.hp);
            ally.hp += actualHealing;
            ally.resource = Math.min(ally.maxResource, ally.resource + 10);  // Restore energy
          }
        }
        break;
        
      case AbilityType.STASIS_FIELD:
        // Grant immunity to target
        if (target) {
          target.buffs.push({
            id: `stasis_${this.currentTick}`,
            name: 'Stasis Field',
            type: 'buff',
            duration: 30,  // 3 seconds
            effect: {}  // Special: immunity
          });
        }
        break;
        
      case AbilityType.WILD_CARD_DEFENSE:
        // Grant immunity to random ally
        const aliveAllies = team.filter(bot => !bot.isDead && !bot.pendingDeath);
        if (aliveAllies.length > 0) {
          const randomAlly = aliveAllies[Math.floor(this.random() * aliveAllies.length)];
          randomAlly.buffs.push({
            id: `immunity_${this.currentTick}`,
            name: 'Wild Card Defense',
            type: 'buff',
            duration: 30,  // 3 seconds
            effect: {}  // Special: immunity
          });
        }
        break;
        
      case AbilityType.DOUBLE_OR_NOTHING:
        // 50% chance double heal or nothing (handled in heal logic)
        break;
        
      case AbilityType.PACK_LEADER:
        // Grant evasion buff to low HP allies
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath && ally.hp < ally.maxHp * 0.5) {
            ally.buffs.push({
              id: `evasion_${this.currentTick}`,
              name: 'Pack Leader',
              type: 'buff',
              duration: 120,
              effect: { modifier: 0.15 }  // +15% evasion
            });
          }
        }
        break;
        
      case AbilityType.HOWL:
        // Grant attack speed buff to party
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `attackspeed_${this.currentTick}`,
              name: 'Howl',
              type: 'buff',
              duration: 100,
              effect: { stat: 'acceleration', modifier: 0.15 }  // +15% attack speed
            });
          }
        }
        break;
      
      case AbilityType.UNDYING_PRESENCE:
        // Dead Bulwark: Low HP allies take -30% damage
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath && ally.hp < ally.maxHp * 0.5) {
            ally.buffs.push({
              id: `undying_${this.currentTick}`,
              name: 'Undying Presence',
              type: 'buff',
              duration: 120,
              effect: { damageReduction: 0.3 }  // -30% damage taken
            });
          }
        }
        break;
      
      case AbilityType.SEALED_FORTRESS:
        // Box Bulwark: Allies take -50% damage from first hit
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `sealed_${this.currentTick}`,
              name: 'Sealed Fortress',
              type: 'buff',
              duration: 60,
              effect: { firstHitReduction: 0.5 }  // -50% damage on first hit
            });
          }
        }
        break;
      
      case AbilityType.HEAT_SHIELD:
        // Industrial Bulwark: Damage converts to attack buff
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `heat_${this.currentTick}`,
              name: 'Heat Shield',
              type: 'buff',
              duration: 80,
              effect: { damageToAttack: 0.2 }  // 20% of damage taken converts to attack buff
            });
          }
        }
        break;
      
      case AbilityType.PERFECT_DEFENSE:
        // Ultimate Bulwark: Party -10% damage taken
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `perfect_defense_${this.currentTick}`,
              name: 'Perfect Defense',
              type: 'buff',
              duration: 100,
              effect: { damageReduction: 0.1 }
            });
          }
        }
        break;
      
      case AbilityType.GRAVITATIONAL_PULL:
        // Blackhole Bulwark: Enemies -15% attack speed
        for (const enemy of enemyTeam) {
          if (!enemy.isDead && !enemy.pendingDeath) {
            enemy.debuffs.push({
              id: `slow_${this.currentTick}`,
              name: 'Gravitational Pull',
              type: 'debuff',
              duration: 80,
              effect: { stat: 'acceleration', modifier: -0.15 }
            });
          }
        }
        break;
      
      case AbilityType.REALITY_DISTORTION:
        // Wild Bulwark: 15% phase through (evasion)
        caster.buffs.push({
          id: `phase_${this.currentTick}`,
          name: 'Reality Distortion',
          type: 'buff',
          duration: 100,
          effect: { evasion: 0.15 }
        });
        break;
      
      case AbilityType.BLOOD_SHIELD:
        // Murder Bulwark: Shield based on missing HP
        const missingHp = caster.maxHp - caster.hp;
        const shieldAmount = missingHp * 0.3;  // 30% of missing HP
        caster.buffs.push({
          id: `shield_${this.currentTick}`,
          name: 'Blood Shield',
          type: 'buff',
          duration: 60,
          effect: { shield: shieldAmount }
        });
        break;
      
      case AbilityType.HIVE_MIND:
        // Bee Bulwark: Damage shared across party
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `hivemind_${this.currentTick}`,
              name: 'Hive Mind',
              type: 'buff',
              duration: 80,
              effect: { damageSharing: 0.25 }  // Share 25% of damage taken
            });
          }
        }
        break;
      
      case AbilityType.LOCKBOX:
        // Box Striker: Stun target
        if (target) {
          target.debuffs.push({
            id: `stun_${this.currentTick}`,
            name: 'Lockbox',
            type: 'debuff',
            duration: 20,  // 2 second stun
            effect: { stun: true }
          });
        }
        break;
      
      case AbilityType.CRUSHING_SINGULARITY:
        // Blackhole Striker: 4x damage to low HP targets (handled in damage calc)
        break;
      
      case AbilityType.ASSASSINATE:
        // Murder Striker: +30% damage to high HP targets (handled in damage calc)
        break;
      
      case AbilityType.CHAOS_ENGINE:
        // Wild Striker: Crits apply random debuff
        if (target) {
          const debuffs = ['slow', 'weakness', 'vulnerability'];
          const randomDebuff = debuffs[Math.floor(this.random() * debuffs.length)];
          target.debuffs.push({
            id: `${randomDebuff}_${this.currentTick}`,
            name: 'Chaos Engine',
            type: 'debuff',
            duration: 60,
            effect: { modifier: -0.15 }
          });
        }
        break;
      
      case AbilityType.SURPRISE_ATTACK:
        // Box Striker: 20% chance to ignore armor (handled in damage calc)
        break;
      
      case AbilityType.WEAK_POINT:
        // Ultimate Striker: Reduce armor on crit (handled in damage calc)
        if (target) {
          target.debuffs.push({
            id: `armor_break_${this.currentTick}`,
            name: 'Weak Point',
            type: 'debuff',
            duration: 100,
            effect: { stat: 'stability', modifier: -0.2 }  // -20% armor
          });
        }
        break;
      
      case AbilityType.HUNTERS_MARK:
        // Animal Striker: +15% damage to wounded targets (handled in damage calc)
        break;
      
      case AbilityType.CRUSH:
        // Industrial Striker: Ignore 30% of armor (handled in damage calc)
        break;
      
      case AbilityType.EVENT_HORIZON:
        // Blackhole Fixer: Shield converts to heal (special heal mechanic)
        break;
      
      case AbilityType.REALITY_PATCH:
        // Wild Fixer: Heal + remove random debuff
        if (target && target.debuffs.length > 0) {
          const randomIndex = Math.floor(this.random() * target.debuffs.length);
          target.debuffs.splice(randomIndex, 1);
        }
        break;
      
      case AbilityType.SACRIFICIAL_PACT:
        // Dead Fixer: Heal costs own HP
        const healAmount = (450 / 100) * caster.stats.powerCore;
        const hpCost = healAmount * 0.3;  // Cost 30% of heal as HP
        caster.hp = Math.max(1, caster.hp - hpCost);
        break;
      
      case AbilityType.TRANSFUSION:
        // Murder Fixer: Transfer HP to ally
        if (target) {
          const transferAmount = caster.hp * 0.2;  // Transfer 20% of own HP
          caster.hp -= transferAmount;
          target.hp = Math.min(target.maxHp, target.hp + transferAmount);
        }
        break;
      
      case AbilityType.SPOT_WELD:
        // Industrial Fixer: Heal + restore 5% highest stat
        if (target) {
          const highestStat = Math.max(
            target.stats.speed,
            target.stats.powerCore,
            target.stats.stability,
            target.stats.acceleration
          );
          target.buffs.push({
            id: `weld_${this.currentTick}`,
            name: 'Spot Weld',
            type: 'buff',
            duration: 80,
            effect: { statBoost: highestStat * 0.05 }
          });
        }
        break;
      
      case AbilityType.DOUBLE_OR_NOTHING:
        // Wild Fixer: 50% chance double heal (handled in heal logic)
        break;
      
      case AbilityType.JACKPOT:
        // Wild Tactician: Random massive buff
        const aliveAllies2 = team.filter(bot => !bot.isDead && !bot.pendingDeath);
        if (aliveAllies2.length > 0) {
          const randomAlly = aliveAllies2[Math.floor(this.random() * aliveAllies2.length)];
          const stats: Array<keyof BotStats> = ['speed', 'powerCore', 'stability', 'acceleration'];
          const randomStat = stats[Math.floor(this.random() * stats.length)];
          randomAlly.buffs.push({
            id: `jackpot_${this.currentTick}`,
            name: 'Jackpot',
            type: 'buff',
            duration: 100,
            effect: { stat: randomStat, modifier: 0.3 }  // +30% to random stat
          });
        }
        break;
      
      case AbilityType.EXPOSE_WEAKNESS:
        // Murder Tactician: Enemy takes +20% damage
        if (target) {
          target.debuffs.push({
            id: `exposed_${this.currentTick}`,
            name: 'Expose Weakness',
            type: 'debuff',
            duration: 100,
            effect: { damageAmplification: 0.2 }
          });
        }
        break;
      
      case AbilityType.COORDINATED_STRIKE:
        // Game Tactician: Party +15% attack power
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `coordinated_${this.currentTick}`,
              name: 'Coordinated Strike',
              type: 'buff',
              duration: 100,
              effect: { stat: 'powerCore', modifier: 0.15 }
            });
          }
        }
        break;
      
      case AbilityType.TACTICAL_FORMATION:
        // Box Tactician: Party +10% all stats
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `formation_${this.currentTick}`,
              name: 'Tactical Formation',
              type: 'buff',
              duration: 80,
              effect: { allStats: 0.1 }
            });
          }
        }
        break;
      
      case AbilityType.OVERWHELMING_NUMBERS:
        // Bee Tactician: Buff scales with team size
        const teamSize = team.filter(bot => !bot.isDead && !bot.pendingDeath).length;
        const buffAmount = teamSize * 0.05;  // 5% per alive ally
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `numbers_${this.currentTick}`,
              name: 'Overwhelming Numbers',
              type: 'buff',
              duration: 100,
              effect: { stat: 'powerCore', modifier: buffAmount }
            });
          }
        }
        break;
      
      case AbilityType.OPTIMIZATION:
        // Ultimate Tactician: Party cooldowns -10%
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `optimization_${this.currentTick}`,
              name: 'Optimization',
              type: 'buff',
              duration: 120,
              effect: { cooldownReduction: 0.1 }
            });
          }
        }
        break;
      
      case AbilityType.CHAOS_FORECAST:
        // Wild Tactician: Random buff to random ally (similar to jackpot but different flavor)
        const aliveAllies3 = team.filter(bot => !bot.isDead && !bot.pendingDeath);
        if (aliveAllies3.length > 0) {
          const randomAlly = aliveAllies3[Math.floor(this.random() * aliveAllies3.length)];
          randomAlly.buffs.push({
            id: `chaos_${this.currentTick}`,
            name: 'Chaos Forecast',
            type: 'buff',
            duration: 60,
            effect: { modifier: 0.25 }
          });
        }
        break;
      
      case AbilityType.OMNISCIENCE:
        // Ultimate-master Tactician: See enemy abilities early (informational, no mechanical effect in auto-battle)
        break;
      
      case AbilityType.INTOXICATE:
        // Food Tactician: Confuse enemies (reduce accuracy)
        for (const enemy of enemyTeam) {
          if (!enemy.isDead && !enemy.pendingDeath) {
            enemy.debuffs.push({
              id: `confused_${this.currentTick}`,
              name: 'Intoxicate',
              type: 'debuff',
              duration: 80,
              effect: { accuracy: -0.2 }  // -20% accuracy
            });
          }
        }
        break;
      
      case AbilityType.COORDINATION:
        // Animal Tactician: Party +10% speed
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `coordination_${this.currentTick}`,
              name: 'Coordination',
              type: 'buff',
              duration: 100,
              effect: { stat: 'speed', modifier: 0.1 }
            });
          }
        }
        break;
      
      case AbilityType.OVERCHARGE:
        // Industrial Tactician: Party +20% power core temporarily
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `overcharge_${this.currentTick}`,
              name: 'Overcharge',
              type: 'buff',
              duration: 60,
              effect: { stat: 'powerCore', modifier: 0.2 }
            });
          }
        }
        break;
      
      case AbilityType.BATTLE_PLAN:
        // Dead Tactician: Party +15% damage
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath) {
            ally.buffs.push({
              id: `battle_plan_${this.currentTick}`,
              name: 'Battle Plan',
              type: 'buff',
              duration: 100,
              effect: { damageAmplification: 0.15 }
            });
          }
        }
        break;
      
      case AbilityType.TRIAGE_PROTOCOL:
        // Ultimate Fixer: Prioritize lowest HP ally (handled in targeting)
        break;
      
      case AbilityType.REGENERATION:
        // Animal Fixer: HoT (heal over time)
        if (target) {
          target.buffs.push({
            id: `regen_${this.currentTick}`,
            name: 'Regeneration',
            type: 'buff',
            duration: 100,
            effect: { healOverTime: caster.stats.powerCore * 5 }  // Heal per tick
          });
        }
        break;
      
      case AbilityType.FLAVOR_BURST:
        // Food Fixer: Heal + movement speed
        if (target) {
          target.buffs.push({
            id: `flavor_${this.currentTick}`,
            name: 'Flavor Burst',
            type: 'buff',
            duration: 80,
            effect: { stat: 'speed', modifier: 0.15 }
          });
        }
        break;
      
      case AbilityType.FEAST_AURA:
        // Food Bulwark: Passive AoE healing aura
        for (const ally of team) {
          if (!ally.isDead && !ally.pendingDeath && ally.id !== caster.id) {
            const healAmount = caster.stats.powerCore * 2;  // Small heal per tick
            ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
          }
        }
        break;
      
      case AbilityType.GAMBIT:
        // Wild Striker: High risk/reward damage
        // 50% chance for +50% damage, 50% chance for -25% damage (handled in damage calc)
        break;
      
      case AbilityType.DEATHS_HERALD:
        // Dead Striker: Damage increases as HP decreases
        // Handled via damage scaling based on caster's missing HP
        break;
        
      // Add more ability mechanics as needed
      default:
        // No special mechanics for this ability type
        break;
    }
  }
  
  /**
   * Cast an ability using the new TFT-style resource system
   */
  private castAbility(
    ability: Ability,
    bot: CombatBot,
    team: CombatBot[],
    enemyTeam: CombatBot[]
  ) {
    if (bot.class === 'Tactician') {
      console.log(`[castAbility] ${bot.name} attempting to cast ${ability.name}, resource: ${bot.resource}/${ability.resourceCost}`);
    }
    
    // Check if bot died before getting to cast
    if (bot.isDead || bot.pendingDeath) {
      if (bot.class === 'Tactician') console.log(`  -> Bot is dead, aborting`);
      return;
    }
    
    // Check cooldown using unified abilityCooldowns map
    const lastCast = bot.abilityCooldowns.get(ability.id) || -999;
    const cooldownTicks = ability.cooldown || 0;
    if (this.currentTick - lastCast < cooldownTicks) {
      if (bot.class === 'Tactician') console.log(`  -> Still on cooldown! lastCast: ${lastCast}, current: ${this.currentTick}, cooldown: ${cooldownTicks}, ticksSince: ${this.currentTick - lastCast}`);
      return; // Still on cooldown
    }
    
    // Check resource cost (this IS the cooldown in TFT-style systems)
    if (bot.resource < ability.resourceCost) {
      if (bot.class === 'Tactician') console.log(`  -> Not enough resource! has: ${bot.resource}, needs: ${ability.resourceCost}`);
      return; // Not enough resource
    }
    
    if (bot.class === 'Tactician') {
      console.log(`  -> All checks passed, proceeding with cast`);
    }
    
    // Select target based on ability type
    let target: CombatBot | null = null;
    let targetReason: string = '';
    if (ability.targetType === 'enemy') {
      const targetResult = this.selectTarget(bot, team, enemyTeam);
      if (targetResult) {
        target = targetResult.target;
        targetReason = targetResult.reason;
      }
    } else if (ability.targetType === 'ally') {
      const healResult = this.selectHealTarget(team);
      if (healResult) {
        target = healResult.target;
        targetReason = healResult.reason;
      }
    } else if (ability.targetType === 'self') {
      target = bot;
      targetReason = 'self-cast';
    }
    // For 'all-enemies' and 'all-allies', target is null (AoE)
    
    // If no target found and this is a single-target ability, can't cast
    if (!target && ability.targetType !== 'all-allies' && ability.targetType !== 'all-enemies') {
      return;
    }
    
    // Check range for single-target abilities (but skip for self-cast)
    if (target && ability.targetType !== 'all-allies' && ability.targetType !== 'all-enemies' && ability.targetType !== 'self') {
      const distance = this.getDistance(bot.position, target.position);
      const inRange = this.isInActionRange(bot, target, ability.maxRange, ability.minRange);
      
      if (bot.class === 'Striker') {
        console.log(`  -> Distance to ${target.name}: ${distance}, maxRange: ${ability.maxRange}, inRange: ${inRange}`);
        console.log(`  -> Bot position: (${bot.position.x}, ${bot.position.y}), Target position: (${target.position.x}, ${target.position.y})`);
      }
      
      // Log target change if it's different from current
      if (bot.currentTargetId !== target.id) {
        this.actions.push({
          tick: this.currentTick,
          sequence: this.actionSequence++,
          actorId: bot.id,
          actorName: bot.name,
          targetId: target.id,
          targetName: target.name,
          actionType: 'buff',
          value: 0,
          isCrit: false,
          description: `🎯 ${bot.name} targets ${target.name} (${targetReason})`,
          newActorHp: bot.hp,
          newTargetHp: target.hp,
          newActorPosition: { ...bot.position },
          newActorTargetId: target.id,
          targetDied: false
        });
      }
      bot.currentTargetId = target.id;
      
      if (!inRange) {
        // Out of range - move closer (this consumes the turn)
        bot.currentTargetId = target.id;
        // Find unoccupied position near target to prevent stacking
        bot.targetPosition = this.findNearbyUnoccupiedPosition(target.position, bot);
        bot.isMoving = true;
        this.handleMovement(bot);
        return; // Movement consumed this turn
      }
      
      // In range - clear any movement state
      bot.isMoving = false;
      bot.targetPosition = null;
    }
    
    // Consume resource and update cooldown
    bot.resource -= ability.resourceCost;
    bot.abilityCooldowns.set(ability.id, this.currentTick);
    
    // Track last cast for mana regen (only for abilities that cost resources)
    if (ability.resourceCost > 0) {
      bot.lastCastTick = this.currentTick;
      console.log(`[Tick ${this.currentTick}] ${bot.name} cast ${ability.name} (cost ${ability.resourceCost}), setting lastCastTick`);
    }
    
    // Backwards compat
    if (ability.resourceCost === 0) {
      bot.lastBasicAttack = this.currentTick;
    } else {
      bot.lastMainAbility = this.currentTick;
    }
    
    // Generate resource (for basic attacks)
    // Only rage users generate resource from attacks
    // Mana users rely purely on passive regeneration
    if (ability.resourceGeneration > 0) {
      const oldResource = bot.resource;
      const resourceGain = bot.resourceType === 'mana' 
        ? 0  // Mana users don't generate mana from basic attacks
        : ability.resourceGeneration;        // Rage users get full amount
      bot.resource = Math.min(bot.maxResource, bot.resource + resourceGain);
      console.log(`[RESOURCE GEN] ${bot.name}: ${oldResource} -> ${bot.resource} (+${resourceGain}), resourceType=${bot.resourceType}`);
    }
    
    // Handle special ability mechanics based on abilityType
    if (ability.abilityType) {
      this.handleAbilityMechanics(ability.abilityType, bot, target, team, enemyTeam);
    }
    
    // Execute ability effects
    if (ability.damage && target) {
      // Damage ability - sublinear scaling to compress rating advantage
      // Damage scaling: ability.damage × sqrt(powerCore) × 1.0 (Fixer: × 0.85)
      // 100 damage × sqrt(20) = 447, × sqrt(40) = 632 (+41% for 2x stats)
      let baseDamage = ability.damage * Math.sqrt(bot.stats.powerCore) * 1.0;
      
      // Healers do slightly less damage (support hybrid)
      if (bot.class === 'Fixer') {
        baseDamage *= 0.85;
      }
      
      // Apply mitigation based on damage type
      let armorReduction: number;
      const damageType = ability.damageType || 'physical'; // Default to physical
      
      if (damageType === 'physical') {
        // Physical damage mitigated by stability (armor)
        // Formula: armor / (armor + K) where K controls scaling
        // Higher K = armor less effective, stats matter less for defense
        // K=1000: Very minimal armor scaling to reduce rating advantage strength
        // Tank (60 armor): 60/(60+1000) = 5.7% reduction → takes 94.3% damage
        // DPS (30 armor): 30/(30+1000) = 2.9% reduction → takes 97.1% damage
        // Defense barely scales, offense dominates
        armorReduction = target.stats.stability / (target.stats.stability + 1000);
      } else {
        // Magical damage mitigated by acceleration (magic resist)
        // K=400: Very minimal magical armor scaling to reduce rating advantage strength
        // Tank (20 accel): 20/(20+400) = 4.8% reduction → takes 95.2% magical damage
        // Caster (40 accel): 40/(40+400) = 9.1% reduction → takes 90.9% magical damage
        armorReduction = target.stats.acceleration / (target.stats.acceleration + 400);
      }
      
      // Apply special ability damage modifiers
      let armorPenetration = 0.0;  // How much armor to ignore (0 = none, 1 = all armor ignored)
      
      if (ability.abilityType === AbilityType.EXECUTE && target.hp < target.maxHp * 0.5) {
        baseDamage *= 3;  // 3x damage to targets below 50% HP
      }
      if (ability.abilityType === AbilityType.CRUSHING_SINGULARITY && target.hp < target.maxHp * 0.2) {
        baseDamage *= 4;  // 4x damage to targets below 20% HP (Blackhole execute)
      }
      if (ability.abilityType === AbilityType.ASSASSINATE && target.hp > target.maxHp * 0.7) {
        baseDamage *= 1.3;  // +30% damage to high HP targets
      }
      if (ability.abilityType === AbilityType.HUNTERS_MARK && target.hp < target.maxHp * 0.7) {
        baseDamage *= 1.15;  // +15% damage to wounded targets
      }
      if (ability.abilityType === AbilityType.CRUSH) {
        armorPenetration = 0.3;  // Ignore 30% of armor
      }
      if (ability.abilityType === AbilityType.SURPRISE_ATTACK && this.random() < 0.2) {
        armorPenetration = 1.0;  // 20% chance to ignore all armor
      }
      
      // Apply armor with penetration
      // If armorPenetration = 0.3, then 30% of armor is ignored, 70% remains effective
      const effectiveArmorReduction = armorReduction * (1 - armorPenetration);
      const finalDamageMultiplier = 1 - effectiveArmorReduction;
      baseDamage *= finalDamageMultiplier;
      
      // SOFT ENRAGE: Damage amplification after 300 ticks (30 seconds)
      if (this.currentTick >= 300) {
        const enrageStacks = Math.floor((this.currentTick - 300) / 50); // +1 stack every 5 seconds
        const damageMultiplier = 1 + (enrageStacks * 0.1); // +10% per stack
        baseDamage *= damageMultiplier;
      }
      
      // Crit chance: base 5% + speed bonus, with diminishing penalty for level difference
      const baseCritChance = 0.05 + bot.stats.speed / 200; // 5-55% range
      const levelDiff = target.level - bot.level;
      
      // Use square root scaling for gentler suppression: 10 levels = -6.3%, 50 levels = -14.1%, 100 levels = -20%
      const critSupression = levelDiff > 0 ? Math.sqrt(levelDiff) * 0.02 : 0;
      const finalCritChance = Math.max(0.05, baseCritChance - critSupression); // Minimum 5%
      
      const isCrit = this.random() < finalCritChance;
      let finalDamage = baseDamage * (isCrit ? 1.5 : 1);
      
      // Apply target's damage reduction buffs
      let damageReduction = 0;
      for (const buff of target.buffs) {
        if (buff.effect.damageReduction) {
          damageReduction += buff.effect.damageReduction;
        }
      }
      finalDamage *= (1 - damageReduction);
      
      // Apply target's damage amplification debuffs
      let damageAmplification = 0;
      for (const debuff of target.debuffs) {
        if (debuff.effect.damageAmplification) {
          damageAmplification += debuff.effect.damageAmplification;
        }
      }
      finalDamage *= (1 + damageAmplification);
      
      // Apply caster's damage amplification buffs
      let casterDamageAmp = 0;
      for (const buff of bot.buffs) {
        if (buff.effect.damageAmplification) {
          casterDamageAmp += buff.effect.damageAmplification;
        }
      }
      finalDamage *= (1 + casterDamageAmp);
      
      target.hp -= finalDamage;
      
      // Threat generation from ability's threatMultiplier (default 1.0)
      const threatMultiplier = ability.threatMultiplier ?? 1.0;
      bot.threat += finalDamage * threatMultiplier;
      
      if (target.hp <= 0) {
        target.hp = 0;
        target.pendingDeath = true;  // Mark for death, but keep visible this tick
        bot.currentTargetId = null;
        // Clear movement state when target dies
        bot.isMoving = false;
        bot.targetPosition = null;
      }
      
      this.actions.push({
        tick: this.currentTick,
        sequence: this.actionSequence++,
        actorId: bot.id,
        actorName: bot.name,
        targetId: target.id,
        targetName: target.name,
        actionType: ability.resourceCost === 0 ? 'basic_attack' : 'ability',
        value: finalDamage,
        isCrit,
        description: `${bot.name} casts ${ability.name} on ${target.name} for ${Math.round(finalDamage)} damage ${isCrit ? '⚡ CRIT!' : ''} [Threat: ${Math.round(bot.threat)}] [${bot.resourceType}: ${Math.round(bot.resource)}]`,
        newActorHp: bot.hp,
        newActorResource: bot.resource,
        newActorTargetId: bot.currentTargetId || undefined,
        newTargetHp: target.hp,
        newActorPosition: { ...bot.position },
        newTargetPosition: { ...target.position },
        targetDied: target.pendingDeath
      });

      // Add explicit death event
      if (target.pendingDeath) {
        this.actions.push({
          tick: this.currentTick,
        sequence: this.actionSequence++,
          actorId: target.id,
          actorName: target.name,
          targetId: target.id,
          targetName: target.name,
          actionType: 'death',
          value: 0,
          isCrit: false,
          description: `💀 ${target.name} has been defeated!`,
          newActorHp: 0,
          newTargetHp: 0,
          targetDied: true
        });
      }
    } else if (ability.healing && target) {
      // Healing scaling: ability.healing × sqrt(powerCore) × 0.15 (sublinear to compress rating advantage)
      // 450 healing × sqrt(20) × 0.15 × 1.25 = ~380, × sqrt(40) = ~537 (+41% for 2x stats)
      let baseHealing = ability.healing * Math.sqrt(bot.stats.powerCore) * 0.1;
      
      // Apply special ability healing modifiers
      if (ability.abilityType === AbilityType.NANO_SURGEON) {
        baseHealing *= 1.15;  // +15% healing effectiveness
      }
      if (ability.abilityType === AbilityType.SACRIFICIAL_PACT) {
        baseHealing *= 1.5;  // +50% stronger but costs HP
        bot.hp -= baseHealing * 0.3;  // Cost 30% of healing as HP
      }
      if (ability.abilityType === AbilityType.DOUBLE_OR_NOTHING) {
        // Random multiplier between 0.5x and 2x
        const multiplier = 0.5 + (this.random() * 1.5);  // 0.5 to 2.0
        baseHealing *= multiplier;
      }
      if (ability.abilityType === AbilityType.REGENERATION) {
        baseHealing *= 1.25;  // +25% HoT strength
      }
      if (ability.abilityType === AbilityType.SPOT_WELD) {
        // Restore 5% of highest stat to target
        const highestStat = Math.max(
          target.stats.speed,
          target.stats.powerCore,
          target.stats.acceleration,
          target.stats.stability
        );
        target.resource = Math.min(target.maxResource, target.resource + highestStat * 0.05);
      }
      
      const actualHealing = Math.min(baseHealing, target.maxHp - target.hp);
      target.hp += actualHealing;
      
      // Threat generation from healing (default 1.5x, can be overridden by threatMultiplier)
      const threatMultiplier = ability.threatMultiplier ?? 1.5;
      bot.threat += actualHealing * threatMultiplier;
      const threatGained = actualHealing * threatMultiplier;
      
      // Special: Pollination spreads heal to adjacent allies
      if (ability.abilityType === AbilityType.POLLINATION) {
        for (const ally of team) {
          if (ally.id !== target.id && !ally.isDead && !ally.pendingDeath) {
            const distance = this.getDistance(target.position, ally.position);
            if (distance <= 1) {  // Adjacent (1 tile away)
              const spreadHealing = actualHealing * 0.3;
              const spreadActual = Math.min(spreadHealing, ally.maxHp - ally.hp);
              ally.hp += spreadActual;
            }
          }
        }
      }
      
      this.actions.push({
        tick: this.currentTick,
        sequence: this.actionSequence++,
        actorId: bot.id,
        actorName: bot.name,
        targetId: target.id,
        targetName: target.name,
        actionType: 'heal',
        value: actualHealing,
        isCrit: false,
        description: `${bot.name} casts ${ability.name} on ${target.name} for ${Math.round(actualHealing)} healing ❤️ [Threat: ${Math.round(threatGained)}]`,
        newActorHp: bot.hp,
        newActorResource: bot.resource,
        newTargetHp: target.hp,
        newActorPosition: { ...bot.position },
        newTargetPosition: { ...target.position },
        targetDied: false
      });
    }
  }
  
  private executeAction(
    action: string, 
    bot: CombatBot, 
    team: CombatBot[], 
    enemyTeam: CombatBot[],
    maxRange?: number,
    minRange?: number
  ) {
    const actionType = action.toLowerCase();
    
    switch (actionType) {
      case 'taunt':
      case 'execute': {
        const targetResult = this.selectTarget(bot, team, enemyTeam);
        if (!targetResult) return;
        const target = targetResult.target;
        
        // Set persistent target
        bot.currentTargetId = target.id;
        
        // Check if in range - use maxRange from APL or default to melee (1)
        const effectiveMaxRange = maxRange !== undefined ? maxRange : 1;
        if (!this.isInActionRange(bot, target, effectiveMaxRange, minRange)) {
          bot.targetPosition = { ...target.position };
          bot.isMoving = true;
          return;
        }
        
        let damage = this.calculateDamage(bot, target) * 0.7;
        if (actionType === 'execute' && (target.hp / target.maxHp) < 0.2) {
          damage *= 2;
        }
        
        target.hp -= damage;
        bot.threat += damage * 3;
        
        if (target.hp <= 0) {
          target.hp = 0;
          target.pendingDeath = true;  // Mark for death, but keep visible this tick
          bot.currentTargetId = null; // Clear target on death
        }
        
        this.actions.push({
          tick: this.currentTick,
        sequence: this.actionSequence++,
          actorId: bot.id,
          actorName: bot.name,
          targetId: target.id,
          targetName: target.name,
          actionType: 'taunt',
          value: damage,
          isCrit: false,
          description: `${bot.name} ${actionType === 'execute' ? '💀 EXECUTES' : '🛡️ taunts'} ${target.name} for ${Math.round(damage)} damage`,
          newActorHp: bot.hp,
          newTargetHp: target.hp,
          newActorPosition: { ...bot.position },
          targetDied: target.pendingDeath
        });

        // Add explicit death event
        if (target.pendingDeath) {
          this.actions.push({
            tick: this.currentTick,
        sequence: this.actionSequence++,
            actorId: target.id,
            actorName: target.name,
            targetId: target.id,
            targetName: target.name,
            actionType: 'death',
            value: 0,
            isCrit: false,
            description: `💀 ${target.name} has been defeated!`,
            newActorHp: 0,
            newTargetHp: 0,
            targetDied: true
          });
        }
        break;
      }
        
      case 'attack': {
        const targetResult = this.selectTarget(bot, team, enemyTeam);
        if (!targetResult) return;
        const target = targetResult.target;
        
        // Set persistent target
        bot.currentTargetId = target.id;
        
        // Check if in range - use maxRange from APL or default based on attack type
        const effectiveMaxRange = maxRange !== undefined ? maxRange : (bot.attackType === 'ranged' ? 6 : 1);
        if (!this.isInActionRange(bot, target, effectiveMaxRange, minRange)) {
          // Move closer to target
          bot.targetPosition = { ...target.position };
          bot.isMoving = true;
          return;
        }
        
        const baseDamage = this.calculateDamage(bot, target);
        
        // Crit chance: base 5% + speed bonus, with diminishing penalty for level difference
        const baseCritChance = 0.05 + bot.stats.speed / 200; // 5-55% range
        const levelDiff = target.level - bot.level;
        
        // Use square root scaling for gentler suppression: 10 levels = -6.3%, 50 levels = -14.1%, 100 levels = -20%
        const critSupression = levelDiff > 0 ? Math.sqrt(levelDiff) * 0.02 : 0;
        const finalCritChance = Math.max(0.05, baseCritChance - critSupression); // Minimum 5%
        
        const isCrit = this.random() < finalCritChance;
        const finalDamage = baseDamage * (isCrit ? 1.5 : 1);
        
        target.hp -= finalDamage;
        bot.threat += finalDamage * 0.5;
        
        if (target.hp <= 0) {
          target.hp = 0;
          target.pendingDeath = true;  // Mark for death, but keep visible this tick
          bot.currentTargetId = null; // Clear target on death
        }
        
        this.actions.push({
          tick: this.currentTick,
        sequence: this.actionSequence++,
          actorId: bot.id,
          actorName: bot.name,
          targetId: target.id,
          targetName: target.name,
          actionType: 'attack',
          value: finalDamage,
          isCrit,
          description: `${bot.name} ${isCrit ? '⚡ CRITS' : 'attacks'} ${target.name} for ${Math.round(finalDamage)} damage`,
          newActorHp: bot.hp,
          newTargetHp: target.hp,
          newActorPosition: { ...bot.position },
          newTargetPosition: { ...target.position },
          targetDied: target.pendingDeath
        });

        // Add explicit death event
        if (target.pendingDeath) {
          this.actions.push({
            tick: this.currentTick,
        sequence: this.actionSequence++,
            actorId: target.id,
            actorName: target.name,
            targetId: target.id,
            targetName: target.name,
            actionType: 'death',
            value: 0,
            isCrit: false,
            description: `💀 ${target.name} has been defeated!`,
            newActorHp: 0,
            newTargetHp: 0,
            targetDied: true
          });
        }
        break;
      }
        
      case 'heal': {
        const healResult = this.selectHealTarget(team);
        if (!healResult) return;
        const target = healResult.target;
        
        // Check if in range - healers typically have long range
        const effectiveMaxRange = maxRange !== undefined ? maxRange : 8;
        if (!this.isInActionRange(bot, target, effectiveMaxRange, minRange)) {
          bot.targetPosition = { ...target.position };
          bot.isMoving = true;
          return;
        }
        
        const heal = this.calculateHeal(bot);
        const actualHeal = Math.min(heal, target.maxHp - target.hp);
        target.hp = Math.min(target.maxHp, target.hp + heal);
        
        this.actions.push({
          tick: this.currentTick,
          sequence: this.actionSequence++,
          actorId: bot.id,
          actorName: bot.name,
          targetId: target.id,
          targetName: target.name,
          actionType: 'heal',
          value: actualHeal,
          isCrit: false,
          description: `${bot.name} 💚 heals ${target.name} for ${Math.round(actualHeal)} HP`,
          newActorHp: bot.hp,
          newTargetHp: target.hp,
          newActorPosition: { ...bot.position },
          newTargetPosition: { ...target.position }
        });
        break;
      }
        
      case 'debuff': {
        const targetResult = this.selectTarget(bot, team, enemyTeam);
        if (!targetResult) return;
        const target = targetResult.target;
        
        // Set persistent target
        bot.currentTargetId = target.id;
        
        // Check if in range - debuffs are typically ranged
        const effectiveMaxRange = maxRange !== undefined ? maxRange : 6;
        if (!this.isInActionRange(bot, target, effectiveMaxRange, minRange)) {
          bot.targetPosition = { ...target.position };
          bot.isMoving = true;
          return;
        }
        
        const damage = this.calculateDamage(bot, target) * 0.8;
        target.hp -= damage;
        bot.threat += damage * 0.4;
        
        if (target.hp <= 0) {
          target.hp = 0;
          target.pendingDeath = true;  // Mark for death, but keep visible this tick
          bot.currentTargetId = null; // Clear target on death
        }
        
        this.actions.push({
          tick: this.currentTick,
        sequence: this.actionSequence++,
          actorId: bot.id,
          actorName: bot.name,
          targetId: target.id,
          targetName: target.name,
          actionType: 'buff',
          value: damage,
          isCrit: false,
          description: `${bot.name} 🎯 debuffs ${target.name} dealing ${Math.round(damage)} damage`,
          newActorHp: bot.hp,
          newTargetHp: target.hp,
          newActorPosition: { ...bot.position },
          targetDied: target.pendingDeath
        });
        break;
      }
    }
  }
  
  public simulate(maxTicks = 1000): CombatResult {
    this.actions = [];
    this.currentTick = 1; // Start at tick 1, tick 0 is initial state
    
    // Enrage mechanics to prevent infinite healing stalemates
    const SOFT_ENRAGE_START = 300;  // Start ramping at 30 seconds
    const HARD_ENRAGE = 600;         // Hard cap at 60 seconds
    
    // Store initial state
    const initialState = {
      party: this.party.map(b => ({ ...b, position: { ...b.position } })),
      enemy: this.enemy.map(b => ({ ...b, position: { ...b.position } }))
    };
    
    while (this.currentTick < maxTicks) {
      this.actionSequence = 0;  // Reset sequence counter each tick
      
      // Clean up bots that died last tick (allows animations to finish)
      [...this.party, ...this.enemy].forEach(bot => {
        if (bot.pendingDeath) {
          bot.isDead = true;
          bot.pendingDeath = false;
        }
      });
      
      // Victory check: Only count isDead bots (pendingDeath already converted above)
      const partyAlive = this.party.filter(b => !b.isDead);
      const enemyAlive = this.enemy.filter(b => !b.isDead);
      
      if (partyAlive.length === 0) {
        return {
          winningTeam: 'enemy',
          totalTicks: this.currentTick,
          actions: this.actions,
          finalState: { party: [...this.party], enemy: [...this.enemy] },
          initialState
        };
      }
      
      if (enemyAlive.length === 0) {
        return {
          winningTeam: 'party',
          totalTicks: this.currentTick,
          actions: this.actions,
          finalState: { party: [...this.party], enemy: [...this.enemy] },
          initialState
        };
      }
      
      // HARD ENRAGE: After 60 seconds, team with lower total HP loses
      if (this.currentTick >= HARD_ENRAGE) {
        const partyTotalHp = partyAlive.reduce((sum, b) => sum + b.hp, 0);
        const enemyTotalHp = enemyAlive.reduce((sum, b) => sum + b.hp, 0);
        
        const winner = partyTotalHp > enemyTotalHp ? 'party' : 'enemy';
        const losingTeam = winner === 'party' ? this.enemy : this.party;
        
        // Kill all bots on losing team
        losingTeam.forEach(b => {
          if (!b.isDead) {
            b.hp = 0;
            b.isDead = true;
          }
        });
        
        this.actions.push({
          tick: this.currentTick,
        sequence: this.actionSequence++,
          actorId: 'ENRAGE',
          actorName: '💀 HARD ENRAGE',
          targetId: 'ALL',
          targetName: losingTeam[0]?.name || 'Enemy',
          actionType: 'buff',
          value: 0,
          isCrit: false,
          description: `💀 HARD ENRAGE! ${winner === 'party' ? 'Heroes' : 'Enemies'} win with ${winner === 'party' ? partyTotalHp : enemyTotalHp} HP remaining!`,
          newActorHp: 0,
          newTargetHp: 0,
          newActorPosition: { x: 0, y: 0 },
          targetDied: true
        });
        
        return {
          winningTeam: winner,
          totalTicks: this.currentTick,
          actions: this.actions,
          finalState: { party: [...this.party], enemy: [...this.enemy] },
          initialState
        };
      }
      
      // Turn-based: Create turn order based on speed (highest speed acts first)
      const allBots = [...partyAlive, ...enemyAlive];
      const turnOrder = allBots.sort((a, b) => {
        // Sort by speed (highest first), then by acceleration as tiebreaker
        if (b.stats.speed !== a.stats.speed) {
          return b.stats.speed - a.stats.speed;
        }
        return b.stats.acceleration - a.stats.acceleration;
      });
      
      // Each bot acts once per round
      for (const bot of turnOrder) {
        // Skip dead or pending death bots
        if (bot.isDead || bot.pendingDeath) continue;
        
        // Mana regeneration: Only for mana users (Fixers), only after 3 ticks of not casting
        // Rage users (Strikers/Bulwarks/Tacticians) generate rage from attacks, not passive regen
        if (bot.resourceType === 'mana') {
          const ticksSinceLastCast = this.currentTick - bot.lastCastTick;
          if (ticksSinceLastCast >= 3) {
            const baseRegen = 0.005; // 0.5% base
            const powerCoreBonus = (bot.stats.powerCore / 100) * 0.01; // +0-1% based on power core
            const regenPercent = baseRegen + powerCoreBonus;
            const manaRegen = bot.maxResource * regenPercent;
            bot.resource = Math.min(bot.maxResource, bot.resource + manaRegen);
          }
        }
        
        // Determine which team this bot belongs to
        const isPartyBot = this.party.some(p => p.id === bot.id);
        const team = isPartyBot ? this.party : this.enemy;
        const enemyTeam = isPartyBot ? this.enemy : this.party;
        
        // Perform action
        this.performAction(bot, team, enemyTeam);
      }
      
      this.currentTick++;
    }
    
    return {
      winningTeam: 'draw',
      totalTicks: this.currentTick,
      actions: this.actions,
      finalState: { party: [...this.party], enemy: [...this.enemy] },
      initialState
    };
  }
  
  public static getFactionAbility(faction: Faction, botClass: Class): string {
    return FACTION_ABILITIES[faction][botClass];
  }
}

/**
 * Apply class-specific stat modifiers to differentiate roles
 * Bulwark: High stability (tank), reduced damage output
 * Striker: High power core (damage), reduced stability (glass cannon)
 * Fixer: Balanced stats with focus on acceleration (healing speed)
 * Tactician: High speed (support), balanced other stats
 */
export function applyClassStatModifiers(stats: BotStats, botClass: Class): BotStats {
  const modified = { ...stats };
  
  switch (botClass) {
    case 'Bulwark':
      // Tanks: +25% stability, -40% powerCore (very tanky but much lower damage)
      modified.stability = Math.round(stats.stability * 1.25);
      modified.powerCore = Math.round(stats.powerCore * 0.6);
      break;
    case 'Striker':
      // DPS: +40% powerCore, -25% stability (strong glass cannon)
      modified.powerCore = Math.round(stats.powerCore * 1.4);
      modified.stability = Math.round(stats.stability * 0.75);
      break;
    case 'Fixer':
      // Healer: +30% acceleration, +10% powerCore (better healing and damage)
      modified.acceleration = Math.round(stats.acceleration * 1.3);
      modified.powerCore = Math.round(stats.powerCore * 1.1);
      break;
    case 'Tactician':
      // Support: +30% speed, +20% acceleration (very mobile support)
      modified.speed = Math.round(stats.speed * 1.3);
      modified.acceleration = Math.round(stats.acceleration * 1.2);
      break;
  }
  
  return modified;
}

/**
 * Generate strategic APL rules for a bot class.
 * These are example APLs that provide good default behavior.
 * Players can customize these for their own strategies.
 */
export function generateDefaultAPL(botClass: Class, faction: Faction): APLRule[] {
  // Get the bot's actual ability IDs
  const abilities = getAbilitiesForBot(faction, botClass);
  const basicAttackId = abilities[0].id;
  const mainAbilityId = abilities[1].id;
  
  switch (botClass) {
    case 'Bulwark':
      // Tank strategy: Use Taunt for emergency aggro recovery, Sunder when DPS getting close, basic attack as filler
      return [
        { condition: 'enemy_targeting_ally AND ready', abilityId: 'taunt' },
        { condition: 'ally_threat > tank_threat * 0.7 AND ready', abilityId: 'sunder_armor' },
        { condition: 'always', abilityId: basicAttackId }
      ];
    case 'Striker':
      // DPS strategy: Self-heal when critical, wait for tank to establish threat, dump threat when approaching tank levels, execute low targets, spam main ability
      // Use Feint when threat > 40% of tank (before it becomes dangerous)
      // Don't start main DPS rotation until tank has meaningful threat (20+)
      return [
        { condition: 'self.hp < 35% AND ready', abilityId: 'second_wind' },
        { condition: 'threat > tank_threat * 0.4 AND ready', abilityId: 'feint' },
        { condition: 'enemy.hp < 30% AND tank_threat > 20 AND ready', abilityId: mainAbilityId },
        { condition: 'tank_threat > 20 AND ready', abilityId: mainAbilityId },
        { condition: 'always', abilityId: basicAttackId }
      ];
    case 'Fixer':
      // Healer strategy: Heal aggressively to keep party alive
      // Use basic attacks between heals to allow passive mana regen
      return [
        { condition: 'threat > tank_threat * 0.8 AND tank_threat > 100 AND ready', abilityId: 'fade' },
        { condition: 'ally.hp < 30% AND ready', abilityId: mainAbilityId },
        { condition: 'ally.hp < 70% AND ready', abilityId: mainAbilityId },
        { condition: 'always', abilityId: basicAttackId }
      ];
    case 'Tactician':
      // Support strategy: Self-heal when critical, use Battle Command when >= 60 rage AND off cooldown, otherwise attack
      return [
        { condition: 'self.hp < 35% AND ready', abilityId: 'second_wind' },
        { condition: 'rage >= 60 AND off_cooldown', abilityId: mainAbilityId },
        { condition: 'always', abilityId: basicAttackId }
      ];
  }
}

export function createBot(
  id: string,
  name: string,
  faction: Faction,
  botClass: Class,
  stats: BotStats,
  tokenId?: number,
  apl?: APLRule[],
  attackType?: AttackType,
  level?: number
): CombatBot {
  const abilities = getAbilitiesForBot(faction, botClass);
  
  // Apply class-specific stat modifiers for role differentiation
  const modifiedStats = applyClassStatModifiers(stats, botClass);
  
  // Calculate level as average of 4 stats (rating) using modified stats
  const calculatedLevel = level || Math.round((modifiedStats.speed + modifiedStats.powerCore + modifiedStats.acceleration + modifiedStats.stability) / 4);
  
  return {
    id,
    name,
    tokenId,
    faction,
    class: botClass,
    stats: modifiedStats,  // Use modified stats
    level: calculatedLevel,
    attackType: attackType || ((botClass === 'Bulwark' || botClass === 'Striker') ? 'melee' : 'ranged'),
    apl: apl || [],
    abilities,
    abilityCooldowns: new Map(),
    basicAttack: abilities[0], // backwards compat
    mainAbility: abilities[1], // backwards compat
    hp: 0,
    maxHp: 0,
    resource: 0,
    maxResource: 100,
    resourceType: (botClass === 'Fixer' || botClass === 'Tactician' ? 'mana' : 'rage'), // Healers/Support use mana, Tanks/DPS use rage
    energy: 100,
    maxEnergy: 100,
    threat: 0,
    lastBasicAttack: 0,
    lastMainAbility: 0,
    lastCastTick: -999,
    position: { x: 0, y: 0 },  // Will be set during initialization
    targetPosition: null,
    currentTargetId: null,
    isMoving: false,
    isDead: false,
    pendingDeath: false,
    buffs: [],
    debuffs: []
  };
}