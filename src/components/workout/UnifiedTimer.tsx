import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Minimize2, Maximize2, Timer, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnifiedTimerProps {
  isOpen: boolean;
  initialSeconds?: number;
  exerciseName?: string;
  mode?: 'rest' | 'static'; // 'rest' for personal training, 'static' for static programs
  onClose: () => void;
  onStartRest?: (seconds: number) => void; // Only used in rest mode
  className?: string;
}

export const UnifiedTimer: React.FC<UnifiedTimerProps> = ({ 
  isOpen, 
  initialSeconds = 30, 
  exerciseName = "Harjutus",
  mode = 'static',
  onClose,
  onStartRest,
  className 
}) => {
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized by default
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(initialSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Different time options based on mode
  const addTimeOptions = mode === 'rest' ? [15, 30, 45, 60] : [10, 20, 30, 40, 50, 60];
  const presetTimes = mode === 'static' ? [10, 20, 30, 40, 50, 60] : undefined;

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(initialSeconds);
      setSelectedDuration(initialSeconds);
      // Auto-start for rest mode, manual start for static mode
      if (mode === 'rest') {
        setIsRunning(true);
      }
    } else {
      setIsRunning(false);
    }
  }, [isOpen, initialSeconds, mode]);

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
    setTimeLeft(selectedDuration);
  };

  const handleAddTime = (seconds: number) => {
    setTimeLeft(prev => prev + seconds);
  };

  const handlePresetSelect = (duration: number) => {
    setSelectedDuration(duration);
    setTimeLeft(duration);
    setIsRunning(false);
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className={cn("fixed bottom-20 right-6 z-[100]", className)}>
        <div className="flex flex-col items-center gap-2 bg-black/60 backdrop-blur-md border border-white/50 rounded-2xl p-2 shadow-xl w-12">
          {/* Small circular timer */}
          <div className="relative w-10 h-10 bg-black/40 rounded-full flex items-center justify-center border-2 border-white/60 backdrop-blur-sm">
            <span className="text-sm font-mono font-bold text-white drop-shadow-lg">
              {timeLeft}
            </span>
          </div>
          
          {/* Only maximize button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMinimized(false)}
            className="h-5 w-5 p-0 bg-black/40 backdrop-blur-sm border border-white/60 rounded-full shadow-lg hover:bg-black/60"
            title="Suurenda"
          >
            <Maximize2 className="h-2.5 w-2.5 text-white" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("fixed bottom-20 right-6 z-[100] bg-black/60 backdrop-blur-md border border-white/50 rounded-2xl shadow-xl p-4 w-80", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm text-white">
            {mode === 'rest' ? 'Puhkepaus' : 'Harjutuse taimer'}
          </h3>
          <p className="text-xs text-white/70 truncate max-w-48">
            {exerciseName}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMinimized(true)}
            className="h-6 w-6 p-0 bg-black/30 backdrop-blur-sm border border-white/40 rounded-full shadow-lg hover:bg-black/50"
            title="Minimeeri"
          >
            <Minimize2 className="h-3 w-3 text-white" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-6 w-6 p-0 bg-black/30 backdrop-blur-sm border border-white/40 rounded-full shadow-lg hover:bg-black/50"
            title="Sulge"
          >
            <X className="h-3 w-3 text-white" />
          </Button>
        </div>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-4">
        <div className={cn(
          "text-3xl font-bold tabular-nums",
          timeLeft === 0 ? "text-red-400" : "text-white"
        )}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Preset Time Buttons - Only for static mode */}
      {mode === 'static' && presetTimes && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {presetTimes.map(time => (
            <Button
              key={time}
              variant={selectedDuration === time ? "default" : "ghost"}
              size="sm"
              onClick={() => handlePresetSelect(time)}
              disabled={isRunning}
              className="text-xs bg-black/30 backdrop-blur-sm border border-white/40 rounded-lg shadow-lg hover:bg-black/50 disabled:opacity-50 text-white"
            >
              {time}s
            </Button>
          ))}
        </div>
      )}

      {/* Add Time Buttons - Only in maximized view */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {addTimeOptions.map(seconds => (
          <Button
            key={seconds}
            variant="ghost"
            size="sm"
            onClick={() => handleAddTime(seconds)}
            disabled={isRunning}
            className="text-xs bg-black/30 backdrop-blur-sm border border-white/40 rounded-lg shadow-lg hover:bg-black/50 disabled:opacity-50 text-white"
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
          className="flex-1 bg-black/30 backdrop-blur-sm border border-white/40 rounded-lg shadow-lg hover:bg-black/50 disabled:opacity-50 text-white"
          disabled={timeLeft === 0}
        >
          {isRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
          {isRunning ? "Peata" : "Alusta"}
        </Button>
        <Button
          onClick={handleReset}
          variant="ghost"
          size="sm"
          className="bg-black/30 backdrop-blur-sm border border-white/40 rounded-lg shadow-lg hover:bg-black/50"
        >
          <RotateCcw className="h-4 w-4 text-white" />
        </Button>
      </div>

      {timeLeft === 0 && (
        <div className="mt-2 text-center text-sm text-red-400 font-medium">
          Aeg läbi!
        </div>
      )}
    </div>
  );
};
