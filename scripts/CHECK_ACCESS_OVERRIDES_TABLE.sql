-- Check if access_overrides table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'access_overrides'
) as table_exists;

-- If it exists, show its structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'access_overrides'
ORDER BY ordinal_position;


