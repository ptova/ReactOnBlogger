import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { ListWithVirtualScroll } from './ListWithVirtualScroll';
import { preprocessBloggerImageUrl } from '../shared/imageUtils';

interface ImageModalProps {
    /** Image URLs to display as a swipeable gallery. */
    imageUrls: string[];
    /** Whether the modal is visible. */
    isOpen: boolean;
    /** Called when the modal requests to close. */
    onClose: () => void;
}

/**
 * Full-screen image gallery modal.
 *
 * - Pushes a `history` entry so the browser back button closes the modal.
 * - Uses container-mode virtual scrolling for smooth swiping through images.
 * - Preprocesses Blogger image URLs for full resolution.
 * - Animates entrance with a staggered scale-in effect.
 */
export function ImageModal({ imageUrls, isOpen, onClose }: ImageModalProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
    const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const hasPushedRef = useRef(false);

    /** Push a history entry when the modal opens so back-button works. */
    useEffect(() => {
        if (isOpen && !hasPushedRef.current) {
            history.pushState({ modal: true }, '');
            hasPushedRef.current = true;
        }
    }, [isOpen]);

    /** Pop the history entry on popstate (back button). */
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
        if (history.state?.modal) {
            history.back(); // triggers popstate -> onClose
        } else {
            onClose();
        }
    }, [onClose]);

    /** Body scroll lock and Escape key handler, plus animation sequencing. */
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                handleClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
            Promise.resolve().then(() => setIsAnimating(true));
        } else {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
            Promise.resolve().then(() => setIsAnimating(false));
            Promise.resolve().then(() => setCurrentFocusIndex(0));
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    const onIndexChange = (newIndex: number) => setCurrentFocusIndex(newIndex);

    const elements = imageUrls.map((imageUrl, index) => {
        const processedUrl = preprocessBloggerImageUrl(imageUrl);
        return (
            <div
                key={index}
                data-image-index={index}
                ref={(el) => { containerRefs.current[index] = el; }}
                style={{
                    minHeight: '95vh',
                    width: '100%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    scrollSnapAlign: 'start',
                    transition: 'border-color 0.2s ease',
                }}
            >
                <img
                    src={processedUrl}
                    alt={`Full size image ${index + 1}`}
                    style={{
                        maxWidth: '95vw',
                        maxHeight: '90vh',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        borderRadius: '0.5rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        opacity: index === currentFocusIndex ? 1 : 0.7,
                        transition: 'opacity 0.2s ease',
                        animationName: isAnimating ? 'scaleIn' : 'none',
                        animationDuration: '0.2s',
                        animationTimingFunction: 'ease-out',
                        animationDelay: isAnimating ? `${index * 0.05}s` : '0s',
                        animationFillMode: 'both',
                    }}
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
                animation: isAnimating ? 'fadeIn 0.2s ease-out' : 'none',
            }}
            onClick={handleOverlayClick}
        >
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
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
