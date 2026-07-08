/** A single blog post after parsing (internal or external source). */
export interface Post {
    /** Post title text. */
    title: string;
    /** Raw HTML content of the post body. */
    content: string;
    /** Unique identifier (anchor name for internal, `${blogId}_${postId}` for external). */
    id: string;
    /** Category labels applied to the post. */
    labels: string[];
    /** ISO 8601 date string of when the post was published. */
    datePublished: string;
}

/** Result returned by a post-fetching function. */
export type FetchPostsResult = {
    /** Posts retrieved in this batch. */
    newPosts: Post[];
    /** URL or token to fetch the next page. `null` means no more pages. */
    nextUrl: string | null;
};

/**
 * Function signature for loading posts from any source.
 * @param url - For internal: the HTML page URL. For external: an ISO date string cursor.
 */
export type FetchPostsFn = (url: string | undefined) => Promise<FetchPostsResult>;
