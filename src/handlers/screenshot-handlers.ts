import { latestScreenshotSchema, findLatestScreenshot } from "../tools/screenshot.js";
import { readFileSync } from 'fs';

/**
 * Handle the latest_screenshot tool request
 */
export async function handleLatestScreenshot(args: any) {
  try {
    // Validate the request arguments (should be empty)
    const validatedArgs = latestScreenshotSchema.parse(args || {});

    // Find the latest screenshot
    const result = await findLatestScreenshot();

    if (!result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${result.error}`
          }
        ]
      };
    }

    if (!result.filePath || !result.filename) {
      return {
        content: [
          {
            type: "text", 
            text: "Error: No screenshot file path found"
          }
        ]
      };
    }

    try {
      // Read the image file and return it as base64
      const imageData = readFileSync(result.filePath);
      const base64Data = imageData.toString('base64');
      
      // Determine MIME type based on file extension
      const ext = result.filename.toLowerCase().substring(result.filename.lastIndexOf('.'));
      let mimeType = 'image/png'; // default
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        case '.gif':
          mimeType = 'image/gif';
          break;
        case '.bmp':
          mimeType = 'image/bmp';
          break;
        case '.webp':
          mimeType = 'image/webp';
          break;
        case '.tiff':
        case '.tif':
          mimeType = 'image/tiff';
          break;
        default:
          mimeType = 'image/png';
      }

      return {
        content: [
          {
            type: "text",
            text: `Latest screenshot: ${result.filename}\nLast modified: ${result.lastModified?.toLocaleString()}\nPath: ${result.filePath}`
          },
          {
            type: "image",
            data: base64Data,
            mimeType: mimeType
          }
        ]
      };

    } catch (readError) {
      return {
        content: [
          {
            type: "text",
            text: `Error reading screenshot file: ${readError instanceof Error ? readError.message : String(readError)}`
          }
        ]
      };
    }

  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error in latest_screenshot tool: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
}