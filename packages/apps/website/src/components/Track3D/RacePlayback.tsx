import { useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, Rewind, FastForward, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { TrackTemplate, CameraMode } from './types';
import { Track3DScene } from './Track3DScene';
import { calculateBotPosition } from './BotPositionCalculator';
// Import from trackData which has the same TRACK_TEMPLATES as RaceVisualizer
import { TRACK_TEMPLATES } from './trackData';

interface RaceResult {
  nftId: number;
  finalTime: number;
  segmentTimes: number[];
  position: number;
  stats?: {
    speed: number;
    stability: number;
    powerCore: number;
    acceleration: number;
  };
  faction?: string;
  preferredTerrain?: string;
}

interface RacePlaybackProps {
  track: TrackTemplate;
  results: RaceResult[];
  botColors: Record<number, string>; // nftId -> color
  botLabels: Record<number, string>; // nftId -> label
}

// Helper function to calculate segment time - matches backend/RaceVisualizer logic
function calculateSegmentTime(
  segment: { length: number; terrain: string; angle: number; difficulty: number },
  seed: bigint,
  stats: { speed: number; stability: number; powerCore: number; acceleration: number },
  previousDifficulty: number = 1.0
): number {
  const avgSpeed = stats.speed;
  const avgStability = stats.stability;
  const avgPowerCore = stats.powerCore;
  const avgAccel = stats.acceleration;
  
  const segmentLength = segment.length;
  
  // Base speed calculation - use square root to reduce speed dominance
  const baseSpeed = Math.sqrt(avgSpeed) * 7.5;
  
  // Terrain modifier - MATCH BACKEND EXACTLY
  let terrainMod = 1.0;
  if (segment.terrain === 'ScrapHeaps') {
    terrainMod = 1.0 + ((100 - avgStability) / 150.0); // Stability critical (up to +67%)
  } else if (segment.terrain === 'WastelandSand') {
    terrainMod = 1.0 + ((100 - avgPowerCore) / 200.0); // Endurance critical (up to +50%)
  } else if (segment.terrain === 'MetalRoads') {
    terrainMod = 1.0 + ((100 - avgAccel) / 160.0); // Acceleration helps (up to +62%)
  }
  
  // Angle modifier - match backend segment calculation
  let angleMod = 1.0;
  if (segment.angle > 0) {
    // Uphill - powerCore matters more
    angleMod = 1.0 + (segment.angle * (100.0 - avgPowerCore) / 3000.0);
  }
  
  // Momentum system: acceleration affects speed buildup after difficult sections
  const momentumLoss = previousDifficulty > 1.0 
    ? (previousDifficulty - 1.0) * 0.15
    : 0.0;
  
  const accelerationRecovery = avgAccel / 140.0;
  const momentumMod = 1.0 + (momentumLoss * (1.0 - accelerationRecovery));
  
  // Difficulty from track - scales with stability for technical sections
  const difficultyMod = segment.difficulty > 1.0
    ? segment.difficulty * (1.0 + ((100 - avgStability) / 300.0))
    : segment.difficulty;
  
  // Randomness - match backend (±10% per segment)
  const segmentSeed = Number(seed % 1000n);
  const randomMod = 0.90 + (segmentSeed / 5000.0); // 0.90 to 1.10
  
  // Calculate time - match backend formula with momentum
  const effectiveSpeed = baseSpeed / (terrainMod * angleMod * difficultyMod * momentumMod);
  const segmentTime = (segmentLength / effectiveSpeed) * randomMod;
  
  // Apply 10x speed multiplier to match backend
  return Math.max(0.1, segmentTime / 10.0);
}

export function RacePlayback({ track, results, botColors, botLabels }: RacePlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [followBotId, setFollowBotId] = useState<number | null>(results.length > 0 ? results[0].nftId : null);
  
  // Calculate total race duration (longest bot time)
  const totalDuration = useMemo(() => {
    const maxTime = Math.max(...results.map(r => r.finalTime));
    // Times are in seconds, convert to milliseconds for animation
    return maxTime * 1000;
  }, [results]);
  
  // Pre-calculate track positions for bot position calculation
  const trackPositions = useMemo(() => {
    // Match the exact position calculation from TrackGeometry.ts
    const positions: Array<[number, number, number]> = [];
    const SCALE = 0.1;
    
    let currentPos = { x: 0, y: 0, z: 0 };
    let currentDirection = 0; // Angle in radians
    
    positions.push([currentPos.x, currentPos.y, currentPos.z]);
    
    // Calculate difficulty weights for turn distribution (same as TrackGeometry)
    const difficultyWeights = track.segments.map(seg => Math.pow(seg.difficulty, 2));
    const totalWeight = difficultyWeights.reduce((sum, w) => sum + w, 0);
    const totalRotationNeeded = track.laps > 1 ? Math.PI * 2 : 0;
    
    track.segments.forEach((segment, index) => {
      const segmentLength = segment.length * SCALE;
      const angleRad = (segment.angle * Math.PI) / 180;
      const horizontalLength = segmentLength * Math.cos(angleRad);
      const verticalChange = segmentLength * Math.sin(angleRad);
      
      // Apply turn angle (matches TrackGeometry logic)
      if (track.laps > 1) {
        const turnAngle = (difficultyWeights[index] / totalWeight) * totalRotationNeeded;
        currentDirection += turnAngle;
      }
      
      // Move forward in current direction
      currentPos.x += Math.sin(currentDirection) * horizontalLength;
      currentPos.z += Math.cos(currentDirection) * horizontalLength;
      currentPos.y += verticalChange;
      
      positions.push([currentPos.x, currentPos.y, currentPos.z]);
    });
    
    // For circuit tracks, close the loop by adjusting positions
    if (track.laps > 1 && positions.length > 1) {
      // Calculate the gap between end and start
      const startPos = positions[0];
      const endPos = positions[positions.length - 1];
      const gapX = startPos[0] - endPos[0];
      const gapY = startPos[1] - endPos[1];
      const gapZ = startPos[2] - endPos[2];
      
      // Distribute the gap correction across all segments proportionally
      for (let i = 1; i < positions.length; i++) {
        const progress = i / (positions.length - 1);
        positions[i][0] += gapX * progress;
        positions[i][1] += gapY * progress;
        positions[i][2] += gapZ * progress;
      }
    }
    
    return positions;
  }, [track]);
  
  // Calculate segment times for each bot using backend-matching simulation
  const botSegmentTimes = useMemo(() => {
    const timesMap: Record<number, number[]> = {};
    
    results.forEach((result, participantIndex) => {
      if (result.segmentTimes && result.segmentTimes.length > 0) {
        // Use backend-provided segment times if available
        timesMap[result.nftId] = result.segmentTimes;
      } else if (result.stats) {
        // Calculate segment times using same logic as backend
        const segmentTimes: number[] = [];
        let previousDifficulty = 1.0;
        
        // Generate all segments (base segments × laps)
        for (let lap = 0; lap < track.laps; lap++) {
          for (let segIdx = 0; segIdx < track.segments.length; segIdx++) {
            const segment = track.segments[segIdx];
            const globalSegmentIdx = lap * track.segments.length + segIdx;
            
            // Use same seed calculation as backend: trackSeed + participantIndex * 1000 + segmentIdx
            const trackSeed = BigInt(track.trackId); // Using trackId as seed proxy
            const seed = trackSeed + BigInt(participantIndex * 1000 + globalSegmentIdx);
            
            // Calculate base segment time
            const baseSegmentTime = calculateSegmentTime(segment, seed, result.stats, previousDifficulty);
            
            // Per-segment performance variation (±6%)
            const segmentConditionSeed = Number((seed * 31337n + BigInt(participantIndex * 7919) + BigInt(lap * 12345)) % 1000n);
            const segmentPerformance = 0.94 + (segmentConditionSeed / 1666.67);
            
            const segmentTime = baseSegmentTime * segmentPerformance;
            segmentTimes.push(segmentTime);
            
            previousDifficulty = segment.difficulty;
          }
        }
        
        // Normalize to match final time (account for simulation differences)
        const calculatedTotal = segmentTimes.reduce((sum, t) => sum + t, 0);
        const scale = result.finalTime / calculatedTotal;
        timesMap[result.nftId] = segmentTimes.map(t => t * scale);
      } else {
        // Fallback: distribute time evenly weighted by difficulty
        const segmentTimes: number[] = [];
        const difficultyWeights = track.segments.map(seg => seg.difficulty);
        const totalWeight = difficultyWeights.reduce((sum, w) => sum + w, 0) * track.laps;
        
        track.segments.forEach(segment => {
          const segmentTime = (segment.difficulty / totalWeight) * result.finalTime;
          for (let lap = 0; lap < track.laps; lap++) {
            segmentTimes.push(segmentTime);
          }
        });
        
        timesMap[result.nftId] = segmentTimes;
      }
    });
    
    return timesMap;
  }, [results, track]);
  
  // Calculate bot positions for current time
  const botPositions = useMemo(() => {
    // Sort results by finalTime to get correct finish order
    const sortedResults = [...results].sort((a, b) => a.finalTime - b.finalTime);
    
    return sortedResults.map((result, finishPosition) => {
      const resultTimeMs = result.finalTime * 1000; // Convert seconds to ms
      // Calculate total race distance - must account for all laps
      const lapDistance = track.segments.reduce((sum, seg) => sum + seg.length, 0);
      // Always calculate from actual segment lengths, don't trust track.totalDistance
      const finishDistance = lapDistance * track.laps;
      
      if (currentTime >= resultTimeMs) {
        // Bot has finished - position at finish line with horizontal spread
        const finishPos = calculateBotPosition(track, finishDistance, trackPositions.map(p => ({ 
          x: p[0], y: p[1], z: p[2], 
          clone: () => ({ x: p[0], y: p[1], z: p[2] }),
        } as any)));
        
        const pos = finishPos.position;
        const rot = finishPos.rotation;
        
        // Offset each bot to the side based on finish position (1st place = index 0)
        // Center the spread: winner near center, others spread out
        const actualPosition = finishPosition + 1; // 1-indexed position
        const offsetAmount = (actualPosition - (sortedResults.length + 1) / 2) * 5;
        
        // Calculate perpendicular offset (to the right side)
        const angle = rot[1] + Math.PI / 2; // 90 degrees to the right
        const offsetX = Math.sin(angle) * offsetAmount;
        const offsetZ = Math.cos(angle) * offsetAmount;
        
        return {
          nftId: result.nftId,
          position: [pos[0] + offsetX, pos[1], pos[2] + offsetZ] as [number, number, number],
          rotation: rot,
          color: botColors[result.nftId] || '#888888',
          label: botLabels[result.nftId] || `Bot ${result.nftId}`,
          isHighlighted: result.nftId === followBotId,
          distance: finishDistance, // Track distance for sorting
        };
      }
      
      // Calculate distance traveled based on segment times
      const segmentTimes = botSegmentTimes[result.nftId];
      let cumulativeTime = 0;
      let cumulativeDistance = 0;
      let distance = 0;
      let foundSegment = false;
      
      for (let i = 0; i < segmentTimes.length; i++) {
        const segmentIdx = i % track.segments.length;
        const segment = track.segments[segmentIdx];
        const segmentTime = segmentTimes[i] * 1000; // Convert to ms
        
        if (currentTime <= cumulativeTime + segmentTime) {
          // Bot is in this segment
          const timeInSegment = currentTime - cumulativeTime;
          const progressInSegment = segmentTime > 0 ? timeInSegment / segmentTime : 1;
          distance = cumulativeDistance + (segment.length * progressInSegment);
          foundSegment = true;
          break;
        }
        
        cumulativeTime += segmentTime;
        cumulativeDistance += segment.length;
      }
      
      // If we've gone through all segments without finding one, use the last cumulative distance
      // This prevents the bot from jumping back to distance 0
      if (!foundSegment) {
        distance = cumulativeDistance; // Stay at the furthest point reached
      }
      
      // Clamp distance to finish distance with a small epsilon to prevent overshoot
      distance = Math.min(distance, finishDistance + 0.1);
      
      // Find position on track
      const botPos = calculateBotPosition(track, distance, trackPositions.map(p => ({ 
        x: p[0], y: p[1], z: p[2], 
        clone: () => ({ x: p[0], y: p[1], z: p[2] }),
      } as any)));
      
      return {
        nftId: result.nftId,
        position: botPos.position,
        rotation: botPos.rotation,
        color: botColors[result.nftId] || '#888888',
        label: botLabels[result.nftId] || `Bot ${result.nftId}`,
        isHighlighted: result.nftId === followBotId,
        distance: distance, // Track distance for sorting
      };
    });
  }, [currentTime, results, track, trackPositions, botColors, botLabels, followBotId, botSegmentTimes]);
  
  // Animation loop using requestAnimationFrame for smooth updates
  useEffect(() => {
    if (!isPlaying) return;
    
    let animationFrameId: number;
    let lastTime = performance.now();
    
    const animate = (currentAnimTime: number) => {
      const deltaTime = currentAnimTime - lastTime;
      lastTime = currentAnimTime;
      
      setCurrentTime(prev => {
        const next = prev + (deltaTime * playbackSpeed);
        if (next >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }
        return next;
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, playbackSpeed, totalDuration]);
  
  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);
  
  const handleNextBot = useCallback(() => {
    if (cameraMode !== 'follow') return;
    const currentIndex = results.findIndex(r => r.nftId === followBotId);
    const nextIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
    setFollowBotId(results[nextIndex].nftId);
  }, [cameraMode, followBotId, results]);
  
  const handleReset = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);
  
  const handleSeek = useCallback((values: number[]) => {
    setCurrentTime(values[0]);
  }, []);
  
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
  };
  
  const followTarget = useMemo(() => {
    if (cameraMode !== 'follow' || !followBotId) return undefined;
    const bot = botPositions.find(b => b.nftId === followBotId);
    return bot?.position;
  }, [cameraMode, followBotId, botPositions]);
  
  const followTargetRotation = useMemo(() => {
    if (cameraMode !== 'follow' || !followBotId) return undefined;
    const bot = botPositions.find(b => b.nftId === followBotId);
    return bot?.rotation;
  }, [cameraMode, followBotId, botPositions]);
  
  // Calculate zoom multiplier based on finished bots
  const cameraZoom = useMemo(() => {
    const finishedCount = results.filter(r => currentTime > r.finalTime * 1000).length;
    if (finishedCount === 0) return 1.0; // Normal zoom during race
    // Gradually zoom out as bots finish, max 2x zoom at end
    return 1.0 + (finishedCount / results.length) * 1.0;
  }, [currentTime, results]);
  
  return (
    <div className="space-y-4">
      {/* 3D Scene */}
      <div 
        className="relative cursor-pointer" 
        onClick={handleNextBot}
      >
        <Track3DScene 
          track={track} 
          bots={botPositions}
          cameraMode={cameraMode}
          cameraTarget={followTarget}
          cameraTargetRotation={followTargetRotation}
          cameraZoom={cameraZoom}
        />
        
        {/* Time overlay */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg font-mono">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </div>

        {/* Follow target name overlay - bottom left */}
        {cameraMode === 'follow' && followBotId && (
          <div className="absolute bottom-4 left-4 bg-black/80 text-white px-6 py-3 rounded-lg">
            <div className="text-4xl font-bold">
              {botLabels[followBotId] || `Bot ${followBotId}`}
            </div>
          </div>
        )}
        
        {/* Leaderboard overlay */}
        <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg space-y-1">
          <div className="font-semibold text-sm mb-2">Current Positions</div>
          {botPositions
            .sort((a, b) => b.distance - a.distance) // Sort by distance (furthest first)
            .map((bot, index) => (
              <div key={bot.nftId} className="flex items-center gap-2 text-xs">
                <span className="w-4">{index + 1}.</span>
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: bot.color }}
                />
                <span className="flex-1">{bot.label}</span>
              </div>
            ))}
        </div>
      </div>
      
      {/* Playback Controls */}
      <Card className="p-4 space-y-4">
        {/* Timeline Slider */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            min={0}
            max={totalDuration}
            step={10}
            onValueChange={handleSeek}
            className="w-full"
          />
        </div>
        
        {/* Control Buttons */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentTime(Math.max(0, currentTime - 1000))}
            >
              <Rewind className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={handlePlayPause}
              className="gap-2"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentTime(Math.min(totalDuration, currentTime + 1000))}
            >
              <FastForward className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Playback Speed */}
            <Select
              value={playbackSpeed.toString()}
              onValueChange={(v) => setPlaybackSpeed(Number(v))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.25">0.25x</SelectItem>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="4">4x</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Camera Mode */}
            <Select
              value={cameraMode}
              onValueChange={(v) => {
                setCameraMode(v as CameraMode);
                if (v !== 'follow') setFollowBotId(null);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orbit">Orbit</SelectItem>
                <SelectItem value="follow">Follow</SelectItem>
                <SelectItem value="cinematic">Cinematic</SelectItem>
                <SelectItem value="overview">Overview</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Follow Bot Selector with arrows */}
            {cameraMode === 'follow' && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const currentIndex = results.findIndex(r => r.nftId === followBotId);
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
                    setFollowBotId(results[prevIndex].nftId);
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="px-2 text-sm font-medium min-w-[80px] text-center">
                  {botLabels[followBotId!] || `Bot ${followBotId}`}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const currentIndex = results.findIndex(r => r.nftId === followBotId);
                    const nextIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
                    setFollowBotId(results[nextIndex].nftId);
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
