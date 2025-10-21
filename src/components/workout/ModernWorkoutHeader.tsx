// src/components/workout/ModernWorkoutHeader.tsx
import { ArrowLeft, CheckCircle, Timer, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

interface WorkoutHeaderProps {
  programTitle: string;
  dayTitle: string;
  dayOrder?: number;
  onBack: () => void;
  startedAt: string;
  isFinished: boolean;
  onFinish?: () => void;
  completedSets: number;
  totalSets: number;
}

export default function ModernWorkoutHeader({
  programTitle,
  dayTitle,
  dayOrder,
  onBack,
  startedAt,
  isFinished,
  onFinish,
  completedSets,
  totalSets
}: WorkoutHeaderProps) {
  const elapsedMinutes = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
  const progressPercentage = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  return (
    <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tagasi
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              {elapsedMinutes} min
            </div>
            
            {!isFinished && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/10">
                    <XCircle className="h-4 w-4 mr-2" />
                    Lõpeta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Kas oled kindel?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>Soovid treeningu lõpetada?</p>
                      {completedSets < totalSets && (
                        <p className="text-warning font-medium">
                          Oled teinud {completedSets}/{totalSets} seeriat. 
                          Kui lõpetad nüüd, siis märgitakse treening poolikuks.
                        </p>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Tühista</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onFinish}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Jah, lõpeta treening
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Streamlined Header */}
        <div className="space-y-3">
          {/* Minimalistic Title */}
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">
              {dayTitle}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="text-sm text-muted-foreground">
                {completedSets}/{totalSets} seeriat tehtud
              </div>
              <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
              <div className="text-sm text-muted-foreground">
                {Math.round(progressPercentage)}% valmis
              </div>
            </div>
          </div>

          {/* Compact Progress Bar */}
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>

          {/* Completion Button */}
          {progressPercentage >= 100 && !isFinished && (
            <div className="flex justify-center">
              <Button 
                onClick={onFinish}
                size="sm"
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Lõpeta treening
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}