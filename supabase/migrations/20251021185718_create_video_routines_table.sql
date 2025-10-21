-- Create video_routines table for short exercise video routines
CREATE TABLE IF NOT EXISTS public.video_routines (
    id text PRIMARY KEY,
    title text NOT NULL,
    description text NOT NULL,
    duration text NOT NULL,
    category text NOT NULL,
    video_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.video_routines ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read video routines
CREATE POLICY "video_routines_select_all" ON public.video_routines
    FOR SELECT USING (true);

-- Allow admins to insert, update, delete video routines
CREATE POLICY "video_routines_admin_all" ON public.video_routines
    FOR ALL USING (is_admin_unified());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_video_routines_category ON public.video_routines(category);
CREATE INDEX IF NOT EXISTS idx_video_routines_active ON public.video_routines(is_active);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_video_routines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_routines_updated_at
    BEFORE UPDATE ON public.video_routines
    FOR EACH ROW
    EXECUTE FUNCTION update_video_routines_updated_at();
