const fs = require('fs').promises;
const path = require('path');
const { fileExists, safeJsonParse } = require('./utils');

/**
 * Update configuration files for Spec-Up-T migration
 * @param {string} directory - Directory path containing Spec-Up installation
 * @param {Object} options - Update options (dryRun: boolean)
 * @returns {Object} - Update result with modified files
 */
async function updateConfigurations(directory = '.', options = {}) {
  const absoluteDir = path.resolve(directory);
  const { dryRun = false } = options;
  
  const updates = [];
  let successful = 0;
  
  // Update package.json
  const packageResult = await updatePackageJson(absoluteDir, dryRun);
  updates.push(packageResult);
  if (packageResult.success) successful++;
  
  // Update specs.json
  const specsResult = await updateSpecsJson(absoluteDir, dryRun);
  updates.push(specsResult);
  if (specsResult.success) successful++;
  
  return {
    directory: absoluteDir,
    updates,
    summary: {
      total: updates.length,
      successful,
      failed: updates.length - successful
    }
  };
}

/**
 * Update package.json for Spec-Up-T
 */
async function updatePackageJson(directory, dryRun) {
  const packagePath = path.join(directory, 'package.json');
  
  try {
    if (!await fileExists(packagePath)) {
      return {
        file: 'package.json',
        success: false,
        error: 'File not found',
        changes: []
      };
    }
    
    const content = await fs.readFile(packagePath, 'utf8');
    const packageData = safeJsonParse(content);
    const changes = [];
    
    // Update dependencies
    if (packageData.dependencies && packageData.dependencies['spec-up']) {
      delete packageData.dependencies['spec-up'];
      packageData.dependencies['spec-up-t'] = '^1.0.0';
      changes.push('Replaced spec-up with spec-up-t dependency');
    }
    
    if (packageData.devDependencies && packageData.devDependencies['spec-up']) {
      delete packageData.devDependencies['spec-up'];
      packageData.devDependencies['spec-up-t'] = '^1.0.0';
      changes.push('Replaced spec-up with spec-up-t dev dependency');
    }
    
    // Update scripts
    if (packageData.scripts) {
      if (packageData.scripts.start) {
        packageData.scripts.start = 'spec-up-t serve';
        changes.push('Updated start script to use spec-up-t');
      }
      
      if (packageData.scripts.build) {
        packageData.scripts.build = 'spec-up-t build';
        changes.push('Updated build script to use spec-up-t');
      }
      
      if (packageData.scripts.dev) {
        packageData.scripts.dev = 'spec-up-t serve --watch';
        changes.push('Updated dev script to use spec-up-t');
      }
    }
    
    // Update main entry point
    if (packageData.main === 'index.js') {
      delete packageData.main;
      changes.push('Removed main entry point (CLI-based now)');
    }
    
    if (!dryRun && changes.length > 0) {
      await fs.writeFile(packagePath, JSON.stringify(packageData, null, 2));
    }
    
    return {
      file: 'package.json',
      success: true,
      changes,
      dryRun
    };
    
  } catch (error) {
    return {
      file: 'package.json',
      success: false,
      error: error.message,
      changes: []
    };
  }
}

/**
 * Update specs.json for Spec-Up-T format
 */
async function updateSpecsJson(directory, dryRun) {
  const specsPath = path.join(directory, 'specs.json');
  
  try {
    if (!await fileExists(specsPath)) {
      return {
        file: 'specs.json',
        success: false,
        error: 'File not found',
        changes: []
      };
    }
    
    const content = await fs.readFile(specsPath, 'utf8');
    const specsData = safeJsonParse(content);
    const changes = [];
    
    // Ensure specs array exists
    if (!Array.isArray(specsData.specs)) {
      specsData.specs = [];
      changes.push('Created specs array');
    }
    
    // Update spec configurations for Spec-Up-T format
    specsData.specs = specsData.specs.map(spec => {
      const updatedSpec = { ...spec };
      
      // Update output paths
      if (updatedSpec.output && updatedSpec.output.includes('docs/')) {
        updatedSpec.output = updatedSpec.output.replace('docs/', 'dist/');
        changes.push(`Updated output path for ${updatedSpec.title || 'spec'}`);
      }
      
      // Add Spec-Up-T specific configurations
      if (!updatedSpec.terminology) {
        updatedSpec.terminology = {
          enabled: true,
          directory: 'terminology'
        };
        changes.push(`Added terminology config for ${updatedSpec.title || 'spec'}`);
      }
      
      return updatedSpec;
    });
    
    // Add Spec-Up-T global configuration
    if (!specsData.global) {
      specsData.global = {
        terminology: {
          enabled: true,
          directory: 'terminology'
        },
        output: {
          directory: 'dist'
        }
      };
      changes.push('Added global Spec-Up-T configuration');
    }
    
    if (!dryRun && changes.length > 0) {
      await fs.writeFile(specsPath, JSON.stringify(specsData, null, 2));
    }
    
    return {
      file: 'specs.json',
      success: true,
      changes,
      dryRun
    };
    
  } catch (error) {
    return {
      file: 'specs.json',
      success: false,
      error: error.message,
      changes: []
    };
  }
}

module.exports = {
  updateConfigurations,
  updatePackageJson,
  updateSpecsJson
};
