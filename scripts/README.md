# 🛠️ Scripts & Utilities

This folder contains development scripts, SQL fixes, diagnostic tools, and migration utilities.

## 📁 Directory Structure

### SQL Diagnostic & Fix Files
- `DIAGNOSTIC.sql` - Database diagnostics and health checks
- `CHECK_MY_ACCESS.sql` - Check user access permissions
- `CHECK_USER_ACCESS.sql` - Verify user entitlements
- `CHECK_ACCESS_OVERRIDES_TABLE.sql` - Access overrides validation

### SQL Fixes & Migrations
- `FIX_RLS_POLICIES_FINAL.sql` - Final RLS policy fixes (APPLY THIS)
- `FIX_ALL_RLS_POLICIES.sql` - Comprehensive RLS policy updates
- `ADD_MISSING_RLS_POLICIES.sql` - Add missing RLS policies
- `GRANT_ALL_PERMISSIONS.sql` - Grant table permissions to roles
- `GRANT_VIEW_PERMISSIONS.sql` - Grant view permissions
- `CRITICAL_FIX_APPLY_NOW.sql` - Critical production fixes
- `APPLY_THIS_SQL.sql` - Quick-apply SQL script
- `SIMPLE_FIX.sql` - Simple table fixes
- `enable-rls-all-tables.sql` - Enable RLS on all tables
- `performance-optimizations.sql` - Database performance improvements
- `performance-optimizations-corrected.sql` - Corrected performance optimizations
- `create_programday.sql` - Create programday table

### Data Management Scripts
- `pull-production-database.js` - Pull data from production
- `copy-production-to-dev.js` - Copy production data to development
- `restore-from-production.js` - Restore from production backup
- `apply-production-data.js` - Apply production data to dev
- `import-*.js` - Various data import scripts
- `direct-sql-import.js` - Direct SQL import utility
- `create-programday-records.js` - Create programday records
- `fix-edge-cases.js` - Fix edge case data issues

### Production Backups
- `production-backup/` - JSON backups of all production tables
- `production_complete_dump.sql` - Complete SQL dump
- `production_schema.sql` - Production database schema
- `production_schema.json` - Production schema in JSON format

### Debug & Testing
- `DEBUG_STRIPE.js` - Stripe integration debugging
- `TEST_ACCESS_IN_BROWSER.js` - Browser access testing

### Documentation
- `AUDIT_REPORT.md` - Security audit report
- `AUDIT_FIXES_REPORT.md` - Fixes applied from audit
- `BUG_REPORT.md` - Known bugs and issues
- `CRITICAL_SCALABILITY_FIXES.md` - Scalability improvements
- `SYSTEM_STATUS.md` - Current system status
- `DEVELOPMENT_SETUP_GUIDE.md` - Setup guide for developers
- `DEVELOPMENT_SETUP.md` - Development environment setup
- `DEVELOPMENT_AUTH_SETUP.md` - Auth configuration for dev
- `DEVELOPMENT_CONFIG.md` - Development configuration
- `DEVELOPMENT_LOGIN_GUIDE.md` - Login guide for testing

### Data Reports
- `data-copy-results.json` - Results from data copy operations
- `data-application-summary.json` - Data application summary
- `data-integrity-report.json` - Data integrity checks

## 🚀 Usage

### Apply Database Fixes
```bash
# Apply the final RLS policies (recommended)
psql -h your-db-host -d your-db-name -f scripts/FIX_RLS_POLICIES_FINAL.sql

# Grant necessary permissions
psql -h your-db-host -d your-db-name -f scripts/GRANT_ALL_PERMISSIONS.sql
```

### Run Diagnostics
```bash
# Check database health
psql -h your-db-host -d your-db-name -f scripts/DIAGNOSTIC.sql
```

### Data Management
```bash
# Pull production data
node scripts/pull-production-database.js

# Copy to development
node scripts/copy-production-to-dev.js
```

## ⚠️ Important Notes

- Always backup before applying SQL fixes
- Test in development before applying to production
- Review RLS policies carefully
- Check SYSTEM_STATUS.md for current state

## 📝 Development Workflow

1. Read `DEVELOPMENT_SETUP_GUIDE.md` for initial setup
2. Check `SYSTEM_STATUS.md` for current status
3. Apply necessary SQL fixes from this folder
4. Review `BUG_REPORT.md` for known issues
5. Test access with `TEST_ACCESS_IN_BROWSER.js`


