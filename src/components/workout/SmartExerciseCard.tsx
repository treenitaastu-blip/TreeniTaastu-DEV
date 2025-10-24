import React, { useState, useCallback } from "react";
import { Play, Check, Clock, Weight, Repeat, MessageSquare, Star, TrendingUp, Zap, Activity, Info, Target, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { VideoModal } from "./VideoModal";
import ExerciseFeedback from "./ExerciseFeedback";
import { cn } from "@/lib/utils";
import { determineExerciseType, ExerciseType } from "@/utils/progressionLogic";

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
  showExerciseFeedback = false
}: SmartExerciseCardProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [currentSet, setCurrentSet] = useState((completedSets || 0) + 1);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse when all sets are completed
  const allSetsCompleted = completedSets >= exercise.sets;
  
  // Auto-collapse when all sets are done (only if not manually expanded)
  React.useEffect(() => {
    if (allSetsCompleted && !isCollapsed && !showFeedback) {
      const timer = setTimeout(() => {
        setIsCollapsed(true);
      }, 2000); // Collapse after 2 seconds to allow user to see completion
      return () => clearTimeout(timer);
    }
  }, [allSetsCompleted, isCollapsed, showFeedback]);

  // Smart auto-fill based on progression suggestion
  const handleSetInputChangeWithSuggestion = useCallback((setNumber: number, field: string, value: number) => {
    onSetInputChange(setNumber, field, value);
    
    // Auto-apply suggestion to all remaining sets
    if (progressionSuggestion && field === progressionSuggestion.type) {
      for (let i = setNumber + 1; i <= exercise.sets; i++) {
        onSetInputChange(i, field, value);
      }
    }
  }, [onSetInputChange, progressionSuggestion, exercise.sets]);

  const handleSetComplete = useCallback((setNumber: number) => {
    onSetComplete(setNumber);
    setCurrentSet(setNumber + 1);
    
    // Show feedback if this is the last set and feedback is enabled
    if (setNumber === exercise.sets && showExerciseFeedback && onExerciseFeedback) {
      setShowFeedback(true);
    }
    
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
            <div className="relative">
              <Input
                type="number"
                placeholder={exercise.reps}
                value={inputs.reps !== undefined ? inputs.reps : suggestedReps || parseRepsToNumber(exercise.reps) || ""}
                onChange={(e) => handleSetInputChangeWithSuggestion(currentSet, "reps", Number(e.target.value))}
                className={cn(
                  "text-center text-lg h-12",
                  suggestedReps && !inputs.reps && "border-accent/50 bg-accent/5"
                )}
              />
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
              <div className="relative">
                <Input
                  type="number"
                  step="0.5"
                  placeholder={exercise.weight_kg?.toString() || "0"}
                  value={inputs.kg !== undefined ? inputs.kg : suggestedWeight || exercise.weight_kg || ""}
                  onChange={(e) => handleSetInputChangeWithSuggestion(currentSet, "kg", Number(e.target.value))}
                  className={cn(
                    "text-center text-lg h-12",
                    suggestedWeight && !inputs.kg && "border-accent/50 bg-accent/5"
                  )}
                />
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
              <div className="relative">
                <Input
                  type="number"
                  placeholder={exercise.seconds?.toString() || "0"}
                  value={inputs.seconds !== undefined ? inputs.seconds : exercise.seconds || ""}
                  onChange={(e) => handleSetInputChangeWithSuggestion(currentSet, "seconds", Number(e.target.value))}
                  className="text-center text-lg h-12"
                />
              </div>
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

        <Button
          onClick={() => handleSetComplete(currentSet)}
          size="lg"
          className="w-full h-12 text-base font-semibold"
        >
          <Check className="h-5 w-5 mr-2" />
          Seeria tehtud
        </Button>
      </div>
    );
  };

  // Show collapsed state when all sets are completed
  if (allSetsCompleted && isCollapsed) {
    return (
      <div className="rounded-2xl border bg-green-50 border-green-200 shadow-soft overflow-hidden animate-in slide-in-from-top-2 duration-300">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300">
              <Check className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800">
                {exercise.exercise_name}
              </h3>
              <p className="text-sm text-green-600">
                {exercise.sets} seeriat tehtud
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="text-green-600 hover:text-green-700 hover:bg-green-100 transition-colors"
          >
            Näita
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Exercise Title - First and prominent */}
      <div className="p-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            {exercise.exercise_name}
          </h3>
          
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
                onClick={() => setIsCollapsed(!isCollapsed)}
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
                        size="lg"
                        onClick={() => handleSetComplete(setNumber)}
                        className="h-12 px-4 text-base font-bold bg-primary hover:bg-primary/90"
                        disabled={!inputs.reps && !parseRepsToNumber(exercise.reps)}
                      >
                        <Check className="h-4 w-4 mr-2" />
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
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder={exercise.reps}
                            value={inputs.reps !== undefined ? inputs.reps : suggestedReps || parseRepsToNumber(exercise.reps) || ""}
                            onChange={(e) => handleSetInputChangeWithSuggestion(setNumber, "reps", Number(e.target.value))}
                            className={cn(
                              "text-center text-lg h-12",
                              suggestedReps && !inputs.reps && "border-accent/50 bg-accent/5"
                            )}
                            disabled={isCompleted}
                          />
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
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.5"
                              placeholder={exercise.weight_kg.toString()}
                              value={inputs.kg !== undefined ? inputs.kg : suggestedWeight || exercise.weight_kg || ""}
                              onChange={(e) => handleSetInputChangeWithSuggestion(setNumber, "kg", Number(e.target.value))}
                              className={cn(
                                "text-center text-lg h-12",
                                suggestedWeight && !inputs.kg && "border-accent/50 bg-accent/5"
                              )}
                              disabled={isCompleted}
                            />
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
                            onChange={(e) => handleSetInputChangeWithSuggestion(setNumber, "seconds", Number(e.target.value))}
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
          exerciseType={determineExerciseType(exercise.exercise_name)}
          currentWeight={exercise.weight_kg || 0}
          onComplete={handleExerciseFeedback}
          onSkip={handleSkipFeedback}
        />
      )}
    </div>
  );
}