export interface ReadReference {
  id: number;
  title: string;
  year: number;
  url: string;
  keyFinding: string;
}

export type ReadCategory = 
  | 'Toitumine'
  | 'Liikumine'
  | 'Magamine'
  | 'Stress'
  | 'Tööergonoomika'
  | 'Kaelavalu'
  | 'Seljavalu'
  | 'Lihasmassi vähenemine';

export type ReadFormat = 'TLDR' | 'MythFact' | 'Steps';

export type EvidenceStrength = 'kõrge' | 'keskmine' | 'madal';

// Simple blog post interface
export interface BlogPost {
  slug: string;
  title: string;
  summary: string;
  content: string;
  excerpt?: string;
  category: ReadCategory;
  format: ReadFormat;
  readTimeMinutes: number;
  evidenceStrength: EvidenceStrength;
  tags: string[];
  featuredImageUrl?: string;
  author: string;
  updatedAt: string;
}