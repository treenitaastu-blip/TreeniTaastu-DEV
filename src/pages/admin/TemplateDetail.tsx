// src/pages/admin/TemplateDetail.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type UUID = string;

/** DB generated types (safe source of truth) */
type TplRow   = Database["public"]["Tables"]["workout_templates"]["Row"];
type DayRow   = Database["public"]["Tables"]["template_days"]["Row"];
type DayIns   = Database["public"]["Tables"]["template_days"]["Insert"];
type DayUpd   = Database["public"]["Tables"]["template_days"]["Update"];
type ItemRow  = Database["public"]["Tables"]["template_items"]["Row"];
type ItemIns  = Database["public"]["Tables"]["template_items"]["Insert"];
type ItemUpd  = Database["public"]["Tables"]["template_items"]["Update"];

// Alternative exercise types
type AlternativeRow = Database["public"]["Tables"]["template_alternatives"]["Row"];
type AlternativeIns = Database["public"]["Tables"]["template_alternatives"]["Insert"];

/** ----- Small helpers ----- */
const toErr = (e: unknown, fallback = "Tundmatu viga") =>
  e && typeof e === "object" && "message" in e && typeof (e as any).message === "string"
    ? (e as any).message as string
    : fallback;

const intOrNull = (v: string | number | null | undefined) => {
  if (v === "" || v == null) return null;
  const n = Math.max(0, Math.floor(Number(v)));
  return Number.isFinite(n) ? n : null;
};

const floatOrNull = (v: string | number | null | undefined) => {
  if (v === "" || v == null) return null;
  const n = Math.max(0, Number(v));
  return Number.isFinite(n) ? n : null;
};

const strOrNull = (v: unknown) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

// Helper functions for undefined conversion
const intOrUndef = (v: string | number | null | undefined) => {
  const result = intOrNull(v);
  return result === null ? undefined : result;
};

const floatOrUndef = (v: string | number | null | undefined) => {
  const result = floatOrNull(v);
  return result === null ? undefined : result;
};

const strOrUndef = (v: unknown) => {
  const result = strOrNull(v);
  return result === null ? undefined : result;
};

// Helper function to process unilateral exercise input
const processExerciseInput = (exercise: Partial<ItemRow>) => {
  const { reps, is_unilateral, weight_kg } = exercise;

  let reps_per_side: number | null = null;
  let total_reps: number | null = null;
  let display_reps: string = reps || "";

  if (is_unilateral && reps) {
    // For unilateral, extract the first number from reps (e.g., "8" from "8-12")
    const repsNumber = parseInt(reps.match(/\d+/)?.[0] || '0');
    reps_per_side = repsNumber;
    total_reps = repsNumber * 2;
    display_reps = `${repsNumber} mõlemal poolel`;
  } else if (reps) {
    // For regular exercises, keep the original reps string
    const repsNumber = parseInt(reps.match(/\d+/)?.[0] || '0');
    total_reps = repsNumber;
  }

  return {
    ...exercise,
    reps: display_reps,
    reps_per_side,
    total_reps,
  };
};

export default function TemplateDetail() {
  const { id } = useParams<{ id: string }>(); // template id
  const navigate = useNavigate();

  const [tpl, setTpl] = useState<Pick<TplRow, "id"|"title"|"goal"|"is_active"|"inserted_at"> | null>(null);
  const [days, setDays] = useState<Array<Pick<DayRow,"id"|"template_id"|"day_order"|"title"|"note"|"inserted_at">>>([]);
  const [itemsByDay, setItemsByDay] = useState<Record<string, Array<Pick<ItemRow,
    "id"|"template_day_id"|"exercise_name"|"sets"|"reps"|"rest_seconds"|"seconds"|"weight_kg"|"coach_notes"|"order_in_day"|"video_url"|"inserted_at"|"is_unilateral"|"reps_per_side"|"total_reps"
  >>>>({});
  const [alternativesByItem, setAlternativesByItem] = useState<Record<string, AlternativeRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // New day form
  const [newDay, setNewDay] = useState<{ title: string; note: string }>({ title: "", note: "" });

  // New item draft per day (use ItemIns shape but keep everything optional)
  const [newItem, setNewItem] = useState<Record<string, Partial<ItemIns>>>({});

  const sortedDays = useMemo(() => [...days].sort((a, b) => a.day_order - b.day_order), [days]);

  /** --------- Load template + days + items --------- */
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      setNotice(null);
      try {
        // 1) template
        const { data: tdata, error: terr } = await supabase
          .from("workout_templates")
          .select("id, title, goal, is_active, inserted_at")
          .eq("id", id)
          .single();
        if (terr) throw terr;
        setTpl(tdata as TplRow);

        // 2) all days
        const { data: ddata, error: derr } = await supabase
          .from("template_days")
          .select("id, template_id, day_order, title, note, inserted_at")
          .eq("template_id", id)
          .order("day_order", { ascending: true });
        if (derr) throw derr;
        const dayList = (ddata ?? []) as DayRow[];
        setDays(dayList);

        // 3) items (in one go)
        const dayIds = dayList.map((d) => d.id);
        if (dayIds.length > 0) {
          const { data: idata, error: ierr } = await supabase
            .from("template_items")
            .select(
              "id, template_day_id, exercise_name, sets, reps, rest_seconds, seconds, weight_kg, coach_notes, order_in_day, video_url, inserted_at, is_unilateral, reps_per_side, total_reps"
            )
            .in("template_day_id", dayIds)
            .order("order_in_day", { ascending: true });
          if (ierr) throw ierr;

          const map: Record<string, ItemRow[]> = {};
          (idata as ItemRow[]).forEach((it) => {
            (map[it.template_day_id] = map[it.template_day_id] || []).push(it);
          });
          setItemsByDay(map);

          // 4) Load alternatives for all items
          const itemIds = (idata as ItemRow[]).map(item => item.id);
          if (itemIds.length > 0) {
            const { data: altData, error: altErr } = await supabase
              .from("template_alternatives")
              .select("*")
              .in("primary_exercise_id", itemIds)
              .order("created_at", { ascending: true });
            
            if (!altErr && altData) {
              const altMap: Record<string, AlternativeRow[]> = {};
              altData.forEach((alt) => {
                (altMap[alt.primary_exercise_id] = altMap[alt.primary_exercise_id] || []).push(alt);
              });
              setAlternativesByItem(altMap);
            }
          }
        } else {
          setItemsByDay({});
          setAlternativesByItem({});
        }
      } catch (e) {
        setError(toErr(e, "Viga andmete laadimisel."));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const refreshDayItems = async (templateDayId: string) => {
    const { data, error } = await supabase
      .from("template_items")
      .select(
        "id, template_day_id, exercise_name, sets, reps, rest_seconds, seconds, weight_kg, coach_notes, order_in_day, video_url, inserted_at, is_unilateral, reps_per_side, total_reps"
      )
      .eq("template_day_id", templateDayId)
      .order("order_in_day", { ascending: true });
    if (error) {
      setError(toErr(error));
      return;
    }
    setItemsByDay((prev) => ({ ...prev, [templateDayId]: (data ?? []) as ItemRow[] }));

    // Also refresh alternatives for this day's items
    const itemIds = (data ?? []).map(item => item.id);
    if (itemIds.length > 0) {
      const { data: altData, error: altErr } = await supabase
        .from("template_alternatives")
        .select("*")
        .in("primary_exercise_id", itemIds)
        .order("created_at", { ascending: true });
      
      if (!altErr && altData) {
        setAlternativesByItem((prev) => {
          const newMap = { ...prev };
          itemIds.forEach(itemId => {
            newMap[itemId] = altData.filter(alt => alt.primary_exercise_id === itemId);
          });
          return newMap;
        });
      }
    }
  };

  /** --------- Days: CRUD + reorder --------- */
  const addDay = async () => {
    if (!id) return;

    const title = strOrNull(newDay.title) ?? `Päev ${days.length + 1}`;
    const note  = strOrNull(newDay.note);

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const nextOrder = (days.length ? Math.max(...days.map((d) => d.day_order)) : 0) + 1;

      const ins: DayIns = {
        template_id: id,
        day_order: nextOrder,
        title,
        note,
      };

      const { data, error } = await supabase
        .from("template_days")
        .insert(ins)
        .select("id, template_id, day_order, title, note, inserted_at")
        .single();
      if (error) throw error;

      setDays((prev) => [...prev, data as DayRow]);
      setNewDay({ title: "", note: "" });
      setNotice("Päev lisatud.");
    } catch (e) {
      setError(toErr(e, "Päeva lisamine ebaõnnestus."));
    } finally {
      setSaving(false);
    }
  };

  const updateDay = async (dayId: UUID, patch: Partial<DayRow>) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const upd: DayUpd = {
        title: patch.title !== undefined ? strOrUndef(patch.title) : undefined,
        note:  patch.note  !== undefined ? strOrUndef(patch.note)  : undefined,
        day_order: patch.day_order === undefined ? undefined : Number(patch.day_order),
      };

      const { error } = await supabase.from("template_days").update(upd).eq("id", dayId);
      if (error) throw error;

      setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, ...upd } as DayRow : d)));
      setNotice("Päev salvestatud.");
    } catch (e) {
      setError(toErr(e, "Päeva salvestamine ebaõnnestus."));
    } finally {
      setSaving(false);
    }
  };

  const deleteDay = async (dayId: UUID) => {
    if (!confirm("Kinnita: kustuta see päev koos selle harjutustega?")) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      // delete items first (FK)
      const { error: diErr } = await supabase.from("template_items").delete().eq("template_day_id", dayId);
      if (diErr) throw diErr;

      const { error: ddErr } = await supabase.from("template_days").delete().eq("id", dayId);
      if (ddErr) throw ddErr;

      setDays((prev) => prev.filter((d) => d.id !== dayId));
      setItemsByDay((prev) => {
        const next = { ...prev };
        delete next[dayId];
        return next;
      });
      setNotice("Päev kustutatud.");
    } catch (e) {
      setError(toErr(e, "Päeva kustutamine ebaõnnestus."));
    } finally {
      setSaving(false);
    }
  };

  const moveDay = async (dayId: UUID, dir: "up" | "down") => {
    const ordered = [...sortedDays];
    const idx = ordered.findIndex((d) => d.id === dayId);
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || targetIdx < 0 || targetIdx >= ordered.length) return;

    const a = ordered[idx];
    const b = ordered[targetIdx];

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { error: e1 } = await supabase.from("template_days").update({ day_order: b.day_order } satisfies DayUpd).eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("template_days").update({ day_order: a.day_order } satisfies DayUpd).eq("id", b.id);
      if (e2) throw e2;

      setDays((prev) =>
        prev.map((d) =>
          d.id === a.id
            ? ({ ...d, day_order: b.day_order } as DayRow)
            : d.id === b.id
            ? ({ ...d, day_order: a.day_order } as DayRow)
            : d
        )
      );
      setNotice("Päevade järjekord uuendatud.");
    } catch (e) {
      setError(toErr(e, "Järjekorra muutmine ebaõnnestus."));
    } finally {
      setSaving(false);
    }
  };

  /** --------- Alternatives: CRUD --------- */
  const addAlternative = async (itemId: string, alternative: Partial<AlternativeIns>) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const ins: AlternativeIns = {
        primary_exercise_id: itemId,
        alternative_name: alternative.alternative_name || "",
        alternative_description: alternative.alternative_description || null,
        alternative_video_url: alternative.alternative_video_url || null,
        difficulty_level: alternative.difficulty_level || null,
        equipment_required: alternative.equipment_required || null,
        muscle_groups: alternative.muscle_groups || null,
      };

      const { data, error } = await supabase
        .from("template_alternatives")
        .insert(ins)
        .select("*")
        .single();
      if (error) throw error;

      setAlternativesByItem((prev) => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), data as AlternativeRow],
      }));
      setNotice("Alternatiiv lisatud.");
    } catch (e) {
      setError(toErr(e, "Alternatiivi lisamine ebaõnnestus."));
    } finally {
      setSaving(false);
    }
  };

  const updateAlternative = async (altId: string, patch: Partial<AlternativeRow>) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const upd = {
        alternative_name: patch.alternative_name !== undefined ? strOrUndef(patch.alternative_name) : undefined,
        alternative_description: patch.alternative_description !== undefined ? strOrUndef(patch.alternative_description) : undefined,
        alternative_video_url: patch.alternative_video_url !== undefined ? strOrUndef(patch.alternative_video_url) : undefined,
        difficulty_level: patch.difficulty_level !== undefined ? strOrUndef(patch.difficulty_level) : undefined,
        equipment_required: patch.equipment_required !== undefined ? patch.equipment_required : undefined,
        muscle_groups: patch.muscle_groups !== undefined ? patch.muscle_groups : undefined,
      };

      const { error } = await supabase.from("template_alternatives").update(upd).eq("id", altId);
      if (error) throw error;

      // Update local state
      setAlternativesByItem((prev) => {
        const newMap = { ...prev };
        Object.keys(newMap).forEach((itemId) => {
          newMap[itemId] = newMap[itemId].map((alt) =>
            alt.id === altId ? { ...alt, ...patch } : alt
          );
        });
        return newMap;
      });
      setNotice("Alternatiiv uuendatud.");
    } catch (e) {
      setError(toErr(e, "Alternatiivi uuendamine ebaõnnestus."));
    } finally {
      setSaving(false);
    }
  };

  const deleteAlternative = async (altId: string) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { error } = await supabase.from("template_alternatives").delete().eq("id", altId);
      if (error) throw error;

      // Update local state
      setAlternativesByItem((prev) => {
        const newMap = { ...prev };
        Object.keys(newMap).forEach((itemId) => {
          newMap[itemId] = newMap[itemId].filter((alt) => alt.id !== altId);
        });
        return newMap;
      });
      setNotice("Alternatiiv kustutatud.");
    } catch (e) {
      setError(toErr(e, "Alternatiivi kustutamine ebaõnnestus."));
    } finally {
      setSaving(false);
    }
  };

  /** --------- Items: CRUD + reorder --------- */
  const addItem = async (dayId: UUID) => {
    const base = newItem[dayId] || {};

    // Process unilateral exercise input if needed
    const processedBase = (base.reps !== undefined || base.is_unilateral !== undefined) 
      ? processExerciseInput(base) 
      : base;

    const ins: ItemIns = {
      template_day_id: dayId,
      exercise_name: strOrNull(processedBase.exercise_name) ?? "Uus harjutus",
      sets: intOrUndef(processedBase.sets as any) ?? 1,
      reps: strOrNull(processedBase.reps) ?? "8-12",
      rest_seconds: intOrUndef(processedBase.rest_seconds as any),
      seconds: intOrUndef(processedBase.seconds as any),
      weight_kg: floatOrUndef(processedBase.weight_kg as any),
      coach_notes: strOrUndef(processedBase.coach_notes),
      video_url: strOrUndef(processedBase.video_url),
      is_unilateral: processedBase.is_unilateral || false,
      reps_per_side: processedBase.reps_per_side || null,
      total_reps: processedBase.total_reps || null,
      // order_in_day is NOT in Insert type if DB defaults it; calculate manually if needed
      order_in_day: 1, // will be overwritten below
    };

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      // decide next order
      const list = itemsByDay[dayId] || [];
      const nextOrder = (list.length ? Math.max(...list.map((i) => i.order_in_day)) : 0) + 1;

      // Some schemas include order_in_day in Insert; if so, set it:
      (ins as ItemIns & { order_in_day?: number }).order_in_day = nextOrder;

      const { data, error } = await supabase
        .from("template_items")
        .insert(ins)
        .select("id, template_day_id, exercise_name, sets, reps, rest_seconds, seconds, weight_kg, coach_notes, order_in_day, video_url, inserted_at")
        .single();
      if (error) throw error;

      setItemsByDay((prev) => ({ ...prev, [dayId]: [...(prev[dayId] || []), data as ItemRow] }));
      setNewItem((prev) => ({ ...prev, [dayId]: {} }));
      setNotice("Harjutus lisatud.");
    } catch (e) {
      setError(toErr(e, "Harjutuse lisamine ebaõnnestus."));
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (itemId: UUID, patch: Partial<ItemRow>) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      // Process unilateral exercise input if needed
      const processedPatch = (patch.reps !== undefined || patch.is_unilateral !== undefined) 
        ? processExerciseInput(patch) 
        : patch;

      const upd: ItemUpd = {
        exercise_name: processedPatch.exercise_name !== undefined ? strOrUndef(processedPatch.exercise_name) : undefined,
        sets:          processedPatch.sets          !== undefined ? intOrUndef(processedPatch.sets as any) : undefined,
        reps:          processedPatch.reps          !== undefined ? strOrUndef(processedPatch.reps) : undefined,
        rest_seconds:  processedPatch.rest_seconds  !== undefined ? intOrUndef(processedPatch.rest_seconds as any) : undefined,
        seconds:       processedPatch.seconds       !== undefined ? intOrUndef(processedPatch.seconds as any) : undefined,
        weight_kg:     processedPatch.weight_kg     !== undefined ? floatOrUndef(processedPatch.weight_kg as any) : undefined,
        coach_notes:   processedPatch.coach_notes   !== undefined ? strOrUndef(processedPatch.coach_notes) : undefined,
        video_url:     processedPatch.video_url     !== undefined ? strOrUndef(processedPatch.video_url) : undefined,
        order_in_day:  processedPatch.order_in_day  as number | undefined, // rarely changed here
        is_unilateral: processedPatch.is_unilateral !== undefined ? processedPatch.is_unilateral : undefined,
        reps_per_side: processedPatch.reps_per_side !== undefined ? processedPatch.reps_per_side : undefined,
        total_reps:    processedPatch.total_reps    !== undefined ? processedPatch.total_reps : undefined,
      };

      const { error } = await supabase.from("template_items").update(upd).eq("id", itemId);
      if (error) throw error;

      // reflect in state
      setItemsByDay((prev) => {
        const next: typeof prev = {};
        for (const dayId of Object.keys(prev)) {
          next[dayId] = (prev[dayId] || []).map((it) => (it.id === itemId ? ({ ...it, ...upd } as ItemRow) : it));
        }
        return next;
      });
      setNotice("Harjutus salvestatud.");
    } catch (e) {
      setError(toErr(e, "Harjutuse salvestamine ebaõnnestus."));
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (dayId: UUID, itemId: UUID) => {
    if (!confirm("Kinnita: kustuta see harjutus?")) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { error } = await supabase.from("template_items").delete().eq("id", itemId);
      if (error) throw error;

      setItemsByDay((prev) => ({ ...prev, [dayId]: (prev[dayId] || []).filter((it) => it.id !== itemId) }));
      setNotice("Harjutus kustutatud.");
    } catch (e) {
      setError(toErr(e, "Harjutuse kustutamine ebaõnnestus."));
    } finally {
      setSaving(false);
    }
  };

  const moveItem = async (dayId: UUID, itemId: UUID, dir: "up" | "down") => {
    const list = [...(itemsByDay[dayId] || [])];
    const idx = list.findIndex((i) => i.id === itemId);
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || targetIdx < 0 || targetIdx >= list.length) return;

    const a = list[idx];
    const b = list[targetIdx];

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { error: e1 } = await supabase
        .from("template_items")
        .update({ order_in_day: b.order_in_day } satisfies ItemUpd)
        .eq("id", a.id);
      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("template_items")
        .update({ order_in_day: a.order_in_day } satisfies ItemUpd)
        .eq("id", b.id);
      if (e2) throw e2;

      await refreshDayItems(dayId);
      setNotice("Harjutuste järjekord uuendatud.");
    } catch (e) {
      setError(toErr(e, "Järjekorra muutmine ebaõnnestus."));
    } finally {
      setSaving(false);
    }
  };

  /** --------- Render states --------- */
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="text-sm text-gray-600">Laen andmeid…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
        <button
            onClick={() => navigate("/admin/programs")}
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Tagasi
        </button>
      </div>
    );
  }

  if (!tpl) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="text-sm text-gray-600">Malli ei leitud.</div>
      </div>
    );
  }

  /** --------- Main --------- */
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{tpl.title}</h1>
          {tpl.goal && <div className="text-sm text-gray-600">{tpl.goal}</div>}
          <div className="text-xs text-gray-500">
            Loodud: {tpl.inserted_at ? new Date(tpl.inserted_at).toLocaleDateString("et-EE") : "—"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/admin/programs")}
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Tagasi programmi halduse juurde
          </button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-800">
          {notice}
        </div>
      )}
      {saving && <div className="mb-4 text-sm text-gray-500">Salvestan…</div>}

      {/* Add Day */}
      <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-medium">Lisa uus päev</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={newDay.title}
            onChange={(e) => setNewDay((s) => ({ ...s, title: e.target.value }))}
            placeholder="Päeva pealkiri (nt Ülakeha)"
            className="rounded-md border px-3 py-2 text-sm outline-none"
          />
        </div>
        <div className="mt-2">
          <input
            value={newDay.note}
            onChange={(e) => setNewDay((s) => ({ ...s, note: e.target.value }))}
            placeholder="Märkused (nt Surumised)"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
          />
        </div>
        <div className="mt-3">
          <button
            onClick={addDay}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={saving}
          >
            Lisa päev
          </button>
        </div>
      </div>

      {/* Days list */}
      <div className="grid gap-4">
        {sortedDays.map((day, idx) => {
          const list = itemsByDay[day.id] || [];
          const upDisabled = idx === 0;
          const downDisabled = idx === sortedDays.length - 1;

          return (
            <div key={day.id} className="rounded-xl border bg-white p-4 shadow-sm">
              {/* Day header */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="w-full rounded-md border px-3 py-2 text-sm sm:w-64"
                      value={day.title ?? ""}
                      onChange={(e) =>
                        setDays((prev) =>
                          prev.map((d) => (d.id === day.id ? { ...d, title: e.target.value } : d))
                        )
                      }
                      placeholder="Päeva pealkiri"
                    />
                    <input
                      className="w-full rounded-md border px-3 py-2 text-sm sm:w-80"
                      value={day.note ?? ""}
                      onChange={(e) =>
                        setDays((prev) =>
                          prev.map((d) => (d.id === day.id ? { ...d, note: e.target.value } : d))
                        )
                      }
                      placeholder="Märkused"
                    />
                    <button
                      onClick={() =>
                        updateDay(day.id, {
                          title: day.title ?? "",
                          note: day.note ?? "",
                        })
                      }
                      className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                      disabled={saving}
                    >
                      Salvesta päev
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">Järjekord: {day.day_order}</div>
                </div>

                <div className="flex items-center gap-2 sm:self-start">
                  <button
                    onClick={() => moveDay(day.id, "up")}
                    disabled={upDisabled || saving}
                    className={`rounded-md border px-3 py-2 text-sm ${upDisabled ? "opacity-50" : "hover:bg-gray-50"}`}
                    title="Liiguta üles"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDay(day.id, "down")}
                    disabled={downDisabled || saving}
                    className={`rounded-md border px-3 py-2 text-sm ${downDisabled ? "opacity-50" : "hover:bg-gray-50"}`}
                    title="Liiguta alla"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => deleteDay(day.id)}
                    className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                    disabled={saving}
                  >
                    Kustuta päev
                  </button>
                </div>
              </div>

              {/* Items */}
              <div className="mt-4">
                {list.length === 0 ? (
                  <div className="text-sm text-gray-600">Päevas pole veel harjutusi.</div>
                ) : (
                  <div className="grid gap-2">
                    {list.map((it, j) => {
                      const upI = j === 0;
                      const downI = j === list.length - 1;
                      return (
                        <div key={it.id} className="rounded-lg border p-3">
                        <div className="mb-3 text-sm font-medium text-gray-600">
                          {it.exercise_name} (jrk: {it.order_in_day})
                        </div>
                        <div className="grid gap-2 sm:grid-cols-12">
                          <div className="sm:col-span-3">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Harjutuse nimi</label>
                            <input
                              className="w-full rounded-md border px-3 py-2 text-sm"
                              value={it.exercise_name ?? ""}
                              onChange={(e) =>
                                setItemsByDay((prev) => ({
                                  ...prev,
                                  [day.id]: (prev[day.id] || []).map((row) =>
                                    row.id === it.id ? { ...row, exercise_name: e.target.value } : row
                                  ),
                                }))
                              }
                              placeholder="Harjutuse nimi"
                            />
                          </div>
                          <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Seeriad</label>
                            <input
                              className="w-full rounded-md border px-3 py-2 text-sm"
                              type="number"
                              min={0}
                              value={it.sets ?? ""}
                              onChange={(e) =>
                                setItemsByDay((prev) => ({
                                  ...prev,
                                  [day.id]: (prev[day.id] || []).map((row) =>
                                    row.id === it.id ? { ...row, sets: intOrUndef(e.target.value) ?? it.sets } : row
                                  ),
                                }))
                              }
                              placeholder="3"
                            />
                          </div>
                          <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Kordused {it.is_unilateral ? "(mõlemal poolel)" : ""}
                            </label>
                            <input
                              className="w-full rounded-md border px-3 py-2 text-sm"
                              value={it.reps ?? ""}
                              onChange={(e) =>
                                setItemsByDay((prev) => ({
                                  ...prev,
                                  [day.id]: (prev[day.id] || []).map((row) =>
                                    row.id === it.id ? { ...row, reps: e.target.value } : row
                                  ),
                                }))
                              }
                              placeholder={it.is_unilateral ? "8" : "8-12"}
                            />
                            {it.is_unilateral && (
                              <p className="text-xs text-gray-500 mt-1">
                                Sisesta ainult number (nt. 8), süsteem näitab "8 mõlemal poolel"
                              </p>
                            )}
                          </div>
                          <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Paus (s)</label>
                            <input
                              className="w-full rounded-md border px-3 py-2 text-sm"
                              type="number"
                              min={0}
                              value={it.rest_seconds ?? ""}
                              onChange={(e) =>
                                setItemsByDay((prev) => ({
                                  ...prev,
                                  [day.id]: (prev[day.id] || []).map((row) =>
                                    row.id === it.id ? { ...row, rest_seconds: intOrNull(e.target.value) } : row
                                  ),
                                }))
                              }
                              placeholder="60"
                            />
                          </div>
                          {/* Smart weight/duration/bodyweight selection */}
                          <div className="sm:col-span-1">
                            {(() => {
                              const weightValue = it.weight_kg || 0;
                              const secondsValue = it.seconds || 0;
                              
                              if (weightValue > 0) {
                                return (
                                  <>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Raskus (kg)</label>
                                    <input
                                      className="w-full rounded-md border px-3 py-2 text-sm"
                                      type="number"
                                      min={0}
                                      step="0.1"
                                      value={it.weight_kg ?? ""}
                                      onChange={(e) =>
                                        setItemsByDay((prev) => ({
                                          ...prev,
                                          [day.id]: (prev[day.id] || []).map((row) =>
                                            row.id === it.id ? { 
                                              ...row, 
                                              weight_kg: floatOrNull(e.target.value),
                                              seconds: null
                                            } : row
                                          ),
                                        }))
                                      }
                                      placeholder="20"
                                    />
                                  </>
                                );
                              } else if (secondsValue > 0) {
                                return (
                                  <>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Aeg (s)</label>
                                    <input
                                      className="w-full rounded-md border px-3 py-2 text-sm"
                                      type="number"
                                      min={0}
                                      value={it.seconds ?? ""}
                                      onChange={(e) =>
                                        setItemsByDay((prev) => ({
                                          ...prev,
                                          [day.id]: (prev[day.id] || []).map((row) =>
                                            row.id === it.id ? { 
                                              ...row, 
                                              seconds: intOrNull(e.target.value),
                                              weight_kg: null
                                            } : row
                                          ),
                                        }))
                                      }
                                      placeholder="30"
                                    />
                                  </>
                                );
                              } else {
                                return (
                                  <>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Keharaskus</label>
                                    <div className="w-full rounded-md border px-3 py-2 text-sm bg-gray-50 text-gray-600 flex items-center justify-center">
                                      Keharaskus
                                    </div>
                                  </>
                                );
                              }
                            })()}
                          </div>
                          <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Tüüp</label>
                            <button
                              type="button"
                              onClick={() => {
                                const weightValue = it.weight_kg || 0;
                                const secondsValue = it.seconds || 0;
                                
                                let newWeight = null;
                                let newSeconds = null;
                                
                                if (weightValue > 0) {
                                  // Currently weight -> switch to time
                                  newSeconds = 30;
                                } else if (secondsValue > 0) {
                                  // Currently time -> switch to bodyweight (both null/0)
                                  // Keep both null
                                } else {
                                  // Currently bodyweight -> switch to weight
                                  newWeight = 10;
                                }
                                
                                setItemsByDay((prev) => ({
                                  ...prev,
                                  [day.id]: (prev[day.id] || []).map((row) =>
                                    row.id === it.id ? { 
                                      ...row, 
                                      weight_kg: newWeight,
                                      seconds: newSeconds
                                    } : row
                                  ),
                                }))
                              }}
                              className="w-full rounded-md border px-2 py-2 text-xs hover:bg-gray-50"
                              title="Vaheta harjutuse tüüp"
                            >
                              {(() => {
                                const weightValue = it.weight_kg || 0;
                                const secondsValue = it.seconds || 0;
                                
                                if (weightValue > 0) return "→ Aeg";
                                if (secondsValue > 0) return "→ Keha";
                                return "→ Kaal";
                              })()}
                            </button>
                          </div>
                          <div className="sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Ühepoolne</label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`unilateral-${it.id}`}
                                checked={it.is_unilateral || false}
                                onChange={(e) =>
                                  setItemsByDay((prev) => ({
                                    ...prev,
                                    [day.id]: (prev[day.id] || []).map((row) =>
                                      row.id === it.id ? { ...row, is_unilateral: e.target.checked } : row
                                    ),
                                  }))
                                }
                                className="rounded border-gray-300"
                              />
                              <label htmlFor={`unilateral-${it.id}`} className="text-xs text-gray-600">
                                Ühepoolne
                              </label>
                            </div>
                          </div>
                            <input
                              className="sm:col-span-3 rounded-md border px-3 py-2 text-sm"
                              value={it.coach_notes ?? ""}
                              onChange={(e) =>
                                setItemsByDay((prev) => ({
                                  ...prev,
                                  [day.id]: (prev[day.id] || []).map((row) =>
                                    row.id === it.id ? { ...row, coach_notes: e.target.value } : row
                                  ),
                                }))
                              }
                              placeholder="Treeneri märkus"
                            />
                            <input
                              className="sm:col-span-4 rounded-md border px-3 py-2 text-sm"
                              value={it.video_url ?? ""}
                              onChange={(e) =>
                                setItemsByDay((prev) => ({
                                  ...prev,
                                  [day.id]: (prev[day.id] || []).map((row) =>
                                    row.id === it.id ? { ...row, video_url: e.target.value } : row
                                  ),
                                }))
                              }
                              placeholder="Video URL"
                            />
                            <div className="sm:col-span-8 flex flex-wrap items-center gap-2 pt-1">
                              <button
                                onClick={() =>
                                  updateItem(it.id, {
                                    exercise_name: it.exercise_name,
                                    sets: it.sets,
                                    reps: it.reps,
                                    rest_seconds: it.rest_seconds,
                                    seconds: it.seconds,
                                    weight_kg: it.weight_kg,
                                    coach_notes: it.coach_notes,
                                    video_url: it.video_url,
                                    is_unilateral: it.is_unilateral,
                                    reps_per_side: it.reps_per_side,
                                    total_reps: it.total_reps,
                                  })
                                }
                                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                                disabled={saving}
                              >
                                Salvesta harjutus
                              </button>
                              <button
                                onClick={() => moveItem(day.id, it.id, "up")}
                                disabled={upI || saving}
                                className={`rounded-md border px-3 py-1.5 text-sm ${upI ? "opacity-50" : "hover:bg-gray-50"}`}
                                title="Liiguta üles"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveItem(day.id, it.id, "down")}
                                disabled={downI || saving}
                                className={`rounded-md border px-3 py-1.5 text-sm ${downI ? "opacity-50" : "hover:bg-gray-50"}`}
                                title="Liiguta alla"
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => deleteItem(day.id, it.id)}
                                className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                                disabled={saving}
                              >
                                Kustuta
                              </button>
                              <div className="text-xs text-gray-500">Jrk: {it.order_in_day}</div>
                            </div>
                          </div>

                          {/* Alternatives Section */}
                        <div className="mt-4 border-t pt-4">
                          <div className="mb-2 flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-700">Alternatiivsed harjutused</h4>
                            <button
                              onClick={() => {
                                const newAlt = {
                                  alternative_name: "",
                                  alternative_description: "",
                                  alternative_video_url: "",
                                  difficulty_level: "",
                                  equipment_required: null,
                                  muscle_groups: null,
                                };
                                addAlternative(it.id, newAlt);
                              }}
                              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                              disabled={saving}
                            >
                              + Lisa alternatiiv
                            </button>
                          </div>
                          
                          {alternativesByItem[it.id] && alternativesByItem[it.id].length > 0 ? (
                            <div className="space-y-2">
                              {alternativesByItem[it.id].map((alt, altIdx) => (
                                <div key={alt.id} className="rounded-lg border bg-gray-50 p-3">
                                  <div className="grid gap-2 sm:grid-cols-12">
                                    <div className="sm:col-span-3">
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Nimi</label>
                                      <input
                                        className="w-full rounded-md border px-3 py-2 text-sm"
                                        value={alt.alternative_name || ""}
                                        onChange={(e) =>
                                          updateAlternative(alt.id, { alternative_name: e.target.value })
                                        }
                                        placeholder="Alternatiivne harjutus"
                                      />
                                    </div>
                                    <div className="sm:col-span-3">
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Kirjeldus</label>
                                      <input
                                        className="w-full rounded-md border px-3 py-2 text-sm"
                                        value={alt.alternative_description || ""}
                                        onChange={(e) =>
                                          updateAlternative(alt.id, { alternative_description: e.target.value })
                                        }
                                        placeholder="Lühike kirjeldus"
                                      />
                                    </div>
                                    <div className="sm:col-span-3">
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Video URL</label>
                                      <input
                                        className="w-full rounded-md border px-3 py-2 text-sm"
                                        value={alt.alternative_video_url || ""}
                                        onChange={(e) =>
                                          updateAlternative(alt.id, { alternative_video_url: e.target.value })
                                        }
                                        placeholder="https://..."
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Raskus</label>
                                      <select
                                        className="w-full rounded-md border px-3 py-2 text-sm"
                                        value={alt.difficulty_level || ""}
                                        onChange={(e) =>
                                          updateAlternative(alt.id, { difficulty_level: e.target.value })
                                        }
                                      >
                                        <option value="">Vali raskus</option>
                                        <option value="beginner">Algaja</option>
                                        <option value="intermediate">Keskmine</option>
                                        <option value="advanced">Edasijõudnud</option>
                                      </select>
                                    </div>
                                    <div className="sm:col-span-1 flex items-end">
                                      <button
                                        onClick={() => deleteAlternative(alt.id)}
                                        className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                                        disabled={saving}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">Pole alternatiivseid harjutusi</div>
                          )}
                        </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Item */}
              <div className="mt-3 rounded-lg border bg-gray-50 p-3">
                <div className="mb-3 text-sm font-medium">Lisa harjutus</div>
                <div className="grid gap-2 sm:grid-cols-12">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Harjutuse nimi</label>
                    <input
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="Harjutuse nimi"
                      value={(newItem[day.id]?.exercise_name as string) || ""}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          [day.id]: { ...(prev[day.id] || {}), exercise_name: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Seeriad</label>
                    <input
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      type="number"
                      min={0}
                      placeholder="3"
                      value={newItem[day.id]?.sets ?? ""}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          [day.id]: { ...(prev[day.id] || {}), sets: intOrUndef(e.target.value) },
                        }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Kordused</label>
                    <input
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      placeholder="8-12"
                      value={(newItem[day.id]?.reps as string) || ""}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          [day.id]: { ...(prev[day.id] || {}), reps: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Paus (s)</label>
                    <input
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      type="number"
                      min={0}
                      placeholder="60"
                      value={newItem[day.id]?.rest_seconds ?? ""}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          [day.id]: { ...(prev[day.id] || {}), rest_seconds: intOrNull(e.target.value) },
                        }))
                      }
                    />
                  </div>
                  {/* Smart weight/duration/bodyweight selection for new items */}
                  <div className="sm:col-span-1">
                    {(() => {
                      const item = newItem[day.id];
                      const weightValue = item?.weight_kg || 0;
                      const secondsValue = item?.seconds || 0;
                      
                      if (weightValue > 0) {
                        return (
                          <>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Raskus (kg)</label>
                            <input
                              className="w-full rounded-md border px-3 py-2 text-sm"
                              type="number"
                              min={0}
                              step="0.1"
                              placeholder="20"
                              value={newItem[day.id]?.weight_kg ?? ""}
                              onChange={(e) =>
                                setNewItem((prev) => ({
                                  ...prev,
                                  [day.id]: { 
                                    ...(prev[day.id] || {}), 
                                    weight_kg: floatOrNull(e.target.value),
                                    seconds: null
                                  },
                                }))
                              }
                            />
                          </>
                        );
                      } else if (secondsValue > 0) {
                        return (
                          <>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Aeg (s)</label>
                            <input
                              className="w-full rounded-md border px-3 py-2 text-sm"
                              type="number"
                              min={0}
                              placeholder="30"
                              value={newItem[day.id]?.seconds ?? ""}
                              onChange={(e) =>
                                setNewItem((prev) => ({
                                  ...prev,
                                  [day.id]: { 
                                    ...(prev[day.id] || {}), 
                                    seconds: intOrNull(e.target.value),
                                    weight_kg: null
                                  },
                                }))
                              }
                            />
                          </>
                        );
                      } else {
                        return (
                          <>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Keharaskus</label>
                            <div className="w-full rounded-md border px-3 py-2 text-sm bg-gray-50 text-gray-600 flex items-center justify-center">
                              Keharaskus
                            </div>
                          </>
                        );
                      }
                    })()}
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tüüp</label>
                    <button
                      type="button"
                      onClick={() => {
                        const item = newItem[day.id];
                        const weightValue = item?.weight_kg || 0;
                        const secondsValue = item?.seconds || 0;
                        
                        let newWeight = null;
                        let newSeconds = null;
                        
                        if (weightValue > 0) {
                          // Currently weight -> switch to time
                          newSeconds = 30;
                        } else if (secondsValue > 0) {
                          // Currently time -> switch to bodyweight (both null/0)
                          // Keep both null
                        } else {
                          // Currently bodyweight -> switch to weight
                          newWeight = 10;
                        }
                        
                        setNewItem((prev) => ({
                          ...prev,
                          [day.id]: { 
                            ...(prev[day.id] || {}), 
                            weight_kg: newWeight,
                            seconds: newSeconds
                          },
                        }))
                      }}
                      className="w-full rounded-md border px-2 py-2 text-xs hover:bg-gray-50"
                      title="Vaheta harjutuse tüüp"
                    >
                      {(() => {
                        const item = newItem[day.id];
                        const weightValue = item?.weight_kg || 0;
                        const secondsValue = item?.seconds || 0;
                        
                        if (weightValue > 0) return "→ Aeg";
                        if (secondsValue > 0) return "→ Keha";
                        return "→ Kaal";
                      })()}
                    </button>
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ühepoolne</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`new-unilateral-${day.id}`}
                        checked={newItem[day.id]?.is_unilateral || false}
                        onChange={(e) =>
                          setNewItem((prev) => ({
                            ...prev,
                            [day.id]: { ...(prev[day.id] || {}), is_unilateral: e.target.checked },
                          }))
                        }
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`new-unilateral-${day.id}`} className="text-xs text-gray-600">
                        Ühepoolne
                      </label>
                    </div>
                  </div>
                  <input
                    className="sm:col-span-3 rounded-md border px-3 py-2 text-sm"
                    placeholder="Treeneri märkus"
                    value={(newItem[day.id]?.coach_notes as string) || ""}
                    onChange={(e) =>
                      setNewItem((prev) => ({
                        ...prev,
                        [day.id]: { ...(prev[day.id] || {}), coach_notes: e.target.value },
                      }))
                    }
                  />
                  <input
                    className="sm:col-span-4 rounded-md border px-3 py-2 text-sm"
                    placeholder="Video URL"
                    value={(newItem[day.id]?.video_url as string) || ""}
                    onChange={(e) =>
                      setNewItem((prev) => ({
                        ...prev,
                        [day.id]: { ...(prev[day.id] || {}), video_url: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="mt-2">
                  <button
                    onClick={() => addItem(day.id)}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={saving}
                  >
                    Lisa harjutus
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
