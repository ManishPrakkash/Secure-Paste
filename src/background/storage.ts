/**
 * Chrome Storage API wrapper for settings persistence
 */

import type { CustomPattern } from '@/types/patterns';

export interface AppSettings {
  enabled: boolean;
  enableRestoration: boolean; // Pro feature: restore originals on copy
  categories: {
    cloud_keys: boolean;
    api_tokens: boolean;
    private_keys: boolean;
    passwords: boolean;
    database: boolean;
    network: boolean;
    pii: boolean;
    custom: boolean;
  };
  categoryCounts: {
    cloud_keys: number;
    api_tokens: number;
    private_keys: number;
    passwords: number;
    database: number;
    network: number;
    pii: number;
    custom: number;
  };
  registeredSites: string[];
  siteSettings: {
    [hostname: string]: {
      enabled: boolean;
      protectedCount: number;
    };
  };
  protectedCount: number;
  customPatterns?: CustomPattern[];
}

const DEFAULT_SETTINGS: AppSettings = {
  enabled: true,
  enableRestoration: true, // Free feature - enabled by default
  categories: {
    cloud_keys: true,
    api_tokens: true,
    private_keys: true,
    passwords: true,
    database: true,
    network: false, // Optional category, disabled by default
    pii: false, // Optional category, disabled by default
    custom: true, // Custom patterns enabled by default
  },
  categoryCounts: {
    cloud_keys: 0,
    api_tokens: 0,
    private_keys: 0,
    passwords: 0,
    database: 0,
    network: 0,
    pii: 0,
    custom: 0,
  },
  registeredSites: [
    'chatgpt.com',
    'claude.ai',
    'gemini.google.com',
    'www.perplexity.ai',
    'grok.com',
  ],
  siteSettings: {
    'chatgpt.com': { enabled: true, protectedCount: 0 },
    'claude.ai': { enabled: true, protectedCount: 0 },
    'gemini.google.com': { enabled: true, protectedCount: 0 },
    'www.perplexity.ai': { enabled: true, protectedCount: 0 },
    'grok.com': { enabled: true, protectedCount: 0 },
  },
  protectedCount: 0,
  customPatterns: [],
};

/**
 * Get all settings from Chrome storage
 */
export async function getSettings(): Promise<AppSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get('settings', (result) => {
      if (result.settings) {
        const settings = result.settings as AppSettings;

        // Migration: Add enableRestoration if missing
        if (settings.enableRestoration === undefined) {
          settings.enableRestoration = true; // Enable by default
        }

        resolve(settings);
      } else {
        resolve(DEFAULT_SETTINGS);
      }
    });
  });
}

/**
 * Save settings to Chrome storage
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ settings }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Update specific setting field
 */
export async function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  const settings = await getSettings();
  settings[key] = value;
  await saveSettings(settings);
}

/**
 * Initialize default settings on first install
 */
export async function initializeSettings(): Promise<void> {
  const settings = await getSettings();

  // Only initialize if no settings exist
  if (!settings.registeredSites || settings.registeredSites.length === 0) {
    await saveSettings(DEFAULT_SETTINGS);
    console.log('[Secure Paste] Default settings initialized');
  }
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<void> {
  await saveSettings(DEFAULT_SETTINGS);
  console.log('[Secure Paste] Settings reset to defaults');
}

/**
 * Get enabled status
 */
export async function isEnabled(): Promise<boolean> {
  const settings = await getSettings();
  return settings.enabled;
}

/**
 * Toggle enabled status
 */
export async function toggleEnabled(): Promise<boolean> {
  const settings = await getSettings();
  settings.enabled = !settings.enabled;
  await saveSettings(settings);
  return settings.enabled;
}

/**
 * Increment protected secrets counter
 */
export async function incrementProtectedCount(count: number = 1): Promise<number> {
  const settings = await getSettings();
  settings.protectedCount += count;
  await saveSettings(settings);
  return settings.protectedCount;
}

/**
 * Get protected secrets counter
 */
export async function getProtectedCount(): Promise<number> {
  const settings = await getSettings();
  return settings.protectedCount;
}

/**
 * Reset protected secrets counter
 */
export async function resetProtectedCount(): Promise<void> {
  await updateSetting('protectedCount', 0);
}

/**
 * Check if masking is enabled for specific site
 */
export async function isSiteEnabled(hostname: string): Promise<boolean> {
  const settings = await getSettings();

  // Check if site is registered
  if (!settings.registeredSites.includes(hostname)) {
    return false;
  }

  // Check global enabled status
  if (!settings.enabled) {
    return false;
  }

  // Check site-specific settings
  if (settings.siteSettings && settings.siteSettings[hostname]) {
    return settings.siteSettings[hostname].enabled;
  }

  // Default to enabled if no site-specific setting
  return true;
}

/**
 * Toggle site-specific enabled status
 */
export async function toggleSiteEnabled(hostname: string): Promise<boolean> {
  const settings = await getSettings();

  // Initialize siteSettings if not exists
  if (!settings.siteSettings) {
    settings.siteSettings = {};
  }

  // Initialize site setting if not exists
  if (!settings.siteSettings[hostname]) {
    settings.siteSettings[hostname] = { enabled: true, protectedCount: 0 };
  }

  // Toggle the setting
  settings.siteSettings[hostname].enabled = !settings.siteSettings[hostname].enabled;
  await saveSettings(settings);

  return settings.siteSettings[hostname].enabled;
}

/**
 * Update site-specific enabled status
 */
export async function updateSiteEnabled(hostname: string, enabled: boolean): Promise<void> {
  const settings = await getSettings();

  // Initialize siteSettings if not exists
  if (!settings.siteSettings) {
    settings.siteSettings = {};
  }

  // Update or create site setting
  const existingCount = settings.siteSettings[hostname]?.protectedCount || 0;
  settings.siteSettings[hostname] = { enabled, protectedCount: existingCount };
  await saveSettings(settings);
}

/**
 * Increment site-specific protected count
 */
export async function incrementSiteProtectedCount(hostname: string, count: number = 1): Promise<void> {
  const settings = await getSettings();

  // Initialize siteSettings if not exists
  if (!settings.siteSettings) {
    settings.siteSettings = {};
  }

  // Try to find matching site (with or without www prefix)
  let matchedHostname = hostname;

  // Check if hostname exists in siteSettings
  if (!settings.siteSettings[hostname]) {
    // Try with www prefix
    const withWww = hostname.startsWith('www.') ? hostname : `www.${hostname}`;
    const withoutWww = hostname.startsWith('www.') ? hostname.substring(4) : hostname;

    if (settings.siteSettings[withWww]) {
      matchedHostname = withWww;
    } else if (settings.siteSettings[withoutWww]) {
      matchedHostname = withoutWww;
    } else {
      // Initialize new site setting
      settings.siteSettings[hostname] = { enabled: true, protectedCount: 0 };
    }
  }

  // Initialize protectedCount if not exists (migration)
  if (typeof settings.siteSettings[matchedHostname].protectedCount !== 'number') {
    settings.siteSettings[matchedHostname].protectedCount = 0;
  }

  // Increment site-specific count
  settings.siteSettings[matchedHostname].protectedCount += count;
  await saveSettings(settings);
}

/**
 * Increment category-specific counters
 */
export async function incrementCategoryCounts(
  categoryCounts: Record<string, number>
): Promise<void> {
  const settings = await getSettings();

  // Initialize categoryCounts if not exists (for migration)
  if (!settings.categoryCounts) {
    settings.categoryCounts = {
      cloud_keys: 0,
      api_tokens: 0,
      private_keys: 0,
      passwords: 0,
      database: 0,
      network: 0,
      pii: 0,
      custom: 0,
    };
  }

  // Increment each category count
  for (const [category, count] of Object.entries(categoryCounts)) {
    if (settings.categoryCounts[category as keyof typeof settings.categoryCounts] !== undefined) {
      settings.categoryCounts[category as keyof typeof settings.categoryCounts] += count;
    }
  }

  await saveSettings(settings);
}

/**
 * Generate unique ID for custom pattern
 */
function generatePatternId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get all custom patterns
 */
export async function getCustomPatterns(): Promise<CustomPattern[]> {
  const settings = await getSettings();
  return settings.customPatterns || [];
}

/**
 * Add new custom pattern with validation
 */
export async function addCustomPattern(
  pattern: Omit<CustomPattern, 'id' | 'createdAt' | 'updatedAt'>
): Promise<CustomPattern> {
  const settings = await getSettings();

  // Initialize customPatterns if not exists
  if (!settings.customPatterns) {
    settings.customPatterns = [];
  }

  // Validate regex pattern
  try {
    new RegExp(pattern.regex, pattern.flags || 'g');
  } catch (error) {
    throw new Error('Invalid regex pattern');
  }

  // Check for duplicate pattern names
  const existingPattern = settings.customPatterns.find(
    (p) => p.name.toLowerCase() === pattern.name.toLowerCase()
  );
  if (existingPattern) {
    throw new Error(`Pattern with name "${pattern.name}" already exists`);
  }

  // Check for duplicate regex patterns
  const duplicateRegex = settings.customPatterns.find(
    (p) => p.regex === pattern.regex && p.flags === pattern.flags
  );
  if (duplicateRegex) {
    throw new Error('Pattern with same regex already exists');
  }

  // Check for duplicate replacement text
  const duplicateReplacement = settings.customPatterns.find(
    (p) => p.replacement === pattern.replacement
  );
  if (duplicateReplacement) {
    throw new Error(`Replacement text "${pattern.replacement}" is already used by "${duplicateReplacement.name}"`);
  }

  // Create new pattern
  const newPattern: CustomPattern = {
    ...pattern,
    id: generatePatternId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  settings.customPatterns.push(newPattern);
  await saveSettings(settings);

  return newPattern;
}

/**
 * Update existing custom pattern
 */
export async function updateCustomPattern(
  id: string,
  updates: Partial<Omit<CustomPattern, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<CustomPattern> {
  const settings = await getSettings();

  if (!settings.customPatterns) {
    throw new Error('No custom patterns found');
  }

  const patternIndex = settings.customPatterns.findIndex((p) => p.id === id);
  if (patternIndex === -1) {
    throw new Error('Pattern not found');
  }

  const pattern = settings.customPatterns[patternIndex];

  // Validate regex if being updated
  if (updates.regex !== undefined || updates.flags !== undefined) {
    const regex = updates.regex !== undefined ? updates.regex : pattern.regex;
    const flags = updates.flags !== undefined ? updates.flags : pattern.flags;
    try {
      new RegExp(regex, flags || 'g');
    } catch (error) {
      throw new Error('Invalid regex pattern');
    }
  }

  // Check for duplicate name if being updated
  if (updates.name !== undefined && updates.name !== pattern.name) {
    const existingPattern = settings.customPatterns.find(
      (p) => p.id !== id && p.name.toLowerCase() === updates.name!.toLowerCase()
    );
    if (existingPattern) {
      throw new Error(`Pattern with name "${updates.name}" already exists`);
    }
  }

  // Check for duplicate regex if being updated
  if (updates.regex !== undefined || updates.flags !== undefined) {
    const regex = updates.regex !== undefined ? updates.regex : pattern.regex;
    const flags = updates.flags !== undefined ? updates.flags : pattern.flags;
    const duplicateRegex = settings.customPatterns.find(
      (p) => p.id !== id && p.regex === regex && p.flags === flags
    );
    if (duplicateRegex) {
      throw new Error('Pattern with same regex already exists');
    }
  }

  // Check for duplicate replacement text if being updated
  if (updates.replacement !== undefined && updates.replacement !== pattern.replacement) {
    const duplicateReplacement = settings.customPatterns.find(
      (p) => p.id !== id && p.replacement === updates.replacement
    );
    if (duplicateReplacement) {
      throw new Error(`Replacement text "${updates.replacement}" is already used by "${duplicateReplacement.name}"`);
    }
  }

  // Update pattern
  const updatedPattern: CustomPattern = {
    ...pattern,
    ...updates,
    updatedAt: Date.now(),
  };

  settings.customPatterns[patternIndex] = updatedPattern;
  await saveSettings(settings);

  return updatedPattern;
}

/**
 * Delete custom pattern
 */
export async function deleteCustomPattern(id: string): Promise<void> {
  const settings = await getSettings();

  if (!settings.customPatterns) {
    throw new Error('No custom patterns found');
  }

  const patternIndex = settings.customPatterns.findIndex((p) => p.id === id);
  if (patternIndex === -1) {
    throw new Error('Pattern not found');
  }

  settings.customPatterns.splice(patternIndex, 1);
  await saveSettings(settings);
}

/**
 * Toggle custom pattern enabled status
 */
export async function toggleCustomPattern(id: string): Promise<boolean> {
  const settings = await getSettings();

  if (!settings.customPatterns) {
    throw new Error('No custom patterns found');
  }

  const pattern = settings.customPatterns.find((p) => p.id === id);
  if (!pattern) {
    throw new Error('Pattern not found');
  }

  pattern.enabled = !pattern.enabled;
  pattern.updatedAt = Date.now();
  await saveSettings(settings);

  return pattern.enabled;
}

/**
 * Increment custom pattern masked count
 */
export async function incrementCustomPatternCount(
  patternId: string,
  count: number = 1
): Promise<void> {
  const settings = await getSettings();

  if (!settings.customPatterns) {
    return;
  }

  const pattern = settings.customPatterns.find((p) => p.id === patternId);
  if (!pattern) {
    return;
  }

  // Initialize maskedCount if not exists
  if (pattern.maskedCount === undefined) {
    pattern.maskedCount = 0;
  }

  pattern.maskedCount += count;
  pattern.updatedAt = Date.now();
  await saveSettings(settings);
}
