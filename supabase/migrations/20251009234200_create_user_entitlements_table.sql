-- Create user_entitlements table - THE CORE ACCESS CONTROL TABLE
-- This table is used by all guards and access control logic

-- First, create the product_kind enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_kind') THEN
        CREATE TYPE public.product_kind AS ENUM ('static', 'pt');
    END IF;
END$$;

-- Create the user_entitlements table
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product product_kind NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'trialing', 'expired', 'cancelled')),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  trial_ends_at timestamp with time zone,
  expires_at timestamp with time zone,
  paused boolean NOT NULL DEFAULT false,
  source text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, product)
);

-- Enable RLS
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "ue_select_self_or_admin" ON public.user_entitlements;
CREATE POLICY "ue_select_self_or_admin" 
ON public.user_entitlements 
FOR SELECT 
USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "ue_insert_service_role" ON public.user_entitlements;
CREATE POLICY "ue_insert_service_role" 
ON public.user_entitlements 
FOR INSERT 
WITH CHECK (true); -- Service role and triggers can insert

DROP POLICY IF EXISTS "ue_update_service_role" ON public.user_entitlements;
CREATE POLICY "ue_update_service_role" 
ON public.user_entitlements 
FOR UPDATE 
USING (true); -- Service role can update

DROP POLICY IF EXISTS "ue_admin_write" ON public.user_entitlements;
CREATE POLICY "ue_admin_write" 
ON public.user_entitlements 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON public.user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_product ON public.user_entitlements(product);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_status ON public.user_entitlements(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_expires_at ON public.user_entitlements(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_status ON public.user_entitlements(user_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_product_active ON public.user_entitlements(product, status) WHERE status IN ('active', 'trialing');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_entitlements_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_user_entitlements_updated_at ON public.user_entitlements;
CREATE TRIGGER update_user_entitlements_updated_at
BEFORE UPDATE ON public.user_entitlements
FOR EACH ROW
EXECUTE FUNCTION update_user_entitlements_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.user_entitlements IS 
'Core access control table. Grants access to static programs and PT features. Used by all guards and access control logic.';

COMMENT ON COLUMN public.user_entitlements.product IS 
'Product type: static (Self-Guided programs) or pt (Personal Training features)';

COMMENT ON COLUMN public.user_entitlements.status IS 
'Status: active (paid/granted), trialing (free trial), expired (ended), cancelled (user cancelled)';

COMMENT ON COLUMN public.user_entitlements.source IS 
'How this entitlement was granted: stripe_self_guided, stripe_guided, stripe_transformation, manual, signup_trigger, etc.';



