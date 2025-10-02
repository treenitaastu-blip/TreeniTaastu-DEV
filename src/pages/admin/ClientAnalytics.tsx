import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User, Calendar, TrendingUp, Activity, Target, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ProgressChart from "@/components/analytics/ProgressChart";

type UUID = string;

type ClientStats = {
  user_id: UUID;
  email: string | null;
  total_sessions: number;
  completed_sessions: number;
  completion_rate: number;
  total_volume_kg: number;
  total_reps: number;
  total_sets: number;
  avg_rpe: number;
  current_streak: number;
  best_streak: number;
  last_workout_date: string | null;
  first_workout_date: string | null;
  active_programs: number;
};

type WeeklyData = {
  week_start: string;
  sessions: number;
  volume_kg: number;
  avg_rpe: number;
};

export default function ClientAnalytics() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);

  useEffect(() => {
    const loadClientStats = async () => {
      if (!userId) return;
      
      setLoading(true);
      setError(null);

      try {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email")
          .eq("id", userId)
          .single();

        if (profileError) throw profileError;

        // Get workout sessions stats
        const { data: sessions, error: sessionsError } = await supabase
          .from("workout_sessions")
          .select(`
            id,
            started_at,
            ended_at,
            client_program_id,
            set_logs (
              id,
              reps_done,
              weight_kg_done
            )
          `)
          .eq("user_id", userId)
          .order("started_at", { ascending: false });

        if (sessionsError) throw sessionsError;

        // Get user streaks
        const { data: streaks } = await supabase
          .from("user_streaks")
          .select("current_streak, best_streak, last_workout_date")
          .eq("user_id", userId)
          .single();

        // Get active programs count
        const { data: programs, error: programsError } = await supabase
          .from("client_programs")
          .select("id")
          .eq("assigned_to", userId)
          .eq("is_active", true);

        if (programsError) throw programsError;

        // Calculate stats
        const totalSessions = sessions?.length || 0;
        const completedSessions = sessions?.filter(s => s.ended_at)?.length || 0;
        const completionRate = totalSessions > 0 ? completedSessions / totalSessions : 0;

        let totalVolumeKg = 0;
        let totalReps = 0;
        let totalSets = 0;
        

        sessions?.forEach(session => {
          session.set_logs?.forEach(setLog => {
            if (setLog.weight_kg_done && setLog.reps_done) {
              totalVolumeKg += setLog.weight_kg_done * setLog.reps_done;
              totalReps += setLog.reps_done;
              totalSets += 1;
            }
          });
        });

        // Get RPE data
        const { data: rpeData } = await supabase
          .from("rpe_history")
          .select("rpe")
          .eq("user_id", userId);

        const avgRpe = rpeData?.length 
          ? rpeData.reduce((acc, r) => acc + Number(r.rpe), 0) / rpeData.length 
          : 0;

        const clientStats: ClientStats = {
          user_id: userId,
          email: profile.email,
          total_sessions: totalSessions,
          completed_sessions: completedSessions,
          completion_rate: completionRate,
          total_volume_kg: totalVolumeKg,
          total_reps: totalReps,
          total_sets: totalSets,
          avg_rpe: avgRpe,
          current_streak: streaks?.current_streak || 0,
          best_streak: streaks?.best_streak || 0,
          last_workout_date: streaks?.last_workout_date || null,
          first_workout_date: sessions?.[sessions.length - 1]?.started_at || null,
          active_programs: programs?.length || 0,
        };

        setStats(clientStats);

        // Get weekly data for chart - build it from session data
        const weeklyStats: Record<string, { sessions: number; volume: number; rpe_sum: number; rpe_count: number }> = {};
        
        sessions?.forEach(session => {
          if (!session.started_at) return;
          
          const weekStart = getWeekStart(new Date(session.started_at));
          const weekKey = weekStart.toISOString().slice(0, 10);
          
          if (!weeklyStats[weekKey]) {
            weeklyStats[weekKey] = { sessions: 0, volume: 0, rpe_sum: 0, rpe_count: 0 };
          }
          
          if (session.ended_at) {
            weeklyStats[weekKey].sessions += 1;
          }
          
          session.set_logs?.forEach(setLog => {
            if (setLog.weight_kg_done && setLog.reps_done) {
              weeklyStats[weekKey].volume += setLog.weight_kg_done * setLog.reps_done;
            }
          });
        });

        const weeklyFormatted: WeeklyData[] = Object.entries(weeklyStats)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 12)
          .map(([weekStart, stats]) => ({
            week_start: new Date(weekStart).toLocaleDateString("et-EE"),
            sessions: stats.sessions,
            volume_kg: stats.volume,
            avg_rpe: stats.rpe_count > 0 ? stats.rpe_sum / stats.rpe_count : 0,
          }));
          
        setWeeklyData(weeklyFormatted);

      } catch (err) {
        const message = err instanceof Error ? err.message : "Viga kliendi andmete laadimisel";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadClientStats();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded-lg bg-muted"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border bg-card p-6 shadow-soft space-y-4">
                  <div className="h-6 w-32 rounded bg-muted"></div>
                  <div className="h-8 w-24 rounded bg-muted"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Button onClick={() => navigate("/admin/programs")} variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tagasi programmide juurde
          </Button>
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center shadow-soft">
            <div className="text-xl font-semibold text-destructive mb-2">Viga andmete laadimisel</div>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => num.toLocaleString("et-EE", { maximumFractionDigits: 1 });
  const formatPercent = (num: number) => `${(num * 100).toFixed(1)}%`;
  
  // Helper function to get week start (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button onClick={() => navigate("/admin/programs")} variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tagasi programmide juurde
          </Button>
          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Kliendi Statistika
              </h1>
              <p className="text-muted-foreground">{stats.email}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Sessioonid kokku</h3>
            </div>
            <div className="text-3xl font-bold text-primary">{stats.total_sessions}</div>
            <p className="text-sm text-muted-foreground">
              {stats.completed_sessions} lõpetatud
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-5 w-5 text-success" />
              <h3 className="font-semibold">Lõpetamise määr</h3>
            </div>
            <div className="text-3xl font-bold text-success">
              {formatPercent(stats.completion_rate)}
            </div>
            <p className="text-sm text-muted-foreground">
              Lõpetatud / alustatud
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-5 w-5 text-accent" />
              <h3 className="font-semibold">Maht kokku</h3>
            </div>
            <div className="text-3xl font-bold text-accent">
              {formatNumber(stats.total_volume_kg)}
            </div>
            <p className="text-sm text-muted-foreground">kg × kordused</p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold">Aktiivne sari</h3>
            </div>
            <div className="text-3xl font-bold text-orange-500">
              {stats.current_streak}
            </div>
            <p className="text-sm text-muted-foreground">
              Parim: {stats.best_streak} päeva
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold">Kordused kokku</h3>
            </div>
            <div className="text-3xl font-bold text-blue-500">
              {formatNumber(stats.total_reps)}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatNumber(stats.total_sets)} setti
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold">Keskmine RPE</h3>
            </div>
            <div className="text-3xl font-bold text-purple-500">
              {stats.avg_rpe > 0 ? formatNumber(stats.avg_rpe) : "—"}
            </div>
            <p className="text-sm text-muted-foreground">
              Tajutud koormus (1-10)
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">Aktiivsed programmid</h3>
            </div>
            <div className="text-3xl font-bold text-green-500">
              {stats.active_programs}
            </div>
            <p className="text-sm text-muted-foreground">
              Käimasolevaid programme
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-5 w-5 text-gray-500" />
              <h3 className="font-semibold">Viimane treening</h3>
            </div>
            <div className="text-lg font-bold text-gray-500">
              {stats.last_workout_date 
                ? new Date(stats.last_workout_date).toLocaleDateString("et-EE")
                : "—"
              }
            </div>
            <p className="text-sm text-muted-foreground">
              Viimane aktiivne päev
            </p>
          </div>
        </div>

        {/* Enhanced Progress Analytics */}
        <Card className="border-0 shadow-soft bg-gradient-to-br from-primary/5 to-accent/5 mb-6">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Progressi Analüütika
              <div className="ml-auto">
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  Täiustatud
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyData.length > 0 ? (
              <ProgressChart 
                weeklyData={weeklyData}
                stats={{
                  total_sessions: stats.total_sessions,
                  completion_rate: stats.completion_rate,
                  total_volume_kg: stats.total_volume_kg,
                  current_streak: stats.current_streak,
                  avg_rpe: stats.avg_rpe
                }}
              />
            ) : (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Veel pole piisavalt andmeid
                </h3>
                <p className="text-muted-foreground">
                  Graafikud ilmuvad pärast mõningaid treeningsessioone
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}