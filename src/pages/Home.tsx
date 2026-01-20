// src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useProgressTracking } from "@/hooks/useProgressTracking";
import { useOverallPTStats } from "@/hooks/useOverallPTStats";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { useProgramCalendarState } from "@/hooks/useProgramCalendarState";
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
  BarChart3,
  Loader2
} from "lucide-react";

export default function Home() {
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const { streaks } = useProgressTracking();
  const ptStats = useOverallPTStats();
  const { trackButtonClick, trackPageView } = useTrackEvent();
  const { program, completedDays, totalDays, hasActiveProgram, loading: programLoading } = useProgramCalendarState();
  
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

  const [loading, setLoading] = useState(true);

  // No need for redirect logic - RequireAuth guard handles this


  // Get motivational message based on streak (first-person affirmations)
  const getMotivationalMessage = () => {
    const currentStreak = streaks?.current_streak ?? 0;
    
    if (currentStreak >= 7) {
      return "Ma olen see, mida ma korduvalt teen. Järjepidevus on minu võti.";
    } else if (currentStreak >= 3) {
      return "Ma valin raskema tee. See muudab mind tugevamaks.";
    } else {
      return "Täna on hea päev. Iga treening viib mind eesmärgile lähemale.";
    }
  };

  const motivationalMsg = getMotivationalMessage();

  // Track page view on mount
  useEffect(() => {
    if (user) {
      trackPageView('home', { 
        user_type: 'authenticated'
      });
    }
  }, [user, trackPageView]);



  // Set loading state based on PT stats loading
  useEffect(() => {
    setLoading(ptStats.loading);
  }, [ptStats.loading]);

  // Redirect to trial-expired page if trial AND grace period have expired
  useEffect(() => {
    if (!user || trialStatus.loading) return;
    
    // Only redirect if BOTH trial and grace period have expired
    if (trialStatus.isExpired && !trialStatus.isInGracePeriod) {
      // Small delay to allow access check to complete
      const timer = setTimeout(() => {
        navigate('/trial-expired', { replace: true });
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user, trialStatus.isExpired, trialStatus.isInGracePeriod, trialStatus.loading, navigate]);


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
          <p className="text-lg md:text-xl text-center">
            {motivationalMsg.toLowerCase().includes("täna on hea päev") ? (
              <>
                <span className="text-black">täna on hea päev.</span>
                <br />
                <span className="accent-handwriting text-[#00B6E5]">Iga treening viib mind eesmärgile lähemale</span>
              </>
            ) : (
              <span className="accent-handwriting text-[#00B6E5]">{motivationalMsg.toLowerCase()}</span>
            )}
          </p>
        </div>

        {/* Training Focus - Clean Apple-style */}
        <div className="space-y-6">
          
          {/* Personal Training Card - Apple Liquid Glass */}
          <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-center gap-3 text-xl font-bold text-gray-900">
                <Dumbbell className="h-6 w-6 text-gray-700" />
                Personaaltreening
              </CardTitle>
              <CardDescription className="text-center text-[#212121] font-bold">
                {ptStats.lastWorkout 
                  ? `Viimane treening: ${new Date(ptStats.lastWorkout).toLocaleDateString("et-EE")}`
                  : "Valmis järgmiseks treeningukorraks?"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Glass Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200/30">
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round(ptStats.totalVolumeKg)} kg
                  </div>
                  <div className="text-sm text-gray-600">Kogu maht</div>
                </div>
                
                <div className="text-center p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200/30">
                  <div className="text-2xl font-bold text-gray-900">
                    {ptStats.avgRPE > 0 ? ptStats.avgRPE.toFixed(1) : "0"}/10
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

          {/* Programs Card - Smart Homepage */}
          <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-center gap-3 text-xl font-bold text-gray-900">
                <Target className="h-6 w-6 text-gray-700" />
                Programmid
              </CardTitle>
              <CardDescription className="text-center text-[#212121] font-bold">
                {hasActiveProgram && program ? `${program.title} - sinu progress` : "Vali oma treeningprogramm ja alusta teekonda"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {programLoading ? (
                // Loading state
                <div className="text-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-500">Laen programmi andmeid...</p>
                </div>
              ) : hasActiveProgram && program ? (
                // Active Program Preview with Progress - Beautiful Design
                <>
                  <div className="space-y-4">
                    <div className="relative overflow-hidden p-6 bg-gradient-to-br from-green-50 via-white to-blue-50 backdrop-blur-sm rounded-xl border-2 border-green-200/50 shadow-lg">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
                      <div className="relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="h-5 w-5 text-green-600" />
                              <div className="text-xl font-bold text-gray-900">{program.title}</div>
                            </div>
                            <div className="text-sm text-gray-600 mb-1">{totalDays} päeva programm</div>
                            <div className="text-xs text-gray-500">Alustaja tase</div>
                          </div>
                          <Badge className="bg-green-500 text-white border-0 shadow-md px-3 py-1">
                            <CheckCircle className="h-3 w-3 mr-1.5" />
                            Aktiivne
                          </Badge>
                        </div>
                        
                        {/* Enhanced Progress Bar */}
                        <div className="space-y-3 mt-4 pt-4 border-t border-green-200/30">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Edusammud</span>
                            <span className="text-lg font-bold text-gray-900">
                              {completedDays}/{totalDays} päeva
                            </span>
                          </div>
                          <div className="relative">
                            <ProgressBar 
                              value={(completedDays / totalDays) * 100} 
                              className="h-3 bg-gray-200"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-semibold text-gray-700">
                                {Math.round((completedDays / totalDays) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      asChild 
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <Link 
                        to="/programm"
                        onClick={() => trackButtonClick('continue_program', '/programm', 'programs_card')}
                      >
                        Jätka programm
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                    <Button 
                      asChild 
                      variant="outline" 
                      className="border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all"
                    >
                      <Link 
                        to="/programmid"
                        onClick={() => trackButtonClick('view_all_programs', '/programmid', 'programs_card')}
                      >
                        Vaata kõiki
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                // No Active Program - Beautiful Selection Prompt
                <>
                  <div className="relative overflow-hidden text-center p-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 backdrop-blur-sm rounded-xl border-2 border-blue-200/50 shadow-lg">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-200/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-200/20 rounded-full blur-2xl -ml-16 -mb-16"></div>
                    <div className="relative">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-4 shadow-lg">
                        <Target className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 mb-2">Vali oma programm</div>
                      <div className="text-sm text-gray-600 mb-2 max-w-md mx-auto">
                        Alusta oma tervisliku elustiili teekonda
                      </div>
                      <div className="text-xs text-gray-500">
                        Programm avaneb päev-päevalt ja aitab sul järjepidevust hoida
                      </div>
                    </div>
                  </div>

                  <Button 
                    asChild 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    <Link 
                      to="/programmid" 
                      className="flex items-center justify-center gap-2"
                      onClick={() => trackButtonClick('select_program', '/programmid', 'programs_card')}
                    >
                      <Target className="h-5 w-5" />
                      Vali programm
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Quick Actions - Märkmik, Analüütika, Teenused */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-12">
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

      </div>
    </div>
  );
}