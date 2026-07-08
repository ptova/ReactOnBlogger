import type { Post } from '../../types/Post.ts';

/** Raw post data as returned by the Blogger v3 API. */
export interface BloggerPost {
    id: string;
    title: string;
    content: string;
    published: string;
    blog: { id: string; name?: string };
    labels?: string[];
}

/**
 * Converts a raw API response item into the app's normalised `Post` shape.
 *
 * The composite `id` uses the pattern `{blog.id}_{post.id}` to guarantee
 * uniqueness when aggregating posts from multiple blogs.
 *
 * @param bloggerPost - A single item from the Blogger API response.
 * @returns A normalised `Post` object.
 */
export function parseExternalPost(bloggerPost: BloggerPost): Post {
    return {
        title: bloggerPost.title,
        content: bloggerPost.content,
        id: `${bloggerPost.blog.id}_${bloggerPost.id}`,
        labels: bloggerPost.labels || [],
        datePublished: bloggerPost.published,
    };
}
