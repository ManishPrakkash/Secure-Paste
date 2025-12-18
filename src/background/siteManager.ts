/**
 * Site registration management
 */

import { getSettings, saveSettings } from './storage';

/**
 * Get list of registered sites
 */
export async function getRegisteredSites(): Promise<string[]> {
  const settings = await getSettings();
  return settings.registeredSites;
}

/**
 * Check if a site is registered
 */
export async function isSiteRegistered(hostname: string): Promise<boolean> {
  const sites = await getRegisteredSites();
  return sites.includes(hostname);
}

/**
 * Add a site to registered list
 */
export async function addSite(hostname: string): Promise<boolean> {
  const settings = await getSettings();

  // Check if site already exists
  if (settings.registeredSites.includes(hostname)) {
    console.log(`[Secure Paste] Site already registered: ${hostname}`);
    return false;
  }

  // Add new site
  settings.registeredSites.push(hostname);
  await saveSettings(settings);
  console.log(`[Secure Paste] Site registered: ${hostname}`);
  return true;
}

/**
 * Remove a site from registered list
 */
export async function removeSite(hostname: string): Promise<boolean> {
  const settings = await getSettings();

  const index = settings.registeredSites.indexOf(hostname);
  if (index === -1) {
    console.log(`[Secure Paste] Site not found: ${hostname}`);
    return false;
  }

  settings.registeredSites.splice(index, 1);
  await saveSettings(settings);
  console.log(`[Secure Paste] Site removed: ${hostname}`);
  return true;
}

/**
 * Get current site hostname from tab
 */
export async function getCurrentSiteHostname(tabId?: number): Promise<string | null> {
  return new Promise((resolve) => {
    if (tabId) {
      chrome.tabs.get(tabId, (tab) => {
        if (tab.url) {
          const url = new URL(tab.url);
          resolve(url.hostname);
        } else {
          resolve(null);
        }
      });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          const url = new URL(tabs[0].url);
          resolve(url.hostname);
        } else {
          resolve(null);
        }
      });
    }
  });
}

/**
 * Check if current site is registered
 */
export async function isCurrentSiteRegistered(): Promise<boolean> {
  const hostname = await getCurrentSiteHostname();
  if (!hostname) return false;
  return isSiteRegistered(hostname);
}

/**
 * Register current site
 */
export async function registerCurrentSite(): Promise<boolean> {
  const hostname = await getCurrentSiteHostname();
  if (!hostname) {
    console.error('[Secure Paste] Cannot get current site hostname');
    return false;
  }
  return addSite(hostname);
}

/**
 * Unregister current site
 */
export async function unregisterCurrentSite(): Promise<boolean> {
  const hostname = await getCurrentSiteHostname();
  if (!hostname) {
    console.error('[Secure Paste] Cannot get current site hostname');
    return false;
  }
  return removeSite(hostname);
}
