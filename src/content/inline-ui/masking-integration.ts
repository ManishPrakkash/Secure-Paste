/**
 * Masking Integration
 * Integrates inline UI with existing masking and restoration logic
 * Handles input value manipulation safely
 */

import type { InputFieldData } from './types';
import { maskWithRestore } from '@/core/detector';
import { saveRestoreMap, getRestoreMap } from '../restoreManager';
import { updateRestorationCache } from '../copyHandler';
import { safeSendMessage } from '../extensionContext';
import { updateIconState } from './inline-icon';
import { getCurrentValue } from './live-detector';

/**
 * Set value safely for different input types
 */
function setInputValue(input: HTMLElement, value: string): void {
  const tagName = input.tagName.toLowerCase();
  
  if (tagName === 'textarea' || tagName === 'input') {
    (input as HTMLTextAreaElement | HTMLInputElement).value = value;
    
    // Trigger input event to notify React/Vue/etc
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);
  } else if (input.getAttribute('contenteditable') === 'true') {
    input.textContent = value;
    
    // Trigger input event
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);
    
    // Move cursor to end
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(input);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}

/**
 * Mask input value
 */
export async function maskInputValue(input: HTMLElement, data: InputFieldData): Promise<void> {
  if (data.isMasked) {
    console.log('[Secure Paste Inline] Already masked');
    return;
  }

  try {
    // Get current value
    const originalValue = getCurrentValue(input);
    
    if (!originalValue.trim()) {
      console.log('[Secure Paste Inline] No content to mask');
      return;
    }

    // Get settings
    const response = await safeSendMessage({
      type: 'GET_SETTINGS',
    });

    if (!response) {
      console.error('[Secure Paste Inline] Extension context invalid');
      return;
    }

    let enabledCategories: Record<string, boolean> | undefined;
    let customPatterns: any[] | undefined;
    let enableRestoration = false;

    if (response.success && response.data) {
      enabledCategories = response.data.categories;
      customPatterns = response.data.customPatterns;
      enableRestoration = response.data.enableRestoration === true;
    }

    // Apply masking with restoration support
    const result = maskWithRestore(originalValue, enabledCategories, customPatterns);

    if (result.replacements === 0) {
      console.log('[Secure Paste Inline] No secrets to mask');
      return;
    }

    // Store original value
    data.originalValue = originalValue;

    // Save restore map if restoration is enabled
    if (enableRestoration && result.restoreMap && result.restoreMap.length > 0) {
      await saveRestoreMap(result.restoreMap);
      
      // Update restoration cache for copy handler
      updateRestorationCache(enableRestoration, result.restoreMap);
    }

    // Apply masked value to input
    setInputValue(input, result.masked);

    // Update state
    data.isMasked = true;

    // Update icon to secured state
    updateIconState(input, 'secured', data);

    console.log(`[Secure Paste Inline] Masked ${result.replacements} secret(s)`);
  } catch (error) {
    console.error('[Secure Paste Inline] Masking error:', error);
    throw error;
  }
}

/**
 * Restore original input value
 */
export async function restoreInputValue(input: HTMLElement, data: InputFieldData): Promise<void> {
  if (!data.isMasked) {
    console.log('[Secure Paste Inline] Not masked');
    return;
  }

  try {
    // Check if restoration is enabled
    const response = await safeSendMessage({
      type: 'GET_SETTINGS',
    });

    if (!response || !response.success) {
      console.error('[Secure Paste Inline] Cannot get settings');
      return;
    }

    const enableRestoration = response.data?.enableRestoration === true;

    if (!enableRestoration) {
      console.warn('[Secure Paste Inline] Restoration is disabled');
      alert('Restoration is disabled. Enable it in extension settings to restore original values.');
      return;
    }

    // Try to restore from stored original value
    if (data.originalValue) {
      setInputValue(input, data.originalValue);
      
      // Update state
      data.isMasked = false;
      data.originalValue = null;
      
      // Update icon based on detection result
      if (data.lastDetectionResult?.hasSecrets) {
        updateIconState(input, 'warning', data);
      } else {
        updateIconState(input, 'idle', data);
      }
      
      console.log('[Secure Paste Inline] Restored original value');
    } else {
      // Fallback: try to restore from session storage restore map
      const restoreMap = await getRestoreMap();
      
      if (restoreMap.length === 0) {
        console.warn('[Secure Paste Inline] No restore map available');
        alert('Original value not found. Restoration is only available for this session.');
        return;
      }

      // Get current (masked) value
      const currentValue = getCurrentValue(input);
      
      // Attempt to restore by replacing masked tokens
      let restored = currentValue;
      let restoredAny = false;
      
      restoreMap.forEach(entry => {
        if (restored.includes(entry.numberedReplacement)) {
          restored = restored.replace(
            new RegExp(escapeRegExp(entry.numberedReplacement), 'g'),
            entry.original
          );
          restoredAny = true;
        }
      });
      
      if (restoredAny) {
        setInputValue(input, restored);
        
        // Update state
        data.isMasked = false;
        data.originalValue = null;
        
        // Update icon
        updateIconState(input, 'idle', data);
        
        console.log('[Secure Paste Inline] Restored from session map');
      } else {
        console.warn('[Secure Paste Inline] No matching restore entries');
        alert('Cannot restore: masked tokens not found in restore map.');
      }
    }
  } catch (error) {
    console.error('[Secure Paste Inline] Restore error:', error);
    throw error;
  }
}

/**
 * Escape special regex characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
