# Spec-Up Migrate

[![npm version](https://badge.fury.io/js/spec-up-migrate.svg)](https://www.npmjs.com/package/spec-up-migrate)
[![NPM Downloads](https://img.shields.io/npm/dm/spec-up-migrate.svg?style=flat)](https://npmjs.org/package/spec-up-migrate)

A production-ready command-line tool for migrating Spec-Up specifications to Spec-Up-T. This tool provides enterprise-grade automation for transforming legacy Spec-Up projects to the modern Spec-Up-T framework with 95%+ detection confidence and professional HTML output generation.

## ✨ Features

- 🔍 **Smart Detection**: Automatically detect Spec-Up installations with confidence scoring
- 📦 **Safe Backup**: Create comprehensive backups before migration with timestamps
- 🧹 **Clean Removal**: Remove obsolete files and legacy dependencies
- ⚡ **Configuration Update**: Modernize specs.json and package.json for Spec-Up-T compatibility
- 🚀 **Complete Setup**: Install Spec-Up-T with proper project structure and terminology support
- 🔄 **End-to-End Migration**: Fully automated migration workflow
- ✅ **Validation**: Built-in validation to ensure migration success
- 🎯 **Professional Output**: Generate publication-ready HTML specifications

## 🚀 Quick Start

Run the migration tool directly with npx (recommended):

```bash
# Navigate to your Spec-Up project directory
cd /path/to/your/spec-up-project

# Run complete migration
npx spec-up-migrate complete

# Test the migrated project
npm run render
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
```

**What this does:**
1. 🔍 Detects Spec-Up installation (95%+ confidence required)
2. 📦 Creates timestamped backup of critical files
3. 🧹 Removes obsolete files and legacy dependencies
4. ⚡ Updates package.json and specs.json for Spec-Up-T
5. 🚀 Installs Spec-Up-T with complete project structure
6. ✅ Validates migration success

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

## Configuration Changes

### specs.json Migration

The tool automatically updates specs.json from version 1.0 to 2.0:

```json
// Before (v1.0)
{
  "spec_version": "1.0",
  "title": "My Specification",
  "specs": [...]
}

// After (v2.0)
{
  "spec_version": "2.0", 
  "title": "My Specification",
  "specs": [...]
}
```

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
├── specs.json (updated for Spec-Up-T)
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

### Example 2: Migration with Preview

```bash
# First, check if your project is compatible:
npx spec-up-migrate detect --verbose

# Preview what the migration would do:
npx spec-up-migrate complete --dry-run

# If satisfied, run the actual migration:
npx spec-up-migrate complete
```

### Example 3: Troubleshooting Failed Migration

```bash
# If migration fails, check the specific phase:
npx spec-up-migrate detect
# Look for confidence level - should be >80%

# Try individual phases:
npx spec-up-migrate backup
npx spec-up-migrate cleanup --dry-run
npx spec-up-migrate update --dry-run
npx spec-up-migrate install --dry-run
```

## 📊 Migration Results

After successful migration, your project gains these capabilities:

### ✅ New Features Available
- **Terminology Management**: Structured terminology with cross-references
- **Advanced Rendering**: Professional-grade HTML output
- **PDF Generation**: `npm run topdf`
- **Development Mode**: Live reload with `npm run dev`
- **Health Checking**: Project validation with `npm run healthCheck`
- **External References**: Automatic reference collection and caching

### ✅ Modern Tooling
- **12+ npm scripts** for complete workflow management
- **Asset management** with automated file handling
- **Specification versioning** with automatic index generation
- **External specs integration** for multi-repository projects

## Examples

### Basic Migration

```bash
# Navigate to your Spec-Up project
cd my-spec-project

# Run complete migration
npx spec-up-migrate complete

# Verify the migration
npx spec-up-t render
```

### Step-by-Step Migration

```bash
# 1. Detect and analyze
npx spec-up-migrate detect -v

# 2. Create backup
npx spec-up-migrate backup

# 3. Clean obsolete files
npx spec-up-migrate cleanup --dry-run
npx spec-up-migrate cleanup

# 4. Update configurations
npx spec-up-migrate update

# 5. Install Spec-Up-T
npx spec-up-migrate install
```

### Troubleshooting

If migration fails:

```bash
# Check what was detected
npx spec-up-migrate detect -v

# Restore from backup if needed
cp -r ./backup-[timestamp]/* ./

# Try individual phases
npx spec-up-migrate cleanup --dry-run
npx spec-up-migrate update --dry-run
```

## Development

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd spec-up-migrate

# Install dependencies  
npm install

# Make CLI executable
chmod +x bin/cli.js
```

### Testing

```bash
# Link for local testing
npm link

# Test commands
spec-up-migrate detect
spec-up-migrate --help

# Test with mock data
cd mock-spec-up
spec-up-migrate detect -v
```

### Project Structure

```
spec-up-migrate/
├── bin/cli.js           # Command-line interface
├── lib/migrator.js      # Core migration logic
├── package.json         # NPX configuration
├── README.md           # Documentation
└── mock-spec-up/       # Test environment
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Support

For issues or questions:

- Create an issue on GitHub
- Check existing documentation
- Review the troubleshooting section
