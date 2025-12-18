/**
 * Toast notification for masked secrets
 * Shows in bottom-right corner
 */

let toastContainer: HTMLDivElement | null = null;
let activeToasts: Set<HTMLDivElement> = new Set();

/**
 * Initialize toast container
 */
function initToastContainer(): HTMLDivElement {
  if (toastContainer && document.body.contains(toastContainer)) {
    return toastContainer;
  }

  toastContainer = document.createElement('div');
  toastContainer.id = 'safe-paste-toast-container';
  toastContainer.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
  `;

  document.body.appendChild(toastContainer);
  return toastContainer;
}

/**
 * Show toast notification
 */
export function showToast(secretsCount: number): void {
  const container = initToastContainer();

  // Create toast element
  const toast = document.createElement('div');
  toast.style.cssText = `
    background: #262626;
    border: 1px solid #333333;
    border-radius: 8px;
    padding: 12px 16px;
    min-width: 280px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    pointer-events: auto;
    animation: slideIn 0.3s ease-out;
  `;

  // Add animation keyframes
  if (!document.getElementById('safe-paste-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'safe-paste-toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Icon (shield check)
  const icon = document.createElement('div');
  icon.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  `;
  icon.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  `;

  // Content
  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    min-width: 0;
  `;

  const title = document.createElement('div');
  title.style.cssText = `
    color: #FAFAFA;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 2px;
  `;

  // Create count span with accent color
  const countSpan = document.createElement('span');
  countSpan.textContent = `${secretsCount} secret${secretsCount > 1 ? 's' : ''}`;
  countSpan.style.cssText = `
    color: #22C55E;
    font-weight: 600;
  `;

  title.appendChild(countSpan);
  title.appendChild(document.createTextNode(' protected'));

  const description = document.createElement('div');
  description.textContent = 'Sensitive data masked automatically';
  description.style.cssText = `
    color: #A3A3A3;
    font-size: 12px;
  `;

  content.appendChild(title);
  content.appendChild(description);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18"/>
      <path d="m6 6 12 12"/>
    </svg>
  `;
  closeBtn.style.cssText = `
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 0.5;
    transition: opacity 0.2s;
  `;
  closeBtn.onmouseenter = () => (closeBtn.style.opacity = '1');
  closeBtn.onmouseleave = () => (closeBtn.style.opacity = '0.5');
  closeBtn.onclick = () => removeToast(toast);

  // Assemble toast
  toast.appendChild(icon);
  toast.appendChild(content);
  toast.appendChild(closeBtn);

  container.appendChild(toast);
  activeToasts.add(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (activeToasts.has(toast)) {
      removeToast(toast);
    }
  }, 4000);
}

/**
 * Remove toast with animation
 */
function removeToast(toast: HTMLDivElement): void {
  if (!activeToasts.has(toast)) return;

  toast.style.animation = 'slideOut 0.3s ease-in';

  setTimeout(() => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
    activeToasts.delete(toast);

    // Clean up container if empty
    if (activeToasts.size === 0 && toastContainer && toastContainer.parentElement) {
      toastContainer.parentElement.removeChild(toastContainer);
      toastContainer = null;
    }
  }, 300);
}

/**
 * Clean up all toasts
 */
export function cleanupToasts(): void {
  activeToasts.forEach((toast) => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  });
  activeToasts.clear();

  if (toastContainer && toastContainer.parentElement) {
    toastContainer.parentElement.removeChild(toastContainer);
    toastContainer = null;
  }
}
