import { z } from "zod";

// Auth validation schemas
export const emailSchema = z
  .string()
  .min(1, "E-post on kohustuslik")
  .email("Sisesta kehtiv e-posti aadress")
  .max(255, "E-post peab olema lühem kui 255 tähemärki")
  .transform((email) => email.toLowerCase().trim());

export const passwordSchema = z
  .string()
  .min(8, "Parool peab olema vähemalt 8 tähemärki")
  .max(128, "Parool peab olema lühem kui 128 tähemärki")
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Parool peab sisaldama väiketähte, suurtähte ja numbrit")
  .regex(/^[^\s]*$/, "Parool ei tohi sisaldada tühikuid");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Parool on kohustuslik"),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z
    .string()
    .max(100, "Nimi peab olema lühem kui 100 tähemärki")
    .regex(/^[a-zA-ZäöüõÄÖÜÕ\s-']*$/, "Nimi võib sisaldada ainult tähti, tühikuid, sidekriipse ja apostroofid")
    .optional()
    .or(z.literal("")),
});

// Exercise validation schema
export const exerciseSchema = z.object({
  title: z
    .string()
    .min(1, "Harjutuse nimi on kohustuslik")
    .max(100, "Harjutuse nimi peab olema lühem kui 100 tähemärki")
    .regex(/^[a-zA-ZäöüõÄÖÜÕ0-9\s-()./]*$/, "Harjutuse nimi sisaldab keelatud tähemärke"),
  description: z
    .string()
    .min(1, "Kirjeldus on kohustuslik")
    .max(1000, "Kirjeldus peab olema lühem kui 1000 tähemärki"),
  category: z
    .string()
    .min(1, "Piirkond on kohustuslik")
    .max(50, "Piirkond peab olema lühem kui 50 tähemärki"),
  duration: z
    .string()
    .min(1, "Kestus on kohustuslik")
    .max(50, "Kestus peab olema lühem kui 50 tähemärki")
    .regex(/^[0-9]+\s*(min|minutit|sek|sekundit|s|m).*$/, "Kestus peab sisaldama numbrit ja ajaühikut"),
  difficulty: z
    .string()
    .min(1, "Raskusaste on kohustuslik")
    .max(50, "Raskusaste peab olema lühem kui 50 tähemärki"),
  video_url: z
    .string()
    .max(500, "Video link peab olema lühem kui 500 tähemärki")
    .refine(
      (url) => {
        if (!url) return true; // Optional field
        try {
          const parsedUrl = new URL(url);
          return parsedUrl.hostname.includes('youtube.com') || 
                 parsedUrl.hostname.includes('youtu.be') ||
                 parsedUrl.hostname.includes('vimeo.com');
        } catch {
          return false;
        }
      },
      "Video link peab olema kehtiv YouTube või Vimeo link"
    )
    .optional()
    .or(z.literal("")),
});

// Article validation schema
export const articleSchema = z.object({
  title: z
    .string()
    .min(1, "Pealkiri on kohustuslik")
    .max(200, "Pealkiri peab olema lühem kui 200 tähemärki"),
  slug: z
    .string()
    .min(1, "URL slug on kohustuslik")
    .max(100, "URL slug peab olema lühem kui 100 tähemärki")
    .regex(/^[a-z0-9-]+$/, "URL slug võib sisaldada ainult väiketähti, numbreid ja sidekriipse"),
  summary: z
    .string()
    .min(1, "Kokkuvõte on kohustuslik")
    .max(500, "Kokkuvõte peab olema lühem kui 500 tähemärki"),
  content: z
    .string()
    .min(1, "Sisu on kohustuslik")
    .max(50000, "Sisu peab olema lühem kui 50000 tähemärki"),
  excerpt: z
    .string()
    .max(300, "Väljavõte peab olema lühem kui 300 tähemärki")
    .optional()
    .or(z.literal("")),
  category: z
    .string()
    .min(1, "Kategooria on kohustuslik")
    .max(50, "Kategooria peab olema lühem kui 50 tähemärki"),
  format: z
    .string()
    .min(1, "Formaat on kohustuslik")
    .max(50, "Formaat peab olema lühem kui 50 tähemärki"),
  read_time_minutes: z
    .number()
    .min(1, "Lugemisaeg peab olema vähemalt 1 minut")
    .max(120, "Lugemisaeg peab olema alla 120 minuti"),
  evidence_strength: z
    .string()
    .min(1, "Tõendite tugevus on kohustuslik"),
  tags: z
    .array(z.string().max(30, "Silt peab olema lühem kui 30 tähemärki"))
    .max(10, "Maksimaalselt 10 silti"),
  featured_image_url: z
    .string()
    .max(500, "Pildi link peab olema lühem kui 500 tähemärki")
    .refine(
      (url) => {
        if (!url) return true; // Optional field
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      "Pildi link peab olema kehtiv URL"
    )
    .optional()
    .or(z.literal("")),
  author: z
    .string()
    .max(100, "Autor peab olema lühem kui 100 tähemärki")
    .optional()
    .or(z.literal("")),
  meta_description: z
    .string()
    .max(160, "Meta kirjeldus peab olema lühem kui 160 tähemärki")
    .optional()
    .or(z.literal("")),
  published: z.boolean(),
});

// Profile validation schema
export const profileSchema = z.object({
  full_name: z
    .string()
    .max(100, "Nimi peab olema lühem kui 100 tähemärki")
    .regex(/^[a-zA-ZäöüõÄÖÜÕ\s-']*$/, "Nimi võib sisaldama ainult tähti, tühikuid, sidekriipse ja apostroofid")
    .optional()
    .or(z.literal("")),
  avatar_url: z
    .string()
    .max(500, "Profiilipildi link peab olema lühem kui 500 tähemärki")
    .refine(
      (url) => {
        if (!url) return true; // Optional field
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      "Profiilipildi link peab olema kehtiv URL"
    )
    .optional()
    .or(z.literal("")),
});

// Support message validation schema
export const supportMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Sõnum ei saa olla tühi")
    .max(2000, "Sõnum peab olema lühem kui 2000 tähemärki")
    .regex(/^[\s\S]*$/, "Sõnum sisaldab keelatud tähemärke"),
});

// Template validation schemas
export const templateDaySchema = z.object({
  title: z
    .string()
    .min(1, "Päeva nimi on kohustuslik")
    .max(100, "Päeva nimi peab olema lühem kui 100 tähemärki"),
  note: z
    .string()
    .max(500, "Märkus peab olema lühem kui 500 tähemärki")
    .optional()
    .or(z.literal("")),
});

export const templateItemSchema = z.object({
  exercise_name: z
    .string()
    .min(1, "Harjutuse nimi on kohustuslik")
    .max(100, "Harjutuse nimi peab olema lühem kui 100 tähemärki"),
  sets: z
    .number()
    .min(1, "Setsid peavad olema vähemalt 1")
    .max(20, "Setsid peavad olema alla 20"),
  reps: z
    .string()
    .min(1, "Kordused on kohustuslikud")
    .max(50, "Kordused peavad olema lühemad kui 50 tähemärki"),
  rest_seconds: z
    .number()
    .min(0, "Paus ei saa olla negatiivne")
    .max(600, "Paus peab olema alla 10 minuti")
    .optional(),
  coach_notes: z
    .string()
    .max(500, "Treeneri märkused peavad olema lühemad kui 500 tähemärki")
    .optional()
    .or(z.literal("")),
  video_url: z
    .string()
    .max(500, "Video link peab olema lühem kui 500 tähemärki")
    .refine(
      (url) => {
        if (!url) return true; // Optional field
        try {
          const parsedUrl = new URL(url);
          return parsedUrl.hostname.includes('youtube.com') || 
                 parsedUrl.hostname.includes('youtu.be') ||
                 parsedUrl.hostname.includes('vimeo.com');
        } catch {
          return false;
        }
      },
      "Video link peab olema kehtiv YouTube või Vimeo link"
    )
    .optional()
    .or(z.literal("")),
});

// Generic validation helpers
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};

export const validateAndSanitize = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[] } => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => err.message),
      };
    }
    return {
      success: false,
      errors: ["Valideerimise viga"],
    };
  }
};