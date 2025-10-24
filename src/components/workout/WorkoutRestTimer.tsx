import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Minimize2, Maximize2, Timer, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkoutRestTimerProps {
  isOpen: boolean;
  initialSeconds: number;
  exerciseName: string;
  onClose: () => void;
  onStartRest?: (seconds: number) => void;
}

export const WorkoutRestTimer: React.FC<WorkoutRestTimerProps> = ({ 
  isOpen, 
  initialSeconds, 
  exerciseName, 
  onClose,
  onStartRest 
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addTimeOptions = [15, 30, 45, 60];

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(initialSeconds);
      setIsRunning(true); // Auto-start when opened
      if (onStartRest) {
        onStartRest(initialSeconds);
      }
    }
  }, [isOpen, initialSeconds, onStartRest]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            // Audio notification
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.connect(g);
              g.connect(ctx.destination);
              o.type = 'sine';
              o.frequency.value = 880;
              g.gain.value = 0.001;
              o.start();
              g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
              g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.2);
              o.stop(ctx.currentTime + 0.22);
            } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(initialSeconds);
  };

  const handleAddTime = (seconds: number) => {
    setTimeLeft(prev => prev + seconds);
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-20 left-6 z-[100] bg-card border rounded-lg shadow-lg p-3 min-w-[140px]">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={timeLeft === 0 ? "destructive" : "default"}>
            {formatTime(timeLeft)}
          </Badge>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={isRunning ? handlePause : handleStart}
              className="h-6 w-6 p-0"
            >
              {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(false)}
              className="h-6 w-6 p-0"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-6 z-[100] bg-card border rounded-xl shadow-lg p-4 w-80">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm">Puhkepaus</h3>
          <p className="text-xs text-muted-foreground truncate max-w-48">
            {exerciseName}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMinimized(true)}
            className="h-6 w-6 p-0"
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </div>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-4">
        <div className={cn(
          "text-3xl font-bold tabular-nums",
          timeLeft === 0 ? "text-destructive" : "text-foreground"
        )}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Add Time Buttons - Only in maximized view */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {addTimeOptions.map(seconds => (
          <Button
            key={seconds}
            variant="outline"
            size="sm"
            onClick={() => handleAddTime(seconds)}
            disabled={isRunning}
            className="text-xs"
          >
            +{seconds}s
          </Button>
        ))}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={isRunning ? handlePause : handleStart}
          size="sm"
          className="flex-1"
          disabled={timeLeft === 0}
        >
          {isRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
          {isRunning ? "Peata" : "Alusta"}
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          size="sm"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {timeLeft === 0 && (
        <div className="mt-2 text-center text-sm text-destructive font-medium">
          Aeg läbi! 🎉
        </div>
      )}
    </div>
  );
};
