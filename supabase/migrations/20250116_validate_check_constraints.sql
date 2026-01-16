-- Validate Check Constraints
-- Phase 1, Issue #2: Invalid Check Constraints (NOT VALID)
-- 
-- This migration validates check constraints that are currently NOT VALID.
-- Validation checks all existing rows against the constraint. If validation
-- succeeds, the constraint becomes active and will enforce data integrity
-- on future inserts/updates.
--
-- Risk: 🟢 LOW - Validation only checks data, doesn't change it
-- Impact: 🟡 MEDIUM - Ensures data integrity going forward
--
-- Generated: 2025-01-16
-- Validated: ✅ No invalid data exists (0 rows with negative values)

-- ============================================================================
-- PRE-VALIDATION CHECK
-- ============================================================================
-- Verify no invalid data exists before validation
-- If this query returns any rows, validation will fail
DO $$
DECLARE
  v_invalid_client_items INTEGER;
  v_invalid_template_items INTEGER;
BEGIN
  -- Check client_items
  SELECT COUNT(*) INTO v_invalid_client_items
  FROM client_items
  WHERE rest_seconds < 0;
  
  -- Check template_items
  SELECT COUNT(*) INTO v_invalid_template_items
  FROM template_items
  WHERE rest_seconds < 0;
  
  -- Raise error if invalid data found
  IF v_invalid_client_items > 0 THEN
    RAISE EXCEPTION 'Cannot validate constraint: Found % rows in client_items with rest_seconds < 0. Fix data first.', v_invalid_client_items;
  END IF;
  
  IF v_invalid_template_items > 0 THEN
    RAISE EXCEPTION 'Cannot validate constraint: Found % rows in template_items with rest_seconds < 0. Fix data first.', v_invalid_template_items;
  END IF;
  
  RAISE NOTICE 'Pre-validation check passed: No invalid data found';
END $$;

-- ============================================================================
-- VALIDATE CONSTRAINTS
-- ============================================================================

-- 1. Validate client_items.rest_seconds constraint
-- Constraint: rest_seconds >= 0
-- Current state: NOT VALID (exists but doesn't enforce)
-- After validation: Will enforce on all future inserts/updates
ALTER TABLE public.client_items 
VALIDATE CONSTRAINT client_items_rest_nonneg;

-- 2. Validate template_items.rest_seconds constraint
-- Constraint: rest_seconds >= 0
-- Current state: NOT VALID (exists but doesn't enforce)
-- After validation: Will enforce on all future inserts/updates
ALTER TABLE public.template_items 
VALIDATE CONSTRAINT template_items_rest_nonneg;

-- ============================================================================
-- POST-VALIDATION VERIFICATION
-- ============================================================================
-- Verify constraints are now validated
DO $$
DECLARE
  v_client_validated BOOLEAN;
  v_template_validated BOOLEAN;
BEGIN
  -- Check client_items constraint
  SELECT convalidated INTO v_client_validated
  FROM pg_constraint
  WHERE conname = 'client_items_rest_nonneg';
  
  -- Check template_items constraint
  SELECT convalidated INTO v_template_validated
  FROM pg_constraint
  WHERE conname = 'template_items_rest_nonneg';
  
  -- Verify both are validated
  IF NOT v_client_validated THEN
    RAISE WARNING 'client_items_rest_nonneg constraint validation may have failed';
  END IF;
  
  IF NOT v_template_validated THEN
    RAISE WARNING 'template_items_rest_nonneg constraint validation may have failed';
  END IF;
  
  IF v_client_validated AND v_template_validated THEN
    RAISE NOTICE '✅ Both constraints validated successfully';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- After running this migration, verify constraints are validated:
--
-- SELECT 
--   conname as constraint_name,
--   conrelid::regclass as table_name,
--   convalidated as is_validated,
--   pg_get_constraintdef(oid) as constraint_definition
-- FROM pg_constraint
-- WHERE conname IN ('client_items_rest_nonneg', 'template_items_rest_nonneg');
--
-- Expected: convalidated = true for both

-- ============================================================================
-- IMPACT
-- ============================================================================
-- After validation:
-- 1. Future inserts with rest_seconds < 0 will be rejected
-- 2. Future updates with rest_seconds < 0 will be rejected
-- 3. Data integrity is now enforced at the database level
-- 4. Application code can rely on this constraint

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- If you need to rollback (make constraints NOT VALID again):
--
-- ALTER TABLE public.client_items 
-- ALTER CONSTRAINT client_items_rest_nonneg NOT VALID;
--
-- ALTER TABLE public.template_items 
-- ALTER CONSTRAINT template_items_rest_nonneg NOT VALID;
--
-- Note: This will stop enforcing the constraint but won't delete it
