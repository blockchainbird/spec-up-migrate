const fs = require('fs').promises;
const path = require('path');
const { fileExists, safeJsonParse } = require('./utils');

/**
 * Detect if a directory contains a Spec-Up installation
 * @param {string} directory - Directory path to analyze
 * @returns {Object} - Detection result with confidence and recommendations
 */
async function detect(directory = '.') {
  const absoluteDir = path.resolve(directory);
  const checks = [];
  let confidence = 0;
  const recommendations = [];

  // Check for specs.json
  const specsJsonCheck = await checkSpecsJson(absoluteDir);
  checks.push(specsJsonCheck);
  if (specsJsonCheck.found) confidence += 40;

  // Check for package.json with spec-up dependencies
  const packageJsonCheck = await checkPackageJson(absoluteDir);
  checks.push(packageJsonCheck);
  if (packageJsonCheck.found) confidence += 30;

  // Check for index.js with spec-up patterns
  const indexJsCheck = await checkIndexJs(absoluteDir);
  checks.push(indexJsCheck);
  if (indexJsCheck.found) confidence += 20;

  // Check for additional indicators
  const additionalChecks = await checkAdditionalIndicators(absoluteDir);
  checks.push(...additionalChecks);
  confidence += additionalChecks.filter(check => check.found).length * 2.5;

  // Generate verdict and recommendations
  let verdict;
  if (confidence >= 80) {
    verdict = 'Strong Spec-Up installation detected';
  } else if (confidence >= 50) {
    verdict = 'Possible Spec-Up installation';
    if (!specsJsonCheck.found) recommendations.push('Create or verify specs.json configuration');
    if (!packageJsonCheck.found) recommendations.push('Check package.json for spec-up dependencies');
    if (!indexJsCheck.found) recommendations.push('Verify index.js contains spec-up initialization');
  } else {
    verdict = 'Not a Spec-Up installation';
    recommendations.push('Initialize a new Spec-Up project first');
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
 */
async function checkSpecsJson(directory) {
  const specsPath = path.join(directory, 'specs.json');
  
  try {
    const content = await fs.readFile(specsPath, 'utf8');
    const data = safeJsonParse(content);
    
    const hasSpecs = Array.isArray(data.specs) && data.specs.length > 0;
    
    return {
      name: 'specs.json',
      found: true,
      valid: hasSpecs,
      path: specsPath,
      details: hasSpecs ? `Found ${data.specs.length} spec(s)` : 'Empty or invalid specs array'
    };
  } catch (error) {
    return {
      name: 'specs.json',
      found: false,
      valid: false,
      path: specsPath,
      details: 'File not found'
    };
  }
}

/**
 * Check for package.json with spec-up dependencies
 */
async function checkPackageJson(directory) {
  const packagePath = path.join(directory, 'package.json');
  
  try {
    const content = await fs.readFile(packagePath, 'utf8');
    const data = safeJsonParse(content);
    
    const hasSpecUp = (data.dependencies && data.dependencies['spec-up']) ||
                      (data.devDependencies && data.devDependencies['spec-up']);
    
    return {
      name: 'package.json',
      found: true,
      valid: hasSpecUp,
      path: packagePath,
      details: hasSpecUp ? 'Contains spec-up dependency' : 'No spec-up dependency found'
    };
  } catch (error) {
    return {
      name: 'package.json',
      found: false,
      valid: false,
      path: packagePath,
      details: 'File not found'
    };
  }
}

/**
 * Check for index.js with spec-up patterns
 */
async function checkIndexJs(directory) {
  const indexPath = path.join(directory, 'index.js');
  
  try {
    const content = await fs.readFile(indexPath, 'utf8');
    const hasSpecUpPatterns = content.includes('spec-up') || content.includes('SpecUp');
    
    return {
      name: 'index.js',
      found: true,
      valid: hasSpecUpPatterns,
      path: indexPath,
      details: hasSpecUpPatterns ? 'Contains spec-up patterns' : 'No spec-up patterns found'
    };
  } catch (error) {
    return {
      name: 'index.js',
      found: false,
      valid: false,
      path: indexPath,
      details: 'File not found'
    };
  }
}

/**
 * Check for additional Spec-Up indicators
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
      found: exists,
      valid: exists,
      path: indicatorPath,
      details: exists ? indicator.description : 'Not found'
    });
  }

  return results;
}

module.exports = {
  detect,
  checkSpecsJson,
  checkPackageJson,
  checkIndexJs,
  checkAdditionalIndicators
};
