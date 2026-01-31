/**
 * Main settings page component - Premium Dark Theme
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-[3px] border-accent-primary/30 border-t-accent-primary animate-spin" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-[3px] border-accent-primary/10 animate-ping" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center">
        <p className="text-slate-400">Failed to load settings</p>
      </div>
    );
  }

  const activeCategories = Object.values(settings.categories).filter(Boolean).length;
  const totalCategories = Object.keys(settings.categories).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-600/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative max-w-7xl mx-auto p-8">
        {/* Premium Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-0.5 shadow-2xl">
              <div className="w-full h-full rounded-[11px] bg-gradient-to-br from-slate-900 to-slate-800 p-[1px] overflow-hidden flex items-center justify-center">
                <svg className="w-7 h-7 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-sm text-slate-400 font-medium">Manage patterns and protection</p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Protected Count */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary/30 to-purple-600/30 rounded-[18px] blur opacity-50 group-hover:opacity-75 transition duration-300" />
            <div className="relative rounded-2xl bg-gradient-to-br from-accent-primary/[0.15] to-purple-600/[0.08] backdrop-blur-xl border border-accent-primary/20 shadow-2xl overflow-hidden p-5">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/10 via-transparent to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Protected</p>
                <p className="text-3xl font-black text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  {settings.protectedCount.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">Total secrets secured</p>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-[18px] blur opacity-0 group-hover:opacity-100 transition duration-300" />
            <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden p-5">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="relative">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Categories</p>
                <p className="text-3xl font-black text-white tracking-tight">
                  {activeCategories}/{totalCategories}
                </p>
                <p className="text-xs text-slate-500 mt-1">Active patterns</p>
              </div>
            </div>
          </div>

          {/* Sites */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-[18px] blur opacity-0 group-hover:opacity-100 transition duration-300" />
            <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden p-5">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="relative">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Sites</p>
                <p className="text-3xl font-black text-white tracking-tight">
                  {settings.registeredSites.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">Protected websites</p>
              </div>
            </div>
          </div>
        </div>

        {/* Restoration Toggle */}
        <div className="mb-8 group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary/20 to-blue-600/20 rounded-[18px] blur opacity-0 group-hover:opacity-100 transition duration-300" />
          <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden p-5">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-primary/20 to-blue-600/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Enable Restoration on Copy</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Automatically restore masked values when copying</p>
                </div>
              </div>
              <button
                onClick={() => handleRestorationToggle(!settings.enableRestoration)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-500 ${settings.enableRestoration
                    ? 'bg-gradient-to-r from-accent-primary via-blue-500 to-blue-600 shadow-lg'
                    : 'bg-slate-700/80'
                  }`}
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-white/10" />
                <span
                  className={`relative inline-block h-6 w-6 transform rounded-full bg-white shadow-xl transition-all duration-500 ${settings.enableRestoration ? 'translate-x-7' : 'translate-x-1'
                    }`}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white to-slate-100" />
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Custom Patterns */}
        <div className="mb-8 group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-[18px] blur opacity-0 group-hover:opacity-100 transition duration-300" />
          <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden p-6">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="relative">
              <CustomPatternManager onPatternsChange={loadSettings} />
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Pattern Categories */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
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
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Protected Sites
            </h2>
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary/20 to-blue-600/20 rounded-[18px] blur opacity-0 group-hover:opacity-100 transition duration-300" />
              <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden p-5">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="relative">
                  <p className="text-xs text-slate-400 mb-4 font-medium">
                    Default protected sites ({settings.registeredSites.length} sites)
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
                          className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-200"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className={`w-2 h-2 rounded-full ${siteEnabled ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse' : 'bg-slate-600'
                                }`}
                            />
                            <div className="flex-1">
                              <span className="text-sm text-white font-medium">{site}</span>
                              {siteCount > 0 && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-lg bg-accent-primary/10 text-accent-primary font-semibold">
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
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-500 ${siteEnabled
                                ? 'bg-gradient-to-r from-accent-primary via-blue-500 to-blue-600 shadow-lg'
                                : 'bg-slate-700/80'
                              }`}
                          >
                            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-white/10" />
                            <span
                              className={`relative inline-block h-5 w-5 transform rounded-full bg-white shadow-xl transition-all duration-500 ${siteEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            >
                              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white to-slate-100" />
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Footer */}
        <div className="relative pt-8">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="flex items-center justify-center gap-2 mb-3 mt-6">
            <p className="text-[11px] text-slate-500 font-semibold">100% Local • Zero Cloud</p>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
            <span className="font-bold">v1.0.0</span>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/ManishPrakkash/Secure-Paste.git"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent-primary transition-all duration-300 hover:scale-110"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
              </a>
              <a
                href="https://github.com/ManishPrakkash"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-red-400 transition-all duration-300 hover:scale-110"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
