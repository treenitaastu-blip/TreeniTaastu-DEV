import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface ExerciseFeedbackProps {
  exerciseName: string;
  exerciseType: 'compound' | 'isolation' | 'bodyweight';
  currentWeight?: number;
  onComplete: (feedback: {
    feedback: 'too_easy' | 'just_right' | 'too_hard';
    newWeight?: number;
    change?: number;
    reason: string;
  }) => void;
  onSkip?: () => void;
}

const EXERCISE_INCREMENT_MAP = {
  // Compound movements - larger increments
  'squat': 2.5,
  'deadlift': 2.5,
  'bench_press': 2.5,
  'overhead_press': 2.5,
  'barbell_row': 2.5,
  'compound': 2.5,
  
  // Isolation movements - smaller increments
  'bicep_curl': 1.25,
  'tricep_extension': 1.25,
  'lateral_raise': 1.25,
  'rear_delt_fly': 1.25,
  'leg_curl': 1.25,
  'leg_extension': 1.25,
  'isolation': 1.25,
  
  // Bodyweight exercises - no weight change
  'bodyweight': 0,
};

export default function ExerciseFeedback({ 
  exerciseName, 
  exerciseType, 
  currentWeight = 0, 
  onComplete, 
  onSkip 
}: ExerciseFeedbackProps) {
  
  const calculateWeightProgression = (feedback: 'too_easy' | 'just_right' | 'too_hard') => {
    if (exerciseType === 'bodyweight' || !currentWeight) {
      return {
        feedback,
        reason: getBodyweightReason(feedback),
        change: 0
      };
    }

    const increment = EXERCISE_INCREMENT_MAP[exerciseType] || 2.5;
    const baseIncrease = exerciseType === 'compound' ? 0.025 : 0.02; // 2.5% vs 2%
    const minIncrement = increment;
    
    let newWeight = currentWeight;
    let reason = '';
    
    switch(feedback) {
      case "too_easy":
        const increase = Math.max(currentWeight * baseIncrease, minIncrement);
        newWeight = Math.round((currentWeight + increase) * 2) / 2; // Round to 0.5kg
        reason = `Too easy - increasing by ${(newWeight - currentWeight).toFixed(1)}kg`;
        break;
        
      case "too_hard":
        const decrease = Math.max(currentWeight * baseIncrease, minIncrement);
        newWeight = Math.round((currentWeight - decrease) * 2) / 2; // Round to 0.5kg
        newWeight = Math.max(newWeight, 0); // Never go below 0
        reason = `Too hard - decreasing by ${(currentWeight - newWeight).toFixed(1)}kg`;
        break;
        
      case "just_right":
        newWeight = currentWeight;
        reason = 'Perfect difficulty - maintaining weight';
        break;
    }
    
    return {
      feedback,
      newWeight,
      change: newWeight - currentWeight,
      reason
    };
  };

  const getBodyweightReason = (feedback: string) => {
    switch(feedback) {
      case "too_easy":
        return "Too easy - add 1 rep per set next time";
      case "too_hard":
        return "Too hard - reduce 1 rep per set next time";
      default:
        return "Perfect difficulty - maintain current reps";
    }
  };

  const handleFeedback = (feedback: 'too_easy' | 'just_right' | 'too_hard') => {
    const progression = calculateWeightProgression(feedback);
    onComplete(progression);
  };

  const getFeedbackIcon = (feedback: string) => {
    switch(feedback) {
      case "too_easy":
        return <TrendingUp className="h-4 w-4" />;
      case "too_hard":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getFeedbackColor = (feedback: string) => {
    switch(feedback) {
      case "too_easy":
        return "border-green-200 bg-green-50 hover:bg-green-100";
      case "too_hard":
        return "border-red-200 bg-red-50 hover:bg-red-100";
      default:
        return "border-blue-200 bg-blue-50 hover:bg-blue-100";
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-2 duration-300">
      <Card className="shadow-lg border-2">
        <CardContent className="p-4">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              How did <span className="text-primary">{exerciseName}</span> feel?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              This helps us adjust your next workout
            </p>
          </div>
          
          <div className="flex gap-3 justify-center">
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleFeedback("too_easy")}
              className={`flex-1 h-12 ${getFeedbackColor("too_easy")}`}
            >
              <div className="flex items-center gap-2">
                {getFeedbackIcon("too_easy")}
                <span className="font-medium">Too Easy</span>
              </div>
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleFeedback("just_right")}
              className={`flex-1 h-12 ${getFeedbackColor("just_right")}`}
            >
              <div className="flex items-center gap-2">
                {getFeedbackIcon("just_right")}
                <span className="font-medium">Just Right</span>
              </div>
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleFeedback("too_hard")}
              className={`flex-1 h-12 ${getFeedbackColor("too_hard")}`}
            >
              <div className="flex items-center gap-2">
                {getFeedbackIcon("too_hard")}
                <span className="font-medium">Too Hard</span>
              </div>
            </Button>
          </div>
          
          {onSkip && (
            <div className="text-center mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                Skip feedback
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
