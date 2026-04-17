import {memo, useEffect, useRef, useState} from 'react';
import type {Post} from '../types/post';
import {loadPosts} from '../services/postService';
import LoadingSpinner from './LoadingSpinner';
import ErrorDisplay from './ErrorDisplay';
import PostCard from './PostCard';
import ImageModal from "./ImageModal.tsx";
import {createPortal} from "react-dom";

const BASE_URL = import.meta.env.DEV ? "examplePostSource.html" : import.meta.env.VITE_API_URL;

const mainStyles = ['space-y-6', 'sm:space-y-8'].join(' ');

// Memoize PostCard to prevent unnecessary re-renders
const MemoizedPostCard = memo(PostCard);

export default function PostsContainer() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const postRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [currentFocusIndex, setCurrentFocusIndex] = useState<number>(-1);
    const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

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

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (posts.length === 0 || (modalImageUrl && modalImageUrl.length > 0)) return;

            const isDownArrow = event.key === 'ArrowDown' || event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space';
            const isUpArrow = event.key === 'ArrowUp';

            if (!isDownArrow && !isUpArrow) return;

            event.preventDefault();

            let nextIndex = currentFocusIndex;

            if (isDownArrow) {
                nextIndex = currentFocusIndex === -1 ? 0 : Math.min(currentFocusIndex + 1, posts.length - 1);
            } else if (isUpArrow) {
                nextIndex = currentFocusIndex === -1 ? posts.length - 1 : Math.max(currentFocusIndex - 1, 0);
            }

            if (nextIndex !== currentFocusIndex) {
                setCurrentFocusIndex(nextIndex);
                const nextCard = postRefs.current[nextIndex];
                if (nextCard) {
                    nextCard.focus();
                    // Optional: smooth scroll to the focused card
                    nextCard.scrollIntoView({behavior: 'smooth', block: 'center'});
                }
            }
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
                    postRefs.current[index] = el;
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

interface ScrollToTopButtonProps {
    threshold?: number; // Optional custom scroll threshold
}

const buttonStyles = ['fixed bottom-4 right-4', 'bg-gray-200/20 hover:bg-gray-100/30 backdrop-blur-sm', 'text-gray-400 hover:text-gray-100', 'rounded-full p-3 shadow-lg', 'transition-all duration-300 z-50', 'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2'].join(' ');

function ScrollToTopButton({threshold = 300}: ScrollToTopButtonProps) {
    const [showButton, setShowButton] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowButton(window.scrollY > threshold);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [threshold]);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0, behavior: 'smooth'
        });
    };

    if (!showButton) return null;

    return (<button
        onClick={scrollToTop}
        className={buttonStyles}
        aria-label="Scroll to top"
    >
        <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
        </svg>
    </button>);
}