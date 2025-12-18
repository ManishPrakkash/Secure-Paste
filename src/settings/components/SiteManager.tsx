/**
 * Site management component for adding/removing custom sites
 */

import { useState } from 'react';

interface SiteManagerProps {
  sites: string[];
  onAdd: (hostname: string) => void;
  onRemove: (hostname: string) => void;
}

export function SiteManager({ sites, onAdd, onRemove }: SiteManagerProps) {
  const [newSite, setNewSite] = useState('');
  const [error, setError] = useState('');

  const presetSites = [
    'chatgpt.com',
    'claude.ai',
    'gemini.google.com',
    'www.perplexity.ai',
    'grok.com',
  ];

  function handleAdd() {
    const hostname = newSite.trim();

    if (!hostname) {
      setError('Please enter a hostname');
      return;
    }

    // Basic hostname validation
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/.test(hostname)) {
      setError('Invalid hostname format');
      return;
    }

    if (sites.includes(hostname)) {
      setError('Site already registered');
      return;
    }

    onAdd(hostname);
    setNewSite('');
    setError('');
  }

  function handleKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleAdd();
    }
  }

  return (
    <div className="space-y-4">
      {/* Add Site Section */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Add Custom Site
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSite}
            onChange={(e) => {
              setNewSite(e.target.value);
              setError('');
            }}
            onKeyPress={handleKeyPress}
            placeholder="example.com"
            className="flex-1 px-3 py-2 bg-bg-tertiary text-text-primary text-sm rounded-lg border border-border-default focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-accent-primary hover:bg-accent-primary/90 text-black text-sm font-medium rounded-lg transition-colors"
          >
            Add Site
          </button>
        </div>
        {error && (
          <p className="text-xs text-accent-danger mt-2">{error}</p>
        )}
      </div>

      {/* Sites List */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Registered Sites ({sites.length})
        </label>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sites.map((site) => {
            const isPreset = presetSites.includes(site);
            return (
              <div
                key={site}
                className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg border border-border-default"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-primary" />
                  <span className="text-sm text-text-primary">{site}</span>
                  {isPreset && (
                    <span className="text-xs px-2 py-0.5 rounded bg-accent-secondary/10 text-accent-secondary">
                      Preset
                    </span>
                  )}
                </div>
                {!isPreset && (
                  <button
                    onClick={() => onRemove(site)}
                    className="text-xs text-accent-danger hover:text-accent-danger/80 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
