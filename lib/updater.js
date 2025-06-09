const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { fileExists, safeJsonParse } = require('./utils');

/**
 * Repository configuration for external dependencies
 * This centralizes all repository references to make them easily configurable
 */
const REPO_CONFIG = {
  // Main spec-up-t repository (used for boilerplate files)
  SPEC_UP_T_REPO: {
    owner: 'blockchainbird',
    name: 'spec-up-t',
    branch: 'master'
  },
  // Trust over IP spec-up-t repository (used for logos and assets)
  TRUSTOVERIP_SPEC_UP_T_REPO: {
    owner: 'trustoverip',
    name: 'spec-up-t',
    branch: 'master'
  }
};

/**
 * Generate GitHub raw URL for a repository file
 * @param {Object} repo - Repository configuration object
 * @param {string} filePath - Path to the file in the repository
 * @returns {string} - Full GitHub raw URL
 */
function generateGitHubRawUrl(repo, filePath) {
  return `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/refs/heads/${repo.branch}/${filePath}`;
}

/**
 * Generate GitHub repository URL
 * @param {Object} repo - Repository configuration object
 * @returns {string} - Full GitHub repository URL
 */
function generateGitHubRepoUrl(repo) {
  return `https://github.com/${repo.owner}/${repo.name}`;
}

/**
 * Generate fallback spec configuration for Spec-Up-T
 * @returns {Object} - Fallback spec configuration object
 */
function generateFallbackSpecConfig() {
  return {
    "title": "Spec-Up-T Starterpack",
    "description": "Create technical specifications in markdown. Based on the original Spec-Up, extended with Terminology tooling",
    "author": "Trust over IP Foundation",
    "spec_directory": "./spec",
    "spec_terms_directory": "terms-definitions",
    "output_path": "./docs",
    "markdown_paths": [
      "terms-and-definitions-intro.md"
    ],
    "logo": generateGitHubRawUrl(
      REPO_CONFIG.TRUSTOVERIP_SPEC_UP_T_REPO,
      'src/install-from-boilerplate/boilerplate/static/logo.svg'
    ),
    "logo_link": generateGitHubRepoUrl(REPO_CONFIG.TRUSTOVERIP_SPEC_UP_T_REPO),
    "favicon": generateGitHubRawUrl(
      REPO_CONFIG.TRUSTOVERIP_SPEC_UP_T_REPO,
      'src/install-from-boilerplate/boilerplate/static/favicon.ico'
    ),
    "source": {
      "host": "github",
      "account": "trustoverip",
      "repo": "spec-up-t-starter-pack"
    },
    "external_specs": [
      {
        "external_spec": "test-1",
        "gh_page": "https://blockchainbird.github.io/spec-up-xref-test-1/",
        "url": "https://github.com/blockchainbird/spec-up-xref-test-1",
        "terms_dir": "spec/term-definitions"
      },
      {
        "external_spec": "test-2",
        "gh_page": "https://blockchainbird.github.io/spec-up-xref-test-2/",
        "url": "https://github.com/blockchainbird/spec-up-xref-test-2",
        "terms_dir": "spec/term-definitions"
      }
    ],
    "katex": false
  };
}

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
 * Fetch text data from a URL
 * @param {string} url - URL to fetch from
 * @returns {Promise<string>} - Text content
 */
function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (error) => {
      reject(new Error(`HTTP request failed: ${error.message}`));
    });
  });
}

/**
 * Fetch and parse gitignore entries from remote boilerplate
 * @returns {Promise<Array<string>>} - Array of gitignore entries
 */
async function fetchGitignoreEntries() {
  const GITIGNORE_URL = generateGitHubRawUrl(
    REPO_CONFIG.SPEC_UP_T_REPO,
    'src/install-from-boilerplate/boilerplate/gitignore'
  );

  try {
    const gitignoreContent = await fetchText(GITIGNORE_URL);
    // Parse gitignore content into array, filter out empty lines and comments
    const entries = gitignoreContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '' && !line.startsWith('#'));

    return entries;
  } catch (error) {
    // Fallback to default gitignore entries
    return [
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
      '/.cache/'
    ];
  }
}

/**
 * Fetch and parse scripts configuration from remote boilerplate
 * @returns {Promise<Object>} - Scripts configuration object
 */
async function fetchScriptsConfig() {
  const SCRIPTS_CONFIG_URL = generateGitHubRawUrl(
    REPO_CONFIG.SPEC_UP_T_REPO,
    'src/install-from-boilerplate/config-scripts-keys.js'
  );

  try {
    const scriptsConfigContent = await fetchText(SCRIPTS_CONFIG_URL);
    
    // Parse the module.exports from the config file
    // This is a simple regex-based extraction since we know the structure
    const configScriptsKeysMatch = scriptsConfigContent.match(/const configScriptsKeys = ({[\s\S]*?});/);
    const configOverwriteScriptsKeysMatch = scriptsConfigContent.match(/const configOverwriteScriptsKeys = ({[\s\S]*?});/);
    
    if (configScriptsKeysMatch && configOverwriteScriptsKeysMatch) {
      // Use eval to parse the object literals (safe since we control the source)
      const configScriptsKeys = eval(`(${configScriptsKeysMatch[1]})`);
      const configOverwriteScriptsKeys = eval(`(${configOverwriteScriptsKeysMatch[1]})`);
      
      return { configScriptsKeys, configOverwriteScriptsKeys };
    }
    
    throw new Error('Could not parse scripts configuration');
  } catch (error) {
    // Fallback to default configuration
    return {
      configScriptsKeys: {
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
      configOverwriteScriptsKeys: {
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
      }
    };
  }
}
async function fetchSpecUpTBoilerplate() {
  const BOILERPLATE_URL = generateGitHubRawUrl(
    REPO_CONFIG.SPEC_UP_T_REPO,
    'src/install-from-boilerplate/boilerplate/specs.json'
  );

  try {
    const boilerplateSpecs = await fetchJson(BOILERPLATE_URL);
    return boilerplateSpecs;
  } catch (error) {
    // Fallback to full default configuration matching remote boilerplate structure
    return {
      "specs": [generateFallbackSpecConfig()]
    };
  }
}

/**
 * Transform a single spec configuration to Spec-Up-T format
 * @param {Object} spec - Single spec configuration
 * @param {Object} options - Transformation options
 * @returns {Object} - { transformedSpec, changes }
 */
function transformSpecToSpecUpT(spec, options = {}) {
  const {
    boilerplateSpec = null,
    trackChanges = false,
    specTitle = spec.title || 'spec'
  } = options;

  const transformedSpec = { ...spec };
  const changes = [];

  // Add author and description from boilerplate if provided
  if (boilerplateSpec) {
    if (!transformedSpec.author && boilerplateSpec.author) {
      transformedSpec.author = boilerplateSpec.author;
      if (trackChanges) changes.push(`Added author from Spec-Up-T boilerplate for ${specTitle}`);
    }

    if (!transformedSpec.description && boilerplateSpec.description) {
      transformedSpec.description = boilerplateSpec.description;
      if (trackChanges) changes.push(`Added description from Spec-Up-T boilerplate for ${specTitle}`);
    }
  }

  // Add fallback author and description if still missing
  if (!transformedSpec.author) {
    transformedSpec.author = "Trust over IP Foundation";
    if (trackChanges) changes.push(`Added fallback author for ${specTitle}`);
  }

  if (!transformedSpec.description) {
    transformedSpec.description = "Create technical specifications in markdown. Based on the original Spec-Up, extended with Terminology tooling";
    if (trackChanges) changes.push(`Added fallback description for ${specTitle}`);
  }

  // Add Spec-Up-T specific fields
  if (!transformedSpec.spec_terms_directory) {
    transformedSpec.spec_terms_directory = 'terms-definitions';
    if (trackChanges) changes.push(`Added spec_terms_directory for ${specTitle}`);
  }

  // Ensure output_path is set
  if (!transformedSpec.output_path) {
    transformedSpec.output_path = './docs';
    if (trackChanges) changes.push(`Set default output path for ${specTitle}`);
  } else if (transformedSpec.output_path.includes('docs/') && trackChanges) {
    changes.push(`Verified output path for ${specTitle}`);
  }

  // Handle markdown_paths - preserve original paths and add terms file at the end
  if (!transformedSpec.markdown_paths) {
    transformedSpec.markdown_paths = [];
  }

  // Add terms-and-definitions-intro.md at the end if not already present
  if (!transformedSpec.markdown_paths.includes('terms-and-definitions-intro.md')) {
    transformedSpec.markdown_paths.push('terms-and-definitions-intro.md');
    if (trackChanges) changes.push(`Added terms-and-definitions-intro.md to markdown_paths`);
  }

  // Convert external_specs format from Spec-Up to Spec-Up-T
  if (transformedSpec.external_specs && Array.isArray(transformedSpec.external_specs) &&
    transformedSpec.external_specs.length > 0 &&
    typeof transformedSpec.external_specs[0] === 'object' &&
    !transformedSpec.external_specs[0].external_spec) {

    const convertedExternalSpecs = [];

    transformedSpec.external_specs.forEach(specGroup => {
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

    transformedSpec.external_specs = convertedExternalSpecs;
    if (trackChanges) changes.push(`Converted external_specs format to Spec-Up-T for ${specTitle}`);
  } else if (!transformedSpec.external_specs) {
    transformedSpec.external_specs = [];
    if (trackChanges) changes.push(`Added external_specs array for ${specTitle}`);
  }

  // Add katex configuration
  if (transformedSpec.katex === undefined) {
    transformedSpec.katex = false;
    if (trackChanges) changes.push(`Added katex configuration for ${specTitle}`);
  }

  // Remove assets field
  if (transformedSpec.assets) {
    delete transformedSpec.assets;
    if (trackChanges) changes.push(`Removed assets configuration (handled differently in Spec-Up-T) for ${specTitle}`);
  }

  return { transformedSpec, changes };
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
    const { transformedSpec } = transformSpecToSpecUpT(spec);
    return transformedSpec;
  });

  return {
    specs: convertedSpecs
  };
}

// Boilerplate configuration data based on spec-up-t repository
const BOILERPLATE_CONFIG = {
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

    // Create basic package.json template for spec-up-t projects
    const starterPackageTemplate = {
      "name": "spec-up-t-project",
      "version": "1.0.0",
      "license": "Apache-2.0",
      "description": "Technical specification project created with Spec-Up-T tool.",
      "dependencies": {
        "dotenv": "^16.4.7",
        "spec-up-t": "^1.2.7"
      }
    };
    changes.push('Created package.json template for Spec-Up-T migration');

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

    // Fetch scripts configuration from remote boilerplate
    let scriptsConfig;
    try {
      scriptsConfig = await fetchScriptsConfig();
      changes.push('Fetched scripts configuration from Spec-Up-T boilerplate');
    } catch (fetchError) {
      // Will use fallback values defined in fetchScriptsConfig
      scriptsConfig = await fetchScriptsConfig(); // This will return fallback
      changes.push('Used fallback scripts configuration (remote fetch failed)');
    }

    const { configScriptsKeys, configOverwriteScriptsKeys } = scriptsConfig;

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

    // Fetch boilerplate to get spec-level fields like author and description
    let boilerplateSpec = null;
    try {
      const boilerplate = await fetchSpecUpTBoilerplate();
      boilerplateSpec = boilerplate.specs && boilerplate.specs[0];
    } catch (boilerplateError) {
      // Will use fallback values in spec processing
    }

    // Ensure specs array exists
    if (!Array.isArray(specsData.specs)) {
      specsData.specs = [];
      changes.push('Created specs array');
    }

    // If there are multiple specs, keep only the first one
    if (specsData.specs.length > 1) {
      const originalCount = specsData.specs.length;
      specsData.specs = [specsData.specs[0]];
      changes.push(`Kept only the first spec object, removed ${originalCount - 1} additional spec(s)`);
    }

    // Transform existing specs to Spec-Up-T format
    if (specsData.specs.length > 0) {
      const transformedSpecs = specsData.specs.map((spec, index) => {
        const { transformedSpec, changes: specChanges } = transformSpecToSpecUpT(spec, {
          boilerplateSpec,
          trackChanges: true,
          specTitle: spec.title || `spec ${index + 1}`
        });
        changes.push(...specChanges);
        return transformedSpec;
      });
      
      specsData.specs = transformedSpecs;
      changes.push(`Transformed ${transformedSpecs.length} existing spec(s) to Spec-Up-T format`);
    } else {
      // Only use fallback when no existing specs to migrate
      const fallbackSpec = generateFallbackSpecConfig();
      specsData.specs = [fallbackSpec];
      changes.push('No existing specs found - added fallback Spec-Up-T spec configuration');
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

    // Fetch gitignore entries from remote boilerplate
    const gitignoreEntries = await fetchGitignoreEntries();

    // Add Spec-Up-T specific entries if not already present
    const newEntries = [];
    gitignoreEntries.forEach(entry => {
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
    'assets'
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
  fetchGitignoreEntries,
  fetchScriptsConfig,
  convertSpecUpToSpecUpT,
  transformSpecToSpecUpT,
  generateFallbackSpecConfig,
  BOILERPLATE_CONFIG,
  REPO_CONFIG,
  generateGitHubRawUrl,
  generateGitHubRepoUrl
};
