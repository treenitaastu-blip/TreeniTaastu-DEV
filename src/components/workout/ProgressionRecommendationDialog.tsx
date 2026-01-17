import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp, X } from "lucide-react";

interface ProgressionRecommendationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  currentWeight: number;
  sessionsWithoutChange: number;
  message: string;
  onDismiss?: () => void; // Optional callback when user dismisses/understands the recommendation
}

export default function ProgressionRecommendationDialog({
  isOpen,
  onClose,
  exerciseName,
  currentWeight,
  sessionsWithoutChange,
  message,
  onDismiss
}: ProgressionRecommendationDialogProps) {
  const handleClose = () => {
    onDismiss?.(); // Call onDismiss if provided (can be used to track that user saw the recommendation)
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Progressioni soovitus
          </DialogTitle>
          <DialogDescription>
            {exerciseName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Main message */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              {message}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Praegune kaal:</span>
              <span className="font-medium text-foreground">{currentWeight} kg</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Seansse ilma muutuseta:</span>
              <span className="font-medium text-foreground">{sessionsWithoutChange}</span>
            </div>
          </div>

          {/* Recommendation explanation */}
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Miks on see oluline?</p>
                <p className="text-muted-foreground">
                  Pidev raskuse kasv on võtmetähtis tugevuse ja lihasmassi kasvu saavutamiseks. 
                  Kui kasutad samu kaalusid liiga kaua, võib treening muutuda liiga kergeks ja 
                  tulemused hakkavad peatuma.
                </p>
              </div>
            </div>
          </div>

          {/* Note about future features */}
          <div className="text-xs text-muted-foreground italic pt-2 border-t">
            💡 Soovid abi progressiooniga? Tulevikus saame sind suunata treeneri abi saamiseks.
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Mõistetud
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
