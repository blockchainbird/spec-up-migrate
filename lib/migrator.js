/**
 * @fileoverview Core migration functionality for Spec-Up to Spec-Up-T migration
 * @module lib/migrator
 * @author Kor Dwarshuis
 * @version 1.2.0
 * @since 2024-06-10
 */

const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

// Import modular components
const { detect } = require('./detector');
const { backup } = require('./backup');
const { cleanup } = require('./cleanup');
const { updateConfigurations } = require('./updater');
const { install } = require('./installer');
const { processDefinitions } = require('./splitter');
const { isSpecUpFile, processContent } = require('./utils');

/**
 * Main migration function - migrates files or directories from Spec-Up to Spec-Up-T
 * @param {string} source - Source file or directory path
 * @param {Object} options - Migration options
 * @param {string} [options.output='./migrated'] - Output directory path
 * @param {string} [options.format='latest'] - Target format version
 * @param {boolean} [options.dryRun=false] - Whether to perform a dry run
 * @throws {Error} When source path doesn't exist or migration fails
 * @example
 * // Migrate a single file
 * await migrate('./spec.md', { output: './output' });
 * 
 * // Migrate a directory with dry run
 * await migrate('./spec-project', { dryRun: true });
 */
async function migrate(source, options = {}) {
  const { output = './migrated', format = 'latest', dryRun = false } = options;

  // Resolve absolute paths
  const absoluteSource = path.resolve(source);
  const absoluteOutput = path.resolve(output);

  // Check if source exists
  try {
    await fs.access(absoluteSource);
  } catch (error) {
    throw new Error(`Source path does not exist: ${absoluteSource}`);
  }

  // Get source stats
  const stats = await fs.stat(absoluteSource);
  
  if (stats.isFile()) {
    await migrateFile(absoluteSource, absoluteOutput, format, dryRun);
  } else if (stats.isDirectory()) {
    await migrateDirectory(absoluteSource, absoluteOutput, format, dryRun);
  } else {
    throw new Error(`Invalid source type: ${absoluteSource}`);
  }
}

/**
 * Migrate a single file
 * @param {string} filePath - Path to the file
 * @param {string} outputDir - Output directory
 * @param {string} format - Target format
 * @param {boolean} dryRun - Whether this is a dry run
 */
/**
 * Migrate a single file
 * @param {string} filePath - Path to the file to migrate
 * @param {string} outputDir - Output directory path
 * @param {string} format - Target format for migration
 * @param {boolean} dryRun - Whether this is a dry run
 * @throws {Error} When file operations fail
 */
async function migrateFile(filePath, outputDir, format, dryRun) {
  console.log(chalk.gray(`  Migrating file: ${filePath}`));
  
  if (!dryRun) {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Resolve absolute path for the source file
    const absoluteFilePath = path.resolve(filePath);
    
    // Check if it's a Spec-Up file
    if (isSpecUpFile(path.basename(filePath))) {
      // Read and process the file
      const content = await fs.readFile(absoluteFilePath, 'utf8');
      const processedContent = await processContent(content, format);
      
      // Write to output
      const outputPath = path.join(outputDir, path.basename(filePath));
      await fs.writeFile(outputPath, processedContent);
      console.log(chalk.green(`  ✓ Migrated: ${path.basename(filePath)}`));
    } else {
      // Copy non-Spec-Up files as-is
      const outputPath = path.join(outputDir, path.basename(filePath));
      await fs.copyFile(absoluteFilePath, outputPath);
      console.log(chalk.blue(`  → Copied: ${path.basename(filePath)}`));
    }
  }
}

/**
 * Migrate a directory
 * @param {string} dirPath - Path to the directory
 * @param {string} outputDir - Output directory
 * @param {string} format - Target format
 * @param {boolean} dryRun - Whether this is a dry run
 */
async function migrateDirectory(dirPath, outputDir, format, dryRun) {
  console.log(chalk.blue(`Migrating directory: ${dirPath}`));
  
  if (!dryRun) {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
  }
  
  // Read directory contents
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    // Skip files and directories starting with an underscore
    if (entry.name.startsWith('_')) {
      continue;
    }
    const sourcePath = path.join(dirPath, entry.name);
    const targetPath = path.join(outputDir, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively migrate subdirectories
      await migrateDirectory(sourcePath, targetPath, format, dryRun);
    } else if (entry.isFile()) {
      // Migrate individual files
      await migrateFile(sourcePath, outputDir, format, dryRun);
    }
  }
}

/**
 * Validate a Spec-Up specification for migration readiness
 * @param {string} source - Source file or directory path to validate
 * @throws {Error} When source path doesn't exist or validation fails
 * @example
 * // Validate a single file
 * await validate('./spec.md');
 * 
 * // Validate a directory
 * await validate('./my-spec-project');
 */
async function validate(source) {
  const absoluteSource = path.resolve(source);
  
  try {
    await fs.access(absoluteSource);
  } catch (error) {
    throw new Error(`Source path does not exist: ${absoluteSource}`);
  }
  
  const stats = await fs.stat(absoluteSource);
  
  if (stats.isFile()) {
    if (!isSpecUpFile(absoluteSource)) {
      throw new Error('File does not appear to be a Spec-Up file');
    }
    console.log(chalk.green('✓ Valid Spec-Up file'));
  } else if (stats.isDirectory()) {
    const detection = await detect(absoluteSource);
    if (detection.confidence < 50) {
      throw new Error('Directory does not contain a valid Spec-Up installation');
    }
    console.log(chalk.green(`✓ Valid Spec-Up installation (${detection.confidence}% confidence)`));
  }
}

/**
 * Complete migration process - runs all phases in sequence
 * @param {string} directory - Directory path containing Spec-Up installation
 * @param {Object} options - Migration options
 * @returns {Object} - Complete migration result
 */
async function completeMigration(directory = '.', options = {}) {
  const absoluteDir = path.resolve(directory);
  const { dryRun = false, skipBackup = false, skipInstall = false, skipDetection = false } = options;
  
  const phases = [];
  let overallSuccess = true;
  
  try {
    // Phase 1: Detection (can be skipped)
    if (!skipDetection) {
      console.log(chalk.blue('Phase 1: Detecting Spec-Up installation...'));
      const detection = await detect(absoluteDir);
      phases.push({ name: 'Detection', result: detection, success: detection.confidence >= 80 });
      
      if (detection.confidence < 80) {
        throw new Error('Directory does not appear to contain a valid Spec-Up installation');
      }
    } else {
      console.log(chalk.yellow('Phase 1: Detection skipped - assuming valid Spec-Up installation'));
      phases.push({ 
        name: 'Detection', 
        result: { confidence: 100, message: 'Skipped by user request' }, 
        success: true,
        skipped: true
      });
    }

    // Phase 2: Backup (optional)
    if (!skipBackup && !dryRun) {
      console.log(chalk.blue('Phase 2: Creating backups...'));
      const backupResult = await backup(absoluteDir);
      phases.push({ name: 'Backup', result: backupResult, success: backupResult.summary.backed_up > 0 });
    }
    
    // Phase 3: Cleanup
    console.log(chalk.blue('Phase 3: Cleaning up obsolete files...'));
    const cleanupResult = await cleanup(absoluteDir, { dryRun });
    phases.push({ name: 'Cleanup', result: cleanupResult, success: true });
    
    // Phase 4: Update configurations
    console.log(chalk.blue('Phase 4: Updating configurations...'));
    const updateResult = await updateConfigurations(absoluteDir, { dryRun });
    phases.push({ name: 'Update Configurations', result: updateResult, success: updateResult.summary.successful > 0 });
    
    // Phase 5: Process definitions (extract and convert to iref)
    console.log(chalk.blue('Phase 5: Processing definitions (extract and convert)...'));
    try {
      const processResult = await processDefinitions({ 
        directory: absoluteDir, 
        dryRun, 
        verbose: false 
      });
      phases.push({ name: 'Definition Processing', result: processResult, success: processResult.success });
    } catch (error) {
      // Definition processing is optional - if it fails, we don't fail the entire migration
      console.log(chalk.yellow(`⚠️ Definition processing failed: ${error.message}`));
      phases.push({ 
        name: 'Definition Processing', 
        result: { success: false, messages: [error.message] }, 
        success: false,
        optional: true 
      });
    }

    // Phase 6: Install Spec-Up-T (final step)
    if (!dryRun) {
      console.log(chalk.blue('Phase 6: Installing Spec-Up-T...'));
      const installResult = await install(absoluteDir, { skipInstall });
      phases.push({ name: 'Installation', result: installResult, success: installResult.summary.successful > 0 });
    }
    
    return {
      directory: absoluteDir,
      phases,
      success: phases.every(phase => phase.success || phase.optional),
      summary: {
        total_phases: phases.length,
        successful_phases: phases.filter(p => p.success).length,
        dry_run: dryRun
      }
    };
    
  } catch (error) {
    return {
      directory: absoluteDir,
      phases,
      success: false,
      error: error.message,
      summary: {
        total_phases: phases.length,
        successful_phases: phases.filter(p => p.success).length,
        dry_run: dryRun
      }
    };
  }
}

module.exports = {
  migrate,
  detect,
  backup,
  validate,
  migrateFile,
  migrateDirectory,
  processContent,
  cleanup,
  updateConfigurations,
  install,
  completeMigration
};
