# Spec-Up Migrate

A command-line tool for migrating Spec-Up specifications between different formats and versions.

## Installation

You can run this tool directly with npx without installing it globally:

```bash
npx spec-up-migrate <command> [options]
```

Or install it globally:

```bash
npm install -g spec-up-migrate
```

## Usage

### Migrate Command

Migrate a Spec-Up specification to a newer format:

```bash
# Migrate a single file
npx spec-up-migrate migrate ./spec.md

# Migrate with custom output directory
npx spec-up-migrate migrate ./spec.md -o ./output

# Migrate entire directory
npx spec-up-migrate migrate ./specs/ -o ./migrated-specs

# Dry run (see what would be changed without making changes)
npx spec-up-migrate migrate ./spec.md --dry-run

# Specify target format
npx spec-up-migrate migrate ./spec.md -f latest
```

### Validate Command

Validate a Spec-Up specification:

```bash
# Validate a single file
npx spec-up-migrate validate ./spec.md

# Validate a directory
npx spec-up-migrate validate ./specs/
```

### Initialize Command

Initialize a new Spec-Up project:

```bash
# Initialize with default template
npx spec-up-migrate init

# Initialize with specific template
npx spec-up-migrate init -t advanced
```

## Options

### Global Options

- `--version` - Show version number
- `--help` - Show help information

### Migrate Options

- `-o, --output <path>` - Output directory (default: './migrated')
- `-f, --format <format>` - Target format (default: 'latest')
- `--dry-run` - Show what would be migrated without making changes

### Initialize Options

- `-t, --template <template>` - Template to use (default: 'basic')

## Development

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd spec-up-migrate

# Install dependencies
npm install

# Make the CLI executable
chmod +x bin/cli.js
```

### Testing Locally

```bash
# Link the package for local testing
npm link

# Test the command
spec-up-migrate --help
```

### Publishing

```bash
# Build and publish to npm
npm publish
```

## License

MIT
