// src/pages/PersonalTrainingStats.tsx
import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProgressChart from "@/components/analytics/ProgressChart";
import { 
  ArrowLeft, 
  TrendingUp, 
  Calendar, 
  Timer, 
  Target,
  BarChart3,
  Activity
} from "lucide-react";

type SessionSummary = {
  session_id: string;
  user_id: string;
  client_program_id: string | null;
  client_day_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  total_sets_completed: number | null;
  avg_rpe: number | null;
  day_title: string | null;
  program_title: string | null;
  set_logs?: Array<{
    weight_kg_done: number | null;
    reps_done: number | null;
    seconds_done: number | null;
  }>;
};

type WeeklySummary = {
  user_id: string;
  iso_week: string;
  sessions_count: number;
  completed_sessions: number;
  total_minutes: number;
  avg_minutes_per_session: number;
};

type WeeklyChartData = {
  week_start: string;
  sessions: number;
  volume_kg: number;
  avg_rpe: number;
};

export default function PersonalTrainingStats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trackPageView, trackButtonClick } = useTrackEvent();
  
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklySummary[]>([]);
  const [weeklyChartData, setWeeklyChartData] = useState<WeeklyChartData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) {
        return;
      }
      
      try {
        setLoading(true);
        setError(null);

        // Force session refresh to ensure we have the latest tokens
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error("Autentimise viga: " + sessionError.message);
        }

        if (!session) {
          throw new Error("Kasutaja pole sisse logitud");
        }

        // Load session summaries with set logs for proper volume calculation
        const { data: sessionData, error: sessionError2 } = await supabase
          .from("v_session_summary")
          .select(`
            *,
            set_logs(
              weight_kg_done,
              reps_done,
              seconds_done
            )
          `)
          .eq("user_id", user.id)
          .order("started_at", { ascending: false })
          .limit(50);

        if (sessionError2) throw sessionError2;
        setSessions((sessionData as SessionSummary[]) || []);

        // Load weekly rollup for charts from extended weekly view
        const { data: weeklyRollup, error: weeklyRollupError } = await supabase
          .from("v_user_weekly_extended")
          .select("week_start, sessions_count, weekly_volume_kg, weekly_avg_rpe")
          .eq("user_id", user.id)
          .order("week_start", { ascending: false })
          .limit(12);

        if (weeklyRollupError) throw weeklyRollupError;
        const weeklyChart: WeeklyChartData[] = (weeklyRollup || []).map((w: any) => ({
          week_start: new Date(w.week_start).toLocaleDateString("et-EE"),
          sessions: Number(w.sessions_count) || 0,
          volume_kg: Number(w.weekly_volume_kg) || 0,
          avg_rpe: Number(w.weekly_avg_rpe) || 0,
        }));
        setWeeklyChartData(weeklyChart);

        // Also keep simple weekly stats if needed elsewhere
        const { data: weeklyData, error: weeklyError } = await supabase
          .from("v_user_weekly")
          .select("*")
          .eq("user_id", user.id)
          .order("iso_week", { ascending: false })
          .limit(12);
        if (weeklyError) throw weeklyError;
        setWeeklyStats((weeklyData as unknown as WeeklySummary[]) || []);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Viga statistika laadimisel");
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user]);

  // Track page view on mount
  useEffect(() => {
    if (user) {
      trackPageView('personal_training_stats', { 
        user_type: 'authenticated',
        sessions_count: sessions.length 
      });
    }
  }, [user, trackPageView, sessions.length]);

  const overallStats = useMemo(() => {
    const totalSessions = sessions.filter(s => s.ended_at).length;
    
    // Calculate actual total volume and sets from set logs
    let totalVolumeKg = 0;
    let actualTotalSets = 0;
    
    sessions.forEach(session => {
      if (session.set_logs && Array.isArray(session.set_logs)) {
        session.set_logs.forEach((setLog: any) => {
          actualTotalSets += 1;
          if (setLog.weight_kg_done && setLog.reps_done) {
            totalVolumeKg += setLog.weight_kg_done * setLog.reps_done;
          }
        });
      }
    });
    
    const avgRPE = sessions.length > 0 
      ? sessions.filter(s => s.avg_rpe).reduce((sum, s) => sum + (s.avg_rpe || 0), 0) / sessions.filter(s => s.avg_rpe).length 
      : 0;
    
    const completedSessions = sessions.filter(s => s.ended_at);
    const avgDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / completedSessions.length
      : 0;

    return {
      totalSessions,
      totalSets: actualTotalSets,
      totalVolumeKg,
      avgRPE,
      avgDuration
    };
  }, [sessions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded-lg bg-muted"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, _i) => (
                <div key={_i} className="rounded-2xl border bg-card p-6 shadow-soft space-y-4">
                  <div className="h-6 w-32 rounded bg-muted"></div>
                  <div className="h-8 w-20 rounded bg-muted"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center shadow-soft">
            <div className="text-xl font-semibold text-destructive mb-2">Viga andmete laadimisel</div>
            <p className="text-destructive/80 mb-6">{error}</p>
            <Button 
              onClick={() => {
                trackButtonClick('back_to_programs_error', '/programs', 'personal_training_stats_error');
                navigate("/programs");
              }} 
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tagasi programmide juurde
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            onClick={() => {
              trackButtonClick('back_to_programs', '/programs', 'personal_training_stats');
              navigate("/programs");
            }} 
            variant="ghost" 
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tagasi programmide juurde
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Minu Statistika
          </h1>
          <p className="mt-2 text-muted-foreground">
            Jälgi oma treeningu arengut ja saavutusi
          </p>
        </div>

        {/* Overview Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Treeninguid kokku</p>
                  <p className="text-2xl font-bold">{overallStats.totalSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-500/10 p-3">
                  <BarChart3 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kogu maht</p>
                  <p className="text-2xl font-bold">{Math.round(overallStats.totalVolumeKg)} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-500/10 p-3">
                  <Target className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seeriad kokku</p>
                  <p className="text-2xl font-bold">{overallStats.totalSets}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-orange-500/10 p-3">
                  <Timer className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Keskmine kestus</p>
                  <p className="text-2xl font-bold">{Math.round(overallStats.avgDuration)} min</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <div className="mb-8">
          <Card className="rounded-2xl shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Viimased treeningud
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="rounded-full bg-muted/50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">Pole veel treeninguid</h3>
                  <p className="text-muted-foreground mb-6">Alusta oma esimese treeninguga</p>
                  <Link to="/teenused">
                    <Button
                      onClick={() => trackButtonClick('view_services', '/teenused', 'personal_training_stats_empty')}
                    >
                      Vaata teenuseid
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.slice(0, 10).map((session) => (
                    <div key={session.session_id} className="rounded-xl border bg-card/50 p-4 transition-colors hover:bg-card/80">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {new Date(session.started_at).toLocaleDateString("et-EE", {
                              weekday: "long",
                              day: "numeric",
                              month: "long"
                            })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.day_title} • {session.total_sets_completed} seeriat
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {session.duration_minutes} min
                          </div>
                          {session.avg_rpe && session.avg_rpe > 0 && (
                            <div className="text-sm text-muted-foreground">
                              RPE: {session.avg_rpe?.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progress Charts */}
        {weeklyChartData.length > 0 && (
          <Card className="rounded-2xl shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                12 nädala progressi ülevaade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressChart 
                weeklyData={weeklyChartData}
                stats={{
                  total_sessions: overallStats.totalSessions,
                  completion_rate: overallStats.totalSessions > 0 ? overallStats.totalSessions / sessions.length : 0,
                  total_volume_kg: overallStats.totalVolumeKg,
                  current_streak: 0,
                  avg_rpe: overallStats.avgRPE
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Weekly Trends */}
        {weeklyStats.length > 0 && (
          <Card className="rounded-2xl shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Nädalased tulemused
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyStats.slice(0, 8).map((week, _index) => (
                  <div key={week.iso_week} className="rounded-xl border bg-card/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">
                        {week.iso_week}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {week.sessions_count} treeningut
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Lõpetatud:</span>
                        <span className="ml-2 font-medium">{week.completed_sessions}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kokku aeg:</span>
                        <span className="ml-2 font-medium">{Math.round(week.total_minutes || 0)} min</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kesk. kestus:</span>
                        <span className="ml-2 font-medium">
                          {week.avg_minutes_per_session > 0 ? Math.round(week.avg_minutes_per_session) + " min" : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}