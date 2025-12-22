import React, { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Track3DScene } from './Track3DScene';
import { TrackTemplate } from './types';

interface Track3DViewerProps {
  track: TrackTemplate;
  className?: string;
}

export function Track3DViewer({ track, className }: Track3DViewerProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{track.name}</CardTitle>
        <CardDescription>
          {track.description} • {(track.totalDistance / 1000).toFixed(1)}km • {track.laps} lap{track.laps > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={
          <div className="w-full h-[600px] flex items-center justify-center bg-muted rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading 3D track...</p>
            </div>
          </div>
        }>
          <Track3DScene track={track} />
        </Suspense>
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Distance:</span>{' '}
            <span className="font-medium">{(track.totalDistance / 1000).toFixed(1)}km</span>
          </div>
          <div>
            <span className="text-muted-foreground">Segments:</span>{' '}
            <span className="font-medium">{track.segments.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Terrain:</span>{' '}
            <span className="font-medium">{track.primaryTerrain}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
