// src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useProgressTracking } from "@/hooks/useProgressTracking";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { useCustomHabits } from "@/hooks/useCustomHabits";
import { supabase } from "@/integrations/supabase/client";
import { calcProgramStreak } from "@/lib/workweek";
import { HabitStatsModal } from "@/components/HabitStatsModal";
import { AddHabitModal } from "@/components/AddHabitModal";
import { ArchivedHabitsModal } from "@/components/ArchivedHabitsModal";
import { UserLevelDisplay } from "@/components/UserLevelDisplay";
import { LevelUpToast } from "@/components/LevelUpToast";
import { TrialStatusBanner } from "@/components/TrialStatusBanner";
import { TrialWarningBanner } from "@/components/TrialWarningBanner";
import { GracePeriodBanner } from "@/components/GracePeriodBanner";
import { TrialModal } from "@/components/TrialModal";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useTrialPopupManager } from "@/hooks/useTrialPopupManager";
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Calendar,
  Flame,
  Activity,
  CheckCircle,
  ArrowRight,
  Dumbbell,
  BookOpen,
  BarChart3,
  Zap,
  Heart,
  Coffee,
  Book,
  Settings,
  X
} from "lucide-react";

type Stats = {
  completedDays: number;
  totalDays: number;
  streak: number;
  reps: number;
  sets: number;
  seconds: number;
  totalVolume: number;
  avgRPE: number;
  lastWorkout: string | null;
};

// Icon mapping for custom habits
const getHabitIcon = (iconName: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    Trophy: <Trophy className="h-4 w-4" />,
    Zap: <Zap className="h-4 w-4" />,
    Activity: <Activity className="h-4 w-4" />,
    CheckCircle: <CheckCircle className="h-4 w-4" />,
    Heart: <Heart className="h-4 w-4" />,
    Coffee: <Coffee className="h-4 w-4" />,
    Book: <Book className="h-4 w-4" />,
    Target: <Target className="h-4 w-4" />,
  };
  return iconMap[iconName] || <CheckCircle className="h-4 w-4" />;
};

export default function Home() {
  const { status, user } = useAuth();
  const { streaks, totalVolumeKg, summary, weekly } = useProgressTracking();
  const { trackButtonClick, trackPageView } = useTrackEvent();
  const { habits, loading: habitsLoading, toggleHabit, removeHabit } = useCustomHabits();
  
  // Trial status using new hook
  const trialStatus = useTrialStatus();
  const popupManager = useTrialPopupManager();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [stats, setStats] = useState<Stats>({
    completedDays: 0,
    totalDays: 20,
    streak: 0,
    reps: 0,
    sets: 0,
    seconds: 0,
    totalVolume: 0,
    avgRPE: 0,
    lastWorkout: null,
  });
  const [loading, setLoading] = useState(true);

  // No need for redirect logic - RequireAuth guard handles this

  const progressPct = useMemo(() => {
    if (stats.totalDays <= 0) return 0;
    return Math.min(
      100,
      Math.round((stats.completedDays / stats.totalDays) * 100)
    );
  }, [stats.completedDays, stats.totalDays]);

  // Track page view on mount
  useEffect(() => {
    if (user) {
      trackPageView('home', { 
        user_type: 'authenticated',
        completion_percentage: progressPct 
      });
    }
  }, [user, trackPageView, progressPct]);

  const habitCompletionPct = useMemo(() => {
    const completed = habits.filter(h => h.done).length;
    return habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
  }, [habits]);

  const getMotivationalMessage = () => {
    const currentStreak = streaks?.current_streak ?? stats.streak;
    const habitsPct = habitCompletionPct;
    
    if (currentStreak >= 7) {
      return {
        title: "Võrratu sooritus!",
        message: `${currentStreak} päeva järjest! Sa oled tõeline kangelane!`,
        color: "text-orange-600"
      };
    } else if (currentStreak >= 3) {
      return {
        title: "Suurepärane tempo!",
        message: `${currentStreak} päeva järjest - jätka samas vaimus!`,
        color: "text-green-600"
      };
    } else if (habitsPct >= 75) {
      return {
        title: "Suurepärane päev!",
        message: "Enamik harjumusi täidetud - tubli töö!",
        color: "text-blue-600"
      };
    } else {
      return {
        title: "Täna on hea päev!",
        message: "Iga treening viib sind eesmärgile lähemale",
        color: "text-primary"
      };
    }
  };

  const motivationalMsg = getMotivationalMessage();

  // PT stats loading - exact same logic as PersonalTrainingStats page
  useEffect(() => {
    if (!user?.id) return;
    
    const loadPTStats = async () => {
      try {
        // Exact same query as PersonalTrainingStats
        const { data: sessionData, error: sessionError } = await supabase
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

        if (sessionError) {
          console.error("PT stats error:", sessionError);
          return;
        }

        const sessions = sessionData || [];

        // Exact same calculation logic as PersonalTrainingStats overallStats
        let totalVolumeKg = 0;
        
        sessions.forEach(session => {
          if (session.set_logs && Array.isArray(session.set_logs)) {
            session.set_logs.forEach((setLog: any) => {
              if (setLog.weight_kg_done && setLog.reps_done) {
                totalVolumeKg += setLog.weight_kg_done * setLog.reps_done;
              }
            });
          }
        });
        
        const avgRPE = sessions.length > 0 
          ? sessions.filter(s => s.avg_rpe).reduce((sum, s) => sum + (s.avg_rpe || 0), 0) / sessions.filter(s => s.avg_rpe).length 
          : 0;

        setStats(prev => ({ 
          ...prev, 
          totalVolume: totalVolumeKg, 
          avgRPE: avgRPE 
        }));
        
      } catch (error) {
        console.error("PT stats error:", error);
      }
    };

    loadPTStats();
  }, [user?.id]);

  // Optimized comprehensive stats loading
  useEffect(() => {
    if (!user?.id) return;
    
    const loadOptimizedStats = async () => {
      try {
        setLoading(true);

        // Parallel queries for better performance
        const [sessionResult, progressResult] = await Promise.all([
          supabase
            .from("v_session_summary")
            .select("*")
            .eq("user_id", user.id)
            .order("started_at", { ascending: false })
            .limit(50),
          
          supabase
            .from("userprogress")
            .select("completed_at, sets, total_sets, reps, total_reps, total_seconds")
            .eq("user_id", user.id)
            .eq("done", true)
            .order("completed_at", { ascending: false })
        ]);

        if (sessionResult.error && import.meta.env.DEV) {
          console.error("Session data error:", sessionResult.error);
        }

        if (progressResult.error && import.meta.env.DEV) {
          console.error("Progress data error:", progressResult.error);
        }

        const completedDays = progressResult.data?.length ?? 0;
        let lastWorkout = null;

        // Get last workout date from PT sessions
        if (sessionResult.data && sessionResult.data.length > 0) {
          lastWorkout = sessionResult.data[0]?.ended_at || sessionResult.data[0]?.started_at;
        }

        // Calculate actual Kontorikeha program metrics from userprogress data
        // Use sets/reps/seconds columns (current data) and total_* columns (new format)
        console.log("[Home] Progress data:", progressResult.data);
        const actualSets = progressResult.data?.reduce((sum, p) => sum + Math.max(p.sets || 0, p.total_sets || 0), 0) || 0;
        const actualReps = progressResult.data?.reduce((sum, p) => sum + Math.max(p.reps || 0, p.total_reps || 0), 0) || 0;
        const actualSeconds = progressResult.data?.reduce((sum, p) => sum + (p.total_seconds || 0), 0) || 0;
        console.log("[Home] Calculated stats:", { actualSets, actualReps, actualSeconds, completedDays: progressResult.data?.length });

        let totalDays = 20;
        try {
          const { count, error: countError } = await supabase
            .from("programday")
            .select("*", { count: "exact", head: true });
          if (countError) {
            console.error("Program day count error:", countError);
          } else if (typeof count === "number" && count > 0) {
            totalDays = count;
          }
        } catch (error) {
          console.error("Total days calculation error:", error);
        }

        // Calculate streak properly using the same logic as Progress page
        const doneDates = progressResult.data?.map((p: any) => p.completed_at?.slice(0, 10)).filter(Boolean) ?? [];
        const calculatedStreak = calcProgramStreak(doneDates);
        
        setStats(prev => ({
          completedDays, 
          totalDays, 
          streak: calculatedStreak,
          reps: actualReps, 
          sets: actualSets,
          seconds: actualSeconds,
          // Preserve existing PT stats values
          totalVolume: prev.totalVolume || 0,
          avgRPE: prev.avgRPE || 0,
          lastWorkout
        }));
      } catch (e) {
        console.error("[Home] stats load error:", e);
      } finally {
        setLoading(false);
      }
    };

    loadOptimizedStats();
  }, [user?.id]); // Use user.id for more precise dependency

  // Redirect to trial-expired page if trial AND grace period have expired
  useEffect(() => {
    if (!user || trialStatus.loading) return;
    
    // Only redirect if BOTH trial and grace period have expired
    if (trialStatus.isExpired && !trialStatus.isInGracePeriod) {
      // Small delay to allow access check to complete
      const timer = setTimeout(() => {
        window.location.href = '/trial-expired';
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user, trialStatus.isExpired, trialStatus.isInGracePeriod, trialStatus.loading]);

  // Remove old habits loading logic - now handled by useCustomHabits hook

  if (status === "loading" || loading || habitsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Laen sinu andmeid...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <LevelUpToast />
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        
        {/* Smart Trial Popup System */}
        {popupManager.shouldShow && (
          <>
            {/* Grace Period Banner (trial expired but within 48h grace period) */}
            {trialStatus.isInGracePeriod && trialStatus.hoursRemainingInGrace !== null && (
              <div className="pt-6">
                <GracePeriodBanner hoursRemaining={trialStatus.hoursRemainingInGrace} />
              </div>
            )}

            {/* Trial Warning Banner (≤3 days, dismissible) - only if NOT in grace period */}
            {!trialStatus.isInGracePeriod && trialStatus.isWarningPeriod && trialStatus.trialEndsAt && trialStatus.daysRemaining !== null && (
              <div className="pt-6">
                <TrialWarningBanner 
                  daysRemaining={trialStatus.daysRemaining}
                  trialEndsAt={trialStatus.trialEndsAt}
                  isUrgent={trialStatus.isUrgent}
                />
              </div>
            )}

            {/* Trial Status Banner (regular, always visible for trial users) - only if NOT in grace or warning period */}
            {!trialStatus.isInGracePeriod && trialStatus.isOnTrial && trialStatus.trialEndsAt && !trialStatus.isWarningPeriod && (
              <div className="pt-6">
                <TrialStatusBanner 
                  trialEndsAt={trialStatus.trialEndsAt}
                  product={trialStatus.product || 'Static'}
                />
              </div>
            )}
          </>
        )}

        {/* Mobile Trial Modal */}
        <TrialModal
          isOpen={popupManager.shouldShow && isMobile}
          onClose={() => popupManager.dismissPopup('close')}
          onDismiss={popupManager.dismissPopup}
          type={
            trialStatus.isInGracePeriod ? 'grace' :
            trialStatus.isUrgent ? 'urgent' : 'warning'
          }
          daysRemaining={trialStatus.daysRemaining || 0}
          hoursRemaining={trialStatus.hoursRemainingInGrace || 0}
          trialEndsAt={trialStatus.trialEndsAt || ''}
          isFirstShow={popupManager.isFirstShow}
        />

        {/* Welcome Header - Clean and Warm */}
        <div className="text-center space-y-6 pt-8">
          <div className="flex justify-center mb-6">
            <UserLevelDisplay size="lg" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-fade-in">
              Tere tulemast tagasi!
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
              Sinu isiklik tervise- ja treeningukaaslane
            </p>
          </div>
          
          <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 ${motivationalMsg.color} animate-scale-in`}>
            <div className="text-center">
              <p className="font-semibold">{motivationalMsg.title}</p>
              <p className="text-sm opacity-80">{motivationalMsg.message}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <Button asChild className="h-20 flex-col space-y-2 hover-scale">
            <Link 
              to="/programm"
              onClick={() => trackButtonClick('reset', '/programm', 'home_quick_actions')}
            >
              <Dumbbell className="h-6 w-6" />
              <span className="text-sm">Reset</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col space-y-2 hover-scale">
            <Link 
              to="/teenused"
              onClick={() => trackButtonClick('teenused', '/teenused', 'home_quick_actions')}
            >
              <Target className="h-6 w-6" />
              <span className="text-sm">Teenused</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col space-y-2 hover-scale">
            <Link 
              to="/tervisetood"
              onClick={() => trackButtonClick('tervisetoed', '/tervisetoed', 'home_quick_actions')}
            >
              <BookOpen className="h-6 w-6" />
              <span className="text-sm">Tervisetõed</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col space-y-2 hover-scale">
            <Link 
              to="/programs/stats"
              onClick={() => trackButtonClick('statistika', '/programs/stats', 'home_quick_actions')}
            >
              <BarChart3 className="h-6 w-6" />
              <span className="text-sm">Statistika</span>
            </Link>
          </Button>
        </div>

        {/* Main Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Personal Training Progress - Full Width on Mobile */}
          <Card className="md:col-span-2 lg:col-span-2 rounded-2xl shadow-soft border-0 bg-gradient-to-br from-primary/10 to-primary/5 animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="h-6 w-6 text-primary" />
                Personaaltreeningu Progress
              </CardTitle>
              <CardDescription>
                {stats.lastWorkout 
                  ? `Viimane treening: ${new Date(stats.lastWorkout).toLocaleDateString("et-EE")}`
                  : "Valmis järgmiseks treeningukorraks?"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-card/50 border p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Dumbbell className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">Kogu maht</span>
                  </div>
                  <div className="text-2xl font-bold text-accent">
                    {Math.round(stats.totalVolume)} kg
                  </div>
                </div>
                
                <div className="rounded-xl bg-card/50 border p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Keskmine pingutus</span>
                  </div>
                  <div className="text-2xl font-bold text-green-500">
                    {stats.avgRPE > 0 ? stats.avgRPE.toFixed(1) : "0"}/10
                  </div>
                </div>
              </div>

              <Button asChild size="lg" className="w-full group">
                <Link 
                  to="/programs" 
                  className="flex items-center justify-center gap-2"
                  onClick={() => trackButtonClick('continue_pt', '/programs', 'progress_card')}
                >
                  Jätka personaaltreeningut
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Daily Habits with Management */}
          <Card className="rounded-2xl shadow-soft border-0 bg-gradient-to-br from-secondary/10 to-secondary/5 animate-scale-in">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-secondary-foreground flex-shrink-0" />
                    <span className="truncate">Päeva harjumused</span>
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {habitCompletionPct === 100 ? (
                      <span className="text-green-600 font-semibold">
                        Kõik harjumused täidetud! Suurepärane päev!
                      </span>
                    ) : (
                      `${habitCompletionPct}% täidetud täna`
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <HabitStatsModal />
                  <ArchivedHabitsModal />
                  <AddHabitModal />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProgressBar 
                value={habitCompletionPct} 
                className="h-2 bg-muted" 
              />
              {habitCompletionPct === 100 && (
                <div className="text-center py-2">
                  <div className="inline-block px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-medium animate-scale-in">
                    Päev täielikult täidetud!
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {habits.length > 0 ? habits.map((habit) => (
                  <div 
                    key={habit.id}
                    className={`group relative w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 min-h-[60px] ${
                      habit.done 
                        ? "bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 shadow-lg" 
                        : "bg-muted/50 hover:bg-muted border-2 border-transparent hover:border-muted-foreground/20"
                    }`}
                  >
                    <button
                    onClick={() => {
                      trackButtonClick('habit_toggle', 'habit_completion', 'home');
                      toggleHabit(habit.id);
                    }}
                      className="flex items-center gap-4 flex-1 hover:scale-[1.01] active:scale-[0.99] transition-transform"
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        habit.done 
                          ? "bg-green-600 border-green-600 text-white" 
                          : "border-muted-foreground/30 hover:border-primary"
                      }`}>
                        {habit.done && <CheckCircle className="h-4 w-4" />}
                      </div>
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`transition-colors ${habit.done ? "text-green-600" : "text-muted-foreground"}`}>
                          {getHabitIcon(habit.icon_name)}
                        </div>
                        <span 
                          className={`text-base font-medium transition-colors text-left ${
                            habit.done 
                              ? "line-through text-muted-foreground" 
                              : "text-foreground"
                          }`}
                        >
                          {habit.title}
                        </span>
                      </div>
                    </button>
                    
                    {/* Remove button - only show on hover for custom habits */}
                    <button
                          onClick={() => {
                            trackButtonClick('remove_habit', 'habit_management', 'home');
                            removeHabit(habit.id);
                          }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-destructive"
                      title="Eemalda harjumus"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )) : (
                  <div className="text-center py-6 space-y-3">
                    <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground text-sm">
                      Lisa oma esimene harjumus!
                    </p>
                   </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>


        {/* Kontorikeha Progress */}
        <Card className="rounded-2xl shadow-soft border-0 animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Kontorikeha progress
            </CardTitle>
            <CardDescription>
              Sinu kontorikeha programmi edusammud
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-2">
                <div className="rounded-full bg-orange-500/10 w-16 h-16 flex items-center justify-center mx-auto">
                  <Flame className="h-8 w-8 text-orange-500" />
                </div>
                <div className="text-2xl font-bold">{streaks?.best_streak ?? 0}</div>
                <div className="text-sm text-muted-foreground">Parim streak</div>
              </div>
              <div className="space-y-2">
                <div className="rounded-full bg-blue-500/10 w-16 h-16 flex items-center justify-center mx-auto">
                  <Target className="h-8 w-8 text-blue-500" />
                </div>
                <div className="text-2xl font-bold">{stats.sets}</div>
                <div className="text-sm text-muted-foreground">Seeriad kokku</div>
              </div>
              <div className="space-y-2">
                <div className="rounded-full bg-green-500/10 w-16 h-16 flex items-center justify-center mx-auto">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
                {stats.reps > 0 && stats.seconds > 0 ? (
                  <>
                    <div className="text-xl font-bold">{stats.reps} / {Math.floor(stats.seconds / 60)}m</div>
                    <div className="text-sm text-muted-foreground">Kordused / Minutid</div>
                  </>
                ) : stats.reps > 0 ? (
                  <>
                    <div className="text-2xl font-bold">{stats.reps}</div>
                    <div className="text-sm text-muted-foreground">Kordused kokku</div>
                  </>
                ) : stats.seconds > 0 ? (
                  <>
                    <div className="text-2xl font-bold">{Math.floor(stats.seconds / 60)}</div>
                    <div className="text-sm text-muted-foreground">Minutid kokku</div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-sm text-muted-foreground">Ei ole veel andmeid</div>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <div className="rounded-full bg-purple-500/10 w-16 h-16 flex items-center justify-center mx-auto">
                  <Calendar className="h-8 w-8 text-purple-500" />
                </div>
                <div className="text-2xl font-bold">{stats.completedDays}</div>
                <div className="text-sm text-muted-foreground">Päevi tehtud</div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}