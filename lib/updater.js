const fs = require('fs').promises;
const path = require('path');
const { fileExists, safeJsonParse } = require('./utils');

// Boilerplate configuration data based on spec-up-t repository
const BOILERPLATE_CONFIG = {
  defaultSpecs: {
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
  },
  
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
 * Update package.json for Spec-Up-T
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
    const packageData = safeJsonParse(content);
    const changes = [];
    
    // Update dependencies - remove old spec-up dependencies
    if (packageData.dependencies) {
      if (packageData.dependencies['spec-up']) {
        delete packageData.dependencies['spec-up'];
        packageData.dependencies['spec-up-t'] = '^1.0.0';
        changes.push('Replaced spec-up with spec-up-t dependency');
      }

      // Remove other legacy dependencies
      const legacyDeps = ['gulp', 'gulp-connect', 'marked', 'gulp-sass'];
      legacyDeps.forEach(dep => {
        if (packageData.dependencies[dep]) {
          delete packageData.dependencies[dep];
          changes.push(`Removed legacy dependency: ${dep}`);
        }
      });
    }
    
    if (packageData.devDependencies) {
      if (packageData.devDependencies['spec-up']) {
        delete packageData.devDependencies['spec-up'];
        packageData.devDependencies['spec-up-t'] = '^1.0.0';
        changes.push('Replaced spec-up with spec-up-t dev dependency');
      }

      // Remove other legacy dev dependencies
      const legacyDevDeps = ['gulp', 'gulp-connect', 'marked', 'gulp-sass'];
      legacyDevDeps.forEach(dep => {
        if (packageData.devDependencies[dep]) {
          delete packageData.devDependencies[dep];
          changes.push(`Removed legacy dev dependency: ${dep}`);
        }
      });
    }
    
    // Add spec-up-t if not present
    if (!packageData.dependencies) packageData.dependencies = {};
    if (!packageData.dependencies['spec-up-t']) {
      packageData.dependencies['spec-up-t'] = '^1.0.0';
      changes.push('Added spec-up-t dependency');
    }

    // Update scripts
    if (!packageData.scripts) packageData.scripts = {};
    
    // Update existing scripts
    const scriptUpdates = {
      'start': 'spec-up-t serve',
      'build': 'spec-up-t build',
      'dev': 'spec-up-t serve --watch'
    };

    Object.entries(scriptUpdates).forEach(([script, command]) => {
      if (packageData.scripts[script]) {
        packageData.scripts[script] = command;
        changes.push(`Updated ${script} script to use spec-up-t`);
      }
    });

    // Add new Spec-Up-T scripts
    Object.entries(BOILERPLATE_CONFIG.defaultPackageScripts).forEach(([script, command]) => {
      if (!packageData.scripts[script]) {
        packageData.scripts[script] = command;
        changes.push(`Added ${script} script`);
      }
    });

    // Remove legacy scripts
    const legacyScripts = ['gulp'];
    legacyScripts.forEach(script => {
      if (packageData.scripts[script]) {
        delete packageData.scripts[script];
        changes.push(`Removed legacy script: ${script}`);
      }
    });
    
    // Update main entry point
    if (packageData.main === 'index.js') {
      delete packageData.main;
      changes.push('Removed main entry point (CLI-based now)');
    }
    
    if (!dryRun && changes.length > 0) {
      await fs.writeFile(packagePath, JSON.stringify(packageData, null, 2));
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
      // Create new specs.json from template if it doesn't exist
      const newSpecs = { ...BOILERPLATE_CONFIG.defaultSpecs };
      
      if (!dryRun) {
        await fs.writeFile(specsPath, JSON.stringify(newSpecs, null, 2));
      }
      
      return {
        file: 'specs.json',
        success: true,
        changes: ['Created new specs.json from Spec-Up-T template'],
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

      // Add external specs arrays if not present
      if (!updatedSpec.external_specs) {
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
  createSpecificationFiles,
  BOILERPLATE_CONFIG
};
