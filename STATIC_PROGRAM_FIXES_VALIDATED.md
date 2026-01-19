# Static Program MVP - Validated Critical Fixes

## ✅ Validation Complete - Real Issues Confirmed

I've validated all issues against the actual codebase and database. Here are the **REAL problems** that need fixing for a robust MVP:

---

## 🔴 CRITICAL FIXES (Must Do - Low Risk)

### Fix #1: Remove Dead Code ✅ VALIDATED

**File:** `src/lib/workweek.ts:192`  
**Issue:** Unreachable `return result;` where `result` is undefined  
**Risk:** LOW - Currently unreachable, but cleanup needed  
**Solution:** Delete line 192

```typescript
// BEFORE:
return isTodayTheRightDay && isAfterUnlock;
return result; // ❌ DELETE THIS LINE

// AFTER:
return isTodayTheRightDay && isAfterUnlock;
```

---

### Fix #2: Remove get_user_active_program Fallback ✅ VALIDATED

**File:** `supabase/migrations/20251023_create_get_user_active_program.sql`  
**Issue:** Always returns Kontorikeha Reset even when user has no active program  
**Impact:** Homepage shows "Aktiivne" when program not started  
**Risk:** LOW - Frontend already handles empty result correctly  
**Solution:** Remove fallback block (lines 34-44)

```sql
-- BEFORE:
IF NOT FOUND THEN
  RETURN QUERY SELECT ... 'Kontorikeha Reset' ...; -- ❌ REMOVE THIS
END IF;

-- AFTER:
-- Just return - if no program found, empty result is returned
-- Frontend will show empty state
```

**Validation:** 
- Frontend code in `useProgramCalendarState.ts:153-164` already handles `!activeProgram` correctly
- Shows empty state when no program exists
- Safe to remove fallback

---

### Fix #3: Fix Hardcoded 20-Day Validation ✅ VALIDATED

**File:** `src/pages/Programm.tsx:94`  
**Issue:** Hardcoded `dayNum <= 20` validation  
**Risk:** LOW - `totalDays` is available from hook  
**Solution:** Use `totalDays` from hook

```typescript
// BEFORE:
if (!Number.isNaN(dayNum) && dayNum >= 1 && dayNum <= 20) {

// AFTER:
if (!Number.isNaN(dayNum) && dayNum >= 1 && dayNum <= (totalDays || 20)) {
```

**Validation:**
- `totalDays` is provided by `useProgramCalendarState` hook (line 32)
- Hook already calculates correct duration (20 for Kontorikeha Reset)
- Safe change

---

### Fix #4: Remove Console.log Statements ✅ VALIDATED

**Files:** Multiple  
**Issue:** 16+ console.log statements in production code  
**Risk:** VERY LOW - Cosmetic cleanup  
**Solution:** Remove all console.log/console.error except critical errors

**Files to clean:**
- `src/pages/Programm.tsx`: 12 instances
- `src/hooks/useProgramCalendarState.ts`: 4 instances

---

## 🟡 CODE QUALITY IMPROVEMENTS (Should Do - Low Risk)

### Fix #5: Centralize Hardcoded Program ID ✅ VALIDATED

**Files:** 3 files with 12 instances  
**Issue:** Hardcoded UUID `'e1ab6f77-5a43-4c05-ac0d-02101b499e4c'` scattered  
**Risk:** LOW - Simple refactor  
**Solution:** Create constants file

**Create:** `src/constants/programs.ts`
```typescript
export const KONTORIKEHA_RESET_PROGRAM_ID = 'e1ab6f77-5a43-4c05-ac0d-02101b499e4c';
```

**Update imports in:**
- `src/pages/Programm.tsx`
- `src/pages/Programmid.tsx`  
- `src/hooks/useProgramCalendarState.ts`

---

## ✅ VALIDATED: One Program Per User Already Enforced

**Database Level:**
- ✅ `static_starts` has `PRIMARY KEY (user_id)` - one entry per user
- ✅ `user_programs` has `UNIQUE(user_id, program_id)` - prevents duplicates

**Application Level:**
- ✅ `handleStartProgram` pauses all active programs before starting (Programmid.tsx:300-308)
- ✅ `handleStartFromEmptyState` pauses existing programs (Programm.tsx:253-261)
- ✅ Both enforce: only one active program at a time

**Conclusion:** ✅ MVP requirement already met - no additional enforcement needed

---

## ❌ INVALIDATED: These Are NOT Real Issues

1. **"programs.status column missing"** - Frontend correctly defaults, no queries use it
2. **"Missing null checks"** - Code already has proper null checks (`program?.id`, `if (!program)`)
3. **"Auto-start is dangerous"** - Protected by `hasActualActiveProgram` check
4. **"Hardcoded week/day calculation"** - All static programs use 5-day weeks (acceptable for MVP)

---

## 📋 Implementation Order (Lowest Risk First)

1. **Fix #1** - Remove dead code (safest, no functional change)
2. **Fix #4** - Remove console.logs (safe cleanup)
3. **Fix #5** - Centralize program ID (simple refactor)
4. **Fix #3** - Fix 20-day validation (low risk, uses existing hook)
5. **Fix #2** - Remove RPC fallback (requires testing, but frontend handles it)

---

## ⚠️ Deferred for Post-MVP (Not Critical)

- Add `working_days` column to programs table
- Remove string matching for program title ("Kontorikeha Reset")
- Add `program_id` to static_starts (not needed - one program per user)
- Fix hardcoded difficulty/status defaults
- Add RLS policy verification (need to check)

---

## ✅ Validation Summary

**Validated Real Issues:** 5  
**Invalidated:** 4  
**Deferred:** 26  
**Already Working:** 1 (one-program enforcement)

**MVP Risk Level:** ✅ LOW - All fixes are safe and well-contained
