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
import { supabase } from "@/integrations/supabase/client";
import { calcProgramStreak } from "@/lib/workweek";
import { TrialStatusBanner } from "@/components/TrialStatusBanner";
import { TrialWarningBanner } from "@/components/TrialWarningBanner";
import { GracePeriodBanner } from "@/components/GracePeriodBanner";
import { TrialModal } from "@/components/TrialModal";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useTrialPopupManager } from "@/hooks/useTrialPopupManager";
import { 
  TrendingUp, 
  Target, 
  Calendar,
  Flame,
  Activity,
  CheckCircle,
  ArrowRight,
  Dumbbell,
  BookOpen,
  BarChart3
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


export default function Home() {
  const { status, user } = useAuth();
  const { streaks, totalVolumeKg, summary, weekly } = useProgressTracking();
  const { trackButtonClick, trackPageView } = useTrackEvent();
  
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

  // Get motivational message based on streak and progress (first-person affirmations)
  const getMotivationalMessage = () => {
    const currentStreak = streaks?.current_streak ?? stats.streak;
    
    if (currentStreak >= 7) {
      return "Ma olen see, mida ma korduvalt teen. Järjepidevus on minu võti.";
    } else if (currentStreak >= 3) {
      return "Ma valin raskema tee. See muudab mind tugevamaks.";
    } else if (progressPct >= 50) {
      return "Ma investeerin oma aega olulistesse asjadesse, mis loovad tulevikku.";
    } else {
      return "Täna on hea päev. Iga treening viib mind eesmärgile lähemale.";
    }
  };

  const motivationalMsg = getMotivationalMessage();

  // Track page view on mount
  useEffect(() => {
    if (user) {
      trackPageView('home', { 
        user_type: 'authenticated',
        completion_percentage: progressPct 
      });
    }
  }, [user, trackPageView, progressPct]);



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


  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-[#212121] font-bold">Laen sinu andmeid...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        
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

        {/* Welcome Header - Matching marketing site style */}
        <div className="text-center space-y-6 pt-8">
          <div className="space-y-4">
            {user?.full_name && (
              <h1 className="text-[40px] md:text-[52px] font-black uppercase text-black tracking-tight">
                Tere, {user.full_name.split(' ')[0]}!
              </h1>
            )}
          </div>
          
          {/* Motivational Message */}
          <p className="accent-handwriting text-[#00B6E5] text-lg md:text-xl text-center">
            {motivationalMsg.toLowerCase()}
          </p>
        </div>

        {/* Quick Actions - Apple Liquid Glass */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button asChild className="h-16 flex-col space-y-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:bg-white/90 hover:shadow-lg transition-all duration-200 text-gray-900">
            <Link 
              to="/programs/journal"
              onClick={() => trackButtonClick('journal', '/programs/journal', 'home_quick_actions')}
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-sm font-bold">Märkmik</span>
            </Link>
          </Button>
          <Button asChild className="h-16 flex-col space-y-2 bg-white/60 backdrop-blur-sm border border-gray-200/30 hover:bg-white/80 hover:shadow-md transition-all duration-200 text-gray-700">
            <Link 
              to="/programs/stats"
              onClick={() => trackButtonClick('analytics', '/programs/stats', 'home_quick_actions')}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-sm font-bold">Analüütika</span>
            </Link>
          </Button>
          <Button asChild className="h-16 flex-col space-y-2 bg-white/60 backdrop-blur-sm border border-gray-200/30 hover:bg-white/80 hover:shadow-md transition-all duration-200 text-gray-700">
            <Link 
              to="/teenused"
              onClick={() => trackButtonClick('teenused', '/teenused', 'home_quick_actions')}
            >
              <Target className="h-5 w-5" />
              <span className="text-sm font-bold">Teenused</span>
            </Link>
          </Button>
        </div>

        {/* Training Focus - Clean Apple-style */}
        <div className="space-y-6">
          
          {/* Personal Training Card - Apple Liquid Glass */}
          <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <Dumbbell className="h-6 w-6 text-gray-700" />
                Personaaltreening
              </CardTitle>
              <CardDescription className="text-[#212121] font-bold">
                {stats.lastWorkout 
                  ? `Viimane treening: ${new Date(stats.lastWorkout).toLocaleDateString("et-EE")}`
                  : "Valmis järgmiseks treeningukorraks?"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Glass Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200/30">
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round(stats.totalVolume)} kg
                  </div>
                  <div className="text-sm text-gray-600">Kogu maht</div>
                </div>
                
                <div className="text-center p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200/30">
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.avgRPE > 0 ? stats.avgRPE.toFixed(1) : "0"}/10
                  </div>
                  <div className="text-sm text-gray-600">Keskmine pingutus</div>
                </div>
              </div>

              <Button asChild size="lg" className="w-full bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:bg-white/90 hover:shadow-lg transition-all duration-200 text-gray-900">
                <Link 
                  to="/programs" 
                  className="flex items-center justify-center gap-2"
                  onClick={() => trackButtonClick('continue_pt', '/programs', 'progress_card')}
                >
                  Jätka treeningut
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Programs Card - Apple Liquid Glass */}
          <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <Target className="h-6 w-6 text-gray-700" />
                Programmid
              </CardTitle>
              <CardDescription className="text-[#212121] font-bold">
                Vali oma treeningprogramm ja alusta teekonda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Program Preview - Only Available Programs */}
              <div className="grid grid-cols-1 gap-4">
                <div className="text-center p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200/30">
                  <div className="text-lg font-bold text-gray-900 mb-2">Kontorikeha Reset</div>
                  <div className="text-sm font-bold text-[#212121] mb-3">20 päeva • Alustaja</div>
                  <div className="text-xs text-green-600 font-medium">✓ Saadaval</div>
                </div>
              </div>

              <Button asChild size="lg" className="w-full bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:bg-white/90 hover:shadow-lg transition-all duration-200 text-gray-900">
                <Link 
                  to="/programmid" 
                  className="flex items-center justify-center gap-2"
                  onClick={() => trackButtonClick('programmid', '/programmid', 'programs_card')}
                >
                  Vaata kõiki programme
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}