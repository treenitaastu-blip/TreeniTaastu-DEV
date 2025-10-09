-- Check your user's entitlements
-- Replace 'your-email@example.com' with your actual email

SELECT 
  u.email,
  u.id as user_id,
  ue.product,
  ue.status,
  ue.trial_ends_at,
  ue.expires_at,
  ue.paused,
  ue.source,
  ue.note,
  -- Check if it's currently active
  CASE 
    WHEN ue.paused THEN 'PAUSED'
    WHEN ue.status = 'trialing' AND ue.trial_ends_at > now() THEN 'TRIAL ACTIVE'
    WHEN ue.status = 'active' AND (ue.expires_at IS NULL OR ue.expires_at > now()) THEN 'ACTIVE'
    ELSE 'EXPIRED/INACTIVE'
  END as current_status
FROM auth.users u
LEFT JOIN user_entitlements ue ON ue.user_id = u.id
WHERE u.email = 'YOUR_EMAIL_HERE'
ORDER BY ue.created_at DESC;

