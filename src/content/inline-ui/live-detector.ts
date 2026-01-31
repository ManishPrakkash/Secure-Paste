/**
 * Live Detector
 * Monitors input fields for secret patterns while typing
 * Uses debouncing to avoid excessive detection runs
 */

import type { InputFieldData, LiveDetectionResult } from './types';
import { detectSecretPatterns } from '@/core/detector';
import { updateIconState } from './inline-icon';
import { safeSendMessage } from '../extensionContext';

/**
 * Debounce delay in milliseconds
 */
const DEBOUNCE_DELAY = 300;

/**
 * Map to store debounce timers per input
 */
const debounceTimers = new WeakMap<HTMLElement, number>();

/**
 * Get current value from input element
 */
function getInputValue(input: HTMLElement): string {
  const tagName = input.tagName.toLowerCase();
  
  if (tagName === 'textarea' || tagName === 'input') {
    return (input as HTMLTextAreaElement | HTMLInputElement).value || '';
  }
  
  if (input.getAttribute('contenteditable') === 'true') {
    return input.textContent || '';
  }
  
  return '';
}

/**
 * Perform detection on input value
 */
async function performDetection(value: string): Promise<LiveDetectionResult> {
  if (!value.trim()) {
    return {
      hasSecrets: false,
      count: 0,
      categories: {},
    };
  }

  try {
    // Get enabled categories from settings
    const response = await safeSendMessage({
      type: 'GET_SETTINGS',
    });

    let enabledCategories: Record<string, boolean> | undefined;
    let customPatterns: any[] | undefined;

    if (response && response.success) {
      if (response.data.categories) {
        enabledCategories = response.data.categories;
      }
      if (response.data.customPatterns) {
        customPatterns = response.data.customPatterns;
      }
    }

    // Use existing detection engine
    const result = detectSecretPatterns(value, enabledCategories, customPatterns);

    return {
      hasSecrets: result.count > 0,
      count: result.count,
      categories: result.matches.reduce((acc, match) => {
        const category = match.category || 'unknown';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  } catch (error) {
    console.error('[Secure Paste Inline] Detection error:', error);
    return {
      hasSecrets: false,
      count: 0,
      categories: {},
    };
  }
}

/**
 * Handle input change with debouncing
 */
async function handleInputChange(input: HTMLElement, data: InputFieldData): Promise<void> {
  // Clear existing timer
  const existingTimer = debounceTimers.get(input);
  if (existingTimer) {
    window.clearTimeout(existingTimer);
  }

  // Set new timer
  const timer = window.setTimeout(async () => {
    const value = getInputValue(input);
    
    // Perform detection
    const result = await performDetection(value);
    
    // Update data
    data.lastDetectionResult = result;
    
    // Update icon state based on detection result and masking status
    let iconState: 'idle' | 'warning' | 'secured';
    
    if (data.isMasked) {
      iconState = 'secured';
    } else if (result.hasSecrets) {
      iconState = 'warning';
    } else {
      iconState = 'idle';
    }
    
    updateIconState(input, iconState, data);
  }, DEBOUNCE_DELAY);

  debounceTimers.set(input, timer);
}

/**
 * Start live detection for an input field
 */
export function startLiveDetection(input: HTMLElement, data: InputFieldData): void {
  // Input event listener
  const inputListener = () => handleInputChange(input, data);
  
  // Keyup event listener (backup for some edge cases)
  const keyupListener = () => handleInputChange(input, data);

  input.addEventListener('input', inputListener);
  input.addEventListener('keyup', keyupListener);

  // Store cleanup function
  const existingCleanup = data.cleanupFn;
  data.cleanupFn = () => {
    input.removeEventListener('input', inputListener);
    input.removeEventListener('keyup', keyupListener);
    
    // Clear debounce timer
    const timer = debounceTimers.get(input);
    if (timer) {
      window.clearTimeout(timer);
      debounceTimers.delete(input);
    }
    
    if (existingCleanup) existingCleanup();
  };

  // Initial detection
  handleInputChange(input, data);
}

/**
 * Stop live detection for an input field
 */
export function stopLiveDetection(input: HTMLElement, _data: InputFieldData): void {
  // Clear debounce timer
  const timer = debounceTimers.get(input);
  if (timer) {
    window.clearTimeout(timer);
    debounceTimers.delete(input);
  }

  // Cleanup is handled by the cleanup function stored in data
}

/**
 * Manually trigger detection (used by secure panel)
 */
export async function triggerDetection(input: HTMLElement, data: InputFieldData): Promise<LiveDetectionResult> {
  const value = getInputValue(input);
  const result = await performDetection(value);
  data.lastDetectionResult = result;
  return result;
}

/**
 * Get current input value (exported for use by other modules)
 */
export function getCurrentValue(input: HTMLElement): string {
  return getInputValue(input);
}
