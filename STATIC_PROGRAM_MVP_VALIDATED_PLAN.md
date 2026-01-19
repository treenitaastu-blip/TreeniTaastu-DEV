# Static Program MVP - Validated Issues & Solution Plan

## ✅ Validated Critical Issues (Must Fix)

### 🔴 Issue #1: get_user_active_program Always Returns Fallback

**STATUS:** ✅ VALIDATED - REAL ISSUE  
**FILE:** `supabase/migrations/20251023_create_get_user_active_program.sql`  
**LINES:** 34-44

**Problem:**
- RPC function ALWAYS returns Kontorikeha Reset program as fallback
- Happens even when user has no active program
- Causes homepage to show "Aktiivne" badge when program not started

**Current Code:**
```sql
-- If no active client program found, return fallback for Kontorikeha Reset
IF NOT FOUND THEN
  RETURN QUERY SELECT ... 'Kontorikeha Reset'::text ...;
END IF;
```

**Solution:**
- Remove fallback completely
- Return empty result when no active program
- Frontend already handles `hasActiveProgram = false` correctly

**Risk Assessment:** 
- ✅ LOW RISK - Frontend code already checks `hasActualActiveProgram` before showing content
- ✅ Safe to remove - `useProgramCalendarState` handles null program correctly

---

### 🔴 Issue #2: Dead Code - Unreachable Return Statement

**STATUS:** ✅ VALIDATED - REAL ISSUE  
**FILE:** `src/lib/workweek.ts`  
**LINE:** 192

**Problem:**
- Line 190: `return isTodayTheRightDay && isAfterUnlock;` - already returns
- Line 192: `return result;` - unreachable, `result` variable never defined
- Could cause runtime error if code path changes

**Current Code:**
```typescript
const isTodayTheRightDay = dayNumber === weekdaysIncludingToday;
const isAfterUnlock = isAfterUnlockTime();
return isTodayTheRightDay && isAfterUnlock;

return result; // ❌ DEAD CODE - never reached, result undefined
```

**Solution:**
- Remove line 192 completely

**Risk Assessment:**
- ✅ LOW RISK - Currently unreachable, just cleanup
- ✅ Safe to remove

---

### 🔴 Issue #3: Hardcoded 20-Day Validation

**STATUS:** ✅ VALIDATED - REAL ISSUE  
**FILE:** `src/pages/Programm.tsx`  
**LINE:** 94

**Problem:**
- Hardcoded `if (dayNum >= 1 && dayNum <= 20)` 
- Will break if program has different duration

**Current Code:**
```typescript
if (!Number.isNaN(dayNum) && dayNum >= 1 && dayNum <= 20) {
  loadProgramDayByNumber(dayNum);
}
```

**Solution:**
- Use `totalDays` from `useProgramCalendarState` hook
- Change to: `if (dayNum >= 1 && dayNum <= totalDays)`

**Risk Assessment:**
- ✅ LOW RISK - `totalDays` is available from hook
- ✅ Safe - hook already provides correct value

---

### 🟡 Issue #4: Hardcoded Program ID (12 instances)

**STATUS:** ✅ VALIDATED - REAL ISSUE (Acceptable for MVP with centralization)  
**LOCATIONS:**
- `src/pages/Programm.tsx`: 3 instances
- `src/pages/Programmid.tsx`: 2 instances  
- `src/hooks/useProgramCalendarState.ts`: 7 instances

**Problem:**
- Hardcoded UUID `'e1ab6f77-5a43-4c05-ac0d-02101b499e4c'` scattered throughout
- Makes code maintenance harder

**Solution:**
- Create constants file: `src/constants/programs.ts`
- Export `KONTORIKEHA_RESET_PROGRAM_ID` constant
- Import and use everywhere
- For MVP: Keep hardcoded but centralized

**Risk Assessment:**
- ✅ LOW RISK - Simple refactor
- ✅ Maintains functionality, improves maintainability

---

### 🟡 Issue #5: Hardcoded Duration Calculation

**STATUS:** ✅ VALIDATED - REAL ISSUE (Acceptable for MVP)  
**LOCATIONS:**
- `src/pages/Programmid.tsx:81` - String matching "Kontorikeha Reset"
- `src/hooks/useProgramCalendarState.ts:249, 286` - Hardcoded 20 days

**Problem:**
- Uses string matching `if (p.title === 'Kontorikeha Reset')` instead of ID
- Hardcoded `days = 20` in multiple places

**Current State:**
- Database has `duration_weeks = 4` for Kontorikeha Reset
- Frontend converts: `weeks × 7 = 28 days` (calendar days)
- But program is actually 20 working days (4 weeks × 5 days)

**Solution Options:**
1. **MVP Approach:** Accept string matching for now, add `working_days` column later
2. **Better Approach:** Add `working_days` column to programs table
3. **Alternative:** Calculate as `duration_weeks × 5` for static programs

**Recommendation for MVP:**
- Keep string matching for Kontorikeha Reset
- Document that this is MVP limitation
- Add proper column after MVP

**Risk Assessment:**
- ✅ LOW RISK - Works for current program
- ✅ Acceptable for MVP - only one static program exists

---

### 🟡 Issue #6: Auto-Start Logic

**STATUS:** ✅ VALIDATED - PARTIALLY PROTECTED  
**FILE:** `src/hooks/useProgramCalendarState.ts`  
**LINES:** 182-198

**Current Protection:**
```typescript
// Only auto-create static_starts if user has active program but missing start date
if (!staticStart?.start_monday && hasActualActiveProgram) {
  // Auto-create logic
}
```

**Assessment:**
- ✅ PROTECTED - Only runs if `hasActualActiveProgram === true`
- ✅ Safe - Won't auto-create when just browsing

**Solution:**
- Keep as-is for MVP
- Add comment explaining protection
- Consider explicit user action requirement later

**Risk Assessment:**
- ✅ LOW RISK - Protected by check
- ✅ Acceptable for MVP

---

### 🟡 Issue #7: Console.log Statements

**STATUS:** ✅ VALIDATED - REAL ISSUE (Cosmetic)  
**COUNT:** 16+ instances across multiple files

**Solution:**
- Remove all console.log/console.error statements
- Keep only critical error logging

**Risk Assessment:**
- ✅ VERY LOW RISK - Cosmetic only
- ✅ Safe to remove

---

## ❌ Invalidated Issues (Not Real Problems)

### programs.status Column Missing
**STATUS:** ❌ NOT AN ISSUE
- Frontend correctly defaults to 'available'
- No queries reference `program.status` from database
- Acceptable for MVP

---

## 🔒 One Program Per User - Current Enforcement

**VALIDATED:** ✅ ALREADY ENFORCED

**Database Level:**
- `user_programs` table has `UNIQUE(user_id, program_id)` constraint
- `static_starts` table appears to have unique constraint on `user_id` (one entry per user)

**Application Level:**
- `handleStartProgram` pauses all active programs before starting new one (line 300-308 in Programmid.tsx)
- `handleStartFromEmptyState` pauses existing programs (line 253-261 in Programm.tsx)
- Both enforce one active program at a time

**Assessment:**
- ✅ ENFORCEMENT EXISTS - Both database and application level
- ✅ MVP REQUIREMENT MET - One static program per user works correctly

---

## 📋 MVP Solution Plan (Prioritized)

### Phase 1: Critical Fixes (Do First - Low Risk)

1. ✅ **Remove dead code** - Delete unreachable return in workweek.ts:192
2. ✅ **Fix get_user_active_program fallback** - Remove always-returning fallback
3. ✅ **Fix hardcoded 20-day validation** - Use totalDays from hook
4. ✅ **Remove console.log statements** - Clean production code

### Phase 2: Code Quality (Keep Simple - Low Risk)

5. ✅ **Centralize hardcoded program ID** - Create constants file
6. ✅ **Add protection comments** - Document auto-start logic safety

### Phase 3: Validation (After Fixes)

7. ✅ **Test complete flow** - Start → Complete → Switch
8. ✅ **Verify one-program enforcement** - Confirm only one active
9. ✅ **Test edge cases** - No program, paused program, switching

---

## ⚠️ Items Deferred for Post-MVP

- Add `working_days` column to programs table
- Remove string matching for program identification  
- Add `program_id` to static_starts (not needed for MVP - one program per user)
- Fix hardcoded week/day calculation (assumes 5 days, acceptable for MVP)
- Add difficulty/status columns to programs table

---

## ✅ Validation Summary

**Total Items in Original List:** 35  
**Validated as Real Issues:** 7  
**Invalidated/Not Issues:** 1  
**Deferred for Post-MVP:** 27

**MVP Focus:** Fix the 4 critical issues (dead code, fallback, validation, console.logs) + 2 code quality improvements

**Risk Level:** LOW - All fixes are safe, well-contained, and improve robustness without changing core logic
