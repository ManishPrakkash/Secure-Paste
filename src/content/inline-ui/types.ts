/**
 * Type definitions for inline UI feature
 */

/**
 * Icon state reflects the detection and masking status
 */
export type IconState = 'idle' | 'warning' | 'secured';

/**
 * Detection result for live input monitoring
 */
export interface LiveDetectionResult {
  hasSecrets: boolean;
  count: number;
  categories: Record<string, number>;
}

/**
 * Input field metadata tracked in WeakMap
 */
export interface InputFieldData {
  element: HTMLElement;
  iconContainer: HTMLElement | null;
  shadowRoot: ShadowRoot | null;
  originalValue: string | null;
  isMasked: boolean;
  lastDetectionResult: LiveDetectionResult | null;
  cleanupFn: (() => void) | null;
}

/**
 * Site adapter configuration
 */
export interface SiteAdapter {
  hostname: string;
  selectors: {
    input: string[];
    container?: string;
  };
  // Custom positioning logic if needed
  getIconPosition?: (input: HTMLElement) => { bottom: string; right: string } | null;
  // Check if we should attach to this specific input
  shouldAttach?: (input: HTMLElement) => boolean;
}
