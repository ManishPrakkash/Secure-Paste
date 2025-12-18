/**
 * Background service worker
 * Manages extension state, storage, and message passing
 */

import {
  getSettings,
  saveSettings,
  initializeSettings,
  toggleEnabled,
  incrementProtectedCount,
  getProtectedCount,
  resetProtectedCount,
  isSiteEnabled,
  incrementCategoryCounts,
  incrementSiteProtectedCount,
  getCustomPatterns,
  addCustomPattern,
  updateCustomPattern,
  deleteCustomPattern,
  toggleCustomPattern,
  incrementCustomPatternCount,
} from './storage';
import {
  getRegisteredSites,
  addSite,
  removeSite,
  isSiteRegistered,
} from './siteManager';
import { onMessage, type Message, type MessageResponse } from '../utils/messaging';

console.log('[Secure Paste] Background worker initialized');

// Initialize settings on installation
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Secure Paste] Extension installed');
  await initializeSettings();
});

// Handle messages from popup, content scripts, and settings page
onMessage((message: Message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((response) => sendResponse(response))
    .catch((error) => {
      sendResponse({
        success: false,
        error: error.message,
      });
    });

  // Return true to indicate async response
  return true;
});

/**
 * Handle incoming messages
 */
async function handleMessage(
  message: Message,
  _sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  const { type, data } = message;

  try {
    switch (type) {
      case 'GET_SETTINGS': {
        const settings = await getSettings();
        return { success: true, data: settings };
      }

      case 'UPDATE_SETTINGS': {
        await saveSettings(data);
        return { success: true };
      }

      case 'TOGGLE_ENABLED': {
        const enabled = await toggleEnabled();
        return { success: true, data: enabled };
      }

      case 'GET_REGISTERED_SITES': {
        const sites = await getRegisteredSites();
        return { success: true, data: sites };
      }

      case 'ADD_SITE': {
        const added = await addSite(data.hostname);
        return { success: true, data: added };
      }

      case 'REMOVE_SITE': {
        const removed = await removeSite(data.hostname);
        return { success: true, data: removed };
      }

      case 'IS_SITE_REGISTERED': {
        const registered = await isSiteRegistered(data.hostname);
        return { success: true, data: registered };
      }

      case 'INCREMENT_PROTECTED_COUNT': {
        const count = await incrementProtectedCount(data.count || 1);
        return { success: true, data: count };
      }

      case 'GET_PROTECTED_COUNT': {
        const count = await getProtectedCount();
        return { success: true, data: count };
      }

      case 'RESET_PROTECTED_COUNT': {
        await resetProtectedCount();
        return { success: true };
      }

      case 'IS_SITE_ENABLED': {
        const enabled = await isSiteEnabled(data.hostname);
        return { success: true, data: { enabled } };
      }

      case 'INCREMENT_CATEGORY_COUNTS': {
        await incrementCategoryCounts(data.categoryCounts);
        return { success: true };
      }

      case 'INCREMENT_SITE_COUNT': {
        await incrementSiteProtectedCount(data.hostname, data.count || 1);
        return { success: true };
      }

      case 'SETTINGS_CHANGED': {
        // Broadcast to all tabs
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (tab.id && tab.url) {
            try {
              const url = new URL(tab.url);
              // Only notify tabs that match the changed hostname or broadcast to all
              if (!data.hostname || url.hostname === data.hostname) {
                chrome.tabs.sendMessage(tab.id, {
                  type: 'SETTINGS_CHANGED',
                  data: data,
                }).catch(() => {
                  // Ignore errors for tabs without content script
                });
              }
            } catch {
              // Ignore invalid URLs
            }
          }
        }
        return { success: true };
      }

      case 'GET_CUSTOM_PATTERNS': {
        const patterns = await getCustomPatterns();
        return { success: true, data: patterns };
      }

      case 'ADD_CUSTOM_PATTERN': {
        try {
          const newPattern = await addCustomPattern(data.pattern);
          // Broadcast settings change to all tabs
          await handleMessage({ type: 'SETTINGS_CHANGED', data: {} }, _sender);
          return { success: true, data: newPattern };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add pattern',
          };
        }
      }

      case 'UPDATE_CUSTOM_PATTERN': {
        try {
          const updatedPattern = await updateCustomPattern(data.id, data.updates);
          // Broadcast settings change to all tabs
          await handleMessage({ type: 'SETTINGS_CHANGED', data: {} }, _sender);
          return { success: true, data: updatedPattern };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update pattern',
          };
        }
      }

      case 'DELETE_CUSTOM_PATTERN': {
        try {
          await deleteCustomPattern(data.id);
          // Broadcast settings change to all tabs
          await handleMessage({ type: 'SETTINGS_CHANGED', data: {} }, _sender);
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete pattern',
          };
        }
      }

      case 'TOGGLE_CUSTOM_PATTERN': {
        try {
          const enabled = await toggleCustomPattern(data.id);
          // Broadcast settings change to all tabs
          await handleMessage({ type: 'SETTINGS_CHANGED', data: {} }, _sender);
          return { success: true, data: { enabled } };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to toggle pattern',
          };
        }
      }

      case 'INCREMENT_CUSTOM_PATTERN_COUNT': {
        await incrementCustomPatternCount(data.patternId, data.count || 1);
        return { success: true };
      }

      default:
        return {
          success: false,
          error: `Unknown message type: ${type}`,
        };
    }
  } catch (error) {
    console.error('[Secure Paste] Error handling message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Listen for tab updates to check if site is registered
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const url = new URL(tab.url);
      const hostname = url.hostname;
      const registered = await isSiteRegistered(hostname);

      // Send message to content script if site is registered
      if (registered) {
        chrome.tabs.sendMessage(tabId, {
          type: 'SITE_REGISTERED',
          data: { hostname },
        }).catch(() => {
          // Ignore errors if content script is not loaded yet
        });
      }
    } catch (error) {
      // Ignore invalid URLs (e.g., chrome://, about:)
    }
  }
});

// Listen for extension icon click
chrome.action.onClicked.addListener(async (_tab) => {
  // Open popup (default behavior, but we can customize here if needed)
  console.log('[Secure Paste] Extension icon clicked');
});
