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
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface PurchaseDialogProps {
  botNumber: number;
  price: number;
  faction: string | null;
  rating: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function PurchaseDialog({
  botNumber,
  price,
  faction,
  rating,
  isOpen,
  onClose,
  onConfirm,
}: PurchaseDialogProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseState, setPurchaseState] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleConfirm = async () => {
    setIsPurchasing(true);
    setPurchaseState('idle');
    try {
      await onConfirm();
      setPurchaseState('success');
      setIsPurchasing(false);
    } catch (error) {
      setPurchaseState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Purchase failed');
      setIsPurchasing(false);
    }
  };

  const handleClose = () => {
    if (!isPurchasing) {
      onClose();
      setPurchaseState('idle');
      setErrorMessage('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {purchaseState === 'success' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Purchase Successful!
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center">
              <p className="text-lg mb-2">Bot #{botNumber} is now yours!</p>
              <p className="text-sm text-muted-foreground">
                Check your garage to manage your new bot.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : purchaseState === 'error' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Purchase Failed
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleConfirm} disabled={isPurchasing}>
                Try Again
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Purchase</DialogTitle>
              <DialogDescription>
                Review the details before purchasing this bot
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Bot Number</div>
                  <div className="font-mono font-bold">#{botNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Price</div>
                  <div className="font-bold text-lg">{price.toFixed(2)} ICP</div>
                </div>
                {faction && (
                  <div>
                    <div className="text-sm text-muted-foreground">Faction</div>
                    <div className="font-medium">{faction}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-muted-foreground">Rating</div>
                  <div className="font-medium">{rating.toFixed(1)}</div>
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This transaction is final and cannot be reversed. Make sure you have enough ICP in your wallet.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isPurchasing}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={isPurchasing}>
                {isPurchasing ? 'Processing...' : `Purchase for ${price.toFixed(2)} ICP`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
