# Static Program User Flow - Comprehensive Audit

## 🔍 User Journey Analysis (Long-term Usage)

### **Flow 1: New User - First Time Using Static Programs**

```
1. User logs in → /home
   ↓
2. Homepage loads → calls useProgramCalendarState()
   ↓
3. get_user_active_program RPC:
   - Checks user_programs (none)
   - Checks client_programs (none)
   - Returns fallback: Kontorikeha Reset from programs table (status='available')
   ↓
4. useProgramCalendarState sets hasActiveProgram = true (because program exists)
   ↓
5. Homepage shows: "Aktiivne" badge + progress (0/20 days)
   ❌ PROBLEM: User hasn't started program yet, but it shows as active!
   ↓
6. User clicks "Jätka programm" → /programm
   ↓
7. Programm page loads → shows calendar
   ❌ PROBLEM: Calendar shows but no static_starts entry exists
   ❌ PROBLEM: Days might unlock incorrectly because start date is auto-calculated
   ↓
8. User realizes they need to actually START the program
   ↓
9. User goes to /programmid → clicks "Alusta programm"
   ↓
10. handleStartProgram creates user_programs entry
    ↓
11. Calls start_static_program RPC → creates static_starts entry
    ↓
12. Navigates to /programm
```

### **Flow 2: Returning User - Has Active Program**

```
1. User logs in → /home
   ↓
2. Homepage shows active program preview
   ✅ OK: Shows correct progress
   ↓
3. User clicks "Jätka programm" → /programm
   ↓
4. Programm page shows calendar with unlocked days
   ✅ OK: Works correctly
```

### **Flow 3: User Switches Programs**

```
1. User is on /programm with active program
   ↓
2. User clicks "Vaheta programmi"
   ↓
3. Confirmation dialog appears
   ✅ OK: Good UX
   ↓
4. User confirms → current program paused in user_programs
   ↓
5. Redirects to /programmid
   ✅ OK: Works
   ↓
6. User selects new program → starts it
   ↓
7. Navigates to /programm
   ✅ OK: New program active
```

### **Flow 4: User Resumes Paused Program**

```
1. User on /programmid sees paused program
   ↓
2. Clicks "Jätka programm"
   ↓
3. handleStartProgram resumes program
   ✅ OK: Status changes from paused to active
   ↓
4. Navigates to /programm
   ✅ OK: Calendar loads correctly
```

---

## 🐛 Critical Issues Found

### **Issue 1: False "Active" Status on Homepage (CRITICAL)**
**Location:** `useProgramCalendarState.ts` + `get_user_active_program` RPC

**Problem:**
- `get_user_active_program` RPC ALWAYS returns a program (fallback Kontorikeha Reset)
- Even when user hasn't started any program, it returns `status='available'`
- `useProgramCalendarState` sets `hasActiveProgram = true` if program exists
- Homepage shows program as "Aktiivne" when user hasn't actually started it

**Impact:** 
- User confusion: "Why does it say I have an active program when I haven't started?"
- Progress shows 0/20 but badge says "Aktiivne" - misleading
- User might think they're already enrolled

**Root Cause:**
```typescript
// useProgramCalendarState.ts line 159-169
const activeProgram = await getActiveProgram();

if (!activeProgram) {
  setState(prev => ({ 
    ...prev, 
    loading: false, 
    hasActiveProgram: false,  // ✅ Only false if null
    error: 'No active program found'
  }));
  return;
}
// ❌ PROBLEM: activeProgram always exists (fallback), so hasActiveProgram always true
```

**Fix Required:**
- Check program `status` field - should only be "active" if user has `user_programs` entry with `status='active'`
- OR: Check if `user_programs` entry exists before setting `hasActiveProgram = true`
- The RPC fallback should return `status='available'` (not active) to differentiate

---

### **Issue 2: Program Status Logic Mismatch (CRITICAL)**
**Location:** `useProgramCalendarState.ts` + RPC return value

**Problem:**
- RPC returns program with `status='available'` for fallback
- But `useProgramCalendarState` doesn't check status - only checks if program exists
- `hasActiveProgram` should be based on actual `user_programs.status='active'`, not program existence

**Impact:**
- Homepage always shows program preview for new users
- Empty state never appears on homepage (even when it should)

**Root Cause:**
```typescript
// Current logic assumes program existence = active program
// Should check: user_programs.status === 'active'
```

---

### **Issue 3: Auto-start Logic Runs When It Shouldn't (MEDIUM)**
**Location:** `useProgramCalendarState.ts` lines 175-208

**Problem:**
- If user visits `/programm` page without starting program:
  - `get_user_active_program` returns fallback
  - Code checks `if (activeProgram.id === KONTORIKEHA_RESET_PROGRAM_ID)`
  - Auto-creates `static_starts` entry
  - This happens even if user hasn't explicitly started the program!

**Impact:**
- Start date gets set automatically when user just browses
- User might not realize program has "started"
- Could cause confusion about day unlock dates

**Fix Required:**
- Only auto-create `static_starts` if `user_programs.status='active'` exists
- OR: Don't auto-create - require explicit program start action

---

### **Issue 4: Empty State Program Cards Don't Start Program (LOW)**
**Location:** `Programm.tsx` lines 344-349

**Problem:**
- Empty state shows program cards
- Clicking "Vaata üksikasju" goes to `/programmid`
- User has to click again to start
- Extra step - could be streamlined

**Fix Required:**
- Could add "Alusta kohe" button directly on empty state cards
- OR: Keep current flow but make it clearer

---

### **Issue 5: Program ID Mismatch - Fallback Uses String ID (CRITICAL)**
**Location:** `useProgramCalendarState.ts` lines 59, 82

**Problem:**
- Fallback program has `id: 'kontorikeha-reset-fallback'` (string)
- Real program has UUID: `'e1ab6f77-5a43-4c05-ac0d-02101b499e4c'`
- When checking `activeProgram.id === KONTORIKEHA_RESET_PROGRAM_ID`, the comparison fails
- Code path for Kontorikeha Reset logic doesn't execute correctly

**Impact:**
- `static_starts` might not be checked/created
- Completion data might not load
- Program-specific logic fails

**Root Cause:**
```typescript
// Line 59, 82: Fallback returns string ID
id: 'kontorikeha-reset-fallback'

// Line 175: Checks UUID
if (activeProgram.id === KONTORIKEHA_RESET_PROGRAM_ID) {
  // ❌ Never executes for fallback program!
}
```

---

### **Issue 6: Homepage Program Loading State (MEDIUM)**
**Location:** `Home.tsx` line 255

**Problem:**
- Uses `programLoading` from hook, but also checks `hasActiveProgram`
- If `programLoading` is false but `hasActiveProgram` is incorrectly true, shows wrong state
- Race condition possible

**Fix Required:**
- Ensure loading state is properly handled
- Check actual program status, not just existence

---

### **Issue 7: Program Status Check in useProgramCalendarState (CRITICAL)**
**Location:** `useProgramCalendarState.ts` lines 70-73

**Problem:**
- Filters RPC results by title matching: `program.title === 'Kontorikeha Reset'`
- This is brittle and won't work for multiple programs
- RPC should only return active programs from `user_programs`, but fallback breaks this

**Impact:**
- Doesn't properly distinguish between "available" and "active" programs
- Hardcoded title matching breaks multi-program support

---

### **Issue 8: Missing Status Check When Determining hasActiveProgram (CRITICAL)**
**Location:** `useProgramCalendarState.ts` line 292

**Problem:**
- Sets `hasActiveProgram: true` unconditionally if program exists
- Should check if program status is 'active' (from user_programs)

**Current Code:**
```typescript
setState(prev => ({
  ...prev,
  program: activeProgram,
  days: updatedDays,
  totalDays: activeProgram.duration_days,
  completedDays,
  loading: false,
  hasActiveProgram: true,  // ❌ Always true if program exists
  error: null
}));
```

**Should Be:**
```typescript
// Check actual status from user_programs or program.status
const isActuallyActive = activeProgram.status === 'active' && /* user_programs check */;

setState(prev => ({
  ...prev,
  program: activeProgram,
  days: updatedDays,
  totalDays: activeProgram.duration_days,
  completedDays,
  loading: false,
  hasActiveProgram: isActuallyActive,  // ✅ Based on actual status
  error: null
}));
```

---

### **Issue 9: RPC Always Returns Program (ARCHITECTURAL)**
**Location:** Database function `get_user_active_program`

**Problem:**
- RPC has fallback that always returns Kontorikeha Reset
- This means the function NEVER returns null/empty
- Makes it impossible to distinguish "no program" from "has program"

**Impact:**
- Can't properly show empty states
- Always assumes user wants Kontorikeha Reset
- Doesn't support multi-program properly

**Fix Required:**
- RPC should return NULL/empty if no `user_programs.status='active'` entry
- Frontend should handle null gracefully
- Homepage should show selection prompt when null

---

### **Issue 10: Programs Table Duration Mismatch (MEDIUM)**
**Location:** `programs` table vs usage

**Problem:**
- `programs` table has `duration_weeks` column
- But code expects `duration_days` 
- RPC converts: `duration_weeks * 7` but only if column exists
- Might cause issues if column doesn't exist or is null

---

## 📋 Prioritized To-Do List

### **Phase 1: Fix Critical Flow Issues (MUST FIX FIRST)**

#### **TODO 1.1: Fix hasActiveProgram Logic** 🔴 CRITICAL
**Priority:** Highest - breaks entire flow

**Problem:** `hasActiveProgram` is always true because RPC always returns program

**Solution:**
1. Check `user_programs.status='active'` before setting `hasActiveProgram = true`
2. Query `user_programs` table directly in `useProgramCalendarState`
3. Only set `hasActiveProgram = true` if user has active entry

**Files to modify:**
- `src/hooks/useProgramCalendarState.ts` - Add check for actual user_programs entry
- Potentially update RPC to return null when no active program

**Implementation:**
```typescript
// In loadProgramData:
// 1. Get active program from RPC
const activeProgram = await getActiveProgram();

// 2. Check if user actually has active user_programs entry
const { data: userProgram } = await supabase
  .from('user_programs')
  .select('status')
  .eq('user_id', user.id)
  .eq('program_id', activeProgram?.id)
  .eq('status', 'active')
  .maybeSingle();

// 3. Only set hasActiveProgram if actual entry exists
const isActuallyActive = !!userProgram && userProgram.status === 'active';
```

---

#### **TODO 1.2: Fix Program ID Fallback** 🔴 CRITICAL
**Priority:** Critical - breaks program-specific logic

**Problem:** Fallback uses string ID instead of UUID, breaks ID comparisons

**Solution:**
1. Remove fallback with string ID
2. Get actual program UUID from `programs` table in fallback
3. Or: Return null and handle gracefully in frontend

**Files to modify:**
- `src/hooks/useProgramCalendarState.ts` - Fix fallback to use real UUID
- Or update RPC to return actual UUID

**Implementation:**
```typescript
// Instead of hardcoded fallback, query programs table:
const { data: fallbackProgram } = await supabase
  .from('programs')
  .select('id, title, description, duration_weeks')
  .eq('title', 'Kontorikeha Reset')
  .single();

if (fallbackProgram) {
  return {
    id: fallbackProgram.id,  // ✅ Real UUID
    title: fallbackProgram.title,
    // ... other fields
  };
}
```

---

#### **TODO 1.3: Fix RPC to Return Null for No Active Program** 🔴 CRITICAL
**Priority:** Critical - enables proper empty states

**Problem:** RPC always returns program (fallback), can't distinguish "no program"

**Solution:**
1. Remove fallback from RPC
2. Return empty result if no active program found
3. Frontend handles null/empty result gracefully

**Files to modify:**
- Database migration: Update `get_user_active_program` function
- `src/hooks/useProgramCalendarState.ts` - Handle null result

**Implementation:**
```sql
-- Update RPC to NOT return fallback
CREATE OR REPLACE FUNCTION get_user_active_program(p_user_id UUID)
RETURNS TABLE (...) AS $$
BEGIN
  -- Check user_programs for static programs
  RETURN QUERY SELECT ... WHERE status = 'active' LIMIT 1;
  IF FOUND THEN RETURN; END IF;
  
  -- Check client_programs for PT
  RETURN QUERY SELECT ... WHERE status = 'active' LIMIT 1;
  IF FOUND THEN RETURN; END IF;
  
  -- ❌ NO FALLBACK - return empty result
  -- Frontend will handle this and show empty state
END;
$$;
```

---

#### **TODO 1.4: Fix Auto-start Logic** 🟡 HIGH
**Priority:** High - prevents unintended program starts

**Problem:** `static_starts` auto-creates when user just browses program page

**Solution:**
1. Only auto-create `static_starts` if `user_programs.status='active'` exists
2. Or: Remove auto-create entirely, require explicit start

**Files to modify:**
- `src/hooks/useProgramCalendarState.ts` - Add check before auto-creating

**Implementation:**
```typescript
// Only auto-create if user actually has active program
const { data: userProgram } = await supabase
  .from('user_programs')
  .select('status')
  .eq('user_id', user.id)
  .eq('program_id', activeProgram.id)
  .eq('status', 'active')
  .maybeSingle();

if (userProgram && activeProgram.id === KONTORIKEHA_RESET_PROGRAM_ID) {
  // Now safe to auto-create static_starts
  // ...
}
```

---

### **Phase 2: Improve User Experience (HIGH PRIORITY)**

#### **TODO 2.1: Improve Empty State on Programm Page** 🟡 HIGH
**Priority:** High - better UX

**Problem:** Empty state program cards just redirect, don't start program

**Solution:**
1. Add "Alusta kohe" button to empty state cards
2. Call `handleStartProgram` directly

**Files to modify:**
- `src/pages/Programm.tsx` - Add start button to empty state cards

---

#### **TODO 2.2: Fix Program Status Display on Homepage** 🟡 HIGH
**Priority:** High - misleading information

**Problem:** Shows "Aktiivne" badge when program status is actually "available"

**Solution:**
1. Check actual status before showing badge
2. Show different UI for "available" vs "active" programs

**Files to modify:**
- `src/pages/Home.tsx` - Check program status before showing badge

---

#### **TODO 2.3: Remove Hardcoded Title Matching** 🟡 HIGH
**Priority:** High - breaks multi-program support

**Problem:** Code filters programs by title string matching

**Solution:**
1. Use program IDs throughout
2. Remove all `program.title === 'Kontorikeha Reset'` checks
3. Use `program.id === PROGRAM_ID` instead

**Files to modify:**
- `src/hooks/useProgramCalendarState.ts` - Remove title matching
- All files that check program by title

---

### **Phase 3: Cleanup and Optimization (MEDIUM PRIORITY)**

#### **TODO 3.1: Ensure Programs Table Has Duration Columns** 🟢 MEDIUM
**Priority:** Medium - data consistency

**Problem:** `duration_weeks` vs `duration_days` inconsistency

**Solution:**
1. Verify `programs` table has correct columns
2. Ensure RPC returns consistent `duration_days`

**Files to check:**
- Database schema
- RPC function

---

#### **TODO 3.2: Add Loading States** 🟢 MEDIUM
**Priority:** Medium - better UX

**Problem:** Loading states might not be consistent

**Solution:**
1. Ensure all async operations show loading states
2. Prevent actions during loading

---

#### **TODO 3.3: Error Handling** 🟢 MEDIUM
**Priority:** Medium - robustness

**Problem:** Errors might not be handled gracefully

**Solution:**
1. Add try-catch blocks where missing
2. Show user-friendly error messages
3. Log errors for debugging

---

## 🎯 Recommended Implementation Order

1. **TODO 1.3** - Fix RPC first (enables proper null handling)
2. **TODO 1.1** - Fix hasActiveProgram logic (depends on 1.3)
3. **TODO 1.2** - Fix program ID fallback (fixes broken logic)
4. **TODO 1.4** - Fix auto-start logic (prevents bugs)
5. **TODO 2.2** - Fix homepage status display (UX improvement)
6. **TODO 2.3** - Remove hardcoded title matching (cleanup)
7. **TODO 2.1** - Improve empty state (nice-to-have)
8. **TODO 3.x** - Cleanup tasks (polish)

---

## 📝 Testing Checklist

After fixes, test these scenarios:

- [ ] New user sees empty state on homepage (no program started)
- [ ] New user can start program from /programmid
- [ ] After starting, homepage shows active program with correct status
- [ ] Programm page loads correctly with proper start date
- [ ] Program switching works correctly
- [ ] Resuming paused program works
- [ ] Program ID comparisons work correctly (UUID vs UUID)
- [ ] No auto-creation of static_starts when just browsing
- [ ] Empty state on Programm page shows when no active program
- [ ] Status badges show correctly ("Aktiivne" vs "Saadaval")
