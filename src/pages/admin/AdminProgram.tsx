// src/pages/admin/AdminProgram.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* ---------- Types (subset of columns used) ---------- */
type UUID = string;

type Program = {
  id: UUID;
  template_id: UUID | null;
  assigned_to: UUID;
  start_date: string | null;
  is_active: boolean | null;
  inserted_at: string | null;
};

type Profile = { id: UUID; email: string | null };

type ClientDay = {
  id: UUID;
  client_program_id: UUID;
  title: string | null;
  day_order: number;
};

type ClientItem = {
  id: UUID;
  client_day_id: UUID;
  exercise_name: string;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  seconds: number | null;
  weight_kg: number | null;
  coach_notes: string | null;
  order_in_day: number;
  video_url: string | null;
};

type Session = { started_at: string | null; ended_at: string | null };

type ExerciseNoteRow = {
  client_item_id: UUID | null;
  program_id?: UUID | null; // may not exist server-side in some schemas
  rpe: number | null;
  notes?: string | null; // column name is "notes"
  inserted_at: string | null;
};

/* ---------- Component ---------- */
export default function AdminProgram() {
  const { id } = useParams<{ id: string }>(); // program id
  const navigate = useNavigate();

  // base data
  const [prog, setProg] = useState<Program | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [days, setDays] = useState<ClientDay[]>([]);
  const [itemsByDay, setItemsByDay] = useState<Record<UUID, ClientItem[]>>({});

  // progress
  const [sessions, setSessions] = useState<Session[]>([]);

  // per-item latest RPE & notes
  const [rpeByItem, setRpeByItem] = useState<Record<UUID, number>>({});
  const [noteByItem, setNoteByItem] = useState<Record<UUID, { text: string; at: string }>>({});

  // ui
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sortedDays = useMemo(
    () => [...days].sort((a, b) => a.day_order - b.day_order),
    [days]
  );
  const completedCount = useMemo(
    () => sessions.filter((s) => Boolean(s.ended_at)).length,
    [sessions]
  );

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        /* 1) Program meta */
        const { data: p, error: pErr } = await supabase
          .from("client_programs")
          .select("id, template_id, assigned_to, start_date, is_active, inserted_at")
          .eq("id", id)
          .single();
        if (pErr) throw pErr;
        setProg(p as Program);

        /* 2) Owner profile */
        if (p?.assigned_to) {
          const { data: prof, error: prErr } = await supabase
            .from("profiles")
            .select("id, email")
            .eq("id", p.assigned_to)
            .single();
          if (prErr) throw prErr;
          setProfile(prof as Profile);
        } else {
          setProfile(null);
        }

        /* 3) Client days */
        const { data: d, error: dErr } = await supabase
          .from("client_days")
          .select("id, client_program_id, title, day_order")
          .eq("client_program_id", id)
          .order("day_order", { ascending: true });
        if (dErr) throw dErr;
        const dayList = (d ?? []) as ClientDay[];
        setDays(dayList);

        /* 4) Items for all days in ONE query */
        const dayIds = dayList.map((x) => x.id);
        let itemList: ClientItem[] = [];
        if (dayIds.length > 0) {
          const { data: it, error: iErr } = await supabase
            .from("client_items")
            .select(
              "id, client_day_id, exercise_name, sets, reps, rest_seconds, seconds, weight_kg, coach_notes, order_in_day, video_url"
            )
            .in("client_day_id", dayIds)
            .order("order_in_day", { ascending: true });
          if (iErr) throw iErr;
          itemList = (it ?? []) as ClientItem[];

          const map: Record<UUID, ClientItem[]> = {};
          for (const row of itemList) {
            (map[row.client_day_id] ??= []).push(row);
          }
          setItemsByDay(map);
        } else {
          setItemsByDay({});
        }

        /* 5) Progress: recent sessions */
        const { data: sess, error: sErr } = await supabase
          .from("workout_sessions")
          .select("started_at, ended_at")
          .eq("client_program_id", id)
          .order("started_at", { ascending: false })
          .limit(8);
        if (sErr) throw sErr;
        setSessions((sess ?? []) as Session[]);

        /* 6) Per-item latest RPE + client note from exercise_notes */
        const itemIds = itemList.map((i) => i.id);
        if (itemIds.length > 0) {
          // base select
          const baseSelect = supabase
            .from("exercise_notes")
            .select("client_item_id, rpe, notes, inserted_at, program_id")
            .in("client_item_id", itemIds)
            .order("inserted_at", { ascending: false })
            .limit(Math.min(5000, itemIds.length * 5));

          let notesRows: ExerciseNoteRow[] = [];

          // Try with program filter first (if column exists, server will accept filter)
          const withProgram = await baseSelect.filter("program_id", "eq", id);
          if (!withProgram.error && Array.isArray(withProgram.data)) {
            notesRows = withProgram.data as ExerciseNoteRow[];
          } else {
            // Fallback to no filter
            const withoutProgram = await baseSelect;
            if (withoutProgram.error) throw withoutProgram.error;
            notesRows = (withoutProgram.data ?? []) as ExerciseNoteRow[];
          }

          const rpeMap: Record<UUID, number> = {};
          const noteMap: Record<UUID, { text: string; at: string }> = {};
          for (const row of notesRows) {
            const key = row.client_item_id ?? "";
            if (!key) continue;
            // First occurrence is latest due to DESC order
            if (!(key in rpeMap) && typeof row.rpe === "number") {
              rpeMap[key] = row.rpe;
            }
            const text = row.notes?.trim() ?? "";
            if (!(key in noteMap) && text.length > 0) {
              noteMap[key] = { text, at: row.inserted_at ?? "" };
            }
          }

          setRpeByItem(rpeMap);
          setNoteByItem(noteMap);
        } else {
          setRpeByItem({});
          setNoteByItem({});
        }
      } catch (e) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message?: unknown }).message)
            : "Viga andmete laadimisel";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  /* ---------- Render ---------- */
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="text-sm text-gray-600">Laen andmeid…</div>
      </div>
    );
  }

  if (error || !prog) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        {error ? (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        ) : (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-700">
            Programmi ei leitud
          </div>
        )}
        <button
          onClick={() => navigate(-1)}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Tagasi
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-2 py-3 sm:px-4 sm:py-6">
        {/* Header - Optimized for mobile */}
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold leading-tight">
              Programmi detail
            </h1>
            <div className="space-y-1">
              <div className="text-xs sm:text-sm text-muted-foreground">
                <strong>Klient:</strong> <span className="break-all">{profile?.email ?? `${prog.assigned_to.slice(0, 8)}...`}</span>
              </div>
              <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span><strong>Algus:</strong> {prog.start_date || "—"}</span>
                <span className="hidden sm:inline">•</span>
                <span>
                  <strong>Staatus:</strong>{" "}
                  <span className={prog.is_active === false ? "text-destructive" : "text-green-600"}>
                    {prog.is_active === false ? "Mitteaktiivne" : "Aktiivne"}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/admin/programs")}
            className="w-full sm:w-auto rounded-lg border px-3 py-2 sm:px-4 sm:py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            ← Tagasi halduse juurde
          </button>
        </div>

        {/* Progress dashboard - Mobile optimized */}
        <div className="mb-4 sm:mb-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg sm:rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
            <div className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">Tehtud sessioonid</div>
            <div className="text-xl sm:text-2xl font-bold text-primary">{completedCount}</div>
          </div>
          <div className="rounded-lg sm:rounded-xl border bg-card p-3 sm:p-4 shadow-sm">
            <div className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">Viimased sessioonid</div>
            <div className="max-h-16 sm:max-h-20 overflow-y-auto">
              {sessions?.length ? (
                <ul className="space-y-1">
                  {sessions.slice(0, 3).map((s, i) => (
                    <li key={i} className="text-xs">
                      <div className="font-medium">
                        {s.started_at ? new Date(s.started_at).toLocaleDateString("et-EE") : "—"}
                      </div>
                      {s.ended_at && (
                        <div className="text-muted-foreground">
                          {new Date(s.ended_at).toLocaleTimeString("et-EE", { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-muted-foreground">Sessioonid puuduvad</div>
              )}
            </div>
          </div>
          <div className="rounded-lg sm:rounded-xl border bg-card p-3 sm:p-4 shadow-sm sm:col-span-2 lg:col-span-1">
            <div className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">Programmi staatus</div>
            <div className={`text-xl sm:text-2xl font-bold ${prog.is_active === false ? "text-destructive" : "text-green-600"}`}>
              {prog.is_active === false ? "Mitteaktiivne" : "Aktiivne"}
            </div>
          </div>
        </div>

        {/* Structure: days + items - Mobile optimized */}
        <div className="space-y-3 sm:space-y-4">
          {sortedDays.length === 0 ? (
            <div className="rounded-lg sm:rounded-xl border bg-card p-4 sm:p-6 text-center">
              <div className="text-sm text-muted-foreground">Programmi päevi ei leitud</div>
            </div>
          ) : (
            sortedDays.map((d) => (
              <div key={d.id} className="rounded-lg sm:rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="bg-muted/30 px-3 py-2 sm:px-4 sm:py-3 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm sm:text-base">{d.title ?? `Päev ${d.day_order}`}</h3>
                    <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                      #{d.day_order}
                    </span>
                  </div>
                </div>

                <div className="p-3 sm:p-4">
                  {(itemsByDay[d.id] ?? []).length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-sm text-muted-foreground">
                      Selles päevas pole harjutusi määratud
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(itemsByDay[d.id] ?? []).map((it, index) => {
                        const rpeVal = rpeByItem[it.id];
                        const noteVal = noteByItem[it.id];
                        return (
                          <div key={it.id} className="rounded-md sm:rounded-lg border bg-background/50 p-3 sm:p-4">
                            {/* Exercise header - Mobile optimized */}
                            <div className="flex items-start justify-between mb-2 sm:mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm sm:text-base truncate pr-2">{it.exercise_name}</h4>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Harjutus #{index + 1}
                                </div>
                              </div>
                              {rpeVal != null && (
                                <div className="flex-shrink-0 text-right">
                                  <div className="text-xs text-muted-foreground">RPE</div>
                                  <div className="text-sm font-medium">{rpeVal.toFixed(1)}</div>
                                </div>
                              )}
                            </div>

                            {/* Exercise details - Mobile optimized grid */}
                            <div className="grid grid-cols-2 gap-2 mb-2 sm:mb-3 sm:grid-cols-4 sm:gap-3">
                              <div className="bg-muted/50 rounded p-2 text-center">
                                <div className="text-xs text-muted-foreground">Seeriad</div>
                                <div className="font-medium text-sm">{it.sets ?? "—"}</div>
                              </div>
                              <div className="bg-muted/50 rounded p-2 text-center">
                                <div className="text-xs text-muted-foreground">Kordused</div>
                                <div className="font-medium text-sm">{it.reps ?? "—"}</div>
                              </div>
                              <div className="bg-muted/50 rounded p-2 text-center">
                                <div className="text-xs text-muted-foreground">Paus</div>
                                <div className="font-medium text-sm">{it.rest_seconds ?? 60}s</div>
                              </div>
                              <div className="bg-muted/50 rounded p-2 text-center">
                                <div className="text-xs text-muted-foreground">Kaal</div>
                                <div className="font-medium text-sm">{it.weight_kg ? `${it.weight_kg}kg` : "—"}</div>
                              </div>
                            </div>
                            
                            {/* Coach notes - Mobile optimized */}
                            {it.coach_notes && (
                              <div className="mb-2 sm:mb-3 p-2 sm:p-3 rounded bg-primary/5 border-l-4 border-primary">
                                <div className="text-xs font-medium text-primary mb-1">Treeneri märkus</div>
                                <div className="text-sm">{it.coach_notes}</div>
                              </div>
                            )}

                            {/* Client details collapsible - Mobile optimized */}
                            <details className="mt-2 sm:mt-3">
                              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 p-1 -m-1 rounded">
                                <span>Kliendi tagasiside</span>
                                <span className="text-xs">▼</span>
                              </summary>
                              <div className="mt-2 sm:mt-3 p-2 sm:p-3 rounded bg-muted/30 space-y-2">
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Märkused</div>
                                  <div className="text-sm">
                                    {noteVal?.text ? (
                                      <span className="whitespace-pre-wrap break-words">{noteVal.text}</span>
                                    ) : (
                                      <span className="text-muted-foreground italic">Märkusi pole lisatud</span>
                                    )}
                                  </div>
                                </div>
                                {noteVal?.at && (
                                  <div className="text-xs text-muted-foreground">
                                    Viimati uuendatud: {new Date(noteVal.at).toLocaleString("et-EE")}
                                  </div>
                                )}
                                {it.video_url && (
                                  <div className="pt-2 border-t">
                                    <a 
                                      href={it.video_url} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-sm text-primary hover:text-primary/80 underline break-all"
                                    >
                                      📹 Vaata video juhiseid
                                    </a>
                                  </div>
                                )}
                              </div>
                            </details>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}