import { describe, it, expect } from 'vitest';
import { preprocessBloggerImageUrl } from '../shared/imageUtils';

describe('preprocessBloggerImageUrl', () => {
    it('removes last two path segments from blogger image URLs', () => {
        const url = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiqD/s640/photo.jpg';
        const result = preprocessBloggerImageUrl(url);
        expect(result).toBe('https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiqD');
    });

    it('returns original URL for non-blogger URLs', () => {
        const url = 'https://example.com/image.jpg';
        expect(preprocessBloggerImageUrl(url)).toBe(url);
    });

    it('returns original URL for blogger URLs without image extension in last segment', () => {
        const url = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/data';
        expect(preprocessBloggerImageUrl(url)).toBe(url);
    });

    it('handles uppercase image extensions', () => {
        const url = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiqD/s640/photo.JPG';
        const result = preprocessBloggerImageUrl(url);
        expect(result).toBe('https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiqD');
    });

    it('returns original URL on malformed input', () => {
        expect(preprocessBloggerImageUrl('not-a-url')).toBe('not-a-url');
    });
});
