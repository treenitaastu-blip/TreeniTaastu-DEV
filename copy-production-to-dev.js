#!/usr/bin/env node

/**
 * Copy Production Data to Development Database
 * 
 * This script will:
 * 1. Connect to your production database
 * 2. Export all table data
 * 3. Import data to development database
 * 
 * Usage: node copy-production-to-dev.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Development database configuration (already set up)
const DEVELOPMENT_CONFIG = {
  url: 'https://dtxbrnrpzepwoxooqwlj.supabase.co',
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5ODM4OCwiZXhwIjoyMDc0OTc0Mzg4fQ.B5tR2PVFY55A9OIwUjXULkOCMz6fswoCN2CjaaQHy6s'
};

// Production database configuration - UPDATE THESE
const PRODUCTION_CONFIG = {
  url: 'https://sfvzkhhzrqydteugjxub.supabase.co', // Replace with your production URL
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmdnpraGh6cnF5ZHRldWdqeHViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ3MzUwNywiZXhwIjoyMDcyMDQ5NTA3fQ.azwXX5s_lPQ95c3RxPhBjFeOKHjhux9xknv3T_bGxWY', // Replace with your production service key
};

// Create Supabase clients
const productionClient = createClient(PRODUCTION_CONFIG.url, PRODUCTION_CONFIG.serviceKey);
const developmentClient = createClient(DEVELOPMENT_CONFIG.url, DEVELOPMENT_CONFIG.serviceKey);

// Tables to copy (in order of dependencies)
const TABLES_TO_COPY = [
  // Core tables first
  'profiles',
  'user_entitlements',
  'user_roles',
  'subscribers',
  'access_overrides',
  
  // Template and program data
  'workout_templates',
  'template_days',
  'template_items',
  'exercises',
  
  // Client programs and sessions
  'client_programs',
  'client_days',
  'client_items',
  'workout_sessions',
  
  // Progress and analytics
  'userprogress',
  'set_logs',
  'exercise_notes',
  'user_analytics_events',
  'user_streaks',
  'user_rewards',
  
  // Support system
  'support_conversations',
  'support_messages',
  
  // Other tables
  'booking_requests',
  'challenge_logs',
  'challenges_master',
  'custom_habits',
  'rest_timers',
  'rpe_history',
  'static_starts',
  'timezones',
  'training_journal',
  
  // Backup tables
  'programday_backup',
  'set_logs_backup',
  'userprogress_backup',
  
  // Views (these might not have data, but we'll try)
  'v_access_matrix',
  'v_client_programs_admin',
  'v_program_analytics',
  'v_program_progress',
  'v_session_summary',
  'v_static_status',
  'v_user_entitlement',
  'v_user_weekly',
  'v_userprogress_with_day'
];

async function exportTableData(tableName) {
  console.log(`📤 Exporting data from ${tableName}...`);
  
  try {
    const { data, error } = await productionClient
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error(`❌ Error exporting ${tableName}:`, error);
      return null;
    }
    
    console.log(`✅ Exported ${data.length} rows from ${tableName}`);
    return data;
  } catch (err) {
    console.error(`❌ Error exporting ${tableName}:`, err);
    return null;
  }
}

async function importTableData(tableName, data) {
  if (!data || data.length === 0) {
    console.log(`⏭️  Skipping ${tableName} (no data)`);
    return true;
  }
  
  console.log(`📥 Importing ${data.length} rows to ${tableName}...`);
  
  try {
    // Clear existing data first (be careful with this!)
    const { error: deleteError } = await developmentClient
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    
    if (deleteError) {
      console.warn(`⚠️  Warning: Could not clear ${tableName}:`, deleteError.message);
    }
    
    // Insert new data in batches
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error: insertError } = await developmentClient
        .from(tableName)
        .insert(batch);
      
      if (insertError) {
        console.error(`❌ Error inserting batch into ${tableName}:`, insertError);
        return false;
      }
    }
    
    console.log(`✅ Successfully imported ${data.length} rows to ${tableName}`);
    return true;
  } catch (err) {
    console.error(`❌ Error importing ${tableName}:`, err);
    return false;
  }
}

async function copyAllData() {
  console.log('🚀 Starting data copy process...');
  console.log('================================');
  
  let successCount = 0;
  let errorCount = 0;
  const results = [];
  
  for (const tableName of TABLES_TO_COPY) {
    try {
      console.log(`\n🔄 Processing ${tableName}...`);
      
      // Export data from production
      const data = await exportTableData(tableName);
      
      if (data !== null) {
        // Import data to development
        const success = await importTableData(tableName, data);
        
        results.push({
          table: tableName,
          rows: data.length,
          success: success
        });
        
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      } else {
        results.push({
          table: tableName,
          rows: 0,
          success: false
        });
        errorCount++;
      }
    } catch (err) {
      console.error(`❌ Error processing ${tableName}:`, err);
      results.push({
        table: tableName,
        rows: 0,
        success: false,
        error: err.message
      });
      errorCount++;
    }
    
    // Small delay between tables
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Save results to file
  const resultsFile = path.join(__dirname, 'data-copy-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  console.log('\n📊 COPY PROCESS COMPLETE');
  console.log('========================');
  console.log(`✅ Successful: ${successCount} tables`);
  console.log(`❌ Errors: ${errorCount} tables`);
  console.log(`📋 Total: ${TABLES_TO_COPY.length} tables`);
  console.log(`💾 Results saved to: ${resultsFile}`);
  
  // Show summary
  console.log('\n📋 DETAILED RESULTS:');
  console.log('====================');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.table}: ${result.rows} rows`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  return results;
}

// Main execution
async function main() {
  console.log('🔄 PRODUCTION TO DEVELOPMENT DATA COPY');
  console.log('=====================================');
  console.log('');
  console.log('⚠️  IMPORTANT: Update the PRODUCTION_CONFIG in this script first!');
  console.log('');
  console.log('You need to provide:');
  console.log('1. Your production database URL');
  console.log('2. Your production service role key');
  console.log('');
  console.log('Edit the PRODUCTION_CONFIG object in this file and run again.');
  
  // Check if production config is set
  if (PRODUCTION_CONFIG.url.includes('YOUR_PRODUCTION_PROJECT') || 
      PRODUCTION_CONFIG.serviceKey.includes('YOUR_PRODUCTION_SERVICE_KEY')) {
    console.log('❌ Please update the PRODUCTION_CONFIG first!');
    console.log('');
    console.log('To get your production details:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Select your production project');
    console.log('3. Go to Settings > API');
    console.log('4. Copy the Project URL and Service Role Key');
    return;
  }
  
  await copyAllData();
}

main().catch(console.error);
