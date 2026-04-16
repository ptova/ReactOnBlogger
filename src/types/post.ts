export interface Post {
    title: string;
    content: string;
    id: string;
    labels: string[];
    datePublished: string;
}

export interface JsonLdData {
    datePublished?: string;
}