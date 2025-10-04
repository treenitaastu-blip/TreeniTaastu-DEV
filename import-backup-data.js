#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Read the backup files and create SQL INSERT statements
function createInsertStatements(tableName, data) {
  if (data.length === 0) return '';
  
  const columns = Object.keys(data[0]);
  const insertStatements = [];
  
  // Create INSERT statements in batches
  const batchSize = 100;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const values = batch.map(row => {
      const rowValues = columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        return value;
      });
      return `(${rowValues.join(', ')})`;
    }).join(',\n  ');
    
    const statement = `INSERT INTO public.${tableName} (${columns.join(', ')})
VALUES
  ${values}
ON CONFLICT DO NOTHING;

`;
    insertStatements.push(statement);
  }
  
  return insertStatements.join('\n');
}

async function main() {
  console.log('🔄 Creating SQL migration from backup data...');
  console.log('=============================================');
  
  const backupDir = 'production-backup';
  if (!fs.existsSync(backupDir)) {
    console.log('❌ Backup directory not found. Run pull-production-database.js first.');
    return;
  }
  
  const files = fs.readdirSync(backupDir);
  const migrationStatements = [];
  
  // Header
  migrationStatements.push(`-- Migration: Import production data to development
-- Generated: ${new Date().toISOString()}
-- Source: Production database backup

BEGIN;

-- Disable RLS temporarily for data import
SET session_replication_role = replica;

`);
  
  // Process each backup file
  const tableOrder = [
    'profiles',
    'user_roles', 
    'user_entitlements',
    'subscribers',
    'workout_templates',
    'template_days',
    'template_items',
    'client_programs',
    'client_days',
    'client_items',
    'exercises',
    'articles',
    'custom_habits',
    'support_conversations',
    'support_messages',
    'booking_requests',
    'user_analytics_events',
    'user_streaks',
    'userprogress',
    'workout_sessions',
    'set_logs',
    'exercise_notes',
    'training_journal',
    'challenge_logs'
  ];
  
  for (const tableName of tableOrder) {
    const fileName = `${tableName}.json`;
    const filePath = path.join(backupDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${tableName} - backup file not found`);
      continue;
    }
    
    console.log(`📋 Processing ${tableName}...`);
    
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (data.length > 0) {
        migrationStatements.push(`-- Import ${tableName} (${data.length} records)`);
        const insertStatements = createInsertStatements(tableName, data);
        migrationStatements.push(insertStatements);
        migrationStatements.push('');
        console.log(`   ✅ Generated INSERT statements for ${data.length} records`);
      } else {
        console.log(`   ⏭️  Table ${tableName} is empty`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error processing ${tableName}: ${error.message}`);
    }
  }
  
  // Footer
  migrationStatements.push(`-- Re-enable RLS
SET session_replication_role = DEFAULT;

COMMIT;
`);
  
  // Write migration file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const migrationFileName = `supabase/migrations/${timestamp}_import_production_data.sql`;
  
  fs.writeFileSync(migrationFileName, migrationStatements.join('\n'));
  
  console.log('\n🎉 Migration file created!');
  console.log('=========================');
  console.log(`📁 File: ${migrationFileName}`);
  console.log(`📊 Total statements: ${migrationStatements.length}`);
  console.log('\n📋 Next steps:');
  console.log('1. Review the migration file');
  console.log('2. Apply it to the development database:');
  console.log(`   npx supabase db push --project-ref dtxbrnrpzepwoxooqwlj`);
  console.log('   OR');
  console.log(`   npx supabase db reset --project-ref dtxbrnrpzepwoxooqwlj`);
}

main().catch(console.error);

