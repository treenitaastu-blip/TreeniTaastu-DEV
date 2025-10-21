// src/components/workout/ModernRestTimer.tsx
import { useEffect, useState } from "react";
import { Play, Pause, SkipForward, Plus, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModernRestTimerProps {
  isOpen: boolean;
  initialSeconds: number;
  exerciseName: string;
  onClose: () => void;
}

export default function ModernRestTimer({
  isOpen,
  initialSeconds,
  exerciseName,
  onClose
}: ModernRestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [totalTime] = useState(initialSeconds);

  useEffect(() => {
    if (!isOpen) return;
    setTimeLeft(initialSeconds);
    setIsRunning(true);
  }, [isOpen, initialSeconds]);

  useEffect(() => {
    if (!isRunning || !isOpen || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          // Optional: play notification sound
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isOpen, timeLeft]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-background rounded-lg shadow-lg p-4 border max-w-xs w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Puhkepaus</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Exercise Name */}
        <div className="text-center mb-3">
          <p className="text-xs text-muted-foreground truncate">
            {exerciseName}
          </p>
        </div>

        {/* Compact Timer Display */}
        <div className="text-center mb-3">
          <div className="text-2xl font-bold tabular-nums text-primary">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </div>
          {timeLeft === 0 && (
            <div className="text-xs text-success font-medium">
              Valmis!
            </div>
          )}
        </div>

        {/* Compact Controls */}
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRunning(!isRunning)}
            disabled={timeLeft === 0}
            className="h-8"
          >
            {isRunning ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8"
          >
            <SkipForward className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}