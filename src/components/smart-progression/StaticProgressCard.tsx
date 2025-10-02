import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Flame, Target, TrendingUp, Clock } from "lucide-react";
import { StaticProgramProgress } from "@/hooks/useStaticProgression";

interface StaticProgressCardProps {
  staticProgress: StaticProgramProgress;
  onContinue?: () => void;
  onViewProgress?: () => void;
  isLoading?: boolean;
  hideButtons?: boolean;
}

export const StaticProgressCard = ({
  staticProgress,
  onContinue,
  onViewProgress,
  isLoading = false,
  hideButtons = false,
}: StaticProgressCardProps) => {
  const getMotivationalMessage = () => {
    const { streak_days, progress_percentage } = staticProgress;
    
    if (progress_percentage >= 100) {
      return "🎉 Programm lõpetatud! Suurepärane töö!";
    }
    if (streak_days >= 7) {
      return "🔥 Uskumatu sari! Sa oled tules!";
    }
    if (streak_days >= 3) {
      return "💪 Suurepärane järjekindlus! Jätka samas vaimus!";
    }
    if (streak_days === 0) {
      return "🌟 Valmis järgmiseks treeninguks?";
    }
    return "📈 Iga treening viib sind edasi!";
  };

  const getStreakColor = () => {
    if (staticProgress.streak_days >= 7) return "text-orange-600";
    if (staticProgress.streak_days >= 3) return "text-yellow-600";
    return "text-blue-600";
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Treeningu Progress</CardTitle>
          <Badge variant={staticProgress.has_started ? "default" : "secondary"}>
            {staticProgress.has_started ? "Aktiivne" : "Valmis alustamiseks"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{staticProgress.completed_days} / {staticProgress.total_days} päeva</span>
            <span>{Math.round(staticProgress.progress_percentage)}% tehtud</span>
          </div>
          <Progress value={staticProgress.progress_percentage} className="h-2" />
        </div>

        {/* Key Stats */}
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <Flame className={`h-4 w-4 ${getStreakColor()}`} />
            <div className="text-sm">
              <div className="font-medium">{staticProgress.streak_days} päeva sari</div>
              <div className="text-muted-foreground">Praegune sari</div>
            </div>
          </div>
        </div>

        {/* Weekend Notice */}
        {false && (
          <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div className="text-sm">
              <div className="font-medium text-blue-800 dark:text-blue-200">
                Nädalavahetuse Paus
              </div>
              <div className="text-blue-600 dark:text-blue-400">
                Programm jätkub esmaspäeval
              </div>
            </div>
          </div>
        )}

        {/* Motivational Message */}
        <div className="p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
          <div className="text-sm font-medium text-center">
            {getMotivationalMessage()}
          </div>
        </div>

        {/* Action Buttons */}
        {!hideButtons && (
          <div className="flex gap-2 pt-2">
            {staticProgress.has_started && (
              <Button
                onClick={onContinue}
                disabled={isLoading}
                className="flex-1"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {isLoading ? 'Laadin...' : 'Jätka Treeningut'}
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={onViewProgress}
              size="sm"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Vaata Progressi
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};