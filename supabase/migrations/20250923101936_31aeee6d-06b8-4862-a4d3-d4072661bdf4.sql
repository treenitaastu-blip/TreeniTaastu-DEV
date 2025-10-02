-- Reset all users' static program start to last Monday for consistent tracking
-- Today is Monday 2025-09-23, so last Monday was 2025-09-16

-- Update all existing static starts to last Monday
UPDATE static_starts 
SET start_monday = '2025-09-16'::date,
    created_at = '2025-09-16 00:00:00+00'::timestamptz
WHERE start_monday >= '2025-09-23'::date;

-- Clear inconsistent progress data - keep only progress that makes sense
-- (progress from last 7 days should be valid)
DELETE FROM userprogress 
WHERE completed_at > '2025-09-23 23:59:59+00'::timestamptz
   OR completed_at < '2025-09-16 00:00:00+00'::timestamptz;

-- Insert static starts for any users who don't have one yet
-- (users with 7-day trial should have a start date)
INSERT INTO static_starts (user_id, start_monday, created_at)
SELECT DISTINCT p.id, '2025-09-16'::date, '2025-09-16 00:00:00+00'::timestamptz
FROM profiles p
LEFT JOIN static_starts ss ON ss.user_id = p.id
WHERE ss.user_id IS NULL
  AND p.id IS NOT NULL;

-- Verify the fix by showing current state
SELECT 
  'static_starts_fixed' as check_type,
  COUNT(*) as total_users,
  MIN(start_monday) as earliest_start,
  MAX(start_monday) as latest_start
FROM static_starts;