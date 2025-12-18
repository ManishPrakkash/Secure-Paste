/**
 * Copy event handler for content script
 * Restores masked values to originals when copying
 */

import { restoreFromMasked } from '@/core/detector';

// Cache for restoration state to avoid async lookups during copy event
let restorationCache: {
  enabled: boolean;
  restoreMap: any[];
  timestamp: number;
} = {
  enabled: false,
  restoreMap: [],
  timestamp: 0,
};

/**
 * Update restoration cache (called after paste)
 */
export function updateRestorationCache(enabled: boolean, restoreMap: any[]): void {
  restorationCache = {
    enabled,
    restoreMap,
    timestamp: Date.now(),
  };
}

/**
 * Handle copy event and restore original secrets
 * Must be synchronous to work with copy event
 */
export function handleCopy(event: ClipboardEvent): void {
  // Check if restoration is enabled (from cache)
  if (!restorationCache.enabled) {
    return; // Allow normal copy behavior
  }

  // Check cache age (expire after 1 hour)
  if (Date.now() - restorationCache.timestamp > 3600000) {
    return; // Cache expired, allow normal copy
  }

  // Get restore map from cache
  const restoreMap = restorationCache.restoreMap;
  if (!restoreMap || restoreMap.length === 0) {
    return; // No restore map available, allow normal copy
  }

  // Get the text being copied
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  const selectedText = selection.toString();
  if (!selectedText) {
    return;
  }

  // Check if selected text contains masked patterns (with or without brackets)
  // Matches: [AWS_KEY#q3q1] or AWS_KEY#q3q1
  const hasMaskedPatterns = /\[?[A-Z0-9_-]+#[a-z0-9]{4}\]?/g.test(selectedText);
  if (!hasMaskedPatterns) {
    return; // No masked patterns found, allow normal copy
  }

  // Restore original values
  const restoredText = restoreFromMasked(selectedText, restoreMap);

  // If restoration changed the text, update clipboard
  if (restoredText !== selectedText) {
    event.preventDefault();
    event.stopPropagation();

    // Try clipboardData first (synchronous)
    const clipboardData = event.clipboardData;
    if (clipboardData) {
      clipboardData.setData('text/plain', restoredText);
    }

    // Also write via async API as backup
    navigator.clipboard.writeText(restoredText).catch(() => {
      // Silently fail - clipboardData already set
    });
  }
}

/**
 * Intercept programmatic clipboard writes (e.g., AI platform copy buttons)
 * Note: These interceptors are not actually triggered by most AI platforms,
 * so we rely on the button click handler below for restoration.
 */
function interceptClipboardAPI(): void {
  // Intercept navigator.clipboard.writeText (just in case some platform uses it)
  const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
  navigator.clipboard.writeText = async function (text: string): Promise<void> {
    // Check if restoration is enabled and we have a restore map
    if (restorationCache.enabled && restorationCache.restoreMap.length > 0) {
      // Check cache age
      if (Date.now() - restorationCache.timestamp <= 3600000) {
        // Check if text contains masked patterns (with or without brackets)
        const hasMaskedPatterns = /\[?[A-Z0-9_-]+#[a-z0-9]{4}\]?/g.test(text);

        if (hasMaskedPatterns) {
          // Restore original values
          const restoredText = restoreFromMasked(text, restorationCache.restoreMap);

          if (restoredText !== text) {
            return originalWriteText(restoredText);
          }
        }
      }
    }

    // No restoration needed, use original function
    return originalWriteText(text);
  };
}

/**
 * Initialize copy event listener
 */
export function initCopyHandler(): void {
  // Handle manual copy events (Ctrl+C, right-click copy)
  document.addEventListener('copy', handleCopy);

  // Intercept programmatic clipboard API calls (copy buttons)
  interceptClipboardAPI();

  // Monitor button clicks to restore clipboard content after copy button clicks
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    // Check if clicked element or its parents contain copy-related attributes
    let element: HTMLElement | null = target;
    let depth = 0;

    while (element && depth < 5) {
      // Handle both string and SVGAnimatedString className
      const classNameRaw: any = element.className;
      const classList = typeof classNameRaw === 'string'
        ? classNameRaw
        : (classNameRaw?.baseVal || '');
      const ariaLabel = element.getAttribute('aria-label') || '';
      const title = element.getAttribute('title') || '';
      const text = element.textContent || '';

      // Check for copy-related patterns
      const isCopyButton =
        classList.includes('copy') ||
        classList.includes('Copy') ||
        ariaLabel.toLowerCase().includes('copy') ||
        title.toLowerCase().includes('copy') ||
        text.trim().toLowerCase() === 'copy' ||
        // Additional patterns for buttons with icons
        element.tagName === 'BUTTON' && (
          element.querySelector('svg') !== null ||
          classList.includes('btn') ||
          classList.includes('button')
        );

      if (isCopyButton) {
        // Check clipboard content after a short delay
        setTimeout(async () => {
          try {
            const clipboardText = await navigator.clipboard.readText();

            // Check if it contains masked patterns
            const hasMaskedPatterns = /\[?[A-Z0-9_-]+#[a-z0-9]{4}\]?/g.test(clipboardText);

            if (hasMaskedPatterns && restorationCache.enabled && restorationCache.restoreMap.length > 0) {
              const restoredText = restoreFromMasked(clipboardText, restorationCache.restoreMap);

              if (restoredText !== clipboardText) {
                await navigator.clipboard.writeText(restoredText);
              }
            }
          } catch (error) {
            // Silently fail - user might not have granted clipboard permissions
          }
        }, 100);

        break;
      }

      element = element.parentElement;
      depth++;
    }
  }, true);
}
