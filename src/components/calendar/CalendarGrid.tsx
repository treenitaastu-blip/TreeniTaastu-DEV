import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Trophy, Target } from 'lucide-react';
import DayTile, { CalendarDay } from './DayTile';

// CalendarDay interface is now imported from DayTile

interface CalendarGridProps {
  days: CalendarDay[];
  totalDays: number;
  completedDays: number;
  onDayClick: (dayNumber: number, isWeekend: boolean) => void;
  className?: string;
}

export default function CalendarGrid({
  days,
  totalDays,
  completedDays,
  onDayClick,
  className = ""
}: CalendarGridProps) {
  const progressPercentage = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Progress Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-bold">20-päevane treeningprogramm</h2>
                <p className="text-sm text-muted-foreground">
                  Järgi oma edusammud ja ava uusi päevi
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {completedDays}/{totalDays}
              </div>
              <div className="text-sm text-muted-foreground">päeva tehtud</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Edu</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 sm:gap-2">
        {days.map((day) => (
          <DayTile
            key={day.dayNumber}
            day={day}
            onClick={() => onDayClick(day.dayNumber, day.isWeekend)}
            className="touch-manipulation"
            isStarted={day.isUnlocked && !day.isCompleted}
          />
        ))}
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted border-2 border-muted-foreground/20"></div>
              <span>Lukustatud</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/20 border-2 border-primary"></div>
              <span>Avatud</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-success border-2 border-success"></div>
              <span>Tehtud</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-accent border-2 border-accent"></div>
              <span>Nädalavahetus</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

