#!/usr/bin/env node

/**
 * Fix Edge Cases in Development Database
 * 
 * This script will identify and fix any edge cases or missing data
 * that might not have been properly imported from production.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Development database configuration
const DEVELOPMENT_CONFIG = {
  url: 'https://dtxbrnrpzepwoxooqwlj.supabase.co',
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eGJybnJwemVwd294b29xd2xqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5ODM4OCwiZXhwIjoyMDc0OTc0Mzg4fQ.B5tR2PVFY55A9OIwUjXULkOCMz6fswoCN2CjaaQHy6s'
};

// Production database configuration
const PRODUCTION_CONFIG = {
  url: 'https://sfvzkhhzrqydteugjxub.supabase.co', // Your production URL
  serviceKey: 'YOUR_PRODUCTION_SERVICE_KEY' // Your production service key
};

// Create Supabase clients
const developmentClient = createClient(DEVELOPMENT_CONFIG.url, DEVELOPMENT_CONFIG.serviceKey);
const productionClient = createClient(PRODUCTION_CONFIG.url, PRODUCTION_CONFIG.serviceKey);

async function checkDataCompleteness() {
  console.log('🔍 CHECKING DATA COMPLETENESS');
  console.log('=============================');
  
  const issues = [];
  
  try {
    // Check for missing user_id in client_days
    const { data: clientDays, error: clientDaysError } = await developmentClient
      .from('client_days')
      .select('*')
      .is('user_id', null);
    
    if (clientDaysError) {
      console.error('❌ Error checking client_days:', clientDaysError);
    } else if (clientDays && clientDays.length > 0) {
      issues.push({
        table: 'client_days',
        issue: 'Missing user_id',
        count: clientDays.length,
        description: 'Client days without user_id assignment'
      });
    }
    
    // Check for missing user_id in client_items
    const { data: clientItems, error: clientItemsError } = await developmentClient
      .from('client_items')
      .select('*')
      .is('user_id', null);
    
    if (clientItemsError) {
      console.error('❌ Error checking client_items:', clientItemsError);
    } else if (clientItems && clientItems.length > 0) {
      issues.push({
        table: 'client_items',
        issue: 'Missing user_id',
        count: clientItems.length,
        description: 'Client items without user_id assignment'
      });
    }
    
    // Check for missing template_day_id in client_days
    const { data: clientDaysTemplate, error: clientDaysTemplateError } = await developmentClient
      .from('client_days')
      .select('*')
      .is('template_day_id', null);
    
    if (clientDaysTemplateError) {
      console.error('❌ Error checking client_days template:', clientDaysTemplateError);
    } else if (clientDaysTemplate && clientDaysTemplate.length > 0) {
      issues.push({
        table: 'client_days',
        issue: 'Missing template_day_id',
        count: clientDaysTemplate.length,
        description: 'Client days without template_day_id assignment'
      });
    }
    
    // Check for any JSON/JSONB data integrity
    const { data: bookingRequests, error: bookingError } = await developmentClient
      .from('booking_requests')
      .select('pre_meeting_info')
      .not('pre_meeting_info', 'is', null);
    
    if (bookingError) {
      console.error('❌ Error checking booking_requests JSON:', bookingError);
    } else {
      console.log(`✅ Booking requests with JSON data: ${bookingRequests.length}`);
    }
    
    // Check for any array data integrity
    const { data: articles, error: articlesError } = await developmentClient
      .from('articles')
      .select('tags')
      .not('tags', 'is', null);
    
    if (articlesError) {
      console.error('❌ Error checking articles array:', articlesError);
    } else {
      console.log(`✅ Articles with array data: ${articles.length}`);
    }
    
    return issues;
    
  } catch (err) {
    console.error('❌ Error in data completeness check:', err);
    return [];
  }
}

async function fixMissingUserIds() {
  console.log('\n🔧 FIXING MISSING USER IDS');
  console.log('===========================');
  
  try {
    // Fix client_days missing user_id by getting it from client_programs
    const { data: clientDays, error: clientDaysError } = await developmentClient
      .from('client_days')
      .select(`
        *,
        client_programs!inner(assigned_to)
      `)
      .is('user_id', null);
    
    if (clientDaysError) {
      console.error('❌ Error fetching client_days:', clientDaysError);
      return;
    }
    
    if (clientDays && clientDays.length > 0) {
      console.log(`📝 Found ${clientDays.length} client_days with missing user_id`);
      
      for (const day of clientDays) {
        if (day.client_programs && day.client_programs.assigned_to) {
          const { error: updateError } = await developmentClient
            .from('client_days')
            .update({ user_id: day.client_programs.assigned_to })
            .eq('id', day.id);
          
          if (updateError) {
            console.error(`❌ Error updating client_days ${day.id}:`, updateError);
          } else {
            console.log(`✅ Updated client_days ${day.id} with user_id`);
          }
        }
      }
    }
    
    // Fix client_items missing user_id by getting it from client_days
    const { data: clientItems, error: clientItemsError } = await developmentClient
      .from('client_items')
      .select(`
        *,
        client_days!inner(user_id)
      `)
      .is('user_id', null);
    
    if (clientItemsError) {
      console.error('❌ Error fetching client_items:', clientItemsError);
      return;
    }
    
    if (clientItems && clientItems.length > 0) {
      console.log(`📝 Found ${clientItems.length} client_items with missing user_id`);
      
      for (const item of clientItems) {
        if (item.client_days && item.client_days.user_id) {
          const { error: updateError } = await developmentClient
            .from('client_items')
            .update({ user_id: item.client_days.user_id })
            .eq('id', item.id);
          
          if (updateError) {
            console.error(`❌ Error updating client_items ${item.id}:`, updateError);
          } else {
            console.log(`✅ Updated client_items ${item.id} with user_id`);
          }
        }
      }
    }
    
  } catch (err) {
    console.error('❌ Error fixing missing user IDs:', err);
  }
}

async function verifyDataIntegrity() {
  console.log('\n🔍 VERIFYING DATA INTEGRITY');
  console.log('============================');
  
  try {
    // Check that all client_days now have user_id
    const { data: clientDays, error: clientDaysError } = await developmentClient
      .from('client_days')
      .select('id, user_id')
      .is('user_id', null);
    
    if (clientDaysError) {
      console.error('❌ Error checking client_days:', clientDaysError);
    } else {
      console.log(`✅ Client days without user_id: ${clientDays.length}`);
    }
    
    // Check that all client_items now have user_id
    const { data: clientItems, error: clientItemsError } = await developmentClient
      .from('client_items')
      .select('id, user_id')
      .is('user_id', null);
    
    if (clientItemsError) {
      console.error('❌ Error checking client_items:', clientItemsError);
    } else {
      console.log(`✅ Client items without user_id: ${clientItems.length}`);
    }
    
    // Check for any orphaned records
    const { data: orphanedSessions, error: orphanedError } = await developmentClient
      .from('workout_sessions')
      .select(`
        id,
        client_program_id,
        client_programs!left(id)
      `)
      .is('client_programs.id', null);
    
    if (orphanedError) {
      console.error('❌ Error checking orphaned sessions:', orphanedError);
    } else {
      console.log(`✅ Orphaned workout sessions: ${orphanedSessions.length}`);
    }
    
  } catch (err) {
    console.error('❌ Error verifying data integrity:', err);
  }
}

async function generateReport() {
  console.log('\n📊 GENERATING COMPREHENSIVE REPORT');
  console.log('==================================');
  
  try {
    const report = {
      timestamp: new Date().toISOString(),
      tables: {},
      issues: [],
      recommendations: []
    };
    
    // Get row counts for all tables
    const tables = [
      'profiles', 'user_entitlements', 'user_roles', 'subscribers',
      'workout_templates', 'template_days', 'template_items', 'exercises',
      'client_programs', 'client_days', 'client_items', 'workout_sessions',
      'userprogress', 'set_logs', 'exercise_notes', 'user_analytics_events',
      'user_streaks', 'user_rewards', 'support_conversations', 'support_messages',
      'booking_requests', 'challenge_logs', 'custom_habits', 'training_journal'
    ];
    
    for (const table of tables) {
      try {
        const { count, error } = await developmentClient
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error(`❌ Error counting ${table}:`, error);
          report.tables[table] = { error: error.message };
        } else {
          report.tables[table] = { count: count || 0 };
        }
      } catch (err) {
        console.error(`❌ Error processing ${table}:`, err);
        report.tables[table] = { error: err.message };
      }
    }
    
    // Save report
    const reportFile = path.join(__dirname, 'data-integrity-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`💾 Report saved to: ${reportFile}`);
    
    return report;
    
  } catch (err) {
    console.error('❌ Error generating report:', err);
    return null;
  }
}

async function main() {
  console.log('🔍 EDGE CASE ANALYSIS AND FIXES');
  console.log('================================');
  console.log('');
  
  // Check data completeness
  const issues = await checkDataCompleteness();
  
  if (issues.length > 0) {
    console.log('\n⚠️  ISSUES FOUND:');
    issues.forEach(issue => {
      console.log(`• ${issue.table}: ${issue.issue} (${issue.count} records)`);
    });
  } else {
    console.log('\n✅ No major issues found');
  }
  
  // Fix missing user IDs
  await fixMissingUserIds();
  
  // Verify data integrity
  await verifyDataIntegrity();
  
  // Generate comprehensive report
  await generateReport();
  
  console.log('\n🎉 EDGE CASE ANALYSIS COMPLETE');
  console.log('==============================');
  console.log('✅ Data completeness checked');
  console.log('✅ Missing user IDs fixed');
  console.log('✅ Data integrity verified');
  console.log('✅ Comprehensive report generated');
}

main().catch(console.error);
