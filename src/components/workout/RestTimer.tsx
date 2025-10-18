import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Clock, Bell } from 'lucide-react';

interface RestTimerProps {
  duration: number; // in seconds
  onComplete?: () => void;
  onStart?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  className?: string;
}

export default function RestTimer({ 
  duration, 
  onComplete, 
  onStart, 
  onPause, 
  onReset,
  className 
}: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsCompleted(true);
            onComplete?.();
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
        intervalRef.current = null;
      }
    };
  }, [isRunning, timeLeft, onComplete]);

  useEffect(() => {
    // Play sound when timer completes
    if (isCompleted && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  }, [isCompleted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    setIsCompleted(false);
    onStart?.();
  };

  const handlePause = () => {
    setIsRunning(false);
    onPause?.();
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsCompleted(false);
    setTimeLeft(duration);
    onReset?.();
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Puhkepaus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className="text-4xl font-bold mb-2">
            {formatTime(timeLeft)}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          {isCompleted ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <Bell className="h-3 w-3 mr-1" />
              Valmis!
            </Badge>
          ) : isRunning ? (
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              <Play className="h-3 w-3 mr-1" />
              Käib
            </Badge>
          ) : (
            <Badge variant="outline">
              <Pause className="h-3 w-3 mr-1" />
              Peatatud
            </Badge>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          {!isCompleted && (
            <Button
              onClick={isRunning ? handlePause : handleStart}
              variant={isRunning ? "outline" : "default"}
              size="sm"
              className="flex-1"
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Paus
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Alusta
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Lähtesta
          </Button>
        </div>

        {/* Audio element for completion sound */}
        <audio ref={audioRef} preload="auto">
          <source src="/sounds/timer-complete.mp3" type="audio/mpeg" />
        </audio>
      </CardContent>
    </Card>
  );
}
