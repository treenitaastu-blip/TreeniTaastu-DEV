#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const DB_URL = "postgresql://postgres:pajxuD-cikbe8-jovzem@db.dtxbrnrpzepwoxooqwlj.supabase.co:5432/postgres";

async function importJSONFile(tableName, filePath) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Importing ${tableName}...`);
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`   Found ${data.length} records`);
    
    if (data.length === 0) {
      console.log(`   ⚠️  No data to import`);
      resolve(0);
      return;
    }
    
    // Create a temporary SQL file
    const tempFile = `/tmp/${tableName}_import.sql`;
    let sql = `BEGIN;\n`;
    sql += `TRUNCATE TABLE public.${tableName} CASCADE;\n`;
    
    for (const record of data) {
      const columns = Object.keys(record);
      const values = columns.map(col => {
        const value = record[col];
        if (value === null) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        return value;
      });
      
      sql += `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    
    sql += `COMMIT;\n`;
    
    fs.writeFileSync(tempFile, sql);
    
    const psql = spawn('psql', [DB_URL, '-f', tempFile]);
    
    let output = '';
    let error = '';
    
    psql.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    psql.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    psql.on('close', (code) => {
      fs.unlinkSync(tempFile);
      
      if (code === 0) {
        console.log(`   ✅ Imported ${data.length} records`);
        resolve(data.length);
      } else {
        console.log(`   ❌ Failed: ${error}`);
        reject(new Error(error));
      }
    });
  });
}

async function main() {
  console.log('🚀 Importing production data to development database...');
  console.log('=======================================================');
  
  const backupDir = 'production-backup';
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
  
  // Import order based on dependencies
  const importOrder = [
    'user_roles.json',
    'profiles.json',
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
        const imported = await importJSONFile(tableName, filepath);
        totalImported += imported;
      } catch (error) {
        console.log(`   ⚠️  Skipping ${filename}: ${error.message}`);
      }
    }
  }
  
  console.log('\n🎉 Data import completed!');
  console.log('==========================');
  console.log(`✅ Total records imported: ${totalImported}`);
  console.log('✅ Development database now has production data');
}

main().catch(console.error);

