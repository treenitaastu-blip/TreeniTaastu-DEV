-- Grant permissions to authenticated role for client_item_set_weights table
-- RLS policies control which rows users can access, but GRANT controls table access
-- This is required for authenticated users to be able to use the table

GRANT SELECT, INSERT, UPDATE ON client_item_set_weights TO authenticated;
