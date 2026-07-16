// src/components/workout/ModernWorkoutHeader.tsx
import { ArrowLeft, CheckCircle, Clock3, XCircle } from "lucide-react";
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
  isFinishing?: boolean;
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
  isFinishing = false,
  onFinish,
  completedSets,
  totalSets
}: WorkoutHeaderProps) {
  const elapsedMinutes = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
  const progressPercentage = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const dayLabel = dayOrder && !dayTitle.toLocaleLowerCase("et-EE").startsWith("päev")
    ? `Päev ${dayOrder} · ${dayTitle}`
    : dayTitle;

  return (
    <header className="tt-workout-header">
      <div className="tt-workout-header__inner">
        <div className="tt-workout-header__topline">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="tt-workout-header__back"
            aria-label="Tagasi treeningkavasse"
          >
            <ArrowLeft size={19} aria-hidden="true" />
          </Button>

          <div className="tt-workout-header__identity">
            <p className="tt-workout-header__eyebrow">{programTitle}</p>
            <h1>{dayLabel}</h1>
          </div>

          <div className="tt-workout-header__actions">
            <span className="tt-workout-header__time">
              <Clock3 size={15} aria-hidden="true" />
              {elapsedMinutes} min
            </span>
            {!isFinished && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="tt-workout-header__finish-icon"
                    aria-label="Lõpeta treening"
                    disabled={isFinishing}
                  >
                    <XCircle size={19} aria-hidden="true" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="tt-workout-finish-dialog">
                  <AlertDialogHeader className="tt-workout-finish-dialog__head">
                    <p className="tt-app-eyebrow">Treeningu lõpetamine</p>
                    <AlertDialogTitle>Kas oled kindel?</AlertDialogTitle>
                    <AlertDialogDescription>
                      <p>Lõpetamisel salvestame tehtud seeriad ja küsime lühikest tagasisidet.</p>
                      {completedSets < totalSets && (
                        <p className="tt-workout-finish-dialog__notice">
                          Tehtud on {completedSets}/{totalSets} seeriat. Treening jääb lõpetamisel osaliseks.
                        </p>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="tt-workout-finish-dialog__actions">
                    <AlertDialogCancel className="tt-workout-finish-dialog__cancel">Jätka treeningut</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onFinish}
                      className="tt-workout-finish-dialog__confirm"
                      disabled={isFinishing}
                    >
                      {isFinishing ? "Salvestan…" : "Lõpeta treening"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="tt-workout-header__progress-row">
          <span>{completedSets}/{totalSets} seeriat tehtud</span>
          <strong>{Math.round(Math.min(progressPercentage, 100))}%</strong>
        </div>
        <div
          className="tt-workout-header__progress"
          role="progressbar"
          aria-label="Treeningu edenemine"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(Math.min(progressPercentage, 100))}
        >
          <div
            className="tt-workout-header__progress-bar"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>

        {progressPercentage >= 100 && !isFinished && (
          <Button onClick={onFinish} size="sm" className="tt-workout-header__complete" disabled={isFinishing}>
            <CheckCircle size={16} aria-hidden="true" />
            {isFinishing ? "Salvestan…" : "Lõpeta treening"}
          </Button>
        )}
      </div>
    </header>
  );
}
