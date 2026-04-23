import {memo, useCallback, useEffect, useReducer, useRef, useState} from 'react';
import type {FetchPostsFn, Post} from '../types/Post.ts';
import {loadPosts} from '../services/internalPostService.ts';
import {loadExternalPosts} from '../services/externalPostService.ts';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import PostCard from './PostCard';
import ImageModal from "./ImageModal.tsx";
import {createPortal} from "react-dom";
import {ScrollToTopButton} from "./ScrollToTopButton.tsx";
import ListWithVirtualScroll from "./ListWithVirtualScroll.tsx";
import {useParams} from "react-router-dom";

type PostSource = 'internal' | 'external';

// Memoize PostCard to prevent unnecessary re-renders
const MemoizedPostCard = memo(PostCard);
// Define state type
type State = {
    posts: Post[];
    nextUrl: string | null | undefined;
    error: string | null;
    currentFocusIndex: number;
    loading: boolean;
};

// Define action types - remove SET_MODAL_IMAGE_URL
type Action = | { type: 'RESET_SOURCE'; payload: PostSource } | {
    type: 'ADD_POSTS'; payload: { newPosts: Post[]; nextUrl: string | null }
} | { type: 'SET_ERROR'; payload: string | null } | { type: 'SET_CURRENT_FOCUS_INDEX'; payload: number } | {
    type: 'SET_LOADING'; payload: boolean
};

// Initial state
const initialState: State = {
    posts:             [],
    nextUrl:           undefined,
    error:             null,
    currentFocusIndex: 0,
    loading:           false,
};

// Reducer function - remove SET_MODAL_IMAGE_URL case
function postsReducer(state: State, action: Action): State {
    switch (action.type) {
        case 'RESET_SOURCE':
            return {
                ...state,
                posts:             [],
                nextUrl:           undefined,
                error:             null,
                currentFocusIndex: 0,
                loading:           false,
            };
        case 'ADD_POSTS':
            return {
                ...state,
                posts:   [...state.posts, ...action.payload.newPosts],
                nextUrl: action.payload.nextUrl,
            };
        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload,
            };
        case 'SET_CURRENT_FOCUS_INDEX':
            return {
                ...state,
                currentFocusIndex: action.payload,
            };
        case 'SET_LOADING':
            return {
                ...state,
                loading: action.payload,
            };
        default:
            return state;
    }
}

export default function PostsContainer() {
    const params = useParams();
    const postSource: PostSource = (() => {
        switch (params.sourceType) {
            case 'external':
                return 'external';
            default:
                return 'internal';
        }
    })();
    const [state, dispatch] = useReducer(postsReducer, initialState);
    const [modalImageUrl, setModalImageUrl] = useState<string[] | null>(null);
    const loadTriggeredRef = useRef(false);

    // Get the appropriate load function based on selected source
    const getLoadPostsFunction = useCallback((): FetchPostsFn => {
        return postSource === 'internal' ? loadPosts : loadExternalPosts;
    }, [postSource]);

    // Reset state when source changes - now a single dispatch
    useEffect(() => {
        dispatch({
            type:    'RESET_SOURCE',
            payload: postSource
        });
    }, [postSource]);

    const loadMorePosts = useCallback(async (nextUrl: string | undefined) => {
        dispatch({
            type:    'SET_LOADING',
            payload: true
        });
        try {
            const loadPostsFunction = getLoadPostsFunction();
            const res = await loadPostsFunction(nextUrl);
            const newPosts = res.newPosts;
            dispatch({
                type:    'ADD_POSTS',
                payload: {
                    newPosts,
                    nextUrl: res.nextUrl
                }
            });
        } catch (err) {
            dispatch({
                type:    'SET_ERROR',
                payload: err instanceof Error ? err.message : 'An error occurred'
            });
            console.error('Failed to load more posts:', err);
        } finally {
            dispatch({
                type:    'SET_LOADING',
                payload: false
            });
        }
    }, [getLoadPostsFunction]);


    // Load more posts when focus index is near the end
    useEffect(() => {
        if (state.loading || state.nextUrl === null || state.error || loadTriggeredRef.current) return;
        const threshold = Math.max(0, state.posts.length - 5);
        if (state.currentFocusIndex < threshold) {
            return;
        }
        loadTriggeredRef.current = true;
        loadMorePosts(state.nextUrl).finally(() => {
            loadTriggeredRef.current = false;
        });
    }, [state.currentFocusIndex, state.posts.length, state.loading, loadMorePosts, state.nextUrl, state.error]);

    const onIndexChange = (newIndex: number) => {
        dispatch({
            type:    'SET_CURRENT_FOCUS_INDEX',
            payload: newIndex
        });
    };

    const elements = state.posts.map((post) => (
        <MemoizedPostCard key={post.id} post={post} onImageClick={setModalImageUrl}/>));

    return (<>
        <ListWithVirtualScroll
            elements={elements}
            visibleBuffer={5}
            buttonScrollDisabled={modalImageUrl !== null}
            onIndexChange={onIndexChange}
        />

        {state.loading && (<div
            className={`flex justify-center ${state.posts.length === 0 ? 'items-center min-h-[200px]' : 'py-4'}`}>
            <LoadingSpinner/>
        </div>)}

        {/* End of content message */}
        {!state.nextUrl && state.posts.length > 0 && (<div className="text-center text-gray-500 py-8">
            No more posts to load
        </div>)}

        {/* Error display - conditionally positioned */}
        {state.error && !state.loading && (<div className="mt-4">
            <ErrorDisplay error={state.error}/>
        </div>)}

        <ScrollToTopButton/>

        {modalImageUrl !== null && createPortal(<ImageModal
            imageUrls={modalImageUrl}
            isOpen={true}
            onClose={() => setModalImageUrl(null)}
        />, document.body)}
    </>);
}