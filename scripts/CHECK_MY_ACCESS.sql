-- Check if you have access after signup
-- This will show your entitlements and whether they grant access

SELECT 
  u.email,
  u.id as user_id,
  ue.product,
  ue.status,
  ue.trial_ends_at,
  ue.expires_at,
  ue.paused,
  ue.created_at,
  -- Check if currently active
  CASE 
    WHEN ue.paused THEN '❌ PAUSED'
    WHEN ue.status = 'trialing' AND ue.trial_ends_at > now() THEN '✅ TRIAL ACTIVE - HAS ACCESS'
    WHEN ue.status = 'active' AND (ue.expires_at IS NULL OR ue.expires_at > now()) THEN '✅ ACTIVE - HAS ACCESS'
    ELSE '❌ EXPIRED - NO ACCESS'
  END as access_status,
  -- Show days remaining
  CASE
    WHEN ue.status = 'trialing' AND ue.trial_ends_at > now() THEN 
      EXTRACT(DAY FROM (ue.trial_ends_at - now())) || ' days remaining'
    ELSE 'N/A'
  END as time_remaining
FROM auth.users u
LEFT JOIN user_entitlements ue ON ue.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 5;



