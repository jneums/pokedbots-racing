'use client';

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useCreateUserEvent, type CreateUserEventParams } from '@/hooks/useRacing';
import { useAuth } from '@/hooks/useAuth';
import { Principal } from '@icp-sdk/core/principal';

const DIVISIONS = ['Scrap', 'Junker', 'Raider', 'Elite', 'SilentKlan'] as const;
const TERRAINS = ['ScrapHeaps', 'WastelandSand', 'MetalRoads'] as const;
const REGISTRATION_WINDOWS = [
  { value: '1', label: '1 hour before' },
  { value: '2', label: '2 hours before' },
  { value: '4', label: '4 hours before' },
  { value: '8', label: '8 hours before' },
  { value: '12', label: '12 hours before' },
  { value: '24', label: '24 hours before' },
];

function getMinScheduledTime(): string {
  const now = new Date();
  now.setHours(now.getHours() + 2);
  now.setMinutes(now.getMinutes() + 5); // 5 min buffer
  // Format as datetime-local string in local time
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

interface FormErrors {
  name?: string;
  scheduledTime?: string;
  divisions?: string;
  terrains?: string;
  distanceMin?: string;
  distanceMax?: string;
  entryFee?: string;
  invitedPrincipals?: string;
  general?: string;
}

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const createEvent = useCreateUserEvent();

  // Event Details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creatorName, setCreatorName] = useState('');

  // Schedule
  const [scheduledTime, setScheduledTime] = useState('');
  const [registrationWindow, setRegistrationWindow] = useState('4');

  // Entry & Prizes
  const [entryFeeICP, setEntryFeeICP] = useState('0.01');
  const [prizeContributionICP, setPrizeContributionICP] = useState('');

  // Race Configuration
  const [selectedDivisions, setSelectedDivisions] = useState<Set<string>>(new Set(['Scrap']));
  const [minEntries, setMinEntries] = useState('3');
  const [maxRegistrations, setMaxRegistrations] = useState('8');
  const [selectedTerrains, setSelectedTerrains] = useState<Set<string>>(
    new Set(['ScrapHeaps', 'WastelandSand', 'MetalRoads'])
  );
  const [distanceMin, setDistanceMin] = useState('5');
  const [distanceMax, setDistanceMax] = useState('15');

  // Visibility
  const [visibility, setVisibility] = useState<'Public' | 'Private' | 'Restricted'>('Public');
  const [invitedPrincipals, setInvitedPrincipals] = useState('');
  const [allowedBotIds, setAllowedBotIds] = useState('');
  const [minElo, setMinElo] = useState('');

  // Validation
  const [errors, setErrors] = useState<FormErrors>({});

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">🔒 Authentication Required</h1>
            <p className="text-muted-foreground mb-8">
              You need to connect your wallet to create an event.
            </p>
            <Link to="/schedule">
              <Button variant="outline">← Back to Schedule</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function toggleDivision(division: string) {
    setSelectedDivisions((prev) => {
      const next = new Set(prev);
      if (next.has(division)) {
        next.delete(division);
      } else {
        next.add(division);
      }
      return next;
    });
  }

  function toggleTerrain(terrain: string) {
    setSelectedTerrains((prev) => {
      const next = new Set(prev);
      if (next.has(terrain)) {
        next.delete(terrain);
      } else {
        next.add(terrain);
      }
      return next;
    });
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Event name is required';
    }

    if (!scheduledTime) {
      newErrors.scheduledTime = 'Scheduled time is required';
    } else {
      const scheduled = new Date(scheduledTime);
      const minTime = new Date();
      minTime.setHours(minTime.getHours() + 2);
      if (scheduled < minTime) {
        newErrors.scheduledTime = 'Event must be at least 2 hours from now';
      }
    }

    if (selectedDivisions.size === 0) {
      newErrors.divisions = 'Select at least one division';
    }

    if (selectedTerrains.size === 0) {
      newErrors.terrains = 'Select at least one terrain';
    }
    const min = Number(distanceMin);
    const max = Number(distanceMax);
    if (!min || min < 1) {
      newErrors.distanceMin = 'Min distance must be at least 1 km';
    }
    if (!max || max < 1) {
      newErrors.distanceMax = 'Max distance must be at least 1 km';
    }
    if (min && max && min > max) {
      newErrors.distanceMax = 'Max distance must be >= min distance';
    }

    const fee = Number(entryFeeICP);
    if (isNaN(fee) || fee < 0) {
      newErrors.entryFee = 'Entry fee must be 0 or more';
    }

    if (visibility === 'Private') {
      const lines = invitedPrincipals
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        newErrors.invitedPrincipals = 'Add at least one principal ID for a private event';
      } else {
        for (const line of lines) {
          try {
            Principal.fromText(line);
          } catch {
            newErrors.invitedPrincipals = `Invalid principal: "${line}"`;
            break;
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    // Convert scheduled time to nanoseconds
    const scheduledDate = new Date(scheduledTime);
    const scheduledTimeNs = scheduledDate.getTime() * 1_000_000;

    // Convert ICP to e8s
    const entryFeeE8s = Math.round(Number(entryFeeICP) * 100_000_000);
    const prizeContributionE8s = prizeContributionICP
      ? Math.round(Number(prizeContributionICP) * 100_000_000)
      : 0;

    // Build divisions
    const divisions = Array.from(selectedDivisions).map((d) => ({ [d]: null })) as any;

    // Build visibility
    let visibilityConfig: any;
    if (visibility === 'Public') {
      visibilityConfig = { Public: null };
    } else if (visibility === 'Private') {
      visibilityConfig = { Private: null };
    } else {
      // Restricted
      const allowedBots = allowedBotIds
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '' && !isNaN(Number(s)))
        .map((s) => BigInt(s));

      visibilityConfig = {
        Restricted: {
          allowedPlayers: [],
          allowedBots: allowedBots.length > 0 ? [allowedBots] : [],
          minElo: minElo && !isNaN(Number(minElo)) ? [BigInt(minElo)] : [],
          requiredFaction: [],
          requiredAchievement: [],
          maxElo: [],
        },
      };
    }

    // Build race creation mode (always Automatic)
    const terrains = Array.from(selectedTerrains).map((t) => ({ [t]: null }));
    const raceCreationMode: any = {
      Automatic: {
        terrains,
        distanceRange: {
          min: BigInt(Number(distanceMin)),
          max: BigInt(Number(distanceMax)),
        },
        heatAllocation: { Random: null },
        racesPerClass: [],
      },
    };

    // Parse invited participants for Private events
    const parsedInvitedParticipants =
      visibility === 'Private'
        ? invitedPrincipals
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => Principal.fromText(s))
        : undefined;

    const config: CreateUserEventParams = {
      name: name.trim(),
      description: description.trim(),
      creatorName: creatorName.trim() || undefined,
      scheduledTime: scheduledTimeNs,
      registrationWindowHours: Number(registrationWindow),
      entryFee: entryFeeE8s,
      prizeContribution: prizeContributionE8s,
      divisions,
      minEntries: Number(minEntries),
      maxRegistrationsPerClass: Number(maxRegistrations),
      raceCreationMode,
      visibility: visibilityConfig,
      invitedParticipants: parsedInvitedParticipants,
    };

    try {
      const result = await createEvent.mutateAsync(config);
      navigate(`/schedule/${result.eventId.toString()}`);
    } catch (err) {
      setErrors({ general: (err as Error).message });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/schedule"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block"
            >
              ← Back to Schedule
            </Link>
            <h1 className="text-4xl font-bold">🏁 Create Event</h1>
            <p className="text-muted-foreground mt-2">
              Set up a custom racing event for the wasteland
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-400">
                0.5 ICP creation fee (non-refundable)
              </Badge>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* General Error */}
            {errors.general && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {errors.general}
              </div>
            )}

            {/* Section 1: Event Details */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl">📋 Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Event Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Wasteland Weekend Sprint"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Describe your event..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="creatorName">Hosted By (optional)</Label>
                  <Input
                    id="creatorName"
                    placeholder="Your name or alias"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Schedule */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl">⏰ Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledTime">Event Start Time *</Label>
                  <Input
                    id="scheduledTime"
                    type="datetime-local"
                    min={getMinScheduledTime()}
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className={errors.scheduledTime ? 'border-red-500' : ''}
                  />
                  {errors.scheduledTime && (
                    <p className="text-xs text-red-400">{errors.scheduledTime}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Must be at least 2 hours from now
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Registration Opens</Label>
                  <Select value={registrationWindow} onValueChange={setRegistrationWindow}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select window" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGISTRATION_WINDOWS.map((w) => (
                        <SelectItem key={w.value} value={w.value}>
                          {w.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Entry & Prizes */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl">💰 Entry & Prizes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entryFee">Entry Fee (ICP)</Label>
                    <Input
                      id="entryFee"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0.01"
                      value={entryFeeICP}
                      onChange={(e) => setEntryFeeICP(e.target.value)}
                      className={errors.entryFee ? 'border-red-500' : ''}
                    />
                    {errors.entryFee && <p className="text-xs text-red-400">{errors.entryFee}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prizeContribution">Prize Contribution (ICP)</Label>
                    <Input
                      id="prizeContribution"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0 (optional bonus)"
                      value={prizeContributionICP}
                      onChange={(e) => setPrizeContributionICP(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional bonus added to the prize pool (escrowed, refundable if cancelled)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Race Configuration */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl">🏎️ Race Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Divisions */}
                <div className="space-y-3">
                  <Label>Divisions *</Label>
                  <div className="flex flex-wrap gap-3">
                    {DIVISIONS.map((division) => (
                      <label
                        key={division}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedDivisions.has(division)}
                          onCheckedChange={() => toggleDivision(division)}
                        />
                        <span className="text-sm">
                          {division === 'SilentKlan' ? 'Silent Klan' : division}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.divisions && (
                    <p className="text-xs text-red-400">{errors.divisions}</p>
                  )}
                </div>

                {/* Min/Max per class */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minEntries">Min Entries per Class</Label>
                    <Input
                      id="minEntries"
                      type="number"
                      min="2"
                      max="20"
                      value={minEntries}
                      onChange={(e) => setMinEntries(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxRegistrations">Max Registrations per Class</Label>
                    <Input
                      id="maxRegistrations"
                      type="number"
                      min="2"
                      max="50"
                      value={maxRegistrations}
                      onChange={(e) => setMaxRegistrations(e.target.value)}
                    />
                  </div>
                </div>

                {/* Terrains & Distance */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>Terrains *</Label>
                    <div className="flex flex-wrap gap-3">
                      {TERRAINS.map((terrain) => (
                        <label
                          key={terrain}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedTerrains.has(terrain)}
                            onCheckedChange={() => toggleTerrain(terrain)}
                          />
                          <span className="text-sm">
                            {terrain === 'ScrapHeaps'
                              ? '🏚️ Scrap Heaps'
                              : terrain === 'WastelandSand'
                              ? '🏜️ Wasteland Sand'
                              : '🛣️ Metal Roads'}
                          </span>
                        </label>
                      ))}
                    </div>
                    {errors.terrains && (
                      <p className="text-xs text-red-400">{errors.terrains}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="distanceMin">Min Distance (km)</Label>
                      <Input
                        id="distanceMin"
                        type="number"
                        min="1"
                        max="100"
                        value={distanceMin}
                        onChange={(e) => setDistanceMin(e.target.value)}
                        className={errors.distanceMin ? 'border-red-500' : ''}
                      />
                      {errors.distanceMin && (
                        <p className="text-xs text-red-400">{errors.distanceMin}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="distanceMax">Max Distance (km)</Label>
                      <Input
                        id="distanceMax"
                        type="number"
                        min="1"
                        max="100"
                        value={distanceMax}
                        onChange={(e) => setDistanceMax(e.target.value)}
                        className={errors.distanceMax ? 'border-red-500' : ''}
                      />
                      {errors.distanceMax && (
                        <p className="text-xs text-red-400">{errors.distanceMax}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 5: Visibility & Access */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl">👁️ Visibility & Access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select
                    value={visibility}
                    onValueChange={(v) => setVisibility(v as 'Public' | 'Private' | 'Restricted')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Public">🌍 Public - Anyone can join</SelectItem>
                      <SelectItem value="Private">🔒 Private - Invite only</SelectItem>
                      <SelectItem value="Restricted">
                        🛡️ Restricted - Custom requirements
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {visibility === 'Private' && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label htmlFor="invitedPrincipals">
                        Invited Players (Principal IDs, one per line)
                      </Label>
                      <textarea
                        id="invitedPrincipals"
                        rows={4}
                        placeholder={"e.g.\nab3fg-dyaaa-aaaaa-qaama-cai\ncd5hi-7yaaa-aaaaa-qaanb-cai"}
                        value={invitedPrincipals}
                        onChange={(e) => setInvitedPrincipals(e.target.value)}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Only these players will be able to register their bots for this event
                      </p>
                      {errors.invitedPrincipals && (
                        <p className="text-xs text-red-400">{errors.invitedPrincipals}</p>
                      )}
                    </div>
                  </div>
                )}

                {visibility === 'Restricted' && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label htmlFor="allowedBotIds">
                        Allowed Bot Token IDs (comma-separated)
                      </Label>
                      <Input
                        id="allowedBotIds"
                        placeholder="e.g. 42, 108, 256"
                        value={allowedBotIds}
                        onChange={(e) => setAllowedBotIds(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to allow all bots
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minElo">Minimum ELO (optional)</Label>
                      <Input
                        id="minElo"
                        type="number"
                        min="0"
                        placeholder="e.g. 1200"
                        value={minElo}
                        onChange={(e) => setMinElo(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary & Submit */}
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Total cost: <span className="text-foreground font-medium">0.5 ICP</span>{' '}
                      (creation fee)
                      {prizeContributionICP && Number(prizeContributionICP) > 0 && (
                        <>
                          {' + '}
                          <span className="text-amber-400 font-medium">
                            {prizeContributionICP} ICP
                          </span>{' '}
                          (prize contribution)
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requires ICRC-2 approval before creating
                    </p>
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={createEvent.isPending}
                    className="w-full sm:w-auto"
                  >
                    {createEvent.isPending ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Creating Event...
                      </span>
                    ) : (
                      '🏁 Create Event'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}
