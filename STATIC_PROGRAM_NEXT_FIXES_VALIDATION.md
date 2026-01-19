# Static Program - Next Fixes Validation

## Validating Remaining To-Do Items

### 🔍 Validation Methodology
- Check actual code implementation
- Verify database schema and constraints
- Assess impact on MVP (one program per user)
- Determine if fix is needed now or can be deferred

---

## ✅ VALIDATED: Items That Are NOT Issues (Defer or Cancel)

### static-8: Add program_id to static_starts
**STATUS:** ✅ VALIDATED - NOT NEEDED FOR MVP

**Finding:**
- `static_starts` has `PRIMARY KEY (user_id)` - enforces one entry per user
- MVP requirement: one static program per user (already enforced)
- Adding `program_id` would only be needed for multi-program support (post-MVP)

**Verdict:** ❌ DEFER - Not needed for MVP. One program per user works correctly.

---

### static-9: Fix hardcoded week/day calculation
**STATUS:** ✅ VALIDATED - ACCEPTABLE FOR MVP

**Finding:**
- Code uses `Math.ceil(dayNum / 5)` assuming 5 working days per week
- Found in: `Programm.tsx:55`, `ProgrammAdaptive.tsx:49`
- All current static programs use 5-day week structure (Mon-Fri)
- No other program types exist yet

**Verdict:** ✅ ACCEPTABLE - Works for all current programs. Only fix when adding programs with different structures.

---

### static-10: Update start_static_program RPC to accept program_id
**STATUS:** ✅ VALIDATED - NOT NEEDED FOR MVP

**Finding:**
- RPC function: `start_static_program(p_force boolean DEFAULT false)` - no program_id parameter
- Called from: `Programm.tsx`, `Programmid.tsx`, `useProgramCalendarState.ts`
- All calls check `if (programId === KONTORIKEHA_RESET_PROGRAM_ID)` before calling
- Since MVP supports only one program per user, `static_starts` doesn't need program_id

**Verdict:** ❌ DEFER - Not needed for MVP. Only required for multi-program support.

---

### static-11: Fix auto-start logic
**STATUS:** ✅ VALIDATED - ALREADY PROTECTED

**Finding:**
- Code in `useProgramCalendarState.ts:180` checks `hasActualActiveProgram` before auto-creating
- Only auto-creates if user has active program in `user_programs` but missing `static_starts`
- This is safe behavior - it's restoring missing start date for existing active program

**Verdict:** ✅ SAFE - Already properly protected. No fix needed.

---

## ⚠️ VALIDATED: Real Issues That Need Fixing

### static-16: Fix program switching logic - hardcoded program ID checks
**STATUS:** ✅ VALIDATED - REAL ISSUE (Low Priority)

**Location:** `Programmid.tsx:293, 329`
**Current Code:**
```typescript
if (actualProgramId === KONTORIKEHA_RESET_PROGRAM_ID) {
  await supabase.rpc('start_static_program', { p_force: false });
}
```

**Issue:**
- Hardcoded check for Kontorikeha Reset only
- If other static programs are added, they won't get `static_starts` created

**Impact:**
- LOW for MVP (only one program exists)
- Will break when adding second static program

**Solution:**
- Option 1: Keep as-is for MVP (only one static program exists)
- Option 2: Create helper function `isStaticProgram(programId)` that checks program type

**Risk:** LOW - Works for MVP, only affects future multi-program support

**Verdict:** ⚠️ DEFER - Low priority for MVP, fix when adding second static program

---

### static-24: Remove hardcoded string matching for program title
**STATUS:** ✅ VALIDATED - REAL ISSUE (Already Partially Fixed)

**Location:** `Programmid.tsx:81`, `useProgramCalendarState.ts:249, 286`

**Current State:**
- We already centralized the program ID (Fix #5)
- But duration calculation still uses string matching: `if (p.title === 'Kontorikeha Reset')`

**Issue:**
- String matching is fragile - breaks if title changes or translated

**Impact:**
- MEDIUM - Works but fragile

**Solution:**
- Replace string matching with ID comparison: `if (p.id === KONTORIKEHA_RESET_PROGRAM_ID)`

**Risk:** LOW - Simple change, uses existing constant

**Verdict:** ✅ FIX - Should be done now since we have the constant

---

### static-12: Error handling for programday queries
**STATUS:** ✅ VALIDATED - REAL ISSUE (Needs Improvement)

**Location:** `Programm.tsx:60-70`

**Current Code:**
```typescript
const { data, error } = await supabase
  .from('programday')
  .select('*')
  .eq('program_id', program.id)
  .eq('week', week)
  .eq('day', day)
  .single();

if (error) {
  console.error('programday load error', error);
  toast({ 
    title: 'Viga', 
    description: 'Päeva andmed ei leitud',
    variant: 'destructive' 
  });
}
```

**Issue:**
- Generic error message doesn't help user understand what went wrong
- No retry mechanism
- Error could be: programday doesn't exist, network error, permission error, etc.

**Impact:**
- MEDIUM - User experience could be better

**Solution:**
- Check if error is "not found" vs "network error"
- Show more specific error messages
- Add retry button

**Risk:** LOW - Improves UX without breaking functionality

**Verdict:** ⚠️ IMPROVE - Good to fix but not critical for MVP

---

### static-15: Timezone handling inconsistencies
**STATUS:** ⚠️ NEEDS INVESTIGATION

**Issue:**
- Some queries use `CURRENT_DATE` which may be UTC
- Frontend uses `Europe/Tallinn` timezone in some places
- Need to verify consistency

**Finding:**
- `start_static_program` RPC uses `CURRENT_DATE` (line 26)
- Frontend uses `getTallinnDate()` function from `workweek.ts`
- Unlock logic uses Tallinn timezone

**Impact:**
- POTENTIAL HIGH - If server timezone is UTC, dates could be off by a day

**Needs:**
- Verify what timezone PostgreSQL uses
- Check if `CURRENT_DATE` matches Tallinn timezone expectations

**Verdict:** ⚠️ INVESTIGATE - Need to verify if this is actually a problem

---

### static-27: Navigation timing issues with setTimeout
**STATUS:** ✅ VALIDATED - REAL ISSUE (Acceptable Pattern)

**Location:** Multiple files use `setTimeout(() => navigate(...), 100)`

**Finding:**
- Used in `Programm.tsx:277`, `Programmid.tsx:341`
- Pattern: Wait 100ms before navigation to allow state updates

**Issue:**
- Race condition: state might not be updated when navigation happens
- Using setTimeout is a workaround, not proper React pattern

**Impact:**
- LOW - Works in practice, but not ideal

**Solution:**
- Use `useEffect` with dependency on state change
- Or use React Router's `useNavigate` with state parameter

**Risk:** MEDIUM - Current pattern works, changing could introduce bugs

**Verdict:** ⚠️ IMPROVE - Good to fix but not critical

---

## ❓ NEEDS DEEPER INVESTIGATION

### static-13: Race condition in day completion
**Status:** ⚠️ NEEDS TESTING

**Location:** `Programm.tsx:143` - `completingDay` state check

**Current Protection:**
```typescript
if (completingDay !== null) {
  return false; // Already completing, ignore duplicate click
}
```

**Issue:**
- State check happens before async operation
- Rapid double-clicks could both pass the check before either sets state

**Impact:**
- POTENTIAL MEDIUM - Could allow duplicate completions

**Solution Options:**
- Use database constraint (unique on user_id, programday_id, completed_at date)
- Use optimistic locking
- Disable button immediately on click

**Verdict:** ⚠️ TEST - Need to verify if this actually happens in practice

---

### static-34: Database indexes
**Status:** ⚠️ NEEDS VERIFICATION

**Current State:**
- Need to check if indexes exist on `programday(program_id, week, day)`

**Impact:**
- LOW for small datasets
- MEDIUM-HIGH for larger datasets (performance)

**Verdict:** ⚠️ VERIFY - Check if indexes exist, add if missing

---

### static-35: RLS policies
**Status:** ⚠️ NEEDS VERIFICATION

**Issue:**
- Need to verify Row Level Security policies exist for static program tables
- Critical for data isolation between users

**Impact:**
- HIGH if missing - security issue

**Verdict:** ⚠️ VERIFY - Critical to check

---

## 📋 Validation Summary

**Total Remaining Items:** 27
**Validated as NOT Issues (Defer):** 4
**Validated as Real Issues (Fix Now):** 1 (static-24)
**Validated as Improvements (Nice to Have):** 3
**Need Investigation:** 3
**Need Verification:** 2

### Recommended Priority Order:

**FIX NOW (Low Risk, Easy Win):**
1. static-24: Remove string matching, use program ID constant

**IMPROVE (Better UX, Low Risk):**
2. static-12: Better error handling for programday queries
3. static-27: Fix navigation timing (if issues observed)

**INVESTIGATE (Verify if Real Problem):**
4. static-15: Timezone consistency
5. static-13: Race condition testing
6. static-34: Database indexes
7. static-35: RLS policies

**DEFER (Post-MVP):**
- static-8, static-9, static-10: All related to multi-program support
