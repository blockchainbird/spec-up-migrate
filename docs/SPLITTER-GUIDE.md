# Spec-Up Splitter

The splitter functionality allows you to split a glossary file containing multiple term definitions into individual files for each term. This is useful for better organization and maintainability of terminology in Spec-Up-T projects.

## Usage

### As part of migration process
The splitter runs automatically as the final step of the complete migration:
```bash
npx spec-up-migrate complete
```

### As a standalone command
```bash
# Split glossary in current directory
npx spec-up-migrate split

# Split glossary in specific directory
npx spec-up-migrate split /path/to/project

# Dry run to see what would be done
npx spec-up-migrate split --dry-run

# Verbose output
npx spec-up-migrate split --verbose

# Combine options
npx spec-up-migrate split --dry-run --verbose
```

### Using npm scripts
After integrating into your project:
```bash
npm run split
```

## Prerequisites

1. **specs.json file**: Must exist in the project root with proper configuration
2. **Glossary file**: The file specified in `markdown_paths[0]` must exist
3. **Clean output directory**: The terms-definitions directory should not contain existing .md files

## Configuration

The splitter reads configuration from `specs.json`:

```json
{
  "specs": [{
    "spec_directory": "./spec",
    "markdown_paths": ["terms-and-definitions-intro.md"],
    "spec_terms_directory": "terms-definitions"
  }]
}
```

- `spec_directory`: Directory containing specification files
- `markdown_paths[0]`: Path to the glossary file to split
- `spec_terms_directory`: Output directory for individual term files

## Input Format

The glossary file should contain terms defined with the `[[def: ]]` syntax:

```markdown
# Terms and Definitions

Introduction text here.

[[def: Access Control]]
A security mechanism that determines who can access what resources.

[[def: Authentication]]
The process of verifying the identity of a user or system.

[[def: Authorization, authZ]]
The process of determining what actions a user is allowed to perform.
```

## Output

The splitter creates:

1. **Individual term files**: One `.md` file per term in the `terms-definitions` directory
   - File names are generated from term names (lowercase, with spaces and special characters replaced)
   - Each file contains the full definition including the `[[def: ]]` marker

2. **Intro file**: `glossary-intro-created-by-split-tool.md` containing the introduction text

3. **Backup**: `specs.unsplit.json` backup of the original specs.json file

### Example output files:
- `access-control.md`
- `authentication.md` 
- `authorization.md`

### File naming rules:
- Convert to lowercase
- Replace spaces with hyphens
- Replace forward slashes with hyphens
- Remove commas
- Use only the first part before comma for aliases

## Safety Features

- **Condition checking**: Verifies all prerequisites before proceeding
- **Backup creation**: Automatically backs up specs.json as specs.unsplit.json
- **Existing file protection**: Won't overwrite existing .md files in output directory
- **Dry run mode**: Preview changes without making modifications
- **Error handling**: Graceful handling of missing files or invalid configurations

## Integration with Migration

When used as part of the complete migration process, the splitter:

1. Runs as the final phase after all other migration steps
2. Is marked as optional - migration won't fail if splitting fails
3. Provides summary information in the migration report
4. Uses the same dry-run setting as the overall migration

## Common Issues

### "specs.json not found"
- Ensure you're running the command from the project root
- Verify the specs.json file exists and is readable

### "File not found: [path]"
- Check that the glossary file specified in specs.json exists
- Verify the file path is correct relative to spec_directory

### "There are .md files in the directory"
- Clear the terms-definitions directory of existing .md files
- Or move existing files to a different location before splitting

### "Failed to read splitter configuration"
- Verify specs.json is valid JSON
- Ensure the specs array is not empty
- Check that required fields (spec_directory, markdown_paths) are present

## Advanced Usage

### Custom Configuration
You can modify the splitter behavior by editing the configuration in `lib/splitter.js`:

```javascript
const SPLITTER_CONFIG = {
  definitionStringHead: '[[def:' // Change the definition marker
};
```

### Programmatic Usage
```javascript
const { split } = require('spec-up-migrate/lib/splitter');

const result = await split({
  directory: '/path/to/project',
  dryRun: false,
  verbose: true
});
```

## Testing

Run the splitter tests:
```bash
npm test -- --grep "Splitter"
```

Or run the manual test:
```bash
node test/splitter.test.js
```
