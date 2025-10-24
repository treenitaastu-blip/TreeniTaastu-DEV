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
    <div className="border-b bg-background">
      <div className="px-4 py-2">
        {/* Ultra-minimal header - just title and progress */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 text-center">
            <h1 className="text-sm font-medium text-foreground truncate">
              {dayTitle}
            </h1>
            <div className="text-xs text-muted-foreground mt-0.5">
              {completedSets}/{totalSets} seeriat
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              {elapsedMinutes}m
            </div>
            {!isFinished && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                    <XCircle className="h-4 w-4" />
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
        
        {/* Minimal progress bar */}
        <div className="mt-2 w-full bg-muted rounded-full h-1 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>
        
        {/* Completion button - only show when 100% */}
        {progressPercentage >= 100 && !isFinished && (
          <div className="flex justify-center mt-2">
            <Button 
              onClick={onFinish}
              size="sm"
              className="h-7 px-3 text-xs bg-green-600 text-white hover:bg-green-700"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Lõpeta
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}