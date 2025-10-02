import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Target } from "lucide-react";

interface RPERIRDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rpe: number, rir: number) => void;
  exerciseName: string;
  setNumber: number;
}

export default function RPERIRDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  exerciseName, 
  setNumber 
}: RPERIRDialogProps) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Kuidas läks?</DialogTitle>
          <DialogDescription className="text-center">
            {exerciseName} - {setNumber}. seeria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* RPE Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2 justify-center">
              <Star className="h-4 w-4 text-primary" />
              Kui raske oli? (1-10)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => {
                const value = i + 1;
                return (
                  <Button
                    key={value}
                    variant={rpe === value ? "default" : "outline"}
                    size="sm"
                    className="aspect-square"
                    onClick={() => setRpe(value)}
                  >
                    {value}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              1 = Väga kerge • 5 = Keskmine • 10 = Maksimaalne
            </p>
          </div>

          {/* RIR Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2 justify-center">
              <Target className="h-4 w-4 text-primary" />
              Mitu kordust jäi varuks? (0-5+)
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
            <p className="text-xs text-muted-foreground text-center">
              0 = Enam ei oleks saanud • 2-3 = Ideaalne • 5+ = Liiga kerge
            </p>
          </div>
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
            Salvesta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}