const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Applying programs system migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250115_manual_programs_data.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      return;
    }
    
    console.log('Migration applied successfully!');
    
    // Verify the tables exist
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('*')
      .limit(1);
    
    if (programsError) {
      console.error('Error verifying programs table:', programsError);
    } else {
      console.log('Programs table verified:', programs?.length || 0, 'programs found');
    }
    
  } catch (error) {
    console.error('Error applying migration:', error);
  }
}

applyMigration();
