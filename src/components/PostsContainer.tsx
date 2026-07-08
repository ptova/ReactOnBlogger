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

const MemoizedPostCard = memo(PostCard);

// ------------------------------------------------------------------------
// State
// ------------------------------------------------------------------------

type State = {
    posts: Post[];
    nextUrl: string | null | undefined;
    error: string | null;
    currentFocusIndex: number;
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
            return { ...state, posts: [], nextUrl: undefined, error: null, currentFocusIndex: 0, loading: false };
        case 'ADD_POSTS':
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
    const postSource: PostSource = params.sourceType === 'external' ? 'external' : 'internal';
    const [state, dispatch] = useReducer(postsReducer, initialState);
    const [modalImageUrl, setModalImageUrl] = useState<string[] | null>(null);
    const loadTriggeredRef = useRef(false);

    // Reset state when switching between internal/external sources.
    useEffect(() => {
        dispatch({ type: 'RESET_SOURCE', payload: postSource });
    }, [postSource]);

    /** Load the next page from the active service. */
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

    /** Auto-trigger loading when the user scrolls within 5 items of the end. */
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

    const onEnter = useCallback((index: number) => {
        const post = state.posts[index];
        if (!post) return;
        const urls = extractImageUrlsFromHtml(post.content);
        if (urls.length > 0) {
            setModalImageUrl(urls);
        }
    }, [state.posts]);

    const elements = state.posts.map((post) => (
        <MemoizedPostCard key={post.id} post={post} onImageClick={setModalImageUrl} />
    ));

    return (
        <>
            <ListWithVirtualScroll
                elements={elements}
                visibleBuffer={5}
                buttonScrollDisabled={modalImageUrl !== null}
                onIndexChange={onIndexChange}
                onEnter={onEnter}
            />

            {state.loading && (
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

            {modalImageUrl !== null && createPortal(
                <ImageModal imageUrls={modalImageUrl} isOpen={true} onClose={() => setModalImageUrl(null)} />,
                document.body,
            )}
        </>
    );
}
