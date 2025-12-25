/**
 * Main settings page component
 */

import { useEffect, useState } from 'react';
import { CategoryToggle } from './components/CategoryToggle';
import CustomPatternManager from './components/CustomPatternManager';

interface Categories {
  cloud_keys: boolean;
  api_tokens: boolean;
  private_keys: boolean;
  passwords: boolean;
  database: boolean;
  network: boolean;
  pii: boolean;
}

interface SiteSettings {
  [hostname: string]: {
    enabled: boolean;
    protectedCount: number;
  };
}

interface CategoryCounts {
  cloud_keys: number;
  api_tokens: number;
  private_keys: number;
  passwords: number;
  database: number;
  network: number;
  pii: number;
}

interface Settings {
  enabled: boolean;
  enableRestoration: boolean;
  categories: Categories;
  categoryCounts: CategoryCounts;
  registeredSites: string[];
  siteSettings: SiteSettings;
  protectedCount: number;
}

interface PatternDetail {
  name: string;
  pattern: string;
  maskedAs: string;
}

interface CategoryInfo {
  name: string;
  label: string;
  description: string;
  patterns: PatternDetail[];
}

const CATEGORY_INFO: CategoryInfo[] = [
  {
    name: 'cloud_keys',
    label: 'Cloud Provider Keys',
    description: 'AWS, Google Cloud, Azure credentials and access keys',
    patterns: [
      {
        name: 'AWS Access Key ID',
        pattern: 'Starts with AKIA, ASIA, AGPA, AIDA, AROA, AIPA, ANPA, ANVA, or A3T + 16 uppercase alphanumeric characters',
        maskedAs: '[AWS_KEY]',
      },
      {
        name: 'Google Cloud API Key',
        pattern: 'Starts with AIza + 35 characters (letters, numbers, -, _)',
        maskedAs: '[GOOGLE_KEY]',
      },
      {
        name: 'Azure Connection String',
        pattern: 'Full Azure connection string format with DefaultEndpointsProtocol, AccountName, AccountKey, EndpointSuffix',
        maskedAs: '[AZURE_CONN]',
      },
    ],
  },
  {
    name: 'api_tokens',
    label: 'API Tokens',
    description: 'GitHub, GitLab, NPM, OpenAI, Stripe, SendGrid, Slack tokens',
    patterns: [
      {
        name: 'GitHub Token',
        pattern: 'Starts with ghp_, gho_, ghu_, ghs_, or ghr_ + 20+ characters',
        maskedAs: '[GITHUB_TOKEN]',
      },
      {
        name: 'GitLab Token',
        pattern: 'Starts with glpat- + 20+ characters',
        maskedAs: '[GITLAB_TOKEN]',
      },
      {
        name: 'NPM Token',
        pattern: 'Starts with npm_ + 30+ characters',
        maskedAs: '[NPM_TOKEN]',
      },
      {
        name: 'JWT Token',
        pattern: 'Starts with eyJ + two periods separating three base64 segments',
        maskedAs: '[JWT]',
      },
      {
        name: 'Bearer Token',
        pattern: 'Bearer keyword followed by JWT format token',
        maskedAs: 'Bearer [TOKEN]',
      },
      {
        name: 'OpenAI API Key',
        pattern: 'Starts with sk- + 20+ characters',
        maskedAs: '[OPENAI_KEY]',
      },
      {
        name: 'Stripe API Key',
        pattern: 'Starts with sk_live_ or sk_test_ + 20+ characters',
        maskedAs: '[STRIPE_KEY]',
      },
      {
        name: 'SendGrid API Key',
        pattern: 'Starts with SG. + two segments separated by periods',
        maskedAs: '[SENDGRID_KEY]',
      },
      {
        name: 'Slack Webhook',
        pattern: 'URL: https://hooks.slack.com/services/ or https://api.slack.com/webhook/',
        maskedAs: '[SLACK_WEBHOOK]',
      },
      {
        name: 'Discord Webhook',
        pattern: 'URL: https://discord.com/api/webhooks/{id}/{token}',
        maskedAs: '[DISCORD_WEBHOOK]',
      },
      {
        name: 'Slack Bot Token',
        pattern: 'Starts with xoxb-, xoxa-, xoxp-, xoxr-, or xoxs- + numbers and characters',
        maskedAs: '[SLACK_TOKEN]',
      },
    ],
  },
  {
    name: 'private_keys',
    label: 'Private Keys & Certificates',
    description: 'RSA, EC, SSH, PGP private keys and certificates',
    patterns: [
      {
        name: 'RSA Private Key',
        pattern: '-----BEGIN RSA PRIVATE KEY----- ... -----END RSA PRIVATE KEY-----',
        maskedAs: '[RSA_KEY]',
      },
      {
        name: 'EC Private Key',
        pattern: '-----BEGIN EC PRIVATE KEY----- ... -----END EC PRIVATE KEY-----',
        maskedAs: '[EC_KEY]',
      },
      {
        name: 'SSH Private Key',
        pattern: '-----BEGIN OPENSSH PRIVATE KEY----- ... -----END OPENSSH PRIVATE KEY-----',
        maskedAs: '[SSH_KEY]',
      },
      {
        name: 'PGP Private Key',
        pattern: '-----BEGIN PGP PRIVATE KEY BLOCK----- ... -----END PGP PRIVATE KEY BLOCK-----',
        maskedAs: '[PGP_KEY]',
      },
      {
        name: 'Generic Private Key',
        pattern: '-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----',
        maskedAs: '[PRIVATE_KEY]',
      },
      {
        name: 'Certificate',
        pattern: '-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----',
        maskedAs: '[CERTIFICATE]',
      },
    ],
  },
  {
    name: 'passwords',
    label: 'Passwords & Authentication',
    description: 'Password fields, environment variables, CLI authentication',
    patterns: [
      {
        name: 'Password Field',
        pattern: 'password, passwd, or pwd variable followed by = or : and 6+ characters',
        maskedAs: '[PASS]',
      },
      {
        name: 'Environment Password',
        pattern: 'POSTGRES_PASSWORD, DB_PASSWORD, MYSQL_PASSWORD, JWT_SECRET, SESSION_SECRET variables',
        maskedAs: '[PASS] or [SECRET]',
      },
      {
        name: 'MySQL CLI Password',
        pattern: 'mysql command with -p flag followed immediately by password',
        maskedAs: 'mysql -p[PASS]',
      },
      {
        name: 'Curl Basic Auth',
        pattern: 'curl command with -u flag followed by user:password',
        maskedAs: 'curl -u user:[PASS]',
      },
      {
        name: 'Basic Auth URL',
        pattern: 'URL with embedded credentials: https://user:password@host',
        maskedAs: 'https://user:[PASS]@',
      },
    ],
  },
  {
    name: 'database',
    label: 'Database Connections',
    description: 'Database URLs, JDBC connections, connection strings',
    patterns: [
      {
        name: 'Database Connection URL',
        pattern: 'postgres://, postgresql://, mysql://, mongodb://, redis:// URLs with credentials',
        maskedAs: 'protocol://[USER]:[PASS]@[HOST]',
      },
      {
        name: 'JDBC URL',
        pattern: 'jdbc:postgresql://, jdbc:mysql://, jdbc:oracle://, jdbc:sqlserver:// URLs',
        maskedAs: '[JDBC_URL]',
      },
    ],
  },
  {
    name: 'network',
    label: 'Network & Endpoints (Optional)',
    description: 'IP addresses, URLs, domains, API endpoints',
    patterns: [
      {
        name: 'Full URL',
        pattern: 'http:// or https:// followed by domain and optional path',
        maskedAs: '[URL]',
      },
      {
        name: 'Quoted Domain',
        pattern: 'Quoted domain names with TLDs: com, org, net, io, co, kr, jp, de, uk, local, internal',
        maskedAs: '[DOMAIN]',
      },
      {
        name: 'HTTP Endpoint',
        pattern: 'HTTP method (GET, POST, PUT, DELETE, PATCH) followed by path',
        maskedAs: 'METHOD [ENDPOINT]',
      },
      {
        name: 'IPv4 Address',
        pattern: 'Four octets (0-255) separated by periods (excludes 127.0.0.1)',
        maskedAs: '[IP]',
      },
    ],
  },
  {
    name: 'pii',
    label: 'Personal Information (Optional)',
    description: 'Email addresses and other personally identifiable information',
    patterns: [
      {
        name: 'Email Address',
        pattern: 'RFC 5322 compliant email format: local@domain.tld',
        maskedAs: '[EMAIL]',
      },
    ],
  },
];

export function Settings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SETTINGS',
      });

      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('[Secure Paste] Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCategoryToggle(name: string, enabled: boolean) {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      categories: {
        ...settings.categories,
        [name]: enabled,
      },
    };

    setSettings(updatedSettings);
    await saveSettings(updatedSettings);

    // Notify all tabs to reload their settings
    chrome.runtime.sendMessage({
      type: 'SETTINGS_CHANGED',
      data: { category: name },
    }).catch(() => {
      // Ignore errors
    });
  }

  async function handleSiteToggle(hostname: string, enabled: boolean) {
    if (!settings) return;

    // Preserve existing protectedCount
    const existingCount = settings.siteSettings[hostname]?.protectedCount || 0;

    const updatedSettings = {
      ...settings,
      siteSettings: {
        ...settings.siteSettings,
        [hostname]: { enabled, protectedCount: existingCount },
      },
    };

    setSettings(updatedSettings);
    await saveSettings(updatedSettings);

    // Notify all tabs to reload their settings
    chrome.runtime.sendMessage({
      type: 'SETTINGS_CHANGED',
      data: { hostname },
    }).catch(() => {
      // Ignore errors
    });
  }

  async function handleRestorationToggle(enabled: boolean) {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      enableRestoration: enabled,
    };

    setSettings(updatedSettings);
    await saveSettings(updatedSettings);

    // Notify all tabs to reload their settings
    chrome.runtime.sendMessage({
      type: 'SETTINGS_CHANGED',
      data: { restoration: enabled },
    }).catch(() => {
      // Ignore errors
    });
  }

  async function saveSettings(updatedSettings: Settings) {
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        data: updatedSettings,
      });
    } catch (error) {
      console.error('[Secure Paste] Error saving settings:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary p-8">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-bg-primary p-8">
        <div className="text-center py-16">
          <p className="text-text-secondary">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent-primary flex items-center justify-center">
              <svg
                className="w-6 h-6 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
          </div>
          <p className="text-sm text-text-secondary">
            Configure pattern detection and site management
          </p>
        </div>

        {/* Statistics */}
        <div className="mb-8 p-6 bg-bg-secondary rounded-lg border border-border-default">
          <p className="text-sm text-text-secondary">Total Secrets Protected</p>
          <p className="text-3xl font-semibold text-accent-primary mt-1">
            {settings.protectedCount.toLocaleString()}
          </p>
        </div>

        {/* Restoration Feature Toggle */}
        <div className="mb-8 p-5 bg-bg-secondary rounded-lg border border-border-default">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 group relative">
              <h3 className="text-sm font-medium text-text-primary">
                Enable Restoration on Copy
              </h3>
              <div className="relative">
                <svg
                  className="w-4 h-4 text-text-muted hover:text-text-secondary cursor-help transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4m0-4h.01" />
                </svg>
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-80 p-4 bg-bg-elevated rounded-lg border border-border-default shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                  <p className="text-xs text-text-secondary mb-3">
                    Automatically restore masked values to originals when copying text from AI platforms
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleRestorationToggle(!settings.enableRestoration)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enableRestoration ? 'bg-accent-primary' : 'bg-border-strong'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enableRestoration ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Custom Patterns Section */}
        <div className="mb-8">
          <div className="p-6 bg-bg-secondary rounded-lg border border-border-default">
            <CustomPatternManager onPatternsChange={loadSettings} />
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Pattern Categories */}
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              Pattern Categories
            </h2>
            <div className="space-y-3">
              {CATEGORY_INFO.map((category) => (
                <CategoryToggle
                  key={category.name}
                  name={category.name}
                  label={category.label}
                  description={category.description}
                  enabled={settings.categories[category.name as keyof Categories]}
                  count={settings.categoryCounts?.[category.name as keyof CategoryCounts] || 0}
                  onChange={handleCategoryToggle}
                />
              ))}
            </div>
          </div>

          {/* Right Column - Protected Sites */}
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-4">
              Protected Sites
            </h2>
            <div className="p-4 bg-bg-secondary rounded-lg border border-border-default">
              <p className="text-xs text-text-secondary mb-3">
                Default protected sites (5 sites)
              </p>
              <div className="space-y-2">
                {settings.registeredSites.map((site) => {
                  const siteEnabled =
                    settings.siteSettings && settings.siteSettings[site]
                      ? settings.siteSettings[site].enabled
                      : true;
                  const siteCount =
                    settings.siteSettings && settings.siteSettings[site]
                      ? settings.siteSettings[site].protectedCount || 0
                      : 0;

                  return (
                    <div
                      key={site}
                      className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-default"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className={`w-2 h-2 rounded-full ${siteEnabled ? 'bg-accent-primary' : 'bg-text-muted'}`}
                        />
                        <div className="flex-1">
                          <span className="text-sm text-text-primary">{site}</span>
                          {siteCount > 0 && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary font-medium">
                              {siteCount.toLocaleString()} protected
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={siteEnabled}
                        onClick={() => handleSiteToggle(site, !siteEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${siteEnabled ? 'bg-accent-primary' : 'bg-border-strong'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${siteEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-border-subtle">
          <p className="text-xs text-text-muted text-center">
            Secure Paste v1.0.0 • 100% Local Processing • Zero Cloud
          </p>
        </div>
      </div>
    </div>
  );
}
