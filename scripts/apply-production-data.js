#!/usr/bin/env node

import fs from 'fs';

const SUPABASE_URL = 'https://dtxbrnrpzepwoxooqwlj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTgzODgsImV4cCI6MjA3NDk3NDM4OH0.HEYeT-qEv0AsJ5-zh15xTwtr0V1soQ_3Hp4fzmRnryA';

async function executeSQL(sql, description) {
  console.log(`🔧 ${description}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ sql })
    });

    if (response.ok) {
      console.log(`   ✅ ${description} completed`);
      return await response.text();
    } else {
      const error = await response.text();
      console.log(`   ❌ ${description} failed: ${error}`);
      throw new Error(error);
    }
  } catch (error) {
    console.log(`   ❌ ${description} failed: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🚀 Applying production data to development database...');
  console.log('=======================================================');
  
  try {
    // Read the migration file
    const migrationFile = 'supabase/migrations/20251004193033_import_production_data.sql';
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log(`📋 Migration file: ${migrationFile}`);
    console.log(`📊 SQL length: ${sql.length} characters`);
    
    // Split SQL into chunks to avoid timeout
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    console.log(`📝 Found ${statements.length} SQL statements`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim() + ';';
      if (statement.includes('BEGIN') || statement.includes('COMMIT')) {
        continue; // Skip transaction statements
      }
      
      await executeSQL(statement, `Statement ${i + 1}/${statements.length}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n🎉 Production data import completed successfully!');
    console.log('==================================================');
    console.log('✅ All production data has been imported to development');
    console.log('✅ Development database now mirrors production');
    
  } catch (error) {
    console.log('\n❌ Import failed:');
    console.log('=================');
    console.log(error.message);
    console.log('\n📋 Alternative: Use Supabase Dashboard SQL Editor');
  }
}

main().catch(console.error);