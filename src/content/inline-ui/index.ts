/**
 * Inline UI Entry Point
 * Main module for inline UI feature
 */

import { initInputObserver, cleanupInputObserver } from './input-observer';

/**
 * Initialize inline UI feature
 */
export function initInlineUI(): void {
  console.log('[Secure Paste Inline] Initializing inline UI');
  
  // Initialize input observer
  initInputObserver();
}

/**
 * Cleanup inline UI feature
 */
export function cleanupInlineUI(): void {
  console.log('[Secure Paste Inline] Cleaning up inline UI');
  
  // Cleanup input observer (this will cleanup all tracked inputs)
  cleanupInputObserver();
}
