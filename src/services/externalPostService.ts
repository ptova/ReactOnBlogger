import type { FetchPostsResult, Post } from '../types/Post.ts';
import { getConfig } from '../shared/config.ts';
import { parseExternalPost } from './parsers/externalPostParser.ts';
import type { BloggerPost } from './parsers/externalPostParser.ts';

const BLOGGER_API_ENDPOINT = 'https://www.googleapis.com/blogger/v3/blogs/';
const weekInMillis = 7 * 24 * 60 * 60 * 1000;
const maxResults = 10;

interface BloggerResponse {
    items?: BloggerPost[];
    nextPageToken?: string;
}

/** In-memory cache of all posts fetched so far, so subsequent loads append. */
let allPostsCache: Post[] = [];
/** Earliest date cursor that has been returned from any batch. */
let latestRetrieved: string | null = null;

/**
 * Fetches a single page of posts from one blog via the Blogger v3 API.
 *
 * @param blogId - The Blogger blog ID.
 * @param startDate - ISO date lower bound.
 * @param endDate - ISO date upper bound.
 * @param pageToken - Optional pagination token.
 * @returns The API response page.
 */
const fetchPostsFromSingleBlog = async (
    blogId: string,
    startDate: string,
    endDate: string,
    pageToken?: string,
): Promise<{ posts: BloggerPost[]; nextPageToken?: string }> => {
    const { BLOGGER_API_KEY } = await getConfig();
    const params: Record<string, string | number> = {
        key: BLOGGER_API_KEY ?? '',
        maxResults,
    };

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (pageToken) params.pageToken = pageToken;

    const queryString = new URLSearchParams(params as Record<string, string>).toString();

    try {
        const response = await fetch(`${BLOGGER_API_ENDPOINT}${blogId}/posts?${queryString}`);
        const json = (await response.json()) as BloggerResponse;
        return { posts: json.items || [], nextPageToken: json.nextPageToken };
    } catch (error) {
        console.error(`Failed to fetch posts from blog ${blogId}:`, error);
        return { posts: [], nextPageToken: undefined };
    }
};

/**
 * Iterates through all pages of a single blog within a date range.
 *
 * @param blogId - The Blogger blog ID.
 * @param startDate - ISO date lower bound.
 * @param endDate - ISO date upper bound.
 * @returns All posts from that blog in the range.
 */
const fetchAllPagesForBlog = async (
    blogId: string,
    startDate: string,
    endDate: string,
): Promise<BloggerPost[]> => {
    const posts: BloggerPost[] = [];
    let pageToken: string | undefined;

    while (true) {
        const result = await fetchPostsFromSingleBlog(blogId, startDate, endDate, pageToken);
        if (!result.posts.length) break;
        posts.push(...result.posts);
        if (!result.nextPageToken) break;
        pageToken = result.nextPageToken;
    }

    return posts;
};

/**
 * Fetches posts from all followed blogs for a one-week date window,
 * then merges the results.
 *
 * @param startDate - ISO start of the week.
 * @param endDate - ISO end of the week.
 * @returns All posts from followed blogs in that window.
 */
const fetchPostsForWeekRange = async (
    startDate: string,
    endDate: string,
): Promise<BloggerPost[]> => {
    const { FOLLOWED_BLOG_IDS } = await getConfig();
    const blogPromises = FOLLOWED_BLOG_IDS.map((blogId) =>
        fetchAllPagesForBlog(blogId, startDate, endDate),
    );
    const results = await Promise.all(blogPromises);
    return results.flat();
};

/**
 * Loads posts from the Blogger v3 API for all followed blogs.
 *
 * The API is called in one-week windows going backward from the current date.
 * Results are cached in memory so that navigating back reuses already-fetched data.
 * Registered as the `'external'` service.
 *
 * @param startDate - ISO date cursor. `undefined` means "fetch the most recent week".
 * @returns Parsed posts and the next (earlier) date cursor.
 */
export async function loadExternalPosts(startDate: string | undefined): Promise<FetchPostsResult> {
    if (startDate === undefined) {
        startDate = new Date(Date.now() - weekInMillis).toISOString();
    }

    if (allPostsCache.length && latestRetrieved && latestRetrieved < startDate) {
        startDate = latestRetrieved;
        const nextStartDate = new Date(new Date(startDate).getTime() - weekInMillis).toISOString();
        return { newPosts: allPostsCache, nextUrl: nextStartDate };
    }

    const endDate = new Date(new Date(startDate).getTime() + weekInMillis).toISOString();
    const newPosts = await fetchPostsForWeekRange(startDate, endDate);

    newPosts.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));

    const newParsedPosts = newPosts.map(parseExternalPost);
    allPostsCache = [...allPostsCache, ...newParsedPosts];
    latestRetrieved = startDate;

    const nextStartDate = new Date(new Date(startDate).getTime() - weekInMillis).toISOString();
    return { newPosts: newParsedPosts, nextUrl: nextStartDate };
}
