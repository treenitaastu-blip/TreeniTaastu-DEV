import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProgressChart from "@/components/analytics/ProgressChart";
import { ArrowLeft, Users, TrendingUp, Activity, BookOpen, BarChart3, Target, Calendar, Clock, User, Zap, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Client = {
  id: string;
  email: string | null;
};

type ClientStats = {
  user_id?: string;
  email?: string | null;
  total_sessions: number;
  completed_sessions: number;
  completion_rate: number;
  total_volume_kg: number;
  total_reps: number;
  total_sets: number;
  avg_rpe: number;
  current_streak: number;
  best_streak: number;
  active_programs: number;
  last_workout_date?: string | null;
  first_workout_date?: string | null;
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

type WorkoutFeedback = {
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

export default function ClientSpecificAnalytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const { toast } = useToast();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(userId || "");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [workoutFeedback, setWorkoutFeedback] = useState<WorkoutFeedback[]>([]);
  const [staticProgramCompletion, setStaticProgramCompletion] = useState<number>(0);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [lastActivityOnApp, setLastActivityOnApp] = useState<string | null>(null);
  const [selectedClientEmail, setSelectedClientEmail] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  // Auto-select client from URL param if provided
  useEffect(() => {
    if (userId && userId !== selectedClientId) {
      setSelectedClientId(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (selectedClientId) {
      loadClientData(selectedClientId);
    }
  }, [selectedClientId]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email")
        .neq("role", "admin")
        .order("email");

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast({ 
        title: "Viga", 
        description: "Klientide laadimise viga", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClientData = async (clientId: string) => {
    setStatsLoading(true);
    try {
      // Use optimized RPC function for stats (single query, database aggregations)
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_client_analytics', { p_user_id: clientId });

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
        active_programs: Number(statsResult.active_programs) || 0,
        last_workout_date: statsResult.last_workout_date || null,
        first_workout_date: statsResult.first_workout_date || null,
      };
      
      // Store client email for display
      setSelectedClientEmail(statsResult.email || null);

      setStats(clientStats);

      // Use optimized RPC function for weekly data (database aggregations)
      const { data: weeklyDataResult, error: weeklyError } = await supabase
        .rpc('get_client_weekly_analytics', { 
          p_user_id: clientId,
          p_weeks: 12 
        });

      if (weeklyError) {
        console.warn('Error loading weekly data:', weeklyError);
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

      // Get static program completion data (lightweight query)
      const { data: staticProgress, error: staticError } = await supabase
        .from("userprogress")
        .select("id")
        .eq("user_id", clientId)
        .limit(1000); // Limit to prevent huge queries

      if (staticError) {
        console.warn("Error loading static program data:", staticError);
      } else {
        setStaticProgramCompletion(staticProgress?.length || 0);
      }

      // Get last login information from profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("updated_at")
        .eq("id", clientId)
        .single();

      if (profileError) {
        console.warn("Error loading profile data:", profileError);
      } else {
        setLastLogin(profileData?.updated_at || null);
      }

      // Get last activity on app (MAX(last_activity_at) from workout_sessions)
      const { data: lastActivityData, error: lastActivityError } = await supabase
        .from("workout_sessions")
        .select("last_activity_at")
        .eq("user_id", clientId)
        .not("last_activity_at", "is", null)
        .order("last_activity_at", { ascending: false })
        .limit(1)
        .single();

      if (lastActivityError && lastActivityError.code !== 'PGRST116') {
        console.warn("Error loading last activity:", lastActivityError);
      } else {
        setLastActivityOnApp(lastActivityData?.last_activity_at || null);
      }

      // Load journal entries
      const { data: journalData, error: journalError } = await supabase
        .from("training_journal")
        .select("id, title, content, mood, energy_level, motivation, created_at")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (journalError) throw journalError;
      setJournalEntries(journalData || []);

      // Load workout feedback with session info
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
        .eq("user_id", clientId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (feedbackError) throw feedbackError;

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

      // Combine feedback with RPE data and session info
      const feedbackWithRPE: WorkoutFeedback[] = (feedbackData || []).map(f => ({
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

      setWorkoutFeedback(feedbackWithRPE);

    } catch (error) {
      console.error("Error loading client data:", error);
      toast({ 
        title: "Viga", 
        description: "Kliendi andmete laadimise viga", 
        variant: "destructive" 
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("et-EE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Helper: get Monday of the week for a given date
  const getWeekStart = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  };

  // Helper: last N week starts (ascending)
  const getLastNWeeks = (n: number) => {
    const weeks: Date[] = [];
    const today = new Date();
    let current = getWeekStart(today);
    // go back n-1 weeks
    const start = new Date(current);
    start.setUTCDate(current.getUTCDate() - (n - 1) * 7);
    for (let i = 0; i < n; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i * 7);
      weeks.push(d);
    }
    return weeks;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded-lg bg-muted"></div>
            <div className="h-10 w-64 rounded-lg bg-muted"></div>
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
          <Button onClick={() => navigate("/admin/analytics")} variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tagasi analüütika juurde
          </Button>
          <div className="flex items-center gap-4 mb-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Kliendi Analüütika
              </h1>
              <p className="text-muted-foreground">Vaata kliendi detailset progressi ja märkmeid</p>
            </div>
          </div>

          {/* Client Selection */}
          <div className="max-w-md">
            <label className="text-sm font-medium mb-2 block">Vali klient</label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Vali klient..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.email || "Tundmatu kasutaja"}
                </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedClientId ? (
          <div className="text-center py-12">
            <div className="rounded-full bg-muted/50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Vali klient</h3>
            <p className="text-muted-foreground">
              Vali ülalt klient, et näha tema detailset analüütikat
            </p>
          </div>
        ) : statsLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border bg-card p-6 shadow-soft space-y-4">
                  <div className="h-6 w-32 rounded bg-muted"></div>
                  <div className="h-8 w-24 rounded bg-muted"></div>
                </div>
              ))}
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-8">
            {/* Client Header */}
            {selectedClientEmail && (
              <div className="flex items-center gap-4 mb-2">
                <div className="rounded-full bg-primary/10 p-3">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedClientEmail}</h2>
                </div>
              </div>
            )}

            {/* Detailed Stats Grid */}
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
                  {((stats.completion_rate * 100).toFixed(1))}%
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
                  {stats.total_volume_kg.toLocaleString("et-EE", { maximumFractionDigits: 0 })}
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
                  {stats.total_reps.toLocaleString("et-EE")}
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats.total_sets.toLocaleString("et-EE")} setti
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold">Keskmine RPE</h3>
                </div>
                <div className="text-3xl font-bold text-purple-500">
                  {stats.avg_rpe > 0 ? stats.avg_rpe.toFixed(1) : "—"}
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

              {lastActivityOnApp && (
                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold">Viimane aktiivsus äppis</h3>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {new Date(lastActivityOnApp).toLocaleDateString("et-EE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Viimati kasutatud äppi
                  </p>
                </div>
              )}
            </div>

            {/* Weekly Progress Charts */}
            {weeklyData.length > 0 && (
              <Card className="rounded-2xl shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    12 nädala progressi analüütika
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProgressChart 
                    weeklyData={weeklyData}
                    stats={stats}
                    lastLogin={lastLogin}
                  />
                </CardContent>
              </Card>
            )}

            {/* Journal Entries */}
            {journalEntries.length > 0 && (
              <Card className="rounded-2xl shadow-soft">
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
                            <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
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

            {/* Client Feedback */}
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

            {weeklyData.length === 0 && journalEntries.length === 0 && workoutFeedback.length === 0 && (
              <div className="text-center py-12">
                <div className="rounded-full bg-muted/50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Pole veel andmeid</h3>
                <p className="text-muted-foreground">
                  See klient pole veel treeninguid alustanud
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Activity className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Viga andmete laadimisel</h3>
            <p className="text-muted-foreground">
              Kliendi andmeid ei õnnestunud laadida
            </p>
          </div>
        )}
      </div>
    </div>
  );
}