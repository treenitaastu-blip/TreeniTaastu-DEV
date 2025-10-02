-- Simplify articles table to be like a simple blog
-- Remove complex jsonb columns that cause crashes
ALTER TABLE articles 
DROP COLUMN IF EXISTS tldr,
DROP COLUMN IF EXISTS body,
DROP COLUMN IF EXISTS article_references,
DROP COLUMN IF EXISTS related_posts;

-- Add simple blog-style columns
ALTER TABLE articles 
ADD COLUMN content TEXT NOT NULL DEFAULT '',
ADD COLUMN excerpt TEXT,
ADD COLUMN tags TEXT[] DEFAULT '{}',
ADD COLUMN featured_image_url TEXT,
ADD COLUMN author TEXT DEFAULT 'Admin',
ADD COLUMN meta_description TEXT;