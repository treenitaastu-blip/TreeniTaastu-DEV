# 🚀 Development Database Setup Guide

## 📋 Current Status
- ✅ **Development Database**: Created and connected (`dtxbrnrpzepwoxooqwlj`)
- ✅ **Client Configuration**: Updated to use development database
- ✅ **Supabase CLI**: Installed and ready
- ⏳ **Schema Migration**: Ready to execute
- ⏳ **Performance Optimizations**: Ready to apply

## 🎯 Quick Setup (2 Options)

### Option A: Automatic Setup (Recommended)
```bash
# Run the automated setup script
npm run setup:dev
```

### Option B: Manual Setup (Step by Step)

#### Step 1: Initialize Supabase Project
```bash
cd /Users/henri/Documents/Cursor\ Projects/TreeniTaastu/treeni-taastu-app
npx supabase login
npx supabase link --project-ref dtxbrnrpzepwoxooqwlj
```

#### Step 2: Generate Migration from Production
```bash
# This will create a migration file with your production schema
npx supabase db diff --use-migra --schema public > supabase/migrations/$(date +%Y%m%d%H%M%S)_initial_schema.sql
```

#### Step 3: Apply Schema to Development
```bash
npx supabase db push
```

#### Step 4: Apply Performance Optimizations
```bash
# Run the performance optimization SQL
npx supabase sql --file performance-optimizations.sql
```

## 🔧 What I've Already Done

### ✅ Updated Client Configuration
- Modified `src/integrations/supabase/client.ts` to use development database
- Set fallback URLs to development database
- Ready for immediate testing

### ✅ Created Performance Optimization SQL
- Critical indexes for 100+ user scalability
- Optimized queries for user management, workouts, support
- Prevents N+1 queries and performance bottlenecks

### ✅ Environment Setup
- Development database: `https://dtxbrnrpzepwoxooqwlj.supabase.co`
- Service role key configured for full access
- MCP connection configured (pending restart)

## 🚨 Critical Performance Fixes Included

### 1. User Management Performance
```sql
CREATE INDEX idx_profiles_created_at_desc ON profiles(created_at DESC);
CREATE INDEX idx_profiles_role_active ON profiles(role) WHERE role IS NOT NULL;
CREATE INDEX idx_profiles_email_lookup ON profiles(email) WHERE email IS NOT NULL;
```

### 2. Workout Session Performance
```sql
CREATE INDEX idx_workout_sessions_user_created ON workout_sessions(user_id, created_at DESC);
CREATE INDEX idx_workout_sessions_program_day ON workout_sessions(program_day_id, created_at DESC);
```

### 3. Support System Performance
```sql
CREATE INDEX idx_support_conversations_status_updated ON support_conversations(status, last_message_at DESC);
CREATE INDEX idx_support_conversations_user_active ON support_conversations(user_id) WHERE status = 'active';
CREATE INDEX idx_support_messages_conversation_time ON support_messages(conversation_id, created_at DESC);
```

### 4. User Progress & Entitlements
```sql
CREATE INDEX idx_userprogress_user_day ON userprogress(user_id, program_day_id);
CREATE INDEX idx_user_entitlements_user_active ON user_entitlements(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_subscribers_stripe_status ON subscribers(stripe_subscription_status) WHERE stripe_subscription_status IS NOT NULL;
```

## 🧪 Testing Your Setup

### 1. Test Database Connection
```bash
npm run dev
# Check browser console for any Supabase connection errors
```

### 2. Test Performance Improvements
```bash
# Run the performance test script
node test-performance.js
```

### 3. Verify Schema Integrity
```bash
# Compare table counts
npx supabase db diff --use-migra --schema public
```

## 🔄 Next Steps After Setup

1. **✅ Test Application**: Run your app and verify all features work
2. **📊 Monitor Performance**: Check query performance in Supabase dashboard
3. **🧪 Load Testing**: Test with multiple concurrent users
4. **🚀 Production Deployment**: Apply optimizations to production when ready

## 🆘 Troubleshooting

### MCP Connection Issues
- Restart Cursor completely (Cmd+Q)
- Check `~/.cursor/mcp.json` has correct service role key
- Verify project reference: `dtxbrnrpzepwoxooqwlj`

### Schema Migration Issues
- Ensure you're logged into Supabase CLI: `npx supabase login`
- Check project linking: `npx supabase status`
- Verify database permissions in Supabase dashboard

### Performance Issues
- Run `EXPLAIN ANALYZE` on slow queries
- Check index usage in Supabase dashboard
- Monitor real-time connections and subscriptions

## 📞 Ready for Production?

Once everything is tested and working in development:

1. **Create Production Migration**: Export optimizations as migration
2. **Schedule Maintenance Window**: Apply during low usage
3. **Monitor Deployment**: Watch performance metrics
4. **Rollback Plan**: Keep original schema backup

---

**🎉 Your development environment is ready for safe testing and optimization!**







