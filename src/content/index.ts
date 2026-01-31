/**
 * Secure Paste - Content Script
 * Intercepts paste events and masks secrets on registered sites
 */

import { initClipboardInterceptor, isExtensionEnabled, cleanupClipboardInterceptor } from './clipboardInterceptor';
import { cleanupToasts } from './toast';
import { initCopyHandler } from './copyHandler';
import { safeSendMessage } from './extensionContext';
import { initInlineUI, cleanupInlineUI } from './inline-ui';

let isInitialized = false;

// Initialize content script
async function init() {
  try {
    console.log('[Secure Paste] Content script loaded on:', window.location.hostname);

    // Check if extension is enabled
    const enabled = await isExtensionEnabled();

    if (!enabled) {
      console.log('[Secure Paste] Extension is disabled');
      if (isInitialized) {
        cleanupClipboardInterceptor();
        cleanupToasts();
        cleanupInlineUI();
        isInitialized = false;
      }
      return;
    }

    // Check if site is enabled
    const hostname = window.location.hostname;
    const response = await safeSendMessage({
      type: 'IS_SITE_ENABLED',
      data: { hostname },
    });

    if (!response || !response.success || !response.data.enabled) {
      console.log('[Secure Paste] Site is disabled or extension context invalid');
      if (isInitialized) {
        cleanupClipboardInterceptor();
        cleanupToasts();
        cleanupInlineUI();
        isInitialized = false;
      }
      return;
    }

    // Initialize clipboard interceptor if not already initialized
    if (!isInitialized) {
      initClipboardInterceptor();
      initCopyHandler();
      initInlineUI(); // Initialize inline UI feature
      isInitialized = true;
      console.log('[Secure Paste] Ready to protect secrets!');
    }
  } catch (error) {
    // Check if extension context was invalidated
    if (error instanceof Error && error.message.includes('Extension context invalidated')) {
      console.warn('[Secure Paste] Extension context invalidated. Page refresh required.');
      // Silently fail - user will be notified on next paste attempt
      return;
    }

    // Re-throw other errors
    throw error;
  }
}

// Note: Session storage is automatically cleared when tab/session closes
// No need to manually clear on beforeunload (causes "Access to storage is not allowed" error)

// Listen for settings changes
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SETTINGS_CHANGED') {
    // Reinitialize if:
    // 1. Global enabled/disabled (message.data.global)
    // 2. Site-specific enabled/disabled (message.data.hostname)
    // Category changes don't need reinitialization since handlePaste
    // fetches fresh settings on every paste
    if (message.data && (message.data.global || message.data.hostname)) {
      console.log('[Secure Paste] Global or site settings changed, reloading...');
      init().catch((error) => {
        console.error('[Secure Paste] Reinitialization failed:', error);
      });
    } else if (message.data && message.data.category) {
      // Category changed - no action needed
      // handlePaste will get fresh settings on next paste
      console.log('[Secure Paste] Category settings changed, ready for next paste');
    }
  }
});

// Run initialization
init().catch((error) => {
  console.error('[Secure Paste] Initialization failed:', error);
});
