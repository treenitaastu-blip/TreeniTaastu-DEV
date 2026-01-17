import React, { useState, useCallback, useEffect, useRef } from "react";
import { Play, Check, Clock, Weight, Repeat, MessageSquare, Star, TrendingUp, Zap, Activity, Info, Target, Timer, Pause, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { VideoModal } from "./VideoModal";
import ExerciseFeedback from "./ExerciseFeedback";
import { cn } from "@/lib/utils";
import { determineExerciseType, ExerciseType } from "./ExerciseFeedback";

// Helper to parse reps string to number (e.g., "12x" -> 12, "8-10" -> 8)
const parseRepsToNumber = (reps: string): number | null => {
  if (!reps) return null;
  const match = reps.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

interface SmartExerciseCardProps {
  exercise: {
    id: string;
    exercise_name: string;
    exercise_type?: 'compound' | 'isolation' | 'bodyweight';
    sets: number;
    reps: string;
    seconds?: number | null;
    weight_kg?: number | null;
    rest_seconds?: number | null;
    coach_notes?: string | null;
    video_url?: string | null;
    exercise_alternatives?: Array<{
      id: string;
      alternative_name: string;
      alternative_description?: string;
      alternative_video_url?: string;
      difficulty_level: 'easier' | 'same' | 'harder';
      equipment_required?: string[];
      muscle_groups?: string[];
    }>;
  };
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
  progressionSuggestion?: {
    type: 'weight' | 'reps';
    value: number;
    reason: string;
    confidence_score?: number;
    professional_notes?: string;
  } | null;
  onSwitchToAlternative?: (exerciseId: string, alternativeName: string) => void;
  showAlternatives?: boolean;
  onToggleAlternatives?: (exerciseId: string) => void;
  // New feedback system props
  onExerciseFeedback?: (exerciseId: string, feedback: {
    feedback: 'too_easy' | 'just_right' | 'too_hard';
    newWeight?: number;
    change?: number;
    reason: string;
  }) => void;
  showExerciseFeedback?: boolean;
  // Weight update props
  onUpdateSingleSetWeight?: (exerciseId: string, setNumber: number, newWeight: number) => void;
  onUpdateAllSetsWeight?: (exerciseId: string, newWeight: number) => void;
  // Progression recommendation system
  progressionRecommendation?: {
    needs_recommendation: boolean;
    current_weight: number;
    sessions_without_change: number;
    message: string;
  } | null;
  onRecommendationClick?: () => void;
}

export default function SmartExerciseCard({
  exercise,
  completedSets,
  onSetComplete,
  onStartRest,
  setInputs,
  onSetInputChange,
  notes = "",
  onNotesChange,
  rpe,
  onRPEChange,
  rir,
  onRIRChange,
  progressionSuggestion,
  onSwitchToAlternative,
  showAlternatives = false,
  onToggleAlternatives,
  onExerciseFeedback,
  showExerciseFeedback = false,
  onUpdateSingleSetWeight,
  onUpdateAllSetsWeight,
  progressionRecommendation,
  onRecommendationClick
}: SmartExerciseCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [currentSet, setCurrentSet] = useState((completedSets || 0) + 1);
  
  // Timer state for time-based exercises
  const [timerActive, setTimerActive] = useState<Record<number, boolean>>({});
  const [timerSeconds, setTimerSeconds] = useState<Record<number, number>>({});
  const timerIntervalRef = useRef<Record<number, NodeJS.Timeout>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  

  // Auto-collapse when all sets are completed
  const allSetsCompleted = completedSets >= exercise.sets;
  
  // Auto-collapse when all sets are done (only if not manually expanded)
  React.useEffect(() => {
    if (allSetsCompleted && !isCollapsed && !showFeedback && !manuallyExpanded) {
      const timer = setTimeout(() => {
        setIsCollapsed(true);
      }, 2000); // Collapse after 2 seconds to allow user to see completion
      return () => clearTimeout(timer);
    }
  }, [allSetsCompleted, isCollapsed, showFeedback, manuallyExpanded]);

  // Helpers for step logic
  const roundToQuarter = (n: number) => Math.round(n * 4) / 4;
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  // Smart auto-fill based on progression suggestion (used by steppers)
  const applyValueWithSuggestion = useCallback((setNumber: number, field: string, value: number) => {
    onSetInputChange(setNumber, field, value);
    if (progressionSuggestion && field === progressionSuggestion.type) {
      for (let i = setNumber + 1; i <= exercise.sets; i++) {
        onSetInputChange(i, field, value);
      }
    }
  }, [onSetInputChange, progressionSuggestion, exercise.sets]);

  // Stepper handlers
  const handleRepStep = useCallback((setNumber: number, delta: number) => {
    const key = `${exercise.id}:${setNumber}`;
    const current = setInputs[key]?.reps ?? parseRepsToNumber(exercise.reps) ?? 0;
    const next = clamp(current + delta, 0, 1000);
    applyValueWithSuggestion(setNumber, 'reps', next);
  }, [exercise.id, exercise.reps, setInputs, applyValueWithSuggestion]);

  const handleWeightStep = useCallback((setNumber: number, delta: number) => {
    const key = `${exercise.id}:${setNumber}`;
    const base = setInputs[key]?.kg ?? exercise.weight_kg ?? 0;
    const nextRaw = base + delta;
    const next = clamp(roundToQuarter(nextRaw), 0, 1000);

    // Apply immediately to current set
    applyValueWithSuggestion(setNumber, 'kg', next);

  }, [exercise.id, exercise.weight_kg, setInputs, applyValueWithSuggestion]);

  const handleSetComplete = useCallback((setNumber: number, data?: Record<string, unknown>) => {
    onSetComplete(setNumber, data);
    setCurrentSet(setNumber + 1);
    
    // Clear timer state for completed set
    if (timerIntervalRef.current[setNumber]) {
      clearInterval(timerIntervalRef.current[setNumber]);
      delete timerIntervalRef.current[setNumber];
    }
    setTimerActive(prev => ({ ...prev, [setNumber]: false }));
    setTimerSeconds(prev => ({ ...prev, [setNumber]: undefined }));
    
    // Exercise feedback removed - clients now control weight progression manually
    
    // Auto-start rest timer if it's not the last set
    if (setNumber < exercise.sets) {
      setTimeout(() => {
        onStartRest();
      }, 500);
    }
  }, [onSetComplete, onStartRest, exercise.sets, showExerciseFeedback, onExerciseFeedback]);

  // Handle exercise feedback completion
  const handleExerciseFeedback = useCallback((feedback: {
    feedback: 'too_easy' | 'just_right' | 'too_hard';
    newWeight?: number;
    change?: number;
    reason: string;
  }) => {
    if (onExerciseFeedback) {
      onExerciseFeedback(exercise.id, feedback);
    }
    setShowFeedback(false);
  }, [onExerciseFeedback, exercise.id]);

  // Skip feedback
  const handleSkipFeedback = useCallback(() => {
    setShowFeedback(false);
  }, []);

  const getSuggestedValue = (field: string) => {
    if (!progressionSuggestion || progressionSuggestion.type !== field) return null;
    return progressionSuggestion.value;
  };

  // Get current set inputs
  const getCurrentSetInputs = (setNumber: number) => {
    const key = `${exercise.id}:${setNumber}`;
    return setInputs[key] || {};
  };

  const renderCurrentSet = () => {
    if (currentSet > exercise.sets) {
      return (
        <div className="text-center py-6">
          <Check className="h-12 w-12 text-success mx-auto mb-2" />
          <p className="font-semibold text-success">Harjutus lõpetatud!</p>
        </div>
      );
    }

    const key = `${exercise.id}:${currentSet}`;
    const inputs = setInputs[key] || {};
    const suggestedWeight = getSuggestedValue('weight');
    const suggestedReps = getSuggestedValue('reps');

    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
            <span className="font-bold text-lg">{currentSet}</span>
            <span className="text-sm">/ {exercise.sets}</span>
          </div>
        </div>

        {progressionSuggestion && (
          <div className="bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">AI Trainer Recommendation</span>
              {progressionSuggestion.confidence_score && (
                <Badge variant="secondary" className="text-xs">
                  {Math.round(progressionSuggestion.confidence_score * 100)}% confidence
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{progressionSuggestion.reason}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-accent/30 text-accent">
                {progressionSuggestion.type === 'weight' ? `${progressionSuggestion.value} kg` : `${progressionSuggestion.value} reps`}
              </Badge>
              {progressionSuggestion.professional_notes && (
                <span className="text-xs text-muted-foreground">
                  {progressionSuggestion.professional_notes}
                </span>
              )}
            </div>
          </div>
        )}

        <div className={`grid gap-4 ${(exercise.weight_kg && exercise.weight_kg > 0) || (exercise.seconds && exercise.seconds > 0) ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              Kordused
            </label>
            <div className="relative flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-12 w-12 bg-red-100 text-red-700 hover:bg-red-200" onClick={() => handleRepStep(currentSet, -1)}>-</Button>
              <div className={cn("flex-1 text-center text-lg h-12 rounded-md border flex items-center justify-center",
                suggestedReps && !inputs.reps && "border-accent/50 bg-accent/5")}> 
                {inputs.reps !== undefined ? inputs.reps : suggestedReps || parseRepsToNumber(exercise.reps) || 0}
              </div>
              <Button variant="outline" size="sm" className="h-12 w-12 bg-green-100 text-green-700 hover:bg-green-200" onClick={() => handleRepStep(currentSet, 1)}>+</Button>
              {suggestedReps && !inputs.reps && (
                <Zap className="h-4 w-4 text-accent absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>

          {/* Smart Weight/Time/Bodyweight Input - show only the relevant one */}
          {(exercise.weight_kg && exercise.weight_kg > 0) ? (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Weight className="h-3 w-3" />
                Raskus (kg)
              </label>
              <div className="relative flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-12 w-12 bg-red-100 text-red-700 hover:bg-red-200" onClick={() => handleWeightStep(currentSet, -0.25)}>-</Button>
                <div className={cn("flex-1 text-center text-lg h-12 rounded-md border flex items-center justify-center",
                  suggestedWeight && !inputs.kg && "border-accent/50 bg-accent/5")}> 
                  {(inputs.kg !== undefined ? inputs.kg : suggestedWeight || exercise.weight_kg || 0).toFixed(2)}
                </div>
                <Button variant="outline" size="sm" className="h-12 w-12 bg-green-100 text-green-700 hover:bg-green-200" onClick={() => handleWeightStep(currentSet, 0.25)}>+</Button>
                {suggestedWeight && !inputs.kg && (
                  <Zap className="h-4 w-4 text-accent absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>
          ) : (exercise.seconds && exercise.seconds > 0) ? (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Aeg (s)
              </label>
              {timerActive[currentSet] ? (
                // Timer is running - show countdown
                <div className="text-center text-4xl font-bold text-primary h-16 flex items-center justify-center border-2 border-primary rounded-lg bg-primary/5">
                  {timerSeconds[currentSet] ?? (exercise.seconds || 0)}
                </div>
              ) : (
                // Timer not started - show assigned time
                <div className="text-center text-lg h-12 border rounded-md bg-muted/20 flex items-center justify-center text-muted-foreground">
                  {exercise.seconds}s
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Keharaskus
              </label>
              <div className="text-center text-lg h-12 border rounded-md bg-muted/20 flex items-center justify-center text-muted-foreground">
                Keharaskus
              </div>
            </div>
          )}
        </div>

        {/* For time-based exercises, show "Alusta" button that starts countdown timer */}
        {exercise.seconds && exercise.seconds > 0 ? (
          timerActive[currentSet] ? (
            // Timer is running - show pause/cancel option
            <Button
              onClick={() => {
                // Stop timer
                if (timerIntervalRef.current[currentSet]) {
                  clearInterval(timerIntervalRef.current[currentSet]);
                  delete timerIntervalRef.current[currentSet];
                }
                setTimerActive(prev => ({ ...prev, [currentSet]: false }));
                setTimerSeconds(prev => ({ ...prev, [currentSet]: exercise.seconds || 0 }));
              }}
              variant="outline"
              size="sm"
              className="w-full h-8 text-sm font-medium"
            >
              <Pause className="h-3 w-3 mr-1" />
              Peata
            </Button>
          ) : (
            // Timer not started - show "Alusta" button
            <Button
              onClick={() => {
                const targetSeconds = exercise.seconds || 0;
                setTimerSeconds(prev => ({ ...prev, [currentSet]: targetSeconds }));
                setTimerActive(prev => ({ ...prev, [currentSet]: true }));
                
                // Start countdown
                timerIntervalRef.current[currentSet] = setInterval(() => {
                  setTimerSeconds(prev => {
                    const current = (prev[currentSet] ?? targetSeconds);
                    const next = current - 1;
                    
                    if (next <= 0) {
                      // Timer reached 0 - automatically complete the set
                      setTimeout(() => {
                        if (timerIntervalRef.current[currentSet]) {
                          clearInterval(timerIntervalRef.current[currentSet]);
                          delete timerIntervalRef.current[currentSet];
                        }
                        setTimerActive(prev => ({ ...prev, [currentSet]: false }));
                        
                        // Mark set as complete with the seconds value
                        const key = `${exercise.id}:${currentSet}`;
                        const setData = setInputs[key] || {};
                        handleSetComplete(currentSet, { ...setData, seconds: targetSeconds });
                      }, 0);
                      
                      return { ...prev, [currentSet]: 0 };
                    }
                    return { ...prev, [currentSet]: next };
                  });
                }, 1000);
              }}
              size="sm"
              className="w-full h-8 text-sm font-medium"
            >
              <Play className="h-3 w-3 mr-1" />
              Alusta
            </Button>
          )
        ) : (
          // Non-time-based exercise - show regular "Seeria tehtud" button
          <Button
            onClick={() => handleSetComplete(currentSet)}
            size="sm"
            className="w-full h-8 text-sm font-medium"
          >
            <Check className="h-3 w-3 mr-1" />
            Seeria tehtud
          </Button>
        )}
      </div>
    );
  };

  // Show collapsed state when all sets are completed
  if (allSetsCompleted && isCollapsed) {
    return (
      <div className="rounded-2xl border border-gray-200/60 bg-green-50 shadow-soft overflow-hidden animate-in slide-in-from-top-2 duration-300">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300">
              <Check className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-green-800">
                {exercise.exercise_name}
              </h3>
              {progressionRecommendation?.needs_recommendation && (
                <button
                  onClick={onRecommendationClick}
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-colors cursor-pointer"
                  title="Progressioni soovitus - klikkige vaatamiseks"
                >
                  <AlertCircle className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="text-sm text-green-600">
              {exercise.sets} seeriat tehtud
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsCollapsed(false);
              setManuallyExpanded(true);
            }}
            className="text-green-600 hover:text-green-700 hover:bg-green-100 transition-colors"
          >
            Näita
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200/60 bg-card shadow-sm overflow-hidden">
      {/* Exercise Title - First and prominent */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-foreground">
              {exercise.exercise_name}
            </h3>
            {progressionRecommendation?.needs_recommendation && (
              <button
                onClick={onRecommendationClick}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-colors cursor-pointer"
                title="Progressioni soovitus - klikkige vaatamiseks"
              >
                <AlertCircle className="h-4 w-4" />
              </button>
            )}
            
            {/* Exercise done button - only show if not all sets completed */}
            {!allSetsCompleted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Mark all remaining sets as completed
                  for (let i = completedSets + 1; i <= exercise.sets; i++) {
                    handleSetComplete(i);
                  }
                }}
                className="text-[10px] px-2 py-0.5 h-5"
              >
                Tehtud
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {exercise.video_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVideo(true)}
                className="h-7 w-7 p-0"
              >
                <Play className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes(!showNotes)}
              className={cn(
                "h-7 w-7 p-0",
                showNotes && "bg-primary/10 text-primary",
                notes && !showNotes && "text-primary"
              )}
              title={notes ? `Kommentaar: ${notes.substring(0, 50)}${notes.length > 50 ? '...' : ''}` : "Lisa kommentaar"}
            >
              <MessageSquare className="h-3 w-3" />
            </Button>
            {/* Collapse/Expand button - only show when all sets are completed */}
            {allSetsCompleted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCollapsed(!isCollapsed);
                  if (!isCollapsed) {
                    // If collapsing, reset manual expansion
                    setManuallyExpanded(false);
                  } else {
                    // If expanding, mark as manually expanded
                    setManuallyExpanded(true);
                  }
                }}
                className="h-7 w-7 p-0"
                title={isCollapsed ? "Näita seeriad" : "Peida seeriad"}
              >
                {isCollapsed ? <Activity className="h-3 w-3" /> : <Check className="h-3 w-3" />}
              </Button>
            )}
            {exercise.exercise_alternatives && exercise.exercise_alternatives.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Single-click quick switch: choose first alternative different from current name
                  const nextAlt = exercise.exercise_alternatives?.find(a => a.alternative_name !== exercise.exercise_name)?.alternative_name;
                  if (nextAlt) {
                    onSwitchToAlternative?.(exercise.id, nextAlt);
                  } else {
                    // If none found, fallback to first available
                    const firstAlt = exercise.exercise_alternatives?.[0]?.alternative_name;
                    if (firstAlt) {
                      onSwitchToAlternative?.(exercise.id, firstAlt);
                    }
                  }
                }}
                className={cn(
                  "h-7 w-7 p-0",
                  showAlternatives && "bg-accent/10 text-accent"
                )}
                title="Vaheta alternatiivse harjutuse vastu"
              >
                <Repeat className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Coach Notes */}
        {exercise.coach_notes && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary/60 mt-1.5 flex-shrink-0"></div>
              <span className="text-muted-foreground">{exercise.coach_notes}</span>
            </div>
          </div>
        )}

        {/* User Comment - Show if exists */}
        {notes && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
              <span className="text-blue-800">{notes}</span>
            </div>
          </div>
        )}
      </div>

      {/* Clean exercise details - sets, weight, reps, rest */}
      <div className="p-3 bg-muted/10">
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="min-h-[3rem] flex flex-col justify-center">
            <div className="text-sm font-medium text-muted-foreground mb-1">Seeriad</div>
            <div className="text-lg font-semibold text-foreground">
              {allSetsCompleted ? exercise.sets : completedSets}/{exercise.sets}
            </div>
          </div>
          <div className="min-h-[3rem] flex flex-col justify-center">
            <div className="text-sm font-medium text-muted-foreground mb-1">Kaal</div>
            <div className="text-lg font-semibold text-foreground">
              {exercise.weight_kg || 0}kg
            </div>
          </div>
          <div className="min-h-[3rem] flex flex-col justify-center">
            <div className="text-sm font-medium text-muted-foreground mb-1">Kordused</div>
            <div className="text-lg font-semibold text-foreground">
              {exercise.reps}
            </div>
          </div>
          <div className="min-h-[3rem] flex flex-col justify-center">
            <div className="text-sm font-medium text-muted-foreground mb-1">Puhkus</div>
            <div className="text-lg font-semibold text-foreground">
              {exercise.rest_seconds || 60}s
            </div>
          </div>
        </div>
        
        {/* Minimal progress bar */}
        <div className="mt-3 w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${(completedSets / exercise.sets) * 100}%` }}
          />
        </div>
      </div>

      {/* Sets Grid - Touch-friendly spacing */}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: exercise.sets }, (_, i) => i + 1).map((setNumber) => {
            const isCompleted = setNumber <= completedSets;
            const isCurrent = setNumber === currentSet;
            const inputs = getCurrentSetInputs(setNumber);
            const suggestedReps = getSuggestedValue("reps");
            const suggestedWeight = getSuggestedValue("weight");
            
            return (
              <Card 
                key={setNumber}
                className={cn(
                  "transition-all duration-300 relative",
                  isCompleted && "bg-green-50 border-green-200",
                  isCurrent && !isCompleted && "ring-2 ring-primary shadow-lg scale-105 bg-blue-50 border-blue-200",
                  !isCurrent && !isCompleted && "bg-muted/20"
                )}
              >
                <CardContent className="p-3">
                  {/* Current set gets special treatment */}
                  
                  {/* Set Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={isCompleted ? "default" : "outline"} className="text-xs">
                        {setNumber}
                      </Badge>
                      {isCompleted && <Check className="h-4 w-4 text-green-600" />}
                      {isCurrent && !isCompleted && <Target className="h-4 w-4 text-blue-600" />}
                    </div>
                    
                    {isCurrent && !isCompleted && (
                      <Button
                        size="sm"
                        onClick={() => handleSetComplete(setNumber)}
                        className="h-8 px-3 text-sm font-medium bg-primary hover:bg-primary/90"
                        disabled={!inputs.reps && !parseRepsToNumber(exercise.reps)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Seeria tehtud
                      </Button>
                    )}
                  </div>

                  {/* Streamlined Input Fields */}
                  <div className="space-y-3">
                    {/* Only show essential inputs in a clean layout */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">
                          Kordused
                        </label>
                        <div className="relative flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-12 w-10 bg-red-100 text-red-700 hover:bg-red-200" onClick={() => handleRepStep(setNumber, -1)} disabled={isCompleted}>-</Button>
                          <div className={cn("flex-1 text-center text-lg h-12 rounded-md border flex items-center justify-center",
                            suggestedReps && !inputs.reps && "border-accent/50 bg-accent/5")}> 
                            {inputs.reps !== undefined ? inputs.reps : suggestedReps || parseRepsToNumber(exercise.reps) || 0}
                          </div>
                          <Button variant="outline" size="sm" className="h-12 w-10 bg-green-100 text-green-700 hover:bg-green-200" onClick={() => handleRepStep(setNumber, 1)} disabled={isCompleted}>+</Button>
                          {suggestedReps && !inputs.reps && (
                            <Zap className="h-4 w-4 text-accent absolute right-3 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      </div>
                      
                      {(exercise.weight_kg && exercise.weight_kg > 0) ? (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-1 block">
                            Kaal (kg)
                          </label>
                          <div className="relative flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-12 w-10 bg-red-100 text-red-700 hover:bg-red-200" onClick={() => handleWeightStep(setNumber, -0.25)} disabled={isCompleted}>-</Button>
                            <div className={cn("flex-1 text-center text-lg h-12 rounded-md border flex items-center justify-center",
                              suggestedWeight && !inputs.kg && "border-accent/50 bg-accent/5")}> 
                              {(inputs.kg !== undefined ? inputs.kg : suggestedWeight || exercise.weight_kg || 0).toFixed(2)}
                            </div>
                            <Button variant="outline" size="sm" className="h-12 w-10 bg-green-100 text-green-700 hover:bg-green-200" onClick={() => handleWeightStep(setNumber, 0.25)} disabled={isCompleted}>+</Button>
                            {suggestedWeight && !inputs.kg && (
                              <Zap className="h-4 w-4 text-accent absolute right-3 top-1/2 -translate-y-1/2" />
                            )}
                          </div>
                        </div>
                      ) : exercise.seconds && exercise.seconds > 0 ? (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-1 block">
                            Aeg (sek)
                          </label>
                          <Input
                            type="number"
                            placeholder={exercise.seconds.toString()}
                            value={inputs.seconds !== undefined ? inputs.seconds : exercise.seconds || ""}
                            onChange={(e) => onSetInputChange(setNumber, "seconds", Number(e.target.value))}
                            className="text-center text-lg h-12"
                            disabled={isCompleted}
                          />
                        </div>
                      ) : (
                        <div className="text-center py-3 text-sm text-muted-foreground bg-muted/20 rounded-lg">
                          Ilma lisaraskuseta
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Peida button - only show when all sets are completed and expanded */}
        {allSetsCompleted && (
          <div className="flex justify-center mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCollapsed(true);
                setManuallyExpanded(false);
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-100 transition-colors"
            >
              Peida
            </Button>
          </div>
        )}
      </div>

      {/* Collapsible Notes - Hidden by default */}
      {showNotes && (
        <div className="p-4 border-t bg-muted/5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange?.(e.target.value)}
              placeholder="Lisa kommentaar harjutuse kohta..."
              rows={3}
              className="text-sm"
            />
            
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => setShowNotes(false)}
                className="text-xs"
              >
                Lisa kommentaar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alternative Exercises */}
      {/* Alternatives list removed: quick-switch happens on single click in header */}

      {/* Video Modal */}
      {showVideo && exercise.video_url && (
        <VideoModal
          src={exercise.video_url}
          title={exercise.exercise_name}
          onClose={() => setShowVideo(false)}
        />
      )}

      {/* Exercise Feedback */}
      {showFeedback && (
        <ExerciseFeedback
          exerciseName={exercise.exercise_name}
          exerciseType={exercise.exercise_type || determineExerciseType(exercise.exercise_name)}
          currentWeight={exercise.weight_kg || 0}
          onComplete={handleExerciseFeedback}
          onSkip={handleSkipFeedback}
        />
      )}

      
    </div>
  );
  
  // Cleanup timers on unmount or when exercise changes
  useEffect(() => {
    return () => {
      Object.values(timerIntervalRef.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
    };
  }, [exercise.id]);
}