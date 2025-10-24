const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const chalk = require('chalk');

// Global path to specs.json, always resolved with projectDir
function getSpecsJsonPath(projectDir = process.cwd()) {
  return path.join(projectDir, 'specs.json');
}

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
}

/**
 * Check if a markdown file contains already split patterns (def or tref)
 * @param {string} filePath - Path to the markdown file to check
 * @returns {Promise<boolean>} True if file contains split patterns
 */
async function containsSplitPatterns(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content.includes('[[def:') || content.includes('[[tref:');
  } catch (error) {
    return false;
  }
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
    alreadySplit: false,
    canProceed: false,
    messages: []
  };

  const specsJsonPath = getSpecsJsonPath(projectDir);

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
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    if (mdFiles.length > 0) {
      // Check if any of the existing .md files contain split patterns
      let hasSplitPatterns = false;
      for (const mdFile of mdFiles) {
        const fullPath = path.join(termFilesDir, mdFile);
        if (await containsSplitPatterns(fullPath)) {
          hasSplitPatterns = true;
          break;
        }
      }
      
      if (hasSplitPatterns) {
        conditions.alreadySplit = true;
        conditions.outputDirSafe = true;
        conditions.messages.push('✅ Found existing .md files with [[def:]] or [[tref:]] patterns. Splitting already completed.');
      } else {
        conditions.messages.push('❌ There are .md files in the directory without split patterns. Stopping to prevent overwriting.');
        return conditions;
      }
    } else {
      conditions.outputDirSafe = true;
    }
  } catch (error) {
    // Directory doesn't exist, which is fine
    conditions.outputDirSafe = true;
  }

  conditions.canProceed = conditions.specsJsonExists && conditions.sourceFileExists && conditions.outputDirSafe;
  if (conditions.canProceed) {
    if (conditions.alreadySplit) {
      conditions.messages.push('✅ All conditions met. Splitting already completed - will skip.');
    } else {
      conditions.messages.push('✅ All conditions met. Ready to split.');
    }
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

    // If already split, return success without doing any work
    if (conditionCheck.alreadySplit) {
      result.success = true;
      result.messages.push('✅ Splitting already completed - skipping split phase');
      return result;
    }

    if (dryRun) {
      result.messages.push('🔍 Dry run mode - no files will be modified');
    }

    // Create backup of specs.json if it doesn't exist
    const backupPath = path.join(projectDir, 'specs.unsplit.json');
    const specsJsonPath = getSpecsJsonPath(projectDir);
    try {
      await fs.access(backupPath);
      if (verbose) result.messages.push('ℹ️ Backup specs.unsplit.json already exists');
    } catch (error) {
      if (!dryRun) {
        await fs.copyFile(specsJsonPath, backupPath);
        result.backupCreated = true;
        result.messages.push('✅ Created backup: specs.unsplit.json');
      }
    }

    // Restore from backup to ensure clean state
    if (!dryRun) {
      await fs.copyFile(backupPath, specsJsonPath);
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
 * and add the generated files in the correct order
 * @param {string} sourceTermsFile - Path to the source glossary file
 * @param {string} projectDir - Project directory containing specs.json
 * @param {boolean} dryRun - Whether to perform a dry run without modifying files
 * @returns {Promise<Object>} Result of the update operation
 * @throws {Error} When update operations fail
 */
async function updateSpecsJsonAfterSplit(sourceTermsFile, projectDir, dryRun = false) {
  const specsJsonPath = getSpecsJsonPath(projectDir);
  const result = {
    success: false,
    changes: [],
    messages: []
  };

  try {
    const specsContent = await fs.readFile(specsJsonPath, 'utf8');
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

    // Find the index of "terms-and-definitions-intro.md" to insert files around it
    const termsIntroIndex = spec.markdown_paths.findIndex(filePath => {
      return path.basename(filePath) === 'terms-and-definitions-intro.md';
    });

    // Check if generated files exist and add them to markdown_paths
    const sourceDir = path.dirname(sourceTermsFile);
    const glossaryIntroPath = path.join(sourceDir, 'glossary-intro-created-by-split-tool.md');
    const specAfterGlossaryPath = path.join(sourceDir, 'specification-after-glossary.md');
    
    let insertIndex = termsIntroIndex >= 0 ? termsIntroIndex : spec.markdown_paths.length;

    // Add glossary-intro-created-by-split-tool.md before terms-and-definitions-intro.md if it exists
    if (!dryRun) {
      try {
        await fs.access(glossaryIntroPath);
        const glossaryIntroFilename = 'glossary-intro-created-by-split-tool.md';
        
        // Check if it's not already in the array
        if (!spec.markdown_paths.includes(glossaryIntroFilename)) {
          spec.markdown_paths.splice(insertIndex, 0, glossaryIntroFilename);
          result.changes.push(`Added '${glossaryIntroFilename}' to markdown_paths`);
          result.messages.push(`✅ Added '${glossaryIntroFilename}' to markdown_paths`);
          insertIndex++; // Adjust index for next insertion
        }
      } catch (error) {
        // File doesn't exist, skip
      }
    } else {
      // For dry run, assume files will exist
      const glossaryIntroFilename = 'glossary-intro-created-by-split-tool.md';
      if (!spec.markdown_paths.includes(glossaryIntroFilename)) {
        result.changes.push(`Would add '${glossaryIntroFilename}' to markdown_paths`);
        result.messages.push(`✅ Would add '${glossaryIntroFilename}' to markdown_paths`);
      }
    }

    // Move to after terms-and-definitions-intro.md for specification-after-glossary.md
    if (termsIntroIndex >= 0) {
      insertIndex = termsIntroIndex + 1;
      if (!dryRun && spec.markdown_paths.includes('glossary-intro-created-by-split-tool.md')) {
        insertIndex++; // Account for the glossary-intro file we just added
      }
    }

    // Add specification-after-glossary.md after terms-and-definitions-intro.md if it exists
    if (!dryRun) {
      try {
        await fs.access(specAfterGlossaryPath);
        const specAfterGlossaryFilename = 'specification-after-glossary.md';
        
        // Check if it's not already in the array
        if (!spec.markdown_paths.includes(specAfterGlossaryFilename)) {
          spec.markdown_paths.splice(insertIndex, 0, specAfterGlossaryFilename);
          result.changes.push(`Added '${specAfterGlossaryFilename}' to markdown_paths`);
          result.messages.push(`✅ Added '${specAfterGlossaryFilename}' to markdown_paths`);
        }
      } catch (error) {
        // File doesn't exist, skip
      }
    } else {
      // For dry run, assume files will exist
      const specAfterGlossaryFilename = 'specification-after-glossary.md';
      if (!spec.markdown_paths.includes(specAfterGlossaryFilename)) {
        result.changes.push(`Would add '${specAfterGlossaryFilename}' to markdown_paths`);
        result.messages.push(`✅ Would add '${specAfterGlossaryFilename}' to markdown_paths`);
      }
    }

    // Write the updated specs.json if not a dry run
    if (!dryRun) {
      await fs.writeFile(specsJsonPath, JSON.stringify(specs, null, 2));
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
  const specsJsonPath = getSpecsJsonPath(projectRoot);
  try {
    const specsContent = await fs.readFile(specsJsonPath, 'utf8');
    const specs = JSON.parse(specsContent);
    
    if (!specs.specs || !Array.isArray(specs.specs) || specs.specs.length === 0) {
      throw new Error('No specs configuration found in specs.json');
    }

    const firstSpec = specs.specs[0];
    const specDirectory = firstSpec.spec_directory || './spec';
    const markdownPaths = firstSpec.markdown_paths || [];
    const specTermsDirectory = firstSpec.spec_terms_directory || 'terms-definitions';
    
    // Validate spec_terms_directory is not a placeholder
    if (specTermsDirectory === 'spec_terms_directory') {
      throw new Error('Invalid spec_terms_directory configuration: appears to be a placeholder value. Please provide a valid directory path.');
    }
    
    if (markdownPaths.length === 0) {
      throw new Error('No markdown_paths found in specs configuration');
    }


    // Look for a file that contains glossary definitions (files with [[def: markers)
    let sourceTermsFile = null;
    for (const markdownPath of markdownPaths) {
      const candidateFile = path.join(projectRoot, specDirectory, markdownPath);
      try {
        const content = await fs.readFile(candidateFile, 'utf8');
        if (content.includes(SPLITTER_CONFIG.definitionStringHead)) {
          sourceTermsFile = candidateFile;
          break;
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    if (!sourceTermsFile) {
      throw new Error('No file with glossary definitions (containing [[def: markers) found in markdown_paths');
    }
    
    // Use spec_terms_directory if provided, otherwise default to terms-definitions
    let termFilesDir;
    if (path.isAbsolute(specTermsDirectory)) {
      termFilesDir = specTermsDirectory;
    } else if (specTermsDirectory.startsWith('./') || specTermsDirectory.startsWith('../')) {
      termFilesDir = path.join(projectRoot, specTermsDirectory);
    } else {
      termFilesDir = path.join(projectRoot, specDirectory, specTermsDirectory);
    }

    return {
      sourceTermsFile,
      termFilesDir,
      specDirectory,
      markdownPaths,
      specTermsDirectory
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

/**
 * Extract a single definition block from markdown content
 * Captures [[def: ...]] and all following lines starting with ~ until a non-definition line
 * @param {string} content - Markdown content
 * @param {number} startIndex - Starting index of [[def:
 * @returns {Object} Object with definition text and end index
 */
function extractDefinitionBlock(content, startIndex) {
  const lines = content.substring(startIndex).split('\n');
  const definitionLines = [];
  let endIndex = startIndex;
  let foundDefLine = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Include the [[def: line
    if (!foundDefLine && trimmed.startsWith('[[def:')) {
      definitionLines.push(line);
      foundDefLine = true;
      endIndex += line.length + 1; // +1 for newline
      continue;
    }

    // After [[def:, include lines starting with ~ or empty lines
    if (foundDefLine) {
      if (trimmed.startsWith('~') || trimmed === '') {
        definitionLines.push(line);
        endIndex += line.length + 1;
      } else {
        // Stop when we hit a non-definition line
        break;
      }
    }
  }

  return {
    definitionText: definitionLines.join('\n').trim(),
    endIndex
  };
}

/**
 * Parse term name from [[def: ...]] syntax
 * Returns the first term (before first comma) as the filename base
 * @param {string} defLine - The [[def: ...]] line
 * @returns {string} Sanitized term name for filename
 */
function parseTermName(defLine) {
  const match = defLine.match(/\[\[def:\s*([^\]]+)\]\]/);
  if (!match) return null;

  const terms = match[1].split(',')[0].trim();
  // Sanitize for filename: lowercase, replace spaces/slashes with hyphens
  return terms
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Scan all markdown files in spec directory for [[def:]] definitions
 * and extract them to individual files in spec_terms_directory
 * @param {Object} [options={}] - Extraction options
 * @param {string} [options.directory=process.cwd()] - Project directory containing specs.json
 * @param {boolean} [options.dryRun=false] - Preview without creating files
 * @param {boolean} [options.verbose=false] - Detailed output
 * @returns {Promise<Object>} Result with extracted definitions and created files
 */
async function extractDefinitionsFromAllFiles(options = {}) {
  const {
    directory = process.cwd(),
    dryRun = false,
    verbose = false
  } = options;

  const result = {
    success: false,
    filesScanned: [],
    definitionsFound: [],
    filesCreated: [],
    messages: []
  };

  try {
    // Read specs.json configuration
    const specsJsonPath = getSpecsJsonPath(directory);
    const specsContent = await fs.readFile(specsJsonPath, 'utf8');
    const specs = JSON.parse(specsContent);

    if (!specs.specs || !Array.isArray(specs.specs) || specs.specs.length === 0) {
      throw new Error('No specs configuration found in specs.json');
    }

    const spec = specs.specs[0];
    const specDirectory = spec.spec_directory || './spec';
    const specTermsDirectory = spec.spec_terms_directory || 'terms-definitions';
    const markdownPaths = spec.markdown_paths || [];

    // Resolve paths
    const specDir = path.join(directory, specDirectory);
    let termFilesDir;
    if (path.isAbsolute(specTermsDirectory)) {
      termFilesDir = specTermsDirectory;
    } else if (specTermsDirectory.startsWith('./') || specTermsDirectory.startsWith('../')) {
      termFilesDir = path.join(directory, specTermsDirectory);
    } else {
      termFilesDir = path.join(specDir, specTermsDirectory);
    }

    if (verbose) {
      console.log(chalk.blue('🔧 Extracting definitions from all markdown files...'));
      console.log(chalk.blue(`📁 Spec directory: ${specDir}`));
      console.log(chalk.blue(`📁 Terms output directory: ${termFilesDir}`));
    }

    result.messages.push(`📁 Scanning ${markdownPaths.length} markdown files`);

    // Create output directory if it doesn't exist
    if (!dryRun) {
      await fs.mkdir(termFilesDir, { recursive: true });
    }

    // Track all definitions to avoid duplicates
    const allDefinitions = new Map(); // Map<filename, {defLine, definitionText, sourceFile}>

    // Scan each markdown file
    for (const mdPath of markdownPaths) {
      const fullPath = path.join(specDir, mdPath);
      
      try {
        await fs.access(fullPath);
        result.filesScanned.push(mdPath);

        const content = await fs.readFile(fullPath, 'utf8');
        
        // Find all [[def: occurrences
        let searchIndex = 0;
        while (true) {
          const defIndex = content.indexOf('[[def:', searchIndex);
          if (defIndex === -1) break;

          // Extract the definition block
          const { definitionText, endIndex } = extractDefinitionBlock(content, defIndex);
          
          // Parse term name
          const defLine = definitionText.split('\n')[0];
          const termName = parseTermName(defLine);

          if (termName) {
            const filename = `${termName}.md`;
            
            // Check for duplicates
            if (allDefinitions.has(filename)) {
              result.messages.push(
                chalk.yellow(`⚠️  Duplicate definition '${termName}' found in ${mdPath} (already in ${allDefinitions.get(filename).sourceFile})`)
              );
            } else {
              allDefinitions.set(filename, {
                defLine,
                definitionText,
                sourceFile: mdPath
              });

              result.definitionsFound.push({
                term: termName,
                sourceFile: mdPath,
                filename
              });

              if (verbose) {
                result.messages.push(`✅ Found: ${termName} in ${mdPath}`);
              }
            }
          }

          searchIndex = endIndex;
        }
      } catch (error) {
        if (verbose) {
          result.messages.push(chalk.yellow(`⚠️  Could not read ${mdPath}: ${error.message}`));
        }
      }
    }

    result.messages.push(`📊 Found ${allDefinitions.size} unique definitions`);

    // Create individual term files
    for (const [filename, defData] of allDefinitions) {
      const termFilePath = path.join(termFilesDir, filename);
      
      if (!dryRun) {
        await fs.writeFile(termFilePath, defData.definitionText + '\n');
      }
      
      result.filesCreated.push(filename);
      result.messages.push(
        `${dryRun ? '🔍 Would create' : '✅ Created'}: ${filename}`
      );
    }

    result.success = true;
    result.messages.push(
      chalk.green(`✅ Extraction ${dryRun ? 'simulation ' : ''}completed: ${result.filesCreated.length} files ${dryRun ? 'would be created' : 'created'}`)
    );

  } catch (error) {
    result.messages.push(chalk.red(`❌ Error during extraction: ${error.message}`));
    throw error;
  }

  return result;
}

/**
 * Main function to extract definitions from all markdown files
 * This is the entry point that should be called instead of split() for multi-file extraction
 * @param {Object} [options={}] - Extraction options
 * @param {string} [options.directory=process.cwd()] - Project directory
 * @param {boolean} [options.dryRun=false] - Preview mode
 * @param {boolean} [options.verbose=false] - Detailed output
 * @returns {Promise<Object>} Extraction result
 */
async function extractAllDefinitions(options = {}) {
  const {
    directory = process.cwd(),
    dryRun = false,
    verbose = false
  } = options;

  try {
    if (verbose) {
      console.log(chalk.blue('🚀 Starting definition extraction from all markdown files...'));
    }

    const result = await extractDefinitionsFromAllFiles({
      directory,
      dryRun,
      verbose
    });

    // Output messages
    result.messages.forEach(message => {
      if (typeof message === 'string') {
        if (message.startsWith('❌')) {
          console.log(chalk.red(message));
        } else if (message.startsWith('✅')) {
          console.log(chalk.green(message));
        } else if (message.startsWith('⚠️')) {
          console.log(chalk.yellow(message));
        } else if (message.startsWith('🔍') || message.startsWith('📁') || message.startsWith('📊')) {
          console.log(chalk.blue(message));
        } else {
          console.log(message);
        }
      } else {
        console.log(message);
      }
    });

    return result;
  } catch (error) {
    console.error(chalk.red(`❌ Extraction error: ${error.message}`));
    throw error;
  }
}

/**
 * Convert [[def:]] blocks to [[iref:]] references in source files
 * This replaces definition blocks with inline references after extraction
 * @param {Object} [options={}] - Conversion options
 * @param {string} [options.directory=process.cwd()] - Project directory
 * @param {boolean} [options.dryRun=false] - Preview mode
 * @param {boolean} [options.verbose=false] - Detailed output
 * @returns {Promise<Object>} Conversion result
 */
async function convertDefsToIrefs(options = {}) {
  const {
    directory = process.cwd(),
    dryRun = false,
    verbose = false
  } = options;

  const result = {
    success: false,
    filesProcessed: [],
    conversions: [],
    messages: []
  };

  try {
    // Read specs.json configuration
    const specsJsonPath = getSpecsJsonPath(directory);
    const specsContent = await fs.readFile(specsJsonPath, 'utf8');
    const specs = JSON.parse(specsContent);

    if (!specs.specs || !Array.isArray(specs.specs) || specs.specs.length === 0) {
      throw new Error('No specs configuration found in specs.json');
    }

    const spec = specs.specs[0];
    const specDirectory = spec.spec_directory || './spec';
    const markdownPaths = spec.markdown_paths || [];

    // Resolve paths
    const specDir = path.join(directory, specDirectory);

    if (verbose) {
      console.log(chalk.blue('🔄 Converting [[def:]] blocks to [[iref:]] references...'));
      console.log(chalk.blue(`📁 Spec directory: ${specDir}`));
    }

    result.messages.push(`📁 Processing ${markdownPaths.length} markdown files`);

    // Process each markdown file
    for (const mdPath of markdownPaths) {
      const fullPath = path.join(specDir, mdPath);

      try {
        await fs.access(fullPath);
        
        // Read file content
        let content = await fs.readFile(fullPath, 'utf8');
        let modified = false;
        let conversionsInFile = 0;

        // Find all [[def: occurrences and replace with [[iref:
        let searchIndex = 0;
        const replacements = []; // Store replacements to apply later

        while (true) {
          const defIndex = content.indexOf('[[def:', searchIndex);
          if (defIndex === -1) break;

          // Extract the definition block
          const { definitionText, endIndex } = extractDefinitionBlock(content, defIndex);
          
          // Parse the [[def: line to get the term name
          const defLine = definitionText.split('\n')[0];
          const termMatch = defLine.match(/\[\[def:\s*([^\],]+)/);
          
          if (termMatch) {
            const termName = termMatch[1].trim();
            
            // Create the replacement [[iref: reference
            const irefReplacement = `[[iref: ${termName}]]`;
            
            // Store this replacement
            replacements.push({
              start: defIndex,
              end: endIndex,
              original: definitionText,
              replacement: irefReplacement,
              termName: termName
            });

            conversionsInFile++;
          }

          searchIndex = endIndex;
        }

        // Apply replacements in reverse order to maintain indices
        if (replacements.length > 0) {
          modified = true;
          
          // Sort by start index descending
          replacements.sort((a, b) => b.start - a.start);
          
          // Apply each replacement
          for (const repl of replacements) {
            content = content.substring(0, repl.start) + repl.replacement + content.substring(repl.end);
            
            result.conversions.push({
              file: mdPath,
              term: repl.termName,
              original: repl.original,
              replacement: repl.replacement
            });

            if (verbose) {
              result.messages.push(`  ✅ ${mdPath}: ${repl.termName}`);
            }
          }

          // Write the modified content back
          if (!dryRun) {
            await fs.writeFile(fullPath, content);
          }

          result.filesProcessed.push({
            file: mdPath,
            conversions: conversionsInFile
          });

          result.messages.push(
            `${dryRun ? '🔍 Would convert' : '✅ Converted'} ${conversionsInFile} definition(s) in ${mdPath}`
          );
        }

      } catch (error) {
        if (verbose) {
          result.messages.push(chalk.yellow(`⚠️  Could not process ${mdPath}: ${error.message}`));
        }
      }
    }

    result.messages.push(`📊 Total conversions: ${result.conversions.length} [[def:]] → [[iref:]]`);
    result.success = true;
    result.messages.push(
      chalk.green(`✅ Conversion ${dryRun ? 'simulation ' : ''}completed: ${result.conversions.length} definitions converted`)
    );

  } catch (error) {
    result.messages.push(chalk.red(`❌ Error during conversion: ${error.message}`));
    throw error;
  }

  return result;
}

/**
 * Main function to convert definitions to inline references
 * Entry point for the convert-to-iref command
 * @param {Object} [options={}] - Conversion options
 * @param {string} [options.directory=process.cwd()] - Project directory
 * @param {boolean} [options.dryRun=false] - Preview mode
 * @param {boolean} [options.verbose=false] - Detailed output
 * @returns {Promise<Object>} Conversion result
 */
async function convertDefinitionsToIrefs(options = {}) {
  const {
    directory = process.cwd(),
    dryRun = false,
    verbose = false
  } = options;

  try {
    if (verbose) {
      console.log(chalk.blue('🚀 Starting [[def:]] to [[iref:]] conversion...'));
    }

    const result = await convertDefsToIrefs({
      directory,
      dryRun,
      verbose
    });

    // Output messages
    result.messages.forEach(message => {
      if (typeof message === 'string') {
        if (message.startsWith('❌')) {
          console.log(chalk.red(message));
        } else if (message.startsWith('✅')) {
          console.log(chalk.green(message));
        } else if (message.startsWith('⚠️')) {
          console.log(chalk.yellow(message));
        } else if (message.startsWith('🔍') || message.startsWith('📁') || message.startsWith('📊')) {
          console.log(chalk.blue(message));
        } else {
          console.log(message);
        }
      } else {
        console.log(message);
      }
    });

    return result;
  } catch (error) {
    console.error(chalk.red(`❌ Conversion error: ${error.message}`));
    throw error;
  }
}

module.exports = {
  split,
  splitGlossaryFile,
  checkSplittingConditions,
  getSplitterConfig,
  fixGlossaryFile,
  updateSpecsJsonAfterSplit,
  splitDefinitionSection,
  extractAllDefinitions,
  extractDefinitionsFromAllFiles,
  convertDefinitionsToIrefs,
  convertDefsToIrefs,
  SPLITTER_CONFIG
};
