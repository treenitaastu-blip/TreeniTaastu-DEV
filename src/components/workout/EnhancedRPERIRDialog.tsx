import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Star, Target, Brain, TrendingUp } from "lucide-react";

interface EnhancedRPERIRDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rpe: number, rir: number) => void;
  exerciseName: string;
  setNumber: number;
  currentWeight?: number;
  previousRPE?: number;
}

const RPE_DESCRIPTIONS = [
  { value: 1, label: "Väga kerge", desc: "Soojendustempo" },
  { value: 2, label: "Kerge", desc: "Mugav tempo" },
  { value: 3, label: "Mõõdukas", desc: "Vestlustempo" },
  { value: 4, label: "Mõnevõrra raske", desc: "Hingeldamine algab" },
  { value: 5, label: "Raske", desc: "Selge pingutus" },
  { value: 6, label: "Väga raske", desc: "3-4 kordust varuks" },
  { value: 7, label: "Kõrge intensiivsus", desc: "2-3 kordust varuks" },
  { value: 8, label: "Maksimaalne pingutus", desc: "1-2 kordust varuks" },
  { value: 9, label: "Peaaegu piir", desc: "1 kordus varuks" },
  { value: 10, label: "Täielik piir", desc: "Rohkem ei saa" },
];

export default function EnhancedRPERIRDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  exerciseName, 
  setNumber,
  currentWeight,
  previousRPE
}: EnhancedRPERIRDialogProps) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [rir, setRir] = useState<number | null>(null);

  const handleSubmit = () => {
    if (rpe !== null && rir !== null) {
      onSubmit(rpe, rir);
      setRpe(null);
      setRir(null);
      onClose();
    }
  };

  const handleSkip = () => {
    setRpe(null);
    setRir(null);
    onClose();
  };

  const getProgressionPreview = () => {
    if (!rpe || !currentWeight) return null;
    
    let change = 0;
    let direction = '';
    let reason = '';
    
    if (rpe <= 6 && rir && rir >= 3) {
      change = Math.round(currentWeight * 0.075 * 2) / 2; // 7.5% increase
      direction = 'Tõus';
      reason = 'Liiga kerge - suurendam kaalu';
    } else if (rpe >= 9 || (rir !== null && rir === 0)) {
      change = -Math.round(currentWeight * 0.075 * 2) / 2; // 7.5% decrease
      direction = 'Vähendus';
      reason = 'Liiga raske - vähendame kaalu';
    } else {
      direction = 'Säilib';
      reason = 'Ideaalne vahemik - kaal jääb samaks';
    }
    
    return { change, direction, reason };
  };

  const preview = getProgressionPreview();
  const selectedRPEDesc = rpe ? RPE_DESCRIPTIONS.find(r => r.value === rpe) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Kuidas läks?
          </DialogTitle>
          <DialogDescription className="text-center">
            <div className="space-y-1">
              <div className="font-medium">{exerciseName}</div>
              <div className="text-sm text-muted-foreground">
                {currentWeight && `${currentWeight}kg`}
                {previousRPE && ` • Eelmine RPE: ${previousRPE}`}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* RPE Section */}
          <div className="space-y-4">
            <label className="text-sm font-medium flex items-center gap-2 justify-center">
              <Star className="h-4 w-4 text-primary" />
              Kui raske oli? (RPE 1-10)
            </label>
            
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => {
                const value = i + 1;
                return (
                  <Button
                    key={value}
                    variant={rpe === value ? "default" : "outline"}
                    size="sm"
                    className="aspect-square relative"
                    onClick={() => setRpe(value)}
                  >
                    {value}
                  </Button>
                );
              })}
            </div>
            
            {selectedRPEDesc && (
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <div className="font-medium text-primary">{selectedRPEDesc.label}</div>
                <div className="text-sm text-muted-foreground">{selectedRPEDesc.desc}</div>
              </div>
            )}
          </div>

          {/* RIR Section */}
          <div className="space-y-4">
            <label className="text-sm font-medium flex items-center gap-2 justify-center">
              <Target className="h-4 w-4 text-primary" />
              Mitu kordust jäi varuks? (RIR 0-5+)
            </label>
            <div className="flex gap-2 justify-center">
              {[0, 1, 2, 3, 4, 5].map(value => (
                <Button
                  key={value}
                  variant={rir === value ? "default" : "outline"}
                  size="sm"
                  className="w-12 h-12"
                  onClick={() => setRir(value)}
                >
                  {value === 5 ? "5+" : value}
                </Button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground text-center">
              0 = Enam ei saanud • 2-3 = Ideaalne • 5+ = Liiga kerge
            </div>
          </div>

          {/* Smart Progression Preview */}
          {preview && rpe && rir !== null && (
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Järgmise treeningu ennustus:</span>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">
                  {currentWeight}kg → {currentWeight && preview.change !== 0 ? 
                    `${(currentWeight + preview.change).toFixed(1)}kg` : 
                    `${currentWeight}kg`
                  }
                </div>
                <div className="text-sm text-muted-foreground">{preview.reason}</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button 
            variant="outline" 
            onClick={handleSkip}
            className="flex-1"
          >
            Jäta vahele
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={rpe === null || rir === null}
            className="flex-1"
          >
            Rakenda & Salvesta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}