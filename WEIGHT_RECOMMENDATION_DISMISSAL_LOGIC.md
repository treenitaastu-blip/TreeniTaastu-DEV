# Weight Increase Recommendation Dismissal Logic

## Overview
The recommendation should disappear after the user has increased their weight on the exercise where it was recommended.

## Current System
- **Trigger:** RIR >= 5 in last 2 weeks → recommends weight increase
- **Display:** Amber alert icon appears on exercise card
- **Problem:** Recommendation doesn't disappear after user increases weight

## Proposed Logic: Weight Increase Detection

### 1. When Recommendation Should Appear
✅ **Already Implemented:**
- If RIR >= 5 in last 2 weeks → show recommendation
- Fallback: If weight unchanged for 2 weeks → show recommendation

### 2. When Recommendation Should Disappear

**Primary Check: Recent Weight Increase Detection**

The recommendation should disappear if:
- User has used **higher weight** in **recent sessions** (within last 7 days)
- Weight increase is **significant enough** to indicate progression

**Definition of "Weight Increase":**
- **Any single set** in recent sessions used weight > baseline weight
- OR **average weight** in recent sessions > baseline weight
- **Baseline:** Weight used in sessions BEFORE the recommendation would have appeared (2 weeks ago)

**Threshold:**
- Minimum increase: **2.5% or 0.5kg** (whichever is larger)
- This prevents false positives from minor variations

### 3. Implementation Strategy

#### Step 1: Modify `check_exercise_weight_stagnation` Function

**Add weight increase detection BEFORE checking RIR:**

```sql
-- Check if weight has increased in recent sessions (last 7 days)
-- If yes, user has already progressed → no recommendation needed
WITH recent_sessions AS (
  SELECT 
    ws.id as session_id,
    ws.ended_at,
    AVG(sl.weight_kg_done) as avg_weight_used,
    MAX(sl.weight_kg_done) as max_weight_used
  FROM workout_sessions ws
  INNER JOIN set_logs sl ON sl.session_id = ws.id
  WHERE sl.client_item_id = p_client_item_id
    AND ws.ended_at IS NOT NULL
    AND ws.ended_at >= NOW() - '7 days'::INTERVAL  -- Recent sessions
    AND sl.weight_kg_done IS NOT NULL
  GROUP BY ws.id, ws.ended_at
  ORDER BY ws.ended_at DESC
),
baseline_sessions AS (
  SELECT 
    AVG(sl.weight_kg_done) as baseline_avg_weight,
    MAX(sl.weight_kg_done) as baseline_max_weight
  FROM workout_sessions ws
  INNER JOIN set_logs sl ON sl.session_id = ws.id
  WHERE sl.client_item_id = p_client_item_id
    AND ws.ended_at IS NOT NULL
    AND ws.ended_at >= NOW() - (p_weeks_back || ' weeks')::INTERVAL
    AND ws.ended_at < NOW() - '7 days'::INTERVAL  -- Older sessions (baseline)
    AND sl.weight_kg_done IS NOT NULL
)
SELECT 
  MAX(recent_sessions.avg_weight_used) as recent_max_avg,
  MAX(recent_sessions.max_weight_used) as recent_max_weight,
  MAX(baseline_sessions.baseline_avg_weight) as baseline_avg,
  MAX(baseline_sessions.baseline_max_weight) as baseline_max
INTO v_recent_max_avg, v_recent_max_weight, v_baseline_avg, v_baseline_max
FROM recent_sessions, baseline_sessions;

-- Calculate minimum threshold (2.5% or 0.5kg, whichever is larger)
v_weight_increase_threshold := GREATEST(v_current_weight * 0.025, 0.5);

-- If weight increased in recent sessions, user has progressed → no recommendation
IF (v_recent_max_avg > v_baseline_avg + v_weight_increase_threshold) 
   OR (v_recent_max_weight > v_baseline_max + v_weight_increase_threshold) THEN
  RETURN jsonb_build_object(
    'needs_recommendation', false,
    'reason', 'weight_increased_recently',
    'recent_weight', v_recent_max_avg,
    'baseline_weight', v_baseline_avg,
    'increase', v_recent_max_avg - v_baseline_avg
  );
END IF;
```

#### Step 2: Alternative Approach (Simpler - Compare to Current Weight)

**Instead of comparing to baseline, compare recent sessions to `client_items.weight_kg`:**

```sql
-- Get most recent completed session's weight
WITH most_recent_session AS (
  SELECT 
    AVG(sl.weight_kg_done) as avg_weight_used,
    MAX(sl.weight_kg_done) as max_weight_used
  FROM workout_sessions ws
  INNER JOIN set_logs sl ON sl.session_id = ws.id
  WHERE sl.client_item_id = p_client_item_id
    AND ws.ended_at IS NOT NULL
    AND sl.weight_kg_done IS NOT NULL
  GROUP BY ws.id, ws.ended_at
  ORDER BY ws.ended_at DESC
  LIMIT 1
)
SELECT 
  avg_weight_used,
  max_weight_used
INTO v_most_recent_avg, v_most_recent_max
FROM most_recent_session;

-- Calculate threshold (2.5% or 0.5kg, whichever is larger)
v_weight_increase_threshold := GREATEST(v_current_weight * 0.025, 0.5);

-- If most recent session used weight higher than current default, user progressed
IF v_most_recent_avg IS NOT NULL 
   AND (v_most_recent_avg > v_current_weight + v_weight_increase_threshold
        OR v_most_recent_max > v_current_weight + v_weight_increase_threshold) THEN
  RETURN jsonb_build_object(
    'needs_recommendation', false,
    'reason', 'weight_increased_recently',
    'current_weight', v_current_weight,
    'recent_weight', v_most_recent_avg,
    'increase', v_most_recent_avg - v_current_weight
  );
END IF;
```

#### Step 3: Preferred Approach (Hybrid)

**Check both:**
1. **Immediate check:** If most recent session used higher weight → dismiss
2. **Historical check:** If average weight in last 7 days > average from 2 weeks ago → dismiss

### 4. Edge Cases to Handle

1. **First workout ever:** No baseline → use `client_items.weight_kg` as baseline
2. **No previous sessions:** Only recent sessions exist → compare to default weight
3. **Weight decreased then increased:** Track highest weight ever used
4. **Per-set weights:** Compare individual set weights, not just averages
5. **Incomplete workouts:** Only check completed sessions (`ended_at IS NOT NULL`)

### 5. Recommendation Dismissal Triggers

The recommendation should disappear when **ANY** of these are true:

1. ✅ **Recent weight increase:** Most recent session(s) used weight > baseline + threshold
2. ✅ **Manual weight update:** User explicitly updated weight via UI (track in `client_item_set_weights`)
3. ✅ **RIR improved:** Recent RIR < 5 (exercise no longer too easy)
4. ✅ **Time-based:** Recommendation shown for 7+ days without action (optional - not recommended)

### 6. Implementation Priority

**Recommended Implementation Order:**

1. **Check most recent session first** (simplest, most accurate)
   - If most recent completed session used weight > current_weight + threshold → dismiss
   - This catches immediate progression

2. **Check average of recent sessions** (fallback)
   - If average weight in last 7 days > average from 2 weeks ago → dismiss
   - This catches gradual progression

3. **Check per-set preferences** (if using per-set weight memory)
   - If any set preference saved > baseline → dismiss
   - This catches manual weight updates

### 7. Example Scenarios

**Scenario 1: User sees recommendation, then increases weight**
- Week 1-2: RIR = 5+ → recommendation appears
- Week 3: User increases Set 2 from 20kg → 25kg, completes workout
- Week 3 Session: avg_weight = 22.5kg (vs baseline 20kg)
- Result: Recommendation disappears (2.5kg increase > 0.5kg threshold)

**Scenario 2: User increases weight gradually**
- Week 1-2: RIR = 5+ → recommendation appears
- Week 3: User increases weight slightly (20kg → 21kg)
- Week 3 Session: avg_weight = 21kg (vs baseline 20kg)
- Result: Recommendation disappears (1kg increase > 0.5kg threshold)

**Scenario 3: User increases one set significantly**
- Week 1-2: RIR = 5+ → recommendation appears
- Week 3: User increases Set 2 from 20kg → 30kg (other sets stay 20kg)
- Week 3 Session: max_weight = 30kg (vs baseline 20kg)
- Result: Recommendation disappears (10kg increase > 0.5kg threshold)

### 8. Database Function Logic Flow

```
1. Get current_weight from client_items
2. IF weight-based exercise:
   a. Check most recent completed session weight
   b. IF recent_weight > current_weight + threshold:
      → RETURN no recommendation (weight_increased_recently)
   c. ELSE:
      → Continue to RIR check
3. Check RIR data in last 2 weeks
4. IF RIR >= 5:
   → RETURN recommendation (high_rir)
5. ELSE:
   → Check weight stagnation fallback
   → RETURN recommendation or no recommendation
```

### 9. Performance Considerations

- **Index needed:** `idx_set_logs_client_item_ended` on `(client_item_id, ended_at DESC)`
- **Query optimization:** Only query last few sessions, not entire history
- **Caching:** Cache recommendation status per exercise (refresh on workout completion)

---

## Recommended Implementation

**Simplest & Most Effective Approach:**

1. **Before checking RIR**, check if most recent completed session used higher weight
2. **Threshold:** 2.5% or 0.5kg increase (whichever is larger)
3. **If increased:** Return `needs_recommendation: false` immediately
4. **If not increased:** Continue with existing RIR-based logic

This ensures:
- ✅ Immediate dismissal when user progresses
- ✅ Simple to implement and maintain
- ✅ Handles all common scenarios
- ✅ Performance-friendly (only checks most recent session)
