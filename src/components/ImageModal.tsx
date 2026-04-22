import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import ListWithVirtualScroll from "./ListWithVirtualScroll.tsx";

interface ImageModalProps {
    imageUrls: string[];  // Changed from single imageUrl to array
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Preprocesses a URL if it matches the blogger.googleusercontent.com/img pattern
 * and has an image extension. Removes the last two path segments.
 *
 * @param url - The URL to preprocess
 * @returns The preprocessed URL, or the original URL if it doesn't match the pattern
 */
function preprocessBloggerImageUrl(url: string): string {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/i;

    try {
        const urlObj = new URL(url);

        // Check if hostname contains blogger.googleusercontent.com and path includes /img/
        if (urlObj.hostname.includes('blogger.googleusercontent.com') && urlObj.pathname.includes('/img/')) {

            // Split pathname by '/', filter out empty segments
            const segments = urlObj.pathname.split('/').filter(segment => segment.length > 0);

            // Check if URL ends with an image extension
            const lastSegment = segments[segments.length - 1];
            if (imageExtensions.test(lastSegment)) {
                // Remove last two segments
                const newSegments = segments.slice(0, -2);
                urlObj.pathname = '/' + newSegments.join('/');
                return urlObj.toString();
            }
        }
    } catch (error) {
        // If URL parsing fails, return original URL
        console.warn('Failed to parse URL:', url, error);
    }

    return url;
}

export default function ImageModal({imageUrls, isOpen, onClose}: ImageModalProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [currentFocusIndex, setCurrentFocusIndex] = useState(0);
    const containerRefs = useRef<(HTMLDivElement | null)[]>([]);


    const hasPushedRef = useRef(false);

    useEffect(() => {
        if (isOpen && !hasPushedRef.current) {
            history.pushState({modal: true}, "");
            hasPushedRef.current = true;
        }
    }, [isOpen]);
    useEffect(() => {
        const handlePopState = () => {
            if (hasPushedRef.current) {
                hasPushedRef.current = false;
                onClose();
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [onClose]);
    const handleClose = useCallback(() => {
        if (history.state?.modal) {
            history.back(); // triggers popstate → onClose
        } else {
            onClose();
        }
    }, [onClose]);
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
            // Reset animation state when closing
            Promise.resolve().then(() => setIsAnimating(false));
            // Reset index when modal closes
            Promise.resolve().then(() => setCurrentFocusIndex(0));
        }
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, imageUrls.length, currentFocusIndex, imageUrls, handleClose]);

    if (!isOpen) return null;

    const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };
    const onIndexChange = (newIndex: number) => setCurrentFocusIndex(newIndex)

    const elements = imageUrls.map((imageUrl, index) => {
        const processedUrl = preprocessBloggerImageUrl(imageUrl);

        return (<div
            key={index}
            data-image-index={index}
            ref={(el) => {
                containerRefs.current[index] = el;
            }}
            style={{
                minHeight: '95vh',
                width: '100%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                scrollSnapAlign: 'start', // border: index === currentFocusIndex ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid transparent',
                transition: 'border-color 0.2s ease'
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
                    objectFit: 'contain' as const,
                    borderRadius: '0.5rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    opacity: index === currentFocusIndex ? 1 : 0.7,
                    transition: 'opacity 0.2s ease',
                    animationName: isAnimating ? 'scaleIn' : 'none',
                    animationDuration: '0.2s',
                    animationTimingFunction: 'ease-out',
                    animationDelay: isAnimating ? `${index * 0.05}s` : '0s',
                    animationFillMode: 'both'
                }}
            />
        </div>)
    });
    return (<div
        id="modal-scroll-container"
        style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 50,
            backdropFilter: 'blur(4px)',
            overflowY: 'auto',
            animation: isAnimating ? 'fadeIn 0.2s ease-out' : 'none'
        }}
        onClick={handleOverlayClick}
    >
        <div
            style={{
                position: "sticky", top: '1rem', height: 0, zIndex: 10,
            }}
        >
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
                    backdropFilter: 'blur(4px)'
                }}
                aria-label="Close modal"
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
            >
                <svg
                    style={{width: '1.5rem', height: '1.5rem'}}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
            </button>
            {/* Image counter indicator */}
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
                pointerEvents: 'none'
            }}>
                {currentFocusIndex + 1} / {imageUrls.length}
            </div>
        </div>
        <ListWithVirtualScroll
            elements={elements}
            visibleBuffer={5}
            onIndexChange={onIndexChange} scrollMode={"container"}
        />
        <style>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            @keyframes scaleIn {
              from {
                transform: scale(0.95);
                opacity: 0;
              }
              to {
                transform: scale(1);
                opacity: 1;
              }
            }
        `}</style>
    </div>);
}
