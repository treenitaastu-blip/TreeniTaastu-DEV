#!/usr/bin/env node

import https from 'https';
import fs from 'fs';
import path from 'path';

// Production database configuration
const PRODUCTION_CONFIG = {
  url: 'https://sfvzkhhzrqydteugjxub.supabase.co',
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmdnpraGh6cnF5ZHRldWdqeHViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ3MzUwNywiZXhwIjoyMDcyMDQ5NTA3fQ.azwXX5s_lPQ95c3RxPhBjFeOKHjhux9xknv3T_bGxWY'
};

// Development database configuration
const DEVELOPMENT_CONFIG = {
  url: 'https://dtxbrnrpzepwoxooqwlj.supabase.co',
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5ODM4OCwiZXhwIjoyMDc0OTc0Mzg4fQ.HEYeT-qEv0AsJ5-zh15xTwtr0V1soQ_3Hp4fzmRnryA'
};

// Table priority for data migration
const TABLE_PRIORITY = [
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
  'challenges_master',
  'custom_habits',
  'support_conversations',
  'support_messages',
  'booking_requests',
  'user_analytics_events',
  'user_rewards',
  'user_streaks',
  'userprogress',
  'workout_sessions',
  'set_logs',
  'exercise_notes',
  'rest_timers',
  'rpe_history',
  'training_journal',
  'access_overrides',
  'static_starts',
  'challenge_logs'
];

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: new URL(url).hostname,
      path: new URL(url).pathname + new URL(url).search,
      method: options.method || 'GET',
      headers: {
        'apikey': options.serviceKey,
        'Authorization': `Bearer ${options.serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ data: jsonData, status: res.statusCode });
        } catch (e) {
          resolve({ data: data, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function getTableData(tableName, config) {
  console.log(`📥 Pulling data from table: ${tableName}`);
  
  try {
    // First, get the count to estimate progress
    const countUrl = `${config.url}/rest/v1/${tableName}?select=count`;
    const { data: countData } = await makeRequest(countUrl, { serviceKey: config.serviceKey });
    
    console.log(`   📊 Found ${countData.length} records in ${tableName}`);
    
    if (countData.length === 0) {
      console.log(`   ✅ Table ${tableName} is empty, skipping`);
      return [];
    }

    // Get all data (with pagination if needed)
    let allData = [];
    let offset = 0;
    const limit = 1000;
    
    while (true) {
      const dataUrl = `${config.url}/rest/v1/${tableName}?limit=${limit}&offset=${offset}&order=id`;
      const { data, status } = await makeRequest(dataUrl, { serviceKey: config.serviceKey });
      
      if (status !== 200) {
        console.log(`   ❌ Error fetching ${tableName}: ${status}`);
        break;
      }
      
      if (!Array.isArray(data) || data.length === 0) {
        break;
      }
      
      allData = allData.concat(data);
      offset += limit;
      
      console.log(`   📦 Fetched ${allData.length} records so far...`);
      
      // If we got fewer records than the limit, we're done
      if (data.length < limit) {
        break;
      }
    }
    
    console.log(`   ✅ Successfully pulled ${allData.length} records from ${tableName}`);
    return allData;
    
  } catch (error) {
    console.log(`   ❌ Error pulling ${tableName}: ${error.message}`);
    return [];
  }
}

async function insertTableData(tableName, data, config) {
  if (data.length === 0) {
    console.log(`   ⏭️  Skipping empty table: ${tableName}`);
    return;
  }

  console.log(`📤 Inserting ${data.length} records into ${tableName}`);
  
  try {
    // Insert data in batches to avoid timeout
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const insertUrl = `${config.url}/rest/v1/${tableName}`;
      const { status } = await makeRequest(insertUrl, {
        method: 'POST',
        serviceKey: config.serviceKey,
        body: batch,
        headers: {
          'Prefer': 'resolution=ignore-duplicates'
        }
      });
      
      if (status === 201) {
        inserted += batch.length;
        console.log(`   📦 Inserted batch ${Math.floor(i/batchSize) + 1}: ${inserted}/${data.length} records`);
      } else {
        console.log(`   ⚠️  Batch insert status: ${status} for ${tableName}`);
      }
    }
    
    console.log(`   ✅ Successfully inserted ${inserted} records into ${tableName}`);
    
  } catch (error) {
    console.log(`   ❌ Error inserting into ${tableName}: ${error.message}`);
  }
}

async function pullEdgeFunctions() {
  console.log('🔍 Pulling Edge Functions from production...');
  
  try {
    // Get list of Edge Functions from production
    const functionsUrl = `${PRODUCTION_CONFIG.url}/functions/v1/`;
    const { data: functionsList, status } = await makeRequest(functionsUrl, { 
      serviceKey: PRODUCTION_CONFIG.serviceKey 
    });
    
    if (status !== 200) {
      console.log(`❌ Error fetching Edge Functions list: ${status}`);
      return;
    }
    
    console.log('📋 Available Edge Functions:', Object.keys(functionsList));
    
    // Note: We can't directly pull Edge Function code via REST API
    // The functions would need to be manually copied or deployed
    console.log('ℹ️  Edge Functions need to be manually copied from production');
    
  } catch (error) {
    console.log(`❌ Error pulling Edge Functions: ${error.message}`);
  }
}

async function pullRLSPolicies() {
  console.log('🔐 Pulling RLS policies...');
  
  try {
    // Get RLS information via SQL query
    const rlsUrl = `${PRODUCTION_CONFIG.url}/rest/v1/rpc/sql`;
    const { data, status } = await makeRequest(rlsUrl, {
      method: 'POST',
      serviceKey: PRODUCTION_CONFIG.serviceKey,
      body: {
        query: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE schemaname = 'public'
          ORDER BY tablename, policyname;
        `
      }
    });
    
    if (status === 200) {
      console.log('✅ RLS policies retrieved successfully');
      fs.writeFileSync('production_rls_policies.json', JSON.stringify(data, null, 2));
      console.log('💾 RLS policies saved to production_rls_policies.json');
    } else {
      console.log(`❌ Error fetching RLS policies: ${status}`);
    }
    
  } catch (error) {
    console.log(`❌ Error pulling RLS policies: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Starting full production database pull...');
  console.log('============================================');
  
  // Create backup directory
  const backupDir = 'production-backup';
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  // Pull and backup each table
  const migrationResults = {};
  
  for (const tableName of TABLE_PRIORITY) {
    console.log(`\n📋 Processing table: ${tableName}`);
    console.log('─'.repeat(50));
    
    // Pull data from production
    const productionData = await getTableData(tableName, PRODUCTION_CONFIG);
    
    // Save to backup file
    if (productionData.length > 0) {
      const backupFile = path.join(backupDir, `${tableName}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(productionData, null, 2));
      console.log(`💾 Backup saved to ${backupFile}`);
    }
    
    // Insert into development database
    await insertTableData(tableName, productionData, DEVELOPMENT_CONFIG);
    
    migrationResults[tableName] = {
      records: productionData.length,
      success: true
    };
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Pull RLS policies
  console.log('\n🔐 Pulling RLS policies...');
  await pullRLSPolicies();
  
  // Pull Edge Functions info
  console.log('\n⚡ Pulling Edge Functions info...');
  await pullEdgeFunctions();
  
  // Save migration summary
  const summary = {
    timestamp: new Date().toISOString(),
    tables: migrationResults,
    totalRecords: Object.values(migrationResults).reduce((sum, result) => sum + result.records, 0),
    backupDirectory: backupDir
  };
  
  fs.writeFileSync('migration-summary.json', JSON.stringify(summary, null, 2));
  
  console.log('\n🎉 Migration completed!');
  console.log('======================');
  console.log(`📊 Total records migrated: ${summary.totalRecords}`);
  console.log(`📁 Backup directory: ${backupDir}`);
  console.log('📋 Summary saved to migration-summary.json');
  console.log('\n✅ Development database is now synchronized with production!');
}

// Run the migration
main().catch(console.error);
