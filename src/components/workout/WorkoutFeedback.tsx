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

export default function WorkoutFeedback({ onComplete, onSkip }: WorkoutFeedbackProps) {
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

  const getEnergyIcon = (level: string) => {
    switch(level) {
      case 'low': return <Moon className="h-4 w-4" />;
      case 'normal': return <Activity className="h-4 w-4" />;
      case 'high': return <Zap className="h-4 w-4" />;
      default: return null;
    }
  };

  const getSorenessIcon = (level: string) => {
    switch(level) {
      case 'none': return <CheckCircle className="h-4 w-4" />;
      case 'mild': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <Heart className="h-4 w-4" />;
      default: return null;
    }
  };

  const getPumpIcon = (level: string) => {
    switch(level) {
      case 'poor': return <TrendingDown className="h-4 w-4" />;
      case 'good': return <Activity className="h-4 w-4" />;
      case 'excellent': return <TrendingUp className="h-4 w-4" />;
      default: return null;
    }
  };

  const getDifficultyIcon = (level: string) => {
    switch(level) {
      case 'too_easy': return <TrendingUp className="h-4 w-4" />;
      case 'just_right': return <CheckCircle className="h-4 w-4" />;
      case 'too_hard': return <TrendingDown className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">How was your workout?</CardTitle>
          <p className="text-muted-foreground">
            This helps us optimize your training program
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Energy Level */}
          <div className="space-y-3">
            <label className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              How was your overall energy?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'low', label: 'Low', desc: 'Felt tired' },
                { value: 'normal', label: 'Normal', desc: 'Felt good' },
                { value: 'high', label: 'High', desc: 'Felt energetic' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={energy === option.value ? "default" : "outline"}
                  onClick={() => setEnergy(option.value as any)}
                  className="h-16 flex flex-col gap-1"
                >
                  {getEnergyIcon(option.value)}
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.desc}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Soreness Level */}
          <div className="space-y-3">
            <label className="text-lg font-semibold flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              How sore are you from previous workouts?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'none', label: 'Not Sore', desc: 'No soreness' },
                { value: 'mild', label: 'Mildly Sore', desc: 'Some soreness' },
                { value: 'high', label: 'Very Sore', desc: 'High soreness' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={soreness === option.value ? "default" : "outline"}
                  onClick={() => setSoreness(option.value as any)}
                  className="h-16 flex flex-col gap-1"
                >
                  {getSorenessIcon(option.value)}
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.desc}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Muscle Pump Quality */}
          <div className="space-y-3">
            <label className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              How was your muscle pump quality?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'poor', label: 'Poor', desc: 'No pump' },
                { value: 'good', label: 'Good', desc: 'Decent pump' },
                { value: 'excellent', label: 'Excellent', desc: 'Great pump' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={pump === option.value ? "default" : "outline"}
                  onClick={() => setPump(option.value as any)}
                  className="h-16 flex flex-col gap-1"
                >
                  {getPumpIcon(option.value)}
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.desc}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Joint Pain */}
          <div className="space-y-3">
            <label className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Any joint pain or discomfort?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={jointPain === false ? "default" : "outline"}
                onClick={() => setJointPain(false)}
                className="h-12"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                No pain
              </Button>
              <Button
                variant={jointPain === true ? "default" : "outline"}
                onClick={() => setJointPain(true)}
                className="h-12"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Some pain
              </Button>
            </div>
          </div>

          {/* Overall Difficulty */}
          <div className="space-y-3">
            <label className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              How was the overall workout difficulty?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'too_easy', label: 'Too Easy', desc: 'Not challenging' },
                { value: 'just_right', label: 'Just Right', desc: 'Perfect challenge' },
                { value: 'too_hard', label: 'Too Hard', desc: 'Too challenging' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={difficulty === option.value ? "default" : "outline"}
                  onClick={() => setDifficulty(option.value as any)}
                  className="h-16 flex flex-col gap-1"
                >
                  {getDifficultyIcon(option.value)}
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.desc}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <label className="text-lg font-semibold">
              Additional notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did you feel? Any specific feedback?"
              className="w-full p-3 border rounded-lg resize-none"
              rows={3}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!isComplete}
              className="flex-1 h-12"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit Feedback
            </Button>
            {onSkip && (
              <Button
                variant="outline"
                onClick={onSkip}
                className="h-12"
              >
                Skip
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
