/**
 * Utility functions for safe Chrome API access
 */

/**
 * Check if extension context is valid
 * Returns false if extension was reloaded/updated
 */
export function isExtensionContextValid(): boolean {
    try {
        // Check if chrome.runtime exists and is accessible
        return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch {
        return false;
    }
}

/**
 * Safely send message to background script
 * Returns null if extension context is invalid
 */
export async function safeSendMessage(message: any): Promise<any | null> {
    if (!isExtensionContextValid()) {
        console.warn('[Secure Paste] Extension context invalidated. Message not sent:', message.type);
        return null;
    }

    try {
        return await chrome.runtime.sendMessage(message);
    } catch (error) {
        if (error instanceof Error && error.message.includes('Extension context invalidated')) {
            console.warn('[Secure Paste] Extension context invalidated during message send');
            return null;
        }
        throw error;
    }
}

/**
 * Safely access session storage
 * Returns false if storage is not accessible
 */
export async function safeSessionStorageSet(key: string, value: any): Promise<boolean> {
    if (!isExtensionContextValid()) {
        console.warn('[Secure Paste] Extension context invalidated. Cannot access session storage');
        return false;
    }

    try {
        await chrome.storage.session.set({ [key]: value });
        return true;
    } catch (error) {
        if (error instanceof Error &&
            (error.message.includes('Extension context invalidated') ||
                error.message.includes('Access to storage is not allowed'))) {
            console.warn('[Secure Paste] Storage access denied. Extension may have been reloaded.');
            return false;
        }
        throw error;
    }
}

/**
 * Safely access session storage
 * Returns null if storage is not accessible
 */
export async function safeSessionStorageGet(key: string): Promise<any | null> {
    if (!isExtensionContextValid()) {
        return null;
    }

    try {
        const result = await chrome.storage.session.get(key);
        return result[key] || null;
    } catch (error) {
        if (error instanceof Error &&
            (error.message.includes('Extension context invalidated') ||
                error.message.includes('Access to storage is not allowed'))) {
            return null;
        }
        throw error;
    }
}
