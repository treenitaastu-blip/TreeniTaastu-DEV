# Client Feedback Functionality - Issues & Fix Plan

## 🔴 ISSUES FOUND

### 1. **Missing Client Feedback Display on Admin Analytics**
**Current State:**
- `ClientSpecificAnalytics.tsx` shows `workoutFeedback` but only displays joint pain reports
- `ClientAnalytics.tsx` (single client detail page) doesn't show feedback at all
- No average RPE per workout visible
- Energy level feedback not displayed

**What Should Be Visible:**
- ✅ Average RPE per workout (from `exercise_notes.rpe`)
- ✅ Joint pain (liigesevalu) - from `workout_feedback.joint_pain`
- ✅ Energy level (kui energilisena end tundsid) - from `workout_feedback.energy`
- ✅ Per-workout feedback summary

**Tables/Sources:**
- `workout_feedback` table: `energy`, `joint_pain`, `notes`, `created_at`
- `exercise_notes` table: `rpe` (per exercise, need to average per session)
- `workout_sessions` table: `id`, `ended_at`, `client_program_id`

---

### 2. **"Avaleht" Button Redirects Wrong After Workout**
**Location:** `PersonalTrainingCompletionDialog.tsx`
**Current:** `handleGoHome()` → navigates to `/programs`
**Should:** Navigate to `/programs/stats` (analytics page)

**Impact:** After workout completion, clicking "Avaleht" should show analytics, not program list

---

### 3. **Typo: "Statistikad" Should Be "Statistika"**
**Location:** `PersonalTrainingCompletionDialog.tsx` line 64
**Current:** `Statistikad` (plural)
**Should:** `Statistika` (singular)

---

### 4. **Missing Journal (Märkmik) on Client Analytics Page**
**Current:**
- `ClientSpecificAnalytics.tsx` ✅ Has journal entries display
- `ClientAnalytics.tsx` ❌ Missing journal entries

**Should:** Show client's `training_journal` entries on `ClientAnalytics.tsx` page

**Table:** `training_journal` (id, title, content, mood, energy_level, motivation, created_at, user_id)

---

### 5. **Last Activity Not Shown (If Not Too Demanding)**
**Current:** Only shows `last_workout_date` (from `get_client_analytics` RPC)
**Available:** `workout_sessions.last_activity_at` field exists and is updated during workouts

**Consideration:** 
- `last_activity_at` is updated on every interaction during workout
- Shows actual last app usage, not just last completed workout
- Need to query `MAX(last_activity_at)` from `workout_sessions` where `user_id = X`
- Could be expensive if not indexed - check performance first

**Recommendation:** Add if query is fast enough (with proper index on `user_id, last_activity_at`)

---

## 🔧 FIX PLAN

### **Priority 1: Critical Functionality**

#### Fix 1.1: Show Client Feedback on Analytics Pages
**Files:**
- `treeni-taastu-app/src/pages/admin/ClientAnalytics.tsx`
- `treeni-taastu-app/src/pages/admin/ClientSpecificAnalytics.tsx` (enhance existing)

**Changes:**
1. Query `workout_feedback` table for selected client
2. Query average RPE per workout from `exercise_notes` (GROUP BY session_id)
3. Display feedback in new card section:
   - List of recent workouts with:
     - Date
     - Average RPE (from exercise_notes)
     - Energy level (low/normal/high)
     - Joint pain indicator (✓/✗)
     - Notes (if any)

**Query Pattern:**
```sql
-- Get workout feedback with session info
SELECT 
  wf.*,
  ws.started_at,
  ws.ended_at,
  ws.client_program_id
FROM workout_feedback wf
JOIN workout_sessions ws ON wf.session_id = ws.id
WHERE wf.user_id = $1
ORDER BY wf.created_at DESC
LIMIT 20;

-- Get average RPE per session
SELECT 
  session_id,
  AVG(rpe) as avg_rpe,
  COUNT(*) as exercises_with_rpe
FROM exercise_notes
WHERE session_id IN (SELECT id FROM workout_sessions WHERE user_id = $1)
  AND rpe IS NOT NULL
GROUP BY session_id;
```

---

#### Fix 1.2: Redirect "Avaleht" to Analytics
**File:** `treeni-taastu-app/src/components/workout/PersonalTrainingCompletionDialog.tsx`
**Change:** `handleGoHome()` - Change `/programs` → `/programs/stats`

---

#### Fix 1.3: Fix "Statistikad" → "Statistika"
**File:** `treeni-taastu-app/src/components/workout/PersonalTrainingCompletionDialog.tsx`
**Change:** Line 64 - Change text

---

#### Fix 1.4: Add Journal (Märkmik) to Client Analytics
**File:** `treeni-taastu-app/src/pages/admin/ClientAnalytics.tsx`
**Changes:**
1. Query `training_journal` table for `user_id = userId`
2. Add new card section (similar to `ClientSpecificAnalytics.tsx` line 387-421)
3. Display journal entries with title, content, mood/energy/motivation badges

---

### **Priority 2: Enhancement (Performance Dependent)**

#### Fix 2.1: Add Last Activity Tracking (If Performant)
**Files:**
- `treeni-taastu-app/src/pages/admin/ClientAnalytics.tsx`
- `treeni-taastu-app/src/pages/admin/ClientSpecificAnalytics.tsx`

**Implementation:**
1. Query: `SELECT MAX(last_activity_at) FROM workout_sessions WHERE user_id = $1`
2. Add to stats display as "Viimane aktiivsus" (Last Activity)
3. Only if query is fast (check with index on `workout_sessions(user_id, last_activity_at)`)

**Note:** If this slows down the analytics page load, skip it per user request.

---

## 📋 SIMILAR ISSUES FOUND

### A. **Inconsistent Feedback Display**
- Some pages show feedback, others don't
- Feedback structure varies (workout_feedback vs exercise_notes)
- **Recommendation:** Standardize feedback display component

### B. **Navigation Inconsistencies**
- Different completion dialogs have different navigation options
- "Avaleht" means different things in different contexts
- **Recommendation:** Standardize post-workout navigation

### C. **Missing RPC Function for Feedback Aggregation**
- Currently querying raw tables in frontend
- Could create `get_client_workout_feedback(user_id)` RPC for better performance
- **Recommendation:** Create optimized RPC if feedback queries are slow

### D. **ClientAnalytics vs ClientSpecificAnalytics Confusion**
- Two similar pages with overlapping but different features
- `ClientAnalytics` = single client detail (from `/admin/analytics/:userId`)
- `ClientSpecificAnalytics` = client selector page (`/admin/client-analytics`)
- **Note:** User mentioned consolidation earlier - this relates to that

---

## 🎯 IMPLEMENTATION ORDER

1. ✅ Fix 1.2 & 1.3 (Quick text/navigation fixes)
2. ✅ Fix 1.4 (Add journal to ClientAnalytics)
3. ✅ Fix 1.1 (Show feedback on analytics pages)
4. ⏸️ Fix 2.1 (Last activity - performance check first)

---

## 🔍 FILES TO MODIFY

### Primary Changes:
1. `src/components/workout/PersonalTrainingCompletionDialog.tsx` - Navigation + text fix
2. `src/pages/admin/ClientAnalytics.tsx` - Add feedback + journal display
3. `src/pages/admin/ClientSpecificAnalytics.tsx` - Enhance feedback display

### Potential New Files:
- `src/components/admin/WorkoutFeedbackCard.tsx` - Reusable feedback display component

### Database:
- Verify indexes on `workout_feedback(user_id, created_at)` and `workout_sessions(user_id, last_activity_at)`
- May need migration to add indexes if missing

---

## ⚠️ PERFORMANCE CONSIDERATIONS

1. **Feedback Queries:** Join `workout_feedback` + `workout_sessions` may be slow without indexes
2. **RPE Aggregation:** Calculating average RPE per session requires grouping - check query performance
3. **Last Activity:** MAX query on `workout_sessions` should be indexed on `(user_id, last_activity_at)`

**Testing:** Check query execution time in Supabase dashboard before implementing last activity feature.
