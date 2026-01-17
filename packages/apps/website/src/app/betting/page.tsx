'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Link } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { Button } from '../../components/ui/button';

export default function BettingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link to="/schedule">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Schedule
          </Button>
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-muted">
                <Construction className="h-12 w-12 text-muted-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">Betting Temporarily Disabled</CardTitle>
            <CardDescription className="text-base mt-2">
              The betting system is currently under review. We're working on improvements 
              and will bring it back soon with an even better experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              In the meantime, you can still enter your bots in races and compete for 
              prize pools directly!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/schedule">
                <Button className="w-full sm:w-auto">View Races</Button>
              </Link>
              <Link to="/garage">
                <Button variant="outline" className="w-full sm:w-auto">My Garage</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
