import { describe, it, expect, beforeEach } from 'vitest';
import { registerService, getService, clearServices } from '../services/serviceRegistry';
import type { FetchPostsResult } from '../types/Post';

describe('serviceRegistry', () => {
    beforeEach(() => {
        clearServices();
    });

    it('returns registered service', () => {
        const mockFn = async (): Promise<FetchPostsResult> => ({
            newPosts: [], nextUrl: null,
        });
        registerService('internal', mockFn);
        expect(getService('internal')).toBe(mockFn);
    });

    it('throws when service is not registered', () => {
        expect(() => getService('internal')).toThrow('No post service registered');
    });

    it('allows registering multiple sources', () => {
        const internalFn = async (): Promise<FetchPostsResult> => ({ newPosts: [], nextUrl: null });
        const externalFn = async (): Promise<FetchPostsResult> => ({ newPosts: [], nextUrl: null });
        registerService('internal', internalFn);
        registerService('external', externalFn);
        expect(getService('internal')).toBe(internalFn);
        expect(getService('external')).toBe(externalFn);
    });

    it('overwrites existing registration', () => {
        const oldFn = async (): Promise<FetchPostsResult> => ({ newPosts: [], nextUrl: null });
        const newFn = async (): Promise<FetchPostsResult> => ({ newPosts: [], nextUrl: null });
        registerService('internal', oldFn);
        registerService('internal', newFn);
        expect(getService('internal')).toBe(newFn);
    });
});
