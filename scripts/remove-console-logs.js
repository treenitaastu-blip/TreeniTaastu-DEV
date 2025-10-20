#!/usr/bin/env node

/**
 * Script to remove console.log statements from production builds
 * This helps prevent sensitive data exposure in production
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to match console statements
const consolePatterns = [
  /console\.log\s*\([^)]*\)\s*;?/g,
  /console\.warn\s*\([^)]*\)\s*;?/g,
  /console\.info\s*\([^)]*\)\s*;?/g,
  /console\.debug\s*\([^)]*\)\s*;?/g,
];

// Files to exclude from processing
const excludePatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/scripts/**',
  '**/secureLogger.ts'
];

function shouldProcessFile(filePath) {
  return !excludePatterns.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*'));
    return regex.test(filePath);
  });
}

function removeConsoleStatements(content) {
  let modifiedContent = content;
  let hasChanges = false;

  consolePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      hasChanges = true;
      modifiedContent = modifiedContent.replace(pattern, '');
    }
  });

  return { content: modifiedContent, hasChanges };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, hasChanges } = removeConsoleStatements(content);
    
    if (hasChanges) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Processed: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔍 Scanning for console statements...');
  
  // Find all TypeScript and JavaScript files
  const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
    cwd: process.cwd(),
    absolute: true
  });

  let processedCount = 0;
  let totalFiles = 0;

  files.forEach(filePath => {
    if (shouldProcessFile(filePath)) {
      totalFiles++;
      if (processFile(filePath)) {
        processedCount++;
      }
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Total files scanned: ${totalFiles}`);
  console.log(`   Files modified: ${processedCount}`);
  
  if (processedCount > 0) {
    console.log(`\n⚠️  Warning: ${processedCount} files had console statements removed.`);
    console.log(`   Make sure to test your application thoroughly.`);
  } else {
    console.log(`\n✅ No console statements found in source files.`);
  }
}

// Only run if called directly
if (require.main === module) {
  main();
}

module.exports = { removeConsoleStatements, processFile };



