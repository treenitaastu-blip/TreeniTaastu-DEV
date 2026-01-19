# Static Program System - Issue Validation & MVP Solution Plan

## ✅ Validated Critical Issues (Must Fix for MVP)

### 🔴 CRITICAL: get_user_active_program Always Returns Fallback

**VALIDATED:** ✅ REAL ISSUE
- **Location:** `supabase/migrations/20251023_create_get_user_active_program.sql:34-44`
- **Problem:** Function ALWAYS returns Kontorikeha Reset fallback even when user has no active program
- **Impact:** Homepage shows "Aktiivne" badge when user hasn't started program yet
- **Validation:** Checked database - function has `IF NOT FOUND THEN` block that always executes fallback
- **Solution:** Remove fallback, return empty result if no active program exists
- **Risk:** LOW - Frontend already handles `hasActiveProgram = false` case

---

### 🔴 CRITICAL: Dead Code Causing Potential Runtime Error

**VALIDATED:** ✅ REAL ISSUE
- **Location:** `src/lib/workweek.ts:192`
- **Problem:** `return result;` where `result` is never defined - code after line 190 return is unreachable
- **Impact:** May cause runtime error if code path changes
- **Validation:** Confirmed - line 190 returns, line 192 tries to return undefined variable
- **Solution:** Remove line 192
- **Risk:** LOW - Currently unreachable but cleanup needed

---

### 🔴 CRITICAL: Hardcoded 20-Day Limit

**VALIDATED:** ✅ REAL ISSUE  
- **Location:** `src/pages/Programm.tsx:94`
- **Problem:** `if (dayNum >= 1 && dayNum <= 20)` - hardcoded for Kontorikeha Reset only
- **Impact:** Will break if program has different duration
- **Validation:** Confirmed in code - uses hardcoded 20 instead of `program.duration_days`
- **Solution:** Use `program?.duration_days || totalDays` from hook
- **Risk:** MEDIUM - Currently works but will break with other programs

---

### 🟡 HIGH: static_starts Missing program_id

**VALIDATED:** ✅ REAL ISSUE (But acceptable for MVP)
- **Location:** Database schema - `static_starts` table
- **Problem:** Table only has `user_id`, `start_monday`, `created_at` - no `program_id`
- **Impact:** Can only support ONE static program per user (MVP requirement met)
- **Validation:** Database query confirmed - no program_id column
- **Solution:** FOR MVP - Accept limitation. One static program per user is requirement.
- **Risk:** LOW - Matches MVP requirement

---

### 🟡 HIGH: Hardcoded Program ID Checks

**VALIDATED:** ✅ REAL ISSUE
- **Locations:** 
  - `src/pages/Programm.tsx:18, 155, 280`
  - `src/pages/Programmid.tsx:293, 329`
  - `src/hooks/useProgramCalendarState.ts:14, 170, 212, 249, 261, 286`
- **Problem:** Hardcoded UUID `'e1ab6f77-5a43-4c05-ac0d-02101b499e4c'` scattered throughout
- **Impact:** Adding new static programs requires code changes in many places
- **Validation:** Found 12 instances across 3 files
- **Solution:** Create constant file or detect program type from database
- **Risk:** MEDIUM - Works now but not maintainable

---

### 🟡 HIGH: Auto-Start Logic Issue

**VALIDATED:** ✅ REAL ISSUE (But partially protected)
- **Location:** `src/hooks/useProgramCalendarState.ts:182-198`
- **Problem:** Auto-creates `static_starts` when user has active program but missing start date
- **Current Protection:** Only runs if `hasActualActiveProgram === true` (line 182)
- **Impact:** Could create start date unintentionally if logic changes
- **Validation:** Code checks `hasActualActiveProgram` first, so protected
- **Solution:** Keep for now, add comment explaining it's safe
- **Risk:** LOW - Currently protected by check

---

### 🟡 HIGH: Hardcoded Duration Calculation

**VALIDATED:** ✅ REAL ISSUE
- **Location:** `src/pages/Programmid.tsx:81` and `src/hooks/useProgramCalendarState.ts:249, 286`
- **Problem:** Hardcoded `days = 20` for "Kontorikeha Reset" title match
- **Impact:** Works but fragile - breaks if title changes or program renamed
- **Validation:** Confirmed - uses string matching instead of ID or database field
- **Solution:** Add `working_days` column to programs table OR calculate from duration_weeks × 5
- **Risk:** MEDIUM - Works but not robust

---

## ⚠️ Medium Priority Issues (Fix After MVP)

### 🟡 MEDIUM: Hardcoded Difficulty/Status Defaults

**VALIDATED:** ✅ REAL ISSUE
- **Location:** `src/pages/Programmid.tsx:93-94`
- **Problem:** Always defaults to `difficulty: 'alustaja'`, `status: 'available'`
- **Impact:** All programs show as "Alustaja" level and "Available" regardless of actual values
- **Validation:** Database has no `difficulty` or `status` columns in `programs` table
- **Solution:** Either add columns to database OR accept defaults for MVP
- **Risk:** LOW - UI works, just shows incorrect metadata

---

### 🟡 MEDIUM: Hardcoded Week/Day Calculation

**VALIDATED:** ✅ REAL ISSUE
- **Location:** `src/pages/Programm.tsx:58-59`
- **Problem:** `Math.ceil(dayNum / 5)` assumes 5 working days per week
- **Impact:** Only works for programs with 5-day weeks
- **Validation:** Confirmed - hardcoded division by 5
- **Solution:** Accept for MVP (all static programs use 5-day weeks currently)
- **Risk:** LOW - All current programs use 5-day structure

---

### 🟡 MEDIUM: Console.log Statements in Production

**VALIDATED:** ✅ REAL ISSUE (Cosmetic)
- **Locations:** Multiple files (Programm.tsx, useProgramCalendarState.ts, etc.)
- **Problem:** 16+ console.log statements left in production code
- **Impact:** Clutters browser console, potential performance impact
- **Validation:** Found 16 instances via grep
- **Solution:** Remove all console.log statements
- **Risk:** VERY LOW - Cosmetic only

---

## ❌ Invalidated Issues (Not Real or Acceptable for MVP)

### programs.status Column Missing

**VALIDATED:** ❌ NOT AN ISSUE - Schema correct
- **Check:** Database query shows `programs` table has no `status` column
- **Finding:** Frontend correctly defaults to 'available', doesn't query status
- **Verdict:** Acceptable for MVP - all programs are available by default

---

### Missing RLS Policies

**VALIDATED:** ⚠️ NEEDS VERIFICATION (Not critical for MVP)
- **Check:** Need to verify RLS policies exist
- **Recommendation:** Verify but not blocking for MVP

---

## 📋 MVP-Focused Solution Plan

### Phase 1: Critical Fixes (Do First)

1. **Fix get_user_active_program fallback** - Remove always-returning fallback
2. **Fix dead code** - Remove unreachable return statement
3. **Fix hardcoded 20-day limit** - Use program.duration_days
4. **Remove console.log** - Clean up production code

### Phase 2: Robustness (Keep Simple)

5. **Centralize hardcoded program ID** - Create constants file (keep hardcoded for MVP, just centralize)
6. **Fix hardcoded duration** - Use database or accept string matching for MVP
7. **Validate solution** - Test each fix doesn't break existing flow

### Phase 3: MVP Validation

8. **Test complete user flow** - Start program → Complete days → Switch program
9. **Verify one program limitation** - Ensure only one static program active at a time
10. **Confirm auto-start protection** - Verify it only triggers when appropriate

---

## 🔍 Validation Summary

**Total Issues Identified:** 35
**Critical Issues (Must Fix):** 3
**High Priority (Should Fix):** 4  
**Medium Priority (Can Fix Later):** 3
**Invalidated:** 1
**Needs Verification:** 1

**MVP Focus:** Fix the 3 critical issues + high priority items that affect functionality
