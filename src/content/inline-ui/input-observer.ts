/**
 * Input Field Observer
 * Detects and tracks chat input fields using MutationObserver
 * Prevents duplicate bindings and handles SPA navigation
 */

import type { InputFieldData } from './types';
import { getCurrentSiteAdapter } from '../site-adapters';
import { attachInlineIcon } from './inline-icon';

/**
 * WeakMap for memory-safe input tracking
 * Automatically cleaned up when elements are garbage collected
 */
const inputFieldDataMap = new WeakMap<HTMLElement, InputFieldData>();

/**
 * Set for tracking observed inputs (for duplicate prevention)
 */
const observedInputs = new Set<HTMLElement>();

/**
 * MutationObserver instance
 */
let mutationObserver: MutationObserver | null = null;

/**
 * Check if an element matches input field criteria
 */
function isInputField(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  const isTextarea = tagName === 'textarea';
  const isContentEditable = element.getAttribute('contenteditable') === 'true';
  
  return isTextarea || isContentEditable;
}

/**
 * Check if input field should be tracked based on site adapter rules
 */
function shouldTrackInput(input: HTMLElement): boolean {
  const adapter = getCurrentSiteAdapter();
  if (!adapter) return false;

  // Check if already observed
  if (observedInputs.has(input)) return false;

  // Check adapter's shouldAttach rule if exists
  if (adapter.shouldAttach && !adapter.shouldAttach(input)) {
    return false;
  }

  // Check if matches any selector
  for (const selector of adapter.selectors.input) {
    try {
      if (input.matches(selector)) {
        return true;
      }
    } catch (e) {
      // Invalid selector, skip
      console.warn('[Secure Paste Inline] Invalid selector:', selector, e);
    }
  }

  return false;
}

/**
 * Attach inline UI to an input field
 */
function attachToInput(input: HTMLElement): void {
  if (observedInputs.has(input)) return;
  if (!shouldTrackInput(input)) return;

  // Mark as observed
  observedInputs.add(input);

  // Initialize input field data
  const data: InputFieldData = {
    element: input,
    iconContainer: null,
    shadowRoot: null,
    originalValue: null,
    isMasked: false,
    lastDetectionResult: null,
    cleanupFn: null,
  };

  inputFieldDataMap.set(input, data);

  // Attach inline icon
  attachInlineIcon(input, data);

  // Setup cleanup on element removal
  setupCleanupObserver(input);
}

/**
 * Setup observer to detect when input is removed from DOM
 */
function setupCleanupObserver(input: HTMLElement): void {
  const cleanupObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const removedNode of mutation.removedNodes) {
        if (removedNode === input || (removedNode instanceof HTMLElement && removedNode.contains(input))) {
          cleanupInput(input);
          cleanupObserver.disconnect();
          return;
        }
      }
    }
  });

  cleanupObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Store cleanup observer reference
  const data = inputFieldDataMap.get(input);
  if (data) {
    const originalCleanup = data.cleanupFn;
    data.cleanupFn = () => {
      cleanupObserver.disconnect();
      if (originalCleanup) originalCleanup();
    };
  }
}

/**
 * Cleanup input field tracking
 */
function cleanupInput(input: HTMLElement): void {
  const data = inputFieldDataMap.get(input);
  if (data && data.cleanupFn) {
    data.cleanupFn();
  }

  // Remove icon container if exists
  if (data?.iconContainer && data.iconContainer.parentNode) {
    data.iconContainer.parentNode.removeChild(data.iconContainer);
  }

  observedInputs.delete(input);
  // WeakMap entry will be garbage collected automatically
}

/**
 * Scan document for input fields
 */
function scanForInputs(): void {
  const adapter = getCurrentSiteAdapter();
  if (!adapter) return;

  // Query all potential input fields
  for (const selector of adapter.selectors.input) {
    try {
      const inputs = document.querySelectorAll<HTMLElement>(selector);
      inputs.forEach(input => {
        if (isInputField(input) && !observedInputs.has(input)) {
          attachToInput(input);
        }
      });
    } catch (e) {
      console.warn('[Secure Paste Inline] Error querying selector:', selector, e);
    }
  }
}

/**
 * Handle DOM mutations
 */
function handleMutations(mutations: MutationRecord[]): void {
  for (const mutation of mutations) {
    // Check added nodes
    for (const addedNode of mutation.addedNodes) {
      if (!(addedNode instanceof HTMLElement)) continue;

      // Check if the node itself is an input
      if (isInputField(addedNode) && shouldTrackInput(addedNode)) {
        attachToInput(addedNode);
      }

      // Check descendants
      const adapter = getCurrentSiteAdapter();
      if (adapter) {
        for (const selector of adapter.selectors.input) {
          try {
            const inputs = addedNode.querySelectorAll<HTMLElement>(selector);
            inputs.forEach(input => {
              if (isInputField(input) && !observedInputs.has(input)) {
                attachToInput(input);
              }
            });
          } catch (e) {
            // Invalid selector, skip
          }
        }
      }
    }
  }
}

/**
 * Initialize input observer
 */
export function initInputObserver(): void {
  const adapter = getCurrentSiteAdapter();
  if (!adapter) {
    console.log('[Secure Paste Inline] No adapter found for', window.location.hostname);
    return;
  }

  console.log('[Secure Paste Inline] Initializing for', adapter.hostname);

  // Initial scan
  scanForInputs();

  // Setup mutation observer
  if (!mutationObserver) {
    mutationObserver = new MutationObserver(handleMutations);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

/**
 * Cleanup input observer
 */
export function cleanupInputObserver(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }

  // Cleanup all tracked inputs
  observedInputs.forEach(input => {
    cleanupInput(input);
  });

  observedInputs.clear();
}

/**
 * Get input field data (for use by other modules)
 */
export function getInputFieldData(input: HTMLElement): InputFieldData | undefined {
  return inputFieldDataMap.get(input);
}

/**
 * Update input field data (for use by other modules)
 */
export function updateInputFieldData(input: HTMLElement, updates: Partial<InputFieldData>): void {
  const data = inputFieldDataMap.get(input);
  if (data) {
    Object.assign(data, updates);
  }
}
