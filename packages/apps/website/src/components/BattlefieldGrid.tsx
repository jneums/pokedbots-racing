import { CombatBot, CombatAction } from '../lib/combat-engine';
import { Shield, Swords, Heart, Zap } from 'lucide-react';
import { getBotThumbnailUrl } from '../hooks/useRandomBots';
import { useEffect, useState, useRef } from 'react';
import { AttackAnimations } from './AttackAnimations';

interface BattlefieldGridProps {
  party: CombatBot[];
  enemy: CombatBot[];
  gridWidth?: number;
  gridHeight?: number;
  recentActions?: CombatAction[]; // Last few actions to show as floating text
  showDebugArrows?: boolean; // Toggle for targeting arrows
}

const CLASS_ICONS = {
  Bulwark: Shield,
  Striker: Swords,
  Fixer: Heart,
  Tactician: Zap
};

const CLASS_COLORS = {
  Bulwark: 'bg-amber-600',    // Tank - orange/brown
  Striker: 'bg-orange-500',   // DPS - bright orange
  Fixer: 'bg-green-500',      // Healer - green
  Tactician: 'bg-purple-500'  // Support - purple
};

export function BattlefieldGrid({ 
  party, 
  enemy, 
  gridWidth = 10, 
  gridHeight = 5,
  recentActions = [],
  showDebugArrows = false
}: BattlefieldGridProps) {
  const allBots = [...party, ...enemy];
  const [activeAttacks, setActiveAttacks] = useState<Array<{
    id: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
    isRanged: boolean;
    isCrit: boolean;
  }>>([]);
  
  const prevActionsLengthRef = useRef(0);
  const prevActionsTickRef = useRef(0);
  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update active attacks when recent actions change
  useEffect(() => {
    // Check if actions actually changed by looking at the last action's tick
    const lastTick = recentActions.length > 0 ? recentActions[recentActions.length - 1]?.tick ?? 0 : 0;
    
    if (lastTick === prevActionsTickRef.current) {
      return; // Same tick, no new actions
    }
    prevActionsTickRef.current = lastTick;
    prevActionsLengthRef.current = recentActions.length;
    
    // Clear any existing timer
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    
    const newAttacks = recentActions
      .filter(action => 
        (action.actionType === 'attack' || action.actionType === 'basic_attack' || action.actionType === 'ability') 
        && action.value > 0
      )
      .slice(-3)
      .map((action, idx) => {
        // Use positions from the action (captured when action occurred)
        // instead of current bot positions (which may have changed)
        const from = action.newActorPosition;
        const to = action.newTargetPosition;
        
        if (!from || !to) return null;
        
        // Look up actor for attack type (melee/ranged)
        const actor = allBots.find(b => b.id === action.actorId);
        if (!actor) return null;
        
        return {
          id: `${action.tick}-${action.actorId}-${idx}`,
          from: { x: from.x, y: from.y },
          to: { x: to.x, y: to.y },
          isRanged: actor.attackType === 'ranged',
          isCrit: action.isCrit
        };
      })
      .filter(Boolean) as typeof activeAttacks;
    
    setActiveAttacks(newAttacks);
    
    // Don't auto-clear - let them stay visible
  }); // No dependencies - check manually with ref
  
  const getBotsAtPosition = (x: number, y: number): CombatBot[] => {
    return allBots.filter(bot => 
      bot.position?.x === x && bot.position?.y === y
    ).sort((a, b) => {
      // Dead bots first (render behind), living bots last (render on top)
      if (a.isDead && !b.isDead) return -1;
      if (!a.isDead && b.isDead) return 1;
      return 0;
    });
  };

  const isPartyBot = (bot: CombatBot) => party.some(p => p.id === bot.id);
  
  const getTargetBot = (bot: CombatBot): CombatBot | null => {
    if (!bot.currentTargetId) return null;
    return allBots.find(b => b.id === bot.currentTargetId && !b.isDead) || null;
  };
  
  // Get floating text for a specific bot (from recent actions)
  const getFloatingText = (botId: string) => {
    if (recentActions.length === 0) return [];
    
    // Get the most recent tick
    const lastTick = recentActions[recentActions.length - 1]?.tick ?? 0;
    
    // Show actions from last 3 seconds worth of ticks (assuming animation is 3s)
    // At 10 ticks/second, that's about 30 ticks
    const minTick = lastTick - 30;
    
    return recentActions
      .filter(action => action.tick > minTick && (action.targetId === botId || action.actorId === botId))
      .map(action => {
        const isTarget = action.targetId === botId;
        if (!isTarget && action.actionType !== 'ability' && action.actionType !== 'basic_attack') {
          return null; // Don't show movement on actor
        }
        
        let text = '';
        let color = '';
        let icon = '';
        
        if (action.actionType === 'heal') {
          text = `+${Math.round(action.value)}`;
          color = 'text-green-400';
          icon = '💚';
        } else if (action.actionType === 'attack' || action.actionType === 'basic_attack') {
          if (isTarget && action.value > 0) {
            // Determine if melee or ranged based on actor
            const actor = allBots.find(b => b.id === action.actorId);
            const isMelee = actor?.attackType === 'melee';
            
            text = `-${Math.round(action.value)}`;
            color = action.isCrit ? 'text-orange-400' : 'text-red-400';
            icon = isMelee ? '⚔️' : '🏹';
          }
        } else if (action.actionType === 'ability') {
          if (isTarget && action.value > 0) {
            text = `-${Math.round(action.value)}`;
            color = action.isCrit ? 'text-orange-400' : 'text-purple-400';
            icon = '✨';
          }
        }
        
        return text ? { text, color, isCrit: action.isCrit, tick: action.tick, icon, actionId: `${action.tick}-${action.actorId}-${action.targetId}` } : null;
      })
      .filter(Boolean);
  };

  return (
    <>
      <div className="w-full mx-auto p-6 bg-card border border-border rounded-lg">
      <h3 className="text-xl font-bold mb-4 text-center">⚔️ Battlefield</h3>
      
      <div className="relative" style={{ aspectRatio: `${gridWidth} / ${gridHeight}` }}>
        {/* Three.js attack animations */}
        <AttackAnimations attacks={activeAttacks} gridWidth={gridWidth} gridHeight={gridHeight} />
        
        {/* SVG overlay for debug arrows */}
        {showDebugArrows && (
          <svg 
            className="absolute inset-0 pointer-events-none z-10" 
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%' }}
          >
            <defs>
              <marker
                id="arrowhead-blue"
                markerWidth="4"
                markerHeight="4"
                refX="3"
                refY="2"
                orient="auto"
              >
                <polygon points="0 0, 4 2, 0 4" fill="#3b82f6" />
              </marker>
              <marker
                id="arrowhead-red"
                markerWidth="4"
                markerHeight="4"
                refX="3"
                refY="2"
                orient="auto"
              >
                <polygon points="0 0, 4 2, 0 4" fill="#ef4444" />
              </marker>
            </defs>
            
            {/* Debug: Targeting arrows */}
            {allBots.filter(bot => !bot.isDead && bot.currentTargetId).map(bot => {
            const target = getTargetBot(bot);
            if (!target) return null;
            
            const cellWidth = 100 / gridWidth;
            const cellHeight = 100 / gridHeight;
            
            const startX = (bot.position.x + 0.5) * cellWidth;
            const startY = (bot.position.y + 0.5) * cellHeight;
            const endX = (target.position.x + 0.5) * cellWidth;
            const endY = (target.position.y + 0.5) * cellHeight;
            
            const isParty = isPartyBot(bot);
            const color = isParty ? '#3b82f6' : '#ef4444'; // blue or red
            const markerId = isParty ? 'arrowhead-blue' : 'arrowhead-red';
            
            return (
              <line
                key={bot.id}
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={color}
                strokeWidth="0.3"
                strokeOpacity="0.3"
                markerEnd={`url(#${markerId})`}
              />
            );
          })}
          </svg>
        )}
        
        <div className="relative" style={{ 
          width: '100%',
          paddingBottom: `${(gridHeight / gridWidth) * 100}%` // Maintain aspect ratio
        }}>
          {/* Grid cells (background) */}
          <div className="absolute inset-0 grid gap-1" style={{ 
            gridTemplateColumns: `repeat(${gridWidth}, 1fr)`,
            gridTemplateRows: `repeat(${gridHeight}, 1fr)` 
          }}>
            {Array.from({ length: gridHeight * gridWidth }).map((_, idx) => {
              const x = idx % gridWidth;
              const y = Math.floor(idx / gridWidth);
              const bots = getBotsAtPosition(x, y);
              
              const bgColor = 'bg-gray-800/30';
              const borderColor = 'border-gray-700/40';
              
              return (
                <div
                  key={`${x}-${y}`}
                  className={`
                    aspect-square border-2 rounded-lg relative
                    ${bgColor} ${borderColor}
                    ${bots.length > 0 ? 'border-solid' : 'border-dashed'}
                    transition-all duration-300
                  `}
                >
                  {/* Grid coordinates */}
                  <div className="absolute top-1 left-1 text-[8px] text-muted-foreground opacity-50">
                    {x},{y}
                  </div>
                  
                  {/* Empty cell indicators */}
                  {bots.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <div className="text-xs text-muted-foreground">
                        {x < 5 ? (x <= 1 ? 'Back' : x <= 3 ? 'Mid' : 'Front') : 
                                 (x === 5 ? 'Front' : x <= 6 ? 'Mid' : 'Back')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bots layer (absolute positioned for smooth transitions) */}
          <div className="absolute inset-0 grid gap-1" style={{ 
            gridTemplateColumns: `repeat(${gridWidth}, 1fr)`,
            gridTemplateRows: `repeat(${gridHeight}, 1fr)`,
            pointerEvents: 'none'
          }}>
            {allBots.sort((a, b) => {
              // Dead bots render first (behind)
              if (a.isDead && !b.isDead) return -1;
              if (!a.isDead && b.isDead) return 1;
              return 0;
            }).map((bot, botIndex) => {
              const cellWidth = 100 / gridWidth;
              const cellHeight = 100 / gridHeight;
              
              return (
                <div
                  key={bot.id}
                  className={`
                    absolute flex flex-col items-center justify-center p-1
                    ${bot.isDead ? 'opacity-40 grayscale' : ''}
                    transition-all duration-200 ease-out
                  `}
                  style={{
                    left: `${bot.position.x * cellWidth}%`,
                    top: `${bot.position.y * cellHeight}%`,
                    width: `${cellWidth}%`,
                    height: `${cellHeight}%`,
                    zIndex: botIndex,
                    pointerEvents: 'auto'
                  }}
                >
                    {/* Health bar - always visible (can be combat rezzed) */}
                    <div className="w-full h-1 bg-secondary rounded-full mb-0.5">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          bot.hp / bot.maxHp > 0.5 ? 'bg-green-500' :
                          bot.hp / bot.maxHp > 0.25 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${(bot.hp / bot.maxHp) * 100}%` }}
                      />
                    </div>
                    
                    {/* Resource bar (TFT-style) - always visible (can be combat rezzed) */}
                    <div className="w-full h-1 bg-secondary rounded-full mb-0.5">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          bot.resourceType === 'mana' ? 'bg-cyan-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${(bot.resource / bot.maxResource) * 100}%` }}
                      />
                    </div>
                    
                    {/* Avatar with team border - greyed out when dead */}
                    <div className={`
                      w-14 h-14 rounded-lg border-4
                      overflow-hidden
                      bg-gray-700
                      ${bot.isDead
                        ? 'border-gray-600 shadow-none' 
                        : isPartyBot(bot) 
                          ? 'border-blue-500 shadow-lg shadow-blue-500/50' 
                          : 'border-red-500 shadow-lg shadow-red-500/50'
                      }
                    `}>
                      {bot.tokenId !== undefined ? (
                        <img 
                          src={getBotThumbnailUrl(bot.tokenId)}
                          alt={bot.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        // Fallback to icon if no tokenId
                        (() => {
                          const Icon = CLASS_ICONS[bot.class];
                          return <Icon className="w-6 h-6 text-white" />;
                        })()
                      )}
                    </div>
                    
                    {/* Death indicator - only show skull when actually dead */}
                    {bot.isDead && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl pointer-events-none z-10">
                        💀
                      </div>
                    )}
                    
                    {/* Class/Role icon badge (bottom-left corner) */}
                    <div className="absolute bottom-1 left-1 bg-gray-900/95 rounded-full p-1 border border-gray-700">
                      {(() => {
                        const Icon = CLASS_ICONS[bot.class];
                        return <Icon className="w-3 h-3 text-white" />;
                      })()}
                    </div>
                    
                    {/* Rating/Level badge (bottom-center) */}
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 bg-gray-900/95 rounded px-1.5 py-0.5 border border-gray-700">
                      <div className="text-[9px] font-bold text-white">
                        {Math.round((bot.stats.stability + bot.stats.powerCore + bot.stats.acceleration + bot.stats.speed) / 4)}
                      </div>
                    </div>
                    
                    {/* Current target avatar (bottom-right corner) */}
                    {bot.currentTargetId && !bot.isDead && (() => {
                      const target = [...party, ...enemy].find(b => b.id === bot.currentTargetId);
                      if (target?.tokenId !== undefined) {
                        return (
                          <div className="absolute bottom-1 right-1 w-6 h-6 rounded border-2 border-yellow-400 overflow-hidden bg-gray-900 shadow-lg">
                            <img 
                              src={getBotThumbnailUrl(target.tokenId)}
                              alt={`Target: ${target.name}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Bot name and token ID */}
                    <div className="text-[8px] font-medium text-center mt-0.5 line-clamp-1">
                      {bot.tokenId !== undefined ? `#${bot.tokenId}` : bot.name}
                    </div>

                    {/* Attack type indicator */}
                    <div className="text-[6px] text-muted-foreground">
                      {bot.attackType === 'melee' ? '⚔️' : '🏹'}
                    </div>

                    {/* Movement indicator */}
                    {bot.isMoving && bot.targetPosition && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] px-1 rounded">
                        →
                      </div>
                    )}

                    {/* Threat indicator */}
                    {bot.threat > 50 && (
                      <div className="absolute -top-1 -left-1 bg-orange-500 text-white text-[10px] px-1 rounded">
                        🎯
                      </div>
                    )}
                    
                    {/* Floating Combat Text */}
                    {(() => {
                      const floatingTexts = getFloatingText(bot.id);
                      if (!floatingTexts || floatingTexts.length === 0) return null;
                      
                      // Group by tick to handle spacing
                      const textsByTick = new Map<number, typeof floatingTexts>();
                      floatingTexts.forEach(text => {
                        if (text && !textsByTick.has(text.tick)) {
                          textsByTick.set(text.tick, []);
                        }
                        const tickTexts = textsByTick.get(text?.tick ?? 0);
                        if (text && tickTexts) tickTexts.push(text);
                      });
                      
                      return floatingTexts.map((floatingText) => {
                        if (!floatingText) return null;
                        const textsOnSameTick = textsByTick.get(floatingText.tick);
                        if (!textsOnSameTick) return null;
                        const indexInTick = textsOnSameTick.indexOf(floatingText);
                        
                        return (
                          <div 
                            key={floatingText.actionId}
                            className={`absolute font-bold text-sm ${floatingText.color} pointer-events-none whitespace-nowrap`}
                            style={{
                              left: '50%',
                              transform: 'translateX(-50%)',
                              top: `${-24 - (indexInTick * 16)}px`,
                              textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,1)',
                              animation: 'floatFade 3s linear forwards',
                              animationDelay: '400ms',  // Delay to match projectile travel time
                              opacity: 0  // Start invisible until animation begins
                            }}
                          >
                            {floatingText.icon} {floatingText.text}{floatingText.isCrit ? ' (CRIT)' : ''}
                          </div>
                        );
                      });
                    })()}
                  </div>
                );
              })}
          </div>
        </div>
    </div>

    {/* Legend */}
    <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-muted-foreground">Your Party</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-muted-foreground">Enemy Party</span>
        </div>
        <div className="flex items-center gap-2">
          <span>⚔️</span>
          <span className="text-muted-foreground">Melee</span>
        </div>
        <div className="flex items-center gap-2">
          <span>🏹</span>
          <span className="text-muted-foreground">Ranged</span>
        </div>
        <div className="flex items-center gap-2">
          <span>🎯</span>
          <span className="text-muted-foreground">High Threat</span>
        </div>
      </div>
    </div>
    </>
  );
}
