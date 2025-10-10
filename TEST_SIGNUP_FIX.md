# 🔧 Signup Fix - Test Plan

## Problem
Getting 500 error when creating new accounts: "Database error saving new user"

## Root Cause
The `ensure_trial_on_signup()` trigger has TWO bugs:
1. ❌ Line 38: `'static'` not cast to `product_kind` enum
2. ❌ Subscribers INSERT missing `email` column (NOT NULL constraint)

## Fix Applied
Created migration: `20251010_fix_signup_trigger_complete.sql`

---

## 📋 Steps to Apply Fix

### 1. Apply the migration

```bash
# Apply to development database
psql -h YOUR_DEV_HOST -d postgres -f supabase/migrations/20251010_fix_signup_trigger_complete.sql
```

**OR** paste the contents into Supabase SQL Editor and run.

---

### 2. Verify the trigger is fixed

```sql
-- Check the trigger function
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'ensure_trial_on_signup'
AND routine_schema = 'public';
```

Should show the updated function with:
- `'static'::product_kind` (with enum cast)
- `email` field in subscribers INSERT

---

### 3. Test signup

Try creating a new test account:
- Email: `test-signup-$(date +%s)@example.com`  
- Password: `TestPassword123!`

---

### 4. If signup succeeds, verify data

```sql
-- Replace with the email you just signed up with
SELECT 
  au.email,
  p.role,
  ue.product,
  ue.status,
  ue.trial_ends_at,
  s.email as subscriber_email
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN user_entitlements ue ON ue.user_id = au.id
LEFT JOIN subscribers s ON s.user_id = au.id
WHERE au.email = 'YOUR_TEST_EMAIL_HERE';
```

Expected result:
- ✅ Profile created with role='user'
- ✅ User_entitlements has 'static' with status='trialing'
- ✅ Subscribers has email filled in

---

## 🚨 If Still Failing

Check Supabase Postgres logs for the exact error:
1. Go to Supabase Dashboard
2. Database → Logs
3. Look for trigger errors during signup

Share the error and we'll debug further!

---

## ✅ Success Criteria

- [ ] New users can sign up without 500 error
- [ ] Profile is created
- [ ] 7-day trial is granted for 'static' product
- [ ] Subscribers table has email populated
- [ ] No errors in Postgres logs

