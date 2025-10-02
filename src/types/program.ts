export interface Exercise {
  order: number;
  name: string;
  video_url?: string | null;
  sets?: number | null;
  reps?: number | null;
  seconds?: number | null;
  cues?: string | null;
  regression?: string | null;
  progression?: string | null;
}

export interface ProgramDay {
  id: string;
  program_id?: string | null;
  week: number;
  day: number;
  title?: string | null;
  notes?: string | null;
  exercises: Exercise[];
  created_at: string;
  updated_at?: string | null;
}

export interface UserProgress {
  programday_id: string;
  created_at: string;
  reps?: number | null;
  sets?: number | null;
}