const { updateConfigurations } = require('./lib/updater');
const { validateMigratedProject } = require('./validate');
const path = require('path');

async function debugValidation() {
  try {
    const testDir = path.join(__dirname, 'test-temp');
    console.log('Testing project validation...');
    console.log('Test directory:', testDir);
    
    // First set up the project
    console.log('Setting up test project...');
    const updateResult = await updateConfigurations(testDir, { dryRun: false });
    console.log('Update result summary:', updateResult.summary);
    console.log('Update details:');
    updateResult.updates.forEach((update, index) => {
      console.log(`  ${index + 1}. ${update.file}: ${update.success ? 'SUCCESS' : 'FAILED'}`);
      if (!update.success && update.error) {
        console.log(`     Error: ${update.error}`);
      }
      if (update.changes && update.changes.length > 0) {
        console.log(`     Changes: ${update.changes}`);
      }
    });
    
    // Check what files exist
    const fs = require('fs').promises;
    try {
      const files = await fs.readdir(testDir);
      console.log('Files in test directory:', files);
    } catch (error) {
      console.log('Could not read test directory:', error.message);
    }
    
    // Then validate it
    console.log('\nValidating project...');
    const result = await validateMigratedProject(testDir);
    
    console.log('\n=== VALIDATION RESULTS ===');
    console.log('Valid:', result.valid);
    console.log('Checked files:', result.checkedFiles);
    console.log('Errors:', result.errors);
    console.log('Warnings:', result.warnings);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugValidation();
