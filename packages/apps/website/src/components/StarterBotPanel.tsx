import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useClaimStarterBot, useStarterBotSlots, useDeleteStarterBot, useMyBots } from '../hooks/useGarage';
import { toast } from 'sonner';

const CLASSES = [
  { id: 'Scrap', stat: 19 },
  { id: 'Junker', stat: 29 },
  { id: 'Raider', stat: 39 },
  { id: 'Elite', stat: 49 },
] as const;

const FACTIONS = [
  { id: 'Game', emoji: '🎮', bonus: '+8% WastelandSand' },
  { id: 'Animal', emoji: '🦎', bonus: '+3% balanced' },
  { id: 'Industrial', emoji: '⚙️', bonus: '+5% PWR/STB' },
  { id: 'Food', emoji: '🍔', bonus: '+8% condition recovery' },
] as const;

export function StarterBotPanel() {
  const [expanded, setExpanded] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);
  const [botName, setBotName] = useState('');
  
  const { data: slots } = useStarterBotSlots();
  const { data: bots } = useMyBots();
  const claimMutation = useClaimStarterBot();
  const deleteMutation = useDeleteStarterBot();

  const handleClaim = async () => {
    if (!selectedClass || !selectedFaction) return;
    try {
      const result = await claimMutation.mutateAsync({
        raceClass: selectedClass,
        faction: selectedFaction,
        name: botName.trim() || undefined,
      });
      toast.success(result.message);
      setSelectedClass(null);
      setSelectedFaction(null);
      setBotName('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (raceClass: string) => {
    try {
      const msg = await deleteMutation.mutateAsync(raceClass);
      toast.success(msg);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const slotTaken = (cls: string): boolean => {
    if (!slots) return false;
    const key = cls.toLowerCase() as 'scrap' | 'junker' | 'raider' | 'elite';
    return slots[key] !== null;
  };

  const openSlots = CLASSES.filter(c => !slotTaken(c.id)).length;
  const hasBots = bots && bots.length > 0;

  // If all 4 slots taken, don't show anything
  if (openSlots === 0) return null;

  // Auto-expand when user has no bots at all
  const isExpanded = hasBots ? expanded : true;

  // Compact header for users who already have bots
  if (hasBots && !isExpanded) {
    return (
      <Card 
        className="border-2 border-amber-500/20 bg-card/80 backdrop-blur cursor-pointer hover:border-amber-500/40 transition-colors"
        onClick={() => setExpanded(true)}
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Plus className="h-5 w-5 text-amber-400" />
              <span className="font-semibold text-amber-400">Get Free Starter Bots</span>
              <span className="text-sm text-muted-foreground">
                {openSlots} slot{openSlots !== 1 ? 's' : ''} available
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-amber-500/20 bg-card/80 backdrop-blur">
      <CardHeader className={hasBots ? "pb-3" : undefined}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={hasBots ? "text-lg" : "text-2xl"}>
              {hasBots ? "Free Starter Bots" : "Get Started Free"}
            </CardTitle>
            <CardDescription className="mt-1">
              {hasBots 
                ? `${openSlots} slot${openSlots !== 1 ? 's' : ''} available — one per class`
                : "Create up to 4 free starter bots — one per class. Race, upgrade, earn ICP prizes. No NFT or wallet balance needed."
              }
            </CardDescription>
          </div>
          {hasBots && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Class selection */}
        <div>
          <h3 className="font-semibold mb-3 text-sm">Choose Class</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CLASSES.map(cls => {
              const taken = slotTaken(cls.id);
              return (
                <button
                  key={cls.id}
                  onClick={() => !taken && setSelectedClass(selectedClass === cls.id ? null : cls.id)}
                  disabled={taken}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    taken
                      ? 'border-muted bg-muted/30 opacity-50 cursor-not-allowed'
                      : selectedClass === cls.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-bold">{cls.id}</div>
                  <div className="text-xs text-muted-foreground">All stats: {cls.stat}</div>
                  {taken && <Badge variant="secondary" className="mt-1 text-[10px]">Claimed</Badge>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Faction selection */}
        {selectedClass && (
          <div>
            <h3 className="font-semibold mb-3 text-sm">Choose Faction</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {FACTIONS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFaction(selectedFaction === f.id ? null : f.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedFaction === f.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-bold">{f.emoji} {f.id}</div>
                  <div className="text-xs text-muted-foreground">{f.bonus}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Name + submit */}
        {selectedClass && selectedFaction && (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Bot Name (optional)</label>
              <Input
                value={botName}
                onChange={e => setBotName(e.target.value)}
                placeholder="Name your bot..."
                maxLength={30}
              />
            </div>
            <Button
              onClick={handleClaim}
              disabled={claimMutation.isPending}
              className="whitespace-nowrap"
            >
              {claimMutation.isPending ? 'Creating...' : `Create ${selectedClass} Bot`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
