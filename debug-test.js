const { updateConfigurations } = require('./lib/updater');
const path = require('path');

async function debugTest() {
  try {
    const testDir = path.join(__dirname, 'test-temp');
    console.log('Testing updateConfigurations in dry-run mode...');
    
    const result = await updateConfigurations(testDir, { dryRun: true });
    
    console.log('\n=== SUMMARY ===');
    console.log('Total operations:', result.summary.total);
    console.log('Successful operations:', result.summary.successful);
    console.log('Failed operations:', result.summary.failed);
    
    console.log('\n=== DETAILED RESULTS ===');
    result.updates.forEach((update, index) => {
      console.log(`${index + 1}. ${update.file}: ${update.success ? 'SUCCESS' : 'FAILED'}`);
      if (!update.success && update.error) {
        console.log(`   Error: ${update.error}`);
      }
      if (update.changes && update.changes.length > 0) {
        console.log(`   Changes: ${update.changes.length} item(s)`);
      }
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

debugTest();
