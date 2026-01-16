-- Add Missing Foreign Key Indexes
-- Phase 1, Issue #1: Missing Foreign Key Indexes
-- 
-- This migration adds indexes on all foreign key columns that are missing them.
-- These indexes are critical for:
-- 1. Fast JOIN operations
-- 2. Fast DELETE CASCADE operations
-- 3. Preventing timeouts on "mark exercise as done" functionality
--
-- Risk: 🟢 LOW - Adding indexes never breaks functionality
-- Impact: 🟠 HIGH - Performance improvement, could fix "mark as done" timeout
--
-- Generated: 2025-01-16
-- Validated: ✅ All 11 indexes confirmed missing via database queries

-- ============================================================================
-- 1. booking_requests.user_id → profiles.id
-- ============================================================================
-- Purpose: Fast lookups when querying bookings by user
-- Impact: Improves user booking queries and DELETE CASCADE operations
CREATE INDEX IF NOT EXISTS idx_booking_requests_user_id 
ON public.booking_requests(user_id);

-- ============================================================================
-- 2. exercise_alternatives.created_by → profiles.id
-- ============================================================================
-- Purpose: Fast lookups when querying exercise alternatives by creator
-- Impact: Improves admin queries and user access checks
CREATE INDEX IF NOT EXISTS idx_exercise_alternatives_created_by 
ON public.exercise_alternatives(created_by);

-- ============================================================================
-- 3-5. progression_analysis_failures (day_id, exercise_id, program_id)
-- ============================================================================
-- Purpose: Fast lookups for progression analysis failure tracking
-- Impact: Improves admin dashboard queries and failure analysis
CREATE INDEX IF NOT EXISTS idx_progression_analysis_failures_day_id 
ON public.progression_analysis_failures(day_id);

CREATE INDEX IF NOT EXISTS idx_progression_analysis_failures_exercise_id 
ON public.progression_analysis_failures(exercise_id);

CREATE INDEX IF NOT EXISTS idx_progression_analysis_failures_program_id 
ON public.progression_analysis_failures(program_id);

-- ============================================================================
-- 6. support_messages.sender_id → profiles.id
-- ============================================================================
-- Purpose: Fast lookups when querying support messages by sender
-- Impact: Improves support chat queries and user message history
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id 
ON public.support_messages(sender_id);

-- ============================================================================
-- 7. template_alternatives.created_by → profiles.id
-- ============================================================================
-- Purpose: Fast lookups when querying template alternatives by creator
-- Impact: Improves admin queries and template management
CREATE INDEX IF NOT EXISTS idx_template_alternatives_created_by 
ON public.template_alternatives(created_by);

-- ============================================================================
-- 8. training_journal.client_program_id → client_programs.id
-- ============================================================================
-- Purpose: Fast lookups when querying journal entries by program
-- Impact: Improves journal queries and program deletion operations
CREATE INDEX IF NOT EXISTS idx_training_journal_client_program_id 
ON public.training_journal(client_program_id);

-- ============================================================================
-- 9. user_roles.granted_by → profiles.id
-- ============================================================================
-- Purpose: Fast lookups when querying role grants by grantor
-- Impact: Improves admin queries and audit trails
CREATE INDEX IF NOT EXISTS idx_user_roles_granted_by 
ON public.user_roles(granted_by);

-- ============================================================================
-- 10-11. workout_failures (day_id, program_id)
-- ============================================================================
-- Purpose: Fast lookups for workout failure tracking
-- Impact: Improves admin dashboard queries and failure analysis
CREATE INDEX IF NOT EXISTS idx_workout_failures_day_id 
ON public.workout_failures(day_id);

CREATE INDEX IF NOT EXISTS idx_workout_failures_program_id 
ON public.workout_failures(program_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this migration, verify all indexes were created:
--
-- SELECT
--   tc.table_name,
--   kcu.column_name,
--   CASE 
--     WHEN idx.indexname IS NOT NULL THEN 'HAS INDEX'
--     ELSE 'MISSING INDEX'
--   END as index_status,
--   idx.indexname
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- LEFT JOIN pg_indexes idx
--   ON idx.schemaname = tc.table_schema
--   AND idx.tablename = tc.table_name
--   AND idx.indexdef LIKE '%' || kcu.column_name || '%'
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_schema = 'public'
--   AND tc.table_name IN (
--     'booking_requests', 'exercise_alternatives', 'progression_analysis_failures',
--     'support_messages', 'template_alternatives', 'training_journal',
--     'user_roles', 'workout_failures'
--   )
-- ORDER BY tc.table_name, kcu.column_name;
--
-- Expected: All should show "HAS INDEX"

-- ============================================================================
-- PERFORMANCE IMPACT
-- ============================================================================
-- These indexes will:
-- 1. Speed up JOIN operations on foreign keys
-- 2. Speed up DELETE CASCADE operations
-- 3. Potentially fix "mark exercise as done" timeout issues
-- 4. Improve admin dashboard query performance
-- 5. Improve support chat query performance
--
-- Storage impact: Minimal (indexes are small for UUID columns)
-- Query impact: Significant improvement for affected queries

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- If you need to rollback this migration:
--
-- DROP INDEX IF EXISTS idx_booking_requests_user_id;
-- DROP INDEX IF EXISTS idx_exercise_alternatives_created_by;
-- DROP INDEX IF EXISTS idx_progression_analysis_failures_day_id;
-- DROP INDEX IF EXISTS idx_progression_analysis_failures_exercise_id;
-- DROP INDEX IF EXISTS idx_progression_analysis_failures_program_id;
-- DROP INDEX IF EXISTS idx_support_messages_sender_id;
-- DROP INDEX IF EXISTS idx_template_alternatives_created_by;
-- DROP INDEX IF EXISTS idx_training_journal_client_program_id;
-- DROP INDEX IF EXISTS idx_user_roles_granted_by;
-- DROP INDEX IF EXISTS idx_workout_failures_day_id;
-- DROP INDEX IF EXISTS idx_workout_failures_program_id;
