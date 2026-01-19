// src/pages/Landing.tsx
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import useAccess from "@/hooks/useAccess";
import type { ProgramDay, UserProgress } from "@/types/program";
import { normalizeExercises, convertLegacyProgramDay } from "@/lib/program";

function fmt(dt?: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleString("et-EE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Landing() {
  const { user } = useAuth();
  const { loading, canStatic, canPT } = useAccess();

  const isSubscriber = !!(canStatic || canPT);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-10">Laen…</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5">
        <div className="max-w-5xl mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-primary via-primary to-primary-foreground bg-clip-text text-transparent">
                Muuda oma elu
              </span>
              <br />
              <span className="text-5xl text-foreground font-bold">28 päevaga</span>
            </h1>
            <p className="text-xl text-foreground/80 mb-8 max-w-2xl mx-auto font-medium">
              Personaalsed treeningkavad + ekspertide tugi. Tulemused garanteeritud.
            </p>
          </div>

          {/* CTA Button */}
          <div className="text-center mb-12">
            <Link
              to="/pricing"
              className="inline-block px-8 py-4 bg-primary text-primary-foreground rounded-lg font-bold text-lg hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Vaata hinnakirja ja alusta
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              Alusta tasuta prooviga • Tühista igal ajal
            </p>
          </div>

          {/* What's Included */}
          <div className="text-center mb-8">
            <div className="max-w-xl mx-auto space-y-3">
              <div className="flex items-center justify-center gap-3 text-left">
                <div className="text-primary font-bold">✓</div>
                <span>Personaalsed treeningkavad igaks nädalaks</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-left">
                <div className="text-primary font-bold">✓</div>
                <span>Video juhendid iga harjutuse jaoks</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-left">
                <div className="text-primary font-bold">✓</div>
                <span>Progressi jälgimine ja analüütika</span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mt-6 max-w-md mx-auto">
              <strong>Personaaltreening, nõustamine ja individuaalplaanid</strong> saadaval pärast tellimust jaotises "Hinnad"
            </p>
          </div>

          {/* Social Proof */}
          <div className="text-center">
            <div className="flex justify-center items-center gap-2 text-yellow-500 mb-2">
              {"★".repeat(5)}
            </div>
            <p className="text-muted-foreground">
              "Uskumatu muutus 4 nädalaga!" - Liis, 31
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isSubscriber) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="text-center bg-card rounded-3xl shadow-2xl border p-12">
            <div className="text-6xl mb-6">🔓</div>
            <h1 className="text-4xl font-bold mb-6">
              Jätka oma fitness-teekonda
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Sa oled teinud suurepärast tööd! Jätka oma progressi ja saavuta oma eesmärgid 
              meie personaalsete treeningkavadega.
            </p>
            
            {/* Benefits for returning users */}
            <div className="grid grid-cols-1 gap-4 mb-8 text-left">
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                <div className="text-primary">✓</div>
                <span>Jätka seal, kus poolele jäid</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                <div className="text-primary">✓</div>
                <span>Uued treeningkavad ja harjutused</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                <div className="text-primary">✓</div>
                <span>Pidev treenerite tugi</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Link
                to="/pricing"
                className="w-full px-8 py-4 bg-primary text-primary-foreground rounded-lg font-bold text-lg hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Aktiveeri ligipääs
              </Link>
              <p className="text-sm text-muted-foreground">
                Alates 14,99€/kuu • Loobu igal ajal
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}

type LegacyRow = {
  id: string;
  week: number;
  day: number;
  title?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
} & Record<string, unknown>;

function Dashboard() {
  const { user } = useAuth();

  const [days, setDays] = useState<ProgramDay[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // Get Kontorikeha Reset program ID
        const { data: program } = await supabase
          .from("programs")
          .select("id")
          .eq("title", "Kontorikeha Reset")
          .single();

        const [d1, d2] = await Promise.all([
          supabase
            .from("programday")
            .select(`
              id, week, day, title, notes, created_at, updated_at,
              exercise1, exercise2, exercise3, exercise4, exercise5,
              videolink1, videolink2, videolink3, videolink4, videolink5,
              sets1, sets2, sets3, sets4, sets5,
              reps1, reps2, reps3, reps4, reps5,
              seconds1, seconds2, seconds3, seconds4, seconds5,
              hint1, hint2, hint3, hint4, hint5
            `)
            .eq("program_id", program?.id || "e1ab6f77-5a43-4c05-ac0d-02101b499e4c")
            .order("week", { ascending: true })
            .order("day", { ascending: true }),
          user
            ? supabase
                .from("userprogress")
                .select("programday_id, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (cancel) return;
        if (d1.error) throw d1.error;
        if (d2.error) console.warn("[progress fetch]", d2.error);

        const legacyRows = (d1.data ?? []) as unknown as LegacyRow[];
        const mapped: ProgramDay[] = legacyRows.map((row) => ({
          id: row.id,
          week: row.week,
          day: row.day,
          title: row.title ?? null,
          notes: row.notes ?? null,
          exercises: convertLegacyProgramDay(row),
          created_at: row.created_at,
          updated_at: row.updated_at ?? null,
        }));
        setDays(mapped);

        setProgress(((d2.data as UserProgress[]) ?? []) as UserProgress[]);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Viga andmete laadimisel";
        setErr(msg);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [user?.id]);

  const doneIds = useMemo(
    () => new Set(progress.map((p) => p.programday_id)),
    [progress]
  );
  const completedCount = doneIds.size;
  const totalCount = days.length || 20;
  const pct = Math.min(
    Math.round((completedCount / Math.max(totalCount, 1)) * 100),
    100
  );

  const nextDay = useMemo(() => {
    if (!days.length) return undefined;
    return days.find((d) => !doneIds.has(d.id)) || days[0];
  }, [days, doneIds]);

  const lastActions = useMemo(
    () =>
      [...progress]
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        )
        .slice(0, 3),
    [progress]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Tänane treening */}
      <div className="rounded-2xl border p-5 mb-8">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div>
            <div className="text-lg font-semibold">Tänane treening</div>
            <div className="text-sm opacity-70">
              {nextDay ? (
                <>Nädal {nextDay.week} • Päev {nextDay.day}</>
              ) : (
                "Programmi päevi ei leitud"
              )}
            </div>
          </div>
          <Link
            to="/programm"
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-black hover:text-white transition"
          >
            {completedCount === 0 ? "Alusta" : "Jätka"}
          </Link>
        </div>

        <ul className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
          {nextDay ? (
            normalizeExercises(nextDay.exercises).map((exercise, i) => (
              <li key={i} className="px-3 py-2 rounded-lg border">
                {exercise.name}
              </li>
            ))
          ) : (
            <li className="text-gray-500">Selle päeva harjutused lisamata.</li>
          )}
        </ul>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold">Sinu progress</div>
          <div className="text-sm opacity-70">
            {loading ? "Laen…" : `${completedCount}/${totalCount} päeva tehtud`}
          </div>
        </div>
        <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-3 bg-black transition-all"
            style={{ width: loading ? "0%" : `${pct}%` }}
          />
        </div>
      </div>

      {/* Viimased tegevused */}
      <div className="rounded-2xl border p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Viimased tegevused</div>
          <Link to="/progress" className="text-sm underline underline-offset-4">
            Vaata rohkem
          </Link>
        </div>
        {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
        {loading ? (
          <div className="text-sm text-gray-600">Laen…</div>
        ) : lastActions.length ? (
          <ul className="space-y-2">
            {lastActions.map((a, i) => (
              <li key={i} className="text-sm text-gray-800">
                ✔︎ Päev märgitud tehtuks
                {a.created_at ? (
                  <span className="opacity-70"> — {fmt(a.created_at)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-600">Tegevusi pole veel.</div>
        )}
      </div>
    </div>
  );
}
