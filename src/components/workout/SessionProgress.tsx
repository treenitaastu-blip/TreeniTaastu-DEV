// src/components/workout/SessionProgress.tsx
import { useMemo } from "react";

export type SessionProgressProps = {
  startedAt: string;               // ISO string
  totalSets?: number;              // total sets in workout
  completedSets?: number;          // sets done so far
  onFinish?: () => void;           // optional callback when user finishes
  className?: string;
};

export default function SessionProgress({
  startedAt,
  totalSets = 0,
  completedSets = 0,
  onFinish,
  className = "",
}: SessionProgressProps) {
  const elapsedMin = useMemo(() => {
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.round((now - start) / 60000));
  }, [startedAt]);

  const pct =
    totalSets > 0 ? Math.min(100, Math.round((completedSets / totalSets) * 100)) : 0;

  return (
    <div className={`rounded-xl border bg-card p-3 shadow-sm ${className}`}>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Alustatud: {new Date(startedAt).toLocaleTimeString("et-EE")}</span>
        <span>Kestus: {elapsedMin} min</span>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute left-0 top-0 h-full bg-primary transition-[width]"
          style={{ width: `${pct}%` }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          role="progressbar"
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="tabular-nums">
          Seeriad: {completedSets}/{totalSets}
        </span>
        {onFinish && (
          <button
            type="button"
            onClick={onFinish}
            className="rounded-md border px-2 py-1 text-xs hover:bg-muted/60"
          >
            Lõpeta
          </button>
        )}
      </div>
    </div>
  );
}
