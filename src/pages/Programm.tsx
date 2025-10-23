import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useProgramCalendarState } from '@/hooks/useProgramCalendarState';
import { useWeekendRedirect } from '@/hooks/useWeekendRedirect';
import { Loader2, RefreshCw, ArrowLeft, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import QuoteDisplay from '@/components/calendar/QuoteDisplay';
import { getTallinnDate, isAfterUnlockTime } from '@/lib/workweek';
import { supabase } from '@/integrations/supabase/client';

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
  const firstExerciseRef = useRef<HTMLDivElement | null>(null);

  const loadProgramDayByNumber = useCallback(async (dayNum: number) => {
    if (!program) return;

    console.log('Loading program day:', dayNum, 'for program:', program.title);

    // For "Kontorikeha Reset" program, use existing programday structure
    if (program.title === 'Kontorikeha Reset') {
      const week = Math.ceil(dayNum / 5);
      const day = ((dayNum - 1) % 5) + 1;
      const { data, error } = await supabase
        .from('programday')
        .select('*')
        .eq('week', week)
        .eq('day', day)
        .single();
      if (error) {
        console.error('programday load error', error);
        toast({ title: 'Viga', description: 'Päeva laadimine ebaõnnestus', variant: 'destructive' });
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
    
    console.log('handleDayCompletion called with:', { dayNumber, user: user.id, program: program.title, activeDayData });
    
    try {
      // For "Kontorikeha Reset" program, use existing function
      if (program.title === 'Kontorikeha Reset') {
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
          toast({ title: 'Viga', description: 'Päeva märkimine ebaõnnestus', variant: 'destructive' });
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
    }
    return false;
  }, [user, program, activeDayData, markDayCompleted, navigate, toast]);

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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={refreshCalendar} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Proovi uuesti
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect if no active program
  if (!loading && !hasActiveProgram) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Pole aktiivset programmi
          </h2>
          <p className="text-gray-600 mb-6">
            Vali programm, et alustada oma treeningteekonda.
          </p>
          <Button 
            onClick={() => navigate('/programmid')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Vali programm
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
          {program?.title || 'Treeningprogramm'}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {program?.description || 'Treeningprogramm, mis avaneb päev-päevalt'}
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>{completedDays}/{totalDays} päeva tehtud</span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/programmid')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Tagasi programmide juurde
          </Button>
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
                  className="h-12 px-8 bg-green-600 hover:bg-green-700 text-white text-lg font-semibold"
                >
                  Märgi tehtuks
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
                    Avaneb täna kell 15:00 (Eesti aeg)
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

      {/* Instructions */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Kuidas programm töötab?</h3>
            <div className="grid gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <p className="font-medium">Uued päevad avanevad</p>
                  <p className="text-muted-foreground">
                    Igal nädalapäeval kell 15:00 avaneb uus treeningpäev
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <p className="font-medium">Nädalavahetused</p>
                  <p className="text-muted-foreground">
                    Nädalavahetused suunatakse mindfulness lehele
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <p className="font-medium">Järjepidevus</p>
                  <p className="text-muted-foreground">
                    Võid alati tagasi minna ja lõpetada varem avatud päevi
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}