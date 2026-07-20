import type { FetchPostsResult, Post } from '../types/Post.ts';
import { getConfig } from '../shared/config.ts';

/**
 * Response shape returned by the Apps Script web app.
 * Mirrors the FetchPostsResult type but includes an optional error field
 * for Apps Script-level failures.
 */
interface AppsScriptResponse {
    newPosts: Post[];
    nextUrl: string | null;
    error?: string;
}

/**
 * In-memory cache of all posts fetched so far, so subsequent loads append
 * rather than re-fetching dates that have already been retrieved.
 *
 * This cache persists across the session but is not shared between tabs.
 * It allows the user to scroll back and forth without re-fetching already
 * loaded date ranges from the Blogger API.
 */
let allPostsCache: Post[] = [];
/** Earliest date cursor that has been returned from any batch. */
let latestRetrieved: string | null = null;

const weekInMillis = 7 * 24 * 60 * 60 * 1000;

/**
 * Loads posts from the Apps Script web app, which proxies the Blogger API
 * without exposing credentials to the client.
 *
 * The script is called with an ISO date cursor and returns one week of posts.
 * Results are cached here so that navigating back reuses already-fetched data.
 * Registered as the `'external'` service.
 *
 * Caching strategy:
 * - On first call (startDate=undefined), fetches the most recent week.
 * - On subsequent calls, if the requested date is older than what we've
 *   already fetched, we return the cache and compute the next cursor.
 * - New data is appended to the cache.
 *
 * @param startDate - ISO date cursor. `undefined` means "fetch the most recent week".
 * @returns Parsed posts and the next (earlier) date cursor.
 */
export async function loadExternalPosts(startDate: string | undefined): Promise<FetchPostsResult> {
    const { APPS_SCRIPT_URL } = await getConfig();

    if (!APPS_SCRIPT_URL) {
        throw new Error('APPS_SCRIPT_URL is not configured. Set it in your config to use the external post source.');
    }

    // Default to one week ago when no cursor is provided (initial load).
    if (startDate === undefined) {
        startDate = new Date(Date.now() - weekInMillis).toISOString();
    }

    // Cache hit: if we've already fetched data older than the requested date,
    // return cached posts and compute the next cursor from the cache boundary.
    if (allPostsCache.length && latestRetrieved && latestRetrieved < startDate) {
        startDate = latestRetrieved;
        const nextStartDate = new Date(new Date(startDate).getTime() - weekInMillis).toISOString();
        return { newPosts: allPostsCache, nextUrl: nextStartDate };
    }

    // Pass the current origin so the Apps Script can set CORS headers correctly.
    const origin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
    const url = `${APPS_SCRIPT_URL}?origin=${origin}&startDate=${encodeURIComponent(startDate)}`;

    const response = await fetch(url);
    const json: AppsScriptResponse = await response.json();

    if (json.error) {
        throw new Error(`Apps Script error: ${json.error}`);
    }

    // Append new posts to the cache and update the earliest cursor.
    allPostsCache = [...allPostsCache, ...json.newPosts];
    latestRetrieved = startDate;

    return { newPosts: json.newPosts, nextUrl: json.nextUrl };
}
