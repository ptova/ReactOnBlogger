let config: {
    MAIN_POST_SOURCE_URL: string, BLOGGER_API_KEY: string, FOLLOWED_BLOG_IDS: string[]
};

if (import.meta.env.DEV) {
    // Only used in development
    config = (await import("../../hiddenEnv.json")).default;
    config.MAIN_POST_SOURCE_URL = import.meta.env.VITE_MAIN_POST_SOURCE_URL || "examplePostSource.html"
    config.BLOGGER_API_KEY = import.meta.env.VITE_BLOGGER_API_KEY
} else {
    // Only used in production (injected into HTML)
    const element = document.querySelector("#HiddenEnv") as HTMLElement | null;
    const raw = element?.dataset?.info;
    config = raw ? JSON.parse(raw) : {};
}

export const {
    MAIN_POST_SOURCE_URL, BLOGGER_API_KEY, FOLLOWED_BLOG_IDS
} = config;