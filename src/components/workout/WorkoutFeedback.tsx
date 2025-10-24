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
    joint_pain: boolean;
    joint_pain_location?: string;
    fatigue_level: number; // 0-10
    energy_level: 'low' | 'normal' | 'high';
    notes?: string;
  }) => void;
  onSkip?: () => void;
}

export default function WorkoutFeedback({ workoutSummary, onComplete, onSkip }: WorkoutFeedbackProps) {
  const [jointPain, setJointPain] = useState<boolean | null>(null);
  const [jointPainLocation, setJointPainLocation] = useState('');
  const [fatigueLevel, setFatigueLevel] = useState<number>(5);
  const [energyLevel, setEnergyLevel] = useState<'low' | 'normal' | 'high' | null>(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (jointPain !== null && energyLevel) {
      onComplete({
        joint_pain: jointPain,
        joint_pain_location: jointPain ? jointPainLocation.trim() : undefined,
        fatigue_level: fatigueLevel,
        energy_level: energyLevel,
        notes: notes.trim() || undefined
      });
    }
  };

  const isComplete = jointPain !== null && energyLevel;


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-3">
          <CardTitle className="text-lg">Kuidas treening läks?</CardTitle>
          {workoutSummary && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
              <div className="text-sm text-green-800 font-medium">
                ✅ {workoutSummary.setsCompleted} seeriat tehtud • {workoutSummary.duration} minutit • {workoutSummary.totalWeight}kg tõstetud
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Joint Pain Question */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Kas oli liigesevalu?</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={jointPain === false ? "default" : "outline"}
                onClick={() => setJointPain(false)}
                className="h-10"
              >
                Ei
              </Button>
              <Button
                variant={jointPain === true ? "default" : "outline"}
                onClick={() => setJointPain(true)}
                className="h-10"
              >
                Jah
              </Button>
            </div>
            
            {/* Joint Pain Location - Show only if "Jah" is selected */}
            {jointPain === true && (
              <div className="mt-3">
                <label className="text-sm font-medium text-muted-foreground">Kus valutab?</label>
                <input
                  type="text"
                  value={jointPainLocation}
                  onChange={(e) => setJointPainLocation(e.target.value)}
                  placeholder="Näiteks: õlavöötmed, põlved, selg..."
                  className="w-full p-3 border rounded-lg text-sm mt-1"
                />
              </div>
            )}
          </div>

          {/* Fatigue Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Kui väsinud oled trennist? (0-10)</label>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, i) => (
                <Button
                  key={i}
                  variant={fatigueLevel === i ? "default" : "outline"}
                  onClick={() => setFatigueLevel(i)}
                  className="h-8 text-xs"
                  size="sm"
                >
                  {i}
                </Button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 - Ei tunne üldse väsimust</span>
              <span>5 - Mõõdukas väsimus</span>
              <span>10 - Täiesti läbi</span>
            </div>
          </div>

          {/* Energy Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Kui energilisena end trennis tundsid?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'low', label: 'Madal' },
                { value: 'normal', label: 'Normaalne' },
                { value: 'high', label: 'Kõrge' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={energyLevel === option.value ? "default" : "outline"}
                  onClick={() => setEnergyLevel(option.value as any)}
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
          <div className="flex gap-2 pt-3">
            <Button
              onClick={handleSubmit}
              disabled={!isComplete}
              className="flex-1 h-9 text-sm"
            >
              Saada tagasiside
            </Button>
            {onSkip && (
              <Button
                variant="outline"
                onClick={onSkip}
                className="h-9 text-sm px-4"
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
