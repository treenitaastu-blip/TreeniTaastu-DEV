-- Create programday table
CREATE TABLE IF NOT EXISTS public.programday (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    day_number integer NOT NULL,
    program_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add RLS
ALTER TABLE public.programday ENABLE ROW LEVEL SECURITY;

-- Add policy
CREATE POLICY IF NOT EXISTS "Authenticated users can view program days"
    ON public.programday FOR SELECT
    TO authenticated
    USING (true);

-- Grant permissions
GRANT SELECT ON public.programday TO authenticated;
