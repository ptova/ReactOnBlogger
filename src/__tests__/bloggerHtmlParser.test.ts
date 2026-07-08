import { describe, it, expect } from 'vitest';
import { parsePost, gatherPosts } from '../services/parsers/bloggerHtmlParser';

describe('parsePost', () => {
    function createMockElement(html: string): Element {
        const parser = new DOMParser();
        const doc = parser.parseFromString(
            `<div class="post-outer">${html}</div>`,
            'text/html'
        );
        return doc.querySelector('.post-outer')!;
    }

    it('extracts title from title link', () => {
        const el = createMockElement(`
            <h3 class="post-title entry-title">
                <a href="/test">My Test Post</a>
            </h3>
        `);
        const post = parsePost(el);
        expect(post.title).toBe('My Test Post');
    });

    it('extracts labels from post-labels', () => {
        const el = createMockElement(`
            <div class="post-footer">
                <div class="post-labels">
                    <a rel="tag" href="/tag/react">react</a>
                    <a rel="tag" href="/tag/typescript">typescript</a>
                </div>
            </div>
        `);
        const post = parsePost(el);
        expect(post.labels).toEqual(['react', 'typescript']);
    });

    it('extracts ID from anchor name', () => {
        const el = createMockElement(`<a name="1234567890"></a>`);
        const post = parsePost(el);
        expect(post.id).toBe('1234567890');
    });

    it('returns empty strings for missing elements', () => {
        const el = createMockElement(``);
        const post = parsePost(el);
        expect(post.title).toBe('');
        expect(post.id).toBe('');
        expect(post.content).toBe('');
    });

    it('extracts datePublished from JSON-LD', () => {
        const el = createMockElement(`
            <script type="application/ld+json">
                {"datePublished": "2024-01-15T10:00:00Z"}
            </script>
        `);
        const post = parsePost(el);
        expect(post.datePublished).toBe('2024-01-15T10:00:00Z');
    });
});

describe('gatherPosts', () => {
    it('extracts post-outer elements and older link', () => {
        const html = `
            <html><body>
                <div class="post-outer"><h2>Post 1</h2></div>
                <div class="post-outer"><h2>Post 2</h2></div>
                <a class="blog-pager-older-link" href="https://example.com/page/2">Older</a>
            </body></html>
        `;
        const result = gatherPosts(html);
        expect(result.elements).toHaveLength(2);
        expect(result.nextUrl).toBe('https://example.com/page/2');
    });

    it('returns null nextUrl when no older link exists', () => {
        const html = `<html><body><div class="post-outer"><h2>Post 1</h2></div></body></html>`;
        const result = gatherPosts(html);
        expect(result.elements).toHaveLength(1);
        expect(result.nextUrl).toBeNull();
    });
});
