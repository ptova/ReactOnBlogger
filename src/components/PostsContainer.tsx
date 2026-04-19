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
const VISIBLE_BUFFER = 5; // Number of items to keep rendered above and below viewport

const mainStyles = ['space-y-6', 'sm:space-y-8'].join(' ');

// Memoize PostCard to prevent unnecessary re-renders
const MemoizedPostCard = memo(PostCard);

// Placeholder component with same dimensions as PostCard
const PostCardPlaceholder = memo(() => {
    return (
        <div
            style={{height: '95vh',}}
        />
    );
});

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
    const [visibleRange, setVisibleRange] = useState({start: 0, end: WINDOW_SIZE});

    // Update current focus index based on scroll position
    useEffect(() => {
        if (posts.length === 0) return;
        return trackVisibleItemOnScroll(posts, scrollTimeoutRef, containerRefs, setCurrentFocusIndex, window);
    }, [posts]);

    // Calculate which items should be visible based on scroll position
    useEffect(() => {
        const updateVisibleRange = () => {
            if (containerRefs.current.length === 0 || posts.length === 0) return;

            const viewportHeight = window.innerHeight;
            let visibleStart = -1;
            let visibleEnd = -1;

            for (let i = 0; i < containerRefs.current.length; i++) {
                const element = containerRefs.current[i];
                if (!element) continue;

                const rect = element.getBoundingClientRect();
                if (rect.bottom >= 0 && rect.top <= viewportHeight) {
                    if (visibleStart === -1) visibleStart = i;
                    visibleEnd = i;
                }
            }

            let newStart: number;
            let newEnd: number;

            if (visibleStart !== -1) {
                newStart = Math.max(0, visibleStart - VISIBLE_BUFFER);
                newEnd = Math.min(posts.length - 1, visibleEnd + VISIBLE_BUFFER);
            } else {
                return;
            }

            // 👇 Ensure focus is always included
            if (currentFocusIndex !== -1) {
                newStart = Math.min(newStart, Math.max(0, currentFocusIndex - VISIBLE_BUFFER));
                newEnd = Math.max(newEnd, Math.min(posts.length - 1, currentFocusIndex + VISIBLE_BUFFER));
            }

            setVisibleRange(prev => {
                if (prev.start === newStart && prev.end === newEnd) {
                    return prev;
                }
                return {start: newStart, end: newEnd};
            });
        };

        updateVisibleRange();

        const debouncedUpdate = () => {
            requestAnimationFrame(updateVisibleRange);
        };

        window.addEventListener('scroll', debouncedUpdate);
        window.addEventListener('resize', debouncedUpdate);

        return () => {
            window.removeEventListener('scroll', debouncedUpdate);
            window.removeEventListener('resize', debouncedUpdate);
        };
    }, [currentFocusIndex, posts.length]);

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
                pageRef.current = pageRef.current + 1
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Failed to load more posts:', err);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [hasMore, loading]);

    const loadTriggeredRef = useRef(false);

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
            {posts.map((post, index) => {
                const isVisible = index >= visibleRange.start && index <= visibleRange.end;
                const shouldRenderCard = isVisible || Math.abs(index - currentFocusIndex) <= VISIBLE_BUFFER;

                return (<div
                    key={index}
                    ref={(el) => {
                        containerRefs.current[index] = el;
                    }} tabIndex={-1}
                    onFocus={() => setCurrentFocusIndex(index)}
                    style={{
                        outline: 'none',
                    }}
                >
                    {shouldRenderCard ? (
                        <MemoizedPostCard post={post} onImageClick={setModalImageUrl}/>
                    ) : (
                        <PostCardPlaceholder/>
                    )}
                </div>);
            })}
        </main>
        {loading && (
            <div className={`flex justify-center ${posts.length === 0 ? 'items-center min-h-[200px]' : 'py-4'}`}>
                <LoadingSpinner/>
            </div>)}
        {/* End of content message */}
        {!hasMore && posts.length > 0 && (<div className="text-center text-gray-500 py-8">
            No more post to load
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

