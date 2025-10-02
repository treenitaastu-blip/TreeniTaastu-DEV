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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" 
         style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-background rounded-3xl shadow-2xl p-8 max-w-sm w-full border mx-auto my-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg">Puhkepaus</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Exercise Name */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground truncate">
            {exerciseName}
          </p>
        </div>

        {/* Progress Circle */}
        <div className="relative mb-8 flex justify-center">
          <div className="relative">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-muted"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
                className="text-primary transition-all duration-1000 ease-linear"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold tabular-nums">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </div>
                {timeLeft === 0 && (
                  <div className="text-sm text-success font-medium">
                    Valmis!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Play/Pause & Skip */}
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsRunning(!isRunning)}
              disabled={timeLeft === 0}
            >
              {isRunning ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={onClose}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Time Adjustments */}
          <div className="flex justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTimeLeft(prev => Math.max(0, prev - 15))}
              disabled={timeLeft === 0}
            >
              <Minus className="h-4 w-4 mr-1" />
              15s
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTimeLeft(prev => prev + 15)}
            >
              <Plus className="h-4 w-4 mr-1" />
              15s
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTimeLeft(prev => prev + 30)}
            >
              <Plus className="h-4 w-4 mr-1" />
              30s
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}