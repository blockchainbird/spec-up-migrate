const { 
  extractDefinitionBlock,
  parseTermName
} = require('../lib/splitter');

/**
 * NOTE: This test file needs to be updated to test the new processDefinitions workflow.
 * The old split functionality has been removed and replaced with:
 * - extractAllDefinitions() - Extract [[def:]] from all markdown files
 * - convertDefinitionsToIrefs() - Convert [[def:]] to [[iref:]]
 * - processDefinitions() - Combined workflow (extract + convert)
 * 
 * TODO: Write new comprehensive tests for the refactored functionality
 */

describe('Definition Processing - Basic Utilities', () => {
  test('parseTermName should sanitize term names correctly', () => {
    expect(parseTermName('[[def: Test Term]]')).toBe('test-term');
    expect(parseTermName('[[def: Access Control]]')).toBe('access-control');
    expect(parseTermName('[[def: OAuth 2.0]]')).toBe('oauth-20');
    expect(parseTermName('[[def: Test/Term]]')).toBe('test-term');
  });

  test('extractDefinitionBlock should extract definition blocks', () => {
    const content = `Some text before

[[def: test term]]
~ This is the definition
~ Second line of definition

More content after`;

    const result = extractDefinitionBlock(content, content.indexOf('[[def:'));
    expect(result.definitionText).toContain('[[def: test term]]');
    expect(result.definitionText).toContain('~ This is the definition');
    expect(result.endIndex).toBeGreaterThan(0);
  });
});

// Placeholder for future comprehensive tests
describe('Process Definitions Integration Tests', () => {
  test.todo('should extract definitions from all markdown files');
  test.todo('should convert definitions to irefs');
  test.todo('should handle the complete process workflow');
  test.todo('should work in dry-run mode');
  test.todo('should detect and report duplicates');
});
