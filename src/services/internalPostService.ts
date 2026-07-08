import type { FetchPostsResult, Post } from '../types/Post.ts';
import { getConfig } from '../shared/config.ts';
import { gatherPosts, parsePost } from './parsers/bloggerHtmlParser.ts';

/**
 * Checks the fetch response and returns the response text.
 * @throws If the HTTP status is not OK.
 */
const checkStatus = (response: Response): Promise<string> => {
    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
    }
    return response.text();
};

/**
 * Loads posts by scraping a Blogger HTML page.
 *
 * When `url` is `undefined`, falls back to the configured `MAIN_POST_SOURCE_URL`.
 * Registered as the `'internal'` service.
 *
 * @param url - URL of the Blogger page to scrape (or `undefined` for the default).
 * @returns Parsed posts and the next-page link.
 */
export async function loadPosts(url: string | undefined): Promise<FetchPostsResult> {
    const { MAIN_POST_SOURCE_URL } = await getConfig();
    const actualUrl = url ?? MAIN_POST_SOURCE_URL;
    const html = await fetch(actualUrl).then(checkStatus);
    const result = gatherPosts(html);
    const newPosts: Post[] = result.elements.map(parsePost);
    return { newPosts, nextUrl: result.nextUrl };
}
