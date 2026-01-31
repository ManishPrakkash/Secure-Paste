/**
 * Site adapters for AI chat platforms
 * Defines input field selectors and positioning logic for each platform
 */

import type { SiteAdapter } from '../inline-ui/types';

/**
 * ChatGPT (chatgpt.com, chat.openai.com)
 */
const chatGPTAdapter: SiteAdapter = {
  hostname: 'chatgpt.com',
  selectors: {
    input: [
      'div.ProseMirror#prompt-textarea[contenteditable="true"]',
      '#prompt-textarea[contenteditable="true"]',
      'div.ProseMirror[contenteditable="true"]',
      'textarea#prompt-textarea',
      '[contenteditable="true"][role="textbox"]',
    ],
  },
  shouldAttach: (input) => {
    // Only attach to main chat input, not settings or other inputs
    const isMainChat = input.closest('main') !== null || input.id === 'prompt-textarea';
    return isMainChat;
  },
};

/**
 * ChatGPT (legacy chat.openai.com domain)
 */
const chatGPTLegacyAdapter: SiteAdapter = {
  hostname: 'chat.openai.com',
  selectors: {
    input: [
      'div.ProseMirror#prompt-textarea[contenteditable="true"]',
      '#prompt-textarea[contenteditable="true"]',
      'div.ProseMirror[contenteditable="true"]',
      'textarea#prompt-textarea',
      '[contenteditable="true"][role="textbox"]',
    ],
  },
  shouldAttach: (input) => {
    const isMainChat = input.closest('main') !== null || input.id === 'prompt-textarea';
    return isMainChat;
  },
};

/**
 * Claude (claude.ai)
 */
const claudeAdapter: SiteAdapter = {
  hostname: 'claude.ai',
  selectors: {
    input: [
      '[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"].ProseMirror',
    ],
  },
  shouldAttach: (input) => {
    // Only attach to chat input area
    return input.closest('fieldset') !== null || input.hasAttribute('aria-label');
  },
};

/**
 * Google Bard/Gemini (gemini.google.com, bard.google.com)
 */
const geminiAdapter: SiteAdapter = {
  hostname: 'gemini.google.com',
  selectors: {
    input: [
      '[contenteditable="true"].ql-editor',
      'div[contenteditable="true"][role="textbox"]',
    ],
  },
};

const bardAdapter: SiteAdapter = {
  hostname: 'bard.google.com',
  selectors: {
    input: [
      '[contenteditable="true"].ql-editor',
      'div[contenteditable="true"][role="textbox"]',
    ],
  },
};

/**
 * Perplexity (perplexity.ai)
 */
const perplexityAdapter: SiteAdapter = {
  hostname: 'perplexity.ai',
  selectors: {
    input: [
      'textarea[placeholder*="Ask"]',
      '[contenteditable="true"]',
    ],
  },
};

/**
 * Microsoft Copilot (copilot.microsoft.com)
 */
const copilotAdapter: SiteAdapter = {
  hostname: 'copilot.microsoft.com',
  selectors: {
    input: [
      'textarea[aria-label*="Ask"]',
      '[contenteditable="true"][role="textbox"]',
    ],
  },
};

/**
 * Poe (poe.com)
 */
const poeAdapter: SiteAdapter = {
  hostname: 'poe.com',
  selectors: {
    input: [
      'textarea[class*="GrowingTextArea"]',
      'textarea[placeholder*="Talk"]',
    ],
  },
};

/**
 * Character.AI (character.ai)
 */
const characterAIAdapter: SiteAdapter = {
  hostname: 'character.ai',
  selectors: {
    input: [
      'textarea[placeholder*="Message"]',
      '[contenteditable="true"]',
    ],
  },
};

/**
 * HuggingChat (huggingface.co)
 */
const huggingChatAdapter: SiteAdapter = {
  hostname: 'huggingface.co',
  selectors: {
    input: [
      'textarea[name="message"]',
      'textarea[placeholder*="Ask"]',
    ],
  },
  shouldAttach: (_input) => {
    // Only attach if we're in the chat interface
    return window.location.pathname.includes('/chat');
  },
};

/**
 * All supported site adapters
 */
export const SITE_ADAPTERS: SiteAdapter[] = [
  chatGPTAdapter,
  chatGPTLegacyAdapter,
  claudeAdapter,
  geminiAdapter,
  bardAdapter,
  perplexityAdapter,
  copilotAdapter,
  poeAdapter,
  characterAIAdapter,
  huggingChatAdapter,
];

/**
 * Get adapter for current site
 */
export function getCurrentSiteAdapter(): SiteAdapter | null {
  const hostname = window.location.hostname;
  return SITE_ADAPTERS.find(adapter => hostname.includes(adapter.hostname)) || null;
}
