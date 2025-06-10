const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { split, splitGlossaryFile, checkSplittingConditions, getSplitterConfig, updateSpecsJsonAfterSplit } = require('../lib/splitter');

// Test helper to create temporary test directory
async function createTestEnvironment() {
  const testDir = path.join(__dirname, 'temp-splitter-test');
  
  try {
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'spec'), { recursive: true });
    
    // Create test specs.json
    const specsConfig = {
      "specs": [{
        "spec_directory": "./spec",
        "markdown_paths": ["terms-and-definitions-intro.md"],
        "spec_terms_directory": "terms-definitions"
      }]
    };
    
    await fs.writeFile(
      path.join(testDir, 'specs.json'),
      JSON.stringify(specsConfig, null, 2)
    );
    
    // Create test glossary file
    const glossaryContent = `# Terms and Definitions

This is the introduction to our terms.

[[def: Access Control]]
A security mechanism that determines who can access what resources.

[[def: Authentication]]
The process of verifying the identity of a user or system.

[[def: Authorization, authZ]]
The process of determining what actions a user is allowed to perform.

[[def: Multi-Factor Authentication, MFA]]
An authentication method that requires multiple forms of verification.
`;
    
    await fs.writeFile(
      path.join(testDir, 'spec', 'terms-and-definitions-intro.md'),
      glossaryContent
    );
    
    return testDir;
  } catch (error) {
    throw new Error(`Failed to create test environment: ${error.message}`);
  }
}

// Clean up test environment
async function cleanupTestEnvironment(testDir) {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Warning: Could not clean up test directory: ${error.message}`);
  }
}

describe('Splitter Integration', () => {
  let testDir;
  
  beforeEach(async () => {
    testDir = await createTestEnvironment();
  });
  
  afterEach(async () => {
    if (testDir) {
      await cleanupTestEnvironment(testDir);
    }
  });

  test('getSplitterConfig should read configuration correctly', async () => {
    const config = await getSplitterConfig(testDir);
    
    expect(config.sourceTermsFile).toContain('terms-and-definitions-intro.md');
    expect(config.termFilesDir).toContain('terms-definitions');
    expect(config.specDirectory).toBe('./spec');
    expect(config.markdownPaths).toEqual(['terms-and-definitions-intro.md']);
  });

  test('checkSplittingConditions should validate prerequisites', async () => {
    const config = await getSplitterConfig(testDir);
    const conditions = await checkSplittingConditions(config.sourceTermsFile, config.termFilesDir, testDir);
    
    expect(conditions.specsJsonExists).toBe(true);
    expect(conditions.sourceFileExists).toBe(true);
    expect(conditions.outputDirSafe).toBe(true);
    expect(conditions.canProceed).toBe(true);
    expect(conditions.messages).toContain('✅ All conditions met. Ready to split.');
  });

  test('splitGlossaryFile should split terms correctly in dry run', async () => {
    const config = await getSplitterConfig(testDir);
    const result = await splitGlossaryFile(config.sourceTermsFile, config.termFilesDir, {
      dryRun: true,
      verbose: true,
      projectDir: testDir
    });
    
    expect(result.success).toBe(true);
    expect(result.filesCreated.length).toBeGreaterThan(0);
    expect(result.messages.some(msg => msg.includes('Would create'))).toBe(true);
    
    // Check that expected files would be created
    expect(result.filesCreated.some(file => file.includes('access-control.md'))).toBe(true);
    expect(result.filesCreated.some(file => file.includes('authentication.md'))).toBe(true);
    expect(result.filesCreated.some(file => file.includes('authorization.md'))).toBe(true);
    expect(result.filesCreated.some(file => file.includes('multi-factor-authentication.md'))).toBe(true);
  });

  test('splitGlossaryFile should actually create files when not in dry run', async () => {
    const config = await getSplitterConfig(testDir);
    const result = await splitGlossaryFile(config.sourceTermsFile, config.termFilesDir, {
      dryRun: false,
      verbose: true,
      projectDir: testDir
    });
    
    expect(result.success).toBe(true);
    expect(result.filesCreated.length).toBeGreaterThan(0);
    expect(result.backupCreated).toBe(true);
    
    // Check that files were actually created
    const termsDir = config.termFilesDir;
    const files = await fs.readdir(termsDir);
    
    expect(files).toContain('access-control.md');
    expect(files).toContain('authentication.md');
    expect(files).toContain('authorization.md');
    expect(files).toContain('multi-factor-authentication.md');
    
    // Check content of one file
    const authContent = await fs.readFile(path.join(termsDir, 'authentication.md'), 'utf8');
    expect(authContent).toContain('[[def: Authentication]]');
    expect(authContent).toContain('The process of verifying the identity');
  });

  test('split function should handle the complete process', async () => {
    const result = await split({
      directory: testDir,
      dryRun: false,
      verbose: true
    });
    
    expect(result.success).toBe(true);
    expect(result.filesCreated.length).toBeGreaterThan(0);
    
    // Verify backup was created
    const backupExists = fsSync.existsSync(path.join(testDir, 'specs.unsplit.json'));
    expect(backupExists).toBe(true);
  });

  test('should handle missing specs.json gracefully', async () => {
    // Remove specs.json
    await fs.unlink(path.join(testDir, 'specs.json'));
    
    await expect(split({ directory: testDir })).rejects.toThrow('Failed to read splitter configuration');
  });

  test('should prevent overwriting existing term files', async () => {
    const config = await getSplitterConfig(testDir);
    
    // Create terms directory with existing files
    await fs.mkdir(config.termFilesDir, { recursive: true });
    await fs.writeFile(path.join(config.termFilesDir, 'test.md'), 'existing content');
    
    const conditions = await checkSplittingConditions(config.sourceTermsFile, config.termFilesDir, testDir);
    expect(conditions.canProceed).toBe(false);
    expect(conditions.messages.some(msg => msg.includes('There are .md files in the directory'))).toBe(true);
  });

  test('should remove source terms file from markdown_paths after splitting', async () => {
    const config = await getSplitterConfig(testDir);
    
    // Verify source file is initially in markdown_paths
    let specsContent = await fs.readFile(path.join(testDir, 'specs.json'), 'utf8');
    let specs = JSON.parse(specsContent);
    const initialMarkdownPaths = specs.specs[0].markdown_paths;
    expect(initialMarkdownPaths).toContain('terms-and-definitions-intro.md');
    
    // Perform the split
    const result = await splitGlossaryFile(config.sourceTermsFile, config.termFilesDir, {
      dryRun: false,
      verbose: true,
      projectDir: testDir
    });
    
    expect(result.success).toBe(true);
    expect(result.messages.some(msg => msg.includes('Removed \'terms-and-definitions-intro.md\' from markdown_paths'))).toBe(true);
    expect(result.messages.some(msg => msg.includes('Updated specs.json to remove source terms file from markdown_paths'))).toBe(true);
    
    // Verify source file was removed from markdown_paths
    specsContent = await fs.readFile(path.join(testDir, 'specs.json'), 'utf8');
    specs = JSON.parse(specsContent);
    const updatedMarkdownPaths = specs.specs[0].markdown_paths;
    expect(updatedMarkdownPaths).not.toContain('terms-and-definitions-intro.md');
    
    // Verify backup still contains original configuration
    const backupContent = await fs.readFile(path.join(testDir, 'specs.unsplit.json'), 'utf8');
    const backupSpecs = JSON.parse(backupContent);
    expect(backupSpecs.specs[0].markdown_paths).toContain('terms-and-definitions-intro.md');
  });

  test('updateSpecsJsonAfterSplit should handle dry run correctly', async () => {
    const config = await getSplitterConfig(testDir);
    
    // Test dry run
    const dryRunResult = await updateSpecsJsonAfterSplit(config.sourceTermsFile, testDir, true);
    expect(dryRunResult.success).toBe(true);
    expect(dryRunResult.messages.some(msg => msg.includes('Would remove'))).toBe(true);
    expect(dryRunResult.messages.some(msg => msg.includes('Dry run - specs.json would be updated'))).toBe(true);
    
    // Verify specs.json was not actually modified
    const specsContent = await fs.readFile(path.join(testDir, 'specs.json'), 'utf8');
    const specs = JSON.parse(specsContent);
    expect(specs.specs[0].markdown_paths).toContain('terms-and-definitions-intro.md');
  });
});

describe('Splitter Edge Cases', () => {
  test('should handle terms with special characters', () => {
    const testContent = `[[def: Test/Term, alt-name]]
Definition with special characters.

[[def: Another Term]]
Another definition.`;
    
    const termsRegex = /\[\[def: (.*?)\]\]/g;
    const matches = [...testContent.matchAll(termsRegex)];
    const terms = matches.map(match => match[1]);
    
    const fileNames = terms.map(term => {
      const termWithoutComma = term.split(",")[0];
      return `${termWithoutComma.replace(/,/g, '').replace(/\//g, '-').replace(/ /g, '-').toLowerCase()}`;
    });
    
    expect(fileNames).toContain('test-term');
    expect(fileNames).toContain('another-term');
  });
});

// Manual test runner for CLI testing
if (require.main === module) {
  console.log('Running splitter tests manually...');
  
  (async () => {
    try {
      const testDir = await createTestEnvironment();
      console.log(`Test environment created at: ${testDir}`);
      
      // Test the split function
      const result = await split({
        directory: testDir,
        dryRun: false,
        verbose: true
      });
      
      console.log('Split result:', result);
      
      // List created files
      const config = await getSplitterConfig(testDir);
      const files = await fs.readdir(config.termFilesDir);
      console.log('Created files:', files);
      
      // Clean up
      await cleanupTestEnvironment(testDir);
      console.log('Test completed successfully!');
      
    } catch (error) {
      console.error('Test failed:', error);
      process.exit(1);
    }
  })();
}
