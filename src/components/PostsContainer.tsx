import {memo, useEffect, useRef, useState} from 'react';
import type {Post} from '../types/post';
import {loadPosts} from '../services/postService';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import PostCard from './PostCard';
import ImageModal from "./ImageModal.tsx";
import {createPortal} from "react-dom";
import {ScrollToTopButton} from "./ScrollToTopButton.tsx";
import {handleArrowsScroll, trackVisibleItemOnScroll} from "../shared/utils.ts";

const BASE_URL = import.meta.env.DEV ?
    "examplePostSource.html"
    // "https://test-interface-20260412.blogspot.com"
    : import.meta.env.VITE_API_URL;

const mainStyles = ['space-y-6', 'sm:space-y-8'].join(' ');

// Memoize PostCard to prevent unnecessary re-renders
const MemoizedPostCard = memo(PostCard);


export default function PostsContainer() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [currentFocusIndex, setCurrentFocusIndex] = useState<number>(-1);
    const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
    const scrollTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        loadPosts(BASE_URL)
            .then(data => {
                setPosts(data);
                setCurrentFocusIndex(-1);
            })
            .catch(err => {
                setError(err instanceof Error ? err.message : 'An error occurred');
            })
            .finally(() => setLoading(false));
    }, []);
    // Update current focus index based on scroll position
    useEffect(() => {
        if (posts.length === 0) return;
        return trackVisibleItemOnScroll(posts, scrollTimeoutRef, containerRefs, setCurrentFocusIndex, window);
    }, [posts]); // Only depend on posts, not currentFocusIndex
    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (posts.length === 0 || (modalImageUrl && modalImageUrl.length > 0)) return;
            handleArrowsScroll(event, currentFocusIndex, posts, setCurrentFocusIndex, containerRefs);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [posts, currentFocusIndex, modalImageUrl]);

    if (loading) {
        return <LoadingSpinner/>;
    }

    if (error) {
        return <ErrorDisplay error={error}/>;
    }

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
        <ScrollToTopButton/>
        {modalImageUrl !== null && createPortal(<ImageModal
            imageUrls={[modalImageUrl, modalImageUrl, modalImageUrl]}
            isOpen={true}
            onClose={() => setModalImageUrl(null)}
        />, document.body)}
    </>);
}

