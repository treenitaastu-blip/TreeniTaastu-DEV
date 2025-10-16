import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  AlertTriangle, 
  Activity,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardStats {
  totalClients: number;
  activePrograms: number;
  weeklyCompletions: number;
  avgCompletionRate: number;
  atRiskClients: number;
  topPerformers: number;
}

interface ClientAlert {
  user_id: string;
  email: string | null;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  days_since_activity: number;
}

interface RecentActivity {
  user_id: string;
  email: string | null;
  action: string;
  timestamp: string;
  program_title: string;
}

export default function SmartProgramDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activePrograms: 0,
    weeklyCompletions: 0,
    avgCompletionRate: 0,
    atRiskClients: 0,
    topPerformers: 0
  });
  const [alerts, setAlerts] = useState<ClientAlert[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get basic stats
      const { data: programs } = await supabase
        .from("client_programs")
        .select(`
          id,
          is_active,
          assigned_to,
          profiles!client_programs_assigned_to_fkey(email)
        `);

      const totalClients = new Set(programs?.map(p => p.assigned_to)).size;
      const activePrograms = programs?.filter(p => p.is_active !== false).length || 0;

      // Get weekly completions
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: weeklyCompletions } = await supabase
        .from("workout_sessions")
        .select("*", { count: "exact", head: true })
        .not("ended_at", "is", null)
        .gte("started_at", oneWeekAgo);

      // Get completion rates
      const { data: sessionStats } = await supabase
        .from("workout_sessions")
        .select("user_id, ended_at");

      const completionRates = sessionStats?.reduce((acc: Record<string, {completed: number, total: number}>, session) => {
        if (!acc[session.user_id]) {
          acc[session.user_id] = { completed: 0, total: 0 };
        }
        acc[session.user_id].total++;
        if (session.ended_at) {
          acc[session.user_id].completed++;
        }
        return acc;
      }, {});

      const avgCompletionRate = completionRates ? 
        Object.values(completionRates).reduce((avg, user) => 
          avg + (user.completed / user.total), 0) / Object.keys(completionRates).length : 0;

      // Identify at-risk clients (haven't completed a workout in 7+ days)
      const { data: lastActivities } = await supabase
        .from("workout_sessions")
        .select("user_id, ended_at, profiles!workout_sessions_user_id_fkey(email)")
        .not("ended_at", "is", null)
        .order("ended_at", { ascending: false });

      const userLastActivity: Record<string, { email: string | null, lastActivity: string }> = {};
      lastActivities?.forEach(session => {
        if (!userLastActivity[session.user_id] && session.ended_at) {
          userLastActivity[session.user_id] = {
            email: session.profiles?.email || null,
            lastActivity: session.ended_at
          };
        }
      });

      const atRiskClients: ClientAlert[] = [];
      Object.entries(userLastActivity).forEach(([userId, data]) => {
        const daysSince = Math.floor((Date.now() - new Date(data.lastActivity).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 7 && data.email) {
          atRiskClients.push({
            user_id: userId,
            email: data.email,
            issue: `${daysSince} päeva passiivsust`,
            severity: daysSince >= 14 ? 'high' : daysSince >= 10 ? 'medium' : 'low',
            days_since_activity: daysSince
          });
        }
      });

      // Get recent activity
      const { data: recentSessions } = await supabase
        .from("workout_sessions")
        .select(`
          user_id,
          started_at,
          ended_at,
          client_programs!inner(title_override, workout_templates(title)),
          profiles!workout_sessions_user_id_fkey(email)
        `)
        .order("started_at", { ascending: false })
        .limit(10);

      const recentActivities: RecentActivity[] = recentSessions?.map(session => {
        const clientProgram = session.client_programs;
        const programTitle = clientProgram?.title_override || 
                           (clientProgram as any)?.workout_templates?.title || 
                           "Programm";
        
        return {
          user_id: session.user_id,
          email: session.profiles?.email || null,
          action: session.ended_at ? "Lõpetas treeningu" : "Alustas treeningut",
          timestamp: session.started_at,
          program_title: programTitle
        };
      }) || [];

      setStats({
        totalClients,
        activePrograms,
        weeklyCompletions: weeklyCompletions || 0,
        avgCompletionRate: avgCompletionRate || 0,
        atRiskClients: atRiskClients.length,
        topPerformers: Object.values(completionRates || {}).filter(u => u.completed / u.total >= 0.8).length
      });

      setAlerts(atRiskClients.slice(0, 5));
      setRecentActivity(recentActivities);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-80 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <XCircle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-soft bg-gradient-to-br from-blue-500/10 to-blue-400/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Kokku kliente</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalClients}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft bg-gradient-to-br from-green-500/10 to-green-400/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aktiivsed programmid</p>
                <p className="text-3xl font-bold text-green-600">{stats.activePrograms}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft bg-gradient-to-br from-purple-500/10 to-purple-400/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nädala lõpetamised</p>
                <p className="text-3xl font-bold text-purple-600">{stats.weeklyCompletions}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft bg-gradient-to-br from-orange-500/10 to-orange-400/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Keskmine edukus</p>
                <p className="text-3xl font-bold text-orange-600">
                  {(stats.avgCompletionRate * 100).toFixed(0)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-500/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client Alerts */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Kliendi Hoiatused
              {stats.atRiskClients > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.atRiskClients}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${getSeverityColor(alert.severity)}`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{alert.email || 'Teadmata kasutaja'}</p>
                        <p className="text-xs text-muted-foreground">{alert.issue}</p>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/admin/analytics/${alert.user_id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
                {stats.atRiskClients > alerts.length && (
                  <p className="text-center text-sm text-muted-foreground pt-2">
                    ja {stats.atRiskClients - alerts.length} klienti veel...
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground">Kõik kliendid on aktiivsed!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Viimane Aktiivsus
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.email || 'Teadmata kasutaja'}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.action} • {activity.program_title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString("et-EE")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}