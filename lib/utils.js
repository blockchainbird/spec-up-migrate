/**
 * @fileoverview Utility functions for file operations, validation, and formatting
 * @module lib/utils
 * @author Kor Dwarshuis
 * @version 1.2.0
 * @since 2024-06-10
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Check if a file is a Spec-Up file based on its extension
 * @param {string} filename - The filename to check
 * @returns {boolean} True if it's a Spec-Up file (markdown extension)
 * @example
 * isSpecUpFile('spec.md'); // returns true
 * isSpecUpFile('config.json'); // returns false
 */
function isSpecUpFile(filename) {
  const specUpExtensions = ['.md', '.markdown'];
  const ext = path.extname(filename).toLowerCase();
  return specUpExtensions.includes(ext);
}

/**
 * Process content for migration from Spec-Up to Spec-Up-T format
 * @param {string} content - Original content to process
 * @param {string} format - Target format for migration
 * @returns {Promise<string>} Migrated content
 * @example
 * const migrated = await processContent(originalContent, 'latest');
 */
async function processContent(content, format) {
  // Basic migration transformations for Spec-Up-T compatibility
  let processedContent = content;
  
  // Remove any BOM (Byte Order Mark) that might cause issues
  if (processedContent.charCodeAt(0) === 0xFEFF) {
    processedContent = processedContent.slice(1);
  }
  
  // Normalize line endings to LF
  processedContent = processedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Ensure proper spacing around definition blocks
  processedContent = processedContent.replace(/(\[\[def:[^\]]+\]\])/g, '\n$1\n');
  
  // Remove multiple consecutive blank lines (more than 2)
  processedContent = processedContent.replace(/\n{3,}/g, '\n\n');
  
  // Trim trailing whitespace from lines
  processedContent = processedContent.split('\n').map(line => line.trimEnd()).join('\n');
  
  return processedContent;
}

/**
 * Get the total size of a directory recursively in bytes
 * @param {string} dirPath - Directory path to analyze
 * @returns {Promise<number>} Total size in bytes, 0 if error or not accessible
 * @example
 * const size = await getDirectorySize('./my-project');
 * console.log(`Project size: ${formatFileSize(size)}`);
 */
async function getDirectorySize(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    
    if (stats.isFile()) {
      return stats.size;
    }
    
    if (stats.isDirectory()) {
      const files = await fs.readdir(dirPath);
      let totalSize = 0;
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        totalSize += await getDirectorySize(filePath);
      }
      
      return totalSize;
    }
    
    return 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Format file size in human readable format using binary units
 * @param {number} bytes - Size in bytes to format
 * @returns {string} Formatted size string (e.g., "1.23 KB", "456.78 MB")
 * @example
 * formatFileSize(1024); // returns "1 KB"
 * formatFileSize(1536); // returns "1.5 KB"
 * formatFileSize(0); // returns "0 B"
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if a file exists asynchronously
 * @param {string} filePath - Path to check for existence
 * @returns {Promise<boolean>} True if file exists and is accessible, false otherwise
 * @example
 * if (await fileExists('./package.json')) {
 *   console.log('Package.json exists');
 * }
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe JSON parse with fallback value for error handling
 * @param {string} content - JSON string to parse
 * @param {*} [fallback={}] - Fallback value returned if parsing fails
 * @returns {*} Parsed object or fallback value
 * @example
 * const config = safeJsonParse(fileContent, { default: 'config' });
 * const data = safeJsonParse('invalid json', []); // returns []
 */
function safeJsonParse(content, fallback = {}) {
  try {
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

module.exports = {
  isSpecUpFile,
  processContent,
  getDirectorySize,
  formatFileSize,
  fileExists,
  safeJsonParse
};
