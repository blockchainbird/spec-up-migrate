const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * @file Spec-Up Splitter functionality for splitting glossary files
 * @author Kor Dwarshuis
 * @version 1.0.0
 * @since 2024-06-10
 */

/**
 * Configuration for the splitter
 */
const SPLITTER_CONFIG = {
  definitionStringHead: '[[def:' // Start of a definition
};

/**
 * Fix glossary file content by ensuring proper formatting
 * @param {string} glossaryFilePath - Path to the glossary file
 */
function fixGlossaryFile(glossaryFilePath) {
  let glossaryFileContent = fsSync.readFileSync(glossaryFilePath, 'utf8');

  let lines = glossaryFileContent.split('\n');
  let newLines = [];
  let previousLine = '';

  // Process the lines of a glossary file, ensuring that there is a blank line after each definition
  for (let i = 0; i < lines.length; i++) {
    if (previousLine.startsWith('[[def:')) {
      if (lines[i].trim() !== '') {
        newLines.push('');
      }
    }
    newLines.push(lines[i]);
    previousLine = lines[i];
  }

  glossaryFileContent = newLines.join('\n');
  fsSync.writeFileSync(glossaryFilePath, glossaryFileContent);

  lines = glossaryFileContent.split('\n');
  newLines = [];

  // Process the lines in the glossary file, adding a '~' prefix to any lines that do not start with '[[def:' and are not empty
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('[[def:') && lines[i].trim() !== '' && !lines[i].startsWith('~')) {
      newLines.push('~ ' + lines[i]);
    } else {
      newLines.push(lines[i]);
    }
  }

  glossaryFileContent = newLines.join('\n');
  fsSync.writeFileSync(glossaryFilePath, glossaryFileContent);
}

/**
 * Check if splitting conditions are met
 * @param {string} sourceTermsFile - Path to the source terms file
 * @param {string} termFilesDir - Directory for term files
 * @param {string} projectDir - Project directory containing specs.json
 * @returns {Object} - Result of condition checks
 */
async function checkSplittingConditions(sourceTermsFile, termFilesDir, projectDir = process.cwd()) {
  const conditions = {
    specsJsonExists: false,
    sourceFileExists: false,
    outputDirSafe: false,
    canProceed: false,
    messages: []
  };

  const specsJsonPath = path.join(projectDir, 'specs.json');

  try {
    // Check if specs.json exists
    await fs.access(specsJsonPath);
    conditions.specsJsonExists = true;
  } catch (error) {
    conditions.messages.push('❌ specs.json not found');
    return conditions;
  }

  // Check if source file exists
  try {
    await fs.access(sourceTermsFile);
    conditions.sourceFileExists = true;
  } catch (error) {
    conditions.messages.push(`❌ File not found: ${sourceTermsFile}`);
    return conditions;
  }

  // Check output directory conditions
  try {
    await fs.access(termFilesDir);
    conditions.messages.push('ℹ️ Output directory found. Checking for existing .md files...');
    
    const files = await fs.readdir(termFilesDir);
    const mdFilesCount = files.filter(file => file.endsWith('.md')).length;
    
    if (mdFilesCount > 0) {
      conditions.messages.push('❌ There are .md files in the directory. Stopping to prevent overwriting.');
      return conditions;
    }
    conditions.outputDirSafe = true;
  } catch (error) {
    // Directory doesn't exist, which is fine
    conditions.outputDirSafe = true;
  }

  conditions.canProceed = conditions.specsJsonExists && conditions.sourceFileExists && conditions.outputDirSafe;
  if (conditions.canProceed) {
    conditions.messages.push('✅ All conditions met. Ready to split.');
  }

  return conditions;
}

/**
 * Split glossary file into individual term files
 * @param {string} sourceTermsFile - Path to the source terms file
 * @param {string} termFilesDir - Directory for term files
 * @param {Object} options - Options for splitting
 * @returns {Object} - Result of the splitting operation
 */
async function splitGlossaryFile(sourceTermsFile, termFilesDir, options = {}) {
  const { dryRun = false, verbose = false, projectDir = process.cwd() } = options;
  const result = {
    success: false,
    filesCreated: [],
    backupCreated: false,
    messages: []
  };

  try {
    // Check conditions first
    const conditionCheck = await checkSplittingConditions(sourceTermsFile, termFilesDir, projectDir);
    result.messages.push(...conditionCheck.messages);

    if (!conditionCheck.canProceed) {
      result.messages.push('❌ Splitting conditions not met. Aborting.');
      return result;
    }

    if (dryRun) {
      result.messages.push('🔍 Dry run mode - no files will be modified');
    }

    // Create backup of specs.json if it doesn't exist
    const backupPath = path.join(projectDir, 'specs.unsplit.json');
    const specsPath = path.join(projectDir, 'specs.json');
    try {
      await fs.access(backupPath);
      if (verbose) result.messages.push('ℹ️ Backup specs.unsplit.json already exists');
    } catch (error) {
      if (!dryRun) {
        await fs.copyFile(specsPath, backupPath);
        result.backupCreated = true;
        result.messages.push('✅ Created backup: specs.unsplit.json');
      }
    }

    // Restore from backup to ensure clean state
    if (!dryRun) {
      await fs.copyFile(backupPath, specsPath);
    }

    // Create output directory if it doesn't exist
    if (!dryRun) {
      try {
        await fs.mkdir(termFilesDir, { recursive: true });
        if (verbose) result.messages.push(`✅ Created directory: ${termFilesDir}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }

    // Read and process the glossary file
    const glossaryFileContent = await fs.readFile(sourceTermsFile, 'utf8');
    
    if (!dryRun) {
      fixGlossaryFile(sourceTermsFile);
    }

    // Split content by definition markers
    const [introSection, ...sections] = glossaryFileContent.split(SPLITTER_CONFIG.definitionStringHead);
    
    // Create intro file
    const introSectionFilename = 'glossary-intro-created-by-split-tool.md';
    const introDir = path.dirname(sourceTermsFile);
    const introFilePath = path.join(introDir, introSectionFilename);

    if (!dryRun) {
      await fs.writeFile(introFilePath, introSection);
    }
    result.filesCreated.push(introFilePath);
    result.messages.push(`✅ ${dryRun ? 'Would create' : 'Created'}: ${introSectionFilename}`);

    // Extract terms and create individual files
    const termsRegex = /\[\[def: (.*?)\]\]/g;
    const matches = [...glossaryFileContent.matchAll(termsRegex)];
    const terms = matches.map(match => match[1]);

    const fileNames = terms.map(term => {
      const termWithoutComma = term.split(",")[0];
      return `${termWithoutComma.replace(/,/g, '').replace(/\//g, '-').replace(/ /g, '-').toLowerCase()}`;
    });

    // Create individual term files
    for (let index = 0; index < sections.length; index++) {
      if (terms[index]) {
        const filename = `${fileNames[index]}.md`;
        const termFilePath = path.join(termFilesDir, filename);
        const content = SPLITTER_CONFIG.definitionStringHead + sections[index];
        
        if (!dryRun) {
          await fs.writeFile(termFilePath, content);
        }
        result.filesCreated.push(termFilePath);
        result.messages.push(`✅ ${dryRun ? 'Would create' : 'Created'}: ${filename}`);
      }
    }

    result.success = true;
    result.messages.push(`✅ Splitting ${dryRun ? 'simulation ' : ''}completed successfully`);

  } catch (error) {
    result.messages.push(`❌ Error during splitting: ${error.message}`);
    throw error;
  }

  return result;
}

/**
 * Get configuration from specs.json for splitting
 * @param {string} projectRoot - Root directory of the project
 * @returns {Object} - Configuration object with paths
 */
async function getSplitterConfig(projectRoot = process.cwd()) {
  const specsPath = path.join(projectRoot, 'specs.json');
  
  try {
    const specsContent = await fs.readFile(specsPath, 'utf8');
    const specs = JSON.parse(specsContent);
    
    if (!specs.specs || !Array.isArray(specs.specs) || specs.specs.length === 0) {
      throw new Error('No specs configuration found in specs.json');
    }

    const firstSpec = specs.specs[0];
    const specDirectory = firstSpec.spec_directory || './spec';
    const markdownPaths = firstSpec.markdown_paths || [];
    
    if (markdownPaths.length === 0) {
      throw new Error('No markdown_paths found in specs configuration');
    }

    const sourceTermsFile = path.join(projectRoot, specDirectory, markdownPaths[0]);
    const termFilesDir = path.join(projectRoot, specDirectory, 'terms-definitions');

    return {
      sourceTermsFile,
      termFilesDir,
      specDirectory,
      markdownPaths
    };
  } catch (error) {
    throw new Error(`Failed to read splitter configuration: ${error.message}`);
  }
}

/**
 * Main splitter function that can be called from CLI or migration process
 * @param {Object} options - Splitting options
 * @returns {Object} - Result of the splitting operation
 */
async function split(options = {}) {
  const { 
    directory = process.cwd(), 
    dryRun = false, 
    verbose = false 
  } = options;

  try {
    const config = await getSplitterConfig(directory);
    
    if (verbose) {
      console.log(chalk.blue('🔧 Starting spec-up-splitter...'));
      console.log(chalk.blue(`📄 Source file: ${config.sourceTermsFile}`));
      console.log(chalk.blue(`📁 Output directory: ${config.termFilesDir}`));
    }

    const result = await splitGlossaryFile(config.sourceTermsFile, config.termFilesDir, {
      dryRun,
      verbose,
      projectDir: directory
    });

    // Output messages
    result.messages.forEach(message => {
      if (message.startsWith('❌')) {
        console.log(chalk.red(message));
      } else if (message.startsWith('✅')) {
        console.log(chalk.green(message));
      } else if (message.startsWith('ℹ️')) {
        console.log(chalk.blue(message));
      } else if (message.startsWith('🔍')) {
        console.log(chalk.yellow(message));
      } else {
        console.log(message);
      }
    });

    return result;
  } catch (error) {
    console.error(chalk.red(`❌ Splitter error: ${error.message}`));
    throw error;
  }
}

module.exports = {
  split,
  splitGlossaryFile,
  checkSplittingConditions,
  getSplitterConfig,
  fixGlossaryFile,
  SPLITTER_CONFIG
};
