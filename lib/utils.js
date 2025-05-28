const fs = require('fs').promises;
const path = require('path');

/**
 * Check if a file is a Spec-Up file
 * @param {string} filename - The filename to check
 * @returns {boolean} - True if it's a Spec-Up file
 */
function isSpecUpFile(filename) {
  const specUpExtensions = ['.md', '.markdown'];
  const ext = path.extname(filename).toLowerCase();
  return specUpExtensions.includes(ext);
}

/**
 * Process content for migration
 * @param {string} content - Original content
 * @param {string} format - Target format
 * @returns {string} - Migrated content
 */
async function processContent(content, format) {
  // For now, just return the content as-is
  // This could be extended with actual transformation logic
  return content;
}

/**
 * Get the total size of a directory recursively
 * @param {string} dirPath - Directory path
 * @returns {number} - Total size in bytes
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
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to check
 * @returns {boolean} - True if file exists
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
 * Safe JSON parse with fallback
 * @param {string} content - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} - Parsed object or fallback
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
