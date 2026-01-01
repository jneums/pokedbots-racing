import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { convertParts } from '@pokedbots-racing/ic-js';
import { toast } from 'sonner';

interface PartsConverterProps {
  inventory?: {
    speedChips: bigint;
    powerCoreFragments: bigint;
    thrusterKits: bigint;
    gyroModules: bigint;
    universalParts: bigint;
  };
  identityOrAgent: any;
  onConversionComplete?: () => void;
}

const PART_TYPES = [
  { value: 'SpeedChip', label: 'Speed Chips', short: 'SPD' },
  { value: 'PowerCoreFragment', label: 'Power Core Fragments', short: 'PWR' },
  { value: 'ThrusterKit', label: 'Thruster Kits', short: 'ACC' },
  { value: 'GyroModule', label: 'Gyro Modules', short: 'STB' },
  { value: 'UniversalPart', label: 'Universal Parts', short: 'UNI' },
];

export function PartsConverter({ inventory, identityOrAgent, onConversionComplete }: PartsConverterProps) {
  const [open, setOpen] = useState(false);
  const [fromType, setFromType] = useState<string>('');
  const [toType, setToType] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);

  const getPartCount = (partType: string): number => {
    if (!inventory) return 0;
    switch (partType) {
      case 'SpeedChip': return Number(inventory.speedChips);
      case 'PowerCoreFragment': return Number(inventory.powerCoreFragments);
      case 'ThrusterKit': return Number(inventory.thrusterKits);
      case 'GyroModule': return Number(inventory.gyroModules);
      case 'UniversalPart': return Number(inventory.universalParts);
      default: return 0;
    }
  };

  const convertedAmount = amount ? Math.floor(Number(amount) * 0.75) : 0;
  const conversionCost = amount ? Number(amount) - convertedAmount : 0;
  const availableAmount = fromType ? getPartCount(fromType) : 0;

  const handleConvert = async () => {
    if (!fromType || !toType || !amount || Number(amount) <= 0) {
      toast.error('Please fill in all fields');
      return;
    }

    if (fromType === toType) {
      toast.error('Cannot convert to the same part type');
      return;
    }

    if (Number(amount) > availableAmount) {
      toast.error(`Insufficient ${PART_TYPES.find(p => p.value === fromType)?.label}`);
      return;
    }

    setIsConverting(true);
    try {
      const result = await convertParts(fromType, toType, Number(amount), identityOrAgent);
      toast.success(result);
      setAmount('');
      setFromType('');
      setToType('');
      setOpen(false);
      if (onConversionComplete) {
        onConversionComplete();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to convert parts');
    } finally {
      setIsConverting(false);
    }
  };

  const fromTypeInfo = PART_TYPES.find(p => p.value === fromType);
  const toTypeInfo = PART_TYPES.find(p => p.value === toType);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Convert Parts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Convert Parts</DialogTitle>
          <DialogDescription>
            Convert parts between types with a 25% conversion cost
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
          {/* From Type */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Select value={fromType} onValueChange={setFromType}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PART_TYPES.filter(p => p.value !== 'UniversalPart').map(part => (
                  <SelectItem key={part.value} value={part.value}>
                    {part.short} ({getPartCount(part.value)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Arrow */}
          <div className="pb-1">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* To Type */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Select value={toType} onValueChange={setToType}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {PART_TYPES.map(part => (
                  <SelectItem 
                    key={part.value} 
                    value={part.value}
                    disabled={part.value === fromType}
                  >
                    {part.short}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Amount {fromType && `(Available: ${availableAmount})`}
          </label>
          <Input
            type="number"
            min="1"
            max={availableAmount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="h-9"
          />
        </div>

        {/* Conversion Preview */}
        {amount && Number(amount) > 0 && fromType && toType && (
          <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Converting:</span>
              <span className="font-semibold">{amount} {fromTypeInfo?.short}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conversion cost (25%):</span>
              <span className="text-red-500">-{conversionCost}</span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span className="text-muted-foreground">You will receive:</span>
              <span className="font-semibold text-green-500">{convertedAmount} {toTypeInfo?.short}</span>
            </div>
          </div>
        )}

        <Button 
          onClick={handleConvert} 
          disabled={!fromType || !toType || !amount || Number(amount) <= 0 || isConverting || Number(amount) > availableAmount}
          className="w-full h-9"
          size="sm"
        >
          {isConverting ? (
            <>
              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
              Converting...
            </>
          ) : (
            'Convert Parts'
          )}
        </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
