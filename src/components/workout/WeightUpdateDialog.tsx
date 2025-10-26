import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface WeightUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateSingleSet: () => void;
  onUpdateAllSets: () => void;
  exerciseName: string;
  currentWeight: number;
  newWeight: number;
}

export const WeightUpdateDialog: React.FC<WeightUpdateDialogProps> = ({
  isOpen,
  onClose,
  onUpdateSingleSet,
  onUpdateAllSets,
  exerciseName,
  currentWeight,
  newWeight
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Kaalu uuendamine
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Oled muutnud kaalu harjutusele <strong>"{exerciseName}"</strong>:
          </div>
          
          <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {currentWeight}kg
              </div>
              <div className="text-xs text-muted-foreground">Vana kaal</div>
            </div>
            
            <div className="text-2xl text-muted-foreground">→</div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {newWeight}kg
              </div>
              <div className="text-xs text-muted-foreground">Uus kaal</div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Kuidas soovid seda kaalu uuendada?
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={onUpdateSingleSet}
              variant="outline"
              className="w-full justify-start"
            >
              <div className="text-left">
                <div className="font-medium">Uuenda 1 seeria</div>
                <div className="text-xs text-muted-foreground">
                  Uuendab ainult selle seeria kaalu
                </div>
              </div>
            </Button>
            
            <Button 
              onClick={onUpdateAllSets}
              className="w-full justify-start"
            >
              <div className="text-left">
                <div className="font-medium">Uuenda kõik seeriad</div>
                <div className="text-xs text-muted-foreground">
                  Uuendab kõigi seeriate kaalu ja salvestab eelistuse
                </div>
              </div>
            </Button>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="text-muted-foreground"
            >
              Tühista
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
