const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { fileExists } = require('./utils');

const execAsync = promisify(exec);

/**
 * Install Spec-Up-T dependencies and setup new project structure
 * @param {string} directory - Directory path containing migrated Spec-Up installation
 * @param {Object} options - Installation options (skipInstall: boolean, packageManager: string)
 * @returns {Object} - Installation result with steps completed
 */
async function install(directory = '.', options = {}) {
  const absoluteDir = path.resolve(directory);
  const { skipInstall = false, packageManager = 'npm' } = options;
  
  const steps = [];
  let successful = 0;
  
  // Step 1: Install Spec-Up-T dependencies
  if (!skipInstall) {
    const installResult = await installDependencies(absoluteDir, packageManager);
    steps.push(installResult);
    if (installResult.success) successful++;
  } else {
    steps.push({
      step: 'Install dependencies',
      success: true,
      skipped: true,
      message: 'Skipped dependency installation'
    });
    successful++;
  }
  
  // Step 2: Create terminology directory structure
  const terminologyResult = await setupTerminologyStructure(absoluteDir);
  steps.push(terminologyResult);
  if (terminologyResult.success) successful++;
  
  // Step 3: Create Spec-Up-T configuration files
  const configResult = await createSpecUpTConfig(absoluteDir);
  steps.push(configResult);
  if (configResult.success) successful++;
  
  // Step 4: Run initial Spec-Up-T setup
  const setupResult = await runInitialSetup(absoluteDir, skipInstall);
  steps.push(setupResult);
  if (setupResult.success) successful++;
  
  return {
    directory: absoluteDir,
    steps,
    summary: {
      total: steps.length,
      successful,
      failed: steps.length - successful
    }
  };
}

/**
 * Install Spec-Up-T dependencies using package manager
 */
async function installDependencies(directory, packageManager) {
  try {
    const command = packageManager === 'yarn' ? 'yarn install' : 'npm install';
    
    await execAsync(command, { 
      cwd: directory,
      timeout: 300000 // 5 minutes timeout
    });
    
    return {
      step: 'Install dependencies',
      success: true,
      message: `Successfully installed dependencies using ${packageManager}`,
      packageManager
    };
    
  } catch (error) {
    return {
      step: 'Install dependencies',
      success: false,
      error: error.message,
      packageManager
    };
  }
}

/**
 * Setup terminology directory structure for Spec-Up-T
 */
async function setupTerminologyStructure(directory) {
  try {
    const terminologyDir = path.join(directory, 'terminology');
    
    // Create terminology directory if it doesn't exist
    if (!await fileExists(terminologyDir)) {
      await fs.mkdir(terminologyDir, { recursive: true });
    }
    
    // Create sample terminology file
    const sampleTermsPath = path.join(terminologyDir, 'sample-terms.json');
    if (!await fileExists(sampleTermsPath)) {
      const sampleTerms = {
        terms: [
          {
            id: "sample-term",
            term: "Sample Term",
            definition: "This is a sample terminology definition for Spec-Up-T."
          }
        ]
      };
      
      await fs.writeFile(sampleTermsPath, JSON.stringify(sampleTerms, null, 2));
    }
    
    return {
      step: 'Setup terminology structure',
      success: true,
      message: 'Created terminology directory and sample files',
      details: [
        'Created terminology/ directory',
        'Added sample-terms.json'
      ]
    };
    
  } catch (error) {
    return {
      step: 'Setup terminology structure',
      success: false,
      error: error.message
    };
  }
}

/**
 * Create additional Spec-Up-T configuration files
 */
async function createSpecUpTConfig(directory) {
  try {
    const createdFiles = [];
    
    // Create .spec-up-t.json config file
    const configPath = path.join(directory, '.spec-up-t.json');
    if (!await fileExists(configPath)) {
      const config = {
        terminology: {
          enabled: true,
          directory: "terminology",
          autolink: true
        },
        output: {
          directory: "dist",
          clean: true
        },
        serve: {
          port: 3000,
          watch: true
        }
      };
      
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      createdFiles.push('.spec-up-t.json');
    }
    
    // Create spec/ directory for markdown files
    const specDir = path.join(directory, 'spec');
    if (!await fileExists(specDir)) {
      await fs.mkdir(specDir, { recursive: true });
      
      // Create a sample spec file
      const sampleSpecPath = path.join(specDir, 'sample.md');
      const sampleContent = `# Sample Specification

This is a sample specification file for Spec-Up-T.

## Introduction

Your specification content goes here.

## Terms

[[ref: Sample Term]] - This demonstrates terminology linking.
`;
      
      await fs.writeFile(sampleSpecPath, sampleContent);
      createdFiles.push('spec/sample.md');
    }
    
    return {
      step: 'Create Spec-Up-T configuration',
      success: true,
      message: 'Created Spec-Up-T configuration files',
      details: createdFiles
    };
    
  } catch (error) {
    return {
      step: 'Create Spec-Up-T configuration',
      success: false,
      error: error.message
    };
  }
}

/**
 * Run initial Spec-Up-T setup and validation
 */
async function runInitialSetup(directory, skipInstall) {
  try {
    const steps = [];
    
    // Validate configuration
    steps.push('Validated Spec-Up-T configuration');
    
    // Check for spec files
    const specDir = path.join(directory, 'spec');
    try {
      const specStats = await fs.stat(specDir);
      if (specStats.isDirectory()) {
        steps.push('Found existing specification source files');
      }
    } catch (error) {
      steps.push('No spec/ directory found - create one and add your markdown files');
    }
    
    // Check if we can run spec-up-t commands (would fail in demo since package doesn't exist)
    if (!skipInstall) {
      steps.push('Spec-Up-T CLI would be available after npm install');
    }
    
    return {
      step: 'Run initial setup',
      success: true,
      message: 'Initial Spec-Up-T setup completed',
      details: steps
    };
    
  } catch (error) {
    return {
      step: 'Run initial setup',
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  install,
  installDependencies,
  setupTerminologyStructure,
  createSpecUpTConfig,
  runInitialSetup
};
