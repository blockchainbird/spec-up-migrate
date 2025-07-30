/**
 * @fileoverview Backup functionality for critical files before Spec-Up migration
 * @module lib/backup
 * @author Kor Dwarshuis
 * @version 1.2.0
 * @since 2024-06-10
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Create backups of critical files before migration
 * @param {string} [directory='.'] - Directory path containing Spec-Up installation
 * @param {Object} [options={}] - Backup options
 * @param {boolean} [options.list=false] - Whether to only list files without backing up
 * @returns {Promise<Object>} Backup result with file statuses and summary
 * @throws {Error} When backup operations fail
 * @example
 * // Basic backup
 * const result = await backup('./my-project');
 * 
 * // List files that would be backed up
 * const listResult = await backup('./my-project', { list: true });
 */
async function backup(directory = '.', options = {}) {
  const absoluteDir = path.resolve(directory);
  const { list = false } = options;
  
  // Define critical files to backup
  const criticalFiles = [
    {
      source: 'assets',
      backup: 'assets-backup'
    },
    {
      source: 'custom-assets',
      backup: 'custom-assets-backup'
    },
    {
      source: 'multi-file-test',
      backup: 'multi-file-test-backup'
    },
    {
      source: 'single-file-test',
      backup: 'single-file-test-backup'
    },
    {
      source: 'specs.json',
      backup: 'specs-backup.json'
    },
    {
      source: 'package.json', 
      backup: 'package-backup.json'
    },
    {
      source: '.gitignore',
      backup: '.gitignore-backup'
    },
    {
      source: '.github',
      backup: '.github-backup'
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
          // Check if source is a directory or file and backup accordingly
          const stats = await fs.stat(sourcePath);
          
          if (stats.isDirectory()) {
            // For directories, use recursive copy
            await fs.cp(sourcePath, backupPath, { recursive: true });
          } else {
            // For files, use copyFile
            await fs.copyFile(sourcePath, backupPath);
          }
          
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
