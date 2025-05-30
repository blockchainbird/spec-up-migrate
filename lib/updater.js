const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { fileExists, safeJsonParse } = require('./utils');

/**
 * Fetch JSON data from a URL
 * @param {string} url - URL to fetch from
 * @returns {Promise<Object>} - Parsed JSON data
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`HTTP request failed: ${error.message}`));
    });
  });
}

/**
 * Fetch and convert Spec-Up-T boilerplate specs.json
 * @returns {Promise<Object>} - Converted specs configuration
 */
async function fetchSpecUpTBoilerplate() {
  const BOILERPLATE_URL = 'https://raw.githubusercontent.com/blockchainbird/spec-up-t/refs/heads/master/src/install-from-boilerplate/boilerplate/specs.json';
  
  try {
    const boilerplateSpecs = await fetchJson(BOILERPLATE_URL);
    return boilerplateSpecs;
  } catch (error) {
    // Fallback to minimal default configuration
    return {
      "specs": [
        {
          "title": "Spec-Up-T Starterpack",
          "spec_directory": "./spec",
          "spec_terms_directory": "terms-definitions",
          "output_path": "./docs",
          "markdown_paths": [
            "spec-head.md",
            "terms-and-definitions-intro.md",
            "example-markup-in-markdown.md"
          ],
          "logo": "https://raw.githubusercontent.com/blockchainbird/spec-up-t-starter-pack/main/spec-up-t-boilerplate/logo.svg",
          "logo_link": "https://github.com/blockchainbird/spec-up-t",
          "source": {
            "host": "github",
            "account": "blockchainbird",
            "repo": "spec-up-t-demo-on-documentation-website"
          },
          "external_specs": [],
          "external_specs_repos": [],
          "katex": false,
          "searchHighlightStyle": "ssi"
        }
      ]
    };
  }
}

/**
 * Convert Spec-Up format to Spec-Up-T format
 * @param {Object} specUpSpecs - Original Spec-Up specs configuration
 * @returns {Object} - Converted Spec-Up-T specs configuration
 */
function convertSpecUpToSpecUpT(specUpSpecs) {
  if (!specUpSpecs || !Array.isArray(specUpSpecs.specs)) {
    throw new Error('Invalid specs configuration');
  }

  const convertedSpecs = specUpSpecs.specs.map(spec => {
    const convertedSpec = { ...spec };
    
    // Add Spec-Up-T specific fields
    if (!convertedSpec.spec_terms_directory) {
      convertedSpec.spec_terms_directory = 'terms-definitions';
    }
    
    // Ensure output_path is set for Spec-Up-T
    if (!convertedSpec.output_path) {
      convertedSpec.output_path = './docs';
    }
    
    // Convert external_specs format from Spec-Up to Spec-Up-T
    if (convertedSpec.external_specs && Array.isArray(convertedSpec.external_specs)) {
      // Check if it's already in the old Spec-Up format (object with key-value pairs)
      if (convertedSpec.external_specs.length > 0 && typeof convertedSpec.external_specs[0] === 'object' && !convertedSpec.external_specs[0].external_spec) {
        const convertedExternalSpecs = [];
        
        convertedSpec.external_specs.forEach(specGroup => {
          Object.entries(specGroup).forEach(([key, url]) => {
            // Extract GitHub info from URL if possible
            let gitHubUrl = '';
            let termsDir = 'spec/term-definitions';
            
            if (typeof url === 'string' && url.includes('github.io')) {
              // Try to convert GitHub Pages URL to repository URL
              const match = url.match(/https:\/\/([^.]+)\.github\.io\/([^\/]+)/);
              if (match) {
                const [, account, repo] = match;
                gitHubUrl = `https://github.com/${account}/${repo}`;
              }
            }
            
            convertedExternalSpecs.push({
              "external_spec": key,
              "gh_page": url,
              "url": gitHubUrl || url,
              "terms_dir": termsDir
            });
          });
        });
        
        convertedSpec.external_specs = convertedExternalSpecs;
      }
    } else {
      convertedSpec.external_specs = [];
    }
    
    // Add external_specs_repos if not present
    if (!convertedSpec.external_specs_repos) {
      convertedSpec.external_specs_repos = [];
    }
    
    // Add Spec-Up-T specific configurations
    if (convertedSpec.katex === undefined) {
      convertedSpec.katex = convertedSpec.katex || false;
    }
    
    if (!convertedSpec.searchHighlightStyle) {
      convertedSpec.searchHighlightStyle = 'ssi';
    }
    
    // Remove assets field if present (Spec-Up-T handles this differently)
    if (convertedSpec.assets) {
      delete convertedSpec.assets;
    }
    
    return convertedSpec;
  });

  return {
    specs: convertedSpecs
  };
}

// Boilerplate configuration data based on spec-up-t repository
const BOILERPLATE_CONFIG = {
  
  defaultPackageScripts: {
    "edit": "node -e \"require('spec-up-t')()\"",
    "render": "node --no-warnings -e \"require('spec-up-t/index.js')({ nowatch: true })\"",
    "dev": "node -e \"require('spec-up-t')({ dev: true })\"",
    "collectExternalReferencesCache": "node --no-warnings -e \"require('spec-up-t/src/collect-external-references.js').collectExternalReferences({cache: true})\"",
    "collectExternalReferencesNoCache": "node --no-warnings -e \"require('spec-up-t/src/collect-external-references.js').collectExternalReferences({cache: false})\"",
    "topdf": "node -e \"require('spec-up-t/src/create-pdf.js')\"",
    "freeze": "node -e \"require('spec-up-t/src/freeze.js')\"",
    "references": "node -e \"require('spec-up-t/src/references.js')\"",
    "help": "cat ./node_modules/spec-up-t/src/install-from-boilerplate/help.txt",
    "menu": "bash ./node_modules/spec-up-t/src/install-from-boilerplate/menu.sh",
    "addremovexrefsource": "node --no-warnings -e \"require('spec-up-t/src/add-remove-xref-source.js')\"",
    "configure": "node --no-warnings -e \"require('spec-up-t/src/configure.js')\"",
    "healthCheck": "node --no-warnings -e \"require('spec-up-t/src/health-check.js')\"",
    "custom-update": "npm update && node -e \"require('spec-up-t/src/install-from-boilerplate/custom-update.js')\""
  },

  gitignoreEntries: [
    'node_modules',
    '*.log',
    'dist',
    '*.bak',
    '*.tmp',
    '.DS_Store',
    '.env',
    'coverage',
    'build',
    '.history',
    'docs/',
    'specs-generated.json',
    'terms-index.json'
  ],

  assetFiles: [
    { path: 'assets/test.json', content: '{\n  "test": "This is a test JSON file for content insertion"\n}' },
    { path: 'assets/test.text', content: 'This is a test text file for content insertion examples.' }
  ],

  rootFiles: [
    { 
      path: '.env.example', 
      content: '# Optional GitHub API token for increased rate limits\nGITHUB_API_TOKEN=YOUR_GITHUB_API_TOKEN\n'
    }
  ],

  specFiles: [
    {
      path: 'spec/terms-and-definitions-intro.md',
      content: `# Terms and Definitions

This section contains the terminology used in this specification.

## Introduction

All terminology in this specification is defined in separate files in the \`terms-definitions\` directory. This allows for better organization and reuse of terms across specifications.

Terms are automatically linked throughout the specification using the \`[[ref: term-name]]\` syntax.
`
    },
    {
      path: 'spec/spec-head.md',
      content: `# Spec-Up-T Demo

## Intro

This is a migrated Spec-Up-T installation. Find information on the [Spec-Up-T documentation website](https://blockchainbird.github.io/spec-up-t-website/).

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
`
    }
  ]
};

/**
 * Update configuration files for Spec-Up-T migration
 * @param {string} directory - Directory path containing Spec-Up installation
 * @param {Object} options - Update options (dryRun: boolean)
 * @returns {Object} - Update result with modified files
 */
async function updateConfigurations(directory = '.', options = {}) {
  const absoluteDir = path.resolve(directory);
  const { dryRun = false } = options;
  
  const updates = [];
  let successful = 0;
  
  // Update package.json
  const packageResult = await updatePackageJson(absoluteDir, dryRun);
  updates.push(packageResult);
  if (packageResult.success) successful++;
  
  // Update specs.json
  const specsResult = await updateSpecsJson(absoluteDir, dryRun);
  updates.push(specsResult);
  if (specsResult.success) successful++;

  // Update .gitignore
  const gitignoreResult = await updateGitignore(absoluteDir, dryRun);
  updates.push(gitignoreResult);
  if (gitignoreResult.success) successful++;

  // Create required directories and files
  const directoryResult = await createRequiredDirectories(absoluteDir, dryRun);
  updates.push(directoryResult);
  if (directoryResult.success) successful++;

  // Create asset files
  const assetsResult = await createAssetFiles(absoluteDir, dryRun);
  updates.push(assetsResult);
  if (assetsResult.success) successful++;

  // Create root files
  const rootFilesResult = await createRootFiles(absoluteDir, dryRun);
  updates.push(rootFilesResult);
  if (rootFilesResult.success) successful++;

  // Create specification files if needed
  const specFilesResult = await createSpecificationFiles(absoluteDir, dryRun);
  updates.push(specFilesResult);
  if (specFilesResult.success) successful++;

  return {
    directory: absoluteDir,
    updates,
    summary: {
      total: updates.length,
      successful,
      failed: updates.length - successful
    }
  };
}

/**
 * Update package.json for Spec-Up-T using template-based approach
 */
async function updatePackageJson(directory, dryRun) {
  const packagePath = path.join(directory, 'package.json');
  
  try {
    if (!await fileExists(packagePath)) {
      return {
        file: 'package.json',
        success: false,
        error: 'File not found',
        changes: []
      };
    }

    const content = await fs.readFile(packagePath, 'utf8');
    const existingPackage = safeJsonParse(content);
    const changes = [];

    // Fetch starter pack template from remote URL
    let starterPackageTemplate;
    try {
      starterPackageTemplate = await fetchJson('https://raw.githubusercontent.com/trustoverip/spec-up-t-starter-pack/refs/heads/main/package.spec-up-t.json');
      changes.push('Fetched starter pack template from remote');
    } catch (fetchError) {
      // Fallback to local minimal template
      starterPackageTemplate = {
        "name": "spec-up-t-starterpack",
        "version": "2.0.1",
        "license": "Apache-2.0",
        "description": "Quick setup for a specification with the Spec-Up-T tool.",
        "dependencies": {
          "dotenv": "^16.4.5",
          "spec-up-t": "^1.1.0"
        }
      };
      changes.push('Used fallback template (remote fetch failed)');
    }

    // Preserve existing essential metadata
    const preservedFields = ['name', 'version', 'description', 'author', 'license', 'repository', 'keywords', 'homepage', 'bugs'];
    const newPackage = { ...starterPackageTemplate };
    
    preservedFields.forEach(field => {
      if (existingPackage[field]) {
        newPackage[field] = existingPackage[field];
        changes.push(`Preserved existing ${field}`);
      }
    });

    // Ensure template dependencies are used (not preserved from existing)
    newPackage.dependencies = { ...starterPackageTemplate.dependencies };
    if (JSON.stringify(existingPackage.dependencies) !== JSON.stringify(newPackage.dependencies)) {
      changes.push('Replaced dependencies with starter pack template');
    }

    // Clean up devDependencies and remove main entry point
    if (existingPackage.devDependencies && Object.keys(existingPackage.devDependencies).length > 0) {
      delete newPackage.devDependencies;
      changes.push('Removed devDependencies (not needed for spec-up-t)');
    }
    
    if (existingPackage.main) {
      delete newPackage.main;
      changes.push('Removed main entry point (CLI-based now)');
    }

    // Initialize scripts section
    if (!newPackage.scripts) newPackage.scripts = {};

    // Apply spec-up-t scripts using add-scripts-keys.js logic
    const configScriptsKeys = {
      "edit": "node -e \"require('spec-up-t')()\"",
      "render": "node --no-warnings -e \"require('spec-up-t/index.js')({ nowatch: true })\"",
      "dev": "node -e \"require('spec-up-t')({ dev: true })\"",
      "collectExternalReferencesCache": "node --no-warnings -e \"require('spec-up-t/src/collect-external-references.js').collectExternalReferences({cache: true})\"",
      "collectExternalReferencesNoCache": "node --no-warnings -e \"require('spec-up-t/src/collect-external-references.js').collectExternalReferences({cache: false})\"",
      "topdf": "node -e \"require('spec-up-t/src/create-pdf.js')\"",
      "freeze": "node -e \"require('spec-up-t/src/freeze.js')\"",
      "references": "node -e \"require('spec-up-t/src/references.js')\"",
      "help": "cat ./node_modules/spec-up-t/src/install-from-boilerplate/help.txt",
      "menu": "bash ./node_modules/spec-up-t/src/install-from-boilerplate/menu.sh",
      "addremovexrefsource": "node --no-warnings -e \"require('spec-up-t/src/add-remove-xref-source.js')\"",
      "configure": "node --no-warnings -e \"require('spec-up-t/src/configure.js')\"",
      "healthCheck": "node --no-warnings -e \"require('spec-up-t/src/health-check.js')\"",
      "custom-update": "npm update && node -e \"require('spec-up-t/src/install-from-boilerplate/custom-update.js')\""
    };

    // Scripts to always overwrite (like configOverwriteScriptsKeys)
    const configOverwriteScriptsKeys = {
      "edit": true,
      "render": true,
      "dev": true,
      "collectExternalReferencesCache": true,
      "collectExternalReferencesNoCache": true,
      "topdf": true,
      "freeze": true,
      "references": true,
      "help": true,
      "menu": true,
      "addremovexrefsource": true,
      "configure": true,
      "healthCheck": true,
      "custom-update": true
    };

    // Add scripts without overwriting existing ones unless specified in overwriteKeys
    for (const [key, value] of Object.entries(configScriptsKeys)) {
      if (!newPackage.scripts[key] || configOverwriteScriptsKeys[key]) {
        newPackage.scripts[key] = value;
        const action = configOverwriteScriptsKeys[key] ? 'Updated' : 'Added';
        changes.push(`${action} ${key} script`);
      }
    }

    if (!dryRun && changes.length > 0) {
      await fs.writeFile(packagePath, JSON.stringify(newPackage, null, 2));
    }

    return {
      file: 'package.json',
      success: true,
      changes,
      dryRun
    };

  } catch (error) {
    return {
      file: 'package.json',
      success: false,
      error: error.message,
      changes: []
    };
  }
}

/**
 * Update specs.json for Spec-Up-T format
 */
async function updateSpecsJson(directory, dryRun) {
  const specsPath = path.join(directory, 'specs.json');
  
  try {
    if (!await fileExists(specsPath)) {
      // Create new specs.json from dynamically fetched template
      const newSpecs = await fetchSpecUpTBoilerplate();
      
      if (!dryRun) {
        await fs.writeFile(specsPath, JSON.stringify(newSpecs, null, 2));
      }
      
      return {
        file: 'specs.json',
        success: true,
        changes: ['Created new specs.json from Spec-Up-T boilerplate template'],
        dryRun
      };
    }
    
    const content = await fs.readFile(specsPath, 'utf8');
    const specsData = safeJsonParse(content);
    const changes = [];
    
    // Ensure specs array exists
    if (!Array.isArray(specsData.specs)) {
      specsData.specs = [];
      changes.push('Created specs array');
    }
    
    // Update spec configurations for Spec-Up-T format
    specsData.specs = specsData.specs.map(spec => {
      const updatedSpec = { ...spec };
      
      // Update output paths from docs/ to docs/ (keep for compatibility)
      if (updatedSpec.output_path && updatedSpec.output_path.includes('docs/')) {
        // Keep docs/ as output for compatibility
        changes.push(`Verified output path for ${updatedSpec.title || 'spec'}`);
      } else if (!updatedSpec.output_path) {
        updatedSpec.output_path = './docs';
        changes.push(`Set default output path for ${updatedSpec.title || 'spec'}`);
      }
      
      // Add spec_terms_directory if not present
      if (!updatedSpec.spec_terms_directory) {
        updatedSpec.spec_terms_directory = 'terms-definitions';
        changes.push(`Added spec_terms_directory for ${updatedSpec.title || 'spec'}`);
      }

      // Add terminology configuration
      if (!updatedSpec.terminology) {
        updatedSpec.terminology = {
          enabled: true,
          directory: 'terminology'
        };
        changes.push(`Added terminology config for ${updatedSpec.title || 'spec'}`);
      }

      // Ensure markdown_paths includes required files
      if (!updatedSpec.markdown_paths) {
        updatedSpec.markdown_paths = [];
      }
      
      // Add terms-and-definitions-intro.md if not present
      if (!updatedSpec.markdown_paths.includes('terms-and-definitions-intro.md')) {
        updatedSpec.markdown_paths.push('terms-and-definitions-intro.md');
        changes.push(`Added terms-and-definitions-intro.md to markdown_paths`);
      }

      // Convert external_specs format from Spec-Up to Spec-Up-T if needed
      if (updatedSpec.external_specs && Array.isArray(updatedSpec.external_specs) && 
          updatedSpec.external_specs.length > 0 && 
          typeof updatedSpec.external_specs[0] === 'object' && 
          !updatedSpec.external_specs[0].external_spec) {
        
        const convertedExternalSpecs = [];
        
        updatedSpec.external_specs.forEach(specGroup => {
          Object.entries(specGroup).forEach(([key, url]) => {
            // Extract GitHub info from URL if possible
            let gitHubUrl = '';
            let termsDir = 'spec/term-definitions';
            
            if (typeof url === 'string' && url.includes('github.io')) {
              // Try to convert GitHub Pages URL to repository URL
              const match = url.match(/https:\/\/([^.]+)\.github\.io\/([^\/]+)/);
              if (match) {
                const [, account, repo] = match;
                gitHubUrl = `https://github.com/${account}/${repo}`;
              }
            }
            
            convertedExternalSpecs.push({
              "external_spec": key,
              "gh_page": url,
              "url": gitHubUrl || url,
              "terms_dir": termsDir
            });
          });
        });
        
        updatedSpec.external_specs = convertedExternalSpecs;
        changes.push(`Converted external_specs format to Spec-Up-T for ${updatedSpec.title || 'spec'}`);
      } else if (!updatedSpec.external_specs) {
        updatedSpec.external_specs = [];
        changes.push(`Added external_specs array for ${updatedSpec.title || 'spec'}`);
      }

      if (!updatedSpec.external_specs_repos) {
        updatedSpec.external_specs_repos = [];
        changes.push(`Added external_specs_repos array for ${updatedSpec.title || 'spec'}`);
      }

      // Add default values for new Spec-Up-T features
      if (updatedSpec.katex === undefined) {
        updatedSpec.katex = false;
        changes.push(`Added katex configuration for ${updatedSpec.title || 'spec'}`);
      }

      if (!updatedSpec.searchHighlightStyle) {
        updatedSpec.searchHighlightStyle = 'ssi';
        changes.push(`Added searchHighlightStyle for ${updatedSpec.title || 'spec'}`);
      }

      // Remove assets field if present (Spec-Up-T handles this differently)
      if (updatedSpec.assets) {
        delete updatedSpec.assets;
        changes.push(`Removed assets configuration (handled differently in Spec-Up-T) for ${updatedSpec.title || 'spec'}`);
      }
      
      return updatedSpec;
    });
    
    // Add Spec-Up-T global configuration if not present
    if (!specsData.global) {
      specsData.global = {
        terminology: {
          enabled: true,
          directory: 'terminology'
        },
        output: {
          directory: 'docs'
        }
      };
      changes.push('Added global Spec-Up-T configuration');
    }
    
    if (!dryRun && changes.length > 0) {
      await fs.writeFile(specsPath, JSON.stringify(specsData, null, 2));
    }
    
    return {
      file: 'specs.json',
      success: true,
      changes,
      dryRun
    };
    
  } catch (error) {
    return {
      file: 'specs.json',
      success: false,
      error: error.message,
      changes: []
    };
  }
}

/**
 * Update .gitignore for Spec-Up-T
 */
async function updateGitignore(directory, dryRun) {
  const gitignorePath = path.join(directory, '.gitignore');
  
  try {
    let gitignoreContent = '';
    let changes = [];
    
    // Read existing .gitignore or start with empty content
    try {
      gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        changes.push('Created new .gitignore file');
      } else {
        throw error;
      }
    }
    
    // Split content into lines and filter out empty lines
    const existingLines = gitignoreContent.split('\n').map(line => line.trim()).filter(line => line !== '');
    
    // Add Spec-Up-T specific entries if not already present
    const newEntries = [];
    BOILERPLATE_CONFIG.gitignoreEntries.forEach(entry => {
      if (!existingLines.includes(entry)) {
        newEntries.push(entry);
        changes.push(`Added ${entry} to .gitignore`);
      }
    });
    
    // Remove deprecated entries
    const deprecatedEntries = ['package-lock.js', '*.index.html'];
    const filteredLines = existingLines.filter(line => {
      const isDeprecated = deprecatedEntries.some(dep => line.includes(dep));
      if (isDeprecated) {
        changes.push(`Removed deprecated entry: ${line}`);
      }
      return !isDeprecated;
    });
    
    if (newEntries.length > 0 || filteredLines.length !== existingLines.length) {
      const updatedContent = [...filteredLines, ...newEntries].join('\n') + '\n';
      
      if (!dryRun) {
        await fs.writeFile(gitignorePath, updatedContent, 'utf8');
      }
    }
    
    return {
      file: '.gitignore',
      success: true,
      changes,
      dryRun
    };
    
  } catch (error) {
    return {
      file: '.gitignore',
      success: false,
      error: error.message,
      changes: []
    };
  }
}

/**
 * Create required directories for Spec-Up-T
 */
async function createRequiredDirectories(directory, dryRun) {
  const requiredDirs = [
    'spec',
    'spec/terms-definitions',
    'assets',
    'terminology',
    'terminology/actors',
    'terminology/artifacts',
    'terminology/concepts',
    'terminology/processes'
  ];
  
  const changes = [];
  
  try {
    for (const dir of requiredDirs) {
      const dirPath = path.join(directory, dir);
      
      try {
        await fs.access(dirPath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          if (!dryRun) {
            await fs.mkdir(dirPath, { recursive: true });
          }
          changes.push(`Created directory: ${dir}`);
        }
      }
    }
    
    // Create .gitkeep files in terminology subdirectories
    const gitkeepDirs = [
      'terminology/actors',
      'terminology/artifacts', 
      'terminology/concepts',
      'terminology/processes'
    ];
    
    for (const dir of gitkeepDirs) {
      const gitkeepPath = path.join(directory, dir, '.gitkeep');
      
      try {
        await fs.access(gitkeepPath);
      } catch (error) {
        if (error.code === 'ENOENT' && !dryRun) {
          await fs.writeFile(gitkeepPath, '');
          changes.push(`Created .gitkeep in ${dir}`);
        }
      }
    }
    
    return {
      file: 'directories',
      success: true,
      changes,
      dryRun
    };
    
  } catch (error) {
    return {
      file: 'directories',
      success: false,
      error: error.message,
      changes: []
    };
  }
}

/**
 * Create required asset files for Spec-Up-T
 */
async function createAssetFiles(directory, dryRun) {
  const changes = [];
  
  try {
    for (const asset of BOILERPLATE_CONFIG.assetFiles) {
      const assetPath = path.join(directory, asset.path);
      
      try {
        await fs.access(assetPath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          if (!dryRun) {
            // Ensure directory exists
            await fs.mkdir(path.dirname(assetPath), { recursive: true });
            await fs.writeFile(assetPath, asset.content, 'utf8');
          }
          changes.push(`Created asset file: ${asset.path}`);
        }
      }
    }
    
    return {
      file: 'assets',
      success: true,
      changes,
      dryRun
    };
    
  } catch (error) {
    return {
      file: 'assets',
      success: false,
      error: error.message,
      changes: []
    };
  }
}

/**
 * Create required root files for Spec-Up-T
 */
async function createRootFiles(directory, dryRun) {
  const changes = [];
  
  try {
    for (const rootFile of BOILERPLATE_CONFIG.rootFiles) {
      const rootPath = path.join(directory, rootFile.path);
      
      try {
        await fs.access(rootPath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          if (!dryRun) {
            await fs.writeFile(rootPath, rootFile.content, 'utf8');
          }
          changes.push(`Created root file: ${rootFile.path}`);
        }
      }
    }
    
    return {
      file: 'root-files',
      success: true,
      changes,
      dryRun
    };
    
  } catch (error) {
    return {
      file: 'root-files',
      success: false,
      error: error.message,
      changes: []
    };
  }
}

/**
 * Create required specification files for Spec-Up-T
 */
async function createSpecificationFiles(directory, dryRun) {
  const changes = [];
  
  try {
    for (const specFile of BOILERPLATE_CONFIG.specFiles) {
      const specPath = path.join(directory, specFile.path);
      
      try {
        await fs.access(specPath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          if (!dryRun) {
            // Ensure directory exists
            await fs.mkdir(path.dirname(specPath), { recursive: true });
            await fs.writeFile(specPath, specFile.content, 'utf8');
          }
          changes.push(`Created specification file: ${specFile.path}`);
        }
      }
    }

    // Create terms-index.json if it doesn't exist
    const termsIndexPath = path.join(directory, 'terms-index.json');
    try {
      await fs.access(termsIndexPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const defaultTermsIndex = {
          "terms": [],
          "generated": new Date().toISOString(),
          "version": "1.0"
        };
        
        if (!dryRun) {
          await fs.writeFile(termsIndexPath, JSON.stringify(defaultTermsIndex, null, 2), 'utf8');
        }
        changes.push('Created terms-index.json');
      }
    }
    
    return {
      file: 'specification-files',
      success: true,
      changes,
      dryRun
    };
    
  } catch (error) {
    return {
      file: 'specification-files',
      success: false,
      error: error.message,
      changes: []
    };
  }
}

module.exports = {
  updateConfigurations,
  updatePackageJson,
  updateSpecsJson,
  updateGitignore,
  createRequiredDirectories,
  createAssetFiles,
  createRootFiles,
  createSpecificationFiles,
  fetchSpecUpTBoilerplate,
  convertSpecUpToSpecUpT,
  BOILERPLATE_CONFIG
};
