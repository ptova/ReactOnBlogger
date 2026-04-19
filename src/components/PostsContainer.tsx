import {memo, useCallback, useEffect, useRef, useState} from 'react';
import type {Post} from '../types/post';
import {BASE_URL, loadPosts} from '../services/postService';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import PostCard from './PostCard';
import ImageModal from "./ImageModal.tsx";
import {createPortal} from "react-dom";
import {ScrollToTopButton} from "./ScrollToTopButton.tsx";
import ListWithVirtualScroll from "./ListWithVirtualScroll.tsx";


// Memoize PostCard to prevent unnecessary re-renders
const MemoizedPostCard = memo(PostCard);


export default function PostsContainer() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nextUrl, setNextUrl] = useState(BASE_URL);
    const [currentFocusIndex, setCurrentFocusIndex] = useState<number>(0);
    const [modalImageUrl, setModalImageUrl] = useState<string[] | null>(null);
    const pageRef = useRef(1);

    const loadMorePosts = useCallback(async () => {
        if (loading || !nextUrl) return;

        setLoading(true);

        try {
            const res = await loadPosts(nextUrl);
            const newPosts = res.newPosts
            setNextUrl(res.nextUrl)
            if (newPosts.length > 0) {

                setPosts(prev => [...prev, ...newPosts]);
                pageRef.current = pageRef.current + 1
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Failed to load more posts:', err);
            setNextUrl(null);
        } finally {
            setLoading(false);
        }
    }, [loading, nextUrl]);

    const loadTriggeredRef = useRef(false);

    // Load more posts when focus index is near the end
    useEffect(() => {
        if (loading || !nextUrl) return;

        const threshold = Math.floor(posts.length - (5));
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
    }, [currentFocusIndex, posts.length, loading, loadMorePosts, nextUrl]);
    const onIndexChange = (newIndex: number) => setCurrentFocusIndex(newIndex)

    const elements = posts.map((post) => <MemoizedPostCard post={post} onImageClick={setModalImageUrl}/>);
    return (<>
        <ListWithVirtualScroll
            elements={elements}
            visibleBuffer={5}
            buttonScrollDisabled={modalImageUrl !== null}
            onIndexChange={onIndexChange}
        />
        {loading && (
            <div className={`flex justify-center ${posts.length === 0 ? 'items-center min-h-[200px]' : 'py-4'}`}>
                <LoadingSpinner/>
            </div>)}
        {/* End of content message */}
        {!nextUrl && posts.length > 0 && (<div className="text-center text-gray-500 py-8">
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

