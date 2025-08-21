# Spec-Up Migrate

[![npm version](https://img.shields.io/npm/v/spec-up-migrate)](https://www.npmjs.com/package/spec-up-migrate)
[![NPM Downloads](https://img.shields.io/npm/dm/spec-up-migrate.svg?style=flat)](https://npmjs.org/package/spec-up-migrate)

A production-ready command-line tool for migrating Spec-Up specifications to Spec-Up-T. This tool provides enterprise-grade automation for transforming legacy Spec-Up projects to the modern Spec-Up-T framework with 95%+ detection confidence and professional HTML output generation.

## Table of Contents

- [Features](#-features)
- [Configuration Sources](#-configuration-sources)
- [Quick Start](#-quick-start)
- [Installation Options](#-installation-options)
- [Commands](#-commands)
- [Migration Process](#migration-process)
- [What Gets Migrated](#what-gets-migrated)
- [Configuration Changes](#configuration-changes)

## ✨ Features

- 🔍 **Smart Detection**: Automatically detect Spec-Up installations with confidence scoring
- 📦 **Safe Backup**: Create comprehensive backups before migration with timestamps
- 🧹 **Clean Removal**: Remove obsolete files and legacy dependencies
- ⚡ **Dynamic Configuration**: Fetch latest Spec-Up-T configuration from official repository
- 🔄 **Intelligent Conversion**: Convert legacy external_specs format to modern Spec-Up-T structure
- 🚀 **Complete Setup**: Install Spec-Up-T with proper project structure and terminology support
- ✂️ **Glossary Splitting**: Split glossary files into individual term definition files for better organization
- 🔄 **End-to-End Migration**: Fully automated migration workflow including glossary splitting
- ✅ **Validation**: Built-in validation to ensure migration success
- 🎯 **Professional Output**: Generate publication-ready HTML specifications

## 🔄 Configuration Sources

The migration tool fetches the latest configurations from the official Spec-Up-T repository to ensure your migrated project uses current standards:

- **Scripts Configuration**: `blockchainbird/spec-up-t/src/install-from-boilerplate/config-scripts-keys.js`
- **Specs Template**: `blockchainbird/spec-up-t/src/install-from-boilerplate/boilerplate/specs.json`
- **Gitignore Patterns**: `blockchainbird/spec-up-t/src/install-from-boilerplate/boilerplate/gitignore`

If remote fetching fails, the tool automatically falls back to built-in configurations that match the Spec-Up-T standards.

## 🚀 Quick Start

Run the migration tool directly with npx (recommended):

```bash
# Navigate to your Spec-Up project directory
cd /path/to/your/spec-up-project

# Run complete migration
npx spec-up-migrate complete

# Test the migrated project (choose your option from menu)
npm run menu
```

## 📦 Installation Options

### Option 1: Use with npx (Recommended)
```bash
npx spec-up-migrate <command> [options]
```

### Option 2: Global Installation
```bash
npm install -g spec-up-migrate
spec-up-migrate <command> [options]
```

## 📋 Commands

### 🔄 Complete Migration (Recommended)

Perform a full migration from Spec-Up to Spec-Up-T in one command:

```bash
# Complete migration with all phases
npx spec-up-migrate complete

# Migrate specific directory
npx spec-up-migrate complete ./my-spec-project

# Dry run to see what would be done (safe preview)
npx spec-up-migrate complete --dry-run

# Skip backup phase (not recommended)
npx spec-up-migrate complete --no-backup

# Skip detection phase (useful for troubleshooting)
npx spec-up-migrate complete --skip-detection

# Combine options as needed
npx spec-up-migrate complete --skip-detection --dry-run
```

**What this does:**
1. 🔍 Detects Spec-Up installation (95%+ confidence required, can be skipped with `--skip-detection`)
2. 📦 Creates timestamped backup of critical files
3. 🧹 Removes obsolete files and legacy dependencies
4. ⚡ Updates package.json and specs.json for Spec-Up-T with dynamic boilerplate
5. ✂️ Splits glossary file into individual term files (if applicable)
6. 🗑️ Removes source glossary file from markdown_paths after splitting
7. 🚀 Installs Spec-Up-T with complete project structure
8. ✅ Validates migration success

### 🔍 Detection

Analyze your project to determine if it's a valid Spec-Up installation:

```bash
# Detect in current directory
npx spec-up-migrate detect

# Detect in specific directory  
npx spec-up-migrate detect ./my-spec-project

# Verbose output with detailed analysis
npx spec-up-migrate detect --verbose
```

**Detection Criteria:**
- ✅ specs.json configuration file
- ✅ spec-up dependency in package.json
- ✅ Typical Spec-Up project structure
- ✅ Markdown files in spec directory
- ✅ Index.js or gulpfile.js

### 📦 Backup

Create backups of critical files before migration:

```bash
# Backup current directory
npx spec-up-migrate backup

# Backup specific directory
npx spec-up-migrate backup ./my-spec-project

# Custom backup location
npx spec-up-migrate backup -o ./backups
```

### 🧹 Cleanup

Remove obsolete Spec-Up files and dependencies:

```bash
# Cleanup current directory
npx spec-up-migrate cleanup

# Dry run to see what would be removed
npx spec-up-migrate cleanup --dry-run

# Force removal without confirmation
npx spec-up-migrate cleanup --force
```

### ⚡ Update Configuration

Update specs.json and package.json for Spec-Up-T:

```bash
# Update configuration files
npx spec-up-migrate update

# Update in specific directory
npx spec-up-migrate update ./my-spec-project

# Dry run to preview changes
npx spec-up-migrate update --dry-run
```

### 🚀 Install Spec-Up-T

Install Spec-Up-T and set up project structure:

```bash
# Install Spec-Up-T
npx spec-up-migrate install

# Install in specific directory
npx spec-up-migrate install ./my-spec-project

# Skip npm install (dependencies only)
npx spec-up-migrate install --no-deps
```

### ✅ Validation

Validate that a project meets Spec-Up-T requirements:

```bash
# Validate current directory
npx spec-up-migrate validate .

# Validate specific project
npx spec-up-migrate validate ./my-migrated-project

# Alternative: use npm script after migration
npm run validate
```

**Validation Checks:**
- ✅ Spec-Up-T dependency present
- ✅ Required scripts (edit, render, dev)
- ✅ Valid specs.json structure
- ✅ Recommended directory structure
- ✅ Configuration files (.env.example)

### ✂️ Split Glossary

Split a glossary file into individual term definition files (useful for Spec-Up-T terminology management):

```bash
# Split glossary in current directory
npx spec-up-migrate split

# Split glossary in specific directory
npx spec-up-migrate split ./my-spec-project

# Dry run to see what would be created
npx spec-up-migrate split --dry-run

# Verbose output with detailed information
npx spec-up-migrate split --verbose

# Alternative: use npm script after integration
npm run split
```

**What this does:**
1. 📖 Reads glossary file specified in specs.json
2. ✂️ Splits terms marked with `[[def: ]]` into individual files
3. 📁 Creates terms-definitions directory with organized term files
4. 💾 Creates backup of original specs.json
5. 🔧 Generates intro file with remaining content
6. 🗑️ Removes source glossary file from markdown_paths automatically

**Requirements:**
- ✅ specs.json file with proper configuration
- ✅ Glossary file exists (first item in markdown_paths)
- ✅ Clean terms-definitions directory (no existing .md files)

### Legacy Migrate Command

Migrate individual specification files:

```bash
# Migrate a single file
npx spec-up-migrate migrate ./spec.md

# Migrate with custom output directory
npx spec-up-migrate migrate ./spec.md -o ./output

# Dry run to preview changes
npx spec-up-migrate migrate ./spec.md --dry-run
```

## Migration Process

The migration from Spec-Up to Spec-Up-T involves several phases:

1. **Detection** - Analyze the project to confirm it's a Spec-Up installation
2. **Backup** - Create backups of critical files
3. **Cleanup** - Remove obsolete Spec-Up files and dependencies
4. **Update** - Modernize configuration files (specs.json v1.0 → v2.0, package.json)
5. **Install** - Install Spec-Up-T and create new project structure

### Detection Scoring

The detection system uses a confidence-based approach:

- **specs.json file**: 40% confidence
- **package.json with spec-up dependency**: 30% confidence  
- **index.js gulpfile**: 20% confidence
- **Additional indicators** (2.5% each):
  - gulpfile.js
  - assets/ directory
  - docs/ directory
  - .github/workflows/
  - Basic .gitignore patterns

### Dynamic Boilerplate Fetching (v1.2.0)

The migration tool dynamically fetches the latest Spec-Up-T boilerplate configuration from:
- **Primary Source**: `https://raw.githubusercontent.com/blockchainbird/spec-up-t/refs/heads/master/src/install-from-boilerplate/boilerplate/specs.json`
- **Fallback**: Built-in configuration matching the remote structure
- **Benefits**: Always uses the latest Spec-Up-T standards and configuration options

### Files Backed Up

The backup process preserves these critical files:

- `specs.json` - Main specification configuration
- `package.json` - Project dependencies and scripts
- `index.js` - Legacy gulpfile
- `gulpfile.js` - Build configuration
- `.gitignore` - Git ignore patterns
- `README.md` - Project documentation

### Files Cleaned Up

The cleanup process removes these obsolete files:

- `assets/` directory (fonts, images, styles)
- `custom-assets/` directory
- `multi-file-test/` directory
- `single-file-test/` directory
- `src/` directory
- `fonts/` directory
- `docs/fonts/` directory
- `gulpfile.js` (replaced by Spec-Up-T)
- `index.js` (replaced by Spec-Up-T)
- `references.js` (replaced by Spec-Up-T)
- `.github/workflows/` (legacy CI/CD)
- `node_modules/` (will be reinstalled)
- `package-lock.json` (regenerated)
- `specup_logo.png` (regenerated)

## 🛠️ What Gets Migrated

### Package.json Updates

- ✅ Updates dependencies to use `spec-up-t` instead of `spec-up`
- ✅ Adds all required Spec-Up-T scripts (edit, render, dev, etc.)
- ✅ Preserves existing project metadata (name, version, author, etc.)
- ✅ Removes obsolete configurations

### Specs.json Configuration

- ✅ Converts to Spec-Up-T format with new required fields
- ✅ Adds `spec_terms_directory` for terminology support
- ✅ Converts `external_specs` format from Spec-Up to Spec-Up-T
- ✅ Adds Spec-Up-T specific configurations (katex, etc.)

### Directory Structure

- ✅ Creates `spec/terms-definitions/` directory for terminology
- ✅ Adds required asset files for content insertion examples
- ✅ Creates `.env.example` for configuration templates

### Gitignore Updates

- ✅ Adds Spec-Up-T specific ignore patterns
- ✅ Removes deprecated entries
- ✅ Fetches latest patterns from official boilerplate

## Configuration Changes

### specs.json Migration

The tool automatically updates specs.json and converts external_specs format:

```json
// Before (Legacy Spec-Up format)
{
  "specs": [
    {
      "title": "My Specification",
      "spec_directory": "./spec",
      "external_specs": [
        {
          "PE": "https://identity.foundation/presentation-exchange",
          "test-1": "https://blockchainbird.github.io/spec-up-xref-test-1/"
        }
      ]
    }
  ]
}

// After (Modern Spec-Up-T format)
{
  "specs": [
    {
      "title": "My Specification", 
      "author": "Trust over IP Foundation",
      "description": "Create technical specifications in markdown. Based on the original Spec-Up, extended with Terminology tooling",
      "spec_directory": "./spec",
      "spec_terms_directory": "terms-definitions",
      "external_specs": [
        {
          "external_spec": "PE",
          "gh_page": "https://identity.foundation/presentation-exchange",
          "url": "https://identity.foundation/presentation-exchange",
          "terms_dir": "spec/term-definitions"
        },
        {
          "external_spec": "test-1", 
          "gh_page": "https://blockchainbird.github.io/spec-up-xref-test-1/",
          "url": "https://github.com/blockchainbird/spec-up-xref-test-1",
          "terms_dir": "spec/term-definitions"
        }
      ],
      "katex": false
    }
  ]
}
```

### Key Migration Features (v1.2.0)

- **Dynamic Boilerplate**: Fetches latest configuration from remote repository
- **Smart External Specs Conversion**: Converts key-value pairs to structured objects
- **GitHub URL Detection**: Automatically converts GitHub Pages URLs to repository URLs
- **Field Placement**: Ensures author/description are at spec level (not document root)
- **Fallback Support**: Works offline with built-in configuration matching remote structure

### package.json Updates

Updates package.json for Spec-Up-T compatibility:

- Removes `spec-up` dependency
- Adds `spec-up-t` dependency
- Updates scripts for new CLI commands
- Modernizes to latest package.json standards

### New Project Structure

Creates Spec-Up-T project structure:

```
project/
├── .specup-t.yml          # Spec-Up-T configuration
├── terminology/           # Term definitions directory
│   └── .gitkeep
├── specs.json            # Updated specification config
├── package.json          # Updated dependencies
└── [your markdown files] # Existing specs preserved
```

## Options Reference

### Global Options

- `--version` - Show version number
- `--help` - Show help information
- `--dry-run` - Preview changes without executing
- `--verbose, -v` - Detailed output

### Command-Specific Options

#### complete
- `--no-backup` - Skip backup phase (not recommended)
- `--skip-detection` - Skip detection phase and assume valid Spec-Up installation
- `--dry-run` - Show what would be done

#### backup  
- `-o, --output <path>` - Custom backup directory

#### cleanup
- `--force` - Skip confirmation prompts
- `--dry-run` - Show what would be removed

#### detect
- `-v, --verbose` - Detailed analysis output

#### install
- `--no-deps` - Skip npm dependency installation

## 🎯 Real-World Examples

### Example 1: Basic Migration

```bash
# You have a Spec-Up project like this:
my-spec-project/
├── specs.json
├── package.json (with spec-up dependency)
├── spec/
│   ├── intro.md
│   └── main.md
└── docs/ (generated output)

# Run the migration:
cd my-spec-project
npx spec-up-migrate complete

# After migration, you'll have:
my-spec-project/
├── specs.json (updated for Spec-Up-T with dynamic boilerplate)
├── package.json (spec-up-t dependency, new scripts)
├── spec/
│   ├── intro.md
│   ├── main.md
│   └── terms-and-definitions-intro.md (added)
├── terminology/ (new structure)
│   ├── actors/
│   ├── artifacts/ 
│   ├── concepts/
│   └── processes/
├── assets/ (new)
└── backup-2025-05-28/ (safety backup)

# Test your migrated project:
npm run render  # Generate HTML specification
npm run dev     # Development mode with live reload
```

## 🚀 After Migration

Once migration completes successfully, follow these steps to get your project running:

### 1. Install Dependencies
```bash
npm install  # Usually done automatically during migration
```

### 2. Test the Migration
```bash
npm run render  # Generate HTML specification
```

### 3. Start Development
```bash
npm run dev     # Start development server with live reload
```

### 4. View Available Commands
```bash
npm run help    # See all available Spec-Up-T commands
```

### 5. Additional Commands
```bash
npm run topdf        # Generate PDF version
npm run healthCheck  # Verify project health
npm run edit         # Open editor interface
```

### 6. Troubleshooting
If the migration fails to fetch remote configurations, it will automatically fall back to built-in defaults that match the Spec-Up-T standards.

### Example 2: Migration with Preview
```bash
# First, check if your project is compatible:
npx spec-up-migrate detect --verbose

# Preview what the migration would do:
npx spec-up-migrate complete --dry-run

# If satisfied, run the actual migration:
npx spec-up-migrate complete
```

### Example 3: External Specs Conversion

```bash
# If your legacy specs.json has external_specs like this:
# "external_specs": [{"PE": "https://identity.foundation/presentation-exchange"}]

# After migration, it becomes:
# "external_specs": [{
#   "external_spec": "PE",
#   "gh_page": "https://identity.foundation/presentation-exchange", 
#   "url": "https://identity.foundation/presentation-exchange",
#   "terms_dir": "spec/term-definitions"
# }]

# The migration automatically handles the conversion
npx spec-up-migrate complete
```

### Example 4: Troubleshooting Failed Migration

```bash
# If migration fails, check the specific phase:
npx spec-up-migrate detect
# Look for confidence level - should be >80%

# If detection fails but you know your project is valid Spec-Up:
npx spec-up-migrate complete --skip-detection

# Try individual phases:
npx spec-up-migrate backup
npx spec-up-migrate cleanup --dry-run
npx spec-up-migrate update --dry-run
npx spec-up-migrate install --dry-run

# Use environment variable to skip detection:
SKIP_DETECTION=true npx spec-up-migrate complete
```

**When to use `--skip-detection`:**
- Detection confidence is below 80% but you know the project is valid Spec-Up
- Working with a modified Spec-Up project structure
- Debugging detection issues
- Testing migration on non-standard setups

