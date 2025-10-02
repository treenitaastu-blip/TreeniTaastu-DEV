import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Calendar, Award } from "lucide-react";
import { useCustomHabits } from "@/hooks/useCustomHabits";

type HabitStats = {
  habits: Array<{
    habitId: string;
    habitTitle: string;
    completions: number;
    completionRate: number;
  }>;
  totalCompletions: number;
  averagePerDay: number;
  overallCompletionRate: number;
};

export function HabitStatsModal() {
  const { getHabitStats } = useCustomHabits();
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getHabitStats();
      setStats(data);
    } catch (e) {
      console.error("Failed to load habit stats:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !stats) {
      loadStats();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-9 p-0">
          <BarChart3 className="h-4 w-4" />
          <span className="sr-only">Harjumuste statistika</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Harjumuste statistika (viimased 30 päeva)
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Award className="h-4 w-4 text-green-500" />
                    Kokku täidetud
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCompletions}</div>
                  <p className="text-sm text-muted-foreground">harjumust</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    Keskmine päevas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averagePerDay}</div>
                  <p className="text-sm text-muted-foreground">harjumust</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    Täitmise määr
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.overallCompletionRate}%</div>
                  <p className="text-sm text-muted-foreground">kogu perioodil</p>
                </CardContent>
              </Card>
            </div>

            {/* Individual Habit Stats */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Harjumuste detailid</h3>
              {stats.habits.length > 0 ? (
                <div className="space-y-3">
                  {stats.habits
                    .sort((a, b) => b.completionRate - a.completionRate)
                    .map((habit) => (
                      <Card key={habit.habitId} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{habit.habitTitle}</span>
                          <span className="text-sm text-muted-foreground">
                            {habit.completions}/30 päeva
                          </span>
                        </div>
                        <Progress 
                          value={habit.completionRate} 
                          className="h-2 mb-2" 
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{habit.completionRate}% täidetud</span>
                          <span>
                            {habit.completionRate >= 80 ? "🏆 Suurepärane!" : 
                             habit.completionRate >= 60 ? "👍 Hea tulemus!" :
                             habit.completionRate >= 40 ? "📈 Paraneb!" : "💪 Jätka püüdlusi!"}
                          </span>
                        </div>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Harjumuste andmed puuduvad</p>
                  <p className="text-sm">Alusta harjumuste täitmisega, et statistikat näha!</p>
                </div>
              )}
            </div>

            {/* Motivational Message */}
            {stats.overallCompletionRate > 0 && (
              <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="font-medium">
                      {stats.overallCompletionRate >= 80 ? 
                        "Fantastiline! Sa oled tõeline harjumuste meister! 🌟" :
                        stats.overallCompletionRate >= 60 ? 
                        "Suurepärane töö! Sa oled õigel teel! 🚀" :
                        stats.overallCompletionRate >= 40 ? 
                        "Hea algus! Jätka samas vaimus! 💪" :
                        "Iga samm loeb! Ära anna alla! 🌱"
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Statistika laadimine ebaõnnestus</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadStats}
              className="mt-2"
            >
              Proovi uuesti
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}