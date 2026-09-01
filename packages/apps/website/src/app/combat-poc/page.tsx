'use client';

import { useState, useEffect, useMemo } from 'react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CombatBot, 
  Class, 
  Faction, 
  BotStats, 
  createBot, 
  CombatSimulator, 
  CombatResult,
  CombatAction,
  APLRule,
  generateDefaultAPL,
  getAbilitiesForBot
} from '@/lib/combat-engine';
import { APLEditor } from '@/components/APLEditor';
import { BattlefieldGrid } from '@/components/BattlefieldGrid';
import { Swords, Heart, Shield, Zap, Play, RotateCcw, Trash2, SkipForward, SkipBack, Pause, FastForward, Copy } from 'lucide-react';
import { useRandomBots, getBotThumbnailUrl } from '@/hooks/useRandomBots';

const FACTIONS: Faction[] = [
  'Ultimate-master', 'Wild', 'Golden', 'Ultimate', 'Blackhole', 'Dead', 'Master',
  'Bee', 'Food', 'Box', 'Murder', 'Game', 'Animal', 'Industrial'
];

const CLASSES: Class[] = ['Bulwark', 'Striker', 'Fixer', 'Tactician'];

const CLASS_ICONS = {
  Bulwark: Shield,
  Striker: Swords,
  Fixer: Heart,
  Tactician: Zap
};

const CLASS_COLORS = {
  Bulwark: 'text-blue-500',
  Striker: 'text-red-500',
  Fixer: 'text-green-500',
  Tactician: 'text-purple-500'
};

export default function CombatPOC() {
  const [party, setParty] = useState<CombatBot[]>([]);
  const [enemy, setEnemy] = useState<CombatBot[]>([]);
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [seed, setSeed] = useState<number>(Date.now());
  
  // Load random bots for quick setup
  const { bots: randomBots, loading: loadingBots, refresh: refreshBots } = useRandomBots(6);
  
  // Playback controls
  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms per tick

  // Form state for adding bots
  const [newBot, setNewBot] = useState({
    name: '',
    faction: 'Master' as Faction,
    class: 'Striker' as Class,
    stability: 20,
    powerCore: 20,
    acceleration: 20,
    speed: 20
  });

  const addBotToTeam = (team: 'party' | 'enemy') => {
    if (!newBot.name.trim()) {
      alert('Please enter a bot name');
      return;
    }

    const bot = createBot(
      `${team}-${Date.now()}`,
      newBot.name,
      newBot.faction,
      newBot.class,
      {
        stability: newBot.stability,
        powerCore: newBot.powerCore,
        acceleration: newBot.acceleration,
        speed: newBot.speed
      },
      undefined,  // No tokenId for manual bots
      generateDefaultAPL(newBot.class, newBot.faction) // Generate default APL for this class
    );

    if (team === 'party') {
      setParty([...party, bot]);
    } else {
      setEnemy([...enemy, bot]);
    }

    // Reset form
    setNewBot({
      ...newBot,
      name: ''
    });
  };

  const removeBot = (team: 'party' | 'enemy', id: string) => {
    if (team === 'party') {
      setParty(party.filter(b => b.id !== id));
    } else {
      setEnemy(enemy.filter(b => b.id !== id));
    }
  };

  const updateBotAPL = (team: 'party' | 'enemy', id: string, newAPL: APLRule[]) => {
    if (team === 'party') {
      setParty(party.map(b => b.id === id ? { ...b, apl: newAPL } : b));
    } else {
      setEnemy(enemy.map(b => b.id === id ? { ...b, apl: newAPL } : b));
    }
  };

  const runSimulation = () => {
    if (party.length === 0 || enemy.length === 0) {
      alert('Both teams need at least one bot!');
      return;
    }

    setIsSimulating(true);
    
    // Small delay for UI feedback
    setTimeout(() => {
      const simulator = new CombatSimulator(party, enemy, seed);
      const result = simulator.simulate();
      setCombatResult(result);
      setCurrentTick(0); // Start at tick 0 to show first actions
      setIsSimulating(false);
      setIsPlaying(false);
    }, 100);
  };

  const resetSimulation = () => {
    setCombatResult(null);
    setCurrentTick(0); // Start at tick 0 to show first actions
    setIsPlaying(false);
  };

  const clearAll = () => {
    setParty([]);
    setEnemy([]);
    setCombatResult(null);
    setCurrentTick(0);
    setIsPlaying(false);
  };

  const generateRandom3v3 = () => {
    // Get fresh random bots
    refreshBots();
    
    if (!randomBots || randomBots.length < 6) {
      alert('Still loading bot data...');
      return;
    }
    
    // Shuffle and pick 6 random bots
    const shuffled = [...randomBots].sort(() => Math.random() - 0.5);
    const partyBots = shuffled.slice(0, 3);
    const enemyBots = shuffled.slice(3, 6);
    
    const newParty = partyBots.map((bot, i) => {
      return createBot(
        `party-${i + 1}`,
        `#${bot.tokenId}`,
        bot.faction,
        bot.class,
        {
          stability: bot.modifiedStats.stability,
          powerCore: bot.modifiedStats.powerCore,
          acceleration: bot.modifiedStats.acceleration,
          speed: bot.modifiedStats.speed
        },
        bot.tokenId,
        generateDefaultAPL(bot.class, bot.faction)
      );
    });

    const newEnemy = enemyBots.map((bot, i) => {
      return createBot(
        `enemy-${i + 1}`,
        `#${bot.tokenId}`,
        bot.faction,
        bot.class,
        {
          stability: bot.modifiedStats.stability,
          powerCore: bot.modifiedStats.powerCore,
          acceleration: bot.modifiedStats.acceleration,
          speed: bot.modifiedStats.speed
        },
        bot.tokenId,
        generateDefaultAPL(bot.class, bot.faction)
      );
    });

    setParty(newParty);
    setEnemy(newEnemy);
    setCombatResult(null);
    setCurrentTick(0);
    setIsPlaying(false);
  };
  
  const generateRandom2v2 = () => {
    // Get fresh random bots
    refreshBots();
    
    if (!randomBots || randomBots.length < 4) {
      alert('Still loading bot data...');
      return;
    }
    
    // Shuffle and pick 4 random bots
    const shuffled = [...randomBots].sort(() => Math.random() - 0.5);
    const partyBots = shuffled.slice(0, 2);
    const enemyBots = shuffled.slice(2, 4);
    
    const newParty = partyBots.map((bot, i) => {
      return createBot(
        `party-${i + 1}`,
        `#${bot.tokenId}`,
        bot.faction,
        bot.class,
        { 
          stability: bot.modifiedStats.stability, 
          powerCore: bot.modifiedStats.powerCore, 
          acceleration: bot.modifiedStats.acceleration, 
          speed: bot.modifiedStats.speed 
        },
        bot.tokenId,
        generateDefaultAPL(bot.class, bot.faction)
      );
    });

    const newEnemy = enemyBots.map((bot, i) => {
      return createBot(
        `enemy-${i + 1}`,
        `#${bot.tokenId}`,
        bot.faction,
        bot.class,
        { 
          stability: bot.modifiedStats.stability, 
          powerCore: bot.modifiedStats.powerCore, 
          acceleration: bot.modifiedStats.acceleration, 
          speed: bot.modifiedStats.speed 
        },
        bot.tokenId,
        generateDefaultAPL(bot.class, bot.faction)
      );
    });

    setParty(newParty);
    setEnemy(newEnemy);
    setCombatResult(null);
    setCurrentTick(0);
    setIsPlaying(false);
  };
  
  const generateRandom5v5 = () => {
    // Get fresh random bots
    refreshBots();
    
    if (!randomBots || randomBots.length < 10) {
      alert('Still loading bot data...');
      return;
    }
    
    // Shuffle and pick 10 random bots
    const shuffled = [...randomBots].sort(() => Math.random() - 0.5);
    const partyBots = shuffled.slice(0, 5);
    const enemyBots = shuffled.slice(5, 10);
    
    const newParty = partyBots.map((bot, i) => {
      return createBot(
        `party-${i + 1}`,
        `#${bot.tokenId}`,
        bot.faction,
        bot.class,
        { 
          stability: bot.modifiedStats.stability, 
          powerCore: bot.modifiedStats.powerCore, 
          acceleration: bot.modifiedStats.acceleration, 
          speed: bot.modifiedStats.speed 
        },
        bot.tokenId,
        generateDefaultAPL(bot.class, bot.faction)
      );
    });

    const newEnemy = enemyBots.map((bot, i) => {
      return createBot(
        `enemy-${i + 1}`,
        `#${bot.tokenId}`,
        bot.faction,
        bot.class,
        { 
          stability: bot.modifiedStats.stability, 
          powerCore: bot.modifiedStats.powerCore, 
          acceleration: bot.modifiedStats.acceleration, 
          speed: bot.modifiedStats.speed 
        },
        bot.tokenId,
        generateDefaultAPL(bot.class, bot.faction)
      );
    });

    setParty(newParty);
    setEnemy(newEnemy);
    setCombatResult(null);
    setCurrentTick(0);
    setIsPlaying(false);
  };
  


  // Template: 10-man raid comp (Tank, 2 Healers, 2 Support, 5 DPS)
  const loadStandard5ManComp = () => {
    // Realistic stat distributions - role-critical stats are prioritized
    const tankStats = { stability: 60, powerCore: 25, acceleration: 25, speed: 15 }; // High armor, low damage
    const healerStats = { stability: 20, powerCore: 50, acceleration: 30, speed: 20 }; // Low armor, high healing power, low damage output
    const dpsStats = { stability: 25, powerCore: 50, acceleration: 30, speed: 25 }; // Balanced for damage output
    const supportStats = { stability: 30, powerCore: 45, acceleration: 40, speed: 15 }; // High acceleration for magic/buffs
    
    // Random token IDs for visualization (0-9999)
    const randomTokenIds = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10000));
    
    const tank = createBot('tank-1', 'Tank', 'Industrial', 'Bulwark', tankStats, randomTokenIds[0], generateDefaultAPL('Bulwark', 'Industrial'));
    const healer1 = createBot('healer-1', 'Healer 1', 'Bee', 'Fixer', healerStats, randomTokenIds[1], generateDefaultAPL('Fixer', 'Bee'));
    const healer2 = createBot('healer-2', 'Healer 2', 'Bee', 'Fixer', healerStats, randomTokenIds[2], generateDefaultAPL('Fixer', 'Bee'));
    const support1 = createBot('support-1', 'Support 1', 'Golden', 'Tactician', supportStats, randomTokenIds[3], generateDefaultAPL('Tactician', 'Golden'));
    const support2 = createBot('support-2', 'Support 2', 'Golden', 'Tactician', supportStats, randomTokenIds[4], generateDefaultAPL('Tactician', 'Golden'));
    const dps1 = createBot('dps-1', 'DPS 1', 'Murder', 'Striker', dpsStats, randomTokenIds[5], generateDefaultAPL('Striker', 'Murder'));
    const dps2 = createBot('dps-2', 'DPS 2', 'Murder', 'Striker', dpsStats, randomTokenIds[6], generateDefaultAPL('Striker', 'Murder'));
    const dps3 = createBot('dps-3', 'DPS 3', 'Murder', 'Striker', dpsStats, randomTokenIds[7], generateDefaultAPL('Striker', 'Murder'));
    const dps4 = createBot('dps-4', 'DPS 4', 'Murder', 'Striker', dpsStats, randomTokenIds[8], generateDefaultAPL('Striker', 'Murder'));
    const dps5 = createBot('dps-5', 'DPS 5', 'Murder', 'Striker', dpsStats, randomTokenIds[9], generateDefaultAPL('Striker', 'Murder'));
    
    setParty([tank, healer1, healer2, support1, support2, dps1, dps2, dps3, dps4, dps5]);
    setCombatResult(null);
    setCurrentTick(0);
    setIsPlaying(false);
  };

  // Template: Patchwerk encounter (single target tank and spank)
  const loadPatchwerk = () => {
    // Raid boss stats: Massive HP pool, high power core for threatening damage, higher speed for crits
    const bossStats = { stability: 600, powerCore: 50, acceleration: 20, speed: 25 };
    
    // Get the basic attack ID for Dead Bulwark
    const abilities = getAbilitiesForBot('Dead', 'Bulwark');
    const basicAttackId = abilities[0].id;
    
    const patchwerk = createBot(
      'patchwerk',
      'Patchwerk',
      'Dead',
      'Bulwark',
      bossStats,
      Math.floor(Math.random() * 10000), // Random token ID for boss image
      [
        { condition: 'always', abilityId: basicAttackId } // Simple melee attacks only
      ]
    );
    
    setEnemy([patchwerk]);
    setCombatResult(null);
    setCurrentTick(0);
    setIsPlaying(false);
  };

  // Template: Multi-target cleave fight
  const loadMultiTarget = () => {
    // Balanced for level 19 party
    const addStats = { stability: 50, powerCore: 50, acceleration: 50, speed: 50 };
    
    const adds = Array.from({ length: 5 }, (_, i) => 
      createBot(
        `add-${i + 1}`,
        `Add ${i + 1}`,
        'Wild',
        'Striker',
        addStats,
        undefined,
        generateDefaultAPL('Striker', 'Wild')
      )
    );
    
    setEnemy(adds);
    setCombatResult(null);
    setCurrentTick(0);
    setIsPlaying(false);
  };

  // Template: Healer check (low DPS, constant damage)
  const loadHealerCheck = () => {
    // High power core, balanced for level 19 party
    const constantDamage = { stability: 40, powerCore: 100, acceleration: 40, speed: 40 };
    
    const boss = createBot(
      'healer-check-boss',
      'Healer Check',
      'Game',
      'Striker',
      constantDamage,
      undefined,
      [
        { condition: 'always', abilityId: getAbilitiesForBot('Game', 'Striker')[0].id } // Constant pressure
      ]
    );
    
    setEnemy([boss]);
    setCombatResult(null);
    setCurrentTick(0);
    setIsPlaying(false);
  };

  // Template: Load both comp + encounter
  const loadFullScenario = (encounterFn: () => void) => {
    loadStandard5ManComp();
    // Small delay to ensure party is set before setting enemy
    setTimeout(encounterFn, 50);
  };

  // Playback controls
  const nextTick = () => {
    if (!combatResult) return;
    setCurrentTick(prev => Math.min(prev + 1, combatResult.totalTicks));
  };

  const prevTick = () => {
    setCurrentTick(prev => Math.max(prev - 1, 0));
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  // Auto-advance playback
  useEffect(() => {
    if (!isPlaying || !combatResult) return;
    
    const interval = setInterval(() => {
      setCurrentTick(prev => {
        if (prev >= combatResult.totalTicks) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, combatResult, playbackSpeed]);

  // Get actions up to current tick
  const visibleActions = useMemo(() => {
    return combatResult?.actions
      .filter(a => a.tick <= currentTick)
      .sort((a, b) => {
        // Sort by tick first, then by sequence within the tick
        if (a.tick !== b.tick) return a.tick - b.tick;
        return a.sequence - b.sequence;
      }) || [];
  }, [combatResult, currentTick]);

  // Reconstruct battlefield state at current tick
  const getCurrentBattlefieldState = () => {
    if (!combatResult) return { party: [], enemy: [] };
    
    // Start with initialState from combat result
    const initialParty = combatResult.initialState.party.map(bot => ({
      ...bot,
      position: { ...bot.position }
    }));
    
    const initialEnemy = combatResult.initialState.enemy.map(bot => ({
      ...bot,
      position: { ...bot.position }
    }));
    
    // If at tick 0, return initial state (no actions yet)
    if (currentTick <= 0) {
      return { party: initialParty, enemy: initialEnemy };
    }
    
    // Replay actions up to currentTick
    const partyMap = new Map(initialParty.map(b => [b.id, { ...b, position: { ...b.position }, pendingDeath: false }]));
    const enemyMap = new Map(initialEnemy.map(b => [b.id, { ...b, position: { ...b.position }, pendingDeath: false }]));
    
    let lastProcessedTick = -1;
    
    visibleActions.forEach(action => {
      // At tick boundaries, convert pendingDeath to isDead
      if (action.tick > lastProcessedTick && lastProcessedTick >= 0) {
        [...partyMap.values(), ...enemyMap.values()].forEach(bot => {
          if (bot.pendingDeath) {
            bot.isDead = true;
            bot.pendingDeath = false;
          }
        });
      }
      lastProcessedTick = action.tick;
      
      // Update actor state
      const actor = partyMap.get(action.actorId) || enemyMap.get(action.actorId);
      if (actor && action.newActorHp !== undefined) {
        actor.hp = action.newActorHp;
      }
      if (actor && action.newActorResource !== undefined) {
        actor.resource = action.newActorResource;
      }
      if (actor && action.newActorTargetId !== undefined) {
        actor.currentTargetId = action.newActorTargetId;
      }
      if (actor && action.newActorPosition) {
        actor.position = action.newActorPosition;
      }
      if (actor && action.actorDied) {
        actor.pendingDeath = true;  // Mark for death, stays visible this tick
      }
      
      // Update target state
      const target = partyMap.get(action.targetId) || enemyMap.get(action.targetId);
      if (target && action.newTargetHp !== undefined) {
        target.hp = action.newTargetHp;
      }
      if (target && action.targetDied) {
        target.pendingDeath = true;  // Mark for death, stays visible this tick
      }
    });
    
    // After processing all actions, if we're viewing a tick past the last action, convert pendingDeath to isDead
    if (currentTick > lastProcessedTick) {
      [...partyMap.values(), ...enemyMap.values()].forEach(bot => {
        if (bot.pendingDeath) {
          bot.isDead = true;
          bot.pendingDeath = false;
        }
      });
    }
    
    return {
      party: Array.from(partyMap.values()),
      enemy: Array.from(enemyMap.values())
    };
  };

  const currentBattlefieldState = useMemo(() => getCurrentBattlefieldState(), [currentTick, combatResult]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">⚔️ PokedBots Brawl - Combat POC</h1>
          <p className="text-muted-foreground">Build your parties and simulate combat</p>
        </div>

        {/* Template Scenarios */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Quick Start</CardTitle>
            <CardDescription>Load random battles with real bot data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={generateRandom2v2}
                disabled={loadingBots}
                variant="outline"
              >
                🎲 Random 2v2
              </Button>
              <Button 
                onClick={generateRandom3v3}
                disabled={loadingBots}
                variant="outline"
              >
                🎲 Random 3v3
              </Button>
              <Button 
                onClick={generateRandom5v5}
                disabled={loadingBots}
                variant="outline"
              >
                🎲 Random 5v5
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Templates remain below... */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Quick Templates</CardTitle>
            <CardDescription>Configure a bot and add it to either party</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Bot Name</Label>
                <Input
                  id="name"
                  placeholder="Enter bot name..."
                  value={newBot.name}
                  onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faction">Faction</Label>
                <Select value={newBot.faction} onValueChange={(v) => setNewBot({ ...newBot, faction: v as Faction })}>
                  <SelectTrigger id="faction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FACTIONS.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select value={newBot.class} onValueChange={(v) => setNewBot({ ...newBot, class: v as Class })}>
                  <SelectTrigger id="class">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stability">Stability: {newBot.stability}</Label>
                <Input
                  id="stability"
                  type="range"
                  min="1"
                  max="100"
                  value={newBot.stability}
                  onChange={(e) => setNewBot({ ...newBot, stability: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="powerCore">Power Core: {newBot.powerCore}</Label>
                <Input
                  id="powerCore"
                  type="range"
                  min="1"
                  max="100"
                  value={newBot.powerCore}
                  onChange={(e) => setNewBot({ ...newBot, powerCore: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="acceleration">Acceleration: {newBot.acceleration}</Label>
                <Input
                  id="acceleration"
                  type="range"
                  min="1"
                  max="100"
                  value={newBot.acceleration}
                  onChange={(e) => setNewBot({ ...newBot, acceleration: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="speed">Speed: {newBot.speed}</Label>
                <Input
                  id="speed"
                  type="range"
                  min="1"
                  max="100"
                  value={newBot.speed}
                  onChange={(e) => setNewBot({ ...newBot, speed: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button onClick={() => addBotToTeam('party')} className="flex-1">
                Add to Your Party
              </Button>
              <Button onClick={() => addBotToTeam('enemy')} variant="destructive" className="flex-1">
                Add to Enemy Party
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Teams Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Your Party */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Your Party ({party.length})</span>
                  {party.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      Avg Rating: {(party.reduce((sum, bot) => sum + (bot.stats.stability + bot.stats.powerCore + bot.stats.acceleration + bot.stats.speed) / 4, 0) / party.length).toFixed(1)}
                    </span>
                  )}
                </div>
                {party.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setParty([])}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {party.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No bots added yet</p>
              ) : (
                <div className="space-y-3">
                  {party.map(bot => (
                    <BotCard 
                      key={bot.id} 
                      bot={bot} 
                      onRemove={() => removeBot('party', bot.id)}
                      onAPLChange={(apl) => updateBotAPL('party', bot.id, apl)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enemy Party */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Enemy Party ({enemy.length})</span>
                  {enemy.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      Avg Rating: {(enemy.reduce((sum, bot) => sum + (bot.stats.stability + bot.stats.powerCore + bot.stats.acceleration + bot.stats.speed) / 4, 0) / enemy.length).toFixed(1)}
                    </span>
                  )}
                </div>
                {enemy.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setEnemy([])}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {enemy.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No bots added yet</p>
              ) : (
                <div className="space-y-3">
                  {enemy.map(bot => (
                    <BotCard 
                      key={bot.id} 
                      bot={bot} 
                      onRemove={() => removeBot('enemy', bot.id)}
                      onAPLChange={(apl) => updateBotAPL('enemy', bot.id, apl)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Combat Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label htmlFor="seed" className="whitespace-nowrap">Combat Seed:</Label>
                <Input
                  id="seed"
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value) || Date.now())}
                  className="flex-1"
                  placeholder="Random seed for deterministic combat"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setSeed(Date.now())}
                >
                  Randomize
                </Button>
              </div>
              
              <div className="flex gap-4 justify-center">
                <Button 
                  size="lg" 
                  onClick={runSimulation} 
                  disabled={party.length === 0 || enemy.length === 0 || isSimulating}
                  className="gap-2"
                >
                  <Play className="h-5 w-5" />
                  {isSimulating ? 'Simulating...' : 'Run Combat Simulation'}
                </Button>
                
                {combatResult && (
                  <Button size="lg" variant="outline" onClick={resetSimulation} className="gap-2">
                    <RotateCcw className="h-5 w-5" />
                    Reset
                  </Button>
                )}
                
                {(party.length > 0 || enemy.length > 0) && (
                  <Button size="lg" variant="ghost" onClick={clearAll} className="gap-2">
                    <Trash2 className="h-5 w-5" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Combat Results */}
        {combatResult && (
          <>
            {/* Battlefield and Combat Log side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Battlefield + Controls (2/3 width) */}
              <div className="lg:col-span-2 space-y-4">
                <BattlefieldGrid 
                  party={currentBattlefieldState.party}
                  enemy={currentBattlefieldState.enemy}
                  recentActions={visibleActions.filter(a => a.tick === currentTick)} // Only show current tick's actions
                />
                
                {/* Playback Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>⏯️ Combat Playback</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        Tick {currentTick} / {combatResult.totalTicks}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress bar */}
                    <div className="w-full">
                      <input
                        type="range"
                        min="-1"
                        max={combatResult.totalTicks}
                        value={currentTick}
                        onChange={(e) => setCurrentTick(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    {/* Playback buttons */}
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentTick(0)}
                        disabled={currentTick === -1}
                      >
                        <SkipBack className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentTick(Math.max(0, currentTick - 1))}
                        disabled={currentTick === -1}
                      >
                        -1 Tick
                      </Button>

                      <Button
                        onClick={togglePlayback}
                        disabled={currentTick >= combatResult.totalTicks}
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentTick(Math.min(combatResult.totalTicks, currentTick + 1))}
                        disabled={currentTick >= combatResult.totalTicks}
                      >
                        +1 Tick
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentTick(combatResult.totalTicks)}
                        disabled={currentTick >= combatResult.totalTicks}
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Speed control */}
                    <div className="flex items-center gap-2">
                      <Label>Speed:</Label>
                      <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(Number(v))}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.5">0.5x</SelectItem>
                          <SelectItem value="1">1x</SelectItem>
                          <SelectItem value="2">2x</SelectItem>
                          <SelectItem value="4">4x</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Combat Log & Damage Meter (1/3 width) */}
              <div className="lg:col-span-1">
                <CombatResultsWithMeter 
                  result={combatResult} 
                  visibleActions={visibleActions} 
                  currentTick={currentTick} 
                  totalTicks={combatResult.totalTicks}
                  actions={combatResult.actions}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BotCard({ bot, onRemove, onAPLChange }: { 
  bot: CombatBot; 
  onRemove: () => void;
  onAPLChange: (apl: APLRule[]) => void;
}) {
  const Icon = CLASS_ICONS[bot.class];
  const colorClass = CLASS_COLORS[bot.class];
  const ability = CombatSimulator.getFactionAbility(bot.faction, bot.class);

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card hover:bg-accent/5 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Bot Avatar */}
          {bot.tokenId ? (
            <div className="relative">
              <img 
                src={getBotThumbnailUrl(bot.tokenId)}
                alt={bot.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="absolute -bottom-1 -right-1 bg-background/95 rounded-full p-1">
                <Icon className={`h-4 w-4 ${colorClass}`} />
              </div>
            </div>
          ) : (
            <Icon className={`h-6 w-6 ${colorClass}`} />
          )}
          <div>
            <h3 className="font-semibold">{bot.name}</h3>
            <p className="text-sm text-muted-foreground">{bot.faction} {bot.class}</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-4 gap-2 text-sm">
        <div>
          <div className="text-muted-foreground">STB</div>
          <div className="font-mono">{bot.stats.stability}</div>
        </div>
        <div>
          <div className="text-muted-foreground">PWR</div>
          <div className="font-mono">{bot.stats.powerCore}</div>
        </div>
        <div>
          <div className="text-muted-foreground">ACC</div>
          <div className="font-mono">{bot.stats.acceleration}</div>
        </div>
        <div>
          <div className="text-muted-foreground">SPD</div>
          <div className="font-mono">{bot.stats.speed}</div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground border-t pt-2">
        <strong>Passive:</strong> {ability}
      </div>

      <APLEditor
        botName={bot.name}
        botFaction={bot.faction}
        botClass={bot.class}
        apl={bot.apl}
        onAPLChange={onAPLChange}
      />
    </div>
  );
}

function CombatResultsWithMeter({ 
  result, 
  visibleActions, 
  currentTick, 
  totalTicks,
  actions 
}: { 
  result: CombatResult; 
  visibleActions: CombatAction[]; 
  currentTick: number; 
  totalTicks: number;
  actions: CombatAction[];
}) {
  const isAtEnd = currentTick >= totalTicks;
  
  const winnerText = result.winningTeam === 'party' 
    ? '🎉 Your Party Wins!' 
    : result.winningTeam === 'enemy' 
    ? '💀 Enemy Party Wins!' 
    : '⚔️ Draw!';

  const winnerColor = result.winningTeam === 'party' 
    ? 'text-green-500' 
    : result.winningTeam === 'enemy' 
    ? 'text-red-500' 
    : 'text-yellow-500';

  return (
    <Card className="h-full">
      {isAtEnd && (
        <CardHeader>
          <CardTitle className={`text-2xl ${winnerColor}`}>{winnerText}</CardTitle>
          <CardDescription>Combat lasted {result.totalTicks} ticks</CardDescription>
        </CardHeader>
      )}
      <CardContent className={isAtEnd ? '' : 'pt-6'}>
        <Tabs defaultValue="log" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="log">Combat Log</TabsTrigger>
            <TabsTrigger value="meter">Damage Meter</TabsTrigger>
          </TabsList>
          
          <TabsContent value="log" className="mt-0">
            <CombatLogContent visibleActions={visibleActions} />
          </TabsContent>
          
          <TabsContent value="meter" className="mt-0">
            <DamageMeterContent actions={actions} currentTick={currentTick} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CombatLogContent({ visibleActions }: { visibleActions: CombatAction[] }) {
  const logRef = React.useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  
  // Auto-scroll to bottom only if user is near the bottom (not manually scrolling up)
  React.useEffect(() => {
    if (logRef.current && !isUserScrolling) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleActions.length, isUserScrolling]);

  // Detect when user manually scrolls
  const handleScroll = () => {
    if (logRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsUserScrolling(!isNearBottom);
    }
  };

  const copyLog = () => {
    const logText = visibleActions
      .map(action => `[T${action.tick.toString().padStart(3, '0')}]${action.description}`)
      .join('\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Combat Log</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={copyLog}
          className="h-8"
        >
          {copied ? (
            <>
              <span className="text-green-500 mr-1">✓</span>
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div ref={logRef} onScroll={handleScroll} className="h-[600px] overflow-y-auto space-y-1 border rounded-lg p-2">
        {visibleActions.map((action, idx) => (
          <ActionLog key={idx} action={action} />
        ))}
        {visibleActions.length === 0 && (
          <p className="text-muted-foreground text-center py-4">No actions yet</p>
        )}
      </div>
    </>
  );
}

function CombatResults({ result, visibleActions, currentTick, totalTicks }: { 
  result: CombatResult; 
  visibleActions: CombatAction[];
  currentTick: number;
  totalTicks: number;
}) {
  const isAtEnd = currentTick >= totalTicks;
  const logRef = React.useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  
  // Auto-scroll to bottom only if user is near the bottom (not manually scrolling up)
  React.useEffect(() => {
    if (logRef.current && !isUserScrolling) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleActions.length, isUserScrolling]);

  // Detect when user manually scrolls
  const handleScroll = () => {
    if (logRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsUserScrolling(!isNearBottom);
    }
  };
  
  const winnerText = result.winningTeam === 'party' 
    ? '🎉 Your Party Wins!' 
    : result.winningTeam === 'enemy' 
    ? '💀 Enemy Party Wins!' 
    : '⚔️ Draw!';

  const winnerColor = result.winningTeam === 'party' 
    ? 'text-green-500' 
    : result.winningTeam === 'enemy' 
    ? 'text-red-500' 
    : 'text-yellow-500';

  const copyLog = () => {
    const logText = visibleActions
      .map(action => `[T${action.tick.toString().padStart(3, '0')}]${action.description}`)
      .join('\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="h-full">
      {isAtEnd && (
        <CardHeader>
          <CardTitle className={`text-2xl ${winnerColor}`}>{winnerText}</CardTitle>
          <CardDescription>Combat lasted {result.totalTicks} ticks</CardDescription>
        </CardHeader>
      )}
      <CardContent className={isAtEnd ? '' : 'pt-6'}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Combat Log</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={copyLog}
            className="h-8"
          >
            {copied ? (
              <>
                <span className="text-green-500 mr-1">✓</span>
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
        <div ref={logRef} onScroll={handleScroll} className="h-[600px] overflow-y-auto space-y-1 border rounded-lg p-2">
          {visibleActions.map((action, idx) => (
            <ActionLog key={idx} action={action} />
          ))}
          {visibleActions.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No actions yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionLog({ action }: { action: CombatAction }) {
  const bgColor = action.actionType === 'heal' 
    ? 'bg-green-500/10' 
    : action.actionType === 'attack' || action.actionType === 'basic_attack' || action.actionType === 'ability'
    ? 'bg-red-500/10' 
    : action.actionType === 'death'
    ? 'bg-gray-900/50'
    : 'bg-blue-500/10';

  const critClass = action.isCrit ? 'font-bold text-orange-500' : '';
  const deathClass = action.actionType === 'death' ? 'font-bold text-red-500' : '';

  return (
    <div className={`text-sm p-2 rounded ${bgColor} ${critClass} ${deathClass}`}>
      <span className="text-muted-foreground font-mono mr-2">[T{action.tick.toString().padStart(3, '0')}]</span>
      {action.description}
    </div>
  );
}

function DamageMeterContent({ actions, currentTick }: { actions: CombatAction[]; currentTick: number }) {
  // Calculate stats for each bot up to current tick
  const stats = useMemo(() => {
    const botStats = new Map<string, {
      name: string;
      damage: number;
      healing: number;
      damageTaken: number;
      deaths: number;
      dpt: number;
      hpt: number;
    }>();

    // Filter actions up to current tick
    const relevantActions = actions.filter(a => a.tick <= currentTick);

    relevantActions.forEach(action => {
      // Initialize actor if not exists
      if (!botStats.has(action.actorId)) {
        botStats.set(action.actorId, {
          name: action.actorName,
          damage: 0,
          healing: 0,
          damageTaken: 0,
          deaths: 0,
          dpt: 0,
          hpt: 0
        });
      }

      // Initialize target if not exists
      if (action.targetId && !botStats.has(action.targetId)) {
        botStats.set(action.targetId, {
          name: action.targetName || '',
          damage: 0,
          healing: 0,
          damageTaken: 0,
          deaths: 0,
          dpt: 0,
          hpt: 0
        });
      }

      const actorStats = botStats.get(action.actorId)!;

      if (action.actionType === 'heal') {
        actorStats.healing += action.value;
      } else if (action.actionType === 'attack' || action.actionType === 'basic_attack' || action.actionType === 'ability') {
        actorStats.damage += action.value;
        if (action.targetId) {
          const targetStats = botStats.get(action.targetId)!;
          targetStats.damageTaken += action.value;
        }
      } else if (action.actionType === 'death') {
        actorStats.deaths += 1;
      }
    });

    // Calculate DPT and HPT (damage/healing per tick)
    const tickCount = currentTick || 1;
    botStats.forEach(stats => {
      stats.dpt = stats.damage / tickCount;
      stats.hpt = stats.healing / tickCount;
    });

    return Array.from(botStats.values());
  }, [actions, currentTick]);

  const maxDamage = Math.max(...stats.map(s => s.damage), 1);
  const maxHealing = Math.max(...stats.map(s => s.healing), 1);
  const maxDPT = Math.max(...stats.map(s => s.dpt), 1);

  return (
    <Tabs defaultValue="damage" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-4">
        <TabsTrigger value="damage" className="flex items-center gap-1.5">
          <Swords className="h-4 w-4" />
          <span className="hidden sm:inline">Damage</span>
        </TabsTrigger>
        <TabsTrigger value="dpt" className="flex items-center gap-1.5">
          <Zap className="h-4 w-4" />
          <span>DPT</span>
        </TabsTrigger>
        <TabsTrigger value="healing" className="flex items-center gap-1.5">
          <Heart className="h-4 w-4" />
          <span className="hidden sm:inline">Healing</span>
        </TabsTrigger>
        <TabsTrigger value="taken" className="flex items-center gap-1.5">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Taken</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="damage" className="mt-0">
        <div className="space-y-2 max-h-[550px] overflow-y-auto">
          {stats
            .sort((a, b) => b.damage - a.damage)
            .map(bot => (
              <div key={bot.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{bot.name}</span>
                  <span className="text-muted-foreground">{Math.round(bot.damage)} ({bot.dpt.toFixed(1)}/tick)</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(bot.damage / maxDamage) * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </TabsContent>

      <TabsContent value="dpt" className="mt-0">
        <div className="space-y-2 max-h-[550px] overflow-y-auto">
          {stats
            .sort((a, b) => b.dpt - a.dpt)
            .map(bot => (
              <div key={bot.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{bot.name}</span>
                  <span className="text-muted-foreground">{bot.dpt.toFixed(2)} DPT</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(bot.dpt / maxDPT) * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </TabsContent>

      <TabsContent value="healing" className="mt-0">
        <div className="space-y-2 max-h-[550px] overflow-y-auto">
          {stats
            .filter(bot => bot.healing > 0)
            .sort((a, b) => b.healing - a.healing)
            .map(bot => (
              <div key={bot.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{bot.name}</span>
                  <span className="text-muted-foreground">{Math.round(bot.healing)} ({bot.hpt.toFixed(1)}/tick)</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(bot.healing / maxHealing) * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </TabsContent>

      <TabsContent value="taken" className="mt-0">
        <div className="space-y-2 max-h-[550px] overflow-y-auto">
          {stats
            .sort((a, b) => b.damageTaken - a.damageTaken)
            .map(bot => (
              <div key={bot.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{bot.name}</span>
                  <span className="text-muted-foreground">{Math.round(bot.damageTaken)}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(bot.damageTaken / maxDamage) * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}