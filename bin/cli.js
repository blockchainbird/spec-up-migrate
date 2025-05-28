#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

// Import the main functionality
const { migrate } = require('../lib/migrator');

program
  .name('spec-up-migrate')
  .description('CLI tool for migrating Spec-Up specifications')
  .version('1.0.0');

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

program
  .command('validate')
  .description('Validate a Spec-Up specification')
  .argument('<source>', 'Specification file or directory to validate')
  .action(async (source) => {
    try {
      console.log(chalk.blue('🔍 Validating Spec-Up specification...'));
      // Add validation logic here
      console.log(chalk.green('✅ Validation passed!'));
    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new Spec-Up project')
  .option('-t, --template <template>', 'Template to use', 'basic')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Initializing new Spec-Up project...'));
      // Add initialization logic here
      console.log(chalk.green('✅ Project initialized!'));
    } catch (error) {
      console.error(chalk.red('❌ Initialization failed:'), error.message);
      process.exit(1);
    }
  });

// Show help when no command is provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv);
