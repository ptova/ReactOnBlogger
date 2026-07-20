/**
 * Runtime configuration shared across services.
 *
 * Loaded once and cached for the lifetime of the page. The config source differs
 * between development and production:
 * - Development: reads from hiddenEnv.json (gitignored) and Vite env vars.
 * - Production: reads from a #HiddenEnv DOM element injected by the Blogger theme.
 */
export interface Config {
    /** URL or path to the internal Blogger HTML page to scrape. */
    MAIN_POST_SOURCE_URL: string;
    /**
     * URL of the deployed Apps Script web app that proxies the Blogger API.
     * Only needed if the external post source is used.
     */
    APPS_SCRIPT_URL: string;
}

/** Cached config to avoid re-parsing on every getConfig() call. */
let cachedConfig: Config | null = null;

/**
 * Loads the app configuration from the appropriate source.
 *
 * In development (import.meta.env.DEV), the config comes from two places:
 * 1. `hiddenEnv.json` — a gitignored file in the project root containing
 *    secrets like APPS_SCRIPT_URL.
 * 2. Vite env vars (`VITE_*`) — for values that can be committed.
 *
 * In production, the Blogger theme template injects a `<div id="HiddenEnv">`
 * element whose `data-info` attribute contains a JSON string with the config.
 * This avoids exposing secrets in the built JS bundle.
 */
async function loadConfig(): Promise<Config> {
    if (import.meta.env.DEV) {
        const hiddenConfig = await import('../../hiddenEnv.json');
        const envAppsScript = import.meta.env.VITE_APPS_SCRIPT_URL;
        const fileAppsScript = (hiddenConfig.default as unknown as Record<string, string>)['APPS_SCRIPT_URL'];
        return {
            MAIN_POST_SOURCE_URL: import.meta.env.VITE_MAIN_POST_SOURCE_URL || 'examplePostSource.html',
            APPS_SCRIPT_URL: envAppsScript || fileAppsScript || '',
        };
    }

    // Production: parse config from the DOM element injected by Blogger theme.
    const element = document.querySelector('#HiddenEnv') as HTMLElement | null;
    const raw = element?.dataset?.info;
    const parsed: Partial<Config> = raw ? JSON.parse(raw) : {};
    return {
        MAIN_POST_SOURCE_URL: parsed.MAIN_POST_SOURCE_URL ?? '',
        APPS_SCRIPT_URL: parsed.APPS_SCRIPT_URL ?? '',
    };
}

/**
 * Returns the app configuration, loading it on first call and caching thereafter.
 * Safe to call multiple times from any module — the async load only happens once.
 */
export async function getConfig(): Promise<Config> {
    if (!cachedConfig) {
        cachedConfig = await loadConfig();
    }
    return cachedConfig;
}
