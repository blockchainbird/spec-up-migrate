/**
 * @fileoverview Cleanup functionality for removing obsolete Spec-Up files and directories
 * @module lib/cleanup
 * @author Kor Dwarshuis
 * @version 1.2.0
 * @since 2024-06-10
 */

const fs = require('fs').promises;
const path = require('path');
const { getDirectorySize, formatFileSize, fileExists } = require('./utils');

/**
 * Clean up obsolete files and directories from Spec-Up installation
 * @param {string} [directory='.'] - Directory path containing Spec-Up installation
 * @param {Object} [options={}] - Cleanup options
 * @param {boolean} [options.dryRun=false] - Whether to perform a dry run without actual removal
 * @param {boolean} [options.list=false] - Whether to only list items without removing
 * @returns {Promise<Object>} Cleanup result with removed items and summary statistics
 * @throws {Error} When cleanup operations fail
 * @example
 * // Dry run to see what would be removed
 * const dryResult = await cleanup('./project', { dryRun: true });
 * 
 * // Actual cleanup
 * const result = await cleanup('./project');
 */
async function cleanup(directory = '.', options = {}) {
    const absoluteDir = path.resolve(directory);
    const { dryRun = false, list = false } = options;

    // Define obsolete files and directories to remove during migration
    const obsoleteItems = [
        {
            path: 'assets',
            type: 'directory',
            reason: 'Replaced by Spec-Up-T asset management'
        },
        {
            path: 'custom-assets',
            type: 'directory',
            reason: 'Replaced by Spec-Up-T asset management'
        },
        {
            path: 'src',
            type: 'directory',
            reason: 'Replaced by Spec-Up-T'
        },
        {
            path: 'fonts',
            type: 'directory',
            reason: 'Font handling moved to Spec-Up-T'
        },
        {
            path: 'docs/fonts',
            type: 'directory',
            reason: 'Font handling moved to Spec-Up-T'
        },
        {
            path: 'gulpfile.js',
            type: 'file',
            reason: 'Gulp build system replaced by Spec-Up-T'
        },
        {
            path: 'index.js',
            type: 'file',
            reason: 'Entry point replaced by Spec-Up-T CLI'
        },
        {
            path: 'references.js',
            type: 'file',
            reason: 'Replaced by Spec-Up-T'
        },
        {
            path: 'node_modules',
            type: 'directory',
            reason: 'Dependencies will be reinstalled for Spec-Up-T'
        },
        {
            path: 'package-lock.json',
            type: 'file',
            reason: 'Lock file will be regenerated'
        },
        {
            path: 'specup_logo.png',
            type: 'file',
            reason: 'Replaced by Spec-Up-T'
        }
    ];

    const results = [];

    for (const item of obsoleteItems) {
        const itemPath = path.join(absoluteDir, item.path);

        try {
            const stats = await fs.stat(itemPath);
            let size = 0;

            if (item.type === 'directory' && stats.isDirectory()) {
                size = await getDirectorySize(itemPath);
            } else if (item.type === 'file' && stats.isFile()) {
                size = stats.size;
            }

            const itemResult = {
                path: item.path,
                type: item.type,
                reason: item.reason,
                exists: true,
                size,
                sizeFormatted: formatFileSize(size),
                removed: false
            };

            if (!list && !dryRun) {
                try {
                    if (item.type === 'directory') {
                        await fs.rm(itemPath, { recursive: true });
                    } else {
                        await fs.unlink(itemPath);
                    }
                    itemResult.removed = true;
                } catch (removeError) {
                    itemResult.removed = false;
                    itemResult.error = removeError.message;
                }
            } else if (dryRun) {
                itemResult.removed = false;
                itemResult.dryRun = true;
            }

            results.push(itemResult);

        } catch (error) {
            // Item doesn't exist
            results.push({
                path: item.path,
                type: item.type,
                reason: item.reason,
                exists: false,
                size: 0,
                sizeFormatted: '0 B',
                removed: false
            });
        }
    }

    return {
        directory: absoluteDir,
        items: results,
        summary: {
            total: results.length,
            existing: results.filter(i => i.exists).length,
            removed: results.filter(i => i.removed).length,
            totalSizeFreed: results.filter(i => i.removed).reduce((sum, i) => sum + i.size, 0)
        }
    };
}

module.exports = {
    cleanup
};
