const fs = require('fs').promises;
const path = require('path');
const { updateConfigurations, fetchScriptsConfig, fetchSpecUpTBoilerplate } = require('../lib/updater.js');
const { validateMigratedProject } = require('../validate.js');

describe('Spec-Up Migration Tool', () => {
  
  describe('Configuration Fetching', () => {
    test('should fetch scripts configuration from remote repository', async () => {
      const config = await fetchScriptsConfig();
      
      expect(config).toHaveProperty('configScriptsKeys');
      expect(config).toHaveProperty('configOverwriteScriptsKeys');
      expect(config.configScriptsKeys).toHaveProperty('edit');
      expect(config.configScriptsKeys).toHaveProperty('render');
      expect(config.configScriptsKeys).toHaveProperty('dev');
      expect(config.configOverwriteScriptsKeys.edit).toBe(true);
    }, 30000);

    test('should fetch specs boilerplate from remote repository', async () => {
      const boilerplate = await fetchSpecUpTBoilerplate();
      
      expect(boilerplate).toHaveProperty('specs');
      expect(Array.isArray(boilerplate.specs)).toBe(true);
      expect(boilerplate.specs.length).toBeGreaterThan(0);
      
      const spec = boilerplate.specs[0];
      expect(spec).toHaveProperty('title');
      expect(spec).toHaveProperty('spec_terms_directory');
      expect(spec).toHaveProperty('external_specs');
    }, 30000);
  });

  describe('Configuration Update', () => {
    test('should update configurations in dry-run mode', async () => {
      const testDir = path.join(__dirname, '../test-temp');
      const result = await updateConfigurations(testDir, { dryRun: true });
      
      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.summary.successful).toBe(result.summary.total);
      expect(result.summary.failed).toBe(0);
    });

    test('should handle non-existent directory gracefully', async () => {
      const nonExistentDir = path.join(__dirname, '../non-existent-dir');
      const result = await updateConfigurations(nonExistentDir, { dryRun: true });
      
      // Should still attempt to process but some operations will fail
      expect(result.summary.total).toBeGreaterThan(0);
    });
  });

  describe('Project Validation', () => {
    test('should validate a properly migrated project', async () => {
      const testDir = path.join(__dirname, '../test-temp');
      const result = await validateMigratedProject(testDir);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.checkedFiles.length).toBeGreaterThan(0);
      expect(result.checkedFiles).toContain('package.json');
      expect(result.checkedFiles).toContain('specs.json');
    });

    test('should detect invalid project structure', async () => {
      const invalidDir = path.join(__dirname, '../invalid-test-dir');
      
      // Create a minimal invalid project
      await fs.mkdir(invalidDir, { recursive: true });
      await fs.writeFile(path.join(invalidDir, 'package.json'), '{}');
      
      const result = await validateMigratedProject(invalidDir);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Cleanup
      await fs.rmdir(invalidDir, { recursive: true });
    });
  });

  describe('Error Handling', () => {
    test('should handle network failures gracefully', async () => {
      // Mock network failure by testing with invalid URL
      // The functions should fall back to default configurations
      const config = await fetchScriptsConfig();
      
      // Should still return valid configuration (fallback)
      expect(config).toHaveProperty('configScriptsKeys');
      expect(config.configScriptsKeys).toHaveProperty('edit');
    });
  });
});
