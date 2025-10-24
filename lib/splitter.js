const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const chalk = require('chalk');

// Global path to specs.json, always resolved with projectDir
function getSpecsJsonPath(projectDir = process.cwd()) {
  return path.join(projectDir, 'specs.json');
}

/**
 * @file Spec-Up Definition Processing functionality
 * @description Extract [[def:]] definitions from markdown files and convert them to [[iref:]] inline references
 * @author Kor Dwarshuis
 * @version 2.0.0
 * @since 2024-06-10
 */

/**
 * Configuration for definition processing
 */
const DEFINITION_CONFIG = {
  definitionStringHead: '[[def:' // Start of a definition
};



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

/**
 * Process definitions: Extract all [[def:]] from markdown files and convert them to [[iref:]]
 * This is the recommended workflow that combines extraction and conversion in one operation
 * @param {Object} [options={}] - Processing options
 * @param {string} [options.directory=process.cwd()] - Project directory
 * @param {boolean} [options.dryRun=false] - Preview mode
 * @param {boolean} [options.verbose=false] - Detailed output
 * @returns {Promise<Object>} Processing result with both extraction and conversion results
 */
async function processDefinitions(options = {}) {
  const {
    directory = process.cwd(),
    dryRun = false,
    verbose = false
  } = options;

  const overallResult = {
    success: false,
    extraction: null,
    conversion: null,
    messages: []
  };

  try {
    console.log(chalk.blue('🚀 Processing definitions: Extract → Convert to [[iref:]]'));
    console.log('');

    // Step 1: Extract all definitions
    console.log(chalk.blue('📖 Step 1/2: Extracting definitions...'));
    const extractionResult = await extractDefinitionsFromAllFiles({
      directory,
      dryRun,
      verbose
    });

    overallResult.extraction = extractionResult;

    if (!extractionResult.success) {
      overallResult.messages.push('❌ Extraction failed - aborting conversion');
      return overallResult;
    }

    console.log('');
    console.log(chalk.green(`✅ Extracted ${extractionResult.filesCreated.length} definitions`));
    console.log('');

    // Step 2: Convert definitions to irefs
    console.log(chalk.blue('🔄 Step 2/2: Converting [[def:]] to [[iref:]]...'));
    const conversionResult = await convertDefsToIrefs({
      directory,
      dryRun,
      verbose
    });

    overallResult.conversion = conversionResult;

    if (!conversionResult.success) {
      overallResult.messages.push('⚠️  Extraction succeeded but conversion failed');
      overallResult.messages.push('   You can manually run: npx spec-up-migrate convert-to-iref');
      return overallResult;
    }

    console.log('');
    console.log(chalk.green(`✅ Converted ${conversionResult.conversions.length} definitions to [[iref:]]`));
    console.log('');

    overallResult.success = true;
    overallResult.messages.push(chalk.green('🎉 Definition processing completed successfully!'));
    overallResult.messages.push('');
    overallResult.messages.push(chalk.blue('Summary:'));
    overallResult.messages.push(chalk.gray(`  Definitions extracted: ${extractionResult.filesCreated.length}`));
    overallResult.messages.push(chalk.gray(`  Definitions converted to [[iref:]]: ${conversionResult.conversions.length}`));
    overallResult.messages.push('');
    overallResult.messages.push(chalk.blue('Next steps:'));
    overallResult.messages.push(chalk.gray('  1. Review the extracted term files in spec_terms_directory'));
    overallResult.messages.push(chalk.gray('  2. Verify source files now use [[iref:]] instead of [[def:]]'));
    overallResult.messages.push(chalk.gray('  3. Run "npm run render" to build and view the specification'));

  } catch (error) {
    overallResult.messages.push(chalk.red(`❌ Processing error: ${error.message}`));
    throw error;
  }

  return overallResult;
}

module.exports = {
  extractAllDefinitions,
  extractDefinitionsFromAllFiles,
  convertDefinitionsToIrefs,
  convertDefsToIrefs,
  processDefinitions,
  extractDefinitionBlock,
  parseTermName,
  DEFINITION_CONFIG
};
