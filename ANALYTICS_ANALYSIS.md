# Analytics System Analysis

## Overview
The admin analytics page displays system-wide metrics about users, workouts, and engagement. The data flows from database → RPC function → React hook → UI component.

## Data Flow

### 1. Database Layer
- **Primary Source**: `get_analytics_summary()` RPC function
- **Fallback Sources**: 
  - `v_program_analytics` view
  - `v_session_summary` view

### 2. RPC Function: `get_analytics_summary()`
**Current Issue**: The latest migration (20250928161058) changed this to return **user-specific** analytics instead of **system-wide** analytics, which is wrong for the admin page.

**Expected Behavior**: Should return system-wide analytics for all users.

**Metrics Returned**:
- `total_users`: Total number of users in the system
- `active_users`: Users active in last 7 days
- `new_users_7d`: New users in last 7 days
- `avg_sessions_per_user_7d`: Average sessions per active user (7 days)
- `completion_rate`: Completion rate (30 days)
- `avg_rpe`: Average RPE (7 days)
- `workouts_started_7d`: Workouts started (7 days)
- `workouts_completed_7d`: Workouts completed (7 days)
- `dropoff_day`: Average day where users drop off
- `retention_day_7`: Retention rate at day 7
- `retention_day_30`: Retention rate at day 30
- `total_volume_kg`: Total volume lifted (30 days)

### 3. React Hook: `useAnalytics`
**File**: `src/hooks/useAnalytics.ts`

**Functionality**:
- Fetches data from `get_analytics_summary()` RPC
- Falls back to `v_program_analytics` view if RPC fails
- Adapts snake_case database fields to camelCase for UI
- Provides loading, error, and refresh states

**Data Adaptation**:
- `total_users` → `totalUsers`
- `active_users` → `activeUsers7d`
- `new_users_7d` → `newUsers7d`
- `avg_sessions_per_user_7d` → `avgSessionsPerUser7d`
- `completion_rate` → `completionRate30d`
- `avg_rpe` → `avgRpe7d`
- `workouts_started_7d` → `workoutsStarted7d`
- `workouts_completed_7d` → `workoutsCompleted7d`
- `dropoff_day` → `dropoffDayMean`
- `retention_day_7` → `retentionDay7`
- `retention_day_30` → `retentionDay30`
- `total_volume_kg` → `totalVolumeKg`

### 4. UI Component: `Analytics.tsx`
**File**: `src/pages/admin/Analytics.tsx`

**Visualization**:
- Displays metrics in a responsive grid (1 col mobile, 2 cols tablet, 3 cols desktop)
- Each metric shows:
  - Title (Estonian)
  - Value (formatted)
  - Hint/description
  - Trend indicator (positive/neutral/negative) for some metrics

**Metrics Displayed**:
1. Kasutajad kokku (Total Users)
2. Aktiivsed (7p) (Active Users 7 days)
3. Uued (7p) (New Users 7 days)
4. Treeningud alustatud (7p) (Workouts Started 7 days)
5. Treeningud lõpetatud (7p) (Workouts Completed 7 days)
6. Keskmine sessioonid/kasutaja (7p) (Avg Sessions per User 7 days)
7. Lõpetamise määr (30p) (Completion Rate 30 days) - with trend
8. Keskmine RPE (7p) (Average RPE 7 days) - with trend
9. Ärajäämise päev (keskm.) (Dropoff Day Mean) - with trend
10. Retentsioon D7 (Retention Day 7)
11. Retentsioon D30 (Retention Day 30)

**Trend Logic**:
- **Completion Rate**: 
  - Positive: ≥ 60%
  - Negative: ≤ 30%
  - Neutral: 30-60%
- **RPE**:
  - Negative: ≥ 6.5 (too hard)
  - Positive: 5-6.5 (good range)
  - Neutral: < 5
- **Dropoff Day**:
  - Positive: ≥ 10 days
  - Negative: ≤ 3 days
  - Neutral: 3-10 days

## Issues Found

### 🐛 CRITICAL BUG #1: Wrong Analytics Scope
**Location**: `supabase/migrations/20250928161058_7dfd2b2e-2303-4168-a7e9-2ac85ed42fcc.sql`

**Problem**: The function returns **user-specific** analytics (filtered by `auth.uid()`) instead of **system-wide** analytics.

**Impact**: Admin analytics page shows data for only the logged-in admin user, not all users.

**Fix**: Restore system-wide analytics calculation. The function should:
1. Check if user is admin (optional - can rely on route protection)
2. Return system-wide metrics for all users
3. Include `total_volume_kg` calculation

### 🐛 BUG #2: Missing `total_volume_kg` in Latest Migration
**Location**: Migration 20250928161058

**Problem**: The latest migration doesn't include `total_volume_kg` in the return, but the UI expects it.

**Impact**: `totalVolumeKg` will be undefined/null in the UI.

### 🐛 BUG #3: Hardcoded Dropoff Day
**Location**: Migration 20250928160113

**Problem**: `_dropoff_day_mean := 3.5;` is hardcoded instead of calculated.

**Impact**: Dropoff day metric is not accurate.

**Fix**: Calculate actual dropoff day from user progress data.

### 🐛 BUG #4: Retention Calculation Issue
**Location**: Migration 20250928160113

**Problem**: Line 99 reuses `_sessions30_started` variable name, overwriting the previous value.

**Impact**: Retention calculation may be incorrect.

**Fix**: Use a different variable name for active users in 30 days.

## Recommendations

1. **Fix the RPC function** to return system-wide analytics
2. **Calculate dropoff day** from actual user progress data
3. **Fix retention calculation** variable naming
4. **Add proper admin check** (optional, since route is protected)
5. **Add error handling** for edge cases (division by zero, null values)

