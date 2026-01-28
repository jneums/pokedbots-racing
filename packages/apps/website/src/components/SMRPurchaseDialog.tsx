import { useState } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle2, Zap, Battery, AlertTriangle, Radiation, Atom } from 'lucide-react';
import { cn } from '../lib/utils';

// SMR tier definitions with wasteland-flavored names
export interface SMRTier {
  id: string;
  modelNumber: string;
  name: string;
  tagline: string;
  powerOutput: number; // in megawatts
  lifetimeGW: number; // estimated total gigawatt-hours before decommission (well-maintained)
  priceICP: number;
  features: string[];
  image: string;
  recommended?: boolean;
  isTopTier?: boolean;
}

export const SMR_TIERS: SMRTier[] = [
  {
    id: 'smr-basic',
    modelNumber: 'WR-250',
    name: 'Scrapyard Special',
    tagline: 'Entry-level wasteland power',
    powerOutput: 250,
    lifetimeGW: 50,
    priceICP: 5,
    image: '/sm_smr_hi.webp',
    features: [
      '+250 MW capacity',
      '~50 kWh lifetime (~42 charges)',
      '~15% savings vs paid recharges',
      'Manual cooling system',
      'Basic radiation shielding',
    ],
  },
  {
    id: 'smr-standard',
    modelNumber: 'WR-500',
    name: 'Rust Belt Reactor',
    tagline: 'Reliable power for serious garages',
    powerOutput: 500,
    lifetimeGW: 100,
    priceICP: 8,
    image: '/md_smr_hi.webp',
    features: [
      '+500 MW capacity',
      '~100 kWh lifetime (~83 charges)',
      '~30% savings vs paid recharges',
      'Auto-regulating coolant',
      'Enhanced containment',
    ],
    recommended: true,
  },
  {
    id: 'smr-advanced',
    modelNumber: 'WR-880',
    name: 'Deadzone Dynamo',
    tagline: 'Industrial-grade wasteland tech',
    powerOutput: 880,
    lifetimeGW: 175,
    priceICP: 12,
    image: '/lg_smr_hi.webp',
    features: [
      '+880 MW capacity',
      '~175 kWh lifetime (~146 charges)',
      '~44% savings vs paid recharges',
      'Triple-redundant cooling',
      'EMP-resistant circuitry',
    ],
  },
  {
    id: 'smr-premium',
    modelNumber: 'WR-1210',
    name: 'Flux Capacitor Elite',
    tagline: '1.21 GIGAWATTS!',
    powerOutput: 1210,
    lifetimeGW: 275,
    priceICP: 15,
    image: '/xl_smr_hi.webp',
    features: [
      '+1.21 GW capacity',
      '~275 kWh lifetime (~229 charges)',
      '~51% savings vs paid recharges',
      'Self-regulating fusion core',
      'Temporal stability field',
    ],
    isTopTier: true,
  },
];

interface SMRPurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (tier: SMRTier) => Promise<void>;
  currentCapacity: number;
}

export function SMRPurchaseDialog({
  isOpen,
  onClose,
  onPurchase,
  currentCapacity,
}: SMRPurchaseDialogProps) {
  const [selectedTier, setSelectedTier] = useState<SMRTier | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseState, setPurchaseState] = useState<'selecting' | 'confirming' | 'success' | 'error'>('selecting');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSelect = (tier: SMRTier) => {
    setSelectedTier(tier);
    setPurchaseState('confirming');
  };

  const handleConfirmPurchase = async () => {
    if (!selectedTier) return;
    
    setIsPurchasing(true);
    try {
      await onPurchase(selectedTier);
      setPurchaseState('success');
    } catch (error) {
      setPurchaseState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleClose = () => {
    if (!isPurchasing) {
      onClose();
      // Reset state after close animation
      setTimeout(() => {
        setSelectedTier(null);
        setPurchaseState('selecting');
        setErrorMessage('');
      }, 200);
    }
  };

  const handleBack = () => {
    setSelectedTier(null);
    setPurchaseState('selecting');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        {purchaseState === 'success' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <Radiation className="h-5 w-5 animate-pulse" />
                Reactor Online!
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center">
              <div className="mb-4">
                <img 
                  src={selectedTier?.image} 
                  alt="SMR Generator"
                  className="w-32 h-32 mx-auto object-contain opacity-90"
                />
              </div>
              <p className="text-lg mb-2 text-green-400">
                {selectedTier?.name} ({selectedTier?.modelNumber}) installed!
              </p>
              <p className="text-sm text-muted-foreground">
                Your garage now has +{selectedTier?.powerOutput} MW additional capacity.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                New total capacity: {currentCapacity + (selectedTier?.powerOutput || 0)} MW
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="bg-green-600 hover:bg-green-700">
                Return to Garage
              </Button>
            </DialogFooter>
          </>
        ) : purchaseState === 'error' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Installation Failed
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 text-center">
              <p className="text-muted-foreground mb-4">{errorMessage}</p>
              <p className="text-xs text-muted-foreground">
                The reactor core was not compatible. Please try again.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleBack}>
                Try Again
              </Button>
            </DialogFooter>
          </>
        ) : purchaseState === 'confirming' && selectedTier ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Atom className="h-5 w-5 text-amber-500" />
                Confirm Reactor Installation
              </DialogTitle>
              <DialogDescription>
                Review your selected SMR before installation
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="flex flex-col items-center gap-4">
                <img 
                  src={selectedTier.image} 
                  alt={selectedTier.name}
                  className={cn(
                    "w-40 h-40 object-contain",
                    selectedTier.isTopTier && "animate-pulse drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                  )}
                />
                <div className="text-center">
                  <h3 className={cn(
                    "text-2xl font-bold",
                    selectedTier.isTopTier ? "text-amber-400" : "text-foreground"
                  )}>
                    {selectedTier.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono">
                    Model: {selectedTier.modelNumber}
                  </p>
                  <p className={cn(
                    "text-lg font-bold mt-2",
                    selectedTier.isTopTier ? "text-amber-300" : "text-green-500"
                  )}>
                    +{selectedTier.powerOutput >= 1000 
                      ? `${(selectedTier.powerOutput / 1000).toFixed(2)} GW` 
                      : `${selectedTier.powerOutput} MW`}
                  </p>
                </div>
                
                <div className="w-full max-w-sm space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Current Capacity</span>
                    <span>{currentCapacity} MW</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border text-green-500">
                    <span>+ SMR Output</span>
                    <span>+{selectedTier.powerOutput} MW</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold">
                    <span>New Total Capacity</span>
                    <span className={selectedTier.isTopTier ? "text-amber-400" : ""}>
                      {currentCapacity + selectedTier.powerOutput} MW
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleBack} disabled={isPurchasing}>
                Back
              </Button>
              <Button 
                onClick={handleConfirmPurchase} 
                disabled={isPurchasing}
                className={cn(
                  selectedTier.isTopTier 
                    ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400" 
                    : ""
                )}
              >
                {isPurchasing ? (
                  <>
                    <Atom className="h-4 w-4 mr-2 animate-spin" />
                    Installing...
                  </>
                ) : (
                  <>Install for {selectedTier.priceICP} ICP</>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Radiation className="h-5 w-5 text-amber-500" />
                Wasteland SMR Marketplace
              </DialogTitle>
              <DialogDescription>
                Small Modular Reactors to supplement your garage's power grid. 
                Current capacity: {currentCapacity} MW (100 MW per charging bot)
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
              {SMR_TIERS.map((tier) => (
                <Card 
                  key={tier.id}
                  className={cn(
                    "relative cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                    tier.isTopTier 
                      ? "border-amber-500/50 bg-gradient-to-b from-amber-950/30 to-background hover:border-amber-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                      : tier.recommended 
                        ? "border-green-500/50 bg-gradient-to-b from-green-950/20 to-background hover:border-green-400"
                        : "border-border hover:border-primary/50"
                  )}
                  onClick={() => handleSelect(tier)}
                >
                  {tier.recommended && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-600 text-white">
                      RECOMMENDED
                    </Badge>
                  )}
                  {tier.isTopTier && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-600 to-amber-400 text-black font-bold">
                      ⚡ LEGENDARY
                    </Badge>
                  )}
                  
                  <CardHeader className="pb-2 pt-4">
                    <div className="flex justify-center mb-2">
                      <img 
                        src={tier.image} 
                        alt={tier.name}
                        className={cn(
                          "w-24 h-24 object-contain",
                          tier.isTopTier && "drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                        )}
                      />
                    </div>
                    <CardTitle className="text-center">
                      <span className={cn(
                        "block text-lg",
                        tier.isTopTier ? "text-amber-400" : ""
                      )}>
                        {tier.name}
                      </span>
                      <span className="block text-xs font-mono text-muted-foreground mt-1">
                        {tier.modelNumber}
                      </span>
                    </CardTitle>
                    <p className={cn(
                      "text-xs text-center",
                      tier.isTopTier ? "text-amber-300/80" : "text-muted-foreground"
                    )}>
                      {tier.tagline}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Power Output */}
                    <div className={cn(
                      "text-center py-2 rounded-lg",
                      tier.isTopTier 
                        ? "bg-amber-500/20 border border-amber-500/30" 
                        : "bg-primary/10 border border-primary/20"
                    )}>
                      <div className="flex items-center justify-center gap-1">
                        <Zap className={cn(
                          "h-4 w-4",
                          tier.isTopTier ? "text-amber-400" : "text-green-500"
                        )} />
                        <span className={cn(
                          "font-bold text-lg",
                          tier.isTopTier ? "text-amber-400" : "text-green-500"
                        )}>
                          +{tier.powerOutput >= 1000 
                            ? `${(tier.powerOutput / 1000).toFixed(2)} GW` 
                            : `${tier.powerOutput} MW`}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ({Math.floor(tier.powerOutput / 100)} bots at full speed)
                      </span>
                    </div>
                    
                    {/* Features */}
                    <ul className="space-y-1.5 text-xs">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Battery className={cn(
                            "h-3 w-3 mt-0.5 flex-shrink-0",
                            tier.isTopTier ? "text-amber-500" : "text-green-500"
                          )} />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* Price */}
                    <Button 
                      className={cn(
                        "w-full mt-4",
                        tier.isTopTier 
                          ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold"
                          : tier.recommended
                            ? "bg-green-600 hover:bg-green-500"
                            : ""
                      )}
                      variant={tier.isTopTier || tier.recommended ? "default" : "outline"}
                    >
                      {tier.priceICP} ICP
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <DialogFooter>
              <p className="text-xs text-muted-foreground text-center w-full">
                SMRs require maintenance like bots. Lifespan depends on upkeep — neglected reactors degrade faster. Each bot uses 100 MW when charging.
              </p>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
