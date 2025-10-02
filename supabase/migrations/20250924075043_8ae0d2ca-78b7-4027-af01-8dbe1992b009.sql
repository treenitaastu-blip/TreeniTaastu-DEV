-- Grant active static access to current subscribers
UPDATE user_entitlements 
SET trial_ends_at = now() + interval '30 days',
    status = 'active'
WHERE user_id IN (
  SELECT user_id FROM subscribers 
  WHERE status IN ('active', 'trialing') 
  AND email IN ('treenitaastu@gmail.com', 'henrikraavi1234@gmail.com')
) 
AND product = 'static';