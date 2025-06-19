import { z } from 'zod';
import { join } from 'path';
import { homedir } from 'os';
import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';

export const latestScreenshotSchema = z.object({
  // No parameters needed - always searches the default Screenshots folder
});

/**
 * Common image file extensions to search for
 */
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.tiff', '.tif'];

/**
 * Check if a file is an image based on its extension
 */
function isImageFile(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Find the latest screenshot in the user's Screenshots folder
 */
export async function findLatestScreenshot(): Promise<{
  success: boolean;
  filePath?: string;
  filename?: string;
  lastModified?: Date;
  error?: string;
}> {
  try {
    const screenshotsPath = join(homedir(), 'Pictures', 'Screenshots');
    
    // Check if Screenshots directory exists
    if (!existsSync(screenshotsPath)) {
      return {
        success: false,
        error: `Screenshots directory does not exist: ${screenshotsPath}`
      };
    }

    // Read all files in the directory
    const files = await readdir(screenshotsPath);
    
    if (files.length === 0) {
      return {
        success: false,
        error: 'No files found in Screenshots directory'
      };
    }

    // Filter for image files and get their stats
    const imageFiles: Array<{
      name: string;
      path: string;
      mtime: Date;
    }> = [];

    for (const file of files) {
      if (isImageFile(file)) {
        const filePath = join(screenshotsPath, file);
        try {
          const stats = await stat(filePath);
          if (stats.isFile()) {
            imageFiles.push({
              name: file,
              path: filePath,
              mtime: stats.mtime
            });
          }
        } catch (statError) {
          // Skip files we can't stat
          continue;
        }
      }
    }

    if (imageFiles.length === 0) {
      return {
        success: false,
        error: 'No image files found in Screenshots directory'
      };
    }

    // Sort by modification time (newest first) and get the latest
    imageFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    const latestImage = imageFiles[0];

    return {
      success: true,
      filePath: latestImage.path,
      filename: latestImage.name,
      lastModified: latestImage.mtime
    };

  } catch (error) {
    return {
      success: false,
      error: `Error searching for screenshots: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}