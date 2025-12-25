/**
 * Restore Manager - Session-based restore map storage
 * Manages the mapping between masked values and original secrets
 */

import type { RestoreMapEntry } from '@/core/detector';
import { safeSessionStorageSet, safeSessionStorageGet, safeSendMessage } from './extensionContext';

/**
 * Storage key format: restore_map_{hostname}
 */
function getStorageKey(): string {
  const hostname = window.location.hostname;
  return `restore_map_${hostname}`;
}

/**
 * Save restore map to session storage
 * Maps are isolated per hostname and cleared on tab/session close
 */
export async function saveRestoreMap(restoreMap: RestoreMapEntry[]): Promise<void> {
  const key = getStorageKey();

  const success = await safeSessionStorageSet(key, restoreMap);

  if (!success) {
    // Extension context invalidated - silently skip
    // User will be notified on next paste attempt
    return;
  }
}

/**
 * Get restore map from session storage
 */
export async function getRestoreMap(): Promise<RestoreMapEntry[]> {
  const key = getStorageKey();

  const result = await safeSessionStorageGet(key);
  return result || [];
}

/**
 * Clear restore map for current site
 * Note: This function is not called on beforeunload to avoid "Access to storage is not allowed" errors
 * Session storage is automatically cleared when tab/session closes
 */
export async function clearRestoreMap(): Promise<void> {
  const key = getStorageKey();

  try {
    // Use safe wrapper that checks context validity
    const result = await safeSessionStorageGet(key);

    if (result !== null) {
      // Context is valid, safe to remove
      await chrome.storage.session.remove(key);
    }
  } catch (error) {
    // Silently fail - session storage will be cleared on tab close anyway
  }
}

/**
 * Check if restoration is enabled in settings
 */
export async function isRestorationEnabled(): Promise<boolean> {
  const response = await safeSendMessage({
    type: 'GET_SETTINGS',
  });

  if (!response) {
    // Extension context invalidated
    return false;
  }

  if (response.success && response.data) {
    return response.data.enableRestoration === true;
  }

  // Default: disabled for security
  return false;
}
