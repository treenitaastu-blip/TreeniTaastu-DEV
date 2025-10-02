export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  excerpt?: string;
  category: string;
  format: 'TLDR' | 'Steps' | 'MythFact';
  read_time_minutes: number;
  evidence_strength: 'kõrge' | 'keskmine' | 'madal';
  tags: string[];
  featured_image_url?: string;
  author: string;
  meta_description?: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export const ARTICLE_CATEGORIES = [
  "Toitumine",
  "Liikumine",
  "Magamine", 
  "Stress",
  "Tööergonoomika",
  "Kaelavalu",
  "Seljavalu",
  "Lihasmassi vähenemine"
] as const;

export type ArticleCategory = typeof ARTICLE_CATEGORIES[number];

export const ARTICLE_FORMATS = [
  "TLDR",
  "Steps",
  "MythFact"
] as const;

export type ArticleFormat = typeof ARTICLE_FORMATS[number];

export const EVIDENCE_LEVELS = [
  "kõrge",
  "keskmine", 
  "madal"
] as const;

export type EvidenceLevel = typeof EVIDENCE_LEVELS[number];