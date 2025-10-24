#!/usr/bin/env node

/**
 * @fileoverview Command-line interface for Spec-Up to Spec-Up-T migration tool
 * @module bin/cli
 * @author Kor Dwarshuis
 * @version 1.2.0
 * @since 2024-06-10
 */

const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

// Import the main functionality
const { migrate, detect, backup, cleanup, updateConfigurations, install, completeMigration } = require('../lib/migrator');
const { extractAllDefinitions, convertDefinitionsToIrefs, processDefinitions } = require('../lib/splitter');

// Read version from package.json
const packageJson = require('../package.json');

/**
 * Format bytes as human-readable text
 * @param {number} bytes Number of bytes
 * @param {boolean} si True to use metric (SI) units, aka powers of 1000. False to use binary (IEC), aka powers of 1024.
 * @param {number} dp Number of decimal places to display
 * @return {string} Formatted string
 */
function formatBytes(bytes, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10**dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return bytes.toFixed(dp) + ' ' + units[u];
}

program
  .name('spec-up-migrate')
  .description('CLI tool for migrating Spec-Up specifications')
  .version(packageJson.version);

// Migrate command
program
  .command('migrate')
  .description('Migrate a Spec-Up specification')
  .argument('<source>', 'Source specification file or directory')
  .option('-o, --output <path>', 'Output directory', './migrated')
  .option('-f, --format <format>', 'Target format', 'latest')
  .option('--dry-run', 'Show what would be migrated without making changes')
  .action(async (source, options) => {
    try {
      console.log(chalk.blue('🔄 Starting Spec-Up migration...'));
      console.log(chalk.gray(`Source: ${source}`));
      console.log(chalk.gray(`Output: ${options.output}`));
      
      if (options.dryRun) {
        console.log(chalk.yellow('⚠️  Dry run mode - no files will be modified'));
      }

      await migrate(source, options);
      
      console.log(chalk.green('✅ Migration completed successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ Migration failed:'), error.message);
      process.exit(1);
    }
  });

// Detect command
program
  .command('detect')
  .description('Detect if directory contains a Spec-Up installation')
  .argument('[directory]', 'Directory to analyze', '.')
  .option('-v, --verbose', 'Show detailed analysis')
  .action(async (directory, options) => {
    try {
      console.log(chalk.blue('🔍 Analyzing directory for Spec-Up installation...'));
      console.log(chalk.gray(`Directory: ${path.resolve(directory)}`));
      console.log('');

      const result = await detect(directory);
      
      // Display findings
      result.checks.forEach(check => {
        const icon = check.found ? '✅' : '❌';
        const color = check.found ? 'green' : 'red';
        console.log(chalk[color](`${icon} ${check.description}`));
        if (options.verbose && check.details) {
          console.log(chalk.gray(`    ${check.details}`));
        }
      });

      console.log('');
      
      // Show confidence level
      const confidenceColor = result.confidence >= 80 ? 'green' : 
                            result.confidence >= 50 ? 'yellow' : 'red';
      console.log(chalk[confidenceColor](`📊 Confidence: ${result.confidence}% - ${result.verdict}`));
      
      if (result.confidence >= 80) {
        console.log(chalk.green('🚀 Ready for migration to Spec-Up-T'));
        console.log('');
        console.log(chalk.blue('Next steps:'));
        console.log(chalk.gray('  npx spec-up-migrate complete'));
      } else if (result.confidence >= 50) {
        console.log(chalk.yellow('⚠️  Possible Spec-Up installation - manual verification recommended'));
      } else {
        console.log(chalk.red('❌ This does not appear to be a Spec-Up installation'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Detection failed:'), error.message);
      process.exit(1);
    }
  });

// Backup command
program
  .command('backup')
  .description('Create backups of critical files before migration')
  .argument('[directory]', 'Directory to backup', '.')
  .option('-o, --output <path>', 'Backup directory')
  .action(async (directory, options) => {
    try {
      console.log(chalk.blue('💾 Creating backup of critical files...'));
      console.log(chalk.gray(`Source: ${path.resolve(directory)}`));
      
      const result = await backup(directory, { backupDir: options.output });
      
      const backedUpFiles = result.files.filter(f => f.backed_up);
      const existingFiles = result.files.filter(f => f.exists);
      
      if (backedUpFiles.length > 0) {
        console.log('');
        console.log(chalk.green('✅ Backup completed successfully!'));
        console.log(chalk.blue('Backed up files:'));
        backedUpFiles.forEach(file => {
          console.log(chalk.gray(`  ${file.source} → ${file.backup}`));
        });
        console.log('');
        console.log(chalk.yellow(`📁 Backup location: ${result.directory}`));
        console.log(chalk.gray(`Successfully backed up ${backedUpFiles.length}/${existingFiles.length} files`));
      } else if (existingFiles.length > 0) {
        console.log(chalk.yellow('⚠️  Files found but backup failed'));
        console.log(chalk.gray('Check permissions and disk space'));
      } else {
        console.log(chalk.yellow('⚠️  No critical files found to backup'));
        console.log(chalk.gray('This might not be a Spec-Up installation - run detect first'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Backup failed:'), error.message);
      process.exit(1);
    }
  });

// Cleanup command
program
  .command('cleanup')
  .description('Remove obsolete files and directories from Spec-Up installation')
  .argument('[directory]', 'Directory to clean up', '.')
  .option('--dry-run', 'Show what would be removed without actually removing')
  .option('--force', 'Skip confirmation prompts')
  .action(async (directory, options) => {
    try {
      console.log(chalk.blue('🧹 Cleaning up obsolete Spec-Up files...'));
      console.log(chalk.gray(`Directory: ${path.resolve(directory)}`));
      
      if (options.dryRun) {
        console.log(chalk.yellow('⚠️  Dry run mode - no files will be removed'));
      }
      console.log('');

      const result = await cleanup(directory, { 
        dryRun: options.dryRun,
        force: options.force 
      });
      
      // Filter items that exist and show what would be/was removed
      const existingItems = result.items.filter(item => item.exists);
      const removedItems = result.items.filter(item => item.removed);
      
      if (existingItems.length > 0) {
        console.log('');
        console.log(chalk.blue('Items found for cleanup:'));
        existingItems.forEach(item => {
          const icon = item.removed ? '✅' : (options.dryRun ? '📋' : '❌');
          const color = item.removed ? 'green' : (options.dryRun ? 'yellow' : 'red');
          const status = item.removed ? 'Removed' : (options.dryRun ? 'Would remove' : 'Failed');
          const size = item.size ? ` (${formatBytes(item.size)})` : '';
          console.log(chalk[color](`${icon} ${status}: ${item.path}${size}`));
          if (item.error) {
            console.log(chalk.red(`   Error: ${item.error}`));
          }
        });
        
        console.log('');
        const action = options.dryRun ? 'Would remove' : 'Removed';
        const itemCount = options.dryRun ? existingItems.length : removedItems.length;
        const totalSize = options.dryRun ? 
          existingItems.reduce((sum, item) => sum + item.size, 0) :
          result.summary.totalSizeFreed;
        
        console.log(chalk.green(`✅ Cleanup completed! ${action} ${itemCount} items (${formatBytes(totalSize)})`));
      } else {
        console.log(chalk.yellow('⚠️  No obsolete files found to remove'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Cleanup failed:'), error.message);
      process.exit(1);
    }
  });

// Update command
program
  .command('update')
  .description('Update configuration files for Spec-Up-T compatibility')
  .argument('[directory]', 'Directory to update', '.')
  .option('--dry-run', 'Show what would be updated without making changes')
  .action(async (directory, options) => {
    try {
      console.log(chalk.blue('⚡ Updating configuration files for Spec-Up-T...'));
      console.log(chalk.gray(`Directory: ${path.resolve(directory)}`));
      
      if (options.dryRun) {
        console.log(chalk.yellow('⚠️  Dry run mode - no files will be modified'));
      }
      console.log('');

      const result = await updateConfigurations(directory, { dryRun: options.dryRun });
      
      console.log('');
      console.log(chalk.green('✅ Configuration update completed!'));
      
      if (result.specsJsonUpdated) {
        const action = options.dryRun ? 'Would update' : 'Updated';
        console.log(chalk.blue(`📝 ${action} specs.json:`));
        console.log(chalk.gray(`  spec_version: ${result.oldVersion} → ${result.newVersion}`));
      }
      
      if (result.packageJsonUpdated) {
        const action = options.dryRun ? 'Would update' : 'Updated';
        console.log(chalk.blue(`📦 ${action} package.json:`));
        if (result.removedDependencies?.length > 0) {
          console.log(chalk.gray(`  Removed: ${result.removedDependencies.join(', ')}`));
        }
        if (result.addedDependencies?.length > 0) {
          console.log(chalk.gray(`  Added: ${result.addedDependencies.join(', ')}`));
        }
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Configuration update failed:'), error.message);
      process.exit(1);
    }
  });

// Install command
program
  .command('install')
  .description('Install Spec-Up-T dependencies and setup project structure')
  .argument('[directory]', 'Directory to install to', '.')
  .option('--no-deps', 'Skip npm dependency installation')
  .action(async (directory, options) => {
    try {
      console.log(chalk.blue('🚀 Installing Spec-Up-T and setting up project structure...'));
      console.log(chalk.gray(`Directory: ${path.resolve(directory)}`));
      console.log('');

      const result = await install(directory, { 
        skipDeps: !options.deps 
      });
      
      console.log('');
      console.log(chalk.green('✅ Spec-Up-T installation completed!'));
      
      if (result.createdDirectories?.length > 0) {
        console.log(chalk.blue('📁 Created directories:'));
        result.createdDirectories.forEach(dir => {
          console.log(chalk.gray(`  ${dir}`));
        });
      }
      
      if (result.createdFiles?.length > 0) {
        console.log(chalk.blue('📄 Created files:'));
        result.createdFiles.forEach(file => {
          console.log(chalk.gray(`  ${file}`));
        });
      }
      
      if (result.installedDependencies) {
        console.log(chalk.blue('📦 Installed dependencies:'));
        console.log(chalk.gray(`  ${result.installedDependencies.join(', ')}`));
      }
      
      console.log('');
      console.log(chalk.green('🎉 Your project is now ready for Spec-Up-T!'));
      console.log(chalk.blue('Next steps:'));
      console.log(chalk.gray('  npx spec-up-t render'));
      
    } catch (error) {
      console.error(chalk.red('❌ Installation failed:'), error.message);
      process.exit(1);
    }
  });

// Complete migration command
program
  .command('complete')
  .description('Run complete migration process (detect, backup, cleanup, update, split, install)')
  .argument('[directory]', 'Directory to migrate', '.')
  .option('--dry-run', 'Show what would be done without making changes')
  .option('--no-backup', 'Skip backup phase (not recommended)')
  .option('--skip-detection', 'Skip detection phase and assume valid Spec-Up installation')
  .action(async (directory, options) => {
    try {
      console.log(chalk.blue('🔄 Starting complete Spec-Up to Spec-Up-T migration...'));
      console.log(chalk.gray(`Directory: ${path.resolve(directory)}`));
      
      if (options.dryRun) {
        console.log(chalk.yellow('⚠️  Dry run mode - no changes will be made'));
      }
      if (options.noBackup) {
        console.log(chalk.red('⚠️  Backup phase will be skipped'));
      }
      if (options.skipDetection) {
        console.log(chalk.yellow('⚠️  Detection phase will be skipped - assuming valid Spec-Up installation'));
      }
      console.log('');

      const result = await completeMigration(directory, {
        dryRun: options.dryRun,
        skipBackup: options.noBackup,
        skipDetection: options.skipDetection
      });
      
      console.log('');
      
      if (!result.success) {
        console.log(chalk.red('❌ Complete migration failed!'));
        if (result.error) {
          console.log(chalk.red('Error:'), result.error);
        }
        console.log('');
        console.log(chalk.blue('Migration Summary:'));
      } else {
        console.log(chalk.green('🎉 Complete migration finished successfully!'));
        console.log('');
        console.log(chalk.blue('Migration Summary:'));
      }
      
      // Find the detection phase result
      const detectionPhase = result.phases.find(phase => phase.name === 'Detection');
      if (detectionPhase && detectionPhase.result) {
        console.log(chalk.gray(`  Detection confidence: ${detectionPhase.result.confidence}%`));
      }
      
      // Find the backup phase result
      const backupPhase = result.phases.find(phase => phase.name === 'Backup');
      if (backupPhase && backupPhase.result && !options.noBackup) {
        console.log(chalk.gray(`  Backup created: ${backupPhase.result.directory}/backup-${new Date().toISOString().split('T')[0]}`));
        console.log(chalk.gray(`  Files backed up: ${backupPhase.result.summary.backed_up}`));
      }
      
      // Find the cleanup phase result
      const cleanupPhase = result.phases.find(phase => phase.name === 'Cleanup');
      if (cleanupPhase && cleanupPhase.result) {
        console.log(chalk.gray(`  Files cleaned up: ${cleanupPhase.result.summary.removed}`));
        if (cleanupPhase.result.summary.total_size) {
          console.log(chalk.gray(`  Space freed: ${formatBytes(cleanupPhase.result.summary.total_size)}`));
        }
      }
      
      // Find the update phase result
      const updatePhase = result.phases.find(phase => phase.name === 'Update Configurations');
      if (updatePhase && updatePhase.result) {
        console.log(chalk.gray(`  Configuration files updated: ${updatePhase.result.summary.successful}`));
      }
      
      // Find the splitting phase result
      const splittingPhase = result.phases.find(phase => phase.name === 'Glossary Splitting');
      if (splittingPhase && splittingPhase.result) {
        if (splittingPhase.success) {
          console.log(chalk.gray(`  Glossary split into ${splittingPhase.result.filesCreated?.length || 0} term files`));
        } else if (splittingPhase.optional) {
          console.log(chalk.gray(`  Glossary splitting failed (optional step)`));
        }
      }
      
      // Find the installation phase result
      const installPhase = result.phases.find(phase => phase.name === 'Installation');
      if (installPhase && installPhase.result) {
        console.log(chalk.gray(`  Spec-Up-T installed with dependencies`));
      }
      
      console.log('');
      
      if (result.success) {
        console.log(chalk.green('🚀 Your project is now ready for Spec-Up-T!'));
        console.log(chalk.blue('Test your migration:'));
        console.log(chalk.gray('  “npm run menu 7” and wait for the health check page to open'));
      } else {
        console.log(chalk.yellow('Migration was not completed due to errors above.'));
        console.log(chalk.blue('Next steps:'));
        console.log(chalk.gray('  1. Review the error messages'));
        console.log(chalk.gray('  2. Ensure the directory contains a valid Spec-Up project'));
        console.log(chalk.gray('  3. Try running: spec-up-migrate detect --verbose'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Complete migration failed:'), error.message);
      
      if (error.phase) {
        console.log(chalk.red(`Failed during: ${error.phase}`));
      }
      
      if (error.backupLocation) {
        console.log(chalk.yellow(`Backup available at: ${error.backupLocation}`));
      }
      
      process.exit(1);
    }
  });

// Legacy commands for backward compatibility
program
  .command('validate')
  .description('Validate a Spec-Up specification')
  .argument('<source>', 'Source specification file or directory')
  .action(async (source) => {
    console.log(chalk.yellow('⚠️  Validate command is deprecated. Use "detect" instead.'));
    console.log(chalk.blue('Running detection instead...'));
    
    try {
      const result = await detect(source);
      console.log(result.confidence >= 80 ? 
        chalk.green('✅ Valid Spec-Up installation detected') :
        chalk.red('❌ No valid Spec-Up installation found'));
    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error.message);
      process.exit(1);
    }
  });

// Convert definitions to inline references command
program
  .command('convert-to-iref')
  .alias('to-iref')
  .description('Convert [[def:]] blocks to [[iref:]] inline references (removes ~ definition text)')
  .argument('[directory]', 'Directory containing the specs.json and markdown files', '.')
  .option('--dry-run', 'Show what would be converted without modifying files')
  .option('--verbose', 'Show detailed output with each conversion')
  .action(async (directory, options) => {
    try {
      console.log(chalk.blue('🔄 Converting [[def:]] blocks to [[iref:]] references...'));
      console.log(chalk.gray(`Directory: ${path.resolve(directory)}`));
      
      if (options.dryRun) {
        console.log(chalk.yellow('⚠️  Dry run mode - no files will be modified'));
      }
      console.log('');

      const result = await convertDefinitionsToIrefs({
        directory: directory,
        dryRun: options.dryRun,
        verbose: options.verbose
      });
      
      console.log('');
      
      if (result.success) {
        console.log(chalk.green('✅ Conversion completed successfully!'));
        console.log('');
        console.log(chalk.blue('Summary:'));
        console.log(chalk.gray(`  Markdown files processed: ${result.filesProcessed.length}`));
        console.log(chalk.gray(`  Definitions converted: ${result.conversions.length}`));
        console.log(chalk.gray(`  [[def:]] → [[iref:]] transformations ${options.dryRun ? 'that would be made' : 'completed'}`));
        
        if (options.verbose && result.conversions.length > 0) {
          console.log('');
          console.log(chalk.blue('Conversions by file:'));
          const byFile = {};
          result.conversions.forEach(conv => {
            if (!byFile[conv.file]) byFile[conv.file] = [];
            byFile[conv.file].push(conv.term);
          });
          Object.entries(byFile).forEach(([file, terms]) => {
            console.log(chalk.gray(`  ${file}: ${terms.join(', ')}`));
          });
        }
        
        console.log('');
        console.log(chalk.green(`🎉 Successfully converted ${result.conversions.length} definition blocks to inline references!`));
        console.log(chalk.blue('Next steps:'));
        console.log(chalk.gray('  1. The [[def:]] blocks have been replaced with [[iref:]] references'));
        console.log(chalk.gray('  2. Definition text (lines with ~) has been removed'));
        console.log(chalk.gray('  3. The [[iref:]] will display the full definition from extracted term files'));
        console.log(chalk.gray('  4. Run "npm run render" to verify the changes'));
        
      } else {
        console.log(chalk.red('❌ Conversion failed'));
        console.log('');
        console.log(chalk.blue('Common issues:'));
        console.log(chalk.gray('  - specs.json not found in the directory'));
        console.log(chalk.gray('  - No markdown files with [[def:]] definitions found'));
        console.log(chalk.gray('  - Run with --verbose for more details'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Conversion failed:'), error.message);
      
      if (error.message.includes('specs.json')) {
        console.log('');
        console.log(chalk.blue('Make sure you are in a directory that contains:'));
        console.log(chalk.gray('  - specs.json configuration file'));
        console.log(chalk.gray('  - Markdown files in the spec_directory'));
      }
      
      process.exit(1);
    }
  });

// Extract all definitions command
program
  .command('extract-definitions')
  .alias('extract')
  .description('Extract all [[def:]] definitions from all markdown files into individual term files')
  .argument('[directory]', 'Directory containing the specs.json and markdown files', '.')
  .option('--dry-run', 'Show what would be done without creating files')
  .option('--verbose', 'Show detailed output with each definition found')
  .action(async (directory, options) => {
    try {
      console.log(chalk.blue('📖 Extracting definitions from all markdown files...'));
      console.log(chalk.gray(`Directory: ${path.resolve(directory)}`));
      
      if (options.dryRun) {
        console.log(chalk.yellow('⚠️  Dry run mode - no files will be created'));
      }
      console.log('');

      const result = await extractAllDefinitions({
        directory: directory,
        dryRun: options.dryRun,
        verbose: options.verbose
      });
      
      console.log('');
      
      if (result.success) {
        console.log(chalk.green('✅ Definition extraction completed successfully!'));
        console.log('');
        console.log(chalk.blue('Summary:'));
        console.log(chalk.gray(`  Markdown files scanned: ${result.filesScanned.length}`));
        console.log(chalk.gray(`  Definitions found: ${result.definitionsFound.length}`));
        console.log(chalk.gray(`  Term files ${options.dryRun ? 'that would be created' : 'created'}: ${result.filesCreated.length}`));
        
        if (options.verbose && result.definitionsFound.length > 0) {
          console.log('');
          console.log(chalk.blue('Definitions by source file:'));
          const byFile = {};
          result.definitionsFound.forEach(def => {
            if (!byFile[def.sourceFile]) byFile[def.sourceFile] = [];
            byFile[def.sourceFile].push(def.term);
          });
          Object.entries(byFile).forEach(([file, terms]) => {
            console.log(chalk.gray(`  ${file}: ${terms.join(', ')}`));
          });
        }
        
        console.log('');
        console.log(chalk.green(`🎉 Successfully extracted ${result.definitionsFound.length} definitions!`));
        console.log(chalk.blue('Next steps:'));
        console.log(chalk.gray('  1. Review the generated term files in the spec_terms_directory'));
        console.log(chalk.gray('  2. Optionally remove [[def:]] blocks from source markdown files'));
        console.log(chalk.gray('  3. Run "npm run render" to test the new structure'));
        
      } else {
        console.log(chalk.red('❌ Definition extraction failed'));
        console.log('');
        console.log(chalk.blue('Common issues:'));
        console.log(chalk.gray('  - specs.json not found in the directory'));
        console.log(chalk.gray('  - No markdown files with [[def:]] definitions found'));
        console.log(chalk.gray('  - spec_terms_directory not properly configured in specs.json'));
        console.log(chalk.gray('  - Run with --verbose for more details'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Extraction failed:'), error.message);
      
      if (error.message.includes('specs.json')) {
        console.log('');
        console.log(chalk.blue('Make sure you are in a directory that contains:'));
        console.log(chalk.gray('  - specs.json configuration file'));
        console.log(chalk.gray('  - Markdown files in the spec_directory'));
        console.log(chalk.gray('  - spec_terms_directory configured in specs.json'));
      }
      
      process.exit(1);
    }
  });

// Process definitions command - Combined extract and convert
program
  .command('process-definitions')
  .alias('process')
  .description('Extract [[def:]] from all markdown files and convert them to [[iref:]] (recommended workflow)')
  .argument('[directory]', 'Directory containing specs.json and markdown files', '.')
  .option('--dry-run', 'Preview what would be done without modifying files')
  .option('--verbose', 'Show detailed output with each step')
  .action(async (directory, options) => {
    try {
      console.log(chalk.blue('🔄 Processing definitions: Extract and Convert'));
      console.log(chalk.gray(`Directory: ${path.resolve(directory)}`));
      
      if (options.dryRun) {
        console.log(chalk.yellow('⚠️  Dry run mode - no files will be modified'));
      }
      console.log('');

      const result = await processDefinitions({
        directory: directory,
        dryRun: options.dryRun,
        verbose: options.verbose
      });
      
      console.log('');
      
      // Output messages
      result.messages.forEach(message => {
        if (typeof message === 'string') {
          console.log(message);
        }
      });
      
      if (result.success) {
        console.log('');
        console.log(chalk.green('✅ Definition processing completed!'));
      } else {
        console.log('');
        console.log(chalk.red('❌ Definition processing encountered issues'));
        console.log(chalk.gray('Check the output above for details'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Processing failed:'), error.message);
      
      if (error.message.includes('specs.json')) {
        console.log('');
        console.log(chalk.blue('Make sure you are in a directory that contains:'));
        console.log(chalk.gray('  - specs.json configuration file'));
        console.log(chalk.gray('  - Markdown files in the spec_directory'));
        console.log(chalk.gray('  - spec_terms_directory configured in specs.json'));
      }
      
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new Spec-Up project')
  .option('-t, --template <template>', 'Template to use', 'basic')
  .action((options) => {
    console.log(chalk.yellow('⚠️  Init command is not implemented in this migration tool.'));
    console.log(chalk.blue('This tool is specifically for migrating existing Spec-Up projects to Spec-Up-T.'));
    console.log('');
    console.log(chalk.blue('To create a new Spec-Up-T project:'));
    console.log(chalk.gray('  npx spec-up-t init'));
  });

// Show help when no command is provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv);
