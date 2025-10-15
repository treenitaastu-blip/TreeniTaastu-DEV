-- ========================================
-- FIX REALTIME SUBSCRIPTION FILTERS
-- ========================================
-- Fixes "invalid column for filter user_id" error
-- Sets up replica identity for realtime filtering
-- ========================================

-- Enable replica identity for support_conversations
-- This allows filtering on non-primary key columns in realtime
ALTER TABLE public.support_conversations REPLICA IDENTITY FULL;

-- Enable replica identity for support_messages  
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;

-- Verify the setup
SELECT 
  schemaname,
  tablename,
  CASE relreplident
    WHEN 'd' THEN 'default (primary key)'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full (all columns)'
    WHEN 'i' THEN 'index'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN ('support_conversations', 'support_messages')
AND n.nspname = 'public';

-- Success message
SELECT '✅ Realtime filters fixed! Signup should work now.' as status;


