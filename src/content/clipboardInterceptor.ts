/**
 * Clipboard interceptor for monitoring paste events
 * Handles edge cases and different paste scenarios
 */

import { handlePaste } from './pasteHandler';
import { safeSendMessage } from './extensionContext';

// Track if interceptor is active
let isActive = false;

/**
 * Initialize clipboard interception
 */
export function initClipboardInterceptor(): void {
  // Prevent duplicate initialization
  if (isActive) {
    console.warn('[Secure Paste] Clipboard interceptor already active, skipping initialization');
    return;
  }

  // Listen for paste events on the document
  document.addEventListener('paste', handlePaste, true);
  isActive = true;

  console.log('[Secure Paste] Clipboard interceptor initialized');
}

/**
 * Cleanup clipboard interceptor
 */
export function cleanupClipboardInterceptor(): void {
  if (!isActive) {
    console.warn('[Secure Paste] Clipboard interceptor not active, skipping cleanup');
    return;
  }

  document.removeEventListener('paste', handlePaste, true);
  isActive = false;

  console.log('[Secure Paste] Clipboard interceptor cleaned up');
}

/**
 * Check if extension is enabled for current site
 */
export async function isExtensionEnabled(): Promise<boolean> {
  try {
    const response = await safeSendMessage({
      type: 'GET_SETTINGS',
    });

    if (!response) {
      // Extension context invalidated
      return false;
    }

    if (response.success) {
      return response.data.enabled !== false; // Default to true
    }
    return true;
  } catch (error) {
    console.error('[Secure Paste] Error checking enabled status:', error);
    return true; // Default to enabled on error
  }
}

/**
 * Increment protected secrets counter
 */
export async function incrementProtectedCount(count: number = 1): Promise<void> {
  try {
    const response = await safeSendMessage({
      type: 'INCREMENT_PROTECTED_COUNT',
      data: { count },
    });

    if (!response) {
      // Extension context invalidated - silently skip
      return;
    }
  } catch (error) {
    console.error('[Secure Paste] Error incrementing protected count:', error);
  }
}
