# Per-Set Weight Memory - Implementation TODO List

## Database Layer

### ✅ Step 1: Create Migration
- [ ] Create migration file: `YYYYMMDD_create_client_item_set_weights.sql`
- [ ] Create `client_item_set_weights` table with columns:
  - `id` (uuid, primary key)
  - `client_item_id` (uuid, foreign key to client_items)
  - `user_id` (uuid, foreign key to auth.users)
  - `set_number` (integer, 1-20 constraint)
  - `weight_kg` (numeric(5,2), 0-1000 constraint)
  - `updated_at` (timestamp)
- [ ] Add UNIQUE constraint on `(client_item_id, set_number, user_id)`
- [ ] Add CASCADE delete to client_items and users
- [ ] Create indexes:
  - `idx_set_weights_client_item` on `(client_item_id, user_id)`
  - `idx_set_weights_user` on `(user_id)`
  - `idx_set_weights_updated` on `(updated_at DESC)`
- [ ] Enable RLS
- [ ] Create RLS policies:
  - SELECT: users can view their own
  - INSERT: users can insert their own
  - UPDATE: users can update their own
  - No DELETE policy (CASCADE handles cleanup)

### ✅ Step 2: Test Migration Locally
- [ ] Run migration on local/dev database
- [ ] Verify table exists with correct schema
- [ ] Verify indexes are created
- [ ] Test RLS policies work correctly:
  - User A cannot see User B's preferences
  - User A cannot insert/update User B's preferences
- [ ] Test CASCADE delete (delete exercise → preferences deleted)

## Frontend Implementation

### ✅ Step 3: Load Preferences in ModernWorkoutSession
**File**: `src/pages/ModernWorkoutSession.tsx`
**Function**: `loadWorkout`

- [ ] After loading exercises, extract exercise IDs array
- [ ] Create function `loadSetWeightPreferences(exerciseIds: string[])`:
  ```typescript
  const { data: preferences } = await supabase
    .from('client_item_set_weights')
    .select('client_item_id, set_number, weight_kg')
    .in('client_item_id', exerciseIds)
    .eq('user_id', user.id);
  ```
- [ ] Handle errors gracefully (log but don't fail workout load)
- [ ] Return preferences as Map: `Map<`${exerciseId}:${setNumber}`, weight_kg>`

### ✅ Step 4: Fallback to Last Completed Session
**File**: `src/pages/ModernWorkoutSession.tsx`
**Function**: `loadWorkout`

- [ ] If no preferences found, query last completed session:
  ```typescript
  const { data: lastSession } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('client_day_id', dayId)
    .not('ended_at', 'is', null)
    .order('ended_at', { ascending: false })
    .limit(1)
    .single();
  ```
- [ ] If lastSession exists, query its set_logs:
  ```typescript
  const { data: lastWeights } = await supabase
    .from('set_logs')
    .select('client_item_id, set_number, weight_kg_done')
    .eq('session_id', lastSession.id)
    .in('client_item_id', exerciseIds)
    .not('weight_kg_done', 'is', null);
  ```
- [ ] Handle errors gracefully (fallback to default)

### ✅ Step 5: Initialize Set Inputs with Priority
**File**: `src/pages/ModernWorkoutSession.tsx`
**Function**: `loadWorkout`

- [ ] After loading preferences/last session weights, populate `setInputs`:
  ```typescript
  // Priority: preferences > last session > default
  exercises.forEach(exercise => {
    for (let setNum = 1; setNum <= exercise.sets; setNum++) {
      const key = `${exercise.id}:${setNum}`;
      const preferredWeight = preferences?.get(key);
      const lastWeight = lastSessionWeights?.find(
        w => w.client_item_id === exercise.id && w.set_number === setNum
      )?.weight_kg_done;
      const defaultWeight = exercise.weight_kg;
      
      const initialWeight = preferredWeight || lastWeight || defaultWeight;
      if (initialWeight) {
        setSetInputs(prev => ({
          ...prev,
          [key]: { ...prev[key], kg: initialWeight }
        }));
      }
    }
  });
  ```
- [ ] Ensure this happens AFTER `setExercises()` but BEFORE UI renders

### ✅ Step 6: Save Preferences When Weight Changes
**File**: `src/pages/ModernWorkoutSession.tsx`
**Function**: `handleUpdateSingleSetWeight`

- [ ] After updating UI state, upsert to preferences table:
  ```typescript
  // Non-blocking async save
  supabase
    .from('client_item_set_weights')
    .upsert({
      client_item_id: exerciseId,
      user_id: user.id,
      set_number: setNumber,
      weight_kg: newWeight,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'client_item_id,set_number,user_id'
    })
    .catch(error => {
      // Log error but don't break workout flow
      console.error('Failed to save weight preference:', error);
    });
  ```
- [ ] Ensure this doesn't block UI updates (fire-and-forget)
- [ ] Add error handling that doesn't break the workout

### ✅ Step 7: Handle "Update All Sets" Button
**File**: `src/pages/ModernWorkoutSession.tsx`
**Function**: `handleUpdateAllSetsWeight`

**Decision needed**: Should updating all sets save preferences for all sets, or just update UI?

**Recommendation**: Save preferences for all sets (consistent behavior)

- [ ] After updating all sets in UI, loop through and upsert preferences for each set:
  ```typescript
  for (let i = 1; i <= exercise.sets; i++) {
    await supabase
      .from('client_item_set_weights')
      .upsert({
        client_item_id: exerciseId,
        user_id: user.id,
        set_number: i,
        weight_kg: newWeight,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'client_item_id,set_number,user_id'
      });
  }
  ```
- [ ] Handle errors gracefully (batch might partially fail)

## Testing

### ✅ Step 8: Basic Functionality Test
- [ ] Start workout 1 for exercise "hantlitega kõrvale tõsted" (default 2kg)
- [ ] Change Set 2 weight to 4kg using `handleUpdateSingleSetWeight`
- [ ] Complete workout 1
- [ ] Start workout 2 for same exercise
- [ ] **Expected**: Set 2 shows 4kg, Sets 1, 3, 4 show 2kg (default)
- [ ] Verify in database: `client_item_set_weights` has row for Set 2 with 4kg

### ✅ Step 9: First Workout Edge Case
- [ ] Create new user OR use exercise they've never done
- [ ] Start workout - all sets should default to `client_items.weight_kg`
- [ ] Verify no errors in console
- [ ] Verify no unnecessary database queries

### ✅ Step 10: New Exercise Edge Case
- [ ] Add new exercise to existing program
- [ ] User starts workout with this new exercise
- [ ] **Expected**: All sets default to `client_items.weight_kg`
- [ ] User changes Set 1 to 5kg
- [ ] Complete workout
- [ ] Start next workout - Set 1 should show 5kg

### ✅ Step 11: Multiple Sets Different Weights
- [ ] In one workout, change:
  - Set 1: 2kg → 3kg
  - Set 2: 2kg → 4kg
  - Set 3: 2kg → 3kg
  - Set 4: 2kg → 2kg (unchanged)
- [ ] Complete workout
- [ ] Start next workout
- [ ] **Expected**: 
  - Set 1: 3kg
  - Set 2: 4kg
  - Set 3: 3kg
  - Set 4: 2kg (default)

### ✅ Step 12: No Previous Session Fallback
- [ ] Use exercise with no previous completed sessions
- [ ] Start workout
- [ ] **Expected**: All sets default to `client_items.weight_kg`
- [ ] Verify no errors or console warnings

### ✅ Step 13: Performance Test
- [ ] Start workout with 10 exercises (typical maximum)
- [ ] Measure time to load preferences:
  ```typescript
  const start = performance.now();
  await loadSetWeightPreferences(exerciseIds);
  const duration = performance.now() - start;
  console.log(`Preference load time: ${duration}ms`);
  ```
- [ ] **Expected**: <10ms for typical workout
- [ ] Verify query uses indexes (check EXPLAIN ANALYZE)

### ✅ Step 14: RLS Policy Test
- [ ] User A creates preference: Set 2 = 4kg
- [ ] Switch to User B (different user_id)
- [ ] User B starts same workout
- [ ] **Expected**: User B sees default weight (2kg), not User A's 4kg
- [ ] Try to manually query User A's preferences as User B - should fail

### ✅ Step 15: CASCADE Delete Test
- [ ] User creates preferences for exercise
- [ ] Delete the exercise (or client_item)
- [ ] Verify preferences are automatically deleted
- [ ] Check database: no orphaned rows in `client_item_set_weights`

### ✅ Step 16: Error Handling Test
- [ ] Simulate database error (disable network, wrong credentials)
- [ ] Try to load preferences - should fallback gracefully
- [ ] Try to save preference - should log error but not break workout
- [ ] Verify user can continue workout normally even if preferences fail

### ✅ Step 17: Logging Verification
- [ ] Check console logs when:
  - Preferences loaded successfully
  - Preferences not found (fallback used)
  - Last session weights used (fallback)
  - Default weights used (fallback)
  - Preference saved successfully
  - Preference save failed (error logged)
- [ ] Verify logs are helpful for debugging but not excessive

### ✅ Step 18: Concurrency Test
- [ ] Have 2 users simultaneously:
  - User A: Change Set 2 to 4kg
  - User B: Change Set 2 to 5kg (same exercise)
- [ ] Complete both workouts
- [ ] **Expected**: Each user's preference saved correctly, no conflicts
- [ ] Verify database has both preferences (different user_id)

### ✅ Step 19: Code Documentation
- [ ] Add JSDoc comments to `loadSetWeightPreferences` function
- [ ] Add JSDoc comments to preference saving logic
- [ ] Add inline comments explaining priority order
- [ ] Update function documentation explaining weight memory system
- [ ] Add comments to migration file explaining table purpose

### ✅ Step 20: Code Review Checklist
- [ ] Code follows existing patterns in ModernWorkoutSession.tsx
- [ ] Error handling is consistent with rest of codebase
- [ ] No console.log statements (use proper logging)
- [ ] TypeScript types are correct
- [ ] No unused imports or variables
- [ ] Code is readable and maintainable
- [ ] Performance considerations are addressed
- [ ] Security (RLS) is properly implemented

### ✅ Step 21: Staging Deployment Test
- [ ] Deploy migration to staging
- [ ] Deploy frontend changes to staging
- [ ] Test complete user flow end-to-end:
  1. Start workout
  2. Change individual set weights
  3. Complete workout
  4. Start new workout
  5. Verify weights are remembered
- [ ] Test with real production-like data
- [ ] Monitor for any errors or performance issues
- [ ] Verify database queries are optimized

## Post-Deployment

### ✅ Step 22: Monitor Production
- [ ] Check error logs for preference-related errors
- [ ] Monitor query performance (should be <10ms)
- [ ] Verify user feedback is positive
- [ ] Check database size growth (should be minimal)

### ✅ Step 23: Documentation
- [ ] Update user documentation if needed
- [ ] Document feature for support team
- [ ] Create troubleshooting guide

---

## Notes

- **Priority Order**: Preferences > Last Session > Default
- **Error Handling**: Never break workout flow - always fallback gracefully
- **Performance**: Single batched query per workout, not per set
- **Security**: RLS ensures users only see their own preferences
- **Testing**: Test all edge cases before production deployment
