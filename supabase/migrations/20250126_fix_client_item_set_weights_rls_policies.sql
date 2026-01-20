-- Fix RLS policies for client_item_set_weights table
-- Ensure authenticated users can access their own weight preferences
-- Fixes 403 Forbidden errors

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Users can view their own set weights" ON client_item_set_weights;
DROP POLICY IF EXISTS "Users can insert their own set weights" ON client_item_set_weights;
DROP POLICY IF EXISTS "Users can update their own set weights" ON client_item_set_weights;

-- Recreate RLS policies with explicit TO authenticated role
-- This ensures the policies work correctly for authenticated users
CREATE POLICY "Users can view their own set weights"
  ON client_item_set_weights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own set weights"
  ON client_item_set_weights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own set weights"
  ON client_item_set_weights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify RLS is enabled
ALTER TABLE client_item_set_weights ENABLE ROW LEVEL SECURITY;
