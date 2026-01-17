import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, User, Calendar, TrendingUp, Activity, Target, Clock, BookOpen, Zap, AlertTriangle } from "lucide-react";
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

type JournalEntry = {
  id: string;
  title: string;
  content: string;
  mood: number | null;
  energy_level: number | null;
  motivation: number | null;
  created_at: string;
};

type WorkoutFeedbackEntry = {
  id: string;
  session_id: string;
  energy: 'low' | 'normal' | 'high';
  joint_pain: boolean;
  joint_pain_location: string | null;
  notes: string | null;
  created_at: string;
  session_started_at: string | null;
  session_ended_at: string | null;
  avg_rpe: number | null;
};

export default function ClientAnalytics() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [workoutFeedback, setWorkoutFeedback] = useState<WorkoutFeedbackEntry[]>([]);

  const loadClientStats = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Use optimized RPC function for stats (single query, database aggregations)
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_client_analytics', { p_user_id: userId });

      if (statsError) throw statsError;

      if (!statsData || statsData.length === 0) {
        throw new Error('Kliendi andmeid ei leitud');
      }

      const statsResult = statsData[0];
      const clientStats: ClientStats = {
        user_id: statsResult.user_id,
        email: statsResult.email,
        total_sessions: Number(statsResult.total_sessions) || 0,
        completed_sessions: Number(statsResult.completed_sessions) || 0,
        completion_rate: Number(statsResult.completion_rate) || 0,
        total_volume_kg: Number(statsResult.total_volume_kg) || 0,
        total_reps: Number(statsResult.total_reps) || 0,
        total_sets: Number(statsResult.total_sets) || 0,
        avg_rpe: Number(statsResult.avg_rpe) || 0,
        current_streak: Number(statsResult.current_streak) || 0,
        best_streak: Number(statsResult.best_streak) || 0,
        last_workout_date: statsResult.last_workout_date || null,
        first_workout_date: statsResult.first_workout_date || null,
        active_programs: Number(statsResult.active_programs) || 0,
      };

      setStats(clientStats);

      // Use optimized RPC function for weekly data (database aggregations)
      const { data: weeklyDataResult, error: weeklyError } = await supabase
        .rpc('get_client_weekly_analytics', { 
          p_user_id: userId,
          p_weeks: 12 
        });

      if (weeklyError) {
        console.warn('Error loading weekly data:', weeklyError);
        // Fallback to empty array if weekly data fails
        setWeeklyData([]);
      } else {
        const weeklyFormatted: WeeklyData[] = (weeklyDataResult || []).map((week: any) => ({
          week_start: new Date(week.week_start).toLocaleDateString("et-EE"),
          sessions: Number(week.sessions) || 0,
          volume_kg: Number(week.volume_kg) || 0,
          avg_rpe: Number(week.avg_rpe) || 0,
        }));
        setWeeklyData(weeklyFormatted);
      }

      // Load journal entries
      const { data: journalData, error: journalError } = await supabase
        .from("training_journal")
        .select("id, title, content, mood, energy_level, motivation, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (journalError) {
        console.warn('Error loading journal entries:', journalError);
      } else {
        setJournalEntries(journalData || []);
      }

      // Load workout feedback with session info and average RPE
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("workout_feedback")
        .select(`
          id,
          session_id,
          energy,
          joint_pain,
          joint_pain_location,
          notes,
          created_at,
          workout_sessions:session_id(
            started_at,
            ended_at
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (feedbackError) {
        console.warn('Error loading workout feedback:', feedbackError);
        setWorkoutFeedback([]);
      } else {
        // Get average RPE for each session
        const sessionIds = (feedbackData || []).map(f => f.session_id);
        const rpeData: Record<string, number> = {};
        
        if (sessionIds.length > 0) {
          const { data: rpeResults, error: rpeError } = await supabase
            .from("exercise_notes")
            .select("session_id, rpe")
            .in("session_id", sessionIds)
            .not("rpe", "is", null);

          if (!rpeError && rpeResults) {
            // Calculate average RPE per session
            const rpeBySession: Record<string, number[]> = {};
            rpeResults.forEach(entry => {
              if (!rpeBySession[entry.session_id]) {
                rpeBySession[entry.session_id] = [];
              }
              if (entry.rpe !== null) {
                rpeBySession[entry.session_id].push(Number(entry.rpe));
              }
            });

            Object.keys(rpeBySession).forEach(sessionId => {
              const rpes = rpeBySession[sessionId];
              if (rpes.length > 0) {
                rpeData[sessionId] = rpes.reduce((a, b) => a + b, 0) / rpes.length;
              }
            });
          }
        }

        // Combine feedback with session data and RPE
        const feedbackWithData: WorkoutFeedbackEntry[] = (feedbackData || []).map(f => ({
          id: f.id,
          session_id: f.session_id,
          energy: f.energy,
          joint_pain: f.joint_pain,
          joint_pain_location: f.joint_pain_location,
          notes: f.notes,
          created_at: f.created_at,
          session_started_at: f.workout_sessions?.started_at || null,
          session_ended_at: f.workout_sessions?.ended_at || null,
          avg_rpe: rpeData[f.session_id] || null,
        }));

        setWorkoutFeedback(feedbackWithData);
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : "Viga kliendi andmete laadimisel";
      setError(message);
      console.error('Error loading client stats:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadClientStats();
  }, [loadClientStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded-lg bg-muted"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
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
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center shadow-sm">
            <div className="text-xl font-semibold text-destructive mb-2">Viga andmete laadimisel</div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadClientStats} variant="outline">
              Proovi uuesti
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => num.toLocaleString("et-EE", { maximumFractionDigits: 1 });
  const formatPercent = (num: number) => `${(num * 100).toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button onClick={() => navigate("/admin/client-analytics")} variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tagasi kliendi analüütika juurde
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
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Sessioonid kokku</h3>
            </div>
            <div className="text-3xl font-bold text-primary">{stats.total_sessions}</div>
            <p className="text-sm text-muted-foreground">
              {stats.completed_sessions} lõpetatud
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
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

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-5 w-5 text-accent" />
              <h3 className="font-semibold">Maht kokku</h3>
            </div>
            <div className="text-3xl font-bold text-accent">
              {formatNumber(stats.total_volume_kg)}
            </div>
            <p className="text-sm text-muted-foreground">kg × kordused</p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
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

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
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

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
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

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
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

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
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
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-accent/5 mb-6">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Progressi Analüütika
              <div className="ml-auto">
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  Optimeeritud
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
                  avg_rpe: stats.avg_rpe
                }}
                lastLogin={null}
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

        {/* Journal Entries */}
        {journalEntries.length > 0 && (
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-accent/5 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Kliendi märkmik ({journalEntries.length} märget)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {journalEntries.map((entry) => (
                  <div key={entry.id} className="rounded-xl border bg-card/50 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{entry.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString("et-EE", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                      {(entry.mood || entry.energy_level || entry.motivation) && (
                        <div className="flex items-center gap-3 text-sm">
                          {entry.mood && <span>😊 {entry.mood}/5</span>}
                          {entry.energy_level && <span>⚡ {entry.energy_level}/5</span>}
                          {entry.motivation && <span>🎯 {entry.motivation}/5</span>}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.content}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workout Feedback */}
        {workoutFeedback.length > 0 && (
          <Card className="border-0 shadow-sm bg-gradient-to-br from-accent/5 to-primary/5 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Kliendi tagasiside treeningsessioonide kohta ({workoutFeedback.length} tagasisidet)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workoutFeedback.map((feedback) => (
                  <div key={feedback.id} className="rounded-xl border bg-card/50 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium">
                            {feedback.session_ended_at 
                              ? new Date(feedback.session_ended_at).toLocaleDateString("et-EE", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                              : new Date(feedback.created_at).toLocaleDateString("et-EE")
                            }
                          </span>
                          {feedback.avg_rpe !== null && (
                            <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-1 rounded-full">
                              Keskmine RPE: {feedback.avg_rpe.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 flex-wrap text-sm">
                          <div className="flex items-center gap-2">
                            <Zap className={`h-4 w-4 ${
                              feedback.energy === 'high' ? 'text-green-500' : 
                              feedback.energy === 'normal' ? 'text-yellow-500' : 'text-gray-500'
                            }`} />
                            <span className="text-muted-foreground">
                              Energia: {
                                feedback.energy === 'high' ? 'Kõrge' : 
                                feedback.energy === 'normal' ? 'Normaalne' : 'Madal'
                              }
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {feedback.joint_pain ? (
                              <>
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="text-red-600">
                                  Liigesevalu{feedback.joint_pain_location ? ` (${feedback.joint_pain_location})` : ''}
                                </span>
                              </>
                            ) : (
                              <>
                                <Activity className="h-4 w-4 text-green-500" />
                                <span className="text-green-600">Pole liigesevalu</span>
                              </>
                            )}
                          </div>
                        </div>
                        {feedback.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            "{feedback.notes}"
                          </p>
                        )}
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
