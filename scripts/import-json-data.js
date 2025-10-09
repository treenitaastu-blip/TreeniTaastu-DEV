#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://dtxbrnrpzepwoxooqwlj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTgzODgsImV4cCI6MjA3NDk3NDM4OH0.HEYeT-qEv0AsJ5-zh15xTwtr0V1soQ_3Hp4fzmRnryA';

async function importTable(tableName, data) {
  console.log(`📥 Importing ${tableName} (${data.length} records)...`);
  
  try {
    // Import in batches to avoid timeout
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Prefer': 'resolution=ignore-duplicates'
        },
        body: JSON.stringify(batch)
      });

      if (response.ok) {
        imported += batch.length;
        console.log(`   ✅ Batch imported: ${imported}/${data.length} records`);
      } else {
        const error = await response.text();
        console.log(`   ❌ Batch failed: ${error}`);
        // Continue with next batch
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`   🎉 ${tableName} import completed: ${imported}/${data.length} records`);
    return imported;
    
  } catch (error) {
    console.log(`   ❌ ${tableName} import failed: ${error.message}`);
    return 0;
  }
}

async function main() {
  console.log('🚀 Importing production JSON data to development database...');
  console.log('=============================================================');
  
  const backupDir = 'production-backup';
  
  if (!fs.existsSync(backupDir)) {
    console.log('❌ Backup directory not found:', backupDir);
    return;
  }
  
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
  console.log(`📁 Found ${files.length} JSON files to import`);
  
  // Import order based on dependencies
  const importOrder = [
    'profiles.json',
    'user_roles.json', 
    'user_entitlements.json',
    'subscribers.json',
    'workout_templates.json',
    'template_days.json',
    'template_items.json',
    'client_programs.json',
    'client_days.json',
    'client_items.json',
    'exercises.json',
    'articles.json',
    'custom_habits.json',
    'user_streaks.json',
    'userprogress.json',
    'workout_sessions.json',
    'set_logs.json',
    'exercise_notes.json',
    'training_journal.json',
    'challenge_logs.json',
    'support_conversations.json',
    'support_messages.json',
    'booking_requests.json',
    'user_analytics_events.json'
  ];
  
  let totalImported = 0;
  
  for (const filename of importOrder) {
    if (files.includes(filename)) {
      const filepath = path.join(backupDir, filename);
      const tableName = filename.replace('.json', '');
      
      try {
        const jsonData = fs.readFileSync(filepath, 'utf8');
        const data = JSON.parse(jsonData);
        
        if (Array.isArray(data)) {
          const imported = await importTable(tableName, data);
          totalImported += imported;
        } else {
          console.log(`   ⚠️  Skipping ${filename}: Not an array`);
        }
      } catch (error) {
        console.log(`   ❌ Failed to read ${filename}: ${error.message}`);
      }
    }
  }
  
  console.log('\n🎉 JSON import completed!');
  console.log('==========================');
  console.log(`✅ Total records imported: ${totalImported}`);
  console.log('✅ Development database now has production data');
  console.log('✅ Test your application with real data');
}

main().catch(console.error);

