# 3D Track Visualization with Three.js

## Overview
Add an immersive 3D track visualization using Three.js to display race tracks in real-time, showing terrain, elevation changes, and bot positions during races.

## Goals
1. Visualize track segments in 3D space with accurate terrain representation
2. Show bot positions and movement during race playback
3. Display elevation changes (uphill/downhill segments)
4. Differentiate terrain types visually (ScrapHeaps, WastelandSand, MetalRoads)
5. Provide camera controls for viewing from different angles
6. Performance: 60fps on modern devices

## Technical Architecture

### Data Sources
- **Track Data**: Use existing `TrackTemplate` from `RacingSimulator.mo`
  - Segments with length, angle, terrain, difficulty
  - 5 track templates: Scrap Mountain Circuit, Highway of the Dead, Wasteland Gauntlet, Junkyard Sprint, Metal Mesa Loop
- **Race Data**: Real-time or historical race results with segment times
- **Bot Data**: Participant stats, colors, faction info

### Component Structure
```
packages/apps/website/src/components/
├── Track3D/
│   ├── Track3DViewer.tsx          # Main component wrapper
│   ├── Track3DScene.tsx           # Three.js scene setup
│   ├── TrackGeometry.ts           # Generate track mesh from segments
│   ├── BotRenderer.tsx            # Bot 3D models/sprites
│   ├── CameraController.ts        # Camera orbit/follow controls
│   ├── TerrainMaterials.ts        # Materials for each terrain type
│   └── types.ts                   # TypeScript types
```

## Implementation Phases

### Phase 1: Basic 3D Scene Setup
**Goal**: Get a working Three.js scene rendering in React

**Tasks**:
1. Install dependencies:
   ```bash
   pnpm add three @types/three @react-three/fiber @react-three/drei
   ```

2. Create `Track3DViewer.tsx`:
   - Canvas component from `@react-three/fiber`
   - Basic lighting (ambient + directional)
   - Camera setup with orbit controls
   - Placeholder ground plane

3. Integration point:
   - Add to race details page below/beside RaceVisualizer
   - Toggle between 2D (current) and 3D view
   - Responsive sizing (full width or modal)

**Success Criteria**:
- Empty 3D scene renders without errors
- Can rotate camera with mouse/touch
- Lighting looks reasonable

### Phase 2: Track Geometry Generation
**Goal**: Convert track segments into 3D geometry

**Tasks**:
1. Create `TrackGeometry.ts`:
   - Input: `TrackTemplate` segments array
   - Output: Three.js mesh with proper vertices/faces
   
2. Track generation algorithm:
   ```typescript
   // For each segment:
   // 1. Calculate start/end positions in 3D space
   // 2. Apply angle (elevation change)
   // 3. Create track width (10-15 units)
   // 4. Generate curved transitions between segments
   // 5. Apply terrain-specific geometry (rough for ScrapHeaps, smooth for MetalRoads)
   ```

3. Coordinate system:
   - X-axis: Track width
   - Y-axis: Elevation (controlled by segment.angle)
   - Z-axis: Forward progress along track
   - Scale: 1 unit = 10 meters (for reasonable viewport)

4. Track features:
   - Width: 12 units (120m realistic for wasteland racing)
   - Elevation scaling: segment.angle degrees → Y position change
   - Bezier curves for smooth transitions between angles
   - Banking on turns (optional: calculate from difficulty)

**Success Criteria**:
- All 5 tracks render with correct total length
- Elevation changes match segment angles
- Smooth transitions between segments
- Track loops properly for circuit races

### Phase 3: Terrain Materials & Styling
**Goal**: Make each terrain type visually distinct

**Tasks**:
1. Create `TerrainMaterials.ts`:
   - ScrapHeaps: Rough, metallic, rust colors (#8B4513, #A0522D)
   - WastelandSand: Sandy texture, beige/tan (#D2B48C, #F4A460)
   - MetalRoads: Smooth, dark grey with worn lines (#404040, #606060)

2. Material properties:
   - Use `MeshStandardMaterial` for PBR
   - Roughness maps for texture variation
   - Normal maps for surface detail (optional)
   - Emissive for track markers/lines

3. Environmental details:
   - Skybox: Wasteland-themed gradient (orange/brown)
   - Fog: Distance fog matching terrain color
   - Ground plane: Extends beyond track edges
   - Ambient occlusion for depth

**Success Criteria**:
- Each terrain type immediately recognizable
- Performance stays above 45fps with materials
- Visually cohesive wasteland aesthetic

### Phase 4: Bot Rendering
**Goal**: Show bots racing on the track

**Tasks**:
1. Create `BotRenderer.tsx`:
   - Simple geometry: Box or low-poly robot shape
   - Color: Use bot's background color from stats
   - Position: Calculate from segment times + interpolation
   - Scale: 2-3 units (bots visible but not oversized)

2. Bot positioning algorithm:
   ```typescript
   // Input: currentTime, segmentTimes[], segments[]
   // 1. Find which segment bot is currently on
   // 2. Calculate progress within that segment
   // 3. Get 3D position from track geometry
   // 4. Apply orientation (face forward along track)
   // 5. Add subtle hover/bounce animation
   ```

3. Bot features:
   - Nameplate above bot (HTML overlay or sprite)
   - Faction badge/icon
   - Speed trail effect (particle system or mesh trail)
   - Position number indicator

4. Multiple bots:
   - Render all participants simultaneously
   - Collision avoidance (slight X-offset if close)
   - Highlight selected bot (glow effect)

**Success Criteria**:
- Bots move smoothly along track path
- Easy to distinguish between multiple bots
- Performance: 60fps with 4+ bots racing
- Bot speed visually matches race times

### Phase 5: Camera System
**Goal**: Provide intuitive camera controls

**Tasks**:
1. Create `CameraController.ts`:
   - Orbit mode: Free rotation around track center
   - Follow mode: Camera tracks selected bot (chase cam)
   - Cinematic mode: Automated camera movement (sweeping shots)
   - Track overview: Bird's eye view of entire track

2. Camera transitions:
   - Smooth lerp between modes (1-2 second transition)
   - Collision detection: Don't clip through track
   - Auto-rotation option for showcase mode

3. UI controls:
   - Button/dropdown to switch modes
   - Mouse/touch for orbit controls
   - Scroll to zoom
   - Keyboard shortcuts (arrow keys, 1-4 for presets)

**Success Criteria**:
- All camera modes work smoothly
- No disorienting jumps or clipping
- Touch controls work on mobile/tablet

### Phase 6: Animation & Playback
**Goal**: Race replay with time controls

**Tasks**:
1. Playback controls:
   - Play/pause
   - Playback speed (0.5x, 1x, 2x, 4x)
   - Scrub timeline (jump to any time)
   - Loop option

2. Race simulation:
   - Use segment times from race results
   - Interpolate bot positions between segments
   - Sync with audio events (optional: engine sounds, announcements)

3. Visual effects:
   - Dust trails in WastelandSand segments
   - Sparks on MetalRoads
   - Debris movement in ScrapHeaps
   - Speed lines/motion blur at high speeds

4. HUD overlay (HTML layer):
   - Current race time
   - Position indicator
   - Speed/stats of selected bot
   - Mini-map of track (optional)

**Success Criteria**:
- Race playback feels smooth and accurate
- Controls are intuitive and responsive
- Visual effects enhance without distracting

### Phase 7: Optimization & Polish
**Goal**: Production-ready performance and UX

**Tasks**:
1. Performance optimization:
   - Level of detail (LOD): Reduce geometry at distance
   - Frustum culling: Don't render off-screen objects
   - Instance rendering for repeated elements
   - Lazy loading: Load 3D assets on demand

2. Progressive enhancement:
   - Detect WebGL support, fallback to 2D view
   - Mobile optimization: Reduced particles/effects
   - Performance mode toggle (low/medium/high quality)

3. Accessibility:
   - Keyboard navigation
   - Screen reader support for race data
   - Reduced motion option (disable animations)

4. Polish:
   - Loading states with progress indicators
   - Error boundaries for Three.js failures
   - Screenshot/video capture (optional)
   - Share race replay feature

**Success Criteria**:
- 60fps on desktop, 30fps on mobile
- Graceful degradation on older devices
- No console errors or warnings
- Positive user feedback on UX

## Data Flow

```
Race Results (Backend)
  ↓
Track3DViewer Component
  ↓ (passes track + times)
Track3DScene
  ├→ TrackGeometry (generates mesh)
  ├→ BotRenderer (positions bots)
  ├→ CameraController (handles view)
  └→ TerrainMaterials (applies styling)
```

## File Structure

```typescript
// Track3DViewer.tsx - Main component
interface Track3DViewerProps {
  raceId: number;
  trackId: number;
  results: RaceResult[];
  autoPlay?: boolean;
  cameraMode?: 'orbit' | 'follow' | 'cinematic';
}

// TrackGeometry.ts - Generate track mesh
export function generateTrackMesh(
  segments: TrackSegment[], 
  laps: number, 
  terrain: Terrain
): THREE.Mesh;

// BotRenderer.tsx - Bot component
interface BotProps {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  faction: string;
  label: string;
  isHighlighted: boolean;
}

// CameraController.ts
export function useCameraController(
  mode: CameraMode,
  target: THREE.Vector3,
  bounds: THREE.Box3
): void;
```

## Integration Points

1. **Race Details Page** (`/race/[id]`):
   - Tab switcher: "2D View" | "3D View"
   - 3D view shows below race information
   - Shared playback controls

2. **Track Browser** (new page):
   - Grid of all 5 tracks with 3D previews
   - Click to expand full 3D viewer
   - Show track stats (distance, segments, terrain mix)

3. **Bot Details Page** (`/bot/[id]`):
   - Show 3D preview of bot's recent races
   - "View Race in 3D" button for each result

## Future Enhancements
- Weather effects (sandstorms, rain on metal roads)
- Damage visualization (smoke, sparks when condition low)
- Spectator mode for live races
- VR support with WebXR
- Track editor for creating custom tracks
- Multiplayer ghost racing (compare two bots side-by-side)

## Dependencies

```json
{
  "three": "^0.160.0",
  "@types/three": "^0.160.0",
  "@react-three/fiber": "^8.15.0",
  "@react-three/drei": "^9.92.0",
  "@react-three/postprocessing": "^2.16.0" // Optional: for effects
}
```

## Estimated Timeline
- Phase 1 (Setup): 2-4 hours
- Phase 2 (Geometry): 8-12 hours
- Phase 3 (Materials): 4-6 hours
- Phase 4 (Bots): 6-8 hours
- Phase 5 (Camera): 4-6 hours
- Phase 6 (Animation): 6-10 hours
- Phase 7 (Polish): 8-12 hours

**Total**: 38-58 hours (~1-1.5 weeks full-time)

## Success Metrics
- User engagement: Time spent viewing 3D races vs 2D
- Performance: Maintain 60fps on 80%+ of devices
- Feedback: Positive sentiment in user testing
- Adoption: 50%+ of race views use 3D mode
- Technical: Zero critical bugs in production

## Open Questions
1. Should we support mobile 3D view or desktop-only initially?
2. Preference for realistic vs stylized art direction?
3. Budget for custom 3D models vs procedural geometry?
4. Server-side rendering of 3D thumbnails for social sharing?
5. Integrate with existing RaceVisualizer or replace it?
