import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Target, CheckCircle, Activity } from 'lucide-react';

interface SessionProgressProps {
  totalExercises: number;
  completedExercises: number;
  totalSets: number;
  completedSets: number;
  sessionDuration?: number; // in minutes
  className?: string;
}

export default function SessionProgress({
  totalExercises,
  completedExercises,
  totalSets,
  completedSets,
  sessionDuration,
  className
}: SessionProgressProps) {
  const exerciseProgress = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;
  const setProgress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const overallProgress = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Treeningu progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Üldine progress</span>
            <span className="text-sm text-muted-foreground">
              {completedExercises}/{totalExercises} harjutust
            </span>
          </div>
          <Progress value={overallProgress} className="h-3" />
          <div className="text-center text-sm text-muted-foreground">
            {Math.round(overallProgress)}% valmis
          </div>
        </div>

        {/* Exercise Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Harjutused</span>
            <Badge variant={completedExercises === totalExercises ? "default" : "outline"}>
              {completedExercises}/{totalExercises}
            </Badge>
          </div>
          <Progress value={exerciseProgress} className="h-2" />
        </div>

        {/* Set Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Seeriad</span>
            <Badge variant={completedSets === totalSets ? "default" : "outline"}>
              {completedSets}/{totalSets}
            </Badge>
          </div>
          <Progress value={setProgress} className="h-2" />
        </div>

        {/* Session Duration */}
        {sessionDuration && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Kestus: {formatDuration(sessionDuration)}</span>
          </div>
        )}

        {/* Completion Status */}
        {completedExercises === totalExercises && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Kõik harjutused tehtud!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
