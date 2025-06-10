# Contributing to Spec-Up Migration Tool

Thank you for your interest in contributing to the Spec-Up Migration Tool! This guide will help you get started.

## 🚀 Quick Start

1. **Fork and Clone**
   ```bash
   git clone https://github.com/WebOfTrust/spec-up-migrate.git
   cd spec-up-migrate
   npm install
   ```

2. **Run Tests**
   ```bash
   npm test
   npm run test:coverage
   ```

3. **Test CLI Functionality**
   ```bash
   npm run validate ./test-temp
   node bin/cli.js detect ./test-temp --verbose
   ```

## 🧪 Development Workflow

### Testing Your Changes

Always test your changes thoroughly:

```bash
# Run unit tests
npm test

# Test CLI commands
node bin/cli.js detect ./test-temp
node bin/cli.js migrate ./test-temp --dry-run
npm run validate ./test-temp

# Test configuration fetching
node -e "const { fetchScriptsConfig } = require('./lib/updater.js'); fetchScriptsConfig().then(console.log)"
```

### Code Style

- Use clear, descriptive variable names
- Add JSDoc comments for functions
- Follow existing code patterns
- Include error handling with fallbacks

### Adding New Features

1. **Update Configuration Sources**: If Spec-Up-T changes its boilerplate structure, update the repository references in `REPO_CONFIG`

2. **Add Tests**: Create tests in `test/` directory for new functionality

3. **Update Documentation**: Update README.md, MIGRATION-GUIDE.md, and CHANGELOG.md

4. **Test Remote Fetching**: Ensure new features work with live repository data

## 🔧 Key Components

### Core Libraries (`lib/`)

- **updater.js**: Main configuration migration logic
- **detector.js**: Project detection and analysis
- **migrator.js**: File migration and transformation
- **installer.js**: Spec-Up-T installation
- **backup.js**: Backup creation and management

### Configuration Sources

The tool fetches live configuration from:
- `blockchainbird/spec-up-t` - Main boilerplate repository
- `trustoverip/spec-up-t` - Assets and logos

### Testing Strategy

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test CLI commands and workflows
- **Remote Tests**: Verify configuration fetching works
- **Validation Tests**: Ensure migrated projects are valid

## 📝 Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code with tests
   - Update documentation
   - Test thoroughly

3. **Submit PR**
   - Clear description of changes
   - Reference any related issues
   - Include test results

## 🐛 Bug Reports

When reporting bugs, include:

- Operating system and Node.js version
- Full command that failed
- Complete error output
- Sample project structure (if relevant)

## 💡 Feature Requests

For new features:

- Describe the use case
- Explain the expected behavior
- Consider backward compatibility
- Suggest implementation approach

## 🔄 Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Create release PR
5. Tag release after merge

## 📚 Resources

- [Spec-Up-T Documentation](https://blockchainbird.github.io/spec-up-t-website/)
- [Spec-Up-T Repository](https://github.com/blockchainbird/spec-up-t)
- [Original Spec-Up](https://github.com/decentralized-identity/spec-up)

## ❓ Questions?

- Open an issue for questions about the codebase
- Check existing issues for similar questions
- Review the migration guide and README

Thank you for contributing! 🙏
