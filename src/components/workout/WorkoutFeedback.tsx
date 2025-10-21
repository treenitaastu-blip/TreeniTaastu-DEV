import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Moon, 
  Activity, 
  Heart, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface WorkoutFeedbackProps {
  workoutSummary?: {
    setsCompleted: number;
    totalReps: number;
    totalWeight: number;
    duration: number;
  };
  onComplete: (feedback: {
    energy: 'low' | 'normal' | 'high';
    soreness: 'none' | 'mild' | 'high';
    pump: 'poor' | 'good' | 'excellent';
    joint_pain: boolean;
    overall_difficulty: 'too_easy' | 'just_right' | 'too_hard';
    notes?: string;
  }) => void;
  onSkip?: () => void;
}

export default function WorkoutFeedback({ workoutSummary, onComplete, onSkip }: WorkoutFeedbackProps) {
  const [energy, setEnergy] = useState<'low' | 'normal' | 'high' | null>(null);
  const [soreness, setSoreness] = useState<'none' | 'mild' | 'high' | null>(null);
  const [pump, setPump] = useState<'poor' | 'good' | 'excellent' | null>(null);
  const [jointPain, setJointPain] = useState<boolean | null>(null);
  const [difficulty, setDifficulty] = useState<'too_easy' | 'just_right' | 'too_hard' | null>(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (energy && soreness && pump && jointPain !== null && difficulty) {
      onComplete({
        energy,
        soreness,
        pump,
        joint_pain: jointPain,
        overall_difficulty: difficulty,
        notes: notes.trim() || undefined
      });
    }
  };

  const isComplete = energy && soreness && pump && jointPain !== null && difficulty;


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">Kuidas treening läks?</CardTitle>
          {workoutSummary && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
              <div className="text-sm text-green-800 font-medium">
                ✅ {workoutSummary.setsCompleted} seeriat tehtud • {workoutSummary.duration} minutit • {workoutSummary.totalWeight}kg tõstetud
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Energy Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Kuidas oli energiatase?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'low', label: 'Madal' },
                { value: 'normal', label: 'Normaalne' },
                { value: 'high', label: 'Kõrge' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={energy === option.value ? "default" : "outline"}
                  onClick={() => setEnergy(option.value as any)}
                  className="h-10"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Soreness Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Kui valulik oled?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'none', label: 'Pole valu' },
                { value: 'mild', label: 'Kergelt' },
                { value: 'high', label: 'Väga' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={soreness === option.value ? "default" : "outline"}
                  onClick={() => setSoreness(option.value as any)}
                  className="h-10"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Muscle Pump Quality */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Kui tugevalt tajusid lihaste paisumist?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'poor', label: 'Nõrk' },
                { value: 'good', label: 'Hea' },
                { value: 'excellent', label: 'Tugev' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={pump === option.value ? "default" : "outline"}
                  onClick={() => setPump(option.value as any)}
                  className="h-10"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Joint Pain */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Liigesevalu?</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={jointPain === false ? "default" : "outline"}
                onClick={() => setJointPain(false)}
                className="h-10"
              >
                Pole
              </Button>
              <Button
                variant={jointPain === true ? "default" : "outline"}
                onClick={() => setJointPain(true)}
                className="h-10"
              >
                Natuke
              </Button>
            </div>
          </div>

          {/* Overall Difficulty */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Kuidas oli raskus?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'too_easy', label: 'Liiga kerge' },
                { value: 'just_right', label: 'Paras' },
                { value: 'too_hard', label: 'Liiga raske' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={difficulty === option.value ? "default" : "outline"}
                  onClick={() => setDifficulty(option.value as any)}
                  className="h-10"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Lisamärkused (valikuline)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kuidas tundus?"
              className="w-full p-3 border rounded-lg resize-none text-sm"
              rows={2}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!isComplete}
              className="flex-1 h-10"
            >
              Saada tagasiside
            </Button>
            {onSkip && (
              <Button
                variant="outline"
                onClick={onSkip}
                className="h-10"
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
