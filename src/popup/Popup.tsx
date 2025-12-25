/**
 * Main popup component
 */

import { useEffect, useState } from 'react';
import { Toggle } from './components/Toggle';
import { Counter } from './components/Counter';
import { SiteStatus } from './components/SiteStatus';

interface Settings {
  enabled: boolean;
  protectedCount: number;
}

export function Popup() {
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    protectedCount: 0,
  });
  const [hostname, setHostname] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSiteEnabled, setIsSiteEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Get settings
      const settingsResponse = await chrome.runtime.sendMessage({
        type: 'GET_SETTINGS',
      });

      if (settingsResponse.success) {
        setSettings({
          enabled: settingsResponse.data.enabled,
          protectedCount: settingsResponse.data.protectedCount,
        });
      }

      // Get current tab hostname
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url) {
        const url = new URL(tab.url);
        setHostname(url.hostname);

        // Check if site is registered
        const registeredResponse = await chrome.runtime.sendMessage({
          type: 'IS_SITE_REGISTERED',
          data: { hostname: url.hostname },
        });

        if (registeredResponse.success) {
          setIsRegistered(registeredResponse.data);
        }

        // Check if site is enabled (site-specific setting)
        const siteEnabledResponse = await chrome.runtime.sendMessage({
          type: 'IS_SITE_ENABLED',
          data: { hostname: url.hostname },
        });

        if (siteEnabledResponse.success) {
          setIsSiteEnabled(siteEnabledResponse.data.enabled);
        }
      }
    } catch (error) {
      console.error('[Secure Paste] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TOGGLE_ENABLED',
      });

      if (response.success) {
        setSettings((prev) => ({ ...prev, enabled: response.data }));

        // Notify all tabs about global setting change
        chrome.runtime.sendMessage({
          type: 'SETTINGS_CHANGED',
          data: { global: true },
        }).catch(() => {
          // Ignore errors
        });
      }
    } catch (error) {
      console.error('[Secure Paste] Error toggling enabled:', error);
    }
  }

  function openSettings() {
    chrome.runtime.openOptionsPage();
  }

  if (loading) {
    return (
      <div className="w-80 p-4 bg-bg-primary">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 p-4 bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <img src="/icons/icon128.png" alt="Secure Paste" className="w-8 h-8" />
          <h1 className="text-lg font-semibold text-text-primary">Secure Paste</h1>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="mb-4 p-3 bg-bg-secondary rounded-lg border border-border-default">
        <Toggle enabled={settings.enabled} onChange={handleToggle} label="Global Protection" />
      </div>

      {/* Current Site Status */}
      <div className="mb-4">
        <SiteStatus
          hostname={hostname}
          isRegistered={isRegistered}
          isSiteEnabled={isSiteEnabled}
        />
      </div>

      {/* Protected Counter */}
      <div className="mb-4">
        <Counter count={settings.protectedCount} />
      </div>

      {/* Settings Link */}
      <button
        onClick={openSettings}
        className="w-full py-2 px-3 bg-bg-tertiary hover:bg-border-subtle text-text-primary text-sm rounded-lg border border-border-default transition-colors"
      >
        Open Settings
      </button>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border-subtle space-y-2">
        <p className="text-xs text-text-muted text-center">
          100% Local Processing • Zero Cloud
        </p>
        <div className="flex items-center justify-center gap-3 text-xs text-text-muted">
          <span>v1.0.0</span>
          <div className="flex items-center gap-2">
            {/* GitHub Repository Link */}
            <a
              href="https://github.com/ManishPrakkash/Secure-Paste.git"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative hover:text-text-secondary transition-colors inline-flex"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                <path d="M9 18c-4.51 2-5-2-7-2"></path>
              </svg>

              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-bg-elevated text-text-primary text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-border-default">
                View on GitHub
              </span>
            </a>

            <a
              href="https://github.com/ManishPrakkash"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative hover:text-accent-danger transition-colors inline-flex"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
              </svg>
              {/* Tooltip */}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-bg-elevated text-text-primary text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-border-default">
                GitHub
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
