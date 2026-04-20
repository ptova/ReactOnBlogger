import type {FetchPostsFn, FetchPostsResult, Post} from '../types/Post.ts';
import {BLOGGER_API_KEY, FOLLOWED_BLOG_IDS} from "../shared/constants.ts";

const BLOGGER_API_ENDPOINT = 'https://www.googleapis.com/blogger/v3/blogs/';

interface BloggerPost {
    id: string;
    title: string;
    url: string;
    content: string;
    published: string;
    blog: {
        id: string; name?: string;
    };
    labels?: string[];
}

interface BloggerResponse {
    items?: BloggerPost[];
    nextPageToken?: string;
}

// Cache for storing loaded posts across multiple loads
let allPostsCache: Post[] = [];
let currentPageToken: string | null = null;
let currentStartIndex = 0;

const parseExternalPost = (bloggerPost: BloggerPost): Post => {
    return {
        title: bloggerPost.title,
        content: bloggerPost.content,
        id: `${bloggerPost.blog.id}_${bloggerPost.id}`,
        labels: bloggerPost.labels || [],
        datePublished: bloggerPost.published
    };
};

const fetchPostsFromBlogs = async (startDate?: string, pageToken?: string): Promise<BloggerPost[]> => {
    const params: Record<string, string | number> = {
        key: BLOGGER_API_KEY, maxResults: 10
    };

    if (startDate) {
        params.startDate = startDate;
    }

    if (pageToken) {
        params.pageToken = pageToken;
    }

    const queryString = new URLSearchParams(params as Record<string, string>).toString();

    const promises = FOLLOWED_BLOG_IDS.map(blogId => fetch(`${BLOGGER_API_ENDPOINT}${blogId}/posts?${queryString}`)
        .then(res => res.json() as Promise<BloggerResponse>)
        .then(json => json.items || [])
        .catch(error => {
            console.error(`Failed to fetch posts from blog ${blogId}:`, error);
            return [];
        }));

    const results = await Promise.all(promises);
    return results.flat();
};

export const loadExternalPosts: FetchPostsFn = async (url: string): Promise<FetchPostsResult> => {
    // Parse URL to get parameters
    const urlObj = new URL(url);
    const pageToken = urlObj.searchParams.get('pageToken');
    const startDate = urlObj.searchParams.get('startDate');

    // If starting fresh or no cache, fetch new posts
    if (!pageToken || pageToken === 'null') {
        currentPageToken = null;
        currentStartIndex = 0;
        allPostsCache = [];

        // Default to last 7 days if no start date specified
        const defaultStartDate = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const newPosts = await fetchPostsFromBlogs(defaultStartDate, undefined);

        // Sort by date published (newest first)
        newPosts.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));

        allPostsCache = newPosts.map(parseExternalPost);

        // Get next page token from the first blog (simplified - in production you'd track per blog)
        const nextToken = newPosts.length === 10 ? 'has_more' : null;

        return {
            newPosts: allPostsCache.slice(0, 10),
            nextUrl: nextToken ? `${window.location.origin}${window.location.pathname}?pageToken=${nextToken}&startDate=${defaultStartDate}` : null
        };
    } else {
        // Load more posts - in a real implementation, you'd fetch the next batch
        // For this example, we'll simulate loading more by slicing the cache
        const start = currentStartIndex + 10;
        const end = start + 10;

        if (start >= allPostsCache.length) {
            // Fetch more from API with next page token
            const nextBatch = await fetchPostsFromBlogs(startDate || undefined, currentPageToken || undefined);
            const newParsedPosts = nextBatch.map(parseExternalPost);
            allPostsCache = [...allPostsCache, ...newParsedPosts];

            const hasMore = nextBatch.length === 10;
            const nextToken = hasMore ? 'has_more' : null;

            return {
                newPosts: newParsedPosts,
                nextUrl: nextToken ? `${window.location.origin}${window.location.pathname}?pageToken=${nextToken}&startDate=${startDate}` : null
            };
        }

        const newPosts = allPostsCache.slice(start, end);
        const hasMore = end < allPostsCache.length;

        return {
            newPosts,
            nextUrl: hasMore ? `${window.location.origin}${window.location.pathname}?pageToken=more&startDate=${startDate}` : null
        };
    }
};