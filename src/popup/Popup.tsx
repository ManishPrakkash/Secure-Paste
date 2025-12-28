/**
 * Main popup component - Premium Professional Design
 */

import { useEffect, useState } from 'react';

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
            <div className="w-full h-[460px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-[3px] border-accent-primary/30 border-t-accent-primary animate-spin" />
                    <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-accent-primary/10 animate-ping" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[460px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 relative overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-primary/10 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />

            <div className="relative h-full flex flex-col">
                {/* Premium Header */}
                <div className="relative px-4 pt-6 pb-5">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-sm" />
                    <div className="relative flex items-center gap-3">
                        <div className="relative group">
                            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-0.5 shadow-xl">
                                <div className="w-full h-full rounded-[10px] bg-gradient-to-br from-slate-900 to-slate-800 p-[1px] overflow-hidden">
                                    <img src="/icons/icon128.png" alt="Secure Paste" className="w-full h-full rounded-[9px] object-cover" />
                                </div>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-lg font-bold text-white tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                Secure Paste
                            </h1>
                            <p className="text-[11px] text-slate-400 font-medium">Privacy-First Protection</p>
                        </div>
                        {/* Settings Icon Button */}
                        <button
                            onClick={openSettings}
                            className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-all duration-200 hover:scale-105 active:scale-95"
                            aria-label="Settings"
                        >
                            <svg className="w-5 h-5 text-slate-400 hover:text-slate-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="px-4 space-y-3 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {/* Status Card with Advanced Glassmorphism */}
                    <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary/20 to-blue-600/20 rounded-[18px] blur opacity-0 group-hover:opacity-100 transition duration-300" />
                        <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                            {/* Shimmer Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                            <div className="relative p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`relative w-9 h-9 rounded-xl transition-all duration-500 ${settings.enabled
                                            ? 'bg-gradient-to-br from-accent-primary via-blue-500 to-blue-600 shadow-lg'
                                            : 'bg-gradient-to-br from-slate-700 to-slate-800'
                                            }`}>
                                            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent" />
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">Protection Status</h3>
                                            <p className={`text-xs font-medium transition-colors duration-300 ${settings.enabled ? 'text-green-400' : 'text-slate-500'
                                                }`}>
                                                {settings.enabled ? '● Active' : '○ Disabled'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Premium Toggle */}
                                    <button
                                        onClick={handleToggle}
                                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-500 ${settings.enabled
                                            ? 'bg-gradient-to-r from-accent-primary via-blue-500 to-blue-600 shadow-lg'
                                            : 'bg-slate-700/80'
                                            }`}
                                    >
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-white/10" />
                                        <span
                                            className={`relative inline-block h-6 w-6 transform rounded-full bg-white shadow-xl transition-all duration-500 ${settings.enabled ? 'translate-x-7' : 'translate-x-1'
                                                }`}
                                        >
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white to-slate-100" />
                                        </span>
                                    </button>
                                </div>

                                {/* Site Info with Divider */}
                                <div className="relative pt-3 mt-1">
                                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isRegistered && isSiteEnabled
                                            ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse'
                                            : 'bg-slate-600'
                                            }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-0.5">Current Site</p>
                                            <p className="text-sm font-semibold text-white truncate">
                                                {hostname || 'No active site'}
                                            </p>
                                        </div>
                                        {isRegistered && (
                                            <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-accent-primary/10 to-blue-600/10 border border-accent-primary/30 backdrop-blur-sm">
                                                <span className="text-[10px] font-bold text-accent-primary uppercase tracking-wide">Protected</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Card - Premium Design */}
                    <div className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary/30 to-purple-600/30 rounded-[18px] blur opacity-50 group-hover:opacity-75 transition duration-300" />
                        <div className="relative rounded-2xl bg-gradient-to-br from-accent-primary/[0.15] to-purple-600/[0.08] backdrop-blur-xl border border-accent-primary/20 shadow-2xl overflow-hidden">
                            {/* Animated Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/10 via-transparent to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative p-4 flex items-center gap-4">
                                <div className="relative">
                                    <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-accent-primary via-blue-500 to-blue-600 flex items-center justify-center shadow-xl">
                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/30 to-transparent" />
                                        <svg className="relative w-7 h-7 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Secrets Protected</p>
                                    <p className="text-3xl font-black text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                                        {settings.protectedCount.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Premium Footer */}
                <div className="relative px-4 pb-3 pt-6">
                    <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="flex items-center justify-center gap-2 mb-3 mt-2">
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
