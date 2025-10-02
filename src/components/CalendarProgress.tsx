// src/components/CalendarProgress.tsx
import { useMemo } from "react";
import { CheckCircle, Calendar, Coffee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CompletedDay = {
  dateISO: string;
  programdayId?: string;
};

type CalendarProgressProps = {
  completedDays: CompletedDay[];
  totalProgramDays: number;
  /** Klikk päeval → tagastame YYYY-MM-DD (lokaalne päev) */
  onDayClick?: (dateISO: string) => void;
};

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6; // P, L
}
function isToday(date: Date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function CalendarProgress({
  completedDays,
  totalProgramDays,
  onDayClick,
}: CalendarProgressProps) {
  const calendarDays = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // algus: esmaspäev (Mon=0)
    const startDate = new Date(firstDay);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7;
    startDate.setDate(firstDay.getDate() - startDayOfWeek);

    // lõpp: pühapäev
    const endDate = new Date(lastDay);
    const endDayOfWeek = (lastDay.getDay() + 6) % 7;
    endDate.setDate(lastDay.getDate() + (6 - endDayOfWeek));

    const days: Array<{
      date: Date;
      dateISO: string;
      isCompleted: boolean;
      isCurrentMonth: boolean;
      isWeekend: boolean;
      isToday: boolean;
    }> = [];

    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dateLocal = new Date(cur);
      dateLocal.setHours(0, 0, 0, 0);
      const dateISO = dateLocal.toISOString().slice(0, 10);

      days.push({
        date: new Date(cur),
        dateISO,
        isCompleted: completedDays.some((cd) => cd.dateISO === dateISO),
        isCurrentMonth: cur.getMonth() === month,
        isWeekend: isWeekend(cur),
        isToday: isToday(cur),
      });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [completedDays]);

  const monthName = new Date().toLocaleDateString("et-EE", {
    month: "long",
    year: "numeric",
  });
  const weekDays = ["E", "T", "K", "N", "R", "L", "P"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {monthName}
          </span>
          {/* use totalProgramDays so it’s not flagged as unused */}
          <span className="text-xs text-muted-foreground">
            Kokku programmis: {totalProgramDays} päeva
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* nädalapäevad */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {weekDays.map((d) => (
            <div
              key={d}
              className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        {/* kalender */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const clickable = !!onDayClick && day.isCurrentMonth;
            let cls =
              "relative h-10 select-none rounded-lg border text-sm transition-colors flex items-center justify-center ";
            if (!day.isCurrentMonth) {
              cls += "border-transparent text-muted-foreground/50 ";
            } else if (day.isToday) {
              cls +=
                "border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100 font-semibold ";
            } else if (day.isWeekend) {
              cls +=
                "border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 ";
            } else {
              cls += "border-border ";
            }
            if (clickable)
              cls +=
                "cursor-pointer hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-blue-600 ";

            return (
              <div
                key={idx}
                className={cls}
                onClick={clickable ? () => onDayClick?.(day.dateISO) : undefined}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : -1}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onDayClick?.(day.dateISO);
                        }
                      }
                    : undefined
                }
                aria-label={
                  clickable ? `Vali kuupäev ${day.dateISO}` : undefined
                }
              >
                <span className="relative z-10">{day.date.getDate()}</span>

                {day.isCompleted && (
                  <CheckCircle className="absolute right-1 top-1 h-3 w-3 text-green-600 z-20" />
                )}
                {day.isWeekend && day.isCurrentMonth && (
                  <Coffee className="absolute bottom-1 left-1 h-3 w-3 text-orange-500 z-20" />
                )}
                {day.isToday && (
                  <div className="pointer-events-none absolute inset-0 rounded-lg border-2 border-blue-600" />
                )}
              </div>
            );
          })}
        </div>

        {/* legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span>Lõpetatud</span>
          </div>
          <div className="flex items-center gap-2">
            <Coffee className="h-3 w-3 text-orange-500" />
            <span>Puhkepäev</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded border-2 border-blue-600" />
            <span>Täna</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}