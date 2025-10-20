import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Minimize2, Maximize2, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactTimerProps {
  className?: string;
}

export const CompactTimer: React.FC<CompactTimerProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const presetTimes = [10, 20, 30, 40, 50, 60];

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            // simple beep using Web Audio API
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
    setTimeLeft(selectedDuration);
  };

  const handlePresetSelect = (duration: number) => {
    setSelectedDuration(duration);
    setTimeLeft(duration);
    setIsRunning(false);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className={cn("fixed bottom-6 left-6 z-[100] shadow-lg", className)}
      >
        <Timer className="h-4 w-4 mr-2" />
        Taimer
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 left-6 z-[100] bg-card border rounded-lg shadow-lg p-3 min-w-[140px]">
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
    <div className="fixed bottom-6 left-6 z-[100] bg-card border rounded-xl shadow-lg p-4 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Harjutuse taimer</h3>
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
            onClick={() => setIsOpen(false)}
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

      {/* Preset Time Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {presetTimes.map(time => (
          <Button
            key={time}
            variant={selectedDuration === time ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetSelect(time)}
            disabled={isRunning}
            className="text-xs"
          >
            {time}s
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