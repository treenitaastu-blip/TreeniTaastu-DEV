// src/pages/admin/Analytics.tsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Button } from "@/components/ui/button";
import { RotateCw, Users } from "lucide-react";

/** ---------- Data shape (all optional to avoid runtime crashes) ---------- */
type AnalyticsData = {
  totalUsers?: number;
  activeUsers7d?: number;
  newUsers7d?: number;

  avgSessionsPerUser7d?: number;
  completionRate30d?: number; // 0..1
  avgRpe7d?: number;

  workoutsStarted7d?: number;
  workoutsCompleted7d?: number;

  dropoffDayMean?: number; // average day where users stop
  retentionDay7?: number;  // 0..1
  retentionDay30?: number; // 0..1
};

/** ---------- Safe formatters ---------- */
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);

const fmtInt = (v: unknown, empty = "—") => {
  const x = n(v);
  return Number.isFinite(x) ? Math.round(x).toLocaleString("et-EE") : empty;
};
const fmtFixed1 = (v: unknown, empty = "—") => {
  const x = n(v);
  return Number.isFinite(x) ? x.toFixed(1) : empty;
};
const fmtPct = (v: unknown, empty = "—") => {
  const x = n(v);
  return Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : empty;
};

/** ---------- Simple trend heuristics (pure functions) ---------- */
type Trend = "positive" | "neutral" | "negative";

const completionTrend = (rate?: number): Trend => {
  const r = n(rate);
  if (!Number.isFinite(r)) return "neutral";
  if (r >= 0.6) return "positive";
  if (r <= 0.3) return "negative";
  return "neutral";
};
const rpeTrend = (avg?: number): Trend => {
  const r = n(avg);
  if (!Number.isFinite(r)) return "neutral";
  if (r >= 6.5) return "negative";
  if (r >= 5 && r < 6.5) return "positive";
  return "neutral";
};
const dropoffTrend = (day?: number): Trend => {
  const d = n(day);
  if (!Number.isFinite(d)) return "neutral";
  if (d >= 10) return "positive";
  if (d <= 3) return "negative";
  return "neutral";
};

const TREND_PILL: Record<Trend, string> = {
  positive:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  neutral:
    "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
  negative:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};
const TREND_ICON: Record<Trend, string> = { positive: "📈", neutral: "⟷", negative: "📉" };

/** ---------- Metric builder (no hooks inside) ---------- */
function buildMetrics(d: AnalyticsData) {
  return [
    { title: "Kasutajad kokku", value: fmtInt(d.totalUsers), hint: "Kõik kasutajad" },
    { title: "Aktiivsed (7p)", value: fmtInt(d.activeUsers7d), hint: "7 päeva jooksul aktiivsed" },
    { title: "Uued (7p)", value: fmtInt(d.newUsers7d), hint: "Viimase 7 päeva jooksul liitunud" },

    { title: "Treeningud alustatud (7p)", value: fmtInt(d.workoutsStarted7d), hint: "Alustatud sessioonid 7p" },
    { title: "Treeningud lõpetatud (7p)", value: fmtInt(d.workoutsCompleted7d), hint: "Lõpetatud sessioonid 7p" },

    { title: "Keskmine sessioonid/kasutaja (7p)", value: fmtFixed1(d.avgSessionsPerUser7d), hint: "Sessioonide keskmine" },
    {
      title: "Lõpetamise määr (30p)",
      value: fmtPct(d.completionRate30d),
      hint: "Lõpetatud / alustatud",
      trend: completionTrend(d.completionRate30d),
    },
    {
      title: "Keskmine RPE (7p)",
      value: fmtFixed1(d.avgRpe7d),
      hint: "Tajutud koormus",
      trend: rpeTrend(d.avgRpe7d),
    },
    {
      title: "Ärajäämise päev (keskm.)",
      value: fmtFixed1(d.dropoffDayMean),
      hint: "Mitu päeva kuni katkestus",
      trend: dropoffTrend(d.dropoffDayMean),
    },
    { title: "Retentsioon D7", value: fmtPct(d.retentionDay7), hint: "Püsivus 7. päeval" },
    { title: "Retentsioon D30", value: fmtPct(d.retentionDay30), hint: "Püsivus 30. päeval" },
  ] as Array<{ title: string; value: string; hint?: string; trend?: Trend }>;
}

/** ---------- Skeleton ---------- */
function SkeletonGrid() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-3 w-40 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </section>
  );
}

/** ---------- Page ---------- */
export default function Analytics() {
  const navigate = useNavigate();
  
  // Be liberal with the hook return shape so we never crash if the hook evolves
  const { data, loading, error, refresh } = (useAnalytics() as unknown) as {
    data?: AnalyticsData | null;
    loading: boolean;
    error?: unknown;
    refresh?: () => void | Promise<void>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="container mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8" role="status" aria-busy="true">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <div className="text-xs text-muted-foreground">Laen andmeid…</div>
          </header>
          <SkeletonGrid />
        </div>
      </div>
    );
  }

  if (error) {
    const msg =
      (typeof error === "string" && error) ||
      (error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message)
        : "Viga andmete laadimisel.");
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="container mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-destructive" role="alert">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Viga andmete laadimisel</h2>
              {refresh && (
                <button
                  onClick={() => void refresh()}
                  className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs hover:bg-red-50"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Proovi uuesti
                </button>
              )}
            </div>
            <p className="text-sm opacity-80">{msg}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="container mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
          <div className="text-center text-sm text-muted-foreground">
            Andmeid ei leitud.
          </div>
        </div>
      </div>
    );
  }

  const metrics = buildMetrics(data);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="container mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">Ülevaade</h2>
              <p className="text-sm text-muted-foreground">
                Peamised statistikud ja trendid
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Button
                onClick={() => navigate("/admin/client-analytics")}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
                size="sm"
              >
                <Users className="h-4 w-4" />
                <span className="sm:hidden">Kliendi analüütika</span>
                <span className="hidden sm:inline">Kliendi analüütika</span>
              </Button>
              {refresh && (
                <button
                  onClick={() => void refresh()}
                  className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted transition-colors w-full sm:w-auto"
                  aria-label="Värskenda"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Värskenda
                </button>
              )}
            </div>
          </div>

          <section className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
            {metrics.map((m) => {
              const t: Trend = m.trend ?? "neutral";
              return (
                <article
                  key={m.title}
                  className="rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-2 sm:mb-3 flex items-start justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">{m.title}</h3>
                    {m.trend && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] flex-shrink-0 ${TREND_PILL[t]}`}
                        title={`Trend: ${t}`}
                        aria-label={`Trend ${t}`}
                      >
                        <span aria-hidden="true">{TREND_ICON[t]}</span>
                        <span className="capitalize hidden sm:inline">{t}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-2xl sm:text-3xl font-semibold tabular-nums mb-1">{m.value}</div>
                  {m.hint && <p className="text-xs text-muted-foreground leading-tight">{m.hint}</p>}
                </article>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}