/**
 * Paste event handler for content script
 * Intercepts paste events and applies secret masking
 */

import { maskSecretPatterns, maskWithRestore } from '@/core/detector';
import { incrementProtectedCount } from './clipboardInterceptor';
import { showToast } from './toast';
import { saveRestoreMap } from './restoreManager';
import { updateRestorationCache } from './copyHandler';
import { safeSendMessage } from './extensionContext';

/**
 * Handle paste event and mask secrets
 */
export function handlePaste(event: ClipboardEvent): void {
  // Get clipboard data
  const clipboardData = event.clipboardData;
  if (!clipboardData) return;

  // Get text from clipboard
  const originalText = clipboardData.getData('text/plain');
  if (!originalText) return;

  // Prevent default paste behavior immediately (before async operations)
  event.preventDefault();
  event.stopPropagation();

  // Process masking asynchronously
  processPaste(originalText);
}

/**
 * Process paste with async category settings and custom patterns fetch
 */
async function processPaste(originalText: string): Promise<void> {
  // Get category settings and custom patterns from storage
  let enabledCategories: Record<string, boolean> | undefined;
  let customPatterns: any[] | undefined;
  let enableRestoration = false;

  try {
    const response = await safeSendMessage({
      type: 'GET_SETTINGS',
    });

    // Check if response is null (extension context invalidated)
    if (!response) {
      console.warn('[Secure Paste] Extension was reloaded. Please refresh this page to re-enable protection.');

      // Show one-time notification to user
      showContextInvalidatedNotice();

      // Stop processing - extension needs page refresh
      insertMaskedText(originalText);
      return;
    }

    if (response.success && response.data.categories) {
      enabledCategories = response.data.categories;
    }

    // Get custom patterns if available
    if (response.success && response.data.customPatterns) {
      customPatterns = response.data.customPatterns;
    }

    // Check if restoration is enabled
    if (response.success && response.data.enableRestoration) {
      enableRestoration = true;
    }
  } catch (error) {
    console.error('[Secure Paste] Error getting settings:', error);
    // Continue with default behavior (all categories enabled)
  }

  // Apply masking with restoration support if enabled
  let maskedText: string;
  let replacements: number;
  let categoryCounts: Record<string, number>;
  let customPatternCounts: Record<string, number> | undefined;

  if (enableRestoration) {
    // Use maskWithRestore to enable restoration on copy
    const restoreResult = maskWithRestore(originalText, enabledCategories, customPatterns);
    maskedText = restoreResult.masked;
    replacements = restoreResult.replacements;

    // Save restore map to session storage
    if (restoreResult.restoreMap.length > 0) {
      await saveRestoreMap(restoreResult.restoreMap);

      // Update in-memory cache for copy handler (synchronous access)
      updateRestorationCache(true, restoreResult.restoreMap);
    }

    // Calculate category counts from restore map
    categoryCounts = {};
    restoreResult.restoreMap.forEach((entry) => {
      const category = entry.type.split('_')[0]; // Extract category from type
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
  } else {
    // Use regular masking without restoration
    const result = maskSecretPatterns(originalText, enabledCategories, customPatterns);
    maskedText = result.masked;
    replacements = result.replacements;
    categoryCounts = result.categoryCounts;
    customPatternCounts = result.customPatternCounts;

    // Clear restoration cache when disabled
    updateRestorationCache(false, []);
  }

  // If no secrets detected, insert original text
  if (replacements === 0) {
    insertMaskedText(originalText);
    return;
  }

  // Insert masked text
  insertMaskedText(maskedText);

  // Get current hostname
  const hostname = window.location.hostname;

  // Increment protected count (total)
  await incrementProtectedCount(replacements);

  // Increment site-specific count
  try {
    await safeSendMessage({
      type: 'INCREMENT_SITE_COUNT',
      data: { hostname, count: replacements },
    });
  } catch (error) {
    console.error('[Secure Paste] Error incrementing site count:', error);
  }

  // Increment category-specific counts
  if (categoryCounts && Object.keys(categoryCounts).length > 0) {
    try {
      await safeSendMessage({
        type: 'INCREMENT_CATEGORY_COUNTS',
        data: { categoryCounts },
      });
    } catch (error) {
      console.error('[Secure Paste] Error incrementing category counts:', error);
    }
  }

  // Increment custom pattern counts
  if (customPatternCounts && Object.keys(customPatternCounts).length > 0) {
    try {
      // Send each custom pattern count separately
      for (const [patternId, count] of Object.entries(customPatternCounts)) {
        await safeSendMessage({
          type: 'INCREMENT_CUSTOM_PATTERN_COUNT',
          data: { patternId, count },
        });
      }
    } catch (error) {
      console.error('[Secure Paste] Error incrementing custom pattern counts:', error);
    }
  }

  // Show toast notification
  showToast(replacements);

  // Log detection (optional, for debugging)
  console.log(`[Secure Paste] Masked ${replacements} secret(s) on ${hostname}`, categoryCounts);
}

/**
 * Insert masked text at cursor position
 */
function insertMaskedText(text: string): void {
  const activeElement = document.activeElement;

  // Handle textarea and input elements
  if (
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLInputElement
  ) {
    const start = activeElement.selectionStart || 0;
    const end = activeElement.selectionEnd || 0;
    const currentValue = activeElement.value;

    // Insert text at cursor position
    activeElement.value =
      currentValue.substring(0, start) +
      text +
      currentValue.substring(end);

    // Set cursor position after inserted text
    const newPosition = start + text.length;
    activeElement.setSelectionRange(newPosition, newPosition);

    // Trigger input event for frameworks (React, Vue, etc.)
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  // Handle contenteditable elements (rich text editors)
  if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
    // Check if it's ProseMirror (Claude.ai uses this)
    const isProseMirror = activeElement.classList.contains('ProseMirror');

    // Check if it's Quill (Gemini uses this)
    const isQuill = activeElement.classList.contains('ql-editor');

    // Check if it's Perplexity (uses id="ask-input")
    const isPerplexity = activeElement.id === 'ask-input';

    if (isProseMirror) {
      // ProseMirror-specific handling: use execCommand with plain text
      // ProseMirror will handle the formatting internally
      try {
        // Use insertText command which ProseMirror intercepts and handles properly
        const success = document.execCommand('insertText', false, text);

        if (success) {
          console.log('[Secure Paste] ProseMirror paste successful');
          return;
        }
      } catch (error) {
        console.warn('[Secure Paste] ProseMirror insertText failed:', error);
      }

      // Fallback for ProseMirror: direct text insertion
      try {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();

          // Insert as plain text node - ProseMirror will process it
          const textNode = document.createTextNode(text);
          range.insertNode(textNode);

          // Move cursor after inserted text
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);

          // Force ProseMirror to update
          activeElement.dispatchEvent(new Event('input', { bubbles: true }));

          console.log('[Secure Paste] ProseMirror fallback successful');
          return;
        }
      } catch (error) {
        console.warn('[Secure Paste] ProseMirror fallback failed:', error);
      }
    }

    if (isQuill) {
      // Quill-specific handling: use execCommand with plain text
      // Quill will handle the formatting internally
      try {
        // Use insertText command which Quill intercepts and handles properly
        const success = document.execCommand('insertText', false, text);

        if (success) {
          console.log('[Secure Paste] Quill paste successful');
          return;
        }
      } catch (error) {
        console.warn('[Secure Paste] Quill insertText failed:', error);
      }

      // Fallback for Quill: direct text insertion
      try {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();

          // Insert as plain text node - Quill will process it
          const textNode = document.createTextNode(text);
          range.insertNode(textNode);

          // Move cursor after inserted text
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);

          // Force Quill to update
          activeElement.dispatchEvent(new Event('text-change', { bubbles: true }));
          activeElement.dispatchEvent(new Event('input', { bubbles: true }));

          console.log('[Secure Paste] Quill fallback successful');
          return;
        }
      } catch (error) {
        console.warn('[Secure Paste] Quill fallback failed:', error);
      }
    }

    if (isPerplexity) {
      // Perplexity uses Lexical editor
      // execCommand works for basic text insertion (no line break support due to Lexical limitations)
      try {
        const success = document.execCommand('insertText', false, text);
        if (success) {
          activeElement.dispatchEvent(new Event('input', { bubbles: true }));
          console.log('[Secure Paste] Perplexity paste successful (no line breaks)');
          return;
        }
      } catch (error) {
        console.warn('[Secure Paste] Perplexity paste failed:', error);
      }
    }

    // Standard contenteditable handling (ChatGPT, etc.)
    try {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // Convert text to HTML preserving whitespace and line breaks
        const fragment = document.createDocumentFragment();
        const lines = text.split('\n');

        lines.forEach((line, index) => {
          // Preserve ALL spaces and tabs (not just leading)
          const preservedLine = line
            .replace(/ /g, '\u00A0')  // Replace all spaces with non-breaking spaces
            .replace(/\t/g, '\u00A0\u00A0\u00A0\u00A0');  // Replace tabs with 4 non-breaking spaces

          // Create text node for the line
          const textNode = document.createTextNode(preservedLine);
          fragment.appendChild(textNode);

          // Add line break if not last line
          if (index < lines.length - 1) {
            fragment.appendChild(document.createElement('br'));
          }
        });

        range.insertNode(fragment);

        // Move cursor to end of inserted content
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        // Trigger input events for React/Vue frameworks
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        activeElement.dispatchEvent(new Event('change', { bubbles: true }));

        return;
      }
    } catch (error) {
      console.warn('[Secure Paste] Standard contenteditable insertion failed:', error);
    }

    // Final fallback: execCommand with preserved whitespace
    try {
      const preservedText = text
        .split('\n')
        .map(line => line.replace(/ /g, '\u00A0').replace(/\t/g, '\u00A0\u00A0\u00A0\u00A0'))
        .join('\n');

      document.execCommand('insertText', false, preservedText);
      return;
    } catch (error) {
      console.warn('[Secure Paste] execCommand fallback failed:', error);
    }
  }

  // Fallback: use execCommand (deprecated but widely supported)
  document.execCommand('insertText', false, text);
}

/**
 * Show notification when extension context is invalidated
 * This happens when the extension is reloaded/updated
 */
let contextInvalidatedNoticeShown = false;

function showContextInvalidatedNotice(): void {
  // Only show once per page load
  if (contextInvalidatedNoticeShown) return;
  contextInvalidatedNoticeShown = true;

  // Create notification element
  const notice = document.createElement('div');
  notice.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    background: #1F1F1F;
    border: 2px solid #F59E0B;
    border-radius: 8px;
    padding: 16px 24px;
    max-width: 500px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    animation: slideDown 0.3s ease-out;
  `;

  notice.innerHTML = `
    <div style="display: flex; align-items: start; gap: 12px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div style="flex: 1;">
        <div style="color: #FAFAFA; font-size: 14px; font-weight: 600; margin-bottom: 4px;">
          Secure Paste Extension Updated
        </div>
        <div style="color: #A3A3A3; font-size: 13px; margin-bottom: 12px;">
          Please refresh this page to re-enable secret protection.
        </div>
        <button id="safepaste-refresh-btn" style="
          background: #F59E0B;
          color: #000;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        ">
          Refresh Page
        </button>
      </div>
      <button id="safepaste-close-notice" style="
        background: none;
        border: none;
        color: #737373;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      ">×</button>
    </div>
  `;

  // Add animation
  if (!document.getElementById('safepaste-notice-styles')) {
    const style = document.createElement('style');
    style.id = 'safepaste-notice-styles';
    style.textContent = `
      @keyframes slideDown {
        from {
          transform: translateX(-50%) translateY(-100px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notice);

  // Add event listeners
  const refreshBtn = document.getElementById('safepaste-refresh-btn');
  const closeBtn = document.getElementById('safepaste-close-notice');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      window.location.reload();
    });
    refreshBtn.addEventListener('mouseenter', () => {
      refreshBtn.style.background = '#D97706';
    });
    refreshBtn.addEventListener('mouseleave', () => {
      refreshBtn.style.background = '#F59E0B';
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      notice.remove();
    });
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = '#FAFAFA';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = '#737373';
    });
  }

  // Auto-remove after 15 seconds
  setTimeout(() => {
    if (notice.parentElement) {
      notice.remove();
    }
  }, 15000);
}
