// src/components/workout/RPEInput.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, AlertCircle, Check } from "lucide-react";
import clsx from "clsx";

/** ---------------- Types ---------------- */
interface RPEInputProps {
  exerciseName: string;

  /** Uncontrolled initial values */
  initialRpe?: number | null;
  initialNote?: string;

  /** Controlled mode (if provided, component mirrors these and calls onChange) */
  valueRpe?: number | null;
  valueNote?: string;
  onChange?: (next: { rpe: number | null; note: string }) => void;

  /** Persist handler (required). Should throw on failure. */
  onSave: (rpe: number | null, note: string) => Promise<void>;

  /** External saving flag (optional). If omitted, the component manages its own saving state. */
  saving?: boolean;

  /** UI / behavior */
  disabled?: boolean;
  compact?: boolean;
  autosave?: boolean;          // default: true
  autosaveDelayMs?: number;    // default: 900
  maxNoteLen?: number;         // default: 2000

  /** Callbacks */
  onSaved?: () => void;
  onError?: (err: unknown) => void;
}

/** ---------------- Constants ---------------- */
const SCALE: { value: number; label: string; description: string }[] = [
  { value: 1, label: "Väga kerge", description: "Võiks teha palju rohkem kordusi" },
  { value: 2, label: "Kerge", description: "Võiks teha 9–10 lisakordust" },
  { value: 3, label: "Mõõdukas", description: "Võiks teha 7–8 lisakordust" },
  { value: 4, label: "Vaevalt raske", description: "Võiks teha 5–6 lisakordust" },
  { value: 5, label: "Raske", description: "Võiks teha 3–4 lisakordust" },
  { value: 6, label: "Väga raske", description: "Võiks teha 2–3 lisakordust" },
  { value: 7, label: "Äärmiselt raske", description: "Võiks teha 1–2 lisakordust" },
  { value: 8, label: "Maksimaalne pingutus", description: "Võib-olla 1 lisakordus" },
  { value: 9, label: "Peaaegu piir", description: "Rohkem ei jõua" },
  { value: 10, label: "Täielik piir", description: "Seeria ebaõnnestus / viimane piir" },
];

const isInt1to10 = (n: unknown) =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 10;

/** ---------------- Component ---------------- */
export function RPEInput({
  exerciseName,
  initialRpe = null,
  initialNote = "",
  valueRpe,
  valueNote,
  onChange,
  onSave,
  saving: savingProp,
  disabled = false,
  compact = false,
  autosave = true,
  autosaveDelayMs = 900,
  maxNoteLen = 2000,
  onSaved,
  onError,
}: RPEInputProps) {
  const controlled = typeof valueRpe !== "undefined" || typeof valueNote !== "undefined";

  // Internal state mirrors props in uncontrolled mode
  const [rpe, setRpe] = useState<number | null>(initialRpe);
  const [note, setNote] = useState<string>(initialNote);
  const [savingLocal, setSavingLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const saving = savingProp ?? savingLocal;

  // Sync from props when those change (uncontrolled only)
  useEffect(() => {
    if (controlled) return;
    setRpe(initialRpe ?? null);
    setNote(initialNote ?? "");
    setHasChanges(false);
    setError(null);
  }, [controlled, initialRpe, initialNote]);

  // Derived values in controlled vs uncontrolled
  const curRpe = (controlled ? valueRpe : rpe) ?? null;
  const curNote = controlled ? valueNote ?? "" : note;

  // Debounce timer for autosave
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearDebounce = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  // Change handlers
  const setNext = useCallback(
    (next: { rpe: number | null; note: string }) => {
      setHasChanges(true);
      setError(null);
      if (controlled && onChange) {
        onChange(next);
      } else {
        setRpe(next.rpe);
        setNote(next.note);
      }
    },
    [controlled, onChange]
  );

  const handleRpeClick = useCallback(
    (val: number) => {
      const nextVal = curRpe === val ? null : val; // toggle to clear
      setNext({ rpe: nextVal, note: curNote });
    },
    [curRpe, curNote, setNext]
  );

  const handleNoteChange = useCallback(
    (v: string) => {
      // enforce max length
      const next = v.slice(0, maxNoteLen);
      setNext({ rpe: curRpe, note: next });
    },
    [curRpe, maxNoteLen, setNext]
  );

  // Keyboard shortcuts: arrow left/right to change, 1..0 number keys to set/clear, Esc to clear, Cmd/Ctrl+Enter to save
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Manual flush (Save button)
  const doSave = useCallback(async () => {
    setError(null);
    try {
      if (!hasChanges) return;
      if (!controlled) setSavingLocal(true);
      await onSave(curRpe ?? null, curNote);
      setHasChanges(false);
      setLastSavedAt(new Date());
      onSaved?.();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Salvestamine ebaõnnestus.";
      setError(msg);
      onError?.(e);
    } finally {
      if (!controlled) setSavingLocal(false);
    }
  }, [controlled, curNote, curRpe, hasChanges, onError, onSave, onSaved]);

  const flushSave = useCallback(() => {
    clearDebounce();
    void doSave();
  }, [doSave]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;

      // Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") {
        e.preventDefault();
        flushSave();
        return;
      }

      // Clear
      if (e.key === "Escape") {
        e.preventDefault();
        setNext({ rpe: null, note: curNote });
        return;
      }

      // Number keys: 1..9, 0 => 10
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const v = e.key === "0" ? 10 : Number(e.key);
        if (isInt1to10(v)) {
          setNext({ rpe: v, note: curNote });
        }
        return;
      }

      // Arrows
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        const v = curRpe ?? 6; // start near mid if empty
        const next = Math.max(1, v - 1);
        setNext({ rpe: next, note: curNote });
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        const v = curRpe ?? 5;
        const next = Math.min(10, v + 1);
        setNext({ rpe: next, note: curNote });
        return;
      }
    };

    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [curRpe, curNote, disabled, setNext, flushSave]);

  // Autosave (debounced)
  const scheduleAutosave = useCallback(() => {
    if (!autosave) return;
    clearDebounce();
    debounceRef.current = setTimeout(() => {
      void doSave();
    }, Math.max(300, autosaveDelayMs));
  }, [autosave, autosaveDelayMs, doSave]);

  // When fields change and autosave is on, debounce save
  useEffect(() => {
    if (!hasChanges) return;
    scheduleAutosave();
    return clearDebounce;
  }, [hasChanges, curRpe, curNote, scheduleAutosave]);

  const selectedDesc = useMemo(
    () => (curRpe ? SCALE.find((s) => s.value === curRpe)?.description : ""),
    [curRpe]
  );

  const canInteract = !disabled && !saving;

  return (
    <Card
      ref={containerRef}
      className={clsx("mt-4 outline-none", compact ? "p-0" : "")}
      tabIndex={0}
      aria-label={`RPE ja märkmed: ${exerciseName}`}
    >
      <CardHeader className={compact ? "pb-2" : "pb-3"}>
        <CardTitle className={clsx("text-lg", compact && "text-base")}>
          Pingutuse hinnang (RPE) – {exerciseName}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error banner */}
        {error && (
          <div
            className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* RPE picker */}
        <div>
          <Label className="text-sm font-medium">RPE (1–10)</Label>
          <div
            role="radiogroup"
            aria-label="RPE valik"
            className={clsx("mt-2 grid gap-2", "grid-cols-5")}
          >
            {SCALE.map((s) => {
              const isSelected = curRpe === s.value;
              return (
                <Button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`RPE ${s.value}: ${s.label}`}
                  title={`${s.value} – ${s.label}: ${s.description}`}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={clsx(
                    "h-auto p-2 flex flex-col items-center justify-center",
                    "min-h-[44px] select-none"
                  )}
                  onClick={() => handleRpeClick(s.value)}
                  disabled={!canInteract}
                >
                  <span className="font-semibold leading-none">{s.value}</span>
                  <span className="text-[11px] leading-tight opacity-80">{s.label}</span>
                </Button>
              );
            })}
          </div>
          {curRpe && (
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
              {selectedDesc}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="exercise-notes" className="text-sm font-medium">
            Isiklikud märkmed
          </Label>
          <Textarea
            id="exercise-notes"
            value={curNote}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="Kuidas tundus? Valu, väsimus, tehnika, tempo…"
            className="mt-1"
            rows={compact ? 2 : 3}
            disabled={!canInteract}
            aria-describedby="note-help note-counter"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span id="note-help">Nõuanded, tunded, tähelepanekud.</span>
            <span id="note-counter">
              {curNote.length}/{maxNoteLen}
            </span>
          </div>
        </div>

        {/* Footer actions / status */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground" aria-live="polite">
            {saving ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Salvestan…
              </span>
            ) : lastSavedAt ? (
              <span className="inline-flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                Salvestatud {lastSavedAt.toLocaleTimeString()}
              </span>
            ) : (
              <span className="opacity-70">Muuda väärtusi ja need salvestatakse.</span>
            )}
          </div>

          <Button
            type="button"
            onClick={flushSave}
            disabled={!canInteract || !hasChanges}
            className="inline-flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvesta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default RPEInput;
