import { useState, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { ShoppingCart, Minus, Plus, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { usePurchaseParts } from '../hooks/useGarage';

interface PartsPurchaseProps {
  onPurchaseComplete?: () => void;
}

// Cost: 1 ICP = 500 Universal Parts
const PARTS_PER_ICP = 500;

// Cooldown period in milliseconds (60 seconds) to prevent double purchases
const PURCHASE_COOLDOWN_MS = 60 * 1000;
const LAST_PURCHASE_KEY = 'lastPartsPurchaseTime';

export function PartsPurchase({ onPurchaseComplete }: PartsPurchaseProps) {
  const [open, setOpen] = useState(false);
  const [icpAmount, setIcpAmount] = useState<number>(1);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const purchaseMutation = usePurchaseParts();

  const partsToReceive = icpAmount * PARTS_PER_ICP;

  // Update cooldown timer every second when dialog is open
  useEffect(() => {
    if (!open) return;

    const updateCooldown = () => {
      const lastPurchase = localStorage.getItem(LAST_PURCHASE_KEY);
      if (lastPurchase) {
        const timeSinceLastPurchase = Date.now() - parseInt(lastPurchase, 10);
        const remaining = PURCHASE_COOLDOWN_MS - timeSinceLastPurchase;
        setCooldownSeconds(remaining > 0 ? Math.ceil(remaining / 1000) : 0);
      } else {
        setCooldownSeconds(0);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [open]);

  // Check if we're within the cooldown period from a recent purchase
  const isWithinCooldown = useCallback(() => {
    return cooldownSeconds > 0;
  }, [cooldownSeconds]);

  const handlePurchase = async () => {
    if (icpAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Check cooldown to prevent double purchases
    if (isWithinCooldown()) {
      toast.error(`Please wait ${cooldownSeconds} seconds before making another purchase`);
      return;
    }

    try {
      // Record purchase time BEFORE the call to prevent race conditions
      localStorage.setItem(LAST_PURCHASE_KEY, Date.now().toString());
      
      const result = await purchaseMutation.mutateAsync(partsToReceive);
      toast.success(result.message);
      setOpen(false);
      setIcpAmount(1);
      if (onPurchaseComplete) {
        onPurchaseComplete();
      }
    } catch (error) {
      // Clear the cooldown if the purchase failed so user can retry immediately
      localStorage.removeItem(LAST_PURCHASE_KEY);
      toast.error(error instanceof Error ? error.message : 'Failed to purchase parts');
    }
  };

  // Prevent closing dialog while mutation is pending
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && purchaseMutation.isPending) {
      toast.warning('Please wait for the purchase to complete');
      return;
    }
    setOpen(newOpen);
  };

  const incrementAmount = () => setIcpAmount(prev => Math.min(prev + 1, 100));
  const decrementAmount = () => setIcpAmount(prev => Math.max(prev - 1, 1));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 h-7 text-xs gap-1.5 border-primary/30 hover:bg-primary/10"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Buy Parts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Buy Universal Parts
          </DialogTitle>
          <DialogDescription>
            Purchase Universal Parts with ICP. Rate: <span className="font-bold text-primary">500 parts per 1 ICP</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* ICP Amount selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount to spend (ICP)</label>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                className="h-10 w-10"
                onClick={decrementAmount}
                disabled={icpAmount <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={1}
                max={100}
                value={icpAmount}
                onChange={(e) => setIcpAmount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="text-center text-lg font-bold"
              />
              <Button 
                variant="outline" 
                size="icon"
                className="h-10 w-10"
                onClick={incrementAmount}
                disabled={icpAmount >= 100}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">You pay:</span>
              <span className="font-bold">{icpAmount} ICP</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">You receive:</span>
              <span className="font-bold text-primary">{partsToReceive.toLocaleString()} Universal Parts</span>
            </div>
          </div>

          {/* Quick select buttons */}
          <div className="flex gap-2">
            {[1, 5, 10, 20].map((amt) => (
              <Button
                key={amt}
                variant={icpAmount === amt ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setIcpAmount(amt)}
              >
                {amt} ICP
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handlePurchase}
            disabled={purchaseMutation.isPending || icpAmount <= 0 || cooldownSeconds > 0}
            className="gap-2"
          >
            {purchaseMutation.isPending ? (
              'Purchasing...'
            ) : cooldownSeconds > 0 ? (
              <>
                <Clock className="h-4 w-4 animate-pulse" />
                Wait {cooldownSeconds}s
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Buy {partsToReceive.toLocaleString()} Parts
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
