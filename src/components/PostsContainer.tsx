import { memo, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Post } from '../types/Post.ts';
import { getService } from '../services/serviceRegistry.ts';
import type { PostSource } from '../types/PostSource.ts';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { PostCard } from './PostCard';
import { ImageModal } from './ImageModal';
import { extractImageUrlsFromHtml } from '../shared/contentUtils';
import { createPortal } from 'react-dom';
import { ScrollToTopButton } from './ScrollToTopButton';
import { ListWithVirtualScroll } from './ListWithVirtualScroll';
import { useParams } from 'react-router-dom';

// Memoize PostCard so that only cards whose props actually change re-render.
// This is critical for virtual-scroll performance since the parent re-renders
// on every scroll-index change.
const MemoizedPostCard = memo(PostCard);

// ------------------------------------------------------------------------
// Reducer – centralises all post-list state transitions.
// Using a reducer (vs. many useState calls) keeps related state atomic:
// e.g., ADD_POSTS updates both the post array and the nextUrl cursor together.
// ------------------------------------------------------------------------

type State = {
    /** Accumulated posts across all loaded pages. */
    posts: Post[];
    /**
     * Cursor for the next page. `undefined` = not yet fetched, `null` = no
     * more pages available.
     */
    nextUrl: string | null | undefined;
    /** Non-null when a fetch failed; displayed by ErrorDisplay. */
    error: string | null;
    /** Index of the currently visible post, driven by ListWithVirtualScroll. */
    currentFocusIndex: number;
    /** True while a fetch is in-flight. */
    loading: boolean;
};

type Action =
    | { type: 'RESET_SOURCE'; payload: PostSource }
    | { type: 'ADD_POSTS'; payload: { newPosts: Post[]; nextUrl: string | null } }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_CURRENT_FOCUS_INDEX'; payload: number }
    | { type: 'SET_LOADING'; payload: boolean };

const initialState: State = {
    posts: [],
    nextUrl: undefined,
    error: null,
    currentFocusIndex: 0,
    loading: false,
};

function postsReducer(state: State, action: Action): State {
    switch (action.type) {
        case 'RESET_SOURCE':
            // Wipe everything when the user navigates to a different source
            // (internal ↔ external) so stale posts don't flash.
            return { ...state, posts: [], nextUrl: undefined, error: null, currentFocusIndex: 0, loading: false };
        case 'ADD_POSTS':
            // Append new posts and advance the pagination cursor.
            return { ...state, posts: [...state.posts, ...action.payload.newPosts], nextUrl: action.payload.nextUrl };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SET_CURRENT_FOCUS_INDEX':
            return { ...state, currentFocusIndex: action.payload };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        default:
            return state;
    }
}

// ------------------------------------------------------------------------
// Component
// ------------------------------------------------------------------------

/**
 * Main content area that manages the post list, loading, virtual scrolling,
 * error states, and image modal.
 *
 * The post source is determined from the URL parameter `:sourceType`:
 * - `/source/external` → uses the Blogger API service
 * - everything else → uses the internal HTML-scraping service
 *
 * New pages are fetched automatically when the user scrolls near the end of
 * the current list (triggered by `currentFocusIndex` approaching `posts.length`).
 */
export function PostsContainer() {
    const params = useParams();
    // Default to 'internal' for any path that isn't /source/external.
    const postSource: PostSource = params.sourceType === 'external' ? 'external' : 'internal';
    const [state, dispatch] = useReducer(postsReducer, initialState);
    /**
     * Non-null when the image gallery modal is open. Contains all image URLs
     * extracted from the post that was clicked. Using an array (vs. boolean)
     * lets the modal know which images to show.
     */
    const [modalImageUrl, setModalImageUrl] = useState<string[] | null>(null);
    /**
     * Guards against duplicate fetch requests. The auto-load effect can fire
     // multiple times before the previous fetch completes; this ref ensures
     // only one request is in-flight at a time.
     */
    const loadTriggeredRef = useRef(false);

    // Reset state when switching between internal/external sources.
    useEffect(() => {
        dispatch({ type: 'RESET_SOURCE', payload: postSource });
    }, [postSource]);

    /**
     * Fetches the next page of posts from whichever service is active.
     * Handles the full loading lifecycle: sets loading state, dispatches
     * results or errors, and clears loading when done.
     */
    const loadMorePosts = useCallback(async (nextUrl: string | undefined) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const loadFn = getService(postSource);
            const res = await loadFn(nextUrl);
            dispatch({ type: 'ADD_POSTS', payload: { newPosts: res.newPosts, nextUrl: res.nextUrl } });
        } catch (err) {
            dispatch({
                type: 'SET_ERROR',
                payload: err instanceof Error ? err.message : 'An error occurred',
            });
            console.error('Failed to load more posts:', err);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [postSource]);

    /**
     * Infinite-scroll trigger: when the focused index is within 5 items of the
     * end of the loaded posts, auto-fetch the next page. The 5-item threshold
     * provides a prefetch buffer so the user rarely sees the loading state.
     *
     * Guard conditions:
     * - No fetch in-flight (`!state.loading`)
     * - More pages available (`state.nextUrl !== null`)
     * - No error state (don't keep retrying automatically)
     * - Not already triggered (`!loadTriggeredRef.current`)
     */
    useEffect(() => {
        if (state.loading || state.nextUrl === null || state.error || loadTriggeredRef.current) return;
        const threshold = Math.max(0, state.posts.length - 5);
        if (state.currentFocusIndex < threshold) return;

        loadTriggeredRef.current = true;
        loadMorePosts(state.nextUrl).finally(() => {
            loadTriggeredRef.current = false;
        });
    }, [state.currentFocusIndex, state.posts.length, state.loading, loadMorePosts, state.nextUrl, state.error]);

    const onIndexChange = (newIndex: number) => {
        dispatch({ type: 'SET_CURRENT_FOCUS_INDEX', payload: newIndex });
    };

    /**
     * Keyboard Enter handler: when the user presses Enter on a focused post,
     * extract all image URLs from that post's content and open the gallery modal.
     */
    const onEnter = useCallback((index: number) => {
        const post = state.posts[index];
        if (!post) return;
        const urls = extractImageUrlsFromHtml(post.content);
        if (urls.length > 0) {
            setModalImageUrl(urls);
        }
    }, [state.posts]);

    // Build the element array for the virtual scroll list.
    // MemoizedPostCard avoids re-rendering cards whose post data hasn't changed.
    const elements = state.posts.map((post) => (
        <MemoizedPostCard key={post.id} post={post} onImageClick={setModalImageUrl} />
    ));

    return (
        <>
            <ListWithVirtualScroll
                elements={elements}
                visibleBuffer={5}
                // Disable keyboard scrolling when modal is open so arrow keys
                // don't move the background while the gallery is active.
                buttonScrollDisabled={modalImageUrl !== null}
                onIndexChange={onIndexChange}
                onEnter={onEnter}
            />

            {state.loading && (
                // When no posts exist yet, show a centered full-height spinner.
                // Otherwise, a smaller inline spinner below the list.
                <div className={`flex justify-center ${state.posts.length === 0 ? 'items-center min-h-[200px]' : 'py-4'}`}>
                    <LoadingSpinner />
                </div>
            )}

            {!state.nextUrl && state.posts.length > 0 && (
                <div className="text-center text-gray-500 py-8">No more posts to load</div>
            )}

            {state.error && !state.loading && (
                <div className="mt-4">
                    <ErrorDisplay error={state.error} />
                </div>
            )}

            <ScrollToTopButton />

            {/*
              Image modal is rendered via createPortal into document.body so it
              escapes the sticky header and layout constraints. It appears
              whenever modalImageUrl is non-null (set by PostCard image clicks
              or keyboard Enter).
            */}
            {modalImageUrl !== null && createPortal(
                <ImageModal imageUrls={modalImageUrl} isOpen={true} onClose={() => setModalImageUrl(null)} />,
                document.body,
            )}
        </>
    );
}
