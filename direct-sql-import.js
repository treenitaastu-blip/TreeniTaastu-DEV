#!/usr/bin/env node

import https from 'https';
import fs from 'fs';
import path from 'path';

// Development database configuration
const DEVELOPMENT_CONFIG = {
  url: 'https://dtxbrnrpzepwoxooqwlj.supabase.co',
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5ODM4OCwiZXhwIjoyMDc0OTc0Mzg4fQ.HEYeT-qEv0AsJ5-zh15xTwtr0V1soQ_3Hp4fzmRnryA'
};

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

async function executeSQL(query) {
  console.log('🔧 Executing SQL query...');
  
  try {
    const sqlUrl = `${DEVELOPMENT_CONFIG.url}/rest/v1/rpc/exec_sql`;
    const { data, status } = await makeRequest(sqlUrl, {
      method: 'POST',
      serviceKey: DEVELOPMENT_CONFIG.serviceKey,
      body: { query }
    });
    
    if (status === 200) {
      console.log('✅ SQL executed successfully');
      return { success: true, data };
    } else {
      console.log(`❌ SQL execution failed: ${status}`);
      return { success: false, status, data };
    }
    
  } catch (error) {
    console.log(`❌ Error executing SQL: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function importTableData(tableName, data) {
  if (data.length === 0) {
    console.log(`⏭️  Skipping empty table: ${tableName}`);
    return;
  }

  console.log(`📤 Importing ${data.length} records into ${tableName}...`);
  
  try {
    // Create INSERT statements
    const columns = Object.keys(data[0]);
    const values = data.map(row => {
      const rowValues = columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        return value;
      });
      return `(${rowValues.join(', ')})`;
    }).join(',\n  ');
    
    const insertQuery = `INSERT INTO public.${tableName} (${columns.join(', ')})
VALUES
  ${values}
ON CONFLICT DO NOTHING;`;

    const result = await executeSQL(insertQuery);
    
    if (result.success) {
      console.log(`✅ Successfully imported ${data.length} records into ${tableName}`);
      return data.length;
    } else {
      console.log(`❌ Failed to import ${tableName}: ${result.status || result.error}`);
      return 0;
    }
    
  } catch (error) {
    console.log(`❌ Error importing ${tableName}: ${error.message}`);
    return 0;
  }
}

async function main() {
  console.log('🚀 Direct SQL import to development database...');
  console.log('===============================================');
  
  const backupDir = 'production-backup';
  if (!fs.existsSync(backupDir)) {
    console.log('❌ Backup directory not found. Run pull-production-database.js first.');
    return;
  }
  
  // First, disable RLS temporarily
  console.log('🔓 Disabling RLS temporarily...');
  const disableRLS = await executeSQL('SET session_replication_role = replica;');
  
  if (!disableRLS.success) {
    console.log('❌ Failed to disable RLS. Aborting.');
    return;
  }
  
  const results = {};
  let totalImported = 0;
  
  // Process tables in dependency order
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
    
    console.log(`\n📋 Processing ${tableName}...`);
    
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const imported = await importTableData(tableName, data);
      
      results[tableName] = {
        records: data.length,
        imported: imported,
        success: imported > 0
      };
      
      totalImported += imported;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`❌ Error processing ${tableName}: ${error.message}`);
      results[tableName] = {
        records: 0,
        imported: 0,
        success: false,
        error: error.message
      };
    }
  }
  
  // Re-enable RLS
  console.log('\n🔒 Re-enabling RLS...');
  await executeSQL('SET session_replication_role = DEFAULT;');
  
  // Save results
  const summary = {
    timestamp: new Date().toISOString(),
    tables: results,
    totalRecords: Object.values(results).reduce((sum, result) => sum + result.records, 0),
    totalImported: totalImported,
    successRate: totalImported / Object.values(results).reduce((sum, result) => sum + result.records, 0) * 100
  };
  
  fs.writeFileSync('direct-import-summary.json', JSON.stringify(summary, null, 2));
  
  console.log('\n🎉 Direct import completed!');
  console.log('===========================');
  console.log(`📊 Total records processed: ${summary.totalRecords}`);
  console.log(`📤 Total records imported: ${totalImported}`);
  console.log(`📈 Success rate: ${summary.successRate.toFixed(1)}%`);
  console.log('📋 Summary saved to direct-import-summary.json');
  
  if (totalImported > 0) {
    console.log('\n✅ Development database now contains production data!');
  } else {
    console.log('\n⚠️  No data was imported. Check the logs above for errors.');
  }
}

main().catch(console.error);

