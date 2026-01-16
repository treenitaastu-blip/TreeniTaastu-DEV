-- Remove Duplicate Indexes
-- Phase 1, Issue #3: Duplicate Indexes
-- 
-- This migration removes duplicate indexes that serve the same purpose.
-- Only true duplicates are removed - UNIQUE constraints and indexes with
-- different WHERE clauses are kept.
--
-- Risk: 🟢 LOW - Dropping duplicate indexes is safe
-- Impact: 🟡 MEDIUM - Reduces storage, minor performance gain
--
-- Generated: 2025-01-16
-- Validated: ✅ All duplicates identified via database queries

-- ============================================================================
-- PRE-DELETION VERIFICATION
-- ============================================================================
-- Verify indexes exist before dropping (safety check)
DO $$
DECLARE
  v_missing_indexes TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check each index exists
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'access_overrides_user_id_idx') THEN
    v_missing_indexes := array_append(v_missing_indexes, 'access_overrides_user_id_idx');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'subscribers_user_id_idx') THEN
    v_missing_indexes := array_append(v_missing_indexes, 'subscribers_user_id_idx');
  END IF;
  
  -- If any are missing, raise warning but continue (might have been dropped already)
  IF array_length(v_missing_indexes, 1) > 0 THEN
    RAISE NOTICE 'Some indexes already missing (may have been dropped): %', array_to_string(v_missing_indexes, ', ');
  END IF;
  
  RAISE NOTICE 'Pre-deletion check passed';
END $$;

-- ============================================================================
-- REMOVE DUPLICATE INDEXES
-- ============================================================================

-- 1. access_overrides.user_id
-- KEEP: idx_access_overrides_user_id (better naming)
-- DROP: access_overrides_user_id_idx (duplicate)
DROP INDEX IF EXISTS public.access_overrides_user_id_idx;

-- 2. subscribers.user_id
-- KEEP: subscribers_user_id_key (UNIQUE CONSTRAINT - required)
-- KEEP: idx_subscribers_user_id (better naming)
-- DROP: subscribers_user_id_idx (duplicate)
DROP INDEX IF EXISTS public.subscribers_user_id_idx;

-- 3. client_days (client_program_id, day_order)
-- KEEP: client_days_program_id_day_order_idx (more descriptive)
-- DROP: idx_client_days_day_order (duplicate)
DROP INDEX IF EXISTS public.idx_client_days_day_order;

-- 4. client_items (client_day_id, order_in_day)
-- KEEP: client_items_day_order_unique (UNIQUE - enforces uniqueness)
-- DROP: client_items_day_order_idx (duplicate of unique)
-- DROP: idx_client_items_order (duplicate of unique)
DROP INDEX IF EXISTS public.client_items_day_order_idx;
DROP INDEX IF EXISTS public.idx_client_items_order;

-- 5. set_logs.session_id
-- KEEP: idx_set_logs_session_id (better naming)
-- DROP: set_logs_session_id_idx (duplicate)
-- DROP: set_logs_session_idx (duplicate)
DROP INDEX IF EXISTS public.set_logs_session_id_idx;
DROP INDEX IF EXISTS public.set_logs_session_idx;

-- 6. set_logs unique constraint (session_id, client_item_id, set_number)
-- KEEP: set_logs_unique (UNIQUE CONSTRAINT - required)
-- KEEP: unique_session_item_set (UNIQUE CONSTRAINT - required)
-- KEEP: uq_set_logs_unique (has WHERE clause - different)
-- DROP: set_logs_session_item_set_unique (duplicate)
-- DROP: set_logs_unique_triplet (duplicate)
DROP INDEX IF EXISTS public.set_logs_session_item_set_unique;
DROP INDEX IF EXISTS public.set_logs_unique_triplet;

-- 7. exercise_notes (session_id, client_item_id)
-- KEEP: exercise_notes_session_item_unique (UNIQUE CONSTRAINT - required)
-- KEEP: idx_exercise_notes_session_item (better naming)
-- DROP: exercise_notes_by_session_item (duplicate)
DROP INDEX IF EXISTS public.exercise_notes_by_session_item;

-- 8. exercise_notes.client_item_id
-- KEEP: idx_exercise_notes_client_item_id (more descriptive)
-- DROP: idx_exercise_notes_client_item (duplicate)
DROP INDEX IF EXISTS public.idx_exercise_notes_client_item;

-- 9. exercise_notes.user_id
-- KEEP: idx_exercise_notes_user_id (more descriptive)
-- DROP: idx_exercise_notes_user (duplicate)
DROP INDEX IF EXISTS public.idx_exercise_notes_user;

-- 10. rest_timers.user_id
-- KEEP: idx_rest_timers_user_id (better naming)
-- DROP: rest_timers_user_id_idx (duplicate)
DROP INDEX IF EXISTS public.rest_timers_user_id_idx;

-- 11. static_starts.start_monday
-- KEEP: idx_static_starts_start_monday (better naming)
-- DROP: ix_static_starts_start_monday (duplicate)
DROP INDEX IF EXISTS public.ix_static_starts_start_monday;

-- 12. template_days (template_id, day_order)
-- KEEP: template_days_template_id_day_order_idx (more descriptive)
-- DROP: idx_template_days_order (duplicate)
DROP INDEX IF EXISTS public.idx_template_days_order;

-- 13. template_items (template_day_id, order_in_day)
-- KEEP: template_items_day_order_unique (UNIQUE - enforces uniqueness)
-- DROP: idx_template_items_order (duplicate of unique)
-- DROP: template_items_day_order_idx (duplicate of unique)
DROP INDEX IF EXISTS public.idx_template_items_order;
DROP INDEX IF EXISTS public.template_items_day_order_idx;

-- 14. user_analytics_events.event_type
-- KEEP: idx_user_analytics_events_event_type (more descriptive)
-- DROP: idx_user_analytics_events_type (duplicate)
DROP INDEX IF EXISTS public.idx_user_analytics_events_type;

-- 15. user_entitlements.user_id
-- KEEP: idx_user_entitlements_user_id (more descriptive)
-- DROP: idx_ue_user (duplicate)
DROP INDEX IF EXISTS public.idx_ue_user;

-- ============================================================================
-- POST-DELETION VERIFICATION
-- ============================================================================
-- Verify indexes were dropped and constraints remain
DO $$
DECLARE
  v_dropped_count INTEGER;
  v_constraints_ok BOOLEAN;
BEGIN
  -- Count how many were actually dropped
  SELECT COUNT(*) INTO v_dropped_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'access_overrides_user_id_idx',
      'subscribers_user_id_idx',
      'idx_client_days_day_order',
      'client_items_day_order_idx',
      'idx_client_items_order',
      'set_logs_session_id_idx',
      'set_logs_session_idx',
      'set_logs_session_item_set_unique',
      'set_logs_unique_triplet',
      'exercise_notes_by_session_item',
      'idx_exercise_notes_client_item',
      'idx_exercise_notes_user',
      'rest_timers_user_id_idx',
      'ix_static_starts_start_monday',
      'idx_template_days_order',
      'idx_template_items_order',
      'template_items_day_order_idx',
      'idx_user_analytics_events_type',
      'idx_ue_user'
    );
  
  IF v_dropped_count > 0 THEN
    RAISE WARNING 'Some indexes still exist (may need manual cleanup): %', v_dropped_count;
  ELSE
    RAISE NOTICE '✅ All duplicate indexes removed successfully';
  END IF;
  
  -- Verify critical constraints still exist
  SELECT 
    (EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'set_logs_unique')) AND
    (EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_session_item_set')) AND
    (EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscribers_user_id_key')) AND
    (EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exercise_notes_session_item_unique'))
  INTO v_constraints_ok;
  
  IF NOT v_constraints_ok THEN
    RAISE EXCEPTION 'CRITICAL: Required constraints missing after index deletion!';
  ELSE
    RAISE NOTICE '✅ All required constraints verified';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- After running this migration, verify:
--
-- SELECT 
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname IN (
--     'access_overrides_user_id_idx',  -- Should NOT exist
--     'subscribers_user_id_idx',       -- Should NOT exist
--     'set_logs_session_id_idx',       -- Should NOT exist
--     'set_logs_session_idx',          -- Should NOT exist
--     'set_logs_session_item_set_unique', -- Should NOT exist
--     'set_logs_unique_triplet',       -- Should NOT exist
--     'idx_access_overrides_user_id',  -- Should exist
--     'idx_subscribers_user_id',      -- Should exist
--     'idx_set_logs_session_id',      -- Should exist
--     'set_logs_unique',              -- Should exist (constraint)
--     'unique_session_item_set'       -- Should exist (constraint)
--   );
--
-- Expected: Only the "Should exist" indexes should be present

-- ============================================================================
-- IMPACT
-- ============================================================================
-- After removal:
-- 1. Reduced storage usage
-- 2. Faster index maintenance (fewer indexes to update)
-- 3. Slightly faster INSERT/UPDATE operations
-- 4. No functional impact (duplicates serve no purpose)

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- If you need to recreate the dropped indexes:
--
-- CREATE INDEX access_overrides_user_id_idx ON public.access_overrides(user_id);
-- CREATE INDEX subscribers_user_id_idx ON public.subscribers(user_id);
-- CREATE INDEX idx_client_days_day_order ON public.client_days(client_program_id, day_order);
-- CREATE INDEX client_items_day_order_idx ON public.client_items(client_day_id, order_in_day);
-- CREATE INDEX idx_client_items_order ON public.client_items(client_day_id, order_in_day);
-- CREATE INDEX set_logs_session_id_idx ON public.set_logs(session_id);
-- CREATE INDEX set_logs_session_idx ON public.set_logs(session_id);
-- CREATE UNIQUE INDEX set_logs_session_item_set_unique ON public.set_logs(session_id, client_item_id, set_number);
-- CREATE UNIQUE INDEX set_logs_unique_triplet ON public.set_logs(session_id, client_item_id, set_number);
-- CREATE INDEX exercise_notes_by_session_item ON public.exercise_notes(session_id, client_item_id);
-- CREATE INDEX idx_exercise_notes_client_item ON public.exercise_notes(client_item_id);
-- CREATE INDEX idx_exercise_notes_user ON public.exercise_notes(user_id);
-- CREATE INDEX rest_timers_user_id_idx ON public.rest_timers(user_id);
-- CREATE INDEX ix_static_starts_start_monday ON public.static_starts(start_monday);
-- CREATE INDEX idx_template_days_order ON public.template_days(template_id, day_order);
-- CREATE INDEX idx_template_items_order ON public.template_items(template_day_id, order_in_day);
-- CREATE INDEX template_items_day_order_idx ON public.template_items(template_day_id, order_in_day);
-- CREATE INDEX idx_user_analytics_events_type ON public.user_analytics_events(event_type);
-- CREATE INDEX idx_ue_user ON public.user_entitlements(user_id);
