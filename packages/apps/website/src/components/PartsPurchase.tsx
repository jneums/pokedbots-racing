import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { ShoppingCart, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { usePurchaseParts } from '../hooks/useGarage';

interface PartsPurchaseProps {
  onPurchaseComplete?: () => void;
}

// Cost: 1 ICP = 500 Universal Parts
const PARTS_PER_ICP = 500;

export function PartsPurchase({ onPurchaseComplete }: PartsPurchaseProps) {
  const [open, setOpen] = useState(false);
  const [icpAmount, setIcpAmount] = useState<number>(1);
  const purchaseMutation = usePurchaseParts();

  const partsToReceive = icpAmount * PARTS_PER_ICP;

  const handlePurchase = async () => {
    if (icpAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const result = await purchaseMutation.mutateAsync(partsToReceive);
      toast.success(result.message);
      setOpen(false);
      setIcpAmount(1);
      if (onPurchaseComplete) {
        onPurchaseComplete();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to purchase parts');
    }
  };

  const incrementAmount = () => setIcpAmount(prev => Math.min(prev + 1, 100));
  const decrementAmount = () => setIcpAmount(prev => Math.max(prev - 1, 1));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            disabled={purchaseMutation.isPending || icpAmount <= 0}
            className="gap-2"
          >
            {purchaseMutation.isPending ? (
              'Purchasing...'
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
