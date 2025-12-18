/**
 * Restore Manager - Session-based restore map storage
 * Manages the mapping between masked values and original secrets
 */

import type { RestoreMapEntry } from '@/core/detector';

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

  try {
    // Store in session storage (not synced, cleared on session end)
    await chrome.storage.session.set({
      [key]: restoreMap,
    });
  } catch (error) {
    console.error('[Secure Paste] Failed to save restore map:', error);
  }
}

/**
 * Get restore map from session storage
 */
export async function getRestoreMap(): Promise<RestoreMapEntry[]> {
  const key = getStorageKey();

  try {
    const result = await chrome.storage.session.get(key);
    return result[key] || [];
  } catch (error) {
    console.error('[Secure Paste] Failed to get restore map:', error);
    return [];
  }
}

/**
 * Clear restore map for current site
 * Note: This function is not called on beforeunload to avoid "Access to storage is not allowed" errors
 * Session storage is automatically cleared when tab/session closes
 */
export async function clearRestoreMap(): Promise<void> {
  const key = getStorageKey();

  try {
    // Check if chrome.storage.session is available
    if (!chrome?.storage?.session) {
      console.warn('[Secure Paste] chrome.storage.session not available, skipping clear');
      return;
    }

    await chrome.storage.session.remove(key);
  } catch (error) {
    console.error('[Secure Paste] Failed to clear restore map:', error);
  }
}

/**
 * Check if restoration is enabled in settings
 */
export async function isRestorationEnabled(): Promise<boolean> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SETTINGS',
    });

    if (response.success && response.data) {
      return response.data.enableRestoration === true;
    }
  } catch (error) {
    console.error('[Secure Paste] Failed to check restoration setting:', error);
  }

  // Default: disabled for security
  return false;
}
