# Static Program System - Comprehensive Audit & Improvement Proposals

## 📋 Executive Summary

**Current State:** The system currently supports only one static program ("Kontorikeha Reset") with hardcoded logic throughout. While the unlock mechanism works correctly, the infrastructure lacks proper multi-program support.

**Key Finding:** The `programs` and `user_programs` tables from the migration don't exist in the database, forcing fallback logic everywhere.

---

## 🔍 Current System Architecture

### **Database Structure (What Exists)**

1. **`static_starts` table**
   - Tracks when user started: `user_id`, `start_monday`
   - **Limitation:** One entry per user - doesn't specify WHICH program
   - Assumes only one static program exists

2. **`programday` table**
   - Contains program content: `week`, `day`, exercises, videos, hints
   - **Limitation:** Hardcoded for "Kontorikeha Reset" only
   - No `program_id` reference to differentiate programs

3. **`userprogress` table**
   - Tracks completion: `user_id`, `programday_id`, `completed_at`, `done`
   - **Limitation:** Relies on `programday_id` which has no program reference

### **Database Structure (What's Missing)**

1. **`programs` table** - ❌ DOESN'T EXIST
   - Migration `20250115_create_programs_system.sql` exists but wasn't applied
   - Should contain: `id`, `title`, `description`, `duration_days`, `difficulty`, `status`

2. **`user_programs` table** - ❌ DOESN'T EXIST
   - Should track: `user_id`, `program_id`, `status`, `started_at`
   - Would enable proper program assignment and tracking

---

## 🚦 Current User Flow Analysis

### **Path 1: Homepage → Programs List → Start Program**

```
Homepage (/home)
  ↓ [Click "Vaata kõiki programme"]
Programmid.tsx (/programmid)
  ↓ [Click "Alusta programm"]
Programm.tsx (/programm)
  ↓ [Click day tile]
Programm.tsx (/programm/day/:dayNumber)
```

**Issues:**
- ✅ Navigation works
- ❌ `Programmid.tsx` queries non-existent `programs` table, falls back to hardcoded data
- ❌ "Alusta programmiga" for `kontorikeha-reset` just redirects - doesn't actually assign
- ❌ No visual confirmation that program was "started"
- ❌ No way to see which program you're currently on

### **Path 2: Menu → Programm**

```
Header Menu
  ↓ [Click "Programm"]
Programm.tsx (/programm)
```

**Issues:**
- ✅ Direct access works
- ❌ `get_user_active_program` checks PT programs first, then hardcodes Kontorikeha Reset
- ❌ No way to switch between multiple static programs
- ❌ If user wants to try a different static program, current system doesn't support it

---

## 🐛 Identified Issues

### **Critical Issues**

#### 1. **Missing Database Tables**
- **Problem:** `programs` and `user_programs` tables don't exist
- **Impact:** Can't properly manage multiple static programs
- **Evidence:** 
  - Migration exists: `20250115_create_programs_system.sql`
  - Programmid.tsx falls back to hardcoded data
  - Database query shows tables don't exist

#### 2. **No Program Assignment System**
- **Problem:** `static_starts` doesn't track which program user is using
- **Impact:** Can't support multiple static programs
- **Evidence:**
  - `static_starts` only has `user_id` and `start_monday`
  - All users are assumed to be on "Kontorikeha Reset"

#### 3. **Hardcoded Program Logic**
- **Problem:** "Kontorikeha Reset" is hardcoded throughout:
  - `Programmid.tsx`: `if (programId === 'kontorikeha-reset')`
  - `useProgramCalendarState.ts`: Filters for `title === 'Kontorikeha Reset'`
  - `Programm.tsx`: Checks `program.title === 'Kontorikeha Reset'`
- **Impact:** Adding new programs requires code changes in multiple places

#### 4. **Confusing Program Types**
- **Problem:** System mixes static programs and PT programs
- **Evidence:**
  - `get_user_active_program` checks `client_programs` (PT) first
  - `ProgramsList.tsx` shows `client_programs` (PT programs)
  - `Programmid.tsx` is supposed to show static programs but queries wrong table
- **Impact:** Users get confused between static programs and personal training

### **UX/UI Issues**

#### 5. **Unclear Program Status**
- **Problem:** User can't see if they're "on" a program
- **Evidence:**
  - `Programmid.tsx` shows "Alusta programmiga" even if user already has start date
  - No "Continue" vs "Start" distinction
  - No indication of progress until you go to `/programm`

#### 6. **No Easy Return Path**
- **Problem:** After starting program, user is taken to calendar but may want to go back
- **Evidence:**
  - "Alusta programmiga" → `/programm` → User might want to see other programs
  - Navigation path is one-way

#### 7. **Hardcoded Homepage Preview**
- **Problem:** Homepage shows hardcoded "Kontorikeha Reset" preview
- **Evidence:** `Home.tsx:255` - Hardcoded program info
- **Impact:** Can't show multiple programs or user's active program

#### 8. **Inconsistent Program Information**
- **Problem:** Program details scattered:
  - Homepage: Hardcoded preview
  - Programmid: Queries non-existent table
  - Programm: Gets program from `get_user_active_program` which hardcodes fallback
- **Impact:** Single source of truth doesn't exist

### **Architectural Issues**

#### 9. **Programday Has No Program Reference**
- **Problem:** `programday` table doesn't have `program_id`
- **Impact:** Can't have multiple static programs with different day structures
- **Evidence:** `programday` only has `week` and `day`

#### 10. **get_user_active_program Logic is Wrong**
- **Problem:** Function checks PT programs first, then hardcodes static fallback
- **Evidence:** Function returns `client_programs` or hardcoded Kontorikeha Reset
- **Impact:** Doesn't properly handle static program assignment

#### 11. **No Program Switching**
- **Problem:** Once user has `static_starts`, they're stuck on that program
- **Impact:** Can't try different static programs

---

## ✅ What's Working Well

1. **Unlock Logic:** ✅ Perfect
   - `shouldUnlockDay` correctly calculates weekday unlocks
   - 07:00 unlock time works correctly
   - Weekend handling is correct

2. **Calendar UI:** ✅ Good
   - `CalendarGrid` displays days clearly
   - Visual states (locked/unlocked/completed) are clear
   - Progress tracking works

3. **Day Completion:** ✅ Working
   - `complete_static_program_day` RPC works
   - Progress persists correctly
   - Completion status displays properly

4. **Start Date Management:** ✅ Fixed
   - `start_static_program` function correctly sets Monday
   - Auto-creation works

---

## 🎯 Improvement Proposals

### **Phase 1: Foundation (Critical - Must Do First)**

#### **Improvement 1.1: Create Missing Database Tables**
**Priority:** 🔴 CRITICAL

**Action:**
- Apply migration `20250115_create_programs_system.sql` OR create new migration
- Add `program_id` reference to `static_starts` table
- Link `programday` to programs (add `program_id` or create separate tables per program)

**Benefits:**
- Enables multi-program support
- Proper data structure
- Single source of truth

**Implementation:**
```sql
-- Add program_id to static_starts
ALTER TABLE static_starts ADD COLUMN program_id UUID REFERENCES programs(id);
CREATE INDEX idx_static_starts_program_id ON static_starts(program_id);

-- OR: Create programday_programs junction table
-- OR: Add program_id directly to programday (if multiple programs can share structure)
```

---

#### **Improvement 1.2: Fix Program Assignment System**
**Priority:** 🔴 CRITICAL

**Problem:** Currently, clicking "Alusta programmiga" just redirects - doesn't actually assign

**Action:**
- When user clicks "Alusta programmiga" in `Programmid.tsx`:
  1. Create entry in `user_programs` table (or update `static_starts` with `program_id`)
  2. Call `start_static_program` RPC to set start date
  3. Store which program user selected
- Update `start_static_program` RPC to accept `program_id` parameter

**Benefits:**
- Proper program assignment
- Can track which program user is on
- Enables program switching

**Code Changes:**
```typescript
// In Programmid.tsx handleStartProgram:
const { data, error } = await supabase
  .from('user_programs')
  .insert({
    user_id: user.id,
    program_id: programId, // Need to get UUID from programs table
    status: 'active'
  });

// Then call start_static_program
await supabase.rpc('start_static_program', { 
  p_force: false,
  p_program_id: programId // NEW parameter
});
```

---

#### **Improvement 1.3: Fix get_user_active_program Function**
**Priority:** 🔴 CRITICAL

**Action:**
- Update function to check `user_programs` for static programs
- Priority order:
  1. Check `user_programs` WHERE `program_id` IN (static programs) AND `status = 'active'`
  2. If none, check `static_starts` with `program_id`
  3. Fallback to Kontorikeha Reset only if user has static access but no assignment

**Benefits:**
- Proper program resolution
- Supports multiple static programs
- Maintains backward compatibility

---

### **Phase 2: Multi-Program Support (High Priority)**

#### **Improvement 2.1: Program Selection UI**
**Priority:** 🟡 HIGH

**Problem:** Currently no way to choose between static programs

**Action:**
- Update `Programmid.tsx` to:
  - Show all available static programs from `programs` table
  - Show user's current program status ("Aktiivne" if they have `user_programs` entry)
  - Allow switching programs
  - Show "Jätka programm" for active programs

**Benefits:**
- Clear program selection
- Easy program switching
- Better UX

---

#### **Improvement 2.2: Program Context Throughout App**
**Priority:** 🟡 HIGH

**Problem:** Can't tell which program you're on from various pages

**Action:**
- Add program indicator in Header when on `/programm` page
- Show program name in calendar header
- Add breadcrumb: Home → Programmid → [Program Name]

**Benefits:**
- Always know which program you're on
- Easy navigation
- Professional UX

---

#### **Improvement 2.3: Programday Structure per Program**
**Priority:** 🟡 HIGH

**Problem:** `programday` table is shared - can't have different structures per program

**Options:**
- **Option A:** Add `program_id` to `programday` (if programs can share days)
- **Option B:** Create separate tables: `kontorikeha_reset_days`, `program_2_days`, etc.
- **Option C:** Use JSONB structure in `programs` table to store day structure

**Recommendation:** Option A if programs share similar structure, Option C for flexibility

**Benefits:**
- Each program can have unique day structure
- Easy to add new programs
- Scalable

---

### **Phase 3: UX Enhancements (Medium Priority)**

#### **Improvement 3.1: Program Progress Indicators**
**Priority:** 🟢 MEDIUM

**Action:**
- On `Programmid.tsx`, show progress for each program:
  - "5/20 päeva tehtud" for active programs
  - "Lõpetatud" badge for completed
  - Progress bar visualization

**Benefits:**
- Quick overview of all programs
- Encourages completion
- Better engagement

---

#### **Improvement 3.2: Smart Homepage Preview**
**Priority:** 🟢 MEDIUM

**Action:**
- Replace hardcoded preview with:
  - If user has active program → Show that program's preview
  - If no active program → Show "Vali programm" card
  - Show progress for active program

**Benefits:**
- Personalized homepage
- Quick access to current program
- Encourages starting programs

---

#### **Improvement 3.3: Program Switching Flow**
**Priority:** 🟢 MEDIUM

**Action:**
- Add "Vaheta programmi" button in `/programm` page
- Show confirmation: "Are you sure? Current progress will be paused"
- Allow pausing one program to start another
- Show paused programs in `Programmid.tsx` with "Jätka" option

**Benefits:**
- Flexibility for users
- Can try different programs
- Progress preserved

---

#### **Improvement 3.4: Better Empty States**
**Priority:** 🟢 MEDIUM

**Problem:** When no program selected, unclear what to do

**Action:**
- In `Programm.tsx`, if no active program:
  - Show clear call-to-action
  - Show program cards to choose from
  - Explain benefits

**Benefits:**
- Clear next steps
- Reduced confusion
- Better onboarding

---

### **Phase 4: Polish & Optimization (Low Priority)**

#### **Improvement 4.1: Program Recommendations**
**Priority:** 🔵 LOW

**Action:**
- Based on user's completion patterns, recommend next program
- "Since you completed Kontorikeha Reset, try..."

**Benefits:**
- Increase engagement
- Better user journey
- Business value

---

#### **Improvement 4.2: Program Comparison View**
**Priority:** 🔵 LOW

**Action:**
- Allow users to compare programs side-by-side
- Show differences in difficulty, duration, focus areas

**Benefits:**
- Informed decision-making
- Better program selection

---

#### **Improvement 4.3: Program Completion Certificates**
**Priority:** 🔵 LOW

**Action:**
- Generate completion certificates
- Share on social media option
- Add to user profile

**Benefits:**
- Gamification
- Social sharing
- User motivation

---

## 🎨 UI/UX Flow Improvements

### **Improved User Journey**

```
Homepage (/home)
  ├─ Shows active program preview (if has one)
  ├─ Shows "Vali programm" card (if no active)
  └─ "Vaata kõiki programme" button

Programmid.tsx (/programmid)
  ├─ Lists ALL static programs from database
  ├─ Shows status per program:
  │   ├─ "Saadaval" (not started)
  │   ├─ "Aktiivne - 5/20 päeva" (in progress)
  │   ├─ "Peatatud" (paused)
  │   └─ "Lõpetatud" (completed)
  ├─ "Alusta programm" (for available)
  ├─ "Jätka programm" (for active/paused)
  └─ "Vaata edenemist" (for all)

Programm.tsx (/programm)
  ├─ Shows current program name clearly
  ├─ Calendar with days
  ├─ "Vaheta programmi" button
  └─ Breadcrumb: Programmid → [Program Name]
```

---

## 📊 Implementation Priority Matrix

| Improvement | Priority | Impact | Effort | Dependencies |
|------------|----------|--------|--------|--------------|
| 1.1: Create DB tables | 🔴 CRITICAL | High | Medium | None |
| 1.2: Fix assignment | 🔴 CRITICAL | High | Medium | 1.1 |
| 1.3: Fix get_active | 🔴 CRITICAL | High | Low | 1.1, 1.2 |
| 2.1: Selection UI | 🟡 HIGH | High | Medium | 1.1, 1.2 |
| 2.2: Program context | 🟡 HIGH | Medium | Low | 1.2 |
| 2.3: Programday structure | 🟡 HIGH | High | High | 1.1 |
| 3.1: Progress indicators | 🟢 MEDIUM | Medium | Low | 1.2 |
| 3.2: Smart homepage | 🟢 MEDIUM | Medium | Low | 1.2 |
| 3.3: Program switching | 🟢 MEDIUM | Medium | Medium | 1.2 |
| 3.4: Empty states | 🟢 MEDIUM | Low | Low | None |
| 4.1-4.3: Polish | 🔵 LOW | Low | Various | Various |

---

## 🔧 Technical Debt to Address

1. **Remove Hardcoded Strings:**
   - Replace all `'kontorikeha-reset'` with database lookups
   - Replace `'Kontorikeha Reset'` title checks with `program_id` comparisons

2. **Consolidate Program Loading:**
   - Single hook: `useStaticPrograms()` 
   - Single hook: `useActiveStaticProgram()`
   - Remove scattered program loading logic

3. **Type Safety:**
   - Create `StaticProgram` type
   - Create `UserStaticProgram` type
   - Use throughout app

4. **Error Handling:**
   - Better error messages when programs don't exist
   - Graceful fallbacks
   - User-friendly error states

---

## 🚀 Recommended Implementation Order

### **Sprint 1: Foundation (Week 1)**
1. Create `programs` and `user_programs` tables (Improvement 1.1)
2. Add `program_id` to `static_starts` (Improvement 1.1)
3. Update `start_static_program` to accept `program_id` (Improvement 1.2)
4. Fix `get_user_active_program` to check static programs (Improvement 1.3)

### **Sprint 2: Assignment Flow (Week 1-2)**
5. Fix `Programmid.tsx` to properly assign programs (Improvement 1.2)
6. Update `Programmid.tsx` to load from `programs` table (Improvement 2.1)
7. Add program status display (Improvement 2.1, 3.1)

### **Sprint 3: Multi-Program Support (Week 2)**
8. Link `programday` to programs (Improvement 2.3)
9. Add program context/indicators (Improvement 2.2)
10. Update homepage to show active program (Improvement 3.2)

### **Sprint 4: Polish (Week 3)**
11. Program switching flow (Improvement 3.3)
12. Better empty states (Improvement 3.4)
13. Remove hardcoded logic (Technical Debt)

---

## 💡 Key Decisions Needed

1. **Programday Structure:**
   - Should multiple programs share the same `programday` structure?
   - Or should each program have its own day structure?
   - **Recommendation:** Add `program_id` to `programday` - allows both sharing and unique structures

2. **Program Assignment:**
   - Should users be able to have multiple active static programs?
   - Or only one active at a time?
   - **Recommendation:** One active static program at a time (simpler UX, matches PT model)

3. **Program Switching:**
   - When switching, should progress be preserved?
   - Or start fresh?
   - **Recommendation:** Preserve progress, allow "pause" and "resume"

4. **Backward Compatibility:**
   - Existing users with `static_starts` but no `program_id`?
   - **Recommendation:** Migration to assign all existing users to Kontorikeha Reset

---

## 📝 Questions for Discussion

1. **Should static programs be repeatable?** (e.g., restart Kontorikeha Reset after completing)
2. **Can users pause/resume programs?** (like PT programs)
3. **Should programs have prerequisites?** (e.g., must complete Program A before Program B)
4. **How to handle program updates?** (if Kontorikeha Reset content changes)
5. **Should programs have versions?** (v1, v2 of same program)

---

## 🎯 Success Metrics

After improvements:
- ✅ Users can see all available static programs
- ✅ Users can start/switch between programs
- ✅ Clear indication of which program is active
- ✅ Progress tracked per program
- ✅ Easy to add new static programs (no code changes)
- ✅ Consistent UX across all program-related pages

---

**Next Steps:** Review this audit, discuss priorities, then implement Phase 1 improvements first.
