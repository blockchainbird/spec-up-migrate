#!/usr/bin/env node

/**
 * @fileoverview Validation functionality for migrated Spec-Up-T projects
 * @module validate
 * @author Kor Dwarshuis
 * @version 1.2.0
 * @since 2024-06-10
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Check if a file exists
 * @param {string} filePath - Path to check for existence
 * @returns {Promise<boolean>} True if file exists, false otherwise
 * @example
 * const exists = await fileExists('./package.json');
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely parse JSON content with fallback
 * @param {string} content - JSON string to parse
 * @returns {Object} Parsed JSON object or empty object if parsing fails
 * @example
 * const config = safeJsonParse(fileContent);
 */
function safeJsonParse(content) {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Validate that a migrated project meets Spec-Up-T requirements
 * @param {string} projectPath - Path to the migrated project directory
 * @returns {Promise<Object>} Validation result with status, errors, warnings, and checked files
 * @throws {Error} When validation operations fail
 * @example
 * // Validate a migrated project
 * const result = await validateMigratedProject('./my-migrated-project');
 * if (result.valid) {
 *   console.log('Project is valid!');
 * } else {
 *   console.log('Errors found:', result.errors);
 * }
 */
async function validateMigratedProject(projectPath) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    checkedFiles: []
  };

  try {
    // Check package.json
    const packagePath = path.join(projectPath, 'package.json');
    if (await fileExists(packagePath)) {
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = safeJsonParse(packageContent);
      
      results.checkedFiles.push('package.json');
      
      // Check for spec-up-t dependency
      if (!packageJson.dependencies || !packageJson.dependencies['spec-up-t']) {
        results.errors.push('Missing spec-up-t dependency in package.json');
        results.valid = false;
      }
      
      // Check for required scripts
      const requiredScripts = ['edit', 'render', 'dev'];
      for (const script of requiredScripts) {
        if (!packageJson.scripts || !packageJson.scripts[script]) {
          results.errors.push(`Missing required script: ${script}`);
          results.valid = false;
        }
      }
    } else {
      results.errors.push('package.json not found');
      results.valid = false;
    }

    // Check specs.json
    const specsPath = path.join(projectPath, 'specs.json');
    if (await fileExists(specsPath)) {
      const specsContent = await fs.readFile(specsPath, 'utf8');
      const specsJson = safeJsonParse(specsContent);
      
      results.checkedFiles.push('specs.json');
      
      if (!specsJson.specs || !Array.isArray(specsJson.specs)) {
        results.errors.push('specs.json missing specs array');
        results.valid = false;
      } else if (specsJson.specs.length > 0) {
        const spec = specsJson.specs[0];
        
        // Check for Spec-Up-T specific fields
        if (!spec.spec_terms_directory) {
          results.warnings.push('Missing spec_terms_directory in specs.json');
        }
        
        if (spec.external_specs && Array.isArray(spec.external_specs) && spec.external_specs.length > 0) {
          const firstExternal = spec.external_specs[0];
          if (!firstExternal.external_spec) {
            results.warnings.push('external_specs may not be in Spec-Up-T format');
          }
        }
      }
    } else {
      results.errors.push('specs.json not found');
      results.valid = false;
    }

    // Check directory structure
    const requiredDirs = [
      'spec',
      'spec/terms-definitions'
    ];
    
    for (const dir of requiredDirs) {
      const dirPath = path.join(projectPath, dir);
      try {
        await fs.access(dirPath);
        results.checkedFiles.push(dir + '/');
      } catch (error) {
        results.warnings.push(`Recommended directory missing: ${dir}`);
      }
    }

    // Check for .env.example
    const envExamplePath = path.join(projectPath, '.env.example');
    if (await fileExists(envExamplePath)) {
      results.checkedFiles.push('.env.example');
    } else {
      results.warnings.push('Missing .env.example file');
    }

  } catch (error) {
    results.errors.push(`Validation error: ${error.message}`);
    results.valid = false;
  }

  return results;
}

// CLI usage
if (require.main === module) {
  const projectPath = process.argv[2] || '.';
  
  console.log(`🔍 Validating Spec-Up-T project at: ${projectPath}`);
  
  validateMigratedProject(projectPath)
    .then(results => {
      console.log(`\n📋 Validation Results:`);
      console.log(`Files checked: ${results.checkedFiles.join(', ')}`);
      
      if (results.errors.length > 0) {
        console.log(`\n❌ Errors (${results.errors.length}):`);
        results.errors.forEach(error => console.log(`  - ${error}`));
      }
      
      if (results.warnings.length > 0) {
        console.log(`\n⚠️  Warnings (${results.warnings.length}):`);
        results.warnings.forEach(warning => console.log(`  - ${warning}`));
      }
      
      if (results.valid && results.warnings.length === 0) {
        console.log(`\n✅ Project validation passed! Ready for Spec-Up-T.`);
      } else if (results.valid) {
        console.log(`\n✅ Project validation passed with warnings.`);
      } else {
        console.log(`\n❌ Project validation failed.`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(`❌ Validation failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { validateMigratedProject };
