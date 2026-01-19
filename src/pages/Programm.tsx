import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useProgramCalendarState } from '@/hooks/useProgramCalendarState';
import { useWeekendRedirect } from '@/hooks/useWeekendRedirect';
import { Loader2, RefreshCw, ArrowLeft, Target, ArrowRight, RotateCcw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import QuoteDisplay from '@/components/calendar/QuoteDisplay';
import { getTallinnDate, isAfterUnlockTime } from '@/lib/workweek';
import { supabase } from '@/integrations/supabase/client';

// Static program IDs
const KONTORIKEHA_RESET_PROGRAM_ID = 'e1ab6f77-5a43-4c05-ac0d-02101b499e4c';

export default function Programm() {
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { handleWeekendClick } = useWeekendRedirect();
  const { dayNumber: routeDayNumber } = useParams();
  
  
  const {
    program,
    days,
    totalDays,
    completedDays,
    loading,
    error,
    hasActiveProgram,
    refreshCalendar,
    markDayCompleted
  } = useProgramCalendarState();
  

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeDayData, setActiveDayData] = useState<any | null>(null);
  const [completingDay, setCompletingDay] = useState<number | null>(null); // Track which day is being completed
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [switchingProgram, setSwitchingProgram] = useState(false);
  const [availablePrograms, setAvailablePrograms] = useState<any[]>([]);
  const firstExerciseRef = useRef<HTMLDivElement | null>(null);

  const loadProgramDayByNumber = useCallback(async (dayNum: number) => {
    if (!program) return;

    console.log('Loading program day:', dayNum, 'for program:', program.title);

    // Load program day using program_id
    if (program.id) {
      const week = Math.ceil(dayNum / 5);
      const day = ((dayNum - 1) % 5) + 1;
      const { data, error } = await supabase
        .from('programday')
        .select('*')
        .eq('program_id', program.id)
        .eq('week', week)
        .eq('day', day)
        .single();
        if (error) {
          console.error('programday load error', error);
          toast({ 
            title: 'Viga', 
            description: error.message || 'Päeva laadimine ebaõnnestus. Palun proovi hiljem uuesti.', 
            variant: 'destructive' 
          });
          setActiveDayData(null);
          return;
        }
      setActiveDayData(data);
    } else {
      // For future programs, this would load from a different structure
      // For now, show a placeholder
      setActiveDayData({
        note: `${program.title} - Päev ${dayNum}`,
        exercise1: 'Harjutus 1',
        reps1: '10',
        sets1: '3',
        hint1: 'See programm on veel arendamisel'
      });
    }
  }, [program, toast]);

  useEffect(() => {
    if (routeDayNumber) {
      const dayNum = Number(routeDayNumber);
      if (!Number.isNaN(dayNum) && dayNum >= 1 && dayNum <= 20) {
        loadProgramDayByNumber(dayNum);
      }
    } else {
      setActiveDayData(null);
    }
  }, [routeDayNumber, loadProgramDayByNumber]);

  // Auto-scroll to first exercise when day loads
  useEffect(() => {
    if (activeDayData && firstExerciseRef.current) {
      // longer delay to ensure layout is ready and content is rendered
      setTimeout(() => {
        firstExerciseRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }, 200);
    }
  }, [activeDayData]);

  // Handle day click
  const handleDayClick = useCallback(async (dayNumber: number, isWeekend: boolean) => {
    if (isWeekend) {
      // Redirect to mindfulness page
      await handleWeekendClick(dayNumber);
      return;
    }

    // For weekdays, show the day's exercises
    const day = days.find(d => d.dayNumber === dayNumber);
    if (!day || !day.isUnlocked) {
      toast({
        title: "Päev pole saadaval",
        description: "See päev on veel lukustatud või pole veel saadaval",
        variant: "destructive",
      });
      return;
    }

    // Navigate to exercise view for this day
    navigate(`/programm/day/${dayNumber}`);
  }, [days, navigate, toast, handleWeekendClick]);

  // Handle day completion
  const handleDayCompletion = useCallback(async (dayNumber: number): Promise<boolean> => {
    if (!user || !program) return false;
    
    // Prevent race condition - if already completing this day, return early
    if (completingDay === dayNumber) {
      console.log('Day completion already in progress, ignoring duplicate click');
      return false;
    }
    
    console.log('handleDayCompletion called with:', { dayNumber, user: user.id, program: program.title, activeDayData });
    
    setCompletingDay(dayNumber);
    
    try {
      // For static programs, use existing completion function
      if (program.id === KONTORIKEHA_RESET_PROGRAM_ID) {
        if (!activeDayData?.id) {
          console.error('No activeDayData.id found:', activeDayData);
          toast({ title: 'Viga', description: 'Päeva andmed puuduvad', variant: 'destructive' });
          return false;
        }
        
        const { data, error } = await supabase.rpc('complete_static_program_day', {
          p_user_id: user.id,
          p_programday_id: activeDayData.id
        });
        
        console.log('Database call result:', { data, error, activeDayDataId: activeDayData.id });
        
        if (error) {
          console.error('Error completing day:', error);
          const errorMsg = error?.message || 'Päeva märkimine ebaõnnestus. Palun proovi hiljem uuesti.';
          toast({ 
            title: 'Viga', 
            description: errorMsg, 
            variant: 'destructive' 
          });
          return false;
        }
        
        console.log('Database call successful, data:', data);
        
        if (data?.success) {
          console.log('Database function succeeded, calling markDayCompleted with dayNumber:', dayNumber);
          const success = await markDayCompleted(dayNumber);
          console.log('markDayCompleted result:', success);
          if (success) {
            toast({ title: 'Suurepärane!', description: `Päev ${dayNumber} on märgitud lõpetatuks` });
            setActiveDayData(null);
            // Navigate back to main program page and scroll to the completed day
            navigate('/programm');
            // Refresh calendar to show updated completion status
            refreshCalendar();
            // Scroll to the completed day after navigation
            setTimeout(() => {
              const dayElement = document.getElementById(`day-${dayNumber}`);
              if (dayElement) {
                dayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 300);
            return true;
          }
        } else {
          console.log('Database function returned success: false, data:', data);
          // Check if it's already completed today
          if (data?.message === 'Already completed today') {
            toast({ title: 'Juba tehtud!', description: 'See päev on juba täna lõpetatud', variant: 'default' });
            // Still navigate back and scroll to show the completed day
            setActiveDayData(null);
            navigate('/programm');
            // Refresh calendar to show updated completion status
            refreshCalendar();
            setTimeout(() => {
              const dayElement = document.getElementById(`day-${dayNumber}`);
              if (dayElement) {
                dayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 300);
            return true; // Return true since the day is already completed
          } else {
            toast({ title: 'Viga', description: 'Päeva märkimine ebaõnnestus', variant: 'destructive' });
            return false;
          }
        }
      } else {
        // For future programs, this would use a different completion logic
        toast({ title: 'Info', description: 'See programm on veel arendamisel' });
        return false;
      }
    } catch (error) {
      console.error('Error completing day:', error);
      toast({ title: 'Viga', description: 'Päeva märkimine ebaõnnestus', variant: 'destructive' });
      return false;
    } finally {
      setCompletingDay(null); // Always clear completing state
    }
  }, [user, program, activeDayData, markDayCompleted, navigate, toast, completingDay]);

  // Show quote for locked days
  const showQuoteForDay = useCallback((dayNumber: number) => {
    const day = days.find(d => d.dayNumber === dayNumber);
    if (day?.isLocked && day.quote) {
      setSelectedDay(dayNumber);
    }
  }, [days]);

  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">Laen kalendrit...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-2 border-red-200 bg-white/90 backdrop-blur-sm shadow-xl">
            <CardContent className="text-center py-12 px-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                <Target className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Viga andmete laadimisel</h3>
              <p className="text-red-600 mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={refreshCalendar} 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Proovi uuesti
                </Button>
                <Button 
                  onClick={() => navigate('/programmid')} 
                  variant="outline"
                  className="border-gray-300"
                >
                  Vali programm
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const [startingProgramId, setStartingProgramId] = useState<string | null>(null);

  // Load available programs for empty state
  useEffect(() => {
    if (!hasActiveProgram && !loading) {
      (async () => {
        const { data } = await supabase
          .from('programs')
          .select('*')
          .order('created_at');
        if (data) setAvailablePrograms(data);
      })();
    }
  }, [hasActiveProgram, loading]);

  // Handle starting program from empty state
  const handleStartFromEmptyState = useCallback(async (programId: string) => {
    if (!user) return;
    
    setStartingProgramId(programId);
    try {
      // Pause any existing active programs
      await supabase
        .from('user_programs')
        .update({ 
          status: 'paused',
          paused_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('status', 'active');

      // Create user_programs entry
      const { error: upsertError } = await supabase
        .from('user_programs')
        .upsert({
          user_id: user.id,
          program_id: programId,
          status: 'active',
          started_at: new Date().toISOString(),
          paused_at: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,program_id'
        });

      if (upsertError) throw upsertError;

      // For Kontorikeha Reset, call start_static_program
      if (programId === KONTORIKEHA_RESET_PROGRAM_ID) {
        await supabase.rpc('start_static_program', { p_force: false });
      }

      toast({ title: 'Programm alustatud!', description: 'Sinu programm on nüüd aktiivne.' });
      
      // Refresh calendar to show new program
      refreshCalendar();
      
      // Small delay to ensure state updates
      setTimeout(() => {
        navigate('/programm');
      }, 100);
    } catch (error: any) {
      console.error('Error starting program:', error);
      const errorMsg = error?.message || 'Programmi alustamine ebaõnnestus. Palun proovi hiljem uuesti.';
      toast({ 
        title: 'Viga', 
        description: errorMsg, 
        variant: 'destructive' 
      });
    } finally {
      setStartingProgramId(null);
    }
  }, [user, navigate, toast, refreshCalendar]);

  // Handle program switching
  const handleSwitchProgram = useCallback(async () => {
    if (!user || !program) return;
    
    setSwitchingProgram(true);
    try {
      // Pause current program
      const { error: pauseError } = await supabase
        .from('user_programs')
        .update({ 
          status: 'paused',
          paused_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('program_id', program.id)
        .eq('status', 'active');

      if (pauseError) {
        // If no user_programs entry exists, create one as paused
        await supabase
          .from('user_programs')
          .insert({
            user_id: user.id,
            program_id: program.id,
            status: 'paused',
            paused_at: new Date().toISOString()
          });
      }

      toast({ title: 'Programm peatatud', description: 'Sinu progress on salvestatud. Saad seda hiljem jätkata.' });
      navigate('/programmid');
    } catch (error: any) {
      console.error('Error switching program:', error);
      const errorMsg = error?.message || 'Programmi vahetamine ebaõnnestus. Palun proovi hiljem uuesti.';
      toast({ 
        title: 'Viga', 
        description: errorMsg, 
        variant: 'destructive' 
      });
    } finally {
      setSwitchingProgram(false);
      setShowSwitchDialog(false);
    }
  }, [user, program, navigate, toast]);

  // Beautiful empty state with program selection
  if (!loading && !hasActiveProgram) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-6 shadow-xl">
              <Target className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Vali oma treeningprogramm
            </h2>
            <p className="text-lg text-gray-600 mb-2 max-w-2xl mx-auto">
              Alusta oma tervisliku elustiili teekonda valides endale sobiva programmi
            </p>
            <p className="text-sm text-gray-500">
              Programm avaneb päev-päevalt ja aitab sul järjepidevust hoida
            </p>
          </div>

          {/* Available Programs Grid - Beautiful Cards */}
          {availablePrograms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {availablePrograms.map((p) => (
                <Card 
                  key={p.id} 
                  className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 hover:border-blue-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300"></div>
                  <CardHeader className="relative pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl font-bold text-gray-900 pr-2">{p.title}</CardTitle>
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <Target className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-gray-600 min-h-[3rem]">
                      {p.description || `${(p.duration_weeks || 4) * 7} päeva programm`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative space-y-3 pt-2">
                    <div className="flex items-center gap-4 text-xs text-gray-500 pb-2 border-b border-gray-200">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {(p.duration_weeks || 4) * 7} päeva
                      </span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                        Alustaja
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleStartFromEmptyState(p.id)}
                        disabled={startingProgramId === p.id}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
                      >
                        {startingProgramId === p.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Alustan...
                          </>
                        ) : (
                          <>
                            <Target className="h-4 w-4 mr-2" />
                            Alusta kohe
                          </>
                        )}
                      </Button>
                      <Button 
                        asChild
                        variant="outline"
                        className="flex-1 border-gray-300 hover:bg-gray-50"
                      >
                        <Link to="/programmid">
                          Üksikasjad
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 mb-8 shadow-lg">
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2 font-medium">Programme pole hetkel saadaval</p>
                <p className="text-sm text-gray-500">Palun kontrolli hiljem uuesti</p>
              </CardContent>
            </Card>
          )}

          {/* Footer CTA */}
          <div className="text-center">
            <Button 
              onClick={() => navigate('/programmid')}
              size="lg"
              variant="outline"
              className="border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-8"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vaata kõiki programme
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Safety check: if hasActiveProgram is true but program is null, show loading state
  if (hasActiveProgram && !program) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">Laen programmi andmeid...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl space-y-6 sm:space-y-8">
      {/* Header - Beautiful Design */}
      <div className="text-center space-y-4 sm:space-y-5 mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-2 shadow-lg">
          <Target className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {(() => {
            return program?.title || 'Treeningprogramm';
          })()}
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
          {program?.description || 'Treeningprogramm, mis avaneb päev-päevalt'}
        </p>
        
        {/* Progress Badge */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border-2 border-blue-200/50 shadow-md">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-gray-900">
              {completedDays}/{totalDays} päeva tehtud
            </span>
            <span className="text-xs text-gray-500">
              ({Math.round((completedDays / totalDays) * 100)}%)
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSwitchDialog(true)}
              className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
              Vaheta
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/programmid')}
              className="flex items-center gap-2 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Tagasi
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <CalendarGrid
        days={days}
        totalDays={totalDays}
        completedDays={completedDays}
        onDayClick={handleDayClick}
      />

      {/* Inline Day Viewer when routed */}
      {activeDayData && (
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{activeDayData.title || `Nädal ${activeDayData.week} - Päev ${activeDayData.day}`}</h3>
              {activeDayData.notes && (
                <p className="text-sm text-muted-foreground">{activeDayData.notes}</p>
              )}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => {
                const n = i + 1;
                const name = activeDayData[`exercise${n}`];
                const reps = activeDayData[`reps${n}`];
                const seconds = activeDayData[`seconds${n}`];
                const sets = activeDayData[`sets${n}`];
                const hint = activeDayData[`hint${n}`];
                const video = activeDayData[`videolink${n}`];
                if (!name) return null;
                return (
                  <div key={n} className="rounded-lg border p-3" ref={n === 1 ? firstExerciseRef : undefined}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{name}</div>
                      <div className="text-sm text-muted-foreground">
                        {sets ? `${sets} seeriat` : ''}
                        {reps ? ` • ${reps} kordust` : ''}
                        {seconds ? ` • ${seconds}s` : ''}
                      </div>
                    </div>
                    {hint && <div className="text-sm text-muted-foreground mt-1">{hint}</div>}
                    {video && (
                      <div className="mt-3">
                        <iframe
                          src={video.includes('youtube.com') || video.includes('youtu.be') ?
                            (video.includes('embed') ? `${video}` : `https://www.youtube-nocookie.com/embed/${(video.split('v=')[1]||'').split('&')[0] || video.split('youtu.be/')[1] || ''}`)
                            : video
                          }
                          className="w-full h-[200px]"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          title={`${name} video`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Mark as done button - moved to bottom */}
            {routeDayNumber && (
              <div className="flex justify-center pt-6 border-t">
                <Button
                  onClick={async () => {
                    console.log('Märgi tehtuks button clicked!', { routeDayNumber, activeDayData });
                    const dn = Number(routeDayNumber);
                    const ok = await handleDayCompletion(dn);
                    console.log('handleDayCompletion result:', ok);
                    // The scroll logic is now handled in handleDayCompletion
                  }}
                  disabled={completingDay === Number(routeDayNumber)}
                  className="h-12 px-8 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {completingDay === Number(routeDayNumber) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvestan...
                    </>
                  ) : (
                    'Märgi tehtuks'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quote Display Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
          <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Päev {selectedDay}</h3>
                  <p className="text-sm text-muted-foreground">
                    Avaneb täna kell 07:00 (Eesti aeg)
                  </p>
                </div>
                
                {(() => {
                  const day = days.find(d => d.dayNumber === selectedDay);
                  return day?.quote ? (
                    <QuoteDisplay 
                      quote={day.quote} 
                      unlockTime={day.unlockTime}
                    />
                  ) : null;
                })()}
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setSelectedDay(null)} 
                    variant="outline" 
                    className="flex-1"
                  >
                    Sulge
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructions - Enhanced Visual Design */}
      <Card className="bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 border-2 border-blue-100/50">
        <CardContent className="p-6 sm:p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Kuidas programm töötab?</h3>
            </div>
            <div className="grid gap-4 sm:gap-5">
              <div className="flex items-start gap-4 p-4 bg-white/60 rounded-lg border border-gray-200/50 hover:bg-white/80 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md">1</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">Uued päevad avanevad</p>
                  <p className="text-sm text-gray-600">
                    Igal nädalapäeval kell 07:00 avaneb uus treeningpäev automaatselt
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-white/60 rounded-lg border border-gray-200/50 hover:bg-white/80 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-md">2</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">Nädalavahetused</p>
                  <p className="text-sm text-gray-600">
                    Nädalavahetused suunatakse mindfulness lehele puhkamiseks
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-white/60 rounded-lg border border-gray-200/50 hover:bg-white/80 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-sm font-bold text-white shadow-md">3</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">Järjepidevus</p>
                  <p className="text-sm text-gray-600">
                    Võid alati tagasi minna ja lõpetada varem avatud päevi. Progress salvestatakse automaatselt.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Program Switching Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showSwitchDialog}
        onClose={() => setShowSwitchDialog(false)}
        onConfirm={handleSwitchProgram}
        title="Vaheta programmi"
        description={`Kas oled kindel, et soovid vahetada programmi "${program?.title}"? Sinu praegune progress salvestatakse ja saad seda hiljem jätkata.`}
        confirmText="Jah, vaheta"
        cancelText="Tühista"
        variant="warning"
        isLoading={switchingProgram}
        loadingText="Salvestan..."
      />
    </div>
  );
}