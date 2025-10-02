import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, TrendingUp, Settings, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ProgramProgress } from "@/hooks/useSmartProgression";

interface ProgramProgressCardProps {
  programProgress: ProgramProgress;
  onAutoProgress?: () => void;
  onSettings?: () => void;
  onComplete?: () => void;
  isAutoProgressing?: boolean;
}

export const ProgramProgressCard = ({
  programProgress,
  onAutoProgress,
  onSettings,
  onComplete,
  isAutoProgressing = false,
}: ProgramProgressCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'archived':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'archived':
        return 'Archived';
      default:
        return status;
    }
  };

  const weeksRemaining = Math.max(0, (programProgress.duration_weeks ?? 0) - (programProgress.weeks_elapsed ?? 0));

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Training Program Progress</CardTitle>
          <Badge className={getStatusColor(programProgress.status ?? 'active')}>
            {getStatusText(programProgress.status ?? 'active')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Week {programProgress.weeks_elapsed ?? 0} of {programProgress.duration_weeks ?? 0}</span>
            <span>{Math.round(programProgress.progress_percentage ?? 0)}% complete</span>
          </div>
          <Progress value={programProgress.progress_percentage ?? 0} className="h-2" />
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">{weeksRemaining} weeks left</div>
              <div className="text-muted-foreground">
                {programProgress.start_date 
                  ? `Started ${format(new Date(programProgress.start_date), 'MMM d')}`
                  : 'Not started'
                }
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <div className="font-medium">
                {programProgress.auto_progression_enabled ? 'Smart AI' : 'Manual'}
              </div>
              <div className="text-muted-foreground">Progression Mode</div>
            </div>
          </div>
        </div>

        {/* Completion Status */}
        {programProgress.status === 'completed' && programProgress.completed_at && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div className="text-sm">
              <div className="font-medium text-green-800 dark:text-green-200">
                Program Completed!
              </div>
              <div className="text-green-600 dark:text-green-400">
                Finished on {format(new Date(programProgress.completed_at), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
        )}

        {/* Due for Completion */}
        {(programProgress.is_due_for_completion ?? false) && programProgress.status === 'active' && (
          <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <Clock className="h-5 w-5 text-yellow-600" />
            <div className="text-sm">
              <div className="font-medium text-yellow-800 dark:text-yellow-200">
                Program Duration Reached
              </div>
              <div className="text-yellow-600 dark:text-yellow-400">
                Ready for completion review
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {programProgress.status === 'active' && (programProgress.auto_progression_enabled ?? false) && (
            <Button
              onClick={onAutoProgress}
              disabled={isAutoProgressing}
              className="flex-1"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {isAutoProgressing ? 'Updating...' : 'Auto-Progress'}
            </Button>
          )}
          
          {programProgress.status === 'active' && (
            <Button
              variant="outline"
              onClick={onSettings}
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          )}
          
          {(programProgress.is_due_for_completion ?? false) && programProgress.status === 'active' && onComplete && (
            <Button
              onClick={onComplete}
              variant="default"
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Program
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};