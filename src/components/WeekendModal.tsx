import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Target, Trophy } from 'lucide-react';

interface WeekendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartWorkout: () => void;
  onSkip: () => void;
  weeklyGoal?: number;
  completedWorkouts?: number;
  className?: string;
}

export default function WeekendModal({
  isOpen,
  onClose,
  onStartWorkout,
  onSkip,
  weeklyGoal = 3,
  completedWorkouts = 0,
  className
}: WeekendModalProps) {
  const progress = weeklyGoal > 0 ? (completedWorkouts / weeklyGoal) * 100 : 0;
  const isGoalReached = completedWorkouts >= weeklyGoal;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Nädalavahetuse treening
          </DialogTitle>
          <DialogDescription>
            Kas soovid jätkata oma treeningut nädalavahetusel?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Weekly Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Nädala progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Treeningud sel nädalal</span>
                <Badge variant={isGoalReached ? "default" : "outline"}>
                  {completedWorkouts}/{weeklyGoal}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>

              {isGoalReached && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Trophy className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Nädala eesmärk saavutatud!
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Options */}
          <div className="space-y-3">
            <Button
              onClick={onStartWorkout}
              className="w-full"
              size="lg"
            >
              <Target className="h-4 w-4 mr-2" />
              Alusta treeningut
            </Button>
            
            <Button
              onClick={onSkip}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Clock className="h-4 w-4 mr-2" />
              Jäta vahele
            </Button>
          </div>

          {/* Motivational Message */}
          <div className="text-center text-sm text-muted-foreground">
            {isGoalReached ? (
              <p>Suurepärane töö! Sa oled jõudnud oma nädala eesmärgini.</p>
            ) : (
              <p>Iga treening toob sind lähemale oma eesmärgile.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
