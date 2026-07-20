import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { ListWithVirtualScroll } from './ListWithVirtualScroll';
import { preprocessBloggerImageUrl } from '../shared/imageUtils';

interface ImageModalProps {
    /** All image URLs from the post that was clicked. */
    imageUrls: string[];
    /** Whether the modal is currently visible. */
    isOpen: boolean;
    /** Called to dismiss the modal (clears the parent's modalImageUrl state). */
    onClose: () => void;
}

/**
 * Loading spinner displayed while an image is being fetched.
 * Uses a CSS animation (defined at the bottom of ImageModal) for rotation.
 */
function ImagePlaceholder({ size }: { size: number }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                border: '4px solid rgba(255, 255, 255, 0.15)',
                borderTopColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'imgSpin 0.8s linear infinite',
                opacity: 0.6,
            }}
        />
    );
}

/**
 * Image wrapper that shows a loading placeholder until the <img> fires onLoad.
 * Tracks loaded state per-URL so multiple images in the gallery don't conflict.
 * Dimensions start at 0 and expand on load to prevent layout shift.
 */
function ImageWithPlaceholder({ src, alt }: { src: string; alt: string }) {
    const [loaded, setLoaded] = useState<Record<string, boolean>>({});
    const isLoaded = loaded[src];

    return (
        <>
            {!isLoaded && <ImagePlaceholder size={48} />}
            <img
                src={src}
                alt={alt}
                onLoad={() => setLoaded((prev) => ({ ...prev, [src]: true }))}
                style={{
                    maxWidth: '95vw',
                    maxHeight: '90vh',
                    width: isLoaded ? 'auto' : 0,
                    height: isLoaded ? 'auto' : 0,
                    objectFit: 'contain',
                    borderRadius: '0.5rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    visibility: 'visible',
                }}
            />
        </>
    );
}

/**
 * Full-screen image gallery modal.
 *
 * Architecture:
 * - Rendered via createPortal (in PostsContainer) into document.body, so it
 *   escapes the sticky header and layout constraints.
 * - Uses ListWithVirtualScroll in "container" mode to virtualise the image
 *   list, only rendering images near the current scroll position.
 * - Manages browser history so the Back button closes the modal instead of
 *   navigating away. On open, pushes a history entry; on close, calls
 *   history.back() or lets the popstate listener handle it.
 * - Locks body scrolling (overflow: hidden) while open.
 */
export function ImageModal({ imageUrls, isOpen, onClose }: ImageModalProps) {
    const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
    /**
     * Tracks whether we've pushed a history entry for this modal session.
     * Prevents pushing duplicate entries if the component re-renders while open.
     */
    const hasPushedRef = useRef(false);

    // Push a history entry when the modal opens, so the Back button can close it.
    useEffect(() => {
        if (isOpen && !hasPushedRef.current) {
            history.pushState({ modal: true }, '');
            hasPushedRef.current = true;
        }
    }, [isOpen]);

    // When the user presses Back (popstate), close the modal instead of navigating.
    useEffect(() => {
        const handlePopState = () => {
            if (hasPushedRef.current) {
                hasPushedRef.current = false;
                onClose();
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [onClose]);

    const handleClose = useCallback(() => {
        // If we pushed a history entry, go back to trigger the popstate listener
        // above, which calls onClose. Otherwise, close directly.
        if (history.state?.modal) {
            history.back();
        } else {
            onClose();
        }
    }, [onClose]);

    // Handle Escape key and body scroll lock.
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                handleClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleClose]);

    if (!isOpen) return null;

    // Close when clicking the dark overlay (but not when clicking an image).
    const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    const onIndexChange = (newIndex: number) => setCurrentFocusIndex(newIndex);

    // Build gallery elements: each image is a full-viewport-height slide.
    // URLs are preprocessed to strip Blogger thumbnail sizing for full-res.
    const elements = imageUrls.map((imageUrl, index) => {
        const processedUrl = preprocessBloggerImageUrl(imageUrl);
        return (
            <div
                key={index}
                data-image-index={index}
                style={{
                    minHeight: '95vh',
                    width: '100%',
                    position: 'relative',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    scrollSnapAlign: 'start',
                }}
            >
                <ImageWithPlaceholder
                    src={processedUrl}
                    alt={`Full size image ${index + 1}`}
                />
            </div>
        );
    });

    return (
        <div
            id="modal-scroll-container"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                zIndex: 50,
                backdropFilter: 'blur(4px)',
                overflowY: 'auto',
            }}
            onClick={handleOverlayClick}
        >
            {/*
              Sticky top bar with close button and page counter.
              Position: sticky so it stays visible while scrolling images.
              The height:0 + absolute positioning trick keeps the bar
              floating without affecting the virtual scroll layout.
            */}
            <div style={{ position: 'sticky', top: '1rem', height: 0, zIndex: 10 }}>
                <button
                    onClick={handleClose}
                    style={{
                        position: 'absolute',
                        right: '1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        borderRadius: '9999px',
                        padding: '0.5rem',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                    }}
                    aria-label="Close modal"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; }}
                >
                    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    backdropFilter: 'blur(4px)',
                    pointerEvents: 'none',
                }}>
                    {currentFocusIndex + 1} / {imageUrls.length}
                </div>
            </div>
            <ListWithVirtualScroll
                elements={elements}
                visibleBuffer={5}
                onIndexChange={onIndexChange}
                scrollMode="container"
            />
            {/* CSS animation for the loading spinner – defined here to keep
                it co-located with the component that uses it. */}
            <style>{`
                @keyframes imgSpin {
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
