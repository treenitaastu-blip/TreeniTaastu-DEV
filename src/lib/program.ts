// src/lib/program.ts
import type { Exercise } from "@/types/program";

/**
 * Normalize exercises array: filter invalid entries and sort by `order`.
 */
export function normalizeExercises(exercises: Exercise[]): Exercise[] {
  if (!Array.isArray(exercises)) return [];
  return exercises
    .filter((ex) => ex && typeof ex.name === "string" && ex.name.trim() !== "")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Format exercise prescription as "3×10" or "2×30s".
 */
export function formatPrescription(exercise: {
  sets?: number | null;
  reps?: number | null;
  seconds?: number | null;
}): string {
  const sets = exercise.sets ?? 1;

  if (exercise.seconds && exercise.seconds > 0) {
    return `${sets}×${exercise.seconds}s`;
  }

  if (exercise.reps && exercise.reps > 0) {
    return `${sets}×${exercise.reps}`;
  }

  return "";
}

/**
 * Convert YouTube URL to nocookie embed format when possible.
 */
export function toEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/\/embed\//i.test(url)) return url;

  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]+)/i);
  if (short) return `https://www.youtube-nocookie.com/embed/${short[1]}`;

  const watch = url.match(/[?&]v=([A-Za-z0-9_-]+)/i);
  if (watch) return `https://www.youtube-nocookie.com/embed/${watch[1]}`;

  return url;
}

/** Shape-agnostic legacy day object. */
type LegacyDay = Record<string, unknown>;

/** Safe extractors for legacy props. */
function asString(obj: LegacyDay, key: string): string {
  const v = obj[key];
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
function asInt(obj: LegacyDay, key: string, fallback = 0): number {
  const v = obj[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/**
 * Convert legacy program-day format (exercise1..5, sets1, reps1, seconds1, hint1, videolink1)
 * to a normalized Exercise[].
 */
export function convertLegacyProgramDay(day: LegacyDay): Exercise[] {
  const exercises: Exercise[] = [];

  for (let i = 1; i <= 5; i += 1) {
    const name = asString(day, `exercise${i}`).trim();
    if (!name) continue;

    const sets = asInt(day, `sets${i}`, 1);
    const reps = asInt(day, `reps${i}`, 0);
    const seconds = asInt(day, `seconds${i}`, 0);
    const cuesRaw = asString(day, `hint${i}`).trim();
    const videoRaw = asString(day, `videolink${i}`).trim();

    exercises.push({
      name,
      sets,
      reps,
      seconds,
      cues: cuesRaw || undefined,
      video_url: videoRaw || undefined,
      order: i,
    });
  }

  return exercises;
}

/**
 * Compute totals for a day.
 */
export function getDayTotals(exercises: Exercise[]): { reps: number; sets: number } {
  const normalized = normalizeExercises(exercises);
  let totalReps = 0;
  let totalSets = 0;

  for (const ex of normalized) {
    totalReps += ex.reps ?? 0;
    totalSets += ex.sets ?? 0;
  }

  return { reps: totalReps, sets: totalSets };
}
