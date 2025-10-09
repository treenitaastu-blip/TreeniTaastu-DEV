#!/usr/bin/env node

import fs from 'fs';
import { spawn } from 'child_process';

const DB_URL = "postgresql://postgres:pajxuD-cikbe8-jovzem@db.dtxbrnrpzepwoxooqwlj.supabase.co:5432/postgres";

async function createProgramdayRecords() {
  console.log('🔧 Creating programday records from userprogress data...');
  
  try {
    // Read userprogress.json
    const userprogressData = JSON.parse(fs.readFileSync('production-backup/userprogress.json', 'utf8'));
    
    // Extract unique programday_id values
    const programdayIds = [...new Set(userprogressData.map(item => item.programday_id))];
    
    console.log(`Found ${programdayIds.length} unique programday_id values`);
    
    if (programdayIds.length === 0) {
      console.log('No programday_id values found');
      return;
    }
    
    // Create SQL to insert programday records
    let sql = `BEGIN;\n`;
    
    for (const programdayId of programdayIds) {
      sql += `INSERT INTO public.programday (id, week, day, exercise1, videolink1, created_at) VALUES ('${programdayId}', 1, 1, 'Exercise 1', 'https://example.com/video1', now()) ON CONFLICT (id) DO NOTHING;\n`;
    }
    
    sql += `COMMIT;\n`;
    
    // Write to temporary file
    const tempFile = '/tmp/create_programday.sql';
    fs.writeFileSync(tempFile, sql);
    
    // Execute SQL
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
        console.log(`✅ Created ${programdayIds.length} programday records`);
        console.log('Programday table now has records referenced by userprogress');
      } else {
        console.log(`❌ Failed: ${error}`);
      }
    });
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

createProgramdayRecords();

