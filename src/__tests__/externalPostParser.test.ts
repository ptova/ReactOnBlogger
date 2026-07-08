import { describe, it, expect } from 'vitest';
import { parseExternalPost } from '../services/parsers/externalPostParser';

describe('parseExternalPost', () => {
    const mockPost = {
        id: '123',
        title: 'Test Post',
        content: '<p>Hello world</p>',
        published: '2024-01-15T10:00:00Z',
        blog: { id: '456', name: 'Test Blog' },
        labels: ['tech', 'react'],
    };

    it('extracts title and content', () => {
        const post = parseExternalPost(mockPost);
        expect(post.title).toBe('Test Post');
        expect(post.content).toBe('<p>Hello world</p>');
    });

    it('creates composite ID from blog ID and post ID', () => {
        const post = parseExternalPost(mockPost);
        expect(post.id).toBe('456_123');
    });

    it('includes labels', () => {
        const post = parseExternalPost(mockPost);
        expect(post.labels).toEqual(['tech', 'react']);
    });

    it('includes datePublished', () => {
        const post = parseExternalPost(mockPost);
        expect(post.datePublished).toBe('2024-01-15T10:00:00Z');
    });

    it('handles missing labels', () => {
        const post = parseExternalPost({ ...mockPost, labels: undefined });
        expect(post.labels).toEqual([]);
    });
});
