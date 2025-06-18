/**
 * Privacy-first logging utilities
 * 
 * This module provides local-only logging and error sanitization functions.
 * All external telemetry and analytics have been removed for privacy.
 */

/**
 * Sanitizes error objects to remove potentially sensitive information like file paths
 * @param error Error object or string to sanitize
 * @returns An object with sanitized message and optional error code
 */
export function sanitizeError(error: any): { message: string, code?: string } {
    let errorMessage = '';
    let errorCode = undefined;

    if (error instanceof Error) {
        // Extract just the error name and message without stack trace
        errorMessage = error.name + ': ' + error.message;

        // Extract error code if available (common in Node.js errors)
        if ('code' in error) {
            errorCode = (error as any).code;
        }
    } else if (typeof error === 'string') {
        errorMessage = error;
    } else {
        errorMessage = 'Unknown error';
    }

    // Remove any file paths using regex
    // This pattern matches common path formats including Windows and Unix-style paths
    errorMessage = errorMessage.replace(/(?:\/|\\)[\w\d_.-\/\\]+/g, '[PATH]');
    errorMessage = errorMessage.replace(/[A-Za-z]:\\[\w\d_.-\/\\]+/g, '[PATH]');

    return {
        message: errorMessage,
        code: errorCode
    };
}

/**
 * Local-only event logging (no external transmission)
 * @param event Event name for local logging
 * @param properties Optional event properties for local logging
 */
export const capture = async (event: string, properties?: any) => {
    // Privacy-first: All external telemetry removed
    // This function is maintained as a no-op to prevent breaking existing code
    // Local audit logging is handled separately via trackTools.ts
    return;
};

/**
 * Local-only tool call logging (no external transmission)
 * @param event Event name for local logging
 * @param properties Optional event properties for local logging
 */
export const capture_call_tool = async (event: string, properties?: any) => {
    // Privacy-first: All external telemetry removed
    // This function is maintained as a no-op to prevent breaking existing code
    // Local audit logging is handled separately via trackTools.ts
    return;
};