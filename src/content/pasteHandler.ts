/**
 * Paste event handler for content script
 * Intercepts paste events and applies secret masking
 */

import { maskSecretPatterns, maskWithRestore } from '@/core/detector';
import { incrementProtectedCount } from './clipboardInterceptor';
import { showToast } from './toast';
import { saveRestoreMap } from './restoreManager';
import { updateRestorationCache } from './copyHandler';

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
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SETTINGS',
    });

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
    await chrome.runtime.sendMessage({
      type: 'INCREMENT_SITE_COUNT',
      data: { hostname, count: replacements },
    });
  } catch (error) {
    console.error('[Secure Paste] Error incrementing site count:', error);
  }

  // Increment category-specific counts
  if (categoryCounts && Object.keys(categoryCounts).length > 0) {
    try {
      await chrome.runtime.sendMessage({
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
        await chrome.runtime.sendMessage({
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
