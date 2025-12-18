/**
 * Message passing between extension scripts
 */

export type MessageType =
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'TOGGLE_ENABLED'
  | 'GET_REGISTERED_SITES'
  | 'ADD_SITE'
  | 'REMOVE_SITE'
  | 'IS_SITE_REGISTERED'
  | 'INCREMENT_PROTECTED_COUNT'
  | 'INCREMENT_CATEGORY_COUNTS'
  | 'INCREMENT_SITE_COUNT'
  | 'INCREMENT_CUSTOM_PATTERN_COUNT'
  | 'GET_PROTECTED_COUNT'
  | 'RESET_PROTECTED_COUNT'
  | 'IS_SITE_ENABLED'
  | 'SETTINGS_CHANGED'
  | 'GET_CUSTOM_PATTERNS'
  | 'ADD_CUSTOM_PATTERN'
  | 'UPDATE_CUSTOM_PATTERN'
  | 'DELETE_CUSTOM_PATTERN'
  | 'TOGGLE_CUSTOM_PATTERN';

export interface Message {
  type: MessageType;
  data?: any;
}

export interface MessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Send message to background script
 */
export async function sendMessage(message: Message): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: MessageResponse) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message,
        });
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Send message to specific tab
 */
export async function sendMessageToTab(
  tabId: number,
  message: Message
): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response: MessageResponse) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message,
        });
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Broadcast message to all tabs
 */
export async function broadcastMessage(message: Message): Promise<void> {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Ignore errors for tabs that don't have content script
      });
    }
  }
}

/**
 * Listen for messages
 */
export function onMessage(
  callback: (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => void | boolean
): void {
  chrome.runtime.onMessage.addListener(callback);
}
