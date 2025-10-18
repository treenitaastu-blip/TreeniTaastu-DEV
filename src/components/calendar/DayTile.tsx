import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Target, 
  Lock, 
  Clock, 
  CheckCircle, 
  Heart,
  Brain
} from 'lucide-react';

export interface CalendarDay {
  dayNumber: number;
  isWeekend: boolean;
  isUnlocked: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  unlockTime?: string;
  quote?: {
    text: string;
    author: string;
  };
}

interface DayTileProps {
  day: CalendarDay;
  onClick: () => void;
  className?: string;
}

export default function DayTile({ day, onClick, className = "" }: DayTileProps) {
  const getTileStyles = () => {
    if (day.isCompleted) {
      return "bg-success text-success-foreground border-success hover:bg-success/90 shadow-success/20";
    }
    if (day.isWeekend) {
      return "bg-accent text-accent-foreground border-accent hover:bg-accent/90 shadow-accent/20";
    }
    if (day.isUnlocked) {
      return "bg-primary/20 text-primary border-primary hover:bg-primary/30 shadow-primary/20 cursor-pointer";
    }
    return "bg-muted text-muted-foreground border-muted-foreground/20 cursor-not-allowed shadow-muted/10";
  };

  const getIcon = () => {
    if (day.isCompleted) {
      return <CheckCircle className="h-5 w-5" />;
    }
    if (day.isWeekend) {
      return <Heart className="h-5 w-5" />;
    }
    if (day.isLocked) {
      return <Lock className="h-4 w-4" />;
    }
    return <Target className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (day.isCompleted) {
      return "Tehtud";
    }
    if (day.isWeekend) {
      return "Nädalavahetus";
    }
    if (day.isUnlocked && !day.isCompleted) {
      return "Mitte tehtud";
    }
    return "Lukustatud";
  };

  const getStatusColor = () => {
    if (day.isCompleted) {
      return "text-success-foreground";
    }
    if (day.isWeekend) {
      return "text-accent-foreground";
    }
    if (day.isUnlocked) {
      return "text-primary";
    }
    return "text-muted-foreground";
  };

  const isClickable = day.isUnlocked || day.isWeekend;

  return (
    <Card 
      className={`transition-all duration-200 ${getTileStyles()} ${
        isClickable ? 'hover:scale-105 hover:shadow-lg' : ''
      } ${className}`}
      onClick={isClickable ? onClick : undefined}
    >
      <CardContent className="p-3 text-center min-h-[80px] flex flex-col justify-center">
        {/* Day Number and Icon */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {getIcon()}
          <span className="font-bold text-lg">{day.dayNumber}</span>
        </div>
        
        {/* Status Text */}
        <div className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
        
        {/* Unlock Time for Locked Days */}
        {day.isLocked && day.unlockTime && (
          <div className="text-xs mt-1 opacity-75 flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            {day.unlockTime}
          </div>
        )}

        {/* Weekend Badge */}
        {day.isWeekend && (
          <Badge variant="secondary" className="mt-2 text-xs">
            <Brain className="h-3 w-3 mr-1" />
            Mindfulness
          </Badge>
        )}

        {/* Completion Badge */}
        {day.isCompleted && (
          <Badge variant="default" className="mt-2 text-xs bg-success">
            <Trophy className="h-3 w-3 mr-1" />
            Lõpetatud
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
