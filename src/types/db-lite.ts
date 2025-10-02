// src/types/db-lite.ts
export type ProfilesRow = {
id?: string;
is_paid: boolean | null;
trial_ends_at: string | null;
current_period_end: string | null;
role?: string | null;
};


export type AccessOverridesRow = {
user_id: string;
expires_at: string | null;
};


export function asRow<T>(value: unknown): T | null {
return (value ?? null) as T | null;
}
