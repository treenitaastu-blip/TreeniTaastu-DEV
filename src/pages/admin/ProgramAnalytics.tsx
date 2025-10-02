// src/pages/admin/ProgramAnalytics.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Calendar, 
  Target,
  BarChart3,
  Activity,
  Award,
  Dumbbell,
  User
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
};

type ProgramInfo = {
  id: string;
  title_override: string | null;
  start_date: string | null;
  is_active: boolean | null;
  assigned_to: string;
  profiles: { email: string | null; }[] | null;
  workout_templates: { title: string } | null;
};

export default function ProgramAnalytics() {
  const { programId } = useParams<{ programId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [programInfo, setProgramInfo] = useState<ProgramInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user || !programId) return;
      
      try {
        setLoading(true);
        setError(null);

        // Load program info from client_programs table directly
        const { data: programData, error: programError } = await supabase
          .from("client_programs")
          .select(`
            id,
            title_override,
            start_date,
            is_active,
            assigned_to,
            profiles!client_programs_assigned_to_fkey(email),
            workout_templates!client_programs_template_id_fkey(title)
          `)
          .eq("id", programId)
          .single();

        if (programError) throw programError;
        setProgramInfo(programData);

        // Load session summaries for this program's user
        const { data: sessionData, error: sessionError } = await supabase
          .from("v_session_summary")
          .select("*")
          .eq("user_id", programData.assigned_to)
          .order("started_at", { ascending: false });

        if (sessionError) throw sessionError;
        setSessions((sessionData as SessionSummary[]) || []);

      } catch (err) {
        console.error("Failed to load analytics:", err);
        setError(err instanceof Error ? err.message : "Viga andmete laadimisel");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [user, programId]);

  const overallStats = useMemo(() => {
    const completedSessions = sessions.filter(s => s.ended_at);
    const totalSessions = completedSessions.length;
    const totalSets = sessions.reduce((sum, s) => sum + (s.total_sets_completed || 0), 0);
    const avgRPE = sessions.length > 0 
      ? sessions.filter(s => s.avg_rpe).reduce((sum, s) => sum + (s.avg_rpe || 0), 0) / sessions.filter(s => s.avg_rpe).length 
      : 0;
    
    const avgDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / completedSessions.length
      : 0;

    const lastSession = sessions.length > 0 ? sessions[0] : null;

    return {
      totalSessions,
      totalSets,
      avgRPE,
      avgDuration,
      lastSession
    };
  }, [sessions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded-lg bg-muted"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border bg-card p-6 shadow-soft space-y-4">
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
            <Button onClick={() => navigate("/admin/programs")} variant="outline">
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
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button onClick={() => navigate("/admin/programs")} variant="ghost" className="mb-4 -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Tagasi programmide juurde</span>
            <span className="sm:hidden">Tagasi</span>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Programmi Analytics
          </h1>
          {programInfo && (
            <div className="mt-4 p-3 sm:p-4 rounded-lg bg-muted/50">
              <div className="flex items-start sm:items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm sm:text-base truncate">
                    {programInfo.title_override || programInfo.workout_templates?.title || "Nimetu programm"}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    <div>Määratud: {programInfo.profiles?.[0]?.email || "Tundmatu kasutaja"}</div>
                    <div className="flex flex-col sm:flex-row sm:gap-4">
                      {programInfo.start_date && (
                        <span>Alates: {new Date(programInfo.start_date).toLocaleDateString("et-EE")}</span>
                      )}
                      <span>Status: {programInfo.is_active ? "Aktiivne" : "Mitteaktiivne"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Overview Cards */}
        <div className="mb-6 sm:mb-8 grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-5">
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="rounded-full bg-primary/10 p-2 sm:p-3">
                  <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Treeninguid</p>
                  <p className="text-lg sm:text-2xl font-bold">{overallStats.totalSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="rounded-full bg-green-500/10 p-2 sm:p-3">
                  <Dumbbell className="h-4 w-4 sm:h-6 sm:w-6 text-green-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Kogu maht</p>
                  <p className="text-lg sm:text-2xl font-bold">{Math.round(overallStats.totalSets * 10)} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="rounded-full bg-blue-500/10 p-2 sm:p-3">
                  <Target className="h-4 w-4 sm:h-6 sm:w-6 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Seeriad kokku</p>
                  <p className="text-lg sm:text-2xl font-bold">{overallStats.totalSets}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="rounded-full bg-orange-500/10 p-2 sm:p-3">
                  <Activity className="h-4 w-4 sm:h-6 sm:w-6 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Kordused kokku</p>
                  <p className="text-lg sm:text-2xl font-bold">{overallStats.totalSets * 12}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="rounded-full bg-purple-500/10 p-2 sm:p-3">
                  <Award className="h-4 w-4 sm:h-6 sm:w-6 text-purple-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Kesk. RPE</p>
                  <p className="text-lg sm:text-2xl font-bold">
                    {overallStats.avgRPE > 0 ? overallStats.avgRPE.toFixed(1) : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Training Load Analysis */}
        <div className="mb-6 sm:mb-8">
          <Card className="rounded-2xl shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Treeningkoormuse analüüs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-3">
                <div className="text-center p-3 sm:p-4 rounded-lg bg-muted/50">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-2">Keskmine treening</div>
                  <div className="space-y-1">
                    <div className="text-lg font-semibold">
                      {overallStats.totalSessions > 0 ? Math.round((overallStats.totalSets * 10) / overallStats.totalSessions) : 0} kg
                    </div>
                    <div className="text-xs text-muted-foreground">maht per treening</div>
                  </div>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-lg bg-muted/50">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-2">Keskmine kestus</div>
                  <div className="space-y-1">
                    <div className="text-lg font-semibold">
                      {Math.round(overallStats.avgDuration)} min
                    </div>
                    <div className="text-xs text-muted-foreground">per treening</div>
                  </div>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-lg bg-muted/50">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-2">Viimane treening</div>
                  <div className="space-y-1">
                    <div className="text-sm sm:text-lg font-semibold">
                      {overallStats.lastSession ? 
                        new Date(overallStats.lastSession.started_at).toLocaleDateString("et-EE") : 
                        "—"
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {overallStats.lastSession?.ended_at ? "Lõpetatud" : "Pooleli"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Treeningute ajalugu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="rounded-full bg-muted/50 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Pole veel treeninguid</h3>
                <p className="text-muted-foreground text-sm">Selle programmi all pole veel treeninguid tehtud</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {sessions.slice(0, 20).map((session) => (
                  <div key={session.session_id} className="rounded-xl border bg-card/50 p-3 sm:p-4 transition-colors hover:bg-card/80">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="font-medium text-sm sm:text-base">
                          {new Date(session.started_at).toLocaleDateString("et-EE", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                          })}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-muted-foreground">
                          <span>{session.day_title}</span>
                          <span>•</span>
                          <span>{session.total_sets_completed} seeriat</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:block sm:text-right">
                        <div className="font-semibold text-sm sm:text-base">
                          {session.duration_minutes || 0} min
                        </div>
                        <div className="flex items-center gap-2">
                          {session.avg_rpe && session.avg_rpe > 0 && (
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              RPE: {session.avg_rpe?.toFixed(1)}
                            </div>
                          )}
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            session.ended_at ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {session.ended_at ? 'Lõpetatud' : 'Pooleli'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}