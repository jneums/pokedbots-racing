import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Track3DViewer } from '@/components/Track3D';
import { getTrackTemplate } from '@/components/Track3D/trackData';

export default function Track3DTestPage() {
  console.log('Track3DTestPage rendering');
  const track1 = getTrackTemplate(1);
  console.log('Track 1:', track1);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">3D Track Viewer Test</h1>
        <p className="text-muted-foreground">Testing all 5 race tracks in 3D</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Track 1 loaded: {track1 ? 'Yes' : 'No'}</p>
          <p>Track 1 name: {track1?.name || 'N/A'}</p>
        </CardContent>
      </Card>

      {/* Track 1 */}
      {track1 && <Track3DViewer track={track1} />}

      <Card>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
          <CardDescription>How to navigate the 3D tracks</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>Left Mouse / Touch Drag:</strong> Rotate camera around track</li>
            <li><strong>Right Mouse / Two-finger Touch:</strong> Pan camera</li>
            <li><strong>Mouse Wheel / Pinch:</strong> Zoom in/out</li>
            <li><strong>Auto-rotate:</strong> Camera smoothly moves around the track</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
