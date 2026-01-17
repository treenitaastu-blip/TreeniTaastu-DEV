import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProgressChart from "@/components/analytics/ProgressChart";
import { ArrowLeft, Users, TrendingUp, Activity, BookOpen, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Client = {
  id: string;
  email: string | null;
};

type ClientStats = {
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
  joint_pain: boolean;
  joint_pain_location: string | null;
  fatigue_level: number;
  energy_level: string;
  notes: string | null;
  created_at: string;
  avg_rpe: number | null;
};

export default function ClientSpecificAnalytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [workoutFeedback, setWorkoutFeedback] = useState<WorkoutFeedback[]>([]);
  const [staticProgramCompletion, setStaticProgramCompletion] = useState<number>(0);
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

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
      };

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

      // Load journal entries
      const { data: journalData, error: journalError } = await supabase
        .from("training_journal")
        .select("id, title, content, mood, energy_level, motivation, created_at")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (journalError) throw journalError;
      setJournalEntries(journalData || []);

      // Load workout feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("workout_feedback")
        .select("id, session_id, joint_pain, joint_pain_location, fatigue_level, energy_level, notes, created_at")
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

      // Combine feedback with RPE data
      const feedbackWithRPE: WorkoutFeedback[] = (feedbackData || []).map(f => ({
        ...f,
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

            {/* Client Information */}
            <Card className="rounded-2xl shadow-soft">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Kliendi Info
                  </CardTitle>
                  <Button
                    onClick={() => navigate(`/admin/client-analytics/${selectedClientId}`)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Vaata täpset analüütikat
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Viimane sisselogimine</p>
                    <p className="text-lg font-semibold">
                      {lastLogin 
                        ? new Date(lastLogin).toLocaleDateString("et-EE", {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : "Tundmatu"
                      }
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Staatilised programmid</p>
                    <p className="text-lg font-semibold">
                      {staticProgramCompletion} lõpetatud päeva
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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

            {/* Joint Pain Reports */}
            {workoutFeedback.filter(f => f.joint_pain).length > 0 && (
              <Card className="rounded-2xl shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Liigesevalu raportid ({workoutFeedback.filter(f => f.joint_pain).length} märget)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {workoutFeedback
                      .filter(f => f.joint_pain)
                      .map((feedback) => (
                        <div key={feedback.id} className="rounded-xl border bg-card/50 p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-destructive">⚠️ Liigesevalu</h4>
                              <p className="text-xs text-muted-foreground">{formatDate(feedback.created_at)}</p>
                            </div>
                          <div className="flex items-center gap-3 text-sm flex-wrap">
                            {feedback.avg_rpe !== null && (
                              <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-1 rounded-full text-xs font-medium">
                                Keskmine RPE: {feedback.avg_rpe.toFixed(1)}
                              </span>
                            )}
                            <span className="text-orange-600">😰 {feedback.fatigue_level}/10</span>
                            <span className={`${
                              feedback.energy_level === 'high' ? 'text-green-600' : 
                              feedback.energy_level === 'normal' ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              ⚡ {feedback.energy_level === 'high' ? 'Kõrge' : 
                                  feedback.energy_level === 'normal' ? 'Normaalne' : 'Madal'}
                            </span>
                          </div>
                          </div>
                          {feedback.joint_pain_location && (
                            <div className="mb-2">
                              <p className="text-sm font-medium text-destructive">📍 Valu asukoht:</p>
                              <p className="text-sm text-muted-foreground">{feedback.joint_pain_location}</p>
                            </div>
                          )}
                          {feedback.notes && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Märkused:</strong> {feedback.notes}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Client Feedback Summary */}
            {workoutFeedback.length > 0 && (
              <Card className="rounded-2xl shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Kliendi tagasiside ({workoutFeedback.length} märget)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {workoutFeedback.map((feedback) => (
                      <div key={feedback.id} className="rounded-xl border bg-card/50 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">
                              {feedback.joint_pain ? "⚠️ Liigesevalu" : "✅ Probleemideta"}
                            </h4>
                            <p className="text-xs text-muted-foreground">{formatDate(feedback.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-3 text-sm flex-wrap">
                            {feedback.avg_rpe !== null && (
                              <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-1 rounded-full text-xs font-medium">
                                Keskmine RPE: {feedback.avg_rpe.toFixed(1)}
                              </span>
                            )}
                            <span className={`${
                              feedback.fatigue_level >= 8 ? 'text-red-600' : 
                              feedback.fatigue_level >= 5 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              😰 {feedback.fatigue_level}/10
                            </span>
                            <span className={`${
                              feedback.energy_level === 'high' ? 'text-green-600' : 
                              feedback.energy_level === 'normal' ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              ⚡ {feedback.energy_level === 'high' ? 'Kõrge' : 
                                  feedback.energy_level === 'normal' ? 'Normaalne' : 'Madal'}
                            </span>
                          </div>
                        </div>
                        {feedback.joint_pain_location && (
                          <div className="mb-2">
                            <p className="text-sm font-medium text-destructive">📍 Valu asukoht:</p>
                            <p className="text-sm text-muted-foreground">{feedback.joint_pain_location}</p>
                          </div>
                        )}
                        {feedback.notes && (
                          <p className="text-sm text-muted-foreground">
                            <strong>Märkused:</strong> {feedback.notes}
                          </p>
                        )}
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