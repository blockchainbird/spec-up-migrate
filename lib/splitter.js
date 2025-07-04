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
 * @param {string} glossaryFilePath - Path to the glossary file to fix
 * @throws {Error} When file operations fail
 * @description Ensures proper blank line formatting after definitions and adds '~' prefix to non-definition lines
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


  glossaryFileContent = newLines.join('\n');
  fsSync.writeFileSync(glossaryFilePath, glossaryFileContent);
}

/**
 * Check if splitting conditions are met for safely splitting the glossary file
 * @param {string} sourceTermsFile - Path to the source glossary file
 * @param {string} termFilesDir - Directory for output term files
 * @param {string} [projectDir=process.cwd()] - Project directory containing specs.json
 * @returns {Promise<Object>} Result of condition checks with safety status and messages
 * @throws {Error} When condition checking operations fail
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
 * Split glossary file into individual term files with proper formatting
 * @param {string} sourceTermsFile - Path to the source glossary file
 * @param {string} termFilesDir - Directory where term files will be created
 * @param {Object} [options={}] - Splitting options
 * @param {boolean} [options.dryRun=false] - Whether to perform a dry run without creating files
 * @param {boolean} [options.verbose=false] - Whether to output verbose logging
 * @param {string} [options.projectDir=process.cwd()] - Project directory containing specs.json
 * @returns {Promise<Object>} Result of the splitting operation with created files and messages
 * @throws {Error} When splitting operations fail
 * @example
 * // Basic splitting
 * const result = await splitGlossaryFile('./spec/glossary.md', './spec/terms-definitions');
 * 
 * // Dry run to preview
 * const preview = await splitGlossaryFile('./spec/glossary.md', './spec/terms-definitions', { dryRun: true });
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
    let allTrailingContent = '';
    
    for (let index = 0; index < sections.length; index++) {
      if (terms[index]) {
        const filename = `${fileNames[index]}.md`;
        const termFilePath = path.join(termFilesDir, filename);
        
        // Split the section to separate definition content from trailing content
        const { definitionContent, trailingContent } = splitDefinitionSection(sections[index]);
        const content = SPLITTER_CONFIG.definitionStringHead + definitionContent;
        
        if (!dryRun) {
          await fs.writeFile(termFilePath, content);
        }
        result.filesCreated.push(termFilePath);
        result.messages.push(`✅ ${dryRun ? 'Would create' : 'Created'}: ${filename}`);
        
        // Collect trailing content for the specification-after-glossary file
        if (trailingContent) {
          allTrailingContent += trailingContent + '\n';
        }
      }
    }
    
    // Create specification-after-glossary file if there's trailing content
    if (allTrailingContent.trim()) {
      const afterGlossaryFilename = 'specification-after-glossary.md';
      const afterGlossaryPath = path.join(path.dirname(sourceTermsFile), afterGlossaryFilename);
      
      if (!dryRun) {
        await fs.writeFile(afterGlossaryPath, allTrailingContent.trim());
      }
      result.filesCreated.push(afterGlossaryPath);
      result.messages.push(`✅ ${dryRun ? 'Would create' : 'Created'}: ${afterGlossaryFilename}`);
    }

    // Update specs.json to remove source terms file from markdown_paths
    if (!dryRun) {
      try {
        const updateResult = await updateSpecsJsonAfterSplit(sourceTermsFile, projectDir, dryRun);
        result.messages.push(...updateResult.messages);
        if (updateResult.success && updateResult.changes.length > 0) {
          result.messages.push('✅ Updated specs.json to remove source terms file from markdown_paths');
        }
      } catch (error) {
        // This is not a critical error - splitting was successful, just log the issue
        result.messages.push(`⚠️ Warning: Could not update specs.json: ${error.message}`);
      }
    } else {
      // For dry run, show what would be updated
      try {
        const updateResult = await updateSpecsJsonAfterSplit(sourceTermsFile, projectDir, true);
        result.messages.push(...updateResult.messages);
      } catch (error) {
        result.messages.push(`⚠️ Warning: Could not preview specs.json update: ${error.message}`);
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
 * Update specs.json to remove source terms file from markdown_paths after splitting
 * @param {string} sourceTermsFile - Path to the source glossary file
 * @param {string} projectDir - Project directory containing specs.json
 * @param {boolean} dryRun - Whether to perform a dry run without modifying files
 * @returns {Promise<Object>} Result of the update operation
 * @throws {Error} When update operations fail
 */
async function updateSpecsJsonAfterSplit(sourceTermsFile, projectDir, dryRun = false) {
  const specsPath = path.join(projectDir, 'specs.json');
  const result = {
    success: false,
    changes: [],
    messages: []
  };

  try {
    const specsContent = await fs.readFile(specsPath, 'utf8');
    const specs = JSON.parse(specsContent);

    if (!specs.specs || !Array.isArray(specs.specs) || specs.specs.length === 0) {
      result.messages.push('❌ No specs configuration found in specs.json');
      return result;
    }

    const spec = specs.specs[0];
    const specDirectory = spec.spec_directory || './spec';
    const sourceFileName = path.basename(sourceTermsFile);
    
    // Find the relative path of the source file within the spec directory
    const sourceRelativePath = path.relative(path.join(projectDir, specDirectory), sourceTermsFile);
    
    if (!spec.markdown_paths || !Array.isArray(spec.markdown_paths)) {
      result.messages.push('❌ No markdown_paths found in specs configuration');
      return result;
    }

    // Check if the source file is in markdown_paths
    const sourceFileIndex = spec.markdown_paths.findIndex(filePath => {
      // Check both the filename and the relative path
      return filePath === sourceFileName || filePath === sourceRelativePath || path.basename(filePath) === sourceFileName;
    });

    if (sourceFileIndex === -1) {
      result.messages.push('ℹ️ Source terms file not found in markdown_paths - no changes needed');
      result.success = true;
      return result;
    }

    // Remove the source file from markdown_paths
    const removedFile = spec.markdown_paths[sourceFileIndex];
    spec.markdown_paths.splice(sourceFileIndex, 1);
    
    result.changes.push(`Removed '${removedFile}' from markdown_paths`);
    result.messages.push(`✅ ${dryRun ? 'Would remove' : 'Removed'} '${removedFile}' from markdown_paths`);

    // Write the updated specs.json if not a dry run
    if (!dryRun) {
      await fs.writeFile(specsPath, JSON.stringify(specs, null, 2));
      result.messages.push('✅ Updated specs.json');
    } else {
      result.messages.push('🔍 Dry run - specs.json would be updated');
    }

    result.success = true;

  } catch (error) {
    result.messages.push(`❌ Error updating specs.json: ${error.message}`);
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
 * @param {Object} [options={}] - Splitting options
 * @param {string} [options.directory=process.cwd()] - Project directory containing specs.json
 * @param {boolean} [options.dryRun=false] - Whether to perform a dry run without creating files
 * @param {boolean} [options.verbose=false] - Whether to output detailed progress information
 * @returns {Promise<Object>} Result of the splitting operation with success status and messages
 * @throws {Error} When splitting operations fail or configuration is invalid
 * @example
 * // Basic splitting in current directory
 * const result = await split();
 * 
 * // Splitting with options
 * const result = await split({ 
 *   directory: './my-project', 
 *   dryRun: true, 
 *   verbose: true 
 * });
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

/**
 * Split a definition section into the actual definition content and any trailing content
 * that should be in a separate file
 * @param {string} sectionContent - The content of a definition section
 * @returns {Object} Object containing definitionContent and trailingContent
 */
function splitDefinitionSection(sectionContent) {
  const lines = sectionContent.split('\n');
  const definitionLines = [];
  const trailingLines = [];
  let inDefinition = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (inDefinition) {
      // Check if this line starts a trailing section
      // A line that doesn't start with ~ (and isn't empty) after we've seen definition content
      // indicates the start of trailing content
      if (trimmedLine && !trimmedLine.startsWith('~') && !trimmedLine.startsWith(']]')) {
        // Check if we've already seen definition content (lines starting with ~)
        const hasDefinitionContent = definitionLines.some(defLine => defLine.trim().startsWith('~'));
        
        if (hasDefinitionContent) {
          // This line doesn't start with ~ and we've seen definition content,
          // so this is likely trailing content
          inDefinition = false;
          trailingLines.push(line);
        } else {
          // We haven't seen definition content yet, so this is still part of the definition
          definitionLines.push(line);
        }
      } else {
        // This line is empty, starts with ~, or starts with ]] - part of definition
        definitionLines.push(line);
      }
    } else {
      // We're in trailing content, add everything to trailing
      trailingLines.push(line);
    }
  }

  return {
    definitionContent: definitionLines.join('\n'),
    trailingContent: trailingLines.length > 0 ? trailingLines.join('\n') : null
  };
}

module.exports = {
  split,
  splitGlossaryFile,
  checkSplittingConditions,
  getSplitterConfig,
  fixGlossaryFile,
  updateSpecsJsonAfterSplit,
  splitDefinitionSection,
  SPLITTER_CONFIG
};
