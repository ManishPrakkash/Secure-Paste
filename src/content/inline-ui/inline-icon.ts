/**
 * Inline Icon Component
 * Displays a floating icon inside input fields using Shadow DOM
 * Shows current state (idle/warning/secured)
 */

import type { InputFieldData, IconState } from './types';
import { startLiveDetection, stopLiveDetection } from './live-detector';
import { showSecurePanel, hideSecurePanel } from './secure-panel';

/**
 * Icon SVGs for each state
 */
const ICON_SVGS = {
  idle: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="8" stroke="#6b7280" stroke-width="1.5" fill="none"/>
    <path d="M10 6v4M10 13h.01" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  warning: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="8" fill="#ef4444"/>
    <path d="M10 6v4M10 13h.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
  secured: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="8" fill="#10b981"/>
    <path d="M7 10l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
};

/**
 * Create Shadow DOM styles
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
    
    .icon-button {
      all: unset;
      position: absolute;
      right: 88px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #e5e7eb;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      pointer-events: auto;
    }
    
    .icon-button:hover {
      background: rgba(255, 255, 255, 1);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      transform: translateY(-50%) scale(1.05);
    }
    
    .icon-button:active {
      transform: translateY(-50%) scale(0.95);
    }
    
    .icon-button.idle {
      opacity: 0.7;
    }
    
    .icon-button.warning {
      animation: pulse 1.5s ease-in-out infinite;
    }
    
    .icon-button.secured {
      border-color: #10b981;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
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

  // Create icon button
  const button = document.createElement('button');
  button.className = 'icon-button idle';
  button.innerHTML = ICON_SVGS.idle;
  button.setAttribute('aria-label', 'Secure Paste - Check for secrets');
  button.setAttribute('title', 'Click to secure this input');

  // Handle click
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleIconClick(input, data);
  });

  shadowRoot.appendChild(button);

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
  if (!button) return;

  // Update class
  button.className = `icon-button ${state}`;

  // Update icon
  button.innerHTML = ICON_SVGS[state];

  // Update aria label
  const labels = {
    idle: 'Secure Paste - No secrets detected',
    warning: 'Secure Paste - Secrets detected! Click to secure',
    secured: 'Secure Paste - Input secured',
  };
  button.setAttribute('aria-label', labels[state]);
  button.setAttribute('title', labels[state]);
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
