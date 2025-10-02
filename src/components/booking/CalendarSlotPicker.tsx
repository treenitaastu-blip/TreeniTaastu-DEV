import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isSameDay } from "date-fns";
import { et } from "date-fns/locale";

interface CalendarSlotPickerProps {
  serviceType: string;
  onSlotSelect: (slot: { start: string; end: string }) => void;
}

interface TimeSlot {
  start: string;
  end: string;
}

export function CalendarSlotPicker({ serviceType, onSlotSelect }: CalendarSlotPickerProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const serviceDurations = {
    'initial_assessment': 30,
    'personal_program': 30,
    'monthly_support': 30
  };

  const durationMinutes = serviceDurations[serviceType as keyof typeof serviceDurations] || 60;

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchAvailableSlots = async (date: Date) => {
    setLoading(true);
    try {
      const startDate = format(date, 'yyyy-MM-dd') + 'T00:00:00Z';
      const endDate = format(date, 'yyyy-MM-dd') + 'T23:59:59Z';

      const { data, error } = await supabase.functions.invoke('get-available-slots', {
        body: {
          startDate,
          endDate,
          durationMinutes
        }
      });

      if (error) throw error;

      // Filter slots for the selected date only
      const daySlots = data.availableSlots.filter((slot: TimeSlot) =>
        isSameDay(new Date(slot.start), date)
      );

      setAvailableSlots(daySlots);
    } catch (error: any) {
      toast({
        title: "Viga",
        description: error.message || "Saadaolevate aegade laadimine ebaõnnestus",
        variant: "destructive"
      });
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) return true;
    
    // Only allow Wednesday (3) and Saturday (6)
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 3 && dayOfWeek !== 6;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Valige kuupäev</h3>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={isDateDisabled}
          locale={et}
          className="rounded-md border pointer-events-auto"
        />
      </div>

      {selectedDate && (
        <div>
          <h3 className="text-lg font-medium mb-4">
            Saadaolevad ajad - {format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: et })}
          </h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Laen saadaolevaid aegu...</p>
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableSlots.map((slot, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => onSlotSelect(slot)}
                  className="justify-center"
                >
                  {format(new Date(slot.start), 'HH:mm')} - {format(new Date(slot.end), 'HH:mm')}
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Valitud kuupäeval pole saadaolevaid aegu.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Proovige teist kuupäeva või võtke otse ühendust.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-muted p-4 rounded-lg">
        <h4 className="font-medium mb-2">Broneerimise info:</h4>
        <p className="text-sm text-muted-foreground">
          Seansi kestus: {durationMinutes} minutit
        </p>
        <p className="text-sm text-muted-foreground">
          Broneerimise ajad: Kolmapäev ja laupäev 15:00-19:00
        </p>
        <p className="text-sm text-muted-foreground">
          Muud päevad pole saadaval
        </p>
      </div>
    </div>
  );
}