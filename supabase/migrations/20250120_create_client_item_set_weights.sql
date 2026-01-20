-- Create client_item_set_weights table for per-set weight memory
-- This allows each user to remember individual set weights across workout sessions
-- Example: Set 2 of "hantlitega kõrvale tõsted" can be 4kg while other sets remain 2kg

CREATE TABLE IF NOT EXISTS client_item_set_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_item_id uuid NOT NULL REFERENCES client_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_number integer NOT NULL CHECK (set_number >= 1 AND set_number <= 20),
  weight_kg numeric(5,2) NOT NULL CHECK (weight_kg >= 0 AND weight_kg <= 1000),
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT client_item_set_weights_unique UNIQUE(client_item_id, set_number, user_id)
);

-- Indexes for performance optimization
-- Composite index for loading preferences by exercise and user (most common query)
CREATE INDEX IF NOT EXISTS idx_set_weights_client_item ON client_item_set_weights(client_item_id, user_id);

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_set_weights_user ON client_item_set_weights(user_id);

-- Index for recent updates (useful for analytics/debugging)
CREATE INDEX IF NOT EXISTS idx_set_weights_updated ON client_item_set_weights(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE client_item_set_weights ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own set weight preferences
CREATE POLICY "Users can view their own set weights"
  ON client_item_set_weights FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own set weight preferences
CREATE POLICY "Users can insert their own set weights"
  ON client_item_set_weights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own set weight preferences
CREATE POLICY "Users can update their own set weights"
  ON client_item_set_weights FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy needed - CASCADE delete handles cleanup when exercise/user is deleted

-- Comments for documentation
COMMENT ON TABLE client_item_set_weights IS 'Stores user preferences for individual set weights. Each user can remember different weights for each set of an exercise (e.g., Set 2 = 4kg while other sets = 2kg).';
COMMENT ON COLUMN client_item_set_weights.client_item_id IS 'Reference to the exercise (client_items table)';
COMMENT ON COLUMN client_item_set_weights.user_id IS 'Reference to the user who owns this preference';
COMMENT ON COLUMN client_item_set_weights.set_number IS 'Which set number (1-20) this weight applies to';
COMMENT ON COLUMN client_item_set_weights.weight_kg IS 'Preferred weight in kg for this specific set';
COMMENT ON COLUMN client_item_set_weights.updated_at IS 'Timestamp of when this preference was last updated';
