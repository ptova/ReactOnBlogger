import {memo, useCallback, useEffect, useRef, useState} from 'react';
import type {Post} from '../types/post';
import {loadPosts} from '../services/postService';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import PostCard from './PostCard';
import ImageModal from "./ImageModal.tsx";
import {createPortal} from "react-dom";
import {ScrollToTopButton} from "./ScrollToTopButton.tsx";
import {handleArrowsScroll, trackVisibleItemOnScroll} from "../shared/utils.ts";

const BASE_URL = import.meta.env.DEV ? "examplePostSource.html"
    // "https://test-interface-20260412.blogspot.com"
    : import.meta.env.VITE_API_URL;
const WINDOW_SIZE = 20
const FOCUS_THRESHOLD = 0.2; // Load more when focus index is within last 80% of WINDOW_SIZE

const mainStyles = ['space-y-6', 'sm:space-y-8'].join(' ');

// Memoize PostCard to prevent unnecessary re-renders
const MemoizedPostCard = memo(PostCard);


export default function PostsContainer() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [currentFocusIndex, setCurrentFocusIndex] = useState<number>(-1);
    const [modalImageUrl, setModalImageUrl] = useState<string[] | null>(null);
    const scrollTimeoutRef = useRef<number | null>(null);
    const pageRef = useRef(1);

    // Update current focus index based on scroll position
    useEffect(() => {
        if (posts.length === 0) return;
        return trackVisibleItemOnScroll(posts, scrollTimeoutRef, containerRefs, setCurrentFocusIndex, window);
    }, [posts]); // Only depend on posts, not currentFocusIndex


    const loadMorePosts = useCallback(async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        const nextUrl = `${BASE_URL}?page=${pageRef.current}`;

        try {
            const newPosts = await loadPosts(nextUrl);
            if (newPosts.length === 0) {
                setHasMore(false);
            } else {
                setPosts(prev => [...prev, ...newPosts]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Failed to load more posts:', err);
            setHasMore(false);
        } finally {
            setLoading(false);
            pageRef.current = pageRef.current + 1
        }
    }, [hasMore, loading]);
    // Load more posts when focus index is near the end
    const loadTriggeredRef = useRef(false); // Add this ref

    // Load more posts when focus index is near the end
    useEffect(() => {
        if (loading || !hasMore) return;

        const threshold = Math.floor(posts.length - (WINDOW_SIZE * FOCUS_THRESHOLD));
        if (currentFocusIndex >= threshold) {
            if (!loadTriggeredRef.current) {
                loadTriggeredRef.current = true;
                loadMorePosts().finally(() => {
                    loadTriggeredRef.current = false;
                });
            }
        } else {
            loadTriggeredRef.current = false;
        }
    }, [currentFocusIndex, posts.length, loading, hasMore, loadMorePosts]);


    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (posts.length === 0 || (modalImageUrl && modalImageUrl.length > 0)) return;
            handleArrowsScroll(event, currentFocusIndex, posts, setCurrentFocusIndex, containerRefs);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [posts, currentFocusIndex, modalImageUrl]);

    return (<>
        <main className={mainStyles}>
            {posts.map((post, index) => (<div
                key={post.id}
                ref={(el) => {
                    containerRefs.current[index] = el;
                }} tabIndex={-1}
                onFocus={() => setCurrentFocusIndex(index)}
                style={{outline: 'none'}}
            >
                <MemoizedPostCard post={post} onImageClick={setModalImageUrl}/>
            </div>))}
        </main>
        {loading && (
            <div className={`flex justify-center ${posts.length === 0 ? 'items-center min-h-[200px]' : 'py-4'}`}>
                <LoadingSpinner/>
            </div>)}
        {/* End of content message */}
        {!hasMore && posts.length > 0 && (<div className="text-center text-gray-500 py-8">
            ✨ You've reached the end ✨
        </div>)}

        {/* Error display - conditionally positioned */}
        {error && !loading && (<div className="mt-4">
            <ErrorDisplay error={error}/>
        </div>)}
        <ScrollToTopButton/>
        {modalImageUrl !== null && createPortal(<ImageModal
            imageUrls={modalImageUrl}
            isOpen={true}
            onClose={() => setModalImageUrl(null)}
        />, document.body)}
    </>);
}

