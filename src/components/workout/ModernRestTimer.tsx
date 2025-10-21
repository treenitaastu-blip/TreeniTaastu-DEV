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
    <div className="w-full">
      <div className="bg-background rounded-lg shadow-sm p-3 border">
        {/* Horizontal Layout */}
        <div className="flex items-center justify-between">
          {/* Left: Exercise Info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Pause className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Puhkepaus</h3>
              <p className="text-xs text-muted-foreground truncate max-w-32">
                {exerciseName}
              </p>
            </div>
          </div>

          {/* Center: Timer Display */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold tabular-nums text-primary">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </div>
              {timeLeft === 0 && (
                <div className="text-xs text-green-600 font-medium">
                  Valmis!
                </div>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRunning(!isRunning)}
              disabled={timeLeft === 0}
              className="h-8 w-8 p-0"
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
              className="h-8 w-8 p-0"
            >
              <SkipForward className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}