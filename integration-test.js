const { updateConfigurations } = require('./lib/updater');
const path = require('path');
const fs = require('fs').promises;

async function testFullWorkflow() {
  try {
    const testDir = path.join(__dirname, 'integration-test');
    console.log('Testing full integration with GitHub files...');
    
    // Run the configuration update to create files
    const result = await updateConfigurations(testDir, { dryRun: false });
    
    console.log('\n=== UPDATE RESULTS ===');
    console.log(`Operations: ${result.summary.successful}/${result.summary.total} successful`);
    
    // Check if GitHub files were created
    try {
      const githubWorkflowsDir = path.join(testDir, '.github/workflows');
      const workflowFiles = await fs.readdir(githubWorkflowsDir);
      console.log(`\n✅ Created ${workflowFiles.length} GitHub workflow files:`);
      workflowFiles.forEach(file => console.log(`  - ${file}`));
    } catch (error) {
      console.log('❌ No GitHub workflow files found:', error.message);
    }
    
    // Check if all expected directories exist
    const expectedDirs = ['.github', '.github/workflows', 'spec', 'spec/terms-definitions', 'assets'];
    console.log('\n=== DIRECTORY CHECK ===');
    for (const dir of expectedDirs) {
      try {
        await fs.access(path.join(testDir, dir));
        console.log(`✅ ${dir}`);
      } catch (error) {
        console.log(`❌ ${dir} - missing`);
      }
    }
    
    // Clean up
    await fs.rmdir(testDir, { recursive: true });
    console.log('\n🧹 Cleaned up test directory');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
  }
}

testFullWorkflow();
