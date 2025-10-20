import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Target, 
  Lock, 
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
  isStarted?: boolean; // opened but not completed yet
}

export default function DayTile({ day, onClick, className = "", isStarted }: DayTileProps) {
  const getTileStyles = () => {
    if (day.isCompleted) {
      return "bg-success text-success-foreground border-success hover:bg-success/90 shadow-success/20";
    }
    // started but not completed: highlight in red
    if (isStarted && !day.isWeekend) {
      return "bg-red-50 text-red-800 border-red-300 hover:bg-red-100 shadow-red-100 cursor-pointer";
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
    if (isStarted && !day.isWeekend) {
      return "Alustatud";
    }
    if (day.isWeekend) {
      return "Lõõgastus";
    }
    if (day.isUnlocked && !day.isCompleted) {
      return "Avatud";
    }
    return "Lukustatud";
  };

  const getStatusColor = () => {
    if (day.isCompleted) {
      return "text-success-foreground";
    }
    if (isStarted && !day.isWeekend) {
      return "text-red-700";
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
        isClickable ? 'hover:scale-105 hover:shadow-lg active:scale-95' : ''
      } ${className}`}
      onClick={isClickable ? onClick : undefined}
    >
      <CardContent className="p-2 sm:p-3 text-center min-h-[70px] sm:min-h-[80px] flex flex-col justify-center">
        {/* Day Number and Icon */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
          {getIcon()}
          <span className="font-bold text-base sm:text-lg">{day.dayNumber}</span>
        </div>
        
        {/* Status Text */}
        <div className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
        

        {/* Weekend Badge */}
        {day.isWeekend && (
          <Badge variant="secondary" className="mt-2 text-xs">
            <Brain className="h-3 w-3 mr-1" />
            Puhkepäev
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
