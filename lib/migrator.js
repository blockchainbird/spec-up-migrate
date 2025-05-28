const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

/**
 * Main migration function
 * @param {string} source - Source file or directory path
 * @param {object} options - Migration options
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
async function migrateFile(filePath, outputDir, format, dryRun) {
  console.log(chalk.gray(`  Migrating file: ${filePath}`));
  
  if (!dryRun) {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Resolve absolute path for the source file
    const absoluteFilePath = path.resolve(filePath);
    
    // Read source file
    const content = await fs.readFile(absoluteFilePath, 'utf8');
    
    // Process content (add your migration logic here)
    const migratedContent = await processContent(content, format);
    
    // Write migrated file
    const outputPath = path.join(outputDir, path.basename(filePath));
    await fs.writeFile(outputPath, migratedContent, 'utf8');
    
    console.log(chalk.green(`    ✓ Migrated to: ${outputPath}`));
  } else {
    console.log(chalk.yellow(`    ⚠️  Would migrate to: ${path.join(outputDir, path.basename(filePath))}`));
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
  console.log(chalk.gray(`  Migrating directory: ${dirPath}`));
  
  const items = await fs.readdir(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stats = await fs.stat(itemPath);
    
    if (stats.isFile() && isSpecUpFile(item)) {
      await migrateFile(itemPath, outputDir, format, dryRun);
    } else if (stats.isDirectory()) {
      const subOutputDir = path.join(outputDir, item);
      await migrateDirectory(itemPath, subOutputDir, format, dryRun);
    }
  }
}

/**
 * Check if a file is a Spec-Up file
 * @param {string} filename - The filename to check
 * @returns {boolean} - True if it's a Spec-Up file
 */
function isSpecUpFile(filename) {
  const specUpExtensions = ['.md', '.json', '.yaml', '.yml'];
  const ext = path.extname(filename).toLowerCase();
  return specUpExtensions.includes(ext);
}

/**
 * Process content for migration
 * @param {string} content - Original content
 * @param {string} format - Target format
 * @returns {string} - Migrated content
 */
async function processContent(content, format) {
  // Add your specific migration logic here
  // This is a placeholder implementation
  
  let migratedContent = content;
  
  // Example migration rules (customize based on your needs)
  switch (format) {
    case 'latest':
      // Update to latest format
      migratedContent = migratedContent.replace(
        /spec_version:\s*["'](\d+\.\d+)["']/g,
        'spec_version: "2.0"'
      );
      break;
    
    case 'v1':
      // Migrate to v1 format
      migratedContent = migratedContent.replace(
        /spec_version:\s*["'](\d+\.\d+)["']/g,
        'spec_version: "1.0"'
      );
      break;
    
    default:
      console.log(chalk.yellow(`  ⚠️  Unknown format: ${format}, using default migration`));
  }
  
  return migratedContent;
}

/**
 * Validate a Spec-Up specification
 * @param {string} source - Source file or directory path
 */
async function validate(source) {
  // Add validation logic here
  console.log(`Validating: ${source}`);
  return true;
}

module.exports = {
  migrate,
  validate,
  migrateFile,
  migrateDirectory,
  processContent
};
