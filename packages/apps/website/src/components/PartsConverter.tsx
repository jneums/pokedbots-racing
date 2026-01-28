import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { ArrowRight, RefreshCw, Combine } from 'lucide-react';
import { convertParts, combinePartsToUniversal } from '@pokedbots-racing/ic-js';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

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
];

export function PartsConverter({ inventory, identityOrAgent, onConversionComplete }: PartsConverterProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('convert');
  const [fromType, setFromType] = useState<string>('');
  const [toType, setToType] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [combineAmount, setCombineAmount] = useState<string>('');
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

  // For converting between specialized parts (25% cost)
  const convertedAmount = amount ? Math.floor(Number(amount) * 0.75) : 0;
  const conversionCost = amount ? Number(amount) - convertedAmount : 0;
  const availableAmount = fromType ? getPartCount(fromType) : 0;

  // For combining to Universal - max is the minimum of all 4 part types
  const maxCombineAmount = inventory ? Math.min(
    Number(inventory.speedChips),
    Number(inventory.powerCoreFragments),
    Number(inventory.thrusterKits),
    Number(inventory.gyroModules)
  ) : 0;

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

  const handleCombine = async () => {
    if (!combineAmount || Number(combineAmount) <= 0) {
      toast.error('Please enter an amount');
      return;
    }

    if (Number(combineAmount) > maxCombineAmount) {
      toast.error('Insufficient parts (need equal amounts of all 4 types)');
      return;
    }

    setIsConverting(true);
    try {
      const result = await combinePartsToUniversal(Number(combineAmount), identityOrAgent);
      toast.success(result);
      setCombineAmount('');
      setOpen(false);
      if (onConversionComplete) {
        onConversionComplete();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to combine parts');
    } finally {
      setIsConverting(false);
    }
  };

  const fromTypeInfo = PART_TYPES.find(p => p.value === fromType);
  const toTypeInfo = PART_TYPES.find(p => p.value === toType);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Convert Parts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Convert Parts</DialogTitle>
          <DialogDescription>
            Convert between specialized types (25% cost) or to Universal (4:1 ratio)
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="convert">Convert</TabsTrigger>
            <TabsTrigger value="combine">Combine → UNI</TabsTrigger>
          </TabsList>
          
          {/* Convert Tab - Specialized to Specialized */}
          <TabsContent value="convert" className="space-y-4 pt-2">
            <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
              {/* From Type */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <Select value={fromType} onValueChange={setFromType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PART_TYPES.map(part => (
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
          </TabsContent>

          {/* Combine Tab - All 4 parts to Universal */}
          <TabsContent value="combine" className="space-y-4 pt-2">
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
              <p className="font-medium mb-1">Combine 1 of each part type to create Universal Parts:</p>
              <p>1 SPD + 1 PWR + 1 ACC + 1 STB = 1 Universal</p>
            </div>

            {/* Current Parts Display */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-muted-foreground">SPD</div>
                <div className="font-bold">{getPartCount('SpeedChip')}</div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-muted-foreground">PWR</div>
                <div className="font-bold">{getPartCount('PowerCoreFragment')}</div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-muted-foreground">ACC</div>
                <div className="font-bold">{getPartCount('ThrusterKit')}</div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-muted-foreground">STB</div>
                <div className="font-bold">{getPartCount('GyroModule')}</div>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Amount to combine (Max: {maxCombineAmount})
              </label>
              <Input
                type="number"
                min="1"
                max={maxCombineAmount}
                value={combineAmount}
                onChange={(e) => setCombineAmount(e.target.value)}
                placeholder="Enter amount"
                className="h-9"
              />
            </div>

            {/* Combine Preview */}
            {combineAmount && Number(combineAmount) > 0 && (
              <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Will use:</span>
                  <span className="font-semibold">{combineAmount} of each (SPD, PWR, ACC, STB)</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-muted-foreground">You will receive:</span>
                  <span className="font-semibold text-green-500">{combineAmount} Universal Parts</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleCombine} 
              disabled={!combineAmount || Number(combineAmount) <= 0 || isConverting || Number(combineAmount) > maxCombineAmount}
              className="w-full h-9"
              size="sm"
            >
              {isConverting ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Combining...
                </>
              ) : (
                <>
                  <Combine className="h-3 w-3 mr-2" />
                  Combine Parts
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
