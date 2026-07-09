/** Runtime configuration shared across services. */
export interface Config {
    /** URL or path to the internal Blogger HTML page to scrape. */
    MAIN_POST_SOURCE_URL: string;
    /**
     * URL of the deployed Apps Script web app that proxies the Blogger API.
     * Only needed if the external post source is used.
     */
    APPS_SCRIPT_URL: string;
}

let cachedConfig: Config | null = null;

/**
 * Loads the app configuration.
 *
 * - In development: reads `hiddenEnv.json` (gitignored) plus `VITE_*` env vars.
 * - In production: reads from the `#HiddenEnv` DOM element's `data-info` attribute
 *   (injected by the Blogger theme).
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
 * Safe to call multiple times from any module.
 */
export async function getConfig(): Promise<Config> {
    if (!cachedConfig) {
        cachedConfig = await loadConfig();
    }
    return cachedConfig;
}
