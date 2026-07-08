import type { Post } from '../../types/Post.ts';

/** Minimal shape of a JSON-LD script element found inside a Blogger post. */
interface JsonLdData {
    datePublished?: string;
}

const parser = new DOMParser();

/**
 * Parses a raw Blogger HTML page and extracts individual post containers
 * plus a link to the next (older) page.
 *
 * @param html - The full HTML string of a Blogger page.
 * @returns An object containing post elements and the next-page URL (or `null`).
 */
export function gatherPosts(html: string): { elements: Element[]; nextUrl: string | null } {
    const doc = parser.parseFromString(html, 'text/html');
    const olderLink = doc.querySelector('.blog-pager-older-link') as HTMLAnchorElement | null;
    return {
        elements: [...doc.querySelectorAll('.post-outer')],
        nextUrl: olderLink ? olderLink.href : null,
    };
}

/**
 * Extracts structured `Post` data from a single `.post-outer` DOM element.
 *
 * Fields are scraped from known Blogger CSS class selectors:
 * - title: `.post-title.entry-title > a`
 * - content: `.post-body.entry-content` (inner HTML)
 * - id: `a[name]` anchor
 * - labels: `.post-labels a[rel="tag"]`
 * - datePublished: JSON-LD `<script>` block
 *
 * @param postElement - A DOM element matching `.post-outer`.
 * @returns A normalised `Post` object.
 */
export function parsePost(postElement: Element): Post {
    const scriptTag = postElement.querySelector('script[type="application/ld+json"]');
    let jsonLdData: JsonLdData = {};
    if (scriptTag) {
        try {
            jsonLdData = JSON.parse(scriptTag.textContent || '');
        } catch (e) {
            console.error('Failed to parse JSON-LD:', e);
        }
    }

    const labels: string[] = [];
    const labelLinks = postElement.querySelectorAll('.post-labels a[rel="tag"]');
    labelLinks.forEach((link: Element) => {
        const labelText = link.textContent?.trim() || '';
        if (labelText) {
            labels.push(labelText);
        }
    });

    const idAnchor = postElement.querySelector('a[name]');
    const id = idAnchor ? idAnchor.getAttribute('name') || '' : '';

    const titleElement = postElement.querySelector('.post-title.entry-title');
    let title = '';
    if (titleElement) {
        const titleLink = titleElement.querySelector('a');
        title = titleLink ? titleLink.textContent?.trim() || '' : titleElement.textContent?.trim() || '';
    }

    const contentElement = postElement.querySelector('.post-body.entry-content');
    const content = contentElement?.innerHTML?.trim() || '';

    const datePublished = jsonLdData.datePublished || '';

    return { title, content, id, labels, datePublished };
}
