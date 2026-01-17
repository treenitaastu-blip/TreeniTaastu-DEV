import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";

interface RIRDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rir: number) => void;
  exerciseName: string;
}

export default function RIRDialog({
  isOpen,
  onClose,
  onSave,
  exerciseName
}: RIRDialogProps) {
  const [rir, setRir] = useState<number | null>(null);

  const handleSave = () => {
    if (rir !== null) {
      onSave(rir);
      setRir(null);
    }
  };

  const handleSkip = () => {
    setRir(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {exerciseName}
          </DialogTitle>
          <DialogDescription className="text-center">
            Mitu kordust varusse jäi?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2 justify-center flex-wrap">
            {[0, 1, 2, 3, 4, 5].map(value => (
              <Button
                key={value}
                variant={rir === value ? "default" : "outline"}
                size="lg"
                className="w-16 h-16 text-lg font-semibold"
                onClick={() => setRir(value)}
              >
                {value === 5 ? "5+" : value}
              </Button>
            ))}
          </div>
          
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <div>0 = Enam ei saanud</div>
            <div>2-3 = Ideaalne vahemik</div>
            <div>5+ = Liiga kerge</div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleSkip}
            className="flex-1"
          >
            Jäta vahele
          </Button>
          <Button 
            onClick={handleSave}
            disabled={rir === null}
            className="flex-1"
          >
            Salvesta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
