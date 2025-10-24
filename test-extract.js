#!/usr/bin/env node

/**
 * Test script for the extractAllDefinitions functionality
 * This demonstrates extracting definitions from all markdown files
 * 
 * Usage: node test-extract.js <project-directory>
 */

const { extractAllDefinitions } = require('./lib/splitter');
const path = require('path');

async function runTest() {
  const testDir = process.argv[2] || '.';
  
  console.log('='.repeat(60));
  console.log('Testing Definition Extraction');
  console.log('='.repeat(60));
  console.log('');
  
  try {
    const result = await extractAllDefinitions({
      directory: path.resolve(testDir),
      dryRun: false,
      verbose: true
    });
    
    console.log('');
    console.log('='.repeat(60));
    console.log('Test Results');
    console.log('='.repeat(60));
    console.log(`Success: ${result.success}`);
    console.log(`Files Scanned: ${result.filesScanned.length}`);
    console.log(`Definitions Found: ${result.definitionsFound.length}`);
    console.log(`Files Created: ${result.filesCreated.length}`);
    
    if (result.definitionsFound.length > 0) {
      console.log('');
      console.log('Sample Definitions:');
      result.definitionsFound.slice(0, 5).forEach(def => {
        console.log(`  - ${def.term} (from ${def.sourceFile})`);
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

runTest();
