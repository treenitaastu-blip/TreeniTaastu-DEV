-- Manual insertion of programs data
-- This is a temporary solution until the full migration is applied

-- First, let's create the programs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.programs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  duration_days integer NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('alustaja', 'keskmine', 'kogenud')),
  status text NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('available', 'coming_soon', 'maintenance')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT programs_pkey PRIMARY KEY (id)
);

-- Create user_programs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_programs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_programs_pkey PRIMARY KEY (id),
  CONSTRAINT user_programs_user_program_unique UNIQUE (user_id, program_id)
);

-- Enable RLS if not already enabled
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_programs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  -- Programs policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'programs' AND policyname = 'Enable read access for all users') THEN
    CREATE POLICY "Enable read access for all users" ON public.programs FOR SELECT USING (true);
  END IF;

  -- User programs policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_programs' AND policyname = 'Enable read access for users on their own programs') THEN
    CREATE POLICY "Enable read access for users on their own programs" ON public.user_programs FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_programs' AND policyname = 'Enable insert for users on their own programs') THEN
    CREATE POLICY "Enable insert for users on their own programs" ON public.user_programs FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_programs' AND policyname = 'Enable update for users on their own programs') THEN
    CREATE POLICY "Enable update for users on their own programs" ON public.user_programs FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_programs' AND policyname = 'Enable delete for users on their own programs') THEN
    CREATE POLICY "Enable delete for users on their own programs" ON public.user_programs FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Insert programs data
INSERT INTO public.programs (title, description, duration_days, difficulty, status) VALUES
('Kontorikeha Reset', '20-päevane programm kontoritöötajatele, mis aitab parandada kehahoiakut ja vähendada põhja- ja kaelavalusid. Sisaldab lihtsaid harjutusi, mida saab teha kodus või kontoris.', 20, 'alustaja', 'available'),
('35+ Naised Kodus Tugevaks', 'Spetsiaalselt 35+ naistele mõeldud tugevustreeningu programm, mida saab teha kodus. Fookus lihaste tugevdamisel ja luutiheduse säilitamisel.', 28, 'keskmine', 'coming_soon'),
('Alaseljavalu Lahendus', 'Keskendub alaselja tugevdamisele ja valude vähendamisele. Sisaldab spetsiaalseid harjutusi, mis aitavad parandada selja tervist ja vähendada kroonilisi valusid.', 21, 'alustaja', 'coming_soon')
ON CONFLICT (title) DO NOTHING;

-- Create the database functions if they don't exist
CREATE OR REPLACE FUNCTION get_user_active_program(p_user_id uuid)
RETURNS TABLE (
  program_id uuid,
  program_title text,
  program_description text,
  program_duration_days integer,
  program_difficulty text,
  user_program_status text,
  started_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as program_id,
    p.title as program_title,
    p.description as program_description,
    p.duration_days as program_duration_days,
    p.difficulty as program_difficulty,
    up.status as user_program_status,
    up.started_at
  FROM user_programs up
  JOIN programs p ON up.program_id = p.id
  WHERE up.user_id = p_user_id 
    AND up.status = 'active'
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION start_program(p_user_id uuid, p_program_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_program programs%ROWTYPE;
  v_existing_active user_programs%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Security check
  IF p_user_id != auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: can only start programs for yourself';
  END IF;

  -- Get program details
  SELECT * INTO v_program FROM programs WHERE id = p_program_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Program not found';
  END IF;

  -- Check if program is available
  IF v_program.status != 'available' THEN
    RAISE EXCEPTION 'Program is not available';
  END IF;

  -- Check if user already has this program
  SELECT * INTO v_existing_active 
  FROM user_programs 
  WHERE user_id = p_user_id AND program_id = p_program_id;
  
  IF FOUND THEN
    -- Update existing to active
    UPDATE user_programs 
    SET status = 'active', started_at = now(), updated_at = now()
    WHERE user_id = p_user_id AND program_id = p_program_id;
    
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Program resumed',
      'program_id', p_program_id
    );
  ELSE
    -- Pause any other active programs
    UPDATE user_programs 
    SET status = 'paused', updated_at = now()
    WHERE user_id = p_user_id AND status = 'active';
    
    -- Start new program
    INSERT INTO user_programs (user_id, program_id, status, started_at)
    VALUES (p_user_id, p_program_id, 'active', now());
    
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Program started',
      'program_id', p_program_id
    );
  END IF;

  RETURN v_result;
END;
$$;
