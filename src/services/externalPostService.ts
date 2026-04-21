import type {FetchPostsFn, FetchPostsResult, Post} from '../types/Post.ts';
import {BLOGGER_API_KEY, FOLLOWED_BLOG_IDS} from "../shared/constants.ts";

const BLOGGER_API_ENDPOINT = 'https://www.googleapis.com/blogger/v3/blogs/';
const weekInMillis = 7 * 24 * 60 * 60 * 1000;
const maxResults = 10;

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
let latestRetrieved: string | null = null;

const parseExternalPost = (bloggerPost: BloggerPost): Post => {
    return {
        title: bloggerPost.title,
        content: bloggerPost.content,
        id: `${bloggerPost.blog.id}_${bloggerPost.id}`,
        labels: bloggerPost.labels || [],
        datePublished: bloggerPost.published
    };
};

const fetchPostsFromSingleBlog = async (blogId: string, startDate: string, endDate: string, pageToken?: string): Promise<{
    posts: BloggerPost[], nextPageToken?: string
}> => {
    const params: Record<string, string | number> = {
        key: BLOGGER_API_KEY, maxResults: maxResults
    };

    if (startDate) {
        params.startDate = startDate;
    }
    if (endDate) {
        params.endDate = endDate;
    }
    if (pageToken) {
        params.pageToken = pageToken;
    }

    const queryString = new URLSearchParams(params as Record<string, string>).toString();

    try {
        const response = await fetch(`${BLOGGER_API_ENDPOINT}${blogId}/posts?${queryString}`);
        const json = await response.json() as BloggerResponse;
        return {
            posts: json.items || [], nextPageToken: json.nextPageToken
        };
    } catch (error) {
        console.error(`Failed to fetch posts from blog ${blogId}:`, error);
        return {posts: [], nextPageToken: undefined};
    }
};

const fetchPostsForWeekRange = async (startDate: string, endDate: string): Promise<BloggerPost[]> => {
    const allPosts: BloggerPost[] = [];

    // For each blog, fetch posts with pagination
    for (const blogId of FOLLOWED_BLOG_IDS) {
        let pageToken: string | undefined = undefined;
        let hasMorePages = true;

        while (hasMorePages) {
            const result = await fetchPostsFromSingleBlog(blogId, startDate, endDate, pageToken);

            if (result.posts.length === 0) {
                hasMorePages = false;
            } else {
                allPosts.push(...result.posts);
                pageToken = result.nextPageToken;
                hasMorePages = !!result.nextPageToken;
            }
        }
    }

    return allPosts;
};

export const loadExternalPosts: FetchPostsFn = async (startDate: string | undefined): Promise<FetchPostsResult> => {
    // Initialize on first call
    if (startDate === undefined) {
        // Start from current date going back 1 week
        startDate = new Date(Date.now() - weekInMillis).toISOString();
    }
    if (allPostsCache && latestRetrieved && latestRetrieved < startDate) {
        startDate = latestRetrieved
        const nextStartDate = new Date(new Date(startDate).getTime() - weekInMillis).toISOString();
        return {
            newPosts: allPostsCache, nextUrl: nextStartDate
        };
    } else {
        // Define the week range: from startDate to startDate + 1 week
        const endDate = new Date(new Date(startDate).getTime() + weekInMillis).toISOString();

        // Fetch all posts for this specific week range (with pagination)
        const newPosts = await fetchPostsForWeekRange(startDate, endDate);

        // Sort by date published (newest first)
        newPosts.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));

        const newParsedPosts = newPosts.map(parseExternalPost);
        allPostsCache = [...allPostsCache, ...newParsedPosts];
        latestRetrieved = startDate
        // Calculate next start date: go back another week (2 weeks from original startDate)
        const nextStartDate = new Date(new Date(startDate).getTime() - weekInMillis).toISOString();
        return {
            newPosts: newParsedPosts, nextUrl: nextStartDate
        };
    }


}
