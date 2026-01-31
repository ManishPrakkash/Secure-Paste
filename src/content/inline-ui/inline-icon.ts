/**
 * Inline Icon Component
 * Displays a floating icon inside input fields using Shadow DOM
 * Shows current state (idle/warning/secured)
 */

import type { InputFieldData, IconState } from './types';
import { startLiveDetection, stopLiveDetection } from './live-detector';
import { showSecurePanel, hideSecurePanel } from './secure-panel';

/**
 * Icon SVGs for each state - Compact versions for the dot
 * These appear when hovering over the dot
 */
const ICON_SVGS = {
  idle: `<svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
    <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  warning: `<svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9V13M12 17H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M10.29 3.86L1.82 18A2 2 0 003.54 21H20.46A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  secured: `<svg class="icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="2"/>
  </svg>`,
};

/**
 * Create Shadow DOM styles - Sider AI-style floating dot
 */
function getIconStyles(): string {
  return `
    :host {
      all: initial;
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    }
    
    .icon-wrapper {
      position: absolute;
      right: 88px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: auto;
    }
    
    .icon-button {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    
    /* Base dot styles */
    .icon-button::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* Idle state - subtle gray dot */
    .icon-button.idle {
      background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      box-shadow: 0 2px 8px rgba(107, 114, 128, 0.4);
    }
    
    .icon-button.idle::before {
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 60%);
    }
    
    /* Warning state - pulsing red dot */
    .icon-button.warning {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 2px 12px rgba(239, 68, 68, 0.6);
      animation: warningPulse 1.5s ease-in-out infinite;
    }
    
    .icon-button.warning::before {
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%);
    }
    
    /* Secured state - green dot */
    .icon-button.secured {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.5);
    }
    
    .icon-button.secured::before {
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 60%);
    }
    
    /* Icon inside - hidden by default */
    .icon-svg {
      opacity: 0;
      transform: scale(0);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      color: white;
    }
    
    /* Hover state - expand to full button */
    .icon-button:hover {
      width: 32px;
      height: 32px;
      border-radius: 10px;
    }
    
    .icon-button.idle:hover {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
      box-shadow: 
        0 4px 16px rgba(0, 0, 0, 0.3),
        0 0 0 1px rgba(255, 255, 255, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    
    .icon-button.warning:hover {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(185, 28, 28, 0.98) 100%);
      box-shadow: 
        0 4px 20px rgba(239, 68, 68, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
      animation: none;
    }
    
    .icon-button.secured:hover {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.98) 100%);
      box-shadow: 
        0 4px 16px rgba(16, 185, 129, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }
    
    .icon-button:hover .icon-svg {
      opacity: 1;
      transform: scale(1);
      transition-delay: 0.1s;
    }
    
    .icon-button:hover::before {
      opacity: 0;
    }
    
    /* Active/click state */
    .icon-button:active {
      transform: scale(0.92);
    }
    
    /* Ripple effect on click */
    .icon-button::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
      opacity: 0;
      transform: scale(0);
      transition: all 0.4s ease;
    }
    
    .icon-button:active::after {
      opacity: 1;
      transform: scale(1.5);
    }
    
    @keyframes warningPulse {
      0%, 100% { 
        box-shadow: 0 2px 12px rgba(239, 68, 68, 0.6);
        transform: scale(1);
      }
      50% { 
        box-shadow: 0 2px 20px rgba(239, 68, 68, 0.9), 0 0 0 4px rgba(239, 68, 68, 0.2);
        transform: scale(1.1);
      }
    }
    
    /* Tooltip on hover */
    .tooltip {
      position: absolute;
      right: calc(100% + 8px);
      top: 50%;
      transform: translateY(-50%);
      background: rgba(15, 23, 42, 0.95);
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .tooltip::after {
      content: '';
      position: absolute;
      right: -6px;
      top: 50%;
      transform: translateY(-50%);
      border: 6px solid transparent;
      border-left-color: rgba(15, 23, 42, 0.95);
    }
    
    .icon-wrapper:hover .tooltip {
      opacity: 1;
      visibility: visible;
    }
  `;
}

/**
 * Find the best parent container for positioning the icon
 * Returns the container that represents the full input bar
 */
function findInputContainer(input: HTMLElement): HTMLElement {
  // Try to find ChatGPT's composer surface (the rounded input container)
  const composerSurface = input.closest('[data-composer-surface]') as HTMLElement;
  if (composerSurface) {
    return composerSurface;
  }

  // Try other common patterns
  const alternatives = [
    input.closest('[class*="composer"]'),
    input.closest('[class*="input-container"]'),
    input.closest('[class*="chat-input"]'),
    input.closest('form'),
  ] as HTMLElement[];

  for (const alt of alternatives) {
    if (alt) return alt;
  }

  // Fallback: find parent with minimum width
  let current = input.parentElement;
  while (current && current !== document.body) {
    const rect = current.getBoundingClientRect();
    if (rect.width >= 300) {
      return current;
    }
    current = current.parentElement;
  }

  // Last resort: use immediate parent
  return input.parentElement || input;
}

/**
 * Create icon container with Shadow DOM
 */
function createIconContainer(input: HTMLElement, data: InputFieldData): HTMLElement {
  // Find the input container to attach to
  const inputContainer = findInputContainer(input);

  // Ensure the container has relative positioning for our absolute child
  const containerStyle = window.getComputedStyle(inputContainer);
  if (containerStyle.position === 'static') {
    inputContainer.style.position = 'relative';
  }

  // Create icon wrapper
  const container = document.createElement('div');
  container.id = `secure-paste-icon-${Math.random().toString(36).substr(2, 9)}`;
  container.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 100;
  `;

  // Attach shadow root for isolation
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Create styles
  const style = document.createElement('style');
  style.textContent = getIconStyles();
  shadowRoot.appendChild(style);

  // Create icon wrapper (for proper hover area)
  const wrapper = document.createElement('div');
  wrapper.className = 'icon-wrapper';

  // Create icon button
  const button = document.createElement('button');
  button.className = 'icon-button idle';
  button.innerHTML = ICON_SVGS.idle;
  button.setAttribute('aria-label', 'Secure Paste - Check for secrets');

  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = 'Secure Paste';

  // Handle click
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleIconClick(input, data);
  });

  wrapper.appendChild(button);
  wrapper.appendChild(tooltip);
  shadowRoot.appendChild(wrapper);

  // Append to the input container (NOT document.body)
  inputContainer.appendChild(container);

  // Store references
  data.iconContainer = container;
  data.shadowRoot = shadowRoot;

  // No need for scroll/resize listeners since icon is now inside the input container

  return container;
}

/**
 * Update icon state
 */
export function updateIconState(_input: HTMLElement, state: IconState, data: InputFieldData): void {
  if (!data.shadowRoot) return;

  const button = data.shadowRoot.querySelector('.icon-button');
  const tooltip = data.shadowRoot.querySelector('.tooltip');
  if (!button) return;

  // Update class
  button.className = `icon-button ${state}`;

  // Update icon
  button.innerHTML = ICON_SVGS[state];

  // Update aria label and tooltip
  const labels = {
    idle: 'Secure Paste',
    warning: 'Secrets detected!',
    secured: 'Input secured',
  };
  button.setAttribute('aria-label', labels[state]);

  if (tooltip) {
    tooltip.textContent = labels[state];
  }
}

/**
 * Handle icon click
 */
function handleIconClick(input: HTMLElement, data: InputFieldData): void {
  console.log('[Secure Paste Inline] Icon clicked');

  // Show secure panel
  showSecurePanel(input, data);
}

/**
 * Attach inline icon to input field
 */
export function attachInlineIcon(input: HTMLElement, data: InputFieldData): void {
  // Create icon container
  createIconContainer(input, data);

  // Start live detection
  startLiveDetection(input, data);

  console.log('[Secure Paste Inline] Icon attached to input');
}

/**
 * Remove inline icon
 */
export function removeInlineIcon(input: HTMLElement, data: InputFieldData): void {
  // Stop live detection
  stopLiveDetection(input, data);

  // Hide panel if open
  hideSecurePanel();

  // Remove icon container
  if (data.iconContainer && data.iconContainer.parentNode) {
    data.iconContainer.parentNode.removeChild(data.iconContainer);
    data.iconContainer = null;
    data.shadowRoot = null;
  }
}
