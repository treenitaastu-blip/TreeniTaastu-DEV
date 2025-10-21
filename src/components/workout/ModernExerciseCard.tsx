import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  Clock, 
  Weight, 
  Target,
  MessageSquare,
  Video,
  Settings
} from 'lucide-react';

interface Exercise {
  id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  weight_kg?: number | null;
  seconds?: number | null;
  rest_seconds?: number | null;
  coach_notes?: string | null;
  video_url?: string | null;
  is_unilateral?: boolean;
  reps_per_side?: number | null;
  total_reps?: number | null;
}

interface ModernExerciseCardProps {
  exercise: Exercise;
  completedSets: number;
  onSetComplete: (setNumber: number, data?: Record<string, unknown>) => void;
  onStartRest: () => void;
  setInputs: Record<string, { reps?: number; seconds?: number; kg?: number }>;
  onSetInputChange: (setNumber: number, field: string, value: number) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  rpe?: number;
  onRPEChange?: (rpe: number) => void;
  rir?: number;
  onRIRChange?: (rir: number) => void;
  className?: string;
}

export default function ModernExerciseCard({
  exercise,
  completedSets,
  onSetComplete,
  onStartRest,
  setInputs,
  onSetInputChange,
  notes,
  onNotesChange,
  rpe,
  onRPEChange,
  rir,
  onRIRChange,
  className
}: ModernExerciseCardProps) {
  const [currentSet, setCurrentSet] = useState(1);
  const [showNotes, setShowNotes] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const progress = (completedSets / exercise.sets) * 100;
  const isCompleted = completedSets >= exercise.sets;

  const handleSetComplete = (setNumber: number) => {
    const setData = setInputs[setNumber] || {};
    onSetComplete(setNumber, setData);
    
    if (setNumber < exercise.sets) {
      setCurrentSet(setNumber + 1);
    }
  };

  const handleStartRest = () => {
    onStartRest();
  };

  const getWeightDisplay = () => {
    if (exercise.weight_kg && exercise.weight_kg > 0) {
      return `${exercise.weight_kg} kg`;
    }
    if (exercise.seconds && exercise.seconds > 0) {
      return `${exercise.seconds} s`;
    }
    return 'Keharaskus';
  };

  const getRepsDisplay = () => {
    if (exercise.is_unilateral && exercise.reps_per_side) {
      return `${exercise.reps_per_side} mõlemal`;
    }
    return exercise.reps;
  };

  return (
    <Card className={`transition-all duration-200 ${isCompleted ? 'ring-2 ring-green-500 bg-green-50' : ''} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold mb-2">
              {exercise.exercise_name}
            </CardTitle>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                {exercise.sets} × {getRepsDisplay()}
              </span>
              <span className="flex items-center gap-1">
                <Weight className="h-4 w-4" />
                {getWeightDisplay()}
              </span>
              {exercise.rest_seconds && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {exercise.rest_seconds}s puhkus
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {exercise.video_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVideo(true)}
                className="h-8 w-8 p-0"
              >
                <Video className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes(!showNotes)}
              className="h-8 w-8 p-0"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress: {completedSets}/{exercise.sets} seeriat</span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Set Inputs */}
        <div className="space-y-3">
          {Array.from({ length: exercise.sets }, (_, i) => i + 1).map((setNumber) => {
            const isCompleted = setNumber <= completedSets;
            const setData = setInputs[setNumber] || {};
            
            return (
              <div key={setNumber} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Set {setNumber}</span>
                  {isCompleted && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>

                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Kordused"
                    value={setData.reps || ''}
                    onChange={(e) => onSetInputChange(setNumber, 'reps', Number(e.target.value))}
                    disabled={isCompleted}
                    className="text-center"
                  />
                  {(exercise.weight_kg && exercise.weight_kg > 0) ? (
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="Raskus (kg)"
                      value={setData.kg || ''}
                      onChange={(e) => onSetInputChange(setNumber, 'kg', Number(e.target.value))}
                      disabled={isCompleted}
                      className="text-center"
                    />
                  ) : (exercise.seconds && exercise.seconds > 0) ? (
                    <Input
                      type="number"
                      placeholder="Sekundid"
                      value={setData.seconds || ''}
                      onChange={(e) => onSetInputChange(setNumber, 'seconds', Number(e.target.value))}
                      disabled={isCompleted}
                      className="text-center"
                    />
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-2">
                      Keharaskus
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleSetComplete(setNumber)}
                  disabled={isCompleted}
                  size="sm"
                  className="h-8"
                >
                  {isCompleted ? 'Tehtud' : 'Tehtud'}
                </Button>
              </div>
            );
          })}
        </div>

        {/* RPE/RIR Inputs */}
        {(onRPEChange || onRIRChange) && (
          <div className="grid grid-cols-2 gap-3">
            {onRPEChange && (
              <div>
                <label className="text-sm font-medium mb-1 block">RPE</label>
                <Input
                  type="number"
                  min="6"
                  max="20"
                  value={rpe || ''}
                  onChange={(e) => onRPEChange(Number(e.target.value))}
                  placeholder="6-20"
                  className="text-center"
                />
              </div>
            )}
            {onRIRChange && (
              <div>
                <label className="text-sm font-medium mb-1 block">RIR</label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={rir || ''}
                  onChange={(e) => onRIRChange(Number(e.target.value))}
                  placeholder="0-10"
                  className="text-center"
                />
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {showNotes && onNotesChange && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Märkused</label>
            <textarea
              value={notes || ''}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Lisa märkused..."
              className="w-full p-2 border rounded-md resize-none"
              rows={3}
            />
          </div>
        )}

        {/* Coach Notes */}
        {exercise.coach_notes && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Settings className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900">Treeneri märkus</div>
                <div className="text-sm text-blue-700">{exercise.coach_notes}</div>
              </div>
            </div>
          </div>
        )}

        {/* Rest Timer */}
        {exercise.rest_seconds && (
          <div className="flex justify-center">
            <Button
              onClick={handleStartRest}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Alusta puhkepaus ({exercise.rest_seconds}s)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
