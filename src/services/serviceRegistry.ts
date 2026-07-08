import type { FetchPostsFn } from '../types/Post.ts';
import type { PostSource } from '../types/PostSource.ts';

/**
 * Internal map of registered post-loading functions.
 * Populated at startup in `main.tsx` and used by `PostsContainer` at runtime.
 * This decouples the component layer from the service layer, making it easy to
 * swap implementations for testing.
 */
const services = new Map<PostSource, FetchPostsFn>();

/**
 * Registers a post-loading function for a given source type.
 * Must be called before `getService()` for that source.
 *
 * @param source - The source identifier.
 * @param fn - The function that loads posts from this source.
 */
export function registerService(source: PostSource, fn: FetchPostsFn): void {
    services.set(source, fn);
}

/**
 * Returns the registered post-loading function for the given source.
 *
 * @param source - The source identifier.
 * @throws If no service has been registered for this source.
 */
export function getService(source: PostSource): FetchPostsFn {
    const fn = services.get(source);
    if (!fn) {
        throw new Error(`No post service registered for source: "${source}". ` +
            `Call registerService('${source}', fn) before using it.`);
    }
    return fn;
}

/** Removes all registered services (useful in tests). */
export function clearServices(): void {
    services.clear();
}
