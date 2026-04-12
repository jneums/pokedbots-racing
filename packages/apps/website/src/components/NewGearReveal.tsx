import { useState, useCallback, useRef, useMemo } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { X, ChevronRight, Sparkles } from 'lucide-react';
import { generatetokenIdentifier, generateExtThumbnailLink } from '@pokedbots-racing/ic-js';
import { useGetBotProfilesBatch } from '../hooks/useRacing';
import type { GearPieceView } from '../hooks/useGarage';

// ============================================================================
// CONSTANTS
// ============================================================================

const RARITY_CONFIG: Record<string, {
  bg: string;
  border: string;
  glow: string;
  text: string;
  badge: string;
  particle: string;
}> = {
  Common: {
    bg: 'bg-zinc-900/90',
    border: 'border-zinc-500/50',
    glow: '',
    text: 'text-zinc-300',
    badge: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    particle: 'bg-zinc-400',
  },
  Uncommon: {
    bg: 'bg-green-950/90',
    border: 'border-green-500/50',
    glow: 'shadow-[0_0_30px_rgba(34,197,94,0.3)]',
    text: 'text-green-300',
    badge: 'bg-green-500/20 text-green-400 border-green-500/30',
    particle: 'bg-green-400',
  },
  Rare: {
    bg: 'bg-blue-950/90',
    border: 'border-blue-500/50',
    glow: 'shadow-[0_0_40px_rgba(59,130,246,0.4)]',
    text: 'text-blue-300',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    particle: 'bg-blue-400',
  },
  Epic: {
    bg: 'bg-purple-950/90',
    border: 'border-purple-500/60',
    glow: 'shadow-[0_0_50px_rgba(168,85,247,0.5)]',
    text: 'text-purple-300',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    particle: 'bg-purple-400',
  },
  Legendary: {
    bg: 'bg-amber-950/90',
    border: 'border-amber-500/70',
    glow: 'shadow-[0_0_60px_rgba(245,158,11,0.6)]',
    text: 'text-amber-300',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    particle: 'bg-amber-400',
  },
};

const SLOT_ICONS: Record<string, string> = {
  Legs: '🦿',
  Thruster: '🔥',
  Chassis: '🛡️',
  Gyro: '🌀',
  Core: '⚡',
  Module: '🔧',
};

const CATEGORY_BADGE: Record<string, string> = {
  Standard: '',
  Unique: '✦',
  Named: '★',
};

// ============================================================================
// HELPERS
// ============================================================================

function formatPassive(passive: any): string {
  if (!passive) return '';
  const key = Object.keys(passive)[0];
  const val = passive[key];
  const labels: Record<string, string> = {
    SlipstreamBoost: `+${Number(val?.extraPercent || 0)}% slipstream bonus`,
    ComebackKid: `+${Number(val?.boostPercent || 0)}% when in last place`,
    FastStarter: `+${Number(val?.boostPercent || 0)}% for first ${Number(val?.segmentCount || 0)} segments`,
    TerrainMastery: `+${Number(val?.boostPercent || 0)}% on ${val?.terrain ? Object.keys(val.terrain)[0] : 'matched'} terrain`,
    SteadyPace: `${Number(val?.varianceReduction || 0)}% less variance`,
    LuckAmplifier: `+${Number(val?.procChanceBonus || 0)}% luck proc chance`,
    Ironclad: `${Number(val?.badLuckReduction || 0)}% less bad luck penalty`,
    FinalSurge: `+${Number(val?.boostPercent || 0)}% for last ${Number(val?.segmentCount || 0)} segments`,
    RubberBandResist: `${Number(val?.resistPercent || 0)}% rubber-band resist`,
    UphillGrinder: `+${Number(val?.boostPercent || 0)}% uphill bonus`,
    DownhillDaredevil: `+${Number(val?.boostPercent || 0)}% downhill bonus`,
    PackRunner: `+${Number(val?.boostPercent || 0)}% when in the pack`,
  };
  return labels[key] || key;
}

function getRarityOrder(rarity: string): number {
  const order: Record<string, number> = {
    Common: 0,
    Uncommon: 1,
    Rare: 2,
    Epic: 3,
    Legendary: 4,
  };
  return order[rarity] ?? 0;
}

// ============================================================================
// GEAR CARD (single revealed card)
// ============================================================================

function GearCard({ gear, isRevealed }: { gear: GearPieceView; isRevealed: boolean }) {
  const config = RARITY_CONFIG[gear.rarity] || RARITY_CONFIG.Common;
  const stats = [
    { label: 'SPD', value: gear.speedBonus },
    { label: 'ACC', value: gear.accelerationBonus },
    { label: 'PWR', value: gear.powerCoreBonus },
    { label: 'STB', value: gear.stabilityBonus },
    { label: 'LCK', value: gear.luckBonus },
  ].filter((s) => s.value > 0);

  return (
    <div className="gear-card-container w-full max-w-[320px] mx-auto" style={{ perspective: '1000px' }}>
      <div
        className={`gear-card-inner relative w-full transition-transform duration-700 ease-out ${
          isRevealed ? 'gear-card-flipped' : ''
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* BACK (face-down card) */}
        <div
          className="gear-card-back absolute inset-0 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-card to-card/80 flex items-center justify-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-center space-y-3">
            <div className="text-5xl">🎁</div>
            <p className="text-sm text-muted-foreground font-medium">Tap to reveal</p>
          </div>
        </div>

        {/* FRONT (revealed gear) */}
        <div
          className={`gear-card-front rounded-xl border-2 ${config.border} ${config.bg} ${config.glow} p-5 space-y-4`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Header: slot icon + name + rarity */}
          <div className="text-center space-y-2">
            <div className="text-4xl">{SLOT_ICONS[gear.slot] || '⚙️'}</div>
            <div className="flex items-center justify-center gap-1.5">
              {CATEGORY_BADGE[gear.category] && (
                <span className="text-lg">{CATEGORY_BADGE[gear.category]}</span>
              )}
              <h3 className={`text-xl font-bold ${config.text}`}>{gear.name}</h3>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className={`text-xs ${config.badge}`}>
                {gear.rarity}
              </Badge>
              <span className="text-xs text-muted-foreground">{gear.slot}</span>
              <span className="text-xs text-muted-foreground">ilvl {gear.ilvl}</span>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            {gear.description}
          </p>

          {/* Stats */}
          {stats.length > 0 && (
            <div className="space-y-1.5">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-10 text-right font-mono text-xs">
                    {stat.label}
                  </span>
                  <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: isRevealed ? `${Math.min(stat.value * 3, 100)}%` : '0%',
                        transitionDelay: '0.5s',
                      }}
                    />
                  </div>
                  <span className={`font-mono text-sm font-bold ${config.text}`}>
                    +{stat.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Terrain tag */}
          {gear.terrainTag !== 'Universal' && (
            <div className="text-center">
              <Badge variant="outline" className="text-xs border-muted-foreground/30">
                🌍 {gear.terrainTag}
              </Badge>
            </div>
          )}

          {/* Passive */}
          {gear.passive && (
            <div className="border border-purple-500/30 bg-purple-500/10 rounded-lg p-2.5 text-center">
              <span className="text-xs font-semibold text-purple-400">✦ Passive: </span>
              <span className="text-xs text-purple-300">{formatPassive(gear.passive)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface NewGearRevealProps {
  gear: GearPieceView[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user has seen all cards and dismissed */
  onComplete?: () => void;
}

/** A single card in the reveal sequence, annotated with its bot. */
interface RevealCard {
  gear: GearPieceView;
  botIndex: number;
  /** True if this is the first card for a new bot group. */
  isGroupStart: boolean;
}

function getBotImageUrl(tokenIndex: number): string {
  const tokenId = generatetokenIdentifier('bzsui-sqaaa-aaaah-qce2a-cai', tokenIndex);
  return generateExtThumbnailLink(tokenId);
}

export function NewGearReveal({ gear, open, onOpenChange, onComplete }: NewGearRevealProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());

  // Snapshot gear when the dialog opens so background refetches can't
  // cause the card list to flicker or re-sort mid-reveal.
  // We use a ref + wasOpen tracking to capture synchronously on the
  // render where open transitions to true (no useEffect delay).
  const snapshotRef = useRef<RevealCard[]>([]);
  const wasOpenRef = useRef(false);

  if (open && !wasOpenRef.current && gear.length > 0) {
    // Group by bot, then sort each group by rarity (ascending)
    const byBot = new Map<number, GearPieceView[]>();
    for (const g of gear) {
      const bot = g.boundToBot || 0;
      if (!byBot.has(bot)) byBot.set(bot, []);
      byBot.get(bot)!.push(g);
    }
    const cards: RevealCard[] = [];
    for (const [botIndex, pieces] of byBot) {
      pieces.sort((a, b) => getRarityOrder(a.rarity) - getRarityOrder(b.rarity));
      pieces.forEach((g, i) => {
        cards.push({ gear: g, botIndex, isGroupStart: i === 0 });
      });
    }
    snapshotRef.current = cards;
  }
  wasOpenRef.current = open;

  const cards = snapshotRef.current;

  // Batch-fetch bot profiles for all bots in the reveal
  const botIndices = useMemo(() => {
    const indices = new Set<number>();
    for (const c of cards) indices.add(c.botIndex);
    return Array.from(indices);
  }, [cards]);
  const { data: botProfiles = [] } = useGetBotProfilesBatch(botIndices);

  const getBotName = useCallback((tokenIndex: number) => {
    const profile = botProfiles.find((p: any) => Number(p.tokenIndex) === tokenIndex);
    if (profile?.name && profile.name.length > 0 && profile.name[0]) {
      return profile.name[0];
    }
    return `Bot #${tokenIndex}`;
  }, [botProfiles]);

  const isCurrentRevealed = revealedSet.has(currentIndex);
  const allRevealed = revealedSet.size === cards.length;
  const isLastCard = currentIndex === cards.length - 1;

  const handleReveal = useCallback(() => {
    if (!isCurrentRevealed) {
      setRevealedSet((prev) => new Set(prev).add(currentIndex));
    } else if (!isLastCard) {
      // Already revealed — advance to next
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isCurrentRevealed, isLastCard, currentIndex]);

  const handleNext = useCallback(() => {
    if (!isLastCard) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isLastCard]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    onComplete?.();
    // Reset state after close animation
    setTimeout(() => {
      setCurrentIndex(0);
      setRevealedSet(new Set());
    }, 300);
  }, [onOpenChange, onComplete]);

  if (cards.length === 0) return null;

  const currentCard = cards[currentIndex];
  const currentGear = currentCard?.gear;
  const currentConfig = RARITY_CONFIG[currentGear?.rarity] || RARITY_CONFIG.Common;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md border-0 bg-transparent shadow-none p-0 [&>button]:hidden">
        <div className="relative flex flex-col items-center gap-4 p-4">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-background/80 hover:bg-background border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header — bot avatar + name + counter */}
          <div className="text-center space-y-2">
            {currentCard && (
              <div className="flex items-center justify-center gap-2">
                <img
                  src={getBotImageUrl(currentCard.botIndex)}
                  alt=""
                  className="h-8 w-8 rounded-full border border-border/50"
                />
                <span className="text-sm font-semibold text-foreground">
                  {getBotName(currentCard.botIndex)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold text-foreground">New Gear!</h2>
              <Sparkles className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-sm text-muted-foreground">
              {currentIndex + 1} / {cards.length}
            </p>
          </div>

          {/* Card area — click to reveal */}
          <button
            onClick={handleReveal}
            className="w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
            aria-label={isCurrentRevealed ? 'Next card' : 'Reveal card'}
          >
            <GearCard key={currentIndex} gear={currentGear} isRevealed={isCurrentRevealed} />
          </button>

          {/* Action buttons */}
          <div className="flex gap-2 w-full max-w-[320px]">
            {!isCurrentRevealed ? (
              <Button
                onClick={handleReveal}
                className="flex-1"
                size="lg"
              >
                🎴 Tap to Reveal
              </Button>
            ) : allRevealed ? (
              <Button
                onClick={handleClose}
                className="flex-1"
                size="lg"
              >
                ✅ Done
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="flex-1"
                size="lg"
              >
                Next Card <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>

          {/* Pip indicators */}
          {cards.length > 1 && (
            <div className="flex gap-1.5 flex-wrap justify-center max-w-[320px]">
              {cards.map((c, idx) => {
                const pipConfig = RARITY_CONFIG[c.gear.rarity] || RARITY_CONFIG.Common;
                const isActive = idx === currentIndex;
                const isRevealed = revealedSet.has(idx);
                return (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      c.isGroupStart && idx > 0 ? 'ml-2' : ''
                    } ${
                      isActive
                        ? `w-6 ${isRevealed ? pipConfig.particle : 'bg-muted-foreground'}`
                        : `w-2 ${isRevealed ? pipConfig.particle + ' opacity-60' : 'bg-muted-foreground/30'}`
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
