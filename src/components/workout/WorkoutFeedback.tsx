import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';

interface WorkoutFeedbackProps {
  workoutSummary?: {
    setsCompleted: number;
    totalReps: number;
    totalWeight: number;
    duration: number;
  };
  onComplete: (feedback: {
    joint_pain: boolean;
    joint_pain_location?: string;
    fatigue_level: number; // 0-10 (RPE)
    energy_level: 'low' | 'normal' | 'high';
    notes?: string;
  }) => void;
  onSkip?: () => void;
}

export default function WorkoutFeedback({ workoutSummary, onComplete, onSkip }: WorkoutFeedbackProps) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (rpe !== null) {
      onComplete({
        joint_pain: false, // Default to false since we removed the question
        fatigue_level: rpe,
        energy_level: 'normal', // Default since we removed the question
        notes: notes.trim() || undefined
      });
    }
  };

  const isComplete = rpe !== null;


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 pb-32">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-2 space-y-2">
          <CardTitle className="text-base">Kuidas treening läks?</CardTitle>
          {workoutSummary && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2">
              <div className="text-xs text-green-800 font-medium">
                ✅ {workoutSummary.setsCompleted} seeriat • {workoutSummary.duration} min
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-3 pb-4">
          {/* RPE (Rate of Perceived Exertion) */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-primary" />
              RPE (1-10)
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 10 }, (_, i) => {
                const value = i + 1;
                return (
                  <Button
                    key={value}
                    variant={rpe === value ? "default" : "outline"}
                    onClick={() => setRpe(value)}
                    className="h-9 text-sm px-2"
                    size="sm"
                  >
                    {value}
                  </Button>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>1 - Väga kerge</span>
              <span>5-6 - Normaalne</span>
              <span>10 - Maksimaalne</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Märkused (valikuline)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kuidas tundus?"
              className="min-h-[60px] text-sm resize-none"
              rows={2}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSubmit}
              disabled={!isComplete}
              className="flex-1 h-9 text-sm"
            >
              Salvesta
            </Button>
            {onSkip && (
              <Button
                variant="outline"
                onClick={onSkip}
                className="h-9 text-sm px-3"
              >
                Jäta vahele
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
