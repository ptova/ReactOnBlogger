/** Runtime configuration shared across services. */
export interface Config {
    /** URL or path to the internal Blogger HTML page to scrape. */
    MAIN_POST_SOURCE_URL: string;
    /** Google API key for the Blogger v3 API. */
    BLOGGER_API_KEY: string | undefined;
    /** Blogger blog IDs to follow when using the external API. */
    FOLLOWED_BLOG_IDS: string[];
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
        return {
            MAIN_POST_SOURCE_URL: import.meta.env.VITE_MAIN_POST_SOURCE_URL || 'examplePostSource.html',
            BLOGGER_API_KEY: import.meta.env.VITE_BLOGGER_API_KEY,
            FOLLOWED_BLOG_IDS: hiddenConfig.default.FOLLOWED_BLOG_IDS ?? [],
        };
    }

    const element = document.querySelector('#HiddenEnv') as HTMLElement | null;
    const raw = element?.dataset?.info;
    const parsed: Partial<Config> = raw ? JSON.parse(raw) : {};
    return {
        MAIN_POST_SOURCE_URL: parsed.MAIN_POST_SOURCE_URL ?? '',
        BLOGGER_API_KEY: parsed.BLOGGER_API_KEY,
        FOLLOWED_BLOG_IDS: parsed.FOLLOWED_BLOG_IDS ?? [],
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
