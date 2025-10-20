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
      // Get workout sessions stats
      const { data: sessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select(`
          id,
          started_at,
          ended_at,
          set_logs (
            id,
            reps_done,
            weight_kg_done
          )
        `)
        .eq("user_id", clientId)
        .order("started_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get streaks
      const { data: streaks } = await supabase
        .from("user_streaks")
        .select("current_streak, best_streak")
        .eq("user_id", clientId)
        .single();

      // Get active programs
      const { data: programs, error: programsError } = await supabase
        .from("client_programs")
        .select("id")
        .eq("assigned_to", clientId)
        .eq("is_active", true);

      if (programsError) throw programsError;

      // Get RPE data
      const { data: rpeData } = await supabase
        .from("rpe_history")
        .select("rpe")
        .eq("user_id", clientId);

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

      const avgRpe = rpeData?.length 
        ? rpeData.reduce((acc, r) => acc + Number(r.rpe), 0) / rpeData.length 
        : 0;

      const clientStats: ClientStats = {
        total_sessions: totalSessions,
        completed_sessions: completedSessions,
        completion_rate: completionRate,
        total_volume_kg: totalVolumeKg,
        total_reps: totalReps,
        total_sets: totalSets,
        avg_rpe: avgRpe,
        current_streak: streaks?.current_streak || 0,
        best_streak: streaks?.best_streak || 0,
        active_programs: programs?.length || 0,
      };

      setStats(clientStats);

      // Build weekly data for charts (last 12 weeks, fill gaps)
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

      const last12Weeks = getLastNWeeks(12);
      const weeklyFormatted: WeeklyData[] = last12Weeks.map(d => {
        const key = d.toISOString().slice(0, 10);
        const s = weeklyStats[key] || { sessions: 0, volume: 0, rpe_sum: 0, rpe_count: 0 };
        return {
          week_start: d.toLocaleDateString("et-EE"),
          sessions: s.sessions,
          volume_kg: s.volume,
          avg_rpe: s.rpe_count > 0 ? s.rpe_sum / s.rpe_count : 0,
        };
      });

      setWeeklyData(weeklyFormatted);

      // Load journal entries
      const { data: journalData, error: journalError } = await supabase
        .from("training_journal")
        .select("id, title, content, mood, energy_level, motivation, created_at")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (journalError) throw journalError;
      setJournalEntries(journalData || []);

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

            {weeklyData.length === 0 && journalEntries.length === 0 && (
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