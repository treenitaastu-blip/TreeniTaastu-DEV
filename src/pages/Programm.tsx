import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCalendarState } from '@/hooks/useCalendarState';
import { useWeekendRedirect } from '@/hooks/useWeekendRedirect';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    days,
    totalDays,
    completedDays,
    loading,
    error,
    refreshCalendar,
    markDayCompleted
  } = useCalendarState();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeDayData, setActiveDayData] = useState<any | null>(null);
  const firstExerciseRef = useRef<HTMLDivElement | null>(null);

  const loadProgramDayByNumber = useCallback(async (dayNum: number) => {
    // derive week/day from linear day number (1-based)
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
  }, [toast]);

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
      // small delay to ensure layout is ready
      setTimeout(() => {
        firstExerciseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
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
  const handleDayCompletion = useCallback(async (dayNumber: number) => {
    const success = await markDayCompleted(dayNumber);
    if (success) {
      toast({
        title: "Suurepärane!",
        description: `Päev ${dayNumber} on märgitud lõpetatuks`,
      });
    } else {
      toast({
        title: "Viga",
        description: "Päeva märkimine lõpetatuks ebaõnnestus",
        variant: "destructive",
      });
    }
  }, [markDayCompleted, toast]);

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

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 sm:space-y-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Kontorikeha Treeningprogramm</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          20-päevane treeningprogramm, mis avaneb päev-päevalt
        </p>
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
            {/* Mark as done button */}
            {routeDayNumber && (
              <div className="flex justify-end">
                <Button
                  onClick={() => handleDayCompletion(Number(routeDayNumber))}
                  className="h-9"
                >
                  Märgi tehtuks
                </Button>
              </div>
            )}
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