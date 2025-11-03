/**
 * @fileoverview Spec-Up installation detection functionality with confidence scoring
 * @module lib/detector
 * @author Kor Dwarshuis
 * @version 1.7.0
 * @since 2024-06-10
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { fileExists, safeJsonParse } = require('./utils');

/**
 * Detect if a directory contains a Spec-Up installation
 * @param {string} directory - Directory path to analyze
 * @returns {Object} - Detection result with confidence and recommendations
 */
async function detect(directory = '.') {
  const absoluteDir = path.resolve(directory);
  
  // Check for environment variable to skip detection
  if (process.env.SKIP_DETECTION === 'true') {
    console.log(chalk.yellow('Detection skipped via SKIP_DETECTION environment variable'));
    return {
      confidence: 100,
      verdict: 'Detection skipped via environment variable',
      checks: [{ description: 'Detection bypassed', found: true }],
      recommendations: [],
      directory: absoluteDir,
      skipped: true
    };
  }
  
  const checks = [];
  let confidence = 0;
  const recommendations = [];

  // Check for specs.json - primary indicator
  const specsJsonCheck = await checkSpecsJson(absoluteDir);
  checks.push(specsJsonCheck);
  if (specsJsonCheck.found && specsJsonCheck.valid) confidence += 40;

  // Check for package.json with spec-up dependencies or patterns
  const packageJsonCheck = await checkPackageJson(absoluteDir);
  checks.push(packageJsonCheck);
  if (packageJsonCheck.found && packageJsonCheck.valid) confidence += 30;

  // Check for index.js with spec-up patterns (optional - may be removed in migrated projects)
  const indexJsCheck = await checkIndexJs(absoluteDir);
  checks.push(indexJsCheck);
  // Only add confidence if found and valid, don't penalize if missing
  if (indexJsCheck.found && indexJsCheck.valid) confidence += 10;

  // Check for additional indicators
  const additionalChecks = await checkAdditionalIndicators(absoluteDir);
  checks.push(...additionalChecks);
  
  // Weighted scoring for additional indicators
  additionalChecks.forEach(check => {
    if (check.found) {
      // gulpfile.js is optional (removed during migration) - lower weight
      if (check.name === 'gulpfile.js') {
        confidence += 5;
      } else {
        confidence += 2.5;
      }
    }
  });

  // Generate verdict and recommendations
  let verdict;
  if (confidence >= 70) {
    verdict = 'Strong Spec-Up installation detected';
  } else if (confidence >= 50) {
    verdict = 'Possible Spec-Up installation';
    if (!specsJsonCheck.found || !specsJsonCheck.valid) {
      recommendations.push('Create or verify specs.json configuration');
    }
    if (!packageJsonCheck.found) {
      recommendations.push('Check package.json exists');
    } else if (!packageJsonCheck.valid) {
      recommendations.push('Add spec-up dependency or spec-up-style scripts to package.json');
    }
  } else {
    verdict = 'Not a Spec-Up installation';
    recommendations.push('Initialize a new Spec-Up project first');
    recommendations.push('Ensure specs.json and package.json are properly configured');
  }

  return {
    directory: absoluteDir,
    confidence: Math.min(100, confidence),
    verdict,
    checks,
    recommendations
  };
}

/**
 * Check for specs.json file and validate its structure
 * @param {string} directory - Directory path to check for specs.json
 * @returns {Promise<Object>} Check result with found/valid status and details
 */
async function checkSpecsJson(directory) {
  const specsPath = path.join(directory, 'specs.json');
  
  try {
    const content = await fs.readFile(specsPath, 'utf8');
    const data = safeJsonParse(content);
    
    const hasSpecs = Array.isArray(data.specs) && data.specs.length > 0;
    
    return {
      name: 'specs.json',
      description: 'specs.json configuration file',
      found: true,
      valid: hasSpecs,
      path: specsPath,
      details: hasSpecs ? `Found ${data.specs.length} spec(s)` : 'Empty or invalid specs array'
    };
  } catch (error) {
    return {
      name: 'specs.json',
      description: 'specs.json configuration file',
      found: false,
      valid: false,
      path: specsPath,
      details: 'File not found'
    };
  }
}

/**
 * Check for package.json with spec-up dependencies
 * @param {string} directory - Directory path to check for package.json
 * @returns {Promise<Object>} Check result with found/valid status and dependency details
 */
async function checkPackageJson(directory) {
  const packagePath = path.join(directory, 'package.json');
  
  try {
    const content = await fs.readFile(packagePath, 'utf8');
    const data = safeJsonParse(content);
    
    // Check for spec-up or spec-up-t dependencies (common in consuming projects)
    const hasSpecUpDependency = (data.dependencies && (data.dependencies['spec-up'] || data.dependencies['spec-up-t'])) ||
                                (data.devDependencies && (data.devDependencies['spec-up'] || data.devDependencies['spec-up-t']));
    
    // Check for spec-up-style scripts (indicates spec-up project even without dependency)
    const scripts = data.scripts || {};
    const hasSpecUpScripts = (scripts.render || scripts.edit || scripts.dev) && 
                            (scripts.render?.includes('spec-up') || 
                             scripts.edit?.includes('spec-up') ||
                             scripts.render?.includes('index') ||
                             scripts.edit?.includes('index'));
    
    // Check if this IS the spec-up tool itself (has typical spec-up dependencies)
    const deps = { ...data.dependencies, ...data.devDependencies };
    const isSpecUpTool = deps['markdown-it'] && deps['gulp'] && 
                        (deps['markdown-it-anchor'] || deps['markdown-it-attrs']);
    
    const isValid = hasSpecUpDependency || hasSpecUpScripts || isSpecUpTool;
    
    let details;
    if (hasSpecUpDependency) {
      const depName = data.dependencies?.['spec-up'] || data.dependencies?.['spec-up-t'] || 
                      data.devDependencies?.['spec-up'] || data.devDependencies?.['spec-up-t'];
      details = `Contains ${depName ? 'spec-up/spec-up-t' : 'spec-up'} dependency`;
    } else if (hasSpecUpScripts) {
      details = 'Contains spec-up-style scripts (render/edit/dev)';
    } else if (isSpecUpTool) {
      details = 'Appears to be spec-up tool itself (has markdown-it + gulp)';
    } else {
      details = 'No spec-up indicators found';
    }
    
    return {
      name: 'package.json',
      description: 'package.json with spec-up indicators',
      found: true,
      valid: isValid,
      path: packagePath,
      details
    };
  } catch (error) {
    return {
      name: 'package.json',
      description: 'package.json with spec-up indicators',
      found: false,
      valid: false,
      path: packagePath,
      details: 'File not found'
    };
  }
}

/**
 * Check for index.js with spec-up patterns
 * @param {string} directory - Directory path to check for index.js
 * @returns {Promise<Object>} Check result with found/valid status and pattern details
 */
async function checkIndexJs(directory) {
  const indexPath = path.join(directory, 'index.js');
  
  try {
    const content = await fs.readFile(indexPath, 'utf8');
    const hasSpecUpPatterns = content.includes('spec-up') || content.includes('SpecUp');
    
    return {
      name: 'index.js',
      description: 'index.js with spec-up patterns',
      found: true,
      valid: hasSpecUpPatterns,
      path: indexPath,
      details: hasSpecUpPatterns ? 'Contains spec-up patterns' : 'No spec-up patterns found'
    };
  } catch (error) {
    return {
      name: 'index.js',
      description: 'index.js with spec-up patterns',
      found: false,
      valid: false,
      path: indexPath,
      details: 'File not found'
    };
  }
}

/**
 * Check for additional Spec-Up indicators
 * @param {string} directory - Directory path to check for additional indicators
 * @returns {Promise<Array<Object>>} Array of check results for additional indicators
 */
async function checkAdditionalIndicators(directory) {
  const indicators = [
    { file: 'gulpfile.js', description: 'Gulp build configuration' },
    { file: 'assets', description: 'Assets directory' },
    { file: 'docs', description: 'Documentation output' },
    { file: '.gitignore', description: 'Git ignore file' }
  ];

  const results = [];

  for (const indicator of indicators) {
    const indicatorPath = path.join(directory, indicator.file);
    const exists = await fileExists(indicatorPath);
    
    results.push({
      name: indicator.file,
      description: indicator.description,
      found: exists,
      valid: exists,
      path: indicatorPath,
      details: exists ? indicator.description : 'Not found'
    });
  }

  return results;
}

/**
 * Find the project root directory by traversing up from the given directory
 * @param {string} startDirectory - Directory to start searching from
 * @returns {Promise<Object>} - Result with found status, root path, and type of project found
 */
async function findProjectRoot(startDirectory = '.') {
  let currentDir = path.resolve(startDirectory);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    // Check for specs.json (Spec-Up-T projects)
    const specsPath = path.join(currentDir, 'specs.json');
    const specsExists = await fileExists(specsPath);
    if (specsExists) {
      try {
        const content = await fs.readFile(specsPath, 'utf8');
        const data = safeJsonParse(content);
        if (Array.isArray(data.specs) && data.specs.length > 0) {
          return {
            found: true,
            root: currentDir,
            type: 'spec-up-t',
            indicator: 'specs.json',
            confidence: 100
          };
        }
      } catch (error) {
        // specs.json exists but is invalid, continue searching
      }
    }

    // Check for package.json with spec-up dependencies
    const packagePath = path.join(currentDir, 'package.json');
    const packageExists = await fileExists(packagePath);
    if (packageExists) {
      try {
        const content = await fs.readFile(packagePath, 'utf8');
        const data = safeJsonParse(content);
        
        // Check for spec-up or spec-up-t dependencies
        const hasSpecUpDependency = (data.dependencies && (data.dependencies['spec-up'] || data.dependencies['spec-up-t'])) ||
                                    (data.devDependencies && (data.devDependencies['spec-up'] || data.devDependencies['spec-up-t']));
        
        // Check for spec-up-style scripts
        const scripts = data.scripts || {};
        const hasSpecUpScripts = (scripts.render || scripts.edit || scripts.dev) && 
                                (scripts.render?.includes('spec-up') || 
                                 scripts.edit?.includes('spec-up') ||
                                 scripts.render?.includes('index') ||
                                 scripts.edit?.includes('index'));
        
        if (hasSpecUpDependency || hasSpecUpScripts) {
          return {
            found: true,
            root: currentDir,
            type: 'spec-up',
            indicator: 'package.json',
            confidence: 90
          };
        }
      } catch (error) {
        // package.json exists but is invalid, continue searching
      }
    }

    // Move up one directory
    currentDir = path.dirname(currentDir);
  }

  return {
    found: false,
    root: null,
    type: null,
    indicator: null,
    confidence: 0
  };
}

module.exports = {
  detect,
  checkSpecsJson,
  checkPackageJson,
  checkIndexJs,
  checkAdditionalIndicators,
  findProjectRoot
};
