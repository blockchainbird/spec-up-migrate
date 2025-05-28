const fs = require('fs').promises;
const path = require('path');

/**
 * Create backups of critical files before migration
 * @param {string} directory - Directory path containing Spec-Up installation
 * @param {Object} options - Backup options (list: boolean)
 * @returns {Object} - Backup result with file statuses
 */
async function backup(directory = '.', options = {}) {
  const absoluteDir = path.resolve(directory);
  const { list = false } = options;
  
  // Define critical files to backup
  const criticalFiles = [
    {
      source: 'specs.json',
      backup: 'specs-backup.json'
    },
    {
      source: 'package.json', 
      backup: 'package-backup.json'
    },
    {
      source: 'index.js',
      backup: 'index-backup.js'
    },
    {
      source: 'gulpfile.js',
      backup: 'gulpfile-backup.js'
    },
    {
      source: '.gitignore',
      backup: '.gitignore-backup'
    }
  ];

  const results = [];

  for (const file of criticalFiles) {
    const sourcePath = path.join(absoluteDir, file.source);
    const backupPath = path.join(absoluteDir, file.backup);
    
    try {
      // Check if source file exists
      await fs.access(sourcePath);
      
      const fileResult = {
        source: file.source,
        backup: file.backup,
        sourcePath,
        backupPath,
        exists: true,
        backed_up: false
      };

      if (!list) {
        try {
          // Create backup by copying the file
          await fs.copyFile(sourcePath, backupPath);
          fileResult.backed_up = true;
        } catch (backupError) {
          fileResult.backed_up = false;
          fileResult.error = backupError.message;
        }
      }
      
      results.push(fileResult);
      
    } catch (error) {
      // File doesn't exist
      results.push({
        source: file.source,
        backup: file.backup,
        sourcePath,
        backupPath,
        exists: false,
        backed_up: false
      });
    }
  }

  return {
    directory: absoluteDir,
    files: results,
    summary: {
      total: results.length,
      existing: results.filter(f => f.exists).length,
      backed_up: results.filter(f => f.backed_up).length
    }
  };
}

module.exports = {
  backup
};
