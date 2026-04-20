export interface Post {
    title: string;
    content: string;
    id: string;
    labels: string[];
    datePublished: string;
}

export type FetchPostsResult = {
    newPosts: Post[]; nextUrl: string | null;
};

export type FetchPostsFn = (url: string) => Promise<FetchPostsResult>;