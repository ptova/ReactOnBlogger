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
import {MAIN_POST_SOURCE_URL} from "../shared/constants.ts";

type PostSource = 'internal' | 'external';

// Memoize PostCard to prevent unnecessary re-renders
const MemoizedPostCard = memo(PostCard);
// Define state type
type State = {
    posts: Post[];
    nextUrl: string | null;
    error: string | null;
    currentFocusIndex: number;
    page: number;
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
    posts: [], nextUrl: MAIN_POST_SOURCE_URL, error: null, currentFocusIndex: 0, page: 1, loading: false,
};

// Reducer function - remove SET_MODAL_IMAGE_URL case
function postsReducer(state: State, action: Action): State {
    switch (action.type) {
        case 'RESET_SOURCE':
            return {
                ...state,
                posts: [],
                nextUrl: action.payload === 'internal' ? MAIN_POST_SOURCE_URL : null,
                error: null,
                currentFocusIndex: 0,
                page: 1,
                loading: false,
            };
        case 'ADD_POSTS':
            return {
                ...state,
                posts: [...state.posts, ...action.payload.newPosts],
                nextUrl: action.payload.nextUrl,
                page: state.page + 1,
            };
        case 'SET_ERROR':
            return {
                ...state, error: action.payload,
            };
        case 'SET_CURRENT_FOCUS_INDEX':
            return {
                ...state, currentFocusIndex: action.payload,
            };
        case 'SET_LOADING':
            return {
                ...state, loading: action.payload,
            };
        default:
            return state;
    }
}

export default function PostsContainer() {
    const [state, dispatch] = useReducer(postsReducer, initialState);
    const [modalImageUrl, setModalImageUrl] = useState<string[] | null>(null);
    const [postSource, setPostSource] = useState<PostSource>('internal');
    const pageRef = useRef(1);

    // Get the appropriate load function based on selected source
    const getLoadPostsFunction = useCallback((): FetchPostsFn => {
        return postSource === 'internal' ? loadPosts : loadExternalPosts;
    }, [postSource]);

    // Reset state when source changes - now a single dispatch
    useEffect(() => {
        dispatch({type: 'RESET_SOURCE', payload: postSource});
        pageRef.current = 1;

        // Set initial URL for external posts
        if (postSource === 'external') {
            const initialUrl = `${window.location.origin}${window.location.pathname}`;
            dispatch({type: 'ADD_POSTS', payload: {newPosts: [], nextUrl: initialUrl}});
        }
    }, [postSource]);

    const loadMorePosts = useCallback(async () => {
        if (state.loading || !state.nextUrl) return;

        dispatch({type: 'SET_LOADING', payload: true});

        try {
            const loadPostsFunction = getLoadPostsFunction();
            const res = await loadPostsFunction(state.nextUrl);
            const newPosts = res.newPosts;

            if (newPosts.length > 0) {
                dispatch({
                    type: 'ADD_POSTS', payload: {newPosts, nextUrl: res.nextUrl}
                });
                pageRef.current = pageRef.current + 1;
            } else {
                dispatch({type: 'ADD_POSTS', payload: {newPosts: [], nextUrl: res.nextUrl}});
            }
        } catch (err) {
            dispatch({type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'An error occurred'});
            console.error('Failed to load more posts:', err);
            dispatch({type: 'ADD_POSTS', payload: {newPosts: [], nextUrl: null}});
        } finally {
            dispatch({type: 'SET_LOADING', payload: false});
        }
    }, [getLoadPostsFunction, state.loading, state.nextUrl]);

    const loadTriggeredRef = useRef(false);

    // Load more posts when focus index is near the end
    useEffect(() => {
        if (state.loading || !state.nextUrl) return;

        const threshold = Math.max(0, state.posts.length - 5);
        if (state.currentFocusIndex >= threshold) {
            if (!loadTriggeredRef.current) {
                loadTriggeredRef.current = true;
                loadMorePosts().finally(() => {
                    loadTriggeredRef.current = false;
                });
            }
        } else {
            loadTriggeredRef.current = false;
        }
    }, [state.currentFocusIndex, state.posts.length, state.loading, loadMorePosts, state.nextUrl]);

    // Initial load when source changes or component mounts
    useEffect(() => {
        if (state.posts.length === 0 && !state.loading && state.nextUrl) {
            loadMorePosts();
        }
    }, [postSource]); // eslint-disable-line react-hooks/exhaustive-deps

    const onIndexChange = (newIndex: number) => {
        dispatch({type: 'SET_CURRENT_FOCUS_INDEX', payload: newIndex});
    };

    const elements = state.posts.map((post) => (
        <MemoizedPostCard key={post.id} post={post} onImageClick={setModalImageUrl}/>));

    return (<>
        {/* Source selector radio buttons */}
        <div className="rounded-xl top-0 z-10 bg-gray-900/95 backdrop-blur-sm p-4 border-b border-gray-800">
            <div className="flex justify-center gap-4">
                <button
                    onClick={() => setPostSource('internal')}
                    className={`px-6 py-3 rounded-lg border-2 transition-all duration-300 ${postSource === 'internal' ? 'border-purple-500 bg-purple-500/10 text-purple-300 shadow-lg shadow-purple-500/20' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:bg-gray-800/70 hover:text-gray-300'}`}
                >
                    📄 Internal Posts
                </button>
                <button
                    onClick={() => setPostSource('external')}
                    className={`px-6 py-3 rounded-lg border-2 transition-all duration-300 ${postSource === 'external' ? 'border-purple-500 bg-purple-500/10 text-purple-300 shadow-lg shadow-purple-500/20' : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:bg-gray-800/70 hover:text-gray-300'}`}
                >
                    🌐 External Posts
                </button>
            </div>
        </div>

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