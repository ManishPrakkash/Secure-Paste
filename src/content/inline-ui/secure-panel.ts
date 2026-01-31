/**
 * Secure Panel Component
 * Displays action panel when icon is clicked
 * Allows user to mask, preview, restore, and configure
 */

import type { InputFieldData } from './types';
import { triggerDetection } from './live-detector';
import { maskInputValue, restoreInputValue } from './masking-integration';
import { safeSendMessage } from '../extensionContext';

/**
 * Current panel state
 */
let currentPanel: HTMLElement | null = null;
let currentInput: HTMLElement | null = null;
let currentData: InputFieldData | null = null;
let currentShadowRoot: ShadowRoot | null = null;

/**
 * Panel styles
 */
function getPanelStyles(): string {
  return `
    :host {
      all: initial;
      position: fixed;
      z-index: 2147483647;
    }
    
    .panel-container {
      all: unset;
      display: block;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      padding: 16px;
      min-width: 280px;
      max-width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
    }
    
    .panel-header {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f3f4f6;
    }
    
    .panel-title {
      all: unset;
      font-weight: 600;
      font-size: 15px;
      color: #111827;
    }
    
    .close-button {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.15s ease;
    }
    
    .close-button:hover {
      background: #f3f4f6;
      color: #111827;
    }
    
    .status-section {
      all: unset;
      display: block;
      margin-bottom: 12px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
    }
    
    .status-item {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    
    .status-item:last-child {
      margin-bottom: 0;
    }
    
    .status-label {
      all: unset;
      color: #6b7280;
      font-size: 13px;
    }
    
    .status-value {
      all: unset;
      font-weight: 500;
      color: #111827;
    }
    
    .status-value.warning {
      color: #ef4444;
    }
    
    .status-value.secured {
      color: #10b981;
    }
    
    .actions-section {
      all: unset;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .action-button {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: center;
    }
    
    .action-button.primary {
      background: #3b82f6;
      color: white;
    }
    
    .action-button.primary:hover {
      background: #2563eb;
    }
    
    .action-button.primary:disabled {
      background: #93c5fd;
      cursor: not-allowed;
      opacity: 0.6;
    }
    
    .action-button.secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #e5e7eb;
    }
    
    .action-button.secondary:hover {
      background: #e5e7eb;
    }
    
    .action-button.secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .action-button.danger {
      background: #fee2e2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    
    .action-button.danger:hover {
      background: #fecaca;
    }
    
    .divider {
      all: unset;
      display: block;
      height: 1px;
      background: #f3f4f6;
      margin: 8px 0;
    }
    
    .category-list {
      all: unset;
      display: block;
      margin-top: 8px;
      padding: 8px;
      background: white;
      border-radius: 6px;
      font-size: 12px;
      color: #6b7280;
    }
    
    .category-item {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 0;
    }
    
    .category-name {
      all: unset;
      text-transform: capitalize;
    }
    
    .category-count {
      all: unset;
      font-weight: 600;
      color: #ef4444;
    }
  `;
}

/**
 * Create panel HTML
 */
function createPanelHTML(data: InputFieldData): string {
  const detectionResult = data.lastDetectionResult;
  const hasSecrets = detectionResult?.hasSecrets || false;
  const secretCount = detectionResult?.count || 0;
  const isMasked = data.isMasked;

  // Status
  const statusText = isMasked ? 'Secured' : hasSecrets ? 'Secrets Detected' : 'No Secrets';
  const statusClass = isMasked ? 'secured' : hasSecrets ? 'warning' : '';

  // Categories
  const categories = detectionResult?.categories || {};
  const categoryHTML = Object.entries(categories)
    .map(([name, count]) => `
      <div class="category-item">
        <span class="category-name">${name.replace(/_/g, ' ')}</span>
        <span class="category-count">${count}</span>
      </div>
    `)
    .join('');

  return `
    <div class="panel-container">
      <div class="panel-header">
        <span class="panel-title">🔐 Secure Paste</span>
        <button class="close-button" id="close-btn">✕</button>
      </div>
      
      <div class="status-section">
        <div class="status-item">
          <span class="status-label">Status:</span>
          <span class="status-value ${statusClass}">${statusText}</span>
        </div>
        <div class="status-item">
          <span class="status-label">Secrets Found:</span>
          <span class="status-value ${hasSecrets ? 'warning' : ''}">${secretCount}</span>
        </div>
        ${categoryHTML ? `<div class="category-list">${categoryHTML}</div>` : ''}
      </div>
      
      <div class="actions-section">
        ${!isMasked && hasSecrets ? `
          <button class="action-button primary" id="secure-btn">
            🔒 Secure Input
          </button>
        ` : ''}
        
        ${isMasked ? `
          <button class="action-button secondary" id="restore-btn">
            🔄 Restore Original
          </button>
        ` : ''}
        
        ${!isMasked && !hasSecrets ? `
          <button class="action-button secondary" id="refresh-btn">
            🔍 Re-scan for Secrets
          </button>
        ` : ''}
        
        <div class="divider"></div>
        
        <button class="action-button secondary" id="disable-site-btn">
          ⚙️ Disable for This Site
        </button>
      </div>
    </div>
  `;
}

/**
 * Position panel relative to icon
 */
function positionPanel(panel: HTMLElement, iconContainer: HTMLElement): void {
  const iconRect = iconContainer.getBoundingClientRect();
  
  // Position below and to the left of the icon
  const top = iconRect.bottom + 8;
  const right = window.innerWidth - iconRect.right;
  
  panel.style.top = `${top}px`;
  panel.style.right = `${right}px`;
  
  // Ensure panel is not off-screen
  requestAnimationFrame(() => {
    const panelRect = panel.getBoundingClientRect();
    
    // Adjust if off bottom
    if (panelRect.bottom > window.innerHeight) {
      panel.style.top = `${iconRect.top - panelRect.height - 8}px`;
    }
    
    // Adjust if off left
    if (panelRect.left < 0) {
      panel.style.right = 'auto';
      panel.style.left = '8px';
    }
  });
}

/**
 * Handle secure button click
 */
async function handleSecureClick(): Promise<void> {
  if (!currentInput || !currentData) return;

  try {
    await maskInputValue(currentInput, currentData);
    
    // Update panel
    hideSecurePanel();
    
    // Icon will be updated by masking integration
  } catch (error) {
    console.error('[Secure Paste Inline] Masking error:', error);
  }
}

/**
 * Handle restore button click
 */
async function handleRestoreClick(): Promise<void> {
  if (!currentInput || !currentData) return;

  try {
    await restoreInputValue(currentInput, currentData);
    
    // Update panel
    hideSecurePanel();
    
    // Icon will be updated by restoration integration
  } catch (error) {
    console.error('[Secure Paste Inline] Restore error:', error);
  }
}

/**
 * Handle refresh button click
 */
async function handleRefreshClick(): Promise<void> {
  if (!currentInput || !currentData) return;

  try {
    // Trigger detection
    await triggerDetection(currentInput, currentData);
    
    // Refresh panel
    if (currentShadowRoot) {
      const container = currentShadowRoot.querySelector('.panel-container');
      if (container) {
        container.innerHTML = createPanelHTML(currentData).match(/<div class="panel-container">[\s\S]*<\/div>/)?.[0]?.replace(/<div class="panel-container">|<\/div>$/g, '') || '';
        attachPanelEventListeners(currentShadowRoot);
      }
    }
  } catch (error) {
    console.error('[Secure Paste Inline] Refresh error:', error);
  }
}

/**
 * Handle disable site button click
 */
async function handleDisableSiteClick(): Promise<void> {
  try {
    const hostname = window.location.hostname;
    await safeSendMessage({
      type: 'TOGGLE_SITE',
      data: { hostname, enabled: false },
    });
    
    // Hide panel
    hideSecurePanel();
    
    // Show notification
    alert(`Secure Paste disabled for ${hostname}. Refresh the page to apply changes.`);
  } catch (error) {
    console.error('[Secure Paste Inline] Disable site error:', error);
  }
}

/**
 * Attach event listeners to panel buttons
 */
function attachPanelEventListeners(shadowRoot: ShadowRoot): void {
  const closeBtn = shadowRoot.querySelector('#close-btn');
  const secureBtn = shadowRoot.querySelector('#secure-btn');
  const restoreBtn = shadowRoot.querySelector('#restore-btn');
  const refreshBtn = shadowRoot.querySelector('#refresh-btn');
  const disableSiteBtn = shadowRoot.querySelector('#disable-site-btn');

  closeBtn?.addEventListener('click', hideSecurePanel);
  secureBtn?.addEventListener('click', handleSecureClick);
  restoreBtn?.addEventListener('click', handleRestoreClick);
  refreshBtn?.addEventListener('click', handleRefreshClick);
  disableSiteBtn?.addEventListener('click', handleDisableSiteClick);
}

/**
 * Show secure panel
 */
export function showSecurePanel(input: HTMLElement, data: InputFieldData): void {
  // Hide existing panel
  hideSecurePanel();

  // Refresh detection before showing panel
  triggerDetection(input, data).then(() => {
    // Create panel container
    const panel = document.createElement('div');
    panel.id = 'secure-paste-panel';
    
    // Attach shadow root
    const shadowRoot = panel.attachShadow({ mode: 'open' });
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = getPanelStyles();
    shadowRoot.appendChild(style);
    
    // Add content
    const content = document.createElement('div');
    content.innerHTML = createPanelHTML(data);
    shadowRoot.appendChild(content);
    
    // Append to body
    document.body.appendChild(panel);
    
    // Position panel
    if (data.iconContainer) {
      positionPanel(panel, data.iconContainer);
    }
    
    // Attach event listeners
    attachPanelEventListeners(shadowRoot);
    
    // Store references
    currentPanel = panel;
    currentInput = input;
    currentData = data;
    currentShadowRoot = shadowRoot;
    
    // Close on outside click
    const closeOnOutsideClick = (e: MouseEvent) => {
      if (!panel.contains(e.target as Node) && 
          (!data.iconContainer || !data.iconContainer.contains(e.target as Node))) {
        hideSecurePanel();
      }
    };
    
    // Small delay to prevent immediate close
    setTimeout(() => {
      document.addEventListener('click', closeOnOutsideClick);
    }, 100);
    
    // Store cleanup
    panel.dataset.cleanup = 'true';
    (panel as any)._cleanup = () => {
      document.removeEventListener('click', closeOnOutsideClick);
    };
  });
}

/**
 * Hide secure panel
 */
export function hideSecurePanel(): void {
  if (currentPanel) {
    // Cleanup
    if ((currentPanel as any)._cleanup) {
      (currentPanel as any)._cleanup();
    }
    
    // Remove from DOM
    if (currentPanel.parentNode) {
      currentPanel.parentNode.removeChild(currentPanel);
    }
    
    currentPanel = null;
    currentInput = null;
    currentData = null;
    currentShadowRoot = null;
  }
}
